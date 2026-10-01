/**
 * ============================================================
 *  ВАЗИФАЛАР ТАХТАСИ — СИНОВ
 *
 *  Ишга тушириш:  npx tsx scripts/vazifa-sinov.ts
 *
 *  ── Бу ерда хато нимага олиб келади ──
 *
 *  Тахта «мен нима қилишим керак» саволига жавоб беради.
 *  Икки хил хато бўлиши мумкин ва иккови ҳам хавфли:
 *
 *   1. ИШ КЎРИНМАСА — у бажарилмайди. Муддати ўтган
 *      топшириқ тахтада турмаса, ходим уни умуман
 *      билмайди.
 *
 *   2. БЕГОНА ИШ КЎРИНСА — маҳалла изоляцияси бузилади:
 *      МФЙ ходими бошқа маҳалланинг оилаларини кўради.
 *
 *  Учинчиси — ЁЛҒОН ТИНЧЛИК: ўлчанмайдиган нарсага «0»
 *  ёзиш. У «муаммо йўқ» деб кўринади, аслида «ўлчов йўқ».
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { kunBoshi, kunOxiri, vazifalarim } from '../src/lib/vazifalar';
import { KUN_MS } from '../src/lib/bandlik-holatlari';
import { MENYU, yolgaRuxsat } from '../src/components/shell/navigatsiya';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const noyob = (a: string) => `${a} ${Date.now()}${Math.floor(Math.random() * 1000)}`;

let mahallaA = '';
let mahallaB = '';
let xodimId = '';
const oilalar: string[] = [];
const topshiriqlar: string[] = [];

async function tayyorla() {
  const m = await prisma.mahalla.findMany({ take: 2, select: { id: true } });
  if (m.length < 2) throw new Error('Sinov uchun ikkita mahalla kerak — `prisma db seed`');
  mahallaA = m[0].id;
  mahallaB = m[1].id;

  const x = await prisma.user.create({
    data: {
      username: `sinov_vazifa_${Date.now()}`,
      fullName: 'Sinov Vazifa Xodimi',
      passwordHash: 'x',
      rol: 'BANDLIK',
      mahallaId: mahallaA,
    },
    select: { id: true },
  });
  xodimId = x.id;
}

async function tozala() {
  if (topshiriqlar.length) {
    await prisma.actionPlan.deleteMany({ where: { id: { in: topshiriqlar } } });
  }
  if (oilalar.length) {
    await prisma.unemployedPerson.deleteMany({ where: { id: { in: oilalar } } });
  }
  await prisma.user.deleteMany({ where: { id: xodimId } });
}

/**
 * Маҳаллага боғланган, муддати ЎТГАН топшириқ.
 *
 * ── Нега сана ШУНЧА эски ──
 *
 * Тахта энг муддати ўтган 8 тасини кўрсатади (`take: 8`).
 * Аввал синов «10 кун олдин» деб яратарди — базадаги seed
 * ёзувлари эса ундан ҳам эски эди, яъни синов ёзуви
 * рўйхатга УМУМАН тушмасди.
 *
 * Оқибати иккита эди:
 *
 *   · «топшириқ кўринади» синови йиқиларди (тўғри);
 *   · «бегона маҳалла кўринмайди» синови ЎТАРДИ — аммо
 *     НОТЎҒРИ сабабдан: ёзув изоляция туфайли эмас,
 *     рўйхатга сиғмагани учун йўқ эди.
 *
 * Иккинчиси хавфлироқ: изоляция бузилса ҳам синов «ўтди»
 * деб турарди.
 */
const ENG_ESKI_KUN = 5000;

