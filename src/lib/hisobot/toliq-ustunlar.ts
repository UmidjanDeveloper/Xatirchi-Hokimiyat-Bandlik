/**
 * ============================================================
 *  ТЎЛИҚ ЭКСПОРТ УСТУНЛАРИ
 *
 *  Ҳокимлик андозаси анкетанинг ҳаммасини сўрамайди: унда
 *  «коллеж талабалари» бор, «ичимлик суви» эса йўқ. Аммо
 *  ҳокимга баъзан АНКЕТАНИНГ ЎЗИ керак бўлади — «қайси
 *  оилада газ йўқ» ёки «ким асаларичилик қилмоқчи» деган
 *  савол андозадан чиқмайди.
 *
 *  Шунинг учун жадвал китобига иккита қўшимча варақ
 *  қўшилади: хатловнинг БАРЧА майдони ва фуқаро анкетасининг
 *  БАРЧА майдони. Андоза варақларига тегилмайди — ҳокимлик
 *  кутган етти варақ ўз жойида қолади.
 *
 *  ── Нега устун номлари қўлда ёзилган ──
 *
 *  Майдон номидан автоматик сарлавҳа ясаш мумкин эди
 *  («bogchaKutayotganAyollar» → «Bogcha Kutayotgan Ayollar»),
 *  аммо уни ҳоким ўқий олмасди. Бу ерда ҳар устун
 *  анкетадаги САВОЛ билан аталган.
 * ============================================================
 */

import {
  BANDLIK_TAKLIFI,
  CHET_EL_DAVLATI,
  CHORVA_TURI,
  DAROMAD_MANBAI,
  GAZ_TURI,
  HAYDOVCHILIK_TOIFASI,
  HUNAR_TURI,
  ICHIMLIK_SUVI,
  INFRATUZILMA_MUAMMOSI,
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
  PASSIV_DAROMAD_TURI,
  TOMORQA_FOYDALANISH,
  UY_HOLATI,
  VALYUTA,
  kirillcha,
  type Variant,
} from '@/lib/constants';
import { ISHSIZ_HOLATI } from '@/lib/ishsiz-holati';
import type { IshsizHolati } from '@prisma/client';

/** Битта устун: сарлавҳа ва қийматни олиш йўли */
export interface Ustun<T> {
  nomi: string;
  ol: (y: T) => unknown;
}

/* ── Қийматни катакка тушадиган кўринишга келтириш ─────────── */

/**
 * ── НЕГА ҲАММА ҚИЙМАТ КИРИЛЛГА ЎГИРИЛАДИ ──
 *
 * Каталог қийматлари базада ЛОТИНДА сақланади: «Erkak»,
 * «O'rta maxsus», «Quduq». Жадвални эса ҳоким ўқийди ва у
 * кириллда ишлайди — иловадаги ҳамма матн кириллда.
 *
 * Хом қиймат чиқарилса, битта файлда иккита ёзув аралашиб
 * кетарди: сарлавҳа кириллда, устун ичи лотинда. Ҳужжат
 * сифатида бу ишламайди.
 *
 * Каталогда топилмаган қиймат ЎЗГАРМАЙ қолади: эски
 * анкетадаги қиймат йўқолиб кетмаслиги керак.
 */

/** Каталогдаги қийматни кириллга ўгиради */
const kat = (katalog: Variant[]) => (x: unknown): string | null => {
  if (x === null || x === undefined || x === '') return null;
  return kirillcha(katalog, String(x));
};

/** Каталогдаги массивни кириллга ўгириб, вергул билан бирлаштиради */
const katRoyxat = (katalog: Variant[]) => (x: unknown): string | null => {
  if (!Array.isArray(x) || !x.length) return null;
  return x.map((v) => kirillcha(katalog, String(v))).join(', ');
};

/** Хатлов ҳолати — база энумидан кириллга */
const XATLOV_HOLATI: Record<string, string> = {
  QORALAMA: 'Қоралама',
  YUBORILGAN: 'Юборилган',
  TASDIQLANGAN: 'Тасдиқланган',
};

/** Массивни вергул билан бирлаштиради */
const royxat = (x: unknown): string | null => {
  if (!Array.isArray(x) || !x.length) return null;
  return x.map((v) => String(v)).join(', ');
};

