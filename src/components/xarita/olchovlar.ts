import type { XaritaQatori } from '@/lib/xarita/xarita-malumoti';

/**
 * ============================================================
 *  ХАРИТА ЎЛЧОВЛАРИ
 *
 *  Харитада битта ҳудуд БИР ВАҚТНИНГ ЎЗИДА иккита нарсани
 *  кўрсатади: РАНГ — аҳвол қандайлигини, БАЛАНДЛИК — ҳажм
 *  қанчалигини.
 *
 *  Нега иккови: «қамров 100%» деган маҳалла 12 та хонадонлик
 *  ҳам, 900 та хонадонлик ҳам бўлиши мумкин. Фақат ранг
 *  бўлса, иккови бир хил кўринади ва ҳоким кичкина маҳаллани
 *  катта ютуқ деб ўқийди. Баландлик шу хатони йўқотади.
 *
 *  Бу файлда база йўқ — уни браузердаги компонент ҳам, сервер
 *  ҳам ўқийди.
 * ============================================================
 */

export type OlchovKaliti =
  | 'bazaIshsiz'
  | 'aholi'
  | 'qamrov'
  | 'natija'
  | 'ishsiz'
  | 'bolalar'
  | 'chetEl';

export interface Olchov {
  kalit: OlchovKaliti;
  nomi: string;
  izoh: string;
  /** Ранг ва легенда учун қиймат: фоиз (0-100) ёки нол */
  foiz: (q: XaritaQatori) => number | null;
  /** Баландлик учун хом ҳажм — энг каттасига нисбатан ўлчанади */
  hajm: (q: XaritaQatori) => number;
  /** Тултипдаги асосий сатр */
  matn: (q: XaritaQatori) => string;
  /**
   * Катта фоиз ЯХШИМИ.
   *
   * Қамров учун ҳа: кўп хонадон хатловдан ўтгани яхши. Ишсиз
   * қолдиғи учун йўқ: кўп бўлгани ёмон. Шу байроқсиз ранг
   * тескари гапирарди — қизил жойга яшил, яхши жойга қизил.
   */
  kopYaxshi: boolean;
  /**
   * Ўлчовда «яхши-ёмон» МАЪНОСИ борми.
   *
   * Қамров ва жойлаштиришда бор: паст бўлса — иш орқада.
   * Болалар ва чет элдагилар сонида ЙЎҚ: кўп бола яхши ҳам,
   * ёмон ҳам эмас, у шунчаки ҳолат.
   *
   * Илгари бу байроқ йўқ эди ва `kopYaxshi` иккита ишни
   * бажарарди: саралаш йўналиши ва огоҳлантириш. Натижада
   * «17 ёшгача болалар» харитасида боласи ЭНГ КАМ ўнта МФЙ
   * қизил контур олди — гўё улар орқада қолгандек. Бу
   * маънога эга эмас.
   */
  baholanadi: boolean;
  /**
   * Ўлчов БАЗА рўйхатидан оладими.
   *
   * ── Нега бу фарқ муҳим ──
   *
   * Хатловдан келадиган ўлчовда (қамров, болалар, чет эл) иш
   * бошланмаган МФЙ да маълумот ЙЎҚ — у кулранг туради. Бугун
   * хатлов фақат бир жойда кетмоқда, шунинг учун ўша
   * хаританинг 68 та шакли оппоқ бўлиб қолди. Тўғри, аммо
   * қараб бўлмайди.
   *
   * База ўлчовларида эса ҳамма 70 та МФЙ нинг рақами
   * ҳокимликнинг свод жадвалидан келган ва биринчи кундан
   * бери мавжуд. Улар харитани тўлиқ бўяйди — ва бу безак
   * эмас: «қайси МФЙ да ишсиз кўп» деган савол хатловдан
   * олдин ҳам, кейин ҳам ўринли.
   */
  bazaviy: boolean;
}

/** `1 234` кўринишида */
const son = (n: number) => n.toLocaleString('ru-RU');

