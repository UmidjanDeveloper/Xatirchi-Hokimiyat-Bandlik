import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  DasturYaratishSxemasi,
  YORDAM_HTTP,
  YordamXatosi,
  dasturYaratish,
} from '@/lib/yordam-dasturlari';

/** Katalogni yuritish - bandlik markazining ishi (mahalla xodimi va hokim ko'radi, o'zgartirmaydi) */
const ROLLAR = ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

export async function POST(request: Request) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = DasturYaratishSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    const r = await dasturYaratish(q.sessiya, natija.data);
    await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'YordamDasturi', obyektId: r.id });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e) {
    if (e instanceof YordamXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: YORDAM_HTTP[e.kod] });
    }
    throw e;
  }
}
