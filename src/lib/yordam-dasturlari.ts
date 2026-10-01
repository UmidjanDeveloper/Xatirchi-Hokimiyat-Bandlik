import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { Sessiya } from './auth';
import { prisma } from './prisma';
import { sanaOrali } from './oila-rejasi';
import {
  YORDAM_ESKIRISH_KUNI,
  YORDAM_MUDDAT_OGOHI_KUNI,
  type DasturHolati,
} from './yordam-nomlari';

/**
 * ============================================================
 *  YORDAM DASTURLARI KATALOGI
 *
 *  Davlat va mahalliy yordam dasturlari: nomi, kimlar uchun, talablar,
 *  hujjatlar, mas'ul tashkilot, RASMIY MANBA, amal qilish muddati va oxirgi
 *  tekshirilgan sana.
 *
 *  ── Beshta qoida ──
 *
 *  1. KATALOG BO'SH BOSHLANADI. Dastur, talab va miqdorni faqat xodim
 *     rasmiy manbadan kiritadi; tizim o'zi dastur yoki summa to'qimaydi.
 *
 *  2. MANBASIZ DASTUR YO'Q. Rasmiy manba va oxirgi tekshirilgan sana har
 *     yozuvda majburiy.
 *
 *  3. AMALDAGI TAVSIYA - SHARTLI. Dastur faqat yopilmagan, muddati
 *     tugamagan, hali boshlangan va oxirgi marta YORDAM_ESKIRISH_KUNI
 *     kundan kam oldin manbadan tekshirilgan bo'lsa chiqadi. Muddati tugagan
 *     yoki uzoq tekshirilmagan dastur tavsiya qilinmaydi.
 *
 *  4. NOMA'LUM MUDDAT != CHEKSIZ. Manbada muddat ko'rsatilmagan bo'lsa
 *     (null) - u "cheksiz" emas, "noma'lum": ekranda ogohlantirish bilan.
 *
 *  5. TAHRIR = TEKSHIRUV EMAS. Matnni tahrirlash "manbadan tekshirildi"
 *     degani emas: tekshirish alohida, ongli amal.
 *
 *  Tizim fuqaroning dasturga HUQUQINI hisoblamaydi: talablar matn sifatida
 *  ko'rsatiladi, qaror xodimniki.
 * ============================================================
 */

export class YordamXatosi extends Error {
  constructor(
    public readonly kod: 'TOPILMADI' | 'NOTOGRI' | 'HOLAT',
    xabar: string
  ) {
    super(xabar);
  }
}

export const YORDAM_HTTP: Record<YordamXatosi['kod'], number> = {
  TOPILMADI: 404,
  NOTOGRI: 400,
  HOLAT: 409,
};

/* Nomlar `yordam-nomlari.ts` da: brauzer komponentlari ularni olishi kerak, bu fayl esa bazaga ulanadi. */
export * from './yordam-nomlari';

const KUN_MS = 24 * 60 * 60 * 1000;

/* ══════════════════════════════════════════════════════════════
 *  TOZA FUNKSIYALAR
 * ══════════════════════════════════════════════════════════════ */

export interface DasturSanalari {
  faol: boolean;
  amalQilishBoshi: Date | null;
  amalQilishOxiri: Date | null;
  tekshirilganSana: Date;
}

/**
 * Dastur holati. Ustuvorlik: yopiq > muddati tugagan > hali boshlanmagan >
 * eskirgan > amalda.
 */
export function dasturHolati(d: DasturSanalari, hozir = new Date()): DasturHolati {
  if (!d.faol) return 'YOPIQ';
  if (d.amalQilishOxiri && sanaOrali(hozir, d.amalQilishOxiri) > 0) return 'MUDDATI_TUGAGAN';
  if (d.amalQilishBoshi && sanaOrali(hozir, d.amalQilishBoshi) < 0) return 'HALI_BOSHLANMAGAN';
  if (sanaOrali(hozir, d.tekshirilganSana) > YORDAM_ESKIRISH_KUNI) return 'ESKIRGAN';
  return 'AMALDA';
}

