import { prisma } from './prisma';
import { FAOL_ELON, MODERATSIYA_KUTMOQDA } from './elon-muddati';
import { JOYLASHGAN, KUN_MS, XATLANGAN } from './bandlik-holatlari';
import { tasdiqHisobi } from './joylashuv-dalili';

/*
 * Доимийлар `bandlik-holatlari` да ва шу ердан ҳам чиқади:
 * улар аввал шу файлда эди ва бошқа модуллар шундан олади.
 */
export { JOYLASHGAN, KUN_MS, XATLANGAN };

/**
 * ============================================================
 *  ТУМАН ҲОЛАТИ — ЯГОНА МАНБА
 *
 *  ── Нега алоҳида модул ──
 *
 *  Битта рақам иккита экранда икки хил чиқиши — бу тизимдаги
 *  энг оғир нуқсон тури. Ҳоким «134» ни брифингда, «136» ни
 *  панелда кўрса, у иккала рақамга ҳам ишонмай қўяди, ва
 *  ундан кейин тизимнинг қолган ҳамма гапи ҳам шубҳа остида
 *  қолади.
 *
 *  Бу аллақачон бир марта юз берган: янги жамланма сўровга
 *  `QORALAMA` фильтри қўйилмай қолган эди.
 *
 *  Шунинг учун туман кесимидаги асосий рақамлар ФАҚАТ шу
 *  файлда ҳисобланади. Брифинг ҳам, тўлиқ экран табло ҳам
 *  шу ердан ўқийди — иккови бошқача ёза олмайди, чунки
 *  ёзадиган жойи йўқ.
 *
 *  ── Нега `xatlovSanasi` ──
 *
 *  Хонадоннинг иккита санаси бор: `createdAt` (ёзув базада
 *  пайдо бўлган вақт) ва `xatlovSanasi` (экранда «Хатлов
 *  санаси» деб кўрсатиладиган вақт).
 *
 *  Ҳисоб `xatlovSanasi` бўйича кетади — чунки ҳоким хонадонни
 *  очиб шу санани кўради. Агар брифинг бошқа устундан
 *  санаса, «28 сентябрда 12 та» деган сатр остидаги рўйхатда
 *  ўн битта хонадон чиқиб қоларди.
 * ============================================================
 */

/**
 * ── ВАҚТ МИНТАҚАСИ ──
 *
 * Сервер UTC да юради, туман эса UTC+5 да. `setHours(0,0,0,0)`
 * СЕРВЕРНИНГ кун бошини олади, яъни Тошкент вақти билан
 * соат 05:00 ни.
 *
 * Натижа: эрталаб соат тўртда йўлакдаги таблода «бугун»
 * деган рақам ҳали КЕЧАГИ кунники бўларди, ва соат бешда
 * ҳеч қандай сабабсиз нолга тушарди. Брифинг ҳам худди
 * шундай: «кеча» оралиғи 05:00 дан 05:00 гача эди, яъни
 * эрта тонгда киритилган хатлов бошқа кунга ёзиларди.
 *
 * Ўзбекистон ёзги вақтга ўтмайди, шунинг учун аниқ силжиш
 * етарли: вақтни суриб, UTC қисмлари кесилади ва қайтариб
 * сурилади.
 */
const TOSHKENT_MS = 5 * 60 * 60 * 1000;

/** Тошкент вақти бўйича кун боши — ҳақиқий онда */
export function kunBoshi(sana: Date): Date {
  const t = new Date(sana.getTime() + TOSHKENT_MS);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - TOSHKENT_MS);
}

/** Тошкент вақти бўйича ойнинг куни (1-31) */
export function kunRaqami(sana: Date): number {
  return new Date(sana.getTime() + TOSHKENT_MS).getUTCDate();
}

/** Тошкент вақти бўйича ҳафта куни (0 — якшанба) */
export function haftaKuni(sana: Date): number {
  return new Date(sana.getTime() + TOSHKENT_MS).getUTCDay();
}

export interface TumanHolati {
  jamiMahalla: number;
  /** Ҳокимлик свод жадвалидаги хонадон ва ишсизлар */
  bazaXonadon: number;
  bazaIshsiz: number;

