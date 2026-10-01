/**
 * @file src/components/AndroidHomeWidgetStudio.tsx
 * Interactive Android Home Screen Widget Studio & Configurator.
 * Renders the widget example using the exact 740px Canvas drawing architecture
 * of DimenueveisAppWidgetProvider.java so the in-app example matches the real
 * Android widget 1:1.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarConfiguration } from '../types/calendar';
import { Language } from '../i18n/translations';
import {
  AndroidWidgetConfig,
  AndroidWidgetSize,
  AndroidWidgetTheme,
  SimulatedWallpaperId,
  LiveAndroidWidgetSnapshot,
  DEFAULT_ANDROID_WIDGET_CONFIG,
  loadAndroidWidgetConfig,
  saveAndroidWidgetConfig,
  buildLiveAndroidWidgetSnapshot,
  syncWidgetToAndroidBridge,
  requestPinWidgetOnAndroid,
} from '../services/androidWidgetService';
import {
  Smartphone,
  Sliders,
  MapPin,
  CheckCircle2,
  Download,
  RotateCcw,
  Eye,
  X,
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

function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillAndStrokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle?: string,
  strokeStyle?: string,
  lineWidth = 1.5
) {
  drawRoundRectPath(ctx, x, y, w, h, r);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawFittedCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  baseSize: number,
  minSize: number,
  fontWeight: 'normal' | 'bold',
  fontStyle: 'normal' | 'italic',
  color: string,
  align: CanvasTextAlign = 'left',
  withShadow = false
) {
  if (!text) return;
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;

  if (withShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.82)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
  }

  let currentSize = baseSize;
  const floorSize = Math.min(8, minSize);
  const fontFamily = 'Georgia, "Times New Roman", serif';

  ctx.font = `${fontStyle} ${fontWeight} ${currentSize}px ${fontFamily}`;
  while (currentSize > floorSize && ctx.measureText(text).width > maxWidth) {
    currentSize -= 0.5;
    ctx.font = `${fontStyle} ${fontWeight} ${currentSize}px ${fontFamily}`;
  }

  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawMoonPhaseDiscCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  illum: number,
  goldColor: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  const litWidth = radius * 2 * Math.max(0.08, Math.min(1, illum));
  ctx.fillStyle = goldColor;
  ctx.fillRect(cx + radius - litWidth, cy - radius, litWidth, radius * 2);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders the exact 740px native Android widget bitmap design onto an HTML5 Canvas
 * so the Studio preview matches DimenueveisAppWidgetProvider.java 1:1.
 */
