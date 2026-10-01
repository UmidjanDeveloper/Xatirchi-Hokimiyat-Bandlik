import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jurnal, talabQil } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { serverXatosi } from '@/lib/tizim-kuzatuvi';

export const dynamic = 'force-dynamic';

const KUN_MS = 86400_000;

const Sxema = z.object({
  /** YYYY-MM-DD */
  sana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  natija: z.enum(['MUVAFFAQIYATLI', 'XATO']),
  /** Qaysi nusxa, qayerga tiklandi, yozuvlar soni solishtirildimi */
  izoh: z.string().trim().min(10, 'Izoh kamida 10 belgi').max(1000),
});

/**
 * Zaxiradan tiklash sinovi o'tkazilganini qayd etadi.
 *
 * Tizim sinovni O'ZI o'tkaza olmaydi (alohida muhit kerak): bu yozuv sinovni
 * o'tkazgan odamning guvohligi. Shuning uchun sana kelajakda va juda eski
 * bo'la olmaydi, izoh majburiy.
 */
export async function POST(request: Request) {
  const q = await talabQil(['ADMIN']);
  if (q instanceof NextResponse) return q;

  const tana = Sxema.safeParse(await request.json().catch(() => null));
  if (!tana.success) {
    return NextResponse.json({ xabar: tana.error.issues[0]?.message ?? 'So‘rov noto‘g‘ri' }, { status: 400 });
  }

  const sana = new Date(`${tana.data.sana}T12:00:00`);
  const hozir = Date.now();
  if (Number.isNaN(sana.getTime()) || sana.getTime() > hozir + KUN_MS) {
    return NextResponse.json({ xabar: 'Sana kelajakda bo‘lishi mumkin emas' }, { status: 400 });
  }
  if (sana.getTime() < hozir - 400 * KUN_MS) {
    return NextResponse.json({ xabar: 'Sana 400 kundan eski bo‘lishi mumkin emas' }, { status: 400 });
  }

  try {
    const yozuv = await prisma.zaxiraTekshiruvi.create({
      data: { otkazilganSana: sana, natija: tana.data.natija, izoh: tana.data.izoh, kimId: q.sessiya.userId },
    });
    await jurnal(q.sessiya.userId, 'YARATISH', {
      obyektTuri: 'ZaxiraTekshiruvi',
      obyektId: yozuv.id,
      izoh: `Zaxiradan tiklash sinovi: ${tana.data.natija}`,
    });
    return NextResponse.json({ ok: true, id: yozuv.id });
  } catch (e) {
    const { izId } = await serverXatosi('api:admin-zaxira', e);
    return NextResponse.json({ xabar: 'Saqlab bo‘lmadi', izId }, { status: 500 });
  }
}
