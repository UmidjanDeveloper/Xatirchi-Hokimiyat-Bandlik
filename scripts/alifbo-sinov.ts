/**
 * ============================================================
 *  ТРАНСЛИТЕРАЦИЯ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/alifbo-sinov.ts
 *
 *  Нега керак: битта кирилл ҳарфи иккита лотин ҳарфига
 *  айланганда (`Я` -> `ya`) натижа сўзнинг бош/кичик ҳолатига
 *  боғлиқ бўлади. Бир марта «ТАВСИЯЛАР» сарлавҳаси
 *  «TAVSIYaLAR» бўлиб чиққан — сўз ўртасида кичик ҳарф пайдо
 *  бўлган ва ҳужжат қўпол кўринган.
 *
 *  Транслитерацияга ҳар тегилганда шу синовни қайта ишлатиш
 *  керак.
 * ============================================================
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lotinga } from '../src/lib/alifbo';

const SINOVLAR: [string, string][] = [
  ['ХУЛОСА ВА ТАВСИЯЛАР', 'XULOSA VA TAVSIYALAR'],
  ['Хулоса ва тавсиялар', 'Xulosa va tavsiyalar'],
  ['ИМКОНИЯТ', 'IMKONIYAT'],
  ['Имконият', 'Imkoniyat'],
  ['ШОШИЛИНЧ', 'SHOSHILINCH'],
  ['Шошилинч', 'Shoshilinch'],
  ['МУНДАРИЖА', 'MUNDARIJA'],
  ['ЁЛҒИЗ КЕКСА', 'YOLGʻIZ KEKSA'],
  ['Ёлғиз кекса', 'Yolgʻiz keksa'],
  ['МФЙ', 'MFY'],
  ['Навбаҳор МФЙ', 'Navbahor MFY'],
  ['ТАЙЁРЛАДИ', 'TAYYORLADI'],
  ['Тайёрлади', 'Tayyorladi'],
  ['ҲОЗИРГИ ҲОЛАТ', 'HOZIRGI HOLAT'],
  ['АСОСИЙ КЎРСАТКИЧЛАР', 'ASOSIY KOʻRSATKICHLAR'],
  ['ЧОРА-ТАДБИРЛАР', 'CHORA-TADBIRLAR'],
  ['Чора-тадбирлар', 'Chora-tadbirlar'],
  ['Я. Каримов', 'Ya. Karimov'],
  ['субъект', 'subyekt'],
  ['маънавият', 'maʼnaviyat'],
  ['ЮРИДИК ШАХС', 'YURIDIK SHAXS'],
  ['БЎШ ИШ ЎРИНЛАРИ', 'BOʻSH ISH OʻRINLARI'],
  ['ЖАМИ БАНД', 'JAMI BAND'],
  ['Ишсизлар билан иш — босқичлар', 'Ishsizlar bilan ish — bosqichlar'],
];

let xato = 0;
for (const [kirill, kutilgan] of SINOVLAR) {
  const natija = lotinga(kirill);
  const ok = natija === kutilgan;
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${kirill}  ->  ${natija}${ok ? '' : `   (kutilgan: ${kutilgan})`}`);
}
/*
 * ── АРАЛАШ ЁЗУВ ТЕКШИРУВИ ──
 *
 * Кирилл сўз ичига тасодифан лотин ҳарфи тушиб қолиши — бу
 * илова учун жиддий нуқсон тури. «Арxив» деб ёзилса (лотинча
 * x билан), транслитерация уни буза олмайди ва экранда
 * аралаш-қуралаш матн чиқади.
 *
 * Кўз билан фарқлаб бўлмайди: «х» ва «x» бир хил кўринади.
 * Шунинг учун машина текширади.
 */
const KIRILL = 'абвгдежзийклмнопрстуфхцчшщъыьэюяёғқҳўАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯЁҒҚҲЎ';
const ARALASH = new RegExp(`[${KIRILL}][A-Za-z]|[A-Za-z][${KIRILL}]`);

/** Атайлаб аралаш ёзилган жойлар — белги тўпламлари */
const ISTISNO = ['replace(/', 'RegExp', String.raw`\u00`, 'matchAll', 'test('];

function fayllar(papka: string): string[] {
  const royxat: string[] = [];
  for (const nom of readdirSync(papka)) {
    const yol = join(papka, nom);
    if (statSync(yol).isDirectory()) royxat.push(...fayllar(yol));
    else if (/\.tsx?$/.test(nom)) royxat.push(yol);
  }
  return royxat;
}

const aralashlar: string[] = [];
for (const f of fayllar('src')) {
  const satrlar = readFileSync(f, 'utf8').split('\n');
  satrlar.forEach((q, i) => {
    if (ISTISNO.some((x) => q.includes(x))) return;
    if (ARALASH.test(q)) aralashlar.push(`${f}:${i + 1}  ${q.trim().slice(0, 70)}`);
  });
}

if (aralashlar.length) {
  console.log('\nXATO Кирилл сўз ичида лотин ҳарфи бор:');
  for (const a of aralashlar) console.log(`     ${a}`);
  xato++;
} else {
  console.log('OK   Кирилл сўзлар ичида лотин ҳарфи йўқ');
}

console.log(`\n${SINOVLAR.length + 1 - xato}/${SINOVLAR.length + 1} o'tdi`);
process.exit(xato ? 1 : 0);
