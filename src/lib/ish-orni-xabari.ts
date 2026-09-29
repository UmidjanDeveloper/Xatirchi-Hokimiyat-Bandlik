import { prisma } from './prisma';
import { FAOL_ELON } from './elon-muddati';
import { orinTaqsimoti } from './taqsimot';
import { ishOrniMatni, xabarQoshish, type YangiXabar } from './xabarnoma';

/**
 * ============================================================
 *  ЭЪЛОН → ХАБАР ЗАНЖИРИ
 *
 *  Бандлик ходими бўш иш ўрни эълонини киритади. Кимга хабар
 *  кетиши керак?
 *
 *  Жавоб мавжуд тақсимот ҳисобидан келади (`taqsimot.ts`):
 *  қайси маҳаллаларда мос номзод бор — ўшаларнинг ходимига.
 *  Ва ҳар доим ЭЪЛОН ЭГАСИ бўлган маҳаллага — унда мос номзод
 *  топилмаса ҳам, чунки ходим одамларни рўйхатдан яхшироқ
 *  билади.
 *
 *  ── Нега 70 тасига эмас ──
 *
 *  Ҳар эълон 70 та ходимга юборилса, бир ҳафтада улар
 *  хабарларни умуман очмай қўяди. Шунда ҲАҚИҚАТАН керакли
 *  хабар ҳам эътиборсиз ўтади.
 * ============================================================
 */

/** Bitta e'lon uchun xabarlarni navbatga qo'yadi. Qaytaradi: nechta. */
export async function ishOrniXabarlari(vacancyId: string): Promise<number> {
  const orin = await prisma.vacancy.findUnique({
    where: { id: vacancyId },
    select: {
      id: true,
      lavozim: true,
      korxonaNomi: true,
      ornlarSoni: true,
      mahallaId: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });
  if (!orin) return 0;

  const taqsimot = await orinTaqsimoti(vacancyId);

  /*
   * Тақсимотдаги маҳаллалар + эълон эгаси бўлган маҳалла.
   * `Map` такрорни ўзи олиб ташлайди: эълон эгаси тақсимотда
   * ҳам бўлиши мумкин ва унга икки марта хабар кетмаслиги
   * керак.
   */
  const mahallalar = new Map<string, number>();
  mahallalar.set(orin.mahallaId, 0);
  for (const u of taqsimot?.ulushlar ?? []) {
    mahallalar.set(u.mahallaId, u.nomzodlar);
  }

  /*
   * Хабар ФАҚАТ маҳалла ходимига кетади. Бандлик маркази
   * эълонни ўзи киритган — унга хабар бериш маънисиз.
   */
  const xodimlar = await prisma.user.findMany({
    where: {
      rol: 'YETTILIK',
      faol: true,
      mahallaId: { in: [...mahallalar.keys()] },
      /* Telegram ни боғламаганларга навбат тўлдирмаймиз */
      telegramChatId: { not: null },
    },
    select: { id: true, mahallaId: true },
  });

  const xabarlar: YangiXabar[] = xodimlar.map((x) => ({
    userId: x.id,
    turi: 'YANGI_ISH_ORNI' as const,
    matn: ishOrniMatni({
      lavozim: orin.lavozim,
      korxonaNomi: orin.korxonaNomi,
      mahallaNomi: orin.mahalla.nomiKirill,
      bosh: orin.ornlarSoni,
      nomzodlar: mahallalar.get(x.mahallaId ?? '') ?? 0,
    }),
    bogliqTuri: 'Vacancy',
    bogliqId: orin.id,
  }));

  return xabarQoshish(xabarlar);
}


/* ═══════════════════════════════════════════════════════════ */

/**
 * Ходим Telegram ни ЭНДИ улади — унга маҳалласидаги ОЧИҚ
 * эълонларни юборади.
 *
 * ── Нега керак ──
 *
 * Хабар эълон қўйилган ПАЙТДА ясалади. Ўша пайтда уланмаган
 * ходим рўйхатга умуман тушмайди — `ish-orni-xabari.ts`
 * `telegramChatId: { not: null }` шартини қўяди.
 *
 * Кейин уланиши эса эски хабарни тикламайди. Натижада:
 *
 *   душанба:  эълон қўйилди, ходим уланмаган  → хабар йўқ
 *   сешанба:  ходим уланди                    → эълон ҳали очиқ
 *   ...       ходим ундан бехабар
 *
 * 70 та ходим кунлар давомида бирма-бир уланади, ва ҳар бири
 * ўзидан олдинги эълонларни умуман кўрмайди. Эълон эса очиқ
 * турибди ва одам кутяпти.
 *
 * Энди уланиш ҳам хабар сабаби бўлади.
 *
 * ── Нега энг кўпи бештаси ──
 *
 * Ўн бешта эълон кетма-кет тушса, ходим уларни ўқимайди —
 * биринчи кунданоқ хабарларни эътиборсиз қолдиришни
 * бошлайди. Энг янги бештаси етарли, қолгани сайтда.
 */
export const ULANGANDA_ENG_KOP = 5;

export async function ulangandaOchiqOrinlar(userId: string): Promise<number> {
  const xodim = await prisma.user.findUnique({
    where: { id: userId },
    select: { mahallaId: true, telegramChatId: true },
  });
  /* Уланмаган бўлса юборадиган жой йўқ */
  if (!xodim?.mahallaId || !xodim.telegramChatId) return 0;

  /*
   * Фақат ЎЗ маҳалласидаги эълонлар.
   *
   * Бошқа маҳалла эълонлари учун тақсимотни ҳар бирига
   * алоҳида ҳисоблаш керак бўларди — ўнлаб эълонда бу оғир
   * иш. Ўз маҳалласидагилар эса ҳар доим тегишли ва бир
   * сўров билан олинади.
   *
   * Бошқа маҳалладаги мос эълонни ходим кейинги ЯНГИ эълонда
   * олади — ўшанда тақсимот аллақачон ҳисобланади.
   */
  const orinlar = await prisma.vacancy.findMany({
    where: { ...FAOL_ELON(), mahallaId: xodim.mahallaId },
    orderBy: { createdAt: 'desc' },
    take: ULANGANDA_ENG_KOP,
    select: {
      id: true,
      lavozim: true,
      korxonaNomi: true,
      ornlarSoni: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });
  if (orinlar.length === 0) return 0;

  /*
   * Аллақачон юборилган эълон ҚАЙТА юборилмайди.
   *
   * Ходим Telegram ни узиб, яна улаши мумкин — ва ҳар
   * улаганида ўша эълонлар қайтадан келса, бу шовқин бўларди.
   */
  const yuborilgan = await prisma.xabarnoma.findMany({
    where: {
      userId,
      turi: 'YANGI_ISH_ORNI',
      bogliqId: { in: orinlar.map((o) => o.id) },
    },
    select: { bogliqId: true },
  });
  const borlar = new Set(yuborilgan.map((x) => x.bogliqId));

  const yangilar = orinlar.filter((o) => !borlar.has(o.id));
  if (yangilar.length === 0) return 0;

  const xabarlar: YangiXabar[] = yangilar.map((o) => ({
    userId,
    turi: 'YANGI_ISH_ORNI' as const,
    matn: ishOrniMatni({
      lavozim: o.lavozim,
      korxonaNomi: o.korxonaNomi,
      mahallaNomi: o.mahalla.nomiKirill,
      bosh: o.ornlarSoni,
      nomzodlar: 0,
    }),
    bogliqTuri: 'Vacancy',
    bogliqId: o.id,
  }));

  return xabarQoshish(xabarlar);
}
