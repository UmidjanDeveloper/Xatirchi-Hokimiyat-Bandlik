import { prisma } from './prisma';
import { FAOL_ELON } from './elon-muddati';
import { xabarQoshish, type YangiXabar } from './xabarnoma';

/**
 * ============================================================
 *  ҲОКИМНИНГ ЭРТАЛАБКИ БРИФИНГИ
 *
 *  ── Нега керак ──
 *
 *  Раҳбар тизимга КИРМАЙДИ. У кун бошида телефонини очади ва
 *  «нима бўлди» деб сўрайди. Агар жавоб учун сайтга кириб,
 *  панелни очиб, филтрни танлаш керак бўлса — у буни
 *  қилмайди, ходимдан оғзаки сўрайди.
 *
 *  Оғзаки жавоб эса ҳар доим яхши бўлиб чиқади.
 *
 *  Шунинг учун тизим ўзи айтади: ҳар куни эрталаб, сўрамасдан.
 *
 *  ── Нега «кеча» ва «жами» бирга ──
 *
 *  Фақат «жами» берилса — ҳаракат кўринмайди: 0,4% бугун ҳам
 *  0,4%. Фақат «кеча» берилса — миқёс кўринмайди: «12 та
 *  хатлов» кўп ёки озлигини айтмайди.
 *
 *  Иккови бирга турганда ҳар иккала савол ҳам жавоб топади.
 *
 *  ── Нега «эътибор» бўлими охирида ──
 *
 *  Раҳбар биринчи икки сатрни албатта ўқийди, охиригача эса
 *  ҳар доим ҳам етиб бормайди. Шунинг учун РАҚАМ тепада,
 *  ТАЛАБ пастда: рақам ўқилса, талаб ҳам ўқилади; тескариси
 *  эса ишламайди.
 * ============================================================
 */

const KUN = 24 * 60 * 60 * 1000;

function raqam(n: number): string {
  return n.toLocaleString('ru-RU').replace(/ /g, ' ');
}

function foiz(qism: number, butun: number): string {
  if (butun <= 0) return '0%';
  const f = (qism / butun) * 100;
  return `${(Math.round(f * 10) / 10).toString().replace('.', ',')}%`;
}

/** Кечаги ўзгариш — ўсиш белгиси билан */
function ozgarish(n: number, birlik: string): string {
  return n > 0 ? `+${raqam(n)} ${birlik}` : `ўзгармади`;
}

export interface Brifing {
  matn: string;
  /** Ҳеч нарса ўзгармаган бўлса ҳам юборилади — жимлик ҳам хабар */
  sana: Date;
}

/**
 * Брифинг матнини ясайди.
 *
 * Сана параметри синов учун: «кеча» ни аниқ белгилаб, натижани
 * текшириш мумкин бўлади.
 */