/** Faqat "amalda" dastur tavsiya sifatida chiqadi */
export function tavsiyaQilinadimi(d: DasturSanalari, hozir = new Date()): boolean {
  return dasturHolati(d, hozir) === 'AMALDA';
}

/** Tekshirish kerak: eskirgan, muddati tugagan-u yopilmagan yoki muddati yaqin tugaydigan faol dastur */
export function tekshirishKerakmi(
  d: DasturSanalari,
  hozir = new Date()
): null | 'eskirgan' | 'muddati-tugagan' | 'muddati-yaqin' {
  if (!d.faol) return null;
  const h = dasturHolati(d, hozir);
  if (h === 'MUDDATI_TUGAGAN') return 'muddati-tugagan';
  if (h === 'ESKIRGAN') return 'eskirgan';
  if (d.amalQilishOxiri) {
    const q = sanaOrali(d.amalQilishOxiri, hozir);
    if (q >= 0 && q <= YORDAM_MUDDAT_OGOHI_KUNI) return 'muddati-yaqin';
  }
  return null;
}

/* ── Sxemalar ── */

const MATN = (min: number, max: number) => z.string().trim().min(min).max(max);
const SANA = z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), 'Сана нотўғри');

const DasturAsosi = z.object({
  nomi: MATN(3, 150),
  nishonGuruh: MATN(3, 300),
  talablar: MATN(3, 1000),
  hujjatlar: MATN(2, 500).nullish(),
  masulTashkilot: MATN(2, 150),
  /* Rasmiy manba majburiy: manbasiz dastur yozilmaydi */
  rasmiyManba: MATN(3, 300),
  miqdori: MATN(2, 300).nullish(),
  amalQilishBoshi: SANA.nullish(),
  amalQilishOxiri: SANA.nullish(),
});

export const DasturYaratishSxemasi = DasturAsosi.extend({
  /* Bo'sh bo'lsa - bugun (manbadan hozir olingan ma'lumot) */
  tekshirilganSana: SANA.optional(),
});

export const DasturAmaliSxemasi = z.discriminatedUnion('amal', [
  z.object({ amal: z.literal('tekshirildi'), rasmiyManba: MATN(3, 300).optional() }),
  z.object({ amal: z.literal('tahrir'), maydonlar: DasturAsosi.partial() }),
  z.object({ amal: z.literal('yopish'), sabab: MATN(3, 300) }),
  z.object({ amal: z.literal('qaytarish') }),
]);

export type DasturAmali = z.infer<typeof DasturAmaliSxemasi>;

