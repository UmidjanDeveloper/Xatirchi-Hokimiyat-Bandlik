/**
 * ============================================================
 *  ANKETA VARIANTLARI - IKKI ALIFBODA
 *
 *  Anketani mahalla yettiligi a'zosi to'ldiradi va uning
 *  qo'lidagi rasmiy qog'oz KIRILLDA. Shuning uchun forma kirill
 *  ko'rsatadi. Panel esa lotinda ishlaydi.
 *
 *  Bazaga HAR DOIM lotin `qiymat` yoziladi. Agar kirill matn
 *  saqlansa, keyinchalik alifbo o'zgarsa yoki bir xodim lotinda
 *  yozsa, tahlil ikkiga bo'linib ketardi: "Doimiy" va "Доимий"
 *  ikki xil qiymat bo'lib sanalardi.
 * ============================================================
 */

export interface Variant {
  /** Bazaga yoziladigan qiymat (lotin) */
  qiymat: string;
  /** Formada ko'rsatiladigan matn (kirill) */
  kirill: string;
}

/** `[lotin, kirill]` juftliklarini `Variant[]` ga aylantiradi */
function v(...juftlar: [string, string][]): Variant[] {
  return juftlar.map(([qiymat, kirill]) => ({ qiymat, kirill }));
}

export const TUMAN = 'Xatirchi';
export const VILOYAT = 'Navoiy';

// ─────────────────────────────────────────────────────────────
//  UMUMIY
// ─────────────────────────────────────────────────────────────

export const HA_YOQ = v(['Ha', 'Ҳа'], ["Yo'q", 'Йўқ']);

export const JINS = v(['Erkak', 'Эркак'], ['Ayol', 'Аёл']);

export const MALUMOT = v(
  ['Oliy', 'Олий'],
  ['Tugallanmagan oliy', 'Тугалланмаган олий'],
  ["O'rta maxsus", 'Ўрта махсус'],
  ["O'rta", 'Ўрта'],
  ["Boshlang'ich", 'Бошланғич'],
  ["Ma'lumotsiz", 'Маълумотсиз']
);

export const OILAVIY_HOLAT = v(
  ['Uylanmagan', 'Уйланмаган / турмушга чиқмаган'],
  ['Uylangan', 'Уйланган / турмушга чиққан'],
  ['Ajrashgan', 'Ажрашган'],
  ['Beva', 'Бева']
);

export const NOGIRONLIK_GURUHI = v(
  ['I guruh', 'I гуруҳ'],
  ['II guruh', 'II гуруҳ'],
  ['III guruh', 'III гуруҳ']
);

// ─────────────────────────────────────────────────────────────
//  I. MEHNAT VA BANDLIK
// ─────────────────────────────────────────────────────────────

export const ISH_TURI_ISTAGI = v(
  ['Doimiy', 'Доимий'],
  ['Mavsumiy', 'Мавсумий'],
  ['Uy sharoitida', 'Уй шароитида ишлаш']
);

export const ISHGA_TAYYORLIK = v(
  ["To'liq ish vaqti", 'Тўлиқ иш вақти'],
  ['Qisman ish vaqti', 'Қисман иш вақти'],
  ['Uy sharoitida', 'Уй шароитида']
);

export const HAYDOVCHILIK_TOIFASI = v(
  ['A', 'A'],
  ['B', 'B'],
  ['C', 'C'],
  ['D', 'D'],
  ['E', 'E']
);

/** Anketa 1, 5-bo'lim: bandlikni ta'minlash yo'llari */
export const BANDLIK_TAKLIFI = v(
  ['Doimiy ishga joylashtirish', 'Доимий ишга жойлаштириш'],
  ["O'zini o'zi band qilish", 'Ўзини ўзи банд қилиш'],
  ['YaTT ochish', 'ЯТТ очиш'],
  ['Xorijga mehnat migratsiyasi', 'Хорижга меҳнат миграциясига юбориш'],
  ['Yuridik shaxs ochish', 'Юридик мақомдаги корхона очиш'],
  ['Kasb-hunarga o‘qitish', 'Касб-ҳунарга ўқитиш'],
  ['Boshqa', 'Бошқа']
);

