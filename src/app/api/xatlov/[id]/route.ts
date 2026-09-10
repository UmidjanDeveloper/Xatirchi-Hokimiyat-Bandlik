import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';

/** Bitta xatlov - to'liq ma'lumot bilan */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const q = await talabQil();
  if (q instanceof NextResponse) return q;

  const xonadon = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      mahalla: { select: { id: true, nomi: true, nomiKirill: true } },
      xodim: { select: { fullName: true, position: true } },
      ishsizlar: { orderBy: { createdAt: 'asc' } },
      topshiriqlar: { orderBy: { muddat: 'asc' } },
    },
  });

  if (!xonadon) return NextResponse.json({ xabar: 'Xatlov topilmadi' }, { status: 404 });

  if (!mahallagaRuxsat(q.sessiya, xonadon.mahallaId)) {
    return NextResponse.json({ xabar: 'Bu xatlovga huquqingiz yo‘q' }, { status: 403 });
  }

  /*
   * Xonadon kartochkasini ochish - oila daromadi va sog'liq holatini
   * ko'rish demak. Shuning uchun har ochilish jurnalga tushadi.
   */
  await jurnal(q.sessiya.userId, 'KORISH', {
    obyektTuri: 'Household',
    obyektId: xonadon.id,
  });

  // BigInt JSON ga o'girilmaydi - qo'lda satrga aylantiramiz
  return NextResponse.json({
    ...xonadon,
    talabQilinganMablag: xonadon.talabQilinganMablag?.toString() ?? null,
    oylikDaromad: xonadon.oylikDaromad?.toString() ?? null,
    ishsizlar: xonadon.ishsizlar.map((p) => ({
      ...p,
      kutilayotganMaosh: p.kutilayotganMaosh?.toString() ?? null,
    })),
  });
}

/** Qoralamani o'chirish */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const xonadon = await prisma.household.findUnique({
    where: { id: params.id },
    select: { mahallaId: true, holati: true, xodimId: true },
  });

  if (!xonadon) return NextResponse.json({ xabar: 'Xatlov topilmadi' }, { status: 404 });
  if (!mahallagaRuxsat(q.sessiya, xonadon.mahallaId)) {
    return NextResponse.json({ xabar: 'Bu xatlovga huquqingiz yo‘q' }, { status: 403 });
  }

  /*
   * Yuborilgan xatlovni o'chirish mumkin emas - faqat qoralamani.
   *
   * Sabab: yuborilgan xatlov bandlik markazining ish rejasiga kirgan,
   * uning asosida ishsizlar ro'yxati tuzilgan va chora-tadbir
   * belgilangan bo'lishi mumkin. Xato bo'lsa tuzatiladi, o'chirilmaydi.
   */
  if (xonadon.holati !== 'QORALAMA') {
    return NextResponse.json(
      { xabar: 'Faqat qoralamani o‘chirish mumkin. Yuborilgan xatlovni tahrirlang.' },
      { status: 403 }
    );
  }

  // Yettilik a'zosi faqat o'zi boshlagan qoralamani o'chira oladi
  if (q.sessiya.rol === 'YETTILIK' && xonadon.xodimId !== q.sessiya.userId) {
    return NextResponse.json(
      { xabar: 'Bu qoralamani boshqa xodim boshlagan' },
      { status: 403 }
    );
  }

  await prisma.household.delete({ where: { id: params.id } });
  await jurnal(q.sessiya.userId, 'OCHIRISH', {
    obyektTuri: 'Household',
    obyektId: params.id,
    izoh: 'Qoralama o‘chirildi',
  });

  return NextResponse.json({ ok: true });
}
