/**
 * ============================================================
 *  XATLOV ARIFMETIKASI
 *
 *  Bu modul platformaning eng muhim farqi.
 *
 *  Qog'oz anketa ham, Google Forma ham raqamlarni tekshirmaydi.
 *  Xodim kun oxirida yigirmanchi xonadonda shoshib "5 ta ayol,
 *  4 ta erkak, jami 12 kishi" deb yozadi va forma qabul qiladi.
 *  Keyin hokim paneli o'sha raqamlar ustiga quriladi.
 *
 *  Bu yerda esa forma yubormaydi: qaysi ikki raqam bir-biriga
 *  to'g'ri kelmayotganini aniq ko'rsatadi va xodim o'sha
 *  xonadonda turib tuzatadi. Keyin tuzatib bo'lmaydi - xonadon
 *  egasi bilan qayta uchrashish kerak bo'ladi.
 *
 *  Ikki daraja bor:
 *    XATO           - yuborishga yo'l qo'yilmaydi. Faqat mantiqan
 *                     mumkin bo'lmagan holatlar (qism butundan katta).
 *    OGOHLANTIRISH  - yuborsa bo'ladi, lekin xodim bir qarab
 *                     chiqsin. Kam uchraydigan, ammo mumkin holatlar.
 *
 *  Ikkovini ajratish muhim: har bir g'alati raqamni bloklasak,
 *  xodim haqiqatan ham katta oilani yoki nol daromadli xonadonni
 *  kirita olmay qoladi va soxta raqam yozib qutuladi.
 * ============================================================
 */

export interface Nosozlik {
  /** Formadagi maydon nomi - xatoni o'sha joyga ko'rsatish uchun */
  maydon: string;
  xabar: string;
}

export interface TekshiruvHisoboti {
  xatolar: Nosozlik[];
  ogohlantirishlar: Nosozlik[];
  /** Yuborish mumkinmi */
  ok: boolean;
}

/** Tekshiruvga tushadigan raqamli maydonlar */
export interface XatlovRaqamlari {
  jamiAzo?: number | null;
  bolalarSoni?: number | null;
  mehnatgaLayoqatli?: number | null;
  ishlaydiganlar?: number | null;
  davlatKorxonada?: number | null;
  xususiySektorda?: number | null;
  ishsizlarSoni?: number | null;
  bogchaKutayotganAyollar?: number | null;

  maktabgachaYoshdagi?: number | null;
  maktabgachaQamrovda?: number | null;
  maktabYoshdagi?: number | null;
  maktabQamrovda?: number | null;
  togarakQamrovi?: number | null;

  tadbirkorSubyektlar?: number | null;
  boshIshOrinlari?: number | null;
  yangiIshOrinlari?: number | null;

  moliyaEhtiyoji?: boolean | null;
  talabQilinganMablag?: number | bigint | null;
  tomorqaBor?: boolean | null;
  tomorqaMaydoni?: number | null;
  issiqxonaTalabi?: boolean | null;
  issiqxonaMaydoni?: number | null;
  ijaraYer?: boolean | null;
  ijaraYerMaydoni?: number | null;
  oylikDaromad?: number | bigint | null;

  nogironlikBor?: boolean | null;
  nogironlikIzoh?: string | null;
  uzoqDavolanish?: boolean | null;
  uzoqDavolanishIzoh?: string | null;
}

/** `null`/`undefined` ni 0 deb oladi */
const n = (x?: number | null): number => (typeof x === 'number' && !Number.isNaN(x) ? x : 0);
const b = (x?: number | bigint | null): number => (x == null ? 0 : Number(x));

/**
 * Xatlov raqamlarining ichki mantiqini tekshiradi.
 *
 * Har bir qoida ostida NEGA shunday ekani yozilgan - keyinchalik
 * kimdir qoidani "ortiqcha" deb olib tashlamasligi uchun.
 */
