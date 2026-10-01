import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  MUROJAAT_HTTP,
  MurojaatXatosi,
  MurojaatYaratishSxemasi,
  murojaatYaratish,
} from '@/lib/murojaatlar';

/**
 * Murojaatni qayd etish. Faqat xodim (fuqaro o'zi yozmaydi). Mahalla xodimi
 * faqat o'z mahallasi uchun (tekshiruv `murojaatYaratish` ichida); hokim emas.
 */
const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

export async function POST(request: Request) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = MurojaatYaratishSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    const r = await murojaatYaratish(q.sessiya, natija.data);
    await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'Murojaat', obyektId: r.id });
    return NextResponse.json({ ok: true, id: r.id, raqami: r.raqami });
  } catch (e) {
    if (e instanceof MurojaatXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: MUROJAAT_HTTP[e.kod] });
    }
    throw e;
  }
}
