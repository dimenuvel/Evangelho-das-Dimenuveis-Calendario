/**
 * @file src/settings/config.ts
 * Central calendar configuration and persistence manager.
 */

import { CalendarConfiguration } from '../types/calendar';

export const DEFAULT_CALENDAR_CONFIG: CalendarConfiguration = {
  monthsPerYear: 13,
  daysPerMonth: 28,
  numberedDaysPerYear: 364,
  annualDayZero: true,
  lunarAnchorMode: 'CONJUNCTION',
  feastCalendarModel: 'BIBLICAL_LUNAR',
  chronologyModelId: 'astronomical-sacred',
  joshuaAdjustmentStatus: 'PROPOSED',
  customMonthNames: [
    'Month I', 'Month II', 'Month III', 'Month IV', 'Month V', 'Month VI', 'Month VII',
    'Month VIII', 'Month IX', 'Month X', 'Month XI', 'Month XII', 'Month XIII'
  ],
  userLocation: {
    latitude: 31.7683,
    longitude: 35.2137,
    cityName: 'Jerusalem (Default)',
  },
};

const STORAGE_KEY = 'dimenueveis_calendar_config_v1';
const MODEL_MIGRATION_KEY = 'dimenueveis_model_migrated_v24';

export function loadStoredConfiguration(): CalendarConfiguration {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed.chronologyModelId === 'ussher' &&
        localStorage.getItem(MODEL_MIGRATION_KEY) !== 'true'
      ) {
        parsed.chronologyModelId = 'astronomical-sacred';
        localStorage.setItem(MODEL_MIGRATION_KEY, 'true');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_CALENDAR_CONFIG, ...parsed }));
      }
      return { ...DEFAULT_CALENDAR_CONFIG, ...parsed };
    }
    localStorage.setItem(MODEL_MIGRATION_KEY, 'true');
  } catch (e) {
    console.warn('Failed to load configuration from localStorage, using default:', e);
  }
  return DEFAULT_CALENDAR_CONFIG;
}

export function saveConfiguration(config: CalendarConfiguration): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save configuration to localStorage:', e);
  }
}
