import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import { serverXatosi, xatoliNavbatniQaytar } from '@/lib/tizim-kuzatuvi';

export const dynamic = 'force-dynamic';

/**
 * Xato bilan tugagan xabarlarni navbatga qaytaradi. Faqat so'nggi 3 kundagilar
 * (eskirgan xabar mahalla xodimini chalg'itadi). Yuborishning o'zi keyingi
 * «Hozir yubor» yoki kunlik jadval bilan bo'ladi.
 */
export async function POST() {
  const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR']);
  if (q instanceof NextResponse) return q;

  try {
    const soni = await xatoliNavbatniQaytar();
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'Xabarnoma',
      izoh: `Xato bilan tugagan ${soni} ta xabar navbatga qaytarildi`,
    });
    return NextResponse.json({ ok: true, soni });
  } catch (e) {
    const { izId } = await serverXatosi('api:admin-navbat-qayta', e);
    return NextResponse.json({ xabar: 'Qaytarib bo‘lmadi', izId }, { status: 500 });
  }
}
