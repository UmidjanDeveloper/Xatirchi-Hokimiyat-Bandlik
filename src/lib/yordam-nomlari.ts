/**
 * Yordam dasturlari uchun nomlar va doimiylar.
 *
 * Bazaga ulanmaydi: brauzer komponentlari ham shu yerdan oladi
 * (`yordam-dasturlari.ts` esa prisma ni import qiladi va mijozga o'tmasligi kerak).
 */

/** Dastur holati sanalardan va tekshiruvdan hisoblanadi, bazada saqlanmaydi */
export type DasturHolati = 'AMALDA' | 'ESKIRGAN' | 'MUDDATI_TUGAGAN' | 'HALI_BOSHLANMAGAN' | 'YOPIQ';

export const DASTUR_HOLATI_NOMI: Record<DasturHolati, string> = {
  AMALDA: 'Амалда',
  ESKIRGAN: 'Маълумоти эскирган',
  MUDDATI_TUGAGAN: 'Муддати тугаган',
  HALI_BOSHLANMAGAN: 'Ҳали бошланмаган',
  YOPIQ: 'Ёпилган',
};

/**
 * Dastur manbadan oxirgi marta shuncha kundan oldin tekshirilgan bo'lsa -
 * ESKIRGAN: tavsiya sifatida chiqmaydi, xodim manbadan qayta tekshirib
 * "Manbadan tekshirildi" bosmaguncha.
 */
export const YORDAM_ESKIRISH_KUNI = 90;

/** Muddati tugashiga shuncha kun qolsa - vazifalar taxtasida ogohlantiriladi */
export const YORDAM_MUDDAT_OGOHI_KUNI = 14;

export const YORDAM_OGOHLANTIRISHI =
  'Дастур маълумоти расмий манбадан ходим томонидан қўлда киритилган. Бу фуқаронинг ҳуқуқи ёки миқдорига кафолат эмас: талабларни манбадан текширинг ва ходим ўзи қарор қилади.';
