import { createHash, timingSafeEqual } from 'node:crypto';
import type { IshsizHolati } from '@prisma/client';
import { prisma } from './prisma';
import { lotinga } from './alifbo';
import { FAOL_ELON } from './elon-muddati';
import { kechikkanlarShartI } from './chora-tadbir';
import { MUSTAHKAMLASH_KUN } from './chora-yaratish';
import { UZOQ_ISHSIZ } from './uzoq-ishsizlik';
import { ISHSIZ_HOLATI, VORONKA } from './ishsiz-holati';
import { vaucherHisobi } from './it-vaucher';
import { kuzatuvKorsatkichlari } from './kuzatuv';
import { tabloMalumoti } from './tablo-malumoti';
import { KUN_MS, XATLANGAN, kunBoshi, kunRaqami, type Harakat } from './tuman-holati';
import {
  IT_VAUCHER_HOLATI,
  IT_YONALISHI,
  KASB_YONALISHI,
  MABLAG_YONALISHI,
  MASUL_TASHKILOT,
  ORGANMOQCHI_KASBLAR,
  type Variant,
} from './constants';
import { percent } from './utils';

/**
 * ============================================================
 *  IDROK UCHUN YASHIRIN STATISTIKA
 *
 *  IDROK — tuman hokimiyatining AI yordamchisi. U hokimga
 *  "bandlik bo'yicha ahvol qanday" degan savolga javob berishi
 *  uchun shu platformaning JAMLANGAN raqamlarini o'qiydi.
 *
 *  ── Uchta qat'iy qoida ──
 *
 *  1. FAQAT O'QISH. Bu modulda va u chaqiradigan funksiyalarda
 *     faqat `count`, `aggregate`, `groupBy` va `findMany(select)`
 *     bor. Audit jurnali, "oxirgi kirish" kabi yon ta'sirli
 *     yordamchilar (`talabQil` va h.k.) chaqirilmaydi — IDROK
 *     xodim emas va uning so'rovi bazada iz qoldirmasligi kerak.
 *
 *  2. SHAXSIY MA'LUMOT YO'Q. F.I.Sh., telefon, manzil, tug'ilgan
 *     sana va xodim yozgan erkin matn chiqmaydi. Faqat sonlar
 *     va KATALOG qiymatlari (mahalla nomi, soha, tashkilot,
 *     yo'nalish). Katalogga kirmagan erkin matn "Boshqa" ga
 *     yig'iladi — `xonadon-xulosa.ts` dagi AI qoidasi bilan
 *     bir xil tamoyil.
 *
 *  3. RAQAM BOSHQA EKRANDAGI BILAN BIR XIL. Tablo va brifing
 *     raqamlari `tabloMalumoti()` dan (u `tumanHolati()` ni
 *     o'qiydi) olinadi. Panel raqamlari esa `tahlil.ts` dagi
 *     AYNAN o'sha shartlar bilan sanaladi. `tahlilOl()` ning
 *     o'zi chaqirilmaydi: uning dinamika qismi xom SQL bilan
 *     ishlaydi, bu yerga esa faqat Prisma o'qish amallari
 *     ruxsat etilgan.
 * ============================================================
 */

export const IDROK_MANBA = 'xatirchibandlik.uz';
export const IDROK_NOMI = 'Xatirchi bandlik platformasi';

/** Har jadvalda eng ko'pi bilan shuncha qator */
export const JADVAL_QATOR_CHEGARASI = 30;

export type IdrokBirlik = 'ta' | 'kishi' | 'foiz' | "so'm";

export interface IdrokKorsatkich {
  /** snake_case kalit — IDROK shu bo'yicha taniydi */
  kalit: string;
  nomi: string;
  /** Har doim JSON son — formatlangan matn emas */
  qiymat: number;
  birlik: IdrokBirlik;
}

export interface IdrokJadval {
  nomi: string;
  ustunlar: string[];
  /** Birinchi ustun — yorliq, keyingilari — son */
  qatorlar: (string | number)[][];
}

export interface IdrokStatistika {
  manba: string;
  nomi: string;
  /** ISO vaqt — raqamlar qachon hisoblangani */
  vaqt: string;
  korsatkichlar: IdrokKorsatkich[];
  jadvallar: IdrokJadval[];
  /**
   * Chuqur ko'rish havolalari (shaxsiy ma'lumot YO'Q): IDROK hokimga "ro'yxatning o'zi" kerak bo'lsa,
   * saytning o'zidagi sahifani ochib beradi - ro'yxat faqat shu yerda, hokimning o'z logini bilan ko'rinadi.
   */
  havolalar: {
    /** Mahalla nomi -> saytdagi mahalla ID (ro'yxat sahifalarini ?mahalla=<id> bilan filtrlash uchun) */
    mahallalar: { nomi: string; id: string }[];
    /** Sahifa manzillari (saytga nisbatan): ishsizlar, xonadonlar (xatlov), ish o'rinlari, tablo */
    sahifalar: Record<string, string>;
  };
}

