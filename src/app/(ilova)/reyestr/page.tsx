import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { BadgeCheck, FileClock, Link2Off, ShieldQuestion } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { joriyXodim } from '@/lib/sahifa-auth';
import {
  DALIL_MUDDATI_KUN,
  tasdiqHisobi,
  tasdiqsizlar,
  tekshirishKutayotganlar } from '@/lib/joylashuv-dalili';
import { bogliqsizDalillar } from '@/lib/joylashish';
import { Hisoblash } from '@/components/shared/hisoblash';
import { DALIL_HOLATI_NOMI, DALIL_NOMI } from '@/lib/dalil-nomlari';
import { ReyestrYuklash } from '@/components/dalil/reyestr-yuklash';
import { formatDate } from '@/lib/utils';
import { oxirgiImportlar } from '@/lib/reyestr-yuklash';

/**
 * ============================================================
 *  ЖОЙЛАШТИРИШНИ ТАСДИҚЛАШ
 *
 *  ── Нега алоҳида саҳифа ──
 *
 *  «Ишга жойлаштирилди» ҳозирча битта босиш: ходим тугмани
 *  босади, туман рақами биттага ошади, ва ҳеч ким
 *  текширмайди. Ҳоким эса ўша рақамни юқорига ҳисобот қилиб
 *  беради.
 *
 *  Бу саҳифанинг бутун вазифаси — ИККИНЧИ рақамни кўрсатиш:
 *  улардан нечтаси ҳужжат билан тасдиқланган.
 *
 *  Иккови ёнма-ён турганда савол ўзи туғилади ва уни ҳеч ким
 *  бекитиб қўя олмайди.
 * ============================================================
 */

export const metadata: Metadata = { title: 'Joylashtirishni tasdiqlash' };

export const dynamic = 'force-dynamic';

const raqam = (n: number) => n.toLocaleString('ru-RU');

/**
 * ── НЕГА РЎЙХАТДА ──
 *
 * Аввал ҳаммаси «ҳужжатсиз» деб бир хил кўринарди ва
 * ходим ҳар бирини очиб кўришга мажбур эди.
 *
 * `ish-almashdi` — энг чалғитадигани: одамда ТАСДИҚЛАНГАН
 * ҳужжат бор, аммо у ЭСКИ ишга тегишли.
 */
const SABAB_NOMI: Record<string, string> = {
  'dalil-yoq': 'Ҳужжат умуман йўқ',
  tekshirilmagan: 'Киритилган, текширилмаган',
  'rad-etilgan': 'Ҳужжат рад этилган',
  'ish-almashdi': 'Иш алмашган — эски ҳужжат ярамайди',
};

/** Import holati matni (rangdan tashqari matn bilan ham tushuntiriladi) */
const IMPORT_HOLATI: Record<string, string> = {
  KORILDI: 'Кўрилди — ёзилмаган',
  YOZILMOQDA: 'Ёзилмоқда',
  YOZILDI: 'Ёзилди',
  XATO: 'Узилди — давом эттириш мумкин',
};

const SABAB_RANGI: Record<string, string> = {
  'dalil-yoq': 'text-ink-muted',
  tekshirilmagan: 'text-warn',
  'rad-etilgan': 'text-danger',
  'ish-almashdi': 'text-warn',
};

