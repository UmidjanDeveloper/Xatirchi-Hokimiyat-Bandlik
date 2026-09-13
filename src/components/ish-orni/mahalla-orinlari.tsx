import Link from 'next/link';
import { Briefcase, Phone } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { formatPhone } from '@/lib/utils';
import { KASB_YONALISHI, kirillcha } from '@/lib/constants';
import { MOSLIK_KORINISHI } from '@/lib/moslik';
import { mahallaOrinlari } from '@/lib/taqsimot';

/**
 * ============================================================
 *  «МАҲАЛЛАМДАГИ БЎШ ИШ ЎРИНЛАРИ»
 *
 *  Илгари бўш иш ўрни эълони фақат бандлик марказида кўринарди.
 *  Маҳалла ходими эса — одамни БИЛАДИГАН киши — ундан бехабар
 *  эди. Натижада эълон базада «бор» бўлиб турар, ишсиз одам
 *  рўйхатда «бор» бўлиб турар, иккови эса учрашмасди.
 *
 *  Энди ходим ўз саҳифасида кўради: қайси эълон, нечта ўрин
 *  бўш ва ЎЗ маҳалласидаги қайси фуқаро тўғри келади — исми
 *  ва телефони билан. У ўша одамга қўнғироқ қилади.
 *
 *  ── Нега исм кўрсатилади ──
 *
 *  «3 та мос номзод бор» деган рақамдан ходим ҳеч нима қила
 *  олмайди: кимлигини билмаса, қўнғироқ қилолмайди. Фуқаро
 *  ўша маҳалланинг ўзиники ва ходим уни аллақачон танийди —
 *  бу янги маълумот эмас, фақат бир жойга йиғилгани.
 *
 *  ── Нега бўш бўлса ҳам кўрсатилади ──
 *
 *  Кўрсатилмайди. Эълон йўқ бўлса ёки ҳеч бир фуқаро мос
 *  келмаса, блок УМУМАН чиқмайди: ходимга ҳар кирганда бўш
 *  карточка кўрсатиш ишончни камайтиради.
 * ============================================================
 */
export async function MahallaOrinlari({ mahallaId }: { mahallaId: string }) {
  const tr = matnchi();
  const royxat = await mahallaOrinlari(mahallaId);
  if (royxat.length === 0) return null;

  return (
    <section className="karta space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="bolim-sarlavha">
          <span className="bolim-raqam">
            <Briefcase className="h-4 w-4" />
          </span>
          <span>{tr('Маҳалламдаги фуқароларга тўғри келадиган иш ўринлари')}</span>
        </h2>
        <p className="mt-2 text-xs text-ink-faint">
          {tr('Бандлик маркази киритган эълонлар. Рўйхат сизнинг маҳаллангиздаги ишсиз фуқаролар билан таққосланган — мос келгани кўрсатилган. Фуқарога ўзингиз хабар беринг ва бандлик марказига йўналтиринг.')}
        </p>
      </div>

      <div className="space-y-3">
        {royxat.map(({ orin, hisob, nomzodlar }) => (
          <div key={orin.id} className="rounded-md border border-line p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{orin.lavozim}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {orin.korxonaNomi}
                  {orin.yonalish ? ` · ${tr(kirillcha(KASB_YONALISHI, orin.yonalish))}` : ''}
                  {` · ${tr(orin.mahalla.nomiKirill)} ${tr('МФЙ')}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="raqam text-sm font-semibold text-ink">
                  {hisob.qolgan} / {hisob.jami}
                </p>
                <p className="text-xs text-ink-faint">{tr('ўрин бўш')}</p>
              </div>
            </div>

            {orin.maosh != null && (
              <p className="raqam mt-1.5 text-xs text-ink-muted">
                {Number(orin.maosh).toLocaleString('ru-RU')} {tr('сўм')}
              </p>
            )}

            <div className="mt-3 space-y-1.5 border-t border-line pt-3">
              <p className="text-xs font-medium text-ink-muted">
                {tr('Сизнинг маҳаллангиздан мос келадиганлар:')}
              </p>
              {nomzodlar.map((n) => {
                const k = MOSLIK_KORINISHI[n.moslik.daraja];
                const ichi = (
                  <>
                    <span className="font-medium text-ink">{n.fish}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${k.sinf}`}>
                      {tr(k.nomi)} · {n.moslik.ball}%
                    </span>
                    {n.telefon && (
                      <span className="raqam ml-auto flex items-center gap-1 text-xs text-ink-muted">
                        <Phone className="h-3 w-3" />
                        {formatPhone(n.telefon)}
                      </span>
                    )}
                  </>
                );
                const sinf =
                  'flex flex-wrap items-center gap-2 rounded px-1.5 py-1 text-sm';

                /*
                  Ҳавола ХОНАДОН саҳифасига, фуқаронинг шахсий
                  анкетасига ЭМАС: маҳалла ходими уни кўрмайди
                  (ташхис ва ишга тайёрлик каби маълумот бор) ва
                  босилса «/xatlov» га қайтариб юборилади — ходим
                  эса «ҳавола бузуқ» деб ўйларди.
                */
                return n.householdId ? (
                  <Link
                    key={n.id}
                    href={`/xatlov/${n.householdId}`}
                    className={`${sinf} transition-colors hover:bg-surface-muted`}
                  >
                    {ichi}
                  </Link>
                ) : (
                  <div key={n.id} className={sinf}>
                    {ichi}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
