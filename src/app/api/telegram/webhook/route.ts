import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ISH_BELGISI } from '@/lib/xabarnoma';
import { ishTopildiXabari } from '@/lib/joylashuv-xabari';
import { ulangandaOchiqOrinlar } from '@/lib/ish-orni-xabari';
import { kimRadEtdi, RAD, radniYoz, sababniSora } from '@/lib/rad-etish';
import {
  ELON,
  elonniYarat,
  matnliJavob,
  suhbatBormi,
  suhbatniBekorQil,
  suhbatniBoshla,
  tugmaliJavob,
} from '@/lib/bot-elon';
import { ishOrniXabarlari } from '@/lib/ish-orni-xabari';
import {
  boshMenyu,
  fuqarolarRoyxati,
  MENYU,
  orinlarRoyxati,
  ulanmaganMatni,
  uzishSorovi,
  xodimlarHolati,
  type MenyuNatijasi,
} from '@/lib/bot-menyu';
import { z } from 'zod';
import {
  kodniUlash,
  navbatniDarhol,
  ulanishniUz,
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

  /*
   * ── КОДСИЗ `/start` — МЕНЮ ──
   *
   * Аввал бу ерда шунчаки `return` турарди: ходим `/start`
   * босса, экран ЖИМ қоларди. Ҳолбуки `/start` — ботда
   * босиладиган биринчи тугма, ва у жим турса бот бузуқдек
   * кўринади.
   *
   * Энди уланган ходимга ўз рақамлари ва тугмалари, уланмаганга
   * эса улаш кўрсатмаси чиқади.
   */
  if (!kod || /^\/(start|menyu|menu|help|yordam)$/i.test(matn)) {
    /* Меню очилса, ярим қолган суҳбат ташланади */
    const kim = await chatXodimi(String(chatId));
    if (kim) await suhbatniBekorQil(kim);
    await menyuniKorsat(String(chatId));
    return NextResponse.json({ ok: true });
  }

  /*
   * ── ЭЪЛОН СУҲБАТИ ──
   *
   * Раҳбар «янги иш ўрни» тугмасини босган бўлса, кейинги
   * матнлар КОД эмас, саволларга жавоб. Шунинг учун суҳбат
   * кодни текширишдан ОЛДИН келади.
   */
  const suhbatchi = await chatXodimi(String(chatId));
  if (suhbatchi && (await suhbatBormi(suhbatchi))) {
    const j = await matnliJavob(suhbatchi, matn);
    if (j) {
      try {
        await telegramYuboruvchi(String(chatId), j.matn, j.tugmalar);
      } catch (e) {
        console.error('Suhbat javobini yuborib bolmadi:', e);
      }
      return NextResponse.json({ ok: true });
    }
  }

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

  /*
   * ── УЛАНГАНДАН КЕЙИН: ОЧИҚ ЭЪЛОНЛАР ──
   *
   * Хабар эълон қўйилган пайтда ясалади. Ходим кейинроқ
   * уланса, ундан олдинги эълонлардан бехабар қолади —
   * эълон эса ҳали очиқ ва одам кутяпти.
   *
   * Шунинг учун уланиш ҳам хабар сабаби бўлади: маҳалласидаги
   * очиқ эълонлар (энг янги бештаси) навбатга қўйилади ва
   * дарҳол юборилади.
   *
   * Хато ютилади: уланишнинг ЎЗИ муваффақиятли бўлди ва
   * ходим буни аллақачон кўрди. Эълонлар келмаса — камчилик,
   * аммо уланишни бекор қилиш сабаби эмас.
   */
  if (ulanish.ok) {
    try {
      const soni = await ulangandaOchiqOrinlar(ulanish.userId);
      if (soni > 0) await navbatniDarhol();
    } catch (e) {
      console.error('Ulangandan keyin ochiq elonlarni yuborib bolmadi:', e);
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Chat ID бўйича ходимни топади.
 *
 * Уланмаган бўлса `null` — унга меню эмас, улаш кўрсатмаси
 * кўрсатилади.
 */
async function chatXodimi(chatId: string): Promise<string | null> {
  const x = await prisma.user.findFirst({
    where: { telegramChatId: chatId, faol: true },
    select: { id: true },
  });
  return x?.id ?? null;
}

/** Менюни юборади — уланганга ўз меню, уланмаганга кўрсатма */
async function menyuniKorsat(chatId: string): Promise<void> {
  const userId = await chatXodimi(chatId);
  const n: MenyuNatijasi = userId ? await boshMenyu(userId) : ulanmaganMatni();
  try {
    await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
  } catch (e) {
    console.error('Menyuni yuborib bolmadi:', e);
  }
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

  const belgi = q.data ?? '';
  const chatId = String(q.message?.chat.id ?? q.from.id);

  /*
   * ── МЕНЮ ТУГМАЛАРИ ──
   *
   * Улар `m.` билан бошланади ва эълонга боғлиқ эмас.
   * Ҳар бири учун ходим УЛАНГАН бўлиши шарт: акс ҳолда
   * бегона одам ботга ёзиб, тугма белгисини тахмин қилиб
   * маҳалла маълумотини кўра оларди.
   */
  if (belgi.startsWith('m.')) {
    const userId = await chatXodimi(String(q.from.id));
    if (!userId) {
      await javob('Сиз уланмагансиз');
      return;
    }

    let n: MenyuNatijasi;
    switch (belgi) {
      case MENYU.ORINLAR:
        n = await orinlarRoyxati(userId);
        break;
      case MENYU.FUQAROLAR:
        n = await fuqarolarRoyxati(userId);
        break;
      case MENYU.XODIMLAR: {
        /* Фақат раҳбар ва администратор */
        const rol = await prisma.user.findUnique({
          where: { id: userId },
          select: { rol: true },
        });
        if (rol?.rol !== 'BANDLIK_RAHBAR' && rol?.rol !== 'ADMIN') {
          await javob('Бу бўлим сиз учун эмас');
          return;
        }
        n = await xodimlarHolati();
        break;
      }
      case MENYU.UZISH:
        n = uzishSorovi();
        break;
      case MENYU.UZISH_TASDIQ:
        await ulanishniUz(userId);
        await javob('Уланиш узилди');
        try {
          await telegramYuboruvchi(
            chatId,
            [
              'Уланиш узилди. Бўш иш ўринлари ҳақида хабар энди келмайди.',
              '',
              'Қайта улаш учун сайтдан янги код олинг.',
            ].join('\n')
          );
        } catch (e) {
          console.error('Uzish xabarini yuborib bolmadi:', e);
        }
        return;
      default:
        n = await boshMenyu(userId);
    }

    await javob('');
    try {
      await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
    } catch (e) {
      console.error('Menyu javobini yuborib bolmadi:', e);
    }
    return;
  }

  /*
   * ── ЭЪЛОН СУҲБАТИ ТУГМАЛАРИ ──
   *
   * Фақат бандлик раҳбари ва администратор эълон қўя олади:
   * эълон 70 та ходимга хабар юборади, ва уни ким қўйганига
   * жавобгарлик бор.
   */
  if (belgi.startsWith('e.')) {
    const kim = await prisma.user.findFirst({
      where: { telegramChatId: String(q.from.id), faol: true },
      select: { id: true, rol: true },
    });
    if (!kim) {
      await javob('Сиз уланмагансиз');
      return;
    }
    if (kim.rol !== 'BANDLIK_RAHBAR' && kim.rol !== 'ADMIN') {
      await javob('Эълонни фақат бандлик раҳбари қўяди');
      return;
    }

    if (belgi === ELON.BOSHLA) {
      const j = await suhbatniBoshla(kim.id);
      await javob('');
      await telegramYuboruvchi(chatId, j.matn, j.tugmalar);
      return;
    }

    if (belgi === ELON.BEKOR) {
      await suhbatniBekorQil(kim.id);
      await javob('Бекор қилинди');
      const n = await boshMenyu(kim.id);
      await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
      return;
    }

    if (belgi === ELON.TASDIQ) {
      const natija = await elonniYarat(kim.id);
      if (!natija.ok) {
        await javob(natija.sabab);
        return;
      }
      await javob('Эълон жойлаштирилди');

      /*
       * Хабар тарқатиш АЛОҲИДА: хато бўлса ҳам эълон
       * сақланиб қолиши керак — раҳбарнинг иши тугади.
       */
      let kimga = 0;
      try {
        kimga = await ishOrniXabarlari(natija.id);
        await navbatniDarhol();
      } catch (e) {
        console.error('Elon xabarlarini tarqatib bolmadi:', e);
      }

      await telegramYuboruvchi(
        chatId,
        [
          '<b>Эълон жойлаштирилди</b>',
          '',
          natija.lavozim,
          '',
          kimga > 0
            ? `${kimga} та маҳалла ходимига хабар кетди.`
            : 'Ҳозирча ҳеч бир ходимга хабар кетмади — уланганлар йўқ ёки мос маҳалла топилмади.',
        ].join('\n')
      );
      return;
    }

    const j = await tugmaliJavob(kim.id, belgi);
    if (j) {
      await javob('');
      await telegramYuboruvchi(chatId, j.matn, j.tugmalar);
      return;
    }

    await javob('Тугма эскирган');
    return;
  }

  /*
   * ── «РАД ЭТДИ» — УЧ ҚАДАМ ──
   *
   *   r:<эълон>                  → кимни рад этди
   *   rp:<эълон>:<фуқаро>        → нима сабабдан
   *   rs:<эълон>:<фуқаро>:<код>  → ёзилади
   *
   * Уч қадам, чунки сабаб МАЖБУРИЙ: «рад этди» деган ялпи сон
   * қарорга айланмайди, сабаб эса айланади.
   */
  const rq = belgi.split(':');
  if (rq[0] === RAD.KIM || rq[0] === RAD.SABAB || rq[0] === RAD.YOZ) {
    const xodim = await prisma.user.findFirst({
      where: { telegramChatId: String(q.from.id), faol: true },
      select: { id: true, mahallaId: true },
    });
    if (!xodim) {
      await javob('Сиз уланмагансиз');
      return;
    }

    if (rq[0] === RAD.KIM && rq.length === 2) {
      const n = await kimRadEtdi(xodim.id, rq[1]);
      await javob('');
      await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
      return;
    }

    if (rq[0] === RAD.SABAB && rq.length === 3) {
      const n = await sababniSora(rq[1], rq[2]);
      await javob('');
      await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
      return;
    }

    if (rq[0] === RAD.YOZ && rq.length === 4) {
      const natija = await radniYoz({
        vacancyId: rq[1],
        ishsizId: rq[2],
        sababBelgisi: rq[3],
        xabarchiId: xodim.id,
        xabarchiMahallaId: xodim.mahallaId,
      });
      if (!natija.ok) {
        await javob(natija.sabab);
        return;
      }
      await javob('Ёзилди');
      await navbatniDarhol();
      await telegramYuboruvchi(
        chatId,
        [
          '<b>Ёзилди</b>',
          '',
          `${natija.fish} — ${natija.sabab}`,
          '',
          'Бандлик марказига хабар берилди.',
        ].join('\n')
      );
      return;
    }

    await javob('Тугма эскирган');
    return;
  }

  const qism = belgi.split(':');
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
