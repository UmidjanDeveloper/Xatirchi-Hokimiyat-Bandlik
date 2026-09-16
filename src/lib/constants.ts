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

/**
 * Ҳайдовчилик гувоҳномаси тоифалари.
 *
 * Аввал фақат A, B, C, D, E турарди. Амалда эса гувоҳнома
 * БИРЛАШГАН тоифаларда берилади: юк машинасига тиркама улаш
 * ҳуқуқи CE, автобусга DE, енгил машина билан юк машинаси
 * биргаликда BC. Иш берувчи эса айнан шуни сўрайди — «CE бор
 * одам керак» дейди, «C ва E» демайди.
 *
 * Тоифаларни алоҳида белгилаш билан бирлашган тоифа БИР ХИЛ
 * эмас: B1 (мотоцикл-арава) ва B (енгил автомобиль) бошқа-бошқа
 * ҳуқуқ, шунинг учун улар ҳам рўйхатда.
 *
 * Тартиб амалдаги гувоҳнома шаклидагича: аввал алоҳида
 * тоифалар, кейин бирлашганлари.
 */
export const HAYDOVCHILIK_TOIFASI = v(
  ['A', 'A — мотоцикл'],
  ['A1', 'A1 — мопед'],
  ['B', 'B — енгил автомобиль'],
  ['B1', 'B1 — мотоцикл-арава'],
  ['C', 'C — юк автомобили'],
  ['C1', 'C1 — енгил юк автомобили'],
  ['D', 'D — автобус'],
  ['D1', 'D1 — кичик автобус'],
  ['E', 'E — тиркама'],
  ['BC', 'BC — енгил ва юк автомобили'],
  ['CE', 'CE — юк автомобили ва тиркама'],
  ['DE', 'DE — автобус ва тиркама'],
  ['F', 'F — трактор ва қишлоқ хўжалиги техникаси']
);

