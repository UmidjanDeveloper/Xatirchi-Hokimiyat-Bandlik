import { randomBytes } from 'node:crypto';
import type { Prisma, XabarTuri } from '@prisma/client';
import { prisma } from './prisma';

/**
 * ============================================================
 *  TELEGRAM XABARNOMASI
 *
 *  Маҳалла ходими кун бўйи саҳифани очиб ўтирмайди — у дала
 *  ишида. Шунинг учун бўш иш ўрни эълони чиқса, ундан хабар
 *  топиши учун сайтга кириши керак эди. Амалда эса у кирмасди
 *  ва эълон ўз-ўзидан эскирарди.
 *
 *  Энди хабар ЎЗИ боради: «сизнинг маҳаллангизга мос эълон
 *  чиқди» — исм ва телефон билан.
 *
 *  ── Учта эҳтиёткорлик ──
 *
 *  1. ШАХСИЙ МАЪЛУМОТ юборилмайди. Telegram — ташқи хизмат
 *     ва хабар унинг серверида қолади. Шунинг учун хабарда
 *     фақат «3 та мос номзод бор» деб ёзилади, исм-фамилия
 *     эса ИЛОВАДА кўринади.
 *
 *  2. ХОДИМ ЎЗИ боғлайди. Администратор қўлда chat ID
 *     кирита олмайди: битта рақам хато терилса, хабар
 *     БЕГОНА одамга кетарди.
 *
 *  3. НАВБАТ жадвали. Telegram ишламай турса, хабар
 *     йўқолмайди — у навбатда қолади ва администратор
 *     панелида кўринади.
 * ============================================================
 */

/** Bot tokeni - Vercel sozlamalarida turadi */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/** Telegram tayyormi - sozlanmagan bo'lsa navbat to'planaveradi */
export function telegramSozlanganmi(): boolean {
  return Boolean(TOKEN);
}

// ─────────────────────────────────────────────────────────────
//  BOG'LASH
// ─────────────────────────────────────────────────────────────

/** Kod necha daqiqa amal qiladi */
const KOD_MUDDATI_DAQIQA = 15;

/**
 * Ходимга бир марталик боғлаш коди беради.
 *
 * Код қисқа ва ўқилиши осон бўлиши керак: ходим уни экрандан
 * ўқиб, телефонда ботга теради. Шунинг учун 6 та белги ва
 * чалкаштириладиган ҳарфлар (O/0, I/1) ишлатилмайди.
 */
export async function ulanishKodi(userId: string): Promise<string> {
  const belgilar = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const xom = randomBytes(6);
  const kod = Array.from(xom, (b) => belgilar[b % belgilar.length]).join('');

  await prisma.user.update({
    where: { id: userId },
    data: { telegramKodi: kod, telegramKodiVaqti: new Date() },
  });
  return kod;
}

/**
 * Ботдан келган кодни текшириб, чат ID ни боғлайди.
 *
 * Эскирган код қабул қилинмайди: экранда очиқ турган код
 * бошқа одамнинг кўзига тушиши мумкин.
 */
export async function kodniUlash(
  kod: string,
  chatId: string
): Promise<{ ok: true; fullName: string } | { ok: false; sabab: string }> {
  const xodim = await prisma.user.findUnique({
    where: { telegramKodi: kod.trim().toUpperCase() },
    select: { id: true, fullName: true, telegramKodiVaqti: true, faol: true },
  });

  if (!xodim) return { ok: false, sabab: 'Код топилмади' };
  if (!xodim.faol) return { ok: false, sabab: 'Ҳисоб фаол эмас' };

  const yosh = Date.now() - (xodim.telegramKodiVaqti?.getTime() ?? 0);
  if (yosh > KOD_MUDDATI_DAQIQA * 60_000) {
    return { ok: false, sabab: 'Код эскирган — иловадан янгисини олинг' };
  }

  await prisma.user.update({
    where: { id: xodim.id },
    data: {
      telegramChatId: chatId,
      telegramSana: new Date(),
      /* Ишлатилган код ТОЗАЛАНАДИ - қайта ишлатиб бўлмайди */
      telegramKodi: null,
      telegramKodiVaqti: null,
    },
  });

  return { ok: true, fullName: xodim.fullName };
}

/** Bog'lanishni uzadi */
export async function ulanishniUz(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: null, telegramSana: null },
  });
}

// ─────────────────────────────────────────────────────────────
//  NAVBAT
// ─────────────────────────────────────────────────────────────

export interface YangiXabar {
  userId: string;
  turi: XabarTuri;
  matn: string;
  bogliqTuri?: string;
  bogliqId?: string;
}

