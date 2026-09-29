/**
 * @file src/components/TourGuideModal.tsx
 * First-launch interactive Tour Guide with live Language & Day/Night Mode switchers,
 * architectural feature walkthrough, and usage instructions (Bilingual EN/PT).
 */

import React, { useState, useEffect } from 'react';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { CalendarConfiguration } from '../types/calendar';
import { resolveSacredBirthday, solarDateToSacredDate } from '../calendar/sacredCalendar';
import { getMonthDisplayTitle } from '../calendar/months';
import { NavTab } from './Navbar';
import { LanguageSelector } from './LanguageSelector';
import {
  loadStoredNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  markNotificationPromptDecided,
  sendSunriseAlertPreview,
  sendMoonPhaseAlertPreview,
  sendBirthdayAlertPreview,
  NotificationSettings,
} from '../notifications/notificationService';
import {
  Sun,
  Moon,
  Bell,
  BookOpen,
  Calendar,
  Compass,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Gift,
  X,
} from 'lucide-react';

interface TourGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  theme: 'night' | 'day';
  onToggleTheme: () => void;
  onNavigateTab: (tab: NavTab) => void;
  config: CalendarConfiguration;
  onUpdateConfig: (partial: Partial<CalendarConfiguration>) => void;
  userLocation?: {
    latitude: number;
    longitude: number;
    cityName?: string;
  };
}

