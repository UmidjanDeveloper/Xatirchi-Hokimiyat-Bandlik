import { ArrowDown, ArrowUp, History, Minus } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { formatDate } from '@/lib/utils';
import { farovonlikHisobi, taqqosla, xonadonTarixi, type Ozgarish } from '@/lib/xonadon-tarixi';

/**
 * ============================================================
 *  ХОНАДОН ТАРИХИ
 *
 *  «Бу оила йил бошида қандай эди, ҳозир қандай» — шу саволга
 *  жавоб.
 *
 *  ── Нега битта рақам етмайди ──
 *
 *  «Фаровонлик 58» деган сон ўзича ҳеч нима билдирмайди: у
 *  яхшими, ёмонми — таққослайдиган нарса йўқ. «40 дан 58 га
 *  чиқди» эса дарҳол маъно беради.
 *
 *  Шунинг учун бу блок ҳар доим ИККИ нуқтани кўрсатади ва
 *  сабабини ҳам ёзади: нима ўзгаргани учун балл ўсди.
 *
 *  ── Нега кўрсаткич очиқ ──
 *
 *  Балл ҳисоби ёпиқ формула бўлмаслиги керак: ходим «нега 40?»
 *  деб сўраганда жавоб бўлиши шарт. Шунинг учун бўлаклар
 *  рўйхати ҳам чиқади — қайси қисмдан қанча балл келгани.
 * ============================================================
 */

const raqam = (n: number) => n.toLocaleString('ru-RU');

/** Ishorasi bilan: +12, −8 */
const ishorali = (n: number) => (n > 0 ? `+${raqam(n)}` : n < 0 ? `−${raqam(-n)}` : '0');

/** O'zgarish yaxshi tomongami */
function yonalish(o: Ozgarish): 'yaxshi' | 'yomon' | 'betaraf' {
  if (o.farq === 0) return 'betaraf';
  return (o.farq > 0) === o.kopYaxshi ? 'yaxshi' : 'yomon';
}

const SINF = {
  yaxshi: 'text-ok',
  yomon: 'text-danger',
  betaraf: 'text-ink-faint',
} as const;

