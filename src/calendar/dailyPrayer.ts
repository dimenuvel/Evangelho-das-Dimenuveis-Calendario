/**
 * @file src/calendar/dailyPrayer.ts
 * Deterministic Scripture-based Daily Prayer & Reflection engine
 * anchored in the current day's exact position in the 13-Month × 28-Day Sacred Calendar.
 */

import { CalendarDay } from '../types/calendar';
import { Language } from '../i18n/translations';
import { getMonthDisplayTitle } from './months';

export interface DailyPrayerEntry {
  positionLabel: string;
  monthTheme: string;
  title: string;
  scriptureRef: string;
  scriptureQuote: string;
  reflection: string;
  prayer: string;
}

interface MonthSpiritualTheme {
  themePt: string;
  themeEn: string;
  focusPt: string;
  focusEn: string;
}

const MONTH_THEMES: Record<number, MonthSpiritualTheme> = {
  1: {
    themePt: 'Redenção e Princípio dos Meses',
    themeEn: 'Redemption & Beginning of Months',
    focusPt: 'a libertação Pascal e o caminhar em novidade de vida',
    focusEn: 'Passover deliverance and walking in newness of life',
  },
  2: {
    themePt: 'Provisão e Confiança no Deserto',
    themeEn: 'Provision & Trust in the Wilderness',
    focusPt: 'o sustento diário do céu e a fidelidade na caminhada',
    focusEn: 'daily sustenance from heaven and faithfulness on the journey',
  },
  3: {
    themePt: 'Aliança e Primícias do Espírito',
    themeEn: 'Covenant & Firstfruits of the Spirit',
    focusPt: 'a lei gravada no coração e a colheita das primícias',
    focusEn: 'the law written on the heart and the harvest of firstfruits',
  },
  4: {
    themePt: 'Luz e Vigilância no Meio do Ano',
    themeEn: 'Light & Watchfulness in the Mid-Year',
    focusPt: 'a firmeza da luz divina que governa as estações',
    focusEn: 'the steadfastness of divine light governing the seasons',
  },
  5: {
    themePt: 'Consolação e Restauração do Santuário',
    themeEn: 'Consolation & Restoration of the Sanctuary',
    focusPt: 'o consolo profético e a reedificação interior',
    focusEn: 'prophetic comfort and inward rebuilding',
  },
  6: {
    themePt: 'Preparação e Exame do Coração',
    themeEn: 'Preparation & Searching of the Heart',
    focusPt: 'a purificação e o preparo antes das solenidades do sétimo mês',
    focusEn: 'purification and readiness before the solemnities of the seventh month',
  },
  7: {
    themePt: 'Aclamação, Expiação e Tabernáculos',
    themeEn: 'Acclamation, Atonement & Tabernacles',
    focusPt: 'o despertar das trombetas, a reconciliação plena e a habitação divina',
    focusEn: 'the awakening of trumpets, full reconciliation, and divine dwelling',
  },
  8: {
    themePt: 'Perseverança e Raízes Profundas',
    themeEn: 'Perseverance & Deepening Roots',
    focusPt: 'a árvore plantada junto às correntes de águas que não teme o calor',
    focusEn: 'the tree planted by streams of water that does not fear the heat',
  },
  9: {
    themePt: 'Dedicação e Lâmpada Acesa',
    themeEn: 'Dedication & Shining Lamp',
    focusPt: 'a consagração do templo interior e a luz que brilha na escuridão',
    focusEn: 'consecration of the inward temple and light shining in darkness',
  },
  10: {
    themePt: 'Ordem Soberana e Esperança Firme',
    themeEn: 'Sovereign Order & Steadfast Hope',
    focusPt: 'os montes que se revelam após o dilúvio e a fidelidade da aliança',
    focusEn: 'the mountaintops revealed after the flood and covenant faithfulness',
  },
  11: {
    themePt: 'Meditação na Palavra e Renovação',
    themeEn: 'Meditation on the Word & Renewal',
    focusPt: 'a instrução da sabedoria eterna que ilumina cada passo',
    focusEn: 'the instruction of eternal wisdom illuminating every step',
  },
  12: {
    themePt: 'Livramento e Providência',
    themeEn: 'Deliverance & Providence',
    focusPt: 'o socorro que vem do Criador dos céus e da terra',
    focusEn: 'the help that comes from the Maker of heaven and earth',
  },
  13: {
    themePt: 'Plenitude do Ciclo de 364 Dias',
    themeEn: 'Fulfillment of the 364-Day Cycle',
    focusPt: 'a consumação harmoniosa das 52 semanas e a expectativa do novo limiar',
    focusEn: 'the harmonious completion of the 52 weeks and readiness for the new threshold',
  },
};

