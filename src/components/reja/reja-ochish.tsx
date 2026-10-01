'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Route } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON, useSaqlanmaganOgohlantirish } from './umumiy';

/**
 * Oila uchun reja ochish.
 *
 * Boshlang'ich holat xatlovdan avtomatik to'ldiriladi, lekin xodim
 * uni tahrir qiladi: u oila bilan gaplashgan va xatlovda yo'q narsani
 * biladi. Manba va sana matn bilan birga saqlanadi.
 */
export function RejaOchish({
  householdId,
  matn,
  manba,
  sana,
}: {
  householdId: string;
  matn: string;
  manba: string;
  sana: string;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [holat, setHolat] = useState(matn);
  const [manbaMatni, setManbaMatni] = useState(manba);
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  useSaqlanmaganOgohlantirish(ochiq && (holat !== matn || manbaMatni !== manba));

  async function yubor() {
    if (yuborilmoqda) return;
    if (holat.trim().length < 5) return setXato(tr('Бошланғич ҳолатни ёзинг'));
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch('/api/rejalar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          boshlangichHolat: holat.trim(),
          boshlangichManba: manbaMatni.trim() || null,
          boshlangichSana: sana,
        }),
      });
      const d = await javob.json().catch(() => ({}));
      /* 409 va `id` bor: parallel ochilgan, mavjud rejaga o'tamiz */
      if (javob.status === 409 && d.id) {
        router.push(`/rejalar/${d.id}`);
        return;
      }
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      router.push(`/rejalar/${d.id}`);
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  if (!ochiq) {
    return (
      <button
        type="button"
        onClick={() => setOchiq(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Route className="h-4 w-4" aria-hidden="true" />
        {tr('Оилавий ривожланиш режасини тузиш')}
      </button>
    );
  }

  return (
    <div className="karta space-y-3 p-4">
      <h3 className="text-sm font-bold text-ink">{tr('Янги оилавий режа')}</h3>
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor="ro-holat" className="text-sm font-medium text-ink">
          {tr('Бошланғич ҳолат')}
        </label>
        <textarea
          id="ro-holat"
          rows={5}
          value={holat}
          onChange={(e) => setHolat(e.target.value)}
          className={MAYDON}
        />
        <p className="text-xs text-ink-faint">
          {tr('Матн хатловдан олинди. Оила билан гаплашганингизда билган нарсаларингизни қўшинг.')}
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="ro-manba" className="text-sm font-medium text-ink">
          {tr('Маълумот манбаи')}
        </label>
        <input
          id="ro-manba"
          value={manbaMatni}
          onChange={(e) => setManbaMatni(e.target.value)}
          className={MAYDON}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={yubor}
          disabled={yuborilmoqda}
          className="tugma-asosiy flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold"
        >
          {yuborilmoqda && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {tr('Режа тузиш')}
        </button>
        <button
          type="button"
          onClick={() => setOchiq(false)}
          className="tugma-ikkilamchi rounded-md px-4 py-2.5 text-sm"
        >
          {tr('Бекор қилиш')}
        </button>
      </div>
    </div>
  );
}
