import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { bazaXatosi } from '@/lib/baza-xatosi';
import { choralarniYoz, yangiChoralar, type ChoraManbai } from '@/lib/chora-yaratish';

/**
 * ============================================================
 *  ЭСКИ ХАТЛОВЛАРДАН ЧОРА-ТАДБИР ЯРАТИШ — ПАНЕЛ ОРҚАЛИ
 *
 *  ── Нега йўл сифатида ҳам керак ──
 *
 *  Бу ишни қиладиган скрипт бор:
 *  `npx tsx scripts/chora-toldirish.ts --yoz`. Аммо уни ишга
 *  тушириш учун терминал, клонланган лойиҳа ва база пароли
 *  керак. Ҳокимиятда булар йўқ — у ерда браузер бор.
 *
 *  Шунинг учун худди ўша занжир бир тугма остига қўйилди.
 *  Иккови БИТТА кодни чақиради (`yangiChoralar` ва
 *  `choralarniYoz`) — демак «скрипт бошқа қилди, тугма бошқа
 *  қилди» деган ҳолат бўлмайди.
 *
 *  ── Нега аввал кўрсатади ──
 *
 *  GET — фақат САНАЙДИ, ҳеч нарса ёзмайди. POST — ёзади.
 *  Администратор аввал «61 та топшириқ чиқади» деганини
 *  кўради, кейин босади. Чунки бу топшириқлар реал ходимларга
 *  юкланади ва орқага қайтариш осон эмас.
 *
 *  ── Нега такрор босиш хавфсиз ──
 *
 *  Ҳар топшириқ `muammo` матни бўйича танилади: шу хонадонда
 *  шу муаммо бўйича топшириқ бор бўлса, иккинчиси яратилмайди.
 *  Тугмани ўн марта боссангиз ҳам рўйхат бир хил қолади.
 *
 *  ── Қоралама тегилмайди ──
 *
 *  Тугалланмаган анкетадан топшириқ чиқарилмайди: ходим ҳали
 *  хатосини тузатмаган бўлиши мумкин, бизнинг тугма эса
 *  банкка ва мактабга топшириқ юбориб қўярди.
 * ============================================================
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** `choralarniYoz` талаб қиладиган майдонлар — ортиқчаси олинмайди */
const TANLOV = {
  id: true,
  moliyaEhtiyoji: true,
  talabQilinganMablag: true,
  maktabYoshdagi: true,
  maktabQamrovda: true,
  uzoqDavolanish: true,
  nogironlikBor: true,
  xodimId: true,
  ishsizlar: {
    select: {
      id: true,
      fish: true,
      kasbHunarEhtiyoji: true,
      organmoqchiKasb: true,
      itShaharchaVaucheri: true,
    },
  },
} as const;

/**
 * Занжирни бир марта юргизади.
 *
 * @param yozilsinmi `false` бўлса фақат санайди
 */
async function yurgiz(yozilsinmi: boolean) {
  const xonadonlar = await prisma.household.findMany({
    where: { holati: { not: 'QORALAMA' } },
    select: TANLOV,
    orderBy: { createdAt: 'asc' },
  });

  let jami = 0;
  let xonadonSoni = 0;
  const tashkilotlar: Record<string, number> = {};

  for (const x of xonadonlar) {
    const manba: ChoraManbai = x;
    const chiqadi = await yangiChoralar(prisma, manba);
    if (chiqadi.length === 0) continue;

    if (yozilsinmi) {
      await prisma.$transaction((tx) => choralarniYoz(tx, manba, x.xodimId));
    }

    jami += chiqadi.length;
    xonadonSoni++;
    for (const t of chiqadi) {
      tashkilotlar[t.masulTashkilot] = (tashkilotlar[t.masulTashkilot] ?? 0) + 1;
    }
  }

  return { tekshirilgan: xonadonlar.length, jami, xonadonSoni, tashkilotlar };
}

/** Нечта топшириқ чиқишини САНАЙДИ — ёзмайди */
export async function GET() {
  const q = await talabQil(['ADMIN']);
  if (q instanceof NextResponse) return q;

  try {
    return NextResponse.json({ yozildimi: false, ...(await yurgiz(false)) });
  } catch (e) {
    console.error('chora-toldirish GET', e);
    return NextResponse.json(
      { xabar: bazaXatosi(e) ?? 'Ҳисоблаб бўлмади. Бир оздан сўнг қайта уриниб кўринг.' },
      { status: 500 }
    );
  }
}

/** Топшириқларни ҲАҚИҚАТАН яратади */
export async function POST() {
  const q = await talabQil(['ADMIN']);
  if (q instanceof NextResponse) return q;

  try {
    return NextResponse.json({ yozildimi: true, ...(await yurgiz(true)) });
  } catch (e) {
    console.error('chora-toldirish POST', e);
    return NextResponse.json(
      { xabar: bazaXatosi(e) ?? 'Яратиб бўлмади. Бир оздан сўнг қайта уриниб кўринг.' },
      { status: 500 }
    );
  }
}
