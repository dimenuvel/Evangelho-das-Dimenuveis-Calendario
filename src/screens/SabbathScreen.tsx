/**
 * @file src/screens/SabbathScreen.tsx
 * Book-like Unbroken 7-Day Weekly Sabbath & Annual Sabbath Ledger, Proof, Schedule,
 * and Real-Time GPS Sunset Countdown Timer until the Next Sabbath begins.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CalendarConfiguration, CalendarDay } from '../types/calendar';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { generateSacredYearDays, solarDateToSacredDate } from '../calendar/sacredCalendar';
import { getSabbathBadgeLabel } from '../calendar/sabbath';
import { getMonthDisplayTitle } from '../calendar/months';
import { getSunTimes } from '../astronomy/sun';
import { Sunset, MapPin, Clock, Sparkles } from 'lucide-react';

interface SabbathScreenProps {
  systemDate: Date;
  config: CalendarConfiguration;
  language: Language;
}

interface SabbathWindow {
  day: CalendarDay;
  startSunset: Date;
  endSunset: Date;
  eveDateISO: string;
  sabbathDateISO: string;
}

function getLocalNoonForGregorianDate(gregDate: Date, dayOffset = 0): Date {
  const y = gregDate.getUTCFullYear();
  const m = gregDate.getUTCMonth();
  const d = gregDate.getUTCDate();
  return new Date(y, m, d + dayOffset, 12, 0, 0);
}

function formatDateYMDLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const SabbathScreen: React.FC<SabbathScreenProps> = ({ systemDate, config, language }) => {
  const t = TRANSLATIONS[language];
  const isPt = language === 'pt';

  // Live ticking clock updated every second for real-time countdown
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const latitude = config.userLocation?.latitude ?? 31.7683;
  const longitude = config.userLocation?.longitude ?? 35.2137;
  const rawCity = config.userLocation?.cityName || '';
  const displayCity =
    !rawCity || rawCity === 'Jerusalem (Default)'
      ? isPt
        ? 'Jerusalém (Padrão)'
        : 'Jerusalem (Default)'
      : rawCity;

  const currentSacredDay = useMemo(
    () => solarDateToSacredDate(systemDate, config.lunarAnchorMode),
    [systemDate, config.lunarAnchorMode]
  );
  const currentSacredYear = currentSacredDay.calendarYear;

  const sabbathDays = useMemo(() => {
    const days = generateSacredYearDays(currentSacredYear, config.lunarAnchorMode);
    return days.filter(
      (d) => d.kind === 'DAY_ZERO' || (d.kind === 'NUMBERED_DAY' && d.isWeeklySabbath)
    );
  }, [currentSacredYear, config.lunarAnchorMode]);

  // Compute GPS sunset windows for current and next sacred year so we always find the next Sabbath
  const { activeSabbathWindow, nextSabbathWindow } = useMemo(() => {
    const nextYearDays = generateSacredYearDays(currentSacredYear + 1, config.lunarAnchorMode).filter(
      (d) => d.kind === 'DAY_ZERO' || (d.kind === 'NUMBERED_DAY' && d.isWeeklySabbath)
    );
    const allCandidateSabbaths = [...sabbathDays, ...nextYearDays];

    const windows: SabbathWindow[] = allCandidateSabbaths.map((sabbathDay) => {
      // In biblical evening-to-evening reckoning, the Sabbath begins at GPS sunset on the eve
      // (the solar day preceding the Sabbath date) and ends at GPS sunset on the Sabbath date.
      const eveNoon = getLocalNoonForGregorianDate(sabbathDay.gregorianDate, -1);
      const sabbathNoon = getLocalNoonForGregorianDate(sabbathDay.gregorianDate, 0);

      const startSunset = getSunTimes(eveNoon, latitude, longitude).sunset;
      const endSunset = getSunTimes(sabbathNoon, latitude, longitude).sunset;

      return {
        day: sabbathDay,
        startSunset,
        endSunset,
        eveDateISO: formatDateYMDLocal(eveNoon),
        sabbathDateISO: formatDateYMDLocal(sabbathNoon),
      };
    });

    const nowMs = now.getTime();
    const active =
      windows.find((w) => nowMs >= w.startSunset.getTime() && nowMs < w.endSunset.getTime()) ||
      null;
    const next = windows.find((w) => w.startSunset.getTime() > nowMs) || windows[0];

    return {
      activeSabbathWindow: active,
      nextSabbathWindow: next,
    };
  }, [sabbathDays, currentSacredYear, config.lunarAnchorMode, latitude, longitude, now]);

  // Calculate remaining days, hours, minutes, seconds until the next Sabbath begins at GPS sunset
  const diffMs = Math.max(0, nextSabbathWindow.startSunset.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const countdownDays = Math.floor(totalSeconds / 86400);
  const countdownHours = Math.floor((totalSeconds % 86400) / 3600);
  const countdownMinutes = Math.floor((totalSeconds % 3600) / 60);
  const countdownSeconds = totalSeconds % 60;

  const formatSabbathTitle = (d: CalendarDay) => {
    if (d.kind === 'DAY_ZERO') {
      return isPt ? 'Dia Zero (Limiar do Ano Sagrado)' : 'Day Zero (Sacred Year Threshold)';
    }
    const monthTitle = getMonthDisplayTitle(d.month, config.customMonthNames, language);
    return `${monthTitle}, ${isPt ? 'Dia' : 'Day'} ${d.dayOfMonth}`;
  };

  const nextSabbathBadge = getSabbathBadgeLabel(nextSabbathWindow.day.sabbathType, language);
  const nextSunsetTimeFormatted = nextSabbathWindow.startSunset.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const nextEndSunsetTimeFormatted = nextSabbathWindow.endSunset.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* GPS SUNSET COUNTDOWN TO THE NEXT SABBATH                           */}
      {/* ================================================================== */}
      <div className="border border-amber-500/50 bg-slate-950 divide-y divide-slate-800 shadow-[0_0_25px_rgba(245,158,11,0.08)]">
        {/* Top Epigraph Header */}
        <div className="px-4 sm:px-5 py-3 bg-amber-950/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-serif uppercase tracking-wider text-amber-400 font-semibold">
            <Sunset className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isPt
                ? 'Contagem Regressiva para o Próximo Sábado (Pôr do Sol GPS)'
                : 'Countdown to Next Sabbath (GPS Sunset)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-serif text-slate-300 tabular-nums">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-slate-100">{displayCity}</span>
            <span className="text-slate-500 hidden sm:inline">
              ({latitude.toFixed(2)}°, {longitude.toFixed(2)}°)
            </span>
          </div>
        </div>

        {/* Active Sabbath Banner (if currently inside a Sabbath sunset-to-sunset window) */}
        {activeSabbathWindow && (
          <div className="px-4 sm:px-5 py-3 bg-emerald-950/30 border-b border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-xs font-serif">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isPt ? 'Sábado Sagrado em Curso Agora:' : 'Sacred Sabbath Currently Active:'}{' '}
                <strong className="text-slate-100">
                  {formatSabbathTitle(activeSabbathWindow.day)}
                </strong>
              </span>
            </div>
            <span className="text-emerald-200 italic tabular-nums">
              {isPt ? 'Término ao Pôr do Sol:' : 'Ends at Sunset:'}{' '}
              {activeSabbathWindow.endSunset.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ({activeSabbathWindow.sabbathDateISO})
            </span>
          </div>
        )}

        {/* Main Countdown Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left 7 Cols: Live 4-Unit Digital Almanac Countdown */}
          <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-serif">
                <span className="text-slate-300 uppercase tracking-wider">
                  {isPt ? 'Próximo Sábado:' : 'Next Sabbath:'}
                </span>
                <span className={`font-bold uppercase tracking-wider ${nextSabbathBadge.textClass}`}>
                  {nextSabbathBadge.text}
                </span>
                {nextSabbathWindow.day.kind === 'NUMBERED_DAY' && (
                  <>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300 italic tabular-nums">
                      {isPt
                        ? `Semana ${nextSabbathWindow.day.weekOfYear} de 52`
                        : `Week ${nextSabbathWindow.day.weekOfYear} of 52`}
                    </span>
                  </>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-100 tabular-nums">
                {formatSabbathTitle(nextSabbathWindow.day)}
              </h3>
            </div>

            {/* 4-Column Countdown Digits (Days, Hours, Minutes, Seconds) */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[
                {
                  value: String(countdownDays).padStart(2, '0'),
                  label: isPt ? 'Dias' : 'Days',
                },
                {
                  value: String(countdownHours).padStart(2, '0'),
                  label: isPt ? 'Horas' : 'Hours',
                },
                {
                  value: String(countdownMinutes).padStart(2, '0'),
                  label: isPt ? 'Minutos' : 'Minutes',
                },
                {
                  value: String(countdownSeconds).padStart(2, '0'),
                  label: isPt ? 'Segundos' : 'Seconds',
                },
              ].map((unit, idx) => (
                <div
                  key={idx}
                  className="border border-amber-500/40 bg-slate-900/80 p-2.5 sm:p-3.5 text-center space-y-1"
                >
                  <div className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-amber-400 tabular-nums leading-none">
                    {unit.value}
                  </div>
                  <div className="text-[10px] sm:text-xs font-serif uppercase tracking-wider text-slate-300">
                    {unit.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 5 Cols: GPS Sunset Astronomical Details */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-900/30 flex flex-col justify-between space-y-3 text-xs font-serif">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isPt ? 'Cálculo Solar Astronómico (GPS)' : 'Astronomical Solar Calculation (GPS)'}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {isPt
                  ? 'Segundo a ordem bíblica (Levítico 23:32), o Sábado inicia exatamente ao Pôr do Sol da véspera (6º Dia) na sua coordenada geográfica.'
                  : 'According to the biblical order (Leviticus 23:32), the Sabbath begins at the exact GPS Sunset on the eve (6th Day) at your geographic coordinates.'}
              </p>
            </div>

            <div className="border border-slate-800 bg-slate-950 divide-y divide-slate-800 tabular-nums">
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-400">
                  {isPt ? 'Início (Pôr do Sol da Véspera):' : 'Begins (Eve Sunset):'}
                </span>
                <strong className="text-amber-300">
                  {nextSabbathWindow.eveDateISO} · {nextSunsetTimeFormatted}
                </strong>
              </div>
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-400">
                  {isPt ? 'Término (Pôr do Sol Sabático):' : 'Ends (Sabbath Sunset):'}
                </span>
                <strong className="text-slate-200">
                  {nextSabbathWindow.sabbathDateISO} · {nextEndSunsetTimeFormatted}
                </strong>
              </div>
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-400">
                  {isPt ? 'Hora Local Atual:' : 'Current Local Time:'}
                </span>
                <span className="text-slate-300">
                  {now.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Book Header & Taxonomy Matrix */}
      <div className="border border-slate-800 bg-slate-950 divide-y divide-slate-800">
        <div className="p-4 sm:p-5 space-y-1.5 bg-slate-900/60">
          <div className="text-xs font-serif text-amber-400 uppercase tracking-wider font-semibold whitespace-nowrap">
            {isPt ? 'Cadência Sabática · Ordem de 13×28' : 'Sabbath Cadence · 13×28 Order'}
          </div>
          <h2 className="text-lg sm:text-2xl font-serif font-bold text-slate-100 whitespace-nowrap">
            {t.sabbath.heroTitle}
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            {t.sabbath.description}
          </p>
        </div>

        {/* 3-Column Sabbath Classification Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-xs">
          <div className="p-4 sm:p-5 space-y-1.5">
            <span className="font-serif font-bold text-amber-400 uppercase block text-xs tracking-wider whitespace-nowrap">
              I. {t.sabbath.weeklySabbathLabel}
            </span>
            <p className="text-slate-300 leading-relaxed">{t.sabbath.weeklySabbathDesc}</p>
          </div>
          <div className="p-4 sm:p-5 space-y-1.5">
            <span className="font-serif font-bold text-purple-300 uppercase block text-xs tracking-wider whitespace-nowrap">
              II. {t.sabbath.annualSabbathLabel}
            </span>
            <p className="text-slate-300 leading-relaxed">{t.sabbath.annualSabbathDesc}</p>
          </div>
          <div className="p-4 sm:p-5 space-y-1.5">
            <span className="font-serif font-bold text-emerald-400 uppercase block text-xs tracking-wider whitespace-nowrap">
              III. {t.sabbath.grandSabbathLabel}
            </span>
            <p className="text-slate-300 leading-relaxed">{t.sabbath.grandSabbathDesc}</p>
          </div>
        </div>
      </div>

      {/* Unbroken Continuity Proof & Full Schedule Ledger */}
      <div className="border border-slate-800 bg-slate-950 divide-y divide-slate-800">
        <div className="p-4 sm:p-5 bg-slate-900/40 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-serif font-bold text-slate-100 whitespace-nowrap">
              {t.sabbath.continuityProofTitle} ({currentSacredYear})
            </h3>
            <span className="text-xs font-serif italic text-emerald-400 tabular-nums font-semibold whitespace-nowrap">
              {isPt
                ? `Total: ${sabbathDays.length} (1 Dia Zero + 52 Semanais)`
                : `Total: ${sabbathDays.length} (1 Day Zero + 52 Weekly)`}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t.sabbath.proofText}
          </p>
        </div>

        {/* Book Schedule Ledger */}
        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-800 font-serif text-xs tabular-nums">
          {sabbathDays.map((d, idx) => {
            const isZero = d.kind === 'DAY_ZERO';
            const badge = getSabbathBadgeLabel(d.sabbathType, language);
            const isNextUpcoming =
              nextSabbathWindow.day.calendarYear === d.calendarYear &&
              nextSabbathWindow.day.kind === d.kind &&
              (d.kind === 'DAY_ZERO' ||
                (nextSabbathWindow.day.kind === 'NUMBERED_DAY' &&
                  nextSabbathWindow.day.dayOfYear === d.dayOfYear));

            return (
              <div
                key={idx}
                className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-2 transition-colors ${
                  isNextUpcoming
                    ? 'bg-amber-500/15 ring-1 ring-inset ring-amber-400/60'
                    : isZero
                    ? 'bg-purple-950/20'
                    : 'hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 whitespace-nowrap">
                  <span className="w-6 text-slate-400 italic shrink-0">
                    {idx === 0 ? '0.' : `${idx}.`}
                  </span>
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="text-slate-100 font-semibold">
                      {isZero
                        ? `${isPt ? 'Dia Zero' : 'Day Zero'}`
                        : `${isPt ? 'Mês' : 'Month'} ${(d as any).month}, ${isPt ? 'Dia' : 'Day'} ${(d as any).dayOfMonth}`}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300 italic">
                      {d.gregorianDate.toISOString().split('T')[0]}
                    </span>
                    {isNextUpcoming && (
                      <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-bold text-[9.5px] uppercase tracking-wider">
                        {isPt ? 'Próximo' : 'Next'}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`text-[11px] sm:text-xs font-semibold shrink-0 whitespace-nowrap ${badge.textClass}`}>
                  {badge.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
