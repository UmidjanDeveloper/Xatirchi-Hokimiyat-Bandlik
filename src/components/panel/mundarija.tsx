'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, List } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MUNDARIJA_UYASI } from '@/components/shell/navigatsiya';

/**
 * ============================================================
 *  МУНДАРИЖА — узун панелда йўл топиш учун
 *
 *  Таҳлил панели битта саҳифа ва у жуда узун: кўрсаткичлар,
 *  сунъий интеллект хулосаси, беш диаграмма, харита, ваучер,
 *  жадвал ва анкетанинг ўн уч бўлими. Ҳоким йиғилишда «боғча
 *  қамрови қанча» деган саволга жавоб бериши керак — ва у
 *  саҳифани ғилдирак билан ахтариб ўтирарди.
 *
 *  ── Нега рўйхат, ичма-ич меню эмас ──
 *
 *  Мундарижанинг вазифаси — САҲИФАДА ҚАЕРДАЛИГИНИ кўрсатиш.
 *  Ичма-ич ёпиладиган меню буни бузади: ёпиқ бўлимда турган
 *  сарлавҳа кўринмайди. Шунинг учун ҳамма банд очиқ туради,
 *  анкета бўлимлари эса ичкарига сурилган.
 *
 *  ── Нега IntersectionObserver ──
 *
 *  `scroll` ҳодисасини тинглаш ҳар пикселда ҳисоб талаб
 *  қилади ва секин машинада саҳифа «тутилиб» қолади. Кузатувчи
 *  эса браузернинг ўзида ишлайди ва фақат чегара кесиб
 *  ўтилганда хабар беради.
 *
 *  ── Қаерда туради ──
 *
 *  Рўйхат ЁН МЕНЮНИНГ ичида, «Таҳлил панели» банди тагида
 *  чиқади. Аввал у саҳифанинг ўз чап устунида турарди ва
 *  меню билан мундарижа ёнма-ён икки устун бўлиб кўринарди —
 *  ҳоким қайси бири нима эканини дарров ажрата олмасди.
 *
 *  Рўйхатни менюнинг ўзида ясаб бўлмайди: унда қайси банд
 *  борлиги САҲИФАГА боғлиқ (битта МФЙ танланса, бир нечта
 *  бўлим умуман чизилмайди). Шунинг учун меню бўш уя
 *  қолдиради, саҳифа эса рўйхатни ўша уяга портал билан
 *  юборади. Маълумот саҳифада қолади, кўриниши эса менюда.
 *
 *  ── Телефонда ──
 *
 *  Ён устун учун жой йўқ, шунинг учун у тепада ёпиқ тугмага
 *  айланади. Босилса очилади, банд танлангач ўзи ёпилади —
 *  акс ҳолда рўйхат экраннинг ярмини эгаллаб турарди.
 * ============================================================
 */

export interface MundarijaBandi {
  /** Саҳифадаги бўлимнинг `id` си */
  id: string;
  nomi: string;
  /** Анкета бўлимининг рақами — «IV», «II-Б» */
  raqam?: string;
  /** Ичкарига сурилганми (анкета бўлимлари) */
  ichki?: boolean;
}

