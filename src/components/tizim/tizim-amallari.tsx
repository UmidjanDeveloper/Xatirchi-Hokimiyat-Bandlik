'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, RotateCcw } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from '@/components/reja/umumiy';

/**
 * Tizim holati sahifasidagi amallar: xatoni "ko'rildi" deb belgilash,
 * xato xabarlarni navbatga qaytarish, zaxira sinovini qayd etish.
 * Har biri javobni KUTADI va xatoni ko'rsatadi: jim muvaffaqiyat yo'q.
 */

async function yubor(url: string, tana?: unknown): Promise<{ ok: boolean; xabar?: string; soni?: number }> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: tana === undefined ? undefined : JSON.stringify(tana),
  });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, soni: d.soni } : { ok: false, xabar: d.xabar + (d.izId ? ` (${d.izId})` : '') };
}

const tugma = 'tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium';

export function XatoniKorildi({ id, matn }: { id?: string; matn: string }) {
  const router = useRouter();
  const { t: tr } = useAlifbo();
  const [ishlamoqda, setIshlamoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function bos() {
    if (ishlamoqda) return;
    setXato(null);
    setIshlamoqda(true);
    try {
      const n = await yubor('/api/admin/xatolar', { amal: 'korildi', ...(id ? { id } : {}) });
      if (!n.ok) setXato(n.xabar ?? tr('Сақлаб бўлмади'));
      else router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setIshlamoqda(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={ishlamoqda} onClick={bos} className={tugma}>
        {ishlamoqda ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
        {tr(matn)}
      </button>
      {xato && (
        <span className="text-xs text-danger" role="alert">
          {xato}
        </span>
      )}
    </span>
  );
}

export function NavbatniQaytar() {
  const router = useRouter();
  const { t: tr } = useAlifbo();
  const [ishlamoqda, setIshlamoqda] = useState(false);
  const [natija, setNatija] = useState<string | null>(null);

  async function bos() {
    if (ishlamoqda) return;
    setNatija(null);
    setIshlamoqda(true);
    try {
      const n = await yubor('/api/admin/navbat-qayta');
      if (n.ok) {
        /*
         * Натижа URL орқали: қайтарилгандан кейин «хато» хабарлар қолмайди ва тугма
         * (шу билан бирга унинг ичидаги матн) саҳифадан ЙЎҚОЛАДИ. Хабар шу ерда
         * сақланиб турса — администратор «босилдими?» деб иккиланмайди.
         */
        router.push(`/tizim?qaytarildi=${Number(n.soni ?? 0)}`);
      } else {
        setNatija(n.xabar ?? tr('Қайтариб бўлмади'));
      }
    } catch {
      setNatija(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setIshlamoqda(false);
    }
  }

  return (
    <div className="space-y-1">
      <button type="button" disabled={ishlamoqda} onClick={bos} className={tugma}>
        {ishlamoqda ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        {tr('Хатоли хабарларни навбатга қайтариш')}
      </button>
      {natija && (
        <p className="text-xs text-ink-muted" role="status">
          {natija}
        </p>
      )}
    </div>
  );
}

export function ZaxiraForma({ bugun }: { bugun: string }) {
  const router = useRouter();
  const { t: tr } = useAlifbo();
  const [sana, setSana] = useState(bugun);
  const [natija, setNatija] = useState<'MUVAFFAQIYATLI' | 'XATO'>('MUVAFFAQIYATLI');
  const [izoh, setIzoh] = useState('');
  const [ishlamoqda, setIshlamoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function saqla() {
    if (ishlamoqda) return;
    setXato(null);
    setIshlamoqda(true);
    try {
      const n = await yubor('/api/admin/zaxira', { sana, natija, izoh: izoh.trim() });
      if (!n.ok) {
        setXato(n.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setIzoh('');
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setIshlamoqda(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-line p-3">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink-muted">{tr('Синов ўтказилган сана')} *</span>
          <input type="date" value={sana} max={bugun} onChange={(e) => setSana(e.target.value)} className={`${MAYDON} min-h-11 text-sm`} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink-muted">{tr('Натижа')} *</span>
          <select value={natija} onChange={(e) => setNatija(e.target.value as 'MUVAFFAQIYATLI' | 'XATO')} className={`${MAYDON} min-h-11 text-sm`}>
            <option value="MUVAFFAQIYATLI">{tr('Муваффақиятли')}</option>
            <option value="XATO">{tr('Муваффақиятсиз')}</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-ink-muted">
          {tr('Изоҳ: қайси нусха, қаерга тикланди, қайси жадваллар солиштирилди')} *
        </span>
        <textarea rows={3} maxLength={1000} value={izoh} onChange={(e) => setIzoh(e.target.value)} className={`${MAYDON} text-sm`} />
      </label>
      <button
        type="button"
        disabled={ishlamoqda || izoh.trim().length < 10 || !sana}
        onClick={saqla}
        className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold"
      >
        {ishlamoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        {tr('Синов натижасини қайд этиш')}
      </button>
    </div>
  );
}
