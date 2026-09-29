/**
 * ============================================================
 *  ДЕВОР ТАБЛОСИ — СИНОВ
 *
 *  Ишга тушириш:  npx tsx scripts/tablo-sinov.ts
 *
 *  ── Нега бу экран алоҳида синалади ──
 *
 *  Табло ҳокимият йўлагида, кун бўйи, ҳамма кўриб турадиган
 *  жойда осилади. Ундаги хато оддий саҳифадаги хатодан
 *  БОШҚАЧА ишлайди: уни ҳеч ким «хато» деб хабар қилмайди,
 *  чунки ҳеч ким уни «ишлатмайди» — қараб ўтиб кетади. Нотўғри
 *  рақам эса ўша қарашларнинг ҳар бирида тўғри деб қабул
 *  қилинади.
 *
 *  Иккита хавф бор ва иккиси ҳам ЖИМ келади:
 *
 *    1. РАҚАМ ФАРҚИ. Табло ва брифинг битта кўрсаткични икки
 *       хил ҳисобласа, ҳоким иккаласига ҳам ишонмай қўяди.
 *
 *    2. ВАҚТ МИНТАҚАСИ. Сервер UTC да, туман UTC+5 да.
 *       «Бугун» нотўғри ҳисобланса, экран тонгда кечаги
 *       рақамни кўрсатади ва соат бешда сабабсиз нолга
 *       тушади.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { CHEGARA, HUDUDLAR, MARKAZLAR } from '../src/lib/xarita/hududlar';
import { brifingYasa } from '../src/lib/hokim-brifingi';
import { OQIM_KUNI, etiborYasa, tabloKeshiniTozala, tabloMalumoti } from '../src/lib/tablo-malumoti';
import { KUN_MS, harakat, kunBoshi, tumanHolati, type TumanHolati } from '../src/lib/tuman-holati';
import { tabloOlchovlari } from '../src/components/tablo/tablo-olchovlari';
import type { XaritaQatori } from '../src/lib/xarita/xarita-malumoti';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const SAHIFA = readFileSync('src/app/tablo/page.tsx', 'utf8');
const XARITA = readFileSync('src/components/tablo/tablo-xarita.tsx', 'utf8');
const EKRAN = readFileSync('src/components/tablo/tablo-ekrani.tsx', 'utf8');

/**
 * Изоҳларсиз код.
 *
 * «`location.reload()` бўлса, экран оқариб кетарди» деб
 * ёзилган ИЗОҲНИ синов `location.reload` ишлатилган деб
 * ўқиди ва ўзининг қоидасини бузди. Изоҳ — ният, код —
 * амал; текширув амални кўриши керак.
 */
const kodiOl = (matn: string): string =>
  matn
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const EKRAN_KODI = kodiOl(EKRAN);
const XARITA_KODI = kodiOl(XARITA);

/** Сохта қатор — ўлчов танловини базасиз синаш учун */
const qator = (o: Partial<XaritaQatori> = {}): XaritaQatori => ({
  hududId: 'h',
  mahallaId: 'm',
  nomiKirill: 'Синов',
  bazaAholi: 1000,
  bazaXonadon: 200,
  xatlovXonadon: 0,
  qamrovFoizi: 0,
  bazaIshsiz: 50,
  aniqlangan: 0,
  joylashtirilgan: 0,
  natijaFoizi: 0,
  ishsizQoldiq: 0,
  bolalar17: 0,
  chetElIshchi: 0,
  ...o,
});

/** Сохта туман ҳолати — эътибор рўйхатини синаш учун */
const holat = (o: Partial<TumanHolati> = {}): TumanHolati => ({
  jamiMahalla: 70,
  bazaXonadon: 40000,
  bazaIshsiz: 3000,
  xatlovXonadon: 150,
  qamrovFoizi: 0.4,
  topilganIshsiz: 130,
  anketa: 40,
  anketasiz: 90,
  joylashtirilgan: 19,
  tasdiqlanganJoylashuv: 7,
  dalilsizJoylashuv: 0,
  ochiqOrin: 9,
  boshlaganMahalla: 2,
  boshlamaganMahalla: 68,
  kechikkanTopshiriq: 0,
  xodim: 78,
  ulanganXodim: 78,
  ulanmaganXodim: 0,
  ...o,
});

/** Матндаги «151 / 40 377» каби сонларни оддий рақамга келтиради */
const sonlar = (matn: string): string[] =>
  (matn.match(/\d[\d  ]*/g) ?? []).map((s) => s.replace(/[  ]/g, ''));

