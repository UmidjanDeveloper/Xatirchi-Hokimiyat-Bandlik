import { Prisma } from '@prisma/client';
import { xomPrisma } from './prisma';

/**
 * ============================================================
 *  ХАТЛОВ БЎЛИМЛАРИ БЎЙИЧА ТАҲЛИЛ
 *
 *  ── Нега керак бўлди ──
 *
 *  Панел то шу кунгача битта саволга жавоб берарди: «ишсизлик
 *  камаяптими». Бу тўғри савол, аммо ягона савол эмас. Хатлов
 *  ўн икки бўлимдан иборат ва ҳар бир бўлим ўн мингларча
 *  катакни тўлдиради — болаларнинг ёши, чет элдаги оила аъзоси,
 *  боғча қамрови, ичимлик суви, томорқа, чорва, ҳужжат.
 *
 *  Ўша катаклар базага тушарди ва ЎША ЕРДА ҚОЛАРДИ. Ҳоким
 *  «туманда неча ёшгача бола бор» деб сўраса, жавоб йўқ эди —
 *  гарчи жавоб базада бўлса ҳам. Ходим уч ойдан бери тўлдирган
 *  маълумот ҳеч қандай қарорга таъсир қилмаётган эди.
 *
 *  Бу модул ўша бўшлиқни тўлдиради: хатловнинг ҲАР БИР бўлими
 *  панелда ўз рақами билан туради.
 *
 *  ── Нега хом SQL ──
 *
 *  Ҳисоб қирқдан ортиқ устун бўйича юритилади. Уч йўл бор эди:
 *
 *    1. Барча хонадонни `findMany` билан олиб, JS да санаш.
 *       40 000 хонадон × 50 устун — ўн мегабайтдан ортиқ
 *       маълумот Supabase дан Vercel га кўчади. Панел ҳозир
 *       ҳам секин, бу уни ўлдирарди.
 *    2. Ҳар кўрсаткичга алоҳида `count`. Қирқ сўров × 463 мс
 *       = ўн саккиз сония.
 *    3. Битта SQL: базанинг ўзи санайди, тармоқдан битта қатор
 *       ўтади.
 *
 *  Учинчиси танланди. Нархи — Prisma моделига эмас, УСТУН
 *  НОМИГА боғланиш. Шунинг учун `scripts/bolimlar-sinov.ts`
 *  ҳар бир устунни схема билан солиштиради: схемада ном
 *  ўзгарса, сўров жим қолиб нол қайтармайди — синов йиқилади.
 *
 *  ── АРХИВ ФИЛЬТРИ ҚЎЛДА ЁЗИЛГАН ──
 *
 *  `prisma` мижозидаги кенгайтма (`$extends`) ўчирилган
 *  хонадонларни ўзи яшириб беради, аммо у ФАҚАТ Prisma
 *  методларига таъсир қилади — `$queryRaw` ундан ўтмайди.
 *  Шунинг учун бу ерда `xomPrisma` ишлатилади ва шарт
 *  `ASOSIY_SHART` да БИТТА ЖОЙДА ёзилган. Уни ўзгартирсангиз —
 *  ўчирилган хонадон ҳокимнинг рақамига қайтиб киради.
 * ============================================================
 */

/** Бир гуруҳ ичидаги вариант ва унинг сони */
export interface UlushQatori {
  qiymat: string;
  soni: number;
}

export interface BolimlarTahlili {
  /**
   * Барча фоизнинг МАХРАЖИ: хатловдан ўтган хонадон сони.
   *
   * Базадаги 40 377 эмас, айнан ХАТЛОВДАН ЎТГАНИ. «Туманда
   * 1 200 та болали оила» деган рақам, агар 1 500 та хонадон
   * хатловдан ўтган бўлса, бутунлай бошқа маънога эга.
   */
  xonadon: number;

  /** 0-бўлим — хонадон ва оила таркиби */
  oila: {
    jamiAzo: number;
    bolalarSoni: number;
    bolalar0_3: number;
    bolalar3_17: number;
    bolalar18Dan: number;
    ayolBoshliq: number;
    /** Ўртача оила ҳажми — бир кассрли */
    ortachaHajm: number;
  };