export function xatlovTekshir(d: XatlovRaqamlari): TekshiruvHisoboti {
  const xatolar: Nosozlik[] = [];
  const ogohlantirishlar: Nosozlik[] = [];

  const xato = (maydon: string, xabar: string) => xatolar.push({ maydon, xabar });
  const ogoh = (maydon: string, xabar: string) => ogohlantirishlar.push({ maydon, xabar });

  const jami = n(d.jamiAzo);
  const bolalar = n(d.bolalarSoni);
  const layoqatli = n(d.mehnatgaLayoqatli);
  const ishlaydi = n(d.ishlaydiganlar);
  const davlat = n(d.davlatKorxonada);
  const xususiy = n(d.xususiySektorda);
  const ishsiz = n(d.ishsizlarSoni);

  // ── Xonadon tarkibi ──────────────────────────────────────

  if (jami < 1) {
    xato('jamiAzo', 'Xonadonda kamida 1 kishi bo‘lishi kerak');
  }

  if (bolalar > jami) {
    xato(
      'bolalarSoni',
      `Bolalar soni (${bolalar}) xonadondagi umumiy a‘zolar sonidan (${jami}) ko‘p bo‘lishi mumkin emas`
    );
  }

  if (layoqatli > jami) {
    xato(
      'mehnatgaLayoqatli',
      `Mehnatga layoqatlilar (${layoqatli}) umumiy a‘zolar sonidan (${jami}) ko‘p bo‘lishi mumkin emas`
    );
  }

  // 18 yoshgacha bola mehnatga layoqatli emas, shuning uchun ikkalasi
  // birgalikda xonadon a'zolaridan oshmasligi kerak.
  if (bolalar + layoqatli > jami) {
    xato(
      'mehnatgaLayoqatli',
      `Bolalar (${bolalar}) va mehnatga layoqatlilar (${layoqatli}) jami ${bolalar + layoqatli} — bu xonadondagi ${jami} kishidan ko‘p`
    );
  }

  // ── I bo'lim: bandlik ────────────────────────────────────

  if (ishlaydi + ishsiz > layoqatli) {
    xato(
      'ishsizlarSoni',
      `Ishlaydiganlar (${ishlaydi}) va ishsizlar (${ishsiz}) jami ${ishlaydi + ishsiz} — bu mehnatga layoqatlilar sonidan (${layoqatli}) ko‘p`
    );
  }

  // Davlat va xususiy sektor - ishlayotganlarning to'liq taqsimoti.
  // Yig'indi kamroq bo'lsa, qayerda ishlashi noma'lum qolgan odam bor;
  // ko'proq bo'lsa - bir odam ikki joyda sanalgan.
  if (davlat + xususiy > ishlaydi) {
    xato(
      'xususiySektorda',
      `Davlat (${davlat}) va xususiy sektorda (${xususiy}) jami ${davlat + xususiy} — bu ishlaydiganlar sonidan (${ishlaydi}) ko‘p`
    );
  } else if (ishlaydi > 0 && davlat + xususiy < ishlaydi) {
    ogoh(
      'xususiySektorda',
      `${ishlaydi} kishi ishlaydi, lekin faqat ${davlat + xususiy} tasining ish joyi ko‘rsatilgan`
    );
  }

  if (n(d.bogchaKutayotganAyollar) > ishsiz) {
    xato(
      'bogchaKutayotganAyollar',
      `Bog‘cha kutayotgan ayollar (${n(d.bogchaKutayotganAyollar)}) ishsizlar sonidan (${ishsiz}) ko‘p bo‘lishi mumkin emas`
    );
  }

  // ── IV bo'lim: bolalar ta'limi ───────────────────────────

  const maktabgacha = n(d.maktabgachaYoshdagi);
  const maktabYosh = n(d.maktabYoshdagi);

  if (n(d.maktabgachaQamrovda) > maktabgacha) {
    xato(
      'maktabgachaQamrovda',
      `Bog‘chaga qatnaydiganlar (${n(d.maktabgachaQamrovda)}) maktabgacha yoshdagi bolalar sonidan (${maktabgacha}) ko‘p bo‘lishi mumkin emas`
    );
  }

  if (n(d.maktabQamrovda) > maktabYosh) {
    xato(
      'maktabQamrovda',
      `Maktabga qatnaydiganlar (${n(d.maktabQamrovda)}) maktab yoshidagi bolalar sonidan (${maktabYosh}) ko‘p bo‘lishi mumkin emas`
    );
  }

  if (n(d.togarakQamrovi) > maktabgacha + maktabYosh) {
    xato(
      'togarakQamrovi',
      `To‘garakka qatnaydiganlar (${n(d.togarakQamrovi)}) xonadondagi bolalar sonidan ko‘p bo‘lishi mumkin emas`
    );
  }

  if (maktabgacha + maktabYosh > bolalar) {
    xato(
      'maktabYoshdagi',
      `Maktabgacha (${maktabgacha}) va maktab yoshidagi (${maktabYosh}) bolalar jami ${maktabgacha + maktabYosh} — bu xonadondagi bolalar sonidan (${bolalar}) ko‘p`
    );
  }

  // Maktab yoshidagi bola maktabga bormasa - bu jiddiy signal,
  // lekin haqiqat bo'lishi mumkin. Bloklamaymiz, ko'rsatamiz.
  if (maktabYosh > 0 && n(d.maktabQamrovda) < maktabYosh) {
    ogoh(
      'maktabQamrovda',
      `${maktabYosh - n(d.maktabQamrovda)} ta maktab yoshidagi bola ta’lim bilan qamrab olinmagan — sababini izohda yozing`
    );
  }

  // ── X bo'lim: tadbirkorlik subyektlari ───────────────────

  if (n(d.tadbirkorSubyektlar) === 0 && n(d.boshIshOrinlari) > 0) {
    xato(
      'boshIshOrinlari',
      'Tadbirkorlik subyektlari yo‘q, lekin bo‘sh ish o‘rinlari ko‘rsatilgan'
    );
  }

  // ── II bo'lim: moliya ────────────────────────────────────

  if (d.moliyaEhtiyoji && b(d.talabQilinganMablag) <= 0) {
    xato(
      'talabQilinganMablag',
      'Moliyaviy ehtiyoj belgilangan — talab qilinadigan mablag‘ miqdorini kiriting'
    );
  }

  if (!d.moliyaEhtiyoji && b(d.talabQilinganMablag) > 0) {
    xato(
      'talabQilinganMablag',
      'Mablag‘ miqdori kiritilgan, lekin moliyaviy ehtiyoj "yo‘q" deb belgilangan'
    );
  }

  // Byudjet rejasiga kiradigan raqam, shuning uchun aniq bo'lishi kerak.
  if (b(d.talabQilinganMablag) > 5_000_000_000) {
    ogoh(
      'talabQilinganMablag',
      'Talab qilingan mablag‘ 5 mlrd so‘mdan ko‘p — raqamni tekshiring'
    );
  }

  // ── IX bo'lim: yer va tomorqa ────────────────────────────

  if (d.tomorqaBor && n(d.tomorqaMaydoni) <= 0) {
    xato('tomorqaMaydoni', 'Tomorqa bor deb belgilangan — maydonini kiriting');
  }
  if (!d.tomorqaBor && n(d.tomorqaMaydoni) > 0) {
    xato('tomorqaMaydoni', 'Tomorqa maydoni kiritilgan, lekin "tomorqa yo‘q" deb belgilangan');
  }
  if (d.issiqxonaTalabi && n(d.issiqxonaMaydoni) <= 0) {
    ogoh('issiqxonaMaydoni', 'Issiqxona talabi bor — rejalashtirilgan maydonni kiriting');
  }
  if (d.ijaraYer && n(d.ijaraYerMaydoni) <= 0) {
    xato('ijaraYerMaydoni', 'Ijara yer bor deb belgilangan — maydonini kiriting');
  }

  // ── V va VII bo'lim: izoh talab qiladigan belgilar ───────

  if (d.nogironlikBor && !d.nogironlikIzoh?.trim()) {
    xato('nogironlikIzoh', 'Nogironligi bo‘lgan shaxs bor — kim ekanini va guruhini yozing');
  }
  if (d.uzoqDavolanish && !d.uzoqDavolanishIzoh?.trim()) {
    xato('uzoqDavolanishIzoh', 'Uzoq davolanishga muhtoj a’zo bor — kim ekanini va tashxisni yozing');
  }

  // ── III bo'lim: daromad ──────────────────────────────────

  // Nol daromad haqiqat bo'lishi mumkin (yangi ko'chib kelgan, hamma
  // ishsiz), lekin ko'pincha bu "to'ldirishni unutdim" degani.
  if (b(d.oylikDaromad) === 0) {
    ogoh('oylikDaromad', 'Oylik daromad kiritilmagan yoki nol — tekshiring');
  }

  // Ishlaydigan odam bor, lekin daromad nol - qarama-qarshilik.
  if (ishlaydi > 0 && b(d.oylikDaromad) === 0) {
    ogoh(
      'oylikDaromad',
      `Xonadonda ${ishlaydi} kishi ishlaydi, lekin oylik daromad nol ko‘rsatilgan`
    );
  }

  // ── Katta oila ───────────────────────────────────────────

  if (jami > 20) {
    ogoh('jamiAzo', `Xonadonda ${jami} kishi — raqamni tekshiring`);
  }

  return { xatolar, ogohlantirishlar, ok: xatolar.length === 0 };
}

