import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import type { BuyurtmaHolati, Prisma } from '@prisma/client';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate } from '@/lib/utils';
import {
  BUYURTMA_HOLATI_NOMI,
  PLATFORMA_OGOHLANTIRISHI,
  TASDIQ_NOMI,
  buyurtmaKorsatkichlari,
  buyurtmaTasdigi,
} from '@/lib/buyurtmalar';
import { SAHIFA_HAJMI, sahifaChegarasi, sahifaRaqami, sahifaniTuzat } from '@/lib/sahifalash';
import { Sahifalash } from '@/components/shared/sahifalash';
import { BuyurtmaForma } from '@/components/buyurtma/buyurtma-forma';
import { BuyurtmaKorsatkichBlogi } from '@/components/buyurtma/korsatkich-blogi';

export function generateMetadata() {
  return { title: matnchi()('Маҳаллий буюртмалар') };
}

type Filtr = { holat?: string; sahifa?: string };

const kun = (d: Date) => formatDate(d).split(',')[0];
const HOLATLAR: BuyurtmaHolati[] = ['YANGI', 'TAYINLANDI', 'KELISHILDI', 'BAJARILDI', 'BEKOR'];
const FAOL: BuyurtmaHolati[] = ['YANGI', 'TAYINLANDI', 'KELISHILDI'];

/**
 * Mahalliy buyurtmalar (pilot). Faqat xodim ko'radi va boshqaradi: ochiq
 * bozor yo'q, platforma to'lovni yuritmaydi. Mahalla xodimi faqat o'z
 * mahallasi buyurtmalarini ko'radi.
 */
export default async function BuyurtmalarSahifasi({ searchParams }: { searchParams: Filtr }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/buyurtmalar')) redirect(boshSahifa(sessiya.rol));

  const mahallaId = mahallaFiltri(sessiya).mahallaId;
  const asos: Prisma.MahalliyBuyurtmaWhereInput = mahallaId ? { mahallaId } : {};

  const holat = HOLATLAR.find((h) => h === searchParams.holat);
  const where: Prisma.MahalliyBuyurtmaWhereInput = {
    ...asos,
    holati: holat ? holat : { in: FAOL },
  };

  const [jami, sonlari, korsatkich, mahallalar] = await Promise.all([
    prisma.mahalliyBuyurtma.count({ where }),
    prisma.mahalliyBuyurtma.groupBy({ by: ['holati'], where: asos, _count: { _all: true } }),
    buyurtmaKorsatkichlari(mahallaId).catch((e) => {
      console.error('Buyurtma korsatkichini hisoblab bolmadi:', e);
      return null;
    }),
    mahallaId
      ? Promise.resolve([] as { id: string; nomiKirill: string }[])
      : prisma.mahalla.findMany({ orderBy: { nomiKirill: 'asc' }, select: { id: true, nomiKirill: true } }),
  ]);

  const sahifa = sahifaniTuzat(sahifaRaqami(searchParams.sahifa), jami);
  const royxat = await prisma.mahalliyBuyurtma.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    ...sahifaChegarasi(sahifa),
    select: {
      id: true,
      holati: true,
      buyurtmachiNomi: true,
      tavsif: true,
      createdAt: true,
      kelishilganNarx: true,
      bajarilganSana: true,
      ijrochiTasdigi: true,
      buyurtmachiTasdigi: true,
      mahalla: { select: { nomiKirill: true } },
      taklif: { select: { nomi: true, ishsiz: { select: { fish: true } } } },
    },
  });

  const soni = (h: BuyurtmaHolati) => sonlari.find((x) => x.holati === h)?._count._all ?? 0;
  const faolSoni = FAOL.reduce((a, h) => a + soni(h), 0);
  const filtr = holat ?? 'FAOL';

  const chip = (faol: boolean) =>
    `rounded-md border px-3.5 py-2 text-sm transition-colors ${
      faol
        ? 'border-accent bg-accent-soft font-medium text-accent'
        : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
    }`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Маҳаллий буюртмалар')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Буюртма → ижрочи → нарх келишилди → бажарилди → икки томон тасдиқлади')}
        </p>
        <p className="mt-1 text-xs text-ink-faint">{tr(PLATFORMA_OGOHLANTIRISHI)}</p>
      </div>

      <details className="karta p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-ink">{tr('Янги буюртма қабул қилиш')}</summary>
        <div className="mt-4">
          <BuyurtmaForma
            mahallalar={mahallalar.map((m) => ({ id: m.id, nom: tr(m.nomiKirill) }))}
            mahallaId={mahallaId ?? null}
          />
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">
          {tr('Хизмат таклифи (ижрочи) фуқаро саҳифасидан қўшилади: у ерда фуқаро розилиги қайд этилади.')}
        </p>
      </details>

      {korsatkich && <BuyurtmaKorsatkichBlogi k={korsatkich} />}

      <div className="flex flex-wrap gap-2" role="navigation" aria-label={tr('Буюртмалар ҳолати')}>
        <Link href="/buyurtmalar" className={chip(filtr === 'FAOL')}>
          {tr('Жараёнда')} ({faolSoni})
        </Link>
        {HOLATLAR.map((h) => (
          <Link key={h} href={`/buyurtmalar?holat=${h}`} className={chip(filtr === h)}>
            {tr(BUYURTMA_HOLATI_NOMI[h])} ({soni(h)})
          </Link>
        ))}
      </div>

      {royxat.length === 0 ? (
        <div className="karta p-6 text-center text-sm text-ink-muted">
          {tr('Бу ҳолатда буюртма йўқ.')}
        </div>
      ) : (
        <ul className="space-y-3">
          {royxat.map((b) => {
            const d = b.holati === 'BAJARILDI' ? buyurtmaTasdigi(b) : null;
            return (
              <li key={b.id} className="karta p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/buyurtmalar/${b.id}`} className="text-sm font-semibold text-ink hover:text-accent">
                      {b.buyurtmachiNomi}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-muted">{b.tavsif}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {tr(b.mahalla.nomiKirill)} · {kun(b.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                    {tr(BUYURTMA_HOLATI_NOMI[b.holati])}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  {b.taklif ? (
                    <span>
                      {tr('Ижрочи:')} {b.taklif.ishsiz.fish} ({b.taklif.nomi}).{' '}
                    </span>
                  ) : (
                    <span>{tr('Ижрочи ҳали йўқ.')} </span>
                  )}
                  {b.kelishilganNarx !== null && (
                    <span>
                      {tr('Келишилган нарх:')}{' '}
                      {b.kelishilganNarx === 0n
                        ? tr('бепул')
                        : `${Number(b.kelishilganNarx).toLocaleString('ru-RU').replace(/ /g, ' ')} ${tr('сўм')}`}
                      .
                    </span>
                  )}
                </p>
                {d && (
                  <p className={`mt-1 inline-flex items-center gap-1 text-xs ${d === 'NIZO' ? 'text-warn' : 'text-ink-muted'}`}>
                    {d === 'NIZO' && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
                    {tr(TASDIQ_NOMI[d])}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Sahifalash
        yol="/buyurtmalar"
        joriy={sahifa}
        jami={jami}
        hajm={SAHIFA_HAJMI}
        filtrlar={{ holat: searchParams.holat }}
      />
    </div>
  );
}
