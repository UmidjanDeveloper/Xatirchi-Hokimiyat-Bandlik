/**
 * ============================================================
 *  KOALA: OVOZ KIRISH VA CHIQISH (brauzer tomoni)
 *
 *  Kirish (ovozni matnga aylantirish), ikki yo'l:
 *    1. Brauzerning o'z ovoz tanishi (Web Speech, `uz-UZ`) — Chrome/Edge va
 *       Android'da bor. Tez va bepul, lekin audio brauzer ishlab chiqaruvchisi
 *       (Chrome'da — Google) serveriga ketadi.
 *    2. Zaxira: mikrofon yozuvi (PCM → 16 kHz WAV, `ovoz-yozuv.ts`) →
 *       bizning `/api/agent/ovoz` → OpenAI/Groq.
 *       Server yo'li yoqilgan bo'lsa, quyidagi hollarda shu yo'l ishlatiladi:
 *         · iPhone/iPad (barcha brauzerlarda): Apple ovoz tanishi o'zbekchani
 *           bilmaydi, Chrome iOS'da esa umuman ruxsat bermaydi;
 *         · brauzerda ovoz tanish yo'q (Firefox);
 *         · brauzer tanishi xato bersa (ruxsat/xizmat/til/tarmoq).
 *
 *  ── Nega qayta yozildi (iPhone'dagi nuqson) ──
 *
 *  Avval iPhone'da brauzer tanishi "not-allowed/service-not-allowed" deb
 *  xato bergach: (a) zaxiraga O'TILMAS edi, (b) "tugadi" signali kelmagani
 *  uchun oyna "eshitmoqda" holatida QOTIB QOLARDI (to'xtatish tugmasi
 *  ishlamasdi). Endi:
 *
 *    · har qanday yo'l (muvaffaqiyat, xato, bekor qilish, kutilmagan
 *      uzilish) `onTugadi`ni aynan BIR marta chaqiradi — holat doim tiklanadi;
 *    · brauzer tanishi "tugadi" demasa ham, xatodan keyin va to'xtatishdan
 *      keyin kutish vaqti o'tgach o'zi yakunlanadi;
 *    · yozuv yo'lida jimlikni `NutqKuzatuvchisi` aniqlaydi: gapirib
 *      bo'lingach yozuv o'zi to'xtaydi;
 *    · oyna yopilsa yoki ilova fonga o'tsa — yozuv yuborilmasdan bekor
 *      qilinadi va mikrofon bo'shatiladi.
 *
 *  Chiqish: faqat qurilmada O'ZBEKCHA ovoz BOR bo'lsa. Rus yoki ingliz
 *  ovozi o'zbekcha matnni o'qisa — tushunib bo'lmaydigan tovush chiqadi va
 *  hokimga yomon taassurot beradi: bunday holda javob faqat yoziladi.
 * ============================================================
 */

import { JIMLIK_RMS, NutqKuzatuvchisi } from './nutq-kuzatuv';
import { YUBORISH_CHASTOTASI, birlashtir, namunalash, nutqOraligi, wavYoz } from './ovoz-yozuv';

export type OvozXatosi = 'ruxsat' | 'mikrofonYoq' | 'mikrofonBand' | 'eshitilmadi' | 'qollanmaydi' | 'tarmoq' | 'server';

export interface OvozHodisalari {
  /** Brauzer tanishining oraliq matni */
  onOraliq(matn: string): void;
  /** Tayyor matn: yuboriladi */
  onYakuniy(matn: string): void;
  onXato(kod: OvozXatosi, xabar?: string): void;
  /** HAR DOIM, aynan bir marta (muvaffaqiyat, xato yoki bekor qilishdan keyin): holatni tiklash */
  onTugadi(): void;
  /** Yozuv tugadi, server matnga aylantirmoqda */
  onIshlov?(): void;
  /** Mikrofon kuchi, 0..1 (yozuv yo'lida) */
  onDaraja?(d: number): void;
}

export interface OvozBoshqaruvi {
  /** Foydalanuvchi "to'xtat" bosdi: eshitganini yakunla va yubor */
  toxtat(): void;
  /** Hech narsa yubormasdan to'xtat (oyna yopildi, ilova fonga o'tdi) */
  bekor(): void;
}

/* Web Speech turlari TypeScript'ning standart kutubxonasida to'liq emas */
interface TanishHodisasi {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
}
interface Tanish {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: TanishHodisasi) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function tanishKonstruktori(): (new () => Tanish) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Tanish; webkitSpeechRecognition?: new () => Tanish };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function yozuvMumkinmi(): boolean {
  return typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && Boolean(audioKonstruktori());
}

