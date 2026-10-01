'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON, useSaqlanmaganOgohlantirish } from '@/components/reja/umumiy';
import { KASB_YONALISHI } from '@/lib/constants';
import { hozirgiKun } from '@/lib/sana-maydoni';

export interface KursBoshlangichi {
  nomi: string;
  yonalish: string | null;
  konikmalar: string[];
  tashkilot: string;
  manzil: string | null;
  aloqa: string | null;
  /** YYYY-MM-DD */
  boshlanish: string;
  tugash: string;
  jamiDarsKuni: number | null;
  joylar: number | null;
  bepul: boolean | null;
  narxi: number | null;
  manba: string;
}

const BOSH: KursBoshlangichi = {
  nomi: '',
  yonalish: null,
  konikmalar: [],
  tashkilot: '',
  manzil: null,
  aloqa: null,
  boshlanish: '',
  tugash: '',
  jamiDarsKuni: null,
  joylar: null,
  bepul: null,
  narxi: null,
  manba: '',
};

/** Sana maydonini (YYYY-MM-DD) tushki 12:00 ga o'tkazadi: vaqt mintaqasi kunni siljitmasin */
const sanaIso = (s: string) => new Date(`${s}T12:00:00`).toISOString();

const raqam = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/**
 * Kurs qo'shish yoki tahrirlash.
 *
 * Bo'sh qoldirilgan "o'rinlar soni", "jami dars kuni" va "bepul/pullik" -
 * "noma'lum": nolga yoki "bepul"ga aylantirilmaydi.
 */
