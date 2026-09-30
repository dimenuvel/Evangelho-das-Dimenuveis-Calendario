/**
 * @file src/astronomy/chineseZodiac.ts
 * Astronomical Chinese Zodiac (Shengxiao 生肖), 60-Year Sexagenary Cycle (Ganzhi 干支),
 * Five Elements (Wu Xing 五行), and Four Pillars of Birth (BaZi 四柱 — Year, Month, Day, Shichen Hour)
 * synchronized with the user's Gregorian birth date, exact birth time, and the Sacred Calendar.
 */

import * as SunCalc from 'suncalc';

export type WuXingElementId = 'WOOD' | 'FIRE' | 'EARTH' | 'METAL' | 'WATER';
export type YinYangPolarity = 'YANG' | 'YIN';

export interface WuXingElementInfo {
  id: WuXingElementId;
  hanzi: string;
  pinyin: string;
  namePt: string;
  nameEn: string;
  colorHex: string;
  seasonPt: string;
  seasonEn: string;
  directionPt: string;
  directionEn: string;
  planetPt: string;
  planetEn: string;
  virtuePt: string;
  virtueEn: string;
  generates: WuXingElementId;
  overcomes: WuXingElementId;
}

export interface HeavenlyStemInfo {
  index: number; // 1..10
  hanzi: string;
  pinyin: string;
  element: WuXingElementId;
  polarity: YinYangPolarity;
}

export interface ChineseZodiacAnimal {
  index: number; // 1..12 (1 = Rat / Zi, 12 = Pig / Hai)
  id:
    | 'RAT'
    | 'OX'
    | 'TIGER'
    | 'RABBIT'
    | 'DRAGON'
    | 'SNAKE'
    | 'HORSE'
    | 'GOAT'
    | 'MONKEY'
    | 'ROOSTER'
    | 'DOG'
    | 'PIG';
  symbol: string;
  branchHanzi: string;
  branchPinyin: string;
  animalHanzi: string;
  namePt: string;
  nameEn: string;
  fixedElement: WuXingElementId;
  polarity: YinYangPolarity;
  shichenHours: string; // e.g. "23:00 – 01:00"
  compassDegrees: number; // 0..330
  directionPt: string;
  directionEn: string;
  trineGroupPt: string;
  trineGroupEn: string;
  alliesPt: string;
  alliesEn: string;
  archetypePt: string;
  archetypeEn: string;
  meaningPt: string;
  meaningEn: string;
  sacredCorrelationPt: string;
  sacredCorrelationEn: string;
}

export interface GanzhiPillar {
  pillarType: 'YEAR' | 'MONTH' | 'DAY' | 'HOUR';
  labelPt: string;
  labelEn: string;
  rolePt: string;
  roleEn: string;
  sexagenaryNumber: number; // 1..60
  stem: HeavenlyStemInfo;
  animal: ChineseZodiacAnimal;
  elementInfo: WuXingElementInfo;
  fullTitlePt: string;
  fullTitleEn: string;
}

export interface NatalChineseZodiacChart {
  birthDateISO: string;
  birthTimeHHMM: string;
  gregorianBirthYear: number;
  chineseLunarYear: number;
  lunarNewYearDateISO: string;
  bornBeforeLunarNewYear: boolean;
  yearPillar: GanzhiPillar;
  monthPillar: GanzhiPillar;
  dayPillar: GanzhiPillar;
  hourPillar: GanzhiPillar;
  elementBalance: Record<WuXingElementId, number>;
  currentYearNumber: number;
  currentYearPillar: GanzhiPillar;
}

