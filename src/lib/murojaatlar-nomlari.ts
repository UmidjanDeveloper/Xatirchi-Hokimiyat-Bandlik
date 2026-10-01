import type { MurojaatHolati, MurojaatKanali, MurojaatNatijasi } from '@prisma/client';

/**
 * Murojaatlar uchun nomlar va doimiylar.
 *
 * Bazaga ulanmaydi: brauzer komponentlari ham shu yerdan oladi
 * (`murojaatlar.ts` esa prisma ni import qiladi va mijozga o'tmasligi kerak).
 */

export const KANAL_NOMI: Record<MurojaatKanali, string> = {
  QABULXONA: 'Қабулхона',
  TELEFON: 'Телефон',
  UYMA_UY: 'Уйма-уй юрганда',
  XAT: 'Ёзма хат',
  TELEGRAM: 'Телеграм',
  BOSHQA: 'Бошқа',
};

export const MUROJAAT_HOLATI_NOMI: Record<MurojaatHolati, string> = {
  YANGI: 'Янги',
  JARAYONDA: 'Кўриб чиқилмоқда',
  JAVOB_BERILDI: 'Жавоб берилди',
  YOPILDI: 'Ёпилди',
};

export const NATIJA_NOMI: Record<MurojaatNatijasi, string> = {
  HAL_QILINDI: 'Ҳал қилинди',
  TUSHUNTIRILDI: 'Тушунтирилди',
  YONALTIRILDI: 'Бошқа ташкилотга йўналтирилди',
  RAD_ETILDI: 'Рад этилди',
  VOZ_KECHDI: 'Мурожаатчи ўзи воз кечди',
};

/**
 * Javob muddatining DASTLABKI qiymati (formada oldindan to'ldiriladi).
 *
 * Bu ichki odat, QONUNIY MUDDAT EMAS: qonuniy muddatni tashkilot belgilaydi
 * va xodim uni tekshirib o'zgartiradi. Server muddatni har doim aniq
 * so'raydi, o'zi taxmin qilib qo'ymaydi.
 */
export const ODATIY_JAVOB_KUNI = 15;

/** Muddatga shuncha kun qolsa - "yaqin" */
export const YAQIN_MUDDAT_KUNI = 3;

/** Qabul sanasi shundan eski bo'lishi mumkin emas (xato yozuvdan himoya) */
export const MAKS_ESKI_KUN = 400;

/** Javob muddati qabul sanasidan shundan uzoq bo'lishi mumkin emas */
export const MAKS_MUDDAT_KUNI = 180;

/** Maxraj shundan kichik bo'lsa foiz o'ylantiradi */
export const MUROJAAT_KICHIK_NAMUNA = 10;

export const MUROJAAT_HISOBLASH_USULI = [
  'Кўрсаткичлар фақат қайд этилган мурожаатлардан ҳисобланади: қайд этилмаган мурожаат «йўқ» деб ҳисобланмайди (фуқаро ёзма шахсий кабинет орқали мурожаат қилмайди — уни ходим ёзади).',
  'Муддат — ходим тасдиқлаган «жавоб муддати». Дастлабки қиймат ички одат, қонуний муддат эмас.',
  'Муддатида жавоб = жавоб санаси муддат кунидан кеч эмас (Тошкент куни бўйича). Улуши = муддатида / жавоб берилганлар.',
  'Муддатни узайтириш сабаб билан тарихга ёзилади; узайтирилган муддат бўйича «муддатида» ҳисобланади, шунинг учун узайтирилганлар сони алоҳида кўрсатилади.',
  'Қайта очилганлар сони — жавоб берилган, лекин қайта кўрилган мурожаатлар: у жавоб сифати ҳақида белги.',
];

export function murojaatFoizi(son: number, maxraj: number): number | null {
  if (!Number.isFinite(son) || !Number.isFinite(maxraj) || maxraj <= 0) return null;
  return Math.round((son / maxraj) * 100);
}
