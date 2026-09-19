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
