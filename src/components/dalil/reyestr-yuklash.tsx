'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  РЕЕСТР КЎЧИРМАСИНИ ЮКЛАШ
 *
 *  ── Икки қадам: аввал КЎРИШ, кейин ЁЗИШ ──
 *
 *  Биринчи босишда ҳеч нарса ёзилмайди: файл солиштирилади ва
 *  натижа кўрсатилади — нечтаси мос келди, нечтаси шубҳали,
 *  нечтаси топилмади.
 *
 *  Шундан КЕЙИН «Ёзиш» тугмаси чиқади.
 *
 *  Бир қадамда ёзиб юбориш хавфли: солиштириш Ф.И.Ш. бўйича
 *  кетади ва хато қилиши мумкин. Хато далил эса йўқ далилдан
 *  ЁМОНРОҚ — у рақамни тўғри кўрсатади, аслида эса ёлғон.
 * ============================================================
 */

interface Natija {
  jami: number;
  mos: number;
  boshqaIshJoyi: number;
  yangiTopilgan: { ishsizId: string; fish: string; holati: string }[];
  shubhali: { fish: string; nomzodlar: number }[];
  /**
   * Исм мос келди, аммо автоматик тасдиқлаш учун етарли эмас.
   *
   * Иккита сабаб АРАЛАШТИРИЛМАЙДИ: «сана қарама-қарши» —
   * катта эҳтимол билан БОШҚА одам; «сана етишмайди» —
   * билмаймиз, ва билмаган нарсани тасдиқлаб бўлмайди.
   */
  tekshirilsin: {
    fish: string;
    ishsizId: string;
    sabab: 'sana-qarama-qarshi' | 'sana-yetishmaydi';
    tizimSanasi: string | null;
    reyestrSanasi: string | null;
  }[];
  topilmadi: number;
  takror: number;
}

interface Javob {
  ok: boolean;
  yozildi?: boolean;
  /** Bu fayl avval yozilgan edi: takror yozilmadi, saqlangan natija */
  allaqachon?: boolean;
  xabar?: string;
  /** Server «ko'rish» ni shu yozuv bilan bog'lagan: «yozish» faqat shu bilan ishlaydi */
  yuklashId?: string;
  /** Faylning SHA-256 izi: faylning O'ZGARMAGANINI ko'rsatadi, haqiqiy ekanini emas */
  faylIzi?: string;
  oldingiYozilgan?: { id: string; sana: string | null } | null;
  yuklash?: { id: string; holati: string; jami: number | null; yozilgan: number; takror: number } | null;
  ustunlar?: { ism: string; ishJoyi: string | null; sana: string | null };
  natija?: Natija;
}

const BUGUN = () => {
  /* Toshkent kuni: UTC+5 */
  return new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
};

