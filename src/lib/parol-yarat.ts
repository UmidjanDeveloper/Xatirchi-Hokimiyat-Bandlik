/**
 * ============================================================
 *  BOSHLANG'ICH PAROL YARATISH
 *
 *  Bir joyda turadi, chunki uni ikki xil muhit ishlatadi:
 *  administrator paneli (brauzer) va `prisma/seed.ts` (server).
 *  Ikki nusxa bo'lsa, biri kuchsiz qolib ketishi mumkin.
 * ============================================================
 */

/*
 * Chalkashadigan belgilar chiqarib tashlangan:
 *   0 va O,  1 va l va I
 * Administrator parolni og'zaki yoki qog'ozda uzatadi - "nol
 * edimi, o harfimidi?" degan savol tug'ilmasligi kerak.
 */
const HARFLAR = 'abcdefghjkmnpqrstuvwxyz';
const BOSH = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const RAQAMLAR = '23456789';

/**
 * To'plamdan bitta belgini xavfsiz tanlaydi.
 *
 * `Math.random()` ATAYLAB ishlatilmagan: u tez ishlashga
 * mo'ljallangan, taxmin qilib bo'lmaydigan bo'lishga emas. Uning
 * ketma-ketligini bir necha natijaga qarab tiklab olish mumkin -
 * parol uchun bu yaramaydi.
 *
 * `crypto.getRandomValues` brauzerda ham, Node'da ham bor.
 *
 * Qoldiq (`%`) to'g'ridan-to'g'ri olinmaydi: 256 to'plam uzunligiga
 * bo'linmasa, birinchi bir necha belgi ko'proq tushadi. Shuning
 * uchun chegaradan oshgan qiymatlar tashlab yuboriladi.
 */
function belgi(toplam: string): string {
  const chegara = Math.floor(256 / toplam.length) * toplam.length;
  const bayt = new Uint8Array(1);

  for (;;) {
    crypto.getRandomValues(bayt);
    if (bayt[0] < chegara) return toplam[bayt[0] % toplam.length];
  }
}

/**
 * O'qish oson, lekin taxmin qilish qiyin parol.
 *
 * Ko'rinishi: `Kfrmqxb47` - bosh harf, 6 ta kichik harf, 2 raqam.
 * Bu 23^6 x 8^2 x 23 ≈ 1,7 x 10^11 ta variant; login urinishlari
 * 15 daqiqada 10 tagacha cheklangani uchun taxmin qilish amalda
 * imkonsiz.
 *
 * Baribir birinchi kirishda almashtirish majburiy - bu parol
 * administrator qo'lidan o'tadi, ya'ni u endi maxfiy emas.
 */
export function parolYarat(): string {
  return (
    belgi(BOSH) +
    Array.from({ length: 6 }, () => belgi(HARFLAR)).join('') +
    belgi(RAQAMLAR) +
    belgi(RAQAMLAR)
  );
}
