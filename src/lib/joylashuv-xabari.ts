import { prisma } from './prisma';
import { joylashtirishAmali } from './joylashtirish';
import { xabarQoshish, type YangiXabar } from './xabarnoma';

/**
 * ============================================================
 *  «ИШ ТОПДИМ» ЗАНЖИРИ
 *
 *  Маҳалла ходими Telegram'даги тугмани босади → марказ
 *  тасдиқлайди → фуқаро расман жойлаштирилади.
 *
 *  Ҳар ҳалқанинг ЎЗ мақсади ва ЎЗ фойдаси бор:
 *
 *    ходим босади    → дала билими тизимга тушади
 *                      (акс ҳолда маҳаллада қолиб кетарди)
 *    марказга топшириқ → рақам ҳужжат билан тасдиқланади
 *                      (70 та ходим рақамни ўзи ўзгартирмайди)
 *    раҳбарга хабар   → у тасдиқни кутмай кўради
 *    тасдиқлангач     → ходимга «раҳмат», ҳокимга «таъминланди»
 *
 *  ── Нега бу ерда, роут ичида эмас ──
 *
 *  Занжирга ИККИ томондан кирилади: Telegram тугмаси ва
 *  иловадаги тасдиқлаш. Мантиқ иккита жойда ёзилса, бири
 *  ўзгарганда иккинчиси эскириб қоларди — ва фарқни фақат
 *  рақамлар бузилганда сезардик.
 * ============================================================
 */

/** Марказ шунча кун ичида тасдиқласин */
export const TASDIQLASH_MUDDATI_KUN = 5;

export type XabarNatijasi =
  | { ok: true; xabarId: string; allaqachon: boolean }
  | { ok: false; sabab: string };

/**
 * Маҳалла ходимининг «иш топдим» хабарини ёзади.
 *
 * Фуқаронинг ҳолатига ТЕГМАЙДИ: расмий жойлаштириш марказ
 * тасдиқлагандан кейин бўлади.
 */
export async function ishTopildiXabari(p: {
  vacancyId: string;
  ishsizId: string;
  xabarchiId: string;
  /** Ходимнинг маҳалласи — изоляция шу ерда текширилади */
  xabarchiMahallaId: string | null;
}): Promise<XabarNatijasi> {
  const [orin, odam] = await Promise.all([
    prisma.vacancy.findUnique({
      where: { id: p.vacancyId },
      select: { id: true, faol: true, lavozim: true, korxonaNomi: true },
    }),
    prisma.unemployedPerson.findUnique({
      where: { id: p.ishsizId },
      select: { id: true, fish: true, mahallaId: true, holati: true, vacancyId: true },
    }),
  ]);

  if (!orin) return { ok: false, sabab: 'Эълон топилмади' };
  if (!odam) return { ok: false, sabab: 'Фуқаро топилмади' };

  /*
   * ── ИЗОЛЯЦИЯ ──
   *
   * Тугма Telegram'дан келади, яъни сессия йўқ. Ходим бошқа
   * маҳалланинг фуқароси учун хабар ёза олмаслиги керак —
   * `callback_data` ни қўлда ёзиш мумкин.
   */
  if (p.xabarchiMahallaId && odam.mahallaId !== p.xabarchiMahallaId) {
    return { ok: false, sabab: 'Бу фуқаро сизнинг маҳаллангизда эмас' };
  }

  if (!orin.faol) return { ok: false, sabab: 'Эълон ёпилган' };
  if (odam.vacancyId) return { ok: false, sabab: 'Фуқаро аллақачон жойлаштирилган' };

  const muddat = new Date();
  muddat.setDate(muddat.getDate() + TASDIQLASH_MUDDATI_KUN);

  /*
   * Такрор босишда `@@unique([vacancyId, ishsizId])` ишлайди.
   * `upsert` эса хатосиз ўтади ва мавжудини қайтаради —
   * ходим «босилмади шекилли» деб иккинчи марта босганда
   * иккита хабар туғилмайди.
   */
  const mavjud = await prisma.joylashuvXabari.findUnique({
    where: { vacancyId_ishsizId: { vacancyId: p.vacancyId, ishsizId: p.ishsizId } },
    select: { id: true },
  });
  if (mavjud) return { ok: true, xabarId: mavjud.id, allaqachon: true };

  const yozuv = await prisma.joylashuvXabari.create({
    data: {
      vacancyId: p.vacancyId,
      ishsizId: p.ishsizId,
      xabarchiId: p.xabarchiId,
      muddat,
    },
    select: { id: true },
  });

  /* Раҳбарлар тасдиқни КУТМАЙ кўради */
  await rahbarlarniOgohlantir({
    turi: 'ISH_TOPILDI',
    matn: ishTopildiMatni({
      fish: odam.fish,
      lavozim: orin.lavozim,
      korxonaNomi: orin.korxonaNomi,
      kun: TASDIQLASH_MUDDATI_KUN,
    }),
    bogliqId: yozuv.id,
  });

  return { ok: true, xabarId: yozuv.id, allaqachon: false };
}