/** Мантиқий қиймат — «ҳа» ёки «йўқ» */
export const haYoqMatn = (x: unknown): string | null =>
  x === null || x === undefined ? null : x ? 'ҳа' : 'йўқ';

/** Сана — фақат кун (вақтсиз) */
const sana = (x: unknown): string | null =>
  x instanceof Date ? x.toISOString().slice(0, 10) : null;

/** BigInt — Excel сон сифатида қабул қилмайди, рақамга ўгирамиз */
const son = (x: unknown): number | null => {
  if (x === null || x === undefined) return null;
  const n = typeof x === 'bigint' ? Number(x) : Number(x);
  return Number.isFinite(n) ? n : null;
};

/** JSON рўйхатдаги шахслар — «Ф.И.Ш. (ўрни)» кўринишида */
const shaxslar = (x: unknown): string | null => {
  if (!Array.isArray(x) || !x.length) return null;
  return x
    .map((s) => {
      const o = s as { fish?: string; orni?: string; guruh?: string };
      const qismlar = [o.orni, o.guruh].filter(Boolean).join(', ');
      return o.fish ? `${o.fish}${qismlar ? ` (${qismlar})` : ''}` : null;
    })
    .filter(Boolean)
    .join('; ');
};

/** Оддий матн — бўш сатр катакда нол бўлиб қолмасин */
const matn = (x: unknown): string | null => {
  if (x === null || x === undefined) return null;
  const t = String(x).trim();
  return t ? t : null;
};

/* ── ХОНАДОН ───────────────────────────────────────────────── */

type Xonadon = Record<string, unknown>;

/**
 * Хатлов анкетасининг барча майдони — анкетадаги тартибда.
 *
 * Тартиб АТАЙЛАБ анкета билан бир хил: ходим қоғоздаги
 * анкетани ушлаб туриб жадвални ўқий олиши керак.
 */
