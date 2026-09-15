/**
 * ============================================================
 *  HISOBOT MA'LUMOTINING SHAKLI
 *
 *  Bitta tur ta'rifi uchta narsani boshqaradi: server nimani
 *  yig'ishini, PDF nimani chizishini va Excel nimani yozishini.
 *  Shuning uchun u alohida faylda turadi - aks holda PDF va
 *  Excel bir-biridan ajralib ketadi va bitta hisobotda ikki xil
 *  raqam chiqadi.
 *
 *  ── Nega "bo'lim" tushunchasi bor ──
 *
 *  Ilgari hisobotda faqat bandlik raqamlari bor edi: voronka,
 *  qamrov, toifalar. Lekin xatlov anketasi 10 bo'limdan iborat
 *  va ularning har biri chora-tadbir talab qiladi - gazsiz
 *  xonadon, bog'chaga bormaydigan bola, uzoq davolanayotgan
 *  bemor. Bularning hammasi bazada bor edi, lekin hisobotga
 *  chiqmasdi va hokim ularni ko'rmasdi.
 *
 *  Endi har bir bo'lim o'z jadvali va o'z diagrammasi bilan
 *  chiqadi. Bo'lim bo'sh bo'lsa - tushib qoladi, sun'iy nol
 *  qatorlar yozilmaydi.
 * ============================================================
 */

/** Hisobot qaysi hududni qamraydi */
export type Qamrov =
  | { turi: 'tuman' }
  | { turi: 'mahalla'; mahallaId: string; nomiKirill: string };

/* ── Qurilish g'ishtlari ─────────────────────────────────────── */

export interface Korsatkich {
  nomi: string;
  qiymat: string;
  /** Kichik izoh - raqamning ma'nosi */
  izoh?: string;
  /**
   * Yaxshi tomoni qaysi yo'nalish.
   *
   * Hisobotda rang bilan belgilanadi: qamrov 40% bo'lsa qizil,
   * 90% bo'lsa yashil. Ishsizlar soni esa teskari - ko'p bo'lsa
   * yomon. Busiz rang yolg'on gapiradi.
   */
  yonalish?: 'kop-yaxshi' | 'kam-yaxshi' | 'betaraf';
  /** Foiz sifatida ko'rsatiladigan qiymat (0-100) - progress uchun */
  foiz?: number;
}

export interface Qator {
  /** Birinchi ustun - nom */
  nomi: string;
  /** Qolgan ustunlar */
  qiymatlar: (string | number)[];
  /** Jami qatori - qalin va chiziq bilan ajratiladi */
  jami?: boolean;
}

export interface Ustun {
  sarlavha: string;
  raqamli?: boolean;
  /** PDF da ustun kengligi (mm) */
  eni?: number;
}

export interface Jadval {
  sarlavha: string;
  izoh?: string;
  ustunlar: Ustun[];
  qatorlar: Qator[];
}

/** Diagramma - PDF va Excel ikkalasi ham shundan chizadi */
export interface Diagramma {
  turi: 'ustun' | 'gorizontal' | 'doira' | 'chiziq' | 'yigma';
  sarlavha: string;
  izoh?: string;
  /** X o'qi yoki bo'lak nomlari */
  nomlar: string[];
  /** Har bir qator: nomi va qiymatlari */
  qatorlar: { nomi: string; qiymatlar: number[] }[];
  /** Qiymatlar foizmi - o'q va yorliqlarga `%` qo'shiladi */
  foiz?: boolean;
}

/**
 * Hisobotning bir bo'limi.
 *
 * Bo'limda kamida bittasi bo'lishi kerak: jadval yoki diagramma.
 * Ikkalasi ham bo'sh bo'lsa, bo'lim hisobotga qo'shilmaydi.
 */
