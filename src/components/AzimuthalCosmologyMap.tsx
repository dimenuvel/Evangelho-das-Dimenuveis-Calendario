/**
 * @file src/components/AzimuthalCosmologyMap.tsx
 * Book of Enoch (1 Enoch 72–78) Mercator Cosmology Map with 6 Eastern & 6 Western Portals.
 * Features:
 * - True Cylindrical Mercator Projection (-180° W to +180° E, -72° S to +78° N)
 * - 6 Eastern Portals (Right edge, +180° E) & 6 Western Portals (Left edge, -180° W)
 *   spanning between the Tropic of Capricorn (Portal 1) and Tropic of Cancer (Portal 6)
 *   according to the Book of the Courses of the Heavenly Luminaries (1 Enoch 72–74).
 * - Pac-Man style portal wrap-around: as the Sun and Moon enter a Western Portal on the
 *   left edge, they simultaneously emerge from the corresponding Eastern Portal on the right edge
 *   with glowing portal warp rings.
 * - Interactive Touch & Mouse drag with inertia physics (drag horizontally to move Sun & Moon
 *   through the portals; tap any Portal 1–6 or drag vertically in Portal mode to switch Enochian Gates).
 * - Full 1 Enoch 72 18-part Day/Night ratio & 1 Enoch 73 14-part Lunar Illumination telemetry.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Language } from '../i18n/translations';
import { getLunarPhaseInfo, getLocalizedPhaseName } from '../astronomy/moon';
import { solarDateToSacredDate } from '../calendar/sacredCalendar';
import { LunarAnchorMode } from '../types/calendar';
import { LunarPhaseIcon } from './LunarPhaseIcon';
import {
  Play,
  Pause,
  RotateCcw,
  Hand,
  Sun,
  Moon,
  Sparkles,
  MapPin,
  Eye,
} from 'lucide-react';

interface AzimuthalCosmologyMapProps {
  systemDate: Date;
  lunarAnchorMode: LunarAnchorMode;
  language: Language;
  observerLat?: number;
  observerLon?: number;
  observerCity?: string;
  onOpenGpsModal?: () => void;
}

/**
 * The 6 Celestial Portals of 1 Enoch 72 (from South to North between Capricorn & Cancer).
 * In 1 Enoch 72:
 * - Portal 4: Month 1 (Spring start) & Month 6
 * - Portal 5: Month 2 & Month 5
 * - Portal 6: Month 3 & Month 4 (Northernmost / Summer Solstice)
 * - Portal 3: Month 7 & Month 12
 * - Portal 2: Month 8 & Month 11
 * - Portal 1: Month 9 & Month 10 (Southernmost / Winter Solstice)
 */
interface EnochPortalSpec {
  portalNumber: 1 | 2 | 3 | 4 | 5 | 6;
  centerLat: number;
  minLat: number;
  maxLat: number;
  dayParts: number; // Out of 18 parts (1 Enoch 72)
  nightParts: number; // Out of 18 parts
  sacredMonths: string;
  titlePt: string;
  titleEn: string;
  descPt: string;
  descEn: string;
}

const ENOCH_PORTALS: EnochPortalSpec[] = [
  {
    portalNumber: 6,
    centerLat: 19.53,
    minLat: 15.62,
    maxLat: 23.44,
    dayParts: 12,
    nightParts: 6,
    sacredMonths: 'III & IV',
    titlePt: '6ª Porta (Norte · Câncer)',
    titleEn: '6th Portal (North · Cancer)',
    descPt: 'Meses III e IV · Dia: 12 partes / Noite: 6 partes (1 Enoque 72:13–17)',
    descEn: 'Months III & IV · Day: 12 parts / Night: 6 parts (1 Enoch 72:13–17)',
  },
  {
    portalNumber: 5,
    centerLat: 11.72,
    minLat: 7.81,
    maxLat: 15.62,
    dayParts: 11,
    nightParts: 7,
    sacredMonths: 'II & V',
    titlePt: '5ª Porta (Boreal)',
    titleEn: '5th Portal (Boreal)',
    descPt: 'Meses II e V · Dia: 11 partes / Noite: 7 partes (1 Enoque 72:10–19)',
    descEn: 'Months II & V · Day: 11 parts / Night: 7 parts (1 Enoch 72:10–19)',
  },
  {
    portalNumber: 4,
    centerLat: 3.91,
    minLat: 0,
    maxLat: 7.81,
    dayParts: 10,
    nightParts: 8,
    sacredMonths: 'I & VI',
    titlePt: '4ª Porta (Grande Porta · Mês I)',
    titleEn: '4th Portal (Great Gate · Month I)',
    descPt: 'Meses I e VI (Início do Ano) · Dia: 10 partes / Noite: 8 partes (1 Enoque 72:6–21)',
    descEn: 'Months I & VI (Year Start) · Day: 10 parts / Night: 8 parts (1 Enoch 72:6–21)',
  },
  {
    portalNumber: 3,
    centerLat: -3.91,
    minLat: -7.81,
    maxLat: 0,
    dayParts: 9,
    nightParts: 9,
    sacredMonths: 'VII & XII',
    titlePt: '3ª Porta (Equinocial Sul)',
    titleEn: '3rd Portal (South Equinoctial)',
    descPt: 'Meses VII e XII · Dia: 9 partes / Noite: 9 partes iguais (1 Enoque 72:22–35)',
    descEn: 'Months VII & XII · Day: 9 parts / Night: 9 equal parts (1 Enoch 72:22–35)',
  },
  {
    portalNumber: 2,
    centerLat: -11.72,
    minLat: -15.62,
    maxLat: -7.81,
    dayParts: 8,
    nightParts: 10,
    sacredMonths: 'VIII & XI',
    titlePt: '2ª Porta (Austral)',
    titleEn: '2nd Portal (Austral)',
    descPt: 'Meses VIII e XI · Dia: 8 partes / Noite: 10 partes (1 Enoque 72:25–33)',
    descEn: 'Months VIII & XI · Day: 8 parts / Night: 10 parts (1 Enoch 72:25–33)',
  },
  {
    portalNumber: 1,
    centerLat: -19.53,
    minLat: -23.44,
    maxLat: -15.62,
    dayParts: 6,
    nightParts: 12,
    sacredMonths: 'IX & X',
    titlePt: '1ª Porta (Sul · Capricórnio)',
    titleEn: '1st Portal (South · Capricorn)',
    descPt: 'Meses IX e X · Dia: 6 partes / Noite: 12 partes (1 Enoque 72:27–31)',
    descEn: 'Months IX & X · Day: 6 parts / Night: 12 parts (1 Enoch 72:27–31)',
  },
];

/**
 * Continent outlines in [latitude, longitude] for Mercator projection.
 */
