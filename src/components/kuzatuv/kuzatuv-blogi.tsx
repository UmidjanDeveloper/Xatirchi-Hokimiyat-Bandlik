import { AlertTriangle, CalendarClock, CheckCircle2, CircleHelp, PhoneOff, XCircle } from 'lucide-react';
import type { Rol } from '@prisma/client';
import { matnchi } from '@/lib/alifbo-server';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { DALIL_NOMI } from '@/lib/dalil-nomlari';
import {
  BOSQICHLAR,
  DARAJA_NOMI,
  JAVOB_NOMI,
  NATIJA_NOMI,
  SAVOLLAR,
  bosqichHolati,
  muddatSanasi,
  type BosqichHolati,
} from '@/lib/kuzatuv';
import { sanaOrali } from '@/lib/oila-rejasi';
import { KuzatuvForma } from './kuzatuv-forma';

/**
 * Fuqaro sahifasidagi "30/60/90 kunlik kuzatuv" bloki: har bir ish
 * uchun uch bosqich, har bosqichda holat va javoblar MANBASI bilan.
 *
 * ── Holat rang bilan EMAS, matn va belgi bilan ──
 *
 * "Kechikdi" qizil rangda ham, "⚠ Кечикди" ham deb ko'rinadi: rang
 * ko'rmaydigan yoki quyoshda telefonga qaragan odam farqni baribir
 * ko'radi.
 *
 * Xato bu yerda yutiladi: blok ikkilamchi, fuqaro sahifasining o'zi
 * (anketa, suhbat) kuzatuv jadvali sabab ochilmay qolmasligi kerak.
 */

const HOLAT_KORINISHI: Record<
  BosqichHolati,
  { matn: string; sinf: string; ikonka: 'ok' | 'soat' | 'ogoh' | 'telefon' | 'yopiq' }
> = {
  bajarildi: { matn: 'Қайд этилган', sinf: 'text-ok', ikonka: 'ok' },
  boglanilmadi: { matn: 'Боғланиб бўлмади', sinf: 'text-warn', ikonka: 'telefon' },
  qayta_urinish: { matn: 'Қайта уриниш керак', sinf: 'text-danger', ikonka: 'ogoh' },
  kutilmoqda: { matn: 'Муддати келмаган', sinf: 'text-ink-faint', ikonka: 'soat' },
  bugun: { matn: 'Муддат — бугун', sinf: 'text-warn', ikonka: 'ogoh' },
  kechikdi: { matn: 'Кечикди', sinf: 'text-danger', ikonka: 'ogoh' },
  yopilgan: { matn: 'Иш муддатдан олдин тугаган', sinf: 'text-ink-muted', ikonka: 'yopiq' },
};

function Belgi({ nomi }: { nomi: (typeof HOLAT_KORINISHI)[BosqichHolati]['ikonka'] }) {
  const sinf = 'h-4 w-4 shrink-0';
  if (nomi === 'ok') return <CheckCircle2 className={sinf} aria-hidden="true" />;
  if (nomi === 'soat') return <CalendarClock className={sinf} aria-hidden="true" />;
  if (nomi === 'telefon') return <PhoneOff className={sinf} aria-hidden="true" />;
  if (nomi === 'yopiq') return <XCircle className={sinf} aria-hidden="true" />;
  return <AlertTriangle className={sinf} aria-hidden="true" />;
}

const som = (v: bigint | null) => (v == null ? null : `${Number(v).toLocaleString('ru-RU')} сўм`);

