import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { KursYozuvHolati } from '@prisma/client';
import { mahallagaRuxsat, type Sessiya } from './auth';
import { prisma } from './prisma';
import { lotinga } from './alifbo';
import { KASB_YONALISHI } from './constants';
import { tasdiqDarajasi, tasdiqSanaladimi, type DalilQisqasi } from './dalil-ishonchi';
import { ID, sanaOrali } from './oila-rejasi';
import {
  ESKIRISH_KUNI,
  KURS_MAKS_KUN,
  NATIJA_KUTISH_KUNI,
  YANGILANMAGAN_KUNI,
  YOZUV_BAND_QILADI,
  type KursHolati,
} from './kurslar-nomlari';

/**
 * ============================================================
 *  KURSLAR: KATALOG VA FUQAROLARNING KURSDAGI YO'LI
 *
 *  Kurs tashkilotdan olingan ma'lumot bilan yuritiladi; fuqaro kursga
 *  yoziladi, boshlaydi, tamomlaydi yoki tashlaydi; natija (suhbat, ish)
 *  shu zanjirga bog'lanadi.
 *
 *  ── Beshta qoida ──
 *
 *  1. HOLAT SANADAN HISOBLANADI. "Qabul ochiq / jarayonda / tugagan"
 *     bazada saqlanmaydi: saqlansa sanaga zid bo'lib eskirib qolardi.
 *
 *  2. ESKIRGAN MA'LUMOT TAVSIYA QILINMAYDI. Tashkilotdan tekshirilmaganiga
 *     60 kundan oshgan kurs yangi tavsiya sifatida chiqmaydi va unga
 *     yozuv qo'shilmaydi, xodim qayta tekshirgunicha.
 *
 *  3. NOMA'LUM ≠ YO'Q ≠ NOL. Davomat, sertifikat, o'rinlar soni bo'sh
 *     qolsa - bu "noma'lum". Bo'sh narsa nolga aylantirilmaydi.
 *
 *  4. ISH KURSGA O'ZI YOZILMAYDI. Natija MAVJUD joylashish voqeasiga
 *     bog'lanadi va u dalil bilan alohida tasdiqlanadi. Bog'lanish
 *     faqat kursdan KEYIN boshlangan ish uchun mumkin (avvaldan ishlab
 *     turgan odamning ishi kursning "natijasi" bo'lolmaydi), va bitta ish
 *     faqat bitta kursga hisoblanadi (bazadagi UNIQUE).
 *
 *  5. KAFOLAT YO'Q. Kursni tamomlash ishga qabul qilinishni kafolatlamaydi.
 *     Samaradorlik "nechta yozildi" bilan emas, maxraji bilan o'lchanadi.
 * ============================================================
 */

export class KursXatosi extends Error {
  constructor(
    public readonly kod:
      | 'TOPILMADI'
      | 'RUXSAT'
      | 'NOTOGRI'
      | 'MAVJUD'
      | 'YOPIQ'
      | 'TOLDI'
      | 'ESKIRGAN'
      | 'HOLAT',
    xabar: string
  ) {
    super(xabar);
  }
}

export const KURS_HTTP: Record<KursXatosi['kod'], number> = {
  TOPILMADI: 404,
  RUXSAT: 403,
  NOTOGRI: 400,
  MAVJUD: 409,
  YOPIQ: 409,
  TOLDI: 409,
  ESKIRGAN: 409,
  HOLAT: 409,
};

/* Nomlar `kurslar-nomlari.ts` da: brauzer komponentlari ularni olishi kerak, bu fayl esa bazaga ulanadi. */
export * from './kurslar-nomlari';

type Kim = Pick<Sessiya, 'rol' | 'mahallaId' | 'userId'>;

const KUN_MS = 24 * 60 * 60 * 1000;

/* ══════════════════════════════════════════════════════════════
 *  TOZA FUNKSIYALAR (bazasiz sinaladi)
 * ══════════════════════════════════════════════════════════════ */

export interface KursSanalari {
  boshlanishSanasi: Date;
  tugashSanasi: Date;
  bekorQilingan: Date | null;
}

/** Kurs holati: sanalardan (Toshkent kuni bo'yicha) */
export function kursHolati(k: KursSanalari, hozir = new Date()): KursHolati {
  if (k.bekorQilingan) return 'BEKOR';
  if (sanaOrali(hozir, k.boshlanishSanasi) < 0) return 'QABUL';
  if (sanaOrali(hozir, k.tugashSanasi) > 0) return 'TUGAGAN';
  return 'JARAYONDA';
}

/** Tashkilotdan tekshirilmaganiga ESKIRISH_KUNI dan ortiq kun o'tganmi */
export function malumotEskirganmi(k: { tekshirilganSana: Date }, hozir = new Date()): boolean {
  return sanaOrali(hozir, k.tekshirilganSana) > ESKIRISH_KUNI;
}

export type YozishSababi = 'bekor' | 'tugagan' | 'eskirgan' | 'tolgan';

/**
 * Kursga YANGI yozuv qo'shish mumkinmi: kurs bekor qilinmagan va hali
 * tugamagan, ma'lumoti eskirmagan. `band` - joyni band qilgan yozuvlar soni.
 */
export function yozishMumkinmi(
  k: KursSanalari & { tekshirilganSana: Date; joylar: number | null },
  band: number,
  hozir = new Date()
): { ok: true } | { ok: false; sabab: YozishSababi } {
  const h = kursHolati(k, hozir);
  if (h === 'BEKOR') return { ok: false, sabab: 'bekor' };
  if (h === 'TUGAGAN') return { ok: false, sabab: 'tugagan' };
  if (malumotEskirganmi(k, hozir)) return { ok: false, sabab: 'eskirgan' };
  if (k.joylar !== null && band >= k.joylar) return { ok: false, sabab: 'tolgan' };
  return { ok: true };
}

/**
 * Yangi TAVSIYA: yozish mumkin bo'lishi bilan birga kurs HALI
 * BOSHLANMAGAN bo'lishi shart (boshlangan kursga odam tavsiya qilinmaydi).
 */
