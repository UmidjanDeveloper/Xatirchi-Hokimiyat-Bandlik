import type { Household, HouseholdKesma, KesmaSababi, Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * ============================================================
 *  ХОНАДОН ТАРИХИ — «ЙИЛ БОШИДА ҚАНДАЙ ЭДИ, ҲОЗИР ҚАНДАЙ»
 *
 *  `Household` жадвалида фақат ОХИРГИ ҳолат туради. Хатлов
 *  қайта ўтказилса, эски рақамлар устидан ёзилиб кетади.
 *
 *  Шунинг учун ҳар якуний юборишда КЕСМА олинади — ўша
 *  пайтдаги ҳолат ўзгармас нусха бўлиб сақланади.
 *
 *  ── Нега бу камбағалликни ўлчаш учун шарт ──
 *
 *  Умумий рақам хатлов давом этар экан БАРИБИР ўсади: ҳар
 *  янги хонадон қўшилганда «аниқланган ишсиз» кўпаяди. Ундан
 *  «аҳвол ёмонлашди» деган хулоса чиқариб бўлмайди.
 *
 *  Тўғри савол битта оила ҳақида: «ЎША оила илгаригидан
 *  яхшироқ яшаяптими». Жавоб фақат икки кесмани таққослаш
 *  орқали чиқади.
 * ============================================================
 */

/** Кесмага олинадиган майдонлар — `Household` дан керакли қисми */
export type KesmaManbai = Pick<
  Household,
  | 'id'
  | 'mahallaId'
  | 'jamiAzo'
  | 'bolalarSoni'
  | 'mehnatgaLayoqatli'
  | 'ishlaydiganlar'
  | 'ishsizlarSoni'
  | 'oylikDaromad'
  | 'chetElOylikPulSom'
  | 'yirikShoxliSoni'
  | 'maydaShoxliSoni'
  | 'parrandaSoni'
  | 'tomorqaMaydoni'
  | 'gaz'
  | 'ichimlikSuvi'
  | 'uyHolati'
  | 'tadbirkorlikIstagi'
  | 'kasbHunarIstagi'
  | 'nogironShaxslar'
>;

// ─────────────────────────────────────────────────────────────
//  FAROVONLIK KO'RSATKICHI
// ─────────────────────────────────────────────────────────────

/**
 * Жон бошига энг кам даромад чегараси (сўмда).
 *
 * Расмий камбағаллик чегараси эмас — у Ҳукумат қарори билан
 * белгиланади ва ўзгариб туради. Бу фақат КЎРСАТКИЧ ҳисоблаш
 * учун мўлжал: шу қийматдан юқорисига тўлиқ балл берилади.
 *
 * Алоҳида турибди, чунки у ўзгарганда эски кесмалар қайта
 * ҳисобланмаслиги керак — улар ўз даврининг сурати.
 */
export const DAROMAD_MOLJALI = 1_200_000;

/**
 * Уй ҳолатига берилган балл — ёмондан яхшига.
 *
 * Калитлар `UY_HOLATI` каталогидан олинган. Каталогга янги
 * қиймат қўшилса, бу ерга ҳам қўшилиши керак — акс ҳолда у
 * танилмай қолади. `scripts/tarix-sinov.ts` шуни текширади.
 *
 * ── ЭСКИ қийматлар нега бу ерда ──
 *
 * Базада каталог ЎЗГАРМАСДАН олдин ёзилган қийматлар ҳам бор
 * ва улар оз эмас: 33 хонадоннинг 32 тасида шундай қиймат
 * учради («Avariya holatida», «Ta'mir talab» — каталогдаги
 * «Ta’mirtalab» дан фарқли апостроф ва бўш жой билан).
 *
 * Улар танилмаса, оила ЖИМГИНА нол балл оларди — ва бу
 * кўринмасди: балл барибир чиқади, фақат нотўғри. Шунинг
 * учун эски номлар ҳам шу ерда, ўз маъноси билан турибди.
 */
const UY_HOLATI_BALLI: Record<string, number> = {
  /* Каталогдаги қийматлар */
  Yaxshi: 10,
  "O'rtacha": 6,
  'Ta’mirtalab': 3,
  Yaroqsiz: 0,

  /* Базадаги эски ёзувлар — маъноси бўйича мосланган */
  "Ta'mir talab": 3,
  'Tamirtalab': 3,
  Qoniqarli: 6,
  'Avariya holatida': 0,
};

/**
 * Ичимлик суви манбаига берилган балл.
 *
 * Эски ёзувлар бу ерда ҳам бор — юқоридаги изоҳга қаранг.
 */
const SUV_BALLI: Record<string, number> = {
  /* Каталогдаги қийматлар */
  Markazlashgan: 10,
  Quduq: 5,
  "Yo'q": 0,

  /* Базадаги эски ёзувлар */
  'Markazlashgan quvur': 10,
  'Markazlashgan vodoprovod': 10,
  'Hovlidagi quduq': 5,
  'Umumiy koloka': 4,
  'Tashib keltiriladi': 0,
};

/**
 * Балл жадвалидан қиймат олади ва ТАНИЛМАГАНИНИ айтади.
 *
 * Нега «нол» деб ўтиб кетилмайди: танилмаган қиймат ҳам нол
 * балл олади, ҳақиқатан ёмон ҳолат ҳам нол олади — иккови
 * фарқланмай қоларди. Ходим эса «нега бу оила паст?» деб
 * сўраганда жавоб топа олмасди.
 */
function ballOl(
  jadval: Record<string, number>,
  qiymat: string | null
): { ball: number; tanildi: boolean } {
  if (!qiymat) return { ball: 0, tanildi: true };
  const b = jadval[qiymat];
  return b === undefined ? { ball: 0, tanildi: false } : { ball: b, tanildi: true };
}

/** Кўрсаткичнинг бир бўлаги — ҳисоботда ҳам шу тартибда кўринади */
export interface BallBolagi {
  nomi: string;
  /** Шу бўлакдан олинган балл */
  ball: number;
  /** Шу бўлакнинг энг юқори баллы */
  eng: number;
  /** Нимадан ҳисобланди — фойдаланувчига тушунтириш учун */
  izoh: string;
}

/**
 * ФАРОВОНЛИК КЎРСАТКИЧИ (0–100).
 *
 *  ⚠ Бу РАСМИЙ камбағаллик мезони ЭМАС.
 *
 *  У иккита нарса учун ишлатилмайди:
 *    - оилаларни бир-бири билан таққослаш («фалончи 40, писмадончи 60»)
 *    - расмий нафақа ёки имтиёз тайинлаш
 *
 *  Фақат БИТТА нарса учун: ўша хонадонни ЎЗИ билан вақт кесимида
 *  таққослаш. «Шу оилада аҳвол яхшиландими» деган саволга сон
 *  билан жавоб беради, «40 дан 58 га чиқди» тарзида.
 *
 *  ── Нега формула очиқ ──
 *
 *  Ҳисоб усули шу ерда ёзилган ва ҳисоботда ҳам чиқади. Ёпиқ
 *  формулага ҳеч ким ишонмайди: ҳоким «нега 40?» деб сўраса,
 *  жавоб бўлиши керак. Шунинг учун функция битта сон эмас,
 *  БЎЛАКЛАРНИ ҳам қайтаради.
 *
 *  ── Оғирликлар нега шундай ──
 *
 *  Бандлик (35) — доимий иш даромаддан муҳимроқ: бир мартагина
 *  берилган пул эмас, БАРҚАРОР манба. Даромад (30) — иккинчи
 *  ўринда. Хўжалик (15) — чорва ва томорқа қўшимча манба ва
 *  оғир кунда захира. Шароит (20) — газ, сув, уй ҳолати
 *  оиланинг кундалик ҳаётини белгилайди.
 */
export function farovonlikHisobi(x: KesmaManbai): {
  ball: number;
  bolaklar: BallBolagi[];
} {
  const bolaklar: BallBolagi[] = [];

  /* ── 1. Bandlik: 35 ── */
  const layoqatli = x.mehnatgaLayoqatli;
  const bandlikUlushi = layoqatli > 0 ? x.ishlaydiganlar / layoqatli : 0;
  bolaklar.push({
    nomi: 'Бандлик',
    ball: Math.round(bandlikUlushi * 35),
    eng: 35,
    izoh:
      layoqatli > 0
        ? `меҳнатга лаёқатли ${layoqatli} кишидан ${x.ishlaydiganlar} таси ишлайди`
        : 'меҳнатга лаёқатли аъзо йўқ',
  });

  /* ── 2. Daromad: 30 ── */
  const jami = Number(x.oylikDaromad ?? 0) + Number(x.chetElOylikPulSom ?? 0);
  const jonBoshiga = x.jamiAzo > 0 ? jami / x.jamiAzo : 0;
  /*
   * Чегарадан юқориси ҚЎШИМЧА балл бермайди. Сабаби: кўрсаткич
   * камбағалликдан чиқишни ўлчайди, бойликни эмас. Даромади
   * чегарадан икки баравар юқори оила ҳам, уч баравар юқориси
   * ҳам бир хил — иккови ҳам камбағал эмас.
   */
  const daromadUlushi = Math.min(jonBoshiga / DAROMAD_MOLJALI, 1);
  bolaklar.push({
    nomi: 'Даромад',
    ball: Math.round(daromadUlushi * 30),
    eng: 30,
    izoh: `жон бошига ойига ${Math.round(jonBoshiga).toLocaleString('ru-RU')} сўм`,
  });

  /* ── 3. Xo'jalik: 15 ── */
  const yirik = x.yirikShoxliSoni ?? 0;
  const mayda = x.maydaShoxliSoni ?? 0;
  const parranda = x.parrandaSoni ?? 0;
  const tomorqa = x.tomorqaMaydoni ?? 0;
  /*
   * Оғирликлар хўжалик қиймати бўйича: битта қорамол тахминан
   * беш қўйга, у эса йигирма товуққа тенг. Мутлақ рақам эмас,
   * НИСБАТ муҳим — шунинг учун тахминий баҳо етарли.
   */
  const xojalikXom = yirik * 5 + mayda * 1 + parranda * 0.05 + tomorqa * 2;
  const xojalikUlushi = Math.min(xojalikXom / 20, 1);
  bolaklar.push({
    nomi: 'Хўжалик',
    ball: Math.round(xojalikUlushi * 15),
    eng: 15,
    izoh:
      xojalikXom > 0
        ? `${yirik} йирик, ${mayda} майда шохли, ${parranda} парранда, ${tomorqa} сотих томорқа`
        : 'чорва ва томорқа йўқ',
  });

  /* ── 4. Yashash sharoiti: 20 ── */
  const gazBall = x.gaz ? 5 : 0;
  const suv = ballOl(SUV_BALLI, x.ichimlikSuvi);
  const uy = ballOl(UY_HOLATI_BALLI, x.uyHolati);
  /* 5 + 10 + 10 = 25 xom, 20 ga keltiriladi */
  const sharoitBall = Math.round(((gazBall + suv.ball + uy.ball) / 25) * 20);

  const sharoitIzohi = [
    x.gaz ? 'газ бор' : 'газ йўқ',
    x.ichimlikSuvi
      ? `сув: ${x.ichimlikSuvi}${suv.tanildi ? '' : ' (каталогда йўқ)'}`
      : 'сув манбаи кўрсатилмаган',
    x.uyHolati
      ? `уй: ${x.uyHolati}${uy.tanildi ? '' : ' (каталогда йўқ)'}`
      : 'уй ҳолати кўрсатилмаган',
  ].join(' · ');

  bolaklar.push({
    nomi: 'Яшаш шароити',
    ball: sharoitBall,
    eng: 20,
    izoh: sharoitIzohi,
  });

  const ball = bolaklar.reduce((s, b) => s + b.ball, 0);
  return { ball: Math.max(0, Math.min(100, ball)), bolaklar };
}

// ─────────────────────────────────────────────────────────────
//  KESMA OLISH
// ─────────────────────────────────────────────────────────────

/** Nogironligi bo'lgan shaxslar sonini JSON ro'yxatdan sanaydi */
function nogironSoni(xom: Prisma.JsonValue | null): number {
  return Array.isArray(xom) ? xom.length : 0;
}

/**
 * Хонадоннинг ҳозирги ҳолатидан кесма ясайди.
 *
 * Базага ёзмайди — фақат маълумотни тайёрлайди. Ёзиш
 * `kesmaSaqla` да, чунки у транзакция ичида чақирилиши керак.
 */
export function kesmaYasa(
  x: KesmaManbai,
  toliq: unknown,
  sababi: KesmaSababi
): Prisma.HouseholdKesmaUncheckedCreateInput {
  const jami = Number(x.oylikDaromad ?? 0) + Number(x.chetElOylikPulSom ?? 0);

  return {
    householdId: x.id,
    mahallaId: x.mahallaId,
    sababi,

    jamiAzo: x.jamiAzo,
    bolalarSoni: x.bolalarSoni,

    mehnatgaLayoqatli: x.mehnatgaLayoqatli,
    ishlaydiganlar: x.ishlaydiganlar,
    ishsizlarSoni: x.ishsizlarSoni,

    oylikDaromad: x.oylikDaromad,
    /*
     * Жон бошига даромад АЛОҲИДА сақланади, кейин ҳисоблаб
     * бўлмайди: оила аъзолари сони ҳам ўзгаради, ва кейинги
     * кесмадаги сон билан бўлинса, нотўғри чиқади.
     */
    jonBoshigaDaromad: x.jamiAzo > 0 ? BigInt(Math.round(jami / x.jamiAzo)) : null,
    chetElOylikPulSom: x.chetElOylikPulSom,

    yirikShoxliSoni: x.yirikShoxliSoni,
    maydaShoxliSoni: x.maydaShoxliSoni,
    parrandaSoni: x.parrandaSoni,
    tomorqaMaydoni: x.tomorqaMaydoni,

    gaz: x.gaz,
    ichimlikSuvi: x.ichimlikSuvi,
    uyHolati: x.uyHolati,

    tadbirkorlikIstagi: x.tadbirkorlikIstagi,
    kasbHunarIstagi: x.kasbHunarIstagi,

    nogironSoni: nogironSoni(x.nogironShaxslar),
    farovonlikBali: farovonlikHisobi(x).ball,
    toliq: toliq as Prisma.InputJsonValue,
  };
}

/**
 * Кесмани сақлайди.
 *
 * `tx` — транзакция. Кесма хонадон билан БИР вақтда ёзилиши
 * керак: иккови алоҳида бўлса, хонадон сақланиб, кесма
 * сақланмай қолиши мумкин — ва тарихда тешик пайдо бўларди.
 */
export async function kesmaSaqla(
  tx: Prisma.TransactionClient,
  x: KesmaManbai,
  toliq: unknown,
  sababi?: KesmaSababi
): Promise<void> {
  const oldingiSoni = await tx.householdKesma.count({ where: { householdId: x.id } });
  await tx.householdKesma.create({
    data: kesmaYasa(x, toliq, sababi ?? (oldingiSoni === 0 ? 'ILK_XATLOV' : 'QAYTA_XATLOV')),
  });
}

// ─────────────────────────────────────────────────────────────
//  TAQQOSLASH
// ─────────────────────────────────────────────────────────────

/** Bitta ko'rsatkichning ikki kesma orasidagi o'zgarishi */
export interface Ozgarish {
  nomi: string;
  /** O'lchov birligi - «киши», «сўм», «бош» */
  birlik: string;
  avval: number;
  hozir: number;
  farq: number;
  /**
   * Ko'payishi YAXSHIMI.
   *
   * Kerak, chunki «ishsizlar soni» ko'paysa yomon, «ishlaydiganlar»
   * ko'paysa yaxshi - va rang shunga qarab tanlanadi. Bunisiz
   * ishsizlar sonining o'sishi yashil bo'lib chiqardi.
   */
  kopYaxshi: boolean;
}

/** Ikki kesmani taqqoslaydi. `avval` eskisi, `hozir` yangisi. */
export function taqqosla(avval: HouseholdKesma, hozir: HouseholdKesma): Ozgarish[] {
  const son = (a: number | null, h: number | null, nomi: string, birlik: string, kopYaxshi: boolean): Ozgarish => ({
    nomi,
    birlik,
    avval: a ?? 0,
    hozir: h ?? 0,
    farq: (h ?? 0) - (a ?? 0),
    kopYaxshi,
  });

  return [
    son(avval.farovonlikBali, hozir.farovonlikBali, 'Фаровонлик кўрсаткичи', 'балл', true),
    son(avval.ishlaydiganlar, hozir.ishlaydiganlar, 'Ишлаётганлар', 'киши', true),
    son(avval.ishsizlarSoni, hozir.ishsizlarSoni, 'Ишсизлар', 'киши', false),
    son(
      Number(avval.jonBoshigaDaromad ?? 0),
      Number(hozir.jonBoshigaDaromad ?? 0),
      'Жон бошига даромад',
      'сўм',
      true
    ),
    son(Number(avval.oylikDaromad ?? 0), Number(hozir.oylikDaromad ?? 0), 'Оилавий даромад', 'сўм', true),
    son(avval.jamiAzo, hozir.jamiAzo, 'Оила аъзолари', 'киши', true),
    son(avval.yirikShoxliSoni, hozir.yirikShoxliSoni, 'Йирик шохли чорва', 'бош', true),
    son(avval.maydaShoxliSoni, hozir.maydaShoxliSoni, 'Майда шохли чорва', 'бош', true),
    son(avval.parrandaSoni, hozir.parrandaSoni, 'Парранда', 'бош', true),
  ].filter((o) => o.farq !== 0 || o.nomi === 'Фаровонлик кўрсаткичи');
}

/** Bitta xonadonning butun tarixi - eskisidan yangisiga */
export async function xonadonTarixi(householdId: string): Promise<HouseholdKesma[]> {
  return prisma.householdKesma.findMany({
    where: { householdId },
    orderBy: { olinganSana: 'asc' },
  });
}
