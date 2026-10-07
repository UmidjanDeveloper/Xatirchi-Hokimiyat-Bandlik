import assert from 'node:assert/strict';
import { ovozOqimi } from '../src/lib/agent/nutq-oqim';
import { pcmNutqniIjroEt } from '../src/components/agent/pcm-nutq';

const env = { NODE_ENV: 'test', AGENT_TTS: '1', AGENT_TTS_PROVIDER: 'elevenlabs', ELEVENLABS_API_KEY: 'fixture-only', ELEVENLABS_VOICE_ID: 'voice_fixture', ELEVENLABS_MODEL_ID: 'eleven_v3', OPENAI_API_KEY: 'fixture-openai' } as NodeJS.ProcessEnv;
const models = () => Response.json([{ model_id: 'eleven_v3', can_do_text_to_speech: true, languages: [{ language_id: 'uz' }] }]);
const pcm = () => new Response(new Uint8Array(4800), { headers: { 'content-type': 'audio/pcm' } });
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
let tests = 0;
const test = async (name: string, f: () => unknown) => { await f(); tests++; console.log('OK', name); };
async function main() {
  await test('Server releases first PCM bytes before tail; same voice, v3 and Uzbek retained; cancel closes provider', async () => {
    let tail!: ReadableStreamDefaultController<Uint8Array>, cancelled = 0, signal: AbortSignal | undefined;
    const f = (async (url, init) => {
      if (String(url).endsWith('/models')) return models();
      assert.match(String(url), /voice_fixture\/stream\?output_format=pcm_24000$/);
      const b = JSON.parse(String(init?.body)); assert.equal(b.language_code, 'uz'); assert.equal(b.model_id, 'eleven_v3');
      signal = init?.signal as AbortSignal;
      return new Response(new ReadableStream<Uint8Array>({ start(c) { tail = c; c.enqueue(new Uint8Array(4800)); }, cancel() { cancelled++; } }), { headers: { 'content-type': 'audio/pcm' } });
    }) as typeof fetch;
    const r = await ovozOqimi('Salom.', { env, fetchFn: f }); assert.equal(r.pcm, true); assert.equal(r.provayder, 'elevenlabs');
    assert.ok(r.audio instanceof ReadableStream); const reader = r.audio.getReader();
    assert.equal((await reader.read()).value?.length, 4800); assert.ok(tail); assert.equal(cancelled, 0);
    await reader.cancel(); assert.equal(cancelled, 1); assert.equal(signal?.aborted, true);
  });
  await test('Timeout/invalid empty first audio can fall back once, then voice is pinned without retrying ElevenLabs', async () => {
    const urls: string[] = [];
    const f = (async (url) => {
      urls.push(String(url)); if (String(url).endsWith('/models')) return models();
      if (String(url).includes('elevenlabs')) return new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'audio/pcm' } });
      return pcm();
    }) as typeof fetch;
    const r = await ovozOqimi('Salom.', { env, fetchFn: f, birinchiMs: 15, kutishMs: 500 });
    assert.equal(r.provayder, 'openai'); assert.equal(r.zaxira, true); assert.ok(r.audio instanceof ReadableStream); await r.audio.cancel();
    urls.length = 0;
    const pinned = await ovozOqimi('Keyingi gap.', { env, fetchFn: f, zaxira: true });
    assert.equal(urls.length, 1); assert.ok(urls[0].includes('openai')); assert.ok(pinned.audio instanceof ReadableStream); await pinned.audio.cancel();
  });
  await test('Midstream error cannot switch voices or expose provider body; partial PCM and oversized bodies fail closed', async () => {
    for (const mode of ['error', 'odd', 'large']) {
      let c!: ReadableStreamDefaultController<Uint8Array>, openai = 0;
      const f = (async (url) => {
        if (String(url).endsWith('/models')) return models();
        if (String(url).includes('openai')) { openai++; return pcm(); }
        return new Response(new ReadableStream<Uint8Array>({ start(x) { c = x; x.enqueue(new Uint8Array(mode === 'odd' ? 3 : 4800)); } }), { headers: { 'content-type': 'audio/pcm' } });
      }) as typeof fetch;
      const r = await ovozOqimi('Salom.', { env, fetchFn: f }); assert.ok(r.audio instanceof ReadableStream);
      const reader = r.audio.getReader(); await reader.read();
      if (mode === 'error') c.error(new Error('secret provider body'));
      else if (mode === 'odd') c.close();
      else c.enqueue(new Uint8Array(9_600_001));
      await assert.rejects(reader.read(), (e: Error) => !e.message.includes('secret')); assert.equal(openai, 0);
    }
  });
  await test('PCM-incompatible ElevenLabs model keeps the same voice through its buffered MP3 compatibility path', async () => {
    let audioCalls = 0;
    const f = (async (url) => {
      if (String(url).endsWith('/models')) return models(); audioCalls++;
      if (String(url).includes('/stream?')) return Response.json({ detail: { message: 'output_format pcm unsupported' } }, { status: 400 });
      assert.ok(String(url).includes('elevenlabs')); return new Response(new Uint8Array([73, 68, 51, 1]), { headers: { 'content-type': 'audio/mpeg' } });
    }) as typeof fetch;
    const r = await ovozOqimi('Salom.', { env, fetchFn: f }); assert.equal(r.pcm, false); assert.equal(r.provayder, 'elevenlabs'); assert.equal(audioCalls, 2);
  });
  await test('Unsupported stream endpoint, mismatched audio MIME and empty PCM recover the same voice before any audio', async () => {
    for (const mode of [404, 405, 406, 415, 501, 'mime', 'empty']) {
      let calls = 0;
      const f = (async (url, init) => {
        if (String(url).endsWith('/models')) return models();
        assert.ok(String(url).includes('elevenlabs'), 'a format error must not change voices'); calls++;
        const body = JSON.parse(String(init?.body)); assert.equal(body.model_id, 'eleven_v3'); assert.equal(body.language_code, 'uz');
        if (String(url).includes('/stream?')) return typeof mode === 'number'
          ? Response.json({ detail: 'stream unavailable' }, { status: mode })
          : new Response(mode === 'empty' ? new Uint8Array() : new Uint8Array([73, 68, 51]), { headers: { 'content-type': mode === 'empty' ? 'audio/pcm' : 'audio/mpeg' } });
        return new Response(new Uint8Array([73, 68, 51, 1]), { headers: { 'content-type': 'audio/mpeg' } });
      }) as typeof fetch;
      const r = await ovozOqimi('Salom.', { env, fetchFn: f });
      assert.equal(r.pcm, false); assert.equal(r.provayder, 'elevenlabs'); assert.equal(r.zaxira, false); assert.equal(calls, 2);
    }
  });
  await test('Browser starts before EOF, schedules contiguous samples across odd transport boundaries, and cancels all audio', async () => {
    Object.assign(globalThis, { requestAnimationFrame: () => 1, cancelAnimationFrame() {} });
    const sources: Array<{ buffer: AudioBuffer; onended(): void; start(t: number): void; stop(): void }> = [];
    const times: number[] = [], samples: Float32Array[] = []; let stopped = 0, started = 0, cancelled = 0;
    const ctx = { state: 'running', currentTime: 0, destination: {}, createAnalyser: () => ({ fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(a: Uint8Array) { a.fill(150); } }),
      createBuffer: (_: number, n: number) => { const a = new Float32Array(n); samples.push(a); return { getChannelData: () => a }; },
      createBufferSource: () => { const s = { connect() {}, disconnect() {}, start(t: number) { times.push(t); }, stop() { stopped++; } }; sources.push(s as unknown as typeof sources[0]); return s; },
    } as unknown as AudioContext;
    let c!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({ start(x) { c = x; }, cancel() { cancelled++; } });
    const ctrl = new AbortController();
    const p = pcmNutqniIjroEt(ctx, new Response(stream), ctrl.signal, { onBoshlandi() { started++; }, onDaraja() {} });
    c.enqueue(new Uint8Array(4801)); await flush(); assert.equal(started, 1, 'first speech must precede EOF');
    c.enqueue(new Uint8Array(11_999)); await flush(); assert.equal(times.length, 2); assert.ok(Math.abs(times[1] - times[0] - .1) < .00001);
    assert.equal(samples[1].length, 6000, 'odd byte is carried into next sample');
    ctrl.abort(); await assert.rejects(p, { name: 'AbortError' }); assert.equal(stopped, 2); assert.equal(cancelled, 1);
  });
  await test('Browser completes only after stream EOF and last scheduled sound; truncated sample is an error', async () => {
    let source!: { onended(): void };
    const ctx = { state: 'running', currentTime: 0, destination: {}, createAnalyser: () => ({ fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(a: Uint8Array) { a.fill(128); } }),
      createBuffer: (_: number, n: number) => ({ getChannelData: () => new Float32Array(n) }), createBufferSource: () => { source = { connect() {}, disconnect() {}, start() {}, stop() {} } as unknown as typeof source; return source; },
    } as unknown as AudioContext;
    let done = false; const c = new AbortController();
    const p = pcmNutqniIjroEt(ctx, pcm(), c.signal, { onBoshlandi() {}, onDaraja() {} }).then(() => { done = true; });
    await flush(); assert.equal(done, false); source.onended(); await p; assert.equal(done, true);
    await assert.rejects(pcmNutqniIjroEt(ctx, new Response(new Uint8Array(3)), c.signal, { onBoshlandi() {}, onDaraja() {} }), /uzilgan/);
  });
  console.log(`${tests}/${tests} streaming speech checks passed with fake providers/media.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