export function ovozKirishMumkinmi(serverMumkin: boolean): boolean {
  return Boolean(tanishKonstruktori()) || (serverMumkin && yozuvMumkinmi());
}

/** iPhone/iPad (iPadOS ba'zan "Mac" deb tanishtiradi) — brauzeridan qat'i nazar WebKit */
export function iosMi(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);
}

/* ── Xatolarni xaritalash (sof funksiyalar: brauzersiz sinaladi) ── */

export type TanishXatoQarori = { tur: 'xato'; kod: OvozXatosi } | { tur: 'zaxira' } | { tur: 'otkaz' };

/**
 * Web Speech xatosi nima qilishni belgilaydi.
 *  · "aborted" — o'zimiz to'xtatdik: e'tibor bermaymiz;
 *  · "no-speech" — jim: zaxira foyda bermaydi;
 *  · zaxira BOR bo'lsa, qolgan HAR QANDAY xatoda unga o'tamiz (ruxsat, xizmat,
 *    til, tarmoq): zaxira o'zi aniq sababni (ruxsat yoki mikrofon) aytadi;
 *  · zaxira yo'q bo'lsa, xato foydalanuvchiga tushuntiriladi.
 */
export function tanishXatosiniHalEt(kod: string, zaxiraBor: boolean): TanishXatoQarori {
  if (kod === 'aborted') return { tur: 'otkaz' };
  if (kod === 'no-speech') return { tur: 'xato', kod: 'eshitilmadi' };
  if (zaxiraBor) return { tur: 'zaxira' };
  if (kod === 'not-allowed') return { tur: 'xato', kod: 'ruxsat' };
  if (kod === 'audio-capture') return { tur: 'xato', kod: 'mikrofonYoq' };
  if (kod === 'network') return { tur: 'xato', kod: 'tarmoq' };
  /* service-not-allowed, language-not-supported, bad-grammar va noma'lum */
  return { tur: 'xato', kod: 'qollanmaydi' };
}

/** getUserMedia xatosi (DOMException.name) → foydalanuvchiga tushunarli sabab */
export function mikrofonXatosi(nom: string): OvozXatosi {
  if (nom === 'NotAllowedError' || nom === 'SecurityError' || nom === 'PermissionDeniedError') return 'ruxsat';
  if (nom === 'NotFoundError' || nom === 'DevicesNotFoundError' || nom === 'OverconstrainedError') return 'mikrofonYoq';
  /* NotReadableError, AbortError, TrackStartError va noma'lum: mikrofon band yoki ochilmadi */
  return 'mikrofonBand';
}

/* ── Seans: onYakuniy/onXato + onTugadi aynan BIR marta ── */

interface Seans {
  yakuniy(matn: string): void;
  xato(kod: OvozXatosi, xabar?: string): void;
  bekor(): void;
}

function seansYarat(h: OvozHodisalari): Seans {
  let tugadi = false;
  return {
    yakuniy(matn) {
      if (tugadi) return;
      tugadi = true;
      h.onYakuniy(matn);
      h.onTugadi();
    },
    xato(kod, xabar) {
      if (tugadi) return;
      tugadi = true;
      h.onXato(kod, xabar);
      h.onTugadi();
    },
    bekor() {
      if (tugadi) return;
      tugadi = true;
      h.onTugadi();
    },
  };
}

/* ── 1-yo'l: brauzerning o'z ovoz tanishi ── */

/** Permission so'rovi + gapirish uchun eng uzun vaqt */
const ENG_UZUN_TANISH_MS = 30_000;
/** "To'xtat"dan keyin brauzer `end` demasa, shuncha kutib o'zimiz yakunlaymiz */
const TOXTATISHDAN_KEYIN_MS = 2_000;

