'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronDown, Loader2, MapPin, Search, X } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { nomMos } from '@/lib/qidiruv';

/**
 * ============================================================
 *  МФЙ ТАНЛАШ — панелнинг энг тепасида
 *
 *  Битта панел иккита саволга жавоб беради:
 *
 *    «Ҳаммаси»  → туман бўйича умумий сурат
 *    «Уйшун»    → АЙНАН Уйшун МФЙ бўйича ҳамма рақам
 *
 *  Иккинчиси йиғилишда керак бўлади: ҳоким «Уйшунда нима гап»
 *  деб сўрайди ва жавоб бир босишда чиқиши керак — ҳисобот
 *  юклаб, PDF очиб ўқиш эмас.
 *
 *  ── Нега рўйхат эмас, қидирувли рўйхат ──
 *
 *  Туманда 70 та МФЙ бор. Оддий `<select>` да уларни
 *  айлантириб топиш узоқ, айниқса телефонда. Шунинг учун
 *  тепада қидирув қатори: уч ҳарф ёзилса рўйхат учтагача
 *  қисқаради.
 *
 *  Қидирув ИККАЛА алифбода ишлайди ва апостроф талаб
 *  қилмайди — қоида `lib/qidiruv.ts` да, харита рўйхати билан
 *  битта.
 *
 *  ── Нега URL да сақланади ──
 *
 *  Ҳоким Уйшунни очиб, ҳаволани бандлик раҳбарига юборса,
 *  раҳбар ҲАМ Уйшунни кўриши керак. `useState` да сақланса,
 *  ҳавола туман кесимини очарди ва иккови бошқа-бошқа
 *  рақамдан гаплашарди.
 * ============================================================
 */

export function MahallaTanlash({
  joriyId,
  joriyNomi,
  mahallalar,
}: {
  /** Ҳозир танланган МФЙ — туман кесимида `null` */
  joriyId: string | null;
  /** Танланганнинг номи (кириллда) — туман бўлса туман номи */
  joriyNomi: string;
  mahallalar: { id: string; nomiKirill: string }[];
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const yol = usePathname();
  const parametrlar = useSearchParams();
  const [kutilmoqda, boshla] = useTransition();

  const [ochiq, setOchiq] = useState(false);
  const [qidiruv, setQidiruv] = useState('');
  const qutiRef = useRef<HTMLDivElement>(null);
  const qidiruvRef = useRef<HTMLInputElement>(null);

  /* Ташқарига босилса ёпилади */
  useEffect(() => {
    if (!ochiq) return;
    const bosildi = (e: MouseEvent) => {
      if (!qutiRef.current?.contains(e.target as Node)) setOchiq(false);
    };
    const tugma = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOchiq(false);
    };
    document.addEventListener('mousedown', bosildi);
    document.addEventListener('keydown', tugma);
    return () => {
      document.removeEventListener('mousedown', bosildi);
      document.removeEventListener('keydown', tugma);
    };
  }, [ochiq]);

  /* Очилганда дарҳол ёзишга тайёр — ходим сичқончани иккинчи марта юритмасин */
  useEffect(() => {
    if (ochiq) qidiruvRef.current?.focus();
    else setQidiruv('');
  }, [ochiq]);

  const topilgan = useMemo(
    () => mahallalar.filter((m) => nomMos(m.nomiKirill, qidiruv)),
    [mahallalar, qidiruv]
  );

  function tanla(id: string | null) {
    setOchiq(false);
    if (id === joriyId) return;

    /*
     * Бошқа параметрлар САҚЛАНАДИ: ҳоким «кунлик» кесимда
     * туриб МФЙ алмаштирса, даври йўқолмаслиги керак.
     */
    const q = new URLSearchParams(parametrlar.toString());
    if (id) q.set('mfy', id);
    else q.delete('mfy');

    const qator = q.toString();
    boshla(() => router.push(qator ? `${yol}?${qator}` : yol, { scroll: false }));
  }

  return (
    <div ref={qutiRef} className="relative">
      <button
        type="button"
        onClick={() => setOchiq((v) => !v)}
        aria-expanded={ochiq}
        aria-haspopup="listbox"
        className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors sm:w-auto ${
          joriyId
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-line bg-surface text-ink hover:border-line-strong'
        }`}
      >
        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wide opacity-70">
            {tr('Ҳудуд кесими')}
          </span>
          <span className="block truncate text-sm font-semibold">{tr(joriyNomi)}</span>
        </span>
        {kutilmoqda ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${ochiq ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        )}
      </button>

      {ochiq && (
        <div
          className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-md border border-line bg-surface shadow-lg sm:left-auto sm:right-auto sm:w-80"
          role="listbox"
        >
          {/* ── Қидирув ── */}
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
            <input
              ref={qidiruvRef}
              value={qidiruv}
              onChange={(e) => setQidiruv(e.target.value)}
              placeholder={tr('МФЙ номини ёзинг…')}
              aria-label={tr('МФЙ қидириш')}
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            {qidiruv && (
              <button
                type="button"
                onClick={() => setQidiruv('')}
                aria-label={tr('Тозалаш')}
                className="shrink-0 text-ink-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/*
              «Ҳаммаси» — доим биринчи ва доим кўринади.
              Қидирув натижаси бўш бўлса ҳам: одам излаб
              топмаса, туман кесимига қайтиш йўли очиқ турсин.
            */}
            <Satr
              nomi={tr('Ҳаммаси — туман бўйича')}
              izoh={tr(`${mahallalar.length} та МФЙ жамланмаси`)}
              tanlangan={joriyId === null}
              onClick={() => tanla(null)}
            />

            {topilgan.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-ink-faint">
                {tr('Бундай номли МФЙ топилмади')}
              </p>
            ) : (
              topilgan.map((m) => (
                <Satr
                  key={m.id}
                  nomi={tr(m.nomiKirill)}
                  tanlangan={joriyId === m.id}
                  onClick={() => tanla(m.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Satr({
  nomi,
  izoh,
  tanlangan,
  onClick,
}: {
  nomi: string;
  izoh?: string;
  tanlangan: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={tanlangan}
      onClick={onClick}
      className={`flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left transition-colors last:border-b-0 ${
        tanlangan ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-muted'
      }`}
    >
      <Check
        className={`h-3.5 w-3.5 shrink-0 ${tanlangan ? '' : 'invisible'}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{nomi}</span>
        {izoh && <span className="block text-[11px] text-ink-faint">{izoh}</span>}
      </span>
    </button>
  );
}
