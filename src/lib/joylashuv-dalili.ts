import type { DalilTuri, Prisma } from '@prisma/client';
import { prisma } from './prisma';
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
  /** Тасдиқланган далил борми */
  tasdiqlangan: boolean;
  /** Энг кучли тасдиқланган далил тури */
  engKuchli: DalilTuri | null;
  /** Умуман далил борми (текширилмагани ҳам) */
  dalilBor: boolean;
  /** Муддат ўтиб кетганми */
  muddatiOtgan: boolean;
  /** Қачонгача далил келиши керак эди */
  muddat: Date | null;
}

/**
 * Битта фуқаронинг тасдиқ ҳолати.
 *
 * Муддат ИШГА КИРГАН САНАдан ҳисобланади. Сана бўлмаса,
 * ёзувнинг сўнгги ўзгариш санаси олинади — ҳеч бўлмаганда
 * шу ҳолатга ўтган пайт.
 */
export async function odamTasdigi(ishsizId: string): Promise<OdamTasdigi> {
  const [odam, dalillar] = await Promise.all([
    prisma.unemployedPerson.findUnique({
      where: { id: ishsizId },
      select: { holati: true, ishgaKirganSana: true, updatedAt: true },
    }),
    prisma.joylashuvDalili.findMany({
      where: { ishsizId },
      select: { turi: true, holati: true },
    }),
  ]);

  if (!odam) {
    return { tasdiqlangan: false, engKuchli: null, dalilBor: false, muddatiOtgan: false, muddat: null };
  }

  const tasdiqlar = dalillar.filter((d) => d.holati === 'TASDIQLANDI');
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
    muddatiOtgan: joylashgan && tasdiqlar.length === 0 && muddat.getTime() < Date.now(),
    muddat: joylashgan ? muddat : null,
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
  if (davoQilingan === 0) {
    return {
      davoQilingan: 0,
      tasdiqlangan: 0,
      reyestrBilan: 0,
      dalilsiz: 0,
      muddatiOtgan: 0,
      tasdiqFoizi: 0,
    };
  }

  const dalillar = await prisma.joylashuvDalili.findMany({
    where: { ishsizId: { in: joylashganlar.map((j) => j.id) } },
    select: { ishsizId: true, turi: true, holati: true },
  });

  const tasdiqli = new Set<string>();
  const reyestrli = new Set<string>();
  const dalilli = new Set<string>();

  for (const d of dalillar) {
    dalilli.add(d.ishsizId);
    if (d.holati !== 'TASDIQLANDI') continue;
    tasdiqli.add(d.ishsizId);
    if (d.turi === 'REYESTR') reyestrli.add(d.ishsizId);
  }

  const hozir = Date.now();
  let muddatiOtgan = 0;
  for (const j of joylashganlar) {
    if (tasdiqli.has(j.id)) continue;
    const boshlanish = j.ishgaKirganSana ?? j.updatedAt;
    if (boshlanish.getTime() + DALIL_MUDDATI_KUN * KUN_MS < hozir) muddatiOtgan += 1;
  }

  return {
    davoQilingan,
    tasdiqlangan: tasdiqli.size,
    reyestrBilan: reyestrli.size,
    dalilsiz: davoQilingan - dalilli.size,
    muddatiOtgan,
    tasdiqFoizi: Math.round((tasdiqli.size / davoQilingan) * 1000) / 10,
  };
}

/**
 * Муддати ўтган-у, ҳали тасдиқланмаганлар рўйхати.
 *
 * Бандлик маркази учун иш рўйхати: буларнинг ҳар бирига
 * далил топиш керак ёки ҳолатни орқага қайтариш керак.
 */
export async function tasdiqsizlar(
  mahallaId?: string,
  soni = 50
): Promise<{ id: string; fish: string; mahallaNomi: string; ishJoyi: string | null; kun: number }[]> {
  const chegara = new Date(Date.now() - DALIL_MUDDATI_KUN * KUN_MS);

  const joylashganlar = await prisma.unemployedPerson.findMany({
    where: {
      ...JOYLASHGAN_FILTRI,
      ...(mahallaId ? { mahallaId } : {}),
      /*
       * Далили УМУМАН йўқ ёки борлари текширилмаган.
       * `none` шарти иккаласини ҳам қамрайди: тасдиқланган
       * далили бўлмаганлар.
       */
      dalillar: { none: { holati: 'TASDIQLANDI' } },
    },
    select: {
      id: true,
      fish: true,
      ishJoyi: true,
      ishgaKirganSana: true,
      updatedAt: true,
      mahalla: { select: { nomiKirill: true } },
    },
    orderBy: { updatedAt: 'asc' },
    take: soni * 3,
  });

  const hozir = Date.now();

  return joylashganlar
    .map((j) => {
      const boshlanish = j.ishgaKirganSana ?? j.updatedAt;
      return {
        id: j.id,
        fish: j.fish,
        mahallaNomi: j.mahalla.nomiKirill,
        ishJoyi: j.ishJoyi,
        boshlanish,
        kun: Math.floor((hozir - boshlanish.getTime()) / KUN_MS),
      };
    })
    .filter((j) => j.boshlanish < chegara)
    .slice(0, soni)
    .map(({ boshlanish: _boshlanish, ...q }) => q);
}

/** Далил қўшади */
export async function dalilQoshish(p: {
  ishsizId: string;
  turi: DalilTuri;
  izoh?: string | null;
  reyestrIshJoyi?: string | null;
  reyestrSanasi?: Date | null;
  kiritganId?: string | null;
  /**
   * Дарҳол тасдиқланганми.
   *
   * Реестрдан келган далил ЎЗИ тасдиқ: у давлат манбаидан
   * олинган ва қўлда текширишнинг маъноси йўқ. Қўлда
   * киритилган далил эса аввал мутахассис кўзидан ўтади.
   */
  tasdiqlangan?: boolean;
}): Promise<{ id: string }> {
  return prisma.joylashuvDalili.create({
    data: {
      ishsizId: p.ishsizId,
      turi: p.turi,
      holati: p.tasdiqlangan ? 'TASDIQLANDI' : 'KIRITILDI',
      izoh: p.izoh ?? null,
      reyestrIshJoyi: p.reyestrIshJoyi ?? null,
      reyestrSanasi: p.reyestrSanasi ?? null,
      kiritganId: p.kiritganId ?? null,
      tasdiqlaganId: p.tasdiqlangan ? (p.kiritganId ?? null) : null,
      tasdiqlanganSana: p.tasdiqlangan ? new Date() : null,
    },
    select: { id: true },
  });
}

/** Мутахассис далилни текширди */
export async function dalilniHalQil(p: {
  dalilId: string;
  userId: string;
  tasdiqlandi: boolean;
  izoh?: string | null;
}): Promise<{ ok: boolean }> {
  const bor = await prisma.joylashuvDalili.findUnique({
    where: { id: p.dalilId },
    select: { id: true },
  });
  if (!bor) return { ok: false };

  await prisma.joylashuvDalili.update({
    where: { id: p.dalilId },
    data: {
      holati: p.tasdiqlandi ? 'TASDIQLANDI' : 'RAD_ETILDI',
      tasdiqlaganId: p.userId,
      tasdiqlanganSana: new Date(),
      ...(p.izoh !== undefined ? { izoh: p.izoh } : {}),
    },
  });
  return { ok: true };
}
