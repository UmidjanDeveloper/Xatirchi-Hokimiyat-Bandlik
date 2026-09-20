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
  /**
   * «Бошқа» касб танланганми — ФАҚАТ форма учун.
   *
   * Серверга юборилмайди: у ерда `organmoqchiKasb` нинг ўзи
   * етарли. Бу белги фақат матн катагини очиқ ушлаб туради,
   * ходим ёзаётганда у ёпилиб қолмасин.
   */
  boshqaKasbmi?: boolean;
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
  bolalar0_3Yosh: Raqam;
  bolalar3_17Yosh: Raqam;
  bolalar18Yoshdan: Raqam;

  // I. Mehnat va bandlik
  mehnatgaLayoqatli: Raqam;
  mehnatgaLayoqatsiz: Raqam;
  ishlaydiganlar: Raqam;
  davlatKorxonada: Raqam;
  xususiySektorda: Raqam;
  ishsizlarSoni: Raqam;
  bogchaKutayotganAyollar: Raqam;
  ishsizlikMuddatiOy: Raqam;
  ishTuriIstagi: string | null;
  kasbHunarIstagi: boolean | null;
  kasbHunarYonalishi: string[];
  bandlikTakliflari: string;

  // II. Tadbirkorlik
  tadbirkorlikIstagi: boolean | null;
  tadbirkorlikSohasi: string[];
  moliyaEhtiyoji: boolean | null;
  moliyaTuri: string[];
  talabQilinganMablag: Raqam;
  mablagYonalishi: string[];
  mablagYonalishiBoshqa: string;

  // II-B. Chet elda mehnat
  chetElMehnati: boolean | null;
  chetElIshchilar: Raqam;
  chetElDavlatlari: string[];
  chetElBoshqaDavlat: string;
  chetElOylikPul: Raqam;
  chetElValyuta: string | null;
  chetElShaharlari: string[];
  chetElBoshqaShahar: string;

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
  uzoqDavolanish: boolean | null;
  uzoqDavolanishIzoh: string;
  doriEhtiyoji: string;
  tibbiyXizmatEhtiyoji: string;
  oxirgiTibbiyKorik: string;

  // VI. Uy-joy
  uyHolati: string | null;
  ichimlikSuvi: string | null;
  sugorishSuvi: boolean | null;
  elektr: boolean | null;
  gaz: boolean | null;
  gazTuri: string | null;
  kanalizatsiya: boolean | null;
  sanitariya: string;
  boshqaMuammolar: string;

  // VII. Ijtimoiy himoya
  nogironlikBor: boolean | null;
  nogironlikIzoh: string;
  nogironShaxslar: ShaxsQatori[];
  yolgizKeksa: boolean | null;
  yolgizKeksaShaxslar: ShaxsQatori[];
  parvarishgaMuhtoj: boolean | null;
  parvarishIzoh: string;
  parvarishShaxslar: ShaxsQatori[];
  boshqaMuhtojlar: string;

  // VIII. Hujjatlar
  hujjatlarToliq: boolean | null;
  hujjatIzoh: string;
  xizmatTosiqlari: string;

  // IX. Yer, chorva va hunarmandchilik
  tomorqaBor: boolean | null;
  ekinMaydoni: Raqam;
  tomorqaFoydalanish: string | null;
  qoshimchaYerBor: boolean | null;
  qoshimchaYerMaydoni: Raqam;
  chorvaBor: boolean | null;
  chorvaTurlari: string[];
  yirikShoxliSoni: Raqam;
  maydaShoxliSoni: Raqam;
  parrandaSoni: Raqam;
  hunarmandBor: boolean | null;
  hunarTurlari: string[];
  hunarmandchilik: string;
  zarurKomak: string[];
  issiqxonaTalabi: boolean | null;
  issiqxonaMaydoni: Raqam;
  ijaraYer: boolean | null;
  ijaraYerMaydoni: Raqam;

  // X. Xulosa
  passivDaromadIstagi: boolean | null;
  passivDaromadTurlari: string[];
  /** Восита → миқдор. Бўш сатр — ҳали киритилмаган */
  passivDaromadSonlari: Record<string, Raqam>;
  passivDaromadIzohi: string;

  infratuzilmaMuammolari: string[];
  infratuzilmaBoshqa: string;
  infratuzilmaIzohi: string;


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
    bolalar0_3Yosh: '',
    bolalar3_17Yosh: '',
    bolalar18Yoshdan: '',

    mehnatgaLayoqatli: '',
    mehnatgaLayoqatsiz: '',
    ishlaydiganlar: '',
    davlatKorxonada: '',
    xususiySektorda: '',
    ishsizlarSoni: '',
    bogchaKutayotganAyollar: '',
    ishsizlikMuddatiOy: '',
    ishTuriIstagi: null,
    kasbHunarIstagi: null,
    kasbHunarYonalishi: [],
    bandlikTakliflari: '',

    tadbirkorlikIstagi: null,
    tadbirkorlikSohasi: [],
    moliyaEhtiyoji: null,
    moliyaTuri: [],
    talabQilinganMablag: '',
    mablagYonalishi: [],
    mablagYonalishiBoshqa: '',

    chetElMehnati: null,
    chetElIshchilar: '',
    chetElDavlatlari: [],
    chetElBoshqaDavlat: '',
    chetElOylikPul: '',
    chetElValyuta: 'UZS',
    chetElShaharlari: [],
    chetElBoshqaShahar: '',

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

    uzoqDavolanish: null,
    uzoqDavolanishIzoh: '',
    doriEhtiyoji: '',
    tibbiyXizmatEhtiyoji: '',
    oxirgiTibbiyKorik: '',

    uyHolati: null,
    ichimlikSuvi: null,
    sugorishSuvi: null,
    // Xatirchi tumanida elektr deyarli hamma xonadonda bor, gaz esa
    // ko'p qishloqda yo'q. Boshlang'ich qiymat shunga qarab qo'yilgan.
    elektr: null,
    gaz: null,
    gazTuri: null,
    kanalizatsiya: null,
    sanitariya: '',
    boshqaMuammolar: '',

    nogironlikBor: null,
    nogironlikIzoh: '',
    nogironShaxslar: [],
    yolgizKeksa: null,
    yolgizKeksaShaxslar: [],
    parvarishgaMuhtoj: null,
    parvarishIzoh: '',
    parvarishShaxslar: [],
    boshqaMuhtojlar: '',

    hujjatlarToliq: null,
    hujjatIzoh: '',
    xizmatTosiqlari: '',

    tomorqaBor: null,
    ekinMaydoni: '',
    tomorqaFoydalanish: null,
    qoshimchaYerBor: null,
    qoshimchaYerMaydoni: '',
    chorvaBor: null,
    chorvaTurlari: [],
    yirikShoxliSoni: '',
    maydaShoxliSoni: '',
    parrandaSoni: '',
    hunarmandBor: null,
    hunarTurlari: [],
    hunarmandchilik: '',
    zarurKomak: [],
    issiqxonaTalabi: null,
    issiqxonaMaydoni: '',
    ijaraYer: null,
    ijaraYerMaydoni: '',

    passivDaromadIstagi: null,
    passivDaromadTurlari: [],
    passivDaromadSonlari: {},
    passivDaromadIzohi: '',

    infratuzilmaMuammolari: [],
    infratuzilmaBoshqa: '',
    infratuzilmaIzohi: '',


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
 * Javobsiz Ha/Yo'q savolini `false` ga aylantiradi.
 *
 * Formada javobsiz savol `null` bo'lib turadi va yakuniy
 * yuborishda tekshiruv uni o'tkazmaydi. Lekin QORALAMA yarim
 * to'ldirilgan bo'lishi mumkin - butun mazmuni shu. Shuning
 * uchun simga чиқаётган qiymat har doim `boolean`: sxemada
 * bu maydonlar `z.boolean()` va `null` ni qabul qilmaydi,
 * qoralama saqlash esa tushunarsiz 400 xatosi bilan tugardi.
 */
