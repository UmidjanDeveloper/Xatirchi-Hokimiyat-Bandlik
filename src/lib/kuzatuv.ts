import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { KuzatuvJavobi, KuzatuvNatijasi, MalumotDarajasi } from '@prisma/client';
import { KUN_MS } from './bandlik-holatlari';
import { mahallagaRuxsat, type Sessiya } from './auth';
import { SABAB_ENG_KAM } from './arxiv';
import { joylashishniTugat } from './joylashish';
import { prisma } from './prisma';
import { ID, sanaOrali } from './oila-rejasi';
import {
  BOSQICHLAR,
  ENG_KATTA_DAROMAD,
  ERTA_YOZISH_KUNI,
  ESKIRISH_KUNI,
  QAYTA_URINISH_KUNI,
  type Bosqich,
} from './kuzatuv-nomlari';

export * from './kuzatuv-nomlari';

/**
 * ============================================================
 *  30/60/90 KUNLIK KUZATUV
 *
 *  Joylashtirilgan fuqaro ishda qoldimi, ish haqini olyaptimi,
 *  daromadi qanday o'zgardi - bularni hokim "barqaror bandlik"
 *  deb so'raydi. Mavjud "uch oylik nazorat" bitta topshiriq edi:
 *  natijasi matn, hisoblab bo'lmaydi.
 *
 *  ── Beshta qoida; buzilsa raqam yolg'on gapira boshlaydi ──
 *
 *  1. NOMA'LUM ≠ YO'Q ≠ NOL. "Bog'lanib bo'lmadi" ishda qoldi
 *     ham, ketdi ham degani emas. Daromad kiritilmasa - `null`,
 *     nol emas.
 *
 *  2. HAR JAVOBNING MANBASI bor: xodim qayd etgan, fuqaro
 *     bildirgan yoki tekshirilgan. "Tekshirilgan" - faqat
 *     TASDIQLANGAN DALIL bilan bog'langanda.
 *
 *  3. SANALAR ARALASHMAYDI: ishga kirgan sana, ma'lumot olingan
 *     sana, tasdiq sanasi, kiritilgan sana - to'rttasi alohida.
 *
 *  4. ISH ALMASHTIRGAN FUQARO YANGI FUQARO EMAS. "Joylashgan
 *     fuqarolar" `ishsizId` bo'yicha bir marta sanaladi; har bir
 *     ish esa o'z 30/60/90 tekshiruvi bilan alohida.
 *
 *  5. KUZATILGAN O'ZGARISH DASTUR SABABLI DEB E'LON QILINMAYDI.
 *     Ko'rsatkichlar holatni bildiradi, sababni emas.
 * ============================================================
 */

/* ── Ma'lumot tekshiruvi ── */

const JAVOB = z.enum(['HA', 'YOQ', 'NOMALUM']).default('NOMALUM');
const DARAJA = z.enum(['NOMALUM', 'XODIM_QAYD_ETGAN', 'FUQARO_BILDIRGAN', 'TEKSHIRILGAN']);

/** So'm: bo'sh = noma'lum (`null`), musbat butun son yoki rostdan 0 */
const SOM = z.preprocess(
  (x) => {
    if (x === undefined) return undefined;
    if (x === null || x === '') return null;
    if (typeof x === 'string') {
      const t = x.replace(/[\s,]/g, '');
      return /^\d+$/.test(t) ? Number(t) : Number.NaN;
    }
    return x;
  },
  z
    .number()
    .int('Сўм бутун сон бўлиши керак')
    .min(0, 'Манфий бўлиши мумкин эмас')
    .max(ENG_KATTA_DAROMAD, 'Бу сумма ишончли эмас — рақамни текширинг')
    .nullable()
    .optional()
);

const matn = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((x) => {
      const t = x?.trim();
      return t ? t : null;
    });