const CONTINENT_POLYGONS: { name: string; coords: [number, number][] }[] = [
  // North America
  {
    name: 'North America',
    coords: [
      [70, -165], [71, -156], [69, -138], [68, -114], [64, -90], [60, -94],
      [53, -80], [62, -74], [58, -63], [52, -56], [47, -53], [44, -64],
      [41, -70], [35, -75], [30, -81], [25, -80], [29, -89], [26, -97],
      [19, -96], [21, -87], [15, -83], [9, -79], [8, -78], [14, -92],
      [19, -105], [23, -106], [31, -114], [23, -110], [32, -117], [40, -124],
      [48, -125], [55, -133], [60, -141], [61, -151], [55, -163], [62, -166],
      [66, -168], [70, -165],
    ],
  },
  // Greenland
  {
    name: 'Greenland',
    coords: [
      [75, -20], [70, -22], [65, -38], [60, -44], [65, -53], [72, -56],
      [75, -62], [75, -20],
    ],
  },
  // South America
  {
    name: 'South America',
    coords: [
      [11, -75], [10, -62], [6, -54], [2, -50], [-2, -44], [-6, -35],
      [-13, -38], [-23, -42], [-33, -52], [-38, -57], [-46, -66], [-54, -68],
      [-55, -70], [-48, -75], [-38, -73], [-28, -71], [-18, -71], [-12, -77],
      [-5, -81], [2, -79], [8, -77], [11, -75],
    ],
  },
  // Europe
  {
    name: 'Europe',
    coords: [
      [71, 28], [70, 40], [60, 40], [47, 39], [45, 30], [41, 29],
      [37, 23], [40, 20], [45, 14], [41, 18], [38, 15], [40, 16],
      [44, 9], [42, 3], [38, 0], [36, -5], [37, -9], [43, -9],
      [44, -1], [48, -5], [51, 2], [54, 9], [58, 8], [62, 5], [71, 28],
    ],
  },
  // UK / British Isles
  {
    name: 'UK',
    coords: [
      [58, -5], [58, -2], [51, 1], [50, -5], [54, -5], [58, -5],
    ],
  },
  // Africa
  {
    name: 'Africa',
    coords: [
      [36, -6], [37, 10], [32, 15], [31, 32], [22, 37], [12, 44],
      [12, 51], [2, 45], [-4, 40], [-15, 41], [-26, 33], [-34, 25],
      [-35, 19], [-29, 17], [-17, 12], [-6, 12], [4, 9], [6, 2],
      [5, -8], [11, -16], [15, -17], [21, -17], [28, -13], [36, -6],
    ],
  },
  // Madagascar
  {
    name: 'Madagascar',
    coords: [
      [-12, 49], [-16, 50], [-25, 47], [-25, 44], [-16, 45], [-12, 49],
    ],
  },
  // Asia
  {
    name: 'Asia',
    coords: [
      [70, 40], [70, 65], [73, 85], [74, 105], [72, 130], [69, 160],
      [66, 178], [60, 163], [52, 157], [60, 142], [53, 141], [43, 132],
      [38, 127], [35, 129], [39, 121], [31, 122], [23, 114], [20, 106],
      [12, 109], [9, 105], [13, 101], [2, 103], [6, 100], [16, 97],
      [22, 91], [16, 82], [8, 77], [20, 73], [24, 67], [25, 57],
      [23, 59], [13, 45], [20, 40], [30, 32], [36, 36], [41, 29],
      [45, 36], [47, 40], [60, 40], [70, 40],
    ],
  },
  // Japan
  {
    name: 'Japan',
    coords: [
      [45, 142], [40, 141], [35, 140], [31, 131], [35, 133], [39, 139], [45, 142],
    ],
  },
  // Maritime Southeast Asia
  {
    name: 'Borneo',
    coords: [
      [7, 117], [1, 118], [-4, 114], [1, 109], [7, 117],
    ],
  },
  {
    name: 'SumatraJava',
    coords: [
      [5, 95], [-6, 105], [-8, 114], [-6, 103], [5, 95],
    ],
  },
  // Australia
  {
    name: 'Australia',
    coords: [
      [-12, 131], [-12, 142], [-19, 147], [-28, 153], [-38, 147],
      [-35, 137], [-32, 127], [-34, 115], [-22, 114], [-15, 124], [-12, 131],
    ],
  },
  // New Zealand
  {
    name: 'New Zealand',
    coords: [
      [-35, 173], [-41, 175], [-46, 167], [-41, 172], [-35, 173],
    ],
  },
];

/**
 * True Cylindrical Mercator projection helper:
 * Maps longitude [-180, +180] -> [mapLeft, mapRight]
 * Maps latitude [-MAX_LAT, +MAX_LAT] -> [mapBottom, mapTop] using Gudermannian inverse ln(tan(pi/4 + phi/2)).
 */
const MAX_MERCATOR_LAT = 75;
const MAX_MERCATOR_Y = Math.log(Math.tan(Math.PI / 4 + (MAX_MERCATOR_LAT * Math.PI) / 360));

function projectMercator(
  lat: number,
  lon: number,
  mapLeft: number,
  mapTop: number,
  mapWidth: number,
  mapHeight: number
): { x: number; y: number } {
  const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
  const normLon = ((((lon + 180) % 360) + 360) % 360) - 180; // -180..+180
  const x = mapLeft + ((normLon + 180) / 360) * mapWidth;

  const latRad = (clampedLat * Math.PI) / 180;
  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = mapTop + (0.5 - mercY / (2 * MAX_MERCATOR_Y)) * mapHeight;

  return { x, y };
}

/**
 * Determines which of the 6 Enochian Portals (1..6) corresponds to a given latitude (-23.44° to +23.44°).
 */
function getEnochPortalForLatitude(lat: number): EnochPortalSpec {
  if (lat >= 15.62) return ENOCH_PORTALS[0]; // Portal 6
  if (lat >= 7.81) return ENOCH_PORTALS[1]; // Portal 5
  if (lat >= 0) return ENOCH_PORTALS[2]; // Portal 4
  if (lat >= -7.81) return ENOCH_PORTALS[3]; // Portal 3
  if (lat >= -15.62) return ENOCH_PORTALS[4]; // Portal 2
  return ENOCH_PORTALS[5]; // Portal 1
}

/**
 * Computes solar & lunar coordinates, active Enochian Portals (1..6), and 14-part lunar light for a Date.
 */
function getEnochCelestialState(date: Date) {
  const msPerDay = 86400000;
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0));
  const dayOfYear = (date.getTime() - startOfYear.getTime()) / msPerDay;

  // Solar declination (-23.44° to +23.44°)
  const fractionalYearRad = ((2 * Math.PI) / 365.2422) * (dayOfYear - 79.25);
  const sunDeclination = 23.44 * Math.sin(fractionalYearRad);

  // Equation of time
  const b = fractionalYearRad;
  const eqTimeMin =
    9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  // UTC hours
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000;

  // Subsolar longitude: moves from East (+180°) to West (-180°) at 15°/hour
  let sunLon = -15 * (utcHours - 12 + eqTimeMin / 60);
  sunLon = ((((sunLon + 180) % 360) + 360) % 360) - 180;

  // Lunar phase & position
  const lunarInfo = getLunarPhaseInfo(date);
  let moonLon = sunLon + lunarInfo.phaseAngle;
  moonLon = ((((moonLon + 180) % 360) + 360) % 360) - 180;

  // Moon declination cycles through all 6 Enochian Portals over a 27.321582-day sidereal/draconic month (1 Enoch 74)
  const lunarPortalCycle = ((date.getTime() / msPerDay) / 27.321582) * 2 * Math.PI;
  const moonDeclination = 23.0 * Math.sin(lunarPortalCycle);

  const sunPortal = getEnochPortalForLatitude(sunDeclination);
  const moonPortal = getEnochPortalForLatitude(moonDeclination);

  // 1 Enoch 73:3 — Moon light divided into 14 parts from New Moon (0/14) to Full Moon (14/14)
  const enochLunarParts = Math.round(lunarInfo.fraction * 14);

  return {
    sunLat: sunDeclination,
    sunLon,
    sunPortal,
    moonLat: moonDeclination,
    moonLon,
    moonPortal,
    enochLunarParts,
    lunarInfo,
    utcHours,
    dayOfYear,
  };
}

