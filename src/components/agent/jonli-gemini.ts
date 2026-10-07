'use client';

import type { Amal, Manba } from '@/lib/agent/turlar';
import {
  GapBolgich, asbobIdsiniTozala, geminiAsbobJavobi, geminiAudioXabari, geminiMatnXabari, geminiSozlashXabari,
  geminiWsManziliTogrimi, geminiXabarOqi, pcm16Base64, type GeminiHodisa,
} from '@/lib/agent/gemini-protokol';
import type { JonliHodisalar } from './jonli-suhbat';
import { nutqNavbatiYarat, type NutqNavbati } from './jonli-nutq';

/**
 * ============================================================
 *  JONLI SUHBAT — GEMINI LIVE + ELEVENLABS (brauzer tomoni)
 *
 *    mikrofon -> AudioWorklet (16 kHz PCM) -> Gemini Live (WebSocket)
 *    Gemini MATN yozadi -> gaplarga bo'linadi -> ElevenLabs -> quloq
 *
 *  Asosiy API kaliti brauzerda YO'Q: server yakka foydalanishli token
 *  beradi (`/api/agent/jonli`, tur=gemini_ulanish), ko'rsatma va asboblar
 *  token ichida qulflangan. Asbob chaqiruvlari yana serverga qaytib,
 *  u yerda rol/ko'rish rejimi/tezlik tekshiriladi.
 *
 *  ── Aks-sado (ovoz o'zini eshitmasin) ──
 *  ElevenLabs ovozi chiqayotganda mikrofon Gemini'ga ULANMAYDI (yarim
 *  dupleks); shu paytda faqat KUCHLI ovoz (foydalanuvchi o'zi gapirsa)
 *  bo'lib tashlash sifatida qabul qilinadi: ovoz o'chadi, mikrofon
 *  ochiladi va oxirgi ~0,4 soniya ham yuboriladi (gapning boshi
 *  yo'qolmasin). Javob tugagach ~0,35 soniya aks-sado so'nishi kutiladi.
 *  Bu qiymatlar haqiqiy qurilmada (ayniqsa iPhone dinamigi) sozlanishi
 *  mumkin: pastdagi doimiylarga qarang.
 * ============================================================
 */

/** Gapni bo'lish uchun mikrofon kuchi (RMS, 0..1) va necha 50 ms ketma-ket */
const BOLISH_RMS = 0.06;
const BOLISH_KADR = 4;
const SONISH_MS = 350;
const HALQA_KADR = 8;
const MAKS_MUDDAT_MS = 5 * 60_000;
/** Mikrofon ruxsatidan keyin token + WebSocket + sozlash shu vaqtda tugamasa Gemini ishlamagan hisoblanadi */
const ULANISH_MS = 15_000;
/** Salomlashuvga Gemini'dan birinchi matn shu vaqtda kelmasa (model jim/rad etdi) Gemini ishlamagan hisoblanadi */
const BIRINCHI_JAVOB_MS = 12_000;
const MAKS_BUFER = 256_000;
/** Transkripsiya bo'laklari orasidagi shu vaqtdan keyin kelgani yangi foydalanuvchi gapi hisoblanadi */
const YANGI_GAP_MS = 2_500;

export function geminiJonliMumkinmi(): boolean {
  if (typeof window === 'undefined') return false;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Boolean(typeof WebSocket !== 'undefined' && AC && typeof AudioWorkletNode !== 'undefined' && navigator.mediaDevices?.getUserMedia);
}

type Natija<T> = { ok: true; v: T } | { ok: false; e: unknown };
/** Parallel boshlangan va'dalar "ushlanmagan rad" xabarini bermasligi uchun */
const guvoh = <T,>(p: Promise<T>): Promise<Natija<T>> => p.then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e }));

