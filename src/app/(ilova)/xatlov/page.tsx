import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, HousePlus, TriangleAlert, Users } from 'lucide-react';
import { joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatDate, percent } from '@/lib/utils';

export const metadata = { title: 'Хатловларим' };

const HOLAT_NISHONI: Record<string, { matn: string; sinf: string }> = {
  QORALAMA: { matn: 'Қоралама', sinf: 'bg-warn-bg text-warn' },
  YUBORILGAN: { matn: 'Юборилган', sinf: 'bg-info-bg text-info' },
  TASDIQLANGAN: { matn: 'Тасдиқланган', sinf: 'bg-ok-bg text-ok' },
};

export default async function XatlovlarSahifasi() {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const filtr = mahallaFiltri(sessiya);

  const [xatlovlar, mahalla] = await Promise.all([
    prisma.household.findMany({
      where: {
        ...filtr,
        // Yettilik a'zosi o'z mahallasidagi barcha xatlovni ko'radi,
        // lekin qoralamalar faqat o'ziniki bo'ladi - boshqa a'zoning
        // tugallanmagan ishini ko'rsatishning ma'nosi yo'q.
        ...(sessiya.rol === 'YETTILIK'
          ? { OR: [{ holati: { not: 'QORALAMA' } }, { xodimId: sessiya.userId }] }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        holati: true,
        manzil: true,
        oilaBoshligi: true,
        jamiAzo: true,
        ishsizlarSoni: true,
        updatedAt: true,
        mahalla: { select: { nomiKirill: true } },
        xodim: { select: { fullName: true } },
        _count: { select: { ishsizlar: true } },
      },
    }),
    filtr.mahallaId
      ? prisma.mahalla.findUnique({
          where: { id: filtr.mahallaId },
          select: { nomiKirill: true, xonadon: true, ishsiz: true },
        })
      : null,
  ]);

  const yuborilgan = xatlovlar.filter((x) => x.holati !== 'QORALAMA');
  const qoralamalar = xatlovlar.filter((x) => x.holati === 'QORALAMA');
  const topilganIshsiz = yuborilgan.reduce((s, x) => s + x.ishsizlarSoni, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Хатловлар</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {mahalla ? `${mahalla.nomiKirill} МФЙ` : 'Барча маҳаллалар'}
          </p>
        </div>
        <Link
          href="/xatlov/yangi"
          className="flex items-center gap-1.5 rounded-md bg-accent-solid px-4 py-2.5 text-sm font-semibold text-accent-contrast transition-opacity hover:opacity-90"
        >
          <HousePlus className="h-4 w-4" />
          Янги хатлов
        </Link>
      </div>

      {/*
        Qamrov ko'rsatkichi - yettilik a'zosi o'z ishining qayerda
        turganini ko'rishi kerak. "38 ta xonadon" degan raqam yolg'iz
        hech narsa aytmaydi; "506 tadan 38 tasi" esa aytadi.
      */}
      {mahalla && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Karta
            ikonka={<FileText className="h-4 w-4" />}
            nomi="Хатловдан ўтган хонадон"
            qiymat={`${yuborilgan.length} / ${mahalla.xonadon}`}
            izoh={`${percent(yuborilgan.length, mahalla.xonadon)}% қамров`}
          />
          <Karta
            ikonka={<Users className="h-4 w-4" />}
            nomi="Аниқланган ишсиз"
            qiymat={`${topilganIshsiz} / ${mahalla.ishsiz}`}
            izoh={`Рўйхатда ${mahalla.ishsiz} та`}
          />
          <Karta
            ikonka={<TriangleAlert className="h-4 w-4" />}
            nomi="Тугалланмаган қоралама"
            qiymat={String(qoralamalar.length)}
            izoh={qoralamalar.length > 0 ? 'Тугатиб юборинг' : 'Ҳаммаси юборилган'}
          />
        </div>
      )}

      {xatlovlar.length === 0 ? (
        <div className="karta p-8 text-center">
          <p className="text-sm text-ink-muted">Ҳали бирорта хатлов киритилмаган.</p>
          <Link
            href="/xatlov/yangi"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent-solid px-4 py-2.5 text-sm font-semibold text-accent-contrast"
          >
            <HousePlus className="h-4 w-4" />
            Биринчи хатловни бошлаш
          </Link>
        </div>
      ) : (
        <div className="karta divide-y divide-line">
          {xatlovlar.map((x) => {
            const nishon = HOLAT_NISHONI[x.holati];
            return (
              <Link
                key={x.id}
                href={x.holati === 'QORALAMA' ? `/xatlov/${x.id}/tahrir` : `/xatlov/${x.id}`}
                className="flex items-center gap-3 p-3.5 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-ink">{x.oilaBoshligi}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${nishon.sinf}`}
                    >
                      {nishon.matn}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-faint">
                    {x.manzil} · {x.mahalla.nomiKirill}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="raqam text-xs text-ink-muted">
                    {x.jamiAzo} киши
                    {x.ishsizlarSoni > 0 && (
                      <span className="text-warn"> · {x.ishsizlarSoni} ишсиз</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{formatDate(x.updatedAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Karta({
  ikonka,
  nomi,
  qiymat,
  izoh,
}: {
  ikonka: React.ReactNode;
  nomi: string;
  qiymat: string;
  izoh: string;
}) {
  return (
    <div className="karta p-4">
      <div className="flex items-center gap-2 text-ink-faint">
        {ikonka}
        <span className="text-xs font-medium">{nomi}</span>
      </div>
      <p className="raqam mt-2 text-2xl font-bold text-ink">{qiymat}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>
    </div>
  );
}
