import { redirect } from 'next/navigation';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { Archive } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { joriySessiya, mahallaFiltri } from '@/lib/auth';
import { arxivRoyxati } from '@/lib/arxiv';
import { QaytarishTugmasi } from '@/components/arxiv/qaytarish-tugmasi';
import { formatDate } from '@/lib/utils';

/**
 * ============================================================
 *  «O'CHIRILGANLAR» SAHIFASI
 *
 *  ── Nega alohida sahifa ──
 *
 *  Xatoni QILGAN odam uni o'zi tuzatishi kerak. Mahalla xodimi
 *  adashib o'chirsa — darhol qaytarsin, administratorga
 *  qo'ng'iroq qilib, tushuntirib, kutib o'tirmasin.
 *
 *  Bu sahifa bo'lmasa, arxivlashning ma'nosi ham yo'q edi:
 *  ma'lumot saqlanardi-yu, unga hech kim yeta olmasdi.
 *
 *  ── Kim nimani ko'radi ──
 *
 *  Mahalla xodimi faqat O'Z mahallasinikini. Bandlik markazi va
 *  administrator — butun tumanni. Hokim bu sahifaga umuman
 *  kirmaydi: uning roli ko'rish, o'zgartirish emas.
 * ============================================================
 */

export const dynamic = 'force-dynamic';

export default async function OchirilganlarSahifasi() {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  /*
   * ── РОЛ ҚЎРИҚЧИСИ ──
   *
   * Менюда бу саҳифа кўринмаслиги ЕТАРЛИ ЭМАС: манзилни
   * қўлда ёзиб очиш мумкин. Middleware эса фақат «сессия
   * борми» деб қарайди — у ҳимоя эмас, йўналтирувчи.
   *
   * Қоида `navigatsiya.ts` даги МЕНЮ рўйхатидан ўқилади,
   * яъни менюда ким кўрса — шу очади. Иккита рўйхат
   * бўлганда бири эскириб қоларди.
   */
  if (!yolgaRuxsat(sessiya.rol, '/ochirilganlar')) redirect(boshSahifa(sessiya.rol));
  if (sessiya.rol === 'HOKIM') redirect('/panel');

  const filtr = mahallaFiltri(sessiya);
  const { xonadonlar, fuqarolar } = await arxivRoyxati(filtr.mahallaId);
  const jami = xonadonlar.length + fuqarolar.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha flex items-center gap-2">
          <Archive className="h-5 w-5 shrink-0 text-ink-faint" aria-hidden="true" />
          {tr('Ўчирилганлар')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr(
            'Ўчирилган хатлов ва фуқаролар шу ерда сақланади. Адашиб ўчирилган бўлса — «Қайтариш» тугмасини босинг, ҳаммаси жойига қайтади.'
          )}
        </p>
      </div>

      {jami === 0 ? (
        <div className="karta p-8 text-center">
          <Archive className="mx-auto h-8 w-8 text-ink-faint" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-ink">{tr('Ҳеч нарса ўчирилмаган')}</p>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Ўчирилган хатлов ёки фуқаро шу ерда пайдо бўлади.')}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-ink-faint">
            {tr('Жами')}: <span className="raqam font-bold text-ink">{jami}</span> {tr('та ёзув')}
          </p>

          {xonadonlar.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-ink">
                {tr('Хатловлар')} · <span className="raqam">{xonadonlar.length}</span>
              </h2>
              {xonadonlar.map((x) => (
                <div
                  key={x.id}
                  className="karta flex flex-wrap items-start justify-between gap-3 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{tr(x.oilaBoshligi)}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {x.manzil} · {tr(x.mahalla.nomiKirill)} {tr('МФЙ')}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {tr('Ўчирган:')} {x.arxivchi ? tr(x.arxivchi) : tr('номаълум')}
                      {x.arxivSanasi ? ` · ${formatDate(x.arxivSanasi)}` : ''}
                    </p>
                    {x.arxivSababi && (
                      <p className="mt-1 text-xs italic text-ink-muted">«{x.arxivSababi}»</p>
                    )}
                  </div>
                  <QaytarishTugmasi turi="xonadon" id={x.id} nomi={x.oilaBoshligi} />
                </div>
              ))}
            </section>
          )}

          {fuqarolar.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-ink">
                {tr('Фуқаролар')} · <span className="raqam">{fuqarolar.length}</span>
              </h2>
              {fuqarolar.map((p) => (
                <div
                  key={p.id}
                  className="karta flex flex-wrap items-start justify-between gap-3 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{tr(p.fish)}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {tr(p.mahalla.nomiKirill)} {tr('МФЙ')}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {tr('Ўчирган:')} {p.arxivchi ? tr(p.arxivchi) : tr('номаълум')}
                      {p.arxivSanasi ? ` · ${formatDate(p.arxivSanasi)}` : ''}
                    </p>
                    {p.arxivSababi && (
                      <p className="mt-1 text-xs italic text-ink-muted">«{p.arxivSababi}»</p>
                    )}
                  </div>
                  <QaytarishTugmasi turi="fuqaro" id={p.id} nomi={p.fish} />
                </div>
              ))}
            </section>
          )}

          <p className="quti-ogoh text-xs leading-relaxed">
            {tr(
              'Хонадон қайтарилганда ундаги фуқаролар ҳам ўзи қайтади. Бекор қилинган топшириқлар эса қайтарилмайди — улар орада бошқача ҳал қилинган бўлиши мумкин. Керак бўлса тизим янгисини ўзи яратади.'
            )}
          </p>
        </>
      )}
    </div>
  );
}