// ─────────────────────────────────────────────────────────────
//  KASB-HUNAR VA O'QISH
// ─────────────────────────────────────────────────────────────

export const KASB_YONALISHI = v(
  ['Sanoat', 'Саноат соҳаси'],
  ['Xizmat ko‘rsatish', 'Хизмат кўрсатиш соҳаси'],
  ['Qishloq xo‘jaligi', 'Қишлоқ хўжалиги соҳаси'],
  ['Qurilish', 'Қурилиш соҳаси'],
  ['Savdo', 'Савдо'],
  ['Transport', 'Транспорт'],
  ['Axborot texnologiyalari', 'Ахборот технологиялари'],
  ["Ta'lim", 'Таълим'],
  ['Tibbiyot', 'Тиббиёт']
);

/**
 * Aniq kasblar - kurs talabini o'lchash uchun.
 *
 * Yo'nalish ("Qurilish") kurs ochish uchun yetarli emas: payvandchi
 * kursi bilan suvoqchi kursi boshqa ustaxona, boshqa uskuna talab
 * qiladi. Shuning uchun aniq kasb so'raladi.
 */
export const KASBLAR = [
  'Payvandchi',
  'Elektrchi',
  'Suvoqchi',
  "G'isht teruvchi",
  'Duradgor',
  'Santexnik',
  'Avtomobil ustasi',
  'Traktorchi',
  'Haydovchi',
  'Tikuvchi',
  'Sartarosh',
  'Kosmetolog',
  'Oshpaz',
  'Qandolatchi',
  'Novvoy',
  'Bog‘bon',
  'Chorvador',
  'Parrandachi',
  'Asalarichi',
  'Issiqxonachi',
  'Hunarmand',
  'Kompyuter operatori',
  'Dasturchi',
  'Grafik dizayner',
  'SMM mutaxassisi',
  'Buxgalter',
  'Sotuvchi',
  'Ombor mudiri',
  'Tikuvchilik ustasi',
  'Kafel yotqizuvchi',
];

export const TILLAR = v(
  ['Ingliz', 'Инглиз тили'],
  ['Rus', 'Рус тили'],
  ['Koreys', 'Корейс тили'],
  ['Nemis', 'Немис тили'],
  ['Xitoy', 'Хитой тили'],
  ['Arab', 'Араб тили'],
  ['Turk', 'Турк тили']
);

// ─────────────────────────────────────────────────────────────
//  II. TADBIRKORLIK VA KREDIT-SUBSIDIYA
// ─────────────────────────────────────────────────────────────

export const MABLAG_YONALISHI = v(
  ['Chorvachilik', 'Чорвачилик'],
  ['Dehqonchilik', 'Деҳқончилик'],
  ['Issiqxona', 'Иссиқхона'],
  ['Parrandachilik', 'Паррандачилик'],
  ['Asalarichilik', 'Асаларичилик'],
  ['Savdo', 'Савдо'],
  ['Xizmat ko‘rsatish', 'Хизмат кўрсатиш'],
  ['Kichik ishlab chiqarish', 'Кичик ишлаб чиқариш'],
  ['Hunarmandchilik', 'Ҳунармандчилик'],
  ['Onlayn biznes', 'Онлайн бизнес'],
  ['Transport', 'Транспорт'],
  ['Boshqa', 'Бошқа']
);

export const MOLIYA_TURI = v(
  ['Imtiyozli kredit', 'Имтиёзли кредит'],
  ['Subsidiya', 'Субсидия'],
  ['Ssuda', 'Ссуда'],
  ['Grant', 'Грант'],
  ['Asbob-uskuna', 'Асбоб-ускуна'],
  ['Yer maydoni', 'Ер майдони'],
  ['Bo‘sh bino-inshoot', 'Бўш бино-иншоот']
);

