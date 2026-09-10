/**
 * ============================================================
 *  XATLOV MA'LUMOTLARINING SXEMASI (Zod)
 *
 *  Brauzer tekshiruvi ishonchli emas: so'rovni to'g'ridan-to'g'ri
 *  API ga yuborish mumkin. Shuning uchun server ham xuddi shu
 *  sxema bo'yicha qaytadan tekshiradi.
 *
 *  Qoralama va yakuniy yuborish uchun IKKI XIL sxema bor:
 *
 *   QORALAMA - deyarli hamma maydon ixtiyoriy. Xodim xonadonga
 *              kirdi, ikkita maydonni to'ldirdi va telefoni
 *              o'chdi - shu ham saqlanishi kerak.
 *
 *   YAKUNIY  - majburiy maydonlar talab qilinadi va arifmetika
 *              tekshiruvidan o'tadi.
 * ============================================================
 */

import { z } from 'zod';
import {
  DAROMAD_MANBAI,
  HAYDOVCHILIK_TOIFASI,
  ICHIMLIK_SUVI,
  ISHGA_TAYYORLIK,
  ISH_TURI_ISTAGI,
  JINS,
  KAMBAGALLIK_SABABI,
  KASB_YONALISHI,
  MABLAG_YONALISHI,
  MALUMOT,
  MOLIYA_TURI,
  NOGIRONLIK_GURUHI,
  OILAVIY_HOLAT,
  BANDLIK_TAKLIFI,
  UY_HOLATI,
  qiymatlar,
} from './constants';

/** Manfiy bo'lmagan butun son; bo'sh qiymat 0 ga aylanadi */
const son = (max = 100) =>
  z.coerce.number().int().min(0).max(max).nullish().transform((x) => x ?? 0);

/** Ixtiyoriy o'nlik son (maydon o'lchamlari uchun) */
const olchov = z.coerce.number().min(0).max(100_000).nullish();

/** Matn maydoni - bo'sh satr `null` ga aylanadi */
const matn = (max = 500) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((x) => {
      const t = x?.trim();
      return t ? t : null;
    });

/** Ro'yxatdan tanlangan qiymat */
const tanlov = (variantlar: { qiymat: string }[]) =>
  z.enum(qiymatlar(variantlar as never)).nullish();

/** Ro'yxatdan bir nechta tanlov */
const koptanlov = (variantlar: { qiymat: string }[]) =>
  z.array(z.enum(qiymatlar(variantlar as never))).max(20).default([]);

/** So'mdagi mablag' - 100 mlrd gacha */
const summa = z.coerce.number().int().min(0).max(100_000_000_000).nullish();

// ─────────────────────────────────────────────────────────────
//  XONADON
// ─────────────────────────────────────────────────────────────

