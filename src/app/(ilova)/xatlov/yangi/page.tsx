import { redirect } from 'next/navigation';
import { joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { XatlovFormasi } from '@/components/xatlov/xatlov-formasi';

export const metadata = { title: 'Янги хатлов' };

export default async function YangiXatlov() {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const filtr = mahallaFiltri(sessiya);
  const mahallalar = await prisma.mahalla.findMany({
    where: filtr.mahallaId ? { id: filtr.mahallaId } : undefined,
    orderBy: { nomi: 'asc' },
    select: { id: true, nomi: true, nomiKirill: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Хонадонни хатловдан ўтказиш</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Камбағал оилаларни хатловдан ўтказиш сўровномаси — 11 бўлим
        </p>
      </div>

      <XatlovFormasi mahallalar={mahallalar} />
    </div>
  );
}
