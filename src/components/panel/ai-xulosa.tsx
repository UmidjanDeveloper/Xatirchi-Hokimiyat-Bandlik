'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Lightbulb, Loader2, RefreshCw, Siren, Sparkles } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import type { HisobotTavsiyasi, Xulosa } from '@/lib/hisobot/turlar';

/**
 * ============================================================
 *  ТАҲЛИЛ ХУЛОСАСИ — экранда
 *
 *  Диаграммалар «нима бўляпти» дейди. Бу блок «энди нима қилиш
 *  керак» дейди — панелнинг энг тепасида турибди, чунки ҳоким
 *  панелни аниқ савол билан очади: «бугун нимага эътибор
 *  бераман».
 *
 *  ── Нега мижоз томонда юкланади ──
 *
 *  Хулоса тайёрлаш AI сўровини талаб қилади ва 10-20 секунд
 *  кетиши мумкин. Агар у саҳифа билан бирга серверда
 *  ҳисобланса, панел шу вақт давомида умуман очилмасди —
 *  диаграммалар ҳам, жадваллар ҳам кўринмасди.
 *
 *  Шунинг учун панел дарҳол очилади, хулоса эса ўз вақтида
 *  келиб қўшилади. Сервер томонда 15 дақиқалик кеш бор, шунинг
 *  учун иккинчи марта очилганда дарҳол чиқади.
 *
 *  ── Манба ҳар доим кўрсатилади ──
 *
 *  Ўқувчи матнни AI ёзганини ёки қоида бўйича ҳисоблангани
 *  билиши ШАРТ. Йиғилишда «буни ким айтди» деган савол чиқади ва
 *  унга жавоб бўлиши керак.
 * ============================================================
 */

const DARAJA: Record<
  HisobotTavsiyasi['daraja'],
  { nomi: string; sinf: string; ikonka: typeof Siren }
> = {
  shoshilinch: {
    nomi: 'Шошилинч',
    sinf: 'border-danger/35 bg-danger-bg text-danger',
    ikonka: Siren,
  },
  muhim: {
    nomi: 'Муҳим',
    sinf: 'border-warn/35 bg-warn-bg text-warn',
    ikonka: AlertTriangle,
  },
  imkoniyat: {
    nomi: 'Имконият',
    sinf: 'border-ok/35 bg-ok-bg text-ok',
    ikonka: Lightbulb,
  },
};