export async function brifingYasa(hozir: Date = new Date()): Promise<Brifing> {
  const bugunBoshi = new Date(hozir);
  bugunBoshi.setHours(0, 0, 0, 0);
  const kechaBoshi = new Date(bugunBoshi.getTime() - KUN);

  const kecha = { gte: kechaBoshi, lt: bugunBoshi };

  const [
    mahallalar,
    xatlovJami,
    xatlovKecha,
    anketaJami,
    anketaKecha,
    joylashganJami,
    joylashganKecha,
    elonlar,
    boshlagan,
    kechikkan,
    xodimlar,
    ulangan,
    radKecha,
  ] = await Promise.all([
    prisma.mahalla.aggregate({ _count: true, _sum: { xonadon: true, ishsiz: true } }),
    prisma.household.aggregate({
      where: { holati: { not: 'QORALAMA' } },
      _count: true,
      _sum: { ishsizlarSoni: true },
    }),
    prisma.household.count({ where: { holati: { not: 'QORALAMA' }, createdAt: kecha } }),
    prisma.unemployedPerson.count(),
    prisma.unemployedPerson.count({ where: { createdAt: kecha } }),
    prisma.unemployedPerson.count({
      where: { holati: { in: ['JOYLASHTIRILDI', 'TASDIQLANDI'] } },
    }),
    prisma.unemployedPerson.count({
      where: { holati: { in: ['JOYLASHTIRILDI', 'TASDIQLANDI'] }, updatedAt: kecha },
    }),
    prisma.vacancy.count({ where: FAOL_ELON() }),
    prisma.household.groupBy({
      by: ['mahallaId'],
      where: { holati: { not: 'QORALAMA' } },
      _count: true,
    }),
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
    prisma.unemployedPerson.count({ where: { holati: 'RAD_ETDI', updatedAt: kecha } }),
  ]);

  const jamiMahalla = mahallalar._count;
  const jamiXonadon = mahallalar._sum.xonadon ?? 0;
  const topilgan = xatlovJami._sum.ishsizlarSoni ?? 0;
  const anketasiz = Math.max(0, topilgan - anketaJami);
  const boshlamagan = jamiMahalla - boshlagan.length;

  /*
   * ── КЕЧА ЭНГ КЎП ИШЛАГАН УЧТА МАҲАЛЛА ──
   *
   * Ном билан айтилади. Давлат тизимида кўринадиган мақтов
   * рақамдан кучлироқ ишлайди — ва эртага бошқалар ҳам
   * рўйхатга тушишни хоҳлайди.
   */
  const kechaMahalla = await prisma.household.groupBy({
    by: ['mahallaId'],
    where: { holati: { not: 'QORALAMA' }, createdAt: kecha },
    _count: true,
    orderBy: { _count: { mahallaId: 'desc' } },
    take: 3,
  });

  const nomlar = new Map(
    (
      await prisma.mahalla.findMany({
        where: { id: { in: kechaMahalla.map((k) => k.mahallaId) } },
        select: { id: true, nomiKirill: true },
      })
    ).map((m) => [m.id, m.nomiKirill])
  );

  const sana = kechaBoshi.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  const satrlar: string[] = [
    '<b>Хатирчи бандлик — эрталабки маълумот</b>',
    `${sana} куни бўйича`,
    '',
    '<b>КЕЧА</b>',
    `• Хатлов: ${ozgarish(xatlovKecha, 'хонадон')}`,
    `• Шахсий анкета: ${ozgarish(anketaKecha, 'та')}`,
    `• Ишга жойлашган: ${ozgarish(joylashganKecha, 'та')}`,
  ];

  if (radKecha > 0) {
    satrlar.push(`• Таклифдан бош тортган: ${raqam(radKecha)} та`);
  }

  if (kechaMahalla.length > 0) {
    satrlar.push(
      '',
      'Энг фаол маҳаллалар:',
      ...kechaMahalla.map(
        (k, i) =>
          `  ${i + 1}. ${nomlar.get(k.mahallaId) ?? '—'} — ${raqam(k._count)} хонадон`
      )
    );
  }

  satrlar.push(
    '',
    '<b>ЖАМИ</b>',
    `• Хатлов қамрови: ${raqam(xatlovJami._count)} / ${raqam(jamiXonadon)} · ${foiz(xatlovJami._count, jamiXonadon)}`,
    `• Хатлов топган ишсиз: ${raqam(topilgan)} та`,
    `• Шахсий анкетаси бор: ${raqam(anketaJami)} та`,
    `• Ишга жойлаштирилган: ${raqam(joylashganJami)} та`,
    `• Очиқ иш ўрни: ${raqam(elonlar)} та`
  );

  /*
   * ── ЭЪТИБОР ТАЛАБ ҚИЛАДИГАНЛАР ──
   *
   * Фақат ҲАҚИҚАТАН муаммо бўлганлари ёзилади. Ҳар куни бир
   * хил рўйхат чиқса, раҳбар уни ўқимай қўяди — ва ўша куни
   * ҳақиқий муаммо ҳам ўтиб кетади.
   */
  const etibor: string[] = [];

  if (boshlamagan > 0) {
    etibor.push(
      `• <b>${raqam(boshlamagan)} та маҳалла</b> хатловни ҳали бошламаган (${jamiMahalla} тадан)`
    );
  }
  if (anketasiz > 0) {
    etibor.push(
      `• <b>${raqam(anketasiz)} та фуқаро</b> топилган, аммо шахсий анкетаси тўлдирилмаган — уларга таклиф бериб бўлмайди`
    );
  }
  if (ulangan < xodimlar) {
    etibor.push(
      `• <b>${raqam(xodimlar - ulangan)} та ходим</b> ботга уланмаган — уларнинг маҳалласига эълон хабари бормайди`
    );
  }
  if (kechikkan > 0) {
    etibor.push(`• <b>${raqam(kechikkan)} та топшириқнинг</b> муддати ўтган`);
  }
  if (elonlar === 0) {
    etibor.push('• Очиқ иш ўрни йўқ — таклиф қиладиган нарса қолмади');
  }

  if (etibor.length > 0) {
    satrlar.push('', '<b>ЭЪТИБОР</b>', ...etibor);
  } else {
    satrlar.push('', '<b>ЭЪТИБОР</b>', '• Алоҳида чора талаб қиладиган ҳолат йўқ.');
  }

  return { matn: satrlar.join('\n'), sana: kechaBoshi };
}

/**
 * Брифингни навбатга қўяди.
 *
 * Кимга: ҳоким, бандлик раҳбари ва администратор. Маҳалла
 * ходимига эмас — унга туман кесимидаги сон керак эмас, ўз
 * маҳалласи керак, ва у меню орқали кўради.
 */
export async function brifingniYubor(hozir: Date = new Date()): Promise<number> {
  const { matn } = await brifingYasa(hozir);

  const oluvchilar = await prisma.user.findMany({
    where: { rol: { in: ['HOKIM', 'BANDLIK_RAHBAR', 'ADMIN'] }, faol: true },
    select: { id: true },
  });
  if (oluvchilar.length === 0) return 0;

  const xabarlar: YangiXabar[] = oluvchilar.map((o) => ({
    userId: o.id,
    turi: 'ERTALABKI_BRIFING' as const,
    matn,
    bogliqTuri: 'Brifing',
    bogliqId: hozir.toISOString().slice(0, 10),
  }));

  return xabarQoshish(xabarlar);
}
