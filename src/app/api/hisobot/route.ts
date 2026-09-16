import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { hisobotOl } from '@/lib/hisobot/malumot';
import { bazaXatosi } from '@/lib/baza-xatosi';
import type { Qamrov } from '@/lib/hisobot/turlar';

/**
 * ============================================================
 *  ҲИСОБОТ МАЪЛУМОТИ
 *
 *  Ҳисобот СЕРВЕРДА йиғилади ва браузерга фақат тайёр жамланма
 *  боради. PDF ва Excel ни браузер ясайди — бу ерда фақат
 *  рақамлар.
 *
 *  ── Нега бунақа бўлинган ──
 *
 *  Файлни серверда ясаш ҳам мумкин эди. Аммо унда 70 маҳалла
 *  ходими бир вақтда ҳисобот сўраса, сервер шрифт юклаб, PDF
 *  чизиб ўтирарди. Браузерда эса бу ҳар кимнинг ўз қурилмасида
 *  бўлади ва сервер фақат SQL билан шуғулланади.
 *
 *  ── Рухсат ──
 *
 *  Маҳалла ходими ФАҚАТ ўз маҳалласини олади, сўровда нима
 *  ёзилганидан қатъи назар: `mahallaId` сессиядан олинади,
 *  танадан эмас. Бу муҳим — акс ҳолда ходим бошқа маҳалланинг
 *  ҳисоботини сўраб оларди.
 * ============================================================
 */

/*
 * AI хулосаси 15 секундгача кутиши мумкин, устига SQL сўровлари.
 * Vercel да стандарт чегара 10 секунд — ошириб қўямиз, акс ҳолда
 * ҳисобот ярим йўлда узилади.
 */
export const maxDuration = 60;

const Sorov = z.object({
  /**
   * Қайси маҳалла. Бўш бўлса — бутун туман.
   *
   * Маҳалла ходими учун бу майдон эътиборга олинмайди.
   */
  mahallaId: z.string().cuid().nullish(),
  /** Лотин ёзувида керакми */
  lotin: z.boolean().default(true),
  /** AI хулосаси сўралсинми */
  ai: z.boolean().default(true),
});

export async function POST(request: Request) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Sorov.safeParse(await request.json().catch(() => ({})));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Сўров нотўғри' }, { status: 400 });
  }
  const d = natija.data;

  /*
   * Маҳалла ходими ўз маҳалласига боғланади. Сессиядаги
   * `mahallaId` бўш бўлса — бу созлаш хатоси, ва уни жимгина
   * «бутун туман» деб талқин қилиш мумкин эмас: ходим бутун
   * тумандаги оилалар маълумотини кўриб қоларди.
   */
  let mahallaId: string | null = null;
  if (q.sessiya.rol === 'YETTILIK') {
    if (!q.sessiya.mahallaId) {
      return NextResponse.json(
        { xabar: 'Ҳисобингизга маҳалла бириктирилмаган. Администраторга мурожаат қилинг.' },
        { status: 400 }
      );
    }
    mahallaId = q.sessiya.mahallaId;
  } else {
    mahallaId = d.mahallaId ?? null;
  }

  let qamrov: Qamrov = { turi: 'tuman' };
  if (mahallaId) {
    const m = await prisma.mahalla.findUnique({
      where: { id: mahallaId },
      select: { nomiKirill: true },
    });
    if (!m) return NextResponse.json({ xabar: 'Маҳалла топилмади' }, { status: 404 });
    qamrov = { turi: 'mahalla', mahallaId, nomiKirill: m.nomiKirill };
  }

  /*
   * Хато ЖИМ ЎТМАЙДИ — сабаби экранда ёзилади.
   *
   * Илгари бу ерда `try` йўқ эди ва база хато берса, ходим
   * фақат «Ҳисобот маълумоти олинмади» деган қизил ёзувни
   * кўрарди. Сабаб сервер журналида қолиб кетарди.
   */
  try {
    const hisobot = await hisobotOl({
      qamrov,
      tayyorlagan: q.sessiya.fullName,
      lotin: d.lotin,
      aiXulosa: d.ai,
    });

    /*
     * Ҳисобот олиниши журналга ёзилади. Ҳисобот йиғилишда
     * тарқатилади ва кейин «бу рақамлар қайси кунга» деган савол
     * чиқади — жавоб журналда туради.
     */
    await jurnal(q.sessiya.userId, 'KORISH', {
      obyektTuri: 'Hisobot',
      obyektId: mahallaId ?? 'tuman',
      izoh: `ҳисобот олинди: ${hisobot.qamrovNomi} · ${hisobot.bolimlar.length} бўлим · хулоса манбаи: ${hisobot.xulosa.manba}`,
    });

    return NextResponse.json(hisobot);
  } catch (e) {
    console.error('Ҳисобот тайёрлашда хато:', e);
    return NextResponse.json(
      {
        xabar:
          bazaXatosi(e) ??
          'Ҳисобот тайёрлаб бўлмади. Қайта уриниб кўринг; такрорланса — администраторга айтинг.',
      },
      { status: 500 }
    );
  }
}
