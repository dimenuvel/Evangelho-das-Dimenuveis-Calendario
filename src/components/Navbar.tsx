/**
 * @file src/components/Navbar.tsx
 * Classical book-like top masthead and fixed bottom icon navigation bar
 * for Gospel of Dimenuous / Evangelho das Dimenúveis.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { LanguageSelector } from './LanguageSelector';
import {
  Moon,
  Sun,
  Contrast,
  HelpCircle,
  Compass,
  CalendarDays,
  Flame,
  ShieldCheck,
  Hourglass,
  History,
  ScrollText,
  BookOpen,
  SlidersHorizontal,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';

export type NavTab =
  | 'TODAY'
  | 'CALENDAR'
  | 'FEASTS'
  | 'MOON'
  | 'SABBATH'
  | 'GREAT_WEEK'
  | 'CHRONOLOGY_LAB'
  | 'SCRIPTURE_HISTORY'
  | 'DIMENUEVEIS'
  | 'SETTINGS'
  | 'TESTS';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  systemDate: Date;
  theme: 'night' | 'day' | 'mono';
  onToggleTheme: () => void;
  onSelectTheme?: (theme: 'night' | 'day' | 'mono') => void;
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  onOpenTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  systemDate,
  theme,
  onToggleTheme,
  onSelectTheme,
  language,
  onSelectLanguage,
  onOpenTour,
}) => {
  const t = TRANSLATIONS[language];
  const isPt = language === 'pt';
  const [showThemePreview, setShowThemePreview] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showThemePreview) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemePreview(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showThemePreview]);

  const navItems: {
    id: NavTab;
    label: string;
    shortLabel: string;
    roman: string;
    icon: LucideIcon;
  }[] = [
    {
      id: 'TODAY',
      label: t.tabs.TODAY,
      shortLabel: isPt ? 'Hoje' : 'Today',
      roman: 'I',
      icon: Compass,
    },
    {
      id: 'CALENDAR',
      label: t.tabs.CALENDAR,
      shortLabel: isPt ? '13 Meses' : '13-Mo',
      roman: 'II',
      icon: CalendarDays,
    },
    {
      id: 'FEASTS',
      label: t.tabs.FEASTS,
      shortLabel: isPt ? 'Festas' : 'Feasts',
      roman: 'III',
      icon: Flame,
    },
    {
      id: 'MOON',
      label: t.tabs.MOON,
      shortLabel: isPt ? 'Lua' : 'Moon',
      roman: 'IV',
      icon: Moon,
    },
    {
      id: 'SABBATH',
      label: t.tabs.SABBATH,
      shortLabel: isPt ? 'Sábado' : 'Sabbath',
      roman: 'V',
      icon: ShieldCheck,
    },
    {
      id: 'GREAT_WEEK',
      label: t.tabs.GREAT_WEEK,
      shortLabel: isPt ? '7.000a' : '7,000y',
      roman: 'VI',
      icon: Hourglass,
    },
    {
      id: 'CHRONOLOGY_LAB',
      label: t.tabs.CHRONOLOGY_LAB,
      shortLabel: isPt ? 'Cronol.' : 'Chrono.',
      roman: 'VII',
      icon: History,
    },
    {
      id: 'SCRIPTURE_HISTORY',
      label: t.tabs.SCRIPTURE_HISTORY,
      shortLabel: isPt ? 'Eclipses' : 'Eclipses',
      roman: 'VIII',
      icon: ScrollText,
    },
    {
      id: 'DIMENUEVEIS',
      label: t.tabs.DIMENUEVEIS,
      shortLabel: isPt ? 'Cânon' : 'Canon',
      roman: 'IX',
      icon: BookOpen,
    },
    {
      id: 'SETTINGS',
      label: t.tabs.SETTINGS,
      shortLabel: isPt ? 'Ajustes' : 'Settings',
      roman: 'X',
      icon: SlidersHorizontal,
    },
    {
      id: 'TESTS',
      label: t.tabs.TESTS,
      shortLabel: isPt ? 'Testes' : 'Tests',
      roman: 'XI',
      icon: CheckCircle2,
    },
  ];

  const activeItem = navItems.find((item) => item.id === activeTab) || navItems[0];

  return (
    <>
      {/* Top Classical Book Masthead (Title, Language, Day/Night, Tour Guide) */}
      <header className="sticky top-0 z-40 bg-[#0c0e14] border-b border-slate-800 transition-colors no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 py-2.5 min-h-[3.75rem]">
            <div className="flex flex-col items-start justify-center min-w-0 flex-1">
              <a
                href="https://dimenuvel.github.io/Evangelho-das-Dimenuveis-site/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15.5px] sm:text-xl md:text-2xl font-serif font-bold leading-tight tracking-normal text-slate-100 hover:text-amber-400 transition-colors whitespace-nowrap"
              >
                {t.appTitle}
              </a>
              <button
                type="button"
                onClick={() => setActiveTab('TODAY')}
                className="text-[11.5px] sm:text-sm font-serif italic leading-tight text-slate-200 hover:text-amber-300 transition-colors whitespace-nowrap text-left cursor-pointer focus:outline-none mt-0.5"
              >
                {t.appSubtitle}
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm font-serif text-slate-200 tabular-nums mr-1 whitespace-nowrap">
                <span className="text-amber-400 font-bold">§</span>
                <span>
                  {t.solarTime}:{' '}
                  <strong className="text-slate-100">
                    {systemDate.toISOString().split('T')[0]}
                  </strong>
                </span>
              </div>

              <LanguageSelector
                language={language}
                onSelectLanguage={onSelectLanguage}
              />

              <div ref={themeMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowThemePreview((prev) => !prev)}
                  aria-expanded={showThemePreview}
                  aria-haspopup="true"
                  className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500/60 text-slate-200 transition-colors cursor-pointer shrink-0"
                  title={
                    isPt
                      ? 'Abrir seletor e pré-visualização de Tema Visual'
                      : 'Open Visual Theme preview & selector'
                  }
                  aria-label={
                    isPt
                      ? 'Abrir seletor de Tema Visual'
                      : 'Open Visual Theme selector'
                  }
                >
                  <span key={theme} className="inline-flex items-center justify-center animate-theme-icon">
                    {theme === 'day' ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : theme === 'night' ? (
                      <Moon className="w-4 h-4 text-blue-300" />
                    ) : (
                      <Contrast className="w-4 h-4 text-amber-400" />
                    )}
                  </span>
                </button>

                {/* Live Visual Theme Preview & Selector Popover (Opens on Current Theme) */}
                {showThemePreview && (
                  <div
                    role="region"
                    aria-label={isPt ? 'Pré-visualização de Tema Visual' : 'Visual Theme Preview'}
                    className="absolute right-0 mt-2 w-72 sm:w-80 p-3 bg-slate-950 border border-slate-700 shadow-2xl z-50 font-serif animate-theme-preview"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400">
                        {isPt ? 'Selecionar Tema Visual' : 'Select Visual Theme'}
                      </span>
                      <span className="text-[11px] italic text-slate-300">
                        {theme === 'mono'
                          ? isPt
                            ? 'Atual: Monocromático'
                            : 'Current: Monochrome'
                          : theme === 'day'
                            ? isPt
                              ? 'Atual: Dia Solar'
                              : 'Current: Solar Day'
                            : isPt
                              ? 'Atual: Noturno'
                              : 'Current: Night'}
                      </span>
                    </div>

                    {/* 3 Authentic Visual Swatch Cards */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        {
                          id: 'mono' as const,
                          swatchClass: 'theme-swatch-mono',
                          label: isPt ? 'Mono' : 'Mono',
                          sub: isPt ? 'Alvo & Preto' : 'White & Ink',
                          icon: <Contrast className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
                        },
                        {
                          id: 'day' as const,
                          swatchClass: 'theme-swatch-day',
                          label: isPt ? 'Dia' : 'Day',
                          sub: isPt ? 'Pergaminho' : 'Parchment',
                          icon: <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
                        },
                        {
                          id: 'night' as const,
                          swatchClass: 'theme-swatch-night',
                          label: isPt ? 'Noite' : 'Night',
                          sub: isPt ? 'Obsidiana' : 'Obsidian',
                          icon: <Moon className="w-3.5 h-3.5 text-blue-300 shrink-0" />,
                        },
                      ].map((opt) => {
                        const isCurrent = theme === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              if (onSelectTheme) {
                                onSelectTheme(opt.id);
                              } else {
                                onToggleTheme();
                              }
                            }}
                            className={`theme-swatch-lock ${opt.swatchClass} p-2 border text-left transition-transform cursor-pointer flex flex-col justify-between gap-1.5 ${
                              isCurrent ? 'ring-2 ring-amber-500 scale-[1.02]' : 'opacity-85 hover:opacity-100'
                            }`}
                          >
                            <div className="theme-swatch-lock flex items-center justify-between gap-1">
                              <span className="theme-swatch-lock swatch-title text-[11px] font-bold leading-none">
                                {opt.label}
                              </span>
                              {opt.icon}
                            </div>
                            <div className="theme-swatch-lock swatch-chip px-1.5 py-0.5 border text-[10px] font-bold flex items-center justify-between">
                              <span className="theme-swatch-lock">Aa · XIII</span>
                              <span className="theme-swatch-lock" style={{ color: '#eab308' }}>☽</span>
                            </div>
                            <div className="theme-swatch-lock swatch-sub text-[9.5px] italic leading-tight truncate">
                              {opt.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {onOpenTour && (
                <button
                  type="button"
                  onClick={onOpenTour}
                  className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500/60 text-amber-400 transition-colors cursor-pointer shrink-0"
                  title={
                    isPt
                      ? 'Abrir Guia de Instruções e Recursos'
                      : 'Open Features & Instructions Tour Guide'
                  }
                  aria-label={isPt ? 'Abrir Guia de Instruções' : 'Open Tour Guide'}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Fixed Bottom Icon Navigation Bar */}
      <nav
        aria-label={isPt ? 'Navegação Principal por Capítulos' : 'Primary Chapter Navigation'}
        className="bottom-icon-navbar fixed bottom-0 inset-x-0 z-40 bg-[#0c0e14]/95 backdrop-blur-md border-t border-slate-800 transition-colors no-print"
      >
        {/* Mobile Active Chapter Indicator Strip */}
        <div className="lg:hidden flex items-center justify-between px-3 py-1 border-b border-slate-800/80 bg-slate-950/90 text-[11px] font-serif">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="italic font-bold text-amber-400 shrink-0">
              {isPt ? `Cap. ${activeItem.roman}` : `Ch. ${activeItem.roman}`}
            </span>
            <span className="text-slate-500">·</span>
            <span className="font-semibold text-slate-100 truncate">
              {activeItem.label}
            </span>
          </div>
          <span className="text-[10px] italic text-slate-400 tabular-nums shrink-0">
            {systemDate.toISOString().split('T')[0]}
          </span>
        </div>

        {/* 11-Icon Dock (Zero Horizontal Scrolling) */}
        <div className="max-w-7xl mx-auto grid grid-cols-11 divide-x divide-slate-800/70">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={`${item.roman}. ${item.label}`}
                aria-label={`${item.roman}. ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex flex-col items-center justify-center py-2 sm:py-2.5 px-0.5 font-serif transition-colors cursor-pointer focus:outline-none ${
                  isActive
                    ? 'bg-slate-900/90 text-amber-300'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
                }`}
              >
                {/* Top Active Indicator Bar */}
                {isActive && (
                  <span
                    className="absolute top-0 inset-x-0 h-0.5 bg-amber-500"
                    aria-hidden="true"
                  />
                )}

                <Icon
                  className={`w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 transition-transform ${
                    isActive
                      ? 'text-amber-400 scale-105'
                      : 'text-slate-300 group-hover:text-amber-300'
                  }`}
                />

                {/* Roman Numeral on Mobile, Short Label on Large Screens */}
                <span
                  className={`mt-1 text-[9px] leading-none lg:hidden tabular-nums ${
                    isActive ? 'font-bold text-amber-300' : 'italic text-slate-400'
                  }`}
                >
                  {item.roman}
                </span>
                <span
                  className={`hidden lg:block mt-1 text-[10.5px] leading-none whitespace-nowrap truncate max-w-full px-1 ${
                    isActive ? 'font-bold text-amber-300' : 'text-slate-300'
                  }`}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
