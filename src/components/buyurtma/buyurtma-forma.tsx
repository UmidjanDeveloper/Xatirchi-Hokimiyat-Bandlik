'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON, useSaqlanmaganOgohlantirish } from '@/components/reja/umumiy';

export interface MahallaTanlovi {
  id: string;
  nom: string;
}

/**
 * Yangi buyurtma qabul qilish. Mahalla xodimi uchun mahalla qat'iy
 * (`mahallaId`); bandlik markazi ro'yxatdan tanlaydi. Server huquqni
 * baribir qayta tekshiradi.
 *
 * Buyurtmachi ro'yxatdagi fuqaro bo'lishi shart emas: ism va (ixtiyoriy)
 * telefon yoziladi.
 */
export function BuyurtmaForma({
  mahallalar,
  mahallaId,
}: {
  mahallalar: MahallaTanlovi[];
  /** Berilsa - mahalla o'zgartirilmaydi */
  mahallaId?: string | null;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [mahalla, setMahalla] = useState(mahallaId ?? '');
  const [nomi, setNomi] = useState('');
  const [telefon, setTelefon] = useState('');
  const [tavsif, setTavsif] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [ozgargan, setOzgargan] = useState(false);
  useSaqlanmaganOgohlantirish(ozgargan && !yuborilmoqda);

  async function yubor(e: React.FormEvent) {
    e.preventDefault();
    if (yuborilmoqda) return;
    setXato(null);
    if (!mahalla) {
      setXato(tr('Маҳаллани танланг'));
      return;
    }
    setYuborilmoqda(true);
    try {
      const javob = await fetch('/api/buyurtmalar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mahallaId: mahalla,
          buyurtmachiNomi: nomi.trim(),
          buyurtmachiTelefon: telefon.trim() || null,
          tavsif: tavsif.trim(),
        }),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setOzgargan(false);
      router.push(`/buyurtmalar/${d.id}`);
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  const yorliq = 'text-xs font-medium text-ink-muted';
  const ozg = (f: (v: string) => void) => (v: string) => {
    setOzgargan(true);
    f(v);
  };

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
          <span className={yorliq}>{tr('Буюртмачи (ким хизмат сўраяпти)')} *</span>
          <input value={nomi} onChange={(e) => ozg(setNomi)(e.target.value)} maxLength={120} className={MAYDON} />
        </label>
        <label className="block space-y-1">
          <span className={yorliq}>{tr('Буюртмачи телефони')}</span>
          <input inputMode="tel" value={telefon} onChange={(e) => ozg(setTelefon)(e.target.value)} placeholder="90 123 45 67" className={MAYDON} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className={yorliq}>{tr('Нима хизмат керак')} *</span>
          <textarea
            value={tavsif}
            onChange={(e) => ozg(setTavsif)(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={tr('масалан: мактаб эшикларини таъмирлаш керак, 6 дона')}
            className={MAYDON}
          />
        </label>
      </div>
      <button type="submit" disabled={yuborilmoqda} className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold">
        {yuborilmoqda && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {tr('Буюртмани қабул қилиш')}
      </button>
    </form>
  );
}
