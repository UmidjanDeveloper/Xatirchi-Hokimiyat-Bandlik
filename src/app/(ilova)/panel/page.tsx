import Link from 'next/link';
import { matnchi } from '@/lib/alifbo-server';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Baby,
  Briefcase,
  Coins,
  GraduationCap,
  House,
  Plane,
  TrendingUp,
  Users,
} from 'lucide-react';
import { joriySessiya, mahallaFiltri, tahlilKoradi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { davrOqi, tahlilOl } from '@/lib/tahlil';
import { DARAJA_KORINISHI, tavsiyalarniHisobla } from '@/lib/tavsiyalar';
import { percent } from '@/lib/utils';
import {
  ByudjetBlogi,
  KechikkanlarBlogi,
  KursTalabiBlogi,
  Voronka,
} from '@/components/panel/diagrammalar';
import {
  MahallalarJadvali,
  MahallaUstunlari,
  ToifaDoirasi,
} from '@/components/panel/grafiklar';
import { DinamikaBloglari } from '@/components/panel/dinamika-blogi';
import { DavrTanlash } from '@/components/panel/davr-tanlash';
import { HisobotTugmalari } from '@/components/panel/hisobot-tugmalari';
import { AiXulosa } from '@/components/panel/ai-xulosa';
import { BolimlarPaneli } from '@/components/panel/bolimlar-paneli';
import { bolimlarTahlili } from '@/lib/bolimlar-tahlili';
import { HududXaritasi } from '@/components/xarita/hudud-xaritasi';
import { xaritaMalumoti } from '@/lib/xarita/xarita-malumoti';
import { VaucherNavbati } from '@/components/it-vaucher/vaucher-navbati';
import { vaucherHisobi, vaucherNavbati } from '@/lib/it-vaucher';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Таҳлил панели') };
}

const raqam = (n: number) => n.toLocaleString('ru-RU');

/** Йирик сумма — «12,4 млн» кўринишида: панелда ўн хонали рақам ўқилмайди */
const pul = (som: number) =>
  som >= 1_000_000_000
    ? `${(som / 1_000_000_000).toFixed(1)} млрд`
    : som >= 1_000_000
      ? `${(som / 1_000_000).toFixed(1)} млн`
      : raqam(som);

