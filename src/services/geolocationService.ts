/**
 * @file src/services/geolocationService.ts
 * Handles GPS permission requests and coordinate resolution across Android APK WebView
 * (via AndroidBridge + WebChromeClient geolocation) and standard web browsers.
 */

import { Language } from '../i18n/translations';

declare global {
  interface Window {
    AndroidBridge?: {
      isAndroidApk?: () => boolean;
      hasLocationPermission?: () => boolean;
      requestLocationPermission?: () => void;
      getLastKnownLocationJson?: () => string;
      hasNotificationPermission?: () => boolean;
      requestNotificationPermission?: () => void;
      showNotification?: (title: string, body: string) => void;
      scheduleStatusBarNotification?: (
        notificationId: number,
        triggerAtMillis: number,
        title: string,
        body: string
      ) => void;
      openExternalUrl?: (url: string) => void;
      printPage?: (documentTitle: string) => void;
      saveIcsFile?: (fileName: string, icsContent: string) => void;
      savePngFile?: (fileName: string, base64DataUrl: string) => void;
      insertCalendarEvent?: (
        title: string,
        description: string,
        startMillis: number,
        endMillis: number,
        fallbackUrl: string
      ) => void;
    };
  }
}

export const GPS_DECISION_STORAGE_KEY = 'dimenueveis_gps_prompt_decided_v1';

export interface ResolvedUserLocation {
  latitude: number;
  longitude: number;
  cityName: string;
}

