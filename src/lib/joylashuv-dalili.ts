import type {
  DalilHolati,
  DalilManbasi,
  DalilMaqsadi,
  DalilTuri,
  Prisma,
} from '@prisma/client';
import { prisma } from './prisma';
import {
  manbaTuriTaxmin,
  ozidanTasdiqmi,
  tasdiqDarajasi,
  tasdiqSanaladimi,
} from './dalil-ishonchi';
import { type TasdiqDarajasi } from './dalil-nomlari';
import { SABAB_ENG_KAM } from './arxiv';
import { JOYLASHGAN, KUN_MS } from './bandlik-holatlari';
import { DALIL_HOLATI_NOMI, DALIL_KUCHI, DALIL_NOMI } from './dalil-nomlari';

/**
 * ============================================================
 *  ЖОЙЛАШТИРИШНИНГ ДАЛИЛИ
 *
 *  ── Муаммо ──
 *
 *  «Ишга жойлаштирилди» — ҳозирча битта босиш. Ходим тугмани
 *  босади, туман рақами биттага ошади, ва ҳеч ким
 *  текширмайди.
 *
 *  Ҳоким эса ўша рақамни юқорига ҳисобот қилиб беради. Агар
 *  рақам нотўғри бўлса, у ТУМАН даражасида нотўғри бўлади —
 *  ва бу нотўғрилик бир неча ой сақланиб туради, чунки уни
 *  ушлайдиган механизм йўқ.
 *
 *  ── Ечим: ИККИТА рақам ──
 *
 *  Тизим энди биттасини эмас, иккитасини кўрсатади:
 *
 *      19 та жойлаштирилди
 *       7 таси ДАЛИЛ билан тасдиқланган
 *
 *  Бу «ёлғон гапирма» деган ўгит эмас, ЎЛЧОВ. Иккинчи рақам
 *  биринчисидан кескин ортда қолса, савол ўзи туғилади ва
 *  уни ҳеч ким бекитиб қўя олмайди.
 *
 *  ── Нега далил турлари ажратилган ──
 *
 *  Давлат реестридаги ёзув билан «маҳалла ходими кўрди» деган
 *  ёзув ИККИ ХИЛ нарса: биринчисини мустақил текшириб
 *  бўлади, иккинчисига фақат ишониш мумкин.
 *
 *  Иккови ҳам ҳисобга олинади, аммо реестр алоҳида
 *  саналади — «энг ишончли далил нечтасида бор» деган савол
 *  ҳам ўринли.
 * ============================================================
 */

/**
 * Жойлаштирилгандан кейин неча кун ичида далил келиши керак.
 *
 * Ўттиз кун. Меҳнат шартномаси одатда биринчи ҳафтада
 * расмийлаштирилади, реестрга эса кейинги ойда тушади.
 * Ўттиз кун иккови учун ҳам етарли ва «эсдан чиқди» деган
 * узрни қолдирмайди.
 */
export const DALIL_MUDDATI_KUN = 30;

/*
 * Номлар ва куч даражаси `dalil-nomlari` да — улар ЭКРАНДА
 * кўринади, яъни браузердаги компонентга керак. Бу файл эса
 * базага уланади ва браузер тўпламига тушмаслиги керак.
 *
 * Шу ердан ҳам чиқарилади: сервер томони иккита импорт
 * ёзиб ўтирмасин.
 */
export { DALIL_HOLATI_NOMI, DALIL_KUCHI, DALIL_NOMI };

/** Фуқаро жойлаштирилган ҳисобланадими */
export const JOYLASHGAN_FILTRI: Prisma.UnemployedPersonWhereInput = {
  holati: { in: [...JOYLASHGAN] },
};

export interface OdamTasdigi {
  /**
   * Тасдиқланган далил борми.
   *
   * ДИҚҚАТ: бу «одамда ҚАЧОНДИР тасдиқланган далил бўлган»
   * дегани — ҲОЗИРГИ иши тасдиқланган дегани ЭМАС. Ҳозирги
   * иш учун `joriyIshTasdiqlangan` га қаралади.
   */
  tasdiqlangan: boolean;
  /** Энг кучли тасдиқланган далил тури */
  engKuchli: DalilTuri | null;
  /** Умуман далил борми (текширилмагани ҳам) */
  dalilBor: boolean;
  /** Муддат ўтиб кетганми */
  muddatiOtgan: boolean;
  /** Қачонгача далил келиши керак эди */
  muddat: Date | null;