export const XONADON_USTUNLARI: Ustun<Xonadon>[] = [
  /* ── Паспорт ── */
  { nomi: 'МФЙ', ol: (x) => matn((x.mahalla as { nomiKirill?: string })?.nomiKirill) },
  { nomi: 'Манзил', ol: (x) => matn(x.manzil) },
  { nomi: 'Оила бошлиғи', ol: (x) => matn(x.oilaBoshligi) },
  { nomi: 'Жинси', ol: (x) => kat(JINS)(x.oilaBoshligiJinsi) },
  { nomi: 'Туғилган санаси', ol: (x) => sana(x.oilaBoshligiTugilganSana) },
  { nomi: 'Туғилган йили', ol: (x) => son(x.tugilganYili) },
  { nomi: 'Телефон', ol: (x) => matn(x.telefon) },
  { nomi: 'Хатлов санаси', ol: (x) => sana(x.xatlovSanasi) },
  { nomi: 'Хатловчи ходим', ol: (x) => matn((x.xodim as { fullName?: string })?.fullName) },
  { nomi: 'Ҳолати', ol: (x) => XATLOV_HOLATI[String(x.holati)] ?? matn(x.holati) },

  /* ── 0. Оила таркиби ── */
  { nomi: 'Жами аъзо', ol: (x) => son(x.jamiAzo) },
  { nomi: 'Болалар сони', ol: (x) => son(x.bolalarSoni) },
  { nomi: '0–3 ёшдаги бола', ol: (x) => son(x.bolalar0_3Yosh) },
  { nomi: '3–17 ёшдаги бола', ol: (x) => son(x.bolalar3_17Yosh) },
  { nomi: '18 ёшдан катта', ol: (x) => son(x.bolalar18Yoshdan) },

  /* ── I. Меҳнат ва бандлик ── */
  { nomi: 'Меҳнатга лаёқатли', ol: (x) => son(x.mehnatgaLayoqatli) },
  { nomi: 'Меҳнатга лаёқатсиз', ol: (x) => son(x.mehnatgaLayoqatsiz) },
  { nomi: 'Ишлайдиганлар', ol: (x) => son(x.ishlaydiganlar) },
  { nomi: 'Давлат корхонасида', ol: (x) => son(x.davlatKorxonada) },
  { nomi: 'Хусусий секторда', ol: (x) => son(x.xususiySektorda) },
  { nomi: 'Ишсизлар сони', ol: (x) => son(x.ishsizlarSoni) },
  { nomi: 'Боғча кутаётган аёллар', ol: (x) => son(x.bogchaKutayotganAyollar) },
  { nomi: 'Ишсизлик муддати (ой)', ol: (x) => son(x.ishsizlikMuddatiOy) },
  { nomi: 'Иш тури истаги', ol: (x) => kat(ISH_TURI_ISTAGI)(x.ishTuriIstagi) },
  { nomi: 'Касб-ҳунар истаги', ol: (x) => haYoqMatn(x.kasbHunarIstagi) },
  { nomi: 'Касб-ҳунар йўналиши', ol: (x) => katRoyxat(KASB_YONALISHI)(x.kasbHunarYonalishi) },
  { nomi: 'Бандлик таклифлари', ol: (x) => matn(x.bandlikTakliflari) },

  /* ── II. Тадбиркорлик ва молия ── */
  { nomi: 'Тадбиркорлик истаги', ol: (x) => haYoqMatn(x.tadbirkorlikIstagi) },
  { nomi: 'Тадбиркорлик соҳаси', ol: (x) => katRoyxat(KASB_YONALISHI)(x.tadbirkorlikSohasi) },
  { nomi: 'Молиявий эҳтиёж', ol: (x) => haYoqMatn(x.moliyaEhtiyoji) },
  { nomi: 'Молия тури', ol: (x) => katRoyxat(MOLIYA_TURI)(x.moliyaTuri) },
  { nomi: 'Талаб қилинган маблағ (сўм)', ol: (x) => son(x.talabQilinganMablag) },
  { nomi: 'Маблағ йўналиши', ol: (x) => katRoyxat(MABLAG_YONALISHI)(x.mablagYonalishi) },
  { nomi: 'Маблағ йўналиши (бошқа)', ol: (x) => matn(x.mablagYonalishiBoshqa) },

  /* ── II-Б. Чет эл ── */
  { nomi: 'Чет элда меҳнат', ol: (x) => haYoqMatn(x.chetElMehnati) },
  { nomi: 'Чет элдаги ишчилар', ol: (x) => son(x.chetElIshchilar) },
  { nomi: 'Давлатлар', ol: (x) => katRoyxat(CHET_EL_DAVLATI)(x.chetElDavlatlari) },
  { nomi: 'Давлат (бошқа)', ol: (x) => matn(x.chetElBoshqaDavlat) },
  { nomi: 'Шаҳарлар', ol: (x) => royxat(x.chetElShaharlari) },
  { nomi: 'Шаҳар (бошқа)', ol: (x) => matn(x.chetElBoshqaShahar) },
  { nomi: 'Ойлик пул (киритилган)', ol: (x) => son(x.chetElOylikPul) },
  { nomi: 'Валютаси', ol: (x) => kat(VALYUTA)(x.chetElValyuta) },
  { nomi: 'Ойлик пул (сўмда)', ol: (x) => son(x.chetElOylikPulSom) },

  /* ── III. Даромад ── */
  { nomi: 'Ойлик даромад (сўм)', ol: (x) => son(x.oylikDaromad) },
  { nomi: 'Даромад манбалари', ol: (x) => katRoyxat(DAROMAD_MANBAI)(x.daromadManbalari) },
  { nomi: 'Даромадни кўпайтириш имконияти', ol: (x) => matn(x.daromadImkoniyati) },
  { nomi: 'Камбағаллик сабаблари', ol: (x) => katRoyxat(KAMBAGALLIK_SABABI)(x.kambagallikSabablari) },

  /* ── IV. Болалар таълими ── */
  { nomi: 'Мактабгача ёшдаги бола', ol: (x) => son(x.maktabgachaYoshdagi) },
  { nomi: 'Боғча қамровида', ol: (x) => son(x.maktabgachaQamrovda) },
  { nomi: 'Боғчага бормаслик сабаби', ol: (x) => matn(x.maktabgachaQamrovsizSababi) },
  { nomi: 'Мактаб ёшидаги бола', ol: (x) => son(x.maktabYoshdagi) },
  { nomi: 'Мактаб қамровида', ol: (x) => son(x.maktabQamrovda) },
  { nomi: 'Тўгарак қамрови', ol: (x) => son(x.togarakQamrovi) },
  { nomi: 'Тўгаракка бормаслик сабаби', ol: (x) => matn(x.togarakSababi) },
  { nomi: 'Болалар қизиқишлари', ol: (x) => royxat(x.bolalarQiziqishlari) },

  /* ── V. Соғлиқ ── */
  { nomi: 'Узоқ даволаниш зарур', ol: (x) => haYoqMatn(x.uzoqDavolanish) },
  { nomi: 'Даволаниш изоҳи', ol: (x) => matn(x.uzoqDavolanishIzoh) },
  { nomi: 'Дори эҳтиёжи', ol: (x) => matn(x.doriEhtiyoji) },
  { nomi: 'Тиббий хизмат эҳтиёжи', ol: (x) => matn(x.tibbiyXizmatEhtiyoji) },
  { nomi: 'Охирги тиббий кўрик', ol: (x) => matn(x.oxirgiTibbiyKorik) },

  /* ── VI. Уй-жой ва коммунал ── */
  { nomi: 'Уй ҳолати', ol: (x) => kat(UY_HOLATI)(x.uyHolati) },
  { nomi: 'Ичимлик суви', ol: (x) => kat(ICHIMLIK_SUVI)(x.ichimlikSuvi) },
  { nomi: 'Суғориш суви', ol: (x) => haYoqMatn(x.sugorishSuvi) },
  { nomi: 'Электр', ol: (x) => haYoqMatn(x.elektr) },
  { nomi: 'Газ', ol: (x) => haYoqMatn(x.gaz) },
  { nomi: 'Газ тури', ol: (x) => kat(GAZ_TURI)(x.gazTuri) },
  { nomi: 'Канализация', ol: (x) => haYoqMatn(x.kanalizatsiya) },
  { nomi: 'Санитария', ol: (x) => matn(x.sanitariya) },
  { nomi: 'Бошқа муаммолар', ol: (x) => matn(x.boshqaMuammolar) },

  /* ── VII. Ижтимоий ҳимоя ── */
  { nomi: 'Ногиронлик бор', ol: (x) => haYoqMatn(x.nogironlikBor) },
  { nomi: 'Ногиронлик изоҳи', ol: (x) => matn(x.nogironlikIzoh) },
  { nomi: 'Ногиронлиги бўлган шахслар', ol: (x) => shaxslar(x.nogironShaxslar) },
  { nomi: 'Ёлғиз кекса', ol: (x) => haYoqMatn(x.yolgizKeksa) },
  { nomi: 'Ёлғиз кекса шахслар', ol: (x) => shaxslar(x.yolgizKeksaShaxslar) },
  { nomi: 'Парваришга муҳтож', ol: (x) => haYoqMatn(x.parvarishgaMuhtoj) },
  { nomi: 'Парвариш изоҳи', ol: (x) => matn(x.parvarishIzoh) },
  { nomi: 'Парваришга муҳтож шахслар', ol: (x) => shaxslar(x.parvarishShaxslar) },
  { nomi: 'Бошқа муҳтожлар', ol: (x) => matn(x.boshqaMuhtojlar) },

  /* ── VIII. Ҳужжатлаштириш ── */
  { nomi: 'Ҳужжатлар тўлиқ', ol: (x) => haYoqMatn(x.hujjatlarToliq) },
  { nomi: 'Ҳужжат изоҳи', ol: (x) => matn(x.hujjatIzoh) },
  { nomi: 'Хизмат тўсиқлари', ol: (x) => matn(x.xizmatTosiqlari) },

  /* ── IX. Ер, чорва ва ҳунармандчилик ── */
  { nomi: 'Томорқа бор', ol: (x) => haYoqMatn(x.tomorqaBor) },
  { nomi: 'Томорқа майдони (сотих)', ol: (x) => son(x.tomorqaMaydoni) },
  { nomi: 'Экин майдони (сотих)', ol: (x) => son(x.ekinMaydoni) },
  { nomi: 'Томорқадан фойдаланиш', ol: (x) => kat(TOMORQA_FOYDALANISH)(x.tomorqaFoydalanish) },
  { nomi: 'Қўшимча ер бор', ol: (x) => haYoqMatn(x.qoshimchaYerBor) },
  { nomi: 'Қўшимча ер майдони (сотих)', ol: (x) => son(x.qoshimchaYerMaydoni) },
  { nomi: 'Чорва бор', ol: (x) => haYoqMatn(x.chorvaBor) },
  { nomi: 'Чорва турлари', ol: (x) => katRoyxat(CHORVA_TURI)(x.chorvaTurlari) },
  { nomi: 'Йирик шохли (бош)', ol: (x) => son(x.yirikShoxliSoni) },
  { nomi: 'Майда шохли (бош)', ol: (x) => son(x.maydaShoxliSoni) },
  { nomi: 'Парранда (бош)', ol: (x) => son(x.parrandaSoni) },
  { nomi: 'Чорвачилик изоҳи', ol: (x) => matn(x.chorvachilik) },
  { nomi: 'Ҳунарманд бор', ol: (x) => haYoqMatn(x.hunarmandBor) },
  { nomi: 'Ҳунар турлари', ol: (x) => katRoyxat(HUNAR_TURI)(x.hunarTurlari) },
  { nomi: 'Ҳунармандчилик изоҳи', ol: (x) => matn(x.hunarmandchilik) },
  { nomi: 'Зарур кўмак', ol: (x) => katRoyxat(MOLIYA_TURI)(x.zarurKomak) },
  { nomi: 'Иссиқхона талаби', ol: (x) => haYoqMatn(x.issiqxonaTalabi) },
  { nomi: 'Иссиқхона майдони (сотих)', ol: (x) => son(x.issiqxonaMaydoni) },
  { nomi: 'Ижара ер', ol: (x) => haYoqMatn(x.ijaraYer) },
  { nomi: 'Ижара ер майдони (сотих)', ol: (x) => son(x.ijaraYerMaydoni) },

  /* ── X. Қўшимча даромад ── */
  { nomi: 'Қўшимча даромад истаги', ol: (x) => haYoqMatn(x.passivDaromadIstagi) },
  { nomi: 'Қўшимча даромад турлари', ol: (x) => katRoyxat(PASSIV_DAROMAD_TURI)(x.passivDaromadTurlari) },
  { nomi: 'Қўшимча даромад изоҳи', ol: (x) => matn(x.passivDaromadIzohi) },

  /* ── XI. Инфратузилма ── */
  { nomi: 'Инфратузилма муаммолари', ol: (x) => katRoyxat(INFRATUZILMA_MUAMMOSI)(x.infratuzilmaMuammolari) },
  { nomi: 'Инфратузилма (бошқа)', ol: (x) => matn(x.infratuzilmaBoshqa) },
  { nomi: 'Инфратузилма изоҳи', ol: (x) => matn(x.infratuzilmaIzohi) },

  /* ── XII. Хулоса, розилик ва имзо ── */
  { nomi: 'Умумий хулоса', ol: (x) => matn(x.umumiyXulosa) },
  { nomi: 'Розилик берди', ol: (x) => haYoqMatn(x.rozilikBerdi) },
  { nomi: 'Имзо қўйилган', ol: (x) => haYoqMatn(Boolean(x.imzoYoli)) },
  { nomi: 'Имзо вақти', ol: (x) => sana(x.imzoVaqti) },
];

