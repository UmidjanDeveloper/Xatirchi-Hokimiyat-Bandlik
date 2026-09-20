import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import { xomPrisma } from '@/lib/prisma';
import { arxivgaRuxsat, fuqaroniQaytar, xonadonniQaytar } from '@/lib/arxiv';

/**
 * ============================================================
 *  «O'CHIRILGANLAR» — RO'YXAT VA QAYTARISH
 *
 *  ── Nega admin panelida emas ──
 *
 *  Arxiv dastlab faqat administratorga ko'rinardi. Amalda esa
 *  xatoni QILGAN odam — mahalla xodimi — uni o'zi tuzatishi
 *  kerak: adashib o'chirdi, darhol qaytardi.
 *
 *  Administratorga qo'ng'iroq qilib, tushuntirib, kutib o'tirish
 *  — bu ish emas, to'siq. Shuning uchun "O'chirilganlar" alohida
 *  sahifa va uni o'chira oladigan har kim ko'radi.
 *
 *  ── Chegara o'zgarmaydi ──
 *
 *  Mahalla xodimi faqat O'Z mahallasinikini ko'radi va faqat
 *  o'shani qaytaradi. Bu qoida butun tizim bo'ylab bir xil.
 * ============================================================
 */

export const dynamic = 'force-dynamic';

/** Arxivdan qaytarish */
export async function POST(request: Request) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const tana = (await request.json().catch(() => ({}))) as { turi?: unknown; id?: unknown };
  const id = typeof tana.id === 'string' ? tana.id : '';
  const turi = tana.turi === 'fuqaro' ? 'fuqaro' : 'xonadon';
  if (!id) return NextResponse.json({ xabar: 'Ёзув танланмаган' }, { status: 400 });

  /*
   * Қайтариш ҳам ЎЧИРИШ билан бир хил ҳуқуқ талаб қилади:
   * бошқа маҳалланинг ёзувини қайтариб бўлмайди.
   */
  const yozuv =
    turi === 'fuqaro'
      ? await xomPrisma.unemployedPerson.findUnique({
          where: { id },
          select: { mahallaId: true, fish: true, arxivSanasi: true },
        })
      : await xomPrisma.household.findUnique({
          where: { id },
          select: { mahallaId: true, holati: true, manzil: true, arxivSanasi: true },
        });

  if (!yozuv) return NextResponse.json({ xabar: 'Ёзув топилмади' }, { status: 404 });
  if (!yozuv.arxivSanasi) {
    return NextResponse.json({ xabar: 'Бу ёзув ўчирилмаган' }, { status: 409 });
  }

  const ruxsat = arxivgaRuxsat(q.sessiya.rol, q.sessiya.mahallaId, {
    mahallaId: yozuv.mahallaId,
    holati: 'holati' in yozuv ? yozuv.holati : undefined,
  });
  if (!ruxsat.ok) return NextResponse.json({ xabar: ruxsat.xabar }, { status: 403 });

  try {
    if (turi === 'fuqaro') {
      await fuqaroniQaytar(id);
      await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
        obyektTuri: 'UnemployedPerson',
        obyektId: id,
        izoh: `Ўчирилганлардан қайтарилди: ${'fish' in yozuv ? yozuv.fish : ''}`,
      });
      return NextResponse.json({ ok: true });
    }

    const natija = await xonadonniQaytar(id);
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'Household',
      obyektId: id,
      izoh: `Ўчирилганлардан қайтарилди (${'manzil' in yozuv ? yozuv.manzil : ''}) · ${natija.ishsizlar} фуқаро билан`,
    });
    return NextResponse.json({ ok: true, ...natija });
  } catch (e) {
    console.error('qaytarib bolmadi', e);
    return NextResponse.json({ xabar: 'Қайтариб бўлмади. Қайта уриниб кўринг.' }, { status: 500 });
  }
}
