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
  { kirill: string; lotin: string; bosqich: number }
> = {
  ANIQLANDI: {
    kirill: 'Аниқланди',
    lotin: 'Aniqlandi',
    bosqich: 1,
  },
  SUHBAT_OTKAZILDI: {
    kirill: 'Суҳбат ўтказилди',
    lotin: 'Suhbat o‘tkazildi',
    bosqich: 2,
  },
  TAKLIF_BERILDI: {
    kirill: 'Таклиф берилди',
    lotin: 'Taklif berildi',
    bosqich: 3,
  },
  JOYLASHTIRILDI: {
    kirill: 'Жойлаштирилди',
    lotin: 'Joylashtirildi',
    bosqich: 4,
  },
  TASDIQLANDI: {
    kirill: 'Тасдиқланди',
    lotin: 'Tasdiqlandi',
    bosqich: 5,
  },
  RAD_ETDI: {
    kirill: 'Рад этди',
    lotin: 'Rad etdi',
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

/**
 * Holat nishoni: rangli nuqta + matn.
 *
 * Matn oddiy siyoh rangida yoziladi, bosqich rangida emas. Ikki
 * sabab bor. Birinchisi - kontrast: bosqich qatorining ochiq uchi
 * (#86b6ef) oq fonda matn sifatida o'qilmaydi. Ikkinchisi va
 * muhimrogi - rang hech qachon YOLG'IZ ma'no tashimasligi kerak:
 * rangni ajrata olmaydigan odam ham nishonni o'qiy olsin.
 */
export function HolatNishoni({
  holati,
  lotin = false,
}: {
  holati: IshsizHolati;
  lotin?: boolean;
}) {
  const h = ISHSIZ_HOLATI[holati];
  const radEtdi = holati === 'RAD_ETDI';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold ${
        radEtdi ? 'bg-danger-bg text-danger' : 'bg-surface-muted text-ink-muted'
      }`}
    >
      {!radEtdi && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: `var(--step-${h.bosqich})` }}
          aria-hidden="true"
        />
      )}
      {lotin ? h.lotin : h.kirill}
    </span>
  );
}
