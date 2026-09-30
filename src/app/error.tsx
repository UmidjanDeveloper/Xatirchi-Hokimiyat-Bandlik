'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, TriangleAlert } from 'lucide-react';

/**
 * ============================================================
 *  XATOLIK SAHIFASI
 *
 *  ── Qanday nuqsonni yopadi ──
 *
 *  Loyihada `error.tsx` UMUMAN yo'q edi. Ya'ni server
 *  komponentida xato chiqsa, Next.js ning O'Z ekrani
 *  ko'rinardi:
 *
 *    · inglizcha matn;
 *    · loyihaning rangi va shrifti yo'q;
 *    · «Application error: a client-side exception has
 *      occurred» degan jumla.
 *
 *  Buni dala telefonidagi mahalla xodimi ko'radi. U inglizcha
 *  o'qimaydi va bu jumla unga hech narsa aytmaydi — «sayt
 *  buzildi» degan xulosa chiqaradi va ishni to'xtatadi.
 *
 *  Yomoni: NIMA QILISH kerakligi yozilmagan. Aslida javob
 *  oddiy — «qayta urinib ko'ring» yoki «orqaga qayting».
 *
 *  ── Nega matn lotin alifbosida ──
 *
 *  Bu sahifa alifbo provayderidan TASHQARIDA ishlashi kerak:
 *  xato aynan o'sha provayderda bo'lsa, kirill matn ham
 *  chizilmay qolardi. Shuning uchun matn oddiy lotinda —
 *  bu holda ishlashi ishonchliroq.
 *
 *  ── Xatoning O'ZI ekranga chiqmaydi ──
 *
 *  Xato matnida so'rov tafsilotlari, jadval nomlari yoki
 *  ulanish satri bo'lishi mumkin. Ekranda faqat `digest`
 *  turadi — u logdagi yozuvni topish uchun yetarli va
 *  o'zida hech qanday ma'lumot saqlamaydi.
 * ============================================================
 */
export default function Xatolik({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /*
     * Log Vercel da qoladi. Bu YETARLI emas — xatolar
     * jurnali hali qurilmagan va `/vazifalar` da bu ochiq
     * aytilgan.
     */
    console.error('sahifada xatolik', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="karta w-full max-w-md p-6 text-center">
        <TriangleAlert className="mx-auto h-10 w-10 text-danger" aria-hidden="true" />

        <h1 className="mt-3 text-lg font-bold text-ink">Sahifa ochilmadi</h1>

        <p className="mt-2 text-sm text-ink-muted">
          Texnik xatolik yuz berdi. Kiritgan ma&apos;lumotingiz yo&apos;qolmadi —
          qoralama telefon xotirasida saqlanadi.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="tugma-asosiy inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Qayta urinib ko&apos;rish
          </button>
          <Link href="/" className="tugma-ikkilamchi justify-center px-4 py-2.5">
            Bosh sahifaga
          </Link>
        </div>

        {error.digest && (
          <p className="mt-4 text-xs text-ink-faint">
            Xatolik belgisi: <span className="font-mono">{error.digest}</span>
            <br />
            Administratorga aytsangiz, u logdan aynan shu yozuvni topadi.
          </p>
        )}
      </div>
    </div>
  );
}
