/**
 * ============================================================
 *  АНКЕТА БУТУНЛИГИ — СИНОВ
 *
 *  Бу файл 2026-йил 19-сентябрда, даладан келган шикоятдан
 *  кейин туғилди:
 *
 *      «Ногиронлиги бўлган шахсни белгиласа охирида
 *       юбориш тугмаси босилмаяпти»
 *
 *  Сабаби: текширув `nogironlikIzoh` деган майдонни ТАЛАБ
 *  қиларди, аммо формада у майдон УМУМАН чизилмасди —
 *  экранда шахслар рўйхати турарди. Ходим рўйхатни
 *  тўлдирарди, «Юбориш» ни босарди, хато эса кўринмайдиган
 *  майдонга ёзиларди. Экранда ҲЕЧ НАРСА ўзгармасди.
 *
 *  Бу — энг ёмон турдаги нуқсон: тизим «ишлаяпти», хато
 *  йўқ, лог тоза. Фақат одам ишини тугата олмайди.
 *
 *  Шунинг учун бу синов ҚОИДАНИ қўриқлайди:
 *
 *      Текширув талаб қилган ҲАР БИР майдон
 *      экранда ҲАМ бўлиши шарт.
 *
 *  Синов кодни ЎҚИЙДИ — яъни келажакда кимдир янги қоида
 *  қўшиб, майдонни чизишни унутса, шу ерда тутилади.
 * ============================================================
 */

import { readFileSync } from 'node:fs';
import { xatlovTekshir, type XatlovRaqamlari } from '../src/lib/xatlov-tekshiruvi';

type Sinov = { nomi: string; tekshir: () => boolean };

const FORMA = readFileSync('src/components/xatlov/qadamlar.tsx', 'utf8');
const FORMA_QADAM = FORMA;
/** Изоҳларсиз код — текширув изоҳдаги сўзни ўқиб алданмасин */
const kodiOl = (m: string) =>
  m
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const FORMA_KODI = kodiOl(readFileSync('src/components/xatlov/xatlov-formasi.tsx', 'utf8'));
const TEKSHIRUV_KODI = kodiOl(readFileSync('src/lib/xatlov-tekshiruvi.ts', 'utf8'));
const ASOS = readFileSync('src/components/xatlov/xatlov-formasi.tsx', 'utf8');
const TEKSHIRUV = readFileSync('src/lib/xatlov-tekshiruvi.ts', 'utf8');

