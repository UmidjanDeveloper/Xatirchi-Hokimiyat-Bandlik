import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { navbatniYubor, telegramSozlanganmi } from '@/lib/xabarnoma';

/*
 * НАВБАТНИ ЮБОРИШ
 *
 * Иккита йўл билан чақирилади:
 *   1. Vercel Cron — ҳар ўн беш дақиқада
 *   2. Администратор панелидаги тугма — «ҳозир юбор»
 *
 * Иккинчиси синаш учун керак: созлама тўғри қўйилганини
 * кутиб ўтирмасдан текшириш мумкин бўлсин.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function ishga(request: Request, cronYolimi: boolean) {
  /*
   * Cron сир сўз билан киради, одам эса сессия билан.
   * Иккови ҳам бўлмаса — рад.
   */
  const cronSiri = process.env.CRON_SECRET;
  const kelgan = request.headers.get('authorization');
  const cronmi = Boolean(cronSiri) && kelgan === `Bearer ${cronSiri}`;

  if (!cronmi) {
    /*
     * Cron йўлига (GET) сессия билан кириб бўлмайди: у фақат
     * жадвал учун. Одам «Ҳозир юбор» тугмасини босганда POST
     * кетади ва ўша ерда сессия текширилади.
     */
    if (cronYolimi) {
      return NextResponse.json({ ok: false, xabar: 'Ruxsat yoʻq' }, { status: 401 });
    }
    const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR']);
    if (q instanceof NextResponse) return q;
  }

  if (!telegramSozlanganmi()) {
    return NextResponse.json(
      { ok: false, xabar: 'TELEGRAM_BOT_TOKEN созланмаган' },
      { status: 503 }
    );
  }

  const natija = await navbatniYubor();
  return NextResponse.json({ ok: true, ...natija });
}

/**
 * Vercel Cron — GET юборади.
 *
 * Илгари бу ерда фақат POST бор эди ва жадвал ЖИМГИНА
 * ишламасди: Vercel 405 оларди, навбат эса тўпланиб борарди.
 */
export async function GET(request: Request) {
  return ishga(request, true);
}

/** Администратор панелидаги «Ҳозир юбор» тугмаси */
export async function POST(request: Request) {
  return ishga(request, false);
}
