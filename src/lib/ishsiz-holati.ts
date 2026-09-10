import type { IshsizHolati } from '@prisma/client';

/**
 * ============================================================
 *  HAYOT SIKLI BOSQICHLARI - MA'LUMOT
 *
 *  Bu ro'yxat platformaning o'zagi. Hokim "nechta ishsiz bor"
 *  degan raqamni allaqachon biladi (svod jadvalida 3 345). Unga
 *  kerak bo'lgani - shu 3 345 tadan nechtasi qaysi bosqichda
 *  turgani va qayerda tiqilib qolgani.
 *
 *  Ranglar `globals.css` dagi `--step-*` tokenlaridan keladi va
 *  butun ilova bo'ylab bir xil ma'no bildiradi: voronkada ham,
 *  ro'yxatdagi nishonda ham, diagrammada ham.
 *
 *  DIQQAT: bu fayl ODDIY modul, brauzer komponenti EMAS.
 *
 *  Ilgari bu ma'lumot `holat-nishoni.tsx` ichida turardi. O'sha
 *  fayl brauzer komponentiga aylantirilgach, `VORONKA` massivi
 *  ham brauzer tomoniga o'tib ketdi va server uni `.map()` qila
 *  olmay qoldi - hokim paneli butunlay ochilmasdi. Ma'lumot
 *  komponentdan alohida turishi shuning uchun muhim.
 * ============================================================
 */

export const ISHSIZ_HOLATI: Record<IshsizHolati, { kirill: string; bosqich: number }> = {
  ANIQLANDI: { kirill: 'Аниқланди', bosqich: 1 },
  SUHBAT_OTKAZILDI: { kirill: 'Суҳбат ўтказилди', bosqich: 2 },
  TAKLIF_BERILDI: { kirill: 'Таклиф берилди', bosqich: 3 },
  JOYLASHTIRILDI: { kirill: 'Жойлаштирилди', bosqich: 4 },
  TASDIQLANDI: { kirill: 'Тасдиқланди', bosqich: 5 },
  RAD_ETDI: {
    kirill: 'Рад этди',
    // Voronkadan tashqarida: bu bosqich emas, chiqish yo'li.
    // Shuning uchun 0 - hech qaysi bosqich rangini olmaydi.
    bosqich: 0,
  },
};

/** Voronka bosqichlari - RAD_ETDI tashqarida qoladi */
export const VORONKA: IshsizHolati[] = [
  'ANIQLANDI',
  'SUHBAT_OTKAZILDI',
  'TAKLIF_BERILDI',
  'JOYLASHTIRILDI',
  'TASDIQLANDI',
];
