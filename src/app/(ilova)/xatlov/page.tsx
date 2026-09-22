import Link from 'next/link';
import { OchirishTugmasi } from '@/components/arxiv/ochirish-tugmasi';
import { matnchi } from '@/lib/alifbo-server';
import { redirect } from 'next/navigation';
import { FileText, HousePlus, TriangleAlert, Users } from 'lucide-react';
import { joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { davrOqi, tahlilOl } from '@/lib/tahlil';
import { formatDate, percent } from '@/lib/utils';
import { HisobotTugmalari } from '@/components/panel/hisobot-tugmalari';
import { MahallaOrinlari } from '@/components/ish-orni/mahalla-orinlari';
import { AiXulosa } from '@/components/panel/ai-xulosa';
import { VaucherNavbati } from '@/components/it-vaucher/vaucher-navbati';
import { vaucherHisobi, vaucherNavbati } from '@/lib/it-vaucher';
import { DinamikaBloglari } from '@/components/panel/dinamika-blogi';
import { BolimlarPaneli } from '@/components/panel/bolimlar-paneli';
import { bolimlarTahlili } from '@/lib/bolimlar-tahlili';
import { HududXaritasi } from '@/components/xarita/hudud-xaritasi';
import { xaritaMalumoti } from '@/lib/xarita/xarita-malumoti';
import { DavrTanlash } from '@/components/panel/davr-tanlash';
import { DublikatRoyxati } from '@/components/dublikat/dublikat-royxati';
import { UlanishBlogi } from '@/components/telegram/ulanish-blogi';
import { XatlovNavbati } from '@/components/xatlov/xatlov-navbati';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Хатловларим') };
}

/**
 * Экранда кўрсатиладиган рўйхат узунлиги.
 *
 * Бу фақат КЎРИНИШ чегараси. Саҳифадаги ҳеч бир сон бу
 * рўйхатдан ҳисобланмайди — акс ҳолда чегарадан ошган
 * маҳаллада рақам ёлғон бўлиб қоларди.
 */
const RO_YXAT_HAJMI = 100;

const HOLAT_NISHONI: Record<string, { matn: string; sinf: string }> = {
  QORALAMA: { matn: 'Қоралама', sinf: 'bg-warn-bg text-warn' },
  YUBORILGAN: { matn: 'Юборилган', sinf: 'bg-info-bg text-info' },
  TASDIQLANGAN: { matn: 'Тасдиқланган', sinf: 'bg-ok-bg text-ok' },
};

