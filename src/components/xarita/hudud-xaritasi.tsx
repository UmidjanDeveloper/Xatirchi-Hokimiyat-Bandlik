'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Box, Maximize2, RotateCcw, Square } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { HUDUDLAR, VIEW_BOX, CHEGARA } from '@/lib/xarita/hududlar';
import type { XaritaQatori } from '@/lib/xarita/xarita-malumoti';
import { OLCHOVLAR, daraja, olchovTop, type OlchovKaliti } from './olchovlar';

/**
 * ============================================================
 *  ХАТИРЧИ ТУМАНИ — ИНТЕРАКТИВ ХАРИТА
 *
 *  ── Нега харита керак ──
 *
 *  Панелдаги жадвалда 70 та сатр бор ва ҳоким уларни ўқиб
 *  чиқмайди. Харитада эса битта қараш етади: қайси томон
 *  орқада қолган — шимолми, чегара бўйими. Жадвал буни ҳеч
 *  қачон кўрсатмайди, чунки унда МФЙ лар алифбо тартибида
 *  туради, ер юзида эса ёнма-ён.
 *
 *  ── Иккита канал, битта шакл ──
 *
 *  РАНГ — аҳвол (неча фоиз), БАЛАНДЛИК — ҳажм (нечта одам).
 *  Битта канал етмайди: 100% қамровли 12 хонадонлик маҳалла
 *  билан 40% қамровли 900 хонадонлик маҳалла фақат рангда
 *  таққосланса, биринчиси ютуқдек кўринарди.
 *
 *  ── Эски компьютерлар ──
 *
 *  WebGL ишлатилмаган. Ҳажм перспектива ва қатламлардан
 *  чиқади, яъни браузер фақат SVG чизади. Устига «2D» тугмаси
 *  бор: ағдариш ёқмаса ёки машина эски бўлса, битта босишда
 *  текис харитага ўтади ва танлов эсда қолади.
 * ============================================================
 */

/*
 * Девор неча қатламдан иборат.
 *
 * Кўп қатлам — силлиқроқ ён томон, аммо 69 ҳудуд × қатлам сони
 * шакл браузерга тушади. Тўрттада ён томон бус-бутун кўринади
 * ва эски машинада ҳам ўтиш силлиқ қолади.
 */
const DEVOR_QATLAMI = 4;

/* Энг баланд ҳудуд неча SVG бирлигига кўтарилади */
const ENG_BALAND = 44;

/* Қизил контур билан белгиланадиган энг орқадаги ҳудудлар сони */
const OGOH_SONI = 10;

/* Бошланғич камера бурчаклари */
const BOSHLANGICH = { qiya: 46, burilish: -7, masshtab: 1.06 };

const raqam = (n: number) => n.toLocaleString('ru-RU');

/** Сақланган созлама калити */
const SOZLAMA = 'xarita-uch-olchov';

export interface HududXaritasiProps {
  qatorlar: XaritaQatori[];
  ulanmagan: { xaritada: string[]; bazada: string[] };
  qamrovNomi: string;
  /**
   * Фақат шу МФЙ ёниб туради, қолганлари нейтрал.
   *
   * Маҳалла ходими учун: у туманнинг бошқа МФЙ лари рақамини
   * КЎРМАСЛИГИ керак, аммо ўз маҳалласи туманнинг қаерида
   * эканини кўргани фойдали.
   */
  yolqinMahallaId?: string | null;
  /** Танланган ҳудуддан рўйхатга ўтиш ҳаволалари кўрсатилсинми */
  havolalar?: boolean;
  sarlavha?: string;
}

