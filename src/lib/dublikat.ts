import type { Prisma } from '@prisma/client';
import { prisma, type Tranzaksiya } from './prisma';
import { lotinga } from './alifbo';

/**
 * ============================================================
 *  ДУБЛИКАТ ФУҚАРО
 *
 *  Бир одам ИККИ хонадонда ёзилиб қолиши мумкин. Энг кўп
 *  учрайдиган ҳол — КЕЛИН: у эрининг хонадонида ҳам,
 *  ота-онасиникида ҳам «оила аъзоси» бўлиб турибди. Яна:
 *  армиядан қайтган ўғил, алоҳида яшай бошлаган ака-ука,
 *  икки маҳалла чегарасидаги уй.
 *
 *  Зарари аниқ: ишсизлар сони ошиб кўринади, қамров фоизи
 *  бузилади, нафақа ёки ваучер икки марта берилиши мумкин.
 *
 *  ── Нега оддий таққослаш етмайди ──
 *
 *  Исм ЛОТИН ва КИРИЛЛДА ёзилади: битта ходим «Тошматов
 *  Акрам» деб ёзади, бошқаси «Toshmatov Akram». Апостроф
 *  беш хил белги билан қўйилади (' ’ ʻ ` ´). Бўш жой икки
 *  марта босилади. Бу ҳаммаси БИР ХИЛ одам.
 *
 *  Шунинг учун таққослашдан олдин исм ЯГОНА кўринишга
 *  келтирилади: кириллдан лотинга ўгирилади, апострофлар
 *  олиб ташланади, бўш жойлар бирлаштирилади.
 *
 *  ── Нега автоматик бирлаштирилмайди ──
 *
 *  Тизим «бу бир одам» деб ҚАРОР ҚИЛМАЙДИ. Бир хил исмли икки
 *  киши ҳақиқатан бўлиши мумкин — қишлоқда ака-ука фарзандлари
 *  кўпинча бир хил номланади.
 *
 *  Шунинг учун натижа — ГУМОН, ва уни одам кўриб ҳал қилади.
 *  Автоматик ўчириш ҳақиқий фуқарони рўйхатдан чиқариб
 *  юбориши мумкин эди, буни эса ҳеч ким сезмасди.
 * ============================================================
 */

/**
 * Исмни таққослаш учун ягона кўринишга келтиради.
 *
 * «Тошматов Акрам Умарович» ва «Toshmatov Akram Umarovich»
 * иккови ҳам `toshmatov akram umarovich` бўлади.
 */