function brauzerTanishi(h: OvozHodisalari, s: Seans, zaxiraga: (() => void) | null): OvozBoshqaruvi {
  const K = tanishKonstruktori() as new () => Tanish;
  const r = new K();
  r.lang = 'uz-UZ';
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;

  let yakuniy = '';
  let oraliq = '';
  let tugadi = false;
  let soatlar: ReturnType<typeof setTimeout>[] = [];

  const soat = (f: () => void, ms: number) => {
    soatlar.push(setTimeout(f, ms));
  };
  /** Bu dvigatel ishini tugatdi: taymerlar to'xtaydi, tanish to'xtatiladi */
  const yech = () => {
    tugadi = true;
    soatlar.forEach(clearTimeout);
    soatlar = [];
    try {
      r.abort();
    } catch {
      /* allaqachon to'xtagan */
    }
  };
  const yakunla = () => {
    if (tugadi) return;
    yech();
    const m = (yakuniy || oraliq).replace(/\s+/g, ' ').trim();
    if (m) s.yakuniy(m);
    else s.xato('eshitilmadi');
  };

  r.onresult = (e) => {
    let hozir = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) yakuniy += `${t} `;
      else hozir += t;
    }
    oraliq = `${yakuniy}${hozir}`.trim();
    if (!tugadi) h.onOraliq(oraliq);
  };

  r.onerror = (e) => {
    if (tugadi) return;
    const q = tanishXatosiniHalEt(e.error, Boolean(zaxiraga));
    if (q.tur === 'otkaz') return;
    yech();
    /* `end` kelishini KUTMAYMIZ: iPhone'da xatodan keyin u kelmaydi */
    if (q.tur === 'zaxira' && zaxiraga) zaxiraga();
    else s.xato(q.tur === 'xato' ? q.kod : 'qollanmaydi');
  };

  r.onend = yakunla;

  try {
    r.start();
  } catch {
    yech();
    if (zaxiraga) zaxiraga();
    else s.xato('qollanmaydi');
    return { toxtat() {}, bekor() {} };
  }
  soat(yakunla, ENG_UZUN_TANISH_MS);

  return {
    toxtat() {
      if (tugadi) return;
      try {
        r.stop();
      } catch {
        /* hali boshlanmagan */
      }
      soat(yakunla, TOXTATISHDAN_KEYIN_MS);
    },
    bekor() {
      if (!tugadi) yech();
    },
  };
}

/* ── 2-yo'l: mikrofon yozuvi → server ── */

const ENG_UZUN_YOZUV_MS = 15_000;
/** Mikrofon ruxsatini kutishning eng uzun vaqti */
const RUXSAT_KUTISH_MS = 30_000;
const SERVERNI_KUTISH_MS = 25_000;
/** Nutq kuzatuvi: shuncha millisekundlik bo'lak uchun bitta kuch qiymati */
const KADR_MS = 50;
/** Mikrofon ochilgach shuncha vaqt ovoz bo'lagi kelmasa — mikrofon ishga tushmagan */
const BOLAK_KUTISH_MS = 4_000;
/** Kesilgan yozuv bundan qisqa bo'lsa — "eshitilmadi" */
const ENG_QISQA_YOZUV_S = 0.6;

interface ServerJavobi {
  holat: number;
  matn?: string;
  xabar?: string;
}

async function serverdaMatnga(blob: Blob, soniya: number, signal: AbortSignal): Promise<ServerJavobi> {
  const forma = new FormData();
  forma.set('audio', blob, 'ovoz.wav');
  forma.set('soniya', String(Math.max(1, Math.round(soniya))));
  const r = await fetch('/api/agent/ovoz', { method: 'POST', body: forma, signal });
  if (r.status === 401 && typeof window !== 'undefined') window.location.href = '/kirish';
  const d = (await r.json().catch(() => ({}))) as { matn?: string; xabar?: string };
  return { holat: r.status, matn: r.ok ? d.matn : undefined, xabar: d.xabar };
}

type AudioKonstruktori = new () => AudioContext;
function audioKonstruktori(): AudioKonstruktori | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioKonstruktori; webkitAudioContext?: AudioKonstruktori };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

type ToxtatishSababi = 'qol' | 'jimlik' | 'nutq-yoq' | 'vaqt';

/**
 * Mikrofondan PCM yig'iladi (WebAudio), nutq atrofi kesiladi, 16 kHz WAV bo'lib
 * serverga ketadi. Gap tugashini `NutqKuzatuvchisi` aniqlaydi.
 */
