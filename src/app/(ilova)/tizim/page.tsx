import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { matnchi } from '@/lib/alifbo-server';
import { prisma } from '@/lib/prisma';
import { sanaMaydoni } from '@/lib/sana-maydoni';
import { joriyXodim } from '@/lib/sahifa-auth';
import { formatDate } from '@/lib/utils';
import {
  ISH_BAHOSI_NOMI,
  NAVBAT_USHLANISH_SOATI,
  ZAXIRA_ESKIRISH_KUNI,
  ishlarHolati,
  navbatHolati,
  xatolarHolati,
  zaxiraHolati,
  type IshBahosi,
} from '@/lib/tizim-kuzatuvi';
import { maxfiyniTozala } from '@/lib/maxfiy';
import { NavbatniQaytar, XatoniKorildi, ZaxiraForma } from '@/components/tizim/tizim-amallari';

export function generateMetadata() {
  return { title: matnchi()('Тизим ҳолати') };
}

const IZ_SHAKLI = /^iz_[0-9a-f]{10}$/;

/**
 * Tizim holati: avtomatik ishlar, xabar navbati, xatolar jurnali, zaxira sinovi.
 *
 * Bu sahifa administrator uchun va bitta savolga javob beradi:
 * "Men yo'q paytimda hammasi o'z-o'zidan ishlayaptimi?"
 *
 * Holat ranglardan tashqari BELGI va MATN bilan ham beriladi.
 */