export function hasUserDecidedGpsPrompt(): boolean {
  try {
    return localStorage.getItem(GPS_DECISION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markGpsPromptDecided(): void {
  try {
    localStorage.setItem(GPS_DECISION_STORAGE_KEY, 'true');
  } catch {
    // ignore storage errors
  }
}

export function isUsingDefaultJerusalem(cityName?: string, latitude?: number, longitude?: number): boolean {
  if (!cityName || cityName.includes('Jerusalem') || cityName.includes('Jerusalém')) {
    if (
      latitude === undefined ||
      longitude === undefined ||
      (Math.abs(latitude - 31.7683) < 0.01 && Math.abs(longitude - 35.2137) < 0.01)
    ) {
      return true;
    }
  }
  return false;
}

function formatCoordinateLabel(lat: number, lon: number, language: Language): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const prefix = language === 'pt' ? 'GPS Local' : 'Local GPS';
  return `${prefix} (${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir})`;
}

async function reverseGeocodeCityName(lat: number, lon: number, language: Language): Promise<string> {
  const fallback = formatCoordinateLabel(lat, lon, language);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const acceptLang = language === 'pt' ? 'pt-BR,pt' : 'en-US,en';
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10`,
      {
        headers: {
          'Accept-Language': acceptLang,
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (response.ok) {
      const data = await response.json();
      const addr = data?.address;
      const city =
        addr?.city ||
        addr?.town ||
        addr?.municipality ||
        addr?.village ||
        addr?.county ||
        addr?.state;
      const countryCode = addr?.country_code ? String(addr.country_code).toUpperCase() : '';
      if (city) {
        return countryCode ? `${city}, ${countryCode}` : String(city);
      }
    }
  } catch {
    // Offline or blocked; fall back to formatted GPS coordinates
  }
  return fallback;
}

function getPositionPromise(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('GEOLOCATION_UNSUPPORTED'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Requests GPS permission and resolves current latitude, longitude, and city label.
 * Supports Android APK native permission dialog + LocationManager fallback as well as browser Geolocation.
 */
export async function requestLocalGpsCoordinates(language: Language): Promise<ResolvedUserLocation> {
  // 1. If running in Android APK and permission is not yet granted, trigger native permission dialog first
  if (typeof window !== 'undefined' && window.AndroidBridge) {
    try {
      const alreadyGranted = window.AndroidBridge.hasLocationPermission?.() ?? false;
      if (!alreadyGranted && window.AndroidBridge.requestLocationPermission) {
        const granted = await new Promise<boolean>((resolve) => {
          let settled = false;
          const handler = (evt: Event) => {
            if (settled) return;
            settled = true;
            window.removeEventListener('androidGpsPermissionResult', handler);
            const detail = (evt as CustomEvent)?.detail;
            resolve(Boolean(detail?.granted));
          };
          window.addEventListener('androidGpsPermissionResult', handler);
          window.AndroidBridge?.requestLocationPermission?.();
          setTimeout(() => {
            if (!settled) {
              settled = true;
              window.removeEventListener('androidGpsPermissionResult', handler);
              resolve(window.AndroidBridge?.hasLocationPermission?.() ?? false);
            }
          }, 15000);
        });

        if (!granted) {
          throw new Error('PERMISSION_DENIED');
        }
      }
    } catch (err: any) {
      if (err?.message === 'PERMISSION_DENIED') {
        throw err;
      }
    }
  }

  let latitude: number | null = null;
  let longitude: number | null = null;

  // 2. Try high-accuracy GPS via standard navigator.geolocation
  try {
    const pos = await getPositionPromise({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 300000,
    });
    latitude = Number(pos.coords.latitude.toFixed(4));
    longitude = Number(pos.coords.longitude.toFixed(4));
  } catch (highAccErr: any) {
    if (highAccErr?.code === 1) {
      // PERMISSION_DENIED
      throw new Error('PERMISSION_DENIED');
    }

    // 3. Fallback to coarse/network location
    try {
      const pos = await getPositionPromise({
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 600000,
      });
      latitude = Number(pos.coords.latitude.toFixed(4));
      longitude = Number(pos.coords.longitude.toFixed(4));
    } catch (coarseErr: any) {
      if (coarseErr?.code === 1) {
        throw new Error('PERMISSION_DENIED');
      }

      // 4. Fallback to Android LocationManager last known location if running in Android APK
      if (typeof window !== 'undefined' && window.AndroidBridge?.getLastKnownLocationJson) {
        try {
          const rawJson = window.AndroidBridge.getLastKnownLocationJson();
          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
              latitude = Number(parsed.latitude.toFixed(4));
              longitude = Number(parsed.longitude.toFixed(4));
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  if (latitude === null || longitude === null) {
    throw new Error('POSITION_UNAVAILABLE');
  }

  const cityName = await reverseGeocodeCityName(latitude, longitude, language);
  markGpsPromptDecided();

  return {
    latitude,
    longitude,
    cityName,
  };
}

const OFFLINE_CITY_GAZETTEER: {
  keywords: string[];
  city: string;
  country: string;
  lat: number;
  lon: number;
}[] = [
  { keywords: ['jerusalem', 'jerusalém', 'israel'], city: 'Jerusalem', country: 'Israel', lat: 31.7683, lon: 35.2137 },
  { keywords: ['tel aviv', 'jaffa'], city: 'Tel Aviv', country: 'Israel', lat: 32.0853, lon: 34.7818 },
  { keywords: ['sao paulo', 'são paulo', 'sp'], city: 'São Paulo', country: 'Brasil', lat: -23.5505, lon: -46.6333 },
  { keywords: ['rio de janeiro', 'rio', 'rj'], city: 'Rio de Janeiro', country: 'Brasil', lat: -22.9068, lon: -43.1729 },
  { keywords: ['brasilia', 'brasília', 'df'], city: 'Brasília', country: 'Brasil', lat: -15.7975, lon: -47.8919 },
  { keywords: ['belo horizonte', 'bh', 'mg'], city: 'Belo Horizonte', country: 'Brasil', lat: -19.9167, lon: -43.9345 },
  { keywords: ['curitiba', 'pr'], city: 'Curitiba', country: 'Brasil', lat: -25.4284, lon: -49.2733 },
  { keywords: ['porto alegre', 'rs'], city: 'Porto Alegre', country: 'Brasil', lat: -30.0346, lon: -51.2177 },
  { keywords: ['salvador', 'bahia', 'ba'], city: 'Salvador', country: 'Brasil', lat: -12.9714, lon: -38.5014 },
  { keywords: ['recife', 'pernambuco', 'pe'], city: 'Recife', country: 'Brasil', lat: -8.0476, lon: -34.877 },
  { keywords: ['fortaleza', 'ceara', 'ceará'], city: 'Fortaleza', country: 'Brasil', lat: -3.7172, lon: -38.5433 },
  { keywords: ['manaus', 'amazonas', 'am'], city: 'Manaus', country: 'Brasil', lat: -3.119, lon: -60.0217 },
  { keywords: ['belem', 'belém', 'para', 'pará'], city: 'Belém', country: 'Brasil', lat: -1.4558, lon: -48.4902 },
  { keywords: ['goiania', 'goiânia', 'goias'], city: 'Goiânia', country: 'Brasil', lat: -16.6869, lon: -49.2648 },
  { keywords: ['florianopolis', 'florianópolis', 'sc'], city: 'Florianópolis', country: 'Brasil', lat: -27.5954, lon: -48.548 },
  { keywords: ['campinas'], city: 'Campinas', country: 'Brasil', lat: -22.9099, lon: -47.0626 },
  { keywords: ['lisboa', 'lisbon', 'portugal'], city: 'Lisboa', country: 'Portugal', lat: 38.7223, lon: -9.1393 },
  { keywords: ['porto', 'oporto'], city: 'Porto', country: 'Portugal', lat: 41.1579, lon: -8.6291 },
  { keywords: ['coimbra'], city: 'Coimbra', country: 'Portugal', lat: 40.2033, lon: -8.4103 },
  { keywords: ['faro', 'algarve'], city: 'Faro', country: 'Portugal', lat: 37.0194, lon: -7.9304 },
  { keywords: ['luanda', 'angola'], city: 'Luanda', country: 'Angola', lat: -8.839, lon: 13.2894 },
  { keywords: ['maputo', 'mocambique', 'moçambique', 'mozambique'], city: 'Maputo', country: 'Moçambique', lat: -25.9692, lon: 32.5732 },
  { keywords: ['new york', 'nova iorque', 'nyc', 'usa', 'united states'], city: 'New York', country: 'USA', lat: 40.7128, lon: -74.006 },
  { keywords: ['los angeles', 'la', 'california'], city: 'Los Angeles', country: 'USA', lat: 34.0522, lon: -118.2437 },
  { keywords: ['chicago'], city: 'Chicago', country: 'USA', lat: 41.8781, lon: -87.6298 },
  { keywords: ['miami', 'florida'], city: 'Miami', country: 'USA', lat: 25.7617, lon: -80.1918 },
  { keywords: ['london', 'londres', 'uk', 'england'], city: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 },
  { keywords: ['paris', 'franca', 'frança', 'france'], city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { keywords: ['madrid', 'espanha', 'spain'], city: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038 },
  { keywords: ['barcelona'], city: 'Barcelona', country: 'Spain', lat: 41.3874, lon: 2.1686 },
  { keywords: ['rome', 'roma', 'italia', 'itália', 'italy'], city: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
  { keywords: ['berlin', 'berlim', 'germany', 'alemanha'], city: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.405 },
  { keywords: ['buenos aires', 'argentina'], city: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816 },
  { keywords: ['santiago', 'chile'], city: 'Santiago', country: 'Chile', lat: -33.4489, lon: -70.6693 },
  { keywords: ['bogota', 'bogotá', 'colombia'], city: 'Bogotá', country: 'Colombia', lat: 4.711, lon: -74.0721 },
  { keywords: ['lima', 'peru'], city: 'Lima', country: 'Peru', lat: -12.0464, lon: -77.0428 },
  { keywords: ['mexico', 'méxico', 'cdmx'], city: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332 },
  { keywords: ['toronto', 'canada', 'canadá'], city: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832 },
  { keywords: ['tokyo', 'tóquio', 'toquio', 'japan', 'japão'], city: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { keywords: ['sydney', 'australia', 'austrália'], city: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
];

/**
 * Resolves a manually entered Birth City & Country to geographic coordinates (latitude, longitude).
 * Uses OpenStreetMap Nominatim with an instant offline gazetteer fallback.
 */
export async function forwardGeocodeCityCountry(
  city: string,
  country: string,
  language: Language = 'pt'
): Promise<{
  city: string;
  country: string;
  latitude: number;
  longitude: number;
} | null> {
  const cleanCity = city.trim();
  const cleanCountry = country.trim();
  const query = [cleanCity, cleanCountry].filter(Boolean).join(', ');
  if (!query) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const acceptLang = language === 'pt' ? 'pt-BR,pt' : 'en-US,en';
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          'Accept-Language': acceptLang,
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (response.ok) {
      const results = await response.json();
      if (Array.isArray(results) && results.length > 0) {
        const top = results[0];
        const lat = parseFloat(top.lat);
        const lon = parseFloat(top.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          const addr = top.address || {};
          const resolvedCity =
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.village ||
            cleanCity ||
            top.name ||
            query;
          const resolvedCountry =
            addr.country || cleanCountry || (addr.country_code ? String(addr.country_code).toUpperCase() : '');
          return {
            city: String(resolvedCity),
            country: String(resolvedCountry),
            latitude: Number(lat.toFixed(4)),
            longitude: Number(lon.toFixed(4)),
          };
        }
      }
    }
  } catch {
    // Fall back to offline gazetteer below
  }

  const normalizedSearch = `${cleanCity} ${cleanCountry}`.toLowerCase();
  const match = OFFLINE_CITY_GAZETTEER.find((entry) =>
    entry.keywords.some((kw) => normalizedSearch.includes(kw))
  );
  if (match) {
    return {
      city: cleanCity || match.city,
      country: cleanCountry || match.country,
      latitude: match.lat,
      longitude: match.lon,
    };
  }

  return null;
}
