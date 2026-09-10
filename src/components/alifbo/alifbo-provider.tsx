'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { A, ALIFBO_COOKIE, type Alifbo } from '@/lib/alifbo';

/**
 * ============================================================
 *  ALIFBO KONTEKSTI
 *
 *  Tanlov cookie'da saqlanadi, sessiyada emas. Ikki sabab bor:
 *
 *  1. Server komponentlari ham cookie'ni o'qiy oladi - ya'ni
 *     sahifa DARHOL to'g'ri alifboda chiziladi. Agar tanlov
 *     faqat brauzerda saqlansa, sahifa avval kirillda chiqib,
 *     keyin lotinga sakrardi - bu ko'zga tashlanadigan nuqson.
 *
 *  2. Tanlov shaxsga emas, QURILMAGA bog'lanadi. Bir kompyuterda
 *     navbatma-navbat ishlaydigan xodimlar bir-birining tanlovini
 *     buzmaydi, chunki har biri o'z brauzerida ishlaydi.
 * ============================================================
 */

interface AlifboKonteksti {
  alifbo: Alifbo;
  /** Matnni tanlangan alifboda qaytaradi */
  t: (matn: string) => string;
  almashtir: () => void;
}

const Kontekst = createContext<AlifboKonteksti | null>(null);

export function AlifboProvider({
  boshlangich,
  children,
}: {
  boshlangich: Alifbo;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [alifbo, setAlifbo] = useState<Alifbo>(boshlangich);

  const almashtir = useCallback(() => {
    const yangi: Alifbo = alifbo === 'kir' ? 'lot' : 'kir';

    /*
     * Cookie bir yil yashaydi va butun saytga tegishli.
     * `SameSite=Lax` yetarli: bu maxfiy ma'lumot emas, shunchaki
     * ko'rinish tanlovi.
     */
    document.cookie = `${ALIFBO_COOKIE}=${yangi}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;

    // Avval brauzerda o'zgartiramiz - tugma darhol javob bersin
    setAlifbo(yangi);
    // Keyin server komponentlarini qayta chizdiramiz
    router.refresh();
  }, [alifbo, router]);

  const qiymat = useMemo<AlifboKonteksti>(
    () => ({ alifbo, t: (matn: string) => A(matn, alifbo), almashtir }),
    [alifbo, almashtir]
  );

  return <Kontekst.Provider value={qiymat}>{children}</Kontekst.Provider>;
}

/**
 * Brauzer komponentlarida alifboni oladi.
 *
 * Provider tashqarisida chaqirilsa xato bermaydi, kirillga
 * qaytadi: ba'zi komponentlar (masalan kirish sahifasi) qobiqdan
 * tashqarida turadi va ular uchun kirill to'g'ri javob.
 */
export function useAlifbo(): AlifboKonteksti {
  const k = useContext(Kontekst);
  if (k) return k;
  return { alifbo: 'kir', t: (matn: string) => matn, almashtir: () => {} };
}

/**
 * Alifbo almashtirgich tugmasi.
 *
 * Ikkala variant ham doim ko'rinib turadi - "hozir qaysi
 * alifbodaman va bosganda nima bo'ladi" degan savol tug'ilmaydi.
 */
export function AlifboTugmasi({ className }: { className?: string }) {
  const { alifbo, almashtir } = useAlifbo();

  return (
    <div
      className={`flex items-center rounded-md border border-line bg-surface p-0.5 ${className ?? ''}`}
      role="group"
      aria-label="Alifbo"
    >
      {(
        [
          { kod: 'lot' as const, nomi: 'Lat' },
          { kod: 'kir' as const, nomi: 'Кир' },
        ]
      ).map((v) => (
        <button
          key={v.kod}
          type="button"
          onClick={() => {
            if (alifbo !== v.kod) almashtir();
          }}
          aria-pressed={alifbo === v.kod}
          className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
            alifbo === v.kod
              ? 'bg-accent-soft text-accent'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          {v.nomi}
        </button>
      ))}
    </div>
  );
}
