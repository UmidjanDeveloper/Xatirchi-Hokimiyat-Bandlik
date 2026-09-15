'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ItVaucherHolati } from '@prisma/client';
import { Check, GraduationCap, Loader2, TicketCheck, X } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { IT_VAUCHER_HOLATI, IT_VAUCHER_KORINISHI, IT_YONALISHI, kirillcha } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

/**
 * ============================================================
 *  IT-ШАҲАРЧА ВАУЧЕРИ — ФУҚАРО САҲИФАСИДА
 *
 *  Икки ҳолати бор:
 *
 *    1. ВАУЧЕР ЙЎҚ, истак бор → «Ваучер бериш» тугмаси.
 *       Йўналиш танланади, рақамни тизим ўзи қўяди.
 *    2. ВАУЧЕР БОР → рақами, йўналиши ва ҲОЛАТИ. Бандлик
 *       ходими ҳолатни бир босишда янгилайди.
 *
 *  ── Нега рақам қўлда ёзилмайди ──
 *
 *  Ваучер қоғозда ҳам бор ва унинг рақами ягона бўлиши керак.
 *  Қўлда ёзилса, иккита ходим бир вақтда бир хил рақам ёзиб
 *  юбориши мумкин эди. Тизим `IT-2026-0001` тартибида ўзи
 *  беради — база даражасида UNIQUE.
 *
 *  ── Нега «ташлаб кетди» да сабаб мажбурий ──
 *
 *  Ҳокимга «7 таси ташлаб кетди» деган рақам эмас, САБАБИ
 *  керак: гуруҳ узоқми, оила рухсат бермадими, иш топиб
 *  кетдими. Сабаб йиғилса, кейинги гуруҳда ўша муаммо
 *  такрорланмайди.
 * ============================================================
 */

export interface VaucherMaydonlari {
  id: string;
  raqami: string;
  holati: ItVaucherHolati;
  yonalish: string;
  boshqaYonalish: string | null;
  berilganSana: Date;
  izoh: string | null;
  berganNomi: string;
}

/** Holat nishonining rangi */
const NISHON: Record<string, string> = {
  kut: 'bg-warn-bg text-warn',
  ish: 'bg-info-bg text-info',
  ok: 'bg-ok-bg text-ok',
  xato: 'bg-danger-bg text-danger',
};

/** Sabab MAJBURIY bo'lgan holatlar */
const SABABLI: ItVaucherHolati[] = ['TASHLAB_KETDI', 'BEKOR_QILINDI'];

