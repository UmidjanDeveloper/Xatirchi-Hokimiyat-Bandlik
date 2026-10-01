import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { navbatniYubor, telegramSozlanganmi } from '@/lib/xabarnoma';
import { prisma } from '@/lib/prisma';
import { muddatiOtganlarniYop } from '@/lib/elon-muddati';
import { muddatiTugaganlarniOgohlantir } from '@/lib/beruvchi-elonlari';
import { eskiYozuvlarniTozala, ishniKuzat, serverXatosi, xatoniYoz } from '@/lib/tizim-kuzatuvi';
import { murojaatMuddatiXabarlari } from '@/lib/murojaat-xabari';
import { maxfiyniTozala } from '@/lib/maxfiy';

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
   * ── КУЗАТУВ ──
   *
   * Бутун иш `ishniKuzat` ичида: «cron охирги марта қачон
   * МУВАФФАҚИЯТЛИ ишлаган» деган савол шу ердан жавоб олади.
   * Жадвалдан келган чақирув ва администратор тугмаси алоҳида
   * белгиланади — тугма босиб қўйиш ўлик жадвални яширмасин.
   */
  try {
    return await ishniKuzat(
      'navbat',
      cronmi ? 'cron' : 'qolda',
      ishniBajar,
      (r) => r.xulosa
    ).then((r) => NextResponse.json(r.json, { status: r.status }));
  } catch (e) {
    const { izId } = await serverXatosi('api:telegram-navbat', e);
    return NextResponse.json({ ok: false, xabar: 'Навбатни юбориб бўлмади', izId }, { status: 500 });
  }
}

interface IshNatijasi {
  status: number;
  json: Record<string, unknown>;
  xulosa: string;
}

async function ishniBajar(): Promise<IshNatijasi> {
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
    const hozir = new Date();
    yopilganElon = await muddatiOtganlarniYop(prisma, hozir);
    /* Ish beruvchiga xabar: faqat HOZIR yopilganlar haqida, bir marta */
    if (yopilganElon > 0 && telegramSozlanganmi()) {
      await muddatiTugaganlarniOgohlantir(hozir).catch((e) =>
        console.error('muddati tugagan elon haqida xabar yuborib bolmadi', e)
      );
    }
  } catch (e) {
    console.error('muddati otgan elonlarni yopib bolmadi', e);
  }

  /* Эски кириш уринишлари ва иш излари: хабарномага боғлиқ эмас, ҳар сафар */
  let tozalandi = '';
  try {
    const t = await eskiYozuvlarniTozala();
    tozalandi = `, тозаланди: ${t.urinish + t.iz}`;
  } catch (e) {
    console.error('eski yozuvlarni tozalab bolmadi', maxfiyniTozala(e));
  }

  /*
   * ── МУРОЖААТ МУДДАТИ ХАБАРЛАРИ ──
   *
   * Муддати яқин (бугун/эртага) ва ўтган мурожаатлар ҳақида масъул
   * ходимга, ўтгани ҳақида раҳбарларга хабар НАВБАТГА қўйилади.
   * Юборишдан ОЛДИН: шу ишга тушишнинг ўзида жўнайди. Хато бўлса
   * навбат барибир юборилади — хабар қўйиш юборишни тўсмасин.
   * Telegram созланмаган бўлса ҳам навбатга қўйилади (навбат
   * тўпланади, токен қўйилгач кетади).
   */
  let murojaatXabari = '';
  try {
    const r = await murojaatMuddatiXabarlari();
    murojaatXabari = `, мурожаат хабари: ${r.yaratildi}${r.otkazildi ? ' (ўтказилди: бошқаси ишлаяпти)' : ''}`;
  } catch (e) {
    murojaatXabari = ', мурожаат хабари: ХАТО';
    await xatoniYoz('cron:navbat-murojaat', e);
  }

  if (!telegramSozlanganmi()) {
    return {
      status: 503,
      json: { ok: false, yopilganElon, xabar: 'TELEGRAM_BOT_TOKEN созланмаган' },
      xulosa: `Telegram созланмаган; ёпилган эълон: ${yopilganElon}${tozalandi}${murojaatXabari}`,
    };
  }

  const natija = await navbatniYubor();
  return {
    status: 200,
    json: { ok: true, yopilganElon, ...natija },
    xulosa: `юборилди: ${natija.yuborildi}, хато: ${natija.xato}, ёпилган эълон: ${yopilganElon}${tozalandi}${murojaatXabari}`,
  };
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
