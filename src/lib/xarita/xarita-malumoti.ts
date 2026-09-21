import type { IshsizHolati } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { xaritaniUla } from './hududlar';

/**
 * ============================================================
 *  ХАРИТА УЧУН МАЪЛУМОТ
 *
 *  Харита — безак эмас, КЎРСАТКИЧ. Шунинг учун ҳар бир ҳудуд
 *  бешта ўлчов бўйича рақам олади ва ҳоким уларни алмаштириб
 *  кўра олади: қамров, натижа, ишсиз қолдиғи, болалар ва чет
 *  элдагилар.
 *
 *  ── Нега алоҳида модул ──
 *
 *  `tahlil.ts` даги `qamrov` рўйхатида биринчи учтаси бор эди.
 *  Аммо харита иккита панелга қўйилади ва улардан бири
 *  `tahlilOl` ни бошқача кесимда чақиради. Харита ўз
 *  маълумотини ўзи олгани — иккита панелда бир хил рақам
 *  чиқишининг энг содда кафолати.
 *
 *  Сўров учта, ҳаммаси ёнма-ён кетади ва натижа қисқа муддатга
 *  кешланади — панелдаги бошқа блоклар билан бир хил тартиб.
 * ============================================================
 */

/** Харитадаги битта ҳудуд учун барча ўлчов */
export interface XaritaQatori {
  /** Харита файлидаги контур калити */
  hududId: string;
  mahallaId: string;
  nomiKirill: string;

  /** Базадаги аҳоли — хатловдан олдин ҳам маълум */
  bazaAholi: number;
  bazaXonadon: number;
  xatlovXonadon: number;
  /** Хатлов қамрови, % */
  qamrovFoizi: number;

  bazaIshsiz: number;
  aniqlangan: number;
  joylashtirilgan: number;
  /** Аниқланганларнинг нечаси ишга жойлашган, % */
  natijaFoizi: number;
  /** Ҳали рўйхатда турганлар */
  ishsizQoldiq: number;

  /** 17 ёшгача болалар */
  bolalar17: number;
  /** Чет элда ишлаётган ва ўқиётганлар */
  chetElIshchi: number;
}

export interface XaritaMalumoti {
  qatorlar: XaritaQatori[];
  /**
   * Контури бор-у, базада топилмаган ҳудудлар ва аксинча.
   *
   * Экранда АЙТИЛАДИ. Харитада 69 та шакл, рўйхатда 70 та МФЙ
   * бор — фарқни яширсак, битта МФЙ рақами жимгина йўқоларди
   * ва буни ҳеч ким сезмасди.
   */
  ulanmagan: { xaritada: string[]; bazada: string[] };
}

const KESH_MUDDATI_MS = 45 * 1000;
const kesh = new Map<string, { vaqti: number; natija: XaritaMalumoti }>();

export async function xaritaMalumoti(mahallaId?: string): Promise<XaritaMalumoti> {
  const kalit = mahallaId ?? 'tuman';
  const saqlangan = kesh.get(kalit);
  if (saqlangan && Date.now() - saqlangan.vaqti < KESH_MUDDATI_MS) return saqlangan.natija;

  const natija = await hisobla(mahallaId);
  kesh.set(kalit, { vaqti: Date.now(), natija });

  if (kesh.size > 100) {
    const chegara = Date.now() - KESH_MUDDATI_MS;
    for (const [k, v] of kesh) if (v.vaqti < chegara) kesh.delete(k);
  }
  return natija;
}

