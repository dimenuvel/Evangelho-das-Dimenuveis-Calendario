/**
 * @file src/components/ChineseZodiacWidget.tsx
 * Interactive Chinese Zodiac (Shengxiao 生肖), 60-Year Sexagenary Cycle (Ganzhi 干支),
 * Five Elements (Wu Xing 五行), and Four Pillars of Birth (BaZi 四柱 — Year, Month, Day, Shichen Hour)
 * with interactive 12-Branch SVG Compass Wheel and high-resolution PNG export.
 */

import React, { useState, useMemo, useRef } from 'react';
import { toCanvas } from 'html-to-image';
import { CalendarConfiguration } from '../types/calendar';
import { Language } from '../i18n/translations';
import {
  TWELVE_CHINESE_ZODIAC_ANIMALS,
  WU_XING_ELEMENTS,
  WuXingElementId,
  ChineseZodiacAnimal,
  calculateNatalChineseZodiacChart,
} from '../astronomy/chineseZodiac';
import {
  Sparkles,
  Calendar,
  Clock,
  Download,
  Loader2,
  Compass,
} from 'lucide-react';

interface ChineseZodiacWidgetProps {
  config: CalendarConfiguration;
  onUpdateConfig: (partial: Partial<CalendarConfiguration>) => void;
  language: Language;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 3
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lineCount++;
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
      if (lineCount >= maxLines - 1) {
        const remaining = [line, ...words.slice(i + 1)].join(' ');
        ctx.fillText(remaining, x, currentY, maxWidth);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export const ChineseZodiacWidget: React.FC<ChineseZodiacWidgetProps> = ({
  config,
  onUpdateConfig,
  language,
}) => {
  const isPt = language === 'pt';
  const wheelBoxRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [previewDateISO, setPreviewDateISO] = useState<string>('1990-06-21');
  const [selectedAnimalIndex, setSelectedAnimalIndex] = useState<number | null>(null);
  const [isDownloadingPng, setIsDownloadingPng] = useState<boolean>(false);

  const activeBirthDateISO = config.userBirthdayGregorian || previewDateISO;
  const activeBirthTimeHHMM = config.userBirthTime || '12:00';
  const isUsingUserSavedBirthday = Boolean(config.userBirthdayGregorian);

  const chart = useMemo(() => {
    return calculateNatalChineseZodiacChart(activeBirthDateISO, activeBirthTimeHHMM);
  }, [activeBirthDateISO, activeBirthTimeHHMM]);

  if (!chart) return null;

  const inspectedAnimal: ChineseZodiacAnimal =
    selectedAnimalIndex !== null
      ? TWELVE_CHINESE_ZODIAC_ANIMALS[selectedAnimalIndex - 1] || chart.yearPillar.animal
      : chart.yearPillar.animal;

  const inspectedElement = WU_XING_ELEMENTS[inspectedAnimal.fixedElement];

  const handleDateChange = (newDateISO: string) => {
    if (newDateISO) {
      setPreviewDateISO(newDateISO);
    }
    setSelectedAnimalIndex(null);
    onUpdateConfig({ userBirthdayGregorian: newDateISO || undefined });
  };

  const handleTimeChange = (newTimeHHMM: string) => {
    onUpdateConfig({ userBirthTime: newTimeHHMM || '12:00' });
  };

  const triggerPngDownload = (dataUrl: string, fileName: string) => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.savePngFile) {
      window.AndroidBridge.savePngFile(fileName, dataUrl);
      return;
    }
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadChineseChart = async () => {
    if (isDownloadingPng) return;
    setIsDownloadingPng(true);
    const safeTime = chart.birthTimeHHMM.replace(':', '');
    const fileName = isPt
      ? `Zodiaco-Chines-4-Pilares-${chart.birthDateISO}-${safeTime}.png`
      : `Chinese-Zodiac-4-Pillars-${chart.birthDateISO}-${safeTime}.png`;

    try {
      const poster = document.createElement('canvas');
      poster.width = 2400;
      poster.height = 1640;
      const ctx = poster.getContext('2d');
      if (!ctx) return;

      // 1. Background & Archival Border
      ctx.fillStyle = '#070a0f';
      ctx.fillRect(0, 0, poster.width, poster.height);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.strokeRect(28, 28, poster.width - 56, poster.height - 56);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(38, 38, poster.width - 76, poster.height - 76);

      // 2. Top Header
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(40, 40, poster.width - 80, 134);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 174);
      ctx.lineTo(poster.width - 40, 174);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 34px Georgia, "Times New Roman", serif';
      ctx.fillText(
        isPt
          ? 'EVANGELHO DAS DIMENÚVEIS — ZODÍACO CHINÊS & OS 4 PILARES DO NASCIMENTO (BAZI)'
          : 'GOSPEL OF DIMENUOUS — CHINESE ZODIAC & FOUR PILLARS OF BIRTH (BAZI)',
        72,
        92
      );

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 24px Georgia, "Times New Roman", serif';
      ctx.fillText(
        `${isPt ? 'Data & Hora:' : 'Date & Time:'} ${chart.birthDateISO} · ${
          chart.birthTimeHHMM
        }   |   ${
          isPt ? 'Signo Principal:' : 'Primary Sign:'
        } ${chart.yearPillar.animal.symbol} ${
          isPt ? chart.yearPillar.fullTitlePt : chart.yearPillar.fullTitleEn
        }`,
        72,
        136
      );

      // 3. Capture 12-Branch SVG Wheel via html-to-image `toCanvas`
      let wheelCaptured = false;
      if (wheelBoxRef.current) {
        try {
          const capturedWheel = await toCanvas(wheelBoxRef.current, {
            pixelRatio: 2.5,
            backgroundColor: '#070a0f',
            cacheBust: true,
            skipFonts: true,
            fontEmbedCSS: '',
          });
          ctx.drawImage(capturedWheel, 70, 205, 1100, 1100);
          wheelCaptured = true;
        } catch {
          wheelCaptured = false;
        }
      }

      if (!wheelCaptured && svgRef.current) {
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svgRef.current);
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => reject(e);
          img.src = url;
        });
        ctx.drawImage(img, 70, 205, 1100, 1100);
        URL.revokeObjectURL(url);
      }

      // 4. Bottom-Left Inspected Guardian Box
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(70, 1335, 1100, 240);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(70, 1335, 1100, 240);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 25px Georgia, "Times New Roman", serif';
      ctx.fillText(
        `${inspectedAnimal.symbol} ${
          isPt ? inspectedAnimal.namePt : inspectedAnimal.nameEn
        } (${inspectedAnimal.branchHanzi} ${inspectedAnimal.branchPinyin} · ${
          inspectedAnimal.animalHanzi
        }) — ${inspectedAnimal.shichenHours}`,
        96,
        1380
      );

      ctx.fillStyle = '#34d399';
      ctx.font = 'italic 20px Georgia, "Times New Roman", serif';
      ctx.fillText(
        `${isPt ? inspectedAnimal.archetypePt : inspectedAnimal.archetypeEn} · ${
          isPt ? inspectedAnimal.sacredCorrelationPt : inspectedAnimal.sacredCorrelationEn
        }`,
        96,
        1416
      );

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '20px Georgia, "Times New Roman", serif';
      drawWrappedText(
        ctx,
        isPt ? inspectedAnimal.meaningPt : inspectedAnimal.meaningEn,
        96,
        1454,
        1048,
        30,
        3
      );

      // Divider
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(1210, 174);
      ctx.lineTo(1210, poster.height - 40);
      ctx.stroke();

      // 5. Right Column — The 4 Pillars of Birth (BaZi)
      const rightX = 1248;
      const rightW = 1082;
      let curY = 224;

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 25px Georgia, "Times New Roman", serif';
      ctx.fillText(
        isPt
          ? 'I. OS QUATRO PILARES DO NASCIMENTO (BAZI 四柱八字)'
          : 'I. THE FOUR PILLARS OF BIRTH (BAZI 四柱八字)',
        rightX,
        curY
      );
      curY += 22;

      const pillars = [
        chart.yearPillar,
        chart.monthPillar,
        chart.dayPillar,
        chart.hourPillar,
      ];

      for (const p of pillars) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(rightX, curY, rightW, 138);
        ctx.strokeStyle = p.elementInfo.colorHex;
        ctx.lineWidth = 2;
        ctx.strokeRect(rightX, curY, rightW, 138);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 19px Georgia, "Times New Roman", serif';
        ctx.fillText(isPt ? p.labelPt : p.labelEn, rightX + 20, curY + 32);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 25px Georgia, "Times New Roman", serif';
        ctx.fillText(
          `${p.animal.symbol} ${isPt ? p.fullTitlePt : p.fullTitleEn}`,
          rightX + 20,
          curY + 70
        );

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'italic 19px Georgia, "Times New Roman", serif';
        ctx.fillText(
          `${isPt ? p.rolePt : p.roleEn} · ${p.animal.shichenHours}`,
          rightX + 20,
          curY + 104
        );

        ctx.fillStyle = '#34d399';
        ctx.font = '17px Georgia, "Times New Roman", serif';
        ctx.fillText(
          isPt ? p.animal.trineGroupPt : p.animal.trineGroupEn,
          rightX + 20,
          curY + 128
        );

        curY += 154;
      }

      // 6. Five Elements (Wu Xing) Balance & Cycle
      curY += 20;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px Georgia, "Times New Roman", serif';
      ctx.fillText(
        isPt
          ? 'II. EQUILÍBRIO DOS 5 ELEMENTOS (WU XING 五行) NOS 8 CARACTERES'
          : 'II. FIVE ELEMENTS (WU XING 五行) BALANCE ACROSS THE 8 CHARACTERS',
        rightX,
        curY
      );
      curY += 24;

      const elementKeys: WuXingElementId[] = ['WOOD', 'FIRE', 'EARTH', 'METAL', 'WATER'];
      const boxW = (rightW - 4 * 16) / 5;
      elementKeys.forEach((elKey, idx) => {
        const elInfo = WU_XING_ELEMENTS[elKey];
        const count = chart.elementBalance[elKey];
        const ex = rightX + idx * (boxW + 16);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ex, curY, boxW, 130);
        ctx.strokeStyle = elInfo.colorHex;
        ctx.lineWidth = 2;
        ctx.strokeRect(ex, curY, boxW, 130);

        ctx.fillStyle = elInfo.colorHex;
        ctx.font = 'bold 26px Georgia, "Times New Roman", serif';
        ctx.fillText(`${elInfo.hanzi} ${isPt ? elInfo.namePt : elInfo.nameEn}`, ex + 16, curY + 42);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 28px Georgia, "Times New Roman", serif';
        ctx.fillText(`${count} / 8`, ex + 16, curY + 82);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px Georgia, "Times New Roman", serif';
        ctx.fillText(isPt ? elInfo.directionPt : elInfo.directionEn, ex + 16, curY + 112);
      });

      const dataUrl = poster.toDataURL('image/png');
      triggerPngDownload(dataUrl, fileName);
    } finally {
      setIsDownloadingPng(false);
    }
  };

  // SVG 12-Branch Compass Wheel Coordinates
  const cx = 260;
  const cy = 260;
  const rOuter = 242;
  const rAnimalInner = 172;
  const rShichenInner = 144;
  const rWuXingHub = 112;

  // In traditional Chinese compass / clock wheel, Rat (Zi, 0°) is placed at Top (-90° in SVG)
  const branchIdxToSvgDeg = (branchIdx0: number): number => {
    return -90 + branchIdx0 * 30;
  };

  const polarToXY = (radius: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const buildWedgePath = (
    r1: number,
    r2: number,
    startDeg: number,
    endDeg: number
  ): string => {
    const p1 = polarToXY(r2, startDeg);
    const p2 = polarToXY(r2, endDeg);
    const p3 = polarToXY(r1, endDeg);
    const p4 = polarToXY(r1, startDeg);
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${r2} ${r2} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${r1} ${r1} 0 0 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  };

  // 5 Elements Pentagram Nodes inside the central hub
  const wuXingOrder: WuXingElementId[] = ['FIRE', 'EARTH', 'METAL', 'WATER', 'WOOD'];
  const wuXingNodes = wuXingOrder.map((elId, idx) => {
    const deg = -90 + idx * 72;
    const pos = polarToXY(68, deg);
    return {
      id: elId,
      info: WU_XING_ELEMENTS[elId],
      x: pos.x,
      y: pos.y,
    };
  });

  return (
    <div className="no-print border border-slate-800 bg-slate-950 divide-y divide-slate-800 font-serif">
      {/* ================================================================== */}
      {/* TOP HEADER & BIRTH DATE / EXACT TIME CONTROLS                      */}
      {/* ================================================================== */}
      <div className="p-4 sm:p-5 bg-slate-900/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-400 font-bold">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isPt
                ? 'Cap. II (Aba III) · Zodíaco Chinês, Ciclo Sexagenário (60 Anos) & Os 4 Pilares (BaZi)'
                : 'Ch. II (Tab III) · Chinese Zodiac, 60-Year Sexagenary Cycle & Four Pillars (BaZi)'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDownloadChineseChart}
            disabled={isDownloadingPng}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            {isDownloadingPng ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Download className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {isDownloadingPng
                ? isPt
                  ? 'Gerando Imagem...'
                  : 'Generating Image...'
                : isPt
                ? 'Baixar Mapa Oriental'
                : 'Download Chinese Chart'}
            </span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <h3 className="text-lg sm:text-xl font-bold text-slate-100">
              {isPt
                ? 'Os 12 Guardiões Terrestres (Dizhi 地支), 5 Elementos (Wu Xing 五行) & 4 Pilares do Nascimento'
                : 'The 12 Earthly Guardians (Dizhi 地支), 5 Elements (Wu Xing 五行) & 4 Pillars of Birth'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {isPt
                ? 'Enquanto o Mazzaroth de 13 Signos divide a órbita solar anual em 13 arcos de 28 dias, a astronomia tradicional oriental acompanha o ciclo orbital de ~12 anos de Júpiter (Sui Xing, a Estrela do Ano), os 10 Troncos Celestes, os 5 Elementos e as 12 Vigílias Solares Duplas (Shichen de 2 horas), revelando os 4 Pilares do seu nascimento (Ano, Mês, Dia e Hora Exata).'
                : 'While the 13-Sign Mazzaroth divides the annual solar orbit into 13 arcs of 28 days, traditional eastern astronomy tracks the ~12-year orbital cycle of Jupiter (Sui Xing, the Year Star), the 10 Heavenly Stems, the 5 Elements, and the 12 Double-Hour Solar Watches (Shichen), revealing the 4 Pillars of your birth (Year, Month, Day, and Exact Hour).'}
            </p>
          </div>

          {/* Synchronized Birth Date & Time Input Strip */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-950 p-3 border border-amber-500/40 shrink-0">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <label
                htmlFor="chinese-birth-date"
                className="text-xs font-semibold text-slate-200 whitespace-nowrap"
              >
                {isPt ? 'Data:' : 'Date:'}
              </label>
              <input
                id="chinese-birth-date"
                type="date"
                value={activeBirthDateISO}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs tabular-nums focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <label
                htmlFor="chinese-birth-time"
                className="text-xs font-semibold text-slate-200 whitespace-nowrap"
              >
                {isPt ? 'Hora (Shichen):' : 'Hour (Shichen):'}
              </label>
              <input
                id="chinese-birth-time"
                type="time"
                value={activeBirthTimeHHMM}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs tabular-nums focus:outline-none focus:border-amber-400"
              />
            </div>

            {!isUsingUserSavedBirthday && (
              <button
                type="button"
                onClick={() => onUpdateConfig({ userBirthdayGregorian: previewDateISO })}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                {isPt ? 'Salvar Aniversário' : 'Save Birthday'}
              </button>
            )}
          </div>
        </div>

        {/* Astronomical Lunar New Year Boundary Banner */}
        <div className="p-3 border border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold">
              {chart.yearPillar.animal.symbol}{' '}
              {isPt ? chart.yearPillar.fullTitlePt : chart.yearPillar.fullTitleEn}
            </span>
            <span className="text-slate-300">
              {isPt
                ? `Ano Novo Lunar Chinês em ${chart.gregorianBirthYear}:`
                : `Chinese Lunar New Year in ${chart.gregorianBirthYear}:`}{' '}
              <strong className="text-amber-400 tabular-nums">
                {chart.lunarNewYearDateISO}
              </strong>
            </span>
            {chart.bornBeforeLunarNewYear && (
              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-semibold">
                {isPt
                  ? `Nascido antes da Lua Nova de ${chart.lunarNewYearDateISO} → Regido pelo Ano Lunar de ${chart.chineseLunarYear}`
                  : `Born before the New Moon of ${chart.lunarNewYearDateISO} → Governed by Lunar Year ${chart.chineseLunarYear}`}
              </span>
            )}
          </div>

          <div className="text-slate-300 tabular-nums">
            {isPt ? `Ano Atual (${chart.currentYearNumber}):` : `Current Year (${chart.currentYearNumber}):`}{' '}
            <strong className="text-amber-300">
              {chart.currentYearPillar.animal.symbol}{' '}
              {isPt
                ? chart.currentYearPillar.fullTitlePt
                : chart.currentYearPillar.fullTitleEn}
            </strong>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MAIN TWO-COLUMN SECTION: 12-BRANCH WHEEL + 4 PILLARS (BAZI)        */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-800 bg-slate-950">
        {/* LEFT COLUMN (7 cols): Interactive 12-Sector Chinese Zodiac & Wu Xing Wheel */}
        <div className="xl:col-span-7 p-4 sm:p-6 flex flex-col items-center justify-between space-y-4 bg-slate-950">
          <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-amber-400 font-bold uppercase tracking-wider">
              {isPt
                ? 'Roda dos 12 Ramos Terrestres (Dizhi) & Pentagrama dos 5 Elementos'
                : '12 Earthly Branches (Dizhi) Wheel & 5-Element Pentagram'}
            </span>
            <span className="text-slate-300 italic">
              {isPt
                ? 'Toque em qualquer guardião na roda para inspecionar:'
                : 'Tap any guardian on the wheel to inspect:'}
            </span>
          </div>

          {/* SVG 12-Branch & 5-Element Wheel */}
          <div
            ref={wheelBoxRef}
            className="w-full max-w-[540px] aspect-square relative p-1 bg-[#070a0f] rounded-full"
          >
            <svg
              ref={svgRef}
              viewBox="0 0 520 520"
              className="w-full h-full select-none"
              role="img"
              aria-label={
                isPt
                  ? 'Roda do Zodíaco Chinês de 12 Animais e 5 Elementos'
                  : '12-Animal Chinese Zodiac & 5 Elements Wheel'
              }
            >
              <defs>
                <radialGradient id="chineseHubGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#090d16" stopOpacity="1" />
                </radialGradient>
              </defs>

              {/* Outer Frame */}
              <circle
                cx={cx}
                cy={cy}
                r={rOuter + 6}
                fill="#090d16"
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* 12 Animal Sectors */}
              {TWELVE_CHINESE_ZODIAC_ANIMALS.map((animal, idx) => {
                const midDeg = branchIdxToSvgDeg(idx);
                const startDeg = midDeg - 15;
                const endDeg = midDeg + 15;
                const normDeg = ((midDeg % 360) + 360) % 360;
                const tangentRot =
                  normDeg >= 180 && normDeg <= 360 ? normDeg + 90 : normDeg - 90;

                const isYearAnimal = chart.yearPillar.animal.index === animal.index;
                const isHourAnimal = chart.hourPillar.animal.index === animal.index;
                const isDayAnimal = chart.dayPillar.animal.index === animal.index;
                const isInspected = inspectedAnimal.index === animal.index;
                const isDragon = animal.id === 'DRAGON';

                let sectorFill = '#0f172a';
                if (isInspected) sectorFill = 'rgba(245, 158, 11, 0.34)';
                else if (isYearAnimal) sectorFill = 'rgba(245, 158, 11, 0.24)';
                else if (isHourAnimal) sectorFill = 'rgba(16, 185, 129, 0.24)';
                else if (isDayAnimal) sectorFill = 'rgba(59, 130, 246, 0.22)';
                else if (isDragon) sectorFill = 'rgba(6, 95, 70, 0.28)';

                const wedgePath = buildWedgePath(rAnimalInner, rOuter, startDeg, endDeg);
                const shichenPath = buildWedgePath(
                  rShichenInner,
                  rAnimalInner,
                  startDeg,
                  endDeg
                );

                const symPos = polarToXY(222, midDeg);
                const namePos = polarToXY(192, midDeg);
                const shichenPos = polarToXY(158, midDeg);
                const badgePos = polarToXY(128, midDeg);

                const shortName =
                  animal.id === 'GOAT'
                    ? isPt
                      ? 'Cabra'
                      : 'Goat'
                    : animal.id === 'OX'
                    ? isPt
                      ? 'Boi'
                      : 'Ox'
                    : animal.id === 'RABBIT'
                    ? isPt
                      ? 'Coelho'
                      : 'Rabbit'
                    : animal.id === 'PIG'
                    ? isPt
                      ? 'Javali'
                      : 'Boar'
                    : isPt
                    ? animal.namePt
                    : animal.nameEn;

                return (
                  <g
                    key={animal.id}
                    onClick={() => setSelectedAnimalIndex(animal.index)}
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {/* Outer Animal Sector */}
                    <path
                      d={wedgePath}
                      fill={sectorFill}
                      stroke={
                        isInspected || isYearAnimal
                          ? '#f59e0b'
                          : isHourAnimal
                          ? '#10b981'
                          : '#334155'
                      }
                      strokeWidth={isInspected || isYearAnimal ? '1.8' : '1'}
                    />

                    {/* Inner Shichen 2-Hour Ring */}
                    <path
                      d={shichenPath}
                      fill="#0b111e"
                      stroke="#334155"
                      strokeWidth="0.9"
                    />

                    {/* Symbol + Hanzi */}
                    <text
                      x={symPos.x}
                      y={symPos.y}
                      transform={`rotate(${tangentRot.toFixed(2)}, ${symPos.x.toFixed(
                        2
                      )}, ${symPos.y.toFixed(2)})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#f8fafc"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      {animal.symbol} {animal.branchHanzi}
                    </text>

                    {/* Full Animal Name */}
                    <text
                      x={namePos.x}
                      y={namePos.y}
                      transform={`rotate(${tangentRot.toFixed(2)}, ${namePos.x.toFixed(
                        2
                      )}, ${namePos.y.toFixed(2)})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={
                        isInspected || isYearAnimal
                          ? '#fde68a'
                          : isHourAnimal
                          ? '#6ee7b7'
                          : '#fbbf24'
                      }
                      fontSize="10.5"
                      fontWeight="bold"
                    >
                      {shortName}
                    </text>

                    {/* 2-Hour Shichen Watch */}
                    <text
                      x={shichenPos.x}
                      y={shichenPos.y}
                      transform={`rotate(${tangentRot.toFixed(2)}, ${shichenPos.x.toFixed(
                        2
                      )}, ${shichenPos.y.toFixed(2)})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#94a3b8"
                      fontSize="8"
                      fontWeight="bold"
                    >
                      {animal.shichenHours.replace(' – ', '-')}
                    </text>

                    {/* Active Natal Pillar Marker Dot inside Ring */}
                    {(isYearAnimal || isHourAnimal || isDayAnimal) && (
                      <g>
                        <circle
                          cx={badgePos.x}
                          cy={badgePos.y}
                          r={11}
                          fill={
                            isYearAnimal
                              ? '#f59e0b'
                              : isHourAnimal
                              ? '#10b981'
                              : '#3b82f6'
                          }
                          stroke="#090d16"
                          strokeWidth="1.5"
                        />
                        <text
                          x={badgePos.x}
                          y={badgePos.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#090d16"
                          fontSize="7.5"
                          fontWeight="bold"
                        >
                          {isYearAnimal
                            ? isPt
                              ? 'ANO'
                              : 'YR'
                            : isHourAnimal
                            ? isPt
                              ? 'HORA'
                              : 'HR'
                            : isPt
                            ? 'DIA'
                            : 'DAY'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Central Wu Xing (5 Elements) Hub */}
              <circle
                cx={cx}
                cy={cy}
                r={rWuXingHub}
                fill="url(#chineseHubGrad)"
                stroke="#475569"
                strokeWidth="1.4"
              />

              {/* Generative Cycle Circle (Sheng) & Overcoming Star (Ke) */}
              {wuXingNodes.map((node, i) => {
                const nextGen = wuXingNodes[(i + 1) % 5];
                const nextKe = wuXingNodes[(i + 2) % 5];
                return (
                  <g key={node.id}>
                    {/* Sheng Generative Chord */}
                    <line
                      x1={node.x}
                      y1={node.y}
                      x2={nextGen.x}
                      y2={nextGen.y}
                      stroke="#34d399"
                      strokeWidth="1.4"
                      strokeOpacity="0.6"
                    />
                    {/* Ke Overcoming Pentagram Line */}
                    <line
                      x1={node.x}
                      y1={node.y}
                      x2={nextKe.x}
                      y2={nextKe.y}
                      stroke="#f59e0b"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.55"
                    />
                  </g>
                );
              })}

              {/* 5 Element Medallions */}
              {wuXingNodes.map((node) => {
                const count = chart.elementBalance[node.id];
                return (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={20}
                      fill="#090d16"
                      stroke={node.info.colorHex}
                      strokeWidth="2"
                    />
                    <text
                      x={node.x}
                      y={node.y - 4}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={node.info.colorHex}
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {node.info.hanzi}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 8}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#f8fafc"
                      fontSize="7.5"
                      fontWeight="bold"
                    >
                      {isPt ? node.info.namePt.split(' ')[0] : node.info.nameEn.split(' ')[0]} ({count})
                    </text>
                  </g>
                );
              })}

              {/* Center Yin-Yang / Ganzhi Core */}
              <circle
                cx={cx}
                cy={cy}
                r={22}
                fill="#090d16"
                stroke="#f59e0b"
                strokeWidth="1.2"
              />
              <text
                x={cx}
                y={cy - 4}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize="10"
                fontWeight="bold"
              >
                {chart.yearPillar.stem.hanzi}
                {chart.yearPillar.animal.branchHanzi}
              </text>
              <text
                x={cx}
                y={cy + 8}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="7"
              >
                #{chart.yearPillar.sexagenaryNumber}/60
              </text>
            </svg>
          </div>

          {/* Live Inspected Guardian Card Under Wheel */}
          <div className="w-full border border-amber-500/50 bg-slate-900/60 p-4 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-bold">
                  {inspectedAnimal.symbol}{' '}
                  {isPt ? inspectedAnimal.namePt : inspectedAnimal.nameEn} (
                  {inspectedAnimal.branchHanzi} {inspectedAnimal.branchPinyin} ·{' '}
                  {inspectedAnimal.animalHanzi})
                </span>
                <span className="text-emerald-400 font-bold">
                  {inspectedElement.hanzi}{' '}
                  {isPt ? inspectedElement.namePt : inspectedElement.nameEn} (
                  {inspectedAnimal.polarity})
                </span>
              </div>
              <span className="tabular-nums text-amber-400 font-bold">
                {isPt ? 'Vigília Solar:' : 'Solar Watch:'} {inspectedAnimal.shichenHours} ·{' '}
                {isPt ? inspectedAnimal.directionPt : inspectedAnimal.directionEn}
              </span>
            </div>

            <div className="text-purple-300 italic font-medium">
              {isPt ? inspectedAnimal.archetypePt : inspectedAnimal.archetypeEn} —{' '}
              {isPt ? inspectedAnimal.trineGroupPt : inspectedAnimal.trineGroupEn}
            </div>

            <p className="text-slate-200 leading-relaxed">
              {isPt ? inspectedAnimal.meaningPt : inspectedAnimal.meaningEn}
            </p>

            <div className="pt-1.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-emerald-300 font-semibold">
                ✦ {isPt ? 'Correlação Sagrada:' : 'Sacred Correlation:'}{' '}
                {isPt
                  ? inspectedAnimal.sacredCorrelationPt
                  : inspectedAnimal.sacredCorrelationEn}
              </span>
              <span className="text-slate-300">
                {isPt ? 'Aliados Harmônicos:' : 'Harmonic Allies:'}{' '}
                <strong className="text-amber-300">
                  {isPt ? inspectedAnimal.alliesPt : inspectedAnimal.alliesEn}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): The Four Pillars of Birth (BaZi) & 5 Elements */}
        <div className="xl:col-span-5 divide-y divide-slate-800 flex flex-col justify-between bg-slate-950">
          {/* 1. The Four Pillars (Year, Month, Day, Exact Hour) */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {isPt
                  ? 'I. Os Quatro Pilares do Nascimento (BaZi 四柱)'
                  : 'I. The Four Pillars of Birth (BaZi 四柱)'}
              </span>
              <span className="text-[11px] italic text-slate-300">
                {isPt ? 'Toque para inspecionar na roda' : 'Tap to inspect on wheel'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                chart.yearPillar,
                chart.monthPillar,
                chart.dayPillar,
                chart.hourPillar,
              ].map((pillar) => {
                const isSelected = inspectedAnimal.index === pillar.animal.index;
                return (
                  <div
                    key={pillar.pillarType}
                    onClick={() => setSelectedAnimalIndex(pillar.animal.index)}
                    className={`p-3 border transition-colors cursor-pointer space-y-1 ${
                      isSelected
                        ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-950/25'
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                        {isPt ? pillar.labelPt : pillar.labelEn}
                      </span>
                      <span className="tabular-nums text-slate-300 font-semibold text-[11px]">
                        #{pillar.sexagenaryNumber}/60 · {pillar.animal.shichenHours}
                      </span>
                    </div>

                    <div className="text-sm sm:text-base font-bold text-slate-100 flex items-center justify-between gap-2">
                      <span>
                        {pillar.animal.symbol}{' '}
                        {isPt ? pillar.fullTitlePt : pillar.fullTitleEn}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-amber-300 text-xs font-bold shrink-0">
                        {pillar.elementInfo.hanzi}{' '}
                        {isPt ? pillar.elementInfo.namePt : pillar.elementInfo.nameEn}
                      </span>
                    </div>

                    <div className="text-slate-300 italic text-[11px]">
                      {isPt ? pillar.rolePt : pillar.roleEn}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Five Elements (Wu Xing) Balance Across the 8 Characters */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {isPt
                ? 'II. Equilíbrio dos 5 Elementos (Wu Xing 五行) nos 8 Caracteres'
                : 'II. Five Elements (Wu Xing 五行) Balance in Your 8 Characters'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              {(['WOOD', 'FIRE', 'EARTH', 'METAL', 'WATER'] as WuXingElementId[]).map(
                (elKey) => {
                  const el = WU_XING_ELEMENTS[elKey];
                  const count = chart.elementBalance[elKey];
                  return (
                    <div
                      key={elKey}
                      className="p-2.5 border border-slate-800 bg-slate-900/50 flex flex-col justify-between space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400 text-sm">
                          {el.hanzi} {isPt ? el.namePt.split(' ')[0] : el.nameEn.split(' ')[0]}
                        </span>
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold tabular-nums">
                          {count}/8
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 leading-snug">
                        {isPt ? el.virtuePt : el.virtueEn}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <p className="text-[11px] text-slate-300 italic leading-relaxed">
              {isPt
                ? 'Ciclo de Geração (Sheng): Madeira alimenta Fogo → Fogo forma Terra → Terra gera Metal → Metal recolhe Água → Água nutre Madeira.'
                : 'Generative Cycle (Sheng): Wood feeds Fire → Fire forms Earth → Earth bears Metal → Metal collects Water → Water nourishes Wood.'}
            </p>
          </div>

          {/* 3. Dragon Sign Bridge: Connecting the Chinese Dragon (Chen) & Month IX Dragon */}
          <div className="p-4 sm:p-5 bg-emerald-950/20 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isPt
                  ? 'III. Ponte Cosmológica: O Dragão Oriental (Chén 辰) & O 13º Signo (Mês IX)'
                  : 'III. Cosmological Bridge: The Eastern Dragon (Chén 辰) & The 13th Sign (Month IX)'}
              </span>
            </div>
            <p className="text-slate-200 leading-relaxed">
              {isPt
                ? 'Na astronomia antiga chinesa, a Grande Constelação Primaveril/Outonal do Dragão Azul do Oriente (Qinglong 青龍) estende-se de Virgem (Spica) até Escorpião e Ofiúco (o 13º Signo do Dragão no Mês IX Sagrado). Ambos preservam a memória astronômica do Guardião Celeste sobre a eclíptica.'
                : 'In ancient Chinese astronomy, the Great Azure Dragon of the East constellation (Qinglong 青龍) spans from Virgo (Spica) across Scorpio and Ophiuchus (the 13th Sign of the Dragon in Sacred Month IX). Both preserve the astronomical memory of the Celestial Guardian along the ecliptic.'}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* COMPLETE 12 CHINESE ZODIAC GUARDIANS ALMANAC GRID                  */}
      {/* ================================================================== */}
      <div className="p-4 sm:p-5 bg-slate-900/40">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
          {isPt
            ? 'Catálogo Completo dos 12 Guardiões Terrestres (Toque para Inspecionar)'
            : 'Complete Catalog of the 12 Earthly Guardians (Tap to Inspect)'}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-800 border border-slate-800">
          {TWELVE_CHINESE_ZODIAC_ANIMALS.map((animal) => {
            const isUserYear = chart.yearPillar.animal.index === animal.index;
            const isUserHour = chart.hourPillar.animal.index === animal.index;
            const isSelected = inspectedAnimal.index === animal.index;
            const el = WU_XING_ELEMENTS[animal.fixedElement];

            return (
              <div
                key={animal.id}
                onClick={() => setSelectedAnimalIndex(animal.index)}
                className={`p-4 flex flex-col justify-between space-y-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-amber-950/25 ring-1 ring-inset ring-amber-400'
                    : 'bg-slate-950 hover:bg-slate-900/70'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                    <span className="font-bold text-amber-400">
                      {animal.index}. {animal.branchHanzi} ({animal.branchPinyin}) ·{' '}
                      {animal.shichenHours}
                    </span>
                    <div className="flex items-center gap-1">
                      {isUserYear && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-bold uppercase">
                          {isPt ? 'Seu Ano' : 'Your Year'}
                        </span>
                      )}
                      {isUserHour && (
                        <span className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase">
                          {isPt ? 'Sua Hora' : 'Your Hour'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                      <span className="text-lg">{animal.symbol}</span>
                      <span>
                        {isPt ? animal.namePt : animal.nameEn} ({animal.animalHanzi})
                      </span>
                    </h4>
                    <span className="text-xs font-bold text-emerald-400">
                      {el.hanzi} {isPt ? el.namePt.split(' ')[0] : el.nameEn.split(' ')[0]} ({animal.polarity})
                    </span>
                  </div>

                  <div className="text-xs italic text-purple-300">
                    {isPt ? animal.archetypePt : animal.archetypeEn}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isPt ? animal.meaningPt : animal.meaningEn}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      {isPt ? 'Aliados:' : 'Allies:'}
                    </span>
                    <span className="text-amber-300 font-semibold">
                      {isPt ? animal.alliesPt : animal.alliesEn}
                    </span>
                  </div>
                  <div className="text-emerald-300 italic">
                    {isPt ? animal.sacredCorrelationPt : animal.sacredCorrelationEn}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