  xatlovXonadon: number;
  /** Хатлов қамрови, % */
  qamrovFoizi: number;
  /** Хатлов топган ишсизлар — анкета тўлдирилганидан олдинги сон */
  topilganIshsiz: number;
  /** Шахсий анкетаси бор фуқаролар */
  anketa: number;
  /** Топилган, аммо анкетаси тўлдирилмаганлар */
  anketasiz: number;
  joylashtirilgan: number;
  /**
   * Шундан ДАЛИЛ билан тасдиқлангани.
   *
   * Тизим «жойлаштирилди» деб турган ҳар бир ёзув — ходимнинг
   * айтгани. Бу иккинчи рақам эса ҳужжат билан тасдиқлангани.
   * Иккови ёнма-ён турганда савол ўзи туғилади.
   */
  tasdiqlanganJoylashuv: number;
  /**
   * ── ШУНДАН РАСМИЙ МАНБА БИЛАН ──
   *
   * `tasdiqlanganJoylashuv` нинг ичида ИККИ ХИЛ нарса бор:
   * текширилган интеграциядан келгани ва администратор
   * қўлда юклаган файлдан келгани.
   *
   * Иккови бир хил кўринса, «тасдиқланган» сўзи маъносини
   * йўқотади — ва бу рақам ЮҚОРИГА ҳисобот бўлиб кетади.
   */
  rasmiyTasdiqlangan: number;
  /**
   * Ҳужжат киритилган-у, мутахассис ҳали қарамаган.
   *
   * Бу «тасдиқланмаган» эмас, «навбатда турибди» —
   * ҳокимга буниси бажариладиган ИШ, нуқсон эмас.
   */
  tekshiruvKutayotgan: number;
  /** Ўттиз кундан бери далилсиз турганлар */
  dalilsizJoylashuv: number;
  ochiqOrin: number;

  boshlaganMahalla: number;
  boshlamaganMahalla: number;
  kechikkanTopshiriq: number;

  xodim: number;
  ulanganXodim: number;
  ulanmaganXodim: number;

  /** Иш берувчидан келган-у, ҳали кўриб чиқилмаган эълонлар */
  moderatsiyaKutmoqda: number;
}

export async function tumanHolati(hozir: Date = new Date()): Promise<TumanHolati> {
  const [mahallalar, xatlov, anketa, joylashgan, elon, boshlagan, kechikkan, xodim, ulangan, dalil, moderatsiya] =
    await Promise.all([
      prisma.mahalla.aggregate({ _count: true, _sum: { xonadon: true, ishsiz: true } }),

      prisma.household.aggregate({
        where: XATLANGAN,
        _count: true,
        _sum: { ishsizlarSoni: true },
      }),

      prisma.unemployedPerson.count(),

      prisma.unemployedPerson.count({ where: { holati: { in: [...JOYLASHGAN] } } }),

      prisma.vacancy.count({ where: FAOL_ELON(hozir) }),

      prisma.household.groupBy({ by: ['mahallaId'], where: XATLANGAN, _count: true }),

      prisma.actionPlan.count({
        where: {
          holati: { in: ['KUTILMOQDA', 'BAJARILMOQDA', 'KECHIKDI'] },
          muddat: { lt: hozir },
        },
      }),

      prisma.user.count({ where: { rol: 'YETTILIK', faol: true } }),

      prisma.user.count({
        where: { rol: 'YETTILIK', faol: true, telegramChatId: { not: null } },
      }),

      /*
       * Тасдиқ ҳисоби ҲАМ шу ердан чақирилади.
       *
       * Аввал панел ўзича ҳисоблаб, брифинг бошқача
       * ҳисоблаши мумкин эди. Битта манба буни умуман
       * мумкин эмас қилиб қўяди.
       */
      tasdiqHisobi(),

      /*
       * Модерация навбати — брифингда айтилади.
       *
       * Иш берувчи эълон қўйиб, жавоб кутади. Кечиккан жавоб
       * — йўқолган иш ўрни: у бошқа йўл билан одам топади
       * ва иккинчи марта ёзмайди.
       */
      prisma.vacancy.count({ where: MODERATSIYA_KUTMOQDA() }),
    ]);

  const jamiMahalla = mahallalar._count;
  const bazaXonadon = mahallalar._sum.xonadon ?? 0;
  const topilganIshsiz = xatlov._sum.ishsizlarSoni ?? 0;

  return {
    jamiMahalla,
    bazaXonadon,
    bazaIshsiz: mahallalar._sum.ishsiz ?? 0,

    xatlovXonadon: xatlov._count,
    qamrovFoizi: bazaXonadon > 0 ? Math.round((xatlov._count / bazaXonadon) * 1000) / 10 : 0,
    topilganIshsiz,
    anketa,
    /*
     * Манфий бўлиши мумкин: битта хонадонда «иккита ишсиз бор»
     * деб белгиланиб, кейин учтасига анкета тўлдирилса. Шунинг
     * учун нолда тўхтатилади — экранда «-3 та фуқаро анкетасиз»
     * деган сатр чиқмасин.
     */
    anketasiz: Math.max(0, topilganIshsiz - anketa),
    joylashtirilgan: joylashgan,
    tasdiqlanganJoylashuv: dalil.tasdiqlangan,
    rasmiyTasdiqlangan: dalil.rasmiyTasdiq,
    tekshiruvKutayotgan: dalil.tekshiruvKutayotgan,
    dalilsizJoylashuv: dalil.muddatiOtgan,
    ochiqOrin: elon,

    boshlaganMahalla: boshlagan.length,
    boshlamaganMahalla: jamiMahalla - boshlagan.length,
    kechikkanTopshiriq: kechikkan,

    xodim,
    ulanganXodim: ulangan,
    ulanmaganXodim: xodim - ulangan,
    moderatsiyaKutmoqda: moderatsiya,
  };
}

