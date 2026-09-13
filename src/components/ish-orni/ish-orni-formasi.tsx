'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import { KASB_YONALISHI } from '@/lib/constants';

interface Mahalla {
  id: string;
  nomiKirill: string;
}

/**
 * Bo'sh ish o'rni qo'shish.
 *
 * `lavozim` erkin matn, ro'yxat emas. Sababi: mahalladagi korxonalar
 * juda xilma-xil ish o'rni beradi ("issiqxona ishchisi", "non
 * yopuvchi") va yopiq ro'yxat ularni sig'dira olmaydi.
 *
 * Moslashtirish baribir ishlaydi, chunki taqqoslash fonetik kalit
 * orqali bajariladi - "пайвандчи" va "payvandchi" bitta kalitga
 * tushadi.
 */
export function IshOrniFormasi({ mahallalar }: { mahallalar: Mahalla[] }) {
  const { t: tr } = useAlifbo();

  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [mahallaId, setMahallaId] = useState(mahallalar.length === 1 ? mahallalar[0].id : '');
  const [korxona, setKorxona] = useState('');
  const [lavozim, setLavozim] = useState('');
  const [yonalish, setYonalish] = useState('');
  const [orin, setOrin] = useState<number | ''>(1);
  const [maosh, setMaosh] = useState<number | ''>('');
  const [telefon, setTelefon] = useState('');
  const [talablar, setTalablar] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function yubor() {
    if (yuborilmoqda) return;
    if (!mahallaId) return setXato(tr('Маҳаллани танланг'));
    if (korxona.trim().length < 2) return setXato(tr('Корхона номини ёзинг'));
    if (lavozim.trim().length < 2) return setXato(tr('Лавозимни ёзинг'));

    setXato(null);
    setYuborilmoqda(true);

    try {
      const javob = await fetch('/api/ish-orinlari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mahallaId,
          korxonaNomi: korxona.trim(),
          lavozim: lavozim.trim(),
          yonalish: yonalish || null,
          ornlarSoni: orin === '' ? 1 : orin,
          maosh: maosh === '' ? null : maosh,
          telefon: telefon.trim() || null,
          talablar: talablar.trim() || null,
        }),
      });
      const natija = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(natija.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }

      setKorxona('');
      setLavozim('');
      setYonalish('');
      setOrin(1);
      setMaosh('');
      setTelefon('');
      setTalablar('');
      setOchiq(false);

      /*
       * Янги эълон яратилгач ЎША эълон саҳифасига ўтилади.
       *
       * Илгари форма фақат рўйхатни янгиларди ва ходим «энди
       * нима қилай?» деган саволда қоларди. Ҳолбуки жавоб
       * ўша саҳифада: тақсимот — қайси маҳаллаларда мос одам
       * бор ва кимга қўнғироқ қилиш керак.
       *
       * `id` қайтмаса (эски мижоз ёки кутилмаган жавоб) эски
       * хатти-ҳаракат сақланади — рўйхат янгиланади.
       */
      if (typeof natija?.id === 'string') {
        router.push(`/ish-orinlari/${natija.id}`);
        return;
      }
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  if (!ochiq) {
    return (
      <button
        type="button"
        onClick={() => setOchiq(true)}
        className="flex items-center gap-1.5 tugma-asosiy rounded-md px-4 py-2.5 text-sm font-semibold"
      >
        <Plus className="h-4 w-4" />
        {tr('Иш ўрни қўшиш')}
      </button>
    );
  }

  const maydon =
    'w-full rounded-md border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-accent';

  return (
    <div className="karta space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">{tr('Янги бўш иш ўрни')}</h3>
        <button
          type="button"
          onClick={() => setOchiq(false)}
          aria-label={tr("Ёпиш")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {xato && <div className="quti-xato">{xato}</div>}

      <div className="grid gap-3 sm:grid-cols-2">
        {mahallalar.length > 1 && (
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="v-mahalla" className="text-sm font-medium text-ink">
              {tr('Маҳалла')}
            </label>
            <select
              id="v-mahalla"
              value={mahallaId}
              onChange={(e) => setMahallaId(e.target.value)}
              className={maydon}
            >
              <option value="">{tr('— Танланг —')}</option>
              {mahallalar.map((m) => (
                <option key={m.id} value={m.id}>
                  {tr(m.nomiKirill)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="v-korxona" className="text-sm font-medium text-ink">
            {tr('Корхона номи')}
          </label>
          <input
            id="v-korxona"
            value={korxona}
            onChange={(e) => setKorxona(e.target.value)}
            className={maydon}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="v-lavozim" className="text-sm font-medium text-ink">
            {tr('Лавозим')}
          </label>
          <input
            id="v-lavozim"
            value={lavozim}
            onChange={(e) => setLavozim(e.target.value)}
            placeholder={tr("масалан: пайвандчи")}
            className={maydon}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="v-yonalish" className="text-sm font-medium text-ink">
            {tr('Йўналиш')}
          </label>
          <select
            id="v-yonalish"
            value={yonalish}
            onChange={(e) => setYonalish(e.target.value)}
            className={maydon}
          >
            <option value="">{tr('— Танланг —')}</option>
            {KASB_YONALISHI.map((y) => (
              <option key={y.qiymat} value={y.qiymat}>
                {y.kirill}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="v-orin" className="text-sm font-medium text-ink">
            {tr('Ўринлар сони')}
          </label>
          <input
            id="v-orin"
            type="number"
            min={1}
            inputMode="numeric"
            value={orin}
            onChange={(e) => setOrin(e.target.value === '' ? '' : Number(e.target.value))}
            className={`${maydon} raqam`}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="v-maosh" className="text-sm font-medium text-ink">
            {tr('Ойлик маош (сўм)')}
          </label>
          <input
            id="v-maosh"
            type="number"
            min={0}
            inputMode="numeric"
            value={maosh}
            onChange={(e) => setMaosh(e.target.value === '' ? '' : Number(e.target.value))}
            className={`${maydon} raqam`}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="v-tel" className="text-sm font-medium text-ink">
            {tr('Боғланиш телефони')}
          </label>
          <input
            id="v-tel"
            type="tel"
            inputMode="tel"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            className={maydon}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="v-talab" className="text-sm font-medium text-ink">
            {tr('Талаблар')}
          </label>
          <textarea
            id="v-talab"
            rows={2}
            value={talablar}
            onChange={(e) => setTalablar(e.target.value)}
            className={maydon}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={yubor}
        disabled={yuborilmoqda}
        className="flex items-center gap-1.5 tugma-asosiy rounded-md px-5 py-2.5 text-sm font-semibold"
      >
        {yuborilmoqda ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {tr('Қўшиш')}
      </button>
    </div>
  );
}
