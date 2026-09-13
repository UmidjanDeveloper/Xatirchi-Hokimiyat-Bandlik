import Link from 'next/link';
import { matnchi } from '@/lib/alifbo-server';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, Pencil, UserRound } from 'lucide-react';
import { aiXulosaSoraydi, joriySessiya, mahallagaRuxsat } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jurnal } from '@/lib/api-auth';
import { formatDate, formatPhone } from '@/lib/utils';
import {
  CHET_EL_DAVLATI,
  DAROMAD_MANBAI,
  HAYDOVCHILIK_TOIFASI,
  ICHIMLIK_SUVI,
  ISH_TURI_ISTAGI,
  KAMBAGALLIK_SABABI,
  KASB_YONALISHI,
  MABLAG_YONALISHI,
  MALUMOT,
  MASUL_TASHKILOT,
  MOLIYA_TURI,
  UY_HOLATI,
  kirillcha,
} from '@/lib/constants';
import { HolatNishoni } from '@/components/ishsiz/holat-nishoni';
import { ChoraQoshish } from '@/components/chora/chora-qoshish';
import { ImzoKorinishi } from '@/components/xatlov/imzo-maydoni';
import { XonadonXulosasi } from '@/components/xatlov/xonadon-xulosasi';
import { qoidaXulosasi, xonadonDalili } from '@/lib/xonadon-xulosa';
import { ChoraHolati } from '@/components/chora/chora-holati';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Хонадон хатлови') };
}

function Qator({ nomi, qiymat }: { nomi: string; qiymat: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2 last:border-0">
      <span className="text-xs text-ink-faint">{nomi}</span>
      <span className="text-sm font-medium text-ink">{qiymat}</span>
    </div>
  );
}