function yozuvniBoshla(h: OvozHodisalari, s: Seans): OvozBoshqaruvi {
  let oqim: MediaStream | null = null;
  let audio: AudioContext | null = null;
  let manba: MediaStreamAudioSourceNode | null = null;
  let islov: ScriptProcessorNode | null = null;
  let nol: GainNode | null = null;
  let chegara: ReturnType<typeof setTimeout> | null = null;
  let ruxsatTaymeri: ReturnType<typeof setTimeout> | null = null;
  let bolakTaymeri: ReturnType<typeof setTimeout> | null = null;
  let tugadi = false;
  let sabab: ToxtatishSababi | null = null;
  let bolakKeldi = false;
  let namunalar = 0;
  let tezlik = 48_000;
  const bolaklar: Float32Array[] = [];
  const kuzatuv = new NutqKuzatuvchisi();
  const yuklash = new AbortController();

  /*
   * AudioContext foydalanuvchi bosishi ICHIDA yaratilishi kerak (iPhone):
   * shu sababli getUserMedia'ni kutmasdan, hozir yaratamiz.
   */
  const AC = audioKonstruktori();
  try {
    if (AC) {
      audio = new AC();
      tezlik = audio.sampleRate;
      audio.resume?.().catch(() => {});
    }
  } catch {
    audio = null;
  }
  if (!audio) {
    s.xato('qollanmaydi');
    return { toxtat() {}, bekor() {} };
  }

  /** Mikrofon, taymerlar va audio kontekst — hammasi bo'shatiladi (indikator o'chadi) */
  const bosha = () => {
    for (const t of [chegara, ruxsatTaymeri, bolakTaymeri]) if (t) clearTimeout(t);
    chegara = ruxsatTaymeri = bolakTaymeri = null;
    if (islov) {
      islov.onaudioprocess = null;
      try {
        islov.disconnect();
      } catch {
        /* allaqachon uzilgan */
      }
      islov = null;
    }
    for (const n of [manba, nol]) {
      try {
        n?.disconnect();
      } catch {
        /* allaqachon uzilgan */
      }
    }
    manba = nol = null;
    oqim?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* allaqachon to'xtagan */
      }
    });
    oqim = null;
    if (audio) {
      const a = audio;
      audio = null;
      a.close?.().catch(() => {});
    }
    h.onDaraja?.(0);
  };

  const yakunla = async () => {
    if (tugadi) return;
    tugadi = true;
    bosha(); // mikrofon DARHOL bo'shaydi

    /* Nutq atrofi kesiladi: jim yozuvga model "o'ylab topilgan" matn qaytarishi mumkin */
    const butun = birlashtir(bolaklar);
    const { bosh, oxir } = nutqOraligi(butun.length, tezlik, kuzatuv.nutqBoshiMs, kuzatuv.nutqOxiriMs);
    const pcm = namunalash(butun.subarray(bosh, oxir), tezlik);
    const soniya = pcm.length / YUBORISH_CHASTOTASI;

    /* Hech narsa eshitilmadi: serverga yuborib pul sarflamaymiz */
    if (sabab === 'nutq-yoq' && kuzatuv.engKuchli < JIMLIK_RMS) return s.xato('eshitilmadi');
    if (soniya < ENG_QISQA_YOZUV_S) return s.xato('eshitilmadi');

    h.onIshlov?.();
    const soat = setTimeout(() => yuklash.abort(), SERVERNI_KUTISH_MS);
    try {
      const n = await serverdaMatnga(new Blob([wavYoz(pcm)], { type: 'audio/wav' }), soniya, yuklash.signal);
      if (n.matn) s.yakuniy(n.matn);
      else s.xato(n.holat === 422 ? 'eshitilmadi' : 'server', n.xabar);
    } catch {
      s.xato('tarmoq');
    } finally {
      clearTimeout(soat);
    }
  };

  const toxtatish = (q: ToxtatishSababi) => {
    if (tugadi || sabab) return;
    sabab = q;
    if (!oqim || !islov) {
      /* Yozuv hali boshlanmagan (ruxsat kutilmoqda): hech narsa yuborilmaydi */
      tugadi = true;
      bosha();
      s.bekor();
      return;
    }
    setTimeout(() => void yakunla(), 0);
  };

  /** Har ovoz bo'lagi: nusxa olinadi, 50 ms li kadrlar bo'yicha kuch o'lchanadi */
  const bolakKeldiFn = (e: AudioProcessingEvent) => {
    if (tugadi || sabab) return;
    bolakKeldi = true;
    const nusxa = new Float32Array(e.inputBuffer.getChannelData(0)); // brauzer buferni qayta ishlatadi: NUSXA shart
    bolaklar.push(nusxa);
    const kadr = Math.max(1, Math.round((tezlik * KADR_MS) / 1000));
    for (let i = 0; i < nusxa.length; i += kadr) {
      const oxirI = Math.min(nusxa.length, i + kadr);
      let yig = 0;
      for (let j = i; j < oxirI; j++) yig += nusxa[j] * nusxa[j];
      const rms = Math.sqrt(yig / (oxirI - i));
      namunalar += oxirI - i;
      h.onDaraja?.(Math.min(1, rms * 6));
      const qaror = kuzatuv.kadr(rms, (namunalar / tezlik) * 1000);
      if (qaror !== 'davom') {
        toxtatish(qaror === 'nutq-tugadi' ? 'jimlik' : qaror === 'nutq-yoq' ? 'nutq-yoq' : 'vaqt');
        break;
      }
    }
  };

  ruxsatTaymeri = setTimeout(() => {
    if (oqim || tugadi) return;
    tugadi = true; // keyin kelsa — `.then` bo'shatadi
    bosha();
    s.xato('ruxsat');
  }, RUXSAT_KUTISH_MS);

  navigator.mediaDevices
    .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })
    .then((stream) => {
      if (ruxsatTaymeri) clearTimeout(ruxsatTaymeri);
      ruxsatTaymeri = null;
      oqim = stream;
      if (tugadi || !audio) return bosha(); // kutish paytida bekor qilingan
      try {
        manba = audio.createMediaStreamSource(stream);
        islov = audio.createScriptProcessor(4096, 1, 1);
        nol = audio.createGain();
        nol.gain.value = 0; // o'zimizning ovozimiz karnayga chiqmasin
        manba.connect(islov);
        islov.connect(nol);
        nol.connect(audio.destination);
        islov.onaudioprocess = bolakKeldiFn;
      } catch {
        tugadi = true;
        bosha();
        return s.xato('qollanmaydi');
      }
      chegara = setTimeout(() => toxtatish('vaqt'), ENG_UZUN_YOZUV_MS + 1000);
      /* Bo'laklar kelmasa (iPhone'da kontekst to'xtab qolgan bo'lishi mumkin): bir marta qayta urinamiz */
      bolakTaymeri = setTimeout(() => {
        if (bolakKeldi || tugadi) return;
        audio?.resume?.().catch(() => {});
        bolakTaymeri = setTimeout(() => {
          if (bolakKeldi || tugadi) return;
          tugadi = true;
          bosha();
          s.xato('mikrofonBand');
        }, BOLAK_KUTISH_MS / 2);
      }, BOLAK_KUTISH_MS / 2);
    })
    .catch((e: unknown) => {
      if (ruxsatTaymeri) clearTimeout(ruxsatTaymeri);
      ruxsatTaymeri = null;
      if (tugadi) return;
      tugadi = true;
      bosha();
      s.xato(mikrofonXatosi((e as { name?: string } | null)?.name ?? ''));
    });

  return {
    toxtat() {
      toxtatish('qol');
    },
    bekor() {
      yuklash.abort(); // server so'rovi ketayotgan bo'lsa ham to'xtaydi
      if (tugadi) return;
      tugadi = true;
      sabab = sabab ?? 'qol';
      bosha();
    },
  };
}