// ─────────────────────────────────────────────────────────────
//  III. DAROMAD
// ─────────────────────────────────────────────────────────────

export const DAROMAD_MANBAI = v(
  ['Rasmiy ish haqi', 'Расмий иш ҳақи'],
  ['Mavsumiy ish', 'Мавсумий иш'],
  ['Mardikorlik', 'Кунлик ишга чиқади (мардикор)'],
  ['Tomorqa', 'Томорқа / деҳқончилик'],
  ['Chorvachilik', 'Чорвачилик / паррандачилик'],
  ['Tadbirkorlik', 'Тадбиркорлик фаолиятидан'],
  ['Mehnat migratsiyasi', 'Меҳнат миграциясидан (хориждан)'],
  ['Nafaqa', 'Нафақа / ижтимоий тўлов'],
  ['Norasmiy daromad', 'Норасмий даромад']
);

export const KAMBAGALLIK_SABABI = v(
  ['Ish o‘rni yo‘qligi', 'Иш ўрни йўқлиги'],
  ['Kasb-hunar yo‘qligi', 'Касб-ҳунар йўқлиги'],
  ['Boquvchisini yo‘qotgan', 'Боқувчисини йўқотган'],
  ['Sog‘liq muammosi', 'Соғлиқ муаммоси / узоқ даволаниш'],
  ['Nogironlik', 'Оилада ногиронлиги бўлган шахс'],
  ['Ko‘p bolalilik', 'Кўп болалилик'],
  ['Yolg‘iz ota-onalik', 'Ёлғиз ота-оналик'],
  ['Yer-mulk yo‘qligi', 'Ер ёки мол-мулк йўқлиги'],
  ['Qarzdorlik', 'Қарздорлик'],
  ['Boshqa', 'Бошқа']
);

// ─────────────────────────────────────────────────────────────
//  VI. UY-JOY VA KOMMUNAL
// ─────────────────────────────────────────────────────────────

export const UY_HOLATI = v(
  ['Yaxshi', 'Яхши'],
  ["O'rtacha", 'Ўртача'],
  ['Ta’mirtalab', 'Таъмирталаб'],
  ['Yaroqsiz', 'Яроқсиз']
);

export const ICHIMLIK_SUVI = v(
  ['Markazlashgan', 'Марказлашган'],
  ['Quduq', 'Қудуқ'],
  ["Yo'q", 'Йўқ']
);

// ─────────────────────────────────────────────────────────────
//  XI. CHORA-TADBIRLAR
// ─────────────────────────────────────────────────────────────

/**
 * Mas'ul tashkilotlar.
 *
 * Ro'yxat yopiq: "boshqa tashkilot" deb erkin yozilsa, kechikkan
 * topshiriqlarni tashkilot kesimida sanab bo'lmaydi va hisobdorlik
 * yo'qoladi - panelning eng kuchli qismi aynan shu.
 */
export const MASUL_TASHKILOT = v(
  ['Bandlik markazi', 'Бандликка кўмаклашиш маркази'],
  ['Mahalla raisi', 'Маҳалла раиси'],
  ['Tuman hokimligi', 'Туман ҳокимлиги'],
  ['Kasb-hunar markazi', 'Касб-ҳунарга ўқитиш маркази'],
  ['Ijtimoiy himoya', 'Ижтимоий ҳимоя бўлими'],
  ['Qishloq xo‘jaligi bo‘limi', 'Қишлоқ хўжалиги бўлими'],
  ['Bank', 'Банк'],
  ['Soliq bo‘limi', 'Солиқ бўлими'],
  ['Xalq ta’limi', 'Халқ таълими бўлими'],
  ['Sog‘liqni saqlash', 'Соғлиқни сақлаш бўлими'],
  ['Yoshlar ishlari agentligi', 'Ёшлар ишлари агентлиги'],
  ['Xotin-qizlar qo‘mitasi', 'Хотин-қизлар қўмитаси']
);

