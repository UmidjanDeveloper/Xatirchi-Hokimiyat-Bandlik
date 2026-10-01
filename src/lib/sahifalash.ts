/**
 * ============================================================
 *  SERVER TOMONIDA SAHIFALASH
 *
 *  Ro'yxat sahifalari avval "eng yangi N tasini" olardi va qolganiga
 *  yo'l yo'q edi: 100 tadan keyingi yozuvni ochib bo'lmasdi. Endi
 *  `?sahifa=N` bilan hammasi ko'rinadi, har safar esa bazadan faqat
 *  bitta sahifa olinadi.
 *
 *  ── Nega skip/take ──
 *
 *  Ro'yxatlar yuzlab-minglab qator, million emas. Bunday hajmda
 *  `skip` oddiy va tushunarli; kursorli sahifalash murakkabroq va
 *  "3-sahifaga o'tish" imkonini bermaydi.
 * ============================================================
 */

export const SAHIFA_HAJMI = 25;

/** URL'dagi ixtiyoriy matndan yaroqli sahifa raqamini chiqaradi (1 dan boshlab) */
export function sahifaRaqami(xom: string | string[] | undefined): number {
  const s = Array.isArray(xom) ? xom[0] : xom;
  const n = Number.parseInt(s ?? '1', 10);
  /* NaN, 0, manfiy, juda katta - hammasi xavfsiz oraliqqa tushadi */
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 100_000);
}

export function jamiSahifa(jami: number, hajm = SAHIFA_HAJMI): number {
  return Math.max(1, Math.ceil(jami / hajm));
}

/** Prisma `skip`/`take` */
export function sahifaChegarasi(sahifa: number, hajm = SAHIFA_HAJMI) {
  return { skip: (sahifa - 1) * hajm, take: hajm };
}

/**
 * Raqam jamidan oshib ketsa (kimdir ro'yxatni qisqartirib qo'ygan,
 * eski havola) - oxirgi sahifaga tushiradi, bo'sh ekran emas.
 */
export function sahifaniTuzat(sahifa: number, jami: number, hajm = SAHIFA_HAJMI): number {
  return Math.min(sahifa, jamiSahifa(jami, hajm));
}
