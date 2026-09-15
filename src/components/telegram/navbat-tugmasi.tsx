'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * «ҲОЗИР ЮБОР» тугмаси.
 *
 * Навбат одатда жадвал бўйича ишлайди, аммо созлама тўғри
 * қўйилганини текшириш учун кутиб ўтириш нотўғри: администратор
 * токенни киритади ва ДАРҲОЛ натижани кўриши керак.
 */
export function NavbatTugmasi() {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ishlamoqda, setIshlamoqda] = useState(false);
  const [natija, setNatija] = useState<string | null>(null);

  async function yubor() {
    if (ishlamoqda) return;
    setNatija(null);
    setIshlamoqda(true);
    try {
      const javob = await fetch('/api/telegram/navbat', { method: 'POST' });
      const d = await javob.json().catch(() => ({}));
      setNatija(
        javob.ok
          ? `${tr('Юборилди:')} ${d.yuborildi} · ${tr('хато:')} ${d.xato}`
          : (d.xabar ?? tr('Юбориб бўлмади'))
      );
      router.refresh();
    } catch {
      setNatija(tr('Алоқа йўқ'));
    } finally {
      setIshlamoqda(false);
    }
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={() => void yubor()}
        disabled={ishlamoqda}
        className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        {ishlamoqda ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {tr('Ҳозир юбор')}
      </button>
      {natija && <p className="mt-1 text-[11px] text-ink-faint">{natija}</p>}
    </div>
  );
}
