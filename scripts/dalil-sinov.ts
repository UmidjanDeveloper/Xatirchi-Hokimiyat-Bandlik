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
import { sanaHaqiqiymi, sanaOqi } from '../src/lib/reyestr-fayl';
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
  tekshirishKutayotganlar,
} from '../src/lib/joylashuv-dalili';
import { KUN_MS } from '../src/lib/bandlik-holatlari';
import { tumanHolati } from '../src/lib/tuman-holati';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const YOL = readFileSync('src/app/api/ishsizlar/[id]/dalil/route.ts', 'utf8');
const REYESTR_YOLI = readFileSync('src/app/api/reyestr/route.ts', 'utf8');
const REYESTR_SAHIFASI = readFileSync('src/app/(ilova)/reyestr/page.tsx', 'utf8');

/* ── Синов маълумоти ── */

let mahallaId = '';
let xodimId = '';
/**
 * Далилни ТЕКШИРАДИГАН одам.
 *
 * ── Нега синов уни ўзи яратади ──
 *
 * Қоида: ўзи киритган далилни ўзи тасдиқлай олмайди. Демак
 * синовга ИККИТА одам керак.
 *
 * Аввал иккинчиси базадан изланарди — «BANDLIK_RAHBAR ёки
 * ADMIN, фақат биринчиси эмас». Локал базада бундай одам бор
 * эди, тоза CI базасида эса йўқ: `seed` фақат 70 та МФЙ
 * ходимини яратади.
 *
 * Атроф-муҳитга таянган синов — синов эмас.
 */
let tekshiruvchiId = '';
const tozalanadi: string[] = [];

/** Изоҳларсиз код — изоҳдаги сўз текширувни алдамасин */
const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

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

  const t = await prisma.user.create({
    data: {
      username: `sinov_dalil_tekshiruvchi_${Date.now()}`,
      fullName: 'Sinov Tekshiruvchi',
      passwordHash: 'x',
      rol: 'BANDLIK_RAHBAR',
      faol: true,
    },
    select: { id: true },
  });
  tekshiruvchiId = t.id;
}

/**
 * Синовлар учун СТАНДАРТ туғилган сана.
 *
 * ── Нега керак бўлиб қолди ──
 *
 * Реестр солиштируви энди туғилган санани ҲАР ДОИМ
 * текширади. Икки томонда ҳам сана бўлмаса, натижа «мос»
 * эмас, «текширилсин» бўлади — чунки фақат исм бўйича
 * тасдиқлаш БОШҚА одамнинг ишга жойлашганини бегонага
 * ёзиб қўйиши мумкин.
 *
 * Шунинг учун ёзиш йўлини синайдиган синовлар иккала
 * томонга ҳам ШУ санани беради.
 */