export const OLCHOVLAR: Olchov[] = [
  {
    kalit: 'bazaIshsiz',
    nomi: 'Рўйхатдаги ишсизлар',
    izoh: 'Ҳокимлик свод жадвалидан — хатловдан олдинги ҳолат',
    foiz: () => null,
    hajm: (q) => q.bazaIshsiz,
    matn: (q) => `${son(q.bazaIshsiz)} та ишсиз рўйхатда`,
    kopYaxshi: false,
    baholanadi: false,
    bazaviy: true,
  },
  {
    kalit: 'aholi',
    nomi: 'Аҳоли',
    izoh: 'МФЙ нинг ҳажми — қайси маҳалла катта, қайси кичик',
    foiz: () => null,
    hajm: (q) => q.bazaAholi,
    matn: (q) => `${son(q.bazaAholi)} аҳоли · ${son(q.bazaXonadon)} хонадон`,
    kopYaxshi: true,
    baholanadi: false,
    bazaviy: true,
  },
  {
    kalit: 'qamrov',
    nomi: 'Хатлов қамрови',
    izoh: 'Базадаги хонадонларнинг нечаси хатловдан ўтди',
    foiz: (q) => (q.bazaXonadon > 0 ? q.qamrovFoizi : null),
    hajm: (q) => q.xatlovXonadon,
    matn: (q) => `${son(q.xatlovXonadon)} / ${son(q.bazaXonadon)} хонадон`,
    kopYaxshi: true,
    baholanadi: true,
    bazaviy: false,
  },
  {
    kalit: 'natija',
    nomi: 'Ишга жойлаштириш',
    izoh: 'Аниқланган ишсизларнинг нечаси ишга жойлашди',
    foiz: (q) => (q.aniqlangan > 0 ? q.natijaFoizi : null),
    hajm: (q) => q.joylashtirilgan,
    matn: (q) => `${son(q.joylashtirilgan)} / ${son(q.aniqlangan)} фуқаро`,
    kopYaxshi: true,
    baholanadi: true,
    bazaviy: false,
  },
  {
    kalit: 'ishsiz',
    nomi: 'Рўйхатда турганлар',
    izoh: 'Аниқланган, аммо ҳали ишга жойлашмаганлар',
    /*
     * Фоиз базадаги ишсизлар рўйхатига нисбатан: «қанча қисми
     * ҳали ҳал қилинмаган». Кўп бўлгани ЁМОН.
     */
    foiz: (q) => (q.bazaIshsiz > 0 ? Math.round((q.ishsizQoldiq / q.bazaIshsiz) * 1000) / 10 : null),
    hajm: (q) => q.ishsizQoldiq,
    matn: (q) => `${son(q.ishsizQoldiq)} киши рўйхатда`,
    kopYaxshi: false,
    baholanadi: true,
    bazaviy: false,
  },
  {
    kalit: 'bolalar',
    nomi: '17 ёшгача болалар',
    izoh: 'Боғча, мактаб ва тиббиёт режаси учун',
    /* Тоза ҳажм — фоизи йўқ, ранг ҳажмга қараб берилади */
    foiz: () => null,
    hajm: (q) => q.bolalar17,
    matn: (q) => `${son(q.bolalar17)} та бола`,
    kopYaxshi: true,
    baholanadi: false,
    bazaviy: false,
  },
  {
    kalit: 'chetEl',
    nomi: 'Чет элдагилар',
    izoh: 'Ишлаётган ва ўқиётган оила аъзолари',
    foiz: () => null,
    hajm: (q) => q.chetElIshchi,
    matn: (q) => `${son(q.chetElIshchi)} фуқаро чет элда`,
    kopYaxshi: true,
    baholanadi: false,
    bazaviy: false,
  },
];

export const olchovTop = (kalit: OlchovKaliti): Olchov =>
  OLCHOVLAR.find((o) => o.kalit === kalit) ?? OLCHOVLAR[0];

/**
 * Ҳудуднинг ранг даражаси: 0 (энг ёмон) — 1 (энг яхши).
 *
 * Фоизли ўлчовда чегара аниқ: 0-100. Ҳажмли ўлчовда (болалар,
 * чет эл) эса «яхши-ёмон» йўқ — у ерда даража энг катта
 * ҳудудга нисбатан ўлчанади ва ранг фақат КАТТАЛИКНИ
 * билдиради.
 */
export function daraja(q: XaritaQatori, olchov: Olchov, engKattaHajm: number): number | null {
  const f = olchov.foiz(q);
  if (f !== null) {
    const nisbat = Math.max(0, Math.min(1, f / 100));
    return olchov.kopYaxshi ? nisbat : 1 - nisbat;
  }
  if (engKattaHajm <= 0) return null;
  const h = olchov.hajm(q);
  return h > 0 ? Math.max(0, Math.min(1, h / engKattaHajm)) : null;
}

/* ──────────────────────────────────────────────────────────
 *  РАНГ ҚАДАМЛАРИ
 *
 *  Иккита харита бор: панелдаги интерактив ва йўлакдаги
 *  девор таблоси. Ранг қоидаси иккисида ҲАМ бир хил бўлиши
 *  шарт — акс ҳолда бир хил маҳалла битта экранда тўқ, бошқа
 *  экранда оч кўк бўлиб турарди ва қайси бири тўғри экани
 *  билинмасди.
 *
 *  Шунинг учун қоида компонентдан чиқарилиб, шу файлга
 *  кўчирилди: иккови ҳам ЎША функцияни чақиради.
 * ────────────────────────────────────────────────────────── */

/**
 * Ранг қатори неча қадамдан иборат.
 *
 * Бештайди ва қўшни иккитасининг фарқи кўзга илинмасди —
 * харита «ола-чипор» бўлиб кўринарди. Тўртта етади ва ҳар
 * бирининг рақам оралиғи легендада ёзилади.
 */
export const QADAM_SONI = 4;

