import Link from 'next/link';
import { CalendarClock, Route } from 'lucide-react';
import type { Rol } from '@prisma/client';
import { matnchi } from '@/lib/alifbo-server';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { boshlangichMatn, aloqaMuddati, type BoshlangichManbasi } from '@/lib/oila-rejasi';
import { RejaOchish } from './reja-ochish';

/**
 * Xonadon sahifasidagi "Oilaviy reja" bloki.
 *
 * Reja bo'lsa - unga havola, yo'q bo'lsa - ochish tugmasi
 * (boshlang'ich holat xatlovdan to'ldirilgan).
 *
 * ── Nega xato bu yerda yutiladi ──
 *
 * Bu blok xonadon sahifasining IKKILAMCHI qismi. Asosiy sahifa -
 * xatlov ma'lumoti - ishlab turgan tizimning yuragi va uni shu blok
 * sabab ochilmay qolishi mumkin emas. Reja jadvali bilan muammo
 * bo'lsa, blok yo'q bo'lib qoladi va xato jurnalga yoziladi, xolos.
 */
export async function RejaBlogi({
  rol,
  oila,
}: {
  rol: Rol;
  oila: BoshlangichManbasi & { id: string };
}) {
  /* Hokim oilaviy rejani ko'rmaydi - faqat jamlangan tahlil */
  if (rol === 'HOKIM') return null;
  if (oila.holati === 'QORALAMA') return null;

  const tr = matnchi();

  try {
    const [faol, yopilgan] = await Promise.all([
      prisma.oilaRejasi.findFirst({
        where: { householdId: oila.id, holati: 'FAOL' },
        select: { id: true, maqsad: true, keyingiAloqaSanasi: true },
      }),
      prisma.oilaRejasi.count({ where: { householdId: oila.id, holati: { not: 'FAOL' } } }),
    ]);

    if (faol) {
      const m = aloqaMuddati(faol.keyingiAloqaSanasi, new Date());
      return (
        <section className="karta flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Route className="h-4 w-4 text-accent" aria-hidden="true" />
              {tr('Оилавий ривожланиш режаси амалда')}
            </p>
            {faol.maqsad && <p className="mt-1 text-xs text-ink-muted">{faol.maqsad}</p>}
            {faol.keyingiAloqaSanasi && (
              <p
                className={`mt-1 flex items-center gap-1.5 text-xs ${
                  m === 'otgan' ? 'font-semibold text-danger' : 'text-ink-faint'
                }`}
              >
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                {tr('Кейинги алоқа:')} {formatDate(faol.keyingiAloqaSanasi).split(',')[0]}
                {m === 'otgan' && ` — ${tr('муддати ўтган')}`}
              </p>
            )}
          </div>
          <Link href={`/rejalar/${faol.id}`} className="tugma-asosiy min-h-11 rounded-md px-4 py-2.5 text-sm font-semibold">
            {tr('Режани очиш')}
          </Link>
        </section>
      );
    }

    const b = boshlangichMatn(oila);
    return (
      <section className="space-y-2">
        <RejaOchish
          householdId={oila.id}
          matn={b.matn}
          manba={b.manba}
          sana={b.sana.toISOString()}
        />
        {yopilgan > 0 && (
          <p className="text-xs text-ink-faint">
            {tr('Илгари ёпилган режалар:')} {yopilgan} ·{' '}
            <Link href="/rejalar?holat=hammasi" className="text-accent hover:underline">
              {tr('кўриш')}
            </Link>
          </p>
        )}
      </section>
    );
  } catch (e) {
    console.error('Oilaviy reja blokini yuklab bo‘lmadi:', e);
    return null;
  }
}