export const WU_XING_ELEMENTS: Record<WuXingElementId, WuXingElementInfo> = {
  WOOD: {
    id: 'WOOD',
    hanzi: '木',
    pinyin: 'Mù',
    namePt: 'Madeira',
    nameEn: 'Wood',
    colorHex: '#10b981',
    seasonPt: 'Primavera (Germinação)',
    seasonEn: 'Spring (Germination)',
    directionPt: 'Leste (Oriente)',
    directionEn: 'East',
    planetPt: 'Júpiter (Estrela do Ano — Sui Xing)',
    planetEn: 'Jupiter (Year Star — Sui Xing)',
    virtuePt: 'Benevolência, Crescimento & Visão Pioneira',
    virtueEn: 'Benevolence, Growth & Pioneering Vision',
    generates: 'FIRE',
    overcomes: 'EARTH',
  },
  FIRE: {
    id: 'FIRE',
    hanzi: '火',
    pinyin: 'Huǒ',
    namePt: 'Fogo',
    nameEn: 'Fire',
    colorHex: '#f97316',
    seasonPt: 'Verão (Plenitude Solar)',
    seasonEn: 'Summer (Solar Zenith)',
    directionPt: 'Sul (Meridião)',
    directionEn: 'South',
    planetPt: 'Marte (Estrela Cintilante — Ying Huo)',
    planetEn: 'Mars (Shimmering Star — Ying Huo)',
    virtuePt: 'Retidão, Entusiasmo, Clareza & Iluminação',
    virtueEn: 'Righteousness, Enthusiasm, Clarity & Illumination',
    generates: 'EARTH',
    overcomes: 'METAL',
  },
  EARTH: {
    id: 'EARTH',
    hanzi: '土',
    pinyin: 'Tǔ',
    namePt: 'Terra',
    nameEn: 'Earth',
    colorHex: '#eab308',
    seasonPt: 'Centro & Transições Sazonais',
    seasonEn: 'Center & Seasonal Transitions',
    directionPt: 'Centro (Eixo Estável)',
    directionEn: 'Center (Axis Mundi)',
    planetPt: 'Saturno (Estrela Guardiã — Zhen Xing)',
    planetEn: 'Saturn (Guardian Star — Zhen Xing)',
    virtuePt: 'Fidelidade, Estabilidade, Nutrição & Aliança',
    virtueEn: 'Fidelity, Stability, Nourishment & Covenant',
    generates: 'METAL',
    overcomes: 'WATER',
  },
  METAL: {
    id: 'METAL',
    hanzi: '金',
    pinyin: 'Jīn',
    namePt: 'Metal (Ouro)',
    nameEn: 'Metal (Gold)',
    colorHex: '#e2e8f0',
    seasonPt: 'Outono (Colheita & Discernimento)',
    seasonEn: 'Autumn (Harvest & Discernment)',
    directionPt: 'Oeste (Ocidente)',
    directionEn: 'West',
    planetPt: 'Vênus (Grande Branca — Tai Bai)',
    planetEn: 'Venus (Great White — Tai Bai)',
    virtuePt: 'Justiça, Precisão, Ordem & Pureza',
    virtueEn: 'Justice, Precision, Order & Purity',
    generates: 'WATER',
    overcomes: 'WOOD',
  },
  WATER: {
    id: 'WATER',
    hanzi: '水',
    pinyin: 'Shuǐ',
    namePt: 'Água',
    nameEn: 'Water',
    colorHex: '#38bdf8',
    seasonPt: 'Inverno (Repouso & Sabedoria Profunda)',
    seasonEn: 'Winter (Rest & Deep Wisdom)',
    directionPt: 'Norte (Abismo Celeste)',
    directionEn: 'North',
    planetPt: 'Mercúrio (Estrela das Águas — Chen Xing)',
    planetEn: 'Mercury (Water Star — Chen Xing)',
    virtuePt: 'Sabedoria, Intuição, Adaptação & Memória',
    virtueEn: 'Wisdom, Intuition, Adaptability & Memory',
    generates: 'WOOD',
    overcomes: 'FIRE',
  },
};

export const TEN_HEAVENLY_STEMS: HeavenlyStemInfo[] = [
  { index: 1, hanzi: '甲', pinyin: 'Jiǎ', element: 'WOOD', polarity: 'YANG' },
  { index: 2, hanzi: '乙', pinyin: 'Yǐ', element: 'WOOD', polarity: 'YIN' },
  { index: 3, hanzi: '丙', pinyin: 'Bǐng', element: 'FIRE', polarity: 'YANG' },
  { index: 4, hanzi: '丁', pinyin: 'Dīng', element: 'FIRE', polarity: 'YIN' },
  { index: 5, hanzi: '戊', pinyin: 'Wù', element: 'EARTH', polarity: 'YANG' },
  { index: 6, hanzi: '己', pinyin: 'Jǐ', element: 'EARTH', polarity: 'YIN' },
  { index: 7, hanzi: '庚', pinyin: 'Gēng', element: 'METAL', polarity: 'YANG' },
  { index: 8, hanzi: '辛', pinyin: 'Xīn', element: 'METAL', polarity: 'YIN' },
  { index: 9, hanzi: '壬', pinyin: 'Rén', element: 'WATER', polarity: 'YANG' },
  { index: 10, hanzi: '癸', pinyin: 'Guǐ', element: 'WATER', polarity: 'YIN' },
];

