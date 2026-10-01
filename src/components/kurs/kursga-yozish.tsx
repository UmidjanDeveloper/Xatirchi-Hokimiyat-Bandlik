'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from '@/components/reja/umumiy';

export interface YozishKursi {
  id: string;
  /** Tayyor matn: nomi, ташкилот, сана, бўш ўрин */
  yorliq: string;
}

export interface YozishVaucheri {
  id: string;
  raqami: string;
}

/**
 * Fuqaroni kursga yozish. Ro'yxatda faqat yozish MUMKIN kurslar bor
 * (bekor qilinmagan, tugamagan, ma'lumoti yangi, o'rni bor); server
 * baribir qayta tekshiradi.
 */
export function KursgaYozish({
  ishsizId,
  kurslar,
  vaucherlar,
}: {
  ishsizId: string;
  kurslar: YozishKursi[];
  vaucherlar: YozishVaucheri[];
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [kursId, setKursId] = useState('');
  const [vaucher, setVaucher] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function yoz() {
    if (yuborilmoqda || !kursId) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch('/api/kurs-yozuvlari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ishsizId, kursId, itVaucherId: vaucher || null }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setKursId('');
      setVaucher('');
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  return (
    <div className="space-y-2">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-0 flex-1 space-y-1">
          <span className="text-xs font-medium text-ink-muted">{tr('Курсга ёзиш')}</span>
          <select value={kursId} onChange={(e) => setKursId(e.target.value)} className={`${MAYDON} min-h-11 text-sm`}>
            <option value="">{tr('— курсни танланг —')}</option>
            {kurslar.map((k) => (
              <option key={k.id} value={k.id}>
                {k.yorliq}
              </option>
            ))}
          </select>
        </label>
        {vaucherlar.length > 0 && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink-muted">{tr('ИТ-шаҳарча ваучери (ихтиёрий)')}</span>
            <select value={vaucher} onChange={(e) => setVaucher(e.target.value)} className={`${MAYDON} min-h-11 text-sm`}>
              <option value="">{tr('— боғланмаган —')}</option>
              {vaucherlar.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.raqami}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={yoz}
          disabled={yuborilmoqda || !kursId}
          className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold"
        >
          {yuborilmoqda ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {tr('Ёзиш')}
        </button>
      </div>
    </div>
  );
}
