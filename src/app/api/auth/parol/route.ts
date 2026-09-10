import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { parolTogrimi, parolXeshla, parolYaroqlimi } from '@/lib/auth';
import { jurnal, talabQil } from '@/lib/api-auth';

const Almashtirish = z.object({
  eski: z.string().min(1).max(200),
  yangi: z.string().min(1).max(200),
});

/** Xodim o'z parolini almashtiradi */
export async function POST(request: Request) {
  const q = await talabQil();
  if (q instanceof NextResponse) return q;

  const natija = Almashtirish.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Eski va yangi parolni kiriting' }, { status: 400 });
  }

  const { eski, yangi } = natija.data;

  const user = await prisma.user.findUnique({
    where: { id: q.sessiya.userId },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ xabar: 'Foydalanuvchi topilmadi' }, { status: 404 });

  if (!parolTogrimi(eski, user.passwordHash)) {
    return NextResponse.json({ xabar: 'Joriy parol noto‘g‘ri' }, { status: 400 });
  }

  const tekshiruv = parolYaroqlimi(yangi);
  if (!tekshiruv.ok) {
    return NextResponse.json({ xabar: tekshiruv.xato }, { status: 400 });
  }

  if (eski === yangi) {
    return NextResponse.json(
      { xabar: 'Yangi parol eskisidan farq qilishi kerak' },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: q.sessiya.userId },
    data: { passwordHash: parolXeshla(yangi), parolAlmashtirilsin: false },
  });
  await jurnal(q.sessiya.userId, 'PAROL_ALMASHTIRILDI');

  return NextResponse.json({ ok: true });
}
