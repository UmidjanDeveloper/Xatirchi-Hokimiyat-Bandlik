import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';
import { ChoraTadbirSxemasi } from '@/lib/xatlov-sxema';

/** Yangi chora-tadbir qo'shish */
export async function POST(request: Request) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = ChoraTadbirSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Маълумот нотўғри', tafsilot: natija.error.flatten() },
      { status: 400 }
    );
  }

  const d = natija.data;

  /*
   * Topshiriq qaysi mahallaga tegishli ekanini bog'langan yozuvdan
   * aniqlaymiz. Foydalanuvchidan so'rasak, yettilik a'zosi qo'shni
   * mahallaning xonadoniga topshiriq yozib qo'yishi mumkin edi.
   */
  const mahallaId = d.householdId
    ? (await prisma.household.findUnique({
        where: { id: d.householdId },
        select: { mahallaId: true },
      }))?.mahallaId
    : d.ishsizId
      ? (await prisma.unemployedPerson.findUnique({
          where: { id: d.ishsizId },
          select: { mahallaId: true },
        }))?.mahallaId
      : null;

  if (!mahallaId) {
    return NextResponse.json({ xabar: 'Боғланган ёзув топилмади' }, { status: 404 });
  }
  if (!mahallagaRuxsat(q.sessiya, mahallaId)) {
    return NextResponse.json({ xabar: 'Бу ёзувга ҳуқуқингиз йўқ' }, { status: 403 });
  }

  const t = await prisma.actionPlan.create({
    data: { ...d, yaratganId: q.sessiya.userId },
  });

  await jurnal(q.sessiya.userId, 'YARATISH', {
    obyektTuri: 'ActionPlan',
    obyektId: t.id,
    izoh: d.masulTashkilot,
  });

  return NextResponse.json({ ok: true, id: t.id });
}
