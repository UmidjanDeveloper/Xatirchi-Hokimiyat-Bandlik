import { redirect } from 'next/navigation';
import { matnchi } from '@/lib/alifbo-server';
import { joriySessiya } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { XodimBoshqaruvi } from '@/components/admin/xodim-boshqaruvi';
import { SahifaHisoboti } from '@/components/panel/sahifa-hisoboti';

export function generateMetadata() {
  return { title: matnchi()('Маҳалла ходимлари') };
}

/**
 * ============================================================
 *  MAHALLA XODIMLARI — bandlik markazi rahbari uchun
 *
 *  Administrator paneli butun tizimni boshqaradi: hokim, markaz
 *  rahbari, admin hisoblari ham shu yerda. Bandlik rahbariga
 *  esa bu kerak emas va xavfli - unga faqat MAHALLA hisoblari
 *  ochiladi.
 *
 *  Nega alohida sahifa? Rahbarga har kuni kerak bo'ladigan ish
 *  shu: rais almashdi, telefoni o'zgardi, parolini unutdi.
 *  Buning uchun har safar administratorga murojaat qilish
 *  tuman sharoitida bir necha kunga cho'ziladi.
 *
 *  Cheklov SERVERDA turadi: `/api/admin/xodimlar` ichida rol
 *  tekshiriladi. Bu sahifa faqat ko'rinishni soddalashtiradi.
 * ============================================================
 */
export default async function MahallaXodimlariSahifasi() {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (sessiya.rol !== 'BANDLIK_RAHBAR' && sessiya.rol !== 'ADMIN') redirect('/');

  const [xodimlar, mahallalar] = await Promise.all([
    prisma.user.findMany({
      // Faqat mahalla hisoblari - boshqa rollar bu yerda ko'rinmaydi
      where: { rol: 'YETTILIK' },
      orderBy: [{ faol: 'desc' }, { username: 'asc' }],
      select: {
        id: true,
        username: true,
        fullName: true,
        position: true,
        phone: true,
        rol: true,
        faol: true,
        parolAlmashtirilsin: true,
        oxirgiKirish: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),
    prisma.mahalla.findMany({
      orderBy: { nomi: 'asc' },
      select: { id: true, nomi: true, nomiKirill: true },
    }),
  ]);

  const faolSoni = xodimlar.filter((x) => x.faol).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Маҳалла ходимлари')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {faolSoni} {tr('фаол ҳисоб ·')} {mahallalar.length} {tr('та МФЙ')}
          </p>
        </div>
        <SahifaHisoboti />
      </div>

      <div className="karta p-4 text-xs leading-relaxed text-ink-muted sm:p-5">
        <p>
          {tr('Бу ерда фақат маҳалла еттилиги ҳисоблари кўринади. Ҳоким, марказ ва администратор ҳисоблари администратор панелида бошқарилади.')}
        </p>
        <p className="mt-2">
          {tr('Янги ҳисоб очилганда тизим паролни ўзи яратади. Уни кейин ҳам рўйхатдаги калит тугмаси орқали кўриш мумкин. Ходим ўзи алмаштирса, тизим парол ўрнига шу ҳақда ёзади.')}
        </p>
      </div>

      <XodimBoshqaruvi xodimlar={xodimlar} mahallalar={mahallalar} faqatYettilik />
    </div>
  );
}
