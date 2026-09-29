'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, Loader2, Phone, X } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { formatDate, formatPhone } from '@/lib/utils';

/**
 * ============================================================
 *  МОДЕРАЦИЯ — САЙТДА
 *
 *  ── Нега бот етарли эмас эди ──
 *
 *  Модерация аввал ФАҚАТ ботда эди. Бугун эса 78 та ходимдан
 *  70 таси ботга уланмаган, ва бандлик раҳбари ҳам уланмаган
 *  бўлиши мумкин.
 *
 *  Ўшанда занжир ЎЗ БОШИДА тўхтарди: иш берувчи ариза
 *  юборади, ариза навбатда туради, тасдиқлайдиган йўл эса
 *  умуман йўқ.
 *
 *  ── Нега рад этишда САБАБ сўралади ──
 *
 *  «Рад этилди» деган ялпи жавоб иш берувчини тўхтатади: у
 *  нимани тузатишни билмайди ва иккинчи марта уринмайди.
 *
 *  Сабаб эса қадамга айланади — «телефон нотўғри» бўлса, у
 *  уни тузатиб қайта юборади.
 * ============================================================
 */

export interface BeruvchiArizasi {
  id: string;
  korxonaNomi: string;
  masulShaxs: string;
  telefon: string;
  mahallaNomi: string | null;
  createdAt: Date;
}

export interface ElonArizasi {
  id: string;
  lavozim: string;
  korxonaNomi: string;
  mahallaNomi: string;
  ornlarSoni: number;
  maoshMln: number | null;
  telefon: string | null;
  masulShaxs: string | null;
  createdAt: Date;
}

const son = (n: number) => n.toLocaleString('ru-RU');

export function Moderatsiya({
  beruvchilar,
  elonlar,
}: {
  beruvchilar: BeruvchiArizasi[];
  elonlar: ElonArizasi[];
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [band, setBand] = useState<string | null>(null);
  const [xato, setXato] = useState<string | null>(null);
  const [radSorash, setRadSorash] = useState<{ turi: string; id: string } | null>(null);
  const [sabab, setSabab] = useState('');

  async function qaror(turi: 'beruvchi' | 'elon', id: string, qabul: boolean, s?: string) {
    setBand(id);
    setXato(null);
    try {
      const javob = await fetch('/api/ish-beruvchilar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turi, id, qabul, sabab: s ?? null }),
      });
      const n = await javob.json();
      if (!javob.ok || !n.ok) {
        setXato(n.xabar ?? 'Saqlab boʻlmadi');
        return;
      }
      setRadSorash(null);
      setSabab('');
      router.refresh();
    } catch {
      setXato('Tarmoq xatosi');
    } finally {
      setBand(null);
    }
  }

  const bosh = beruvchilar.length === 0 && elonlar.length === 0;

  return (
    <section className="karta space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-ink">{tr('Кўриб чиқиш навбати')}</h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Тасдиқлангач, эълон туманнинг барча маҳалла ходимига боради')}
        </p>
      </div>

      {xato && <p className="text-sm text-danger">{tr(xato)}</p>}

      {bosh && <p className="text-sm text-ok">{tr('Навбат бўш — ҳаммаси кўриб чиқилган.')}</p>}

      {/* ── ИШ БЕРУВЧИ АРИЗАЛАРИ ── */}
      {beruvchilar.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {tr('Янги иш берувчилар')} · {beruvchilar.length}
          </h3>
          {beruvchilar.map((b) => (
            <div key={b.id} className="rounded-md border border-line p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Building2 className="h-3.5 w-3.5 text-accent" />
                    {tr(b.korxonaNomi)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{tr(b.masulShaxs)}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Phone className="h-3 w-3" />
                    {formatPhone(b.telefon)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {b.mahallaNomi ? `${tr(b.mahallaNomi)} ${tr('МФЙ')} · ` : ''}
                    {formatDate(b.createdAt)}
                  </p>
                </div>
                <Tugmalar
                  band={band === b.id}
                  onQabul={() => qaror('beruvchi', b.id, true)}
                  onRad={() => setRadSorash({ turi: 'beruvchi', id: b.id })}
                />
              </div>
              {radSorash?.turi === 'beruvchi' && radSorash.id === b.id && (
                <RadFormasi
                  sabab={sabab}
                  setSabab={setSabab}
                  band={band === b.id}
                  onBekor={() => setRadSorash(null)}
                  onYubor={() => qaror('beruvchi', b.id, false, sabab.trim() || undefined)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ЭЪЛОНЛАР ── */}
      {elonlar.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {tr('Кўриб чиқилмаган эълонлар')} · {elonlar.length}
          </h3>
          {elonlar.map((e) => (
            <div key={e.id} className="rounded-md border border-line p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{tr(e.lavozim)}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{tr(e.korxonaNomi)}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {tr(e.mahallaNomi)} {tr('МФЙ')} · {son(e.ornlarSoni)} {tr('та ўрин')}
                    {e.maoshMln ? ` · ${son(e.maoshMln)} ${tr('млн сўм')}` : ''}
                  </p>
                  {e.telefon && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Phone className="h-3 w-3" />
                      {formatPhone(e.telefon)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {e.masulShaxs ? `${tr('Юборди')}: ${tr(e.masulShaxs)} · ` : ''}
                    {formatDate(e.createdAt)}
                  </p>
                </div>
                <Tugmalar
                  band={band === e.id}
                  onQabul={() => qaror('elon', e.id, true)}
                  onRad={() => qaror('elon', e.id, false)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Tugmalar({
  band,
  onQabul,
  onRad,
}: {
  band: boolean;
  onQabul: () => void;
  onRad: () => void;
}) {
  const { t: tr } = useAlifbo();
  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        disabled={band}
        onClick={onQabul}
        className="inline-flex items-center gap-1.5 rounded-md bg-ok px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {band ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {tr('Тасдиқлаш')}
      </button>
      <button
        type="button"
        disabled={band}
        onClick={onRad}
        className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
        {tr('Рад этиш')}
      </button>
    </div>
  );
}

function RadFormasi({
  sabab,
  setSabab,
  band,
  onBekor,
  onYubor,
}: {
  sabab: string;
  setSabab: (s: string) => void;
  band: boolean;
  onBekor: () => void;
  onYubor: () => void;
}) {
  const { t: tr } = useAlifbo();
  return (
    <div className="mt-2.5 space-y-2 rounded-md border border-line bg-surface-muted p-3">
      <label className="block text-xs font-semibold text-ink-muted">
        {tr('Рад этиш сабаби — иш берувчи буни ботда кўради')}
      </label>
      <input
        value={sabab}
        onChange={(e) => setSabab(e.target.value)}
        maxLength={500}
        className="maydon w-full"
        placeholder={tr('масалан: телефон рақами нотўғри')}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={band}
          onClick={onYubor}
          className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {band ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {tr('Рад этиш')}
        </button>
        <button
          type="button"
          onClick={onBekor}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink"
        >
          {tr('Бекор')}
        </button>
      </div>
    </div>
  );
}
