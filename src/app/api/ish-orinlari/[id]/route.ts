import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';

/**
 * Bo'sh ish o'rnini yopish.
 *
 * O'chirmaymiz, `faol = false` qilamiz: o'chirilgan yozuv
 * hisobotdan ham yo'qoladi va "bu oy nechta ish o'rni taklif
 * qilingan" degan savolga javob bo'lmay qoladi.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const v = await prisma.vacancy.findUnique({
    where: { id: params.id },
    select: { mahallaId: true },
  });
  if (!v) return NextResponse.json({ xabar: 'Иш ўрни топилмади' }, { status: 404 });
  if (!mahallagaRuxsat(q.sessiya, v.mahallaId)) {
    return NextResponse.json({ xabar: 'Ҳуқуқингиз йўқ' }, { status: 403 });
  }

  await prisma.vacancy.update({ where: { id: params.id }, data: { faol: false } });
  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'Vacancy',
    obyektId: params.id,
    izoh: 'Ёпилди',
  });

  return NextResponse.json({ ok: true });
}
