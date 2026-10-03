import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, UserPlus } from 'lucide-react';
import type { Rol } from '@prisma/client';
import { matnchi } from '@/lib/alifbo-server';
import { joriyXodim } from '@/lib/sahifa-auth';
import { prisma } from '@/lib/prisma';
import { MENYU, ROL_NOMI, boshSahifa, yolgaRuxsat } from '@/components/shell/navigatsiya';
import { XodimBoshqaruvi } from '@/components/admin/xodim-boshqaruvi';
import { PanelniKorish, type KorishHisobi } from '@/components/admin/panelni-korish';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi (`generateMetadata` har so'rovda
 * qayta hisoblanadi, doimiy `metadata` esa cookie'ni o'qiy olmaydi).
 */
export function generateMetadata() {
  return { title: matnchi()('Ходимлар ва панеллар') };
}

/**
 * ============================================================
 *  ХОДИМЛАР ВА ПАНЕЛЛАР
 *
 *  Илгари ходимлар рўйхати «Бошқарув» саҳифасининг ўртасида,
 *  олтита бошқа блокдан кейин турарди: 70 та маҳалла ходимининг
 *  логини ва паролини, ҳоким ва раҳбар ҳисобини излаб топиш
 *  қийин эди. Энди одамлар шу ерда:
 *
 *    1. ҳар бир рол учун карточка: нечта ҳисоб бор, бош панели
 *       қайси ва уни «кўзи билан» кўриш (ҳисоб йўқ бўлса —
 *       яратиш);
 *    2. рол бўйича фильтр;
 *    3. логин ва паролни бошқариш рўйхати.
 *
 *  Парол ҳамон ХЕШЛАНАДИ; рўйхатдаги «Парол» тугмаси унинг
 *  шифрланган нусхасини очади ва ҳар очилиши журналга ёзилади.
 *  Ҳамма паролни бирданига кўрсатадиган тугма ЙЎҚ.
 * ============================================================
 */

const ROLLAR: readonly Rol[] = ['HOKIM', 'BANDLIK_RAHBAR', 'BANDLIK', 'YETTILIK', 'ADMIN'];
const FILTRLAR = ['HAMMASI', ...ROLLAR] as const;
type Filtr = (typeof FILTRLAR)[number];

/** Rol kartasi: sarlavha, qisqa nom va u nimani ko'radi */
const ROL_KARTASI: Record<Rol, { sarlavha: string; qisqa: string; tavsif: string }> = {
  HOKIM: {
    sarlavha: 'Ҳоким панели',
    qisqa: 'Ҳоким',
    tavsif: 'Туман кўрсаткичлари, динамика ва ҳудудлар. Фақат кўради: фуқаро исмлари унга кўрсатилмайди.',
  },
  BANDLIK_RAHBAR: {
    sarlavha: 'Бандлик раҳбари панели',
    qisqa: 'Бандлик раҳбари',
    tavsif: 'Таҳлил ва операцион панел, маҳалла ходимлари, иш берувчилар, тасдиқлаш.',
  },
  BANDLIK: {
    sarlavha: 'Бандлик мутахассиси панели',
    qisqa: 'Бандлик мутахассиси',
    tavsif: 'Операцион панел: суҳбат ва таклиф навбати, мослаштириш, бўш иш ўринлари.',
  },
  YETTILIK: {
    sarlavha: 'Маҳалла ходими панели',
    qisqa: 'Маҳалла ходимлари',
    tavsif: 'Ўз маҳалласининг хатлови, хонадонлари ва ишсизлари. Бошқа маҳаллани кўрмайди.',
  },
  ADMIN: {
    sarlavha: 'Администратор',
    qisqa: 'Администратор',
    tavsif: 'Бошқарув, тизим ҳолати ва барча бўлимлар.',
  },
};

