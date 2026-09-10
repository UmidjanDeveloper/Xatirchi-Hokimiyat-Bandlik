import { notFound, redirect } from 'next/navigation';
import { joriySessiya, mahallaFiltri, mahallagaRuxsat } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { xatlovniYukla } from '@/lib/xatlov-yuklash';
import { XatlovFormasi } from '@/components/xatlov/xatlov-formasi';

export const metadata = { title: 'Хатловни таҳрирлаш' };

export default async function TahrirSahifasi({ params }: { params: { id: string } }) {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const xatlov = await xatlovniYukla(params.id);
  if (!xatlov) notFound();

  if (!mahallagaRuxsat(sessiya, xatlov.mahallaId)) {
    redirect('/xatlov');
  }

  // Tasdiqlangan xatlovni yettilik a'zosi tahrirlay olmaydi
  if (xatlov.holati === 'TASDIQLANGAN' && sessiya.rol === 'YETTILIK') {
    redirect(`/xatlov/${params.id}`);
  }

  const filtr = mahallaFiltri(sessiya);
  const mahallalar = await prisma.mahalla.findMany({
    where: filtr.mahallaId ? { id: filtr.mahallaId } : undefined,
    orderBy: { nomi: 'asc' },
    select: { id: true, nomi: true, nomiKirill: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">
          {xatlov.holati === 'QORALAMA' ? 'Қоралама — давом эттириш' : 'Хатловни таҳрирлаш'}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{xatlov.holat.oilaBoshligi}</p>
      </div>

      <XatlovFormasi mahallalar={mahallalar} boshlangich={{ id: xatlov.id, holat: xatlov.holat }} />
    </div>
  );
}