export async function TarixBlogi({
  householdId,
  /** Hozirgi holat - hali kesma olinmagan bo'lsa ham ko'rsatish uchun */
  joriy,
}: {
  householdId: string;
  joriy: Parameters<typeof farovonlikHisobi>[0];
}) {
  const tr = matnchi();
  const kesmalar = await xonadonTarixi(householdId);

  const hozirgi = farovonlikHisobi(joriy);

  /*
   * Иккитадан кам кесма бўлса, таққослаш йўқ — аммо блок
   * барибир кўрсатилади: ходим кўрсаткич БОРлигини ва у нимадан
   * ҳисобланишини билиши керак. Акс ҳолда иккинчи хатловдан
   * кейин «бу қаердан чиқди» деган савол туғиларди.
   */
  const avval = kesmalar.length >= 2 ? kesmalar[0] : null;
  const oxirgi = kesmalar.length >= 2 ? kesmalar[kesmalar.length - 1] : null;
  const ozgarishlar = avval && oxirgi ? taqqosla(avval, oxirgi) : [];

  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex items-start gap-2.5">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-ink">{tr('Хонадон тарихи')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Ҳар якуний хатловда шу хонадоннинг ўша пайтдаги ҳолати кесма бўлиб сақланади')}
          </p>
        </div>
      </div>

      {/* ── Ҳозирги кўрсаткич ── */}
      <div className="mt-4 rounded-md border border-line bg-surface-muted p-3.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs text-ink-faint">{tr('Фаровонлик кўрсаткичи')}:</span>
          <span className="text-2xl font-bold tabular-nums text-ink">{hozirgi.ball}</span>
          <span className="text-xs text-ink-faint">/ 100</span>

          {avval && oxirgi && (
            <span
              className={`ml-1 text-sm font-semibold tabular-nums ${
                SINF[yonalish({ ...ozgarishlar[0], farq: oxirgi.farovonlikBali - avval.farovonlikBali })]
              }`}
            >
              {ishorali(oxirgi.farovonlikBali - avval.farovonlikBali)}
            </span>
          )}
        </div>

        {/*
          Огоҳлантириш ЯШИРИЛМАЙДИ. Бу кўрсаткич расмий мезон
          эмас ва шундай деб ўқилиши хавфли бўларди: кимдир уни
          нафақа тайинлашга асос қилиб олиши мумкин.
        */}
        <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
          {tr('Бу — анкета жавобларидан ҳисобланган ички кўрсаткич, РАСМИЙ камбағаллик мезони эмас. Оилаларни бир-бири билан таққослаш учун эмас, ШУ хонадонни вақт кесимида кузатиш учун.')}
        </p>

        {/* ── Балл нимадан чиқди ── */}
        <dl className="mt-3 space-y-1.5 border-t border-line pt-3">
          {hozirgi.bolaklar.map((b) => (
            <div key={b.nomi} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <dt className="font-medium text-ink-muted">{tr(b.nomi)}</dt>
              <dd className="tabular-nums text-ink">
                {b.ball}
                <span className="text-ink-faint"> / {b.eng}</span>
              </dd>
              <dd className="w-full text-[11px] text-ink-faint sm:ml-auto sm:w-auto">
                {tr(b.izoh)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Таққослаш ── */}
      {avval && oxirgi ? (
        <div className="mt-4">
          <h3 className="text-xs font-bold text-ink">
            {tr('Ўзгариш')}: {formatDate(avval.olinganSana).split(',')[0]} →{' '}
            {formatDate(oxirgi.olinganSana).split(',')[0]}
          </h3>

          <div className="mt-2.5 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-faint">
                  <th className="py-1.5 pr-3 font-medium">{tr('Кўрсаткич')}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{tr('Аввал')}</th>
                  <th className="py-1.5 pr-3 text-right font-medium">{tr('Ҳозир')}</th>
                  <th className="py-1.5 text-right font-medium">{tr('Фарқ')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums text-ink-muted">
                {ozgarishlar.map((o) => {
                  const y = yonalish(o);
                  const Ikonka = o.farq === 0 ? Minus : o.farq > 0 ? ArrowUp : ArrowDown;
                  return (
                    <tr key={o.nomi} className="border-b border-line/60 last:border-0">
                      <td className="py-1.5 pr-3 text-ink">{tr(o.nomi)}</td>
                      <td className="py-1.5 pr-3 text-right">{raqam(o.avval)}</td>
                      <td className="py-1.5 pr-3 text-right">{raqam(o.hozir)}</td>
                      <td className={`py-1.5 text-right font-semibold ${SINF[y]}`}>
                        <span className="inline-flex items-center gap-1">
                          <Ikonka className="h-3 w-3" aria-hidden="true" />
                          {ishorali(o.farq)}
                          <span className="font-normal text-ink-faint">{tr(o.birlik)}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Кесмалар рўйхати ── */}
          {kesmalar.length > 2 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-ink-muted transition-colors hover:text-ink">
                {tr('Барча кесмалар')} ({kesmalar.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {kesmalar.map((k) => (
                  <li key={k.id} className="flex items-baseline gap-2 text-ink-muted">
                    <span className="tabular-nums">{formatDate(k.olinganSana).split(',')[0]}</span>
                    <span className="ml-auto font-semibold tabular-nums text-ink">
                      {k.farovonlikBali}
                    </span>
                    <span className="text-ink-faint">{tr('балл')}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <p className="mt-4 text-xs text-ink-faint">
          {kesmalar.length === 1
            ? tr('Ҳозирча битта кесма бор. Кейинги хатловдан сўнг таққослаш пайдо бўлади.')
            : tr('Ҳали кесма олинмаган. Хатлов якуний юборилганда биринчи кесма сақланади.')}
        </p>
      )}
    </section>
  );
}