export const XonadonSxemasi = z.object({
  mahallaId: z.string().cuid(),
  manzil: z.string().min(3).max(200),
  oilaBoshligi: z.string().min(2).max(100),
  tugilganYili: z.coerce.number().int().min(1920).max(2015).nullish(),
  telefon: matn(20),

  jamiAzo: son(50),
  bolalarSoni: son(30),

  // I. Mehnat va bandlik
  mehnatgaLayoqatli: son(40),
  ishlaydiganlar: son(40),
  davlatKorxonada: son(40),
  xususiySektorda: son(40),
  ishsizlarSoni: son(40),
  bogchaKutayotganAyollar: son(20),
  ishsizlikMuddatiOy: z.coerce.number().int().min(0).max(600).nullish(),
  ishTuriIstagi: tanlov(ISH_TURI_ISTAGI),
  kasbHunarIstagi: z.boolean().default(false),
  kasbHunarYonalishi: koptanlov(KASB_YONALISHI),
  bandlikTakliflari: matn(1000),

  // II. Tadbirkorlik va kredit-subsidiya
  tadbirkorlikIstagi: z.boolean().default(false),
  tadbirkorlikSohasi: koptanlov(MABLAG_YONALISHI),
  moliyaEhtiyoji: z.boolean().default(false),
  moliyaTuri: koptanlov(MOLIYA_TURI),
  talabQilinganMablag: summa,
  mablagYonalishi: koptanlov(MABLAG_YONALISHI),

  // III. Daromad
  oylikDaromad: summa,
  daromadManbalari: koptanlov(DAROMAD_MANBAI),
  daromadImkoniyati: matn(1000),
  kambagallikSabablari: koptanlov(KAMBAGALLIK_SABABI),

  // IV. Bolalar ta'limi
  maktabgachaYoshdagi: son(20),
  maktabgachaQamrovda: son(20),
  maktabgachaQamrovsizSababi: matn(500),
  maktabYoshdagi: son(20),
  maktabQamrovda: son(20),
  bolalarQiziqishlari: z.array(z.string().max(60)).max(20).default([]),
  togarakQamrovi: son(20),
  togarakSababi: matn(500),

  // V. Sog'liq
  uzoqDavolanish: z.boolean().default(false),
  uzoqDavolanishIzoh: matn(500),
  doriEhtiyoji: matn(500),
  tibbiyXizmatEhtiyoji: matn(500),
  oxirgiTibbiyKorik: matn(100),

  // VI. Uy-joy va kommunal
  uyHolati: tanlov(UY_HOLATI),
  ichimlikSuvi: tanlov(ICHIMLIK_SUVI),
  sugorishSuvi: z.boolean().default(false),
  elektr: z.boolean().default(true),
  gaz: z.boolean().default(false),
  kanalizatsiya: z.boolean().default(false),
  sanitariya: matn(500),
  boshqaMuammolar: matn(1000),

  // VII. Ijtimoiy himoya
  nogironlikBor: z.boolean().default(false),
  nogironlikIzoh: matn(500),
  yolgizKeksa: z.boolean().default(false),
  parvarishgaMuhtoj: z.boolean().default(false),
  parvarishIzoh: matn(500),
  boshqaMuhtojlar: matn(500),

  // VIII. Hujjatlashtirish
  hujjatlarToliq: z.boolean().default(true),
  hujjatIzoh: matn(500),
  xizmatTosiqlari: matn(1000),

  // IX. Tomorqa, yer, chorva
  tomorqaBor: z.boolean().default(false),
  tomorqaMaydoni: olchov,
  chorvachilik: matn(500),
  hunarmandchilik: matn(500),
  zarurKomak: koptanlov(MOLIYA_TURI),
  issiqxonaTalabi: z.boolean().default(false),
  issiqxonaMaydoni: olchov,
  ijaraYer: z.boolean().default(false),
  ijaraYerMaydoni: olchov,

  // X. Mahalladagi tadbirkorlik subyektlari
  tadbirkorSubyektlar: son(500),
  boshIshOrinlari: son(2000),
  subyektMoliyaEhtiyoji: z.boolean().default(false),
  yangiIshOrinlari: son(2000),

  // XI. Xulosa
  umumiyXulosa: matn(2000),
});

export type XonadonKirishi = z.input<typeof XonadonSxemasi>;
export type XonadonMalumoti = z.output<typeof XonadonSxemasi>;

/**
 * Qoralama sxemasi - deyarli hamma maydon ixtiyoriy.
 *
 * Uchtasi baribir majburiy: mahalla, manzil va oila boshlig'i.
 * Sababi texnik emas, mantiqiy - takror xatlov kaliti aynan
 * manzil va oila boshlig'idan tuziladi. Ularsiz saqlangan ikkita
 * bo'sh qoralama bir xil kalitga ega bo'lib, bir-birini to'sib
 * qo'yardi. Formada ham bu uchtasi birinchi qadamda so'raladi.
 */
export const QoralamaSxemasi = XonadonSxemasi.partial().extend({
  mahallaId: z.string().cuid(),
  manzil: z.string().min(3).max(200),
  oilaBoshligi: z.string().min(2).max(100),
});

export type QoralamaMalumoti = z.input<typeof QoralamaSxemasi>;

