import { randomBytes } from 'node:crypto';
import { maxfiyniTozala } from './maxfiy';
import { BERUVCHI } from './beruvchi-belgilari';
import type { Prisma, XabarTuri } from '@prisma/client';
import { prisma, type Tranzaksiya } from './prisma';

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
): Promise<{ ok: true; userId: string; fullName: string } | { ok: false; sabab: string }> {
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

  /*
   * `userId` ҳам қайтарилади: уланишдан КЕЙИН ходимга
   * маҳалласидаги очиқ эълонлар юборилади ва вебхукка унинг
   * id си керак бўлади.
   */
  return { ok: true, userId: xodim.id, fullName: xodim.fullName };
}

/** Bog'lanishni uzadi */
export async function ulanishniUz(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: null, telegramSana: null },
  });

  /*
   * ── РАҲБАРГА ХАБАР ──
   *
   * Узилган ходимнинг маҳалласига эълон хабари БОРМАЙДИ.
   * Занжир ўша маҳаллада тўхтайди — жимгина, хато белгисисиз.
   *
   * Раҳбар буни фақат ойлар ўтиб, «нега бу маҳалладан ҳеч ким
   * жойлашмаяпти» деган саволда сезарди.
   *
   * Хабар БУ ЕРДА, чунки узиш икки жойдан бўлади: ботдаги
   * тугмадан ва сайтдан. Иккови ҳам шу функцияни чақиради.
   *
   * Хато ютилади: узишнинг ЎЗИ бажарилди ва уни бекор қилиш
   * нотўғри бўларди.
   */
  try {
    const { uzilganiniBildir } = await import('./rad-etish');
    await uzilganiniBildir(userId);
  } catch (e) {
    console.error('Uzilgani haqida xabar berib bolmadi:', e);
  }
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
  tx?: Tranzaksiya
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
/**
 * Telegram тугмаси.
 *
 * `belgi` — фуқаро босганда серверга қайтадиган қиймат.
 * Telegram уни 64 БАЙТ билан чегаралайди, шунинг учун
 * қисқа: `ish:<эълон>:<фуқаро>`.
 */
export interface Tugma {
  yozuv: string;
  belgi: string;
}

export type Yuboruvchi = (
  chatId: string,
  matn: string,
  tugmalar?: Tugma[]
) => Promise<void>;