  /**
   * ── ҲОЗИРГИ ИШ тасдиқланганми ──
   *
   * Далил энди ИШГА боғланади. Одам иш алмаштирса, эски
   * ишнинг тасдиқланган шартномаси ЯНГИ ишни тасдиқламайди.
   *
   * Аввал бу савол умуман сўралмасди ва жавоб ҳар доим
   * «ҳа» эди.
   */
  joriyIshTasdiqlangan: boolean;
  /** Фуқаронинг очиқ иши бор бўлса — унинг белгиси */
  joriyIshId: string | null;
  /**
   * Тасдиқланган далил бор-у, ҲЕЧ ҚАЙСИ ишга боғланмаган.
   *
   * `joylashishId` устуни қўшилгунга қадар киритилган барча
   * далил шундай. Улар ёлғон эмас — қайси ишга тегишли
   * экани ёзилмаган, холос. Тахмин қилиб боғламаймиз.
   */
  bogliqsizTasdiq: boolean;
  /** Экранда кўринадиган БИТТА сўз */
  daraja: TasdiqDarajasi;
  /** Ҳисобда «тасдиқланган» бўлиб саналадими */
  sanaladi: boolean;
}

/**
 * Битта фуқаронинг тасдиқ ҳолати.
 *
 * Муддат ИШГА КИРГАН САНАдан ҳисобланади. Сана бўлмаса,
 * ёзувнинг сўнгги ўзгариш санаси олинади — ҳеч бўлмаганда
 * шу ҳолатга ўтган пайт.
 */
export async function odamTasdigi(ishsizId: string): Promise<OdamTasdigi> {
  const [odam, dalillar, joriyIsh] = await Promise.all([
    prisma.unemployedPerson.findUnique({
      where: { id: ishsizId },
      select: { holati: true, ishgaKirganSana: true, updatedAt: true },
    }),
    prisma.joylashuvDalili.findMany({
      where: { ishsizId },
      select: { turi: true, holati: true, manbaTuri: true, joylashishId: true },
    }),
    prisma.ishgaJoylashish.findFirst({
      where: { ishsizId, tugaganSana: null },
      orderBy: { boshlanganSana: 'desc' },
      select: { id: true },
    }),
  ]);

  if (!odam) {
    return {
      tasdiqlangan: false,
      engKuchli: null,
      dalilBor: false,
      muddatiOtgan: false,
      muddat: null,
      joriyIshTasdiqlangan: false,
      joriyIshId: null,
      bogliqsizTasdiq: false,
      daraja: 'DALILSIZ',
      sanaladi: false,
    };
  }

  const tasdiqlar = dalillar.filter((d) => d.holati === 'TASDIQLANDI');

  /*
   * ── ҲОЗИРГИ ИШНИНГ ЎЗ ДАЛИЛИ ──
   *
   * Фақат ШУ ишга боғланган далиллар саналади. Боғланмаган
   * далил (`joylashishId` бўш) ҳисобга КИРМАЙДИ: у эски
   * ишга тегишли бўлиши ҳам мумкин.
   */
  const joriyDalillar = joriyIsh
    ? dalillar.filter((d) => d.joylashishId === joriyIsh.id)
    : [];
  const joriyIshTasdiqlangan = joriyDalillar.some((d) => d.holati === 'TASDIQLANDI');
  const bogliqsizTasdiq = tasdiqlar.some((d) => d.joylashishId === null);

  /*
   * Даража ҲОЗИРГИ иш бўйича ҳисобланади — иш бор бўлса.
   * Иш воқеаси ҳали ёзилмаган бўлса (эски ёзувлар), одамнинг
   * барча далили олинади: акс ҳолда ҳамма «далилсиз» бўлиб
   * кўринар ва ҳисобот бирдан нолга тушарди.
   */
  const darajaUchun = joriyIsh ? joriyDalillar : dalillar;
  const daraja = tasdiqDarajasi(
    darajaUchun.map((d) => ({ turi: d.turi, holati: d.holati, manbaTuri: d.manbaTuri }))
  );
  const engKuchli =
    tasdiqlar.length > 0
      ? tasdiqlar.reduce((a, b) => (DALIL_KUCHI[b.turi] > DALIL_KUCHI[a.turi] ? b : a)).turi
      : null;

  const boshlanish = odam.ishgaKirganSana ?? odam.updatedAt;
  const muddat = new Date(boshlanish.getTime() + DALIL_MUDDATI_KUN * KUN_MS);

  /*
   * Жойлашмаган одамда муддат ҳам йўқ: у ҳали бу босқичга
   * етмаган, кечиккани ҳақида гапириш маъносиз.
   */
  const joylashgan = (JOYLASHGAN as readonly string[]).includes(odam.holati);

  return {
    tasdiqlangan: tasdiqlar.length > 0,
    engKuchli,
    dalilBor: dalillar.length > 0,
    /*
     * ── МУДДАТ ҲАМ ҲОЗИРГИ ИШ БЎЙИЧА ──
     *
     * Аввал шарт `tasdiqlar.length === 0` эди — яъни ЭСКИ
     * ишнинг тасдиқланган шартномаси муддатни ҳам ёпиб
     * қўярди.
     *
     * Оқибати: иш алмаштирган одам «муддати ўтган» рўйхатига
     * УМУМАН тушмасди ва янги иши абадий ҳужжатсиз
     * қолаверарди.
     *
     * `sanaladi` — ҳозирги ишнинг даражасидан келади (воқеа
     * ёзилмаган бўлса, одамнинг барча далилидан).
     */
    muddatiOtgan: joylashgan && !tasdiqSanaladimi(daraja) && muddat.getTime() < Date.now(),
    muddat: joylashgan ? muddat : null,
    joriyIshTasdiqlangan,
    joriyIshId: joriyIsh?.id ?? null,
    bogliqsizTasdiq,
    daraja,
    sanaladi: tasdiqSanaladimi(daraja),
  };
}

