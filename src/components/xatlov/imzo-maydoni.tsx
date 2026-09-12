'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  ИМЗО МАЙДОНИ — экранда чизиб тасдиқлаш
 *
 *  Фуқаро ўз имзосини шу ерда чизади: планшет ёки телефонда
 *  бармоқ билан, компьютерда сичқонча билан, қалам билан ҳам.
 *
 *  ── Нега canvas эмас, SVG ──
 *
 *  Биринчи фикр canvas эди, аммо учта муаммо чиқарди:
 *
 *    1. Экран зичлиги (devicePixelRatio) ҳар қурилмада бошқа.
 *       Canvas да буни қўлда ҳисоблаш керак, акс ҳолда имзо
 *       хира чиқади ёки сурилиб кетади.
 *    2. Натижа PNG бўлади — ўнлаб килобайт. 40 минг хонадонда
 *       бу гигабайтларга чиқади.
 *    3. Босилганда PNG хиралашади, SVG эса ҳар қандай ўлчамда
 *       аниқ.
 *
 *  Шунинг учун имзо тўғридан-тўғри SVG ЙЎЛИ сифатида
 *  чизилади ва шу ҳолда сақланади. Ўлчами бир-икки килобайт,
 *  босилганда аниқ, зичлик билан боғлиқ муаммо йўқ.
 *
 *  ── Нега pointer events ──
 *
 *  `mousedown` + `touchstart` ни алоҳида ёзиш керак бўларди ва
 *  қалам (stylus) учинчи ҳолат бўларди. `pointerdown` эса
 *  учаласини битта йўл билан беради.
 *
 *  `touch-action: none` шарт: бўлмаса бармоқ билан чизганда
 *  саҳифа сурилиб кетади ва имзо узилади.
 * ============================================================
 */

/** Ички координата тизими — имзо шу ўлчамда сақланади */
const EN = 600;
const BOY = 200;

/**
 * Иккита нуқта орасидаги энг кичик масофа.
 *
 * Барча нуқта сақланса, битта имзо 3-4 минг нуқтадан иборат
 * бўлади ва йўл 40 КБ га чиқади. 2 бирлик (600 да) кўз билан
 * сезилмайди, аммо ҳажмни ўн баробар камайтиради.
 */
const ENG_KICHIK_MASOFA = 2;

type Nuqta = { x: number; y: number };

/** Нуқталарни SVG йўлига айлантиради */
function yolYasa(chiziqlar: Nuqta[][]): string {
  return chiziqlar
    .filter((c) => c.length > 0)
    .map((c) => {
      const [bosh, ...qolgan] = c;
      // Битта нуқта — бу ҳам чизиқ: қисқа тўғри кесма қилиб
      // кўрсатамиз, акс ҳолда нуқта умуман кўринмайди
      if (qolgan.length === 0) {
        return `M${bosh.x} ${bosh.y}l0.1 0`;
      }
      return `M${bosh.x} ${bosh.y}` + qolgan.map((n) => `L${n.x} ${n.y}`).join('');
    })
    .join(' ');
}

