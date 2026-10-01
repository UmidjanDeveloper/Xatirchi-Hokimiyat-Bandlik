import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jurnal, talabQil } from '@/lib/api-auth';
import { serverXatosi, xatolarniKorildi } from '@/lib/tizim-kuzatuvi';

export const dynamic = 'force-dynamic';

const Sxema = z.object({
  amal: z.literal('korildi'),
  /** Berilmasa — barcha ko'rilmaganlar */
  id: z.string().min(1).max(40).optional(),
});

/** Xato jurnalini "ko'rildi" deb belgilash. Faqat administrator. */
export async function POST(request: Request) {
  const q = await talabQil(['ADMIN']);
  if (q instanceof NextResponse) return q;

  const tana = Sxema.safeParse(await request.json().catch(() => null));
  if (!tana.success) return NextResponse.json({ xabar: 'So‘rov noto‘g‘ri' }, { status: 400 });

  try {
    const soni = await xatolarniKorildi(tana.data.id);
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'TizimXatosi',
      obyektId: tana.data.id,
      izoh: `Xato jurnali: ${soni} ta yozuv «ko‘rildi» deb belgilandi`,
    });
    return NextResponse.json({ ok: true, soni });
  } catch (e) {
    const { izId } = await serverXatosi('api:admin-xatolar', e);
    return NextResponse.json({ xabar: 'Saqlab bo‘lmadi', izId }, { status: 500 });
  }
}
