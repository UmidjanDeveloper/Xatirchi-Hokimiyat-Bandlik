import Link from 'next/link';
import { matnchi } from '@/lib/alifbo-server';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { bandlikIshi, mahallaFiltri } from '@/lib/auth';
import { joriyXodim } from '@/lib/sahifa-auth';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { SahifaHisoboti } from '@/components/panel/sahifa-hisoboti';
import { Sahifalash } from '@/components/shared/sahifalash';
import { sahifaChegarasi, sahifaRaqami, sahifaniTuzat } from '@/lib/sahifalash';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Хонадонлар') };
}

const SAHIFA_HAJMI = 30;

const HOLAT: Record<string, { matn: string; sinf: string }> = {
  QORALAMA: { matn: 'Қоралама', sinf: 'bg-warn-bg text-warn' },
  YUBORILGAN: { matn: 'Юборилган', sinf: 'bg-info-bg text-info' },
  TASDIQLANGAN: { matn: 'Тасдиқланган', sinf: 'bg-ok-bg text-ok' } };

export default async function XonadonlarSahifasi({
  searchParams }: {
  searchParams: { mahalla?: string; q?: string; sahifa?: string };
}) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!bandlikIshi(sessiya.rol)) redirect('/');

  const majburiy = mahallaFiltri(sessiya);
  /* Qidiruv matni cheklanadi: bir necha KB li so'rov bazaga yuborilmasin */
  const qidiruv = (searchParams.q ?? '').trim().slice(0, 100);

  const where: Prisma.HouseholdWhereInput = {
    ...majburiy,
    ...(searchParams.mahalla && !majburiy.mahallaId
      ? { mahallaId: searchParams.mahalla }
      : {}),
    ...(qidiruv
      ? {
          OR: [
            { oilaBoshligi: { contains: qidiruv, mode: 'insensitive' } },
            { manzil: { contains: qidiruv, mode: 'insensitive' } },
          ] }
      : {}) };

  /*
   * Avval jami, keyin sahifa: raqam jamidan oshsa (eski havola, qisqargan
   * natija) oxirgi sahifaga tushadi, "mos xonadon topilmadi" deb yolg'on aytilmaydi.
   */
  const jami = await prisma.household.count({ where });
  const sahifa = sahifaniTuzat(sahifaRaqami(searchParams.sahifa), jami, SAHIFA_HAJMI);

  const [royxat, mahallalar] = await Promise.all([
    prisma.household.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      ...sahifaChegarasi(sahifa, SAHIFA_HAJMI),
      select: {
        id: true,
        holati: true,
        manzil: true,
        oilaBoshligi: true,
        jamiAzo: true,
        ishsizlarSoni: true,
        updatedAt: true,
        mahalla: { select: { nomiKirill: true } },
        xodim: { select: { fullName: true } } } }),
    majburiy.mahallaId
      ? []
      : prisma.mahalla.findMany({
          orderBy: { nomi: 'asc' },
          select: { id: true, nomiKirill: true } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Хонадонлар')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{jami} {tr('та хатлов')}</p>
        </div>
        <SahifaHisoboti malumotBormi={jami > 0} />
      </div>

      <form className="karta flex flex-wrap gap-2 p-3" method="get">
        <input
          type="search"
          name="q"
          defaultValue={qidiruv}
          placeholder={tr("Оила бошлиғи ёки манзил бўйича қидириш")}
          className="min-w-[12rem] flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        {mahallalar.length > 0 && (
          <select
            name="mahalla"
            defaultValue={searchParams.mahalla ?? ''}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">{tr('Барча маҳаллалар')}</option>
            {mahallalar.map((m) => (
              <option key={m.id} value={m.id}>
                {tr(m.nomiKirill)}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="tugma-asosiy rounded-md px-4 py-2 text-sm font-semibold"
        >
          {tr('Қидириш')}
        </button>
      </form>

      {royxat.length === 0 ? (
        <div className="karta p-8 text-center text-sm text-ink-muted">
          {tr('Шартга мос хонадон топилмади.')}
        </div>
      ) : (
        <div className="karta divide-y divide-line">
          {royxat.map((x) => (
            <Link
              key={x.id}
              href={`/xatlov/${x.id}`}
              className="flex items-center gap-3 p-3.5 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-surface-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-ink">{tr(x.oilaBoshligi)}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${HOLAT[x.holati].sinf}`}
                  >
                    {tr(HOLAT[x.holati].matn)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-faint">
                  {x.manzil} · {tr(x.mahalla.nomiKirill)} · {tr(x.xodim.fullName)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="raqam text-xs text-ink-muted">
                  {x.jamiAzo} {tr('киши')}
                  {x.ishsizlarSoni > 0 && (
                    <span className="text-warn"> · {x.ishsizlarSoni} {tr('ишсиз')}</span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-faint">
                  {formatDate(x.updatedAt).split(',')[0]}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Sahifalash
        yol="/xonadonlar"
        joriy={sahifa}
        jami={jami}
        hajm={SAHIFA_HAJMI}
        filtrlar={{ q: qidiruv || undefined, mahalla: searchParams.mahalla }}
      />
    </div>
  );
}
