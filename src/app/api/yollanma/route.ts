import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  YOLLANMA_HTTP,
  YaratishSxemasi,
  YollanmaXatosi,
  yollanmaYaratish,
} from '@/lib/yollanma';

/** Nomzodni e'longa yo'llash - bandlik markazining ishi (mahalla xodimi va hokim emas) */
const ROLLAR = ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

export async function POST(request: Request) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = YaratishSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Маълумот нотўғри' }, { status: 400 });
  }

  try {
    const r = await yollanmaYaratish(q.sessiya, natija.data);
    if (r.yangi) {
      await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'NomzodYollanmasi', obyektId: r.id });
    }
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof YollanmaXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: YOLLANMA_HTTP[e.kod] });
    }
    throw e;
  }
}