/**
 * Хабарни кимга юбориш: бандлик маркази ва ҳокимият.
 *
 * Маҳаллага бириктирилган ходим бу рўйхатга кирмайди — хабар
 * ТУМАН даражасидаги қарор учун.
 */
async function rahbarlarniOgohlantir(x: {
  turi: 'ISH_TOPILDI' | 'JOYLASHUV_TASDIQLANDI';
  matn: string;
  bogliqId: string;
}): Promise<number> {
  /*
   * `telegramChatId` бўйича ФИЛЬТРЛАНМАЙДИ.
   *
   * Илгари фильтр бор эди ва натижа шундай бўларди: раҳбар
   * Telegram'ни уламаган бўлса, хабар УМУМАН яратилмасди —
   * на навбатда, на ҳисоботда из қолмасди. Яъни занжир
   * жимгина узиларди.
   *
   * Энди хабар ҳар доим яратилади. Уланмаган ходимники
   * навбатда БЕКОР бўлади ва администратор панелида
   * «Ходим Telegram ни боғламаган» деб кўринади — муаммо
   * КЎРИНАДИГАН жойда туради.
   */
  const rahbarlar = await prisma.user.findMany({
    where: {
      rol: { in: ['BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM'] },
      faol: true,
    },
    select: { id: true },
  });
  if (!rahbarlar.length) return 0;

  const xabarlar: YangiXabar[] = rahbarlar.map((r) => ({
    userId: r.id,
    turi: x.turi,
    matn: x.matn,
    bogliqTuri: 'JoylashuvXabari',
    bogliqId: x.bogliqId,
  }));
  return xabarQoshish(xabarlar);
}

/**
 * Марказ хабарни ТАСДИҚЛАЙДИ — фуқаро расман жойлаштирилади.
 *
 * Занжирнинг охирги ҳалқаси. Шу ергача фуқаронинг ҳолати
 * ўзгармаган эди: маҳалла ходими хабар берган, аммо рақам
 * ҳали ҳужжат билан тасдиқланмаган.
 *
 * Жойлаштириш `joylashtirishAmali` орқали — иловадагиси
 * билан АЙНАН бир хил мантиқ.
 */
