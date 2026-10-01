import Link from 'next/link';
import { matnchi } from '@/lib/alifbo-server';
import {
  HISOBLASH_USULI,
  kuzatuvKorsatkichlari,
  type BosqichKorsatkichi,
  type KuzatuvKorsatkichlari,
} from '@/lib/kuzatuv';

/**
 * "Barqaror bandlik va daromad" ko'rsatkichlari (hokim, rahbar).
 *
 * ── Raqam hech qachon yolg'iz turmaydi ──
 *
 * "Ishda qolish 87%" yolg'iz yozilsa, o'qigan odam bu hamma
 * joylashganlar haqida deb o'ylaydi. Aslida bu faqat javobi MA'LUM
 * bo'lganlar orasida. Shuning uchun har foizning yonida "n dan m"
 * va "noma'lum" ustuni, manba va hisoblash usuli turadi.
 *
 * Xato bu yerda yutiladi: panelning qolgan qismi ochilaveradi.
 */
export async function KuzatuvKorsatkichBlogi({ mahallaId }: { mahallaId?: string }) {
  const tr = matnchi();

  let k: KuzatuvKorsatkichlari;
  try {
    k = await kuzatuvKorsatkichlari(mahallaId);
  } catch (e) {
    console.error('Kuzatuv ko‘rsatkichlarini hisoblab bo‘lmadi:', e);
    return null;
  }

  const foiz = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
  const raqam = (n: number) => n.toLocaleString('ru-RU');
  const som = (n: number | null) =>
    n === null ? '—' : `${n > 0 ? '+' : ''}${raqam(n)} ${tr('сўм/ой')}`;

  const d = k.daromad;

  return (
    <section className="karta space-y-4 p-4 sm:p-5" aria-labelledby="kzk-sarlavha">
      <div>
        <h2 id="kzk-sarlavha" className="text-sm font-bold text-ink">
          {tr('Барқарор бандлик: 30/60/90 кунлик кузатув')}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Жойлашган фуқаро ишда қолдими ва оила даромади қандай ўзгарди. «Маълум эмас» алоҳида кўрсатилади.')}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-faint">{tr('Жойлашган фуқаролар')}</dt>
          <dd className="raqam text-xl font-bold text-ink">{raqam(k.joylashganFuqarolar)}</dd>
          <dd className="text-[11px] text-ink-faint">{tr('иш алмаштирган бир марта саналади')}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-faint">{tr('Иш воқеалари')}</dt>
          <dd className="raqam text-xl font-bold text-ink">{raqam(k.ishVoqealari)}</dd>
          <dd className="text-[11px] text-ink-faint">
            {tr('шундан бир неча ишда бўлган фуқаро:')} {raqam(k.birNechtaIshdaBolganlar)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-faint">{tr('Ҳисоблаш санаси')}</dt>
          <dd className="raqam text-xl font-bold text-ink">
            {k.hozir.toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent' })}
          </dd>
        </div>
      </dl>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">
            {tr('30, 60 ва 90 кунлик кузатув натижалари')}
          </caption>
          <thead>
            <tr className="border-b border-line text-xs text-ink-muted">
              <th scope="col" className="py-2 text-left font-semibold">
                {tr('Босқич')}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {tr('Муддати ўтган ишлар')}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {tr('Ишда қолган')}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {tr('Кетган')}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {tr('Маълум эмас')}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {tr('Ишда қолиш (маълумлар орасида)')}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {tr('Маълумот қамрови')}
              </th>
            </tr>
          </thead>
          <tbody>
            {k.bosqichlar.map((b) => (
              <Qator key={b.kun} b={b} foiz={foiz} raqam={raqam} tr={tr} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md bg-surface-muted p-3 text-xs text-ink-muted">
        <p className="font-medium text-ink">{tr('Даромад ўзгариши')}</p>
        {d.juftlar === 0 ? (
          <p className="mt-1">
            {tr('Ҳисоблаш учун маълумот йўқ: бошланғич ва ҳозирги даромад ИККАЛАСИ маълум бўлган оила ҳали йўқ.')}
            {d.nomalum > 0 && ` ${tr('Кузатув ёзуви бор, лекин даромади тўлиқ эмас:')} ${d.nomalum}.`}
          </p>
        ) : (
          <p className="mt-1">
            {tr('Икки қиймат маълум бўлган')} <strong>{d.juftlar}</strong> {tr('та оила бўйича: медиана')}{' '}
            <strong>{som(d.medianaOzgarish)}</strong> ({tr('ошган')} {d.oshgan}, {tr('тушган')} {d.tushgan},{' '}
            {tr('ўзгармаган')} {d.ozgarmagan}).{' '}
            {d.nomalum > 0 && `${tr('Маълум эмас:')} ${d.nomalum}. `}
            {tr('Манба:')} {tr('фуқаро билдирган')} {d.manbalar.FUQARO_BILDIRGAN},{' '}
            {tr('ходим қайд этган')} {d.manbalar.XODIM_QAYD_ETGAN}, {tr('текширилган')}{' '}
            {d.manbalar.TEKSHIRILGAN}.
          </p>
        )}
      </div>

      <details className="text-xs text-ink-muted">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          {tr('Бу рақамлар қандай ҳисобланган')}
        </summary>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="font-medium text-ink">{tr('Давр')}</dt>
            <dd>{tr(HISOBLASH_USULI.davr)}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">{tr('Манба')}</dt>
            <dd>{tr(HISOBLASH_USULI.manba)}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">{tr('Қоидалар')}</dt>
            <dd>
              <ul className="list-disc space-y-0.5 pl-5">
                {HISOBLASH_USULI.qoida.map((q) => (
                  <li key={q}>{tr(q)}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">{tr('Эҳтиёт бўлинг')}</dt>
            <dd>{tr(HISOBLASH_USULI.ogohlantirish)}</dd>
          </div>
        </dl>
        <p className="mt-2">
          <Link href="/kuzatuv" className="text-accent hover:underline">
            {tr('Муддати келган текширувлар рўйхати')}
          </Link>
        </p>
      </details>
    </section>
  );
}

function Qator({
  b,
  foiz,
  raqam,
  tr,
}: {
  b: BosqichKorsatkichi;
  foiz: (x: number | null) => string;
  raqam: (n: number) => string;
  tr: (m: string) => string;
}) {
  const malum = b.qolgan + b.ketgan;
  const t = b.manbaQolgan;
  return (
    <tr className="border-b border-line/60 align-top last:border-0">
      <th scope="row" className="py-2.5 pr-3 text-left font-semibold text-ink">
        {b.kun} {tr('кун')}
      </th>
      <td className="raqam py-2.5 text-right text-ink-muted">{raqam(b.kohort)}</td>
      <td className="raqam py-2.5 text-right text-ink">
        {raqam(b.qolgan)}
        {b.qolgan > 0 && (
          <span className="block text-[10px] text-ink-faint">
            {tr('фуқаро')} {t.FUQARO_BILDIRGAN} · {tr('ходим')} {t.XODIM_QAYD_ETGAN} · {tr('текшир.')}{' '}
            {t.TEKSHIRILGAN}
          </span>
        )}
      </td>
      <td className="raqam py-2.5 text-right text-ink">{raqam(b.ketgan)}</td>
      <td className="raqam py-2.5 text-right text-ink-muted">
        {raqam(b.nomalum)}
        {b.nomalum > 0 && (
          <span className="block text-[10px] text-ink-faint">
            {tr('текширилмаган')} {b.nomalumSabablari.tekshirilmagan} · {tr('боғланилмаган')}{' '}
            {b.nomalumSabablari.boglanilmadi} · {tr('жавобсиз')} {b.nomalumSabablari.javobsiz}
          </span>
        )}
      </td>
      <td className="raqam py-2.5 text-right font-semibold text-ink">
        {foiz(b.qolishDarajasi)}
        {malum > 0 && (
          <span className="block text-[10px] font-normal text-ink-faint">
            {b.qolgan} {tr('/')} {malum} {tr('маълумдан')}
          </span>
        )}
      </td>
      <td className="raqam py-2.5 text-right text-ink-muted">{foiz(b.malumotQamrovi)}</td>
    </tr>
  );
}
