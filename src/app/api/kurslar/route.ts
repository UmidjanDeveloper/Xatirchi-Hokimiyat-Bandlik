import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import { KURS_HTTP, KursXatosi, KursYaratishSxemasi, kursYaratish } from '@/lib/kurslar';

/** Kurs katalogini yuritish - bandlik markazining ishi (mahalla xodimi va hokim emas) */
const ROLLAR = ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/** Yangi kurs qo'shish */
export async function POST(request: Request) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = KursYaratishSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    const r = await kursYaratish(q.sessiya, natija.data);
    await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'Kurs', obyektId: r.id });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e) {
    if (e instanceof KursXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: KURS_HTTP[e.kod] });
    }
    throw e;
  }
}
