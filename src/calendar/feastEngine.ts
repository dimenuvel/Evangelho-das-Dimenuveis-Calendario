/**
 * @file src/calendar/feastEngine.ts
 * Engine for calculating Biblical Appointed Times, Gregorian/Julian conversions,
 * multi-day feast spans, Sabbath/Feast overlaps, active/upcoming status,
 * and GPS Hemisphere Seasonal Inversion (Northern vs. Southern Hemisphere, defaulting to Jerusalem).
 */

import { CalendarDay, FeastCalendarModel, LunarAnchorMode } from '../types/calendar';
import {
  CalculatedFeastOccurrence,
  DoubleObservanceInfo,
  DayObservance,
} from '../types/feasts';
import { getLocalizedBiblicalFeasts } from '../data/biblicalFeasts';
import { sacredDateToSolarDate } from './sacredCalendar';
import { getLunarPhaseInfo } from '../astronomy/moon';
import { getSunTimes } from '../astronomy/sun';
import { Language } from '../i18n/translations';

export interface FeastObserverLocation {
  latitude: number;
  longitude: number;
  cityName?: string;
}

export const DEFAULT_JERUSALEM_LOCATION: FeastObserverLocation = {
  latitude: 31.7683,
  longitude: 35.2137,
  cityName: 'Jerusalem (Default)',
};

export function resolveObserverLocation(
  userLocation?: FeastObserverLocation | null
): FeastObserverLocation {
  if (
    userLocation &&
    typeof userLocation.latitude === 'number' &&
    !Number.isNaN(userLocation.latitude) &&
    typeof userLocation.longitude === 'number' &&
    !Number.isNaN(userLocation.longitude)
  ) {
    return {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      cityName: userLocation.cityName || 'GPS Coordinates',
    };
  }
  return DEFAULT_JERUSALEM_LOCATION;
}

/**
 * Calculates Julian Day Number from a JavaScript Date object.
 */
export function getJulianDayNumber(date: Date): number {
  const time = date.getTime();
  return time / 86400000 + 2440587.5;
}

/**
 * Calculates all primary Biblical feast occurrences for a given Sacred Year,
 * dynamically adapting to the user's GPS coordinates (or Default Jerusalem):
 * - Northern Hemisphere (latitude >= 0): Spring Feasts in Months I–III, Autumn Feasts in Month VII.
 * - Southern Hemisphere (latitude < 0): Seasons invert by 6 Sacred Months —
 *   Spring Feasts occur in Southern Spring (Months VII–IX) and Autumn Feasts occur in Southern Autumn (Month I).
 * - Local sunset start times and lunar illumination are computed for the observer's exact (latitude, longitude).
 */
