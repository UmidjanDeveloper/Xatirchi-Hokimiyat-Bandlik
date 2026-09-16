import { redirect } from 'next/navigation';
import { matnchi } from '@/lib/alifbo-server';
import { joriySessiya } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { davrOqi, tahlilOl } from '@/lib/tahlil';
import { formatDate } from '@/lib/utils';
import { XodimBoshqaruvi } from '@/components/admin/xodim-boshqaruvi';
import { AiHolati } from '@/components/admin/ai-holati';
import { TezlikOlchagich } from '@/components/admin/tezlik-olchagich';
import { AiXulosa } from '@/components/panel/ai-xulosa';
import { VaucherNavbati } from '@/components/it-vaucher/vaucher-navbati';
import { vaucherHisobi, vaucherNavbati } from '@/lib/it-vaucher';
import { DinamikaBloglari } from '@/components/panel/dinamika-blogi';
import { DavrTanlash } from '@/components/panel/davr-tanlash';
import { DublikatRoyxati } from '@/components/dublikat/dublikat-royxati';
import { XabarHolati } from '@/components/telegram/xabar-holati';
import { SahifaHisoboti } from '@/components/panel/sahifa-hisoboti';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Бошқарув') };
}

const AMAL_NOMI: Record<string, string> = {
  KIRISH: 'Тизимга кирди',
  CHIQISH: 'Тизимдан чиқди',
  KORISH: 'Ёзувни очди',
  YARATISH: 'Яратди',
  OZGARTIRISH: 'Ўзгартирди',
  OCHIRISH: 'Ўчирди',
  EKSPORT: 'Экспорт қилди',
  PAROL_ALMASHTIRILDI: 'Паролини алмаштирди',
};

