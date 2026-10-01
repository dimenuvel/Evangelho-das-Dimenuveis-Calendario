/**
 * @file src/screens/AppointedTimesScreen.tsx
 * Book-like screen for "THE APPOINTED TIMES" (Feasts of the Sacred Year).
 * Chronological Spring & Autumn Appointed Times catalog with dynamic calculations.
 */

import React, { useState, useEffect } from 'react';
import { CalendarConfiguration } from '../types/calendar';
import { Language } from '../i18n/translations';
import { CalculatedFeastOccurrence } from '../types/feasts';
import { calculateFeastOccurrences } from '../calendar/feastEngine';
import { resolveSacredBirthday } from '../calendar/sacredCalendar';
import { getMonthDisplayTitle } from '../calendar/months';
import { getLunarPhaseInfo } from '../astronomy/moon';
import {
  loadStoredNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  markNotificationPromptDecided,
  sendBirthdayAlertPreview,
  NotificationSettings,
} from '../notifications/notificationService';
import { FeastDetailModal } from '../components/FeastDetailModal';
import { GoogleCalendarSyncModal } from '../components/GoogleCalendarSyncModal';
import { LunarPhaseIcon } from '../components/LunarPhaseIcon';
import { DataSourceBadge } from '../components/DataSourceBadge';
import { EditableYearControl } from '../components/EditableYearControl';
import { Calendar, Gift, Bell, CheckCircle2, MapPin } from 'lucide-react';

interface AppointedTimesScreenProps {
  systemDate: Date;
  config: CalendarConfiguration;
  onUpdateConfig: (partial: Partial<CalendarConfiguration>) => void;
  language: Language;
}

