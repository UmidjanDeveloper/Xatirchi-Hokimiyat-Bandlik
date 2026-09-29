/**
 * ============================================================
 *  БОТДА САВОЛ-ЖАВОБ — СИНОВ
 *
 *  Ишга тушириш:  npx tsx scripts/savol-sinov.ts
 *
 *  ── Нега бу ерда хато ЖИМ келади ──
 *
 *  Бот нотўғри тушунса, у хато бермайди — БОШҚА нарсага
 *  жавоб беради. Раҳбар «янги иш ўрни борми?» деб сўраб,
 *  «Янги МФЙ» нинг рақамларини олади ва буни СЎРАГАНИ деб
 *  ўқийди.
 *
 *  Бундай хатони кўз билан топиб бўлмайди: жавоб чиройли
 *  ва ишончли кўринади. Машина текширади.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  kodShaklimi,
  mahallaniTop,
  niyatniTop,
  savolgaJavob,
  tumanKartasi,
} from '../src/lib/bot-savol';
import { tumanHolati } from '../src/lib/tuman-holati';
import { xaritaMalumoti } from '../src/lib/xarita/xarita-malumoti';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const SAVOL_KODI = readFileSync('src/lib/bot-savol.ts', 'utf8');
const WEBHOOK = readFileSync('src/app/api/telegram/webhook/route.ts', 'utf8');

/** Сонларни матндан ажратади — бўшлиқларсиз */
const sonlar = (matn: string): string[] =>
  (matn.match(/\d[\d  ]*/g) ?? []).map((s) => s.replace(/[  ]/g, ''));

