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
      setXato('Yangi parol va uning takrori bir xil emas');
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
        setXato(natija.xabar ?? 'Parolni almashtirib bo‘lmadi');
        setYuklanmoqda(false);
        return;
      }

      setMuvaffaq(true);
      setTimeout(() => {
        router.replace('/');
        router.refresh();
      }, 900);
    } catch {
      setXato('Aloqa yo‘q. Qayta urinib ko‘ring.');
      setYuklanmoqda(false);
    }
  }

  if (muvaffaq) {
    return (
      <div className="karta p-6">
        <div className="quti-ok">Parol almashtirildi. Sahifaga o&#8216;tilmoqda...</div>
      </div>
    );
  }

  return (
    <form onSubmit={yubor} className="karta karta-koter space-y-4 p-6">
      {majburiy && (
        <div className="quti-ogoh">
          Bu sizning birinchi kirishingiz. Davom etish uchun boshlang&#8216;ich parolni
          o&#8216;zingiznikiga almashtiring.
        </div>
      )}

      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {[
        { id: 'eski', label: 'Joriy parol', val: eski, set: setEski, ac: 'current-password' },
        { id: 'yangi', label: 'Yangi parol', val: yangi, set: setYangi, ac: 'new-password' },
        { id: 'takror', label: 'Yangi parolni takrorlang', val: takror, set: setTakror, ac: 'new-password' },
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
        Parol kamida 8 ta belgidan iborat bo&#8216;lishi, harf va raqamni o&#8216;z ichiga
        olishi kerak.
      </p>

      <button
        type="submit"
        disabled={yuklanmoqda || !eski || !yangi || !takror}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-solid px-4 py-3 font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {yuklanmoqda ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saqlanmoqda...
          </>
        ) : (
          <>
            <KeyRound className="h-4 w-4" /> Parolni almashtirish
          </>
        )}
      </button>
    </form>
  );
}