export const KuzatuvSxemasi = z.object({
  joylashishId: ID,
  kunBelgisi: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  natija: z.enum(['MALUMOT_OLINDI', 'BOGLANILMADI']),
  tekshiruvSanasi: z.coerce.date(),
  manba: DARAJA.default('NOMALUM'),
  ishBoshladi: JAVOB,
  ishdaQolmoqda: JAVOB,
  haqOlmoqda: JAVOB,
  sharoitMos: JAVOB,
  qoshimchaYordam: JAVOB,
  ishHaqiSom: SOM,
  oilaDaromadiSom: SOM,
  oldingiDaromadSom: SOM,
  daromadManbasi: DARAJA.default('NOMALUM'),
  tugashSababi: matn(500),
  /** Ish qachon tugagan - faqat "ishda qolmayapti" bo'lsa */
  tugaganSana: z.coerce.date().nullish(),
  yordamIzohi: matn(1000),
  dalilId: ID.nullish(),
  qaytaUrinishSanasi: z.coerce.date().nullish(),
});

export type KuzatuvKirishi = z.infer<typeof KuzatuvSxemasi>;

/* ── Muddat ── */

/**
 * Kun farqi (a - b), Toshkent kuni bo'yicha - `oila-rejasi.ts` dagi bilan BIR XIL.
 *
 * ── Nega soat emas, kun ──
 *
 * Xodim "ma'lumot qachon olindi" ni SANA bilan beradi (kun, soatsiz).
 * Brauzer uni tushki 12:00 deb jo'natadi. Ertalab 10:00 da yozilsa, bu
 * "kelajak" bo'lib qolardi va to'g'ri yozuv rad etilardi - brauzer
 * sinovida shunday topilgan. Kun bo'yicha solishtirilganda esa bugungi
 * sana har doim yaroqli.
 */
export const toshkentKunFarqi = sanaOrali;

export function muddatSanasi(boshlangan: Date, kun: number): Date {
  return new Date(boshlangan.getTime() + kun * KUN_MS);
}

export type BosqichHolati =
  | 'bajarildi'
  | 'boglanilmadi'
  | 'qayta_urinish'
  | 'kutilmoqda'
  | 'bugun'
  | 'kechikdi'
  | 'yopilgan';

export interface IshKabi {
  boshlanganSana: Date;
  tugaganSana: Date | null;
}

export interface YozuvKabi {
  natija: KuzatuvNatijasi;
  qaytaUrinishSanasi: Date | null;
}

/**
 * Bitta bosqichning holati.
 *
 * "yopilgan" - ish bosqich muddatidan OLDIN tugagan: tekshirishga
 * odam qolmagan, uni "kechikdi" deb qizartirib qo'yish noto'g'ri
 * bo'lardi. Bu holat hisobotda "ketgan" deb sanaladi.
 */
export function bosqichHolati(
  ish: IshKabi,
  kun: number,
  yozuv: YozuvKabi | null,
  hozir: Date
): BosqichHolati {
  if (yozuv?.natija === 'MALUMOT_OLINDI') return 'bajarildi';

  const muddat = muddatSanasi(ish.boshlanganSana, kun);
  if (ish.tugaganSana && ish.tugaganSana.getTime() < muddat.getTime()) return 'yopilgan';

  if (yozuv?.natija === 'BOGLANILMADI') {
    const qayta = yozuv.qaytaUrinishSanasi;
    return qayta && sanaOrali(qayta, hozir) > 0 ? 'boglanilmadi' : 'qayta_urinish';
  }

  const f = sanaOrali(muddat, hozir);
  if (f > 0) return 'kutilmoqda';
  if (f === 0) return 'bugun';
  return 'kechikdi';
}

/* ── Yozuvni tekshirish va tozalash (toza funksiya) ── */

export interface TekshiruvKonteksti {
  boshlanganSana: Date;
  tugaganSana: Date | null;
  hozir: Date;
}

export type TekshiruvNatijasi =
  | { ok: true; d: KuzatuvKirishi }
  | { ok: false; xabar: string };

const bor = (j: KuzatuvJavobi) => j !== 'NOMALUM';

/**
 * Kiritilgan ma'lumotni mantiq bo'yicha tekshiradi va normallashtiradi.
 *
 * Bu yerda yolg'on "bilim" to'xtatiladi: manbasiz javob, ziddiyatli
 * javob, kelajak sanasi, bosqichdan bir necha hafta oldin yozilgan
 * "30 kunlik" tekshiruv.
 */
