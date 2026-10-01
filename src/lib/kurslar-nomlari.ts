import type { KursYozuvHolati } from '@prisma/client';

/**
 * Kurslar uchun nomlar va doimiylar.
 *
 * Bazaga ulanmaydi: brauzer komponentlari ham shu yerdan oladi
 * (`kurslar.ts` esa prisma ni import qiladi va mijozga o'tmasligi kerak).
 */

/** Kurs holati sanalardan hisoblanadi, bazada saqlanmaydi */
export type KursHolati = 'QABUL' | 'JARAYONDA' | 'TUGAGAN' | 'BEKOR';

export const KURS_HOLATI_NOMI: Record<KursHolati, string> = {
  QABUL: 'Қабул очиқ',
  JARAYONDA: 'Жараёнда',
  TUGAGAN: 'Тугаган',
  BEKOR: 'Бекор қилинган',
};

export const YOZUV_HOLATI_NOMI: Record<KursYozuvHolati, string> = {
  YOLLANDI: 'Ёзилган',
  BOSHLADI: 'Ўқимоқда',
  TAMOMLADI: 'Тамомлади',
  TASHLADI: 'Ташлаб кетди',
  KELMADI: 'Дарсга келмади',
  BEKOR: 'Бекор қилинган',
};

/** Яккама-якка ўтиб бўлмайдиган (якуний) ҳолатлар */
export const YOZUV_YAKUNIY: KursYozuvHolati[] = ['TASHLADI', 'KELMADI', 'BEKOR'];

/** Ўрин банд қиладиган ҳолатлар */
export const YOZUV_BAND_QILADI: KursYozuvHolati[] = ['YOLLANDI', 'BOSHLADI', 'TAMOMLADI'];

/**
 * Tashkilotdan tekshirilmaganiga shuncha kun o'tgan kurs ma'lumoti
 * ESKIRGAN hisoblanadi: yangi tavsiya sifatida chiqmaydi va unga yangi
 * yozuv qo'shilmaydi, toki xodim tashkilotdan qayta so'rab "Tekshirildi"
 * bosmaguncha.
 */
export const ESKIRISH_KUNI = 60;

/**
 * Kursni tamomlaganlarning ish natijasi uchun kutish oynasi: bu muddat
 * o'tmaguncha ish topmagani "natija yo'q" emas, "hali erta".
 */
export const NATIJA_KUTISH_KUNI = 60;

/** Kurs tugagach holat shuncha kun belgilanmasa - "yangilanmagan" */
export const YANGILANMAGAN_KUNI = 7;

/** Maxraj shundan kichik bo'lsa foiz o'ylantiradi: "namuna kichik" deyiladi */
export const KICHIK_NAMUNA = 10;

/** Davomiylik chegarasi (kun) */
export const KURS_MAKS_KUN = 400;

export const KAFOLAT_OGOHLANTIRISHI =
  'Курсни тамомлаш ишга қабул қилинишни кафолатламайди: бу фақат талабга яқинлашиш имконияти.';

export const HISOBLASH_USULI = [
  'Кўрсаткичлар фақат қайд этилган ёзувлардан ҳисобланади; ёзилмаган нарса «йўқ» деб ҳисобланмайди.',
  'Бекор қилинган ёзувлар ҳисобга кирмайди.',
  `Тамомлаш улуши = тамомлаганлар / (тамомлаганлар + ташлаганлар). Ҳали ўқиётганлар ва ҳолати янгиланмаганлар махражга кирмайди.`,
  `Иш натижаси фақат курсни тамомлаганига ${NATIJA_KUTISH_KUNI} кундан ортиқ бўлганлар бўйича: ундан ёш бўлганлар «ҳали эрта» деб алоҳида кўрсатилади.`,
  '«Тасдиқланган иш» — курсдан кейин бошланган ва далил билан тасдиқланган жойлашиш. Далили йўқ ёки кутилаётгани алоҳида кўрсатилади.',
  'Давомат фақат қатнашган ва жами дарс кунлари иккаласи маълум бўлган ёзувлар бўйича.',
];

/** Foiz: maxraj 0 bo'lsa `null` (bo'sh qoldiriladi, "0%" yozilmaydi) */
export function kursFoizi(son: number, maxraj: number): number | null {
  if (!Number.isFinite(son) || !Number.isFinite(maxraj) || maxraj <= 0) return null;
  return Math.round((son / maxraj) * 100);
}
