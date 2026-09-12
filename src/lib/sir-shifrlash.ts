import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * ============================================================
 *  TAYINLANGAN PAROLNI SHIFRLASH
 *
 *  Administrator xodimga parol tayinlaganda uni keyinroq ko'ra
 *  olishi kerak: xodim unutsa yoki og'zaki yetkazish kerak bo'lsa.
 *
 *  ── Nega xesh yetmaydi ──
 *
 *  Kirish paroli scrypt bilan XESHLANADI va uni orqaga o'qib
 *  bo'lmaydi - bu ataylab shunday, aynan shu tufayli baza sizib
 *  chiqsa ham parollar ochilmaydi.
 *
 *  Lekin "qanday parol qo'yganimni ko'ray" degan talab uchun
 *  qaytariladigan saqlash kerak. Ikki yo'l bor edi:
 *
 *    1. Ochiq matnda saqlash - bazani ochgan har kim (yoki
 *       nusxa oluvchi, yoki noto'g'ri sozlangan ruxsat) barcha
 *       parollarni bir ko'rishda oladi.
 *
 *    2. Shifrlab saqlash - bazani ochgan odam faqat tushunarsiz
 *       belgilar ko'radi. Ochish uchun ILOVA kaliti ham kerak.
 *
 *  Ikkinchisi tanlandi. Bu baribir xeshdan zaifroq va buni
 *  yashirishning ma'nosi yo'q: agar hujumchi bazani ham, ilova
 *  sozlamalarini ham qo'lga kiritsa, parollar ochiladi. Lekin
 *  eng ko'p uchraydigan holat - bazaning o'zi sizib chiqishi -
 *  bu yerda qoplangan.
 *
 *  ── Kalit qayerdan ──
 *
 *  `SESSION_SECRET` dan scrypt orqali olinadi. Alohida
 *  o'zgaruvchi kiritilmadi: yana bitta sirni boshqarish kerak
 *  bo'lardi va u ko'pincha unutilib, kod ichida qolib ketadi.
 *
 *  DIQQAT: `SESSION_SECRET` almashtirilsa, eski saqlangan
 *  parollarni ochib bo'lmaydi. Ular yo'qolgan deb hisoblanadi va
 *  administrator yangi parol tayinlaydi - ma'lumot yo'qolmaydi,
 *  chunki kirish xeshi alohida saqlanadi.
 * ============================================================
 */

const ALGORITM = 'aes-256-gcm';

/** Kalitni sessiya sirdan hosil qiladi */
function kalit(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET sozlanmagan - parolni shifrlab bo‘lmaydi');
  }
  // Sobit "tuz": kalit har safar bir xil chiqishi kerak, aks holda
  // kecha shifrlangan narsani bugun ocha olmaymiz.
  return scryptSync(secret, 'bandlik-parol-kaliti', 32);
}

/**
 * Matnni shifrlaydi.
 *
 * Natija: `iv:teg:shifr` - uchalasi ham base64. IV har safar
 * yangi tasodifiy son: bir xil parol ikki marta shifrlansa,
 * natija har xil bo'lishi kerak, aks holda bazaga qarab "bu
 * ikkovining paroli bir xil" degan xulosa chiqarish mumkin edi.
 */
export function shifrla(matn: string): string {
  const iv = randomBytes(12);
  const shifr = createCipheriv(ALGORITM, kalit(), iv);
  const natija = Buffer.concat([shifr.update(matn, 'utf8'), shifr.final()]);
  const teg = shifr.getAuthTag();
  return `${iv.toString('base64')}:${teg.toString('base64')}:${natija.toString('base64')}`;
}

/**
 * Shifrni ochadi.
 *
 * Ochib bo'lmasa `null` qaytaradi - xato tashlamaydi. Sabablari
 * turli bo'lishi mumkin (kalit almashgan, yozuv buzilgan) va
 * ularning hech biri butun sahifani yiqitishga arzimaydi:
 * administrator "parol ko'rinmadi" degan xabarni ko'rib, yangi
 * parol tayinlaydi.
 */
export function shifrniOch(saqlangan: string | null | undefined): string | null {
  if (!saqlangan) return null;

  try {
    const [ivB64, tegB64, shifrB64] = saqlangan.split(':');
    if (!ivB64 || !tegB64 || !shifrB64) return null;

    const ochuvchi = createDecipheriv(ALGORITM, kalit(), Buffer.from(ivB64, 'base64'));
    ochuvchi.setAuthTag(Buffer.from(tegB64, 'base64'));

    return Buffer.concat([
      ochuvchi.update(Buffer.from(shifrB64, 'base64')),
      ochuvchi.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}
