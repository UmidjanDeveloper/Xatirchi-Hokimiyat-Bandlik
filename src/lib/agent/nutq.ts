import { lotinga } from '@/lib/alifbo';
import { maxfiyniTozala } from '@/lib/maxfiy';
import { javobniTozala } from './matnlar';
import { ENG_UZUN_NUTQ } from './chegaralar';
import { elevenlabsNutq } from './elevenlabs';

export { ENG_UZUN_NUTQ };
const OVOZLAR = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'coral', 'sage', 'ash', 'marin', 'cedar'] as const;

export interface NutqProvayderi { provayder?: 'openai' | 'elevenlabs'; kalit: string; model: string; ovoz: string }

export function nutqXizmati(env: NodeJS.ProcessEnv = process.env): 'openai' | 'elevenlabs' | 'noma_lum' {
  const tanlov = env.AGENT_TTS_PROVIDER?.trim();
  if (tanlov) return tanlov === 'openai' || tanlov === 'elevenlabs' ? tanlov : 'noma_lum';
  return env.ELEVENLABS_API_KEY?.trim() ? 'elevenlabs' : 'openai';
}

/** Configuration status only; never expose keys or placeholders. */
export function nutqUlanishi(env: NodeJS.ProcessEnv = process.env): 'tayyor' | 'kalit_yoq' | 'ochirilgan' | 'ovoz_id_yoq' | 'sozlama_xato' {
  const xizmat = nutqXizmati(env);
  if (xizmat === 'noma_lum') return 'sozlama_xato';
  if (!(xizmat === 'elevenlabs' ? env.ELEVENLABS_API_KEY : env.OPENAI_API_KEY)?.trim()) return 'kalit_yoq';
  if (env.AGENT_TTS !== '1') return 'ochirilgan';
  if (xizmat === 'elevenlabs') {
    if (!env.ELEVENLABS_VOICE_ID?.trim()) return 'ovoz_id_yoq';
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(env.ELEVENLABS_VOICE_ID.trim()) ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_v3')) return 'sozlama_xato';
  }
  return 'tayyor';
}

/** Ovoz chiqishi suhbat provayderidan mustaqil: Groq suhbat + OpenAI nutq ham mumkin. */
export function nutqProvayderi(env: NodeJS.ProcessEnv = process.env): NutqProvayderi | null {
  if (nutqUlanishi(env) !== 'tayyor') return null;
  if (nutqXizmati(env) === 'elevenlabs') return {
    provayder: 'elevenlabs', kalit: env.ELEVENLABS_API_KEY!.trim(),
    model: env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_v3', ovoz: env.ELEVENLABS_VOICE_ID!.trim(),
  };
  const kalit = env.OPENAI_API_KEY?.trim();
  if (!kalit || env.AGENT_TTS !== '1') return null;
  const ovoz = env.AGENT_TTS_VOICE?.trim() ?? '';
  return {
    provayder: 'openai',
    kalit,
    model: env.AGENT_TTS_MODEL?.trim() || 'gpt-4o-mini-tts',
    ovoz: (OVOZLAR as readonly string[]).includes(ovoz) ? ovoz : 'cedar',
  };
}

/** Kirilldan lotinga o'tish va yozma belgilarning ovozda ravon o'qilishi. */
export function nutqMatni(matn: string): string {
  return lotinga(javobniTozala(matn))
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/(\d[\d ,.]*)\s*%/g, '$1 foiz')
    .replace(/\bMFY\b/g, 'mahalla fuqarolar yig‘ini')
    .replace(/\bPDF\b/g, 'pi di ef')
    .replace(/\s+/g, ' ')
    .trim();
}

export class NutqXatosi extends Error {
  constructor(public kod: 'vaqt' | 'tarmoq' | 'provayder' | 'bosh', xabar: string) {
    super(xabar);
    this.name = 'NutqXatosi';
  }
}

/** Kalit serverda qoladi; audio va javob matni disk yoki bazaga yozilmaydi. */
export async function nutqYarat(
  prov: NutqProvayderi, matn: string,
  opt: { signal?: AbortSignal; fetchFn?: typeof fetch; kutishMs?: number } = {}
): Promise<ArrayBuffer> {
  const input = nutqMatni(matn);
  if (!input || matn.length > ENG_UZUN_NUTQ) throw new NutqXatosi('bosh', 'Nutq matni noto‘g‘ri');
  if (prov.provayder === 'elevenlabs') return elevenlabsNutq(prov, input, opt);
  const ctrl = new AbortController();
  const bekor = () => ctrl.abort();
  const taymer = setTimeout(bekor, opt.kutishMs ?? 20_000);
  opt.signal?.addEventListener('abort', bekor, { once: true });
  if (opt.signal?.aborted) bekor();
  let model = prov.model;
  let izoh = !/^tts-1/.test(model);
  try {
    for (let urinish = 0; urinish < 3; urinish++) {
      ctrl.signal.throwIfAborted();
      const r = await (opt.fetchFn ?? fetch)('https://api.openai.com/v1/audio/speech', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${prov.kalit}` },
        body: JSON.stringify({
          model, voice: /^tts-1/.test(model) && !OVOZLAR.slice(0, 6).includes(prov.ovoz as typeof OVOZLAR[0]) ? 'onyx' : prov.ovoz,
          input, response_format: 'mp3', speed: 1,
          ...(izoh ? { instructions: 'Speak only in natural literary Uzbek (uz-UZ), like a native Uzbek-speaking professional assistant, without Russian or English intonation. Keep a warm, confident conversational voice; sound pleased when the text confirms success and firm, never aggressive, when reminding about overdue tasks. Pronounce Uzbek o‘, g‘, q, x, h, sh and ch clearly. Use conversational phrasing, brief pauses between sentences, and read numbers in Uzbek. Do not add any words or translate the text.' } : {}),
        }),
      });
      if (!r.ok) {
        const xom = await r.text();
        if (urinish < 2 && r.status === 400 && /instructions/i.test(xom) && izoh) { izoh = false; continue; }
        if (urinish < 2 && (r.status === 404 || (r.status === 400 && /model/i.test(xom))) && model !== 'tts-1') {
          model = 'tts-1'; izoh = false; continue;
        }
        throw new NutqXatosi('provayder', maxfiyniTozala(`openai ${r.status}: ${xom.slice(0, 400)}`));
      }
      if (!/^(audio\/|application\/octet-stream)/i.test(r.headers.get('content-type') ?? '')) {
        throw new NutqXatosi('bosh', 'Nutq xizmati audio qaytarmadi');
      }
      const audio = await r.arrayBuffer();
      ctrl.signal.throwIfAborted();
      if (!audio.byteLength || audio.byteLength > 3_000_000) throw new NutqXatosi('bosh', 'Nutq fayli noto‘g‘ri');
      return audio;
    }
    throw new NutqXatosi('provayder', 'Nutq modeli sozlamalarni qabul qilmadi');
  } catch (e) {
    if (e instanceof NutqXatosi) throw e;
    if (ctrl.signal.aborted) throw new NutqXatosi('vaqt', 'Nutq javobi vaqtida kelmadi');
    throw new NutqXatosi('tarmoq', maxfiyniTozala(e));
  } finally {
    clearTimeout(taymer);
    opt.signal?.removeEventListener('abort', bekor);
  }
}
