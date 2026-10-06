/**
 * ============================================================
 *  GEMINI LIVE — PROTOKOL (server va brauzer uchun umumiy, sof kod)
 *
 *  Bu modul hech narsaga (baza, muhit, brauzer API) bog'lanmaydi, shuning
 *  uchun uni sinov paytida to'liq tekshirish mumkin.
 *
 *  Xabar shakllari rasmiy `@google/genai` (v2.x) mijozining manba kodidan
 *  olingan: mijoz -> server `setup`, `realtimeInput` (audio / text /
 *  audioStreamEnd), `toolResponse`; server -> mijoz `setupComplete`,
 *  `serverContent` (modelTurn, turnComplete, interrupted,
 *  inputTranscription, outputTranscription), `toolCall`,
 *  `toolCallCancellation`, `goAway`.
 * ============================================================
 */

/** Brauzer faqat shu hostga ulanadi (efemer token boshqa joyga ketmasin). */
export const GEMINI_WS_HOST = 'generativelanguage.googleapis.com';
export const GEMINI_KIRISH_HZ = 16_000;
export const GEMINI_AUDIO_TURI = `audio/pcm;rate=${GEMINI_KIRISH_HZ}`;

const ENG_KATTA_XABAR = 400_000;
const ENG_UZUN_BOLAK = 8_000;

export function geminiWsManziliTogrimi(manzil: string): boolean {
  try {
    const u = new URL(manzil);
    return u.protocol === 'wss:' && u.hostname === GEMINI_WS_HOST && !u.username && !u.password && !u.port &&
      /^\/ws\/google\.ai\.generativelanguage\.v1(alpha|beta)\.GenerativeService\.BidiGenerateContentConstrained$/.test(u.pathname);
  } catch { return false; }
}

/** Server -> mijoz: bitta xabardan chiqadigan hodisalar. */
export type GeminiHodisa =
  | { t: 'tayyor' }
  | { t: 'matn'; matn: string }
  | { t: 'kirish'; matn: string }
  | { t: 'yakun' }
  | { t: 'toxtadi' }
  | { t: 'asbob'; id: string; nomi: string; args: Record<string, unknown> }
  | { t: 'asbob_bekor'; idlar: string[] }
  | { t: 'ketadi' };

const obyektmi = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Bitta server xabarini hodisalarga ajratadi. Noto'g'ri yoki juda katta
 * xabar jimgina tashlanadi: bu yerdan istisno chiqmaydi.
 * `chiqish`: 'matn' — model matn yozadi (modelTurn.parts[].text);
 * 'transkript' — model gapiradi, matn outputTranscription'dan olinadi
 * (Gemini ovozining o'zi ishlatilmaydi).
 */
export function geminiXabarOqi(xom: unknown, chiqish: 'matn' | 'transkript' = 'matn'): GeminiHodisa[] {
  let d: unknown = xom;
  if (typeof xom === 'string') {
    if (xom.length > ENG_KATTA_XABAR) return [];
    try { d = JSON.parse(xom); } catch { return []; }
  }
  if (!obyektmi(d)) return [];
  const out: GeminiHodisa[] = [];

  if (d.setupComplete !== undefined) out.push({ t: 'tayyor' });

  const sc = d.serverContent;
  if (obyektmi(sc)) {
    const kirish = sc.inputTranscription;
    if (obyektmi(kirish) && typeof kirish.text === 'string' && kirish.text) out.push({ t: 'kirish', matn: kirish.text.slice(0, ENG_UZUN_BOLAK) });
    if (sc.interrupted === true) out.push({ t: 'toxtadi' });
    if (chiqish === 'matn') {
      const mt = sc.modelTurn;
      if (obyektmi(mt) && Array.isArray(mt.parts)) {
        for (const p of mt.parts) {
          // "thought" qismlari foydalanuvchiga ko'rsatilmaydi va o'qilmaydi
          if (obyektmi(p) && typeof p.text === 'string' && p.text && p.thought !== true) out.push({ t: 'matn', matn: p.text.slice(0, ENG_UZUN_BOLAK) });
        }
      }
    } else {
      const ch = sc.outputTranscription;
      if (obyektmi(ch) && typeof ch.text === 'string' && ch.text) out.push({ t: 'matn', matn: ch.text.slice(0, ENG_UZUN_BOLAK) });
    }
    if (sc.turnComplete === true) out.push({ t: 'yakun' });
  }

  const tc = d.toolCall;
  if (obyektmi(tc) && Array.isArray(tc.functionCalls)) {
    for (const f of tc.functionCalls.slice(0, 8)) {
      if (!obyektmi(f) || typeof f.name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]{0,79}$/.test(f.name)) continue;
      const id = typeof f.id === 'string' && f.id ? f.id.slice(0, 150) : '';
      if (!id) continue;
      out.push({ t: 'asbob', id, nomi: f.name, args: obyektmi(f.args) ? f.args : {} });
    }
  }
  const tb = d.toolCallCancellation;
  if (obyektmi(tb) && Array.isArray(tb.ids)) {
    const idlar = tb.ids.filter((x): x is string => typeof x === 'string').slice(0, 20);
    if (idlar.length) out.push({ t: 'asbob_bekor', idlar });
  }
  if (obyektmi(d.goAway)) out.push({ t: 'ketadi' });
  return out;
}

