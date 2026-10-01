import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  BUYURTMA_HTTP,
  BuyurtmaXatosi,
  XizmatYaratishSxemasi,
  xizmatYaratish,
} from '@/lib/buyurtmalar';

/**
 * Xizmat taklifi qo'shish. Mahalla xodimi ham qo'sha oladi, lekin FAQAT
 * o'z mahallasi fuqarosiga (tekshiruv `xizmatYaratish` ichida); hokim emas.
 */
const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

export async function POST(request: Request) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = XizmatYaratishSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    const r = await xizmatYaratish(q.sessiya, natija.data);
    await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'XizmatTaklifi', obyektId: r.id });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e) {
    if (e instanceof BuyurtmaXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: BUYURTMA_HTTP[e.kod] });
    }
    throw e;
  }
}
