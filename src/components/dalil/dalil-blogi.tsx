'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DalilHolati, DalilTuri } from '@prisma/client';
import { BadgeCheck, Check, FileCheck2, Loader2, TriangleAlert, X } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { DALIL_HOLATI_NOMI, DALIL_NOMI } from '@/lib/dalil-nomlari';
import { formatDate } from '@/lib/utils';

/**
 * ============================================================
 *  ЖОЙЛАШТИРИШНИНГ ДАЛИЛИ — ФУҚАРО САҲИФАСИДА
 *
 *  ── Нега бу блок керак ──
 *
 *  «Ишга жойлаштирилди» ҳозирча битта босиш. Ходим тугмани
 *  босади, туман рақами биттага ошади, ва ҳеч ким
 *  текширмайди.
 *
 *  Бу блок ўша бўшлиқни ёпади: жойлаштирилган ҳар бир фуқаро
 *  ёнида «ҳужжати борми» деган савол ТУРАДИ ва унга жавоб
 *  берилмагунча йўқолмайди.
 *
 *  ── Нега киритган одам ўзи тасдиқлай олмайди ──
 *
 *  Ўзи ёзиб, ўзи тасдиқласа, текширувнинг маъноси қолмайди:
 *  рақам яна битта босиш билан ошаверарди.
 *
 *  Қоида техник эмас, ТАШКИЛИЙ: иккита одам кўрган рақам
 *  биттаси кўрганидан ишончлироқ.
 * ============================================================
 */

export interface DalilMaydonlari {
  id: string;
  turi: DalilTuri;
  holati: DalilHolati;
  izoh: string | null;
  reyestrIshJoyi: string | null;
  reyestrSanasi: Date | null;
  createdAt: Date;
  kiritganNomi: string | null;
  kiritganId: string | null;
  tasdiqlaganNomi: string | null;
}

/** Қўлда киритиш мумкин бўлган турлар — реестр файлдан келади */
const QOLDA: DalilTuri[] = ['SHARTNOMA', 'BUYRUQ', 'ISH_BERUVCHI', 'MAHALLA'];

const NISHON: Record<DalilHolati, string> = {
  KIRITILDI: 'bg-warn-bg text-warn',
  TASDIQLANDI: 'bg-ok-bg text-ok',
  RAD_ETILDI: 'bg-danger-bg text-danger',
};

