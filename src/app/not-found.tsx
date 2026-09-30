import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

/**
 * ============================================================
 *  SAHIFA TOPILMADI
 *
 *  ── Nega kerak ──
 *
 *  Bu ekran loyihada YO'Q edi. Xodim eski havolani ochsa yoki
 *  o'chirilgan xonadonga o'tsa, Next.js ning oddiy «404 This
 *  page could not be found» sahifasi chiqardi: inglizcha,
 *  loyihaning rangi va menyusi yo'q.
 *
 *  Xodim uchun bu «sayt buzildi» degan xulosa beradi —
 *  aslida shunchaki havola eskirgan.
 *
 *  ── Nega ORQAGA emas, BOSH SAHIFA ──
 *
 *  «Orqaga» tugmasi xodimni o'sha yaroqsiz havolaga qaytarib
 *  yuborishi mumkin. Bosh sahifa esa rolga qarab to'g'ri
 *  joyga olib boradi.
 * ============================================================
 */
export default function Topilmadi() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="karta w-full max-w-md p-6 text-center">
        <FileQuestion className="mx-auto h-10 w-10 text-ink-faint" aria-hidden="true" />

        <h1 className="mt-3 text-lg font-bold text-ink">Sahifa topilmadi</h1>

        <p className="mt-2 text-sm text-ink-muted">
          Bu havola eskirgan yoki yozuv o&apos;chirilgan bo&apos;lishi mumkin.
        </p>

        <Link
          href="/"
          className="tugma-asosiy mt-5 inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold"
        >
          Bosh sahifaga
        </Link>
      </div>
    </div>
  );
}
