/**
 * ============================================================
 *  HISOBOTDAGI RAQAM KO'RINISHI
 *
 *  Bir joyda turadi, chunki hisobotning ishonchliligi shundan
 *  boshlanadi: bitta hujjatda "1751", "1 751" va "1,751" uchtasi
 *  uchrasa, o'quvchi raqamlarga emas, terishga qaray boshlaydi.
 *
 *  Ajratgich - NAZORAT QILINADIGAN bo'shliq (U+00A0). Oddiy
 *  bo'shliq bo'lsa, PDF satr oxirida "1" va "751" ni ikkiga
 *  bo'lib tashlardi. Shu belgi PDF shrift to'plamiga ataylab
 *  kiritilgan.
 * ============================================================
 */

/** Ming ajratgich - uzilmaydigan bo'shliq */
const AJRATGICH = ' ';

/** 1751 -> "1 751" */
export function son(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const butun = Math.round(n);
  return String(Math.abs(butun))
    .replace(/\B(?=(\d{3})+(?!\d))/g, AJRATGICH)
    .replace(/^/, butun < 0 ? '−' : '');
}

/** Bo'lakning ulushi, bir kasr xona bilan. Bo'luvchi 0 bo'lsa 0 */
export function foizi(qism: number, butun: number): number {
  if (!butun) return 0;
  return Math.round((qism / butun) * 1000) / 10;
}

/** 24.5 -> "24,5%" — o'zbek va rus yozuvida kasr vergul bilan */
export function foiz(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${String(Math.round(n * 10) / 10).replace('.', ',')}%`;
}

/**
 * So'm summasi.
 *
 * Byudjet raqamlari yuz millionlarga chiqadi va to'liq yozilsa
 * jadval ustuniga sig'maydi. Shuning uchun million va milliarddan
 * oshganda qisqartiriladi - lekin FAQAT ko'rsatishda: Excel ga
 * to'liq son yoziladi, aks holda ustida hisob-kitob qilib
 * bo'lmasdi.
 */
export function pul(summa: number | bigint | null | undefined): string {
  if (summa === null || summa === undefined) return '—';
  const n = typeof summa === 'bigint' ? Number(summa) : summa;
  if (!Number.isFinite(n) || n === 0) return '0';
  if (Math.abs(n) >= 1_000_000_000) {
    return `${String(Math.round(n / 100_000_000) / 10).replace('.', ',')} млрд`;
  }
  if (Math.abs(n) >= 1_000_000) {
    return `${String(Math.round(n / 100_000) / 10).replace('.', ',')} млн`;
  }
  return son(n);
}

/** BigInt yoki null ni xavfsiz Number ga o'giradi */
export function raqamga(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'bigint' ? Number(v) : v;
}

/**
 * "12,5 га" — GEKTARDAGI maydon.
 *
 * Anketada gektar bilan SO'RALADIGAN bitta maydon bor: ijara
 * yer. Qolgani sotixda so'raladi va ularga `sotix()` ishlatiladi.
 */
export function maydon(ga: number | null | undefined): string {
  if (ga === null || ga === undefined || !Number.isFinite(ga)) return '—';
  return `${String(Math.round(ga * 100) / 100).replace('.', ',')} га`;
}

/**
 * "95 сотих" — SOTIXDAGI maydon.
 *
 * ── Nega alohida funksiya kerak bo'ldi ──
 *
 * Hisobotda "Жами экин майдони: 95 га" deb turardi. Anketada esa
 * o'sha katak SOTIXDA so'raladi — ya'ni haqiqiy maydon 0,95
 * gektar edi. Raqam yuz barobar kattaroq ko'rsatilgan.
 *
 * Bu oddiy terish xatosi emas: hokim yer subsidiyasi rejasini
 * shu raqamdan tuzadi. "Tumanda 95 gektar tomorqa" bilan
 * "95 sotix" — ikki xil qaror.
 *
 * Gektarga o'girib ko'rsatmaymiz: xodim sotixda so'ragan,
 * xonadon sotixda aytgan, hisobotda ham sotixda tursin — aks
 * holda xodim o'z yozganini hujjatda topa olmaydi.
 */
export function sotix(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${String(Math.round(n * 100) / 100).replace('.', ',')} сотих`;
}
