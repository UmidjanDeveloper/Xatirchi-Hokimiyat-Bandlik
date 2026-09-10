import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';
import { KASB_YONALISHI, qiymatlar } from '@/lib/constants';
import { telefonSaqlashUchun } from '@/lib/inson-tekshiruvi';

const Yangi = z.object({
  mahallaId: z.string().cuid(),
  korxonaNomi: z.string().min(2).max(200),
  lavozim: z.string().min(2).max(200),
  yonalish: z.enum(qiymatlar(KASB_YONALISHI)).nullish(),
  ornlarSoni: z.coerce.number().int().min(1).max(500).default(1),
  maosh: z.coerce.number().int().min(0).max(100_000_000).nullish(),
  talablar: z.string().max(1000).nullish(),
  telefon: z.string().max(20).nullish(),
});

export async function POST(request: Request) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Yangi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Маълумот нотўғри', tafsilot: natija.error.flatten() },
      { status: 400 }
    );
  }

  const d = natija.data;
  if (!mahallagaRuxsat(q.sessiya, d.mahallaId)) {
    return NextResponse.json({ xabar: 'Бу маҳаллага ҳуқуқингиз йўқ' }, { status: 403 });
  }

  const v = await prisma.vacancy.create({
    data: {
      ...d,
      maosh: d.maosh ? BigInt(d.maosh) : null,
      telefon: d.telefon ? (telefonSaqlashUchun(d.telefon) ?? d.telefon) : null,
    },
  });

  await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'Vacancy', obyektId: v.id });
  return NextResponse.json({ ok: true, id: v.id });
}
