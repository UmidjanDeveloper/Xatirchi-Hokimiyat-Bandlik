'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2, LogOut } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  КЎРИШ РЕЖИМИ ЛЕНТАСИ
 *
 *  Экраннинг ЭНГ ТЕПАСИДА, ҳамма нарсанинг устида туради ва
 *  ҳеч қачон ёпилмайди.
 *
 *  ── Нега ёпилмайди ──
 *
 *  Чунки бу лентанинг бутун маъноси — администратор ҳозир
 *  КИМНИНГ кўзи билан қараётганини УНУТМАСЛИГИ. Ёпиладиган
 *  огоҳлантириш биринчи кунда ёпилади ва кейин ҳеч қачон
 *  кўринмайди.
 *
 *  Ранг ҳам атайлаб бегона: сайтнинг қолган қисми оч ва
 *  расмий, бу эса тўқ ва ажралиб туради — экранга қараган
 *  заҳоти кўзга ташланади.
 * ============================================================
 */

interface Props {
  /** Кимнинг кўзи билан қаралаяпти */
  nishonIsmi: string;
  nishonRoli: string;
  /** Ростдан ҳам ким кирган */
  haqiqiyIsm: string;
}

export function KorishLentasi({ nishonIsmi, nishonRoli, haqiqiyIsm }: Props) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ishlamoqda, setIshlamoqda] = useState(false);

  async function qayt() {
    if (ishlamoqda) return;
    setIshlamoqda(true);
    try {
      await fetch('/api/admin/korish', { method: 'DELETE' });
      router.replace('/admin');
      router.refresh();
    } finally {
      setIshlamoqda(false);
    }
  }

  return (
    <div className="sticky top-0 z-40 border-b border-accent/40 bg-accent text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2">
        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />

        <p className="min-w-0 flex-1 text-xs leading-relaxed">
          <span className="font-bold">{tr('Кўриш режими')}</span>
          {' — '}
          {tr('сиз')}{' '}
          <span className="font-semibold">{tr(nishonIsmi)}</span>{' '}
          <span className="opacity-90">({tr(nishonRoli)})</span>{' '}
          {tr('кўзи билан қараяпсиз.')}{' '}
          <span className="opacity-90">
            {tr('Ҳеч нарсани ўзгартириб бўлмайди. Ҳисобингиз ўша-ўша:')}{' '}
            {tr(haqiqiyIsm)}.
          </span>
        </p>

        <button
          type="button"
          onClick={() => void qayt()}
          disabled={ishlamoqda}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/25 disabled:opacity-60"
        >
          {ishlamoqda ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          {tr('Ўз ҳисобимга қайтиш')}
        </button>
      </div>
    </div>
  );
}
