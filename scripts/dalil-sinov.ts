/**
 * ============================================================
 *  ЖОЙЛАШТИРИШНИ ТАСДИҚЛАШ — СИНОВ
 *
 *  Ишга тушириш:  npx tsx scripts/dalil-sinov.ts
 *
 *  ── Бу ерда хато нимага олиб келади ──
 *
 *  Солиштириш Ф.И.Ш. бўйича кетади. Хато мослик — «далил»
 *  ёзилиб, аслида бошқа одамникилиги — энг ёмон ҳолат: рақам
 *  ТЎҒРИ кўринади, аслида эса ёлғон.
 *
 *  Далилсиз рақам ҳеч бўлмаганда «текширилмаган» деб туради.
 *  Ёлғон далил эса текширувнинг ўзини бекор қилади.
 *
 *  Шунинг учун синовларнинг ярми — МОСЛИК ҚИЛМАСЛИК ҳақида.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { reyestrniOqi } from '../src/lib/reyestr-fayl';
import {
  ismKaliti,
  ishJoyiKaliti,
  reyestrniSolishtir,
  reyestrniYukla,
} from '../src/lib/reyestr-import';
import {
  DALIL_MUDDATI_KUN,
  dalilQoshish,
  dalilniHalQil,
  odamTasdigi,
  tasdiqHisobi,
} from '../src/lib/joylashuv-dalili';
import { KUN_MS } from '../src/lib/bandlik-holatlari';
import { tumanHolati } from '../src/lib/tuman-holati';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const YOL = readFileSync('src/app/api/ishsizlar/[id]/dalil/route.ts', 'utf8');
const REYESTR_YOLI = readFileSync('src/app/api/reyestr/route.ts', 'utf8');

/* ── Синов маълумоти ── */

let mahallaId = '';
let xodimId = '';
const tozalanadi: string[] = [];

async function tayyorla() {
  const m = await prisma.mahalla.findFirst({ select: { id: true } });
  mahallaId = m!.id;
  const x = await prisma.user.create({
    data: {
      username: `sinov_dalil_${Date.now()}`,
      fullName: 'Sinov Mutaxassis',
      passwordHash: 'x',
      rol: 'BANDLIK',
      mahallaId,
    },
    select: { id: true },
  });
  xodimId = x.id;
}

async function fuqaroYarat(p: {
  fish: string;
  holati?: 'ANIQLANDI' | 'JOYLASHTIRILDI';
  ishJoyi?: string | null;
  tugilganSana?: Date | null;
  ishgaKirganSana?: Date | null;
}) {
  const f = await prisma.unemployedPerson.create({
    data: {
      fish: p.fish,
      jinsi: 'ERKAK',
      mahallaId,
      holati: p.holati ?? 'JOYLASHTIRILDI',
      ishJoyi: p.ishJoyi ?? null,
      tugilganSana: p.tugilganSana ?? null,
      ishgaKirganSana: p.ishgaKirganSana ?? null,
    },
    select: { id: true },
  });
  tozalanadi.push(f.id);
  return f.id;
}

async function tozala() {
  if (tozalanadi.length > 0) {
    await prisma.joylashuvDalili.deleteMany({ where: { ishsizId: { in: tozalanadi } } });
    await prisma.unemployedPerson.deleteMany({ where: { id: { in: tozalanadi } } });
    tozalanadi.length = 0;
  }
  if (xodimId) {
    await prisma.joylashuvDalili.updateMany({
      where: { kiritganId: xodimId },
      data: { kiritganId: null },
    });
    await prisma.user.delete({ where: { id: xodimId } }).catch(() => undefined);
  }
}

/** Ноёб исм — базадаги ҳақиқий одамлар билан тўқнашмасин */
const noyob = (asos: string) => `${asos} Sinov${Date.now() % 100000}${Math.floor(Math.random() * 999)}`;

