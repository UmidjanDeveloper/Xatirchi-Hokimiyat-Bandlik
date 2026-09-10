import type { IshsizHolati } from '@prisma/client';
import { prisma } from './prisma';
import { kechikkanlarShartI } from './chora-tadbir';
import { VORONKA } from '@/lib/ishsiz-holati';

/**
 * ============================================================
 *  HOKIM PANELI UCHUN TAHLIL
 *
 *  Bitta tamoyil butun modulni belgilaydi: har bir raqamning
 *  MAXRAJI bo'lishi kerak.
 *
 *  "38 ta xonadon xatlovdan o'tdi" - bu hokim uchun ma'nosiz
 *  raqam. "506 tadan 38 tasi" esa ma'noli. Maxraj svod
 *  jadvalidan keladi (Mahalla modelidagi baza raqamlari) va
 *  aynan shuning uchun u platformaga import qilingan.
 * ============================================================
 */

export interface VoronkaBosqichi {
  holati: IshsizHolati;
  soni: number;
  /** Bazadagi ishsizlar sonidan foizi */
  foiz: number;
}

export interface MahallaQamrovi {
  id: string;
  nomi: string;
  nomiKirill: string;
  /** Svod jadvalidagi ishsizlar soni - maxraj */
  bazaIshsiz: number;
  /** Xatlovda aniqlangan ishsizlar */
  aniqlangan: number;
  joylashtirilgan: number;
  /** Aniqlanganlarning bazaga nisbati */
  qamrovFoizi: number;
  /** Joylashtirilganlarning bazaga nisbati */
  natijaFoizi: number;
  xatlovXonadon: number;
  bazaXonadon: number;
}

export interface TahlilNatijasi {
  jami: {
    bazaIshsiz: number;
    bazaXonadon: number;
    bazaAholi: number;
    xatlovXonadon: number;
    aniqlangan: number;
    joylashtirilgan: number;
    radEtgan: number;
  };
  voronka: VoronkaBosqichi[];
  qamrov: MahallaQamrovi[];
  kechikkanlar: { tashkilot: string; soni: number }[];
  byudjet: { yonalish: string; summa: number; oila: number }[];
  jamiTalab: number;
  kursTalabi: { kasb: string; soni: number }[];
  toifalar: {
    ayollarDaftari: number;
    ijtimoiyReestr: number;
    migratsiyadanQaytgan: number;
    oliyBitiruvchi: number;
    ortaMaxsusBitiruvchi: number;
  };
}

/** Foizni bir kasrli songa yaxlitlaydi */
const f = (qism: number, butun: number): number =>
  butun > 0 ? Math.round((qism / butun) * 1000) / 10 : 0;

