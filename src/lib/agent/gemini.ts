import { maxfiyniTozala } from '@/lib/maxfiy';
import { modelAsboblari } from './asboblar';
import { JONLI_MUDDAT_MS, jonliKursatma, jonliSozlama } from './jonli';
import { GEMINI_WS_HOST } from './gemini-protokol';
import { ovozMavjud } from './tts';
import type { AgentKontekst } from './turlar';

/**
 * ============================================================
 *  GEMINI LIVE (jonli suhbatning "miyasi") + ELEVENLABS (ovozi)
 *
 *  Nega OpenAI Realtime o'rniga: o'zbekcha tushunish va tezlik. Qanday
 *  ishlaydi:
 *
 *    1. Brauzer serverdan YAKKA FOYDALANISHLI, qisqa muddatli ("efemer")
 *       token oladi. Asosiy GEMINI_API_KEY brauzerga HECH QACHON chiqmaydi.
 *    2. Token ichiga model, tizim ko'rsatmasi, asboblar va javob turi
 *       qulflanadi (`lockAdditionalFields` yo'q = hammasi qulf): brauzer
 *       ko'rsatmani o'zgartira olmaydi.
 *    3. Brauzer Gemini bilan WebSocket orqali to'g'ridan-to'g'ri gaplashadi
 *       (mikrofon -> 16 kHz PCM). Gemini transkript va native audio bilan javob beradi.
 *    4. Tashqi TTS bo'lsa tayyor javob bitta so'rovda o'qiladi; aks holda native audio ijro etiladi.
 *    5. Asbob chaqiruvlari (Excel, mahalla ko'rsatkichlari...) brauzer
 *       orqali mavjud `/api/agent/jonli` ga boradi: u yerda rol, ko'rish
 *       rejimi va tezlik tekshiriladi (OpenAI yo'li bilan bir xil).
 *
 *  Protokol manbasi: rasmiy `@google/genai` mijozi (efemer token
 *  `POST /v1alpha/auth_tokens`, WebSocket `...BidiGenerateContentConstrained
 *  ?access_token=...`).
 * ============================================================
 */

export const GEMINI_ODATIY_MODEL = 'gemini-3.1-flash-live-preview';
const MODEL_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const BAZA = 'https://generativelanguage.googleapis.com';

export interface GeminiSozlama {
  kalit: string;
  model: string;
  surum: 'v1alpha' | 'v1beta';
  /** 'matn' — TEXT model; 'transkript' — native AUDIO model va transkripsiya. */
  chiqish: 'matn' | 'transkript';
  /** Faqat sinovda (mahalliy soxta server) o'zgaradi */
  baza: string;
  tashqiOvoz: boolean;
}

/** Gemini kaliti bo'lsa ishlaydi; tashqi TTS ixtiyoriy, aks holda native audio. */
export function geminiSozlama(env: NodeJS.ProcessEnv = process.env, opt: { zaxira?: boolean } = {}): GeminiSozlama | null {
  const kalit = env.GEMINI_API_KEY?.trim();
  if (!kalit || env.AGENT_REALTIME === '0' || (!opt.zaxira && env.AGENT_JONLI_PROVAYDER?.trim() === 'openai')) return null;
  const model = env.GEMINI_LIVE_MODEL?.trim() || GEMINI_ODATIY_MODEL;
  if (!MODEL_ID.test(model)) return null;
  const sinovBazasi = env.NODE_ENV !== 'production' && /^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(env.GEMINI_API_BAZA_SINOV ?? '') ? env.GEMINI_API_BAZA_SINOV! : '';
  return {
    kalit, model,
    surum: env.GEMINI_API_SURUM?.trim() === 'v1beta' ? 'v1beta' : 'v1alpha',
    // Native Live modellar audio javob beradi; TEXT talab qilish ulanishni rad ettiradi.
    chiqish: ovozMavjud(env) && env.GEMINI_LIVE_CHIQISH?.trim() === 'matn' ? 'matn' : 'transkript',
    baza: sinovBazasi || BAZA,
    tashqiOvoz: ovozMavjud(env),
  };
}

/**
 * Gemini yo'li ishlamay qolsa (token, WebSocket, javob bermaslik, ElevenLabs...) brauzer OpenAI Realtime'ga
 * o'zi o'tadi: OpenAI eshitadi, o'ylaydi va o'z ovozi bilan gapiradi. Buning uchun OpenAI sozlangan bo'lishi kerak.
 */
