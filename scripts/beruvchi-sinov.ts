/**
 * ============================================================
 *  ИШ БЕРУВЧИ ЗАНЖИРИ — СИНОВ
 *
 *  Ишга тушириш:  npx tsx scripts/beruvchi-sinov.ts
 *
 *  ── Бу ерда хавф нимада ──
 *
 *  Иш берувчи — ТАШҚАРИДАГИ одам. У биринчи марта тизимга
 *  ёзув қўшадиган ҳокимиятдан ташқари шахс.
 *
 *  Унинг эълони 70 та маҳалла ходимига хабар юборади ва туман
 *  ҳисоботидаги «очиқ иш ўрни» сонига киради. Модерация
 *  бирон жойда ўтказиб юборилса — ташқаридаги одам туман
 *  рақамини ўзи ўзгартирган бўлади.
 *
 *  Синовларнинг ярми айнан шу ҳақда: текширилмаган эълон
 *  ҳеч қаерда КЎРИНМАСЛИГИ керак.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  beruvchiMenyusi,
  beruvchiTop,
  beruvchiniHalQil,
  elonniHalQil,
  royxatMatni,
  royxatSuhbati,
  royxatniBoshla,
  royxatniYubor,
  tanishtirish,
} from '../src/lib/ish-beruvchi';
import { beruvchiOmbori, omborBoshla, omborMatn, omborTugma, omborYarat } from '../src/lib/bot-elon';
import { FAOL_ELON, MODERATSIYA_KUTMOQDA } from '../src/lib/elon-muddati';
import { xabarTugmalari } from '../src/lib/xabarnoma';
import { elonQaroriMatni } from '../src/lib/ish-beruvchi';
import { boshMenyu } from '../src/lib/bot-menyu';
import { tumanHolati } from '../src/lib/tuman-holati';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const WEBHOOK = readFileSync('src/app/api/telegram/webhook/route.ts', 'utf8');
const SAYT_YOLI = readFileSync('src/app/api/ish-beruvchilar/route.ts', 'utf8');
const SAHIFA = readFileSync('src/app/(ilova)/ish-beruvchilar/page.tsx', 'utf8');
const NAVIGATSIYA = readFileSync('src/components/shell/navigatsiya.ts', 'utf8');
const ELON_KODI = readFileSync('src/lib/bot-elon.ts', 'utf8');

const CHAT = () => `sinov-beruvchi-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
const yaratilgan: string[] = [];

/**
 * Модерация қиладиган раҳбар.
 *
 * ── Нега синов уни ўзи яратади ──
 *
 * Аввал у базадан изланарди. Локал базада бор эди, тоза CI
 * базасида эса йўқ: `seed` фақат 70 та МФЙ ходимини яратади,
 * биронта раҳбар йўқ.
 *
 * Натижада бешта синов CI'да «null.id» билан йиқиларди —
 * локалда эса бемалол ўтарди.
 */
let rahbarId = '';

async function tayyorla() {
  const r = await prisma.user.create({
    data: {
      username: `sinov_moderator_${Date.now()}`,
      fullName: 'Sinov Moderator',
      passwordHash: 'x',
      rol: 'BANDLIK_RAHBAR',
      faol: true,
    },
    select: { id: true },
  });
  rahbarId = r.id;
}

async function tozala() {
  if (yaratilgan.length === 0) return;
  const b = await prisma.ishBeruvchi.findMany({
    where: { telegramChatId: { in: yaratilgan } },
    select: { id: true },
  });
  const idlar = b.map((x) => x.id);
  if (idlar.length > 0) {
    const elonlar = await prisma.vacancy.findMany({
      where: { ishBeruvchiId: { in: idlar } },
      select: { id: true },
    });

    /*
     * ── ХАБАРЛАР ҲАМ ТОЗАЛАНАДИ ──
     *
     * Улар навбатда «кутилмоқда» бўлиб қолса, КЕЙИНГИ
     * синовлар йиқилади: навбат чекланган тўплам билан
     * ишлайди ва бегона хабар биринчи тушиб қолади.
     *
     * Бу бир марта юз берди — навбат синовларининг учтаси
     * шу сабабдан йиқилди.
     */
    await prisma.xabarnoma.deleteMany({
      where: { bogliqId: { in: [...idlar, ...elonlar.map((e) => e.id)] } },
    });
    await prisma.vacancy.deleteMany({ where: { ishBeruvchiId: { in: idlar } } });
    await prisma.ishBeruvchi.deleteMany({ where: { id: { in: idlar } } });
  }
  yaratilgan.length = 0;
  if (rahbarId) {
    await prisma.ishBeruvchi.updateMany({
      where: { halQilganId: rahbarId },
      data: { halQilganId: null },
    });
    await prisma.xabarnoma.deleteMany({ where: { userId: rahbarId } });
    await prisma.user.delete({ where: { id: rahbarId } }).catch(() => undefined);
  }
}

