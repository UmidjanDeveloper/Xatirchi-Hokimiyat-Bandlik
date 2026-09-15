/**
 * ============================================================
 *  ЎСИШ ВА КАМАЙИШ СУРАТИ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/dinamika-sinov.ts
 *
 *  Нега керак: қутбли диаграммада устун нолдан ЮҚОРИГА ёки
 *  ПАСТГА қараб чиқади, ва ҳоким айнан шу йўналишга қараб
 *  қарор қабул қилади. Ишора тескари бўлиб қолса, диаграмма
 *  барибир тўғри кўринади — рақамлар бор, ранглар жойида,
 *  фақат «яхшиланди» ўрнига «ёмонлашди» деб турибди.
 *
 *  Кўз билан буни топиб бўлмайди. Шунинг учун арифметика
 *  базасиз, ўзи алоҳида синовдан ўтказилади.
 * ============================================================
 */
import { dinamikaHisobla } from '../src/lib/tahlil';

/** Шу ойдан N ой олдинги сана (ойнинг 15-куни — чегарага тушиб қолмаслиги учун) */
function oyOldin(n: number): Date {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth() - n, 15, 12, 0, 0);
}

/** N та бир хил сана */
const takror = (n: number, oy: number): Date[] => Array.from({ length: n }, () => oyOldin(oy));