export function jonliZaxiraBormi(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(geminiSozlama(env, { zaxira: true })) && jonliSozlama(env, { mahalliyOvoz: true }) !== null;
}

/** Jonli suhbatni qaysi xizmat yuritadi: Gemini (agar to'liq sozlangan) -> OpenAI -> yo'q. */
export function jonliProvayderi(env: NodeJS.ProcessEnv = process.env): 'gemini' | 'openai' | null {
  if (geminiSozlama(env)) return 'gemini';
  return jonliSozlama(env) ? 'openai' : null;
}

/* ───────────── asbob sxemasi: JSON Schema -> Gemini Schema ───────────── */

const TURLAR = new Set(['STRING', 'NUMBER', 'INTEGER', 'BOOLEAN', 'ARRAY', 'OBJECT']);
export type GeminiSxema = { [k: string]: unknown };

/**
 * Gemini `parameters` — OpenAPI qismi: turlar KATTA harfda, `additionalProperties`
 * qabul qilinmaydi (rasmiy mijoz ham shunday qiladi). Mavjud asboblar sxemasi
 * (OpenAI uslubi) shu shaklga o'tkaziladi.
 */
export function geminiSxema(sxema: unknown): GeminiSxema {
  if (typeof sxema !== 'object' || sxema === null || Array.isArray(sxema)) return {};
  const out: GeminiSxema = {};
  for (const [k, v] of Object.entries(sxema as Record<string, unknown>)) {
    if (v === undefined || v === null || k === 'additionalProperties' || k === '$schema') continue;
    if (k === 'type' && typeof v === 'string') {
      const t = v.toUpperCase();
      out.type = TURLAR.has(t) ? t : 'TYPE_UNSPECIFIED';
    } else if (k === 'items') out.items = geminiSxema(v);
    else if (k === 'properties' && typeof v === 'object' && !Array.isArray(v)) {
      out.properties = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([n, s]) => [n, geminiSxema(s)]));
    } else out[k] = v;
  }
  return out;
}

const GEMINI_QOSHIMCHA = `

GEMINI JONLI REJIMI
- Sen MATN yozasan; uni ElevenLabs ovozi o'qiydi. Javobni odatda 2–4 qisqa jumlada yoz. Har jumla nuqta, so'roq yoki undov bilan tugasin.
- Ro'yxat belgilari, jadval, emoji, markdown, qavs ichidagi izoh yozma. Sonlarni o'qishga qulay yoz ("83,5 foiz").
- Asbob natijasini kutayotganda uzun gapirma: natija kelgach javob ber.`;

export interface GeminiSetup {
  model: string;
  generationConfig: { responseModalities: string[]; temperature: number };
  systemInstruction: { parts: { text: string }[] };
  tools?: { functionDeclarations: { name: string; description: string; parameters: GeminiSxema }[] }[];
  inputAudioTranscription: { languageCodes: string[]; customVocabulary: string[] };
  outputAudioTranscription?: Record<string, never>;
  contextWindowCompression: { slidingWindow: Record<string, never> };
}

/** Brauzer Gemini'ga aynan shu `setup` ni yuboradi; token ham shu qiymatga qulflanadi. */
export function geminiSetup(ctx: AgentKontekst, soz: GeminiSozlama, nomlar: string[]): GeminiSetup {
  const asboblar = modelAsboblari(ctx.rol, ctx.oqishFaqat).map((t) => ({
    name: t.function.name, description: t.function.description, parameters: geminiSxema(t.function.parameters),
  }));
  return {
    model: `models/${soz.model}`,
    generationConfig: { responseModalities: [soz.chiqish === 'matn' ? 'TEXT' : 'AUDIO'], temperature: 0.3 },
    systemInstruction: { parts: [{ text: jonliKursatma(ctx, nomlar, soz.tashqiOvoz) + (soz.tashqiOvoz ? GEMINI_QOSHIMCHA : '\nGEMINI JONLI REJIMI: javobni o‘zbekcha ovozda ayt. Qisqa va ravon gapir.') }] },
    ...(asboblar.length ? { tools: [{ functionDeclarations: asboblar }] } : {}),
    inputAudioTranscription: { languageCodes: ['uz-UZ'], customVocabulary: [...nomlar, 'Xatirchi', 'Navoiy', 'mahalla', 'xatlov', 'bandlik', 'Excel hisobot'] },
    contextWindowCompression: { slidingWindow: {} },
    ...(soz.chiqish === 'transkript' ? { outputAudioTranscription: {} } : {}),
  };
}

