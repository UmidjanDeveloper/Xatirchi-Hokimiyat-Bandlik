import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Phone, Users } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { bandlikIshi, joriySessiya, mahallagaRuxsat } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDate, formatPhone } from '@/lib/utils';
import { KASB_YONALISHI, MALUMOT, kirillcha } from '@/lib/constants';
import { BAND_HOLATLAR, orinHisobi } from '@/lib/joylashtirish';
import { nomzodlarniTop } from '@/lib/moslashtirish';
import { OrinTaqsimoti } from '@/components/ish-orni/orin-taqsimoti';
import { HolatNishoni } from '@/components/ishsiz/holat-nishoni';
import { MoslikNishoni } from '@/components/ish-orni/moslik-nishoni';
import {
  BekorQilishTugmasi,
  JoylashtirishTugmasi,
} from '@/components/ish-orni/joylashtirish-tugmasi';
import { OrinHolatiTugmasi } from '@/components/ish-orni/orin-holati-tugmasi';

export function generateMetadata() {
  return { title: matnchi()('Бўш иш ўрни') };
}

/** Рўйхатда бир вақтда нечта номзод кўрсатилади */
const KORINADIGAN = 12;

export default async function IshOrniSahifasi({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tuman?: string };
}) {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (!bandlikIshi(sessiya.rol)) redirect('/');

  const orin = await prisma.vacancy.findUnique({
    where: { id: params.id },
    include: {
      mahalla: { select: { nomiKirill: true } },
      joylashganlar: {
        orderBy: { ishgaKirganSana: 'desc' },
        select: {
          id: true,
          fish: true,
          telefon: true,
          holati: true,
          ishgaKirganSana: true,
          malumoti: true,
          mahalla: { select: { nomiKirill: true } },
        },
      },
    },
  });

  if (!orin) notFound();
  if (!mahallagaRuxsat(sessiya, orin.mahallaId)) redirect('/ish-orinlari');

  const band = orin.joylashganlar.filter((p) => BAND_HOLATLAR.includes(p.holati)).length;
  const hisob = orinHisobi(orin.ornlarSoni, band);

  /*
   * Туман бўйича қидириш ИХТИЁРИЙ.
   *
   * Одатда маҳалладаги номзод афзал: қатнов харажати йўқ ва иш
   * узоқ давом этади. Аммо маҳаллада мос одам топилмаса,
   * мутахассис тугмани босиб рўйхатни кенгайтиради — шунда
   * бутун туман кўринади, лекин «бошқа маҳалладан» деб
   * белгиланади.
   */
  const tumanBoyicha = searchParams.tuman === '1';
  const nomzodlar = hisob.toldimi
    ? []
    : await nomzodlarniTop(
        {
          lavozim: orin.lavozim,
          yonalish: orin.yonalish,
          talablar: orin.talablar,
          maosh: orin.maosh,
          mahallaId: orin.mahallaId,
        },
        tumanBoyicha
      );

  const korinadigan = nomzodlar.slice(0, KORINADIGAN);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/ish-orinlari"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        {tr('Бўш иш ўринлари')}
      </Link>

      {/* ── Эълон ── */}
      <div className="karta p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="sahifa-sarlavha">{orin.lavozim}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {orin.korxonaNomi} · {tr(orin.mahalla.nomiKirill)} {tr('МФЙ')}
            </p>
          </div>

          {!orin.faol && (
            <span className="shrink-0 rounded bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-faint">
              {orin.yopilishSababi === 'TOLDI' ? tr('Ўринлар тўлди') : tr('Ёпилган')}
              {orin.yopilganSana ? ` · ${formatDate(orin.yopilganSana).split(',')[0]}` : ''}
            </span>
          )}
        </div>

        {/*
          Ўрин ҳисоби — саҳифанинг энг муҳим рақами. Илгари фақат
          «3 ўрин» деб турарди ва нечтаси ҳали бўшлиги ҳеч қаерда
          кўринмасди.
        */}
        <div className="mt-4 rounded-md bg-surface-muted p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              <span className="raqam">{hisob.qolgan}</span> {tr('ўрин бўш')}
            </p>
            <p className="raqam text-xs text-ink-muted">
              {hisob.band} / {hisob.jami} {tr('банд')}
            </p>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-line"
            role="img"
            aria-label={`${hisob.band} / ${hisob.jami}`}
          >
            <div
              className="h-full rounded-full bg-ok transition-all"
              style={{ width: `${hisob.jami ? (hisob.band / hisob.jami) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
          {orin.yonalish && (
            <span className="rounded bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent">
              {tr(kirillcha(KASB_YONALISHI, orin.yonalish))}
            </span>
          )}
          {orin.maosh && (
            <span className="raqam">
              {(Number(orin.maosh) / 1_000_000).toFixed(1)} {tr('млн сўм')}
            </span>
          )}
          {orin.telefon && (
            <a
              href={`tel:${orin.telefon}`}
              className="raqam flex items-center gap-1 font-medium text-accent"
            >
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(orin.telefon)}
            </a>
          )}
        </div>

        {orin.talablar && <p className="mt-3 text-sm text-ink-muted">{orin.talablar}</p>}

        <div className="mt-4 border-t border-line pt-3">
          <OrinHolatiTugmasi orinId={orin.id} faol={orin.faol} />
        </div>
      </div>

      {/* ── Жойлаштирилганлар ── */}
      {orin.joylashganlar.length > 0 && (
        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">
            {tr('Шу эълон орқали ишга жойлашганлар')}
          </h2>
          <div className="mt-3 space-y-2">
            {orin.joylashganlar.map((p) => (
              <div key={p.id} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/ishsizlar/${p.id}`}
                      className="text-sm font-semibold text-ink transition-colors hover:text-accent"
                    >
                      {p.fish}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {p.ishgaKirganSana
                        ? `${tr('ишга кирган:')} ${formatDate(p.ishgaKirganSana).split(',')[0]}`
                        : tr('сана кўрсатилмаган')}
                      {p.telefon ? ` · ${formatPhone(p.telefon)}` : ''}
                    </p>
                  </div>
                  <HolatNishoni holati={p.holati} />
                </div>
                <div className="mt-2.5">
                  <BekorQilishTugmasi orinId={orin.id} ishsizId={p.id} nomi={tr(p.fish)} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/*
        ── ТАҚСИМОТ ──

        Номзодлар рўйхатидан ОЛДИН туради ва бу атайлаб:
        аввал «қайси маҳаллаларга хабар бериш керак» деган
        амалий савол, кейин «кимга таклиф қилиш» деган
        батафсил рўйхат. Ходим кўпинча биринчисини қилиб,
        иккинчисини раисга қолдиради.
      */}
      <OrinTaqsimoti orinId={orin.id} />

      {/* ── Мос номзодлар ── */}
      <section className="karta p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Users className="h-4 w-4 shrink-0 text-ink-faint" />
              {tr('Мос номзодлар')}
            </h2>
            <p className="mt-1 text-xs text-ink-faint">
              {tumanBoyicha
                ? tr('Бутун туман бўйича — энг мос келгани юқорида')
                : tr('Шу маҳалла бўйича — энг мос келгани юқорида')}
            </p>
          </div>

          {!hisob.toldimi && (
            <Link
              href={`/ish-orinlari/${orin.id}${tumanBoyicha ? '' : '?tuman=1'}`}
              className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              {tumanBoyicha ? tr('Фақат шу маҳалла') : tr('Бутун туман бўйича қидириш')}
            </Link>
          )}
        </div>

        {hisob.toldimi ? (
          <div className="quti-ok mt-3">
            {tr('Барча ўринлар банд. Янги номзод керак бўлса, ўринлар сонини оширинг ёки жойлаштиришни бекор қилинг.')}
          </div>
        ) : korinadigan.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            {tumanBoyicha
              ? tr('Туманда мос номзод топилмади.')
              : tr('Бу маҳаллада мос номзод топилмади — туман бўйича қидириб кўринг.')}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {korinadigan.map(({ nomzod, moslik }) => (
              <div key={nomzod.id} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/ishsizlar/${nomzod.id}`}
                      className="text-sm font-semibold text-ink transition-colors hover:text-accent"
                    >
                      {nomzod.fish}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {tr(nomzod.mahalla.nomiKirill)}
                      {nomzod.malumoti
                        ? ` · ${tr(kirillcha(MALUMOT, nomzod.malumoti))}`
                        : ''}
                      {nomzod.telefon ? ` · ${formatPhone(nomzod.telefon)}` : ''}
                    </p>
                  </div>
                  <HolatNishoni holati={nomzod.holati} />
                </div>

                <div className="mt-2.5">
                  <MoslikNishoni moslik={moslik} />
                </div>

                {orin.faol && (
                  <div className="mt-2.5">
                    <JoylashtirishTugmasi
                      orinId={orin.id}
                      ishsizId={nomzod.id}
                      nomi={nomzod.fish}
                      tosiq={moslik.tosiq}
                      kichik
                    />
                  </div>
                )}
              </div>
            ))}

            {nomzodlar.length > korinadigan.length && (
              <p className="pt-1 text-xs text-ink-faint">
                {tr('Яна')} {nomzodlar.length - korinadigan.length}{' '}
                {tr('та номзод бор — мослиги пастроқ.')}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
