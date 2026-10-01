'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from './umumiy';

/**
 * Rejani yopish: yakunlandi yoki to'xtatildi.
 *
 * Qaytib bo'lmaydi va sabab majburiy: oilada yangi vaziyat bo'lsa
 * yangi reja ochiladi, eskisi tarix bo'lib qoladi. Natija dalili
 * ixtiyoriy, lekin so'raladi - hokim "nima qilindi" deb so'raydi.
 */
export function RejaYopish({ rejaId }: { rejaId: string }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [holat, setHolat] = useState<'TUGALLANDI' | 'TOXTATILDI'>('TUGALLANDI');
  const [izoh, setIzoh] = useState('');
  const [dalil, setDalil] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function yubor() {
    if (yuborilmoqda) return;
    if (izoh.trim().length < 5) return setXato(tr('Ёпиш сабабини ёзинг'));
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/rejalar/${rejaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holati: holat,
          yopilishIzohi: izoh.trim(),
          natijaDalili: dalil.trim() || null,
        }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      router.refresh();
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
        className="tugma-ikkilamchi rounded-md px-4 py-2.5 text-sm"
      >
        {tr('Режани ёпиш')}
      </button>
    );
  }

  return (
    <div className="karta space-y-3 p-4">
      <h3 className="text-sm font-bold text-ink">{tr('Режани ёпиш')}</h3>
      <p className="text-xs text-ink-faint">
        {tr('Ёпилган режа қайта очилмайди. Янги вазият бўлса, янги режа тузилади.')}
      </p>
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor="ry-holat" className="text-sm font-medium text-ink">
          {tr('Натижа')}
        </label>
        <select
          id="ry-holat"
          value={holat}
          onChange={(e) => setHolat(e.target.value as 'TUGALLANDI' | 'TOXTATILDI')}
          className={MAYDON}
        >
          <option value="TUGALLANDI">{tr('Якунланди — мақсадга эришилди')}</option>
          <option value="TOXTATILDI">{tr('Тўхтатилди')}</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="ry-izoh" className="text-sm font-medium text-ink">
          {tr('Сабаби / нима бўлди')}
        </label>
        <textarea
          id="ry-izoh"
          rows={2}
          value={izoh}
          onChange={(e) => setIzoh(e.target.value)}
          className={MAYDON}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="ry-dalil" className="text-sm font-medium text-ink">
          {tr('Натижани тасдиқловчи далил (ихтиёрий)')}
        </label>
        <textarea
          id="ry-dalil"
          rows={2}
          value={dalil}
          onChange={(e) => setDalil(e.target.value)}
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
          {tr('Ёпиш')}
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
