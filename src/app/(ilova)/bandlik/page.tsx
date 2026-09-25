import Link from 'next/link';
import { TasdiqlashNavbati } from '@/components/telegram/tasdiqlash-navbati';
import { matnchi } from '@/lib/alifbo-server';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  ClipboardCheck,
  GraduationCap,
  Hourglass,
  Plane,
  Target,
  UserCheck,
  UserX,
} from 'lucide-react';
import { bandlikIshi, joriySessiya } from '@/lib/auth';
import { panelQamroviniOl } from '@/lib/panel-qamrovi';
import { prisma } from '@/lib/prisma';
import { FAOL_ELON } from '@/lib/elon-muddati';
import { davrOqi, tahlilOl } from '@/lib/tahlil';
import { HisobotTugmalari } from '@/components/panel/hisobot-tugmalari';
import { AiXulosa } from '@/components/panel/ai-xulosa';
import { VaucherNavbati } from '@/components/it-vaucher/vaucher-navbati';
import { vaucherHisobi, vaucherNavbati } from '@/lib/it-vaucher';
import { DinamikaBloglari } from '@/components/panel/dinamika-blogi';
import { HududXaritasi } from '@/components/xarita/hudud-xaritasi';
import { xaritaMalumoti } from '@/lib/xarita/xarita-malumoti';
import { DavrTanlash } from '@/components/panel/davr-tanlash';
import { MahallaTanlash } from '@/components/panel/mahalla-tanlash';
import { DublikatRoyxati } from '@/components/dublikat/dublikat-royxati';
import { formatPhone } from '@/lib/utils';
import { hududKaliti } from '@/lib/hudud-qidiruv';
import { HolatNishoni } from '@/components/ishsiz/holat-nishoni';
import { orinHisobi } from '@/lib/joylashtirish';
import { bandOrinlar as bandOrinlarniSana } from '@/lib/moslashtirish';
import { moslikniHisobla, type Moslik } from '@/lib/moslik';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Операцион панел') };
}

/**
 * Номзод чипига қўйиладиган изоҳ (tooltip).
 *
 * Тахтада жой тор — балл рақами кўринади, «нега» эса сичқонча
 * тегизилганда чиқади. Тўлиқ тушунтириш эълон саҳифасида.
 */
function moslikIzohi(m: Moslik, tr: (matn: string) => string): string {
  const qatorlar = [...m.sabablar, ...m.ogohlantirishlar.map((x) => `! ${x}`)];
  if (m.tosiq) qatorlar.unshift(`⚠ ${m.tosiq}`);
  return qatorlar.map(tr).join('\n');
}