// ─────────────────────────────────────────────────────────────
//  KALIT
// ─────────────────────────────────────────────────────────────

/**
 * Muhitdagi kalit. Bo'sh yoki yo'q bo'lsa — `null`, ya'ni yo'l
 * O'CHIRILGAN va 404 qaytaradi.
 */
export function idrokKaliti(): string | null {
  const k = process.env.IDROK_API_KEY?.trim();
  return k ? k : null;
}

/**
 * Kelgan kalitni kutilgani bilan solishtiradi.
 *
 * Ikkalasi avval SHA-256 dan o'tkaziladi: `timingSafeEqual` faqat
 * teng uzunlikdagi buferlarni qabul qiladi, xesh esa doim 32
 * bayt. Shunda kalitning UZUNLIGI ham javob vaqtidan bilinmaydi.
 */
export function idrokKalitiTogrimi(
  kelgan: string | null | undefined,
  kutilgan: string | null | undefined
): boolean {
  if (!kelgan || !kutilgan) return false;
  const a = createHash('sha256').update(kelgan, 'utf8').digest();
  const b = createHash('sha256').update(kutilgan, 'utf8').digest();
  return timingSafeEqual(a, b);
}

// ─────────────────────────────────────────────────────────────
//  TOZA YORDAMCHILAR (bazasiz — sinovda to'g'ridan-to'g'ri)
// ─────────────────────────────────────────────────────────────