export const TWELVE_CHINESE_ZODIAC_ANIMALS: ChineseZodiacAnimal[] = [
  {
    index: 1,
    id: 'RAT',
    symbol: '🐀',
    branchHanzi: '子',
    branchPinyin: 'Zǐ',
    animalHanzi: '鼠',
    namePt: 'Rato',
    nameEn: 'Rat',
    fixedElement: 'WATER',
    polarity: 'YANG',
    shichenHours: '23:00 – 01:00',
    compassDegrees: 0,
    directionPt: 'Norte Exato (0°)',
    directionEn: 'Due North (0°)',
    trineGroupPt: '1º Trígono: Os Visionários (Rato · Dragão · Macaco)',
    trineGroupEn: '1st Trine: The Visionaries (Rat · Dragon · Monkey)',
    alliesPt: 'Dragão, Macaco & Boi',
    alliesEn: 'Dragon, Monkey & Ox',
    archetypePt: 'O Sentinela da Meia-Noite & Semente das Águas',
    archetypeEn: 'The Midnight Sentinel & Seed of Waters',
    meaningPt:
      'Primeiro ramo terrestre (Zǐ), regente da meia-noite e do solstício de inverno, quando a nova luz começa a germinar no oculto. Simboliza inteligência aguda, engenhosidade, vigilância e início de ciclos.',
    meaningEn:
      'First earthly branch (Zǐ), ruler of midnight and the winter solstice when new light begins to germinate in secret. Symbolizes keen intelligence, resourcefulness, vigilance, and cycle beginnings.',
    sacredCorrelationPt: 'Vigia da Meia-Noite · 1ª Porta de Enoque (Início da Subida Solar)',
    sacredCorrelationEn: 'Midnight Watch · Enoch Gate 1 (Start of Solar Ascent)',
  },
  {
    index: 2,
    id: 'OX',
    symbol: '🐂',
    branchHanzi: '丑',
    branchPinyin: 'Chǒu',
    animalHanzi: '牛',
    namePt: 'Boi (Búfalo)',
    nameEn: 'Ox (Water Buffalo)',
    fixedElement: 'EARTH',
    polarity: 'YIN',
    shichenHours: '01:00 – 03:00',
    compassDegrees: 30,
    directionPt: 'Norte-Nordeste (30°)',
    directionEn: 'North-Northeast (30°)',
    trineGroupPt: '2º Trígono: Os Perseverantes (Boi · Serpente · Galo)',
    trineGroupEn: '2nd Trine: The Industrious (Ox · Snake · Rooster)',
    alliesPt: 'Serpente, Galo & Rato',
    alliesEn: 'Snake, Rooster & Rat',
    archetypePt: 'O Lavrador Paciente & Coluna de Estabilidade',
    archetypeEn: 'The Patient Plowman & Pillar of Stability',
    meaningPt:
      'Segundo ramo terrestre (Chǒu), regente da última vigília antes da alvorada. Representa força silenciosa, constância inabalável, trabalho metódico e preparação fiel do solo.',
    meaningEn:
      'Second earthly branch (Chǒu), ruler of the deep watch before dawn. Represents silent strength, unshakable constancy, methodical labor, and faithful preparation of the soil.',
    sacredCorrelationPt: 'Paralelo ao Signo de Touro (Shor — Mês II Sagrado)',
    sacredCorrelationEn: 'Parallel to Taurus (Shor — Sacred Month II)',
  },
  {
    index: 3,
    id: 'TIGER',
    symbol: '🐅',
    branchHanzi: '寅',
    branchPinyin: 'Yín',
    animalHanzi: '虎',
    namePt: 'Tigre',
    nameEn: 'Tiger',
    fixedElement: 'WOOD',
    polarity: 'YANG',
    shichenHours: '03:00 – 05:00',
    compassDegrees: 60,
    directionPt: 'Leste-Nordeste (60°)',
    directionEn: 'East-Northeast (60°)',
    trineGroupPt: '3º Trígono: Os Guardiões da Ação (Tigre · Cavalo · Cão)',
    trineGroupEn: '3rd Trine: The Chivalrous Protectors (Tiger · Horse · Dog)',
    alliesPt: 'Cavalo, Cão & Javali',
    alliesEn: 'Horse, Dog & Pig',
    archetypePt: 'O Despertar da Primavera & Coragem Soberana',
    archetypeEn: 'The Spring Awakening & Sovereign Courage',
    meaningPt:
      'Terceiro ramo terrestre (Yín), marca o início astronômico da primavera oriental (Lichun). Representa bravura, autoridade protetora, impulso vital e nobreza de espírito.',
    meaningEn:
      'Third earthly branch (Yín), marking the astronomical start of eastern spring (Lichun). Represents bravery, protective authority, vital impulse, and nobility of spirit.',
    sacredCorrelationPt: 'Vigia da Alvorada · Despertar dos Ventos da Primavera',
    sacredCorrelationEn: 'Dawn Watch · Awakening of the Spring Winds',
  },
  {
    index: 4,
    id: 'RABBIT',
    symbol: '🐇',
    branchHanzi: '卯',
    branchPinyin: 'Mǎo',
    animalHanzi: '兔',
    namePt: 'Coelho (Lebre)',
    nameEn: 'Rabbit (Hare)',
    fixedElement: 'WOOD',
    polarity: 'YIN',
    shichenHours: '05:00 – 07:00',
    compassDegrees: 90,
    directionPt: 'Leste Exato (90°)',
    directionEn: 'Due East (90°)',
    trineGroupPt: '4º Trígono: Os Pacificadores (Coelho · Cabra · Javali)',
    trineGroupEn: '4th Trine: The Peacemakers (Rabbit · Goat · Pig)',
    alliesPt: 'Cabra, Javali & Cão',
    alliesEn: 'Goat, Pig & Dog',
    archetypePt: 'A Porta do Nascer do Sol & Diplomacia Serena',
    archetypeEn: 'The Gate of Sunrise & Serene Diplomacy',
    meaningPt:
      'Quarto ramo terrestre (Mǎo), posicionado exatamente no Leste (90°) e na hora do nascer do sol (05:00–07:00). Associado na tradição oriental ao Coelho de Jade na Lua, simboliza paz, sensibilidade artística, compaixão e longevidade.',
    meaningEn:
      'Fourth earthly branch (Mǎo), positioned due East (90°) at the hour of sunrise (05:00–07:00). Associated in eastern lore with the Jade Rabbit on the Moon, symbolizing peace, artistry, compassion, and longevity.',
    sacredCorrelationPt: '4ª Porta Oriental de Enoque (Equinócio da Primavera · Mês I)',
    sacredCorrelationEn: 'Enoch Eastern Gate 4 (Vernal Equinox · Sacred Month I)',
  },
  {
    index: 5,
    id: 'DRAGON',
    symbol: '🐉',
    branchHanzi: '辰',
    branchPinyin: 'Chén',
    animalHanzi: '龍',
    namePt: 'Dragão',
    nameEn: 'Dragon',
    fixedElement: 'EARTH',
    polarity: 'YANG',
    shichenHours: '07:00 – 09:00',
    compassDegrees: 120,
    directionPt: 'Leste-Sudeste (120°)',
    directionEn: 'East-Southeast (120°)',
    trineGroupPt: '1º Trígono: Os Visionários (Rato · Dragão · Macaco)',
    trineGroupEn: '1st Trine: The Visionaries (Rat · Dragon · Monkey)',
    alliesPt: 'Rato, Macaco & Galo',
    alliesEn: 'Rat, Monkey & Rooster',
    archetypePt: 'O Guardião Celeste das Chuvas & Eixo Cósmico',
    archetypeEn: 'The Celestial Rain-Bearer & Cosmic Axis',
    meaningPt:
      'Quinto ramo terrestre (Chén), único signo místico e celeste entre os 12 animais. Na astronomia chinesa corresponde à Grande Constelação do Dragão Azul do Oriente (Qinglong, de Spica em Virgem até Antares em Escorpião/Ofiúco), simbolizando soberania espiritual, transformação, sabedoria e restauração.',
    meaningEn:
      'Fifth earthly branch (Chén), the sole celestial sign among the 12 animals. In Chinese astronomy it corresponds to the Azure Dragon of the East constellation (spanning from Spica through Scorpio/Ophiuchus), symbolizing spiritual sovereignty, transformation, wisdom, and restoration.',
    sacredCorrelationPt:
      'Elo Direto com o 13º Signo Restaurado do Dragão (Mês IX · Ofiúco/Draco)',
    sacredCorrelationEn:
      'Direct Link to the Restored 13th Sign of the Dragon (Month IX · Ophiuchus/Draco)',
  },
  {
    index: 6,
    id: 'SNAKE',
    symbol: '🐍',
    branchHanzi: '巳',
    branchPinyin: 'Sì',
    animalHanzi: '蛇',
    namePt: 'Serpente',
    nameEn: 'Snake',
    fixedElement: 'FIRE',
    polarity: 'YIN',
    shichenHours: '09:00 – 11:00',
    compassDegrees: 150,
    directionPt: 'Sul-Sudeste (150°)',
    directionEn: 'South-Southeast (150°)',
    trineGroupPt: '2º Trígono: Os Perseverantes (Boi · Serpente · Galo)',
    trineGroupEn: '2nd Trine: The Industrious (Ox · Snake · Rooster)',
    alliesPt: 'Boi, Galo & Macaco',
    alliesEn: 'Ox, Rooster & Monkey',
    archetypePt: 'A Prudência Silenciosa & Sabedoria Interior',
    archetypeEn: 'Silent Prudence & Inner Wisdom',
    meaningPt:
      'Sexto ramo terrestre (Sì), regente da manhã ascendente rumo ao zênite. Simboliza discernimento profundo, filosofia, intuição analítica, renovação e prudência ("prudentes como as serpentes", Mateus 10:16).',
    meaningEn:
      'Sixth earthly branch (Sì), ruler of the ascending morning toward zenith. Symbolizes deep discernment, philosophy, analytical intuition, renewal, and prudence ("wise as serpents", Matthew 10:16).',
    sacredCorrelationPt: 'Sabedoria e Cura · Constelação de Serpens / Ofiúco',
    sacredCorrelationEn: 'Wisdom & Healing · Constellation of Serpens / Ophiuchus',
  },
  {
    index: 7,
    id: 'HORSE',
    symbol: '🐎',
    branchHanzi: '午',
    branchPinyin: 'Wǔ',
    animalHanzi: '馬',
    namePt: 'Cavalo',
    nameEn: 'Horse',
    fixedElement: 'FIRE',
    polarity: 'YANG',
    shichenHours: '11:00 – 13:00',
    compassDegrees: 180,
    directionPt: 'Sul Exato (180°)',
    directionEn: 'Due South (180°)',
    trineGroupPt: '3º Trígono: Os Guardiões da Ação (Tigre · Cavalo · Cão)',
    trineGroupEn: '3rd Trine: The Chivalrous Protectors (Tiger · Horse · Dog)',
    alliesPt: 'Tigre, Cão & Cabra',
    alliesEn: 'Tiger, Dog & Goat',
    archetypePt: 'O Meio-Dia Solar (Zênite) & Espírito Livre',
    archetypeEn: 'The Solar Noon (Zenith) & Free Spirit',
    meaningPt:
      'Sétimo ramo terrestre (Wǔ), posicionado no Sul exato (180°) e no Meio-Dia Solar (11:00–13:00) no ápice da luz yang do solstício de verão. Simboliza vigor, liberdade, jornada missionária e eloquência.',
    meaningEn:
      'Seventh earthly branch (Wǔ), positioned due South (180°) at Solar Noon (11:00–13:00) at the zenith of summer yang light. Symbolizes vigor, freedom, purposeful journeying, and eloquence.',
    sacredCorrelationPt: '6ª Porta de Enoque (Solstício · Ápice de 12/18 Partes de Luz)',
    sacredCorrelationEn: 'Enoch Gate 6 (Solstice · Zenith of 12/18 Day Parts)',
  },
  {
    index: 8,
    id: 'GOAT',
    symbol: '🐐',
    branchHanzi: '未',
    branchPinyin: 'Wèi',
    animalHanzi: '羊',
    namePt: 'Cabra (Cordeiro / Ovelha)',
    nameEn: 'Goat (Sheep / Ram)',
    fixedElement: 'EARTH',
    polarity: 'YIN',
    shichenHours: '13:00 – 15:00',
    compassDegrees: 210,
    directionPt: 'Sul-Sudoeste (210°)',
    directionEn: 'South-Southwest (210°)',
    trineGroupPt: '4º Trígono: Os Pacificadores (Coelho · Cabra · Javali)',
    trineGroupEn: '4th Trine: The Peacemakers (Rabbit · Goat · Pig)',
    alliesPt: 'Coelho, Javali & Cavalo',
    alliesEn: 'Rabbit, Pig & Horse',
    archetypePt: 'O Rebanho da Paz & Harmonia Comunitária',
    archetypeEn: 'The Flock of Peace & Communal Harmony',
    meaningPt:
      'Oitavo ramo terrestre (Wèi — Yáng 羊, que em chinês significa tanto Ovelha/Cordeiro quanto Cabra). O ideograma 義 (Justiça/Retidão) é formado por 羊 (Cordeiro) sobre 我 (Eu). Simboliza mansidão, empatia, arte e devoção.',
    meaningEn:
      'Eighth earthly branch (Wèi — Yáng 羊, meaning Sheep/Lamb or Goat in Chinese). The character 義 (Righteousness) is composed of 羊 (Lamb) above 我 (Self). Symbolizes gentleness, empathy, art, and devotion.',
    sacredCorrelationPt: 'Paralelo Bíblico ao Cordeiro (Taleh — Mês I) e Capricórnio (Gedi)',
    sacredCorrelationEn: 'Biblical Parallel to the Lamb (Taleh — Month I) & Capricorn (Gedi)',
  },
  {
    index: 9,
    id: 'MONKEY',
    symbol: '🐒',
    branchHanzi: '申',
    branchPinyin: 'Shēn',
    animalHanzi: '猴',
    namePt: 'Macaco',
    nameEn: 'Monkey',
    fixedElement: 'METAL',
    polarity: 'YANG',
    shichenHours: '15:00 – 17:00',
    compassDegrees: 240,
    directionPt: 'Oeste-Sudoeste (240°)',
    directionEn: 'West-Southwest (240°)',
    trineGroupPt: '1º Trígono: Os Visionários (Rato · Dragão · Macaco)',
    trineGroupEn: '1st Trine: The Visionaries (Rat · Dragon · Monkey)',
    alliesPt: 'Rato, Dragão & Serpente',
    alliesEn: 'Rat, Dragon & Snake',
    archetypePt: 'O Engenheiro Ágil & Solucionador de Enigmas',
    archetypeEn: 'The Agile Inventor & Riddle Solver',
    meaningPt:
      'Nono ramo terrestre (Shēn), regente do meio da tarde (15:00–17:00, a Hora Nona bíblica). Simboliza versatilidade intelectual, curiosidade científica, destreza, humor e invenção.',
    meaningEn:
      'Ninth earthly branch (Shēn), ruler of mid-afternoon (15:00–17:00, the biblical Ninth Hour). Symbolizes intellectual versatility, scientific curiosity, dexterity, wit, and invention.',
    sacredCorrelationPt: 'Hora Nona do Dia (15:00) · Início doOutono Metálico',
    sacredCorrelationEn: 'Ninth Hour of the Day (15:00) · Start of Metal Autumn',
  },
  {
    index: 10,
    id: 'ROOSTER',
    symbol: '🐓',
    branchHanzi: '酉',
    branchPinyin: 'Yǒu',
    animalHanzi: '雞',
    namePt: 'Galo',
    nameEn: 'Rooster',
    fixedElement: 'METAL',
    polarity: 'YIN',
    shichenHours: '17:00 – 19:00',
    compassDegrees: 270,
    directionPt: 'Oeste Exato (270°)',
    directionEn: 'Due West (270°)',
    trineGroupPt: '2º Trígono: Os Perseverantes (Boi · Serpente · Galo)',
    trineGroupEn: '2nd Trine: The Industrious (Ox · Snake · Rooster)',
    alliesPt: 'Boi, Serpente & Dragão',
    alliesEn: 'Ox, Snake & Dragon',
    archetypePt: 'O Arauto do Tempo & Guardião do Pôr do Sol',
    archetypeEn: 'The Herald of Time & Guardian of Sunset',
    meaningPt:
      'Décimo ramo terrestre (Yǒu), posicionado no Oeste exato (270°) e na hora sagrada do pôr do sol (17:00–19:00, quando se inicia o novo dia bíblico e o Sábado). Simboliza pontualidade astronômica, franqueza, discernimento e vigilância ("deste ao galo entendimento?", Jó 38:36).',
    meaningEn:
      'Tenth earthly branch (Yǒu), positioned due West (270°) at the sacred hour of sunset (17:00–19:00, when the biblical day and Sabbath begin). Symbolizes astronomical punctuality, candor, discernment, and watchfulness ("who has given understanding to the rooster?", Job 38:36).',
    sacredCorrelationPt: 'Limiar do Pôr do Sol (Oeste 270°) · Equinócio do Outono (Mês VII)',
    sacredCorrelationEn: 'Sunset Threshold (West 270°) · Autumnal Equinox (Month VII)',
  },
  {
    index: 11,
    id: 'DOG',
    symbol: '🐕',
    branchHanzi: '戌',
    branchPinyin: 'Xū',
    animalHanzi: '狗',
    namePt: 'Cão',
    nameEn: 'Dog',
    fixedElement: 'EARTH',
    polarity: 'YANG',
    shichenHours: '19:00 – 21:00',
    compassDegrees: 300,
    directionPt: 'Oeste-Noroeste (300°)',
    directionEn: 'West-Northwest (300°)',
    trineGroupPt: '3º Trígono: Os Guardiões da Ação (Tigre · Cavalo · Cão)',
    trineGroupEn: '3rd Trine: The Chivalrous Protectors (Tiger · Horse · Dog)',
    alliesPt: 'Tigre, Cavalo & Coelho',
    alliesEn: 'Tiger, Horse & Rabbit',
    archetypePt: 'O Guardião Fiel da Aliança & Justiça',
    archetypeEn: 'The Faithful Guardian of Covenant & Justice',
    meaningPt:
      'Décimo primeiro ramo terrestre (Xū), regente da primeira vigília noturna após o crepúsculo (19:00–21:00). Simboliza lealdade incorruptível, proteção dos vulneráveis, senso de dever e integridade.',
    meaningEn:
      'Eleventh earthly branch (Xū), ruler of the first evening watch after dusk (19:00–21:00). Symbolizes incorruptible loyalty, protection of the vulnerable, duty, and integrity.',
    sacredCorrelationPt: 'Primeira Vigília da Noite · Guardião das Portas Ocidentais',
    sacredCorrelationEn: 'First Watch of the Night · Guardian of the Western Gates',
  },
  {
    index: 12,
    id: 'PIG',
    symbol: '🐗',
    branchHanzi: '亥',
    branchPinyin: 'Hài',
    animalHanzi: '豬',
    namePt: 'Javali (Porco)',
    nameEn: 'Boar (Pig)',
    fixedElement: 'WATER',
    polarity: 'YIN',
    shichenHours: '21:00 – 23:00',
    compassDegrees: 330,
    directionPt: 'Norte-Noroeste (330°)',
    directionEn: 'North-Northwest (330°)',
    trineGroupPt: '4º Trígono: Os Pacificadores (Coelho · Cabra · Javali)',
    trineGroupEn: '4th Trine: The Peacemakers (Rabbit · Goat · Pig)',
    alliesPt: 'Coelho, Cabra & Tigre',
    alliesEn: 'Rabbit, Goat & Tiger',
    archetypePt: 'A Abundância Generosa & Encerramento do Ciclo',
    archetypeEn: 'Generous Abundance & Completion of the Cycle',
    meaningPt:
      'Décimo segundo e último ramo terrestre (Hài), regente do repouso noturno (21:00–23:00) antes do renascimento da meia-noite. Simboliza generosidade, honestidade, hospitalidade, fartura e plenitude ao final da jornada.',
    meaningEn:
      'Twelfth and final earthly branch (Hài), ruler of night rest (21:00–23:00) prior to midnight rebirth. Symbolizes generosity, honesty, hospitality, abundance, and fullness at journey’s end.',
    sacredCorrelationPt: 'Fechamento do Ciclo Anual · Preparação para o Limiar do Dia Zero',
    sacredCorrelationEn: 'Completion of the Annual Cycle · Preparation for the Day Zero Threshold',
  },
];