export interface TasdiqHisobi {
  /** Тизим «жойлаштирилди» деб турган сон */
  davoQilingan: number;
  /** Шундан далил билан тасдиқлангани */
  tasdiqlangan: number;
  /** Шундан давлат реестри билан тасдиқлангани */
  reyestrBilan: number;
  /** Умуман далили йўқлари */
  dalilsiz: number;
  /** Далил муддати ўтиб кетганлар */
  muddatiOtgan: number;
  /** Тасдиқланганлар улуши, % */
  tasdiqFoizi: number;

  /**
   * ════════════════════════════════════════════════════════
   *  ТАСДИҚНИНГ ТАРКИБИ
   *
   *  ── Нега битта рақам камлик қилди ──
   *
   *  «19 тадан 7 таси тасдиқланган» деган гап ҳокимга
   *  етарли эмас, чунки ўша 7 тасининг ичида ИККИ ХИЛ
   *  нарса бор:
   *
   *    · расмий, текширилган канал орқали келгани;
   *    · администратор қўлда юклаган файлдан келгани.
   *
   *  Иккови бир хил кўринса, «тасдиқланган» сўзи маъносини
   *  йўқотади. Энди улар АЛОҲИДА саналади.
   * ════════════════════════════════════════════════════════
   */

  /** Расмий интеграция орқали тасдиқлангани */
  rasmiyTasdiq: number;
  /** Қўлда текширилиб тасдиқлангани */
  qoldaTasdiq: number;
  /** Ҳужжат киритилган, мутахассис ҳали қарамаган */
  tekshiruvKutayotgan: number;
  /** Фақат ходим «иш топди» деб белгилаган */
  faqatXodim: number;
  /** Далил текширилиб РАД ЭТИЛГАН — «далил йўқ» дан ёмонроқ */
  radEtilgan: number;

  /**
   * ── ҲОЗИРГИ ИШИ тасдиқланганлар ──
   *
   * Далил ИШГА боғланган ҳолда саналади. Бу рақам
   * `tasdiqlangan` дан КАМ бўлиши табиий: эски далиллар
   * ҳали ҳеч қайси ишга боғланмаган.
   */
  joriyIshTasdiqlangan: number;
  /**
   * Тасдиқланган далили бор-у, ҳеч қайси ишга боғланмаган.
   *
   * Бу «боғлаш керак» деган иш рўйхати, нуқсон эмас.
   */
  bogliqsizTasdiq: number;
  /** Иш воқеаси умуман ёзилмаганлар — воқеа жадвали янги */
  voqeasizlar: number;
}

/**
 * Туман ёки битта МФЙ кесимида тасдиқ ҳисоби.
 *
 * ── Нега бир нечта сўров ──
 *
 * «Далили бор» деган шартни битта `count` да ёзиб бўлмайди:
 * далил бошқа жадвалда ва биттада бир нечтаси бўлиши мумкин.
 * Шунинг учун аввал жойлашганларнинг рўйхати олинади, кейин
 * уларнинг далиллари.
 *
 * Рўйхат чекланган: туман бўйича ҳам бу бир неча юз ёзув,
 * минглаб эмас.
 */
