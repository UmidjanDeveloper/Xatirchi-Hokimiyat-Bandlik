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
  CHORVA_TURI,
  DAROMAD_MANBAI,
  GAZ_TURI,
  HUNAR_TURI,
  ICHIMLIK_SUVI,
  KAMBAGALLIK_SABABI,
  MABLAG_YONALISHI,
  MOLIYA_TURI,
  UY_HOLATI,
} from '@/lib/constants';
import type { Bolim, Jadval, Qator } from './turlar';
import { foiz, foizi, maydon, pul, raqamga, son } from './format';

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
  maydonNomi: 'uyHolati' | 'ichimlikSuvi' | 'gazTuri',
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
  ]);

  const bolimlar: Bolim[] = [];

  /* ── Oila tarkibi va mehnat salohiyati ────────────────────── */
  const jamiAzo = jamlar._sum.jamiAzo ?? 0;
  const layoqatli = mehnat._sum.mehnatgaLayoqatli ?? 0;
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
      'Хатловдан ўтган хонадонлардаги меҳнат салоҳияти. «Меҳнатга лаёқатли» — 16 ёшдан нафақа ёшига қадар бўлган оила аъзолари.',
    korsatkichlar: [
      { nomi: 'Хонадондаги аҳоли', qiymat: son(jamiAzo), izoh: `ўртача ${String(Math.round((jamlar._avg.jamiAzo ?? 0) * 10) / 10).replace('.', ',')} киши` },
      { nomi: 'Меҳнатга лаёқатли', qiymat: son(layoqatli), izoh: `аҳолининг ${foiz(foizi(layoqatli, jamiAzo))}и` },
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

    bolimlar.push({
      kalit: 'yer',
      sarlavha: 'Ер, чорва ва ҳунармандчилик',
      varaqNomi: 'Ер, чорва, ҳунар',
      kirish:
        'Ишга жойлаштириш имконияти чекланган маҳаллада даромад манбаи шу ердан чиқади: томорқа, чорва ва ҳунар.',
      korsatkichlar: [
        ...(ekin > 0 ? [{ nomi: 'Жами экин майдони', qiymat: maydon(ekin), izoh: 'хатловдан ўтган хонадонларда' } as const] : []),
        { nomi: 'Чорва боқадиган хонадон', qiymat: son(chorvaBor), yonalish: 'kop-yaxshi' },
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

  return bolimlar;
}
