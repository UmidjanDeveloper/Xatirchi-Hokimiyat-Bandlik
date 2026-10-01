import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { sanaMaydoni } from '@/lib/sana-maydoni';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate } from '@/lib/utils';
import {
  DASTUR_HOLATI_NOMI,
  YORDAM_ESKIRISH_KUNI,
  YORDAM_OGOHLANTIRISHI,
  dasturlarRoyxati,
  tekshirishKerakmi,
  yordamKorsatkichlarniHisobla,
  type DasturHolati,
} from '@/lib/yordam-dasturlari';
import { DasturBoshqaruvi } from '@/components/yordam/dastur-boshqaruvi';
import { YordamForma } from '@/components/yordam/yordam-forma';

export function generateMetadata() {
  return { title: matnchi()('Ёрдам дастурлари') };
}

const kun = (d: Date) => formatDate(d).split(',')[0];

/**
 * Yordam dasturlari katalogi. Katalog BO'SH boshlanadi: dastur, talab va
 * miqdorni faqat xodim rasmiy manbadan kiritadi; tizim o'zi hech narsa
 * to'qimaydi. Katalogni faqat bandlik markazi yuritadi; boshqa rollar
 * ko'radi (katalogda shaxsiy ma'lumot yo'q).
 */
export default async function YordamSahifasi({ searchParams }: { searchParams: { holat?: string } }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/yordam')) redirect(boshSahifa(sessiya.rol));

  const boshqaradi = sessiya.rol === 'BANDLIK' || sessiya.rol === 'BANDLIK_RAHBAR' || sessiya.rol === 'ADMIN';
  const hozir = new Date();
  const hammasi = await dasturlarRoyxati(hozir, 200);
  const k = yordamKorsatkichlarniHisobla(hammasi, hozir);

  const filtr = (['amalda', 'tekshirish', 'tugagan', 'yopiq', 'hammasi'] as const).find((x) => x === searchParams.holat) ?? 'hammasi';
  const royxat = hammasi.filter((d) =>
    filtr === 'amalda'
      ? d.holati === 'AMALDA'
      : filtr === 'tekshirish'
        ? tekshirishKerakmi(d, hozir) !== null
        : filtr === 'tugagan'
          ? d.holati === 'MUDDATI_TUGAGAN'
          : filtr === 'yopiq'
            ? d.holati === 'YOPIQ'
            : true
  );

  const chip = (faol: boolean) =>
    `rounded-md border px-3.5 py-2 text-sm transition-colors ${
      faol
        ? 'border-accent bg-accent-soft font-medium text-accent'
        : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
    }`;

  const belgi = (h: DasturHolati) =>
    h === 'AMALDA' ? 'bg-surface-muted text-ink-muted' : 'bg-warn-bg text-warn';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Ёрдам дастурлари')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Давлат ва маҳаллий дастурлар: талаблар, ҳужжатлар, расмий манба ва охирги текширув санаси')}
        </p>
        <p className="mt-1 text-xs text-ink-faint">{tr(YORDAM_OGOHLANTIRISHI)}</p>
      </div>

      {boshqaradi && (
        <details className="karta p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-semibold text-ink">{tr('Янги дастур қўшиш')}</summary>
          <div className="mt-4">
            <YordamForma />
          </div>
        </details>
      )}

      {hammasi.length === 0 ? (
        <div className="karta p-6 text-sm text-ink-muted">
          <p className="font-medium text-ink">{tr('Каталог бўш.')}</p>
          <p className="mt-1">
            {tr('Ҳали биронта дастур киритилмаган. Тизим дастур, талаб ёки миқдорни ўзи тўқимайди: уларни бандлик маркази ходими расмий манбадан киритади.')}
          </p>
        </div>
      ) : (
        <>
          <section className="karta p-4 sm:p-5" aria-labelledby="yk-sarlavha">
            <h2 id="yk-sarlavha" className="text-sm font-bold text-ink">
              {tr('Каталог ҳолати')}
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              <li>
                {tr('Жами:')} <b className="tabular-nums text-ink">{k.jami}</b> · {tr('амалда (тавсия қилинади):')}{' '}
                <b className="tabular-nums text-ink">{k.amalda}</b>
              </li>
              <li className="text-xs">
                {tr('Тавсиядан чиқарилган: маълумоти эскирган')} {k.eskirgan} · {tr('муддати тугаган')} {k.muddatiTugagan} · {tr('ҳали бошланмаган')} {k.haliBoshlanmagan} · {tr('ёпилган')} {k.yopiq}
              </li>
              {k.tekshirishKerak > 0 && (
                <li className="flex items-start gap-1.5 text-warn">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {tr('Манбадан текшириш керак:')} <b className="tabular-nums">{k.tekshirishKerak}</b>
                  </span>
                </li>
              )}
            </ul>
            <p className="mt-2 text-[11px] text-ink-faint">
              {tr('Дастур «амалда» ҳисобланади, агар у ёпилмаган, муддати тугамаган ва манбадан охирги марта')} {YORDAM_ESKIRISH_KUNI}{' '}
              {tr('кундан кам олдин текширилган бўлса.')}
            </p>
          </section>

          <div className="flex flex-wrap gap-2" role="navigation" aria-label={tr('Дастурлар ҳолати')}>
            <Link href="/yordam" className={chip(filtr === 'hammasi')}>
              {tr('Ҳаммаси')} ({k.jami})
            </Link>
            <Link href="/yordam?holat=amalda" className={chip(filtr === 'amalda')}>
              {tr('Амалда')} ({k.amalda})
            </Link>
            <Link href="/yordam?holat=tekshirish" className={chip(filtr === 'tekshirish')}>
              {tr('Текшириш керак')} ({k.tekshirishKerak})
            </Link>
            <Link href="/yordam?holat=tugagan" className={chip(filtr === 'tugagan')}>
              {tr('Муддати тугаган')} ({k.muddatiTugagan})
            </Link>
            <Link href="/yordam?holat=yopiq" className={chip(filtr === 'yopiq')}>
              {tr('Ёпилган')} ({k.yopiq})
            </Link>
          </div>

          {royxat.length === 0 ? (
            <div className="karta p-6 text-center text-sm text-ink-muted">{tr('Бу бўлимда дастур йўқ.')}</div>
          ) : (
            <ul className="space-y-3">
              {royxat.map((d) => (
                <li key={d.id} className="karta p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{d.nomi}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {tr('Кимлар учун:')} {d.nishonGuruh}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${belgi(d.holati)}`}>
                      {tr(DASTUR_HOLATI_NOMI[d.holati])}
                    </span>
                  </div>

                  {d.holati !== 'AMALDA' && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-warn" role="status">
                      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {d.holati === 'ESKIRGAN'
                          ? tr('Манбадан узоқ текширилмаган: тавсия қилинмайди. «Манбадан текширилди» тугмасини босинг.')
                          : d.holati === 'MUDDATI_TUGAGAN'
                            ? tr('Амал қилиш муддати тугаган: тавсия қилинмайди.')
                            : d.holati === 'HALI_BOSHLANMAGAN'
                              ? tr('Ҳали бошланмаган: тавсия қилинмайди.')
                              : `${tr('Ёпилган:')} ${d.yopilishSababi ?? ''}`}
                      </span>
                    </p>
                  )}

                  <dl className="mt-2 space-y-1 text-xs text-ink-muted">
                    <div>
                      <dt className="inline text-ink-faint">{tr('Талаблар:')} </dt>
                      <dd className="inline whitespace-pre-line">{d.talablar}</dd>
                    </div>
                    {d.hujjatlar && (
                      <div>
                        <dt className="inline text-ink-faint">{tr('Ҳужжатлар:')} </dt>
                        <dd className="inline">{d.hujjatlar}</dd>
                      </div>
                    )}
                    {d.miqdori && (
                      <div>
                        <dt className="inline text-ink-faint">{tr('Миқдор (манбадаги матн):')} </dt>
                        <dd className="inline">{d.miqdori}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="inline text-ink-faint">{tr('Масъул ташкилот:')} </dt>
                      <dd className="inline">{d.masulTashkilot}</dd>
                    </div>
                    <div>
                      <dt className="inline text-ink-faint">{tr('Расмий манба:')} </dt>
                      <dd className="inline break-words">{d.rasmiyManba}</dd>
                    </div>
                    <div>
                      <dt className="inline text-ink-faint">{tr('Манбадан текширилган:')} </dt>
                      <dd className="inline">{kun(d.tekshirilganSana)}</dd>
                    </div>
                    <div>
                      <dt className="inline text-ink-faint">{tr('Амал қилиш муддати:')} </dt>
                      <dd className="inline">
                        {!d.amalQilishBoshi && !d.amalQilishOxiri
                          ? tr('манбада кўрсатилмаган (маълум эмас)')
                          : `${d.amalQilishBoshi ? kun(d.amalQilishBoshi) : tr('боши кўрсатилмаган')} — ${d.amalQilishOxiri ? kun(d.amalQilishOxiri) : tr('охири манбада кўрсатилмаган')}`}
                      </dd>
                    </div>
                  </dl>

                  {boshqaradi && (
                    <DasturBoshqaruvi
                      id={d.id}
                      faol={d.faol}
                      boshlangich={{
                        nomi: d.nomi,
                        nishonGuruh: d.nishonGuruh,
                        talablar: d.talablar,
                        hujjatlar: d.hujjatlar,
                        masulTashkilot: d.masulTashkilot,
                        rasmiyManba: d.rasmiyManba,
                        miqdori: d.miqdori,
                        boshi: d.amalQilishBoshi ? sanaMaydoni(d.amalQilishBoshi.toISOString()) : '',
                        oxiri: d.amalQilishOxiri ? sanaMaydoni(d.amalQilishOxiri.toISOString()) : '',
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