/**
 * Computes the astronomical Chinese Lunar New Year date (YYYY-MM-DD) for a given Gregorian year.
 * By astronomical definition, Chinese New Year is the New Moon nearest to Lichun (~Feb 4),
 * falling between Jan 21 and Feb 20.
 */
export function getChineseLunarNewYearDate(gregorianYear: number): Date {
  let bestDate = new Date(Date.UTC(gregorianYear, 1, 4, 12, 0, 0));
  let bestPhaseDist = 999;

  // Scan daily from Jan 20 to Feb 20 to find the New Moon conjunction window
  for (let dayOffset = 0; dayOffset <= 31; dayOffset++) {
    const d = new Date(Date.UTC(gregorianYear, 0, 20 + dayOffset, 12, 0, 0));
    const illum = SunCalc.getMoonIllumination(d);
    const phaseDistFromNew = Math.min(illum.phase, 1 - illum.phase);
    if (phaseDistFromNew < bestPhaseDist) {
      bestPhaseDist = phaseDistFromNew;
      bestDate = d;
    }
  }

  // Refine hourly around bestDate (-18h to +18h)
  let refinedDate = bestDate;
  let refinedDist = bestPhaseDist;
  for (let h = -18; h <= 18; h += 2) {
    const candidate = new Date(bestDate.getTime() + h * 3600000);
    const illum = SunCalc.getMoonIllumination(candidate);
    const dist = Math.min(illum.phase, 1 - illum.phase);
    if (dist < refinedDist) {
      refinedDist = dist;
      refinedDate = candidate;
    }
  }

  return refinedDate;
}