export function VaucherBlogi({
  ishsizId,
  vaucher,
  istagiBor,
  organmoqchiKasb,
  bera,
}: {
  ishsizId: string;
  /** Amaldagi vaucher - yo'q bo'lsa null */
  vaucher: VaucherMaydonlari | null;
  /** Xatlovda «IT o'rganmoqchi» deb belgilanganmi */
  istagiBor: boolean;
  /** Fuqaroning O'Z so'zi - yo'nalish tanlashda yordam beradi */
  organmoqchiKasb: string | null;
  /** Bandlik xodimimi - hokim faqat o'qiydi */
  bera: boolean;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [ochiq, setOchiq] = useState(false);
  const [yonalish, setYonalish] = useState('');
  const [boshqa, setBoshqa] = useState('');
  const [sorash, setSorash] = useState<ItVaucherHolati | null>(null);
  const [izoh, setIzoh] = useState('');
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  /* Истак ҳам йўқ, ваучер ҳам йўқ — блок умуман кўринмайди */
  if (!istagiBor && !vaucher) return null;

  async function sorov(yol: 'POST' | 'PATCH', tana: Record<string, unknown>) {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch('/api/it-vaucher', {
        method: yol,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setOchiq(false);
      setSorash(null);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  /* ── 1. ВАУЧЕР ЙЎҚ ── */
  if (!vaucher) {
    return (
      <section className="karta border-accent p-4 sm:p-5">
        <div className="flex items-start gap-2.5">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-ink">{tr('IT-шаҳарча ваучери')}</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {tr('Фуқаро IT йўналишини ўрганмоқчи. Ваучер билан IT-шаҳарчада ТЕКИНГА ўқийди — гуруҳ тўлишини кутиш шарт эмас.')}
            </p>
            {organmoqchiKasb && (
              <p className="mt-1.5 text-xs text-ink-faint">
                {tr('Ўз сўзи:')} <span className="text-ink-muted">{organmoqchiKasb}</span>
              </p>
            )}
          </div>
        </div>

        {!bera ? (
          <p className="mt-3 text-xs text-ink-faint">
            {tr('Ваучерни бандлик маркази беради.')}
          </p>
        ) : !ochiq ? (
          <button
            type="button"
            onClick={() => setOchiq(true)}
            className="mt-3 flex items-center gap-1.5 tugma-asosiy rounded-md px-3.5 py-2 text-xs font-semibold"
          >
            <TicketCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {tr('Ваучер бериш')}
          </button>
        ) : (
          <div className="mt-3 space-y-2.5 rounded-md border border-line bg-surface-muted p-3">
            <label htmlFor="vaucher-yonalish" className="block text-xs font-medium text-ink-muted">
              {tr('Қайси йўналишга')} <span className="text-danger">*</span>
            </label>
            <select
              id="vaucher-yonalish"
              value={yonalish}
              onChange={(e) => setYonalish(e.target.value)}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">{tr('— танланг —')}</option>
              {IT_YONALISHI.map((y) => (
                <option key={y.qiymat} value={y.qiymat}>
                  {tr(y.kirill)}
                </option>
              ))}
            </select>

            {/*
              «Бошқа» танланса — ўз вариантини ёзиш МАЖБУРИЙ.
              Акс ҳолда ҳисоботда «Бошқа: 14 та» деган қатор
              пайдо бўларди ва «қанақа бошқа» деган саволга
              жавоб топилмасди.
            */}
            {yonalish === 'Boshqa' && (
              <input
                value={boshqa}
                onChange={(e) => setBoshqa(e.target.value)}
                autoFocus
                placeholder={tr('қайси йўналиш — ёзиб кўрсатинг')}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            )}

            {xato && <div className="quti-xato">{xato}</div>}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!yonalish || (yonalish === 'Boshqa' && !boshqa.trim()) || yuborilmoqda}
                onClick={() =>
                  void sorov('POST', {
                    ishsizId,
                    yonalish,
                    boshqaYonalish: yonalish === 'Boshqa' ? boshqa.trim() : null,
                  })
                }
                className="flex items-center gap-1.5 tugma-asosiy rounded-md px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {yuborilmoqda ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {tr('Бериш')}
              </button>
              <button
                type="button"
                onClick={() => setOchiq(false)}
                className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {tr('Воз кечиш')}
              </button>
              <span className="text-[11px] text-ink-faint">
                {tr('рақамни тизим ўзи қўяди')}
              </span>
            </div>
          </div>
        )}
      </section>
    );
  }

  /* ── 2. ВАУЧЕР БОР ── */
  const nomi = kirillcha(IT_VAUCHER_HOLATI, vaucher.holati);
  const rang = NISHON[IT_VAUCHER_KORINISHI[vaucher.holati] ?? 'kut'];
  const yonalishNomi =
    vaucher.yonalish === 'Boshqa' && vaucher.boshqaYonalish
      ? vaucher.boshqaYonalish
      : tr(kirillcha(IT_YONALISHI, vaucher.yonalish));

  return (
    <section className="karta border-accent p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-ink">{tr('IT-шаҳарча ваучери')}</h2>
            <p className="mt-0.5 raqam text-xs text-ink-muted">{vaucher.raqami}</p>
          </div>
        </div>
        <span className={`rounded px-2 py-1 text-[11px] font-semibold ${rang}`}>{tr(nomi)}</span>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-ink-faint">{tr('Йўналиш')}</dt>
          <dd className="ml-auto font-medium text-ink">{yonalishNomi}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-faint">{tr('Берилган сана')}</dt>
          <dd className="ml-auto text-ink-muted">{formatDate(vaucher.berilganSana)}</dd>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <dt className="text-ink-faint">{tr('Берган ходим')}</dt>
          <dd className="ml-auto text-ink-muted">{vaucher.berganNomi}</dd>
        </div>
      </dl>

      {vaucher.izoh && (
        <p className="mt-2.5 rounded-md bg-surface-muted px-2.5 py-1.5 text-[11px] leading-relaxed text-ink-muted">
          {vaucher.izoh}
        </p>
      )}

      {bera && (
        <div className="mt-3 border-t border-line pt-3">
          {sorash ? (
            <div className="space-y-2.5">
              <label htmlFor="vaucher-izoh" className="block text-xs font-medium text-ink-muted">
                {tr('Сабабини ёзинг')} <span className="text-danger">*</span>
              </label>
              <input
                id="vaucher-izoh"
                value={izoh}
                autoFocus
                onChange={(e) => setIzoh(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && izoh.trim()) {
                    void sorov('PATCH', { id: vaucher.id, holati: sorash, izoh: izoh.trim() });
                  }
                  if (e.key === 'Escape') setSorash(null);
                }}
                placeholder={tr('масалан: гуруҳ узоқ, қатнай олмади')}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              {xato && <div className="quti-xato">{xato}</div>}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!izoh.trim() || yuborilmoqda}
                  onClick={() =>
                    void sorov('PATCH', { id: vaucher.id, holati: sorash, izoh: izoh.trim() })
                  }
                  className="flex items-center gap-1.5 tugma-asosiy rounded-md px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {yuborilmoqda ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {tr('Сақлаш')}
                </button>
                <button
                  type="button"
                  onClick={() => setSorash(null)}
                  className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {tr('Воз кечиш')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-2 text-[11px] text-ink-faint">{tr('Ҳолатини янгилаш:')}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {IT_VAUCHER_HOLATI.map((h) => {
                  const faol = h.qiymat === vaucher.holati;
                  return (
                    <button
                      key={h.qiymat}
                      type="button"
                      disabled={faol || yuborilmoqda}
                      aria-pressed={faol}
                      onClick={() =>
                        SABABLI.includes(h.qiymat as ItVaucherHolati)
                          ? setSorash(h.qiymat as ItVaucherHolati)
                          : void sorov('PATCH', { id: vaucher.id, holati: h.qiymat })
                      }
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-default ${
                        faol
                          ? NISHON[IT_VAUCHER_KORINISHI[h.qiymat] ?? 'kut']
                          : 'border border-line bg-surface text-ink-faint hover:border-accent hover:text-accent'
                      }`}
                    >
                      {tr(h.kirill)}
                    </button>
                  );
                })}
                {yuborilmoqda && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" aria-hidden="true" />
                )}
              </div>
              {xato && <div className="quti-xato mt-2">{xato}</div>}
            </>
          )}
        </div>
      )}
    </section>
  );
}
