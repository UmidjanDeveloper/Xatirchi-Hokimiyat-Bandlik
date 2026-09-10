/**
 * ============================================================
 *  ISM VA TELEFON TEKSHIRUVI
 *
 *  Kelajak Egasi loyihasida sinovdan o'tgan va shu yerga
 *  ko'chirilgan modul. U yerda bolalar maydonlarni
 *  "ajfjdjfjadfj" deb to'ldirar edi; bu yerda xavf boshqacha,
 *  lekin oqibati bir xil: kun oxirida 30 ta xonadonni
 *  ulgurishi kerak bo'lgan xodim maydonni shoshib "ааа" deb
 *  yopib qo'yishi mumkin.
 *
 *  Bunday yozuv bo'yicha na fuqaroni topib bo'ladi, na uni
 *  ishga joylashtirib bo'ladi - ya'ni butun xatlov behuda
 *  ketadi. Shu sababli tekshiruv qattiq.
 *
 *  Tamoyil: tekshiruv HAQIQIY ismni rad etmasligi kerak.
 *  Shuning uchun har bir qoida o'zbek (va rus) ismlarining
 *  haqiqiy tuzilishiga qarab tanlangan va ro'yxat bo'yicha
 *  sinovdan o'tkazilgan.
 * ============================================================
 */

/* ------------------------------------------------------------------ */
/* ISM                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Unlilar - lotin va kirill.
 *
 * Anketa kirillda to'ldiriladi, shuning uchun "Хайруллаев" kabi
 * ism unli ulushi bo'yicha yiqilmasligi kerak. Faqat lotin
 * unlilarini sanasak, kirill ismlarda unli 0% chiqib, hamma
 * haqiqiy ism rad etilardi.
 */
const UNLILAR = new Set([
  'a', 'e', 'i', 'o', 'u',
  'а', 'е', 'ё', 'и', 'о', 'у', 'ў', 'э', 'ю', 'я', 'ы',
]);

/**
 * Apostrofning barcha ko'rinishlari.
 *
 * O'zbek tilida "O‘ktam", "G‘ayrat" kabi ismlar apostrof bilan yoziladi,
 * lekin u klaviaturaga qarab turlicha chiqadi: ' ’ ‘ ʻ ʼ ` .
 * Faqat bittasini qabul qilsak, haqiqiy ismlar rad etiladi.
 */
const APOSTROFLAR = "'\u2018\u2019\u02BB\u02BC\u0060";

/** Ismda ruxsat etilgan belgilar: harflar, apostrof, defis, bo'shliq */
const ISM_BELGILARI = new RegExp(`^[A-Za-z\u00C0-\u00FFА-Яа-яЁёЎўҚқҒғҲҳ${APOSTROFLAR}\\-\\s]+$`);

/** Tekshiruv natijasi — xato bo'lsa sababi bilan */
export interface TekshiruvNatijasi {
  ok: boolean;
  xabar?: string;
}

/**
 * Ismning haqiqiyligini tekshiradi.
 *
 * To'rtta qoida, har biri sinovda uchragan aniq bir xatoni to'xtatadi:
 *
 *   1. Faqat harf — raqam va belgi ("Ali123", "@@@") o'tmaydi
 *   2. Ketma-ket 4 ta undosh yo'q — "ajfjdjfjadfj", "asdfgh", "zxcvbn"
 *      shu qoidada tushadi. Haqiqiy ismlarda eng uzun undosh ketmasi
 *      3 ta ("Xurshid" -> rsh, "Dilshod" -> lsh)
 *   3. Unlilar ulushi kamida 20% — "qwerty" (16%) o'tmaydi,
 *      "Shvetsov" (25%) o'tadi
 *   4. Bir harf 3 marta ketma-ket takrorlanmaydi — "aaa", "ffff"
 */