export function kuzatuvniTekshir(kiritish: KuzatuvKirishi, k: TekshiruvKonteksti): TekshiruvNatijasi {
  const d: KuzatuvKirishi = { ...kiritish };
  const xato = (xabar: string): TekshiruvNatijasi => ({ ok: false, xabar });

  /* ── Sana (kun bo'yicha, soat emas) ── */
  if (Number.isNaN(d.tekshiruvSanasi.getTime())) return xato('Маълумот олинган сана нотўғри');
  if (toshkentKunFarqi(d.tekshiruvSanasi, k.hozir) > 0) {
    return xato('Маълумот олинган сана келажакда бўлиши мумкин эмас');
  }
  if (toshkentKunFarqi(d.tekshiruvSanasi, k.boshlanganSana) < 0) {
    return xato('Маълумот олинган сана ишга кирган санадан олдин бўлиши мумкин эмас');
  }
  const eng_erta = muddatSanasi(k.boshlanganSana, d.kunBelgisi - ERTA_YOZISH_KUNI);
  if (toshkentKunFarqi(d.tekshiruvSanasi, eng_erta) < 0) {
    return xato(
      `${d.kunBelgisi} кунлик текширув ишга кирганидан камида ${d.kunBelgisi - ERTA_YOZISH_KUNI} кун ўтгач қайд этилади`
    );
  }

  /* ── Боғланиб бўлмади: ҳеч қандай «билим» йўқ ── */
  if (d.natija === 'BOGLANILMADI') {
    const qayta =
      d.qaytaUrinishSanasi ?? new Date(k.hozir.getTime() + QAYTA_URINISH_KUNI * KUN_MS);
    return {
      ok: true,
      d: {
        ...d,
        manba: 'NOMALUM',
        ishBoshladi: 'NOMALUM',
        ishdaQolmoqda: 'NOMALUM',
        haqOlmoqda: 'NOMALUM',
        sharoitMos: 'NOMALUM',
        qoshimchaYordam: 'NOMALUM',
        ishHaqiSom: null,
        oilaDaromadiSom: null,
        daromadManbasi: 'NOMALUM',
        tugashSababi: null,
        tugaganSana: null,
        dalilId: null,
        qaytaUrinishSanasi: qayta,
      },
    };
  }

  /* ── Маълумот олинди ── */
  const javoblar: KuzatuvJavobi[] = [
    d.ishBoshladi,
    d.ishdaQolmoqda,
    d.haqOlmoqda,
    d.sharoitMos,
    d.qoshimchaYordam,
  ];
  const daromadBor = d.ishHaqiSom != null || d.oilaDaromadiSom != null;

  if (!javoblar.some(bor) && !daromadBor) {
    return xato('Ҳеч қандай жавоб киритилмаган. Боғланиб бўлмаган бўлса, «Боғланиб бўлмади» деб белгиланг');
  }
  if (javoblar.some(bor) && d.manba === 'NOMALUM') {
    return xato('Жавоб берилган бўлса, маълумот манбаини кўрсатинг (фуқаро билдирган, ходим қайд этган ёки текширилган)');
  }

  /* Даромад: манбасиз сон — "ёлғон билим" */
  if (daromadBor && d.daromadManbasi === 'NOMALUM') {
    return xato('Даромад киритилган бўлса, унинг манбаини кўрсатинг');
  }
  if (!daromadBor) d.daromadManbasi = 'NOMALUM';

  /* "Текширилган" — тасдиқланган далил билан */
  if ((d.manba === 'TEKSHIRILGAN' || d.daromadManbasi === 'TEKSHIRILGAN') && !d.dalilId) {
    return xato('«Текширилган» фақат тасдиқланган далил билан боғланганда танланади');
  }

  /* ── Зиддиятлар ── */
  if (d.ishBoshladi === 'YOQ' && d.ishdaQolmoqda === 'HA') {
    return xato('Зиддият: «ишга кирмаган» дейилган, аммо «ишда қолаяпти» деб ёзилган');
  }
  if (d.ishdaQolmoqda === 'HA' && k.tugaganSana && toshkentKunFarqi(k.tugaganSana, d.tekshiruvSanasi) <= 0) {
    return xato('Зиддият: бу иш воқеасида иш тугагани қайд этилган, аммо «ишда қолаяпти» деб ёзилган');
  }

  /* ── Иш тугаган бўлса — сана ва сабаб шарт ── */
  if (d.ishdaQolmoqda === 'YOQ' && !k.tugaganSana) {
    if (!d.tugashSababi || d.tugashSababi.length < SABAB_ENG_KAM) {
      return xato('Ишдан кетган бўлса, сабабини ёзинг');
    }
    if (!d.tugaganSana) return xato('Иш қачон тугаганини кўрсатинг');
    if (toshkentKunFarqi(d.tugaganSana, k.boshlanganSana) < 0) {
      return xato('Иш тугаган сана ишга кирган санадан олдин бўлиши мумкин эмас');
    }
    if (toshkentKunFarqi(d.tugaganSana, k.hozir) > 0) {
      return xato('Иш тугаган сана келажакда бўлиши мумкин эмас');
    }
  }
  if (d.ishdaQolmoqda !== 'YOQ') {
    d.tugashSababi = null;
    d.tugaganSana = null;
  }

  d.qaytaUrinishSanasi = null;
  return { ok: true, d };
}

