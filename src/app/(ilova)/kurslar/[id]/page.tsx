import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { mahallaFiltri } from '@/lib/auth';
import { KASB_YONALISHI, kirillcha } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { sanaOrali } from '@/lib/oila-rejasi';
import { sanaMaydoni } from '@/lib/sana-maydoni';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate } from '@/lib/utils';
import {
  ESKIRISH_KUNI,
  KAFOLAT_OGOHLANTIRISHI,
  KURS_HOLATI_NOMI,
  YOZUV_HOLATI_NOMI,
  kursHolati,
  kursKorsatkichlari,
  malumotEskirganmi,
} from '@/lib/kurslar';
import { KursBoshqaruvi } from '@/components/kurs/kurs-boshqaruvi';
import { KursKorsatkichBlogi } from '@/components/kurs/korsatkich-blogi';
import { YozuvBoshqaruvi } from '@/components/kurs/yozuv-boshqaruvi';

export function generateMetadata() {
  return { title: matnchi()('Курс') };
}

const kun = (d: Date) => formatDate(d).split(',')[0];

/**
 * Kurs sahifasi: ma'lumot, ko'rsatkichlar va yozilganlar.
 *
 * Mahalla xodimi faqat O'Z mahallasi fuqarolarining yozuvini ko'radi;
 * kursning umumiy ko'rsatkichlari esa ismsiz (jamlangan).
 */
