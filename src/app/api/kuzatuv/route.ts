import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import { KUZATUV_HTTP, KuzatuvSxemasi, KuzatuvXatosi, kuzatuvYozish } from '@/lib/kuzatuv';

/**
 * Kuzatuv - bandlik markazining ishi (fuqaro sahifasi ham shu rollarga ochiq).
 * Hokim faqat jamlangan ko'rsatkichni ko'radi.
 */
const ROLLAR = ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/**
 * 30/60/90 kunlik tekshiruvni qayd etish (yoki yangilash).
 *
 * Yozuvchi sessiyadan olinadi. Fuqaroga huquq - mahalla bo'yicha
 * `kuzatuvYozish` ichida tekshiriladi: so'rovdagi `joylashishId`
 * boshqa mahalla fuqarosiniki bo'lsa, 403.
 */
export async function POST(request: Request) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = KuzatuvSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }

  try {
    const r = await kuzatuvYozish(q.sessiya, natija.data);
    await jurnal(q.sessiya.userId, r.yangi ? 'YARATISH' : 'OZGARTIRISH', {
      obyektTuri: 'KuzatuvTekshiruvi',
      obyektId: r.id,
      izoh: `${natija.data.kunBelgisi} кун · ${natija.data.natija} · ${natija.data.manba}`,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof KuzatuvXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: KUZATUV_HTTP[e.kod] });
    }
    throw e;
  }
}
