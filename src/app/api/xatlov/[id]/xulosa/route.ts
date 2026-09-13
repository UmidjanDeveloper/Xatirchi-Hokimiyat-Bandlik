import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { aiXulosaSoraydi, mahallagaRuxsat } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { xonadonDalili, xonadonXulosasiOl } from '@/lib/xonadon-xulosa';

/**
 * ============================================================
 *  ХОНАДОН БЎЙИЧА ХУЛОСА — ТАЙЁРЛАШ
 *
 *  Хулоса САҚЛАНАДИ, ҳар очилганда қайта ҳисобланмайди. Уч сабаб:
 *
 *  1. Пул: ҳар очилишда модел чақирилса, 40 минг хонадонли
 *     туманда ҳисоб-китоб чидаб бўлмас бўларди.
 *  2. Ишонч: бир хил анкетага ҳар сафар бошқа матн чиқса,
 *     йиғилишда «эрталаб бошқача ёзилган эди» деган савол
 *     чиқади.
 *  3. Тарих: хулоса ким ва қачон тайёрлагани ёзилади — уни
 *     кейинчалик қайта кўриб чиқиш мумкин.
 *
 *  Янгилаш ҚЎЛДА бажарилади: анкета ўзгарса, ходим «янгилаш»
 *  тугмасини босади.
 * ============================================================
 */

export const maxDuration = 30;

/** Бир ходим соатига нечта хулоса тайёрлай олади */
const SOATIGA = 40;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  /*
   * AI СЎРОВИ ФАҚАТ УЧ РОЛГА.
   *
   * Қоида бўйича хулоса ҳамма роль учун саҳифанинг ўзида
   * ҳисобланади — у текин. AI эса ҳар сўровда пул ечади, шунинг
   * учун фақат қарор қабул қиладиган даража: ҳоким, бандлик
   * раҳбари, администратор.
   */
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  if (!aiXulosaSoraydi(q.sessiya.rol)) {
    return NextResponse.json(
      { xabar: 'Сунъий интеллект хулосасини ҳоким, бандлик раҳбари ва администратор сўрай олади.' },
      { status: 403 }
    );
  }

  /*
   * Чегара IP га эмас, ХОДИМГА қўйилади: бу ердаги хавф ўғри
   * эмас, тасодифан тугмани қайта-қайта босиш ва ҳар босишда
   * модел чақирилиши.
   */
  const chegara = checkRateLimit(`xulosa:${q.sessiya.userId}`, SOATIGA, 60 * 60 * 1000);
  if (!chegara.allowed) {
    return NextResponse.json(
      {
        xabar: `Соатлик чегарага етдингиз. ${Math.ceil(chegara.retryAfter / 60)} дақиқадан сўнг қайта уриниб кўринг.`,
      },
      { status: 429 }
    );
  }

  const x = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      ishsizlar: {
        select: {
          jinsi: true,
          tugilganSana: true,
          malumoti: true,
          mutaxassisligi: true,
          xohlaganIsh: true,
          organmoqchiKasb: true,
          holati: true,
          nogironlik: true,
        },
      },
    },
  });

  if (!x) return NextResponse.json({ xabar: 'Хонадон топилмади' }, { status: 404 });
  if (!mahallagaRuxsat(q.sessiya, x.mahallaId)) {
    return NextResponse.json({ xabar: 'Бу маҳаллага ҳуқуқингиз йўқ' }, { status: 403 });
  }
  if (x.holati === 'QORALAMA') {
    return NextResponse.json(
      { xabar: 'Қоралама анкета бўйича хулоса ёзилмайди — аввал уни юборинг.' },
      { status: 409 }
    );
  }

  const xulosa = await xonadonXulosasiOl(xonadonDalili(x));


  await prisma.household.update({
    where: { id: x.id },
    data: {
      /*
       * JSON матн сифатида сақланади. Алоҳида устун очиш
       * (holat, tavsiyalar...) керак эмас эди: бу маълумот
       * бўйича қидирилмайди ва саналмайди, у фақат ўқилади.
       */
      aiXulosa: JSON.stringify(xulosa),
      aiXulosaVaqti: new Date(),
      aiManbasi: xulosa.manba,
    },
  });

  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'Household',
    obyektId: x.id,
    izoh: `Хулоса тайёрланди (${xulosa.manba})`,
  });

  return NextResponse.json({ ok: true, ...xulosa });
}