  /** I бўлим — меҳнат ва бандлик */
  mehnat: {
    layoqatli: number;
    layoqatsiz: number;
    ishlaydigan: number;
    davlatda: number;
    xususiyda: number;
    ishsiz: number;
    bogchaKutayotgan: number;
    kasbIstagi: number;
  };

  /** II бўлим — тадбиркорлик ва молия */
  tadbirkorlik: {
    istagi: number;
    moliyaEhtiyoji: number;
    issiqxonaTalabi: number;
    issiqxonaMaydoni: number;
    ijaraYer: number;
    ijaraYerMaydoni: number;
    sohalar: UlushQatori[];
    moliyaTuri: UlushQatori[];
  };

  /** II-Б бўлим — чет элдаги меҳнат ва пул ўтказмаси */
  chetEl: {
    /** Чет элда аъзоси бор оила */
    oila: number;
    /** Чет элдаги одам сони */
    ishchi: number;
    /** Ойига кирадиган пул — сўмга келтирилган */
    oylikSom: number;
    /** Шундан нечта оила суммани айтган (айтмаганлар ҳам бор) */
    pulliOila: number;
    davlatlar: UlushQatori[];
    /**
     * Қайси шаҳарларда — «давлат|шаҳар» қийматидан.
     *
     * Давлат кесими етарли эмас: «Россияда 340 киши» деган
     * рақамдан чора чиқмайди, «Москвада 120, Сургутда 45»
     * эса чиқади. Консуллик, меҳнат миграцияси агентлиги ва
     * диаспора билан иш айнан ШАҲАР даражасида юритилади.
     */
    shaharlar: UlushQatori[];
  };

  /** III бўлим — даромад ва камбағаллик сабаблари */
  daromad: {
    /** Ойлик даромади кўрсатилган оила */
    oila: number;
    /** Ўша оилаларнинг жами ойлик даромади */
    jami: number;
    /** Ўртача — фақат кўрсатганлар бўйича */
    ortacha: number;
    manbalar: UlushQatori[];
    sabablar: UlushQatori[];
    /**
     * «Даромадни кўпайтириш имкониятлари» — ЭРКИН МАТН.
     *
     * Уни вариантга бўлиб бўлмайди, шунинг учун фақат нечта
     * оила ёзгани саналади: ўша матнлар алоҳида ҳисоботда
     * ўқилади, панелда эса «нечта оиланинг ўз таклифи бор»
     * деган рақам керак.
     */
    imkoniyatYozgan: number;
  };

  /** IV бўлим — болалар таълими */
  talim: {
    maktabgachaYoshdagi: number;
    maktabgachaQamrovda: number;
    maktabYoshdagi: number;
    maktabQamrovda: number;
    togarakQamrovi: number;
  };

  /** V бўлим — соғлиқ */
  soglik: {
    uzoqDavolanish: number;
    doriKerak: number;
    tibbiyKerak: number;
    /** Охирги тиббий кўрик санасини ёзган оила (эркин матн) */
    korikYozgan: number;
  };

  /** VI бўлим — уй-жой ва коммунал */
  uyJoy: {
    holati: UlushQatori[];
    ichimlikSuvi: UlushQatori[];
    gazTuri: UlushQatori[];
    /** ЙЎҚ деб белгиланганлар — муаммо шу ерда */
    elektrYoq: number;
    gazYoq: number;
    kanalizatsiyaYoq: number;
    sugorishYoq: number;
  };

  /** VII бўлим — ижтимоий ҳимоя */
  ijtimoiy: {
    nogironOila: number;
    nogironShaxs: number;
    yolgizKeksaOila: number;
    yolgizKeksaShaxs: number;
    parvarishOila: number;
    parvarishShaxs: number;
  };

  /** VIII бўлим — ҳужжатлаштириш */
  hujjat: {
    notoliq: number;
  };