/* ── Baza amallari ── */

export class KuzatuvXatosi extends Error {
  constructor(
    public readonly kod: 'TOPILMADI' | 'RUXSAT' | 'NOTOGRI' | 'TEKSHIRILGAN' | 'DALIL',
    xabar: string
  ) {
    super(xabar);
  }
}

export const KUZATUV_HTTP: Record<KuzatuvXatosi['kod'], number> = {
  TOPILMADI: 404,
  RUXSAT: 403,
  NOTOGRI: 400,
  TEKSHIRILGAN: 409,
  DALIL: 400,
};

/**
 * Bitta ishning bitta bosqichi uchun tekshiruvni yozadi (yoki yangilaydi).
 *
 * "Tekshirilgan" yozuv QAYTA YOZILMAYDI: hujjat bilan tasdiqlangan
 * ma'lumotni keyin pastroq darajadagi gap ("fuqaro aytdi") bilan
 * almashtirib qo'yish isbotni jimgina yo'q qilardi.
 */
export async function kuzatuvYozish(
  sessiya: Pick<Sessiya, 'rol' | 'mahallaId' | 'userId'>,
  kiritish: KuzatuvKirishi,
  hozir = new Date()
): Promise<{ id: string; yangi: boolean; ishTugatildi: boolean; ogohlantirish?: string }> {
  const ish = await prisma.ishgaJoylashish.findUnique({
    where: { id: kiritish.joylashishId },
    select: {
      id: true,
      ishsizId: true,
      boshlanganSana: true,
      tugaganSana: true,
      ishsiz: {
        select: {
          mahallaId: true,
          arxivSanasi: true,
          household: { select: { oylikDaromad: true } },
        },
      },
    },
  });
  if (!ish || ish.ishsiz.arxivSanasi) throw new KuzatuvXatosi('TOPILMADI', 'Иш воқеаси топилмади');
  if (!mahallagaRuxsat(sessiya, ish.ishsiz.mahallaId)) {
    throw new KuzatuvXatosi('RUXSAT', 'Бу фуқарога ҳуқуқингиз йўқ');
  }

  const t = kuzatuvniTekshir(kiritish, {
    boshlanganSana: ish.boshlanganSana,
    tugaganSana: ish.tugaganSana,
    hozir,
  });
  if (!t.ok) throw new KuzatuvXatosi('NOTOGRI', t.xabar);
  const d = t.d;

  /* ── Далил: ШУ фуқарога тегишли ва ТАСДИҚЛАНГАН бўлиши шарт ── */
  if (d.dalilId) {
    const dalil = await prisma.joylashuvDalili.findUnique({
      where: { id: d.dalilId },
      select: { ishsizId: true, joylashishId: true, holati: true },
    });
    if (
      !dalil ||
      dalil.ishsizId !== ish.ishsizId ||
      (dalil.joylashishId !== null && dalil.joylashishId !== ish.id) ||
      dalil.holati !== 'TASDIQLANDI'
    ) {
      throw new KuzatuvXatosi(
        'DALIL',
        'Далил топилмади, бошқа фуқарога ёки бошқа ишга тегишли, ёки ҳали тасдиқланмаган'
      );
    }
  }

  const rejaSana = muddatSanasi(ish.boshlanganSana, d.kunBelgisi);
  const tasdiq =
    d.natija === 'MALUMOT_OLINDI' && (d.manba === 'TEKSHIRILGAN' || d.daromadManbasi === 'TEKSHIRILGAN')
      ? hozir
      : null;

  const bigint = (x: number | null | undefined) => (x == null ? null : BigInt(x));
  /* Boshlang'ich daromad yuborilmagan bo'lsa — xatlovdagi qiymat */
  const oldingi =
    d.oldingiDaromadSom !== undefined ? bigint(d.oldingiDaromadSom) : (ish.ishsiz.household?.oylikDaromad ?? null);

  const ustunlar = {
    rejaSana,
    natija: d.natija,
    tekshiruvSanasi: d.tekshiruvSanasi,
    tasdiqSanasi: tasdiq,
    manba: d.manba as MalumotDarajasi,
    ishBoshladi: d.ishBoshladi,
    ishdaQolmoqda: d.ishdaQolmoqda,
    haqOlmoqda: d.haqOlmoqda,
    sharoitMos: d.sharoitMos,
    qoshimchaYordam: d.qoshimchaYordam,
    ishHaqiSom: bigint(d.ishHaqiSom),
    oilaDaromadiSom: bigint(d.oilaDaromadiSom),
    oldingiDaromadSom: oldingi,
    daromadManbasi: d.daromadManbasi as MalumotDarajasi,
    tugashSababi: d.tugashSababi,
    yordamIzohi: d.yordamIzohi,
    dalilId: d.dalilId ?? null,
    qaytaUrinishSanasi: d.qaytaUrinishSanasi ?? null,
    kiritganId: sessiya.userId,
  };

  /* Tekshirilgan yozuvga tegilmaydi — shart ЁЗИШ пайтида (атомар) */
  const yangilash = () =>
    prisma.kuzatuvTekshiruvi.updateMany({
      where: {
        joylashishId: ish.id,
        kunBelgisi: d.kunBelgisi,
        NOT: { natija: 'MALUMOT_OLINDI', manba: 'TEKSHIRILGAN' },
      },
      data: ustunlar,
    });

  let yangi = false;
  let id: string;
  const bor_ = await prisma.kuzatuvTekshiruvi.findUnique({
    where: { kuzatuv_bosqichi: { joylashishId: ish.id, kunBelgisi: d.kunBelgisi } },
    select: { id: true },
  });

  if (bor_) {
    const n = await yangilash();
    if (n.count === 0) {
      throw new KuzatuvXatosi('TEKSHIRILGAN', 'Бу босқичдаги текширилган ёзув ўзгартирилмайди');
    }
    id = bor_.id;
  } else {
    try {
      const y = await prisma.kuzatuvTekshiruvi.create({
        data: { joylashishId: ish.id, kunBelgisi: d.kunBelgisi, ...ustunlar },
        select: { id: true },
      });
      id = y.id;
      yangi = true;
    } catch (e) {
      /* Parallel yozuv: ikkinchi xodim biroz oldin yozgan — yangilashga o'tamiz */
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const n = await yangilash();
        if (n.count === 0) {
          throw new KuzatuvXatosi('TEKSHIRILGAN', 'Бу босқичдаги текширилган ёзув ўзгартирилмайди');
        }
        const mavjud = await prisma.kuzatuvTekshiruvi.findUnique({
          where: { kuzatuv_bosqichi: { joylashishId: ish.id, kunBelgisi: d.kunBelgisi } },
          select: { id: true },
        });
        id = mavjud!.id;
      } else {
        throw e;
      }
    }
  }

  /* ── Иш тугагани — мавжуд механизм орқали (сабаб ва сана билан) ── */
  let ishTugatildi = false;
  let ogohlantirish: string | undefined;
  if (d.natija === 'MALUMOT_OLINDI' && d.ishdaQolmoqda === 'YOQ' && d.tugaganSana && !ish.tugaganSana) {
    const r = await joylashishniTugat({
      joylashishId: ish.id,
      userId: sessiya.userId,
      tugaganSana: d.tugaganSana,
      sabab: d.tugashSababi ?? '',
    });
    ishTugatildi = r.ok;
    if (!r.ok) ogohlantirish = 'Кузатув ёзилди, аммо иш воқеасини тугатиб бўлмади — фуқаро саҳифасидан қўлда тугатинг';
  }

  return { id, yangi, ishTugatildi, ogohlantirish };
}

