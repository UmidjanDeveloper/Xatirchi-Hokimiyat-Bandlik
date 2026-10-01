import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { AloqaUsuli, RejaHolati, RejaTosigi } from '@prisma/client';
import { KUN_MS } from './bandlik-holatlari';
import { mahallagaRuxsat, type Sessiya } from './auth';
import { prisma } from './prisma';
import { tashkilotNormal } from './masul-tashkilot';

/**
 * ============================================================
 *  OILAVIY RIVOJLANISH REJASI
 *
 *  Xatlov oilaning ahvolini yozib oladi, chora-tadbir alohida
 *  topshiriqlarni. Reja ularni bitta joyga yig'adi: "bu oila
 *  bilan nima qilmoqchimiz, nega va kim?"
 *
 *  ── Uchta qoida, ular buzilsa reja yolg'on gapira boshlaydi ──
 *
 *  1. NOMA'LUM NOLGA AYLANMAYDI. Xatlovda daromad kiritilmagan
 *     bo'lsa, boshlang'ich holatda "noma'lum" deb yoziladi,
 *     "0 so'm" emas. Nol - "daromadi yo'q" degan da'vo, noma'lum
 *     esa "so'ralmagan" - bular boshqa-boshqa narsa.
 *
 *  2. XODIM QAYDI FUQAROning MUSTAQIL TASDIG'I EMAS. Oilaning
 *     fikri telefon, uchrashuv yoki tashrifda xodim tomonidan
 *     yozib olinadi. Shuning uchun aloqa yozuvida usul, vaqt va
 *     yozgan xodim doim ko'rinadi va "tasdiqlangan" degan
 *     maydon umuman yo'q.
 *
 *  3. HAR OILAGA BIR XIL KURS YOKI KREDIT TAVSIYA QILINMAYDI.
 *     Qadamlarni xodim o'zi yozadi; tizim shablon qadam
 *     yaratmaydi. To'siqlar ro'yxati xodimga "bu oilada nima
 *     xalaqit beryapti" deb eslatadi, yechimni esa tanlab
 *     bermaydi.
 * ============================================================
 */

/* Nomlar `oila-rejasi-nomlari.ts` da: brauzer komponentlari ularni olishi kerak, bu fayl esa bazaga ulanadi. */
export * from './oila-rejasi-nomlari';
import { TOSIQ_TARTIBI } from './oila-rejasi-nomlari';

/* ── Ma'lumot tekshiruvi ── */

const bosh = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((x) => {
      const t = x?.trim();
      return t ? t : null;
    });

/*
 * Identifikator: `cuid()` DEB TEKSHIRILMAYDI.
 *
 * Bazadagi ba'zi yozuvlarning id si cuid emas (import qilingan yoki
 * qo'lda yaratilgan). Qat'iy `cuid()` shularni "noto'g'ri ma'lumot"
 * deb rad etardi. Yozuv baribir bazadan izlanadi va topilmasa 404
 * qaytadi, shuning uchun bu yerda faqat uzunlik va turi cheklanadi.
 */
export const ID = z.string().min(1).max(64);

const sana = z.coerce.date();

const TOSIQLAR = z.array(z.enum(TOSIQ_TARTIBI as [RejaTosigi, ...RejaTosigi[]])).max(9);

/** Yangi reja: faqat qaysi oila va boshlang'ich holat majburiy */
export const RejaYaratishSxemasi = z.object({
  householdId: ID,
  boshlangichHolat: z.string().trim().min(5, 'Boshlang‘ich holatni yozing').max(2000),
  boshlangichManba: bosh(200),
  boshlangichSana: sana.optional(),
});

export const RejaYangilashSxemasi = z
  .object({
    maqsad: bosh(1000),
    maqsadKelishilgan: z.boolean(),
    resurslar: bosh(1000),
    tosiqlar: TOSIQLAR,
    tosiqIzohi: bosh(1000),
    masulXodimId: ID.nullish(),
    masulTashkilot: z
      .string()
      .trim()
      .max(100)
      .nullish()
      .transform((x) => (x ? tashkilotNormal(x) : null)),
    muddat: sana.nullish(),
    zarurResurs: bosh(1000),
    keyingiAloqaSanasi: sana.nullish(),
    boshlangichHolat: z.string().trim().min(5).max(2000),
  })
  .partial();

