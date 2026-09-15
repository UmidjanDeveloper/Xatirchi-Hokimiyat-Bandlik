import Link from 'next/link';
import { ArrowRight, GraduationCap, Phone } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { formatPhone } from '@/lib/utils';
import type { Navbatchi, VaucherHisobi } from '@/lib/it-vaucher';
import { IT_VAUCHER_HOLATI, IT_YONALISHI, kirillcha } from '@/lib/constants';

/**
 * ============================================================
 *  ВАУЧЕР НАВБАТИ ВА НАТИЖАСИ
 *
 *  Занжирнинг УЗИЛАДИГАН жойи шу ерда эди.
 *
 *  Маҳалла ходими эшик олдида «IT ўрганмоқчи» деб белгиларди,
 *  белги базага тушарди — ва шу билан ТУГАРДИ. Бандлик
 *  марказида уни кўрадиган жой йўқ эди: фуқаро кутарди,
 *  ҳеч ким қўнғироқ қилмасди, олти ойдан кейин яна хатлов
 *  бошланарди.
 *
 *  Энди белги қўйилиши биланоқ одам ШУ РЎЙХАТГА тушади —
 *  исми, телефони, маҳалласи ва «неча кундан бери кутяпти»
 *  деган рақам билан. Энг узоқ кутгани ТЕПАДА.
 *
 *  Пастда эса натижа: нечта ваучер берилди, нечтаси курсни
 *  тугатди, нечтаси ишга жойлашди. Ҳокимнинг саволи аслида
 *  шу — «ваучер берилди» эмас, «ваучер иш бердими».
 * ============================================================
 */

const raqam = (n: number) => n.toLocaleString('ru-RU');

/** Kutish muddatiga qarab ogohlantirish rangi */
function kutishSinfi(kun: number): string {
  if (kun >= 60) return 'bg-danger-bg text-danger';
  if (kun >= 30) return 'bg-warn-bg text-warn';
  return 'bg-surface-muted text-ink-muted';
}

export function VaucherNavbati({
  navbat,
  hisob,
  /** MFY nomi yoki 'Хатирчи тумани' */
  qamrovNomi,
  /** Bandlik xodimi vaucher bera oladi; mahalla xodimi faqat ko'radi */
  bera,
}: {
  navbat: Navbatchi[];
  hisob: VaucherHisobi;
  qamrovNomi: string;
  bera: boolean;
}) {
  const tr = matnchi();

  /* Ҳеч нарса йўқ — блок ҳам йўқ */
  if (hisob.jami === 0 && navbat.length === 0) return null;

  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex items-start gap-2.5">
        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-ink">{tr('IT-шаҳарча ваучерлари')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Фуқаро IT-шаҳарчада ТЕКИНГА касб ўрганади — ваучер бандлик маркази томонидан берилади')}
            {' · '}
            {tr(qamrovNomi)}
          </p>
        </div>
      </div>

      {/* ── Натижа рақамлари ── */}
      {hisob.jami > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <Raqam nomi={tr('Берилган ваучер')} qiymat={raqam(hisob.jami)} />
          <Raqam
            nomi={tr('Курсни тугатди')}
            qiymat={raqam(hisob.natijali)}
            izoh={tr(`${foiz(hisob.natijali, hisob.jami)}%`)}
          />
          <Raqam
            nomi={tr('Ишга жойлашди')}
            qiymat={raqam(hisob.ishgaJoylashgan)}
            izoh={tr(`${foiz(hisob.ishgaJoylashgan, hisob.jami)}%`)}
          />
          <Raqam
            nomi={tr('Ваучер кутмоқда')}
            qiymat={raqam(hisob.navbatda)}
            xavfli={hisob.navbatda > 0}
          />
        </div>
      )}

      {/* ── Ҳолат кесимида ── */}
      {hisob.holatlar.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hisob.holatlar.map((h) => (
            <span
              key={h.holati}
              className="rounded border border-line bg-surface px-2 py-1 text-[11px] text-ink-muted"
            >
              {tr(kirillcha(IT_VAUCHER_HOLATI, h.holati))}
              <span className="ml-1.5 font-semibold tabular-nums text-ink">{raqam(h.soni)}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Йўналишлар: қайси касбга талаб кўп ── */}
      {hisob.yonalishlar.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] text-ink-faint">
            {tr('Йўналишлар кесимида — кейинги гуруҳ шунга қараб очилади:')}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {hisob.yonalishlar.map((y) => (
              <span
                key={y.yonalish}
                className="rounded border border-line bg-surface px-2 py-1 text-[11px] text-ink-muted"
              >
                {tr(kirillcha(IT_YONALISHI, y.yonalish))}
                <span className="ml-1.5 font-semibold tabular-nums text-ink">{raqam(y.soni)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── НАВБАТ ── */}
      {navbat.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="text-xs font-bold text-ink">
            {tr('Ваучер кутаётганлар')} ({navbat.length})
          </h3>
          <p className="mt-1 text-[11px] text-ink-faint">
            {bera
              ? tr('Энг узоқ кутгани тепада. Исмни босинг — ваучер шу саҳифадан берилади.')
              : tr('Энг узоқ кутгани тепада. Ваучерни бандлик маркази беради.')}
          </p>

          <div className="mt-2.5 space-y-1.5">
            {navbat.map((n) => (
              <Link
                key={n.id}
                href={`/ishsizlar/${n.id}`}
                className="flex items-start gap-2 rounded-md border border-line p-2.5 transition-colors hover:border-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{tr(n.fish)}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {tr(`${n.mahallaNomi} МФЙ`)}
                    {n.organmoqchiKasb && ` · ${tr(n.organmoqchiKasb)}`}
                  </p>
                </div>

                {n.telefon && (
                  <span className="raqam hidden shrink-0 items-center gap-1 text-xs text-ink-muted sm:flex">
                    <Phone className="h-3 w-3" aria-hidden="true" />
                    {formatPhone(n.telefon)}
                  </span>
                )}

                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${kutishSinfi(n.kutgani)}`}
                  title={tr('хатловдан бери ўтган кун')}
                >
                  {raqam(n.kutgani)} {tr('кун')}
                </span>

                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Foizni bir kasrli songa yaxlitlaydi */
const foiz = (qism: number, butun: number): string =>
  butun > 0 ? String(Math.round((qism / butun) * 1000) / 10) : '0';

function Raqam({
  nomi,
  qiymat,
  izoh,
  xavfli,
}: {
  nomi: string;
  qiymat: string;
  izoh?: string;
  xavfli?: boolean;
}) {
  return (
    <div className={`rounded-md border p-2.5 ${xavfli ? 'border-warn' : 'border-line'}`}>
      <p className="text-[11px] text-ink-faint">{nomi}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">{qiymat}</p>
      {izoh && <p className="text-[11px] text-ink-faint">{izoh}</p>}
    </div>
  );
}
