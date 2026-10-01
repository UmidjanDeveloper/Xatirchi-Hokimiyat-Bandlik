'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BuyurtmaHolati } from '@prisma/client';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from '@/components/reja/umumiy';

/** Sana maydonini (YYYY-MM-DD) tushki 12:00 ga o'tkazadi: vaqt mintaqasi kunni siljitmasin */
const sanaIso = (s: string) => new Date(`${s}T12:00:00`).toISOString();

type Usul = 'OGZAKI' | 'TELEFON' | 'YOZMA';
type Tomon = 'ijrochi' | 'buyurtmachi';

const USUL_NOMI: Record<Usul, string> = {
  OGZAKI: 'Оғзаки (юзма-юз)',
  TELEFON: 'Телефон орқали',
  YOZMA: 'Ёзма',
};

export interface IjrochiTanlovi {
  id: string;
  /** Tayyor matn: xizmat, ism, mahalla */
  yorliq: string;
}

/**
 * Buyurtma ustidagi amallar. Har amal serverda yana tekshiriladi (holat
 * o'tishlari, rozilik, mahalla huquqi); bu yerdagi cheklovlar faqat xodimga
 * qulaylik uchun.
 *
 * "Bajarildi" - xodimning qaydi. Ijrochi VA buyurtmachi har biri alohida
 * tasdiqlaydi; e'tiroz sababi majburiy. Tasdiqlangan javob ortga qaytmaydi.
 */
