'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Loader2,
  Save,
  Send,
} from 'lucide-react';
import { ismTekshir, telefonTekshir } from '@/lib/inson-tekshiruvi';
import {
  xatlovTekshir,
  yuborishgaTayyormi,
  type XatlovRaqamlari,
} from '@/lib/xatlov-tekshiruvi';
import { navbatgaQosh, qoralamaOchir, qoralamaOqi, qoralamaSaqla } from '@/lib/offline';
import { bosHolat, yuborishUchun, type XatlovHolati } from './holat';
import { QADAMLAR } from './qadamlar';

interface Mahalla {
  id: string;
  nomi: string;
  nomiKirill: string;
}

interface Props {
  mahallalar: Mahalla[];
  /** Tahrirlanayotgan xatlov - yangi bo'lsa `null` */
  boshlangich?: { id: string; holat: XatlovHolati } | null;
}

/** Brauzer xotirasidagi qoralama kaliti */
const QORALAMA_ID = 'joriy-xatlov';

/**
 * Брауzer хотирасидаги қоралама.
 *
 * ── Нега `id` ҲАМ сақланади ──
 *
 * Илгари фақат форма ҳолати сақланарди. «Қоралама» тугмаси
 * серверга ёзиб, ўша ёзувнинг `id` сини қайтарарди — аммо у
 * хотирага тушмасди. Ходим «Янги хатлов» ни очганда эски
 * ҳолат тикланар, `id` эса НОЛ бўларди: «Юбориш» босилганда
 * тизим ИККИНЧИ хонадон яратарди. Бир оила базада икки марта
 * пайдо бўларди.
 *
 * Энди `id` ҳам ёзилади ва «Давом эттириш» айнан ўша ёзувни
 * янгилайди.
 */
interface Qoralama {
  id: string | null;
  holat: XatlovHolati;
}

/**
 * Эски шакл билан ҳам ишлайди.
 *
 * Дала телефонларида ҲОЗИР тўлдирилаётган қораламалар бор ва
 * улар эски шаклда — тўғридан-тўғри `XatlovHolati`. Янги код
 * уларни ташлаб юбормаслиги керак.
 */
function qoralamaniOqi(): Qoralama | null {
  const xom = qoralamaOqi<Qoralama | XatlovHolati>(QORALAMA_ID);
  if (!xom) return null;
  if (typeof xom === 'object' && 'holat' in xom && xom.holat) {
    return xom as Qoralama;
  }
  return { id: null, holat: xom as XatlovHolati };
}

/** Қораламада ҳақиқий маълумот борми — бўш форма тикланмасин */
function qoralamaTolami(q: Qoralama | null): boolean {
  return Boolean(q && (q.holat?.manzil || q.holat?.oilaBoshligi));
}

