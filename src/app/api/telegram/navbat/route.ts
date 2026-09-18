import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { navbatniYubor, telegramSozlanganmi } from '@/lib/xabarnoma';
import { prisma } from '@/lib/prisma';
import { muddatiOtganlarniYop } from '@/lib/elon-muddati';

/*
 * НАВБАТНИ ЮБОРИШ
 *
 * Уч йўл билан чақирилади:
 *   1. Эълон киритилганда — ДАРҲОЛ (`navbatniDarhol`)
 *   2. Vercel Cron — кунига бир марта, захира сифатида
 *   3. Администратор панелидаги тугма — «ҳозир юбор»
 *
 * ── Нега cron кунига бир марта ──
 *
 * Илгари `vercel.json` да «ҳар 15 дақиқада» деб ёзилган эди.
 * Vercel нинг бепул (Hobby) тарифида cron кунига биттадан
 * тез-тез бўлиши мумкин эмас ва ундай жадвал ёзилса ДЕПЛОЙ
 * РАД ЭТИЛАДИ. Натижада бешта commit сайтга умуман чиқмай
 * қолди ва буни ҳеч ким сезмади — ишлаб турган эски нусха
 * жойида эди.
 *
 * Шунинг учун асосий йўл — биринчиси: хабар навбатга
 * қўйилиши биланоқ юборилади. Cron фақат ўша пайтда
 * ўтмай қолганини олиб кетади.
 *
 * Учинчиси синаш учун керак: созлама тўғри қўйилганини
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

  /*
   * ── КУНЛИК ТОЗАЛАШ ──
   *
   * Telegram текширувидан ОЛДИН туради ва ҳар сафар бажарилади.
   *
   * Сабаби: Telegram созланмаган бўлса, йўл 503 билан
   * қайтарди — ва муддати ўтган эълонлар ҳеч қачон
   * ёпилмасди. Тозалаш хабарномага боғлиқ эмас.
   *
   * Хато бўлса ҳам йўл тўхтамайди: хабар юбориш тозалашдан
   * муҳимроқ ва биттаси иккинчисини йиқитмаслиги керак.
   */
  let yopilganElon = 0;
  try {
    yopilganElon = await muddatiOtganlarniYop(prisma);
  } catch (e) {
    console.error('muddati otgan elonlarni yopib bolmadi', e);
  }

  if (!telegramSozlanganmi()) {
    return NextResponse.json(
      { ok: false, yopilganElon, xabar: 'TELEGRAM_BOT_TOKEN созланмаган' },
      { status: 503 }
    );
  }

  const natija = await navbatniYubor();
  return NextResponse.json({ ok: true, yopilganElon, ...natija });
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