export function KursForma({
  kursId,
  boshlangich,
  yopish,
}: {
  /** Berilsa - tahrir */
  kursId?: string;
  boshlangich?: KursBoshlangichi;
  yopish?: () => void;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const tahrir = !!kursId;
  const asos = boshlangich ?? BOSH;

  const [nomi, setNomi] = useState(asos.nomi);
  const [yonalish, setYonalish] = useState(asos.yonalish ?? '');
  const [konikmalar, setKonikmalar] = useState(asos.konikmalar.join(', '));
  const [tashkilot, setTashkilot] = useState(asos.tashkilot);
  const [manzil, setManzil] = useState(asos.manzil ?? '');
  const [aloqa, setAloqa] = useState(asos.aloqa ?? '');
  const [boshlanish, setBoshlanish] = useState(asos.boshlanish);
  const [tugash, setTugash] = useState(asos.tugash);
  const [jamiDars, setJamiDars] = useState(asos.jamiDarsKuni?.toString() ?? '');
  const [joylar, setJoylar] = useState(asos.joylar?.toString() ?? '');
  const [bepul, setBepul] = useState<'' | 'ha' | 'yoq'>(asos.bepul === null ? '' : asos.bepul ? 'ha' : 'yoq');
  const [narxi, setNarxi] = useState(asos.narxi?.toString() ?? '');
  const [manba, setManba] = useState(asos.manba);
  const [tekshirilgan, setTekshirilgan] = useState(hozirgiKun());
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [ozgargan, setOzgargan] = useState(false);
  useSaqlanmaganOgohlantirish(ozgargan && !yuborilmoqda);

  const ozg = <T,>(f: (v: T) => void) => (v: T) => {
    setOzgargan(true);
    f(v);
  };

  async function yubor(e: React.FormEvent) {
    e.preventDefault();
    if (yuborilmoqda) return;
    setXato(null);
    if (!boshlanish || !tugash) {
      setXato(tr('Бошланиш ва тугаш санасини танланг'));
      return;
    }
    const royxat = konikmalar
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const maydonlar = {
      nomi: nomi.trim(),
      yonalish: yonalish || null,
      konikmalar: royxat,
      tashkilot: tashkilot.trim(),
      manzil: manzil.trim() || null,
      aloqa: aloqa.trim() || null,
      boshlanishSanasi: sanaIso(boshlanish),
      tugashSanasi: sanaIso(tugash),
      jamiDarsKuni: raqam(jamiDars),
      joylar: raqam(joylar),
      bepul: bepul === '' ? null : bepul === 'ha',
      narxi: bepul === 'yoq' ? raqam(narxi) : null,
      manba: manba.trim(),
    };

    setYuborilmoqda(true);
    try {
      const javob = await fetch(tahrir ? `/api/kurslar/${kursId}` : '/api/kurslar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          tahrir
            ? { amal: 'tahrir', maydonlar }
            : { ...maydonlar, tekshirilganSana: sanaIso(tekshirilgan) }
        ),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setOzgargan(false);
      if (tahrir) {
        yopish?.();
        router.refresh();
      } else {
        router.push(`/kurslar/${d.id}`);
      }
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  const yorliq = 'text-xs font-medium text-ink-muted';

  return (
    <form onSubmit={yubor} className="space-y-4" noValidate>
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Курс номи')} *</span>
          <input value={nomi} onChange={(e) => ozg(setNomi)(e.target.value)} maxLength={120} className={MAYDON} />
        </label>

        <label className="block space-y-1">
          <span className={yorliq}>{tr('Ўқув маркази / ташкилот')} *</span>
          <input value={tashkilot} onChange={(e) => ozg(setTashkilot)(e.target.value)} maxLength={120} className={MAYDON} />
        </label>

        <label className="block space-y-1">
          <span className={yorliq}>{tr('Йўналиши')}</span>
          <select value={yonalish} onChange={(e) => ozg(setYonalish)(e.target.value)} className={MAYDON}>
            <option value="">{tr('— кўрсатилмаган —')}</option>
            {KASB_YONALISHI.map((y) => (
              <option key={y.qiymat} value={y.qiymat}>
                {tr(y.kirill)}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Аниқ нимани ўргатади (вергул билан)')}</span>
          <input
            value={konikmalar}
            onChange={(e) => ozg(setKonikmalar)(e.target.value)}
            placeholder={tr('масалан: пайвандлаш, электр ускуналар')}
            className={MAYDON}
          />
          <span className="block text-[11px] text-ink-faint">
            {tr('Эълон талаби билан шу сўзлар бўйича солиштирилади. Умумий сўз эмас, аниқ кўникма ёзинг.')}
          </span>
        </label>

        <label className="block space-y-1">
          <span className={yorliq}>{tr('Бошланиш санаси')} *</span>
          <input type="date" value={boshlanish} onChange={(e) => ozg(setBoshlanish)(e.target.value)} className={MAYDON} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Тугаш санаси')} *</span>
          <input type="date" value={tugash} min={boshlanish || undefined} onChange={(e) => ozg(setTugash)(e.target.value)} className={MAYDON} />
        </label>

        <label className="block space-y-1">
          <span className={yorliq}>{tr('Жами дарс кунлари')}</span>
          <input inputMode="numeric" value={jamiDars} onChange={(e) => ozg(setJamiDars)(e.target.value)} placeholder={tr('билмасангиз — бўш қолдиринг')} className={MAYDON} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Ўринлар сони')}</span>
          <input inputMode="numeric" value={joylar} onChange={(e) => ozg(setJoylar)(e.target.value)} placeholder={tr('билмасангиз — бўш қолдиринг')} className={MAYDON} />
        </label>

        <label className="block space-y-1">
          <span className={yorliq}>{tr('Тўлов')}</span>
          <select value={bepul} onChange={(e) => ozg(setBepul)(e.target.value as '' | 'ha' | 'yoq')} className={MAYDON}>
            <option value="">{tr('Маълум эмас')}</option>
            <option value="ha">{tr('Бепул')}</option>
            <option value="yoq">{tr('Пуллик')}</option>
          </select>
        </label>
        {bepul === 'yoq' && (
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Нархи (сўм)')}</span>
            <input inputMode="numeric" value={narxi} onChange={(e) => ozg(setNarxi)(e.target.value)} className={MAYDON} />
          </label>
        )}

        <label className="block space-y-1">
          <span className={yorliq}>{tr('Манзил')}</span>
          <input value={manzil} onChange={(e) => ozg(setManzil)(e.target.value)} maxLength={200} className={MAYDON} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Алоқа телефони')}</span>
          <input inputMode="tel" value={aloqa} onChange={(e) => ozg(setAloqa)(e.target.value)} maxLength={60} className={MAYDON} />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Маълумот манбаси')} *</span>
          <input
            value={manba}
            onChange={(e) => ozg(setManba)(e.target.value)}
            maxLength={200}
            placeholder={tr('ким айтди ёки қайси ҳужжат: марказ директори, телефон орқали')}
            className={MAYDON}
          />
        </label>

        {!tahrir && (
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Ташкилотдан текширилган сана')}</span>
            <input type="date" value={tekshirilgan} max={hozirgiKun()} onChange={(e) => ozg(setTekshirilgan)(e.target.value)} className={MAYDON} />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={yuborilmoqda} className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold">
          {yuborilmoqda && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {tahrir ? tr('Сақлаш') : tr('Курсни қўшиш')}
        </button>
        {yopish && (
          <button type="button" onClick={yopish} className="tugma-ikkilamchi min-h-11 rounded-md px-4 py-2 text-sm">
            {tr('Бекор қилиш')}
          </button>
        )}
      </div>
    </form>
  );
}