export const AppointedTimesScreen: React.FC<AppointedTimesScreenProps> = ({
  systemDate,
  config,
  onUpdateConfig,
  language,
}) => {
  const isPt = language === 'pt';
  const defaultSacredYear = systemDate.getFullYear() + 4024;
  const [selectedSacredYear, setSelectedSacredYear] = useState<number>(defaultSacredYear);
  const [selectedFeastModal, setSelectedFeastModal] = useState<CalculatedFeastOccurrence | null>(null);
  const [calendarSyncOccurrences, setCalendarSyncOccurrences] = useState<CalculatedFeastOccurrence[] | null>(null);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    loadStoredNotificationSettings()
  );

  useEffect(() => {
    const syncHandler = () => {
      setNotifSettings(loadStoredNotificationSettings());
    };
    window.addEventListener('dimenueveisNotificationSettingsChanged', syncHandler);
    return () => window.removeEventListener('dimenueveisNotificationSettingsChanged', syncHandler);
  }, []);

  const resolvedBirthday = config.userBirthdayGregorian
    ? resolveSacredBirthday(
        config.userBirthdayGregorian,
        config.lunarAnchorMode,
        selectedSacredYear
      )
    : null;

  const handleSetBirthday = async (dateISO: string) => {
    onUpdateConfig({ userBirthdayGregorian: dateISO || undefined });
    if (dateISO && /^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      markNotificationPromptDecided();
      await requestNotificationPermission();
      const current = loadStoredNotificationSettings();
      const updated: NotificationSettings = {
        ...current,
        enabled: true,
        birthdayAlert: true,
      };
      saveNotificationSettings(updated);
      setNotifSettings(updated);
      sendBirthdayAlertPreview(dateISO, config.lunarAnchorMode, language, true);
    }
  };

  const handleToggleBirthdayNotification = async () => {
    const current = loadStoredNotificationSettings();
    const nextBirthdayAlert = !current.birthdayAlert;
    if (nextBirthdayAlert) {
      markNotificationPromptDecided();
      await requestNotificationPermission();
    }
    const updated: NotificationSettings = {
      ...current,
      enabled: nextBirthdayAlert ? true : current.enabled,
      birthdayAlert: nextBirthdayAlert,
    };
    saveNotificationSettings(updated);
    setNotifSettings(updated);
    if (nextBirthdayAlert && config.userBirthdayGregorian) {
      sendBirthdayAlertPreview(config.userBirthdayGregorian, config.lunarAnchorMode, language, true);
    }
  };

  const handleAddBirthdayToGoogleCalendar = () => {
    if (!resolvedBirthday) return;
    const occDate = resolvedBirthday.targetYearDay.gregorianDate;
    const lunarAtBirth = getLunarPhaseInfo(occDate);
    const sacredLabel =
      resolvedBirthday.sacredMonth === 0
        ? isPt
          ? 'Dia Zero'
          : 'Day Zero'
        : `${isPt ? 'Mês' : 'Month'} ${resolvedBirthday.sacredMonth}, ${isPt ? 'Dia' : 'Day'} ${
            resolvedBirthday.sacredDayOfMonth
          }`;

    const birthdayOccurrence: CalculatedFeastOccurrence = {
      feast: {
        id: 'SACRED_BIRTHDAY' as any,
        name: isPt
          ? `Natalício no Calendário de 13 Meses (${sacredLabel})`
          : `13-Month Sacred Birthday (${sacredLabel})`,
        hebrewName: isPt ? 'Yom Huledet' : 'Yom Huledet',
        category: 'FEAST',
        sacredMonth: resolvedBirthday.sacredMonth || 1,
        sacredDay: resolvedBirthday.sacredDayOfMonth || 1,
        durationDays: 1,
        status: 'APPOINTED_TIME',
        description: isPt
          ? `Equivalente no Calendário Sagrado de 13 Meses para o nascimento gregoriano em ${resolvedBirthday.gregorianBirthISO}.`
          : `13-Month Sacred Calendar equivalent for Gregorian birth date ${resolvedBirthday.gregorianBirthISO}.`,
        beginsAt: 'SUNSET',
        endsAt: 'SUNSET',
        biblicalReferences: ['Salmos 90:12 / Psalm 90:12'],
      },
      sacredYear: selectedSacredYear,
      startSacredMonth: resolvedBirthday.sacredMonth || 1,
      startSacredDay: resolvedBirthday.sacredDayOfMonth || 1,
      endSacredMonth: resolvedBirthday.sacredMonth || 1,
      endSacredDay: resolvedBirthday.sacredDayOfMonth || 1,
      gregorianStartDate: occDate,
      gregorianEndDate: occDate,
      julianDayStartNumber: 0,
      julianDayEndNumber: 0,
      durationDays: 1,
      isUpcoming: occDate.getTime() > systemDate.getTime(),
      lunarPhaseAtStart: lunarAtBirth.phaseName,
      lunarIlluminationAtStart: lunarAtBirth.fraction,
      overlapsWeeklySabbath:
        resolvedBirthday.targetYearDay.kind === 'DAY_ZERO' ||
        resolvedBirthday.targetYearDay.isWeeklySabbath,
      isActiveToday: false,
      activeDayIndex: 1,
    };
    setCalendarSyncOccurrences([birthdayOccurrence]);
  };

  const activeLocation = config.userLocation || {
    latitude: 31.7683,
    longitude: 35.2137,
    cityName: 'Jerusalem (Default)',
  };
  const isSouthernHemisphere = activeLocation.latitude < 0;

  const feastOccurrences = calculateFeastOccurrences(
    selectedSacredYear,
    config.lunarAnchorMode,
    config.feastCalendarModel,
    systemDate,
    language,
    activeLocation
  );

  const springFeasts = feastOccurrences.filter((f) => f.seasonalGroup === 'SPRING');
  const autumnFeasts = feastOccurrences.filter((f) => f.seasonalGroup === 'AUTUMN');

  const translateCategory = (cat: string) => {
    if (!isPt) {
      const enMap: Record<string, string> = {
        FEAST: 'Feast',
        FAST: 'Fast',
        SABBATH: 'Sabbath',
        SOLEMN_ASSEMBLY: 'Solemn Assembly',
      };
      return enMap[cat] || cat;
    }
    const map: Record<string, string> = {
      FEAST: 'Festa',
      FAST: 'Jejum',
      SABBATH: 'Sábado',
      SOLEMN_ASSEMBLY: 'Assembleia Solene',
    };
    return map[cat] || cat;
  };

  const translateModel = (m: string) => {
    if (!isPt) {
      if (m === 'BIBLICAL_LUNAR') return 'Biblical Lunar';
      if (m === 'OBSERVATIONAL_LUNAR') return 'Observational';
      if (m === 'CONFIGURED_SACRED_MODEL') return '364-Day Cycle';
      return m;
    }
    if (m === 'BIBLICAL_LUNAR') return 'Lunar Bíblico';
    if (m === 'OBSERVATIONAL_LUNAR') return 'Observacional';
    if (m === 'CONFIGURED_SACRED_MODEL') return 'Ciclo 364 Dias';
    return m;
  };

  const translateAnchor = (a: string) => {
    if (!isPt) {
      if (a === 'CONJUNCTION') return 'Conjunction';
      if (a === 'VISIBLE_CRESCENT') return 'Crescent';
      if (a === 'OBSERVATIONAL') return 'Observational';
      return a;
    }
    if (a === 'CONJUNCTION') return 'Conjunção';
    if (a === 'VISIBLE_CRESCENT') return 'Crescente';
    if (a === 'OBSERVATIONAL') return 'Observacional';
    return a;
  };

  return (
    <div className="space-y-6">
      {/* Book Header & Control Strip */}
      <div className="border border-slate-800 bg-slate-950 divide-y divide-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <h2 className="text-lg sm:text-2xl font-serif font-bold text-slate-100 whitespace-nowrap">
              {isPt ? 'Os Tempos Nomeados (Moedim)' : 'The Appointed Times (Moedim)'}
            </h2>
            <p className="text-xs text-slate-300 font-serif italic mt-0.5 whitespace-nowrap">
              {isPt
                ? 'Solenidades de Levítico 23 · Ciclo Sagrado'
                : 'Solemnities of Leviticus 23 · Sacred Cycle'}
            </p>
          </div>
          <DataSourceBadge source="ASTRONOMICAL_CALCULATION" size="sm" language={language} />
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-slate-900/40 text-xs font-serif overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-300 min-w-0 leading-snug">
            <span>{isPt ? 'Modelo:' : 'Model:'} <strong className="text-amber-400">{translateModel(config.feastCalendarModel)}</strong></span>
            <span className="text-slate-500">·</span>
            <span>{isPt ? 'Âncora:' : 'Anchor:'} <strong className="text-blue-300">{translateAnchor(config.lunarAnchorMode)}</strong></span>
            <span className="text-slate-500">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <strong className="text-emerald-300">
                {activeLocation.cityName || 'Jerusalem (Default)'}
              </strong>
              <span className="text-slate-400 tabular-nums">
                ({activeLocation.latitude.toFixed(2)}°, {activeLocation.longitude.toFixed(2)}° ·{' '}
                {isSouthernHemisphere
                  ? isPt
                    ? 'Hemisfério Sul — Estações Invertidas'
                    : 'Southern Hemisphere — Inverted Seasons'
                  : isPt
                    ? 'Hemisfério Norte'
                    : 'Northern Hemisphere'}
                )
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setCalendarSyncOccurrences(feastOccurrences)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-serif font-bold transition-colors cursor-pointer shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{isPt ? 'Incluir no Google Agenda' : 'Add to Google Calendar'}</span>
            </button>

            <EditableYearControl
              year={selectedSacredYear}
              onChange={setSelectedSacredYear}
              defaultYear={defaultSacredYear}
              label={isPt ? 'Ano Sagrado' : 'Sacred Year'}
              size="sm"
              isPt={isPt}
            />
          </div>
        </div>
      </div>

      {/* SECTION I: SPRING APPOINTED TIMES */}
      <div className="border border-slate-800 bg-slate-950">
        <div className="px-4 sm:px-5 py-3 bg-slate-900/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-amber-400">
            I.{' '}
            {isSouthernHemisphere
              ? isPt
                ? 'Festas da Primavera Austral (Meses VII–IX · Set–Nov)'
                : 'Southern Spring Feasts (Months VII–IX · Sep–Nov)'
              : isPt
                ? 'Festas da Primavera Boreal (Meses I–III · Mar–Mai)'
                : 'Northern Spring Feasts (Months I–III · Mar–May)'}
          </h3>
          <span className="text-xs font-serif italic text-slate-300 whitespace-nowrap">
            {isPt ? 'Lev 23:4–22' : 'Lev 23:4–22'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {springFeasts.map((occ) => {
            const f = occ.feast;
            return (
              <div
                key={f.id}
                onClick={() => setSelectedFeastModal(occ)}
                className={`p-4 sm:p-5 cursor-pointer transition-colors flex flex-col justify-between space-y-4 ${
                  occ.isActiveToday
                    ? 'bg-amber-950/30 hover:bg-amber-950/40'
                    : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-semibold text-amber-400 tabular-nums whitespace-nowrap">
                      {isPt ? 'Mês' : 'Month'} {f.sacredMonth}, {isPt ? 'Dia' : 'Day'} {f.sacredDay}
                    </span>
                    <LunarPhaseIcon fraction={occ.lunarIlluminationAtStart} phaseName={occ.lunarPhaseAtStart as any} size={22} />
                  </div>

                  <div>
                    <h4 className="text-base font-serif font-bold text-slate-100 whitespace-nowrap">
                      {f.name}
                    </h4>
                    <p className="text-xs font-serif italic text-slate-300 whitespace-nowrap">
                      {f.hebrewName} · {translateCategory(f.category)}
                    </p>
                  </div>
                </div>

                <div className="text-xs font-serif text-slate-300 space-y-1.5 pt-2.5 border-t border-slate-800/80 tabular-nums">
                  <div className="flex justify-between whitespace-nowrap">
                    <span className="text-slate-400">{isPt ? 'Gregoriano:' : 'Gregorian:'}</span>
                    <span className="text-slate-100 font-semibold">{occ.gregorianStartDate.toISOString().split('T')[0]}</span>
                  </div>
                  {occ.localSunsetStart && (
                    <div className="flex justify-between whitespace-nowrap">
                      <span className="text-slate-400">{isPt ? 'Pôr do Sol GPS:' : 'GPS Sunset:'}</span>
                      <span className="text-amber-300 font-semibold">{occ.localSunsetStart}</span>
                    </div>
                  )}
                  <div className="flex justify-between whitespace-nowrap">
                    <span className="text-slate-400">{isPt ? 'Duração:' : 'Duration:'}</span>
                    <span className="text-slate-200">{f.durationDays} {isPt ? 'dia(s)' : 'day(s)'}</span>
                  </div>
                  <div className="flex justify-between whitespace-nowrap">
                    <span className="text-slate-400">{isPt ? 'Escritura:' : 'Scripture:'}</span>
                    <span className="text-emerald-400 italic">{f.biblicalReferences[0]}</span>
                  </div>

                  {occ.isActiveToday && (
                    <div className="pt-1 text-emerald-400 font-semibold whitespace-nowrap">
                      ● {isPt ? 'Ativo Agora' : 'Active Now'} ({occ.activeDayIndex}/{f.durationDays})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION II: AUTUMN APPOINTED TIMES */}
      <div className="border border-slate-800 bg-slate-950">
        <div className="px-4 sm:px-5 py-3 bg-slate-900/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-purple-300">
            II.{' '}
            {isSouthernHemisphere
              ? isPt
                ? 'Festas do Outono Austral (Mês I · Mar–Abr)'
                : 'Southern Autumn Feasts (Month I · Mar–Apr)'
              : isPt
                ? 'Festas do Outono Boreal (Mês VII · Set–Out)'
                : 'Northern Autumn Feasts (Month VII · Sep–Oct)'}
          </h3>
          <span className="text-xs font-serif italic text-slate-300 whitespace-nowrap">
            {isPt ? 'Lev 23:23–44' : 'Lev 23:23–44'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {autumnFeasts.map((occ) => {
            const f = occ.feast;
            const isSukkot = f.id === 'TABERNACLES';
            const isEighthDay = f.id === 'EIGHTH_DAY';

            return (
              <div
                key={f.id}
                onClick={() => setSelectedFeastModal(occ)}
                className={`p-4 sm:p-5 cursor-pointer transition-colors flex flex-col justify-between space-y-4 ${
                  occ.isActiveToday
                    ? 'bg-purple-950/30 hover:bg-purple-950/40'
                    : isSukkot
                    ? 'bg-amber-950/15 hover:bg-amber-950/25'
                    : isEighthDay
                    ? 'bg-purple-950/15 hover:bg-purple-950/25'
                    : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-semibold text-purple-300 tabular-nums whitespace-nowrap">
                      {isPt ? 'Mês' : 'Month'} {f.sacredMonth}, {isPt ? 'Dia' : 'Day'} {f.sacredDay}
                      {f.durationDays > 1 ? `–${f.sacredDay + f.durationDays - 1}` : ''}
                    </span>
                    <LunarPhaseIcon fraction={occ.lunarIlluminationAtStart} phaseName={occ.lunarPhaseAtStart as any} size={22} />
                  </div>

                  <div>
                    <h4 className="text-base font-serif font-bold text-slate-100 whitespace-nowrap">
                      {f.name}
                    </h4>
                    <p className="text-xs font-serif italic text-slate-300 whitespace-nowrap">
                      {f.hebrewName} · {translateCategory(f.category)}
                    </p>
                  </div>
                </div>

                <div className="text-xs font-serif text-slate-300 space-y-1.5 pt-2.5 border-t border-slate-800/80 tabular-nums">
                  <div className="flex justify-between whitespace-nowrap">
                    <span className="text-slate-400">{isPt ? 'Gregoriano:' : 'Gregorian:'}</span>
                    <span className="text-slate-100 font-semibold">{occ.gregorianStartDate.toISOString().split('T')[0]}</span>
                  </div>
                  {occ.localSunsetStart && (
                    <div className="flex justify-between whitespace-nowrap">
                      <span className="text-slate-400">{isPt ? 'Pôr do Sol GPS:' : 'GPS Sunset:'}</span>
                      <span className="text-purple-300 font-semibold">{occ.localSunsetStart}</span>
                    </div>
                  )}
                  <div className="flex justify-between whitespace-nowrap">
                    <span className="text-slate-400">{isPt ? 'Duração:' : 'Duration:'}</span>
                    <span className="text-slate-200">{f.durationDays} {isPt ? 'dia(s)' : 'day(s)'}</span>
                  </div>
                  <div className="flex justify-between whitespace-nowrap">
                    <span className="text-slate-400">{isPt ? 'Escritura:' : 'Scripture:'}</span>
                    <span className="text-emerald-400 italic">{f.biblicalReferences[0]}</span>
                  </div>

                  {isSukkot && (
                    <div className="pt-1 text-xs italic text-amber-400 whitespace-nowrap">
                      {isPt ? 'Dias 1 a 7 · Festa das Cabanas' : 'Days 1–7 · Feast of Booths'}
                    </div>
                  )}

                  {isEighthDay && (
                    <div className="pt-1 text-xs italic text-purple-300 whitespace-nowrap">
                      {isPt ? 'Dia 8 · Assembleia Solene' : 'Day 8 · Solemn Assembly'}
                    </div>
                  )}

                  {occ.isActiveToday && (
                    <div className="pt-1 text-emerald-400 font-semibold whitespace-nowrap">
                      ● {isPt ? 'Ativo Agora' : 'Active Now'} ({occ.activeDayIndex}/{f.durationDays})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION III: PERSONAL 13-MONTH SACRED BIRTHDAY & NOTIFICATION */}
      <div className="border border-amber-500/40 bg-slate-950 divide-y divide-slate-800">
        <div className="px-4 sm:px-5 py-3 bg-amber-950/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-amber-400">
              III.{' '}
              {isPt
                ? 'Seu Aniversário no Calendário de 13 Meses & Notificação'
                : 'Your Birthday in the 13-Month Calendar & Notification'}
            </h3>
          </div>
          <span className="text-xs font-serif italic text-slate-300">
            {isPt ? 'Salmos 90:12 · Conversão Natalícia' : 'Psalm 90:12 · Birthday Mapping'}
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4 font-serif">
          <p className="text-xs text-slate-300 leading-relaxed">
            {isPt
              ? 'Insira ou atualize sua data de nascimento no calendário gregoriano atual para descobrir seu dia exato no Calendário Sagrado de 13 Meses × 28 Dias e receber uma notificação anual.'
              : 'Enter or update your birth date in the current Gregorian calendar to discover your exact day in the 13-Month × 28-Day Sacred Calendar and receive an annual birthday notification.'}
          </p>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Date & Time Picker Control */}
            <div className="flex flex-wrap items-center gap-2.5">
              <label
                htmlFor="feasts-birthday-input"
                className="text-xs font-semibold text-slate-200 whitespace-nowrap"
              >
                {isPt ? 'Data de Nascimento (Gregoriano):' : 'Birth Date (Gregorian):'}
              </label>
              <input
                id="feasts-birthday-input"
                type="date"
                value={config.userBirthdayGregorian || ''}
                onChange={(e) => handleSetBirthday(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-amber-500/50 text-slate-100 text-xs font-serif tabular-nums focus:outline-none focus:border-amber-400"
              />
              <label
                htmlFor="feasts-birthtime-input"
                className="text-xs font-semibold text-slate-200 whitespace-nowrap"
              >
                {isPt ? 'Hora Exata (Mapa Astral):' : 'Exact Time (Astral Map):'}
              </label>
              <input
                id="feasts-birthtime-input"
                type="time"
                value={config.userBirthTime || '12:00'}
                onChange={(e) => onUpdateConfig({ userBirthTime: e.target.value || '12:00' })}
                className="px-2.5 py-1.5 bg-slate-900 border border-amber-500/50 text-slate-100 text-xs font-serif tabular-nums focus:outline-none focus:border-amber-400"
              />
              {config.userBirthdayGregorian && (
                <button
                  type="button"
                  onClick={() => handleSetBirthday('')}
                  className="px-2.5 py-1.5 border border-slate-700 bg-slate-950 hover:bg-slate-900 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {isPt ? 'Limpar' : 'Clear'}
                </button>
              )}
            </div>

            {/* Notification & Google Calendar Actions when Birthday is Set */}
            {resolvedBirthday && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleToggleBirthdayNotification}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 border font-semibold transition-colors cursor-pointer ${
                    notifSettings.enabled && notifSettings.birthdayAlert
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/50'
                  }`}
                >
                  {notifSettings.enabled && notifSettings.birthdayAlert ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        {isPt ? 'Notificação de Aniversário Ativa' : 'Birthday Notification Active'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        {isPt ? 'Ativar Notificação de Aniversário' : 'Enable Birthday Notification'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    config.userBirthdayGregorian &&
                    sendBirthdayAlertPreview(
                      config.userBirthdayGregorian,
                      config.lunarAnchorMode,
                      language,
                      true
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/50 bg-slate-950 hover:bg-slate-900 text-amber-300 transition-colors cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  <span>{isPt ? 'Testar Alerta' : 'Test Alert'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddBirthdayToGoogleCalendar}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{isPt ? 'Incluir no Google Agenda' : 'Add to Google Calendar'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Mapped 13-Month Sacred Birthday Readout Grid */}
          {resolvedBirthday && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-800 border border-slate-800 text-xs tabular-nums">
              <div className="bg-slate-900/60 p-3.5 space-y-1">
                <span className="text-slate-400 block">
                  {isPt
                    ? 'Equivalente no Calendário de 13 Meses'
                    : '13-Month Sacred Calendar Equivalent'}
                </span>
                <strong className="text-base text-amber-300 block">
                  {resolvedBirthday.sacredMonth === 0
                    ? isPt
                      ? 'Dia Zero (Sábado Anual)'
                      : 'Day Zero (Annual Sabbath)'
                    : `${getMonthDisplayTitle(
                        resolvedBirthday.sacredMonth,
                        config.customMonthNames,
                        language
                      )}, ${isPt ? 'Dia' : 'Day'} ${resolvedBirthday.sacredDayOfMonth}`}
                </strong>
                <span className="text-slate-400 italic block">
                  {resolvedBirthday.birthSacredDay.kind === 'NUMBERED_DAY'
                    ? isPt
                      ? `Dia ${resolvedBirthday.birthSacredDay.dayOfYear} de 364 · ${
                          resolvedBirthday.birthSacredDay.isWeeklySabbath
                            ? 'Sábado Semanal'
                            : `${resolvedBirthday.birthSacredDay.dayOfWeek}º Dia da Semana`
                        }`
                      : `Day ${resolvedBirthday.birthSacredDay.dayOfYear} of 364 · ${
                          resolvedBirthday.birthSacredDay.isWeeklySabbath
                            ? 'Weekly Sabbath'
                            : `Day ${resolvedBirthday.birthSacredDay.dayOfWeek} of Week`
                        }`
                    : isPt
                      ? 'Limiar Anual Fora dos 364 Dias'
                      : 'Annual Threshold Outside the 364 Days'}
                </span>
              </div>

              <div className="bg-slate-900/60 p-3.5 space-y-1">
                <span className="text-slate-400 block">
                  {isPt
                    ? `Data Gregoriana no Ano Sagrado ${selectedSacredYear}`
                    : `Gregorian Date in Sacred Year ${selectedSacredYear}`}
                </span>
                <strong className="text-base text-slate-100 block">
                  {resolvedBirthday.targetYearDay.gregorianDate.toISOString().split('T')[0]}
                </strong>
                <span className="text-emerald-400 italic block">
                  {isPt
                    ? `Ano Sagrado de Nascimento: ${resolvedBirthday.birthSacredDay.calendarYear}`
                    : `Birth Sacred Year: ${resolvedBirthday.birthSacredDay.calendarYear}`}
                </span>
              </div>

              <div className="bg-slate-900/60 p-3.5 space-y-1">
                <span className="text-slate-400 block">
                  {isPt
                    ? `Ciclos Sagrados Completos (${selectedSacredYear})`
                    : `Completed Sacred Cycles (${selectedSacredYear})`}
                </span>
                <strong className="text-base text-purple-300 block">
                  {resolvedBirthday.sacredAgeInTargetYear}{' '}
                  {isPt ? 'anos sagrados' : 'sacred years'}
                </strong>
                <span className="text-slate-400 italic block">
                  {isPt
                    ? `Nascimento Gregoriano: ${resolvedBirthday.gregorianBirthISO}`
                    : `Gregorian Birth: ${resolvedBirthday.gregorianBirthISO}`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Popover Modal */}
      <FeastDetailModal
        occurrence={selectedFeastModal}
        onClose={() => setSelectedFeastModal(null)}
        language={language}
        onAddToGoogleCalendar={(occ) => {
          setSelectedFeastModal(null);
          setCalendarSyncOccurrences([occ]);
        }}
      />

      {/* Google Calendar Sync & Confirmation Modal */}
      <GoogleCalendarSyncModal
        isOpen={Boolean(calendarSyncOccurrences && calendarSyncOccurrences.length > 0)}
        onClose={() => setCalendarSyncOccurrences(null)}
        occurrences={calendarSyncOccurrences || []}
        sacredYear={selectedSacredYear}
        language={language}
      />
    </div>
  );
};
