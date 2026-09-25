import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { xabarniTasdiqla } from '@/lib/joylashuv-xabari';

/**
 * ============================================================
 *  «ИШ ТОПДИМ» ХАБАРИНИ ҲАЛ ҚИЛИШ
 *
 *  Маҳалла ходими Telegram'дан хабар қилди. Бу ерда бандлик
 *  маркази уни ТАСДИҚЛАЙДИ ёки РАД ЭТАДИ.
 *
 *  Тасдиқлангунча фуқаронинг ҳолати ўзгармайди: туман
 *  рақами фақат марказ ҳужжат кўргандан кейин ўсади.
 * ============================================================
 */

const Qaror = z.object({
  qaror: z.enum(['TASDIQLA', 'RAD_ET']),
  izoh: z.string().max(500).nullish(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Qaror.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Маълумот нотўғри' }, { status: 400 });
  }
  const d = natija.data;

  if (d.qaror === 'RAD_ET') {
    /*
     * Рад этишда САБАБ мажбурий: ходим нима учун рад
     * этилганини билмаса, кейинги сафар ҳам ўшани юборарди.
     */
    if (!d.izoh?.trim()) {
      return NextResponse.json({ xabar: 'Рад этиш сабабини ёзинг' }, { status: 400 });
    }
    const bor = await prisma.joylashuvXabari.findUnique({
      where: { id: params.id },
      select: { holati: true },
    });
    if (!bor) return NextResponse.json({ xabar: 'Хабар топилмади' }, { status: 404 });
    if (bor.holati !== 'XABAR_QILINDI') {
      return NextResponse.json({ xabar: 'Хабар аллақачон ҳал қилинган' }, { status: 409 });
    }
    await prisma.joylashuvXabari.update({
      where: { id: params.id },
      data: {
        holati: 'RAD_ETILDI',
        halQilganId: q.sessiya.userId,
        halQilinganSana: new Date(),
        izoh: d.izoh.trim(),
      },
    });
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'JoylashuvXabari',
      obyektId: params.id,
      izoh: 'Рад этилди',
    });
    return NextResponse.json({ ok: true, qaror: 'RAD_ET' });
  }

  const javob = await xabarniTasdiqla({
    xabarId: params.id,
    kim: {
      userId: q.sessiya.userId,
      rol: q.sessiya.rol,
      mahallaId: q.sessiya.mahallaId,
    },
    izoh: d.izoh,
  });

  if (!javob.ok) return NextResponse.json({ xabar: javob.sabab }, { status: 409 });

  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'JoylashuvXabari',
    obyektId: params.id,
    izoh: `Тасдиқланди: ${javob.fish}`,
  });
  return NextResponse.json({ ok: true, qaror: 'TASDIQLA', fish: javob.fish });
}