const SINOVLAR: Sinov[] = [
  /* ────────────────────────────────────────────────────────
   *  1. ФАЙЛНИ ЎҚИШ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Расмий кўчирманинг тепасида муқова бўлади: идора номи,
     * санаси, «маълумотнома» деган сарлавҳа. Жадвалнинг ўз
     * сарлавҳаси учинчи-тўртинчи сатрда туради.
     */
    nomi: 'Сарлавҳа муқова остидан топилади',
    tekshir: async () => {
      const b = readFileSync('/tmp/reyestr-sinov.xlsx');
      const o = reyestrniOqi(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
      return o.ok && o.satrlar.length === 6 && o.ustunlar.ism.includes('Ф.И.Ш');
    },
  },
  {
    /*
     * Устунни РАҚАМИ бўйича олиш («иккинчи устун — исм») бир
     * марта ишларди ва иккинчи файлда жимгина нотўғри
     * ишларди: исм ўрнига бошқа устун ўқилиб, ҳеч ким
     * топилмасди — ва бу «реестрда ҳеч ким йўқ экан» деб
     * ўқиларди.
     */
    nomi: 'Устун тартиби ўзгарса ҳам топилади',
    tekshir: async () => {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([
        ['Корхона номи', 'Ходим', 'Туғилган сана'],
        ['Оқ Олтин', 'Aliyev Anvar Sobirovich', '12.05.1990'],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'R');
      const bayt = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

      const o = reyestrniOqi(bayt);
      return (
        o.ok &&
        o.satrlar.length === 1 &&
        o.satrlar[0].fish === 'Aliyev Anvar Sobirovich' &&
        o.satrlar[0].ishJoyi === 'Оқ Олтин' &&
        o.satrlar[0].tugilganSana?.getUTCFullYear() === 1990
      );
    },
  },
  {
    /*
     * Устун топилмаса, файл РАД ЭТИЛАДИ. Жим ишлаш ўрнига
     * очиқ хато: нотўғри устун ўқилса, натижа «ҳеч ким
     * топилмади» бўлади ва буни ҳеч ким сезмайди.
     */
    nomi: 'Ф.И.Ш. устуни топилмаса, файл рад этилади',
    tekshir: async () => {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([['А', 'Б'], [1, 2]]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'R');
      const o = reyestrniOqi(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
      return !o.ok && o.sabab.includes('Ф.И.Ш');
    },
  },

  /* ────────────────────────────────────────────────────────
   *  2. ИСМ КАЛИТИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Реестрда «Алиев Анвар Собирович», анкетада «Анвар
     * Алиев Собирович» бўлиши мумкин. Тартиб ҳар хил,
     * сўзлар эса бир хил.
     */
    nomi: 'Сўз тартиби ва алифбо калитга таъсир қилмайди',
    tekshir: async () =>
      ismKaliti('Алиев Анвар Собирович') === ismKaliti('Анвар Собирович Алиев') &&
      ismKaliti('Алиев Анвар') === ismKaliti('Aliyev Anvar') &&
      ismKaliti("Bog'chayev Anvar") === ismKaliti('Боғчаев Анвар'),
  },
  {
    nomi: 'Ҳуқуқий шакл иш жойи фарқи деб саналмайди',
    tekshir: async () =>
      ishJoyiKaliti('Оқ Олтин МЧЖ') === ishJoyiKaliti('OQ OLTIN') &&
      ishJoyiKaliti('«Янги йўл» ООО') === ishJoyiKaliti('Yangi yol') &&
      ishJoyiKaliti(null) === '',
  },

  /* ────────────────────────────────────────────────────────
   *  3. МОСЛИК ҚИЛМАСЛИК
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * ── ЭНГ МУҲИМ СИНОВ ──
     *
     * Иккита бир хил исмли фуқаро бўлса, ҲЕЧ БИРИ
     * танланмайди. Тахмин билан биттасига далил ёзиш —
     * рақамни тўғри кўрсатиб, аслида ёлғон қилиш.
     */
    nomi: 'Бир хил исмли иккита фуқаро — ҳеч бири танланмайди',
    tekshir: async () => {
      const fish = noyob('Takrorov Takror');
      await fuqaroYarat({ fish });
      await fuqaroYarat({ fish });

      const n = await reyestrniSolishtir([{ fish }]);
      return (
        n.mos.length === 0 &&
        n.shubhali.length === 1 &&
        n.shubhali[0].nomzodlar === 2 &&
        n.topilmadi.length === 0
      );
    },
  },
  {
    nomi: 'Туғилган сана шубҳани ечади',
    tekshir: async () => {
      const fish = noyob('Sanali Sanali');
      const a = new Date(Date.UTC(1990, 4, 12));
      const b = new Date(Date.UTC(1985, 0, 3));
      const birinchi = await fuqaroYarat({ fish, tugilganSana: a });
      await fuqaroYarat({ fish, tugilganSana: b });

      const n = await reyestrniSolishtir([{ fish, tugilganSana: a }]);
      return n.mos.length === 1 && n.mos[0].ishsizId === birinchi && n.shubhali.length === 0;
    },
  },
  {
    /*
     * Реестрда бор, тизимда эса «иш кутяпти» деб турган одам.
     *
     * Ҳолат ЎЗГАРТИРИЛМАЙДИ. Файлдан туриб фуқаронинг
     * ҳолатини жимгина ўзгартириш — айнан тизимга ишончни
     * йўқотадиган нарса.
     */
    nomi: 'Жойлашмаган одамнинг ҲОЛАТИ ўзгартирилмайди',
    tekshir: async () => {
      const fish = noyob('Kutayotgan Fuqaro');
      const id = await fuqaroYarat({ fish, holati: 'ANIQLANDI' });

      const n = await reyestrniYukla([{ fish, ishJoyi: 'Бирор корхона' }], {
        kiritganId: xodimId,
        reyestrSanasi: new Date(),
      });

      const keyin = await prisma.unemployedPerson.findUnique({
        where: { id },
        select: { holati: true },
      });
      const dalil = await prisma.joylashuvDalili.count({ where: { ishsizId: id } });

      return (
        n.yangiTopilgan.length === 1 &&
        n.yangiTopilgan[0].ishsizId === id &&
        n.mos.length === 0 &&
        keyin?.holati === 'ANIQLANDI' &&
        /* Далил ҳам ёзилмайди — фақат хабар берилади */
        dalil === 0
      );
    },
  },

  /* ────────────────────────────────────────────────────────
   *  4. ЁЗИШ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Мос келганга реестр далили ёзилади ва у ТАСДИҚЛАНГАН',
    tekshir: async () => {
      const fish = noyob('Moskelgan Fuqaro');
      const id = await fuqaroYarat({ fish, ishJoyi: 'Оқ Олтин МЧЖ' });
      const sana = new Date(Date.UTC(2026, 8, 1));

      await reyestrniYukla([{ fish, ishJoyi: 'OQ OLTIN' }], {
        kiritganId: xodimId,
        reyestrSanasi: sana,
      });

      const d = await prisma.joylashuvDalili.findMany({ where: { ishsizId: id } });
      const t = await odamTasdigi(id);

      return (
        d.length === 1 &&
        d[0].turi === 'REYESTR' &&
        d[0].holati === 'TASDIQLANDI' &&
        /* Ҳуқуқий шакл фарқи огоҳлантириш бермайди */
        d[0].izoh === null &&
        t.tasdiqlangan &&
        t.engKuchli === 'REYESTR'
      );
    },
  },
  {
    /*
     * Тизимда «Оқ Олтин», реестрда бошқа корхона чиқса — бу
     * хато эмас, ҲОДИСА: фуқаро бошқа жойга ишга кирган ва
     * буни ҳеч ким ёзмаган.
     */
    nomi: 'Иш жойи фарқи далилда ЁЗИБ қўйилади',
    tekshir: async () => {
      const fish = noyob('Farqli Fuqaro');
      const id = await fuqaroYarat({ fish, ishJoyi: 'Оқ Олтин МЧЖ' });

      const n = await reyestrniYukla([{ fish, ishJoyi: 'Янги Йўл МЧЖ' }], {
        kiritganId: xodimId,
        reyestrSanasi: new Date(),
      });

      const d = await prisma.joylashuvDalili.findFirst({ where: { ishsizId: id } });
      return (
        n.mos.length === 1 &&
        n.mos[0].boshqaIshJoyi &&
        Boolean(d?.izoh?.includes('Янги Йўл')) &&
        Boolean(d?.izoh?.includes('Оқ Олтин'))
      );
    },
  },
  {
    /*
     * Бир хил кўчирма икки марта юкланиши оддий ҳол:
     * администратор «ўтдими-йўқми» деб иккинчи марта босади.
     */
    nomi: 'Ўша сана билан такрор юклаш нусха ясамайди',
    tekshir: async () => {
      const fish = noyob('Takror Yuklash');
      const id = await fuqaroYarat({ fish });
      const sana = new Date(Date.UTC(2026, 8, 15));

      await reyestrniYukla([{ fish }], { kiritganId: xodimId, reyestrSanasi: sana });
      const ikkinchi = await reyestrniYukla([{ fish }], {
        kiritganId: xodimId,
        reyestrSanasi: sana,
      });

      const soni = await prisma.joylashuvDalili.count({ where: { ishsizId: id } });
      return soni === 1 && ikkinchi.takror === 1;
    },
  },
  {
    nomi: 'Бошқа сана — янги далил ёзилади',
    tekshir: async () => {
      const fish = noyob('Ikkinchi Oy');
      const id = await fuqaroYarat({ fish });

      await reyestrniYukla([{ fish }], {
        kiritganId: xodimId,
        reyestrSanasi: new Date(Date.UTC(2026, 7, 1)),
      });
      await reyestrniYukla([{ fish }], {
        kiritganId: xodimId,
        reyestrSanasi: new Date(Date.UTC(2026, 8, 1)),
      });

      return (await prisma.joylashuvDalili.count({ where: { ishsizId: id } })) === 2;
    },
  },

  /* ────────────────────────────────────────────────────────
   *  5. ҚЎЛДА КИРИТИЛГАН ДАЛИЛ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Ўзи ёзиб, ўзи тасдиқласа, текширувнинг маъноси
     * қолмайди: рақам яна битта босиш билан ошаверарди.
     */
    nomi: 'Қўлда киритилган далил ДАРҲОЛ тасдиқланмайди',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Qolda Kiritildi') });

      await dalilQoshish({
        ishsizId: id,
        turi: 'SHARTNOMA',
        kiritganId: xodimId,
        izoh: '12-сон шартнома',
      });

      const t = await odamTasdigi(id);
      return t.dalilBor && !t.tasdiqlangan;
    },
  },
  {
    nomi: 'Бошқа одам тасдиқласа — ҳисобга ўтади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Tasdiqlandi Keyin') });
      const d = await dalilQoshish({ ishsizId: id, turi: 'BUYRUQ', kiritganId: xodimId });

      const boshqa = await prisma.user.findFirst({
        where: { rol: { in: ['BANDLIK_RAHBAR', 'ADMIN'] }, id: { not: xodimId } },
        select: { id: true },
      });
      if (!boshqa) return false;

      await dalilniHalQil({ dalilId: d.id, userId: boshqa.id, tasdiqlandi: true });
      return (await odamTasdigi(id)).tasdiqlangan;
    },
  },
  {
    nomi: 'Ўзи киритган далилни ўзи тасдиқлай олмаслиги ЙЎЛДА текширилади',
    tekshir: async () =>
      YOL.includes('dalil.kiritganId === q.sessiya.userId') &&
      YOL.includes('tasdiqlangan: false') &&
      /* Маҳалла ходими тасдиқлашга умуман кира олмайди */
      YOL.includes("talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'])"),
  },

  /* ────────────────────────────────────────────────────────
   *  6. МУДДАТ ВА ЖАМЛАНМА
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Муддат ишга кирган санадан ҳисобланади',
    tekshir: async () => {
      const eski = new Date(Date.now() - (DALIL_MUDDATI_KUN + 5) * KUN_MS);
      const yangi = new Date(Date.now() - 2 * KUN_MS);

      const a = await fuqaroYarat({ fish: noyob('Eski Joylashuv'), ishgaKirganSana: eski });
      const b = await fuqaroYarat({ fish: noyob('Yangi Joylashuv'), ishgaKirganSana: yangi });

      const ta = await odamTasdigi(a);
      const tb = await odamTasdigi(b);
      return ta.muddatiOtgan && !tb.muddatiOtgan && tb.muddat !== null;
    },
  },
  {
    nomi: 'Жойлашмаган одамда муддат умуман йўқ',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Hali Kutmoqda'), holati: 'ANIQLANDI' });
      const t = await odamTasdigi(id);
      return t.muddat === null && !t.muddatiOtgan;
    },
  },
  {
    /*
     * Панел, брифинг, табло ва бот — ҳаммаси ЎША рақамни
     * кўрсатиши керак. Битта манба буни кафолатлайди.
     */
    nomi: 'Жамланма туман ҳолати билан бир хил',
    tekshir: async () => {
      const [h, t] = await Promise.all([tasdiqHisobi(), tumanHolati()]);
      return (
        t.tasdiqlanganJoylashuv === h.tasdiqlangan &&
        t.dalilsizJoylashuv === h.muddatiOtgan &&
        t.joylashtirilgan === h.davoQilingan
      );
    },
  },
  {
    nomi: 'Тасдиқ фоизи 0 ва 100 оралиғидан чиқмайди',
    tekshir: async () => {
      const h = await tasdiqHisobi();
      return (
        h.tasdiqFoizi >= 0 &&
        h.tasdiqFoizi <= 100 &&
        h.tasdiqlangan <= h.davoQilingan &&
        h.reyestrBilan <= h.tasdiqlangan
      );
    },
  },

  /* ────────────────────────────────────────────────────────
   *  7. ҲУҚУҚ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Кўчирмада бутун туман бўйича бегона фуқароларнинг исми
     * бор — маҳалла ходимига очиқ бўлмаслиги керак.
     */
    nomi: 'Реестрни фақат раҳбар ва администратор юклайди',
    tekshir: async () => REYESTR_YOLI.includes("talabQil(['ADMIN', 'BANDLIK_RAHBAR'])"),
  },
  {
    nomi: 'Маҳалла ходими фақат ЎЗ МФЙ сига далил қўшади',
    tekshir: async () =>
      YOL.includes("q.sessiya.rol === 'YETTILIK'") &&
      YOL.includes('xodim.mahallaId !== odam.mahallaId'),
  },
  {
    /*
     * Биринчи сўров ҲЕЧ НАРСА ёзмайди: администратор
     * натижани аввал КЎРАДИ.
     */
    nomi: 'Юклаш икки қадам: аввал кўриш, кейин ёзиш',
    tekshir: async () =>
      REYESTR_YOLI.includes("forma.get('yoz') === '1'") &&
      REYESTR_YOLI.includes('reyestrniSolishtir(oqildi.satrlar)'),
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
