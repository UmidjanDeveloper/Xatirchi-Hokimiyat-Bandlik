'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * Nomzodni e'longa yo'llash (faqat yozuv yaratadi).
 *
 * Bu ish beruvchiga HECH NARSA YUBORMAYDI: ma'lumot faqat fuqaro roziligi
 * qayd etilgandan keyin, alohida qadamda ketadi.
 */
export function YollanmaTugmasi({ ishsizId, vacancyId }: { ishsizId: string; vacancyId: string }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function yubor() {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch('/api/yollanma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ishsizId, vacancyId }),
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

  return (
    <div>
      {xato && (
        <p className="mb-1.5 text-xs text-danger" role="alert">
          {xato}
        </p>
      )}
      <button
        type="button"
        onClick={yubor}
        disabled={yuborilmoqda}
        className="tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium"
      >
        {yuborilmoqda ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {tr('Иш берувчига йўллаш')}
      </button>
    </div>
  );
}