interface WeekdayDevotional {
  titlePt: string;
  titleEn: string;
  refPt: string;
  refEn: string;
  quotePt: string;
  quoteEn: string;
  reflectionPt: (monthFocus: string, dayOfMonth: number, weekOfMonth: number) => string;
  reflectionEn: (monthFocus: string, dayOfMonth: number, weekOfMonth: number) => string;
  prayerPt: (monthTheme: string) => string;
  prayerEn: (monthTheme: string) => string;
}

const WEEKDAY_DEVOTIONALS: Record<number, WeekdayDevotional> = {
  1: {
    titlePt: 'Luz Primordial e Princípio da Semana',
    titleEn: 'Primordial Light & Beginning of the Week',
    refPt: 'Gênesis 1:3 · Salmos 118:24',
    refEn: 'Genesis 1:3 · Psalm 118:24',
    quotePt: '“Disse Deus: Haja luz; e houve luz... Este é o dia que fez o Senhor; regozijemo-nos e alegremo-nos nele.”',
    quoteEn: '“And God said, Let there be light: and there was light... This is the day which the Lord hath made; we will rejoice and be glad in it.”',
    reflectionPt: (focus, dom, wom) =>
      `No 1º dia da ${wom}ª semana deste mês (Dia ${dom} de 28), o ciclo criacional renova-se com o chamado à luz. Enquanto meditamos sobre ${focus}, somos convidados a separar a luz da verdade de toda confusão.`,
    reflectionEn: (focus, dom, wom) =>
      `On the 1st day of the ${wom}th week of this month (Day ${dom} of 28), the creational cycle renews with the call to light. As we meditate on ${focus}, we are invited to walk in the clarity of truth.`,
    prayerPt: (theme) =>
      `Senhor da Luz Eterna, neste primeiro dia da semana sagrada, sob o tema de ${theme}, ilumina nosso entendimento e guia nossas obras em retidão e paz. Amém.`,
    prayerEn: (theme) =>
      `Lord of Eternal Light, on this first day of the sacred week, under the theme of ${theme}, illuminate our understanding and guide our works in righteousness and peace. Amen.`,
  },
  2: {
    titlePt: 'Discernimento e Ordem Celeste',
    titleEn: 'Discernment & Celestial Order',
    refPt: 'Gênesis 1:6–8 · Salmos 33:6',
    refEn: 'Genesis 1:6–8 · Psalm 33:6',
    quotePt: '“Pela palavra do Senhor foram feitos os céus, e todo o exército deles pelo espírito da sua boca.”',
    quoteEn: '“By the word of the Lord were the heavens made; and all the host of them by the breath of his mouth.”',
    reflectionPt: (focus, dom, wom) =>
      `No 2º dia da semana (Dia ${dom} de 28 · ${wom}ª semana), contemplamos a expansão dos céus e a ordem perfeita estabelecida pelo Criador. Em harmonia com ${focus}, aprendemos a colocar cada prioridade no seu devido lugar.`,
    reflectionEn: (focus, dom, wom) =>
      `On the 2nd day of the week (Day ${dom} of 28 · Week ${wom}), we contemplate the firmament and the order established by the Creator. In harmony with ${focus}, we learn to set every priority in its rightful place.`,
    prayerPt: (theme) =>
      `Criador dos Céus, concede-nos hoje sabedoria e discernimento espiritual para viver ${theme} com serenidade, guardando Teus mandamentos a cada hora. Amém.`,
    prayerEn: (theme) =>
      `Creator of the Heavens, grant us wisdom and spiritual discernment today to live out ${theme} with serenity, keeping Your precepts at every hour. Amen.`,
  },
  3: {
    titlePt: 'Semente Viva e Frutificação',
    titleEn: 'Living Seed & Fruitfulness',
    refPt: 'Gênesis 1:11–12 · Salmos 1:2–3',
    refEn: 'Genesis 1:11–12 · Psalm 1:2–3',
    quotePt: '“Pois será como a árvore plantada junto a ribeiros de águas, a qual dá o seu fruto na estação própria, e cujas folhas não caem.”',
    quoteEn: '“And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither.”',
    reflectionPt: (focus, dom, wom) =>
      `O 3º dia da semana (Dia ${dom} de 28 · ${wom}ª semana) celebra a terra firme e a semente que frutifica segundo a sua espécie. Ao vivenciarmos ${focus}, que nossa vida produza frutos de justiça no tempo determinado.`,
    reflectionEn: (focus, dom, wom) =>
      `The 3rd day of the week (Day ${dom} of 28 · Week ${wom}) celebrates dry ground and seed bearing fruit after its kind. As we walk in ${focus}, may our lives yield fruits of righteousness in due season.`,
    prayerPt: (theme) =>
      `Deus da Colheita Viva, firma nossos passos na Tua Rocha e faze florescer em nós a semente de ${theme}, para que toda obra deste dia glorifique o Teu Nome. Amém.`,
    prayerEn: (theme) =>
      `God of the Living Harvest, establish our steps upon Your Rock and cause the seed of ${theme} to flourish within us, that every work of this day may glorify Your Name. Amen.`,
  },
  4: {
    titlePt: 'Os Luminares e os Tempos Determinados',
    titleEn: 'The Luminaries & Appointed Times',
    refPt: 'Gênesis 1:14 · Salmos 104:19',
    refEn: 'Genesis 1:14 · Psalm 104:19',
    quotePt: '“Haja luminares na expansão dos céus, para haver separação entre o dia e a noite; e sejam eles para sinais e para tempos determinados, e para dias e anos.”',
    quoteEn: '“Let there be lights in the firmament of the heaven to divide the day from the night; and let them be for signs, and for seasons, and for days, and years.”',
    reflectionPt: (focus, dom, wom) =>
      `No centro da semana (4º dia · Dia ${dom} de 28, ${wom}ª semana), lembramos a criação dos luminares como relógio fiel dos tempos sagrados (Moedim). Esta posição central convida-nos a alinhar o coração com ${focus}.`,
    reflectionEn: (focus, dom, wom) =>
      `At the center of the week (4th day · Day ${dom} of 28, Week ${wom}), we remember the creation of the luminaries as the faithful clock of the appointed times (Moedim). This midpoint calls us to align our hearts with ${focus}.`,
    prayerPt: (theme) =>
      `Senhor dos Luminares e das Estações, ensina-nos a contar os nossos dias segundo a Tua ordem celeste e a caminhar fielmente em ${theme}. Amém.`,
    prayerEn: (theme) =>
      `Lord of the Luminaries and Seasons, teach us to number our days according to Your celestial order and to walk faithfully in ${theme}. Amen.`,
  },
  5: {
    titlePt: 'Águas Vivas e Abundância da Graça',
    titleEn: 'Living Waters & Abundance of Grace',
    refPt: 'Gênesis 1:20–22 · Salmos 36:8–9',
    refEn: 'Genesis 1:20–22 · Psalm 36:8–9',
    quotePt: '“Porque em ti está o manancial da vida; na tua luz veremos a luz.”',
    quoteEn: '“For with thee is the fountain of life: in thy light shall we see light.”',
    reflectionPt: (focus, dom, wom) =>
      `No 5º dia da semana (Dia ${dom} de 28 · ${wom}ª semana), a criação transborda de vida nas águas e nos céus. Sob o propósito de ${focus}, renovamos nossa força na fonte inesgotável da graça divina.`,
    reflectionEn: (focus, dom, wom) =>
      `On the 5th day of the week (Day ${dom} of 28 · Week ${wom}), creation overflows with life across the waters and skies. Under the purpose of ${focus}, we renew our strength at the unfailing fountain of divine grace.`,
    prayerPt: (theme) =>
      `Fonte da Vida, derrama sobre nossa casa a Tua bênção abundante neste quinto dia e conduz-nos na plenitude de ${theme}. Amém.`,
    prayerEn: (theme) =>
      `Fountain of Life, pour out Your abundant blessing upon our household on this fifth day and lead us in the fullness of ${theme}. Amen.`,
  },
  6: {
    titlePt: 'Imagem Divina e Preparação para o Sábado',
    titleEn: 'Divine Image & Preparation for the Sabbath',
    refPt: 'Gênesis 1:27, 31 · Êxodo 16:22–23',
    refEn: 'Genesis 1:27, 31 · Exodus 16:22–23',
    quotePt: '“E viu Deus tudo quanto tinha feito, e eis que era muito bom... Amanhã é o repouso, o santo sábado do Senhor.”',
    quoteEn: '“And God saw every thing that he had made, and, behold, it was very good... To morrow is the rest of the holy sabbath unto the Lord.”',
    reflectionPt: (focus, dom, wom) =>
      `No 6º dia da semana (Dia ${dom} de 28 · Véspera do ${wom}º Sábado do mês), concluímos o trabalho das nossas mãos e preparamos o espírito para o repouso sagrado ao pôr do sol, meditando em ${focus}.`,
    reflectionEn: (focus, dom, wom) =>
      `On the 6th day of the week (Day ${dom} of 28 · Eve of the ${wom}th Sabbath of the month), we complete the work of our hands and prepare our spirit for sacred rest at sunset, meditating on ${focus}.`,
    prayerPt: (theme) =>
      `Pai Santo, que formaste o ser humano à Tua imagem, abençoa a conclusão dos nossos labores desta semana em ${theme} e prepara nosso coração para a paz do Teu Sábado. Amém.`,
    prayerEn: (theme) =>
      `Holy Father, who formed humanity in Your image, bless the completion of our labors this week in ${theme} and prepare our hearts for the peace of Your Sabbath. Amen.`,
  },
  7: {
    titlePt: 'O Santo Sábado: Repouso, Santificação e Aliança',
    titleEn: 'The Holy Sabbath: Rest, Sanctification & Covenant',
    refPt: 'Gênesis 2:2–3 · Isaías 58:13–14',
    refEn: 'Genesis 2:2–3 · Isaiah 58:13–14',
    quotePt: '“E abençoou Deus o dia sétimo, e o santificou; porque nele descansou de toda a sua obra, que Deus criara e fizera.”',
    quoteEn: '“And God blessed the seventh day, and sanctified it: because that in it he had rested from all his work which God created and made.”',
    reflectionPt: (focus, dom, wom) =>
      `Hoje é o ${wom}º Sábado deste mês (Dia ${dom} de 28), coroa perpétua da semana de sete dias. Cessamos as inquietações terrenas para celebrar ${focus} na comunhão do santuário do tempo.`,
    reflectionEn: (focus, dom, wom) =>
      `Today is the ${wom}th Sabbath of this month (Day ${dom} of 28), the perpetual crown of the seven-day week. We cease from earthly anxieties to celebrate ${focus} in the sanctuary of time.`,
    prayerPt: (theme) =>
      `Senhor do Sábado, agradecemos pelo dom deste santo repouso no Dia ${theme}. Renova nossa alma na Tua presença e sela em nós a paz eterna do Teu Reino. Amém.`,
    prayerEn: (theme) =>
      `Lord of the Sabbath, we thank You for the gift of this holy rest on the day of ${theme}. Renew our souls in Your presence and seal within us the eternal peace of Your Kingdom. Amen.`,
  },
};