export const RejaYopishSxemasi = z.object({
  holati: z.enum(['TUGALLANDI', 'TOXTATILDI']),
  /* Nega yopilgani yozilmasa, keyin hech kim bilmaydi. */
  yopilishIzohi: z.string().trim().min(5, 'Yopish sababini yozing').max(1000),
  natijaDalili: bosh(1000),
});

export const AloqaSxemasi = z.object({
  usul: z.enum(['TELEFON', 'UCHRASHUV', 'TASHRIF']),
  aloqaVaqti: sana,
  kimBilan: bosh(200),
  mazmun: z.string().trim().min(3, 'Nima haqida gaplashilganini yozing').max(2000),
  fuqaroFikri: bosh(2000),
  keyingiAloqaSanasi: sana.nullish(),
});

/** Rejaning yangi qadami - chora-tadbir sifatida yoziladi */
export const QadamSxemasi = z.object({
  muammo: z.string().trim().min(5).max(500),
  yechim: z.string().trim().min(5).max(500),
  masulTashkilot: z.string().trim().min(2).max(100).transform(tashkilotNormal),
  masulXodimId: ID.nullish(),
  muddat: sana,
  zarurResurs: bosh(500),
});

/* ── Sana yordamchilari ── */

/** Aloqa sanasi kelajakdan uzoq bo'lsa - xato yozilgan ehtimoli yuqori */
export const ENG_UZOQ_KELAJAK_KUN = 400;

/**
 * Ikki sana orasidagi KUN farqi (a - b), TOSHKENT kuni bo'yicha.
 *
 * UTC bo'yicha hisoblansa, kechqurun soat 19:00 dan keyin (Toshkentda
 * allaqachon ertangi kun) "bugun" va "kechikdi" bir kunga adashardi.
 * O'zbekiston UTC+5, yozgi vaqt yo'q.
 */
export function sanaOrali(a: Date, b: Date): number {
  const SIL = 5 * 60 * 60 * 1000;
  const x = new Date(a.getTime() + SIL);
  const y = new Date(b.getTime() + SIL);
  return Math.round(
    (Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) -
      Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate())) /
      KUN_MS
  );
}

/**
 * Aloqa vaqti kelajakda bo'lishi mumkin emas: bu yozuv "bo'lib
 * o'tgan aloqa" haqida. Rejalashtirilgan aloqa uchun alohida
 * maydon bor (`keyingiAloqaSanasi`).
 */
export function aloqaVaqtiYaroqlimi(vaqt: Date, hozir = new Date()): boolean {
  if (Number.isNaN(vaqt.getTime())) return false;
  /* 1 soat zaxira: telefon soati biroz oldinda bo'lishi mumkin */
  return vaqt.getTime() <= hozir.getTime() + 60 * 60 * 1000;
}

export function keyingiSanaYaroqlimi(s: Date, hozir = new Date()): boolean {
  if (Number.isNaN(s.getTime())) return false;
  return sanaOrali(s, hozir) <= ENG_UZOQ_KELAJAK_KUN;
}

/* ── Aloqa muddati holati ── */

export type AloqaMuddati = 'belgilanmagan' | 'otgan' | 'bugun' | 'yaqin' | 'rejalangan';

export function aloqaMuddati(keyingi: Date | null, hozir = new Date()): AloqaMuddati {
  if (!keyingi) return 'belgilanmagan';
  const f = sanaOrali(keyingi, hozir);
  if (f < 0) return 'otgan';
  if (f === 0) return 'bugun';
  if (f <= 3) return 'yaqin';
  return 'rejalangan';
}

/* ── Rejaning to'liqligi ── */