/**
 * Ovoz kiritishni boshlaydi. Mikrofon tugmasi bosilishi ICHIDA chaqiriladi
 * (iPhone shuni talab qiladi). Qaytgan boshqaruv: `toxtat()` — foydalanuvchi
 * tugmani qayta bosdi; `bekor()` — oyna yopildi.
 */
export function ovozniBoshla(h: OvozHodisalari, serverMumkin: boolean): OvozBoshqaruvi {
  const s = seansYarat(h);
  const zaxiraBor = serverMumkin && yozuvMumkinmi();
  let joriy: OvozBoshqaruvi | null = null;
  const yozuvgaOt = () => {
    joriy = yozuvniBoshla(h, s);
  };

  try {
    if (!tanishKonstruktori()) {
      if (zaxiraBor) yozuvgaOt();
      else s.xato('qollanmaydi');
    } else if (zaxiraBor && iosMi()) {
      /* iPhone: Apple tanishi o'zbekchani bilmaydi, Chrome iOS'da ruxsat bermaydi — to'g'ridan-to'g'ri yozuv */
      yozuvgaOt();
    } else {
      joriy = brauzerTanishi(h, s, zaxiraBor ? yozuvgaOt : null);
    }
  } catch {
    s.xato('qollanmaydi');
  }

  return {
    toxtat() {
      joriy?.toxtat();
    },
    bekor() {
      joriy?.bekor();
      s.bekor();
    },
  };
}

/* ── Chiqish: faqat o'zbekcha ovoz bo'lsa ── */

export function uzbekOvozi(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('uz')) ?? null;
}

export function ovozliJavobMumkinmi(): boolean {
  return uzbekOvozi() !== null;
}

/** O'zbekcha ovoz bo'lsa o'qiydi va `true` qaytaradi; bo'lmasa — hech narsa qilmaydi */
export function gapir(matn: string, tugadi: () => void): boolean {
  const ovoz = uzbekOvozi();
  if (!ovoz) return false;
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(matn);
  u.voice = ovoz;
  u.lang = ovoz.lang;
  u.rate = 0.95;
  u.onend = tugadi;
  u.onerror = tugadi;
  s.speak(u);
  return true;
}

export function gapirishniToxtat(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
