import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind sinflarini xavfsiz birlashtiradi */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Sanani o'zbekcha formatda ko'rsatadi: 04.09.2026, 14:35 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * ============================================================
 *  VAQT MINTAQASI
 *
 *  O'zbekiston UTC+5 da, yozgi vaqtga o'tmaydi. Server esa UTC da
 *  ishlaydi. Agar sanani UTC deb hisoblasak, "bugun" degan filtr
 *  aslida kechagi soat 19:00 dan bugungi 19:00 gacha bo'lgan
 *  oraliqni oladi — hisobotdagi raqam noto'g'ri chiqadi.
 * ============================================================
 */
const TOSHKENT = 5 * 60 * 60 * 1000;

/** `YYYY-MM-DD` sanasining Toshkent vaqti bo'yicha boshlanishi */
export function kunBoshi(day: string): Date {
  return new Date(`${day}T00:00:00.000+05:00`);
}

/** `YYYY-MM-DD` sanasining Toshkent vaqti bo'yicha oxiri */
export function kunOxiri(day: string): Date {
  return new Date(`${day}T23:59:59.999+05:00`);
}

/**
 * Sanani Toshkent vaqti bo'yicha `YYYY-MM-DD` ko'rinishida beradi.
 *
 * Serverda ham, brauzerda ham bir xil natija chiqishi kerak,
 * shuning uchun mahalliy vaqtga emas, aniq siljishga tayanamiz.
 */
export function toshkentKuni(date: Date = new Date()): string {
  return new Date(date.getTime() + TOSHKENT).toISOString().slice(0, 10);
}

/** Foizni butun songa yaxlitlaydi (0 ga bo'linishdan himoyalangan) */
export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Matndagi turli apostroflarni (' ' ʻ ʼ ` ´) bitta ko'rinishga keltiradi.
 * "Bog'ishamol" va "Bogʻishamol" bir xil yoziladi.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʻʼ`´′]/g, "'")
    .trim();
}

/**
 * Qidiruv uchun kalit: apostrof, defis va bo'shliqlar butunlay
 * olib tashlanadi.
 *
 * Bu muhim, chunki o'quvchilar (va hokimiyat xodimlari) mahalla nomini
 * qanday yozishi oldindan ma'lum emas. Quyidagilarning barchasi bitta
 * mahallani topishi kerak:
 *
 *   "Bog'ishamol"  <- bogishamol, bogʻishamol
 *   "Oq-oltin"     <- oqoltin, oq oltin, oq-oltin
 *   "Chechak ota"  <- chechakota, chechak ota
 *   "Ikrom Karvon" <- karvon, ikromkarvon
 */
export function searchKey(text: string): string {
  return normalize(text).replace(/['\-\s]/g, '');
}

/** F.I.SH. dan bosh harflar — avatar uchun */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase();
}

/**
 * Telefon raqamini yagona (kanonik) ko'rinishga keltiradi: +998901234567
 *
 * Xodimlar raqamni juda turlicha yozadi, shuning uchun quyidagilarning
 * barchasi qabul qilinadi:
 *
 *   +998 90 123 45 67      998901234567
 *   +99890 123-45-67       90 123 45 67
 *   (90) 123-45-67         901234567
 *
 * Noto'g'ri raqam uchun `null` qaytaradi.
 */
export function canonicalizePhone(input?: string | null): string | null {
  if (!input) return null;

  const digits = input.replace(/\D/g, '');

  // Mamlakat kodisiz kiritilgan 9 xonali raqam
  if (digits.length === 9) return `+998${digits}`;

  // 998 bilan boshlanuvchi to'liq raqam
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;

  return null;
}

/** Telefon raqamini chiroyli ko'rinishga keltiradi: +998 90 123 45 67 */
export function formatPhone(phone?: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 12) return phone;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
}

/** Uzun matnni qisqartiradi */
export function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