export async function xabarniTasdiqla(p: {
  xabarId: string;
  kim: { userId: string; rol: import('@prisma/client').Rol; mahallaId: string | null };
  izoh?: string | null;
}): Promise<{ ok: true; fish: string } | { ok: false; sabab: string }> {
  const xabar = await prisma.joylashuvXabari.findUnique({
    where: { id: p.xabarId },
    select: {
      id: true,
      holati: true,
      vacancyId: true,
      ishsizId: true,
      xabarchiId: true,
      ishsiz: { select: { fish: true, mahalla: { select: { nomiKirill: true } } } },
      vacancy: { select: { lavozim: true, korxonaNomi: true } },
    },
  });
  if (!xabar) return { ok: false, sabab: 'Хабар топилмади' };
  if (xabar.holati !== 'XABAR_QILINDI') {
    return { ok: false, sabab: 'Хабар аллақачон ҳал қилинган' };
  }

  const natija = await prisma.$transaction(async (tx) => {
    const amal = await joylashtirishAmali(tx, {
      orinId: xabar.vacancyId,
      ishsizId: xabar.ishsizId,
      kim: p.kim,
    });
    if ('xato' in amal) return amal;

    await tx.joylashuvXabari.update({
      where: { id: xabar.id },
      data: {
        holati: 'TASDIQLANDI',
        halQilganId: p.kim.userId,
        halQilinganSana: new Date(),
        izoh: p.izoh ?? null,
      },
    });
    return amal;
  });

  /*
   * `?? ` — транзакция қайтарган бирлашма турида `xato`
   * ихтиёрий бўлиб кўринади. Амалда у доим бор, аммо
   * захира матн қолдирилади: ходимга бўш сабаб кўрсатилмасин.
   */
  if ('xato' in natija) {
    return { ok: false, sabab: natija.xato ?? 'Жойлаштириб бўлмади' };
  }

  const matn = tasdiqlandiMatni({
    fish: xabar.ishsiz.fish,
    lavozim: xabar.vacancy.lavozim,
    korxonaNomi: xabar.vacancy.korxonaNomi,
    mahallaNomi: xabar.ishsiz.mahalla.nomiKirill,
  });

  /* Раҳбарларга — «таъминланди» */
  await rahbarlarniOgohlantir({
    turi: 'JOYLASHUV_TASDIQLANDI',
    matn,
    bogliqId: xabar.id,
  });

  /*
   * Хабар қилган ходимга ҲАМ. Усиз занжир унинг учун очиқ
   * қоларди: тугмани босди-ю, нима бўлганини билмасди — ва
   * кейинги сафар босишга иккиланарди.
   */
  await xabarQoshish([
    {
      userId: xabar.xabarchiId,
      turi: 'JOYLASHUV_TASDIQLANDI',
      matn: [
        '<b>Хабарингиз тасдиқланди</b>',
        '',
        `${xabar.ishsiz.fish} расман ишга жойлашди.`,
        '',
        'Раҳмат — маълумотингиз туман ҳисоботига кирди.',
      ].join('\n'),
      bogliqTuri: 'JoylashuvXabari',
      bogliqId: xabar.id,
    },
  ]);

  return { ok: true, fish: xabar.ishsiz.fish };
}

/** Маҳалла ходими хабар қилганда — раҳбарларга */
export function ishTopildiMatni(x: {
  fish: string;
  lavozim: string;
  korxonaNomi: string;
  kun: number;
}): string {
  return [
    '<b>Маҳалла ходими иш топди</b>',
    '',
    `${xavfsizMatn(x.fish)} — ${xavfsizMatn(x.lavozim)}, ${xavfsizMatn(x.korxonaNomi)}`,
    '',
    `Тасдиқлаш учун <b>${x.kun} кун</b> бор. Тасдиқлангунча фуқаро расман жойлаштирилмайди.`,
    '',
    'Бандлик панелидан тасдиқланг: /bandlik',
  ].join('\n');
}

/** Марказ тасдиқлагач — ҳокимга ва хабар қилган ходимга */
export function tasdiqlandiMatni(x: {
  fish: string;
  lavozim: string;
  korxonaNomi: string;
  mahallaNomi: string;
}): string {
  return [
    '<b>Фуқаро иш билан таъминланди</b>',
    '',
    `${xavfsizMatn(x.fish)} — ${xavfsizMatn(x.mahallaNomi)} МФЙ`,
    `${xavfsizMatn(x.lavozim)}, ${xavfsizMatn(x.korxonaNomi)}`,
    '',
    'Бандлик маркази тасдиқлади.',
  ].join('\n');
}

/**
 * HTML белгиларини зарарсизлантиради.
 *
 * Хабар `parse_mode: HTML` билан кетади ва исмда `<` бўлса
 * Telegram бутун хабарни рад этарди.
 */
function xavfsizMatn(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
