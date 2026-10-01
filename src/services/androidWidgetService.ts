/**
 * @file src/services/androidWidgetService.ts
 * Manages configuration, persistence, live astronomical/calendar payload generation,
 * and native Android APK AppWidgetProvider synchronization (via AndroidBridge)
 * for the Dimenúveis Android Home Screen Widget.
 */

import { CalendarConfiguration, CalendarDay } from '../types/calendar';
import { Language } from '../i18n/translations';
import { generateSacredYearDays, solarDateToSacredDate } from '../calendar/sacredCalendar';
import { getMonthDisplayTitle, getZodiacForSacredMonth } from '../calendar/months';
import { getLunarPhaseInfo, getLocalizedPhaseName } from '../astronomy/moon';
import { getSunTimes } from '../astronomy/sun';
import { calculateFeastOccurrences } from '../calendar/feastEngine';
import { calculateMillennialPosition } from '../chronology/chronologyEngine';
import { getChronologyModelById } from '../chronology/models';
import { getDailyPrayerForSacredDay } from '../calendar/dailyPrayer';

function calculateEnochGateForSacredDay(sacredDay: CalendarDay): {
  gateNumber: number;
  daylightParts: number;
  nightParts: number;
} {
  // 1 Enoch 72 mapping across the year (Gates 1..6 and 18 parts of day/night)
  if (sacredDay.kind === 'DAY_ZERO') {
    return { gateNumber: 4, daylightParts: 9, nightParts: 9 };
  }
  const m = sacredDay.month;
  // Months 1..13 mapped to Enoch's 6 celestial portals:
  const gateByMonth: Record<number, { gate: number; dayP: number; nightP: number }> = {
    1: { gate: 4, dayP: 10, nightP: 8 },
    2: { gate: 5, dayP: 11, nightP: 7 },
    3: { gate: 6, dayP: 12, nightP: 6 },
    4: { gate: 6, dayP: 12, nightP: 6 },
    5: { gate: 5, dayP: 11, nightP: 7 },
    6: { gate: 4, dayP: 10, nightP: 8 },
    7: { gate: 3, dayP: 9, nightP: 9 },
    8: { gate: 2, dayP: 8, nightP: 10 },
    9: { gate: 1, dayP: 7, nightP: 11 },
    10: { gate: 1, dayP: 6, nightP: 12 },
    11: { gate: 2, dayP: 7, nightP: 11 },
    12: { gate: 3, dayP: 8, nightP: 10 },
    13: { gate: 4, dayP: 9, nightP: 9 },
  };
  const entry = gateByMonth[m] || { gate: 4, dayP: 9, nightP: 9 };
  return {
    gateNumber: entry.gate,
    daylightParts: entry.dayP,
    nightParts: entry.nightP,
  };
}

export type AndroidWidgetTheme = 'obsidian' | 'parchment' | 'celestial' | 'mono';
export type AndroidWidgetSize = '3x4' | '4x5' | '4x6';
export type SimulatedWallpaperId = 'jerusalem_night' | 'judean_sunset' | 'olive_grove' | 'minimal_slate';

export interface AndroidWidgetConfig {
  alphaPercent: number; // 0 (fully transparent) to 100 (fully opaque)
  widgetTheme: AndroidWidgetTheme;
  widgetSize: AndroidWidgetSize;
  frostedBlur: boolean;
  goldBorder: boolean;
  use24HourFormat: boolean;
  showSeconds: boolean;
  showGpsAndSunTimes: boolean;
  showSabbathCountdown: boolean;
  showWeeklySabbathBar: boolean;
  showZodiacAndEnochGate: boolean;
  showNextFeast: boolean;
  showMillennialClock: boolean;
  showDailyVerse: boolean;
  previewWallpaper: SimulatedWallpaperId;
}

export const DEFAULT_ANDROID_WIDGET_CONFIG: AndroidWidgetConfig = {
  alphaPercent: 72,
  widgetTheme: 'obsidian',
  widgetSize: '4x6',
  frostedBlur: true,
  goldBorder: true,
  use24HourFormat: true,
  showSeconds: true,
  showGpsAndSunTimes: true,
  showSabbathCountdown: true,
  showWeeklySabbathBar: true,
  showZodiacAndEnochGate: true,
  showNextFeast: true,
  showMillennialClock: true,
  showDailyVerse: true,
  previewWallpaper: 'jerusalem_night',
};