/** Текширув қайси майдонларга хато қўяди */
function talabQilinganlar(): string[] {
  return [...TEKSHIRUV.matchAll(/xato\('([a-zA-Z0-9_]+)'/g)].map((m) => m[1]);
}

/** Формада қайси майдонлар ҳақиқатан чизилади */
function chizilganlar(): Set<string> {
  const t = new Set<string>();
  for (const m of FORMA.matchAll(/yangila\('([a-zA-Z0-9_]+)'/g)) t.add(m[1]);
  for (const m of ASOS.matchAll(/yangila\('([a-zA-Z0-9_]+)'/g)) t.add(m[1]);
  return t;
}

/** Бўш хонадон — ҳар синов ўзига кераклисини қўшади */
const bos = (ozgarish: Partial<XatlovRaqamlari> = {}): XatlovRaqamlari =>
  ({ jamiAzo: 1, ...ozgarish }) as XatlovRaqamlari;

const xatoBor = (d: XatlovRaqamlari, maydon: string) =>
  xatlovTekshir(d).xatolar.some((x) => x.maydon === maydon);

const SINOVLAR: Sinov[] = [
  /* ══ АСОСИЙ ҚОИДА ══ */
  {
    nomi: 'Текширув талаб қилган ҳар бир майдон ЭКРАНДА ҳам бор',
    tekshir: () => {
      const chizilgan = chizilganlar();
      const yoq = talabQilinganlar().filter((m) => !chizilgan.has(m));
      if (yoq.length) {
        console.log(`     кўринмайдиган майдонлар: ${yoq.join(', ')}`);
        console.log('     (булар «юбориш тугмаси ишламайди» деган шикоятга айланади)');
      }
      return yoq.length === 0;
    },
  },

  /* ══ ДАЛАДАН КЕЛГАН АЙНАН ШУ ҲОЛАТ ══ */
  {
    nomi: 'Даладаги ҳолат: ногиронлик «Ҳа», рўйхат бўш — хато КЎРИНАДИГАН майдонда',
    tekshir: () => {
      const d = bos({ nogironlikBor: true, nogironShaxslarSoni: 0 });
      return xatoBor(d, 'nogironShaxslar') && !xatoBor(d, 'nogironlikIzoh');
    },
  },
  {
    nomi: 'Рўйхатга одам қўшилса — хато йўқолади, тугма ишлайди',
    tekshir: () => !xatoBor(bos({ nogironlikBor: true, nogironShaxslarSoni: 1 }), 'nogironShaxslar'),
  },
  {
    nomi: 'Ногиронлик «Йўқ» бўлса — рўйхат сўралмайди',
    tekshir: () =>
      !xatoBor(bos({ nogironlikBor: false, nogironShaxslarSoni: 0 }), 'nogironShaxslar'),
  },

  /* ══ ОЛИБ ТАШЛАНГАН ТАКРОРЛАР ҚАЙТИБ КЕЛМАСИН ══ */
  {
    nomi: 'Хонадон даражасидаги «касб-ҳунар истаги» анкетада йўқ — ишсиз фуқарода сўралади',
    tekshir: () => !FORMA.includes("yangila('kasbHunarIstagi'"),
  },
  {
    nomi: '«Иш турига истак» анкетада йўқ — ишсиз фуқарода сўралади',
    tekshir: () => !FORMA.includes("yangila('ishTuriIstagi'"),
  },
  {
    nomi: '«Зарур кўмак» анкетада йўқ — II бўлимда сўралади',
    tekshir: () => !FORMA.includes("yangila('zarurKomak'"),
  },
  {
    nomi: 'Учта эркин матн ўрнига битта қолди',
    tekshir: () =>
      !FORMA.includes("yangila('boshqaMuammolar'") &&
      !FORMA.includes("yangila('xizmatTosiqlari'") &&
      FORMA.includes("yangila('infratuzilmaIzohi'"),
  },

  /* ══ МАЖБУРИЙ РЎЙХАТ ҲАМ ТОЗА ══ */
  {
    nomi: 'Олиб ташланган савол МАЖБУРИЙ рўйхатда қолмаган',
    tekshir: () => {
      const chizilgan = chizilganlar();
      const majburiy = [...ASOS.matchAll(/\['([a-zA-Z0-9_]+)', '[^']*'\]/g)].map((m) => m[1]);
      const yoq = majburiy.filter((m) => !chizilgan.has(m));
      if (yoq.length) console.log(`     мажбурий, лекин экранда йўқ: ${yoq.join(', ')}`);
      return yoq.length === 0;
    },
  },

  /* ══ ЮБОРИШ ТУГМАСИ ══ */
  {
    nomi: 'Юбориш тугмаси ҲЕЧ ҚАЧОН ўчирилмайди',
    tekshir: () => {
      /*
       * Даладан келган асосий шикоятнинг сабаби шу эди:
       * `disabled={... || hisobot.xatolar.length > 0}`. Хато
       * бўлса тугма жисмонан ўчарди — ходим босади, ҳеч нарса
       * бўлмайди, изоҳ эса саҳифанинг тепасида, телефон
       * экранидан ташқарида.
       */
      const m = ASOS.match(/onClick=\{yakuniyYubor\}\s*\n\s*disabled=\{([^}]*)\}/);
      if (!m) {
        console.log('     юбориш тугмаси топилмади — текширув эскирган');
        return false;
      }
      if (/xatolar/.test(m[1])) {
        console.log(`     тугма ўчирилади: disabled={${m[1]}}`);
        return false;
      }
      return true;
    },
  },
  {
    nomi: 'Босилганда юқорига суради — қизил қути кўринсин',
    tekshir: () => ASOS.includes('window.scrollTo({ top: 0'),
  },
  {
    nomi: 'Тугманинг ЁНИДА нечта хато борлиги ёзилади',
    tekshir: () => ASOS.includes('та катак тўлдирилмаган — босинг'),
  },

  /* ══ МАТН УЗУНЛИГИ: форма ↔ сервер ══ */
  {
    nomi: 'Ҳар матн майдонининг чегараси сервернинг чегарасидан ошмайди',
    tekshir: () => {
      const SXEMA = readFileSync('src/lib/xatlov-sxema.ts', 'utf8');
      const chegara = new Map<string, number>();
      for (const m of SXEMA.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*matn\((\d+)\)/gm))
        chegara.set(m[1], Number(m[2]));
      for (const m of SXEMA.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*z\.string\(\)[^,\n]*?\.max\((\d+)\)/gm))
        chegara.set(m[1], Number(m[2]));

      const yomon: string[] = [];
      for (const blok of FORMA.matchAll(/<MatnMaydoni\b(?:(?!\/>)[\s\S])*?\/>/g)) {
        const b = blok[0];
        const y = b.match(/yangila\('([a-zA-Z0-9_]+)'/);
        if (!y) continue;
        const server = chegara.get(y[1]);
        if (server === undefined) continue;
        const forma = b.match(/maxLength=\{(\d+)\}/);
        const f = forma ? Number(forma[1]) : 1000;
        if (f > server) yomon.push(`${y[1]}: форма ${f} > сервер ${server}`);
      }
      if (yomon.length) for (const v of yomon) console.log(`     ${v}`);
      return yomon.length === 0;
    },
  },

  /* ══ ҚАДАМ КЎРСАТКИЧИ ══ */
  {
    /*
     * Кўрсаткич «тўлдирилмаган» саноғини ЮБОРИШ билан айнан
     * бир хил текширувдан олиши шарт.
     *
     * Бошқа қоида ёзилса, кўрсаткич «ҳаммаси тўлиқ» деб
     * яшил турар, «Юбориш» эса ходимни хато билан
     * қайтарарди — яъни белги ёлғон гапирарди. Бу
     * белгисизликдан ҳам ёмон: ходим унга ишониб,
     * хонадондан чиқиб кетарди.
     */
    nomi: 'Қадам кўрсаткичи ЮБОРИШ билан бир хил текширувдан ўқийди',
    tekshir: () =>
      FORMA_KODI.includes('qadamlarBoyicha(toliqTekshir(h))') &&
      /* Хато қайси қадамда — ўша санов асосида */
      FORMA_KODI.includes('const soni = qadamlarBoyicha(xatolar);'),
  },
  {
    /* Калит → қадам мосламаси БИТТА жойда */
    nomi: 'Калитни қадамга улаш қоидаси битта функцияда',
    tekshir: () =>
      FORMA_KODI.includes('function kalitQadami(kalit: string): number') &&
      FORMA_KODI.includes('const i = kalitQadami(kalit);') &&
      /* Эски нусха қолмаган бўлсин */
      (FORMA_KODI.match(/startsWith\('passivSoni\.'\)/g) ?? []).length === 1 &&
      (FORMA_KODI.match(/startsWith\('ishsiz\.'\)/g) ?? []).length === 1,
  },
  {
    /*
     * Ҳали ОЧИЛМАГАН қадам «тўлдирилмаган» деб
     * белгиланмайди: акс ҳолда анкета бошидан бошлаб
     * саккизта огоҳлантириш билан очиларди ва белги
     * маъносини йўқотарди.
     */
    nomi: 'Фақат кўрилган қадам «тўлдирилмаган» деб белгиланади',
    tekshir: () =>
      FORMA_KODI.includes('const korildi = korilgan.includes(i);') &&
      FORMA_KODI.includes('const qoldi = korildi && qolgan[i] > 0;') &&
      FORMA_KODI.includes('korilgan.some((i) => qolgan[i] > 0)'),
  },
  {
    /*
     * ── ЭНГ МУҲИМИ ──
     *
     * Текширув айблай оладиган ҲАР БИР майдон биror
     * қадамнинг `maydonlar` рўйхатида бўлиши ШАРТ.
     *
     * Бўлмаса `kalitQadami` `-1` қайтаради: хато саноққа
     * кирмайди (кўрсаткич «тўлиқ» деб туради) ва
     * `xatoQadami` ходимни 1-қадамга юборади — у эса ўша
     * ерда ҳеч нарса топа олмайди.
     *
     * Бу айнан 19-сентябрдаги нуқсоннинг акаси: хато бор,
     * аммо у КЎРИНМАЙДИ.
     */
    nomi: 'Айблана оладиган ҳар бир майдон биror қадамга тегишли',
    tekshir: () => {
      /* Қадамлардаги барча майдонлар */
      const qadamMaydonlari = new Set<string>();
      for (const blok of FORMA_QADAM.matchAll(/maydonlar:\s*\[([\s\S]*?)\]/g)) {
        for (const m of blok[1].matchAll(/'([^']+)'/g)) qadamMaydonlari.add(m[1]);
      }

      /* Текширув айблай оладиган майдонлар */
      const ayblanadigan = new Set<string>();
      for (const m of FORMA_KODI.matchAll(/xt\.([a-zA-Z0-9_]+)\s*=/g)) ayblanadigan.add(m[1]);
      for (const m of TEKSHIRUV_KODI.matchAll(/(?:xato|ogoh)\(\s*'([^']+)'/g)) ayblanadigan.add(m[1]);

      /*
       * Префиксли калитлар (`ishsiz.0.fish`, `passivSoni.Tovuq`)
       * `kalitQadami` да алоҳида ишланади — уларнинг ўзаги
       * рўйхатда бор.
       */
      const istisno = new Set(['ishsiz', 'passivSoni']);

      const yoqolgan = [...ayblanadigan].filter(
        (f) => !qadamMaydonlari.has(f) && !istisno.has(f.split('.')[0])
      );
      if (yoqolgan.length) {
        console.log(`     ҳеч бир қадамга кирмайди: ${yoqolgan.join(', ')}`);
      }
      return yoqolgan.length === 0;
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
