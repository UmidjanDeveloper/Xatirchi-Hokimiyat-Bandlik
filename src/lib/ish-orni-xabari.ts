import { prisma } from './prisma';
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
