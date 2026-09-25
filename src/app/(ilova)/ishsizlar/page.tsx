import Link from 'next/link';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { redirect } from 'next/navigation';
import type { IshsizHolati, Prisma } from '@prisma/client';
import { joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatPhone, percent } from '@/lib/utils';
import { MALUMOT, kirillcha } from '@/lib/constants';
import { HolatNishoni } from '@/components/ishsiz/holat-nishoni';
import { ISHSIZ_HOLATI, VORONKA } from '@/lib/ishsiz-holati';
import { SahifaHisoboti } from '@/components/panel/sahifa-hisoboti';
import { UZOQ_ISHSIZ, ishsizlikOylari, muddatMatni, uzoqIshsizmi } from '@/lib/uzoq-ishsizlik';
import { MUSTAHKAMLASH_KUN } from '@/lib/chora-yaratish';

/** Мустаҳкамлаш текшируви қачондан кечикади */
function tekshiruvChegarasi(): Date {
  const d = new Date();
  d.setDate(d.getDate() - MUSTAHKAMLASH_KUN);
  return d;
}

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Ишсиз фуқаролар') };
}

const SAHIFA_HAJMI = 30;

export default async function IshsizlarSahifasi({
  searchParams,
}: {
  searchParams: {
    holati?: string;
    mahalla?: string;
    q?: string;
    sahifa?: string;
    /** `1` — фақат 12 ойдан ошиб ишсиз юрганлар */
    uzoq?: string;
    /** `1` — мустаҳкамлаш текшируви кечиккандар */
    tekshiruv?: string;
  };
}) {
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
  if (!yolgaRuxsat(sessiya.rol, '/ishsizlar')) redirect(boshSahifa(sessiya.rol));

  const sahifa = Math.max(1, Number(searchParams.sahifa) || 1);
  const holati = VORONKA.includes(searchParams.holati as IshsizHolati)
    ? (searchParams.holati as IshsizHolati)
    : searchParams.holati === 'RAD_ETDI'
      ? 'RAD_ETDI'
      : undefined;

  const majburiy = mahallaFiltri(sessiya);

  /*
   * ── ҚЎШИМЧА КЕСИМЛАР ──
   *
   * Иккови ҳам панелдаги рақамдан келади: ҳоким рақамни босса,
   * АЙНАН ўша одамлар рўйхати очилиши керак. Илгари рақам
   * ҳисобланарди-ю, унга босиб бўлмасди.
   */
  const uzoqmi = searchParams.uzoq === '1';
  const tekshiruvmi = searchParams.tekshiruv === '1';

  const where: Prisma.UnemployedPersonWhereInput = {
    ...majburiy,
    ...(uzoqmi ? UZOQ_ISHSIZ() : {}),
    ...(tekshiruvmi
      ? { holati: 'JOYLASHTIRILDI', ishgaKirganSana: { lte: tekshiruvChegarasi() } }
      : {}),
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
        /* Узоқ муддатли ишсизлик матнини ёзиш учун */
        ishdanBoshaganSana: true,
        ishgaKirganSana: true,
        household: { select: { ishsizlikMuddatiOy: true } },
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Ишсиз фуқаролар')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {tr('Жами')} {jamiFuqaro} {tr('та · жойлаштирилган')} {joylashtirilgan} {tr('та (')}
            {percent(joylashtirilgan, jamiFuqaro)}%)
          </p>
        </div>
        <SahifaHisoboti malumotBormi={jamiFuqaro > 0} />
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
              className={`karta karta-bosiladigan p-3 ${
                faol ? 'border-accent' : ''
              }`}
            >
              <span
                className="block h-1 w-8 rounded-full"
                style={{ background: `var(--step-${ISHSIZ_HOLATI[h].bosqich})` }}
              />
              <p className="raqam mt-2 text-xl font-bold text-ink">{soni}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-ink-faint">
                {tr(ISHSIZ_HOLATI[h].kirill)}
              </p>
            </Link>
          );
        })}
      </div>

      {/*
        ── ВОРОНКАДАН ТАШҚАРИДАГИ ИККИ КЕСИМ ──

        Воронка олдинга юрганларни кўрсатади. Бу иккови эса
        ТИҚИЛИБ ҚОЛГАНЛАРНИ: 12 ойдан ошиб иш тополмаётганлар
        ва жойлаштирилгани 3 ойдан ошган-у ишда қолгани
        тасдиқланмаганлар.
      */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={uzoqmi ? '/ishsizlar' : '/ishsizlar?uzoq=1'}
          className={`karta karta-bosiladigan flex items-center justify-between gap-3 p-3 ${
            uzoqmi ? 'border-accent' : ''
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">{tr('12 ойдан ошиб ишсиз')}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-ink-faint">
              {tr('Энг заиф гуруҳ — ўз-ўзидан ишга жойлашиш эҳтимоли энг паст. Аввал шулар чақирилсин.')}
            </p>
          </div>
          {uzoqmi && (
            <span className="raqam shrink-0 text-lg font-bold text-warn">{jami}</span>
          )}
        </Link>

        <Link
          href={tekshiruvmi ? '/ishsizlar' : '/ishsizlar?tekshiruv=1'}
          className={`karta karta-bosiladigan flex items-center justify-between gap-3 p-3 ${
            tekshiruvmi ? 'border-accent' : ''
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">{tr('Мустаҳкамлаш текшируви')}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-ink-faint">
              {tr('Жойлаштирилгани 3 ойдан ошди, аммо ишда қолгани ҳали тасдиқланмаган.')}
            </p>
          </div>
          {tekshiruvmi && (
            <span className="raqam shrink-0 text-lg font-bold text-warn">{jami}</span>
          )}
        </Link>
      </div>

      {/* ── Filtrlar ── */}
      <form className="karta flex flex-wrap gap-2 p-3" method="get">
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder={tr("Ф.И.Ш., касб ёки йўналиш бўйича қидириш")}
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

        {holati && <input type="hidden" name="holati" value={holati} />}

        <button
          type="submit"
          className="tugma-asosiy rounded-md px-4 py-2 text-sm font-semibold"
        >
          {tr('Қидириш')}
        </button>
      </form>

      {/* ── Ro'yxat ── */}
      {royxat.length === 0 ? (
        <div className="karta p-8 text-center text-sm text-ink-muted">
          {tr('Шартга мос фуқаро топилмади.')}
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
                  <span className="truncate font-medium text-ink">{tr(p.fish)}</span>
                  <HolatNishoni holati={p.holati} />
                  {/*
                    Узоқ муддатли ишсизлик НИШОНИ. Рўйхатда икки
                    ойлик ишсиз билан тўрт йиллик ишсиз бир хил
                    кўринарди — ҳолбуки уларга бир хил чора
                    ярамайди.
                  */}
                  {uzoqIshsizmi(p) && (
                    <span className="rounded bg-warn-bg px-1.5 py-0.5 text-[10px] font-semibold text-warn">
                      {tr(muddatMatni(ishsizlikOylari(p)))}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-faint">
                  {tr(p.mahalla.nomiKirill)} · {p.jinsi === 'Erkak' ? tr('Эркак') : tr('Аёл')}
                  {p.malumoti ? ` · ${tr(kirillcha(MALUMOT, p.malumoti))}` : ''}
                  {p.xohlaganIsh ? tr(` · истаги: ${p.xohlaganIsh}`) : ''}
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
  const tr = matnchi();

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
          {tr('Олдинги')}
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
          {tr('Кейинги')}
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
