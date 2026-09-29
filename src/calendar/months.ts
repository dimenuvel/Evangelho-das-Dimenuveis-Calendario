/**
 * @file src/calendar/months.ts
 * 13-month Sacred Calendar metadata, configurable canonical naming, bilingual localization,
 * and complete correlation of the 13 Ecliptic Zodiac Signs (Mazzaroth — Job 38:32),
 * including the restored 13th Sign of the Dragon (Ophiuchus / Draco) in Month IX.
 */

import { Language } from '../i18n/translations';

export interface SacredZodiacSign {
  monthNumber: number; // 1 to 13
  symbol: string;
  namePt: string;
  nameEn: string;
  archetypePt: string;
  archetypeEn: string;
  constellationLatin: string;
  eclipticArc: string;
  elementPt: string;
  elementEn: string;
  isThirteenthDragonSign?: boolean;
  meaningPt: string;
  meaningEn: string;
}

export interface MonthMeta {
  monthNumber: number; // 1 to 13
  defaultName: string; // "Month I", "Month II", etc.
  hebrewSeason: string; // Spring, Summer, Autumn, Winter
  daysInMonth: 28;
  zodiac: SacredZodiacSign;
}

export const MONTH_ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII',
  'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'
];

export const SACRED_13_ZODIAC_SIGNS: SacredZodiacSign[] = [
  {
    monthNumber: 1,
    symbol: '♈',
    namePt: 'Áries',
    nameEn: 'Aries',
    archetypePt: 'O Cordeiro / O Carneiro',
    archetypeEn: 'The Lamb / The Ram',
    constellationLatin: 'Aries (Taleh)',
    eclipticArc: '0.0° – 27.7°',
    elementPt: 'Fogo Cardinal',
    elementEn: 'Cardinal Fire',
    meaningPt: 'Abertura da primavera após o Dia Zero; sinal do Cordeiro Pascal e redenção no Mês I (Êxodo 12:2).',
    meaningEn: 'Spring opening after Day Zero; sign of the Passover Lamb and redemption in Month I (Exodus 12:2).',
  },
  {
    monthNumber: 2,
    symbol: '♉',
    namePt: 'Touro',
    nameEn: 'Taurus',
    archetypePt: 'O Touro e as Plêiades',
    archetypeEn: 'The Bull & The Pleiades',
    constellationLatin: 'Taurus (Shor · Kimah)',
    eclipticArc: '27.7° – 55.4°',
    elementPt: 'Terra Fixa',
    elementEn: 'Fixed Earth',
    meaningPt: 'Força criacional, constelação das Plêiades (Jó 38:31) e provisão fiel na caminhada primaveril.',
    meaningEn: 'Creational strength, the Pleiades cluster (Job 38:31), and faithful provision in late spring.',
  },
  {
    monthNumber: 3,
    symbol: '♊',
    namePt: 'Gêmeos',
    nameEn: 'Gemini',
    archetypePt: 'Os Gêmeos da Aliança',
    archetypeEn: 'The Twins of the Covenant',
    constellationLatin: 'Gemini (Teomim)',
    eclipticArc: '55.4° – 83.1°',
    elementPt: 'Ar Mutável',
    elementEn: 'Mutable Air',
    meaningPt: 'União entre céu e terra, as duas tábuas do Testemunho e as Primícias de Pentecostes no Mês III.',
    meaningEn: 'Union of heaven and earth, the two tablets of Testimony, and the Firstfruits of Pentecost in Month III.',
  },
  {
    monthNumber: 4,
    symbol: '♋',
    namePt: 'Câncer',
    nameEn: 'Cancer',
    archetypePt: 'O Aprisco / O Guardião',
    archetypeEn: 'The Fold / The Guardian',
    constellationLatin: 'Cancer (Sartan · Praesepe)',
    eclipticArc: '83.1° – 110.8°',
    elementPt: 'Água Cardinal',
    elementEn: 'Cardinal Water',
    meaningPt: 'Portão do solstício e refúgio seguro do rebanho reunido sob a luz máxima do ano solar.',
    meaningEn: 'Solstice gateway and safe stronghold of the flock gathered under the peak solar light.',
  },
  {
    monthNumber: 5,
    symbol: '♌',
    namePt: 'Leão',
    nameEn: 'Leo',
    archetypePt: 'O Leão de Judá',
    archetypeEn: 'The Lion of Judah',
    constellationLatin: 'Leo (Aryeh · Regulus)',
    eclipticArc: '110.8° – 138.5°',
    elementPt: 'Fogo Fixo',
    elementEn: 'Fixed Fire',
    meaningPt: 'Cetro real e soberania messiânica (Gênesis 49:9–10), marcado pela estrela real Regulus.',
    meaningEn: 'Royal scepter and messianic sovereignty (Genesis 49:9–10), marked by the royal star Regulus.',
  },
  {
    monthNumber: 6,
    symbol: '♍',
    namePt: 'Virgem',
    nameEn: 'Virgo',
    archetypePt: 'A Virgem e o Renovo (Spica)',
    archetypeEn: 'The Virgin & The Branch (Spica)',
    constellationLatin: 'Virgo (Betulah · Spica)',
    eclipticArc: '138.5° – 166.2°',
    elementPt: 'Terra Mutável',
    elementEn: 'Mutable Earth',
    meaningPt: 'A espiga madura da colheita (Spica / Tzemach) e a preparação espiritual antes do sétimo mês.',
    meaningEn: 'The ripened ear of grain (Spica / Tzemach) and spiritual preparation before the seventh month.',
  },
  {
    monthNumber: 7,
    symbol: '♎',
    namePt: 'Libra',
    nameEn: 'Libra',
    archetypePt: 'A Balança da Justiça',
    archetypeEn: 'The Scales of Justice',
    constellationLatin: 'Libra (Moznayim)',
    eclipticArc: '166.2° – 193.8°',
    elementPt: 'Ar Cardinal',
    elementEn: 'Cardinal Air',
    meaningPt: 'Equilíbrio equinocial de outono, juízo, Dia da Expiação e Festa dos Tabernáculos no Mês VII.',
    meaningEn: 'Autumnal equinoctial balance, judgment, Day of Atonement, and Feast of Tabernacles in Month VII.',
  },
  {
    monthNumber: 8,
    symbol: '♏',
    namePt: 'Escorpião',
    nameEn: 'Scorpio',
    archetypePt: 'O Escorpião / A Águia',
    archetypeEn: 'The Scorpion / The Eagle',
    constellationLatin: 'Scorpius (Akrav · Antares)',
    eclipticArc: '193.8° – 221.5°',
    elementPt: 'Água Fixa',
    elementEn: 'Fixed Water',
    meaningPt: 'O combate espiritual nas profundezas e o voo de renovação como águia (Salmos 103:5).',
    meaningEn: 'Spiritual conflict in the depths and ascending renewal like the eagle (Psalm 103:5).',
  },
  {
    monthNumber: 9,
    symbol: '⛎',
    namePt: 'O Dragão (Ofiúco)',
    nameEn: 'The Dragon (Ophiuchus)',
    archetypePt: '13º Signo Restaurado · O Domador do Dragão',
    archetypeEn: 'Restored 13th Sign · The Dragon-Bearer',
    constellationLatin: 'Ophiuchus / Draco (Serpentarius)',
    eclipticArc: '221.5° – 249.2°',
    elementPt: 'Éter / Fogo Celeste',
    elementEn: 'Aether / Celestial Fire',
    isThirteenthDragonSign: true,
    meaningPt: 'O 13º signo eclíptico do Dragão/Serpentário entre Escorpião e Sagitário — suprimido no calendário de 12 meses, mas essencial na matriz perfeita de 13 meses × 28 dias (Jó 26:13; Salmos 91:13).',
    meaningEn: 'The 13th ecliptic sign of the Dragon/Serpent-Bearer between Scorpio and Sagittarius — omitted in the 12-month system, yet essential to the 13-month × 28-day matrix (Job 26:13; Psalm 91:13).',
  },
  {
    monthNumber: 10,
    symbol: '♐',
    namePt: 'Sagitário',
    nameEn: 'Sagittarius',
    archetypePt: 'O Arqueiro Celeste',
    archetypeEn: 'The Celestial Archer',
    constellationLatin: 'Sagittarius (Keshet)',
    eclipticArc: '249.2° – 276.9°',
    elementPt: 'Fogo Mutável',
    elementEn: 'Mutable Fire',
    meaningPt: 'O arco da promessa e a flecha da vitória lançada em direção ao propósito eterno (Habacuque 3:9).',
    meaningEn: 'The bow of promise and the arrow of victory aimed toward eternal purpose (Habakkuk 3:9).',
  },
  {
    monthNumber: 11,
    symbol: '♑',
    namePt: 'Capricórnio',
    nameEn: 'Capricorn',
    archetypePt: 'A Cabra-Peixe da Subida',
    archetypeEn: 'The Ascending Sea-Goat',
    constellationLatin: 'Capricornus (Gedi)',
    eclipticArc: '276.9° – 304.6°',
    elementPt: 'Terra Cardinal',
    elementEn: 'Cardinal Earth',
    meaningPt: 'Subida perseverante às alturas da rocha e renascimento da luz após o solstício de inverno.',
    meaningEn: 'Steadfast ascent to the mountain heights and rebirth of light after the winter solstice.',
  },
  {
    monthNumber: 12,
    symbol: '♒',
    namePt: 'Aquário',
    nameEn: 'Aquarius',
    archetypePt: 'O Portador das Águas Vivas',
    archetypeEn: 'The Water-Bearer',
    constellationLatin: 'Aquarius (Deli)',
    eclipticArc: '304.6° – 332.3°',
    elementPt: 'Ar Fixo',
    elementEn: 'Fixed Air',
    meaningPt: 'Derramamento das águas vivas e das chuvas serôdias que preparam a terra (Isaías 44:3; Joel 2:28).',
    meaningEn: 'Outpouring of living waters and latter rains preparing the earth (Isaiah 44:3; Joel 2:28).',
  },
  {
    monthNumber: 13,
    symbol: '♓',
    namePt: 'Peixes',
    nameEn: 'Pisces',
    archetypePt: 'Os Dois Peixes Unidos',
    archetypeEn: 'The Two Bound Fishes',
    constellationLatin: 'Pisces (Dagim)',
    eclipticArc: '332.3° – 360.0°',
    elementPt: 'Água Mutável',
    elementEn: 'Mutable Water',
    meaningPt: 'Multiplicação dos remidos e consumação do 13º mês (Dia 364) antes do Dia Zero do novo ano.',
    meaningEn: 'Multiplication of the redeemed and completion of the 13th month (Day 364) before Day Zero.',
  },
];

