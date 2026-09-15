import { redirect } from 'next/navigation';
import { matnchi } from '@/lib/alifbo-server';
import { joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { XatlovFormasi } from '@/components/xatlov/xatlov-formasi';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Янги хатлов') };
}

export default async function YangiXatlov() {
  const tr = matnchi();

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
        <h1 className="sahifa-sarlavha">{tr('Хонадонни хатловдан ўтказиш')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Камбағал оилаларни хатловдан ўтказиш сўровномаси — 13 бўлим')}
        </p>
      </div>

      <XatlovFormasi mahallalar={mahallalar} />
    </div>
  );
}
