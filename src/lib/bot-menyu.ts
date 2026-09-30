import { xavfsiz } from './xabarnoma';
import { prisma } from './prisma';
import { FAOL_ELON, MODERATSIYA_KUTMOQDA } from './elon-muddati';
import { tumanHolati } from './tuman-holati';
import type { Tugma } from './xabarnoma';

/**
 * ============================================================
 *  БОТ МЕНЮСИ
 *
 *  ── Нега керак бўлди ──
 *
 *  Аввал бот ФАҚАТ кодни тушунарди. Ходим `/start` босса —
 *  ҳеч нарса чиқмасди: на салом, на кўрсатма, на бир тугма.
 *  Экран жим турарди ва одам «бот ишламаяпти» деб ўйларди.
 *
 *  Ҳолбуки `/start` — ботда одам босадиган БИРИНЧИ тугма.
 *  У жим турса, қолган ҳамма нарса ҳам ишламайдигандек
 *  туюлади.
 *
 *  ── Нега рол бўйича бошқача ──
 *
 *  Маҳалла ходимига «менинг фуқароларим» керак, бандлик
 *  раҳбарига эса «нечта ходим уланган». Битта умумий меню
 *  иккаласига ҳам ярамайди: ортиқча тугма — бу шовқин, ва
 *  шовқин ичида керакли тугма йўқолади.
 * ============================================================
 */

/** Тугма белгилари — `callback_data` да ишлатилади */
export const MENYU = {
  ORINLAR: 'm.orinlar',
  FUQAROLAR: 'm.fuqarolar',
  XODIMLAR: 'm.xodimlar',
  UZISH: 'm.uzish',
  UZISH_TASDIQ: 'm.uzish.ha',
  MENYU: 'm.bosh',
} as const;

const SAYT = 'https://www.xatirchibandlik.uz';

/**
 * Менюнинг охиридаги битта сатр.
 *
 * ── Нега керак ──
 *
 * Бот энди савол тушунади, аммо буни ҳеч ким БИЛМАЙДИ:
 * Telegram да «бу ботга ёзиш мумкин» деган белги йўқ,
 * тугмалар эса аксини айтади — «фақат босиш мумкин».
 *
 * Шунинг учун меню охирида битта мисол туради. Мисол
 * умумий гапдан кучлироқ: «савол беринг» дегандан кўра
 * «Уйшун» деб ёзиш мумкинлигини кўрсатган афзал.
 */
const SAVOL_IZOHI =
  '💬 Савол ҳам ёзишингиз мумкин — масалан: <code>Уйшун</code> ёки <code>очиқ иш ўринлари</code>';

function raqam(n: number): string {
  return n.toLocaleString('ru-RU').replace(/ /g, ' ');
}

export interface MenyuNatijasi {
  matn: string;
  tugmalar: Tugma[];
}

/**
 * Уланмаган одам учун — нима қилиш кераклиги.
 *
 * «Сиз уланмагансиз» дейиш етарли эмас: одам кейин нима
 * қилишни билмайди ва ботни ёпиб қўяди. Шунинг учун қадамлар
 * аниқ ёзилади.
 */
export function ulanmaganMatni(): MenyuNatijasi {
  return {
    matn: [
      '<b>Хатирчи бандлик</b>',
      '',
      'Бу бот маҳалла ходимларига бўш иш ўринлари ҳақида хабар беради.',
      '',
      '<b>Сиз ҳали уланмагансиз.</b>',
      '',
      'Улаш учун:',
      `1. <a href="${SAYT}">Сайтга</a> ўз ҳисобингиз билан киринг`,
      '2. «Хатловлар» саҳифасини пастгача айлантиринг',
      '3. «Telegram» бўлимидан кодни олинг',
      '4. Кодни шу ерга юборинг',
      '',
      'Код 15 дақиқа амал қилади.',
    ].join('\n'),
    tugmalar: [],
  };
}

/**
 * Уланган ходим учун бош меню.
 *
 * Рақамлар ДАРҲОЛ кўринади — тугма босмасдан. Ходим ботни
 * очганда биринчи саволи «менда нима бор» бўлади, ва жавоб
 * биринчи экранда туриши керак.
 */
