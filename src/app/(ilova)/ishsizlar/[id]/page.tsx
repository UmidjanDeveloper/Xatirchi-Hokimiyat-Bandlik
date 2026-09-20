import Link from 'next/link';
import { matnchi } from '@/lib/alifbo-server';
import { notFound, redirect } from 'next/navigation';
import { BriefcaseBusiness, House, Phone } from 'lucide-react';
import { joriySessiya, bandlikIshi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jurnal } from '@/lib/api-auth';
import { formatDate, formatPhone } from '@/lib/utils';
import { BANDLIK_TAKLIFI, MALUMOT, MASUL_TASHKILOT, kirillcha } from '@/lib/constants';
import { OchirishTugmasi } from '@/components/arxiv/ochirish-tugmasi';
import { HolatNishoni } from '@/components/ishsiz/holat-nishoni';
import { ISHSIZ_HOLATI, VORONKA } from '@/lib/ishsiz-holati';
import { SuhbatFormasi, type SuhbatHolati } from '@/components/ishsiz/suhbat-formasi';
import { ChoraQoshish } from '@/components/chora/chora-qoshish';
import { VaucherBlogi } from '@/components/it-vaucher/vaucher-blogi';
import { ChoraHolati } from '@/components/chora/chora-holati';
import { orinlarniTop, nomzodMaydonlari } from '@/lib/moslashtirish';
import { MoslikNishoni } from '@/components/ish-orni/moslik-nishoni';
import {
  BekorQilishTugmasi,
  JoylashtirishTugmasi,
} from '@/components/ish-orni/joylashtirish-tugmasi';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Ишсиз фуқаро') };
}

/** `Date` ni `<input type="date">` kutgan `YYYY-MM-DD` ko'rinishiga keltiradi */
const sana = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : '');

