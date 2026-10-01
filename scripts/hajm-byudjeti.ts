/**
 * ============================================================
 *  HAJM BYUDJETI — QURISHDAN KEYIN
 *
 *  Ishga tushirish:  npm run build && npx tsx scripts/hajm-byudjeti.ts
 *  (CI da «Qurish» qadamidan keyin ishlaydi)
 *
 *  ── Nega kerak ──
 *
 *  Sahifa hajmi jimgina o'sadi: bitta qulay `import` — va
 *  ilovaga 100 KB kutubxona kirib qoladi. Hech qaysi sinov
 *  yiqilmaydi, ekran ham o'zgarmaydi; buni faqat sekin
 *  internetdagi xodim sezadi.
 *
 *  Aynan shunday bo'lgan: menyu ikonkasini nom bo'yicha topish
 *  uchun `import * as Ikonkalar from 'lucide-react'` — butun
 *  kutubxona (har sahifada +160 KB), va `/xatlov` sahifasi
 *  diagramma kutubxonasini (105 KB) yuklardi, garchi u yerda
 *  diagramma pastda, ekrandan tashqarida turadi.
 *
 *  Bu skript Next.js ning qurish manifestidan har sahifaning
 *  BOSHLANG'ICH JavaScript hajmini (gzip) o'qiydi va byudjetdan
 *  oshsa yiqiladi.
 *
 *  ── Byudjet qanday belgilangan ──
 *
 *  Joriy o'lchovga ~15–20 foiz zaxira bilan. Maqsad aniq
 *  raqamni qotirish emas, balki KATTA sakrashni ushlash: bir
 *  nechta KB o'zgarishi normal, 50 KB emas.
 *
 *  Raqamlar qurish manifestidan — bu BRAUZERDAGI haqiqiy vaqt
 *  emas, uning barqaror o'lchovi. Brauzer o'lchovi (sekin
 *  tarmoq, CPU sekinlashtirilgan) `scripts/o-lchov/` da.
 * ============================================================
 */
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

/** KB, gzip */
const BYUDJET: Record<string, number> = {
  /* Dala xodimining sahifalari — eng sekin tarmoqda ishlaydi */
  '/(ilova)/xatlov/page': 160,
  '/(ilova)/xatlov/yangi/page': 145,
  '/(ilova)/xatlov/[id]/page': 135,
  '/(ilova)/xatlov/[id]/tahrir/page': 145,
  '/(ilova)/vazifalar/page': 125,
  /* Qolgan ichki sahifalar */
  '/(ilova)/panel/page': 160,
  '/(ilova)/bandlik/page': 160,
};
const STANDART = 150;

const MANIFEST = '.next/app-build-manifest.json';
if (!existsSync(MANIFEST)) {
  console.error('XATO .next/app-build-manifest.json yo‘q — avval `npm run build`');
  process.exit(2);
}

const sahifalar = (JSON.parse(readFileSync(MANIFEST, 'utf8')) as { pages: Record<string, string[]> }).pages;

const gzKB = (fayl: string) => {
  const y = `.next/${fayl}`;
  return existsSync(y) ? gzipSync(readFileSync(y)).length / 1024 : 0;
};

let xato = 0;
const qatorlar: { sahifa: string; kb: number; chegara: number; ok: boolean }[] = [];

for (const [sahifa, fayllar] of Object.entries(sahifalar)) {
  /* Faqat ilova sahifalari: `/layout`, `/_not-found` va h.k. emas */
  if (!sahifa.startsWith('/(ilova)/') || !sahifa.endsWith('/page')) continue;
  const kb = fayllar.filter((f) => f.endsWith('.js')).reduce((s, f) => s + gzKB(f), 0);
  const chegara = BYUDJET[sahifa] ?? STANDART;
  const ok = kb <= chegara;
  if (!ok) xato += 1;
  qatorlar.push({ sahifa, kb, chegara, ok });
}

qatorlar.sort((a, b) => b.kb - a.kb);
for (const q of qatorlar) {
  console.log(
    `${q.ok ? 'OK  ' : 'XATO'} ${q.sahifa.padEnd(40)} ${q.kb.toFixed(0).padStart(4)} KB  (byudjet ${q.chegara} KB)`
  );
}
console.log(`\n${qatorlar.length - xato}/${qatorlar.length} sahifa byudjet ichida`);
if (xato) {
  console.log(
    '\nByudjetdan oshgan sahifa bor. Eng ehtimolli sabab — og‘ir kutubxonani\n' +
      '(recharts, exceljs, jspdf, xlsx) sahifaga TO‘G‘RIDAN-TO‘G‘RI import qilish.\n' +
      'Diagrammalar uchun `components/panel/grafiklar-kechik` dan foydalaning.'
  );
}
process.exit(xato ? 1 : 0);
