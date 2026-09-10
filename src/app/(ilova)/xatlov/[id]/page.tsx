import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, Pencil, UserRound } from 'lucide-react';
import { joriySessiya, mahallagaRuxsat } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jurnal } from '@/lib/api-auth';
import { formatDate, formatPhone } from '@/lib/utils';
import {
  DAROMAD_MANBAI,
  ICHIMLIK_SUVI,
  ISH_TURI_ISTAGI,
  KAMBAGALLIK_SABABI,
  KASB_YONALISHI,
  MABLAG_YONALISHI,
  MALUMOT,
  MOLIYA_TURI,
  UY_HOLATI,
  kirillcha,
} from '@/lib/constants';
import { HolatNishoni } from '@/components/ishsiz/holat-nishoni';

export const metadata = { title: 'Хонадон хатлови' };

/** Bo'sh qiymatlarni bir xil ko'rinishda ko'rsatadi */
const q = (v: unknown): string => {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Ҳа' : 'Йўқ';
  if (typeof v === 'bigint') return `${Number(v).toLocaleString('ru-RU')} сўм`;
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
};

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
            <h1 className="text-lg font-bold text-ink">{x.oilaBoshligi}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {x.manzil} · {x.mahalla.nomiKirill} МФЙ
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              Хатловни ўтказди: {x.xodim.fullName}
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
              Таҳрирлаш
            </Link>
          )}
        </div>

        {x.holati === 'TASDIQLANGAN' && (
          <div className="quti-ok mt-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Хатлов бандлик маркази томонидан тасдиқланган
          </div>
        )}
      </div>

      {/* ── Ishsizlar - eng muhim blok, tepada ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="bolim-sarlavha mb-3">
          <span className="bolim-raqam">
            <UserRound className="h-4 w-4" />
          </span>
          <span>Ишсиз фуқаролар ({x.ishsizlar.length})</span>
        </h2>

        {x.ishsizlar.length === 0 ? (
          <p className="py-2 text-sm text-ink-muted">Бу хонадонда ишсиз фуқаро йўқ.</p>
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
                    {p.jinsi === 'Erkak' ? 'Эркак' : 'Аёл'}
                    {p.malumoti ? ` · ${kirillcha(MALUMOT, p.malumoti)}` : ''}
                    {p.xohlaganIsh ? ` · ${p.xohlaganIsh}` : ''}
                  </p>
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
      <Bolim raqam="I" sarlavha="Меҳнат ва бандлик">
        <Qator nomi="Оиладаги умумий аъзолар" qiymat={q(x.jamiAzo)} />
        <Qator nomi="Болалар (18 ёшгача)" qiymat={q(x.bolalarSoni)} />
        <Qator nomi="Меҳнатга лаёқатлилар" qiymat={q(x.mehnatgaLayoqatli)} />
        <Qator nomi="Ишлайдиганлар" qiymat={q(x.ishlaydiganlar)} />
        <Qator nomi="Давлат корхоналарида" qiymat={q(x.davlatKorxonada)} />
        <Qator nomi="Хусусий секторда" qiymat={q(x.xususiySektorda)} />
        <Qator nomi="Ишсизлар" qiymat={q(x.ishsizlarSoni)} />
        <Qator nomi="Боғча кутаётган аёллар" qiymat={q(x.bogchaKutayotganAyollar)} />
        <Qator
          nomi="Ишсизлик муддати"
          qiymat={x.ishsizlikMuddatiOy ? `${x.ishsizlikMuddatiOy} ой` : '—'}
        />
        <Qator nomi="Иш турига истак" qiymat={kirillcha(ISH_TURI_ISTAGI, x.ishTuriIstagi)} />
        <Qator nomi="Касб-ҳунарга ўқиш истаги" qiymat={q(x.kasbHunarIstagi)} />
        <Qator
          nomi="Ўқиш йўналиши"
          qiymat={q(x.kasbHunarYonalishi.map((y) => kirillcha(KASB_YONALISHI, y)))}
        />
      </Bolim>

      {/* ── II ── */}
      <Bolim raqam="II" sarlavha="Тадбиркорлик ва молиявий эҳтиёж">
        <Qator nomi="Тадбиркорлик истаги" qiymat={q(x.tadbirkorlikIstagi)} />
        <Qator
          nomi="Соҳаси"
          qiymat={q(x.tadbirkorlikSohasi.map((y) => kirillcha(MABLAG_YONALISHI, y)))}
        />
        <Qator nomi="Молиявий эҳтиёж" qiymat={q(x.moliyaEhtiyoji)} />
        <Qator nomi="Талаб қилинган маблағ" qiymat={q(x.talabQilinganMablag)} />
        <Qator nomi="Кўмак тури" qiymat={q(x.moliyaTuri.map((y) => kirillcha(MOLIYA_TURI, y)))} />
        <Qator
          nomi="Сарфлаш йўналиши"
          qiymat={q(x.mablagYonalishi.map((y) => kirillcha(MABLAG_YONALISHI, y)))}
        />
      </Bolim>

      {/* ── III ── */}
      <Bolim raqam="III" sarlavha="Даромад">
        <Qator nomi="Ойлик умумий даромад" qiymat={q(x.oylikDaromad)} />
        <Qator
          nomi="Даромад манбалари"
          qiymat={q(x.daromadManbalari.map((y) => kirillcha(DAROMAD_MANBAI, y)))}
        />
        <div className="sm:col-span-2">
          <Qator
            nomi="Камбағалликка тушиш сабаблари"
            qiymat={q(x.kambagallikSabablari.map((y) => kirillcha(KAMBAGALLIK_SABABI, y)))}
          />
        </div>
      </Bolim>

      {/* ── IV ── */}
      <Bolim raqam="IV" sarlavha="Болалар таълими">
        <Qator nomi="Мактабгача ёшдаги" qiymat={q(x.maktabgachaYoshdagi)} />
        <Qator nomi="Боғчага қатнайди" qiymat={q(x.maktabgachaQamrovda)} />
        <Qator nomi="Мактаб ёшидаги" qiymat={q(x.maktabYoshdagi)} />
        <Qator nomi="Мактабга қатнайди" qiymat={q(x.maktabQamrovda)} />
        <Qator nomi="Тўгаракка қатнайди" qiymat={q(x.togarakQamrovi)} />
        <Qator nomi="Жалб этилмаганлик сабаби" qiymat={q(x.togarakSababi)} />
      </Bolim>

      {/* ── V ── */}
      <Bolim raqam="V" sarlavha="Соғлиқни сақлаш">
        <Qator nomi="Узоқ даволанишга муҳтож" qiymat={q(x.uzoqDavolanish)} />
        <Qator nomi="Изоҳ" qiymat={q(x.uzoqDavolanishIzoh)} />
        <Qator nomi="Дори-дармон эҳтиёжи" qiymat={q(x.doriEhtiyoji)} />
        <Qator nomi="Тиббий хизмат эҳтиёжи" qiymat={q(x.tibbiyXizmatEhtiyoji)} />
      </Bolim>

      {/* ── VI ── */}
      <Bolim raqam="VI" sarlavha="Уй-жой ва коммунал шароит">
        <Qator nomi="Уй-жой ҳолати" qiymat={kirillcha(UY_HOLATI, x.uyHolati)} />
        <Qator nomi="Ичимлик суви" qiymat={kirillcha(ICHIMLIK_SUVI, x.ichimlikSuvi)} />
        <Qator nomi="Электр" qiymat={q(x.elektr)} />
        <Qator nomi="Табиий газ" qiymat={q(x.gaz)} />
        <Qator nomi="Суғориш суви" qiymat={q(x.sugorishSuvi)} />
        <Qator nomi="Канализация" qiymat={q(x.kanalizatsiya)} />
        <div className="sm:col-span-2">
          <Qator nomi="Бошқа муаммолар" qiymat={q(x.boshqaMuammolar)} />
        </div>
      </Bolim>

      {/* ── VII, VIII ── */}
      <Bolim raqam="VII" sarlavha="Ижтимоий ҳимоя ва ҳужжатлар">
        <Qator nomi="Ногиронлиги бўлган шахс" qiymat={q(x.nogironlikBor)} />
        <Qator nomi="Изоҳ" qiymat={q(x.nogironlikIzoh)} />
        <Qator nomi="Ёлғиз яшовчи кекса" qiymat={q(x.yolgizKeksa)} />
        <Qator nomi="Парваришга муҳтож" qiymat={q(x.parvarishgaMuhtoj)} />
        <Qator nomi="Ҳужжатлар тўлиқ" qiymat={q(x.hujjatlarToliq)} />
        <Qator nomi="Хизматлардаги тўсиқлар" qiymat={q(x.xizmatTosiqlari)} />
      </Bolim>

      {/* ── IX, X ── */}
      <Bolim raqam="IX" sarlavha="Ер, чорва ва тадбиркорлик субъектлари">
        <Qator
          nomi="Томорқа"
          qiymat={x.tomorqaBor ? `${x.tomorqaMaydoni ?? 0} сотих` : 'Йўқ'}
        />
        <Qator
          nomi="Ижара ер"
          qiymat={x.ijaraYer ? `${x.ijaraYerMaydoni ?? 0} гектар` : 'Йўқ'}
        />
        <Qator
          nomi="Иссиқхона талаби"
          qiymat={x.issiqxonaTalabi ? `Ҳа (${x.issiqxonaMaydoni ?? 0} сотих)` : 'Йўқ'}
        />
        <Qator nomi="Чорвачилик" qiymat={q(x.chorvachilik)} />
        <Qator nomi="Ҳунармандчилик" qiymat={q(x.hunarmandchilik)} />
        <Qator nomi="Тадбиркорлик субъектлари" qiymat={q(x.tadbirkorSubyektlar)} />
        <Qator nomi="Бўш иш ўринлари" qiymat={q(x.boshIshOrinlari)} />
        <Qator nomi="Қўшимча иш ўринлари режаси" qiymat={q(x.yangiIshOrinlari)} />
      </Bolim>

      {/* ── Chora-tadbirlar ── */}
      {x.topshiriqlar.length > 0 && (
        <Bolim raqam="XI" sarlavha="Чора-тадбирлар режаси">
          <div className="sm:col-span-2 space-y-2">
            {x.topshiriqlar.map((t) => (
              <div key={t.id} className="rounded-md border border-line p-3">
                <p className="text-sm font-medium text-ink">{t.muammo}</p>
                <p className="mt-1 text-xs text-ink-muted">{t.yechim}</p>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  {t.masulTashkilot} · муддат: {formatDate(t.muddat)}
                </p>
              </div>
            ))}
          </div>
        </Bolim>
      )}

      {x.umumiyXulosa && (
        <section className="karta p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-bold text-ink">Умумий хулоса</h2>
          <p className="whitespace-pre-wrap text-sm text-ink-muted">{x.umumiyXulosa}</p>
        </section>
      )}
    </div>
  );
}
