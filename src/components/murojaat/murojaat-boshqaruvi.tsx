'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MurojaatHolati, MurojaatNatijasi } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from '@/components/reja/umumiy';
import { hozirgiKun, kundanKeyin } from '@/lib/sana-maydoni';
import { NATIJA_NOMI, ODATIY_JAVOB_KUNI } from '@/lib/murojaatlar-nomlari';
import type { XodimTanlovi } from './murojaat-forma';

/** Sana maydonini (YYYY-MM-DD) tushki 12:00 ga o'tkazadi: vaqt mintaqasi kunni siljitmasin */
const sanaIso = (s: string) => new Date(`${s}T12:00:00`).toISOString();

type Rejim = null | 'javob' | 'qayta-ochish' | 'masul' | 'muddat';

/**
 * Murojaat ustidagi amallar. Har amal serverda yana tekshiriladi (holat
 * o'tishlari, sanalar, mahalla huquqi); bu yerdagi cheklovlar faqat xodimga
 * qulaylik uchun.
 *
 * Har o'zgarish tarixga yoziladi. Muddatni faqat oldinga va sabab bilan
 * surish mumkin; qayta ochishda sabab va yangi muddat majburiy.
 */
export function MurojaatBoshqaruvi({
  id,
  holati,
  masulId,
  masullar,
  javobKuni,
  qabulKuni,
}: {
  id: string;
  holati: MurojaatHolati;
  masulId: string;
  /** Shu mahalla uchun mas'ul bo'la oladigan xodimlar */
  masullar: XodimTanlovi[];
  /** Joriy javob muddati, YYYY-MM-DD */
  javobKuni: string;
  /** Qabul sanasi, YYYY-MM-DD */
  qabulKuni: string;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [rejim, setRejim] = useState<Rejim>(null);
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  const [natijaTuri, setNatijaTuri] = useState<MurojaatNatijasi>('HAL_QILINDI');
  const [natija, setNatija] = useState('');
  const [sana, setSana] = useState(hozirgiKun());
  const [sabab, setSabab] = useState('');
  const [yangiMuddat, setYangiMuddat] = useState('');
  const [yangiMasul, setYangiMasul] = useState('');

  async function amal(tana: Record<string, unknown>) {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const r = await fetch(`/api/murojaatlar/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setRejim(null);
      setNatija('');
      setSabab('');
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  const yorliq = 'text-xs font-medium text-ink-muted';
  const tugma = 'tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium';
  const asosiy = 'tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold';
  const spin = yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />;
  const ochiq = holati === 'YANGI' || holati === 'JARAYONDA';
  const javobli = holati === 'JAVOB_BERILDI' || holati === 'YOPILDI';

  const ortga = (
    <button type="button" onClick={() => setRejim(null)} className={tugma}>
      {tr('Ортга')}
    </button>
  );

  return (
    <div className="space-y-3">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {rejim === null && (
        <div className="flex flex-wrap gap-2">
          {holati === 'YANGI' && (
            <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'qabul' })} className={asosiy}>
              {spin}
              {tr('Кўриб чиқишни бошлаш')}
            </button>
          )}
          {ochiq && (
            <button type="button" onClick={() => { setXato(null); setRejim('javob'); setSana(hozirgiKun()); }} className={asosiy}>
              {tr('Жавоб берилди')}
            </button>
          )}
          {holati === 'JAVOB_BERILDI' && (
            <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'yopish' })} className={asosiy}>
              {spin}
              {tr('Ишни ёпиш')}
            </button>
          )}
          {javobli && (
            <button
              type="button"
              onClick={() => { setXato(null); setYangiMuddat(kundanKeyin(ODATIY_JAVOB_KUNI)); setRejim('qayta-ochish'); }}
              className={tugma}
            >
              {tr('Қайта очиш')}
            </button>
          )}
          {ochiq && (
            <button
              type="button"
              onClick={() => { setXato(null); setYangiMuddat(''); setRejim('muddat'); }}
              className={tugma}
            >
              {tr('Муддатни кейинга суриш')}
            </button>
          )}
          <button type="button" onClick={() => { setXato(null); setYangiMasul(''); setRejim('masul'); }} className={tugma}>
            {tr('Масъулни алмаштириш')}
          </button>
        </div>
      )}

      {rejim === 'javob' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className={yorliq}>{tr('Натижа')} *</span>
              <select value={natijaTuri} onChange={(e) => setNatijaTuri(e.target.value as MurojaatNatijasi)} className={`${MAYDON} min-h-11 text-sm`}>
                {(Object.keys(NATIJA_NOMI) as MurojaatNatijasi[]).map((n) => (
                  <option key={n} value={n}>
                    {tr(NATIJA_NOMI[n])}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className={yorliq}>{tr('Жавоб қачон берилди')}</span>
              <input type="date" value={sana} min={qabulKuni} max={hozirgiKun()} onChange={(e) => setSana(e.target.value)} className={`${MAYDON} min-h-11 text-sm`} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Нима жавоб берилди / нима қилинди')} *</span>
            <textarea value={natija} onChange={(e) => setNatija(e.target.value)} rows={3} maxLength={1000} className={`${MAYDON} text-sm`} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={yuborilmoqda || natija.trim().length < 5 || !sana}
              onClick={() => amal({ amal: 'javob', natijaTuri, natija: natija.trim(), sana: sanaIso(sana) })}
              className={asosiy}
            >
              {spin}
              {tr('Сақлаш')}
            </button>
            {ortga}
          </div>
        </div>
      )}

      {rejim === 'qayta-ochish' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <p className="text-xs text-ink-muted">
            {tr('Олдинги натижа тарихда сақланади, мурожаат «Кўриб чиқилмоқда» ҳолатига қайтади.')}
          </p>
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Қайта очиш сабаби')} *</span>
            <input value={sabab} onChange={(e) => setSabab(e.target.value)} maxLength={300} className={`${MAYDON} min-h-11 text-sm`} />
          </label>
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Янги жавоб муддати')} *</span>
            <input type="date" value={yangiMuddat} min={hozirgiKun()} onChange={(e) => setYangiMuddat(e.target.value)} className={`${MAYDON} min-h-11 text-sm`} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={yuborilmoqda || sabab.trim().length < 3 || !yangiMuddat}
              onClick={() => amal({ amal: 'qayta-ochish', sabab: sabab.trim(), yangiMuddat: sanaIso(yangiMuddat) })}
              className={asosiy}
            >
              {spin}
              {tr('Қайта очиш')}
            </button>
            {ortga}
          </div>
        </div>
      )}

      {rejim === 'muddat' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <p className="text-xs text-ink-muted">
            {tr('Муддатни фақат кейинга суриш мумкин. Сабаб ва эски/янги сана тарихга ёзилади.')}
          </p>
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Янги муддат')} *</span>
            <input type="date" value={yangiMuddat} min={javobKuni} onChange={(e) => setYangiMuddat(e.target.value)} className={`${MAYDON} min-h-11 text-sm`} />
          </label>
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Нега сурилади')} *</span>
            <input value={sabab} onChange={(e) => setSabab(e.target.value)} maxLength={300} className={`${MAYDON} min-h-11 text-sm`} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={yuborilmoqda || sabab.trim().length < 3 || !yangiMuddat || yangiMuddat <= javobKuni}
              onClick={() => amal({ amal: 'muddat', yangiMuddat: sanaIso(yangiMuddat), sabab: sabab.trim() })}
              className={asosiy}
            >
              {spin}
              {tr('Сақлаш')}
            </button>
            {ortga}
          </div>
        </div>
      )}

      {rejim === 'masul' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Янги масъул ходим')}</span>
            <select value={yangiMasul} onChange={(e) => setYangiMasul(e.target.value)} className={`${MAYDON} min-h-11 text-sm`}>
              <option value="">{tr('— танланг —')}</option>
              {masullar
                .filter((x) => x.id !== masulId)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.ism}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={yuborilmoqda || !yangiMasul} onClick={() => amal({ amal: 'masul', masulId: yangiMasul })} className={asosiy}>
              {spin}
              {tr('Алмаштириш')}
            </button>
            {ortga}
          </div>
        </div>
      )}
    </div>
  );
}
