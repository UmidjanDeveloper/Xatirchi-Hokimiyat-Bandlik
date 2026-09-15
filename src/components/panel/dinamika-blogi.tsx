'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { DinamikaChizigi, OqimUstunlari, OsishUstunlari } from '@/components/panel/grafiklar';
import type { OylikNuqta } from '@/lib/tahlil';

/**
 * ============================================================
 *  ДИНАМИКА БЛОКИ — ЎСИШ ВА КАМАЙИШ
 *
 *  Тўрт панелда ҳам бир хил кўринади: ҳоким, бандлик раҳбари,
 *  администратор ва маҳалла ходими. Фарқи фақат МАЪЛУМОТДА:
 *  маҳалла ходимига `tahlilOl(mahallaId)` берилади, яъни у
 *  фақат ўз МФЙ сининг рақамини кўради.
 *
 *  Нега битта компонент: илгари ҳар панел ўз диаграммасини
 *  ўзи чизарди ва улар аста-секин бир-биридан фарқ қила
 *  бошлаганди. Йиғилишда ҳоким билан раҳбар бир хил графикка
 *  қараши керак.
 *
 *  ── Нега учта диаграмма ──
 *
 *  1. ЎСИШ/КАМАЙИШ СУРАТИ (қутбли) — асосий савол: аҳвол
 *     яхшиланяптими. Устун нолдан пастга тушса — яхшиланди.
 *  2. ОЙЛИК ОҚИМ — сабаби: янги аниқланган кўпми, ишга
 *     жойлашган кўпми.
 *  3. ТЎПЛАНИБ БОРИШ (чизиқ) — умумий қамров қаерга етди.
 *
 *  Учовининг манбаси битта — `OylikNuqta[]`, шунинг учун
 *  улар бир-бирига зид рақам кўрсата олмайди.
 * ============================================================
 */
export function DinamikaBloglari({
  dinamika,
  qamrovNomi,
}: {
  dinamika: OylikNuqta[];
  /** 'Хатирчи тумани' ёки МФЙ номи — сарлавҳада кўринади */
  qamrovNomi: string;
}) {
  const { t: tr } = useAlifbo();

  return (
    <div className="space-y-4">
      {/* ── 1. Асосийси: ўсиш ва камайиш сурати ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">{tr('Ўсиш ва камайиш сурати')}</h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Рўйхатда турган — ҳали ишга жойлашмаган — ишсизлар сони ойма-ой қай томонга кетяпти')}
          {' · '}
          {tr(qamrovNomi)}
        </p>
        <div className="mt-4">
          <OsishUstunlari dinamika={dinamika} />
        </div>
      </section>

      {/* ── 2. Сабаби: ойлик оқим ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{tr('Ойлик оқим: ишсизлар')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Шу ойнинг ЎЗИДА нечта аниқланди ва нечтаси ишга жойлашди')}
          </p>
          <div className="mt-4">
            <OqimUstunlari dinamika={dinamika} tur="ishsiz" />
          </div>
        </section>

        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{tr('Ойлик оқим: хатлов')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Шу ойнинг ЎЗИДА нечта хонадон хатловдан ўтди — иш суръати шундан кўринади')}
          </p>
          <div className="mt-4">
            <OqimUstunlari dinamika={dinamika} tur="xatlov" />
          </div>
        </section>
      </div>

      {/* ── 3. Умумий сурат: тўпланиб бориш ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{tr('Хатлов динамикаси')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Ойма-ой тўпланиб борадиган хонадон сони')}
          </p>
          <div className="mt-4">
            <DinamikaChizigi dinamika={dinamika} tur="xatlov" />
          </div>
        </section>

        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{tr('Ишсизлар билан иш динамикаси')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Аниқланган ва ишга жойлашган фуқаролар — тўпланиб борадиган сон')}
          </p>
          <div className="mt-4">
            <DinamikaChizigi dinamika={dinamika} tur="ishsiz" />
          </div>
        </section>
      </div>
    </div>
  );
}