async function sinovXodimi(rol: 'YETTILIK' | 'BANDLIK_RAHBAR', mahallaId?: string) {
  const m = mahallaId
    ? { id: mahallaId }
    : await prisma.mahalla.findFirst({ select: { id: true } });
  return prisma.user.create({
    data: {
      username: `sinov_savol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: 'Sinov Xodimi',
      passwordHash: 'x',
      rol,
      mahallaId: m!.id,
    },
    select: { id: true, mahallaId: true },
  });
}

const SINOVLAR: Sinov[] = [
  /* ────────────────────────────────────────────────────────
   *  1. НОМНИ ТОПИШ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Кирилл ва лотин битта МФЙ га тушади',
    tekshir: async () => {
      const a = await mahallaniTop('Уйшунда нечта ишсиз бор?');
      const b = await mahallaniTop('uyshunda nechta ishsiz bor');
      return Boolean(a) && Boolean(b) && a!.id === b!.id;
    },
  },
  {
    /*
     * ── АСОСИЙ ТУЗОҚ ──
     *
     * Туманда «Янги» деган маҳалла бор, «янги» эса ўзбек
     * тилидаги энг кўп ишлатиладиган сўз. Аввалги қоида
     * («ном саволнинг ичида борми») билан «янги иш ўрни
     * борми?» саволи ЎША маҳаллага тушиб кетарди.
     *
     * Раҳбар эса жавобни СЎРАГАНИ деб ўқирди: у бутун туман
     * бўйича сўраган, жавобда эса битта маҳалла рақами
     * турган бўларди.
     */
    nomi: '«янги иш ўрни» — маҳалла ЭМАС, эълон сўрови',
    tekshir: async () => {
      const kirill = await mahallaniTop('янги иш ўрни борми');
      const lotin = await mahallaniTop('yangi ish orni bormi');
      return kirill === null && lotin === null && niyatniTop('янги иш ўрни борми') === 'orin';
    },
  },
  {
    nomi: 'Қўшимча билан ёзилса — ўша маҳалла',
    tekshir: async () => {
      const m = await mahallaniTop('Янгида нечта хонадон хатланди');
      return m?.nomiKirill === 'Янги';
    },
  },
  {
    nomi: '«МФЙ» сўзи ҳам етарли',
    tekshir: async () => {
      const m = await mahallaniTop('Янги МФЙ бўйича');
      return m?.nomiKirill === 'Янги';
    },
  },
  {
    /*
     * «Сарой» — «Кўксарой» нинг ичида. Бутун саволни
     * бўшлиқсиз сатрга айлантириб излаш буни кўрмасди ва
     * жавоб БОШҚА маҳалла ҳақида бўларди.
     */
    nomi: 'Сўз чегараси: «Кўксаройда» → Кўксарой, «Саройда» → Сарой',
    tekshir: async () => {
      const a = await mahallaniTop('Кўксаройда нечта');
      const b = await mahallaniTop('Саройда нечта');
      return a?.nomiKirill === 'Кўксарой' && b?.nomiKirill === 'Сарой';
    },
  },
  {
    nomi: 'Кўп сўзли ном тўлиқ танилади',
    tekshir: async () => {
      const m = await mahallaniTop('Алишер Навоийда қанча одам иш кутяпти');
      return m?.nomiKirill === 'Алишер Навоий';
    },
  },

  /* ────────────────────────────────────────────────────────
   *  2. НИЯТ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Ниятлар иккала алифбода ҳам танилади',
    tekshir: async () =>
      niyatniTop('очиқ иш ўринлари') === 'orin' &&
      niyatniTop('ochiq ish orinlari') === 'orin' &&
      niyatniTop('туман бўйича ҳолат') === 'tuman' &&
      niyatniTop('энг фаол маҳаллалар') === 'saf',
  },
  {
    nomi: 'Тушунилмаган матн ниятсиз қолади',
    tekshir: async () => niyatniTop('салом') === null && niyatniTop('') === null,
  },

  /* ────────────────────────────────────────────────────────
   *  3. МАҲАЛЛА ИЗОЛЯЦИЯСИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Бу қоида сайтда биринчи кундан амал қилади: 70 та
     * ходимнинг ҳар бири фақат ўз МФЙ сини кўради.
     *
     * Бот уни бузмаслиги керак — акс ҳолда ботдан сўраб,
     * сайтда беркитилган рақамни олиш мумкин бўларди.
     */
    nomi: 'Маҳалла ходими БЕГОНА МФЙ рақамини олмайди',
    tekshir: async () => {
      const mahallalar = await prisma.mahalla.findMany({
        select: { id: true, nomiKirill: true },
        take: 2,
        orderBy: { nomi: 'asc' },
      });
      if (mahallalar.length < 2) return false;

      const xodim = await sinovXodimi('YETTILIK', mahallalar[0].id);
      try {
        const j = await savolgaJavob(xodim.id, `${mahallalar[1].nomiKirill} МФЙ бўйича`);
        return (
          j.niyat === 'mahalla.taqiq' &&
          /* Рақам БЕРИЛМАЙДИ — фақат тушунтириш */
          !j.matn.includes('Ишга жойлаштирилган')
        );
      } finally {
        await prisma.user.delete({ where: { id: xodim.id } });
      }
    },
  },
  {
    nomi: 'Маҳалла ходими «туман бўйича» сўраса — ЎЗ МФЙ си',
    tekshir: async () => {
      const xodim = await sinovXodimi('YETTILIK');
      try {
        const j = await savolgaJavob(xodim.id, 'туман бўйича ҳолат');
        return j.niyat === 'mahalla' || j.niyat === 'mahalla.topilmadi';
      } finally {
        await prisma.user.delete({ where: { id: xodim.id } });
      }
    },
  },
  {
    nomi: 'Раҳбар туман кесимини кўради',
    tekshir: async () => {
      const xodim = await sinovXodimi('BANDLIK_RAHBAR');
      try {
        const j = await savolgaJavob(xodim.id, 'туман бўйича ҳолат');
        return j.niyat === 'tuman';
      } finally {
        await prisma.user.delete({ where: { id: xodim.id } });
      }
    },
  },

  /* ────────────────────────────────────────────────────────
   *  4. РАҚАМ ФАРҚИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Ботда «134», деворда «136» турса, иккаласига ҳам
     * ишонч қолмайди. Учала экран ҳам `tuman-holati` дан
     * ўқиши керак.
     */
    nomi: 'Ботдаги туман рақами таблодагига тенг',
    tekshir: async () => {
      const [j, h] = await Promise.all([tumanKartasi(), tumanHolati()]);
      const matn = j.matn.replace(/<\/?b>/g, '');

      const xatlov = matn.split('\n').find((x) => x.includes('Хатлов:'));
      const topilgan = matn.split('\n').find((x) => x.includes('Хатлов топган ишсиз'));
      if (!xatlov || !topilgan) return false;

      const a = sonlar(xatlov);
      const b = sonlar(topilgan);
      return (
        a[0] === String(h.xatlovXonadon) &&
        a[1] === String(h.bazaXonadon) &&
        b[0] === String(h.topilganIshsiz)
      );
    },
  },
  {
    nomi: 'МФЙ картаси харита манбаи билан бир хил',
    tekshir: async () => {
      const xarita = await xaritaMalumoti();
      const q = xarita.qatorlar.find((x) => x.aniqlangan > 0) ?? xarita.qatorlar[0];
      if (!q) return false;

      const xodim = await sinovXodimi('BANDLIK_RAHBAR');
      try {
        const j = await savolgaJavob(xodim.id, `${q.nomiKirill} МФЙ бўйича`);
        if (j.niyat !== 'mahalla') return false;

        const matn = j.matn.replace(/<\/?b>/g, '');
        const anketa = matn.split('\n').find((x) => x.includes('Анкетаси тўлдирилган'));
        const joylashgan = matn.split('\n').find((x) => x.includes('Ишга жойлаштирилган'));
        if (!anketa || !joylashgan) return false;

        return (
          sonlar(anketa)[0] === String(q.aniqlangan) &&
          sonlar(joylashgan)[0] === String(q.joylashtirilgan)
        );
      } finally {
        await prisma.user.delete({ where: { id: xodim.id } });
      }
    },
  },

  /* ────────────────────────────────────────────────────────
   *  5. ТУШУНМАСЛИК — ТУПИК ЭМАС
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * «Тушунмадим» — бу тупик. Одам иккинчи марта уриниб
     * кўради, яна тушунилмаса, ботни ёпади ва қайтиб
     * очмайди.
     */
    nomi: 'Тушунилмаган савол МИСОЛ билан жавоб олади',
    tekshir: async () => {
      const xodim = await sinovXodimi('BANDLIK_RAHBAR');
      try {
        const j = await savolgaJavob(xodim.id, 'салом ҳорманг');
        return (
          j.niyat === 'yordam' &&
          j.matn.includes('Масалан') &&
          j.matn.includes('<code>') &&
          !j.matn.toLowerCase().includes('тушунмадим') &&
          j.tugmalar.length > 0
        );
      } finally {
        await prisma.user.delete({ where: { id: xodim.id } });
      }
    },
  },

  /* ────────────────────────────────────────────────────────
   *  6. КОД ВА САВОЛ АРАЛАШМАЙДИ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Код шакли саволдан ажратилади',
    tekshir: async () =>
      kodShaklimi('ABCDEF') &&
      kodShaklimi('K7M2PQ') &&
      /* Савол — код эмас */
      !kodShaklimi('Уйшун') &&
      !kodShaklimi('очиқ иш ўринлари') &&
      /* Чалкаштириладиган ҳарфлар кодда йўқ */
      !kodShaklimi('ABCDE0') &&
      !kodShaklimi('ABCDEI'),
  },
  {
    nomi: 'Уланган ходимнинг матни саволга кетади',
    tekshir: async () =>
      WEBHOOK.includes('savolniJavobla(suhbatchi') && WEBHOOK.includes('kodShaklimi(kod)'),
  },

  /* ────────────────────────────────────────────────────────
   *  7. ЖАВОБ БАЗАДАН — МОДЕЛДАН ЭМАС
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Модел ЎЙЛАБ ЧИҚАРАДИ. «Уйшунда 42 та ишсиз бор» деган
     * жавоб чиройли кўринади ва хато бўлиши мумкин — ҳоким
     * уни йиғилишда айтади, ва тизимга бўлган ишонч ўшанда
     * тугайди.
     */
    nomi: 'Савол-жавоб ташқарига сўров юбормайди',
    tekshir: async () =>
      !SAVOL_KODI.includes('fetch(') &&
      !SAVOL_KODI.includes('openai') &&
      !SAVOL_KODI.includes('OPENAI'),
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
