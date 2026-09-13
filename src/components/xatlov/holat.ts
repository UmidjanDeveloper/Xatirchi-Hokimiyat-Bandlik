import type { IshsizQisqa } from '@/lib/xatlov-sxema';

/**
 * ============================================================
 *  FORMA HOLATI
 *
 *  Raqamli maydonlar `number | ''` turida saqlanadi.
 *
 *  Sababi: `0` va "hali to'ldirilmagan" bir xil narsa emas.
 *  Agar bo'sh maydonni 0 deb saqlasak, xodim "ishsizlar soni"
 *  ni umuman ko'rmay o'tib ketganda ham tizim "0 ta ishsiz" deb
 *  yozib qo'yadi va o'sha xonadon hisobotdan tushib qoladi.
 *  Bo'sh qoldirilgani ko'rinib turishi kerak.
 * ============================================================
 */

export type Raqam = number | '';

export interface IshsizQatori
  extends Omit<IshsizQisqa, 'kutilayotganMaosh' | 'ishTajribasiYil' | 'tugilganSana'> {
  /** Formadagi vaqtinchalik identifikator - React `key` uchun */
  qatorId: string;
  kutilayotganMaosh: Raqam;
  ishTajribasiYil: Raqam;
  /**
   * Tug'ilgan sana `YYYY-MM-DD` ko'rinishidagi MATN.
   *
   * `<input type="date">` aynan shu shaklni talab qiladi va
   * `Date` obyekti bilan ishlamaydi. Serverga yuborishdan oldin
   * bo'sh satr `null` ga aylantiriladi - sxema esa uni o'zi
   * `Date` ga o'giradi (`z.coerce.date()`).
   */
  tugilganSana: string;
}

export interface XatlovHolati {
  mahallaId: string;
  manzil: string;
  oilaBoshligi: string;
  oilaBoshligiJinsi: string | null;
  /**
   * Oila boshlig'ining tug'ilgan sanasi - `YYYY-MM-DD` matn.
   *
   * `tugilganYili` (yil) shundan OLINADI va alohida terilmaydi:
   * bir tushunchani ikki joyda so'rash - keyin ular bir-biriga
   * mos kelmasligining eng oson yo'li.
   */
  oilaBoshligiTugilganSana: string;
  tugilganYili: Raqam;
  telefon: string;
  jamiAzo: Raqam;
  bolalarSoni: Raqam;

  // I. Mehnat va bandlik
  mehnatgaLayoqatli: Raqam;
  ishlaydiganlar: Raqam;
  davlatKorxonada: Raqam;
  xususiySektorda: Raqam;
  ishsizlarSoni: Raqam;
  bogchaKutayotganAyollar: Raqam;
  ishsizlikMuddatiOy: Raqam;
  ishTuriIstagi: string | null;
  kasbHunarIstagi: boolean;
  kasbHunarYonalishi: string[];
  bandlikTakliflari: string;

  // II. Tadbirkorlik
  tadbirkorlikIstagi: boolean;
  tadbirkorlikSohasi: string[];
  moliyaEhtiyoji: boolean;
  moliyaTuri: string[];
  talabQilinganMablag: Raqam;
  mablagYonalishi: string[];

  // II-B. Chet elda mehnat
  chetElMehnati: boolean;
  chetElIshchilar: Raqam;
  chetElDavlatlari: string[];
  chetElBoshqaDavlat: string;
  chetElOylikPul: Raqam;

  // III. Daromad
  oylikDaromad: Raqam;
  daromadManbalari: string[];
  daromadImkoniyati: string;
  kambagallikSabablari: string[];

  // IV. Bolalar ta'limi
  maktabgachaYoshdagi: Raqam;
  maktabgachaQamrovda: Raqam;
  maktabgachaQamrovsizSababi: string;
  maktabYoshdagi: Raqam;
  maktabQamrovda: Raqam;
  bolalarQiziqishlari: string[];
  togarakQamrovi: Raqam;
  togarakSababi: string;

  // V. Sog'liq
  uzoqDavolanish: boolean;
  uzoqDavolanishIzoh: string;
  doriEhtiyoji: string;
  tibbiyXizmatEhtiyoji: string;
  oxirgiTibbiyKorik: string;

  // VI. Uy-joy
  uyHolati: string | null;
  ichimlikSuvi: string | null;
  sugorishSuvi: boolean;
  elektr: boolean;
  gaz: boolean;
  gazTuri: string | null;
  kanalizatsiya: boolean;
  sanitariya: string;
  boshqaMuammolar: string;

  // VII. Ijtimoiy himoya
  nogironlikBor: boolean;
  nogironlikIzoh: string;
  nogironShaxslar: ShaxsQatori[];
  yolgizKeksa: boolean;
  parvarishgaMuhtoj: boolean;
  parvarishIzoh: string;
  parvarishShaxslar: ShaxsQatori[];
  boshqaMuhtojlar: string;

  // VIII. Hujjatlar
  hujjatlarToliq: boolean;
  hujjatIzoh: string;
  xizmatTosiqlari: string;