/* ── Muddati kelgan tekshiruvlar ro'yxati ── */

export interface KuzatuvIshi {
  joylashishId: string;
  ishsizId: string;
  fish: string;
  mahalla: string;
  korxona: string;
  boshlanganSana: Date;
  kun: Bosqich;
  rejaSana: Date;
  holat: BosqichHolati;
  /** Muddatgacha (musbat) yoki kechikkan (manfiy) kunlar */
  kunFarqi: number;
}

/** Ro'yxatga TUSHADIGAN holatlar */
const ISH_KERAK: BosqichHolati[] = ['bugun', 'kechikdi', 'qayta_urinish', 'kutilmoqda'];

/**
 * Bajarilishi kerak bo'lgan kuzatuv tekshiruvlari.
 *
 * ── Nega yozuvlar oldindan YARATILMAYDI ──
 *
 * Har ish uchun uchta "kutilayotgan" qator yozilsa, mavjud barcha
 * joylashishlar uchun ham yozish kerak bo'lardi (orqaga qarab
 * to'ldirish). Ro'yxat esa ishga kirgan sanadan HISOBLANADI: yozuv
 * faqat tekshiruv o'tkazilganda paydo bo'ladi. Shunda eski ishlarga
 * tegilmaydi va hech narsa "unutilib" yaratilmay qolmaydi.
 *
 * Juda eski ishlar (muddatidan `ESKIRISH_KUNI` kun o'tgan) ro'yxatni
 * to'ldirmaydi: ularni "kechikdi" deb ko'rsatish foydasiz shov-shuv.
 */
