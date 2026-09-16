'use client';

import { useState } from 'react';
import { Gauge, Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  ТЕЗЛИК ЎЛЧАГИЧ — экранда
 *
 *  «Сайт секин» деган гапдан чора чиқмайди. Бу блок бир тугма
 *  билан аниқ рақам беради: базага бориш неча миллисекунд,
 *  панел маълумоти қанчада тайёрланади ва уланиш пулердан
 *  ўтяптими.
 *
 *  Пастда эса ХУЛОСА туради — рақамни талқин қилиш
 *  администраторнинг иши эмас.
 * ============================================================
 */

interface Natija {
  jami: number;
  baza: { ping: number[]; eng: number; ortacha: number };
  sorovlar: { sanash: number; panel: number; panelXatosi: string | null };
  hajm: { xonadon: number; ishsiz: number; xodim: number };
  ulanish: { port: string | null; pulerdanmi: boolean; pgbouncer: boolean; chegara: string | null };
  tuzilish: { joyidami: boolean; izoh: string | null };
  migratsiya: { soni: number; oxirgisi: string | null };
  maslahatlar: string[];
}

export function TezlikOlchagich() {
  const { t: tr } = useAlifbo();
  const [natija, setNatija] = useState<Natija | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function olcha() {
    setYuklanmoqda(true);
    setXato(null);
    try {
      const javob = await fetch('/api/admin/tezlik');
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) throw new Error(d.xabar ?? tr('Ўлчаб бўлмади'));
      setNatija(d as Natija);
    } catch (e) {
      setXato(e instanceof Error ? e.message : tr('Ўлчаб бўлмади'));
    } finally {
      setYuklanmoqda(false);
    }
  }

  /** Рақамни ранг билан баҳолаш — кўз дарҳол топсин */
  const baho = (ms: number, yaxshi: number, yomon: number) =>
    ms <= yaxshi ? 'text-ok' : ms <= yomon ? 'text-warn' : 'text-danger';

  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink">{tr('Тезлик ўлчови')}</h2>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('«Сайт секин» деганда — қаери секинлигини кўрсатади')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void olcha()}
          disabled={yuklanmoqda}
          className="tugma-asosiy flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold"
        >
          {yuklanmoqda ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Gauge className="h-4 w-4" aria-hidden="true" />
          )}
          {yuklanmoqda ? tr('Ўлчанмоқда…') : tr('Тезликни ўлчаш')}
        </button>
      </div>

      {xato && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {xato}
        </p>
      )}

      {natija && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Olchov
              nomi={tr('Базага бориб-келиш')}
              qiymat={`${natija.baza.eng} ${tr('мс')}`}
              izoh={tr('энг тез уриниш')}
              sinf={baho(natija.baza.eng, 50, 150)}
            />
            <Olchov
              nomi={tr('Панел маълумоти')}
              qiymat={`${natija.sorovlar.panel} ${tr('мс')}`}
              izoh={tr('ҳоким панели очилганда')}
              sinf={baho(natija.sorovlar.panel, 800, 2000)}
            />
            <Olchov
              nomi={tr('База тузилиши')}
              qiymat={natija.tuzilish.joyidami ? tr('мос') : tr('МОС ЭМАС')}
              izoh={`${natija.migratsiya.soni} ${tr('миграция қўлланган')}`}
              sinf={natija.tuzilish.joyidami ? 'text-ok' : 'text-danger'}
            />
            <Olchov
              nomi={tr('Уланиш')}
              qiymat={natija.ulanish.pulerdanmi ? tr('пулердан') : tr('тўғридан-тўғри')}
              izoh={`${tr('порт')} ${natija.ulanish.port ?? '?'}`}
              sinf={natija.ulanish.pulerdanmi ? 'text-ok' : 'text-danger'}
            />
          </div>

          <p className="text-[11px] text-ink-faint">
            {tr('Базада')}: {natija.hajm.xonadon.toLocaleString('ru-RU')} {tr('хонадон')},{' '}
            {natija.hajm.ishsiz.toLocaleString('ru-RU')} {tr('ишсиз')},{' '}
            {natija.hajm.xodim.toLocaleString('ru-RU')} {tr('ходим')} ·{' '}
            {tr('уринишлар')}: {natija.baza.ping.join(', ')} {tr('мс')}
            {natija.migratsiya.oxirgisi ? ` · ${tr('охиргиси')}: ${natija.migratsiya.oxirgisi}` : ''}
          </p>

          <div className="space-y-2">
            {natija.maslahatlar.map((m, i) => (
              <p
                key={i}
                className={`text-xs leading-relaxed ${
                  natija.tuzilish.joyidami || i > 0 ? 'quti-ogoh' : 'quti-xato'
                }`}
              >
                {tr(m)}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Olchov({
  nomi,
  qiymat,
  izoh,
  sinf,
}: {
  nomi: string;
  qiymat: string;
  izoh: string;
  sinf: string;
}) {
  return (
    <div className="rounded-md border border-line p-3">
      <p className="text-[11px] font-medium text-ink-faint">{nomi}</p>
      <p className={`raqam mt-1 text-lg font-bold ${sinf}`}>{qiymat}</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">{izoh}</p>
    </div>
  );
}
