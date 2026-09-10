import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Briefcase, House, TrendingUp, Users } from 'lucide-react';
import { joriySessiya, mahallaFiltri, tahlilKoradi } from '@/lib/auth';
import { tahlilOl } from '@/lib/tahlil';
import { DARAJA_KORINISHI, tavsiyalarniHisobla } from '@/lib/tavsiyalar';
import { percent } from '@/lib/utils';
import {
  ByudjetBlogi,
  KechikkanlarBlogi,
  KursTalabiBlogi,
  QamrovReytingi,
  Voronka,
} from '@/components/panel/diagrammalar';

export const metadata = { title: 'Таҳлил панели' };

const raqam = (n: number) => n.toLocaleString('ru-RU');

export default async function PanelSahifasi() {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  if (!tahlilKoradi(sessiya.rol)) redirect('/');

  const filtr = mahallaFiltri(sessiya);
  const t = await tahlilOl(filtr.mahallaId);
  const tavsiyalar = tavsiyalarniHisobla(t);

  const bosh = t.jami;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">Таҳлил панели</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Хатирчи тумани · {raqam(bosh.bazaAholi)} аҳоли · {raqam(bosh.bazaXonadon)} хонадон
        </p>
      </div>

      {/*
        Bo'sh holat. Kelajak Egasi'da o'rganilgan dars: ma'lumot
        yo'q bo'lsa, nol to'la diagrammalarni ko'rsatish hokimga
        "tizim ishlamayapti" degan taassurot beradi. To'g'ri javob -
        keyingi qadamni aytish.
      */}
      {bosh.xatlovXonadon === 0 ? (
        <div className="karta p-8 text-center">
          <p className="text-sm font-medium text-ink">Ҳали хатлов бошланмаган.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Маҳалла еттилиги аъзолари хонадонларни хатловдан ўтказа бошлагач, бу
            саҳифада қамров, воронка ва тавсиялар пайдо бўлади. Рўйхатда{' '}
            {raqam(bosh.bazaIshsiz)} та ишсиз фуқаро бор.
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI ── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              ikonka={<House className="h-4 w-4" />}
              nomi="Хатловдан ўтган хонадон"
              qiymat={raqam(bosh.xatlovXonadon)}
              izoh={`${raqam(bosh.bazaXonadon)} тадан · ${percent(bosh.xatlovXonadon, bosh.bazaXonadon)}%`}
            />
            <Kpi
              ikonka={<Users className="h-4 w-4" />}
              nomi="Аниқланган ишсиз"
              qiymat={raqam(bosh.aniqlangan)}
              izoh={`Рўйхатда ${raqam(bosh.bazaIshsiz)} та · ${percent(bosh.aniqlangan, bosh.bazaIshsiz)}%`}
            />
            <Kpi
              ikonka={<Briefcase className="h-4 w-4" />}
              nomi="Жойлаштирилган"
              qiymat={raqam(bosh.joylashtirilgan)}
              izoh={`Аниқланганларнинг ${percent(bosh.joylashtirilgan, bosh.aniqlangan)}%`}
              yaxshi
            />
            <Kpi
              ikonka={<TrendingUp className="h-4 w-4" />}
              nomi="Ишсизликка таъсир"
              qiymat={`${percent(bosh.joylashtirilgan, bosh.bazaIshsiz)}%`}
              izoh={`Рўйхатдаги ${raqam(bosh.bazaIshsiz)} тадан`}
            />
          </div>

          {/* ── Tavsiyalar ── */}
          {tavsiyalar.length > 0 && (
            <section className="karta p-4 sm:p-5">
              <h2 className="text-sm font-bold text-ink">Тавсиялар</h2>
              <p className="mt-1 text-xs text-ink-faint">
                Диаграммалар «нима бўлаётганини» айтади, бу рўйхат «энди нима қилиш
                кераклигини»
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
                          {k.nomi}
                        </span>
                        <span className="min-w-0 text-sm font-medium text-ink">
                          {tv.sarlavha}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {tv.dalil}
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

          <div className="grid gap-4 lg:grid-cols-2">
            <Voronka bosqichlar={t.voronka} bazaIshsiz={bosh.bazaIshsiz} />
            <KechikkanlarBlogi kechikkanlar={t.kechikkanlar} />
          </div>

          {!filtr.mahallaId && (
            <div className="grid gap-4 lg:grid-cols-2">
              <QamrovReytingi
                qamrov={t.qamrov}
                sarlavha="Хатлов қамрови — орқада қолган маҳаллалар"
                izoh="Рўйхатдаги ишсизлардан нечтаси хатловдан ўтган"
                maydon="qamrovFoizi"
                ortadan
              />
              <QamrovReytingi
                qamrov={t.qamrov}
                sarlavha="Жойлаштириш натижаси — энг паст маҳаллалар"
                izoh="Рўйхатдаги ишсизлардан нечтаси ишга жойлашган"
                maydon="natijaFoizi"
                ortadan
              />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <KursTalabiBlogi kurslar={t.kursTalabi} />
            <ByudjetBlogi byudjet={t.byudjet} jamiTalab={t.jamiTalab} />
          </div>

          {/* ── Toifalar ── */}
          <section className="karta p-4 sm:p-5">
            <h2 className="text-sm font-bold text-ink">Ишсизлар таркиби</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Свод жадвалидаги тоифалар — алоҳида эътибор талаб қилади
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Toifa nomi="Аёллар дафтари" soni={t.toifalar.ayollarDaftari} />
              <Toifa nomi="Ижтимоий реестр" soni={t.toifalar.ijtimoiyReestr} />
              <Toifa
                nomi="Миграциядан қайтган"
                soni={t.toifalar.migratsiyadanQaytgan}
              />
              <Toifa nomi="Олий битирувчи" soni={t.toifalar.oliyBitiruvchi} />
              <Toifa
                nomi="Ўрта махсус битирувчи"
                soni={t.toifalar.ortaMaxsusBitiruvchi}
              />
            </div>
          </section>

          {/* ── To'liq jadval ── */}
          {!filtr.mahallaId && (
            <section className="karta p-4 sm:p-5">
              <h2 className="text-sm font-bold text-ink">Барча маҳаллалар</h2>
              <p className="mt-1 text-xs text-ink-faint">
                Диаграммаларда фақат энг паст кўрсаткичлилар кўринади — бу ерда
                тўлиқ рўйхат. <span className="text-warn">▲</span> белгиси —
                хатлов рўйхатдагидан кўпроқ ишсиз топган маҳалла.
              </p>

              <div className="jadval-orash mt-4">
                <table className="w-full min-w-[38rem] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-faint">
                      <th className="pb-2 pr-3 font-medium">МФЙ</th>
                      <th className="pb-2 pr-3 text-right font-medium">Хонадон</th>
                      <th className="pb-2 pr-3 text-right font-medium">Рўйхатда</th>
                      <th className="pb-2 pr-3 text-right font-medium">Аниқланган</th>
                      <th className="pb-2 pr-3 text-right font-medium">Қамров</th>
                      <th className="pb-2 pr-3 text-right font-medium">Жойлашган</th>
                      <th className="pb-2 text-right font-medium">Натижа</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.qamrov.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-line last:border-0 hover:bg-surface-muted"
                      >
                        <td className="py-2 pr-3 text-ink">{m.nomiKirill}</td>
                        <td className="raqam py-2 pr-3 text-right text-ink-muted">
                          {m.xatlovXonadon}/{m.bazaXonadon}
                        </td>
                        <td className="raqam py-2 pr-3 text-right text-ink-muted">
                          {m.bazaIshsiz}
                        </td>
                        <td className="raqam py-2 pr-3 text-right text-ink">
                          {m.aniqlangan}
                        </td>
                        <td className="raqam py-2 pr-3 text-right font-medium text-ink">
                          {m.qamrovFoizi}%
                          {/*
                            Qamrov 100% dan oshsa - xatlov reyestrdagidan
                            KO'PROQ ishsizni topgan. Bu xato emas, muhim
                            xabar: svod jadvalidagi raqam kam ko'rsatgan.
                            Belgisiz qoldirilsa, "qamrov 220%" degan
                            ma'nosiz ko'rsatkichga o'xshab qolardi.
                          */}
                          {m.qamrovFoizi > 100 && (
                            <span
                              className="ml-1 text-warn"
                              title="Хатлов рўйхатдагидан кўпроқ ишсиз топган"
                            >
                              ▲
                            </span>
                          )}
                        </td>
                        <td className="raqam py-2 pr-3 text-right text-ink">
                          {m.joylashtirilgan}
                        </td>
                        <td className="raqam py-2 text-right font-medium text-ink">
                          {m.natijaFoizi}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
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
}: {
  ikonka: React.ReactNode;
  nomi: string;
  qiymat: string;
  izoh: string;
  yaxshi?: boolean;
}) {
  return (
    <div className="karta p-4">
      <div className="flex items-center gap-2 text-ink-faint">
        {ikonka}
        <span className="text-xs font-medium">{nomi}</span>
      </div>
      <p className={`raqam mt-2 text-2xl font-bold ${yaxshi ? 'text-ok' : 'text-ink'}`}>
        {qiymat}
      </p>
      <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>
    </div>
  );
}

function Toifa({ nomi, soni }: { nomi: string; soni: number }) {
  return (
    <div className="rounded-md border border-line p-3">
      <p className="raqam text-xl font-bold text-ink">{raqam(soni)}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-ink-faint">{nomi}</p>
    </div>
  );
}