export function Mundarija({ bandlar }: { bandlar: MundarijaBandi[] }) {
  const { t: tr } = useAlifbo();
  const [faol, setFaol] = useState<string | null>(null);
  const [ochiq, setOchiq] = useState(false);
  /** Ён устуннинг ЎЗ айланадиган қутиси — саҳифа эмас */
  const qutiRef = useRef<HTMLDivElement>(null);
  /**
   * Ён менюдаги уя.
   *
   * `useState` + `useEffect` орқали — серверда `document`
   * йўқ, шунинг учун биринчи чизишда `null` бўлади ва
   * порталга фақат браузерда киришилади.
   */
  const [uya, setUya] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setUya(document.getElementById(MUNDARIJA_UYASI));
  }, []);

  /*
   * ── ҚАЙСИ БЎЛИМ КЎРИНИБ ТУРИБДИ ──
   *
   * `rootMargin` нинг тепаси манфий: саҳифанинг энг юқори
   * 96 пикселида ёпишиб турган сарлавҳа бор ва унинг остидаги
   * бўлим «кўриняпти» деб саналмаслиги керак. Пастки чегара
   * ҳам манфий — акс ҳолда экранга бирданига учта бўлим
   * сиғиб қолса, охиргиси фаол бўлиб кўринарди.
   */
  useEffect(() => {
    /* Қайси бўлим ҳозир кўриниб турибди — кузатувчи фақат
       ЎЗГАРГАНИ ҳақида хабар беради, қолганини эслаб турамиз */
    const holat = new Map<Element, boolean>();

    const kuzatuv = new IntersectionObserver(
      (yozuvlar) => {
        for (const y of yozuvlar) holat.set(y.target, y.isIntersecting);

        const korinayotgan = [...holat.entries()]
          .filter(([, bormi]) => bormi)
          .map(([el]) => el);
        if (!korinayotgan.length) return;

        /*
         * ── ИЧКИ БЎЛИМ ТАШҚИСИНИ ЕНГАДИ ──
         *
         * «Хатлов бўлимлари» — ўн уч карточкани ЎЗ ИЧИГА
         * оладиган қути. У доим ичкиларидан юқорида
         * бошланади, шунинг учун «энг тепадагиси» қоидаси
         * билан у ҳар доим ғолиб чиқарди: ҳоким «Болалар
         * таълими» бўлимида турса ҳам, мундарижа «Хатлов
         * бўлимлари» ни белгилаб турарди.
         *
         * Шунинг учун ичида бошқа кўринаётган бўлим бор
         * элемент ҳисобга олинмайди.
         */
        const eng = korinayotgan.filter(
          (el) => !korinayotgan.some((b) => b !== el && el.contains(b))
        );

        const royxat = (eng.length ? eng : korinayotgan).sort(
          (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
        );
        setFaol(royxat[0].id);
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: 0 }
    );

    const kuzatilganlar: Element[] = [];
    for (const b of bandlar) {
      const el = document.getElementById(b.id);
      if (el) {
        kuzatuv.observe(el);
        kuzatilganlar.push(el);
      }
    }
    return () => {
      for (const el of kuzatilganlar) kuzatuv.unobserve(el);
      kuzatuv.disconnect();
    };
  }, [bandlar]);

  /*
   * ── ФАОЛ БАНД РЎЙХАТДАН ЧИҚИБ КЕТМАСИН ──
   *
   * Мундарижа узун (26 банд) ва ён устунда ўз айланиши бор.
   * Ҳоким саҳифанинг охирига борганда фаол банд рўйхатнинг
   * пастида қолиб кўринмасди.
   *
   * ── Нега `scrollIntoView` ЭМАС ──
   *
   * Биринчи вариантда `el.scrollIntoView({ block: 'nearest' })`
   * ёзилган эди ва у БУТУН ПАНЕЛНИ ишлатмай қўйди: ҳоким
   * саҳифани сурса, браузер уни дарҳол 338-пикселга —
   * мундарижа турган жойга — қайтариб ташларди.
   *
   * Сабаби: `scrollIntoView` фақат энг яқин қутини эмас,
   * БАРЧА айланадиган ота-элементларни суради, ҳужжатнинг
   * ўзини ҳам. Банд ён устунда кўриниб турганда ҳам, устун
   * экрандан бир оз чиқиб турса, браузер ҳужжатни суриб уни
   * тўғрилашга уринарди — ва ҳар сурилишда шу такрорланарди.
   *
   * Шунинг учун бу ерда фақат ЎЗ қутисининг `scrollTop` и
   * ўзгартирилади. Ҳужжат қимирлай олмайди, чунки унга
   * умуман тегилмайди.
   */
  useEffect(() => {
    if (!faol) return;
    const quti = qutiRef.current;
    const el = quti?.querySelector<HTMLElement>(`[data-band='${faol}']`);
    if (!quti || !el) return;

    const CHEKKA = 8;
    const ust = el.offsetTop - quti.offsetTop;
    const past = ust + el.offsetHeight;

    if (ust < quti.scrollTop) {
      quti.scrollTop = Math.max(0, ust - CHEKKA);
    } else if (past > quti.scrollTop + quti.clientHeight) {
      quti.scrollTop = past - quti.clientHeight + CHEKKA;
    }
  }, [faol]);

  /*
   * Рўйхат ИККИ МАРТА чизилади — телефон учун ва катта экран
   * учун. Шунинг учун у функция: битта JSX элементни икки
   * жойга қўйиб бўлмайди, `ref` иккинчисига ёпишиб қоларди ва
   * ён устуннинг айланиши ишламасди.
   */
  const royxat = (
    <nav className="mundarija-royxat space-y-0.5" aria-label={tr('Мундарижа')}>
      {bandlar.map((b) => {
        const tanlangan = faol === b.id;
        return (
          <a
            key={b.id}
            href={`#${b.id}`}
            data-band={b.id}
            aria-current={tanlangan ? 'true' : undefined}
            onClick={() => setOchiq(false)}
            className={`flex items-baseline gap-1.5 rounded-md py-1.5 pr-2 text-xs leading-snug transition-colors ${
              b.ichki ? 'pl-5' : 'pl-2 font-medium'
            } ${
              tanlangan
                ? 'bg-accent-soft font-semibold text-accent'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
            }`}
          >
            {b.raqam && (
              <span className="raqam shrink-0 text-[10px] text-ink-faint">{b.raqam}</span>
            )}
            <span className="min-w-0">{tr(b.nomi)}</span>
          </a>
        );
      })}
    </nav>
  );

  /** Ён менюга тушадиган қисм — сарлавҳа ва айланадиган рўйхат */
  const ustun = (
    <div className="mt-1 border-t border-line pt-2">
      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
        {tr('Мундарижа')}
      </p>
      <div ref={qutiRef} className="max-h-[46vh] overflow-y-auto pb-1 pr-1">
        {royxat}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Телефон ва планшет: тепада ёпиқ тугма ── */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOchiq((v) => !v)}
          aria-expanded={ochiq}
          className="flex w-full items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong"
        >
          <List className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
          <span className="flex-1 text-left">{tr('Мундарижа')}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${ochiq ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        {ochiq && (
          <div className="mt-1.5 max-h-80 overflow-y-auto rounded-md border border-line bg-surface p-1.5">
            {royxat}
          </div>
        )}
      </div>

      {/*
        ── Катта экран: ён менюнинг ичида ──

        Уя топилмаса (меню бошқача чизилган ёки саҳифа бошқа
        қобиқда) рўйхат эски жойида — саҳифанинг ўзида —
        қолади. Мундарижа ҳар қандай ҳолда ҲАМ бўлиши керак.

        Баландлик чегараси бор: меню бандлари билан бирга
        экранга сиғмаса, рўйхат ЎЗИ айланади. Фаол бандни
        кўринишга суриш ҳам шу қутида ишлайди.
      */}
      {uya ? (
        createPortal(ustun, uya)
      ) : (
        <aside className="hidden lg:block">{ustun}</aside>
      )}
    </>
  );
}
