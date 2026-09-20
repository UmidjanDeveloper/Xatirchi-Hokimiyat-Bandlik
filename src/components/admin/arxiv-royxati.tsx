'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Loader2, RotateCcw } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  ARXIV — ADMINISTRATOR UCHUN
 *
 *  Bu tizimning "orqaga qaytarish" tugmasi.
 *
 *  Xonadon yoki fuqaro o'chirilganda u yo'qolmaydi — shu yerga
 *  tushadi. Xodim xatolashsa, administrator bir bosishda
 *  qaytaradi.
 *
 *  Bu bo'lim bo'lmasa, arxivlashning ma'nosi ham yo'q edi:
 *  ma'lumot saqlanardi-yu, unga hech kim yeta olmasdi.
 * ============================================================
 */

interface Xonadon {
  id: string;
  manzil: string;
  oilaBoshligi: string;
  holati: string;
  arxivSanasi: string | null;
  arxivSababi: string | null;
  mahalla: { nomiKirill: string };
}
interface Fuqaro {
  id: string;
  fish: string;
  arxivSanasi: string | null;
  arxivSababi: string | null;
  mahalla: { nomiKirill: string };
}

export function ArxivRoyxati() {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [malumot, setMalumot] = useState<{ xonadonlar: Xonadon[]; fuqarolar: Fuqaro[] } | null>(
    null
  );
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [qaytarilmoqda, setQaytarilmoqda] = useState<string | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  async function ol() {
    setYuklanmoqda(true);
    setXato(null);
    try {
      const javob = await fetch('/api/admin/arxiv');
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) throw new Error(d.xabar ?? tr('Очиб бўлмади'));
      setMalumot(d);
    } catch (e) {
      setXato(e instanceof Error ? e.message : tr('Очиб бўлмади'));
    } finally {
      setYuklanmoqda(false);
    }
  }

  async function qaytar(turi: 'xonadon' | 'fuqaro', id: string) {
    setQaytarilmoqda(id);
    setXato(null);
    try {
      const javob = await fetch('/api/admin/arxiv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turi, id }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) throw new Error(d.xabar ?? tr('Қайтариб бўлмади'));
      await ol();
      router.refresh();
    } catch (e) {
      setXato(e instanceof Error ? e.message : tr('Қайтариб бўлмади'));
    } finally {
      setQaytarilmoqda(null);
    }
  }

  const sana = (s: string | null) => (s ? new Date(s).toLocaleDateString('ru-RU') : '—');
  const jami = malumot ? malumot.xonadonlar.length + malumot.fuqarolar.length : 0;

  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink">{tr('Архив')}</h2>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Ўчирилган хатлов ва фуқаролар. Хато бўлса — бир босишда қайтарилади.')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void ol()}
          disabled={yuklanmoqda}
          className="tugma-asosiy flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold"
        >
          {yuklanmoqda ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Archive className="h-4 w-4" aria-hidden="true" />
          )}
          {yuklanmoqda ? tr('Очилмоқда…') : tr('Архивни очиш')}
        </button>
      </div>

      {xato && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {xato}
        </p>
      )}

      {malumot && (
        <div className="mt-4 space-y-3">
          {jami === 0 ? (
            <p className="quti-ok text-xs">{tr('Архив бўш — ҳеч нарса ўчирилмаган.')}</p>
          ) : (
            <>
              <p className="text-xs text-ink-faint">
                {tr('Жами')}: <span className="raqam font-bold text-ink">{jami}</span>{' '}
                {tr('та ёзув')}
              </p>

              {malumot.xonadonlar.map((x) => (
                <div
                  key={x.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-line p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink">
                      {tr(x.oilaBoshligi)} · {x.manzil}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {tr(x.mahalla.nomiKirill)} {tr('МФЙ')} · {sana(x.arxivSanasi)}
                    </p>
                    {x.arxivSababi && (
                      <p className="mt-1 text-[11px] italic text-ink-muted">«{x.arxivSababi}»</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void qaytar('xonadon', x.id)}
                    disabled={qaytarilmoqda !== null}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted transition-colors hover:border-ok hover:text-ok disabled:opacity-50"
                  >
                    {qaytarilmoqda === x.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    )}
                    {tr('Қайтариш')}
                  </button>
                </div>
              ))}

              {malumot.fuqarolar.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-line p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink">{tr(p.fish)}</p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {tr(p.mahalla.nomiKirill)} {tr('МФЙ')} · {sana(p.arxivSanasi)}
                    </p>
                    {p.arxivSababi && (
                      <p className="mt-1 text-[11px] italic text-ink-muted">«{p.arxivSababi}»</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void qaytar('fuqaro', p.id)}
                    disabled={qaytarilmoqda !== null}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted transition-colors hover:border-ok hover:text-ok disabled:opacity-50"
                  >
                    {qaytarilmoqda === p.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    )}
                    {tr('Қайтариш')}
                  </button>
                </div>
              ))}

              <p className="text-[11px] text-ink-faint">
                {tr('Хонадон қайтарилганда ундаги фуқаролар ҳам ўзи қайтади. Бекор қилинган топшириқлар қайтарилмайди — керак бўлса занжир янгисини яратади.')}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
