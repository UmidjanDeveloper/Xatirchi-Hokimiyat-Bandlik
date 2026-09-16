'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  СЕССИЯ ҚОРОВУЛИ
 *
 *  ── Қандай муаммони ечади ──
 *
 *  Браузерда битта cookie бўлади ва у БАРЧА ойна ва варақларга
 *  тегишли. Шунинг учун:
 *
 *    1. Администратор панели очиқ турибди.
 *    2. Иккинчи ойнада маҳалла ходими ўз ҳисобига киради.
 *    3. Биринчи ойнадаги cookie ҲАМ алмашади — экранда эса
 *       администратор панели турибди.
 *
 *  Ходим буни билмайди. Тугма босади — тушунарсиз хато чиқади
 *  ёки амал БОШҚА одам номидан бажарилади. Аудит журналида
 *  нотўғри исм қолади.
 *
 *  ── Ечим ──
 *
 *  Саҳифа қайси ходим учун чизилганини эслаб қоламиз. Ойна
 *  фокусга қайтганда сервердан «ҳозир ким кирган» деб сўраймиз.
 *  Фарқ чиқса — иш давом этмайди: экранни тўсиб, ростини
 *  айтамиз ва янгилашни таклиф қиламиз.
 *
 *  Бу cookie ни «ойна бўйича» қилиб бўлмаганидан — браузер
 *  шундай ишлайди. Аммо ЖИМ ҚОЛМАСЛИК мумкин ва шарт.
 *
 *  ── Бир вақтда икки ҳисоб керак бўлса ──
 *
 *  Ягона тўғри йўл — браузернинг алоҳида профили ёки
 *  «инкогнито» ойнаси. Шу гап қутида ёзилган: ходим нима
 *  қилишни билсин.
 * ============================================================
 */

export function SessiyaQorovuli({ username }: { username: string }) {
  const { t: tr } = useAlifbo();
  const [boshqasi, setBoshqasi] = useState<string | null>(null);

  const tekshir = useCallback(async () => {
    /* Аллақачон аниқланган бўлса — қайта сўрамаймиз */
    if (boshqasi) return;
    try {
      const javob = await fetch('/api/auth/kim', { cache: 'no-store' });
      if (!javob.ok) return;
      const d = (await javob.json()) as { username: string | null; fullName: string | null };
      /*
       * Сессия умуман йўқолган бўлса (муддати тугаган) бу ерда
       * тўхтатмаймиз: у ҳолда кейинги ҳаракат ўзи кириш
       * саҳифасига олиб боради. Бизга АЛМАШГАН ҳолат керак.
       */
      if (d.username && d.username !== username) {
        setBoshqasi(d.fullName || d.username);
      }
    } catch {
      /* Алоқа йўқ — тинч турамиз, бу қоровулнинг иши эмас */
    }
  }, [username, boshqasi]);

  useEffect(() => {
    const korinish = () => {
      if (document.visibilityState === 'visible') void tekshir();
    };
    window.addEventListener('focus', korinish);
    document.addEventListener('visibilitychange', korinish);
    return () => {
      window.removeEventListener('focus', korinish);
      document.removeEventListener('visibilitychange', korinish);
    };
  }, [tekshir]);

  if (!boshqasi) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="karta w-full max-w-md p-5">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-ink">{tr('Бу браузерда бошқа ҳисобга кирилди')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {tr('Ҳозир тизимда')}{' '}
              <span className="font-semibold text-ink">{tr(boshqasi)}</span>{' '}
              {tr('турибди, экранда эса эски ҳисобнинг саҳифаси очиқ. Давом этсангиз, амаллар ўша ҳисоб номидан бажарилади.')}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">
              {tr('Бир вақтда икки ҳисоб керак бўлса, браузернинг алоҳида профили ёки «инкогнито» ойнасидан фойдаланинг — бир ойнада иккови сиғмайди.')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="tugma-asosiy mt-4 flex w-full items-center justify-center gap-2 rounded-md px-3.5 py-2.5 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {tr('Саҳифани янгилаш')}
        </button>
      </div>
    </div>
  );
}