export function tavsiyaQilinadimi(
  k: KursSanalari & { tekshirilganSana: Date; joylar: number | null },
  band: number,
  hozir = new Date()
): boolean {
  return kursHolati(k, hozir) === 'QABUL' && yozishMumkinmi(k, band, hozir).ok;
}

export const YOZISH_SABABI_MATNI: Record<YozishSababi, string> = {
  bekor: 'Курс бекор қилинган',
  tugagan: 'Курс тугаган — янги ёзув қўшилмайди',
  eskirgan: `Курс маълумоти ${ESKIRISH_KUNI} кундан бери ташкилотдан текширилмаган. Аввал ташкилотдан сўраб, «Текширилди» тугмасини босинг`,
  tolgan: 'Курсда бўш ўрин қолмаган',
};

/* ── Kurs maydonlari ── */

const MATN = (min: number, max: number) => z.string().trim().min(min).max(max);
const SANA = z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), 'Сана нотўғри');
const YONALISHLAR = KASB_YONALISHI.map((x) => x.qiymat) as [string, ...string[]];

const KursAsosi = z.object({
  nomi: MATN(3, 120),
  yonalish: z.enum(YONALISHLAR).nullish(),
  /* Aniq ko'nikmalar: ish talabi bilan solishtirish shularga qaraydi */
  konikmalar: z.array(MATN(2, 40)).max(10),
  tashkilot: MATN(2, 120),
  manzil: MATN(2, 200).nullish(),
  aloqa: MATN(3, 60).nullish(),
  boshlanishSanasi: SANA,
  tugashSanasi: SANA,
  jamiDarsKuni: z.coerce.number().int().min(1).max(KURS_MAKS_KUN).nullish(),
  joylar: z.coerce.number().int().min(1).max(1000).nullish(),
  bepul: z.boolean().nullish(),
  narxi: z.coerce.number().int().min(1).max(1_000_000_000).nullish(),
  /* Kim aytdi / qaysi hujjat: manbasiz kurs yozilmaydi */
  manba: MATN(3, 200),
});

export const KursYaratishSxemasi = KursAsosi.extend({
  /* Bo'sh bo'lsa - bugun (tashkilotdan hozir olingan ma'lumot) */
  tekshirilganSana: SANA.optional(),
});

export const KursTahrirSxemasi = KursAsosi.partial();

export type KursMaydonlari = z.infer<typeof KursAsosi>;

/**
 * Maydonlar ORASIDAGI qoidalar. Xato bo'lsa matn qaytadi, aks holda `null`.
 */
export function kursniTekshir(
  d: Pick<
    KursMaydonlari,
    'boshlanishSanasi' | 'tugashSanasi' | 'jamiDarsKuni' | 'bepul' | 'narxi'
  > & { tekshirilganSana?: Date },
  hozir = new Date()
): string | null {
  const davom = sanaOrali(d.tugashSanasi, d.boshlanishSanasi);
  if (davom < 0) return 'Тугаш санаси бошланиш санасидан олдин бўлиши мумкин эмас';
  if (davom > KURS_MAKS_KUN) return `Курс ${KURS_MAKS_KUN} кундан узоқ бўлиши мумкин эмас`;
  if (d.jamiDarsKuni != null && d.jamiDarsKuni > davom + 1) {
    return 'Жами дарс кунлари курс календар кунларидан кўп бўлиши мумкин эмас';
  }
  if (d.bepul === true && d.narxi != null) return 'Бепул курсга нарх ёзилмайди';
  if (d.narxi != null && d.bepul !== false) {
    return 'Нарх фақат пуллик курсда ёзилади («Пуллик» ни танланг)';
  }
  if (d.tekshirilganSana && sanaOrali(d.tekshirilganSana, hozir) > 0) {
    return 'Текширилган сана келажакда бўлиши мумкин эмас';
  }
  return null;
}

/* ── Ish talabi bilan solishtirish ── */