export interface ToliqlikManbai {
  maqsad: string | null;
  maqsadKelishilgan: boolean;
  tosiqlar: RejaTosigi[];
  masulXodimId: string | null;
  masulTashkilot: string | null;
  muddat: Date | null;
  keyingiAloqaSanasi: Date | null;
  qadamlarSoni: number;
  aloqalarSoni: number;
}

/**
 * Reja nimasi yetishmasligini aytadi.
 *
 * "To'liq emas" - xato emas, ish ro'yxati: xodim nimani
 * to'ldirishi kerakligini ko'radi. Reja to'liq bo'lmasa ham
 * saqlanadi: xodim eshik oldida bir qismini yozib, qolganini
 * keyin to'ldirishi mumkin.
 */
export function rejaYetishmasligi(r: ToliqlikManbai): string[] {
  const y: string[] = [];
  if (!r.maqsad) y.push('Оила билан мақсад ёзилмаган');
  else if (!r.maqsadKelishilgan) y.push('Мақсад оила билан ҳали келишилмаган');
  if (r.tosiqlar.length === 0) y.push('Тўсиқлар белгиланмаган');
  if (r.qadamlarSoni === 0) y.push('Биронта қадам йўқ');
  if (!r.masulXodimId && !r.masulTashkilot) y.push('Масъул кўрсатилмаган');
  if (!r.muddat) y.push('Режа муддати қўйилмаган');
  if (!r.keyingiAloqaSanasi) y.push('Кейинги алоқа санаси қўйилмаган');
  if (r.aloqalarSoni === 0) y.push('Оила билан алоқа ҳали қайд этилмаган');
  return y;
}

/* ── Boshlang'ich holat matni ── */

export interface BoshlangichManbasi {
  jamiAzo: number;
  bolalar0_3Yosh: number;
  bolalar3_17Yosh: number;
  bolalar18Yoshdan: number;
  mehnatgaLayoqatli: number;
  ishlaydiganlar: number;
  ishsizlarSoni: number;
  /** `null` - xatlovda kiritilmagan. NOL EMAS. */
  oylikDaromad: bigint | number | null;
  createdAt: Date;
  holati: string;
}

function sanaYozuvi(d: Date): string {
  const t = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  const kun = String(t.getUTCDate()).padStart(2, '0');
  const oy = String(t.getUTCMonth() + 1).padStart(2, '0');
  return `${kun}.${oy}.${t.getUTCFullYear()}`;
}

/**
 * Xatlov ma'lumotidan boshlang'ich holat matnini tuzadi.
 *
 * Xodim uni tahrir qiladi - bu faqat boshlang'ich nuqta. Matn
 * qayerdan olinganini va qaysi sanaga tegishliligini o'zi aytadi,
 * shuning uchun keyin "bu raqam qaysi xatlovdan?" deb so'ralmaydi.
 */
export function boshlangichMatn(h: BoshlangichManbasi): { matn: string; manba: string; sana: Date } {
  const qismlar: string[] = [];
  qismlar.push(`Оилада ${h.jamiAzo} нафар аъзо`);

  const bolalar = h.bolalar0_3Yosh + h.bolalar3_17Yosh + h.bolalar18Yoshdan;
  if (bolalar > 0) {
    qismlar.push(
      `шундан ${bolalar} нафар фарзанд (0–3 ёш: ${h.bolalar0_3Yosh}, 3–17 ёш: ${h.bolalar3_17Yosh}, 18 ёшдан катта: ${h.bolalar18Yoshdan})`
    );
  }

  qismlar.push(`меҳнатга лаёқатли ${h.mehnatgaLayoqatli} нафар`);
  qismlar.push(`ишлайдиган ${h.ishlaydiganlar} нафар`);
  qismlar.push(`ишсиз ${h.ishsizlarSoni} нафар`);

  /* Daromad kiritilmagan bo'lsa - NOMA'LUM. 0 deb yozilmaydi. */
  if (h.oylikDaromad === null || h.oylikDaromad === undefined) {
    qismlar.push('ойлик даромад — маълум эмас (хатловда кўрсатилмаган)');
  } else {
    qismlar.push(`ойлик даромад — ${Number(h.oylikDaromad).toLocaleString('ru-RU')} сўм (хатловда айтилган)`);
  }

  return {
    matn: qismlar.join(', ') + '.',
    manba: `Хатлов, ${sanaYozuvi(h.createdAt)}`,
    sana: h.createdAt,
  };
}

