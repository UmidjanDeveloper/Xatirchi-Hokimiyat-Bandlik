import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { talabQil } from '@/lib/api-auth';
import { aiXulosaSoraydi } from '@/lib/auth';
import { hisobotOl } from '@/lib/hisobot/malumot';
import { bazaXatosi } from '@/lib/baza-xatosi';
import type { Qamrov } from '@/lib/hisobot/turlar';

/**
 * ============================================================
 *  ФАҚАТ ХУЛОСА
 *
 *  Панелдаги хулоса блоки учун. Тўлиқ ҳисобот эмас: экранга
 *  70 маҳалла жадвали ва 20 та диаграмма маълумоти керак эмас,
 *  улар файлга кетади.
 *
 *  Хулоса ичкарида кешланади (`xulosa.ts`), шунинг учун панелни
 *  иккинчи марта очганда жавоб дарҳол келади.
 * ============================================================
 */
export const maxDuration = 60;

const Sorov = z.object({
  mahallaId: z.string().cuid().nullish(),
  lotin: z.boolean().default(true),
  /**
   * Кешни четлаб ўтиш.
   *
   * Ҳозир кеш калити ёзув сонига боғланган, шунинг учун янги
   * анкета юборилса хулоса ўзи янгиланади. Бу байроқ эса
   * фойдаланувчи «Янгилаш» тугмасини босганда керак — масалан
   * AI аввал жавоб бермаган бўлса.
   */
  yangila: z.boolean().default(false),
});

export async function POST(request: Request) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Sorov.safeParse(await request.json().catch(() => ({})));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Сўров нотўғри' }, { status: 400 });
  }
  const d = natija.data;

  /* Маҳалла ходими фақат ўз маҳалласини кўради */
  let mahallaId: string | null = null;
  if (q.sessiya.rol === 'YETTILIK') {
    if (!q.sessiya.mahallaId) {
      return NextResponse.json(
        { xabar: 'Ҳисобингизга маҳалла бириктирилмаган.' },
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
   * Хато ЖИМ ЎТМАЙДИ.
   *
   * Илгари бу ерда `try` йўқ эди: база хато берса, Next.js бўш
   * танали 500 қайтарарди ва экранда «Хулоса олинмади» деб
   * турарди — сабабсиз. Ҳақиқий сабаб («базада устун йўқ»)
   * фақат сервер журналида қоларди, ходим эса уни кўра олмасди.
   */
  try {
    const hisobot = await hisobotOl({
      qamrov,
      tayyorlagan: q.sessiya.fullName,
      lotin: d.lotin,
      /*
       * Маҳалла ходими ва бандлик мутахассиси учун ФАҚАТ ҚОИДА.
       * Улар кунда ўнлаб саҳифа очади ва ҳар бирида модел
       * чақирилса, бюджет бир ҳафтада тугарди. Хулоса барибир
       * чиқади — фақат белгиланган чегаралар бўйича.
       */
      aiXulosa: aiXulosaSoraydi(q.sessiya.rol),
    });

    return NextResponse.json({
      xulosa: hisobot.xulosa,
      qamrovNomi: hisobot.qamrovNomi,
      asos: hisobot.asos,
    });
  } catch (e) {
    console.error('Хулоса тайёрлашда хато:', e);
    return NextResponse.json(
      {
        xabar:
          bazaXatosi(e) ??
          'Хулоса тайёрлаб бўлмади. Қайта уриниб кўринг; такрорланса — администраторга айтинг.',
      },
      { status: 500 }
    );
  }
}