/**
 * МФЙ да хатлов бошланганми.
 *
 * Бу — танланган ўлчовга БОҒЛИҚ ЭМАС. «Чет элдагилар» кесимида
 * чет элда биронта одами йўқ маҳалла ҳам хатловдан ўтган
 * бўлиши мумкин: унинг қирқта хонадони тўлдирилган, шунчаки
 * ҳеч ким чет элда эмас. «Маълумот йўқ» билан «маълумот бор,
 * қиймати нол» — икки бошқа нарса.
 */
export const boshlanganmi = (q: XaritaQatori): boolean => q.xatlovXonadon > 0;

/**
 * Шу ўлчов бўйича бу МФЙ да маълумот борми.
 *
 * База ўлчовида — ҳар доим бор (свод жадвали биринчи кундан
 * тўла). Хатлов ўлчовида — фақат иш бошланган жойда.
 */
export const malumotBormi = (q: XaritaQatori, olchov: Olchov): boolean =>
  olchov.bazaviy || boshlanganmi(q);

export interface QadamNatijasi {
  /** Ҳудуд id си → 1 (кам) … 4 (кўп). Рўйхатда йўқ — маълумотсиз */
  qadam: Map<string, number>;
  /** Чораклар — легендадаги рақам оралиқлари шундан чиқади */
  chegara: number[];
}

/**
 * Ранг қадамларини ҳисоблайди.
 *
 * ── Нега қатъий чегара эмас (0-25-50-75) ──
 *
 * Қамров ҳозир ҳамма жойда 5 фоиздан паст. Қатъий чегара
 * билан 70 та МФЙ нинг ҳаммаси ЭНГ ОЧ рангда бўлиб қоларди —
 * харита бир текис оқариб, ундан ҳеч нарса ўқиб бўлмасди.
 *
 * Шунинг учун ранг тақсимотнинг ЎЗИДАН чиқарилади: жорий
 * қийматлар чораклар бўйича бўлинади. «Кўп» ва «кам» —
 * бугунги ҳолатга нисбатан, ва харита биринчи кундан бошлаб
 * фарқни кўрсатади.
 *
 * Тенг қийматлар БИР гуруҳга тушади: нол фоизли ўттизта МФЙ
 * сунъий равишда тўрт хил рангга бўлиниб кетмайди.
 */
export function qadamlarniHisobla(qatorlar: XaritaQatori[], olchov: Olchov): QadamNatijasi {
  const qadam = new Map<string, number>();

  const qiymatlar: { id: string; h: number }[] = [];
  for (const q of qatorlar) {
    if (!malumotBormi(q, olchov)) continue;
    const f = olchov.foiz(q);
    qiymatlar.push({ id: q.hududId, h: f !== null ? f : olchov.hajm(q) });
  }
  if (qiymatlar.length === 0) return { qadam, chegara: [] };

  const saralangan = qiymatlar.map((x) => x.h).sort((a, b) => a - b);
  const eng = saralangan[saralangan.length - 1];
  const kam = saralangan[0];

  /* Ҳамма бир хил — бўлишнинг маъноси йўқ, ўртача қадам */
  if (eng === kam) {
    for (const x of qiymatlar) qadam.set(x.id, 2);
    return { qadam, chegara: [] };
  }

  const chorak = [0.25, 0.5, 0.75].map(
    (u) => saralangan[Math.min(saralangan.length - 1, Math.floor(u * saralangan.length))]
  );

  for (const x of qiymatlar) {
    let n = 1;
    for (const c of chorak) if (x.h > c) n += 1;
    qadam.set(x.id, Math.min(QADAM_SONI, n));
  }
  return { qadam, chegara: chorak };
}

/**
 * Легендадаги рақам оралиғи: «30–49%», «50% дан юқори».
 *
 * Чегаралар чораклардан келади, яъни улар ЖОРИЙ тақсимотни
 * тасвирлайди — аммо экранда мавҳум «кам/кўп» эмас, ўқиб
 * бўладиган сон туради.
 */
export function oraliqMatni(
  n: number,
  chegara: number[],
  olchov: Olchov,
  qatorlar: XaritaQatori[]
): string {
  if (chegara.length === 0) return '';
  /*
   * Ўлчов фоизлими — бу БИРИНЧИ қаторга қараб эмас, бутун
   * рўйхатга қараб аниқланади. Биринчи МФЙ нинг базада
   * хонадони нол бўлса, фоизли ўлчов ҳам `null` қайтаради ва
   * легенда фоиз белгисини йўқотиб қўярди.
   */
  const foizli = qatorlar.some((q) => olchov.foiz(q) !== null);
  const yaxlit = (x: number) =>
    foizli ? `${Math.round(x)}%` : Math.round(x).toLocaleString('ru-RU');

  if (n === 1) return `< ${yaxlit(chegara[0])}`;
  if (n === QADAM_SONI) return `> ${yaxlit(chegara[chegara.length - 1])}`;
  return `${yaxlit(chegara[n - 2])}–${yaxlit(chegara[n - 1])}`;
}