function renderAndroidWidgetToCanvas(
  canvas: HTMLCanvasElement,
  snapshot: LiveAndroidWidgetSnapshot,
  widgetConfig: AndroidWidgetConfig,
  isPt: boolean
) {
  const renderGps = widgetConfig.showGpsAndSunTimes;
  const renderSabbath = widgetConfig.showSabbathCountdown;
  const renderZodiac =
    widgetConfig.widgetSize !== '3x4' && widgetConfig.showZodiacAndEnochGate;
  const renderFeast =
    widgetConfig.widgetSize !== '3x4' && widgetConfig.showNextFeast;
  const renderMillennial =
    widgetConfig.widgetSize === '4x6' && widgetConfig.showMillennialClock;
  const renderVerse =
    widgetConfig.widgetSize === '4x6' && widgetConfig.showDailyVerse;

  const width = 740;
  let estimatedHeight = 42; // top padding
  estimatedHeight += 200; // Section 1: Sacred Date + Subline + Live Clock + Watch
  estimatedHeight += 164; // Section 2: Lunar Phase & 14-Part Enoch Bar
  if (renderGps) {
    estimatedHeight += 150; // Section 3: GPS Location & Sun Ephemeris
  }
  if (renderSabbath) {
    estimatedHeight += widgetConfig.showWeeklySabbathBar ? 246 : 158; // Section 4: Sabbath Title + Date + Sunset/Counter Row + 7-Day Strip
  }
  if (renderZodiac) {
    estimatedHeight += 120; // Section 5: 13-Sign Mazzaroth & Enoch Gate
  }
  if (renderFeast) {
    estimatedHeight += 116; // Section 6: Next Appointed Feast
  }
  if (renderMillennial) {
    estimatedHeight += 108; // Section 7: 7,000-Year Millennial Clock
  }
  if (renderVerse) {
    estimatedHeight += 118; // Section 8: Daily Scriptural Watchword
  }
  estimatedHeight += 32; // bottom padding

  const height = Math.max(420, Math.round(estimatedHeight));
  const dpr = 2;
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  // Resolve exact theme colors & Alpha Transparency (matching DimenueveisAppWidgetProvider.java)
  const alphaPercent = Math.max(0, Math.min(100, widgetConfig.alphaPercent));
  const alphaFrac = alphaPercent / 100;
  const alpha255 = Math.round(alphaFrac * 255);

  let bgR = 12,
    bgG = 14,
    bgB = 20;
  let textPrimary = '#FBF8F1';
  let textSecondary = '#CBD5E1';
  let textMuted = '#94A3B8';
  let accentGold = '#F59E0B';
  let borderColor = `rgba(245, 158, 11, ${(Math.max(95, alpha255) / 255).toFixed(3)})`;
  let subtleBorderColor = `rgba(148, 163, 184, ${(Math.max(55, Math.floor(alpha255 * 0.45)) / 255).toFixed(3)})`;
  let subPanelColor = `rgba(24, 30, 44, ${(Math.max(30, Math.floor(alpha255 * 0.48)) / 255).toFixed(3)})`;
  let sabbathPanelColor = snapshot.isSabbathActive
    ? `rgba(120, 53, 15, ${(Math.max(55, Math.floor(alpha255 * 0.55)) / 255).toFixed(3)})`
    : `rgba(15, 23, 42, ${(Math.max(45, Math.floor(alpha255 * 0.55)) / 255).toFixed(3)})`;
  let badgeTextColor = '#0C0E14';

  if (widgetConfig.widgetTheme === 'parchment') {
    bgR = 253;
    bgG = 249;
    bgB = 240;
    textPrimary = '#14110B';
    textSecondary = '#292318';
    textMuted = '#574C3A';
    accentGold = '#B45309';
    borderColor = `rgba(180, 83, 9, ${(Math.max(105, alpha255) / 255).toFixed(3)})`;
    subtleBorderColor = `rgba(120, 100, 75, ${(Math.max(60, Math.floor(alpha255 * 0.45)) / 255).toFixed(3)})`;
    subPanelColor = `rgba(236, 227, 208, ${(Math.max(35, Math.floor(alpha255 * 0.5)) / 255).toFixed(3)})`;
    sabbathPanelColor = `rgba(245, 235, 210, ${(Math.max(50, Math.floor(alpha255 * 0.6)) / 255).toFixed(3)})`;
    badgeTextColor = '#FFFFFF';
  } else if (widgetConfig.widgetTheme === 'celestial') {
    bgR = 11;
    bgG = 22;
    bgB = 44;
    textPrimary = '#F8FAFC';
    textSecondary = '#DBEAFE';
    textMuted = '#93C5FD';
    accentGold = '#FBBF24';
    borderColor = `rgba(251, 191, 36, ${(Math.max(95, alpha255) / 255).toFixed(3)})`;
    subtleBorderColor = `rgba(147, 197, 253, ${(Math.max(60, Math.floor(alpha255 * 0.45)) / 255).toFixed(3)})`;
    subPanelColor = `rgba(20, 40, 80, ${(Math.max(35, Math.floor(alpha255 * 0.48)) / 255).toFixed(3)})`;
    sabbathPanelColor = `rgba(15, 30, 65, ${(Math.max(50, Math.floor(alpha255 * 0.55)) / 255).toFixed(3)})`;
    badgeTextColor = '#0B162C';
  } else if (widgetConfig.widgetTheme === 'mono') {
    bgR = 10;
    bgG = 10;
    bgB = 12;
    textPrimary = '#FFFFFF';
    textSecondary = '#E4E4E7';
    textMuted = '#A1A1AA';
    accentGold = '#EAB308';
    borderColor = `rgba(255, 255, 255, ${(Math.max(105, alpha255) / 255).toFixed(3)})`;
    subtleBorderColor = `rgba(200, 200, 210, ${(Math.max(65, Math.floor(alpha255 * 0.45)) / 255).toFixed(3)})`;
    subPanelColor = `rgba(32, 32, 36, ${(Math.max(35, Math.floor(alpha255 * 0.48)) / 255).toFixed(3)})`;
    sabbathPanelColor = `rgba(24, 24, 28, ${(Math.max(50, Math.floor(alpha255 * 0.58)) / 255).toFixed(3)})`;
    badgeTextColor = '#000000';
  }

  const withShadow = alphaPercent < 50 && widgetConfig.widgetTheme !== 'parchment';

  // Main Translucent Portrait Card
  fillAndStrokeRoundRect(
    ctx,
    10,
    10,
    width - 20,
    height - 20,
    40,
    `rgba(${bgR}, ${bgG}, ${bgB}, ${alphaFrac.toFixed(3)})`,
    widgetConfig.goldBorder ? borderColor : subtleBorderColor,
    widgetConfig.goldBorder ? 3.2 : 2.0
  );

  // Inner Filigree Hairline
  if (widgetConfig.goldBorder) {
    fillAndStrokeRoundRect(
      ctx,
      20,
      20,
      width - 40,
      height - 40,
      32,
      undefined,
      subtleBorderColor,
      1.5
    );
  }

  const leftX = 42;
  const rightX = width - 42;
  const contentW = rightX - leftX;
  let curY = 42;

  const drawDivider = (x1: number, y: number, x2: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.strokeStyle = subtleBorderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  };

  // =====================================================================
  // SECTION 1: Sacred Year + Gregorian + Sacred Date + Subline + Clock
  // =====================================================================
  drawFittedCanvasText(
    ctx,
    `✦ ${snapshot.sacredYearLabel.toUpperCase()}  ·  ${snapshot.gregorianDateStr}`,
    leftX,
    curY + 22,
    contentW,
    20,
    13,
    'bold',
    'normal',
    accentGold,
    'left',
    withShadow
  );

  drawFittedCanvasText(
    ctx,
    snapshot.sacredDateHeadline,
    leftX,
    curY + 70,
    contentW,
    38,
    22,
    'bold',
    'normal',
    textPrimary,
    'left',
    withShadow
  );

  drawFittedCanvasText(
    ctx,
    snapshot.sacredSubline,
    leftX,
    curY + 104,
    contentW,
    20,
    14,
    'normal',
    'italic',
    textSecondary,
    'left',
    withShadow
  );

  drawDivider(leftX, curY + 124, rightX);

  const fullClockText = snapshot.ampmSuffix
    ? `${snapshot.timeFormatted} ${snapshot.ampmSuffix}`
    : snapshot.timeFormatted;

  drawFittedCanvasText(
    ctx,
    fullClockText,
    leftX,
    curY + 174,
    320,
    46,
    28,
    'bold',
    'normal',
    accentGold,
    'left',
    withShadow
  );

  drawFittedCanvasText(
    ctx,
    snapshot.biblicalWatchLabel,
    rightX,
    curY + 168,
    320,
    20,
    13,
    'normal',
    'italic',
    textSecondary,
    'right',
    withShadow
  );

  curY += 198;

  // =====================================================================
  // SECTION 2: Full-Width Lunar Phase & 14-Part Enoch Light Card
  // =====================================================================
  const moonH = 148;
  fillAndStrokeRoundRect(
    ctx,
    leftX,
    curY,
    contentW,
    moonH,
    22,
    subPanelColor,
    subtleBorderColor,
    1.5
  );

  drawMoonPhaseDiscCanvas(
    ctx,
    leftX + 46,
    curY + 46,
    27,
    snapshot.lunarIlluminationPercent / 100,
    accentGold
  );

  const moonTextMaxW = contentW - 108;
  drawFittedCanvasText(
    ctx,
    snapshot.lunarPhaseLocalized,
    leftX + 90,
    curY + 40,
    moonTextMaxW,
    24,
    15,
    'bold',
    'normal',
    textPrimary,
    'left',
    withShadow
  );

  drawFittedCanvasText(
    ctx,
    `${isPt ? 'Iluminação' : 'Illumination'}: ${snapshot.lunarIlluminationPercent}% · ${snapshot.lunarAgeDays}`,
    leftX + 90,
    curY + 68,
    moonTextMaxW,
    19,
    13,
    'bold',
    'normal',
    accentGold,
    'left',
    withShadow
  );

  drawDivider(leftX + 20, curY + 86, rightX - 20);

  drawFittedCanvasText(
    ctx,
    snapshot.enochLunarPartsLabel,
    leftX + 20,
    curY + 112,
    contentW - 110,
    18,
    13,
    'normal',
    'normal',
    textSecondary,
    'left',
    withShadow
  );

  drawFittedCanvasText(
    ctx,
    `${snapshot.enochLunarParts}/14`,
    rightX - 20,
    curY + 112,
    75,
    18,
    13,
    'bold',
    'normal',
    accentGold,
    'right',
    withShadow
  );

  const barLeft = leftX + 20;
  const barRight = rightX - 20;
  const totalBarW = barRight - barLeft;
  const partGap = 5;
  const partW = (totalBarW - 13 * partGap) / 14;
  const barTop = curY + 122;
  for (let i = 0; i < 14; i++) {
    const px = barLeft + i * (partW + partGap);
    fillAndStrokeRoundRect(
      ctx,
      px,
      barTop,
      partW,
      12,
      3,
      i < snapshot.enochLunarParts ? accentGold : 'rgba(148, 163, 184, 0.3)'
    );
  }

  curY += moonH + 16;

  // =====================================================================
  // SECTION 3: Full-Width GPS Location & Sun Ephemeris Card
  // =====================================================================
  if (renderGps) {
    const gpsH = 134;
    fillAndStrokeRoundRect(
      ctx,
      leftX,
      curY,
      contentW,
      gpsH,
      22,
      subPanelColor,
      subtleBorderColor,
      1.5
    );

    drawFittedCanvasText(
      ctx,
      `📍 ${snapshot.locationCity}`,
      leftX + 20,
      curY + 42,
      contentW - 230,
      23,
      14,
      'bold',
      'normal',
      textPrimary,
      'left',
      withShadow
    );

    drawFittedCanvasText(
      ctx,
      snapshot.coordinatesFormatted,
      rightX - 20,
      curY + 42,
      195,
      18,
      13,
      'normal',
      'normal',
      textMuted,
      'right',
      false
    );

    drawDivider(leftX + 20, curY + 66, rightX - 20);

    drawFittedCanvasText(
      ctx,
      `☀ ${snapshot.sunriseStr}`,
      leftX + 20,
      curY + 108,
      180,
      21,
      14,
      'normal',
      'normal',
      textSecondary,
      'left',
      withShadow
    );

    drawFittedCanvasText(
      ctx,
      `☼ ${snapshot.solarNoonStr}`,
      leftX + contentW / 2,
      curY + 108,
      180,
      21,
      14,
      'normal',
      'normal',
      textSecondary,
      'center',
      withShadow
    );

    drawFittedCanvasText(
      ctx,
      `☾ ${snapshot.sunsetStr}`,
      rightX - 20,
      curY + 108,
      180,
      21,
      14,
      'bold',
      'normal',
      accentGold,
      'right',
      withShadow
    );

    curY += gpsH + 16;
  }

  // =====================================================================
  // SECTION 4: Full-Width Sabbath Sunset Countdown + 7-Day Rhythm Strip
  // =====================================================================
  if (renderSabbath) {
    const sabbathH = widgetConfig.showWeeklySabbathBar ? 230 : 142;
    fillAndStrokeRoundRect(
      ctx,
      leftX,
      curY,
      contentW,
      sabbathH,
      22,
      sabbathPanelColor,
      widgetConfig.goldBorder ? borderColor : subtleBorderColor,
      widgetConfig.goldBorder ? 3.2 : 2.0
    );

    const sabbathInnerW = contentW - 44;

    // Row 1: Full-Width Sabbath Section Title
    drawFittedCanvasText(
      ctx,
      `✦ ${snapshot.sabbathStatusTitle.toUpperCase()}`,
      leftX + 22,
      curY + 34,
      sabbathInnerW,
      19,
      12,
      'bold',
      'normal',
      accentGold,
      'left',
      withShadow
    );

    // Row 2: Full-Width Sabbath Target Sacred Date
    drawFittedCanvasText(
      ctx,
      snapshot.sabbathTargetDateLabel,
      leftX + 22,
      curY + 64,
      sabbathInnerW,
      22,
      13,
      'bold',
      'normal',
      textPrimary,
      'left',
      withShadow
    );

    drawDivider(leftX + 22, curY + 78, rightX - 22);

    // Row 3: Sunset Label (left) + Gold Sabbath Counter Box (right)
    const cdLeft = rightX - 246;
    const cdTop = curY + 88;
    const cdW = 224;
    const cdH = 44;
    fillAndStrokeRoundRect(ctx, cdLeft, cdTop, cdW, cdH, 12, accentGold);

    const sunsetMaxW = cdLeft - 16 - (leftX + 22);
    drawFittedCanvasText(
      ctx,
      snapshot.sabbathSunsetLabel,
      leftX + 22,
      curY + 117,
      sunsetMaxW,
      19,
      12,
      'normal',
      'italic',
      textSecondary,
      'left',
      withShadow
    );

    drawFittedCanvasText(
      ctx,
      snapshot.sabbathCountdownStr,
      cdLeft + cdW / 2,
      cdTop + cdH / 2 + 7,
      cdW - 18,
      20,
      11,
      'bold',
      'normal',
      badgeTextColor,
      'center',
      false
    );

    if (widgetConfig.showWeeklySabbathBar) {
      const stripLeft = leftX + 22;
      const stripRight = rightX - 22;
      const totalStripW = stripRight - stripLeft;
      const dayGap = 9;
      const dayBoxW = (totalStripW - 6 * dayGap) / 7;
      const dayTop = curY + 144;
      const dayH = 70;

      for (let d = 1; d <= 7; d++) {
        const dx = stripLeft + (d - 1) * (dayBoxW + dayGap);
        const isCurrent = !snapshot.isDayZero && snapshot.dayOfWeek === d;
        const isSab = d === 7;

        const cellBg = isCurrent
          ? accentGold
          : isSab
            ? 'rgba(245, 158, 11, 0.25)'
            : 'rgba(148, 163, 184, 0.18)';

        fillAndStrokeRoundRect(ctx, dx, dayTop, dayBoxW, dayH, 12, cellBg);

        drawFittedCanvasText(
          ctx,
          isSab ? (isPt ? 'SÁB' : 'SAB') : isPt ? 'DIA' : 'DAY',
          dx + dayBoxW / 2,
          dayTop + 25,
          dayBoxW - 6,
          14,
          10,
          'bold',
          'normal',
          isCurrent ? badgeTextColor : isSab ? accentGold : textSecondary,
          'center',
          false
        );

        drawFittedCanvasText(
          ctx,
          isSab ? (isPt ? '7º' : '7th') : String(d),
          dx + dayBoxW / 2,
          dayTop + 54,
          dayBoxW - 6,
          21,
          12,
          'bold',
          'normal',
          isCurrent ? badgeTextColor : isSab ? accentGold : textPrimary,
          'center',
          false
        );
      }
    }

    curY += sabbathH + 16;
  }

  // =====================================================================
  // SECTION 5: Full-Width 13-Sign Mazzaroth & 1 Enoch Celestial Gate Card
  // =====================================================================
  if (renderZodiac) {
    const zH = 104;
    fillAndStrokeRoundRect(
      ctx,
      leftX,
      curY,
      contentW,
      zH,
      20,
      subPanelColor,
      subtleBorderColor,
      1.5
    );

    drawFittedCanvasText(
      ctx,
      `${snapshot.zodiacSymbol} ${snapshot.zodiacName} · ${snapshot.zodiacArchetype}`,
      leftX + 22,
      curY + 42,
      contentW - 44,
      22,
      14,
      'bold',
      'normal',
      textPrimary,
      'left',
      withShadow
    );

    drawFittedCanvasText(
      ctx,
      `${snapshot.enochGateLabel} · ${snapshot.enochDayNightRatioLabel}`,
      leftX + 22,
      curY + 80,
      contentW - 44,
      19,
      13,
      'normal',
      'normal',
      textSecondary,
      'left',
      withShadow
    );

    curY += zH + 16;
  }

  // =====================================================================
  // SECTION 6: Full-Width Next Appointed Feast (Leviticus 23) Card
  // =====================================================================
  if (renderFeast) {
    const fH = 100;
    fillAndStrokeRoundRect(
      ctx,
      leftX,
      curY,
      contentW,
      fH,
      20,
      subPanelColor,
      subtleBorderColor,
      1.5
    );

    drawFittedCanvasText(
      ctx,
      isPt ? 'PRÓXIMA SOLENIDADE (LV 23)' : 'NEXT APPOINTED FEAST (LV 23)',
      leftX + 22,
      curY + 38,
      contentW - 44,
      17,
      13,
      'bold',
      'normal',
      accentGold,
      'left',
      withShadow
    );

    drawFittedCanvasText(
      ctx,
      snapshot.nextFeastLabel,
      leftX + 22,
      curY + 76,
      contentW - 44,
      22,
      14,
      'bold',
      'normal',
      textPrimary,
      'left',
      withShadow
    );

    curY += fH + 16;
  }

  // =====================================================================
  // SECTION 7: Full-Width 7,000-Year Millennial Clock Progress Bar Card
  // =====================================================================
  if (renderMillennial) {
    const millH = 92;
    fillAndStrokeRoundRect(
      ctx,
      leftX,
      curY,
      contentW,
      millH,
      20,
      subPanelColor,
      subtleBorderColor,
      1.5
    );

    drawFittedCanvasText(
      ctx,
      snapshot.millennialSummaryLabel,
      leftX + 22,
      curY + 38,
      contentW - 125,
      19,
      13,
      'bold',
      'normal',
      accentGold,
      'left',
      withShadow
    );

    const pctStr = `${snapshot.millennialProgressPercent.toFixed(1)}%`;
    drawFittedCanvasText(
      ctx,
      pctStr,
      rightX - 22,
      curY + 38,
      85,
      19,
      13,
      'bold',
      'normal',
      textSecondary,
      'right',
      withShadow
    );

    const trackLeft = leftX + 22;
    const trackRight = rightX - 22;
    const trackW = trackRight - trackLeft;
    const trackTop = curY + 56;
    fillAndStrokeRoundRect(
      ctx,
      trackLeft,
      trackTop,
      trackW,
      14,
      7,
      'rgba(148, 163, 184, 0.25)'
    );

    const fillW = Math.max(
      14,
      trackW * (Math.min(100, Math.max(0, snapshot.millennialProgressPercent)) / 100)
    );
    fillAndStrokeRoundRect(ctx, trackLeft, trackTop, fillW, 14, 7, accentGold);

    curY += millH + 16;
  }

  // =====================================================================
  // SECTION 8: Full-Width Daily Scriptural Watchword Verse Card
  // =====================================================================
  if (renderVerse) {
    const verseH = 102;
    fillAndStrokeRoundRect(
      ctx,
      leftX,
      curY,
      contentW,
      verseH,
      20,
      subPanelColor,
      subtleBorderColor,
      1.5
    );

    drawFittedCanvasText(
      ctx,
      `${snapshot.dailyVerseRef}:`,
      leftX + 22,
      curY + 38,
      contentW - 44,
      18,
      13,
      'bold',
      'normal',
      accentGold,
      'left',
      withShadow
    );

    drawFittedCanvasText(
      ctx,
      `“${snapshot.dailyVerseQuote}”`,
      leftX + 22,
      curY + 76,
      contentW - 44,
      19,
      12,
      'normal',
      'italic',
      textSecondary,
      'left',
      withShadow
    );
  }

  ctx.restore();
}