export function ismKaliti(ism: string): string {
  return lotinga(ism)
    .toLowerCase()
    /* Апострофнинг барча кўринишлари — ҳар ходим бошқасини босади */
    .replace(/[‘’ʻʼ`´′']/g, '')
    /* Ҳарф ва рақамдан бошқа ҳамма нарса бўш жойга */
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Телефонни таққослаш учун: фақат сўнгги 9 рақам */
export function telefonKaliti(tel: string | null): string | null {
  if (!tel) return null;
  const raqamlar = tel.replace(/\D/g, '');
  return raqamlar.length >= 9 ? raqamlar.slice(-9) : null;
}

/** Туғилган санани кун аниқлигида калитга айлантиради */
function sanaKaliti(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Гумон даражаси — қанча белги мос келгани */
export type GumonDarajasi = 'yuqori' | 'orta' | 'past';

/**
 * Бир хил исмли ёзувлар ГУРУҲИ.
 *
 * ── Нега жуфтлик эмас, гуруҳ ──
 *
 * Аввал ҳар жуфтлик алоҳида қатор эди. Бир исм тўрт марта
 * такрорланса, 4×3/2 = 6 та қатор чиқарди ва ҳаммаси деярли
 * бир хил кўринарди. Ходим бунақа рўйхатни ўқимайди.
 *
 * Гуруҳда эса битта сарлавҳа — исм — ва остида барча ёзув.
 * «Тўрт жойда ёзилган» деган хабар ҳам дарҳол кўринади.
 */
export interface Dublikat {
  /** Таққослаш калити — ичкарида ишлатилади */
  kalit: string;
  /** Бир хил исмли барча ёзувлар — камида иккита */
  yozuvlar: DublikatYozuvi[];
  daraja: GumonDarajasi;
  /** Нима мос келгани — ходимга кўрсатилади */
  sabablar: string[];
}

export interface DublikatYozuvi {
  id: string;
  fish: string;
  telefon: string | null;
  tugilganSana: Date | null;
  mahallaNomi: string;
  householdId: string | null;
  oilaBoshligi: string | null;
  manzil: string | null;
}

/**
 * Икки ёзувни таққослайди.
 *
 * ── Даража нимага асосланади ──
 *
 *   ЮҚОРИ — исм + туғилган сана, ёки исм + телефон.
 *           Иккита белги мос келса, тасодиф бўлиши қийин.
 *   ЎРТА  — исм + бир хил маҳалла. Бир маҳаллада бир хил
 *           исмли икки ишсиз — текшириш арзийди.
 *   ПАСТ  — фақат исм, ҳар хил маҳалла. Кўпинча бошқа одам,
 *           лекин келин бошқа маҳаллага узатилган бўлиши ҳам
 *           мумкин — шунинг учун кўрсатилади, аммо пастда.
 */
function darajaAniqla(
  a: { telefon: string | null; tugilganSana: Date | null; mahallaId: string },
  b: { telefon: string | null; tugilganSana: Date | null; mahallaId: string }
): { daraja: GumonDarajasi; sabablar: string[] } {
  const sabablar = ['Исм-фамилия бир хил'];

  const sanaA = sanaKaliti(a.tugilganSana);
  const sanaB = sanaKaliti(b.tugilganSana);
  const sanaMos = sanaA !== null && sanaA === sanaB;

  const telA = telefonKaliti(a.telefon);
  const telB = telefonKaliti(b.telefon);
  const telMos = telA !== null && telA === telB;

  if (sanaMos) sabablar.push('Туғилган сана ҳам бир хил');
  if (telMos) sabablar.push('Телефон рақами ҳам бир хил');
  if (a.mahallaId === b.mahallaId) sabablar.push('Битта МФЙ да');

  if (sanaMos || telMos) return { daraja: 'yuqori', sabablar };
  if (a.mahallaId === b.mahallaId) return { daraja: 'orta', sabablar };
  return { daraja: 'past', sabablar };
}

/**
 * Битта фуқарога ўхшаш бошқа ёзувларни излайди.
 *
 * Хатлов сақланганда чақирилади: ходим шу заҳоти «бу одам
 * аллақачон рўйхатда» деган огоҳлантириш кўради, олти ойдан
 * кейин эмас.
 */
export async function ozgaYozuvlar(
  ishsizId: string,
  tx?: Tranzaksiya
): Promise<Dublikat | null> {
  const db = tx ?? prisma;

  const men = await db.unemployedPerson.findUnique({
    where: { id: ishsizId },
    select: TANLOV,
  });
  if (!men) return null;

  const kalit = ismKaliti(men.fish);

  /*
   * Исм бўйича БАЗАДА фильтрлаб бўлмайди: у «Тошматов» ни
   * «Toshmatov» билан тенг деб билмайди. Шунинг учун ёзувлар
   * кенгроқ олинади ва солиштириш кодда бўлади. Туман
   * даражасида бу бир неча минг ёзув, яъни оғир эмас.
   */
  const barchasi = await db.unemployedPerson.findMany({
    where: { id: { not: ishsizId } },
    select: TANLOV,
  });

  const oxshashlar = barchasi.filter((b) => ismKaliti(b.fish) === kalit);
  if (oxshashlar.length === 0) return null;

  return guruhYasa(kalit, [men, ...oxshashlar]);
}

/**
 * Гуруҳ ясайди: даражани ЭНГ КУЧЛИ жуфтлик бўйича аниқлайди.
 *
 * Тўрт ёзувдан иккитасининг туғилган санаси бир хил бўлса,
 * бутун гуруҳ «юқори гумон» бўлади — чунки ўша иккитасини
 * текшириш керак, қолгани эса ёнида турибди.
 */
function guruhYasa(kalit: string, yozuvlar: Xom[]): Dublikat {
  let eng: { daraja: GumonDarajasi; sabablar: string[] } = {
    daraja: 'past',
    sabablar: ['Исм-фамилия бир хил'],
  };
  const tartib: Record<GumonDarajasi, number> = { yuqori: 0, orta: 1, past: 2 };

  for (let i = 0; i < yozuvlar.length; i++) {
    for (let j = i + 1; j < yozuvlar.length; j++) {
      const n = darajaAniqla(yozuvlar[i], yozuvlar[j]);
      if (tartib[n.daraja] < tartib[eng.daraja]) eng = n;
    }
  }

  return {
    kalit,
    yozuvlar: yozuvlar.map(yozuvga),
    daraja: eng.daraja,
    sabablar: eng.sabablar,
  };
}

const TANLOV = {
  id: true,
  fish: true,
  telefon: true,
  tugilganSana: true,
  mahallaId: true,
  householdId: true,
  mahalla: { select: { nomiKirill: true } },
  household: { select: { oilaBoshligi: true, manzil: true } },
} as const;

type Xom = Prisma.UnemployedPersonGetPayload<{ select: typeof TANLOV }>;

function yozuvga(x: Xom): DublikatYozuvi {
  return {
    id: x.id,
    fish: x.fish,
    telefon: x.telefon,
    tugilganSana: x.tugilganSana,
    mahallaNomi: x.mahalla.nomiKirill,
    householdId: x.householdId,
    oilaBoshligi: x.household?.oilaBoshligi ?? null,
    manzil: x.household?.manzil ?? null,
  };
}

/**
 * Бутун туман бўйича дубликатларни излайди — рўйхат учун.
 *
 * `mahallaId` берилса, фақат ўша МФЙ нинг ёзуви қатнашган
 * гуруҳлар қайтади. Гуруҳнинг қолган ёзувлари БОШҚА МФЙ дан
 * бўлиши мумкин ва бу атайлаб шундай: келин айнан бошқа
 * маҳаллага узатилади ва уни фақат шундай топиш мумкин.
 */
export async function barchaDublikatlar(mahallaId?: string): Promise<Dublikat[]> {
  const barchasi = await prisma.unemployedPerson.findMany({ select: TANLOV });

  /* Исм калити бўйича гуруҳлаш */
  const guruhlar = new Map<string, Xom[]>();
  for (const x of barchasi) {
    const k = ismKaliti(x.fish);
    if (!k) continue;
    const g = guruhlar.get(k);
    if (g) g.push(x);
    else guruhlar.set(k, [x]);
  }

  const natija: Dublikat[] = [];
  for (const [kalit, g] of guruhlar) {
    if (g.length < 2) continue;
    if (mahallaId && !g.some((x) => x.mahallaId === mahallaId)) continue;
    natija.push(guruhYasa(kalit, g));
  }

  const tartib: Record<GumonDarajasi, number> = { yuqori: 0, orta: 1, past: 2 };
  return natija.sort(
    (x, y) => tartib[x.daraja] - tartib[y.daraja] || y.yozuvlar.length - x.yozuvlar.length
  );
}
