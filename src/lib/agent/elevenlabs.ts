import { createHash } from 'node:crypto';
import { z } from 'zod';
import { NutqXatosi, type NutqProvayderi } from './nutq';

const Modellar = z.array(z.object({
  model_id: z.string(), can_do_text_to_speech: z.boolean().optional().default(false),
  languages: z.array(z.object({ language_id: z.string() })).optional().default([]),
}));
const kesh = new Map<string, number>();
const KESH_MS = 60 * 60_000;
const ENG_KOP_AUDIO = 3_000_000;

/** Bounded provider bodies, including chunked responses without Content-Length. */
async function baytlar(r: Response, limit: number, signal: AbortSignal): Promise<Uint8Array> {
  if (Number(r.headers.get('content-length')) > limit) throw new NutqXatosi('bosh', 'ElevenLabs javobi juda katta.');
  const reader = r.body?.getReader();
  if (!reader) throw new NutqXatosi('bosh', 'ElevenLabs javobi bo‘sh.');
  const chunks: Uint8Array[] = []; let size = 0;
  const bekor = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', bekor, { once: true });
  try {
    for (;;) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new NutqXatosi('bosh', 'ElevenLabs javobi juda katta.');
      chunks.push(value);
    }
  } catch (e) { await reader.cancel().catch(() => {}); throw e; }
  finally { signal.removeEventListener('abort', bekor); reader.releaseLock(); }
  const out = new Uint8Array(size); let i = 0;
  for (const c of chunks) { out.set(c, i); i += c.length; }
  return out;
}

function rad(status: number): NutqXatosi {
  const izoh = status === 401 ? 'ElevenLabs API kaliti qabul qilinmadi. Vercel sozlamasini tekshiring.'
    : status === 403 ? 'ElevenLabs kalitida kerakli ruxsat yo‘q. Text to Speech va Models Read ruxsatlarini tekshiring.'
    : status === 402 ? 'ElevenLabs hisobidagi kredit yoki tarifni tekshiring.'
    : status === 404 ? 'ElevenLabs ovozi yoki modeli topilmadi. Voice ID ni tekshiring.'
    : status === 429 ? 'ElevenLabs so‘rovlar chegarasiga yetdi. Biroz kutib qayta urinib ko‘ring.'
    : 'ElevenLabs ovoz tayyorlamadi. Kalit ruxsati, ovoz, model va hisobdagi kreditni tekshiring.';
  return new NutqXatosi('provayder', izoh);
}

/** Fixed API host; no API keys, text or provider response details are logged/persisted. */
export async function elevenlabsNutq(
  prov: NutqProvayderi, input: string,
  opt: { signal?: AbortSignal; fetchFn?: typeof fetch; kutishMs?: number } = {}
): Promise<ArrayBuffer> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(prov.ovoz) || !/^[a-zA-Z0-9_-]{1,100}$/.test(prov.model)) throw new NutqXatosi('bosh', 'ElevenLabs ovoz yoki model ID si noto‘g‘ri.');
  const ctrl = new AbortController();
  const bekor = () => ctrl.abort();
  const taymer = setTimeout(bekor, opt.kutishMs ?? 20_000);
  opt.signal?.addEventListener('abort', bekor, { once: true });
  if (opt.signal?.aborted) bekor();
  const fetchFn = opt.fetchFn ?? fetch;
  const headers = { 'xi-api-key': prov.kalit };
  try {
    ctrl.signal.throwIfAborted();
    // Check real model capabilities instead of assuming every multilingual model supports Uzbek.
    const id = createHash('sha256').update(prov.kalit).update(':').update(prov.model).digest('hex');
    if (opt.fetchFn || (kesh.get(id) ?? 0) <= Date.now()) {
      const r = await fetchFn('https://api.elevenlabs.io/v1/models', { headers, signal: ctrl.signal, cache: 'no-store', redirect: 'error' });
      if (!r.ok) { await r.body?.cancel(); throw rad(r.status); }
      const bytes = await baytlar(r, 512_000, ctrl.signal);
      let raw: unknown; try { raw = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new NutqXatosi('bosh', 'ElevenLabs model ro‘yxati noto‘g‘ri.'); }
      const models = Modellar.safeParse(raw);
      if (!models.success) throw new NutqXatosi('bosh', 'ElevenLabs model ro‘yxati noto‘g‘ri.');
      const model = models.data.find((m) => m.model_id === prov.model);
      if (!model?.can_do_text_to_speech || !model.languages.some((l) => l.language_id === 'uz')) {
        throw new NutqXatosi('provayder', 'Tanlangan ElevenLabs modeli o‘zbek tilini qo‘llamaydi. O‘zbek tilini qo‘llaydigan modelni tanlang.');
      }
      if (!opt.fetchFn) { if (kesh.size >= 100) kesh.clear(); kesh.set(id, Date.now() + KESH_MS); }
    }
    const r = await fetchFn(`https://api.elevenlabs.io/v1/text-to-speech/${prov.ovoz}?output_format=mp3_44100_128`, {
      method: 'POST', signal: ctrl.signal, redirect: 'error', cache: 'no-store',
      headers: { ...headers, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: input, model_id: prov.model, language_code: 'uz', apply_text_normalization: 'auto', voice_settings: { stability: 0.5 } }),
    });
    if (!r.ok) { await r.body?.cancel(); throw rad(r.status); }
    if (!/^(audio\/mpeg|application\/octet-stream)(?:;|$)/i.test(r.headers.get('content-type') ?? '')) {
      await r.body?.cancel(); throw new NutqXatosi('bosh', 'ElevenLabs audio qaytarmadi.');
    }
    const audio = await baytlar(r, ENG_KOP_AUDIO, ctrl.signal);
    if (!audio.byteLength) throw new NutqXatosi('bosh', 'ElevenLabs audio javobi bo‘sh.');
    return audio.buffer as ArrayBuffer;
  } catch (e) {
    if (ctrl.signal.aborted) throw new NutqXatosi('vaqt', 'ElevenLabs ovozi kechikdi yoki so‘rov bekor qilindi. Qayta urinib ko‘ring.');
    if (e instanceof NutqXatosi) throw e;
    throw new NutqXatosi('tarmoq', 'ElevenLabs xizmatiga ulanib bo‘lmadi. Qayta urinib ko‘ring.');
  } finally { clearTimeout(taymer); opt.signal?.removeEventListener('abort', bekor); }
}
