'use client';

/**
 * Gemini yaqinda ishlamagan bo'lsa, keyingi bir necha daqiqa jonli suhbat to'g'ridan-to'g'ri OpenAI zaxirasidan
 * boshlanadi: har bosishda avval buzuq Gemini'ga urinib, 10-15 soniya kutib, kunlik ulanish hisobini yemaymiz.
 * Muddat o'tgach Gemini yana sinab ko'riladi ("ishlasa, ishlayveradi"). Faqat shu brauzer oynasida (sessionStorage).
 */
const KALIT = 'hamroh:gemini-yiqildi';
export const GEMINI_DAM_MS = 3 * 60_000;

export function geminiYaqindaYiqildi(hozir = Date.now()): boolean {
  try {
    const t = Number(sessionStorage.getItem(KALIT));
    return Number.isFinite(t) && t > 0 && hozir - t >= 0 && hozir - t < GEMINI_DAM_MS;
  } catch { return false; }
}

export function geminiYiqildiniBelgila(hozir = Date.now()): void {
  try { sessionStorage.setItem(KALIT, String(hozir)); } catch { /* saqlash mumkin emas: faqat bu safar */ }
}