export async function tasdiqHisobi(mahallaId?: string): Promise<TasdiqHisobi> {
  const qayer: Prisma.UnemployedPersonWhereInput = {
    ...JOYLASHGAN_FILTRI,
    ...(mahallaId ? { mahallaId } : {}),
  };

  const joylashganlar = await prisma.unemployedPerson.findMany({
    where: qayer,
    select: { id: true, ishgaKirganSana: true, updatedAt: true },
  });

  const davoQilingan = joylashganlar.length;
  if (davoQilingan === 0) return BOSH_HISOB;

  const kimlar = joylashganlar.map((j) => j.id);

  /*
   * Учинчи сўров — очиқ иш воқеалари.
   *
   * Уларсиз «ҳозирги иши тасдиқланган» саволига жавоб
   * бўлмайди: далилда `joylashishId` бор, аммо у ҚАЙСИ
   * воқеа — очиғи ёки ёпилгани — шу ердан билинади.
   */
  const [dalillar, ochiqIshlar] = await Promise.all([
    prisma.joylashuvDalili.findMany({
      where: { ishsizId: { in: kimlar } },
      select: { ishsizId: true, turi: true, holati: true, manbaTuri: true, joylashishId: true },
    }),
    prisma.ishgaJoylashish.findMany({
      where: { ishsizId: { in: kimlar }, tugaganSana: null },
      orderBy: { boshlanganSana: 'desc' },
      select: { id: true, ishsizId: true },
    }),
  ]);

  /* Ҳар одамнинг ЭНГ ЯНГИ очиқ иши */
  const joriyIsh = new Map<string, string>();
  for (const i of ochiqIshlar) if (!joriyIsh.has(i.ishsizId)) joriyIsh.set(i.ishsizId, i.id);

  const odamlar = new Map<string, typeof dalillar>();
  for (const d of dalillar) {
    const ro = odamlar.get(d.ishsizId);
    if (ro) ro.push(d);
    else odamlar.set(d.ishsizId, [d]);
  }

  const tasdiqli = new Set<string>();
  /** Ҳозирги иши бўйича «тасдиқланган» деб саналадиганлар */
  const sanaladiganlar = new Set<string>();
  const reyestrli = new Set<string>();
  let rasmiyTasdiq = 0;
  let qoldaTasdiq = 0;
  let tekshiruvKutayotgan = 0;
  let faqatXodim = 0;
  let radEtilgan = 0;
  let joriyIshTasdiqlangan = 0;
  let bogliqsizTasdiq = 0;

  for (const j of joylashganlar) {
    const oz = odamlar.get(j.id) ?? [];
    for (const d of oz) {
      if (d.holati !== 'TASDIQLANDI') continue;
      tasdiqli.add(j.id);
      if (d.turi === 'REYESTR') reyestrli.add(j.id);
    }

    const ish = joriyIsh.get(j.id);
    const joriy = ish ? oz.filter((d) => d.joylashishId === ish) : [];
    if (joriy.some((d) => d.holati === 'TASDIQLANDI')) joriyIshTasdiqlangan += 1;
    if (oz.some((d) => d.holati === 'TASDIQLANDI' && d.joylashishId === null)) {
      bogliqsizTasdiq += 1;
    }

    /*
     * Даража ҲОЗИРГИ иш бўйича; воқеа ёзилмаган бўлса
     * одамнинг барча далили бўйича. Шунда эски ёзувлар
     * бирдан «далилсиз» бўлиб кўринмайди.
     */
    const daraja = tasdiqDarajasi(
      (ish ? joriy : oz).map((d) => ({ turi: d.turi, holati: d.holati, manbaTuri: d.manbaTuri }))
    );
    if (tasdiqSanaladimi(daraja)) sanaladiganlar.add(j.id);
    if (daraja === 'RASMIY') rasmiyTasdiq += 1;
    else if (daraja === 'QOLDA_TASDIQ') qoldaTasdiq += 1;
    else if (daraja === 'KUTILMOQDA') tekshiruvKutayotgan += 1;
    else if (daraja === 'FAQAT_XODIM') faqatXodim += 1;
    else if (daraja === 'RAD_ETILGAN') radEtilgan += 1;
  }

  /*
   * Муддат ҲОЗИРГИ иш бўйича. Аввал `tasdiqli` тўпламига
   * қаралар эди — эски ишнинг тасдиғи муддатни ҳам ёпиб
   * қўярди ва иш алмаштирган одам рўйхатдан чиқиб кетарди.
   */
  const hozir = Date.now();
  let muddatiOtgan = 0;
  for (const j of joylashganlar) {
    if (sanaladiganlar.has(j.id)) continue;
    const boshlanish = j.ishgaKirganSana ?? j.updatedAt;
    if (boshlanish.getTime() + DALIL_MUDDATI_KUN * KUN_MS < hozir) muddatiOtgan += 1;
  }

  return {
    davoQilingan,
    tasdiqlangan: tasdiqli.size,
    reyestrBilan: reyestrli.size,
    dalilsiz: davoQilingan - odamlar.size,
    muddatiOtgan,
    tasdiqFoizi: Math.round((tasdiqli.size / davoQilingan) * 1000) / 10,
    rasmiyTasdiq,
    qoldaTasdiq,
    tekshiruvKutayotgan,
    faqatXodim,
    radEtilgan,
    joriyIshTasdiqlangan,
    bogliqsizTasdiq,
    voqeasizlar: davoQilingan - joriyIsh.size,
  };
}

