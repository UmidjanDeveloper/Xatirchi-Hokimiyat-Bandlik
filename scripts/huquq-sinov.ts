/**
 * ============================================================
 *  РОЛ ҲУҚУҚЛАРИ — СИНОВ
 *
 *  2026-йил 25-сентябрда ҳар ролни ҳар саҳифага уриниб
 *  кўрдим. Олтита жойда чегара очиқ эди:
 *
 *      YETTILIK        -> /ishsizlar
 *      HOKIM           -> /xatlov, /xatlov/yangi, /ishsizlar
 *      BANDLIK_RAHBAR  -> /xatlov, /xatlov/yangi
 *
 *  Менюда улар кўринмасди, аммо манзилни қўлда ёзса очиларди.
 *
 *  Сабаби оддий: `yolgaRuxsat` функцияси ЁЗИЛГАН эди, лекин
 *  ҲЕЧ ҚАЕРДА чақирилмасди — ўлик код. Middleware эса ўз
 *  изоҳида айтади: «бу қатлам ҳимоя эмас, йўналтирувчи».
 *  Яъни ҳар саҳифа ўзини ўзи қўриқлаши керак эди, еттитаси
 *  қўриқламасди.
 *
 *  Маълумот сизиши бўлмади — саҳифалар `mahallaFiltri` ни
 *  қўллайди ва маҳалла ходими барибир фақат ўзиникини
 *  кўрарди. Аммо ҳоким 3 345 фуқарони исм-телефони билан
 *  оча оларди, ҳолбуки лойиҳа қоидасида у «фақат таҳлил»
 *  ва унга маълумот ИСМСИЗ берилади.
 *
 *  Синов иккита нарсани қўриқлайди:
 *    1. Ҳар саҳифада рол қўриқчиси БОР
 *    2. Қўриқчи менюдаги ЎША рўйхатдан ўқийди — иккита
 *       рўйхат бўлса, бири эскириб қоларди
 * ============================================================
 */
import { readFileSync, readdirSync } from 'node:fs';
import { MENYU, yolgaRuxsat, boshSahifa } from '../src/components/shell/navigatsiya';
import type { Rol } from '@prisma/client';

type Sinov = { nomi: string; tekshir: () => boolean };

const ROLLAR: Rol[] = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'];

/** Изоҳларсиз код */
const kodiOl = (m: string) =>
  m
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/** `(ilova)` гуруҳидаги барча саҳифалар */
function sahifalar(ildiz = 'src/app/(ilova)'): string[] {
  const chiqdi: string[] = [];
  for (const band of readdirSync(ildiz, { withFileTypes: true })) {
    const yol = `${ildiz}/${band.name}`;
    if (band.isDirectory()) chiqdi.push(...sahifalar(yol));
    else if (band.name === 'page.tsx') chiqdi.push(yol);
  }
  return chiqdi;
}

/**
 * Рол қўриқчисининг ҳар хил кўриниши.
 *
 * `yolgaRuxsat` — асосий йўл. Қолганлари эски, аммо ишлайдиган
 * шакллар: улар ҳам қабул қилинади, чунки уларнинг ҳар бири
 * АЙНАН бир рол тўпламини текширади.
 */
const QORIQCHI = [
  /yolgaRuxsat\(sessiya\.rol,/,
  /if \(!\w+\(sessiya\.rol\)\)\s*redirect/,
  /sessiya\.rol !== '[A-Z_]+'\)\s*redirect/,
  /sessiya\.rol === '[A-Z_]+'\)\s*redirect/,
];

/** Қўриқчи КЕРАК БЎЛМАГАН саҳифалар */
const ISTISNO = new Set([
  /* Илдиз — ҳамма учун очиқ, ўзи бош саҳифага юборади */
  'src/app/(ilova)/page.tsx',
]);

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Ҳар саҳифада рол қўриқчиси бор',
    tekshir: () => {
      const qorovsiz = sahifalar().filter((f) => {
        if (ISTISNO.has(f)) return false;
        const k = kodiOl(readFileSync(f, 'utf8'));
        return !QORIQCHI.some((n) => n.test(k));
      });
      if (qorovsiz.length) for (const f of qorovsiz) console.log(`     қўриқчисиз: ${f}`);
      return qorovsiz.length === 0;
    },
  },
  {
    /*
     * `yolgaRuxsat` МЕНЮ рўйхатидан ўқийди. Агар у ўз ичига
     * алоҳида рол рўйхати ёзиб қўйса, менюда ўзгариш
     * қилинганда иккиси бир-биридан узилиб кетарди.
     */
    nomi: 'Қўриқчи менюдаги ЎША рўйхатдан ўқийди',
    tekshir: () => {
      const k = kodiOl(readFileSync('src/components/shell/navigatsiya.ts', 'utf8'));
      const j = k.indexOf('export function yolgaRuxsat');
      if (j < 0) return false;
      const tana = k.slice(j, j + 500);
      return tana.includes('MENYU.filter') && tana.includes('rollar.includes(rol)');
    },
  },
  {
    /*
     * Энг муҳими: менюда рухсат ЙЎҚ рол учун `yolgaRuxsat`
     * ҳам «йўқ» деб жавоб бериши шарт. Бу — олтита тешикнинг
     * ўзи, фақат энди ҳар рол ва ҳар йўл бўйича.
     */
    nomi: 'Ҳар рол ва ҳар йўл: меню билан қўриқчи БИР ХИЛ жавоб беради',
    tekshir: () => {
      const farq: string[] = [];
      for (const band of MENYU) {
        for (const rol of ROLLAR) {
          const menyuda = band.rollar.includes(rol);
          const ruxsat = yolgaRuxsat(rol, band.yol);
          if (menyuda !== ruxsat) farq.push(`${rol} -> ${band.yol}`);
        }
      }
      if (farq.length) for (const f of farq) console.log(`     ${f}`);
      return farq.length === 0;
    },
  },
  {
    /* Ички йўл ҳам ота бандининг қоидасига бўйсунсин */
    nomi: 'Ички йўллар ҳам қўриқланади (`/xatlov/123`)',
    tekshir: () =>
      yolgaRuxsat('YETTILIK', '/xatlov/abc123') &&
      !yolgaRuxsat('HOKIM', '/xatlov/abc123') &&
      !yolgaRuxsat('HOKIM', '/ishsizlar/abc123'),
  },
  {
    /* Ҳар рол қайтариладиган жой ЎЗИ кира оладиган бўлсин */
    nomi: 'Бош саҳифа ҳар рол учун ўзи кира оладиган йўл',
    tekshir: () => {
      const yomon = ROLLAR.filter((r) => !yolgaRuxsat(r, boshSahifa(r)));
      if (yomon.length) for (const r of yomon) console.log(`     ${r} -> ${boshSahifa(r)}`);
      return yomon.length === 0;
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
