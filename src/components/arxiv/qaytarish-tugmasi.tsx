'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * Arxivdan qaytarish tugmasi.
 *
 * Bu yerda tasdiqlash oynasi YO'Q — ataylab. Qaytarish xavfsiz
 * amal: u hech narsani yo'qotmaydi, aksincha tiklaydi. Ortiqcha
 * savol faqat to'sqinlik qilardi.
 */
export function QaytarishTugmasi({
  turi,
  id,
  nomi,
}: {
  turi: 'xonadon' | 'fuqaro';
  id: string;
  nomi: string;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function qaytar() {
    if (yuborilmoqda) return;
    setYuborilmoqda(true);
    setXato(null);
    try {
      const javob = await fetch('/api/arxiv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turi, id }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Қайтариб бўлмади'));
        return;
      }
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void qaytar()}
        disabled={yuborilmoqda}
        aria-label={`${tr('Қайтариш')}: ${nomi}`}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-ok hover:bg-ok-bg hover:text-ok disabled:opacity-50"
      >
        {yuborilmoqda ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {tr('Қайтариш')}
      </button>
      {xato && (
        <p className="text-[11px] text-danger" role="alert">
          {xato}
        </p>
      )}
    </div>
  );
}