export function DalilBlogi({
  ishsizId,
  joylashgan,
  dalillar,
  qoshaOladi,
  tasdiqlayOladi,
  joriyUserId,
  muddat,
  muddatiOtgan,
}: {
  ishsizId: string;
  joylashgan: boolean;
  dalillar: DalilMaydonlari[];
  qoshaOladi: boolean;
  tasdiqlayOladi: boolean;
  joriyUserId: string;
  muddat: Date | null;
  muddatiOtgan: boolean;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [ochiq, setOchiq] = useState(false);
  const [turi, setTuri] = useState<DalilTuri | ''>('');
  const [izoh, setIzoh] = useState('');
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  /* Жойлашмаган одамда далил ҳам бўлмайди — блок кўринмайди */
  if (!joylashgan) return null;

  const tasdiqlangan = dalillar.some((d) => d.holati === 'TASDIQLANDI');

  async function yubor() {
    if (!turi) return;
    setBand(true);
    setXato(null);
    try {
      const javob = await fetch(`/api/ishsizlar/${ishsizId}/dalil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turi, izoh: izoh.trim() || null }),
      });
      const n = await javob.json();
      if (!javob.ok || !n.ok) {
        setXato(n.xabar ?? 'Saqlab boʻlmadi');
        return;
      }
      setOchiq(false);
      setTuri('');
      setIzoh('');
      router.refresh();
    } catch {
      setXato('Tarmoq xatosi');
    } finally {
      setBand(false);
    }
  }

  async function halQil(dalilId: string, tasdiqlandi: boolean) {
    setBand(true);
    setXato(null);
    try {
      const javob = await fetch(`/api/ishsizlar/${ishsizId}/dalil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dalilId, tasdiqlandi }),
      });
      const n = await javob.json();
      if (!javob.ok || !n.ok) {
        setXato(n.xabar ?? 'Saqlab boʻlmadi');
        return;
      }
      router.refresh();
    } catch {
      setXato('Tarmoq xatosi');
    } finally {
      setBand(false);
    }
  }

  return (
    <section className="karta space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <FileCheck2 className="h-4 w-4 text-accent" />
            {tr('Ишга жойлашганлик далили')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('«Жойлаштирилди» деган ёзув ҳужжат билан тасдиқланиши керак')}
          </p>
        </div>

        {tasdiqlangan ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1 text-xs font-semibold text-ok">
            <BadgeCheck className="h-3.5 w-3.5" />
            {tr('Тасдиқланган')}
          </span>
        ) : muddatiOtgan ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-3 py-1 text-xs font-semibold text-danger">
            <TriangleAlert className="h-3.5 w-3.5" />
            {tr('Муддати ўтган')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1 text-xs font-semibold text-warn">
            {tr('Ҳужжат кутилмоқда')}
          </span>
        )}
      </div>

      {!tasdiqlangan && muddat && (
        <p className="text-xs text-ink-muted">
          {tr('Ҳужжат муддати')}: {formatDate(muddat).split(',')[0]}
        </p>
      )}

      {dalillar.length > 0 && (
        <ul className="space-y-2">
          {dalillar.map((d) => (
            <li key={d.id} className="rounded-md border border-line p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{tr(DALIL_NOMI[d.turi])}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {formatDate(d.createdAt)}
                    {d.kiritganNomi ? ` · ${tr(d.kiritganNomi)}` : ''}
                  </p>
                  {d.reyestrIshJoyi && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {tr('Реестрда')}: {tr(d.reyestrIshJoyi)}
                    </p>
                  )}
                  {d.izoh && <p className="mt-1 text-xs text-warn">{tr(d.izoh)}</p>}
                  {d.tasdiqlaganNomi && (
                    <p className="mt-1 text-xs text-ink-faint">
                      {tr('Текширди')}: {tr(d.tasdiqlaganNomi)}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${NISHON[d.holati]}`}
                >
                  {tr(DALIL_HOLATI_NOMI[d.holati])}
                </span>
              </div>

              {/*
                Текшириш тугмаси ФАҚАТ бошқа одам киритган
                далилда чиқади. Ўзи киритганида чиқса, ходим
                уни босиб қўярди — ва серверда рад жавоб
                оларди, яъни тугма ёлғон ваъда берарди.
              */}
              {tasdiqlayOladi && d.holati === 'KIRITILDI' && d.kiritganId !== joriyUserId && (
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    disabled={band}
                    onClick={() => halQil(d.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-ok px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {tr('Тасдиқлайман')}
                  </button>
                  <button
                    type="button"
                    disabled={band}
                    onClick={() => halQil(d.id, false)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    {tr('Яроқсиз')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {dalillar.length === 0 && (
        <p className="text-sm text-ink-muted">{tr('Ҳали ҳеч қандай ҳужжат киритилмаган.')}</p>
      )}

      {qoshaOladi &&
        (ochiq ? (
          <div className="space-y-2 rounded-md border border-line bg-surface-muted p-3">
            <label className="block text-xs font-semibold text-ink-muted">
              {tr('Ҳужжат тури')}
            </label>
            <select
              value={turi}
              onChange={(e) => setTuri(e.target.value as DalilTuri)}
              className="maydon w-full"
            >
              <option value="">{tr('— танланг —')}</option>
              {QOLDA.map((t) => (
                <option key={t} value={t}>
                  {tr(DALIL_NOMI[t])}
                </option>
              ))}
            </select>

            <label className="block text-xs font-semibold text-ink-muted">
              {tr('Изоҳ ёки ҳужжат рақами')}
            </label>
            <input
              value={izoh}
              onChange={(e) => setIzoh(e.target.value)}
              maxLength={500}
              className="maydon w-full"
              placeholder={tr('масалан: 12-сон буйруқ, 03.09.2026')}
            />

            {xato && <p className="text-xs text-danger">{tr(xato)}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={band || !turi}
                onClick={yubor}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast transition hover:opacity-90 disabled:opacity-50"
              >
                {band ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {tr('Сақлаш')}
              </button>
              <button
                type="button"
                onClick={() => setOchiq(false)}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink"
              >
                {tr('Бекор')}
              </button>
            </div>

            <p className="pt-1 text-xs text-ink-faint">
              {tr('Киритилган ҳужжатни бандлик маркази текширади.')}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOchiq(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
          >
            {tr('Ҳужжат қўшиш')}
          </button>
        ))}

      {xato && !ochiq && <p className="text-xs text-danger">{tr(xato)}</p>}
    </section>
  );
}