/** Maydonlar orasidagi qoidalar; xato bo'lsa matn qaytadi */
export function dasturniTekshir(
  d: { amalQilishBoshi?: Date | null; amalQilishOxiri?: Date | null; tekshirilganSana?: Date },
  hozir = new Date()
): string | null {
  if (d.amalQilishBoshi && d.amalQilishOxiri && sanaOrali(d.amalQilishOxiri, d.amalQilishBoshi) < 0) {
    return 'Тугаш санаси бошланиш санасидан олдин бўлиши мумкин эмас';
  }
  if (d.tekshirilganSana && sanaOrali(d.tekshirilganSana, hozir) > 0) {
    return 'Текширилган сана келажакда бўлиши мумкин эмас';
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════
 *  BAZA
 * ══════════════════════════════════════════════════════════════ */

type Kim = Pick<Sessiya, 'userId'>;

export async function dasturYaratish(
  kim: Kim,
  d: z.infer<typeof DasturYaratishSxemasi>,
  hozir = new Date()
): Promise<{ id: string }> {
  const tekshirilgan = d.tekshirilganSana ?? hozir;
  const xato = dasturniTekshir({ ...d, tekshirilganSana: tekshirilgan }, hozir);
  if (xato) throw new YordamXatosi('NOTOGRI', xato);

  return prisma.yordamDasturi.create({
    data: {
      nomi: d.nomi,
      nishonGuruh: d.nishonGuruh,
      talablar: d.talablar,
      hujjatlar: d.hujjatlar ?? null,
      masulTashkilot: d.masulTashkilot,
      rasmiyManba: d.rasmiyManba,
      miqdori: d.miqdori ?? null,
      amalQilishBoshi: d.amalQilishBoshi ?? null,
      amalQilishOxiri: d.amalQilishOxiri ?? null,
      tekshirilganSana: tekshirilgan,
      tekshirganId: kim.userId,
      yaratganId: kim.userId,
    },
    select: { id: true },
  });
}

export async function dasturAmali(
  kim: Kim,
  id: string,
  a: DasturAmali,
  hozir = new Date()
): Promise<{ ok: true }> {
  const d = await prisma.yordamDasturi.findUnique({ where: { id } });
  if (!d) throw new YordamXatosi('TOPILMADI', 'Дастур топилмади');

  switch (a.amal) {
    case 'tekshirildi': {
      if (!d.faol) throw new YordamXatosi('HOLAT', 'Дастур ёпилган — аввал қайта очинг');
      await prisma.yordamDasturi.update({
        where: { id },
        data: {
          tekshirilganSana: hozir,
          tekshirganId: kim.userId,
          ...(a.rasmiyManba ? { rasmiyManba: a.rasmiyManba } : {}),
        },
      });
      return { ok: true };
    }

    case 'tahrir': {
      const m = a.maydonlar;
      const xato = dasturniTekshir(
        {
          amalQilishBoshi: m.amalQilishBoshi !== undefined ? m.amalQilishBoshi : d.amalQilishBoshi,
          amalQilishOxiri: m.amalQilishOxiri !== undefined ? m.amalQilishOxiri : d.amalQilishOxiri,
        },
        hozir
      );
      if (xato) throw new YordamXatosi('NOTOGRI', xato);

      const data: Prisma.YordamDasturiUpdateInput = {};
      if (m.nomi !== undefined) data.nomi = m.nomi;
      if (m.nishonGuruh !== undefined) data.nishonGuruh = m.nishonGuruh;
      if (m.talablar !== undefined) data.talablar = m.talablar;
      if (m.hujjatlar !== undefined) data.hujjatlar = m.hujjatlar;
      if (m.masulTashkilot !== undefined) data.masulTashkilot = m.masulTashkilot;
      if (m.rasmiyManba !== undefined) data.rasmiyManba = m.rasmiyManba;
      if (m.miqdori !== undefined) data.miqdori = m.miqdori;
      if (m.amalQilishBoshi !== undefined) data.amalQilishBoshi = m.amalQilishBoshi;
      if (m.amalQilishOxiri !== undefined) data.amalQilishOxiri = m.amalQilishOxiri;
      if (Object.keys(data).length === 0) throw new YordamXatosi('NOTOGRI', 'Ўзгартириш йўқ');
      /* Tahrir "manbadan tekshirildi" degani EMAS: tekshirilgan sana yangilanmaydi */
      await prisma.yordamDasturi.update({ where: { id }, data });
      return { ok: true };
    }

    case 'yopish': {
      const n = await prisma.yordamDasturi.updateMany({
        where: { id, faol: true },
        data: { faol: false, yopilganSana: hozir, yopilishSababi: a.sabab },
      });
      if (n.count === 0) throw new YordamXatosi('HOLAT', 'Дастур аллақачон ёпилган');
      return { ok: true };
    }

    case 'qaytarish': {
      /*
       * Qayta ochilgan dastur yangi tekshiruvsiz "amalda" bo'lib qolmasin:
       * tekshirilgan sana o'zgarmaydi, eskirgan bo'lsa xodim "Manbadan tekshirildi"
       * bosadi.
       */
      const n = await prisma.yordamDasturi.updateMany({
        where: { id, faol: false },
        data: { faol: true, yopilganSana: null, yopilishSababi: null },
      });
      if (n.count === 0) throw new YordamXatosi('HOLAT', 'Дастур ёпилмаган');
      return { ok: true };
    }
  }
}

export interface DasturQatori {
  id: string;
  nomi: string;
  nishonGuruh: string;
  talablar: string;
  hujjatlar: string | null;
  masulTashkilot: string;
  rasmiyManba: string;
  miqdori: string | null;
  amalQilishBoshi: Date | null;
  amalQilishOxiri: Date | null;
  tekshirilganSana: Date;
  faol: boolean;
  yopilishSababi: string | null;
  holati: DasturHolati;
}

const TANLOV = {
  id: true,
  nomi: true,
  nishonGuruh: true,
  talablar: true,
  hujjatlar: true,
  masulTashkilot: true,
  rasmiyManba: true,
  miqdori: true,
  amalQilishBoshi: true,
  amalQilishOxiri: true,
  tekshirilganSana: true,
  faol: true,
  yopilishSababi: true,
} satisfies Prisma.YordamDasturiSelect;

/** Barcha dasturlar (holati bilan), yangisi avval */
export async function dasturlarRoyxati(hozir = new Date(), take = 200): Promise<DasturQatori[]> {
  const r = await prisma.yordamDasturi.findMany({ orderBy: { createdAt: 'desc' }, take, select: TANLOV });
  return r.map((d) => ({ ...d, holati: dasturHolati(d, hozir) }));
}

/** Faqat AMALDAGI dasturlar: tavsiya sifatida shu chiqadi */
export async function amaldagiDasturlar(hozir = new Date(), take = 20): Promise<DasturQatori[]> {
  const r = await prisma.yordamDasturi.findMany({
    where: {
      faol: true,
      /* Taxminiy pastki chegara; aniq tekshiruv kodda (Toshkent kuni) */
      tekshirilganSana: { gte: new Date(hozir.getTime() - (YORDAM_ESKIRISH_KUNI + 2) * KUN_MS) },
    },
    orderBy: { nomi: 'asc' },
    take: 100,
    select: TANLOV,
  });
  return r
    .map((d) => ({ ...d, holati: dasturHolati(d, hozir) }))
    .filter((d) => d.holati === 'AMALDA')
    .slice(0, take);
}

export interface YordamKorsatkichlari {
  jami: number;
  amalda: number;
  eskirgan: number;
  muddatiTugagan: number;
  haliBoshlanmagan: number;
  yopiq: number;
  /** Tekshirish kerak: eskirgan + muddati tugagan-u yopilmagan + muddati yaqin */
  tekshirishKerak: number;
}

export function yordamKorsatkichlarniHisobla(
  qatorlar: DasturSanalari[],
  hozir = new Date()
): YordamKorsatkichlari {
  const k: YordamKorsatkichlari = {
    jami: qatorlar.length,
    amalda: 0,
    eskirgan: 0,
    muddatiTugagan: 0,
    haliBoshlanmagan: 0,
    yopiq: 0,
    tekshirishKerak: 0,
  };
  for (const d of qatorlar) {
    const h = dasturHolati(d, hozir);
    if (h === 'AMALDA') k.amalda++;
    else if (h === 'ESKIRGAN') k.eskirgan++;
    else if (h === 'MUDDATI_TUGAGAN') k.muddatiTugagan++;
    else if (h === 'HALI_BOSHLANMAGAN') k.haliBoshlanmagan++;
    else k.yopiq++;
    if (tekshirishKerakmi(d, hozir)) k.tekshirishKerak++;
  }
  return k;
}

export async function yordamKorsatkichlari(hozir = new Date()): Promise<YordamKorsatkichlari> {
  const r = await prisma.yordamDasturi.findMany({
    select: { faol: true, amalQilishBoshi: true, amalQilishOxiri: true, tekshirilganSana: true },
  });
  return yordamKorsatkichlarniHisobla(r, hozir);
}

/** Tekshirish kerak bo'lgan dasturlar (vazifalar taxtasi uchun) */
export async function tekshirishKerakDasturlar(hozir = new Date(), take = 200) {
  const r = await prisma.yordamDasturi.findMany({
    where: { faol: true },
    orderBy: { tekshirilganSana: 'asc' },
    take,
    select: { id: true, nomi: true, faol: true, amalQilishBoshi: true, amalQilishOxiri: true, tekshirilganSana: true },
  });
  return r
    .map((d) => ({ ...d, sabab: tekshirishKerakmi(d, hozir) }))
    .filter((d): d is typeof d & { sabab: NonNullable<typeof d.sabab> } => d.sabab !== null);
}
