'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from './umumiy';

/**
 * Qadam natijasining dalili (hujjat, ma'lumotnoma, xabar...).
 *
 * "Bajarildi" belgisi o'zi hech narsani isbotlamaydi. Dalil yozilmagan
 * bajarilgan qadam ro'yxatda "dalil kiritilmagan" deb turadi - bu xato
 * emas, lekin rahbar va hokim buni ko'radi.
 */
export function QadamDalili({
  topshiriqId,
  joriy,
  tahrirlashMumkin,
}: {
  topshiriqId: string;
  joriy: string | null;
  tahrirlashMumkin: boolean;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [qiymat, setQiymat] = useState(joriy ?? '');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function saqla() {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/chora-tadbirlar/${topshiriqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natijaDalili: qiymat.trim() || null }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setOchiq(false);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  if (!ochiq) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        {joriy ? (
          <span className="text-ink-muted">
            {tr('Далил:')} {joriy}
          </span>
        ) : (
          <span className="text-warn">{tr('Далил киритилмаган')}</span>
        )}
        {tahrirlashMumkin && (
          <button
            type="button"
            onClick={() => setOchiq(true)}
            className="min-h-8 rounded px-1.5 font-medium text-accent hover:underline"
          >
            {joriy ? tr('Ўзгартириш') : tr('Далил қўшиш')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}
      <label htmlFor={`qd-${topshiriqId}`} className="block text-xs font-medium text-ink-muted">
        {tr('Натижани тасдиқловчи далил')}
      </label>
      <input
        id={`qd-${topshiriqId}`}
        value={qiymat}
        onChange={(e) => setQiymat(e.target.value)}
        className={MAYDON}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={saqla}
          disabled={yuborilmoqda}
          className="tugma-asosiy flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold"
        >
          {yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {tr('Сақлаш')}
        </button>
        <button
          type="button"
          onClick={() => setOchiq(false)}
          className="tugma-ikkilamchi rounded-md px-3 py-2 text-xs"
        >
          {tr('Бекор қилиш')}
        </button>
      </div>
    </div>
  );
}
