import type { BuyurtmaHolati } from '@prisma/client';

/**
 * Mahalliy buyurtmalar uchun nomlar va doimiylar.
 *
 * Bazaga ulanmaydi: brauzer komponentlari ham shu yerdan oladi
 * (`buyurtmalar.ts` esa prisma ni import qiladi va mijozga o'tmasligi kerak).
 */

export const BUYURTMA_HOLATI_NOMI: Record<BuyurtmaHolati, string> = {
  YANGI: 'Янги',
  TAYINLANDI: 'Ижрочи белгиланди',
  KELISHILDI: 'Нарх келишилди',
  BAJARILDI: 'Бажарилди',
  BEKOR: 'Бекор қилинган',
};

/** Ikki tomonlama tasdiq darajasi (bajarilgan buyurtma uchun) */
export type BuyurtmaTasdigi = 'IKKI_TOMONLAMA' | 'NIZO' | 'BIR_TOMONLAMA' | 'TASDIQSIZ';

export const TASDIQ_NOMI: Record<BuyurtmaTasdigi, string> = {
  IKKI_TOMONLAMA: 'Икки томонлама тасдиқланган',
  NIZO: 'Низо: бир томон эътироз билдирган',
  BIR_TOMONLAMA: 'Бир томон тасдиқлаган, иккинчисидан ҳали йўқ',
  TASDIQSIZ: 'Ҳеч бир томон тасдиқламаган',
};

/** Bajarilganiga shuncha kun o'tib ham ikki tomon tasdiqlamasa - "tasdiqsiz" deb ajratiladi */
export const TASDIQ_KUTISH_KUNI = 14;

/** Vazifalar taxtasida: bajarilganiga shuncha kun o'tgach tasdiq so'rash eslatiladi */
export const TASDIQ_ESLATMA_KUNI = 3;

/** Maxraj shundan kichik bo'lsa foiz o'ylantiradi */
export const BUYURTMA_KICHIK_NAMUNA = 10;

export const PLATFORMA_OGOHLANTIRISHI =
  'Платформа тўловни юритмайди ва текширмайди: келишилган нарх фақат ёзув учун. Буюртма ва таклифларни фақат ходим кўради ва бошқаради.';

export const BUYURTMA_HISOBLASH_USULI = [
  'Кўрсаткичлар фақат қайд этилган ёзувлардан ҳисобланади; ёзилмаган нарса «йўқ» деб ҳисобланмайди.',
  'Бекор қилинган буюртмалар ҳисобга кирмайди.',
  '«Бажарилди» ходимнинг қайди холос. Буюртма ижрочи ВА буюртмачи алоҳида тасдиқлагандагина «икки томонлама тасдиқланган» бўлади.',
  'Бир томон эътироз билдирса — «низо»: у муваффақиятли деб ҳисобланмайди ва алоҳида кўрсатилади.',
  'Келишилган нарх йиғиндиси фақат икки томонлама тасдиқланган буюртмалар бўйича. У тўлов амалга ошганини англатмайди.',
];

export const SERVIS_NOMI = 'Маҳаллий буюртмалар';

/** Foiz: maxraj 0 bo'lsa `null` ("0%" yozilmaydi) */
export function buyurtmaFoizi(son: number, maxraj: number): number | null {
  if (!Number.isFinite(son) || !Number.isFinite(maxraj) || maxraj <= 0) return null;
  return Math.round((son / maxraj) * 100);
}
