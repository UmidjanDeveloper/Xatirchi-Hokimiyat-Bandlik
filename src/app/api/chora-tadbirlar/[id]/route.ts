import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';
import { tashkilotNormal } from '@/lib/masul-tashkilot';

const Tahrir = z.object({
  holati: z.enum(['KUTILMOQDA', 'BAJARILMOQDA', 'BAJARILDI', 'BEKOR_QILINDI']).optional(),
  natijaIzohi: z.string().max(1000).nullish(),
  muddat: z.coerce.date().optional(),
  /* Ёзишда расмий рўйхатга келтирилади — кесим бўлинмасин */
  masulTashkilot: z.string().min(2).max(100).transform(tashkilotNormal).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Tahrir.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Маълумот нотўғри' }, { status: 400 });
  }

  const mavjud = await prisma.actionPlan.findUnique({
    where: { id: params.id },
    select: {
      holati: true,
      household: { select: { mahallaId: true } },
      ishsiz: { select: { mahallaId: true } },
    },
  });

  if (!mavjud) return NextResponse.json({ xabar: 'Топшириқ топилмади' }, { status: 404 });

  const mahallaId = mavjud.household?.mahallaId ?? mavjud.ishsiz?.mahallaId;
  if (mahallaId && !mahallagaRuxsat(q.sessiya, mahallaId)) {
    return NextResponse.json({ xabar: 'Бу топшириққа ҳуқуқингиз йўқ' }, { status: 403 });
  }

  const d = natija.data;

  const t = await prisma.actionPlan.update({
    where: { id: params.id },
    data: {
      ...d,
      // Bajarilgan sana avtomatik qo'yiladi - xodim uni qo'lda
      // orqaga surib, kechikkanini yashira olmasligi kerak.
      ...(d.holati === 'BAJARILDI' && mavjud.holati !== 'BAJARILDI'
        ? { bajarilganSana: new Date() }
        : {}),
      ...(d.holati && d.holati !== 'BAJARILDI' ? { bajarilganSana: null } : {}),
    },
  });

  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'ActionPlan',
    obyektId: t.id,
    izoh: d.holati ? `Ҳолат: ${mavjud.holati} -> ${d.holati}` : 'Таҳрирланди',
  });

  return NextResponse.json({ ok: true });
}
