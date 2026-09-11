import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { parolXeshla, parolYaroqlimi } from '@/lib/auth';

const Tahrir = z.object({
  faol: z.boolean().optional(),
  yangiParol: z.string().min(8).max(200).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR']);
  if (q instanceof NextResponse) return q;

  /*
   * Bandlik rahbari FAQAT mahalla yettiligi hisoblariga tega
   * oladi. Busiz u administratorning parolini tiklab, uning
   * nomidan kirib olardi.
   *
   * Nishon roli bazadan o'qiladi, so'rovdan emas: so'rovga
   * ishonib bo'lmaydi.
   */
  if (q.sessiya.rol !== 'ADMIN') {
    const nishon = await prisma.user.findUnique({
      where: { id: params.id },
      select: { rol: true },
    });
    if (!nishon || nishon.rol !== 'YETTILIK') {
      return NextResponse.json(
        { xabar: 'Сиз фақат маҳалла еттилиги ҳисобини ўзгартира оласиз' },
        { status: 403 }
      );
    }
  }

  const natija = Tahrir.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Маълумот нотўғри' }, { status: 400 });
  }

  const d = natija.data;

  /*
   * Administrator o'zini o'chira olmaydi.
   *
   * Aks holda oxirgi administrator o'zini faolsizlantirib qo'ysa,
   * tizimga hech kim kira olmay qoladi va uni faqat bazadan qo'lda
   * tuzatish mumkin bo'ladi.
   */
  if (d.faol === false && params.id === q.sessiya.userId) {
    return NextResponse.json(
      { xabar: 'Ўзингизни фаолсизлантира олмайсиз' },
      { status: 400 }
    );
  }

  if (d.yangiParol) {
    const t = parolYaroqlimi(d.yangiParol);
    if (!t.ok) return NextResponse.json({ xabar: t.xato }, { status: 400 });
  }

  const u = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(d.faol !== undefined ? { faol: d.faol } : {}),
      ...(d.yangiParol
        ? { passwordHash: parolXeshla(d.yangiParol), parolAlmashtirilsin: true }
        : {}),
    },
    select: { username: true },
  });

  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'User',
    obyektId: params.id,
    izoh: d.yangiParol ? `${u.username}: parol tiklandi` : `${u.username}: faol=${d.faol}`,
  });

  return NextResponse.json({ ok: true });
}
