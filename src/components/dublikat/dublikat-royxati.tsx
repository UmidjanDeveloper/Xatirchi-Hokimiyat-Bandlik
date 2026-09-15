import Link from 'next/link';
import { ArrowRight, CopyCheck, Phone } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { formatDate, formatPhone } from '@/lib/utils';
import { barchaDublikatlar, type Dublikat, type GumonDarajasi } from '@/lib/dublikat';

/**
 * ============================================================
 *  ТАКРОРЛАНГАН ФУҚАРОЛАР
 *
 *  Бир одам икки хонадонда ёзилиб қолиши мумкин. Энг кўп
 *  учрайдиган ҳол — КЕЛИН: у эрининг хонадонида ҳам,
 *  ота-онасиникида ҳам «оила аъзоси» бўлиб турибди.
 *
 *  Зарари: ишсизлар сони ошиб кўринади, қамров фоизи бузилади,
 *  нафақа ёки ваучер икки марта берилиши мумкин.
 *
 *  ── Бу рўйхат ҚАРОР ҚИЛМАЙДИ ──
 *
 *  Тизим «бу бир одам» демайди — ГУМОН қилади. Бир хил исмли
 *  икки киши ҳақиқатан бўлади: қишлоқда ака-ука фарзандлари
 *  кўпинча бир хил номланади.
 *
 *  Шунинг учун бу ерда ўчириш тугмаси ЙЎҚ. Ходим иккала
 *  ёзувни очиб кўради ва ўзи ҳал қилади. Автоматик ўчириш
 *  ҳақиқий фуқарони рўйхатдан чиқариб юбориши мумкин эди —
 *  буни эса ҳеч ким сезмасди.
 * ============================================================
 */

const NISHON: Record<GumonDarajasi, { nomi: string; sinf: string }> = {
  yuqori: { nomi: 'Юқори гумон', sinf: 'bg-danger-bg text-danger' },
  orta: { nomi: 'Ўрта гумон', sinf: 'bg-warn-bg text-warn' },
  past: { nomi: 'Паст гумон', sinf: 'bg-surface-muted text-ink-muted' },
};

export async function DublikatRoyxati({
  mahallaId,
  /** Нечтасини кўрсатиш */
  chegara = 20,
}: {
  mahallaId?: string;
  chegara?: number;
}) {
  const tr = matnchi();
  const hammasi = await barchaDublikatlar(mahallaId);

  /* Гумон йўқ — блок ҳам йўқ. Бўш карточка ишончни камайтиради. */
  if (hammasi.length === 0) return null;

  const royxat = hammasi.slice(0, chegara);
  const yuqori = hammasi.filter((d) => d.daraja === 'yuqori').length;

  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex items-start gap-2.5">
        <CopyCheck className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-ink">
            {tr('Такрорланган фуқаролар')} ({hammasi.length})
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Бир одам икки хонадонда ёзилган бўлиши мумкин — масалан келин эрининг ва ота-онасининг хонадонида. Тизим ГУМОН қилади, қарорни сиз қабул қиласиз.')}
          </p>
          {yuqori > 0 && (
            <p className="mt-1.5 text-xs font-semibold text-danger">
              {tr('Шундан')} {yuqori}{' '}
              {tr('тасида исмдан ташқари туғилган сана ёки телефон ҳам бир хил')}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {royxat.map((d) => (
          <Guruh key={d.kalit} d={d} />
        ))}
      </div>

      {hammasi.length > chegara && (
        <p className="mt-3 text-xs text-ink-faint">
          {tr('Яна')} {hammasi.length - chegara}{' '}
          {tr('та гуруҳ бор — энг кучли гумонлар юқорида')}
        </p>
      )}
    </section>
  );
}

function Guruh({ d }: { d: Dublikat }) {
  const tr = matnchi();
  const n = NISHON[d.daraja];

  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {/*
            Сарлавҳада БИРИНЧИ ёзувнинг исми туради, аммо гуруҳда
            ёзилиши бошқача бўлганлари ҳам бор («Тошматов» ва
            «Toshmatov»). Шунинг учун пастда ҳар ёзув ўз исми
            билан кўрсатилади — ходим қайси ёзув қайси эканини
            кўриши керак.
          */}
          <p className="font-medium text-ink">{d.yozuvlar[0].fish}</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {d.yozuvlar.length} {tr('жойда ёзилган')} · {d.sabablar.map(tr).join(' · ')}
          </p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${n.sinf}`}>
          {tr(n.nomi)}
        </span>
      </div>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        {d.yozuvlar.map((y) => (
          <Yozuv key={y.id} y={y} />
        ))}
      </div>
    </div>
  );
}

function Yozuv({ y }: { y: Dublikat['yozuvlar'][number] }) {
  const tr = matnchi();

  const ichi = (
    <>
      {/*
        Исм ҳар ёзувда АЛОҲИДА кўрсатилади ва АЙНАН ёзилганича —
        `tr()` дан ЎТКАЗИЛМАЙДИ.

        Бу қасддан қилинган истисно. Илова қолган ҳамма жойда
        исмни танланган алифбода кўрсатади, бу ерда эса
        йўқ: бутун блокнинг мақсади «бир хил одам икки хил
        ёзилган» эканини кўрсатиш. Ўгирилса, «Тошматов Акрам»
        ва «Toshmatov Akram» экранда БИР ХИЛ бўлиб қоларди ва
        ходим нима учун гумон қилинганини тушунмасди.
      */}
      <p className="truncate text-xs font-medium text-ink">{y.fish}</p>
      <p className="mt-0.5 text-[11px] font-medium text-ink-muted">
        {tr(y.mahallaNomi)} {tr('МФЙ')}
      </p>
      {y.oilaBoshligi && (
        <p className="text-[11px] text-ink-muted">
          {tr('оила боши:')} {y.oilaBoshligi}{/* юқоридаги изоҳ: айнан ёзилганича */}
        </p>
      )}
      {y.manzil && <p className="text-[11px] text-ink-faint">{y.manzil}</p>}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-faint">
        {y.tugilganSana && (
          <span className="raqam">{formatDate(y.tugilganSana).split(',')[0]}</span>
        )}
        {y.telefon && (
          <span className="raqam flex items-center gap-1">
            <Phone className="h-3 w-3" aria-hidden="true" />
            {formatPhone(y.telefon)}
          </span>
        )}
      </div>
    </>
  );

  /*
    Ҳавола ХОНАДОН саҳифасига: маҳалла ходими фуқаронинг
    шахсий анкетасини кўрмайди, хонадонни эса кўради — ва
    таққослаш учун айнан хонадон керак («бу қайси оила»).
  */
  return y.householdId ? (
    <Link
      href={`/xatlov/${y.householdId}`}
      className="flex items-start gap-2 rounded-md border border-line bg-surface-muted p-2.5 transition-colors hover:border-accent"
    >
      <span className="min-w-0 flex-1">{ichi}</span>
      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
    </Link>
  ) : (
    <div className="rounded-md border border-line bg-surface-muted p-2.5">{ichi}</div>
  );
}
