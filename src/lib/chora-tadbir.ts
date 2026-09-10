import type { TopshiriqHolati } from '@prisma/client';

/**
 * ============================================================
 *  CHORA-TADBIR HOLATI
 *
 *  "Kechikdi" holati bazada SAQLANMAYDI - u har safar sanadan
 *  hisoblanadi.
 *
 *  Sababi: saqlansa, uni har kecha yangilab turadigan vazifa
 *  (cron) kerak bo'ladi. Vazifa bir kecha ishlamay qolsa - va
 *  bepul hostingda bu tez-tez bo'ladi - hokim paneli "kechikkan
 *  topshiriq yo'q" deb ko'rsatadi, holbuki bor. Bu esa
 *  panelning eng muhim qismini yolg'onchi qiladi.
 *
 *  Hisoblangan holat esa har doim rost: muddat o'tgan va
 *  bajarilmagan bo'lsa - kechikkan.
 * ============================================================
 */

export interface TopshiriqKabi {
  holati: TopshiriqHolati;
  muddat: Date;
}

/** Muddati o'tgan va hali bajarilmaganmi */
export function kechikkanmi(t: TopshiriqKabi, hozir = new Date()): boolean {
  if (t.holati === 'BAJARILDI' || t.holati === 'BEKOR_QILINDI') return false;
  return t.muddat.getTime() < hozir.getTime();
}

/** Muddatigacha necha kun qolgani; manfiy son - kechikkan kunlar */
export function qolganKun(muddat: Date, hozir = new Date()): number {
  const kun = 24 * 60 * 60 * 1000;
  const a = Date.UTC(muddat.getFullYear(), muddat.getMonth(), muddat.getDate());
  const b = Date.UTC(hozir.getFullYear(), hozir.getMonth(), hozir.getDate());
  return Math.round((a - b) / kun);
}

export const TOPSHIRIQ_HOLATI: Record<
  TopshiriqHolati,
  { kirill: string; sinf: string }
> = {
  KUTILMOQDA: { kirill: 'Кутилмоқда', sinf: 'bg-surface-muted text-ink-muted' },
  BAJARILMOQDA: { kirill: 'Бажарилмоқда', sinf: 'bg-info-bg text-info' },
  BAJARILDI: { kirill: 'Бажарилди', sinf: 'bg-ok-bg text-ok' },
  KECHIKDI: { kirill: 'Кечикди', sinf: 'bg-danger-bg text-danger' },
  BEKOR_QILINDI: { kirill: 'Бекор қилинди', sinf: 'bg-surface-muted text-ink-faint' },
};

/** Ko'rsatiladigan holat - kechikkanini hisobga oladi */
export function korinadiganHolat(t: TopshiriqKabi, hozir = new Date()): TopshiriqHolati {
  return kechikkanmi(t, hozir) ? 'KECHIKDI' : t.holati;
}

/**
 * Kechikkan topshiriqlarni topish uchun so'rov sharti.
 * Bir joyda turishi muhim - panel va ro'yxat bir xil raqamni ko'rsatishi kerak.
 */
export function kechikkanlarShartI(hozir = new Date()) {
  return {
    muddat: { lt: hozir },
    holati: { in: ['KUTILMOQDA', 'BAJARILMOQDA'] as TopshiriqHolati[] },
  };
}