export const AndroidHomeWidgetStudio: React.FC<AndroidHomeWidgetStudioProps> = ({
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
  const widgetCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Real-time clock updater (checks every second so hour:minute transitions happen on the exact :00 second)
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

  // Redraw the 1:1 Android Widget Canvas whenever snapshot or widgetConfig updates
  useEffect(() => {
    if (widgetCanvasRef.current) {
      renderAndroidWidgetToCanvas(widgetCanvasRef.current, snapshot, widgetConfig, isPt);
    }
  }, [snapshot, widgetConfig, isPt]);

  // Persist and auto-sync to Android APK whenever widgetConfig changes
  const updateWidgetConfig = (partial: Partial<AndroidWidgetConfig>) => {
    setWidgetConfig((prev) => {
      const next = { ...prev, ...partial, showSeconds: false };
      saveAndroidWidgetConfig(next);
      const nextSnap = buildLiveAndroidWidgetSnapshot(new Date(), config, next, language);
      syncWidgetToAndroidBridge(nextSnap, next);
      return next;
    });
  };

  // Auto-sync to AndroidBridge when mounted or whenever the live minute (timeFormatted) ticks
  useEffect(() => {
    syncWidgetToAndroidBridge(snapshot, widgetConfig);
  }, [snapshot.timeFormatted, config.userLocation, language]);

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

  const handleExportWidgetPng = () => {
    if (!widgetCanvasRef.current || isExportingPng) return;
    setIsExportingPng(true);
    try {
      const dataUrl = widgetCanvasRef.current.toDataURL('image/png');
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

  const wallpaper = WALLPAPER_STYLES[widgetConfig.previewWallpaper];

  const bodyContent = (
    <div className="space-y-6 font-serif">
      {/* Studio Header Banner — Close (X) button pinned cleanly in the top-right corner */}
      <div className="relative border border-slate-800 bg-slate-950 p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {isModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 inline-flex items-center justify-center w-9 h-9 border border-slate-700 bg-slate-900 hover:border-amber-400 hover:text-amber-300 text-slate-200 transition-colors cursor-pointer"
            title={isPt ? 'Fechar' : 'Close'}
            aria-label={isPt ? 'Fechar' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className={`space-y-1 ${isModal && onCloseModal ? 'pr-11 sm:pr-12' : ''}`}>
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
              ? 'Personalize o widget nativo da tela inicial do Android com a data do Calendário de 13 Meses, hora e minutos em tempo real, fase da Lua (e luz de 14 partes de Enoque), localização GPS, contagem regressiva para o pôr do sol do Sábado e controle deslizante de Transparência Alpha (0% a 100%).'
              : 'Customize the native Android home screen widget with the 13-Month Sacred Date, real-time hour & minutes, Moon phase (and 14-part Enoch light), GPS location, live Sabbath sunset countdown, and an Alpha Transparency slider (0% to 100%).'}
          </p>
        </div>

        <div
          className={`flex flex-wrap items-center gap-2.5 shrink-0 ${
            isModal && onCloseModal ? 'lg:mr-12' : ''
          }`}
        >
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
        {/* LEFT COLUMN (7 cols): Simulated Android Home Screen + Exact 1:1 Native Widget Canvas */}
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
                [
                  'jerusalem_night',
                  'judean_sunset',
                  'olive_grove',
                  'minimal_slate',
                ] as SimulatedWallpaperId[]
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
                    <span>
                      {isPt ? wp.namePt.split(' · ')[0] : wp.nameEn.split(' · ')[0]}
                    </span>
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
            {/* Subtle Decorative Celestial Grid Dots to Emphasize Alpha Transparency */}
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
                <span>{snapshot.timeFormatted}</span>
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

            {/* EXACT 1:1 NATIVE ANDROID WIDGET CANVAS RENDER */}
            <div className="relative z-10 my-auto flex items-center justify-center py-1">
              <div
                className={`w-full max-w-[420px] mx-auto rounded-[22px] transition-all duration-200 ${
                  widgetConfig.frostedBlur && widgetConfig.alphaPercent > 5
                    ? 'backdrop-blur-md'
                    : ''
                }`}
              >
                <canvas
                  ref={widgetCanvasRef}
                  className="w-full h-auto block mx-auto drop-shadow-2xl"
                />
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
                  key: 'use24HourFormat' as const,
                  labelPt: 'Relógio 24 Horas (HH:mm)',
                  labelEn: '24-Hour Clock (HH:mm)',
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
