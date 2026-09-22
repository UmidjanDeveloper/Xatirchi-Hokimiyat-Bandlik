import { NextResponse } from 'next/server';
import { z } from 'zod';
import { talabQil } from '@/lib/api-auth';
import { mahallaJadvali } from '@/lib/hisobot/mahalla-jadvali';
import { bazaXatosi } from '@/lib/baza-xatosi';
import { lotinga } from '@/lib/alifbo';
import { prisma } from '@/lib/prisma';

/**
 * ============================================================
 *  МАҲАЛЛА ЖАДВАЛИ — ҳокимлик андозаси бўйича Excel
 *
 *  ── Нега фақат ҳоким ва администратор ──
 *
 *  Бу ҳужжатда Ф.И.Ш. БОР ва у бутун маҳалла бўйича: оила
 *  бошлиқлари, ишсизлар, хорижда ишлаётганлар, ер эгалари.
 *  Яъни битта файлда бир неча юз кишининг рўйхати.
 *
 *  Панелдаги қолган ҳисоботлар жамланган сон билан ишлайди ва
 *  уларни бандлик мутахассиси ҳам олади. Бу эса бошқа нарса:
 *  шахсий маълумот рўйхати, ва у фақат ҚАРОР ҚАБУЛ
 *  ҚИЛАДИГАН даражага очиқ.
 *
 *  Маҳалла ходимига ҳам берилмайди — унинг ўз маҳалласи бўлса
 *  ҳам. Сабаби: жадвални ҳокимлик сўрайди ва уни ҳокимлик
 *  юборади; ходим ўз рўйхатини илованинг ўзида кўради.
 *
 *  ── Нега маҳалла МАЖБУРИЙ ──
 *
 *  Жадвал андозаси маҳалла кесимида тузилган: сарлавҳасида
 *  маҳалла номи турибди ва ҳокимлик уни шундай қабул қилади.
 *  Туман бўйича биттага йиғилган жадвал андозага тўғри
 *  келмайди — шунинг учун маҳаллани танлаш шарт.
 * ============================================================
 */
export const maxDuration = 60;

const Sorov = z.object({
  mahallaId: z.string().cuid(),
  lotin: z.boolean().default(true),
});

export async function POST(request: Request) {
  const q = await talabQil(['HOKIM', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Sorov.safeParse(await request.json().catch(() => ({})));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Маҳалла танланмаган. Жадвал маҳалла кесимида тузилади.' },
      { status: 400 }
    );
  }
  const d = natija.data;

  try {
    const mahalla = await prisma.mahalla.findUnique({
      where: { id: d.mahallaId },
      select: { nomiKirill: true },
    });
    if (!mahalla) {
      return NextResponse.json({ xabar: 'Маҳалла топилмади' }, { status: 404 });
    }

    const { bayt, sanoq } = await mahallaJadvali(d.mahallaId);

    /*
     * Файл номи ФАҚАТ лотин ҳарфларида.
     *
     * Кирилл номли юклама Windows папкасида, электрон почтада
     * ва Telegram да бузилади — бир марта шундай бўлган ва
     * браузер файлни «download» деб сақлаб қўйган эди.
     */
    const hudud = lotinga(mahalla.nomiKirill)
      .toLowerCase()
      .replace(/[’‘ʻʼ`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const sana = new Date().toISOString().slice(0, 10);
    const nom = `mahalla-jadvali-${hudud || 'mfy'}-${sana}.xlsx`;

    /*
     * Ҳар варақдаги ёзув сони сарлавҳада қайтарилади: мижоз
     * томон уни файл юклангач экранда кўрсатади. Файлни очмай
     * туриб «жадвалда нима бор» деган саволга жавоб бўлади.
     */
    return new NextResponse(new Uint8Array(bayt), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nom}"`,
        'Content-Length': String(bayt.length),
        'X-Jadval-Sanoq': encodeURIComponent(JSON.stringify(sanoq)),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('Маҳалла жадвалини тайёрлашда хато:', e);
    return NextResponse.json(
      {
        xabar:
          bazaXatosi(e) ??
          'Жадвални тайёрлаб бўлмади. Қайта уриниб кўринг; такрорланса — администраторга айтинг.',
      },
      { status: 500 }
    );
  }
}