export default async function BandlikSahifasi({
  searchParams,
}: {
  searchParams: { davr?: string; mfy?: string };
}) {
  const tr = matnchi();
  const davr = davrOqi(searchParams.davr);

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (!bandlikIshi(sessiya.rol)) redirect('/');

  /*
   * ── ҚАМРОВ: туман бўйичами ёки битта МФЙ бўйича ──
   *
   * Ҳоким панелидаги билан БИТТА ёрдамчи. Раҳбар ҳам «Уйшунда
   * нима гап» деган саволга панелнинг ўзидан жавоб олади.
   *
   * Маҳаллага бириктирилган ходимда танлов ишламайди —
   * `panelQamroviniOl` сессиядаги МФЙ ни мажбурий қилади.
   */
  const qamrov = await panelQamroviniOl(sessiya, searchParams.mfy);
  const mahallaId = qamrov.mahallaId;
  /*
   * Қуйидаги сўровларнинг ҳаммаси шу фильтрдан ўтади: навбат,
   * мослаштириш, эълонлар ва миграция. Яъни МФЙ танланганда
   * панелдаги ЯККА бир рақам ҳам туман бўйича қолиб кетмайди.
   */
  const filtr = mahallaId ? { mahallaId } : {};

  const [
    suhbatsiz,
    taklifsiz,
    ishOrinlari,
    istaklar,
    migratsiya,
    t,
    xarita,
    vHisob,
    vNavbat,
    tasdiqNavbati,
  ] = await Promise.all([
    // 1. Suhbat kutayotganlar - eng birinchi navbat
    prisma.unemployedPerson.findMany({
      where: { ...filtr, holati: 'ANIQLANDI' },
      orderBy: { createdAt: 'asc' },
      take: 15,
      select: {
        id: true,
        fish: true,
        telefon: true,
        holati: true,
        xohlaganIsh: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),

    // 2. Suhbatdan o'tgan, lekin taklif berilmagan
    prisma.unemployedPerson.findMany({
      where: { ...filtr, holati: 'SUHBAT_OTKAZILDI' },
      orderBy: { suhbatSanasi: 'asc' },
      take: 15,
      select: {
        id: true,
        fish: true,
        telefon: true,
        holati: true,
        xohlaganIsh: true,
        mutaxassisligi: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),

    prisma.vacancy.findMany({
      where: { ...filtr, ...FAOL_ELON() },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        korxonaNomi: true,
        lavozim: true,
        yonalish: true,
        talablar: true,
        maosh: true,
        ornlarSoni: true,
        mahallaId: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),

    /*
     * Иш истаклари — мослаштириш учун.
     *
     * Майдонлар тўлиқ ўқилади: тахтадаги тартиб эълон
     * саҳифасидаги тартиб билан БИР ХИЛ бўлиши керак, бу эса
     * иккаласи ҳам битта ҳисобдан («moslik.ts») фойдаланишини
     * талаб қилади. Икки жойда икки хил тартиб чиқса, мутахассис
     * қайси бирига ишонишни билмай қоларди.
     */
    prisma.unemployedPerson.findMany({
      where: {
        ...filtr,
        xohlaganIsh: { not: null },
        vacancyId: null,
        holati: { in: ['ANIQLANDI', 'SUHBAT_OTKAZILDI', 'TAKLIF_BERILDI'] },
      },
      select: {
        id: true,
        fish: true,
        xohlaganIsh: true,
        mahallaId: true,
        jinsi: true,
        tugilganSana: true,
        malumoti: true,
        mutaxassisligi: true,
        organmoqchiKasb: true,
        oxirgiIshJoyi: true,
        avvalgiIshJoyi: true,
        kutilayotganMaosh: true,
        ishgaTayyorligi: true,
        haydovchilikGuvohnomasi: true,
        haydovchilikToifasi: true,
        takliflar: true,
        vacancyId: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),

    prisma.unemployedPerson.count({
      where: { ...filtr, takliflar: { has: 'Xorijga mehnat migratsiyasi' } },
    }),

    tahlilOl(mahallaId, davr),

    /* Харита маълумоти — МФЙ кесимида беш ўлчов */
    /* Харита ҳар доим туман бўйича — танлангани ёлқинланади
       (ҳоким панелидаги изоҳга қаранг) */
    xaritaMalumoti(qamrov.tanlashMumkin ? undefined : mahallaId),

    vaucherHisobi(mahallaId),
    vaucherNavbati(mahallaId),


    /*
     * ── МАҲАЛЛА ХОДИМЛАРИ ХАБАРИ ──
     *
     * Telegram'даги «иш топдим» тугмаси босилганда шу
     * навбатга тушади. Марказ тасдиқлагунча фуқаро расман
     * жойлаштирилмайди — шунинг учун навбат КЎРИНАДИГАН
     * жойда туриши керак.
     */
    prisma.joylashuvXabari.findMany({
      where: {
        holati: 'XABAR_QILINDI',
        ...(mahallaId ? { ishsiz: { mahallaId } } : {}),
      },
      orderBy: { muddat: 'asc' },
      take: 20,
      select: {
        id: true,
        muddat: true,
        ishsiz: { select: { fish: true, mahalla: { select: { nomiKirill: true } } } },
        vacancy: { select: { lavozim: true, korxonaNomi: true } },
        xabarchi: { select: { fullName: true } },
      },
    }),
  ]);

  /*
   * Маҳаллалар рўйхати — танлов ва ҳисобот тугмалари учун.
   * Қамров ёрдамчиси уни аллақачон ўқиган, иккинчи сўров
   * юборилмайди.
   */
  const mahallalar = qamrov.mahallalar;

  /*
   * Moslashtirish: bo'sh ish o'rni lavozimi bilan fuqaroning
   * "qanday ishda ishlashni xohlaydi" javobini solishtiramiz.
   *
   * Taqqoslash `hududKaliti` orqali - u fonetik kalit hisoblaydi va
   * kirill/lotin, apostrof, "payvandchi"/"пайвандчи" farqini
   * yo'qotadi. Aynan mahalla qidiruvidagi funksiya, chunki muammo
   * bir xil: bir narsa turlicha yozilgan.
   */
  type Istak = (typeof istaklar)[number];
  const istakKaliti = new Map<string, Istak[]>();
  for (const i of istaklar) {
    if (!i.xohlaganIsh) continue;
    const k = hududKaliti(i.xohlaganIsh);
    if (!k) continue;
    const r = istakKaliti.get(k) ?? [];
    r.push(i);
    istakKaliti.set(k, r);
  }

  /*
   * Nomzodlar O'Z MAHALLASI birinchi bo'lib tartiblanadi.
   *
   * Xatirchi tumani keng: bir chekkadagi mahalladan ikkinchisiga
   * har kuni qatnash amalda imkonsiz, ayniqsa 3 mln so'mlik ish
   * uchun. Tartiblamasak, mutaxassisga 80 ta ism ko'rsatiladi va
   * ular orasidan kim yaqin ekanini u o'zi qidirib topishi kerak
   * bo'ladi - ya'ni taxta foyda bermaydi.
   *
   * Boshqa mahalladagilar butunlay olib tashlanmaydi: ba'zi kasblar
   * bo'yicha o'z mahallasida nomzod bo'lmasligi mumkin. Ular
   * ro'yxatning oxirida, mahalla nomi bilan turadi.
   */
  const KORSATILADIGAN = 6;

  /*
   * Band o'rinlar bitta so'rovda sanaladi va TO'LGAN e'lonlar
   * taxtadan chiqariladi: bo'sh o'rni qolmagan e'lonni taklif
   * qilish - mutaxassisni ham, fuqaroni ham bekorga yugurtirish.
   */
  const band = await bandOrinlarniSana(ishOrinlari.map((v) => v.id));

  const moslar = ishOrinlari
    .map((v) => {
      const hisob = orinHisobi(v.ornlarSoni, band.get(v.id) ?? 0);
      const barchasi = istakKaliti.get(hududKaliti(v.lavozim)) ?? [];

      /*
       * Nomzodlar O'Z MAHALLASI birinchi bo'lib tartiblanadi, ichida
       * esa moslik balli bo'yicha - e'lon sahifasidagi tartib bilan
       * bir xil bo'lishi uchun.
       */
      const baholangan = barchasi.map((n) => ({
        nomzod: n,
        moslik: moslikniHisobla(
          {
            lavozim: v.lavozim,
            yonalish: v.yonalish,
            talablar: v.talablar,
            maosh: v.maosh,
            mahallaId: v.mahallaId,
          },
          n
        ),
      }));

      const tartib = (a: (typeof baholangan)[number], b: (typeof baholangan)[number]) => {
        const at = a.moslik.tosiq ? 1 : 0;
        const bt = b.moslik.tosiq ? 1 : 0;
        if (at !== bt) return at - bt;
        return b.moslik.ball - a.moslik.ball;
      };

      const ozMahallasi = baholangan.filter((n) => n.nomzod.mahallaId === v.mahallaId).sort(tartib);
      const boshqalar = baholangan.filter((n) => n.nomzod.mahallaId !== v.mahallaId).sort(tartib);

      return {
        ...v,
        hisob,
        ozMahallasi,
        korsatiladigan: [...ozMahallasi, ...boshqalar].slice(0, KORSATILADIGAN),
        jamiNomzod: barchasi.length,
      };
    })
    .filter((v) => v.jamiNomzod > 0 && !v.hisob.toldimi)
    // Avval o'z mahallasida nomzodi borlar - ular bilan bugun ish qilinadi
    .sort((a, b) => b.ozMahallasi.length - a.ozMahallasi.length || b.jamiNomzod - a.jamiNomzod);

  /*
   * KPI - BO'SH qolgan o'rinlar, e'lon qilinganlar emas.
   *
   * Ilgari bu yerda `ornlarSoni` yig'indisi turardi va joylashuv
   * bo'lgandan keyin ham o'zgarmasdi: rahbar panelda "48 bo'sh
   * o'rin" ni ko'rib turardi-yu, amalda 12 tasi qolgan bo'lardi.
   */
  const boshOrinlar = ishOrinlari.reduce(
    (s, v) => s + orinHisobi(v.ornlarSoni, band.get(v.id) ?? 0).qolgan,
    0
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Операцион панел')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {tr(qamrov.nomi)} · {tr('кундалик иш: навбат, мослаштириш ва курс талаби')}
          </p>
        </div>

        {/*
          Rahbar hisobotni shu yerdan oladi va hokimga ko'rsatadi -
          aynan shu ish oqimi uchun tugma sahifa boshida turadi.
        */}
        <div className="flex flex-wrap items-center gap-3">
          {qamrov.tanlashMumkin && (
            <MahallaTanlash
              joriyId={mahallaId ?? null}
              joriyNomi={qamrov.nomi}
              mahallalar={mahallalar}
            />
          )}
          <DavrTanlash joriy={davr} />
          {/*
            Ҳисобот тугмаларига МФЙ рўйхати берилмайди.

            Илгари берилар эди ва экранда ИККИТА ҳудуд танлови
            ёнма-ён турарди: панелники ва ҳисоботники. Ҳоким
            қайси бири нимага таъсир қилишини билмасди — биринчиси
            экрандаги рақамларни, иккинчиси эса юкланадиган
            файлни ўзгартирарди.

            Энди биттаси қолди. Ҳисобот панел қайси ҳудудни
            кўрсатиб турган бўлса, ЎШАНИ юклайди.
          */}
          <HisobotTugmalari qamrov={{ nomi: qamrov.nomi, mahallaId }} />
        </div>
      </div>

      {/*
        Раҳбарга ҳам ўша хулоса кўринади. Ҳоким билан бир хил
        матн бўлиши АТАЙЛАБ: йиғилишда иккиси бир хил суратдан
        гаплашиши керак, акс ҳолда «менда бошқача ёзилган» деган
        баҳс чиқади.
      */}
      <AiXulosa mahallaId={mahallaId} qamrovNomi={qamrov.nomi} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi
          ikonka={<UserCheck className="h-4 w-4" />}
          nomi={tr("Суҳбат кутмоқда")}
          qiymat={t.voronka[0].soni - t.voronka[1].soni}
          xavfli={t.voronka[0].soni - t.voronka[1].soni > 30}
        />
        <Kpi
          ikonka={<Target className="h-4 w-4" />}
          nomi={tr("Таклиф кутмоқда")}
          qiymat={t.voronka[1].soni - t.voronka[2].soni}
        />
        <Kpi
          ikonka={<GraduationCap className="h-4 w-4" />}
          nomi={tr("Бўш иш ўрни")}
          qiymat={boshOrinlar}
        />
        <Kpi ikonka={<Plane className="h-4 w-4" />} nomi={tr("Миграция номзоди")} qiymat={migratsiya} />
      </div>

      {/*
        ── ЗАНЖИРНИНГ ИККИ УЗИЛГАН ЖОЙИ ──

        Иккови ҳам ҲИСОБЛАНАРДИ, лекин ҳеч қайси саҳифада
        кўринмасди:

        · 12 ойдан ошган ишсизлар — энг заиф гуруҳ, воронкада
          бошқалар билан аралашиб кетган.
        · Мустаҳкамлаш текшируви — «3 ойдан кейин текширилади»
          деб ёзилган эди, аммо фақат қўлда белгиланарди ва
          ҳеч ким эсламасди.

        · Рад этганлар — воронкадан чиқиб кетган, «нега натижа
          кам?» саволининг жавоби.
      */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi
          ikonka={<Hourglass className="h-4 w-4" />}
          nomi={tr("12 ойдан ошиб ишсиз")}
          qiymat={t.jami.uzoqIshsiz}
          xavfli={t.jami.uzoqIshsiz > 0}
          yol="/ishsizlar?uzoq=1"
          izoh={tr('энг заиф гуруҳ — аввал шулар чақирилсин')}
        />
        <Kpi
          ikonka={<ClipboardCheck className="h-4 w-4" />}
          nomi={tr("Мустаҳкамлаш текшируви")}
          qiymat={t.jami.tekshiruvKutayotgan}
          xavfli={t.jami.tekshiruvKutayotgan > 0}
          yol="/ishsizlar?tekshiruv=1"
          izoh={tr('жойлаштирилгани 3 ойдан ошди, тасдиқланмаган')}
        />
        <Kpi
          ikonka={<UserX className="h-4 w-4" />}
          nomi={tr("Таклифдан бош тортган")}
          qiymat={t.jami.radEtgan}
          yol="/ishsizlar?holati=RAD_ETDI"
          izoh={tr('воронкадан чиқиб кетган')}
        />
      </div>

      {/*
        ── Ўсиш ва камайиш сурати ──

        Раҳбарга ҳоким билан БИР ХИЛ диаграмма кўринади.
        Фарқи шуки, раҳбар бу рақамни йиғилишдан олдин кўради:
        устун юқорига кетган бўлса, сабабини ойлик оқим
        диаграммасидан ўша ернинг ўзида топади.
      */}
      <DinamikaBloglari dinamika={t.dinamika} davr={davr} qamrovNomi={qamrov.nomi} />

      {/*
        ── ХАРИТА ──

        Раҳбарга ҳокимникидан кўра КЎПРОҚ керак: у қайси МФЙ га
        мутахассис юборишни ҳал қилади. Ҳудудга босилса, ўша
        МФЙ нинг хонадонлари ва ишсизлари рўйхати очилади —
        харитадан тўғридан-тўғри ишга ўтади.
      */}
      <HududXaritasi
        qatorlar={xarita.qatorlar}
        ulanmagan={xarita.ulanmagan}
        qamrovNomi={qamrov.nomi}
        yolqinMahallaId={mahallaId ?? null}
        sarlavha="Туман харитаси — қайси МФЙ га бориш керак"
        havolalar
      />

      {/*
        ── IT-ШАҲАРЧА ВАУЧЕРИ ──

        Занжирнинг ИККИНЧИ ҳалқаси ва айнан шу ерда у узиларди:
        маҳалла ходими «IT ўрганмоқчи» деб белгиларди, бандлик
        марказида эса уни кўрадиган жой йўқ эди.

        Раҳбар панелида турибди, чунки ваучер — молиявий
        мажбурият ва уни марказ беради.
      */}
      <VaucherNavbati
        navbat={vNavbat}
        hisob={vHisob}
        qamrovNomi={qamrov.nomi}
        bera
      />

      {/*
        Такрорланган фуқаролар — раҳбарга ҳам. Ишсизлар сони
        унинг асосий кўрсаткичи, ва у сон нотўғри бўлса,
        барча режа нотўғри тузилади.
      */}
      <DublikatRoyxati chegara={10} />

      {/* ── Moslashtirish taxtasi ── */}
      {/*
        Навбат ЭНГ ТЕПАДА: тасдиқланмаган хабар — бу
        ҳужжатсиз турган рақам. Пастга қўйилса, марказ уни
        кунлар давомида кўрмай ўтиб кетарди.
      */}
      <TasdiqlashNavbati
        yozuvlar={tasdiqNavbati.map((x) => ({
          id: x.id,
          fish: x.ishsiz.fish,
          mahallaNomi: x.ishsiz.mahalla.nomiKirill,
          lavozim: x.vacancy.lavozim,
          korxonaNomi: x.vacancy.korxonaNomi,
          xabarchi: x.xabarchi.fullName,
          muddat: x.muddat.toLocaleDateString('ru-RU'),
          kechikkan: x.muddat.getTime() < Date.now(),
        }))}
      />

      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">{tr('Мослаштириш тахтаси')}</h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Бўш иш ўрни ↔ шу касбда ишлашни истаган фуқаролар')}
        </p>

        {moslar.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            {tr('Ҳозирча мос жуфтлик топилмади. Бўш иш ўринлари рўйхатини тўлдиринг ёки фуқароларнинг иш истагини аниқлаштиринг.')}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {moslar.slice(0, 10).map((v) => (
              <div key={v.id} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/ish-orinlari/${v.id}`}
                    className="text-sm font-medium text-ink transition-colors hover:text-accent"
                  >
                    {v.lavozim} — {v.korxonaNomi}
                  </Link>
                  <span className="raqam shrink-0 text-xs text-ink-faint">
                    {tr(`${v.hisob.qolgan} ўрин бўш · ${v.mahalla.nomiKirill}`)}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-ink-faint">
                  {v.ozMahallasi.length > 0
                    ? tr(`Шу маҳаллада ${v.ozMahallasi.length} та номзод`)
                    : tr('Шу маҳаллада номзод йўқ')}
                  {v.jamiNomzod > v.ozMahallasi.length &&
                    tr(` · бошқа маҳаллаларда яна ${v.jamiNomzod - v.ozMahallasi.length} та`)}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v.korsatiladigan.map(({ nomzod: n, moslik }) => {
                    const yaqin = n.mahallaId === v.mahallaId;
                    return (
                      <Link
                        key={n.id}
                        href={`/ishsizlar/${n.id}`}
                        title={moslikIzohi(moslik, tr)}
                        className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-opacity hover:opacity-80 ${
                          yaqin
                            ? 'bg-accent-soft text-accent'
                            : 'border border-line bg-surface text-ink-muted'
                        }`}
                      >
                        {n.fish}
                        {/* Boshqa mahalladan bo'lsa - qayerdanligi ko'rinsin */}
                        {!yaqin && (
                          <span className="text-ink-faint">· {tr(n.mahalla.nomiKirill)}</span>
                        )}
                        <span className="raqam text-ink-faint">{moslik.ball}%</span>
                      </Link>
                    );
                  })}
                  {v.jamiNomzod > v.korsatiladigan.length && (
                    <Link
                      href={`/ishsizlar?q=${encodeURIComponent(v.lavozim)}`}
                      className="px-1 py-1 text-[11px] text-ink-faint hover:text-accent"
                    >
                      {tr(`+${v.jamiNomzod - v.korsatiladigan.length} та — барчаси`)}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Navbatlar ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Navbat
          sarlavha={tr("Суҳбат навбати")}
          izoh={tr("Хатловда аниқланган, ҳали суҳбат бўлмаган фуқаролар")}
          royxat={suhbatsiz}
          jami={t.voronka[0].soni - t.voronka[1].soni}
          yol="/ishsizlar?holati=ANIQLANDI"
        />
        <Navbat
          sarlavha={tr("Таклиф навбати")}
          izoh={tr("Суҳбатдан ўтган, лекин таклиф берилмаган фуқаролар")}
          royxat={taklifsiz}
          jami={t.voronka[1].soni - t.voronka[2].soni}
          yol="/ishsizlar?holati=SUHBAT_OTKAZILDI"
        />
      </div>

      {/* ── Kurs talabi ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">{tr('Курс очиш таклифи')}</h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('15 тадан ошган касблар — гуруҳ тўлади')}
        </p>

        {t.kursTalabi.filter((k) => k.soni >= 15).length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            {tr('Ҳали бирорта касб бўйича гуруҳ тўладиган талаб йиғилмаган.')}
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {t.kursTalabi
              .filter((k) => k.soni >= 15)
              .map((k) => (
                <div
                  key={k.kasb}
                  className="flex items-center justify-between gap-2 rounded-md border border-ok bg-ok-bg px-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-ink">
                    {k.kasb}
                  </span>
                  <span className="raqam shrink-0 text-sm font-bold text-ok">
                    {tr(`${k.soni} та`)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  ikonka,
  nomi,
  qiymat,
  xavfli,
  yol,
  izoh,
}: {
  ikonka: React.ReactNode;
  nomi: string;
  qiymat: number;
  xavfli?: boolean;
  /** Берилса — карта босилади ва рўйхатга олиб боради */
  yol?: string;
  izoh?: string;
}) {
  const ichi = (
    <>
      <div className={`flex items-center gap-2 ${xavfli ? 'text-warn' : 'text-ink-faint'}`}>
        {ikonka}
        <span className="text-xs font-medium">{nomi}</span>
      </div>
      <p className="raqam mt-2 text-2xl font-bold text-ink">{qiymat}</p>
      {izoh && <p className="mt-0.5 text-[11px] leading-tight text-ink-faint">{izoh}</p>}
    </>
  );

  /*
   * Рақам БОСИЛАДИГАН бўлиши керак: мутахассис «12 ойдан
   * ошган 34 киши» ни кўриб, кимлар экани билмасдан нима
   * қила олади? Илгари рақам чиқарди-ю, ортидан ҳеч нарса
   * йўқ эди.
   */
  if (yol) {
    return (
      <Link
        href={yol}
        className={`metric-card karta karta-bosiladigan p-4 ${xavfli ? 'border-warn' : ''}`}
      >
        {ichi}
      </Link>
    );
  }

  return <div className={`metric-card karta p-4 ${xavfli ? 'border-warn' : ''}`}>{ichi}</div>;
}

interface NavbatOdami {
  id: string;
  fish: string;
  telefon: string | null;
  holati: 'ANIQLANDI' | 'SUHBAT_OTKAZILDI' | 'TAKLIF_BERILDI' | 'JOYLASHTIRILDI' | 'TASDIQLANDI' | 'RAD_ETDI';
  xohlaganIsh: string | null;
  mahalla: { nomiKirill: string };
}

function Navbat({
  sarlavha,
  izoh,
  royxat,
  jami,
  yol,
}: {
  sarlavha: string;
  izoh: string;
  royxat: NavbatOdami[];
  jami: number;
  yol: string;
}) {
  const tr = matnchi();

  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">{sarlavha}</h2>
        <span className="raqam shrink-0 text-sm font-bold text-ink">{jami}</span>
      </div>
      <p className="mt-1 text-xs text-ink-faint">{izoh}</p>

      {royxat.length === 0 ? (
        <p className="quti-ok mt-3">{tr('Навбат бўш.')}</p>
      ) : (
        <>
          <div className="mt-3 divide-y divide-line">
            {royxat.map((p) => (
              <Link
                key={p.id}
                href={`/ishsizlar/${p.id}`}
                className="flex items-center gap-2 py-2.5 transition-colors hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{tr(p.fish)}</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {tr(p.mahalla.nomiKirill)}
                    {p.xohlaganIsh ? tr(` · истаги: ${p.xohlaganIsh}`) : ''}
                  </p>
                </div>
                {p.telefon && (
                  <span className="raqam hidden shrink-0 text-[11px] text-ink-muted sm:block">
                    {formatPhone(p.telefon)}
                  </span>
                )}
                <HolatNishoni holati={p.holati} />
              </Link>
            ))}
          </div>

          {jami > royxat.length && (
            <Link
              href={yol}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-line py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              {tr(`Барчасини кўриш (${jami})`)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </>
      )}
    </section>
  );
}
