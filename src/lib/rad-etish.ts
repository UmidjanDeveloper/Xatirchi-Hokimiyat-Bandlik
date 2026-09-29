import { prisma } from './prisma';
import { xabarQoshish, type Tugma, type YangiXabar } from './xabarnoma';

/**
 * ============================================================
 *  «РАД ЭТДИ» — ЗАНЖИРНИНГ ИККИНЧИ ЖАВОБИ
 *
 *  ── Нега керак бўлди ──
 *
 *  Аввал хабарда ФАҚАТ битта жавоб бор эди: «иш топдим».
 *  Ҳақиқатда эса ходим кўпинча бошқа нарсани айтади:
 *  «бордим, аммо ўзи хоҳламади» ёки «маош кам деди».
 *
 *  Бу жавобнинг бориладиган жойи йўқ эди. Натижада ходим
 *  ҳеч нарса босмасди, хабар эса «жавобсиз» бўлиб қоларди —
 *  ва бандлик маркази нима бўлганини билмасди.
 *
 *  ── Нега САБАБИ билан ──
 *
 *  «Рад этди» деган ялпи сон ҳеч нарса бермайди. Сабаб эса
 *  қарорга айланади:
 *
 *    маош кам      → иш берувчи билан гаплашиш керак
 *    масофа узоқ   → яқинроқ маҳаллага таклиф қилиш керак
 *    малака етмас  → курс очиш керак
 *    ўзи хоҳламади → алоҳида ишлаш керак
 *
 *  Шунинг учун сабаб МАЖБУРИЙ: тугма босилгач дарҳол
 *  бажарилмайди, аввал сабаб сўралади.
 * ============================================================
 */

/** Тугма белгилари */
export const RAD = {
  /** Кимни рад этгани сўралади */
  KIM: 'r',
  /** Сабаб сўралади */
  SABAB: 'rp',
  /** Сабаб танланди — ёзилади */
  YOZ: 'rs',
} as const;

/**
 * Сабаблар рўйхати.
 *
 * Белгиси РАҚАМ: `callback_data` 64 байт билан чекланган, ва
 * иккита cuid (25 белгидан) аллақачон 50 байтни эгаллайди.
 */
export const SABABLAR: { belgi: string; matn: string }[] = [
  { belgi: '1', matn: 'Фуқаро ўзи хоҳламади' },
  { belgi: '2', matn: 'Маош кам деди' },
  { belgi: '3', matn: 'Масофа узоқ' },
  { belgi: '4', matn: 'Малакаси етмади' },
  { belgi: '5', matn: 'Соғлиғи йўл қўймади' },
  { belgi: '6', matn: 'Бошқа сабаб' },
];

export function sababMatni(belgi: string): string | null {
  return SABABLAR.find((s) => s.belgi === belgi)?.matn ?? null;
}

/** Рад этиш мумкин бўлган ҳолатлар — жойлашган одамни рад этиб бўлмайди */
const RAD_ETSA_BOLADI = ['ANIQLANDI', 'SUHBAT_OTKAZILDI', 'TAKLIF_BERILDI'] as const;

/**
 * Қайси фуқарони рад этганини сўрайди.
 *
 * Рўйхат ходимнинг ЎЗ маҳалласидан олинади — тугма белгисини
 * қўлда ўзгартириб бошқа маҳалла одамига тегиб бўлмайди.
 */
export async function kimRadEtdi(
  userId: string,
  vacancyId: string
): Promise<{ matn: string; tugmalar: Tugma[] }> {
  const xodim = await prisma.user.findUnique({
    where: { id: userId },
    select: { mahallaId: true },
  });
  if (!xodim?.mahallaId) {
    return { matn: 'Сизга маҳалла бириктирилмаган.', tugmalar: [] };
  }

  const fuqarolar = await prisma.unemployedPerson.findMany({
    where: { mahallaId: xodim.mahallaId, holati: { in: [...RAD_ETSA_BOLADI] } },
    orderBy: { fish: 'asc' },
    take: 8,
    select: { id: true, fish: true },
  });

  if (fuqarolar.length === 0) {
    return { matn: 'Маҳаллангизда белгилаш мумкин бўлган фуқаро йўқ.', tugmalar: [] };
  }

  return {
    matn: [
      '<b>Ким рад этди?</b>',
      '',
      'Исмни танланг — кейин сабабини сўрайман.',
    ].join('\n'),
    tugmalar: fuqarolar.map((f) => ({
      yozuv: `✖️ ${f.fish}`,
      belgi: `${RAD.SABAB}:${vacancyId}:${f.id}`,
    })),
  };
}

/** Сабабни сўрайди */
export async function sababniSora(
  vacancyId: string,
  ishsizId: string
): Promise<{ matn: string; tugmalar: Tugma[] }> {
  const odam = await prisma.unemployedPerson.findUnique({
    where: { id: ishsizId },
    select: { fish: true },
  });

  return {
    matn: [
      `<b>${odam?.fish ?? 'Фуқаро'}</b> нима деди?`,
      '',
      'Сабаб бандлик марказига боради — таклифни ўзгартириш ёки курс очиш учун керак.',
    ].join('\n'),
    tugmalar: SABABLAR.map((s) => ({
      yozuv: s.matn,
      belgi: `${RAD.YOZ}:${vacancyId}:${ishsizId}:${s.belgi}`,
    })),
  };
}