/** Taqqoslash uchun: lotinga o'tkazadi, harf-raqamdan boshqasini olib tashlaydi */
export function matnKaliti(s: string): string {
  return lotinga(s)
    .toLowerCase()
    /* Tutuq belgisi so'zni BO'LMAYDI: "o‘rta" -> "orta", "o rta" emas */
    .replace(/[‘’ʻʼ'`´]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** O'zbekcha qo'shimchalar uchun so'z o'zagi: uzun so'zning oxiridan 3 harf qirqiladi */
function ozak(w: string): string {
  return w.slice(0, Math.min(w.length, Math.max(5, w.length - 3)));
}

export interface ElonMatni {
  lavozim: string;
  talablar: string | null;
  yonalish: string | null;
}

export interface MoslikSababi {
  turi: 'konikma' | 'yonalish';
  /** Ko'rsatiladigan izoh */
  matn: string;
}

/**
 * Kurs e'lonning HAQIQIY talabiga mos keladimi.
 *
 * Ko'nikma e'lon matnida (lavozim yoki talab) so'z o'zagi bilan
 * uchrasa - "ko'nikma" mosligi. Faqat yo'nalish bir xil bo'lsa - kuchsiz
 * moslik. Sabab doim ko'rsatiladi: xodim taxmin qilmaydi.
 */
export function kursElonGaMosmi(
  elon: ElonMatni,
  kurs: { nomi: string; konikmalar: string[]; yonalish: string | null }
): MoslikSababi | null {
  const matn = matnKaliti(`${elon.lavozim} ${elon.talablar ?? ''}`);
  if (matn.length === 0) return null;

  for (const k of kurs.konikmalar) {
    const sozlar = matnKaliti(k)
      .split(' ')
      .filter((w) => w.length >= 4);
    if (sozlar.length === 0) continue;
    if (sozlar.every((w) => matn.includes(ozak(w)))) {
      return { turi: 'konikma', matn: `Талабда «${k}» бор — курс шуни ўргатади` };
    }
  }

  if (kurs.yonalish && elon.yonalish && kurs.yonalish === elon.yonalish) {
    return { turi: 'yonalish', matn: 'Йўналиши эълон билан бир хил (аниқ кўникма мос келмади)' };
  }
  return null;
}

/* ── Ko'rsatkichlar ── */

export interface MetrikaYozuvi {
  holati: KursYozuvHolati;
  boshlaganSana: Date | null;
  tugatganSana: Date | null;
  qatnashganKun: number | null;
  /** Kursdan */
  jamiDarsKuni: number | null;
  kursBoshlanishi: Date;
  kursTugashi: Date;
  suhbatSanasi: Date | null;
  /** null = noma'lum */
  sertifikat: boolean | null;
  /** Bog'langan joylashish: kursdan keyin boshlanganmi va tasdiqlanganmi */
  joylashish: null | { boshlanganSana: Date; tasdiqlangan: boolean };
}

export interface KursKorsatkichlari {
  /** Bekor qilinmagan yozuvlar */
  jami: number;
  bekor: number;
  /** Kurs boshlangan, lekin yozuv holati belgilanmagan (YOLLANDI) */
  yangilanmagan: number;
  /** Hozir ўқиётганлар (kurs tugamagan) */
  hozirOqiyapti: number;

  /** Darsga keldi / kelmadi - ikkalasi ham aniq qayd etilganlar */
  boshlagan: number;
  kelmagan: number;

  /** Natijasi aniq: tamomladi yoki tashladi */
  tamomlagan: number;
  tashlagan: number;

  /** Tamomlaganlar orasida ish natijasi */
  natija: {
    /** Tamomlaganlarning hammasi */
    tamomlagan: number;
    /** Tamomlaganiga NATIJA_KUTISH_KUNI dan kam o'tgan: hali erta */
    haliErta: number;
    /** Muddati o'tganlar - maxraj */
    muddatiOtgan: number;
    /** Muddati o'tganlardan: tasdiqlangan ish (kursdan keyin boshlangan) */
    tasdiqlangan: number;
    /** Ish bog'langan, lekin dalil bilan tasdiqlanmagan (kutilmoqda/rad/faqat xodim) */
    tasdiqlanmagan: number;
    /** Bog'lanmagan: ish topgani qayd etilmagan (bu "topmagan" degani emas) */
    qaydEtilmagan: number;
    /** Suhbatga chiqqanlar (muddati o'tganlar orasida) */
    suhbatga: number;
  };

  davomat: {
    /** Qatnashgan dars kunlari yig'indisi */
    qatnashgan: number;
    /** Shu yozuvlarning jami dars kunlari */
    jami: number;
    /** Ikkala son ma'lum bo'lgan yozuvlar */
    yozuvlar: number;
    /** Davomati noma'lum yozuvlar */
    nomalum: number;
  };

  sertifikat: { bor: number; yoq: number; nomalum: number };
}

/** Kursdan keyin boshlanmagan ish natijaga hisoblanmaydi */
function kursdanKeyinmi(y: MetrikaYozuvi): boolean {
  if (!y.joylashish || !y.tugatganSana) return false;
  return sanaOrali(y.joylashish.boshlanganSana, y.tugatganSana) >= 0;
}

export function korsatkichlarniHisobla(
  yozuvlar: MetrikaYozuvi[],
  hozir = new Date()
): KursKorsatkichlari {
  const k: KursKorsatkichlari = {
    jami: 0,
    bekor: 0,
    yangilanmagan: 0,
    hozirOqiyapti: 0,
    boshlagan: 0,
    kelmagan: 0,
    tamomlagan: 0,
    tashlagan: 0,
    natija: {
      tamomlagan: 0,
      haliErta: 0,
      muddatiOtgan: 0,
      tasdiqlangan: 0,
      tasdiqlanmagan: 0,
      qaydEtilmagan: 0,
      suhbatga: 0,
    },
    davomat: { qatnashgan: 0, jami: 0, yozuvlar: 0, nomalum: 0 },
    sertifikat: { bor: 0, yoq: 0, nomalum: 0 },
  };

  for (const y of yozuvlar) {
    if (y.holati === 'BEKOR') {
      k.bekor++;
      continue;
    }
    k.jami++;

    const kursTugadi = sanaOrali(hozir, y.kursTugashi) > 0;

    switch (y.holati) {
      case 'YOLLANDI':
        /* Kurs boshlangan bo'lsa-yu, holat belgilanmagan: noma'lum */
        if (sanaOrali(hozir, y.kursBoshlanishi) >= 1) k.yangilanmagan++;
        break;
      case 'BOSHLADI':
        k.boshlagan++;
        if (!kursTugadi) k.hozirOqiyapti++;
        else if (sanaOrali(hozir, y.kursTugashi) > YANGILANMAGAN_KUNI) k.yangilanmagan++;
        break;
      case 'TAMOMLADI':
        k.boshlagan++;
        k.tamomlagan++;
        break;
      case 'TASHLADI':
        k.boshlagan++;
        k.tashlagan++;
        break;
      case 'KELMADI':
        k.kelmagan++;
        break;
    }

    /* Davomat va sertifikat: faqat oxiri ma'lum yozuvlar */
    if (y.holati === 'TAMOMLADI' || y.holati === 'TASHLADI') {
      if (y.qatnashganKun != null && y.jamiDarsKuni != null) {
        k.davomat.qatnashgan += Math.min(y.qatnashganKun, y.jamiDarsKuni);
        k.davomat.jami += y.jamiDarsKuni;
        k.davomat.yozuvlar++;
      } else {
        k.davomat.nomalum++;
      }
    }

    if (y.holati === 'TAMOMLADI') {
      if (y.sertifikat === true) k.sertifikat.bor++;
      else if (y.sertifikat === false) k.sertifikat.yoq++;
      else k.sertifikat.nomalum++;
      k.natija.tamomlagan++;
      const kutish = y.tugatganSana ? sanaOrali(hozir, y.tugatganSana) : null;
      if (kutish === null || kutish <= NATIJA_KUTISH_KUNI) {
        /* Sanasi noma'lum tamomlash ham "hali erta" - muddatini bilmaymiz */
        k.natija.haliErta++;
      } else {
        k.natija.muddatiOtgan++;
        if (y.suhbatSanasi) k.natija.suhbatga++;
        if (kursdanKeyinmi(y) && y.joylashish) {
          if (y.joylashish.tasdiqlangan) k.natija.tasdiqlangan++;
          else k.natija.tasdiqlanmagan++;
        } else {
          k.natija.qaydEtilmagan++;
        }
      }
    }
  }

  return k;
}

/* ══════════════════════════════════════════════════════════════
 *  BAZA
 * ══════════════════════════════════════════════════════════════ */

const toshkentBoshlanishi = (hozir: Date) =>
  new Date(hozir.getTime() - KUN_MS); /* taxminiy pastki chegara; aniq tekshiruv kodda */

function bandSoni(kursIdlar: string[]): Promise<Map<string, number>> {
  return prisma.kursYollanmasi
    .groupBy({
      by: ['kursId'],
      where: { kursId: { in: kursIdlar }, holati: { in: YOZUV_BAND_QILADI } },
      _count: { _all: true },
    })
    .then((q) => new Map(q.map((x) => [x.kursId, x._count._all])));
}

/* ── Kurs yaratish va yangilash ── */

export async function kursYaratish(
  kim: Pick<Sessiya, 'userId'>,
  d: z.infer<typeof KursYaratishSxemasi>,
  hozir = new Date()
): Promise<{ id: string }> {
  const tekshirilgan = d.tekshirilganSana ?? hozir;
  const xato = kursniTekshir({ ...d, tekshirilganSana: tekshirilgan }, hozir);
  if (xato) throw new KursXatosi('NOTOGRI', xato);

  const k = await prisma.kurs.create({
    data: {
      nomi: d.nomi,
      yonalish: d.yonalish ?? null,
      konikmalar: d.konikmalar,
      tashkilot: d.tashkilot,
      manzil: d.manzil ?? null,
      aloqa: d.aloqa ?? null,
      boshlanishSanasi: d.boshlanishSanasi,
      tugashSanasi: d.tugashSanasi,
      jamiDarsKuni: d.jamiDarsKuni ?? null,
      joylar: d.joylar ?? null,
      bepul: d.bepul ?? null,
      narxi: d.narxi != null ? BigInt(d.narxi) : null,
      manba: d.manba,
      tekshirilganSana: tekshirilgan,
      yaratganId: kim.userId,
    },
    select: { id: true },
  });
  return k;
}

export const KursAmaliSxemasi = z.discriminatedUnion('amal', [
  z.object({ amal: z.literal('tekshirildi'), manba: MATN(3, 200).optional() }),
  z.object({ amal: z.literal('tahrir'), maydonlar: KursTahrirSxemasi }),
  z.object({ amal: z.literal('bekor'), sabab: MATN(3, 300) }),
]);

export type KursAmali = z.infer<typeof KursAmaliSxemasi>;

export async function kursAmali(
  kursId: string,
  a: KursAmali,
  hozir = new Date()
): Promise<{ ok: true }> {
  const k = await prisma.kurs.findUnique({ where: { id: kursId } });
  if (!k) throw new KursXatosi('TOPILMADI', 'Курс топилмади');
  if (k.bekorQilingan) throw new KursXatosi('YOPIQ', 'Курс бекор қилинган — ўзгартириб бўлмайди');

  if (a.amal === 'tekshirildi') {
    await prisma.kurs.update({
      where: { id: kursId },
      data: { tekshirilganSana: hozir, ...(a.manba ? { manba: a.manba } : {}) },
    });
    return { ok: true };
  }

  if (a.amal === 'bekor') {
    /* Tugagan kurs bo'lib o'tgan: uni bekor qilib bo'lmaydi */
    if (kursHolati(k, hozir) === 'TUGAGAN') {
      throw new KursXatosi('YOPIQ', 'Курс тугаган — уни бекор қилиб бўлмайди');
    }
    await prisma.$transaction(async (tx) => {
      const n = await tx.kurs.updateMany({
        where: { id: kursId, bekorQilingan: null },
        data: { bekorQilingan: hozir, bekorSababi: a.sabab },
      });
      if (n.count === 0) throw new KursXatosi('HOLAT', 'Курс шу орада бекор қилинган');
      /* Tamomlaganlar (TAMOMLADI) yozuvi tegilmaydi: ular allaqachon o'qib bo'lgan */
      await tx.kursYollanmasi.updateMany({
        where: { kursId, holati: { in: ['YOLLANDI', 'BOSHLADI'] } },
        data: { holati: 'BEKOR', izoh: `Курс бекор қилинди: ${a.sabab}`.slice(0, 500) },
      });
    });
    return { ok: true };
  }

  /* tahrir */
  const m = a.maydonlar;
  const birlashgan = {
    boshlanishSanasi: m.boshlanishSanasi ?? k.boshlanishSanasi,
    tugashSanasi: m.tugashSanasi ?? k.tugashSanasi,
    jamiDarsKuni: m.jamiDarsKuni !== undefined ? m.jamiDarsKuni : k.jamiDarsKuni,
    bepul: m.bepul !== undefined ? m.bepul : k.bepul,
    narxi: m.narxi !== undefined ? m.narxi : k.narxi != null ? Number(k.narxi) : null,
  };
  const xato = kursniTekshir(birlashgan, hozir);
  if (xato) throw new KursXatosi('NOTOGRI', xato);

  if (m.joylar != null) {
    const band = (await bandSoni([kursId])).get(kursId) ?? 0;
    if (m.joylar < band) {
      throw new KursXatosi('NOTOGRI', `Ўринлар сони банд қилингандан (${band} та) кам бўлиши мумкин эмас`);
    }
  }

  /* Faqat HAQIQATDA o'zgargan sana hisobga olinadi (forma o'zgarmagan sanani ham yuboradi) */
  const boshOzgardi = !!m.boshlanishSanasi && sanaOrali(m.boshlanishSanasi, k.boshlanishSanasi) !== 0;
  const tugashOzgardi = !!m.tugashSanasi && sanaOrali(m.tugashSanasi, k.tugashSanasi) !== 0;

  /* Boshlangan kursning sanalarini siljitish yozuvlarni buzmasin */
  if (boshOzgardi || tugashOzgardi) {
    const ichkarida = await prisma.kursYollanmasi.count({
      where: { kursId, holati: { in: ['BOSHLADI', 'TAMOMLADI', 'TASHLADI'] } },
    });
    if (ichkarida > 0) {
      throw new KursXatosi(
        'YOPIQ',
        'Курсда ўқиш бошланган ёзувлар бор — санани ўзгартириб бўлмайди (ёзувларнинг санаси бузилади)'
      );
    }
  }

  const data: Prisma.KursUpdateInput = {};
  if (m.nomi !== undefined) data.nomi = m.nomi;
  if (m.yonalish !== undefined) data.yonalish = m.yonalish;
  if (m.konikmalar !== undefined) data.konikmalar = m.konikmalar;
  if (m.tashkilot !== undefined) data.tashkilot = m.tashkilot;
  if (m.manzil !== undefined) data.manzil = m.manzil;
  if (m.aloqa !== undefined) data.aloqa = m.aloqa;
  if (boshOzgardi) data.boshlanishSanasi = m.boshlanishSanasi;
  if (tugashOzgardi) data.tugashSanasi = m.tugashSanasi;
  if (m.jamiDarsKuni !== undefined) data.jamiDarsKuni = m.jamiDarsKuni;
  if (m.joylar !== undefined) data.joylar = m.joylar;
  if (m.bepul !== undefined) data.bepul = m.bepul;
  if (m.narxi !== undefined) data.narxi = m.narxi != null ? BigInt(m.narxi) : null;
  if (m.manba !== undefined) data.manba = m.manba;
  /* Tahrir "tekshirildi" degani EMAS: tekshirish alohida, ongli amal */
  if (Object.keys(data).length === 0) throw new KursXatosi('NOTOGRI', 'Ўзгартириш йўқ');

  await prisma.kurs.update({ where: { id: kursId }, data });
  return { ok: true };
}

/* ── Kursga yozish ── */

export const YozishSxemasi = z.object({
  ishsizId: ID,
  kursId: ID,
  /* IT-shaharcha vaucheri bilan bog'liq bo'lsa */
  itVaucherId: ID.nullish(),
});

function yozishXatosi(sabab: YozishSababi): KursXatosi {
  return new KursXatosi(
    sabab === 'tolgan' ? 'TOLDI' : sabab === 'eskirgan' ? 'ESKIRGAN' : 'YOPIQ',
    YOZISH_SABABI_MATNI[sabab]
  );
}

/**
 * Fuqaroni kursga yozish. Bir fuqaro bir kursga bir marta (baza cheklovi);
 * takror so'rovda mavjud yozuv qaytadi.
 *
 * Joylar soni PARALLEL so'rovda ham oshib ketmasligi uchun kurs satri
 * tranzaksiya ichida qulflanadi (`FOR UPDATE`).
 */
export async function kursgaYozish(
  kim: Kim,
  d: z.infer<typeof YozishSxemasi>,
  hozir = new Date()
): Promise<{ id: string; yangi: boolean }> {
  const odam = await prisma.unemployedPerson.findUnique({
    where: { id: d.ishsizId },
    select: { id: true, mahallaId: true, arxivSanasi: true },
  });
  if (!odam || odam.arxivSanasi) throw new KursXatosi('TOPILMADI', 'Фуқаро топилмади');
  if (!mahallagaRuxsat(kim, odam.mahallaId)) {
    throw new KursXatosi('RUXSAT', 'Бу фуқарога ҳуқуқингиз йўқ');
  }

  if (d.itVaucherId) {
    const v = await prisma.itVaucher.findUnique({
      where: { id: d.itVaucherId },
      select: { ishsizId: true },
    });
    if (!v || v.ishsizId !== d.ishsizId) {
      throw new KursXatosi('NOTOGRI', 'Бу ваучер шу фуқарога тегишли эмас');
    }
  }

  const mavjud = await prisma.kursYollanmasi.findUnique({
    where: { kurs_yozuvi_takrori: { kursId: d.kursId, ishsizId: d.ishsizId } },
    select: { id: true },
  });
  if (mavjud) return { id: mavjud.id, yangi: false };

  try {
    return await prisma.$transaction(async (tx) => {
      /* Kurs satrini qulflaymiz: ikki xodim oxirgi o'ringa bir vaqtda yozmasin */
      const q = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Kurs" WHERE "id" = ${d.kursId} FOR UPDATE`;
      if (q.length === 0) throw new KursXatosi('TOPILMADI', 'Курс топилмади');
      const k = await tx.kurs.findUniqueOrThrow({ where: { id: d.kursId } });

      const band = await tx.kursYollanmasi.count({
        where: { kursId: k.id, holati: { in: YOZUV_BAND_QILADI } },
      });
      const r = yozishMumkinmi(k, band, hozir);
      if (!r.ok) throw yozishXatosi(r.sabab);

      const y = await tx.kursYollanmasi.create({
        data: {
          kursId: k.id,
          ishsizId: d.ishsizId,
          itVaucherId: d.itVaucherId ?? null,
          yaratganId: kim.userId,
        },
        select: { id: true },
      });
      return { id: y.id, yangi: true };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const bor = await prisma.kursYollanmasi.findUnique({
        where: { kurs_yozuvi_takrori: { kursId: d.kursId, ishsizId: d.ishsizId } },
        select: { id: true },
      });
      if (bor) return { id: bor.id, yangi: false };
    }
    throw e;
  }
}

/* ── Yozuv amallari ── */

const KUN_SONI = z.coerce.number().int().min(0).max(KURS_MAKS_KUN);
const IZOH = MATN(2, 300).nullish();
const KONIKMALAR = z.array(MATN(2, 40)).max(10);

export const YozuvAmaliSxemasi = z.discriminatedUnion('amal', [
  z.object({ amal: z.literal('boshladi'), sana: SANA }),
  z.object({ amal: z.literal('kelmadi'), izoh: IZOH }),
  z.object({ amal: z.literal('tashladi'), sana: SANA, qatnashganKun: KUN_SONI.nullish(), izoh: IZOH }),
  z.object({
    amal: z.literal('tamomladi'),
    sana: SANA,
    qatnashganKun: KUN_SONI.nullish(),
    sertifikat: z.boolean().nullish(),
    olinganKonikmalar: KONIKMALAR.default([]),
    izoh: IZOH,
  }),
  /* Tamomlagandan KEYIN: sertifikat, ko'nikma, suhbat, ish. `undefined` - o'zgarmaydi, `null` - tozalash */
  z.object({
    amal: z.literal('toldirish'),
    sertifikat: z.boolean().nullish(),
    olinganKonikmalar: KONIKMALAR.optional(),
    suhbatSanasi: SANA.nullish(),
    joylashishId: ID.nullish(),
  }),
  z.object({ amal: z.literal('bekor'), izoh: IZOH }),
  z.object({ amal: z.literal('tiklash') }),
]);

/* `input`: chaqiruvchi `olinganKonikmalar` ni bermasligi mumkin (sxemadagi default o'rniga bu yerda `?? []`) */
export type YozuvAmali = z.input<typeof YozuvAmaliSxemasi>;

export async function yozuvAmali(
  kim: Kim,
  yozuvId: string,
  a: YozuvAmali,
  hozir = new Date()
): Promise<{ ok: true }> {
  const y = await prisma.kursYollanmasi.findUnique({
    where: { id: yozuvId },
    select: {
      id: true,
      ishsizId: true,
      kursId: true,
      holati: true,
      boshlaganSana: true,
      tugatganSana: true,
      kurs: {
        select: {
          id: true,
          boshlanishSanasi: true,
          tugashSanasi: true,
          jamiDarsKuni: true,
          joylar: true,
          tekshirilganSana: true,
          bekorQilingan: true,
        },
      },
      ishsiz: { select: { mahallaId: true, arxivSanasi: true } },
    },
  });
  if (!y || y.ishsiz.arxivSanasi) throw new KursXatosi('TOPILMADI', 'Ёзув топилмади');
  if (!mahallagaRuxsat(kim, y.ishsiz.mahallaId)) {
    throw new KursXatosi('RUXSAT', 'Бу фуқарога ҳуқуқингиз йўқ');
  }
  const kurs = y.kurs;

  /** Sana kelajakda emas va kurs boshlanishidan oldin emas */
  const sanaTekshir = (sana: Date, nom: string) => {
    if (sanaOrali(sana, hozir) > 0) {
      throw new KursXatosi('NOTOGRI', `${nom} келажакда бўлиши мумкин эмас`);
    }
    if (sanaOrali(sana, kurs.boshlanishSanasi) < 0) {
      throw new KursXatosi('NOTOGRI', `${nom} курс бошланишидан олдин бўлиши мумкин эмас`);
    }
  };
  const kunTekshir = (n: number | null | undefined) => {
    if (n == null) return;
    if (kurs.jamiDarsKuni != null && n > kurs.jamiDarsKuni) {
      throw new KursXatosi('NOTOGRI', `Қатнашган кун жами дарс кунидан (${kurs.jamiDarsKuni}) кўп бўлиши мумкин эмас`);
    }
  };
  const holatXatosi = () =>
    new KursXatosi('HOLAT', 'Ёзув ҳолати шу орада ўзгарган ёки бу амал ҳозир мумкин эмас — саҳифани янгиланг');

  const yangila = async (
    from: KursYozuvHolati[],
    data: Prisma.KursYollanmasiUpdateManyMutationInput
  ) => {
    if (!from.includes(y.holati)) throw holatXatosi();
    /* Atomar: holat tekshiruvi yozish bilan BIR yozuvda */
    const n = await prisma.kursYollanmasi.updateMany({
      where: { id: y.id, holati: { in: from } },
      data,
    });
    if (n.count === 0) throw holatXatosi();
  };

  switch (a.amal) {
    case 'boshladi': {
      sanaTekshir(a.sana, 'Бошлаган сана');
      await yangila(['YOLLANDI'], { holati: 'BOSHLADI', boshlaganSana: a.sana });
      return { ok: true };
    }

    case 'kelmadi': {
      if (sanaOrali(hozir, kurs.boshlanishSanasi) < 1) {
        throw new KursXatosi('NOTOGRI', 'Курс ҳали бошланмаган: «келмади» деб белгилаб бўлмайди');
      }
      await yangila(['YOLLANDI'], { holati: 'KELMADI', izoh: a.izoh ?? null });
      return { ok: true };
    }

    case 'tashladi': {
      sanaTekshir(a.sana, 'Ташлаган сана');
      if (y.boshlaganSana && sanaOrali(a.sana, y.boshlaganSana) < 0) {
        throw new KursXatosi('NOTOGRI', 'Ташлаган сана бошлаган санадан олдин бўлиши мумкин эмас');
      }
      kunTekshir(a.qatnashganKun);
      await yangila(['YOLLANDI', 'BOSHLADI'], {
        holati: 'TASHLADI',
        tugatganSana: a.sana,
        qatnashganKun: a.qatnashganKun ?? null,
        izoh: a.izoh ?? null,
      });
      return { ok: true };
    }

    case 'tamomladi': {
      sanaTekshir(a.sana, 'Тамомлаган сана');
      if (y.boshlaganSana && sanaOrali(a.sana, y.boshlaganSana) < 0) {
        throw new KursXatosi('NOTOGRI', 'Тамомлаган сана бошлаган санадан олдин бўлиши мумкин эмас');
      }
      kunTekshir(a.qatnashganKun);
      await yangila(['YOLLANDI', 'BOSHLADI'], {
        holati: 'TAMOMLADI',
        tugatganSana: a.sana,
        qatnashganKun: a.qatnashganKun ?? null,
        sertifikat: a.sertifikat ?? null,
        olinganKonikmalar: a.olinganKonikmalar ?? [],
        izoh: a.izoh ?? null,
      });
      return { ok: true };
    }

    case 'toldirish': {
      if (y.holati !== 'TAMOMLADI' || !y.tugatganSana) throw holatXatosi();
      const data: Prisma.KursYollanmasiUpdateManyMutationInput = {};
      if (a.sertifikat !== undefined) data.sertifikat = a.sertifikat;
      if (a.olinganKonikmalar !== undefined) data.olinganKonikmalar = a.olinganKonikmalar;
      if (a.suhbatSanasi !== undefined) {
        if (a.suhbatSanasi && sanaOrali(a.suhbatSanasi, y.tugatganSana) < 0) {
          throw new KursXatosi('NOTOGRI', 'Суҳбат санаси курс тугашидан олдин бўлиши мумкин эмас');
        }
        if (a.suhbatSanasi && sanaOrali(a.suhbatSanasi, hozir) > 90) {
          throw new KursXatosi('NOTOGRI', 'Суҳбат санаси 90 кундан узоқ бўлиши мумкин эмас');
        }
        data.suhbatSanasi = a.suhbatSanasi;
      }

      let joylashishUlash: string | null | undefined;
      if (a.joylashishId !== undefined) {
        if (a.joylashishId) {
          const j = await prisma.ishgaJoylashish.findUnique({
            where: { id: a.joylashishId },
            select: { ishsizId: true, boshlanganSana: true },
          });
          if (!j || j.ishsizId !== y.ishsizId) {
            throw new KursXatosi('NOTOGRI', 'Бу иш шу фуқарога тегишли эмас');
          }
          /* Avvaldan ishlab turgan odamning ishi kursning natijasi emas */
          if (sanaOrali(j.boshlanganSana, y.tugatganSana) < 0) {
            throw new KursXatosi(
              'NOTOGRI',
              'Бу иш курс тугашидан олдин бошланган — уни курс натижаси деб бўлмайди'
            );
          }
        }
        joylashishUlash = a.joylashishId;
      }

      if (Object.keys(data).length === 0 && joylashishUlash === undefined) {
        throw new KursXatosi('NOTOGRI', 'Ўзгартириш йўқ');
      }
      try {
        const n = await prisma.kursYollanmasi.updateMany({
          where: { id: y.id, holati: 'TAMOMLADI' },
          data: { ...data, ...(joylashishUlash !== undefined ? { joylashishId: joylashishUlash } : {}) },
        });
        if (n.count === 0) throw holatXatosi();
      } catch (e) {
        /* Bitta ish ikkinchi kursga hisoblanmaydi: bazadagi UNIQUE */
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new KursXatosi('MAVJUD', 'Бу иш бошқа курс ёзувига боғланган — бир иш битта курсга ҳисобланади');
        }
        throw e;
      }
      return { ok: true };
    }

    case 'bekor': {
      /* Faqat boshlanmagan yozuv; boshlaganni "tashladi" deb yoziladi */
      await yangila(['YOLLANDI'], { holati: 'BEKOR', izoh: a.izoh ?? null });
      return { ok: true };
    }

    case 'tiklash': {
      if (y.holati !== 'BEKOR') throw holatXatosi();
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Kurs" WHERE "id" = ${kurs.id} FOR UPDATE`;
        const band = await tx.kursYollanmasi.count({
          where: { kursId: kurs.id, holati: { in: YOZUV_BAND_QILADI } },
        });
        const r = yozishMumkinmi(kurs, band, hozir);
        if (!r.ok) throw yozishXatosi(r.sabab);
        const n = await tx.kursYollanmasi.updateMany({
          where: { id: y.id, holati: 'BEKOR' },
          data: { holati: 'YOLLANDI', izoh: null },
        });
        if (n.count === 0) throw holatXatosi();
      });
      return { ok: true };
    }
  }
}

/* ══════════════════════════════════════════════════════════════
 *  O'QISH (sahifalar uchun)
 * ══════════════════════════════════════════════════════════════ */

const YOZUV_METRIKA_TANLOVI = {
  holati: true,
  boshlaganSana: true,
  tugatganSana: true,
  qatnashganKun: true,
  suhbatSanasi: true,
  sertifikat: true,
  kurs: { select: { boshlanishSanasi: true, tugashSanasi: true, jamiDarsKuni: true } },
  joylashish: {
    select: {
      boshlanganSana: true,
      dalillar: { select: { turi: true, holati: true, manbaTuri: true } },
    },
  },
} satisfies Prisma.KursYollanmasiSelect;

type MetrikaQatori = Prisma.KursYollanmasiGetPayload<{ select: typeof YOZUV_METRIKA_TANLOVI }>;

function metrikaYozuvi(q: MetrikaQatori): MetrikaYozuvi {
  return {
    holati: q.holati,
    boshlaganSana: q.boshlaganSana,
    tugatganSana: q.tugatganSana,
    qatnashganKun: q.qatnashganKun,
    jamiDarsKuni: q.kurs.jamiDarsKuni,
    kursBoshlanishi: q.kurs.boshlanishSanasi,
    kursTugashi: q.kurs.tugashSanasi,
    suhbatSanasi: q.suhbatSanasi,
    sertifikat: q.sertifikat,
    joylashish: q.joylashish
      ? {
          boshlanganSana: q.joylashish.boshlanganSana,
          tasdiqlangan: tasdiqSanaladimi(tasdiqDarajasi(q.joylashish.dalillar as DalilQisqasi[])),
        }
      : null,
  };
}

/**
 * Kurs (yoki hamma kurslar) ko'rsatkichlari. Arxivlangan fuqarolar
 * va bekor qilingan kurslar ishtirok etmaydi.
 */
export async function kursKorsatkichlari(
  kursId?: string,
  hozir = new Date()
): Promise<KursKorsatkichlari> {
  const qatorlar = await prisma.kursYollanmasi.findMany({
    where: {
      ...(kursId ? { kursId } : {}),
      ishsiz: { arxivSanasi: null },
      kurs: { bekorQilingan: null },
    },
    select: YOZUV_METRIKA_TANLOVI,
  });
  return korsatkichlarniHisobla(qatorlar.map(metrikaYozuvi), hozir);
}

export interface KursQatori {
  id: string;
  nomi: string;
  tashkilot: string;
  yonalish: string | null;
  boshlanishSanasi: Date;
  tugashSanasi: Date;
  joylar: number | null;
  bepul: boolean | null;
  tekshirilganSana: Date;
  bekorQilingan: Date | null;
  holati: KursHolati;
  eskirgan: boolean;
  band: number;
  tamomlagan: number;
  tashlagan: number;
}

/** Kurslar ro'yxati: yangisi avval */
export async function kurslarRoyxati(hozir = new Date(), take = 100): Promise<KursQatori[]> {
  const kurslar = await prisma.kurs.findMany({
    orderBy: [{ boshlanishSanasi: 'desc' }],
    take,
    select: {
      id: true,
      nomi: true,
      tashkilot: true,
      yonalish: true,
      boshlanishSanasi: true,
      tugashSanasi: true,
      joylar: true,
      bepul: true,
      tekshirilganSana: true,
      bekorQilingan: true,
    },
  });
  if (kurslar.length === 0) return [];
  const ids = kurslar.map((k) => k.id);
  const [band, sanoq] = await Promise.all([
    bandSoni(ids),
    prisma.kursYollanmasi.groupBy({
      by: ['kursId', 'holati'],
      where: { kursId: { in: ids }, holati: { in: ['TAMOMLADI', 'TASHLADI'] } },
      _count: { _all: true },
    }),
  ]);
  const t = new Map<string, { tamomlagan: number; tashlagan: number }>();
  for (const s of sanoq) {
    const q = t.get(s.kursId) ?? { tamomlagan: 0, tashlagan: 0 };
    if (s.holati === 'TAMOMLADI') q.tamomlagan = s._count._all;
    else q.tashlagan = s._count._all;
    t.set(s.kursId, q);
  }
  return kurslar.map((k) => ({
    ...k,
    holati: kursHolati(k, hozir),
    eskirgan: malumotEskirganmi(k, hozir),
    band: band.get(k.id) ?? 0,
    tamomlagan: t.get(k.id)?.tamomlagan ?? 0,
    tashlagan: t.get(k.id)?.tashlagan ?? 0,
  }));
}

/** Fuqaroga yozish mumkin bo'lgan kurslar (select uchun) */
export async function yozishMumkinKurslar(hozir = new Date(), take = 30) {
  const kurslar = await prisma.kurs.findMany({
    where: { bekorQilingan: null, tugashSanasi: { gte: toshkentBoshlanishi(hozir) } },
    orderBy: { boshlanishSanasi: 'asc' },
    take: 80,
    select: {
      id: true,
      nomi: true,
      tashkilot: true,
      boshlanishSanasi: true,
      tugashSanasi: true,
      joylar: true,
      tekshirilganSana: true,
      bekorQilingan: true,
    },
  });
  const band = await bandSoni(kurslar.map((k) => k.id));
  return kurslar
    .filter((k) => yozishMumkinmi(k, band.get(k.id) ?? 0, hozir).ok)
    .slice(0, take)
    .map((k) => ({ ...k, holati: kursHolati(k, hozir), band: band.get(k.id) ?? 0 }));
}

export interface ElonKursi {
  id: string;
  nomi: string;
  tashkilot: string;
  boshlanishSanasi: Date;
  tugashSanasi: Date;
  qolganJoy: number | null;
  sabab: MoslikSababi;
}

/**
 * E'longa mos kurslar: faqat HALI BOSHLANMAGAN, ma'lumoti yangi, o'rni
 * bor kurslar - va faqat e'lonning HAQIQIY talabiga mosi, sababi bilan.
 */
export async function elonUchunKurslar(
  elon: ElonMatni,
  hozir = new Date(),
  chegara = 3
): Promise<ElonKursi[]> {
  const kurslar = await prisma.kurs.findMany({
    where: {
      bekorQilingan: null,
      boshlanishSanasi: { gte: toshkentBoshlanishi(hozir) },
      tekshirilganSana: { gte: new Date(hozir.getTime() - (ESKIRISH_KUNI + 1) * KUN_MS) },
    },
    orderBy: { boshlanishSanasi: 'asc' },
    take: 60,
    select: {
      id: true,
      nomi: true,
      tashkilot: true,
      yonalish: true,
      konikmalar: true,
      boshlanishSanasi: true,
      tugashSanasi: true,
      joylar: true,
      tekshirilganSana: true,
      bekorQilingan: true,
    },
  });
  if (kurslar.length === 0) return [];
  const band = await bandSoni(kurslar.map((k) => k.id));

  const natija: ElonKursi[] = [];
  for (const k of kurslar) {
    const b = band.get(k.id) ?? 0;
    if (!tavsiyaQilinadimi(k, b, hozir)) continue;
    const sabab = kursElonGaMosmi(elon, k);
    if (!sabab) continue;
    natija.push({
      id: k.id,
      nomi: k.nomi,
      tashkilot: k.tashkilot,
      boshlanishSanasi: k.boshlanishSanasi,
      tugashSanasi: k.tugashSanasi,
      qolganJoy: k.joylar !== null ? k.joylar - b : null,
      sabab,
    });
  }
  /* Ko'nikma mosligi avval, keyin yo'nalish */
  natija.sort((a, b) => (a.sabab.turi === b.sabab.turi ? 0 : a.sabab.turi === 'konikma' ? -1 : 1));
  return natija.slice(0, chegara);
}
