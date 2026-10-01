'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, Loader2, Pencil, XCircle } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from '@/components/reja/umumiy';
import { KursForma, type KursBoshlangichi } from './kurs-forma';

/**
 * Kurs ustidagi amallar (faqat bandlik markazi): tashkilotdan qayta
 * tekshirildi, tahrirlash, bekor qilish.
 *
 * "Tekshirildi" tahrirdan ALOHIDA: tahrir ma'lumotni yangilaydi, lekin
 * uning tashkilotdan tasdiqlanganini bildirmaydi.
 */
export function KursBoshqaruvi({
  kursId,
  boshlangich,
  bekorQilingan,
  tugagan,
}: {
  kursId: string;
  boshlangich: KursBoshlangichi;
  bekorQilingan: boolean;
  tugagan: boolean;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [rejim, setRejim] = useState<null | 'tahrir' | 'bekor'>(null);
  const [sabab, setSabab] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function amal(tana: Record<string, unknown>) {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/kurslar/${kursId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
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

  if (bekorQilingan) return null;

  const tugma = 'tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium';

  return (
    <div className="space-y-3">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {rejim === null && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'tekshirildi' })} className={tugma}>
            {yuborilmoqda ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {tr('Ташкилотдан текширилди')}
          </button>
          <button type="button" onClick={() => setRejim('tahrir')} className={tugma}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {tr('Таҳрирлаш')}
          </button>
          {!tugagan && (
            <button type="button" onClick={() => setRejim('bekor')} className={tugma}>
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {tr('Бекор қилиш')}
            </button>
          )}
        </div>
      )}

      {rejim === 'tahrir' && (
        <div className="rounded-md border border-line p-3">
          <KursForma kursId={kursId} boshlangich={boshlangich} yopish={() => setRejim(null)} />
          <p className="mt-2 text-[11px] text-ink-faint">
            {tr('Таҳрир «ташкилотдан текширилди» дегани эмас: у учун алоҳида тугмани босинг.')}
          </p>
        </div>
      )}

      {rejim === 'bekor' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <p className="text-xs text-ink-muted">
            {tr('Бошланмаган ва ўқиётган ёзувлар ҳам бекор бўлади. Тамомлаганларга тегилмайди.')}
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink-muted">{tr('Бекор қилиш сабаби')} *</span>
            <input value={sabab} onChange={(e) => setSabab(e.target.value)} maxLength={300} className={MAYDON} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={yuborilmoqda || sabab.trim().length < 3}
              onClick={() => amal({ amal: 'bekor', sabab: sabab.trim() })}
              className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold"
            >
              {yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {tr('Курсни бекор қилиш')}
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
