/**
 * ============================================================
 *  XONADON PROFILI — anketaning barcha bo'limlari hisobotga
 *
 *  Ilgari hisobotda faqat bandlik raqamlari chiqardi. Anketa
 *  esa 10 bo'limdan iborat: uy-joy, ta'lim, sog'liq, ijtimoiy
 *  himoya, yer va chorva. Bularning hammasi bazada yig'ilardi
 *  va hech qayerda ko'rinmasdi - ya'ni yettilik a'zosi eshikma-
 *  eshik yurib to'plagan ma'lumotning yarmi behuda ketardi.
 *
 *  ── Nega SANOQ, jami emas ──
 *
 *  "Gazi yo'q xonadonlar: 143" degan raqam chora-tadbirga
 *  aylanadi. "O'rtacha gaz ko'rsatkichi 0.62" esa aylanmaydi.
 *  Shuning uchun bu yerda deyarli hamma joyda SANOQ ishlatiladi:
 *  nechta xonadon, nechta bola, nechta oila.
 *
 *  ── Nega bo'sh bo'lim tushib qoladi ──
 *
 *  Xatlov yangi boshlangan mahallada ko'p bo'lim bo'sh bo'ladi.
 *  Nol bilan to'ldirilgan jadval hisobotni "to'liq" ko'rsatadi,
 *  lekin hech narsa aytmaydi va o'quvchining vaqtini oladi.
 * ============================================================
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  CHET_EL_DAVLATI,
  CHORVA_TURI,
  INFRATUZILMA_MUAMMOSI,
  PASSIV_BIRLIGI,
  PASSIV_DAROMAD_TURI,
  DAROMAD_MANBAI,
  GAZ_TURI,
  HUNAR_TURI,
  ICHIMLIK_SUVI,
  KAMBAGALLIK_SABABI,
  MABLAG_YONALISHI,
  MOLIYA_TURI,
  TOMORQA_FOYDALANISH,
  UY_HOLATI,
  kirillcha,
  shaharNomi,
} from '@/lib/constants';
import type { Bolim, Jadval, Qator } from './turlar';
import { foiz, foizi, pul, raqamga, son, sotix } from './format';

/** Xatlovdan o'tgan xonadonlar - qoralama hisobga olinmaydi */
type Filtr = Prisma.HouseholdWhereInput;

/**
 * Katalog bo'yicha sanoq.
 *
 * `String[]` maydonni Prisma `groupBy` bilan sanab bo'lmaydi,
 * shuning uchun har bir katalog qiymati uchun alohida `count`
 * yuboriladi. Kataloglar qisqa (5-13 band) va so'rovlar
 * parallel ketadi, shuning uchun bu arzon. Muhimi: natija
 * KATALOG TARTIBIDA chiqadi - jadval har safar bir xil
 * ko'rinishda bo'ladi va oyma-oy solishtirib bo'ladi.
 */
async function massivSanoq(
  filtr: Filtr,
  maydonNomi: keyof Prisma.HouseholdWhereInput,
  katalog: { qiymat: string; kirill: string }[]
): Promise<{ nomi: string; soni: number }[]> {
  const natijalar = await Promise.all(
    katalog.map((k) =>
      prisma.household.count({
        where: { ...filtr, [maydonNomi]: { has: k.qiymat } } as Filtr,
      })
    )
  );
  return katalog
    .map((k, i) => ({ nomi: k.kirill, soni: natijalar[i] }))
    .filter((x) => x.soni > 0);
}

/** Bitta matn maydoni bo'yicha sanoq - katalog tartibida */
async function matnSanoq(
  filtr: Filtr,
  maydonNomi: 'uyHolati' | 'ichimlikSuvi' | 'gazTuri' | 'tomorqaFoydalanish',
  katalog: { qiymat: string; kirill: string }[]
): Promise<{ nomi: string; soni: number }[]> {
  const guruh = await prisma.household.groupBy({
    by: [maydonNomi],
    where: filtr,
    _count: true,
  });
  const xarita = new Map<string, number>();
  for (const g of guruh) {
    const k = (g as Record<string, unknown>)[maydonNomi];
    if (typeof k === 'string') xarita.set(k, g._count);
  }
  const qatorlar = katalog
    .map((k) => ({ nomi: k.kirill, soni: xarita.get(k.qiymat) ?? 0 }))
    .filter((x) => x.soni > 0);

  // Katalogda yo'q qiymatlar ("Бошқа" matni) oxirida yig'iladi
  const katalogQiymatlari = new Set(katalog.map((k) => k.qiymat));
  const boshqa = [...xarita.entries()]
    .filter(([k]) => !katalogQiymatlari.has(k))
    .reduce((s, [, v]) => s + v, 0);
  if (boshqa > 0) qatorlar.push({ nomi: 'Бошқа / кўрсатилмаган', soni: boshqa });

  return qatorlar;
}

/** Sanoq ro'yxatini "nomi / soni / ulushi" jadvaliga aylantiradi */
function sanoqJadvali(
  sarlavha: string,
  izoh: string | undefined,
  birinchiUstun: string,
  royxat: { nomi: string; soni: number }[],
  butun: number,
  jamiQatori = false
): Jadval | null {
  if (!royxat.length) return null;

  const qatorlar: Qator[] = royxat.map((x) => ({
    nomi: x.nomi,
    qiymatlar: [son(x.soni), foiz(foizi(x.soni, butun))],
  }));

  if (jamiQatori) {
    const jami = royxat.reduce((s, x) => s + x.soni, 0);
    qatorlar.push({
      nomi: 'ЖАМИ',
      qiymatlar: [son(jami), foiz(foizi(jami, butun))],
      jami: true,
    });
  }

  return {
    sarlavha,
    izoh,
    ustunlar: [
      { sarlavha: birinchiUstun },
      { sarlavha: 'Хонадон', raqamli: true, eni: 26 },
      { sarlavha: 'Улуши', raqamli: true, eni: 22 },
    ],
    qatorlar,
  };
}

/* ═══════════════════════════════════════════════════════════ */

/**
 * Xonadon bo'limlarini yig'adi.
 *
 * `jamiXonadon` - xatlovdan o'tgan xonadonlar soni. Barcha
 * ulushlar SHUNGA nisbatan hisoblanadi, bazadagi umumiy
 * xonadonga emas: "xatlovdan o'tganlarning 18 foizida gaz yo'q"
 * degan gap tekshirib bo'ladigan, "tumandagi 18 foiz xonadonda
 * gaz yo'q" degani esa yolg'on bo'lardi.
 */
