import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { mahallaFiltri, mahallagaRuxsat } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanaMaydoni } from '@/lib/sana-maydoni';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate, formatPhone } from '@/lib/utils';
import {
  BUYURTMA_HOLATI_NOMI,
  PLATFORMA_OGOHLANTIRISHI,
  TASDIQ_NOMI,
  buyurtmaTasdigi,
} from '@/lib/buyurtmalar';
import { BuyurtmaBoshqaruvi } from '@/components/buyurtma/buyurtma-boshqaruvi';

export function generateMetadata() {
  return { title: matnchi()('Буюртма') };
}

const kun = (d: Date) => formatDate(d).split(',')[0];

const USUL = { OGZAKI: 'оғзаки', TELEFON: 'телефон орқали', YOZMA: 'ёзма' } as const;

/**
 * Buyurtma sahifasi: ma'lumot, ijrochi, narx, tasdiqlar va amallar.
 * Mahalla xodimi faqat o'z mahallasi buyurtmasini ochadi.
 */
export default async function BuyurtmaSahifasi({ params }: { params: { id: string } }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/buyurtmalar')) redirect(boshSahifa(sessiya.rol));

  const b = await prisma.mahalliyBuyurtma.findUnique({
    where: { id: params.id },
    include: {
      mahalla: { select: { nomiKirill: true } },
      yaratgan: { select: { fullName: true } },
      taklif: {
        select: {
          id: true,
          nomi: true,
          ishsiz: { select: { id: true, fish: true, telefon: true, mahallaId: true, mahalla: { select: { nomiKirill: true } } } },
        },
      },
    },
  });
  /* Begona mahalla buyurtmasi "yo'q" deb javob beriladi */
  if (!b || !mahallagaRuxsat(sessiya, b.mahallaId)) notFound();

  const hozir = new Date();
  const bugun = sanaMaydoni(hozir.toISOString());
  const mahallaId = mahallaFiltri(sessiya).mahallaId;

  /* Tayinlash mumkin ijrochilar: faol, rozilikli, arxivda emas; mahalla xodimi - faqat o'z mahallasi */
  const nomzodlar =
    b.holati === 'YANGI' || b.holati === 'TAYINLANDI'
      ? await prisma.xizmatTaklifi.findMany({
          where: {
            faol: true,
            rozilik: true,
            ishsiz: { arxivSanasi: null, ...(mahallaId ? { mahallaId } : {}) },
          },
          orderBy: { nomi: 'asc' },
          take: 100,
          select: { id: true, nomi: true, ishsiz: { select: { fish: true, mahalla: { select: { nomiKirill: true } } } } },
        })
      : [];

  const d = b.holati === 'BAJARILDI' ? buyurtmaTasdigi(b) : null;

  return (
    <div className="space-y-5">
      <Link href="/buyurtmalar" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {tr('Маҳаллий буюртмалар')}
      </Link>

      <section className="karta space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="sahifa-sarlavha">{b.buyurtmachiNomi}</h1>
            <p className="mt-1 text-sm text-ink-muted">{b.tavsif}</p>
          </div>
          <span className="shrink-0 rounded bg-surface-muted px-2 py-1 text-xs font-semibold text-ink-muted">
            {tr(BUYURTMA_HOLATI_NOMI[b.holati])}
          </span>
        </div>

        {b.holati === 'BEKOR' && (
          <div className="quti-ogoh" role="status">
            {tr('Бекор қилинган:')} {b.bekorSababi}
          </div>
        )}

        {d && (
          <div className={d === 'NIZO' ? 'quti-ogoh flex items-start gap-2' : 'rounded-md bg-surface-muted p-2.5 text-sm text-ink'} role="status">
            {d === 'NIZO' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            <span>{tr(TASDIQ_NOMI[d])}</span>
          </div>
        )}

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Satr nom={tr('Маҳалла')} qiymat={tr(b.mahalla.nomiKirill)} />
          <Satr nom={tr('Қабул қилинган')} qiymat={`${kun(b.createdAt)} · ${b.yaratgan.fullName}`} />
          <Satr
            nom={tr('Буюртмачи телефони')}
            qiymat={b.buyurtmachiTelefon ? formatPhone(b.buyurtmachiTelefon) : tr('кўрсатилмаган')}
          />
          <Satr
            nom={tr('Ижрочи')}
            qiymat={
              b.taklif
                ? `${b.taklif.ishsiz.fish} — ${b.taklif.nomi}`
                : tr('ҳали тайинланмаган')
            }
          />
          {b.taklif && (
            <Satr
              nom={tr('Ижрочи телефони')}
              qiymat={b.taklif.ishsiz.telefon ? formatPhone(b.taklif.ishsiz.telefon) : tr('кўрсатилмаган')}
            />
          )}
          <Satr
            nom={tr('Келишилган нарх')}
            qiymat={
              b.kelishilganNarx === null
                ? tr('ҳали келишилмаган')
                : b.kelishilganNarx === 0n
                  ? tr('бепул')
                  : `${Number(b.kelishilganNarx).toLocaleString('ru-RU').replace(/ /g, ' ')} ${tr('сўм')}`
            }
          />
          {b.muddat && <Satr nom={tr('Бажариш муддати')} qiymat={kun(b.muddat)} />}
          {b.bajarilganSana && <Satr nom={tr('Бажарилган сана')} qiymat={kun(b.bajarilganSana)} />}
        </dl>

        {b.taklif && (
          <p className="text-xs">
            <Link href={`/ishsizlar/${b.taklif.ishsiz.id}`} className="text-accent hover:underline">
              {tr('Ижрочи саҳифаси')}
            </Link>
          </p>
        )}

        {b.holati === 'BAJARILDI' && (
          <ul className="space-y-1 text-xs text-ink-muted">
            <li>
              {tr('Ижрочи:')}{' '}
              {b.ijrochiTasdigi === null
                ? tr('тасдиқ олинмаган')
                : `${b.ijrochiTasdigi ? tr('тасдиқлаган') : tr('эътироз билдирган')}${
                    b.ijrochiTasdiqSanasi ? `, ${kun(b.ijrochiTasdiqSanasi)}` : ''
                  }${b.ijrochiTasdiqUsuli ? ` (${tr(USUL[b.ijrochiTasdiqUsuli])})` : ''}`}
            </li>
            <li>
              {tr('Буюртмачи:')}{' '}
              {b.buyurtmachiTasdigi === null
                ? tr('тасдиқ олинмаган')
                : `${b.buyurtmachiTasdigi ? tr('тасдиқлаган') : tr('эътироз билдирган')}${
                    b.buyurtmachiTasdiqSanasi ? `, ${kun(b.buyurtmachiTasdiqSanasi)}` : ''
                  }${b.buyurtmachiTasdiqUsuli ? ` (${tr(USUL[b.buyurtmachiTasdiqUsuli])})` : ''}`}
            </li>
            {b.tasdiqIzohi && <li className="whitespace-pre-line">{b.tasdiqIzohi}</li>}
          </ul>
        )}

        <p className="text-xs text-ink-faint">{tr(PLATFORMA_OGOHLANTIRISHI)}</p>
      </section>

      <section className="karta p-4 sm:p-5" aria-labelledby="bb-sarlavha">
        <h2 id="bb-sarlavha" className="mb-3 text-sm font-bold text-ink">
          {tr('Амаллар')}
        </h2>
        <BuyurtmaBoshqaruvi
          id={b.id}
          holati={b.holati}
          ijrochiTasdigi={b.ijrochiTasdigi}
          buyurtmachiTasdigi={b.buyurtmachiTasdigi}
          kelishuvKuni={b.kelishilganSana ? sanaMaydoni(b.kelishilganSana.toISOString()) : null}
          bugun={bugun}
          takliflar={nomzodlar.map((t) => ({
            id: t.id,
            yorliq: `${t.nomi} — ${t.ishsiz.fish} (${tr(t.ishsiz.mahalla.nomiKirill)})`,
          }))}
          ijrochiNomi={b.taklif ? `${b.taklif.ishsiz.fish} (${b.taklif.nomi})` : null}
          buyurtmachiNomi={b.buyurtmachiNomi}
        />
      </section>
    </div>
  );
}

function Satr({ nom, qiymat }: { nom: string; qiymat: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-faint">{nom}</dt>
      <dd className="break-words text-ink">{qiymat}</dd>
    </div>
  );
}