interface UlanishJavobi {
  provayder?: string; wsUrl?: string; setup?: unknown; ruxsat?: string; muddatMs?: number; xabar?: string;
  chiqish?: 'matn' | 'transkript';
  /** Xato javobida: ishlamagan urinishning imzolangan ruxsatnomasi (OpenAI zaxirasiga o'tishda kunlik hisob ikki marta yemaydi) */
  zaxira?: string;
}

export function geminiJonliBoshla(cb: JonliHodisalar): { bekor(): void; yubor(matn: string): boolean; eslat(matn: string): void } {
  const ctrl = new AbortController();
  let tugadi = false;
  let ws: WebSocket | null = null;
  let tayyor = false;
  let ruxsat = '';
  let chiqish: 'matn' | 'transkript' = 'matn';
  let mikrofon: MediaStream | null = null;
  let tugun: AudioWorkletNode | null = null;
  let manbaTugun: MediaStreamAudioSourceNode | null = null;
  let jim: GainNode | null = null;
  let vaqt: ReturnType<typeof setTimeout> | undefined;
  let ulanishVaqti: ReturnType<typeof setTimeout> | undefined;
  let birinchiVaqt: ReturnType<typeof setTimeout> | undefined;
  /** Birinchi javob nazorati uchun; ishlagan sessiya uzilsa ham OpenAI davom ettiradi. */
  let ishladi = false;
  let qoplash: string | undefined;
  let sonishGacha = 0;
  let yuqoriKadr = 0;
  let halqa: Float32Array[] = [];
  let navbat = 0;
  let asbobCtrl: AbortController | null = null;
  let nutq: NutqNavbati | null = null;
  const bolgich = new GapBolgich();
  const chaqiruvlar = new Set<string>();
  const bekorIdlar = new Set<string>();
  const matnlar = new Map<string, string>();
  const sessiyaId = crypto.randomUUID();
  let idSoni = 0;
  let foydalanuvchiId: string | null = null;
  let foydalanuvchiYopiq = false;
  let oxirgiKirish = 0;
  let modelId: string | null = null;

  const AC = typeof window !== 'undefined'
    ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : undefined;
  const context = AC ? new AC() : null;
  // iOS/Chrome ovoz ruxsati bosish paytida ochiladi
  void context?.resume().catch(() => {});

  const yubor = (xabar: unknown): boolean => {
    if (tugadi || !ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(xabar));
    return true;
  };

  const tozala = (mikrofonniSaqla = false) => {
    tugadi = true; ctrl.abort(); asbobCtrl?.abort();
    clearTimeout(vaqt); clearTimeout(ulanishVaqti); clearTimeout(birinchiVaqt);
    nutq?.toxtat();
    try { tugun?.port.close(); tugun?.disconnect(); manbaTugun?.disconnect(); jim?.disconnect(); } catch { /* yopilgan */ }
    if (!mikrofonniSaqla) mikrofon?.getTracks().forEach((t) => t.stop());
    try { ws?.close(1000, 'yopildi'); } catch { /* yopilgan */ }
    void context?.close().catch(() => {});
  };
  const bekor = () => {
    if (tugadi) return;
    tozala();
    cb.onDaraja(0); cb.onHolat('tayyor'); cb.onTugadi();
  };
  /**
   * Gemini ishlamadi: suhbatni tugatmasdan OpenAI zaxirasiga o'tkazadi (`onTugadi` chaqirilmaydi: oyna "jonli" holatda
   * qoladi). Mikrofon oqimi OpenAI'ga beriladi. Ishlayotgan sessiya uzilganda ham zaxira ishlaydi;
   * tugagan yoki zaxirasiz sessiyada `false` qaytadi.
   */
  const zaxiragaOt = (sabab: string): boolean => {
    if (tugadi || !cb.onZaxira) return false;
    tozala(true);
    cb.onDaraja(0);
    cb.onZaxira(qoplash, ishladi ? `suhbat_uzildi:${sabab}` : sabab, mikrofon);
    return true;
  };
  const ulanishXatosi = (m: string, sabab: string) => { if (!zaxiragaOt(sabab)) xato(m); };
  const xato = (m: string) => { if (!tugadi) { cb.onXato(m); bekor(); } };

  const yangila = (id: string, r: 'f' | 'a', m: string, qoshish = true, tamom?: boolean) => {
    if (tugadi || (!m && !tamom)) return;
    const yangi = (qoshish ? (matnlar.get(id) ?? '') + m : m).slice(0, 12_000);
    matnlar.set(id, yangi);
    cb.onMatn(id, r, yangi, tamom);
  };

  /** Foydalanuvchi gapini bo'ldi (yoki yangi savol): ovoz, kutayotgan so'rov va yarim javob bekor */
  const bolish = () => {
    navbat++;
    asbobCtrl?.abort();
    nutq?.toxtat();
    bolgich.reset();
    modelId = null;
    yuqoriKadr = 0;
    cb.onDaraja(0);
    cb.onHolat('eshitmoqda');
  };

  /* ───────────── asboblar (serverdagi mavjud xavfsiz yo'l) ───────────── */
  const asboblarniBajar = async (royxat: Extract<GeminiHodisa, { t: 'asbob' }>[]) => {
    if (tugadi || !royxat.length) return;
    const bosqich = navbat;
    const tCtrl = new AbortController(); asbobCtrl = tCtrl;
    cb.onHolat('oylamoqda');
    const javoblar: { id: string; name: string; output: unknown }[] = [];
    for (const c of royxat) {
      if (tugadi) return;
      const callId = asbobIdsiniTozala(c.id);
      if (chaqiruvlar.has(callId)) continue;
      chaqiruvlar.add(callId);
      if (chaqiruvlar.size > 30) { xato('Жонли буйруқлар чегараси тугади. Қайта суҳбат очинг.'); return; }
      let natija: Record<string, unknown>;
      try {
        if (ctrl.signal.aborted || tCtrl.signal.aborted) throw new Error('bekor');
        const r = await fetch('/api/agent/jonli', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tur: 'asbob', ruxsat, callId, nomi: c.nomi, args: c.args }),
          signal: AbortSignal.any([ctrl.signal, tCtrl.signal, AbortSignal.timeout(30_000)]),
        });
        const d = await r.json() as { malumot?: Record<string, unknown>; amallar?: Amal[]; manbalar?: Manba[]; xabar?: string };
        if (tugadi) return;
        if (!r.ok) natija = { xato: 'buyruq_rad', izoh: d.xabar ?? 'Buyruq bajarilmadi.' };
        else {
          natija = { ...d.malumot };
          if (bosqich === navbat && !tCtrl.signal.aborted) {
            const brauzer = await cb.onAmallar(d.amallar ?? [], d.manbalar ?? [], tCtrl.signal);
            if (Object.keys(brauzer).length) natija.brauzerNatijasi = brauzer;
          } else natija.brauzerNatijasi = { bekor: true, izoh: 'Yangi savol boshlandi; oldingi ekran amali bajarilmadi.' };
        }
      } catch {
        natija = { xato: 'buyruq_uzildi', izoh: 'Buyruq javobi olinmadi yoki suhbat bo‘lindi. Bajarildi deb aytmang.' };
      }
      // Foydalanuvchi bo'lgan bo'lsa ham javob qaytariladi: Gemini chaqiruvni yopilgan deb bilsin
      if (!bekorIdlar.has(c.id)) javoblar.push({ id: c.id, name: c.nomi, output: JSON.stringify(natija).slice(0, 14_000) });
    }
    if (asbobCtrl === tCtrl) asbobCtrl = null;
    if (javoblar.length && !tugadi) yubor(geminiAsbobJavobi(javoblar));
  };

  /* ───────────── Gemini hodisalari ───────────── */
  const hodisa = (h: GeminiHodisa) => {
    switch (h.t) {
      case 'tayyor': break; // boshqa joyda ishlanadi
      case 'kirish': {
        /*
         * Transkripsiya modelning javobiga NISBATAN tartibsiz kelishi mumkin (Gemini hujjati):
         * oxirgi so'zlar javob boshlangandan keyin ham kelishi mumkin. Shuning uchun bu hodisa
         * HECH QACHON javobni bekor qilmaydi (haqiqiy gap bo'lish: `interrupted` yoki mikrofon
         * kuchi) va kech kelgan bo'lak oldingi foydalanuvchi xabariga qo'shiladi. Yangi xabar
         * faqat oldingi javob TUGAGANDAN (turnComplete) keyin ochiladi.
         */
        const hozir = performance.now();
        // Bir gapning bo'laklari soniya ichida keladi; 2,5 soniyadan keyingisi — yangi gap
        if (!foydalanuvchiId || (h.matn && (foydalanuvchiYopiq || hozir - oxirgiKirish > YANGI_GAP_MS))) { foydalanuvchiId = `${sessiyaId}:f${idSoni++}`; foydalanuvchiYopiq = false; }
        oxirgiKirish = hozir;
        yangila(foydalanuvchiId, 'f', h.matn, true, h.tamom === true);
        if (!modelId && !nutq?.faol()) cb.onHolat('eshitmoqda');
        break;
      }
      case 'matn': {
        ishladi = true; clearTimeout(birinchiVaqt);
        if (!modelId) { modelId = `${sessiyaId}:a${idSoni++}`; cb.onHolat('oylamoqda'); }
        yangila(modelId, 'a', h.matn);
        for (const g of bolgich.push(h.matn)) nutq?.qosh(g);
        break;
      }
      case 'yakun': {
        if (modelId || nutq?.faol()) { ishladi = true; clearTimeout(birinchiVaqt); }
        for (const g of bolgich.flush()) nutq?.qosh(g);
        modelId = null;
        foydalanuvchiYopiq = true;
        nutq?.tugatish();
        if (!nutq?.faol()) cb.onHolat('eshitmoqda');
        break;
      }
      case 'toxtadi': bolish(); break;
      case 'asbob_bekor': for (const id of h.idlar) bekorIdlar.add(id); asbobCtrl?.abort(); break;
      case 'ketadi': cb.onXato('Жонли суҳбат тез орада ёпилади. Давом этиш учун қайта уланинг.'); break;
      case 'xato': ulanishXatosi('Gemini сўровни қабул қилмади. Калит, модел ва квотани текширинг.', 'provider_rad'); break;
      default: break;
    }
  };

  const xabarQabul = (xom: unknown) => {
    if (tugadi) return;
    const hodisalar = geminiXabarOqi(xom, chiqish);
    const asboblar: Extract<GeminiHodisa, { t: 'asbob' }>[] = [];
    for (const h of hodisalar) {
      if (h.t === 'asbob') asboblar.push(h);
      else hodisa(h);
    }
    if (asboblar.length) { ishladi = true; clearTimeout(birinchiVaqt); void asboblarniBajar(asboblar); }
  };

  /* ───────────── mikrofon -> Gemini ───────────── */
  const audioYubor = (f: Float32Array) => {
    if (!ws) return;
    if (ws.bufferedAmount > MAKS_BUFER) { ulanishXatosi('Gemini алоқаси сустлашди. Қайта уланинг.', 'audio_kechikdi'); return; }
    yubor(geminiAudioXabari(pcm16Base64(f)));
  };

  const mikrofonOqimi = (e: MessageEvent<{ f: Float32Array; rms: number }>) => {
    if (tugadi || !tayyor) return;
    const { f, rms } = e.data;
    const ovozChiqmoqda = Boolean(nutq?.faol()) || performance.now() < sonishGacha;
    if (!ovozChiqmoqda) {
      yuqoriKadr = 0;
      if (halqa.length) halqa = [];
      audioYubor(f);
      return;
    }
    // Yarim dupleks: ovoz chiqayotganda audio yuborilmaydi, faqat bo'lish aniqlanadi
    halqa.push(f);
    if (halqa.length > HALQA_KADR) halqa.shift();
    yuqoriKadr = rms > BOLISH_RMS ? yuqoriKadr + 1 : 0;
    if (yuqoriKadr >= BOLISH_KADR) {
      const eski = halqa; halqa = [];
      bolish();
      sonishGacha = 0;
      for (const k of eski) audioYubor(k);
    }
  };

  const mikrofonniBoshla = async (stream: MediaStream) => {
    if (!context) throw new Error('audio');
    manbaTugun = context.createMediaStreamSource(stream);
    tugun = new AudioWorkletNode(context, 'gemini-pcm', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
    tugun.port.onmessage = mikrofonOqimi as (e: MessageEvent) => void;
    jim = context.createGain(); jim.gain.value = 0;
    manbaTugun.connect(tugun); tugun.connect(jim); jim.connect(context.destination);
  };

  /* ───────────── ulanish ───────────── */
  const ulan = async () => {
    try {
      if (!geminiJonliMumkinmi() || !context) throw new Error('qurilma');
      cb.onHolat('oylamoqda');

      // Uchalasi parallel: modul, mikrofon ruxsati, server tokeni
      const modul = guvoh(context.audioWorklet.addModule('/gemini-pcm-worklet.js'));
      const mik = guvoh(navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }));
      const server = guvoh((async () => {
        const r = await fetch('/api/agent/jonli', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tur: 'gemini_ulanish' }), signal: ctrl.signal,
        });
        return { r, d: await r.json().catch(() => ({})) as UlanishJavobi };
      })());

      const m = await mik;
      if (!m.ok) throw m.e;
      if (tugadi) { m.v.getTracks().forEach((t) => t.stop()); return; }
      mikrofon = m.v;
      // Mikrofon ruxsati (odam bosadi) vaqtga kirmaydi: kechikish faqat bundan keyingi qadamlar uchun
      ulanishVaqti = setTimeout(() => ulanishXatosi('Жонли уланиш кечикди. Қайта уриниб кўринг.', 'kechikdi'), ULANISH_MS);
      const sv = await server;
      if (!sv.ok) throw sv.e;
      if (tugadi) return;
      const { r, d } = sv.v;
      qoplash = d.zaxira ?? d.ruxsat;
      if (!r.ok || !d.wsUrl || !d.ruxsat || !d.setup) {
        // Provayder xatosi (502/504) yoki server zaxira ruxsatnomasi bergan: OpenAI'ga o'tamiz; chegara/ruxsat xatolarida emas
        if (d.zaxira || r.status === 502 || r.status === 504) ulanishXatosi(d.xabar ?? 'Жонли хизматга уланиб бўлмади.', `token_${r.status}`);
        else xato(d.xabar ?? 'Жонли хизматга уланиб бўлмади.');
        return;
      }
      if (d.provayder !== 'gemini' || !geminiWsManziliTogrimi(d.wsUrl)) { ulanishXatosi('Жонли хизмат манзили нотўғри. Саҳифани янгиланг.', 'manzil'); return; }
      const mod = await modul;
      if (!mod.ok) throw mod.e;
      if (tugadi) return;
      ruxsat = d.ruxsat;
      chiqish = d.chiqish === 'transkript' ? 'transkript' : 'matn';
      nutq = nutqNavbatiYarat(context, () => ruxsat, {
        onBoshlandi: () => { if (!tugadi) cb.onHolat('gapirmoqda'); },
        onTugadi: () => { if (!tugadi) { sonishGacha = performance.now() + SONISH_MS; cb.onDaraja(0); cb.onHolat('eshitmoqda'); } },
        onDaraja: (x) => { if (!tugadi) cb.onDaraja(x); },
        onXato: (t) => { if (!tugadi) cb.onXato(t); },
        onZaxiraOvozi: () => { if (!tugadi) cb.onOgoh?.('ElevenLabs овози ишламади: жавоб OpenAI овози билан ўқилмоқда.'); },
      });

      const soket = new WebSocket(d.wsUrl);
      soket.binaryType = 'arraybuffer';
      ws = soket;
      let sozlandi = false;
      soket.onopen = () => { soket.send(JSON.stringify(geminiSozlashXabari(d.setup))); };
      soket.onmessage = (e) => {
        const xom = typeof e.data === 'string' ? e.data : e.data instanceof ArrayBuffer ? new TextDecoder().decode(e.data) : '';
        if (!sozlandi) {
          const events = geminiXabarOqi(xom, chiqish);
          if (events.some((x) => x.t === 'xato')) { ulanishXatosi('Gemini уланишни рад этди.', 'setup_rad'); return; }
          if (!events.some((x) => x.t === 'tayyor')) return;
          sozlandi = true; tayyor = true;
          clearTimeout(ulanishVaqti);
          void mikrofonniBoshla(mikrofon!).then(() => {
            if (tugadi) return;
            cb.onHolat('eshitmoqda');
            yubor(geminiMatnXabari('Интерфейс: жонли суҳбат бошланди. Қисқа саломлаш ва фойдаланувчини тинглашга тайёрлигингни айт. Асбоб чақирма.'));
            // Model javob bermasa (matn rejimini rad etdi, kvota...) uzoq kutib o'tirmaymiz
            birinchiVaqt = setTimeout(() => ulanishXatosi('Жонли хизмат жавоб бермади. Қайта уриниб кўринг.', 'javob_yoq'), BIRINCHI_JAVOB_MS);
          }).catch(() => ulanishXatosi('Микрофонни ишга тушириб бўлмади. Қайта уриниб кўринг.', 'mikrofon_worklet'));
          vaqt = setTimeout(() => { cb.onXato('Беш дақиқалик суҳбат тугади. Давом этиш учун қайта уланинг.'); bekor(); }, Math.min(d.muddatMs ?? MAKS_MUDDAT_MS, MAKS_MUDDAT_MS));
          return;
        }
        xabarQabul(xom);
      };
      soket.onclose = (e) => {
        if (tugadi) return;
        // Ulanishda yoki suhbat davomida uzilgan Gemini o'rniga OpenAI davom etadi.
        if (zaxiragaOt(sozlandi ? 'yopildi_javobsiz' : `ws_rad_${e.code}`)) return;
        xato(sozlandi ? 'Жонли суҳбат якунланди.' : `Жонли хизмат уланишни рад этди (код ${e.code}). Администратор «Уланишни текшириш»ни босиши керак.`);
      };
      soket.onerror = () => ulanishXatosi('Gemini алоқасида хато. Қайта уланинг.', 'ws_xato');
    } catch (e) {
      if (tugadi) return;
      const nom = (e as Error)?.name;
      // Mikrofon bo'lmasa OpenAI ham ishlamaydi: zaxiraga o'tilmaydi. Qolgan istisnolar (worklet, audio...) Gemini yo'liga xos.
      if (nom === 'NotAllowedError') xato('Микрофонга рухсат беринг ва қайта уланинг.');
      else if (nom === 'NotFoundError') xato('Микрофон топилмади.');
      else ulanishXatosi('Жонли овозга уланиб бўлмади. Оддий микрофон ёки ёзма суҳбатдан фойдаланинг.', `istisno_${nom ?? 'xato'}`);
    }
  };
  void ulan();

  return {
    bekor,
    yubor(matn) {
      if (tugadi || !tayyor || !matn.trim()) return false;
      bolish();
      return yubor(geminiMatnXabari(matn));
    },
    eslat(matn) {
      if (tugadi || !tayyor) return;
      nutq?.toxtat(); bolgich.reset(); modelId = null;
      yubor(geminiMatnXabari(`Интерфейс натижаси: ${matn}. Натижани қисқа ўзбекча айт.`));
    },
  };
}