export default async function AdminSahifasi({
  searchParams,
}: {
  searchParams: { davr?: string };
}) {
  const tr = matnchi();
  const davr = davrOqi(searchParams.davr);

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (sessiya.rol !== 'ADMIN') redirect('/');

  const [xodimlar, mahallalar, jurnal, statistika, tahlil, vHisob, vNavbat] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ faol: 'desc' }, { rol: 'asc' }, { fullName: 'asc' }],
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
        mahalla: { select: { nomiKirill: true } },
      },
    }),
    prisma.mahalla.findMany({
      orderBy: { nomi: 'asc' },
      select: { id: true, nomiKirill: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { user: { select: { fullName: true, username: true } } },
    }),
    Promise.all([
      prisma.household.count(),
      prisma.unemployedPerson.count(),
      prisma.actionPlan.count(),
      prisma.vacancy.count({ where: { faol: true } }),
    ]),
    tahlilOl(undefined, davr),
    vaucherHisobi(),
    vaucherNavbati(undefined, 10),
  ]);

  const [xonadon, ishsiz, topshiriq, ishOrni] = statistika;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="sahifa-sarlavha">{tr('Бошқарув')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {tr('Ходимлар, логинлар ва аудит журнали')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DavrTanlash joriy={davr} />
          <SahifaHisoboti malumotBormi={xonadon > 0} />
        </div>
      </div>

      {/*
        ── ТАҲЛИЛ ХУЛОСАСИ ──

        Администратор панелида ҳам бўлиши керак: у тизимни
        созлайди ва «AI ишлаяптими» деган саволга айнан шу
        ердан жавоб олади. Илгари бу блок фақат ҳоким ва
        бандлик панелида бор эди — администратор эса AI
        ишламай турганини умуман билмасди.
      */}
      <AiXulosa qamrovNomi="Хатирчи тумани" />

      <div className="grid gap-3 sm:grid-cols-4">
        <Karta nomi={tr("Хонадон")} soni={xonadon} />
        <Karta nomi={tr("Ишсиз фуқаро")} soni={ishsiz} />
        <Karta nomi={tr("Чора-тадбир")} soni={topshiriq} />
        <Karta nomi={tr("Бўш иш ўрни")} soni={ishOrni} />
      </div>

      {/*
        ── Ўсиш ва камайиш сурати ──

        Администратор ҳам шу диаграммани кўради. Сабаби техник:
        рақам нотўғри кўринса, «маълумот базасидами ёки
        ҳисоблашдами» деган саволга жавоб керак бўлади, ва у
        жавоб худди ҳоким кўраётган графикда бўлиши шарт —
        бошқа графикда эмас.
      */}
      {xonadon > 0 && (
        <DinamikaBloglari dinamika={tahlil.dinamika} davr={davr} qamrovNomi="Хатирчи тумани" />
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-ink">{tr('Ходимлар (')}{xodimlar.length})</h2>
        <XodimBoshqaruvi xodimlar={xodimlar} mahallalar={mahallalar} />
      </section>

      {/*
        ── ТАКРОРЛАНГАН ФУҚАРОЛАР ──

        Бу маълумот СИФАТИ масаласи, шунинг учун администратор
        панелида: бир одам икки хонадонда ёзилиб қолса, ишсизлар
        сони ошиб кўринади ва барча фоиз бузилади.
      */}
      <DublikatRoyxati />

      {/*
        IT-шаҳарча ваучерлари — администраторда ҳам.
        Занжир техник жиҳатдан ишлаяптими деган саволга
        жавоб шу ерда: навбат ўсиб бораётган бўлса, демак
        белги қўйиляпти-ю, ваучер берилмаяпти.
      */}
      <VaucherNavbati navbat={vNavbat} hisob={vHisob} qamrovNomi="Хатирчи тумани" bera={false} />

      {/*
        Telegram хабарномаси — жимгина ишламай қолиши мумкин:
        токен эскиради, бот блокланади. Ходим буни айтмайди —
        у хабар кутилганини ҳам билмайди.
      */}
      <XabarHolati />

      {/*
        Sun'iy intellekt ulanishi.

        Kalit noto'g'ri bo'lsa ilova TO'XTAMAYDI - xulosa jimgina
        qoida bo'yicha hisoblanadi. Bu atayin shunday, lekin
        sozlash paytida "kalitni qo'ydim, nega o'zgarmadi?" degan
        savolga javob kerak bo'ladi. Shu tugma javob beradi.
      */}
      <AiHolati />

      <TezlikOlchagich />

      {/*
        Audit jurnali. Xatlov ma'lumotlari oila daromadi va sog'liq
        holatini o'z ichiga oladi - kim ularni ko'rgani yozib
        borilmasa, ma'lumot tarqalganda javobgarni aniqlab bo'lmaydi.
      */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">{tr('Аудит журнали')}</h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Ким қачон нимани очгани ва ўзгартиргани — охирги 60 та ёзув')}
        </p>

        {jurnal.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">{tr('Ҳали ёзув йўқ.')}</p>
        ) : (
          <div className="jadval-orash mt-4">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th className="pb-2 pr-3 font-medium">{tr('Вақт')}</th>
                  <th className="pb-2 pr-3 font-medium">{tr('Ходим')}</th>
                  <th className="pb-2 pr-3 font-medium">{tr('Амал')}</th>
                  <th className="pb-2 font-medium">{tr('Изоҳ')}</th>
                </tr>
              </thead>
              <tbody>
                {jurnal.map((j) => (
                  <tr key={j.id} className="border-b border-line last:border-0">
                    <td className="raqam whitespace-nowrap py-2 pr-3 text-xs text-ink-faint">
                      {formatDate(j.createdAt)}
                    </td>
                    <td className="py-2 pr-3 text-ink">{tr(j.user.fullName)}</td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {tr(AMAL_NOMI[j.amal] ?? j.amal)}
                    </td>
                    <td className="py-2 text-xs text-ink-faint">
                      {j.obyektTuri ? `${j.obyektTuri} ` : ''}
                      {tr(j.izoh ?? '')}
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

function Karta({ nomi, soni }: { nomi: string; soni: number }) {
  return (
    <div className="karta p-4">
      <p className="raqam text-2xl font-bold text-ink">{soni.toLocaleString('ru-RU')}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{nomi}</p>
    </div>
  );
}
