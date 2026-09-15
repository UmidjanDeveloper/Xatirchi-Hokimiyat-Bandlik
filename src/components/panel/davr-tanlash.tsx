'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import type { Davr } from '@/lib/tahlil';

/**
 * ============================================================
 *  ДАВР ТАНЛАШ
 *
 *  Уч кесим — уч хил савол:
 *
 *    Кунлик  «шу ҳафта иш кетяптими»
 *    Ойлик   «чорак якунида қандай кўрсаткич бўлади»
 *    Йиллик  «уч йилда камбағаллик қисқардими»
 *
 *  ── Нега сана оралиғи эмас, учта тугма ──
 *
 *  Сана танлаш ойнаси телефонда оғир: икки марта босиб,
 *  календарни очиб, икки сана танлаш керак. Ҳоким эса
 *  йиғилишда, телефонда қарайди. Учта тугма — бир босиш.
 *
 *  Аниқ оралиқ керак бўлса, у ҳисоботда бор: PDF ва Excel
 *  ўз даври билан юкланади.
 *
 *  ── Нега URL да сақланади ──
 *
 *  Ҳоким «кунлик» кесимни очиб, ҳаволани раҳбарга юборса,
 *  раҳбар ҳам АЙНАН ўшани кўриши керак. `useState` да
 *  сақланса, ҳавола ойлик кесимни очарди ва иккови бошқа
 *  рақамдан гаплашарди.
 * ============================================================
 */

const TANLOVLAR: { qiymat: Davr; nomi: string; izoh: string }[] = [
  { qiymat: 'kun', nomi: 'Кунлик', izoh: 'сўнгги 30 кун' },
  { qiymat: 'oy', nomi: 'Ойлик', izoh: 'сўнгги 12 ой' },
  { qiymat: 'yil', nomi: 'Йиллик', izoh: 'сўнгги 5 йил' },
];

export function DavrTanlash({ joriy }: { joriy: Davr }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const yol = usePathname();
  const parametrlar = useSearchParams();
  const [kutilmoqda, boshla] = useTransition();

  function almashtir(yangi: Davr) {
    if (yangi === joriy) return;

    /*
     * Бошқа параметрлар САҚЛАНАДИ. Ходим маҳалла бўйича
     * фильтр қўйиб, кейин даврни алмаштирса, фильтри
     * йўқолмаслиги керак.
     */
    const q = new URLSearchParams(parametrlar.toString());
    if (yangi === 'oy') q.delete('davr');
    else q.set('davr', yangi);

    const qator = q.toString();
    boshla(() => router.push(qator ? `${yol}?${qator}` : yol, { scroll: false }));
  }

  return (
    <div
      role="group"
      aria-label={tr('Давр кесими')}
      className="inline-flex items-center rounded-md border border-line bg-surface p-0.5"
    >
      {TANLOVLAR.map((t) => {
        const faol = t.qiymat === joriy;
        return (
          <button
            key={t.qiymat}
            type="button"
            onClick={() => almashtir(t.qiymat)}
            aria-pressed={faol}
            title={tr(t.izoh)}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              faol
                ? 'bg-accent-soft text-accent'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {tr(t.nomi)}
          </button>
        );
      })}
      {/*
        Юкланиш белгиси — тугма ёнида, алоҳида қатор эмас.
        Акс ҳолда саҳифа «сакраб» кетарди.
      */}
      <span className="w-4 shrink-0" aria-hidden={!kutilmoqda}>
        {kutilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" />}
      </span>
    </div>
  );
}
