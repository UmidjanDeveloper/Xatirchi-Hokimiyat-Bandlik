import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  DasturAmaliSxemasi,
  YORDAM_HTTP,
  YordamXatosi,
  dasturAmali,
} from '@/lib/yordam-dasturlari';

const ROLLAR = ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/**
 * Dastur ustida amal (bitta yo'l, `amal` maydoni bilan):
 * tekshirildi (manbadan), tahrir, yopish, qaytarish.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = DasturAmaliSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    await dasturAmali(q.sessiya, params.id, natija.data);
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'YordamDasturi',
      obyektId: params.id,
      izoh: natija.data.amal,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof YordamXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: YORDAM_HTTP[e.kod] });
    }
    throw e;
  }
}
