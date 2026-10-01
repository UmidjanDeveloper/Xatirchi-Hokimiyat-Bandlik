import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  BUYURTMA_HTTP,
  BuyurtmaAmaliSxemasi,
  BuyurtmaXatosi,
  buyurtmaAmali,
} from '@/lib/buyurtmalar';

/** Mahalla doirasi (faqat o'z buyurtmalari) `buyurtmaAmali` ichida tekshiriladi */
const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/**
 * Buyurtma ustida amal (bitta yo'l, `amal` maydoni bilan):
 * tayinla, kelish, bajarildi, tasdiq, bekor.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = BuyurtmaAmaliSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    await buyurtmaAmali(q.sessiya, params.id, natija.data);
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'MahalliyBuyurtma',
      obyektId: params.id,
      izoh: natija.data.amal,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BuyurtmaXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: BUYURTMA_HTTP[e.kod] });
    }
    throw e;
  }
}
