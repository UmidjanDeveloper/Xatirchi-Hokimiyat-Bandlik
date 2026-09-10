import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { talabQil } from '@/lib/api-auth';
import { mahallaFiltri } from '@/lib/auth';

/**
 * Formalar uchun kataloglar.
 *
 * Yettilik a'zosiga faqat o'z mahallasi qaytariladi - ro'yxatda 70 ta
 * variant ko'rinib, xatolikdan qo'shni mahallani tanlash imkoni
 * bo'lmasligi kerak.
 */
export async function GET() {
  const q = await talabQil();
  if (q instanceof NextResponse) return q;

  const filtr = mahallaFiltri(q.sessiya);

  const mahallalar = await prisma.mahalla.findMany({
    where: filtr.mahallaId ? { id: filtr.mahallaId } : undefined,
    orderBy: { nomi: 'asc' },
    select: { id: true, nomi: true, nomiKirill: true, ishsiz: true, xonadon: true },
  });

  return NextResponse.json({ mahallalar });
}
