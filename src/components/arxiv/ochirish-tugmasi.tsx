'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  O'CHIRISH TUGMASI — XONADON VA FUQARO UCHUN
 *
 *  ── Nega tasdiqlash oynasi ──
 *
 *  Bu tugma butun bir oilaning xatlovini ro'yxatdan chiqaradi.
 *  Telefonda, bir qo'l bilan ishlayotgan xodim uchun tasodifiy
 *  bosish juda oson. Shuning uchun ikki qadam: bosish va
 *  TASDIQLASH.
 *
 *  ── Nega sabab so'raladi ──
 *
 *  Yuborilgan xatlovni o'chirishda sabab MAJBURIY. U ikki ish
 *  qiladi: odamni bir soniya to'xtatadi va keyinchalik "nega bu
 *  xonadon yo'q?" degan savolga javob qoldiradi.
 *
 *  Qoralamada sabab so'ralmaydi — u hali hech qayerga ulanmagan.
 *
 *  ── Nega "arxivga olinadi" deb yoziladi ──
 *
 *  Xodim ma'lumot butunlay yo'qolmasligini bilsin. Bu uni
 *  ikkilanishdan xalos qiladi: xato bo'lsa administrator
 *  qaytaradi.
 * ============================================================
 */

export function OchirishTugmasi({
  turi,
  id,
  nomi,
  qoralamami = false,
  qayerga,
  kichik = false,
}: {
  turi: 'xonadon' | 'fuqaro';
  id: string;
  /** Tasdiqlash oynasida ko'rsatiladi — nima o'chirilayotgani aniq bo'lsin */
  nomi: string;
  /** Qoralamada sabab so'ralmaydi va u haqiqatan o'chiriladi */
  qoralamami?: boolean;
  /** O'chirilgandan keyin qayerga o'tiladi */
  qayerga: string;
  kichik?: boolean;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [sabab, setSabab] = useState('');
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const yol = turi === 'xonadon' ? `/api/xatlov/${id}` : `/api/ishsizlar/${id}`;
  const sababKerak = !qoralamami;

  async function ochir() {
    if (yuborilmoqda) return;
    if (sababKerak && sabab.trim().length < 10) {
      setXato(tr('Сабабни ёзинг — камида 10 белги'));
      return;
    }
    setYuborilmoqda(true);
    setXato(null);
    try {
      const javob = await fetch(yol, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sabab: sabab.trim() }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Ўчириб бўлмади'));
        return;
      }
      setOchiq(false);
      router.push(qayerga);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOchiq(true)}
        className={
          kichik
            ? 'inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-medium text-ink-faint transition-colors hover:border-danger hover:text-danger'
            : 'inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-danger hover:bg-danger-bg hover:text-danger'
        }
      >
        <Trash2 className={kichik ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
        {tr('Ўчириш')}
      </button>

      {ochiq && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="karta w-full max-w-md space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-ink">
                    {turi === 'xonadon' ? tr('Хатловни ўчириш') : tr('Фуқарони ўчириш')}
                  </h2>
                  <p className="mt-0.5 break-words text-xs text-ink-muted">{tr(nomi)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOchiq(false)}
                aria-label={tr('Ёпиш')}
                className="rounded p-1 text-ink-faint transition-colors hover:bg-surface-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="quti-ogoh text-xs leading-relaxed">
              {qoralamami
                ? tr('Бу қоралама бутунлай ўчирилади. Уни қайтариб бўлмайди.')
                : turi === 'xonadon'
                  ? tr('Хонадон АРХИВГА олинади: рўйхатдан, ҳисоботдан ва ҳокимнинг рақамларидан йўқолади. Ундаги фуқаролар ҳам, очиқ топшириқлар ҳам биргаликда ёпилади. Маълумот йўқолмайди — администратор қайтара олади.')
                  : tr('Фуқаро АРХИВГА олинади: рўйхатдан ва ҳисоботдан йўқолади, хонадон жойида қолади. Маълумот йўқолмайди — администратор қайтара олади.')}
            </p>

            {sababKerak && (
              <div className="space-y-1.5">
                <label htmlFor="ochirish-sabab" className="text-sm font-medium text-ink">
                  {tr('Сабаби')} <span className="text-danger">*</span>
                </label>
                <textarea
                  id="ochirish-sabab"
                  rows={3}
                  value={sabab}
                  onChange={(e) => setSabab(e.target.value)}
                  maxLength={500}
                  placeholder={tr('масалан: бир хонадон икки марта киритилган')}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
                <p className="text-[11px] text-ink-faint">
                  {tr('Бу ёзув журналда қолади — кейинчалик «нега бу хонадон йўқ?» деган саволга жавоб бўлади.')}
                </p>
              </div>
            )}

            {xato && (
              <p className="quti-xato text-xs" role="alert">
                {xato}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOchiq(false)}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-accent"
              >
                {tr('Бекор қилиш')}
              </button>
              <button
                type="button"
                onClick={() => void ochir()}
                disabled={yuborilmoqda}
                className="flex items-center gap-1.5 rounded-md border border-danger bg-danger-bg px-4 py-2 text-sm font-semibold text-danger transition-opacity hover:opacity-85 disabled:opacity-60"
              >
                {yuborilmoqda ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                {qoralamami ? tr('Ўчириш') : tr('Архивга олиш')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