export function ImzoMaydoni({
  qiymat,
  ozgardi,
  xato,
}: {
  /** SVG йўл маълумоти. Бўш сатр — имзо йўқ */
  qiymat: string;
  ozgardi: (yol: string) => void;
  xato?: string;
}) {
  const { t: tr } = useAlifbo();
  const svgRef = useRef<SVGSVGElement>(null);
  const id = useId();

  /** Тугалланган чизиқлар */
  const [chiziqlar, setChiziqlar] = useState<Nuqta[][]>([]);
  /** Ҳозир чизилаётган чизиқ */
  const [joriy, setJoriy] = useState<Nuqta[]>([]);
  const chizilmoqda = useRef(false);

  /** Экран координатасини ички координатага ўгиради */
  const nuqtaOl = useCallback((e: React.PointerEvent): Nuqta | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return {
      x: Math.round(((e.clientX - r.left) / r.width) * EN * 10) / 10,
      y: Math.round(((e.clientY - r.top) / r.height) * BOY * 10) / 10,
    };
  }, []);

  function boshla(e: React.PointerEvent) {
    const n = nuqtaOl(e);
    if (!n) return;
    /*
     * Кўрсаткични ушлаб оламиз: бармоқ ёки сичқонча майдондан
     * чиқиб кетса ҳам чизиқ узилмайди ва `pointerup` барибир
     * шу элементга келади.
     */
    e.currentTarget.setPointerCapture(e.pointerId);
    chizilmoqda.current = true;
    setJoriy([n]);
  }

  function davom(e: React.PointerEvent) {
    if (!chizilmoqda.current) return;
    const n = nuqtaOl(e);
    if (!n) return;

    setJoriy((oldin) => {
      const oxirgi = oldin[oldin.length - 1];
      if (oxirgi) {
        const masofa = Math.hypot(n.x - oxirgi.x, n.y - oxirgi.y);
        if (masofa < ENG_KICHIK_MASOFA) return oldin;
      }
      return [...oldin, n];
    });
  }

  function tugat() {
    if (!chizilmoqda.current) return;
    chizilmoqda.current = false;

    setJoriy((joriyChiziq) => {
      if (joriyChiziq.length === 0) return [];
      setChiziqlar((oldin) => {
        const yangi = [...oldin, joriyChiziq];
        ozgardi(yolYasa(yangi));
        return yangi;
      });
      return [];
    });
  }

  function tozala() {
    setChiziqlar([]);
    setJoriy([]);
    chizilmoqda.current = false;
    ozgardi('');
  }

  const yol = yolYasa(joriy.length ? [...chiziqlar, joriy] : chiziqlar);
  const bormi = yol.length > 0 || qiymat.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <PenLine className="h-4 w-4 text-ink-faint" aria-hidden="true" />
          {tr('Фуқаронинг имзоси')}
          <span className="text-danger">*</span>
        </label>

        {bormi && (
          <button
            type="button"
            onClick={tozala}
            className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-danger hover:text-danger"
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
            {tr('Тозалаш')}
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        id={id}
        viewBox={`0 0 ${EN} ${BOY}`}
        // `touch-action: none` — бармоқ билан чизганда саҳифа
        // сурилмаслиги учун. Busiz имзо ҳар суришда узилади.
        style={{ touchAction: 'none' }}
        onPointerDown={boshla}
        onPointerMove={davom}
        onPointerUp={tugat}
        onPointerCancel={tugat}
        role="application"
        aria-label={tr('Имзо чизиш майдони')}
        className={`w-full cursor-crosshair touch-none select-none rounded-md border-2 border-dashed bg-surface ${
          xato ? 'border-danger' : bormi ? 'border-ok/50' : 'border-line'
        }`}
      >
        {/* Имзо чизиғи — қоғоздагидек пастда турсин */}
        <line
          x1="24"
          y1={BOY - 38}
          x2={EN - 24}
          y2={BOY - 38}
          stroke="currentColor"
          strokeWidth="1"
          className="text-line"
        />

        {!bormi && (
          <text
            x={EN / 2}
            y={BOY - 52}
            textAnchor="middle"
            className="fill-ink-faint"
            style={{ fontSize: 15 }}
          >
            {tr('Бу ерга имзо чизинг')}
          </text>
        )}

        <path
          d={yol || qiymat}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink"
        />
      </svg>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        {tr('Планшет ёки телефонда бармоқ билан, компьютерда сичқончани босиб турган ҳолда чизинг.')}
      </p>

      {xato && (
        <p className="text-xs text-danger" role="alert">
          {xato}
        </p>
      )}
    </div>
  );
}

/**
 * Сақланган имзони кўрсатади — таҳрирлаш имконисиз.
 *
 * Хонадон саҳифасида ва ҳисоботда ишлатилади: имзо қўйилганини
 * кўриш керак, аммо уни ўзгартириш керак эмас.
 */
export function ImzoKorinishi({ yol, izoh }: { yol: string | null; izoh?: string }) {
  const { t: tr } = useAlifbo();

  if (!yol) {
    return <p className="text-xs text-ink-faint">{tr('Имзо қўйилмаган')}</p>;
  }

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${EN} ${BOY}`}
        className="w-full max-w-xs rounded-md border border-line bg-surface"
        role="img"
        aria-label={tr('Фуқаронинг имзоси')}
      >
        <path
          d={yol}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink"
        />
      </svg>
      {izoh && <p className="text-[11px] text-ink-faint">{izoh}</p>}
    </div>
  );
}