/* ── Baza amallari ── */

export class RejaXatosi extends Error {
  constructor(
    public readonly kod: 'MAVJUD' | 'TOPILMADI' | 'YOPIQ' | 'NOTOGRI' | 'RUXSAT',
    xabar: string
  ) {
    super(xabar);
  }
}

type Mijoz = typeof prisma | Prisma.TransactionClient;

/**
 * Yangi reja ochadi. Bitta oilada faqat BITTA faol reja bo'ladi.
 *
 * Tekshiruv ikki qavat: avval kod (xodimga tushunarli xabar), keyin
 * bazaning unikal cheklovi (ikki xodim bir vaqtda ochsa - ikkinchisini
 * BAZA to'xtatadi). Faqat kodga tayansak, poyga holatida ikkita faol
 * reja paydo bo'lardi.
 */
export async function rejaOchish(
  d: {
    householdId: string;
    yaratganId: string;
    boshlangichHolat: string;
    boshlangichManba: string | null;
    boshlangichSana?: Date;
  },
  mijoz: Mijoz = prisma
) {
  const bor = await mijoz.oilaRejasi.findFirst({
    where: { householdId: d.householdId, holati: 'FAOL' },
    select: { id: true },
  });
  if (bor) throw new RejaXatosi('MAVJUD', 'Бу оилада фаол режа аллақачон бор');

  try {
    return await mijoz.oilaRejasi.create({
      data: {
        householdId: d.householdId,
        yaratganId: d.yaratganId,
        masulXodimId: d.yaratganId,
        boshlangichHolat: d.boshlangichHolat,
        boshlangichManba: d.boshlangichManba,
        ...(d.boshlangichSana ? { boshlangichSana: d.boshlangichSana } : {}),
        holati: 'FAOL',
        faolBelgi: true,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new RejaXatosi('MAVJUD', 'Бу оилада фаол режа аллақачон бор');
    }
    throw e;
  }
}

/**
 * Aloqa yozadi va (berilgan bo'lsa) keyingi aloqa sanasini yangilaydi.
 *
 * Bir xil yozuv 5 daqiqa ichida qayta kelsa - yangisi yaratilmaydi
 * (ikki marta bosish, sekin internet). Aks holda reja tarixida bir
 * qo'ng'iroq ikki marta turardi va "oila bilan nechta aloqa bo'ldi"
 * degan son yolg'on bo'lardi.
 */
export async function aloqaYozish(
  rejaId: string,
  qaydEtganId: string,
  d: {
    usul: AloqaUsuli;
    aloqaVaqti: Date;
    kimBilan: string | null;
    mazmun: string;
    fuqaroFikri: string | null;
    keyingiAloqaSanasi?: Date | null;
  },
  hozir = new Date()
): Promise<{ id: string; takror: boolean }> {
  return prisma.$transaction(async (tx) => {
    const reja = await tx.oilaRejasi.findUnique({
      where: { id: rejaId },
      select: { id: true, holati: true },
    });
    if (!reja) throw new RejaXatosi('TOPILMADI', 'Режа топилмади');
    if (reja.holati !== 'FAOL') throw new RejaXatosi('YOPIQ', 'Режа ёпилган — алоқа қўшиб бўлмайди');

    const takror = await tx.oilaAloqasi.findFirst({
      where: {
        rejaId,
        qaydEtganId,
        usul: d.usul,
        aloqaVaqti: d.aloqaVaqti,
        mazmun: d.mazmun,
        createdAt: { gte: new Date(hozir.getTime() - 5 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (takror) return { id: takror.id, takror: true };

    const a = await tx.oilaAloqasi.create({
      data: {
        rejaId,
        qaydEtganId,
        usul: d.usul,
        aloqaVaqti: d.aloqaVaqti,
        kimBilan: d.kimBilan,
        mazmun: d.mazmun,
        fuqaroFikri: d.fuqaroFikri,
      },
      select: { id: true },
    });

    if (d.keyingiAloqaSanasi !== undefined) {
      await tx.oilaRejasi.update({
        where: { id: rejaId },
        data: { keyingiAloqaSanasi: d.keyingiAloqaSanasi },
      });
    }
    return { id: a.id, takror: false };
  });
}

/**
 * Rejani yopadi. Yopilgan reja qayta ochilmaydi: oilada yangi
 * vaziyat bo'lsa yangi reja ochiladi, eskisi tarix bo'lib qoladi.
 */
export async function rejaniYopish(
  rejaId: string,
  d: { holati: 'TUGALLANDI' | 'TOXTATILDI'; yopilishIzohi: string; natijaDalili: string | null },
  hozir = new Date()
) {
  const natija = await prisma.oilaRejasi.updateMany({
    where: { id: rejaId, holati: 'FAOL' },
    data: {
      holati: d.holati,
      faolBelgi: null,
      yopilganSana: hozir,
      yopilishIzohi: d.yopilishIzohi,
      natijaDalili: d.natijaDalili,
      keyingiAloqaSanasi: null,
    },
  });
  /* `count 0` - reja yo'q YOKI allaqachon yopilgan (parallel bosish) */
  if (natija.count === 0) throw new RejaXatosi('YOPIQ', 'Режа аллақачон ёпилган ёки топилмади');
}

/**
 * Rejani huquq tekshiruvi bilan oladi.
 *
 * Mahalla xodimi faqat o'z mahallasidagi oilaning rejasini ko'radi.
 * Arxivlangan oilaning rejasi ham "topilmadi": arxivdagi yozuv
 * hech qayerda ko'rinmasligi kerak.
 */
export async function rejaniOl(id: string, sessiya: Pick<Sessiya, 'rol' | 'mahallaId'>) {
  const reja = await prisma.oilaRejasi.findUnique({
    where: { id },
    include: { household: { select: { id: true, mahallaId: true, arxivSanasi: true } } },
  });
  if (!reja || reja.household.arxivSanasi) throw new RejaXatosi('TOPILMADI', 'Режа топилмади');
  if (!mahallagaRuxsat(sessiya, reja.household.mahallaId)) {
    throw new RejaXatosi('RUXSAT', 'Бу режага ҳуқуқингиз йўқ');
  }
  return reja;
}

/**
 * Mas'ul xodim yaroqlimi: faol bo'lishi va, agar u mahalla xodimi
 * bo'lsa, shu oilaning mahallasidan bo'lishi kerak. Aks holda
 * boshqa mahalla xodimiga bu oilaning ma'lumoti ochilib qolardi.
 */
export async function masulXodimYaroqlimi(xodimId: string, mahallaId: string): Promise<boolean> {
  const x = await prisma.user.findUnique({
    where: { id: xodimId },
    select: { faol: true, rol: true, mahallaId: true },
  });
  if (!x || !x.faol) return false;
  if (x.rol === 'HOKIM') return false;
  if (x.rol === 'YETTILIK') return x.mahallaId === mahallaId;
  return true;
}

/**
 * Mas'ul qilib tayinlash mumkin bo'lgan xodimlar.
 *
 * Mahalla xodimi (YETTILIK) faqat o'z mahallasi oilasiga mas'ul bo'la
 * oladi; bandlik markazi va administrator - hammaga. Ro'yxat ham shu
 * qoida bilan chiqadi, shunda tanlov oynasida begona xodim ko'rinmaydi.
 */
export async function masulXodimlar(mahallaId: string) {
  const r = await prisma.user.findMany({
    where: {
      faol: true,
      OR: [{ rol: { in: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] } }, { rol: 'YETTILIK', mahallaId }],
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
    take: 200,
  });
  return r.map((x) => ({ id: x.id, ism: x.fullName }));
}
