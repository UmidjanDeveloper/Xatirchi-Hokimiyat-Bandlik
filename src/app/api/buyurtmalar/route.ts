import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  BUYURTMA_HTTP,
  BuyurtmaXatosi,
  BuyurtmaYaratishSxemasi,
  buyurtmaYaratish,
} from '@/lib/buyurtmalar';

/**
 * Yangi buyurtma qabul qilish. Mahalla xodimi faqat o'z mahallasi uchun
 * (tekshiruv `buyurtmaYaratish` ichida); hokim emas.
 */
const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

export async function POST(request: Request) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = BuyurtmaYaratishSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    const r = await buyurtmaYaratish(q.sessiya, natija.data);
    await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'MahalliyBuyurtma', obyektId: r.id });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e) {
    if (e instanceof BuyurtmaXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: BUYURTMA_HTTP[e.kod] });
    }
    throw e;
  }
}
