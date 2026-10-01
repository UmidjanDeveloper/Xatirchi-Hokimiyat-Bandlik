import { AlertTriangle, Info } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import {
  HISOBLASH_USULI,
  KICHIK_NAMUNA,
  NATIJA_KUTISH_KUNI,
  kursFoizi,
  type KursKorsatkichlari,
} from '@/lib/kurslar';

/**
 * Kurs samaradorligi: har foiz yonida "n / m" va qaysi guruhdan ekani.
 *
 * "Nechta yozildi" bilan samaradorlik o'lchanmaydi: kursni nechta kishi
 * tamomladi, tamomlaganlardan nechtasi (tasdiqlangan) ishga joylashdi -
 * va bular qancha kishidan ekani. Maxraj kichik bo'lsa foizga ishonmaslik
 * kerakligi aytiladi. Ish topgani qayd etilmagan kishi "topmagan" deb
 * hisoblanmaydi.
 */
export function KursKorsatkichBlogi({ k, sarlavha }: { k: KursKorsatkichlari; sarlavha?: string }) {
  const tr = matnchi();

  if (k.jami === 0) {
    return (
      <section className="karta p-4 sm:p-5" aria-labelledby="kk-sarlavha">
        <h2 id="kk-sarlavha" className="text-sm font-bold text-ink">
          {sarlavha ?? tr('Курслар натижаси')}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{tr('Ҳали ёзувлар йўқ: кўрсаткич ҳисоблаш учун маълумот етарли эмас.')}</p>
      </section>
    );
  }

  const boshlashMaxraji = k.boshlagan + k.kelmagan;
  const hal = k.tamomlagan + k.tashlagan;
  const n = k.natija;

  /** Bitta qator: sarlavha, n/m va foiz (maxraj bo'lsa), izoh */
  const qator = (nom: string, son: number, maxraj: number, izoh?: string, kichikOgoh = true) => {
    const f = kursFoizi(son, maxraj);
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-line py-2 first:border-t-0">
        <div className="min-w-0">
          <p className="text-sm text-ink">{tr(nom)}</p>
          {izoh && <p className="text-xs text-ink-faint">{izoh}</p>}
        </div>
        <p className="shrink-0 text-right">
          <span className="text-base font-bold tabular-nums text-ink">
            {son} / {maxraj}
          </span>
          {f !== null ? (
            <span className="ml-2 text-sm tabular-nums text-ink-muted">{f}%</span>
          ) : (
            <span className="ml-2 text-xs text-ink-faint">{tr('ҳисобланмайди')}</span>
          )}
          {kichikOgoh && maxraj > 0 && maxraj < KICHIK_NAMUNA && (
            <span className="ml-2 inline-flex items-center gap-1 rounded bg-warn-bg px-1.5 py-0.5 text-[11px] font-medium text-warn">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {tr('намуна кичик')}
            </span>
          )}
        </p>
      </div>
    );
  };

  return (
    <section className="karta p-4 sm:p-5" aria-labelledby="kk-sarlavha">
      <h2 id="kk-sarlavha" className="text-sm font-bold text-ink">
        {sarlavha ?? tr('Курслар натижаси')}
      </h2>
      <p className="mt-1 text-xs text-ink-faint">
        {tr('Ёзилган:')} {k.jami} · {tr('бекор қилинган (ҳисобга кирмайди):')} {k.bekor}
      </p>

      <div className="mt-3">
        {qator('Дарсга келганлар', k.boshlagan, boshlashMaxraji, tr('келди / (келди + келмади)'))}
        {qator('Курсни тамомлаганлар', k.tamomlagan, hal, tr('тамомлади / (тамомлади + ташлаб кетди)'))}
        {qator(
          'Тамомлаганлардан — тасдиқланган ишга жойлашганлар',
          n.tasdiqlangan,
          n.muddatiOtgan,
          `${tr('фақат курсни тамомлаганига')} ${NATIJA_KUTISH_KUNI} ${tr('кундан ортиқ бўлганлар; иш курсдан КЕЙИН бошланган ва далил билан тасдиқланган')}`
        )}
        {qator('Суҳбатга чиққанлар', n.suhbatga, n.muddatiOtgan, tr('шу гуруҳ бўйича'))}
        {k.davomat.yozuvlar > 0 &&
          qator(
            'Давомат (қатнашган / жами дарс кунлари)',
            k.davomat.qatnashgan,
            k.davomat.jami,
            `${k.davomat.yozuvlar} ${tr('та ёзув бўйича')}; ${k.davomat.nomalum} ${tr('тасида давомат маълум эмас')}`,
            false
          )}
      </div>

      <ul className="mt-3 space-y-1.5 text-xs text-ink-muted">
        <li>
          {tr('Иш боғланган, аммо далили тасдиқланмаган:')} <b className="tabular-nums text-ink">{n.tasdiqlanmagan}</b>
        </li>
        <li>
          {tr('Иш топгани қайд этилмаган (бу «топмаган» дегани эмас):')} <b className="tabular-nums text-ink">{n.qaydEtilmagan}</b>
        </li>
        <li>
          {tr('Ҳали эрта (тамомлаганига')} {NATIJA_KUTISH_KUNI} {tr('кун ўтмаган):')} <b className="tabular-nums text-ink">{n.haliErta}</b>
        </li>
        <li>
          {tr('Ҳозир ўқиётганлар:')} <b className="tabular-nums text-ink">{k.hozirOqiyapti}</b>
        </li>
        {k.yangilanmagan > 0 && (
          <li className="flex items-start gap-1.5 text-warn">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {tr('Ҳолати янгиланмаган ёзувлар:')} <b className="tabular-nums">{k.yangilanmagan}</b> —{' '}
              {tr('курс бошланган/тугаган, аммо ёзув ҳолати белгиланмаган. Улар юқоридаги улушларга киритилмаган.')}
            </span>
          </li>
        )}
        {k.tamomlagan > 0 && (
          <li>
            {tr('Сертификат:')} {tr('олган')} {k.sertifikat.bor} · {tr('олмаган')} {k.sertifikat.yoq} · {tr('маълум эмас')}{' '}
            {k.sertifikat.nomalum}
          </li>
        )}
      </ul>

      <details className="mt-3 text-xs text-ink-faint">
        <summary className="inline-flex cursor-pointer items-center gap-1 hover:text-accent">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          {tr('Қандай ҳисобланади')}
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {HISOBLASH_USULI.map((m) => (
            <li key={m}>{tr(m)}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
