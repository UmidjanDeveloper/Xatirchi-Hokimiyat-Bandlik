import { NextResponse } from 'next/server';
import { idrokKaliti, idrokKalitiTogrimi, idrokStatistikasi } from '@/lib/idrok-statistika';

/**
 * ============================================================
 *  IDROK UCHUN YASHIRIN STATISTIKA API
 *
 *  GET /api/idrok/stats
 *  Sarlavha: X-IDROK-Key: <IDROK_API_KEY>
 *
 *  IDROK (hokimiyatning AI yordamchisi) serverida bizning
 *  sessiya cookie'si yo'q va bo'lishi ham mumkin emas. Shuning
 *  uchun bu yo'l middleware'da AYNAN shu manzil bilan ochilgan
 *  va o'z kaliti bilan himoyalangan — Telegram webhook va Cron
 *  yo'llari bilan bir xil naqsh.
 *
 *    · `IDROK_API_KEY` qo'yilmagan  -> 404 (yo'l o'chiq)
 *    · kalit noto'g'ri yoki yo'q    -> 401
 *    · hisoblashda xato             -> 500, tafsilotsiz
 *
 *  Javobda faqat jamlangan sonlar va katalog nomlari bor —
 *  tafsiloti `src/lib/idrok-statistika.ts` da.
 * ============================================================
 */

export const dynamic = 'force-dynamic';
/* `node:crypto` (sha256 + timingSafeEqual) kerak — Edge emas */
export const runtime = 'nodejs';

/* Javob hech qayerda keshlanmasin: na brauzerda, na CDN da */
const SARLAVHALAR = { 'Cache-Control': 'no-store' } as const;

export async function GET(request: Request) {
  const kalit = idrokKaliti();
  if (!kalit) {
    return NextResponse.json({ xato: 'Topilmadi' }, { status: 404, headers: SARLAVHALAR });
  }

  if (!idrokKalitiTogrimi(request.headers.get('x-idrok-key'), kalit)) {
    return NextResponse.json({ xato: "Ruxsat yo'q" }, { status: 401, headers: SARLAVHALAR });
  }

  try {
    const statistika = await idrokStatistikasi();
    return NextResponse.json(statistika, { headers: SARLAVHALAR });
  } catch (e) {
    /*
     * Xato faqat server jurnaliga yoziladi. Javobga matn ham,
     * stek ham chiqmaydi: unda jadval va ustun nomlari, ba'zan
     * ulanish ma'lumoti bo'ladi.
     */
    console.error('IDROK statistikasi tayyorlanmadi:', e);
    return NextResponse.json(
      { xato: "Statistikani tayyorlab bo'lmadi" },
      { status: 500, headers: SARLAVHALAR }
    );
  }
}