export function HududXaritasi({
  qatorlar,
  ulanmagan,
  qamrovNomi,
  yolqinMahallaId = null,
  havolalar = false,
  sarlavha = 'Туман харитаси',
}: HududXaritasiProps) {
  const { t: tr } = useAlifbo();

  const [olchovKaliti, setOlchov] = useState<OlchovKaliti>('qamrov');
  const [tanlangan, setTanlangan] = useState<string | null>(null);
  const [faol, setFaol] = useState<string | null>(null);
  const [uch, setUch] = useState(true);
  const [kamera, setKamera] = useState(BOSHLANGICH);
  const [sudralmoqda, setSudralmoqda] = useState(false);
  const [kirish, setKirish] = useState<'yoq' | 'ha' | 'tugadi'>('yoq');
  /* Машина кўтармагани учун ўзи текис режимга ўтганми */
  const [ozgaOtdi, setOzgaOtdi] = useState(false);
  /* Фойдаланувчи ўзи танладими — ундан кейин ҳеч ким аралашмайди */
  const tanlovQildi = useRef(false);

  const sahnaRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const sudrash = useRef<{ x: number; y: number; qiya: number; burilish: number } | null>(null);

  /* Ҳудуд id си бўйича маълумот */
  const xarita = useMemo(() => {
    const m = new Map<string, XaritaQatori>();
    for (const q of qatorlar) m.set(q.hududId, q);
    return m;
  }, [qatorlar]);

  const olchov = olchovTop(olchovKaliti);

  const engKattaHajm = useMemo(
    () => qatorlar.reduce((eng, q) => Math.max(eng, olchov.hajm(q)), 0),
    [qatorlar, olchov]
  );

  /*
   * ── ЧИЗИШ ТАРТИБИ ──
   *
   * SVG да кейин чизилган нарса устда туради. Ағдарилган
   * харитада эса УЗОҚДАГИ ҳудуд аввал, ЯҚИНДАГИСИ кейин
   * чизилиши керак — акс ҳолда олдинги ҳудуднинг девори
   * орқасидагининг устидан эмас, ОСТИДАН чиқиб қолади ва
   * ҳажм бузилади.
   *
   * Тартиб маркази бўйича: юқорида турган (кичик y) —
   * узоқдаги.
   */
  const chizishTartibi = useMemo(
    () => [...HUDUDLAR].sort((a, b) => markaz(a.d)[1] - markaz(b.d)[1]),
    []
  );

  /*
   * Марказдан четга кетадиган тўлқин учун: ҳар ҳудуднинг
   * марказдан узоқлиги бўйича тартиб рақами.
   */
  const navbat = useMemo(() => {
    const oX = CHEGARA.x + CHEGARA.eni / 2;
    const oY = CHEGARA.y + CHEGARA.boyi / 2;
    const masofa = HUDUDLAR.map((h) => {
      const c = markaz(h.d);
      return { id: h.id, m: Math.hypot(c[0] - oX, c[1] - oY) };
    }).sort((a, b) => a.m - b.m);
    const n = new Map<string, number>();
    masofa.forEach((x, i) => n.set(x.id, i));
    return n;
  }, []);

  /* Сақланган «2D/3D» танлови */
  useEffect(() => {
    try {
      const s = window.localStorage.getItem(SOZLAMA);
      if (s === 'yoq') {
        setUch(false);
        tanlovQildi.current = true;
        return;
      }
      if (s === 'ha') tanlovQildi.current = true;
    } catch {
      /* Махфий ойнада localStorage ёпиқ бўлиши мумкин — муҳим эмас */
    }
    /*
     * Ядроси иккитадан кўп бўлмаган машина ағдарилган харитани
     * кўтармайди — ўлчамасдан ҳам маълум.
     */
    const yadro = navigator.hardwareConcurrency;
    if (typeof yadro === 'number' && yadro > 0 && yadro <= 2) setUch(false);
  }, []);

  /*
   * ── МАШИНА КЎТАРАДИМИ: ЎЛЧАБ КЎРАМИЗ ──
   *
   * «Ҳамма компьютерда очилсин» деган талабни фақат тахмин
   * билан бажариб бўлмайди: ядро сони ҳам, браузер номи ҳам
   * ҳақиқий тезликни айтмайди. Эски офис машинасида тўртта
   * ядро бўлиши мумкин-у, ҳар бири суст.
   *
   * Шунинг учун кириш анимацияси пайтида — яъни ҲАҚИҚИЙ юк
   * остида — бир неча кадр ўлчанади. Кадр 42 мс дан узоқ
   * бўлса (24 кадр/сониядан паст), харита ўзи текис режимга
   * ўтади ва БУНИ АЙТАДИ: одам «бузилибди» деб ўйламасин,
   * истаса битта босишда қайтарсин.
   *
   * Фойдаланувчи ўзи танлаган бўлса, ўлчов аралашмайди.
   */
  useEffect(() => {
    if (!uch || tanlovQildi.current) return;
    if (typeof window === 'undefined' || !('requestAnimationFrame' in window)) return;

    let toxtadi = false;
    let oxirgi = performance.now();
    const kadrlar: number[] = [];

    const olcha = () => {
      if (toxtadi) return;
      const hozir = performance.now();
      kadrlar.push(hozir - oxirgi);
      oxirgi = hozir;

      if (kadrlar.length < 24) {
        requestAnimationFrame(olcha);
        return;
      }
      /*
       * Биринчи учта кадр ташланади: улар саҳифа ҳали
       * жойлашаётган пайтга тўғри келади ва ҳар доим узун.
       */
      const tanlangan = kadrlar.slice(3);
      const ortacha = tanlangan.reduce((a, b) => a + b, 0) / tanlangan.length;
      if (ortacha > 42) {
        setUch(false);
        setOzgaOtdi(true);
      }
    };

    const id = requestAnimationFrame(olcha);
    return () => {
      toxtadi = true;
      cancelAnimationFrame(id);
    };
  }, [uch]);

  /* Кириш тўлқини — биринчи кадрдан кейин бошланади */
  useEffect(() => {
    const a = requestAnimationFrame(() => setKirish('ha'));
    const b = window.setTimeout(() => setKirish('tugadi'), 760 + HUDUDLAR.length * 7);
    return () => {
      cancelAnimationFrame(a);
      window.clearTimeout(b);
    };
  }, []);

  const uchniAlmashtir = () => {
    tanlovQildi.current = true;
    setOzgaOtdi(false);
    setUch((oldin) => {
      const yangi = !oldin;
      try {
        window.localStorage.setItem(SOZLAMA, yangi ? 'ha' : 'yoq');
      } catch {
        /* сақланмаса ҳам ишлайверади */
      }
      return yangi;
    });
  };

  /*
   * ── ТУЛТИП ──
   *
   * Жойи React ҳолатида САҚЛАНМАЙДИ. Сичқонча ҳар силжиганда
   * ҳолат янгиланса, 69 та ҳудуд қайта чизиларди ва эски
   * машинада харита «ёпишиб» қоларди. Шунинг учун жойи
   * тўғридан-тўғри DOM га ёзилади.
   */
  const tipniSur = useCallback((e: React.MouseEvent) => {
    const el = tipRef.current;
    const sahna = sahnaRef.current;
    if (!el || !sahna) return;
    const q = sahna.getBoundingClientRect();
    const x = e.clientX - q.left;
    const y = e.clientY - q.top;
    /* Ўнг чеккада тултип ташқарига чиқиб кетмасин */
    const chapda = x > q.width - 190;
    el.style.transform = `translate(${chapda ? x - 175 : x + 16}px, ${y + 16}px)`;
  }, []);

  const hududgaKirdi = useCallback(
    (hududId: string, e: React.MouseEvent) => {
      setFaol(hududId);
      tipniSur(e);
      const el = tipRef.current;
      if (el) el.dataset.korinadi = 'ha';
    },
    [tipniSur]
  );

  const hududdanChiqdi = useCallback(() => {
    setFaol(null);
    const el = tipRef.current;
    if (el) el.dataset.korinadi = 'yoq';
  }, []);

  /* ── Камерани сургаб буриш ── */
  const sudrashBoshi = (e: React.PointerEvent) => {
    if (!uch) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    sudrash.current = { x: e.clientX, y: e.clientY, ...kamera };
    setSudralmoqda(true);
  };

  const sudrashDavomi = (e: React.PointerEvent) => {
    const s = sudrash.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    setKamera({
      /* Ағдариш 8° дан 72° гача — бундан ортиғи ўқилмайди */
      qiya: Math.max(8, Math.min(72, s.qiya + dy * 0.28)),
      burilish: Math.max(-38, Math.min(38, s.burilish + dx * 0.22)),
      masshtab: kamera.masshtab,
    });
  };

  const sudrashOxiri = () => {
    sudrash.current = null;
    setSudralmoqda(false);
  };

  const tanlanganQator = tanlangan ? xarita.get(tanlangan) : undefined;
  const faolQator = faol ? xarita.get(faol) : undefined;

  /*
   * Маҳалла ходими режими: фақат ўз МФЙ си рангланади.
   * Бошқа ҳудудлар шакл сифатида туради, рақамсиз.
   */
  const yolqinHudud = useMemo(
    () => (yolqinMahallaId ? qatorlar.find((q) => q.mahallaId === yolqinMahallaId)?.hududId : null),
    [qatorlar, yolqinMahallaId]
  );
  const yakkaRejim = Boolean(yolqinMahallaId);

  /*
   * Якка режимда (маҳалла ходими) ўз МФЙ си ДАРҲОЛ танланади:
   * ён томонда рўйхат эмас, унинг ўз рақамлари турсин — рўйхатда
   * барибир битта сатр бўларди.
   */
  useEffect(() => {
    if (yolqinHudud) setTanlangan(yolqinHudud);
  }, [yolqinHudud]);

  /*
   * ── РАНГ ҚАДАМИ: НИСБИЙ, МУТЛАҚ ЭМАС ──
   *
   * Биринчи вариантда ранг тўғридан-тўғри фоиздан олинарди:
   * 0-20% — энг ёруғ, 80-100% — энг тўқ. Мантиқан тўғри, амалда
   * фойдасиз: хатловнинг биринчи ойларида барча МФЙ да қамров
   * 0,3-0,6 фоиз бўлади ва БУТУН ХАРИТА бир хил ёруғ кўк
   * бўлиб қолади. Ҳоким ундан ҳеч нима ўқий олмайди.
   *
   * Шунинг учун ранг тақсимотнинг ЎЗИДАН чиқарилади: жорий
   * қийматлар бешта тенг гуруҳга бўлинади. «Кўп» ва «кам» —
   * бугунги ҳолатга нисбатан, ва харита биринчи кундан
   * бошлаб фарқни кўрсатади.
   *
   * Тенг қийматлар БИР гуруҳга тушади: нол фоизли ўттизта МФЙ
   * сунъий равишда беш хил рангга бўлиниб кетмайди.
   */
  const qadamXaritasi = useMemo(() => {
    const natija = new Map<string, number>();

    const qiymatlar: { id: string; d: number }[] = [];
    for (const q of qatorlar) {
      const d = daraja(q, olchov, engKattaHajm);
      if (d !== null) qiymatlar.push({ id: q.hududId, d });
    }
    if (qiymatlar.length === 0) return natija;

    const saralangan = qiymatlar.map((x) => x.d).sort((a, b) => a - b);
    const eng = saralangan[saralangan.length - 1];
    const kam = saralangan[0];

    /* Ҳамма бир хил — бўлишнинг маъноси йўқ, ўртача қадам */
    if (eng === kam) {
      for (const x of qiymatlar) natija.set(x.id, 3);
      return natija;
    }

    const chegara = [0.2, 0.4, 0.6, 0.8].map(
      (u) => saralangan[Math.min(saralangan.length - 1, Math.floor(u * saralangan.length))]
    );

    for (const x of qiymatlar) {
      let qadam = 1;
      for (const c of chegara) if (x.d > c) qadam += 1;
      natija.set(x.id, Math.min(5, qadam));
    }
    return natija;
  }, [qatorlar, olchov, engKattaHajm]);

  /** Ҳудуднинг ранг қадами: 1 (кам) — 5 (кўп), маълумотсиз — 0 */
  const rangQadami = useCallback(
    (q?: XaritaQatori): number => (q ? (qadamXaritasi.get(q.hududId) ?? 0) : 0),
    [qadamXaritasi]
  );

  /** Баландлик — ҳажмга нисбатан */
  const balandlik = useCallback(
    (q?: XaritaQatori): number => {
      if (!q || engKattaHajm <= 0 || !uch) return 0;
      /*
       * Квадрат илдиз: битта улкан маҳалла қолганларини
       * текислаб юбормасин. Тўғри нисбатда энг каттаси 58,
       * ўртачаси эса 3-4 бирлик бўлиб, фарқи кўринмай қоларди.
       */
      const nisbat = Math.sqrt(Math.max(0, olchov.hajm(q)) / engKattaHajm);
      return Math.round(nisbat * ENG_BALAND);
    },
    [olchov, engKattaHajm, uch]
  );

  /*
   * Рўйхат: жорий ўлчов бўйича тартибланган.
   *
   * Харита ёнида турадиган ЖАДВАЛ кўриниши ҳам шу — рангни
   * ажратолмайдиган одам ва экран ўқигич учун харитадаги
   * бутун маълумот шу рўйхатда матн билан такрорланади.
   */
  const royxat = useMemo(() => {
    const bor = qatorlar.filter((q) => olchov.foiz(q) !== null || olchov.hajm(q) > 0);
    return [...bor].sort((a, b) => {
      const fa = olchov.foiz(a);
      const fb = olchov.foiz(b);
      if (fa !== null && fb !== null) return olchov.kopYaxshi ? fa - fb : fb - fa;
      return olchov.hajm(b) - olchov.hajm(a);
    });
  }, [qatorlar, olchov]);

  /* Қизил контур оладиганлар — рўйхатнинг боши */
  const ogohRoyxati = useMemo(() => {
    if (!olchov.baholanadi) return new Set<string>();
    const ishlagan = royxat.filter((q) => olchov.hajm(q) > 0);
    return new Set(ishlagan.slice(0, OGOH_SONI).map((q) => q.hududId));
  }, [royxat, olchov]);

  /**
   * Ҳудуд қизил контур билан белгиланадими.
   *
   * ── Нега «фоиз паст» етмайди ──
   *
   * Биринчи вариантда шарт оддий эди: фоиз 40 дан паст бўлса —
   * қизил. Натижада хатлов бошланмаган кунда БУТУН ХАРИТА
   * қизил чиқди: 69 та ҳудуднинг ҳаммасида нол фоиз.
   *
   * Ҳамма нарса қизил бўлса, қизил ҳеч нима демайди. «Ҳали
   * бошланмаган» билан «бошланган-у орқада қолган» — иккита
   * бошқа ҳолат ва иккинчисигина чора талаб қилади.
   *
   * Иккинчи вариантда чегара 40 фоиз эди ва хатловнинг
   * биринчи ойида ҳамма ҳудуд ўша чегарадан пастда турарди —
   * яна бутун харита қизил. Мутлақ чегара умуман ярамайди:
   * «орқада қолган» — НИСБИЙ тушунча.
   *
   * Шунинг учун белги ҳозирги ҳолатда энг орқада турган ўнта
   * ҳудудга қўйилади. Улар ёнидаги рўйхат билан АЙНАН БИР ХИЛ
   * ўнталик — харитадаги қизил шакл рўйхатдан топилади.
   */
  const ogohlantirilsinmi = (q?: XaritaQatori): boolean =>
    Boolean(q && ogohRoyxati.has(q.hududId));

  return (
    <section className="karta overflow-hidden p-4 sm:p-5">
      {/* ── Сарлавҳа ва бошқарув ── */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-ink">{tr(sarlavha)}</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">
            {tr(qamrovNomi)} {tr('·')} {raqam(qatorlar.length)}{' '}
            {tr('та МФЙ')} {tr('· ранг — аҳвол, баландлик — ҳажм')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={uchniAlmashtir}
            className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-ink"
            aria-pressed={uch}
          >
            {uch ? <Box className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {uch ? tr('3D') : tr('2D')}
          </button>
          {uch && (
            <button
              type="button"
              onClick={() => setKamera(BOSHLANGICH)}
              className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-ink"
              title={tr('Бурчакни тиклаш')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tr('Тиклаш')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Ўлчов танлаш ── */}
      {!yakkaRejim && (
        <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
          {OLCHOVLAR.map((o) => (
            <button
              key={o.kalit}
              type="button"
              onClick={() => setOlchov(o.kalit)}
              aria-pressed={o.kalit === olchovKaliti}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                o.kalit === olchovKaliti
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'
              }`}
            >
              {tr(o.nomi)}
            </button>
          ))}
        </div>
      )}

      {ozgaOtdi && (
        <p className="quti-ogoh relative z-10 mt-2 text-[11px] leading-relaxed">
          {tr(
            'Бу компьютерда ағдарилган харита секин ишлар экан — текис режимга ўтилди. «2D» тугмасини босиб ҳажмли кўринишга қайтариш мумкин.'
          )}
        </p>
      )}

      <p className="relative z-10 mt-2 text-[11px] leading-relaxed text-ink-faint">
        {tr(olchov.izoh)}
        {uch && (
          <>
            {' · '}
            <span className="inline-flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {tr('харитани сургаб буриш мумкин')}
            </span>
          </>
        )}
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* ── САҲНА ── */}
        <div
          ref={sahnaRef}
          className="xarita-sahna select-none"
          onPointerDown={sudrashBoshi}
          onPointerMove={sudrashDavomi}
          onPointerUp={sudrashOxiri}
          onPointerCancel={sudrashOxiri}
          onMouseLeave={hududdanChiqdi}
          style={{ cursor: uch ? (sudralmoqda ? 'grabbing' : 'grab') : 'default' }}
        >
          <div className="xarita-tebranish" data-tinch={uch && !sudralmoqda ? 'yoq' : 'ha'}>
            <div
              className="xarita-tekislik"
              data-uch={uch ? 'ha' : 'yoq'}
              data-sudralmoqda={sudralmoqda ? 'ha' : 'yoq'}
              style={{
                transform: uch
                  ? `rotateX(${kamera.qiya}deg) rotateZ(${kamera.burilish}deg) scale(${kamera.masshtab})`
                  : 'none',
              }}
            >
              <svg
                className="xarita-svg"
                viewBox={VIEW_BOX}
                preserveAspectRatio="xMidYMid meet"
                data-kirdi={kirish}
                data-faol-bor={faol || tanlangan ? 'ha' : 'yoq'}
                role="group"
                aria-label={tr('Хатирчи тумани харитаси')}
              >
                <defs>
                  {HUDUDLAR.map((h) => (
                    <path key={h.id} id={`hd-${h.id}`} d={h.d} />
                  ))}
                </defs>

                {chizishTartibi.map((h) => {
                  const q = xarita.get(h.id);
                  const yakka = yakkaRejim && h.id !== yolqinHudud;
                  const qadam = yakka ? 0 : rangQadami(q);
                  const b = yakka ? 0 : balandlik(q);
                  const tanlandi = tanlangan === h.id;
                  const faolmi = faol === h.id || tanlandi || (yakkaRejim && h.id === yolqinHudud);
                  const ogoh = !yakka && ogohlantirilsinmi(q);

                  return (
                    <g
                      key={h.id}
                      className="hudud"
                      data-faol={faolmi ? 'ha' : 'yoq'}
                      style={{ ['--i' as string]: navbat.get(h.id) ?? 0 }}
                      tabIndex={yakka ? -1 : 0}
                      role="button"
                      aria-label={`${q?.nomiKirill ?? h.name} — ${q ? olchov.matn(q) : tr('маълумот йўқ')}`}
                      aria-pressed={tanlandi}
                      onMouseEnter={(e) => !yakka && hududgaKirdi(h.id, e)}
                      onMouseMove={(e) => !yakka && faol === h.id && tipniSur(e)}
                      onMouseLeave={hududdanChiqdi}
                      onClick={() => !yakka && setTanlangan(tanlandi ? null : h.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!yakka) setTanlangan(tanlandi ? null : h.id);
                        }
                      }}
                    >
                      {/*
                        ДЕВОР ҚАТЛАМЛАРИ.
                        Геометрия `<defs>` да БИР МАРТА сақланади,
                        бу ерда фақат унга ҳавола. Акс ҳолда ҳар
                        ҳудуд контури беш марта такрорланиб, саҳифа
                        беш баробар оғирлашарди.
                      */}
                      {b > 0 &&
                        Array.from({ length: DEVOR_QATLAMI }, (_, i) => (
                          <use
                            key={i}
                            className="hudud-devor"
                            href={`#hd-${h.id}`}
                            fill={`var(--devor-${Math.min(5, qadam || 1)})`}
                            style={{
                              ['--q' as string]: i,
                              ['--n' as string]: DEVOR_QATLAMI,
                              ['--b' as string]: b,
                            }}
                          />
                        ))}

                      <use
                        className="hudud-yuza"
                        href={`#hd-${h.id}`}
                        fill={qadam === 0 ? 'var(--surface-muted)' : `var(--step-${qadam})`}
                        stroke={
                          tanlandi
                            ? 'var(--accent-deep)'
                            : ogoh
                              ? 'var(--danger)'
                              : 'var(--border-strong)'
                        }
                        strokeWidth={tanlandi ? 4 : ogoh ? 3 : 1.4}
                        strokeLinejoin="round"
                        style={{ ['--b' as string]: b }}
                      />
                    </g>
                  );
                })}

                {/* Танланган ҳудуд номи — харита устида */}
                {tanlanganQator &&
                  (() => {
                    const h = HUDUDLAR.find((x) => x.id === tanlangan);
                    if (!h) return null;
                    const c = markaz(h.d);
                    return (
                      <text
                        className="xarita-nom"
                        x={c[0]}
                        y={c[1] - balandlik(tanlanganQator) - 8}
                        textAnchor="middle"
                      >
                        {tr(tanlanganQator.nomiKirill)}
                      </text>
                    );
                  })()}
              </svg>
            </div>
          </div>

          {/* ── Тултип ── */}
          <div ref={tipRef} className="xarita-tip" data-korinadi="yoq" aria-hidden="true">
            {faolQator ? (
              <>
                <b>{tr(faolQator.nomiKirill)}</b>
                <br />
                {tr(olchov.matn(faolQator))}
                {olchov.foiz(faolQator) !== null && (
                  <>
                    {' · '}
                    <b>{olchov.foiz(faolQator)}%</b>
                  </>
                )}
              </>
            ) : (
              ''
            )}
          </div>

          {/* ── Легенда ── */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-faint">
            <span className="flex items-center gap-1.5">
              {tr('Кам')}
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className="h-3 w-5 rounded-sm"
                  style={{ background: `var(--step-${n})` }}
                  aria-hidden="true"
                />
              ))}
              {tr('Кўп')}
              <span className="text-ink-faint">{tr('— бугунги тақсимотга нисбатан')}</span>
            </span>
            {olchov.baholanadi && !yakkaRejim && (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-3 w-5 rounded-sm border-2"
                  style={{ borderColor: 'var(--danger)', background: 'var(--step-1)' }}
                  aria-hidden="true"
                />
                {tr('энг орқада қолган 10 та')}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span
                className="h-3 w-5 rounded-sm border"
                style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)' }}
                aria-hidden="true"
              />
              {tr('маълумот йўқ')}
            </span>
          </div>
        </div>

        {/* ── ЁН РЎЙХАТ — хаританинг жадвал кўриниши ── */}
        <div className="min-w-0">
          {tanlanganQator ? (
            <TanlanganKarta
              q={tanlanganQator}
              havolalar={havolalar}
              yop={() => setTanlangan(null)}
            />
          ) : (
            <div className="rounded-md border border-line p-3">
              <p className="text-xs font-semibold text-ink">
                {!olchov.baholanadi
                  ? tr('Энг кўп')
                  : olchov.kopYaxshi
                    ? tr('Энг орқада қолганлар')
                    : tr('Энг кўп юк тушган МФЙ')}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {tr('Харитадаги ҳудудга ёки шу сатрга босинг')}
              </p>
              <div className="mt-2 max-h-[320px] space-y-0.5 overflow-auto pr-1">
                {royxat.slice(0, 14).map((q) => {
                  const f = olchov.foiz(q);
                  return (
                    <button
                      key={q.mahallaId}
                      type="button"
                      onClick={() => setTanlangan(q.hududId)}
                      onMouseEnter={() => setFaol(q.hududId)}
                      onMouseLeave={() => setFaol(null)}
                      className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-surface-muted"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          background:
                            rangQadami(q) === 0
                              ? 'var(--surface-muted)'
                              : `var(--step-${rangQadami(q)})`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-ink-muted">
                        {tr(q.nomiKirill)}
                      </span>
                      <span className="raqam shrink-0 font-semibold text-ink">
                        {f !== null ? `${f}%` : raqam(olchov.hajm(q))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/*
            ── УЛАНМАГАН МФЙ ──

            Харитада 69 та шакл, рўйхатда 70 та МФЙ. Фарқни
            яширсак, битта МФЙ рақами жимгина йўқоларди — ва
            ҳеч ким сезмасди.
          */}
          {(ulanmagan.bazada.length > 0 || ulanmagan.xaritada.length > 0) && (
            <p className="mt-2 text-[11px] leading-relaxed text-warn">
              {ulanmagan.bazada.length > 0 && (
                <>
                  {tr('Харитада контури йўқ:')} {ulanmagan.bazada.map((n) => tr(n)).join(', ')}.{' '}
                  {tr('Рақамлари жадвалларда бор, харитада чизилмайди.')}
                </>
              )}
              {ulanmagan.xaritada.length > 0 && (
                <>
                  {' '}
                  {tr('Базада топилмади:')} {ulanmagan.xaritada.join(', ')}.
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Танланган ҳудуд картаси ── */
function TanlanganKarta({
  q,
  havolalar,
  yop,
}: {
  q: XaritaQatori;
  havolalar: boolean;
  yop: () => void;
}) {
  const { t: tr } = useAlifbo();

  const qator = (nomi: string, qiymat: string) => (
    <div className="flex items-baseline justify-between gap-2 border-b border-line py-1.5 last:border-0">
      <span className="text-[11px] text-ink-muted">{tr(nomi)}</span>
      <span className="raqam shrink-0 text-xs font-semibold text-ink">{qiymat}</span>
    </div>
  );

  return (
    <div className="rounded-md border border-accent bg-accent-soft/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">{tr(q.nomiKirill)}</h3>
        <button
          type="button"
          onClick={yop}
          className="shrink-0 text-[11px] text-ink-faint underline-offset-2 hover:text-ink hover:underline"
        >
          {tr('ёпиш')}
        </button>
      </div>

      <div className="mt-2">
        {qator('Хатлов қамрови', `${raqam(q.xatlovXonadon)} / ${raqam(q.bazaXonadon)} · ${q.qamrovFoizi}%`)}
        {qator('Аниқланган ишсиз', raqam(q.aniqlangan))}
        {qator('Ишга жойлашган', `${raqam(q.joylashtirilgan)} · ${q.natijaFoizi}%`)}
        {qator('Рўйхатда турибди', raqam(q.ishsizQoldiq))}
        {qator('17 ёшгача бола', raqam(q.bolalar17))}
        {qator('Чет элда', raqam(q.chetElIshchi))}
      </div>

      {havolalar && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link
            href={`/xonadonlar?mahalla=${q.mahallaId}`}
            className="rounded border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink"
          >
            {tr('Хонадонлар')}
          </Link>
          <Link
            href={`/ishsizlar?mahalla=${q.mahallaId}`}
            className="rounded border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink"
          >
            {tr('Ишсизлар')}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Контурнинг тахминий маркази — ёрлиқ шу ерга қўйилади */
function markaz(d: string): [number, number] {
  const sonlar = d.match(/-?\d+(?:\.\d+)?/g);
  if (!sonlar) return [0, 0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < sonlar.length; i += 2) {
    const x = Number(sonlar[i]);
    const y = Number(sonlar[i + 1]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}