/** Haqiqiy Telegram jo'natuvchisi */
export const telegramYuboruvchi: Yuboruvchi = async (chatId, matn, tugmalar) => {
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
      /*
       * Ҳар тугма АЛОҲИДА қаторда: исмлар узун ва ёнма-ён
       * қўйилса телефонда қирқилиб кўринарди.
       */
      ...(tugmalar?.length
        ? {
            reply_markup: {
              inline_keyboard: tugmalar.map((t) => [
                { text: t.yozuv, callback_data: t.belgi },
              ]),
            },
          }
        : {}),
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
/** Тугманинг белгиси — `callback_data` шакли */
export const ISH_BELGISI = 'ish';

/** «Рад этди» тугмаси — ким ва нима сабабдан, кетма-кет сўралади */
export const RAD_BELGISI = 'r';

/** Битта хабарда кўрсатиладиган энг кўп номзод */
export const ENG_KOP_TUGMA = 5;

/**
 * Хабарга қандай тугма керак.
 *
 * Ҳозирча биттагина ҳолат: янги иш ўрни эълони. Маҳалла
 * ходимига ЎЗ маҳалласидаги мос номзодлар исми билан
 * чиқарилади ва ҳар бирига «иш топдим» тугмаси қўйилади.
 *
 * ── Нега исм юборилади ──
 *
 * Илгари хабарда фақат СОН турарди: «маҳаллангизда 3 та мос
 * фуқаро бор, иловадан кўринг». Ходим иловани очиши, эълонни
 * топиши, рўйхатни солиштириши керак эди — ва кўпинча
 * очмасди.
 *
 * Исм эса ўша заҳоти ишга тушади: ходим одамни танийди,
 * қўнғироқ қилади. ТЕЛЕФОН РАҚАМИ ЮБОРИЛМАЙДИ — у иловада
 * қолади: исм кимлигини айтиш учун етарли, рақам эса
 * Telegram серверида қолиб кетарди.
 */
/**
 * Хабарнинг тугмалари — ЮБОРИШ пайтида ясалади.
 *
 * Экспорт қилинган, чунки синов уни бевосита чақиради:
 * навбат орқали синаш ишончсиз — навбатда бошқа хабарлар
 * ҳам турибди ва улар биринчи тушиб қолиши мумкин.
 */
export async function xabarTugmalari(x: {
  turi: XabarTuri;
  bogliqTuri: string | null;
  bogliqId: string | null;
  userId: string;
}): Promise<Tugma[]> {
  if (!x.bogliqId) return [];

  /*
   * ── МОДЕРАЦИЯ ТУГМАЛАРИ ──
   *
   * Улар ҳам юбориш пайтида ясалади: агар раҳбар аризани
   * навбат ишлагунча аллақачон ҳал қилган бўлса, тугма
   * УМУМАН чиқмайди.
   *
   * Тугмани хабар билан бирга сақлаб қўйиш осонроқ эди,
   * аммо унда бир марта ҳал қилинган ариза устида иккинчи
   * тугма қолиб кетарди — ва уни босган одам «нега
   * ишламаяпти» деб ўйларди.
   */
  if (x.turi === 'ISH_BERUVCHI_ARIZASI' && x.bogliqTuri === 'IshBeruvchi') {
    const b = await prisma.ishBeruvchi.findUnique({
      where: { id: x.bogliqId },
      select: { holati: true },
    });
    if (b?.holati !== 'KUTILMOQDA') return [];
    return [
      { yozuv: '✅ Тасдиқлаш', belgi: `${BERUVCHI.QABUL}:${x.bogliqId}` },
      { yozuv: '✖️ Рад этиш', belgi: `${BERUVCHI.RAD}:${x.bogliqId}` },
    ];
  }

  if (x.turi === 'ELON_MODERATSIYADA' && x.bogliqTuri === 'Vacancy') {
    const e = await prisma.vacancy.findUnique({
      where: { id: x.bogliqId },
      select: { moderatsiya: true },
    });
    if (e?.moderatsiya !== 'KUTILMOQDA') return [];
    return [
      { yozuv: '✅ Тасдиқлаш', belgi: `${BERUVCHI.ELON_QABUL}:${x.bogliqId}` },
      { yozuv: '✖️ Рад этиш', belgi: `${BERUVCHI.ELON_RAD}:${x.bogliqId}` },
    ];
  }

  if (x.turi !== 'YANGI_ISH_ORNI' || x.bogliqTuri !== 'Vacancy') return [];

  const [xodim, orin] = await Promise.all([
    prisma.user.findUnique({ where: { id: x.userId }, select: { mahallaId: true } }),
    prisma.vacancy.findUnique({
      where: { id: x.bogliqId },
      select: { id: true, faol: true },
    }),
  ]);
  /* Маҳаллага бириктирилмаган ходимга тугма чиқмайди:
     у қайси фуқаро ҳақида гап кетаётганини билмайди */
  if (!xodim?.mahallaId || !orin?.faol) return [];

  const nomzodlar = await prisma.unemployedPerson.findMany({
    where: {
      mahallaId: xodim.mahallaId,
      /* Аллақачон жойлаштирилганга тугма керак эмас */
      vacancyId: null,
      holati: { in: ['ANIQLANDI', 'SUHBAT_OTKAZILDI', 'TAKLIF_BERILDI'] },
      /* Шу эълонга хабар қилинганлар ҳам тушиб қолади */
      joylashuvXabarlari: { none: { vacancyId: orin.id } },
    },
    orderBy: { fish: 'asc' },
    take: ENG_KOP_TUGMA,
    select: { id: true, fish: true },
  });

  /*
   * ── ИККИНЧИ ЖАВОБ: «РАД ЭТДИ» ──
   *
   * Аввал хабарда ФАҚАТ «иш топдим» бор эди. Ҳақиқатда эса
   * ходим кўпинча бошқа нарсани айтади: «бордим, аммо ўзи
   * хоҳламади» ёки «маош кам деди».
   *
   * У жавобнинг бориладиган жойи йўқ эди — ходим ҳеч нарса
   * босмасди ва хабар «жавобсиз» бўлиб қоларди.
   *
   * Тугма ҳар бир исм учун эмас, БИТТА: акс ҳолда ўнта тугма
   * чиқиб, экран тўлиб кетарди. Босилгач ким ва нима сабабдан
   * экани кетма-кет сўралади.
   */
  return [
    ...nomzodlar.map((n) => ({
      yozuv: `✅ ${qisqaIsm(n.fish)} — иш топдим`,
      belgi: `${ISH_BELGISI}:${orin.id}:${n.id}`,
    })),
    { yozuv: '✖️ Рад этди', belgi: `${RAD_BELGISI}:${orin.id}` },
  ];
}

/**
 * Telegram тугмасининг ёзуви 64 белгига яқинлашса телефонда
 * қирқилади. Исмни «Фамилия И.О.» шаклига келтирамиз.
 */
function qisqaIsm(fish: string): string {
  const qism = fish.trim().split(/\s+/);
  if (qism.length < 2) return fish.slice(0, 28);
  const bosh = qism.slice(1).map((q) => q[0]?.toUpperCase() + '.').join('');
  return `${qism[0]} ${bosh}`.slice(0, 28);
}

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
      /*
       * Тугмалар ЮБОРИШ пайтида ҳисобланади, навбатга
       * қўйилганда эмас.
       *
       * Сабаби: навбат билан юбориш ораси соатлаб бўлиши
       * мумкин. Ўша орада фуқаро аллақачон жойлашиб кетган
       * бўлса, унга тугма чиқмаслиги керак — акс ҳолда ходим
       * босар ва «аллақачон жойлаштирилган» деган жавоб
       * оларди.
       */
      const tugmalar = await xabarTugmalari(x);
      await yuboruvchi(chatId, x.matn, tugmalar);
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
          /*
           * Telegram xatosida bot tokeni URL ichida chiqadi
           * ("request to https://api.telegram.org/bot123:AA…/sendMessage failed"):
           * xom matn bazaga va administrator ekraniga TUSHMASLIGI kerak.
           */
          xatoMatni: maxfiyniTozala(e),
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

/**
 * Telegram HTML uchun xavfsiz matn.
 *
 * ── Нега ЭКСПОРТ ──
 *
 * Хабарларга иш берувчи ЎЗИ ёзган матн тушади: корхона
 * номи, масъул шахс, лавозим, рад сабаби. Улар
 * `parse_mode: HTML` билан кетади.
 *
 * Ходим «&lt;b&gt;» ёзса — хабар бузилади; «&lt;a href=…&gt;» ёзса —
 * раҳбарга келган хабарда бегона ҳавола пайдо бўлади.
 * Шунинг учун ҳар бир динамик қиймат шу ердан ўтади.
 */
export function xavfsiz(matn: string | null | undefined): string {
  if (matn === null || matn === undefined) return "";
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
    /*
     * ── МАТН ВА ТУГМАЛАР ЗИД КЕЛМАСЛИГИ КЕРАК ──
     *
     * Бу иккови ҲАР ХИЛ нарсани ўлчайди:
     *
     *   матн     — мослиги 45% дан юқори фуқаролар (тақсимот)
     *   тугмалар — маҳалладаги ҲАММА жойлаштирилмаган фуқаро
     *
     * Шунинг учун «мос фуқаро топилмади» деган матн остида
     * бешта исм билан тугма туриши мумкин эди — ва турган
     * ҳам. Ходим буни ўқиб «бот алжияпти» деб ўйлайди.
     *
     * Энди матн иккаласини ҳам тан олади: аниқ мослик
     * бўлмаса ҳам, рўйхат қуйида туради.
     */
    x.nomzodlar > 0
      ? `Сизнинг маҳаллангизда <b>${x.nomzodlar} та</b> мос фуқаро бор.`
      : 'Талабга аниқ мос келадиган фуқаро топилмади — аммо сиз одамларни рўйхатдан яхшироқ биласиз.',
    '',
    /*
     * Тугмалар хабарнинг тагида ҲАР ДОИМ чиқади (маҳаллада
     * жойлаштирилмаган фуқаро бўлса). Уларни нима қилишини
     * АЙТИБ қўйиш керак: ходим «бу нима, босаман деб нотўғри
     * иш қилиб қўймайманми» деб ўйламасин.
     */
    'Қуйида маҳаллангиздаги фуқаролар. Кимдир ишга жойлашса — исми ёнидаги тугмани босинг.',
    'Рад этган бўлса — «Рад этди» тугмасидан сабабини белгиланг.',
    '',
    'Телефон рақамлари иловада: /xatlov',
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
