import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, CircleHelp, TriangleAlert } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { joriyXodim } from '@/lib/sahifa-auth';
import { vazifalarim, type Ogohlik, type VazifaBlogi } from '@/lib/vazifalar';
import { XatlovNavbati } from '@/components/xatlov/xatlov-navbati';
import { Qoralamalarim } from '@/components/vazifa/qoralamalarim';

/**
 * ============================================================
 *  ВАЗИФАЛАРИМ
 *
 *  ── Нега янги саҳифа ──
 *
 *  Тизимда таҳлил панели бор эди — диаграммалар, маҳаллалар
 *  кесими, ойлик оқим. У САВОЛГА жавоб берарди: «туманда
 *  нима ҳолат?».
 *
 *  Аммо ходим эрталаб тизимга кирганда бошқа савол билан
 *  келади: «МЕН нима қилишим керак?». Унга жавоб йўқ эди —
 *  ходим ўзи рўйхатларни варақлаб, муддати ўтганини кўзи
 *  билан излаши керак эди.
 *
 *  Топилмаган иш — бажарилмаган иш.
 *
 *  ── Ҳар рол ЎЗ ишини кўради ──
 *
 *  Маҳалла ходимига «туманда 19 та жойлаштириш» керак эмас:
 *  унга «бугун шу тўрт оилага бориш керак» керак. Ҳокимга
 *  эса аксинча — унга бирор оиланинг манзили керак эмас,
 *  «қайси ҳудудга ресурс керак» керак.
 *
 *  ── Мавжуд саҳифалар тегилмади ──
 *
 *  Хатлов ҳозир кетмоқда ва 70 та ходим `/xatlov` дан
 *  бошлашга ўрганган. Бошланғич саҳифалар ЎЗГАРМАДИ; бу
 *  менюнинг биринчи банди, холос.
 * ============================================================
 */

export const metadata: Metadata = { title: 'Vazifalarim' };

export const dynamic = 'force-dynamic';

const RANG: Record<Ogohlik, { chegara: string; nishon: string; raqam: string }> = {
  shoshilinch: {
    chegara: 'border-danger/40',
    nishon: 'bg-danger-bg text-danger',
    raqam: 'text-danger',
  },
  diqqat: { chegara: 'border-warn/40', nishon: 'bg-warn-bg text-warn', raqam: 'text-warn' },
  tinch: { chegara: 'border-line', nishon: 'bg-surface-muted text-ink-muted', raqam: 'text-ink' },
};

const OGOHLIK_NOMI: Record<Ogohlik, string> = {
  shoshilinch: 'Шошилинч',
  diqqat: 'Диққат',
  tinch: 'Кузатувда',
};

