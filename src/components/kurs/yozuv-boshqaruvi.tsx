'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { KursYozuvHolati } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from '@/components/reja/umumiy';

/** Sana maydonini (YYYY-MM-DD) tushki 12:00 ga o'tkazadi: vaqt mintaqasi kunni siljitmasin */
const sanaIso = (s: string) => new Date(`${s}T12:00:00`).toISOString();

const sonOqi = (s: string): number | undefined => {
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

const royxatOqi = (s: string) =>
  s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

type Rejim = null | 'boshladi' | 'kelmadi' | 'tamomladi' | 'tashladi' | 'natija';
type Uchhol = '' | 'ha' | 'yoq';

export interface MumkinIsh {
  id: string;
  nom: string;
  /** YYYY-MM-DD */
  kun: string;
}

export interface YozuvBoshqaruviProps {
  id: string;
  holati: KursYozuvHolati;
  /** Kurs boshlangan (bugun >= boshlanish kuni) */
  kursBoshlandi: boolean;
  /** "Kelmadi" faqat boshlanish kunidan KEYIN belgilanadi */
  kelmadiMumkin: boolean;
  kursBoshKun: string;
  kursTugKun: string;
  bugun: string;
  jamiDarsKuni: number | null;
  boshlaganKun: string | null;
  kursKonikmalar: string[];
  /** TAMOMLADI uchun joriy qiymatlar */
  sertifikat: boolean | null;
  olinganKonikmalar: string[];
  suhbatKun: string | null;
  joylashishId: string | null;
  mumkinIshlar: MumkinIsh[];
}

/**
 * Bitta kurs yozuvi ustidagi amallar. Har amal serverda yana tekshiriladi
 * (holat o'tishlari, sanalar, mahalla huquqi); bu yerdagi cheklovlar faqat
 * xodimga qulaylik uchun.
 *
 * Bo'sh qoldirilgan davomat va sertifikat "noma'lum" bo'lib qoladi:
 * hech qachon 0 yoki "yo'q" deb yuborilmaydi.
 */
export function YozuvBoshqaruvi(p: YozuvBoshqaruviProps) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [rejim, setRejim] = useState<Rejim>(null);
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  const [sana, setSana] = useState('');
  const [kunlar, setKunlar] = useState('');
  const [sertifikat, setSertifikat] = useState<Uchhol>(p.sertifikat === null ? '' : p.sertifikat ? 'ha' : 'yoq');
  const [konikmalar, setKonikmalar] = useState(p.olinganKonikmalar.join(', '));
  const [izoh, setIzoh] = useState('');
  const [suhbat, setSuhbat] = useState(p.suhbatKun ?? '');
  const [ish, setIsh] = useState(p.joylashishId ?? '');

  async function amal(tana: Record<string, unknown>) {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/kurs-yozuvlari/${p.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setRejim(null);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  function och(r: Rejim) {
    setXato(null);
    setRejim(r);
    if (r === 'boshladi') setSana(p.kursBoshKun <= p.bugun ? p.kursBoshKun : p.bugun);
    if (r === 'tamomladi') setSana(p.kursTugKun <= p.bugun ? p.kursTugKun : p.bugun);
    if (r === 'tashladi') setSana(p.bugun);
  }

  const tugma = 'tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium';
  const asosiy = 'tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold';
  const yorliq = 'text-xs font-medium text-ink-muted';

  /** Eng erta mumkin bo'lgan sana: o'qish boshlangan kun yoki kurs boshlanishi */
  const minSana = p.boshlaganKun && p.boshlaganKun > p.kursBoshKun ? p.boshlaganKun : p.kursBoshKun;

  const yuborTugma = (nom: string, tana: Record<string, unknown>, ruxsat = true) => (
    <button type="button" disabled={yuborilmoqda || !ruxsat} onClick={() => amal(tana)} className={asosiy}>
      {yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      {tr(nom)}
    </button>
  );

  const sertifikatMaydoni = (
    <label className="block space-y-1">
      <span className={yorliq}>{tr('Гувоҳнома / сертификат олдими')}</span>
      <select value={sertifikat} onChange={(e) => setSertifikat(e.target.value as Uchhol)} className={`${MAYDON} min-h-11 text-sm`}>
        <option value="">{tr('Маълум эмас')}</option>
        <option value="ha">{tr('Ҳа, олди')}</option>
        <option value="yoq">{tr('Йўқ, олмади')}</option>
      </select>
    </label>
  );

  const konikmaMaydoni = (
    <div className="space-y-1">
      <label className="block space-y-1">
        <span className={yorliq}>{tr('Ҳақиқатда ўзлаштирган кўникмалари (ўқитувчидан билиб ёзилади)')}</span>
        <input
          value={konikmalar}
          onChange={(e) => setKonikmalar(e.target.value)}
          placeholder={tr('вергул билан; билмасангиз — бўш қолдиринг')}
          className={`${MAYDON} min-h-11 text-sm`}
        />
      </label>
      {p.kursKonikmalar.length > 0 && (
        <button type="button" onClick={() => setKonikmalar(p.kursKonikmalar.join(', '))} className="text-[11px] text-ink-faint underline hover:text-accent">
          {tr('Курс ўргатадиган ҳамма кўникма ўзлаштирилган')}
        </button>
      )}
    </div>
  );

  const kunMaydoni = (
    <label className="block space-y-1">
      <span className={yorliq}>
        {tr('Қатнашган дарс кунлари')}
        {p.jamiDarsKuni !== null && ` (${tr('жами')} ${p.jamiDarsKuni})`}
      </span>
      <input
        inputMode="numeric"
        value={kunlar}
        onChange={(e) => setKunlar(e.target.value)}
        placeholder={tr('билмасангиз — бўш қолдиринг')}
        className={`${MAYDON} min-h-11 text-sm`}
      />
    </label>
  );

  const sanaMaydoni = (nom: string) => (
    <label className="block space-y-1">
      <span className={yorliq}>{tr(nom)}</span>
      <input type="date" value={sana} min={minSana} max={p.bugun} onChange={(e) => setSana(e.target.value)} className={`${MAYDON} min-h-11 text-sm`} />
    </label>
  );

  const bekorTugma = rejim !== null && (
    <button type="button" onClick={() => setRejim(null)} className={tugma}>
      {tr('Ортга')}
    </button>
  );

  return (
    <div className="mt-2 space-y-2">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {rejim === null && (
        <div className="flex flex-wrap gap-2">
          {p.holati === 'YOLLANDI' && (
            <>
              {p.kursBoshlandi && (
                <button type="button" onClick={() => och('boshladi')} className={tugma}>
                  {tr('Ўқишни бошлади')}
                </button>
              )}
              {p.kursBoshlandi && (
                <button type="button" onClick={() => och('tamomladi')} className={tugma}>
                  {tr('Тамомлади')}
                </button>
              )}
              {p.kursBoshlandi && (
                <button type="button" onClick={() => och('tashladi')} className={tugma}>
                  {tr('Ташлаб кетди')}
                </button>
              )}
              {p.kelmadiMumkin && (
                <button type="button" onClick={() => och('kelmadi')} className={tugma}>
                  {tr('Дарсга келмади')}
                </button>
              )}
              <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'bekor' })} className={tugma}>
                {tr('Ёзувни бекор қилиш')}
              </button>
            </>
          )}
          {p.holati === 'BOSHLADI' && (
            <>
              <button type="button" onClick={() => och('tamomladi')} className={tugma}>
                {tr('Тамомлади')}
              </button>
              <button type="button" onClick={() => och('tashladi')} className={tugma}>
                {tr('Ташлаб кетди')}
              </button>
            </>
          )}
          {p.holati === 'TAMOMLADI' && (
            <button type="button" onClick={() => och('natija')} className={tugma}>
              {tr('Суҳбат ва иш натижасини қайд этиш')}
            </button>
          )}
          {p.holati === 'BEKOR' && (
            <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'tiklash' })} className={tugma}>
              {tr('Ёзувни тиклаш')}
            </button>
          )}
        </div>
      )}

      {rejim === 'boshladi' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          {sanaMaydoni('Ўқиш қачон бошланган')}
          <div className="flex flex-wrap gap-2">
            {yuborTugma('Сақлаш', { amal: 'boshladi', sana: sana ? sanaIso(sana) : '' }, !!sana)}
            {bekorTugma}
          </div>
        </div>
      )}

      {rejim === 'kelmadi' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <p className="text-xs text-ink-muted">
            {tr('Бу якуний ҳолат: кейин ўзгартириб бўлмайди. Фуқаро дарсга умуман келмаганига ишонч ҳосил қилинг.')}
          </p>
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Сабаб ёки изоҳ')}</span>
            <input value={izoh} onChange={(e) => setIzoh(e.target.value)} maxLength={300} className={`${MAYDON} min-h-11 text-sm`} />
          </label>
          <div className="flex flex-wrap gap-2">
            {yuborTugma('Дарсга келмади деб белгилаш', { amal: 'kelmadi', izoh: izoh.trim() || null })}
            {bekorTugma}
          </div>
        </div>
      )}

      {rejim === 'tashladi' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <p className="text-xs text-ink-muted">{tr('Бу якуний ҳолат: кейин ўзгартириб бўлмайди.')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sanaMaydoni('Қачон ташлаб кетди')}
            {kunMaydoni}
          </div>
          <label className="block space-y-1">
            <span className={yorliq}>{tr('Сабаби (билсангиз)')}</span>
            <input value={izoh} onChange={(e) => setIzoh(e.target.value)} maxLength={300} className={`${MAYDON} min-h-11 text-sm`} />
          </label>
          <div className="flex flex-wrap gap-2">
            {yuborTugma(
              'Сақлаш',
              {
                amal: 'tashladi',
                sana: sana ? sanaIso(sana) : '',
                qatnashganKun: sonOqi(kunlar),
                izoh: izoh.trim() || null,
              },
              !!sana
            )}
            {bekorTugma}
          </div>
        </div>
      )}

      {rejim === 'tamomladi' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {sanaMaydoni('Қачон тамомлади')}
            {kunMaydoni}
            {sertifikatMaydoni}
          </div>
          {konikmaMaydoni}
          <div className="flex flex-wrap gap-2">
            {yuborTugma(
              'Сақлаш',
              {
                amal: 'tamomladi',
                sana: sana ? sanaIso(sana) : '',
                qatnashganKun: sonOqi(kunlar),
                sertifikat: sertifikat === '' ? undefined : sertifikat === 'ha',
                olinganKonikmalar: royxatOqi(konikmalar),
              },
              !!sana
            )}
            {bekorTugma}
          </div>
        </div>
      )}

      {rejim === 'natija' && (
        <div className="space-y-2 rounded-md border border-line p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className={yorliq}>{tr('Курсдан кейинги иш суҳбати санаси')}</span>
              <input type="date" value={suhbat} onChange={(e) => setSuhbat(e.target.value)} className={`${MAYDON} min-h-11 text-sm`} />
            </label>
            <label className="block space-y-1">
              <span className={yorliq}>{tr('Курсдан кейин бошланган иш')}</span>
              <select value={ish} onChange={(e) => setIsh(e.target.value)} className={`${MAYDON} min-h-11 text-sm`}>
                <option value="">{tr('— боғланмаган (иш қайд этилмаган) —')}</option>
                {p.mumkinIshlar.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nom} · {i.kun}
                  </option>
                ))}
              </select>
            </label>
            {sertifikatMaydoni}
          </div>
          {p.mumkinIshlar.length === 0 && (
            <p className="text-xs text-ink-faint">
              {tr('Курсдан кейин бошланган иш йўқ. Иш топган бўлса, аввал фуқаро саҳифасида «Ишга жойлашиш»ни қайд этинг, кейин бу ерда боғланг.')}
            </p>
          )}
          {konikmaMaydoni}
          <div className="flex flex-wrap gap-2">
            {yuborTugma('Сақлаш', {
              amal: 'toldirish',
              suhbatSanasi: suhbat ? sanaIso(suhbat) : null,
              joylashishId: ish || null,
              sertifikat: sertifikat === '' ? null : sertifikat === 'ha',
              olinganKonikmalar: royxatOqi(konikmalar),
            })}
            {bekorTugma}
          </div>
        </div>
      )}
    </div>
  );
}
