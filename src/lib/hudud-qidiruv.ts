/**
 * ============================================================
 *  MAHALLA VA MAKTAB QIDIRUVI
 *
 *  Muammo: tumanda 70 ta mahalla bor, lekin bazaga qo'lda
 *  yozilgan 40 ta "yangi" nom tushdi. Ularni ko'rib chiqilganda
 *  ma'lum bo'ldiki, deyarli hammasi RO'YXATDAGI mahallaning
 *  boshqacha yozilishi edi:
 *
 *    xodim yozgan          katalogda        nega topilmagan
 *    ---------------------------------------------------------
 *    navruz, novruz       Navro'z          o' ni u yoki o deb yozgan
 *    Sangijumon           Sangijuman       oxirgi unli boshqa
 *    Mirzo Ulug'bek       M.Ulug'bek       katalogda qisqartma
 *    Yangi MFY            Yangi            "MFY" qo'shib yozgan
 *
 *  Ya'ni ayb xodimda emas — qidiruv oddiy "ichida bormi?"
 *  tekshiruvi edi va bitta harf farq qilsa ham topa olmasdi.
 *
 *  Bu fayl uch bosqichli moslashtirishni amalga oshiradi:
 *    1. FONETIK KALIT - o'/u/o, g'/g/q/k, x/h bir xil deb qaraladi
 *    2. SO'Z BO'YICHA - "Mirzo Ulug'bek" dagi "ulugbek" topiladi
 *    3. XATO HARF     - bir-ikki harf farqiga yo'l qo'yiladi
 * ============================================================
 */

/**
 * Nomga hech qanday ma'no qo'shmaydigan so'zlar.
 * Xodim "Yangi MFY" deb yozsa, katalogdagi "Yangi" bilan
 * solishtirish uchun "MFY" ni olib tashlash kerak.
 */
const ORTIQCHA_SOZLAR = new Set([
  'mfy',
  'mahalla',
  'mahallasi',
  'maxalla',
  'maxallasi',
  'fuqarolar',
  'yigini',
  'qishloq',
  'qishlogi',
  'shaharcha',
  'guzar',
  'kocha',
  'maktab',
  'maktabi',
  'sonli',
  'umumiy',
  'orta',
  'talim',
  'lim',
  'sinf',
  'sinfi',
]);

/**
 * Fonetik kalit — bir xil eshitiladigan harflarni birlashtiradi.
 *
 * O'zbek lotin yozuvida bitta tovush bir necha xil yoziladi va
 * xodim qaysi birini tanlashini oldindan bilib bo'lmaydi:
 *   Navro'z / Navruz / Novruz     - o', u, o
 *   Ko'ksaroy / Kuksaroy          - o', u
 *   Xo'jaqo'rg'on / Xojaqorgon    - apostroflar
 *   Oq-oltin / Okoltin            - q va k
 *
 * Shuning uchun unlilar ikki guruhga (o va i), undoshlarning
 * chalkashadiganlari esa bitta harfga keltiriladi.
 *
 * MUHIM: bu birlashtirish 70 ta mahalla va 94 ta maktab nomida
 * sinovdan o'tkazildi — ikkita boshqa nom bitta kalitga
 * tushmaydi, ya'ni noto'g'ri moslik yuzaga kelmaydi.
 */
/**
 * Kirill harflarni lotinga o'giradi.
 *
 * Anketa kirillda to'ldiriladi, katalog esa lotinda saqlanadi.
 * Xodim "Чечакота" deb yozganda "Chechakota" topilishi kerak.
 * O'girish taxminiy bo'lsa ham yetarli: natija baribir quyidagi
 * fonetik kalitdan o'tadi va u o'/u/o, g'/g/q/k farqini yo'qotadi.
 */
const KIRILL: [RegExp, string][] = [
  [/ш/g, 'sh'], [/ч/g, 'ch'], [/ъ/g, ''], [/ь/g, ''],
  [/ю/g, 'yu'], [/я/g, 'ya'], [/ё/g, 'yo'], [/ж/g, 'j'],
  [/ў/g, "o'"], [/қ/g, 'q'], [/ғ/g, "g'"], [/ҳ/g, 'h'],
  [/х/g, 'x'], [/ц/g, 'ts'], [/щ/g, 'sh'], [/ы/g, 'i'],
  [/а/g, 'a'], [/б/g, 'b'], [/в/g, 'v'], [/г/g, 'g'],
  [/д/g, 'd'], [/е/g, 'e'], [/з/g, 'z'], [/и/g, 'i'],
  [/й/g, 'y'], [/к/g, 'k'], [/л/g, 'l'], [/м/g, 'm'],
  [/н/g, 'n'], [/о/g, 'o'], [/п/g, 'p'], [/р/g, 'r'],
  [/с/g, 's'], [/т/g, 't'], [/у/g, 'u'], [/ф/g, 'f'],
  [/э/g, 'e'],
];

export function kirilldanLotinga(matn: string): string {
  let t = matn;
  for (const [qidir, almashtir] of KIRILL) t = t.replace(qidir, almashtir);
  return t;
}