export default async function VazifalarSahifasi() {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/vazifalar')) redirect(boshSahifa(sessiya.rol));

  const taxta = await vazifalarim({
    userId: sessiya.userId,
    rol: sessiya.rol,
    mahallaId: sessiya.mahallaId,
  });

  /*
   * ── ТАРТИБ: ШОШИЛИНЧИ ТЕПАДА ──
   *
   * Экранда биринчи кўринган нарса бажарилади. Шунинг учун
   * тартиб ҳар сафар ҲОЛАТдан келиб чиқади, кодда ёзилган
   * кетма-кетликдан эмас.
   *
   * Ўлчови йўқ блоклар (`yetishmayotgan`) энг охирида: улар
   * маълумот, вазифа эмас.
   */
  const ogz: Record<Ogohlik, number> = { shoshilinch: 0, diqqat: 1, tinch: 2 };
  const bloklar = [...taxta.bloklar].sort((a, b) => {
    if (Boolean(a.yetishmayotgan) !== Boolean(b.yetishmayotgan)) {
      return a.yetishmayotgan ? 1 : -1;
    }
    return ogz[a.ogohlik] - ogz[b.ogohlik];
  });

  const shoshilinch = bloklar.filter((b) => b.ogohlik === 'shoshilinch' && !b.yetishmayotgan);
  const jamiShoshilinch = shoshilinch.reduce((s, b) => s + b.soni, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr(taxta.sarlavha)}</h1>
        <p className="mt-1 text-sm text-ink-muted">{tr(taxta.izoh)}</p>
      </div>

      {/*
        ── БИТТА ЖУМЛА ──

        Ходим экранни очганда биринчи навбатда БИТТА нарсани
        билиши керак: шошилинч иш борми, йўқми. Қолгани —
        тафсилот.
      */}
      {jamiShoshilinch > 0 ? (
        <p className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {jamiShoshilinch} {tr('та иш кутилмоқда')} —{' '}
            {tr(shoshilinch.map((b) => b.nomi).join(', '))}
          </span>
        </p>
      ) : (
        <p className="rounded-lg border border-ok/40 bg-ok-bg px-4 py-3 text-sm font-semibold text-ok">
          {tr('Шошилинч иш йўқ.')}
        </p>
      )}

      {/*
        Маҳалла ходимига қоралама ва оффлайн навбат ҲОЛАТИ
        ҳам керак. Улар ФАҚАТ телефоннинг ўзида ётади, яъни
        сервер сўрови уларни кўрмайди — шунинг учун браузерда
        ишлайдиган икки блок.
      */}
      {taxta.rol === 'YETTILIK' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Qoralamalarim egasi={sessiya.username} />
          <XatlovNavbati egasi={sessiya.username} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {bloklar.map((b) => (
          <Blok key={b.kalit} blok={b} tr={tr} />
        ))}
      </div>
    </div>
  );
}

function Blok({ blok, tr }: { blok: VazifaBlogi; tr: (m: string) => string }) {
  const r = RANG[blok.ogohlik];

  /*
   * ── ЎЛЧОВ ЙЎҚ БЎЛСА, РАҚАМ ЧИҚМАЙДИ ──
   *
   * Аввал бўш блокка «0» ёзиш табиий кўринарди. Аммо «0»
   * «муаммо йўқ» деган маънони беради, ҳақиқат эса «бу
   * ҳали ўлчанмайди» эди. Иккови бир хил кўринса, ҳисобот
   * ёлғон бўлади.
   */
  if (blok.yetishmayotgan) {
    return (
      <section className="karta border border-dashed border-line p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink-muted">
          <CircleHelp className="h-4 w-4" />
          {tr(blok.nomi)}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">{tr(blok.izoh)}</p>
        <p className="mt-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-ink-muted">
          {tr('Ҳали ўлчанмайди')}: {tr(blok.yetishmayotgan)}
        </p>
      </section>
    );
  }

  return (
    <section className={`karta border ${r.chegara} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-ink">{tr(blok.nomi)}</h2>
          <p className="mt-1 text-xs text-ink-faint">{tr(blok.izoh)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-bold tabular-nums ${r.raqam}`}>
            {blok.soni.toLocaleString('ru-RU')}
          </p>
          {/*
            Ҳолат ФАҚАТ ранг билан айтилмайди: рангни
            ажратмайдиган одам ҳам, қоғозга босилган нусха
            ҳам МАТНни ўқийди.
          */}
          <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.nishon}`}>
            {tr(OGOHLIK_NOMI[blok.ogohlik])}
          </span>
        </div>
      </div>

      {blok.qatorlar.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {blok.qatorlar.map((q) => (
            <li key={q.id} className="border-b border-line/40 pb-1.5 text-sm last:border-0 last:pb-0">
              {q.yol ? (
                <Link href={q.yol} className="font-medium text-ink transition-colors hover:text-accent">
                  {tr(q.matn)}
                </Link>
              ) : (
                <span className="font-medium text-ink">{tr(q.matn)}</span>
              )}
              {q.qoshimcha && (
                <span className="block text-xs text-ink-faint">{tr(q.qoshimcha)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {blok.qatorlar.length === 0 && blok.soni === 0 && (
        <p className="mt-3 text-sm text-ok">{tr('Бажарилиши керак иш йўқ.')}</p>
      )}

      {blok.yol && (
        <Link
          href={blok.yol}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent transition hover:gap-2"
        >
          {tr('Ҳаммасини кўриш')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}