// ─────────────────────────────────────────────────────────────
//  YORDAMCHILAR
// ─────────────────────────────────────────────────────────────

/** Lotin qiymatga mos kirill matnni topadi */
export function kirillcha(variantlar: Variant[], qiymat?: string | null): string {
  if (!qiymat) return '—';
  return variantlar.find((x) => x.qiymat === qiymat)?.kirill ?? qiymat;
}

/** Faqat lotin qiymatlar ro'yxati - Zod tekshiruvi uchun */
export function qiymatlar(variantlar: Variant[]): [string, ...string[]] {
  return variantlar.map((x) => x.qiymat) as [string, ...string[]];
}

// ─────────────────────────────────────────────────────────────
//  ANKETA QAYTA QURILGANDAN KEYINGI VARIANTLAR
// ─────────────────────────────────────────────────────────────

/**
 * Gaz ta'minoti turi.
 *
 * Farqi muhim: markazlashgan quvur bor joyda muammo bosim yoki
 * qarzdorlik bo'ladi, balon bilan yashaydigan oilada esa har oy
 * pul topish. Chora-tadbir ham shunga qarab boshqacha.
 */
export const GAZ_TURI = v(
  ['Tabiiy gaz', 'Табиий газ'],
  ['Propan (ballon)', 'Пропан (баллон)']
);

/**
 * Oiladagi o'rni - nogironligi bor yoki parvarishga muhtoj
 * shaxsni belgilashda.
 *
 * "Boshqa" oxirida turadi va tanlanganda matn maydoni ochiladi:
 * qaynona, nabira, jiyan kabi holatlar ro'yxatga sig'maydi.
 */
export const OILADAGI_ORNI = v(
  ['Ota', 'Ота'],
  ['Ona', 'Она'],
  ['Farzand', 'Фарзанд'],
  ['Turmush o‘rtog‘i', 'Турмуш ўртоғи'],
  ['Aka', 'Ака'],
  ['Uka', 'Ука'],
  ['Opa', 'Опа'],
  ['Singil', 'Сингил'],
  ['Bobo / buvi', 'Бобо / буви'],
  ['Nabira', 'Набира'],
  ['Boshqa', 'Бошқа']
);

/** Chorva turlari - bir nechtasini belgilash mumkin */
export const CHORVA_TURI = v(
  ['Yirik shoxli', 'Йирик шохли'],
  ['Mayda shoxli', 'Майда шохли'],
  ['Parranda', 'Парранда']
);

/**
 * Hunarmandchilik yo'nalishlari.
 *
 * Ilgari bu erkin matn edi va xodim har xil yozardi: "tikuvchilik",
 * "tikish", "kiyim tikadi" - keyin ularni guruhlab bo'lmasdi.
 * Endi bir bosish yetadi; ro'yxatda yo'q hunar uchun "Boshqa"
 * tanlanadi va faqat o'shanda matn maydoni ochiladi.
 *
 * Ro'yxat tuman sharoitidagi eng keng tarqalgan yo'nalishlardan
 * tuzilgan.
 */
export const HUNAR_TURI = v(
  ['Tikuvchilik', 'Тикувчилик'],
  ['Kashtachilik', 'Каштачилик'],
  ['Duradgorlik', 'Дурадгорлик'],
  ['Temirchilik / payvandlash', 'Темирчилик / пайвандлаш'],
  ['Qurilish-ta’mirlash', 'Қурилиш-таъмирлаш'],
  ['Non va qandolat', 'Нон ва қандолат'],
  ['Sartaroshlik / go‘zallik', 'Сартарошлик / гўзаллик'],
  ['Poyabzal ta’miri', 'Пойабзал таъмири'],
  ['Gilam va to‘qimachilik', 'Гилам ва тўқимачилик'],
  ['Sut mahsulotlari', 'Сут маҳсулотлари'],
  ['Asalarichilik', 'Асаларичилик'],
  ['Kulolchilik', 'Кулолчилик'],
  ['Boshqa', 'Бошқа']
);
