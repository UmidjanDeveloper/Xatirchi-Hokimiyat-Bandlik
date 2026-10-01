import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  MUROJAAT_HTTP,
  MurojaatAmaliSxemasi,
  MurojaatXatosi,
  murojaatAmali,
} from '@/lib/murojaatlar';

/** Mahalla doirasi (faqat o'z murojaatlari) `murojaatAmali` ichida tekshiriladi */
const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/**
 * Murojaat ustida amal (bitta yo'l, `amal` maydoni bilan):
 * qabul, javob, yopish, qayta-ochish, masul, muddat.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = MurojaatAmaliSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    await murojaatAmali(q.sessiya, params.id, natija.data);
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'Murojaat',
      obyektId: params.id,
      izoh: natija.data.amal,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MurojaatXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: MUROJAAT_HTTP[e.kod] });
    }
    throw e;
  }
}
