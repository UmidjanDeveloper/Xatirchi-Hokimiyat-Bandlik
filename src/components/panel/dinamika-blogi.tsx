'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { DinamikaChizigi, OqimUstunlari, OsishUstunlari } from '@/components/panel/grafiklar';
import { DAVR_NOMI, type Davr } from '@/lib/davr-turlari';
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
/**
 * Сарлавҳалар давр билан ЎЗГАРАДИ.
 *
 * Илгари улар «Ойлик оқим» деб қотирилган эди. Кунлик кесим
 * қўшилганда сарлавҳа «ойлик» деб турар, остидаги устунлар эса
 * кунлик рақам кўрсатарди — ва буни фақат рақамни санаб
 * чиққан одам пайқарди.
 */
const OQIM_SARLAVHASI: Record<Davr, string> = {
  kun: 'Кунлик оқим',
  oy: 'Ойлик оқим',
  yil: 'Йиллик оқим',
};

const OQIM_IZOHI: Record<Davr, { ishsiz: string; xatlov: string }> = {
  kun: {
    ishsiz: 'Шу КУННИНГ ўзида нечта аниқланди ва нечтаси ишга жойлашди',
    xatlov: 'Шу КУННИНГ ўзида нечта хонадон хатловдан ўтди',
  },
  oy: {
    ishsiz: 'Шу ОЙНИНГ ўзида нечта аниқланди ва нечтаси ишга жойлашди',
    xatlov: 'Шу ОЙНИНГ ўзида нечта хонадон хатловдан ўтди — иш суръати шундан кўринади',
  },
  yil: {
    ishsiz: 'Шу ЙИЛНИНГ ўзида нечта аниқланди ва нечтаси ишга жойлашди',
    xatlov: 'Шу ЙИЛНИНГ ўзида нечта хонадон хатловдан ўтди',
  },
};

export function DinamikaBloglari({
  dinamika,
  qamrovNomi,
  davr = 'oy',
}: {
  dinamika: OylikNuqta[];
  /** 'Хатирчи тумани' ёки МФЙ номи — сарлавҳада кўринади */
  qamrovNomi: string;
  /** Қайси кесимда чизилгани — сарлавҳалар шунга мослашади */
  davr?: Davr;
}) {
  const { t: tr } = useAlifbo();

  /*
    ── ҲАЛИ ҲЕЧ НИМА БЎЛМАГАН ҲОЛАТ ──

    Хатлов бошланмаган туманда бешала диаграмма ҳам бўш
    чиқади ва саҳифада кетма-кет БЕШТА бўш катак турарди —
    ҳар бири «Ҳали маълумот йўқ» деб. Бу панелни синган
    кўрсатади.

    Шунинг учун ҳаммаси нол бўлса, бешта ўрнига БИТТА
    ихчам карточка турибди: у ҳам ростини айтади, ҳам жойни
    эгалламайди. Биринчи хонадон хатловдан ўтиши биланоқ
    диаграммалар ўз-ўзидан қайтади.
  */
  const hechNima = dinamika.every(
    (n) =>
      n.xatlovXonadon === 0 &&
      n.aniqlangan === 0 &&
      n.joylashtirilgan === 0 &&
      n.yangiXatlov === 0 &&
      n.yangiAniqlangan === 0 &&
      n.yangiJoylashgan === 0
  );

  if (hechNima) {
    return (
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">{tr('Ўсиш ва камайиш сурати')}</h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr(qamrovNomi)} · {tr(DAVR_NOMI[davr])}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {tr('Динамика учун камида битта хатлов керак. Биринчи хонадон хатловдан ўтгач, бу ерда беш диаграмма пайдо бўлади: ўсиш-камайиш сурати, оқим ва тўпланиб бориш.')}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 1. Асосийси: ўсиш ва камайиш сурати ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">{tr('Ўсиш ва камайиш сурати')}</h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Рўйхатда турган — ҳали ишга жойлашмаган — ишсизлар сони қай томонга кетяпти')}
          {' · '}
          {tr(qamrovNomi)}
          {' · '}
          {tr(DAVR_NOMI[davr])}
        </p>
        <div className="mt-4">
          <OsishUstunlari dinamika={dinamika} davr={davr} />
        </div>
      </section>

      {/* ── 2. Сабаби: ойлик оқим ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">
            {tr(OQIM_SARLAVHASI[davr])}: {tr('ишсизлар')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">{tr(OQIM_IZOHI[davr].ishsiz)}</p>
          <div className="mt-4">
            <OqimUstunlari dinamika={dinamika} tur="ishsiz" davr={davr} />
          </div>
        </section>

        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">
            {tr(OQIM_SARLAVHASI[davr])}: {tr('хатлов')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">{tr(OQIM_IZOHI[davr].xatlov)}</p>
          <div className="mt-4">
            <OqimUstunlari dinamika={dinamika} tur="xatlov" davr={davr} />
          </div>
        </section>
      </div>

      {/* ── 3. Умумий сурат: тўпланиб бориш ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{tr('Хатлов динамикаси')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Тўпланиб борадиган хонадон сони')} · {tr(DAVR_NOMI[davr])}
          </p>
          <div className="mt-4">
            <DinamikaChizigi dinamika={dinamika} tur="xatlov" davr={davr} />
          </div>
        </section>

        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{tr('Ишсизлар билан иш динамикаси')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Аниқланган ва ишга жойлашган фуқаролар — тўпланиб борадиган сон')}
          </p>
          <div className="mt-4">
            <DinamikaChizigi dinamika={dinamika} tur="ishsiz" davr={davr} />
          </div>
        </section>
      </div>
    </div>
  );
}
