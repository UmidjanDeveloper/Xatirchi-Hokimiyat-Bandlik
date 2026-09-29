/**
 * ============================================================
 *  ХАБАРНОМА НАВБАТИ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/xabarnoma-sinov.ts
 *
 *  Контейнердан `api.telegram.org` га чиқиб бўлмайди, шунинг
 *  учун ҲАҚИҚИЙ юбориш бу ерда синалмайди — у фақат
 *  продукцияда текширилади.
 *
 *  Аммо навбат мантиқи ундан МУҲИМРОҚ ва у тўлиқ синалади:
 *  юборувчи ўрнига сохта функция берилади ва хато бўлганда
 *  хабар ЙЎҚОЛМАСЛИГИ, уриниш сони ошиши, уч мартадан кейин
 *  тўхташи текширилади.
 *
 *  Нега бу муҳимроқ: юбориш хатоси кўринади (Telegram жавоб
 *  бермади), навбат хатоси эса КЎРИНМАЙДИ — хабар шунчаки
 *  йўқолади ва ходим уни кутилганини ҳам билмайди.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { PrismaClient } from '@prisma/client';
import {
  ishOrniMatni,
  navbatniYubor,
  ulanishMatni,
  xabarQoshish,
  type Yuboruvchi,
} from '../src/lib/xabarnoma';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

/** Sinov uchun xodim - har sinovdan keyin tozalanadi */
async function sinovXodimi(chatId: string | null) {
  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  return prisma.user.create({
    data: {
      username: `sinov_xabar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: 'Sinov Xodimi',
      passwordHash: 'x',
      rol: 'YETTILIK',
      mahallaId: mahalla!.id,
      telegramChatId: chatId,
    },
    select: { id: true },
  });
}

async function tozala(userId: string) {
  await prisma.xabarnoma.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * Уланган ходимга ОЧИҚ эълонлар кетиши.
 *
 * ── Нега бу синов ҳақиқий базада ──
 *
 * Бу мантиқни аввал фақат МАНБАНИ ЎҚИБ текширгандим: «кодда
 * шундай сатр борми». Синов ўтарди, амалда эса ишламасди —
 * икки марта. Сабаби оддий: кодда сатр бор бўлиши уни ТЎҒРИ
 * ишлашини билдирмайди.
 *
 * Шунинг учун бу ерда ҳақиқий ёзувлар яратилади ва
 * функциянинг ЎЗИ юргизилади.
 */
async function ochiqOrinSinovi(
  tayyorla: (xodimId: string, orinId: string) => Promise<void>
): Promise<{ soni: number; xodimId: string; orinId: string }> {
  const { ulangandaOchiqOrinlar } = await import('../src/lib/ish-orni-xabari');

  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  const xodim = await prisma.user.create({
    data: {
      username: `sinov_orin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: 'Sinov Xodimi',
      passwordHash: 'x',
      rol: 'YETTILIK',
      mahallaId: mahalla!.id,
      telegramChatId: 'sinov-chat',
    },
    select: { id: true },
  });
  const orin = await prisma.vacancy.create({
    data: {
      mahallaId: mahalla!.id,
      korxonaNomi: 'Sinov korxona',
      lavozim: 'Sinov lavozim',
      ornlarSoni: 1,
      faol: true,
    },
    select: { id: true },
  });

  await tayyorla(xodim.id, orin.id);
  const soni = await ulangandaOchiqOrinlar(xodim.id);
  return { soni, xodimId: xodim.id, orinId: orin.id };
}

