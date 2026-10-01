import { NextResponse } from 'next/server';
import { salomatlik } from '@/lib/salomatlik';

/**
 * Tizim ishlashga tayyormi: baza javob beradi va avtomatik ishlar o'z
 * vaqtida ishlagan. 200 = ok, 503 = degraded (uptime xizmati shuni kutadi).
 *
 * Sessiyasiz ochiladi, shuning uchun javob qo'pol: xato matni, versiya,
 * sonlar chiqmaydi (`src/lib/salomatlik.ts`).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const n = await salomatlik();
    return NextResponse.json(n, {
      status: n.status === 'ok' ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    /* Kutilmagan xato ham tafsilotsiz "degraded" */
    return NextResponse.json(
      { status: 'degraded', tekshiruvlar: { baza: false, avtomatikIshlar: false } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
