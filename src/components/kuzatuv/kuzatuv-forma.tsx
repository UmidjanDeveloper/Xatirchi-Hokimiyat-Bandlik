'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { KuzatuvJavobi, MalumotDarajasi } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON, useSaqlanmaganOgohlantirish } from '@/components/reja/umumiy';
import { hozirgiKun } from '@/lib/sana-maydoni';
import {
  DARAJA_IZOHI,
  DARAJA_NOMI,
  JAVOB_NOMI,
  QAYTA_URINISH_KUNI,
  SAVOLLAR,
  type Bosqich,
  type SavolKaliti,
} from '@/lib/kuzatuv-nomlari';

export interface KuzatuvDalili {
  id: string;
  nomi: string;
}

type Javoblar = Record<SavolKaliti, KuzatuvJavobi>;

const BOSH_JAVOB: Javoblar = {
  ishBoshladi: 'NOMALUM',
  ishdaQolmoqda: 'NOMALUM',
  haqOlmoqda: 'NOMALUM',
  sharoitMos: 'NOMALUM',
  qoshimchaYordam: 'NOMALUM',
};

/** Manba tanlovi: "Маълум эмас" bu yerda yo'q - u javob bermaslikni bildiradi */
const MANBALAR: MalumotDarajasi[] = ['FUQARO_BILDIRGAN', 'XODIM_QAYD_ETGAN', 'TEKSHIRILGAN'];

/**
 * 30/60/90 kunlik tekshiruvni qayd etish.
 *
 * ── Formaning asosiy qoidasi ──
 *
 * Har savolning boshlang'ich javobi "Маълум эмас". Xodim uni qo'lda
 * "Ҳа" yoki "Йўқ" ga o'zgartirmaguncha hech narsa "bilingan" bo'lmaydi.
 * Bo'sh qoldirilgan daromad ham "0" emas, "маълум эмас" deb yoziladi.
 */
