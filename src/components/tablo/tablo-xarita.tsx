import { HUDUDLAR, MARKAZLAR, VIEW_BOX } from '@/lib/xarita/hududlar';
import type { XaritaQatori } from '@/lib/xarita/xarita-malumoti';
import {
  QADAM_SONI,
  malumotBormi,
  oraliqMatni,
  qadamlarniHisobla,
  type Olchov,
} from '@/components/xarita/olchovlar';

/**
 * ============================================================
 *  ДЕВОР ТАБЛОСИНИНГ ХАРИТАСИ
 *
 *  ── Нега панелдаги харита ишлатилмади ──
 *
 *  Панелдаги харита ағдарилган, сичқонча остида тултип
 *  очилади, тугмалари ва қидируви бор. Йўлакдаги
 *  телевизорда эса СИЧҚОНЧА ЙЎҚ: ағдариш фақат шаклларни
 *  бузади, тултип ҳеч қачон очилмайди, тугмалар эса ҳеч
 *  қачон босилмайди — улар шунчаки жой эгаллайди.
 *
 *  Шунинг учун бу харита ТЕКИС ва ЖИМ: фақат шакл, ранг ва
 *  легенда.
 *
 *  ── Ранг қоидаси нусхаланмаган ──
 *
 *  Иккала харита ҳам `olchovlar.ts` даги `qadamlarniHisobla`
 *  ни чақиради. Агар қоида шу ерга кўчирилганда, битта МФЙ
 *  панелда тўқ, йўлакда оч кўк бўлиб қолиши мумкин эди — ва
 *  «қайси бири тўғри» деган савол тизимга бўлган ишончни
 *  йўқотарди.
 *
 *  ── Нега фақат учта белги ──
 *
 *  Етмишта шаклга ном ёзиб бўлмайди: тўрт метр наридан
 *  ўқилмайди ва ёзувлар бир-бирининг устига тушади. Шунинг
 *  учун харитада фақат УЧТА рақамли доира туради, номлари
 *  эса харита остида — бир қаторда.
 * ============================================================
 */

/** Харитада нечта ҳудуд рақам билан белгиланади */
const BELGI_SONI = 3;

const son = (n: number) => n.toLocaleString('ru-RU');

export interface TabloXaritasiProps {
  qatorlar: XaritaQatori[];
  olchov: Olchov;
}

