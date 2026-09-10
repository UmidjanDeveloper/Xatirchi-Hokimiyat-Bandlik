import { redirect } from 'next/navigation';
import { matnchi } from '@/lib/alifbo-server';
import { bandlikIshi, joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatPhone } from '@/lib/utils';
import { KASB_YONALISHI, kirillcha } from '@/lib/constants';
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

export default async function IshOrinlariSahifasi() {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (!bandlikIshi(sessiya.rol)) redirect('/');

  const filtr = mahallaFiltri(sessiya);

  const [royxat, mahallalar] = await Promise.all([
    prisma.vacancy.findMany({
      where: { ...filtr, faol: true },
      orderBy: { createdAt: 'desc' },
      include: { mahalla: { select: { nomiKirill: true } } },
    }),
    prisma.mahalla.findMany({
      where: filtr.mahallaId ? { id: filtr.mahallaId } : undefined,
      orderBy: { nomi: 'asc' },
      select: { id: true, nomiKirill: true },
    }),
  ]);

  const jamiOrin = royxat.reduce((s, v) => s + v.ornlarSoni, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Бўш иш ўринлари')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {royxat.length} {tr('та эълон · жами')} {jamiOrin} {tr('ўрин')}
          </p>
        </div>
        <IshOrniFormasi mahallalar={mahallalar} />
      </div>

      {royxat.length === 0 ? (
        <div className="karta p-8 text-center">
          <p className="text-sm text-ink-muted">
            {tr('Ҳали бирорта бўш иш ўрни киритилмаган.')}
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-ink-faint">
            {tr('Хатловнинг X бўлимида маҳалладаги бўш ўринлар сони қайд этилади — уларни шу ерга номма-ном киритсангиз, мослаштириш тахтаси ишлай бошлайди.')}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {royxat.map((v) => (
            <div key={v.id} className="karta p-4">
              <p className="text-sm font-semibold text-ink">{v.lavozim}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{v.korxonaNomi}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
                <span className="raqam font-medium text-ink-muted">
                  {v.ornlarSoni} {tr('ўрин')}
                </span>
                {v.maosh && (
                  <>
                    <span>·</span>
                    <span className="raqam">
                      {(Number(v.maosh) / 1_000_000).toFixed(1)} {tr('млн сўм')}
                    </span>
                  </>
                )}
                <span>·</span>
                <span>{tr(v.mahalla.nomiKirill)}</span>
              </div>

              {v.yonalish && (
                <span className="mt-2.5 inline-block rounded bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent">
                  {tr(kirillcha(KASB_YONALISHI, v.yonalish))}
                </span>
              )}

              {v.talablar && (
                <p className="mt-2 text-xs text-ink-muted">{v.talablar}</p>
              )}

              {v.telefon && (
                <a
                  href={`tel:${v.telefon}`}
                  className="raqam mt-2.5 block text-xs font-medium text-accent"
                >
                  {formatPhone(v.telefon)}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
