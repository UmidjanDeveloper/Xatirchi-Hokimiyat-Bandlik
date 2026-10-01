import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { CalendarClock, ClipboardList, PhoneOff } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { mahallaFiltri } from '@/lib/auth';
import { joriyXodim } from '@/lib/sahifa-auth';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { kunBoshi } from '@/lib/vazifalar';
import { TOSIQ_NOMI, REJA_HOLATI_NOMI, aloqaMuddati, sanaOrali } from '@/lib/oila-rejasi';
import { SAHIFA_HAJMI, sahifaChegarasi, sahifaRaqami, sahifaniTuzat } from '@/lib/sahifalash';
import { Sahifalash } from '@/components/shared/sahifalash';

export function generateMetadata() {
  return { title: matnchi()('Оила режалари') };
}

type Filtr = { holat?: string; kerak?: string; q?: string; sahifa?: string };

export default async function RejalarSahifasi({ searchParams }: { searchParams: Filtr }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/rejalar')) redirect(boshSahifa(sessiya.rol));

  const hozir = new Date();
  const bugun = kunBoshi(hozir);
  const majburiy = mahallaFiltri(sessiya);

  /* Arxivdagi oilaning rejasi ko'rinmaydi; mahalla qoidasi ham shu yerda */
  const oilaSharti: Prisma.HouseholdWhereInput = {
    arxivSanasi: null,
    ...(majburiy.mahallaId ? { mahallaId: majburiy.mahallaId } : {}),
    ...(searchParams.q?.trim()
      ? {
          OR: [
            { oilaBoshligi: { contains: searchParams.q.trim(), mode: 'insensitive' } },
            { manzil: { contains: searchParams.q.trim(), mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const asos: Prisma.OilaRejasiWhereInput = { household: oilaSharti };

  const holat = (['FAOL', 'TUGALLANDI', 'TOXTATILDI'] as const).find((h) => h === searchParams.holat);
  const hammasi = searchParams.holat === 'hammasi';
  const holatSharti: Prisma.OilaRejasiWhereInput = hammasi
    ? {}
    : { holati: holat ?? 'FAOL' };

  /* "Aloqa kerak" - muddati o'tgan YOKI umuman belgilanmagan faol rejalar */
  const aloqaKerak = searchParams.kerak === 'aloqa';
  const kerakSharti: Prisma.OilaRejasiWhereInput = aloqaKerak
    ? {
        holati: 'FAOL',
        OR: [{ keyingiAloqaSanasi: null }, { keyingiAloqaSanasi: { lt: bugun } }],
      }
    : {};

  const where: Prisma.OilaRejasiWhereInput = { ...asos, ...holatSharti, ...kerakSharti };

  const jami = await prisma.oilaRejasi.count({ where });
  const sahifa = sahifaniTuzat(sahifaRaqami(searchParams.sahifa), jami);

  const [royxat, faolSoni, otganSoni, belgilanmagan] = await Promise.all([
    prisma.oilaRejasi.findMany({
      where,
      orderBy: [{ keyingiAloqaSanasi: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }, { id: 'asc' }],
      ...sahifaChegarasi(sahifa),
      select: {
        id: true,
        holati: true,
        maqsad: true,
        maqsadKelishilgan: true,
        tosiqlar: true,
        keyingiAloqaSanasi: true,
        muddat: true,
        household: { select: { oilaBoshligi: true, manzil: true, mahalla: { select: { nomi: true } } } },
        masulXodim: { select: { fullName: true } },
        _count: { select: { qadamlar: true, aloqalar: true } },
      },
    }),
    prisma.oilaRejasi.count({ where: { ...asos, holati: 'FAOL' } }),
    prisma.oilaRejasi.count({
      where: { ...asos, holati: 'FAOL', keyingiAloqaSanasi: { lt: bugun } },
    }),
    prisma.oilaRejasi.count({ where: { ...asos, holati: 'FAOL', keyingiAloqaSanasi: null } }),
  ]);

  /* Har rejaning bajarilgan qadamlari - bitta so'rovda, sahifadagi rejalar uchun */
  const bajarilgan = royxat.length
    ? await prisma.actionPlan.groupBy({
        by: ['rejaId'],
        where: { rejaId: { in: royxat.map((r) => r.id) }, holati: 'BAJARILDI' },
        _count: true,
      })
    : [];
  const bajarilganSoni = new Map(bajarilgan.map((b) => [b.rejaId, b._count]));

  const filtrlar: Record<string, string | undefined> = {
    holat: searchParams.holat,
    kerak: searchParams.kerak,
    q: searchParams.q,
  };

  const chip = (faol: boolean) =>
    `rounded-md border px-3.5 py-2 text-sm transition-colors ${
      faol
        ? 'border-accent bg-accent-soft font-medium text-accent'
        : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
    }`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Оилавий ривожланиш режалари')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Оила билан келишилган мақсад → тўсиқлар → қадамлар → алоқа')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Karta
          ikonka={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
          nomi={tr('Амалдаги режалар')}
          qiymat={faolSoni}
          izoh={tr('Бир оилада биттадан')}
        />
        <Karta
          ikonka={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
          nomi={tr('Алоқа муддати ўтган')}
          qiymat={otganSoni}
          izoh={otganSoni > 0 ? tr('Оила билан боғланинг') : tr('Кечикканлари йўқ')}
          xavfli={otganSoni > 0}
        />
        <Karta
          ikonka={<PhoneOff className="h-4 w-4" aria-hidden="true" />}
          nomi={tr('Алоқа санаси қўйилмаган')}
          qiymat={belgilanmagan}
          izoh={tr('Кейинги алоқани белгиланг')}
          xavfli={belgilanmagan > 0}
        />
      </div>

      <form className="flex flex-wrap items-center gap-2" role="search" method="get">
        <input
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder={tr('Оила бошлиғи ёки манзил')}
          aria-label={tr('Қидириш')}
          className="min-h-11 w-full max-w-xs rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
        />
        {holat && <input type="hidden" name="holat" value={holat} />}
        {hammasi && <input type="hidden" name="holat" value="hammasi" />}
        {aloqaKerak && <input type="hidden" name="kerak" value="aloqa" />}
        <button type="submit" className="tugma-ikkilamchi min-h-11 rounded-md px-4 text-sm">
          {tr('Қидириш')}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link href="/rejalar" className={chip(!searchParams.holat && !aloqaKerak)}>
          {tr('Амалдаги')}
        </Link>
        <Link href="/rejalar?kerak=aloqa" className={chip(aloqaKerak)}>
          {tr('Алоқа керак')}
        </Link>
        <Link href="/rejalar?holat=TUGALLANDI" className={chip(holat === 'TUGALLANDI')}>
          {tr('Якунланган')}
        </Link>
        <Link href="/rejalar?holat=TOXTATILDI" className={chip(holat === 'TOXTATILDI')}>
          {tr('Тўхтатилган')}
        </Link>
        <Link href="/rejalar?holat=hammasi" className={chip(hammasi)}>
          {tr('Ҳаммаси')}
        </Link>
      </div>

      {royxat.length === 0 ? (
        <div className="karta p-8 text-center text-sm text-ink-muted">
          {tr('Шартга мос режа топилмади.')}{' '}
          {faolSoni === 0 && (
            <span>
              {tr('Режа хонадон саҳифасидан тузилади: Хатловларим → оилани танланг.')}
            </span>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {royxat.map((r) => {
            const m = aloqaMuddati(r.keyingiAloqaSanasi, hozir);
            const kun = r.keyingiAloqaSanasi ? sanaOrali(r.keyingiAloqaSanasi, hozir) : 0;
            const aloqaMatni =
              r.holati !== 'FAOL'
                ? null
                : m === 'belgilanmagan'
                  ? tr('Кейинги алоқа санаси йўқ')
                  : m === 'otgan'
                    ? tr(`Алоқа ${Math.abs(kun)} кун кечикди`)
                    : m === 'bugun'
                      ? tr('Алоқа — бугун')
                      : tr(`Алоқа ${kun} кундан кейин`);
            const ogohlik = m === 'otgan' || m === 'belgilanmagan';
            const bajar = bajarilganSoni.get(r.id) ?? 0;

            return (
              <li key={r.id}>
                <Link href={`/rejalar/${r.id}`} className="karta karta-bosiladigan block p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{tr(r.household.oilaBoshligi)}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {tr(r.household.mahalla.nomi)} · {r.household.manzil}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                      {tr(REJA_HOLATI_NOMI[r.holati])}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-ink">
                    {r.maqsad ? (
                      <>
                        {r.maqsad}
                        {!r.maqsadKelishilgan && (
                          <span className="ml-1.5 text-xs text-warn">
                            ({tr('оила билан келишилмаган')})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-faint">{tr('Мақсад ёзилмаган')}</span>
                    )}
                  </p>

                  {r.tosiqlar.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tosiqlar.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-surface-muted px-1.5 py-0.5 text-[11px] text-ink-muted"
                        >
                          {tr(TOSIQ_NOMI[t])}
                        </span>
                      ))}
                      {r.tosiqlar.length > 3 && (
                        <span className="text-[11px] text-ink-faint">+{r.tosiqlar.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
                    <span>
                      {tr('Қадамлар:')} {bajar}/{r._count.qadamlar} {tr('бажарилган')}
                    </span>
                    <span>·</span>
                    <span>
                      {tr('Алоқалар:')} {r._count.aloqalar}
                    </span>
                    {r.masulXodim && (
                      <>
                        <span>·</span>
                        <span>{r.masulXodim.fullName}</span>
                      </>
                    )}
                    {aloqaMatni && (
                      <>
                        <span>·</span>
                        <span className={ogohlik ? 'font-semibold text-danger' : ''}>
                          {ogohlik ? '⚠ ' : ''}
                          {aloqaMatni}
                          {r.keyingiAloqaSanasi && ` (${formatDate(r.keyingiAloqaSanasi).split(',')[0]})`}
                        </span>
                      </>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Sahifalash
        yol="/rejalar"
        joriy={sahifa}
        jami={jami}
        hajm={SAHIFA_HAJMI}
        filtrlar={filtrlar}
      />
    </div>
  );
}

function Karta({
  ikonka,
  nomi,
  qiymat,
  izoh,
  xavfli,
}: {
  ikonka: React.ReactNode;
  nomi: string;
  qiymat: number;
  izoh: string;
  xavfli?: boolean;
}) {
  return (
    <div className={`karta p-4 ${xavfli ? 'border-danger' : ''}`}>
      <div className={`flex items-center gap-2 ${xavfli ? 'text-danger' : 'text-ink-faint'}`}>
        {ikonka}
        <span className="text-xs font-medium">{nomi}</span>
      </div>
      <p className={`raqam mt-2 text-2xl font-bold ${xavfli ? 'text-danger' : 'text-ink'}`}>
        {qiymat}
      </p>
      <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>
    </div>
  );
}