export default async function TizimSahifasi({ searchParams }: { searchParams: { iz?: string; qaytarildi?: string } }) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/tizim')) redirect(boshSahifa(sessiya.rol));

  const hozir = new Date();
  const iz = (searchParams.iz ?? '').trim();
  const izTugri = IZ_SHAKLI.test(iz);
  /* Navbatga qaytarish natijasi: faqat raqam qabul qilinadi */
  const qaytarildi = /^\d{1,5}$/.test(searchParams.qaytarildi ?? '') ? Number(searchParams.qaytarildi) : null;

  const [ishlar, navbat, xatolar, zaxira, izIsh, izXatolar, izJurnal] = await Promise.all([
    ishlarHolati(hozir).catch(() => null),
    navbatHolati(hozir).catch(() => null),
    xatolarHolati(hozir).catch(() => null),
    zaxiraHolati(hozir).catch(() => null),
    izTugri ? prisma.tizimIshi.findUnique({ where: { izId: iz } }) : null,
    izTugri ? xatolarHolati(hozir, 10, iz) : null,
    izTugri
      ? prisma.auditLog.findMany({
          where: { izoh: { contains: `[${iz}]` } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, amal: true, izoh: true, createdAt: true },
        })
      : null,
  ]);

  /*
   * Бирортаси ўқилмаса (миграция қўлланмаган, база жавоб бермади) — ярим-ёрти
   * рақам кўрсатмаймиз: «0 хато» ёлғон бўларди. Аниқ ёзамиз.
   */
  if (!ishlar || !navbat || !xatolar || !zaxira) {
    return (
      <div className="space-y-5">
        <h1 className="sahifa-sarlavha">{tr('Тизим ҳолати')}</h1>
        <div className="quti-ogoh flex items-start gap-2" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">{tr('Кузатув маълумотини ўқиб бўлмади')}</p>
            <p className="mt-0.5 text-xs">
              {tr('База жавоб бермаган ёки миграция қўлланмаган бўлиши мумкин. Бир дақиқадан сўнг қайта очиб кўринг; такрорланса — Vercel build логида [migratsiya] қаторларини текширинг.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const oldin = (d: Date) => {
    const soat = Math.floor((hozir.getTime() - d.getTime()) / 3600_000);
    if (soat < 1) return tr('бир соатдан кам олдин');
    if (soat < 48) return `${soat} ${tr('соат олдин')}`;
    return `${Math.floor(soat / 24)} ${tr('кун олдин')}`;
  };

  const bahoBelgisi = (b: IshBahosi) =>
    b === 'TINCH' ? (
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
    ) : b === 'HECH_QACHON' ? (
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
    ) : b === 'XATODA' ? (
      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
    );
  const bahoRangi = (b: IshBahosi) =>
    b === 'TINCH' ? 'bg-ok-bg text-ok' : b === 'HECH_QACHON' ? 'bg-surface-muted text-ink-muted' : b === 'XATODA' ? 'bg-danger-bg text-danger' : 'bg-warn-bg text-warn';

  const zaxiraNomi = {
    HECH_QACHON: 'Ҳали бир марта ҳам синалмаган',
    XATO: 'Охирги синов муваффақиятсиз',
    ESKIRGAN: 'Синов эскирган',
    YANGI: 'Синалган',
  } as const;
  const zaxiraYomon = zaxira.baho.baho !== 'YANGI';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Тизим ҳолати')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tr('Автоматик ишлар, хабарлар навбати, хато журнали ва заҳира синови: ҳамма нарса ўзи ишлаяптими.')}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Хато журнали ва ишлар изи фақат кузатув уланган жойларни қамраб олади: журналда йўқ хато «умуман бўлмаган» дегани эмас.')}
        </p>
      </div>

      {/* ── Из бўйича қидирув ── */}
      <form method="get" className="karta flex flex-wrap items-end gap-2 p-4">
        <label className="block min-w-0 flex-1 space-y-1">
          <span className="text-xs font-medium text-ink-muted">{tr('Из бўйича қидириш (ходим айтган «iz_…» рақами)')}</span>
          <input
            name="iz"
            defaultValue={iz}
            maxLength={20}
            placeholder="iz_0123456789"
            className="w-full min-h-11 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <button type="submit" className="tugma-ikkilamchi min-h-11 rounded-md px-4 py-2 text-sm font-medium">
          {tr('Топиш')}
        </button>
      </form>

      {iz && !izTugri && <div className="quti-ogoh">{tr('Из шакли нотўғри: iz_ ва 10 та ҳарф-рақам бўлиши керак.')}</div>}
      {izTugri && (
        <section className="karta space-y-2 p-4" aria-label={tr('Из натижаси')}>
          <h2 className="text-sm font-bold text-ink">
            {tr('Из:')} {iz}
          </h2>
          {!izIsh && izXatolar?.royxat.length === 0 && izJurnal?.length === 0 && (
            <p className="text-sm text-ink-muted">{tr('Бу из бўйича ёзув топилмади.')}</p>
          )}
          {izIsh && (
            <p className="text-sm text-ink">
              {tr('Автоматик иш:')} <b>{izIsh.nomi}</b> ({izIsh.usul}) · {formatDate(izIsh.boshlandi)} · {izIsh.holati}
              {izIsh.xulosa ? ` · ${maxfiyniTozala(izIsh.xulosa)}` : ''}
              {izIsh.xatoMatni ? ` · ${maxfiyniTozala(izIsh.xatoMatni)}` : ''}
            </p>
          )}
          {izXatolar?.royxat.map((x) => (
            <p key={x.id} className="text-sm text-ink">
              {tr('Хато:')} {x.manba} · {x.xabar}
            </p>
          ))}
          {izJurnal?.map((a) => (
            <p key={a.id} className="text-sm text-ink">
              {tr('Аудит:')} {formatDate(a.createdAt)} · {a.amal} · {maxfiyniTozala(a.izoh ?? '')}
            </p>
          ))}
        </section>
      )}

      {/* ── 1. Автоматик ишлар ── */}
      <section className="karta p-4 sm:p-5" aria-labelledby="ish-sarlavha">
        <h2 id="ish-sarlavha" className="text-sm font-bold text-ink">
          {tr('Автоматик ишлар (жадвал бўйича)')}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('«Муваффақиятли» — иш охиригача хатосиз ўтган. Қўлда тугма босиш жадвални ҳисобламайди: ўлик жадвал яширинмасин.')}
        </p>
        <ul className="mt-3 space-y-3">
          {ishlar.map((j) => (
            <li key={j.nomi} className="rounded-md border border-line p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{tr(j.tavsif)}</p>
                  <p className="text-xs text-ink-faint">
                    {j.yol} · {tr('кутилади: ҳар')} {j.davriSoat} {tr('соатда')}
                  </p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${bahoRangi(j.baho)}`}>
                  {bahoBelgisi(j.baho)}
                  {tr(ISH_BAHOSI_NOMI[j.baho])}
                </span>
              </div>
              <dl className="mt-2 space-y-0.5 text-xs text-ink-muted">
                <div>
                  <dt className="inline text-ink-faint">{tr('Охирги муваффақиятли ишлаш:')} </dt>
                  <dd className="inline">
                    {j.songgiMuvaffaqiyat ? `${formatDate(j.songgiMuvaffaqiyat)} (${oldin(j.songgiMuvaffaqiyat)})` : tr('ҳали бўлмаган')}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-ink-faint">{tr('Охирги уриниш:')} </dt>
                  <dd className="inline">{j.songgiUrinish ? formatDate(j.songgiUrinish) : '—'}</dd>
                </div>
                {j.songgiQolda && (
                  <div>
                    <dt className="inline text-ink-faint">{tr('Охирги қўлда ишга тушириш:')} </dt>
                    <dd className="inline">{formatDate(j.songgiQolda)}</dd>
                  </div>
                )}
              </dl>
              {j.baho === 'HECH_QACHON' && (
                <p className="mt-2 text-xs text-ink-muted">
                  {tr('Кузатув янги уланган бўлса, биринчи жадвал ишлагунча (бир суткагача) шундай туради.')}
                </p>
              )}
              {j.songgiXato && (
                <p className="mt-2 break-words text-xs text-danger" role="status">
                  {tr('Хато:')} {j.songgiXato}
                  {j.songgiXatoIz ? ` (${j.songgiXatoIz})` : ''}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ── 2. Хабарлар навбати ── */}
      <section className="karta p-4 sm:p-5" aria-labelledby="nv-sarlavha">
        <h2 id="nv-sarlavha" className="text-sm font-bold text-ink">
          {tr('Хабарлар навбати (Telegram)')}
        </h2>
        {qaytarildi !== null && (
          <p className="mt-3 rounded-md bg-ok-bg px-3 py-2 text-sm text-ok" role="status">
            {qaytarildi > 0
              ? `${qaytarildi} ${tr('та хабар навбатга қайтарилди. Улар навбатдаги жадвал бўйича ёки «Ҳозир юбор» тугмаси билан юборилади.')}`
              : tr('Қайтариладиган хабар йўқ: фақат сўнгги 3 кундаги хато хабарлар қайтарилади.')}
          </p>
        )}
        <ul className="mt-2 space-y-1 text-sm text-ink-muted">
          <li>
            {tr('Навбатда:')} <b className="tabular-nums text-ink">{navbat.kutilmoqda}</b>
            {navbat.engEskiSoat !== null && ` · ${tr('энг эскиси')} ${navbat.engEskiSoat} ${tr('соатдан бери')}`}
          </li>
          <li>
            {tr('Қайта уриниш кутаётган:')} <b className="tabular-nums text-ink">{navbat.qaytaUrinish}</b>
          </li>
          <li>
            {tr('Хато билан тугаган:')} <b className="tabular-nums text-ink">{navbat.xato}</b>
          </li>
          {navbat.ushlanib > 0 && (
            <li className="flex items-start gap-1.5 text-warn">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {navbat.ushlanib} {tr('та хабар')} {NAVBAT_USHLANISH_SOATI} {tr('соатдан ортиқ юборилмай турибди')}
              </span>
            </li>
          )}
        </ul>
        {navbat.royxat.length > 0 && (
          <ul className="mt-3 space-y-2">
            {navbat.royxat.map((x) => (
              <li key={x.id} className="rounded-md border border-line p-2 text-xs">
                <p className="font-medium text-ink">
                  {x.holati === 'XATO' ? tr('Хато') : tr('Қайта уриниш кутилмоқда')} · {x.turi} · {x.urinishlar} {tr('уриниш')} · {formatDate(x.sana)}
                </p>
                {x.xatoMatni && <p className="mt-0.5 break-words text-ink-muted">{x.xatoMatni}</p>}
              </li>
            ))}
          </ul>
        )}
        {navbat.xato > 0 && (
          <div className="mt-3">
            <NavbatniQaytar />
            <p className="mt-1 text-[11px] text-ink-faint">
              {tr('Фақат сўнгги 3 кундаги хабарлар қайтарилади: эскирган хабар маҳалла ходимини чалғитади.')}
            </p>
          </div>
        )}
      </section>

      {/* ── 3. Хатолар журнали ── */}
      <section className="karta p-4 sm:p-5" aria-labelledby="xt-sarlavha">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 id="xt-sarlavha" className="text-sm font-bold text-ink">
            {tr('Хатолар журнали')}
          </h2>
          {xatolar.korilmagan > 0 && <XatoniKorildi matn="Ҳаммасини кўрилди деб белгилаш" />}
        </div>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Матнлардан калит, токен, телефон ва шахсий маълумот олиб ташланган. Бир хил хато битта қаторга йиғилади.')}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {tr('Кўрилмаган:')} <b className="tabular-nums text-ink">{xatolar.korilmagan}</b> · {tr('охирги 7 кунда:')}{' '}
          <b className="tabular-nums text-ink">{xatolar.oxirgi7Kun}</b>
        </p>
        {xatolar.royxat.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{tr('Журналда ёзув йўқ.')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {xatolar.royxat.map((x) => (
              <li key={x.id} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 text-xs font-semibold text-ink">
                    {x.manba} · {x.soni} {tr('марта')}
                    {!x.korilgan && <span className="ml-2 rounded bg-warn-bg px-1.5 py-0.5 text-[11px] text-warn">{tr('Кўрилмаган')}</span>}
                  </p>
                  {!x.korilgan && <XatoniKorildi id={x.id} matn="Кўрилди" />}
                </div>
                <p className="mt-1 break-words text-xs text-ink-muted">{x.xabar}</p>
                <p className="mt-1 text-[11px] text-ink-faint">
                  {tr('Биринчи:')} {formatDate(x.birinchiSana)} · {tr('охирги:')} {formatDate(x.oxirgiSana)}
                  {x.oxirgiIzId ? ` · ${x.oxirgiIzId}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 4. Заҳира ── */}
      <section className="karta p-4 sm:p-5" aria-labelledby="zx-sarlavha">
        <h2 id="zx-sarlavha" className="text-sm font-bold text-ink">
          {tr('Заҳирадан тиклаш синови')}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Синалмаган заҳира — заҳира эмас. Синов алоҳида муҳитда ўтказилади (ҳужжат: hujjatlar/ZAXIRA-VA-TIKLASH.md), бу ерга унинг натижаси ёзилади.')}
        </p>
        <p className={`mt-3 flex items-start gap-1.5 text-sm ${zaxiraYomon ? 'text-warn' : 'text-ink'}`} role="status">
          {zaxiraYomon ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>
            {tr(zaxiraNomi[zaxira.baho.baho])}
            {zaxira.baho.kun !== null && ` · ${zaxira.baho.kun} ${tr('кун олдин')}`}
            {zaxira.baho.baho === 'ESKIRGAN' && ` (${tr('чегара')} ${ZAXIRA_ESKIRISH_KUNI} ${tr('кун')})`}
          </span>
        </p>
        {zaxira.royxat.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs text-ink-muted">
            {zaxira.royxat.map((x) => (
              <li key={x.id}>
                <b className="text-ink">{formatDate(x.otkazilganSana).split(',')[0]}</b> · {x.natija === 'MUVAFFAQIYATLI' ? tr('муваффақиятли') : tr('муваффақиятсиз')} · {x.kim} — {x.izoh}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <ZaxiraForma bugun={sanaMaydoni(hozir.toISOString())} />
        </div>
      </section>
    </div>
  );
}