/* ───────────── efemer token ───────────── */

export class GeminiXatosi extends Error {
  constructor(public kod: 'kalit' | 'ruxsat' | 'chegara' | 'sozlama' | 'tarmoq' | 'vaqt' | 'javob', xabar: string, public holat?: number) {
    super(xabar);
    this.name = 'GeminiXatosi';
  }
}

const TOKEN_NOMI = /^auth_tokens\/[A-Za-z0-9_.~+=/-]{8,1500}$/;

function xatoMatni(holat: number, xom: string): GeminiXatosi {
  let izoh = '';
  try {
    const m = (JSON.parse(xom) as { error?: { message?: unknown } }).error?.message;
    if (typeof m === 'string') izoh = m;
  } catch { /* JSON emas */ }
  const qisqa = maxfiyniTozala(izoh).slice(0, 300);
  if (holat === 401 || holat === 403) return new GeminiXatosi(holat === 401 ? 'kalit' : 'ruxsat', `Gemini kaliti qabul qilinmadi yoki unda ruxsat yo'q (${holat}). ${qisqa}`.trim(), holat);
  if (holat === 429) return new GeminiXatosi('chegara', `Gemini so'rovlar chegarasi yoki kvotasi tugadi (429). ${qisqa}`.trim(), holat);
  if (holat === 400 || holat === 404) return new GeminiXatosi('sozlama', `Gemini sozlamani rad etdi (${holat}). ${qisqa}`.trim(), holat);
  return new GeminiXatosi('javob', `Gemini xizmati xato qaytardi (${holat}). ${qisqa}`.trim(), holat);
}

/**
 * Yakka foydalanishli token. `expireTime` — suhbat vaqti + zaxira,
 * `newSessionExpireTime` — ulanish uchun 90 soniya. Maydon maskasi
 * (`fieldMask`) YUBORILMAYDI: bu "hamma maydon qulflangan" degani.
 */
export async function geminiToken(
  setup: GeminiSetup, soz: GeminiSozlama,
  opt: { signal?: AbortSignal; fetchFn?: typeof fetch; hozir?: Date } = {}
): Promise<{ wsUrl: string }> {
  const hozir = opt.hozir ?? new Date();
  const body = {
    uses: 1,
    expireTime: new Date(hozir.getTime() + JONLI_MUDDAT_MS + 90_000).toISOString(),
    newSessionExpireTime: new Date(hozir.getTime() + 90_000).toISOString(),
    bidiGenerateContentSetup: setup,
  };
  let r: Response;
  try {
    r = await (opt.fetchFn ?? fetch)(`${soz.baza}/${soz.surum}/auth_tokens`, {
      method: 'POST', cache: 'no-store', redirect: 'error',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': soz.kalit },
      body: JSON.stringify(body),
      signal: AbortSignal.any([AbortSignal.timeout(15_000), ...(opt.signal ? [opt.signal] : [])]),
    });
  } catch (e) {
    if ((e as Error)?.name === 'TimeoutError') throw new GeminiXatosi('vaqt', 'Gemini token so\'rovi kechikdi.');
    if ((e as Error)?.name === 'AbortError') throw new GeminiXatosi('vaqt', 'So\'rov bekor qilindi.');
    throw new GeminiXatosi('tarmoq', 'Gemini xizmatiga ulanib bo\'lmadi.');
  }
  const xom = (await r.text().catch(() => '')).slice(0, 20_000);
  if (!r.ok) throw xatoMatni(r.status, xom);
  let nom = '';
  try { nom = String((JSON.parse(xom) as { name?: unknown }).name ?? ''); } catch { /* quyida rad etiladi */ }
  if (!TOKEN_NOMI.test(nom)) throw new GeminiXatosi('javob', 'Gemini token javobi noto\'g\'ri shaklda.');
  const u = new URL(`wss://${GEMINI_WS_HOST}/ws/google.ai.generativelanguage.${soz.surum}.GenerativeService.BidiGenerateContentConstrained`);
  u.searchParams.set('access_token', nom);
  return { wsUrl: u.toString() };
}
