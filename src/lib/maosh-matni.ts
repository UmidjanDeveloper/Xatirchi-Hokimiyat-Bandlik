/*
 * Ish beruvchi botda yozgan maoshni (млн сўмда) o'qiydi.
 *
 * ── NEGA QAT'IY ──
 *
 * Avval matndan raqam va nuqtadan boshqa hamma belgi o'chirilardi.
 * Natija: "-3" → 3 млн, "3-5" → 35 млн. Ya'ni kamchilik e'longa
 * kutilganidan 7-10 baravar katta maosh bo'lib tushardi - nomzodni
 * aldaydi. Endi faqat aniq son qabul qilinadi (birlik so'zi
 * bo'lishi mumkin: "4,5", "4.5 млн", "4 500 000 сўм" ham).
 *
 * `null` - tushunib bo'lmadi: bot qayta so'raydi, taxmin qilmaydi.
 */
export function maoshniOqi(matn: string): number | null {
  const t = matn
    .toLowerCase()
    .replace(/[\s ]+/g, ' ')
    .trim();

  /* "4 500 000" yoki "4500000" - to'liq so'm */
  const tolaSom = t.replace(/\s?(сўм|сум|so['‘’`]?m|uzs)\.?$/u, '').replace(/ /g, '');
  if (/^\d{6,}$/.test(tolaSom)) {
    const n = Number(tolaSom) / 1_000_000;
    return n > 0 && n <= 500 ? n : null;
  }

  const m = t.match(/^(\d{1,3}(?:[.,]\d{1,3})?)\s*(?:млн|mln|million|миллион)?\.?(?:\s*(?:сўм|сум|so['‘’`]?m|uzs)\.?)?$/u);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 500 ? n : null;
}
