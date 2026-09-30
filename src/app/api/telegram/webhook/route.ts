import { timingSafeEqual } from 'crypto';
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
import { SAVOL, kodShaklimi, savolgaJavob, tumanKartasi, yordamMatni } from '@/lib/bot-savol';
import {
  BERUVCHI,
  beruvchiMenyusi,
  beruvchiQaroriMatni,
  beruvchiTop,
  beruvchigaXabarBer,
  beruvchiniHalQil,
  elonQaroriMatni,
  elonniHalQil,
  elonniModeratsiyagaYubor,
  royxatMatni,
  royxatSuhbati,
  royxatniBoshla,
  royxatniYubor,
  tanishtirish,
} from '@/lib/ish-beruvchi';
import { beruvchiOmbori, omborBoshla, omborMatn, omborSuhbatiBormi, omborTugma, omborYarat } from '@/lib/bot-elon';
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
  type Tugma,
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

/**
 * Суҳбат ШАХСИЙ ми.
 *
 * ── Нега муҳим ──
 *
 * Бот ходимнинг ҳисобини улайди, фуқаролар рўйхатини
 * кўрсатади ва модерация тугмаларини беради. Буларнинг
 * ҳаммаси БИР одамга аталган.
 *
 * Бот гуруҳга қўшилса (уни ҳар ким қила олади), ўша
 * гуруҳдаги ҳамма фуқароларнинг исми ва телефонини кўриб
 * қоларди — ва улашни ҳеч ким атайлаб қилмаган бўларди.
 *
 * `type` келмаган ҳолда ID нинг ишорасига қараймиз:
 * Telegram'да шахсий чат ID си мусбат, гуруҳники манфий.
 */
function shaxsiyMi(chat: { id: number | string; type?: string }): boolean {
  if (chat.type) return chat.type === 'private';
  const raqam = typeof chat.id === 'number' ? chat.id : Number(chat.id);
  return Number.isFinite(raqam) ? raqam > 0 : false;
}