export function TabloXaritasi({ qatorlar, olchov }: TabloXaritasiProps) {
  const { qadam, chegara } = qadamlarniHisobla(qatorlar, olchov);

  const xarita = new Map(qatorlar.map((q) => [q.hududId, q]));

  /*
   * ── ЭНГ ЮҚОРИ УЧТАСИ ──
   *
   * Саралаш ҲАР ДОИМ камайиш тартибида. Бир пайтлар у
   * `kopYaxshi` байроғига қараб ағдариларди — «ёмон бўлса,
   * энг кичигини кўрсат» деган мантиқ билан. Натижа кулгили
   * чиқди: «рўйхатдаги ишсизлар» харитасида ишсизи ЭНГ КАМ
   * учта маҳалла белгиланди, яъни табло энг тинч жойларни
   * кўрсатиб турди.
   *
   * Экранда ҳар доим ЭНГ КАТТА қиймат кўрсатилади, сарлавҳа
   * эса унинг маъносини айтади: қамровда бу «энг олдинда»,
   * ишсиз қолдиғида «энг кўп».
   */
  const saralangan = qatorlar
    .filter((q) => malumotBormi(q, olchov))
    .map((q) => ({ q, h: olchov.foiz(q) ?? olchov.hajm(q) }))
    .sort((a, b) => b.h - a.h);

  const belgilar = saralangan.slice(0, BELGI_SONI);
  const belgiOrni = new Map(belgilar.map((b, i) => [b.q.hududId, i + 1]));

  const malumotsiz = qatorlar.length - saralangan.length;

  return (
    <div className="flex h-full flex-col gap-[1.2vh]">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[1.9vh] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {olchov.nomi}
        </h2>
        <p className="text-[1.5vh] text-text-faint">{olchov.izoh}</p>
      </div>

      <div className="relative min-h-0 flex-1">
        <svg
          viewBox={VIEW_BOX}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Хатирчи тумани — ${olchov.nomi}`}
        >
          {HUDUDLAR.map((h) => {
            const q = xarita.get(h.id);
            const n = q ? (qadam.get(q.hududId) ?? 0) : 0;
            return (
              <path
                key={h.id}
                d={h.d}
                fill={n === 0 ? 'var(--xarita-bosh)' : `var(--xarita-${n})`}
                stroke={n === 0 ? 'var(--xarita-bosh-chiziq)' : 'var(--bg-elev)'}
                strokeWidth={n === 0 ? 1 : 1.5}
                strokeLinejoin="round"
              />
            );
          })}

          {/*
            Рақамли доира — харита билан остидаги рўйхатни
            боғлайди. Ном ёзилмайди: етмишта шакл устида ном
            ўқилмайди, рақам эса тўрт метр наридан ҳам
            кўринади.
          */}
          {belgilar.map((b) => {
            const m = MARKAZLAR.get(b.q.hududId);
            if (!m) return null;
            const raqam = belgiOrni.get(b.q.hududId) ?? 0;
            return (
              <g key={b.q.hududId}>
                <circle
                  cx={m.x}
                  cy={m.y}
                  r={13}
                  fill="var(--bg-elev)"
                  stroke="var(--accent)"
                  strokeWidth={3}
                />
                <text
                  x={m.x}
                  y={m.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={16}
                  fontWeight={700}
                  fill="var(--accent)"
                >
                  {raqam}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/*
        ── ЛЕГЕНДА ──

        Легенда ҲАР ДОИМ бор: табло айланиб туради ва қараган
        одам ўлчов қачон алмашганини кўрмаган бўлиши мумкин.
        Рангнинг нимани билдиришини ўша пайтда айтиб бериш
        керак — акс ҳолда экранда маъносиз рангли доғ қолади.
      */}
      <div className="flex flex-wrap items-center gap-x-[2vh] gap-y-[0.6vh] text-[1.5vh]">
        {chegara.length > 0 ? (
          Array.from({ length: QADAM_SONI }, (_, i) => i + 1).map((n) => (
            <span key={n} className="flex items-center gap-[0.7vh]">
              <span
                className="inline-block h-[1.5vh] w-[2.6vh] rounded-[0.4vh]"
                style={{ background: `var(--xarita-${n})` }}
              />
              <span className="tabular-nums text-text-muted">
                {oraliqMatni(n, chegara, olchov, qatorlar)}
              </span>
            </span>
          ))
        ) : (
          <span className="text-text-faint">Барча МФЙ да кўрсаткич бир хил</span>
        )}

        {malumotsiz > 0 && (
          <span className="flex items-center gap-[0.7vh]">
            <span
              className="inline-block h-[1.5vh] w-[2.6vh] rounded-[0.4vh]"
              style={{
                background: 'var(--xarita-bosh)',
                boxShadow: 'inset 0 0 0 1px var(--xarita-bosh-chiziq)',
              }}
            />
            <span className="text-text-faint">{malumotsiz} та МФЙ — хатлов бошланмаган</span>
          </span>
        )}
      </div>

      {belgilar.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-[2vh] gap-y-[0.4vh] text-[1.6vh]">
          <span className="uppercase tracking-[0.12em] text-text-faint">
            {olchov.kopYaxshi ? 'Энг олдинда' : 'Энг кўп'}
          </span>
          {belgilar.map((b, i) => (
            <span key={b.q.hududId} className="flex items-center gap-[0.7vh]">
              <span className="inline-flex h-[2.2vh] w-[2.2vh] items-center justify-center rounded-full bg-accent-soft text-[1.3vh] font-bold text-accent">
                {i + 1}
              </span>
              <span className="text-text">{b.q.nomiKirill}</span>
              <span className="tabular-nums text-text-muted">
                {olchov.foiz(b.q) !== null
                  ? `${son(Math.round(b.h * 10) / 10)}%`
                  : son(Math.round(b.h))}
              </span>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