const WIDGET_STORAGE_KEY = 'dimenueveis_android_widget_config_v2';
const LEGACY_WIDGET_STORAGE_KEY = 'dimenueveis_android_widget_config_v1';

export function normalizeVerticalWidgetSize(rawSize: unknown): AndroidWidgetSize {
  if (rawSize === '3x4' || rawSize === '4x2') return '3x4';
  if (rawSize === '4x5' || rawSize === '4x3') return '4x5';
  if (rawSize === '4x6' || rawSize === '4x4') return '4x6';
  return DEFAULT_ANDROID_WIDGET_CONFIG.widgetSize;
}

export function loadAndroidWidgetConfig(): AndroidWidgetConfig {
  try {
    const raw =
      localStorage.getItem(WIDGET_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_WIDGET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized: AndroidWidgetConfig = {
        ...DEFAULT_ANDROID_WIDGET_CONFIG,
        ...parsed,
        widgetSize: normalizeVerticalWidgetSize(parsed.widgetSize),
        alphaPercent:
          typeof parsed.alphaPercent === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.alphaPercent)))
            : DEFAULT_ANDROID_WIDGET_CONFIG.alphaPercent,
      };
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_ANDROID_WIDGET_CONFIG;
}

export function saveAndroidWidgetConfig(config: AndroidWidgetConfig): void {
  try {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export interface LiveAndroidWidgetSnapshot {
  // Config
  alphaPercent: number;
  widgetTheme: AndroidWidgetTheme;
  widgetSize: AndroidWidgetSize;
  frostedBlur: boolean;
  goldBorder: boolean;

  // Sacred Date & Gregorian
  sacredYear: number;
  sacredYearLabel: string;
  sacredDateHeadline: string;
  sacredSubline: string;
  gregorianDateStr: string;
  isDayZero: boolean;
  dayOfWeek: number; // 0 for Day Zero, 1..7 for numbered days

  // Time & Biblical Watch
  timeFormatted: string;
  ampmSuffix: string;
  biblicalWatchLabel: string;

  // Lunar Phase & 1 Enoch 14 Parts
  lunarPhaseKey: string;
  lunarPhaseLocalized: string;
  lunarIlluminationPercent: number;
  lunarAgeDays: string;
  enochLunarParts: number; // 0..14
  enochLunarPartsLabel: string;

  // GPS Location & Solar Ephemeris
  locationCity: string;
  coordinatesFormatted: string;
  sunriseStr: string;
  solarNoonStr: string;
  sunsetStr: string;

  // Sabbath Countdown
  isSabbathActive: boolean;
  sabbathStatusTitle: string;
  sabbathTargetDateLabel: string;
  sabbathSunsetLabel: string;
  sabbathCountdownStr: string;

  // 13-Sign Mazzaroth & 1 Enoch Gate
  zodiacSymbol: string;
  zodiacName: string;
  zodiacArchetype: string;
  enochGateNumber: number;
  enochGateLabel: string;
  enochDayNightRatioLabel: string;

  // Next Biblical Feast
  nextFeastName: string;
  nextFeastDaysAway: number;
  nextFeastLabel: string;

  // 7,000-Year Millennial Clock
  elapsedYears: number;
  millenniumNumber: number;
  millennialProgressPercent: number;
  millennialSummaryLabel: string;

  // Daily Scriptural Watchword
  dailyVerseRef: string;
  dailyVerseQuote: string;
}

function getLocalNoonForGregorianDate(gregDate: Date, dayOffset = 0): Date {
  const y = gregDate.getUTCFullYear();
  const m = gregDate.getUTCMonth();
  const d = gregDate.getUTCDate();
  return new Date(y, m, d + dayOffset, 12, 0, 0);
}

export function computeBiblicalWatchLabel(
  now: Date,
  sunrise: Date,
  solarNoon: Date,
  sunset: Date,
  language: Language
): string {
  const isPt = language === 'pt';
  const nowMs = now.getTime();
  const riseMs = sunrise.getTime();
  const sunsetMs = sunset.getTime();

  if (nowMs >= riseMs && nowMs < sunsetMs) {
    const daySpan = Math.max(1, sunsetMs - riseMs);
    const elapsed = nowMs - riseMs;
    const solarHour = Math.min(12, Math.max(1, Math.floor((elapsed / daySpan) * 12) + 1));
    if (solarHour <= 3) {
      return isPt ? `${solarHour}ª Hora Solar · Vigília Matutina` : `Solar Hour ${solarHour} · Morning Watch`;
    }
    if (solarHour <= 6) {
      return isPt ? `${solarHour}ª Hora Solar · Rumo ao Zênite` : `Solar Hour ${solarHour} · Midday Ascent`;
    }
    if (solarHour <= 9) {
      return isPt ? `${solarHour}ª Hora Solar · Declínio da Tarde` : `Solar Hour ${solarHour} · Afternoon Watch`;
    }
    return isPt ? `${solarHour}ª Hora Solar · Véspera do Pôr do Sol` : `Solar Hour ${solarHour} · Evening Approach`;
  }

  // Night watches (4 Biblical Night Watches: Evening, Midnight, Cockcrow, Morning)
  const hour = now.getHours();
  if (hour >= 18 && hour < 21) {
    return isPt ? '1ª Vigília da Noite (Anoitecer)' : '1st Night Watch (Evening)';
  }
  if (hour >= 21 || hour === 0) {
    return isPt ? '2ª Vigília da Noite (Meia-Noite)' : '2nd Night Watch (Midnight)';
  }
  if (hour >= 1 && hour < 4) {
    return isPt ? '3ª Vigília da Noite (Canto do Galo)' : '3rd Night Watch (Cockcrow)';
  }
  return isPt ? '4ª Vigília da Noite (Alvorada)' : '4th Night Watch (Daybreak)';
}

export function buildLiveAndroidWidgetSnapshot(
  now: Date,
  calendarConfig: CalendarConfiguration,
  widgetConfig: AndroidWidgetConfig,
  language: Language
): LiveAndroidWidgetSnapshot {
  const isPt = language === 'pt';

  const latitude = calendarConfig.userLocation?.latitude ?? 31.7683;
  const longitude = calendarConfig.userLocation?.longitude ?? 35.2137;
  const rawCity = calendarConfig.userLocation?.cityName;
  const locationCity =
    !rawCity || rawCity === 'Jerusalem (Default)'
      ? isPt
        ? 'Jerusalém (Padrão)'
        : 'Jerusalem (Default)'
      : rawCity;

  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  const coordinatesFormatted = `${Math.abs(latitude).toFixed(2)}°${latDir}, ${Math.abs(longitude).toFixed(2)}°${lonDir}`;

  // 1. Sacred Date
  const sacredDay: CalendarDay = solarDateToSacredDate(now, calendarConfig.lunarAnchorMode);
  const sacredYear = sacredDay.calendarYear;
  const sacredYearLabel = isPt ? `Ano Sagrado ${sacredYear}` : `Sacred Year ${sacredYear}`;

  const isDayZero = sacredDay.kind === 'DAY_ZERO';
  const dayOfWeek = sacredDay.kind === 'NUMBERED_DAY' ? sacredDay.dayOfWeek : 0;

  let sacredDateHeadline = '';
  let sacredSubline = '';
  if (sacredDay.kind === 'DAY_ZERO') {
    sacredDateHeadline = isPt ? 'Dia Zero · Ano Novo Sagrado' : 'Day Zero · Sacred New Year';
    sacredSubline = isPt
      ? 'Sábado Anual · Fora dos 364 Dias Numerados'
      : 'Annual Sabbath · Outside 364 Numbered Days';
  } else {
    const monthTitle = getMonthDisplayTitle(
      sacredDay.month,
      calendarConfig.customMonthNames,
      language
    );
    sacredDateHeadline = `${monthTitle}, ${isPt ? 'Dia' : 'Day'} ${sacredDay.dayOfMonth}`;
    const weekdayName =
      sacredDay.dayOfWeek === 7
        ? isPt
          ? '7º Dia (Sábado Semanal)'
          : '7th Day (Weekly Sabbath)'
        : isPt
          ? `${sacredDay.dayOfWeek}º Dia da Semana`
          : `Day ${sacredDay.dayOfWeek} of Week`;
    sacredSubline = isPt
      ? `Semana ${sacredDay.weekOfYear} de 52 · ${weekdayName} · Dia ${sacredDay.dayOfYear}/364`
      : `Week ${sacredDay.weekOfYear} of 52 · ${weekdayName} · Day ${sacredDay.dayOfYear}/364`;
  }

  const gregorianDateStr = now.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // 2. Time & Sun Ephemeris
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const formatHHMM = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  const sunTimes = getSunTimes(now, latitude, longitude);
  const sunriseStr = formatHHMM(sunTimes.sunrise);
  const solarNoonStr = formatHHMM(sunTimes.solarNoon);
  const sunsetStr = formatHHMM(sunTimes.sunset);

  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  let timeFormatted = '';
  let ampmSuffix = '';
  if (widgetConfig.use24HourFormat) {
    timeFormatted = widgetConfig.showSeconds
      ? `${pad2(hours24)}:${pad2(minutes)}:${pad2(seconds)}`
      : `${pad2(hours24)}:${pad2(minutes)}`;
  } else {
    const h12 = hours24 % 12 || 12;
    ampmSuffix = hours24 >= 12 ? 'PM' : 'AM';
    timeFormatted = widgetConfig.showSeconds
      ? `${pad2(h12)}:${pad2(minutes)}:${pad2(seconds)}`
      : `${pad2(h12)}:${pad2(minutes)}`;
  }

  const biblicalWatchLabel = computeBiblicalWatchLabel(
    now,
    sunTimes.sunrise,
    sunTimes.solarNoon,
    sunTimes.sunset,
    language
  );

  // 3. Lunar Phase & 1 Enoch 14 Parts
  const lunarInfo = getLunarPhaseInfo(now);
  const lunarPhaseLocalized = getLocalizedPhaseName(lunarInfo.phaseName, language);
  const lunarIlluminationPercent = Math.round(lunarInfo.fraction * 100);
  const lunarAgeDays = `${lunarInfo.ageDays.toFixed(1)}d`;
  const enochLunarParts = Math.min(14, Math.max(0, Math.round(lunarInfo.fraction * 14)));
  const enochLunarPartsLabel = isPt
    ? `Luz de Enoque: ${enochLunarParts}/14 Partes`
    : `Enoch Light: ${enochLunarParts}/14 Parts`;

  // 4. Sabbath Countdown
  const currentYearDays = generateSacredYearDays(sacredYear, calendarConfig.lunarAnchorMode);
  const nextYearDays = generateSacredYearDays(sacredYear + 1, calendarConfig.lunarAnchorMode);
  const sabbathCandidates = [...currentYearDays, ...nextYearDays].filter(
    (d) => d.kind === 'DAY_ZERO' || (d.kind === 'NUMBERED_DAY' && d.isWeeklySabbath)
  );

  const windows = sabbathCandidates.map((sabbathDay) => {
    const eveNoon = getLocalNoonForGregorianDate(sabbathDay.gregorianDate, -1);
    const sabbathNoon = getLocalNoonForGregorianDate(sabbathDay.gregorianDate, 0);
    return {
      day: sabbathDay,
      startSunset: getSunTimes(eveNoon, latitude, longitude).sunset,
      endSunset: getSunTimes(sabbathNoon, latitude, longitude).sunset,
    };
  });

  const nowMs = now.getTime();
  const activeWindow =
    windows.find((w) => nowMs >= w.startSunset.getTime() && nowMs < w.endSunset.getTime()) || null;
  const nextWindow = windows.find((w) => w.startSunset.getTime() > nowMs) || windows[0];

  const isSabbathActive = Boolean(activeWindow);
  const targetTimestamp = isSabbathActive
    ? activeWindow!.endSunset.getTime()
    : nextWindow.startSunset.getTime();

  const diffMs = Math.max(0, targetTimestamp - nowMs);
  const totalSec = Math.floor(diffMs / 1000);
  const cdDays = Math.floor(totalSec / 86400);
  const cdHours = Math.floor((totalSec % 86400) / 3600);
  const cdMinutes = Math.floor((totalSec % 3600) / 60);
  const cdSeconds = totalSec % 60;

  const sabbathCountdownStr =
    cdDays > 0
      ? `${cdDays}d ${pad2(cdHours)}h ${pad2(cdMinutes)}m ${pad2(cdSeconds)}s`
      : `${pad2(cdHours)}h ${pad2(cdMinutes)}m ${pad2(cdSeconds)}s`;

  const targetSabbathDay = isSabbathActive ? activeWindow!.day : nextWindow.day;
  const sabbathTargetDateLabel =
    targetSabbathDay.kind === 'DAY_ZERO'
      ? isPt
        ? 'Dia Zero'
        : 'Day Zero'
      : `${getMonthDisplayTitle(
          targetSabbathDay.month,
          calendarConfig.customMonthNames,
          language
        )}, ${isPt ? 'Dia' : 'Day'} ${targetSabbathDay.dayOfMonth}`;

  const sabbathSunsetTimeStr = formatHHMM(
    isSabbathActive ? activeWindow!.endSunset : nextWindow.startSunset
  );

  const sabbathStatusTitle = isSabbathActive
    ? isPt
      ? 'Sábado Ativo · Descanso Sagrado'
      : 'Sabbath Active · Sacred Rest'
    : isPt
      ? 'Próximo Sábado'
      : 'Next Sabbath';

  const sabbathSunsetLabel = isSabbathActive
    ? isPt
      ? `Término ao Pôr do Sol (${sabbathSunsetTimeStr})`
      : `Ends at Sunset (${sabbathSunsetTimeStr})`
    : isPt
      ? `Início ao Pôr do Sol (${sabbathSunsetTimeStr})`
      : `Begins at Sunset (${sabbathSunsetTimeStr})`;

  // 5. 13-Sign Mazzaroth & 1 Enoch Solar Gate
  const activeMonthForSign = sacredDay.kind === 'NUMBERED_DAY' ? sacredDay.month : 1;
  const zodiac = getZodiacForSacredMonth(activeMonthForSign);
  const zodiacSymbol = zodiac.symbol;
  const zodiacName = isPt ? zodiac.namePt : zodiac.nameEn;
  const zodiacArchetype = isPt ? zodiac.archetypePt : zodiac.archetypeEn;

  const enochGateInfo = calculateEnochGateForSacredDay(sacredDay);
  const enochGateNumber = enochGateInfo.gateNumber;
  const enochGateLabel = isPt
    ? `Porta Celeste ${enochGateNumber} (1 Enoque 72)`
    : `Celestial Gate ${enochGateNumber} (1 Enoch 72)`;
  const enochDayNightRatioLabel = isPt
    ? `Dia ${enochGateInfo.daylightParts}/18 · Noite ${enochGateInfo.nightParts}/18`
    : `Day ${enochGateInfo.daylightParts}/18 · Night ${enochGateInfo.nightParts}/18`;

  // 6. Next Biblical Feast
  const feastsThisYear = calculateFeastOccurrences(
    sacredYear,
    calendarConfig.lunarAnchorMode,
    calendarConfig.feastCalendarModel,
    now,
    language,
    calendarConfig.userLocation
  );
  const feastsNextYear = calculateFeastOccurrences(
    sacredYear + 1,
    calendarConfig.lunarAnchorMode,
    calendarConfig.feastCalendarModel,
    now,
    language,
    calendarConfig.userLocation
  );
  const allFeasts = [...feastsThisYear, ...feastsNextYear].sort(
    (a, b) => a.gregorianStartDate.getTime() - b.gregorianStartDate.getTime()
  );
  const upcomingFeast =
    allFeasts.find((f) => f.isActiveToday || f.isUpcoming) || allFeasts[0];

  const nextFeastName = upcomingFeast ? upcomingFeast.feast.name : isPt ? 'Páscoa' : 'Passover';
  const computedDaysUntil = upcomingFeast
    ? upcomingFeast.isActiveToday
      ? 0
      : typeof upcomingFeast.daysUntilStart === 'number' && !Number.isNaN(upcomingFeast.daysUntilStart)
        ? upcomingFeast.daysUntilStart
        : Math.ceil((upcomingFeast.gregorianStartDate.getTime() - now.getTime()) / 86400000)
    : 0;
  const nextFeastDaysAway = Math.max(0, Number.isFinite(computedDaysUntil) ? computedDaysUntil : 0);
  const nextFeastLabel =
    upcomingFeast?.isActiveToday
      ? isPt
        ? `${nextFeastName} · Em Celebração Hoje`
        : `${nextFeastName} · Active Today`
      : nextFeastDaysAway === 0
        ? isPt
          ? `${nextFeastName} · Hoje ao Pôr do Sol`
          : `${nextFeastName} · Today at Sunset`
        : isPt
          ? `${nextFeastName} · em ${nextFeastDaysAway} dia${nextFeastDaysAway === 1 ? '' : 's'}`
          : `${nextFeastName} · in ${nextFeastDaysAway} day${nextFeastDaysAway === 1 ? '' : 's'}`;

  // 7. 7,000-Year Millennial Clock
  const activeChronModel = getChronologyModelById(calendarConfig.chronologyModelId, language);
  const millennialPos = calculateMillennialPosition(
    sacredYear - activeChronModel.creationEpochBCE + 1,
    calendarConfig.chronologyModelId,
    calendarConfig.joshuaAdjustmentStatus === 'ACCEPTED' ? 1 : 0,
    language
  );
  const elapsedYears = millennialPos.elapsedSolarYears;
  const millenniumNumber = millennialPos.millenniumNumber;
  const millennialProgressPercent = Math.min(100, Math.max(0, (elapsedYears / 7000) * 100));
  const millennialSummaryLabel = isPt
    ? `Grande Semana: Ano ${elapsedYears} / 7.000 (${millenniumNumber}º Milênio)`
    : `Great Week: Year ${elapsedYears} / 7,000 (Millennium ${millenniumNumber})`;

  // 8. Daily Scriptural Verse
  const dailyPrayer = getDailyPrayerForSacredDay(
    sacredDay,
    calendarConfig.customMonthNames,
    language
  );

  return {
    alphaPercent: widgetConfig.alphaPercent,
    widgetTheme: widgetConfig.widgetTheme,
    widgetSize: widgetConfig.widgetSize,
    frostedBlur: widgetConfig.frostedBlur,
    goldBorder: widgetConfig.goldBorder,
    sacredYear,
    sacredYearLabel,
    sacredDateHeadline,
    sacredSubline,
    gregorianDateStr,
    isDayZero,
    dayOfWeek,
    timeFormatted,
    ampmSuffix,
    biblicalWatchLabel,
    lunarPhaseKey: lunarInfo.phaseName,
    lunarPhaseLocalized,
    lunarIlluminationPercent,
    lunarAgeDays,
    enochLunarParts,
    enochLunarPartsLabel,
    locationCity,
    coordinatesFormatted,
    sunriseStr,
    solarNoonStr,
    sunsetStr,
    isSabbathActive,
    sabbathStatusTitle,
    sabbathTargetDateLabel,
    sabbathSunsetLabel,
    sabbathCountdownStr,
    zodiacSymbol,
    zodiacName,
    zodiacArchetype,
    enochGateNumber,
    enochGateLabel,
    enochDayNightRatioLabel,
    nextFeastName,
    nextFeastDaysAway,
    nextFeastLabel,
    elapsedYears,
    millenniumNumber,
    millennialProgressPercent,
    millennialSummaryLabel,
    dailyVerseRef: dailyPrayer.scriptureRef,
    dailyVerseQuote: dailyPrayer.scriptureQuote,
  };
}

/**
 * Syncs the current widget configuration and live snapshot to the native Android APK
 * AppWidgetProvider (via AndroidBridge) if running inside the Android app.
 */
export function syncWidgetToAndroidBridge(
  snapshot: LiveAndroidWidgetSnapshot,
  widgetConfig: AndroidWidgetConfig
): boolean {
  if (typeof window !== 'undefined' && window.AndroidBridge?.syncHomeWidget) {
    try {
      const payload = JSON.stringify({
        ...snapshot,
        config: widgetConfig,
        updatedAtMillis: Date.now(),
      });
      return Boolean(window.AndroidBridge.syncHomeWidget(payload));
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Requests the Android Launcher (Android 8.0+ AppWidgetManager.requestPinAppWidget)
 * to pin the Dimenúveis Home Screen Widget directly onto the user's home screen.
 */
export function requestPinWidgetOnAndroid(
  snapshot: LiveAndroidWidgetSnapshot,
  widgetConfig: AndroidWidgetConfig
): { supported: boolean; pinnedOrUpdated: boolean } {
  if (typeof window !== 'undefined' && window.AndroidBridge?.requestPinHomeWidget) {
    try {
      const payload = JSON.stringify({
        ...snapshot,
        config: widgetConfig,
        updatedAtMillis: Date.now(),
      });
      const result = Boolean(window.AndroidBridge.requestPinHomeWidget(payload));
      return { supported: true, pinnedOrUpdated: result };
    } catch {
      return { supported: true, pinnedOrUpdated: false };
    }
  }
  return { supported: false, pinnedOrUpdated: false };
}
