import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, CircleDashed, PlayCircle, XCircle } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate } from '@/lib/utils';
import {
  KAFOLAT_OGOHLANTIRISHI,
  KURS_HOLATI_NOMI,
  kursKorsatkichlari,
  kurslarRoyxati,
  type KursHolati,
} from '@/lib/kurslar';
import { SAHIFA_HAJMI, sahifaChegarasi, sahifaRaqami, sahifaniTuzat } from '@/lib/sahifalash';
import { Sahifalash } from '@/components/shared/sahifalash';
import { KursForma } from '@/components/kurs/kurs-forma';
import { KursKorsatkichBlogi } from '@/components/kurs/korsatkich-blogi';

export function generateMetadata() {
  return { title: matnchi()('Курслар') };
}

type Filtr = { holat?: string; sahifa?: string };

const kun = (d: Date) => formatDate(d).split(',')[0];

const IKONKA: Record<KursHolati, React.ReactNode> = {
  QABUL: <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />,
  JARAYONDA: <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />,
  TUGAGAN: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
  BEKOR: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
};

/**
 * Kurslar katalogi. Holat sanalardan hisoblanadi; ma'lumoti eskirgan kurs
 * alohida belgilanadi. Kursni faqat bandlik markazi qo'shadi va o'zgartiradi;
 * mahalla xodimi ko'radi va o'z fuqarosini yozadi.
 */
export default async function KurslarSahifasi({ searchParams }: { searchParams: Filtr }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/kurslar')) redirect(boshSahifa(sessiya.rol));

  const bandlikXodimi = sessiya.rol !== 'YETTILIK';

  const hozir = new Date();
  const [hammasi, korsatkich] = await Promise.all([
    kurslarRoyxati(hozir, 200),
    kursKorsatkichlari(undefined, hozir).catch((e) => {
      console.error('Kurs korsatkichlarini hisoblab bolmadi:', e);
      return null;
    }),
  ]);

  const holat = (['QABUL', 'JARAYONDA', 'TUGAGAN', 'BEKOR'] as const).find((h) => h === searchParams.holat);
  const filtr = holat ?? 'FAOL';
  const royxat = hammasi.filter((k) =>
    filtr === 'FAOL' ? k.holati === 'QABUL' || k.holati === 'JARAYONDA' : k.holati === filtr
  );

  const sahifa = sahifaniTuzat(sahifaRaqami(searchParams.sahifa), royxat.length);
  const { skip, take } = sahifaChegarasi(sahifa);
  const korinadigan = royxat.slice(skip, skip + take);

  const soni = (h: KursHolati) => hammasi.filter((k) => k.holati === h).length;
  const eskirgan = hammasi.filter((k) => k.eskirgan && (k.holati === 'QABUL' || k.holati === 'JARAYONDA')).length;

  const chip = (faol: boolean) =>
    `rounded-md border px-3.5 py-2 text-sm transition-colors ${
      faol
        ? 'border-accent bg-accent-soft font-medium text-accent'
        : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
    }`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Курслар')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Касб-ҳунар курслари: ёзилиш → ўқиш → тамомлаш → суҳбат → иш')}
        </p>
        <p className="mt-1 text-xs text-ink-faint">{tr(KAFOLAT_OGOHLANTIRISHI)}</p>
      </div>

      {eskirgan > 0 && (
        <div className="quti-ogoh flex items-start gap-2" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {eskirgan} {tr('та амалдаги курснинг маълумоти узоқ вақт текширилмаган. Улар янги тавсия сифатида чиқмайди ва уларга ёзиб бўлмайди — ташкилотдан сўраб, «Ташкилотдан текширилди» тугмасини босинг.')}
          </span>
        </div>
      )}

      {bandlikXodimi && (
        <details className="karta p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-semibold text-ink">{tr('Янги курс қўшиш')}</summary>
          <div className="mt-4">
            <KursForma />
          </div>
        </details>
      )}

      {korsatkich && <KursKorsatkichBlogi k={korsatkich} sarlavha={tr('Барча курслар натижаси')} />}

      <div className="flex flex-wrap gap-2" role="navigation" aria-label={tr('Курслар ҳолати')}>
        <Link href="/kurslar" className={chip(filtr === 'FAOL')}>
          {tr('Амалдаги')} ({soni('QABUL') + soni('JARAYONDA')})
        </Link>
        {(['QABUL', 'JARAYONDA', 'TUGAGAN', 'BEKOR'] as const).map((h) => (
          <Link key={h} href={`/kurslar?holat=${h}`} className={chip(filtr === h)}>
            {tr(KURS_HOLATI_NOMI[h])} ({soni(h)})
          </Link>
        ))}
      </div>

      {korinadigan.length === 0 ? (
        <div className="karta p-6 text-center text-sm text-ink-muted">
          {hammasi.length === 0
            ? tr('Ҳали курс киритилмаган.')
            : tr('Бу ҳолатда курс йўқ.')}
        </div>
      ) : (
        <ul className="space-y-3">
          {korinadigan.map((k) => (
            <li key={k.id} className="karta p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/kurslar/${k.id}`} className="text-sm font-semibold text-ink hover:text-accent">
                    {k.nomi}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {k.tashkilot} · {kun(k.boshlanishSanasi)} — {kun(k.tugashSanasi)}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                  {IKONKA[k.holati]}
                  {tr(KURS_HOLATI_NOMI[k.holati])}
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {tr('Ёзилган:')} {k.band}
                {k.joylar !== null ? ` / ${k.joylar} ${tr('ўрин')}` : ` (${tr('ўринлар сони маълум эмас')})`}
                {k.tamomlagan + k.tashlagan > 0 &&
                  ` · ${tr('тамомлаган')} ${k.tamomlagan}, ${tr('ташлаган')} ${k.tashlagan}`}
              </p>
              {k.eskirgan && (k.holati === 'QABUL' || k.holati === 'JARAYONDA') && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-warn">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  {tr('Маълумот эскирган: охирги текширув')} {kun(k.tekshirilganSana)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Sahifalash
        yol="/kurslar"
        joriy={sahifa}
        jami={royxat.length}
        hajm={SAHIFA_HAJMI}
        filtrlar={{ holat: searchParams.holat }}
      />

      {hammasi.length >= 200 && (
        <p className="text-xs text-ink-faint">{tr('Энг янги 200 та курс кўрсатилади.')}</p>
      )}
    </div>
  );
}
