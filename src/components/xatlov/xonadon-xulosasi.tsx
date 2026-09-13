'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Lightbulb, Loader2, RefreshCw, Siren, Sparkles } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import type { XonadonXulosasi, XulosaDarajasi } from '@/lib/xonadon-xulosa';

/**
 * ============================================================
 *  ХОНАДОН ХУЛОСАСИ — экранда
 *
 *  Анкетанинг 11 бўлими ходимга «нима бор» дейди. Бу блок
 *  «нимадан бошлаш керак» дейди.
 *
 *  ── Нега саҳифа билан бирга юкланмайди ──
 *
 *  Хулоса бир марта тайёрланиб БАЗАГА ЁЗИЛАДИ. Саҳифа уни
 *  тайёр ҳолда олади ва дарҳол кўрсатади; модел эса фақат
 *  ходим «тайёрлаш» ёки «янгилаш» тугмасини босганда чақирилади.
 *
 *  Панелдаги хулосадан фарқи шунда: у ҳар очилганда янгиланади
 *  (маълумот тез ўзгаради), бу эса анкета ўзгармагунча ўзгармас
 *  бўлиши керак — акс ҳолда ходим бугун бир хил, эртага бошқа
 *  тавсия кўриб, қайси бирига амал қилишни билмай қоларди.
 *
 *  ── Манба ҳар доим кўрсатилади ──
 *
 *  Матнни AI ёзганми ёки чегаралар бўйича ҳисоблангани
 *  ёзилади. «Буни ким айтди» деган саволга жавоб бўлиши шарт.
 * ============================================================
 */

const DARAJA: Record<XulosaDarajasi, { nomi: string; sinf: string; ikonka: typeof Siren }> = {
  shoshilinch: { nomi: 'Шошилинч', sinf: 'border-danger/35 bg-danger-bg text-danger', ikonka: Siren },
  muhim: { nomi: 'Муҳим', sinf: 'border-warn/35 bg-warn-bg text-warn', ikonka: AlertTriangle },
  imkoniyat: { nomi: 'Имконият', sinf: 'border-ok/35 bg-ok-bg text-ok', ikonka: Lightbulb },
};

interface Props {
  xonadonId: string;
  /** Базада сақланган хулоса — JSON матн ёки `null` */
  saqlangan: string | null;
  vaqti: string | null;
  /** Ходим хулоса тайёрлай оладими (ҳоким фақат ўқийди) */
  tahrirlaydi: boolean;
  /** Қоралама анкетада хулоса ёзилмайди */
  qoralama: boolean;
}

/**
 * Сақланган матнни ўқийди.
 *
 * Эски ёки бузилган ёзувга ишонмаймиз: JSON бўлмаса, матн ўз
 * ҳолида кўрсатилади. Хулоса йўқолиб кетгандан кўра, шакли
 * бузилган бўлса ҳам кўринган яхши.
 */
function oqi(xom: string | null): XonadonXulosasi | { xom: string } | null {
  if (!xom) return null;
  try {
    const d = JSON.parse(xom) as XonadonXulosasi;
    if (typeof d?.holat === 'string' && Array.isArray(d?.tavsiyalar)) return d;
  } catch {
    /* JSON emas - pastda xom matn sifatida ko'rsatiladi */
  }
  return { xom };
}

export function XonadonXulosasi({ xonadonId, saqlangan, vaqti, tahrirlaydi, qoralama }: Props) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [xulosa, setXulosa] = useState(() => oqi(saqlangan));
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const [yangiVaqt, setYangiVaqt] = useState<string | null>(null);

  async function tayyorla() {
    if (yuklanmoqda) return;
    setXato(null);
    setYuklanmoqda(true);
    try {
      const javob = await fetch(`/api/xatlov/${xonadonId}/xulosa`, { method: 'POST' });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Хулоса тайёрланмади'));
        return;
      }
      setXulosa({ manba: d.manba, holat: d.holat, tavsiyalar: d.tavsiyalar });
      setYangiVaqt(new Date().toLocaleDateString('ru-RU'));
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuklanmoqda(false);
    }
  }

  const tugma = tahrirlaydi && !qoralama && (
    <button
      type="button"
      onClick={tayyorla}
      disabled={yuklanmoqda}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
    >
      {yuklanmoqda ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {xulosa ? tr('Янгилаш') : tr('Хулоса тайёрлаш')}
    </button>
  );

  /* ── Ҳали тайёрланмаган ── */
  if (!xulosa) {
    return (
      <section className="karta p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <h2 className="text-sm font-bold text-ink">{tr('Хулоса ва тавсиялар')}</h2>
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">
              {qoralama
                ? tr('Қоралама анкета бўйича хулоса ёзилмайди — аввал уни юборинг.')
                : tahrirlaydi
                  ? tr('Анкета маълумоти асосида «нимадан бошлаш керак» деган тавсиялар тайёрланади. Оила бошлиғининг исми, манзили ва телефони ташқарига ЮБОРИЛМАЙДИ — фақат сонлар ва рўйхатдан танланган қийматлар.')
                  : tr('Бу хонадон учун хулоса ҳали тайёрланмаган.')}
            </p>
          </div>
          {tugma}
        </div>
        {xato && <div className="quti-xato mt-3">{xato}</div>}
      </section>
    );
  }

  /* ── Эски шаклдаги ёзув ── */
  if ('xom' in xulosa) {
    return (
      <section className="karta p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-sm font-bold text-ink">{tr('Хулоса ва тавсиялар')}</h2>
          {tugma}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{xulosa.xom}</p>
        {xato && <div className="quti-xato mt-3">{xato}</div>}
      </section>
    );
  }

  const sana = yangiVaqt ?? vaqti;

  return (
    <section className="karta overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink">{tr('Хулоса ва тавсиялар')}</h2>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            {xulosa.manba === 'ai'
              ? tr('сунъий интеллект таҳлили')
              : tr('белгиланган чегаралар бўйича')}
            {sana ? ` · ${sana}` : ''}
          </p>
        </div>
        {tugma}
      </div>

      {xato && (
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <div className="quti-xato">{xato}</div>
        </div>
      )}

      {xulosa.holat && (
        <div className="border-b border-line bg-surface-muted px-4 py-4 sm:px-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
            {tr('Оиланинг ҳолати')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{xulosa.holat}</p>
        </div>
      )}

      {xulosa.tavsiyalar.length === 0 ? (
        <p className="px-4 py-5 text-sm text-ink-muted sm:px-5">
          {tr('Анкета маълумоти асосида алоҳида тавсия чиқмади.')}
        </p>
      ) : (
        <ol className="divide-y divide-line">
          {xulosa.tavsiyalar.map((t, i) => {
            const d = DARAJA[t.daraja] ?? DARAJA.muhim;
            const Ikonka = d.ikonka;
            return (
              <li key={`${t.sarlavha}-${i}`} className="flex gap-3 px-4 py-3.5 sm:px-5">
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

      <p className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-ink-faint sm:px-5">
        {xulosa.manba === 'ai'
          ? tr('Матн сунъий интеллект томонидан, анкетанинг ИСМСИЗ маълумоти асосида тайёрланган: оила бошлиғининг исми, манзили, телефони ва ходим ёзган эркин изоҳлар юборилмаган. Тавсия — қарор эмас; охирги сўз ходимники.')
          : tr('Тавсиялар анкетадаги белгиланган чегаралар бўйича ҳисобланган — сунъий интеллект жавоб бермади ёки калит созланмаган.')}
      </p>
    </section>
  );
}
