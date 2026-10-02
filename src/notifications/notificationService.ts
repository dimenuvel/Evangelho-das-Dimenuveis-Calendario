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
import { resolveSacredBirthday, solarDateToSacredDate } from '../calendar/sacredCalendar';
import { LunarAnchorMode } from '../types/calendar';
import { Language } from '../i18n/translations';

export interface NotificationSettings {
  enabled: boolean;
  sunriseAlert: boolean; // Daily local sunrise notification in Android status bar
  moonPhaseChangeAlert: boolean; // All 8 astronomical moon phase transitions in Android status bar
  birthdayAlert: boolean; // Personal 13-month Sacred Birthday notification
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
  birthdayAlert: true,
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
const BIRTHDAY_LAST_FIRED_KEY = 'dimenueveis_last_birthday_alert_year';
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
 * Sends a 13-Month Sacred Birthday notification to the Android status bar / browser notifications.
 */
export function sendBirthdayAlertPreview(
  gregorianBirthISO: string,
  anchorMode: LunarAnchorMode = 'CONJUNCTION',
  language: Language = 'pt',
  forceSend = true
): void {
  const isPt = language === 'pt';
  const currentSacredDay = solarDateToSacredDate(new Date(), anchorMode);
  const resolved = resolveSacredBirthday(
    gregorianBirthISO,
    anchorMode,
    currentSacredDay.calendarYear
  );
  if (!resolved) return;

  const sacredLabel =
    resolved.sacredMonth === 0
      ? isPt
        ? 'Dia Zero (Sábado Anual)'
        : 'Day Zero (Annual Sabbath)'
      : isPt
        ? `Mês ${resolved.sacredMonth}, Dia ${resolved.sacredDayOfMonth}`
        : `Month ${resolved.sacredMonth}, Day ${resolved.sacredDayOfMonth}`;

  const nextGregISO = resolved.targetYearDay.gregorianDate.toISOString().split('T')[0];

  const title = isPt
    ? `🎂 Natalício no Calendário de 13 Meses: ${sacredLabel}`
    : `🎂 13-Month Sacred Birthday: ${sacredLabel}`;
  const body = isPt
    ? `Seu aniversário (${gregorianBirthISO}) equivale a ${sacredLabel} no Calendário Sagrado de 13 Meses (${nextGregISO} no Ano Sagrado ${currentSacredDay.calendarYear}).`
    : `Your birthday (${gregorianBirthISO}) maps to ${sacredLabel} in the 13-Month Sacred Calendar (${nextGregISO} in Sacred Year ${currentSacredDay.calendarYear}).`;

  sendFeastNotification(title, body, forceSend);
}

/**
 * Schedules upcoming Sunrise, Moon Phase Change, and 13-Month Sacred Birthday alarms with Android AlarmManager (when running in Android APK)
 * and evaluates live Sunrise, Moon Phase Change, and Sacred Birthday transitions for the Android status bar.
 */
export function evaluateSolarAndLunarNotifications(
  now: Date,
  latitude = 31.7683,
  longitude = 35.2137,
  cityName = 'Jerusalem (Default)',
  language: Language = 'pt',
  userBirthdayGregorian?: string,
  anchorMode: LunarAnchorMode = 'CONJUNCTION'
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
      (lunarInfo.phaseName === 'New Moon' && settings.newMoonAlert) ||
      (lunarInfo.phaseName === 'Full Moon' && settings.fullMoonAlert);

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
      const nextDate = lunarInfo.nextPhaseDate;
      if (nextDate && nextDate instanceof Date) {
        const targetMs = nextDate.getTime();
        const phaseLabel = getLocalizedPhaseName(lunarInfo.nextPhaseName, language);
        const mpTitle = isPt
          ? `🌙 Próxima Fase da Lua: ${phaseLabel}`
          : `🌙 Next Moon Phase: ${phaseLabel}`;
        const mpBody = isPt
          ? `A Lua entrará na fase ${phaseLabel} no ciclo sinódico.`
          : `The Moon will enter ${phaseLabel} in the synodic cycle.`;

        window.AndroidBridge.scheduleStatusBarNotification(7002, targetMs, mpTitle, mpBody);
      }
    } catch {
      // ignore
    }
  }

  // 3. Personal 13-Month Sacred Birthday Notification
  if (settings.birthdayAlert && userBirthdayGregorian) {
    try {
      const todaySacred = solarDateToSacredDate(now, anchorMode);
      const resolved = resolveSacredBirthday(
        userBirthdayGregorian,
        anchorMode,
        todaySacred.calendarYear
      );
      if (resolved) {
        const isTodaySacredBirthday =
          (resolved.sacredMonth === 0 && todaySacred.kind === 'DAY_ZERO') ||
          (todaySacred.kind === 'NUMBERED_DAY' &&
            todaySacred.month === resolved.sacredMonth &&
            todaySacred.dayOfMonth === resolved.sacredDayOfMonth);

        const firedKey = `${todaySacred.calendarYear}-${resolved.sacredMonth}-${resolved.sacredDayOfMonth}`;
        const lastFired = localStorage.getItem(BIRTHDAY_LAST_FIRED_KEY);

        if (isTodaySacredBirthday && lastFired !== firedKey) {
          localStorage.setItem(BIRTHDAY_LAST_FIRED_KEY, firedKey);
          sendBirthdayAlertPreview(userBirthdayGregorian, anchorMode, language, false);
        }

        // Schedule upcoming Sacred Birthday morning alarm in Android APK
        if (typeof window !== 'undefined' && window.AndroidBridge?.scheduleStatusBarNotification) {
          let targetOccurrence = resolved.targetYearDay.gregorianDate;
          if (targetOccurrence.getTime() <= now.getTime()) {
            const nextYearResolved = resolveSacredBirthday(
              userBirthdayGregorian,
              anchorMode,
              todaySacred.calendarYear + 1
            );
            if (nextYearResolved) {
              targetOccurrence = nextYearResolved.targetYearDay.gregorianDate;
            }
          }
          const morningAlarm = new Date(
            targetOccurrence.getUTCFullYear(),
            targetOccurrence.getUTCMonth(),
            targetOccurrence.getUTCDate(),
            8,
            0,
            0
          );
          if (morningAlarm.getTime() > now.getTime()) {
            const sacredLabel =
              resolved.sacredMonth === 0
                ? isPt
                  ? 'Dia Zero'
                  : 'Day Zero'
                : isPt
                  ? `Mês ${resolved.sacredMonth}, Dia ${resolved.sacredDayOfMonth}`
                  : `Month ${resolved.sacredMonth}, Day ${resolved.sacredDayOfMonth}`;
            const bTitle = isPt
              ? `🎂 Feliz Natalício Sagrado (${sacredLabel})!`
              : `🎂 Happy Sacred Birthday (${sacredLabel})!`;
            const bBody = isPt
              ? `Hoje é ${sacredLabel}, o seu aniversário no Calendário Sagrado de 13 Meses!`
              : `Today is ${sacredLabel}, your birthday in the 13-Month Sacred Calendar!`;

            window.AndroidBridge.scheduleStatusBarNotification(
              7003,
              morningAlarm.getTime(),
              bTitle,
              bBody
            );
          }
        }
      }
    } catch {
      // ignore
    }
  }
}
