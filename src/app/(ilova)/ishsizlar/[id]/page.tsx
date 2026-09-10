import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { House, Phone } from 'lucide-react';
import { joriySessiya, bandlikIshi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jurnal } from '@/lib/api-auth';
import { formatDate, formatPhone } from '@/lib/utils';
import { BANDLIK_TAKLIFI, MALUMOT, MASUL_TASHKILOT, kirillcha } from '@/lib/constants';
import { HolatNishoni, ISHSIZ_HOLATI, VORONKA } from '@/components/ishsiz/holat-nishoni';
import { SuhbatFormasi, type SuhbatHolati } from '@/components/ishsiz/suhbat-formasi';
import { ChoraQoshish } from '@/components/chora/chora-qoshish';

export const metadata = { title: 'Ишсиз фуқаро' };

/** `Date` ni `<input type="date">` kutgan `YYYY-MM-DD` ko'rinishiga keltiradi */
const sana = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : '');

export default async function IshsizSahifasi({ params }: { params: { id: string } }) {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const p = await prisma.unemployedPerson.findUnique({
    where: { id: params.id },
    include: {
      mahalla: { select: { nomiKirill: true } },
      household: { select: { id: true, manzil: true, oilaBoshligi: true } },
      mutaxassis: { select: { fullName: true } },
      topshiriqlar: { orderBy: { muddat: 'asc' } },
    },
  });

  if (!p) notFound();

  // Yettilik a'zosi shaxsiy anketani ko'rmaydi: unda tashxis va
  // ish tajribasi kabi ma'lumot bor, u esa faqat xatlov qiladi.
  if (!bandlikIshi(sessiya.rol) && sessiya.rol !== 'HOKIM') {
    redirect('/xatlov');
  }

  await jurnal(sessiya.userId, 'KORISH', {
    obyektTuri: 'UnemployedPerson',
    obyektId: p.id,
  });

  const boshlangich: SuhbatHolati = {
    fish: p.fish,
    telefon: p.telefon ?? '',
    jinsi: p.jinsi,
    oilaviyHolat: p.oilaviyHolat,
    farzandlarSoni: p.farzandlarSoni ?? '',
    millati: p.millati ?? '',
    tugilganSana: sana(p.tugilganSana),
    malumoti: p.malumoti,
    mutaxassisligi: p.mutaxassisligi ?? '',
    sogliqHolati: p.sogliqHolati ?? '',
    nogironlik: p.nogironlik,
    nogironlikGuruhi: p.nogironlikGuruhi,
    yashashManzili: p.yashashManzili ?? '',

    kasbHunarEhtiyoji: p.kasbHunarEhtiyoji,
    organmoqchiKasb: p.organmoqchiKasb ?? '',
    ishTajribasiYil: p.ishTajribasiYil ?? '',
    avvalgiIshJoyi: p.avvalgiIshJoyi ?? '',
    oxirgiIshJoyi: p.oxirgiIshJoyi ?? '',
    ishdanBoshaganSana: sana(p.ishdanBoshaganSana),
    xohlaganIsh: p.xohlaganIsh ?? '',
    kutilayotganMaosh: p.kutilayotganMaosh == null ? '' : Number(p.kutilayotganMaosh),
    ishgaTayyorligi: p.ishgaTayyorligi,
    haydovchilikGuvohnomasi: p.haydovchilikGuvohnomasi,
    haydovchilikToifasi: p.haydovchilikToifasi,
    imtiyozEhtiyoji: p.imtiyozEhtiyoji,
    imtiyozTuri: p.imtiyozTuri,

    takliflar: p.takliflar,
    taklifIzohi: p.taklifIzohi ?? '',
    xulosa: p.xulosa ?? '',

    ishJoyi: p.ishJoyi ?? '',
    ishLavozimi: p.ishLavozimi ?? '',
    ishgaKirganSana: sana(p.ishgaKirganSana),
    radSababi: p.radSababi ?? '',
  };

  const joriyBosqich = ISHSIZ_HOLATI[p.holati].bosqich;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* ── Sarlavha va hayot sikli ── */}
      <div className="karta p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-ink">{p.fish}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {p.mahalla.nomiKirill} МФЙ · {p.jinsi === 'Erkak' ? 'Эркак' : 'Аёл'}
              {p.malumoti ? ` · ${kirillcha(MALUMOT, p.malumoti)}` : ''}
            </p>
            {p.mutaxassis && p.suhbatSanasi && (
              <p className="mt-1 text-xs text-ink-faint">
                Суҳбатни ўтказди: {p.mutaxassis.fullName} · {formatDate(p.suhbatSanasi)}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <HolatNishoni holati={p.holati} />
            {p.telefon && (
              <a
                href={`tel:${p.telefon}`}
                className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="raqam">{formatPhone(p.telefon)}</span>
              </a>
            )}
          </div>
        </div>

        {/*
          Hayot sikli chizig'i. Fuqaro qaysi bosqichda turgani bir
          qarashda ko'rinadi - ro'yxatdagi nishondan ko'ra aniqroq,
          chunki oldinda yana nechta qadam borligini ham ko'rsatadi.
        */}
        {p.holati !== 'RAD_ETDI' ? (
          <div className="mt-4 flex items-center gap-1">
            {VORONKA.map((b) => {
              const bosqich = ISHSIZ_HOLATI[b].bosqich;
              const otilgan = bosqich <= joriyBosqich;
              return (
                <div key={b} className="min-w-0 flex-1">
                  <div
                    className="h-1.5 rounded-full transition-colors"
                    style={{
                      background: otilgan ? `var(--step-${bosqich})` : 'var(--border)',
                    }}
                  />
                  <p
                    className={`mt-1.5 truncate text-[10px] leading-tight ${
                      otilgan ? 'text-ink-muted' : 'text-ink-faint'
                    }`}
                  >
                    {ISHSIZ_HOLATI[b].kirill}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="quti-xato mt-3">
            Фуқаро таклифдан бош тортган.
            {p.radSababi ? ` Сабаби: ${p.radSababi}` : ''}
          </div>
        )}

        {p.household && (
          <Link
            href={`/xatlov/${p.household.id}`}
            className="mt-4 flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <House className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              Хонадон: {p.household.oilaBoshligi} · {p.household.manzil}
            </span>
          </Link>
        )}

        {p.takliflar.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.takliflar.map((t) => (
              <span
                key={t}
                className="rounded bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent"
              >
                {kirillcha(BANDLIK_TAKLIFI, t)}
              </span>
            ))}
          </div>
        )}

        {p.ishJoyi && (
          <div className="quti-ok mt-3">
            Иш жойи: <b>{p.ishJoyi}</b>
            {p.ishLavozimi ? ` — ${p.ishLavozimi}` : ''}
            {p.ishgaKirganSana ? ` (${formatDate(p.ishgaKirganSana)})` : ''}
          </div>
        )}
      </div>

      {/* ── Chora-tadbirlar ── */}
      <section className="karta space-y-2 p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-bold text-ink">Чора-тадбирлар</h2>
        {p.topshiriqlar.map((t) => (
          <div key={t.id} className="rounded-md border border-line p-3">
            <p className="text-sm font-medium text-ink">{t.muammo}</p>
            <p className="mt-1 text-xs text-ink-muted">{t.yechim}</p>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              {kirillcha(MASUL_TASHKILOT, t.masulTashkilot)} · муддат:{' '}
              {formatDate(t.muddat).split(',')[0]}
            </p>
          </div>
        ))}
        {bandlikIshi(sessiya.rol) && <ChoraQoshish ishsizId={p.id} />}
      </section>

      {/* ── Suhbat anketasi ── */}
      {bandlikIshi(sessiya.rol) ? (
        <SuhbatFormasi id={p.id} boshlangich={boshlangich} />
      ) : (
        <div className="karta p-4 text-sm text-ink-muted">
          Суҳбат анкетасини фақат бандлик маркази ходимлари тўлдиради.
        </div>
      )}
    </div>
  );
}
