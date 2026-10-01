import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { prisma } from '@/lib/prisma';
import { sanaMaydoni } from '@/lib/sana-maydoni';
import { formatDate } from '@/lib/utils';
import {
  KAFOLAT_OGOHLANTIRISHI,
  YOZUV_HOLATI_NOMI,
  yozishMumkinKurslar,
} from '@/lib/kurslar';
import { sanaOrali } from '@/lib/oila-rejasi';
import { KursgaYozish } from './kursga-yozish';
import { YozuvBoshqaruvi } from './yozuv-boshqaruvi';

const kun = (d: Date) => formatDate(d).split(',')[0];

/**
 * Fuqaroning kurslari: yozilgan kurslar, har birining holati va natijasi,
 * hamda yangi kursga yozish.
 *
 * Xato bu yerda yutiladi: bu ikkilamchi blok, fuqaro sahifasi kurs
 * jadvali sabab ochilmay qolmasligi kerak.
 */
export async function KurslarBlogi({ ishsizId }: { ishsizId: string }) {
  const tr = matnchi();

  try {
    const hozir = new Date();
    const bugun = sanaMaydoni(hozir.toISOString());

    const [yozuvlar, mumkin, vaucherlar, ishlar] = await Promise.all([
      prisma.kursYollanmasi.findMany({
        where: { ishsizId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          holati: true,
          boshlaganSana: true,
          tugatganSana: true,
          qatnashganKun: true,
          sertifikat: true,
          olinganKonikmalar: true,
          izoh: true,
          suhbatSanasi: true,
          joylashishId: true,
          joylashish: { select: { korxonaNomi: true, boshlanganSana: true } },
          kurs: {
            select: {
              id: true,
              nomi: true,
              tashkilot: true,
              boshlanishSanasi: true,
              tugashSanasi: true,
              jamiDarsKuni: true,
              konikmalar: true,
            },
          },
        },
      }),
      yozishMumkinKurslar(hozir),
      prisma.itVaucher.findMany({
        where: { ishsizId },
        orderBy: { berilganSana: 'desc' },
        take: 5,
        select: { id: true, raqami: true },
      }),
      prisma.ishgaJoylashish.findMany({
        where: { ishsizId },
        orderBy: { boshlanganSana: 'desc' },
        take: 20,
        select: { id: true, korxonaNomi: true, boshlanganSana: true },
      }),
    ]);

    /* Allaqachon yozilgan kursni yana taklif qilmaymiz */
    const yozilgan = new Set(yozuvlar.map((y) => y.kurs.id));
    const tanlov = mumkin
      .filter((k) => !yozilgan.has(k.id))
      .map((k) => ({
        id: k.id,
        yorliq: `${k.nomi} · ${k.tashkilot} · ${kun(k.boshlanishSanasi)}${
          k.joylar !== null ? ` · ${tr('бўш ўрин')}: ${Math.max(0, k.joylar - k.band)}` : ''
        }`,
      }));

    if (yozuvlar.length === 0 && tanlov.length === 0) return null;

    const band = new Set(yozuvlar.map((y) => y.joylashishId).filter((x): x is string => !!x));

    return (
      <section className="karta space-y-3 p-4 sm:p-5" aria-labelledby="kb-sarlavha">
        <div>
          <h2 id="kb-sarlavha" className="flex items-center gap-2 text-sm font-bold text-ink">
            <GraduationCap className="h-4 w-4 text-accent" aria-hidden="true" />
            {tr('Курслар')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">{tr(KAFOLAT_OGOHLANTIRISHI)}</p>
        </div>

        {yozuvlar.length > 0 && (
          <ul className="space-y-3">
            {yozuvlar.map((y) => {
              const mumkinIshlar =
                y.holati === 'TAMOMLADI' && y.tugatganSana
                  ? ishlar
                      .filter(
                        (j) =>
                          sanaOrali(j.boshlanganSana, y.tugatganSana as Date) >= 0 &&
                          (!band.has(j.id) || j.id === y.joylashishId)
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
                      <Link href={`/kurslar/${y.kurs.id}`} className="text-sm font-semibold text-ink hover:text-accent">
                        {y.kurs.nomi}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {y.kurs.tashkilot} · {kun(y.kurs.boshlanishSanasi)} — {kun(y.kurs.tugashSanasi)}
                      </p>
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
                          : `${y.qatnashganKun}${y.kurs.jamiDarsKuni !== null ? ` / ${y.kurs.jamiDarsKuni}` : ''}`}
                        .{' '}
                      </span>
                    )}
                    {y.holati === 'TAMOMLADI' && (
                      <span>
                        {tr('Сертификат:')}{' '}
                        {y.sertifikat === null ? tr('маълум эмас') : y.sertifikat ? tr('олди') : tr('олмади')}.{' '}
                      </span>
                    )}
                    {y.olinganKonikmalar.length > 0 && (
                      <span>{tr('Ўзлаштирган:')} {y.olinganKonikmalar.join(', ')}. </span>
                    )}
                    {y.suhbatSanasi && <span>{tr('Суҳбат:')} {kun(y.suhbatSanasi)}. </span>}
                    {y.izoh && <span>{y.izoh}</span>}
                  </p>

                  {y.holati === 'TAMOMLADI' && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {y.joylashish
                        ? `${tr('Боғланган иш:')} ${y.joylashish.korxonaNomi} (${kun(y.joylashish.boshlanganSana)}) — ${tr('тасдиғи иш воқеасида')}`
                        : tr('Курсдан кейинги иш боғланмаган (иш топгани қайд этилмаган).')}
                    </p>
                  )}

                  <YozuvBoshqaruvi
                    id={y.id}
                    holati={y.holati}
                    kursBoshlandi={sanaOrali(hozir, y.kurs.boshlanishSanasi) >= 0}
                    kelmadiMumkin={sanaOrali(hozir, y.kurs.boshlanishSanasi) >= 1}
                    kursBoshKun={sanaMaydoni(y.kurs.boshlanishSanasi.toISOString())}
                    kursTugKun={sanaMaydoni(y.kurs.tugashSanasi.toISOString())}
                    bugun={bugun}
                    jamiDarsKuni={y.kurs.jamiDarsKuni}
                    boshlaganKun={y.boshlaganSana ? sanaMaydoni(y.boshlaganSana.toISOString()) : null}
                    kursKonikmalar={y.kurs.konikmalar}
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

        {tanlov.length > 0 && <KursgaYozish ishsizId={ishsizId} kurslar={tanlov} vaucherlar={vaucherlar} />}
      </section>
    );
  } catch (e) {
    console.error('Kurslar blokini yuklab bo‘lmadi:', e);
    return null;
  }
}