const SINOVLAR: Sinov[] = [
  /* ────────────────────────────────────────────────────────
   *  1. РАҚАМ ФАРҚИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Бир пайтлар брифингга янги жамланма сўров қўшилганди ва
     * унга `QORALAMA` фильтри тушмай қолди: битта ҳужжатда
     * «134» ва «136» ёнма-ён турди.
     *
     * Энди иккала экран ҳам `tuman-holati` дан ўқийди. Бу
     * синов ўша ваъдани ТЕКШИРАДИ: брифинг матнидаги сонлар
     * айнан ўша жамланмадан чиққанми.
     */
    nomi: 'Брифинг ва табло бир хил рақам беради',
    tekshir: async () => {
      tabloKeshiniTozala();
      const [b, t, h] = await Promise.all([brifingYasa(), tabloMalumoti(), tumanHolati()]);

      const matn = b.matn.replace(/<\/?b>/g, '');
      const qamrov = matn.split('\n').find((s) => s.includes('Хатлов қамрови'));
      const topilgan = matn.split('\n').find((s) => s.includes('Хатлов топган ишсиз'));
      if (!qamrov || !topilgan) return false;

      const q = sonlar(qamrov);
      const i = sonlar(topilgan);

      return (
        /* Брифинг матнидаги сон — жамланмадаги сон */
        q[0] === String(h.xatlovXonadon) &&
        q[1] === String(h.bazaXonadon) &&
        i[0] === String(h.topilganIshsiz) &&
        /* Табло ҳам ЎША жамланмани кўрсатади */
        t.holat.xatlovXonadon === h.xatlovXonadon &&
        t.holat.topilganIshsiz === h.topilganIshsiz &&
        t.holat.joylashtirilgan === h.joylashtirilgan
      );
    },
  },

  /* ────────────────────────────────────────────────────────
   *  2. ВАҚТ МИНТАҚАСИ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Кун боши Тошкент вақти бўйича — серверники эмас',
    tekshir: async () => {
      /*
       * 29 сентябр, Тошкентда соат 02:00. UTC да бу — 28
       * сентябр, соат 21:00.
       *
       * Кун боши 29 сентябр 00:00 Тошкент, яъни 28 сентябр
       * 19:00 UTC бўлиши керак. `setHours(0,0,0,0)` эса UTC
       * серверда 28 сентябр 00:00 UTC ни қайтарарди — бутун
       * бир кун орқага.
       */
      const tongda = new Date('2026-09-28T21:00:00.000Z');
      const boshi = kunBoshi(tongda);

      return boshi.toISOString() === '2026-09-28T19:00:00.000Z';
    },
  },
  {
    nomi: 'Тонгги хатлов ЎША кунга ёзилади, кечагига эмас',
    tekshir: async () => {
      const xodim = await sinovXodimi();
      try {
        /* 29 сентябр, Тошкентда 01:30 — яъни ҳали 29 сентябр */
        const tongda = new Date('2026-09-28T20:30:00.000Z');
        await xonadonYarat(xodim.id, tongda);

        const bugunBoshi = kunBoshi(tongda);
        const ertaga = new Date(bugunBoshi.getTime() + KUN_MS);
        const kechaBoshi = new Date(bugunBoshi.getTime() - KUN_MS);

        const [bugun, kecha] = await Promise.all([
          harakat(bugunBoshi, ertaga),
          harakat(kechaBoshi, bugunBoshi),
        ]);

        return bugun.xatlov >= 1 && kecha.xatlov === 0;
      } finally {
        await tozala(xodim.id);
      }
    },
  },

  /* ────────────────────────────────────────────────────────
   *  3. ОҚИМ ДИАГРАММАСИ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Оқимда 14 та кун бор — бўш кун тушиб қолмайди',
    tekshir: async () => {
      tabloKeshiniTozala();
      const t = await tabloMalumoti();
      if (t.oqim.length !== OQIM_KUNI) return false;

      /*
       * Бўш кунни тушириб қолдириб бўлмайди: устунлар
       * сурилиб, тўхтаб қолган ҳафта узлуксиз ишдек
       * кўринарди.
       */
      for (let i = 1; i < t.oqim.length; i++) {
        const farq = t.oqim[i].sana.getTime() - t.oqim[i - 1].sana.getTime();
        if (farq !== KUN_MS) return false;
      }
      /* Охиргиси — БУГУН */
      return t.oqim[t.oqim.length - 1].sana.getTime() === kunBoshi(new Date()).getTime();
    },
  },

  /* ────────────────────────────────────────────────────────
   *  4. ЭЪТИБОР РЎЙХАТИ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Эътибор рўйхати учтадан ошмайди',
    tekshir: async () => {
      /* Ҳамма муаммо бир вақтда — барибир учта сатр */
      const hammasi = etiborYasa(
        holat({ ochiqOrin: 0, ulanmaganXodim: 70, kechikkanTopshiriq: 19, anketasiz: 97 })
      );
      return hammasi.length === 3;
    },
  },
  {
    nomi: 'Занжирни УЗАДИГАН муаммо тепада туради',
    tekshir: async () => {
      /*
       * Йўлакдан ўтган одам биринчи сатрни ўқийди, учинчисига
       * етиб бормаслиги мумкин. Шунинг учун занжирни тўхтатиб
       * қўядиган ҳолат (очиқ ўрин йўқ, ходим уланмаган) —
       * сустликдан (маҳалла бошламаган) ЮҚОРИДА.
       */
      const r = etiborYasa(
        holat({ ochiqOrin: 0, ulanmaganXodim: 70, boshlamaganMahalla: 68, anketasiz: 97 })
      );
      return (
        r[0].matn.includes('Очиқ иш ўрни') &&
        r[1].matn.includes('ходим') &&
        !r.some((x) => x.matn.includes('хатловни бошламаган'))
      );
    },
  },
  {
    nomi: 'Муаммо бўлмаса, рўйхат БЎШ қолади',
    tekshir: async () => {
      /*
       * Ҳар куни бир хил рўйхат чиқса, раҳбар уни ўқимай
       * қўяди — ва ўша куни ҳақиқий муаммо ҳам ўтиб кетади.
       */
      const r = etiborYasa(
        holat({
          ochiqOrin: 9,
          ulanmaganXodim: 0,
          kechikkanTopshiriq: 0,
          anketasiz: 0,
          boshlamaganMahalla: 0,
        })
      );
      return r.length === 0;
    },
  },
  {
    nomi: 'Ранг ёлғиз маъно ташимайди — ҳар сатрда матн бор',
    tekshir: async () => {
      const r = etiborYasa(holat({ ochiqOrin: 0, ulanmaganXodim: 70 }));
      return r.every((x) => x.matn.trim().length > 0) && EKRAN_KODI.includes('e.ogirlik');
    },
  },

  /* ────────────────────────────────────────────────────────
   *  5. АЙЛАНАДИГАН ЎЛЧОВЛАР
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Бўш кесим айланишга кирмайди',
    tekshir: async () => {
      /*
       * Иккита МФЙ да хатлов бошланган, қолган 68 таси бўш.
       * «Қамров» харитаси шу ҳолатда деярли оппоқ — уни
       * телевизорга чиқариш «тизим ишламаяпти» деб
       * ўқиларди.
       */
      const qatorlar = [
        qator({ hududId: 'a', xatlovXonadon: 40, qamrovFoizi: 12 }),
        qator({ hududId: 'b', xatlovXonadon: 10, qamrovFoizi: 4 }),
        ...Array.from({ length: 68 }, (_, i) => qator({ hududId: `x${i}` })),
      ];
      const tanlangan = tabloOlchovlari(qatorlar).map((o) => o.kalit);
      return !tanlangan.includes('qamrov') && tanlangan.includes('bazaIshsiz');
    },
  },
  {
    nomi: 'Иш ёйилгач кесим ЎЗИ қўшилади',
    tekshir: async () => {
      const qatorlar = Array.from({ length: 20 }, (_, i) =>
        qator({ hududId: `h${i}`, xatlovXonadon: 30 + i, qamrovFoizi: 10 + i })
      );
      const tanlangan = tabloOlchovlari(qatorlar).map((o) => o.kalit);
      return tanlangan.includes('qamrov') && tanlangan[0] === 'qamrov';
    },
  },
  {
    nomi: 'Рўйхат ҳеч қачон бўш қайтмайди',
    tekshir: async () => tabloOlchovlari([]).length > 0,
  },

  /* ────────────────────────────────────────────────────────
   *  6. ХАРИТА БЕЛГИЛАРИ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Ҳар бир ҳудуднинг маркази бор ва ЎЗ чегараси ичида',
    tekshir: async () => {
      if (MARKAZLAR.size !== HUDUDLAR.length) return false;

      for (const h of HUDUDLAR) {
        const m = MARKAZLAR.get(h.id);
        if (!m) return false;

        const sonlar2 = h.d.match(/-?\d+(?:\.\d+)?/g);
        if (!sonlar2) return false;

        let chap = Infinity;
        let ong = -Infinity;
        let tepa = Infinity;
        let past = -Infinity;
        for (let i = 0; i + 1 < sonlar2.length; i += 2) {
          const x = Number(sonlar2[i]);
          const y = Number(sonlar2[i + 1]);
          chap = Math.min(chap, x);
          ong = Math.max(ong, x);
          tepa = Math.min(tepa, y);
          past = Math.max(past, y);
        }
        if (m.x < chap || m.x > ong || m.y < tepa || m.y > past) return false;

        /* Харита кадридан ҳам чиқмаслиги керак */
        if (m.x < CHEGARA.x || m.x > CHEGARA.x + CHEGARA.eni) return false;
        if (m.y < CHEGARA.y || m.y > CHEGARA.y + CHEGARA.boyi) return false;
      }
      return true;
    },
  },
  {
    nomi: 'Марказ ЮЗАдан ҳисобланади — нуқталар ўртачасидан эмас',
    tekshir: async () => {
      /*
       * Нуқталар ўртачаси контур зич чизилган томонга
       * тортилади: эгри чекка юзлаб нуқтадан, текис чегара
       * эса тўрттадан иборат бўлиши мумкин.
       *
       * Экранда бу кўринди — белги икки шакл орасидаги оқ
       * тирқишда турди. Синов эски усул қайтиб келмаганини
       * текширади: камида битта ҳудудда иккала натижа
       * сезиларли фарқ қилиши керак.
       */
      let farqli = 0;

      for (const h of HUDUDLAR) {
        const m = MARKAZLAR.get(h.id);
        if (!m) continue;

        const s = h.d.match(/-?\d+(?:\.\d+)?/g);
        if (!s) continue;

        let yigX = 0;
        let yigY = 0;
        let n = 0;
        for (let i = 0; i + 1 < s.length; i += 2) {
          yigX += Number(s[i]);
          yigY += Number(s[i + 1]);
          n += 1;
        }
        if (n === 0) continue;

        const masofa = Math.hypot(m.x - yigX / n, m.y - yigY / n);
        if (masofa > 3) farqli += 1;
      }

      return farqli >= 5;
    },
  },

  /* ────────────────────────────────────────────────────────
   *  7. ҚОИДА НУСХАЛАНМАГАНИ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Девор харитаси ранг қоидасини ЎЗИ ҳисобламайди',
    tekshir: async () =>
      /*
       * Иккита харита битта қоида бўйича бўялиши шарт: битта
       * МФЙ панелда тўқ, йўлакда оч кўк бўлиб турса, «қайси
       * бири тўғри» деган савол чиқади.
       */
      XARITA_KODI.includes('qadamlarniHisobla(qatorlar, olchov)') &&
      !XARITA_KODI.includes('[0.25, 0.5, 0.75]') &&
      !XARITA_KODI.includes('const chorak'),
  },
  {
    nomi: 'Таблода ҳавола ва меню йўқ — босадиган одам йўқ',
    tekshir: async () => !EKRAN_KODI.includes('<Link') && !EKRAN_KODI.includes('href='),
  },

  /* ────────────────────────────────────────────────────────
   *  8. ҲУҚУҚ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Табло сессия ва ролни текширади',
    tekshir: async () =>
      SAHIFA.includes('joriySessiya()') &&
      SAHIFA.includes('tahlilKoradi(sessiya.rol)') &&
      /* Ишдан бўшатилган ходим cookie билан кира олмайди */
      SAHIFA.includes('user?.faol'),
  },
  {
    nomi: 'Табло статик кешланмайди — жонли маълумот кўрсатади',
    tekshir: async () => SAHIFA.includes("export const dynamic = 'force-dynamic'"),
  },
  {
    nomi: 'Экран ўзини янгилайди ва ўлчовни алмаштиради',
    tekshir: async () =>
      EKRAN_KODI.includes('router.refresh()') &&
      EKRAN_KODI.includes('ALMASHUV_MS') &&
      /* Саҳифа тўлиқ қайта юкланмайди — экран оқариб кетмасин */
      !EKRAN_KODI.includes('location.reload'),
  },
];

/* ── Синов учун ходим ва хонадон ── */

async function sinovXodimi() {
  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  return prisma.user.create({
    data: {
      username: `sinov_tablo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: 'Sinov Xodimi',
      passwordHash: 'x',
      rol: 'YETTILIK',
      mahallaId: mahalla!.id,
    },
    select: { id: true, mahallaId: true },
  });
}

async function xonadonYarat(xodimId: string, sana: Date) {
  const xodim = await prisma.user.findUnique({
    where: { id: xodimId },
    select: { mahallaId: true },
  });
  return prisma.household.create({
    data: {
      mahallaId: xodim!.mahallaId!,
      manzil: 'Sinov ko‘chasi 1',
      oilaBoshligi: 'Sinov Oila',
      jamiAzo: 3,
      xodimId,
      takrorKaliti: `sinov-tablo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      holati: 'TASDIQLANGAN',
      xatlovSanasi: sana,
    },
    select: { id: true },
  });
}

async function tozala(xodimId: string) {
  await prisma.household.deleteMany({ where: { xodimId } });
  await prisma.user.delete({ where: { id: xodimId } });
}

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
