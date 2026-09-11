'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownUp, ChevronDown } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { useChartTheme } from '@/lib/chart-theme';
import type { MahallaQamrovi, OylikNuqta } from '@/lib/tahlil';

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
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-md"
      style={{ background: t.tooltipBg, borderColor: t.tooltipBorder }}
    >
      {label && <p className="mb-1 font-semibold text-ink">{label}</p>}
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
}: {
  dinamika: OylikNuqta[];
  tur: 'xatlov' | 'ishsiz';
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
