/**
 * @file src/astronomy/natalAstralMap.ts
 * Astronomical & 13-Sign Ecliptic (Mazzaroth) Natal Astral Map calculator.
 * Computes exact positions of the Sun, Moon, Ascendant (Rising Sign), Midheaven (MC),
 * Classical Planets (Mercury, Venus, Mars, Jupiter, Saturn), and Lunar Dragon Node (Caput Draconis)
 * across the 13 Sacred Months × 28 Days Ecliptic Wheel (including Month IX: The Dragon / Ophiuchus)
 * based on the user's exact Gregorian birth date (YYYY-MM-DD), birth time (HH:MM), and GPS coordinates.
 */

import { LunarAnchorMode } from '../types/calendar';
import { SACRED_13_ZODIAC_SIGNS, SacredZodiacSign } from '../calendar/months';
import { solarDateToSacredDate } from '../calendar/sacredCalendar';
import { getLunarPhaseInfo, LunarPhaseInfo } from './moon';
import { getSunTimes } from './sun';

export interface AstralBodyPosition {
  id:
    | 'SUN'
    | 'MOON'
    | 'ASCENDANT'
    | 'MIDHEAVEN'
    | 'DRAGON_NODE'
    | 'MERCURY'
    | 'VENUS'
    | 'MARS'
    | 'JUPITER'
    | 'SATURN';
  symbol: string;
  namePt: string;
  nameEn: string;
  rolePt: string;
  roleEn: string;
  eclipticLongitude: number; // 0..360 degrees
  signIndex: number; // 1..13 (Sacred Month 1..13)
  zodiacSign: SacredZodiacSign;
  degreeInSign: number; // 0..27.69 degrees within the 13-sign sector
  equivalentSacredDayInMonth: number; // 1..28
  colorHex: string;
}

export interface NatalAstralAspect {
  bodyA: AstralBodyPosition;
  bodyB: AstralBodyPosition;
  angleDiff: number;
  aspectType: 'CONJUNCTION' | 'SEXTILE' | 'SQUARE' | 'TRINE' | 'OPPOSITION';
  labelPt: string;
  labelEn: string;
  symbol: string;
  orbDegrees: number;
  colorHex: string;
}

export interface NatalAstralChartData {
  birthDateISO: string;
  birthTimeHHMM: string;
  exactBirthDate: Date;
  julianDay: number;

  // Sacred Calendar birth coordinates
  sacredYearOfBirth: number;
  sacredMonth: number; // 0 for Day Zero, 1..13 for numbered months
  sacredDayOfMonth: number; // 0 for Day Zero, 1..28
  sacredDayOfYear: number; // 0..364
  sacredDayOfWeek: number; // 0 or 1..7
  isBornOnSabbath: boolean;
  isBornOnDayZero: boolean;

  // Primary Triad (Sun, Moon, Ascendant)
  sunPosition: AstralBodyPosition;
  moonPosition: AstralBodyPosition;
  ascendantPosition: AstralBodyPosition;
  midheavenPosition: AstralBodyPosition;
  dragonNodePosition: AstralBodyPosition;

  // All 10 plotted astral positions
  bodies: AstralBodyPosition[];

  // Major geometric aspects between natal bodies
  aspects: NatalAstralAspect[];

  // Lunar & Enochian Gate context at birth
  birthLunarInfo: LunarPhaseInfo;
  enochSolarGate: number; // 1..6 (1 Enoch 72)
  dayParts18: number; // e.g. 9..12 or 6..12 out of 18
  nightParts18: number;
  localSunriseAtBirth: string;
  localSunsetAtBirth: string;
  isDaytimeBirth: boolean;
}

const DEG_PER_SIGN_13 = 360 / 13; // ~27.69230769° per sign

