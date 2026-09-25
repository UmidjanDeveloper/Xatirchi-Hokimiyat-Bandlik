import { notFound, redirect } from 'next/navigation';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { joriySessiya, mahallaFiltri, mahallagaRuxsat } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { xatlovniYukla } from '@/lib/xatlov-yuklash';
import { XatlovFormasi } from '@/components/xatlov/xatlov-formasi';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Хатловни таҳрирлаш') };
}

export default async function TahrirSahifasi({ params }: { params: { id: string } }) {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  /*
   * ── РОЛ ҚЎРИҚЧИСИ ──
   *
   * Менюда бу саҳифа кўринмаслиги ЕТАРЛИ ЭМАС: манзилни
   * қўлда ёзиб очиш мумкин. Middleware эса фақат «сессия
   * борми» деб қарайди — у ҳимоя эмас, йўналтирувчи.
   *
   * Қоида `navigatsiya.ts` даги МЕНЮ рўйхатидан ўқилади,
   * яъни менюда ким кўрса — шу очади. Иккита рўйхат
   * бўлганда бири эскириб қоларди.
   */
  if (!yolgaRuxsat(sessiya.rol, '/xatlov')) redirect(boshSahifa(sessiya.rol));

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
        <h1 className="sahifa-sarlavha">
          {xatlov.holati === 'QORALAMA' ? tr('Қоралама — давом эттириш') : tr('Хатловни таҳрирлаш')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{xatlov.holat.oilaBoshligi}</p>
      </div>

      <XatlovFormasi mahallalar={mahallalar} boshlangich={{ id: xatlov.id, holat: xatlov.holat }} />
    </div>
  );
}
