'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownUp, ChevronDown } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { useChartTheme } from '@/lib/chart-theme';
import { DAVR_BIRLIGI, type Davr, type MahallaQamrovi, type OylikNuqta } from '@/lib/tahlil';

/**
 * ============================================================
 *  HOKIM PANELI DIAGRAMMALARI
 *
 *  Har bir diagramma uchta qoidaga bo'ysunadi:
 *
 *  1. BITTA O'Q. Ikki xil o'lchov (xonadon va odam) hech qachon
 *     bitta o'qda turmaydi - aks holda ustunlar balandligi
 *     taqqoslanadigandek ko'rinadi, aslida esa emas. Shuning
 *     uchun xatlov va ishsizlar dinamikasi ikki alohida grafik.
 *
 *  2. RANG YOLG'IZ MA'NO TASHIMAYDI. Har bir bo'lakda yozuv yoki
 *     legenda bor. Rang ko'rmaydigan foydalanuvchi ham o'qiy oladi.
 *
 *  3. JADVAL HAM BOR. Diagramma tez tushuniladi, lekin aniq
 *     raqam kerak bo'lganda jadval ochiladi - hisobotga ko'chirish
 *     uchun ham shu qulay.
 * ============================================================
 */

const raqam = (n: number) => n.toLocaleString('ru-RU');

/* ── Umumiy maslahat oynasi ─────────────────────────────────── */