export function KuzatuvForma({
  joylashishId,
  kun,
  oldingiDaromad,
  dalillar,
  ishTugagan,
  mavjud = false,
}: {
  joylashishId: string;
  kun: Bosqich;
  /** Xatlovdagi oylik daromad (so'm) yoki bo'sh */
  oldingiDaromad: string;
  dalillar: KuzatuvDalili[];
  /** Ish allaqachon tugagan deb yozilganmi */
  ishTugagan: boolean;
  /** Bu bosqichga yozuv allaqachon bor - forma uni YANGIDAN to'ldirib almashtiradi */
  mavjud?: boolean;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [natija, setNatija] = useState<'MALUMOT_OLINDI' | 'BOGLANILMADI'>('MALUMOT_OLINDI');
  const [sana, setSana] = useState(hozirgiKun);
  const [manba, setManba] = useState<MalumotDarajasi>('FUQARO_BILDIRGAN');
  const [javob, setJavob] = useState<Javoblar>(BOSH_JAVOB);
  const [ishHaqi, setIshHaqi] = useState('');
  const [oilaDaromadi, setOilaDaromadi] = useState('');
  const [oldingi, setOldingi] = useState(oldingiDaromad);
  const [daromadManbasi, setDaromadManbasi] = useState<MalumotDarajasi>('FUQARO_BILDIRGAN');
  const [tugaganSana, setTugaganSana] = useState('');
  const [sabab, setSabab] = useState('');
  const [yordam, setYordam] = useState('');
  const [dalilId, setDalilId] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [ogoh, setOgoh] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  const ozgargan =
    ochiq &&
    (Object.values(javob).some((j) => j !== 'NOMALUM') ||
      ishHaqi !== '' ||
      oilaDaromadi !== '' ||
      sabab !== '' ||
      yordam !== '');
  useSaqlanmaganOgohlantirish(ozgargan);

  const daromadBor = ishHaqi.trim() !== '' || oilaDaromadi.trim() !== '';
  const dalilKerak =
    natija === 'MALUMOT_OLINDI' &&
    (manba === 'TEKSHIRILGAN' || (daromadBor && daromadManbasi === 'TEKSHIRILGAN'));

  async function yubor() {
    if (yuborilmoqda) return;
    setXato(null);
    setOgoh(null);
    setYuborilmoqda(true);
    try {
      const boglanilmadi = natija === 'BOGLANILMADI';
      const javob_ = await fetch('/api/kuzatuv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joylashishId,
          kunBelgisi: kun,
          natija,
          tekshiruvSanasi: new Date(`${sana}T12:00:00`).toISOString(),
          ...(boglanilmadi
            ? {}
            : {
                manba: Object.values(javob).some((j) => j !== 'NOMALUM') ? manba : 'NOMALUM',
                ...javob,
                ishHaqiSom: ishHaqi.trim() === '' ? null : ishHaqi,
                oilaDaromadiSom: oilaDaromadi.trim() === '' ? null : oilaDaromadi,
                oldingiDaromadSom: oldingi.trim() === '' ? null : oldingi,
                daromadManbasi: daromadBor ? daromadManbasi : 'NOMALUM',
                tugashSababi: javob.ishdaQolmoqda === 'YOQ' ? sabab.trim() || null : null,
                tugaganSana:
                  javob.ishdaQolmoqda === 'YOQ' && tugaganSana
                    ? new Date(`${tugaganSana}T12:00:00`).toISOString()
                    : null,
                yordamIzohi: yordam.trim() || null,
                dalilId: dalilKerak ? dalilId || null : null,
              }),
        }),
      });
      const d = await javob_.json().catch(() => ({}));
      if (!javob_.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      if (d.ogohlantirish) setOgoh(d.ogohlantirish);
      setOchiq(false);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Ёзув сақланмади — қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  if (!ochiq) {
    return (
      <div>
        {ogoh && (
          <p className="mb-2 text-xs text-warn" role="status">
            {ogoh}
          </p>
        )}
        <button
          type="button"
          onClick={() => setOchiq(true)}
          className="tugma-ikkilamchi min-h-11 rounded-md px-4 py-2 text-sm"
        >
          {mavjud ? tr(`${kun} кунлик ёзувни қайта тўлдириш`) : tr(`${kun} кунлик текширувни қайд этиш`)}
        </button>
      </div>
    );
  }

  const javobTanlovi = (kalit: SavolKaliti, savol: string) => (
    <fieldset key={kalit} className="space-y-1">
      <legend className="text-sm font-medium text-ink">{tr(savol)}</legend>
      <div className="flex flex-wrap gap-2">
        {(['HA', 'YOQ', 'NOMALUM'] as KuzatuvJavobi[]).map((j) => (
          <label
            key={j}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${
              javob[kalit] === j
                ? 'border-accent bg-accent-soft font-medium text-accent'
                : 'border-line bg-surface text-ink-muted'
            }`}
          >
            <input
              type="radio"
              name={`kz-${joylashishId}-${kun}-${kalit}`}
              checked={javob[kalit] === j}
              onChange={() => setJavob((x) => ({ ...x, [kalit]: j }))}
              className="h-4 w-4"
            />
            {tr(JAVOB_NOMI[j])}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="karta space-y-4 p-4">
      <h3 className="text-sm font-bold text-ink">{tr(`${kun} кунлик текширув`)}</h3>
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-ink">{tr('Натижа')}</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['MALUMOT_OLINDI', 'Маълумот олинди'],
              ['BOGLANILMADI', 'Боғланиб бўлмади'],
            ] as const
          ).map(([q, nom]) => (
            <label
              key={q}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${
                natija === q
                  ? 'border-accent bg-accent-soft font-medium text-accent'
                  : 'border-line bg-surface text-ink-muted'
              }`}
            >
              <input
                type="radio"
                name={`kz-${joylashishId}-${kun}-natija`}
                checked={natija === q}
                onChange={() => setNatija(q)}
                className="h-4 w-4"
              />
              {tr(nom)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor={`kz-sana-${kun}`} className="text-sm font-medium text-ink">
          {tr('Маълумот қачон олинди')}
        </label>
        <input
          id={`kz-sana-${kun}`}
          type="date"
          value={sana}
          max={hozirgiKun()}
          onChange={(e) => setSana(e.target.value)}
          className={MAYDON}
        />
      </div>

      {natija === 'BOGLANILMADI' ? (
        <p className="rounded-md bg-surface-muted p-3 text-xs text-ink-muted">
          {tr(
            `Бу «ишда қолди» ҳам, «кетди» ҳам эмас — маълумот йўқ деб ёзилади. Рўйхатга ${QAYTA_URINISH_KUNI} кундан кейин қайта чиқади.`
          )}
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <label htmlFor={`kz-manba-${kun}`} className="text-sm font-medium text-ink">
              {tr('Жавоблар қаердан олинди')}
            </label>
            <select
              id={`kz-manba-${kun}`}
              value={manba}
              onChange={(e) => setManba(e.target.value as MalumotDarajasi)}
              className={MAYDON}
            >
              {MANBALAR.map((m) => (
                <option key={m} value={m} disabled={m === 'TEKSHIRILGAN' && dalillar.length === 0}>
                  {tr(DARAJA_NOMI[m])} — {tr(DARAJA_IZOHI[m])}
                </option>
              ))}
            </select>
            {dalillar.length === 0 && (
              <p className="text-xs text-ink-faint">
                {tr('«Текширилган» учун аввал фуқарога тасдиқланган далил киритилиши керак.')}
              </p>
            )}
          </div>

          {SAVOLLAR.map((s) => javobTanlovi(s.kalit, s.savol))}

          {javob.ishdaQolmoqda === 'YOQ' && !ishTugagan && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor={`kz-tugash-${kun}`} className="text-sm font-medium text-ink">
                  {tr('Иш қачон тугади')}
                </label>
                <input
                  id={`kz-tugash-${kun}`}
                  type="date"
                  value={tugaganSana}
                  max={hozirgiKun()}
                  onChange={(e) => setTugaganSana(e.target.value)}
                  className={MAYDON}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`kz-sabab-${kun}`} className="text-sm font-medium text-ink">
                  {tr('Нега кетди')}
                </label>
                <input
                  id={`kz-sabab-${kun}`}
                  value={sabab}
                  onChange={(e) => setSabab(e.target.value)}
                  className={MAYDON}
                />
              </div>
            </div>
          )}

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink">{tr('Даромад (сўм, ойига)')}</legend>
            <p className="text-xs text-ink-faint">
              {tr('Бўш қолдирилса — «маълум эмас» деб ёзилади. Фақат ростдан 0 бўлса, 0 деб ёзинг.')}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor={`kz-haq-${kun}`} className="text-xs text-ink-muted">
                  {tr('Иш ҳақи')}
                </label>
                <input
                  id={`kz-haq-${kun}`}
                  inputMode="numeric"
                  value={ishHaqi}
                  onChange={(e) => setIshHaqi(e.target.value)}
                  className={MAYDON}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`kz-oila-${kun}`} className="text-xs text-ink-muted">
                  {tr('Оиланинг ҳозирги даромади')}
                </label>
                <input
                  id={`kz-oila-${kun}`}
                  inputMode="numeric"
                  value={oilaDaromadi}
                  onChange={(e) => setOilaDaromadi(e.target.value)}
                  className={MAYDON}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`kz-oldin-${kun}`} className="text-xs text-ink-muted">
                  {tr('Бошланғич (жойлашишдан олдин)')}
                </label>
                <input
                  id={`kz-oldin-${kun}`}
                  inputMode="numeric"
                  value={oldingi}
                  onChange={(e) => setOldingi(e.target.value)}
                  className={MAYDON}
                />
              </div>
            </div>
            {daromadBor && (
              <div className="space-y-1.5">
                <label htmlFor={`kz-dman-${kun}`} className="text-xs text-ink-muted">
                  {tr('Даромад рақамлари қаердан')}
                </label>
                <select
                  id={`kz-dman-${kun}`}
                  value={daromadManbasi}
                  onChange={(e) => setDaromadManbasi(e.target.value as MalumotDarajasi)}
                  className={MAYDON}
                >
                  {MANBALAR.map((m) => (
                    <option key={m} value={m} disabled={m === 'TEKSHIRILGAN' && dalillar.length === 0}>
                      {tr(DARAJA_NOMI[m])}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </fieldset>

          {dalilKerak && (
            <div className="space-y-1.5">
              <label htmlFor={`kz-dalil-${kun}`} className="text-sm font-medium text-ink">
                {tr('Тасдиқловчи далил')}
              </label>
              <select
                id={`kz-dalil-${kun}`}
                value={dalilId}
                onChange={(e) => setDalilId(e.target.value)}
                className={MAYDON}
              >
                <option value="">{tr('— Танланг —')}</option>
                {dalillar.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nomi}
                  </option>
                ))}
              </select>
            </div>
          )}

          {javob.qoshimchaYordam === 'HA' && (
            <div className="space-y-1.5">
              <label htmlFor={`kz-yordam-${kun}`} className="text-sm font-medium text-ink">
                {tr('Қандай қўшимча ёрдам керак')}
              </label>
              <textarea
                id={`kz-yordam-${kun}`}
                rows={2}
                value={yordam}
                onChange={(e) => setYordam(e.target.value)}
                className={MAYDON}
              />
            </div>
          )}
        </>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={yubor}
          disabled={yuborilmoqda}
          className="tugma-asosiy flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold"
        >
          {yuborilmoqda && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {tr('Қайд этиш')}
        </button>
        <button
          type="button"
          onClick={() => setOchiq(false)}
          className="tugma-ikkilamchi rounded-md px-4 py-2.5 text-sm"
        >
          {tr('Бекор қилиш')}
        </button>
      </div>
    </div>
  );
}
