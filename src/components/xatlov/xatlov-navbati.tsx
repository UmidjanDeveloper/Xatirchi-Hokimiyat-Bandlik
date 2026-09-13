'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloudOff, Loader2, TriangleAlert, Upload } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import {
  avtomatikYuboriladimi,
  navbatniOqi,
  navbatniYubor,
  type NavbatNatijalari,
  type YuborishNatijasi,
} from '@/lib/offline';

/**
 * ============================================================
 *  ЮБОРИЛМАГАН ХАТЛОВЛАР
 *
 *  Хатлов ҳовлида, хонадон эшиги олдида тўлдирилади. Хатирчи
 *  туманининг чекка маҳаллаларида алоқа узилиб туради.
 *
 *  Илгари алоқа узилса, ходимга «маълумот телефон хотирасида
 *  сақланди — алоқа тикланганда қайта юборинг» деб ёзиларди.
 *  Бу РОСТ эди, лекин «қайта юбориш» ни ходим ЭСЛАБ ҚОЛИШИ ва
 *  ўзи бажариши керак эди: анкетани қайта очиб, охиригача
 *  ўтиб, яна юбориш тугмасини босиш. Кун охирида, ўнта
 *  хонадондан кейин, буни ким эслайди?
 *
 *  Энди тайёр хатлов НАВБАТГА тушади ва алоқа тикланиши билан
 *  ўзи кетади. Бу чизиқ фақат навбатда яозув бўлганда кўринади.
 *
 *  ── Такрор юборишдан қўрқмаймиз ──
 *
 *  Сервер жавоби келишидан олдин алоқа узилса, ёзув аслида
 *  сақланган бўлиши мумкин. Қайта юборилса, сервер 409
 *  қайтаради («бу хонадон аллақачон хатловдан ўтган») —
 *  чунки маҳалла + манзил + оила бошлиғи бўйича ягоналик
 *  чегараси бор. Бу ХАТО эмас, муваффақият: ёзув жойида.
 * ============================================================
 */

/**
 * Битта ёзувни юборади ва натижани турига ажратади.
 *
 * Навбатда СЎРОВНИНГ ЎЗИ сақланади — қоралама `id` си билан
 * бирга. Бу муҳим: агар анкета аввал қоралама сифатида
 * сақланган бўлса, `id` сиз юбориш ЯНГИ ёзув яратишга уринарди,
 * ягоналик чегараси уни 409 билан рад этарди, ва эски қоралама
 * абадий «юборилмаган» бўлиб қолиб кетарди.
 */
async function bittasiniYubor(sorov: unknown): Promise<YuborishNatijasi> {
  let javob: Response;
  try {
    javob = await fetch('/api/xatlov', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sorov),
    });
  } catch {
    return 'aloqa-yoq';
  }

  if (javob.ok) return 'saqlandi';
  // Такрор — сервер ёзувни аллақачон сақлаган
  if (javob.status === 409) return 'takror';
  // Сервер ишламаяпти — кейинроқ уриниш мантиқли
  if (javob.status >= 500) return 'aloqa-yoq';
  // 400, 401, 403 — қайта юборишдан фойда йўқ
  return 'yaroqsiz';
}

export function XatlovNavbati() {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [soni, setSoni] = useState(0);
  const [etibor, setEtibor] = useState(0);
  const [ishlamoqda, setIshlamoqda] = useState(false);
  const [natija, setNatija] = useState<NavbatNatijalari | null>(null);

  const sana = useCallback(() => {
    const n = navbatniOqi();
    setSoni(n.length);
    setEtibor(n.filter((y) => !avtomatikYuboriladimi(y)).length);
    return n.length;
  }, []);

  const yubor = useCallback(async () => {
    if (ishlamoqda) return;
    setIshlamoqda(true);
    try {
      const n = await navbatniYubor(bittasiniYubor);
      setNatija(n);
      sana();
      if (n.yuborildi > 0 || n.takror > 0) router.refresh();
    } finally {
      setIshlamoqda(false);
    }
  }, [ishlamoqda, router, sana]);

  useEffect(() => {
    /*
     * Саҳифа очилганда бир марта ва алоқа тикланганда — ҳар
     * сафар. Таймер билан такрорлаб турмаймиз: батарея ҳовлида
     * кун бўйи ишлайдиган телефонда қиммат, ва `online` ҳодисаси
     * айнан керакли пайтда келади.
     */
    if (sana() > 0 && navigator.onLine) void yubor();

    const tiklandi = () => { if (sana() > 0) void yubor(); };
    window.addEventListener('online', tiklandi);
    return () => window.removeEventListener('online', tiklandi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Навбат бўш — чизиқ умуман кўринмайди
  if (soni === 0 && !natija) return null;

  if (soni === 0 && natija) {
    const jami = natija.yuborildi + natija.takror;
    if (jami === 0) return null;
    return (
      <div className="quti-ok mb-3 flex items-center gap-2">
        <Upload className="h-4 w-4 shrink-0" />
        <span>
          {tr('Кутиб турган')} {jami} {tr('та хатлов серверга юборилди.')}
          {natija.takror > 0
            ? ` ${natija.takror} ${tr('таси аввалроқ сақланган экан.')}`
            : ''}
        </span>
      </div>
    );
  }

  const hammasiEtibor = etibor === soni;

  return (
    <div
      className={`mb-3 rounded-md border p-3 ${
        hammasiEtibor ? 'border-danger bg-danger-bg' : 'border-warn bg-warn-bg'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {hammasiEtibor ? (
            <TriangleAlert className="h-4 w-4 shrink-0 text-danger" />
          ) : (
            <CloudOff className="h-4 w-4 shrink-0 text-warn" />
          )}
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${hammasiEtibor ? 'text-danger' : 'text-warn'}`}>
              <span className="raqam">{soni}</span> {tr('та хатлов ҳали юборилмаган')}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              {etibor > 0
                ? tr(
                    `${etibor} таси бир неча марта уриниб кўрилди ва ўтмади — уларни қайта очиб текшириш керак.`
                  )
                : tr('Алоқа тикланиши билан ўзи юборилади. Телефонни ўчирсангиз ҳам йўқолмайди.')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void yubor()}
          disabled={ishlamoqda}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {ishlamoqda ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {tr('Ҳозир юбориш')}
        </button>
      </div>

      {natija?.aloqaYoq && !ishlamoqda && (
        <p className="mt-2 text-[11px] text-ink-muted">
          {tr('Алоқа ҳали йўқ. Кейинроқ ўзи қайта уринади.')}
        </p>
      )}
    </div>
  );
}
