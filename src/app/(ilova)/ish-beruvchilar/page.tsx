import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { joriySessiya } from '@/lib/auth';
import { faolBeruvchilar, moderatsiyaRoyxati } from '@/lib/ish-beruvchi';
import { Moderatsiya } from '@/components/beruvchi/moderatsiya';
import { formatDate, formatPhone } from '@/lib/utils';

/**
 * ============================================================
 *  ИШ БЕРУВЧИЛАР
 *
 *  ── Нега бу саҳифа керак ──
 *
 *  Иш берувчи ботдан ариза юборади ва ЖАВОБ КУТАДИ. Агар
 *  модерация фақат ботда бўлса, жавоб раҳбар ботга уланган
 *  пайтгача кечикади — бугун эса 78 та ходимдан 70 таси
 *  уланмаган.
 *
 *  Кечиккан жавоб — йўқолган иш ўрни: иш берувчи бошқа йўл
 *  билан одам топади ва иккинчи марта ёзмайди.
 * ============================================================
 */

export const metadata: Metadata = { title: 'Ish beruvchilar' };

export const dynamic = 'force-dynamic';

const HOLAT_NOMI: Record<string, string> = {
  TASDIQLANDI: 'Тасдиқланган',
  RAD_ETILDI: 'Рад этилган',
  KUTILMOQDA: 'Кутилмоқда',
};

const NISHON: Record<string, string> = {
  TASDIQLANDI: 'bg-ok-bg text-ok',
  RAD_ETILDI: 'bg-danger-bg text-danger',
  KUTILMOQDA: 'bg-warn-bg text-warn',
};

export default async function IshBeruvchilarSahifasi() {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/ish-beruvchilar')) redirect(boshSahifa(sessiya.rol));

  const [navbat, royxat] = await Promise.all([moderatsiyaRoyxati(), faolBeruvchilar(50)]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Иш берувчилар')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Корхоналар бот орқали ариза беради ва бўш иш ўрни эълонини ўзи қўяди')}
        </p>
      </div>

      {/*
        Навбат ТЕПАДА: раҳбар бу саҳифани «нимани тасдиқлашим
        керак» деб очади, «рўйхатни кўраман» деб эмас.
      */}
      <Moderatsiya
        beruvchilar={navbat.beruvchilar.map((b) => ({
          id: b.id,
          korxonaNomi: b.korxonaNomi,
          masulShaxs: b.masulShaxs,
          telefon: b.telefon,
          mahallaNomi: b.mahalla?.nomiKirill ?? null,
          createdAt: b.createdAt,
        }))}
        elonlar={navbat.elonlar.map((e) => ({
          id: e.id,
          lavozim: e.lavozim,
          korxonaNomi: e.korxonaNomi,
          mahallaNomi: e.mahalla.nomiKirill,
          ornlarSoni: e.ornlarSoni,
          /* Маош базада сўмда, экранда млн сўмда */
          maoshMln: e.maosh ? Math.round(Number(e.maosh) / 1_000_000) : null,
          telefon: e.telefon,
          masulShaxs: e.ishBeruvchi?.masulShaxs ?? null,
          createdAt: e.createdAt,
        }))}
      />

      {/* ── КЎРИБ ЧИҚИЛГАНЛАР ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">{tr('Кўриб чиқилган корхоналар')}</h2>

        {royxat.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            {tr('Ҳали биронта корхона рўйхатдан ўтмаган.')}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 pr-3 font-semibold">{tr('Корхона')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('Масъул шахс')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('Телефон')}</th>
                  <th className="pb-2 pr-3 font-semibold">{tr('МФЙ')}</th>
                  <th className="pb-2 pr-3 text-right font-semibold">{tr('Эълон')}</th>
                  <th className="pb-2 font-semibold">{tr('Ҳолати')}</th>
                </tr>
              </thead>
              <tbody>
                {royxat.map((b) => (
                  <tr key={b.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3 font-medium text-ink">{tr(b.korxonaNomi)}</td>
                    <td className="py-2 pr-3 text-ink-muted">{tr(b.masulShaxs)}</td>
                    <td className="py-2 pr-3 text-ink-muted">{formatPhone(b.telefon)}</td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {b.mahalla ? tr(b.mahalla.nomiKirill) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink-muted">
                      {b._count.elonlar}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${NISHON[b.holati]}`}
                      >
                        {tr(HOLAT_NOMI[b.holati] ?? b.holati)}
                      </span>
                      {b.holati === 'RAD_ETILDI' && b.radSababi && (
                        <span className="ml-2 text-xs text-ink-faint">{tr(b.radSababi)}</span>
                      )}
                      {b.halQilinganSana && (
                        <span className="ml-2 text-xs text-ink-faint">
                          {formatDate(b.halQilinganSana).split(',')[0]}
                          {b.halQilgan ? ` · ${tr(b.halQilgan.fullName)}` : ''}
                        </span>
                      )}
                    </td>
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
