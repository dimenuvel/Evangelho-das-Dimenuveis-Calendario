/**
 * @file src/notifications/notificationService.ts
 * Configurable Biblical feast, Sabbath, Sunrise, and Moon Phase Change notification manager.
 * Delivers notifications directly to the Android mobile phone status bar:
 * 1. Android APK native NotificationChannel + AlarmManager (via AndroidBridge)
 * 2. Android Mobile Browser ServiceWorkerRegistration.showNotification (/sw.js)
 * 3. Standard System Notification API fallback
 */

import { getSunTimes } from '../astronomy/sun';
import { getLunarPhaseInfo, getLocalizedPhaseName } from '../astronomy/moon';
import { Language } from '../i18n/translations';

export interface NotificationSettings {
  enabled: boolean;
  sunriseAlert: boolean; // Daily local sunrise notification in Android status bar
  moonPhaseChangeAlert: boolean; // All 8 astronomical moon phase transitions in Android status bar
  upcomingFeastAlert: boolean; // 24 hours prior to feast
  feastBeginningAlert: boolean;
  feastEndingAlert: boolean;
  weeklySabbathAlert: boolean; // Friday sunset / Sabbath morning
  dayZeroAlert: boolean;
  newMoonAlert: boolean;
  fullMoonAlert: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  sunriseAlert: true,
  moonPhaseChangeAlert: true,
  upcomingFeastAlert: true,
  feastBeginningAlert: true,
  feastEndingAlert: true,
  weeklySabbathAlert: true,
  dayZeroAlert: true,
  newMoonAlert: true,
  fullMoonAlert: true,
};

const SUNRISE_LAST_FIRED_KEY = 'dimenueveis_last_sunrise_alert_day';
const MOON_PHASE_LAST_SEEN_KEY = 'dimenueveis_last_moon_phase_seen';
export const NOTIF_PROMPT_DECIDED_KEY = 'dimenueveis_notif_prompt_decided_v1';

// Register Service Worker so Android Chrome / mobile web can post directly to the Android status bar
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore registration error in restricted preview environments
    });
  });
}

export function hasUserDecidedNotificationPrompt(): boolean {
  try {
    return localStorage.getItem(NOTIF_PROMPT_DECIDED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markNotificationPromptDecided(): void {
  try {
    localStorage.setItem(NOTIF_PROMPT_DECIDED_KEY, 'true');
  } catch {
    // ignore storage errors
  }
}

export function loadStoredNotificationSettings(): NotificationSettings {
  try {
    const saved = localStorage.getItem('dimenueveis_notifications');
    if (saved) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load notification settings', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem('dimenueveis_notifications', JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dimenueveisNotificationSettingsChanged', { detail: settings })
      );
    }
  } catch (e) {
    console.error('Failed to save notification settings', e);
  }
}

/**
 * Requests the native Android APK system notification permission dialog (POST_NOTIFICATIONS)
 * or mobile browser system notification permission dialog.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // 1. Android APK Native Notification Permission (Android 13+ system dialog)
  if (typeof window !== 'undefined' && window.AndroidBridge) {
    try {
      const alreadyGranted = window.AndroidBridge.hasNotificationPermission?.() ?? true;
      if (alreadyGranted) return true;
      if (window.AndroidBridge.requestNotificationPermission) {
        const granted = await new Promise<boolean>((resolve) => {
          let settled = false;
          const handler = (evt: Event) => {
            if (settled) return;
            settled = true;
            window.removeEventListener('androidNotificationPermissionResult', handler);
            const detail = (evt as CustomEvent)?.detail;
            resolve(Boolean(detail?.granted));
          };
          window.addEventListener('androidNotificationPermissionResult', handler);
          window.AndroidBridge?.requestNotificationPermission?.();
          setTimeout(() => {
            if (!settled) {
              settled = true;
              window.removeEventListener('androidNotificationPermissionResult', handler);
              resolve(window.AndroidBridge?.hasNotificationPermission?.() ?? true);
            }
          }, 5000);
        });
        return granted;
      }
      return true;
    } catch {
      return true;
    }
  }

  // 2. Standard Android / Mobile Web Notification API system prompt
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Delivers a notification exclusively to the Android mobile phone status bar / system notification shade.
 * Does NOT show any in-app pop-up modal or toast banner inside the React UI.
 */
