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
import { davrOqi, dinamikaHisobla } from '../src/lib/tahlil';

/** Шу ойдан N ой олдинги сана (ойнинг 15-куни — чегарага тушиб қолмаслиги учун) */
function oyOldin(n: number, kun = 15): Date {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth() - n, kun, 12, 0, 0);
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

  /* ── ДАВР КЕСИМИ: кунлик, ойлик, йиллик ── */
  {
    nomi: 'Кунлик кесим — 30 та нуқта',
    tekshir: () => dinamikaHisobla([], [], [], 'kun').length === 30,
  },
  {
    nomi: 'Ойлик кесим — 12 та нуқта',
    tekshir: () => dinamikaHisobla([], [], [], 'oy').length === 12,
  },
  {
    nomi: 'Йиллик кесим — 5 та нуқта',
    tekshir: () => dinamikaHisobla([], [], [], 'yil').length === 5,
  },
  {
    nomi: 'Давр берилмаса — ойлик (эски чақириқлар бузилмайди)',
    tekshir: () => dinamikaHisobla([], [], []).length === 12,
  },
  {
    /*
     * Энг муҳим синов: БИТТА воқеа учта кесимда ҳам бир марта
     * саналиши керак. Чегара нотўғри қўйилса, у кунлик кесимда
     * икки кунга тушиб қолиши ёки умуман йўқолиши мумкин — ва
     * ҳоким «ойликда 5 та, кунликда 4 та» деб кўрарди.
     */
    nomi: 'Битта воқеа учала кесимда ҳам БИР МАРТА саналади',
    tekshir: () => {
      const b = new Date();
      const sana = [new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12)];
      const jami = (d: ReturnType<typeof dinamikaHisobla>) =>
        d.reduce((s, n) => s + n.yangiXatlov, 0);
      return (
        jami(dinamikaHisobla(sana, [], [], 'kun')) === 1 &&
        jami(dinamikaHisobla(sana, [], [], 'oy')) === 1 &&
        jami(dinamikaHisobla(sana, [], [], 'yil')) === 1
      );
    },
  },
  {
    nomi: 'Кунлик кесимда бугунги воқеа ОХИРГИ нуқтада туради',
    tekshir: () => {
      const b = new Date();
      const sana = [new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12)];
      const d = dinamikaHisobla(sana, [], [], 'kun');
      return d[d.length - 1].yangiXatlov === 1;
    },
  },
  {
    nomi: 'Йиллик кесимда жорий йил ОХИРГИ нуқтада туради',
    tekshir: () => {
      const d = dinamikaHisobla([new Date()], [], [], 'yil');
      return d[d.length - 1].oy === String(new Date().getFullYear());
    },
  },
  {
    /*
     * Кунлик кесимда 30 кундан эски воқеа ОҚИМГА тушмайди,
     * аммо ТЎПЛАНГАН рақамда кўринади — у ҳақиқатан мавжуд.
     */
    nomi: 'Кунликда эски воқеа оқимга тушмайди, тўпланганда кўринади',
    tekshir: () => {
      const d = dinamikaHisobla([oyOldin(3)], [], [], 'kun');
      return d.every((n) => n.yangiXatlov === 0) && d[0].xatlovXonadon === 1;
    },
  },
  {
    nomi: 'Айният ҳар кесимда сақланади: ўзгариш = аниқланган − жойлашган',
    tekshir: () => {
      const a = [oyOldin(0, 5), oyOldin(0, 6)];
      const j = [oyOldin(0, 7)];
      return (['kun', 'oy', 'yil'] as const).every((davr) =>
        dinamikaHisobla([], a, j, davr).every(
          (n) => n.ishsizOzgarishi === n.yangiAniqlangan - n.yangiJoylashgan
        )
      );
    },
  },

  /* ── URL дан келган қиймат ── */
  {
    nomi: 'Нотўғри давр — ойликка тушади, қуламайди',
    tekshir: () =>
      davrOqi('xato') === 'oy' && davrOqi(null) === 'oy' && davrOqi(undefined) === 'oy',
  },
  {
    nomi: 'Тўғри давр ўқилади',
    tekshir: () => davrOqi('kun') === 'kun' && davrOqi('yil') === 'yil' && davrOqi('oy') === 'oy',
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