export async function kuzatuvIshlari(
  mahallaId: string | undefined,
  hozir = new Date(),
  opts: { oldinKun?: number; take?: number } = {}
): Promise<KuzatuvIshi[]> {
  const oldin = opts.oldinKun ?? 7;
  const eng_eski = new Date(hozir.getTime() - (BOSQICHLAR[2] + ESKIRISH_KUNI) * KUN_MS);
  const eng_yangi = new Date(hozir.getTime() - (BOSQICHLAR[0] - oldin) * KUN_MS);

  const ishlar = await prisma.ishgaJoylashish.findMany({
    where: {
      boshlanganSana: { gte: eng_eski, lte: eng_yangi },
      ishsiz: { arxivSanasi: null, ...(mahallaId ? { mahallaId } : {}) },
    },
    orderBy: { boshlanganSana: 'asc' },
    take: opts.take ?? 1000,
    select: {
      id: true,
      ishsizId: true,
      korxonaNomi: true,
      boshlanganSana: true,
      tugaganSana: true,
      ishsiz: { select: { fish: true, mahalla: { select: { nomi: true } } } },
      kuzatuvlar: { select: { kunBelgisi: true, natija: true, qaytaUrinishSanasi: true } },
    },
  });

  const chiqdi: KuzatuvIshi[] = [];
  for (const ish of ishlar) {
    for (const kun of BOSQICHLAR) {
      const yozuv = ish.kuzatuvlar.find((k) => k.kunBelgisi === kun) ?? null;
      const holat = bosqichHolati(ish, kun, yozuv, hozir);
      if (!ISH_KERAK.includes(holat)) continue;

      const rejaSana = muddatSanasi(ish.boshlanganSana, kun);
      const farq = sanaOrali(rejaSana, hozir);
      /* Juda uzoq kelajak yoki juda eski — ro'yxatga kirmaydi */
      if (holat === 'kutilmoqda' && farq > oldin) continue;
      if (holat === 'kechikdi' && farq < -ESKIRISH_KUNI) continue;

      chiqdi.push({
        joylashishId: ish.id,
        ishsizId: ish.ishsizId,
        fish: ish.ishsiz.fish,
        mahalla: ish.ishsiz.mahalla.nomi,
        korxona: ish.korxonaNomi,
        boshlanganSana: ish.boshlanganSana,
        kun,
        rejaSana,
        holat,
        kunFarqi: farq,
      });
    }
  }
  return chiqdi.sort((a, b) => a.rejaSana.getTime() - b.rejaSana.getTime());
}

/* ── Ko'rsatkichlar ── */

type Manba3 = 'FUQARO_BILDIRGAN' | 'XODIM_QAYD_ETGAN' | 'TEKSHIRILGAN';

