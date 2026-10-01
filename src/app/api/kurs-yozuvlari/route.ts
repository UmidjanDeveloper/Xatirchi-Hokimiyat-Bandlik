import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import { KURS_HTTP, KursXatosi, YozishSxemasi, kursgaYozish } from '@/lib/kurslar';

/**
 * Fuqaroni kursga yozish. Mahalla xodimi ham yoza oladi, lekin FAQAT o'z
 * mahallasi fuqarosini (tekshiruv `kursgaYozish` ichida); hokim emas.
 */
const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

export async function POST(request: Request) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = YozishSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Маълумот нотўғри' }, { status: 400 });
  }

  try {
    const r = await kursgaYozish(q.sessiya, natija.data);
    if (r.yangi) {
      await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'KursYollanmasi', obyektId: r.id });
    }
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof KursXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: KURS_HTTP[e.kod] });
    }
    throw e;
  }
}