/**
 * Хабарни навбатга қўяди.
 *
 * Дарҳол юборилмайди: сақлаш транзакцияси ичида ташқи сўров
 * юбориш нотўғри бўларди — Telegram секин жавоб берса, бутун
 * транзакция кутиб қоларди ва хатлов сақланмасди.
 */
export async function xabarQoshish(
  xabarlar: YangiXabar[],
  tx?: Prisma.TransactionClient
): Promise<number> {
  if (xabarlar.length === 0) return 0;
  const db = tx ?? prisma;

  const natija = await db.xabarnoma.createMany({
    data: xabarlar.map((x) => ({
      userId: x.userId,
      turi: x.turi,
      matn: x.matn,
      bogliqTuri: x.bogliqTuri ?? null,
      bogliqId: x.bogliqId ?? null,
    })),
  });
  return natija.count;
}

/** Nechta urinishdan keyin to'xtaydi */
const ENG_KOP_URINISH = 3;

/**
 * Хабар юборувчи — синовда алмаштирилади.
 *
 * Контейнердан `api.telegram.org` га чиқиб бўлмайди, шунинг
 * учун навбат мантиқи АЛОҲИДА синовдан ўтказилади: юборувчи
 * ўрнига сохта функция берилади ва «юборилди», «хато»,
 * «уриниш сони» ҳолатлари текширилади.
 */
export type Yuboruvchi = (chatId: string, matn: string) => Promise<void>;

/** Haqiqiy Telegram jo'natuvchisi */
export const telegramYuboruvchi: Yuboruvchi = async (chatId, matn) => {
  if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan');

  const javob = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: matn,
      parse_mode: 'HTML',
      /* Ҳаволалар кўриниши хабарни узайтиради — ўчирилган */
      disable_web_page_preview: true,
    }),
  });

  if (!javob.ok) {
    const xato = await javob.text().catch(() => '');
    throw new Error(`Telegram ${javob.status}: ${xato.slice(0, 200)}`);
  }
};

export interface NavbatNatijasi {
  korildi: number;
  yuborildi: number;
  xato: number;
  /** Ходим Telegram ни боғламаган — хабар бекор қилинди */
  ulanmagan: number;
}

/**
 * Навбатдаги хабарларни юборади.
 *
 * Хато бўлса хабар ЙЎҚОЛМАЙДИ: уриниш сони ошади ва сабаби
 * ёзилади. Уч мартадан кейин тўхтайди — бот блокланган бўлса,
 * чексиз уриниш фойдасиз ва навбатни тиқилиб қолдиради.
 */
export async function navbatniYubor(
  yuboruvchi: Yuboruvchi = telegramYuboruvchi,
  chegara = 50
): Promise<NavbatNatijasi> {
  const navbat = await prisma.xabarnoma.findMany({
    where: { holati: 'KUTILMOQDA', urinishlar: { lt: ENG_KOP_URINISH } },
    orderBy: { createdAt: 'asc' },
    take: chegara,
    include: { user: { select: { telegramChatId: true } } },
  });

  const natija: NavbatNatijasi = {
    korildi: navbat.length,
    yuborildi: 0,
    xato: 0,
    ulanmagan: 0,
  };

  for (const x of navbat) {
    const chatId = x.user.telegramChatId;

    /*
     * Ходим Telegram ни боғламаган бўлса, хабар БЕКОР
     * қилинади — «хато» эмас. Фарқи муҳим: хато тузатилиши
     * керак, боғламаган ходим эса шунчаки боғламаган.
     * Иккови бир хил кўринса, администратор ҳақиқий хатони
     * топа олмасди.
     */
    if (!chatId) {
      await prisma.xabarnoma.update({
        where: { id: x.id },
        data: { holati: 'BEKOR', xatoMatni: 'Ходим Telegram ни боғламаган' },
      });
      natija.ulanmagan++;
      continue;
    }

    try {
      await yuboruvchi(chatId, x.matn);
      await prisma.xabarnoma.update({
        where: { id: x.id },
        data: {
          holati: 'YUBORILDI',
          yuborilganSana: new Date(),
          urinishlar: x.urinishlar + 1,
          xatoMatni: null,
        },
      });
      natija.yuborildi++;
    } catch (e) {
      const urinish = x.urinishlar + 1;
      await prisma.xabarnoma.update({
        where: { id: x.id },
        data: {
          /*
           * Уч мартагача «кутилмоқда» бўлиб қолади — кейинги
           * ишга туширишда яна уринилади. Учинчидан кейин
           * ХАТО бўлади ва администратор панелида кўринади.
           */
          holati: urinish >= ENG_KOP_URINISH ? 'XATO' : 'KUTILMOQDA',
          urinishlar: urinish,
          xatoMatni: (e as Error).message.slice(0, 500),
        },
      });
      natija.xato++;
    }
  }

  return natija;
}

