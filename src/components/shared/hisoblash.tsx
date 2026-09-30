import Link from 'next/link';
import { Calculator } from 'lucide-react';

/**
 * ============================================================
 *  RAQAM QANDAY HISOBLANGAN
 *
 *  ── Qanday nuqsonni yopadi ──
 *
 *  Hisobotdagi raqam yalang'och turardi: «19». Uni ko'rgan
 *  odam ikki savol beradi va ikkovining ham javobi yo'q edi:
 *
 *    1. Bu raqam QANDAY chiqdi?
 *    2. Uning ostida QAYSI yozuvlar bor?
 *
 *  Javob yo'qligining oqibati texnik emas, TASHKILIY: hokim
 *  yig'ilishda raqamni aytadi, kimdir «bu noto'g'ri» deydi,
 *  va bahsni hal qiladigan hech narsa qolmaydi. Keyingi
 *  safar hokim o'sha raqamga ishonmaydi.
 *
 *  Yomoni: raqam JIMGINA buzilsa, buni hech kim sezmaydi.
 *  Hisoblash usuli yozilgan bo'lsa, xodim «bu yerda arxivga
 *  o'tganlar ham sanalgan» degan xatoni o'zi topadi.
 *
 *  ── Nega `details`, tooltip emas ──
 *
 *  `<details>` hech qanday JavaScript talab qilmaydi:
 *
 *    · sust telefonda darhol ishlaydi;
 *    · klaviatura bilan ochiladi (Tab va Enter);
 *    · ekran o'quvchi «ochilmagan ro'yxat» deb o'qiydi;
 *    · sahifa bosib chiqarilganda ham matn joyida qoladi.
 *
 *  Tooltip esa sensorli ekranda umuman ishlamaydi — barmoq
 *  «hover» qilmaydi.
 *
 *  ── Havola RUXSAT doirasida ──
 *
 *  «Yozuvlarni ko'rish» havolasi oddiy sahifaga olib boradi
 *  va o'sha sahifa o'z qo'riqchisiga ega. Ya'ni mahalla
 *  xodimi havolani bossa ham, faqat o'z MFY sining
 *  yozuvlarini ko'radi — bu yerda alohida tekshiruv kerak
 *  emas va qo'shilmaydi ham: ikkita joyda tekshirish
 *  ikkita har xil qoida degani.
 * ============================================================
 */
export function Hisoblash({
  usuli,
  manbasi,
  yol,
  yolNomi,
  ogohlik,
  tr,
}: {
  /** Qanday hisoblangan — formula yoki shart */
  usuli: string;
  /** Qaysi ma'lumotdan olingan */
  manbasi: string;
  /** Ostidagi yozuvlarga havola */
  yol?: string;
  yolNomi?: string;
  /** Raqamga ishonishda nimani bilish kerak */
  ogohlik?: string;
  tr: (m: string) => string;
}) {
  return (
    <details className="group mt-1 text-xs">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-ink-faint transition-colors hover:text-accent">
        <Calculator className="h-3 w-3" aria-hidden="true" />
        <span className="underline decoration-dotted underline-offset-2">
          {tr('Қандай ҳисобланган')}
        </span>
      </summary>

      <div className="mt-2 space-y-1.5 rounded-md border border-line bg-surface-muted p-2.5">
        <p className="text-ink-muted">
          <span className="font-semibold text-ink">{tr('Ҳисоблаш')}:</span> {tr(usuli)}
        </p>
        <p className="text-ink-muted">
          <span className="font-semibold text-ink">{tr('Манба')}:</span> {tr(manbasi)}
        </p>
        {ogohlik && (
          <p className="text-warn">
            <span className="font-semibold">{tr('Диққат')}:</span> {tr(ogohlik)}
          </p>
        )}
        {yol && (
          <Link
            href={yol}
            data-bosiladigan="ha"
            className="font-semibold text-accent underline decoration-dotted underline-offset-2"
          >
            {tr(yolNomi ?? 'Ёзувларни кўриш')}
          </Link>
        )}
      </div>
    </details>
  );
}