export function ismTekshir(qiymat: string, maydon = 'Ism'): TekshiruvNatijasi {
  const ism = qiymat.trim();

  if (ism.length < 2) {
    return { ok: false, xabar: `${maydon} камида 2 та ҳарфдан иборат бўлиши керак` };
  }
  if (ism.length > 50) {
    return { ok: false, xabar: `${maydon} 50 та белгидан ошмаслиги керак` };
  }
  if (!ISM_BELGILARI.test(ism)) {
    return { ok: false, xabar: `${maydon}да фақат ҳарфлар бўлиши керак` };
  }

  // Apostrof va defisni olib tashlaymiz — ular tovush emas
  const harflar = ism
    .toLowerCase()
    .replace(new RegExp(`[${APOSTROFLAR}\\-\\s]`, 'g'), '');

  if (harflar.length < 2) {
    return { ok: false, xabar: `${maydon}ni to'liq yozing` };
  }

  let undoshKetma = 0;
  let unliSoni = 0;
  let takror = 1;

  for (let i = 0; i < harflar.length; i++) {
    const harf = harflar[i];

    if (UNLILAR.has(harf)) {
      unliSoni += 1;
      undoshKetma = 0;
    } else {
      undoshKetma += 1;
      if (undoshKetma >= 4) {
        return { ok: false, xabar: `${maydon}ни тўғри ёзинг — тасодифий ҳарфлар қабул қилинмайди` };
      }
    }

    if (i > 0 && harf === harflar[i - 1]) {
      takror += 1;
      if (takror >= 3) {
        return { ok: false, xabar: `${maydon}ни тўғри ёзинг — тасодифий ҳарфлар қабул қилинмайди` };
      }
    } else {
      takror = 1;
    }
  }

  if (unliSoni === 0 || unliSoni / harflar.length < 0.2) {
    return { ok: false, xabar: `${maydon}ни тўғри ёзинг — тасодифий ҳарфлар қабул қилинмайди` };
  }

  return { ok: true };
}

/**
 * Bir tovushni bildiruvchi ikki harfli birikmalar.
 *
 * "Tinchlik" so'zida n-c-h-l ketma-ket to'rtta undosh kabi
 * ko'rinadi, lekin "ch" bitta tovush — aslida uchta. Shuni
 * hisobga olmasak, haqiqiy nomlar rad etilib ketadi.
 */
function tovushlarGaKeltir(harflar: string): string {
  return harflar.replace(/sh/g, 'S').replace(/ch/g, 'C').replace(/ng/g, 'N');
}

/**
 * Matn bitta qisqa bo'lakning takrori emasmi?
 * "asdasd" = "asd" + "asd" — bunday nom bo'lmaydi.
 */
function takroriyBolak(matn: string): boolean {
  for (let n = 2; n <= 4; n++) {
    if (matn.length < n * 2 || matn.length % n !== 0) continue;
    const bolak = matn.slice(0, n);
    if (bolak.repeat(matn.length / n) === matn) return true;
  }
  return false;
}

/**
 * Matn ichida qisqa bo'lak takrorlanib ketganmi?
 *
 * `takroriyBolak` faqat matn BUTUNLAY bo'lak takroridan iborat
 * bo'lsa ishlaydi. Amalda esa "sadasdasdasd" kabi yozuvlar keladi:
 * u "sa" + "das" x 3 + "d" — boshi va oxiri mos kelmagani uchun
 * eski tekshiruvdan o'tib ketardi. Unlilar ulushi ham normal (33%),
 * undoshlar ham ketma-ket emas — ya'ni harflar tartibiga qaraydigan
 * boshqa hech bir qoida uni ushlay olmaydi.
 *
 * Uni fosh qiladigan yagona belgi — DAVRIYLIK. Matnning istalgan
 * joyidan boshlab davri 2..4 bo'lgan eng uzun bo'lakni o'lchaymiz;
 * u matnning ko'p qismini egallasa, bu barmoq bilan bir xil
 * harakatni takrorlab yozilgan matn, nom emas.
 */
function davriyMatn(matn: string): boolean {
  const n = matn.length;
  if (n < 8) return false;

  for (let davr = 2; davr <= 4; davr++) {
    let joriy = davr;
    let engUzun = 0;

    for (let i = davr; i < n; i++) {
      if (matn[i] === matn[i - davr]) {
        joriy += 1;
        if (joriy > engUzun) engUzun = joriy;
      } else {
        joriy = davr;
      }
    }

    if (engUzun >= 8 && engUzun / n >= 0.6) return true;
  }

  return false;
}

