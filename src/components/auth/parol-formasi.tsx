'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';

/**
 * Parol almashtirish.
 *
 * Boshlang'ich parolni administrator og'zaki yoki qog'ozda beradi -
 * ya'ni uni administrator ham, yonidagi xodim ham biladi. Yozuvlar
 * ostida aniq ismning turishi shu paytdan boshlab ma'noga ega
 * bo'ladi, shuning uchun birinchi kirishda almashtirish majburiy.
 */
export function ParolFormasi({ majburiy = false }: { majburiy?: boolean }) {
  const router = useRouter();
  const [eski, setEski] = useState('');
  const [yangi, setYangi] = useState('');
  const [takror, setTakror] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [muvaffaq, setMuvaffaq] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function yubor(e: React.FormEvent) {
    e.preventDefault();
    if (yuklanmoqda) return;

    if (yangi !== takror) {
      setXato('Янги парол ва унинг такрори бир хил эмас');
      return;
    }

    setXato(null);
    setYuklanmoqda(true);

    try {
      const javob = await fetch('/api/auth/parol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eski, yangi }),
      });
      const natija = await javob.json().catch(() => ({}));

      if (!javob.ok) {
        setXato(natija.xabar ?? 'Паролни алмаштириб бўлмади');
        setYuklanmoqda(false);
        return;
      }

      setMuvaffaq(true);
      setTimeout(() => {
        router.replace('/');
        router.refresh();
      }, 900);
    } catch {
      setXato('Алоқа йўқ. Қайта уриниб кўринг.');
      setYuklanmoqda(false);
    }
  }

  if (muvaffaq) {
    return (
      <div className="karta p-6">
        <div className="quti-ok">Парол алмаштирилди. Саҳифага ўтилмоқда...</div>
      </div>
    );
  }

  return (
    <form onSubmit={yubor} className="karta karta-koter space-y-4 p-6">
      {majburiy && (
        <div className="quti-ogoh">
          Бу сизнинг биринчи киришингиз. Давом этиш учун бошланғич паролни
          ўзингизникига алмаштиринг.
        </div>
      )}

      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {[
        { id: 'eski', label: 'Жорий парол', val: eski, set: setEski, ac: 'current-password' },
        { id: 'yangi', label: 'Янги парол', val: yangi, set: setYangi, ac: 'new-password' },
        { id: 'takror', label: 'Янги паролни такрорланг', val: takror, set: setTakror, ac: 'new-password' },
      ].map((m) => (
        <div key={m.id} className="space-y-1.5">
          <label htmlFor={m.id} className="block text-sm font-medium text-ink">
            {m.label}
          </label>
          <input
            id={m.id}
            type="password"
            value={m.val}
            onChange={(e) => m.set(e.target.value)}
            required
            autoComplete={m.ac}
            disabled={yuklanmoqda}
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
          />
        </div>
      ))}

      <p className="text-xs text-ink-faint">
        Парол камида 8 та белгидан иборат бўлиши, ҳарф ва рақамни ўз ичига
        олиши керак.
      </p>

      <button
        type="submit"
        disabled={yuklanmoqda || !eski || !yangi || !takror}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-solid px-4 py-3 font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {yuklanmoqda ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Сақланмоқда...
          </>
        ) : (
          <>
            <KeyRound className="h-4 w-4" /> Паролни алмаштириш
          </>
        )}
      </button>
    </form>
  );
}