export async function xonadonBolimlari(
  filtr: Filtr,
  jamiXonadon: number
): Promise<Bolim[]> {
  if (jamiXonadon === 0) return [];

  const [
    jamlar,
    mehnat,
    // Uy-joy va kommunal
    gazsiz,
    elektrsiz,
    kanalizatsiyasiz,
    sugorishsiz,
    uyHolati,
    ichimlik,
    gazTurlari,
    // Ta'lim
    talim,
    // Sog'liq
    uzoqDavolanish,
    // Ijtimoiy himoya
    nogironlik,
    yolgizKeksa,
    parvarish,
    hujjatsiz,
    // Yer va chorva
    yer,
    tomorqaBor,
    chorvaBor,
    hunarmandBor,
    issiqxona,
    ijaraYer,
    chorvaTurlari,
    hunarTurlari,
    // Tadbirkorlik
    tadbirkorlikIstagi,
    moliyaEhtiyoji,
    kasbHunarIstagi,
    moliya,
    moliyaTurlari,
    mablagYonalishlari,
    // Daromad
    daromad,
    daromadManbalari,
    kambagallikSabablari,
    // Chet eldagi mehnat
    chetElXonadon,
    chetElJamlar,
    chetElDavlatlari,
    chetElBoshqaDavlatlar,
    chetElShaharXom,
    // Passiv daromad va infratuzilma
    passivDaromad,
    passivTurlari,
    passivSonXom,
    infratuzilma,
    infratuzilmaXonadon,
    chorvaBosh,
    // Oila tarkibi — bolalarning yosh guruhlari
    bolalarYoshi,
    ayolBoshliq,
    // Sog'liq — dori va tibbiy xizmat ehtiyoji
    doriKerak,
    tibbiyKerak,
    korikYozgan,
    // Tomorqadan foydalanish darajasi va qo'shimcha yer
    tomorqaFoydalanish,
    qoshimchaYerXonadon,
    qoshimchaYer,
    // Anketa hujjati sifati
    rozilikBerdi,
    imzoBor,
  ] = await Promise.all([
    prisma.household.aggregate({
      where: filtr,
      _sum: { jamiAzo: true, bolalarSoni: true },
      _avg: { jamiAzo: true },
    }),
    prisma.household.aggregate({
      where: filtr,
      _sum: {
        mehnatgaLayoqatli: true,
        mehnatgaLayoqatsiz: true,
        ishlaydiganlar: true,
        davlatKorxonada: true,
        xususiySektorda: true,
        ishsizlarSoni: true,
        bogchaKutayotganAyollar: true,
      },
      _avg: { ishsizlikMuddatiOy: true },
    }),

    prisma.household.count({ where: { ...filtr, gaz: false } }),
    prisma.household.count({ where: { ...filtr, elektr: false } }),
    prisma.household.count({ where: { ...filtr, kanalizatsiya: false } }),
    prisma.household.count({ where: { ...filtr, sugorishSuvi: false } }),
    matnSanoq(filtr, 'uyHolati', UY_HOLATI),
    matnSanoq(filtr, 'ichimlikSuvi', ICHIMLIK_SUVI),
    matnSanoq({ ...filtr, gaz: true }, 'gazTuri', GAZ_TURI),

    prisma.household.aggregate({
      where: filtr,
      _sum: {
        maktabgachaYoshdagi: true,
        maktabgachaQamrovda: true,
        maktabYoshdagi: true,
        maktabQamrovda: true,
        togarakQamrovi: true,
      },
    }),

    prisma.household.count({ where: { ...filtr, uzoqDavolanish: true } }),

    prisma.household.count({ where: { ...filtr, nogironlikBor: true } }),
    prisma.household.count({ where: { ...filtr, yolgizKeksa: true } }),
    prisma.household.count({ where: { ...filtr, parvarishgaMuhtoj: true } }),
    prisma.household.count({ where: { ...filtr, hujjatlarToliq: false } }),

    prisma.household.aggregate({
      where: filtr,
      _sum: { ekinMaydoni: true, issiqxonaMaydoni: true, ijaraYerMaydoni: true },
    }),
    prisma.household.count({ where: { ...filtr, tomorqaBor: true } }),
    prisma.household.count({ where: { ...filtr, chorvaBor: true } }),
    prisma.household.count({ where: { ...filtr, hunarmandBor: true } }),
    prisma.household.count({ where: { ...filtr, issiqxonaTalabi: true } }),
    prisma.household.count({ where: { ...filtr, ijaraYer: true } }),
    massivSanoq({ ...filtr, chorvaBor: true }, 'chorvaTurlari', CHORVA_TURI),
    massivSanoq({ ...filtr, hunarmandBor: true }, 'hunarTurlari', HUNAR_TURI),

    prisma.household.count({ where: { ...filtr, tadbirkorlikIstagi: true } }),
    prisma.household.count({ where: { ...filtr, moliyaEhtiyoji: true } }),
    prisma.household.count({ where: { ...filtr, kasbHunarIstagi: true } }),
    prisma.household.aggregate({
      where: { ...filtr, talabQilinganMablag: { not: null } },
      _sum: { talabQilinganMablag: true },
      _avg: { talabQilinganMablag: true },
      _count: true,
    }),
    massivSanoq({ ...filtr, moliyaEhtiyoji: true }, 'moliyaTuri', MOLIYA_TURI),
    massivSanoq({ ...filtr, moliyaEhtiyoji: true }, 'mablagYonalishi', MABLAG_YONALISHI),

    prisma.household.aggregate({
      where: { ...filtr, oylikDaromad: { not: null } },
      _avg: { oylikDaromad: true },
      _count: true,
    }),
    massivSanoq(filtr, 'daromadManbalari', DAROMAD_MANBAI),
    massivSanoq(filtr, 'kambagallikSabablari', KAMBAGALLIK_SABABI),

    prisma.household.count({ where: { ...filtr, chetElMehnati: true } }),
    prisma.household.aggregate({
      where: { ...filtr, chetElMehnati: true },
      _sum: { chetElIshchilar: true, chetElOylikPulSom: true },
      _avg: { chetElOylikPulSom: true },
      _count: { chetElOylikPulSom: true },
    }),
    massivSanoq({ ...filtr, chetElMehnati: true }, 'chetElDavlatlari', CHET_EL_DAVLATI),
    /*
     * «Бошқа давлат» — эркин матн. Каталогда йўқ давлат қайта-қайта
     * ёзилса, у ердан янги йўналиш чиқади (масалан, Хитой ёки
     * Чехия) ва каталогга қўшиш керак бўлади. Шунинг учун улар
     * ҳам гуруҳланиб, ҳисоботда алоҳида кўринади.
     */
    prisma.household.groupBy({
      by: ['chetElBoshqaDavlat'],
      where: { ...filtr, chetElMehnati: true, chetElBoshqaDavlat: { not: null } },
      _count: true,
    }),

    /*
     * ШАҲАРЛАР — эркин рўйхат.
     *
     * Қиймат «давлат|шаҳар» кўринишида сақланади, шунинг учун
     * каталог бўйича санаб бўлмайди: хом рўйхат олиниб, шу
     * ерда гуруҳланади.
     */
    prisma.household.findMany({
      where: { ...filtr, chetElMehnati: true, chetElShaharlari: { isEmpty: false } },
      select: { chetElShaharlari: true },
    }),

    // Пассив даромад
    prisma.household.count({ where: { ...filtr, passivDaromadIstagi: true } }),
    massivSanoq({ ...filtr, passivDaromadIstagi: true }, 'passivDaromadTurlari', PASSIV_DAROMAD_TURI),
    /*
     * Миқдорлар `Json` да, шунинг учун SQL да қўшиб бўлмайди:
     * хом ёзувлар олиниб, шу ерда жамланади. Пассив даромад
     * сўраганлар сони хатловдан ўтганларнинг бир қисми, ва ҳар
     * ёзувдан фақат битта кичик обект ўқилади.
     */
    prisma.household.findMany({
      where: { ...filtr, passivDaromadIstagi: true },
      select: { passivDaromadSonlari: true },
    }),

    // Маҳалла инфратузилмаси
    massivSanoq(filtr, 'infratuzilmaMuammolari', INFRATUZILMA_MUAMMOSI),
    prisma.household.count({ where: { ...filtr, infratuzilmaMuammolari: { isEmpty: false } } }),

    // Чорва бош сони
    prisma.household.aggregate({
      where: { ...filtr, chorvaBor: true },
      _sum: { yirikShoxliSoni: true, maydaShoxliSoni: true, parrandaSoni: true },
    }),

    /*
     * ── БОЛАЛАРНИНГ ЁШ ГУРУҲЛАРИ ──
     *
     * «12 та бола» деган рақамдан чора чиқмайди. 0-3 ёшдаги
     * бола онасини уйда ушлаб туради — унга БОҒЧА керак;
     * 3-17 ёш мактаб ва тўгарак масаласи; 18 дан катта фарзанд
     * эса аслида ИШСИЗ ФУҚАРО ва бандлик марказининг иши.
     * Учтасига уч хил чора керак, шунинг учун учтаси алоҳида.
     */
    prisma.household.aggregate({
      where: filtr,
      _sum: {
        bolalar0_3Yosh: true,
        bolalar3_17Yosh: true,
        bolalar18Yoshdan: true,
      },
    }),
    prisma.household.count({ where: { ...filtr, oilaBoshligiJinsi: 'Ayol' } }),

    /*
     * Соғлиқ: доимий дори ва тиббий хизмат эҳтиёжи эркин
     * матнда ёзилади, шунинг учун МАЗМУНИ эмас, БОРЛИГИ
     * саналади. Рўйхатнинг ўзи маҳалла ходимида қолади.
     */
    prisma.household.count({ where: { ...filtr, doriEhtiyoji: { not: null } } }),
    prisma.household.count({ where: { ...filtr, tibbiyXizmatEhtiyoji: { not: null } } }),
    prisma.household.count({ where: { ...filtr, oxirgiTibbiyKorik: { not: null } } }),

    /*
     * Ер МАЙДОНИ етмайди: ўша 10 сотих тўлиқ экилган ҳам,
     * йиллаб ташлаб қўйилган ҳам бўлиши мумкин. Иккисига
     * бошқа-бошқа чора керак — биринчисига уруғ ва кўчат,
     * иккинчисига аввал сабабини аниқлаш.
     */
    matnSanoq({ ...filtr, tomorqaBor: true }, 'tomorqaFoydalanish', TOMORQA_FOYDALANISH),
    prisma.household.count({ where: { ...filtr, qoshimchaYerBor: true } }),
    prisma.household.aggregate({
      where: { ...filtr, qoshimchaYerBor: true },
      _sum: { qoshimchaYerMaydoni: true },
    }),

    /*
     * Анкета сифати: имзосиз анкета юридик кучга эга эмас ва
     * унга таянган чора-тадбир эътирозга учраши мумкин.
     */
    prisma.household.count({ where: { ...filtr, rozilikBerdi: true } }),
    prisma.household.count({ where: { ...filtr, imzoYoli: { not: null } } }),
  ]);

  const bolimlar: Bolim[] = [];

  /* ── Oila tarkibi: bolalarning yosh guruhlari ─────────────── */
  const jamiAzo = jamlar._sum.jamiAzo ?? 0;
  const jamiBola = jamlar._sum.bolalarSoni ?? 0;
  const bola0_3 = bolalarYoshi._sum.bolalar0_3Yosh ?? 0;
  const bola3_17 = bolalarYoshi._sum.bolalar3_17Yosh ?? 0;
  const bola18 = bolalarYoshi._sum.bolalar18Yoshdan ?? 0;

  /*
   * Ёш гуруҳи ЖАМИ ФАРЗАНД сонидан ажратилади, аҳолидан эмас:
   * «72 та фарзанддан 7 таси боғча ёшида» деган гап текшириб
   * бўладиган, «146 аҳолидан 7 таси» деган гап эса чалғитади.
   *
   * Бўлим фақат ёш гуруҳи тўлдирилган бўлса чиқади. Эски
   * анкеталарда бу уч катак йўқ эди ва уларда учовининг
   * йиғиндиси нол бўлади — «туманда бола йўқ» деб кўрсатишдан
   * кўра, бўлимни умуман чиқармаган яхши.
   */
  if (bola0_3 + bola3_17 + bola18 > 0) {
    bolimlar.push({
      kalit: 'oila',
      sarlavha: 'Хонадон ва оила таркиби',
      varaqNomi: 'Оила таркиби',
      kirish:
        'Боланинг ёши — чорани белгилайди. 0-3 ёшдаги бола онасини уйда ушлаб туради ва унга боғча керак; 3-17 ёш мактаб ва тўгарак масаласи; 18 дан катта фарзанд эса аслида ишсиз фуқаро ва бандлик марказининг иши. «Жами 72 та бола» деган рақамдан бирон чора чиқмайди.',
      korsatkichlar: [
        { nomi: 'Хонадондаги аҳоли', qiymat: son(jamiAzo), izoh: `ўртача ${String(Math.round((jamlar._avg.jamiAzo ?? 0) * 10) / 10).replace('.', ',')} киши` },
        { nomi: 'Жами фарзанд', qiymat: son(jamiBola), izoh: `аҳолининг ${foiz(foizi(jamiBola, jamiAzo))}и` },
        {
          nomi: '17 ёшгача бола',
          qiymat: son(bola0_3 + bola3_17),
          izoh: 'боғча, мактаб ва тиббиёт режаси учун',
          yonalish: 'betaraf',
        },
        {
          nomi: 'Аёл оила бошлиғи',
          qiymat: son(ayolBoshliq),
          izoh: `хонадонларнинг ${foiz(foizi(ayolBoshliq, jamiXonadon))}и`,
          yonalish: 'betaraf',
        },
      ],
      jadvallar: [
        {
          sarlavha: 'Болалар ёш гуруҳлари бўйича',
          izoh:
            'Улуш жами фарзанд сонидан ҳисобланган. 0-3 ёшдаги ҳар бола — боғча навбати, 3-17 ёшдаги ҳар бола — мактаб ва тўгарак қамрови масаласи.',
          ustunlar: [
            { sarlavha: 'Ёш гуруҳи' },
            { sarlavha: 'Бола', raqamli: true, eni: 24 },
            { sarlavha: 'Улуши', raqamli: true, eni: 24 },
          ],
          qatorlar: [
            { nomi: '0-3 ёш', qiymatlar: [son(bola0_3), foiz(foizi(bola0_3, jamiBola))] },
            { nomi: '3-17 ёш', qiymatlar: [son(bola3_17), foiz(foizi(bola3_17, jamiBola))] },
            { nomi: '18 ёшдан катта', qiymatlar: [son(bola18), foiz(foizi(bola18, jamiBola))] },
            {
              nomi: 'ЖАМИ',
              qiymatlar: [son(bola0_3 + bola3_17 + bola18), foiz(100)],
              jami: true,
            },
          ],
        },
      ],
      diagrammalar: [
        {
          turi: 'doira',
          sarlavha: 'Болалар ёш гуруҳлари',
          nomlar: ['0-3 ёш', '3-17 ёш', '18 ёшдан катта'],
          qatorlar: [{ nomi: 'Бола', qiymatlar: [bola0_3, bola3_17, bola18] }],
        },
      ],
    });
  }

  /* ── Mehnat salohiyati ────────────────────────────────────── */
  const layoqatli = mehnat._sum.mehnatgaLayoqatli ?? 0;
  const layoqatsiz = mehnat._sum.mehnatgaLayoqatsiz ?? 0;
  const ishlaydigan = mehnat._sum.ishlaydiganlar ?? 0;
  const ishsiz = mehnat._sum.ishsizlarSoni ?? 0;
  const davlatda = mehnat._sum.davlatKorxonada ?? 0;
  const xususiyda = mehnat._sum.xususiySektorda ?? 0;
  const bogchaKutayotgan = mehnat._sum.bogchaKutayotganAyollar ?? 0;

  bolimlar.push({
    kalit: 'mehnat',
    sarlavha: 'Меҳнат ва бандлик',
    varaqNomi: 'Меҳнат ва бандлик',
    kirish:
      'Хатловдан ўтган хонадонлардаги меҳнат салоҳияти. «Меҳнатга лаёқатли» — 16 ёшдан нафақа ёшига қадар бўлган оила аъзолари. «Меҳнатга лаёқатсиз» — шу ёшда, аммо ногиронлик ёки касаллик сабаб ишлай олмайдиганлар; улар ишсизлар қаторига кирмайди.',
    korsatkichlar: [
      { nomi: 'Хонадондаги аҳоли', qiymat: son(jamiAzo), izoh: `ўртача ${String(Math.round((jamlar._avg.jamiAzo ?? 0) * 10) / 10).replace('.', ',')} киши` },
      { nomi: 'Меҳнатга лаёқатли', qiymat: son(layoqatli), izoh: `аҳолининг ${foiz(foizi(layoqatli, jamiAzo))}и` },
      /*
        Меҳнатга лаёқатсизлар АЛОҲИДА қатор.
        Улар ишсизлар ичида эмас: иш қидирмайди, шунинг учун
        бандлик маркази уларга иш таклиф қилмайди. Уларга
        ижтимоий ёрдам керак ва ҳокимга шу рақам керак.
      */
      {
        nomi: 'Меҳнатга лаёқатсиз',
        qiymat: son(layoqatsiz),
        izoh: 'иш ёшида, аммо ишлай олмайди — ишсизлар қаторига кирмайди',
      },
      {
        nomi: 'Иш билан банд',
        qiymat: son(ishlaydigan),
        izoh: `лаёқатлиларнинг ${foiz(foizi(ishlaydigan, layoqatli))}и`,
        yonalish: 'kop-yaxshi',
        foiz: foizi(ishlaydigan, layoqatli),
      },
      {
        nomi: 'Ишсиз',
        qiymat: son(ishsiz),
        izoh: `лаёқатлиларнинг ${foiz(foizi(ishsiz, layoqatli))}и`,
        yonalish: 'kam-yaxshi',
        foiz: foizi(ishsiz, layoqatli),
      },
    ],
    jadvallar: [
      {
        sarlavha: 'Бандлик тузилиши',
        izoh:
          'Банд аҳоли қаерда ишлайди. Давлат ва хусусий сектор нисбати чора-тадбир танлашда муҳим: хусусий сектор кенг бўлган маҳаллада иш ўрни очиш осонроқ.' +
          /*
           * АНКЕТА ХАТОСИНИ ЯШИРМАЙМИЗ.
           *
           * «Давлат корхонасида» ва «хусусий секторда» сонларининг
           * йиғиндиси «иш билан банд» сонидан ошиб кетиши мумкин —
           * бу анкета тўлдиришдаги хато. Уни жимгина тўғрилаб
           * қўйиш (масалан фоизни йиғиндига нисбатан ҳисоблаш)
           * ҳисоботни «чиройли» қиларди, аммо хато базада қолиб
           * кетарди ва кейинги ҳисоботларда ҳам такрорланарди.
           *
           * Шунинг учун ҳисобот буни АЙТАДИ: ходим қайси
           * анкеталарни текшириши кераклигини билиб олади.
           */
          (davlatda + xususiyda > ishlaydigan
            ? ` ДИҚҚАТ: секторлар йиғиндиси (${son(davlatda + xususiyda)}) банд аҳоли сонидан (${son(ishlaydigan)}) ошиб кетган — баъзи анкеталарда хатолик бор, уларни текшириш керак.`
            : ''),
        ustunlar: [
          { sarlavha: 'Кўрсаткич' },
          { sarlavha: 'Киши', raqamli: true, eni: 26 },
          { sarlavha: 'Улуши', raqamli: true, eni: 22 },
        ],
        qatorlar: [
          { nomi: 'Давлат корхоналарида', qiymatlar: [son(davlatda), foiz(foizi(davlatda, ishlaydigan))] },
          { nomi: 'Хўжалик юритувчи субъектларда', qiymatlar: [son(xususiyda), foiz(foizi(xususiyda, ishlaydigan))] },
          ...(ishlaydigan - davlatda - xususiyda > 0
            ? [
                {
                  nomi: 'Бошқа / кўрсатилмаган',
                  qiymatlar: [
                    son(ishlaydigan - davlatda - xususiyda),
                    foiz(foizi(ishlaydigan - davlatda - xususiyda, ishlaydigan)),
                  ],
                },
              ]
            : []),
          { nomi: 'ЖАМИ БАНД', qiymatlar: [son(ishlaydigan), foiz(100)], jami: true },
        ],
      },
      ...(bogchaKutayotgan > 0
        ? [
            {
              sarlavha: 'Боғча очилса ишлашга тайёр аёллар',
              izoh:
                'Бу аёллар ишсиз деб рўйхатга олинмайди — улар 3 ёшгача бола тарбиясида. Аммо боғча масаласи ҳал бўлса, дарҳол меҳнат бозорига чиқади. Шунинг учун боғча қуриш — бандлик чораси ҳам.',
              ustunlar: [
                { sarlavha: 'Кўрсаткич' },
                { sarlavha: 'Киши', raqamli: true, eni: 26 },
              ],
              qatorlar: [
                { nomi: 'Боғча кутаётган аёллар', qiymatlar: [son(bogchaKutayotgan)] },
              ],
            },
          ]
        : []),
    ],
    diagrammalar: [
      {
        turi: 'doira',
        sarlavha: 'Меҳнатга лаёқатли аҳоли тақсимоти',
        izoh: 'Лаёқатли аҳолининг қанчаси банд, қанчаси ишсиз',
        nomlar: ['Банд', 'Ишсиз', 'Бошқа ҳолат'],
        qatorlar: [
          {
            nomi: 'Киши',
            qiymatlar: [ishlaydigan, ishsiz, Math.max(0, layoqatli - ishlaydigan - ishsiz)],
          },
        ],
      },
    ],
  });

  /* ── Daromad va kambag'allik sabablari ────────────────────── */
  const ortachaDaromad = raqamga(daromad._avg.oylikDaromad as unknown as bigint | null);
  if (daromad._count > 0 || kambagallikSabablari.length) {
    const jadvallar: Jadval[] = [];
    const sabablar = sanoqJadvali(
      'Камбағалликнинг айтилган сабаблари',
      'Хонадон эгасининг ўзи кўрсатган сабаблар. Бир хонадон бир нечта сабабни белгилаши мумкин, шунинг учун улушлар йиғиндиси 100 фоиздан ошади.',
      'Сабаб',
      kambagallikSabablari,
      jamiXonadon
    );
    if (sabablar) jadvallar.push(sabablar);

    const manbalar = sanoqJadvali(
      'Даромад манбалари',
      'Хонадон нима ҳисобидан кун кўради',
      'Манба',
      daromadManbalari,
      jamiXonadon
    );
    if (manbalar) jadvallar.push(manbalar);

    bolimlar.push({
      kalit: 'daromad',
      sarlavha: 'Даромад ва камбағаллик сабаблари',
      varaqNomi: 'Даромад',
      kirish:
        'Даромад маълумоти хонадон эгасининг айтганига асосланади ва ҳужжат билан тасдиқланмайди. Шунинг учун у аниқ рақам эмас, ЙЎНАЛИШ кўрсатади.',
      korsatkichlar:
        daromad._count > 0
          ? [
              {
                nomi: 'Ўртача ойлик даромад',
                qiymat: `${pul(ortachaDaromad)} сўм`,
                izoh: `${son(daromad._count)} хонадон кўрсатган`,
              },
              {
                nomi: 'Даромад кўрсатган хонадон',
                qiymat: son(daromad._count),
                izoh: `хатловдан ўтганларнинг ${foiz(foizi(daromad._count, jamiXonadon))}и`,
              },
            ]
          : undefined,
      jadvallar,
      diagrammalar: kambagallikSabablari.length
        ? [
            {
              turi: 'gorizontal',
              sarlavha: 'Камбағаллик сабаблари — хонадон сони',
              nomlar: kambagallikSabablari.map((x) => x.nomi),
              qatorlar: [{ nomi: 'Хонадон', qiymatlar: kambagallikSabablari.map((x) => x.soni) }],
            },
          ]
        : undefined,
    });
  }

  /* ── Chet eldagi mehnat va pul o'tkazmasi ─────────────────── */
  /*
   * Бу бўлим нима учун керак.
   *
   * Хатловда «ойлик даромад» деб ёзилган рақам кўпинча ФАҚАТ
   * маҳаллий даромадни кўрсатади: оила бошлиғи Россиядаги ўғли
   * юборадиган пулни «даромад» деб ҳисобламайди. Натижада
   * хонадон энг муҳтож рўйхатига тушиб қолади ва ҳақиқатан
   * муҳтож оиланинг ўрнини эгаллайди.
   *
   * Иккинчи томони — қайтиш. Чет элдан қайтган киши иш
   * қидиради, лекин у бандлик рўйхатида йўқ. Қайси давлатда
   * нечта одам борлигини билган марказ, курс ёпилгани ёки
   * чегара ёпилгани ҳақидаги хабарни эшитганда, неча кишига
   * иш кераклигини ОЛДИНДАН билади.
   */
  if (chetElXonadon > 0) {
    const ishchilar = chetElJamlar._sum.chetElIshchilar ?? 0;
    /*
     * ПУЛ СЎМДА ҲИСОБЛАНАДИ.
     *
     * Илгари `chetElOylikPul` тўғридан-тўғри қўшиларди — ҳолбуки
     * унда доллар ҳам, сўм ҳам бор. 500 (доллар) билан
     * 5 000 000 (сўм) бир устунга қўшилса, натижа маъносиз
     * бўлади. Энди сақлаш пайтида сўмга келтирилган устун
     * ўқилади.
     */
    const jamiPul = raqamga(chetElJamlar._sum.chetElOylikPulSom as unknown as bigint | null);
    const ortachaPul = raqamga(chetElJamlar._avg.chetElOylikPulSom as unknown as bigint | null);
    const pulKorsatgan = chetElJamlar._count.chetElOylikPulSom ?? 0;

    const jadvallar: Jadval[] = [];

    const davlatlar = sanoqJadvali(
      'Қайси давлатларда ишлашмоқда',
      'Битта хонадондан бир неча давлатга кетган бўлиши мумкин, шунинг учун устунлар йиғиндиси хонадон сонидан кўп бўлиши мумкин',
      'Давлат',
      chetElDavlatlari,
      chetElXonadon
    );
    if (davlatlar) jadvallar.push(davlatlar);

    /* Каталогда йўқ, ходим қўлда ёзган давлатлар */
    const boshqalar = chetElBoshqaDavlatlar
      .map((g) => ({ nomi: (g.chetElBoshqaDavlat ?? '').trim(), soni: g._count }))
      .filter((x) => x.nomi.length > 0)
      .sort((a, b) => b.soni - a.soni);

    /* Шаҳарлар кесими — «давлат|шаҳар» қийматидан гуруҳланади */
    const shaharXarita = new Map<string, number>();
    for (const r of chetElShaharXom) {
      for (const sh of r.chetElShaharlari) {
        /* Қоида `constants.ts` да — панел ва экспорт ҳам шуни ишлатади */
        const kalit = shaharNomi(sh);
        if (kalit === sh) continue; // «давлат|шаҳар» шаклида эмас
        shaharXarita.set(kalit, (shaharXarita.get(kalit) ?? 0) + 1);
      }
    }
    const shaharlar = [...shaharXarita.entries()]
      .map(([nomi, soni]) => ({ nomi, soni }))
      .sort((a, b) => b.soni - a.soni);

    const shaharJadvali = sanoqJadvali(
      'Қайси шаҳарларда',
      'Консуллик, меҳнат миграцияси агентлиги ва диаспора билан иш айнан ШАҲАР даражасида юритилади',
      'Давлат ва шаҳар',
      shaharlar,
      chetElXonadon
    );
    if (shaharJadvali) jadvallar.push(shaharJadvali);

    if (boshqalar.length) {
      jadvallar.push({
        sarlavha: '«Бошқа давлат» деб ёзилганлар',
        izoh: 'Рўйхатда йўқ давлатлар. Биттаси такрорланаверса, уни каталогга қўшиш керак.',
        ustunlar: [
          { sarlavha: 'Давлат' },
          { sarlavha: 'Хонадон', raqamli: true, eni: 26 },
        ],
        qatorlar: boshqalar.map((x) => ({ nomi: x.nomi, qiymatlar: [son(x.soni)] })),
      });
    }

    bolimlar.push({
      kalit: 'chet-el',
      sarlavha: 'Чет элдаги меҳнат ва пул ўтказмаси',
      varaqNomi: 'Чет элдаги меҳнат',
      kirish:
        'Чет элда ишлаётган оила аъзоси юборадиган пул ҳам оила даромади. Бу бўлимсиз хонадон «даромади йўқ» бўлиб кўринади ва энг муҳтожлар рўйхатига нотўғри тушади.',
      korsatkichlar: [
        {
          nomi: 'Аъзоси чет элда ишлайдиган хонадон',
          qiymat: son(chetElXonadon),
          izoh: `хатловдан ўтганларнинг ${foiz(foizi(chetElXonadon, jamiXonadon))}и`,
          yonalish: 'betaraf',
        },
        {
          nomi: 'Чет элдаги ишчилар',
          qiymat: son(ishchilar),
          izoh: `ҳар хонадонда ўртача ${String(Math.round((ishchilar / chetElXonadon) * 10) / 10).replace('.', ',')} киши`,
        },
        ...(pulKorsatgan > 0
          ? [
              {
                nomi: 'Ойига келадиган пул',
                qiymat: `${pul(jamiPul)} сўм`,
                izoh: `${son(pulKorsatgan)} хонадон кўрсатган`,
              },
              {
                nomi: 'Хонадонга ўртача',
                qiymat: `${pul(ortachaPul)} сўм`,
                izoh: 'ойига',
              },
            ]
          : []),
      ],
      jadvallar,
      diagrammalar: chetElDavlatlari.length
        ? [
            {
              turi: 'gorizontal',
              sarlavha: 'Давлатлар кесимида — хонадон сони',
              nomlar: chetElDavlatlari.map((x) => x.nomi),
              qatorlar: [{ nomi: 'Хонадон', qiymatlar: chetElDavlatlari.map((x) => x.soni) }],
            },
          ]
        : undefined,
    });
  }

  const yirik = chorvaBosh._sum.yirikShoxliSoni ?? 0;
  const mayda = chorvaBosh._sum.maydaShoxliSoni ?? 0;
  const parranda = chorvaBosh._sum.parrandaSoni ?? 0;

  /* ── Passiv daromad ───────────────────────────────────────── */
  /*
   * Нега алоҳида бўлим.
   *
   * Иш ўрни ва тадбиркорликдан ФАРҚЛИ учинчи йўл. Оилада ёши
   * катта, соғлиғи заиф ёки бола парвариши билан банд аъзо
   * бўлади — уни ишга жойлаштириб бўлмайди. Ҳисоботда у фақат
   * «ишсиз, лекин имконсиз» бўлиб турарди ва ҳеч қандай чорага
   * тушмасди. Пассив даромад ўшаларга тегишли рақам.
   */
  if (passivDaromad > 0) {
    /*
     * ЖАМИ МИҚДОР — таъминот режасининг асосий рақами.
     *
     * «Товуқ сўраган: 84 хонадон» деган рақамдан нечта товуқ
     * сотиб олиш кераклиги чиқмайди. Йиғинди эса тўғридан-тўғри
     * буюртмага айланади.
     */
    const miqdor = new Map<string, number>();
    for (const r of passivSonXom) {
      const m = r.passivDaromadSonlari;
      if (!m || typeof m !== 'object' || Array.isArray(m)) continue;
      for (const [tur, son] of Object.entries(m as Record<string, unknown>)) {
        if (typeof son !== 'number' || son <= 0) continue;
        miqdor.set(tur, (miqdor.get(tur) ?? 0) + son);
      }
    }
    /* Каталог кирилл номидан лотин қийматига қайтариш */
    const qiymatNomi = new Map(PASSIV_DAROMAD_TURI.map((v) => [v.kirill, v.qiymat]));

    const jadval: Jadval | null = passivTurlari.length
      ? {
          sarlavha: 'Қайси восита сўралган',
          izoh: 'Бу рўйхат тўғридан-тўғри таъминот режаси: «жами миқдор» устуни — сотиб олиш керак бўлган сон',
          ustunlar: [
            { sarlavha: 'Восита' },
            { sarlavha: 'Хонадон', raqamli: true, eni: 24 },
            { sarlavha: 'Улуши', raqamli: true, eni: 20 },
            { sarlavha: 'Жами миқдор', raqamli: true, eni: 30 },
          ],
          qatorlar: passivTurlari.map((t) => {
            const qiymat = qiymatNomi.get(t.nomi) ?? t.nomi;
            const jamiSoni = miqdor.get(qiymat) ?? 0;
            const birlik = PASSIV_BIRLIGI[qiymat] ?? 'дона';
            return {
              nomi: t.nomi,
              qiymatlar: [
                son(t.soni),
                foiz(foizi(t.soni, passivDaromad)),
                jamiSoni > 0 ? `${son(jamiSoni)} ${birlik}` : '—',
              ],
            };
          }),
        }
      : null;

    bolimlar.push({
      kalit: 'passiv-daromad',
      sarlavha: 'Пассив даромад воситаси',
      varaqNomi: 'Пассив даромад',
      kirish:
        'Оилага қайси восита берилса, у доимий даромад топа олади: қуёш панели, товуқ, сигир, иссиқхона. Савол «сизда нима бор» эмас, «сизга нима берсак» тарзида қўйилган — шунинг учун бу рўйхат тўғридан-тўғри таъминот режасига айланади.',
      korsatkichlar: [
        {
          nomi: 'Восита сўраган хонадон',
          qiymat: son(passivDaromad),
          izoh: `хатловдан ўтганларнинг ${foiz(foizi(passivDaromad, jamiXonadon))}и`,
          yonalish: 'kop-yaxshi',
        },
      ],
      jadvallar: jadval ? [jadval] : undefined,
      diagrammalar: passivTurlari.length
        ? [
            {
              turi: 'gorizontal',
              sarlavha: 'Сўралган воситалар — хонадон сони',
              nomlar: passivTurlari.map((x) => x.nomi),
              qatorlar: [{ nomi: 'Хонадон', qiymatlar: passivTurlari.map((x) => x.soni) }],
            },
          ]
        : undefined,
    });
  }

  /* ── Mahalla infratuzilmasi ───────────────────────────────── */
  /*
   * Нега бу бўлим ҳисоботнинг ЭНГ ҚИММАТЛИ қисми бўлиши мумкин.
   *
   * Қолган ҳамма бўлим ХОНАДОН ҳақида: шу оилада газ борми, шу
   * оиланинг даромади қанча. Аммо оилани камбағалликдан
   * чиқаришга тўсқинлик қиладиган нарса кўпинча хонадонда эмас,
   * КЎЧАДА туради: йўл йўқ — маҳсулот бозорга чиқмайди; боғча
   * йўқ — аёл ишга чиқолмайди.
   *
   * 40 000 хонадондан йиғилганда бу туман учун тайёр инвестиция
   * режаси: қайси маҳаллада нечта оила айнан шуни кўрсатган.
   */
  if (infratuzilmaXonadon > 0) {
    const jadval = sanoqJadvali(
      'Қайси инфратузилма етишмайди',
      'Битта хонадон бир нечта муаммони кўрсатиши мумкин, шунинг учун устунлар йиғиндиси хонадон сонидан кўп бўлади',
      'Инфратузилма',
      infratuzilma,
      infratuzilmaXonadon
    );

    bolimlar.push({
      kalit: 'infratuzilma',
      sarlavha: 'Маҳалладаги инфратузилма муаммолари',
      varaqNomi: 'Инфратузилма',
      yangiSahifa: true,
      kirish:
        'Бу бўлим хонадон эмас, КЎЧА ҳақида. Фуқаролар ўзи кўрсатган муаммолар: йўл, сув, газ, боғча, интернет. Рўйхат туман инвестиция режасининг асоси бўлади — қайси маҳаллада нечта оила айнан шуни сўраган.',
      korsatkichlar: [
        {
          nomi: 'Муаммо кўрсатган хонадон',
          qiymat: son(infratuzilmaXonadon),
          izoh: `хатловдан ўтганларнинг ${foiz(foizi(infratuzilmaXonadon, jamiXonadon))}и`,
          yonalish: 'kam-yaxshi',
        },
        ...(infratuzilma.length
          ? [
              {
                nomi: 'Энг кўп кўрсатилгани',
                qiymat: infratuzilma[0].nomi,
                izoh: `${son(infratuzilma[0].soni)} хонадон`,
              },
            ]
          : []),
      ],
      jadvallar: jadval ? [jadval] : undefined,
      diagrammalar: infratuzilma.length
        ? [
            {
              turi: 'gorizontal',
              sarlavha: 'Инфратузилма муаммолари — хонадон сони',
              nomlar: infratuzilma.map((x) => x.nomi),
              qatorlar: [{ nomi: 'Хонадон', qiymatlar: infratuzilma.map((x) => x.soni) }],
            },
          ]
        : undefined,
    });
  }

  /* ── Tadbirkorlik va moliya ehtiyoji ──────────────────────── */
  if (tadbirkorlikIstagi > 0 || moliyaEhtiyoji > 0 || kasbHunarIstagi > 0) {
    const jamiTalab = raqamga(moliya._sum.talabQilinganMablag as unknown as bigint | null);
    const jadvallar: Jadval[] = [];

    const turlari = sanoqJadvali(
      'Қайси молиявий кўмак сўралган',
      'Молия эҳтиёжи борлиги айтилган хонадонлар кесимида',
      'Молия тури',
      moliyaTurlari,
      moliyaEhtiyoji
    );
    if (turlari) jadvallar.push(turlari);

    const yonalishlar = sanoqJadvali(
      'Маблағ нимага сўралган',
      'Бу рўйхат бюджет режасининг асоси: қайси йўналишга қанча хонадон талабгор',
      'Йўналиш',
      mablagYonalishlari,
      moliyaEhtiyoji
    );
    if (yonalishlar) jadvallar.push(yonalishlar);

    bolimlar.push({
      kalit: 'tadbirkorlik',
      sarlavha: 'Тадбиркорлик, касб-ҳунар ва молия эҳтиёжи',
      varaqNomi: 'Тадбиркорлик ва молия',
      kirish:
        'Ишга жойлаштириш — бандликнинг бир йўли. Иккинчиси — ўз ишини бошлаш. Бу бўлим қайси хонадон нимага тайёр эканини кўрсатади.',
      korsatkichlar: [
        {
          nomi: 'Тадбиркорлик истаги бор',
          qiymat: son(tadbirkorlikIstagi),
          izoh: `хонадонларнинг ${foiz(foizi(tadbirkorlikIstagi, jamiXonadon))}и`,
          yonalish: 'kop-yaxshi',
        },
        {
          nomi: 'Касб-ҳунар ўрганмоқчи',
          qiymat: son(kasbHunarIstagi),
          izoh: `хонадонларнинг ${foiz(foizi(kasbHunarIstagi, jamiXonadon))}и`,
          yonalish: 'kop-yaxshi',
        },
        {
          nomi: 'Молиявий кўмак сўраган',
          qiymat: son(moliyaEhtiyoji),
          izoh: `хонадонларнинг ${foiz(foizi(moliyaEhtiyoji, jamiXonadon))}и`,
        },
        ...(jamiTalab > 0
          ? [
              {
                nomi: 'Сўралган умумий маблағ',
                qiymat: `${pul(jamiTalab)} сўм`,
                izoh: `${son(moliya._count)} хонадон · ўртача ${pul(raqamga(moliya._avg.talabQilinganMablag as unknown as bigint | null))} сўм`,
              } as const,
            ]
          : []),
      ],
      jadvallar,
      diagrammalar: mablagYonalishlari.length
        ? [
            {
              turi: 'gorizontal',
              sarlavha: 'Маблағ йўналишлари — талабгор хонадон сони',
              nomlar: mablagYonalishlari.map((x) => x.nomi),
              qatorlar: [{ nomi: 'Хонадон', qiymatlar: mablagYonalishlari.map((x) => x.soni) }],
            },
          ]
        : undefined,
    });
  }

  /* ── Bolalar ta'limi ──────────────────────────────────────── */
  const mgYosh = talim._sum.maktabgachaYoshdagi ?? 0;
  const mgQamrov = talim._sum.maktabgachaQamrovda ?? 0;
  const mYosh = talim._sum.maktabYoshdagi ?? 0;
  const mQamrov = talim._sum.maktabQamrovda ?? 0;
  const togarak = talim._sum.togarakQamrovi ?? 0;

  if (mgYosh > 0 || mYosh > 0) {
    bolimlar.push({
      kalit: 'talim',
      sarlavha: 'Болалар таълими',
      varaqNomi: 'Болалар таълими',
      kirish:
        'Қамровдан четда қолган ҳар бир бола — келгуси ўн йилдаги ишсиз. Шунинг учун бу бўлим бандлик ҳисоботида турибди.',
      korsatkichlar: [
        {
          nomi: 'Боғча қамрови',
          qiymat: foiz(foizi(mgQamrov, mgYosh)),
          izoh: `${son(mgQamrov)} / ${son(mgYosh)} бола`,
          yonalish: 'kop-yaxshi',
          foiz: foizi(mgQamrov, mgYosh),
        },
        {
          nomi: 'Мактаб қамрови',
          qiymat: foiz(foizi(mQamrov, mYosh)),
          izoh: `${son(mQamrov)} / ${son(mYosh)} бола`,
          yonalish: 'kop-yaxshi',
          foiz: foizi(mQamrov, mYosh),
        },
        {
          nomi: 'Боғчага бормайди',
          qiymat: son(Math.max(0, mgYosh - mgQamrov)),
          izoh: 'сабаби анкетада ёзилган',
          yonalish: 'kam-yaxshi',
        },
        {
          nomi: 'Тўгарак қамровида',
          qiymat: son(togarak),
          izoh: `мактаб ёшидагиларнинг ${foiz(foizi(togarak, mYosh))}и`,
          yonalish: 'kop-yaxshi',
        },
      ],
      jadvallar: [
        {
          sarlavha: 'Таълим қамрови',
          ustunlar: [
            { sarlavha: 'Босқич' },
            { sarlavha: 'Ёшдаги бола', raqamli: true, eni: 28 },
            { sarlavha: 'Қамровда', raqamli: true, eni: 24 },
            { sarlavha: 'Четда', raqamli: true, eni: 22 },
            { sarlavha: 'Қамров', raqamli: true, eni: 22 },
          ],
          qatorlar: [
            {
              nomi: 'Мактабгача (боғча)',
              qiymatlar: [son(mgYosh), son(mgQamrov), son(Math.max(0, mgYosh - mgQamrov)), foiz(foizi(mgQamrov, mgYosh))],
            },
            {
              nomi: 'Мактаб',
              qiymatlar: [son(mYosh), son(mQamrov), son(Math.max(0, mYosh - mQamrov)), foiz(foizi(mQamrov, mYosh))],
            },
          ],
        },
      ],
      diagrammalar: [
        {
          turi: 'ustun',
          sarlavha: 'Таълим қамрови, %',
          nomlar: ['Боғча', 'Мактаб', 'Тўгарак'],
          qatorlar: [
            {
              nomi: 'Қамров, %',
              qiymatlar: [foizi(mgQamrov, mgYosh), foizi(mQamrov, mYosh), foizi(togarak, mYosh)],
            },
          ],
          foiz: true,
        },
      ],
    });
  }

  /* ── Uy-joy va kommunal ───────────────────────────────────── */
  const kommunalQatorlar: Qator[] = [
    { nomi: 'Газ таъминоти йўқ', qiymatlar: [son(gazsiz), foiz(foizi(gazsiz, jamiXonadon))] },
    { nomi: 'Электр таъминоти йўқ', qiymatlar: [son(elektrsiz), foiz(foizi(elektrsiz, jamiXonadon))] },
    { nomi: 'Канализация йўқ', qiymatlar: [son(kanalizatsiyasiz), foiz(foizi(kanalizatsiyasiz, jamiXonadon))] },
    { nomi: 'Суғориш суви йўқ', qiymatlar: [son(sugorishsiz), foiz(foizi(sugorishsiz, jamiXonadon))] },
  ].filter((q) => q.qiymatlar[0] !== '0');

  if (kommunalQatorlar.length || uyHolati.length || ichimlik.length) {
    const jadvallar: Jadval[] = [];

    if (kommunalQatorlar.length) {
      jadvallar.push({
        sarlavha: 'Коммунал таъминот муаммолари',
        izoh: 'Ҳар бир қатор — тайёр чора-тадбир рўйхати. Хонадонлар рўйхатини тизимдан фильтр билан олиш мумкин.',
        ustunlar: [
          { sarlavha: 'Муаммо' },
          { sarlavha: 'Хонадон', raqamli: true, eni: 26 },
          { sarlavha: 'Улуши', raqamli: true, eni: 22 },
        ],
        qatorlar: kommunalQatorlar,
      });
    }

    const uy = sanoqJadvali('Уй ҳолати', undefined, 'Ҳолат', uyHolati, jamiXonadon, true);
    if (uy) jadvallar.push(uy);

    const suv = sanoqJadvali('Ичимлик суви манбаи', undefined, 'Манба', ichimlik, jamiXonadon, true);
    if (suv) jadvallar.push(suv);

    const gaz = sanoqJadvali(
      'Газ тури',
      'Марказлашган қувур ва баллон — иккита бошқа масала. Баллон билан яшайдиган хонадонда харажат ҳам, хавф ҳам юқори.',
      'Газ тури',
      gazTurlari,
      jamiXonadon - gazsiz
    );
    if (gaz) jadvallar.push(gaz);

    bolimlar.push({
      kalit: 'uyjoy',
      sarlavha: 'Уй-жой ва коммунал таъминот',
      varaqNomi: 'Уй-жой ва коммунал',
      kirish:
        'Коммунал муаммо иш топишга тўғридан-тўғри тўсқинлик қилмайди, аммо оиланинг харажатини оширади ва камбағалликдан чиқишни секинлаштиради.',
      jadvallar,
      diagrammalar: uyHolati.length
        ? [
            {
              turi: 'doira',
              sarlavha: 'Уй ҳолати',
              nomlar: uyHolati.map((x) => x.nomi),
              qatorlar: [{ nomi: 'Хонадон', qiymatlar: uyHolati.map((x) => x.soni) }],
            },
          ]
        : undefined,
    });
  }

  /* ── Sog'liq va ijtimoiy himoya ───────────────────────────── */
  const ijtimoiyQatorlar: Qator[] = [
    { nomi: 'Нафақага муҳтож (ногиронлик)', qiymatlar: [son(nogironlik), foiz(foizi(nogironlik, jamiXonadon))] },
    { nomi: 'Ёлғиз кекса', qiymatlar: [son(yolgizKeksa), foiz(foizi(yolgizKeksa, jamiXonadon))] },
    { nomi: 'Парваришга муҳтож шахс бор', qiymatlar: [son(parvarish), foiz(foizi(parvarish, jamiXonadon))] },
    { nomi: 'Узоқ даволаниш зарур', qiymatlar: [son(uzoqDavolanish), foiz(foizi(uzoqDavolanish, jamiXonadon))] },
    /*
     * Доимий дори ва тиббий хизмат эҳтиёжи — эркин матнда
     * ёзилади, шунинг учун бу ерда фақат БОРЛИГИ саналади.
     * Рўйхатнинг ўзи маҳалла ходимида қолади: ҳисоботга
     * ташхис чиқмаслиги керак.
     */
    { nomi: 'Доимий дорига эҳтиёж', qiymatlar: [son(doriKerak), foiz(foizi(doriKerak, jamiXonadon))] },
    { nomi: 'Тиббий хизматга эҳтиёж', qiymatlar: [son(tibbiyKerak), foiz(foizi(tibbiyKerak, jamiXonadon))] },
    { nomi: 'Охирги тиббий кўрикни кўрсатган', qiymatlar: [son(korikYozgan), foiz(foizi(korikYozgan, jamiXonadon))] },
    { nomi: 'Ҳужжатлари тўлиқ эмас', qiymatlar: [son(hujjatsiz), foiz(foizi(hujjatsiz, jamiXonadon))] },
  ].filter((q) => q.qiymatlar[0] !== '0');

  if (ijtimoiyQatorlar.length) {
    bolimlar.push({
      kalit: 'ijtimoiy',
      sarlavha: 'Соғлиқ, ижтимоий ҳимоя ва ҳужжатлаштириш',
      varaqNomi: 'Ижтимоий ҳимоя',
      kirish:
        'Бу бўлимдаги ҳар бир хонадон одатдаги бандлик чораси билан ишламайди: аввал соғлиқ, парвариш ёки ҳужжат масаласи ҳал бўлиши керак. Уларни умумий рўйхатда қолдириш — статистикани яхши кўрсатиб, одамга ёрдам бермаслик.',
      korsatkichlar: [
        { nomi: 'Ногиронлиги бор хонадон', qiymat: son(nogironlik), yonalish: 'betaraf' },
        { nomi: 'Парваришга муҳтож', qiymat: son(parvarish), yonalish: 'betaraf' },
        { nomi: 'Ёлғиз кекса', qiymat: son(yolgizKeksa), yonalish: 'betaraf' },
        { nomi: 'Ҳужжат муаммоси', qiymat: son(hujjatsiz), yonalish: 'kam-yaxshi' },
      ],
      jadvallar: [
        {
          sarlavha: 'Алоҳида ёндашув талаб қиладиган хонадонлар',
          ustunlar: [
            { sarlavha: 'Ҳолат' },
            { sarlavha: 'Хонадон', raqamli: true, eni: 26 },
            { sarlavha: 'Улуши', raqamli: true, eni: 22 },
          ],
          qatorlar: ijtimoiyQatorlar,
        },
      ],
      diagrammalar: [
        {
          turi: 'gorizontal',
          sarlavha: 'Ижтимоий ҳимоя — хонадон сони',
          nomlar: ijtimoiyQatorlar.map((q) => q.nomi),
          qatorlar: [
            {
              nomi: 'Хонадон',
              qiymatlar: ijtimoiyQatorlar.map((q) => Number(String(q.qiymatlar[0]).replace(/\D/g, '')) || 0),
            },
          ],
        },
      ],
    });
  }

  /* ── Yer, chorva, hunarmandchilik ─────────────────────────── */
  const ekin = yer._sum.ekinMaydoni ?? 0;
  if (tomorqaBor > 0 || chorvaBor > 0 || hunarmandBor > 0) {
    const jadvallar: Jadval[] = [];

    jadvallar.push({
      sarlavha: 'Хонадон хўжалиги',
      izoh:
        'Ер, чорва ва ҳунар — иш ўрни кутмасдан даромад орттириш имконияти. Бу рақамлар субсидия ва грант режасининг асоси.',
      ustunlar: [
        { sarlavha: 'Имконият' },
        { sarlavha: 'Хонадон', raqamli: true, eni: 26 },
        { sarlavha: 'Улуши', raqamli: true, eni: 22 },
      ],
      qatorlar: [
        { nomi: 'Томорқаси бор', qiymatlar: [son(tomorqaBor), foiz(foizi(tomorqaBor, jamiXonadon))] },
        { nomi: 'Чорва ёки парранда боқади', qiymatlar: [son(chorvaBor), foiz(foizi(chorvaBor, jamiXonadon))] },
        { nomi: 'Ҳунармандчилик билан шуғулланади', qiymatlar: [son(hunarmandBor), foiz(foizi(hunarmandBor, jamiXonadon))] },
        { nomi: 'Иссиқхона қурмоқчи', qiymatlar: [son(issiqxona), foiz(foizi(issiqxona, jamiXonadon))] },
        { nomi: 'Ижарага ер олган', qiymatlar: [son(ijaraYer), foiz(foizi(ijaraYer, jamiXonadon))] },
      ].filter((q) => q.qiymatlar[0] !== '0'),
    });

    const chorva = sanoqJadvali(
      'Чорва турлари',
      'Чорва боқадиган хонадонлар кесимида. Бир хонадон бир нечта турни белгилаши мумкин.',
      'Тур',
      chorvaTurlari,
      chorvaBor
    );
    if (chorva) jadvallar.push(chorva);

    const hunar = sanoqJadvali(
      'Ҳунармандчилик йўналишлари',
      'Бир хил ҳунар билан шуғулланадиган 10-15 хонадон бўлса — кооператив ёки умумий устахона масаласини кўриш мумкин.',
      'Йўналиш',
      hunarTurlari,
      hunarmandBor
    );
    if (hunar) jadvallar.push(hunar);

    /*
     * ── ЕРДАН ҚАНДАЙ ФОЙДАЛАНИЛЯПТИ ──
     *
     * Майдон сони ЕТМАЙДИ: ўша 10 сотих тўлиқ экилган ҳам,
     * йиллаб ташлаб қўйилган ҳам бўлиши мумкин. Иккисига
     * бошқа-бошқа чора керак — биринчисига уруғ, кўчат ва
     * бозор, иккинчисига аввал сабабини аниқлаш (сув йўқ,
     * қўл етмайди, эгаси чет элда).
     */
    const foydalanish = sanoqJadvali(
      'Томорқадан фойдаланиш даражаси',
      'Улуш томорқаси бор хонадонлардан ҳисобланган. «Ёмон» деб белгиланган ҳар бир хонадон — аниқ манзил: ер бор, ҳосил йўқ.',
      'Даража',
      tomorqaFoydalanish,
      tomorqaBor
    );
    if (foydalanish) jadvallar.unshift(foydalanish);

    bolimlar.push({
      kalit: 'yer',
      sarlavha: 'Ер, чорва ва ҳунармандчилик',
      varaqNomi: 'Ер, чорва, ҳунар',
      kirish:
        'Ишга жойлаштириш имконияти чекланган маҳаллада даромад манбаи шу ердан чиқади: томорқа, чорва ва ҳунар.',
      korsatkichlar: [
        ...(ekin > 0 ? [{ nomi: 'Жами экин майдони', qiymat: sotix(ekin), izoh: 'хатловдан ўтган хонадонларда' } as const] : []),
        { nomi: 'Чорва боқадиган хонадон', qiymat: son(chorvaBor), yonalish: 'kop-yaxshi' },
        /*
         * БОШ СОНИ — субсидия ва ем-хашак режасининг асоси.
         * «Чорваси бор: 143 хонадон» деган рақамдан режа
         * чиқмайди: 2 та товуқ ҳам, 40 та қорамол ҳам шу
         * рақамга киради.
         */
        ...(yirik > 0
          ? [{ nomi: 'Йирик шохли — жами', qiymat: `${son(yirik)} бош` } as const]
          : []),
        ...(mayda > 0
          ? [{ nomi: 'Майда шохли — жами', qiymat: `${son(mayda)} бош` } as const]
          : []),
        ...(parranda > 0
          ? [{ nomi: 'Парранда — жами', qiymat: `${son(parranda)} бош` } as const]
          : []),
        ...(qoshimchaYerXonadon > 0
          ? [
              {
                nomi: 'Қўшимча ер олган хонадон',
                qiymat: son(qoshimchaYerXonadon),
                izoh: `жами ${sotix(qoshimchaYer._sum.qoshimchaYerMaydoni ?? 0)}`,
                yonalish: 'kop-yaxshi',
              } as const,
            ]
          : []),
        { nomi: 'Ҳунарманд хонадон', qiymat: son(hunarmandBor), yonalish: 'kop-yaxshi' },
        { nomi: 'Иссиқхона талабгори', qiymat: son(issiqxona), yonalish: 'kop-yaxshi' },
      ],
      jadvallar,
      diagrammalar: hunarTurlari.length
        ? [
            {
              turi: 'gorizontal',
              sarlavha: 'Ҳунармандчилик йўналишлари — хонадон сони',
              nomlar: hunarTurlari.map((x) => x.nomi),
              qatorlar: [{ nomi: 'Хонадон', qiymatlar: hunarTurlari.map((x) => x.soni) }],
            },
          ]
        : undefined,
    });
  }

  /* ── Anketa hujjatining sifati ────────────────────────────── */
  /*
   * Бу бўлим МАЪЛУМОТ ҳақида эмас, ҲУЖЖАТ ҳақида.
   *
   * Имзосиз анкета юридик кучга эга эмас: унга таянган
   * чора-тадбир эътирозга учраши мумкин ва хонадон «мен бундай
   * демадим» дейиши мумкин. Шунинг учун ҳоким бу рақамни
   * йиғилишда кўриши керак — нуқсон бор бўлса, уни ҳали
   * тузатиш мумкин, хатлов тугагач эса йўқ.
   *
   * Ҳаммаси жойида бўлса ҳам бўлим чиқади: «100%» — бу ҳам
   * хабар, ва уни кўрсатмаслик текширилмаган деган маънони
   * беради.
   */
  bolimlar.push({
    kalit: 'sifat',
    sarlavha: 'Хатлов ҳужжатининг сифати',
    varaqNomi: 'Ҳужжат сифати',
    kirish:
      'Имзосиз ёки розиликсиз анкета юридик кучга эга эмас. Нуқсон хатлов давом этаётганда тузатилади — тугагач, хонадонга қайта бориш керак бўлади.',
    korsatkichlar: [
      {
        nomi: 'Розилик берган',
        qiymat: son(rozilikBerdi),
        izoh: `${son(jamiXonadon)} тадан · ${foiz(foizi(rozilikBerdi, jamiXonadon))}`,
        yonalish: 'kop-yaxshi',
        foiz: foizi(rozilikBerdi, jamiXonadon),
      },
      {
        nomi: 'Имзо қўйилган',
        qiymat: son(imzoBor),
        izoh: `${son(jamiXonadon)} тадан · ${foiz(foizi(imzoBor, jamiXonadon))}`,
        yonalish: 'kop-yaxshi',
        foiz: foizi(imzoBor, jamiXonadon),
      },
    ],
    jadvallar: [
      {
        sarlavha: 'Анкета реквизитлари',
        ustunlar: [
          { sarlavha: 'Реквизит' },
          { sarlavha: 'Хонадон', raqamli: true, eni: 26 },
          { sarlavha: 'Улуши', raqamli: true, eni: 24 },
        ],
        qatorlar: [
          { nomi: 'Розилик берилган', qiymatlar: [son(rozilikBerdi), foiz(foizi(rozilikBerdi, jamiXonadon))] },
          { nomi: 'Имзо қўйилган', qiymatlar: [son(imzoBor), foiz(foizi(imzoBor, jamiXonadon))] },
          {
            nomi: 'Имзоси йўқ — тузатиш керак',
            qiymatlar: [son(jamiXonadon - imzoBor), foiz(foizi(jamiXonadon - imzoBor, jamiXonadon))],
          },
        ],
      },
    ],
  });

  return bolimlar;
}
