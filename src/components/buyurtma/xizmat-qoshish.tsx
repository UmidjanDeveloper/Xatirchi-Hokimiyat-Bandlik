'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from '@/components/reja/umumiy';

type Usul = 'OGZAKI' | 'TELEFON' | 'YOZMA';

const USUL_NOMI: Record<Usul, string> = {
  OGZAKI: 'Оғзаки (юзма-юз)',
  TELEFON: 'Телефон орқали',
  YOZMA: 'Ёзма',
};

const raqam = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/**
 * Fuqaroning mahalliy xizmat taklifini qo'shish.
 *
 * Rozilik belgilanmasa taklif roziliksiz yaratiladi: u ijrochi sifatida
 * tayinlanmaydi, keyin "Розилик олинди" bilan qayd etiladi. Rozilik -
 * fuqaro ro'yxatda turishga va aloqa ma'lumoti buyurtmachiga berilishiga
 * rozi ekani; xodim uni usuli va sanasi bilan yozib oladi.
 */
export function XizmatQoshish({ ishsizId }: { ishsizId: string }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [nomi, setNomi] = useState('');
  const [tavsif, setTavsif] = useState('');
  const [narx, setNarx] = useState('');
  const [rozi, setRozi] = useState(false);
  const [usul, setUsul] = useState<Usul>('TELEFON');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function yubor(e: React.FormEvent) {
    e.preventDefault();
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch('/api/xizmatlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ishsizId,
          nomi: nomi.trim(),
          tavsif: tavsif.trim() || null,
          taxminiyNarx: raqam(narx),
        }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      if (rozi) {
        const r = await fetch(`/api/xizmatlar/${d.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amal: 'rozilik', usul }),
        });
        if (!r.ok) {
          /* Taklif yaratildi; faqat rozilik yozilmadi - xodim keyin qayta urinadi */
          const dd = await r.json().catch(() => ({}));
          setXato(`${tr('Таклиф қўшилди, лекин розилик қайд этилмади:')} ${dd.xabar ?? ''}`);
          router.refresh();
          return;
        }
      }
      setNomi('');
      setTavsif('');
      setNarx('');
      setRozi(false);
      setOchiq(false);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  const yorliq = 'text-xs font-medium text-ink-muted';

  if (!ochiq) {
    return (
      <button type="button" onClick={() => setOchiq(true)} className="tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium">
        {tr('Хизмат таклифи қўшиш')}
      </button>
    );
  }

  return (
    <form onSubmit={yubor} className="space-y-3 rounded-md border border-line p-3" noValidate>
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}
      <label className="block space-y-1">
        <span className={yorliq}>{tr('Қандай хизмат')} *</span>
        <input value={nomi} onChange={(e) => setNomi(e.target.value)} maxLength={80} placeholder={tr('масалан: пайвандлаш, тикувчилик, сантехника')} className={`${MAYDON} min-h-11 text-sm`} />
      </label>
      <label className="block space-y-1">
        <span className={yorliq}>{tr('Тавсиф')}</span>
        <input value={tavsif} onChange={(e) => setTavsif(e.target.value)} maxLength={300} className={`${MAYDON} min-h-11 text-sm`} />
      </label>
      <label className="block space-y-1">
        <span className={yorliq}>{tr('Тахминий нарх (сўм)')}</span>
        <input inputMode="numeric" value={narx} onChange={(e) => setNarx(e.target.value)} placeholder={tr('билмасангиз — бўш қолдиринг (келишилади)')} className={`${MAYDON} min-h-11 text-sm`} />
      </label>

      <fieldset className="space-y-2 rounded-md bg-surface-muted p-3">
        <legend className="px-1 text-xs font-semibold text-ink-muted">{tr('Фуқаро розилиги')}</legend>
        <label className="flex min-h-11 items-start gap-2 text-sm text-ink">
          <input type="checkbox" checked={rozi} onChange={(e) => setRozi(e.target.checked)} className="mt-1 h-4 w-4" />
          <span>{tr('Фуқаро рўйхатда туришга ва алоқа маълумоти (исм, телефон) буюртмачига берилишига рози')}</span>
        </label>
        {rozi && (
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Розилик қандай олинди')}</span>
            <select value={usul} onChange={(e) => setUsul(e.target.value as Usul)} className={`${MAYDON} min-h-11 text-sm`}>
              {(Object.keys(USUL_NOMI) as Usul[]).map((u) => (
                <option key={u} value={u}>
                  {tr(USUL_NOMI[u])}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="text-[11px] text-ink-faint">
          {tr('Розилик қайд этилмагунча таклиф ижрочи қилиб тайинланмайди.')}
        </p>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={yuborilmoqda || nomi.trim().length < 3} className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold">
          {yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {tr('Қўшиш')}
        </button>
        <button type="button" onClick={() => setOchiq(false)} className="tugma-ikkilamchi min-h-11 rounded-md px-4 py-2 text-xs">
          {tr('Бекор қилиш')}
        </button>
      </div>
    </form>
  );
}