export interface BosqichKorsatkichi {
  kun: Bosqich;
  /** Shu bosqich muddati o'tgan ishlar soni */
  kohort: number;
  qolgan: number;
  ketgan: number;
  /** Javobi MA'LUM EMAS: qolgan + ketgan + nomalum = kohort */
  nomalum: number;
  nomalumSabablari: { tekshirilmagan: number; boglanilmadi: number; javobsiz: number };
  manbaQolgan: Record<Manba3, number>;
  manbaKetgan: Record<Manba3, number>;
  /** qolgan / (qolgan + ketgan); javobi ma'lum hech kim bo'lmasa — null (0 EMAS) */
  qolishDarajasi: number | null;
  /** (qolgan + ketgan) / kohort; kohort bo'sh bo'lsa — null */
  malumotQamrovi: number | null;
}

export interface DaromadKorsatkichi {
  /** Ikkala qiymat (boshlang'ich va hozirgi) ma'lum bo'lgan fuqarolar */
  juftlar: number;
  /** Kuzatuv yozuvi bor, lekin juft ma'lum emas */
  nomalum: number;
  /** O'zgarish (so'm/oy) medianasi; juft yo'q bo'lsa — null */
  medianaOzgarish: number | null;
  oshgan: number;
  tushgan: number;
  ozgarmagan: number;
  /** "Hozirgi daromad" qiymatlari manbasi bo'yicha */
  manbalar: Record<Manba3, number>;
}

export interface KuzatuvKorsatkichlari {
  hozir: Date;
  /** Noyob fuqarolar - ish almashtirgan bir marta sanaladi */
  joylashganFuqarolar: number;
  /** Ish voqealari - bitta fuqaroda bir nechta bo'lishi mumkin */
  ishVoqealari: number;
  birNechtaIshdaBolganlar: number;
  bosqichlar: BosqichKorsatkichi[];
  daromad: DaromadKorsatkichi;
}

const bosh3 = (): Record<Manba3, number> => ({
  FUQARO_BILDIRGAN: 0,
  XODIM_QAYD_ETGAN: 0,
  TEKSHIRILGAN: 0,
});

function medianaOl(a: number[]): number | null {
  if (a.length === 0) return null;
  const t = [...a].sort((x, y) => x - y);
  const o = Math.floor(t.length / 2);
  return t.length % 2 ? t[o] : Math.round((t[o - 1] + t[o]) / 2);
}

export interface HisobIshi {
  ishsizId: string;
  boshlanganSana: Date;
  tugaganSana: Date | null;
  kuzatuvlar: {
    kunBelgisi: number;
    natija: KuzatuvNatijasi;
    tekshiruvSanasi: Date;
    manba: MalumotDarajasi;
    ishdaQolmoqda: KuzatuvJavobi;
    oilaDaromadiSom: bigint | null;
    oldingiDaromadSom: bigint | null;
    daromadManbasi: MalumotDarajasi;
  }[];
}

/**
 * Ko'rsatkichlarni TOZA funksiya sifatida hisoblaydi (baza kerak emas) -
 * shuning uchun sintetik ma'lumot bilan to'liq sinab bo'ladi.
 */