async function kechikkanTopshiriq(mahallaId: string, muammo: string) {
  const odam = await prisma.unemployedPerson.create({
    data: {
      fish: noyob('Vazifa Sinov'),
      jinsi: 'ERKAK',
      mahallaId,
      holati: 'ANIQLANDI',
      tugilganSana: new Date(Date.UTC(1990, 0, 1)),
    },
    select: { id: true },
  });
  oilalar.push(odam.id);

  const t = await prisma.actionPlan.create({
    data: {
      ishsizId: odam.id,
      muammo,
      yechim: 'Синов ечими',
      masulTashkilot: 'Синов ташкилоти',
      muddat: new Date(Date.now() - ENG_ESKI_KUN * KUN_MS),
      holati: 'KUTILMOQDA',
      yaratganId: xodimId,
    },
    select: { id: true },
  });
  topshiriqlar.push(t.id);
  return { odamId: odam.id, topshiriqId: t.id };
}

const SINOVLAR: Sinov[] = [
  /* ── 1. БАРЧА РОЛ ── */
  {
    nomi: 'Барча бешта рол учун тахта тузилади',
    tekshir: async () => {
      const rollar = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'] as const;
      for (const rol of rollar) {
        const t = await vazifalarim({ userId: xodimId, rol, mahallaId: mahallaA });
        if (t.rol !== rol) return false;
        if (!t.sarlavha || !t.izoh) return false;
        if (t.bloklar.length < 4) return false;
        /* Ҳар блокда номи, изоҳи ва калити бўлиши шарт */
        if (t.bloklar.some((b) => !b.kalit || !b.nomi || !b.izoh)) return false;
      }
      return true;
    },
  },
  {
    nomi: 'Ҳар ролнинг сарлавҳаси ҲАР ХИЛ — панел нусхаси эмас',
    tekshir: async () => {
      const rollar = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'] as const;
      const sarlavhalar = new Set<string>();
      const kalitlar = new Set<string>();
      for (const rol of rollar) {
        const t = await vazifalarim({ userId: xodimId, rol, mahallaId: mahallaA });
        sarlavhalar.add(t.sarlavha);
        t.bloklar.forEach((b) => kalitlar.add(`${rol}:${b.kalit}`));
      }
      /* Бешта ҳар хил сарлавҳа */
      return sarlavhalar.size === 5 && kalitlar.size >= 25;
    },
  },

  /* ── 2. ИШ КЎРИНАДИ ── */
  {
    nomi: 'Муддати ЎТГАН топшириқ тахтада кўринади',
    tekshir: async () => {
      const muammo = noyob('Кечиккан синов муаммоси');
      await kechikkanTopshiriq(mahallaA, muammo);

      const t = await vazifalarim({ userId: xodimId, rol: 'YETTILIK', mahallaId: mahallaA });
      const blok = t.bloklar.find((b) => b.kalit === 'kechikkan');

      return (
        blok !== undefined &&
        blok.ogohlik === 'shoshilinch' &&
        blok.soni > 0 &&
        blok.qatorlar.some((q) => q.matn.includes(muammo.slice(0, 20)))
      );
    },
  },
  {
    nomi: 'Кечиккан топшириқда КУН сони айтилади',
    tekshir: async () => {
      const t = await vazifalarim({ userId: xodimId, rol: 'YETTILIK', mahallaId: mahallaA });
      const blok = t.bloklar.find((b) => b.kalit === 'kechikkan');
      return (blok?.qatorlar ?? []).some((q) => (q.qoshimcha ?? '').includes('кун кечикди'));
    },
  },
  {
    nomi: 'Кечиккан қаторда фуқаро саҳифасига ҳавола бор',
    tekshir: async () => {
      const t = await vazifalarim({ userId: xodimId, rol: 'YETTILIK', mahallaId: mahallaA });
      const blok = t.bloklar.find((b) => b.kalit === 'kechikkan');
      return (blok?.qatorlar ?? []).some((q) => (q.yol ?? '').startsWith('/ishsizlar/'));
    },
  },

  /* ── 3. МАҲАЛЛА ИЗОЛЯЦИЯСИ ── */
  {
    /*
     * ── ЭНГ ХАВФЛИ ХАТО ──
     *
     * МФЙ ходими бошқа маҳалланинг оиласини кўрса, бу
     * шахсий маълумотнинг тарқалиши: исм, манзил, даромад.
     */
    nomi: 'МФЙ ходими БОШҚА маҳалланинг ишини КЎРМАЙДИ',
    tekshir: async () => {
      const muammo = noyob('Бегона маҳалла муаммоси');
      await kechikkanTopshiriq(mahallaB, muammo);

      const t = await vazifalarim({ userId: xodimId, rol: 'YETTILIK', mahallaId: mahallaA });
      const hammaMatn = t.bloklar
        .flatMap((b) => b.qatorlar.map((q) => `${q.matn} ${q.qoshimcha ?? ''}`))
        .join(' | ');

      return !hammaMatn.includes(muammo.slice(0, 20));
    },
  },
  {
    nomi: 'Ўша иш ЎЗ маҳалла ходимига КЎРИНАДИ',
    tekshir: async () => {
      const muammo = noyob('Оз маҳалла муаммоси');
      await kechikkanTopshiriq(mahallaB, muammo);

      const t = await vazifalarim({ userId: xodimId, rol: 'YETTILIK', mahallaId: mahallaB });
      const blok = t.bloklar.find((b) => b.kalit === 'kechikkan');
      return (blok?.qatorlar ?? []).some((q) => q.matn.includes(muammo.slice(0, 20)));
    },
  },
  {
    /*
     * Маҳалласи белгиланмаган ходим ҲЕЧ НАРСА кўрмаслиги
     * керак — `mahallaFiltri` шундай тузилган.
     */
    nomi: 'Маҳалласи белгиланмаган ходим ҳеч кимнинг ишини кўрмайди',
    tekshir: async () => {
      const t = await vazifalarim({ userId: xodimId, rol: 'YETTILIK', mahallaId: null });
      const qatorlar = t.bloklar
        .filter((b) => b.kalit !== 'vakansiya')
        .flatMap((b) => b.qatorlar);
      return qatorlar.length === 0;
    },
  },
  {
    nomi: 'Раҳбар ва ҳоким БУТУН туманни кўради',
    tekshir: async () => {
      const muammo = noyob('Туман муаммоси');
      await kechikkanTopshiriq(mahallaB, muammo);

      const r = await vazifalarim({ userId: xodimId, rol: 'BANDLIK_RAHBAR', mahallaId: mahallaA });
      const blok = r.bloklar.find((b) => b.kalit === 'kechikkan');
      /* Раҳбарда сон бўйича — рўйхат эмас */
      return (blok?.soni ?? 0) > 0;
    },
  },

  /* ── 4. ЁЛҒОН ТИНЧЛИК БЎЛМАСЛИГИ ── */
  {
    /*
     * Ўлчанмайдиган нарсага «0» ёзиш «муаммо йўқ» деб
     * кўринади, аслида «ўлчов йўқ» эди.
     */
    nomi: 'Ўлчанмайдиган блок «0 муаммо» деб кўрсатилмайди',
    tekshir: async () => {
      const y = await vazifalarim({ userId: xodimId, rol: 'YETTILIK', mahallaId: mahallaA });
      /*
       * Мурожаатлар (§14) энди ўлчанади: аввалги «ҳали қурилмаган» блок ҲАҚИҚИЙ
       * блок билан алмашди. Қолган икки блок (захира, хатолар) ҳалиги каби
       * ўлчанмайди ва «0» ёзилмайди.
       */
      const murojaat = y.bloklar.find((b) => b.kalit === 'murojaatlar');

      const a = await vazifalarim({ userId: xodimId, rol: 'ADMIN', mahallaId: null });
      const zaxira = a.bloklar.find((b) => b.kalit === 'zaxira');
      const xatolar = a.bloklar.find((b) => b.kalit === 'xatolar');

      return (
        Boolean(murojaat) &&
        !murojaat?.yetishmayotgan &&
        Boolean(zaxira?.yetishmayotgan) &&
        Boolean(xatolar?.yetishmayotgan) &&
        /* Изоҳда НЕГА ўлчанмаслиги ёзилган — «кейинроқ» эмас */
        (zaxira?.yetishmayotgan ?? '').length > 40
      );
    },
  },
  {
    nomi: 'Заҳира блоки ШОШИЛИНЧ деб белгиланган',
    tekshir: async () => {
      const a = await vazifalarim({ userId: xodimId, rol: 'ADMIN', mahallaId: null });
      const z = a.bloklar.find((b) => b.kalit === 'zaxira');
      /* Синалмаган заҳира — заҳира эмас, ва бу энг оғир хавф */
      return z?.ogohlik === 'shoshilinch';
    },
  },

  /* ── 5. АДМИН: КАЛИТ ЭКРАНГА ЧИҚМАЙДИ ── */
  {
    /*
     * ── ХАВФСИЗЛИК ──
     *
     * Интеграция блокида ФАҚАТ «созланганми» деган ҳа/йўқ
     * бўлиши керак. Калитнинг ўзи, бўлаги ёки узунлиги
     * экранга чиқмаслиги шарт: саҳифа бошқа одамга кўриниб
     * қолиши мумкин.
     */
    nomi: 'Интеграция блокида КАЛИТНИНГ ўзи ҲЕЧ ҚАЧОН кўрсатилмайди',
    tekshir: async () => {
      const a = await vazifalarim({ userId: xodimId, rol: 'ADMIN', mahallaId: null });
      const blok = a.bloklar.find((b) => b.kalit === 'integratsiya');
      if (!blok) return false;

      const matn = blok.qatorlar.map((q) => `${q.matn} ${q.qoshimcha ?? ''}`).join(' | ');

      /* Муҳитдаги ҳақиқий қийматларнинг биронтаси ҳам чиқмаслиги керак */
      const sirlar = [
        process.env.DATABASE_URL,
        process.env.DIRECT_URL,
        process.env.SESSION_SECRET,
        process.env.TELEGRAM_BOT_TOKEN,
        process.env.TELEGRAM_WEBHOOK_SIRI,
        process.env.CRON_SECRET,
        process.env.ADMIN_PASSWORD,
      ].filter((x): x is string => Boolean(x && x.length >= 8));

      if (sirlar.some((s) => matn.includes(s))) return false;
      /* Парол ва ҳатто унинг бошланиши ҳам йўқ */
      if (sirlar.some((s) => matn.includes(s.slice(0, 8)))) return false;

      /* Аммо ҳолати АЙТИЛАДИ */
      return matn.includes('созланган') || matn.includes('ЙЎҚ');
    },
  },
  {
    /*
     * Рақам ва рўйхат БИР-БИРИГА ҚАРШИ гапирмаслиги керак:
     * рўйхатда «сир ЙЎҚ» деб туриб, рақамда «0» чиқса,
     * администратор рақамга ишониб ўтиб кетарди.
     */
    nomi: 'Интеграция рақами СОЗЛАНМАГАНЛАР сонини кўрсатади',
    tekshir: async () => {
      const cron = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;
      try {
        const a = await vazifalarim({ userId: xodimId, rol: 'ADMIN', mahallaId: null });
        const blok = a.bloklar.find((b) => b.kalit === 'integratsiya');
        return (blok?.soni ?? 0) >= 1 && blok?.ogohlik !== 'tinch';
      } finally {
        if (cron !== undefined) process.env.CRON_SECRET = cron;
      }
    },
  },
  {
    nomi: 'Вебхук сири йўқ бўлса — ШОШИЛИНЧ деб белгиланади',
    tekshir: async () => {
      const bor = process.env.TELEGRAM_BOT_TOKEN;
      const sir = process.env.TELEGRAM_WEBHOOK_SIRI;
      process.env.TELEGRAM_BOT_TOKEN = 'sinov-token';
      delete process.env.TELEGRAM_WEBHOOK_SIRI;
      try {
        const a = await vazifalarim({ userId: xodimId, rol: 'ADMIN', mahallaId: null });
        const blok = a.bloklar.find((b) => b.kalit === 'integratsiya');
        return blok?.ogohlik === 'shoshilinch';
      } finally {
        if (bor === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
        else process.env.TELEGRAM_BOT_TOKEN = bor;
        if (sir !== undefined) process.env.TELEGRAM_WEBHOOK_SIRI = sir;
      }
    },
  },

  /* ── 6. КУН ЧЕГАРАСИ ТОШКЕНТ ВАҚТИДА ── */
  {
    /*
     * Сервер UTC да. «Бугун» ни UTC да ҳисоблаш Тошкентда
     * кечқурун соат 19:00 дан кейин ЭРТАГА га ўтиб кетарди
     * ва ходимнинг «бугунги ташрифлари» бўшаб қоларди.
     */
    nomi: 'Тошкентда кечқурун соат 20:00 ҳамон БУГУН',
    tekshir: async () => {
      /* 30.09.2026, Тошкентда 20:30 = UTC да 15:30 */
      const kechqurun = new Date(Date.UTC(2026, 8, 30, 15, 30));
      const boshi = kunBoshi(kechqurun);
      const oxiri = kunOxiri(kechqurun);

      /* Тошкент куни UTC да 19:00 да бошланади (30 сентябрь = 29.09 19:00 UTC) */
      return (
        boshi.getTime() === Date.UTC(2026, 8, 29, 19, 0) &&
        oxiri.getTime() === Date.UTC(2026, 8, 30, 19, 0) &&
        kechqurun >= boshi &&
        kechqurun < oxiri
      );
    },
  },
  {
    nomi: 'Тошкентда эрталаб соат 08:00 ҳам ўша кун',
    tekshir: async () => {
      const ertalab = new Date(Date.UTC(2026, 8, 30, 3, 0)); // Тошкентда 08:00
      const boshi = kunBoshi(ertalab);
      const kechqurun = new Date(Date.UTC(2026, 8, 30, 15, 30));
      /* Иккови БИТТА кунга тушади */
      return boshi.getTime() === kunBoshi(kechqurun).getTime();
    },
  },

  /* ── 7. ТАРТИБ ВА ЙЎЛ ── */
  {
    nomi: 'Саҳифа ШОШИЛИНЧни тепага чиқаради',
    tekshir: async () => {
      const s = kodiOl(readFileSync('src/app/(ilova)/vazifalar/page.tsx', 'utf8'));
      return (
        s.includes("shoshilinch: 0") &&
        s.includes('.sort(') &&
        /* Ўлчови йўқлари ЭНГ ОХИРДА */
        s.includes('a.yetishmayotgan ? 1 : -1')
      );
    },
  },
  {
    nomi: 'Ҳолат ФАҚАТ ранг билан айтилмайди — матн ҳам бор',
    tekshir: async () => {
      const s = kodiOl(readFileSync('src/app/(ilova)/vazifalar/page.tsx', 'utf8'));
      return s.includes('OGOHLIK_NOMI[blok.ogohlik]');
    },
  },
  {
    nomi: 'Йўл менюда ва БАРЧА ролга очиқ',
    tekshir: async () => {
      const band = MENYU.find((b) => b.yol === '/vazifalar');
      if (!band) return false;
      const rollar = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'] as const;
      return (
        rollar.every((r) => band.rollar.includes(r)) &&
        rollar.every((r) => yolgaRuxsat(r, '/vazifalar')) &&
        /* Менюнинг БИРИНЧИ банди */
        MENYU[0].yol === '/vazifalar'
      );
    },
  },
  {
    nomi: 'Саҳифа қўриқчидан ўтади',
    tekshir: async () => {
      const s = kodiOl(readFileSync('src/app/(ilova)/vazifalar/page.tsx', 'utf8'));
      return (
        s.includes('await joriyXodim()') &&
        s.includes("yolgaRuxsat(sessiya.rol, '/vazifalar')") &&
        /* Cookie дан ЎҚИЛМАЙДИ */
        !s.includes('joriySessiya()')
      );
    },
  },

  /* ── 8. МАҲАЛЛА РЕЙТИНГИ АДОЛАТЛИ ── */
  {
    /*
     * Хом сон катта маҳаллани ҳар доим тепага чиқаради ва
     * ҳоким шу рўйхатга қараб ресурс тақсимлайди.
     */
    nomi: 'Маҳалла рейтингида НИСБИЙ кўрсаткичлар бор',
    tekshir: async () => {
      const g = kodiOl(readFileSync('src/components/panel/grafiklar.tsx', 'utf8'));
      return (
        g.includes("kalit: 'qamrovFoizi'") &&
        g.includes("kalit: 'natijaFoizi'") &&
        g.includes("kalit: 'mingXonadonga'")
      );
    },
  },
  {
    /*
     * ── АВВАЛ БУ СИНОВ ЙИҚИЛГАН ЭДИ ──
     *
     * `indexOf("kalit: 'aniqlangan'")` БУТУН файлдан
     * қидирарди ва ўша сатр диаграмма созламаларида ҳам
     * учрарди — яъни синов бошқа жойни ўлчарди.
     *
     * Энди ФАҚАТ `OLCHAMLAR` рўйхатининг ичи текширилади.
     */
    nomi: 'Стандарт кўрсаткич ФОИЗ — хом сон эмас',
    tekshir: async () => {
      const g = kodiOl(readFileSync('src/components/panel/grafiklar.tsx', 'utf8'));

      const bosh = g.indexOf('const OLCHAMLAR');
      const oxir = g.indexOf('];', bosh);
      if (bosh < 0 || oxir < 0) return false;
      const royxat = g.slice(bosh, oxir);

      const birinchi = royxat.indexOf("kalit: 'qamrovFoizi'");
      const nisbiy = royxat.indexOf("kalit: 'mingXonadonga'");
      const xom = royxat.indexOf("kalit: 'aniqlangan'");

      return (
        /* Нисбий кўрсаткичлар хом сондан ОЛДИН турибди */
        birinchi >= 0 &&
        nisbiy > birinchi &&
        xom > nisbiy &&
        /* Бошланғич танлов ҳам фоиз */
        g.includes("useState<Olcham>('qamrovFoizi')") &&
        /* Хом сон ЭКРАНДА «хом сон» деб белгиланган */
        royxat.includes('хом сон')
      );
    },
  },
  {
    nomi: 'Минг хонадонга нисбатан кўрсаткич ТЎҒРИ ҳисобланади',
    tekshir: async () => {
      const t = kodiOl(readFileSync('src/lib/tahlil.ts', 'utf8'));
      return (
        t.includes('mingXonadonga') &&
        t.includes('m.xonadon > 0') &&
        /* Нолга бўлиш йўқ */
        t.includes("m.xonadon > 0 ? Math.round((mahallaJoylashgan / m.xonadon) * 1000 * 10) / 10 : 0")
      );
    },
  },

  /* ── 9. СЎРОВЛАР СОНИ ── */
  {
    /*
     * Тахта ҳар саҳифа очилишида қурилади. Сўровлар
     * КЕТМА-КЕТ юборилса, оддий телефонда ва суст
     * интернетда саҳифа очилмай қолади.
     */
    nomi: 'Сўровлар ПАРАЛЛЕЛ юборилади',
    tekshir: async () => {
      const s = kodiOl(readFileSync('src/lib/vazifalar.ts', 'utf8'));
      /* Ҳар рол учун битта `Promise.all` */
      return (s.match(/await Promise\.all\(/g) ?? []).length >= 5;
    },
  },
  {
    nomi: 'Рўйхатлар ЧЕКЛАНГАН — бутун туман юкланмайди',
    tekshir: async () => {
      const s = kodiOl(readFileSync('src/lib/vazifalar.ts', 'utf8'));
      const takelar = s.match(/take: \d+/g) ?? [];
      /* Ҳар `findMany` да чегара бўлиши керак */
      const findManylar = (s.match(/findMany\(/g) ?? []).length;
      return takelar.length >= findManylar;
    },
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