export default async function XodimlarSahifasi({
  searchParams }: {
  searchParams: { rol?: string; yangi?: string };
}) {
  const tr = matnchi();

  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  if (!yolgaRuxsat(sessiya.rol, '/xodimlar')) redirect('/');

  const [xodimlar, mahallalar] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ faol: 'desc' }, { fullName: 'asc' }],
      select: {
        id: true,
        username: true,
        fullName: true,
        position: true,
        phone: true,
        rol: true,
        faol: true,
        parolAlmashtirilsin: true,
        oxirgiKirish: true,
        mahalla: { select: { nomiKirill: true } } } }),
    prisma.mahalla.findMany({
      orderBy: { tartib: 'asc' },
      select: { id: true, nomiKirill: true } }),
  ]);

  const jami = (rol: Rol) => xodimlar.filter((x) => x.rol === rol).length;
  const faolSoni = (rol: Rol) => xodimlar.filter((x) => x.rol === rol && x.faol).length;
  const faolHisoblar = (rol: Rol): KorishHisobi[] =>
    xodimlar
      .filter((x) => x.rol === rol && x.faol)
      .map((x) => ({
        id: x.id,
        yozuv: x.mahalla ? `${x.mahalla.nomiKirill} МФЙ — ${x.fullName}` : x.fullName }))
      .sort((a, b) => a.yozuv.localeCompare(b.yozuv, 'ru'));

  /* Filtr: ?rol=... — noma'lum qiymat jimgina chetga olinadi */
  const soraldi = FILTRLAR.find((f) => f === searchParams.rol);
  const filtr: Filtr = soraldi ?? (jami('YETTILIK') > 0 ? 'YETTILIK' : 'HAMMASI');
  const korinadiganlar = filtr === 'HAMMASI' ? xodimlar : xodimlar.filter((x) => x.rol === filtr);

  const chip = (qiymat: Filtr, nomi: string, son: number) => (
    <Link
      key={qiymat}
      href={`/xodimlar?rol=${qiymat}#royxat`}
      scroll={false}
      aria-current={filtr === qiymat ? 'true' : undefined}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        filtr === qiymat
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line text-ink-muted hover:border-accent hover:text-accent'
      }`}
    >
      {tr(nomi)} ({son})
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sahifa-sarlavha">{tr('Ходимлар ва панеллар')}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {xodimlar.length} {tr('та ҳисоб')} · {tr('логин ва паролни бошқариш, ҳоким ва раҳбар панелини кўриш')}
        </p>
      </div>

      {/* ── Рол карточкалари: ҳар бир рол ўз панели билан ── */}
      <section className="space-y-3" aria-labelledby="rol-kartalari">
        <div>
          <h2 id="rol-kartalari" className="text-sm font-bold text-ink">
            {tr('Роллар ва уларнинг панеллари')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Панелни «кўзи билан» кўрганда сиз ўз ҳисобингизда қоласиз: сайт ўша ролнинг кўриниши билан чизилади, ёзиш амаллари ўчирилади.')}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ROLLAR.map((rol) => {
            const k = ROL_KARTASI[rol];
            const son = jami(rol);
            const hisoblar = rol === 'ADMIN' ? [] : faolHisoblar(rol);
            const boshNomi = MENYU.find((b) => b.yol === boshSahifa(rol))?.nomi;
            return (
              <div key={rol} className="karta flex flex-col gap-3 p-4" data-rol-kartasi={rol}>
                <div>
                  <h3 className="text-sm font-bold text-ink">{tr(k.sarlavha)}</h3>
                  <p className="text-[11px] text-ink-faint">{tr(ROL_NOMI[rol])}</p>
                </div>

                <p className="text-xs leading-relaxed text-ink-muted">{tr(k.tavsif)}</p>

                <p className="text-xs text-ink-faint">
                  <span className="raqam text-lg font-bold text-ink">{son}</span> {tr('та ҳисоб')}
                  {son > 0 && ` · ${faolSoni(rol)} ${tr('таси фаол')}`}
                  {boshNomi && (
                    <>
                      {' · '}
                      {tr('бош саҳифа:')} {tr(boshNomi)}
                    </>
                  )}
                </p>

                <div className="mt-auto space-y-2">
                  {son === 0 ? (
                    <>
                      <p className="quti-ogoh text-xs">{tr('Бу рол учун ҳисоб яратилмаган.')}</p>
                      <Link
                        href={`/xodimlar?rol=${rol}&yangi=1#royxat`}
                        className="tugma-asosiy flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold"
                      >
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        {tr('Ҳисоб яратиш')}
                      </Link>
                    </>
                  ) : (
                    <>
                      {rol !== 'ADMIN' && hisoblar.length === 0 && (
                        <p className="quti-ogoh text-xs">{tr('Фаол ҳисоб йўқ: аввал фаоллаштиринг.')}</p>
                      )}
                      <PanelniKorish hisoblar={hisoblar} />
                      <Link
                        href={`/xodimlar?rol=${rol}#royxat`}
                        scroll={false}
                        className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                      >
                        {tr('Логин ва парол рўйхати')}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Логин ва парол рўйхати ── */}
      <section id="royxat" className="scroll-mt-20 space-y-3" aria-labelledby="royxat-sarlavha">
        <h2 id="royxat-sarlavha" className="text-sm font-bold text-ink">
          {tr('Логин ва парол рўйхати')}
        </h2>

        <div className="flex flex-wrap gap-2" role="group" aria-label={tr('Рол бўйича фильтр')}>
          {chip('HAMMASI', 'Ҳаммаси', xodimlar.length)}
          {ROLLAR.map((rol) => chip(rol, ROL_KARTASI[rol].qisqa, jami(rol)))}
        </div>

        <XodimBoshqaruvi
          key={`${filtr}-${searchParams.yangi ?? ''}`}
          xodimlar={korinadiganlar}
          mahallalar={mahallalar}
          boshlangichRol={filtr === 'HAMMASI' ? 'YETTILIK' : filtr}
          ochiqBoshlash={searchParams.yangi === '1'}
        />
      </section>
    </div>
  );
}
