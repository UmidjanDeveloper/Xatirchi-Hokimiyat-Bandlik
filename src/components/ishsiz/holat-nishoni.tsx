import type { IshsizHolati } from '@prisma/client';

/**
 * ============================================================
 *  HAYOT SIKLI BOSQICHLARI
 *
 *  Bu ro'yxat platformaning o'zagi. Hokim "nechta ishsiz bor"
 *  degan raqamni allaqachon biladi (svod jadvalida 3 345). Unga
 *  kerak bo'lgani - shu 3 345 tadan nechtasi qaysi bosqichda
 *  turgani va qayerda tiqilib qolgani.
 *
 *  Ranglar `globals.css` dagi `--step-*` tokenlaridan keladi va
 *  butun ilova bo'ylab bir xil ma'no bildiradi: voronkada ham,
 *  ro'yxatdagi nishonda ham, diagrammada ham.
 * ============================================================
 */

export const ISHSIZ_HOLATI: Record<
  IshsizHolati,
  { kirill: string; lotin: string; bosqich: number; sinf: string }
> = {
  ANIQLANDI: {
    kirill: 'Аниқланди',
    lotin: 'Aniqlandi',
    bosqich: 1,
    sinf: 'bg-[color-mix(in_srgb,var(--step-1)_16%,transparent)] text-[var(--step-1)]',
  },
  SUHBAT_OTKAZILDI: {
    kirill: 'Суҳбат ўтказилди',
    lotin: 'Suhbat o‘tkazildi',
    bosqich: 2,
    sinf: 'bg-[color-mix(in_srgb,var(--step-2)_16%,transparent)] text-[var(--step-2)]',
  },
  TAKLIF_BERILDI: {
    kirill: 'Таклиф берилди',
    lotin: 'Taklif berildi',
    bosqich: 3,
    sinf: 'bg-[color-mix(in_srgb,var(--step-3)_16%,transparent)] text-[var(--step-3)]',
  },
  JOYLASHTIRILDI: {
    kirill: 'Жойлаштирилди',
    lotin: 'Joylashtirildi',
    bosqich: 4,
    sinf: 'bg-[color-mix(in_srgb,var(--step-4)_18%,transparent)] text-[var(--step-4)]',
  },
  TASDIQLANDI: {
    kirill: 'Тасдиқланди',
    lotin: 'Tasdiqlandi',
    bosqich: 5,
    sinf: 'bg-[color-mix(in_srgb,var(--step-5)_18%,transparent)] text-[var(--step-5)]',
  },
  RAD_ETDI: {
    kirill: 'Рад этди',
    lotin: 'Rad etdi',
    // Voronkadan tashqarida: bu bosqich emas, chiqish yo'li.
    // Shuning uchun 0 - hech qaysi bosqich rangini olmaydi.
    bosqich: 0,
    sinf: 'bg-danger-bg text-danger',
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

export function HolatNishoni({
  holati,
  lotin = false,
}: {
  holati: IshsizHolati;
  lotin?: boolean;
}) {
  const h = ISHSIZ_HOLATI[holati];
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${h.sinf}`}>
      {lotin ? h.lotin : h.kirill}
    </span>
  );
}