  /** IX бўлим — ер, чорва ва ҳунармандчилик */
  yer: {
    tomorqaOila: number;
    ekinMaydoni: number;
    qoshimchaYerOila: number;
    qoshimchaYerMaydoni: number;
    foydalanish: UlushQatori[];
    chorvaOila: number;
    yirikShoxli: number;
    maydaShoxli: number;
    parranda: number;
    chorvaTurlari: UlushQatori[];
    hunarmandOila: number;
    hunarTurlari: UlushQatori[];
  };

  /** X бўлим — қўшимча даромад воситаси */
  qoshimchaDaromad: {
    istagi: number;
    turlari: UlushQatori[];
  };

  /** XI бўлим — маҳалла инфратузилмаси */
  infratuzilma: {
    muammolar: UlushQatori[];
  };

  /** XII бўлим — розилик ва имзо */
  rozilik: {
    berdi: number;
    imzoBor: number;
  };
}

/*
 * ────────────────────────────────────────────────────────────
 *  АСОСИЙ ШАРТ
 *
 *  Учта қоида, битта жойда:
 *    · ўчирилган (архивланган) хонадон ҳисобга кирмайди;
 *    · қоралама кирмайди — у ҳали тугалланмаган анкета ва
 *      ярим тўлдирилган катаги рақамни бузади;
 *    · маҳалла фильтри — ходим фақат ўзиникини кўради.
 * ────────────────────────────────────────────────────────────
 */
function asosiyShart(mahallaId?: string): Prisma.Sql {
  return Prisma.sql`
    "arxivSanasi" IS NULL
    AND "holati" <> 'QORALAMA'
    ${mahallaId ? Prisma.sql`AND "mahallaId" = ${mahallaId}` : Prisma.empty}
  `;
}

/** JSON массивдаги элемент сони — массив бўлмаса нол */
function jsonUzunlik(ustun: string): Prisma.Sql {
  return Prisma.raw(`
    CASE WHEN jsonb_typeof("${ustun}") = 'array'
         THEN jsonb_array_length("${ustun}") ELSE 0 END
  `);
}

/** Хом SQL дан келган қиймат — `null` ҳам, `bigint` ҳам бўлиши мумкин */
type Xom = number | bigint | string | null;

const n = (x: Xom): number => (x == null ? 0 : Number(x));

/** Бир кассрли яхлитлаш */
const bir = (x: number): number => Math.round(x * 10) / 10;

/**
 * ── ҚИСҚА КЕШ ──
 *
 * `tahlil.ts` даги билан бир хил муддат ва бир хил сабаб:
 * Vercel сервери билан Supabase базаси ҳар хил минтақада ва
 * битта сўров 463 мс кетади. Панел — таҳлил экрани, ундаги
 * рақамлар секундига ўзгармайди.
 *
 * Иккита кеш атайин АЛОҲИДА: бири бандлик занжири, иккинчиси
 * оила ҳаёти ҳақида. Улар турли пайтда эскиради ва бирини
 * тозалаш иккинчисини тозаламаслиги керак.
 */
const KESH_MUDDATI_MS = 45 * 1000;

const kesh = new Map<string, { vaqti: number; natija: BolimlarTahlili }>();

export async function bolimlarTahlili(mahallaId?: string): Promise<BolimlarTahlili> {
  const kalit = mahallaId ?? 'tuman';
  const saqlangan = kesh.get(kalit);
  if (saqlangan && Date.now() - saqlangan.vaqti < KESH_MUDDATI_MS) {
    return saqlangan.natija;
  }

  const natija = await bolimlarniHisobla(mahallaId);
  kesh.set(kalit, { vaqti: Date.now(), natija });

  /* Калитлар кўп эмас: 70 маҳалла + туман. Эскилари ётиб қолмасин */
  if (kesh.size > 100) {
    const chegara = Date.now() - KESH_MUDDATI_MS;
    for (const [k, v] of kesh) if (v.vaqti < chegara) kesh.delete(k);
  }

  return natija;
}