export const AzimuthalCosmologyMap: React.FC<AzimuthalCosmologyMapProps> = ({
  systemDate,
  lunarAnchorMode,
  language,
  observerLat = 31.7683,
  observerLon = 35.2137,
  observerCity,
  onOpenGpsModal,
}) => {
  const isPt = language === 'pt';

  const [timeOffsetMs, setTimeOffsetMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<'PORTAL' | 'DAY' | 'SEASON'>('PORTAL');
  const [dragMode, setDragMode] = useState<'DIURNAL' | 'SEASONAL'>('DIURNAL');
  const [illuminationMode, setIlluminationMode] = useState<'SOLAR' | 'SHOW_ALL'>('SOLAR');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const lastClientXRef = useRef<number | null>(null);
  const lastClientYRef = useRef<number | null>(null);
  const velocityXRef = useRef<number>(0);
  const inertiaFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setTimeOffsetMs(0);
  }, [systemDate]);

  const simulatedDate = useMemo(
    () => new Date(systemDate.getTime() + timeOffsetMs),
    [systemDate, timeOffsetMs]
  );

  const celestial = useMemo(
    () => getEnochCelestialState(simulatedDate),
    [simulatedDate]
  );

  const sacredDay = useMemo(
    () => solarDateToSacredDate(simulatedDate, lunarAnchorMode),
    [simulatedDate, lunarAnchorMode]
  );

  // Animation loop for Pac-Man portal traversal
  useEffect(() => {
    if (!isPlaying) return;
    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const dtSec = (now - lastTime) / 1000;
      lastTime = now;

      // PORTAL: 5 hours per real second (smoothly watch Sun & Moon enter West portal and pop out East portal!)
      // DAY: 24 hours per second
      // SEASON: 15 days per second (watch the Sun climb & descend Portals 1 <-> 6)
      const msPerRealSec =
        speedMultiplier === 'PORTAL'
          ? 5 * 3600 * 1000
          : speedMultiplier === 'DAY'
          ? 24 * 3600 * 1000
          : 15 * 86400 * 1000;

      setTimeOffsetMs((prev) => prev + dtSec * msPerRealSec);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, speedMultiplier]);

  useEffect(() => {
    return () => {
      if (inertiaFrameRef.current) cancelAnimationFrame(inertiaFrameRef.current);
    };
  }, []);

  // SVG Mercator Viewport Dimensions
  const SVG_W = 860;
  const SVG_H = 500;
  const PORTAL_GUTTER = 68; // Left (West Portals) & Right (East Portals) columns
  const MAP_LEFT = PORTAL_GUTTER;
  const MAP_TOP = 28;
  const MAP_W = SVG_W - PORTAL_GUTTER * 2; // 724px
  const MAP_H = SVG_H - 56; // 444px
  const MAP_RIGHT = MAP_LEFT + MAP_W;
  const MAP_BOTTOM = MAP_TOP + MAP_H;

  // Pre-project continent paths in Mercator
  const continentPaths = useMemo(() => {
    return CONTINENT_POLYGONS.map((poly) => {
      const pts = poly.coords.map(([lat, lon]) => {
        const p = projectMercator(lat, lon, MAP_LEFT, MAP_TOP, MAP_W, MAP_H);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      });
      return {
        name: poly.name,
        d: `M ${pts.join(' L ')} Z`,
      };
    });
  }, [MAP_LEFT, MAP_TOP, MAP_W, MAP_H]);

  // Project Sun, Moon, and Observer
  const sunPos = projectMercator(
    celestial.sunLat,
    celestial.sunLon,
    MAP_LEFT,
    MAP_TOP,
    MAP_W,
    MAP_H
  );
  const moonPos = projectMercator(
    celestial.moonLat,
    celestial.moonLon,
    MAP_LEFT,
    MAP_TOP,
    MAP_W,
    MAP_H
  );
  const observerPos = projectMercator(
    observerLat,
    observerLon,
    MAP_LEFT,
    MAP_TOP,
    MAP_W,
    MAP_H
  );

  // Detect when Sun or Moon is actively passing through a Portal threshold (within 22° of ±180° edge)
  const sunPortalWarpStrength = Math.max(
    0,
    1 - (180 - Math.abs(celestial.sunLon)) / 24
  );
  const moonPortalWarpStrength = Math.max(
    0,
    1 - (180 - Math.abs(celestial.moonLon)) / 24
  );

  // Daylight illumination radius scaled by the active Enochian Portal's 18-part day ratio (6/18 to 12/18)
  const dayFraction = celestial.sunPortal.dayParts / 18; // 0.333 to 0.667
  const sunLightRx = (MAP_W * dayFraction) * 0.62; // Horizontal radius of daylight zone
  const sunLightRy = MAP_H * (0.48 + dayFraction * 0.25); // Vertical reach of daylight zone

  // Apply horizontal drag delta (dragging LEFT = Westward = forward in time!)
  const applyHorizontalDrag = useCallback(
    (deltaPx: number, rectWidth: number) => {
      if (rectWidth <= 0) return;
      // Dragging Left (negative deltaPx) moves the Sun & Moon westward (forward in time),
      // so dragging the Sun directly with your finger moves it wherever you pull it!
      const fractionOfMap = -deltaPx / (rectWidth * 0.8);
      const fullSweepMs =
        dragMode === 'DIURNAL' ? 24 * 3600 * 1000 : 30 * 86400 * 1000;
      setTimeOffsetMs((prev) => prev + fractionOfMap * fullSweepMs);
    },
    [dragMode]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (inertiaFrameRef.current) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
    setIsPlaying(false);
    setIsDragging(true);
    velocityXRef.current = 0;
    lastClientXRef.current = e.clientX;
    lastClientYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || lastClientXRef.current === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = e.clientX - lastClientXRef.current;
    const dy = e.clientY - (lastClientYRef.current ?? e.clientY);

    lastClientXRef.current = e.clientX;
    lastClientYRef.current = e.clientY;
    velocityXRef.current = dx;

    applyHorizontalDrag(dx, rect.width);

    // If user is in SEASONAL mode and drags vertically, shift days of year to move between Portals 1–6
    if (dragMode === 'SEASONAL' && Math.abs(dy) > 1 && rect.height > 0) {
      const verticalFraction = -dy / rect.height;
      setTimeOffsetMs((prev) => prev + verticalFraction * 90 * 86400 * 1000);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    lastClientXRef.current = null;
    lastClientYRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Smooth Pac-Man inertia after releasing touch
    let vx = velocityXRef.current;
    const rectWidth = svgRef.current?.getBoundingClientRect().width || 600;
    if (Math.abs(vx) > 1.2) {
      const stepInertia = () => {
        vx *= 0.93;
        if (Math.abs(vx) < 0.35) {
          inertiaFrameRef.current = null;
          return;
        }
        applyHorizontalDrag(vx, rectWidth);
        inertiaFrameRef.current = requestAnimationFrame(stepInertia);
      };
      inertiaFrameRef.current = requestAnimationFrame(stepInertia);
    }
  };

  // Jump directly to one of the 6 Enochian Portals
  const jumpToEnochPortal = (portalNum: 1 | 2 | 3 | 4 | 5 | 6) => {
    setIsPlaying(false);
    // Representative dates in the solar year where the Sun is centered in each Enochian Portal:
    // Portal 4 (Spring start): April 4 (month 3, day 4)
    // Portal 5: May 5 (month 4, day 5)
    // Portal 6 (Summer Solstice): June 21 (month 5, day 21)
    // Portal 3 (Autumn Equinox): October 5 (month 9, day 5)
    // Portal 2: November 5 (month 10, day 5)
    // Portal 1 (Winter Solstice): December 21 (month 11, day 21)
    const portalDateMap: Record<number, [number, number]> = {
      4: [3, 4],
      5: [4, 5],
      6: [5, 21],
      3: [9, 5],
      2: [10, 5],
      1: [11, 21],
    };
    const [m, d] = portalDateMap[portalNum];
    const target = new Date(
      Date.UTC(
        simulatedDate.getUTCFullYear(),
        m,
        d,
        simulatedDate.getUTCHours(),
        simulatedDate.getUTCMinutes()
      )
    );
    setTimeOffsetMs(target.getTime() - systemDate.getTime());
  };

  // Sliders
  const currentDayMinutes =
    simulatedDate.getUTCHours() * 60 + simulatedDate.getUTCMinutes();

  const handleTimeOfDaySlider = (newMinutes: number) => {
    setIsPlaying(false);
    const diffMin = newMinutes - currentDayMinutes;
    setTimeOffsetMs((prev) => prev + diffMin * 60 * 1000);
  };

  const currentDayOfYear = Math.floor(celestial.dayOfYear);
  const handleDayOfYearSlider = (newDay: number) => {
    setIsPlaying(false);
    const diffDays = newDay - currentDayOfYear;
    setTimeOffsetMs((prev) => prev + diffDays * 86400 * 1000);
  };

  const localizedPhaseName = getLocalizedPhaseName(
    celestial.lunarInfo.phaseName,
    language
  );

  const displayObserverCity =
    !observerCity || observerCity === 'Jerusalem (Default)'
      ? isPt
        ? 'Jerusalém'
        : 'Jerusalem'
      : observerCity;

  // Key latitude Y-coordinates on Mercator
  const yCancer = projectMercator(23.44, 0, MAP_LEFT, MAP_TOP, MAP_W, MAP_H).y;
  const yEquator = projectMercator(0, 0, MAP_LEFT, MAP_TOP, MAP_W, MAP_H).y;
  const yCapricorn = projectMercator(-23.44, 0, MAP_LEFT, MAP_TOP, MAP_W, MAP_H).y;

  return (
    <div className="border border-slate-800 bg-slate-950 divide-y divide-slate-800">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-slate-900/70">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 text-xs font-serif uppercase tracking-wider text-amber-400 font-semibold">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {isPt
                ? 'Cosmologia do Livro de Enoque (1 Enoque 72–78) · Projeção de Mercator'
                : 'Book of Enoch Cosmology (1 Enoch 72–78) · Mercator Projection'}
            </span>
          </div>
          <h2 className="text-base sm:text-xl font-serif font-bold text-slate-100 break-words">
            {isPt
              ? 'As 6 Portas do Oriente e 6 Portas do Ocidente · Travessia Solar e Lunar'
              : 'The 6 Eastern & 6 Western Portals · Solar & Lunar Portal Traversal'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-serif">
          {/* Illumination Mode Toggle Button: Solar Illumination vs Show Everything */}
          <div className="inline-flex border border-slate-700 bg-slate-950 divide-x divide-slate-700">
            <button
              type="button"
              onClick={() => setIlluminationMode('SOLAR')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 transition-colors cursor-pointer ${
                illuminationMode === 'SOLAR'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
              title={
                isPt
                  ? 'Iluminar o mapa de acordo com a posição do Sol (Dia e Noite)'
                  : 'Illuminate the map according to Sun position (Day & Night)'
              }
            >
              <Sun className="w-3.5 h-3.5 shrink-0" />
              <span>{isPt ? 'Iluminação Solar' : 'Solar Illumination'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIlluminationMode('SHOW_ALL')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 transition-colors cursor-pointer ${
                illuminationMode === 'SHOW_ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
              title={
                isPt
                  ? 'Mostrar todo o mapa iluminado sem sombra noturna'
                  : 'Show the entire map illuminated without night shadow'
              }
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>{isPt ? 'Mostrar Tudo' : 'Show Everything'}</span>
            </button>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-amber-500/40 bg-amber-950/30 text-amber-300">
            <Hand className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isPt
                ? 'Arraste para mover o Sol e a Lua pelas Portas'
                : 'Drag to move Sun & Moon through the Portals'}
            </span>
          </span>
          {timeOffsetMs !== 0 && (
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setTimeOffsetMs(0);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-700 bg-slate-900 hover:border-amber-500/60 text-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isPt ? 'Tempo Real' : 'Live Time'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split: Mercator Portal Map (Left 7 cols) + Enochian Controls & Telemetry (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* Left 7 Cols: Interactive Mercator Map with 6 Western Portals (Left) & 6 Eastern Portals (Right) */}
        <div className="lg:col-span-7 p-2 sm:p-4 flex flex-col items-center justify-center bg-[#060911] relative select-none">
          <div className="w-full relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: 'none' }}
              className={`w-full h-auto border border-slate-800 bg-[#050811] ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              role="img"
              aria-label={
                isPt
                  ? 'Mapa de Mercator com as 6 Portas do Oriente e 6 Portas do Ocidente do Livro de Enoque'
                  : 'Mercator Map with the 6 Eastern and 6 Western Portals from the Book of Enoch'
              }
            >
              <defs>
                {/* Daytime Lit Ocean Gradient */}
                <linearGradient id="mercOceanDayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#164e63" />
                  <stop offset="50%" stopColor="#0e3a5c" />
                  <stop offset="88%" stopColor="#134066" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>

                {/* Nocturnal Ocean Gradient */}
                <linearGradient id="mercOceanNightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#040812" />
                  <stop offset="50%" stopColor="#02050b" />
                  <stop offset="88%" stopColor="#040914" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                {/* Soft Radial Feather for the Solar Daylight Mask */}
                <radialGradient id="solarMaskFeather" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="58%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="80%" stopColor="#ffffff" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>

                {/* Soft Radial Feather for the Lunar Nightlight Mask */}
                <radialGradient id="lunarMaskFeather" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.18 + celestial.lunarInfo.fraction * 0.38} />
                  <stop offset="65%" stopColor="#ffffff" stopOpacity={0.08 + celestial.lunarInfo.fraction * 0.16} />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>

                {/* SVG Mask that reveals the Illuminated Day Map where the Sun (& Moon) shine, wrapping Pac-Man style */}
                <mask id="enochSolarIlluminationMask">
                  {/* Black = Night shadow; White = Illuminated Day */}
                  <rect x={MAP_LEFT} y={MAP_TOP} width={MAP_W} height={MAP_H} fill="#000000" />
                  {/* Wrapping Solar Daylight Footprints (-MAP_W, 0, +MAP_W) */}
                  {[-MAP_W, 0, MAP_W].map((offsetX) => (
                    <ellipse
                      key={`mask-sun-${offsetX}`}
                      cx={sunPos.x + offsetX}
                      cy={sunPos.y}
                      rx={sunLightRx}
                      ry={sunLightRy}
                      fill="url(#solarMaskFeather)"
                    />
                  ))}
                  {/* Wrapping Lunar Soft Night Glow (-MAP_W, 0, +MAP_W) */}
                  {[-MAP_W, 0, MAP_W].map((offsetX) => (
                    <circle
                      key={`mask-moon-${offsetX}`}
                      cx={moonPos.x + offsetX}
                      cy={moonPos.y}
                      r={95}
                      fill="url(#lunarMaskFeather)"
                    />
                  ))}
                </mask>

                {/* Sun Glow */}
                <radialGradient id="mercSunOrb" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#fde047" />
                  <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>

                {/* Moon Glow */}
                <radialGradient id="mercMoonOrb" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
                  <stop offset="55%" stopColor="#60a5fa" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
                </radialGradient>

                {/* Daylight Spotlight Aura */}
                <radialGradient id="mercDaylightCone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.38" />
                  <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>

                {/* Portal Vortex Glow */}
                <linearGradient id="westPortalGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="eastPortalGlow" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>

                {/* Clip strictly to the Mercator Map Viewport so orbs enter/exit portals cleanly */}
                <clipPath id="mercMapClip">
                  <rect x={MAP_LEFT} y={MAP_TOP} width={MAP_W} height={MAP_H} />
                </clipPath>
              </defs>

              {/* Top Banner Labels for Western Portals (Left), Earth Plane (Center), Eastern Portals (Right) */}
              <text
                x={MAP_LEFT / 2}
                y={17}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize="9.5"
                fontWeight="bold"
                fontFamily="serif"
              >
                {isPt ? 'OCIDENTE (OESTE)' : 'WEST PORTALS'}
              </text>
              <text
                x={MAP_LEFT + MAP_W / 2}
                y={17}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="10.5"
                fontWeight="bold"
                fontFamily="serif"
              >
                {isPt
                  ? ' ← MOVIMENTO DOS LUMINARES (DO ORIENTE PARA O OCIDENTE · 1 ENOQUE 72) ← '
                  : ' ← COURSE OF THE LUMINARIES (FROM EAST PORTALS TO WEST PORTALS · 1 ENOCH 72) ← '}
              </text>
              <text
                x={MAP_RIGHT + PORTAL_GUTTER / 2}
                y={17}
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="9.5"
                fontWeight="bold"
                fontFamily="serif"
              >
                {isPt ? 'ORIENTE (LESTE)' : 'EAST PORTALS'}
              </text>

              {/* MERCATOR MAP INTERIOR (Clipped so Pac-Man wrap occurs right at the Portal doors) */}
              <g clipPath="url(#mercMapClip)">
                {illuminationMode === 'SOLAR' ? (
                  <>
                    {/* 1. NOCTURNAL BASE LAYER (Where the Sun is NOT shining) */}
                    <g>
                      <rect
                        x={MAP_LEFT}
                        y={MAP_TOP}
                        width={MAP_W}
                        height={MAP_H}
                        fill="url(#mercOceanNightGrad)"
                      />
                      {/* Nighttime Antarctic Ice Strip */}
                      <rect
                        x={MAP_LEFT}
                        y={MAP_BOTTOM - 26}
                        width={MAP_W}
                        height={26}
                        fill="#334155"
                        fillOpacity="0.65"
                      />
                      {/* Nighttime Continents (Dimmed Indigo/Slate Silhouette) */}
                      {continentPaths.map((c) => (
                        <path
                          key={`night-${c.name}`}
                          d={c.d}
                          fill="#0b1922"
                          stroke="#1e3a4c"
                          strokeWidth="0.85"
                          strokeLinejoin="round"
                        />
                      ))}
                    </g>

                    {/* 2. SOLAR-ILLUMINATED DAYTIME LAYER (Masked by Sun & Moon position, wrapping Pac-Man style) */}
                    <g mask="url(#enochSolarIlluminationMask)">
                      <rect
                        x={MAP_LEFT}
                        y={MAP_TOP}
                        width={MAP_W}
                        height={MAP_H}
                        fill="url(#mercOceanDayGrad)"
                      />
                      {/* Sunlit Antarctic Ice Strip */}
                      <rect
                        x={MAP_LEFT}
                        y={MAP_BOTTOM - 26}
                        width={MAP_W}
                        height={26}
                        fill="#f1f5f9"
                        fillOpacity="0.92"
                      />
                      {/* Sunlit Continents (Vibrant Emerald & Warm Gold Coastlines) */}
                      {continentPaths.map((c) => (
                        <path
                          key={`day-${c.name}`}
                          d={c.d}
                          fill="#285e4d"
                          stroke="#fbbf24"
                          strokeOpacity="0.75"
                          strokeWidth="1.05"
                          strokeLinejoin="round"
                        />
                      ))}
                    </g>

                    {/* 3. GOLDEN SOLAR TERMINATOR RING (Boundary between Day & Night wrapping across Portals) */}
                    {[-MAP_W, 0, MAP_W].map((offsetX) => (
                      <ellipse
                        key={`term-${offsetX}`}
                        cx={sunPos.x + offsetX}
                        cy={sunPos.y}
                        rx={sunLightRx * 0.85}
                        ry={sunLightRy * 0.85}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        strokeOpacity="0.45"
                      />
                    ))}
                  </>
                ) : (
                  <>
                    {/* SHOW EVERYTHING MODE (Full Unmasked Map Illumination) */}
                    <rect
                      x={MAP_LEFT}
                      y={MAP_TOP}
                      width={MAP_W}
                      height={MAP_H}
                      fill="url(#mercOceanDayGrad)"
                    />
                    <rect
                      x={MAP_LEFT}
                      y={MAP_BOTTOM - 26}
                      width={MAP_W}
                      height={26}
                      fill="#e2e8f0"
                      fillOpacity="0.88"
                    />
                    {continentPaths.map((c) => (
                      <path
                        key={`all-${c.name}`}
                        d={c.d}
                        fill="#234e40"
                        stroke="#6ee7b7"
                        strokeOpacity="0.7"
                        strokeWidth="0.95"
                        strokeLinejoin="round"
                      />
                    ))}
                  </>
                )}

                <line
                  x1={MAP_LEFT}
                  y1={MAP_BOTTOM - 26}
                  x2={MAP_RIGHT}
                  y2={MAP_BOTTOM - 26}
                  stroke="#93c5fd"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />

                {/* Longitude Grid Lines every 30° */}
                {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => {
                  const p = projectMercator(0, lon, MAP_LEFT, MAP_TOP, MAP_W, MAP_H);
                  return (
                    <g key={lon}>
                      <line
                        x1={p.x}
                        y1={MAP_TOP}
                        x2={p.x}
                        y2={MAP_BOTTOM}
                        stroke="#1e3a5f"
                        strokeWidth={lon === 0 ? '1.1' : '0.6'}
                        strokeDasharray={lon === 0 ? undefined : '2 3'}
                      />
                    </g>
                  );
                })}

                {/* Horizontal Enochian Portal Corridors (1 to 6) across the Tropics */}
                {ENOCH_PORTALS.map((portal) => {
                  const yTop = projectMercator(
                    portal.maxLat,
                    0,
                    MAP_LEFT,
                    MAP_TOP,
                    MAP_W,
                    MAP_H
                  ).y;
                  const yBot = projectMercator(
                    portal.minLat,
                    0,
                    MAP_LEFT,
                    MAP_TOP,
                    MAP_W,
                    MAP_H
                  ).y;
                  const isSunActive =
                    celestial.sunPortal.portalNumber === portal.portalNumber;
                  const isMoonActive =
                    celestial.moonPortal.portalNumber === portal.portalNumber;

                  return (
                    <g key={portal.portalNumber}>
                      <rect
                        x={MAP_LEFT}
                        y={yTop}
                        width={MAP_W}
                        height={Math.max(1, yBot - yTop)}
                        fill={
                          isSunActive
                            ? '#f59e0b'
                            : isMoonActive
                            ? '#38bdf8'
                            : '#94a3b8'
                        }
                        fillOpacity={isSunActive ? 0.14 : isMoonActive ? 0.1 : 0.02}
                      />
                      <line
                        x1={MAP_LEFT}
                        y1={yTop}
                        x2={MAP_RIGHT}
                        y2={yTop}
                        stroke="#475569"
                        strokeWidth="0.5"
                        strokeDasharray="3 3"
                        strokeOpacity="0.6"
                      />
                    </g>
                  );
                })}

                {/* Tropic of Cancer (+23.44°), Equator (0°), Tropic of Capricorn (-23.44°) */}
                <line
                  x1={MAP_LEFT}
                  y1={yCancer}
                  x2={MAP_RIGHT}
                  y2={yCancer}
                  stroke="#facc15"
                  strokeWidth="1.1"
                  strokeDasharray="5 4"
                  strokeOpacity="0.85"
                />
                <line
                  x1={MAP_LEFT}
                  y1={yEquator}
                  x2={MAP_RIGHT}
                  y2={yEquator}
                  stroke="#38bdf8"
                  strokeWidth="1.3"
                  strokeOpacity="0.9"
                />
                <line
                  x1={MAP_LEFT}
                  y1={yCapricorn}
                  x2={MAP_RIGHT}
                  y2={yCapricorn}
                  stroke="#f97316"
                  strokeWidth="1.1"
                  strokeDasharray="5 4"
                  strokeOpacity="0.85"
                />

                {/* Tropic & Equator Labels */}
                <text
                  x={MAP_LEFT + 10}
                  y={yCancer - 4}
                  fill="#fde047"
                  fontSize="8.5"
                  fontFamily="serif"
                >
                  {isPt ? 'Limite Norte: 6ª Porta (Trópico de Câncer +23.4°)' : 'North Limit: 6th Portal (Tropic of Cancer +23.4°)'}
                </text>
                <text
                  x={MAP_LEFT + 10}
                  y={yEquator - 4}
                  fill="#7dd3fc"
                  fontSize="8.5"
                  fontFamily="serif"
                >
                  {isPt ? 'Equador (Fronteira entre 3ª e 4ª Porta · 0°)' : 'Equator (Boundary between 3rd & 4th Portal · 0°)'}
                </text>
                <text
                  x={MAP_LEFT + 10}
                  y={yCapricorn + 10}
                  fill="#fdba74"
                  fontSize="8.5"
                  fontFamily="serif"
                >
                  {isPt ? 'Limite Sul: 1ª Porta (Trópico de Capricórnio -23.4°)' : 'South Limit: 1st Portal (Tropic of Capricorn -23.4°)'}
                </text>

                {/* Active Solar Trajectory Line from East Portal to West Portal */}
                <line
                  x1={MAP_LEFT}
                  y1={sunPos.y}
                  x2={MAP_RIGHT}
                  y2={sunPos.y}
                  stroke="#fde047"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  strokeOpacity="0.7"
                />

                {/* Active Lunar Trajectory Line from East Portal to West Portal */}
                <line
                  x1={MAP_LEFT}
                  y1={moonPos.y}
                  x2={MAP_RIGHT}
                  y2={moonPos.y}
                  stroke="#60a5fa"
                  strokeWidth="1.2"
                  strokeDasharray="3 4"
                  strokeOpacity="0.65"
                />

                {/*Chariot of the Wind Return Arc Hint (1 Enoch 72:5 — returns via the North to the East Portal) */}
                <path
                  d={`M ${MAP_LEFT + 8} ${sunPos.y} C ${MAP_LEFT + 90} ${MAP_TOP + 18}, ${MAP_RIGHT - 90} ${MAP_TOP + 18}, ${MAP_RIGHT - 8} ${sunPos.y}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="0.9"
                  strokeDasharray="2 5"
                  strokeOpacity={0.3 + sunPortalWarpStrength * 0.55}
                />

                {/* Observer Location Pin */}
                <g transform={`translate(${observerPos.x}, ${observerPos.y})`}>
                  <circle r="7" fill="#10b981" fillOpacity="0.28" />
                  <circle r="3.5" fill="#10b981" stroke="#022c22" strokeWidth="1.2" />
                  <text
                    y="-7"
                    textAnchor="middle"
                    fill="#6ee7b7"
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="serif"
                  >
                    {displayObserverCity}
                  </text>
                </g>

                {/* PAC-MAN STYLE WRAPPING MOON (Rendered at primary x, x - MAP_W, and x + MAP_W) */}
                {[-MAP_W, 0, MAP_W].map((offsetX) => {
                  const mx = moonPos.x + offsetX;
                  if (mx < MAP_LEFT - 120 || mx > MAP_RIGHT + 120) return null;
                  return (
                    <g key={`moon-${offsetX}`} transform={`translate(${mx}, ${moonPos.y})`}>
                      {/* Direction Arrow pointing West (Left) */}
                      <polygon
                        points="-22,0 -14,-4 -14,4"
                        fill="#93c5fd"
                        fillOpacity="0.85"
                      />
                      <circle r="22" fill="url(#mercMoonOrb)" />
                      <circle
                        r="10"
                        fill="#0f172a"
                        stroke="#93c5fd"
                        strokeWidth="1.6"
                      />
                      <circle
                        r={Math.max(2, 8.5 * celestial.lunarInfo.fraction)}
                        fill="#e0f2fe"
                      />
                      <text
                        y="22"
                        textAnchor="middle"
                        fill="#bfdbfe"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="serif"
                      >
                        {isPt ? 'Lua' : 'Moon'} ({celestial.enochLunarParts}/14)
                      </text>
                    </g>
                  );
                })}

                {/* PAC-MAN STYLE WRAPPING SUN & DAYLIGHT CONE (Rendered at primary x, x - MAP_W, and x + MAP_W) */}
                {[-MAP_W, 0, MAP_W].map((offsetX) => {
                  const sx = sunPos.x + offsetX;
                  if (sx < MAP_LEFT - 240 || sx > MAP_RIGHT + 240) return null;
                  return (
                    <g key={`sun-${offsetX}`} transform={`translate(${sx}, ${sunPos.y})`}>
                      {/* Broad Moving Daylight Illumination Aura */}
                      <circle r="175" fill="url(#mercDaylightCone)" />
                      {/* Direction Arrow pointing West (Left) */}
                      <polygon
                        points="-26,0 -17,-5 -17,5"
                        fill="#fde047"
                        fillOpacity="0.95"
                      />
                      <circle r="30" fill="url(#mercSunOrb)" />
                      <circle
                        r="11.5"
                        fill="#fef08a"
                        stroke="#f59e0b"
                        strokeWidth="2"
                      />
                      <text
                        y="-16"
                        textAnchor="middle"
                        fill="#fef08a"
                        fontSize="9.5"
                        fontWeight="bold"
                        fontFamily="serif"
                      >
                        {isPt
                          ? `Sol (Porta ${celestial.sunPortal.portalNumber})`
                          : `Sun (Portal ${celestial.sunPortal.portalNumber})`}
                      </text>
                    </g>
                  );
                })}

                {/* Portal Entry/Exit Warp Flash when Sun or Moon crosses the Portal Boundary */}
                {sunPortalWarpStrength > 0.05 && (
                  <>
                    <ellipse
                      cx={MAP_LEFT + 4}
                      cy={sunPos.y}
                      rx={10 + sunPortalWarpStrength * 16}
                      ry={22}
                      fill="url(#westPortalGlow)"
                    />
                    <ellipse
                      cx={MAP_RIGHT - 4}
                      cy={sunPos.y}
                      rx={10 + sunPortalWarpStrength * 16}
                      ry={22}
                      fill="url(#eastPortalGlow)"
                    />
                  </>
                )}
                {moonPortalWarpStrength > 0.05 && (
                  <>
                    <ellipse
                      cx={MAP_LEFT + 4}
                      cy={moonPos.y}
                      rx={8 + moonPortalWarpStrength * 14}
                      ry={18}
                      fill="url(#eastPortalGlow)"
                    />
                    <ellipse
                      cx={MAP_RIGHT - 4}
                      cy={moonPos.y}
                      rx={8 + moonPortalWarpStrength * 14}
                      ry={18}
                      fill="url(#eastPortalGlow)"
                    />
                  </>
                )}
              </g>

              {/* Map Frame Border */}
              <rect
                x={MAP_LEFT}
                y={MAP_TOP}
                width={MAP_W}
                height={MAP_H}
                fill="none"
                stroke="#475569"
                strokeWidth="1.5"
              />

              {/* 6 WESTERN PORTALS (LEFT SIDE: SUN & MOON ENTER HERE) & 6 EASTERN PORTALS (RIGHT SIDE: SUN & MOON EMERGE HERE) */}
              {ENOCH_PORTALS.map((portal) => {
                const yTop = projectMercator(
                  portal.maxLat,
                  0,
                  MAP_LEFT,
                  MAP_TOP,
                  MAP_W,
                  MAP_H
                ).y;
                const yBot = projectMercator(
                  portal.minLat,
                  0,
                  MAP_LEFT,
                  MAP_TOP,
                  MAP_W,
                  MAP_H
                ).y;
                const gateH = Math.max(16, yBot - yTop);
                const yMid = (yTop + yBot) / 2;

                const isSunGate =
                  celestial.sunPortal.portalNumber === portal.portalNumber;
                const isMoonGate =
                  celestial.moonPortal.portalNumber === portal.portalNumber;

                const gateStroke = isSunGate
                  ? '#f59e0b'
                  : isMoonGate
                  ? '#38bdf8'
                  : '#334155';
                const gateFill = isSunGate
                  ? '#451a03'
                  : isMoonGate
                  ? '#0c4a6e'
                  : '#0f172a';

                return (
                  <g key={`gates-${portal.portalNumber}`}>
                    {/* LEFT SIDE: WESTERN PORTAL (EXIT / ENTRY INTO WEST) */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        jumpToEnochPortal(portal.portalNumber);
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={4}
                        y={yTop + 0.5}
                        width={PORTAL_GUTTER - 6}
                        height={gateH - 1}
                        fill={gateFill}
                        stroke={gateStroke}
                        strokeWidth={isSunGate || isMoonGate ? '1.6' : '0.9'}
                      />
                      {/* Glowing Arch Doorway on the Map Edge */}
                      <line
                        x1={MAP_LEFT}
                        y1={yTop + 2}
                        x2={MAP_LEFT}
                        y2={yBot - 2}
                        stroke={isSunGate ? '#fde047' : isMoonGate ? '#7dd3fc' : '#64748b'}
                        strokeWidth={isSunGate || isMoonGate ? '3.5' : '1.5'}
                      />
                      <text
                        x={(PORTAL_GUTTER - 2) / 2}
                        y={yMid}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isSunGate ? '#fde047' : isMoonGate ? '#bae6fd' : '#cbd5e1'}
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="serif"
                      >
                        {isPt ? `Porta ${portal.portalNumber} O` : `Gate ${portal.portalNumber} W`}
                      </text>
                    </g>

                    {/* RIGHT SIDE: EASTERN PORTAL (EMERGENCE / RISING FROM EAST) */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        jumpToEnochPortal(portal.portalNumber);
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={MAP_RIGHT + 2}
                        y={yTop + 0.5}
                        width={PORTAL_GUTTER - 6}
                        height={gateH - 1}
                        fill={gateFill}
                        stroke={gateStroke}
                        strokeWidth={isSunGate || isMoonGate ? '1.6' : '0.9'}
                      />
                      {/* Glowing Arch Doorway on the East Map Edge */}
                      <line
                        x1={MAP_RIGHT}
                        y1={yTop + 2}
                        x2={MAP_RIGHT}
                        y2={yBot - 2}
                        stroke={isSunGate ? '#fde047' : isMoonGate ? '#7dd3fc' : '#64748b'}
                        strokeWidth={isSunGate || isMoonGate ? '3.5' : '1.5'}
                      />
                      <text
                        x={MAP_RIGHT + (PORTAL_GUTTER - 2) / 2}
                        y={yMid}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isSunGate ? '#fde047' : isMoonGate ? '#bae6fd' : '#cbd5e1'}
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="serif"
                      >
                        {isPt ? `Porta ${portal.portalNumber} L` : `Gate ${portal.portalNumber} E`}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Bottom Longitude Scale */}
              {[-180, -120, -60, 0, 60, 120, 180].map((lon) => {
                const p = projectMercator(0, lon, MAP_LEFT, MAP_TOP, MAP_W, MAP_H);
                const label =
                  lon === 0
                    ? '0°'
                    : lon > 0
                    ? `${lon}°E`
                    : `${Math.abs(lon)}°W`;
                return (
                  <text
                    key={`lbl-${lon}`}
                    x={p.x}
                    y={SVG_H - 9}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="serif"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Bottom Caption under Map */}
          <div className="mt-2 text-center text-xs font-serif italic text-slate-300">
            {isPt
              ? 'Toque e arraste horizontalmente para fazer o Sol e a Lua entrarem nas Portas do Ocidente (esquerda) e saírem pelas Portas do Oriente (direita). Toque em qualquer Porta 1–6 para alternar.'
              : 'Touch and drag horizontally to send the Sun and Moon into the Western Portals (left) and out of the Eastern Portals (right). Tap any Portal 1–6 to jump.'}
          </div>
        </div>

        {/* Right 5 Cols: Book of Enoch Portal Controls & Telemetry */}
        <div className="lg:col-span-5 divide-y divide-slate-800 flex flex-col justify-between font-serif">
          {/* 1. Simulated Sacred & Solar Date-Time Readout */}
          <div className="p-4 sm:p-5 space-y-2 bg-slate-900/30">
            <div className="flex items-center justify-between gap-2 text-xs text-amber-400 uppercase tracking-wider font-semibold">
              <span>
                {isPt ? 'Efeméride nas Portas de Enoque' : 'Enochian Portal Ephemeris'}
              </span>
              <span className="tabular-nums text-slate-200">
                {simulatedDate.toISOString().replace('T', ' ').slice(0, 16)} UTC
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-base sm:text-lg font-bold text-slate-100">
                {sacredDay.kind === 'DAY_ZERO'
                  ? isPt
                    ? `Ano Sagrado ${sacredDay.calendarYear} · Dia Zero`
                    : `Sacred Year ${sacredDay.calendarYear} · Day Zero`
                  : isPt
                  ? `Ano ${sacredDay.calendarYear} · Mês ${(sacredDay as any).month}, Dia ${(sacredDay as any).dayOfMonth}`
                  : `Year ${sacredDay.calendarYear} · Month ${(sacredDay as any).month}, Day ${(sacredDay as any).dayOfMonth}`}
              </div>
              <span className="text-xs italic text-emerald-400 tabular-nums">
                {sacredDay.kind === 'DAY_ZERO'
                  ? isPt
                    ? 'Sábado Anual'
                    : 'Annual Sabbath'
                  : `${isPt ? 'Dia da Semana' : 'Weekday'} ${(sacredDay as any).dayOfWeek}/7`}
              </span>
            </div>
          </div>

          {/* 2. Interactive Portal Selector & Pac-Man Traversal Controls */}
          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                {isPt ? 'Modo de Arraste por Toque' : 'Touch Drag Mode'}
              </span>
              <div className="inline-flex border border-slate-700 bg-slate-950 divide-x divide-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setDragMode('DIURNAL')}
                  className={`px-2.5 py-1 transition-colors cursor-pointer ${
                    dragMode === 'DIURNAL'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {isPt ? 'Travessia 24h (Portas)' : '24h Portal Sweep'}
                </button>
                <button
                  type="button"
                  onClick={() => setDragMode('SEASONAL')}
                  className={`px-2.5 py-1 transition-colors cursor-pointer ${
                    dragMode === 'SEASONAL'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {isPt ? 'Mudar Portas (1–6)' : 'Shift Portals (1–6)'}
                </button>
              </div>
            </div>

            {/* Play / Pause & Speed Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsPlaying((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  isPlaying
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 shrink-0" />
                    <span>{isPt ? 'Pausar Travessia' : 'Pause Traversal'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 shrink-0" />
                    <span>{isPt ? 'Animar Portas (Pac-Man)' : 'Animate Portals (Pac-Man)'}</span>
                  </>
                )}
              </button>

              <div className="inline-flex border border-slate-700 bg-slate-950 divide-x divide-slate-700 text-xs">
                {(
                  [
                    { id: 'PORTAL', labelPt: 'Portas (5h/s)', labelEn: 'Portals (5h/s)' },
                    { id: 'DAY', labelPt: '1 Dia/s', labelEn: '1 Day/s' },
                    { id: 'SEASON', labelPt: '6 Portas/Ano', labelEn: '6 Gates/Yr' },
                  ] as const
                ).map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => setSpeedMultiplier(sp.id)}
                    className={`px-2.5 py-1.5 transition-colors cursor-pointer ${
                      speedMultiplier === sp.id
                        ? 'bg-blue-950/60 text-blue-200 font-semibold'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    {isPt ? sp.labelPt : sp.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* 6 Enochian Portals Quick Selector Buttons (Portals 1 to 6) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  {isPt
                    ? 'Selecionar Porta Solar de Enoque (1ª à 6ª Porta):'
                    : 'Select Enochian Solar Portal (1st to 6th Gate):'}
                </span>
                <span className="text-amber-300 font-semibold">
                  {isPt
                    ? `Ativa: ${celestial.sunPortal.portalNumber}ª Porta`
                    : `Active: Portal ${celestial.sunPortal.portalNumber}`}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {([1, 2, 3, 4, 5, 6] as const).map((pNum) => {
                  const isActive = celestial.sunPortal.portalNumber === pNum;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => jumpToEnochPortal(pNum)}
                      className={`py-1.5 border text-xs font-bold transition-colors cursor-pointer ${
                        isActive
                          ? 'border-amber-400 bg-amber-500 text-slate-950'
                          : 'border-slate-800 bg-slate-900/70 hover:border-amber-500/50 text-slate-200'
                      }`}
                    >
                      {isPt ? `${pNum}ª` : `P${pNum}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders for East->West Traversal & Annual Gate Progression */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 tabular-nums">
                  <span>
                    {isPt
                      ? 'Travessia Leste → Oeste pelas Portas (24h UTC)'
                      : 'East → West Portal Sweep (24h UTC)'}
                  </span>
                  <strong className="text-amber-300">
                    {String(Math.floor(currentDayMinutes / 60)).padStart(2, '0')}:
                    {String(currentDayMinutes % 60).padStart(2, '0')} UTC
                  </strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1439}
                  value={currentDayMinutes}
                  onChange={(e) => handleTimeOfDaySlider(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 tabular-nums">
                  <span>
                    {isPt
                      ? 'Ciclo Anual pelas 6 Portas (1 Enoque 72)'
                      : 'Annual Cycle through the 6 Portals (1 Enoch 72)'}
                  </span>
                  <strong className="text-blue-300">
                    {isPt ? 'Dia' : 'Day'} {currentDayOfYear}/365
                  </strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={365}
                  value={Math.max(1, Math.min(365, currentDayOfYear))}
                  onChange={(e) => handleDayOfYearSlider(Number(e.target.value))}
                  className="w-full accent-blue-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 3. Book of Enoch (1 Enoch 72–74) Portal & 18-Part Day/Night Readout */}
          <div className="p-4 sm:p-5 space-y-3 bg-slate-900/20 text-xs">
            {/* Active Solar Portal & 18-Part Proportion */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-100">
                      {isPt ? celestial.sunPortal.titlePt : celestial.sunPortal.titleEn}
                    </div>
                    <div className="text-slate-300 italic break-words">
                      {isPt ? celestial.sunPortal.descPt : celestial.sunPortal.descEn}
                    </div>
                  </div>
                </div>
                <div className="text-right tabular-nums shrink-0 text-amber-300">
                  <div>{celestial.sunLat.toFixed(1)}° Lat</div>
                  <div>{celestial.sunLon.toFixed(1)}° Lon</div>
                </div>
              </div>

              {/* Visual 18-Part Day vs Night Bar (1 Enoch 72) */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>
                    {isPt
                      ? `Lei das 18 Partes (1 Enoque 72): Dia ${celestial.sunPortal.dayParts}/18`
                      : `Law of 18 Parts (1 Enoch 72): Day ${celestial.sunPortal.dayParts}/18`}
                  </span>
                  <span>
                    {isPt
                      ? `Noite ${celestial.sunPortal.nightParts}/18`
                      : `Night ${celestial.sunPortal.nightParts}/18`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 border border-slate-700 flex overflow-hidden">
                  <div
                    style={{ width: `${(celestial.sunPortal.dayParts / 18) * 100}%` }}
                    className="bg-amber-400 h-full transition-all"
                  />
                  <div
                    style={{ width: `${(celestial.sunPortal.nightParts / 18) * 100}%` }}
                    className="bg-indigo-950 h-full transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Active Lunar Portal & 14-Part Light Readout (1 Enoch 73–74) */}
            <div className="flex items-start justify-between gap-3 pt-2.5 border-t border-slate-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <LunarPhaseIcon
                  fraction={celestial.lunarInfo.fraction}
                  phaseName={celestial.lunarInfo.phaseName}
                  size={22}
                />
                <div className="min-w-0">
                  <div className="font-bold text-blue-300">
                    {localizedPhaseName} ·{' '}
                    {isPt
                      ? `Porta Lunar ${celestial.moonPortal.portalNumber}`
                      : `Lunar Portal ${celestial.moonPortal.portalNumber}`}
                  </div>
                  <div className="text-slate-300 italic">
                    {isPt ? 'Luz em 14 Partes (1 Enoque 73):' : '14-Part Light (1 Enoch 73):'}{' '}
                    <strong className="text-slate-100">
                      {celestial.enochLunarParts}/14 partes
                    </strong>{' '}
                    ({(celestial.lunarInfo.fraction * 100).toFixed(0)}%)
                  </div>
                </div>
              </div>
              <div className="text-right tabular-nums shrink-0 text-blue-300">
                <div>{celestial.moonLat.toFixed(1)}° Lat</div>
                <div>{celestial.moonLon.toFixed(1)}° Lon</div>
              </div>
            </div>

            {/* Observer Pin Bar */}
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-emerald-300 min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {isPt ? 'Observador:' : 'Observer:'} <strong>{displayObserverCity}</strong> (
                  {observerLat.toFixed(1)}°, {observerLon.toFixed(1)}°)
                </span>
              </div>
              {onOpenGpsModal && (
                <button
                  type="button"
                  onClick={onOpenGpsModal}
                  className="px-2 py-1 border border-slate-700 bg-slate-900 hover:border-amber-500/60 text-amber-300 text-[11px] shrink-0 cursor-pointer"
                >
                  {isPt ? 'Ajustar GPS' : 'Adjust GPS'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
