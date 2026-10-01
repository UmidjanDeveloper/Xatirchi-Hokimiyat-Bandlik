'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AloqaUsuli } from '@prisma/client';
import { Loader2, PhoneCall } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { ALOQA_USULI_NOMI, ODATIY_ALOQA_ORALIGI_KUN } from '@/lib/oila-rejasi-nomlari';
import { MAYDON, useSaqlanmaganOgohlantirish } from './umumiy';
import { hozirgiMahalliVaqt, kundanKeyin } from '@/lib/sana-maydoni';

/**
 * Oila bilan aloqani qayd etish.
 *
 * Forma sarlavhasi ataylab aytadi: bu XODIM yozuvi, fuqaroning o'zi
 * elektron tasdiqlagani emas. Hokim va rahbar bu farqni ko'radi.
 */
export function AloqaQoshish({ rejaId }: { rejaId: string }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [usul, setUsul] = useState<AloqaUsuli>('TELEFON');
  const [vaqt, setVaqt] = useState(hozirgiMahalliVaqt);
  const [kim, setKim] = useState('');
  const [mazmun, setMazmun] = useState('');
  const [fikr, setFikr] = useState('');
  const [keyingi, setKeyingi] = useState(() => kundanKeyin(ODATIY_ALOQA_ORALIGI_KUN));
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  useSaqlanmaganOgohlantirish(ochiq && (mazmun.length > 0 || fikr.length > 0 || kim.length > 0));

  async function yubor() {
    if (yuborilmoqda) return;
    if (mazmun.trim().length < 3) return setXato(tr('Нима ҳақида гаплашилганини ёзинг'));
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/rejalar/${rejaId}/aloqa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usul,
          aloqaVaqti: new Date(vaqt).toISOString(),
          kimBilan: kim.trim() || null,
          mazmun: mazmun.trim(),
          fuqaroFikri: fikr.trim() || null,
          keyingiAloqaSanasi: keyingi || null,
        }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setMazmun('');
      setFikr('');
      setKim('');
      setVaqt(hozirgiMahalliVaqt());
      setOchiq(false);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Ёзув сақланмади — қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  if (!ochiq) {
    return (
      <button
        type="button"
        onClick={() => setOchiq(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
      >
        <PhoneCall className="h-4 w-4" aria-hidden="true" />
        {tr('Оила билан алоқани қайд этиш')}
      </button>
    );
  }

  return (
    <div className="karta space-y-3 p-4">
      <h3 className="text-sm font-bold text-ink">{tr('Алоқа ёзуви')}</h3>
      <p className="text-xs text-ink-faint">
        {tr('Бу — ходим ёзуви. У фуқаронинг мустақил электрон тасдиғи ҳисобланмайди.')}
      </p>
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="al-usul" className="text-sm font-medium text-ink">
            {tr('Алоқа усули')}
          </label>
          <select
            id="al-usul"
            value={usul}
            onChange={(e) => setUsul(e.target.value as AloqaUsuli)}
            className={MAYDON}
          >
            {(Object.keys(ALOQA_USULI_NOMI) as AloqaUsuli[]).map((u) => (
              <option key={u} value={u}>
                {tr(ALOQA_USULI_NOMI[u])}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="al-vaqt" className="text-sm font-medium text-ink">
            {tr('Алоқа қачон бўлди')}
          </label>
          <input
            id="al-vaqt"
            type="datetime-local"
            value={vaqt}
            max={hozirgiMahalliVaqt()}
            onChange={(e) => setVaqt(e.target.value)}
            className={MAYDON}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="al-kim" className="text-sm font-medium text-ink">
          {tr('Оиладан ким билан гаплашилди')}
        </label>
        <input id="al-kim" value={kim} onChange={(e) => setKim(e.target.value)} className={MAYDON} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="al-mazmun" className="text-sm font-medium text-ink">
          {tr('Нима ҳақида гаплашилди')}
        </label>
        <textarea
          id="al-mazmun"
          rows={3}
          value={mazmun}
          onChange={(e) => setMazmun(e.target.value)}
          className={MAYDON}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="al-fikr" className="text-sm font-medium text-ink">
          {tr('Фуқаронинг фикри (ходим ёзиб олган)')}
        </label>
        <textarea
          id="al-fikr"
          rows={2}
          value={fikr}
          onChange={(e) => setFikr(e.target.value)}
          className={MAYDON}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="al-keyingi" className="text-sm font-medium text-ink">
          {tr('Кейинги алоқа санаси')}
        </label>
        <input
          id="al-keyingi"
          type="date"
          value={keyingi}
          onChange={(e) => setKeyingi(e.target.value)}
          className={MAYDON}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={yubor}
          disabled={yuborilmoqda}
          className="tugma-asosiy flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold"
        >
          {yuborilmoqda && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {tr('Қайд этиш')}
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
  );
}