/** Anketa 1, 5-bo'lim: bandlikni ta'minlash yo'llari */
export const BANDLIK_TAKLIFI = v(
  ['Doimiy ishga joylashtirish', 'Доимий ишга жойлаштириш'],
  ["O'zini o'zi band qilish", 'Ўзини ўзи банд қилиш'],
  ['YaTT ochish', 'ЯТТ очиш'],
  ['Xorijga mehnat migratsiyasi', 'Хорижга меҳнат миграциясига юбориш'],
  ['Yuridik shaxs ochish', 'Юридик мақомдаги корхона очиш'],
  ['Kasb-hunarga o‘qitish', 'Касб-ҳунарга ўқитиш'],
  /*
   * IT-шаҳарчага йўналтириш алоҳида банд бўлиши керак,
   * «касб-ҳунарга ўқитиш» ичига киритилмайди.
   *
   * Сабаби амалий: бу бошқа ЙЎЛ. Касб-ҳунар курси туманда, бир
   * неча ой давом этади ва маҳаллий иш ўрнига олиб боради.
   * IT-шаҳарча эса вилоят/республика даражасидаги дастур, узоқ
   * муддатли ва натижаси — масофадан ишлаш ёки бошқа шаҳарда
   * банд бўлиш. Иккисини битта бандда қўшсак, ҳисоботда
   * «нечта одам IT га йўналтирилди» деган савол жавобсиз
   * қоларди.
   */
  ['IT-shaharchaga yo‘naltirish', 'IT-шаҳарчага йўналтириш'],
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

/**
 * ============================================================
 *  ЎРГАНМОҚЧИ БЎЛГАН КАСБ — ТАНЛОВ РЎЙХАТИ
 *
 *  ── Нега рўйхат, эркин матн эмас ──
 *
 *  Илгари ходим касбни ЎЗИ ёзарди. Натижада базада «дастурчи»,
 *  «Дастурчи», «дастурлаш», «программист», «IT» — бешта ҳар хил
 *  ёзув пайдо бўларди ва улар бир касб эканини фақат одам
 *  тушунарди. Курс очиш қарори эса РАҚАМГА таянади: «нечта одам
 *  пайвандчилик сўради». Ҳар хил ёзилган ёзувларни санаб
 *  бўлмайди.
 *
 *  Иккинчи сабаб: дала ходими эшик олдида турибди, ёзиб ўтириш
 *  вақти йўқ. Танлаш тезроқ ва хатосиз.
 *
 *  ── «Бошқа» нега бор ──
 *
 *  Рўйхат ҳеч қачон тўлиқ бўлмайди. Фуқаро рўйхатда йўқ касбни
 *  айтса, ходим уни ёза олиши керак — акс ҳолда у энг яқин
 *  нотўғри вариантни танлайди ва маълумот бузилади.
 *
 *  ── IT гуруҳи алоҳида ──
 *
 *  Бу касблар IT-шаҳарча ваучери занжирини очади: фуқаро
 *  туманда гуруҳ тўлишини кутмайди, битта одам ҳам юборилади.
 *  Шунинг учун улар рўйхатнинг ТЕПАСИДА туради — ходим уларни
 *  кўриб, эсида тутсин.
 * ============================================================
 */

/** «Бошқа» варианти — эркин матн катагини очади */
export const KASB_BOSHQA = 'Boshqa';

/** IT-шаҳарча ваучери очиладиган касблар */
export const IT_KASBLARI = v(
  ['Dasturchi', 'Дастурчи (веб, мобил)'],
  ['Grafik dizayner', 'График дизайнер'],
  ['SMM mutaxassisi', 'SMM мутахассиси'],
  ['Kompyuter operatori', 'Компьютер оператори'],
  ['Kiberxavfsizlik', 'Кибрхавфсизлик'],
  ["Ma'lumotlar tahlilchisi", 'Маълумотлар таҳлилчиси']
);

/** Қолган касблар — соҳалар бўйича */
export const ODDIY_KASBLAR = v(
  ['Payvandchi', 'Пайвандчи'],
  ['Elektrchi', 'Электрчи'],
  ['Suvoqchi', 'Сувоқчи'],
  ["G'isht teruvchi", 'Ғишт терувчи'],
  ['Duradgor', 'Дурадгор'],
  ['Santexnik', 'Сантехник'],
  ['Kafel yotqizuvchi', 'Кафел ётқизувчи'],
  ['Avtomobil ustasi', 'Автомобил устаси'],
  ['Traktorchi', 'Тракторчи'],
  ['Haydovchi', 'Ҳайдовчи'],
  ['Tikuvchi', 'Тикувчи'],
  ['Sartarosh', 'Сартарош'],
  ['Kosmetolog', 'Косметолог'],
  ['Oshpaz', 'Ошпаз'],
  ['Qandolatchi', 'Қандолатчи'],
  ['Novvoy', 'Новвой'],
  ["Bog'bon", 'Боғбон'],
  ['Chorvador', 'Чорвадор'],
  ['Parrandachi', 'Паррандачи'],
  ['Asalarichi', 'Асаларичи'],
  ['Issiqxonachi', 'Иссиқхоначи'],
  ['Hunarmand', 'Ҳунарманд'],
  ['Buxgalter', 'Бухгалтер'],
  ['Sotuvchi', 'Сотувчи'],
  ['Ombor mudiri', 'Омбор мудири']
);

/**
 * Танлов учун тўлиқ рўйхат: IT — тепада, кейин қолганлари,
 * энг охирида «Бошқа».
 */
export const ORGANMOQCHI_KASBLAR: Variant[] = [
  ...IT_KASBLARI,
  ...ODDIY_KASBLAR,
  { qiymat: KASB_BOSHQA, kirill: 'Бошқа — ўзим ёзаман' },
];

/** Танланган қиймат IT гуруҳиданми */
export function itKasbimi(qiymat: string | null | undefined): boolean {
  if (!qiymat) return false;
  return IT_KASBLARI.some((k) => k.qiymat === qiymat);
}

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

/**
 * Чет элда меҳнат — энг кўп бориладиган давлатлар.
 *
 * Рўйхат каталог бўлиши шарт, эркин матн эмас: «Россия»,
 * «россия», «РФ», «Москва» деб ёзилса, ҳисоботда тўртта
 * бошқа-бошқа давлат бўлиб саналарди ва «қайси йўналишда
 * кўпроқ одам кетяпти» деган саволга жавоб бўлмасди.
 *
 * Тартиб амалдаги оқим бўйича: Россия ва Қозоғистон энг кўп,
 * кейин Жанубий Корея, Туркия ва Кўрфаз давлатлари, сўнг
 * Европа ва узоқ йўналишлар.
 *
 * «Бошқа» банди атайлаб охирида: рўйхатда йўқ давлат учун
 * ходим номини қўлда ёзади ва у алоҳида майдонда сақланади.
 */
export const CHET_EL_DAVLATI = v(
  ['Rossiya', 'Россия'],
  ['Qozogʻiston', 'Қозоғистон'],
  ['Janubiy Koreya', 'Жанубий Корея'],
  ['Turkiya', 'Туркия'],
  ['BAA', 'Бирлашган Араб Амирликлари'],
  ['Saudiya Arabistoni', 'Саудия Арабистони'],
  ['Polsha', 'Польша'],
  ['Germaniya', 'Германия'],
  ['Yaponiya', 'Япония'],
  ['Buyuk Britaniya', 'Буюк Британия'],
  ['AQSH', 'АҚШ'],
  ['Boshqa', 'Бошқа давлат']
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
//  TOMORQADAN FOYDALANISH DARAJASI
// ─────────────────────────────────────────────────────────────

/**
 * Tomorqa QANCHALIK ishlatilayotgani.
 *
 * ── Nega maydon soni yetmaydi ──
 *
 * "10 sotix yer bor" degan raqamdan reja chiqmaydi: o'sha 10
 * sotix to'la ekilgan ham, yillab tashlab qo'yilgan ham bo'lishi
 * mumkin. Ikkoviga MUTLAQO boshqa chora kerak - birinchisiga
 * urug'lik va suv, ikkinchisiga esa avvalo sababini aniqlash.
 *
 * ── Nega to'rt daraja, ko'p emas ──
 *
 * Mahalla xodimi eshik oldida turib baho qo'yadi. O'nta darajali
 * shkalada u har safar o'rtasini tanlab ketardi. To'rttasi esa
 * ko'z bilan ajratiladi va "qoniqarli" bilan "yomon" orasida
 * chegara aniq: birida hosil bor, ikkinchisida yo'q.
 */
export const TOMORQA_FOYDALANISH = v(
  ['Alo', 'Аъло — ер тўлиқ экилган, ҳосил олинади'],
  ['Yaxshi', 'Яхши — катта қисми экилган'],
  ['Qoniqarli', 'Қониқарли — ярмигача экилган'],
  ['Yomon', 'Ёмон — деярли ишлатилмайди, ташландиқ']
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

// ─────────────────────────────────────────────────────────────
//  IT YO'NALISHINI TANISH
// ─────────────────────────────────────────────────────────────

/**
 * "O'rganmoqchi bo'lgan kasb" IT ga tegishlimi.
 *
 * Bu ro'yxat IKKI joyda kerak bo'ladi va ikkovi bir xil javob
 * berishi SHART:
 *   · xatlov formasi - xodimga IT-shaharcha vaucherini taklif
 *     qilish uchun, aynan o'sha odam qarshisida turganda;
 *   · tuman tavsiyalari - "N ta fuqaro IT o'rganmoqchi" degan
 *     xulosa uchun.
 *
 * Ikkovi alohida yozilsa, formada vaucher taklif qilinmagan
 * odam hisobotda IT talabgori bo'lib chiqishi mumkin edi - va
 * bandlik markazi ro'yxatni ko'rib, "bu odamga nega hech kim
 * aytmagan" degan savolga javob topa olmasdi.
 *
 * Kirill va lotin birga: xodim qaysi alifboda yozishi oldindan
 * ma'lum emas.
 */
export const IT_SOZLARI = [
  'it',
  'dastur',
  'дастур',
  'programm',
  'програм',
  'kompyuter',
  'компьютер',
  'komputer',
  'web',
  'веб',
  'dizayn',
  'дизайн',
  'sayt',
  'сайт',
  'axborot texnologiya',
  'ахборот технология',
  'sun’iy intellekt',
  "sun'iy intellekt",
  // Apostrofsiz ham yoziladi - xodim shoshib tursa qo'ymaydi
  'suniy intellekt',
  'сунъий интеллект',
  'суний интеллект',

  /*
   * Quyidagilar `IT_YONALISHI` katalogidagi yo'nalishlar.
   *
   * Ular ham shu yerda turishi SHART: fuqaro "kiberxavfsizlik
   * o'rganmoqchiman" desa, xodim shuni yozadi va tizim uni IT
   * deb tanimasa, vaucher bloki umuman ochilmaydi. Xato
   * ko'rinmaydi - shunchaki savol chiqmaydi, xodim esa nega
   * chiqmaganini bilmaydi.
   *
   * `scripts/it-vaucher-sinov.ts` katalogdagi har bir
   * yo'nalish shu ro'yxat orqali tanilishini tekshiradi.
   */
  'mobil ilova',
  'мобил илова',
  'kiberxavfsizlik',
  'кибархавфсизлик',
  'киберхавфсизлик',
  'kiber',
  'кибер',
  "ma'lumotlar tahlili",
  'ma’lumotlar tahlili',
  'malumotlar tahlili',
  'маълумотлар таҳлили',
  'маълумотлар тахлили',
  'smm',
  'смм',
  'raqamli marketing',
  'рақамли маркетинг',
  '1c',
  '1с',
];

/**
 * Matnda IT yo'nalishi bor-yo'qligini aniqlaydi.
 *
 * "it" - qisqa so'z va boshqa so'zlar ichida uchraydi
 * ("tikuvchilik", "santexnik"). Shuning uchun u faqat ALOHIDA
 * so'z sifatida hisobga olinadi; qolganlari esa qism sifatida
 * ham topiladi ("dasturchi", "dasturlash").
 */
export function itYonalishimi(matn: string | null | undefined): boolean {
  if (!matn) return false;
  const past = matn.toLowerCase();
  const sozlar = past.split(/[^\p{L}\p{N}’']+/u).filter(Boolean);
  if (sozlar.includes('it') || sozlar.includes('ит')) return true;
  return IT_SOZLARI.filter((w) => w !== 'it').some((w) => past.includes(w));
}


// ─────────────────────────────────────────────────────────────
//  IT-SHAHARCHA VAUCHERI
// ─────────────────────────────────────────────────────────────

/**
 * IT-shaharchada o'qitiladigan yo'nalishlar.
 *
 * Nega erkin matn emas: fuqaro "kompyuter o'rganmoqchi" deb
 * aytadi, xodim shuni yozadi va hisobotda o'ttiz xil yozuv
 * paydo bo'ladi ("komputer", "компьютер", "dasturchilik"...).
 * Hokim esa "qaysi yo'nalishga eng ko'p talab bor" degan
 * savolga javob olishi kerak - bu esa faqat ro'yxatdan chiqadi.
 *
 * Fuqaroning o'z so'zi yo'qolmaydi: u `organmoqchiKasb` da
 * qoladi, bu yerda esa shu istak QAYSI guruhga tushishi
 * belgilanadi.
 */
export const IT_YONALISHI = v(
  ['Suniy intellekt', 'Сунъий интеллект'],
  ['Dasturlash', 'Дастурлаш'],
  ['Mobil ilovalar', 'Мобил иловалар'],
  ['Web-dizayn', 'Веб-дизайн'],
  ['Grafik dizayn', 'График дизайн'],
  ['Kiberxavfsizlik', 'Киберхавфсизлик'],
  ["Ma'lumotlar tahlili", 'Маълумотлар таҳлили'],
  ['SMM va raqamli marketing', 'SMM ва рақамли маркетинг'],
  ['1C va buxgalteriya dasturlari', '1C ва бухгалтерия дастурлари'],
  ['Kompyuter savodxonligi', 'Компьютер саводхонлиги'],
  ['Boshqa', 'Бошқа йўналиш']
);

/**
 * Vaucher holatlari - bazadagi `ItVaucherHolati` enum bilan
 * BIR XIL tartibda. Yo'l boshidan oxirigacha:
 * berildi -> o'qimoqda -> tugatdi -> ishga joylashdi.
 *
 * Ikki chiqish yo'li ham bor: tashlab ketdi va bekor qilindi.
 * Ular yashirilmaydi - aksincha, hokim uchun eng muhim raqam
 * shu: vaucher berildi, lekin natija chiqmadi.
 */
export const IT_VAUCHER_HOLATI = v(
  ['BERILDI', 'Ваучер берилди'],
  ['OQIMOQDA', 'Ўқимоқда'],
  ['TUGATDI', 'Курсни тугатди'],
  ['ISHGA_JOYLASHDI', 'Ишга жойлашди'],
  ['TASHLAB_KETDI', 'Ўқишни ташлаб кетди'],
  ['BEKOR_QILINDI', 'Бекор қилинди']
);

/** Holat rangi - nishon va diagramma uchun */
export const IT_VAUCHER_KORINISHI: Record<string, 'kut' | 'ish' | 'ok' | 'xato'> = {
  BERILDI: 'kut',
  OQIMOQDA: 'ish',
  TUGATDI: 'ok',
  ISHGA_JOYLASHDI: 'ok',
  TASHLAB_KETDI: 'xato',
  BEKOR_QILINDI: 'xato',
};

/**
 * Natija chiqqan holatlar - "vaucher bekorga ketmadi" degani.
 * Hisobotda samaradorlik shu ikkovining ulushidan hisoblanadi.
 */
export const IT_VAUCHER_NATIJASI = ['TUGATDI', 'ISHGA_JOYLASHDI'] as const;

// ─────────────────────────────────────────────────────────────
//  CHET EL: VALYUTA VA SHAHARLAR
// ─────────────────────────────────────────────────────────────

/**
 * Pul o'tkazmasi valyutasi.
 *
 * Xodim odatda oila aytgan raqamni yozadi, oila esa qaysi pulda
 * olsa shunda aytadi: Rossiyadan rubl, Koreyadan dollar,
 * Polshadan yevro. Ilgari hamma raqam "so'm" deb yozilardi va
 * hisobotda 500 (dollar) bilan 5 000 000 (so'm) bir ustunga
 * qo'shilib ketardi.
 */
export const VALYUTA = v(
  ['UZS', 'сўм'],
  ['USD', 'АҚШ доллари'],
  ['EUR', 'евро']
);

/**
 * Hisobot uchun kurs — 1 birlik necha so'm.
 *
 * Kurs kodda TURADI va bu ataylab: hisobot har safar bir xil
 * raqam berishi kerak, aks holda o'tgan oygi hujjat bilan
 * bugungi hujjat bir-biriga to'g'ri kelmaydi. Kurs sezilarli
 * o'zgarganda bu yer yangilanadi va o'zgarish tarixda ko'rinadi.
 *
 * Manba: Markaziy bank, 2026-yil sentyabr.
 */
export const VALYUTA_KURSI: Record<string, number> = {
  UZS: 1,
  USD: 12_600,
  EUR: 13_800,
};

/** Kiritilgan summani so'mga keltiradi */
export function somga(summa: number | bigint | null, valyuta: string | null): number {
  if (summa == null) return 0;
  return Math.round(Number(summa) * (VALYUTA_KURSI[valyuta ?? 'UZS'] ?? 1));
}

/**
 * Har davlat bo'yicha eng ko'p boriladigan shaharlar.
 *
 * Shahar NEGA kerak: "Rossiyada 340 kishi" degan raqamdan chora
 * chiqmaydi. "Moskvada 120, Sankt-Peterburgda 45" esa chiqadi —
 * konsullik, mehnat migratsiyasi agentligi va diaspora bilan
 * ishlash aynan shahar darajasida bo'ladi.
 *
 * Ro'yxatda yo'q shahar uchun har davlatda "Boshqa" bor.
 */
export const CHET_EL_SHAHRI: Record<string, Variant[]> = {
  Rossiya: v(
    ['Moskva', 'Москва'], ['Sankt-Peterburg', 'Санкт-Петербург'],
    ['Novosibirsk', 'Новосибирск'], ['Yekaterinburg', 'Екатеринбург'],
    ['Qozon', 'Қозон'], ['Samara', 'Самара'], ['Krasnoyarsk', 'Красноярск'],
    ['Tyumen', 'Тюмен'], ['Surgut', 'Сургут'], ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  'Qozogʻiston': v(
    ['Almati', 'Алмати'], ['Ostona', 'Остона'], ['Shimkent', 'Шимкент'],
    ['Aqtau', 'Ақтау'], ['Atirau', 'Атирау'], ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  'Janubiy Koreya': v(
    ['Seul', 'Сеул'], ['Busan', 'Бусан'], ['Incheon', 'Инчхон'],
    ['Ansan', 'Ансан'], ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  Turkiya: v(
    ['Istanbul', 'Истанбул'], ['Anqara', 'Анқара'], ['Izmir', 'Измир'],
    ['Antaliya', 'Анталия'], ['Bursa', 'Бурса'], ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  BAA: v(
    ['Dubay', 'Дубай'], ['Abu-Dabi', 'Абу-Даби'], ['Sharja', 'Шаржа'],
    ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  'Saudiya Arabistoni': v(
    ['Ar-Riyod', 'Ар-Риёд'], ['Jidda', 'Жидда'], ['Makka', 'Макка'],
    ['Madina', 'Мадина'], ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  Polsha: v(
    ['Varshava', 'Варшава'], ['Krakov', 'Краков'], ['Vrotslav', 'Вроцлав'],
    ['Gdansk', 'Гданьск'], ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  Germaniya: v(
    ['Berlin', 'Берлин'], ['Myunxen', 'Мюнхен'], ['Gamburg', 'Гамбург'],
    ['Frankfurt', 'Франкфурт'], ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  Yaponiya: v(
    ['Tokio', 'Токио'], ['Osaka', 'Осака'], ['Nagoya', 'Нагоя'],
    ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  'Buyuk Britaniya': v(
    ['London', 'Лондон'], ['Manchester', 'Манчестер'],
    ['Birmingem', 'Бирмингем'], ['Boshqa shahar', 'Бошқа шаҳар']
  ),
  AQSH: v(
    ['Nyu-York', 'Нью-Йорк'], ['Chikago', 'Чикаго'], ['Los-Anjeles', 'Лос-Анжелес'],
    ['Filadelfiya', 'Филаделфия'], ['Boshqa shahar', 'Бошқа шаҳар']
  ),
};

/** Tanlangan davlatlarga tegishli shaharlar ro'yxati */
export function shaharlarRoyxati(davlatlar: string[]): Variant[] {
  const out: Variant[] = [];
  const korilgan = new Set<string>();
  for (const d of davlatlar) {
    for (const sh of CHET_EL_SHAHRI[d] ?? []) {
      // Bir nechta davlatda bir xil nom bo'lsa (masalan "Boshqa
      // shahar") ikki marta chiqmasin - qiymat davlat bilan
      // birlashtiriladi.
      const kalit = `${d}|${sh.qiymat}`;
      if (korilgan.has(kalit)) continue;
      korilgan.add(kalit);
      out.push({ qiymat: kalit, kirill: `${sh.kirill}` });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
//  PASSIV DAROMAD
// ─────────────────────────────────────────────────────────────

/**
 * Passiv daromad vositalari - HOKIM bergan ro'yxat.
 *
 * Bu "mulkni ijaraga berish" ro'yxati EMAS. Bu tuman ajratib
 * bera oladigan aniq VOSITALAR: quyosh paneli, 100 ta tovuq,
 * bitta sigir, kichik issiqxona. Ya'ni savol "sizda nima bor"
 * emas, "sizga NIMA BERSAK daromad topa olasiz".
 *
 * Farqi amaliy: birinchisiga javob bergan oila bilan hech kim
 * hech nima qila olmaydi, ikkinchisi esa to'g'ridan-to'g'ri
 * ta'minot ro'yxatiga aylanadi - qaysi mahallada nechta oila
 * aynan nimani so'ragan.
 *
 * Ro'yxatda yo'q vosita uchun "Boshqa" bor va unda fuqaro o'z
 * variantini yozadi: takrorlanaveradigan javob keyingi yil
 * ro'yxatga qo'shiladi.
 *
 * MIQDOR katalogda YO'Q va bu ataylab. Ilgari "100 ta tovuq"
 * deb yozilgan edi - ya'ni miqdorni tuman oldindan belgilab
 * qo'ygan bo'lardi. Amalda esa bitta oilaga 20 ta tovuq yetadi,
 * boshqasida esa katta hovli bor va 300 tasini boqa oladi.
 * Shuning uchun har bir vosita miqdorsiz turadi va sonini
 * FUQARONING o'zi aytadi (`passivDaromadSonlari`).
 *
 * Emoji ATAYLAB yo'q: hisobot PDF shrifti (shrift-yasa.py)
 * faqat kirill, lotin va raqamga qisqartirilgan va emoji unda
 * bo'sh kvadrat bo'lib chiqardi.
 */
export const PASSIV_DAROMAD_TURI = v(
  ['Quyosh paneli', 'Қуёш панели'],
  ['Tovuq', 'Товуқ'],
  ['Sigir', 'Сигир'],
  ['Kichik issiqxona', 'Кичик иссиқхона'],
  ['Koʻchatchilik', 'Кўчатчилик'],
  ['Tikuv mashinasi', 'Тикув машинаси'],
  ['Muzlatkich ijarasi', 'Музлаткич/совуткич ижараси'],
  ['Asbob-uskuna ijarasi', 'Асбоб-ускуналар ижараси'],
  ['Kichik savdo nuqtasi', 'Кичик савдо нуқтаси'],
  ['Qoʻy-echki mini-fermasi', 'Қўй-эчки мини-фермаси'],
  ['Boshqa', 'Бошқа']
);

/**
 * Har bir vosita uchun o'lchov birligi.
 *
 * Miqdor bo'lgani uchun birlik ham kerak: "Товуқ: 100" ni
 * xodim "100 бош" deb o'qishi, "Асбоб-ускуна: 2" ni esa
 * "2 комплект" deb o'qishi kerak. Birliksiz son ta'minot
 * ro'yxatida ikki xil tushuniladi.
 */
export const PASSIV_BIRLIGI: Record<string, string> = {
  'Quyosh paneli': 'дона',
  Tovuq: 'бош',
  Sigir: 'бош',
  'Kichik issiqxona': 'дона',
  'Koʻchatchilik': 'туп',
  'Tikuv mashinasi': 'дона',
  'Muzlatkich ijarasi': 'дона',
  'Asbob-uskuna ijarasi': 'комплект',
  'Kichik savdo nuqtasi': 'дона',
  'Qoʻy-echki mini-fermasi': 'бош',
  Boshqa: 'дона',
};

// ─────────────────────────────────────────────────────────────
//  MAHALLA INFRATUZILMASI
// ─────────────────────────────────────────────────────────────

/**
 * Mahalladagi infratuzilma muammolari.
 *
 * Anketaning qolgan hamma bo'limi XONADON haqida: shu oilada
 * gaz bormi, shu oilaning daromadi qancha. Lekin oilani
 * kambag'allikdan chiqarishga to'sqinlik qiladigan narsa
 * ko'pincha xonadonda emas, KO'CHADA turadi: yo'l yo'q va
 * mahsulot bozorga chiqmaydi; bog'cha yo'q va ayol ishga
 * chiqolmaydi; internet yo'q va masofadan ishlash mumkin emas.
 *
 * Bu ro'yxat 40 000 xonadondan yig'ilganda tuman uchun tayyor
 * investitsiya rejasiga aylanadi: qaysi mahallada nechta oila
 * aynan shu narsani ko'rsatgan.
 */
export const INFRATUZILMA_MUAMMOSI = v(
  ['Ichki yoʻllar', 'Ички йўллар'],
  ['Ichimlik suvi tarmogʻi', 'Ичимлик суви тармоғи'],
  ['Tabiiy gaz tarmogʻi', 'Табиий газ тармоғи'],
  ['Elektr tarmogʻi va kuchlanish', 'Электр тармоғи ва кучланиш'],
  ['Koʻcha yoritish', 'Кўча ёритиш'],
  ['Kanalizatsiya', 'Канализация'],
  ['Sugʻorish tarmogʻi va zovur', 'Суғориш тармоғи ва зовур'],
  ['Koʻprik va oʻtish joyi', 'Кўприк ва ўтиш жойи'],
  ['Bogʻcha', 'Боғча'],
  ['Maktab', 'Мактаб'],
  ['Oilaviy poliklinika yoki FVP', 'Оилавий поликлиника ёки ФВП'],
  ['Internet va aloqa', 'Интернет ва алоқа'],
  ['Jamoat transporti', 'Жамоат транспорти'],
  ['Sport va bolalar maydonchasi', 'Спорт ва болалар майдончаси'],
  ['Chiqindi chiqarish', 'Чиқинди чиқариш'],
  ['Savdo shoxobchasi yoki bozor', 'Савдо шохобчаси ёки бозор'],
  ['Boshqa', 'Бошқа']
);
