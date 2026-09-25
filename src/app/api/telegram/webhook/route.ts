import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ISH_BELGISI } from '@/lib/xabarnoma';
import { ishTopildiXabari } from '@/lib/joylashuv-xabari';
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
  /*
   * Тугма босилганда келади. Telegram `callback_data` ни
   * 64 байт билан чегаралайди, шунинг учун 128 — эҳтиёт
   * захираси билан.
   */
  callback_query: z
    .object({
      id: z.string(),
      data: z.string().max(128).optional(),
      message: z
        .object({
          message_id: z.number(),
          chat: z.object({ id: z.union([z.number(), z.string()]) }),
        })
        .optional(),
      from: z.object({ id: z.union([z.number(), z.string()]) }),
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

  /*
   * ── ТУГМА БОСИЛДИ ──
   *
   * Матнли хабардан ОЛДИН текширилади: Telegram иккаласини
   * бир сўровда юбормайди, аммо тартиб аниқ бўлгани яхши.
   */
  const bosildi = natija.data.callback_query;
  if (bosildi) {
    await tugmaBosildi(bosildi);
    return NextResponse.json({ ok: true });
  }

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

/**
 * ── «ИШ ТОПДИМ» ТУГМАСИ ──
 *
 * Хавфсизлик шу ерда ҳал бўлади. Telegram'дан келган сўровда
 * СЕССИЯ ЙЎҚ, яъни оддий текширувлар ишламайди. Учта қатлам:
 *
 *   1. `callback_data` шакли — нотўғри бўлса шу ерда тўхтайди
 *   2. Chat БОҒЛАНГАН ходимники бўлиши шарт — акс ҳолда
 *      ким бўлса шу ботга ёзиб, тугма белгисини тахмин қилиб
 *      юборарди
 *   3. Фуқаро ходимнинг ЎЗ маҳалласида бўлиши шарт — белгини
 *      қўлда ўзгартириб, бошқа маҳалла одамига хабар ёзишнинг
 *      олди олинади (текширув `ishTopildiXabari` ичида)
 */
async function tugmaBosildi(q: {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number | string } };
  from: { id: number | string };
}): Promise<void> {
  const javob = async (matn: string) => {
    try {
      await callbackJavobi(q.id, matn);
    } catch (e) {
      console.error('Telegram callback javobi:', e);
    }
  };

  const qism = (q.data ?? '').split(':');
  if (qism.length !== 3 || qism[0] !== ISH_BELGISI) {
    await javob('Тугма эскирган');
    return;
  }
  const [, vacancyId, ishsizId] = qism;

  /*
   * Chat эмас, FROM бўйича қидирамиз: гуруҳда бот бўлса,
   * chat гуруҳники, тугмани эса аниқ бир одам босади.
   */
  const xodim = await prisma.user.findFirst({
    where: { telegramChatId: String(q.from.id), faol: true },
    select: { id: true, mahallaId: true },
  });
  if (!xodim) {
    await javob('Сиз тизимга уланмагансиз');
    return;
  }

  const natija = await ishTopildiXabari({
    vacancyId,
    ishsizId,
    xabarchiId: xodim.id,
    xabarchiMahallaId: xodim.mahallaId,
  });

  if (!natija.ok) {
    await javob(natija.sabab);
    return;
  }
  await javob(
    natija.allaqachon
      ? 'Бу фуқаро учун хабар аллақачон юборилган'
      : 'Қабул қилинди. Бандлик маркази тасдиқлайди.'
  );
}

/**
 * Telegram'га «тугма ишлади» деб жавоб қайтаради.
 *
 * Жавоб берилмаса, тугмада айланма белги ЎН СОНИЯ туради ва
 * ходим «ишламади» деб яна босади.
 */
async function callbackJavobi(callbackId: string, matn: string): Promise<void> {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text: matn,
      /* Кичик ёзув эмас, ойнача: ходим ўқиб улгурсин */
      show_alert: true,
    }),
  });
}
