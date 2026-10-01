import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarClock, SearchCheck } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { mahallaFiltri } from '@/lib/auth';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate } from '@/lib/utils';
import { elonlarSifati } from '@/lib/elon-sifati';
import { SAHIFA_HAJMI, sahifaChegarasi, sahifaRaqami, sahifaniTuzat } from '@/lib/sahifalash';
import { Sahifalash } from '@/components/shared/sahifalash';
import { ElonSifatiBlogi } from '@/components/ish-orni/elon-sifati-blogi';

export function generateMetadata() {
  return { title: matnchi()('Эълонлар сифати') };
}

type Filtr = { turi?: string; sahifa?: string };

/**
 * Faol e'lonlarning sifati va yangiligi: to'liq bo'lmagan, eskirgan,
 * muddati yaqin va gumonli belgilari bor e'lonlar. Ishga qanday
 * yondashishni xodim hal qiladi: tizim e'lonni o'zi o'chirmaydi.
 */
export default async function ElonSifatiSahifasi({ searchParams }: { searchParams: Filtr }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/ish-orinlari')) redirect(boshSahifa(sessiya.rol));

  const hozir = new Date();
  const majburiy = mahallaFiltri(sessiya);
  const hammasi = await elonlarSifati(majburiy.mahallaId, hozir);

  const tekshirish = hammasi.filter((e) => e.belgilar.some((b) => b.jiddiylik === 'tekshirish'));
  const muddat = hammasi.filter((e) => e.belgilar.some((b) => b.kalit === 'muddati-yaqin' || b.kalit === 'muddatsiz'));
  const eski = hammasi.filter((e) => e.belgilar.some((b) => b.kalit === 'yangilanmagan'));
  const belgili = hammasi.filter((e) => e.belgilar.some((b) => b.jiddiylik !== 'malumot'));

  const turi = ['tekshirish', 'muddat', 'eski', 'hammasi'].includes(searchParams.turi ?? '')
    ? (searchParams.turi as string)
    : 'belgili';
  const korinadi =
    turi === 'tekshirish' ? tekshirish : turi === 'muddat' ? muddat : turi === 'eski' ? eski : turi === 'hammasi' ? hammasi : belgili;

  const sahifa = sahifaniTuzat(sahifaRaqami(searchParams.sahifa), korinadi.length);
  const { skip, take } = sahifaChegarasi(sahifa);

  const chip = (faol: boolean) =>
    `rounded-md border px-3.5 py-2 text-sm transition-colors ${
      faol
        ? 'border-accent bg-accent-soft font-medium text-accent'
        : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
    }`;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/ish-orinlari"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {tr('Бўш иш ўринлари')}
        </Link>
        <h1 className="sahifa-sarlavha mt-1">{tr('Эълонлар сифати ва янгилиги')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Фуқаро бекорга йўлга чиқмаслиги учун: тўлиқ бўлмаган, эскирган ва гумонли эълонлар')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Karta
          ikonka={<SearchCheck className="h-4 w-4" aria-hidden="true" />}
          nomi={tr('Текшириш керак')}
          qiymat={tekshirish.length}
          izoh={tr('Гумонли маош, такрор телефон, пул сўрайдиган ибора')}
          xavfli={tekshirish.length > 0}
        />
        <Karta
          ikonka={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
          nomi={tr('Муддат масаласи')}
          qiymat={muddat.length}
          izoh={tr('3 кунда тугайди ёки муддатсиз')}
        />
        <Karta
          ikonka={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          nomi={tr('Янгиланмаган')}
          qiymat={eski.length}
          izoh={tr('21 кундан бери ҳеч ким тегмаган')}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/ish-orinlari/sifat" className={chip(turi === 'belgili')}>
          {tr('Белгиси борлар')} ({belgili.length})
        </Link>
        <Link href="/ish-orinlari/sifat?turi=tekshirish" className={chip(turi === 'tekshirish')}>
          {tr('Текшириш керак')}
        </Link>
        <Link href="/ish-orinlari/sifat?turi=muddat" className={chip(turi === 'muddat')}>
          {tr('Муддат')}
        </Link>
        <Link href="/ish-orinlari/sifat?turi=eski" className={chip(turi === 'eski')}>
          {tr('Янгиланмаган')}
        </Link>
        <Link href="/ish-orinlari/sifat?turi=hammasi" className={chip(turi === 'hammasi')}>
          {tr('Ҳаммаси')} ({hammasi.length})
        </Link>
      </div>

      {korinadi.length === 0 ? (
        <div className="karta p-8 text-center text-sm text-ink-muted">
          {tr('Шартга мос эълон йўқ.')}
        </div>
      ) : (
        <ul className="space-y-2">
          {korinadi.slice(skip, skip + take).map((e) => (
            <li key={e.id} className="karta p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/ish-orinlari/${e.id}`} className="text-sm font-semibold text-ink hover:text-accent">
                    {e.lavozim}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {e.korxonaNomi} · {tr(e.mahalla)} ·{' '}
                    {e.ishBeruvchidan ? tr('иш берувчи қўйган') : tr('ходим қўйган')}
                    {e.amalQilishMuddati && ` · ${tr('муддат:')} ${formatDate(e.amalQilishMuddati).split(',')[0]}`}
                  </p>
                </div>
              </div>
              <div className="mt-2.5">
                <ElonSifatiBlogi belgilar={e.belgilar} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sahifalash
        yol="/ish-orinlari/sifat"
        joriy={sahifa}
        jami={korinadi.length}
        hajm={SAHIFA_HAJMI}
        filtrlar={{ turi: searchParams.turi }}
      />

      <details className="karta p-4 text-xs text-ink-muted">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          {tr('Белгилар қандай аниқланади')}
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{tr('Маош «гумонли» — ЎЗ туманимиздаги бошқа фаол эълонлар медианасидан 4 баравар катта ёки кичик бўлса (мутлақ чегара ёзилмаган: у ўзгариб туради).')}</li>
          <li>{tr('«Такрор телефон» — бир рақам икки ва ундан кўп ҳар хил корхона эълонида турса.')}</li>
          <li>{tr('«Пул сўрайдиган ибора» — олдиндан тўлов, депозит, кафолатланган даромад каби иборалар.')}</li>
          <li>{tr('Булар ЭВРИСТИКА: хато қилиши мумкин. Тизим эълонни ўзи ўчирмайди ва «фирибгар» демайди — қарор ходимники.')}</li>
        </ul>
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
      <p className={`raqam mt-2 text-2xl font-bold ${xavfli ? 'text-danger' : 'text-ink'}`}>{qiymat}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>
    </div>
  );
}
