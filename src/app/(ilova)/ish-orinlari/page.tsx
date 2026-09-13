import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { bandlikIshi, joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDate, formatPhone } from '@/lib/utils';
import { KASB_YONALISHI, kirillcha } from '@/lib/constants';
import { orinHisobi } from '@/lib/joylashtirish';
import { bandOrinlar } from '@/lib/moslashtirish';
import { IshOrniFormasi } from '@/components/ish-orni/ish-orni-formasi';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Бўш иш ўринлари') };
}

/** Yopilgan e'lonlardan nechtasi ko'rsatiladi */
const YOPILGAN_CHEGARASI = 12;

export default async function IshOrinlariSahifasi() {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (!bandlikIshi(sessiya.rol)) redirect('/');

  const filtr = mahallaFiltri(sessiya);

  const [royxat, yopilganlar, mahallalar] = await Promise.all([
    prisma.vacancy.findMany({
      where: { ...filtr, faol: true },
      orderBy: { createdAt: 'desc' },
      include: { mahalla: { select: { nomiKirill: true } } },
    }),
    prisma.vacancy.findMany({
      where: { ...filtr, faol: false },
      orderBy: { yopilganSana: 'desc' },
      take: YOPILGAN_CHEGARASI,
      include: { mahalla: { select: { nomiKirill: true } } },
    }),
    prisma.mahalla.findMany({
      where: filtr.mahallaId ? { id: filtr.mahallaId } : undefined,
      orderBy: { nomi: 'asc' },
      select: { id: true, nomiKirill: true },
    }),
  ]);

  /*
   * Band o'rinlar bitta so'rovda sanaladi.
   *
   * Har e'lon uchun alohida so'rov yuborish - klassik N+1: 40 ta
   * e'lon 41 ta so'rovga aylanardi va sahifa sekinlashardi.
   */
  const band = await bandOrinlar([...royxat, ...yopilganlar].map((v) => v.id));

  const hisoblar = royxat.map((v) => orinHisobi(v.ornlarSoni, band.get(v.id) ?? 0));
  const jamiOrin = hisoblar.reduce((s, h) => s + h.jami, 0);
  const jamiBosh = hisoblar.reduce((s, h) => s + h.qolgan, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Бўш иш ўринлари')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {royxat.length} {tr('та очиқ эълон ·')} {jamiBosh} {tr('ўрин бўш')}
            {jamiOrin !== jamiBosh ? ` · ${jamiOrin - jamiBosh} ${tr('банд')}` : ''}
          </p>
        </div>
        <IshOrniFormasi mahallalar={mahallalar} />
      </div>

      {royxat.length === 0 ? (
        <div className="karta p-8 text-center">
          <p className="text-sm text-ink-muted">
            {tr('Ҳозирча очиқ бўш иш ўрни йўқ.')}
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-ink-faint">
            {tr('Маҳалладаги корхоналарнинг бўш ўринларини шу ерга киритинг — ҳар бир эълон ўз саҳифасида мос номзодларни ўзи топиб беради.')}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {royxat.map((v, i) => {
            const h = hisoblar[i];
            return (
              <Link
                key={v.id}
                href={`/ish-orinlari/${v.id}`}
                className="karta karta-bosiladigan group flex flex-col p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{v.lavozim}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{v.korxonaNomi}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                </div>

                {/*
                  O'rin hisobi - kartaning eng muhim raqami. "3 o'rin"
                  yozuvi bir nechtasi allaqachon band bo'lganda ham
                  o'zgarmasdi va xodim bo'sh o'rinni ortiqcha
                  hisoblab yurardi.
                */}
                <div className="mt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">
                      <span className="raqam">{h.qolgan}</span> {tr('ўрин бўш')}
                    </span>
                    <span className="raqam text-[11px] text-ink-faint">
                      {h.band} / {h.jami}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-ok"
                      style={{ width: `${h.jami ? (h.band / h.jami) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
                  {v.maosh && (
                    <>
                      <span className="raqam">
                        {(Number(v.maosh) / 1_000_000).toFixed(1)} {tr('млн сўм')}
                      </span>
                      <span>·</span>
                    </>
                  )}
                  <span>{tr(v.mahalla.nomiKirill)}</span>
                </div>

                {v.yonalish && (
                  <span className="mt-2.5 inline-block self-start rounded bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent">
                    {tr(kirillcha(KASB_YONALISHI, v.yonalish))}
                  </span>
                )}

                {v.talablar && (
                  <p className="mt-2 line-clamp-2 text-xs text-ink-muted">{v.talablar}</p>
                )}

                {v.telefon && (
                  <span className="raqam mt-2.5 block text-xs font-medium text-accent">
                    {formatPhone(v.telefon)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Yopilgan e'lonlar ──
          O'chirilmaydi: "bu oy nechta ish o'rni taklif qilindi" va
          "nechtasi to'ldi" degan savollarga javob shu yerdan
          chiqadi. */}
      {yopilganlar.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-ink">{tr('Ёпилган эълонлар')}</h2>
          <div className="karta divide-y divide-line">
            {yopilganlar.map((v) => {
              const h = orinHisobi(v.ornlarSoni, band.get(v.id) ?? 0);
              return (
                <Link
                  key={v.id}
                  href={`/ish-orinlari/${v.id}`}
                  className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-surface-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {v.lavozim} — {v.korxonaNomi}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {tr(v.mahalla.nomiKirill)} ·{' '}
                      {v.yopilishSababi === 'TOLDI'
                        ? `${tr('ўринлар тўлди')} (${h.band}/${h.jami})`
                        : tr('қўлда ёпилган')}
                      {v.yopilganSana
                        ? ` · ${formatDate(v.yopilganSana).split(',')[0]}`
                        : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