const SINOV_SANASI = new Date(Date.UTC(1990, 4, 12));

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
      tugilganSana: p.tugilganSana === undefined ? SINOV_SANASI : p.tugilganSana,
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
  for (const id of [xodimId, tekshiruvchiId].filter(Boolean)) {
    await prisma.joylashuvDalili.updateMany({
      where: { kiritganId: id },
      data: { kiritganId: null },
    });
    await prisma.joylashuvDalili.updateMany({
      where: { tasdiqlaganId: id },
      data: { tasdiqlaganId: null },
    });
    await prisma.user.delete({ where: { id } }).catch(() => undefined);
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
      /*
       * ── ФАЙЛ ШУ ЕРДА ЯСАЛАДИ ──
       *
       * Аввал бу синов `/tmp/reyestr-sinov.xlsx` ни ўқирди —
       * қўлда ясаб қолдирилган файл. Менинг компьютеримда у
       * бор эди, CI нинг тоза машинасида эса йўқ: синов ўша
       * ерда ENOENT билан йиқиларди, лекин мен «ўтди» деб
       * ҳисобот берардим.
       *
       * Атроф-муҳитга таянган синов — синов эмас. Энди
       * муқова ҳам, жадвал ҳам шу ернинг ўзида ясалади.
       */
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([
        ['ХАТИРЧИ ТУМАНИ БЎЙИЧА МАЪЛУМОТНОМА'],
        ['2026 йил сентябр ҳолатига'],
        [],
        ['№', 'Ф.И.Ш.', 'Туғилган санаси', 'Иш жойи (корхона)'],
        [1, 'Tursunov Tolib Yusupovich', '15.08.1982', ''],
        [2, 'Hakimova Hilola Qodirovna', '12.07.2001', ''],
        [3, 'Hakimova Hilola Soatovna', '03.09.1973', 'ЯНГИ ЙЎЛ МЧЖ'],
        [4, 'Nazarova Nodira Rahimovna', '21.06.1987', ''],
        [5, 'Qodirov Qodir Anvarovich', '09.02.1995', 'ОҚ ОЛТИН МЧЖ'],
        [6, 'Aliyev Anvar Sobirovich', '12.05.1990', ''],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reyestr');
      const b: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

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

      const n = await reyestrniYukla([{ fish, ishJoyi: 'Бирор корхона', tugilganSana: SINOV_SANASI }], {
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
    /*
     * ── БУ СИНОВ ЎЗГАРТИРИЛДИ ──
     *
     * Аввал у «реестр далили ДАРҲОЛ тасдиқланган» деб
     * кутарди — яъни ЭСКИ, хавфли хулқни ёзиб қўйган эди.
     *
     * Тизимга келган нарса давлат манбаи эмас, балки
     * администратор компьютеридаги Excel файл. Энди у
     * `QOLDA_REYESTR` бўлиб ёзилади ва ТЕКШИРУВ навбатига
     * тушади.
     */
    nomi: 'Қўлда юкланган кўчирма АВТОМАТИК тасдиқланмайди',
    tekshir: async () => {
      const fish = noyob('Moskelgan Fuqaro');
      const id = await fuqaroYarat({ fish, ishJoyi: 'Оқ Олтин МЧЖ' });
      const sana = new Date(Date.UTC(2026, 8, 1));

      await reyestrniYukla([{ fish, ishJoyi: 'OQ OLTIN', tugilganSana: SINOV_SANASI }], {
        kiritganId: xodimId,
        reyestrSanasi: sana,
        faylIzi: 'sinov-izi-1',
        manbaTashkilot: 'Синов ташкилоти',
      });

      const d = await prisma.joylashuvDalili.findMany({ where: { ishsizId: id } });
      const t = await odamTasdigi(id);

      return (
        d.length === 1 &&
        d[0].turi === 'REYESTR' &&
        /* ── АСОСИЙ ШАРТ ── */
        d[0].manbaTuri === 'QOLDA_REYESTR' &&
        d[0].holati === 'KIRITILDI' &&
        /* Манба изи сақланади — қайси юклашдан келгани билинади */
        d[0].faylIzi === 'sinov-izi-1' &&
        d[0].manbaTashkilot === 'Синов ташкилоти' &&
        d[0].importId !== null &&
        /* Ҳуқуқий шакл фарқи огоҳлантириш бермайди */
        d[0].izoh === null &&
        /* Ҳисобда ҳали тасдиқланмаган, аммо «кутилмоқда» */
        !t.tasdiqlangan &&
        t.daraja === 'KUTILMOQDA' &&
        !t.sanaladi
      );
    },
  },
  {
    /*
     * Битта юклашдан чиққан барча далилда БИТТА `importId`
     * бўлиши керак: «бу кўчирма нотўғри чиқди» деганда
     * барчасини бирдан топиш учун.
     */
    nomi: 'Битта юклаш — битта белги, барча сатрда бир хил',
    tekshir: async () => {
      const a = noyob('Import Bir');
      const b = noyob('Import Ikki');
      const ida = await fuqaroYarat({ fish: a });
      const idb = await fuqaroYarat({ fish: b });
      const sana = new Date(Date.UTC(2026, 8, 7));

      await reyestrniYukla(
        [
          { fish: a, ishJoyi: 'Корхона А', tugilganSana: SINOV_SANASI },
          { fish: b, ishJoyi: 'Корхона Б', tugilganSana: SINOV_SANASI },
        ],
        { kiritganId: xodimId, reyestrSanasi: sana }
      );

      const d = await prisma.joylashuvDalili.findMany({
        where: { ishsizId: { in: [ida, idb] } },
        select: { importId: true },
      });

      return d.length === 2 && d[0].importId !== null && d[0].importId === d[1].importId;
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

      const n = await reyestrniYukla([{ fish, ishJoyi: 'Янги Йўл МЧЖ', tugilganSana: SINOV_SANASI }], {
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

      await reyestrniYukla([{ fish, tugilganSana: SINOV_SANASI }], { kiritganId: xodimId, reyestrSanasi: sana });
      const ikkinchi = await reyestrniYukla([{ fish, tugilganSana: SINOV_SANASI }], {
        kiritganId: xodimId,
        reyestrSanasi: sana,
      });

      const soni = await prisma.joylashuvDalili.count({ where: { ishsizId: id } });
      return soni === 1 && ikkinchi.takror === 1;
    },
  },
  {
    /*
     * ── ПАРАЛЛЕЛ ЮКЛАШ ──
     *
     * Иккита администратор бир вақтда бир хил кўчирмани юкласа (ёки
     * бир киши тугмани икки марта босса), «аввал бор-йўқлигини сўраш»
     * иккаласига ҲАМ «йўқ» деб жавоб беради. Ягоналик чегараси эса
     * ёзишда ишлайди: фақат биттаси ўтади, иккинчиси «такрор».
     */
    nomi: 'ПАРАЛЛЕЛ юклаш: бир вақтда 5 та бир хил кўчирма — БИТТА далил',
    tekshir: async () => {
      const fish = noyob('Parallel Yuklash');
      const id = await fuqaroYarat({ fish });
      const sana = new Date(Date.UTC(2026, 8, 20));

      const natijalar = await Promise.all(
        Array.from({ length: 5 }, () =>
          reyestrniYukla([{ fish, tugilganSana: SINOV_SANASI }], { kiritganId: xodimId, reyestrSanasi: sana })
        )
      );

      const soni = await prisma.joylashuvDalili.count({ where: { ishsizId: id } });
      const yozilgan = natijalar.reduce((s, n) => s + (n.mos.length - n.takror), 0);
      if (soni !== 1 || yozilgan !== 1) console.log('     bazada:', soni, 'yozilgan deb hisoblangan:', yozilgan);
      return soni === 1 && yozilgan === 1;
    },
  },
  {
    nomi: 'Бошқа сана — янги далил ёзилади',
    tekshir: async () => {
      const fish = noyob('Ikkinchi Oy');
      const id = await fuqaroYarat({ fish });

      await reyestrniYukla([{ fish, tugilganSana: SINOV_SANASI }], {
        kiritganId: xodimId,
        reyestrSanasi: new Date(Date.UTC(2026, 7, 1)),
      });
      await reyestrniYukla([{ fish, tugilganSana: SINOV_SANASI }], {
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

      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });
      return (await odamTasdigi(id)).tasdiqlangan;
    },
  },
  {
    /*
     * ── БУ СИНОВ ЎЗГАРТИРИЛДИ ──
     *
     * Аввал у йўлда `tasdiqlangan: false` ёзилганини
     * текширарди. Ўша параметр БУТУНЛАЙ олиб ташланди:
     * тасдиқлаш қарорини чақирувчи бермайди, у манбадан
     * келиб чиқади.
     *
     * Энди текширилади: йўл манбани ФАҚАТ қўлда киритилган
     * тур сифатида юборади ва `RASMIY_INTEGRATSIYA` ни
     * ҳеч қаерда ёзмайди.
     */
    nomi: 'Ўзи киритган далилни ўзи тасдиқлай олмаслиги ЙЎЛДА текширилади',
    tekshir: async () =>
      YOL.includes('dalil.kiritganId === q.sessiya.userId') &&
      /* Манба қўлда — йўл «расмий» деб юбора олмайди */
      YOL.includes("'XODIM_BILDIRDI'") &&
      YOL.includes("'QOLDA_HUJJAT'") &&
      !YOL.includes('RASMIY_INTEGRATSIYA') &&
      /* Эски, хавфли параметр умуман йўқ */
      !YOL.includes('tasdiqlangan:') &&
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
  /* ────────────────────────────────────────────────────────
   *  8. ТЕКШИРИШ НАВБАТИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * ── НЕГА АЛОҲИДА РЎЙХАТ КЕРАК ──
     *
     * Маҳалла ходими шартнома нусхасини киритади ва у
     * «текширилмаган» бўлиб туради. Мутахассис уни ФАҚАТ
     * ўша фуқаронинг саҳифасини очганда кўрарди — яъни
     * тасодифан.
     *
     * Ҳужжат келган-у, ҳеч ким қарамаган ҳолат энг
     * ачинарлиси: иш бажарилган, рақам эса ҳамон
     * «тасдиқланмаган» бўлиб турибди.
     */
    nomi: 'Киритилган ҳужжат ТЕКШИРИШ навбатига тушади',
    tekshir: async () => {
      const fish = noyob('Navbatga Tushadi');
      const id = await fuqaroYarat({ fish });

      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'SHARTNOMA',
        kiritganId: xodimId,
        izoh: '12-сон шартнома',
      });

      const navbat = await tekshirishKutayotganlar(200);
      const meniki = navbat.find((n) => n.dalilId === d.id);

      return (
        Boolean(meniki) &&
        meniki!.fish === fish &&
        meniki!.turi === 'SHARTNOMA' &&
        meniki!.izoh === '12-сон шартнома' &&
        /* Ким киритгани ҳам кўринади — ўзиники тасдиқламасин */
        meniki!.kiritganId === xodimId
      );
    },
  },
  {
    nomi: 'Тасдиқлангач навбатдан ЧИҚАДИ',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Navbatdan Chiqadi') });
      const d = await dalilQoshish({ ishsizId: id, turi: 'BUYRUQ', kiritganId: xodimId });

      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });

      const navbat = await tekshirishKutayotganlar(200);
      return !navbat.some((n) => n.dalilId === d.id);
    },
  },
  {
    nomi: 'Навбат саҳифада кўрсатилади',
    tekshir: async () =>
      REYESTR_SAHIFASI.includes('tekshirishKutayotganlar') &&
      REYESTR_SAHIFASI.includes('Текшириш кутаётган ҳужжатлар'),
  },
  // ═══════════════════════════════════════════════════════════
  //  САНА: ЁКИ ТЎҒРИ, ЁКИ ХАТО — «ЯҚИН ҚИЙМАТ» ЙЎҚ
  //
  //  `new Date(Date.UTC(2000, 1, 31))` хато бермайди:
  //  JavaScript «31 феврал» ни ЖИМГИНА 2 мартга суриб
  //  қўяди. Реестрдаги терилиш хатоси базага БОШҚА сана
  //  бўлиб тушарди, кейин эса ўша сана бўйича одам
  //  топилмасди.
  // ═══════════════════════════════════════════════════════════
  {
    nomi: '31.02.2000 РАД ЭТИЛАДИ — мартга сурилмайди',
    tekshir: async () => sanaOqi('31.02.2000') === null,
  },
  {
    nomi: '29.02.2000 қабул қилинади — кабиса йили',
    tekshir: async () => sanaOqi('29.02.2000')?.toISOString().slice(0, 10) === '2000-02-29',
  },
  {
    nomi: '29.02.2001 рад этилади — кабиса йили ЭМАС',
    tekshir: async () => sanaOqi('29.02.2001') === null,
  },
  {
    nomi: '13-ой ва 32-кун рад этилади',
    tekshir: async () => sanaOqi('01.13.1990') === null && sanaOqi('32.01.1990') === null,
  },
  {
    nomi: 'Оддий сана иккала шаклда ҳам тўғри ўқилади',
    tekshir: async () =>
      sanaOqi('12.05.1990')?.toISOString().slice(0, 10) === '1990-05-12' &&
      sanaOqi('1990-05-12')?.toISOString().slice(0, 10) === '1990-05-12',
  },
  {
    nomi: 'Сана UTC да ясалади — вақт минтақаси силжитмайди',
    tekshir: async () => {
      const d = sanaOqi('01.01.1990');
      return d?.getUTCFullYear() === 1990 && d.getUTCMonth() === 0 && d.getUTCDate() === 1;
    },
  },
  {
    nomi: 'Маъносиз Excel рақами рад этилади',
    tekshir: async () => sanaOqi(-5) === null && sanaOqi(9_999_999) === null,
  },
  {
    nomi: '`sanaHaqiqiymi` кун, ой ва йилни алоҳида текширади',
    tekshir: async () =>
      sanaHaqiqiymi(29, 2, 2000) &&
      !sanaHaqiqiymi(29, 2, 2001) &&
      !sanaHaqiqiymi(31, 4, 2000) &&
      sanaHaqiqiymi(30, 4, 2000),
  },

  // ═══════════════════════════════════════════════════════════
  //  ТУҒИЛГАН САНА ҲАР ДОИМ СОЛИШТИРИЛАДИ
  //
  //  Аввал сана ФАҚАТ бир нечта номзод топилганда
  //  ишлатиларди. Битта номзод бўлса, сана фарқи умуман
  //  кўрилмасди:
  //
  //    тизимда:  Али Валиев, 01.01.1990
  //    реестрда: Али Валиев, 02.02.2000
  //
  //  — булар «мос» деб топилар ва БОШҚА одамнинг ишга
  //  жойлашгани биринчисига ёзиб қўйиларди.
  // ═══════════════════════════════════════════════════════════
  {
    nomi: 'Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ',
    tekshir: async () => {
      const ism = noyob('Reyestr Bir');
      const odam = await prisma.unemployedPerson.create({
        data: {
          mahallaId,
          fish: ism,
          jinsi: 'Erkak',
          tugilganSana: new Date(Date.UTC(1990, 0, 1)),
          holati: 'JOYLASHTIRILDI',
          ishJoyi: 'Ok Oltin MCHJ',
        },
        select: { id: true },
      });
      tozalanadi.push(odam.id);

      const n = await reyestrniSolishtir(
        [{ fish: ism, ishJoyi: 'Ok Oltin MCHJ', tugilganSana: new Date(Date.UTC(2000, 1, 2)) }],
        mahallaId
      );

      return (
        n.mos.length === 0 &&
        n.tekshirilsin.length === 1 &&
        n.tekshirilsin[0].sabab === 'sana-qarama-qarshi' &&
        n.tekshirilsin[0].tizimSanasi === '1990-01-01' &&
        n.tekshirilsin[0].reyestrSanasi === '2000-02-02'
      );
    },
  },
  {
    nomi: 'Бир хил туғилган сана — мос деб топилади',
    tekshir: async () => {
      const ism = noyob('Reyestr Ikki');
      const odam = await prisma.unemployedPerson.create({
        data: {
          mahallaId,
          fish: ism,
          jinsi: 'Erkak',
          tugilganSana: new Date(Date.UTC(1990, 0, 1)),
          holati: 'JOYLASHTIRILDI',
          ishJoyi: 'Ok Oltin MCHJ',
        },
        select: { id: true },
      });
      tozalanadi.push(odam.id);

      const n = await reyestrniSolishtir(
        [{ fish: ism, ishJoyi: 'Ok Oltin MCHJ', tugilganSana: new Date(Date.UTC(1990, 0, 1)) }],
        mahallaId
      );
      return n.mos.length === 1 && n.tekshirilsin.length === 0;
    },
  },
  {
    nomi: 'Сана ЕТИШМАСА — алоҳида гуруҳ, автоматик тасдиқланмайди',
    tekshir: async () => {
      const ism = noyob('Reyestr Uch');
      const odam = await prisma.unemployedPerson.create({
        data: {
          mahallaId,
          fish: ism,
          jinsi: 'Erkak',
          tugilganSana: null,
          holati: 'JOYLASHTIRILDI',
          ishJoyi: 'Ok Oltin MCHJ',
        },
        select: { id: true },
      });
      tozalanadi.push(odam.id);

      const n = await reyestrniSolishtir(
        [{ fish: ism, ishJoyi: 'Ok Oltin MCHJ', tugilganSana: new Date(Date.UTC(1990, 0, 1)) }],
        mahallaId
      );
      return (
        n.mos.length === 0 &&
        n.tekshirilsin.length === 1 &&
        n.tekshirilsin[0].sabab === 'sana-yetishmaydi'
      );
    },
  },
  {
    nomi: 'Файл ичидаги ТАКРОР сатр иккита далил ясамайди',
    tekshir: async () => {
      const k = kodiOl(readFileSync('src/lib/reyestr-import.ts', 'utf8'));
      return k.includes('borlarToplami.add(m.ishsizId);') && k.includes("e.code === 'P2002'");
    },
  },
  {
    nomi: 'Базада ҳам ягоналик чегараси бор',
    tekshir: async () => {
      const sxema = readFileSync('prisma/schema.prisma', 'utf8');
      return sxema.includes('@@unique([ishsizId, turi, reyestrSanasi], name: "dalil_takrori")');
    },
  },
  {
    nomi: 'Миграция ҲЕЧ НАРСА ЎЧИРМАЙДИ — хатлов кетмоқда',
    tekshir: async () => {
      const m = readFileSync(
        'prisma/migrations/20260930140000_dalil_takrori/migration.sql',
        'utf8'
      );
      return !/\bDELETE\b/i.test(m) && m.includes('RAISE NOTICE');
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