export default async function KursSahifasi({ params }: { params: { id: string } }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/kurslar')) redirect(boshSahifa(sessiya.rol));

  const kurs = await prisma.kurs.findUnique({
    where: { id: params.id },
    include: { yaratgan: { select: { fullName: true } } },
  });
  if (!kurs) notFound();

  const hozir = new Date();
  const bugun = sanaMaydoni(hozir.toISOString());
  const holati = kursHolati(kurs, hozir);
  const eskirgan = malumotEskirganmi(kurs, hozir);
  const bandlikXodimi = sessiya.rol !== 'YETTILIK';
  const mahallaId = mahallaFiltri(sessiya).mahallaId;

  const [yozuvlar, korsatkich, band] = await Promise.all([
    prisma.kursYollanmasi.findMany({
      where: {
        kursId: kurs.id,
        /* Arxivdagi fuqaro ko'rinmaydi; mahalla xodimi faqat o'zinikini ko'radi */
        ishsiz: { arxivSanasi: null, ...(mahallaId ? { mahallaId } : {}) },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: {
        id: true,
        holati: true,
        ishsizId: true,
        boshlaganSana: true,
        tugatganSana: true,
        qatnashganKun: true,
        sertifikat: true,
        olinganKonikmalar: true,
        izoh: true,
        suhbatSanasi: true,
        joylashishId: true,
        joylashish: { select: { korxonaNomi: true, boshlanganSana: true } },
        ishsiz: { select: { id: true, fish: true, mahalla: { select: { nomiKirill: true } } } },
      },
    }),
    kursKorsatkichlari(kurs.id, hozir).catch((e) => {
      console.error('Kurs korsatkichini hisoblab bolmadi:', e);
      return null;
    }),
    prisma.kursYollanmasi.count({
      where: { kursId: kurs.id, holati: { in: ['YOLLANDI', 'BOSHLADI', 'TAMOMLADI'] } },
    }),
  ]);

  /* Tamomlaganlarning kursdan KEYIN boshlangan ishlari (bog'lash uchun) */
  const tamomlaganlar = yozuvlar.filter((y) => y.holati === 'TAMOMLADI' && y.tugatganSana);
  const ishlar = tamomlaganlar.length
    ? await prisma.ishgaJoylashish.findMany({
        where: { ishsizId: { in: tamomlaganlar.map((y) => y.ishsizId) } },
        select: { id: true, ishsizId: true, korxonaNomi: true, boshlanganSana: true },
        orderBy: { boshlanganSana: 'desc' },
      })
    : [];
  const bandIshlar = ishlar.length
    ? new Set(
        (
          await prisma.kursYollanmasi.findMany({
            where: { joylashishId: { in: ishlar.map((j) => j.id) } },
            select: { joylashishId: true },
          })
        )
          .map((x) => x.joylashishId)
          .filter((x): x is string => !!x)
      )
    : new Set<string>();

  const toliq = kurs.joylar !== null && band >= kurs.joylar;

  return (
    <div className="space-y-5">
      <Link href="/kurslar" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {tr('Курслар')}
      </Link>

      <section className="karta space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="sahifa-sarlavha">{kurs.nomi}</h1>
            <p className="mt-1 text-sm text-ink-muted">{kurs.tashkilot}</p>
          </div>
          <span className="shrink-0 rounded bg-surface-muted px-2 py-1 text-xs font-semibold text-ink-muted">
            {tr(KURS_HOLATI_NOMI[holati])}
          </span>
        </div>

        {holati === 'BEKOR' && (
          <div className="quti-ogoh" role="status">
            {tr('Курс бекор қилинган:')} {kurs.bekorQilingan ? kun(kurs.bekorQilingan) : ''} — {kurs.bekorSababi}
          </div>
        )}

        {eskirganOgoh(eskirgan, holati) && (
          <div className="quti-ogoh flex items-start gap-2" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {tr('Маълумот')} {ESKIRISH_KUNI} {tr('кундан кўп вақт ташкилотдан текширилмаган (охирги текширув:')} {kun(kurs.tekshirilganSana)}).{' '}
              {tr('Янги тавсиядан чиқарилган ва унга ёзиб бўлмайди.')}
            </span>
          </div>
        )}

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Satr nom={tr('Санаси')} qiymat={`${kun(kurs.boshlanishSanasi)} — ${kun(kurs.tugashSanasi)}`} />
          <Satr
            nom={tr('Йўналиши')}
            qiymat={kurs.yonalish ? tr(kirillcha(KASB_YONALISHI, kurs.yonalish)) : tr('кўрсатилмаган')}
          />
          <Satr
            nom={tr('Ўринлар')}
            qiymat={
              kurs.joylar !== null
                ? `${band} / ${kurs.joylar}${toliq ? ` — ${tr('тўлган')}` : ''}`
                : `${band} ${tr('ёзилган')} (${tr('ўринлар сони маълум эмас')})`
            }
          />
          <Satr
            nom={tr('Жами дарс кунлари')}
            qiymat={kurs.jamiDarsKuni !== null ? String(kurs.jamiDarsKuni) : tr('маълум эмас')}
          />
          <Satr
            nom={tr('Тўлов')}
            qiymat={
              kurs.bepul === null
                ? tr('маълум эмас')
                : kurs.bepul
                  ? tr('бепул')
                  : kurs.narxi !== null
                    ? `${tr('пуллик')}: ${Number(kurs.narxi).toLocaleString('ru-RU').replace(/ /g, ' ')} ${tr('сўм')}`
                    : tr('пуллик (нархи кўрсатилмаган)')
            }
          />
          <Satr nom={tr('Манзил')} qiymat={kurs.manzil ?? tr('кўрсатилмаган')} />
          <Satr nom={tr('Алоқа')} qiymat={kurs.aloqa ?? tr('кўрсатилмаган')} />
          <Satr
            nom={tr('Нимани ўргатади')}
            qiymat={kurs.konikmalar.length > 0 ? kurs.konikmalar.join(', ') : tr('кўрсатилмаган')}
          />
          <Satr nom={tr('Маълумот манбаси')} qiymat={kurs.manba} />
          <Satr
            nom={tr('Ташкилотдан текширилган')}
            qiymat={`${kun(kurs.tekshirilganSana)} · ${tr('киритган:')} ${kurs.yaratgan.fullName}`}
          />
        </dl>

        <p className="text-xs text-ink-faint">{tr(KAFOLAT_OGOHLANTIRISHI)}</p>

        {bandlikXodimi && (
          <KursBoshqaruvi
            kursId={kurs.id}
            bekorQilingan={holati === 'BEKOR'}
            tugagan={holati === 'TUGAGAN'}
            boshlangich={{
              nomi: kurs.nomi,
              yonalish: kurs.yonalish,
              konikmalar: kurs.konikmalar,
              tashkilot: kurs.tashkilot,
              manzil: kurs.manzil,
              aloqa: kurs.aloqa,
              boshlanish: sanaMaydoni(kurs.boshlanishSanasi.toISOString()),
              tugash: sanaMaydoni(kurs.tugashSanasi.toISOString()),
              jamiDarsKuni: kurs.jamiDarsKuni,
              joylar: kurs.joylar,
              bepul: kurs.bepul,
              narxi: kurs.narxi !== null ? Number(kurs.narxi) : null,
              manba: kurs.manba,
            }}
          />
        )}
      </section>

      {korsatkich && <KursKorsatkichBlogi k={korsatkich} />}

      <section className="karta p-4 sm:p-5" aria-labelledby="kz-sarlavha">
        <h2 id="kz-sarlavha" className="text-sm font-bold text-ink">
          {tr('Ёзилган фуқаролар')} ({yozuvlar.length})
        </h2>
        {mahallaId && (
          <p className="mt-1 text-xs text-ink-faint">{tr('Фақат ўз маҳаллангиз фуқаролари кўрсатилади.')}</p>
        )}
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Фуқарони курсга ёзиш — унинг саҳифасидаги «Курслар» блокидан.')}
        </p>

        {yozuvlar.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{tr('Ҳали ёзилган фуқаро йўқ.')}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {yozuvlar.map((y) => {
              const mumkinIshlar =
                y.holati === 'TAMOMLADI' && y.tugatganSana
                  ? ishlar
                      .filter(
                        (j) =>
                          j.ishsizId === y.ishsizId &&
                          sanaOrali(j.boshlanganSana, y.tugatganSana as Date) >= 0 &&
                          (!bandIshlar.has(j.id) || j.id === y.joylashishId)
                      )
                      .map((j) => ({
                        id: j.id,
                        nom: j.korxonaNomi,
                        kun: sanaMaydoni(j.boshlanganSana.toISOString()),
                      }))
                  : [];

              return (
                <li key={y.id} className="rounded-md border border-line p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/ishsizlar/${y.ishsiz.id}`} className="text-sm font-semibold text-ink hover:text-accent">
                        {y.ishsiz.fish}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-faint">{tr(y.ishsiz.mahalla.nomiKirill)}</p>
                    </div>
                    <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                      {tr(YOZUV_HOLATI_NOMI[y.holati])}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-ink-muted">
                    {y.boshlaganSana && <span>{tr('Бошлаган:')} {kun(y.boshlaganSana)}. </span>}
                    {y.tugatganSana && (
                      <span>
                        {y.holati === 'TASHLADI' ? tr('Ташлаган:') : tr('Тамомлаган:')} {kun(y.tugatganSana)}.{' '}
                      </span>
                    )}
                    {(y.holati === 'TAMOMLADI' || y.holati === 'TASHLADI') && (
                      <span>
                        {tr('Қатнашган кун:')}{' '}
                        {y.qatnashganKun === null
                          ? tr('маълум эмас')
                          : `${y.qatnashganKun}${kurs.jamiDarsKuni !== null ? ` / ${kurs.jamiDarsKuni}` : ''}`}
                        .{' '}
                      </span>
                    )}
                    {y.holati === 'TAMOMLADI' && (
                      <span>
                        {tr('Сертификат:')}{' '}
                        {y.sertifikat === null ? tr('маълум эмас') : y.sertifikat ? tr('олди') : tr('олмади')}.{' '}
                      </span>
                    )}
                    {y.suhbatSanasi && <span>{tr('Суҳбат:')} {kun(y.suhbatSanasi)}. </span>}
                    {y.izoh && <span>{y.izoh}</span>}
                  </p>
                  {y.holati === 'TAMOMLADI' && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {y.joylashish
                        ? `${tr('Боғланган иш:')} ${y.joylashish.korxonaNomi} (${kun(y.joylashish.boshlanganSana)})`
                        : tr('Курсдан кейинги иш боғланмаган (иш топгани қайд этилмаган).')}
                    </p>
                  )}

                  <YozuvBoshqaruvi
                    id={y.id}
                    holati={y.holati}
                    kursBoshlandi={sanaOrali(hozir, kurs.boshlanishSanasi) >= 0}
                    kelmadiMumkin={sanaOrali(hozir, kurs.boshlanishSanasi) >= 1}
                    kursBoshKun={sanaMaydoni(kurs.boshlanishSanasi.toISOString())}
                    kursTugKun={sanaMaydoni(kurs.tugashSanasi.toISOString())}
                    bugun={bugun}
                    jamiDarsKuni={kurs.jamiDarsKuni}
                    boshlaganKun={y.boshlaganSana ? sanaMaydoni(y.boshlaganSana.toISOString()) : null}
                    kursKonikmalar={kurs.konikmalar}
                    sertifikat={y.sertifikat}
                    olinganKonikmalar={y.olinganKonikmalar}
                    suhbatKun={y.suhbatSanasi ? sanaMaydoni(y.suhbatSanasi.toISOString()) : null}
                    joylashishId={y.joylashishId}
                    mumkinIshlar={mumkinIshlar}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Eskirgan ma'lumot ogohlantirishi faqat amaldagi (qabul/jarayonda) kursga */
function eskirganOgoh(eskirgan: boolean, holati: string): boolean {
  return eskirgan && (holati === 'QABUL' || holati === 'JARAYONDA');
}

function Satr({ nom, qiymat }: { nom: string; qiymat: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-faint">{nom}</dt>
      <dd className="break-words text-ink">{qiymat}</dd>
    </div>
  );
}
