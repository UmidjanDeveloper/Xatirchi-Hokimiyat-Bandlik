import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  BUYURTMA_HTTP,
  BuyurtmaXatosi,
  XizmatAmaliSxemasi,
  xizmatAmali,
} from '@/lib/buyurtmalar';

/** Mahalla doirasi (faqat o'z fuqarolari) `xizmatAmali` ichida tekshiriladi */
const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/**
 * Xizmat taklifi ustida amal (bitta yo'l, `amal` maydoni bilan):
 * rozilik, rozilik-qaytar, yopish, qaytarish, tahrir.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = XizmatAmaliSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    await xizmatAmali(q.sessiya, params.id, natija.data);
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'XizmatTaklifi',
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