/**
 * ДАРҲОЛ ЮБОРИШГА УРИНИШ — «ишласа яхши» усули.
 *
 * ── Нега керак бўлиб қолди ──
 *
 * Навбат Vercel Cron билан тозаланади. Vercel нинг бепул
 * (Hobby) тарифида эса cron КУНИГА БИР МАРТА ишлайди — ундан
 * тез-тез ёзилса, деплойнинг ўзи рад этилади.
 *
 * Агар хабар фақат cron ни кутса, бандлик ходими киритган
 * эълон маҳалла ходимига бир СУТКАГАЧА бормай туриши мумкин
 * эди. Эълоннинг бутун маъноси эса тезликда.
 *
 * Шунинг учун хабар навбатга қўйилгандан кейин ДАРҲОЛ
 * юборишга уриниб кўрилади. Кундалик cron энди фақат
 * ЗАХИРА: ўша пайтда Telegram жавоб бермаган ёки сервер
 * узилиб қолган хабарларни эртаси куни олиб кетади.
 *
 * Хатони ЮТАДИ — атайин. Хабар кетмаса ҳам эълон сақланган
 * бўлиши керак: бандлик ходимининг иши тугаган, унинг
 * ишини Telegram нинг носозлиги бекор қила олмайди. Хабар
 * навбатда қолади ва кейин юборилади.
 */
export async function navbatniDarhol(): Promise<void> {
  if (!telegramSozlanganmi()) return;
  try {
    await navbatniYubor();
  } catch (e) {
    console.error('Навбатни дарҳол юбориб бўлмади:', e);
  }
}

/** Administrator paneli uchun hisob */
export async function xabarHisobi(): Promise<{
  kutilmoqda: number;
  yuborildi: number;
  xato: number;
  bekor: number;
  ulangan: number;
  jamiXodim: number;
}> {
  const [holatlar, ulangan, jamiXodim] = await Promise.all([
    prisma.xabarnoma.groupBy({ by: ['holati'], _count: true }),
    prisma.user.count({ where: { telegramChatId: { not: null }, faol: true } }),
    prisma.user.count({ where: { faol: true } }),
  ]);

  const soni = (h: string) => holatlar.find((x) => x.holati === h)?._count ?? 0;
  return {
    kutilmoqda: soni('KUTILMOQDA'),
    yuborildi: soni('YUBORILDI'),
    xato: soni('XATO'),
    bekor: soni('BEKOR'),
    ulangan,
    jamiXodim,
  };
}

// ─────────────────────────────────────────────────────────────
//  XABAR MATNLARI
// ─────────────────────────────────────────────────────────────

/** Telegram HTML uchun xavfsiz matn */
function xavfsiz(matn: string): string {
  return matn.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * «Мос эълон чиқди» хабари.
 *
 * ШАХСИЙ МАЪЛУМОТ ЙЎҚ: фақат сон айтилади. Исм ва телефон
 * иловада, рухсат текширилган ҳолда кўринади. Telegram ташқи
 * хизмат ва хабар унинг серверида қолади.
 */
export function ishOrniMatni(x: {
  lavozim: string;
  korxonaNomi: string;
  mahallaNomi: string;
  bosh: number;
  nomzodlar: number;
}): string {
  return [
    '<b>Янги бўш иш ўрни</b>',
    '',
    `${xavfsiz(x.lavozim)} — ${xavfsiz(x.korxonaNomi)}`,
    `${xavfsiz(x.mahallaNomi)} МФЙ · ${x.bosh} та ўрин бўш`,
    '',
    x.nomzodlar > 0
      ? `Сизнинг маҳаллангизда <b>${x.nomzodlar} та</b> мос фуқаро бор.`
      : 'Маҳаллангизда мос фуқаро топилмади — аммо сиз одамларни рўйхатдан яхшироқ биласиз.',
    '',
    'Исм ва телефонни иловадан кўринг: /xatlov',
  ].join('\n');
}

/** IT-shaharcha vaucherini kutayotganlar haqida */
export function vaucherMatni(soni: number, mahallaNomi: string): string {
  return [
    '<b>IT-шаҳарча ваучери</b>',
    '',
    `${xavfsiz(mahallaNomi)} МФЙ да <b>${soni} та</b> фуқаро ваучер кутмоқда.`,
    '',
    'Бандлик маркази билан боғланинг: /xatlov',
  ].join('\n');
}

/** Bog'lash tasdiqlangani haqida */
export function ulanishMatni(fullName: string): string {
  return [
    '<b>Уланиш тасдиқланди</b>',
    '',
    `${xavfsiz(fullName)}, Telegram ҳисобингиз «Хатирчи бандлик» тизимига уланди.`,
    '',
    'Маҳаллангизга мос бўш иш ўрни чиққанда шу ерга хабар келади.',
  ].join('\n');
}
