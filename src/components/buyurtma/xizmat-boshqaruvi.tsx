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

/**
 * Bitta xizmat taklifi ustidagi amallar: rozilik, rozilikni qaytarib olish,
 * yopish, qayta ochish.
 *
 * Rozilik qaytarilsa yoki taklif yopilsa, unga tayinlangan faol buyurtmalar
 * ijrochisiz qoladi (qayta "Янги"); bajarilganlar tarixda saqlanadi.
 */
export function XizmatBoshqaruvi({ id, rozilik, faol }: { id: string; rozilik: boolean; faol: boolean }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [usul, setUsul] = useState<Usul>('TELEFON');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function amal(tana: Record<string, unknown>) {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const r = await fetch(`/api/xizmatlar/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  const tugma = 'tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium';
  const asosiy = 'tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold';

  return (
    <div className="mt-2 space-y-2">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {!rozilik && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink-muted">{tr('Розилик қандай олинди')}</span>
            <select value={usul} onChange={(e) => setUsul(e.target.value as Usul)} className={`${MAYDON} min-h-11 text-sm`}>
              {(Object.keys(USUL_NOMI) as Usul[]).map((u) => (
                <option key={u} value={u}>
                  {tr(USUL_NOMI[u])}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'rozilik', usul })} className={asosiy}>
            {yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {tr('Розилик олинди')}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {rozilik && (
          <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'rozilik-qaytar' })} className={tugma}>
            {tr('Розиликни қайтариб олиш')}
          </button>
        )}
        {faol ? (
          <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'yopish' })} className={tugma}>
            {tr('Таклифни ёпиш')}
          </button>
        ) : (
          <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'qaytarish' })} className={tugma}>
            {tr('Қайта очиш')}
          </button>
        )}
      </div>
      {(rozilik || faol) && (
        <p className="text-[11px] text-ink-faint">
          {tr('Розилик қайтарилса ёки таклиф ёпилса, унга тайинланган фаол буюртмалар ижрочисиз қолади.')}
        </p>
      )}
    </div>
  );
}
