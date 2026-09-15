'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Lightbulb, ListChecks, Loader2, Siren, Sparkles } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import type { XonadonXulosasi as Xulosa, XulosaDarajasi } from '@/lib/xonadon-xulosa';

/**
 * ============================================================
 *  ХОНАДОН ХУЛОСАСИ — экранда
 *
 *  Анкетанинг 13 бўлими ходимга «нима бор» дейди. Бу блок
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
  /**
   * ҚОИДА бўйича хулоса — серверда ҳисобланиб, тайёр ҳолда
   * келади. Ҳар доим бор, ҳар роль кўради, сўровсиз.
   */
  qoida: Xulosa;
  /** Базада сақланган AI хулосаси — JSON матн ёки `null` */
  saqlangan: string | null;
  vaqti: string | null;
  /** AI хулосасини сўрай оладими (ҳоким, раҳбар, админ) */
  aiSoraydi: boolean;
  /** Қоралама анкетада AI хулосаси ёзилмайди */
  qoralama: boolean;
}

/**
 * Сақланган матнни ўқийди.
 *
 * Эски ёки бузилган ёзувга ишонмаймиз: JSON бўлмаса, матн ўз
 * ҳолида кўрсатилади. Хулоса йўқолиб кетгандан кўра, шакли
 * бузилган бўлса ҳам кўринган яхши.
 */
function oqi(xom: string | null): Xulosa | null {
  if (!xom) return null;
  try {
    const d = JSON.parse(xom) as Xulosa;
    if (typeof d?.holat === 'string' && Array.isArray(d?.tavsiyalar)) return d;
  } catch {
    /* JSON emas yoki eski shakl - qoida bo'yicha xulosa ko'rsatiladi */
  }
  return null;
}

export function XonadonXulosasi({
  xonadonId,
  qoida,
  saqlangan,
  vaqti,
  aiSoraydi,
  qoralama,
}: Props) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  /*
   * Бошланғич ҳолат: сақланган AI хулосаси бўлса — ўша, бўлмаса
   * ҚОИДА бўйича хулоса. Ya'ni блок ҲЕЧ ҚАЧОН бўш турмайди ва
   * ҳеч ким тугма босишини кутмайди.
   */
  const [xulosa, setXulosa] = useState<Xulosa>(() => oqi(saqlangan) ?? qoida);
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

  const aiMi = xulosa.manba === 'ai';
  const sana = yangiVaqt ?? vaqti;

  /*
   * Тугма фақат ҳоким, раҳбар ва администраторда. Қоралама
   * анкетада эса умуман йўқ: у ҳали юборилмаган.
   */
  const tugma = aiSoraydi && !qoralama && (
    <button
      type="button"
      onClick={tayyorla}
      disabled={yuklanmoqda}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
    >
      {yuklanmoqda ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {aiMi ? tr('Янгилаш') : tr('Сунъий интеллект таҳлили')}
    </button>
  );

  return (
    <section className="karta overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
            {aiMi ? (
              <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            ) : (
              <ListChecks className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
            )}
            {tr('Хулоса ва тавсиялар')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {aiMi
              ? `${tr('сунъий интеллект таҳлили')}${sana ? ` · ${sana}` : ''}`
              : tr('анкетадаги белгиланган чегаралар бўйича')}
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
        {aiMi
          ? tr('Матн сунъий интеллект томонидан, анкетанинг ИСМСИЗ маълумоти асосида тайёрланган: оила бошлиғининг исми, манзили, телефони ва ходим ёзган эркин изоҳлар юборилмаган. Тавсия — қарор эмас; охирги сўз ходимники.')
          : tr('Тавсиялар анкетадаги белгиланган чегаралар бўйича ҳисобланган — ҳеч қаерга маълумот юборилмайди. Тавсия — қарор эмас; охирги сўз ходимники.')}
      </p>
    </section>
  );
}