async function orinTozala(xodimId: string, orinId: string) {
  await prisma.xabarnoma.deleteMany({ where: { userId: xodimId } });
  await prisma.vacancy.delete({ where: { id: orinId } });
  await prisma.user.delete({ where: { id: xodimId } });
}

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Уланган ходим ўз маҳалласидаги очиқ эълонни ОЛАДИ',
    tekshir: async () => {
      const r = await ochiqOrinSinovi(async () => {});
      const bor = await prisma.xabarnoma.count({
        where: { userId: r.xodimId, turi: 'YANGI_ISH_ORNI', bogliqId: r.orinId },
      });
      await orinTozala(r.xodimId, r.orinId);
      return r.soni >= 1 && bor === 1;
    },
  },
  {
    /*
     * ЭНГ МУҲИМ СИНОВ.
     *
     * Эълон қўйилганда ходим уланмаган бўлса, хабар ясалиб
     * кейин БЕКОР қилинади. Ходим уни ҳеч қачон олмаган.
     * Код эса уни «аллақачон кетган» деб ўтказиб юборарди —
     * ва айнан шу сабабдан ҳеч нарса келмасди.
     */
    nomi: 'БЕКОР қилинган хабар «юборилган» деб ҳисобланмайди',
    tekshir: async () => {
      const r = await ochiqOrinSinovi(async (xodimId, orinId) => {
        await prisma.xabarnoma.create({
          data: {
            userId: xodimId,
            turi: 'YANGI_ISH_ORNI',
            holati: 'BEKOR',
            matn: 'eski',
            bogliqTuri: 'Vacancy',
            bogliqId: orinId,
          },
        });
      });
      const yangi = await prisma.xabarnoma.count({
        where: {
          userId: r.xodimId,
          turi: 'YANGI_ISH_ORNI',
          holati: 'KUTILMOQDA',
          bogliqId: r.orinId,
        },
      });
      await orinTozala(r.xodimId, r.orinId);
      return yangi === 1;
    },
  },
  {
    /* Ҳақиқатан кетган хабар эса ҚАЙТА юборилмайди */
    nomi: 'ЮБОРИЛГАН хабар қайта юборилмайди',
    tekshir: async () => {
      const r = await ochiqOrinSinovi(async (xodimId, orinId) => {
        await prisma.xabarnoma.create({
          data: {
            userId: xodimId,
            turi: 'YANGI_ISH_ORNI',
            holati: 'YUBORILDI',
            matn: 'eski',
            bogliqTuri: 'Vacancy',
            bogliqId: orinId,
            yuborilganSana: new Date(),
          },
        });
      });
      const yangi = await prisma.xabarnoma.count({
        where: {
          userId: r.xodimId,
          turi: 'YANGI_ISH_ORNI',
          holati: 'KUTILMOQDA',
          bogliqId: r.orinId,
        },
      });
      await orinTozala(r.xodimId, r.orinId);
      return yangi === 0;
    },
  },
  {
    /* Уланмаган ходимга юборадиган жой йўқ */
    nomi: 'Уланмаган ходимга хабар ясалмайди',
    tekshir: async () => {
      const r = await ochiqOrinSinovi(async (xodimId) => {
        await prisma.user.update({
          where: { id: xodimId },
          data: { telegramChatId: null },
        });
      });
      await orinTozala(r.xodimId, r.orinId);
      return r.soni === 0;
    },
  },
  {
    nomi: 'Хабар навбатга тушади',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      const n = await xabarQoshish([
        { userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' },
      ]);
      const bor = await prisma.xabarnoma.count({ where: { userId: x.id, holati: 'KUTILMOQDA' } });
      await tozala(x.id);
      return n === 1 && bor === 1;
    },
  },
  {
    nomi: 'Муваффақиятли юборилса — ЮБОРИЛДИ, сана ёзилади',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      const ok: Yuboruvchi = async () => {};
      const n = await navbatniYubor(ok);
      const xabar = await prisma.xabarnoma.findFirst({ where: { userId: x.id } });
      const natija =
        n.yuborildi >= 1 &&
        xabar?.holati === 'YUBORILDI' &&
        xabar.yuborilganSana !== null &&
        xabar.urinishlar === 1;
      await tozala(x.id);
      return natija;
    },
  },
  {
    /*
     * Энг муҳим синов. Telegram жавоб бермаса, хабар
     * ЙЎҚОЛМАСЛИГИ керак — у навбатда қолади ва кейинги
     * ишга туширишда яна уринилади.
     */
    nomi: 'Хато бўлса хабар ЙЎҚОЛМАЙДИ — навбатда қолади',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      const yiqiladi: Yuboruvchi = async () => {
        throw new Error('Telegram javob bermadi');
      };
      await navbatniYubor(yiqiladi);
      const xabar = await prisma.xabarnoma.findFirst({ where: { userId: x.id } });
      const natija =
        xabar?.holati === 'KUTILMOQDA' &&
        xabar.urinishlar === 1 &&
        (xabar.xatoMatni ?? '').includes('javob bermadi');
      await tozala(x.id);
      return natija;
    },
  },
  {
    nomi: 'Уч мартадан кейин ХАТО бўлади — чексиз уринмайди',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      const yiqiladi: Yuboruvchi = async () => {
        throw new Error('bot bloklangan');
      };
      await navbatniYubor(yiqiladi);
      await navbatniYubor(yiqiladi);
      await navbatniYubor(yiqiladi);
      const xabar = await prisma.xabarnoma.findFirst({ where: { userId: x.id } });
      /* Тўртинчи марта умуман олинмайди */
      const tortinchi = await navbatniYubor(yiqiladi);
      const natija =
        xabar?.holati === 'XATO' && xabar.urinishlar === 3 && tortinchi.korildi === 0;
      await tozala(x.id);
      return natija;
    },
  },
  {
    /*
     * Боғламаган ходим «хато» эмас, «бекор». Фарқи муҳим:
     * хато тузатилиши керак, боғламаган ходим эса шунчаки
     * боғламаган. Иккови бир хил кўринса, администратор
     * ҳақиқий хатони топа олмасди.
     */
    nomi: 'Telegram боғланмаган ходим — БЕКОР, хато эмас',
    tekshir: async () => {
      const x = await sinovXodimi(null);
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      const n = await navbatniYubor(async () => {});
      const xabar = await prisma.xabarnoma.findFirst({ where: { userId: x.id } });
      const natija =
        xabar?.holati === 'BEKOR' && n.ulanmagan >= 1 && n.xato === 0;
      await tozala(x.id);
      return natija;
    },
  },
  {
    nomi: 'Юборилган хабар қайта юборилмайди',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      await navbatniYubor(async () => {});
      let ikkinchiMarta = 0;
      await navbatniYubor(async () => {
        ikkinchiMarta++;
      });
      await tozala(x.id);
      return ikkinchiMarta === 0;
    },
  },
  {
    nomi: 'Бўш рўйхат хато бермайди',
    tekshir: async () => (await xabarQoshish([])) === 0,
  },

  /* ── Матн ── */
  {
    /*
     * Telegram — ТАШҚИ хизмат ва хабар унинг серверида
     * қолади. Шунинг учун хабарда исм-фамилия ва телефон
     * БЎЛМАСЛИГИ керак: фақат сон айтилади, қолгани
     * иловада рухсат текширилган ҳолда кўринади.
     */
    nomi: 'Иш ўрни хабарида ШАХСИЙ маълумот йўқ',
    tekshir: async () => {
      const m = ishOrniMatni({
        lavozim: 'Dasturchi',
        korxonaNomi: 'Xatirchi IT',
        mahallaNomi: 'Бахшижар',
        bosh: 3,
        nomzodlar: 4,
      });
      /* Сон бор, аммо телефон рақами ва «Ф.И.Ш.» йўқ */
      return m.includes('4 та') && !/\+998/.test(m) && !/\d{9}/.test(m);
    },
  },
  {
    nomi: 'Номзод топилмаса ҳам хабар мазмунли',
    tekshir: async () => {
      const m = ishOrniMatni({
        lavozim: 'Dasturchi',
        korxonaNomi: 'Xatirchi IT',
        mahallaNomi: 'Бахшижар',
        bosh: 3,
        nomzodlar: 0,
      });
      return m.includes('топилмади') && m.length > 50;
    },
  },
  {
    /*
     * Корхона номида `<` ёки `&` бўлса, Telegram HTML ни
     * нотўғри ўқийди ва хабарни умуман юбормайди.
     */
    nomi: 'HTML белгилари хавфсизлантирилади',
    tekshir: async () => {
      const m = ishOrniMatni({
        lavozim: '<b>xato</b>',
        korxonaNomi: 'A & B',
        mahallaNomi: 'X',
        bosh: 1,
        nomzodlar: 1,
      });
      return m.includes('&lt;b&gt;') && m.includes('A &amp; B');
    },
  },
  {
    nomi: 'Уланиш хабарида ходим исми бор',
    tekshir: async () => ulanishMatni('Aliyev Anvar').includes('Aliyev Anvar'),
  },
];

async function main() {
  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      ok = false;
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
