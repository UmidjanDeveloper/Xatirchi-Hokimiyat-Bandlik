import { readFileSync } from 'node:fs';

/*
 * `.env` ni qo'lda o'qiymiz.
 *
 * Prisma CLI buni o'zi qiladi, lekin bu skript to'g'ridan-to'g'ri
 * `tsx` bilan ishga tushadi - u hech narsa yuklamaydi. Tashqi
 * kutubxona qo'shmaslik uchun sodda o'quvchi yozilgan: bu yerda
 * murakkab sintaksis kerak emas, `.env` da faqat KALIT=qiymat bor.
 *
 * Muhitda allaqachon turgan qiymat ustunroq - Vercel yoki
 * boshqa serverda sozlamalar fayldan emas, muhitdan keladi.
 */
export function envYukla(fayl = '.env'): void {
  let matn: string;
  try {
    matn = readFileSync(fayl, 'utf8');
  } catch {
    return; // fayl yo'q - server muhitida bu normal
  }

  for (const qator of matn.split('\n')) {
    const t = qator.trim();
    if (!t || t.startsWith('#')) continue;

    const teng = t.indexOf('=');
    if (teng === -1) continue;

    const kalit = t.slice(0, teng).trim();
    let qiymat = t.slice(teng + 1).trim();

    // "..." yoki '...' qavslarini olib tashlaymiz
    if (
      (qiymat.startsWith('"') && qiymat.endsWith('"')) ||
      (qiymat.startsWith("'") && qiymat.endsWith("'"))
    ) {
      qiymat = qiymat.slice(1, -1);
    }

    if (process.env[kalit] === undefined) process.env[kalit] = qiymat;
  }
}
