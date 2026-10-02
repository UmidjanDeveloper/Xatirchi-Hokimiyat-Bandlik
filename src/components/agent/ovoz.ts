/**
 * ============================================================
 *  HUDHUD: OVOZ KIRISH VA CHIQISH (brauzer tomoni)
 *
 *  Kirish (ovozni matnga aylantirish), ikki yo'l:
 *    1. Brauzerning o'z ovoz tanishi (Web Speech, `uz-UZ`) — Chrome/Edge va
 *       Android'da bor. Tez va bepul, lekin audio brauzer ishlab chiqaruvchisi
 *       (Chrome'da — Google) serveriga ketadi.
 *    2. Zaxira: mikrofon yozuvi → bizning `/api/agent/ovoz` → OpenAI/Groq.
 *       Faqat birinchi yo'l ishlamasa (iPhone, Firefox, til qo'llanmasa) va
 *       server yo'li yoqilgan bo'lsa.
 *
 *  Chiqish: faqat qurilmada O'ZBEKCHA ovoz BOR bo'lsa. Rus yoki ingliz
 *  ovozi o'zbekcha matnni o'qisa — tushunib bo'lmaydigan tovush chiqadi va
 *  hokimga yomon taassurot beradi: bunday holda javob faqat yoziladi.
 * ============================================================
 */

export type OvozXatosi = 'ruxsat' | 'eshitilmadi' | 'qollanmaydi' | 'tarmoq' | 'server';

export interface OvozHodisalari {
  onOraliq(matn: string): void;
  onYakuniy(matn: string): void;
  onXato(kod: OvozXatosi, xabar?: string): void;
  onTugadi(): void;
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
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function ovozKirishMumkinmi(serverMumkin: boolean): boolean {
  return Boolean(tanishKonstruktori()) || (serverMumkin && yozuvMumkinmi());
}

const ENG_UZUN_YOZUV_MS = 15_000;

function yozuvTuri(): string {
  const nomzodlar = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return nomzodlar.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
}

async function serverdaMatnga(blob: Blob, soniya: number): Promise<{ matn?: string; xabar?: string }> {
  const forma = new FormData();
  const kengaytma = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  forma.set('audio', blob, `ovoz.${kengaytma}`);
  forma.set('soniya', String(Math.max(1, Math.round(soniya))));
  const r = await fetch('/api/agent/ovoz', { method: 'POST', body: forma });
  const d = (await r.json().catch(() => ({}))) as { matn?: string; xabar?: string };
  return r.ok ? { matn: d.matn } : { xabar: d.xabar };
}

/** Mikrofon yozuvi → server */
function yozuvniBoshla(h: OvozHodisalari): { toxtat(): void } {
  let toxtatildi = false;
  let yozuvchi: MediaRecorder | null = null;
  let oqim: MediaStream | null = null;
  let taymer: ReturnType<typeof setTimeout> | null = null;
  const boshlandi = Date.now();

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((s) => {
      oqim = s;
      if (toxtatildi) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      const tur = yozuvTuri();
      const bolaklar: Blob[] = [];
      yozuvchi = new MediaRecorder(s, tur ? { mimeType: tur } : undefined);
      yozuvchi.ondataavailable = (e) => e.data.size > 0 && bolaklar.push(e.data);
      yozuvchi.onstop = async () => {
        oqim?.getTracks().forEach((t) => t.stop());
        if (taymer) clearTimeout(taymer);
        const soniya = (Date.now() - boshlandi) / 1000;
        if (bolaklar.length === 0 || soniya < 0.6) {
          h.onXato('eshitilmadi');
          h.onTugadi();
          return;
        }
        try {
          const n = await serverdaMatnga(new Blob(bolaklar, { type: yozuvchi?.mimeType || tur || 'audio/webm' }), soniya);
          if (n.matn) h.onYakuniy(n.matn);
          else h.onXato('server', n.xabar);
        } catch {
          h.onXato('tarmoq');
        }
        h.onTugadi();
      };
      yozuvchi.start();
      taymer = setTimeout(() => yozuvchi?.state === 'recording' && yozuvchi.stop(), ENG_UZUN_YOZUV_MS);
    })
    .catch(() => {
      h.onXato('ruxsat');
      h.onTugadi();
    });

  return {
    toxtat() {
      toxtatildi = true;
      if (yozuvchi && yozuvchi.state === 'recording') yozuvchi.stop();
      else {
        oqim?.getTracks().forEach((t) => t.stop());
      }
    },
  };
}

/**
 * Ovoz kiritishni boshlaydi. Qaytgan `toxtat()` — foydalanuvchi mikrofon
 * tugmasini qayta bosganda.
 */
export function ovozniBoshla(h: OvozHodisalari, serverMumkin: boolean): { toxtat(): void } {
  const K = tanishKonstruktori();
  if (!K) {
    if (serverMumkin && yozuvMumkinmi()) return yozuvniBoshla(h);
    h.onXato('qollanmaydi');
    h.onTugadi();
    return { toxtat() {} };
  }

  const r = new K();
  r.lang = 'uz-UZ';
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;

  let yakuniy = '';
  let xatoBerildi = false;
  let almashdi: { toxtat(): void } | null = null;

  r.onresult = (e) => {
    let oraliq = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) yakuniy += `${t} `;
      else oraliq += t;
    }
    h.onOraliq(`${yakuniy}${oraliq}`.trim());
  };

  r.onerror = (e) => {
    if (e.error === 'aborted') return;
    xatoBerildi = true;
    if (e.error === 'no-speech') return h.onXato('eshitilmadi');
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') return h.onXato('ruxsat');
    /* Til qo'llanmaydi yoki tarmoq: server zaxirasi bor bo'lsa, shunga o'tamiz */
    if (serverMumkin && yozuvMumkinmi()) {
      almashdi = yozuvniBoshla(h);
      return;
    }
    h.onXato(e.error === 'network' ? 'tarmoq' : 'qollanmaydi');
  };

  r.onend = () => {
    if (almashdi) return;
    if (!xatoBerildi) {
      if (yakuniy.trim()) h.onYakuniy(yakuniy.trim());
      else h.onXato('eshitilmadi');
    }
    h.onTugadi();
  };

  try {
    r.start();
  } catch {
    h.onXato('qollanmaydi');
    h.onTugadi();
    return { toxtat() {} };
  }

  return {
    toxtat() {
      if (almashdi) almashdi.toxtat();
      else r.stop();
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
