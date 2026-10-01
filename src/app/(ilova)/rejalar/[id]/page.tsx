import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, Phone } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { mahallagaRuxsat } from '@/lib/auth';
import { joriyXodim } from '@/lib/sahifa-auth';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { MASUL_TASHKILOT, kirillcha } from '@/lib/constants';
import { TOPSHIRIQ_HOLATI, korinadiganHolat, qolganKun } from '@/lib/chora-tadbir';
import {
  ALOQA_USULI_NOMI,
  REJA_HOLATI_NOMI,
  aloqaMuddati,
  masulXodimlar,
  rejaYetishmasligi,
  sanaOrali,
} from '@/lib/oila-rejasi';
import { RejaTahrir, type RejaQiymati } from '@/components/reja/reja-tahrir';
import { sanaMaydoni } from '@/lib/sana-maydoni';
import { AloqaQoshish } from '@/components/reja/aloqa-qoshish';
import { QadamQoshish } from '@/components/reja/qadam-qoshish';
import { QadamDalili } from '@/components/reja/qadam-dalili';
import { RejaYopish } from '@/components/reja/reja-yopish';
import { ChoraHolati } from '@/components/chora/chora-holati';

export function generateMetadata() {
  return { title: matnchi()('Оилавий режа') };
}

export default async function RejaSahifasi({ params }: { params: { id: string } }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/rejalar')) redirect(boshSahifa(sessiya.rol));

  const reja = await prisma.oilaRejasi.findUnique({
    where: { id: params.id },
    include: {
      household: {
        select: {
          id: true,
          oilaBoshligi: true,
          manzil: true,
          mahallaId: true,
          arxivSanasi: true,
          mahalla: { select: { nomi: true } },
        },
      },
      masulXodim: { select: { id: true, fullName: true } },
      yaratgan: { select: { fullName: true } },
      qadamlar: {
        orderBy: { muddat: 'asc' },
        include: { masulXodim: { select: { fullName: true } } },
      },
      aloqalar: {
        orderBy: { aloqaVaqti: 'desc' },
        take: 100,
        include: { qaydEtgan: { select: { fullName: true } } },
      },
    },
  });

  /*
   * Arxivdagi oila va begona mahalla - ikkalasi ham "topilmadi": mavjud
   * ekanligining o'zi ham ma'lumot bo'lib qolmasin.
   */
  if (!reja || reja.household.arxivSanasi) notFound();
  if (!mahallagaRuxsat(sessiya, reja.household.mahallaId)) notFound();

  const hozir = new Date();
  const faol = reja.holati === 'FAOL';

  const [xodimlar, biriktiriladigan] = await Promise.all([
    masulXodimlar(reja.household.mahallaId),
    faol
      ? prisma.actionPlan.findMany({
          where: {
            householdId: reja.household.id,
            rejaId: null,
            holati: { in: ['KUTILMOQDA', 'BAJARILMOQDA'] },
          },
          select: { id: true, muammo: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const yetishmaydi = faol
    ? rejaYetishmasligi({
        maqsad: reja.maqsad,
        maqsadKelishilgan: reja.maqsadKelishilgan,
        tosiqlar: reja.tosiqlar,
        masulXodimId: reja.masulXodimId,
        masulTashkilot: reja.masulTashkilot,
        muddat: reja.muddat,
        keyingiAloqaSanasi: reja.keyingiAloqaSanasi,
        qadamlarSoni: reja.qadamlar.length,
        aloqalarSoni: reja.aloqalar.length,
      })
    : [];

  const boshlangich: RejaQiymati = {
    boshlangichHolat: reja.boshlangichHolat,
    maqsad: reja.maqsad ?? '',
    maqsadKelishilgan: reja.maqsadKelishilgan,
    resurslar: reja.resurslar ?? '',
    tosiqlar: reja.tosiqlar,
    tosiqIzohi: reja.tosiqIzohi ?? '',
    masulXodimId: reja.masulXodimId ?? '',
    masulTashkilot: reja.masulTashkilot ?? '',
    muddat: sanaMaydoni(reja.muddat?.toISOString()),
    zarurResurs: reja.zarurResurs ?? '',
    keyingiAloqaSanasi: sanaMaydoni(reja.keyingiAloqaSanasi?.toISOString()),
  };

  const aloqa = aloqaMuddati(reja.keyingiAloqaSanasi, hozir);
  const kun = reja.keyingiAloqaSanasi ? sanaOrali(reja.keyingiAloqaSanasi, hozir) : 0;
  const bajarilgan = reja.qadamlar.filter((q) => q.holati === 'BAJARILDI').length;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/rejalar"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {tr('Барча режалар')}
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="sahifa-sarlavha">{tr(reja.household.oilaBoshligi)}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {tr(reja.household.mahalla.nomi)} · {reja.household.manzil} ·{' '}
              <Link href={`/xatlov/${reja.household.id}`} className="text-accent hover:underline">
                {tr('хатловни кўриш')}
              </Link>
            </p>
          </div>
          <span className="rounded bg-surface-muted px-2 py-1 text-xs font-semibold text-ink-muted">
            {tr(REJA_HOLATI_NOMI[reja.holati])}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          {tr('Режа тузилди:')} {formatDate(reja.createdAt).split(',')[0]} · {reja.yaratgan.fullName}
          {reja.boshlangichManba && ` · ${tr('Бошланғич маълумот:')} ${reja.boshlangichManba}`}
        </p>
      </div>

      {!faol && (
        <div className="karta space-y-1 p-4">
          <p className="text-sm font-semibold text-ink">
            {tr('Режа ёпилган')}
            {reja.yopilganSana && ` — ${formatDate(reja.yopilganSana).split(',')[0]}`}
          </p>
          {reja.yopilishIzohi && <p className="text-sm text-ink-muted">{reja.yopilishIzohi}</p>}
          <p className="text-xs text-ink-faint">
            {reja.natijaDalili
              ? `${tr('Далил:')} ${reja.natijaDalili}`
              : tr('Натижа далили киритилмаган')}
          </p>
        </div>
      )}

      {faol && (
        <section className="karta space-y-2 p-4" aria-labelledby="rj-holat">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="rj-holat" className="text-sm font-bold text-ink">
              {tr('Режа ҳолати')}
            </h2>
            <span className="text-xs text-ink-muted">
              {tr('Қадамлар:')} {bajarilgan}/{reja.qadamlar.length} {tr('бажарилган')} ·{' '}
              {tr('Алоқалар:')} {reja.aloqalar.length}
            </span>
          </div>
          {aloqa === 'otgan' || aloqa === 'belgilanmagan' ? (
            <p className="flex items-center gap-2 text-sm font-medium text-danger" role="status">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {aloqa === 'otgan'
                ? tr(`Оила билан алоқа ${Math.abs(kun)} кун кечикди`)
                : tr('Кейинги алоқа санаси қўйилмаган')}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ok" role="status">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {aloqa === 'bugun'
                ? tr('Алоқа — бугун')
                : tr(`Кейинги алоқа ${kun} кундан кейин`)}
            </p>
          )}
          {yetishmaydi.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-ink-muted">{tr('Режада тўлдирилмаган:')}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-muted">
                {yetishmaydi.map((y) => (
                  <li key={y}>{tr(y)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-ok">{tr('Режа тўлиқ тўлдирилган.')}</p>
          )}
        </section>
      )}

      <section aria-labelledby="rj-asos" className="space-y-2">
        <h2 id="rj-asos" className="text-sm font-bold text-ink">
          {tr('Режа')}
        </h2>
        <RejaTahrir
          rejaId={reja.id}
          boshlangich={boshlangich}
          xodimlar={xodimlar}
          tahrirlashMumkin={faol}
        />
      </section>

      <section aria-labelledby="rj-qadam" className="space-y-2">
        <h2 id="rj-qadam" className="text-sm font-bold text-ink">
          {tr('Қадамлар')}
        </h2>
        {reja.qadamlar.length === 0 ? (
          <p className="karta p-4 text-sm text-ink-muted">{tr('Ҳали қадам қўшилмаган.')}</p>
        ) : (
          <ul className="space-y-2">
            {reja.qadamlar.map((q) => {
              const h = korinadiganHolat(q, hozir);
              const nishon = TOPSHIRIQ_HOLATI[h];
              const k = qolganKun(q.muddat, hozir);
              return (
                <li key={q.id} className="karta p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium text-ink">{q.muammo}</p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${nishon.sinf}`}
                    >
                      {tr(nishon.kirill)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-muted">{q.yechim}</p>
                  {q.zarurResurs && (
                    <p className="mt-1 text-xs text-ink-faint">
                      {tr('Зарур ресурс:')} {q.zarurResurs}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
                    <span className="font-medium text-ink-muted">
                      {tr(kirillcha(MASUL_TASHKILOT, q.masulTashkilot))}
                    </span>
                    {q.masulXodim && (
                      <>
                        <span>·</span>
                        <span>{q.masulXodim.fullName}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className={h === 'KECHIKDI' ? 'font-semibold text-danger' : ''}>
                      {formatDate(q.muddat).split(',')[0]}
                      {h === 'KECHIKDI'
                        ? tr(` (${Math.abs(k)} кун кечикди)`)
                        : h === 'BAJARILDI' || h === 'BEKOR_QILINDI'
                          ? ''
                          : tr(` (${k} кун қолди)`)}
                    </span>
                  </div>
                  {q.holati === 'BAJARILDI' && (
                    <QadamDalili
                      topshiriqId={q.id}
                      joriy={q.natijaDalili}
                      tahrirlashMumkin={faol}
                    />
                  )}
                  <ChoraHolati
                    topshiriqId={q.id}
                    joriy={q.holati}
                    natijaIzohi={q.natijaIzohi}
                    ozgartiraOladi={faol}
                  />
                </li>
              );
            })}
          </ul>
        )}
        {faol && (
          <QadamQoshish rejaId={reja.id} xodimlar={xodimlar} biriktiriladigan={biriktiriladigan} />
        )}
      </section>

      <section aria-labelledby="rj-aloqa" className="space-y-2">
        <h2 id="rj-aloqa" className="text-sm font-bold text-ink">
          {tr('Оила билан алоқалар')}
        </h2>
        <p className="text-xs text-ink-faint">
          {tr('Ходим қайд этган ёзувлар. Фуқаронинг мустақил электрон тасдиғи эмас.')}
        </p>
        {reja.aloqalar.length === 0 ? (
          <p className="karta p-4 text-sm text-ink-muted">{tr('Ҳали алоқа қайд этилмаган.')}</p>
        ) : (
          <ul className="space-y-2">
            {reja.aloqalar.map((a) => {
              /* Yozuv aloqadan keyin kiritilgan bo'lsa, ikki sana ham ko'rinadi */
              const kechKiritilgan = sanaOrali(a.createdAt, a.aloqaVaqti) >= 1;
              return (
                <li key={a.id} className="karta p-3.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="font-semibold text-ink">{tr(ALOQA_USULI_NOMI[a.usul])}</span>
                    <span>· {formatDate(a.aloqaVaqti)}</span>
                    {a.kimBilan && <span>· {a.kimBilan}</span>}
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{a.mazmun}</p>
                  {a.fuqaroFikri && (
                    <p className="mt-1.5 rounded-md bg-surface-muted px-2.5 py-1.5 text-xs text-ink-muted">
                      <span className="font-medium">{tr('Фуқаро фикри (ходим ёзиб олган):')}</span>{' '}
                      {a.fuqaroFikri}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-ink-faint">
                    {tr('Қайд этди:')} {a.qaydEtgan.fullName}
                    {kechKiritilgan && ` · ${tr('киритилган:')} ${formatDate(a.createdAt)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {faol && <AloqaQoshish rejaId={reja.id} />}
      </section>

      {faol && (
        <section aria-label={tr('Режани ёпиш')} className="pt-2">
          <RejaYopish rejaId={reja.id} />
        </section>
      )}
    </div>
  );
}
