/**
 * `<input type="date">` va `<input type="datetime-local">` uchun sana
 * yordamchilari.
 *
 * Alohida fayl, chunki ularni HAM server sahifasi, HAM brauzer
 * komponenti ishlatadi. `'use client'` faylidagi funksiyani server
 * komponenti chaqira olmaydi (u "mijoz havolasi"ga aylanadi va
 * `... is not a function` xatosi beradi) - bu aynan shunday topilgan.
 */

/** `<input type="date">` uchun YYYY-MM-DD (Toshkent kuni) */
export function sanaMaydoni(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(new Date(iso).getTime() + 5 * 60 * 60 * 1000);
  if (Number.isNaN(t.getTime())) return '';
  return t.toISOString().slice(0, 10);
}

/** `<input type="datetime-local">` uchun qurilmaning hozirgi vaqti */
export function hozirgiMahalliVaqt(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** N kundan keyingi sana, YYYY-MM-DD */
export function kundanKeyin(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Qurilmaning bugungi kuni, YYYY-MM-DD */
export function hozirgiKun(): string {
  return kundanKeyin(0);
}