export default async function PanelSahifasi({
  searchParams,
}: {
  searchParams: { davr?: string };
}) {
  const tr = matnchi();
  const davr = davrOqi(searchParams.davr);

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (!tahlilKoradi(sessiya.rol)) redirect('/');

  const filtr = mahallaFiltri(sessiya);

  /*
   * Маҳаллалар рўйхати ҳисобот тугмалари учун: ҳоким умумий
   * суратни туман бўйича кўради, аммо йиғилишда битта МФЙ
   * ҳақида савол чиқса, шу рўйхатдан танлаб алоҳида ҳисобот
   * олади.
   */
  const [t, b, xarita, vHisob, vNavbat, mahallalar] = await Promise.all([
    tahlilOl(filtr.mahallaId, davr),
    /*
     * Хатлов бўлимлари бўйича жамланма.
     *
     * Алоҳида модулда ва алоҳида сўровда: юқоридаги `tahlilOl`
     * бандлик занжири ҳақида, бу эса оила ҳаётининг қолган ўн
     * икки бўлими ҳақида. Иккови ёнма-ён ишлайди — панел
     * кутиш вақти ошмайди.
     */
    bolimlarTahlili(filtr.mahallaId),

    /*
     * Харита — 70 МФЙ нинг ер юзидаги ўрни билан.
     *
     * Жадвалда МФЙ лар алифбо тартибида туради, ер юзида эса
     * ёнма-ён. «Қайси ТОМОН орқада қолган» деган саволга фақат
     * харита жавоб беради.
     */
    xaritaMalumoti(filtr.mahallaId),

    vaucherHisobi(filtr.mahallaId),
    vaucherNavbati(filtr.mahallaId, 10),
    filtr.mahallaId
      ? Promise.resolve([])
      : prisma.mahalla.findMany({
          orderBy: { nomi: 'asc' },
          select: { id: true, nomiKirill: true },
        }),
  ]);
  const tavsiyalar = tavsiyalarniHisobla(t);

  const bosh = t.jami;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Таҳлил панели')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {tr('Хатирчи тумани ·')} {raqam(bosh.bazaAholi)} {tr('аҳоли ·')} {raqam(bosh.bazaXonadon)} {tr('хонадон')}
          </p>
        </div>

        {/*
          Давр танлаш ва ҳисобот тугмалари — сарлавҳа ёнида.
          Ҳоким саҳифани пастгача айлантирмасдан топади.

          Ҳисобот тугмалари ХАТЛОВ БОШЛАНМАГАН ПАЙТДА ҲАМ
          туради. Илгари яширилар эди — «бўш ҳисобот керак эмас»
          деб. Аммо у бўш эмас: 70 та МФЙнинг база рақамлари,
          рўйхатдаги ишсизлар ва қамров режаси ичида бор. Ҳоким
          айнан шу бошланғич суратни йиғилишга олиб киради.
        */}
        <div className="flex flex-wrap items-center gap-3">
          <DavrTanlash joriy={davr} />
          <HisobotTugmalari qamrov={{ nomi: 'Хатирчи тумани' }} mahallalar={mahallalar} />
        </div>
      </div>

      {/*
        ── ХАТЛОВ ҲАЛИ БОШЛАНМАГАН ──

        Илгари бу ҳолатда БУТУН САҲИФА яширилар эди ва ўрнида
        битта кулранг карточка турарди. Ният тўғри эди: нол
        тўла диаграмма «тизим ишламаяпти» деган таассурот
        беради.

        Аммо натижа ундан ҳам ёмон чиқди. Ҳоким панелни очиб
        БЎШ САҲИФА кўрди — на кўрсаткич, на сунъий интеллект,
        на ҳисобот тугмаси. «Бу ерда ҳеч нима йўқ экан» деган
        хулосага келди, ҳолбуки базада 70 та МФЙ, 40 377
        хонадон ва 3 345 та ишсиз турибди.

        Тўғри ечим — яширмаслик, балки РОСТИНИ АЙТИШ: панел
        тўлиқ ишлайди, рақамлар ҳақиқий, фақат улар ҳозирча
        база рўйхатидан, хатловдан эмас. Шу банер айнан шуни
        айтади ва кейинги қадамни кўрсатади.
      */}
      {bosh.xatlovXonadon === 0 && (
        <div className="quti-ogoh text-sm">
          <p className="font-semibold">{tr('Хатлов ҳали бошланмаган')}</p>
          <p className="mt-1 leading-relaxed">
            {tr('Қуйидаги барча рақамлар — база рўйхатидан:')} {raqam(bosh.bazaXonadon)}{' '}
            {tr('хонадон ва')} {raqam(bosh.bazaIshsiz)}{' '}
            {tr('та ишсиз фуқаро. Маҳалла еттилиги аъзолари хонадонларни хатловдан ўтказа бошлагач, қамров фоизи, воронка ва динамика тўла ишлайди.')}
          </p>
        </div>
      )}

      {/* ── KPI ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          ikonka={<House className="h-4 w-4" />}
          nomi={tr("Хатловдан ўтган хонадон")}
          qiymat={raqam(bosh.xatlovXonadon)}
          izoh={tr(`${raqam(bosh.bazaXonadon)} тадан · ${percent(bosh.xatlovXonadon, bosh.bazaXonadon)}%`)}
        />
        <Kpi
          ikonka={<Users className="h-4 w-4" />}
          nomi={tr("Аниқланган ишсиз")}
          qiymat={raqam(bosh.aniqlangan)}
          izoh={tr(`Рўйхатда ${raqam(bosh.bazaIshsiz)} та · ${percent(bosh.aniqlangan, bosh.bazaIshsiz)}%`)}
        />
        <Kpi
          ikonka={<Briefcase className="h-4 w-4" />}
          nomi={tr("Жойлаштирилган")}
          qiymat={raqam(bosh.joylashtirilgan)}
          izoh={tr(`Аниқланганларнинг ${percent(bosh.joylashtirilgan, bosh.aniqlangan)}%`)}
          yaxshi
        />
        <Kpi
          ikonka={<TrendingUp className="h-4 w-4" />}
          nomi={tr("Ишсизликка таъсир")}
          qiymat={`${percent(bosh.joylashtirilgan, bosh.bazaIshsiz)}%`}
          izoh={tr(`Рўйхатдаги ${raqam(bosh.bazaIshsiz)} тадан`)}
        />
      </div>

      {/*
        ── ХАТЛОВДАН ЧИҚҚАН АСОСИЙ РАҚАМЛАР ──

        Юқоридаги тўртта кўрсаткич бандлик ҳақида. Булар эса
        оиланинг ўзи ҳақида ва айнан шу саволлар йиғилишда
        биринчи бўлиб берилади: «неча бола бор», «нечта одам
        чет элда», «қанча пул кириб келяпти».

        Ҳар бири пастдаги тўлиқ бўлимга олиб ўтади.
      */}
      {b.xonadon > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            ikonka={<Baby className="h-4 w-4" />}
            nomi={tr('0 — 3 ёшдаги бола')}
            qiymat={raqam(b.oila.bolalar0_3)}
            izoh={tr(`${raqam(b.oila.bolalar0_3 + b.oila.bolalar3_17)} та бола 17 ёшгача`)}
            yol="#bolim-oila"
          />
          <Kpi
            ikonka={<GraduationCap className="h-4 w-4" />}
            nomi={tr('Боғча ва мактабдан ташқарида')}
            qiymat={raqam(
              Math.max(0, b.talim.maktabgachaYoshdagi - b.talim.maktabgachaQamrovda) +
                Math.max(0, b.talim.maktabYoshdagi - b.talim.maktabQamrovda)
            )}
            izoh={tr('та бола қамровга олинмаган')}
            yol="#bolim-talim"
          />
          <Kpi
            ikonka={<Plane className="h-4 w-4" />}
            nomi={tr('Чет элда')}
            qiymat={raqam(b.chetEl.ishchi)}
            izoh={tr(`${raqam(b.chetEl.oila)} та оиладан`)}
            yol="#bolim-chet-el"
          />
          <Kpi
            ikonka={<Coins className="h-4 w-4" />}
            nomi={tr('Чет элдан ойига')}
            qiymat={tr(`${pul(b.chetEl.oylikSom)} сўм`)}
            izoh={tr(`Йилига ${pul(b.chetEl.oylikSom * 12)} сўм`)}
            yaxshi
            yol="#bolim-chet-el"
          />
        </div>
      )}

      {/*
        ── Таҳлил хулосаси ──

        Мижоз томонда юкланади: AI сўрови 10-20 секунд кетади
        ва панел шу вақтда очилмай турмаслиги керак.

        Қуйидаги «Тавсиялар» рўйхатидан фарқи бор ва иккиси
        бир-бирини такрорламайди: бу блок ҲОЛАТНИ гап билан
        тушунтиради ва қоида кўрмайдиган боғланишларни топади,
        қуйидагиси эса аниқ чегараларга таянади ва ҳар бир
        тавсияда БОСИЛАДИГАН ҲАВОЛА беради — ходим дарҳол
        керакли рўйхатга ўтади.
      */}
      <AiXulosa qamrovNomi="Хатирчи тумани" />

      {/* ── Тавсиялар — чегаралар бўйича, ҳаволалар билан ── */}
      {tavsiyalar.length > 0 && (
        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{tr('Аниқ чегаралар бўйича тавсиялар')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Ҳар бир тавсия керакли рўйхатга олиб ўтади — устига босинг')}
          </p>

          <div className="mt-4 space-y-2">
            {tavsiyalar.map((tv, i) => {
              const k = DARAJA_KORINISHI[tv.daraja];
              const ichi = (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${k.sinf}`}
                    >
                      {tr(k.nomi)}
                    </span>
                    <span className="min-w-0 text-sm font-medium text-ink">
                      {tr(tv.sarlavha)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    {tr(tv.dalil)}
                  </p>
                </>
              );

              return tv.yol ? (
                <Link
                  key={i}
                  href={tv.yol}
                  className="flex items-start gap-3 rounded-md border border-line p-3 transition-colors hover:border-line-strong hover:bg-surface-muted"
                >
                  <span className="min-w-0 flex-1">{ichi}</span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-faint" />
                </Link>
              ) : (
                <div key={i} className="rounded-md border border-line p-3">
                  {ichi}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/*
        ── Ўсиш, камайиш ва динамика ──

        Беш диаграмма бир блокда: сурат, ойлик оқим ва
        тўпланиб бориш. Ҳокимга биринчи навбатда керагини
        — «камайдими ёки ўсдими» — энг тепага қўйилган.
      */}
      <DinamikaBloglari
        dinamika={t.dinamika}
        davr={davr}
        qamrovNomi="Хатирчи тумани"
      />

      {/*
        ── ТУМАН ХАРИТАСИ ──

        Диаграммалар «қанча» деган саволга жавоб беради, харита
        эса «ҚАЕРДА» деганига. Иккови бир-бирини алмаштирмайди:
        70 та сатрли жадвалдан «шимолий МФЙ лар орқада қолган»
        деган хулоса ҳеч қачон чиқмайди, харитадан эса биринчи
        қарашда чиқади.
      */}
      <HududXaritasi
        qatorlar={xarita.qatorlar}
        ulanmagan={xarita.ulanmagan}
        qamrovNomi="Хатирчи тумани"
        sarlavha="Туман харитаси — МФЙ кесимида"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Voronka
          bosqichlar={t.voronka}
          bazaIshsiz={bosh.bazaIshsiz}
          radEtgan={t.jami.radEtgan}
          uzoqIshsiz={t.jami.uzoqIshsiz}
          tekshiruvKutayotgan={t.jami.tekshiruvKutayotgan}
        />
        <KechikkanlarBlogi kechikkanlar={t.kechikkanlar} />
      </div>

      {/*
        Ilgari bu yerda ikkita qisqa ro'yxat turardi. Ular
        o'rnini bitta ustunli diagramma egalladi: ko'rsatkichni
        ham, yo'nalishni ham tanlash mumkin, ya'ni o'sha ikki
        ro'yxat ham, yana ikkitasi ham shu yerdan chiqadi.
      */}
      {!filtr.mahallaId && (
        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{tr('Маҳаллалар кесимида')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Кўрсаткични танланг — 70 та МФЙ дан энг юқори ёки энг паст 10 таси чиқади')}
          </p>
          <div className="mt-4">
            <MahallaUstunlari qamrov={t.qamrov} />
          </div>
        </section>
      )}

      {/*
        ── IT-ШАҲАРЧА ВАУЧЕРИ ──

        Ҳокимнинг саволи «нечта ваучер бердик» эмас эди:
        «ваучер иш бердими» эди. Шунинг учун бу ерда фақат
        берилган сон эмас, НАТИЖА ҳам турибди — нечтаси
        курсни тугатди ва нечтаси ишга жойлашди.

        Пастдаги рўйхат — ҳали ваучер олмаганлар. Ҳоким
        йиғилишда шу рақамни бандлик марказидан сўрайди.
      */}
      <VaucherNavbati
        navbat={vNavbat}
        hisob={vHisob}
        qamrovNomi="Хатирчи тумани"
        bera={false}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <KursTalabiBlogi kurslar={t.kursTalabi} />
        <ByudjetBlogi byudjet={t.byudjet} jamiTalab={t.jamiTalab} />
      </div>

      {/* ── Toifalar ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">{tr('Ишсизлар таркиби')}</h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Свод жадвалидаги тоифалар — алоҳида эътибор талаб қилади')}
        </p>
        <div className="mt-4 sm:max-w-md">
          <ToifaDoirasi toifalar={t.toifalar} />
        </div>
      </section>

      {/*
        ── ХАТЛОВ БЎЛИМЛАРИ ──

        Анкета ўн икки бўлимдан иборат ва ҳар бири бу ерда ўз
        рақами билан туради: боладан томорқагача. Юқоридаги
        блоклар «ишсизлик камаяптими» саволига жавоб беради,
        булар эса «туман қандай яшаяпти» саволига.
      */}
      <BolimlarPaneli b={b} qamrovNomi="Хатирчи тумани" />

      {/* ── To'liq jadval ── */}
      {!filtr.mahallaId && (
        <section className="karta p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{tr('Барча маҳаллалар')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">
            {tr('Диаграммалар тенденцияни кўрсатади, жадвал эса аниқ рақамни беради. Устун номини босиб саралаш мумкин.')}{' '}
            <span className="text-warn">&#9650;</span>{' '}
            {tr('белгиси — хатлов рўйхатдагидан кўпроқ ишсиз топган маҳалла.')}
          </p>
          <div className="mt-4">
            <MahallalarJadvali qamrov={t.qamrov} />
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({
  ikonka,
  nomi,
  qiymat,
  izoh,
  yaxshi,
  yol,
}: {
  ikonka: React.ReactNode;
  nomi: string;
  qiymat: string;
  izoh: string;
  yaxshi?: boolean;
  /** Берилса — карточка босилади ва тўлиқ бўлимга олиб ўтади */
  yol?: string;
}) {
  const ichi = (
    <>
      <div className="flex items-center gap-2 text-ink-faint">
        {ikonka}
        <span className="text-xs font-medium">{nomi}</span>
      </div>
      <p className={`raqam mt-2 text-2xl font-bold ${yaxshi ? 'text-ok' : 'text-ink'}`}>
        {qiymat}
      </p>
      <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>
    </>
  );

  if (yol) {
    return (
      <a
        href={yol}
        className="metric-card karta block p-4 transition-colors hover:border-accent hover:bg-accent-soft"
      >
        {ichi}
      </a>
    );
  }

  return <div className="metric-card karta p-4">{ichi}</div>;
}