/** Рўйхатдан тўлиқ ўтган иш берувчи ясайди */
async function royxatdanOtgan(tasdiqlansinmi = true) {
  const chat = CHAT();
  yaratilgan.push(chat);

  await royxatniBoshla(chat);
  const b = (await beruvchiTop(chat))!;

  await royxatMatni(b.id, '«Синов» МЧЖ');
  await royxatMatni(b.id, 'Алиев Анвар Собирович');
  await royxatMatni(b.id, '+998 93 507 21 46');

  const mahalla = await prisma.mahalla.findFirst({ select: { nomiKirill: true } });
  await royxatMatni(b.id, mahalla!.nomiKirill);
  await royxatniYubor(b.id);

  if (tasdiqlansinmi) {
    await beruvchiniHalQil({ beruvchiId: b.id, userId: rahbarId, qabul: true });
  }
  return { id: b.id, chat };
}

/** Эълон суҳбатини тўлиқ ўтади ва эълон яратади */
async function elonQoy(beruvchiId: string) {
  const ombor = beruvchiOmbori(beruvchiId);
  await omborBoshla(ombor);

  const mahalla = await prisma.mahalla.findFirst({ select: { nomiKirill: true } });
  await omborMatn(ombor, mahalla!.nomiKirill);
  await omborMatn(ombor, '«Синов» МЧЖ');
  await omborMatn(ombor, 'Ҳайдовчи');
  await omborTugma(ombor, 'e.orin:2');
  await omborMatn(ombor, '5');
  await omborMatn(ombor, '+998 93 507 21 46');
  await omborTugma(ombor, 'e.muddat:30');

  return omborYarat(ombor, beruvchiId);
}

