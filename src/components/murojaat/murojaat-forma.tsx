'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MurojaatKanali } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON, useSaqlanmaganOgohlantirish } from '@/components/reja/umumiy';
import { kundanKeyin, hozirgiKun } from '@/lib/sana-maydoni';
import { KANAL_NOMI, ODATIY_JAVOB_KUNI } from '@/lib/murojaatlar-nomlari';

export interface XodimTanlovi {
  id: string;
  ism: string;
  rol: 'YETTILIK' | 'BANDLIK' | 'BANDLIK_RAHBAR' | 'ADMIN';
  mahallaId: string | null;
}

export interface MahallaTanlovi {
  id: string;
  nom: string;
}

/** Sana maydonini (YYYY-MM-DD) tushki 12:00 ga o'tkazadi: vaqt mintaqasi kunni siljitmasin */
const sanaIso = (s: string) => new Date(`${s}T12:00:00`).toISOString();

/**
 * Murojaatni qayd etish. Fuqaro tizimga o'zi yozmaydi: murojaatni xodim
 * qabulxonada, telefonda yoki uyma-uy yurganda eshitib yozadi.
 *
 * Javob muddatining dastlabki qiymati - ichki odat (15 kun), QONUNIY MUDDAT
 * EMAS: xodim uni tekshirib o'zgartiradi. Server muddatni har doim aniq
 * so'raydi.
 */
export function MurojaatForma({
  mahallalar,
  mahallaId,
  xodimlar,
  meniId,
  ishsiz,
}: {
  mahallalar: MahallaTanlovi[];
  /** Berilsa - mahalla o'zgartirilmaydi */
  mahallaId?: string | null;
  xodimlar: XodimTanlovi[];
  meniId: string;
  /** Fuqaro sahifasidan: fuqaro va uning mahallasi qat'iy */
  ishsiz?: { id: string; fish: string; telefon?: string | null } | null;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [mahalla, setMahalla] = useState(mahallaId ?? '');
  const [nomi, setNomi] = useState(ishsiz?.fish ?? '');
  const [telefon, setTelefon] = useState(ishsiz?.telefon ?? '');
  const [kanal, setKanal] = useState<MurojaatKanali>('QABULXONA');
  const [tavsif, setTavsif] = useState('');
  const [qabul, setQabul] = useState(hozirgiKun());
  const [masul, setMasul] = useState(meniId);
  const [muddat, setMuddat] = useState(kundanKeyin(ODATIY_JAVOB_KUNI));
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [ozgargan, setOzgargan] = useState(false);
  useSaqlanmaganOgohlantirish(ozgargan && !yuborilmoqda);

  /* Mas'ul: bandlik markazi har qaysi mahalla uchun, mahalla xodimi - faqat shu mahalla uchun */
  const masullar = useMemo(
    () => xodimlar.filter((x) => x.rol !== 'YETTILIK' || (mahalla !== '' && x.mahallaId === mahalla)),
    [xodimlar, mahalla]
  );
  const masulYaroqli = masullar.some((x) => x.id === masul);

  const ozg = (f: (v: string) => void) => (v: string) => {
    setOzgargan(true);
    f(v);
  };
  const yorliq = 'text-xs font-medium text-ink-muted';

  async function yubor(e: React.FormEvent) {
    e.preventDefault();
    if (yuborilmoqda) return;
    setXato(null);
    if (!mahalla) {
      setXato(tr('Маҳаллани танланг'));
      return;
    }
    if (!masulYaroqli) {
      setXato(tr('Масъул ходимни танланг'));
      return;
    }
    setYuborilmoqda(true);
    try {
      /* Qabul vaqti: bugun bo'lsa - hozirgi vaqt (kelajak bo'lib qolmasin), aks holda tush */
      const qabulVaqti = qabul === hozirgiKun() ? new Date().toISOString() : sanaIso(qabul);
      const javob = await fetch('/api/murojaatlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mahallaId: mahalla,
          ishsizId: ishsiz?.id ?? null,
          murojaatchiNomi: nomi.trim(),
          murojaatchiTelefon: telefon.trim() || null,
          kanal,
          tavsif: tavsif.trim(),
          qabulVaqti,
          masulId: masul,
          javobMuddati: sanaIso(muddat),
        }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setOzgargan(false);
      router.push(`/murojaatlar/${d.id}`);
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  return (
    <form onSubmit={yubor} className="space-y-3" noValidate>
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {!mahallaId && (
          <label className="block space-y-1 sm:col-span-2">
            <span className={yorliq}>{tr('Маҳалла')} *</span>
            <select value={mahalla} onChange={(e) => ozg(setMahalla)(e.target.value)} className={MAYDON}>
              <option value="">{tr('— маҳаллани танланг —')}</option>
              {mahallalar.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Мурожаатчи (ким)')} *</span>
          <input value={nomi} onChange={(e) => ozg(setNomi)(e.target.value)} maxLength={120} className={MAYDON} readOnly={!!ishsiz} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Мурожаатчи телефони')}</span>
          <input inputMode="tel" value={telefon} onChange={(e) => ozg(setTelefon)(e.target.value)} placeholder="90 123 45 67" className={MAYDON} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Қайси йўл билан келди')} *</span>
          <select value={kanal} onChange={(e) => ozg((v) => setKanal(v as MurojaatKanali))(e.target.value)} className={MAYDON}>
            {(Object.keys(KANAL_NOMI) as MurojaatKanali[]).map((k) => (
              <option key={k} value={k}>
                {tr(KANAL_NOMI[k])}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Қачон келган')} *</span>
          <input type="date" value={qabul} max={hozirgiKun()} onChange={(e) => ozg(setQabul)(e.target.value)} className={MAYDON} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Муаммо: мурожаатчи нима сўраяпти')} *</span>
          <textarea value={tavsif} onChange={(e) => ozg(setTavsif)(e.target.value)} rows={3} maxLength={1000} className={MAYDON} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Масъул ходим')} *</span>
          <select value={masulYaroqli ? masul : ''} onChange={(e) => ozg(setMasul)(e.target.value)} className={MAYDON}>
            <option value="">{tr('— танланг —')}</option>
            {masullar.map((x) => (
              <option key={x.id} value={x.id}>
                {x.ism}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Жавоб муддати')} *</span>
          <input type="date" value={muddat} min={qabul} onChange={(e) => ozg(setMuddat)(e.target.value)} className={MAYDON} />
          <span className="block text-[11px] text-ink-faint">
            {tr('Дастлабки қиймат — ички одат (')}{ODATIY_JAVOB_KUNI}{tr(' кун), қонуний муддат эмас: ўзингиз текширинг.')}
          </span>
        </label>
      </div>
      <button type="submit" disabled={yuborilmoqda} className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold">
        {yuborilmoqda && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {tr('Мурожаатни қайд этиш')}
      </button>
    </form>
  );
}
