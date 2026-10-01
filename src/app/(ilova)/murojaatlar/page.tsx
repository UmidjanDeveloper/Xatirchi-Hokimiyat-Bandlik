import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import type { MurojaatHolati, Prisma } from '@prisma/client';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate } from '@/lib/utils';
import {
  KANAL_NOMI,
  MUROJAAT_HOLATI_NOMI,
  muddatHolati,
  muddatliMurojaatlar,
  murojaatKorsatkichlari,
} from '@/lib/murojaatlar';
import { SAHIFA_HAJMI, sahifaChegarasi, sahifaRaqami, sahifaniTuzat } from '@/lib/sahifalash';
import { Sahifalash } from '@/components/shared/sahifalash';
import { MurojaatForma, type XodimTanlovi } from '@/components/murojaat/murojaat-forma';
import { MurojaatKorsatkichBlogi } from '@/components/murojaat/korsatkich-blogi';

export function generateMetadata() {
  return { title: matnchi()('Мурожаатлар') };
}

type Filtr = { holat?: string; sahifa?: string };

const kun = (d: Date) => formatDate(d).split(',')[0];
const OCHIQ: MurojaatHolati[] = ['YANGI', 'JARAYONDA'];

/**
 * Murojaatlar. Fuqaro o'zi yozmaydi: murojaatni xodim qayd etadi. Mahalla
 * xodimi faqat o'z mahallasi murojaatlarini ko'radi.
 */
