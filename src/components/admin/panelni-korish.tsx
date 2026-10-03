'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ScanEye } from 'lucide-react';

export interface KorishHisobi {
  id: string;
  /** Tanlash ro'yxatida ko'rinadigan yozuv: ism (va mahalla) */
  yozuv: string;
}

/**
 * Rol panelini "ko'zi bilan" ko'rish: hisob tanlanadi, tugma bosiladi.
 *
 * Administrator o'z hisobidan CHIQMAYDI: cookie ichiga "ko'z" yoziladi va
 * sayt tanlangan xodimning roli bilan chiziladi (`korish-rejimi.ts`).
 * Bu rejimda yozish amallari to'silgan; tepada doimiy lenta turadi.
 *
 * Ro'yxatdagi "Ko'zi bilan ko'rish" tugmasi (`xodim-royxati.tsx`) bilan bir
 * xil so'rov: `POST /api/admin/korish`. Farqi - bu yerda hisobni ro'yxatdan
 * qidirib o'tirmaysiz, rol kartasidan bir bosishda o'tasiz.
 */
export function PanelniKorish({ hisoblar }: { hisoblar: KorishHisobi[] }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [tanlangan, setTanlangan] = useState(hisoblar[0]?.id ?? '');
  const [ishlayapti, setIshlayapti] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function och() {
    if (!tanlangan || ishlayapti) return;
    setXato(null);
    setIshlayapti(true);
    try {
      const javob = await fetch('/api/admin/korish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tanlangan }),
      });
      const natija = (await javob.json().catch(() => ({}))) as { xabar?: string };
      if (!javob.ok) {
        setXato(natija.xabar ?? tr('Кўриш режимини ёқиб бўлмади'));
        return;
      }
      /* `/` ходимнинг ЎЗ бош саҳифасига юборади; `refresh()` — эски cookie билан чизилган кэш учун */
      router.push('/');
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setIshlayapti(false);
    }
  }

  if (hisoblar.length === 0) return null;

  return (
    <div className="space-y-2">
      {hisoblar.length > 1 && (
        <select
          value={tanlangan}
          onChange={(e) => setTanlangan(e.target.value)}
          aria-label={tr('Қайси ҳисоб кўзи билан кўрилсин')}
          className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
        >
          {hisoblar.map((h) => (
            <option key={h.id} value={h.id}>
              {tr(h.yozuv)}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={och}
        disabled={ishlayapti || !tanlangan}
        className="tugma-asosiy flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {ishlayapti ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanEye className="h-4 w-4" aria-hidden="true" />}
        {tr('Панелини кўриш')}
      </button>
      {xato && (
        <p className="quti-xato text-xs" role="alert">
          {xato}
        </p>
      )}
    </div>
  );
}
