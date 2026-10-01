'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RejaTosigi } from '@prisma/client';
import { Check, Loader2, Save } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MASUL_TASHKILOT } from '@/lib/constants';
import { TOSIQ_NOMI, TOSIQ_TARTIBI } from '@/lib/oila-rejasi-nomlari';
import { MAYDON, useSaqlanmaganOgohlantirish } from './umumiy';

export interface RejaQiymati {
  boshlangichHolat: string;
  maqsad: string;
  maqsadKelishilgan: boolean;
  resurslar: string;
  tosiqlar: RejaTosigi[];
  tosiqIzohi: string;
  masulXodimId: string;
  masulTashkilot: string;
  muddat: string;
  zarurResurs: string;
  keyingiAloqaSanasi: string;
}

/**
 * Rejaning asosiy maydonlari: maqsad, resurslar, to'siqlar, mas'ul,
 * muddat, zarur resurs, keyingi aloqa.
 *
 * "Saqlandi" faqat server `ok` deganidan keyin ko'rinadi - sorov
 * ketayotgan yoki xato bo'lgan paytda hech qachon.
 */
export function RejaTahrir({
  rejaId,
  boshlangich,
  xodimlar,
  tahrirlashMumkin,
}: {
  rejaId: string;
  boshlangich: RejaQiymati;
  xodimlar: { id: string; ism: string }[];
  tahrirlashMumkin: boolean;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [q, setQ] = useState<RejaQiymati>(boshlangich);
  const [saqlangan, setSaqlangan] = useState<RejaQiymati>(boshlangich);
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [yangiSaqlandi, setYangiSaqlandi] = useState(false);

  const ozgargan = JSON.stringify(q) !== JSON.stringify(saqlangan);
  useSaqlanmaganOgohlantirish(ozgargan);

  function o<K extends keyof RejaQiymati>(k: K, v: RejaQiymati[K]) {
    setQ((x) => ({ ...x, [k]: v }));
    setYangiSaqlandi(false);
  }

  function tosiqniAlmashtir(t: RejaTosigi) {
    o('tosiqlar', q.tosiqlar.includes(t) ? q.tosiqlar.filter((x) => x !== t) : [...q.tosiqlar, t]);
  }

  async function saqla() {
    if (yuborilmoqda || !ozgargan) return;
    if (q.boshlangichHolat.trim().length < 5) return setXato(tr('Бошланғич ҳолатни ёзинг'));
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/rejalar/${rejaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boshlangichHolat: q.boshlangichHolat.trim(),
          maqsad: q.maqsad,
          maqsadKelishilgan: q.maqsadKelishilgan,
          resurslar: q.resurslar,
          tosiqlar: q.tosiqlar,
          tosiqIzohi: q.tosiqIzohi,
          masulXodimId: q.masulXodimId || null,
          masulTashkilot: q.masulTashkilot || null,
          muddat: q.muddat || null,
          zarurResurs: q.zarurResurs,
          keyingiAloqaSanasi: q.keyingiAloqaSanasi || null,
        }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setSaqlangan(q);
      setYangiSaqlandi(true);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Ўзгаришлар сақланмади — қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  const o_ = !tahrirlashMumkin;

  return (
    <div className="karta space-y-4 p-4">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="rt-bosh" className="text-sm font-medium text-ink">
          {tr('Бошланғич ҳолат')}
        </label>
        <textarea
          id="rt-bosh"
          rows={4}
          disabled={o_}
          value={q.boshlangichHolat}
          onChange={(e) => o('boshlangichHolat', e.target.value)}
          className={MAYDON}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="rt-maqsad" className="text-sm font-medium text-ink">
          {tr('Оиланинг ўзи танлаган мақсад')}
        </label>
        <textarea
          id="rt-maqsad"
          rows={2}
          disabled={o_}
          value={q.maqsad}
          onChange={(e) => o('maqsad', e.target.value)}
          className={MAYDON}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            disabled={o_}
            checked={q.maqsadKelishilgan}
            onChange={(e) => o('maqsadKelishilgan', e.target.checked)}
            className="h-4 w-4"
          />
          {tr('Мақсад оила билан келишилган (ходим оила сўзидан ёзган)')}
        </label>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="rt-resurs" className="text-sm font-medium text-ink">
          {tr('Мавжуд кўникма ва ресурслар')}
        </label>
        <textarea
          id="rt-resurs"
          rows={2}
          disabled={o_}
          value={q.resurslar}
          onChange={(e) => o('resurslar', e.target.value)}
          className={MAYDON}
        />
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-ink">
          {tr('Даромад олишга тўсқинлик қилаётган сабаблар')}
        </legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {TOSIQ_TARTIBI.map((t) => (
            <label key={t} className="flex min-h-11 items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                disabled={o_}
                checked={q.tosiqlar.includes(t)}
                onChange={() => tosiqniAlmashtir(t)}
                className="h-4 w-4"
              />
              {tr(TOSIQ_NOMI[t])}
            </label>
          ))}
        </div>
        <textarea
          aria-label={tr('Тўсиқлар ҳақида изоҳ')}
          rows={2}
          disabled={o_}
          placeholder={tr('Изоҳ (ихтиёрий)')}
          value={q.tosiqIzohi}
          onChange={(e) => o('tosiqIzohi', e.target.value)}
          className={MAYDON}
        />
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="rt-xodim" className="text-sm font-medium text-ink">
            {tr('Масъул ходим')}
          </label>
          <select
            id="rt-xodim"
            disabled={o_}
            value={q.masulXodimId}
            onChange={(e) => o('masulXodimId', e.target.value)}
            className={MAYDON}
          >
            <option value="">{tr('— Танланмаган —')}</option>
            {xodimlar.map((x) => (
              <option key={x.id} value={x.id}>
                {x.ism}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rt-tashkilot" className="text-sm font-medium text-ink">
            {tr('Масъул ташкилот')}
          </label>
          <select
            id="rt-tashkilot"
            disabled={o_}
            value={q.masulTashkilot}
            onChange={(e) => o('masulTashkilot', e.target.value)}
            className={MAYDON}
          >
            <option value="">{tr('— Танланмаган —')}</option>
            {MASUL_TASHKILOT.map((t) => (
              <option key={t.qiymat} value={t.qiymat}>
                {t.kirill}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rt-muddat" className="text-sm font-medium text-ink">
            {tr('Режа муддати')}
          </label>
          <input
            id="rt-muddat"
            type="date"
            disabled={o_}
            value={q.muddat}
            onChange={(e) => o('muddat', e.target.value)}
            className={MAYDON}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rt-aloqa" className="text-sm font-medium text-ink">
            {tr('Кейинги алоқа санаси')}
          </label>
          <input
            id="rt-aloqa"
            type="date"
            disabled={o_}
            value={q.keyingiAloqaSanasi}
            onChange={(e) => o('keyingiAloqaSanasi', e.target.value)}
            className={MAYDON}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="rt-zarur" className="text-sm font-medium text-ink">
          {tr('Зарур хизмат ёки ресурс')}
        </label>
        <textarea
          id="rt-zarur"
          rows={2}
          disabled={o_}
          value={q.zarurResurs}
          onChange={(e) => o('zarurResurs', e.target.value)}
          className={MAYDON}
        />
      </div>

      {tahrirlashMumkin && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saqla}
            disabled={yuborilmoqda || !ozgargan}
            className="tugma-asosiy flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold"
          >
            {yuborilmoqda ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {tr('Сақлаш')}
          </button>
          {ozgargan && !yuborilmoqda && (
            <span className="text-xs text-warn" role="status">
              {tr('Сақланмаган ўзгаришлар бор')}
            </span>
          )}
          {yangiSaqlandi && !ozgargan && (
            <span className="flex items-center gap-1 text-xs text-ok" role="status">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {tr('Сақланди')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

