'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

/**
 * Kirish formasi.
 *
 * Ikkita mayda, lekin amalda muhim yechim:
 *
 *  1. Login maydonida `autoCapitalize="none"` - telefon klaviaturasi
 *     birinchi harfni katta qilib yuboradi va "Yettilik_uyshun"
 *     login bilan mos kelmaydi. Server ham kichik harfga keltiradi,
 *     lekin xodim nega xato chiqayotganini tushunmasligi kerak emas.
 *
 *  2. Parolni ko'rsatish tugmasi - murakkab parolni telefonda
 *     ko'rmasdan terish qiyin, xodim uch marta xato qilib bloklanadi.
 */
export function KirishFormasi({ keyin }: { keyin?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [parol, setParol] = useState('');
  const [korinsin, setKorinsin] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function yubor(e: React.FormEvent) {
    e.preventDefault();
    if (yuklanmoqda) return;

    setXato(null);
    setYuklanmoqda(true);

    try {
      const javob = await fetch('/api/auth/kirish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), parol }),
      });

      const natija = await javob.json().catch(() => ({}));

      if (!javob.ok) {
        setXato(natija.xabar ?? 'Kirishda xatolik yuz berdi');
        setYuklanmoqda(false);
        return;
      }

      // Boshlang'ich parol hali almashtirilmagan bo'lsa - avval o'sha
      if (natija.parolAlmashtirilsin) {
        router.replace('/parol-almashtirish');
      } else {
        router.replace(keyin && keyin.startsWith('/') ? keyin : '/');
      }
      router.refresh();
    } catch {
      setXato('Aloqa yo‘q. Internetni tekshirib, qayta urinib ko‘ring.');
      setYuklanmoqda(false);
    }
  }

  return (
    <form onSubmit={yubor} className="karta karta-koter space-y-4 p-6">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-sm font-medium text-ink">
          Login
        </label>
        <input
          id="username"
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={yuklanmoqda}
          className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
          placeholder="masalan: yettilik_uyshun"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="parol" className="block text-sm font-medium text-ink">
          Parol
        </label>
        <div className="relative">
          <input
            id="parol"
            name="parol"
            type={korinsin ? 'text' : 'password'}
            value={parol}
            onChange={(e) => setParol(e.target.value)}
            required
            autoComplete="current-password"
            disabled={yuklanmoqda}
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 pr-12 text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setKorinsin((k) => !k)}
            aria-label={korinsin ? 'Parolni yashirish' : "Parolni ko'rsatish"}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint transition-colors hover:text-ink"
          >
            {korinsin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={yuklanmoqda || !username.trim() || !parol}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-solid px-4 py-3 font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {yuklanmoqda ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Tekshirilmoqda...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Kirish
          </>
        )}
      </button>
    </form>
  );
}
