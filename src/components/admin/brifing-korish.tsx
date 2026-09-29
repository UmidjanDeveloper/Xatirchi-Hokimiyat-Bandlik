'use client';

import { useState } from 'react';
import { Eye, Loader2, Send, Sunrise } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  ЭРТАЛАБКИ БРИФИНГ — КЎРИШ ВА ЮБОРИШ
 *
 *  ── Нега керак ──
 *
 *  Брифинг жадвал бўйича кунига БИР МАРТА ишлайди. Уни синаб
 *  кўриш учун эртагача кутиш керак эди — ёки терминалдан
 *  сўров юбориш.
 *
 *  Раҳбарда эса терминал ҳам, лаптоп ҳам ҳар доим ёнида
 *  бўлмайди. Натижада хато ёзув брифингда қолиб кетар ва уни
 *  биринчи бўлиб ҲОКИМ кўрарди.
 *
 *  Икки тугма: «Кўриш» ҳеч нарса юбормайди, «Ҳозир юбориш»
 *  эса навбатга қўйиб дарҳол жўнатади.
 * ============================================================
 */

export function BrifingKorish() {
  const { t: tr } = useAlifbo();

  const [matn, setMatn] = useState<string | null>(null);
  const [xabar, setXabar] = useState<string | null>(null);
  const [band, setBand] = useState<'korish' | 'yuborish' | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  async function kor() {
    setBand('korish');
    setXato(null);
    setXabar(null);
    try {
      const javob = await fetch('/api/cron/brifing', { method: 'PUT' });
      const n = await javob.json();
      if (!javob.ok || !n.ok) {
        setXato(n.xabar ?? 'Koʻrib boʻlmadi');
        return;
      }
      /* HTML белгилари экранда кўринмасин — матн соф ўқилсин */
      setMatn(String(n.matn).replace(/<\/?b>/g, ''));
    } catch {
      setXato('Tarmoq xatosi');
    } finally {
      setBand(null);
    }
  }

  async function yubor() {
    setBand('yuborish');
    setXato(null);
    try {
      const javob = await fetch('/api/cron/brifing', { method: 'POST' });
      const n = await javob.json();
      if (!javob.ok || !n.ok) {
        setXato(n.xabar ?? 'Yuborib boʻlmadi');
        return;
      }
      setXabar(`${n.yuborildi} ${tr('та раҳбарга юборилди')}`);
    } catch {
      setXato('Tarmoq xatosi');
    } finally {
      setBand(null);
    }
  }

  return (
    <section className="karta space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Sunrise className="h-4 w-4 text-accent" />
          {tr('Эрталабки брифинг')}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Ҳар куни соат 08:00 да ҳоким, бандлик раҳбари ва администраторга боради')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={band !== null}
          onClick={kor}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {band === 'korish' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {tr('Матнни кўриш')}
        </button>

        <button
          type="button"
          disabled={band !== null}
          onClick={yubor}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast transition hover:opacity-90 disabled:opacity-50"
        >
          {band === 'yuborish' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {tr('Ҳозир юбориш')}
        </button>
      </div>

      {xato && <p className="text-sm text-danger">{tr(xato)}</p>}
      {xabar && <p className="text-sm text-ok">{xabar}</p>}

      {matn && (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-surface-muted p-3 text-xs leading-relaxed text-ink">
          {matn}
        </pre>
      )}
    </section>
  );
}