export default async function MurojaatlarSahifasi({ searchParams }: { searchParams: Filtr }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/murojaatlar')) redirect(boshSahifa(sessiya.rol));

  const mahallaId = mahallaFiltri(sessiya).mahallaId;
  const hozir = new Date();
  const asos: Prisma.MurojaatWhereInput = mahallaId ? { mahallaId } : {};

  const filtr = (['ochiq', 'muddatli', 'mening', 'javob', 'yopiq', 'hammasi'] as const).find((h) => h === searchParams.holat) ?? 'ochiq';

  const shart: Prisma.MurojaatWhereInput =
    filtr === 'ochiq'
      ? { ...asos, holati: { in: OCHIQ } }
      : filtr === 'mening'
        ? { ...asos, holati: { in: OCHIQ }, masulId: sessiya.userId }
        : filtr === 'javob'
          ? { ...asos, holati: 'JAVOB_BERILDI' }
          : filtr === 'yopiq'
            ? { ...asos, holati: 'YOPILDI' }
            : asos;

  /* "Muddatli" - aniq kun hisobi kodda (Toshkent kuni) */
  const muddatli = filtr === 'muddatli' ? await muddatliMurojaatlar(mahallaId, hozir) : null;
  const jami = muddatli ? muddatli.length : await prisma.murojaat.count({ where: shart });
  const sahifa = sahifaniTuzat(sahifaRaqami(searchParams.sahifa), jami);
  const { skip, take } = sahifaChegarasi(sahifa);

  const tanlov = {
    id: true,
    raqami: true,
    holati: true,
    kanal: true,
    murojaatchiNomi: true,
    tavsif: true,
    qabulVaqti: true,
    javobMuddati: true,
    mahalla: { select: { nomiKirill: true } },
    masul: { select: { fullName: true } },
  } satisfies Prisma.MurojaatSelect;

  const [royxatHamma, sonlari, korsatkich, mahallalar, xodimlar] = await Promise.all([
    muddatli
      ? prisma.murojaat.findMany({ where: { id: { in: muddatli.slice(skip, skip + take).map((x) => x.id) } }, select: tanlov })
      : prisma.murojaat.findMany({ where: shart, orderBy: [{ javobMuddati: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }], skip, take, select: tanlov }),
    prisma.murojaat.groupBy({ by: ['holati'], where: asos, _count: { _all: true } }),
    murojaatKorsatkichlari(mahallaId, hozir).catch((e) => {
      console.error('Murojaat korsatkichini hisoblab bolmadi:', e);
      return null;
    }),
    mahallaId
      ? Promise.resolve([] as { id: string; nomiKirill: string }[])
      : prisma.mahalla.findMany({ orderBy: { nomiKirill: 'asc' }, select: { id: true, nomiKirill: true } }),
    prisma.user.findMany({
      where: { faol: true, rol: { in: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] }, ...(mahallaId ? { OR: [{ rol: { not: 'YETTILIK' } }, { mahallaId }] } : {}) },
      select: { id: true, fullName: true, rol: true, mahallaId: true },
      orderBy: { fullName: 'asc' },
      take: 300,
    }),
  ]);

  /* "Muddatli" ro'yxatida tartib - eng kechikkani birinchi */
  const tartib = muddatli ? new Map(muddatli.map((x, i) => [x.id, i])) : null;
  const royxat = tartib ? [...royxatHamma].sort((a, b) => (tartib.get(a.id) ?? 0) - (tartib.get(b.id) ?? 0)) : royxatHamma;

  const soni = (h: MurojaatHolati) => sonlari.find((x) => x.holati === h)?._count._all ?? 0;
  const xodimTanlovi: XodimTanlovi[] = xodimlar.map((x) => ({
    id: x.id,
    ism: x.fullName,
    rol: x.rol as XodimTanlovi['rol'],
    mahallaId: x.mahallaId,
  }));

  const chip = (faol: boolean) =>
    `rounded-md border px-3.5 py-2 text-sm transition-colors ${
      faol
        ? 'border-accent bg-accent-soft font-medium text-accent'
        : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
    }`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Мурожаатлар')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Қабул → кўриб чиқиш → жавоб → ёпиш (ҳар ўзгариш тарихга ёзилади)')}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Фуқаро тизимга ўзи ёзмайди: мурожаатни ходим қабулхонада, телефонда ёки уйма-уй юрганда эшитиб қайд этади.')}
        </p>
      </div>

      <details className="karta p-4 sm:p-5">
        <summary className="cursor-pointer text-sm font-semibold text-ink">{tr('Янги мурожаат қайд этиш')}</summary>
        <div className="mt-4">
          <MurojaatForma
            mahallalar={mahallalar.map((m) => ({ id: m.id, nom: tr(m.nomiKirill) }))}
            mahallaId={mahallaId ?? null}
            xodimlar={xodimTanlovi}
            meniId={sessiya.userId}
          />
        </div>
      </details>

      {korsatkich && <MurojaatKorsatkichBlogi k={korsatkich} />}

      <div className="flex flex-wrap gap-2" role="navigation" aria-label={tr('Мурожаатлар ҳолати')}>
        <Link href="/murojaatlar" className={chip(filtr === 'ochiq')}>
          {tr('Очиқ')} ({soni('YANGI') + soni('JARAYONDA')})
        </Link>
        <Link href="/murojaatlar?holat=muddatli" className={chip(filtr === 'muddatli')}>
          {tr('Муддатли')}
        </Link>
        <Link href="/murojaatlar?holat=mening" className={chip(filtr === 'mening')}>
          {tr('Менинг')}
        </Link>
        <Link href="/murojaatlar?holat=javob" className={chip(filtr === 'javob')}>
          {tr('Жавоб берилган')} ({soni('JAVOB_BERILDI')})
        </Link>
        <Link href="/murojaatlar?holat=yopiq" className={chip(filtr === 'yopiq')}>
          {tr('Ёпилган')} ({soni('YOPILDI')})
        </Link>
        <Link href="/murojaatlar?holat=hammasi" className={chip(filtr === 'hammasi')}>
          {tr('Ҳаммаси')}
        </Link>
      </div>

      {royxat.length === 0 ? (
        <div className="karta p-6 text-center text-sm text-ink-muted">{tr('Бу бўлимда мурожаат йўқ.')}</div>
      ) : (
        <ul className="space-y-3">
          {royxat.map((m) => {
            const mh = muddatHolati(m, hozir);
            return (
              <li key={m.id} className="karta p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/murojaatlar/${m.id}`} className="text-sm font-semibold text-ink hover:text-accent">
                      {m.raqami} — {m.murojaatchiNomi}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-muted">{m.tavsif.slice(0, 160)}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {tr(m.mahalla.nomiKirill)} · {tr(KANAL_NOMI[m.kanal])} · {kun(m.qabulVaqti)} · {tr('масъул:')} {m.masul.fullName}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                    {tr(MUROJAAT_HOLATI_NOMI[m.holati])}
                  </span>
                </div>
                <p
                  className={`mt-2 inline-flex items-center gap-1 text-xs ${
                    mh.holat === 'KECHIKKAN' ? 'font-semibold text-danger' : mh.holat === 'BUGUN' || mh.holat === 'YAQIN' ? 'text-warn' : 'text-ink-muted'
                  }`}
                >
                  {(mh.holat === 'KECHIKKAN' || mh.holat === 'BUGUN') && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
                  {tr('Жавоб муддати:')} {kun(m.javobMuddati)}
                  {mh.holat === 'KECHIKKAN' && ` — ${mh.kun} ${tr('кун кечикди')}`}
                  {mh.holat === 'BUGUN' && ` — ${tr('бугун')}`}
                  {mh.holat === 'YAQIN' && ` — ${mh.kun} ${tr('кун қолди')}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <Sahifalash yol="/murojaatlar" joriy={sahifa} jami={jami} hajm={SAHIFA_HAJMI} filtrlar={{ holat: searchParams.holat }} />
    </div>
  );
}
