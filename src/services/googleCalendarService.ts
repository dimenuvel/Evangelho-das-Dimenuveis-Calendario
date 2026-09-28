/**
 * @file src/services/googleCalendarService.ts
 * Secret-free Google Calendar integration for mobile (Android APK CalendarContract Intent
 * + Google Calendar universal TEMPLATE deep links + .ICS calendar export with alarms).
 * Requires zero API keys in the repository so GitHub Secret Scanning stays 100% clean.
 */

import { CalculatedFeastOccurrence } from '../types/feasts';
import { Language } from '../i18n/translations';

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysYMD(date: Date, daysToAdd: number): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + daysToAdd, 12, 0, 0);
  return formatDateYMD(d);
}

function formatDateCompact(ymd: string): string {
  return ymd.replace(/-/g, '');
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildFeastCalendarEventPayload(
  occ: CalculatedFeastOccurrence,
  language: Language
) {
  const isPt = language === 'pt';
  const f = occ.feast;
  const duration = Math.max(1, f.durationDays);
  const startYMD = formatDateYMD(occ.gregorianStartDate);
  // Inclusive end date (last day of the feast)
  const inclusiveEndYMD = addDaysYMD(occ.gregorianStartDate, duration - 1);
  // Google Calendar all-day template URL end date is exclusive (day after last day)
  const exclusiveEndYMD = addDaysYMD(occ.gregorianStartDate, duration);

  const summary = isPt
    ? `${f.name} (${f.hebrewName}) — Calendário das Dimenúveis`
    : `${f.name} (${f.hebrewName}) — Dimenuous Calendar`;

  const descriptionLines = isPt
    ? [
        `${f.name} (${f.hebrewName})`,
        `Calendário Sagrado (Ano ${occ.sacredYear}): Mês ${f.sacredMonth}, Dia ${f.sacredDay}${
          f.durationDays > 1 ? `–${f.sacredDay + f.durationDays - 1}` : ''
        }`,
        `Data Gregoriana: ${startYMD}${duration > 1 ? ` a ${inclusiveEndYMD}` : ''}`,
        `Duração: ${f.durationDays} dia(s) · Observância inicia ao Pôr do Sol da véspera.`,
        `Referências Bíblicas: ${f.biblicalReferences.join(', ')}`,
        '',
        f.description,
      ]
    : [
        `${f.name} (${f.hebrewName})`,
        `Sacred Calendar (Year ${occ.sacredYear}): Month ${f.sacredMonth}, Day ${f.sacredDay}${
          f.durationDays > 1 ? `–${f.sacredDay + f.durationDays - 1}` : ''
        }`,
        `Gregorian Date: ${startYMD}${duration > 1 ? ` to ${inclusiveEndYMD}` : ''}`,
        `Duration: ${f.durationDays} day(s) · Observance begins at Sunset on the prior evening.`,
        `Biblical References: ${f.biblicalReferences.join(', ')}`,
        '',
        f.description,
      ];

  const startLocal = new Date(
    occ.gregorianStartDate.getFullYear(),
    occ.gregorianStartDate.getMonth(),
    occ.gregorianStartDate.getDate(),
    6,
    0,
    0
  );
  const endLocal = new Date(
    occ.gregorianStartDate.getFullYear(),
    occ.gregorianStartDate.getMonth(),
    occ.gregorianStartDate.getDate() + duration - 1,
    18,
    0,
    0
  );

  return {
    summary,
    description: descriptionLines.join('\n'),
    startDateYMD: startYMD,
    inclusiveEndDateYMD: inclusiveEndYMD,
    endDateYMD: exclusiveEndYMD,
    startMillis: startLocal.getTime(),
    endMillis: endLocal.getTime(),
  };
}

/**
 * Builds a universal Google Calendar mobile/web template URL for a single feast.
 */
export function buildGoogleCalendarTemplateUrl(
  occ: CalculatedFeastOccurrence,
  language: Language
): string {
  const payload = buildFeastCalendarEventPayload(occ, language);
  const startCompact = formatDateCompact(payload.startDateYMD);
  const endCompact = formatDateCompact(payload.endDateYMD);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: payload.summary,
    dates: `${startCompact}/${endCompact}`,
    details: payload.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Opens the feast directly in the Android native Google Calendar app (via CalendarContract Intent)
 * or opens the Google Calendar web/mobile template URL.
 */
export function openInGoogleCalendarApp(
  occ: CalculatedFeastOccurrence,
  language: Language
): void {
  const payload = buildFeastCalendarEventPayload(occ, language);
  const url = buildGoogleCalendarTemplateUrl(occ, language);

  if (typeof window !== 'undefined' && window.AndroidBridge?.insertCalendarEvent) {
    window.AndroidBridge.insertCalendarEvent(
      payload.summary,
      payload.description,
      payload.startMillis,
      payload.endMillis,
      url
    );
    return;
  }

  if (typeof window !== 'undefined' && window.AndroidBridge?.openExternalUrl) {
    window.AndroidBridge.openExternalUrl(url);
    return;
  }

  if (typeof window !== 'undefined') {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Opens Google Calendar online settings/import page.
 */
export function openGoogleCalendarImportPage(): void {
  const url = 'https://calendar.google.com/calendar/r/settings/export';
  if (typeof window !== 'undefined' && window.AndroidBridge?.openExternalUrl) {
    window.AndroidBridge.openExternalUrl(url);
    return;
  }
  if (typeof window !== 'undefined') {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Exports a standard .ics calendar file containing all selected Biblical Feasts
 * for one-tap import into Google Calendar mobile or any system calendar app.
 */
export function exportFeastsToIcs(
  occurrences: CalculatedFeastOccurrence[],
  sacredYear: number,
  language: Language
): void {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calendario das Dimenuveis//Biblical Feasts//PT',
    'CALSCALE:GREGORIAN',
  ];

  for (const occ of occurrences) {
    const payload = buildFeastCalendarEventPayload(occ, language);
    const dtStartDay = formatDateCompact(payload.startDateYMD);
    const dtEndDayInclusive = formatDateCompact(payload.inclusiveEndDateYMD);
    // Use explicit local date-time format (YYYYMMDDTHHMMSS) without parameter qualifiers before ':'
    // so all mobile and desktop .ICS parsers (Google Calendar, Samsung, AOSP, Apple, Outlook)
    // parse each festival's exact month and day and never fall back to today's date/month.
    const dtStart = `${dtStartDay}T060000`;
    const dtEnd = `${dtEndDayInclusive}T180000`;
    const dtStamp = `${dtStartDay}T060000Z`;
    const uid = `feast-${occ.feast.id}-${sacredYear}-${dtStartDay}@dimenueveis.calendar`;
    const escapedDesc = escapeIcsText(payload.description);
    const escapedSummary = escapeIcsText(payload.summary);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `DTSTAMP:${dtStamp}`,
      `SUMMARY:${escapedSummary}`,
      `DESCRIPTION:${escapedDesc}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapedSummary}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT6H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapedSummary}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n');
  const fileName =
    language === 'pt'
      ? `Festas-Biblicas-Ano-Sagrado-${sacredYear}.ics`
      : `Biblical-Feasts-Sacred-Year-${sacredYear}.ics`;

  if (typeof window !== 'undefined' && window.AndroidBridge?.saveIcsFile) {
    window.AndroidBridge.saveIcsFile(fileName, icsContent);
    return;
  }

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