export interface Harakat {
  xatlov: number;
  anketa: number;
  joylashtirilgan: number;
  radEtgan: number;
}

/**
 * Бир оралиқдаги ҲАРАКАТ.
 *
 * Жами рақам «қанча қилинган» деб айтади, ҳаракат эса «бугун
 * ишладикми» деб. Иккови бирга керак: фақат жами берилса,
 * 0,4% эртага ҳам 0,4% бўлиб туради ва ҳеч ким ҳаракат
 * борлигини кўрмайди.
 */
export async function harakat(boshi: Date, oxiri: Date): Promise<Harakat> {
  const oraliq = { gte: boshi, lt: oxiri };

  const [xatlov, anketa, joylashtirilgan, radEtgan] = await Promise.all([
    prisma.household.count({ where: { ...XATLANGAN, xatlovSanasi: oraliq } }),
    prisma.unemployedPerson.count({ where: { createdAt: oraliq } }),
    prisma.unemployedPerson.count({
      where: { holati: { in: [...JOYLASHGAN] }, updatedAt: oraliq },
    }),
    prisma.unemployedPerson.count({ where: { holati: 'RAD_ETDI', updatedAt: oraliq } }),
  ]);

  return { xatlov, anketa, joylashtirilgan, radEtgan };
}

export interface FaolMahalla {
  mahallaId: string;
  nomiKirill: string;
  xonadon: number;
}

/**
 * Оралиқда энг кўп хонадон хатлаган маҳаллалар — НОМИ билан.
 *
 * Давлат тизимида кўринадиган мақтов рақамдан кучлироқ
 * ишлайди: эртага бошқалар ҳам рўйхатга тушишни хоҳлайди.
 */
export async function faolMahallalar(
  boshi: Date,
  oxiri: Date,
  soni: number
): Promise<FaolMahalla[]> {
  const guruh = await prisma.household.groupBy({
    by: ['mahallaId'],
    where: { ...XATLANGAN, xatlovSanasi: { gte: boshi, lt: oxiri } },
    _count: true,
    orderBy: { _count: { mahallaId: 'desc' } },
    take: soni,
  });
  if (guruh.length === 0) return [];

  const nomlar = new Map(
    (
      await prisma.mahalla.findMany({
        where: { id: { in: guruh.map((g) => g.mahallaId) } },
        select: { id: true, nomiKirill: true },
      })
    ).map((m) => [m.id, m.nomiKirill])
  );

  return guruh.map((g) => ({
    mahallaId: g.mahallaId,
    nomiKirill: nomlar.get(g.mahallaId) ?? '—',
    xonadon: g._count,
  }));
}