function normalizeDegrees(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return ((deg % 360) + 360) % 360;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Maps any ecliptic longitude (0..360°) into its corresponding sign in the 13-Sign Mazzaroth Wheel.
 */
export function mapLongitudeTo13Zodiac(longitude: number): {
  signIndex: number;
  zodiacSign: SacredZodiacSign;
  degreeInSign: number;
  equivalentSacredDayInMonth: number;
} {
  const norm = normalizeDegrees(longitude);
  const rawIdx = Math.floor(norm / DEG_PER_SIGN_13);
  const signIndex = Math.min(13, Math.max(1, rawIdx + 1));
  const degreeInSign = norm - (signIndex - 1) * DEG_PER_SIGN_13;
  const equivalentSacredDayInMonth = Math.min(
    28,
    Math.max(1, Math.floor((degreeInSign / DEG_PER_SIGN_13) * 28) + 1)
  );
  return {
    signIndex,
    zodiacSign: SACRED_13_ZODIAC_SIGNS[signIndex - 1] || SACRED_13_ZODIAC_SIGNS[0],
    degreeInSign,
    equivalentSacredDayInMonth,
  };
}

/**
 * Computes geocentric ecliptic longitude (0..360°) of classical planets and Lunar North Node
 * from Julian Ephemeris Day (JDE) using orbital elements relative to J2000.0 (JD 2451545.0).
 */
function computePlanetaryGeocentricLongitudes(
  jd: number,
  sunLon: number
): {
  mercury: number;
  venus: number;
  mars: number;
  jupiter: number;
  saturn: number;
  dragonNode: number;
} {
  // Days since J2000.0
  const d = jd - 2451545.0;

  // Earth heliocentric longitude (opposite to apparent Sun geocentric longitude)
  const earthHelioLon = normalizeDegrees(sunLon + 180);
  const earthR = 1.0;

  // Helper to project heliocentric circular/elliptical orbit to geocentric ecliptic longitude
  const helioToGeoLon = (
    L0: number,
    dailyMotion: number,
    semiMajorAU: number,
    eccentricity: number,
    perihelionLon: number
  ): number => {
    const meanLon = normalizeDegrees(L0 + dailyMotion * d);
    const M = degToRad(normalizeDegrees(meanLon - perihelionLon));
    // Equation of center (first two terms)
    const E =
      radToDeg(
        2 * eccentricity * Math.sin(M) + 1.25 * eccentricity * eccentricity * Math.sin(2 * M)
      );
    const trueHelioLon = normalizeDegrees(meanLon + E);
    const r = semiMajorAU * (1 - eccentricity * Math.cos(M));

    const x =
      r * Math.cos(degToRad(trueHelioLon)) - earthR * Math.cos(degToRad(earthHelioLon));
    const y =
      r * Math.sin(degToRad(trueHelioLon)) - earthR * Math.sin(degToRad(earthHelioLon));
    return normalizeDegrees(radToDeg(Math.atan2(y, x)));
  };

  // J2000.0 mean orbital elements (Standish / Meeus)
  const mercury = helioToGeoLon(252.2509, 4.09233445, 0.387098, 0.20563, 77.4561);
  const venus = helioToGeoLon(181.9798, 1.60213034, 0.723332, 0.00677, 131.5637);
  const mars = helioToGeoLon(355.433, 0.52403295, 1.523679, 0.0934, 336.0602);
  const jupiter = helioToGeoLon(34.3515, 0.08308529, 5.2026, 0.04849, 14.3312);
  const saturn = helioToGeoLon(50.0774, 0.03345965, 9.5549, 0.05555, 93.0572);

  // Mean Lunar Ascending Node (Caput Draconis / Head of the Dragon - 18.61 year retrograde cycle)
  const dragonNode = normalizeDegrees(125.04452 - 0.0529537648 * d);

  return {
    mercury,
    venus,
    mars,
    jupiter,
    saturn,
    dragonNode,
  };
}

/**
 * Determines the Enochian Solar Gate (1..6) from Sacred Month (1..13).
 * According to 1 Enoch 72:
 * - Month I: Gate 4
 * - Month II: Gate 5
 * - Month III–IV: Gate 6 (Summer Solstice peak)
 * - Month V: Gate 5
 * - Month VI: Gate 4
 * - Month VII: Gate 3
 * - Month VIII: Gate 2
 * - Month IX–X: Gate 1 (Winter Solstice)
 * - Month XI: Gate 2
 * - Month XII–XIII: Gate 3
 */
function getEnochGateForSacredMonth(sacredMonth: number): {
  gate: number;
  dayParts: number;
  nightParts: number;
} {
  const map: Record<number, { gate: number; dayParts: number; nightParts: number }> = {
    0: { gate: 4, dayParts: 10, nightParts: 8 },
    1: { gate: 4, dayParts: 10, nightParts: 8 },
    2: { gate: 5, dayParts: 11, nightParts: 7 },
    3: { gate: 6, dayParts: 12, nightParts: 6 },
    4: { gate: 6, dayParts: 12, nightParts: 6 },
    5: { gate: 5, dayParts: 11, nightParts: 7 },
    6: { gate: 4, dayParts: 10, nightParts: 8 },
    7: { gate: 3, dayParts: 9, nightParts: 9 },
    8: { gate: 2, dayParts: 8, nightParts: 10 },
    9: { gate: 1, dayParts: 7, nightParts: 11 },
    10: { gate: 1, dayParts: 6, nightParts: 12 },
    11: { gate: 2, dayParts: 7, nightParts: 11 },
    12: { gate: 3, dayParts: 8, nightParts: 10 },
    13: { gate: 3, dayParts: 9, nightParts: 9 },
  };
  return map[sacredMonth] || { gate: 4, dayParts: 10, nightParts: 8 };
}

/**
 * Calculates the complete 13-Sign Natal Astral Map for a given Gregorian birth date (YYYY-MM-DD),
 * exact birth time (HH:MM), lunar anchor mode, and observer coordinates.
 */
export function calculateNatalAstralChart(
  birthDateISO: string,
  birthTimeHHMM: string = '12:00',
  lunarAnchorMode: LunarAnchorMode = 'CONJUNCTION',
  latitude: number = 31.7683,
  longitude: number = 35.2137
): NatalAstralChartData | null {
  if (!birthDateISO || !/^\d{4}-\d{2}-\d{2}$/.test(birthDateISO)) {
    return null;
  }

  const [yStr, mStr, dStr] = birthDateISO.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  const cleanTime = /^\d{2}:\d{2}$/.test(birthTimeHHMM) ? birthTimeHHMM : '12:00';
  const [hStr, minStr] = cleanTime.split(':');
  const hour = Math.min(23, Math.max(0, parseInt(hStr, 10) || 0));
  const minute = Math.min(59, Math.max(0, parseInt(minStr, 10) || 0));

  const exactBirthDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  const noonBirthDate = new Date(year, month - 1, day, 12, 0, 0, 0);

  // Julian Day at exact birth instant
  const julianDay = exactBirthDate.getTime() / 86400000 + 2440587.5;

  // Resolve Sacred Calendar Day of Birth
  const birthSacredDay = solarDateToSacredDate(noonBirthDate, lunarAnchorMode);
  const isBornOnDayZero = birthSacredDay.kind === 'DAY_ZERO';
  const sacredMonth = isBornOnDayZero ? 0 : birthSacredDay.month;
  const sacredDayOfMonth = isBornOnDayZero ? 0 : birthSacredDay.dayOfMonth;
  const sacredDayOfYear = isBornOnDayZero ? 0 : birthSacredDay.dayOfYear;
  const sacredDayOfWeek = isBornOnDayZero ? 0 : birthSacredDay.dayOfWeek;
  const isBornOnSabbath = isBornOnDayZero || birthSacredDay.isWeeklySabbath;

  // Fractional hour in the day (0..1)
  const dayFraction = (hour + minute / 60) / 24;

  // 1. Solar Ecliptic Longitude on the 13-Month × 28-Day Mazzaroth Wheel (0..360°)
  const effectiveSacredDayProgress = isBornOnDayZero
    ? dayFraction * 0.5
    : sacredDayOfYear - 1 + dayFraction;
  const sunLongitude = normalizeDegrees((effectiveSacredDayProgress / 364) * 360);

  // 2. Lunar Phase & Ecliptic Longitude at Exact Birth Instant
  const birthLunarInfo = getLunarPhaseInfo(exactBirthDate);
  const phaseAngleDeg = Number.isFinite(birthLunarInfo.phaseAngle)
    ? birthLunarInfo.phaseAngle
    : 0;
  const moonLongitude = normalizeDegrees(sunLongitude + phaseAngleDeg);

  // 3. Local Sunrise & Sunset at Birth Location -> Ascendant & Midheaven
  const safeLat = Number.isFinite(latitude) ? latitude : 31.7683;
  const safeLon = Number.isFinite(longitude) ? longitude : 35.2137;
  const sunTimesAtBirth = getSunTimes(noonBirthDate, safeLat, safeLon);
  const sunriseDate =
    sunTimesAtBirth.sunrise && !Number.isNaN(sunTimesAtBirth.sunrise.getTime())
      ? sunTimesAtBirth.sunrise
      : new Date(year, month - 1, day, 6, 0, 0);
  const sunsetDate =
    sunTimesAtBirth.sunset && !Number.isNaN(sunTimesAtBirth.sunset.getTime())
      ? sunTimesAtBirth.sunset
      : new Date(year, month - 1, day, 18, 0, 0);

  const sunriseHours = sunriseDate.getHours() + sunriseDate.getMinutes() / 60;
  const birthHours = hour + minute / 60;
  const hoursSinceSunrise = ((birthHours - sunriseHours) % 24 + 24) % 24;

  // At local sunrise, the Sun is on the Eastern Horizon (Ascendant == Sun Longitude).
  // Every hour advances the Eastern Horizon by 15° along the ecliptic, with a mild latitude obliquity factor.
  const latFactor = Math.sin(degToRad(safeLat)) * 4.5 * Math.sin(degToRad(hoursSinceSunrise * 15));
  const ascendantLongitude = normalizeDegrees(sunLongitude + hoursSinceSunrise * 15 + latFactor);
  const midheavenLongitude = normalizeDegrees(ascendantLongitude + 270);

  // 4. Classical Planets & Lunar North Node (Head of the Dragon)
  const planets = computePlanetaryGeocentricLongitudes(julianDay, sunLongitude);

  const createBody = (
    id: AstralBodyPosition['id'],
    symbol: string,
    namePt: string,
    nameEn: string,
    rolePt: string,
    roleEn: string,
    lon: number,
    colorHex: string
  ): AstralBodyPosition => {
    const mapped = mapLongitudeTo13Zodiac(lon);
    return {
      id,
      symbol,
      namePt,
      nameEn,
      rolePt,
      roleEn,
      eclipticLongitude: normalizeDegrees(lon),
      signIndex: mapped.signIndex,
      zodiacSign: mapped.zodiacSign,
      degreeInSign: mapped.degreeInSign,
      equivalentSacredDayInMonth: mapped.equivalentSacredDayInMonth,
      colorHex,
    };
  };

  const sunPosition = createBody(
    'SUN',
    '☉',
    'Sol Natal',
    'Natal Sun',
    'Essência & Mês Sagrado de Nascimento',
    'Core Essence & Birth Sacred Month',
    sunLongitude,
    '#f59e0b'
  );

  const moonPosition = createBody(
    'MOON',
    '☽',
    'Lua Natal',
    'Natal Moon',
    'Alma, Ritmo Sinódico & Memória Lunar',
    'Soul, Synodic Rhythm & Lunar Memory',
    moonLongitude,
    '#60a5fa'
  );

  const ascendantPosition = createBody(
    'ASCENDANT',
    'ASC',
    'Signo Ascendente',
    'Rising Ascendant',
    'Horizonte Oriental no Minuto Exato do Nascimento',
    'Eastern Horizon at Exact Birth Minute',
    ascendantLongitude,
    '#34d399'
  );

  const midheavenPosition = createBody(
    'MIDHEAVEN',
    'MC',
    'Meio do Céu (Zênite)',
    'Midheaven (Zenith)',
    'Vocação & Culminação Meridiana',
    'Vocation & Meridian Culmination',
    midheavenLongitude,
    '#c084fc'
  );

  const dragonNodePosition = createBody(
    'DRAGON_NODE',
    '☊',
    'Cabeça do Dragão (Nodo Norte)',
    'Dragon Head (North Node)',
    'Ponto Eclíptico Dracônico de Destino',
    'Draconic Ecliptic Point of Destiny',
    planets.dragonNode,
    '#10b981'
  );

  const mercuryPosition = createBody(
    'MERCURY',
    '☿',
    'Mercúrio',
    'Mercury',
    'Intelecto, Verbo & Discernimento',
    'Intellect, Word & Discernment',
    planets.mercury,
    '#eab308'
  );

  const venusPosition = createBody(
    'VENUS',
    '♀',
    'Vênus',
    'Venus',
    'Harmonia, Graça & Estrela da Alva',
    'Harmony, Grace & Morning Star',
    planets.venus,
    '#f472b6'
  );

  const marsPosition = createBody(
    'MARS',
    '♂',
    'Marte',
    'Mars',
    'Zelo, Coragem & Impulso Ativo',
    'Zeal, Courage & Active Drive',
    planets.mars,
    '#f87171'
  );

  const jupiterPosition = createBody(
    'JUPITER',
    '♃',
    'Júpiter',
    'Jupiter',
    'Sabedoria,Cetro Real & Expansão',
    'Wisdom, Royal Scepter & Expansion',
    planets.jupiter,
    '#fb923c'
  );

  const saturnPosition = createBody(
    'SATURN',
    '♄',
    'Saturno',
    'Saturn',
    'Aliança, Ordem do Tempo & Perseverança',
    'Covenant, Time Order & Perseverance',
    planets.saturn,
    '#94a3b8'
  );

  const bodies: AstralBodyPosition[] = [
    sunPosition,
    moonPosition,
    ascendantPosition,
    midheavenPosition,
    dragonNodePosition,
    mercuryPosition,
    venusPosition,
    marsPosition,
    jupiterPosition,
    saturnPosition,
  ];

  // 5. Compute Major Geometric Aspects between key natal points
  const aspects: NatalAstralAspect[] = [];
  const aspectDefinitions: {
    type: NatalAstralAspect['aspectType'];
    targetAngle: number;
    maxOrb: number;
    labelPt: string;
    labelEn: string;
    symbol: string;
    colorHex: string;
  }[] = [
    {
      type: 'CONJUNCTION',
      targetAngle: 0,
      maxOrb: 10,
      labelPt: 'Conjunção (0°)',
      labelEn: 'Conjunction (0°)',
      symbol: '☌',
      colorHex: '#f59e0b',
    },
    {
      type: 'SEXTILE',
      targetAngle: 60,
      maxOrb: 7,
      labelPt: 'Sextil (60°)',
      labelEn: 'Sextile (60°)',
      symbol: '⚹',
      colorHex: '#38bdf8',
    },
    {
      type: 'SQUARE',
      targetAngle: 90,
      maxOrb: 8,
      labelPt: 'Quadratura (90°)',
      labelEn: 'Square (90°)',
      symbol: '□',
      colorHex: '#f87171',
    },
    {
      type: 'TRINE',
      targetAngle: 120,
      maxOrb: 8,
      labelPt: 'Trígono (120°)',
      labelEn: 'Trine (120°)',
      symbol: '△',
      colorHex: '#34d399',
    },
    {
      type: 'OPPOSITION',
      targetAngle: 180,
      maxOrb: 9,
      labelPt: 'Oposição (180°)',
      labelEn: 'Opposition (180°)',
      symbol: '☍',
      colorHex: '#c084fc',
    },
  ];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      let diff = Math.abs(a.eclipticLongitude - b.eclipticLongitude);
      if (diff > 180) diff = 360 - diff;

      for (const def of aspectDefinitions) {
        const orb = Math.abs(diff - def.targetAngle);
        if (orb <= def.maxOrb) {
          aspects.push({
            bodyA: a,
            bodyB: b,
            angleDiff: diff,
            aspectType: def.type,
            labelPt: def.labelPt,
            labelEn: def.labelEn,
            symbol: def.symbol,
            orbDegrees: orb,
            colorHex: def.colorHex,
          });
          break;
        }
      }
    }
  }

  const enochGateInfo = getEnochGateForSacredMonth(sacredMonth);
  const isDaytimeBirth =
    exactBirthDate.getTime() >= sunriseDate.getTime() &&
    exactBirthDate.getTime() <= sunsetDate.getTime();

  return {
    birthDateISO,
    birthTimeHHMM: cleanTime,
    exactBirthDate,
    julianDay,
    sacredYearOfBirth: birthSacredDay.calendarYear,
    sacredMonth,
    sacredDayOfMonth,
    sacredDayOfYear,
    sacredDayOfWeek,
    isBornOnSabbath,
    isBornOnDayZero,
    sunPosition,
    moonPosition,
    ascendantPosition,
    midheavenPosition,
    dragonNodePosition,
    bodies,
    aspects: aspects.slice(0, 10),
    birthLunarInfo,
    enochSolarGate: enochGateInfo.gate,
    dayParts18: enochGateInfo.dayParts,
    nightParts18: enochGateInfo.nightParts,
    localSunriseAtBirth: sunriseDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    localSunsetAtBirth: sunsetDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    isDaytimeBirth,
  };
}
