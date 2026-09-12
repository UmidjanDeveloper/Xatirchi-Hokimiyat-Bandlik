'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, Sparkles } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { lotinga } from '@/lib/alifbo';
import type { Hisobot } from '@/lib/hisobot/turlar';

/**
 * ============================================================
 *  ҲИСОБОТ ТУГМАЛАРИ
 *
 *  PDF — йиғилишга олиб борилади, ўқилади, имзоланади.
 *  Excel — устида ишланади: вилоятга юборилади, бошқа жадвалга
 *  кўчирилади, ўз ҳисоб-китоби қилинади.
 *
 *  ── Нега иккита сўров эмас, битта ──
 *
 *  Ҳисобот маълумоти сервердан БИР МАРТА олинади ва иккала файл
 *  шундан ясалади. Акс ҳолда PDF да бир рақам, Excel да бошқа
 *  рақам чиқиши мумкин эди: орада бир ходим анкета юборса,
 *  иккинчи сўров бошқа жавоб қайтарарди.
 *
 *  ── Алифбо ──
 *
 *  Файл ТАНЛАНГАН АЛИФБОДА чиқади. Ҳужжат кириллда керак бўлса,
 *  сайтни кириллга ўтказиб босилади — ҳокимият ёзишмасида бу
 *  муҳим, чунки расмий ҳужжатлар ҳали кўпинча кириллда
 *  юритилади.
 *
 *  ── Оғир кутубхоналар ──
 *
 *  jspdf ~250 КБ, xlsx ~400 КБ. Улар фақат тугма босилганда
 *  юкланади. Статик импорт қилинса, ҳисобот олмайдиган ходим
 *  ҳам уларни ҳар кирганда юклаб оларди.
 * ============================================================
 */

export interface HisobotQamrovi {
  /** Маҳалла id — бўш бўлса бутун туман */
  mahallaId?: string | null;
  /**
   * Тугма ёнида кўринадиган ҳудуд номи — КИРИЛЛДА.
   *
   * Ўгириш шу компонентда бўлади, серверда эмас: фойдаланувчи
   * саҳифада туриб алифбони алмаштирса, сервер юборган матн эски
   * алифбода қотиб қоларди.
   */
  nomi: string;
}

