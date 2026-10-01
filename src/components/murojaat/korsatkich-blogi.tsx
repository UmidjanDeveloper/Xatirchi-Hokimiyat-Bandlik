import { AlertTriangle, Info } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import {
  MUROJAAT_HISOBLASH_USULI,
  MUROJAAT_KICHIK_NAMUNA,
  murojaatFoizi,
  type MurojaatKorsatkichlari,
} from '@/lib/murojaatlar';

/**
 * Murojaatlar ko'rsatkichi: har foiz yonida "n / m".
 *
 * Fuqaro o'zi yozmaydi, shuning uchun bu raqamlar FAQAT xodim qayd etgan
 * murojaatlar haqida. "Muddatida javob" faqat javob berilganlar bo'yicha;
 * muddati uzaytirilgan javoblar soni alohida ko'rsatiladi: uzaytirilgan
 * muddatga nisbatan "vaqtida" hisobi yumshoqroq bo'ladi.
 */
export function MurojaatKorsatkichBlogi({ k, sarlavha }: { k: MurojaatKorsatkichlari; sarlavha?: string }) {
  const tr = matnchi();

  if (k.jami === 0) {
    return (
      <section className="karta p-4 sm:p-5" aria-labelledby="mk-sarlavha">
        <h2 id="mk-sarlavha" className="text-sm font-bold text-ink">
          {sarlavha ?? tr('Мурожаатлар натижаси')}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          {tr('Ҳали қайд этилган мурожаат йўқ. Бу «мурожаат бўлмади» дегани эмас: мурожаатни ходим қайд этади.')}
        </p>
      </section>
    );
  }

  const j = k.javobBerilgan + k.yopilgan;
  const vaqtida = murojaatFoizi(k.javob.vaqtida, j);
  const ochiq = k.yangi + k.jarayonda;

  return (
    <section className="karta p-4 sm:p-5" aria-labelledby="mk-sarlavha">
      <h2 id="mk-sarlavha" className="text-sm font-bold text-ink">
        {sarlavha ?? tr('Мурожаатлар натижаси')}
      </h2>
      <p className="mt-1 text-xs text-ink-faint">{tr('Фақат ходим қайд этган мурожаатлар бўйича.')}</p>

      <ul className="mt-3 space-y-1 text-sm text-ink-muted">
        <li>
          {tr('Жами қайд этилган:')} <b className="tabular-nums text-ink">{k.jami}</b>
        </li>
        <li>
          {tr('Очиқ:')} <b className="tabular-nums text-ink">{ochiq}</b>{' '}
          <span className="text-xs text-ink-faint">
            ({tr('янги')} {k.yangi}, {tr('кўриб чиқилмоқда')} {k.jarayonda})
          </span>
        </li>
        {k.muddat.kechikkan > 0 && (
          <li className="flex items-start gap-1.5 text-danger">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {tr('Муддати ЎТГАН очиқ мурожаатлар:')} <b className="tabular-nums">{k.muddat.kechikkan}</b>
            </span>
          </li>
        )}
        <li className="text-xs">
          {tr('Муддат бугун:')} <b className="tabular-nums text-ink">{k.muddat.bugun}</b> · {tr('3 кун ичида:')}{' '}
          <b className="tabular-nums text-ink">{k.muddat.yaqin}</b>
        </li>
      </ul>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line py-2">
        <div className="min-w-0">
          <p className="text-sm text-ink">{tr('Муддатида жавоб берилганлар')}</p>
          <p className="text-xs text-ink-faint">{tr('муддатида / (жавоб берилган + ёпилган)')}</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="text-base font-bold tabular-nums text-ink">
            {k.javob.vaqtida} / {j}
          </span>
          {vaqtida !== null ? (
            <span className="ml-2 text-sm tabular-nums text-ink-muted">{vaqtida}%</span>
          ) : (
            <span className="ml-2 text-xs text-ink-faint">{tr('ҳисобланмайди')}</span>
          )}
          {j > 0 && j < MUROJAAT_KICHIK_NAMUNA && (
            <span className="ml-2 inline-flex items-center gap-1 rounded bg-warn-bg px-1.5 py-0.5 text-[11px] font-medium text-warn">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {tr('намуна кичик')}
            </span>
          )}
        </p>
      </div>

      <ul className="space-y-1.5 border-t border-line pt-3 text-xs text-ink-muted">
        <li>
          {tr('Муддатидан кейин жавоб берилган:')} <b className="tabular-nums text-ink">{k.javob.kechikib}</b>
        </li>
        <li>
          {tr('Шундан муддати узайтирилган (улар учун «вақтида» узайтирилган муддатга нисбатан):')}{' '}
          <b className="tabular-nums text-ink">{k.javob.uzaytirilgan}</b>
        </li>
        {k.javob.medianaKun !== null && (
          <li>
            {tr('Қабулдан жавобгача ўртача (медиана):')} <b className="tabular-nums text-ink">{k.javob.medianaKun}</b>{' '}
            {tr('кун')}
          </li>
        )}
        <li>
          {tr('Қайта очилган мурожаатлар:')}{' '}
          <b className="tabular-nums text-ink">
            {k.qaytaOchilgan.soni} / {k.qaytaOchilgan.maxraj}
          </b>{' '}
          {k.qaytaOchilgan.jamiMarta > k.qaytaOchilgan.soni && `(${tr('жами')} ${k.qaytaOchilgan.jamiMarta} ${tr('марта')})`}
        </li>
      </ul>

      <details className="mt-3 text-xs text-ink-faint">
        <summary className="inline-flex cursor-pointer items-center gap-1 hover:text-accent">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          {tr('Қандай ҳисобланади')}
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {MUROJAAT_HISOBLASH_USULI.map((m) => (
            <li key={m}>{tr(m)}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