export function sendFeastNotification(title: string, body: string, forceSend = false): void {
  const settings = loadStoredNotificationSettings();
  if (!settings.enabled && !forceSend) return;

  // 1. Android APK native NotificationManager status bar notification
  if (typeof window !== 'undefined' && window.AndroidBridge?.showNotification) {
    try {
      window.AndroidBridge.showNotification(title, body);
      return;
    } catch {
      // fall through
    }
  }

  // 2. Android Mobile Browser ServiceWorker status bar notification
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (reg && typeof reg.showNotification === 'function') {
          return reg.showNotification(title, {
            body,
            icon: '/app-icon.svg',
            badge: '/app-icon.svg',
            tag: `dimenueveis-${Date.now()}`,
          });
        }
        // Desktop browser fallback when no SW is active
        new Notification(title, { body, icon: '/app-icon.svg' });
      })
      .catch(() => {
        try {
          new Notification(title, { body, icon: '/app-icon.svg' });
        } catch {
          // ignore
        }
      });
    return;
  }

  // 3. Standard System Notification API fallback
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(title, { body, icon: '/app-icon.svg' });
    } catch {
      // ignore
    }
  }
}

function formatHHMM(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Sends a Sunrise status bar notification to the Android phone.
 */
export function sendSunriseAlertPreview(
  now: Date,
  latitude = 31.7683,
  longitude = 35.2137,
  cityName = 'Jerusalem (Default)',
  language: Language = 'pt',
  forceSend = true
): void {
  const isPt = language === 'pt';
  const sunTimes = getSunTimes(now, latitude, longitude);
  const sunriseStr = formatHHMM(sunTimes.sunrise);
  const noonStr = formatHHMM(sunTimes.solarNoon);
  const sunsetStr = formatHHMM(sunTimes.sunset);
  const displayCity =
    !cityName || cityName === 'Jerusalem (Default)'
      ? isPt
        ? 'Jerusalém'
        : 'Jerusalem'
      : cityName;

  const title = isPt
    ? `☀️ Nascer do Sol (${sunriseStr}) — ${displayCity}`
    : `☀️ Local Sunrise (${sunriseStr}) — ${displayCity}`;
  const body = isPt
    ? `Alvorada solar em ${displayCity}. Meio-dia solar às ${noonStr} · Pôr do Sol (início do dia bíblico) às ${sunsetStr}.`
    : `Solar dawn at ${displayCity}. Solar Noon at ${noonStr} · Sunset (Biblical day boundary) at ${sunsetStr}.`;

  sendFeastNotification(title, body, forceSend);
}

/**
 * Sends a Moon Phase Change status bar notification to the Android phone.
 */
export function sendMoonPhaseAlertPreview(
  now: Date,
  language: Language = 'pt',
  forceSend = true
): void {
  const isPt = language === 'pt';
  const lunarInfo = getLunarPhaseInfo(now);
  const localizedPhase = getLocalizedPhaseName(lunarInfo.phaseName, language);
  const pct = (lunarInfo.fraction * 100).toFixed(1);

  const title = isPt
    ? `🌙 Mudança de Fase da Lua: ${localizedPhase}`
    : `🌙 Moon Phase Change: ${localizedPhase}`;
  const body = isPt
    ? `A Lua entrou na fase ${localizedPhase} (${pct}% iluminada · Idade lunar: ${lunarInfo.ageDays}d · Lunação #${lunarInfo.lunationNumber}).`
    : `The Moon has entered ${localizedPhase} (${pct}% illuminated · Lunar age: ${lunarInfo.ageDays}d · Lunation #${lunarInfo.lunationNumber}).`;

  sendFeastNotification(title, body, forceSend);
}

/**
 * Schedules upcoming Sunrise and Moon Phase Change alarms with Android AlarmManager (when running in Android APK)
 * and evaluates live Sunrise and Moon Phase Change transitions for the Android status bar.
 */
export function evaluateSolarAndLunarNotifications(
  now: Date,
  latitude = 31.7683,
  longitude = 35.2137,
  cityName = 'Jerusalem (Default)',
  language: Language = 'pt'
): void {
  const settings = loadStoredNotificationSettings();
  const isPt = language === 'pt';
  const lunarInfo = getLunarPhaseInfo(now);

  // Track current lunar phase so transitions are detected accurately
  let previousPhase: string | null = null;
  try {
    previousPhase = localStorage.getItem(MOON_PHASE_LAST_SEEN_KEY);
    if (!previousPhase) {
      localStorage.setItem(MOON_PHASE_LAST_SEEN_KEY, lunarInfo.phaseName);
    }
  } catch {
    // ignore storage errors
  }

  if (!settings.enabled) return;

  const displayCity =
    !cityName || cityName === 'Jerusalem (Default)'
      ? isPt
        ? 'Jerusalém'
        : 'Jerusalem'
      : cityName;

  // 1. Sunrise Notification in Android status bar + native Android AlarmManager scheduling for next Sunrise
  if (settings.sunriseAlert) {
    try {
      const todayKey = formatLocalYMD(now);
      const lastFiredDay = localStorage.getItem(SUNRISE_LAST_FIRED_KEY);
      const todaySunTimes = getSunTimes(now, latitude, longitude);
      const diffMs = now.getTime() - todaySunTimes.sunrise.getTime();

      if (lastFiredDay !== todayKey && diffMs >= 0 && diffMs <= 2 * 3600 * 1000) {
        localStorage.setItem(SUNRISE_LAST_FIRED_KEY, todayKey);
        sendSunriseAlertPreview(now, latitude, longitude, cityName, language, false);
      }

      // Schedule next upcoming Sunrise with Android native AlarmManager so it fires in the status bar even if app is closed
      if (typeof window !== 'undefined' && window.AndroidBridge?.scheduleStatusBarNotification) {
        const nextSunriseDate =
          todaySunTimes.sunrise.getTime() > now.getTime()
            ? todaySunTimes.sunrise
            : getSunTimes(new Date(now.getTime() + 86400000), latitude, longitude).sunrise;
        const nextSunTimes = getSunTimes(nextSunriseDate, latitude, longitude);
        const srStr = formatHHMM(nextSunTimes.sunrise);
        const noonStr = formatHHMM(nextSunTimes.solarNoon);
        const ssStr = formatHHMM(nextSunTimes.sunset);
        const srTitle = isPt
          ? `☀️ Nascer do Sol (${srStr}) — ${displayCity}`
          : `☀️ Local Sunrise (${srStr}) — ${displayCity}`;
        const srBody = isPt
          ? `Alvorada solar em ${displayCity}. Meio-dia solar às ${noonStr} · Pôr do Sol às ${ssStr}.`
          : `Solar dawn at ${displayCity}. Solar Noon at ${noonStr} · Sunset at ${ssStr}.`;

        window.AndroidBridge.scheduleStatusBarNotification(
          7001,
          nextSunTimes.sunrise.getTime(),
          srTitle,
          srBody
        );
      }
    } catch {
      // ignore
    }
  }

  // 2. Moon Phase Change Notification in Android status bar
  if (previousPhase && previousPhase !== lunarInfo.phaseName) {
    try {
      localStorage.setItem(MOON_PHASE_LAST_SEEN_KEY, lunarInfo.phaseName);
    } catch {
      // ignore
    }

    const shouldNotifyPhase =
      settings.moonPhaseChangeAlert ||
      (lunarInfo.phaseName === 'NEW_MOON' && settings.newMoonAlert) ||
      (lunarInfo.phaseName === 'FULL_MOON' && settings.fullMoonAlert);

    if (shouldNotifyPhase) {
      sendMoonPhaseAlertPreview(now, language, false);
    }
  }

  // Also schedule the next major lunar phase transition with Android AlarmManager when running in Android APK
  if (
    settings.moonPhaseChangeAlert &&
    typeof window !== 'undefined' &&
    window.AndroidBridge?.scheduleStatusBarNotification
  ) {
    try {
      const nextNewMoonMs = lunarInfo.nextNewMoon.getTime();
      const nextFullMoonMs = lunarInfo.nextFullMoon.getTime();
      const isNewNext = nextNewMoonMs <= nextFullMoonMs;
      const targetMs = isNewNext ? nextNewMoonMs : nextFullMoonMs;
      const phaseLabel = isNewNext
        ? getLocalizedPhaseName('NEW_MOON', language)
        : getLocalizedPhaseName('FULL_MOON', language);
      const mpTitle = isPt
        ? `🌙 Mudança de Fase da Lua: ${phaseLabel}`
        : `🌙 Moon Phase Change: ${phaseLabel}`;
      const mpBody = isPt
        ? `A Lua alcançou a fase ${phaseLabel} no ciclo sinódico.`
        : `The Moon has reached ${phaseLabel} in the synodic cycle.`;

      window.AndroidBridge.scheduleStatusBarNotification(7002, targetMs, mpTitle, mpBody);
    } catch {
      // ignore
    }
  }
}