export const TourGuideModal: React.FC<TourGuideModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectLanguage,
  theme,
  onToggleTheme,
  onNavigateTab,
  config,
  onUpdateConfig,
  userLocation,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    loadStoredNotificationSettings()
  );
  const [hasAutoTriggeredOnStep3, setHasAutoTriggeredOnStep3] = useState(false);
  const [birthdaySavedToast, setBirthdaySavedToast] = useState(false);
  const isPt = language === 'pt';
  const t = TRANSLATIONS[language];

  const currentSacredYear = solarDateToSacredDate(new Date(), config.lunarAnchorMode).calendarYear;
  const resolvedBirthday = config.userBirthdayGregorian
    ? resolveSacredBirthday(config.userBirthdayGregorian, config.lunarAnchorMode, currentSacredYear)
    : null;

  const handleSaveBirthdayInTour = async (dateISO: string) => {
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
      setBirthdaySavedToast(true);
      sendBirthdayAlertPreview(dateISO, config.lunarAnchorMode, language, true);
    } else {
      setBirthdaySavedToast(false);
    }
  };

  useEffect(() => {
    const syncHandler = () => {
      setNotifSettings(loadStoredNotificationSettings());
    };
    window.addEventListener('dimenueveisNotificationSettingsChanged', syncHandler);
    return () => window.removeEventListener('dimenueveisNotificationSettingsChanged', syncHandler);
  }, []);

  const handleActivateAndroidSystemNotifications = async () => {
    markNotificationPromptDecided();
    const granted = await requestNotificationPermission();
    const current = loadStoredNotificationSettings();
    const updated: NotificationSettings = {
      ...current,
      enabled: true,
      sunriseAlert: true,
      moonPhaseChangeAlert: true,
    };
    saveNotificationSettings(updated);
    setNotifSettings(updated);
    if (granted) {
      sendSunriseAlertPreview(
        new Date(),
        userLocation?.latitude ?? 31.7683,
        userLocation?.longitude ?? 35.2137,
        userLocation?.cityName ?? 'Jerusalem (Default)',
        language,
        true
      );
    }
  };

  // Automatically trigger the native Android / OS notification permission dialog when entering Section III (stepIndex === 2)
  useEffect(() => {
    if (isOpen && stepIndex === 2 && !hasAutoTriggeredOnStep3) {
      setHasAutoTriggeredOnStep3(true);
      handleActivateAndroidSystemNotifications();
    }
  }, [isOpen, stepIndex, hasAutoTriggeredOnStep3]);

  if (!isOpen) return null;

  const steps = [
    {
      roman: 'I',
      icon: Sparkles,
      badge: isPt ? 'Prefácio' : 'Preface',
      title: isPt
        ? 'Evangelho das Dimenúveis'
        : 'Gospel of Dimenuous',
      subtitle: isPt
        ? 'Almanaque Bíblico Lunar, Sagrado e Milenar · Versão 2.1'
        : 'Biblical Lunar, Sacred & Millennial Almanac · Version 2.1',
      content: (
        <div className="space-y-5">
          <p className="text-sm font-serif text-slate-200 leading-relaxed">
            {isPt
              ? 'Este instrumento editorial e astronômico (v2.1) integra o Calendário Sagrado de 13 Meses × 28 Dias (364 dias + Dia Zero), os 13 Signos Eclípticos (incluindo o 13º Signo restaurado do Dragão no Mês IX), o Indicador Ao Vivo do Sábado, a Oração Diária Bíblica, as Festas de Levítico 23 e o Relógio Milenar de 7.000 anos.'
              : 'This editorial and astronomical instrument (v2.1) integrates the 13-Month × 28-Day Sacred Calendar (364 days + Day Zero), the 13 Ecliptic Zodiac Signs (including the restored 13th Sign of the Dragon in Month IX), the Live Sabbath Indicator, the Daily Scriptural Prayer, Leviticus 23 Feasts, and the 7,000-Year Millennial Clock.'}
          </p>

          {/* Interactive Language & Theme Switcher Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Language Selection Box */}
            <div className="border border-slate-700 bg-slate-900/50 p-4 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-serif uppercase tracking-wider text-amber-400 font-semibold whitespace-nowrap">
                    {isPt ? '1. Idioma' : '1. Language'}
                  </span>
                  <span className="text-xs font-serif italic text-slate-300 whitespace-nowrap">
                    ({language === 'pt' ? 'Português' : 'English'})
                  </span>
                </div>
                <p className="text-xs font-serif text-slate-300 leading-relaxed">
                  {isPt
                    ? 'Toque no botão circular de bandeira para alternar entre Português e Inglês.'
                    : 'Tap the circular flag button to switch between English and Portuguese.'}
                </p>
              </div>
              <LanguageSelector language={language} onSelectLanguage={onSelectLanguage} />
            </div>

            {/* Day / Night Reading Mode Box */}
            <div className="border border-slate-700 bg-slate-900/50 p-4 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-serif uppercase tracking-wider text-amber-400 font-semibold whitespace-nowrap">
                    {isPt ? '2. Modo Dia / Noite' : '2. Day / Night Mode'}
                  </span>
                  <span className="text-xs font-serif italic text-slate-300 whitespace-nowrap">
                    ({theme === 'day' ? (isPt ? 'Dia' : 'Day') : isPt ? 'Noite' : 'Night'})
                  </span>
                </div>
                <p className="text-xs font-serif text-slate-300 leading-relaxed">
                  {isPt
                    ? 'Toque no botão circular de Sol/Lua para alternar entre o modo Dia e Noite.'
                    : 'Tap the circular Sun/Moon button to switch between Day and Night mode.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500/60 text-slate-200 transition-colors cursor-pointer shrink-0"
                title={
                  theme === 'day'
                    ? isPt
                      ? 'Modo Dia ativo — Clique para Modo Noite'
                      : 'Day Mode active — Click for Night Mode'
                    : isPt
                      ? 'Modo Noite ativo — Clique para Modo Dia'
                      : 'Night Mode active — Click for Day Mode'
                }
              >
                {theme === 'day' ? (
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="4" />
                    <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 3. Gregorian Birthday to 13-Month Sacred Calendar & Notification Box */}
          <div className="border border-amber-500/40 bg-amber-950/15 p-4 space-y-3 font-serif">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                  {isPt
                    ? '3. Seu Aniversário no Calendário de 13 Meses & Notificação'
                    : '3. Your Birthday in the 13-Month Calendar & Notification'}
                </span>
              </div>
              <span className="text-xs italic text-slate-300">
                {isPt ? 'Opcional (Disponível em Festas)' : 'Optional (Also on Feasts page)'}
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {isPt
                ? 'Insira sua data de nascimento no calendário gregoriano atual para mapeá-la ao seu equivalente no Calendário Sagrado de 13 Meses e configurar automaticamente uma notificação anual de aniversário. Caso não insira agora, essa opção estará sempre disponível na página III. Festas.'
                : 'Enter your birth date in the current Gregorian calendar to map it to its 13-Month Sacred Calendar equivalent and automatically set up an annual birthday notification. If you skip it now, this option is always available on the III. Feasts page.'}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="tour-birthday-input"
                  className="text-xs text-slate-300 font-semibold whitespace-nowrap"
                >
                  {isPt ? 'Nascimento (Gregoriano):' : 'Birth Date (Gregorian):'}
                </label>
                <input
                  id="tour-birthday-input"
                  type="date"
                  value={config.userBirthdayGregorian || ''}
                  onChange={(e) => handleSaveBirthdayInTour(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-amber-500/50 text-slate-100 text-xs font-serif tabular-nums focus:outline-none focus:border-amber-400"
                />
              </div>

              {resolvedBirthday && (
                <div className="flex-1 px-3 py-2 bg-slate-950 border border-emerald-500/40 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-400">
                      {isPt ? 'Equivalente 13 Meses: ' : '13-Month Equivalent: '}
                    </span>
                    <strong className="text-amber-300">
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
                    <span className="text-slate-400 ml-1.5 tabular-nums">
                      ({resolvedBirthday.targetYearDay.gregorianDate.toISOString().split('T')[0]})
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {birthdaySavedToast || notifSettings.birthdayAlert
                        ? isPt
                          ? 'Notificação Ativa'
                          : 'Notification Active'
                        : isPt
                          ? 'Mapeado'
                          : 'Mapped'}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      roman: 'II',
      icon: Calendar,
      badge: isPt ? '13 Meses & 13 Signos' : '13 Months & 13 Signs',
      title: isPt
        ? 'Dia Zero + 13 × 28 Dias & O 13º Signo do Dragão'
        : 'Day Zero + 13 × 28 Days & The 13th Sign of the Dragon',
      subtitle: isPt
        ? 'Simetria perpétua de 364 dias, 52 semanas e as 13 constelações eclípticas (Mazzaroth)'
        : 'Perpetual symmetry of 364 days, 52 weeks, and the 13 ecliptic constellations (Mazzaroth)',
      content: (
        <div className="space-y-4 font-serif">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-700 border border-slate-700">
            <div className="bg-slate-950 p-4 space-y-1">
              <span className="text-xs italic text-purple-300 block whitespace-nowrap">
                {isPt ? 'Limiar Anual' : 'Annual Threshold'}
              </span>
              <strong className="text-base text-slate-100 block whitespace-nowrap">
                {isPt ? 'Dia Zero (Dia 0)' : 'Day Zero (Day 0)'}
              </strong>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isPt
                  ? 'Sábado Anual do Ano Novo Sagrado antes do Mês I Dia 1. Fora dos 364 dias numerados.'
                  : 'Annual Sacred New Year Sabbath preceding Month I Day 1. Outside the 364 numbered days.'}
              </p>
            </div>
            <div className="bg-slate-950 p-4 space-y-1">
              <span className="text-xs italic text-amber-400 block whitespace-nowrap">
                {isPt ? '13 Meses × 28 Dias' : '13 Months × 28 Days'}
              </span>
              <strong className="text-base text-slate-100 block whitespace-nowrap">
                {isPt ? '13 Signos (Mazzaroth)' : '13 Signs (Mazzaroth)'}
              </strong>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isPt
                  ? 'Cada mês de 28 dias correlaciona-se a 1 das 13 constelações eclípticas (Jó 38:32), de Áries (Mês I) a Peixes (Mês XIII).'
                  : 'Every 28-day month correlates to 1 of the 13 ecliptic constellations (Job 38:32), from Aries (Month I) to Pisces (Month XIII).'}
              </p>
            </div>
            <div className="bg-slate-950 p-4 space-y-1">
              <span className="text-xs italic text-emerald-300 block whitespace-nowrap">
                {isPt ? 'Mês IX Restaurado' : 'Restored Month IX'}
              </span>
              <strong className="text-base text-slate-100 block whitespace-nowrap">
                ⛎ {isPt ? '13º Signo: O Dragão' : '13th Sign: The Dragon'}
              </strong>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isPt
                  ? 'Restaura o 13º signo eclíptico do Dragão / Serpentário (Ofiúco · Draco) no Mês IX, entre Escorpião e Sagitário.'
                  : 'Restores the 13th ecliptic sign of the Dragon / Serpent-Bearer (Ophiuchus · Draco) in Month IX, between Scorpio and Sagittarius.'}
              </p>
            </div>
          </div>

          <div className="p-4 border border-slate-800 bg-slate-900/40 text-xs text-slate-300 leading-relaxed">
            <strong className="text-amber-300">
              {isPt ? 'Tags de Hoje e Aniversário no Cap. II: ' : 'Today & Birthday Tags on Ch. II: '}
            </strong>
            {isPt
              ? 'Na aba II (Calendário), o dia atual é destacado com o selo HOJE e o seu aniversário de 13 meses recebe o selo ANIV. em todos os anos sagrados, além da matriz completa dos 13 signos do zodíaco.'
              : 'In Tab II (Calendar), the current day is highlighted with a TODAY badge and your 13-month birthday is tagged with a BDAY badge across every sacred year, alongside the complete 13-sign zodiac matrix.'}
          </div>
        </div>
      ),
    },
    {
      roman: 'III',
      icon: Compass,
      badge: isPt ? 'Sábado, Oração & Alertas' : 'Sabbath, Prayer & Alerts',
      title: isPt
        ? 'Indicador do Sábado, Oração Diária & Notificações'
        : 'Sabbath Indicator, Daily Prayer & Notifications',
      subtitle: isPt
        ? 'Contagem regressiva do pôr do sol, reflexão bíblica diária e alertas na barra de status'
        : 'Live sunset countdown, daily scriptural reflection, and status bar alerts',
      content: (
        <div className="space-y-4 font-serif">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-slate-800 bg-slate-900/40 p-3.5 space-y-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-amber-300">
                {isPt ? 'Indicador do Sábado (Cap. I & V)' : 'Sabbath Indicator (Ch. I & V)'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isPt
                  ? 'No topo da página Hoje, acompanhe a contagem regressiva para o pôr do sol do próximo Sábado. Quando o Sábado está ativo, a barra brilha em ouro.'
                  : 'At the top of the Today page, track the live sunset countdown to the next Sabbath. When the Sabbath is active, the bar glows gold.'}
              </p>
            </div>

            <div className="border border-slate-800 bg-slate-900/40 p-3.5 space-y-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-purple-300">
                {isPt ? 'Oração Diária (Cap. I — Hoje)' : 'Daily Prayer (Ch. I — Today)'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isPt
                  ? 'Exibe diariamente uma reflexão bíblica e oração ancoradas na posição exata do dia atual dentro dos 13 meses e das 4 semanas do mês.'
                  : 'Displays a daily scripture-based reflection and prayer anchored in the current day’s exact position within the 13 months and 4 monthly weeks.'}
              </p>
            </div>

            <div className="border border-slate-800 bg-slate-900/40 p-3.5 space-y-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-blue-300">
                {isPt ? 'Festas & Google Agenda (Cap. III)' : 'Feasts & Google Calendar (Ch. III)'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isPt
                  ? 'Calcula as 8 Festas de Levítico 23 e o seu Natalício de 13 Meses, com inclusão direta no Google Agenda.'
                  : 'Calculates the 8 Feasts of Leviticus 23 and your 13-Month Sacred Birthday, with 1-tap export to Google Calendar.'}
              </p>
            </div>
          </div>

          {/* Mobile Notifications Highlight: Sunrise + Moon Phase Change + Feasts */}
          <div className="border border-amber-500/40 bg-amber-950/15 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {isPt
                    ? 'Notificações Móveis: Nascer do Sol & Mudança de Fase da Lua'
                    : 'Mobile Notifications: Local Sunrise & Moon Phase Change'}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 text-xs font-bold border ${
                  notifSettings.enabled
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                {notifSettings.enabled
                  ? isPt
                    ? '● Alertas Ativos'
                    : '● Alerts Active'
                  : isPt
                    ? '○ Permissão Pendente'
                    : '○ Permission Pending'}
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {isPt
                ? 'Na barra de status do seu celular Android, receba notificações nativas do sistema para: (1) Nascer do Sol diário na sua localização GPS (ou Jerusalém), informando também o Meio-Dia Solar e o Pôr do Sol; (2) Mudança de Fase da Lua sempre que a Lua entra em uma nova fase das 8 fases astronômicas; e (3) Lembretes de Festas Bíblicas e Sábados.'
                : 'In your Android phone status bar, receive native system notifications for: (1) Daily Local Sunrise at your GPS coordinates (or Jerusalem), including Solar Noon and Sunset times; (2) Moon Phase Change whenever the Moon enters any of the 8 astronomical phases; and (3) Biblical Feast and Sabbath reminders.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={handleActivateAndroidSystemNotifications}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {notifSettings.enabled
                    ? isPt
                      ? 'Notificações da Barra de Status Ativas'
                      : 'Status Bar Notifications Active'
                    : isPt
                      ? 'Permitir Notificações no Android'
                      : 'Allow Android Status Bar Notifications'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  sendSunriseAlertPreview(
                    new Date(),
                    userLocation?.latitude ?? 31.7683,
                    userLocation?.longitude ?? 35.2137,
                    userLocation?.cityName ?? 'Jerusalem (Default)',
                    language,
                    true
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-500/50 bg-slate-950 hover:bg-slate-900 text-amber-300 transition-colors cursor-pointer"
              >
                <Sun className="w-3.5 h-3.5 shrink-0" />
                <span>{isPt ? 'Testar Nascer do Sol' : 'Test Sunrise Alert'}</span>
              </button>

              <button
                type="button"
                onClick={() => sendMoonPhaseAlertPreview(new Date(), language, true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-400/50 bg-slate-950 hover:bg-slate-900 text-blue-300 transition-colors cursor-pointer"
              >
                <Moon className="w-3.5 h-3.5 shrink-0" />
                <span>{isPt ? 'Testar Fase da Lua' : 'Test Moon Phase Alert'}</span>
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      roman: 'IV',
      icon: Clock,
      badge: isPt ? 'Cronologia' : 'Chronology',
      title: isPt
        ? 'Grande Semana & Cronologia'
        : 'Great Week & Chronology Lab',
      subtitle: isPt
        ? '6.000 anos rumo ao Sábado do 7º Milênio'
        : '6,000 years toward the 7th Millennium Sabbath',
      content: (
        <div className="space-y-4 font-serif">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <h4 className="text-sm font-bold text-amber-300 whitespace-nowrap">
                {isPt ? '4 Modelos Cronológicos (Cap. VI & VII)' : '4 Chronology Models (Ch. VI & VII)'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isPt
                  ? 'Compare Ussher (4004 a.C.), Rabínico Tradicional (3761 a.C.), Septuaginta LXX (5508 a.C.) e Época Sagrada Dimenúveis (4026 a.C.) com transição exata de 1 a.C. para 1 d.C. sem Ano Zero.'
                  : 'Compare Ussher (4004 BCE), Traditional Rabbinic (3761 BCE), Septuagint LXX (5508 BCE), and Dimenuous Sacred Epoch (4026 BCE) with strict 1 BCE to 1 CE transition (no Year Zero).'}
              </p>
            </div>

            <div className="border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <h4 className="text-sm font-bold text-purple-300 whitespace-nowrap">
                {isPt ? 'Josué 10 & Eclipses (Cap. VIII)' : 'Joshua 10 & Eclipses (Ch. VIII)'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isPt
                  ? 'Explore o catálogo de eclipses históricos na Terra Santa (incluindo o eclipse candidato de 30 de outubro de 1207 a.C.) e simule o ajuste opcional de +1 dia de Josué 10.'
                  : 'Explore the historical eclipse catalog over the Holy Land (including the 30 October 1207 BCE candidate eclipse) and test the optional +1 day Joshua 10 adjustment.'}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      roman: 'V',
      icon: BookOpen,
      badge: isPt ? 'Capítulos' : 'Chapters',
      title: isPt
        ? 'Navegar pelos 11 Capítulos'
        : 'Navigate the 11 Chapters',
      subtitle: isPt
        ? 'Clique em qualquer capítulo abaixo para abrir'
        : 'Click any chapter below to jump directly',
      content: (
        <div className="space-y-3 font-serif">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {[
              {
                id: 'TODAY' as NavTab,
                roman: 'I',
                title: t.tabs.TODAY,
                desc: isPt
                  ? 'Indicador do Sábado, Oração Diária, painel solar/lunar e mapa azimutal'
                  : 'Sabbath indicator, Daily Prayer, solar/lunar panel & azimuthal map',
              },
              {
                id: 'CALENDAR' as NavTab,
                roman: 'II',
                title: t.tabs.CALENDAR,
                desc: isPt
                  ? '13 meses × 28 dias, 13 Signos (13º Signo do Dragão) e tags Hoje/Aniv.'
                  : '13 months × 28 days, 13 Signs (13th Dragon Sign) & Today/Bday tags',
              },
              {
                id: 'FEASTS' as NavTab,
                roman: 'III',
                title: t.tabs.FEASTS,
                desc: isPt
                  ? 'As 8 Festas de Levítico 23, Natalício de 13 Meses e Google Agenda'
                  : 'The 8 Leviticus 23 Feasts, 13-Month Birthday & Google Calendar',
              },
              {
                id: 'MOON' as NavTab,
                roman: 'IV',
                title: t.tabs.MOON,
                desc: isPt ? 'Efemérides lunares e as 8 fases definidas' : 'Lunar ephemeris & the 8 defined phases',
              },
              {
                id: 'SABBATH' as NavTab,
                roman: 'V',
                title: t.tabs.SABBATH,
                desc: isPt
                  ? 'Contagem regressiva do pôr do sol, 52 Sábados semanais e Dia Zero'
                  : 'Live sunset countdown, 52 weekly Sabbaths & Day Zero',
              },
              {
                id: 'GREAT_WEEK' as NavTab,
                roman: 'VI',
                title: t.tabs.GREAT_WEEK,
                desc: isPt ? 'Relógio profético dos 7 Milênios' : 'Prophetic clock of the 7 Millennia',
              },
              {
                id: 'CHRONOLOGY_LAB' as NavTab,
                roman: 'VII',
                title: t.tabs.CHRONOLOGY_LAB,
                desc: isPt ? 'Simulador de modelos a.C./d.C. e Josué 10' : 'BCE/CE model simulator & Joshua 10 toggle',
              },
              {
                id: 'SCRIPTURE_HISTORY' as NavTab,
                roman: 'VIII',
                title: t.tabs.SCRIPTURE_HISTORY,
                desc: isPt ? 'Eclipses históricos e registros bíblicos' : 'Historical eclipses & scriptural records',
              },
              {
                id: 'DIMENUEVEIS' as NavTab,
                roman: 'IX',
                title: t.tabs.DIMENUEVEIS,
                desc: isPt ? 'Fundamentos bíblicos, árvore de 6 camadas e léxico' : 'Biblical foundations, 6-layer tree & lexicon',
              },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigateTab(item.id);
                  onClose();
                }}
                className="text-left p-3 border border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:border-amber-500/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 group-hover:text-amber-300 text-sm">
                    <span className="text-amber-400 italic mr-1.5">{item.roman}.</span>
                    {item.title}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-400" />
                </div>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[stepIndex];
  const StepIcon = currentStep.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-guide-title"
    >
      <div className="relative w-full max-w-3xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Utility Header Bar with Persistent Language & Day/Night Switchers */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-serif uppercase tracking-wider text-amber-400 font-semibold whitespace-nowrap">
              {isPt ? 'Guia Interativo' : 'Interactive Guide'}
            </span>
          </div>

          {/* Persistent Quick Controls: App-Style Circular Language + Day/Night + Close */}
          <div className="flex items-center gap-2">
            {/* Circular Flag Language Switcher Button (Same as Navbar) */}
            <LanguageSelector language={language} onSelectLanguage={onSelectLanguage} />

            {/* Circular Day/Night Mode Switcher Button (Same as Navbar) */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500/60 text-slate-200 transition-colors cursor-pointer shrink-0"
              title={
                theme === 'day'
                  ? isPt
                    ? 'Alternar para Modo Noite'
                    : 'Switch to Night Mode'
                  : isPt
                    ? 'Alternar para Modo Dia'
                    : 'Switch to Day Mode'
              }
            >
              {theme === 'day' ? (
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="4" />
                  <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-700 bg-slate-900 hover:border-amber-500/60 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer shrink-0"
              title={isPt ? 'Fechar Guia' : 'Close Guide'}
              aria-label={isPt ? 'Fechar Guia' : 'Close Guide'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Progress Strip */}
        <div className="grid grid-cols-5 gap-px bg-slate-800 border-b border-slate-800 font-serif text-xs">
          {steps.map((s, idx) => {
            const isCurrent = idx === stepIndex;
            const isCompleted = idx < stepIndex;
            return (
              <button
                key={s.roman}
                type="button"
                onClick={() => setStepIndex(idx)}
                className={`py-2 px-2 text-center transition-colors cursor-pointer leading-snug ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : isCompleted
                      ? 'bg-slate-900 text-amber-300 hover:bg-slate-800'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span className="italic mr-1">{s.roman}.</span>
                <span className="hidden sm:inline">{s.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-5 flex-1">
          <div className="flex items-start gap-3.5 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 border border-amber-500/40 bg-amber-950/20 flex items-center justify-center shrink-0 mt-0.5">
              <StepIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-serif italic text-amber-400">
                {isPt ? `Capítulo ${currentStep.roman} de V` : `Chapter ${currentStep.roman} of V`} — {currentStep.badge}
              </div>
              <h2
                id="tour-guide-title"
                className="text-xl sm:text-2xl font-serif font-bold text-slate-100 leading-snug mt-0.5"
              >
                {currentStep.title}
              </h2>
              <p className="text-xs sm:text-sm font-serif italic text-slate-400 mt-0.5">
                {currentStep.subtitle}
              </p>
            </div>
          </div>

          {currentStep.content}
        </div>

        {/* Modal Footer Navigation */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-900/80 border-t border-slate-800 font-serif text-xs">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 underline underline-offset-4 cursor-pointer"
          >
            {isPt ? 'Pular Guia' : 'Skip Guide'}
          </button>

          <div className="flex items-center gap-2.5">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{isPt ? 'Anterior' : 'Previous'}</span>
              </button>
            )}

            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer"
              >
                <span>{isPt ? 'Próximo' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isPt ? 'Começar' : 'Start'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
