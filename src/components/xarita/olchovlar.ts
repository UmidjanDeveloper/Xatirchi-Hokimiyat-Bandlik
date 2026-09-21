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
}

/** `1 234` кўринишида */
const son = (n: number) => n.toLocaleString('ru-RU');

export const OLCHOVLAR: Olchov[] = [
  {
    kalit: 'qamrov',
    nomi: 'Хатлов қамрови',
    izoh: 'Базадаги хонадонларнинг нечаси хатловдан ўтди',
    foiz: (q) => (q.bazaXonadon > 0 ? q.qamrovFoizi : null),
    hajm: (q) => q.xatlovXonadon,
    matn: (q) => `${son(q.xatlovXonadon)} / ${son(q.bazaXonadon)} хонадон`,
    kopYaxshi: true,
    baholanadi: true,
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