export function HisobotTugmalari({
  qamrov,
  mahallalar,
  /**
   * Маҳалла ходими учун — сарлавҳа ва изоҳ бошқача ёзилади.
   *
   * Ходимга «бутун туман» тушунчаси керак эмас: у ўз
   * маҳалласининг ҳисоботини олади ва шу ҳақда аниқ ёзилиши
   * ишончни оширади.
   */
  ozMahallasi = false,
  malumotBormi = true,
}: {
  qamrov: HisobotQamrovi;
  /**
   * Маҳаллалар рўйхати — берилса, ҳудуд танлаш имкони очилади.
   *
   * Ҳокимга бу керак: умумий сурат туман бўйича, аммо йиғилишда
   * «Чечакота МФЙ да нима гап» деган савол чиқади ва унга
   * алоҳида ҳисобот билан жавоб бериш керак бўлади.
   */
  mahallalar?: { id: string; nomiKirill: string }[];
  ozMahallasi?: boolean;
  /**
   * Ҳисобот учун маълумот борми.
   *
   * `false` бўлса тугмалар КЎРИНАДИ, лекин босилмайди ва ёнида
   * нима кутилаётгани ёзилади.
   *
   * Илгари улар умуман яшириларди — «бўш ҳисоботнинг маъноси
   * йўқ» деб. Натижада хатлов бошламаган ходим ҳисобот олиш
   * имкони борлигини УМУМАН билмасди: тугма йўқ, изоҳ ҳам йўқ.
   * Кейин маълумот пайдо бўлганда ҳам уни тасодифан топиши
   * керак эди.
   *
   * Ўчирилган тугма эса иккита ишни бажаради: имконият
   * борлигини кўрсатади ва у қачон ишлашини айтади.
   */
  malumotBormi?: boolean;
}) {
  const { t: tr, alifbo } = useAlifbo();
  const [ishlayapti, setIshlayapti] = useState<'pdf' | 'excel' | null>(null);
  const [xato, setXato] = useState<string | null>(null);
  const [holat, setHolat] = useState<string | null>(null);

  /** Танланган ҳудуд — бўш сатр «бутун туман» дегани */
  const [tanlangan, setTanlangan] = useState<string>(qamrov.mahallaId ?? '');

  const sana = new Date().toISOString().slice(0, 10);
  const qoshimcha = alifbo === 'lot' ? '' : '-kirill';
  const joriyMahalla = tanlangan || null;
  const joriyNomi = joriyMahalla
    ? (mahallalar?.find((m) => m.id === joriyMahalla)?.nomiKirill ?? qamrov.nomi)
    : qamrov.nomi;

  /**
   * Файл номи ҲИСОБОТНИНГ ЎЗИДАН олинади.
   *
   * Илгари у мижоз томонда тахмин қилинарди ва маҳалла ходимида
   * янглишарди: сервер ҳисоботни ходимнинг маҳалласига чеклаган
   * бўлса ҳам, файл номи «tuman-hisobot» бўлиб қоларди. Ҳудудни
   * сервер ҳал қилади — демак ном ҳам ундан келиши керак.
   *
   * Ном ФАҚАТ лотин ҳарфларида бўлади, ҳисобот кириллда бўлса
   * ҳам. Сабаби амалий: файл электрон почта, Windows папкаси ва
   * Telegram орқали юрганда кирилл ном баъзи тизимларда бузилади
   * ёки умуман тушиб қолади. Браузер ҳам кирилл номли юкламани
   * «download» деб сақлаб қўяди — бир марта шу бўлган.
   */
  function faylNomi(m: Hisobot, kengaytma: string): string {
    const hudud = lotinga(m.qamrovNomi)
      .toLowerCase()
      .replace(/[’‘ʻʼ`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    return `hisobot-${hudud || 'hudud'}-${sana}${qoshimcha}.${kengaytma}`;
  }

  /** Сервердан ҳисобот маълумотини олади */
  async function malumotOl(): Promise<Hisobot> {
    const javob = await fetch('/api/hisobot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mahallaId: joriyMahalla,
        lotin: alifbo === 'lot',
        ai: true,
      }),
    });
    const d = await javob.json().catch(() => ({}));
    if (!javob.ok) throw new Error(d.xabar ?? tr('Ҳисобот маълумоти олинмади'));
    return d as Hisobot;
  }

  async function ol(turi: 'pdf' | 'excel') {
    if (ishlayapti) return;
    setXato(null);
    setIshlayapti(turi);
    try {
      setHolat(tr('Маълумот йиғилмоқда ва хулоса тайёрланмоқда…'));
      const m = await malumotOl();

      setHolat(turi === 'pdf' ? tr('PDF чизилмоқда…') : tr('Excel тузилмоқда…'));

      if (turi === 'pdf') {
        const { pdfYasa } = await import('@/lib/hisobot/pdf');
        await pdfYasa(m, faylNomi(m, 'pdf'));
      } else {
        const { excelYasa } = await import('@/lib/hisobot/excel');
        await excelYasa(m, faylNomi(m, 'xlsx'));
      }
    } catch (e) {
      setXato(e instanceof Error ? e.message : tr('Ҳисобот тайёрланмади'));
    } finally {
      setIshlayapti(null);
      setHolat(null);
    }
  }

  const tugma =
    'flex items-center gap-2 rounded-md border border-line bg-surface px-3.5 py-2.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60';

  return (
    <div className="space-y-2 sm:flex sm:flex-col sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {/*
          Ҳудуд танлаш тугмалар ЁНИДА турибди, алоҳида блокда
          эмас: танлаб, дарҳол босилади. Иккита қадам орасига
          нарса қўйилса, фойдаланувчи нима танлаганини
          эсдан чиқаради.
        */}
        {mahallalar && mahallalar.length > 1 && (
          <select
            value={tanlangan}
            onChange={(e) => setTanlangan(e.target.value)}
            aria-label={tr('Ҳисобот ҳудуди')}
            disabled={ishlayapti !== null}
            className="rounded-md border border-line bg-surface px-3 py-2.5 text-xs font-medium text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
          >
            <option value="">{tr('Бутун туман')}</option>
            {mahallalar.map((m) => (
              <option key={m.id} value={m.id}>
                {tr(`${m.nomiKirill} МФЙ`)}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => ol('pdf')}
          disabled={ishlayapti !== null || !malumotBormi}
          className={tugma}
        >
          {ishlayapti === 'pdf' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="h-4 w-4" aria-hidden="true" />
          )}
          {tr('PDF ҳисобот')}
        </button>

        <button
          type="button"
          onClick={() => ol('excel')}
          disabled={ishlayapti !== null || !malumotBormi}
          className={tugma}
        >
          {ishlayapti === 'excel' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          )}
          {tr('Excel ҳисобот')}
        </button>
      </div>

      {holat && (
        <p className="flex items-center gap-1.5 text-[11px] text-ink-muted" role="status">
          <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
          {holat}
        </p>
      )}

      {xato && (
        <p className="text-xs text-danger" role="alert">
          {xato}
        </p>
      )}

      {!malumotBormi ? (
        <p className="max-w-[24rem] text-[11px] leading-relaxed text-warn sm:text-right">
          {tr('Ҳисобот учун камида битта ЮБОРИЛГАН хатлов керак. Биринчи хонадонни киритиб юборганингиздан сўнг тугмалар ишлай бошлайди.')}
        </p>
      ) : (
        <p className="max-w-[24rem] text-[11px] leading-relaxed text-ink-faint sm:text-right">
          {ozMahallasi
            ? tr('Ҳисобот фақат сизнинг маҳаллангиз бўйича тузилади: хатлов, фуқаролар, чора-тадбирлар ва хулоса. Диаграммалар иккала файлда ҳам бор.')
            : `${tr(joriyNomi)} ${tr('бўйича. Хулоса ва тавсиялар, диаграммалар ва барча бўлимлар иккала файлда ҳам бор.')}`}
        </p>
      )}

      <p className="max-w-[24rem] text-[11px] leading-relaxed text-ink-faint sm:text-right">
        {tr('Ҳужжат ҳозирги алифбода тайёрланади. Кириллда керак бўлса — юқоридаги тугмадан алифбони алмаштириб, қайтадан босинг.')}
      </p>
    </div>
  );
}