/**
 * Рад этишни ёзади ва бандлик марказига хабар қилади.
 *
 * Фуқаро ҳолати `RAD_ETDI` бўлади — воронкадан чиқади, аммо
 * рўйхатдан ЙЎҚОЛМАЙДИ: кейин бошқа таклиф берилиши мумкин.
 */
export async function radniYoz(p: {
  vacancyId: string;
  ishsizId: string;
  sababBelgisi: string;
  xabarchiId: string;
  xabarchiMahallaId: string | null;
}): Promise<{ ok: true; fish: string; sabab: string } | { ok: false; sabab: string }> {
  const sabab = sababMatni(p.sababBelgisi);
  if (!sabab) return { ok: false, sabab: 'Сабаб нотўғри' };

  const odam = await prisma.unemployedPerson.findUnique({
    where: { id: p.ishsizId },
    select: { id: true, fish: true, mahallaId: true, holati: true },
  });
  if (!odam) return { ok: false, sabab: 'Фуқаро топилмади' };

  /*
   * МАҲАЛЛА ИЗОЛЯЦИЯСИ.
   *
   * Тугма белгиси Telegram'дан келади ва уни қўлда ўзгартириш
   * мумкин. Сессия эса йўқ. Шунинг учун текшириш шу ерда:
   * ходим ФАҚАТ ўз маҳалласидаги фуқарони белгилай олади.
   */
  if (odam.mahallaId !== p.xabarchiMahallaId) {
    return { ok: false, sabab: 'Бу фуқаро сизнинг маҳаллангизда эмас' };
  }

  if (!RAD_ETSA_BOLADI.includes(odam.holati as (typeof RAD_ETSA_BOLADI)[number])) {
    return { ok: false, sabab: 'Бу фуқаро аллақачон бошқа ҳолатда' };
  }

  const orin = await prisma.vacancy.findUnique({
    where: { id: p.vacancyId },
    select: { lavozim: true, korxonaNomi: true },
  });

  await prisma.unemployedPerson.update({
    where: { id: odam.id },
    data: { holati: 'RAD_ETDI', radSababi: sabab },
  });

  /*
   * Бандлик марказига хабар.
   *
   * Сабаб ЯЛПИ сон эмас, ҚАРОР учун: маош кам бўлса иш
   * берувчи билан гаплашиш, малака етмаса курс очиш керак.
   */
  const xabarchi = await prisma.user.findUnique({
    where: { id: p.xabarchiId },
    select: { fullName: true, mahalla: { select: { nomiKirill: true } } },
  });

  const rahbarlar = await prisma.user.findMany({
    where: { rol: { in: ['BANDLIK', 'BANDLIK_RAHBAR'] }, faol: true },
    select: { id: true },
  });

  if (rahbarlar.length > 0) {
    const matn = [
      '<b>Фуқаро таклифдан бош тортди</b>',
      '',
      `${odam.fish}`,
      `${xabarchi?.mahalla?.nomiKirill ?? '—'} МФЙ`,
      '',
      ...(orin ? [`Иш ўрни: ${orin.lavozim} — ${orin.korxonaNomi}`] : []),
      `Сабаби: <b>${sabab}</b>`,
      '',
      `Хабар берди: ${xabarchi?.fullName ?? '—'}`,
    ].join('\n');

    const xabarlar: YangiXabar[] = rahbarlar.map((r) => ({
      userId: r.id,
      turi: 'FUQARO_RAD_ETDI' as const,
      matn,
      bogliqTuri: 'UnemployedPerson',
      bogliqId: odam.id,
    }));
    await xabarQoshish(xabarlar);
  }

  return { ok: true, fish: odam.fish, sabab };
}

/**
 * Ходим Telegram'ни УЗДИ — раҳбарга хабар.
 *
 * ── Нега бу муҳим ──
 *
 * Узилган ходимнинг маҳалласига эълон хабари БОРМАЙДИ. Яъни
 * занжир ўша маҳаллада тўхтайди — жимгина, ҳеч қандай хато
 * белгисисиз.
 *
 * Раҳбар буни фақат ойлар ўтиб, «нега бу маҳалладан ҳеч ким
 * жойлашмаяпти» деган саволда сезарди. Энди ўша куниёқ
 * билади.
 */
export async function uzilganiniBildir(userId: string): Promise<number> {
  const xodim = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, rol: true, mahalla: { select: { nomiKirill: true } } },
  });
  /* Фақат маҳалла ходими узилиши занжирга таъсир қилади */
  if (!xodim || xodim.rol !== 'YETTILIK') return 0;

  const rahbarlar = await prisma.user.findMany({
    where: { rol: { in: ['BANDLIK_RAHBAR', 'ADMIN'] }, faol: true },
    select: { id: true },
  });
  if (rahbarlar.length === 0) return 0;

  const matn = [
    '<b>Ходим Telegram уланишини узди</b>',
    '',
    `${xodim.fullName}`,
    `${xodim.mahalla?.nomiKirill ?? '—'} МФЙ`,
    '',
    'Бу маҳаллага бўш иш ўрни хабари энди БОРМАЙДИ.',
    '',
    'Ходим билан боғланинг — ботни қайта улаши керак.',
  ].join('\n');

  return xabarQoshish(
    rahbarlar.map((r) => ({
      userId: r.id,
      turi: 'XODIM_UZILDI' as const,
      matn,
      bogliqTuri: 'User',
      bogliqId: userId,
    }))
  );
}