export function AiXulosa({
  mahallaId,
  /**
   * Ҳудуд номи КИРИЛЛДА берилади ва шу ерда ўгирилади.
   *
   * Нега шунақа: сервер томондаги `matnchi()` куки ўқилган
   * пайтдаги алифбога қараб ишлайди. Фойдаланувчи саҳифада
   * туриб алифбони алмаштирса, сервер юборган матн ЭСКИ
   * алифбода қотиб қолади — «Алишер Навоий» лотин саҳифада
   * кириллда кўриниб турарди.
   */
  qamrovNomi,
}: {
  mahallaId?: string | null;
  qamrovNomi: string;
}) {
  const { t: tr, alifbo } = useAlifbo();
  const [xulosa, setXulosa] = useState<Xulosa | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState<string | null>(null);

  const ol = useCallback(
    async (qaytadan = false) => {
      setYuklanmoqda(true);
      setXato(null);
      try {
        const javob = await fetch('/api/hisobot/xulosa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mahallaId: mahallaId ?? null,
            lotin: alifbo === 'lot',
            yangila: qaytadan,
          }),
        });
        const d = await javob.json().catch(() => ({}));
        if (!javob.ok) throw new Error(d.xabar ?? tr('Хулоса олинмади'));
        setXulosa(d.xulosa as Xulosa);
      } catch (e) {
        setXato(e instanceof Error ? e.message : tr('Хулоса олинмади'));
      } finally {
        setYuklanmoqda(false);
      }
    },
    [mahallaId, alifbo, tr]
  );

  useEffect(() => {
    void ol();
  }, [ol]);

  /* ── Юкланиш ── */
  if (yuklanmoqda && !xulosa) {
    return (
      <div className="karta p-5">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink">{tr('Таҳлил хулосаси тайёрланмоқда…')}</h2>
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">
          {tr('Маълумот жамланиб, тавсиялар ҳисобланмоқда. Панелнинг қолган қисми тайёр.')}
        </p>
        {/* Скелет — жой эгаллаб турсин, саҳифа сакрамасин */}
        <div className="mt-4 space-y-2" aria-hidden="true">
          <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    );
  }

  if (xato && !xulosa) {
    return (
      <div className="karta p-5">
        <h2 className="text-sm font-bold text-ink">{tr('Таҳлил хулосаси')}</h2>
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {xato}
        </p>
        <button
          type="button"
          onClick={() => void ol(true)}
          className="mt-3 flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {tr('Қайта уриниш')}
        </button>
      </div>
    );
  }

  if (!xulosa) return null;

  return (
    <div className="karta overflow-hidden">
      {/* ── Сарлавҳа ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink">{tr('Таҳлил хулосаси ва тавсиялар')}</h2>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            {tr(qamrovNomi)} ·{' '}
            {xulosa.manba === 'ai'
              ? tr('сунъий интеллект таҳлили')
              : tr('белгиланган чегаралар бўйича')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void ol(true)}
          disabled={yuklanmoqda}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {yuklanmoqda ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {tr('Янгилаш')}
        </button>
      </div>

      {/*
        ── AI ЖАВОБ БЕРМАГАНИ ──

        Бу ҳолат КЎРИНИБ туриши керак. Илгари у фақат блок
        тагидаги 11px кулранг изоҳда ёзиларди ва ҳеч ким уни
        ўқимасди: ҳоким панелни очар, қоида матнини кўрар ва
        «бу панелда AI умуман йўқ экан» деб ўйларди — ҳолбуки
        AI сўралган, фақат калит ишламаган.

        Энди у сарлавҳа остида, сариқ қутида туради ва нима
        қилиш кераклигини айтади.
      */}
      {xulosa.aiKutilgan && xulosa.manba === 'qoida' && (
        <div className="quti-ogoh mx-5 mt-4 text-xs">
          <p className="font-semibold">{tr('Сунъий интеллект жавоб бермади')}</p>
          <p className="mt-1 leading-relaxed">
            {tr('Қуйидаги хулоса белгиланган чегаралар бўйича ҳисобланган — у ҳам тўғри, аммо боғланишларни топмайди. «Янгилаш» ни босиб кўринг; такрорланса, «Бошқарув» саҳифасидаги AI блокидан калитни текширинг.')}
          </p>
        </div>
      )}

      {/* ── Ҳозирги ҳолат ── */}
      {xulosa.holat && (
        <div className="border-b border-line bg-surface-muted px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
            {tr('Ҳозирги ҳолат')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{xulosa.holat}</p>
        </div>
      )}

      {/* ── Тавсиялар ── */}
      {xulosa.tavsiyalar.length === 0 ? (
        <p className="px-5 py-5 text-sm text-ink-muted">
          {tr('Ҳозирги маълумот асосида алоҳида тавсия чиқмади.')}
        </p>
      ) : (
        <ol className="divide-y divide-line">
          {xulosa.tavsiyalar.map((t, i) => {
            const d = DARAJA[t.daraja] ?? DARAJA.muhim;
            const Ikonka = d.ikonka;
            return (
              <li key={`${t.sarlavha}-${i}`} className="flex gap-3 px-5 py-3.5">
                <span
                  className={`mt-0.5 flex h-6 shrink-0 items-center gap-1 rounded-md border px-1.5 text-[10px] font-bold ${d.sinf}`}
                >
                  <Ikonka className="h-3 w-3" aria-hidden="true" />
                  {tr(d.nomi)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{t.sarlavha}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{t.dalil}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/*
        ── Огоҳлик ──

        AI ишламаган ҳолатда бу матн ЮҚОРИДАГИ сариқ қутида
        аллақачон айтилган — иккинчи марта такрорланмасин.
      */}
      {xulosa.ogohlik && !(xulosa.aiKutilgan && xulosa.manba === 'qoida') && (
        <p className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-ink-faint">
          {xulosa.ogohlik}
        </p>
      )}
    </div>
  );
}
