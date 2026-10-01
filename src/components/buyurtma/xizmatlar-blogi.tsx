import Link from 'next/link';
import { HandHelping } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import {
  BUYURTMA_HOLATI_NOMI,
  PLATFORMA_OGOHLANTIRISHI,
  TASDIQ_NOMI,
  buyurtmaTasdigi,
} from '@/lib/buyurtmalar';
import { XizmatBoshqaruvi } from './xizmat-boshqaruvi';
import { XizmatQoshish } from './xizmat-qoshish';

const kun = (d: Date) => formatDate(d).split(',')[0];

/**
 * Fuqaroning mahalliy xizmat takliflari va ular bo'yicha buyurtmalar.
 *
 * Xato bu yerda yutiladi: bu ikkilamchi blok, fuqaro sahifasi buyurtma
 * jadvali sabab ochilmay qolmasligi kerak.
 */
export async function XizmatlarBlogi({ ishsizId }: { ishsizId: string }) {
  const tr = matnchi();

  try {
    const takliflar = await prisma.xizmatTaklifi.findMany({
      where: { ishsizId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        nomi: true,
        tavsif: true,
        taxminiyNarx: true,
        rozilik: true,
        roziligiUsuli: true,
        roziligiSana: true,
        faol: true,
        buyurtmalar: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            holati: true,
            buyurtmachiNomi: true,
            tavsif: true,
            kelishilganNarx: true,
            ijrochiTasdigi: true,
            buyurtmachiTasdigi: true,
          },
        },
      },
    });

    return (
      <section className="karta space-y-3 p-4 sm:p-5" aria-labelledby="xb-sarlavha">
        <div>
          <h2 id="xb-sarlavha" className="flex items-center gap-2 text-sm font-bold text-ink">
            <HandHelping className="h-4 w-4 text-accent" aria-hidden="true" />
            {tr('Маҳаллий хизматлар (пилот)')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">{tr(PLATFORMA_OGOHLANTIRISHI)}</p>
        </div>

        {takliflar.length > 0 && (
          <ul className="space-y-3">
            {takliflar.map((t) => (
              <li key={t.id} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t.nomi}</p>
                    {t.tavsif && <p className="mt-0.5 text-xs text-ink-muted">{t.tavsif}</p>}
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {t.taxminiyNarx !== null
                        ? `${tr('Тахминий нарх:')} ${Number(t.taxminiyNarx).toLocaleString('ru-RU').replace(/ /g, ' ')} ${tr('сўм')}`
                        : tr('Нарх келишилади')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] font-semibold">
                    <span className="rounded bg-surface-muted px-1.5 py-0.5 text-ink-muted">
                      {t.faol ? tr('Фаол') : tr('Ёпилган')}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 ${t.rozilik ? 'bg-surface-muted text-ink-muted' : 'bg-warn-bg text-warn'}`}>
                      {t.rozilik ? tr('Розилик бор') : tr('Розилик йўқ — тайинланмайди')}
                    </span>
                  </div>
                </div>

                {t.rozilik && t.roziligiSana && (
                  <p className="mt-1 text-xs text-ink-faint">
                    {tr('Розилик:')} {kun(t.roziligiSana)}
                    {t.roziligiUsuli ? ` · ${t.roziligiUsuli === 'OGZAKI' ? tr('оғзаки') : t.roziligiUsuli === 'TELEFON' ? tr('телефон') : tr('ёзма')}` : ''}
                  </p>
                )}

                {t.buyurtmalar.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-line pt-2">
                    {t.buyurtmalar.map((b) => (
                      <li key={b.id} className="text-xs text-ink-muted">
                        <Link href={`/buyurtmalar/${b.id}`} className="font-medium text-ink hover:text-accent">
                          {b.buyurtmachiNomi}: {b.tavsif.slice(0, 50)}
                        </Link>{' '}
                        — {tr(BUYURTMA_HOLATI_NOMI[b.holati])}
                        {b.holati === 'BAJARILDI' && ` · ${tr(TASDIQ_NOMI[buyurtmaTasdigi(b)])}`}
                      </li>
                    ))}
                  </ul>
                )}

                <XizmatBoshqaruvi id={t.id} rozilik={t.rozilik} faol={t.faol} />
              </li>
            ))}
          </ul>
        )}

        <XizmatQoshish ishsizId={ishsizId} />
      </section>
    );
  } catch (e) {
    console.error('Xizmatlar blokini yuklab bo‘lmadi:', e);
    return null;
  }
}
