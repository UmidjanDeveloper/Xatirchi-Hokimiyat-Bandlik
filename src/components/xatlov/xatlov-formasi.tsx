'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
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

  // ── Brauzer xotirasidagi qoralamani tiklash ──
  //
  // Faqat YANGI xatlov uchun: mavjud yozuvni tahrirlayotganda
  // serverdagi ma'lumot ustunroq, aks holda eski qoralama uni
  // bosib ketishi mumkin.
  const tiklandi = useRef(false);
  useEffect(() => {
    if (boshlangich || tiklandi.current) return;
    tiklandi.current = true;

    const saqlangan = qoralamaOqi<XatlovHolati>(QORALAMA_ID);
    if (saqlangan?.manzil || saqlangan?.oilaBoshligi) {
      setH(saqlangan);
    }
  }, [boshlangich]);

  // ── Har o'zgarishda brauzer xotirasiga yozish ──
  //
  // Server bilan aloqa yo'q bo'lsa ham xodim to'ldirgani yo'qolmaydi.
  useEffect(() => {
    if (!h.manzil && !h.oilaBoshligi) return;
    const ok = qoralamaSaqla(QORALAMA_ID, h);
    setXotiraXatosi(!ok);
  }, [h]);

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

      {/* ── Jonli arifmetika ogohlantirishlari ── */}
      {hisobot.xatolar.length > 0 && (
        <div className="quti-xato space-y-1.5">
          <p className="font-semibold">{tr('Рақамларда номувофиқлик:')}</p>
          <ul className="list-inside list-disc space-y-1">
            {hisobot.xatolar.map((n, i) => (
              <li key={i}>{tr(n.xabar)}</li>
            ))}
          </ul>
        </div>
      )}

      {hisobot.xatolar.length === 0 && hisobot.ogohlantirishlar.length > 0 && (
        <div className="quti-ogoh space-y-1.5">
          <p className="font-semibold">{tr('Эътибор беринг:')}</p>
          <ul className="list-inside list-disc space-y-1">
            {hisobot.ogohlantirishlar.map((n, i) => (
              <li key={i}>{tr(n.xabar)}</li>
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

        {oxirgiSaqlash && (
          <span className="flex items-center gap-1 text-xs text-ok">
            <Check className="h-3.5 w-3.5" />
            {tr('Сақланди')}
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
    mehnatgaLayoqatli: s(h.mehnatgaLayoqatli),
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
    nogironlikIzoh: h.nogironlikIzoh,
    uzoqDavolanish: h.uzoqDavolanish,
    uzoqDavolanishIzoh: h.uzoqDavolanishIzoh,
  };
}

/** Qoralama saqlash uchun kerakli eng kam maydonlar */
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
   * маркази фуқарога қўнғироқ қила олмаса, зanжир шу ерда
   * узилади.
   */
  const tel = telefonTekshir(h.telefon);
  if (!tel.ok) xt.telefon = tel.xabar ?? 'Телефон рақами нотўғри';

  if (h.jamiAzo === '' || h.jamiAzo < 1) {
    xt.jamiAzo = 'Хонадондаги аъзолар сонини киритинг';
  }
  if (h.mehnatgaLayoqatli === '') {
    xt.mehnatgaLayoqatli = 'Меҳнатга лаёқатлилар сонини киритинг';
  }
  if (h.ishsizlarSoni === '') {
    xt.ishsizlarSoni = 'Ишсизлар сонини киритинг (ишсиз бўлмаса 0 ёзинг)';
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

  // `ishsiz.0.fish` kabi kalitlar shaxslar qadamiga tegishli
  if (kalitlar.some((k) => k.startsWith('ishsiz.'))) {
    const i = QADAMLAR.findIndex((q) => q.maydonlar.some((m) => m === 'ishsizlar'));
    if (i >= 0) return i;
  }

  const i = QADAMLAR.findIndex((q) => kalitlar.some((k) => q.maydonlar.some((m) => m === k)));
  return i >= 0 ? i : 0;
}
