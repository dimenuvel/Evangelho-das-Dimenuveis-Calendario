/**
 * @file src/components/NatalAstralMapWidget.tsx
 * Interactive 13-Sign Natal Astral Map (Mapa Astral Natal de 13 Signos — Mazzaroth)
 * Renders an interactive SVG 13-Sector Ecliptic Wheel (including Month IX: The Dragon / Ophiuchus),
 * Horizon/Meridian Axes (ASC/DSC/MC/IC), Natal Sun, Moon, Classical Planets, Dragon Node,
 * Geometric Aspects, Manual Birth City & Country geocoding/coordinates, and a high-resolution
 * 'Download Astral Map' button powered by html-to-image canvas capture.
 */

import React, { useState, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import { CalendarConfiguration } from '../types/calendar';
import { Language } from '../i18n/translations';
import {
  SACRED_13_ZODIAC_SIGNS,
  MONTH_ROMAN_NUMERALS,
  getMonthDisplayTitle,
} from '../calendar/months';
import { getLocalizedPhaseName } from '../astronomy/moon';
import {
  calculateNatalAstralChart,
  AstralBodyPosition,
} from '../astronomy/natalAstralMap';
import { forwardGeocodeCityCountry } from '../services/geolocationService';
import { LunarPhaseIcon } from './LunarPhaseIcon';
import {
  Compass,
  Clock,
  Calendar,
  MapPin,
  Download,
  Search,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface NatalAstralMapWidgetProps {
  config: CalendarConfiguration;
  onUpdateConfig: (partial: Partial<CalendarConfiguration>) => void;
  language: Language;
  onSelectMonthInCalendar?: (monthNumber: number) => void;
}

export const NatalAstralMapWidget: React.FC<NatalAstralMapWidgetProps> = ({
  config,
  onUpdateConfig,
  language,
  onSelectMonthInCalendar,
}) => {
  const isPt = language === 'pt';
  const astralCaptureRef = useRef<HTMLDivElement | null>(null);
  const svgWheelRef = useRef<SVGSVGElement | null>(null);

  // Default preview date if user hasn't entered their birthday yet
  const [previewDateISO, setPreviewDateISO] = useState<string>('1990-06-21');
  const [wheelOrientation, setWheelOrientation] = useState<'ASCENDANT_LEFT' | 'ARIES_TOP'>(
    'ASCENDANT_LEFT'
  );
  const [selectedBodyId, setSelectedBodyId] = useState<AstralBodyPosition['id']>('SUN');
  const [selectedAspectIdx, setSelectedAspectIdx] = useState<number>(0);

  // Manual Birth City & Country state initialized from persisted config.userBirthLocation
  const [birthCityInput, setBirthCityInput] = useState<string>(
    config.userBirthLocation?.city || ''
  );
  const [birthCountryInput, setBirthCountryInput] = useState<string>(
    config.userBirthLocation?.country || ''
  );
  const [manualLatInput, setManualLatInput] = useState<string>(
    config.userBirthLocation?.latitude !== undefined
      ? String(config.userBirthLocation.latitude)
      : '31.7683'
  );
  const [manualLonInput, setManualLonInput] = useState<string>(
    config.userBirthLocation?.longitude !== undefined
      ? String(config.userBirthLocation.longitude)
      : '35.2137'
  );
  const [isGeocodingCity, setIsGeocodingCity] = useState<boolean>(false);
  const [geocodeStatusMsg, setGeocodeStatusMsg] = useState<string>('');
  const [isDownloadingImage, setIsDownloadingImage] = useState<boolean>(false);

  const activeBirthDateISO = config.userBirthdayGregorian || previewDateISO;
  const activeBirthTimeHHMM = config.userBirthTime || '12:00';
  const isUsingUserSavedBirthday = Boolean(config.userBirthdayGregorian);
  const useManualBirthPlace = Boolean(config.userBirthLocation?.useManualBirthLocation);

  // Determine effective coordinates for the Natal Astral Map:
  // If user enabled Manual Birth City & Country, use those coordinates; otherwise use current GPS / Default Jerusalem.
  const observerLat = useManualBirthPlace
    ? Number.isFinite(config.userBirthLocation?.latitude)
      ? config.userBirthLocation!.latitude
      : 31.7683
    : config.userLocation?.latitude ?? 31.7683;

  const observerLon = useManualBirthPlace
    ? Number.isFinite(config.userBirthLocation?.longitude)
      ? config.userBirthLocation!.longitude
      : 35.2137
    : config.userLocation?.longitude ?? 35.2137;

  const observerPlaceLabel = useManualBirthPlace
    ? [config.userBirthLocation?.city, config.userBirthLocation?.country]
        .filter(Boolean)
        .join(', ') || (isPt ? 'Cidade Natal Manual' : 'Manual Birth City')
    : config.userLocation?.cityName ||
      (isPt ? 'Jerusalém (Padrão)' : 'Jerusalem (Default)');

  const chart = useMemo(() => {
    return calculateNatalAstralChart(
      activeBirthDateISO,
      activeBirthTimeHHMM,
      config.lunarAnchorMode,
      observerLat,
      observerLon
    );
  }, [
    activeBirthDateISO,
    activeBirthTimeHHMM,
    config.lunarAnchorMode,
    observerLat,
    observerLon,
  ]);

  const handleDateChange = (newDateISO: string) => {
    if (newDateISO) {
      setPreviewDateISO(newDateISO);
    }
    onUpdateConfig({ userBirthdayGregorian: newDateISO || undefined });
  };

  const handleTimeChange = (newTimeHHMM: string) => {
    onUpdateConfig({ userBirthTime: newTimeHHMM || '12:00' });
  };

  const handleToggleBirthLocationMode = (manualMode: boolean) => {
    const parsedLat = parseFloat(manualLatInput);
    const parsedLon = parseFloat(manualLonInput);
    onUpdateConfig({
      userBirthLocation: {
        city: birthCityInput.trim() || config.userBirthLocation?.city || '',
        country: birthCountryInput.trim() || config.userBirthLocation?.country || '',
        latitude: Number.isFinite(parsedLat)
          ? parsedLat
          : config.userLocation?.latitude ?? 31.7683,
        longitude: Number.isFinite(parsedLon)
          ? parsedLon
          : config.userLocation?.longitude ?? 35.2137,
        useManualBirthLocation: manualMode,
      },
    });
  };

  const handleLookupBirthCity = async () => {
    if (!birthCityInput.trim() && !birthCountryInput.trim()) return;
    setIsGeocodingCity(true);
    setGeocodeStatusMsg('');
    try {
      const resolved = await forwardGeocodeCityCountry(
        birthCityInput,
        birthCountryInput,
        language
      );
      if (resolved) {
        setBirthCityInput(resolved.city);
        setBirthCountryInput(resolved.country);
        setManualLatInput(String(resolved.latitude));
        setManualLonInput(String(resolved.longitude));
        onUpdateConfig({
          userBirthLocation: {
            city: resolved.city,
            country: resolved.country,
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            useManualBirthLocation: true,
          },
        });
        setGeocodeStatusMsg(
          isPt
            ? `Coordenadas localizadas: ${resolved.city}${
                resolved.country ? `, ${resolved.country}` : ''
              } (${resolved.latitude.toFixed(2)}°, ${resolved.longitude.toFixed(2)}°)`
            : `Coordinates resolved: ${resolved.city}${
                resolved.country ? `, ${resolved.country}` : ''
              } (${resolved.latitude.toFixed(2)}°, ${resolved.longitude.toFixed(2)}°)`
        );
      } else {
        setGeocodeStatusMsg(
          isPt
            ? 'Cidade não encontrada automaticamente. Você pode ajustar a Latitude e Longitude manualmente abaixo.'
            : 'City not resolved automatically. You can enter Latitude & Longitude manually below.'
        );
      }
    } finally {
      setIsGeocodingCity(false);
    }
  };

  const handleManualCoordCommit = (latStr: string, lonStr: string) => {
    setManualLatInput(latStr);
    setManualLonInput(lonStr);
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const clampedLat = Math.max(-90, Math.min(90, lat));
      const clampedLon = Math.max(-180, Math.min(180, lon));
      onUpdateConfig({
        userBirthLocation: {
          city: birthCityInput.trim() || (isPt ? 'Cidade Natal' : 'Birth City'),
          country: birthCountryInput.trim(),
          latitude: clampedLat,
          longitude: clampedLon,
          useManualBirthLocation: true,
        },
      });
    }
  };

  const triggerImageDownload = (dataUrl: string, fileName: string) => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.savePngFile) {
      window.AndroidBridge.savePngFile(fileName, dataUrl);
      return;
    }
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAstralMap = async () => {
    if (!chart || isDownloadingImage) return;
    setIsDownloadingImage(true);
    const safeTime = chart.birthTimeHHMM.replace(':', '');
    const fileName = isPt
      ? `Mapa-Astral-13-Signos-${chart.birthDateISO}-${safeTime}.png`
      : `13-Sign-Astral-Map-${chart.birthDateISO}-${safeTime}.png`;

    try {
      // 1. Primary path: Capture full Astral Map section via html-to-image canvas library
      if (astralCaptureRef.current) {
        const dataUrl = await toPng(astralCaptureRef.current, {
          pixelRatio: 2.5,
          backgroundColor: '#070a0f',
          cacheBust: true,
          skipFonts: true,
          fontEmbedCSS: '',
        });
        triggerImageDownload(dataUrl, fileName);
        setIsDownloadingImage(false);
        return;
      }
    } catch {
      // 2. Fallback: Render high-resolution SVG wheel + header directly onto HTML5 Canvas
      try {
        if (svgWheelRef.current) {
          const serializer = new XMLSerializer();
          const svgStr = serializer.serializeToString(svgWheelRef.current);
          const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => reject(e);
            img.src = url;
          });
          const canvas = document.createElement('canvas');
          canvas.width = 1200;
          canvas.height = 1320;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#070a0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 28px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText(
              isPt
                ? 'Evangelho das Dimenúveis — Mapa Astral Natal de 13 Signos'
                : 'Gospel of Dimenuous — 13-Sign Natal Astral Map',
              600,
              52
            );
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '20px Georgia, serif';
            ctx.fillText(
              `${chart.birthDateISO} · ${chart.birthTimeHHMM} · ${observerPlaceLabel} (${observerLat.toFixed(
                2
              )}°, ${observerLon.toFixed(2)}°)`,
              600,
              88
            );
            ctx.drawImage(img, 60, 110, 1080, 1080);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 20px Georgia, serif';
            ctx.fillText(
              `☉ ${
                isPt ? chart.sunPosition.zodiacSign.namePt : chart.sunPosition.zodiacSign.nameEn
              }   ·   ☽ ${
                isPt ? chart.moonPosition.zodiacSign.namePt : chart.moonPosition.zodiacSign.nameEn
              }   ·   ASC ${
                isPt
                  ? chart.ascendantPosition.zodiacSign.namePt
                  : chart.ascendantPosition.zodiacSign.nameEn
              }`,
              600,
              1245
            );
            URL.revokeObjectURL(url);
            const fallbackDataUrl = canvas.toDataURL('image/png');
            triggerImageDownload(fallbackDataUrl, fileName);
          }
        }
      } catch {
        // ignore
      }
    } finally {
      setIsDownloadingImage(false);
    }
  };

  if (!chart) return null;

  // SVG Coordinate Helpers
  const cx = 260;
  const cy = 260;
  const rOuter = 236;
  const rZodiacInner = 186;
  const rTickInner = 172;
  const rPlanetTrackOuter = 152;
  const rPlanetTrackInner = 114;
  const rAspectHub = 96;

  const lonToSvgDeg = (lon: number): number => {
    if (wheelOrientation === 'ARIES_TOP') {
      return -90 + lon;
    }
    return 180 + (lon - chart.ascendantPosition.eclipticLongitude);
  };

  const polarToXY = (radius: number, angleDeg: number) => {
    const safeR = Number.isFinite(radius) ? radius : 0;
    const safeDeg = Number.isFinite(angleDeg) ? angleDeg : 0;
    const rad = (safeDeg * Math.PI) / 180;
    return {
      x: cx + safeR * Math.cos(rad),
      y: cy + safeR * Math.sin(rad),
    };
  };

  const buildSectorPath = (
    r1: number,
    r2: number,
    startLon: number,
    endLon: number
  ): string => {
    const a1 = lonToSvgDeg(startLon);
    const a2 = lonToSvgDeg(endLon);
    const p1 = polarToXY(r2, a1);
    const p2 = polarToXY(r2, a2);
    const p3 = polarToXY(r1, a2);
    const p4 = polarToXY(r1, a1);
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${r2} ${r2} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${r1} ${r1} 0 0 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  };

  // Compute radial stagger for planetary markers so nearby bodies never overlap visually
  const sortedBodies = [...chart.bodies].sort(
    (a, b) => a.eclipticLongitude - b.eclipticLongitude
  );
  const bodyRadiiMap = new Map<AstralBodyPosition['id'], number>();
  sortedBodies.forEach((b, idx) => {
    if (idx === 0) {
      bodyRadiiMap.set(b.id, rPlanetTrackOuter);
      return;
    }
    const prev = sortedBodies[idx - 1];
    const prevRadius = bodyRadiiMap.get(prev.id) || rPlanetTrackOuter;
    const diff = Math.abs(b.eclipticLongitude - prev.eclipticLongitude);
    if (diff < 12) {
      const nextR =
        prevRadius === rPlanetTrackOuter
          ? (rPlanetTrackOuter + rPlanetTrackInner) / 2
          : prevRadius === (rPlanetTrackOuter + rPlanetTrackInner) / 2
          ? rPlanetTrackInner
          : rPlanetTrackOuter;
      bodyRadiiMap.set(b.id, nextR);
    } else {
      bodyRadiiMap.set(b.id, rPlanetTrackOuter);
    }
  });

  const selectedBody =
    chart.bodies.find((b) => b.id === selectedBodyId) || chart.sunPosition;

  const ascAxisStart = polarToXY(
    rZodiacInner,
    lonToSvgDeg(chart.ascendantPosition.eclipticLongitude)
  );
  const dscAxisEnd = polarToXY(
    rZodiacInner,
    lonToSvgDeg(chart.ascendantPosition.eclipticLongitude + 180)
  );
  const mcAxisStart = polarToXY(
    rZodiacInner,
    lonToSvgDeg(chart.midheavenPosition.eclipticLongitude)
  );
  const icAxisEnd = polarToXY(
    rZodiacInner,
    lonToSvgDeg(chart.midheavenPosition.eclipticLongitude + 180)
  );

  return (
    <div className="border-t border-slate-800 bg-slate-950 divide-y divide-slate-800 font-serif">
      {/* ================================================================== */}
      {/* HEADER, BIRTH DATE/TIME, MANUAL BIRTH CITY & DOWNLOAD BUTTON       */}
      {/* ================================================================== */}
      <div className="p-4 sm:p-5 bg-slate-900/50 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-400 font-bold">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isPt
                ? 'Mapa Astral Natal de 13 Signos — Alinhamento Celeste no Nascimento'
                : '13-Sign Natal Astral Map — Birth Celestial Alignment'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <strong>{observerPlaceLabel}</strong>
              <span className="text-slate-400 tabular-nums">
                ({observerLat.toFixed(2)}°, {observerLon.toFixed(2)}°)
              </span>
            </span>

            {/* Download Astral Map High-Resolution Image Button */}
            <button
              type="button"
              onClick={handleDownloadAstralMap}
              disabled={isDownloadingImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0"
              title={
                isPt
                  ? 'Exportar o Mapa Astral Natal de 13 Signos como imagem PNG de alta resolução'
                  : 'Export the 13-Sign Natal Astral Map as a high-resolution PNG image'
              }
            >
              {isDownloadingImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Download className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {isDownloadingImage
                  ? isPt
                    ? 'Gerando Imagem...'
                    : 'Generating Image...'
                  : isPt
                  ? 'Baixar Mapa Astral'
                  : 'Download Astral Map'}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h4 className="text-base sm:text-lg font-bold text-slate-100">
              {isPt
                ? 'Cálculo de Alinhamento Astral por Data, Hora Exata e Cidade de Nascimento'
                : 'Astral Alignment Calculation by Exact Birth Date, Time & Birth City'}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isPt
                ? 'Insira sua data gregoriana, hora exata e cidade/país de nascimento para calcular a posição precisa do Sol Natal, Lua Natal, Signo Ascendente (Horizonte Oriental), Meio do Céu, Cabeça do Dragão e Planetas Clássicos nos 13 Signos do Mazzaroth (incluindo o 13º Signo do Dragão no Mês IX).'
                : 'Enter your Gregorian birth date, exact birth time, and birth city/country to calculate the precise position of your Natal Sun, Natal Moon, Rising Ascendant (Eastern Horizon), Midheaven, Dragon Head, and Classical Planets across the 13 Mazzaroth Signs (including the 13th Sign of the Dragon in Month IX).'}
            </p>
          </div>

          {/* Birth Date & Birth Time Input Strip */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-950 p-3 border border-amber-500/40 shrink-0">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <label
                htmlFor="natal-birth-date"
                className="text-xs font-semibold text-slate-200 whitespace-nowrap"
              >
                {isPt ? 'Data:' : 'Date:'}
              </label>
              <input
                id="natal-birth-date"
                type="date"
                value={activeBirthDateISO}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs tabular-nums focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <label
                htmlFor="natal-birth-time"
                className="text-xs font-semibold text-slate-200 whitespace-nowrap"
              >
                {isPt ? 'Hora Exata:' : 'Exact Time:'}
              </label>
              <input
                id="natal-birth-time"
                type="time"
                value={activeBirthTimeHHMM}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs tabular-nums focus:outline-none focus:border-amber-400"
              />
            </div>

            {!isUsingUserSavedBirthday && (
              <button
                type="button"
                onClick={() => onUpdateConfig({ userBirthdayGregorian: previewDateISO })}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                {isPt ? 'Salvar como Meu Aniversário' : 'Save as My Birthday'}
              </button>
            )}
          </div>
        </div>

        {/* Manual Birth City & Country Selector Bar */}
        <div className="border border-slate-800 bg-slate-950 p-3.5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold uppercase tracking-wider text-amber-400">
                {isPt
                  ? 'Local de Nascimento para o Horizonte Astral (Ascendente & Nascer do Sol)'
                  : 'Birth Place for Astral Horizon (Ascendant & Sunrise)'}
              </span>
            </div>

            <div className="inline-flex items-center border border-slate-700 bg-slate-900 divide-x divide-slate-700">
              <button
                type="button"
                onClick={() => handleToggleBirthLocationMode(false)}
                className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                  !useManualBirthPlace
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {isPt ? 'Usar GPS Atual / Padrão' : 'Use Current GPS / Default'}
              </button>
              <button
                type="button"
                onClick={() => handleToggleBirthLocationMode(true)}
                className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                  useManualBirthPlace
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {isPt ? 'Cidade & País de Nascimento (Manual)' : 'Birth City & Country (Manual)'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
            <div className="lg:col-span-3 space-y-1">
              <label
                htmlFor="birth-city-input"
                className="block text-[11px] text-slate-400 font-semibold"
              >
                {isPt ? 'Cidade de Nascimento:' : 'Birth City:'}
              </label>
              <input
                id="birth-city-input"
                type="text"
                placeholder={isPt ? 'Ex: São Paulo, Lisboa, Jerusalem' : 'e.g. New York, London, São Paulo'}
                value={birthCityInput}
                onChange={(e) => setBirthCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookupBirthCity();
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="lg:col-span-3 space-y-1">
              <label
                htmlFor="birth-country-input"
                className="block text-[11px] text-slate-400 font-semibold"
              >
                {isPt ? 'País / Estado:' : 'Country / State:'}
              </label>
              <input
                id="birth-country-input"
                type="text"
                placeholder={isPt ? 'Ex: Brasil, Portugal, Israel' : 'e.g. Brazil, Portugal, USA'}
                value={birthCountryInput}
                onChange={(e) => setBirthCountryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookupBirthCity();
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label
                htmlFor="birth-lat-input"
                className="block text-[11px] text-slate-400 font-semibold"
              >
                {isPt ? 'Latitude (°):' : 'Latitude (°):'}
              </label>
              <input
                id="birth-lat-input"
                type="number"
                step="0.0001"
                value={manualLatInput}
                onChange={(e) => handleManualCoordCommit(e.target.value, manualLonInput)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 text-xs tabular-nums focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label
                htmlFor="birth-lon-input"
                className="block text-[11px] text-slate-400 font-semibold"
              >
                {isPt ? 'Longitude (°):' : 'Longitude (°):'}
              </label>
              <input
                id="birth-lon-input"
                type="number"
                step="0.0001"
                value={manualLonInput}
                onChange={(e) => handleManualCoordCommit(manualLatInput, e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 text-xs tabular-nums focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="lg:col-span-2">
              <button
                type="button"
                onClick={handleLookupBirthCity}
                disabled={isGeocodingCity}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold transition-colors cursor-pointer"
              >
                {isGeocodingCity ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Search className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {isGeocodingCity
                    ? isPt
                      ? 'Buscando...'
                      : 'Searching...'
                    : isPt
                    ? 'Buscar Cidade'
                    : 'Lookup City'}
                </span>
              </button>
            </div>
          </div>

          {geocodeStatusMsg && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{geocodeStatusMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* CAPTURABLE ASTRAL MAP CONTAINER (WHEEL + NATAL TRIAD & EPHEMERIS)  */}
      {/* ================================================================== */}
      <div
        ref={astralCaptureRef}
        className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-800 bg-slate-950"
      >
        {/* LEFT COLUMN (7 cols): Interactive 13-Sign SVG Natal Astral Wheel */}
        <div className="xl:col-span-7 p-4 sm:p-6 flex flex-col items-center justify-between space-y-4 bg-slate-950">
          {/* Orientation & Birth Metadata Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold tabular-nums">
                {chart.birthDateISO} · {chart.birthTimeHHMM}
              </span>
              <span className="text-emerald-400 font-bold">
                {observerPlaceLabel} ({observerLat.toFixed(2)}°, {observerLon.toFixed(2)}°)
              </span>
              <span className="text-slate-300 italic font-medium">
                ·{' '}
                {chart.isBornOnDayZero
                  ? isPt
                    ? 'Dia Zero (Limiar Anual)'
                    : 'Day Zero (Annual Threshold)'
                  : `${getMonthDisplayTitle(
                      chart.sacredMonth,
                      config.customMonthNames,
                      language
                    )}, ${isPt ? 'Dia' : 'Day'} ${chart.sacredDayOfMonth} (${
                      isPt ? 'Ano Sagrado' : 'Sacred Year'
                    } ${chart.sacredYearOfBirth})`}
              </span>
            </div>

            <div className="inline-flex items-center border border-slate-700 bg-slate-900 divide-x divide-slate-700">
              <button
                type="button"
                onClick={() => setWheelOrientation('ASCENDANT_LEFT')}
                className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                  wheelOrientation === 'ASCENDANT_LEFT'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isPt ? 'Eixo Ascendente (ASC)' : 'Ascendant Axis (ASC)'}
              </button>
              <button
                type="button"
                onClick={() => setWheelOrientation('ARIES_TOP')}
                className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                  wheelOrientation === 'ARIES_TOP'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isPt ? 'Mês I (Áries) no Topo' : 'Month I (Aries) Top'}
              </button>
            </div>
          </div>

          {/* SVG 13-Sector Natal Chart */}
          <div className="w-full max-w-[520px] aspect-square relative">
            <svg
              ref={svgWheelRef}
              viewBox="0 0 520 520"
              className="w-full h-full select-none"
              role="img"
              aria-label={
                isPt
                  ? 'Roda do Mapa Astral Natal de 13 Signos'
                  : '13-Sign Natal Astral Map Wheel'
              }
            >
              <defs>
                <radialGradient id="natalHubGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#090d16" stopOpacity="1" />
                </radialGradient>
              </defs>

              {/* Outer Background Circle */}
              <circle
                cx={cx}
                cy={cy}
                r={rOuter + 6}
                fill="#090d16"
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* 13 Ecliptic Zodiac Sectors */}
              {SACRED_13_ZODIAC_SIGNS.map((sign, idx) => {
                const startLon = idx * (360 / 13);
                const endLon = (idx + 1) * (360 / 13);
                const midLon = (startLon + endLon) / 2;
                const pathD = buildSectorPath(rZodiacInner, rOuter, startLon, endLon);

                const isSunSign = chart.sunPosition.signIndex === sign.monthNumber;
                const isMoonSign = chart.moonPosition.signIndex === sign.monthNumber;
                const isAscSign = chart.ascendantPosition.signIndex === sign.monthNumber;
                const isSelectedSign = selectedBody.signIndex === sign.monthNumber;
                const isDragon = Boolean(sign.isThirteenthDragonSign);

                let sectorFill = '#0f172a';
                if (isSelectedSign) sectorFill = 'rgba(245, 158, 11, 0.35)';
                else if (isSunSign) sectorFill = 'rgba(245, 158, 11, 0.24)';
                else if (isAscSign) sectorFill = 'rgba(16, 185, 129, 0.24)';
                else if (isMoonSign) sectorFill = 'rgba(59, 130, 246, 0.24)';
                else if (isDragon) sectorFill = 'rgba(6, 95, 70, 0.32)';

                const labelPos = polarToXY(
                  (rOuter + rZodiacInner) / 2 + 6,
                  lonToSvgDeg(midLon)
                );
                const romanPos = polarToXY(
                  (rOuter + rZodiacInner) / 2 - 11,
                  lonToSvgDeg(midLon)
                );

                return (
                  <g
                    key={sign.monthNumber}
                    onClick={() => {
                      const bodyInSign = chart.bodies.find(
                        (b) => b.signIndex === sign.monthNumber
                      );
                      if (bodyInSign) {
                        setSelectedBodyId(bodyInSign.id);
                      } else if (onSelectMonthInCalendar) {
                        onSelectMonthInCalendar(sign.monthNumber);
                      }
                    }}
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <path
                      d={pathD}
                      fill={sectorFill}
                      stroke={
                        isSelectedSign || isSunSign
                          ? '#f59e0b'
                          : isDragon
                          ? '#10b981'
                          : '#334155'
                      }
                      strokeWidth={isSelectedSign || isSunSign || isDragon ? '1.8' : '1'}
                    />

                    {/* Zodiac Symbol */}
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={
                        isSelectedSign || isSunSign
                          ? '#fde68a'
                          : isDragon
                          ? '#6ee7b7'
                          : '#f8fafc'
                      }
                      fontSize="16"
                      fontWeight="bold"
                    >
                      {sign.symbol}
                    </text>

                    {/* Sacred Month Roman Numeral & Short Name */}
                    <text
                      x={romanPos.x}
                      y={romanPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isDragon ? '#34d399' : '#fbbf24'}
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {MONTH_ROMAN_NUMERALS[idx]} ·{' '}
                      {(isPt ? sign.namePt : sign.nameEn).slice(0, 6)}
                    </text>
                  </g>
                );
              })}

              {/* 364-Day Sacred Calendar Degree Ring (52 Sabbath ticks emphasized) */}
              <circle
                cx={cx}
                cy={cy}
                r={rTickInner}
                fill="#0b111e"
                stroke="#334155"
                strokeWidth="1"
              />
              {Array.from({ length: 52 }).map((_, weekIdx) => {
                const lon = (weekIdx / 52) * 360;
                const deg = lonToSvgDeg(lon);
                const isMonthBoundary = weekIdx % 4 === 0;
                const pOut = polarToXY(rZodiacInner, deg);
                const pIn = polarToXY(
                  isMonthBoundary ? rTickInner : rZodiacInner - 7,
                  deg
                );
                return (
                  <line
                    key={weekIdx}
                    x1={pOut.x}
                    y1={pOut.y}
                    x2={pIn.x}
                    y2={pIn.y}
                    stroke={isMonthBoundary ? '#f59e0b' : '#475569'}
                    strokeWidth={isMonthBoundary ? '1.4' : '0.8'}
                  />
                );
              })}

              {/* Horizon Axis (ASC — DSC) & Meridian Axis (MC — IC) */}
              <line
                x1={ascAxisStart.x}
                y1={ascAxisStart.y}
                x2={dscAxisEnd.x}
                y2={dscAxisEnd.y}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <line
                x1={mcAxisStart.x}
                y1={mcAxisStart.y}
                x2={icAxisEnd.x}
                y2={icAxisEnd.y}
                stroke="#c084fc"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />

              {/* Inner Aspect Hub */}
              <circle
                cx={cx}
                cy={cy}
                r={rAspectHub}
                fill="url(#natalHubGrad)"
                stroke="#334155"
                strokeWidth="1.2"
              />

              {/* Geometric Aspect Lines Inside Hub */}
              {chart.aspects.map((asp, idx) => {
                const posA = polarToXY(
                  rAspectHub - 4,
                  lonToSvgDeg(asp.bodyA.eclipticLongitude)
                );
                const posB = polarToXY(
                  rAspectHub - 4,
                  lonToSvgDeg(asp.bodyB.eclipticLongitude)
                );
                const isSelectedAspect =
                  (selectedAspectIdx < chart.aspects.length ? selectedAspectIdx : 0) === idx;
                return (
                  <line
                    key={idx}
                    x1={posA.x}
                    y1={posA.y}
                    x2={posB.x}
                    y2={posB.y}
                    stroke={asp.colorHex}
                    strokeWidth={isSelectedAspect ? '2.4' : '1.2'}
                    strokeOpacity={isSelectedAspect ? '1' : '0.55'}
                  />
                );
              })}

              {/* Plotted Natal Bodies (Sun, Moon, Ascendant, Midheaven, Dragon Node, Planets) */}
              {chart.bodies.map((body) => {
                const svgDeg = lonToSvgDeg(body.eclipticLongitude);
                const markerR = bodyRadiiMap.get(body.id) || rPlanetTrackOuter;
                const pos = polarToXY(markerR, svgDeg);
                const tickPos = polarToXY(rTickInner, svgDeg);
                const hubAnchorPos = polarToXY(rAspectHub, svgDeg);
                const isSelected = selectedBody.id === body.id;
                const isPrimary =
                  body.id === 'SUN' || body.id === 'MOON' || body.id === 'ASCENDANT';

                return (
                  <g
                    key={body.id}
                    onClick={() => setSelectedBodyId(body.id)}
                    className="cursor-pointer"
                  >
                    {/* Guide ray from degree tick through planet to aspect hub */}
                    <line
                      x1={tickPos.x}
                      y1={tickPos.y}
                      x2={hubAnchorPos.x}
                      y2={hubAnchorPos.y}
                      stroke={body.colorHex}
                      strokeWidth={isSelected ? '2' : '0.9'}
                      strokeOpacity={isSelected ? '1' : '0.45'}
                    />

                    {/* Exact Degree Dot on Tick Ring */}
                    <circle
                      cx={tickPos.x}
                      cy={tickPos.y}
                      r={isSelected ? 3.5 : 2.5}
                      fill={body.colorHex}
                    />

                    {/* Outer Halo when Selected */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isPrimary ? 17 : 15}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                    )}

                    {/* Planet / Luminary Medallion */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isPrimary ? 13 : 11}
                      fill="#090d16"
                      stroke={body.colorHex}
                      strokeWidth={isSelected ? '2.8' : '1.5'}
                    />
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={body.colorHex}
                      fontSize={body.symbol.length > 1 ? '8.5' : '12'}
                      fontWeight="bold"
                    >
                      {body.symbol}
                    </text>
                  </g>
                );
              })}

              {/* Center Earth / Observer Core */}
              <circle
                cx={cx}
                cy={cy}
                r={24}
                fill="#090d16"
                stroke="#f59e0b"
                strokeWidth="1.2"
              />
              <text
                x={cx}
                y={cy - 5}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize="8.5"
                fontWeight="bold"
              >
                {isPt ? '13 SIGNOS' : '13 SIGNS'}
              </text>
              <text
                x={cx}
                y={cy + 7}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="7.5"
              >
                {chart.birthTimeHHMM}
              </text>
            </svg>
          </div>

          {/* Selected Astral Body Summary Strip Under Wheel */}
          <div className="w-full border border-amber-500/50 bg-slate-900/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold">
                  {selectedBody.symbol} {isPt ? selectedBody.namePt : selectedBody.nameEn}
                </span>
                <span className="text-amber-400 font-bold">
                  {selectedBody.zodiacSign.symbol}{' '}
                  {isPt ? selectedBody.zodiacSign.namePt : selectedBody.zodiacSign.nameEn} (
                  {isPt ? 'Mês' : 'Month'} {MONTH_ROMAN_NUMERALS[selectedBody.signIndex - 1]})
                </span>
                {selectedBody.zodiacSign.isThirteenthDragonSign && (
                  <span className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase">
                    {isPt ? '13º Signo: O Dragão' : '13th Sign: The Dragon'}
                  </span>
                )}
              </div>
              <p className="text-slate-200 italic">
                {isPt ? selectedBody.rolePt : selectedBody.roleEn} —{' '}
                {isPt
                  ? selectedBody.zodiacSign.meaningPt
                  : selectedBody.zodiacSign.meaningEn}
              </p>
            </div>

            <div className="text-right tabular-nums shrink-0 space-y-0.5">
              <div className="text-slate-100 font-bold">
                {selectedBody.eclipticLongitude.toFixed(1)}° {isPt ? 'Eclíptica' : 'Ecliptic'}
              </div>
              <div className="text-slate-300 font-medium">
                {selectedBody.degreeInSign.toFixed(1)}° · {isPt ? 'Dia' : 'Day'}{' '}
                {selectedBody.equivalentSacredDayInMonth}/28
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Primary Natal Triad & Complete Planetary Table */}
        <div className="xl:col-span-5 divide-y divide-slate-800 flex flex-col justify-between bg-slate-950">
          {/* 1. Primary Triad: Natal Sun, Natal Moon, Rising Ascendant */}
          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {isPt
                  ? 'I. Tríade Natal Principal (Sol · Lua · Ascendente)'
                  : 'I. Primary Natal Triad (Sun · Moon · Ascendant)'}
              </span>
              <span className="text-[11px] italic text-slate-300 font-medium">
                {chart.isDaytimeBirth
                  ? isPt
                    ? '☀ Nascimento Diurno'
                    : '☀ Daytime Birth'
                  : isPt
                  ? '🌙 Nascimento Noturno'
                  : '🌙 Nighttime Birth'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Natal Sun Card */}
              <div
                onClick={() => setSelectedBodyId('SUN')}
                className={`p-3 border transition-colors cursor-pointer space-y-1 ${
                  selectedBody.id === 'SUN'
                    ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/25'
                    : 'border-amber-500/40 bg-amber-950/15 hover:bg-amber-950/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-400 uppercase tracking-wider">
                    ☉ {isPt ? 'Signo Solar Natal (Mês Sagrado)' : 'Natal Sun Sign (Sacred Month)'}
                  </span>
                  <span className="tabular-nums text-amber-300 font-semibold">
                    {chart.sunPosition.eclipticLongitude.toFixed(1)}° (
                    {isPt ? 'Dia' : 'Day'} {chart.sunPosition.equivalentSacredDayInMonth}/28)
                  </span>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-amber-400 text-lg">
                    {chart.sunPosition.zodiacSign.symbol}
                  </span>
                  <span>
                    {isPt
                      ? chart.sunPosition.zodiacSign.namePt
                      : chart.sunPosition.zodiacSign.nameEn}{' '}
                    — {isPt ? 'Mês' : 'Month'}{' '}
                    {MONTH_ROMAN_NUMERALS[chart.sunPosition.signIndex - 1]}
                  </span>
                </div>
                <div className="text-slate-300 italic">
                  {isPt
                    ? chart.sunPosition.zodiacSign.archetypePt
                    : chart.sunPosition.zodiacSign.archetypeEn}{' '}
                  ·{' '}
                  {isPt
                    ? chart.sunPosition.zodiacSign.elementPt
                    : chart.sunPosition.zodiacSign.elementEn}
                </div>
              </div>

              {/* Natal Moon Card */}
              <div
                onClick={() => setSelectedBodyId('MOON')}
                className={`p-3 border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                  selectedBody.id === 'MOON'
                    ? 'border-amber-400 ring-1 ring-amber-400 bg-blue-950/25'
                    : 'border-blue-500/40 bg-blue-950/15 hover:bg-blue-950/25'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-bold text-blue-400 uppercase tracking-wider">
                    ☽ {isPt ? 'Signo Lunar & Fase na Hora' : 'Natal Moon Sign & Phase'}
                  </div>
                  <div className="text-sm sm:text-base font-bold text-slate-100">
                    {chart.moonPosition.zodiacSign.symbol}{' '}
                    {isPt
                      ? chart.moonPosition.zodiacSign.namePt
                      : chart.moonPosition.zodiacSign.nameEn}{' '}
                    ({isPt ? 'Mês' : 'Month'}{' '}
                    {MONTH_ROMAN_NUMERALS[chart.moonPosition.signIndex - 1]})
                  </div>
                  <div className="text-slate-300 italic tabular-nums">
                    {getLocalizedPhaseName(chart.birthLunarInfo.phaseName, language)} ·{' '}
                    {(chart.birthLunarInfo.fraction * 100).toFixed(1)}%{' '}
                    {isPt ? 'Iluminada' : 'Illuminated'}
                  </div>
                </div>
                <LunarPhaseIcon
                  fraction={chart.birthLunarInfo.fraction}
                  phaseName={chart.birthLunarInfo.phaseName}
                  size={34}
                />
              </div>

              {/* Rising Ascendant Card */}
              <div
                onClick={() => setSelectedBodyId('ASCENDANT')}
                className={`p-3 border transition-colors cursor-pointer space-y-1 ${
                  selectedBody.id === 'ASCENDANT'
                    ? 'border-amber-400 ring-1 ring-amber-400 bg-emerald-950/25'
                    : 'border-emerald-500/40 bg-emerald-950/15 hover:bg-emerald-950/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider">
                    ASC {isPt ? 'Signo Ascendente (Hora Exata)' : 'Rising Ascendant (Exact Hour)'}
                  </span>
                  <span className="tabular-nums text-emerald-300 font-semibold">
                    {chart.birthTimeHHMM} ({chart.ascendantPosition.eclipticLongitude.toFixed(1)}°)
                  </span>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-100">
                  {chart.ascendantPosition.zodiacSign.symbol}{' '}
                  {isPt
                    ? chart.ascendantPosition.zodiacSign.namePt
                    : chart.ascendantPosition.zodiacSign.nameEn}{' '}
                  ({isPt ? 'Mês' : 'Month'}{' '}
                  {MONTH_ROMAN_NUMERALS[chart.ascendantPosition.signIndex - 1]})
                </div>
                <div className="text-slate-300 italic tabular-nums">
                  {isPt
                    ? `Nascer do Sol (${observerPlaceLabel}): ${chart.localSunriseAtBirth} · Pôr do Sol: ${chart.localSunsetAtBirth} · ${chart.enochSolarGate}ª Porta de Enoque (${chart.dayParts18}/18 Dia)`
                    : `Birth Sunrise (${observerPlaceLabel}): ${chart.localSunriseAtBirth} · Sunset: ${chart.localSunsetAtBirth} · Enoch Gate ${chart.enochSolarGate} (${chart.dayParts18}/18 Day)`}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Complete 10-Point Natal Ephemeris Table + Live Selected Astro Inspector */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {isPt
                  ? 'II. Efemérides Natais nos 13 Signos'
                  : 'II. 13-Sign Natal Ephemeris'}
              </span>
              <span className="text-[11px] italic text-slate-300">
                {isPt
                  ? 'Selecione qualquer astro abaixo para ver sua leitura completa:'
                  : 'Select any celestial body below to view its full reading:'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs tabular-nums">
              {chart.bodies.map((b) => {
                const isSelected = selectedBody.id === b.id;
                const isInDragon = Boolean(b.zodiacSign.isThirteenthDragonSign);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBodyId(b.id)}
                    className={`p-2 border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/25'
                        : isInDragon
                        ? 'border-emerald-500/40 bg-emerald-950/15 hover:bg-slate-900'
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`font-bold text-xs shrink-0 ${
                          isSelected ? 'text-amber-400' : 'text-amber-300'
                        }`}
                      >
                        {b.symbol}
                      </span>
                      <span className="text-slate-100 font-bold truncate">
                        {isPt ? b.namePt : b.nameEn}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-amber-400 font-bold">
                        {b.zodiacSign.symbol}{' '}
                        {(isPt ? b.zodiacSign.namePt : b.zodiacSign.nameEn).slice(0, 7)}
                      </span>
                      <span className="text-slate-300 font-semibold ml-1">
                        {b.degreeInSign.toFixed(0)}°
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detailed Live Inspection Card Right Under the 10 Ephemeris Buttons */}
            <div className="p-3.5 border border-amber-500/50 bg-slate-900/70 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold">
                    {selectedBody.symbol} {isPt ? selectedBody.namePt : selectedBody.nameEn}
                  </span>
                  <span className="font-bold text-slate-100 text-sm">
                    {selectedBody.zodiacSign.symbol}{' '}
                    {isPt ? selectedBody.zodiacSign.namePt : selectedBody.zodiacSign.nameEn} —{' '}
                    {isPt ? 'Mês' : 'Month'} {MONTH_ROMAN_NUMERALS[selectedBody.signIndex - 1]}
                  </span>
                </div>
                <span className="tabular-nums font-bold text-amber-400">
                  {selectedBody.eclipticLongitude.toFixed(1)}° ({isPt ? 'Dia' : 'Day'}{' '}
                  {selectedBody.equivalentSacredDayInMonth}/28)
                </span>
              </div>

              <div className="text-purple-300 italic font-medium">
                {isPt ? selectedBody.rolePt : selectedBody.roleEn} ·{' '}
                {isPt
                  ? selectedBody.zodiacSign.archetypePt
                  : selectedBody.zodiacSign.archetypeEn}{' '}
                ({selectedBody.zodiacSign.constellationLatin} ·{' '}
                {isPt ? selectedBody.zodiacSign.elementPt : selectedBody.zodiacSign.elementEn})
              </div>

              <p className="text-slate-200 leading-relaxed">
                {isPt
                  ? selectedBody.zodiacSign.meaningPt
                  : selectedBody.zodiacSign.meaningEn}
              </p>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-300 tabular-nums">
                  {isPt ? 'Arco do Signo:' : 'Sign Arc:'} {selectedBody.zodiacSign.eclipticArc} ·{' '}
                  {isPt ? 'Grau no Signo:' : 'Degree in Sign:'}{' '}
                  {selectedBody.degreeInSign.toFixed(1)}°
                </span>

                {onSelectMonthInCalendar && (
                  <button
                    type="button"
                    onClick={() => onSelectMonthInCalendar(selectedBody.signIndex)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {isPt
                      ? `Ver Mês ${MONTH_ROMAN_NUMERALS[selectedBody.signIndex - 1]} no Calendário`
                      : `View Month ${MONTH_ROMAN_NUMERALS[selectedBody.signIndex - 1]} in Calendar`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Major Natal Geometric Aspects */}
          <div className="p-4 sm:p-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                {isPt
                  ? 'III. Aspectos Geométricos de Alinhamento Natal'
                  : 'III. Natal Geometric Alignment Aspects'}
              </span>
              <span className="text-[11px] italic text-slate-300">
                {isPt
                  ? 'Toque em um aspecto para ver os 2 astros alinhados:'
                  : 'Tap an aspect to inspect the 2 aligned bodies:'}
              </span>
            </div>

            {chart.aspects.length === 0 ? (
              <p className="text-xs text-slate-300 italic">
                {isPt
                  ? 'Nenhum aspecto exato dentro da orbe estrita neste horário.'
                  : 'No exact major aspect within strict orb at this hour.'}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] tabular-nums">
                  {chart.aspects.slice(0, 6).map((asp, idx) => {
                    const activeIdx =
                      selectedAspectIdx < Math.min(6, chart.aspects.length)
                        ? selectedAspectIdx
                        : 0;
                    const isSelectedAspect = activeIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAspectIdx(idx)}
                        className={`px-2.5 py-1.5 border text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isSelectedAspect
                            ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/25'
                            : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900'
                        }`}
                      >
                        <span className="text-slate-100 font-bold">
                          <span className="text-amber-400">{asp.bodyA.symbol}</span>{' '}
                          <span className="text-purple-300">{asp.symbol}</span>{' '}
                          <span className="text-emerald-400">{asp.bodyB.symbol}</span>{' '}
                          {isPt ? asp.labelPt : asp.labelEn}
                        </span>
                        <span className="text-slate-300 font-semibold">
                          {asp.angleDiff.toFixed(1)}°
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Aspect Detail Box */}
                {(() => {
                  const visibleAspects = chart.aspects.slice(0, 6);
                  const activeAsp =
                    visibleAspects[
                      selectedAspectIdx < visibleAspects.length ? selectedAspectIdx : 0
                    ];
                  if (!activeAsp) return null;

                  const aspectMeaningMap: Record<
                    typeof activeAsp.aspectType,
                    { pt: string; en: string }
                  > = {
                    CONJUNCTION: {
                      pt: 'União focal de forças no mesmo arco eclíptico — os dois astros operam em síntese direta.',
                      en: 'Focal union of forces in the same ecliptic arc — both bodies operate in direct synthesis.',
                    },
                    SEXTILE: {
                      pt: 'Harmonia cooperativa de 60° — abertura criativa e comunicação fluida entre os dois signos.',
                      en: 'Cooperative 60° harmony — creative opening and fluid communication between both signs.',
                    },
                    SQUARE: {
                      pt: 'Tensão dinâmica de 90° — estímulo de ação, superação e amadurecimento entre os dois eixos.',
                      en: 'Dynamic 90° tension — catalyst for action, mastery, and maturation between both axes.',
                    },
                    TRINE: {
                      pt: 'Fluxo consonante de 120° — afinidade natural e equilíbrio estável entre os dois signos natais.',
                      en: 'Consonant 120° flow — natural affinity and stable balance between both natal signs.',
                    },
                    OPPOSITION: {
                      pt: 'Polaridade complementar de 180° — espelhamento pleno e equilíbrio entre polos opostos da roda.',
                      en: 'Complementary 180° polarity — full mirroring and balance across opposite poles of the wheel.',
                    },
                  };

                  return (
                    <div className="p-3 border border-purple-500/40 bg-slate-900/70 space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-100">
                          <span className="text-amber-400">
                            {activeAsp.bodyA.symbol}{' '}
                            {isPt ? activeAsp.bodyA.namePt : activeAsp.bodyA.nameEn}
                          </span>{' '}
                          <span className="text-purple-300 px-1">{activeAsp.symbol}</span>{' '}
                          <span className="text-emerald-400">
                            {activeAsp.bodyB.symbol}{' '}
                            {isPt ? activeAsp.bodyB.namePt : activeAsp.bodyB.nameEn}
                          </span>
                        </span>
                        <span className="tabular-nums text-amber-400 font-bold">
                          {isPt ? activeAsp.labelPt : activeAsp.labelEn} ·{' '}
                          {activeAsp.angleDiff.toFixed(1)}° ({isPt ? 'Orbe' : 'Orb'}{' '}
                          {activeAsp.orbDegrees.toFixed(1)}°)
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300">
                        <strong>
                          {activeAsp.bodyA.zodiacSign.symbol}{' '}
                          {isPt
                            ? activeAsp.bodyA.zodiacSign.namePt
                            : activeAsp.bodyA.zodiacSign.nameEn}{' '}
                          ({isPt ? 'Mês' : 'Month'}{' '}
                          {MONTH_ROMAN_NUMERALS[activeAsp.bodyA.signIndex - 1]})
                        </strong>{' '}
                        ↔{' '}
                        <strong>
                          {activeAsp.bodyB.zodiacSign.symbol}{' '}
                          {isPt
                            ? activeAsp.bodyB.zodiacSign.namePt
                            : activeAsp.bodyB.zodiacSign.nameEn}{' '}
                          ({isPt ? 'Mês' : 'Month'}{' '}
                          {MONTH_ROMAN_NUMERALS[activeAsp.bodyB.signIndex - 1]})
                        </strong>
                      </div>

                      <p className="text-slate-200 italic leading-relaxed">
                        {isPt
                          ? aspectMeaningMap[activeAsp.aspectType].pt
                          : aspectMeaningMap[activeAsp.aspectType].en}
                      </p>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
