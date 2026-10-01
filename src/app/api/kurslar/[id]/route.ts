import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import { KURS_HTTP, KursAmaliSxemasi, KursXatosi, kursAmali } from '@/lib/kurslar';

const ROLLAR = ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/**
 * Kurs ustida amal (bitta yo'l, `amal` maydoni bilan):
 *
 *   tekshirildi - tashkilotdan ma'lumot qayta tasdiqlandi (sanasi yangilanadi)
 *   tahrir      - maydonlarni o'zgartirish (tekshirilgan sanani YANGILAMAYDI)
 *   bekor       - kursni bekor qilish (sabab majburiy)
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = KursAmaliSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    await kursAmali(params.id, natija.data);
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'Kurs',
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
