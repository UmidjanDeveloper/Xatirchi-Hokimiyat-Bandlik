import { elevenlabsModeliniTekshir, rad, xatoTafsiloti } from './elevenlabs';
import { NUTQ_KORSATMASI, NutqXatosi, nutqMatni, nutqProvayderi, nutqXizmati, nutqYarat, nutqZaxirasi, type NutqProvayderi } from './nutq';
import { ENG_UZUN_NUTQ } from './chegaralar';

const ENG_KOP_PCM = 9_600_000; // 200 s, 24 kHz mono signed PCM16.
const JAMI_MS = 22_000;
type OqimNatijasi = { audio: ReadableStream<Uint8Array> | ArrayBuffer; pcm: boolean; provayder: 'elevenlabs' | 'openai'; zaxira: boolean };

/** Tanlov faqat birinchi audio baytidan OLDIN. Ijro boshlangan javobda ovoz almashmaydi. */
export async function ovozOqimi(matn: string, opt: {
  signal?: AbortSignal; env?: NodeJS.ProcessEnv; fetchFn?: typeof fetch; zaxira?: boolean;
  kutishMs?: number; birinchiMs?: number;
} = {}): Promise<OqimNatijasi> {
  if (!matn.trim() || matn.length > ENG_UZUN_NUTQ) throw new NutqXatosi('bosh', 'Nutq matni noto‘g‘ri.');
  const env = opt.env ?? process.env;
  const asosiy = nutqProvayderi(env), zaxira = nutqZaxirasi(env);
  const ctrl = new AbortController();
  const signal = AbortSignal.any([ctrl.signal, ...(opt.signal ? [opt.signal] : [])]);
  const timer = setTimeout(() => ctrl.abort(), opt.kutishMs ?? JAMI_MS);
  let topshirildi = false;
  const input = nutqMatni(matn);
  const f = opt.fetchFn ?? fetch;
  const tayyorla = async (prov: NutqProvayderi, backup: boolean): Promise<OqimNatijasi> => {
    const c = new AbortController();
    const s = AbortSignal.any([signal, c.signal]);
    const firstTimer = setTimeout(() => c.abort(), opt.birinchiMs ?? (prov.provayder === 'elevenlabs' && zaxira ? 6000 : 20_000));
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const bekor = () => { void reader?.cancel().catch(() => {}); };
    s.addEventListener('abort', bekor, { once: true });
    const tozala = () => { clearTimeout(firstTimer); clearTimeout(timer); s.removeEventListener('abort', bekor); };
    const mp3 = async (): Promise<OqimNatijasi> => {
      clearTimeout(firstTimer);
      // Oqim mos kelmasa ham Voice ID, model va til o'zgarmaydi.
      const audio = await nutqYarat(prov, input, { signal, fetchFn: opt.fetchFn });
      tozala(); return { audio, pcm: false, provayder: prov.provayder ?? 'openai', zaxira: backup };
    };
    try {
      s.throwIfAborted();
      let r: Response;
      if (prov.provayder === 'elevenlabs') {
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(prov.ovoz) || !/^[a-zA-Z0-9_-]{1,100}$/.test(prov.model)) throw new NutqXatosi('bosh', 'ElevenLabs sozlamasi noto‘g‘ri.');
        await elevenlabsModeliniTekshir(prov, s, f);
        r = await f(`https://api.elevenlabs.io/v1/text-to-speech/${prov.ovoz}/stream?output_format=pcm_24000`, {
          method: 'POST', signal: s, redirect: 'error', cache: 'no-store',
          headers: { 'xi-api-key': prov.kalit, 'content-type': 'application/json', accept: 'audio/pcm' },
          body: JSON.stringify({ text: input, model_id: prov.model, language_code: 'uz', voice_settings: { stability: .5 } }),
        });
        if (!r.ok) {
          const detail = await xatoTafsiloti(r, prov.kalit);
          // Eski tarif/model PCM oqimini rad etsa, o'sha ElevenLabs ovozi saqlanadi.
          if ([400, 404, 405, 406, 415, 422, 501].includes(r.status)) return await mp3();
          throw rad(r.status, detail);
        }
      } else {
        let model = prov.model, izoh = !/^tts-1/.test(model);
        for (let n = 0;; n++) {
          s.throwIfAborted();
          r = await f('https://api.openai.com/v1/audio/speech', {
            method: 'POST', signal: s, redirect: 'error', cache: 'no-store',
            headers: { authorization: `Bearer ${prov.kalit}`, 'content-type': 'application/json' },
            body: JSON.stringify({ model, voice: /^tts-1/.test(model) && !['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(prov.ovoz) ? 'onyx' : prov.ovoz,
              input, response_format: 'pcm', speed: 1, ...(izoh ? { instructions: NUTQ_KORSATMASI } : {}) }),
          });
          if (r.ok) break;
          const body = (await r.text()).slice(0, 4000);
          if (n < 2 && r.status === 400 && /instructions/i.test(body) && izoh) { izoh = false; continue; }
          if (n < 2 && (r.status === 404 || r.status === 400 && /model/i.test(body)) && model !== 'tts-1') { model = 'tts-1'; izoh = false; continue; }
          throw new NutqXatosi('provayder', `OpenAI ovoz tayyorlamadi (HTTP ${r.status}).`);
        }
      }
      if (!/^(audio\/(pcm|x-pcm|raw|l16)|application\/octet-stream)(?:;|$)/i.test(r.headers.get('content-type') ?? '')) {
        await r.body?.cancel(); return await mp3();
      }
      if (Number(r.headers.get('content-length')) > ENG_KOP_PCM) {
        await r.body?.cancel(); throw new NutqXatosi('bosh', 'Nutq oqimi juda katta.');
      }
      reader = r.body?.getReader();
      if (!reader) return await mp3();
      let first: Uint8Array | undefined, empty = 0;
      while (!first?.byteLength) {
        if (++empty > 1000) throw new NutqXatosi('bosh', 'Nutq oqimi bo‘sh.');
        s.throwIfAborted(); const v = await reader.read(); s.throwIfAborted();
        if (v.done) { reader.releaseLock(); reader = undefined; return await mp3(); }
        first = v.value;
      }
      if (first.byteLength > ENG_KOP_PCM) throw new NutqXatosi('bosh', 'Nutq oqimi juda katta.');
      clearTimeout(firstTimer);
      let size = first.byteLength;
      const audio = new ReadableStream<Uint8Array>({
        start(out) { out.enqueue(first!); },
        async pull(out) {
          try {
            s.throwIfAborted(); const v = await reader!.read(); s.throwIfAborted();
            if (v.done) {
              if (size % 2) throw new NutqXatosi('bosh', 'Nutq oqimi uzilgan.');
              tozala(); reader!.releaseLock(); out.close(); return;
            }
            size += v.value.byteLength;
            if (size > ENG_KOP_PCM) throw new NutqXatosi('bosh', 'Nutq oqimi juda katta.');
            out.enqueue(v.value);
          } catch { await reader!.cancel().catch(() => {}); tozala(); out.error(new NutqXatosi('tarmoq', 'Nutq oqimi uzildi. Qayta urinib ko‘ring.')); }
        },
        async cancel() { c.abort(); await reader!.cancel().catch(() => {}); tozala(); },
      });
      topshirildi = true;
      return { audio, pcm: true, provayder: prov.provayder ?? 'openai', zaxira: backup };
    } catch (e) {
      c.abort(); await reader?.cancel().catch(() => {}); clearTimeout(firstTimer); s.removeEventListener('abort', bekor);
      throw e instanceof NutqXatosi ? e : new NutqXatosi('vaqt', 'Ovoz vaqtida kelmadi.');
    }
  };
  try {
    if (asosiy && !(opt.zaxira && zaxira && nutqXizmati(env) === 'elevenlabs')) {
      try { return await tayyorla(asosiy, false); }
      catch (e) { if (signal.aborted || !zaxira || asosiy.provayder !== 'elevenlabs') throw e; }
    }
    signal.throwIfAborted();
    if (!zaxira) throw new NutqXatosi('bosh', 'Ovoz sozlanmagan.');
    return await tayyorla(zaxira, true);
  } finally { if (!topshirildi) clearTimeout(timer); }
}
