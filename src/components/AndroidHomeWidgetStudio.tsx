/**
 * @file src/components/AndroidHomeWidgetStudio.tsx
 * Interactive Android Home Screen Widget Studio & Configurator.
 * Allows users to customize, preview over live wallpapers, adjust Alpha Transparency (0%–100%),
 * pin/sync to the native Android APK AppWidgetProvider, or export as a high-resolution transparent PNG.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarConfiguration } from '../types/calendar';
import { Language } from '../i18n/translations';
import {
  AndroidWidgetConfig,
  AndroidWidgetSize,
  AndroidWidgetTheme,
  SimulatedWallpaperId,
  DEFAULT_ANDROID_WIDGET_CONFIG,
  loadAndroidWidgetConfig,
  saveAndroidWidgetConfig,
  buildLiveAndroidWidgetSnapshot,
  syncWidgetToAndroidBridge,
  requestPinWidgetOnAndroid,
} from '../services/androidWidgetService';
import { LunarPhaseIcon } from './LunarPhaseIcon';
import { toCanvas } from 'html-to-image';
import {
  Smartphone,
  Sliders,
  MapPin,
  Clock,
  Sunset,
  Sunrise,
  Sun,
  Sparkles,
  Calendar,
  Compass,
  CheckCircle2,
  Download,
  RotateCcw,
  Layers,
  Eye,
  X,
  BookOpen,
  Wifi,
  BatteryCharging,
} from 'lucide-react';

interface AndroidHomeWidgetStudioProps {
  systemDate: Date;
  config: CalendarConfiguration;
  language: Language;
  onOpenGpsModal?: () => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

interface ThemePalette {
  bgRgb: string; // "r, g, b"
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentGold: string;
  accentGoldSoft: string;
  borderGold: string;
  borderSubtle: string;
  panelBg: string;
  sabbathActiveBg: string;
  sabbathBoxBg: string;
  badgeText: string;
}

const WIDGET_THEME_PALETTES: Record<AndroidWidgetTheme, ThemePalette> = {
  obsidian: {
    bgRgb: '12, 14, 20',
    textPrimary: '#fbf8f1',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    accentGold: '#f59e0b',
    accentGoldSoft: '#fcd34d',
    borderGold: 'rgba(245, 158, 11, 0.55)',
    borderSubtle: 'rgba(148, 163, 184, 0.22)',
    panelBg: 'rgba(255, 255, 255, 0.04)',
    sabbathActiveBg: 'rgba(245, 158, 11, 0.22)',
    sabbathBoxBg: 'rgba(15, 23, 42, 0.55)',
    badgeText: '#0c0e14',
  },
  parchment: {
    bgRgb: '253, 249, 240',
    textPrimary: '#14110b',
    textSecondary: '#292318',
    textMuted: '#574c3a',
    accentGold: '#b45309',
    accentGoldSoft: '#92400e',
    borderGold: 'rgba(180, 83, 9, 0.55)',
    borderSubtle: 'rgba(20, 17, 11, 0.16)',
    panelBg: 'rgba(20, 17, 11, 0.045)',
    sabbathActiveBg: 'rgba(217, 119, 6, 0.18)',
    sabbathBoxBg: 'rgba(245, 238, 222, 0.7)',
    badgeText: '#ffffff',
  },
  celestial: {
    bgRgb: '11, 22, 44',
    textPrimary: '#f8fafc',
    textSecondary: '#dbeafe',
    textMuted: '#93c5fd',
    accentGold: '#fbbf24',
    accentGoldSoft: '#fde68a',
    borderGold: 'rgba(251, 191, 36, 0.55)',
    borderSubtle: 'rgba(147, 197, 253, 0.22)',
    panelBg: 'rgba(30, 58, 138, 0.22)',
    sabbathActiveBg: 'rgba(251, 191, 36, 0.22)',
    sabbathBoxBg: 'rgba(15, 23, 42, 0.5)',
    badgeText: '#0b162c',
  },
  mono: {
    bgRgb: '8, 8, 10',
    textPrimary: '#ffffff',
    textSecondary: '#e4e4e7',
    textMuted: '#a1a1aa',
    accentGold: '#eab308',
    accentGoldSoft: '#fde047',
    borderGold: 'rgba(255, 255, 255, 0.65)',
    borderSubtle: 'rgba(255, 255, 255, 0.22)',
    panelBg: 'rgba(255, 255, 255, 0.06)',
    sabbathActiveBg: 'rgba(234, 179, 8, 0.24)',
    sabbathBoxBg: 'rgba(24, 24, 27, 0.65)',
    badgeText: '#09090b',
  },
};

const WALLPAPER_STYLES: Record<
  SimulatedWallpaperId,
  { namePt: string; nameEn: string; backgroundCss: string; accentDot: string }
> = {
  jerusalem_night: {
    namePt: 'Noite Estrelada · Jerusalém',
    nameEn: 'Starry Night · Jerusalem',
    backgroundCss:
      'radial-gradient(circle at 20% 20%, rgba(245, 158, 11, 0.22) 0%, transparent 45%), radial-gradient(circle at 80% 15%, rgba(56, 189, 248, 0.2) 0%, transparent 40%), linear-gradient(160deg, #060913 0%, #111c38 52%, #1e1b2e 100%)',
    accentDot: '#38bdf8',
  },
  judean_sunset: {
    namePt: 'Crepúsculo Dourado · Judeia',
    nameEn: 'Golden Dusk · Judea',
    backgroundCss:
      'radial-gradient(circle at 75% 25%, rgba(251, 191, 36, 0.42) 0%, transparent 50%), linear-gradient(165deg, #2a1215 0%, #5b2316 42%, #9a4719 78%, #d97706 100%)',
    accentDot: '#f59e0b',
  },
  olive_grove: {
    namePt: 'Jardim de Oliveiras · Dia',
    nameEn: 'Olive Grove · Daylight',
    backgroundCss:
      'radial-gradient(circle at 30% 20%, rgba(254, 240, 138, 0.35) 0%, transparent 50%), linear-gradient(155deg, #132a1e 0%, #1f4431 48%, #365e42 82%, #658354 100%)',
    accentDot: '#34d399',
  },
  minimal_slate: {
    namePt: 'Mármore Arquivístico',
    nameEn: 'Archival Slate',
    backgroundCss:
      'radial-gradient(circle at 50% 0%, rgba(148, 163, 184, 0.18) 0%, transparent 60%), linear-gradient(180deg, #18181b 0%, #27272a 50%, #09090b 100%)',
    accentDot: '#a1a1aa',
  },
};

export const AndroidHomeWidgetStudio: React.FC<AndroidHomeWidgetStudioProps> = ({
  systemDate,
  config,
  language,
  onOpenGpsModal,
  isModal = false,
  onCloseModal,
}) => {
  const isPt = language === 'pt';
  const [widgetConfig, setWidgetConfig] = useState<AndroidWidgetConfig>(() =>
    loadAndroidWidgetConfig()
  );
  const [now, setNow] = useState<Date>(() => new Date());
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const widgetCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const snapshot = useMemo(
    () => buildLiveAndroidWidgetSnapshot(now, config, widgetConfig, language),
    [now, config, widgetConfig, language]
  );

  // Persist and auto-sync to Android APK whenever widgetConfig changes
  const updateWidgetConfig = (partial: Partial<AndroidWidgetConfig>) => {
    setWidgetConfig((prev) => {
      const next = { ...prev, ...partial };
      saveAndroidWidgetConfig(next);
      const nextSnap = buildLiveAndroidWidgetSnapshot(new Date(), config, next, language);
      syncWidgetToAndroidBridge(nextSnap, next);
      return next;
    });
  };

  // Initial sync to AndroidBridge when mounted
  useEffect(() => {
    syncWidgetToAndroidBridge(snapshot, widgetConfig);
  }, [config.userLocation, language]);

  const handlePinOrSyncWidget = () => {
    saveAndroidWidgetConfig(widgetConfig);
    const result = requestPinWidgetOnAndroid(snapshot, widgetConfig);
    if (result.supported) {
      setSyncStatusMessage(
        isPt
          ? 'Widget sincronizado com a Tela Inicial do Android! Se o seu launcher suportar fixação direta, confirme na janela do sistema.'
          : 'Widget synced with Android Home Screen! If your launcher supports direct pinning, confirm in the system prompt.'
      );
    } else {
      setSyncStatusMessage(
        isPt
          ? 'Configuração do Widget salva (Transparência Alpha: ' +
              widgetConfig.alphaPercent +
              '%). No APK Android, toque longo na Tela Inicial → Widgets → Calendário das Dimenúveis.'
          : 'Widget configuration saved (Alpha Transparency: ' +
              widgetConfig.alphaPercent +
              '%). On the Android APK, long-press Home Screen → Widgets → Dimenuous Calendar.'
      );
    }
    setTimeout(() => {
      setSyncStatusMessage(null);
    }, 7000);
  };

  const handleExportWidgetPng = async () => {
    if (!widgetCardRef.current || isExportingPng) return;
    setIsExportingPng(true);
    try {
      const canvas = await toCanvas(widgetCardRef.current, {
        pixelRatio: 3,
        backgroundColor: 'transparent',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const fileName = `Widget-Dimenuveis-Ano-${snapshot.sacredYear}-Alpha-${widgetConfig.alphaPercent}.png`;

      if (typeof window !== 'undefined' && window.AndroidBridge?.savePngFile) {
        window.AndroidBridge.savePngFile(fileName, dataUrl);
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error('Failed to export widget PNG', e);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleResetDefaults = () => {
    updateWidgetConfig(DEFAULT_ANDROID_WIDGET_CONFIG);
    setSyncStatusMessage(
      isPt
        ? 'Configurações do widget restauradas para o padrão.'
        : 'Widget settings restored to defaults.'
    );
    setTimeout(() => setSyncStatusMessage(null), 4000);
  };

  const palette = WIDGET_THEME_PALETTES[widgetConfig.widgetTheme];
  const alphaFraction = Math.max(0, Math.min(1, widgetConfig.alphaPercent / 100));
  const surfaceBgColor = `rgba(${palette.bgRgb}, ${alphaFraction.toFixed(2)})`;
  const wallpaper = WALLPAPER_STYLES[widgetConfig.previewWallpaper];

  // Text shadow when alpha transparency is very low (< 40%) so text stays crisp over any wallpaper
  const adaptiveTextShadow =
    widgetConfig.alphaPercent < 45 && widgetConfig.widgetTheme !== 'parchment'
      ? '0 1px 4px rgba(0, 0, 0, 0.85)'
      : 'none';

  const bodyContent = (
    <div className="space-y-6 font-serif">
      {/* Studio Header Banner */}
      <div className="border border-slate-800 bg-slate-950 p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-amber-400 font-bold">
            <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isPt
                ? 'Estúdio de Widget Android · Tela Inicial'
                : 'Android Home Screen Widget Studio'}
            </span>
          </div>
          <h3 className="text-lg sm:text-2xl font-bold text-slate-100">
            {isPt
              ? 'Horológio Sagrado Dimenúveis & Transparência Alpha'
              : 'Dimenuous Sacred Horologium & Alpha Transparency'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            {isPt
              ? 'Personalize o widget nativo da tela inicial do Android com a data do Calendário de 13 Meses, hora ao vivo e vigília solar, fase da Lua (e luz de 14 partes de Enoque), localização GPS, contagem regressiva para o pôr do sol do Sábado e controle deslizante de Transparência Alpha (0% a 100%).'
              : 'Customize the native Android home screen widget with the 13-Month Sacred Date, live hour & solar watch, Moon phase (and 14-part Enoch light), GPS location, live Sabbath sunset countdown, and an Alpha Transparency slider (0% to 100%).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePinOrSyncWidget}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shadow-md"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>
              {isPt ? 'Fixar / Sincronizar no Android' : 'Pin / Sync to Android'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportWidgetPng}
            disabled={isExportingPng}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-amber-500/50 bg-slate-900 hover:bg-slate-800 text-amber-300 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isExportingPng
                ? isPt
                  ? 'Exportando...'
                  : 'Exporting...'
                : isPt
                  ? 'Baixar Widget (.PNG)'
                  : 'Download Widget (.PNG)'}
            </span>
          </button>

          {isModal && onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="inline-flex items-center justify-center w-9 h-9 border border-slate-700 bg-slate-900 hover:border-amber-500/60 text-slate-200 transition-colors cursor-pointer"
              title={isPt ? 'Fechar' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {syncStatusMessage && (
        <div className="p-3.5 border border-emerald-500/50 bg-emerald-950/30 text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncStatusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatusMessage(null)}
            className="text-xs underline text-emerald-300 hover:text-white cursor-pointer shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {/* Main 12-Column Interactive Workspace: Left (7 cols) Live Android Screen Simulator, Right (5 cols) Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Simulated Android Home Screen + Live Translucent Widget */}
        <div className="lg:col-span-7 border border-slate-800 bg-slate-950 overflow-hidden">
          {/* Top Simulator Toolbar: Wallpaper Selector + Alpha Readout */}
          <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold uppercase tracking-wider text-amber-400">
                {isPt
                  ? 'Simulador ao Vivo da Tela Inicial Android'
                  : 'Live Android Home Screen Simulator'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 italic mr-1">
                {isPt ? 'Papel de Parede:' : 'Wallpaper:'}
              </span>
              {(
                ['jerusalem_night', 'judean_sunset', 'olive_grove', 'minimal_slate'] as SimulatedWallpaperId[]
              ).map((wpId) => {
                const wp = WALLPAPER_STYLES[wpId];
                const active = widgetConfig.previewWallpaper === wpId;
                return (
                  <button
                    key={wpId}
                    type="button"
                    onClick={() => updateWidgetConfig({ previewWallpaper: wpId })}
                    className={`px-2 py-1 border text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      active
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                        : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: wp.accentDot }}
                    />
                    <span>{isPt ? wp.namePt.split(' · ')[0] : wp.nameEn.split(' · ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simulated Android Phone Viewport Canvas */}
          <div
            className="android-widget-preview-lock relative p-3 sm:p-5 min-h-[420px] flex flex-col justify-between transition-all duration-300"
            style={{
              backgroundImage: wallpaper.backgroundCss,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Subtle Decorative Checkerboard / Celestial Grid Dots to Emphasize Alpha Transparency */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />

            {/* Simulated Android Status Bar */}
            <div
              className="relative z-10 flex items-center justify-between px-2 pb-3 text-[11px] font-sans tracking-wide select-none"
              style={{ color: '#f8fafc', textShadow: '0 1px 2px rgba(0,0,0,0.75)' }}
            >
              <div className="flex items-center gap-2 font-semibold tabular-nums">
                <span>
                  {now.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </span>
                <span className="opacity-75">·</span>
                <span className="text-[10px] opacity-90">
                  {isPt
                    ? `Grade Vertical ${widgetConfig.widgetSize.replace('x', '×')}`
                    : `Vertical Grid ${widgetConfig.widgetSize.replace('x', '×')}`}
                </span>
              </div>
              <div className="flex items-center gap-2.5 opacity-90">
                <span className="text-[10px] font-semibold tabular-nums">
                  Alpha {widgetConfig.alphaPercent}%
                </span>
                <Wifi className="w-3.5 h-3.5" />
                <BatteryCharging className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* THE ELEGANT ANDROID HOME WIDGET CARD — True Vertical Portrait Layout */}
            <div className="relative z-10 my-auto flex items-center justify-center py-1">
              <div
                ref={widgetCardRef}
                className={`android-widget-preview-lock w-full max-w-[440px] mx-auto rounded-2xl transition-all duration-200 relative ${
                  widgetConfig.frostedBlur && widgetConfig.alphaPercent > 5
                    ? 'backdrop-blur-md'
                    : ''
                }`}
                style={{
                  backgroundColor: surfaceBgColor,
                  color: palette.textPrimary,
                  border: widgetConfig.goldBorder
                    ? `1.5px solid ${palette.borderGold}`
                    : `1px solid ${palette.borderSubtle}`,
                  boxShadow:
                    widgetConfig.alphaPercent > 15
                      ? '0 18px 42px -10px rgba(0, 0, 0, 0.55)'
                      : 'none',
                  textShadow: adaptiveTextShadow,
                  padding: widgetConfig.widgetSize === '3x4' ? '16px 18px' : '20px 22px',
                }}
              >
                {/* Inner Ornamental Corner Hairlines when Gold Border is enabled */}
                {widgetConfig.goldBorder && (
                  <div
                    className="pointer-events-none absolute inset-1.5 rounded-xl"
                    style={{
                      border: `1px solid ${palette.borderSubtle}`,
                    }}
                  />
                )}

                <div className="relative z-10 space-y-3">
                  {/* SECTION 1: Sacred Calendar Date & Live Horological Clock (Stacked Vertically) */}
                  <div className="space-y-2">
                    {/* Top Kicker: Sacred Year + Civil Date */}
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] leading-snug uppercase tracking-wider font-bold tabular-nums">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <Sparkles
                          className="w-3 h-3 shrink-0"
                          style={{ color: palette.accentGold }}
                        />
                        <span style={{ color: palette.accentGold }}>
                          {snapshot.sacredYearLabel}
                        </span>
                        <span style={{ color: palette.textMuted }}>·</span>
                        <span style={{ color: palette.textSecondary }}>
                          {snapshot.gregorianDateStr}
                        </span>
                      </div>
                    </div>

                    {/* Sacred Date Headline & Subline */}
                    <div className="space-y-0.5">
                      <div
                        className="text-lg sm:text-xl font-bold leading-snug tracking-tight tabular-nums"
                        style={{ color: palette.textPrimary }}
                      >
                        {snapshot.sacredDateHeadline}
                      </div>
                      <div
                        className="text-xs italic leading-snug tabular-nums"
                        style={{ color: palette.textSecondary }}
                      >
                        {snapshot.sacredSubline}
                      </div>
                    </div>

                    {/* Live Digital Hour & Solar/Night Watch Row */}
                    <div
                      className="flex flex-wrap items-baseline justify-between gap-2 pt-2"
                      style={{ borderTop: `1px solid ${palette.borderSubtle}` }}
                    >
                      <div
                        className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight leading-snug whitespace-nowrap"
                        style={{ color: palette.accentGold }}
                      >
                        {snapshot.timeFormatted}
                        {snapshot.ampmSuffix && (
                          <span className="text-xs ml-1.5 font-bold">
                            {snapshot.ampmSuffix}
                          </span>
                        )}
                      </div>
                      <div
                        className="text-xs italic leading-snug tabular-nums"
                        style={{ color: palette.textSecondary }}
                      >
                        {snapshot.biblicalWatchLabel}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Lunar Phase & 1 Enoch 14 Parts (Full-Width Vertical Card) */}
                  <div
                    className="p-3 rounded-xl flex flex-col justify-between gap-2"
                    style={{
                      backgroundColor: palette.panelBg,
                      border: `1px solid ${palette.borderSubtle}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="shrink-0">
                        <LunarPhaseIcon
                          phaseName={snapshot.lunarPhaseKey as any}
                          size={34}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div
                          className="text-xs sm:text-sm font-bold leading-snug"
                          style={{ color: palette.textPrimary }}
                        >
                          {snapshot.lunarPhaseLocalized}
                        </div>
                        <div
                          className="text-[11px] font-bold tabular-nums leading-snug"
                          style={{ color: palette.accentGold }}
                        >
                          {isPt ? 'Iluminação' : 'Illumination'}: {snapshot.lunarIlluminationPercent}% · {snapshot.lunarAgeDays}
                        </div>
                      </div>
                    </div>

                    {/* 1 Enoch 14-Part Lunar Light Progress */}
                    <div className="space-y-1 pt-1 border-t border-white/10">
                      <div className="flex items-center justify-between gap-2 text-[11px] leading-snug tabular-nums">
                        <span style={{ color: palette.textSecondary }}>
                          {snapshot.enochLunarPartsLabel}
                        </span>
                        <span
                          className="font-bold shrink-0"
                          style={{ color: palette.accentGold }}
                        >
                          {snapshot.enochLunarParts}/14
                        </span>
                      </div>
                      <div className="flex items-center gap-1 w-full">
                        {Array.from({ length: 14 }).map((_, i) => {
                          const lit = i < snapshot.enochLunarParts;
                          return (
                            <span
                              key={i}
                              className="flex-1 h-1.5 rounded-xs"
                              style={{
                                backgroundColor: lit
                                  ? palette.accentGold
                                  : 'rgba(148, 163, 184, 0.25)',
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: GPS Location & Sun Ephemeris (Full-Width Vertical Card) */}
                  {widgetConfig.showGpsAndSunTimes && (
                    <div
                      className="p-3 rounded-xl flex flex-col justify-between gap-2"
                      style={{
                        backgroundColor: palette.panelBg,
                        border: `1px solid ${palette.borderSubtle}`,
                      }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: palette.accentGold }}
                          />
                          <span
                            className="text-xs sm:text-sm font-bold leading-snug"
                            style={{ color: palette.textPrimary }}
                          >
                            {snapshot.locationCity}
                          </span>
                        </div>
                        <span
                          className="text-[11px] tabular-nums leading-snug"
                          style={{ color: palette.textMuted }}
                        >
                          {snapshot.coordinatesFormatted}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/10 text-[11px] tabular-nums">
                        <div className="flex items-center gap-1">
                          <Sunrise
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: palette.accentGold }}
                          />
                          <span style={{ color: palette.textSecondary }}>
                            {snapshot.sunriseStr}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <Sun
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: palette.accentGold }}
                          />
                          <span style={{ color: palette.textSecondary }}>
                            {snapshot.solarNoonStr}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Sunset
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: palette.accentGold }}
                          />
                          <span
                            className="font-bold"
                            style={{ color: palette.accentGoldSoft }}
                          >
                            {snapshot.sunsetStr}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION 4: Live Sabbath Sunset Countdown Clock + 7-Day Sabbath Rhythm Bar */}
                  {widgetConfig.showSabbathCountdown && (
                    <div
                      className="p-3 rounded-xl space-y-2.5"
                      style={{
                        backgroundColor: snapshot.isSabbathActive
                          ? palette.sabbathActiveBg
                          : palette.sabbathBoxBg,
                        border: `1px solid ${palette.borderGold}`,
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug">
                            <Sunset
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: palette.accentGold }}
                            />
                            <span
                              className="text-[11px] sm:text-xs font-bold uppercase tracking-wider"
                              style={{ color: palette.accentGold }}
                            >
                              {snapshot.sabbathStatusTitle}
                            </span>
                            <span style={{ color: palette.textMuted }}>·</span>
                            <span
                              className="text-xs sm:text-sm font-bold tabular-nums"
                              style={{ color: palette.textPrimary }}
                            >
                              {snapshot.sabbathTargetDateLabel}
                            </span>
                          </div>
                          <div
                            className="text-[11px] italic leading-snug tabular-nums"
                            style={{ color: palette.textSecondary }}
                          >
                            {snapshot.sabbathSunsetLabel}
                          </div>
                        </div>

                        {/* Live Ticking Countdown Readout */}
                        <div
                          className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold tabular-nums tracking-wider leading-snug whitespace-nowrap shrink-0"
                          style={{
                            backgroundColor: palette.accentGold,
                            color: palette.badgeText,
                            textShadow: 'none',
                          }}
                        >
                          {snapshot.sabbathCountdownStr}
                        </div>
                      </div>

                      {/* 7-Day Weekly Sabbath Rhythm Strip — 2-line stacked cells */}
                      {widgetConfig.showWeeklySabbathBar && (
                        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-0.5">
                          {[1, 2, 3, 4, 5, 6, 7].map((dNum) => {
                            const isCurrentDay =
                              !snapshot.isDayZero && snapshot.dayOfWeek === dNum;
                            const isSeventhSabbath = dNum === 7;
                            return (
                              <div
                                key={dNum}
                                className="py-1 px-1 rounded-md text-center tabular-nums transition-all flex flex-col items-center justify-center leading-tight"
                                style={{
                                  backgroundColor: isCurrentDay
                                    ? palette.accentGold
                                    : isSeventhSabbath
                                      ? 'rgba(245, 158, 11, 0.18)'
                                      : 'rgba(148, 163, 184, 0.14)',
                                  color: isCurrentDay
                                    ? palette.badgeText
                                    : isSeventhSabbath
                                      ? palette.accentGold
                                      : palette.textSecondary,
                                  fontWeight: isCurrentDay || isSeventhSabbath ? 700 : 500,
                                  border: isCurrentDay
                                    ? `1px solid ${palette.accentGoldSoft}`
                                    : '1px solid transparent',
                                  textShadow: 'none',
                                }}
                              >
                                <span className="text-[9px] uppercase tracking-tight opacity-85">
                                  {isSeventhSabbath
                                    ? isPt
                                      ? 'SÁB'
                                      : 'SAB'
                                    : isPt
                                      ? 'Dia'
                                      : 'Day'}
                                </span>
                                <span className="text-[11px] sm:text-xs font-bold">
                                  {isSeventhSabbath ? (isPt ? '7º' : '7th') : dNum}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 5 (4x5 and 4x6 Vertical Sizes): 13-Sign Mazzaroth, 1 Enoch Gate & Next Biblical Feast (Stacked Vertically) */}
                  {widgetConfig.widgetSize !== '3x4' &&
                    (widgetConfig.showZodiacAndEnochGate || widgetConfig.showNextFeast) && (
                      <div className="space-y-2.5 text-xs">
                        {widgetConfig.showZodiacAndEnochGate && (
                          <div
                            className="p-2.5 rounded-xl flex items-start gap-2.5"
                            style={{
                              backgroundColor: palette.panelBg,
                              border: `1px solid ${palette.borderSubtle}`,
                            }}
                          >
                            <span className="text-lg leading-snug shrink-0">
                              {snapshot.zodiacSymbol}
                            </span>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div
                                className="font-bold leading-snug"
                                style={{ color: palette.textPrimary }}
                              >
                                {snapshot.zodiacName} · {snapshot.zodiacArchetype}
                              </div>
                              <div
                                className="text-[11px] leading-snug tabular-nums"
                                style={{ color: palette.textSecondary }}
                              >
                                {snapshot.enochGateLabel} · {snapshot.enochDayNightRatioLabel}
                              </div>
                            </div>
                          </div>
                        )}

                        {widgetConfig.showNextFeast && (
                          <div
                            className="p-2.5 rounded-xl flex items-start justify-between gap-2.5"
                            style={{
                              backgroundColor: palette.panelBg,
                              border: `1px solid ${palette.borderSubtle}`,
                            }}
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div
                                className="text-[10px] uppercase tracking-wider font-bold leading-snug"
                                style={{ color: palette.accentGold }}
                              >
                                {isPt ? 'Próxima Solenidade (Lv 23)' : 'Next Appointed Feast'}
                              </div>
                              <div
                                className="font-bold leading-snug tabular-nums"
                                style={{ color: palette.textPrimary }}
                              >
                                {snapshot.nextFeastLabel}
                              </div>
                            </div>
                            <Calendar
                              className="w-4 h-4 shrink-0 mt-0.5"
                              style={{ color: palette.accentGold }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                  {/* SECTION 6 (4x6 Full Vertical Size): 7,000-Year Millennial Clock & Daily Scriptural Watchword */}
                  {widgetConfig.widgetSize === '4x6' && (
                    <div className="space-y-2.5">
                      {widgetConfig.showMillennialClock && (
                        <div
                          className="p-3 rounded-xl space-y-1.5"
                          style={{
                            backgroundColor: palette.panelBg,
                            border: `1px solid ${palette.borderSubtle}`,
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
                            <span
                              className="font-bold leading-snug"
                              style={{ color: palette.accentGold }}
                            >
                              {snapshot.millennialSummaryLabel}
                            </span>
                            <span
                              className="tabular-nums font-bold shrink-0"
                              style={{ color: palette.textSecondary }}
                            >
                              {snapshot.millennialProgressPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div
                            className="w-full h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'rgba(148, 163, 184, 0.22)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${snapshot.millennialProgressPercent}%`,
                                backgroundColor: palette.accentGold,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {widgetConfig.showDailyVerse && (
                        <div
                          className="p-3 rounded-xl text-[11px] leading-relaxed"
                          style={{
                            backgroundColor: palette.panelBg,
                            border: `1px solid ${palette.borderSubtle}`,
                          }}
                        >
                          <span
                            className="font-bold mr-1.5 tabular-nums"
                            style={{ color: palette.accentGold }}
                          >
                            {snapshot.dailyVerseRef}:
                          </span>
                          <span
                            className="italic"
                            style={{ color: palette.textSecondary }}
                          >
                            “{snapshot.dailyVerseQuote}”
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Simulated Android Dock Bar */}
            <div
              className="relative z-10 pt-4 flex items-center justify-between text-[11px]"
              style={{ color: '#f8fafc', textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
            >
              <span>
                {isPt
                  ? `Papel de parede: ${wallpaper.namePt}`
                  : `Backdrop: ${wallpaper.nameEn}`}
              </span>
              {onOpenGpsModal && (
                <button
                  type="button"
                  onClick={onOpenGpsModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(12, 14, 20, 0.72)',
                    border: '1px solid rgba(251, 191, 36, 0.55)',
                    color: '#fcd34d',
                  }}
                >
                  <MapPin className="w-3 h-3 shrink-0" style={{ color: '#fcd34d' }} />
                  <span>{isPt ? 'Ajustar GPS' : 'Adjust GPS'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Alpha Transparency Slider & Customization Controls */}
        <div className="lg:col-span-5 border border-slate-800 bg-slate-950 divide-y divide-slate-800">
          {/* 1. ALPHA TRANSPARENCY SLIDER SECTION */}
          <div className="p-4 sm:p-5 space-y-3.5 bg-amber-950/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                <label
                  htmlFor="widget-alpha-slider"
                  className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400"
                >
                  {isPt
                    ? '1. Transparência Alpha (Opacidade)'
                    : '1. Alpha Transparency (Opacity)'}
                </label>
              </div>
              <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-bold text-xs tabular-nums shrink-0 whitespace-nowrap">
                {widgetConfig.alphaPercent}%
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isPt
                ? 'Deslize entre 0% (fundo 100% transparente sobre o papel de parede do Android) e 100% (cartão editorial sólido):'
                : 'Slide between 0% (100% transparent background over your Android wallpaper) and 100% (solid editorial card):'}
            </p>

            <div className="space-y-2 pt-1">
              <input
                id="widget-alpha-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={widgetConfig.alphaPercent}
                onChange={(e) =>
                  updateWidgetConfig({ alphaPercent: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />

              {/* Quick Alpha Presets */}
              <div className="grid grid-cols-5 gap-1.5 pt-1 text-[11px] tabular-nums">
                {[
                  { val: 0, subPt: 'Cristal', subEn: 'Clear' },
                  { val: 25, subPt: 'Leve', subEn: 'Light' },
                  { val: 55, subPt: 'Vidro', subEn: 'Glass' },
                  { val: 75, subPt: 'Ideal', subEn: 'Ideal' },
                  { val: 100, subPt: 'Sólido', subEn: 'Solid' },
                ].map((preset) => {
                  const isSelected = widgetConfig.alphaPercent === preset.val;
                  return (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => updateWidgetConfig({ alphaPercent: preset.val })}
                      className={`py-1.5 px-1 border text-center transition-colors cursor-pointer leading-tight ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-500/50'
                      }`}
                    >
                      <div className="font-bold">{preset.val}%</div>
                      <div className="text-[10px] opacity-90">
                        {isPt ? preset.subPt : preset.subEn}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Glass Blur & Gold Filigree Frame Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <label className="flex items-center gap-2 p-2.5 border border-slate-800 bg-slate-900/60 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={widgetConfig.frostedBlur}
                  onChange={(e) =>
                    updateWidgetConfig({ frostedBlur: e.target.checked })
                  }
                  className="accent-amber-500 shrink-0"
                />
                <span>
                  {isPt ? 'Vidro Fosco (Blur)' : 'Frosted Glass Blur'}
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 border border-slate-800 bg-slate-900/60 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={widgetConfig.goldBorder}
                  onChange={(e) =>
                    updateWidgetConfig({ goldBorder: e.target.checked })
                  }
                  className="accent-amber-500 shrink-0"
                />
                <span>
                  {isPt ? 'Moldura Filigrana Dourada' : 'Gold Filigree Frame'}
                </span>
              </label>
            </div>
          </div>

          {/* 2. WIDGET THEME & SIZE SELECTOR */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {isPt ? '2. Estilo Visual do Widget' : '2. Widget Surface Style'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  {
                    id: 'obsidian' as AndroidWidgetTheme,
                    labelPt: 'Obsidiana & Ouro',
                    labelEn: 'Obsidian & Gold',
                  },
                  {
                    id: 'parchment' as AndroidWidgetTheme,
                    labelPt: 'Pergaminho Real',
                    labelEn: 'Royal Parchment',
                  },
                  {
                    id: 'celestial' as AndroidWidgetTheme,
                    labelPt: 'Safira Celeste',
                    labelEn: 'Celestial Blue',
                  },
                  {
                    id: 'mono' as AndroidWidgetTheme,
                    labelPt: 'Monocromático',
                    labelEn: 'Monochrome',
                  },
                ].map((tItem) => {
                  const active = widgetConfig.widgetTheme === tItem.id;
                  return (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() => updateWidgetConfig({ widgetTheme: tItem.id })}
                      className={`py-2 px-3 border text-center transition-colors cursor-pointer ${
                        active
                          ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-500/50'
                      }`}
                    >
                      {isPt ? tItem.labelPt : tItem.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {isPt
                    ? '3. Dimensão na Grade da Tela Inicial (Vertical)'
                    : '3. Home Screen Grid Size (Vertical)'}
                </div>
                <span className="text-[11px] font-bold text-amber-300 tabular-nums">
                  {widgetConfig.widgetSize.replace('x', '×')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                {[
                  {
                    id: '3x4' as AndroidWidgetSize,
                    dim: '3×4',
                    subPt: 'Vertical Compacto',
                    subEn: 'Compact Vertical',
                  },
                  {
                    id: '4x5' as AndroidWidgetSize,
                    dim: '4×5',
                    subPt: 'Vertical Editorial',
                    subEn: 'Editorial Vertical',
                  },
                  {
                    id: '4x6' as AndroidWidgetSize,
                    dim: '4×6',
                    subPt: 'Vertical Completo',
                    subEn: 'Full Vertical',
                  },
                ].map((sz) => {
                  const active = widgetConfig.widgetSize === sz.id;
                  return (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => updateWidgetConfig({ widgetSize: sz.id })}
                      className={`py-2 px-1.5 border text-center transition-colors cursor-pointer leading-tight ${
                        active
                          ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-500/50'
                      }`}
                    >
                      <div className="font-bold">{sz.dim}</div>
                      <div className="text-[10px] opacity-90 mt-0.5">
                        {isPt ? sz.subPt : sz.subEn}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. MODULE TOGGLES */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {isPt ? '4. Módulos & Informações Exibidas' : '4. Displayed Widget Modules'}
              </span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-300 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isPt ? 'Padrão' : 'Reset'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                {
                  key: 'showSeconds' as const,
                  labelPt: 'Segundos no Relógio (:SS)',
                  labelEn: 'Clock Seconds (:SS)',
                },
                {
                  key: 'use24HourFormat' as const,
                  labelPt: 'Relógio 24 Horas',
                  labelEn: '24-Hour Clock Format',
                },
                {
                  key: 'showGpsAndSunTimes' as const,
                  labelPt: 'GPS & Sol (Nascer / Pôr)',
                  labelEn: 'GPS & Sun (Rise / Set)',
                },
                {
                  key: 'showSabbathCountdown' as const,
                  labelPt: 'Contagem Regressiva do Sábado',
                  labelEn: 'Sabbath Sunset Countdown',
                },
                {
                  key: 'showWeeklySabbathBar' as const,
                  labelPt: 'Barra dos 7 Dias da Semana',
                  labelEn: '7-Day Weekly Rhythm Bar',
                },
                {
                  key: 'showZodiacAndEnochGate' as const,
                  labelPt: '13 Signos & Porta de Enoque',
                  labelEn: '13 Signs & Enoch Gate',
                },
                {
                  key: 'showNextFeast' as const,
                  labelPt: 'Próxima Festa (Levítico 23)',
                  labelEn: 'Next Feast (Leviticus 23)',
                },
                {
                  key: 'showMillennialClock' as const,
                  labelPt: 'Relógio Milenar (4×6)',
                  labelEn: 'Millennial Clock (4×6)',
                },
                {
                  key: 'showDailyVerse' as const,
                  labelPt: 'Versículo Bíblico Diário (4×6)',
                  labelEn: 'Daily Scriptural Verse (4×6)',
                },
              ].map((mod) => (
                <label
                  key={mod.key}
                  className="flex items-start gap-2 p-2.5 border border-slate-800 bg-slate-900/40 text-slate-200 cursor-pointer leading-snug"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(widgetConfig[mod.key])}
                    onChange={(e) =>
                      updateWidgetConfig({ [mod.key]: e.target.checked })
                    }
                    className="accent-amber-500 shrink-0 mt-0.5"
                  />
                  <span>{isPt ? mod.labelPt : mod.labelEn}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. HOW TO ADD ON ANDROID INSTRUCTIONS */}
          <div className="p-4 sm:p-5 bg-slate-900/30 space-y-2 text-xs text-slate-300 leading-relaxed">
            <div className="font-bold text-amber-300 uppercase tracking-wider">
              {isPt
                ? 'Como adicionar na Tela Inicial do Android:'
                : 'How to add to your Android Home Screen:'}
            </div>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                {isPt
                  ? 'Ajuste a Transparência Alpha e o estilo acima e toque em "Fixar / Sincronizar no Android".'
                  : 'Adjust the Alpha Transparency and style above and tap "Pin / Sync to Android".'}
              </li>
              <li>
                {isPt
                  ? 'Ou, na tela inicial do seu celular Android, mantenha o dedo pressionado em um espaço vazio → toque em "Widgets" → escolha "Calendário das Dimenúveis".'
                  : 'Or, on your Android phone home screen, long-press an empty area → tap "Widgets" → select "Dimenuous Calendar".'}
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={
          isPt
            ? 'Estúdio de Widget Android Dimenúveis'
            : 'Dimenuous Android Widget Studio'
        }
      >
        <div className="relative w-full max-w-6xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          {bodyContent}
        </div>
      </div>
    );
  }

  return bodyContent;
};