/** Server tomonidan kelgan funksiya id'sini serverimiz kutadigan shaklga keltiradi. */
export function asbobIdsiniTozala(id: string): string {
  const t = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 150);
  return t || 'chaqiruv';
}

/* ───────────── mijoz -> server xabarlari ───────────── */

export const geminiSozlashXabari = (setup: unknown) => ({ setup });
export const geminiMatnXabari = (text: string) => ({ realtimeInput: { text } });
export const geminiAudioXabari = (base64: string) => ({ realtimeInput: { audio: { data: base64, mimeType: GEMINI_AUDIO_TURI } } });
export const geminiAsbobJavobi = (javoblar: { id: string; name: string; output: unknown }[]) => ({
  toolResponse: { functionResponses: javoblar.map((j) => ({ id: j.id, name: j.name, response: { output: j.output } })) },
});

/** [-1, 1] oraliqdagi Float32 -> 16 bit little-endian PCM -> base64. */
export function pcm16Base64(f: Float32Array): string {
  const bayt = new Uint8Array(f.length * 2);
  const view = new DataView(bayt.buffer);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    view.setInt16(i * 2, s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), true);
  }
  let ikkilik = '';
  for (let i = 0; i < bayt.length; i += 0x2000) ikkilik += String.fromCharCode(...bayt.subarray(i, i + 0x2000));
  return btoa(ikkilik);
}

/* ───────────── javobni gaplarga bo'lish (ElevenLabs uchun) ───────────── */

/**
 * Model matni oqib kelganda tugallangan gaplarni darhol beradi, shunda
 * ElevenLabs birinchi gapni butun javob yozilishini kutmasdan o'qiy boshlaydi.
 *
 * Chegara — nuqta/so'roq/undov/ko'p nuqtadan KEYIN bo'sh joy yoki yangi qator.
 * "83,5" yoki "12.5" kabi sonlar bo'linmaydi. Juda qisqa bo'laklar
 * birlashtiriladi (ovoz kesik-kesik chiqmasin). Bir javob uchun ovoz
 * so'rovlari soni `engKopBolak` bilan cheklangan: oxirgisi qolgan hamma
 * matnni oladi.
 */
export class GapBolgich {
  private bufer = '';
  private berilgan = 0;

  constructor(
    private readonly engKam = 28,
    private readonly engKamBirinchi = 14,
    private readonly engUzun = 420,
    private readonly engKopBolak = 5
  ) {}

  private oxirgimi(): boolean { return this.berilgan >= this.engKopBolak - 1; }

  push(matn: string): string[] {
    this.bufer += matn;
    const chiqdi: string[] = [];
    if (this.oxirgimi()) return chiqdi;
    for (;;) {
      const kam = this.berilgan === 0 ? this.engKamBirinchi : this.engKam;
      const i = this.chegara(kam);
      if (i < 0) break;
      const bolak = this.bufer.slice(0, i).trim();
      this.bufer = this.bufer.slice(i).replace(/^\s+/, '');
      if (bolak) { chiqdi.push(bolak); this.berilgan++; }
      if (this.oxirgimi()) break;
    }
    return chiqdi;
  }

  /** Javob tugadi: qolgan matn ham beriladi. */
  flush(): string[] {
    const q = this.bufer.trim();
    this.bufer = '';
    this.berilgan = 0;
    return q ? [q] : [];
  }

  reset(): void { this.bufer = ''; this.berilgan = 0; }

  /** `kam` belgidan uzun, gap tugagan eng qisqa oldingi joy; topilmasa -1. */
  private chegara(kam: number): number {
    const re = /[.!?…]+(?=\s)|\n\s*\n/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.bufer))) {
      const oxir = m.index + m[0].length;
      if (this.bufer.slice(0, oxir).trim().length >= kam) return oxir;
    }
    // Juda uzun, tugamagan gap: oxirgi vergul/bo'sh joyda kesamiz
    if (this.bufer.length >= this.engUzun) {
      const q = this.bufer.slice(0, this.engUzun);
      const k = Math.max(q.lastIndexOf(', '), q.lastIndexOf(' '));
      return k > kam ? k + 1 : this.engUzun;
    }
    return -1;
  }
}
