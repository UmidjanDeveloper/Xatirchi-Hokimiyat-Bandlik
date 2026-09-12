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
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