function buildPillar(
  pillarType: GanzhiPillar['pillarType'],
  labelPt: string,
  labelEn: string,
  rolePt: string,
  roleEn: string,
  stemIndex0: number, // 0..9
  branchIndex0: number // 0..11
): GanzhiPillar {
  const safeStemIdx = ((stemIndex0 % 10) + 10) % 10;
  const safeBranchIdx = ((branchIndex0 % 12) + 12) % 12;
  const stem = TEN_HEAVENLY_STEMS[safeStemIdx];
  const animal = TWELVE_CHINESE_ZODIAC_ANIMALS[safeBranchIdx];
  const elementInfo = WU_XING_ELEMENTS[stem.element];

  // Compute 1..60 sexagenary index where (idx-1)%10 == safeStemIdx and (idx-1)%12 == safeBranchIdx
  let sexagenaryNumber = 1;
  for (let n = 1; n <= 60; n++) {
    if ((n - 1) % 10 === safeStemIdx && (n - 1) % 12 === safeBranchIdx) {
      sexagenaryNumber = n;
      break;
    }
  }

  const polPt = stem.polarity === 'YANG' ? 'Yang' : 'Yin';
  const polEn = stem.polarity === 'YANG' ? 'Yang' : 'Yin';

  return {
    pillarType,
    labelPt,
    labelEn,
    rolePt,
    roleEn,
    sexagenaryNumber,
    stem,
    animal,
    elementInfo,
    fullTitlePt: `${animal.namePt} de ${elementInfo.namePt} ${polPt} (${stem.hanzi}${animal.branchHanzi} · ${stem.pinyin}-${animal.branchPinyin})`,
    fullTitleEn: `${polEn} ${elementInfo.nameEn} ${animal.nameEn} (${stem.hanzi}${animal.branchHanzi} · ${stem.pinyin}-${animal.branchPinyin})`,
  };
}