/* ── ИШСИЗ ФУҚАРО ──────────────────────────────────────────── */

type Fuqaro = Record<string, unknown>;

export const FUQARO_USTUNLARI: Ustun<Fuqaro>[] = [
  { nomi: 'МФЙ', ol: (x) => matn((x.mahalla as { nomiKirill?: string })?.nomiKirill) },
  { nomi: 'Ф.И.Ш.', ol: (x) => matn(x.fish) },
  { nomi: 'Телефон', ol: (x) => matn(x.telefon) },
  { nomi: 'Жинси', ol: (x) => kat(JINS)(x.jinsi) },
  { nomi: 'Туғилган санаси', ol: (x) => sana(x.tugilganSana) },
  { nomi: 'Миллати', ol: (x) => matn(x.millati) },
  { nomi: 'Оилавий ҳолати', ol: (x) => kat(OILAVIY_HOLAT)(x.oilaviyHolat) },
  { nomi: 'Фарзандлар сони', ol: (x) => son(x.farzandlarSoni) },
  { nomi: 'Яшаш манзили', ol: (x) => matn(x.yashashManzili) },
  { nomi: 'Оила бошлиғи (хонадон)', ol: (x) => matn((x.household as { oilaBoshligi?: string })?.oilaBoshligi) },

  { nomi: 'Маълумоти', ol: (x) => kat(MALUMOT)(x.malumoti) },
  { nomi: 'Мутахассислиги', ol: (x) => matn(x.mutaxassisligi) },
  { nomi: 'Иш тажрибаси (йил)', ol: (x) => son(x.ishTajribasiYil) },
  { nomi: 'Охирги иш жойи', ol: (x) => matn(x.oxirgiIshJoyi) },
  { nomi: 'Аввалги иш жойи', ol: (x) => matn(x.avvalgiIshJoyi) },
  { nomi: 'Ишдан бўшаган санаси', ol: (x) => sana(x.ishdanBoshaganSana) },

  { nomi: 'Соғлиқ ҳолати', ol: (x) => matn(x.sogliqHolati) },
  { nomi: 'Ногиронлик', ol: (x) => haYoqMatn(x.nogironlik) },
  { nomi: 'Ногиронлик гуруҳи', ol: (x) => kat(NOGIRONLIK_GURUHI)(x.nogironlikGuruhi) },

  { nomi: 'Касб-ҳунар эҳтиёжи', ol: (x) => haYoqMatn(x.kasbHunarEhtiyoji) },
  { nomi: 'Ўрганмоқчи касб', ol: (x) => matn(x.organmoqchiKasb) },
  { nomi: 'Хоҳлаган иш', ol: (x) => matn(x.xohlaganIsh) },
  { nomi: 'Кутилаётган маош (сўм)', ol: (x) => son(x.kutilayotganMaosh) },
  { nomi: 'Ишга тайёрлиги', ol: (x) => kat(ISHGA_TAYYORLIK)(x.ishgaTayyorligi) },
  { nomi: 'Ҳайдовчилик гувоҳномаси', ol: (x) => haYoqMatn(x.haydovchilikGuvohnomasi) },
  { nomi: 'Ҳайдовчилик тоифаси', ol: (x) => katRoyxat(HAYDOVCHILIK_TOIFASI)(x.haydovchilikToifasi) },
  { nomi: 'IT-шаҳарча ваучери', ol: (x) => haYoqMatn(x.itShaharchaVaucheri) },
  { nomi: 'Имтиёз эҳтиёжи', ol: (x) => haYoqMatn(x.imtiyozEhtiyoji) },
  { nomi: 'Имтиёз тури', ol: (x) => katRoyxat(MOLIYA_TURI)(x.imtiyozTuri) },

  { nomi: 'Ҳолати', ol: (x) => ISHSIZ_HOLATI[x.holati as IshsizHolati]?.kirill ?? matn(x.holati) },
  { nomi: 'Берилган таклифлар', ol: (x) => katRoyxat(BANDLIK_TAKLIFI)(x.takliflar) },
  { nomi: 'Таклиф изоҳи', ol: (x) => matn(x.taklifIzohi) },
  { nomi: 'Суҳбат санаси', ol: (x) => sana(x.suhbatSanasi) },
  { nomi: 'Мутахассис', ol: (x) => matn((x.mutaxassis as { fullName?: string })?.fullName) },
  { nomi: 'Иш жойи', ol: (x) => matn(x.ishJoyi) },
  { nomi: 'Иш лавозими', ol: (x) => matn(x.ishLavozimi) },
  { nomi: 'Ишга кирган санаси', ol: (x) => sana(x.ishgaKirganSana) },
  { nomi: 'Рад сабаби', ol: (x) => matn(x.radSababi) },
  { nomi: 'Хулоса', ol: (x) => matn(x.xulosa) },
  { nomi: 'Киритилган санаси', ol: (x) => sana(x.createdAt) },
];