/** JSON uchun xavfsiz son: bigint -> number, NaN/Infinity -> 0 */
export function son(x: number | bigint | null | undefined): number {
  const n = typeof x === 'bigint' ? Number(x) : (x ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function korsatkich(
  kalit: string,
  nomi: string,
  qiymat: number | bigint | null | undefined,
  birlik: IdrokBirlik
): IdrokKorsatkich {
  return { kalit, nomi, qiymat: son(qiymat), birlik };
}

/** Jadval — qatorlar 30 taga kesiladi, sonlar tozalanadi */
export function jadval(
  nomi: string,
  ustunlar: string[],
  qatorlar: (string | number | bigint)[][]
): IdrokJadval {
  return {
    nomi,
    ustunlar,
    qatorlar: qatorlar
      .slice(0, JADVAL_QATOR_CHEGARASI)
      .map((q) => q.map((k) => (typeof k === 'string' ? k : son(k)))),
  };
}

/** Foiz, bir kasr bilan — `tahlil.ts` va `tuman-holati.ts` dagi formula */
export function foiz1(qism: number, butun: number): number {
  return butun > 0 ? Math.round((qism / butun) * 1000) / 10 : 0;
}

/** Apostrof va harf kattaligidan qat'i nazar solishtirish uchun */
const normal = (s: string) => s.trim().toLowerCase().replace(/[’‘ʻʼ`´]/g, "'");

/**
 * Katalog qiymati bo'lsa — katalogdagi yozilishi, aks holda "Boshqa".
 *
 * Erkin matn (masalan, fuqaro "o'zim yozaman" deb kiritgan kasb
 * yoki eski yozuvdagi tashkilot nomi) tashqariga CHIQMAYDI: unda
 * nima yozilgani oldindan ma'lum emas.
 */
export function katalogdan(katalog: Variant[], qiymat: string | null | undefined): string {
  if (!qiymat) return 'Boshqa';
  const n = normal(qiymat);
  return katalog.find((v) => normal(v.qiymat) === n)?.qiymat ?? 'Boshqa';
}

/** Kalit bo'yicha qo'shib boradi */
function qosh(m: Map<string, number>, kalit: string, n: number): void {
  m.set(kalit, (m.get(kalit) ?? 0) + n);
}

/** Ko'pdan ozga, teng bo'lsa — nomi bo'yicha */
function kamayish(a: [string, number], b: [string, number]): number {
  return b[1] - a[1] || a[0].localeCompare(b[0]);
}

/**
 * Toshkent vaqti bo'yicha sana — `2026-09-30`.
 *
 * Siljish `tuman-holati.ts` dagi bilan bir xil (UTC+5, yozgi vaqt
 * yo'q). U yerda eksport qilinmagan, shuning uchun shu yerda.
 */
const TOSHKENT_MS = 5 * 60 * 60 * 1000;
function toshkentSanasi(sana: Date): string {
  return new Date(kunBoshi(sana).getTime() + TOSHKENT_MS).toISOString().slice(0, 10);
}

interface OyOqimi {
  xatlov: number;
  anketa: number;
  joylashtirilgan: number;
}

/**
 * Joriy oyning oqimi — `harakat()` EMAS.
 *
 * `harakat()` joylashtirishni `updatedAt` bo'yicha sanaydi: tablodagi
 * bir kun uchun bu deyarli to'g'ri, bir oyda esa eski joylashtirishning
 * har qanday tahriri yoki 90 kunlik tasdig'i ham "shu oyda
 * joylashtirildi" bo'lib qoladi. Shuning uchun:
 *
 *  - joylashtirish — `ishgaKirganSana` bo'yicha, panelning "Oylik
 *    oqim" grafigi bilan bir xil (`tahlil.ts`, `kunlikSoni`);
 *  - anketa — `createdAt` bo'yicha, u ham panel bilan bir xil;
 *  - xatlov — `xatlovSanasi` bo'yicha, tablo va brifing kabi
 *    (`tuman-holati.ts` izohi). Panel grafigi esa yozuv kiritilgan
 *    sanani oladi, shuning uchun nomida "xatlov sanasi bo'yicha"
 *    deb ochiq yozilgan.
 *
 * Rad etganlar oy uchun sanalmaydi: ularning sanasi yo'q, faqat
 * `updatedAt` bor. Arxivdagilarni `prisma.ts` dagi qorovul chiqaradi
 * (xom SQL dagi `"arxivSanasi" IS NULL` bilan bir xil).
 */
async function oyOqimi(boshi: Date, oxiri: Date): Promise<OyOqimi> {
  const oraliq = { gte: boshi, lt: oxiri };
  const [xatlov, anketa, joylashtirilgan] = await Promise.all([
    prisma.household.count({ where: { ...XATLANGAN, xatlovSanasi: oraliq } }),
    prisma.unemployedPerson.count({ where: { createdAt: oraliq } }),
    prisma.unemployedPerson.count({ where: { ishgaKirganSana: oraliq } }),
  ]);
  return { xatlov, anketa, joylashtirilgan };
}

// ─────────────────────────────────────────────────────────────
//  HISOB
// ─────────────────────────────────────────────────────────────

/**
 * Qisqa kesh — panel (45 s) va tablo (30 s) bilan bir xil tamoyil.
 * IDROK tez-tez so'rasa ham baza har safar qayta sanalmaydi.
 */
const KESH_MS = 45 * 1000;
let kesh: { vaqti: number; natija: IdrokStatistika } | null = null;

export async function idrokStatistikasi(hozir: Date = new Date()): Promise<IdrokStatistika> {
  if (kesh && Date.now() - kesh.vaqti < KESH_MS) return kesh.natija;
  const natija = await hisobla(hozir);
  kesh = { vaqti: Date.now(), natija };
  return natija;
}

/** Sinov uchun — keshni tozalaydi */
export function idrokKeshiniTozala(): void {
  kesh = null;
}

async function hisobla(hozir: Date): Promise<IdrokStatistika> {
  /*
   * ── 1-BOSQICH: TABLO ──
   *
   * Alohida, birinchi bo'lib: productionda ulanishlar soni bitta
   * bo'lishi mumkin (`ulanish-satri.ts`), va ellikta so'rovni bir
   * vaqtda navbatga qo'yish o'rniga ikki bosqichda yuboramiz.
   * Tablo o'zi 30 soniyalik keshga ega.
   */
  const tablo = await tabloMalumoti(hozir);
  const h = tablo.holat;

  const bugunBoshi = kunBoshi(hozir);
  const ertaga = new Date(bugunBoshi.getTime() + KUN_MS);
  /* Joriy oyning 1-sanasi, Toshkent vaqti bilan */
  const oyBoshi = new Date(bugunBoshi.getTime() - (kunRaqami(hozir) - 1) * KUN_MS);

  /* `tahlil.ts` dagi `mustahkamlashChegarasi` bilan bir xil */
  const mustahkamlash = new Date(hozir);
  mustahkamlash.setDate(mustahkamlash.getDate() - MUSTAHKAMLASH_KUN);

  /*
   * ── 2-BOSQICH: PANEL ──
   *
   * Har bir so'rov `tahlil.ts` dagi `tahlilniHisobla()` ning
   * o'sha so'rovi bilan BIR XIL shartda — shuning uchun hokim
   * panelda ko'rgan raqam IDROK aytgan raqam bilan mos keladi.
   */
  const [
    mahallalar,
    bosqichlar,
    xonadonlar,
    kechikkanlar,
    moliya,
    kurslar,
    uzoqIshsiz,
    mustahkamlashKutayotgan,
    oila,
    chetElOila,
    elonlar,
    vaucher,
    kuzatuv,
    oy,
  ] = await Promise.all([
    prisma.mahalla.findMany({
      orderBy: { nomi: 'asc' },
      select: {
        id: true,
        nomi: true,
        aholi: true,
        xonadon: true,
        ishsiz: true,
        ayollarDaftari: true,
        ijtimoiyReestr: true,
        migratsiyadanQaytgan: true,
        oliyBitiruvchi: true,
        ortaMaxsusBitiruvchi: true,
      },
    }),

    prisma.unemployedPerson.groupBy({
      by: ['mahallaId', 'holati'],
      _count: true,
    }),

    prisma.household.groupBy({
      by: ['mahallaId'],
      where: XATLANGAN,
      _count: true,
      _sum: { ishsizlarSoni: true },
    }),

    prisma.actionPlan.groupBy({
      by: ['masulTashkilot'],
      where: kechikkanlarShartI(hozir),
      _count: true,
    }),

    prisma.household.findMany({
      where: { ...XATLANGAN, moliyaEhtiyoji: true },
      select: { talabQilinganMablag: true, mablagYonalishi: true },
    }),

    /*
     * Panel bilan bir xil shart, lekin har fuqaro emas, har KASB
     * bo'yicha bitta qator — natija katalogga yig'ilgach bir xil.
     */
    prisma.unemployedPerson.groupBy({
      by: ['organmoqchiKasb'],
      where: { kasbHunarEhtiyoji: true, organmoqchiKasb: { not: null } },
      _count: true,
    }),

    prisma.unemployedPerson.count({ where: UZOQ_ISHSIZ(hozir) }),

    prisma.unemployedPerson.count({
      where: { holati: 'JOYLASHTIRILDI', ishgaKirganSana: { lte: mustahkamlash } },
    }),

    /* Panelning "Bola, chet el va pul" kartalari — `bolimlar-tahlili.ts` bilan bir xil shart */
    prisma.household.aggregate({
      where: XATLANGAN,
      _sum: {
        bolalar0_3Yosh: true,
        bolalar3_17Yosh: true,
        chetElIshchilar: true,
        chetElOylikPulSom: true,
        maktabgachaYoshdagi: true,
        maktabgachaQamrovda: true,
        maktabYoshdagi: true,
        maktabQamrovda: true,
      },
    }),

    prisma.household.count({ where: { ...XATLANGAN, chetElMehnati: true } }),

    /* Faol e'lonlar soha kesimida — "faol" sharti tablo bilan bir xil (`FAOL_ELON`) */
    prisma.vacancy.groupBy({
      by: ['yonalish'],
      where: FAOL_ELON(hozir),
      _count: true,
      _sum: { ornlarSoni: true },
    }),

    vaucherHisobi(),
    kuzatuvKorsatkichlari(undefined, hozir),
    oyOqimi(oyBoshi, ertaga),
  ]);

  // ── Mahalla kesimi va voronka (`tahlil.ts` dagi hisob) ──

  const bosqichSoni = new Map<IshsizHolati, number>();
  const mahallaBosqich = new Map<string, { aniqlangan: number; joylashgan: number }>();
  for (const b of bosqichlar) {
    bosqichSoni.set(b.holati, (bosqichSoni.get(b.holati) ?? 0) + b._count);
    const m = mahallaBosqich.get(b.mahallaId) ?? { aniqlangan: 0, joylashgan: 0 };
    m.aniqlangan += b._count;
    if (b.holati === 'JOYLASHTIRILDI' || b.holati === 'TASDIQLANDI') m.joylashgan += b._count;
    mahallaBosqich.set(b.mahallaId, m);
  }

  const xonadonXaritasi = new Map(xonadonlar.map((x) => [x.mahallaId, x]));
  const nomlar = new Map(mahallalar.map((m) => [m.id, m.nomi]));

  const mahallaQatorlari = mahallalar.map((m) => {
    const x = xonadonXaritasi.get(m.id);
    const b = mahallaBosqich.get(m.id) ?? { aniqlangan: 0, joylashgan: 0 };
    const xatlov = x?._count ?? 0;
    return {
      nomi: m.nomi,
      xatlov,
      bazaXonadon: m.xonadon,
      qamrov: foiz1(xatlov, m.xonadon),
      topilgan: x?._sum.ishsizlarSoni ?? 0,
      aniqlangan: b.aniqlangan,
      joylashgan: b.joylashgan,
      bazaIshsiz: m.ishsiz,
      natija: foiz1(b.joylashgan, m.ishsiz),
    };
  });

  const bazaAholi = mahallalar.reduce((s, m) => s + m.aholi, 0);
  const radEtgan = bosqichSoni.get('RAD_ETDI') ?? 0;

  /* Voronka KUMULYATIV — panel bilan bir xil; foiz xatlovda topilganlardan */
  const voronka = VORONKA.map((holat, i) => {
    const soni = VORONKA.slice(i).reduce((s, x) => s + (bosqichSoni.get(x) ?? 0), 0);
    return [
      lotinga(ISHSIZ_HOLATI[holat].kirill),
      soni,
      foiz1(soni, h.topilganIshsiz || h.bazaIshsiz),
    ];
  });

  // ── Kechikkan topshiriqlar (mas'ul tashkilot katalogi bo'yicha) ──

  const tashkilotlar = new Map<string, number>();
  for (const k of kechikkanlar) qosh(tashkilotlar, katalogdan(MASUL_TASHKILOT, k.masulTashkilot), k._count);

  // ── Moliyaviy talab (panel `ByudjetBlogi` hisobi: summa yo'nalishlarga teng bo'linadi) ──

  const yonalishlar = new Map<string, { summa: number; oila: number }>();
  let jamiTalab = 0;
  for (const x of moliya) {
    const summa = x.talabQilinganMablag ? Number(x.talabQilinganMablag) : 0;
    jamiTalab += summa;
    const royxat = x.mablagYonalishi.length > 0 ? x.mablagYonalishi : ['Boshqa'];
    const ulush = summa / royxat.length;
    for (const y of royxat) {
      const nom = katalogdan(MABLAG_YONALISHI, y);
      const j = yonalishlar.get(nom) ?? { summa: 0, oila: 0 };
      j.summa += ulush;
      j.oila += 1;
      yonalishlar.set(nom, j);
    }
  }

  // ── Kurs talabi ──

  const kasblar = new Map<string, number>();
  for (const k of kurslar) {
    if (!k.organmoqchiKasb?.trim()) continue;
    qosh(kasblar, katalogdan(ORGANMOQCHI_KASBLAR, k.organmoqchiKasb), k._count);
  }

  // ── Faol e'lonlar soha kesimida ──

  const sohalar = new Map<string, { orin: number; elon: number }>();
  for (const e of elonlar) {
    const nom = e.yonalish ? katalogdan(KASB_YONALISHI, e.yonalish) : "Ko'rsatilmagan";
    const j = sohalar.get(nom) ?? { orin: 0, elon: 0 };
    j.orin += e._sum.ornlarSoni ?? 0;
    j.elon += e._count;
    sohalar.set(nom, j);
  }
  const faolOrinlar = Array.from(sohalar.values()).reduce((s, x) => s + x.orin, 0);

  // ── IT-vaucher ──

  const vaucherYonalish = new Map<string, number>();
  for (const y of vaucher.yonalishlar) qosh(vaucherYonalish, katalogdan(IT_YONALISHI, y.yonalish), y.soni);
  const vaucherHolatNomi = (holat: string) =>
    lotinga(IT_VAUCHER_HOLATI.find((v) => v.qiymat === holat)?.kirill ?? holat);

  // ── Oila raqamlari ──

  const s = oila._sum;
  const bolalar03 = s.bolalar0_3Yosh ?? 0;
  const bolalar317 = s.bolalar3_17Yosh ?? 0;
  const qamrovsizBolalar =
    Math.max(0, (s.maktabgachaYoshdagi ?? 0) - (s.maktabgachaQamrovda ?? 0)) +
    Math.max(0, (s.maktabYoshdagi ?? 0) - (s.maktabQamrovda ?? 0));

  // ── Kuzatuv ──

  const kuzatuv90 = kuzatuv.bosqichlar.find((b) => b.kun === 90);

  // ─────────────────────────────────────────────────────────
  //  KO'RSATKICHLAR
  // ─────────────────────────────────────────────────────────

  type Qator = [kalit: string, nomi: string, qiymat: number | bigint | null, birlik: IdrokBirlik];

  const dinamika = (prefiks: string, davr: string, x: Harakat): Qator[] => [
    [`${prefiks}_xatlov`, `${davr} xatlovdan o'tgan xonadonlar`, x.xatlov, 'ta'],
    [`${prefiks}_yangi_anketa`, `${davr} anketasi to'ldirilgan ishsizlar`, x.anketa, 'kishi'],
    [`${prefiks}_joylashtirilgan`, `${davr} ishga joylashtirilganlar`, x.joylashtirilgan, 'kishi'],
    [`${prefiks}_rad_etgan`, `${davr} taklifdan bosh tortganlar`, x.radEtgan, 'kishi'],
  ];

  const qatorlar: Qator[] = [
    /* ── Tablo va ertalabki brifing (`tumanHolati`) ── */
    ['mahallalar_soni', 'Mahallalar (MFY) soni', h.jamiMahalla, 'ta'],
    ['xatlov_boshlagan_mahallalar', 'Xatlovni boshlagan mahallalar', h.boshlaganMahalla, 'ta'],
    ['xatlov_boshlamagan_mahallalar', 'Xatlovni boshlamagan mahallalar', h.boshlamaganMahalla, 'ta'],
    ['aholi_soni', 'Aholi soni (svod jadvali)', bazaAholi, 'kishi'],
    ['baza_xonadonlar', 'Xonadonlar soni (svod jadvali)', h.bazaXonadon, 'ta'],
    ['xatlovdan_otgan_xonadonlar', "Xatlovdan o'tgan xonadonlar", h.xatlovXonadon, 'ta'],
    ['xatlov_qamrovi', 'Xatlov qamrovi', h.qamrovFoizi, 'foiz'],
    ['royxatdagi_ishsizlar', "Ro'yxatdagi ishsizlar (svod jadvali)", h.bazaIshsiz, 'kishi'],
    ['xatlovda_topilgan_ishsizlar', 'Xatlovda topilgan ishsizlar', h.topilganIshsiz, 'kishi'],
    ['anketasi_bor_ishsizlar', "Shaxsiy anketasi to'ldirilgan ishsizlar", h.anketa, 'kishi'],
    ['anketasiz_ishsizlar', "Topilgan, lekin anketasi to'ldirilmaganlar", h.anketasiz, 'kishi'],
    ['joylashtirilganlar', 'Ishga joylashtirilganlar', h.joylashtirilgan, 'kishi'],
    [
      'joylashtirish_ulushi',
      'Xatlovda topilganlarning ishga joylashgani',
      percent(h.joylashtirilgan, h.topilganIshsiz),
      'foiz',
    ],
    [
      'ishsizlikka_tasir',
      "Ro'yxatdagi ishsizlarga nisbatan joylashtirilganlar",
      percent(h.joylashtirilgan, h.bazaIshsiz),
      'foiz',
    ],
    ['dalil_bilan_tasdiqlangan', 'Joylashtirishi dalil bilan tasdiqlanganlar', h.tasdiqlanganJoylashuv, 'kishi'],
    ['rasmiy_manba_bilan_tasdiqlangan', 'Shundan rasmiy manba bilan tasdiqlangan', h.rasmiyTasdiqlangan, 'kishi'],
    ['dalil_tekshiruvi_kutilmoqda', 'Dalili tekshiruvni kutayotgan joylashtirishlar', h.tekshiruvKutayotgan, 'kishi'],
    ['dalilsiz_joylashtirishlar', '30 kundan beri dalilsiz turgan joylashtirishlar', h.dalilsizJoylashuv, 'kishi'],
    ['faol_ish_elonlari', "Faol bo'sh ish o'rni e'lonlari", h.ochiqOrin, 'ta'],
    ['faol_ish_orinlari', "Faol e'lonlardagi ish o'rinlari (jami)", faolOrinlar, 'ta'],
    ['moderatsiya_kutayotgan_elonlar', "Moderatsiyani kutayotgan e'lonlar", h.moderatsiyaKutmoqda, 'ta'],
    ['muddati_otgan_topshiriqlar', "Muddati o'tgan topshiriqlar (chora-tadbirlar)", h.kechikkanTopshiriq, 'ta'],
    ['mahalla_xodimlari', 'Faol mahalla xodimlari (yettilik)', h.xodim, 'kishi'],
    ['botga_ulangan_xodimlar', 'Telegram botga ulangan xodimlar', h.ulanganXodim, 'kishi'],
    ['botga_ulanmagan_xodimlar', 'Telegram botga ulanmagan xodimlar', h.ulanmaganXodim, 'kishi'],

    /* ── Tahlil paneli ── */
    ['rad_etganlar', 'Taklifdan bosh tortganlar', radEtgan, 'kishi'],
    ['uzoq_muddatli_ishsizlar', '12 oydan ortiq ishsiz yurganlar', uzoqIshsiz, 'kishi'],
    [
      'mustahkamlash_tekshiruvi_kutilmoqda',
      "Joylashganiga 3 oy o'tib, hali tasdiqlanmaganlar",
      mustahkamlashKutayotgan,
      'kishi',
    ],
    ['moliyaviy_talab_jami', "Xonadonlar so'ragan moliyaviy yordam (jami)", Math.round(jamiTalab), "so'm"],
    ['bolalar_0_3_yosh', '0-3 yoshdagi bolalar (xatlov)', bolalar03, 'kishi'],
    ['bolalar_17_yoshgacha', '17 yoshgacha bolalar (xatlov)', bolalar03 + bolalar317, 'kishi'],
    ['bogcha_maktabdan_tashqarida', "Bog'cha va maktab qamrovidan tashqaridagi bolalar", qamrovsizBolalar, 'kishi'],
    ['chet_eldagi_ishchilar', 'Chet elda ishlayotganlar (xatlov)', s.chetElIshchilar, 'kishi'],
    ['chet_elda_ishchisi_bor_oilalar', "Chet elda a'zosi ishlayotgan oilalar", chetElOila, 'ta'],
    ['chet_eldan_oylik_pul', 'Chet eldan oilalarga oyiga keladigan pul', s.chetElOylikPulSom, "so'm"],
    ['it_vaucher_berilgan', 'IT-shaharcha vaucherlari (jami berilgan)', vaucher.jami, 'ta'],
    ['it_vaucher_natijali', 'Kursni tugatgan yoki ishga joylashgan vaucherlar', vaucher.natijali, 'ta'],
    ['it_vaucher_ishga_joylashgan', "Vaucher bilan o'qib ishga joylashganlar", vaucher.ishgaJoylashgan, 'kishi'],
    ['it_vaucher_navbatda', 'IT-vaucher istagi bor, lekin hali berilmaganlar', vaucher.navbatda, 'kishi'],
    [
      'kuzatuvdagi_joylashganlar',
      'Ish voqeasi yozilgan joylashgan fuqarolar (30/60/90 kuzatuv)',
      kuzatuv.joylashganFuqarolar,
      'kishi',
    ],

    /* ── Dinamika: bugun va so'nggi 7 kun — tablodan ── */
    ...dinamika('bugun', 'Bugun', tablo.bugun),
    ...dinamika('hafta', "So'nggi 7 kunda", tablo.hafta),

    /* ── Joriy oy (Toshkent vaqti bilan 1-sanadan) — `oyOqimi` izohiga qarang ── */
    ['oy_xatlov', "Joriy oyda xatlovdan o'tgan xonadonlar (xatlov sanasi bo'yicha)", oy.xatlov, 'ta'],
    ['oy_yangi_anketa', "Joriy oyda anketasi to'ldirilgan ishsizlar", oy.anketa, 'kishi'],
    [
      'oy_joylashtirilgan',
      "Joriy oyda ishga joylashtirilganlar (ishga kirgan sanasi bo'yicha)",
      oy.joylashtirilgan,
      'kishi',
    ],
  ];

  /*
   * 90 kunlik ishda qolish — faqat javobi MA'LUM bo'lganlar bo'lsa.
   * Panel bu holatda "—" ko'rsatadi; bu yerda esa son bo'lishi shart,
   * shuning uchun 0 deb yolg'on aytgandan ko'ra ko'rsatkich chiqmaydi.
   */
  if (kuzatuv90 && kuzatuv90.qolishDarajasi !== null) {
    qatorlar.push([
      'ishda_qolish_90_kun',
      "90 kundan keyin ishda qolganlar (javobi ma'lumlar orasida)",
      Math.round(kuzatuv90.qolishDarajasi * 1000) / 10,
      'foiz',
    ]);
  }

  const korsatkichlar = qatorlar.map(([kalit, nomi, qiymat, birlik]) =>
    korsatkich(kalit, nomi, qiymat, birlik)
  );

  // ─────────────────────────────────────────────────────────
  //  JADVALLAR
  // ─────────────────────────────────────────────────────────

  const XATLOV_USTUNLARI = [
    'Mahalla',
    'Xatlov qamrovi (foiz)',
    "Xatlovdan o'tgan xonadon",
    'Xonadonlar (svod jadvali)',
    'Xatlovda topilgan ishsiz',
    'Joylashtirilgan',
  ];
  const xatlovQatori = (q: (typeof mahallaQatorlari)[number]) => [
    q.nomi,
    q.qamrov,
    q.xatlov,
    q.bazaXonadon,
    q.topilgan,
    q.joylashgan,
  ];

  const jadvallar: IdrokJadval[] = [
    jadval(
      'Mahallalar kesimida xatlov: eng yuqori qamrov',
      XATLOV_USTUNLARI,
      [...mahallaQatorlari]
        .sort((a, b) => b.qamrov - a.qamrov || b.xatlov - a.xatlov || a.nomi.localeCompare(b.nomi))
        .map(xatlovQatori)
    ),
    jadval(
      'Mahallalar kesimida xatlov: eng past qamrov (orqada qolganlar)',
      XATLOV_USTUNLARI,
      [...mahallaQatorlari]
        .sort((a, b) => a.qamrov - b.qamrov || b.bazaXonadon - a.bazaXonadon || a.nomi.localeCompare(b.nomi))
        .map(xatlovQatori)
    ),
    jadval(
      'Mahallalar kesimida ishga joylashtirish',
      ['Mahalla', 'Joylashtirilgan', 'Anketasi bor ishsiz', "Ro'yxatdagi ishsiz (svod)", "Ro'yxatdagilarga nisbatan (foiz)"],
      [...mahallaQatorlari]
        .sort((a, b) => b.joylashgan - a.joylashgan || b.aniqlangan - a.aniqlangan || a.nomi.localeCompare(b.nomi))
        .map((q) => [q.nomi, q.joylashgan, q.aniqlangan, q.bazaIshsiz, q.natija])
    ),
    jadval(
      "So'nggi 7 kunda eng faol mahallalar (tablo)",
      ['Mahalla', "Xatlovdan o'tgan xonadon"],
      tablo.saf.map((m) => [nomlar.get(m.mahallaId) ?? lotinga(m.nomiKirill), m.xonadon])
    ),
    jadval(
      "So'nggi 14 kunlik xatlov oqimi (tablo)",
      ['Sana', "Xatlovdan o'tgan xonadon"],
      tablo.oqim.map((k) => [toshkentSanasi(k.sana), k.xonadon])
    ),
    jadval(
      'Bandlik zanjiri (voronka)',
      ['Bosqich', 'Fuqarolar soni', 'Xatlovda topilganlarga nisbatan (foiz)'],
      voronka
    ),
    jadval(
      "Muddati o'tgan topshiriqlar: mas'ul tashkilot kesimida",
      ["Mas'ul tashkilot", "Muddati o'tgan topshiriqlar"],
      Array.from(tashkilotlar.entries()).sort(kamayish)
    ),
    jadval(
      "Moliyaviy yordam talabi: yo'nalishlar kesimida",
      ["Yo'nalish", "Talab qilingan mablag' (so'm)", 'Oilalar soni'],
      Array.from(yonalishlar.entries())
        .map(([nom, j]) => [nom, Math.round(j.summa), j.oila] as [string, number, number])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    ),
    jadval(
      'Kasb-hunar kursiga talab',
      ['Kasb', 'Fuqarolar soni'],
      Array.from(kasblar.entries()).sort(kamayish)
    ),
    jadval(
      "Faol ish o'rni e'lonlari: soha kesimida",
      ['Soha', "Ish o'rinlari", "E'lonlar soni"],
      Array.from(sohalar.entries())
        .map(([nom, j]) => [nom, j.orin, j.elon] as [string, number, number])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    ),
    jadval(
      'IT-shaharcha vaucherlari: holat kesimida',
      ['Holat', 'Vaucherlar soni'],
      vaucher.holatlar.map((v) => [vaucherHolatNomi(v.holati), v.soni])
    ),
    jadval(
      "IT-shaharcha vaucherlari: yo'nalish kesimida",
      ["Yo'nalish", 'Vaucherlar soni'],
      Array.from(vaucherYonalish.entries()).sort(kamayish)
    ),
    jadval(
      'Barqaror bandlik: 30/60/90 kunlik kuzatuv',
      ['Bosqich', 'Muddati yetganlar', 'Ishda qolgan', 'Ishdan ketgan', "Noma'lum"],
      kuzatuv.bosqichlar.map((b) => [`${b.kun} kun`, b.kohort, b.qolgan, b.ketgan, b.nomalum])
    ),
    jadval(
      "Alohida e'tibor talab qiladigan toifalar (svod jadvali)",
      ['Toifa', 'Soni'],
      [
        ['Ayollar daftarida', mahallalar.reduce((t, m) => t + m.ayollarDaftari, 0)],
        ['Ijtimoiy reestrda', mahallalar.reduce((t, m) => t + m.ijtimoiyReestr, 0)],
        ['Migratsiyadan qaytganlar', mahallalar.reduce((t, m) => t + m.migratsiyadanQaytgan, 0)],
        ["Oliy ta'lim bitiruvchilari", mahallalar.reduce((t, m) => t + m.oliyBitiruvchi, 0)],
        ["O'rta maxsus ta'lim bitiruvchilari", mahallalar.reduce((t, m) => t + m.ortaMaxsusBitiruvchi, 0)],
      ]
    ),
  ];

  return {
    manba: IDROK_MANBA,
    nomi: IDROK_NOMI,
    vaqt: new Date().toISOString(),
    korsatkichlar,
    jadvallar,
    havolalar: {
      mahallalar: mahallalar.map((m) => ({ nomi: m.nomi, id: String(m.id) })),
      sahifalar: {
        ishsizlar: '/ishsizlar?mahalla={mahalla}',
        xonadonlar: '/xonadonlar?mahalla={mahalla}',
        xatlov: '/xatlov',
        ish_orinlari: '/ish-orinlari',
        tablo: '/tablo',
        panel: '/panel',
      },
    },
  };
}