function Maslahat({
  active,
  payload,
  label,
  birlik,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[];
  label?: string;
  birlik: string;
}) {
  const t = useChartTheme();
  const { t: tr } = useAlifbo();
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-md"
      style={{ background: t.tooltipBg, borderColor: t.tooltipBorder }}
    >
      {/* Ой номи бу ерда ҳам ўгирилади — XAxis билан бир хил бўлсин */}
      {label && <p className="mb-1 font-semibold text-ink">{tr(label)}</p>}
      {payload.map((q, i) => (
        <p key={i} className="flex items-center gap-2 text-ink-muted">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: q.color }}
          />
          <span>{q.name}</span>
          <span className="ml-auto font-semibold tabular-nums text-ink">
            {raqam(Number(q.value ?? 0))} {birlik}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ── Bo'sh holat ────────────────────────────────────────────── */

function Bosh({ matn }: { matn: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-ink-faint">
      {matn}
    </div>
  );
}

/* ── 1. CHIZIQLI GRAFIK: oylik dinamika ─────────────────────── */

/**
 * Oylik dinamika.
 *
 * Raqamlar to'planib boradi, ya'ni chiziq faqat yuqoriga qarab
 * yuradi. Hokim uchun savol "bu oy nechta" emas, "qamrov qay
 * darajaga yetdi" - shuning uchun aynan to'planish ko'rsatiladi.
 */
export function DinamikaChizigi({
  dinamika,
  tur,
  davr = 'oy',
}: {
  dinamika: OylikNuqta[];
  tur: 'xatlov' | 'ishsiz';
  davr?: Davr;
}) {
  const { t: tr } = useAlifbo();
  const c = useChartTheme();

  const bormi = dinamika.some((d) =>
    tur === 'xatlov' ? d.xatlovXonadon > 0 : d.aniqlangan > 0
  );
  if (!bormi) return <Bosh matn={tr('Ҳали маълумот йўқ')} />;

  const seriyalar =
    tur === 'xatlov'
      ? [{ kalit: 'xatlovXonadon', nomi: tr('Хатловдан ўтган хонадон'), rang: c.primary }]
      : [
          // Tartibli: aniqlangan -> joylashtirilgan. Shuning uchun
          // kategoriya ranglari emas, ketma-ket shkala ishlatiladi.
          { kalit: 'aniqlangan', nomi: tr('Аниқланган ишсиз'), rang: c.ramp[1] },
          { kalit: 'joylashtirilgan', nomi: tr('Ишга жойлашган'), rang: c.ramp[4] },
        ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={dinamika} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <CartesianGrid stroke={c.axisLine} vertical={false} />
        <XAxis
          dataKey="yorliq"
          tick={{ fill: c.axisText, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: c.axisLine }}
          /*
            Ой номлари СЕРВЕРДА кириллда ҳосил бўлади («Окт 25»)
            ва бу ерда алифбога ўгирилиши керак. Илгари улар
            тўғридан-тўғри чизиларди: ходим лотинга ўтганда
            бутун саҳифа лотин бўлар, фақат диаграмма ўқида
            кирилл ойлар қолиб кетарди.
          */
          interval={davr === 'kun' ? 0 : 'preserveStartEnd'}
          ticks={oqYorliqlari(dinamika, davr)}
          tickFormatter={(v: string) => tr(v)}
        />
        <YAxis
          tick={{ fill: c.axisText, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={54}
          tickFormatter={(v: number) => raqam(v)}
        />
        <Tooltip
          content={<Maslahat birlik={tur === 'xatlov' ? tr('хонадон') : tr('киши')} />}
          cursor={{ stroke: c.axisLine, strokeWidth: 1 }}
        />
        {seriyalar.length > 1 && (
          <Legend
            verticalAlign="top"
            align="left"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: c.axisText }}
          />
        )}
        {seriyalar.map((s) => (
          <Line
            key={s.kalit}
            type="monotone"
            dataKey={s.kalit}
            name={s.nomi}
            stroke={s.rang}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: c.pieStroke }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Ўқда қайси ёрлиқлар кўрсатилсин.
 *
 * Ўттизта кунни ўққа сиғдириб бўлмайди: «17 Авг» каби ёрлиқ
 * 40px жой олади, ўттизтасига эса 600px етмайди. Recharts
 * ўзи ҳам сийраклаштиради, лекин у қайси ёрлиқ МУҲИМлигини
 * билмайди — ва ой чегарасини («1 Сен») ташлаб кетди. Натижада
 * ўқда «31» дан кейин «2» турар, қайси ойдалигини айтмасди.
 *
 * Шунинг учун рўйхат ўзимиз тузамиз: биринчи, охирги, ҳар
 * бешинчи ва ОЙ БОШИ (ёрлиғида бўш жой бор — «1 Сен») ҳар
 * доим қолади.
 */
function oqYorliqlari(dinamika: OylikNuqta[], davr: Davr): string[] | undefined {
  /* Ойлик ва йиллик кесимда ёрлиқлар кам — ҳаммаси сиғади */
  if (davr !== 'kun') return undefined;

  return dinamika
    .filter((n, i) => i === 0 || i === dinamika.length - 1 || i % 5 === 0 || n.yorliq.includes(' '))
    .map((n) => n.yorliq);
}

/** Ishorasi bilan: +12, −8, 0 */
const ishorali = (n: number) => (n > 0 ? `+${raqam(n)}` : n < 0 ? `−${raqam(-n)}` : '0');

/** Foizni ishorasi bilan: +8,4%, −3,1% */
const foizIshorali = (n: number) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('ru-RU')}%`;

/* ── 1b. OQIM USTUNLARI: shu oyning o'zida nechta ────────────── */

/**
 * Oylik OQIM - "shu oyning o'zida nechta qo'shildi".
 *
 * To'plangan chiziq bilan bir xil ma'lumot, lekin boshqa savolga
 * javob beradi. Chiziq "qayerga yetdik" ni ko'rsatadi va u doim
 * yuqoriga qarab yuradi - ish sekinlashsa ham chiziq pasaymaydi,
 * faqat yotiqlashadi, buni esa ko'z ilg'amaydi. Ustun esa
 * to'g'ridan-to'g'ri "o'tgan oy 40 ta edi, bu oy 12 ta" deydi.
 */
export function OqimUstunlari({
  dinamika,
  tur,
  davr = 'oy',
}: {
  dinamika: OylikNuqta[];
  tur: 'xatlov' | 'ishsiz';
  davr?: Davr;
}) {
  const { t: tr } = useAlifbo();
  const c = useChartTheme();

  /*
   * Ranglar qutbli diagramma bilan BIR XIL: to'q sariq - ishsiz
   * qo'shildi, ko'k-yashil - ishsiz kamaydi.
   *
   * Atayin takrorlanadi. Ikkala diagramma ham bitta savolga
   * javob beradi, faqat boshqa tomondan: biri natijani, ikkinchisi
   * sababini ko'rsatadi. Rang bir xil bo'lsa, o'quvchi ma'noni
   * BIR MARTA o'rganadi va u ikkala grafikda ham ishlaydi.
   */
  const seriyalar =
    tur === 'xatlov'
      ? [
          {
            kalit: 'yangiXatlov',
            nomi: tr('Шу ойда хатловдан ўтган хонадон'),
            rang: c.primary,
          },
        ]
      : [
          { kalit: 'yangiAniqlangan', nomi: tr('Аниқланган ишсиз'), rang: c.qutb.osdi },
          { kalit: 'yangiJoylashgan', nomi: tr('Ишга жойлашган'), rang: c.qutb.kamaydi },
        ];

  const bormi = dinamika.some((d) =>
    seriyalar.some((s) => (d[s.kalit as keyof OylikNuqta] as number) > 0)
  );
  if (!bormi) return <Bosh matn={tr('Ҳали маълумот йўқ')} />;

  return (
    <div className="space-y-3">
      {/*
        Легенда Recharts ники эмас, ЎЗИМИЗНИКИ.
        Recharts легендаси ўз баландлигини олдиндан билмайди:
        тор устунда матн икки қаторга тушиб кетади ва диаграмма
        устига ёпишиб қолади. Оддий HTML қатор эса ўз жойини
        ўзи эгаллайди ва диаграммани суради.
      */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        {seriyalar.map((s) => (
          <span key={s.kalit} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: s.rang }}
            />
            {s.nomi}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={dinamika}
          margin={{ top: 8, right: 12, bottom: 4, left: -12 }}
          /*
            Оралиқ ФОИЗДА берилади, пиксельда эмас: тор устунда
            пиксель оралиқ бутун жойни еб қўяди ва устунлар
            сочга айланиб қолади.
          */
          barCategoryGap="18%"
          barGap={1}
        >
          <CartesianGrid stroke={c.axisLine} vertical={false} />
          <XAxis
            dataKey="yorliq"
            tick={{ fill: c.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: c.axisLine }}
            interval={davr === 'kun' ? 0 : 'preserveStartEnd'}
            ticks={oqYorliqlari(dinamika, davr)}
            tickFormatter={(v: string) => tr(v)}
          />
          <YAxis
            tick={{ fill: c.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
            tickFormatter={(v: number) => raqam(v)}
          />
          <Tooltip
            content={<Maslahat birlik={tur === 'xatlov' ? tr('хонадон') : tr('киши')} />}
            cursor={{ fill: c.cursor }}
          />
          {seriyalar.map((s) => (
            <Bar
              key={s.kalit}
              dataKey={s.kalit}
              name={s.nomi}
              fill={s.rang}
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Аниқ рақам керак бўлганда — жадвал */}
      <details className="text-xs">
        <summary className="cursor-pointer text-ink-muted transition-colors hover:text-ink">
          {tr('Рақамлар жадвали')}
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[260px] text-left">
            <thead>
              <tr className="border-b border-line text-ink-faint">
                <th className="py-1.5 pr-3 font-medium">{tr('Ой')}</th>
                {seriyalar.map((s) => (
                  <th key={s.kalit} className="py-1.5 pr-3 text-right font-medium">
                    {s.nomi}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums text-ink-muted">
              {dinamika.map((n) => (
                <tr key={n.oy} className="border-b border-line/60 last:border-0">
                  <td className="py-1.5 pr-3">{tr(n.yorliq)}</td>
                  {seriyalar.map((s) => (
                    <td key={s.kalit} className="py-1.5 pr-3 text-right">
                      {raqam(n[s.kalit as keyof OylikNuqta] as number)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ── 1c. QUTBLI DIAGRAMMA: o'sish va kamayish surati ─────────── */

/** Qutbli diagramma uchun maslahat oynasi - sababini ham aytadi */
function OsishMaslahati({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload?: OylikNuqta }[];
  label?: string;
}) {
  const t = useChartTheme();
  const { t: tr } = useAlifbo();
  if (!active || !payload?.length) return null;

  const n = payload[0]?.payload;
  if (!n) return null;

  const osdi = n.ishsizOzgarishi > 0;
  const rang = n.ishsizOzgarishi === 0 ? t.qutb.betaraf : osdi ? t.qutb.osdi : t.qutb.kamaydi;

  return (
    <div
      className="w-56 rounded-md border px-3 py-2 text-xs shadow-md"
      style={{ background: t.tooltipBg, borderColor: t.tooltipBorder }}
    >
      {label && <p className="mb-1.5 font-semibold text-ink">{tr(label)}</p>}

      <p className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: rang }}
        />
        <span className="text-ink-muted">
          {n.ishsizOzgarishi === 0
            ? tr('Ўзгармади')
            : osdi
              ? tr('Ишсизлар кўпайди')
              : tr('Ишсизлар камайди')}
        </span>
        <span className="ml-auto font-semibold tabular-nums text-ink">
          {ishorali(n.ishsizOzgarishi)}
        </span>
      </p>

      {/*
        Сабабини ҳам кўрсатамиз. Устун ўзи «ўсди» дейди, аммо
        ҳокимга керакли савол бошқа: ишга жойлаштириш сустми,
        ёки хатлов давом этаётгани учун янги ишсиз чиқяптими.
        Иккови тамомила бошқа қарор талаб қилади.
      */}
      <div className="mt-1.5 space-y-1 border-t border-line pt-1.5 text-ink-faint">
        <p className="flex gap-2">
          <span>{tr('Янги аниқланган')}</span>
          <span className="ml-auto tabular-nums">+{raqam(n.yangiAniqlangan)}</span>
        </p>
        <p className="flex gap-2">
          <span>{tr('Ишга жойлашган')}</span>
          <span className="ml-auto tabular-nums">−{raqam(n.yangiJoylashgan)}</span>
        </p>
        <p className="flex gap-2">
          <span>{tr('Ой охирида рўйхатда')}</span>
          <span className="ml-auto tabular-nums">{raqam(n.ishsizQoldiq)}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * O'SISH VA KAMAYISH SURATI.
 *
 * Ustun noldan yuqoriga ham, pastga ham chiqadi. O'lchov -
 * ro'yxatda turgan (hali joylashmagan) ishsizlar sonining o'tgan
 * oyga nisbatan o'zgarishi.
 *
 * Nega aynan qoldiq, "aniqlangan" emas: aniqlangan soni hech
 * qachon kamaymaydi - xatlov davom etar ekan, u faqat o'sadi.
 * Undan chiqadigan xulosa ham doim bitta bo'lib qolardi: "o'sdi".
 * Qoldiq esa haqiqiy holatni ko'rsatadi - ishga joylashtirish
 * yangi aniqlanishdan tez bo'lsa, ustun pastga tushadi.
 *
 * Rang yolg'iz ishlamaydi: ustunning yo'nalishi (yuqori/past),
 * nol chizig'i, tepasidagi yozuv va legenda - hammasi bir xil
 * ma'noni takrorlaydi.
 */
export function OsishUstunlari({
  dinamika,
  davr = 'oy',
}: {
  dinamika: OylikNuqta[];
  davr?: Davr;
}) {
  const { t: tr } = useAlifbo();
  const c = useChartTheme();

  /*
   * O'n ikki oyning HAMMASI chiziladi, birinchisi ham.
   *
   * Oqim har oyning o'z oralig'idan sanaladi, shuning uchun
   * birinchi ustun ham to'g'ri: undan oldingi tarix unga
   * qo'shilib ketmaydi.
   */
  const malumot = dinamika;

  const bormi = malumot.some(
    (d) => d.ishsizOzgarishi !== 0 || d.yangiAniqlangan > 0 || d.yangiJoylashgan > 0
  );
  if (!bormi) return <Bosh matn={tr('Ҳали таққослаш учун маълумот йўқ')} />;

  const oxirgi = malumot[malumot.length - 1];
  const oxirgiRang =
    oxirgi.ishsizOzgarishi === 0
      ? c.qutb.betaraf
      : oxirgi.ishsizOzgarishi > 0
        ? c.qutb.osdi
        : c.qutb.kamaydi;

  return (
    <div className="space-y-3">
      {/*
        Асосий рақам диаграммадан ОЛДИН туради. Ҳоким биринчи
        шуни ўқийди: сўнгги ойда ишсизлар сони қай томонга кетди.
      */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {/*
          «Сўнгги ойда» деб қотириб бўлмайди: кунлик кесимда у
          «сўнгги кунда», йилликда «сўнгги йилда» бўлиши керак.
        */}
        <span className="text-xs text-ink-faint">
          {tr('Сўнгги')} {tr(DAVR_BIRLIGI[davr])}{tr('да')}:
        </span>
        <span className="text-xl font-bold tabular-nums" style={{ color: oxirgiRang }}>
          {ishorali(oxirgi.ishsizOzgarishi)}
        </span>
        <span className="text-xs text-ink-muted">{tr('киши')}</span>
        {oxirgi.ishsizOzgarishFoizi !== 0 && (
          <span className="text-xs font-semibold tabular-nums text-ink-muted">
            ({foizIshorali(oxirgi.ishsizOzgarishFoizi)})
          </span>
        )}
      </div>

      {/* Легенда — ранг ёлғиз маъно ташимаслиги учун */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: c.qutb.kamaydi }}
          />
          {tr('Пастга — ишсизлар камайди')}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: c.qutb.osdi }}
          />
          {tr('Юқорига — ишсизлар кўпайди')}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={malumot}
          margin={{ top: 16, right: 12, bottom: 4, left: -12 }}
          barCategoryGap="18%"
        >
          <CartesianGrid stroke={c.axisLine} vertical={false} />
          <XAxis
            dataKey="yorliq"
            tick={{ fill: c.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: c.axisLine }}
            interval={davr === 'kun' ? 0 : 'preserveStartEnd'}
            ticks={oqYorliqlari(malumot, davr)}
            tickFormatter={(v: string) => tr(v)}
          />
          <YAxis
            tick={{ fill: c.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
            tickFormatter={(v: number) => ishorali(v)}
          />
          {/* Нол чизиғи — қутбли диаграммада энг муҳим чизиқ */}
          <ReferenceLine y={0} stroke={c.axisText} strokeWidth={1} />
          <Tooltip content={<OsishMaslahati />} cursor={{ fill: c.cursor }} />
          <Bar dataKey="ishsizOzgarishi" name={tr('Ўзгариш')} maxBarSize={26}>
            {malumot.map((n) => (
              <Cell
                key={n.oy}
                fill={
                  n.ishsizOzgarishi === 0
                    ? c.qutb.betaraf
                    : n.ishsizOzgarishi > 0
                      ? c.qutb.osdi
                      : c.qutb.kamaydi
                }
              />
            ))}
            <LabelList
              dataKey="ishsizOzgarishi"
              position="top"
              /*
                Ҳар бир устунга рақам ёзилмайди — фақат ноль
                бўлмаганига. Ўн иккита устуннинг ҳаммасига ёзув
                қўйилса, диаграмма жадвалга айланиб қолади.
              */
              content={(p: unknown) => {
                const { x, y, width, value } = p as {
                  x: number;
                  y: number;
                  width: number;
                  value: number;
                };
                if (!value) return null;
                return (
                  <text
                    x={x + width / 2}
                    y={value > 0 ? y - 5 : y + 13}
                    textAnchor="middle"
                    fontSize={10}
                    className="fill-ink-muted tabular-nums"
                  >
                    {ishorali(value)}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/*
        Жадвал — аниқ рақам керак бўлганда. Диаграмма тез
        тушунилади, аммо йиғилишда «июлда нечта эди» деб
        сўралса, кўз билан ўлчаб бўлмайди.
      */}
      <details className="text-xs">
        <summary className="cursor-pointer text-ink-muted transition-colors hover:text-ink">
          {tr('Рақамлар жадвали')}
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-line text-ink-faint">
                <th className="py-1.5 pr-3 font-medium">{tr('Ой')}</th>
                <th className="py-1.5 pr-3 text-right font-medium">{tr('Аниқланди')}</th>
                <th className="py-1.5 pr-3 text-right font-medium">{tr('Жойлашди')}</th>
                <th className="py-1.5 pr-3 text-right font-medium">{tr('Ўзгариш')}</th>
                <th className="py-1.5 text-right font-medium">{tr('Сурат')}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-ink-muted">
              {malumot.map((n) => (
                <tr key={n.oy} className="border-b border-line/60 last:border-0">
                  <td className="py-1.5 pr-3">{tr(n.yorliq)}</td>
                  <td className="py-1.5 pr-3 text-right">{raqam(n.yangiAniqlangan)}</td>
                  <td className="py-1.5 pr-3 text-right">{raqam(n.yangiJoylashgan)}</td>
                  <td className="py-1.5 pr-3 text-right font-semibold text-ink">
                    {ishorali(n.ishsizOzgarishi)}
                  </td>
                  <td className="py-1.5 text-right">
                    {n.ishsizOzgarishFoizi === 0 ? '—' : foizIshorali(n.ishsizOzgarishFoizi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ── 2. USTUNLI DIAGRAMMA: mahallalar taqqoslash ────────────── */

type Olcham = 'qamrovFoizi' | 'aniqlangan' | 'joylashtirilgan' | 'natijaFoizi';

const OLCHAMLAR: { kalit: Olcham; nomi: string; birlik: string; foiz: boolean }[] = [
  { kalit: 'qamrovFoizi', nomi: 'Хатлов қамрови', birlik: '%', foiz: true },
  { kalit: 'aniqlangan', nomi: 'Аниқланган ишсиз', birlik: 'киши', foiz: false },
  { kalit: 'joylashtirilgan', nomi: 'Ишга жойлашган', birlik: 'киши', foiz: false },
  { kalit: 'natijaFoizi', nomi: 'Жойлаштириш фоизи', birlik: '%', foiz: true },
];

/**
 * Mahallalar bo'yicha ustunli diagramma.
 *
 * 70 ta mahallani bitta ekranga sig'dirib bo'lmaydi - nomlar
 * o'qib bo'lmas darajada kichrayadi. Shuning uchun standart
 * ko'rinishda eng yuqori va eng past 10 tasi chiqadi; qolganini
 * pastdagi jadvaldan ko'rish mumkin.
 */
export function MahallaUstunlari({ qamrov }: { qamrov: MahallaQamrovi[] }) {
  const { t: tr, alifbo } = useAlifbo();
  const c = useChartTheme();
  const [olcham, setOlcham] = useState<Olcham>('qamrovFoizi');
  const [yonalish, setYonalish] = useState<'yuqori' | 'past'>('yuqori');

  const joriy = OLCHAMLAR.find((o) => o.kalit === olcham)!;

  const malumot = useMemo(() => {
    const saralangan = [...qamrov].sort((a, b) =>
      yonalish === 'yuqori' ? b[olcham] - a[olcham] : a[olcham] - b[olcham]
    );
    return saralangan.slice(0, 10).map((m) => ({
      nomi: alifbo === 'lot' ? tr(m.nomiKirill) : m.nomiKirill,
      qiymat: m[olcham],
    }));
  }, [qamrov, olcham, yonalish, alifbo, tr]);

  if (!qamrov.length) return <Bosh matn={tr('Ҳали маълумот йўқ')} />;

  return (
    <div className="space-y-3">
      {/* Boshqaruv bir qatorda, diagramma ustida */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={olcham}
          onChange={(e) => setOlcham(e.target.value as Olcham)}
          aria-label={tr('Кўрсаткич')}
          className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink outline-none focus:border-accent"
        >
          {OLCHAMLAR.map((o) => (
            <option key={o.kalit} value={o.kalit}>
              {tr(o.nomi)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setYonalish((y) => (y === 'yuqori' ? 'past' : 'yuqori'))}
          className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />
          {yonalish === 'yuqori' ? tr('Энг юқори 10 та') : tr('Энг паст 10 та')}
        </button>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={malumot}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke={c.axisLine} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: c.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (joriy.foiz ? `${v}%` : raqam(v))}
          />
          <YAxis
            type="category"
            dataKey="nomi"
            tick={{ fill: c.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: c.axisLine }}
            width={128}
          />
          <Tooltip
            content={<Maslahat birlik={joriy.foiz ? '%' : tr(joriy.birlik)} />}
            cursor={{ fill: c.cursor }}
          />
          <Bar
            dataKey="qiymat"
            name={tr(joriy.nomi)}
            fill={c.primary}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── 3. DOIRAVIY DIAGRAMMA: ishsizlar toifalari ─────────────── */

/**
 * Toifalar bo'yicha doiraviy diagramma.
 *
 * Toifalar KESISHADI - bir ayol ham "ayollar daftari"da, ham
 * "ijtimoiy reestr"da bo'lishi mumkin. Shuning uchun bo'laklar
 * yig'indisi jami ishsizlar soniga teng emas va buni yozib
 * qo'yish shart: aks holda hokim foizlarni noto'g'ri o'qiydi.
 */
export function ToifaDoirasi({
  toifalar,
}: {
  toifalar: {
    ayollarDaftari: number;
    ijtimoiyReestr: number;
    migratsiyadanQaytgan: number;
    oliyBitiruvchi: number;
    ortaMaxsusBitiruvchi: number;
  };
}) {
  const { t: tr } = useAlifbo();
  const c = useChartTheme();

  const malumot = [
    { nomi: tr('Аёллар дафтари'), qiymat: toifalar.ayollarDaftari },
    { nomi: tr('Ижтимоий реестр'), qiymat: toifalar.ijtimoiyReestr },
    { nomi: tr('Миграциядан қайтган'), qiymat: toifalar.migratsiyadanQaytgan },
    { nomi: tr('Олий битирувчи'), qiymat: toifalar.oliyBitiruvchi },
    { nomi: tr('Ўрта махсус битирувчи'), qiymat: toifalar.ortaMaxsusBitiruvchi },
  ].filter((m) => m.qiymat > 0);

  const jami = malumot.reduce((s, m) => s + m.qiymat, 0);
  if (!jami) return <Bosh matn={tr('Ҳали маълумот йўқ')} />;

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={malumot}
            dataKey="qiymat"
            nameKey="nomi"
            innerRadius={52}
            outerRadius={92}
            paddingAngle={2}
            stroke={c.pieStroke}
            strokeWidth={2}
          >
            {malumot.map((m, i) => (
              <Cell key={m.nomi} fill={c.toifa[i % c.toifa.length]} />
            ))}
          </Pie>
          <Tooltip content={<Maslahat birlik={tr('киши')} />} />
        </PieChart>
      </ResponsiveContainer>

      {/*
        Legenda ro'yxat ko'rinishida - raqami bilan. Doira ustidagi
        kichkina yozuvlardan ko'ra shu aniqroq va telefonda ham
        o'qiladi.
      */}
      <ul className="space-y-1.5">
        {malumot.map((m, i) => (
          <li key={m.nomi} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: c.toifa[i % c.toifa.length] }}
            />
            <span className="text-ink-muted">{m.nomi}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">
              {raqam(m.qiymat)}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        {tr('Тоифалар кесишади — бир киши бир нечта тоифага кириши мумкин, шунинг учун бўлаклар йиғиндиси жами ишсизлар сонига тенг эмас.')}
      </p>
    </div>
  );
}

/* ── 4. TO'LIQ JADVAL ───────────────────────────────────────── */

interface Ustun {
  kalit: keyof MahallaQamrovi | 'nomi';
  nomi: string;
  /** Raqam ustunlari o'ngga tekislanadi va saralanadi */
  raqamli: boolean;
  foiz?: boolean;
}

const USTUNLAR: Ustun[] = [
  { kalit: 'nomi', nomi: 'МФЙ', raqamli: false },
  { kalit: 'bazaXonadon', nomi: 'Хонадон', raqamli: true },
  { kalit: 'xatlovXonadon', nomi: 'Хатлов', raqamli: true },
  { kalit: 'qamrovFoizi', nomi: 'Қамров', raqamli: true, foiz: true },
  { kalit: 'bazaIshsiz', nomi: 'Рўйхатда ишсиз', raqamli: true },
  { kalit: 'aniqlangan', nomi: 'Аниқланган', raqamli: true },
  { kalit: 'joylashtirilgan', nomi: 'Жойлашган', raqamli: true },
  { kalit: 'natijaFoizi', nomi: 'Натижа', raqamli: true, foiz: true },
];

/**
 * Barcha mahallalar - to'liq jadval.
 *
 * Diagramma tendensiyani ko'rsatadi, jadval esa ANIQ RAQAMNI
 * beradi. Hokim yig'ilishda "Uyshunda nechta?" deb so'raganda
 * javob shu yerdan topiladi.
 *
 * Har bir ustun bo'yicha saralash mumkin. Standart tartib -
 * qamrov bo'yicha eng pastdan: e'tibor talab qiladigan mahalla
 * birinchi ko'rinsin.
 */
export function MahallalarJadvali({ qamrov }: { qamrov: MahallaQamrovi[] }) {
  const { t: tr, alifbo } = useAlifbo();
  const [saralash, setSaralash] = useState<{ kalit: Ustun['kalit']; osish: boolean }>({
    kalit: 'qamrovFoizi',
    osish: true,
  });
  const [hammasi, setHammasi] = useState(false);

  const qatorlar = useMemo(() => {
    const nusxa = [...qamrov];
    nusxa.sort((a, b) => {
      if (saralash.kalit === 'nomi') {
        const an = alifbo === 'lot' ? a.nomi : a.nomiKirill;
        const bn = alifbo === 'lot' ? b.nomi : b.nomiKirill;
        return saralash.osish ? an.localeCompare(bn) : bn.localeCompare(an);
      }
      const av = a[saralash.kalit] as number;
      const bv = b[saralash.kalit] as number;
      return saralash.osish ? av - bv : bv - av;
    });
    return hammasi ? nusxa : nusxa.slice(0, 15);
  }, [qamrov, saralash, hammasi, alifbo]);

  if (!qamrov.length) return <Bosh matn={tr('Ҳали маълумот йўқ')} />;

  function saralaniShi(kalit: Ustun['kalit']) {
    setSaralash((s) => (s.kalit === kalit ? { kalit, osish: !s.osish } : { kalit, osish: false }));
  }

  return (
    <div className="space-y-3">
      {/*
        Keng jadval telefonda sig'maydi. Uni siqib tashlash o'rniga
        alohida gorizontal aylantirish beriladi - sahifaning o'zi
        yon tomonga surilib ketmaydi.
      */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              {USTUNLAR.map((u) => {
                const faol = saralash.kalit === u.kalit;
                return (
                  <th
                    key={u.kalit}
                    scope="col"
                    aria-sort={faol ? (saralash.osish ? 'ascending' : 'descending') : 'none'}
                    className={`py-2 text-xs font-semibold ${u.raqamli ? 'text-right' : 'text-left'}`}
                  >
                    <button
                      type="button"
                      onClick={() => saralaniShi(u.kalit)}
                      className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${
                        faol ? 'text-ink' : 'text-ink-muted'
                      }`}
                    >
                      {tr(u.nomi)}
                      {faol && (
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${saralash.osish ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {qatorlar.map((m) => (
              <tr key={m.id} className="border-b border-line/60 last:border-0">
                {USTUNLAR.map((u) => {
                  if (u.kalit === 'nomi') {
                    return (
                      <td key={u.kalit} className="py-2 pr-3 font-medium text-ink">
                        {alifbo === 'lot' ? tr(m.nomiKirill) : m.nomiKirill}
                      </td>
                    );
                  }
                  const v = m[u.kalit] as number;
                  return (
                    <td key={u.kalit} className="py-2 pl-3 text-right tabular-nums text-ink-muted">
                      {u.foiz ? `${v}%` : raqam(v)}
                      {/*
                        Qamrov 100% dan oshsa - xatlov ro'yxatdagidan
                        KO'PROQ ishsiz topgan. Bu xato emas, muhim
                        xabar: svod jadvalidagi raqam kam ko'rsatgan.
                        Belgisiz qoldirilsa "qamrov 220%" ma'nosiz
                        ko'rsatkichga o'xshab qolardi.
                      */}
                      {u.kalit === 'qamrovFoizi' && v > 100 && (
                        <span
                          className="ml-1 text-warn"
                          title={tr('Хатлов рўйхатдагидан кўпроқ ишсиз топган')}
                        >
                          &#9650;
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qamrov.length > 15 && (
        <button
          type="button"
          onClick={() => setHammasi((h) => !h)}
          className="text-xs font-semibold text-accent hover:underline"
        >
          {hammasi
            ? tr('Фақат 15 тасини кўрсатиш')
            : `${tr('Барчасини кўрсатиш')} (${qamrov.length})`}
        </button>
      )}
    </div>
  );
}