export async function boshMenyu(userId: string): Promise<MenyuNatijasi> {
  const xodim = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      rol: true,
      mahallaId: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });
  if (!xodim) return ulanmaganMatni();

  const rahbarmi = xodim.rol === 'BANDLIK_RAHBAR' || xodim.rol === 'ADMIN';

  /* ── Бандлик раҳбари ва администратор ── */
  if (rahbarmi) {
    const [orinlar, jamiXodim, ulangan, kutayotganElon, kutayotganBeruvchi] =
      await Promise.all([
        prisma.vacancy.count({ where: FAOL_ELON() }),
        prisma.user.count({ where: { rol: 'YETTILIK', faol: true } }),
        prisma.user.count({
          where: { rol: 'YETTILIK', faol: true, telegramChatId: { not: null } },
        }),
        /*
         * ── МОДЕРАЦИЯ НАВБАТИ ──
         *
         * Иш берувчи эълон қўйиб, жавоб кутиб ўтиради. Агар
         * раҳбар буни фақат хабар келганда кўрса, ўтказиб
         * юбориши мумкин — хабар бошқа хабарлар орасида
         * кўмилиб кетади.
         *
         * Меню эса ҳар сафар очилганда кўринади.
         */
        prisma.vacancy.count({ where: MODERATSIYA_KUTMOQDA() }),
        prisma.ishBeruvchi.count({ where: { holati: 'KUTILMOQDA' } }),
      ]);

    return {
      matn: [
        `<b>${xodim.fullName}</b>`,
        xodim.rol === 'ADMIN' ? 'Администратор' : 'Бандлик маркази раҳбари',
        '',
        `📋 Очиқ иш ўрни: <b>${raqam(orinlar)}</b> та`,
        `🔗 Ботга уланган ходим: <b>${raqam(ulangan)}</b> / ${raqam(jamiXodim)}`,
        ...(ulangan < jamiXodim
          ? [
              '',
              `⚠️ ${raqam(jamiXodim - ulangan)} та ходим уланмаган — уларнинг маҳалласига эълон хабари бормайди.`,
            ]
          : []),
        ...(kutayotganElon > 0 || kutayotganBeruvchi > 0
          ? [
              '',
              '⏳ <b>Кўриб чиқиш кутилмоқда:</b>',
              ...(kutayotganElon > 0 ? [`   ${raqam(kutayotganElon)} та эълон`] : []),
              ...(kutayotganBeruvchi > 0 ? [`   ${raqam(kutayotganBeruvchi)} та иш берувчи`] : []),
            ]
          : []),
        '',
        SAVOL_IZOHI,
      ].join('\n'),
      tugmalar: [
        { yozuv: '➕ Янги иш ўрни қўйиш', belgi: 'e.boshla' },
        { yozuv: '👥 Ходимлар ҳолати', belgi: MENYU.XODIMLAR },
        { yozuv: '📋 Очиқ иш ўринлари', belgi: MENYU.ORINLAR },
        { yozuv: '🔌 Уланишни узиш', belgi: MENYU.UZISH },
      ],
    };
  }

  /*
   * ── ҲОКИМ ──
   *
   * Ҳоким ботга УЛАНАДИ: эрталабки брифинг унга келади,
   * демак у ботни очади ва «нима бор» деб қарайди.
   *
   * Аввал у маҳалла ходими шохобчасига тушарди: маҳалласи
   * йўқ бўлгани учун ҳамма рақам нол чиқарди ва экранда
   * «Менинг фуқароларим» деган маъносиз тугма турарди.
   *
   * Яъни туманнинг биринчи раҳбари ботни очиб, бўм-бўш
   * экран кўрарди — ва иккинчи марта очмасди.
   */
  if (xodim.rol === 'HOKIM') {
    const h = await tumanHolati();

    return {
      matn: [
        `<b>${xodim.fullName}</b>`,
        'Туман ҳокими',
        '',
        `🏠 Хатлов: <b>${raqam(h.xatlovXonadon)}</b> / ${raqam(h.bazaXonadon)} хонадон`,
        `👤 Хатлов топган ишсиз: <b>${raqam(h.topilganIshsiz)}</b> та`,
        `✅ Ишга жойлаштирилган: <b>${raqam(h.joylashtirilgan)}</b> та`,
        `      ҳужжат билан тасдиқланган: <b>${raqam(h.tasdiqlanganJoylashuv)}</b> та`,
        `📋 Очиқ иш ўрни: <b>${raqam(h.ochiqOrin)}</b> та`,
        '',
        SAVOL_IZOHI,
      ].join('\n'),
      tugmalar: [
        { yozuv: '📊 Туман бўйича', belgi: 's.tuman' },
        { yozuv: '📋 Очиқ иш ўринлари', belgi: MENYU.ORINLAR },
        { yozuv: '🔌 Уланишни узиш', belgi: MENYU.UZISH },
      ],
    };
  }

  /* ── Маҳалла ходими ── */
  const [orinlar, ishsiz, anketasiz] = await Promise.all([
    prisma.vacancy.count({
      where: xodim.mahallaId
        ? { ...FAOL_ELON(), mahallaId: xodim.mahallaId }
        : FAOL_ELON(),
    }),
    prisma.unemployedPerson.count({
      where: xodim.mahallaId
        ? { mahallaId: xodim.mahallaId, holati: { notIn: ['JOYLASHTIRILDI', 'TASDIQLANDI'] } }
        : { id: '—' },
    }),
    prisma.household.aggregate({
      where: xodim.mahallaId
        ? { mahallaId: xodim.mahallaId, holati: { not: 'QORALAMA' } }
        : { id: '—' },
      _sum: { ishsizlarSoni: true },
    }),
  ]);

  const topilgan = anketasiz._sum.ishsizlarSoni ?? 0;
  const anketaSoni = await prisma.unemployedPerson.count({
    where: xodim.mahallaId ? { mahallaId: xodim.mahallaId } : { id: '—' },
  });
  const kutayotgan = Math.max(0, topilgan - anketaSoni);

  return {
    matn: [
      `<b>${xodim.fullName}</b>`,
      xodim.mahalla ? `${xavfsiz(xodim.mahalla.nomiKirill)} МФЙ` : 'Маҳалла бириктирилмаган',
      '',
      `📋 Маҳаллангизда очиқ иш ўрни: <b>${raqam(orinlar)}</b> та`,
      `👤 Иш кутаётган фуқаро: <b>${raqam(ishsiz)}</b> та`,
      ...(kutayotgan > 0
        ? [`⏳ Анкетаси тўлдирилмаган: <b>${raqam(kutayotgan)}</b> та`]
        : []),
      '',
      SAVOL_IZOHI,
    ].join('\n'),
    tugmalar: [
      { yozuv: '📋 Очиқ иш ўринлари', belgi: MENYU.ORINLAR },
      { yozuv: '👥 Менинг фуқароларим', belgi: MENYU.FUQAROLAR },
      { yozuv: '🔌 Уланишни узиш', belgi: MENYU.UZISH },
    ],
  };
}