export function BuyurtmaBoshqaruvi({
  id,
  holati,
  ijrochiTasdigi,
  buyurtmachiTasdigi,
  kelishuvKuni,
  bugun,
  takliflar,
  ijrochiNomi,
  buyurtmachiNomi,
}: {
  id: string;
  holati: BuyurtmaHolati;
  ijrochiTasdigi: boolean | null;
  buyurtmachiTasdigi: boolean | null;
  /** YYYY-MM-DD yoki null */
  kelishuvKuni: string | null;
  bugun: string;
  /** Tayinlash mumkin ijrochilar (rozilikli, faol, doira ichida) */
  takliflar: IjrochiTanlovi[];
  ijrochiNomi: string | null;
  buyurtmachiNomi: string;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  const [taklif, setTaklif] = useState('');
  const [narx, setNarx] = useState('');
  const [muddat, setMuddat] = useState('');
  const [sana, setSana] = useState(bugun);
  const [sabab, setSabab] = useState('');

  /* Tasdiq formasi: har tomon uchun alohida */
  const [tomon, setTomon] = useState<Tomon | null>(null);
  const [javob, setJavob] = useState<'ha' | 'yoq'>('ha');
  const [usul, setUsul] = useState<Usul>('TELEFON');
  const [izoh, setIzoh] = useState('');
  const [bekorRejim, setBekorRejim] = useState(false);

  async function amal(tana: Record<string, unknown>) {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const r = await fetch(`/api/buyurtmalar/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setTomon(null);
      setBekorRejim(false);
      setSabab('');
      setIzoh('');
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  if (holati === 'BEKOR') return null;

  const yorliq = 'text-xs font-medium text-ink-muted';
  const tugma = 'tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium';
  const asosiy = 'tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold';
  const spin = yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />;

  const tasdiqQatori = (t: Tomon, nom: string, qiymat: boolean | null) => (
    <div key={t} className="rounded-md border border-line p-3">
      <p className="text-sm font-medium text-ink">{nom}</p>
      {qiymat === true ? (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-ok">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {tr('Тасдиқлаган')}
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-muted">
            {qiymat === false ? tr('Эътироз билдирган. Томонлар келишса, тасдиқни қайд этиш мумкин.') : tr('Ҳали тасдиқ олинмаган.')}
          </p>
          {tomon !== t ? (
            <button type="button" onClick={() => { setXato(null); setTomon(t); setJavob('ha'); setIzoh(''); }} className={`${tugma} mt-2`}>
              {tr('Жавобни қайд этиш')}
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              <fieldset className="flex flex-wrap gap-3 text-sm text-ink">
                <legend className={yorliq}>{tr('Жавоб')}</legend>
                <label className="flex min-h-11 items-center gap-2">
                  <input type="radio" name={`javob-${t}`} checked={javob === 'ha'} onChange={() => setJavob('ha')} />
                  {tr('Иш бажарилганини тасдиқлади')}
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input type="radio" name={`javob-${t}`} checked={javob === 'yoq'} onChange={() => setJavob('yoq')} />
                  {tr('Эътироз билдирди')}
                </label>
              </fieldset>
              <label className="block space-y-1">
                <span className={yorliq}>{tr('Қандай олинди')}</span>
                <select value={usul} onChange={(e) => setUsul(e.target.value as Usul)} className={`${MAYDON} min-h-11 text-sm`}>
                  {(Object.keys(USUL_NOMI) as Usul[]).map((u) => (
                    <option key={u} value={u}>
                      {tr(USUL_NOMI[u])}
                    </option>
                  ))}
                </select>
              </label>
              {javob === 'yoq' && (
                <label className="block space-y-1">
                  <span className={yorliq}>{tr('Эътироз сабаби')} *</span>
                  <input value={izoh} onChange={(e) => setIzoh(e.target.value)} maxLength={300} className={`${MAYDON} min-h-11 text-sm`} />
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={yuborilmoqda || (javob === 'yoq' && izoh.trim().length < 3)}
                  onClick={() => amal({ amal: 'tasdiq', tomon: t, javob: javob === 'ha', usul, izoh: izoh.trim() || null })}
                  className={asosiy}
                >
                  {spin}
                  {tr('Сақлаш')}
                </button>
                <button type="button" onClick={() => setTomon(null)} className={tugma}>
                  {tr('Ортга')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {(holati === 'YANGI' || holati === 'TAYINLANDI') && (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className={yorliq}>
              {holati === 'YANGI' ? tr('Ижрочини тайинлаш') : tr('Ижрочини алмаштириш')}
            </span>
            <select value={taklif} onChange={(e) => setTaklif(e.target.value)} className={`${MAYDON} min-h-11 text-sm`}>
              <option value="">{tr('— ижрочини танланг —')}</option>
              {takliflar.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.yorliq}
                </option>
              ))}
            </select>
          </label>
          {takliflar.length === 0 && (
            <p className="text-xs text-ink-faint">
              {tr('Тайинлаш мумкин ижрочи йўқ: хизмат таклифи фуқаро саҳифасида қўшилади ва розилик қайд этилиши шарт.')}
            </p>
          )}
          <button type="button" disabled={yuborilmoqda || !taklif} onClick={() => amal({ amal: 'tayinla', taklifId: taklif })} className={asosiy}>
            {spin}
            {tr('Тайинлаш')}
          </button>
        </div>
      )}

      {holati === 'TAYINLANDI' && (
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-xs text-ink-muted">
            {tr('Ижрочи:')} <b className="text-ink">{ijrochiNomi}</b>. {tr('Нарх ва шартлар келишилгач қайд этинг. 0 — бепул.')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className={yorliq}>{tr('Келишилган нарх (сўм)')} *</span>
              <input inputMode="numeric" value={narx} onChange={(e) => setNarx(e.target.value)} className={`${MAYDON} min-h-11 text-sm`} />
            </label>
            <label className="block space-y-1">
              <span className={yorliq}>{tr('Бажариш муддати (ихтиёрий)')}</span>
              <input type="date" min={bugun} value={muddat} onChange={(e) => setMuddat(e.target.value)} className={`${MAYDON} min-h-11 text-sm`} />
            </label>
          </div>
          <button
            type="button"
            disabled={yuborilmoqda || narx.trim() === '' || !Number.isFinite(Number(narx))}
            onClick={() => amal({ amal: 'kelish', narx: Number(narx), muddat: muddat ? sanaIso(muddat) : null })}
            className={asosiy}
          >
            {spin}
            {tr('Нарх келишилди')}
          </button>
        </div>
      )}

      {holati === 'KELISHILDI' && (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Иш қачон бажарилди')}</span>
            <input
              type="date"
              value={sana}
              min={kelishuvKuni ?? undefined}
              max={bugun}
              onChange={(e) => setSana(e.target.value)}
              className={`${MAYDON} min-h-11 text-sm`}
            />
          </label>
          <p className="text-xs text-ink-faint">
            {tr('«Бажарилди» — ходимнинг қайди. Муваффақиятли ҳисобланиши учун кейин ижрочи ВА буюртмачи тасдиқлаши керак.')}
          </p>
          <button type="button" disabled={yuborilmoqda || !sana} onClick={() => amal({ amal: 'bajarildi', sana: sanaIso(sana) })} className={asosiy}>
            {spin}
            {tr('Иш бажарилди')}
          </button>
        </div>
      )}

      {holati === 'BAJARILDI' && (
        <div className="space-y-2">
          <p className="text-xs text-ink-faint">
            {tr('Икки томоннинг ҳар бири алоҳида тасдиқлаши керак. Тасдиқланган жавоб кейин ўзгартирилмайди.')}
          </p>
          {tasdiqQatori('ijrochi', `${tr('Ижрочи')}${ijrochiNomi ? `: ${ijrochiNomi}` : ''}`, ijrochiTasdigi)}
          {tasdiqQatori('buyurtmachi', `${tr('Буюртмачи')}: ${buyurtmachiNomi}`, buyurtmachiTasdigi)}
        </div>
      )}

      {holati !== 'BAJARILDI' && (
        <div className="border-t border-line pt-3">
          {!bekorRejim ? (
            <button type="button" onClick={() => setBekorRejim(true)} className={tugma}>
              {tr('Буюртмани бекор қилиш')}
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block space-y-1">
                <span className={yorliq}>{tr('Бекор қилиш сабаби')} *</span>
                <input value={sabab} onChange={(e) => setSabab(e.target.value)} maxLength={300} className={`${MAYDON} min-h-11 text-sm`} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={yuborilmoqda || sabab.trim().length < 3}
                  onClick={() => amal({ amal: 'bekor', sabab: sabab.trim() })}
                  className={asosiy}
                >
                  {spin}
                  {tr('Бекор қилиш')}
                </button>
                <button type="button" onClick={() => setBekorRejim(false)} className={tugma}>
                  {tr('Ортга')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
