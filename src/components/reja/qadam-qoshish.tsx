'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Loader2, Plus } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MASUL_TASHKILOT } from '@/lib/constants';
import { MAYDON, useSaqlanmaganOgohlantirish } from './umumiy';
import { kundanKeyin } from '@/lib/sana-maydoni';

/**
 * Rejaga qadam qo'shish.
 *
 * Tizim shablon qadam TAKLIF QILMAYDI: har oilaga bir xil kurs yoki
 * kredit tavsiya qilish aynan oldini olmoqchi bo'lgan xato. Xodim
 * qadamni o'zi yozadi, tizim esa faqat qayerga yozilishini bildiradi.
 *
 * Quyida rejaga kirmagan, lekin shu oilaga tegishli chora-tadbirlar
 * bo'lsa (xatlov paytida tizim yaratgan), ularni rejaga biriktirish
 * mumkin - shunda ular reja ichida ko'rinadi.
 */
export function QadamQoshish({
  rejaId,
  xodimlar,
  biriktiriladigan,
}: {
  rejaId: string;
  xodimlar: { id: string; ism: string }[];
  biriktiriladigan: { id: string; muammo: string }[];
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [muammo, setMuammo] = useState('');
  const [yechim, setYechim] = useState('');
  const [tashkilot, setTashkilot] = useState('');
  const [xodim, setXodim] = useState('');
  const [muddat, setMuddat] = useState(() => kundanKeyin(30));
  const [resurs, setResurs] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  useSaqlanmaganOgohlantirish(ochiq && (muammo.length > 0 || yechim.length > 0));

  async function yubor(tana: Record<string, unknown>) {
    if (yuborilmoqda) return false;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/rejalar/${rejaId}/qadam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
      return false;
    } finally {
      setYuborilmoqda(false);
    }
  }

  async function yangiQadam() {
    if (muammo.trim().length < 5) return setXato(tr('Муаммони батафсилроқ ёзинг'));
    if (yechim.trim().length < 5) return setXato(tr('Қадамни (нима қилинади) батафсилроқ ёзинг'));
    if (!tashkilot) return setXato(tr('Масъул ташкилотни танланг'));
    const ok = await yubor({
      muammo: muammo.trim(),
      yechim: yechim.trim(),
      masulTashkilot: tashkilot,
      masulXodimId: xodim || null,
      muddat,
      zarurResurs: resurs.trim() || null,
    });
    if (ok) {
      setMuammo('');
      setYechim('');
      setResurs('');
      setOchiq(false);
    }
  }

  return (
    <div className="space-y-3">
      {biriktiriladigan.length > 0 && (
        <div className="rounded-md border border-line bg-surface-muted p-3">
          <p className="text-xs font-medium text-ink-muted">
            {tr('Бу оиланинг режага кирмаган чора-тадбирлари:')}
          </p>
          <ul className="mt-2 space-y-1.5">
            {biriktiriladigan.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink">{b.muammo}</span>
                <button
                  type="button"
                  disabled={yuborilmoqda}
                  onClick={() => yubor({ mavjudId: b.id })}
                  className="tugma-ikkilamchi flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs"
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {tr('Режага қўшиш')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {xato && !ochiq && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {!ochiq ? (
        <button
          type="button"
          onClick={() => setOchiq(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {tr('Режага қадам қўшиш')}
        </button>
      ) : (
        <div className="karta space-y-3 p-4">
          <h3 className="text-sm font-bold text-ink">{tr('Янги қадам')}</h3>
          {xato && (
            <div className="quti-xato" role="alert">
              {xato}
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="qd-muammo" className="text-sm font-medium text-ink">
              {tr('Қайси тўсиқни ҳал қилади')}
            </label>
            <textarea
              id="qd-muammo"
              rows={2}
              value={muammo}
              onChange={(e) => setMuammo(e.target.value)}
              className={MAYDON}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="qd-yechim" className="text-sm font-medium text-ink">
              {tr('Нима қилинади')}
            </label>
            <textarea
              id="qd-yechim"
              rows={2}
              value={yechim}
              onChange={(e) => setYechim(e.target.value)}
              className={MAYDON}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="qd-tashkilot" className="text-sm font-medium text-ink">
                {tr('Масъул ташкилот')}
              </label>
              <select
                id="qd-tashkilot"
                value={tashkilot}
                onChange={(e) => setTashkilot(e.target.value)}
                className={MAYDON}
              >
                <option value="">{tr('— Танланг —')}</option>
                {MASUL_TASHKILOT.map((t) => (
                  <option key={t.qiymat} value={t.qiymat}>
                    {t.kirill}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="qd-xodim" className="text-sm font-medium text-ink">
                {tr('Масъул ходим')}
              </label>
              <select
                id="qd-xodim"
                value={xodim}
                onChange={(e) => setXodim(e.target.value)}
                className={MAYDON}
              >
                <option value="">{tr('— Танланмаган —')}</option>
                {xodimlar.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.ism}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="qd-muddat" className="text-sm font-medium text-ink">
                {tr('Муддат')}
              </label>
              <input
                id="qd-muddat"
                type="date"
                value={muddat}
                onChange={(e) => setMuddat(e.target.value)}
                className={MAYDON}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="qd-resurs" className="text-sm font-medium text-ink">
                {tr('Зарур хизмат ёки ресурс')}
              </label>
              <input
                id="qd-resurs"
                value={resurs}
                onChange={(e) => setResurs(e.target.value)}
                className={MAYDON}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={yangiQadam}
              disabled={yuborilmoqda}
              className="tugma-asosiy flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold"
            >
              {yuborilmoqda ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {tr('Қўшиш')}
            </button>
            <button
              type="button"
              onClick={() => setOchiq(false)}
              className="tugma-ikkilamchi rounded-md px-4 py-2.5 text-sm"
            >
              {tr('Бекор қилиш')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
