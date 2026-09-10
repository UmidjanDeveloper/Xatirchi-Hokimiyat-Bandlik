import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { IshsizHolati, Prisma } from '@prisma/client';
import { joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatPhone, percent } from '@/lib/utils';
import { MALUMOT, kirillcha } from '@/lib/constants';
import { HolatNishoni, ISHSIZ_HOLATI, VORONKA } from '@/components/ishsiz/holat-nishoni';

export const metadata = { title: 'Ишсиз фуқаролар' };

const SAHIFA_HAJMI = 30;

export default async function IshsizlarSahifasi({
  searchParams,
}: {
  searchParams: { holati?: string; mahalla?: string; q?: string; sahifa?: string };
}) {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const sahifa = Math.max(1, Number(searchParams.sahifa) || 1);
  const holati = VORONKA.includes(searchParams.holati as IshsizHolati)
    ? (searchParams.holati as IshsizHolati)
    : searchParams.holati === 'RAD_ETDI'
      ? 'RAD_ETDI'
      : undefined;

  const majburiy = mahallaFiltri(sessiya);

  const where: Prisma.UnemployedPersonWhereInput = {
    ...majburiy,
    ...(searchParams.mahalla && !majburiy.mahallaId
      ? { mahallaId: searchParams.mahalla }
      : {}),
    ...(holati ? { holati } : {}),
    ...(searchParams.q
      ? {
          OR: [
            { fish: { contains: searchParams.q, mode: 'insensitive' } },
            { xohlaganIsh: { contains: searchParams.q, mode: 'insensitive' } },
            { mutaxassisligi: { contains: searchParams.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [royxat, jami, bosqichlar, mahallalar] = await Promise.all([
    prisma.unemployedPerson.findMany({
      where,
      orderBy: [{ holati: 'asc' }, { createdAt: 'desc' }],
      skip: (sahifa - 1) * SAHIFA_HAJMI,
      take: SAHIFA_HAJMI,
      select: {
        id: true,
        fish: true,
        holati: true,
        jinsi: true,
        telefon: true,
        malumoti: true,
        xohlaganIsh: true,
        mutaxassisligi: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),
    prisma.unemployedPerson.count({ where }),
    // Voronka - filtrga bog'liq emas, umumiy manzarani ko'rsatadi
    prisma.unemployedPerson.groupBy({
      by: ['holati'],
      where: majburiy,
      _count: true,
    }),
    majburiy.mahallaId
      ? []
      : prisma.mahalla.findMany({
          orderBy: { nomi: 'asc' },
          select: { id: true, nomiKirill: true },
        }),
  ]);

  const bosqichSoni = (h: IshsizHolati) =>
    bosqichlar.find((b) => b.holati === h)?._count ?? 0;
  const jamiFuqaro = bosqichlar.reduce((s, b) => s + b._count, 0);
  const joylashtirilgan = bosqichSoni('JOYLASHTIRILDI') + bosqichSoni('TASDIQLANDI');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">Ишсиз фуқаролар</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Жами {jamiFuqaro} та · жойлаштирилган {joylashtirilgan} та (
          {percent(joylashtirilgan, jamiFuqaro)}%)
        </p>
      </div>

      {/*
        Voronka - platformaning asosiy ko'rsatkichi. Har bosqich
        bosiladigan filtr: rahbar "taklif berilgan 140 kishi" ni
        bosib, darhol ro'yxatni ko'radi.
      */}
      <div className="grid gap-2 sm:grid-cols-5">
        {VORONKA.map((h) => {
          const soni = bosqichSoni(h);
          const faol = holati === h;
          return (
            <Link
              key={h}
              href={faol ? '/ishsizlar' : `/ishsizlar?holati=${h}`}
              className={`karta p-3 transition-colors hover:border-line-strong ${
                faol ? 'border-accent' : ''
              }`}
            >
              <span
                className="block h-1 w-8 rounded-full"
                style={{ background: `var(--step-${ISHSIZ_HOLATI[h].bosqich})` }}
              />
              <p className="raqam mt-2 text-xl font-bold text-ink">{soni}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-ink-faint">
                {ISHSIZ_HOLATI[h].kirill}
              </p>
            </Link>
          );
        })}
      </div>

      {/* ── Filtrlar ── */}
      <form className="karta flex flex-wrap gap-2 p-3" method="get">
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder="Ф.И.Ш., касб ёки йўналиш бўйича қидириш"
          className="min-w-[12rem] flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />

        {mahallalar.length > 0 && (
          <select
            name="mahalla"
            defaultValue={searchParams.mahalla ?? ''}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Барча маҳаллалар</option>
            {mahallalar.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nomiKirill}
              </option>
            ))}
          </select>
        )}

        {holati && <input type="hidden" name="holati" value={holati} />}

        <button
          type="submit"
          className="rounded-md bg-accent-solid px-4 py-2 text-sm font-semibold text-accent-contrast transition-opacity hover:opacity-90"
        >
          Қидириш
        </button>
      </form>

      {/* ── Ro'yxat ── */}
      {royxat.length === 0 ? (
        <div className="karta p-8 text-center text-sm text-ink-muted">
          Шартга мос фуқаро топилмади.
        </div>
      ) : (
        <div className="karta divide-y divide-line">
          {royxat.map((p) => (
            <Link
              key={p.id}
              href={`/ishsizlar/${p.id}`}
              className="flex items-center gap-3 p-3.5 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-surface-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-ink">{p.fish}</span>
                  <HolatNishoni holati={p.holati} />
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-faint">
                  {p.mahalla.nomiKirill} · {p.jinsi === 'Erkak' ? 'Эркак' : 'Аёл'}
                  {p.malumoti ? ` · ${kirillcha(MALUMOT, p.malumoti)}` : ''}
                  {p.xohlaganIsh ? ` · истаги: ${p.xohlaganIsh}` : ''}
                </p>
              </div>
              {p.telefon && (
                <span className="raqam hidden shrink-0 text-xs text-ink-muted sm:block">
                  {formatPhone(p.telefon)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {jami > SAHIFA_HAJMI && (
        <Sahifalash
          sahifa={sahifa}
          jami={jami}
          hajm={SAHIFA_HAJMI}
          searchParams={searchParams}
        />
      )}
    </div>
  );
}

function Sahifalash({
  sahifa,
  jami,
  hajm,
  searchParams,
}: {
  sahifa: number;
  jami: number;
  hajm: number;
  searchParams: Record<string, string | undefined>;
}) {
  const oxirgi = Math.ceil(jami / hajm);
  const yol = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== 'sahifa') p.set(k, v);
    }
    p.set('sahifa', String(n));
    return `/ishsizlar?${p}`;
  };

  return (
    <div className="flex items-center justify-between gap-3">
      {sahifa > 1 ? (
        <Link
          href={yol(sahifa - 1)}
          className="rounded-md border border-line px-3.5 py-2 text-sm text-ink-muted hover:text-ink"
        >
          Олдинги
        </Link>
      ) : (
        <span />
      )}

      <span className="raqam text-xs text-ink-faint">
        {sahifa} / {oxirgi}
      </span>

      {sahifa < oxirgi ? (
        <Link
          href={yol(sahifa + 1)}
          className="rounded-md border border-line px-3.5 py-2 text-sm text-ink-muted hover:text-ink"
        >
          Кейинги
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