export function korsatkichlarniHisobla(ishlar: HisobIshi[], hozir: Date): KuzatuvKorsatkichlari {
  const fuqarolar = new Map<string, number>();
  for (const i of ishlar) fuqarolar.set(i.ishsizId, (fuqarolar.get(i.ishsizId) ?? 0) + 1);

  const bosqichlar: BosqichKorsatkichi[] = BOSQICHLAR.map((kun) => {
    const k: BosqichKorsatkichi = {
      kun,
      kohort: 0,
      qolgan: 0,
      ketgan: 0,
      nomalum: 0,
      nomalumSabablari: { tekshirilmagan: 0, boglanilmadi: 0, javobsiz: 0 },
      manbaQolgan: bosh3(),
      manbaKetgan: bosh3(),
      qolishDarajasi: null,
      malumotQamrovi: null,
    };

    for (const ish of ishlar) {
      const muddat = muddatSanasi(ish.boshlanganSana, kun);
      /* Muddati hali kelmagan ish kohortga KIRMAYDI */
      if (muddat.getTime() > hozir.getTime()) continue;
      k.kohort++;

      /* Ish bosqich muddatidan OLDIN tugagan - ishda qolmagan (ishonchli: ish voqeasi) */
      if (ish.tugaganSana && ish.tugaganSana.getTime() < muddat.getTime()) {
        k.ketgan++;
        k.manbaKetgan.XODIM_QAYD_ETGAN++;
        continue;
      }

      const yozuv = ish.kuzatuvlar.find((y) => y.kunBelgisi === kun);
      if (!yozuv) {
        k.nomalum++;
        k.nomalumSabablari.tekshirilmagan++;
        continue;
      }
      if (yozuv.natija === 'BOGLANILMADI') {
        k.nomalum++;
        k.nomalumSabablari.boglanilmadi++;
        continue;
      }
      if (yozuv.ishdaQolmoqda === 'NOMALUM' || yozuv.manba === 'NOMALUM') {
        k.nomalum++;
        k.nomalumSabablari.javobsiz++;
        continue;
      }
      if (yozuv.ishdaQolmoqda === 'HA') {
        k.qolgan++;
        k.manbaQolgan[yozuv.manba as Manba3]++;
      } else {
        k.ketgan++;
        k.manbaKetgan[yozuv.manba as Manba3]++;
      }
    }

    const malum = k.qolgan + k.ketgan;
    k.qolishDarajasi = malum > 0 ? k.qolgan / malum : null;
    k.malumotQamrovi = k.kohort > 0 ? malum / k.kohort : null;
    return k;
  });

  /* ── Daromad: har fuqaroning ENG OXIRGI ma'lum yozuvi, bir marta ── */
  const oxirgi = new Map<string, HisobIshi['kuzatuvlar'][number]>();
  for (const ish of ishlar) {
    for (const y of ish.kuzatuvlar) {
      if (y.natija !== 'MALUMOT_OLINDI') continue;
      const oldingi = oxirgi.get(ish.ishsizId);
      if (!oldingi || y.tekshiruvSanasi.getTime() > oldingi.tekshiruvSanasi.getTime()) {
        oxirgi.set(ish.ishsizId, y);
      }
    }
  }
  const daromad: DaromadKorsatkichi = {
    juftlar: 0,
    nomalum: 0,
    medianaOzgarish: null,
    oshgan: 0,
    tushgan: 0,
    ozgarmagan: 0,
    manbalar: bosh3(),
  };
  const farqlar: number[] = [];
  for (const y of oxirgi.values()) {
    if (y.oilaDaromadiSom == null || y.oldingiDaromadSom == null) {
      daromad.nomalum++;
      continue;
    }
    daromad.juftlar++;
    const f = Number(y.oilaDaromadiSom - y.oldingiDaromadSom);
    farqlar.push(f);
    if (f > 0) daromad.oshgan++;
    else if (f < 0) daromad.tushgan++;
    else daromad.ozgarmagan++;
    if (y.daromadManbasi !== 'NOMALUM') daromad.manbalar[y.daromadManbasi as Manba3]++;
  }
  daromad.medianaOzgarish = medianaOl(farqlar);

  return {
    hozir,
    joylashganFuqarolar: fuqarolar.size,
    ishVoqealari: ishlar.length,
    birNechtaIshdaBolganlar: [...fuqarolar.values()].filter((n) => n > 1).length,
    bosqichlar,
    daromad,
  };
}

/**
 * Hudud bo'yicha ko'rsatkichlar. Arxivdagi fuqaro hisobga KIRMAYDI
 * (relation filtri qo'lda: `$extends` qorovuli ichki filtrga ta'sir qilmaydi).
 */
export async function kuzatuvKorsatkichlari(
  mahallaId: string | undefined,
  hozir = new Date()
): Promise<KuzatuvKorsatkichlari> {
  const ishlar = await prisma.ishgaJoylashish.findMany({
    where: {
      boshlanganSana: { lte: hozir },
      ishsiz: { arxivSanasi: null, ...(mahallaId ? { mahallaId } : {}) },
    },
    select: {
      ishsizId: true,
      boshlanganSana: true,
      tugaganSana: true,
      kuzatuvlar: {
        select: {
          kunBelgisi: true,
          natija: true,
          tekshiruvSanasi: true,
          manba: true,
          ishdaQolmoqda: true,
          oilaDaromadiSom: true,
          oldingiDaromadSom: true,
          daromadManbasi: true,
        },
      },
    },
  });
  return korsatkichlarniHisobla(ishlar, hozir);
}