  // IX. Yer, chorva va hunarmandchilik
  tomorqaBor: boolean;
  ekinMaydoni: Raqam;
  chorvaBor: boolean;
  chorvaTurlari: string[];
  hunarmandBor: boolean;
  hunarTurlari: string[];
  hunarmandchilik: string;
  zarurKomak: string[];
  issiqxonaTalabi: boolean;
  issiqxonaMaydoni: Raqam;
  ijaraYer: boolean;
  ijaraYerMaydoni: Raqam;

  // X. Xulosa
  umumiyXulosa: string;

  // Rozilik va imzo
  rozilikBerdi: boolean;
  imzoYoli: string;

  ishsizlar: IshsizQatori[];
}

/**
 * Formadagi bitta shaxs qatori.
 *
 * `qatorId` faqat brauzerda yashaydi: React ro'yxatni qayta
 * chizganda qaysi maydon qaysi qatorga tegishli ekanini bilishi
 * kerak. Indeks bilan ishlatsa, o'rtadan bitta qator o'chirilganda
 * qolganlarining qiymati aralashib ketadi.
 */
export interface ShaxsQatori {
  qatorId: string;
  fish: string;
  orni: string | null;
  orniIzoh: string;
  guruhi: string | null;
}

export function bosShaxs(): ShaxsQatori {
  return {
    qatorId: Math.random().toString(36).slice(2, 10),
    fish: '',
    orni: null,
    orniIzoh: '',
    guruhi: null,
  };
}

export function bosHolat(mahallaId = ''): XatlovHolati {
  return {
    mahallaId,
    manzil: '',
    oilaBoshligi: '',
    oilaBoshligiJinsi: null,
    oilaBoshligiTugilganSana: '',
    tugilganYili: '',
    telefon: '',
    jamiAzo: '',
    bolalarSoni: '',

    mehnatgaLayoqatli: '',
    ishlaydiganlar: '',
    davlatKorxonada: '',
    xususiySektorda: '',
    ishsizlarSoni: '',
    bogchaKutayotganAyollar: '',
    ishsizlikMuddatiOy: '',
    ishTuriIstagi: null,
    kasbHunarIstagi: false,
    kasbHunarYonalishi: [],
    bandlikTakliflari: '',

    tadbirkorlikIstagi: false,
    tadbirkorlikSohasi: [],
    moliyaEhtiyoji: false,
    moliyaTuri: [],
    talabQilinganMablag: '',
    mablagYonalishi: [],

    chetElMehnati: false,
    chetElIshchilar: '',
    chetElDavlatlari: [],
    chetElBoshqaDavlat: '',
    chetElOylikPul: '',

    oylikDaromad: '',
    daromadManbalari: [],
    daromadImkoniyati: '',
    kambagallikSabablari: [],

    maktabgachaYoshdagi: '',
    maktabgachaQamrovda: '',
    maktabgachaQamrovsizSababi: '',
    maktabYoshdagi: '',
    maktabQamrovda: '',
    bolalarQiziqishlari: [],
    togarakQamrovi: '',
    togarakSababi: '',

    uzoqDavolanish: false,
    uzoqDavolanishIzoh: '',
    doriEhtiyoji: '',
    tibbiyXizmatEhtiyoji: '',
    oxirgiTibbiyKorik: '',

    uyHolati: null,
    ichimlikSuvi: null,
    sugorishSuvi: false,
    // Xatirchi tumanida elektr deyarli hamma xonadonda bor, gaz esa
    // ko'p qishloqda yo'q. Boshlang'ich qiymat shunga qarab qo'yilgan.
    elektr: true,
    gaz: false,
    gazTuri: null,
    kanalizatsiya: false,
    sanitariya: '',
    boshqaMuammolar: '',

    nogironlikBor: false,
    nogironlikIzoh: '',
    nogironShaxslar: [],
    yolgizKeksa: false,
    parvarishgaMuhtoj: false,
    parvarishIzoh: '',
    parvarishShaxslar: [],
    boshqaMuhtojlar: '',

    hujjatlarToliq: true,
    hujjatIzoh: '',
    xizmatTosiqlari: '',

    tomorqaBor: false,
    ekinMaydoni: '',
    chorvaBor: false,
    chorvaTurlari: [],
    hunarmandBor: false,
    hunarTurlari: [],
    hunarmandchilik: '',
    zarurKomak: [],
    issiqxonaTalabi: false,
    issiqxonaMaydoni: '',
    ijaraYer: false,
    ijaraYerMaydoni: '',

    umumiyXulosa: '',

    rozilikBerdi: false,
    imzoYoli: '',

    ishsizlar: [],
  };
}

export function bosIshsiz(): IshsizQatori {
  return {
    qatorId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fish: '',
    telefon: '',
    jinsi: 'Erkak',
    tugilganSana: '',
    malumoti: null,
    mutaxassisligi: '',
    ishTajribasiYil: '',
    xohlaganIsh: '',
    kutilayotganMaosh: '',
    haydovchilikGuvohnomasi: false,
    haydovchilikToifasi: [],
    kasbHunarEhtiyoji: false,
    organmoqchiKasb: '',
    itShaharchaVaucheri: false,
  };
}