export default async function IshsizSahifasi({ params }: { params: { id: string } }) {
  const tr = matnchi();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const p = await prisma.unemployedPerson.findUnique({
    where: { id: params.id },
    include: {
      mahalla: { select: { nomiKirill: true } },
      household: { select: { id: true, manzil: true, oilaBoshligi: true } },
      mutaxassis: { select: { fullName: true } },
      topshiriqlar: { orderBy: { muddat: 'asc' } },
      /*
       * IT-shaharcha vaucherlari - eng yangisi birinchi.
       *
       * Odatda bitta bo'ladi. Lekin birinchisi bekor qilinib
       * ikkinchisi berilishi mumkin, shuning uchun ro'yxat
       * sifatida saqlanadi va bu yerda AMALDAGISI ajratiladi.
       */
      itVaucherlar: {
        orderBy: { berilganSana: 'desc' },
        include: { bergan: { select: { fullName: true } } },
      },
      vacancy: {
        select: {
          id: true,
          korxonaNomi: true,
          lavozim: true,
          telefon: true,
          maosh: true,
          mahalla: { select: { nomiKirill: true } },
        },
      },
    },
  });

  if (!p) notFound();

  // Yettilik a'zosi shaxsiy anketani ko'rmaydi: unda tashxis va
  // ish tajribasi kabi ma'lumot bor, u esa faqat xatlov qiladi.
  if (!bandlikIshi(sessiya.rol) && sessiya.rol !== 'HOKIM') {
    redirect('/xatlov');
  }

  await jurnal(sessiya.userId, 'KORISH', {
    obyektTuri: 'UnemployedPerson',
    obyektId: p.id,
  });

  /*
   * Мос бўш иш ўринлари.
   *
   * Фақат бандлик ходими учун ва фақат ҳали жойлашмаган
   * фуқарога қидирилади: жойлашган одамга «мана бу ишга ҳам
   * бориш мумкин» деб кўрсатиш чалкашлик туғдирарди.
   */
  const orinlar =
    bandlikIshi(sessiya.rol) && !p.vacancyId && p.holati !== 'TASDIQLANDI'
      ? await orinlarniTop(nomzodMaydonlari(p))
      : [];

  /*
   * AMALDAGI vaucher - bekor qilingan va tashlab ketilgani
   * hisobga olinmaydi. Ular tarixda qoladi, lekin odam
   * yangisini olishi mumkin bo'lishi kerak.
   */
  const amaldagiVaucher =
    p.itVaucherlar.find((v) => v.holati !== 'BEKOR_QILINDI' && v.holati !== 'TASHLAB_KETDI') ??
    null;

  const boshlangich: SuhbatHolati = {
    fish: p.fish,
    telefon: p.telefon ?? '',
    jinsi: p.jinsi,
    oilaviyHolat: p.oilaviyHolat,
    farzandlarSoni: p.farzandlarSoni ?? '',
    millati: p.millati ?? '',
    tugilganSana: sana(p.tugilganSana),
    malumoti: p.malumoti,
    mutaxassisligi: p.mutaxassisligi ?? '',
    sogliqHolati: p.sogliqHolati ?? '',
    nogironlik: p.nogironlik,
    nogironlikGuruhi: p.nogironlikGuruhi,
    yashashManzili: p.yashashManzili ?? '',

    kasbHunarEhtiyoji: p.kasbHunarEhtiyoji,
    organmoqchiKasb: p.organmoqchiKasb ?? '',
    itShaharchaVaucheri: p.itShaharchaVaucheri,
    ishTajribasiYil: p.ishTajribasiYil ?? '',
    avvalgiIshJoyi: p.avvalgiIshJoyi ?? '',
    oxirgiIshJoyi: p.oxirgiIshJoyi ?? '',
    ishdanBoshaganSana: sana(p.ishdanBoshaganSana),
    xohlaganIsh: p.xohlaganIsh ?? '',
    kutilayotganMaosh: p.kutilayotganMaosh == null ? '' : Number(p.kutilayotganMaosh),
    ishgaTayyorligi: p.ishgaTayyorligi,
    haydovchilikGuvohnomasi: p.haydovchilikGuvohnomasi,
    haydovchilikToifasi: p.haydovchilikToifasi,
    imtiyozEhtiyoji: p.imtiyozEhtiyoji,
    imtiyozTuri: p.imtiyozTuri,

    takliflar: p.takliflar,
    taklifIzohi: p.taklifIzohi ?? '',
    xulosa: p.xulosa ?? '',

    ishJoyi: p.ishJoyi ?? '',
    ishLavozimi: p.ishLavozimi ?? '',
    ishgaKirganSana: sana(p.ishgaKirganSana),
    radSababi: p.radSababi ?? '',
  };

  const joriyBosqich = ISHSIZ_HOLATI[p.holati].bosqich;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* ── Sarlavha va hayot sikli ── */}
      <div className="karta p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="sahifa-sarlavha">{tr(p.fish)}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {tr(p.mahalla.nomiKirill)} {tr('МФЙ ·')} {p.jinsi === 'Erkak' ? tr('Эркак') : tr('Аёл')}
              {p.malumoti ? ` · ${tr(kirillcha(MALUMOT, p.malumoti))}` : ''}
            </p>
            {p.mutaxassis && p.suhbatSanasi && (
              <p className="mt-1 text-xs text-ink-faint">
                {tr('Суҳбатни ўтказди:')} {tr(p.mutaxassis.fullName)} · {formatDate(p.suhbatSanasi)}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <HolatNishoni holati={p.holati} />
            {p.telefon && (
              <a
                href={`tel:${p.telefon}`}
                className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="raqam">{formatPhone(p.telefon)}</span>
              </a>
            )}
            {/*
              Фуқарони ўчириш. Эълонга жойлаштирилган бўлса,
              сервер рад этади ва сабабини айтади: аввал
              жойлаштиришни бекор қилиш керак, акс ҳолда иш ўрни
              «арвоҳ» бўлиб қолади — на бўш, на тўла.
            */}
            {sessiya.rol !== 'HOKIM' && (
              <OchirishTugmasi
                turi="fuqaro"
                id={p.id}
                nomi={`${p.fish} · ${p.mahalla.nomiKirill} МФЙ`}
                qayerga="/ishsizlar"
                kichik
              />
            )}
          </div>
        </div>

        {/*
          Hayot sikli chizig'i. Fuqaro qaysi bosqichda turgani bir
          qarashda ko'rinadi - ro'yxatdagi nishondan ko'ra aniqroq,
          chunki oldinda yana nechta qadam borligini ham ko'rsatadi.
        */}
        {p.holati !== 'RAD_ETDI' ? (
          <div className="mt-4 flex items-center gap-1">
            {VORONKA.map((b) => {
              const bosqich = ISHSIZ_HOLATI[b].bosqich;
              const otilgan = bosqich <= joriyBosqich;
              return (
                <div key={b} className="min-w-0 flex-1">
                  <div
                    className="h-1.5 rounded-full transition-colors"
                    style={{
                      background: otilgan ? `var(--step-${bosqich})` : 'var(--border)',
                    }}
                  />
                  <p
                    className={`mt-1.5 truncate text-[10px] leading-tight ${
                      otilgan ? 'text-ink-muted' : 'text-ink-faint'
                    }`}
                  >
                    {ISHSIZ_HOLATI[b].kirill}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="quti-xato mt-3">
            {tr('Фуқаро таклифдан бош тортган.')}
            {p.radSababi ? tr(` Сабаби: ${p.radSababi}`) : ''}
          </div>
        )}

        {p.household && (
          <Link
            href={`/xatlov/${p.household.id}`}
            className="mt-4 flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <House className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              {tr('Хонадон:')} {tr(p.household.oilaBoshligi)} · {p.household.manzil}
            </span>
          </Link>
        )}

        {p.takliflar.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.takliflar.map((t) => (
              <span
                key={t}
                className="rounded bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent"
              >
                {tr(kirillcha(BANDLIK_TAKLIFI, t))}
              </span>
            ))}
          </div>
        )}

        {p.ishJoyi && !p.vacancy && (
          <div className="quti-ok mt-3">
            {tr('Иш жойи:')} <b>{p.ishJoyi}</b>
            {p.ishLavozimi ? ` — ${p.ishLavozimi}` : ''}
            {p.ishgaKirganSana ? ` (${formatDate(p.ishgaKirganSana)})` : ''}
            <p className="mt-1 text-xs">
              {tr('Эълонсиз, қўлда киритилган иш жойи — бўш ўринлар ҳисобига кирмайди.')}
            </p>
          </div>
        )}
      </div>

      {/* ── Иш ўрни ─────────────────────────────────────────────
          Занжирнинг охирги ҳалқаси: эълон → номзод → банд ўрин.
          Илгари бу ерда фақат «иш жойи» деган матн майдони бор
          эди ва иш ўрни тўлгани ҳеч қаерда кўринмасди. */}
      {bandlikIshi(sessiya.rol) && (
        <section className="karta p-4 sm:p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <BriefcaseBusiness className="h-4 w-4 shrink-0 text-ink-faint" />
            {tr('Иш ўрни')}
          </h2>

          {p.vacancy ? (
            <div className="mt-3">
              <div className="rounded-md border border-line p-3">
                <Link
                  href={`/ish-orinlari/${p.vacancy.id}`}
                  className="text-sm font-semibold text-ink transition-colors hover:text-accent"
                >
                  {p.vacancy.lavozim} — {p.vacancy.korxonaNomi}
                </Link>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {tr(p.vacancy.mahalla.nomiKirill)} {tr('МФЙ')}
                  {p.vacancy.maosh
                    ? ` · ${(Number(p.vacancy.maosh) / 1_000_000).toFixed(1)} ${tr('млн сўм')}`
                    : ''}
                  {p.ishgaKirganSana
                    ? ` · ${tr('ишга кирган:')} ${formatDate(p.ishgaKirganSana).split(',')[0]}`
                    : ''}
                </p>
                {p.vacancy.telefon && (
                  <a
                    href={`tel:${p.vacancy.telefon}`}
                    className="raqam mt-1.5 flex items-center gap-1 text-xs font-medium text-accent"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(p.vacancy.telefon)}
                  </a>
                )}
                <div className="mt-2.5">
                  <BekorQilishTugmasi
                    orinId={p.vacancy.id}
                    ishsizId={p.id}
                    nomi={tr(p.fish)}
                  />
                </div>
              </div>
            </div>
          ) : orinlar.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              {p.holati === 'TASDIQLANDI'
                ? tr('Фуқаро ишга жойлашгани тасдиқланган.')
                : tr('Ҳозирча мос бўш иш ўрни йўқ. Янги эълон қўшилганда шу ерда кўринади.')}
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-ink-faint">
                {tr('Анкета маълумотига кўра энг мос келгани юқорида')}
              </p>
              <div className="mt-3 space-y-2">
                {orinlar.map(({ orin, hisob, moslik }) => (
                  <div key={orin.id} className="rounded-md border border-line p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/ish-orinlari/${orin.id}`}
                          className="text-sm font-semibold text-ink transition-colors hover:text-accent"
                        >
                          {orin.lavozim} — {orin.korxonaNomi}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {tr(orin.mahalla.nomiKirill)}
                          {orin.maosh
                            ? ` · ${(Number(orin.maosh) / 1_000_000).toFixed(1)} ${tr('млн сўм')}`
                            : ''}
                        </p>
                      </div>
                      <span className="raqam shrink-0 rounded bg-surface-muted px-2 py-1 text-[11px] font-medium text-ink-muted">
                        {hisob.qolgan} {tr('ўрин бўш')}
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <MoslikNishoni moslik={moslik} />
                    </div>

                    <div className="mt-2.5">
                      <JoylashtirishTugmasi
                        orinId={orin.id}
                        ishsizId={p.id}
                        nomi={`${orin.lavozim} — ${orin.korxonaNomi}`}
                        tosiq={moslik.tosiq}
                        kichik
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Chora-tadbirlar ── */}
      <section className="karta space-y-2 p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-bold text-ink">{tr('Чора-тадбирлар')}</h2>
        {p.topshiriqlar.map((t) => (
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
        {bandlikIshi(sessiya.rol) && <ChoraQoshish ishsizId={p.id} />}
      </section>

      {/*
        ── IT-ШАҲАРЧА ВАУЧЕРИ ──

        Занжирнинг УЧИНЧИ ҳалқаси. Биринчиси — хатлов (маҳалла
        ходими «IT ўрганмоқчи» деб белгилайди), иккинчиси —
        бандлик панелидаги навбат, учинчиси мана шу: ваучер
        рақам ва йўналиш билан берилади, кейин ҳолати
        кузатилади.

        Илгари биринчи ҳалқа бор эди, қолгани йўқ: белги
        қўйиларди ва шу билан тугарди.
      */}
      <VaucherBlogi
        ishsizId={p.id}
        istagiBor={p.itShaharchaVaucheri}
        organmoqchiKasb={p.organmoqchiKasb}
        bera={bandlikIshi(sessiya.rol)}
        vaucher={
          amaldagiVaucher
            ? {
                id: amaldagiVaucher.id,
                raqami: amaldagiVaucher.raqami,
                holati: amaldagiVaucher.holati,
                yonalish: amaldagiVaucher.yonalish,
                boshqaYonalish: amaldagiVaucher.boshqaYonalish,
                berilganSana: amaldagiVaucher.berilganSana,
                izoh: amaldagiVaucher.izoh,
                berganNomi: amaldagiVaucher.bergan.fullName,
              }
            : null
        }
      />

      {/* ── Suhbat anketasi ── */}
      {bandlikIshi(sessiya.rol) ? (
        /*
          `key` — joylashtirish natijasi formada DARHOL ko'rinishi uchun.

          `SuhbatFormasi` boshlang'ich holatni `useState` ga oladi va
          keyingi `router.refresh()` da uni qayta o'qimaydi. Natijada
          joylashtirilgandan keyin "Natija" bo'limi bo'sh turib
          qolardi — server yangi ma'lumot yuborgan bo'lsa ham. Kalit
          o'zgarishi komponentni qaytadan yaratadi.
        */
        <SuhbatFormasi
          key={p.vacancyId ?? 'elonsiz'}
          id={p.id}
          boshlangich={boshlangich}
          elongaBoglangan={p.vacancyId !== null}
        />
      ) : (
        <div className="karta p-4 text-sm text-ink-muted">
          {tr('Суҳбат анкетасини фақат бандлик маркази ходимлари тўлдиради.')}
        </div>
      )}
    </div>
  );
}