/** Ҳеч ким жойлашмаган ҳол — битта жойда, такрорсиз */
const BOSH_HISOB: TasdiqHisobi = {
  davoQilingan: 0,
  tasdiqlangan: 0,
  reyestrBilan: 0,
  dalilsiz: 0,
  muddatiOtgan: 0,
  tasdiqFoizi: 0,
  rasmiyTasdiq: 0,
  qoldaTasdiq: 0,
  tekshiruvKutayotgan: 0,
  faqatXodim: 0,
  radEtilgan: 0,
  joriyIshTasdiqlangan: 0,
  bogliqsizTasdiq: 0,
  voqeasizlar: 0,
};

/**
 * Муддати ўтган-у, ҳали тасдиқланмаганлар рўйхати.
 *
 * Бандлик маркази учун иш рўйхати: буларнинг ҳар бирига
 * далил топиш керак ёки ҳолатни орқага қайтариш керак.
 */
export async function tasdiqsizlar(
  mahallaId?: string,
  soni = 50
): Promise<
  {
    id: string;
    fish: string;
    mahallaNomi: string;
    ishJoyi: string | null;
    kun: number;
    /** НЕГА рўйхатда — ходимга ҳар хил қарор керак */
    sabab: 'dalil-yoq' | 'tekshirilmagan' | 'rad-etilgan' | 'ish-almashdi';
  }[]
