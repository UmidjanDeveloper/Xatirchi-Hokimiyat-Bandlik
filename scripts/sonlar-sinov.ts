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

/**
 * «Хатловда топилган ишсиз» ни ҳисоблайдиган ҲАР БИР сўров.
 *
 * Бу сон иккита жойда ҳисобланади — панел учун (`tahlil.ts`) ва
 * ҳисобот учун (`fuqaro-profili.ts`). Иккови БИР ХИЛ жавоб
 * бериши шарт, акс ҳолда битта ҳужжатда муқовада 134, бўлимда
 * 136 туради ва ҳоким ҳақли равишда «рақамлар хато» дейди.
 * Бир марта айнан шундай бўлган.
 *
 * Фарқнинг сабаби ҚОРАЛАМА хонадонлар эди: тугатилмаган анкета.
 * Ундаги «нечта ишсиз бор» жавоби ҳали тасдиқланмаган.
 */
function topilganSorovlari(): { fayl: string; qator: number; qoralamasiz: boolean }[] {
  const FAYLLAR = ['src/lib/tahlil.ts', 'src/lib/hisobot/fuqaro-profili.ts'];
  const natija: { fayl: string; qator: number; qoralamasiz: boolean }[] = [];

  for (const fayl of FAYLLAR) {
    const qatorlar = readFileSync(fayl, 'utf8').split('\n');
    qatorlar.forEach((qator, i) => {
      if (!qator.includes('_sum: { ishsizlarSoni: true }')) return;
      /*
       * Сўровнинг `where` и юқорида, лекин орада узун изоҳ
       * бўлиши мумкин — шунинг учун 40 қатор орқага қаралади.
       */
      const atrof = qatorlar.slice(Math.max(0, i - 40), i).join('\n');
      natija.push({ fayl, qator: i + 1, qoralamasiz: atrof.includes("QORALAMA") });
    });
  }
  return natija;
}

const SINOVLAR: Sinov[] = [
  {
    nomi: '«Хатловда топилган» сўровлари ТОПИЛДИ',
    tekshir: () => topilganSorovlari().length >= 2,
  },
  {
    nomi: 'Ҳар бири ҚОРАЛАМА хонадонларни чиқаради',
    tekshir: () => {
      const yomon = topilganSorovlari().filter((x) => !x.qoralamasiz);
      for (const y of yomon) console.log(`     qoralama chiqarilmagan: ${y.fayl}:${y.qator}`);
      return yomon.length === 0;
    },
  },
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
