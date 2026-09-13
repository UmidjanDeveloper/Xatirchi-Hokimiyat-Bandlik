'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Loader2, Lock } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * Эълонни ёпиш ва қайта очиш.
 *
 * Ўчириш ЙЎҚ: ёпилган эълон ҳисоботда қолади, акс ҳолда «бу ой
 * нечта иш ўрни таклиф қилинди» деган саволга жавоб бўлмасди.
 */
export function OrinHolatiTugmasi({ orinId, faol }: { orinId: string; faol: boolean }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function almashtir() {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/ish-orinlari/${orinId}`, {
        method: faol ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        ...(faol ? {} : { body: JSON.stringify({ faol: true }) }),
      });
      const natija = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(natija.xabar ?? tr('Бажарилмади'));
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
    <div className="min-w-0">
      <button
        type="button"
        onClick={almashtir}
        disabled={yuborilmoqda}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-45"
      >
        {yuborilmoqda ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : faol ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <CircleCheck className="h-3.5 w-3.5" />
        )}
        {faol ? tr('Эълонни ёпиш') : tr('Қайта очиш')}
      </button>
      {xato && <div className="quti-xato mt-2">{xato}</div>}
    </div>
  );
}
