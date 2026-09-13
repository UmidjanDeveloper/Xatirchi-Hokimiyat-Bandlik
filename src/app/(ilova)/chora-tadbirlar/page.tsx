import Link from 'next/link';
import { matnchi } from '@/lib/alifbo-server';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { AlertOctagon, CalendarClock, CheckCircle2 } from 'lucide-react';
import { joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDate, percent } from '@/lib/utils';
import { MASUL_TASHKILOT, kirillcha } from '@/lib/constants';
import {
  TOPSHIRIQ_HOLATI,
  kechikkanlarShartI,
  korinadiganHolat,
  qolganKun,
} from '@/lib/chora-tadbir';
import { ChoraHolati } from '@/components/chora/chora-holati';
import { SahifaHisoboti } from '@/components/panel/sahifa-hisoboti';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Чора-тадбирлар') };
}

export default async function ChoraTadbirlarSahifasi({
  searchParams,
}: {
  searchParams: { tashkilot?: string; holati?: string };
}) {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const hozir = new Date();
  const majburiy = mahallaFiltri(sessiya);

  /*
   * Yettilik a'zosi faqat o'z mahallasidagi topshiriqlarni ko'radi.
   * Topshiriq mahallaga bevosita bog'lanmagan - u xonadon yoki
   * ishsiz orqali bog'langan, shuning uchun filtr ikkalasi bo'yicha
   * yoziladi.
   */
  const mahallaSharti: Prisma.ActionPlanWhereInput = majburiy.mahallaId
    ? {
        OR: [
          { household: { mahallaId: majburiy.mahallaId } },
          { ishsiz: { mahallaId: majburiy.mahallaId } },
        ],
      }
    : {};

  const kechikkanFiltri = searchParams.holati === 'KECHIKDI';

  const where: Prisma.ActionPlanWhereInput = {
    ...mahallaSharti,
    ...(searchParams.tashkilot ? { masulTashkilot: searchParams.tashkilot } : {}),
    ...(kechikkanFiltri
      ? kechikkanlarShartI(hozir)
      : searchParams.holati
        ? { holati: searchParams.holati as never }
        : {}),
  };

  /*
   * Ҳоким ФАҚАТ ЎҚИЙДИ: у топшириқни ўзи бажармайди, натижасини
   * сўрайди. Унга тугма кўрсатиш «мен ёпиб қўяман» деган нотўғри
   * йўлни очарди.
   */
  const ozgartiraOladi = sessiya.rol !== 'HOKIM';

  const [royxat, jami, bajarilgan, kechikkan, tashkilotlar] = await Promise.all([
    prisma.actionPlan.findMany({
      where,
      orderBy: [{ muddat: 'asc' }],
      take: 200,
      include: {
        household: { select: { id: true, oilaBoshligi: true, manzil: true } },
        ishsiz: { select: { id: true, fish: true } },
      },
    }),
    prisma.actionPlan.count({ where: mahallaSharti }),
    prisma.actionPlan.count({ where: { ...mahallaSharti, holati: 'BAJARILDI' } }),
    prisma.actionPlan.count({ where: { ...mahallaSharti, ...kechikkanlarShartI(hozir) } }),
    // Mas'ul tashkilot kesimi - hisobdorlikning o'zagi
    prisma.actionPlan.groupBy({
      by: ['masulTashkilot'],
      where: { ...mahallaSharti, ...kechikkanlarShartI(hozir) },
      _count: true,
      orderBy: { _count: { masulTashkilot: 'desc' } },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Чора-тадбирлар режаси')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {tr('Муаммо → ечим → масъул ташкилот → муддат')}
          </p>
        </div>
        {/*
          Бу саҳифани БАРЧА рол кўради — ҳокимнинг менюсида
          эса ундан бошқа фақат таҳлил панели бор. Тугма шу
          ерда бўлмаса, ҳоким чора-тадбирлар рўйхатини очиб
          туриб, уни ҳужжат қила олмасди.
        */}
        <SahifaHisoboti malumotBormi={jami > 0} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiKarta
          ikonka={<CalendarClock className="h-4 w-4" />}
          nomi={tr("Жами топшириқ")}
          qiymat={String(jami)}
          izoh={tr(`${bajarilgan} таси бажарилган`)}
        />
        <KpiKarta
          ikonka={<CheckCircle2 className="h-4 w-4" />}
          nomi={tr("Бажарилиш даражаси")}
          qiymat={`${percent(bajarilgan, jami)}%`}
          izoh={tr(`${jami - bajarilgan} та очиқ`)}
        />
        <KpiKarta
          ikonka={<AlertOctagon className="h-4 w-4" />}
          nomi={tr("Муддати ўтган")}
          qiymat={String(kechikkan)}
          izoh={kechikkan > 0 ? tr('Дарҳол чора кўринг') : tr('Кечиккани йўқ')}
          xavfli={kechikkan > 0}
        />
      </div>

      {/*
        Kechikkan topshiriqlar mas'ul tashkilot kesimida.
        Hokim paneli buni ko'rsatgani uchun har bo'lim o'z raqamini
        biladi - bu eng kuchli hisobdorlik quroli.
      */}
      {tashkilotlar.length > 0 && (
        <section className="karta p-4">
          <h2 className="mb-3 text-sm font-bold text-ink">
            {tr('Муддати ўтган топшириқлар — масъул ташкилот кесимида')}
          </h2>
          <div className="space-y-2">
            {tashkilotlar.map((t) => (
              <Link
                key={t.masulTashkilot}
                href={`/chora-tadbirlar?holati=KECHIKDI&tashkilot=${encodeURIComponent(t.masulTashkilot)}`}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-muted"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {tr(kirillcha(MASUL_TASHKILOT, t.masulTashkilot))}
                </span>
                <span className="h-2 rounded-full bg-danger" style={{ width: `${Math.min(60, t._count * 6)}px` }} />
                <span className="raqam w-8 shrink-0 text-right text-sm font-bold text-danger">
                  {t._count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Filtrlar ── */}
      <div className="flex flex-wrap gap-2">
        <Filtr faol={!searchParams.holati && !searchParams.tashkilot} yol="/chora-tadbirlar">
          {tr('Барчаси')}
        </Filtr>
        <Filtr faol={kechikkanFiltri} yol="/chora-tadbirlar?holati=KECHIKDI">
          {tr('Муддати ўтган')}
        </Filtr>
        <Filtr
          faol={searchParams.holati === 'KUTILMOQDA'}
          yol="/chora-tadbirlar?holati=KUTILMOQDA"
        >
          {tr('Кутилмоқда')}
        </Filtr>
        <Filtr
          faol={searchParams.holati === 'BAJARILDI'}
          yol="/chora-tadbirlar?holati=BAJARILDI"
        >
          {tr('Бажарилди')}
        </Filtr>
      </div>

      {/* ── Ro'yxat ── */}
      {royxat.length === 0 ? (
        <div className="karta p-8 text-center text-sm text-ink-muted">
          {tr('Шартга мос топшириқ топилмади.')}
        </div>
      ) : (
        <div className="space-y-2">
          {royxat.map((t) => {
            const holat = korinadiganHolat(t, hozir);
            const kun = qolganKun(t.muddat, hozir);
            const nishon = TOPSHIRIQ_HOLATI[holat];

            return (
              <div key={t.id} className="karta p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-medium text-ink">{t.muammo}</p>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${nishon.sinf}`}
                  >
                    {tr(nishon.kirill)}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-ink-muted">{t.yechim}</p>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
                  <span className="font-medium text-ink-muted">
                    {tr(kirillcha(MASUL_TASHKILOT, t.masulTashkilot))}
                  </span>
                  <span>·</span>
                  <span className={holat === 'KECHIKDI' ? 'font-semibold text-danger' : ''}>
                    {formatDate(t.muddat).split(',')[0]}
                    {holat === 'KECHIKDI'
                      ? tr(` (${Math.abs(kun)} кун кечикди)`)
                      : holat === 'BAJARILDI'
                        ? ''
                        : tr(` (${kun} кун қолди)`)}
                  </span>

                  {t.household && (
                    <>
                      <span>·</span>
                      <Link
                        href={`/xatlov/${t.household.id}`}
                        className="truncate hover:text-accent"
                      >
                        {t.household.oilaBoshligi}
                      </Link>
                    </>
                  )}

                  {t.ishsiz && (
                    <>
                      <span>·</span>
                      <Link
                        href={`/ishsizlar/${t.ishsiz.id}`}
                        className="truncate hover:text-accent"
                      >
                        {t.ishsiz.fish}
                      </Link>
                    </>
                  )}

                  {t.bajarilganSana && (
                    <>
                      <span>·</span>
                      <span className="text-ok">
                        {tr('бажарилди:')} {formatDate(t.bajarilganSana).split(',')[0]}
                      </span>
                    </>
                  )}
                </div>

                {/*
                  Ҳолат тугмалари — рўйхатнинг ўзида.
                  Топшириқни ёпиш учун хонадон саҳифасига ўтиш
                  шарт эмас: масъул ходим кунда ўнлаб топшириқни
                  шу ердан юритади.
                */}
                <ChoraHolati
                  topshiriqId={t.id}
                  joriy={t.holati}
                  natijaIzohi={t.natijaIzohi}
                  ozgartiraOladi={ozgartiraOladi}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiKarta({
  ikonka,
  nomi,
  qiymat,
  izoh,
  xavfli,
}: {
  ikonka: React.ReactNode;
  nomi: string;
  qiymat: string;
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

function Filtr({
  faol,
  yol,
  children,
}: {
  faol: boolean;
  yol: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={yol}
      className={`rounded-md border px-3.5 py-2 text-sm transition-colors ${
        faol
          ? 'border-accent bg-accent-soft font-medium text-accent'
          : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
      }`}
    >
      {children}
    </Link>
  );
}