// ─────────────────────────────────────────────────────────────
//  ISHSIZ FUQARO
// ─────────────────────────────────────────────────────────────

export const IshsizSxemasi = z.object({
  householdId: z.string().cuid().nullish(),
  mahallaId: z.string().cuid(),

  fish: z.string().min(3).max(100),
  telefon: matn(20),
  jinsi: z.enum(qiymatlar(JINS)),
  oilaviyHolat: tanlov(OILAVIY_HOLAT),
  farzandlarSoni: son(20),
  millati: matn(50),
  tugilganSana: z.coerce.date().nullish(),
  malumoti: tanlov(MALUMOT),
  mutaxassisligi: matn(200),
  sogliqHolati: matn(500),
  nogironlik: z.boolean().default(false),
  nogironlikGuruhi: tanlov(NOGIRONLIK_GURUHI),
  yashashManzili: matn(200),

  kasbHunarEhtiyoji: z.boolean().default(false),
  organmoqchiKasb: matn(200),
  ishTajribasiYil: z.coerce.number().min(0).max(60).nullish(),
  avvalgiIshJoyi: matn(500),
  oxirgiIshJoyi: matn(300),
  ishdanBoshaganSana: z.coerce.date().nullish(),
  xohlaganIsh: matn(300),
  kutilayotganMaosh: summa,
  ishgaTayyorligi: tanlov(ISHGA_TAYYORLIK),
  haydovchilikGuvohnomasi: z.boolean().default(false),
  haydovchilikToifasi: koptanlov(HAYDOVCHILIK_TOIFASI),
  imtiyozEhtiyoji: z.boolean().default(false),
  imtiyozTuri: koptanlov(MOLIYA_TURI),

  takliflar: koptanlov(BANDLIK_TAKLIFI),
  taklifIzohi: matn(1000),
  xulosa: matn(2000),
});

export type IshsizKirishi = z.input<typeof IshsizSxemasi>;

/**
 * Xonadon xatlovi paytida kiritiladigan QISQA anketa.
 *
 * To'liq anketani (18 maydon) yettilik a'zosi eshik oldida
 * to'ldira olmaydi - u bandlik mutaxassisining suhbat vazifasi.
 * Bu bosqichda faqat "kim va nimani xohlaydi" yoziladi, qolgani
 * suhbatda to'ldiriladi.
 */
export const IshsizQisqaSxemasi = z.object({
  fish: z.string().min(3).max(100),
  telefon: matn(20),
  jinsi: z.enum(qiymatlar(JINS)),
  tugilganSana: z.coerce.date().nullish(),
  malumoti: tanlov(MALUMOT),
  mutaxassisligi: matn(200),
  ishTajribasiYil: z.coerce.number().min(0).max(60).nullish(),
  xohlaganIsh: matn(300),
  kutilayotganMaosh: summa,
  kasbHunarEhtiyoji: z.boolean().default(false),
  organmoqchiKasb: matn(200),
});

export type IshsizQisqa = z.input<typeof IshsizQisqaSxemasi>;

/** Xonadon + undagi ishsizlar - yakuniy yuborish uchun */
export const YuborishSxemasi = z.object({
  xonadon: XonadonSxemasi,
  ishsizlar: z.array(IshsizQisqaSxemasi).max(20).default([]),
});

// ─────────────────────────────────────────────────────────────
//  CHORA-TADBIR
// ─────────────────────────────────────────────────────────────

export const ChoraTadbirSxemasi = z
  .object({
    householdId: z.string().cuid().nullish(),
    ishsizId: z.string().cuid().nullish(),
    muammo: z.string().min(5).max(500),
    sababi: matn(500),
    yechim: z.string().min(5).max(500),
    masulTashkilot: z.string().min(2).max(100),
    muddat: z.coerce.date(),
  })
  .refine((d) => d.householdId || d.ishsizId, {
    message: 'Chora-tadbir xonadon yoki ishsiz fuqaroga bog‘lanishi kerak',
  });
