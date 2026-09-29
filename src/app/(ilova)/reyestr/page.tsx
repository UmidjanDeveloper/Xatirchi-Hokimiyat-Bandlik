import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { BadgeCheck, FileClock, ShieldQuestion } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { joriyXodim } from '@/lib/sahifa-auth';
import {
  DALIL_MUDDATI_KUN,
  tasdiqHisobi,
  tasdiqsizlar,
  tekshirishKutayotganlar } from '@/lib/joylashuv-dalili';
import { DALIL_NOMI } from '@/lib/dalil-nomlari';
import { ReyestrYuklash } from '@/components/dalil/reyestr-yuklash';
import { formatDate } from '@/lib/utils';

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

export default async function ReyestrSahifasi() {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/reyestr')) redirect(boshSahifa(sessiya.rol));

  const [hisob, royxat, navbat] = await Promise.all([
    tasdiqHisobi(),
    tasdiqsizlar(undefined, 50),
    tekshirishKutayotganlar(50),
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
        />
        <Katak
          nomi={tr('Ҳужжат билан тасдиқланган')}
          qiymat={raqam(hisob.tasdiqlangan)}
          izoh={`${hisob.tasdiqFoizi.toString().replace('.', ',')}%`}
          rang="text-ok"
          ikonka={<BadgeCheck className="h-4 w-4" />}
        />
        <Katak
          nomi={tr('Давлат реестри билан')}
          qiymat={raqam(hisob.reyestrBilan)}
          izoh={tr('энг ишончли далил')}
        />
        <Katak
          nomi={tr('Муддати ўтган')}
          qiymat={raqam(hisob.muddatiOtgan)}
          izoh={`${DALIL_MUDDATI_KUN} ${tr('кундан ортиқ')}`}
          rang={hisob.muddatiOtgan > 0 ? 'text-danger' : undefined}
          ikonka={hisob.muddatiOtgan > 0 ? <ShieldQuestion className="h-4 w-4" /> : undefined}
        />
      </section>

      {/*
        Юклаш блоки рақамлардан КЕЙИН.

        Раҳбар саҳифани «нечта тасдиқланган» деб очади, «файл
        юклаш» деб эмас. Форма тепада турса, у ҳар сафар
        рақамни ахтариб пастга тушарди.
      */}
      <ReyestrYuklash />

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
  ikonka }: {
  nomi: string;
  qiymat: string;
  izoh: string;
  rang?: string;
  ikonka?: React.ReactNode;
}) {
  return (
    <div className="karta p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-muted">
        {ikonka}
        {nomi}
      </p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${rang ?? 'text-ink'}`}>{qiymat}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>
    </div>
  );
}
