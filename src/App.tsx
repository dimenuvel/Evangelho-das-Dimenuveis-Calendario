/**
 * @file src/App.tsx
 * Gospel of Dimenuous / Evangelho das Dimenúveis — Biblical Lunar & Millennial Almanac
 */

import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DayDetailModal } from './components/DayDetailModal';
import { TourGuideModal } from './components/TourGuideModal';
import { GpsPermissionModal } from './components/GpsPermissionModal';
import { Language, TRANSLATIONS } from './i18n/translations';
import { CalendarConfiguration, CalendarDay } from './types/calendar';
import { loadStoredConfiguration, saveConfiguration } from './settings/config';
import {
  hasUserDecidedGpsPrompt,
  isUsingDefaultJerusalem,
  ResolvedUserLocation,
} from './services/geolocationService';
import { evaluateSolarAndLunarNotifications } from './notifications/notificationService';
import {
  loadAndroidWidgetConfig,
  buildLiveAndroidWidgetSnapshot,
  syncWidgetToAndroidBridge,
} from './services/androidWidgetService';

import { TodayScreen } from './screens/TodayScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { AppointedTimesScreen } from './screens/AppointedTimesScreen';
import { MoonScreen } from './screens/MoonScreen';
import { SabbathScreen } from './screens/SabbathScreen';
import { GreatWeekScreen } from './screens/GreatWeekScreen';
import { ChronologyLabScreen } from './screens/ChronologyLabScreen';
import { ScriptureHistoryScreen } from './screens/ScriptureHistoryScreen';
import { DimenueveisScreen } from './screens/DimenueveisScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TestsScreen } from './screens/TestsScreen';