/**
 * Calculates the complete Natal Chinese Zodiac & Four Pillars (BaZi) Chart
 * for a given Gregorian birth date (YYYY-MM-DD) and exact birth time (HH:MM).
 */
export function calculateNatalChineseZodiacChart(
  birthDateISO: string,
  birthTimeHHMM: string = '12:00'
): NatalChineseZodiacChart | null {
  const dateParts = birthDateISO.split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(Number.isNaN)) {
    return null;
  }
  const [year, month, day] = dateParts;

  const timeParts = (birthTimeHHMM || '12:00').split(':').map(Number);
  const hour = !Number.isNaN(timeParts[0]) ? Math.max(0, Math.min(23, timeParts[0])) : 12;
  const minute = !Number.isNaN(timeParts[1]) ? Math.max(0, Math.min(59, timeParts[1])) : 0;

  // 1. Determine Astronomical Lunar New Year for `year`
  const lnyDate = getChineseLunarNewYearDate(year);
  const lnyISO = lnyDate.toISOString().split('T')[0];
  const bornBeforeLunarNewYear = birthDateISO < lnyISO;
  const effectiveChineseYear = bornBeforeLunarNewYear ? year - 1 : year;

  // 2. Year Pillar (Epoch: 4 CE is Jia-Zi 甲子 — Yang Wood Rat, index 0)
  const yearOffset = effectiveChineseYear - 4;
  const yearStemIdx0 = ((yearOffset % 10) + 10) % 10;
  const yearBranchIdx0 = ((yearOffset % 12) + 12) % 12;

  const yearPillar = buildPillar(
    'YEAR',
    'I. Pilar do Ano (Signo Principal & Elemento Natal)',
    'I. Year Pillar (Primary Sign & Natal Element)',
    'Linhagem, Destino Anual & Arquétipo Social no Ciclo de Júpiter (12 Anos)',
    'Lineage, Annual Destiny & Social Archetype in the 12-Year Jovian Cycle',
    yearStemIdx0,
    yearBranchIdx0
  );

  // 3. Solar Month Pillar (12 Solar Terms starting with Tiger / Yin around Feb 4)
  // Approximate solar month branch index (0=Rat..11=Pig; Tiger=2 is 1st solar month around Feb)
  const dayOfYearApprox = (month - 1) * 30.4375 + day;
  const solarMonthNumber = Math.floor(((dayOfYearApprox - 35 + 365.25) % 365.25) / 30.4375); // 0..11 starting from Tiger
  const monthBranchIdx0 = (solarMonthNumber + 2) % 12;
  // Five-Tiger Month Stem Formula: ((yearStemIdx0 % 5) * 2 + 2 + solarMonthNumber) % 10
  const monthStemIdx0 = ((yearStemIdx0 % 5) * 2 + 2 + solarMonthNumber) % 10;

  const monthPillar = buildPillar(
    'MONTH',
    'II. Pilar do Mês Solar (Guardião da Estação)',
    'II. Solar Month Pillar (Seasonal Guardian)',
    'Clima Sazonal de Nascimento, Vocação & Força Operante',
    'Birth Seasonal Climate, Vocation & Operating Strength',
    monthStemIdx0,
    monthBranchIdx0
  );

  // 4. Day Pillar (Continuous 60-Day Sexagenary Cycle via Julian Day Number)
  const utcBirthNoon = Date.UTC(year, month - 1, day, 12, 0, 0);
  const jdn = Math.floor(utcBirthNoon / 86400000 + 2440588);
  const dayCycleOffset = ((jdn + 49) % 60 + 60) % 60;
  const dayStemIdx0 = dayCycleOffset % 10;
  const dayBranchIdx0 = dayCycleOffset % 12;

  const dayPillar = buildPillar(
    'DAY',
    'III. Pilar do Dia (Mestre do Dia / Essência Pessoal)',
    'III. Day Pillar (Day Master / Core Essence)',
    'Núcleo Interior, Caráter Íntimo & Harmonia Conjugal',
    'Inner Core, Intimate Character & Relational Harmony',
    dayStemIdx0,
    dayBranchIdx0
  );

  // 5. Birth Hour Pillar (Shichen 2-Hour Solar Watch — "Chinese Ascendant")
  // 23:00-00:59 -> 0 (Rat), 01:00-02:59 -> 1 (Ox), ..., 21:00-22:59 -> 11 (Pig)
  const hourBranchIdx0 = Math.floor(((hour + 1) % 24) / 2);
  // Five-Rat Hour Stem Formula: ((dayStemIdx0 % 5) * 2 + hourBranchIdx0) % 10
  const hourStemIdx0 = ((dayStemIdx0 % 5) * 2 + hourBranchIdx0) % 10;

  const hourPillar = buildPillar(
    'HOUR',
    'IV. Pilar da Hora Exata (Ascendente Oriental / Shichen)',
    'IV. Exact Hour Pillar (Eastern Ascendant / Shichen)',
    'Animal Secreto da Hora de Nascimento, Criatividade & Legado Futuro',
    'Secret Animal of the Birth Hour, Creativity & Future Legacy',
    hourStemIdx0,
    hourBranchIdx0
  );

  // 6. Element Balance across the 4 Pillars (4 Stems + 4 Branches = 8 Characters / BaZi)
  const elementBalance: Record<WuXingElementId, number> = {
    WOOD: 0,
    FIRE: 0,
    EARTH: 0,
    METAL: 0,
    WATER: 0,
  };
  [yearPillar, monthPillar, dayPillar, hourPillar].forEach((p) => {
    elementBalance[p.stem.element] += 1;
    elementBalance[p.animal.fixedElement] += 1;
  });

  // 7. Current Gregorian Year Pillar for comparison
  const nowYear = new Date().getFullYear();
  const curOffset = nowYear - 4;
  const currentYearPillar = buildPillar(
    'YEAR',
    'Ano Atual',
    'Current Year',
    'Regente do Ano Corrente',
    'Current Year Ruler',
    ((curOffset % 10) + 10) % 10,
    ((curOffset % 12) + 12) % 12
  );

  return {
    birthDateISO,
    birthTimeHHMM: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    gregorianBirthYear: year,
    chineseLunarYear: effectiveChineseYear,
    lunarNewYearDateISO: lnyISO,
    bornBeforeLunarNewYear,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    elementBalance,
    currentYearNumber: nowYear,
    currentYearPillar,
  };
}
