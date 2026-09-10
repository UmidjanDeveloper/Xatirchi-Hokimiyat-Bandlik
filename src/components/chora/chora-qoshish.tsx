'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import { MASUL_TASHKILOT } from '@/lib/constants';

/**
 * Chora-tadbir qo'shish.
 *
 * Xonadon yoki ishsiz fuqaro sahifasidan ochiladi va o'sha yozuvga
 * bog'lanadi. Mas'ul tashkilot ro'yxatdan tanlanadi, erkin yozilmaydi:
 * "Bandlik markazi" va "bandlik markazi" ikki xil qiymat bo'lib
 * qolsa, kechikkan topshiriqlarni tashkilot kesimida sanab
 * bo'lmaydi va hisobdorlik yo'qoladi.
 */
export function ChoraQoshish({
  householdId,
  ishsizId,
}: {
  householdId?: string;
  ishsizId?: string;
}) {
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [muammo, setMuammo] = useState('');
  const [sababi, setSababi] = useState('');
  const [yechim, setYechim] = useState('');
  const [masul, setMasul] = useState('');
  const [muddat, setMuddat] = useState(() => {
    // Odatiy muddat - bir oy keyin. Aksariyat topshiriq shu oraliqda
    // beriladi, xodim sanani qo'lda tanlab o'tirmaydi.
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function yubor() {
    if (yuborilmoqda) return;

    if (muammo.trim().length < 5) return setXato('Муаммони батафсилроқ ёзинг');
    if (yechim.trim().length < 5) return setXato('Ечим йўлини батафсилроқ ёзинг');
    if (!masul) return setXato('Масъул ташкилотни танланг');

    setXato(null);
    setYuborilmoqda(true);

    try {
      const javob = await fetch('/api/chora-tadbirlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: householdId ?? null,
          ishsizId: ishsizId ?? null,
          muammo: muammo.trim(),
          sababi: sababi.trim() || null,
          yechim: yechim.trim(),
          masulTashkilot: masul,
          muddat,
        }),
      });

      const natija = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(natija.xabar ?? 'Сақлаб бўлмади');
        return;
      }

      setMuammo('');
      setSababi('');
      setYechim('');
      setMasul('');
      setOchiq(false);
      router.refresh();
    } catch {
      setXato('Алоқа йўқ. Қайта уриниб кўринг.');
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
        <Plus className="h-4 w-4" />
        Чора-тадбир қўшиш
      </button>
    );
  }

  const maydon =
    'w-full rounded-md border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-accent';

  return (
    <div className="karta space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Янги чора-тадбир</h3>
        <button
          type="button"
          onClick={() => setOchiq(false)}
          aria-label="Ёпиш"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {xato && <div className="quti-xato">{xato}</div>}

      <div className="space-y-1.5">
        <label htmlFor="ct-muammo" className="text-sm font-medium text-ink">
          Аниқланган муаммо
        </label>
        <textarea
          id="ct-muammo"
          rows={2}
          value={muammo}
          onChange={(e) => setMuammo(e.target.value)}
          className={maydon}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ct-sabab" className="text-sm font-medium text-ink">
          Муаммонинг сабаби
        </label>
        <textarea
          id="ct-sabab"
          rows={2}
          value={sababi}
          onChange={(e) => setSababi(e.target.value)}
          className={maydon}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ct-yechim" className="text-sm font-medium text-ink">
          Ечим йўли / тавсия
        </label>
        <textarea
          id="ct-yechim"
          rows={2}
          value={yechim}
          onChange={(e) => setYechim(e.target.value)}
          className={maydon}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="ct-masul" className="text-sm font-medium text-ink">
            Масъул ташкилот
          </label>
          <select
            id="ct-masul"
            value={masul}
            onChange={(e) => setMasul(e.target.value)}
            className={maydon}
          >
            <option value="">— Танланг —</option>
            {MASUL_TASHKILOT.map((t) => (
              <option key={t.qiymat} value={t.qiymat}>
                {t.kirill}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ct-muddat" className="text-sm font-medium text-ink">
            Бажарилиш муддати
          </label>
          <input
            id="ct-muddat"
            type="date"
            value={muddat}
            onChange={(e) => setMuddat(e.target.value)}
            className={maydon}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={yubor}
        disabled={yuborilmoqda}
        className="flex items-center gap-1.5 rounded-md bg-accent-solid px-5 py-2.5 text-sm font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {yuborilmoqda ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Қўшиш
      </button>
    </div>
  );
}