async function hisobla(mahallaId?: string): Promise<XaritaMalumoti> {
  const filtr = mahallaId ? { mahallaId } : {};

  const [mahallalar, xonadonlar, bosqichlar] = await Promise.all([
    prisma.mahalla.findMany({
      orderBy: { nomi: 'asc' },
      select: {
        id: true,
        nomi: true,
        nomiKirill: true,
        aholi: true,
        xonadon: true,
        ishsiz: true,
      },
    }),

    prisma.household.groupBy({
      by: ['mahallaId'],
      where: { ...filtr, holati: { not: 'QORALAMA' } },
      _count: true,
      _sum: {
        bolalar0_3Yosh: true,
        bolalar3_17Yosh: true,
        chetElIshchilar: true,
      },
    }),

    prisma.unemployedPerson.groupBy({
      by: ['mahallaId', 'holati'],
      where: filtr,
      _count: true,
    }),
  ]);

  const ulanish = xaritaniUla(mahallalar);

  const xonadonXaritasi = new Map(xonadonlar.map((x) => [x.mahallaId, x]));

  const bosqichXaritasi = new Map<string, Map<IshsizHolati, number>>();
  for (const b of bosqichlar) {
    const m = bosqichXaritasi.get(b.mahallaId) ?? new Map<IshsizHolati, number>();
    m.set(b.holati, b._count);
    bosqichXaritasi.set(b.mahallaId, m);
  }

  const foiz = (qism: number, butun: number) =>
    butun > 0 ? Math.round((qism / butun) * 1000) / 10 : 0;

  const qatorlar: XaritaQatori[] = [];

  for (const m of mahallalar) {
    /*
     * ── МАҲАЛЛА ФИЛЬТРИ: ҚАТОР ҲАМ ЧИҚМАЙДИ ──
     *
     * Сўров бир МФЙ билан чегараланганда бошқа МФЙ ларнинг
     * қатори УМУМАН қайтарилмайди.
     *
     * Илгари улар нол қиймат билан қайтарди ва натижада
     * маҳалла ходимининг экранида 68 та бегона МФЙ «0%» бўлиб
     * турди. Бу хато эмас, ЁЛҒОН эди: уларнинг қамрови нол
     * эмас — ходим уларни кўрмайди, холос. Харитада улар
     * «маълумот йўқ» рангида қолиши керак.
     */
    if (mahallaId && m.id !== mahallaId) continue;

    const hududId = ulanish.mahalladanHududga.get(m.id);
    /* Контури йўқ МФЙ харитада чизилмайди — рўйхатда айтилади */
    if (!hududId) continue;

    const x = xonadonXaritasi.get(m.id);
    const b = bosqichXaritasi.get(m.id) ?? new Map<IshsizHolati, number>();

    const aniqlangan = Array.from(b.values()).reduce((s, n) => s + n, 0);
    const joylashtirilgan = (b.get('JOYLASHTIRILDI') ?? 0) + (b.get('TASDIQLANDI') ?? 0);
    const xatlovXonadon = x?._count ?? 0;

    qatorlar.push({
      hududId,
      mahallaId: m.id,
      nomiKirill: m.nomiKirill,

      bazaAholi: m.aholi,
      bazaXonadon: m.xonadon,
      xatlovXonadon,
      qamrovFoizi: foiz(xatlovXonadon, m.xonadon),

      bazaIshsiz: m.ishsiz,
      aniqlangan,
      joylashtirilgan,
      natijaFoizi: foiz(joylashtirilgan, aniqlangan),
      ishsizQoldiq: aniqlangan - joylashtirilgan,

      bolalar17: (x?._sum.bolalar0_3Yosh ?? 0) + (x?._sum.bolalar3_17Yosh ?? 0),
      chetElIshchi: x?._sum.chetElIshchilar ?? 0,
    });
  }

  return {
    qatorlar,
    /*
     * «Харитада контури йўқ» огоҳлантириши — ТУМАН даражасидаги
     * масала. Битта МФЙ кесимида у ортиқча шовқин.
     */
    ulanmagan: mahallaId
      ? { xaritada: [], bazada: [] }
      : {
          xaritada: ulanish.bazadaYoq.map((h) => h.name),
          bazada: ulanish.xaritadaYoq.map((m) => m.nomiKirill),
        },
  };
}
