'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, Loader2, Pencil, XCircle } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from '@/components/reja/umumiy';
import { YordamForma, type DasturBoshlangichi } from './yordam-forma';

/**
 * Bitta dastur ustidagi amallar (bandlik markazi): manbadan tekshirildi,
 * tahrir, yopish, qayta ochish.
 *
 * "Manbadan tekshirildi" tahrirdan ALOHIDA: tahrir matnni yangilaydi, lekin
 * uning rasmiy manbadan qayta tasdiqlanganini bildirmaydi. Qayta ochilgan
 * dastur ham yangi tekshiruvsiz "amalda" bo'lib qolmaydi.
 */
export function DasturBoshqaruvi({
  id,
  faol,
  boshlangich,
}: {
  id: string;
  faol: boolean;
  boshlangich: DasturBoshlangichi;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [rejim, setRejim] = useState<null | 'tahrir' | 'yopish'>(null);
  const [sabab, setSabab] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function amal(tana: Record<string, unknown>) {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const r = await fetch(`/api/yordam/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setRejim(null);
      setSabab('');
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  const tugma = 'tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium';
  const spin = yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />;

  return (
    <div className="mt-3 space-y-3">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {rejim === null && (
        <div className="flex flex-wrap gap-2">
          {faol && (
            <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'tekshirildi' })} className={tugma}>
              {spin || <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />}
              {tr('Манбадан текширилди')}
            </button>
          )}
          <button type="button" onClick={() => setRejim('tahrir')} className={tugma}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {tr('Таҳрирлаш')}
          </button>
          {faol ? (
            <button type="button" onClick={() => setRejim('yopish')} className={tugma}>
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {tr('Ёпиш')}
            </button>
          ) : (
            <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'qaytarish' })} className={tugma}>
              {spin}
              {tr('Қайта очиш')}
            </button>
          )}
        </div>
      )}

      {rejim === 'tahrir' && (
        <div className="rounded-md border border-line p-3">
          <YordamForma dasturId={id} boshlangich={boshlangich} yopish={() => setRejim(null)} />
          <p className="mt-2 text-[11px] text-ink-faint">
            {tr('Таҳрир «манбадан текширилди» дегани эмас: у учун алоҳида тугмани босинг.')}
          </p>
        </div>
      )}

      {rejim === 'yopish' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink-muted">{tr('Ёпиш сабаби')} *</span>
            <input value={sabab} onChange={(e) => setSabab(e.target.value)} maxLength={300} className={`${MAYDON} min-h-11 text-sm`} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={yuborilmoqda || sabab.trim().length < 3}
              onClick={() => amal({ amal: 'yopish', sabab: sabab.trim() })}
              className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold"
            >
              {spin}
              {tr('Дастурни ёпиш')}
            </button>
            <button type="button" onClick={() => setRejim(null)} className={tugma}>
              {tr('Ортга')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
