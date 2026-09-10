import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, GraduationCap, Plane, Target, UserCheck } from 'lucide-react';
import { bandlikIshi, joriySessiya, mahallaFiltri } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tahlilOl } from '@/lib/tahlil';
import { formatPhone } from '@/lib/utils';
import { hududKaliti } from '@/lib/hudud-qidiruv';
import { HolatNishoni } from '@/components/ishsiz/holat-nishoni';

export const metadata = { title: 'Операцион панел' };

export default async function BandlikSahifasi() {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (!bandlikIshi(sessiya.rol)) redirect('/');

  const filtr = mahallaFiltri(sessiya);

  const [suhbatsiz, taklifsiz, ishOrinlari, istaklar, migratsiya, t] = await Promise.all([
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
      where: { ...filtr, faol: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        korxonaNomi: true,
        lavozim: true,
        yonalish: true,
        ornlarSoni: true,
        mahallaId: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),

    // Ish istaklari - moslashtirish uchun
    prisma.unemployedPerson.findMany({
      where: {
        ...filtr,
        xohlaganIsh: { not: null },
        holati: { in: ['ANIQLANDI', 'SUHBAT_OTKAZILDI', 'TAKLIF_BERILDI'] },
      },
      select: {
        id: true,
        fish: true,
        xohlaganIsh: true,
        mahallaId: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),

    prisma.unemployedPerson.count({
      where: { ...filtr, takliflar: { has: 'Xorijga mehnat migratsiyasi' } },
    }),

    tahlilOl(filtr.mahallaId),
  ]);

  /*
   * Moslashtirish: bo'sh ish o'rni lavozimi bilan fuqaroning
   * "qanday ishda ishlashni xohlaydi" javobini solishtiramiz.
   *
   * Taqqoslash `hududKaliti` orqali - u fonetik kalit hisoblaydi va
   * kirill/lotin, apostrof, "payvandchi"/"пайвандчи" farqini
   * yo'qotadi. Aynan mahalla qidiruvidagi funksiya, chunki muammo
   * bir xil: bir narsa turlicha yozilgan.
   */
  const istakKaliti = new Map<
    string,
    { id: string; fish: string; mahallaId: string; mahalla: string }[]
  >();
  for (const i of istaklar) {
    if (!i.xohlaganIsh) continue;
    const k = hududKaliti(i.xohlaganIsh);
    if (!k) continue;
    const r = istakKaliti.get(k) ?? [];
    r.push({
      id: i.id,
      fish: i.fish,
      mahallaId: i.mahallaId,
      mahalla: i.mahalla.nomiKirill,
    });
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

  const moslar = ishOrinlari
    .map((v) => {
      const barchasi = istakKaliti.get(hududKaliti(v.lavozim)) ?? [];
      const ozMahallasi = barchasi.filter((n) => n.mahallaId === v.mahallaId);
      const boshqalar = barchasi.filter((n) => n.mahallaId !== v.mahallaId);
      return {
        ...v,
        ozMahallasi,
        korsatiladigan: [...ozMahallasi, ...boshqalar].slice(0, KORSATILADIGAN),
        jamiNomzod: barchasi.length,
      };
    })
    .filter((v) => v.jamiNomzod > 0)
    // Avval o'z mahallasida nomzodi borlar - ular bilan bugun ish qilinadi
    .sort((a, b) => b.ozMahallasi.length - a.ozMahallasi.length || b.jamiNomzod - a.jamiNomzod);

  const bandOrinlar = ishOrinlari.reduce((s, v) => s + v.ornlarSoni, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">Операцион панел</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Кундалик иш: навбат, мослаштириш ва курс талаби
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi
          ikonka={<UserCheck className="h-4 w-4" />}
          nomi="Суҳбат кутмоқда"
          qiymat={t.voronka[0].soni - t.voronka[1].soni}
          xavfli={t.voronka[0].soni - t.voronka[1].soni > 30}
        />
        <Kpi
          ikonka={<Target className="h-4 w-4" />}
          nomi="Таклиф кутмоқда"
          qiymat={t.voronka[1].soni - t.voronka[2].soni}
        />
        <Kpi
          ikonka={<GraduationCap className="h-4 w-4" />}
          nomi="Бўш иш ўрни"
          qiymat={bandOrinlar}
        />
        <Kpi ikonka={<Plane className="h-4 w-4" />} nomi="Миграция номзоди" qiymat={migratsiya} />
      </div>

      {/* ── Moslashtirish taxtasi ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">Мослаштириш тахтаси</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Бўш иш ўрни ↔ шу касбда ишлашни истаган фуқаролар
        </p>

        {moslar.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            Ҳозирча мос жуфтлик топилмади. Бўш иш ўринлари рўйхатини тўлдиринг ёки
            фуқароларнинг иш истагини аниқлаштиринг.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {moslar.slice(0, 10).map((v) => (
              <div key={v.id} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-ink">
                    {v.lavozim} — {v.korxonaNomi}
                  </span>
                  <span className="raqam shrink-0 text-xs text-ink-faint">
                    {v.ornlarSoni} ўрин · {v.mahalla.nomiKirill}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-ink-faint">
                  {v.ozMahallasi.length > 0
                    ? `Шу маҳаллада ${v.ozMahallasi.length} та номзод`
                    : 'Шу маҳаллада номзод йўқ'}
                  {v.jamiNomzod > v.ozMahallasi.length &&
                    ` · бошқа маҳаллаларда яна ${v.jamiNomzod - v.ozMahallasi.length} та`}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v.korsatiladigan.map((n) => {
                    const yaqin = n.mahallaId === v.mahallaId;
                    return (
                      <Link
                        key={n.id}
                        href={`/ishsizlar/${n.id}`}
                        className={`rounded px-2 py-1 text-[11px] font-medium transition-opacity hover:opacity-80 ${
                          yaqin
                            ? 'bg-accent-soft text-accent'
                            : 'border border-line bg-surface text-ink-muted'
                        }`}
                      >
                        {n.fish}
                        {/* Boshqa mahalladan bo'lsa - qayerdanligi ko'rinsin */}
                        {!yaqin && (
                          <span className="ml-1 text-ink-faint">· {n.mahalla}</span>
                        )}
                      </Link>
                    );
                  })}
                  {v.jamiNomzod > v.korsatiladigan.length && (
                    <Link
                      href={`/ishsizlar?q=${encodeURIComponent(v.lavozim)}`}
                      className="px-1 py-1 text-[11px] text-ink-faint hover:text-accent"
                    >
                      +{v.jamiNomzod - v.korsatiladigan.length} та — барчаси
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
          sarlavha="Суҳбат навбати"
          izoh="Хатловда аниқланган, ҳали суҳбат бўлмаган фуқаролар"
          royxat={suhbatsiz}
          jami={t.voronka[0].soni - t.voronka[1].soni}
          yol="/ishsizlar?holati=ANIQLANDI"
        />
        <Navbat
          sarlavha="Таклиф навбати"
          izoh="Суҳбатдан ўтган, лекин таклиф берилмаган фуқаролар"
          royxat={taklifsiz}
          jami={t.voronka[1].soni - t.voronka[2].soni}
          yol="/ishsizlar?holati=SUHBAT_OTKAZILDI"
        />
      </div>

      {/* ── Kurs talabi ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">Курс очиш таклифи</h2>
        <p className="mt-1 text-xs text-ink-faint">
          15 тадан ошган касблар — гуруҳ тўлади
        </p>

        {t.kursTalabi.filter((k) => k.soni >= 15).length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            Ҳали бирорта касб бўйича гуруҳ тўладиган талаб йиғилмаган.
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
                    {k.soni} та
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
}: {
  ikonka: React.ReactNode;
  nomi: string;
  qiymat: number;
  xavfli?: boolean;
}) {
  return (
    <div className={`karta p-4 ${xavfli ? 'border-warn' : ''}`}>
      <div className={`flex items-center gap-2 ${xavfli ? 'text-warn' : 'text-ink-faint'}`}>
        {ikonka}
        <span className="text-xs font-medium">{nomi}</span>
      </div>
      <p className="raqam mt-2 text-2xl font-bold text-ink">{qiymat}</p>
    </div>
  );
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
  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">{sarlavha}</h2>
        <span className="raqam shrink-0 text-sm font-bold text-ink">{jami}</span>
      </div>
      <p className="mt-1 text-xs text-ink-faint">{izoh}</p>

      {royxat.length === 0 ? (
        <p className="quti-ok mt-3">Навбат бўш.</p>
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
                  <p className="truncate text-sm font-medium text-ink">{p.fish}</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {p.mahalla.nomiKirill}
                    {p.xohlaganIsh ? ` · истаги: ${p.xohlaganIsh}` : ''}
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
              Барчасини кўриш ({jami})
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </>
      )}
    </section>
  );
}
