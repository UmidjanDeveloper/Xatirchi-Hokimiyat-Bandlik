/**
 * ============================================================
 *  ЭКРАНДАГИ СОНЛАР — СИНОВ
 *
 *  ── Нега алоҳида синов керак бўлди ──
 *
 *  Маҳалла ходимининг панелида «110 та хатлов» деб турарди,
 *  ҳоким панелида эса ўша маҳалла бўйича 134 та. Иккала сон
 *  ҳам бир базадан, фақат бошқача олинган:
 *
 *    · ҳоким панелида — SQL `count()`;
 *    · ходим панелида — саҳифага тушган рўйхатнинг узунлиги,
 *      рўйхат эса `take` билан чекланган.
 *
 *  Ходим уч ой ишлайди, рақам бир жойда тўхтаб қолади — ва у
 *  «тизим менинг ишимни ҳисобламаяпти» деб ўйлайди.
 *
 *  ── Қоида ──
 *
 *  РЎЙХАТ кўрсатиш учун, САНОҚ ҳисоблаш учун. Экранда турган
 *  ҳар бир сон базанинг ўзидан келиши керак — саҳифага тушган
 *  қаторлардан эмас.
 *
 *  Бу синов ўша қоидани ҳар бир саҳифада текширади.
 * ============================================================
 */

import { readFileSync } from 'node:fs';

type Sinov = { nomi: string; tekshir: () => boolean };

const oqi = (yol: string) => readFileSync(yol, 'utf8');

/** Изоҳларсиз код — изоҳдаги мисол қоидани буздирмасин */
function kodiOl(matn: string): string {
  return matn
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const XATLOV = oqi('src/app/(ilova)/xatlov/page.tsx');
const XATLOV_KODI = kodiOl(XATLOV);

/** `take:` ишлатадиган саҳифалар — уларда сон қаердан олинишини текширамиз */
const SAHIFALAR = [
  'src/app/(ilova)/xatlov/page.tsx',
  'src/app/(ilova)/bandlik/page.tsx',
  'src/app/(ilova)/admin/page.tsx',
  'src/app/(ilova)/ish-orinlari/page.tsx',
  'src/app/(ilova)/chora-tadbirlar/page.tsx',
  'src/app/(ilova)/ishsizlar/page.tsx',
  'src/app/(ilova)/xonadonlar/page.tsx',
];

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Ходим панелидаги хатлов сони БАЗАДАН олинади',
    tekshir: () =>
      XATLOV_KODI.includes('prisma.household.aggregate({') &&
      XATLOV_KODI.includes('const yuborilganSoni = sanoq._count;'),
  },
  {
    nomi: 'Қамров кўрсаткичи кесилган рўйхатдан ҳисобланмайди',
    tekshir: () => {
      /*
       * Айнан шу сатр нуқсон эди:
       *   qiymat={`${yuborilgan.length} / ${mahalla.xonadon}`}
       */
      return (
        XATLOV_KODI.includes('${yuborilganSoni} / ${mahalla.xonadon}') &&
        !XATLOV_KODI.includes('${yuborilgan.length} / ${mahalla.xonadon}')
      );
    },
  },
  {
    nomi: 'Аниқланган ишсиз ҳам базадан жамланади',
    tekshir: () =>
      XATLOV_KODI.includes("_sum: { ishsizlarSoni: true }") &&
      XATLOV_KODI.includes('sanoq._sum.ishsizlarSoni') &&
      !XATLOV_KODI.includes('yuborilgan.reduce('),
  },
  {
    nomi: 'Блокларнинг кўрин-кўринмаслиги ҳам тўлиқ сондан ҳал қилинади',
    tekshir: () => {
      /*
       * `yuborilgan.length > 0` шарти ўз-ўзидан хато эмас, аммо
       * кесилган рўйхат тушунчасини саҳифа бўйлаб тарқатади.
       * Ягона манба — `yuborilganSoni`.
       */
      return !/yuborilgan\.length\s*>\s*0/.test(XATLOV_KODI);
    },
  },
  {
    nomi: 'Рўйхат чегараси экранда АЙТИЛАДИ',
    tekshir: () =>
      XATLOV_KODI.includes('royxatToldi') &&
      XATLOV.includes('таси кўрсатилган.') &&
      XATLOV_KODI.includes('RO_YXAT_HAJMI'),
  },
  {
    nomi: 'Чегара сони сеҳрли рақам эмас, номланган доимий',
    tekshir: () =>
      /const RO_YXAT_HAJMI = \d+;/.test(XATLOV_KODI) &&
      XATLOV_KODI.includes('take: RO_YXAT_HAJMI'),
  },
  {
    nomi: 'Ҳар бир саҳифада `take` ва ундан саналадиган сон ёнма-ён эмас',
    tekshir: () => {
      /*
       * Умумий текширув: саҳифада `take:` бўлса, шу сўров
       * натижасининг `.length` и КЎРСАТКИЧ сифатида
       * (`qiymat=` ёки `{...length}` кўринишида) ишлатилмасин.
       *
       * Бу ерда фақат энг хавфли нақш қидирилади: `qiymat=`
       * ичидаги `.length`.
       */
      const ayblilar: string[] = [];
      for (const yol of SAHIFALAR) {
        const kod = kodiOl(oqi(yol));
        if (!kod.includes('take:')) continue;
        if (/qiymat=\{[^}]*\.length/.test(kod)) ayblilar.push(yol);
      }
      if (ayblilar.length) console.log(`     кесилган рўйхатдан сананади: ${ayblilar.join(', ')}`);
      return ayblilar.length === 0;
    },
  },
];

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