export function getDailyPrayerForSacredDay(
  day: CalendarDay,
  customMonthNames: string[],
  language: Language = 'pt'
): DailyPrayerEntry {
  const isPt = language === 'pt';

  if (day.kind === 'DAY_ZERO') {
    return {
      positionLabel: isPt
        ? `Dia Zero · Limiar do Ano Sagrado ${day.calendarYear}`
        : `Day Zero · Threshold of Sacred Year ${day.calendarYear}`,
      monthTheme: isPt ? 'Renovação Anual da Aliança' : 'Annual Renewal of the Covenant',
      title: isPt
        ? 'Oração do Dia Zero: O Limiar Sagrado do Novo Ano'
        : 'Prayer for Day Zero: The Sacred Threshold of the New Year',
      scriptureRef: isPt ? 'Salmos 90:12 · Êxodo 12:2' : 'Psalm 90:12 · Exodus 12:2',
      scriptureQuote: isPt
        ? '“Ensina-nos a contar os nossos dias, de tal maneira que alcancemos corações sábios.”'
        : '“So teach us to number our days, that we may apply our hearts unto wisdom.”',
      reflection: isPt
        ? 'Situado fora dos 364 dias numerados como Sábado Anual de abertura, o Dia Zero é um santuário de silêncio, gratidão e consagração antes do início dos 13 meses de 28 dias.'
        : 'Standing outside the 364 numbered days as the opening Annual Sabbath, Day Zero is a sanctuary of stillness, gratitude, and consecration before the 13 months of 28 days begin.',
      prayer: isPt
        ? 'Eterno Criador dos Tempos, no limiar deste novo Ano Sagrado, consagramos a Ti todas as 52 semanas que se abrem diante de nós. Concede-nos sabedoria, fidelidade e paz em cada estação. Amém.'
        : 'Eternal Creator of Times, at the threshold of this new Sacred Year, we consecrate to You all 52 weeks opening before us. Grant us wisdom, faithfulness, and peace in every season. Amen.',
    };
  }

  const monthNum = day.month;
  const dayOfMonth = day.dayOfMonth;
  const dayOfWeek = day.dayOfWeek;
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
  const monthTitle = getMonthDisplayTitle(monthNum, customMonthNames, language);

  const monthThemeObj = MONTH_THEMES[monthNum] || MONTH_THEMES[1];
  const weekdayObj = WEEKDAY_DEVOTIONALS[dayOfWeek] || WEEKDAY_DEVOTIONALS[1];

  const monthTheme = isPt ? monthThemeObj.themePt : monthThemeObj.themeEn;
  const monthFocus = isPt ? monthThemeObj.focusPt : monthThemeObj.focusEn;

  const positionLabel = isPt
    ? `${monthTitle}, Dia ${dayOfMonth} · ${weekOfMonth}ª Semana do Mês · Dia ${day.dayOfYear}/364`
    : `${monthTitle}, Day ${dayOfMonth} · Week ${weekOfMonth} of Month · Day ${day.dayOfYear}/364`;

  return {
    positionLabel,
    monthTheme,
    title: isPt ? weekdayObj.titlePt : weekdayObj.titleEn,
    scriptureRef: isPt ? weekdayObj.refPt : weekdayObj.refEn,
    scriptureQuote: isPt ? weekdayObj.quotePt : weekdayObj.quoteEn,
    reflection: isPt
      ? weekdayObj.reflectionPt(monthFocus, dayOfMonth, weekOfMonth)
      : weekdayObj.reflectionEn(monthFocus, dayOfMonth, weekOfMonth),
    prayer: isPt ? weekdayObj.prayerPt(monthTheme) : weekdayObj.prayerEn(monthTheme),
  };
}
