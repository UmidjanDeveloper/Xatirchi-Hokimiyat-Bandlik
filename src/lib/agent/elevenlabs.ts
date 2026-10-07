import { createHash } from 'node:crypto';
import { z } from 'zod';
import { maxfiyniTozala } from '@/lib/maxfiy';
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

/**
 * Provayder xatosining XAVFSIZ qismi: `request-id` va (JSON bo'lsa) ElevenLabs'ning qisqa
 * `status` kodi bilan xabari (masalan `voice_not_found: ...`, `missing_permissions: ...`).
 * Xom javob matni HECH QACHON ko'rsatilmaydi va xabar `maxfiyniTozala`dan o'tadi.
 * Umumiy "tekshiring" matni sababni yashirardi: endi aynan nima rad etilgani ko'rinadi.
 */
async function xatoTafsiloti(r: Response, kalit: string): Promise<string> {
  const rid = (r.headers.get('request-id') ?? '').replace(/[^\w-]/g, '').slice(0, 64);
  let qism = '';
  try {
    const d = JSON.parse((await r.text()).slice(0, 4000)) as { detail?: unknown };
    const det = d.detail;
    if (typeof det === 'string') qism = det;
    else if (Array.isArray(det)) {
      qism = det.slice(0, 2).map((x) => {
        const o = (x ?? {}) as { loc?: unknown; msg?: unknown };
        return `${Array.isArray(o.loc) ? o.loc.slice(-2).join('.') : ''} ${typeof o.msg === 'string' ? o.msg : ''}`.trim();
      }).filter(Boolean).join('; ');
    } else if (det && typeof det === 'object') {
      const o = det as { status?: unknown; message?: unknown };
      qism = [typeof o.status === 'string' ? o.status : '', typeof o.message === 'string' ? o.message : ''].filter(Boolean).join(': ');
    }
  } catch { /* JSON emas: matn ko'rsatilmaydi */ }
  // Provayder xabarida bizning kalit bo'lmasligi kerak, lekin bo'lsa ham chiqmaydi
  qism = qism ? maxfiyniTozala(kalit ? qism.split(kalit).join('***') : qism).replace(/\s+/g, ' ').slice(0, 220) : '';
  return [qism, rid ? `so'rov ${rid}` : ''].filter(Boolean).join(' · ');
}

function rad(status: number, tafsilot = ''): NutqXatosi {
  const izoh = status === 401 ? 'ElevenLabs API kaliti qabul qilinmadi yoki unda ruxsat yo‘q. Vercel sozlamasini tekshiring.'
    : status === 403 ? 'ElevenLabs kalitida kerakli ruxsat yo‘q. Text to Speech va Models Read ruxsatlarini tekshiring.'
    : status === 402 ? 'ElevenLabs hisobidagi kredit yoki tarifni tekshiring.'
    : status === 404 ? 'ElevenLabs ovozi yoki modeli topilmadi. Voice ID ni tekshiring.'
    : status === 429 ? 'ElevenLabs so‘rovlar chegarasiga yetdi. Biroz kutib qayta urinib ko‘ring.'
    : 'ElevenLabs ovoz tayyorlamadi. Kalit ruxsati, ovoz, model va hisobdagi kreditni tekshiring.';
  return new NutqXatosi('provayder', `${izoh} (${status}${tafsilot ? `: ${tafsilot}` : ''})`);
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
      if (!r.ok) throw rad(r.status, await xatoTafsiloti(r, prov.kalit));
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
    const tts = (body: Record<string, unknown>) => fetchFn(`https://api.elevenlabs.io/v1/text-to-speech/${prov.ovoz}?output_format=mp3_44100_128`, {
      method: 'POST', signal: ctrl.signal, redirect: 'error', cache: 'no-store',
      headers: { ...headers, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    });
    // SDK'da normalizatsiya sukutda auto. Tilni hech qachon olib tashlamaymiz:
    // boshqa hisobdagi 400/422 xatosi barcha so'rovlarga ta'sir qilmasin.
    const r = await tts({ text: input, model_id: prov.model, language_code: 'uz', voice_settings: { stability: 0.5 } });
    if (!r.ok) {
      const t = await xatoTafsiloti(r, prov.kalit);
      throw rad(r.status, t);
    }
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