export function calculateFeastOccurrences(
  sacredYear: number,
  lunarAnchorMode: LunarAnchorMode = 'CONJUNCTION',
  feastModel: FeastCalendarModel = 'BIBLICAL_LUNAR',
  currentDate: Date = new Date(),
  language: Language = 'en',
  userLocation?: FeastObserverLocation | null
): CalculatedFeastOccurrence[] {
  const loc = resolveObserverLocation(userLocation);
  const isSouthernHemisphere = loc.latitude < 0;
  const hemisphere: 'NORTHERN' | 'SOUTHERN' = isSouthernHemisphere ? 'SOUTHERN' : 'NORTHERN';

  const feasts = getLocalizedBiblicalFeasts(language);
  return feasts.map((baseFeast) => {
    const isSpringCycleFeast = baseFeast.sacredMonth <= 3;
    const seasonalGroup: 'SPRING' | 'AUTUMN' = isSpringCycleFeast ? 'SPRING' : 'AUTUMN';

    // Apply Hemisphere Seasonal Inversion when observer is in the Southern Hemisphere (latitude < 0):
    // Northern Months 1 & 3 (Spring) <-> Southern Months 7 & 9 (Southern Spring)
    // Northern Month 7 (Autumn) <-> Southern Month 1 (Southern Autumn)
    let adjustedStartMonth = baseFeast.sacredMonth;
    if (isSouthernHemisphere) {
      if (baseFeast.sacredMonth <= 3) {
        adjustedStartMonth = baseFeast.sacredMonth + 6; // Month 1 -> Month 7, Month 3 -> Month 9
      } else if (baseFeast.sacredMonth === 7) {
        adjustedStartMonth = 1; // Month 7 -> Month 1
      }
    }

    const feast = {
      ...baseFeast,
      sacredMonth: adjustedStartMonth,
    };

    const startMonth = feast.sacredMonth;
    const startDay = feast.sacredDay;

    let endMonth = startMonth;
    let endDay = startDay + feast.durationDays - 1;

    // Handle month wrap-around if duration spills into next month
    if (endDay > 28) {
      endMonth = startMonth + Math.floor((endDay - 1) / 28);
      endDay = ((endDay - 1) % 28) + 1;
    }

    // 2. Convert sacred date to Gregorian Date and apply observer GPS coordinates for local Sunset
    const gregorianStartDate = sacredDateToSolarDate(
      sacredYear,
      startMonth,
      startDay,
      lunarAnchorMode
    );
    const gregorianEndDate = sacredDateToSolarDate(sacredYear, endMonth, endDay, lunarAnchorMode);

    // Compute local sunset on the eve of the feast at the user's GPS coordinates (or Default Jerusalem)
    const eveNoon = new Date(
      gregorianStartDate.getFullYear(),
      gregorianStartDate.getMonth(),
      gregorianStartDate.getDate() - 1,
      12,
      0,
      0
    );
    const localSunsetDate = getSunTimes(eveNoon, loc.latitude, loc.longitude).sunset;
    const localSunsetStart = localSunsetDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Add end-of-day offset to end date
    gregorianEndDate.setHours(23, 59, 59, 999);

    // 3. Julian Day Numbers
    const julianDayStartNumber = Math.floor(getJulianDayNumber(gregorianStartDate));
    const julianDayEndNumber = Math.floor(getJulianDayNumber(gregorianEndDate));

    // 4. Lunar Phase Context at Start (evaluated at local sunset)
    const lunarInfoStart = getLunarPhaseInfo(localSunsetDate);

    // 5. Active & Upcoming Status Calculation
    const curTime = currentDate.getTime();
    const startTime = gregorianStartDate.getTime();
    const endTime = gregorianEndDate.getTime();

    const isActiveToday = curTime >= startTime && curTime <= endTime;

    let activeDayIndex: number | undefined;
    if (isActiveToday) {
      const msDiff = curTime - startTime;
      activeDayIndex = Math.floor(msDiff / (86400 * 1000)) + 1;
      if (activeDayIndex < 1) activeDayIndex = 1;
      if (activeDayIndex > feast.durationDays) activeDayIndex = feast.durationDays;
    }

    const isUpcoming = curTime < startTime;
    let daysUntilStart: number | undefined;
    if (isUpcoming) {
      daysUntilStart = Math.ceil((startTime - curTime) / (86400 * 1000));
    }

    return {
      feast,
      sacredYear,
      startSacredMonth: startMonth,
      startSacredDay: startDay,
      endSacredMonth: endMonth,
      endSacredDay: endDay,
      gregorianStartDate,
      gregorianEndDate,
      julianDayStartNumber,
      julianDayEndNumber,
      durationDays: feast.durationDays,
      isActiveToday,
      activeDayIndex,
      isUpcoming,
      daysUntilStart,
      lunarPhaseAtStart: lunarInfoStart.phaseName,
      lunarIlluminationAtStart: lunarInfoStart.fraction,
      hemisphere,
      seasonalGroup,
      localSunsetStart,
      observerCityName: loc.cityName,
      observerLatitude: loc.latitude,
      observerLongitude: loc.longitude,
    };
  });
}

// Cache yearly feast occurrences by (sacredYear, lunarAnchorMode, feastModel, language, lat, lon) for fast 364-day grid lookups
const yearlyFeastLookupCache = new Map<string, CalculatedFeastOccurrence[]>();

/**
 * Checks if a specific day falls within any active feast occurrence for the observer's GPS coordinates.
 */
export function getFeastOccurrenceForDay(
  day: CalendarDay,
  lunarAnchorMode: LunarAnchorMode = 'CONJUNCTION',
  feastModel: FeastCalendarModel = 'BIBLICAL_LUNAR',
  language: Language = 'en',
  userLocation?: FeastObserverLocation | null
): { occurrence: CalculatedFeastOccurrence; dayIndexInFeast: number } | null {
  if (day.kind === 'DAY_ZERO') return null;

  const loc = resolveObserverLocation(userLocation);
  const latKey = loc.latitude.toFixed(2);
  const lonKey = loc.longitude.toFixed(2);

  const month = (day as any).month;
  const dayOfMonth = (day as any).dayOfMonth;

  const cacheKey = `${day.calendarYear}:${lunarAnchorMode}:${feastModel}:${language}:${latKey}:${lonKey}`;
  let occurrences = yearlyFeastLookupCache.get(cacheKey);
  if (!occurrences) {
    occurrences = calculateFeastOccurrences(
      day.calendarYear,
      lunarAnchorMode,
      feastModel,
      day.gregorianDate,
      language,
      loc
    );
    yearlyFeastLookupCache.set(cacheKey, occurrences);
  }

  for (const occ of occurrences) {
    // Check single-month span
    if (occ.startSacredMonth === occ.endSacredMonth) {
      if (
        month === occ.startSacredMonth &&
        dayOfMonth >= occ.startSacredDay &&
        dayOfMonth <= occ.endSacredDay
      ) {
        const dayIndexInFeast = dayOfMonth - occ.startSacredDay + 1;
        return { occurrence: occ, dayIndexInFeast };
      }
    } else {
      // Multi-month span
      if (
        (month === occ.startSacredMonth && dayOfMonth >= occ.startSacredDay) ||
        (month === occ.endSacredMonth && dayOfMonth <= occ.endSacredDay)
      ) {
        let dayIndexInFeast = 1;
        if (month === occ.startSacredMonth) {
          dayIndexInFeast = dayOfMonth - occ.startSacredDay + 1;
        } else {
          dayIndexInFeast = 28 - occ.startSacredDay + 1 + dayOfMonth;
        }
        return { occurrence: occ, dayIndexInFeast };
      }
    }
  }

  return null;
}

