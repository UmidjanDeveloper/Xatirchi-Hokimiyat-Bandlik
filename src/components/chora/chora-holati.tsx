'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TopshiriqHolati } from '@prisma/client';
import { Check, Loader2, X } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { TOPSHIRIQ_HOLATI } from '@/lib/chora-tadbir';

/**
 * ============================================================
 *  ТОПШИРИҚ ҲОЛАТИНИ АЛМАШТИРИШ
 *
 *  Илгари топшириқ ЯРАТИЛАРДИ-Ю, ҲЕЧ ҚАЧОН ЁПИЛМАСДИ: базада
 *  `PATCH` йўли бор эди, аммо унга мурожаат қиладиган тугма
 *  ҳеч қаерда йўқ эди. Натижада ҳоким панелидаги «кечиккан
 *  топшириқлар» рақами фақат ўсиб борарди ва панелнинг энг
 *  муҳим қисми — ҳисобдорлик — ишламасди.
 *
 *  ── Нега «бажарилди» да изоҳ сўралади ──
 *
 *  «Бажарилди» деган белги ўзича ҳеч нима исботламайди. Ҳоким
 *  «газ уланди» деганда нима қилинганини сўрайди: қувур
 *  тортилдими, ҳужжат расмийлаштирилдими, навбатга қўйилдими.
 *  Изоҳ шу саволга олдиндан жавоб беради ва ҳисоботда
 *  кўринади.
 *
 *  Изоҳ МАЖБУРИЙ эмас: шошилинч ишда ходимни тўхтатиб қўйиш
 *  нотўғри бўларди. Аммо у сўралади ва бўш қолдирилса,
 *  рўйхатда шу кўриниб туради.
 *
 *  ── «Кечикди» бу ерда йўқ ──
 *
 *  У ҲИСОБЛАНАДИГАН ҳолат (`chora-tadbir.ts`), базада
 *  сақланмайди — шунинг учун уни қўлда қўйиб бўлмайди ва
 *  тугмалар орасида ҳам турмайди.
 * ============================================================
 */

/** Қўлда қўйиш мумкин бўлган ҳолатлар — «Кечикди» ҳисобланади */
const HOLATLAR: TopshiriqHolati[] = [
  'KUTILMOQDA',
  'BAJARILMOQDA',
  'BAJARILDI',
  'BEKOR_QILINDI',
];

interface Props {
  topshiriqId: string;
  joriy: TopshiriqHolati;
  natijaIzohi: string | null;
  /** Ҳоким фақат ўқийди */
  ozgartiraOladi: boolean;
}

export function ChoraHolati({ topshiriqId, joriy, natijaIzohi, ozgartiraOladi }: Props) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [holat, setHolat] = useState(joriy);
  const [izoh, setIzoh] = useState(natijaIzohi ?? '');
  const [sorash, setSorash] = useState<TopshiriqHolati | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function yubor(yangi: TopshiriqHolati, natija?: string) {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/chora-tadbirlar/${topshiriqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holati: yangi,
          ...(natija === undefined ? {} : { natijaIzohi: natija.trim() || null }),
        }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setHolat(yangi);
      setSorash(null);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  /*
   * Ўқувчи учун: натижа изоҳи ҳар доим кўринади, ҳатто
   * ўзгартириш ҳуқуқи бўлмаса ҳам. Ҳоким айнан шуни ўқийди.
   */
  const izohKorinishi = holat === 'BAJARILDI' && natijaIzohi && (
    <p className="mt-2 rounded-md bg-ok-bg px-2.5 py-1.5 text-[11px] leading-relaxed text-ok">
      {tr('Натижа:')} {natijaIzohi}
    </p>
  );

  if (!ozgartiraOladi) return <>{izohKorinishi}</>;

  /* ── «Бажарилди» — натижа изоҳи сўралади ── */
  if (sorash) {
    const bajarildi = sorash === 'BAJARILDI';
    return (
      <div className="mt-2.5 rounded-md border border-line bg-surface-muted p-3">
        <label
          htmlFor={`izoh-${topshiriqId}`}
          className="block text-xs font-medium text-ink-muted"
        >
          {bajarildi
            ? tr('Нима қилинди? Ҳоким айнан шу матнни ўқийди.')
            : tr('Нега бекор қилинди?')}
        </label>
        <input
          id={`izoh-${topshiriqId}`}
          value={izoh}
          autoFocus
          onChange={(e) => setIzoh(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void yubor(sorash, izoh);
            if (e.key === 'Escape') setSorash(null);
          }}
          placeholder={
            bajarildi
              ? tr('масалан: қувур тортилди, ҳужжат расмийлаштирилди')
              : tr('масалан: оила кўчиб кетди')
          }
          className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />

        {xato && <div className="quti-xato mt-2">{xato}</div>}

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void yubor(sorash, izoh)}
            disabled={yuborilmoqda}
            className="flex items-center gap-1.5 tugma-asosiy rounded-md px-3.5 py-1.5 text-xs font-semibold"
          >
            {yuborilmoqda ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {tr('Сақлаш')}
          </button>
          <button
            type="button"
            onClick={() => setSorash(null)}
            className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
            {tr('Воз кечиш')}
          </button>
          <span className="text-[11px] text-ink-faint">
            {tr('изоҳсиз ҳам сақлаш мумкин')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {HOLATLAR.map((h) => {
          const faol = h === holat;
          const n = TOPSHIRIQ_HOLATI[h];
          return (
            <button
              key={h}
              type="button"
              disabled={yuborilmoqda || faol}
              onClick={() =>
                h === 'BAJARILDI' || h === 'BEKOR_QILINDI' ? setSorash(h) : void yubor(h)
              }
              aria-pressed={faol}
              className={`rounded px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-default ${
                faol
                  ? n.sinf
                  : 'border border-line bg-surface text-ink-faint hover:border-accent hover:text-accent'
              }`}
            >
              {tr(n.kirill)}
            </button>
          );
        })}
        {yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" />}
      </div>

      {xato && <div className="quti-xato mt-2">{xato}</div>}
      {izohKorinishi}
    </div>
  );
}
