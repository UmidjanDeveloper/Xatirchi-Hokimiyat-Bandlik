import { AlertTriangle, Info } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import {
  BUYURTMA_HISOBLASH_USULI,
  BUYURTMA_KICHIK_NAMUNA,
  TASDIQ_KUTISH_KUNI,
  buyurtmaFoizi,
  type BuyurtmaKorsatkichlari,
} from '@/lib/buyurtmalar';

/**
 * Mahalliy buyurtmalar ko'rsatkichi: har foiz yonida "n / m".
 *
 * "Bajarildi" ni muvaffaqiyat deb sanamaydi: faqat ikki tomon tasdiqlagan
 * buyurtmalar. Bajarilganiga yaqinda bo'lgan (hali tasdiq kutilayotgan)
 * buyurtmalar maxrajga kirmaydi; nizo alohida ko'rsatiladi. Narx yig'indisi
 * faqat tasdiqlanganlardan va u to'lov amalga oshganini bildirmaydi.
 */
export function BuyurtmaKorsatkichBlogi({ k, sarlavha }: { k: BuyurtmaKorsatkichlari; sarlavha?: string }) {
  const tr = matnchi();

  if (k.jami === 0) {
    return (
      <section className="karta p-4 sm:p-5" aria-labelledby="bk-sarlavha">
        <h2 id="bk-sarlavha" className="text-sm font-bold text-ink">
          {sarlavha ?? tr('Буюртмалар натижаси')}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{tr('Ҳали буюртма йўқ: кўрсаткич ҳисоблаш учун маълумот етарли эмас.')}</p>
      </section>
    );
  }

  const t = k.tasdiq;
  const maxraj = t.ikkiTomonlama + t.nizo + t.kechikkan;
  const f = buyurtmaFoizi(t.ikkiTomonlama, maxraj);

  return (
    <section className="karta p-4 sm:p-5" aria-labelledby="bk-sarlavha">
      <h2 id="bk-sarlavha" className="text-sm font-bold text-ink">
        {sarlavha ?? tr('Буюртмалар натижаси')}
      </h2>
      <p className="mt-1 text-xs text-ink-faint">
        {tr('Қабул қилинган:')} {k.jami} · {tr('бекор қилинган (ҳисобга кирмайди):')} {k.bekor}
      </p>

      <ul className="mt-3 space-y-1 text-sm text-ink-muted">
        <li>
          {tr('Жараёнда:')} <b className="tabular-nums text-ink">{k.yangi + k.tayinlandi + k.kelishildi}</b>{' '}
          <span className="text-xs text-ink-faint">
            ({tr('янги')} {k.yangi}, {tr('ижрочи белгиланган')} {k.tayinlandi}, {tr('нарх келишилган')} {k.kelishildi})
          </span>
        </li>
        <li>
          {tr('Бажарилди деб белгиланган:')} <b className="tabular-nums text-ink">{k.bajarilgan}</b>
        </li>
      </ul>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line py-2">
        <div className="min-w-0">
          <p className="text-sm text-ink">{tr('Икки томонлама тасдиқланганлар')}</p>
          <p className="text-xs text-ink-faint">
            {tr('тасдиқланган / (тасдиқланган + низо + тасдиқсиз қолган)')}
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="text-base font-bold tabular-nums text-ink">
            {t.ikkiTomonlama} / {maxraj}
          </span>
          {f !== null ? (
            <span className="ml-2 text-sm tabular-nums text-ink-muted">{f}%</span>
          ) : (
            <span className="ml-2 text-xs text-ink-faint">{tr('ҳисобланмайди')}</span>
          )}
          {maxraj > 0 && maxraj < BUYURTMA_KICHIK_NAMUNA && (
            <span className="ml-2 inline-flex items-center gap-1 rounded bg-warn-bg px-1.5 py-0.5 text-[11px] font-medium text-warn">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {tr('намуна кичик')}
            </span>
          )}
        </p>
      </div>

      <ul className="space-y-1.5 border-t border-line pt-3 text-xs text-ink-muted">
        <li>
          {tr('Тасдиқ кутилмоқда (бажарилганига')} {TASDIQ_KUTISH_KUNI} {tr('кун ўтмаган — ҳали эрта):')}{' '}
          <b className="tabular-nums text-ink">{t.kutilmoqda}</b>
        </li>
        <li>
          {tr('Узоқ вақт тасдиқланмаган:')} <b className="tabular-nums text-ink">{t.kechikkan}</b>
        </li>
        <li className={t.nizo > 0 ? 'flex items-start gap-1.5 text-warn' : ''}>
          {t.nizo > 0 && <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          <span>
            {tr('Низо (бир томон эътироз билдирган):')} <b className="tabular-nums">{t.nizo}</b>
          </span>
        </li>
        {t.ikkiTomonlama > 0 && (
          <li>
            {tr('Келишилган нарх йиғиндиси (тасдиқланганлардан, тўлов текширилмаган):')}{' '}
            <b className="tabular-nums text-ink">
              {k.narx.yigindi.toLocaleString('ru-RU').replace(/ /g, ' ')} {tr('сўм')}
            </b>{' '}
            ({k.narx.narxiBor} {tr('та буюртма бўйича')}
            {k.narx.narxiYoq > 0 ? `; ${k.narx.narxiYoq} ${tr('тасида нарх маълум эмас')}` : ''})
          </li>
        )}
      </ul>

      <details className="mt-3 text-xs text-ink-faint">
        <summary className="inline-flex cursor-pointer items-center gap-1 hover:text-accent">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          {tr('Қандай ҳисобланади')}
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {BUYURTMA_HISOBLASH_USULI.map((m) => (
            <li key={m}>{tr(m)}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