const TOUR_STORAGE_KEY = 'dimenueveis_tour_completed_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('TODAY');
  const [systemDate] = useState<Date>(new Date());
  const [config, setConfig] = useState<CalendarConfiguration>(loadStoredConfiguration());
  const [selectedDayModal, setSelectedDayModal] = useState<CalendarDay | null>(null);
  const [calendarFocusRequest, setCalendarFocusRequest] = useState<{
    day: CalendarDay;
    timestamp: number;
  } | null>(null);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    return localStorage.getItem(TOUR_STORAGE_KEY) !== 'true';
  });
  const [isGpsModalOpen, setIsGpsModalOpen] = useState<boolean>(() => {
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
    const initialCfg = loadStoredConfiguration();
    return (
      tourCompleted &&
      !hasUserDecidedGpsPrompt() &&
      isUsingDefaultJerusalem(
        initialCfg.userLocation?.cityName,
        initialCfg.userLocation?.latitude,
        initialCfg.userLocation?.longitude
      )
    );
  });

  const handleCloseTour = () => {
    setIsTourOpen(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    if (
      !hasUserDecidedGpsPrompt() &&
      isUsingDefaultJerusalem(
        config.userLocation?.cityName,
        config.userLocation?.latitude,
        config.userLocation?.longitude
      )
    ) {
      setIsGpsModalOpen(true);
    }
  };

  // Language state ('en' | 'pt')
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('dimenueveis_lang');
    if (saved === 'en' || saved === 'pt') return saved;
    const browserLang = navigator.language || '';
    if (browserLang.toLowerCase().startsWith('pt')) return 'pt';
    return 'en';
  });

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('dimenueveis_lang', lang);
  };

  const t = TRANSLATIONS[language];

  // Sync document <title> dynamically with language choice
  useEffect(() => {
    document.title = `${t.appTitle} — ${t.appSubtitle}`;
  }, [language, t]);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  // Theme state ('mono' | 'day' | 'night' — defaults to 'mono' on first launch)
  const [theme, setTheme] = useState<'night' | 'day' | 'mono'>(() => {
    const saved = localStorage.getItem('dimenueveis_theme');
    return saved === 'day' || saved === 'night' || saved === 'mono' ? saved : 'mono';
  });
  const themeTransitionTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dimenueveis_theme', theme);
  }, [theme]);

  const applySmoothThemeChange = (nextTheme: 'night' | 'day' | 'mono') => {
    document.documentElement.classList.add('theme-transitioning');
    if (themeTransitionTimerRef.current) {
      window.clearTimeout(themeTransitionTimerRef.current);
    }
    setTheme(nextTheme);
    themeTransitionTimerRef.current = window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
      themeTransitionTimerRef.current = null;
    }, 420);
  };

  const toggleTheme = () => {
    const nextTheme =
      theme === 'day' ? 'night' : theme === 'night' ? 'mono' : 'day';
    applySmoothThemeChange(nextTheme);
  };

  // Keep configuration persisted
  const handleUpdateConfig = (newConfig: CalendarConfiguration | Partial<CalendarConfiguration>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated as CalendarConfiguration);
    saveConfiguration(updated as CalendarConfiguration);
  };

  const handleGpsLocationResolved = (loc: ResolvedUserLocation) => {
    handleUpdateConfig({
      userLocation: {
        latitude: loc.latitude,
        longitude: loc.longitude,
        cityName: loc.cityName,
      },
    });
  };

  const handleJumpToCalendarDay = (day: CalendarDay) => {
    setCalendarFocusRequest({ day, timestamp: Date.now() });
    setActiveTab('CALENDAR');
  };

  // Evaluate Sunrise, Moon Phase Change, Sacred Birthday notifications, and Android Home Widget sync on launch and every 60 seconds
  useEffect(() => {
    const runCheck = () => {
      const now = new Date();
      evaluateSolarAndLunarNotifications(
        now,
        config.userLocation?.latitude ?? 31.7683,
        config.userLocation?.longitude ?? 35.2137,
        config.userLocation?.cityName ?? 'Jerusalem (Default)',
        language,
        config.userBirthdayGregorian,
        config.lunarAnchorMode
      );
      const wCfg = loadAndroidWidgetConfig();
      const snap = buildLiveAndroidWidgetSnapshot(now, config, wCfg, language);
      syncWidgetToAndroidBridge(snap, wCfg);
    };
    runCheck();
    const interval = setInterval(runCheck, 60000);
    return () => clearInterval(interval);
  }, [config, language]);

  return (
    <div className="min-h-screen bg-[#0c0e14] text-[#f5f2eb] flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200 transition-colors">
      {/* Top Classical Book Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemDate={systemDate}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelectTheme={applySmoothThemeChange}
        language={language}
        onSelectLanguage={handleSelectLanguage}
        onOpenTour={() => setIsTourOpen(true)}
      />

      {/* First-Launch Interactive Tour Guide Modal */}
      <TourGuideModal
        isOpen={isTourOpen}
        onClose={handleCloseTour}
        language={language}
        onSelectLanguage={handleSelectLanguage}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelectTheme={applySmoothThemeChange}
        onNavigateTab={setActiveTab}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        userLocation={config.userLocation}
      />

      {/* Main Workspace Container */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 ${
          activeTab === 'TESTS' ? 'pb-6' : 'pb-24'
        }`}
      >
        {activeTab === 'TODAY' && (
          <TodayScreen
            systemDate={systemDate}
            config={config}
            onOpenDayDetail={setSelectedDayModal}
            onNavigateTab={setActiveTab}
            onJumpToCalendarDay={handleJumpToCalendarDay}
            language={language}
            onOpenGpsModal={() => setIsGpsModalOpen(true)}
          />
        )}

        {activeTab === 'CALENDAR' && (
          <CalendarScreen
            systemDate={systemDate}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onOpenDayDetail={setSelectedDayModal}
            language={language}
            focusDayRequest={calendarFocusRequest}
          />
        )}

        {activeTab === 'FEASTS' && (
          <AppointedTimesScreen
            systemDate={systemDate}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            language={language}
          />
        )}

        {activeTab === 'MOON' && (
          <MoonScreen
            systemDate={systemDate}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            language={language}
          />
        )}

        {activeTab === 'SABBATH' && (
          <SabbathScreen
            systemDate={systemDate}
            config={config}
            language={language}
          />
        )}

        {activeTab === 'GREAT_WEEK' && (
          <GreatWeekScreen
            systemDate={systemDate}
            config={config}
            language={language}
          />
        )}

        {activeTab === 'CHRONOLOGY_LAB' && (
          <ChronologyLabScreen
            systemDate={systemDate}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            language={language}
          />
        )}

        {activeTab === 'SCRIPTURE_HISTORY' && (
          <ScriptureHistoryScreen
            config={config}
            onUpdateConfig={handleUpdateConfig}
            language={language}
          />
        )}

        {activeTab === 'DIMENUEVEIS' && (
          <DimenueveisScreen
            language={language}
          />
        )}

        {activeTab === 'SETTINGS' && (
          <SettingsScreen
            config={config}
            onUpdateConfig={handleUpdateConfig}
            language={language}
            onOpenGpsModal={() => setIsGpsModalOpen(true)}
          />
        )}

        {activeTab === 'TESTS' && (
          <TestsScreen
            language={language}
          />
        )}
      </main>

      {/* Day Detail Popover Modal */}
      <DayDetailModal
        day={selectedDayModal}
        onClose={() => setSelectedDayModal(null)}
        config={config}
        language={language}
        onOpenGpsModal={() => setIsGpsModalOpen(true)}
      />

      {/* Android & Web GPS Location Permission Dialog (rendered above DayDetailModal) */}
      <GpsPermissionModal
        isOpen={isGpsModalOpen}
        onClose={() => setIsGpsModalOpen(false)}
        language={language}
        currentLocation={config.userLocation}
        onLocationResolved={handleGpsLocationResolved}
      />

      {/* Editorial Colophon Footer — Displayed exclusively on Chapter XI (Tests / Chapter 11) */}
      {activeTab === 'TESTS' && (
        <footer className="mt-auto border-t border-slate-800 bg-[#0b0e14] pt-6 pb-24 text-sm font-serif text-slate-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-lg sm:text-xl font-bold text-slate-100 font-serif leading-snug">
                <a
                  href="https://dimenuvel.github.io/Evangelho-das-Dimenuveis-site/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 underline decoration-amber-500/60 underline-offset-4 transition-colors"
                >
                  {t.appTitle}
                </a>
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-200 font-serif">
                {t.appSubtitle}
              </div>
              <div className="text-xs italic text-slate-300 pt-0.5">
                {language === 'pt'
                  ? 'Dia Zero + 13 Meses × 28 Dias = 364 Dias · Sábado Contínuo · A Grande Semana de 7.000 Anos'
                  : 'Day Zero + 13 Months × 28 Days = 364 Days · Continuous Sabbath · The 7,000-Year Great Week'}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm font-serif font-semibold shrink-0">
              <a
                href="mailto:samuel.tiem@proton.me?subject=Calend%C3%A1rio%20das%20Dimen%C3%BAveis"
                onClick={(e) => {
                  const mailtoUrl =
                    'mailto:samuel.tiem@proton.me?subject=Calend%C3%A1rio%20das%20Dimen%C3%BAveis';
                  if (typeof window !== 'undefined' && window.AndroidBridge?.openExternalUrl) {
                    e.preventDefault();
                    window.AndroidBridge.openExternalUrl(mailtoUrl);
                  }
                }}
                className="text-amber-400 hover:text-amber-300 underline decoration-amber-500/60 underline-offset-4 transition-colors"
              >
                {language === 'pt' ? 'Contato' : 'Contact'}
              </a>
              <span className="text-slate-500">·</span>
              <span className="text-amber-300 tabular-nums">
                {language === 'pt' ? 'Versão 2.6' : 'Version 2.6'}
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