export async function tahlilOl(mahallaId?: string): Promise<TahlilNatijasi> {
  const hozir = new Date();
  const mahallaFiltri = mahallaId ? { mahallaId } : {};

  const [mahallalar, bosqichlar, xonadonlar, kechikkanlar, moliya, kurslar] =
    await Promise.all([
      prisma.mahalla.findMany({
        where: mahallaId ? { id: mahallaId } : undefined,
        orderBy: { nomi: 'asc' },
        select: {
          id: true,
          nomi: true,
          nomiKirill: true,
          ishsiz: true,
          xonadon: true,
          aholi: true,
          ayollarDaftari: true,
          ijtimoiyReestr: true,
          migratsiyadanQaytgan: true,
          oliyBitiruvchi: true,
          ortaMaxsusBitiruvchi: true,
        },
      }),

      prisma.unemployedPerson.groupBy({
        by: ['mahallaId', 'holati'],
        where: mahallaFiltri,
        _count: true,
      }),

      prisma.household.groupBy({
        by: ['mahallaId'],
        where: { ...mahallaFiltri, holati: { not: 'QORALAMA' } },
        _count: true,
      }),

      prisma.actionPlan.groupBy({
        by: ['masulTashkilot'],
        where: mahallaId
          ? {
              ...kechikkanlarShartI(hozir),
              OR: [{ household: { mahallaId } }, { ishsiz: { mahallaId } }],
            }
          : kechikkanlarShartI(hozir),
        _count: true,
      }),

      /*
       * Byudjet talabi: moliyaviy ehtiyoji bor xonadonlarning
       * summasi va yo'nalishlari. `mablagYonalishi` massiv bo'lgani
       * uchun guruhlashni SQL emas, kod bajaradi.
       */
      prisma.household.findMany({
        where: { ...mahallaFiltri, moliyaEhtiyoji: true, holati: { not: 'QORALAMA' } },
        select: { talabQilinganMablag: true, mablagYonalishi: true },
      }),

      prisma.unemployedPerson.findMany({
        where: { ...mahallaFiltri, kasbHunarEhtiyoji: true, organmoqchiKasb: { not: null } },
        select: { organmoqchiKasb: true },
      }),
    ]);

  // ── Voronka ──
  const bosqichSoni = new Map<IshsizHolati, number>();
  const mahallaBosqich = new Map<string, Map<IshsizHolati, number>>();

  for (const b of bosqichlar) {
    bosqichSoni.set(b.holati, (bosqichSoni.get(b.holati) ?? 0) + b._count);
    const m = mahallaBosqich.get(b.mahallaId) ?? new Map();
    m.set(b.holati, b._count);
    mahallaBosqich.set(b.mahallaId, m);
  }

  const bazaIshsiz = mahallalar.reduce((s, m) => s + m.ishsiz, 0);
  const aniqlangan = Array.from(bosqichSoni.values()).reduce((s, n) => s + n, 0);
  const radEtgan = bosqichSoni.get('RAD_ETDI') ?? 0;

  /*
   * Voronka KUMULYATIV: "taklif berildi" bosqichida turgan odam
   * suhbatdan ham o'tgan. Har bosqichni alohida sanasak, voronka
   * o'rniga tarqoq ustunlar chiqadi va "qayerda tiqilib qolgan"
   * degan savolga javob bermaydi.
   */
  const bosqichRaqami = (h: IshsizHolati) => VORONKA.indexOf(h);
  const voronka: VoronkaBosqichi[] = VORONKA.map((h) => {
    const soni = VORONKA.filter((x) => bosqichRaqami(x) >= bosqichRaqami(h)).reduce(
      (s, x) => s + (bosqichSoni.get(x) ?? 0),
      0
    );
    return { holati: h, soni, foiz: f(soni, bazaIshsiz) };
  });

  const joylashtirilgan =
    (bosqichSoni.get('JOYLASHTIRILDI') ?? 0) + (bosqichSoni.get('TASDIQLANDI') ?? 0);

  // ── Mahalla qamrovi ──
  const xonadonSoni = new Map(xonadonlar.map((x) => [x.mahallaId, x._count]));

  const qamrov: MahallaQamrovi[] = mahallalar.map((m) => {
    const b = mahallaBosqich.get(m.id) ?? new Map<IshsizHolati, number>();
    const mahallaAniqlangan = Array.from(b.values()).reduce((s, n) => s + n, 0);
    const mahallaJoylashgan =
      (b.get('JOYLASHTIRILDI') ?? 0) + (b.get('TASDIQLANDI') ?? 0);

    return {
      id: m.id,
      nomi: m.nomi,
      nomiKirill: m.nomiKirill,
      bazaIshsiz: m.ishsiz,
      aniqlangan: mahallaAniqlangan,
      joylashtirilgan: mahallaJoylashgan,
      qamrovFoizi: f(mahallaAniqlangan, m.ishsiz),
      natijaFoizi: f(mahallaJoylashgan, m.ishsiz),
      xatlovXonadon: xonadonSoni.get(m.id) ?? 0,
      bazaXonadon: m.xonadon,
    };
  });

  // ── Byudjet talabi ──
  const yonalishlar = new Map<string, { summa: number; oila: number }>();
  let jamiTalab = 0;

  for (const x of moliya) {
    const summa = x.talabQilinganMablag ? Number(x.talabQilinganMablag) : 0;
    jamiTalab += summa;

    /*
     * Bir oila bir necha yo'nalish belgilashi mumkin. Summani
     * yo'nalishlar orasida TENG taqsimlaymiz - aks holda bitta
     * 50 mln so'm har yo'nalishda to'liq sanalib, umumiy raqam
     * haqiqiy talabdan bir necha barobar katta chiqardi.
     */
    const royxat = x.mablagYonalishi.length > 0 ? x.mablagYonalishi : ['Boshqa'];
    const ulush = summa / royxat.length;

    for (const y of royxat) {
      const j = yonalishlar.get(y) ?? { summa: 0, oila: 0 };
      j.summa += ulush;
      j.oila += 1;
      yonalishlar.set(y, j);
    }
  }

  const byudjet = Array.from(yonalishlar.entries())
    .map(([yonalish, j]) => ({ yonalish, summa: Math.round(j.summa), oila: j.oila }))
    .sort((a, b) => b.summa - a.summa);

  // ── Kurs talabi ──
  const kasblar = new Map<string, number>();
  for (const k of kurslar) {
    const nom = k.organmoqchiKasb?.trim();
    if (!nom) continue;
    // Bosh harf farqi tufayli "Payvandchi" va "payvandchi" ikkiga bo'linmasin
    const kalit = nom.charAt(0).toUpperCase() + nom.slice(1).toLowerCase();
    kasblar.set(kalit, (kasblar.get(kalit) ?? 0) + 1);
  }

  const kursTalabi = Array.from(kasblar.entries())
    .map(([kasb, soni]) => ({ kasb, soni }))
    .sort((a, b) => b.soni - a.soni);

  return {
    jami: {
      bazaIshsiz,
      bazaXonadon: mahallalar.reduce((s, m) => s + m.xonadon, 0),
      bazaAholi: mahallalar.reduce((s, m) => s + m.aholi, 0),
      xatlovXonadon: xonadonlar.reduce((s, x) => s + x._count, 0),
      aniqlangan,
      joylashtirilgan,
      radEtgan,
    },
    voronka,
    qamrov,
    kechikkanlar: kechikkanlar
      .map((k) => ({ tashkilot: k.masulTashkilot, soni: k._count }))
      .sort((a, b) => b.soni - a.soni),
    byudjet,
    jamiTalab,
    kursTalabi,
    toifalar: {
      ayollarDaftari: mahallalar.reduce((s, m) => s + m.ayollarDaftari, 0),
      ijtimoiyReestr: mahallalar.reduce((s, m) => s + m.ijtimoiyReestr, 0),
      migratsiyadanQaytgan: mahallalar.reduce((s, m) => s + m.migratsiyadanQaytgan, 0),
      oliyBitiruvchi: mahallalar.reduce((s, m) => s + m.oliyBitiruvchi, 0),
      ortaMaxsusBitiruvchi: mahallalar.reduce((s, m) => s + m.ortaMaxsusBitiruvchi, 0),
    },
  };
}