export function XatlovFormasi({ mahallalar, boshlangich }: Props) {
  const { t: tr } = useAlifbo();

  const router = useRouter();

  const [id, setId] = useState<string | null>(boshlangich?.id ?? null);
  const [qadam, setQadam] = useState(0);
  const [h, setH] = useState<XatlovHolati>(
    boshlangich?.holat ?? bosHolat(mahallalar.length === 1 ? mahallalar[0].id : '')
  );

  const [xatolar, setXatolar] = useState<Record<string, string>>({});
  const [serverXatosi, setServerXatosi] = useState<string | null>(null);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [oxirgiSaqlash, setOxirgiSaqlash] = useState<Date | null>(null);
  const [xotiraXatosi, setXotiraXatosi] = useState(false);
  const [onlayn, setOnlayn] = useState(true);

  // ── Aloqa holati ──
  useEffect(() => {
    const yangila = () => setOnlayn(navigator.onLine);
    yangila();
    window.addEventListener('online', yangila);
    window.addEventListener('offline', yangila);
    return () => {
      window.removeEventListener('online', yangila);
      window.removeEventListener('offline', yangila);
    };
  }, []);

  /*
    ── ТУГАЛЛАНМАГАН ҚОРАЛАМА ──

    Илгари у ЖИМГИНА тикланарди. Натижа: ходим «Қоралама» ни
    босиб, кейин «Янги хатлов» ни очса, олдинги хонадоннинг
    маълумоти ўз-ўзидан қайтиб келарди — ва у буни кеч пайқаб,
    янги оиланинг рақамларини эскисининг устига ёзиб юборарди.

    Энди ҳеч нима ўз-ўзидан тикланмайди. Юқорида қути чиқади:
    манзили ва вақти кўрсатилган ҳолда «Давом эттириш» ёки
    «Янгидан бошлаш». Танловни ХОДИМ қилади.
  */
  const [kutayotganQoralama, setKutayotganQoralama] = useState<Qoralama | null>(null);
  const tiklandi = useRef(false);
  useEffect(() => {
    if (boshlangich || tiklandi.current) return;
    tiklandi.current = true;

    const saqlangan = qoralamaniOqi();
    if (qoralamaTolami(saqlangan)) setKutayotganQoralama(saqlangan);
  }, [boshlangich]);

  /*
    Ходим танламагунича хотирага ЁЗМАЙМИЗ — акс ҳолда бўш
    янги форма эски қораламани ўчириб юборарди.
  */
  const qoralamaKutmoqda = kutayotganQoralama !== null;

  // ── Har o'zgarishda brauzer xotirasiga yozish ──
  //
  // Server bilan aloqa yo'q bo'lsa ham xodim to'ldirgani yo'qolmaydi.
  useEffect(() => {
    if (qoralamaKutmoqda) return;
    if (!h.manzil && !h.oilaBoshligi) return;
    const ok = qoralamaSaqla(QORALAMA_ID, { id, holat: h } satisfies Qoralama);
    setXotiraXatosi(!ok);
  }, [h, id, qoralamaKutmoqda]);

  const yangila = useCallback(
    <K extends keyof XatlovHolati>(kalit: K, qiymat: XatlovHolati[K]) => {
      setH((oldingi) => ({ ...oldingi, [kalit]: qiymat }));
      // Maydon tuzatilganda xatoni darhol olib tashlaymiz
      setXatolar((oldingi) => {
        if (!oldingi[kalit as string]) return oldingi;
        const yangi = { ...oldingi };
        delete yangi[kalit as string];
        return yangi;
      });
    },
    []
  );

  /**
   * Хато устига босилганда — ўша катакка олиб боради.
   *
   * Икки иш қилади: керакли қадамни очади ва катакни қизил
   * билан белгилайди. Белги кейинги ўзгаришда ўзи ўчади
   * (`yangila` шуни қилади).
   */
  const xatogaOt = useCallback((maydon: string, xabar: string) => {
    setXatolar((oldingi) => ({ ...oldingi, [maydon]: xabar }));
    setQadam(xatoQadami({ [maydon]: xabar }));
    /* Саҳифа тепасига қайтарамиз — катак кўринсин */
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Jonli arifmetika tekshiruvi ──
  //
  // Xodim raqamni kiritayotganda darhol ko'radi, "Yuborish" tugmasini
  // bosgunicha kutmaydi. Bu xonadon oldida turib tuzatish imkonini beradi.
  const hisobot = useMemo(() => xatlovTekshir(sonlar(h)), [h]);

  // ── Saqlash (qoralama) ──
  async function qoralamaYubor() {
    if (saqlanmoqda || yuborilmoqda) return;

    const asosiy = asosiyMaydonlarniTekshir(h);
    if (Object.keys(asosiy).length > 0) {
      setXatolar(asosiy);
      setQadam(0);
      return;
    }

    setSaqlanmoqda(true);
    setServerXatosi(null);

    try {
      const javob = await fetch('/api/xatlov', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turi: 'qoralama', id, malumot: yuborishUchun(h).xonadon }),
      });
      const natija = await javob.json().catch(() => ({}));

      if (!javob.ok) {
        /*
          ── ХАТО ҚАЙСИ КАТАКДА ЭКАНИ КЎРСАТИЛАДИ ──

          Илгари бу ерда фақат қизил ёзув чиқарди: «Маълумот
          нотўғри». Саккиз қадамли анкетада ходим қайси
          катакни тузатишни ўзи қидириши керак эди — топа
          олмасди ва хатловни ташлаб кетарди.

          Якуний юборишда бу аллақачон тўғри ишларди; қоралама
          сақлашда эса тушиб қолган экан.
        */
        if (Array.isArray(natija.xatolar)) {
          const xt: Record<string, string> = {};
          for (const n of natija.xatolar) xt[n.maydon] = n.xabar;
          setXatolar(xt);
          setQadam(xatoQadami(xt));
        }
        setServerXatosi(natija.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }

      setId(natija.id);
      setOxirgiSaqlash(new Date());
    } catch {
      setServerXatosi(
        tr('Алоқа йўқ. Маълумот телефон хотирасида сақланиб турибди — алоқа тикланганда қайта уриниб кўринг.')
      );
    } finally {
      setSaqlanmoqda(false);
    }
  }

  // ── Yakuniy yuborish ──
  async function yakuniyYubor() {
    if (saqlanmoqda || yuborilmoqda) return;

    const toplangan = toliqTekshir(h);
    if (Object.keys(toplangan).length > 0) {
      setXatolar(toplangan);
      // Xato qaysi qadamda bo'lsa - o'shanga o'tamiz
      setQadam(xatoQadami(toplangan));
      return;
    }

    setYuborilmoqda(true);
    setServerXatosi(null);

    try {
      const javob = await fetch('/api/xatlov', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turi: 'yakuniy', id, malumot: yuborishUchun(h) }),
      });
      const natija = await javob.json().catch(() => ({}));

      if (!javob.ok) {
        if (Array.isArray(natija.xatolar)) {
          const xt: Record<string, string> = {};
          for (const n of natija.xatolar) xt[n.maydon] = n.xabar;
          setXatolar(xt);
          setQadam(xatoQadami(xt));
        }
        setServerXatosi(natija.xabar ?? tr('Юбориб бўлмади'));
        return;
      }

      // Yuborilgandan keyin brauzer xotirasidagi qoralama keraksiz
      qoralamaOchir(QORALAMA_ID);
      router.push(`/xatlov/${natija.id}?yangi=1`);
      router.refresh();
    } catch {
      /*
       * Aloqa uzildi. Ilgari xodimga "keyin qayta yuboring" deb
       * yozilardi va qayta yuborishni u ESLAB QOLISHI kerak
       * bo'lardi: anketani qayta ochib, oxirigacha o'tib, yana
       * tugmani bosish. Kun oxirida, o'nta xonadondan keyin,
       * buni hech kim eslamaydi.
       *
       * Endi tayyor xatlov NAVBATGA tushadi va aloqa tiklanishi
       * bilan o'zi ketadi. Qoralama `id` si ham birga boradi -
       * busiz navbat yangi yozuv yaratishga urinardi.
       */
      const navbat = navbatgaQosh({ turi: 'yakuniy', id, malumot: yuborishUchun(h) });

      setServerXatosi(
        navbat.ok
          ? tr('Алоқа йўқ. Хатлов навбатга қўйилди — алоқа тикланиши билан ўзи юборилади. Телефонни ўчирсангиз ҳам йўқолмайди.')
          : navbat.sabab === 'navbat-toldi'
            ? tr('Алоқа йўқ ва навбат тўлган. Администраторга мурожаат қилинг — маълумот юборилмай турибди.')
            : tr('Алоқа йўқ ва телефон хотирасига ёзиб бўлмади. Браузер хотирасини бўшатиб, қайта уриниб кўринг.')
      );
    } finally {
      setYuborilmoqda(false);
    }
  }

  const Joriy = QADAMLAR[qadam].komponent;
  const oxirgi = qadam === QADAMLAR.length - 1;

  return (
    <div className="space-y-4">
      {/* ── Qadamlar ko'rsatkichi ── */}
      <div className="karta p-3 sm:p-4">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">
            {qadam + 1}-{tr('қадам')}: {tr(QADAMLAR[qadam].nomi)}
          </span>
          <span className="raqam shrink-0 text-xs text-ink-faint">
            {qadam + 1} / {QADAMLAR.length}
          </span>
        </div>
        <div
          className="flex gap-1"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={QADAMLAR.length}
          aria-valuenow={qadam + 1}
          aria-label={tr("Анкета қадамлари")}
        >
          {QADAMLAR.map((q, i) => (
            <button
              key={q.nomi}
              type="button"
              onClick={() => setQadam(i)}
              aria-label={tr(`${i + 1}-қадам: ${q.nomi}`)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= qadam ? 'bg-accent' : 'bg-line'
              }`}
            />
          ))}
        </div>
      </div>

      {/*
        ── ТУГАЛЛАНМАГАН ҚОРАЛАМА: ТАНЛОВ ──

        Энг тепада, чунки ходим формани тўлдиришдан ОЛДИН
        қарор қабул қилиши керак. Манзил ва вақт кўрсатилган:
        «бу қайси хонадон эди» деган савол шу ерда ҳал бўлади.
      */}
      {kutayotganQoralama && (
        <div className="quti-ogoh space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">{tr('Тугалланмаган хатлов бор')}</p>
              <p className="mt-1 leading-relaxed">
                {tr('Бу телефонда охиригача юборилмаган анкета қолган:')}{' '}
                <span className="font-medium">
                  {tr(kutayotganQoralama.holat.oilaBoshligi || tr('исми ёзилмаган'))}
                </span>
                {kutayotganQoralama.holat.manzil ? ` · ${tr(kutayotganQoralama.holat.manzil)}` : ''}
                {'. '}
                {tr('Давом эттирасизми, ёки янги хонадондан бошлайсизми?')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setH(kutayotganQoralama.holat);
                setId(kutayotganQoralama.id);
                setKutayotganQoralama(null);
              }}
              className="tugma-asosiy rounded-md px-3.5 py-2 text-xs font-semibold"
            >
              {tr('Тугалланмаганини давом эттириш')}
            </button>
            <button
              type="button"
              onClick={() => {
                /*
                  Эскисини ўчирамиз. Агар у серверга ҳам
                  сақланган бўлса, «Хатловларим» рўйхатида
                  турибди — йўқолмайди.
                */
                qoralamaOchir(QORALAMA_ID);
                setKutayotganQoralama(null);
              }}
              className="rounded-md border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              {tr('Янги хонадондан бошлаш')}
            </button>
          </div>
        </div>
      )}

      {/* ── Holat xabarlari ── */}
      {!onlayn && (
        <div className="quti-ogoh flex items-start gap-2">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {tr('Интернет алоқаси йўқ. Тўлдирганингиз телефон хотирасида сақланмоқда — алоқа тикланганда юборинг.')}
          </span>
        </div>
      )}

      {xotiraXatosi && (
        <div className="quti-xato flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {tr('Телефон хотираси тўлган — қоралама сақланмаяпти. Анкетани тугатиб, дарҳол юборинг, акс ҳолда маълумот йўқолади.')}
          </span>
        </div>
      )}

      {serverXatosi && <div className="quti-xato">{tr(serverXatosi)}</div>}

      {/*
        ── ХАТО УСТИГА БОСИБ ЎША КАТАККА ЎТИШ ──

        Бу рўйхат ҲАР ҚАДАМДА кўринади, чунки текширув бутун
        анкета бўйича ишлайди. Аммо хато кўпинча БОШҚА қадамда
        бўлади: ходим 5-қадамда турибди, номувофиқлик эса
        2-қадамдаги катакда.

        Илгари бу ўлик матн эди. Ходим саккиз қадамни бирма-бир
        очиб, қайси катак эканини ўзи қидириши керак эди — ва
        топа олмай, хатловни ташлаб кетарди.

        Энди ҳар қатор — тугма: босилса, ўша қадам очилади ва
        катак қизил билан белгиланади.
      */}
      {hisobot.xatolar.length > 0 && (
        <div className="quti-xato space-y-1.5">
          <p className="font-semibold">{tr('Рақамларда номувофиқлик:')}</p>
          <ul className="space-y-1">
            {hisobot.xatolar.map((n, i) => (
              <li key={i}>
                <XatoQatori nuqson={n} tr={tr} otish={xatogaOt} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {hisobot.xatolar.length === 0 && hisobot.ogohlantirishlar.length > 0 && (
        <div className="quti-ogoh space-y-1.5">
          <p className="font-semibold">{tr('Эътибор беринг:')}</p>
          <ul className="space-y-1">
            {hisobot.ogohlantirishlar.map((n, i) => (
              <li key={i}>
                <XatoQatori nuqson={n} tr={tr} otish={xatogaOt} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Mahalla tanlash (bir nechta bo'lsa) ── */}
      {qadam === 0 && mahallalar.length > 1 && (
        <div className="karta space-y-1.5 p-4 sm:p-5">
          <label htmlFor="mahalla" className="block text-sm font-medium text-ink">
            {tr('Маҳалла фуқаролар йиғини')}<span className="ml-0.5 text-danger">*</span>
          </label>
          <select
            id="mahalla"
            value={h.mahallaId}
            onChange={(e) => yangila('mahallaId', e.target.value)}
            className={`w-full rounded-md border bg-surface px-3 py-2.5 text-ink outline-none focus:border-accent ${
              xatolar.mahallaId ? 'maydon-xato' : 'border-line'
            }`}
          >
            <option value="">{tr('— Маҳаллани танланг —')}</option>
            {mahallalar.map((m) => (
              <option key={m.id} value={m.id}>
                {tr(m.nomiKirill)}
              </option>
            ))}
          </select>
          {xatolar.mahallaId && (
            <p className="text-xs font-medium text-danger">{xatolar.mahallaId}</p>
          )}
        </div>
      )}

      {/* ── Joriy qadam ── */}
      <Joriy h={h} yangila={yangila} xatolar={xatolar} />

      {/* ── Boshqaruv tugmalari ── */}
      <div className="karta sticky bottom-0 flex flex-wrap items-center gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setQadam((q) => Math.max(0, q - 1))}
          disabled={qadam === 0}
          className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          {tr('Орқага')}
        </button>

        <button
          type="button"
          onClick={qoralamaYubor}
          disabled={saqlanmoqda || yuborilmoqda}
          className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
        >
          {saqlanmoqda ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {tr('Қоралама')}
        </button>

        {/*
          ── САҚЛАГАНДАН КЕЙИН ЧИҚИШ ──

          Илгари бу ерда фақат яшил «Сақланди» ёзуви турарди.
          Ходим қораламани сақлаб, ишни тўхтатмоқчи бўлса —
          чиқадиган тугма йўқ эди. Ёнбардаги «Хатловларим» ни
          топиш керак эди, телефонда эса у меню ичида яширин.

          Энди ёнида тугма: босса, қораламалар рўйхатига
          ўтади ва ёзуви ўша ерда туради.
        */}
        {oxirgiSaqlash && (
          <span className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-ok">
              <Check className="h-3.5 w-3.5" />
              {tr('Сақланди')}
            </span>
            <button
              type="button"
              onClick={() => {
                /*
                  Хотирадаги нусха энди керак эмас: ёзув
                  серверда турибди ва «Хатловларим» дан
                  очилади. Акс ҳолда кейинги «Янги хатлов» да
                  у яна сўралиб турарди.
                */
                qoralamaOchir(QORALAMA_ID);
                router.push('/xatlov');
                router.refresh();
              }}
              className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {tr('Хатловларимга қайтиш')}
            </button>
          </span>
        )}

        <div className="ml-auto">
          {oxirgi ? (
            <button
              type="button"
              onClick={yakuniyYubor}
              disabled={yuborilmoqda || hisobot.xatolar.length > 0}
              className="flex items-center gap-1.5 tugma-asosiy rounded-md px-5 py-2.5 text-sm font-semibold"
            >
              {yuborilmoqda ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {tr('Якуний юбориш')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setQadam((q) => Math.min(QADAMLAR.length - 1, q + 1))}
              className="flex items-center gap-1.5 rounded-md bg-accent-solid px-5 py-2.5 text-sm font-semibold text-accent-contrast transition-opacity hover:opacity-90"
            >
              {tr('Кейинги')}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  TEKSHIRUVLAR
// ═════════════════════════════════════════════════════════════

/**
 * Forma holatini arifmetika tekshiruvi kutgan ko'rinishga keltiradi.
 *
 * To'liq obyekt qaytaradi (holatni spread qilmaydi) - shunda yangi
 * maydon qo'shilganda uni bu yerga ham yozish esdan chiqsa,
 * TypeScript darhol ogohlantiradi.
 */
function sonlar(h: XatlovHolati): XatlovRaqamlari {
  const s = (x: number | '') => (x === '' ? 0 : x);
  return {
    jamiAzo: s(h.jamiAzo),
    bolalarSoni: s(h.bolalarSoni),
    bolalar0_3Yosh: s(h.bolalar0_3Yosh),
    bolalar3_17Yosh: s(h.bolalar3_17Yosh),
    bolalar18Yoshdan: s(h.bolalar18Yoshdan),
    mehnatgaLayoqatli: s(h.mehnatgaLayoqatli),
    mehnatgaLayoqatsiz: s(h.mehnatgaLayoqatsiz),
    ishlaydiganlar: s(h.ishlaydiganlar),
    davlatKorxonada: s(h.davlatKorxonada),
    xususiySektorda: s(h.xususiySektorda),
    ishsizlarSoni: s(h.ishsizlarSoni),
    bogchaKutayotganAyollar: s(h.bogchaKutayotganAyollar),

    maktabgachaYoshdagi: s(h.maktabgachaYoshdagi),
    maktabgachaQamrovda: s(h.maktabgachaQamrovda),
    maktabYoshdagi: s(h.maktabYoshdagi),
    maktabQamrovda: s(h.maktabQamrovda),
    togarakQamrovi: s(h.togarakQamrovi),

    moliyaEhtiyoji: h.moliyaEhtiyoji,
    talabQilinganMablag: s(h.talabQilinganMablag),
    tomorqaBor: h.tomorqaBor,
    ekinMaydoni: s(h.ekinMaydoni),
    tomorqaFoydalanish: h.tomorqaFoydalanish,
    qoshimchaYerBor: h.qoshimchaYerBor,
    qoshimchaYerMaydoni: s(h.qoshimchaYerMaydoni),
    chorvaBor: h.chorvaBor,
    chorvaTurlari: h.chorvaTurlari,
    hunarmandBor: h.hunarmandBor,
    hunarTurlari: h.hunarTurlari,
    issiqxonaTalabi: h.issiqxonaTalabi,
    issiqxonaMaydoni: s(h.issiqxonaMaydoni),
    ijaraYer: h.ijaraYer,
    ijaraYerMaydoni: s(h.ijaraYerMaydoni),
    oylikDaromad: s(h.oylikDaromad),

    nogironlikBor: h.nogironlikBor,
    nogironShaxslarSoni: h.nogironShaxslar.length,
    uzoqDavolanish: h.uzoqDavolanish,
    uzoqDavolanishIzoh: h.uzoqDavolanishIzoh,
  };
}

/** Qoralama saqlash uchun kerakli eng kam maydonlar */
/**
 * Номувофиқлик қатори — босиладиган.
 *
 * Майдони маълум бўлса тугма бўлади ва ўша катакка олиб
 * боради. Майдонсиз нуқсонлар ҳам бор (умумий огоҳлантириш) —
 * улар оддий матн бўлиб қолади, чунки борадиган жой йўқ.
 */
function XatoQatori({
  nuqson,
  tr,
  otish,
}: {
  nuqson: { maydon?: string; xabar: string };
  tr: (m: string) => string;
  otish: (maydon: string, xabar: string) => void;
}) {
  const matn = tr(nuqson.xabar);

  if (!nuqson.maydon) {
    return <span className="flex gap-2"><span aria-hidden="true">•</span>{matn}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => otish(nuqson.maydon!, nuqson.xabar)}
      className="flex w-full gap-2 text-left underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80"
    >
      <span aria-hidden="true">•</span>
      <span className="min-w-0 flex-1">
        {matn}
        <span className="ml-1.5 whitespace-nowrap text-[11px] opacity-75">
          ({tr('тузатиш учун босинг')})
        </span>
      </span>
    </button>
  );
}

function asosiyMaydonlarniTekshir(h: XatlovHolati): Record<string, string> {
  const xt: Record<string, string> = {};

  if (!h.mahallaId) xt.mahallaId = 'Маҳаллани танланг';

  if (h.manzil.trim().length < 3) {
    xt.manzil = 'Хонадон манзилини ёзинг';
  }

  const ism = ismTekshir(h.oilaBoshligi, 'Оила бошлиғининг Ф.И.Ш.');
  if (!ism.ok) xt.oilaBoshligi = ism.xabar ?? 'Ф.И.Ш. нотўғри';

  return xt;
}

/** Yakuniy yuborish uchun to'liq tekshiruv */
function toliqTekshir(h: XatlovHolati): Record<string, string> {
  const xt = asosiyMaydonlarniTekshir(h);

  /*
   * ОИЛА БОШЛИҒИНИНГ ТЕЛЕФОНИ — мажбурий.
   *
   * Илгари бу текширув `if (h.telefon.trim())` ичида турарди:
   * яъни рақам ЁЗИЛГАН бўлса текширилар, бўш қолдирилса
   * ўтиб кетарди. Схемада эса у мажбурий (`min(7)`) — натижада
   * форма «Юбориш» ни очиб берар, сервер эса 400 қайтарар ва
   * ходим экранда «String must contain at least 7 character(s)»
   * деган ёзувни кўрарди. Қайси майдон экани ҳам айтилмасди.
   *
   * Ходим учун телефонсиз хатловнинг маъноси ҳам йўқ: бандлик
   * маркази фуқарога қўнғироқ қила олмаса, занжир шу ерда
   * узилади.
   */
  const tel = telefonTekshir(h.telefon);
  if (!tel.ok) xt.telefon = tel.xabar ?? 'Телефон рақами нотўғри';

  /*
   * ── МАЖБУРИЙ МАЙДОНЛАР ──
   *
   * Рўйхатга ФАҚАТ ҳар хонадонга тегишли саволлар киради.
   * «Иссиқхона майдони» ёки «ким парвариш қилмоқда» каби
   * саволлар шартга боғлиқ ва улар ўз жойида текширилади.
   *
   * Нол — ТЎҒРИ жавоб ва у бўш майдондан фарқ қилади: «0 та
   * бола» аниқ маълумот, бўш майдон эса «сўрамадим» дегани.
   * Шунинг учун текширув `=== ''` бўйича, `< 1` эмас.
   */
  const raqam: [keyof XatlovHolati, string][] = [
    ['bolalarSoni', 'Болалар сонини киритинг (бўлмаса 0 ёзинг)'],
    ['mehnatgaLayoqatli', 'Меҳнатга лаёқатлилар сонини киритинг'],
    ['ishlaydiganlar', 'Ишлайдиганлар сонини киритинг (бўлмаса 0 ёзинг)'],
    ['ishsizlarSoni', 'Ишсизлар сонини киритинг (ишсиз бўлмаса 0 ёзинг)'],
    ['maktabgachaYoshdagi', 'Мактабгача ёшдаги болалар сонини киритинг (бўлмаса 0)'],
    ['maktabgachaQamrovda', 'Боғчага қатнайдиганлар сонини киритинг (бўлмаса 0)'],
    ['maktabYoshdagi', 'Мактаб ёшидаги болалар сонини киритинг (бўлмаса 0)'],
    ['maktabQamrovda', 'Мактабга қатнайдиганлар сонини киритинг (бўлмаса 0)'],
    ['oylikDaromad', 'Оиланинг ойлик даромадини киритинг (даромади бўлмаса 0)'],
    ['bolalar0_3Yosh', '0—3 ёшдаги болалар сонини киритинг (бўлмаса 0)'],
    ['bolalar3_17Yosh', '3—17 ёшдаги болалар сонини киритинг (бўлмаса 0)'],
    ['bolalar18Yoshdan', '18 ёшдан катта фарзандлар сонини киритинг (бўлмаса 0)'],
  ];

  if (h.jamiAzo === '' || h.jamiAzo < 1) {
    xt.jamiAzo = 'Хонадондаги аъзолар сонини киритинг';
  }
  for (const [kalit, xabar] of raqam) {
    if (h[kalit] === '') xt[kalit] = xabar;
  }

  if (!h.uyHolati) xt.uyHolati = 'Уй-жой ҳолатини танланг';
  if (!h.ichimlikSuvi) xt.ichimlikSuvi = 'Ичимлик суви манбаини танланг';

  /*
   * ── ҲА/ЙЎҚ САВОЛЛАРИ ──
   *
   * Ҳаммаси жавобсиз (`null`) ҳолатдан бошланади ва жавобсиз
   * қолдириб бўлмайди.
   *
   * Илгари улар `false` дан бошланарди — яъни «йўқ» ва
   * «сўрамадим» базада БИР ХИЛ ёзиларди. Оқибати: ходим газ
   * саволини ўтказиб юборса, хонадон ҳисоботда «газсиз» бўлиб
   * чиқар ва туманнинг газлаштириш режасига нотўғри рақам
   * кирарди. «Электр» ва «ҳужжатлар тўлиқми» эса аксинча
   * `true` дан бошланарди — сўралмаган хонадон «ҳаммаси
   * жойида» бўлиб кўринарди.
   */
  const haYoq: [keyof XatlovHolati, string][] = [
    ['tadbirkorlikIstagi', 'Тадбиркорлик истагини сўранг'],
    ['moliyaEhtiyoji', 'Молиявий эҳтиёж борлигини сўранг'],
    ['chetElMehnati', 'Чет элда ишлаётган аъзо борлигини сўранг'],
    ['uzoqDavolanish', 'Узоқ даволанишга муҳтож аъзо борлигини сўранг'],
    ['elektr', 'Электр таъминотини сўранг'],
    ['gaz', 'Газ таъминотини сўранг'],
    ['sugorishSuvi', 'Суғориш суви таъминотини сўранг'],
    ['kanalizatsiya', 'Канализация тизимини сўранг'],
    ['nogironlikBor', 'Ногиронлиги бўлган шахс борлигини сўранг'],
    ['yolgizKeksa', 'Ёлғиз яшовчи кекса борлигини сўранг'],
    ['parvarishgaMuhtoj', 'Парваришга муҳтож шахс борлигини сўранг'],
    ['hujjatlarToliq', 'Ҳужжатлар тўлиқлигини сўранг'],
    ['tomorqaBor', 'Томорқа ер борлигини сўранг'],
    ['qoshimchaYerBor', 'Қўшимча фойдаланувдаги ер борлигини сўранг'],
    ['chorvaBor', 'Чорвачилик борлигини сўранг'],
    ['hunarmandBor', 'Ҳунармандчилик борлигини сўранг'],
    ['issiqxonaTalabi', 'Иссиқхонага талабни сўранг'],
    ['ijaraYer', 'Ижара ер борлигини сўранг'],
    ['passivDaromadIstagi', 'Пассив даромад истагини сўранг'],
  ];

  for (const [kalit, xabar] of haYoq) {
    if (h[kalit] === null) xt[kalit] = xabar;
  }

  /*
   * ── «БОШҚА» ТАНЛАНСА, НИМАСИ ЁЗИЛСИН ──
   *
   * «Бошқа: 47 хонадон» деган банддан ҳеч қандай қарор
   * чиқмайди. Маблағ йўналиши туман бюджет режасига
   * тўғридан-тўғри киради, шунинг учун у аниқ бўлиши шарт.
   */
  if (h.mablagYonalishi.includes('Boshqa') && h.mablagYonalishiBoshqa.trim().length < 3) {
    xt.mablagYonalishiBoshqa = 'Маблағ қайси йўналишга сарфланишини ёзинг';
  }
  if (h.infratuzilmaMuammolari.includes('Boshqa') && h.infratuzilmaBoshqa.trim().length < 3) {
    xt.infratuzilmaBoshqa = 'Қайси муаммо эканини ёзинг';
  }

  /*
   * ── ПАССИВ ДАРОМАД ──
   * «Ҳа» босилса, қайси йўл экани кўрсатилиши керак — акс
   * ҳолда «истайди» деган белгидан кейин ҳеч ким ҳеч нима
   * қила олмайди.
   */
  if (h.passivDaromadIstagi) {
    if (h.passivDaromadTurlari.length === 0) {
      xt.passivDaromadTurlari = 'Камида битта воситани белгиланг';
    }
    if (h.passivDaromadTurlari.includes('Boshqa') && h.passivDaromadIzohi.trim().length < 3) {
      xt.passivDaromadIzohi = '«Бошқа» белгиланди — қайси восита кераклигини ёзинг';
    }
    /*
     * Ҳар бир танланган восита учун МИҚДОР мажбурий.
     *
     * Миқдорсиз банд таъминот режасида «товуқ сўраган: 84
     * хонадон» бўлиб қолади ва ундан нечта товуқ сотиб олиш
     * кераклиги чиқмайди.
     */
    for (const tur of h.passivDaromadTurlari) {
      const soni = h.passivDaromadSonlari[tur];
      if (soni === '' || soni == null || Number(soni) < 1) {
        xt[`passivSoni.${tur}`] = 'Қанча кераклигини киритинг';
      }
    }
  }

  /*
   * ── ЧОРВА БОШ СОНИ ──
   * Тур белгиланди-ю сони ёзилмаса, субсидия ҳисоби чиқмайди.
   */
  if (h.chorvaBor) {
    const chorva: [string, keyof XatlovHolati, string][] = [
      ['Yirik shoxli', 'yirikShoxliSoni', 'Йирик шохли бош сонини киритинг'],
      ['Mayda shoxli', 'maydaShoxliSoni', 'Майда шохли бош сонини киритинг'],
      ['Parranda', 'parrandaSoni', 'Парранда бош сонини киритинг'],
    ];
    for (const [tur, kalit, xabar] of chorva) {
      if (h.chorvaTurlari.includes(tur) && (h[kalit] === '' || Number(h[kalit]) < 1)) {
        xt[kalit] = xabar;
      }
    }
  }

  /*
   * ЧЕТ ЭЛДАГИ МЕҲНАТ.
   *
   * «Ҳа» босилган бўлса, қолган учта жавоб МАЖБУРИЙ. Акс ҳолда
   * ҳисоботда «12 хонадондан биров чет элда ишлайди» деган рақам
   * чиқади-ю, қайси давлат ва қанча пул экани бўш қолади — бундай
   * маълумотдан ҳеч қандай қарор чиқмайди.
   */
  if (h.chetElMehnati) {
    if (h.chetElIshchilar === '' || h.chetElIshchilar < 1) {
      xt.chetElIshchilar = 'Чет элда ишлаётганлар сонини киритинг';
    }
    if (h.chetElDavlatlari.length === 0) {
      xt.chetElDavlatlari = 'Камида битта давлатни белгиланг';
    }
    if (h.chetElDavlatlari.includes('Boshqa') && h.chetElBoshqaDavlat.trim().length < 3) {
      xt.chetElBoshqaDavlat = 'Давлат номини ёзинг';
    }
    if (h.chetElOylikPul === '') {
      xt.chetElOylikPul = 'Ойига юборадиган пулни киритинг (юбормаса 0 ёзинг)';
    }
    if (!h.chetElValyuta) {
      xt.chetElValyuta = 'Қайси валютада эканини белгиланг';
    }
  }

  // Har bir ishsiz qatorini tekshiramiz
  h.ishsizlar.forEach((p, i) => {
    const ism = ismTekshir(p.fish, 'Ф.И.Ш.');
    if (!ism.ok) xt[`ishsiz.${i}.fish`] = ism.xabar ?? 'Ф.И.Ш. нотўғри';

    if (p.telefon?.trim()) {
      const tel = telefonTekshir(p.telefon);
      if (!tel.ok) xt[`ishsiz.${i}.telefon`] = tel.xabar ?? 'Телефон рақами нотўғри';
    }

    /*
     * «Ҳа» босилган саволнинг давоми МАЖБУРИЙ.
     *
     * «Прававси бор» деган маълумот тоифасиз ишламайди: юк
     * машинаси эълонига C керакми, CE ми — билмасдан одам
     * таклиф қилиб бўлмайди. «Касб ўрганмоқчи» ҳам шундай:
     * қайси касб экани ёзилмаса, курс очиш қарори чиқмайди.
     */
    if (p.haydovchilikGuvohnomasi && (p.haydovchilikToifasi?.length ?? 0) === 0) {
      xt[`ishsiz.${i}.haydovchilikToifasi`] = 'Гувоҳнома тоифасини белгиланг';
    }
    if (p.kasbHunarEhtiyoji && (p.organmoqchiKasb ?? '').trim().length < 3) {
      xt[`ishsiz.${i}.organmoqchiKasb`] = 'Қайси касбни ўрганмоқчи — ёзинг';
    }
  });

  // Arifmetika va ishsizlar soni bog'lanishi
  const hisobot = yuborishgaTayyormi(sonlar(h), h.ishsizlar.length, {
    rozilikBerdi: h.rozilikBerdi,
    imzoYoli: h.imzoYoli,
  });
  for (const n of hisobot.xatolar) {
    if (!xt[n.maydon]) xt[n.maydon] = n.xabar;
  }

  return xt;
}

/**
 * Xato qaysi qadamda ekanini aniqlaydi.
 * Xodim "Yuborish" ni bosganda darhol o'sha qadamga o'tishi kerak,
 * aks holda xatoni qidirib 7 ta qadamni aylanib chiqadi.
 */
function xatoQadami(xatolar: Record<string, string>): number {
  const kalitlar = Object.keys(xatolar);

  // `passivSoni.Tovuq` kabi kalitlar xulosa qadamiga tegishli
  if (kalitlar.some((k) => k.startsWith('passivSoni.'))) {
    const i = QADAMLAR.findIndex((q) => q.maydonlar.some((m) => m === 'passivDaromadTurlari'));
    if (i >= 0) return i;
  }

  // `ishsiz.0.fish` kabi kalitlar shaxslar qadamiga tegishli
  if (kalitlar.some((k) => k.startsWith('ishsiz.'))) {
    const i = QADAMLAR.findIndex((q) => q.maydonlar.some((m) => m === 'ishsizlar'));
    if (i >= 0) return i;
  }

  const i = QADAMLAR.findIndex((q) => kalitlar.some((k) => q.maydonlar.some((m) => m === k)));
  return i >= 0 ? i : 0;
}
