import Link from 'next/link';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { formatDate } from '@/lib/utils';
import {
  ROZILIK_NOMI,
  YOLLANMA_NOMI,
  elonYollanmalari,
} from '@/lib/yollanma';
import { YollanmaBoshqaruvi } from './yollanma-boshqaruvi';

const YAKUNIY = ['ISHGA_QABUL', 'ISH_BERUVCHI_RAD', 'FUQARO_RAD', 'BEKOR'];

/**
 * E'longa yo'llangan nomzodlar: rozilik, ish beruvchiga yuborilgan
 * ma'lumot, natija VA uning MANBASI.
 *
 * "Ishga qabul qilindi (ish beruvchi bildirgan)" - tasdiq emas: shu
 * blok joylashish hali qayd etilmaganini alohida ogohlantiradi.
 *
 * Xato bu yerda yutiladi: bu ikkilamchi blok, e'lon sahifasi
 * yo'llanma jadvali sabab ochilmay qolmasligi kerak.
 */
export async function YollanmalarBlogi({
  vacancyId,
  vacancyIdBilan,
  beruvchiBor,
}: {
  vacancyId: string;
  /** Joylashtirish qayd etilgan fuqarolarning id lari (e'lon bo'yicha) */
  vacancyIdBilan: string[];
  beruvchiBor: boolean;
}) {
  const tr = matnchi();

  try {
    const royxat = await elonYollanmalari(vacancyId);
    if (royxat.length === 0) return null;

    return (
      <section className="karta p-4 sm:p-5" aria-labelledby="yl-sarlavha">
        <h2 id="yl-sarlavha" className="text-sm font-bold text-ink">
          {tr('Иш берувчига йўлланган номзодлар')}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Иш берувчининг сўзи «билдирилган» ҳисобланади, тасдиқланган жойлашиш эмас: жойлашиш воқеаси ва далил алоҳида киритилади.')}
        </p>

        <ul className="mt-3 space-y-3">
          {royxat.map((y) => {
            const yakunlangan = YAKUNIY.includes(y.holati);
            const qabulQilingan = y.holati === 'ISHGA_QABUL';
            const joylashishQayd = qabulQilingan && vacancyIdBilan.includes(y.ishsiz.id);
            return (
              <li key={y.id} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/ishsizlar/${y.ishsiz.id}`}
                      className="text-sm font-semibold text-ink hover:text-accent"
                    >
                      {y.ishsiz.fish}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {tr(y.ishsiz.mahalla.nomiKirill)} · {tr('йўллади:')} {y.yaratgan.fullName} ·{' '}
                      {formatDate(y.createdAt).split(',')[0]}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                    {tr(YOLLANMA_NOMI[y.holati])}
                  </span>
                </div>

                <p className="mt-2 text-xs text-ink-muted">
                  {y.rozilik ? (
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
                      {tr('Розилик:')} {y.roziligiUsuli ? tr(ROZILIK_NOMI[y.roziligiUsuli]) : '—'}
                      {y.roziligiSana && `, ${formatDate(y.roziligiSana).split(',')[0]}`}
                    </span>
                  ) : (
                    <span>{tr('Розилик ҳали қайд этилмаган — иш берувчига маълумот юборилмаган')}</span>
                  )}
                  {y.ulashilganSana && (
                    <span>
                      {' · '}
                      {tr('Иш берувчига юборилди:')} {formatDate(y.ulashilganSana).split(',')[0]} (
                      {y.ulashilgan.join(', ')})
                    </span>
                  )}
                </p>

                {y.natijaSanasi && (
                  <p className="mt-1 text-xs text-ink-muted">
                    {tr('Натижа:')} {formatDate(y.natijaSanasi).split(',')[0]} ·{' '}
                    {y.natijaManbasi === 'ISH_BERUVCHI_BILDIRGAN'
                      ? tr('иш берувчи билдирган')
                      : tr('ходим қайд этган')}
                    {y.natijaIzohi && ` · ${y.natijaIzohi}`}
                  </p>
                )}

                {qabulQilingan && !joylashishQayd && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-md bg-warn-bg px-2.5 py-1.5 text-xs text-warn" role="status">
                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {tr('Иш берувчи ишга қабул қилганини билдирган, аммо жойлаштириш ҳали қайд этилмаган. «Жойлаштириш» орқали қайд этинг ва далил киритинг.')}
                  </p>
                )}

                <YollanmaBoshqaruvi
                  id={y.id}
                  rozilik={y.rozilik}
                  yuborilgan={y.ulashilganSana !== null}
                  beruvchiBor={beruvchiBor}
                  yakunlangan={yakunlangan}
                />
              </li>
            );
          })}
        </ul>
      </section>
    );
  } catch (e) {
    console.error('Yollanmalar blokini yuklab bo‘lmadi:', e);
    return null;
  }
}