type Sinov = { nomi: string; tekshir: () => boolean };

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Ўн икки ой қайтарилади',
    tekshir: () => dinamikaHisobla([], [], []).length === 12,
  },
  {
    nomi: 'Бўш маълумотда ҳамма нол — сохта ўсиш чиқмайди',
    tekshir: () =>
      dinamikaHisobla([], [], []).every(
        (n) =>
          n.yangiXatlov === 0 &&
          n.yangiAniqlangan === 0 &&
          n.yangiJoylashgan === 0 &&
          n.ishsizQoldiq === 0 &&
          n.ishsizOzgarishi === 0 &&
          n.ishsizOzgarishFoizi === 0
      ),
  },

  /* ── Оқим: тўпланганнинг айирмаси ── */
  {
    nomi: 'Ойлик оқим — шу ойнинг ЎЗИДА қўшилгани',
    tekshir: () => {
      const d = dinamikaHisobla([...takror(10, 5), ...takror(4, 3)], [], []);
      const besh = d.find((n) => n.oy === kalit(5))!;
      const tort = d.find((n) => n.oy === kalit(4))!;
      const uch = d.find((n) => n.oy === kalit(3))!;
      return besh.yangiXatlov === 10 && tort.yangiXatlov === 0 && uch.yangiXatlov === 4;
    },
  },
  {
    nomi: 'Тўпланган рақам сақланиб қолди (эски чизиқ бузилмаган)',
    tekshir: () => {
      const d = dinamikaHisobla([...takror(10, 5), ...takror(4, 3)], [], []);
      return d[d.length - 1].xatlovXonadon === 14;
    },
  },

  /* ── Қолдиқ ва унинг ўзгариши ── */
  {
    nomi: 'Қолдиқ = аниқланган − жойлашган',
    tekshir: () => {
      const d = dinamikaHisobla([], takror(20, 4), takror(6, 2));
      return d[d.length - 1].ishsizQoldiq === 14;
    },
  },
  {
    nomi: 'Фақат аниқланса — ўсди (МУСБАТ ишора)',
    tekshir: () => {
      const d = dinamikaHisobla([], takror(7, 3), []);
      return d.find((n) => n.oy === kalit(3))!.ishsizOzgarishi === 7;
    },
  },
  {
    nomi: 'Жойлаштириш кўп бўлса — камайди (МАНФИЙ ишора)',
    tekshir: () => {
      // 4 ой олдин 10 та аниқланди, 2 ой олдин 6 таси ишга жойлашди
      const d = dinamikaHisobla([], takror(10, 4), takror(6, 2));
      return d.find((n) => n.oy === kalit(2))!.ishsizOzgarishi === -6;
    },
  },
  {
    nomi: 'Ўзгариш = янги аниқланган − ишга жойлашган (айният ҳар ойда)',
    tekshir: () => {
      const d = dinamikaHisobla(
        [...takror(5, 6), ...takror(9, 2)],
        [...takror(12, 5), ...takror(3, 2), ...takror(8, 1)],
        [...takror(4, 4), ...takror(7, 2), ...takror(2, 1)]
      );
      return d.every((n) => n.ishsizOzgarishi === n.yangiAniqlangan - n.yangiJoylashgan);
    },
  },
  {
    nomi: 'Тенг келса — ўзгармади (нол, бетараф ранг)',
    tekshir: () => {
      const d = dinamikaHisobla([], [...takror(5, 6), ...takror(3, 2)], takror(3, 2));
      return d.find((n) => n.oy === kalit(2))!.ishsizOzgarishi === 0;
    },
  },

  /* ── Фоиз ── */
  {
    nomi: 'Фоиз ўтган ой қолдиғига нисбатан ҳисобланади',
    tekshir: () => {
      // 4 ой олдин 20 та аниқланди; 2 ой олдин 5 таси жойлашди → −25%
      const d = dinamikaHisobla([], takror(20, 4), takror(5, 2));
      const n = d.find((x) => x.oy === kalit(2))!;
      return n.ishsizOzgarishFoizi === -25;
    },
  },
  {
    nomi: 'Базаси нол бўлса фоиз чиқарилмайди (нолга бўлиш йўқ)',
    tekshir: () => {
      const d = dinamikaHisobla([], takror(7, 3), []);
      const n = d.find((x) => x.oy === kalit(3))!;
      return Number.isFinite(n.ishsizOzgarishFoizi) && n.ishsizOzgarishFoizi === 0;
    },
  },
  {
    nomi: 'Фоиз бир хонали касргача яхлитланади',
    tekshir: () => {
      // 5 ой олдин 3 та; 2 ой олдин яна 1 та → 1/3 = +33,3%
      const d = dinamikaHisobla([], [...takror(3, 5), ...takror(1, 2)], []);
      return d.find((x) => x.oy === kalit(2))!.ishsizOzgarishFoizi === 33.3;
    },
  },

  /* ── Чегара ── */
  {
    /*
     * Энг муҳим синов. Илгари оқим икки ойнинг тўпланган
     * рақамини айириш йўли билан олинарди — БИРИНЧИ ойда эса
     * айирадиган нарса йўқ эди, шунинг учун бир йилдан эски
     * бутун тарих ўша ойда содир бўлгандек чиқарди.
     *
     * Диаграммада бу шундай кўринарди: чапдаги биринчи устун
     * баҳайбат, қолган ўн битаси эса унинг ёнида деярли текис.
     * Хато эмас, «шундай экан» деб ўтиб кетиш мумкин эди.
     */
    nomi: 'Бир йилдан эски тарих биринчи ой оқимига қўшилмайди',
    tekshir: () => {
      const d = dinamikaHisobla(takror(20, 20), [], []);
      // Тўпланганда бор — чунки улар ҳақиқатан ҳам мавжуд
      // Оқимда йўқ — чунки улар бу ойларда содир бўлмаган
      return d[0].xatlovXonadon === 20 && d.every((n) => n.yangiXatlov === 0);
    },
  },
  {
    nomi: 'Биринчи ойнинг ЎЗИДА содир бўлгани эса оқимда кўринади',
    tekshir: () => {
      const d = dinamikaHisobla(takror(6, 11), [], []);
      return d[0].yangiXatlov === 6 && d[0].xatlovXonadon === 6;
    },
  },
  {
    nomi: 'Биринчи ойда ҳам айният сақланади (эски тарих аралашмайди)',
    tekshir: () => {
      const d = dinamikaHisobla([], [...takror(30, 20), ...takror(4, 11)], takror(9, 11));
      return (
        d[0].ishsizOzgarishi === 4 - 9 &&
        d[0].ishsizQoldiq === 30 + 4 - 9 &&
        // Фоиз ой БОШИДАГИ қолдиққа (30) нисбатан: −5/30 = −16,7%
        d[0].ishsizOzgarishFoizi === -16.7
      );
    },
  },
];

/** Синов ичида ишлатиладиган ой калити: N ой олдин → '2026-04' */
function kalit(n: number): string {
  const h = new Date();
  const d = new Date(h.getFullYear(), h.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    ok = false;
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
