import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { brifingniYubor, brifingYasa } from '@/lib/hokim-brifingi';
import { navbatniDarhol } from '@/lib/xabarnoma';

/**
 * ============================================================
 *  ЭРТАЛАБКИ БРИФИНГ — CRON
 *
 *  GET   — Vercel Cron чақиради, сир сўз билан
 *  POST  — администратор «Ҳозир юбор» деб синаб кўриши учун
 *
 *  Иккита йўл бор, чунки жадвал кунига бир марта ишлайди:
 *  синаш учун эртагача кутиб бўлмайди.
 * ============================================================
 */

export const dynamic = 'force-dynamic';

async function ishga(request: Request, cronYolimi: boolean) {
  /*
   * Cron сир сўз билан киради, одам эса сессия билан.
   * `navbat` йўлидаги билан АЙНАН бир хил нақш — иккита
   * ҳар хил текширув бўлса, бирида тешик қолиши мумкин.
   */
  const cronSiri = process.env.CRON_SECRET;
  const kelgan = request.headers.get('authorization');
  const cronmi = Boolean(cronSiri) && kelgan === `Bearer ${cronSiri}`;

  if (!cronmi) {
    if (cronYolimi) {
      return NextResponse.json({ ok: false, xabar: 'Ruxsat yoʻq' }, { status: 401 });
    }
    const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR', 'HOKIM']);
    if (q instanceof NextResponse) return q;
  }

  try {
    const soni = await brifingniYubor();

    /*
     * Навбатга қўйиб, ДАРҲОЛ юборамиз. Жадвал кунига бир
     * марта ишлайди — иккинчи cron ни кутиб бўлмайди, акс
     * ҳолда брифинг эртага етиб борарди.
     */
    if (soni > 0) await navbatniDarhol();

    return NextResponse.json({ ok: true, yuborildi: soni });
  } catch (e) {
    console.error('Brifingni yuborib bolmadi:', e);
    return NextResponse.json(
      { ok: false, xabar: 'Brifing tayyorlanmadi' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return ishga(request, true);
}

export async function POST(request: Request) {
  return ishga(request, false);
}

/**
 * Матнни ЮБОРМАСДАН кўриш — администратор синаб кўриши учун.
 *
 * Брифинг ҳар куни 70 та одамга эмас, учта раҳбарга кетади.
 * Аммо матнни олдиндан кўриш барибир керак: хато ёзув
 * раҳбарнинг телефонида қолади.
 */
export async function PUT() {
  const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR', 'HOKIM']);
  if (q instanceof NextResponse) return q;

  const b = await brifingYasa();
  return NextResponse.json({ ok: true, matn: b.matn });
}
