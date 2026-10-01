import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { mahallagaRuxsat } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanaMaydoni } from '@/lib/sana-maydoni';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate, formatPhone } from '@/lib/utils';
import {
  KANAL_NOMI,
  MUROJAAT_HOLATI_NOMI,
  NATIJA_NOMI,
  muddatHolati,
  muddatidaJavobmi,
} from '@/lib/murojaatlar';
import { MurojaatBoshqaruvi } from '@/components/murojaat/murojaat-boshqaruvi';
import type { XodimTanlovi } from '@/components/murojaat/murojaat-forma';

export function generateMetadata() {
  return { title: matnchi()('Мурожаат') };
}

const kun = (d: Date) => formatDate(d).split(',')[0];

const HODISA_NOMI: Record<string, string> = {
  YARATILDI: 'Қайд этилди',
  HOLAT: 'Ҳолат ўзгарди',
  MASUL: 'Масъул алмашди',
  MUDDAT: 'Муддат кейинга сурилди',
  QAYTA_OCHILDI: 'Қайта очилди',
};

/**
 * Murojaat sahifasi: ma'lumot, natija, TARIX va amallar. Begona mahalla
 * murojaati mahalla xodimiga "yo'q" bo'lib ko'rinadi.
 */
export default async function MurojaatSahifasi({ params }: { params: { id: string } }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/murojaatlar')) redirect(boshSahifa(sessiya.rol));

  const m = await prisma.murojaat.findUnique({
    where: { id: params.id },
    include: {
      mahalla: { select: { nomiKirill: true } },
      masul: { select: { fullName: true } },
      yaratgan: { select: { fullName: true } },
      ishsiz: { select: { id: true, fish: true } },
      tarix: { orderBy: { createdAt: 'asc' }, include: { kim: { select: { fullName: true } } } },
    },
  });
  if (!m || !mahallagaRuxsat(sessiya, m.mahallaId)) notFound();

  const hozir = new Date();
  const mh = muddatHolati(m, hozir);
  const vaqtida = muddatidaJavobmi(m);

  /* Mas'ul bo'la oladigan xodimlar: bandlik markazi va shu mahalla yettiligi */
  const xodimlar = await prisma.user.findMany({
    where: {
      faol: true,
      OR: [{ rol: { in: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] } }, { rol: 'YETTILIK', mahallaId: m.mahallaId }],
    },
    select: { id: true, fullName: true, rol: true, mahallaId: true },
    orderBy: { fullName: 'asc' },
    take: 200,
  });
  const masullar: XodimTanlovi[] = xodimlar.map((x) => ({
    id: x.id,
    ism: x.fullName,
    rol: x.rol as XodimTanlovi['rol'],
    mahallaId: x.mahallaId,
  }));

  return (
    <div className="space-y-5">
      <Link href="/murojaatlar" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {tr('Мурожаатлар')}
      </Link>

      <section className="karta space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="sahifa-sarlavha">{m.raqami}</h1>
            <p className="mt-1 text-sm font-medium text-ink">{m.murojaatchiNomi}</p>
          </div>
          <span className="shrink-0 rounded bg-surface-muted px-2 py-1 text-xs font-semibold text-ink-muted">
            {tr(MUROJAAT_HOLATI_NOMI[m.holati])}
          </span>
        </div>

        <p className="whitespace-pre-line text-sm text-ink">{m.tavsif}</p>

        {mh.holat === 'KECHIKKAN' && (
          <div className="quti-ogoh flex items-start gap-2" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {tr('Жавоб муддати')} {mh.kun} {tr('кун олдин ўтган. Мурожаатчи жавоб кутяпти.')}
            </span>
          </div>
        )}

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Satr nom={tr('Маҳалла')} qiymat={tr(m.mahalla.nomiKirill)} />
          <Satr nom={tr('Қайси йўл билан')} qiymat={tr(KANAL_NOMI[m.kanal])} />
          <Satr nom={tr('Қабул қилинган')} qiymat={formatDate(m.qabulVaqti)} />
          <Satr nom={tr('Қайд этган')} qiymat={`${m.yaratgan.fullName}, ${kun(m.createdAt)}`} />
          <Satr nom={tr('Масъул ходим')} qiymat={m.masul.fullName} />
          <Satr
            nom={tr('Жавоб муддати')}
            qiymat={`${kun(m.javobMuddati)}${
              mh.holat === 'KECHIKKAN' ? ` (${mh.kun} ${tr('кун кечикди')})` : mh.holat === 'BUGUN' ? ` (${tr('бугун')})` : mh.holat === 'YAQIN' ? ` (${mh.kun} ${tr('кун қолди')})` : ''
            }`}
          />
          <Satr
            nom={tr('Мурожаатчи телефони')}
            qiymat={m.murojaatchiTelefon ? formatPhone(m.murojaatchiTelefon) : tr('кўрсатилмаган')}
          />
          {m.qaytaOchilganSoni > 0 && (
            <Satr nom={tr('Қайта очилган')} qiymat={`${m.qaytaOchilganSoni} ${tr('марта')}`} />
          )}
        </dl>

        {m.ishsiz && (
          <p className="text-xs">
            <Link href={`/ishsizlar/${m.ishsiz.id}`} className="text-accent hover:underline">
              {tr('Боғланган фуқаро:')} {m.ishsiz.fish}
            </Link>
          </p>
        )}

        {m.natijaTuri && (
          <div className="rounded-md bg-surface-muted p-3 text-sm">
            <p className="font-semibold text-ink">
              {tr('Натижа:')} {tr(NATIJA_NOMI[m.natijaTuri])}
              {m.javobSanasi && ` · ${kun(m.javobSanasi)}`}
            </p>
            <p className="mt-1 whitespace-pre-line text-ink-muted">{m.natija}</p>
            {vaqtida !== null && (
              <p className={`mt-1 text-xs ${vaqtida ? 'text-ink-faint' : 'text-warn'}`}>
                {vaqtida ? tr('Жавоб муддатида берилган.') : tr('Жавоб муддатдан кейин берилган.')}
              </p>
            )}
          </div>
        )}
        {m.oxirgiQaytaOchishSababi && (
          <p className="text-xs text-ink-muted">
            {tr('Охирги қайта очиш сабаби:')} {m.oxirgiQaytaOchishSababi}
          </p>
        )}
      </section>

      <section className="karta p-4 sm:p-5" aria-labelledby="mba-sarlavha">
        <h2 id="mba-sarlavha" className="mb-3 text-sm font-bold text-ink">
          {tr('Амаллар')}
        </h2>
        <MurojaatBoshqaruvi
          id={m.id}
          holati={m.holati}
          masulId={m.masulId}
          masullar={masullar}
          javobKuni={sanaMaydoni(m.javobMuddati.toISOString())}
          qabulKuni={sanaMaydoni(m.qabulVaqti.toISOString())}
        />
      </section>

      <section className="karta p-4 sm:p-5" aria-labelledby="mt-sarlavha">
        <h2 id="mt-sarlavha" className="mb-3 text-sm font-bold text-ink">
          {tr('Тарих')}
        </h2>
        <ol className="space-y-2.5">
          {m.tarix.map((t) => (
            <li key={t.id} className="border-l-2 border-line pl-3 text-sm">
              <p className="text-xs text-ink-faint">
                {formatDate(t.createdAt)} · {t.kim.fullName}
              </p>
              <p className="font-medium text-ink">
                {tr(HODISA_NOMI[t.hodisa] ?? t.hodisa)}
                {t.holatga && t.hodisa === 'HOLAT' && `: ${tr(MUROJAAT_HOLATI_NOMI[t.holatga])}`}
              </p>
              {t.izoh && <p className="whitespace-pre-line text-xs text-ink-muted">{t.izoh}</p>}
            </li>
          ))}
        </ol>
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
