import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import { KURS_HTTP, KursXatosi, YozuvAmaliSxemasi, yozuvAmali } from '@/lib/kurslar';

/** Mahalla doirasi (faqat o'z fuqarolari) `yozuvAmali` ichida tekshiriladi */
const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/**
 * Kurs yozuvi ustida amal (bitta yo'l, `amal` maydoni bilan):
 * boshladi, kelmadi, tashladi, tamomladi, toldirish, bekor, tiklash.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = YozuvAmaliSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    await yozuvAmali(q.sessiya, params.id, natija.data);
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'KursYollanmasi',
      obyektId: params.id,
      izoh: natija.data.amal,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof KursXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: KURS_HTTP[e.kod] });
    }
    throw e;
  }
}