export const j = (x: boolean | null): boolean => x ?? false;

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

      /* Javobsiz Ha/Yo'q — qoralamada `false` bo'lib ketadi */
      kasbHunarIstagi: j(x.kasbHunarIstagi),
      tadbirkorlikIstagi: j(x.tadbirkorlikIstagi),
      moliyaEhtiyoji: j(x.moliyaEhtiyoji),
      chetElMehnati: j(x.chetElMehnati),
      uzoqDavolanish: j(x.uzoqDavolanish),
      elektr: j(x.elektr),
      gaz: j(x.gaz),
      sugorishSuvi: j(x.sugorishSuvi),
      kanalizatsiya: j(x.kanalizatsiya),
      nogironlikBor: j(x.nogironlikBor),
      yolgizKeksa: j(x.yolgizKeksa),
      parvarishgaMuhtoj: j(x.parvarishgaMuhtoj),
      hujjatlarToliq: j(x.hujjatlarToliq),
      tomorqaBor: j(x.tomorqaBor),
      qoshimchaYerBor: j(x.qoshimchaYerBor),
      chorvaBor: j(x.chorvaBor),
      hunarmandBor: j(x.hunarmandBor),
      issiqxonaTalabi: j(x.issiqxonaTalabi),
      ijaraYer: j(x.ijaraYer),
      passivDaromadIstagi: j(x.passivDaromadIstagi),
      /*
       * Миқдорлар: бўш сатрлар ташлаб юборилади ва фақат
       * ТАНЛАНГАН воситаларники қолади. Акс ҳолда ходим
       * воситани белгилаб, кейин фикридан қайтса, базада
       * эгасиз миқдор қолиб кетарди.
       */
      passivDaromadSonlari: Object.fromEntries(
        Object.entries(x.passivDaromadSonlari)
          .filter(([tur, son]) => son !== '' && x.passivDaromadTurlari.includes(tur))
          .map(([tur, son]) => [tur, Number(son)])
      ),

      jamiAzo: r(x.jamiAzo),
      bolalarSoni: r(x.bolalarSoni),
      mehnatgaLayoqatli: r(x.mehnatgaLayoqatli),
      mehnatgaLayoqatsiz: r(x.mehnatgaLayoqatsiz),
      ishlaydiganlar: r(x.ishlaydiganlar),
      davlatKorxonada: r(x.davlatKorxonada),
      xususiySektorda: r(x.xususiySektorda),
      ishsizlarSoni: r(x.ishsizlarSoni),
      bogchaKutayotganAyollar: r(x.bogchaKutayotganAyollar),
      ishsizlikMuddatiOy: r(x.ishsizlikMuddatiOy),
      talabQilinganMablag: r(x.talabQilinganMablag),
      chetElIshchilar: r(x.chetElIshchilar),
      chetElOylikPul: r(x.chetElOylikPul),
      bolalar0_3Yosh: r(x.bolalar0_3Yosh),
      bolalar3_17Yosh: r(x.bolalar3_17Yosh),
      bolalar18Yoshdan: r(x.bolalar18Yoshdan),
      yirikShoxliSoni: r(x.yirikShoxliSoni),
      maydaShoxliSoni: r(x.maydaShoxliSoni),
      parrandaSoni: r(x.parrandaSoni),
      oylikDaromad: r(x.oylikDaromad),
      maktabgachaYoshdagi: r(x.maktabgachaYoshdagi),
      maktabgachaQamrovda: r(x.maktabgachaQamrovda),
      maktabYoshdagi: r(x.maktabYoshdagi),
      maktabQamrovda: r(x.maktabQamrovda),
      togarakQamrovi: r(x.togarakQamrovi),
      ekinMaydoni: r(x.ekinMaydoni),
      qoshimchaYerMaydoni: r(x.qoshimchaYerMaydoni),
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
    /*
      `qatorId` ва `boshqaKasbmi` — ФАҚАТ форманинг ичидаги
      белгилар. Серверда улар йўқ ва юборилмайди.
    */
    ishsizlar: ishsizlar.map(({ qatorId: _qatorId, boshqaKasbmi: _boshqa, ...p }) => ({
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
