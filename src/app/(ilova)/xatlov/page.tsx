import Link from 'next/link';
import { matnchi } from '@/lib/alifbo-server';
import { redirect } from 'next/navigation';
import { FileText, HousePlus, TriangleAlert, Users } from 'lucide-react';
import { joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tahlilOl } from '@/lib/tahlil';
import { formatDate, percent } from '@/lib/utils';
import { HisobotTugmalari } from '@/components/panel/hisobot-tugmalari';
import { MahallaOrinlari } from '@/components/ish-orni/mahalla-orinlari';
import { AiXulosa } from '@/components/panel/ai-xulosa';
import { DinamikaBloglari } from '@/components/panel/dinamika-blogi';
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

const HOLAT_NISHONI: Record<string, { matn: string; sinf: string }> = {
  QORALAMA: { matn: 'Қоралама', sinf: 'bg-warn-bg text-warn' },
  YUBORILGAN: { matn: 'Юборилган', sinf: 'bg-info-bg text-info' },
  TASDIQLANGAN: { matn: 'Тасдиқланган', sinf: 'bg-ok-bg text-ok' },
};

export default async function XatlovlarSahifasi() {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const filtr = mahallaFiltri(sessiya);

  const [xatlovlar, mahalla, tahlil] = await Promise.all([
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
      orderBy: { updatedAt: 'desc' },
      take: 100,
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
    filtr.mahallaId ? tahlilOl(filtr.mahallaId) : null,
  ]);

  const yuborilgan = xatlovlar.filter((x) => x.holati !== 'QORALAMA');
  const qoralamalar = xatlovlar.filter((x) => x.holati === 'QORALAMA');
  const topilganIshsiz = yuborilgan.reduce((s, x) => s + x.ishsizlarSoni, 0);

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
            malumotBormi={yuborilgan.length > 0}
          />
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
            qiymat={`${yuborilgan.length} / ${mahalla.xonadon}`}
            izoh={tr(`${percent(yuborilgan.length, mahalla.xonadon)}% қамров`)}
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
            qiymat={String(qoralamalar.length)}
            izoh={qoralamalar.length > 0 ? tr('Тугатиб юборинг') : tr('Ҳаммаси юборилган')}
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
      {mahalla && yuborilgan.length > 0 && (
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
      {mahalla && tahlil && yuborilgan.length > 0 && (
        <DinamikaBloglari
          dinamika={tahlil.dinamika}
          qamrovNomi={`${mahalla.nomiKirill} МФЙ`}
        />
      )}

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
          {xatlovlar.map((x) => {
            const nishon = HOLAT_NISHONI[x.holati];
            return (
              <Link
                key={x.id}
                href={x.holati === 'QORALAMA' ? `/xatlov/${x.id}/tahrir` : `/xatlov/${x.id}`}
                className="flex items-center gap-3 p-3.5 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-ink">{x.oilaBoshligi}</span>
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