export interface Bolim {
  /** Qisqa kalit - kod ichida bo'limni topish uchun */
  kalit: string;
  sarlavha: string;
  /**
   * Excel varag'i uchun QISQA nom.
   *
   * Excel varaq nomini 31 belgida kesadi va uzun sarlavha
   * so'zning o'rtasidan uzilib qoladi: «Тадбиркорлик, касб-ҳунар
   * ва мол». Shuning uchun har bir bo'lim o'zi uchun qisqa nom
   * beradi - avtomatik qisqartirish bunday nomni o'ylab topa
   * olmaydi.
   *
   * Berilmasa, sarlavhaning o'zi kesib ishlatiladi.
   */
  varaqNomi?: string
  /** Bo'lim nima uchun kerakligi - bir-ikki gap */
  kirish?: string;
  korsatkichlar?: Korsatkich[];
  jadvallar?: Jadval[];
  diagrammalar?: Diagramma[];
  /** Yangi sahifadan boshlansinmi (PDF) */
  yangiSahifa?: boolean;
}

/** Tavsiya - "endi nima qilish kerak" */
export interface HisobotTavsiyasi {
  daraja: 'shoshilinch' | 'muhim' | 'imkoniyat';
  sarlavha: string;
  dalil: string;
}

/**
 * Yakuniy xulosa.
 *
 * `manba` ataylab ko'rsatiladi: o'quvchi matnni AI yozganini
 * yoki qoidalar bo'yicha hisoblanganini bilishi kerak. Hokim
 * yig'ilishda "buni kim aytdi" degan savolga javob bera olishi
 * shart.
 */
export interface Xulosa {
  manba: 'ai' | 'qoida';
  /**
   * AI so'ralganmi.
   *
   * `manba: 'qoida'` ikki xil sababdan bo'ladi va ekranda ular
   * BOSHQACHA ko'rinishi kerak:
   *
   *  · mahalla xodimi va bandlik mutaxassisi uchun qoida -
   *    ATAYLAB, byudjetni tejash uchun. Bu nuqson emas va
   *    ogohlantirish kerak emas;
   *
   *  · hokim, rahbar va administrator uchun qoida - AI javob
   *    BERMAGANI. Bu nuqson va u ko'rinib turishi kerak.
   *
   * Ilgari bu farq faqat 11px kulrang izohda yozilardi, blok
   * tagida. Foydalanuvchi uni umuman ko'rmasdi va "panelda AI
   * yo'q" deb o'ylardi - holbuki AI so'ralgan, faqat kalit
   * ishlamagan.
   */
  aiKutilgan?: boolean;
  /** 2-4 gap: hozirgi holat */
  holat: string;
  /** Nima qilish kerak - tartiblangan ro'yxat */
  tavsiyalar: HisobotTavsiyasi[];
  /** AI ishlatilgan bo'lsa - qo'shimcha izoh */
  ogohlik?: string;
}

/* ── To'liq hisobot ──────────────────────────────────────────── */

export interface Hisobot {
  /**
   * Lotin yozuvi tanlanganmi.
   *
   * Ma'lumot qatorlari server tomonda allaqachon o'girilgan,
   * lekin PDF va Excel modullarining O'Z yozuvlari bor:
   * «ҲУДУД», «МУНДАРИЖА», «ТАЙЁРЛАДИ», oy nomlari. Ular shu
   * bayroqqa qarab o'giriladi.
   *
   * Busiz bitta hujjatda ikki alifbo aralashadi: ma'lumot
   * lotinda, ustunlar va muqova yozuvlari kirillda. Bir marta
   * shunday bo'lgan.
   */
  lotin: boolean;
  sarlavha: string;
  ostSarlavha: string;
  /** Hisobot qamrovi - muqovada ko'rinadi */
  qamrovNomi: string;
  /** Kim tayyorlagani */
  tayyorlagan: string;
  /** ISO sana - fayl nomida ishlatiladi */
  sana: string;
  /** Muqovadagi eng katta raqamlar */
  bosh: Korsatkich[];
  xulosa: Xulosa;
  bolimlar: Bolim[];
  /**
   * Hisobot nechta yozuvga tayangani.
   *
   * Poyda ko'rsatiladi. Hisobot 12 ta xonadon asosida
   * tuzilgan bo'lsa, o'quvchi buni bilishi kerak - aks holda
   * foizlar haqiqatdan kattaroq ko'rinadi.
   */
  asos: { xonadon: number; fuqaro: number; topshiriq: number; ishOrni: number };
}
