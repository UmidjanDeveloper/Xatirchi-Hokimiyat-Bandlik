'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { TabloXaritasi } from './tablo-xarita';
import { tabloOlchovlari } from './tablo-olchovlari';
import type { Tablo } from '@/lib/tablo-malumoti';

/**
 * ============================================================
 *  ДЕВОР ТАБЛОСИ
 *
 *  Ҳокимият йўлагидаги телевизор учун. Тугма босадиган одам
 *  йўқ, шунинг учун экраннинг ЎЗИ ҳаракатланади:
 *
 *    • ўлчов ҳар 18 сонияда алмашади
 *    • маълумот ҳар дақиқада янгиланади
 *    • соат ҳар сонияда юради
 *
 *  ── Нега соат керак ──
 *
 *  Юрган соат — «бу экран тирик» деган ягона ишора. Тўхтаб
 *  қолган телевизорни (ёки эски кешни) юрмаган соатдан фарқлаб
 *  бўлмайди: рақамлар барибир бир хил кўринади. Бир марта
 *  осилиб қолган табло эса бутун тизим ҳақидаги гапни ёлғонга
 *  чиқаради — ҳоким «кеча ҳам шу турганди» деб эслайди.
 * ============================================================
 */

/** Ўлчов қанча вақт туради */
const ALMASHUV_MS = 18_000;

/**
 * Маълумот қанчадан кейин қайта олинади.
 *
 * Бир дақиқа. Серверда ўттиз сониялик кеш бор, яъни бир нечта
 * экран очиқ турса ҳам базага сўров сони ошмайди.
 */
const YANGILASH_MS = 60_000;

/** Ўзбекистон UTC+5 да ва ёзги вақтга ўтмайди */
const TOSHKENT_MS = 5 * 60 * 60 * 1000;

const son = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');

const foizYoz = (n: number) => `${n.toString().replace('.', ',')}%`;

const HAFTA = [
  'якшанба',
  'душанба',
  'сешанба',
  'чоршанба',
  'пайшанба',
  'жума',
  'шанба',
] as const;

const OYLAR = [
  'январ',
  'феврал',
  'март',
  'апрел',
  'май',
  'июн',
  'июл',
  'август',
  'сентябр',
  'октябр',
  'ноябр',
  'декабр',
] as const;