> {
  const chegara = new Date(Date.now() - DALIL_MUDDATI_KUN * KUN_MS);

  /*
   * ── БАЗАДАГИ ФИЛЬТР ОЛИБ ТАШЛАНДИ ──
   *
   * Аввал шундай эди:
   *
   *     dalillar: { none: { holati: 'TASDIQLANDI' } }
   *
   * Яъни «тасдиқланган далили бўлмаганлар». Далил эса
   * ОДАМГА боғланганди — демак иш алмаштирган одам
   * рўйхатдан БУТУНЛАЙ чиқиб кетарди:
   *
   *   2024: Оқ Олтин — шартнома ТАСДИҚЛАНДИ
   *   2025: Янги Йўл — ҳужжат йўқ
   *
   * Эски тасдиқ туфайли у «ҳужжати бор» ҳисобланар ва
   * янги иши АБАДИЙ ҳужжатсиз қолаверарди. Худди шу
   * рўйхат бўшлиқни ёпиши керак эди-ю, ўзи бўшлиқ ясаб
   * турарди.
   *
   * Энди шарт КОДДА текширилади, ҳозирги иш бўйича. Туман
   * бўйича жойлашганлар бир неча юз ёзув — минглаб эмас.
   */
  const joylashganlar = await prisma.unemployedPerson.findMany({
    where: {
      ...JOYLASHGAN_FILTRI,
      ...(mahallaId ? { mahallaId } : {}),
    },
    select: {
      id: true,
      fish: true,
      ishJoyi: true,
      ishgaKirganSana: true,
      updatedAt: true,
      mahalla: { select: { nomiKirill: true } },
      dalillar: { select: { turi: true, holati: true, manbaTuri: true, joylashishId: true } },
      joylashishlar: {
        where: { tugaganSana: null },
        orderBy: { boshlanganSana: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
    orderBy: { updatedAt: 'asc' },
  });

  const hozir = Date.now();

  return joylashganlar
    .map((j) => {
      const joriyIsh = j.joylashishlar[0]?.id ?? null;
      const joriy = joriyIsh
        ? j.dalillar.filter((d) => d.joylashishId === joriyIsh)
        : j.dalillar;
      const daraja = tasdiqDarajasi(
        joriy.map((d) => ({ turi: d.turi, holati: d.holati, manbaTuri: d.manbaTuri }))
      );
      const boshlanish = j.ishgaKirganSana ?? j.updatedAt;

      /*
       * САБАБ — ходимга ҳар хил қарор керак:
       *
       *   · `ish-almashdi`   → эски далил бор, янгисига йўқ;
       *   · `rad-etilgan`    → ҳужжат ёлғон чиққан, энг оғири;
       *   · `tekshirilmagan` → ҳужжат келган, қараш керак;
       *   · `dalil-yoq`      → ҳеч нарса киритилмаган.
       */
      const sabab: 'dalil-yoq' | 'tekshirilmagan' | 'rad-etilgan' | 'ish-almashdi' =
        daraja === 'RAD_ETILGAN'
          ? 'rad-etilgan'
          : daraja === 'KUTILMOQDA'
            ? 'tekshirilmagan'
            : joriyIsh && j.dalillar.some((d) => d.holati === 'TASDIQLANDI')
              ? 'ish-almashdi'
              : 'dalil-yoq';

      return {
        id: j.id,
        fish: j.fish,
        mahallaNomi: j.mahalla.nomiKirill,
        ishJoyi: j.ishJoyi,
        boshlanish,
        sanaladi: tasdiqSanaladimi(daraja),
        sabab,
        kun: Math.floor((hozir - boshlanish.getTime()) / KUN_MS),
      };
    })
    .filter((j) => !j.sanaladi && j.boshlanish < chegara)
    .slice(0, soni)
    .map(({ boshlanish: _b, sanaladi: _s, ...q }) => q);
}

/**
 * ============================================================
 *  ДАЛИЛ ҚЎШИШ
 *
 *  ── Нега `tasdiqlangan` параметри ОЛИБ ТАШЛАНДИ ──
 *
 *  Аввал имзо шундай эди:
 *
 *      dalilQoshish({ turi: 'REYESTR', tasdiqlangan: true })
 *
 *  Яъни ТАСДИҚЛАШ ҚАРОРИНИ чақирувчи код берарди. Реестр
 *  юклаш йўли ҳар доим `true` юборарди — қўлда юкланган
 *  Excel файлдан келган ёзув дарҳол «тасдиқланган» бўлиб
 *  сақланарди.
 *
 *  Битта чақирув жойида хато қилинса, ҳокимликнинг энг
 *  муҳим рақами бузилар эди. Шунинг учун бу параметр БУТУНЛАЙ
 *  йўқ: қарор МАНБАдан келиб чиқади ва битта жойда —
 *  `dalil-ishonchi.ts` да — ёзилган.
 *
 *  Чақирувчи энди ЁЛҒОН ГАПИРА ОЛМАЙДИ: у фақат далил
 *  қаердан келганини айтади.
 * ============================================================
 */
export async function dalilQoshish(p: {
  ishsizId: string;
  turi: DalilTuri;
  /**
   * Далил ҚАЕРДАН келган. Ёзилмаса, туридан ЭҲТИЁТКОР
   * тахмин қилинади — «расмий» деб ҳеч қачон тахмин
   * қилинмайди.
   */
  manbaTuri?: DalilManbasi;
  /** Қайси ишга тегишли. Бўш бўлса «боғланиши керак» рўйхатига тушади */
  joylashishId?: string | null;
  /** Далил НИМАНИ исботлайди */
  maqsadi?: DalilMaqsadi;
  /** Ҳужжатни берган ташкилот */
  manbaTashkilot?: string | null;
  /** Ҳужжатнинг ЎЗИДАГИ сана — киритилган сана эмас */
  hujjatSanasi?: Date | null;
  /** Далил қамраган давр */
  davrBoshi?: Date | null;
  davrOxiri?: Date | null;
  /** Қайси юклашдан келган */
  importId?: string | null;
  /** Файлнинг SHA-256 изи */
  faylIzi?: string | null;
  izoh?: string | null;
  reyestrIshJoyi?: string | null;
  reyestrSanasi?: Date | null;
  kiritganId?: string | null;
}): Promise<{ id: string; holati: DalilHolati; manbaTuri: DalilManbasi }> {
  const manba = p.manbaTuri ?? manbaTuriTaxmin(p.turi);
  const ozidan = ozidanTasdiqmi(manba);

  const yozuv = await prisma.joylashuvDalili.create({
    data: {
      ishsizId: p.ishsizId,
      turi: p.turi,
      manbaTuri: manba,
      maqsadi: p.maqsadi ?? 'ISH_BOSHLAGANI',
      joylashishId: p.joylashishId ?? null,
      manbaTashkilot: p.manbaTashkilot ?? null,
      hujjatSanasi: p.hujjatSanasi ?? null,
      davrBoshi: p.davrBoshi ?? null,
      davrOxiri: p.davrOxiri ?? null,
      importId: p.importId ?? null,
      faylIzi: p.faylIzi ?? null,
      holati: ozidan ? 'TASDIQLANDI' : 'KIRITILDI',
      izoh: p.izoh ?? null,
      reyestrIshJoyi: p.reyestrIshJoyi ?? null,
      reyestrSanasi: p.reyestrSanasi ?? null,
      kiritganId: p.kiritganId ?? null,
      /*
       * ЎЗИДАН тасдиқланганда «ким тасдиқлади» БЎШ қолади:
       * ҳеч ким тасдиқламаган, интеграция келтирган. Аввал
       * бу ерга киритган одамнинг номи ёзиларди — журналда
       * у файлни ТЕКШИРГАН бўлиб кўринарди.
       */
      tasdiqlaganId: null,
      tasdiqlanganSana: ozidan ? new Date() : null,
    },
    select: { id: true, holati: true, manbaTuri: true },
  });

  return yozuv;
}

/** Мутахассис далилни текширди */
export async function dalilniHalQil(p: {
  dalilId: string;
  userId: string;
  tasdiqlandi: boolean;
  izoh?: string | null;
  /** So'rov manzili (sayt yo'li beradi) - audit yozuviga tushadi */
  ip?: string | null;
}): Promise<{
  ok: boolean;
  sabab?: 'topilmadi' | 'allaqachon';
  hozirgiHolati?: string;
  halQilgan?: string | null;
}> {
  const bor = await prisma.joylashuvDalili.findUnique({
    where: { id: p.dalilId },
    select: { id: true, joylashishId: true, maqsadi: true, davrOxiri: true },
  });
  if (!bor) return { ok: false, sabab: 'topilmadi' };

  /*
   * ── АТОМАР ЎТИШ ──
   *
   * Аввал бу ерда ҳолат УМУМАН текширилмасди: далил
   * аллақачон тасдиқланган бўлса ҳам, кейинги босиш уни
   * жимгина рад этилганга айлантирарди — ва журналда
   * биринчи қарорнинг изи қолмасди.
   *
   * Иккита мутахассис бир вақтда очиб турган бўлса, бу
   * тасодифан ҳам содир бўларди: навбат рўйхати иккаласида
   * ҳам очиқ.
   *
   * Энди фақат ТЕКШИРИЛМАГАН (`KIRITILDI`) далил ҳал
   * қилинади. Қарорни ЎЗГАРТИРИШ — алоҳида амал
   * (`dalilQaroriniOzgartir`), у сабаб талаб қилади.
   */
  /*
   * Қарор ва аудит — БИТТА транзакцияда: аудит ФАҚАТ қарор ўтганда ва
   * шу транзакция ичида ёзилади (хато бўлса иккови ҳам ўтмайди).
   * Воқеа ҳолатини янгилаш қасддан ПАСТДА ва алоҳида қолган: қарор
   * йўқолмаслиги керак (изоҳ пастда).
   */
  const natija = await prisma.$transaction(async (tx) => {
    const r = await tx.joylashuvDalili.updateMany({
      where: { id: p.dalilId, holati: 'KIRITILDI' },
      data: {
        holati: p.tasdiqlandi ? 'TASDIQLANDI' : 'RAD_ETILDI',
        tasdiqlaganId: p.userId,
        tasdiqlanganSana: new Date(),
        ...(p.izoh !== undefined ? { izoh: p.izoh } : {}),
      },
    });
    if (r.count === 1) {
      await tx.auditLog.create({
        data: {
          userId: p.userId,
          amal: 'OZGARTIRISH',
          obyektTuri: 'JoylashuvDalili',
          obyektId: p.dalilId,
          izoh: p.tasdiqlandi ? 'Далил тасдиқланди' : 'Далил рад этилди',
          ip: p.ip ?? null,
        },
      });
    }
    return r;
  });

  if (natija.count === 0) {
    const hozir = await prisma.joylashuvDalili.findUnique({
      where: { id: p.dalilId },
      select: { holati: true, tasdiqlagan: { select: { fullName: true } } },
    });
    return {
      ok: false,
      sabab: 'allaqachon',
      hozirgiHolati: hozir?.holati,
      halQilgan: hozir?.tasdiqlagan?.fullName ?? null,
    };
  }

  /*
   * ── «ҲАМОН ИШЛАЯПТИ» ДАЛИЛИ ВОҚЕАНИ ЯНГИЛАЙДИ ──
   *
   * Воқеанинг ҳолати яратилганда `NOMALUM` бўлади: «ишга
   * кирди» деган ёзув «ҳозир ҳам ишлаяпти» деган маънони
   * бермайди.
   *
   * Мақсади `HOZIR_ISHLAYOTGANI` бўлган далил тасдиқланса,
   * бу савол ЖАВОБ ОЛДИ — воқеа `ISHLAMOQDA` бўлади ва
   * текширув санаси ёзилади.
   *
   * «Барқарор бандлик» кўрсаткичи шу ердан ҳисобланади:
   * аввал уни умуман ҳисоблаб бўлмасди.
   */
  if (
    p.tasdiqlandi &&
    bor.joylashishId &&
    bor.maqsadi === 'HOZIR_ISHLAYOTGANI'
  ) {
    try {
      await prisma.ishgaJoylashish.update({
        where: { id: bor.joylashishId },
        data: {
          holati: 'ISHLAMOQDA',
          /*
           * Текширув санаси — далил ҚАМРАГАН даврнинг охири,
           * бугун эмас. Ўтган ойнинг маълумоти бугунги ҳолат
           * деб ёзилса, рақам ҳақиқатдан илгарилаб кетарди.
           */
          oxirgiTekshiruv: bor.davrOxiri ?? new Date(),
        },
      });
    } catch (e) {
      /*
       * Далилнинг қарори аллақачон сақланди — у
       * ЙЎҚОЛМАСЛИГИ керак. Воқеа ҳолати эса кейинги
       * далилда ёки қўлда тузатилади.
       */
      console.error('joylashish holatini yangilab bolmadi', e);
    }
  }

  return { ok: true };
}

/**
 * ҚАРОРНИ ЎЗГАРТИРИШ — алоҳида амал, алоҳида ҳуқуқ.
 *
 * ── Нега оддий «яна ҳал қилиш» эмас ──
 *
 * Тасдиқланган далилни жимгина рад этилганга айлантириш
 * ҳокимликнинг энг муҳим рақамини — «тасдиқланган
 * жойлаштириш» сонини — изсиз ўзгартириш деган сўз.
 *
 * Шунинг учун бу йўл:
 *   · САБАБ талаб қилади;
 *   · олдинги қарорни ва уни ким берганини изоҳга ёзиб
 *     қўяди, яъни тарих йўқолмайди;
 *   · фақат ваколатли ходимга очиқ (йўлда текширилади).
 */
export async function dalilQaroriniOzgartir(p: {
  dalilId: string;
  userId: string;
  tasdiqlandi: boolean;
  sabab: string;
}): Promise<{ ok: boolean; sabab?: 'topilmadi' | 'sababsiz' | 'ozgarmadi' }> {
  if (!p.sabab || p.sabab.trim().length < SABAB_ENG_KAM) {
    return { ok: false, sabab: 'sababsiz' };
  }

  const bor = await prisma.joylashuvDalili.findUnique({
    where: { id: p.dalilId },
    select: {
      id: true,
      holati: true,
      izoh: true,
      tasdiqlagan: { select: { fullName: true } },
      tasdiqlanganSana: true,
    },
  });
  if (!bor) return { ok: false, sabab: 'topilmadi' };

  const yangiHolat = p.tasdiqlandi ? 'TASDIQLANDI' : 'RAD_ETILDI';
  if (bor.holati === yangiHolat) return { ok: false, sabab: 'ozgarmadi' };

  /*
   * Олдинги қарор изоҳга ёзилади. Алоҳида «қарорлар
   * тарихи» жадвали тўғрироқ бўларди, аммо ҳозир хатлов
   * кетмоқда ва янги жадвал қўшиш ўрнига мавжуд майдондан
   * фойдаланамиз — маълумот ЙЎҚОЛМАСЛИГИ асосийси.
   */
  const tarix = [
    bor.izoh?.trim(),
    `[${new Date().toISOString().slice(0, 10)}] Олдинги қарор: ${bor.holati}` +
      (bor.tasdiqlagan?.fullName ? ` (${bor.tasdiqlagan.fullName})` : '') +
      `. Ўзгартириш сабаби: ${p.sabab.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');

  const natija = await prisma.joylashuvDalili.updateMany({
    where: { id: p.dalilId, holati: bor.holati },
    data: {
      holati: yangiHolat,
      tasdiqlaganId: p.userId,
      tasdiqlanganSana: new Date(),
      izoh: tarix.slice(0, 2000),
    },
  });

  return natija.count === 1 ? { ok: true } : { ok: false, sabab: 'ozgarmadi' };
}

/**
 * Киритилган-у, ҳали текширилмаган ҳужжатлар.
 *
 * ── Нега алоҳида рўйхат керак ──
 *
 * Маҳалла ходими шартнома нусхасини киритади ва у
 * «текширилмаган» бўлиб туради. Мутахассис уни ФАҚАТ ўша
 * фуқаронинг саҳифасини очганда кўради — яъни тасодифан.
 *
 * Ҳужжат келган-у, ҳеч ким қарамаган ҳолат энг ачинарлиси:
 * иш бажарилган, рақам эса ҳамон «тасдиқланмаган» бўлиб
 * турибди.
 */
export async function tekshirishKutayotganlar(soni = 50): Promise<
  {
    dalilId: string;
    ishsizId: string;
    fish: string;
    mahallaNomi: string;
    turi: DalilTuri;
    izoh: string | null;
    kiritganNomi: string | null;
    kiritganId: string | null;
    createdAt: Date;
  }[]
> {
  const dalillar = await prisma.joylashuvDalili.findMany({
    where: { holati: 'KIRITILDI' },
    orderBy: { createdAt: 'asc' },
    take: soni,
    select: {
      id: true,
      turi: true,
      izoh: true,
      createdAt: true,
      kiritganId: true,
      kiritgan: { select: { fullName: true } },
      ishsiz: {
        select: { id: true, fish: true, mahalla: { select: { nomiKirill: true } } },
      },
    },
  });

  return dalillar.map((d) => ({
    dalilId: d.id,
    ishsizId: d.ishsiz.id,
    fish: d.ishsiz.fish,
    mahallaNomi: d.ishsiz.mahalla.nomiKirill,
    turi: d.turi,
    izoh: d.izoh,
    kiritganNomi: d.kiritgan?.fullName ?? null,
    kiritganId: d.kiritganId,
    createdAt: d.createdAt,
  }));
}