/**
 * Xonadonni yuborishga tayyorligini tekshiradi.
 *
 * Arifmetikadan tashqari: agar xonadonda ishsiz bor deyilgan bo'lsa,
 * ularning har biri uchun shaxsiy anketa to'ldirilgan bo'lishi kerak.
 *
 * Ana shu bog'lanish butun platformani ushlab turadi - ishsizlar
 * soni faqat raqam bo'lib qolsa, bandlik markazi kim bilan
 * ishlashini bilmaydi va xatlov behuda qog'ozbozlikka aylanadi.
 */
export function yuborishgaTayyormi(
  d: XatlovRaqamlari,
  kiritilganIshsizlar: number
): TekshiruvHisoboti {
  const hisobot = xatlovTekshir(d);
  const ishsiz = n(d.ishsizlarSoni);

  if (ishsiz > kiritilganIshsizlar) {
    hisobot.xatolar.push({
      maydon: 'ishsizlar',
      xabar: `Xonadonda ${ishsiz} ta ishsiz ko‘rsatilgan, lekin ${kiritilganIshsizlar} tasining anketasi to‘ldirilgan. Qolgan ${ishsiz - kiritilganIshsizlar} tasini kiriting.`,
    });
  }

  if (kiritilganIshsizlar > ishsiz) {
    hisobot.xatolar.push({
      maydon: 'ishsizlar',
      xabar: `${kiritilganIshsizlar} ta ishsiz anketasi to‘ldirilgan, lekin I bo‘limda ${ishsiz} ta deb ko‘rsatilgan. Raqamni to‘g‘rilang.`,
    });
  }

  hisobot.ok = hisobot.xatolar.length === 0;
  return hisobot;
}

/**
 * Takror xatlovni aniqlash kaliti.
 *
 * Manzil bir xil yozilmaydi: "Navoiy ko'chasi 12-uy", "navoiy kochasi 12 uy",
 * "Navoiy k. 12". Shuning uchun apostrof, defis, bo'shliq va nuqta
 * olib tashlanadi va oila boshlig'ining ismi bilan birga kalit tuziladi.
 */
export function takrorKaliti(manzil: string, oilaBoshligi: string): string {
  const tozala = (s: string) =>
    s
      .toLowerCase()
      .replace(/[‘’ʻʼ`´′']/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '');
  return `${tozala(manzil)}|${tozala(oilaBoshligi)}`;
}