/**
 * Returns complete double-observance info for a given day (Weekly Sabbath + Feast Day).
 */
export function getObservancesForDay(
  day: CalendarDay,
  lunarAnchorMode: LunarAnchorMode = 'CONJUNCTION',
  feastModel: FeastCalendarModel = 'BIBLICAL_LUNAR',
  language: Language = 'en',
  userLocation?: FeastObserverLocation | null
): DoubleObservanceInfo {
  const observances: DayObservance[] = [];

  // Check 1: Day Zero vs Weekly Sabbath
  if (day.kind === 'DAY_ZERO') {
    observances.push({
      type: 'ANNUAL_SABBATH',
      label: language === 'pt' ? 'SÁBADO DO ANO NOVO ANUAL' : 'ANNUAL NEW YEAR SABBATH',
    });
    if (day.sabbathType === 'BOTH') {
      observances.push({
        type: 'WEEKLY_SABBATH',
        label: language === 'pt' ? 'SÁBADO SEMANAL (7º Dia)' : 'WEEKLY SABBATH (7th Day)',
      });
    }
    return {
      isDoubleObservance: observances.length > 1,
      observances,
    };
  }

  // Check 2: Weekly Sabbath
  if (day.isWeeklySabbath) {
    observances.push({
      type: 'WEEKLY_SABBATH',
      label: language === 'pt' ? 'SÁBADO SEMANAL (7º Dia)' : 'WEEKLY SABBATH (7th Day)',
    });
  }

  // Check 3: Biblical Feast Occurrence (GPS / Hemisphere aware)
  const feastMatch = getFeastOccurrenceForDay(
    day,
    lunarAnchorMode,
    feastModel,
    language,
    userLocation
  );
  if (feastMatch) {
    const { occurrence, dayIndexInFeast } = feastMatch;
    const f = occurrence.feast;

    let obsType: DayObservance['type'] = 'FEAST_DAY';
    if (f.category === 'SOLEMN_ASSEMBLY') obsType = 'SOLEMN_ASSEMBLY';
    if (f.category === 'FAST') obsType = 'FAST_DAY';

    const dayWord = language === 'pt' ? 'Dia' : 'Day';
    const ofWord = language === 'pt' ? 'de' : 'of';
    const dayText =
      f.durationDays > 1 ? ` (${dayWord} ${dayIndexInFeast} ${ofWord} ${f.durationDays})` : '';

    observances.push({
      type: obsType,
      label: `${f.name}${dayText}`,
      feastId: f.id,
      feastName: f.name,
      dayOfFeast:
        f.durationDays > 1 ? `${dayWord} ${dayIndexInFeast} ${ofWord} ${f.durationDays}` : undefined,
    });
  }

  return {
    isDoubleObservance: observances.length > 1,
    observances,
  };
}

/**
 * Gets currently active feast OR next upcoming feast with countdown info for TODAY dashboard.
 */
export function getCurrentOrNextFeast(
  currentDate: Date = new Date(),
  lunarAnchorMode: LunarAnchorMode = 'CONJUNCTION',
  feastModel: FeastCalendarModel = 'BIBLICAL_LUNAR',
  language: Language = 'en',
  userLocation?: FeastObserverLocation | null
): { activeFeast: CalculatedFeastOccurrence | null; nextFeast: CalculatedFeastOccurrence | null } {
  const sacredYear = currentDate.getFullYear() + 4024;
  const occurrences = calculateFeastOccurrences(
    sacredYear,
    lunarAnchorMode,
    feastModel,
    currentDate,
    language,
    userLocation
  );

  const activeFeast = occurrences.find((o) => o.isActiveToday) || null;

  let upcoming = occurrences
    .filter((o) => o.isUpcoming)
    .sort((a, b) => a.gregorianStartDate.getTime() - b.gregorianStartDate.getTime());

  if (upcoming.length === 0) {
    const nextYearOccurrences = calculateFeastOccurrences(
      sacredYear + 1,
      lunarAnchorMode,
      feastModel,
      currentDate,
      language,
      userLocation
    );
    upcoming = nextYearOccurrences
      .filter((o) => o.isUpcoming)
      .sort((a, b) => a.gregorianStartDate.getTime() - b.gregorianStartDate.getTime());
  }

  const nextFeast = upcoming.length > 0 ? upcoming[0] : null;

  return {
    activeFeast,
    nextFeast,
  };
}
