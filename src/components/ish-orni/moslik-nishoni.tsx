'use client';

import { useState } from 'react';
import { ChevronDown, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MOSLIK_KORINISHI, type Moslik } from '@/lib/moslik';

/**
 * Мослик балли ва унинг САБАБИ.
 *
 * Балл ўзича ишончсиз: «68 балл» деган рақам мутахассисга ҳеч
 * нима демайди ва у рўйхат тартибига ишонмай қўяди. Шунинг учун
 * рақам ёнида «нега» деган тугма турибди — босилса, ҳисоб қандай
 * йиғилгани очилади.
 */
export function MoslikNishoni({ moslik, ochiqchaMi = false }: { moslik: Moslik; ochiqchaMi?: boolean }) {
  const { t: tr } = useAlifbo();
  const [ochiq, setOchiq] = useState(ochiqchaMi);

  const k = MOSLIK_KORINISHI[moslik.daraja];
  const izohBor = moslik.sabablar.length > 0 || moslik.ogohlantirishlar.length > 0;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`raqam inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-semibold ${k.sinf}`}
        >
          {moslik.ball}%
          <span className="font-medium">{tr(k.nomi)}</span>
        </span>

        {moslik.tosiq && (
          <span className="inline-flex items-center gap-1 rounded bg-danger-bg px-2 py-1 text-[11px] font-medium text-danger">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">{tr(moslik.tosiq)}</span>
          </span>
        )}

        {izohBor && (
          <button
            type="button"
            onClick={() => setOchiq((x) => !x)}
            aria-expanded={ochiq}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-faint transition-colors hover:text-accent"
          >
            {tr('нега')}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${ochiq ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {ochiq && izohBor && (
        <ul className="mt-2 space-y-1">
          {moslik.sabablar.map((s) => (
            <li key={s} className="flex items-start gap-1.5 text-[11px] text-ink-muted">
              <Info className="mt-px h-3.5 w-3.5 shrink-0 text-ok" />
              <span>{tr(s)}</span>
            </li>
          ))}
          {moslik.ogohlantirishlar.map((s) => (
            <li key={s} className="flex items-start gap-1.5 text-[11px] text-ink-muted">
              <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-warn" />
              <span>{tr(s)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
