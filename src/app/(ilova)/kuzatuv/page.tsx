import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CalendarClock, PhoneOff } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate } from '@/lib/utils';
import { HISOBLASH_USULI, kuzatuvIshlari, type BosqichHolati } from '@/lib/kuzatuv';
import { SAHIFA_HAJMI, sahifaChegarasi, sahifaRaqami, sahifaniTuzat } from '@/lib/sahifalash';
import { Sahifalash } from '@/components/shared/sahifalash';

export function generateMetadata() {
  return { title: matnchi()('Кузатув 30/60/90') };
}

type Filtr = { holat?: string; sahifa?: string };

const HOLAT_MATNI: Record<BosqichHolati, string> = {
  bajarildi: 'Қайд этилган',
  boglanilmadi: 'Боғланиб бўлмади',
  qayta_urinish: 'Қайта уриниш керак',
  kutilmoqda: 'Яқин кунларда',
  bugun: 'Муддат — бугун',
  kechikdi: 'Кечикди',
  yopilgan: 'Ёпилган',
};

/**
 * Муддати келган кузатув текширувлари — бандлик маркази иши.
 *
 * Рўйхат ёзувлардан эмас, ишга кирган санадан ҲИСОБЛАНАДИ: қайд
 * этилмаган текширув «унутилиб яратилмай» қолмайди.
 */
export default async function KuzatuvSahifasi({ searchParams }: { searchParams: Filtr }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/kuzatuv')) redirect(boshSahifa(sessiya.rol));

  const hozir = new Date();
  const hammasi = await kuzatuvIshlari(undefined, hozir);

  const kechikkan = hammasi.filter((i) => i.holat === 'kechikdi' || i.holat === 'qayta_urinish');
  const bugun = hammasi.filter((i) => i.holat === 'bugun');
  const yaqin = hammasi.filter((i) => i.holat === 'kutilmoqda');
  const qayta = hammasi.filter((i) => i.holat === 'qayta_urinish');

  const filtr = ['kechikdi', 'bugun', 'yaqin', 'hammasi'].includes(searchParams.holat ?? '')
    ? (searchParams.holat as string)
    : 'muddat-kelgan';

  const korinadi =
    filtr === 'kechikdi'
      ? kechikkan
      : filtr === 'bugun'
        ? bugun
        : filtr === 'yaqin'
          ? yaqin
          : filtr === 'hammasi'
            ? hammasi
            : hammasi.filter((i) => i.holat !== 'kutilmoqda');

  const sahifa = sahifaniTuzat(sahifaRaqami(searchParams.sahifa), korinadi.length);
  const { skip, take } = sahifaChegarasi(sahifa);
  const qism = korinadi.slice(skip, skip + take);

  const chip = (faol: boolean) =>
    `rounded-md border px-3.5 py-2 text-sm transition-colors ${
      faol
        ? 'border-accent bg-accent-soft font-medium text-accent'
        : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
    }`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Кузатув: 30/60/90 кунлик текширув')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Жойлашган фуқаро ишда қолдими, ҳақ оляптими, даромади қандай')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Karta
          ikonka={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          nomi={tr('Кечиккан')}
          qiymat={kechikkan.length}
          izoh={kechikkan.length > 0 ? tr('Дарҳол боғланинг') : tr('Кечикканлари йўқ')}
          xavfli={kechikkan.length > 0}
        />
        <Karta
          ikonka={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
          nomi={tr('Муддат — бугун')}
          qiymat={bugun.length}
          izoh={tr('Бугун қайд этиладиганлар')}
        />
        <Karta
          ikonka={<PhoneOff className="h-4 w-4" aria-hidden="true" />}
          nomi={tr('Қайта уриниш керак')}
          qiymat={qayta.length}
          izoh={tr('Аввал боғланиб бўлмаганлар')}
          xavfli={qayta.length > 0}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/kuzatuv" className={chip(filtr === 'muddat-kelgan')}>
          {tr('Муддати келган')}
        </Link>
        <Link href="/kuzatuv?holat=kechikdi" className={chip(filtr === 'kechikdi')}>
          {tr('Кечиккан')}
        </Link>
        <Link href="/kuzatuv?holat=bugun" className={chip(filtr === 'bugun')}>
          {tr('Бугун')}
        </Link>
        <Link href="/kuzatuv?holat=yaqin" className={chip(filtr === 'yaqin')}>
          {tr('Яқин 7 кун')}
        </Link>
        <Link href="/kuzatuv?holat=hammasi" className={chip(filtr === 'hammasi')}>
          {tr('Ҳаммаси')}
        </Link>
      </div>

      {qism.length === 0 ? (
        <div className="karta p-8 text-center text-sm text-ink-muted">
          {tr('Шартга мос текширув йўқ.')}
        </div>
      ) : (
        <ul className="space-y-2">
          {qism.map((i) => {
            const ogohlik = i.holat === 'kechikdi' || i.holat === 'qayta_urinish';
            return (
              <li key={`${i.joylashishId}-${i.kun}`}>
                <Link
                  href={`/ishsizlar/${i.ishsizId}#kuzatuv`}
                  className="karta karta-bosiladigan block p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{i.fish}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {tr(i.mahalla)} · {i.korxona}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                      {tr(`${i.kun} кун`)}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-xs ${ogohlik ? 'font-semibold text-danger' : 'text-ink-muted'}`}
                  >
                    {ogohlik ? '⚠ ' : ''}
                    {tr(HOLAT_MATNI[i.holat])}
                    {i.holat === 'kechikdi' && ` — ${Math.abs(i.kunFarqi)} ${tr('кун')}`}
                    {' · '}
                    {tr('Ишга кирган:')} {formatDate(i.boshlanganSana).split(',')[0]}
                    {' · '}
                    {tr('Муддат:')} {formatDate(i.rejaSana).split(',')[0]}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Sahifalash
        yol="/kuzatuv"
        joriy={sahifa}
        jami={korinadi.length}
        hajm={SAHIFA_HAJMI}
        filtrlar={{ holat: searchParams.holat }}
      />

      <details className="karta p-4 text-xs text-ink-muted">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          {tr('Рўйхат қандай ҳисобланган')}
        </summary>
        <p className="mt-2">{tr(HISOBLASH_USULI.davr)}</p>
        <p className="mt-1">
          {tr('Муддат — ишга кирган сана + 30, 60 ёки 90 кун. Қайд этилмаган ва муддати келган текширувлар рўйхатга тушади.')}
        </p>
        <p className="mt-1">
          {tr('Муддатидан 120 кундан ортиқ ўтган эски ишлар шовқин бўлмаслиги учун рўйхатга киритилмайди.')}
        </p>
      </details>
    </div>
  );
}

function Karta({
  ikonka,
  nomi,
  qiymat,
  izoh,
  xavfli,
}: {
  ikonka: React.ReactNode;
  nomi: string;
  qiymat: number;
  izoh: string;
  xavfli?: boolean;
}) {
  return (
    <div className={`karta p-4 ${xavfli ? 'border-danger' : ''}`}>
      <div className={`flex items-center gap-2 ${xavfli ? 'text-danger' : 'text-ink-faint'}`}>
        {ikonka}
        <span className="text-xs font-medium">{nomi}</span>
      </div>
      <p className={`raqam mt-2 text-2xl font-bold ${xavfli ? 'text-danger' : 'text-ink'}`}>
        {qiymat}
      </p>
      <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>
    </div>
  );
}