export async function KuzatuvBlogi({ ishsizId, rol }: { ishsizId: string; rol: Rol }) {
  /* Hokim yakka fuqaroning kuzatuv yozuvini ko'rmaydi (jamlanma panelda) */
  if (rol === 'HOKIM') return null;

  const tr = matnchi();
  const hozir = new Date();

  try {
    const [ishlar, dalillar, odam] = await Promise.all([
      prisma.ishgaJoylashish.findMany({
        where: { ishsizId, boshlanganSana: { lte: hozir } },
        orderBy: { boshlanganSana: 'desc' },
        take: 10,
        select: {
          id: true,
          korxonaNomi: true,
          boshlanganSana: true,
          tugaganSana: true,
          kuzatuvlar: {
            include: { kiritgan: { select: { fullName: true } } },
          },
        },
      }),
      prisma.joylashuvDalili.findMany({
        where: { ishsizId, holati: 'TASDIQLANDI' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, turi: true, joylashishId: true, hujjatSanasi: true, createdAt: true },
      }),
      prisma.unemployedPerson.findUnique({
        where: { id: ishsizId },
        select: { household: { select: { oylikDaromad: true } } },
      }),
    ]);

    if (ishlar.length === 0) return null;
    const xatlovDaromadi = odam?.household?.oylikDaromad ?? null;

    return (
      <section id="kuzatuv" className="space-y-3 scroll-mt-20" aria-labelledby="kz-sarlavha">
        <div>
          <h2 id="kz-sarlavha" className="text-sm font-bold text-ink">
            {tr('30/60/90 кунлик кузатув')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr(
              'Ишда қолиш ва даромад ўзгариши. «Маълум эмас» — «йўқ» дегани эмас. Ҳар жавобнинг манбаи кўрсатилади.'
            )}
          </p>
        </div>

        {ishlar.map((ish) => {
          const ishDalillari = dalillar
            .filter((d) => d.joylashishId === null || d.joylashishId === ish.id)
            .map((d) => ({
              id: d.id,
              nomi: `${tr(DALIL_NOMI[d.turi])} · ${formatDate(d.hujjatSanasi ?? d.createdAt).split(',')[0]}`,
            }));

          return (
            <div key={ish.id} className="karta space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{ish.korxonaNomi}</p>
                <p className="text-xs text-ink-faint">
                  {tr('Ишга кирган:')} {formatDate(ish.boshlanganSana).split(',')[0]}
                  {ish.tugaganSana && ` · ${tr('тугади:')} ${formatDate(ish.tugaganSana).split(',')[0]}`}
                </p>
              </div>

              <ul className="space-y-3">
                {BOSQICHLAR.map((kun) => {
                  const y = ish.kuzatuvlar.find((k) => k.kunBelgisi === kun) ?? null;
                  const holat = bosqichHolati(ish, kun, y, hozir);
                  const k = HOLAT_KORINISHI[holat];
                  const muddat = muddatSanasi(ish.boshlanganSana, kun);
                  const farq = sanaOrali(muddat, hozir);
                  /* Formani muddatdan 7 kun oldin ochamiz (kuzatuvniTekshir bilan bir xil) */
                  const yozishMumkin = farq <= 7 && holat !== 'yopilgan';
                  const tekshirilgan = y?.natija === 'MALUMOT_OLINDI' && y.manba === 'TEKSHIRILGAN';

                  return (
                    <li key={kun} className="rounded-md border border-line p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">{tr(`${kun} кун`)}</p>
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${k.sinf}`}>
                          <Belgi nomi={k.ikonka} />
                          {tr(k.matn)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-faint">
                        {tr('Муддат:')} {formatDate(muddat).split(',')[0]}
                        {holat === 'kechikdi' && ` (${Math.abs(farq)} ${tr('кун кечикди')})`}
                      </p>

                      {y && (
                        <div className="mt-2 space-y-1.5 text-xs">
                          <p className="text-ink-muted">
                            <span className="font-medium">{tr(NATIJA_NOMI[y.natija])}</span>
                            {' · '}
                            {tr('маълумот олинган:')} {formatDate(y.tekshiruvSanasi).split(',')[0]}
                            {y.tasdiqSanasi &&
                              ` · ${tr('тасдиқланган:')} ${formatDate(y.tasdiqSanasi).split(',')[0]}`}
                            {' · '}
                            {tr('киритилган:')} {formatDate(y.createdAt).split(',')[0]}
                          </p>
                          {y.natija === 'MALUMOT_OLINDI' && (
                            <>
                              <p className="text-ink-muted">
                                {tr('Манба:')}{' '}
                                <span className="font-medium text-ink">{tr(DARAJA_NOMI[y.manba])}</span>
                                {' · '}
                                {tr('Қайд этган:')} {y.kiritgan.fullName}
                              </p>
                              <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                                {SAVOLLAR.map((s) => (
                                  <li key={s.kalit} className="flex items-center justify-between gap-2">
                                    <span className="text-ink-faint">{tr(s.savol)}</span>
                                    <span
                                      className={`flex items-center gap-1 font-medium ${
                                        y[s.kalit] === 'NOMALUM' ? 'text-ink-faint' : 'text-ink'
                                      }`}
                                    >
                                      {y[s.kalit] === 'NOMALUM' && (
                                        <CircleHelp className="h-3 w-3" aria-hidden="true" />
                                      )}
                                      {tr(JAVOB_NOMI[y[s.kalit]])}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <p className="text-ink-muted">
                                {tr('Иш ҳақи:')} {som(y.ishHaqiSom) ?? tr('маълум эмас')}
                                {' · '}
                                {tr('Оила даромади:')} {som(y.oilaDaromadiSom) ?? tr('маълум эмас')}
                                {' · '}
                                {tr('Бошланғич:')} {som(y.oldingiDaromadSom) ?? tr('маълум эмас')}
                                {y.oilaDaromadiSom != null && (
                                  <span className="text-ink-faint">
                                    {' '}
                                    ({tr('даромад манбаи:')} {tr(DARAJA_NOMI[y.daromadManbasi])})
                                  </span>
                                )}
                              </p>
                              {y.tugashSababi && (
                                <p className="text-ink-muted">
                                  {tr('Ишдан кетиш сабаби:')} {y.tugashSababi}
                                </p>
                              )}
                              {y.yordamIzohi && (
                                <p className="text-ink-muted">
                                  {tr('Керак ёрдам:')} {y.yordamIzohi}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {yozishMumkin && !tekshirilgan && (
                        <div className="mt-3">
                          <KuzatuvForma
                            joylashishId={ish.id}
                            kun={kun}
                            oldingiDaromad={xatlovDaromadi == null ? '' : String(xatlovDaromadi)}
                            dalillar={ishDalillari}
                            ishTugagan={ish.tugaganSana !== null}
                            mavjud={y !== null}
                          />
                        </div>
                      )}
                      {tekshirilgan && (
                        <p className="mt-2 text-[11px] text-ink-faint">
                          {tr('Текширилган ёзув ўзгартирилмайди.')}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    );
  } catch (e) {
    console.error('Kuzatuv blokini yuklab bo‘lmadi:', e);
    return null;
  }
}
