/**
 * Sessiya cookie'sining nomi - alohida faylda.
 *
 * `middleware.ts` Edge muhitida ishlaydi va u yerda Node'ning
 * `crypto` moduli yo'q. Agar nomni `auth.ts` dan olsak, o'sha fayl
 * butunlay Edge to'plamiga tortiladi va build ogohlantirish beradi.
 * Bitta doimiy uchun shu kichkina fayl yetarli.
 */
export const SESSION_COOKIE = 'bandlik_sessiya';