/**
 * Ta'lim muassasasini bildiruvchi so'zlar.
 *
 * Katalogdagi 94 ta maktabning 93 tasida raqam bor, bittasida
 * ("...Xatirchi tuman ixtisoslashtirilgan maktabi") raqam yo'q,
 * lekin "maktab" so'zi bor. Ya'ni haqiqiy maktab nomi doim yo
 * raqam, yo shu so'zlardan birini o'z ichiga oladi.
 */
const MAKTAB_SOZLARI = [
  'maktab',
  'litsey',
  'lisey',
  'kollej',
  'texnikum',
  'internat',
  'gimnaziya',
  'idum',
  'muassasa',
  'talim',
  'universitet',
  'akademiya',
  'shkola',
];




/* ------------------------------------------------------------------ */
/* TELEFON                                                             */
/* ------------------------------------------------------------------ */

/**
 * O'zbekistonda amalda ishlatiladigan kodlar.
 *
 * Mobil operatorlar (90, 91, 93, 94, 88, 95, 97, 98, 99, 33, 77, 20, 50, 55)
 * va viloyat shahar kodlari qo'shilgan — qishloqda ota-onaning uy
 * telefoni ham uchraydi.
 *
 * Ro'yxat ataylab yopiq: aynan shu sababli "111111111" yoki
 * "123456789" kabi tasodifiy raqamlar birinchi ikkita raqamidayoq
 * rad etiladi.
 */
const KODLAR = new Set([
  '20', '33', '50', '55', '61', '62', '65', '66', '67', '69',
  '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
  '88', '90', '91', '93', '94', '95', '97', '98', '99',
]);

/** Raqamdan faqat sonlarni ajratib oladi */
export function faqatRaqam(qiymat: string): string {
  return qiymat.replace(/\D/g, '');
}

/**
 * Kiritilayotgan raqamni +998 dan keyingi 9 ta songa keltiradi.
 * Foydalanuvchi 998 bilan yoki 0 bilan boshlasa ham to'g'ri tushunadi.
 */
export function milliyRaqam(qiymat: string): string {
  let d = faqatRaqam(qiymat);
  if (d.startsWith('998')) d = d.slice(3);
  // Ba'zilar ichki formatda "0 90 ..." deb yozadi
  if (d.length > 9 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 9);
}


/**
 * Telefon raqamini tekshiradi.
 *
 * Uchta qoida sinovda uchragan aniq xatolarni to'xtatadi:
 *   1. Aniq 9 ta raqam — kam yoki ko'p bo'lsa o'tmaydi
 *   2. Kod haqiqiy bo'lishi kerak — "111111111", "123456789" shu yerda tushadi
 *   3. Bir xil raqam takrori va ketma-ket o'sish/kamayish rad etiladi —
 *      "901111111", "901234567" kabi "bosib tashlangan" raqamlar
 */
export function telefonTekshir(qiymat: string, maydon = 'Telefon raqami'): TekshiruvNatijasi {
  const d = milliyRaqam(qiymat);

  if (d.length === 0) {
    return { ok: false, xabar: `${maydon}ни киритинг` };
  }
  if (d.length !== 9) {
    return { ok: false, xabar: `${maydon} 9 та рақамдан иборат бўлиши керак` };
  }
  if (!KODLAR.has(d.slice(0, 2))) {
    return { ok: false, xabar: `Бундай оператор коди йўқ. Масалан: 90, 91, 93, 94, 97, 99` };
  }

  const qolgan = d.slice(2);

  // Hamma raqam bir xil: 901111111
  if (new Set(qolgan).size === 1) {
    return { ok: false, xabar: `${maydon} тўғри эмас — ҳақиқий рақамни киритинг` };
  }

  // Ketma-ket o'sish yoki kamayish: 901234567, 909876543
  let osish = true;
  let kamayish = true;
  for (let i = 1; i < qolgan.length; i++) {
    const farq = Number(qolgan[i]) - Number(qolgan[i - 1]);
    if (farq !== 1) osish = false;
    if (farq !== -1) kamayish = false;
  }
  if (osish || kamayish) {
    return { ok: false, xabar: `${maydon} тўғри эмас — ҳақиқий рақамни киритинг` };
  }

  return { ok: true };
}

/** Bazaga yoziladigan yagona ko'rinish: +998901234567 */
export function telefonSaqlashUchun(qiymat: string): string | null {
  const d = milliyRaqam(qiymat);
  return d.length === 9 ? `+998${d}` : null;
}
