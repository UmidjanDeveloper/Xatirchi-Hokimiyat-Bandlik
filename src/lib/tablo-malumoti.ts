import { prisma } from './prisma';
import {
  KUN_MS,
  XATLANGAN,
  faolMahallalar,
  haftaKuni,
  harakat,
  kunBoshi,
  kunRaqami,
  tumanHolati,
  type FaolMahalla,
  type Harakat,
  type TumanHolati,
} from './tuman-holati';
import { xaritaMalumoti, type XaritaMalumoti } from './xarita/xarita-malumoti';

/**
 * ============================================================
 *  ДЕВОР ТАБЛОСИ УЧУН МАЪЛУМОТ
 *
 *  ── Табло кимга ва қаерда ──
 *
 *  Ҳокимият йўлагидаги телевизорга. Уни ҳеч ким «очмайди»:
 *  экран эрталаб ёқилади ва кун бўйи ўзи туради. Қарайдиган
 *  одам уч-тўрт метр наридан ўтиб кетаётган бўлади ва унда
 *  икки сониядан ортиқ вақт йўқ.
 *
 *  Шундан учта талаб чиқади ва улар оддий панелникидан
 *  БОШҚАЧА:
 *
 *    1. Ҳеч қандай тугма йўқ. Босадиган одам йўқ — табло
 *       ўзгаришни ЎЗИ кўрсатиши керак.
 *    2. Ҳар бир рақам номи билан. Тултип йўқ, шунинг учун
 *       ёнида изоҳ бўлмаган рақам ўқилмайди.
 *    3. Ҳаракат кўринсин. Ҳафталаб ўзгармайдиган экранга
 *       бир ҳафтадан кейин ҳеч ким қарамай қўяди.
 *
 *  ── Нега алоҳида сўров эмас ──
 *
 *  Асосий рақамлар `tuman-holati` дан олинади — брифинг ҳам
 *  ўша ердан ўқийди. Йўлакдаги экранда «134», телефондаги
 *  хабарда «136» турса, иккаласига ҳам ишонч қолмайди.
 * ============================================================
 */

/** Оқим диаграммаси неча кунни кўрсатади */
export const OQIM_KUNI = 14;

/** Сафда нечта маҳалла номи чиқади */
export const SAF_SONI = 5;

/** Саф қайси оралиқ бўйича ҳисобланади */
export const SAF_KUNI = 7;

/**
 * Кеш муддати.
 *
 * Табло ўзини ҳар дақиқада янгилайди, яъни экран очиқ турган
 * ҳар бир браузер соатига олтмиш марта сўров юборади. Ўттиз
 * сониялик кеш иккита экранни ҳам, ўн иккитасини ҳам бир хил
 * юкка туширади — ва рақам барибир ярим дақиқадан эски
 * бўлмайди.
 */
const KESH_MS = 30 * 1000;

export interface OqimKuni {
  sana: Date;
  /** Ойнинг куни — ўқ остидаги ёзув */
  kun: number;
  xonadon: number;
  /** Дам олиш куни — устун сустроқ бўялади */
  damOlish: boolean;
}

export interface TabloEtibori {
  matn: string;
  ogirlik: 'danger' | 'warn';
}

export interface Tablo {
  yangilandi: Date;
  holat: TumanHolati;
  bugun: Harakat;
  hafta: Harakat;
  oqim: OqimKuni[];
  saf: FaolMahalla[];
  etibor: TabloEtibori[];
  xarita: XaritaMalumoti;
}

let kesh: { vaqti: number; natija: Tablo } | null = null;

export async function tabloMalumoti(hozir: Date = new Date()): Promise<Tablo> {
  if (kesh && Date.now() - kesh.vaqti < KESH_MS) return kesh.natija;

  const natija = await hisobla(hozir);
  kesh = { vaqti: Date.now(), natija };
  return natija;
}

/** Синов учун — кешни тозалайди */
export function tabloKeshiniTozala(): void {
  kesh = null;
}