const Yangilanish = z.object({
  /*
   * ── ТАКРОР ЮБОРИЛГАН ЯНГИЛАНИШ ──
   *
   * Telegram жавоб ололмаса ЎША update ни қайта юборади.
   * Бу оддий ҳол: тармоқ узилди, сервер секин жавоб берди,
   * деплой пайтига тўғри келди.
   *
   * Бунисиз бир «тасдиқлаш» тугмаси икки марта ишлар,
   * бир эълон икки марта тарқатилар эди.
   */
  update_id: z.number().int().optional(),
  message: z
    .object({
      text: z.string().max(500).optional(),
      chat: z.object({
        id: z.union([z.number(), z.string()]),
        /*
         * `private` — шахсий суҳбат. Гуруҳда ходим ҳисобини
         * улаш ёки фуқаролар рўйхатини кўрсатиш мумкин эмас:
         * гуруҳдаги ҳар ким уни ўқиб қоларди.
         */
        type: z.string().max(32).optional(),
      }),
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
          chat: z.object({
            id: z.union([z.number(), z.string()]),
            type: z.string().max(32).optional(),
          }),
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

  /*
   * ── СИР МАЖБУРИЙ ──
   *
   * Аввал бу ерда `if (sir)` турарди: сир созланмаган бўлса
   * текширув БУТУНЛАЙ ўтказиб юборилар ва манзил очиқ
   * қоларди. Ҳар ким сохта сўров юбориб ўз чат ID сини
   * бошқа ходимнинг ҳисобига улаб олиши мумкин эди.
   *
   * Энди сир йўқ бўлса — хизмат ишламайди. Бу «эҳтиёт
   * чораси» эмас, ягона тўғри йўл: созланмаган ҳимояни
   * созланган деб кўрсатиш ундан ҳам ёмон.
   */
  const sir = process.env.TELEGRAM_WEBHOOK_SIRI;
  if (!sir || sir.length < 16) {
    console.error('TELEGRAM_WEBHOOK_SIRI sozlanmagan — vebxuk so‘rovi rad etildi');
    return NextResponse.json({ ok: false, xabar: 'Vebxuk sozlanmagan' }, { status: 503 });
  }

  const kelgan = request.headers.get('x-telegram-bot-api-secret-token');
  if (!kelgan || kelgan.length !== sir.length || !timingSafeEqual(Buffer.from(kelgan), Buffer.from(sir))) {
    /*
     * 401 эмас, 200 қайтарамиз: Telegram 401 кўрса вебхукни
     * ўчириб қўяди. Сохта сўровга эса шунчаки жавоб бермаймиз.
     */
    return NextResponse.json({ ok: true });
  }

  const natija = Yangilanish.safeParse(await request.json().catch(() => null));
  if (!natija.success) return NextResponse.json({ ok: true });

  /*
   * ── БИР ЯНГИЛАНИШ — БИР МАРТА ──
   *
   * `update_id` Telegram берадиган ўсувчи рақам. Уни базага
   * ёзамиз: иккинчи марта ёзиб бўлмаса, демак бу янгиланиш
   * аллақачон бажарилган.
   *
   * Текширув эмас, ЁЗИШ орқали: иккита нусха бир вақтда
   * ишлаётган бўлса, «борми?» деб сўраш иккаласига ҳам «йўқ»
   * дейиши мумкин. Ягоналик чегараси эса фақат биттасини
   * ўтказади.
   */
  const yangilanishId = natija.data.update_id;
  if (yangilanishId !== undefined) {
    try {
      await prisma.telegramYangilanish.create({ data: { updateId: BigInt(yangilanishId) } });
    } catch {
      /* Аллақачон бажарилган — жим қайтамиз */
      return NextResponse.json({ ok: true });
    }
  }

  /*
   * ── ТУГМА БОСИЛДИ ──
   *
   * Матнли хабардан ОЛДИН текширилади: Telegram иккаласини
   * бир сўровда юбормайди, аммо тартиб аниқ бўлгани яхши.
   */
  const bosildi = natija.data.callback_query;
  if (bosildi) {
    /*
     * Гуруҳдаги тугма ЖИМ қолдирилади: у ерда ким босганини
     * ва кимга аталганини ажратиб бўлмайди.
     */
    if (bosildi.message && !shaxsiyMi(bosildi.message.chat)) {
      return NextResponse.json({ ok: true });
    }
    await tugmaBosildi(bosildi);
    return NextResponse.json({ ok: true });
  }

  const xabar = natija.data.message;
  const matn = xabar?.text?.trim();
  const chatId = xabar?.chat.id;
  if (!matn || chatId === undefined || !xabar) return NextResponse.json({ ok: true });

  /*
   * ── ФАҚАТ ШАХСИЙ СУҲБАТ ──
   *
   * Гуруҳда бирон амал бажарилмайди. Бир марта тушунтириб
   * қўямиз — жим қолса, бот бузуқдек кўринарди.
   */
  if (!shaxsiyMi(xabar.chat)) {
    await telegramYuboruvchi(
      String(chatId),
      'Бу бот фақат ШАХСИЙ суҳбатда ишлайди. Ботни очиб, «Бошлаш» тугмасини босинг.'
    );
    return NextResponse.json({ ok: true });
  }

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
  /*
   * ── ИШ БЕРУВЧИ ──
   *
   * У ҳокимият ходими эмас, коди ҳам йўқ. Унинг матни —
   * рўйхат саволига ёки эълон саволига жавоб.
   *
   * Текширув кодни текширишдан ОЛДИН: акс ҳолда «Оқ Олтин
   * МЧЖ» деб ёзилган корхона номи «код топилмади» деган
   * жавоб оларди.
   */
  const beruvchi = await beruvchiTop(String(chatId));
  if (beruvchi) {
    const javobi = await beruvchiMatni(beruvchi.id, matn);
    if (javobi) {
      try {
        await telegramYuboruvchi(String(chatId), javobi.matn, javobi.tugmalar);
      } catch (e) {
        console.error('Ish beruvchiga javob yuborib bolmadi:', e);
      }
      return NextResponse.json({ ok: true });
    }
  }

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

  /*
   * ── САВОЛ-ЖАВОБ ──
   *
   * Уланган ходим учун матн — бу КОД эмас, САВОЛ. Коднинг
   * умри 15 дақиқа ва у уланишдан кейин ўчирилади; уланган
   * одам иккинчи марта код терми.
   *
   * Шунинг учун тартиб: уланган бўлса — савол; уланмаган
   * бўлса — код.
   *
   * Битта истисно бор. Ходим бошқа ҳисобга ўтмоқчи бўлса,
   * уланган ҳолида ҳам код теради. Код шакли аниқ (олтита
   * белги, чалкаштириладиган ҳарфларсиз), шунинг учун уни
   * саволдан ажратиш мумкин: аввал код синаб кўрилади, топилмаса
   * матн саволга ўтади.
   */
  const kodShakli = kodShaklimi(kod);

  if (suhbatchi && !kodShakli) {
    await savolniJavobla(suhbatchi, String(chatId), matn);
    return NextResponse.json({ ok: true });
  }

  const ulanish = await kodniUlash(kod, String(chatId));

  /*
   * Уланган ходим код шаклидаги СЎЗ ёзган бўлса («qamrov»
   * олти ҳарф), у код эмас, савол эди. «Код топилмади» деб
   * жавоб бериш — тупик: одам нима қилишни билмайди.
   */
  if (!ulanish.ok && suhbatchi) {
    await savolniJavobla(suhbatchi, String(chatId), matn);
    return NextResponse.json({ ok: true });
  }

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

/**
 * Иш берувчининг матни — рўйхат саволига ёки эълон саволига.
 *
 * `null` қайтса, матн унга тегишли эмас ва оддий йўлга
 * тушади.
 */
async function beruvchiMatni(
  beruvchiId: string,
  matn: string
): Promise<{ matn: string; tugmalar: Tugma[] } | null> {
  /* Рўйхатдан ўтиш суҳбати */
  if (await royxatSuhbati(beruvchiId)) {
    return royxatMatni(beruvchiId, matn);
  }
  /* Эълон суҳбати — ходимникидан ФАРҚСИЗ, фақат омбор бошқа */
  const ombor = beruvchiOmbori(beruvchiId);
  if (await omborSuhbatiBormi(ombor)) {
    return omborMatn(ombor, matn);
  }
  /* Суҳбат йўқ — менюни кўрсатамиз */
  return beruvchiMenyusi(beruvchiId);
}

/**
 * Саволга жавоб беради.
 *
 * Хато ютилади ва ўрнига кўрсатма юборилади: бот ЖИМ
 * қолмаслиги керак. Жим бот — бузуқ бот, ва ходим уни
 * иккинчи марта очмайди.
 */
async function savolniJavobla(userId: string, chatId: string, matn: string): Promise<void> {
  try {
    const j = await savolgaJavob(userId, matn);
    await telegramYuboruvchi(chatId, j.matn, j.tugmalar);
  } catch (e) {
    console.error('Savolga javob berib bolmadi:', e);
    try {
      const y = yordamMatni(false);
      await telegramYuboruvchi(chatId, y.matn, y.tugmalar);
    } catch {
      /* Telegram жавоб бермади — вебхук барибир OK қайтаради */
    }
  }
}

/** Менюни юборади — уланганга ўз меню, уланмаганга кўрсатма */
async function menyuniKorsat(chatId: string): Promise<void> {
  const userId = await chatXodimi(chatId);

  /*
   * ── КИМ ЁЗДИ ──
   *
   * Учта ҳолат бор: ҳокимият ходими, иш берувчи ва нотаниш
   * одам.
   *
   * Аввал фақат иккитаси бор эди ва нотаниш одамга «сайтдан
   * код олинг» деб ёзиларди. Иш берувчида эса на сайт
   * ҳисоби бор, на код оладиган жойи — у бу матнни ўқиб,
   * ботни ёпарди.
   */
  const beruvchi = userId ? null : await beruvchiTop(chatId);

  const n: MenyuNatijasi = userId
    ? await boshMenyu(userId)
    : beruvchi
      ? await beruvchiMenyusi(beruvchi.id)
      : tanishtirish();
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
   * ── ИШ БЕРУВЧИ ЗАНЖИРИ ТУГМАЛАРИ ──
   *
   * Икки томон бор: иш берувчининг ўзи (рўйхат ва эълон) ва
   * раҳбар (модерация). Иккови ҳам `b.` билан бошланади,
   * аммо ҳуқуқлари БУТУНЛАЙ бошқа — шунинг учун иккита
   * алоҳида блок.
   */
  if (belgi.startsWith('b.')) {
    await beruvchiTugmasi(belgi, chatId, String(q.from.id), javob);
    return;
  }

  /*
   * ── САВОЛ-ЖАВОБ ТУГМАЛАРИ ──
   *
   * Жавоб матнидаги «Туман бўйича» тугмаси. У ҳам уланишни
   * талаб қилади: тугма белгисини тахмин қилиб, бегона одам
   * туман кўрсаткичини олиб қўймасин.
   */
  if (belgi.startsWith('s.')) {
    const kim = await prisma.user.findFirst({
      where: { telegramChatId: String(q.from.id), faol: true },
      select: { id: true, rol: true },
    });
    if (!kim) {
      await javob('Сиз уланмагансиз');
      return;
    }

    const keng =
      kim.rol === 'HOKIM' ||
      kim.rol === 'BANDLIK_RAHBAR' ||
      kim.rol === 'ADMIN' ||
      kim.rol === 'BANDLIK';

    if (belgi === SAVOL.TUMAN && !keng) {
      await javob('Туман кесими сиз учун эмас');
      return;
    }

    const j = belgi === SAVOL.TUMAN ? await tumanKartasi() : yordamMatni(keng);
    await javob('');
    try {
      await telegramYuboruvchi(chatId, j.matn, j.tugmalar);
    } catch (e) {
      console.error('Savol javobini yuborib bolmadi:', e);
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
    /*
     * ── ЭЪЛОН СУҲБАТИНИ ИККИ ХИЛ ОДАМ ЎТАДИ ──
     *
     * Саволлар, тугмалар ва текширувлар АЙНАН бир хил —
     * фарқ фақат сақлаш жойида ва натижада: раҳбарнинг
     * эълони дарҳол тарқалади, иш берувчиники эса
     * модерацияга боради.
     *
     * Иш берувчи аввал текширилади: у `User` эмас ва
     * қуйидаги сўров уни топа олмайди.
     */
    const beruvchi = await beruvchiTop(chatId);
    if (beruvchi) {
      await beruvchiElonTugmasi(beruvchi.id, beruvchi.holati, belgi, chatId, javob);
      return;
    }

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

/**
 * ============================================================
 *  ИШ БЕРУВЧИ ЗАНЖИРИНИНГ ТУГМАЛАРИ
 *
 *  ── Нега модерация тугмалари АЛОҲИДА текширилади ──
 *
 *  `b.qabul` ва `b.eq` — раҳбарнинг тугмалари. Уларни босиш
 *  эълонни 70 та ходимга тарқатади.
 *
 *  Тугма белгиси эса Telegram'дан келади ва уни қўлда
 *  ўзгартириб юбориш мумкин. Сессия йўқ, шунинг учун
 *  текширув АЙНАН шу ерда: белги `b.` билан бошлангани
 *  етарли эмас, босган одам раҳбар бўлиши шарт.
 * ============================================================
 */
async function beruvchiTugmasi(
  belgi: string,
  chatId: string,
  fromId: string,
  javob: (matn: string) => Promise<void>
): Promise<void> {
  const [belgisi, qiymat] = belgi.split(':');

  /* ── РАҲБАР ТОМОНИ: МОДЕРАЦИЯ ── */
  const moderatsiya = [
    BERUVCHI.QABUL,
    BERUVCHI.RAD,
    BERUVCHI.ELON_QABUL,
    BERUVCHI.ELON_RAD,
  ] as string[];

  if (moderatsiya.includes(belgisi)) {
    const kim = await prisma.user.findFirst({
      where: { telegramChatId: fromId, faol: true },
      select: { id: true, rol: true },
    });
    if (!kim) {
      await javob('Сиз уланмагансиз');
      return;
    }
    if (kim.rol !== 'BANDLIK_RAHBAR' && kim.rol !== 'ADMIN') {
      await javob('Бу амал сиз учун эмас');
      return;
    }
    if (!qiymat) {
      await javob('Тугма эскирган');
      return;
    }

    /* ── Иш берувчини ҳал қилиш ── */
    if (belgisi === BERUVCHI.QABUL || belgisi === BERUVCHI.RAD) {
      const qabul = belgisi === BERUVCHI.QABUL;
      const n = await beruvchiniHalQil({ beruvchiId: qiymat, userId: kim.id, qabul });
      if (!n.ok) {
        await javob('Аллақачон ҳал қилинган');
        return;
      }
      await javob(qabul ? 'Тасдиқланди' : 'Рад этилди');

      await telegramYuboruvchi(
        chatId,
        qabul
          ? `<b>${n.korxonaNomi}</b> тасдиқланди — энди эълон қўя олади.`
          : `<b>${n.korxonaNomi}</b> рад этилди.`
      );

      /*
       * Иш берувчининг ЎЗИГА ҳам хабар. Усиз у жимликда
       * қоларди: ариза юборган-у, жавоб келмаган.
       *
       * Матн САЙТдаги билан айнан бир хил — иккови ҳар хил
       * гапирса, иш берувчи қайси бири расмий эканини
       * билмасди.
       */
      await beruvchigaXabarBer(
        n.chatId,
        beruvchiQaroriMatni({ qabul, korxonaNomi: n.korxonaNomi ?? '—' })
      );
      if (qabul && n.chatId) {
        const m = await beruvchiMenyusi(qiymat);
        await beruvchigaXabarBer(n.chatId, m.matn, m.tugmalar);
      }
      return;
    }

    /* ── Эълонни ҳал қилиш ── */
    const qabul = belgisi === BERUVCHI.ELON_QABUL;
    const n = await elonniHalQil({ vacancyId: qiymat, userId: kim.id, qabul });
    if (!n.ok) {
      await javob('Аллақачон ҳал қилинган');
      return;
    }
    await javob(qabul ? 'Тасдиқланди' : 'Рад этилди');

    let kimga = 0;
    if (qabul) {
      /*
       * Тарқатиш АЛОҲИДА: хато бўлса ҳам эълон тасдиқланган
       * бўлиб қолиши керак — раҳбарнинг қарори бажарилди.
       */
      try {
        kimga = await ishOrniXabarlari(qiymat);
        await navbatniDarhol();
      } catch (e) {
        console.error('Elon xabarlarini tarqatib bolmadi:', e);
      }
    }

    await telegramYuboruvchi(
      chatId,
      qabul
        ? [
            `<b>${n.lavozim}</b> тасдиқланди.`,
            '',
            kimga > 0
              ? `${kimga} та маҳалла ходимига хабар кетди.`
              : 'Ҳозирча ҳеч бир ходимга хабар кетмади — уланганлар йўқ ёки мос маҳалла топилмади.',
          ].join('\n')
        : `<b>${n.lavozim}</b> рад этилди.`
    );

    await beruvchigaXabarBer(n.chatId, elonQaroriMatni({ qabul, lavozim: n.lavozim ?? '—' }));
    return;
  }

  /* ── ИШ БЕРУВЧИ ТОМОНИ ── */

  if (belgisi === BERUVCHI.XODIM) {
    const n = ulanmaganMatni();
    await javob('');
    await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
    return;
  }

  if (belgisi === BERUVCHI.ROYXAT) {
    const n = await royxatniBoshla(chatId);
    await javob('');
    await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
    return;
  }

  const beruvchi = await beruvchiTop(chatId);
  if (!beruvchi) {
    await javob('Аввал рўйхатдан ўтинг');
    return;
  }

  if (belgisi === BERUVCHI.BEKOR) {
    await prisma.ishBeruvchi.update({
      where: { id: beruvchi.id },
      data: { bosqich: null, suhbat: {}, suhbatVaqti: null },
    });
    await javob('Бекор қилинди');
    const n = await beruvchiMenyusi(beruvchi.id);
    await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
    return;
  }

  if (belgisi === BERUVCHI.YUBOR) {
    const n = await royxatniYubor(beruvchi.id);
    await javob('');
    await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
    /* Раҳбарга хабар навбатда — дарҳол юборамиз */
    await navbatniDarhol().catch((e) => console.error('Navbatni yurgizib bolmadi:', e));
    return;
  }

  if (belgisi === BERUVCHI.MENYU) {
    const n = await beruvchiMenyusi(beruvchi.id);
    await javob('');
    await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
    return;
  }

  /*
   * ── ЭЪЛОН ҚЎЙИШ ──
   *
   * Фақат ТАСДИҚЛАНГАН иш берувчи. Акс ҳолда тасдиқланмаган
   * одам ҳар куни ўнта сохта эълон юбориб, раҳбарнинг
   * навбатини тиқиб ташлаши мумкин эди.
   */
  if (beruvchi.holati !== 'TASDIQLANDI') {
    await javob('Аризангиз ҳали тасдиқланмаган');
    return;
  }

  const ombor = beruvchiOmbori(beruvchi.id);

  if (belgisi === BERUVCHI.ELON) {
    const n = await omborBoshla(ombor);
    await javob('');
    await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
    return;
  }

  await javob('Тугма эскирган');
}

/**
 * Иш берувчининг эълон суҳбати тугмалари.
 *
 * Суҳбат коди ЎША — фақат омбор бошқа ва якуни бошқа:
 * эълон дарҳол тарқалмайди, модерацияга боради.
 */
async function beruvchiElonTugmasi(
  beruvchiId: string,
  holati: string,
  belgi: string,
  chatId: string,
  javob: (matn: string) => Promise<void>
): Promise<void> {
  if (holati !== 'TASDIQLANDI') {
    await javob('Аризангиз ҳали тасдиқланмаган');
    return;
  }

  const ombor = beruvchiOmbori(beruvchiId);

  if (belgi === ELON.BEKOR) {
    await ombor.ochir();
    await javob('Бекор қилинди');
    const n = await beruvchiMenyusi(beruvchiId);
    await telegramYuboruvchi(chatId, n.matn, n.tugmalar);
    return;
  }

  if (belgi === ELON.TASDIQ) {
    const natija = await omborYarat(ombor, beruvchiId);
    if (!natija.ok) {
      await javob(natija.sabab);
      return;
    }
    await javob('Юборилди');

    /*
     * Хабар тарқатилмайди — эълон ҳали ҳеч кимнинг кўзидан
     * ўтмаган. Раҳбарга модерация хабари кетади.
     */
    try {
      await elonniModeratsiyagaYubor(natija.id);
      await navbatniDarhol();
    } catch (e) {
      console.error('Moderatsiya xabarini yuborib bolmadi:', e);
    }

    await telegramYuboruvchi(
      chatId,
      [
        '<b>Эълонингиз юборилди</b>',
        '',
        natija.lavozim,
        '',
        'Бандлик маркази кўриб чиқади. Тасдиқлангач, туманнинг барча маҳалла ходимига хабар боради ва жавоб шу ерга келади.',
      ].join('\n')
    );
    return;
  }

  const j = await omborTugma(ombor, belgi);
  if (j) {
    await javob('');
    await telegramYuboruvchi(chatId, j.matn, j.tugmalar);
    return;
  }

  await javob('Тугма эскирган');
}