async function bolimlarniHisobla(mahallaId?: string): Promise<BolimlarTahlili> {
  const shart = asosiyShart(mahallaId);

  const [raqamlar, guruhlar] = await Promise.all([
    xomPrisma.$queryRaw<Record<string, Xom>[]>`
      SELECT
        COUNT(*)::int                                   AS "xonadon",

        SUM("jamiAzo")::int                             AS "jamiAzo",
        SUM("bolalarSoni")::int                         AS "bolalarSoni",
        SUM("bolalar0_3Yosh")::int                      AS "bolalar0_3",
        SUM("bolalar3_17Yosh")::int                     AS "bolalar3_17",
        SUM("bolalar18Yoshdan")::int                    AS "bolalar18Dan",
        COUNT(*) FILTER (WHERE "oilaBoshligiJinsi" = 'Ayol')::int AS "ayolBoshliq",

        SUM("mehnatgaLayoqatli")::int                   AS "layoqatli",
        SUM("mehnatgaLayoqatsiz")::int                  AS "layoqatsiz",
        SUM("ishlaydiganlar")::int                      AS "ishlaydigan",
        SUM("davlatKorxonada")::int                     AS "davlatda",
        SUM("xususiySektorda")::int                     AS "xususiyda",
        SUM("ishsizlarSoni")::int                       AS "ishsiz",
        SUM("bogchaKutayotganAyollar")::int             AS "bogchaKutayotgan",
        COUNT(*) FILTER (WHERE "kasbHunarIstagi")::int  AS "kasbIstagi",

        COUNT(*) FILTER (WHERE "tadbirkorlikIstagi")::int AS "tadbirkorIstagi",
        COUNT(*) FILTER (WHERE "moliyaEhtiyoji")::int      AS "moliyaEhtiyoji",
        COUNT(*) FILTER (WHERE "issiqxonaTalabi")::int     AS "issiqxonaTalabi",
        COALESCE(SUM("issiqxonaMaydoni"), 0)::float8       AS "issiqxonaMaydoni",
        COUNT(*) FILTER (WHERE "ijaraYer")::int            AS "ijaraYer",
        COALESCE(SUM("ijaraYerMaydoni"), 0)::float8        AS "ijaraYerMaydoni",

        COUNT(*) FILTER (WHERE "chetElMehnati")::int     AS "chetElOila",
        SUM("chetElIshchilar")::int                      AS "chetElIshchi",
        COALESCE(SUM("chetElOylikPulSom"), 0)::float8    AS "chetElOylikSom",
        COUNT(*) FILTER (WHERE "chetElOylikPulSom" > 0)::int AS "chetElPulliOila",

        COUNT(*) FILTER (WHERE "oylikDaromad" IS NOT NULL)::int AS "daromadOila",
        COALESCE(SUM("oylikDaromad"), 0)::float8         AS "daromadJami",

        SUM("maktabgachaYoshdagi")::int                  AS "maktabgachaYoshdagi",
        SUM("maktabgachaQamrovda")::int                  AS "maktabgachaQamrovda",
        SUM("maktabYoshdagi")::int                       AS "maktabYoshdagi",
        SUM("maktabQamrovda")::int                       AS "maktabQamrovda",
        SUM("togarakQamrovi")::int                       AS "togarakQamrovi",

        COUNT(*) FILTER (WHERE "uzoqDavolanish")::int    AS "uzoqDavolanish",
        COUNT(*) FILTER (WHERE COALESCE("doriEhtiyoji", '') <> '')::int         AS "doriKerak",
        COUNT(*) FILTER (WHERE COALESCE("tibbiyXizmatEhtiyoji", '') <> '')::int AS "tibbiyKerak",
        COUNT(*) FILTER (WHERE COALESCE("oxirgiTibbiyKorik", '') <> '')::int      AS "korikYozgan",
        COUNT(*) FILTER (WHERE COALESCE("daromadImkoniyati", '') <> '')::int      AS "imkoniyatYozgan",

        COUNT(*) FILTER (WHERE NOT "elektr")::int        AS "elektrYoq",
        COUNT(*) FILTER (WHERE NOT "gaz")::int           AS "gazYoq",
        COUNT(*) FILTER (WHERE NOT "kanalizatsiya")::int AS "kanalizatsiyaYoq",
        COUNT(*) FILTER (WHERE NOT "sugorishSuvi")::int  AS "sugorishYoq",

        COUNT(*) FILTER (WHERE "nogironlikBor")::int     AS "nogironOila",
        SUM(${jsonUzunlik('nogironShaxslar')})::int      AS "nogironShaxs",
        COUNT(*) FILTER (WHERE "yolgizKeksa")::int       AS "yolgizKeksaOila",
        SUM(${jsonUzunlik('yolgizKeksaShaxslar')})::int  AS "yolgizKeksaShaxs",
        COUNT(*) FILTER (WHERE "parvarishgaMuhtoj")::int AS "parvarishOila",
        SUM(${jsonUzunlik('parvarishShaxslar')})::int    AS "parvarishShaxs",

        COUNT(*) FILTER (WHERE NOT "hujjatlarToliq")::int AS "hujjatNotoliq",

        COUNT(*) FILTER (WHERE "tomorqaBor")::int        AS "tomorqaOila",
        COALESCE(SUM("ekinMaydoni"), 0)::float8          AS "ekinMaydoni",
        COUNT(*) FILTER (WHERE "qoshimchaYerBor")::int   AS "qoshimchaYerOila",
        COALESCE(SUM("qoshimchaYerMaydoni"), 0)::float8  AS "qoshimchaYerMaydoni",
        COUNT(*) FILTER (WHERE "chorvaBor")::int         AS "chorvaOila",
        COALESCE(SUM("yirikShoxliSoni"), 0)::int         AS "yirikShoxli",
        COALESCE(SUM("maydaShoxliSoni"), 0)::int         AS "maydaShoxli",
        COALESCE(SUM("parrandaSoni"), 0)::int            AS "parranda",
        COUNT(*) FILTER (WHERE "hunarmandBor")::int      AS "hunarmandOila",

        COUNT(*) FILTER (WHERE "passivDaromadIstagi")::int AS "passivIstagi",

        COUNT(*) FILTER (WHERE "rozilikBerdi")::int      AS "rozilikBerdi",
        COUNT(*) FILTER (WHERE COALESCE("imzoYoli", '') <> '')::int AS "imzoBor"
      FROM "Household"
      WHERE ${shart}
    `,

    /*
     * Вариантли саволлар — битта сўровда.
     *
     * `MATERIALIZED` атайин ёзилган: CTE ўн саккиз марта
     * ишлатилади ва усиз Postgres уни ҳар сафар қайта
     * ҳисоблаши мумкин эди.
     */
    xomPrisma.$queryRaw<{ guruh: string; qiymat: string; soni: Xom }[]>`
      WITH x AS MATERIALIZED (
        SELECT
          "uyHolati", "ichimlikSuvi", "gazTuri", "tomorqaFoydalanish",
          "daromadManbalari", "kambagallikSabablari", "infratuzilmaMuammolari",
          "passivDaromadTurlari", "chorvaTurlari", "hunarTurlari",
          "tadbirkorlikSohasi", "moliyaTuri", "chetElDavlatlari",
          "chetElShaharlari",
          /*
           * ── ДАРВОЗА УСТУНЛАРИ ──
           *
           * Тагсавол фақат асосий савол «Ҳа» бўлганда
           * саналади. Нега кераклиги панелда кўринди:
           * «Қандай молиявий ёрдам керак — Имтиёзли кредит:
           * 18, 138,5%» деб турарди. Маҳраж 13 та (эҳтиёжи
           * бор оила), сони эса 18 та эди — чунки хонадон
           * таҳрир қилинганда «эҳтиёжи йўқ» деб белгиланган,
           * аммо аввалги жавоби массивда қолиб кетган.
           *
           * Юздан ошган фоиз — ҳокимга «санашни билмайди»
           * деган хабар. Шунинг учун тагжавоб дарвоза билан
           * бирга ўқилади.
           */
          "moliyaEhtiyoji", "tadbirkorlikIstagi", "chetElMehnati",
          "tomorqaBor", "chorvaBor", "hunarmandBor",
          "passivDaromadIstagi", "gaz"
        FROM "Household"
        WHERE ${shart}
      )
      SELECT 'uyHolati' AS guruh, "uyHolati" AS qiymat, COUNT(*)::int AS soni
        FROM x WHERE "uyHolati" IS NOT NULL GROUP BY 2
      UNION ALL SELECT 'ichimlikSuvi', "ichimlikSuvi", COUNT(*)::int
        FROM x WHERE "ichimlikSuvi" IS NOT NULL GROUP BY 2
      UNION ALL SELECT 'gazTuri', "gazTuri", COUNT(*)::int
        FROM x WHERE "gaz" AND "gazTuri" IS NOT NULL GROUP BY 2
      UNION ALL SELECT 'foydalanish', "tomorqaFoydalanish", COUNT(*)::int
        FROM x WHERE "tomorqaBor" AND "tomorqaFoydalanish" IS NOT NULL GROUP BY 2
      UNION ALL SELECT 'manbalar', t, COUNT(*)::int
        FROM x, unnest("daromadManbalari") AS t GROUP BY 2
      UNION ALL SELECT 'sabablar', t, COUNT(*)::int
        FROM x, unnest("kambagallikSabablari") AS t GROUP BY 2
      UNION ALL SELECT 'infratuzilma', t, COUNT(*)::int
        FROM x, unnest("infratuzilmaMuammolari") AS t GROUP BY 2
      UNION ALL SELECT 'passiv', t, COUNT(*)::int
        FROM x, unnest("passivDaromadTurlari") AS t WHERE "passivDaromadIstagi" GROUP BY 2
      UNION ALL SELECT 'chorva', t, COUNT(*)::int
        FROM x, unnest("chorvaTurlari") AS t WHERE "chorvaBor" GROUP BY 2
      UNION ALL SELECT 'hunar', t, COUNT(*)::int
        FROM x, unnest("hunarTurlari") AS t WHERE "hunarmandBor" GROUP BY 2
      UNION ALL SELECT 'sohalar', t, COUNT(*)::int
        FROM x, unnest("tadbirkorlikSohasi") AS t WHERE "tadbirkorlikIstagi" GROUP BY 2
      UNION ALL SELECT 'moliyaTuri', t, COUNT(*)::int
        FROM x, unnest("moliyaTuri") AS t WHERE "moliyaEhtiyoji" GROUP BY 2
      UNION ALL SELECT 'davlatlar', t, COUNT(*)::int
        FROM x, unnest("chetElDavlatlari") AS t WHERE "chetElMehnati" GROUP BY 2
      UNION ALL SELECT 'shaharlar', t, COUNT(*)::int
        FROM x, unnest("chetElShaharlari") AS t WHERE "chetElMehnati" GROUP BY 2
    `,
  ]);

  const r = raqamlar[0] ?? {};

  /* Гуруҳларни ажратиш: катталикдан кичикка */
  const g = (nomi: string): UlushQatori[] =>
    guruhlar
      .filter((q) => q.guruh === nomi && q.qiymat)
      .map((q) => ({ qiymat: q.qiymat, soni: n(q.soni) }))
      .sort((a, b) => b.soni - a.soni);

  const xonadon = n(r.xonadon);
  const daromadOila = n(r.daromadOila);
  const daromadJami = n(r.daromadJami);

  return {
    xonadon,

    oila: {
      jamiAzo: n(r.jamiAzo),
      bolalarSoni: n(r.bolalarSoni),
      bolalar0_3: n(r.bolalar0_3),
      bolalar3_17: n(r.bolalar3_17),
      bolalar18Dan: n(r.bolalar18Dan),
      ayolBoshliq: n(r.ayolBoshliq),
      ortachaHajm: xonadon > 0 ? bir(n(r.jamiAzo) / xonadon) : 0,
    },

    mehnat: {
      layoqatli: n(r.layoqatli),
      layoqatsiz: n(r.layoqatsiz),
      ishlaydigan: n(r.ishlaydigan),
      davlatda: n(r.davlatda),
      xususiyda: n(r.xususiyda),
      ishsiz: n(r.ishsiz),
      bogchaKutayotgan: n(r.bogchaKutayotgan),
      kasbIstagi: n(r.kasbIstagi),
    },

    tadbirkorlik: {
      istagi: n(r.tadbirkorIstagi),
      moliyaEhtiyoji: n(r.moliyaEhtiyoji),
      issiqxonaTalabi: n(r.issiqxonaTalabi),
      issiqxonaMaydoni: bir(n(r.issiqxonaMaydoni)),
      ijaraYer: n(r.ijaraYer),
      ijaraYerMaydoni: bir(n(r.ijaraYerMaydoni)),
      sohalar: g('sohalar'),
      moliyaTuri: g('moliyaTuri'),
    },

    chetEl: {
      oila: n(r.chetElOila),
      ishchi: n(r.chetElIshchi),
      oylikSom: Math.round(n(r.chetElOylikSom)),
      pulliOila: n(r.chetElPulliOila),
      davlatlar: g('davlatlar'),
      shaharlar: g('shaharlar'),
    },

    daromad: {
      oila: daromadOila,
      jami: Math.round(daromadJami),
      ortacha: daromadOila > 0 ? Math.round(daromadJami / daromadOila) : 0,
      manbalar: g('manbalar'),
      sabablar: g('sabablar'),
      imkoniyatYozgan: n(r.imkoniyatYozgan),
    },

    talim: {
      maktabgachaYoshdagi: n(r.maktabgachaYoshdagi),
      maktabgachaQamrovda: n(r.maktabgachaQamrovda),
      maktabYoshdagi: n(r.maktabYoshdagi),
      maktabQamrovda: n(r.maktabQamrovda),
      togarakQamrovi: n(r.togarakQamrovi),
    },

    soglik: {
      uzoqDavolanish: n(r.uzoqDavolanish),
      doriKerak: n(r.doriKerak),
      tibbiyKerak: n(r.tibbiyKerak),
      korikYozgan: n(r.korikYozgan),
    },

    uyJoy: {
      holati: g('uyHolati'),
      ichimlikSuvi: g('ichimlikSuvi'),
      gazTuri: g('gazTuri'),
      elektrYoq: n(r.elektrYoq),
      gazYoq: n(r.gazYoq),
      kanalizatsiyaYoq: n(r.kanalizatsiyaYoq),
      sugorishYoq: n(r.sugorishYoq),
    },

    ijtimoiy: {
      nogironOila: n(r.nogironOila),
      nogironShaxs: n(r.nogironShaxs),
      yolgizKeksaOila: n(r.yolgizKeksaOila),
      yolgizKeksaShaxs: n(r.yolgizKeksaShaxs),
      parvarishOila: n(r.parvarishOila),
      parvarishShaxs: n(r.parvarishShaxs),
    },

    hujjat: { notoliq: n(r.hujjatNotoliq) },

    yer: {
      tomorqaOila: n(r.tomorqaOila),
      ekinMaydoni: bir(n(r.ekinMaydoni)),
      qoshimchaYerOila: n(r.qoshimchaYerOila),
      qoshimchaYerMaydoni: bir(n(r.qoshimchaYerMaydoni)),
      foydalanish: g('foydalanish'),
      chorvaOila: n(r.chorvaOila),
      yirikShoxli: n(r.yirikShoxli),
      maydaShoxli: n(r.maydaShoxli),
      parranda: n(r.parranda),
      chorvaTurlari: g('chorva'),
      hunarmandOila: n(r.hunarmandOila),
      hunarTurlari: g('hunar'),
    },

    qoshimchaDaromad: {
      istagi: n(r.passivIstagi),
      turlari: g('passiv'),
    },

    infratuzilma: { muammolar: g('infratuzilma') },

    rozilik: { berdi: n(r.rozilikBerdi), imzoBor: n(r.imzoBor) },
  };
}