export function TabloEkrani({ tablo }: { tablo: Tablo }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const olchovlar = useMemo(() => tabloOlchovlari(tablo.xarita.qatorlar), [tablo.xarita.qatorlar]);

  const [orni, setOrni] = useState(0);
  const [soat, setSoat] = useState<Date | null>(null);
  const [tolaEkran, setTolaEkran] = useState(false);

  /*
   * Соат фақат браузерда чизилади.
   *
   * Серверда чизилса, HTML да 14:32 турарди, браузер эса
   * 14:33 ни чизарди — React буни номувофиқлик деб санайди
   * ва бутун саҳифани қайта чизади.
   */
  useEffect(() => {
    setSoat(new Date());
    const id = setInterval(() => setSoat(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (olchovlar.length < 2) return;
    const id = setInterval(() => setOrni((o) => (o + 1) % olchovlar.length), ALMASHUV_MS);
    return () => clearInterval(id);
  }, [olchovlar.length]);

  /*
   * ── НЕГА `router.refresh()` ──
   *
   * Саҳифа сервер компоненти. `refresh` фақат маълумотни
   * қайта олади ва экранни ЎЧИРМАЙ янгилайди: айланиб турган
   * ўлчов ҳам, соат ҳам жойида қолади.
   *
   * `location.reload()` бўлса, экран ҳар дақиқада оқариб
   * кетарди ва тўрт метр наридан «тизим қотиб қолди» деб
   * кўринарди.
   */
  useEffect(() => {
    const id = setInterval(() => router.refresh(), YANGILASH_MS);
    return () => clearInterval(id);
  }, [router]);

  useEffect(() => {
    const kuzat = () => setTolaEkran(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', kuzat);
    return () => document.removeEventListener('fullscreenchange', kuzat);
  }, []);

  const olchov = olchovlar[Math.min(orni, olchovlar.length - 1)];
  const h = tablo.holat;

  /*
   * ── НЕГА БРАУЗЕРНИНГ СОАТИ ЎҚИЛМАЙДИ ──
   *
   * Телевизорга уланган компьютернинг соати нотўғри
   * минтақада турган бўлиши мумкин — уни ҳеч ким
   * текширмайди, чунки экранда Windows соати кўринмайди.
   *
   * Тизимнинг қолган ҳамма жойи (ҳисобот, брифинг, кунлик
   * оқим) Тошкент вақтида юради. Табло ҳам ўша вақтни
   * кўрсатади: бешта рақамни ҳисоблаш арзон, ярим кунга
   * силжиган экран эса қимматга тушади.
   */
  const tosh = soat ? new Date(soat.getTime() + TOSHKENT_MS) : null;

  const sana = tosh
    ? `${tosh.getUTCDate()} ${tr(OYLAR[tosh.getUTCMonth()])}, ${tr(HAFTA[tosh.getUTCDay()])}`
    : '';
  const vaqt = tosh
    ? `${String(tosh.getUTCHours()).padStart(2, '0')}:${String(tosh.getUTCMinutes()).padStart(2, '0')}`
    : '';

  const engKattaOqim = Math.max(1, ...tablo.oqim.map((o) => o.xonadon));

  return (
    <div className="flex h-[100dvh] flex-col gap-[1.4vh] overflow-hidden bg-canvas p-[1.8vh] text-text">
      {/* ── САРЛАВҲА ── */}
      <header className="flex items-center justify-between gap-[2vh]">
        <div>
          <h1 className="text-[2.8vh] font-bold leading-tight tracking-tight">
            {tr('Хатирчи тумани — бандлик ва камбағалликни қисқартириш')}
          </h1>
          <p className="text-[1.6vh] text-text-muted">
            {tr('Ҳокимият ахборот таблоси')}
          </p>
        </div>

        <div className="flex items-center gap-[2vh]">
          <div className="text-right">
            <p className="text-[4.4vh] font-bold leading-none tabular-nums">{vaqt || '—'}</p>
            <p className="text-[1.6vh] text-text-muted">{sana}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen();
            }}
            className="rounded-md border border-line p-[1vh] text-text-faint transition hover:text-text"
            aria-label={tr('Тўлиқ экран')}
          >
            {tolaEkran ? <Minimize2 className="h-[2.2vh] w-[2.2vh]" /> : <Maximize2 className="h-[2.2vh] w-[2.2vh]" />}
          </button>
        </div>
      </header>

      {/* ── АСОСИЙ РАҚАМЛАР ── */}
      <section className="grid grid-cols-4 gap-[1.4vh]">
        <Katak
          nomi={tr('Хатлов қамрови')}
          qiymat={foizYoz(h.qamrovFoizi)}
          izoh={`${son(h.xatlovXonadon)} / ${son(h.bazaXonadon)} ${tr('хонадон')}`}
        />
        <Katak
          nomi={tr('Хатлов топган ишсиз')}
          qiymat={son(h.topilganIshsiz)}
          izoh={`${son(h.anketa)} ${tr('тасига анкета тўлдирилган')}`}
        />
        <Katak
          nomi={tr('Ишга жойлаштирилган')}
          qiymat={son(h.joylashtirilgan)}
          /*
            Фоиз эмас, ИККИНЧИ РАҚАМ.

            «Анкетадагиларнинг 51%» деган ёзув чиройли, аммо
            у ҳам ЎША битта манбадан — ходимнинг айтганидан —
            чиқади. Ҳужжат билан тасдиқланган сон эса бошқа
            манбадан келади ва биринчи рақамни текширади.
          */
          izoh={`${son(h.tasdiqlanganJoylashuv)} ${tr('таси ҳужжат билан тасдиқланган')}`}
        />
        <Katak
          nomi={tr('Очиқ иш ўрни')}
          qiymat={son(h.ochiqOrin)}
          izoh={`${son(h.ulanganXodim)} / ${son(h.xodim)} ${tr('ходим ботда')}`}
        />
      </section>

      {/* ── ХАРИТА ВА ЎНГ УСТУН ── */}
      <main className="grid min-h-0 flex-1 grid-cols-[1.75fr_1fr] gap-[1.4vh]">
        <section className="min-h-0 rounded-lg border border-line bg-elev p-[1.6vh]">
          <TabloXaritasi qatorlar={tablo.xarita.qatorlar} olchov={olchov} />
        </section>

        <aside className="flex min-h-0 flex-col gap-[1.4vh]">
          <Blok sarlavha={tr('Бугун')}>
            <div className="grid grid-cols-3 gap-[1vh]">
              <Kichik nomi={tr('хонадон')} qiymat={tablo.bugun.xatlov} />
              <Kichik nomi={tr('анкета')} qiymat={tablo.bugun.anketa} />
              <Kichik nomi={tr('ишга кирди')} qiymat={tablo.bugun.joylashtirilgan} />
            </div>
          </Blok>

          <Blok sarlavha={tr('Етти кунда энг фаол МФЙ')}>
            {tablo.saf.length > 0 ? (
              <ol className="space-y-[0.7vh]">
                {tablo.saf.map((s, i) => (
                  <li key={s.mahallaId} className="flex items-baseline gap-[1vh] text-[1.8vh]">
                    <span className="w-[2vh] shrink-0 text-right text-[1.5vh] font-bold text-text-faint tabular-nums">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.nomiKirill}</span>
                    <span className="font-semibold tabular-nums">{son(s.xonadon)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[1.7vh] text-text-faint">
                {tr('Бу ҳафтада ҳали хатлов киритилмаган')}
              </p>
            )}
          </Blok>

          <Blok sarlavha={tr('Эътибор')} oxirgi>
            {tablo.etibor.length > 0 ? (
              <ul className="space-y-[0.9vh]">
                {tablo.etibor.map((e) => (
                  <li key={e.matn} className="flex items-start gap-[1vh] text-[1.8vh] leading-snug">
                    {/*
                      Ранг ЁЛҒИЗ маъно ташимайди: ёнида доим
                      матн туради. Рангни ажратмайдиган одам
                      ҳам, ўчган телевизор ҳам сатрни ўқий
                      олади.
                    */}
                    <span
                      className="mt-[0.7vh] inline-block h-[1vh] w-[1vh] shrink-0 rounded-full"
                      style={{ background: e.ogirlik === 'danger' ? 'var(--danger)' : 'var(--warn)' }}
                    />
                    <span>{e.matn}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[1.8vh] text-ok">{tr('Алоҳида чора талаб қиладиган ҳолат йўқ')}</p>
            )}
          </Blok>
        </aside>
      </main>

      {/* ── ЎН ТЎРТ КУНЛИК ОҚИМ ── */}
      <footer className="rounded-lg border border-line bg-elev px-[1.6vh] py-[1.2vh]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[1.6vh] font-semibold uppercase tracking-[0.14em] text-text-muted">
            {tr('Кунлик хатлов — сўнгги 14 кун')}
          </h2>
          <p className="text-[1.4vh] text-text-faint">
            {tr('Янгиланди')}: {vaqt || '—'}
          </p>
        </div>

        <div className="mt-[0.9vh] flex h-[9vh] gap-[0.5vh]">
          {tablo.oqim.map((k) => (
            <div key={k.sana.toISOString()} className="flex h-full min-w-0 flex-1 flex-col items-center">
              {/*
                Рақам ФАҚАТ энг баланд устунда. Ҳар бир
                устунга ёзилса, ўн тўртта сон устун
                баландлигини ўқишга халақит берарди — ва
                диаграмманинг маъноси қоларди.
              */}
              <span className="h-[1.6vh] text-[1.3vh] leading-none tabular-nums text-text-muted">
                {k.xonadon === engKattaOqim && k.xonadon > 0 ? son(k.xonadon) : ''}
              </span>

              {/*
                ── НЕГА АЛОҲИДА ЎРАМ ──

                Устун баландлиги ФОИЗ билан берилади, фоиз эса
                ота элементнинг баландлиги АНИҚ бўлгандагина
                ишлайди. Аввал устун тўғридан-тўғри устунчага
                қўйилганди ва унинг баландлиги `auto` эди —
                натижада ҳамма устун нол пиксел бўлиб, экранда
                диаграмма ЎРНИДА бўш жой турарди. Рақам эса
                ёзилиб турарди, яъни хато «маълумот йўқ» деб
                эмас, «диаграмма бузуқ» деб кўринарди.
              */}
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[0.4vh]"
                  style={{
                    height: `${Math.max(k.xonadon > 0 ? 4 : 2, (k.xonadon / engKattaOqim) * 100)}%`,
                    /*
                      Дам олиш куни сустроқ тусда. Бу АЙРИМ
                      қатор эмас, фон изоҳи: шанба-якшанбада
                      пастлик — бўшлик эмас, дам олиш.
                    */
                    background:
                      k.xonadon === 0
                        ? 'var(--xarita-bosh)'
                        : k.damOlish
                          ? 'var(--xarita-1)'
                          : 'var(--xarita-3)',
                  }}
                />
              </div>

              <span className="mt-[0.4vh] text-[1.3vh] leading-none tabular-nums text-text-faint">
                {k.kun}
              </span>
            </div>
          ))}
        </div>
      </footer>

      {/* ── АЙЛАНИШ ЙЎЛАКЧАСИ ── */}
      {olchovlar.length > 1 && (
        <div className="flex gap-[0.6vh]" aria-hidden>
          {olchovlar.map((o, i) => (
            <span
              key={o.kalit}
              className="h-[0.5vh] flex-1 rounded-full transition-colors duration-500"
              style={{ background: i === orni ? 'var(--accent)' : 'var(--border)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Katak({ nomi, qiymat, izoh }: { nomi: string; qiymat: string; izoh: string }) {
  return (
    <div className="rounded-lg border border-line bg-elev px-[1.6vh] py-[1.2vh]">
      <p className="text-[1.5vh] uppercase tracking-[0.12em] text-text-muted">{nomi}</p>
      <p className="mt-[0.4vh] text-[5vh] font-bold leading-none tabular-nums">{qiymat}</p>
      <p className="mt-[0.5vh] text-[1.5vh] text-text-faint">{izoh}</p>
    </div>
  );
}

function Blok({
  sarlavha,
  oxirgi = false,
  children,
}: {
  sarlavha: string;
  oxirgi?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border border-line bg-elev px-[1.6vh] py-[1.2vh] ${oxirgi ? 'min-h-0 flex-1' : ''}`}
    >
      <h2 className="mb-[0.9vh] text-[1.5vh] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {sarlavha}
      </h2>
      {children}
    </section>
  );
}

function Kichik({ nomi, qiymat }: { nomi: string; qiymat: number }) {
  return (
    <div>
      <p className="text-[3.2vh] font-bold leading-none tabular-nums">{son(qiymat)}</p>
      <p className="text-[1.4vh] text-text-muted">{nomi}</p>
    </div>
  );
}