function Bolim({
  raqam,
  sarlavha,
  children,
}: {
  raqam: string;
  sarlavha: string;
  children: React.ReactNode;
}) {
  return (
    <section className="karta p-4 sm:p-5">
      <h2 className="bolim-sarlavha mb-3">
        <span className="bolim-raqam">{raqam}</span>
        <span className="min-w-0">{sarlavha}</span>
      </h2>
      <div className="grid gap-x-6 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default async function XonadonSahifasi({ params }: { params: { id: string } }) {
  const tr = matnchi();

  /* Bo'sh qiymatlarni bir xil ko'rinishda ko'rsatadi */
  const q = (v: unknown): string => {
    if (v == null || v === '') return '—';
    if (typeof v === 'boolean') return v ? tr('Ҳа') : tr('Йўқ');
    if (typeof v === 'bigint') return tr(`${Number(v).toLocaleString('ru-RU')} сўм`);
    if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
    return String(v);
  };


  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const x = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      mahalla: { select: { nomiKirill: true } },
      xodim: { select: { fullName: true, position: true } },
      ishsizlar: { orderBy: { createdAt: 'asc' } },
      topshiriqlar: { orderBy: { muddat: 'asc' } },
    },
  });

  if (!x) notFound();
  if (!mahallagaRuxsat(sessiya, x.mahallaId)) redirect('/xatlov');

  // Xonadon kartochkasini ochish - oila daromadi va sog'liq holatini
  // ko'rish demak, shuning uchun jurnalga yoziladi.
  await jurnal(sessiya.userId, 'KORISH', { obyektTuri: 'Household', obyektId: x.id });

  const tahrirlashMumkin =
    sessiya.rol !== 'HOKIM' && !(x.holati === 'TASDIQLANGAN' && sessiya.rol === 'YETTILIK');

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* ── Sarlavha ── */}
      <div className="karta p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="sahifa-sarlavha">{x.oilaBoshligi}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {x.manzil} · {tr(x.mahalla.nomiKirill)} {tr('МФЙ')}
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              {tr('Хатловни ўтказди:')} {x.xodim.fullName}
              {x.xodim.position ? ` (${x.xodim.position})` : ''} ·{' '}
              {formatDate(x.xatlovSanasi)}
            </p>
          </div>

          {tahrirlashMumkin && (
            <Link
              href={`/xatlov/${x.id}/tahrir`}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
              {tr('Таҳрирлаш')}
            </Link>
          )}
        </div>

        {x.holati === 'TASDIQLANGAN' && (
          <div className="quti-ok mt-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {tr('Хатлов бандлик маркази томонидан тасдиқланган')}
          </div>
        )}
      </div>

      {/* ── Ishsizlar - eng muhim blok, tepada ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="bolim-sarlavha mb-3">
          <span className="bolim-raqam">
            <UserRound className="h-4 w-4" />
          </span>
          <span>{tr('Ишсиз фуқаролар (')}{x.ishsizlar.length})</span>
        </h2>

        {x.ishsizlar.length === 0 ? (
          <p className="py-2 text-sm text-ink-muted">{tr('Бу хонадонда ишсиз фуқаро йўқ.')}</p>
        ) : (
          <div className="space-y-2">
            {x.ishsizlar.map((p) => (
              <Link
                key={p.id}
                href={`/ishsizlar/${p.id}`}
                className="flex items-center gap-3 rounded-md border border-line p-3 transition-colors hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-ink">{p.fish}</span>
                    <HolatNishoni holati={p.holati} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-faint">
                    {p.jinsi === 'Erkak' ? tr('Эркак') : tr('Аёл')}
                    {p.malumoti ? ` · ${tr(kirillcha(MALUMOT, p.malumoti))}` : ''}
                    {p.xohlaganIsh ? ` · ${p.xohlaganIsh}` : ''}
                  </p>
                  {/*
                    Тоифа ва ваучер рўйхатда КЎРИНИБ туради:
                    бандлик ходими ҳайдовчи керак бўлган эълонни
                    очганда, ҳар бир фуқаро картасини очиб
                    чиқмасдан кимни таклиф қилишни билади.
                  */}
                  {(p.haydovchilikToifasi.length > 0 || p.itShaharchaVaucheri) && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.haydovchilikToifasi.map((t) => (
                        <span
                          key={t}
                          className="raqam rounded border border-line bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-muted"
                          title={tr(kirillcha(HAYDOVCHILIK_TOIFASI, t))}
                        >
                          {t}
                        </span>
                      ))}
                      {p.itShaharchaVaucheri && (
                        <span className="rounded border border-accent bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
                          {tr('IT ваучер')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {p.telefon && (
                  <span className="raqam shrink-0 text-xs text-ink-muted">
                    {formatPhone(p.telefon)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── I ── */}
      <Bolim raqam="I" sarlavha={tr("Меҳнат ва бандлик")}>
        <Qator nomi={tr("Оиладаги умумий аъзолар")} qiymat={q(x.jamiAzo)} />
        <Qator nomi={tr("Болалар (18 ёшгача)")} qiymat={q(x.bolalarSoni)} />
        <Qator nomi={tr("Меҳнатга лаёқатлилар")} qiymat={q(x.mehnatgaLayoqatli)} />
        <Qator nomi={tr("Ишлайдиганлар")} qiymat={q(x.ishlaydiganlar)} />
        <Qator nomi={tr("Давлат корхоналарида")} qiymat={q(x.davlatKorxonada)} />
        <Qator nomi={tr("Хусусий секторда")} qiymat={q(x.xususiySektorda)} />
        <Qator nomi={tr("Ишсизлар")} qiymat={q(x.ishsizlarSoni)} />
        <Qator nomi={tr("Боғча кутаётган аёллар")} qiymat={q(x.bogchaKutayotganAyollar)} />
        <Qator
          nomi={tr("Ишсизлик муддати")}
          qiymat={x.ishsizlikMuddatiOy ? tr(`${x.ishsizlikMuddatiOy} ой`) : '—'}
        />
        <Qator nomi={tr("Иш турига истак")} qiymat={tr(kirillcha(ISH_TURI_ISTAGI, x.ishTuriIstagi))} />
        <Qator nomi={tr("Касб-ҳунарга ўқиш истаги")} qiymat={q(x.kasbHunarIstagi)} />
        <Qator
          nomi={tr("Ўқиш йўналиши")}
          qiymat={q(x.kasbHunarYonalishi.map((y) => tr(kirillcha(KASB_YONALISHI, y))))}
        />
      </Bolim>

      {/* ── II ── */}
      <Bolim raqam="II" sarlavha={tr("Тадбиркорлик ва молиявий эҳтиёж")}>
        <Qator nomi={tr("Тадбиркорлик истаги")} qiymat={q(x.tadbirkorlikIstagi)} />
        <Qator
          nomi={tr("Соҳаси")}
          qiymat={q(x.tadbirkorlikSohasi.map((y) => tr(kirillcha(MABLAG_YONALISHI, y))))}
        />
        <Qator nomi={tr("Молиявий эҳтиёж")} qiymat={q(x.moliyaEhtiyoji)} />
        <Qator nomi={tr("Талаб қилинган маблағ")} qiymat={q(x.talabQilinganMablag)} />
        <Qator nomi={tr("Кўмак тури")} qiymat={q(x.moliyaTuri.map((y) => tr(kirillcha(MOLIYA_TURI, y))))} />
        <Qator
          nomi={tr("Сарфлаш йўналиши")}
          qiymat={q(x.mablagYonalishi.map((y) => tr(kirillcha(MABLAG_YONALISHI, y))))}
        />
      </Bolim>

      {/* ── II-Б ── */}
      {x.chetElMehnati && (
        <Bolim raqam="II-Б" sarlavha={tr("Чет элдаги меҳнат")}>
          <Qator nomi={tr("Чет элда ишлаётганлар")} qiymat={q(x.chetElIshchilar)} />
          <Qator nomi={tr("Ойига юборадиган пул")} qiymat={q(x.chetElOylikPul)} />
          <div className="sm:col-span-2">
            <Qator
              nomi={tr("Давлат(лар)")}
              qiymat={q(
                x.chetElDavlatlari.map((y) =>
                  /*
                    «Бошқа» танланган бўлса, каталогдаги умумий сўз ўрнига
                    ходим ёзган давлат номи кўринади — акс ҳолда карточкада
                    «Бошқа давлат» деб турса, уни очиб ҳам фойда йўқ.
                  */
                  y === 'Boshqa' && x.chetElBoshqaDavlat
                    ? x.chetElBoshqaDavlat
                    : tr(kirillcha(CHET_EL_DAVLATI, y))
                )
              )}
            />
          </div>
        </Bolim>
      )}

      {/* ── III ── */}
      <Bolim raqam="III" sarlavha={tr("Даромад")}>
        <Qator nomi={tr("Ойлик умумий даромад")} qiymat={q(x.oylikDaromad)} />
        <Qator
          nomi={tr("Даромад манбалари")}
          qiymat={q(x.daromadManbalari.map((y) => tr(kirillcha(DAROMAD_MANBAI, y))))}
        />
        <div className="sm:col-span-2">
          <Qator
            nomi={tr("Камбағалликка тушиш сабаблари")}
            qiymat={q(x.kambagallikSabablari.map((y) => tr(kirillcha(KAMBAGALLIK_SABABI, y))))}
          />
        </div>
      </Bolim>

      {/* ── IV ── */}
      <Bolim raqam="IV" sarlavha={tr("Болалар таълими")}>
        <Qator nomi={tr("Мактабгача ёшдаги")} qiymat={q(x.maktabgachaYoshdagi)} />
        <Qator nomi={tr("Боғчага қатнайди")} qiymat={q(x.maktabgachaQamrovda)} />
        <Qator nomi={tr("Мактаб ёшидаги")} qiymat={q(x.maktabYoshdagi)} />
        <Qator nomi={tr("Мактабга қатнайди")} qiymat={q(x.maktabQamrovda)} />
        <Qator nomi={tr("Тўгаракка қатнайди")} qiymat={q(x.togarakQamrovi)} />
        <Qator nomi={tr("Жалб этилмаганлик сабаби")} qiymat={q(x.togarakSababi)} />
      </Bolim>

      {/* ── V ── */}
      <Bolim raqam="V" sarlavha={tr("Соғлиқни сақлаш")}>
        <Qator nomi={tr("Узоқ даволанишга муҳтож")} qiymat={q(x.uzoqDavolanish)} />
        <Qator nomi={tr("Изоҳ")} qiymat={q(x.uzoqDavolanishIzoh)} />
        <Qator nomi={tr("Дори-дармон эҳтиёжи")} qiymat={q(x.doriEhtiyoji)} />
        <Qator nomi={tr("Тиббий хизмат эҳтиёжи")} qiymat={q(x.tibbiyXizmatEhtiyoji)} />
      </Bolim>

      {/* ── VI ── */}
      <Bolim raqam="VI" sarlavha={tr("Уй-жой ва коммунал шароит")}>
        <Qator nomi={tr("Уй-жой ҳолати")} qiymat={tr(kirillcha(UY_HOLATI, x.uyHolati))} />
        <Qator nomi={tr("Ичимлик суви")} qiymat={tr(kirillcha(ICHIMLIK_SUVI, x.ichimlikSuvi))} />
        <Qator nomi={tr("Электр")} qiymat={q(x.elektr)} />
        <Qator nomi={tr("Табиий газ")} qiymat={q(x.gaz)} />
        <Qator nomi={tr("Суғориш суви")} qiymat={q(x.sugorishSuvi)} />
        <Qator nomi={tr("Канализация")} qiymat={q(x.kanalizatsiya)} />
        <div className="sm:col-span-2">
          <Qator nomi={tr("Бошқа муаммолар")} qiymat={q(x.boshqaMuammolar)} />
        </div>
      </Bolim>

      {/* ── VII, VIII ── */}
      <Bolim raqam="VII" sarlavha={tr("Ижтимоий ҳимоя ва ҳужжатлар")}>
        <Qator nomi={tr("Ногиронлиги бўлган шахс")} qiymat={q(x.nogironlikBor)} />
        <Qator nomi={tr("Изоҳ")} qiymat={q(x.nogironlikIzoh)} />
        <Qator nomi={tr("Ёлғиз яшовчи кекса")} qiymat={q(x.yolgizKeksa)} />
        <Qator nomi={tr("Парваришга муҳтож")} qiymat={q(x.parvarishgaMuhtoj)} />
        <Qator nomi={tr("Ҳужжатлар тўлиқ")} qiymat={q(x.hujjatlarToliq)} />
        <Qator nomi={tr("Хизматлардаги тўсиқлар")} qiymat={q(x.xizmatTosiqlari)} />
      </Bolim>

      {/* ── IX, X ── */}
      <Bolim raqam="IX" sarlavha={tr("Ер, чорва ва тадбиркорлик субъектлари")}>
        <Qator
          nomi={tr("Томорқа")}
          qiymat={x.tomorqaBor ? tr(`${x.ekinMaydoni ?? 0} сотих экин майдони`) : tr('Йўқ')}
        />
        <Qator
          nomi={tr("Ижара ер")}
          qiymat={x.ijaraYer ? tr(`${x.ijaraYerMaydoni ?? 0} гектар`) : tr('Йўқ')}
        />
        <Qator
          nomi={tr("Иссиқхона талаби")}
          qiymat={x.issiqxonaTalabi ? tr(`Ҳа (${x.issiqxonaMaydoni ?? 0} сотих)`) : tr('Йўқ')}
        />
        <Qator nomi={tr("Чорвачилик")} qiymat={x.chorvaBor ? tr((x.chorvaTurlari ?? []).join(", ")) : tr("Йўқ")} />
        <Qator nomi={tr("Ҳунармандчилик")} qiymat={x.hunarmandBor ? tr([...(x.hunarTurlari ?? []), x.hunarmandchilik].filter(Boolean).join(", ")) : tr("Йўқ")} />
        <Qator nomi={tr("Ҳунармандчилик")} qiymat={q(x.hunarmandchilik)} />
      </Bolim>

      {/* ── Chora-tadbirlar ── */}
      <Bolim raqam="XI" sarlavha={tr("Чора-тадбирлар режаси")}>
        <div className="space-y-2 sm:col-span-2">
          {x.topshiriqlar.map((t) => (
            <div key={t.id} className="rounded-md border border-line p-3">
              <p className="text-sm font-medium text-ink">{t.muammo}</p>
              <p className="mt-1 text-xs text-ink-muted">{t.yechim}</p>
              <p className="mt-1.5 text-[11px] text-ink-faint">
                {tr(kirillcha(MASUL_TASHKILOT, t.masulTashkilot))} {tr('· муддат:')}{' '}
                {formatDate(t.muddat).split(',')[0]}
                {t.bajarilganSana
                  ? ` · ${tr('бажарилди:')} ${formatDate(t.bajarilganSana).split(',')[0]}`
                  : ''}
              </p>
              <ChoraHolati
                topshiriqId={t.id}
                joriy={t.holati}
                natijaIzohi={t.natijaIzohi}
                ozgartiraOladi={sessiya.rol !== 'HOKIM'}
              />
            </div>
          ))}

          {tahrirlashMumkin && <ChoraQoshish householdId={x.id} />}
        </div>
      </Bolim>

      {x.umumiyXulosa && (
        <section className="karta p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-bold text-ink">{tr('Ходимнинг хулосаси')}</h2>
          <p className="whitespace-pre-wrap text-sm text-ink-muted">{x.umumiyXulosa}</p>
        </section>
      )}

      {/*
        ── Тавсиялар ──

        Ходимнинг ўз хулосасидан КЕЙИН туради: аввал одам нима
        деганини ўқиш, кейин ҳисоб нима деганини кўриш керак.
        Тескари бўлса, ходим ўз кузатувини эмас, тайёр матнни
        такрорлай бошларди.
      */}
      <XonadonXulosasi
        xonadonId={x.id}
        /*
          Қоида бўйича хулоса СЕРВЕРДА ҳисобланади ва тайёр
          ҳолда келади: тугма кутилмайди, сўров юборилмайди,
          пул кетмайди. Ҳар роль кўради.
        */
        qoida={qoidaXulosasi(xonadonDalili(x))}
        saqlangan={x.aiXulosa}
        vaqti={x.aiXulosaVaqti ? formatDate(x.aiXulosaVaqti).split(',')[0] : null}
        aiSoraydi={aiXulosaSoraydi(sessiya.rol)}
        qoralama={x.holati === 'QORALAMA'}
      />

      {/*
        ── Розилик ва имзо ──

        Фақат ЮБОРИЛГАН анкетада кўринади: қоралама ҳали
        имзоланмаган ва бўш майдонни кўрсатишнинг маъноси йўқ.

        Имзо кўрсатилади, чунки кейинчалик «фуқаро рози
        бўлганмиди» деган савол чиқиши мумкин — жавоб шу ерда
        туради, санаси билан.
      */}
      {x.holati !== 'QORALAMA' && (
        <section className="karta p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">{tr('Розилик ва имзо')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs text-ink-faint">{tr('Маълумот йиғилишига розилик')}</p>
              <p
                className={`text-sm font-medium ${x.rozilikBerdi ? 'text-ok' : 'text-danger'}`}
              >
                {x.rozilikBerdi ? tr('Берилган') : tr('Берилмаган')}
              </p>
              {x.imzoVaqti && (
                <p className="text-[11px] text-ink-faint">
                  {tr('Имзоланган:')} {formatDate(x.imzoVaqti)}
                </p>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-xs text-ink-faint">{tr('Фуқаронинг имзоси')}</p>
              <ImzoKorinishi yol={x.imzoYoli} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
