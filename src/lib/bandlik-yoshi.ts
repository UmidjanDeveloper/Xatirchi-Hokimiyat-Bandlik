/**
 * ============================================================
 *  MEHNATGA LAYOQATLI YOSH
 *
 *  O'zbekistonda nafaqa yoshi ayol va erkak uchun har xil:
 *  ayol 55, erkak 60. Mehnat faoliyatining quyi chegarasi esa
 *  ikkalasi uchun 16.
 *
 *  Bu chegaralar bandlik markazining ishiga bevosita ta'sir
 *  qiladi: chegaradan tashqaridagi fuqaroga ish topib berish
 *  vazifasi qo'yilmaydi va uni ishsizlar ro'yxatiga qo'shish
 *  ko'rsatkichni buzadi.
 *
 *  Shuning uchun xodim anketani to'ldirayotgan paytda -
 *  yuborgandan keyin emas - buni ko'rishi kerak.
 *
 *  ── Muhim ──
 *
 *  Bu TO'SIQ emas, OGOHLANTIRISH. Nafaqa yoshidagi odam ham
 *  ishlashni xohlashi mumkin va uni xatlovdan chiqarib tashlash
 *  noto'g'ri bo'lardi: u oilaning bir a'zosi, uning sog'lig'i va
 *  daromadi hisobga olinishi kerak. Faqat "bandlik markazi unga
 *  ish topib bera olmaydi" degani aytiladi.
 * ============================================================
 */

/** Nafaqa yoshi */
export const NAFAQA_YOSHI = { ayol: 55, erkak: 60 } as const;

/** Mehnat faoliyatining quyi chegarasi */
export const ENG_KICHIK_YOSH = 16;

export type YoshHolati = 'yosh' | 'layoqatli' | 'nafaqa';

export interface YoshBahosi {
  holati: YoshHolati;
  yoshi: number;
  /** Kirill matn - `A()` orqali lotinga o'giriladi */
  xabar: string;
}

/**
 * Tug'ilgan yil va jinsga qarab bandlik imkoniyatini baholaydi.
 *
 * Yosh yil bo'yicha hisoblanadi, sanani emas: anketada faqat
 * tug'ilgan YIL so'raladi, chunki eshik oldida turgan odam aniq
 * sanani ko'pincha eslay olmaydi va pasportni har safar so'rash
 * xatlovni sekinlashtiradi.
 *
 * Natijada chegaradagi odamlarda bir yillik xatolik bo'lishi
 * mumkin - bu ogohlantirish uchun yetarli aniqlik.
 */
export function yoshniBaho(
  tugilganYili: number | null | undefined,
  jinsi: string | null | undefined
): YoshBahosi | null {
  if (!tugilganYili || !jinsi) return null;

  const yoshi = new Date().getFullYear() - tugilganYili;
  if (yoshi < 0 || yoshi > 120) return null;

  if (yoshi < ENG_KICHIK_YOSH) {
    return {
      holati: 'yosh',
      yoshi,
      xabar: `Ёши ${yoshi} — меҳнатга лаёқатли ёшдан кичик (${ENG_KICHIK_YOSH} ёш). Иш билан таъминлаш мумкин эмас, аммо оила аъзоси сифатида хатловда қолади.`,
    };
  }

  const ayolmi = jinsi === 'Ayol' || jinsi === 'Аёл';
  const chegara = ayolmi ? NAFAQA_YOSHI.ayol : NAFAQA_YOSHI.erkak;

  if (yoshi > chegara) {
    return {
      holati: 'nafaqa',
      yoshi,
      xabar: ayolmi
        ? `Ёши ${yoshi} — нафақа ёшида (аёллар учун ${chegara}). Бандлик маркази иш билан таъминлай олмайди. Ижтимоий ёрдам ва парвариш йўналишини кўринг.`
        : `Ёши ${yoshi} — нафақа ёшида (эркаклар учун ${chegara}). Бандлик маркази иш билан таъминлай олмайди. Ижтимоий ёрдам ва парвариш йўналишини кўринг.`,
    };
  }

  return {
    holati: 'layoqatli',
    yoshi,
    xabar: `Ёши ${yoshi} — меҳнатга лаёқатли ёшда.`,
  };
}
