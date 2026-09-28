/**
 * @file src/components/SabbathIndicatorWidget.tsx
 * Persistent, small-footprint Sabbath Indicator widget for the top of TodayScreen.
 * Glows gold when the Sabbath is currently active (between eve sunset and Sabbath sunset)
 * and displays a live remaining-time countdown during the week. Clicking navigates to SabbathScreen.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CalendarConfiguration, CalendarDay } from '../types/calendar';
import { Language } from '../i18n/translations';
import { generateSacredYearDays, solarDateToSacredDate } from '../calendar/sacredCalendar';
import { getMonthDisplayTitle } from '../calendar/months';
import { getSunTimes } from '../astronomy/sun';
import { Sunset, Sparkles, ArrowRight } from 'lucide-react';

interface SabbathIndicatorWidgetProps {
  systemDate: Date;
  config: CalendarConfiguration;
  language: Language;
  onNavigateToSabbath: () => void;
}

interface SabbathWindow {
  day: CalendarDay;
  startSunset: Date;
  endSunset: Date;
}

function getLocalNoonForGregorianDate(gregDate: Date, dayOffset = 0): Date {
  const y = gregDate.getUTCFullYear();
  const m = gregDate.getUTCMonth();
  const d = gregDate.getUTCDate();
  return new Date(y, m, d + dayOffset, 12, 0, 0);
}

export const SabbathIndicatorWidget: React.FC<SabbathIndicatorWidgetProps> = ({
  systemDate,
  config,
  language,
  onNavigateToSabbath,
}) => {
  const isPt = language === 'pt';
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const latitude = config.userLocation?.latitude ?? 31.7683;
  const longitude = config.userLocation?.longitude ?? 35.2137;

  const currentSacredDay = useMemo(
    () => solarDateToSacredDate(systemDate, config.lunarAnchorMode),
    [systemDate, config.lunarAnchorMode]
  );
  const currentSacredYear = currentSacredDay.calendarYear;

  const { activeWindow, nextWindow } = useMemo(() => {
    const currentYearDays = generateSacredYearDays(currentSacredYear, config.lunarAnchorMode);
    const nextYearDays = generateSacredYearDays(currentSacredYear + 1, config.lunarAnchorMode);
    const sabbathCandidates = [...currentYearDays, ...nextYearDays].filter(
      (d) => d.kind === 'DAY_ZERO' || (d.kind === 'NUMBERED_DAY' && d.isWeeklySabbath)
    );

    const windows: SabbathWindow[] = sabbathCandidates.map((sabbathDay) => {
      const eveNoon = getLocalNoonForGregorianDate(sabbathDay.gregorianDate, -1);
      const sabbathNoon = getLocalNoonForGregorianDate(sabbathDay.gregorianDate, 0);
      return {
        day: sabbathDay,
        startSunset: getSunTimes(eveNoon, latitude, longitude).sunset,
        endSunset: getSunTimes(sabbathNoon, latitude, longitude).sunset,
      };
    });

    const nowMs = now.getTime();
    const active =
      windows.find((w) => nowMs >= w.startSunset.getTime() && nowMs < w.endSunset.getTime()) ||
      null;
    const next = windows.find((w) => w.startSunset.getTime() > nowMs) || windows[0];

    return { activeWindow: active, nextWindow: next };
  }, [currentSacredYear, config.lunarAnchorMode, latitude, longitude, now]);

  const isSabbathActive = Boolean(activeWindow);
  const targetTimestamp = isSabbathActive
    ? activeWindow!.endSunset.getTime()
    : nextWindow.startSunset.getTime();

  const diffMs = Math.max(0, targetTimestamp - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const compactCountdown =
    days > 0
      ? `${days}d ${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`
      : `${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;

  const formatDayLabel = (d: CalendarDay) => {
    if (d.kind === 'DAY_ZERO') {
      return isPt ? 'Dia Zero' : 'Day Zero';
    }
    return `${getMonthDisplayTitle(d.month, config.customMonthNames, language)}, ${
      isPt ? 'Dia' : 'Day'
    } ${d.dayOfMonth}`;
  };

  const targetDay = isSabbathActive ? activeWindow!.day : nextWindow.day;
  const sunsetTimeStr = (isSabbathActive ? activeWindow!.endSunset : nextWindow.startSunset).toLocaleTimeString(
    [],
    { hour: '2-digit', minute: '2-digit' }
  );

  return (
    <button
      type="button"
      onClick={onNavigateToSabbath}
      title={
        isPt
          ? 'Toque para abrir a página do Sábado e Contagem Regressiva do Pôr do Sol'
          : 'Tap to open the Sabbath page and Sunset Countdown'
      }
      className={`w-full text-left px-3.5 sm:px-4 py-2.5 border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-2 font-serif group ${
        isSabbathActive
          ? 'border-amber-400 bg-amber-500/20 hover:bg-amber-500/25 shadow-[0_0_22px_rgba(245,158,11,0.38)] ring-1 ring-amber-400/70'
          : 'border-amber-500/40 bg-slate-950 hover:bg-slate-900/90 hover:border-amber-400/70'
      }`}
    >
      {/* Left Side: Status Pill + Sabbath Date */}
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        {isSabbathActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shrink-0">
            <Sparkles className="w-3 h-3 fill-slate-950" />
            <span>{isPt ? 'Sábado Ativo' : 'Sabbath Active'}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-400 shrink-0">
            <Sunset className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{isPt ? 'Próximo Sábado' : 'Next Sabbath'}</span>
          </span>
        )}

        <span className="text-slate-500 hidden sm:inline">·</span>

        <span
          className={`text-xs sm:text-sm font-bold truncate ${
            isSabbathActive ? 'text-amber-200' : 'text-slate-100 group-hover:text-amber-300'
          }`}
        >
          {formatDayLabel(targetDay)}
        </span>

        <span className="text-[11px] text-slate-400 italic hidden md:inline tabular-nums">
          ({isSabbathActive ? (isPt ? 'Término' : 'Ends') : isPt ? 'Pôr do Sol' : 'Sunset'} {sunsetTimeStr})
        </span>
      </div>

      {/* Right Side: Live Compact Countdown + Arrow */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <span className="text-[11px] sm:text-xs text-slate-300 hidden sm:inline">
          {isSabbathActive
            ? isPt
              ? 'Restam:'
              : 'Ends in:'
            : isPt
              ? 'Inicia em:'
              : 'Starts in:'}
        </span>

        <span
          className={`px-2 py-0.5 text-xs sm:text-sm font-bold tabular-nums border ${
            isSabbathActive
              ? 'bg-amber-400/25 border-amber-300 text-amber-200'
              : 'bg-slate-900 border-amber-500/40 text-amber-400'
          }`}
        >
          {compactCountdown}
        </span>

        <ArrowRight
          className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
            isSabbathActive ? 'text-amber-300' : 'text-amber-400'
          }`}
        />
      </div>
    </button>
  );
};