/** Маҳалладаги очиқ эълонлар рўйхати */
export async function orinlarRoyxati(userId: string): Promise<MenyuNatijasi> {
  const xodim = await prisma.user.findUnique({
    where: { id: userId },
    select: { mahallaId: true, rol: true },
  });
  const hammasi = xodim?.rol === 'BANDLIK_RAHBAR' || xodim?.rol === 'ADMIN';

  const orinlar = await prisma.vacancy.findMany({
    where:
      hammasi || !xodim?.mahallaId
        ? FAOL_ELON()
        : { ...FAOL_ELON(), mahallaId: xodim.mahallaId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      lavozim: true,
      korxonaNomi: true,
      ornlarSoni: true,
      maosh: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });

  if (orinlar.length === 0) {
    return {
      matn: [
        '<b>Очиқ иш ўринлари</b>',
        '',
        'Ҳозирча очиқ эълон йўқ.',
        '',
        'Янги эълон чиққанда шу ерга хабар келади.',
      ].join('\n'),
      tugmalar: [{ yozuv: '⬅️ Орқага', belgi: MENYU.MENYU }],
    };
  }

  return {
    matn: [
      `<b>Очиқ иш ўринлари</b> — ${orinlar.length} та`,
      '',
      ...orinlar.map((o, i) =>
        [
          `<b>${i + 1}. ${xavfsiz(o.lavozim)}</b>`,
          `   ${xavfsiz(o.korxonaNomi)}`,
          `   ${xavfsiz(o.mahalla.nomiKirill)} МФЙ · ${o.ornlarSoni} та ўрин`,
          ...(o.maosh ? [`   ${raqam(Number(o.maosh) / 1_000_000)} млн сўм`] : []),
        ].join('\n')
      ),
      '',
      `Тўлиқ маълумот ва телефон: ${SAYT}`,
    ].join('\n'),
    tugmalar: [{ yozuv: '⬅️ Орқага', belgi: MENYU.MENYU }],
  };
}

/** Ходимнинг ўз маҳалласидаги иш кутаётган фуқаролар */
export async function fuqarolarRoyxati(userId: string): Promise<MenyuNatijasi> {
  const xodim = await prisma.user.findUnique({
    where: { id: userId },
    select: { mahallaId: true },
  });
  if (!xodim?.mahallaId) {
    return {
      matn: 'Сизга маҳалла бириктирилмаган.',
      tugmalar: [{ yozuv: '⬅️ Орқага', belgi: MENYU.MENYU }],
    };
  }

  /*
   * ТЕЛЕФОН РАҚАМИ ЮБОРИЛМАЙДИ.
   *
   * Telegram хабари телефонда сақланиб қолади ва улашилиши
   * мумкин. Шахсий маълумот эса тизимда, рухсат текширилган
   * ҳолда кўрилиши керак.
   */
  const fuqarolar = await prisma.unemployedPerson.findMany({
    where: {
      mahallaId: xodim.mahallaId,
      holati: { notIn: ['JOYLASHTIRILDI', 'TASDIQLANDI'] },
    },
    orderBy: { fish: 'asc' },
    take: 15,
    select: { fish: true, holati: true, mutaxassisligi: true },
  });

  if (fuqarolar.length === 0) {
    return {
      matn: 'Маҳаллангизда иш кутаётган фуқаро йўқ.',
      tugmalar: [{ yozuv: '⬅️ Орқага', belgi: MENYU.MENYU }],
    };
  }

  const HOLAT: Record<string, string> = {
    ANIQLANDI: '🆕 суҳбат кутмоқда',
    SUHBAT_OTKAZILDI: '💬 суҳбат ўтказилди',
    TAKLIF_BERILDI: '📨 таклиф берилди',
    RAD_ETDI: '✖️ рад этган',
  };

  return {
    matn: [
      `<b>Маҳаллангиздаги фуқаролар</b> — ${fuqarolar.length} та`,
      '',
      ...fuqarolar.map(
        (f, i) =>
          `${i + 1}. ${xavfsiz(f.fish)}\n   ${HOLAT[f.holati] ?? f.holati}${f.mutaxassisligi ? ` · ${xavfsiz(f.mutaxassisligi)}` : ''}`
      ),
      '',
      `Телефон ва тўлиқ анкета: ${SAYT}`,
    ].join('\n'),
    tugmalar: [{ yozuv: '⬅️ Орқага', belgi: MENYU.MENYU }],
  };
}

/**
 * Ходимлар ҳолати — раҳбар ва администратор учун.
 *
 * Сайтга кирмасдан билиш керак бўлган ягона нарса: ким
 * уланган, ким йўқ. Уланмаган маҳаллага эълон хабари
 * бормайди — яъни бу сон занжирнинг ишлашини кўрсатади.
 */
export async function xodimlarHolati(): Promise<MenyuNatijasi> {
  const xodimlar = await prisma.user.findMany({
    where: { rol: 'YETTILIK', faol: true },
    orderBy: [{ mahalla: { nomiKirill: 'asc' } }],
    select: {
      fullName: true,
      telegramChatId: true,
      telegramSana: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });

  const ulangan = xodimlar.filter((x) => x.telegramChatId);
  const uzilgan = xodimlar.filter((x) => !x.telegramChatId);

  const satr = (x: (typeof xodimlar)[number]) =>
    `${x.mahalla?.nomiKirill ?? '—'} — ${x.fullName}`;

  return {
    matn: [
      '<b>Ходимлар ҳолати</b>',
      '',
      `✅ Уланган: <b>${ulangan.length}</b> та`,
      `⚠️ Уланмаган: <b>${uzilgan.length}</b> та`,
      '',
      ...(uzilgan.length > 0
        ? [
            '<b>Уланмаганлар:</b>',
            ...uzilgan.slice(0, 25).map((x) => `• ${satr(x)}`),
            ...(uzilgan.length > 25 ? [`… ва яна ${uzilgan.length - 25} та`] : []),
            '',
            'Уларнинг маҳалласига эълон хабари БОРМАЙДИ.',
          ]
        : ['Барча ходим уланган — занжир тўлиқ ишлайди.']),
    ].join('\n'),
    tugmalar: [{ yozuv: '⬅️ Орқага', belgi: MENYU.MENYU }],
  };
}

/**
 * Узишни СЎРАЙДИ, дарҳол узмайди.
 *
 * Тугма бошқа тугмаларнинг ёнида туради ва нотўғри босилиши
 * мумкин. Узилганда эса ходим хабарларни ола олмай қолади —
 * ва буни бир неча кундан кейин, керакли эълонни ўтказиб
 * юборгандан сўнг сезади.
 */
export function uzishSorovi(): MenyuNatijasi {
  return {
    matn: [
      '<b>Уланишни узиш</b>',
      '',
      'Узсангиз, бўш иш ўринлари ҳақида хабар КЕЛМАЙДИ.',
      '',
      'Қайта улаш учун сайтдан янги код олиш керак бўлади.',
      '',
      'Узишни хоҳлайсизми?',
    ].join('\n'),
    tugmalar: [
      { yozuv: '✖️ Ҳа, узилсин', belgi: MENYU.UZISH_TASDIQ },
      { yozuv: '⬅️ Йўқ, орқага', belgi: MENYU.MENYU },
    ],
  };
}