const SINOVLAR: Sinov[] = [
  /* ────────────────────────────────────────────────────────
   *  1. ТАНИШТИРИШ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Аввал бот нотаниш одамга фақат битта нарса айтарди:
     * «улаш учун сайтдан код олинг». Иш берувчида эса на
     * сайт ҳисоби бор, на код оладиган жойи — у бу матнни
     * ўқиб, ботни ёпарди.
     */
    nomi: 'Нотаниш одамга ИККИ йўл кўрсатилади',
    tekshir: async () => {
      const t = tanishtirish();
      return (
        t.tugmalar.length === 2 &&
        t.tugmalar.some((x) => x.belgi === 'b.royxat') &&
        t.tugmalar.some((x) => x.belgi === 'b.xodim') &&
        t.matn.includes('Иш берувчи')
      );
    },
  },

  /* ────────────────────────────────────────────────────────
   *  2. РЎЙХАТДАН ЎТИШ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Тўрт қадам кетма-кет ўтилади',
    tekshir: async () => {
      const chat = CHAT();
      yaratilgan.push(chat);

      await royxatniBoshla(chat);
      const b = (await beruvchiTop(chat))!;
      if ((await royxatSuhbati(b.id)) !== 'r.korxona') return false;

      await royxatMatni(b.id, '«Синов» МЧЖ');
      if ((await royxatSuhbati(b.id)) !== 'r.masul') return false;

      await royxatMatni(b.id, 'Алиев Анвар Собирович');
      if ((await royxatSuhbati(b.id)) !== 'r.telefon') return false;

      await royxatMatni(b.id, '+998 93 507 21 46');
      if ((await royxatSuhbati(b.id)) !== 'r.mahalla') return false;

      const mahalla = await prisma.mahalla.findFirst({ select: { nomiKirill: true } });
      const j = await royxatMatni(b.id, mahalla!.nomiKirill);
      return (await royxatSuhbati(b.id)) === 'r.tasdiq' && Boolean(j?.matn.includes('Синов'));
    },
  },
  {
    /*
     * Телефон ЯГОНА алоқа йўли: маҳалла ходими ўша рақамга
     * қўнғироқ қилиб, фуқарони юборади. Нотўғри рақам
     * эълоннинг ўзини бекор қилади.
     */
    nomi: 'Нотўғри телефон қабул қилинмайди ва қадам ЎЗГАРМАЙДИ',
    tekshir: async () => {
      const chat = CHAT();
      yaratilgan.push(chat);
      await royxatniBoshla(chat);
      const b = (await beruvchiTop(chat))!;
      await royxatMatni(b.id, '«Синов» МЧЖ');
      await royxatMatni(b.id, 'Алиев Анвар Собирович');

      const j = await royxatMatni(b.id, '12345');
      return (await royxatSuhbati(b.id)) === 'r.telefon' && Boolean(j?.matn);
    },
  },
  {
    nomi: 'Топилмайдиган МФЙ номи рад этилади',
    tekshir: async () => {
      const chat = CHAT();
      yaratilgan.push(chat);
      await royxatniBoshla(chat);
      const b = (await beruvchiTop(chat))!;
      await royxatMatni(b.id, '«Синов» МЧЖ');
      await royxatMatni(b.id, 'Алиев Анвар Собирович');
      await royxatMatni(b.id, '+998 93 507 21 46');

      const j = await royxatMatni(b.id, 'Бундай МФЙ йўқ');
      return (await royxatSuhbati(b.id)) === 'r.mahalla' && Boolean(j?.matn.includes('топилмади'));
    },
  },
  {
    nomi: 'Ариза юборилгач, ҳолат КУТИЛМОҚДА бўлади',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(false);
      const b = await prisma.ishBeruvchi.findUnique({
        where: { id },
        select: { holati: true, korxonaNomi: true, telefon: true, bosqich: true },
      });
      return (
        b?.holati === 'KUTILMOQDA' &&
        b.korxonaNomi === '«Синов» МЧЖ' &&
        /* Суҳбат тозаланади — ярим қолган ҳолат қолмайди */
        b.bosqich === null &&
        Boolean(b.telefon)
      );
    },
  },
  {
    nomi: 'Раҳбарга ариза хабари навбатга тушади',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(false);
      const x = await prisma.xabarnoma.findFirst({
        where: { turi: 'ISH_BERUVCHI_ARIZASI', bogliqId: id },
        select: { id: true, matn: true },
      });
      return Boolean(x?.matn.includes('«Синов» МЧЖ'));
    },
  },

  /* ────────────────────────────────────────────────────────
   *  3. ТАСДИҚЛАНМАГАН ЭЪЛОН ҚЎЯ ОЛМАЙДИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Тасдиқланмаган одам ҳар куни ўнта сохта эълон юбориб,
     * раҳбарнинг навбатини тиқиб ташлаши мумкин эди.
     */
    nomi: 'Тасдиқланмаган иш берувчига «Янги иш ўрни» тугмаси ЧИҚМАЙДИ',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(false);
      const m = await beruvchiMenyusi(id);
      return m.tugmalar.length === 0 && m.matn.includes('кўриб чиқилмоқда');
    },
  },
  {
    nomi: 'Вебхукда ҳам ҳолат текширилади',
    tekshir: async () =>
      WEBHOOK.includes("beruvchi.holati !== 'TASDIQLANDI'") &&
      WEBHOOK.includes("holati !== 'TASDIQLANDI'"),
  },
  {
    nomi: 'Тасдиқлангач тугма пайдо бўлади',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(true);
      const m = await beruvchiMenyusi(id);
      return m.tugmalar.some((t) => t.belgi === 'b.elon');
    },
  },

  /* ────────────────────────────────────────────────────────
   *  4. ЭЪЛОН ВА МОДЕРАЦИЯ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Иш берувчи қўйган эълон МОДЕРАЦИЯ кутади',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(true);
      const n = await elonQoy(id);
      if (!n.ok) return false;

      const e = await prisma.vacancy.findUnique({
        where: { id: n.id },
        select: { moderatsiya: true, ishBeruvchiId: true, faol: true },
      });
      return e?.moderatsiya === 'KUTILMOQDA' && e.ishBeruvchiId === id && e.faol;
    },
  },
  {
    /*
     * ── ЭНГ МУҲИМ СИНОВ ──
     *
     * Текширилмаган эълон ҲЕЧ ҚАЕРДА кўринмаслиги керак:
     * на «очиқ иш ўрни» сонида, на маҳалла ходимининг
     * рўйхатида, на туман ҳисоботида.
     */
    nomi: 'Текширилмаган эълон «очиқ иш ўрни» сонига КИРМАЙДИ',
    tekshir: async () => {
      const oldin = await prisma.vacancy.count({ where: FAOL_ELON() });
      const tumanOldin = await tumanHolati();

      const { id } = await royxatdanOtgan(true);
      const n = await elonQoy(id);
      if (!n.ok) return false;

      const keyin = await prisma.vacancy.count({ where: FAOL_ELON() });
      const tumanKeyin = await tumanHolati();

      return (
        keyin === oldin &&
        tumanKeyin.ochiqOrin === tumanOldin.ochiqOrin &&
        tumanKeyin.moderatsiyaKutmoqda === tumanOldin.moderatsiyaKutmoqda + 1
      );
    },
  },
  {
    nomi: 'Тасдиқлангач эълон КУЧГА киради',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(true);
      const n = await elonQoy(id);
      if (!n.ok) return false;

      const h = await elonniHalQil({ vacancyId: n.id, userId: rahbarId, qabul: true });
      if (!h.ok) return false;

      const kuchda = await prisma.vacancy.count({
        where: { ...FAOL_ELON(), id: n.id },
      });
      return kuchda === 1;
    },
  },
  {
    /*
     * Рад этилган эълон ЁПИЛАДИ ҳам. Акс ҳолда у базада
     * `faol = true` бўлиб қоларди ва «муддати ўтганларни
     * ёпиш» жараёнида кутилмаганда қайта пайдо бўлиши
     * мумкин эди.
     */
    nomi: 'Рад этилган эълон ёпилади',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(true);
      const n = await elonQoy(id);
      if (!n.ok) return false;

      await elonniHalQil({ vacancyId: n.id, userId: rahbarId, qabul: false });

      const e = await prisma.vacancy.findUnique({
        where: { id: n.id },
        select: { moderatsiya: true, faol: true },
      });
      return e?.moderatsiya === 'RAD_ETILDI' && !e.faol;
    },
  },
  {
    nomi: 'Битта эълон ИККИ марта ҳал қилинмайди',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(true);
      const n = await elonQoy(id);
      if (!n.ok) return false;

      const a = await elonniHalQil({ vacancyId: n.id, userId: rahbarId, qabul: true });
      const b = await elonniHalQil({ vacancyId: n.id, userId: rahbarId, qabul: false });
      return a.ok && !b.ok;
    },
  },

  /* ────────────────────────────────────────────────────────
   *  5. ХОДИМ ЭЪЛОНИ ЎЗГАРМАГАН
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Модерация ҚЎШИЛДИ, аммо ходимнинг эълони аввалгидек
     * дарҳол тарқалиши керак. Акс ҳолда янгилик эски ишни
     * бузган бўларди.
     */
    nomi: 'Ходим қўйган эълон дарҳол кучда бўлади',
    tekshir: async () => {
      const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
      const e = await prisma.vacancy.create({
        data: {
          mahallaId: mahalla!.id,
          korxonaNomi: 'Синов Ходим',
          lavozim: 'Синов лавозими',
          ornlarSoni: 1,
        },
        select: { id: true, moderatsiya: true },
      });
      try {
        const kuchda = await prisma.vacancy.count({ where: { ...FAOL_ELON(), id: e.id } });
        return e.moderatsiya === 'TASDIQLANDI' && kuchda === 1;
      } finally {
        await prisma.vacancy.delete({ where: { id: e.id } });
      }
    },
  },

  /* ────────────────────────────────────────────────────────
   *  6. СУҲБАТ АРАЛАШМАЙДИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Битта устунда икки хил суҳбат сақланади: рўйхатдан
     * ўтиш (`r.` билан) ва эълон қўйиш.
     *
     * Текширувсиз рўйхатдан ўтаётган одамнинг жавоби эълон
     * суҳбатига тушиб кетарди: унинг «корхона номи» қадами
     * иккала рўйхатда ҳам бор.
     */
    nomi: 'Рўйхат суҳбати эълон суҳбати деб ўқилмайди',
    tekshir: async () => {
      const chat = CHAT();
      yaratilgan.push(chat);
      await royxatniBoshla(chat);
      const b = (await beruvchiTop(chat))!;

      const ombor = beruvchiOmbori(b.id);
      /* Рўйхат қадами турибди — эълон омбори уни КЎРМАСЛИГИ керак */
      return (await ombor.oqi()) === null && (await royxatSuhbati(b.id)) === 'r.korxona';
    },
  },
  {
    nomi: 'Суҳбат коди нусхаланмаган — иккови ЎША функцияни чақиради',
    tekshir: async () =>
      ELON_KODI.includes('export function xodimOmbori') &&
      ELON_KODI.includes('export function beruvchiOmbori') &&
      /* Иккита нусха эмас, битта суҳбат */
      (ELON_KODI.match(/const QADAMLAR = \[/g) ?? []).length === 1,
  },

  /* ────────────────────────────────────────────────────────
   *  7. ҲУҚУҚ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Модерация тугмасини фақат раҳбар боса олади',
    tekshir: async () =>
      WEBHOOK.includes("kim.rol !== 'BANDLIK_RAHBAR' && kim.rol !== 'ADMIN'") &&
      WEBHOOK.includes('beruvchiTugmasi'),
  },
  {
    /*
     * Иш берувчини `User` қилиб қўйиш осон эди. Қилинмади:
     * `User` — САЙТГА кирадиган одам, ва унинг роли ўнлаб
     * жойда текширилади.
     */
    nomi: 'Иш берувчининг сайт ҳисоби ЙЎҚ',
    tekshir: async () => {
      const { chat } = await royxatdanOtgan(true);
      const u = await prisma.user.findFirst({ where: { telegramChatId: chat } });
      return u === null;
    },
  },
  {
    /*
     * Тугма хабар билан бирга сақланмайди, ЮБОРИШ пайтида
     * ясалади.
     *
     * Сақлаб қўйилса, бир марта ҳал қилинган ариза устида
     * иккинчи тугма қолиб кетарди — ва уни босган одам «нега
     * ишламаяпти» деб ўйларди.
     */
    nomi: 'Ҳал қилингандан кейин тугма ЧИҚМАЙДИ',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(false);

      const xabar = {
        turi: 'ISH_BERUVCHI_ARIZASI' as const,
        bogliqTuri: 'IshBeruvchi',
        bogliqId: id,
        userId: rahbarId,
      };

      /* Ҳал қилинмаган — тугма БОР */
      const oldin = await xabarTugmalari(xabar);

      await beruvchiniHalQil({ beruvchiId: id, userId: rahbarId, qabul: true });

      /* Ҳал қилинган — тугма ЙЎҚ */
      const keyin = await xabarTugmalari(xabar);

      return (
        oldin.length === 2 &&
        oldin.some((t) => t.belgi === `b.qabul:${id}`) &&
        keyin.length === 0
      );
    },
  },
  {
    nomi: 'Ҳал қилинган ЭЪЛОНГА ҳам тугма чиқмайди',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(true);
      const n = await elonQoy(id);
      if (!n.ok) return false;

      const xabar = {
        turi: 'ELON_MODERATSIYADA' as const,
        bogliqTuri: 'Vacancy',
        bogliqId: n.id,
        userId: rahbarId,
      };

      const oldin = await xabarTugmalari(xabar);
      await elonniHalQil({ vacancyId: n.id, userId: rahbarId, qabul: true });
      const keyin = await xabarTugmalari(xabar);

      return oldin.length === 2 && keyin.length === 0;
    },
  },
  /* ────────────────────────────────────────────────────────
   *  8. САЙТДАН ҲАМ МОДЕРАЦИЯ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * ── НЕГА БОТ ЕТАРЛИ ЭМАС ──
     *
     * Модерация аввал ФАҚАТ ботда эди. Бугун 78 та ходимдан
     * 70 таси ботга уланмаган, ва бандлик раҳбари ҳам
     * уланмаган бўлиши мумкин.
     *
     * Ўшанда занжир ЎЗ БОШИДА тўхтарди: иш берувчи ариза
     * юборади, ариза навбатда туради, ва уни тасдиқлайдиган
     * йўл умуман йўқ эди.
     */
    nomi: 'Модерация САЙТДА ҳам бор',
    tekshir: async () =>
      SAYT_YOLI.includes("talabQil(['BANDLIK_RAHBAR', 'ADMIN'])") &&
      SAYT_YOLI.includes('beruvchiniHalQil') &&
      SAYT_YOLI.includes('elonniHalQil') &&
      SAHIFA.includes('moderatsiyaRoyxati') &&
      NAVIGATSIYA.includes("yol: '/ish-beruvchilar'"),
  },
  {
    /*
     * Қарор ИККИ жойдан чиқади: ботдан ва сайтдан. Иккови
     * ҳар хил матн юборса, иш берувчи қайси бири расмий
     * эканини билмасди.
     */
    nomi: 'Бот ва сайт БИТТА матнни юборади',
    tekshir: async () =>
      WEBHOOK.includes('beruvchiQaroriMatni(') &&
      SAYT_YOLI.includes('beruvchiQaroriMatni(') &&
      WEBHOOK.includes('elonQaroriMatni(') &&
      SAYT_YOLI.includes('elonQaroriMatni('),
  },
  {
    /*
     * GPT §8: «Yuborish muvaffaqiyatsiz bo'lsa, ish beruvchiga "barcha xodimlarga
     * xabar ketdi" deb yozilmasin.» Qaror vaqtida yetkazilishi NOMA'LUM: uzilgan
     * (ulanmagan) xodim, mos mahalla yo'qligi yoki yuborish xatosi bo'lishi mumkin.
     */
    nomi: 'Ish beruvchiga YETKAZILISH haqida yolg\'on aytilmaydi: tasdiq matnida "xabar ketdi" yo\'q, "kafolatlanmaydi" aniq yozilgan; rad matnida xabar haqida gap yo\'q; moderatorga ham "navbatga qo\'yildi" deyiladi',
    tekshir: async () => {
      const qabul = elonQaroriMatni({ qabul: true, lavozim: 'Payvandchi' });
      const rad = elonQaroriMatni({ qabul: false, lavozim: 'Payvandchi' });
      return (
        qabul.includes('Payvandchi') &&
        !/хабар кетди/.test(qabul) &&
        !/ҳамма|барча/.test(qabul) &&
        qabul.includes('кафолатланмайди') &&
        qabul.includes('навбат') &&
        !/хабар/.test(rad) &&
        !/ходимига хабар кетди/.test(WEBHOOK) &&
        (WEBHOOK.match(/хабар навбатга қўйилди/g) ?? []).length === 2
      );
    },
  },
  {
    nomi: 'Сайтдан тасдиқлаш ҳам эълонни КУЧГА киритади',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(true);
      const n = await elonQoy(id);
      if (!n.ok) return false;

      /* Сайт йўли `elonniHalQil` ни чақиради — ўша функция */
      await elonniHalQil({ vacancyId: n.id, userId: rahbarId, qabul: true });

      return (await prisma.vacancy.count({ where: { ...FAOL_ELON(), id: n.id } })) === 1;
    },
  },
  {
    nomi: 'Рад этиш сабаби сақланади ва иш берувчига кўринади',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(false);
      await beruvchiniHalQil({
        beruvchiId: id,
        userId: rahbarId,
        qabul: false,
        sabab: 'Телефон рақами нотўғри',
      });

      const m = await beruvchiMenyusi(id);
      return (
        m.matn.includes('Телефон рақами нотўғри') &&
        /* Қайта юбориш йўли ОЧИҚ қолади — тупик бўлмасин */
        m.tugmalar.some((t) => t.belgi === 'b.royxat')
      );
    },
  },
  {
    nomi: 'Рад этилгандан кейин қайта ариза бериш мумкин',
    tekshir: async () => {
      const { id, chat } = await royxatdanOtgan(false);
      await beruvchiniHalQil({ beruvchiId: id, userId: rahbarId, qabul: false });

      await royxatniBoshla(chat);
      const b = await prisma.ishBeruvchi.findUnique({
        where: { id },
        select: { holati: true, bosqich: true, radSababi: true },
      });
      return b?.holati === 'KUTILMOQDA' && b.bosqich === 'r.korxona' && b.radSababi === null;
    },
  },

  /* ────────────────────────────────────────────────────────
   *  9. ҲОКИМ БОТДА
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Ҳоким ботга УЛАНАДИ: эрталабки брифинг унга келади.
     *
     * Аввал у маҳалла ходими шохобчасига тушарди: маҳалласи
     * йўқ бўлгани учун ҳамма рақам нол чиқарди ва экранда
     * «Менинг фуқароларим» деган маъносиз тугма турарди.
     */
    nomi: 'Ҳокимга ТУМАН менюси чиқади, маҳалла эмас',
    tekshir: async () => {
      /* Ҳоким ҳам синов томонидан яратилади — базада бўлиши шарт эмас */
      const hokim = await prisma.user.create({
        data: {
          username: `sinov_hokim_${Date.now()}`,
          fullName: 'Sinov Hokim',
          passwordHash: 'x',
          rol: 'HOKIM',
          faol: true,
        },
        select: { id: true },
      });

      try {
        const m = await boshMenyu(hokim.id);
        return (
          m.matn.includes('Туман ҳокими') &&
          m.matn.includes('Хатлов') &&
          !m.tugmalar.some((t) => t.belgi === 'm.fuqarolar') &&
          m.tugmalar.some((t) => t.belgi === 's.tuman')
        );
      } finally {
        await prisma.user.delete({ where: { id: hokim.id } }).catch(() => undefined);
      }
    },
  },
  /* ────────────────────────────────────────────────────────
   *  10. ТЕЛЕФОН — ЯГОНА АЛОҚА ЙЎЛИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Маҳалла ходими эълондаги рақамга қўнғироқ қилиб,
     * фуқарони юборади. Рақам ишламаса — эълоннинг ўзи
     * бекор.
     *
     * Аввал бу ерда «камида 7 та рақам» деган шарт бор эди
     * ва сохта рақам ўтиб кетарди.
     */
    nomi: 'Эълондаги сохта телефон қабул қилинмайди',
    tekshir: async () => {
      const { id } = await royxatdanOtgan(true);
      const ombor = beruvchiOmbori(id);
      await omborBoshla(ombor);

      const mahalla = await prisma.mahalla.findFirst({ select: { nomiKirill: true } });
      await omborMatn(ombor, mahalla!.nomiKirill);
      await omborMatn(ombor, '«Синов» МЧЖ');
      await omborMatn(ombor, 'Ҳайдовчи');
      await omborTugma(ombor, 'e.orin:2');
      await omborMatn(ombor, '5');

      /* Сохта рақам — қадам ЎЗГАРМАЙДИ */
      await omborMatn(ombor, '1234567');
      const s1 = await ombor.oqi();
      if (s1?.bosqich !== 'telefon') return false;

      /* Ҳақиқий рақам — ўтади ва `+998` кўринишида сақланади */
      await omborMatn(ombor, '+998 93 507 21 46');
      const s2 = await ombor.oqi();
      return (
        s2?.bosqich === 'muddat' &&
        (s2.malumot as { telefon?: string }).telefon === '+998935072146'
      );
    },
  },
  {
    nomi: 'Эълон ва рўйхат АЙНАН бир хил текширувни ишлатади',
    tekshir: async () =>
      ELON_KODI.includes("telefonTekshir(matn, 'Телефон рақами')") &&
      ELON_KODI.includes('telefonSaqlashUchun(matn)') &&
      /* Эски суст шарт қайтиб келмасин */
      !ELON_KODI.includes('raqamlar.length < 7'),
  },
];

async function main() {
  await tayyorla();

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
  await tozala();
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