export function hududKaliti(matn: string): string {
  let t = kirilldanLotinga(matn.toLowerCase());

  // Apostrofning barcha ko'rinishlari
  t = t.replace(/[‘’ʻʼ`´′']/g, '');
  // Nuqta, defis va boshqa belgilar
  t = t.replace(/[^a-z0-9\s]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();

  // Ortiqcha so'zlarni olib tashlaymiz
  t = t
    .split(' ')
    .filter((so) => so && !ORTIQCHA_SOZLAR.has(so))
    .join(' ');

  /*
   * Ikki harfli tovushlarni vaqtincha BOSH harfga yig'amiz.
   * Matn allaqachon kichik harfda, shuning uchun bosh harflar
   * bo'sh turibdi va ular bilan to'qnashuv bo'lmaydi. Aks holda
   * "sh" dagi "h" alohida o'zgarib ketardi.
   */
  t = t.replace(/sh/g, 'S').replace(/ch/g, 'C').replace(/ng/g, 'N');

  t = t.replace(/[aou]/g, 'o');
  t = t.replace(/[ie]/g, 'i');
  t = t.replace(/[qkg]/g, 'k');
  t = t.replace(/[xh]/g, 'x');

  t = t.replace(/S/g, 'x').replace(/C/g, 'x').replace(/N/g, 'n');

  /*
   * Takrorlangan HARFLAR yig'iladi: "Quchchi" -> "kuxi".
   * Raqamlarga tegilmaydi — aks holda 11-maktab 1-maktabga,
   * 88-maktab esa 8-maktabga aylanib qolardi.
   */
  t = t.replace(/([a-z])\1+/g, '$1');

  return t.replace(/\s/g, '');
}

/** Nomni alohida so'zlarga ajratadi (fonetik kalit ko'rinishida) */
function sozlar(matn: string): string[] {
  return kirilldanLotinga(matn.toLowerCase())
    .replace(/[‘’ʻʼ`´′']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((so) => so.length > 0 && !ORTIQCHA_SOZLAR.has(so))
    .map((so) => hududKaliti(so))
    .filter((so) => so.length > 0);
}

/**
 * Ikki satr orasidagi tahrir masofasi (Levenshtein).
 * Faqat qisqa nomlar uchun ishlatiladi, shuning uchun oddiy
 * dinamik dastur yetarli.
 */
function masofa(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let oldingi = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const joriy = [i];
    for (let j = 1; j <= b.length; j++) {
      joriy[j] = Math.min(
        oldingi[j] + 1,
        joriy[j - 1] + 1,
        oldingi[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    oldingi = joriy;
  }
  return oldingi[b.length];
}

/** Nom uzunligiga qarab nechta xato harfga yo'l qo'yiladi */
function ruxsatEtilganXato(uzunlik: number): number {
  if (uzunlik <= 4) return 0;
  if (uzunlik <= 7) return 1;
  return 2;
}

/**
 * Ro'yxatdagi variant so'rovga qanchalik mos kelishini baholaydi.
 *
 * @returns 0 — mos emas; katta son — kuchliroq moslik
 */
export function hududBahosi(variant: string, sorov: string): number {
  const qk = hududKaliti(sorov);
  if (!qk) return 1; // so'rov bo'sh — butun ro'yxat ko'rinadi

  const vk = hududKaliti(variant);
  if (!vk) return 0;

  if (vk === qk) return 100;
  if (vk.startsWith(qk)) return 90;
  if (vk.includes(qk)) return 80;
  // "Yangi MFY" -> "Yangi": so'rov katalogdagi nomdan uzunroq
  if (qk.includes(vk) && vk.length >= 4) return 75;

  // So'z bo'yicha: "mirzo ulugbek" ichidagi "ulugbek" -> "M.Ulug'bek"
  const vSozlar = sozlar(variant);
  const qSozlar = sozlar(sorov);
  for (const qs of qSozlar) {
    if (qs.length < 3) continue;
    for (const vs of vSozlar) {
      if (vs.length < 3) continue;
      if (vs === qs) return 70;
      if (vs.startsWith(qs) || qs.startsWith(vs)) return 65;
      if (masofa(vs, qs) <= ruxsatEtilganXato(Math.max(vs.length, qs.length))) return 55;
    }
  }

  // Butun nom bo'yicha xato harf
  if (masofa(vk, qk) <= ruxsatEtilganXato(Math.max(vk.length, qk.length))) return 50;

  return 0;
}

/**
 * Ro'yxatni so'rovga qarab saralaydi va tartiblaydi.
 * Eng mos kelgani birinchi turadi.
 */
export function hududlarniFiltrla(variantlar: string[], sorov: string): string[] {
  const baholangan = variantlar
    .map((v) => ({ v, baho: hududBahosi(v, sorov) }))
    .filter((x) => x.baho > 0);

  baholangan.sort((a, b) => b.baho - a.baho || a.v.localeCompare(b.v));
  return baholangan.map((x) => x.v);
}