export default async function XatlovlarSahifasi({
  searchParams,
}: {
  searchParams: { davr?: string };
}) {
  const tr = matnchi();
  const davr = davrOqi(searchParams.davr);

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const filtr = mahallaFiltri(sessiya);

  const [
    xatlovlar,
    sanoq,
    qoralamaSoni,
    mahalla,
    tahlil,
    bolimlar,
    xarita,
    vHisob,
    vNavbat,
    men,
  ] = await Promise.all([
    prisma.household.findMany({
      where: {
        ...filtr,
        // Yettilik a'zosi o'z mahallasidagi barcha xatlovni ko'radi,
        // lekin qoralamalar faqat o'ziniki bo'ladi - boshqa a'zoning
        // tugallanmagan ishini ko'rsatishning ma'nosi yo'q.
        ...(sessiya.rol === 'YETTILIK'
          ? { OR: [{ holati: { not: 'QORALAMA' } }, { xodimId: sessiya.userId }] }
          : {}),
      },
      /*
       * Рўйхат КЎРСАТИШ учун — энг янги юзтаси.
       *
       * Кўрсаткичлар бу рўйхатдан САНАЛМАЙДИ: пастдаги
       * `sanoq` алоҳида сўров билан олинади. Сабаби қуйида
       * ёзилган.
       */
      orderBy: { updatedAt: 'desc' },
      take: RO_YXAT_HAJMI,
      select: {
        id: true,
        holati: true,
        manzil: true,
        oilaBoshligi: true,
        jamiAzo: true,
        ishsizlarSoni: true,
        updatedAt: true,
        mahalla: { select: { nomiKirill: true } },
        xodim: { select: { fullName: true } },
        _count: { select: { ishsizlar: true } },
      },
    }),
    /*
     * ══════════════════════════════════════════════════════
     *  КЎРСАТКИЧЛАР — АЛОҲИДА СЎРОВ БИЛАН
     * ══════════════════════════════════════════════════════
     *
     *  ── Қандай нуқсон бўлган ──
     *
     *  Илгари учала кўрсаткич ҳам ЮҚОРИДАГИ рўйхатдан
     *  саналарди: `xatlovlar.filter(...).length`. Рўйхат эса
     *  `take` билан чекланган — фақат энг янги юзтаси.
     *
     *  Маҳаллада 134 та хатлов бўлганда панел 100 дан
     *  ошмаган сонни кўрсатарди. Ходим уч ой ишлайди, рақам
     *  эса бир жойда тўхтаб қолади — ва у «тизим менинг
     *  ишимни ҳисобламаяпти» деб ўйлайди. Ҳоким панелида эса
     *  худди шу маҳалла бўйича бошқа сон турарди, чунки у
     *  ерда ҳисоб SQL да юритилади.
     *
     *  ── Қоида ──
     *
     *  РЎЙХАТ кўрсатиш учун, САНОҚ ҳисоблаш учун. Экранда
     *  турган ҳар бир сон базанинг ўзидан келиши керак —
     *  саҳифага тушган юзта қатордан эмас.
     */
    prisma.household.aggregate({
      where: { ...filtr, holati: { not: 'QORALAMA' } },
      _count: true,
      _sum: { ishsizlarSoni: true },
    }),

    /*
     *  Қоралама сони ҳам БАЗАДАН.
     *
     *  Бу рўйхатдан саналса юзаки тўғри кўринарди — қоралама
     *  одатда рўйхат тепасида туради. Аммо «одатда» етарли
     *  эмас: рўйхат `updatedAt` бўйича тартибланган, ва ходим
     *  эски қораламага тегмай туриб юзта хатлов юборса, ўша
     *  қоралама юзталикдан тушиб қолади. Экранда «0 қоралама»
     *  ёзилади, тугалланмаган иш эса базада ётаверади.
     *
     *  Қоралама фақат ўзиники: бошқа ходимнинг тугалланмаган
     *  ишини санашнинг маъноси йўқ.
     */
    prisma.household.count({
      where: { ...filtr, holati: 'QORALAMA', xodimId: sessiya.userId },
    }),

    filtr.mahallaId
      ? prisma.mahalla.findUnique({
          where: { id: filtr.mahallaId },
          select: { nomiKirill: true, xonadon: true, ishsiz: true },
        })
      : null,
    /*
     * Динамика — ФАҚАТ ўз МФЙ си бўйича.
     *
     * `tahlilOl` га маҳалла берилса, ҳамма сўров ўша маҳалла
     * билан чегараланади: бошқа МФЙ нинг битта ҳам рақами бу
     * саҳифага тушмайди.
     *
     * Маҳаллага бириктирилмаган ходим (раҳбар, ҳоким) учун
     * умуман ҳисобланмайди — уларда ўз панели бор, бу ерда
     * туман бўйича оғир сўров юритишнинг кераги йўқ.
     */
    filtr.mahallaId ? tahlilOl(filtr.mahallaId, davr) : null,

    /*
     * ── ХАТЛОВ БЎЛИМЛАРИ — ЎЗ МАҲАЛЛАСИ БЎЙИЧА ──
     *
     * Ходим уч ойдан бери эшикма-эшик юриб маълумот тўплайди:
     * боланинг ёши, боғча қамрови, ичимлик суви, томорқа. Ўша
     * маълумот бугунгача ФАҚАТ ҳоким панелида кўринарди —
     * тўплаган одамнинг ўзига эса кўринмасди.
     *
     * Бу нотўғри эди, ва фақат адолат масаласи эмас: боғчага
     * бормаётган 12 та болани ҳоким кўради, аммо ўша болаларга
     * бориб гаплашадиган одам — шу ходим. Рақамни у кўрмаса,
     * чора чиқмайди.
     *
     * Кўрсаткичлар ЖАМЛАНМА: ташхис, дори номи ва бошқа эркин
     * матн бу ерга чиқмайди — фақат «нечта хонадон» саналади.
     */
    filtr.mahallaId ? bolimlarTahlili(filtr.mahallaId) : null,

    /*
     * ── ХАРИТА: ФАҚАТ ЎЗ МАҲАЛЛАСИ ──
     *
     * Ходим туманнинг бошқа МФЙ лари рақамини КЎРМАСЛИГИ
     * керак — бу қоида биринчи кундан бери амал қилади.
     * Шунинг учун `xaritaMalumoti` унинг маҳалласи билан
     * чегараланиб чақирилади: қолган 68 та ҳудуд харитада
     * шакл сифатида туради, аммо уларда рақам ҲАМ ЙЎҚ,
     * чунки сўров уларни умуман олмайди.
     *
     * Ўз МФЙ сининг туман ичидаги ўрнини кўргани эса
     * фойдали: қўшни маҳаллалар, йўл, чегара — далада
     * ишлайдиган одам учун булар аниқ маъно.
     */
    filtr.mahallaId ? xaritaMalumoti(filtr.mahallaId) : null,

    vaucherHisobi(filtr.mahallaId),
    vaucherNavbati(filtr.mahallaId, 20),
    /* Telegram уланганми — фақат шу ходимнинг ўз ҳолати */
    prisma.user.findUnique({
      where: { id: sessiya.userId },
      select: { telegramChatId: true, telegramSana: true },
    }),
  ]);

  /*
   * Кўрсаткичлар — БАЗАДАН. Рўйхат — фақат экран учун.
   *
   * Саҳифадаги бирорта сон `xatlovlar` дан саналмайди.
   */
  const yuborilganSoni = sanoq._count;
  const topilganIshsiz = sanoq._sum.ishsizlarSoni ?? 0;

  /* Рўйхат тўлиб кетганми — экранда айтилади */
  const royxatToldi = xatlovlar.length >= RO_YXAT_HAJMI;

  return (
    <div className="space-y-5">
      {/*
        Юборилмаган хатловлар — саҳифанинг ЭНГ ТЕПАСИДА.

        Ходим бу саҳифани кунда ўнлаб марта очади; агар алоқа
        узилганда бир нечта хатлов навбатда қолган бўлса, у
        буни биринчи қарашда кўриши керак. Навбат бўш бўлса —
        чизиқ умуман кўринмайди.
      */}
      <XatlovNavbati />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Хатловлар')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {mahalla ? tr(`${mahalla.nomiKirill} МФЙ`) : tr('Барча маҳаллалар')}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <Link
            href="/xatlov/yangi"
            className="flex items-center gap-1.5 tugma-asosiy rounded-md px-4 py-2.5 text-sm font-semibold"
          >
            <HousePlus className="h-4 w-4" />
            {tr('Янги хатлов')}
          </Link>

          {/*
            Маҳалла ходими ЎЗ маҳалласи бўйича профессионал
            ҳисобот олади: хатлов, фуқаролар, чора-тадбирлар,
            диаграммалар ва хулоса. Илгари ҳисобот фақат ҳоким
            ва марказ раҳбарида бор эди — ходим эса ўз ишини
            йиғилишда кўрсатиш учун қўлда жадвал тузарди.

            Тугмалар ҲАР ДОИМ кўринади. Хатлов бошланмаган
            бўлса босилмайди, лекин ёнида нима кутилаётгани
            ёзилади — акс ҳолда ходим бундай имконият борлигини
            умуман билмай қоларди.
          */}
          <HisobotTugmalari
            qamrov={{ nomi: '' }}
            ozMahallasi
            malumotBormi={yuborilganSoni > 0}
          />

          {/*
            Давр танлаш — ходим учун ҳам. Унга айниқса КУНЛИК
            кесим керак: «шу ҳафта нечта хонадон қилдим» деган
            савол унинг кундалик саволи, ойлик эмас.
          */}
          {mahalla && yuborilganSoni > 0 && <DavrTanlash joriy={davr} />}
        </div>
      </div>

      {/*
        Qamrov ko'rsatkichi - yettilik a'zosi o'z ishining qayerda
        turganini ko'rishi kerak. "38 ta xonadon" degan raqam yolg'iz
        hech narsa aytmaydi; "506 tadan 38 tasi" esa aytadi.
      */}
      {mahalla && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Karta
            ikonka={<FileText className="h-4 w-4" />}
            nomi={tr("Хатловдан ўтган хонадон")}
            qiymat={`${yuborilganSoni} / ${mahalla.xonadon}`}
            izoh={tr(`${percent(yuborilganSoni, mahalla.xonadon)}% қамров`)}
          />
          <Karta
            ikonka={<Users className="h-4 w-4" />}
            nomi={tr("Аниқланган ишсиз")}
            qiymat={`${topilganIshsiz} / ${mahalla.ishsiz}`}
            izoh={tr(`Рўйхатда ${mahalla.ishsiz} та`)}
          />
          <Karta
            ikonka={<TriangleAlert className="h-4 w-4" />}
            nomi={tr("Тугалланмаган қоралама")}
            qiymat={String(qoralamaSoni)}
            izoh={qoralamaSoni > 0 ? tr('Тугатиб юборинг') : tr('Ҳаммаси юборилган')}
          />
        </div>
      )}

      {/*
        Маҳалла ходимига ҳам хулоса кўринади — ЎЗ маҳалласи
        бўйича. Илгари таҳлил фақат ҳоким ва марказда эди, ходим
        эса ўз ишининг натижасини кўрмасди: анкета тўлдириб
        юборарди ва шу билан тугарди.

        Хатлов бошланмаган бўлса кўрсатилмайди: бўш маълумотдан
        хулоса чиқмайди.
      */}
      {mahalla && yuborilganSoni > 0 && (
        <AiXulosa qamrovNomi={`${mahalla.nomiKirill} МФЙ`} />
      )}

      {/*
        ── ЎСИШ ВА КАМАЙИШ СУРАТИ — ЎЗ МАҲАЛЛАСИ БЎЙИЧА ──

        Илгари бу саҳифада битта ҳам диаграмма йўқ эди: ходим
        анкета тўлдирарди, рақам эса фақат ҳоким панелида
        кўринарди. Ходимнинг ўзи «ишим натижа беряптими»
        деган саволга жавоб ололмасди.

        Энди олади — ва айнан ЎЗ МФЙ си бўйича: диаграммага
        тушадиган ҳар бир рақам `tahlilOl(mahallaId)` дан
        келади, яъни қўшни маҳалланинг битта фуқароси ҳам
        бу ерга аралашмайди.
      */}
      {mahalla && tahlil && yuborilganSoni > 0 && (
        <DinamikaBloglari
          dinamika={tahlil.dinamika}
          davr={davr}
          qamrovNomi={`${mahalla.nomiKirill} МФЙ`}
        />
      )}

      {/*
        ── ХАТЛОВ БЎЛИМЛАРИ БЎЙИЧА ──

        Ходим ўз маҳалласининг тўлиқ суратини кўради: болалар
        ёши, боғча ва мактаб қамрови, чет элдаги оила аъзолари,
        уй-жой шароити, томорқа ва чорва. Ҳоким панелидаги
        билан АЙНАН БИР ХИЛ ҳисоб — фарқи фақат қамровда:
        у ерда туман, бу ерда битта МФЙ.
      */}
      {mahalla && bolimlar && yuborilganSoni > 0 && (
        <BolimlarPaneli b={bolimlar} qamrovNomi={`${mahalla.nomiKirill} МФЙ`} />
      )}

      {/*
        ── МАҲАЛЛАМ ХАРИТАДА ──

        Ходим ўз МФЙ си туманнинг қаерида турганини кўради.
        Қолган ҳудудлар нейтрал: уларнинг рақами серверга ҳам
        сўралмайди.
      */}
      {mahalla && xarita && filtr.mahallaId && (
        <HududXaritasi
          qatorlar={xarita.qatorlar}
          ulanmagan={{ xaritada: [], bazada: [] }}
          qamrovNomi={`${mahalla.nomiKirill} МФЙ`}
          sarlavha="Маҳаллам туман харитасида"
          yolqinMahallaId={filtr.mahallaId}
        />
      )}

      {/*
        ── TELEGRAM ──

        Ходим кун бўйи саҳифани очиб ўтирмайди — у дала ишида.
        Уласа, мос эълон чиққанда хабар ЎЗИ боради.
      */}
      <UlanishBlogi
        ulangan={Boolean(men?.telegramChatId)}
        ulanganSana={men?.telegramSana ? formatDate(men.telegramSana).split(',')[0] : null}
        botNomi={process.env.TELEGRAM_BOT_NOMI ?? null}
      />

      {/*
        ── ТАКРОРЛАНГАН ФУҚАРОЛАР ──

        Ходимга АЙНАН керак: келин эрининг ва ота-онасининг
        хонадонида иккита бўлиб ёзилиб қолиши — унинг ўз
        маҳалласидаги ҳолат, ва уни фақат у ҳал қила олади.

        Жуфти бошқа МФЙ дан бўлиши мумкин: келин айнан бошқа
        маҳаллага узатилади ва уни фақат шундай топиш мумкин.
      */}
      {mahalla && <DublikatRoyxati mahallaId={filtr.mahallaId} chegara={10} />}

      {/*
        ── IT-ШАҲАРЧА ВАУЧЕРЛАРИ ──

        Маҳалла ходими ЎЗ маҳалласидагиларни кўради: ким
        ваучер кутяпти, ким ўқияпти, ким ишга жойлашди.

        Нега ходимга керак: белгини у қўйган, натижани эса
        кўрмасди. Энди у фуқарога «ваучерингиз тайёр, бандлик
        марказига боринг» дея олади — қўнғироқни бандлик
        маркази қилишини кутиб ўтирмасдан.
      */}
      <VaucherNavbati
        navbat={vNavbat}
        hisob={vHisob}
        qamrovNomi={mahalla ? `${mahalla.nomiKirill} МФЙ` : 'Хатирчи тумани'}
        bera={false}
      />

      {/*
        ── БЎШ ИШ ЎРИНЛАРИ ТАҚСИМОТИ ──

        Эълонни бандлик маркази киритади, одамни эса маҳалла
        ходими билади. Илгари бу иккови учрашмасди: эълон
        базада «бор» бўлиб турар, ишсиз одам рўйхатда «бор»
        бўлиб турарди.

        Энди ходим ўз саҳифасида кўради: қайси эълон, нечта
        ўрин бўш ва ЎЗ маҳалласидаги қайси фуқаро тўғри келади
        — исми ва телефони билан.

        Мос фуқаро бўлмаса блок умуман чиқмайди — ходимга ҳар
        кирганда бўш карточка кўрсатишнинг маъноси йўқ.
      */}
      {filtr.mahallaId && <MahallaOrinlari mahallaId={filtr.mahallaId} />}

      {xatlovlar.length === 0 ? (
        <div className="karta p-8 text-center">
          <p className="text-sm text-ink-muted">{tr('Ҳали бирорта хатлов киритилмаган.')}</p>
          <Link
            href="/xatlov/yangi"
            className="mt-4 inline-flex items-center gap-1.5 tugma-asosiy rounded-md px-4 py-2.5 text-sm font-semibold"
          >
            <HousePlus className="h-4 w-4" />
            {tr('Биринчи хатловни бошлаш')}
          </Link>
        </div>
      ) : (
        <div className="karta divide-y divide-line">
          {/*
            ── РЎЙХАТ ЧЕГАРАСИ ОЧИҚ АЙТИЛАДИ ──

            Юздан ортиқ хатлов қилган маҳаллада рўйхатда фақат
            энг янгилари кўринади. Буни айтмасак, ходим
            «эскилари йўқолибди» деб ўйлайди — ҳолбуки улар
            жойида, фақат бу экранга сиғмаган.
          */}
          {royxatToldi && (
            <p className="px-4 py-2.5 text-[11px] leading-relaxed text-ink-faint">
              {tr('Рўйхатда энг сўнгги')} {RO_YXAT_HAJMI} {tr('таси кўрсатилган.')}{' '}
              {tr('Жами')} <b className="raqam text-ink">{yuborilganSoni}</b>{' '}
              {tr('та хатлов юборилган — юқоридаги кўрсаткичлар шу тўлиқ сондан ҳисобланган.')}
            </p>
          )}

          {xatlovlar.map((x) => {
            const nishon = HOLAT_NISHONI[x.holati];
            return (
              /*
                Қатор ичида ИККИ амал бор: очиш ва ўчириш.
                Тугмани `Link` ИЧИГА қўйиб бўлмайди — босилганда
                иккови ҳам ишга тушарди ва ходим ўчиришни
                тасдиқлагунча саҳифа алмашиб кетарди.
              */
              <div
                key={x.id}
                className="flex items-center gap-2 p-3.5 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-surface-muted"
              >
                <Link
                  href={x.holati === 'QORALAMA' ? `/xatlov/${x.id}/tahrir` : `/xatlov/${x.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-ink">{tr(x.oilaBoshligi)}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${nishon.sinf}`}
                    >
                      {tr(nishon.matn)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-faint">
                    {x.manzil} · {tr(x.mahalla.nomiKirill)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="raqam text-xs text-ink-muted">
                    {x.jamiAzo} {tr('киши')}
                    {x.ishsizlarSoni > 0 && (
                      <span className="text-warn"> · {x.ishsizlarSoni} {tr('ишсиз')}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{formatDate(x.updatedAt)}</p>
                </div>
                </Link>

                <OchirishTugmasi
                  turi="xonadon"
                  id={x.id}
                  nomi={`${x.oilaBoshligi} · ${x.manzil}`}
                  qoralamami={x.holati === 'QORALAMA'}
                  qayerga="/xatlov"
                  kichik
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Karta({
  ikonka,
  nomi,
  qiymat,
  izoh,
}: {
  ikonka: React.ReactNode;
  nomi: string;
  qiymat: string;
  izoh: string;
}) {
  return (
    <div className="karta p-4">
      <div className="flex items-center gap-2 text-ink-faint">
        {ikonka}
        <span className="text-xs font-medium">{nomi}</span>
      </div>
      <p className="raqam mt-2 text-2xl font-bold text-ink">{qiymat}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>
    </div>
  );
}
