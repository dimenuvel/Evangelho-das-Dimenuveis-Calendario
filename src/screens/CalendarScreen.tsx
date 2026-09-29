/**
 * @file src/screens/CalendarScreen.tsx
 * Book-like 13-Month x 28-Day Sacred Almanac with Day Zero threshold, Sabbath markers,
 * Biblical Appointed Times indicators, and 8-phase astronomical lunar overlays.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { CalendarConfiguration, CalendarDay } from '../types/calendar';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { generateSacredYearDays, solarDateToSacredDate, resolveSacredBirthday } from '../calendar/sacredCalendar';
import { getMonthDisplayTitle, getZodiacForSacredMonth, SACRED_13_ZODIAC_SIGNS } from '../calendar/months';
import { getLunarPhaseInfo, getLocalizedPhaseName, getPhaseCategory, MajorLunarCategory } from '../astronomy/moon';
import { getObservancesForDay, calculateFeastOccurrences } from '../calendar/feastEngine';
import { LunarPhaseIcon } from '../components/LunarPhaseIcon';
import { NatalAstralMapWidget } from '../components/NatalAstralMapWidget';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Compass, Printer, Sparkles } from 'lucide-react';

type PrintPaperSize =
  | 'AUTO'
  | 'A4 portrait'
  | 'A4 landscape'
  | 'letter portrait'
  | 'letter landscape'
  | 'A3 portrait';

interface CalendarScreenProps {
  systemDate: Date;
  config: CalendarConfiguration;
  onUpdateConfig: (partial: Partial<CalendarConfiguration>) => void;
  onOpenDayDetail: (day: CalendarDay) => void;
  language: Language;
  focusDayRequest?: { day: CalendarDay; timestamp: number } | null;
}

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  systemDate,
  config,
  onUpdateConfig,
  onOpenDayDetail,
  language,
  focusDayRequest,
}) => {
  const t = TRANSLATIONS[language];
  const isPt = language === 'pt';
  const currentSacredDay = useMemo(
    () => solarDateToSacredDate(systemDate, config.lunarAnchorMode),
    [systemDate, config.lunarAnchorMode]
  );
  const [selectedSacredYear, setSelectedSacredYear] = useState<number>(
    () => currentSacredDay.calendarYear
  );
  const [activeSubTab, setActiveSubTab] = useState<'CALENDAR_GRID' | 'ASTRAL_DATA'>('CALENDAR_GRID');
  const [activeMonthFilter, setActiveMonthFilter] = useState<number | 'ALL'>('ALL');
  const [activeLunarPhaseFilter, setActiveLunarPhaseFilter] = useState<'ALL' | MajorLunarCategory>('ALL');
  const [paperSize, setPaperSize] = useState<PrintPaperSize>('AUTO');
  const [highlightedJumpId, setHighlightedJumpId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusDayRequest) return;
    const targetDay = focusDayRequest.day;
    setActiveSubTab('CALENDAR_GRID');
    setSelectedSacredYear(targetDay.calendarYear);
    setActiveMonthFilter('ALL');
    setActiveLunarPhaseFilter('ALL');

    const targetDomId =
      targetDay.kind === 'DAY_ZERO'
        ? 'sacred-day-zero-banner'
        : `sacred-day-cell-${targetDay.dayOfYear}`;

    setHighlightedJumpId(targetDomId);

    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(targetDomId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    const clearPulseTimer = setTimeout(() => {
      setHighlightedJumpId(null);
    }, 4500);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearPulseTimer);
    };
  }, [focusDayRequest]);

  const annualFeasts = useMemo(
    () =>
      calculateFeastOccurrences(
        selectedSacredYear,
        config.lunarAnchorMode,
        config.feastCalendarModel,
        systemDate,
        language,
        config.userLocation
      ),
    [
      selectedSacredYear,
      config.lunarAnchorMode,
      config.feastCalendarModel,
      systemDate,
      language,
      config.userLocation,
    ]
  );

  const resolvedBirthday = useMemo(
    () =>
      config.userBirthdayGregorian
        ? resolveSacredBirthday(
            config.userBirthdayGregorian,
            config.lunarAnchorMode,
            selectedSacredYear
          )
        : null,
    [config.userBirthdayGregorian, config.lunarAnchorMode, selectedSacredYear]
  );

  const { dayZero, monthsData } = useMemo(() => {
    const sacredDays = generateSacredYearDays(selectedSacredYear, config.lunarAnchorMode);
    const dz = sacredDays.find((d) => d.kind === 'DAY_ZERO') as Extract<CalendarDay, { kind: 'DAY_ZERO' }>;
    const numberedDays = sacredDays.filter(
      (d): d is Extract<CalendarDay, { kind: 'NUMBERED_DAY' }> => d.kind === 'NUMBERED_DAY'
    );

    const months = Array.from({ length: 13 }, (_, idx) => {
      const monthNum = idx + 1;
      const daysInMonth = numberedDays
        .filter((d) => d.month === monthNum)
        .map((numDay) => {
          const isSabbath = numDay.dayOfWeek === 7;
          const lunarInfo = getLunarPhaseInfo(numDay.gregorianDate);
          const phaseCategory = getPhaseCategory(lunarInfo.phaseName);
          const observancesInfo = getObservancesForDay(
            numDay,
            config.lunarAnchorMode,
            config.feastCalendarModel,
            language,
            config.userLocation
          );
          const feastObs = observancesInfo.observances.find(
            (o) => o.type === 'FEAST_DAY' || o.type === 'SOLEMN_ASSEMBLY' || o.type === 'FAST_DAY'
          );
          const isMajorPhaseDay =
            lunarInfo.phaseName === 'New Moon' ||
            lunarInfo.phaseName === 'Full Moon' ||
            lunarInfo.phaseName === 'First Quarter' ||
            lunarInfo.phaseName === 'Last Quarter';

          return {
            numDay,
            isSabbath,
            lunarInfo,
            phaseCategory,
            observancesInfo,
            feastObs,
            isMajorPhaseDay,
          };
        });

      return {
        monthNum,
        roman: ROMAN_MONTHS[idx],
        title: getMonthDisplayTitle(monthNum, config.customMonthNames, language),
        zodiac: getZodiacForSacredMonth(monthNum),
        days: daysInMonth,
      };
    });

    return { dayZero: dz, monthsData: months };
  }, [
    selectedSacredYear,
    config.lunarAnchorMode,
    config.feastCalendarModel,
    config.customMonthNames,
    language,
    config.userLocation,
  ]);

  const getShortFeastLabel = (feastId?: string, fullName?: string) => {
    if (!feastId) return fullName || '';
    if (isPt) {
      const ptMap: Record<string, string> = {
        PASSOVER: 'Páscoa',
        UNLEAVENED_BREAD: 'Asmos',
        FIRSTFRUITS: 'Primíc.',
        WEEKS_PENTECOST: 'Pentec.',
        TRUMPETS: 'Tromb.',
        DAY_OF_ATONEMENT: 'Expiaç.',
        TABERNACLES: 'Tabern.',
        EIGHTH_DAY: '8º Dia',
      };
      return ptMap[feastId] || fullName || '';
    }
    const enMap: Record<string, string> = {
      PASSOVER: 'Passover',
      UNLEAVENED_BREAD: 'Matzot',
      FIRSTFRUITS: '1stFruit',
      WEEKS_PENTECOST: 'Shavuot',
      TRUMPETS: 'Trumpet',
      DAY_OF_ATONEMENT: 'Kippur',
      TABERNACLES: 'Sukkot',
      EIGHTH_DAY: '8th Day',
    };
    return enMap[feastId] || fullName || '';
  };

  const getShortPhaseLabel = (phaseName: string) => {
    if (isPt) {
      if (phaseName === 'New Moon') return 'Nova';
      if (phaseName === 'First Quarter') return 'Cres.';
      if (phaseName === 'Full Moon') return 'Cheia';
      if (phaseName === 'Last Quarter') return 'Ming.';
      return getLocalizedPhaseName(phaseName, language);
    }
    if (phaseName === 'New Moon') return 'New';
    if (phaseName === 'First Quarter') return '1st Q';
    if (phaseName === 'Full Moon') return 'Full';
    if (phaseName === 'Last Quarter') return 'Last Q';
    return getLocalizedPhaseName(phaseName, language);
  };

  const handlePrintAlmanac = () => {
    if (typeof window === 'undefined') return;

    const selectedMonthObj =
      activeMonthFilter === 'ALL'
        ? null
        : monthsData.find((m) => m.monthNum === activeMonthFilter) || null;

    const pdfTitle = selectedMonthObj
      ? isPt
        ? `Almanaque-Dimenuveis-Ano-${selectedSacredYear}-Mes-${selectedMonthObj.roman}-${selectedMonthObj.title}`
        : `Dimenuous-Almanac-Year-${selectedSacredYear}-Month-${selectedMonthObj.roman}-${selectedMonthObj.title}`
      : isPt
        ? `Almanaque-Dimenuveis-Ano-Sagrado-${selectedSacredYear}`
        : `Dimenuous-Sacred-Almanac-Year-${selectedSacredYear}`;

    const rootEl = document.documentElement;
    const prevTheme = rootEl.getAttribute('data-theme');
    rootEl.setAttribute('data-theme', 'day');
    rootEl.setAttribute('data-printing', 'true');

    // If running inside Android APK WebView, invoke native Android Print / Save as PDF spooler
    if (window.AndroidBridge?.printPage) {
      window.AndroidBridge.printPage(pdfTitle);
      setTimeout(() => {
        if (prevTheme) {
          rootEl.setAttribute('data-theme', prevTheme);
        } else {
          rootEl.removeAttribute('data-theme');
        }
        rootEl.removeAttribute('data-printing');
      }, 2500);
      return;
    }

    const originalTitle = document.title;
    document.title = pdfTitle;

    let restored = false;
    const restorePrintState = () => {
      if (restored) return;
      restored = true;
      document.title = originalTitle;
      if (prevTheme) {
        rootEl.setAttribute('data-theme', prevTheme);
      } else {
        rootEl.removeAttribute('data-theme');
      }
      rootEl.removeAttribute('data-printing');
      window.removeEventListener('afterprint', restorePrintState);
    };

    window.addEventListener('afterprint', restorePrintState);
    window.print();
    setTimeout(restorePrintState, 3500);
  };

  const firstGregorianDate = dayZero.gregorianDate.toISOString().split('T')[0];
  const lastMonthDays = monthsData[12]?.days;
  const lastGregorianDate =
    lastMonthDays && lastMonthDays.length > 0
      ? lastMonthDays[lastMonthDays.length - 1].numDay.gregorianDate.toISOString().split('T')[0]
      : '';

  const visibleMonths = monthsData.filter(
    (m) => activeMonthFilter === 'ALL' || activeMonthFilter === m.monthNum
  );

  // Helper to render a single month card inside the print sheet so it stretches to fill available grid space
  const renderPrintMonthCard = (m: (typeof monthsData)[number], isSingleMonthFullPage: boolean) => {
    const monthStartGreg = m.days[0]?.numDay.gregorianDate.toISOString().split('T')[0] || '';
    const monthEndGreg =
      m.days[m.days.length - 1]?.numDay.gregorianDate.toISOString().split('T')[0] || '';

    return (
      <div
        key={`print-month-${m.monthNum}`}
        className={`print-month-card ${isSingleMonthFullPage ? 'print-month-card-single' : ''}`}
      >
        {/* Month Header */}
        <div className="print-month-header">
          <div className="print-month-header-left">
            <span className="print-month-roman">{m.roman}.</span>
            <span className="print-month-title">{m.title}</span>
          </div>
          <div className="print-month-header-right">
            <span>
              {monthStartGreg} → {monthEndGreg}
            </span>
            <span>·</span>
            <span>{t.calendar.days28Weeks4}</span>
          </div>
        </div>

        {/* 7-Column Weekday Header */}
        <div className="print-weekday-header">
          {t.calendar.daysOfWeek.map((colName, idx) => (
            <div
              key={idx}
              className={`print-weekday-cell ${idx === 6 ? 'print-sabbath-col' : ''}`}
            >
              {colName}
            </div>
          ))}
        </div>

        {/* 28-Day Stretchable Grid (4 rows × 7 columns) */}
        <div className="print-days-grid">
          {m.days.map((dayItem, cellIdx) => {
            const {
              numDay,
              isSabbath,
              lunarInfo,
              observancesInfo,
              feastObs,
              isMajorPhaseDay,
            } = dayItem;

            const colIdx = cellIdx % 7;
            const rowIdx = Math.floor(cellIdx / 7);
            const gregDateStr = isSingleMonthFullPage
              ? numDay.gregorianDate.toISOString().split('T')[0]
              : numDay.gregorianDate.toISOString().slice(5, 10);

            return (
              <div
                key={`print-day-${numDay.dayOfYear}`}
                className={`print-day-cell ${colIdx < 6 ? 'print-border-r' : ''} ${
                  rowIdx < 3 ? 'print-border-b' : ''
                } ${
                  observancesInfo.isDoubleObservance || feastObs
                    ? 'print-cell-feast'
                    : isSabbath
                      ? 'print-cell-sabbath'
                      : isMajorPhaseDay
                        ? 'print-cell-lunar'
                        : ''
                }`}
              >
                <div className="print-day-cell-top">
                  <div className="print-day-num-group">
                    <span className="print-day-number">{numDay.dayOfMonth}</span>
                    <span className="print-day-greg">{gregDateStr}</span>
                  </div>
                  <div className="print-day-moon">
                    <LunarPhaseIcon
                      fraction={lunarInfo.fraction}
                      phaseName={lunarInfo.phaseName}
                      size={isSingleMonthFullPage ? 18 : 11}
                    />
                    <span className="print-day-illum">
                      {Math.round(lunarInfo.fraction * 100)}%
                    </span>
                  </div>
                </div>

                <div className="print-day-cell-bottom">
                  {feastObs ? (
                    <div className="print-cell-badge-feast">
                      {isSingleMonthFullPage
                        ? feastObs.feastName
                        : getShortFeastLabel(feastObs.feastId, feastObs.feastName)}
                    </div>
                  ) : isSabbath ? (
                    <div className="print-cell-badge-sabbath">{t.badges.sabbath}</div>
                  ) : isMajorPhaseDay ? (
                    <div className="print-cell-badge-phase">
                      {isSingleMonthFullPage
                        ? getLocalizedPhaseName(lunarInfo.phaseName, language)
                        : getShortPhaseLabel(lunarInfo.phaseName)}
                    </div>
                  ) : isSingleMonthFullPage ? (
                    <div className="print-cell-badge-phase-subtle">
                      {getLocalizedPhaseName(lunarInfo.phaseName, language)}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 print-calendar-view">
      {/* Dynamic @page Paper Size Injection */}
      <style>
        {`@media print { @page { ${
          paperSize !== 'AUTO' ? `size: ${paperSize};` : ''
        } margin: 6mm; } }`}
      </style>

      {/* ================================================================== */}
      {/* PRINT-ONLY ADAPTIVE FULL-PAGE SHEETS                               */}
      {/* Fills 100% of each page whether exporting 1 month or all 13 months */}
      {/* ================================================================== */}
      <div className="print-only print-document-sheets">
        {activeMonthFilter !== 'ALL' && visibleMonths.length === 1 ? (
          /* SINGLE MONTH FULL-PAGE SHEET (100% Page Fill) */
          <section className="print-sheet print-sheet-single">
            <div className="print-masthead">
              <div className="print-masthead-row">
                <div>
                  <div className="print-masthead-kicker">
                    {isPt
                      ? 'EVANGELHO DAS DIMENÚVEIS · ALMANAQUE SAGRADO DE 13 MESES'
                      : 'GOSPEL OF DIMENUOUS · 13-MONTH SACRED ALMANAC'}
                  </div>
                  <h1 className="print-masthead-title">
                    {visibleMonths[0].roman}. {visibleMonths[0].title} — {t.calendar.yearTitle}{' '}
                    {selectedSacredYear}
                  </h1>
                </div>
                <div className="print-masthead-right">
                  <div>
                    <strong>{isPt ? 'Dia Zero:' : 'Day Zero:'}</strong> {firstGregorianDate} (
                    {getLocalizedPhaseName(dayZero.lunarAnchor.phaseName, language)} ·{' '}
                    {(dayZero.lunarAnchor.illumination * 100).toFixed(1)}%)
                  </div>
                  <div>
                    <strong>{isPt ? 'Âncora:' : 'Anchor:'}</strong> {config.lunarAnchorMode} ·{' '}
                    <strong>{isPt ? 'Modelo:' : 'Model:'}</strong> {config.feastCalendarModel}
                  </div>
                </div>
              </div>
            </div>

            <div className="print-single-month-wrapper">
              {renderPrintMonthCard(visibleMonths[0], true)}
            </div>

            <div className="print-colophon">
              {isPt
                ? `Evangelho das Dimenúveis · Ano Sagrado ${selectedSacredYear} · Mês ${visibleMonths[0].roman} (${visibleMonths[0].title}) · 28 Dias / 4 Semanas Perfeitas`
                : `Gospel of Dimenuous · Sacred Year ${selectedSacredYear} · Month ${visibleMonths[0].roman} (${visibleMonths[0].title}) · 28 Days / 4 Perfect Weeks`}
            </div>
          </section>
        ) : (
          /* ALL 13 MONTHS MULTI-PAGE FULL-BLEED SHEETS (4 Pages, 100% Filled) */
          <>
            {/* PAGE 1: Masthead + Day Zero + Months I–IV */}
            <section className="print-sheet">
              <div className="print-masthead">
                <div className="print-masthead-row">
                  <div>
                    <div className="print-masthead-kicker">
                      {isPt
                        ? 'EVANGELHO DAS DIMENÚVEIS · ALMANAQUE SAGRADO DE 13 MESES (PÁG. 1/4)'
                        : 'GOSPEL OF DIMENUOUS · 13-MONTH SACRED ALMANAC (PAGE 1/4)'}
                    </div>
                    <h1 className="print-masthead-title">
                      {t.calendar.yearTitle} {selectedSacredYear} ({firstGregorianDate} —{' '}
                      {lastGregorianDate})
                    </h1>
                  </div>
                  <div className="print-masthead-right">
                    <div>
                      <strong>{isPt ? 'Dia Zero (Sábado Anual):' : 'Day Zero (Annual Sabbath):'}</strong>{' '}
                      {firstGregorianDate} ·{' '}
                      {getLocalizedPhaseName(dayZero.lunarAnchor.phaseName, language)} (
                      {(dayZero.lunarAnchor.illumination * 100).toFixed(1)}%)
                    </div>
                    <div>
                      <strong>{isPt ? 'Âncora Lunar:' : 'Lunar Anchor:'}</strong>{' '}
                      {config.lunarAnchorMode} · <strong>{isPt ? 'Festas:' : 'Feasts:'}</strong>{' '}
                      {config.feastCalendarModel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="print-sheet-grid-2x2">
                {monthsData.slice(0, 4).map((m) => renderPrintMonthCard(m, false))}
              </div>

              <div className="print-colophon">
                {isPt
                  ? `Evangelho das Dimenúveis · Ano Sagrado ${selectedSacredYear} · Meses I a IV`
                  : `Gospel of Dimenuous · Sacred Year ${selectedSacredYear} · Months I to IV`}
              </div>
            </section>

            {/* PAGE 2: Months V–VIII */}
            <section className="print-sheet">
              <div className="print-running-header">
                <span>
                  {isPt
                    ? `EVANGELHO DAS DIMENÚVEIS · ANO SAGRADO ${selectedSacredYear}`
                    : `GOSPEL OF DIMENUOUS · SACRED YEAR ${selectedSacredYear}`}
                </span>
                <span>
                  {isPt ? 'MESES V A VIII (PÁG. 2/4)' : 'MONTHS V TO VIII (PAGE 2/4)'}
                </span>
              </div>

              <div className="print-sheet-grid-2x2">
                {monthsData.slice(4, 8).map((m) => renderPrintMonthCard(m, false))}
              </div>

              <div className="print-colophon">
                {isPt
                  ? `Evangelho das Dimenúveis · Ano Sagrado ${selectedSacredYear} · Meses V a VIII`
                  : `Gospel of Dimenuous · Sacred Year ${selectedSacredYear} · Months V to VIII`}
              </div>
            </section>

            {/* PAGE 3: Months IX–XII */}
            <section className="print-sheet">
              <div className="print-running-header">
                <span>
                  {isPt
                    ? `EVANGELHO DAS DIMENÚVEIS · ANO SAGRADO ${selectedSacredYear}`
                    : `GOSPEL OF DIMENUOUS · SACRED YEAR ${selectedSacredYear}`}
                </span>
                <span>
                  {isPt ? 'MESES IX A XII (PÁG. 3/4)' : 'MONTHS IX TO XII (PAGE 3/4)'}
                </span>
              </div>

              <div className="print-sheet-grid-2x2">
                {monthsData.slice(8, 12).map((m) => renderPrintMonthCard(m, false))}
              </div>

              <div className="print-colophon">
                {isPt
                  ? `Evangelho das Dimenúveis · Ano Sagrado ${selectedSacredYear} · Meses IX a XII`
                  : `Gospel of Dimenuous · Sacred Year ${selectedSacredYear} · Months IX to XII`}
              </div>
            </section>

            {/* PAGE 4: Month XIII + Complete Table of Appointed Biblical Feasts */}
            <section className="print-sheet print-sheet-last">
              <div className="print-running-header">
                <span>
                  {isPt
                    ? `EVANGELHO DAS DIMENÚVEIS · ANO SAGRADO ${selectedSacredYear}`
                    : `GOSPEL OF DIMENUOUS · SACRED YEAR ${selectedSacredYear}`}
                </span>
                <span>
                  {isPt
                    ? 'MÊS XIII E TABELA ANUAL DE FESTAS BÍBLICAS (PÁG. 4/4)'
                    : 'MONTH XIII & ANNUAL BIBLICAL FEASTS TABLE (PAGE 4/4)'}
                </span>
              </div>

              <div className="print-sheet-page4-split">
                {/* Top Half: Month XIII Expanded */}
                <div className="print-page4-month13">
                  {monthsData[12] ? renderPrintMonthCard(monthsData[12], true) : null}
                </div>

                {/* Bottom Half: Complete 8 Appointed Feasts & Day Zero Reference Table */}
                <div className="print-feasts-summary-card">
                  <div className="print-month-header">
                    <div className="print-month-header-left">
                      <span className="print-month-roman">★</span>
                      <span className="print-month-title">
                        {isPt
                          ? `Tempos Determinados (Moedim) e Limiar do Dia Zero — Ano Sagrado ${selectedSacredYear}`
                          : `Appointed Times (Moedim) & Day Zero Threshold — Sacred Year ${selectedSacredYear}`}
                      </span>
                    </div>
                    <div className="print-month-header-right">
                      <span>
                        {isPt
                          ? 'Início da Observância: Pôr do Sol da Véspera'
                          : 'Observance Boundary: Evening Sunset'}
                      </span>
                    </div>
                  </div>

                  <table className="print-feasts-table">
                    <thead>
                      <tr>
                        <th>{isPt ? 'Festa / Solenidade' : 'Appointed Feast'}</th>
                        <th>{isPt ? 'Data Sagrada' : 'Sacred Date'}</th>
                        <th>{isPt ? 'Data Gregoriana' : 'Gregorian Date'}</th>
                        <th>{isPt ? 'Fase Lunar' : 'Lunar Phase'}</th>
                        <th>{isPt ? 'Referências Bíblicas' : 'Scriptural References'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>{isPt ? 'Dia Zero (Ano Novo)' : 'Day Zero (New Year)'}</strong>
                        </td>
                        <td>{isPt ? 'Fora dos 13 Meses' : 'Outside 13 Months'}</td>
                        <td>{firstGregorianDate}</td>
                        <td>
                          {getLocalizedPhaseName(dayZero.lunarAnchor.phaseName, language)} (
                          {Math.round(dayZero.lunarAnchor.illumination * 100)}%)
                        </td>
                        <td>Êxodo 12:2 · Salmos 104:19</td>
                      </tr>
                      {annualFeasts.map((occ) => {
                        const sDate = occ.gregorianStartDate.toISOString().split('T')[0];
                        const eDate = occ.gregorianEndDate.toISOString().split('T')[0];
                        return (
                          <tr key={`print-feast-${occ.feast.id}`}>
                            <td>
                              <strong>{occ.feast.name}</strong> ({occ.feast.hebrewName})
                            </td>
                            <td>
                              {isPt ? 'Mês' : 'Month'} {occ.feast.sacredMonth},{' '}
                              {isPt ? 'Dia' : 'Day'} {occ.feast.sacredDay}
                              {occ.feast.durationDays > 1
                                ? `–${occ.feast.sacredDay + occ.feast.durationDays - 1}`
                                : ''}
                            </td>
                            <td>{sDate === eDate ? sDate : `${sDate} → ${eDate}`}</td>
                            <td>
                              {getLocalizedPhaseName(occ.lunarPhaseAtStart.phaseName, language)} (
                              {Math.round(occ.lunarPhaseAtStart.fraction * 100)}%)
                            </td>
                            <td>{occ.feast.biblicalReferences.slice(0, 2).join(', ')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="print-colophon">
                {isPt
                  ? `Almanaque Arquivístico — Evangelho das Dimenúveis · Ano Sagrado ${selectedSacredYear} (13 Meses × 28 Dias = 364 Dias + Dia Zero)`
                  : `Archival Almanac — Gospel of Dimenuous · Sacred Year ${selectedSacredYear} (13 Months × 28 Days = 364 Days + Day Zero)`}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Top Sub-Tab Switcher: Tab 1 (Sacred Calendar) vs Tab 2 (Astral Data & 13 Zodiac Signs) */}
      <div className="no-print border border-slate-800 bg-slate-950 p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-serif">
        <button
          type="button"
          onClick={() => setActiveSubTab('CALENDAR_GRID')}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            activeSubTab === 'CALENDAR_GRID'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-900/60 text-slate-300 hover:bg-slate-900 hover:text-slate-100'
          }`}
        >
          <CalendarIcon className="w-4 h-4 shrink-0" />
          <span>
            {isPt
              ? 'I. Calendário Sagrado (13 Meses × 28 Dias)'
              : 'I. Sacred Calendar (13 Months × 28 Days)'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ASTRAL_DATA')}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            activeSubTab === 'ASTRAL_DATA'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-900/60 text-slate-300 hover:bg-slate-900 hover:text-slate-100'
          }`}
        >
          <Compass className="w-4 h-4 shrink-0" />
          <span>
            {isPt
              ? 'II. Dados Astrais & 13 Signos (Mapa Astral Natal)'
              : 'II. Astral Data & 13 Signs (Natal Astral Map)'}
          </span>
        </button>
      </div>

      {activeSubTab === 'CALENDAR_GRID' && (
        <>
          {/* Book Almanac Header & Control Strip (Screen Only) */}
      <div className="border border-slate-800 bg-slate-950 divide-y divide-slate-800 print-calendar-header no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5">
          <div>
            <h2 className="text-lg sm:text-2xl font-serif font-bold text-slate-100 tabular-nums whitespace-nowrap">
              {t.calendar.yearTitle} {selectedSacredYear}
            </h2>
            <p className="text-xs text-slate-300 font-serif italic mt-0.5 whitespace-nowrap">
              {t.calendar.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Year Stepper */}
            <div className="inline-flex items-center border border-slate-700 bg-slate-900 divide-x divide-slate-700 font-serif text-xs shrink-0">
              <button
                onClick={() => setSelectedSacredYear((prev) => prev - 1)}
                className="p-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
                title={isPt ? 'Ano Sagrado Anterior' : 'Previous Sacred Year'}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1.5 font-semibold text-amber-400 tabular-nums whitespace-nowrap">
                {isPt ? 'Ano' : 'Year'} {selectedSacredYear}
              </span>
              <button
                onClick={() => setSelectedSacredYear((prev) => prev + 1)}
                className="p-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
                title={isPt ? 'Próximo Ano Sagrado' : 'Next Sacred Year'}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Month Filter */}
            <select
              value={activeMonthFilter}
              onChange={(e) =>
                setActiveMonthFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10))
              }
              aria-label={isPt ? 'Selecionar Mês' : 'Select Month'}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-xs font-serif text-slate-100 focus:outline-none focus:border-amber-500 min-w-0"
            >
              <option value="ALL">{t.calendar.allMonths}</option>
              {monthsData.map((m) => (
                <option key={m.monthNum} value={m.monthNum}>
                  {m.roman}. {m.title}
                </option>
              ))}
            </select>

            {/* Paper Size Selector for Print / PDF */}
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PrintPaperSize)}
              aria-label={isPt ? 'Tamanho do Papel para PDF' : 'PDF Paper Size'}
              title={isPt ? 'Tamanho do Papel para Exportação PDF' : 'Paper Size for PDF Export'}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-xs font-serif text-slate-100 focus:outline-none focus:border-amber-500 min-w-0"
            >
              <option value="AUTO">
                {isPt ? 'Papel: Adaptável (Auto)' : 'Paper: Adaptive (Auto)'}
              </option>
              <option value="A4 portrait">
                {isPt ? 'A4 Retrato' : 'A4 Portrait'}
              </option>
              <option value="A4 landscape">
                {isPt ? 'A4 Paisagem' : 'A4 Landscape'}
              </option>
              <option value="letter portrait">
                {isPt ? 'Carta (Letter) Retrato' : 'Letter Portrait'}
              </option>
              <option value="letter landscape">
                {isPt ? 'Carta (Letter) Paisagem' : 'Letter Landscape'}
              </option>
              <option value="A3 portrait">
                {isPt ? 'A3 Retrato' : 'A3 Portrait'}
              </option>
            </select>

            {/* Archival Print-to-PDF Button */}
            <button
              type="button"
              onClick={handlePrintAlmanac}
              aria-label={isPt ? 'Imprimir ou Salvar em PDF' : 'Print or Save as PDF'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-serif font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={
                isPt
                  ? 'Imprimir Almanaque ou Salvar como PDF preenchido em página inteira'
                  : 'Print Almanac or Save as full-page PDF'
              }
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>{isPt ? 'Imprimir / PDF' : 'Print / PDF'}</span>
            </button>
          </div>
        </div>

        {/* Lunar Phase Filter Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 sm:px-5 py-3 bg-slate-900/40 text-xs font-serif">
          <span className="text-slate-300 italic shrink-0 whitespace-nowrap">
            {t.calendar.lunarFilter}
          </span>

          <div className="grid grid-cols-5 gap-px bg-slate-700 border border-slate-700 w-full sm:w-auto">
            {[
              { id: 'ALL', label: t.calendar.allPhases },
              { id: 'New', label: isPt ? 'Nova' : 'New' },
              { id: 'Waxing', label: isPt ? 'Cresc.' : 'Waxing' },
              { id: 'Full', label: isPt ? 'Cheia' : 'Full' },
              { id: 'Waning', label: isPt ? 'Ming.' : 'Waning' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveLunarPhaseFilter(p.id as any)}
                className={`px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-serif text-center transition-colors cursor-pointer whitespace-nowrap ${
                  activeLunarPhaseFilter === p.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-300 hover:text-slate-100 hover:bg-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DAY ZERO THRESHOLD RECORD ROW (Screen Only) */}
      <div
        id="sacred-day-zero-banner"
        onClick={() => onOpenDayDetail(dayZero)}
        className={`no-print border transition-colors cursor-pointer grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800 ${
          currentSacredDay.kind === 'DAY_ZERO' &&
          selectedSacredYear === currentSacredDay.calendarYear
            ? 'border-amber-400 ring-2 ring-amber-400 bg-amber-950/25 hover:bg-amber-950/35'
            : 'border-purple-500/50 bg-slate-950 hover:bg-slate-900/80'
        }`}
      >
        <div className="md:col-span-9 p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-serif uppercase tracking-wider whitespace-nowrap">
            {currentSacredDay.kind === 'DAY_ZERO' &&
              selectedSacredYear === currentSacredDay.calendarYear && (
                <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                  {isPt ? 'Hoje' : 'Today'}
                </span>
              )}
            {resolvedBirthday?.sacredMonth === 0 && (
              <span className="px-1.5 py-0.5 bg-purple-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                {isPt ? 'Aniv.' : 'Bday'}
              </span>
            )}
            <span className="text-purple-300 font-semibold">
              {isPt ? 'Dia Zero' : 'Day Zero'}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-400 font-semibold">{t.calendar.annualSabbathThreshold}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300 italic normal-case tabular-nums">
              {dayZero.gregorianDate.toISOString().split('T')[0]}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-serif font-bold text-slate-100 whitespace-nowrap">
            {t.calendar.dayZeroBannerTitle}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t.calendar.dayZeroBannerDesc}
          </p>
        </div>

        <div className="md:col-span-3 p-4 sm:p-5 flex items-center gap-3.5 bg-slate-900/30">
          <LunarPhaseIcon
            fraction={dayZero.lunarAnchor.illumination}
            phaseName={dayZero.lunarAnchor.phaseName}
            size={38}
          />
          <div className="text-xs font-serif whitespace-nowrap">
            <span className="text-slate-300 block text-xs italic">{t.calendar.springAnchorPhase}</span>
            <strong className="text-purple-300 block text-sm sm:text-base">
              {getLocalizedPhaseName(dayZero.lunarAnchor.phaseName, language)}
            </strong>
            <span className="text-xs text-slate-200 tabular-nums font-medium">
              {(dayZero.lunarAnchor.illumination * 100).toFixed(1)}% {isPt ? 'Ilum.' : 'Illum.'}
            </span>
          </div>
        </div>
      </div>

      {/* 13-MONTH ALMANAC MATRIX (Screen Interactive View) */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
        {monthsData
          .filter((m) => activeMonthFilter === 'ALL' || activeMonthFilter === m.monthNum)
          .map((m, visibleIdx) => {
            const monthStartGreg = m.days[0]?.numDay.gregorianDate.toISOString().split('T')[0] || '';
            const monthEndGreg =
              m.days[m.days.length - 1]?.numDay.gregorianDate.toISOString().split('T')[0] || '';
            // Insert a clean page break after every 4th month when printing all months (so Page 1 has Day Zero + Months I–IV, Page 2 has Months V–VIII, Page 3 has Months IX–XII, Page 4 has Month XIII + Colophon)
            const shouldBreakPageAfter =
              activeMonthFilter === 'ALL' && (visibleIdx === 3 || visibleIdx === 7 || visibleIdx === 11);
            const isCurrentMonthCard =
              currentSacredDay.kind === 'NUMBERED_DAY' &&
              selectedSacredYear === currentSacredDay.calendarYear &&
              m.monthNum === currentSacredDay.month;

            return (
              <div
                key={m.monthNum}
                id={`sacred-month-card-${m.monthNum}`}
                className={`border bg-slate-950 print-month-card ${
                  isCurrentMonthCard
                    ? 'border-amber-500/70'
                    : m.zodiac.isThirteenthDragonSign
                    ? 'border-emerald-500/60'
                    : 'border-slate-800'
                } ${shouldBreakPageAfter ? 'print-page-break-after' : ''}`}
              >
                {/* Month Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-4 py-3 bg-slate-900/70 border-b border-slate-800 print-month-header">
                  <div className="flex flex-wrap items-baseline gap-2 min-w-0">
                    <span className="font-serif italic text-base font-bold text-amber-400">
                      {m.roman}.
                    </span>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-slate-100">
                      {m.title}
                    </h3>
                    <span className="text-slate-500">·</span>
                    <span
                      className={`text-xs font-serif font-semibold ${
                        m.zodiac.isThirteenthDragonSign ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                      title={isPt ? m.zodiac.meaningPt : m.zodiac.meaningEn}
                    >
                      {m.zodiac.symbol} {isPt ? m.zodiac.namePt : m.zodiac.nameEn}
                    </span>
                    {m.zodiac.isThirteenthDragonSign && (
                      <span className="no-print px-1.5 py-0.5 text-[10px] font-serif font-bold uppercase tracking-wider bg-emerald-500 text-slate-950">
                        {isPt ? '13º Signo: O Dragão' : '13th Sign: The Dragon'}
                      </span>
                    )}
                    {isCurrentMonthCard && (
                      <span className="no-print px-1.5 py-0.5 text-[10px] font-serif font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50">
                        {isPt ? 'Mês Atual' : 'Current Month'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-serif italic text-slate-200 tabular-nums whitespace-nowrap">
                    <span className="print-only text-[10px] not-italic">
                      {monthStartGreg} → {monthEndGreg} ·
                    </span>
                    <span>{t.calendar.days28Weeks4}</span>
                  </div>
                </div>

                {/* 7-Column Day Header */}
                <div className="grid grid-cols-7 divide-x divide-slate-800 border-b border-slate-800 bg-slate-900/40 text-center text-[10.5px] sm:text-xs font-serif text-slate-200 print-weekday-header">
                  {t.calendar.daysOfWeek.map((colName, idx) => (
                    <div
                      key={idx}
                      className={`py-2 px-0.5 font-bold whitespace-nowrap ${
                        idx === 6 ? 'text-amber-400 bg-amber-950/15 print-sabbath-col' : ''
                      }`}
                    >
                      <span className="sm:hidden print-hide-mobile-abbr">
                        {idx === 6 ? (isPt ? 'Sáb' : 'Sab') : `D${idx + 1}`}
                      </span>
                      <span className="hidden sm:inline print-show-full-weekday">{colName}</span>
                    </div>
                  ))}
                </div>

                {/* 28-Day Hairline Grid */}
                <div className="grid grid-cols-7 print-days-grid">
                  {m.days.map((dayItem, cellIdx) => {
                    const {
                      numDay,
                      isSabbath,
                      lunarInfo,
                      phaseCategory,
                      observancesInfo,
                      feastObs,
                      isMajorPhaseDay,
                    } = dayItem;

                    const matchesPhaseFilter =
                      activeLunarPhaseFilter === 'ALL' || phaseCategory === activeLunarPhaseFilter;

                    const colIdx = cellIdx % 7;
                    const rowIdx = Math.floor(cellIdx / 7);
                    const gregShort = numDay.gregorianDate.toISOString().slice(5, 10);
                    const cellDomId = `sacred-day-cell-${numDay.dayOfYear}`;
                    const isCurrentDay =
                      currentSacredDay.kind === 'NUMBERED_DAY' &&
                      selectedSacredYear === currentSacredDay.calendarYear &&
                      numDay.dayOfYear === currentSacredDay.dayOfYear;
                    const isUserBirthday =
                      resolvedBirthday !== null &&
                      resolvedBirthday.sacredMonth === numDay.month &&
                      resolvedBirthday.sacredDayOfMonth === numDay.dayOfMonth;
                    const isJumpedTarget = highlightedJumpId === cellDomId;

                    return (
                      <div
                        id={cellDomId}
                        key={numDay.dayOfYear}
                        onClick={() => onOpenDayDetail(numDay)}
                        className={`print-day-cell p-1.5 sm:p-2.5 min-h-[4.25rem] sm:min-h-[5rem] h-auto flex flex-col justify-between gap-1 cursor-pointer transition-all ${
                          colIdx < 6 ? 'border-r border-slate-800' : ''
                        } ${rowIdx < 3 ? 'border-b border-slate-800' : ''} ${
                          !matchesPhaseFilter ? 'opacity-35' : 'opacity-100'
                        } ${
                          isCurrentDay
                            ? `ring-2 ring-inset ring-amber-400 bg-amber-500/25 hover:bg-amber-500/35 text-amber-100 shadow-[inset_0_0_16px_rgba(245,158,11,0.32)] relative z-10 ${
                                isJumpedTarget ? 'ring-4 ring-amber-300' : ''
                              }`
                            : isUserBirthday
                            ? 'ring-2 ring-inset ring-purple-400 bg-purple-950/35 hover:bg-purple-950/50 text-purple-100 relative z-10'
                            : observancesInfo.isDoubleObservance
                            ? 'bg-amber-950/40 hover:bg-amber-950/60 text-amber-200 print-cell-feast'
                            : feastObs
                            ? 'bg-amber-950/25 hover:bg-amber-950/40 text-amber-200 print-cell-feast'
                            : isSabbath
                            ? 'bg-amber-950/15 hover:bg-amber-950/30 text-amber-200 print-cell-sabbath'
                            : isMajorPhaseDay
                            ? 'bg-blue-950/20 hover:bg-blue-950/35 text-slate-100 print-cell-lunar'
                            : 'bg-slate-950 hover:bg-slate-900 text-slate-100'
                        }`}
                      >
                        {/* Cell Top Row: Day Number (with Today / Birthday Badge beneath) + Moon Phase Icon */}
                        <div className="flex items-start justify-between gap-0.5">
                          <div className="flex flex-col items-start gap-1 min-w-0">
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`font-serif font-bold text-sm sm:text-base tabular-nums leading-none ${
                                  isCurrentDay
                                    ? 'text-amber-300'
                                    : isUserBirthday
                                    ? 'text-purple-300'
                                    : isSabbath
                                    ? 'text-amber-400'
                                    : 'text-slate-100'
                                }`}
                              >
                                {numDay.dayOfMonth}
                              </span>
                              <span className="print-only text-[8.5px] tabular-nums text-slate-500">
                                {gregShort}
                              </span>
                            </div>
                            {isCurrentDay && (
                              <span className="no-print inline-block px-1 py-0.5 bg-amber-400 text-slate-950 font-serif font-bold text-[8px] sm:text-[9px] uppercase tracking-tight leading-none">
                                {isPt ? 'Hoje' : 'Today'}
                              </span>
                            )}
                            {isUserBirthday && (
                              <span
                                className="no-print inline-block px-1 py-0.5 bg-purple-400 text-slate-950 font-serif font-bold text-[8px] sm:text-[9px] uppercase tracking-tight leading-none"
                                title={
                                  isPt
                                    ? 'Seu Aniversário no Calendário de 13 Meses'
                                    : 'Your 13-Month Sacred Birthday'
                                }
                              >
                                {isPt ? 'Aniv.' : 'Bday'}
                              </span>
                            )}
                          </div>

                          <LunarPhaseIcon
                            fraction={lunarInfo.fraction}
                            phaseName={lunarInfo.phaseName}
                            size={14}
                          />
                        </div>

                        {/* Cell Bottom Row: Single-Line Observance / Lunar Readout */}
                        <div className="min-w-0 overflow-hidden">
                          {feastObs ? (
                            <div
                              className="text-[9.5px] sm:text-xs font-serif font-semibold text-amber-300 leading-tight whitespace-nowrap"
                              title={feastObs.label}
                            >
                              {getShortFeastLabel(feastObs.feastId, feastObs.feastName)}
                            </div>
                          ) : isSabbath ? (
                            <div className="text-[9.5px] sm:text-xs font-serif italic text-amber-400 font-semibold leading-tight whitespace-nowrap">
                              <span className="sm:hidden print-hide-mobile-abbr">{isPt ? 'Sáb' : 'Sab'}</span>
                              <span className="hidden sm:inline print-show-full-weekday">{t.badges.sabbath}</span>
                            </div>
                          ) : isMajorPhaseDay ? (
                            <div
                              className="text-[9.5px] sm:text-xs font-serif italic text-blue-300 font-medium leading-tight whitespace-nowrap"
                              title={getLocalizedPhaseName(lunarInfo.phaseName, language)}
                            >
                              {getShortPhaseLabel(lunarInfo.phaseName)}
                            </div>
                          ) : (
                            <div className="text-[10px] sm:text-xs font-serif text-slate-300 tabular-nums font-medium leading-tight whitespace-nowrap">
                              {Math.round(lunarInfo.fraction * 100)}%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
        </>
      )}

      {/* ================================================================== */}
      {/* TAB 2: ASTRAL DATA & 13-MONTH ZODIAC CORRELATION MATRIX            */}
      {/* ================================================================== */}
      {activeSubTab === 'ASTRAL_DATA' && (
      <div className="no-print border border-slate-800 bg-slate-950 divide-y divide-slate-800 font-serif">
        {/* Section Header */}
        <div className="p-4 sm:p-5 bg-slate-900/60 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-400 font-bold">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {isPt
                  ? 'Roda Eclíptica de 13 Meses (Mazzaroth · Jó 38:32) & O 13º Signo do Dragão'
                  : '13-Month Ecliptic Wheel (Mazzaroth · Job 38:32) & The 13th Sign of the Dragon'}
              </span>
            </div>
            <span className="text-xs italic text-emerald-400 font-semibold">
              {isPt
                ? '13 Meses × 28 Dias = 13 Constelações Eclípticas'
                : '13 Months × 28 Days = 13 Ecliptic Constellations'}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-100">
            {isPt
              ? 'Correlação dos 13 Signos do Zodíaco e a Restauração do Signo do Dragão (Mês IX)'
              : 'Correlation of the 13 Zodiac Signs & Restoration of the Sign of the Dragon (Month IX)'}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
            {isPt
              ? 'Na astronomia real da eclíptica solar (Mazzaroth, Jó 38:32), o Sol atravessa 13 constelações ao longo do ano — e não apenas 12. Quando o antigo calendário de 13 meses de 28 dias foi comprimido em 12 meses greco-romanos irregulares, o 13º signo — O Dragão / Serpentário (Ofiúco · Draco, situado no Mês IX entre Escorpião e Sagitário) — foi omitido. Abaixo está o mapeamento integral dos 13 signos nos 13 meses sagrados.'
              : 'In true solar ecliptic astronomy (Mazzaroth, Job 38:32), the Sun traverses 13 constellations over the year — not merely 12. When the ancient 13-month × 28-day calendar was compressed into 12 irregular Greco-Roman months, the 13th sign — The Dragon / Serpent-Bearer (Ophiuchus · Draco, positioned in Month IX between Scorpio and Sagittarius) — was omitted. Below is the complete mapping of all 13 signs across the 13 sacred months.'}
          </p>
        </div>

        {/* Highlight Banner for the 13th Sign of the Dragon */}
        <div className="p-4 sm:p-5 bg-emerald-950/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span>⛎ {isPt ? 'O 13º Signo Oculto Restaurado' : 'The Restored 13th Hidden Sign'}</span>
              <span>·</span>
              <span>{isPt ? 'Mês IX (Dias 225–252 do Ano)' : 'Month IX (Days 225–252 of Year)'}</span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-slate-100">
              {isPt
                ? 'O Dragão / Serpentário (Ofiúco · Draco — Arco Eclíptico 221,5° a 249,2°)'
                : 'The Dragon / Serpent-Bearer (Ophiuchus · Draco — Ecliptic Arc 221.5° to 249.2°)'}
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed max-w-3xl">
              {isPt
                ? 'Situado entre Escorpião (Mês VIII) e Sagitário (Mês X), o 9º Mês Sagrado corresponde à constelação de Ofiúco/Draco sobre a linha da eclíptica, restaurando a proporção exata de 1 signo para cada mês de 28 dias (4 semanas perfeitas).'
                : 'Positioned between Scorpio (Month VIII) and Sagittarius (Month X), the 9th Sacred Month corresponds to the Ophiuchus/Draco constellation intersecting the ecliptic, restoring the exact 1-to-1 ratio of 1 sign per 28-day month (4 perfect weeks).'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('CALENDAR_GRID');
              setActiveMonthFilter(9);
              setTimeout(() => {
                const el = document.getElementById('sacred-month-card-9');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 80);
            }}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0 self-start md:self-center"
          >
            {isPt ? 'Ver Mês IX no Calendário' : 'View Month IX in Calendar'}
          </button>
        </div>

        {/* Interactive 13-Sign Natal Astral Map by Exact Birth Date & Time */}
        <NatalAstralMapWidget
          config={config}
          onUpdateConfig={onUpdateConfig}
          language={language}
          onSelectMonthInCalendar={(monthNumber) => {
            setActiveSubTab('CALENDAR_GRID');
            setActiveMonthFilter(monthNumber);
            setTimeout(() => {
              const el = document.getElementById(`sacred-month-card-${monthNumber}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 80);
          }}
        />

        {/* 13-Month Zodiac Correlation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-800">
          {SACRED_13_ZODIAC_SIGNS.map((z) => {
            const mInfo = monthsData[z.monthNumber - 1];
            const startDayOfYear = (z.monthNumber - 1) * 28 + 1;
            const endDayOfYear = z.monthNumber * 28;
            const startGreg = mInfo?.days[0]?.numDay.gregorianDate.toISOString().split('T')[0] || '';
            const endGreg =
              mInfo?.days[mInfo.days.length - 1]?.numDay.gregorianDate
                .toISOString()
                .split('T')[0] || '';
            const isDragon = Boolean(z.isThirteenthDragonSign);

            return (
              <div
                key={z.monthNumber}
                className={`p-4 flex flex-col justify-between space-y-3 transition-colors ${
                  isDragon
                    ? 'bg-emerald-950/30 ring-1 ring-inset ring-emerald-500/50'
                    : 'bg-slate-950'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                    <span className="font-bold text-amber-400">
                      {ROMAN_MONTHS[z.monthNumber - 1]}.{' '}
                      {getMonthDisplayTitle(z.monthNumber, config.customMonthNames, language)}
                    </span>
                    <span className="text-slate-400 italic">
                      {isPt
                        ? `Dias ${startDayOfYear}–${endDayOfYear}`
                        : `Days ${startDayOfYear}–${endDayOfYear}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                      <span className="text-lg text-amber-300">{z.symbol}</span>
                      <span>{isPt ? z.namePt : z.nameEn}</span>
                    </h4>
                    {isDragon && (
                      <span className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider">
                        {isPt ? '13º Signo' : '13th Sign'}
                      </span>
                    )}
                  </div>

                  <div className="text-xs italic text-purple-300">
                    {isPt ? z.archetypePt : z.archetypeEn} · {z.constellationLatin}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pt-1">
                    {isPt ? z.meaningPt : z.meaningEn}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 tabular-nums">
                  <div className="flex justify-between">
                    <span>{isPt ? 'Arco Eclíptico:' : 'Ecliptic Arc:'}</span>
                    <span className="text-slate-200 font-semibold">{z.eclipticArc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isPt ? 'Elemento:' : 'Element:'}</span>
                    <span className="text-amber-300">{isPt ? z.elementPt : z.elementEn}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-300">
                      {startGreg} → {endGreg}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubTab('CALENDAR_GRID');
                        setActiveMonthFilter(z.monthNumber);
                        setTimeout(() => {
                          const el = document.getElementById(`sacred-month-card-${z.monthNumber}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 80);
                      }}
                      className="px-2 py-0.5 border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-[10px] transition-colors cursor-pointer"
                    >
                      {isPt ? 'Ver no Calendário →' : 'View in Calendar →'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
};