/** `number | ''` ni serverga yuboriladigan qiymatga aylantiradi */
export const r = (x: Raqam): number | null => (x === '' ? null : x);

/** Bo'sh satrni `null` ga aylantiradi */
export const m = (x: string): string | null => (x.trim() ? x.trim() : null);

/**
 * Forma holatini API kutgan ko'rinishga o'tkazadi.
 * Bir joyda turishi muhim: qoralama ham, yakuniy yuborish ham shuni ishlatadi.
 */
export function yuborishUchun(h: XatlovHolati) {
  const { ishsizlar, ...x } = h;
  return {
    xonadon: {
      ...x,
      tugilganYili: r(x.tugilganYili),
      jamiAzo: r(x.jamiAzo),
      bolalarSoni: r(x.bolalarSoni),
      mehnatgaLayoqatli: r(x.mehnatgaLayoqatli),
      ishlaydiganlar: r(x.ishlaydiganlar),
      davlatKorxonada: r(x.davlatKorxonada),
      xususiySektorda: r(x.xususiySektorda),
      ishsizlarSoni: r(x.ishsizlarSoni),
      bogchaKutayotganAyollar: r(x.bogchaKutayotganAyollar),
      ishsizlikMuddatiOy: r(x.ishsizlikMuddatiOy),
      talabQilinganMablag: r(x.talabQilinganMablag),
      chetElIshchilar: r(x.chetElIshchilar),
      chetElOylikPul: r(x.chetElOylikPul),
      oylikDaromad: r(x.oylikDaromad),
      maktabgachaYoshdagi: r(x.maktabgachaYoshdagi),
      maktabgachaQamrovda: r(x.maktabgachaQamrovda),
      maktabYoshdagi: r(x.maktabYoshdagi),
      maktabQamrovda: r(x.maktabQamrovda),
      togarakQamrovi: r(x.togarakQamrovi),
      ekinMaydoni: r(x.ekinMaydoni),
      issiqxonaMaydoni: r(x.issiqxonaMaydoni),
      ijaraYerMaydoni: r(x.ijaraYerMaydoni),
      telefon: x.telefon.trim(),
      bandlikTakliflari: m(x.bandlikTakliflari),
      daromadImkoniyati: m(x.daromadImkoniyati),
      maktabgachaQamrovsizSababi: m(x.maktabgachaQamrovsizSababi),
      togarakSababi: m(x.togarakSababi),
      uzoqDavolanishIzoh: m(x.uzoqDavolanishIzoh),
      doriEhtiyoji: m(x.doriEhtiyoji),
      tibbiyXizmatEhtiyoji: m(x.tibbiyXizmatEhtiyoji),
      oxirgiTibbiyKorik: m(x.oxirgiTibbiyKorik),
      sanitariya: m(x.sanitariya),
      boshqaMuammolar: m(x.boshqaMuammolar),
      nogironlikIzoh: m(x.nogironlikIzoh),
      parvarishIzoh: m(x.parvarishIzoh),
      boshqaMuhtojlar: m(x.boshqaMuhtojlar),
      hujjatIzoh: m(x.hujjatIzoh),
      xizmatTosiqlari: m(x.xizmatTosiqlari),
      hunarmandchilik: m(x.hunarmandchilik),
      umumiyXulosa: m(x.umumiyXulosa),
      // Bo'sh sana `null` - sxema uni `Date` ga o'giradi
      oilaBoshligiTugilganSana: x.oilaBoshligiTugilganSana || null,
      imzoYoli: m(x.imzoYoli),

      /*
       * Shaxs qatorlaridan `qatorId` olib tashlanadi - u faqat
       * brauzerda React uchun kerak edi, bazada o'rni yo'q.
       * Bo'sh qolgan qatorlar ham tushirib qoldiriladi: xodim
       * "qo'shish" ni bosib, keyin to'ldirmasligi mumkin.
       */
      nogironShaxslar: x.nogironShaxslar
        .filter((p) => p.fish.trim() && p.orni)
        .map(({ qatorId: _q, ...p }) => ({ ...p, orniIzoh: m(p.orniIzoh) })),
      parvarishShaxslar: x.parvarishShaxslar
        .filter((p) => p.fish.trim() && p.orni)
        .map(({ qatorId: _q, ...p }) => ({ ...p, orniIzoh: m(p.orniIzoh), guruhi: null })),
    },
    ishsizlar: ishsizlar.map(({ qatorId: _qatorId, ...p }) => ({
      ...p,
      telefon: m(p.telefon ?? ''),
      mutaxassisligi: m(p.mutaxassisligi ?? ''),
      xohlaganIsh: m(p.xohlaganIsh ?? ''),
      organmoqchiKasb: m(p.organmoqchiKasb ?? ''),
      ishTajribasiYil: r(p.ishTajribasiYil),
      kutilayotganMaosh: r(p.kutilayotganMaosh),
      // Bo'sh sana `null` - sxema uni `Date` ga o'giradi
      tugilganSana: p.tugilganSana || null,
    })),
  };
}
