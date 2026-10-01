'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON, useSaqlanmaganOgohlantirish } from '@/components/reja/umumiy';
import { hozirgiKun } from '@/lib/sana-maydoni';

export interface DasturBoshlangichi {
  nomi: string;
  nishonGuruh: string;
  talablar: string;
  hujjatlar: string | null;
  masulTashkilot: string;
  rasmiyManba: string;
  miqdori: string | null;
  /** YYYY-MM-DD */
  boshi: string;
  oxiri: string;
}

const BOSH: DasturBoshlangichi = {
  nomi: '',
  nishonGuruh: '',
  talablar: '',
  hujjatlar: null,
  masulTashkilot: '',
  rasmiyManba: '',
  miqdori: null,
  boshi: '',
  oxiri: '',
};

/** Sana maydonini (YYYY-MM-DD) tushki 12:00 ga o'tkazadi: vaqt mintaqasi kunni siljitmasin */
const sanaIso = (s: string) => new Date(`${s}T12:00:00`).toISOString();

/**
 * Yordam dasturini qo'shish yoki tahrirlash.
 *
 * Ma'lumot FAQAT rasmiy manbadan olinadi; rasmiy manba majburiy. Bo'sh
 * qoldirilgan muddat "noma'lum" bo'lib qoladi ("cheksiz" emas).
 */
export function YordamForma({
  dasturId,
  boshlangich,
  yopish,
}: {
  dasturId?: string;
  boshlangich?: DasturBoshlangichi;
  yopish?: () => void;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const tahrir = !!dasturId;
  const asos = boshlangich ?? BOSH;

  const [nomi, setNomi] = useState(asos.nomi);
  const [guruh, setGuruh] = useState(asos.nishonGuruh);
  const [talablar, setTalablar] = useState(asos.talablar);
  const [hujjatlar, setHujjatlar] = useState(asos.hujjatlar ?? '');
  const [tashkilot, setTashkilot] = useState(asos.masulTashkilot);
  const [manba, setManba] = useState(asos.rasmiyManba);
  const [miqdori, setMiqdori] = useState(asos.miqdori ?? '');
  const [boshi, setBoshi] = useState(asos.boshi);
  const [oxiri, setOxiri] = useState(asos.oxiri);
  const [tekshirilgan, setTekshirilgan] = useState(hozirgiKun());
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [ozgargan, setOzgargan] = useState(false);
  useSaqlanmaganOgohlantirish(ozgargan && !yuborilmoqda);

  const ozg = (f: (v: string) => void) => (v: string) => {
    setOzgargan(true);
    f(v);
  };

  async function yubor(e: React.FormEvent) {
    e.preventDefault();
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const maydonlar = {
        nomi: nomi.trim(),
        nishonGuruh: guruh.trim(),
        talablar: talablar.trim(),
        hujjatlar: hujjatlar.trim() || null,
        masulTashkilot: tashkilot.trim(),
        rasmiyManba: manba.trim(),
        miqdori: miqdori.trim() || null,
        amalQilishBoshi: boshi ? sanaIso(boshi) : null,
        amalQilishOxiri: oxiri ? sanaIso(oxiri) : null,
      };
      const javob = await fetch(tahrir ? `/api/yordam/${dasturId}` : '/api/yordam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tahrir ? { amal: 'tahrir', maydonlar } : { ...maydonlar, tekshirilganSana: sanaIso(tekshirilgan) }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setOzgargan(false);
      yopish?.();
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  const yorliq = 'text-xs font-medium text-ink-muted';

  return (
    <form onSubmit={yubor} className="space-y-3" noValidate>
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Дастур номи')} *</span>
          <input value={nomi} onChange={(e) => ozg(setNomi)(e.target.value)} maxLength={150} className={MAYDON} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Кимлар учун')} *</span>
          <input value={guruh} onChange={(e) => ozg(setGuruh)(e.target.value)} maxLength={300} className={MAYDON} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Талаблар')} *</span>
          <textarea value={talablar} onChange={(e) => ozg(setTalablar)(e.target.value)} rows={3} maxLength={1000} className={MAYDON} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Керакли ҳужжатлар')}</span>
          <input value={hujjatlar} onChange={(e) => ozg(setHujjatlar)(e.target.value)} maxLength={500} className={MAYDON} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Масъул ташкилот')} *</span>
          <input value={tashkilot} onChange={(e) => ozg(setTashkilot)(e.target.value)} maxLength={150} className={MAYDON} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Миқдор / имтиёз (манбадаги матн билан)')}</span>
          <input value={miqdori} onChange={(e) => ozg(setMiqdori)(e.target.value)} maxLength={300} placeholder={tr('билмасангиз — бўш қолдиринг')} className={MAYDON} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Расмий манба')} *</span>
          <input
            value={manba}
            onChange={(e) => ozg(setManba)(e.target.value)}
            maxLength={300}
            placeholder={tr('ҳужжат номи ва рақами ёки ҳавола')}
            className={MAYDON}
          />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Амал қилиш: бошланиши')}</span>
          <input type="date" value={boshi} onChange={(e) => ozg(setBoshi)(e.target.value)} className={MAYDON} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Амал қилиш: тугаши')}</span>
          <input type="date" value={oxiri} min={boshi || undefined} onChange={(e) => ozg(setOxiri)(e.target.value)} className={MAYDON} />
          <span className="block text-[11px] text-ink-faint">
            {tr('Манбада кўрсатилмаган бўлса — бўш қолдиринг: бу «чексиз» эмас, «маълум эмас».')}
          </span>
        </label>
        {!tahrir && (
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Манбадан текширилган сана')}</span>
            <input type="date" value={tekshirilgan} max={hozirgiKun()} onChange={(e) => ozg(setTekshirilgan)(e.target.value)} className={MAYDON} />
          </label>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={yuborilmoqda} className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold">
          {yuborilmoqda && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {tahrir ? tr('Сақлаш') : tr('Дастурни қўшиш')}
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
