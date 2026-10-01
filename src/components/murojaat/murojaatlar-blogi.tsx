import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { KANAL_NOMI, MUROJAAT_HOLATI_NOMI, muddatHolati } from '@/lib/murojaatlar';
import { MurojaatForma, type MahallaTanlovi, type XodimTanlovi } from './murojaat-forma';

const kun = (d: Date) => formatDate(d).split(',')[0];

/**
 * Fuqaroning murojaatlari: ro'yxat va yangisini qayd etish (fuqaro va uning
 * mahallasi qat'iy).
 *
 * Xato bu yerda yutiladi: bu ikkilamchi blok, fuqaro sahifasi murojaat
 * jadvali sabab ochilmay qolmasligi kerak.
 */
export async function MurojaatlarBlogi({
  ishsiz,
  meniId,
}: {
  ishsiz: { id: string; fish: string; telefon: string | null; mahallaId: string };
  meniId: string;
}) {
  const tr = matnchi();

  try {
    const hozir = new Date();
    const [royxat, xodimlar, mahalla] = await Promise.all([
      prisma.murojaat.findMany({
        where: { ishsizId: ishsiz.id },
        orderBy: { qabulVaqti: 'desc' },
        take: 10,
        select: {
          id: true,
          raqami: true,
          holati: true,
          kanal: true,
          tavsif: true,
          qabulVaqti: true,
          javobMuddati: true,
        },
      }),
      prisma.user.findMany({
        where: {
          faol: true,
          OR: [{ rol: { in: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] } }, { rol: 'YETTILIK', mahallaId: ishsiz.mahallaId }],
        },
        select: { id: true, fullName: true, rol: true, mahallaId: true },
        orderBy: { fullName: 'asc' },
        take: 200,
      }),
      prisma.mahalla.findUnique({ where: { id: ishsiz.mahallaId }, select: { id: true, nomiKirill: true } }),
    ]);

    const xodimTanlovi: XodimTanlovi[] = xodimlar
      .filter((x) => x.rol !== 'HOKIM')
      .map((x) => ({
        id: x.id,
        ism: x.fullName,
        rol: x.rol as XodimTanlovi['rol'],
        mahallaId: x.mahallaId,
      }));
    const mahallalar: MahallaTanlovi[] = mahalla ? [{ id: mahalla.id, nom: tr(mahalla.nomiKirill) }] : [];

    return (
      <section className="karta space-y-3 p-4 sm:p-5" aria-labelledby="mb-sarlavha">
        <h2 id="mb-sarlavha" className="flex items-center gap-2 text-sm font-bold text-ink">
          <MessageSquareText className="h-4 w-4 text-accent" aria-hidden="true" />
          {tr('Мурожаатлар')}
        </h2>

        {royxat.length > 0 && (
          <ul className="space-y-2">
            {royxat.map((m) => {
              const mh = muddatHolati(m, hozir);
              return (
                <li key={m.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link href={`/murojaatlar/${m.id}`} className="font-semibold text-ink hover:text-accent">
                      {m.raqami}
                    </Link>
                    <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                      {tr(MUROJAAT_HOLATI_NOMI[m.holati])}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{m.tavsif.slice(0, 120)}</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {tr(KANAL_NOMI[m.kanal])} · {kun(m.qabulVaqti)} · {tr('муддат')} {kun(m.javobMuddati)}
                    {mh.holat === 'KECHIKKAN' && ` · ${mh.kun} ${tr('кун кечикди')}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <details>
          <summary className="cursor-pointer text-sm font-medium text-accent">{tr('Мурожаат қайд этиш')}</summary>
          <div className="mt-3">
            <MurojaatForma
              mahallalar={mahallalar}
              mahallaId={ishsiz.mahallaId}
              xodimlar={xodimTanlovi}
              meniId={meniId}
              ishsiz={{ id: ishsiz.id, fish: ishsiz.fish, telefon: ishsiz.telefon }}
            />
          </div>
        </details>
      </section>
    );
  } catch (e) {
    console.error('Murojaatlar blokini yuklab bo‘lmadi:', e);
    return null;
  }
}