async function hisobla(hozir: Date): Promise<Tablo> {
  const bugunBoshi = kunBoshi(hozir);
  const ertaga = new Date(bugunBoshi.getTime() + KUN_MS);
  const haftaBoshi = new Date(bugunBoshi.getTime() - (SAF_KUNI - 1) * KUN_MS);
  const oqimBoshi = new Date(bugunBoshi.getTime() - (OQIM_KUNI - 1) * KUN_MS);

  const [holat, bugun, hafta, saf, sanalar, xarita] = await Promise.all([
    tumanHolati(hozir),
    harakat(bugunBoshi, ertaga),
    harakat(haftaBoshi, ertaga),
    faolMahallalar(haftaBoshi, ertaga, SAF_SONI),

    /*
     * ── НЕГА `groupBy` ЭМАС ──
     *
     * Кунлар бўйича гуруҳлаш учун SQL да `date_trunc` керак,
     * Prisma да эса бу хом сўровсиз бўлмайди. Хом сўров эса
     * вақт минтақасини ЎЗИ талқин қилади ва натижада устунлар
     * бир кунга силжиб қоларди.
     *
     * Ўн тўрт кунлик санани ўқиб, шу ерда гуруҳлаш арзонроқ
     * ва аниқроқ: оралиқ чекланган, сана эса саҳифанинг ўзи
     * ишлатадиган вақт минтақасида талқин қилинади.
     */
    prisma.household.findMany({
      where: { ...XATLANGAN, xatlovSanasi: { gte: oqimBoshi, lt: ertaga } },
      select: { xatlovSanasi: true },
    }),

    xaritaMalumoti(),
  ]);

  /*
   * Ҳар бир кун учун сават — хатлов бўлмаган кун ҲАМ кўринади.
   *
   * Бўш кунни тушириб қолдириб бўлмайди: устунлар сурилиб,
   * тўхтаб қолган ҳафта узлуксиз ишдек кўринарди.
   *
   * Калит — ТОШКЕНТ кун боши. Сервер UTC да, шунинг учун
   * тунги ўн икки билан беш орасида киритилган хатлов
   * `setHours` да бошқа кунга тушиб кетарди.
   */
  const savat = new Map<number, number>();
  for (let i = 0; i < OQIM_KUNI; i++) {
    savat.set(kunBoshi(new Date(oqimBoshi.getTime() + i * KUN_MS)).getTime(), 0);
  }
  for (const x of sanalar) {
    const kalit = kunBoshi(new Date(x.xatlovSanasi)).getTime();
    if (savat.has(kalit)) savat.set(kalit, (savat.get(kalit) ?? 0) + 1);
  }

  const oqim: OqimKuni[] = Array.from(savat.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([vaqt, xonadon]) => {
      const sana = new Date(vaqt);
      const h = haftaKuni(sana);
      return { sana, kun: kunRaqami(sana), xonadon, damOlish: h === 0 || h === 6 };
    });

  return {
    yangilandi: hozir,
    holat,
    bugun,
    hafta,
    oqim,
    saf,
    etibor: etiborYasa(holat),
    xarita,
  };
}

/**
 * Эътибор рўйхати.
 *
 * ── Нега учтадан ошмайди ──
 *
 * Йўлакдан ўтаётган одам бир нечта сатр ўқийди, ўн битта эмас.
 * Ўн битта сатр чиқарилса, ҳеч бири ўқилмайди — ва энг оғири
 * ҳам ўқилмай қолади.
 *
 * Шунинг учун рўйхат ТАРТИБЛАНГАН: занжирни бутунлай
 * тўхтатадиган муаммо тепада, сустлик пастда.
 */
export function etiborYasa(h: TumanHolati): TabloEtibori[] {
  const hammasi: TabloEtibori[] = [];

  /*
   * Биринчи ўринда — занжирни УЗАДИГАН нарсалар. Уланмаган
   * ходимнинг маҳалласига эълон бормайди, очиқ ўрин бўлмаса
   * таклиф қиладиган нарса йўқ. Иккови ҳам тизимни ишламай
   * қўядиган ҳолат, шунчаки сустлик эмас.
   */
  if (h.ochiqOrin === 0) {
    hammasi.push({ matn: 'Очиқ иш ўрни йўқ', ogirlik: 'danger' });
  }
  if (h.ulanmaganXodim > 0) {
    hammasi.push({
      matn: `${h.ulanmaganXodim} та ходим ботга уланмаган`,
      ogirlik: h.ulanmaganXodim > h.xodim / 2 ? 'danger' : 'warn',
    });
  }
  if (h.kechikkanTopshiriq > 0) {
    hammasi.push({
      matn: `${h.kechikkanTopshiriq} та топшириқ муддати ўтган`,
      ogirlik: 'danger',
    });
  }
  if (h.anketasiz > 0) {
    hammasi.push({
      matn: `${h.anketasiz} та фуқаро анкетасиз`,
      ogirlik: 'warn',
    });
  }
  if (h.boshlamaganMahalla > 0) {
    hammasi.push({
      matn: `${h.boshlamaganMahalla} та маҳалла хатловни бошламаган`,
      ogirlik: 'warn',
    });
  }

  return hammasi.slice(0, 3);
}
