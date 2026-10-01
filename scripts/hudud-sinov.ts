/**
 * ============================================================
 *  HUDUD CHEGARASI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/hudud-sinov.ts
 *
 *  Bu yerda xato nimaga olib keladi:
 *   · Yangi jadval qo'shilib, hududga qanday bog'lanishi o'ylanmasa,
 *     ko'p tumanli rejimda u BARCHA tumanlarga ko'rinib qoladi.
 *   · "mahallaga tegishli" deb belgilangan jadvalda `mahallaId` bo'lmasa,
 *     chegara faqat qog'ozda.
 *   · Bog'langan jadvalning FK maydoni olib tashlansa, hududga yo'l uzilib qoladi.
 *
 *  Sxema va xarita bir-biridan TASHQARIDA yoziladi: sinov ikkalasini
 *  solishtiradi.
 * ============================================================
 */
import { existsSync, readFileSync } from 'node:fs';
import { HUDUD_XARITASI, TUMANGA_TEGISHLI_SOZLAMALAR } from '../src/lib/hudud-chegarasi';

type Sinov = { nomi: string; tekshir: () => boolean };

const sxema = readFileSync('prisma/schema.prisma', 'utf8');

/** Sxemadagi modellar: nom -> maydon nomlari */
const modellar = new Map<string, string[]>();
for (const m of sxema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
  const maydonlar = m[2]
    .split('\n')
    .map((q) => q.trim())
    .filter((q) => q && !q.startsWith('//') && !q.startsWith('@@'))
    .map((q) => q.split(/\s+/)[0]);
  modellar.set(m[1], maydonlar);
}

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Har bir jadval hudud xaritasida TASNIFLANGAN (yangi jadval qo\'shilsa, "qaysi tumanga tegishli?" savoliga javob berish shart)',
    tekshir: () => {
      const tasniflanmagan = Array.from(modellar.keys()).filter((n) => !(n in HUDUD_XARITASI));
      if (tasniflanmagan.length) console.log('     tasniflanmagan jadvallar:', tasniflanmagan.join(', '));
      return tasniflanmagan.length === 0;
    },
  },
  {
    nomi: 'Xaritada sxemada YO\'Q jadval qolmagan (o\'chirilgan jadval xaritada osilib turmasin)',
    tekshir: () => {
      const ortiqcha = Object.keys(HUDUD_XARITASI).filter((n) => !modellar.has(n));
      if (ortiqcha.length) console.log('     sxemada yo\'q:', ortiqcha.join(', '));
      return ortiqcha.length === 0;
    },
  },
  {
    nomi: '"MAHALLA" jadvallarida haqiqatan `mahallaId` maydoni bor; boshqa turdagi jadvallarda esa yo\'q (yo\'q joyda chegara faqat qog\'ozda)',
    tekshir: () => {
      const xato: string[] = [];
      for (const [n, q] of Object.entries(HUDUD_XARITASI)) {
        const bor = modellar.get(n)?.includes('mahallaId') ?? false;
        if (q.turi === 'MAHALLA' && !bor) xato.push(`${n}: MAHALLA, lekin mahallaId yo'q`);
        if (q.turi !== 'MAHALLA' && bor) xato.push(`${n}: ${q.turi}, lekin mahallaId bor — turini MAHALLA qiling`);
      }
      if (xato.length) console.log('     ', xato.join('\n      '));
      return xato.length === 0;
    },
  },
  {
    nomi: '"BOGLIQ" va "XODIM" jadvallarida hududga olib boradigan FK maydon(lar)i ko\'rsatilgan va sxemada MAVJUD',
    tekshir: () => {
      const xato: string[] = [];
      for (const [n, q] of Object.entries(HUDUD_XARITASI)) {
        if (q.turi !== 'BOGLIQ' && q.turi !== 'XODIM') continue;
        if (!q.orqali || q.orqali.length === 0) {
          xato.push(`${n}: orqali ko'rsatilmagan`);
          continue;
        }
        const maydonlar = modellar.get(n) ?? [];
        const yoq = q.orqali.filter((f) => !maydonlar.includes(f));
        if (yoq.length) xato.push(`${n}: sxemada yo'q maydon: ${yoq.join(', ')}`);
      }
      if (xato.length) console.log('     ', xato.join('\n      '));
      return xato.length === 0;
    },
  },
  {
    nomi: 'Platforma ("TIZIM") jadvallarida shaxsiy ma\'lumot maydoni yo\'q (telefon, JSHSHIR, ism, manzil): ular hududga bog\'lanmaydi, shuning uchun fuqaro ma\'lumoti u yerga tushmasligi shart',
    tekshir: () => {
      const xato: string[] = [];
      const shaxsiy = /^(telefon|pinfl|jshshir|fish|fullName|manzil|tugilganSana|username)$/i;
      for (const [n, q] of Object.entries(HUDUD_XARITASI)) {
        if (q.turi !== 'TIZIM') continue;
        const topildi = (modellar.get(n) ?? []).filter((f) => shaxsiy.test(f));
        if (topildi.length) xato.push(`${n}: ${topildi.join(', ')}`);
      }
      if (xato.length) console.log('     ', xato.join('\n      '));
      return xato.length === 0;
    },
  },
  {
    nomi: 'Tuman sozlamalari ro\'yxatidagi fayl/kataloglar mavjud (ro\'yxat eskirib qolmasin)',
    tekshir: () => {
      const yoq = TUMANGA_TEGISHLI_SOZLAMALAR.filter((x) => !existsSync(x.yol)).map((x) => x.yol);
      if (yoq.length) console.log('     topilmadi:', yoq.join(', '));
      return TUMANGA_TEGISHLI_SOZLAMALAR.length > 0 && yoq.length === 0;
    },
  },
  {
    nomi: 'Hozirgi izolyatsiya o\'zgarmagan: `mahallagaRuxsat` YETTILIK uchun faqat o\'z mahallasi, mahallasiz YETTILIK hech narsa; qolgan rollar hozir butun tuman (ko\'p tumanda bu chegara `tumanId` ga ko\'chadi)',
    tekshir: () => {
      const k = readFileSync('src/lib/auth.ts', 'utf8');
      const i = k.indexOf('export function mahallagaRuxsat');
      const blok = k.slice(i, i + 1200);
      return (
        i > 0 &&
        /if \(sessiya\.rol === 'YETTILIK'\) return sessiya\.mahallaId === mahallaId;/.test(blok) &&
        /return true;/.test(blok)
      );
    },
  },
];

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