export function ReyestrYuklash() {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const faylRef = useRef<HTMLInputElement>(null);
  const [fayl, setFayl] = useState<File | null>(null);
  const [sana, setSana] = useState(() => BUGUN());
  const [manba, setManba] = useState('');
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const [javob, setJavob] = useState<Javob | null>(null);

  async function yubor(yoz: boolean) {
    if (!fayl) return;
    setBand(true);
    setXato(null);
    try {
      const forma = new FormData();
      forma.append('fayl', fayl);
      forma.append('sana', sana);
      forma.append('manba', manba);
      if (yoz) {
        /* Yozish faqat serverdagi «ko'rish» yozuvi bilan ishlaydi */
        if (!javob?.yuklashId) return;
        forma.append('yoz', '1');
        forma.append('yuklashId', javob.yuklashId);
      }

      const javobXom = await fetch('/api/reyestr', { method: 'POST', body: forma });
      const n: Javob = await javobXom.json();
      if (!javobXom.ok || !n.ok) {
        setXato(n.xabar ?? 'Yuklab boʻlmadi');
        /* Yozish uzilsa ko'rish natijasi QOLADI: xuddi shu bilan qayta bosilsa davom etadi */
        if (!yoz) setJavob(null);
        return;
      }
      setJavob(n);
      if (yoz) router.refresh();
    } catch {
      setXato('Tarmoq xatosi');
    } finally {
      setBand(false);
    }
  }

  const n = javob?.natija;

  return (
    <section className="karta space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <FileSpreadsheet className="h-4 w-4 text-accent" />
          {tr('Реестр кўчирмасини юклаш')}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">
          {tr('Excel ёки CSV. Устунлар сарлавҳа бўйича ўзи топилади: Ф.И.Ш., иш жойи, туғилган сана.')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          ref={faylRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            setFayl(e.target.files?.[0] ?? null);
            /* Boshqa fayl tanlandi: eski «ko'rish» unga tegishli emas */
            setJavob(null);
            setXato(null);
          }}
          className="maydon w-full text-sm"
        />
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          {tr('Кўчирма санаси')}
          <input
            type="date"
            value={sana}
            min="2020-01-01"
            max={BUGUN()}
            onChange={(e) => {
              setSana(e.target.value);
              /* Сана ўзгарса, кўриш ёзуви ярамайди — қайта кўриш керак */
              setJavob(null);
            }}
            className="maydon"
          />
        </label>
      </div>

      <label className="block text-xs text-ink-muted">
        {tr('Кўчирмани берган ташкилот (ихтиёрий)')}
        <input
          type="text"
          value={manba}
          maxLength={120}
          onChange={(e) => setManba(e.target.value)}
          className="maydon mt-1 w-full"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!fayl || band}
          onClick={() => yubor(false)}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {band ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {tr('Солиштириб кўриш')}
        </button>

        {/*
          «Ёзиш» тугмаси СОЛИШТИРГАНДАН КЕЙИН чиқади. Аввал
          чиқса, администратор натижани кўрмасдан босарди —
          ва икки қадамнинг маъноси қоларди.
        */}
        {javob && javob.yuklashId && !javob.yozildi && n && n.mos > 0 && (
          <button
            type="button"
            disabled={band}
            onClick={() => yubor(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast transition hover:opacity-90 disabled:opacity-50"
          >
            {band ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tr('Далилларни ёзиш')} ({n.mos - n.takror})
          </button>
        )}
      </div>

      {xato && <p className="text-sm text-danger">{tr(xato)}</p>}

      {javob?.ustunlar && (
        <p className="text-xs text-ink-faint">
          {tr('Устунлар')}: {javob.ustunlar.ism}
          {javob.ustunlar.ishJoyi ? ` · ${javob.ustunlar.ishJoyi}` : ''}
          {javob.ustunlar.sana ? ` · ${javob.ustunlar.sana}` : ''}
        </p>
      )}

      {javob?.faylIzi && (
        <p className="text-xs text-ink-faint">
          {tr('Файл изи')}: <span className="font-mono">{javob.faylIzi.slice(0, 12)}…</span>
          {javob.yuklashId ? (
            <>
              {' · '}
              {tr('Юклаш')}: <span className="font-mono">{javob.yuklashId.slice(-8)}</span>
            </>
          ) : null}
          {' — '}
          {tr('из файл ўзгармаганини кўрсатади, ҳақиқий эканини эмас')}
        </p>
      )}

      {javob?.oldingiYozilgan && !javob.yozildi && (
        <p className="text-xs text-warn">
          ⚠ {tr('Бу файл шу сана билан аввал ёзилган — қайта ёзилса, такрор далил яратилмайди.')}
        </p>
      )}

      {javob?.allaqachon && javob.yuklash && (
        <div className="rounded-md border border-line bg-surface-muted p-3 text-sm text-ink">
          {tr('Бу юклаш аввал ёзилган — такрор ёзилмади.')}{' '}
          {tr('Ёзилган далиллар')}: {javob.yuklash.yozilgan}
          {javob.yuklash.takror > 0 ? ` · ${tr('такрор')}: ${javob.yuklash.takror}` : ''}
        </div>
      )}

      {n && (
        <div className="space-y-3 rounded-md border border-line bg-surface-muted p-3">
          <p className="text-sm font-semibold text-ink">
            {javob?.yozildi ? tr('Ёзилди') : tr('Солиштириш натижаси')}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Raqam nomi={tr('Файлда сатр')} qiymat={n.jami} />
            <Raqam nomi={tr('Мос келди')} qiymat={n.mos} rang="text-ok" />
            <Raqam
              nomi={tr('Текширилсин')}
              qiymat={n.shubhali.length + n.tekshirilsin.length}
              rang="text-warn"
            />
            <Raqam nomi={tr('Топилмади')} qiymat={n.topilmadi} />
          </div>

          {n.takror > 0 && (
            <p className="text-xs text-ink-muted">
              {n.takror} {tr('таси бу сана билан аллақачон ёзилган — такрорланмади')}
            </p>
          )}

          {n.boshqaIshJoyi > 0 && (
            <p className="text-xs text-warn">
              ⚠ {n.boshqaIshJoyi}{' '}
              {tr('тасида реестрдаги иш жойи тизимдагидан фарқ қилади — фуқаро саҳифасида ёзиб қўйилди')}
            </p>
          )}

          {n.yangiTopilgan.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink">
                {tr('Реестрда бор, тизимда эса «иш кутяпти» деб турганлар')}:
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {tr('Ҳолати ЎЗГАРТИРИЛМАДИ — ҳар бирини кўриб чиқинг.')}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {n.yangiTopilgan.slice(0, 20).map((y) => (
                  <li key={y.ishsizId} className="text-xs text-ink-muted">
                    · {tr(y.fish)}
                  </li>
                ))}
              </ul>
              {n.yangiTopilgan.length > 20 && (
                <p className="mt-1 text-xs text-ink-faint">
                  … {tr('яна')} {n.yangiTopilgan.length - 20}
                </p>
              )}
            </div>
          )}

          {n.tekshirilsin.filter((t) => t.sabab === 'sana-qarama-qarshi').length > 0 && (
            <div className="rounded-md border border-danger bg-danger-bg p-2.5">
              <p className="text-xs font-semibold text-danger">
                {tr('Туғилган санаси МОС КЕЛМАДИ — тасдиқланмади')}:
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                {tr(
                  'Исм бир хил, сана бошқа. Катта эҳтимол билан бу БОШҚА одам. Ҳужжатдан текшириб, қўлда ҳал қилинг.'
                )}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {n.tekshirilsin
                  .filter((t) => t.sabab === 'sana-qarama-qarshi')
                  .slice(0, 15)
                  .map((t) => (
                    <li key={t.ishsizId} className="text-xs text-ink-muted">
                      · {tr(t.fish)} — {tr('тизимда')} {t.tizimSanasi ?? '—'}, {tr('реестрда')}{' '}
                      {t.reyestrSanasi ?? '—'}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {n.tekshirilsin.filter((t) => t.sabab === 'sana-yetishmaydi').length > 0 && (
            <div>
              <p className="text-xs font-semibold text-warn">
                {tr('Туғилган сана йўқ — солиштириб бўлмади')}:
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">
                {tr(
                  'Бир томонда сана умуман кўрсатилмаган. Бу «нотўғри» эмас, «билмаймиз» — шунинг учун автоматик тасдиқланмади.'
                )}
              </p>
              <ul className="mt-1 space-y-0.5">
                {n.tekshirilsin
                  .filter((t) => t.sabab === 'sana-yetishmaydi')
                  .slice(0, 15)
                  .map((t) => (
                    <li key={t.ishsizId} className="text-xs text-ink-muted">
                      · {tr(t.fish)}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {n.shubhali.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-warn">
                {tr('Бир хил исмли бир нечта фуқаро — ҳеч бири танланмади')}:
              </p>
              <ul className="mt-1 space-y-0.5">
                {n.shubhali.slice(0, 10).map((s) => (
                  <li key={s.fish} className="text-xs text-ink-muted">
                    · {tr(s.fish)} ({s.nomzodlar})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Raqam({ nomi, qiymat, rang }: { nomi: string; qiymat: number; rang?: string }) {
  return (
    <div>
      <p className={`text-xl font-bold tabular-nums ${rang ?? 'text-ink'}`}>
        {qiymat.toLocaleString('ru-RU')}
      </p>
      <p className="text-xs text-ink-faint">{nomi}</p>
    </div>
  );
}