export function getZodiacForSacredMonth(monthNumber: number): SacredZodiacSign {
  return (
    SACRED_13_ZODIAC_SIGNS[monthNumber - 1] ||
    SACRED_13_ZODIAC_SIGNS[0]
  );
}

export const DEFAULT_MONTH_METADATA: MonthMeta[] = MONTH_ROMAN_NUMERALS.map((roman, idx) => {
  const mNum = idx + 1;
  let season = 'Spring';
  if (mNum >= 4 && mNum <= 6) season = 'Summer';
  else if (mNum >= 7 && mNum <= 9) season = 'Autumn';
  else if (mNum >= 10 && mNum <= 13) season = 'Winter';

  return {
    monthNumber: mNum,
    defaultName: `Month ${roman}`,
    hebrewSeason: season,
    daysInMonth: 28,
    zodiac: getZodiacForSacredMonth(mNum),
  };
});

/**
 * Gets formatted month name taking custom names and active language into account.
 * Automatically translates default "Month I..XIII" <-> "Mês I..XIII" based on active language.
 */
export function getMonthDisplayTitle(monthNumber: number, customNames?: string[], language: Language = 'en'): string {
  const roman = MONTH_ROMAN_NUMERALS[monthNumber - 1] || String(monthNumber);
  const defaultEn = `Month ${roman}`;
  const defaultPt = `Mês ${roman}`;

  if (customNames && customNames[monthNumber - 1]) {
    const trimmed = customNames[monthNumber - 1].trim();
    if (trimmed.length > 0 && trimmed !== defaultEn && trimmed !== defaultPt) {
      return trimmed;
    }
  }

  return language === 'pt' ? defaultPt : defaultEn;
}