export default async function ReyestrSahifasi() {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/reyestr')) redirect(boshSahifa(sessiya.rol));

  const [hisob, royxat, navbat, bogliqsizlar, importlar] = await Promise.all([
    tasdiqHisobi(),
    tasdiqsizlar(undefined, 50),
    tekshirishKutayotganlar(50),
    bogliqsizDalillar(50),
    /* Importlar tarixi qo'shimcha: u yiqilsa asosiy sahifa ochilaveradi */
    oxirgiImportlar(10).catch(() => []),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Жойлаштиришни тасдиқлаш')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('«Жойлаштирилди» деган ҳар бир ёзув ҳужжат билан тасдиқланиши керак')}
        </p>
      </div>

      {/* ── ИККИТА РАҚАМ ── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Katak
          nomi={tr('Жойлаштирилди деб турибди')}
          qiymat={raqam(hisob.davoQilingan)}
          izoh={tr('тизимдаги ёзув')}
          hisoblash={{
            usuli:
              'Ҳолати «Жойлаштирилди» ёки «Тасдиқланди» бўлган фуқаролар сони. ' +
              'Архивга ўтганлар ҲИСОБГА КИРМАЙДИ.',
            manbasi: 'Фуқаро анкетасидаги ҳолат майдони — ходим белгилайди',
            yol: '/ishsizlar',
            ogohlik:
              'Бу рақам ХОДИМНИНГ АЙТГАНИ. Ҳужжат билан тасдиқланиши ёнидаги ' +
              'иккинчи рақамда кўринади.',
          }}
        />
        <Katak
          nomi={tr('Ҳужжат билан тасдиқланган')}
          qiymat={raqam(hisob.tasdiqlangan)}
          izoh={`${hisob.tasdiqFoizi.toString().replace('.', ',')}%`}
          rang="text-ok"
          ikonka={<BadgeCheck className="h-4 w-4" />}
          hisoblash={{
            usuli:
              'Жойлаштирилганлар ичидан камида БИТТА далили «Тасдиқланди» ' +
              'ҳолатида бўлганлар сони. Фоиз — шу соннинг юқоридаги рақамга нисбати.',
            manbasi: 'Жойлашув далиллари жадвали — ҳар далил ким тасдиқлаганини сақлайди',
            yol: '/reyestr',
            ogohlik:
              'Бу рақам «қачондир тасдиқланган» деганини билдиради. ҲОЗИРГИ иши ' +
              'тасдиқланганлар ёнидаги учинчи рақамда.',
          }}
        />
        <Katak
          nomi={tr('Ҳозирги иши тасдиқланган')}
          qiymat={raqam(hisob.joriyIshTasdiqlangan)}
          izoh={tr('далил АЙНАН шу ишга боғланган')}
          hisoblash={{
            usuli:
              'Фуқаронинг ОЧИҚ иш воқеасига боғланган ва тасдиқланган далили ' +
              'борлар сони. Эски ишнинг далили ҳисобга КИРМАЙДИ.',
            manbasi: 'Ишга жойлашиш воқеалари ва уларга боғланган далиллар',
            yol: '/reyestr',
            ogohlik:
              'Бу рақам «ҳужжат билан тасдиқланган» дан КАМ бўлиши табиий: далил ' +
              'ишга боғланиши учун иш воқеаси ёзилган бўлиши керак, эски ёзувларда ' +
              'эса у йўқ.',
          }}
        />
        <Katak
          nomi={tr('Муддати ўтган')}
          qiymat={raqam(hisob.muddatiOtgan)}
          izoh={`${DALIL_MUDDATI_KUN} ${tr('кундан ортиқ')}`}
          rang={hisob.muddatiOtgan > 0 ? 'text-danger' : undefined}
          ikonka={hisob.muddatiOtgan > 0 ? <ShieldQuestion className="h-4 w-4" /> : undefined}
          hisoblash={{
            usuli:
              `Ишга кирган санадан ${DALIL_MUDDATI_KUN} кун ўтган-у, ҳозирги иши ` +
              'ҳамон тасдиқланмаганлар. Сана ёзилмаган бўлса, ёзувнинг сўнгги ' +
              'ўзгариш санаси олинади.',
            manbasi: 'Фуқаронинг «ишга кирган санаси» ва унинг далиллари',
            yol: '/reyestr',
          }}
        />
      </section>

      {/*
        ── ТАСДИҚНИНГ ТАРКИБИ ──

        «Тасдиқланган» деган битта рақам камлик қиларди.
        Унинг ичида ИККИ ХИЛ нарса бор эди: расмий,
        текширилган канал орқали келгани ва администратор
        қўлда юклаган файлдан келгани.

        Иккови бир хил кўринса, «тасдиқланган» сўзи маъносини
        йўқотади.

        Пастдаги учта — тасдиқланмаганлар. Улар ҳам бир хил
        ЭМАС: рад этилган далил «далил йўқ» дан ЁМОНРОҚ,
        чунки у «далил ёлғон чиқди» дегани.
      */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">{tr('Тасдиқнинг таркиби')}</h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('«Тасдиқланган» сўзи нимага таянади — ҳар бир даража алоҳида')}
        </p>

        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <Qator
            nomi={tr('Расмий манба билан')}
            qiymat={hisob.rasmiyTasdiq}
            izoh={tr('текширилган интеграция — қўлда текширув керак эмас')}
            rang="text-ok"
          />
          <Qator
            nomi={tr('Қўлда текширилиб тасдиқланган')}
            qiymat={hisob.qoldaTasdiq}
            izoh={tr('мутахассис ҳужжатни кўриб тасдиқлаган')}
            rang="text-ok"
          />
          <Qator
            nomi={tr('Ҳужжат киритилган, текширилмаган')}
            qiymat={hisob.tekshiruvKutayotgan}
            izoh={tr('навбатда турибди — ҳисобга ҲАЛИ кирмайди')}
            rang={hisob.tekshiruvKutayotgan > 0 ? 'text-warn' : undefined}
          />
          <Qator
            nomi={tr('Далил РАД ЭТИЛГАН')}
            qiymat={hisob.radEtilgan}
            izoh={tr('«далил йўқ» дан ёмонроқ — ҳужжат ёлғон чиққан')}
            rang={hisob.radEtilgan > 0 ? 'text-danger' : undefined}
          />
          <Qator
            nomi={tr('Фақат ходим билдирган')}
            qiymat={hisob.faqatXodim}
            izoh={tr('ҳужжат умуман йўқ — бу далил эмас, хабар')}
            rang={hisob.faqatXodim > 0 ? 'text-warn' : undefined}
          />
          <Qator
            nomi={tr('Умуман далили йўқ')}
            qiymat={hisob.dalilsiz}
            izoh={tr('ҳеч нарса киритилмаган')}
            rang={hisob.dalilsiz > 0 ? 'text-danger' : undefined}
          />
        </dl>

        {(hisob.bogliqsizTasdiq > 0 || hisob.voqeasizlar > 0) && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              {tr('Боғлаш керак бўлган иш')}
            </p>
            <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Qator
                nomi={tr('Тасдиқ бор-у, ишга боғланмаган')}
                qiymat={hisob.bogliqsizTasdiq}
                izoh={tr('қайси ишга тегишли экани ёзилмаган — тахмин қилинмайди')}
              />
              <Qator
                nomi={tr('Иш воқеаси ёзилмаган')}
                qiymat={hisob.voqeasizlar}
                izoh={tr('анкета сақланганда ёзилади — эски ёзувларда йўқ')}
              />
            </dl>
          </div>
        )}
      </section>

      {/*
        Юклаш блоки рақамлардан КЕЙИН.

        Раҳбар саҳифани «нечта тасдиқланган» деб очади, «файл
        юклаш» деб эмас. Форма тепада турса, у ҳар сафар
        рақамни ахтариб пастга тушарди.
      */}
      <ReyestrYuklash />

      {importlar.length > 0 && (
        <section className="karta p-4 sm:p-5" aria-labelledby="importlar-sarlavha">
          <h2 id="importlar-sarlavha" className="text-base font-semibold text-ink">
            {tr('Охирги юклашлар')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Ҳар юклаш ўз изи билан сақланади: ҳолати, ёзилган ва такрор сони, узилган бўлса — сабаби.')}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-xs">
              <thead className="text-ink-faint">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">{tr('Сана')}</th>
                  <th className="py-1.5 pr-3 font-medium">{tr('Ҳолати')}</th>
                  <th className="py-1.5 pr-3 font-medium">{tr('Сатр')}</th>
                  <th className="py-1.5 pr-3 font-medium">{tr('Ёзилган')}</th>
                  <th className="py-1.5 pr-3 font-medium">{tr('Такрор')}</th>
                  <th className="py-1.5 font-medium">{tr('Файл изи')}</th>
                </tr>
              </thead>
              <tbody className="text-ink-muted">
                {importlar.map((y) => (
                  <tr key={y.id} className="border-t border-line align-top">
                    <td className="py-1.5 pr-3 tabular-nums">{formatDate(y.reyestrSanasi)}</td>
                    <td className="py-1.5 pr-3">
                      {IMPORT_HOLATI[y.holati] ? tr(IMPORT_HOLATI[y.holati]) : y.holati}
                      {y.holati === 'XATO' && y.xatoMatni ? (
                        <span className="block text-danger">{y.xatoMatni}</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">{y.satrSoni}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{y.holati === 'KORILDI' ? '—' : y.yozilgan}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{y.holati === 'KORILDI' ? '—' : y.takror}</td>
                    <td className="py-1.5 font-mono">{y.faylIzi.slice(0, 10)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/*
        ── ТЕКШИРИШ КУТАЁТГАН ҲУЖЖАТЛАР ──

        Маҳалла ходими шартнома нусхасини киритади ва у
        «текширилмаган» бўлиб туради. Мутахассис уни ФАҚАТ
        ўша фуқаронинг саҳифасини очганда кўрарди — яъни
        тасодифан.

        Ҳужжат келган-у, ҳеч ким қарамаган ҳолат энг
        ачинарлиси: иш бажарилган, рақам эса ҳамон
        «тасдиқланмаган» бўлиб турибди.
      */}
      {navbat.length > 0 && (
        <section className="karta p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <FileClock className="h-4 w-4 text-warn" />
            {tr('Текшириш кутаётган ҳужжатлар')} · {navbat.length}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Ходим киритди — бандлик маркази тасдиқлаши керак. Исмга босинг.')}
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 pr-3 font-semibold">{tr('Ф.И.Ш.')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('МФЙ')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('Ҳужжат')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('Киритди')}</th>
                  <th className="pb-2 font-semibold">{tr('Сана')}</th>
                </tr>
              </thead>
              <tbody>
                {navbat.map((n) => (
                  <tr key={n.dalilId} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/ishsizlar/${n.ishsizId}`}
                        className="font-medium text-ink transition-colors hover:text-accent"
                      >
                        {tr(n.fish)}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-ink-muted">{tr(n.mahallaNomi)}</td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {tr(DALIL_NOMI[n.turi])}
                      {n.izoh ? <span className="text-ink-faint"> · {tr(n.izoh)}</span> : null}
                    </td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {n.kiritganNomi ? tr(n.kiritganNomi) : '—'}
                    </td>
                    <td className="py-2 text-ink-faint">
                      {formatDate(n.createdAt).split(',')[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/*
        ── ВОҚЕАГА БОҒЛАНМАГАН ДАЛИЛЛАР ──

        `joylashishId` устуни қўшилгунга қадар киритилган
        барча далилда у БЎШ. Улар ёлғон эмас — шунчаки қайси
        ишга тегишли экани ёзилмаган.

        Тахмин қилиб ЎЗИМИЗ боғламаймиз: одамда иккита иш
        бўлса, тахмин 50 фоиз ҳолда нотўғри боғланишни
        ясарди — ва у ҳисоботда ҲАҚИҚИЙ боғланиш бўлиб
        кўринарди. Нотўғри боғланган далил йўқ далилдан
        ёмонроқ.

        Шунинг учун улар РЎЙХАТ бўлиб чиқади ва одам
        боғлайди.
      */}
      {bogliqsizlar.length > 0 && (
        <section className="karta p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Link2Off className="h-4 w-4 text-warn" />
            {tr('Ишга боғланмаган далиллар')} · {bogliqsizlar.length}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Қайси ишга тегишли экани ёзилмаган. Тизим ЎЗИ тахмин қилмайди — исмга босиб боғлайсиз.')}
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 pr-3 font-semibold">{tr('Ф.И.Ш.')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('МФЙ')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('Ҳужжат')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('Ҳолати')}</th>
                  <th className="pb-2 font-semibold">{tr('Эҳтимолий иш')}</th>
                </tr>
              </thead>
              <tbody>
                {bogliqsizlar.map((b) => (
                  <tr key={b.dalilId} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/ishsizlar/${b.ishsizId}`}
                        className="font-medium text-ink transition-colors hover:text-accent"
                      >
                        {tr(b.fish)}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-ink-muted">{tr(b.mahallaNomi)}</td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {tr(DALIL_NOMI[b.turi as keyof typeof DALIL_NOMI] ?? b.turi)}
                    </td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {tr(DALIL_HOLATI_NOMI[b.holati as keyof typeof DALIL_HOLATI_NOMI] ?? b.holati)}
                    </td>
                    <td className="py-2 text-ink-faint">
                      {b.taklif ? (
                        <>
                          {tr(b.taklif.korxonaNomi)}
                          {/*
                            Одамда иккитадан кўп иш бўлса,
                            таклифга ИШОНИБ бўлмайди — бу
                            ерда огоҳлантириш турибди.
                          */}
                          {b.ishlarSoni > 1 && (
                            <span className="text-warn">
                              {' '}
                              · {tr('диққат')}: {b.ishlarSoni} {tr('иш')}
                            </span>
                          )}
                        </>
                      ) : (
                        tr('очиқ иш йўқ')
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── ИШ РЎЙХАТИ ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">
          {tr('Ҳужжатсиз жойлаштиришлар')}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Муддати ўтган-у, ҳали тасдиқланмаганлар. Ҳар бирига ҳужжат топиш ёки ҳолатни қайтариш керак.')}
        </p>

        {royxat.length === 0 ? (
          <p className="mt-3 text-sm text-ok">
            {tr('Муддати ўтган жойлаштириш йўқ.')}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 pr-3 font-semibold">{tr('Ф.И.Ш.')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('МФЙ')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('Иш жойи')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('Сабаби')}</th>
                  <th className="pb-2 text-right font-semibold">{tr('Кун')}</th>
                </tr>
              </thead>
              <tbody>
                {royxat.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/ishsizlar/${r.id}`}
                        className="font-medium text-ink transition-colors hover:text-accent"
                      >
                        {tr(r.fish)}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-ink-muted">{tr(r.mahallaNomi)}</td>
                    <td className="py-2 pr-3 text-ink-muted">{r.ishJoyi ? tr(r.ishJoyi) : '—'}</td>
                    {/*
                      Сабаб ходимга ҲАР ХИЛ қарор беради:
                      рад этилган ҳужжатни қайта сўраш керак,
                      иш алмашганида эса янги шартнома керак.
                    */}
                    <td className={`py-2 pr-3 ${SABAB_RANGI[r.sabab]}`}>
                      {tr(SABAB_NOMI[r.sabab])}
                    </td>
                    <td className="py-2 text-right tabular-nums text-danger">{raqam(r.kun)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Katak({
  nomi,
  qiymat,
  izoh,
  rang,
  ikonka,
  hisoblash }: {
  nomi: string;
  qiymat: string;
  izoh: string;
  rang?: string;
  ikonka?: React.ReactNode;
  /**
   * Рақам ҚАНДАЙ чиққани.
   *
   * Аввал рақам ялангоч турарди ва «бу қандай ҳисобланган»
   * деган саволга жавоб йўқ эди. Ҳоким йиғилишда рақамни
   * айтади, кимдир «нотўғри» дейди — ва баҳсни ҳал
   * қиладиган ҳеч нарса қолмайди.
   */
  hisoblash?: { usuli: string; manbasi: string; yol?: string; ogohlik?: string };
}) {
  const tr = matnchi();
  return (
    <div className="karta p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-muted">
        {ikonka}
        {nomi}
      </p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${rang ?? 'text-ink'}`}>{qiymat}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>
      {hisoblash && (
        <Hisoblash
          usuli={hisoblash.usuli}
          manbasi={hisoblash.manbasi}
          yol={hisoblash.yol}
          ogohlik={hisoblash.ogohlik}
          tr={tr}
        />
      )}
    </div>
  );
}

/**
 * Таркиб қатори.
 *
 * Каталардан ФАРҚ қилади: бу рақамлар бир-бирини тўлдиради
 * ва ёнма-ён ўқилиши керак. Йирик катак бўлса, улар
 * мустақил кўрсаткич бўлиб кўринарди.
 */
function Qator({
  nomi,
  qiymat,
  izoh,
  rang }: {
  nomi: string;
  qiymat: number;
  izoh: string;
  rang?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/40 pb-2 last:border-0">
      <div className="min-w-0">
        <dt className="text-sm font-medium text-ink">{nomi}</dt>
        <dd className="text-xs text-ink-faint">{izoh}</dd>
      </div>
      <span className={`shrink-0 text-lg font-semibold tabular-nums ${rang ?? 'text-ink-muted'}`}>
        {qiymat.toLocaleString('ru-RU')}
      </span>
    </div>
  );
}
