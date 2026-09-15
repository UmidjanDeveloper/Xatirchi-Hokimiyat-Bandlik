import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  kodniUlash,
  telegramSozlanganmi,
  telegramYuboruvchi,
  ulanishMatni,
} from '@/lib/xabarnoma';

/*
 * ТЕЛЕГРАМ ВЕБХУКИ
 *
 * Бот хабар олганда Telegram шу манзилга POST юборади.
 *
 * ── Нега сир сўз керак ──
 *
 * Бу манзил ОЧИҚ: аутентификация йўқ, чунки Telegram
 * серверида бизнинг куки ҳам, токен ҳам йўқ. Шунинг учун
 * Telegram нинг ўз механизми ишлатилади: вебхук ўрнатилганда
 * `secret_token` берилади ва у ҳар сўровда сарлавҳада
 * қайтади.
 *
 * Бунисиз ҳар ким бу манзилга сохта сўров юбориб, ўз чат ID
 * сини бошқа ходимнинг ҳисобига боғлаб олиши мумкин эди.
 */

export const dynamic = 'force-dynamic';

const Yangilanish = z.object({
  message: z
    .object({
      text: z.string().max(500).optional(),
      chat: z.object({ id: z.union([z.number(), z.string()]) }),
    })
    .optional(),
});

export async function POST(request: Request) {
  if (!telegramSozlanganmi()) {
    return NextResponse.json({ ok: false, xabar: 'Telegram sozlanmagan' }, { status: 503 });
  }

  const sir = process.env.TELEGRAM_WEBHOOK_SIRI;
  if (sir) {
    const kelgan = request.headers.get('x-telegram-bot-api-secret-token');
    if (kelgan !== sir) {
      /*
       * 401 эмас, 200 қайтарамиз: Telegram 401 кўрса вебхукни
       * ўчириб қўяди. Сохта сўровга эса шунчаки жавоб бермаймиз.
       */
      return NextResponse.json({ ok: true });
    }
  }

  const natija = Yangilanish.safeParse(await request.json().catch(() => null));
  if (!natija.success) return NextResponse.json({ ok: true });

  const xabar = natija.data.message;
  const matn = xabar?.text?.trim();
  const chatId = xabar?.chat.id;
  if (!matn || chatId === undefined) return NextResponse.json({ ok: true });

  /*
   * Кутилган матн: «/start ABC123» ёки шунчаки «ABC123».
   * Ходим кодни нусха кўчириб қўйганда «/start» ёзмаслиги
   * мумкин — иккала кўринишни ҳам қабул қиламиз.
   */
  const kod = matn.replace(/^\/start\s*/i, '').trim();
  if (!kod) return NextResponse.json({ ok: true });

  const ulanish = await kodniUlash(kod, String(chatId));

  /*
   * Жавоб ЮБОРИЛАДИ, навбатга қўйилмайди: ходим кодни ҳозир
   * терди ва ҳозир жавоб кутяпти. Навбат эса кейинроқ
   * ишлайдиган хабарлар учун.
   *
   * Юборилмаса ҳам вебхук ОК қайтаради: акс ҳолда Telegram
   * қайта-қайта юбораверарди.
   */
  const javob = ulanish.ok
    ? ulanishMatni(ulanish.fullName)
    : `❗ ${ulanish.sabab}`;

  try {
    await telegramYuboruvchi(String(chatId), javob);
  } catch (e) {
    console.error('Telegram javobini yuborib bolmadi:', e);
  }

  return NextResponse.json({ ok: true });
}
