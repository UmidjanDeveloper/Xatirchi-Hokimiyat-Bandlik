import assert from 'node:assert/strict';
import { audioKontekstiniUygot, audioSeansiniOl } from '../src/components/agent/audio-seans';
import { javobniGapir, nutqniTayyorla, nutqMuhitiniYop, nutqniToxtat } from '../src/components/agent/nutq-ijrosi';
import { ovozniBoshla } from '../src/components/agent/ovoz';
import { pcmNutqniIjroEt } from '../src/components/agent/pcm-nutq';

const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const nav = (s?: { type: string }) => Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { audioSession: s, userAgent: 'iPhone' } });
let checks = 0;
const test = async (name: string, f: () => unknown) => { await f(); checks++; console.log('OK', name); };
async function main() {
  await test('Media playback leaves ambient/auto and restores it after cancellation; unsupported API is harmless', () => {
    const s = { type: 'auto' }; nav(s); const close = audioSeansiniOl('playback'); assert.equal(s.type, 'playback'); close(); close(); assert.equal(s.type, 'auto');
    nav(); audioSeansiniOl('playback')();
    nav(Object.defineProperty({}, 'type', { get: () => 'auto', set: () => { throw new Error('Unsupported'); } }) as { type: string }); audioSeansiniOl('playback')();
  });
  await test('Live microphone mode dominates overlapping reply playback; late/duplicate cleanup cannot change the new owner', () => {
    for (const recordFirst of [true, false]) {
      const s = { type: 'auto' }; nav(s); const a = audioSeansiniOl('playback'), b = audioSeansiniOl('play-and-record'), c = audioSeansiniOl('playback');
      assert.equal(s.type, 'play-and-record'); a(); assert.equal(s.type, 'play-and-record');
      if (recordFirst) { b(); assert.equal(s.type, 'playback'); c(); }
      else { c(); assert.equal(s.type, 'play-and-record'); b(); }
      a(); b(); c(); assert.equal(s.type, 'auto');
    }
  });
  await test('Cleanup preserves a mode changed externally and restores a non-default initial mode', () => {
    const s = { type: 'ambient' }; nav(s); const close = audioSeansiniOl('playback'); close(); assert.equal(s.type, 'ambient');
    const other = audioSeansiniOl('playback'); s.type = 'transient'; other(); assert.equal(s.type, 'transient');
  });
  await test('Ordinary OpenAI backup waits for actual source start, resumes interrupted Safari and releases playback after end', async () => {
    const s = { type: 'auto' }; nav(s);
    let source!: { onended: (() => void) | null; start(): void; stop(): void }; let sourceStarted = false, resumes = 0;
    let context!: Context;
    class Context {
      state = 'interrupted'; destination = {};
      constructor() { context = this; }
      async resume() { resumes++; this.state = 'running'; } async close() {}
      async decodeAudioData() { return { duration: .01 }; }
      createBufferSource() { source = { onended: null, connect() {}, disconnect() {}, stop() {}, start() { assert.equal(s.type, 'playback'); sourceStarted = true; } } as unknown as typeof source; return source; }
      createAnalyser() { return { fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(a: Uint8Array) { a.fill(140); } }; }
    }
    let body!: ReadableStreamDefaultController<Uint8Array>;
    Object.assign(globalThis, { window: { AudioContext: Context }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
      fetch: async () => new Response(new ReadableStream<Uint8Array>({ start(c) { body = c; } }), { headers: { 'content-type': 'audio/mpeg', 'x-nutq-zaxira': '1' } }),
    });
    nutqniTayyorla(); let starts = 0, ends = 0, warnings = 0;
    javobniGapir('Salom.', { serverMumkin: true, onYuklash() {}, onBoshlandi() { starts++; }, onTugadi() { ends++; }, onXato(m) { throw new Error(m); }, onZaxiraOvozi() { assert.equal(sourceStarted, true); warnings++; } });
    await flush(); assert.equal(s.type, 'playback'); assert.equal(warnings, 0, 'a provider header is not a playback event');
    context.state = 'interrupted'; // Javob kutilayotganda telefon qo'ng'iroq yoki fonga o'tishi mumkin.
    body.enqueue(new Uint8Array([73, 68, 51, 1])); body.close(); await flush(); assert.equal(starts, 1); assert.equal(warnings, 1); assert.equal(resumes, 2);
    source.onended?.(); assert.equal(ends, 1); assert.equal(s.type, 'auto'); nutqMuhitiniYop();
  });
  await test('Cancelled delayed backup never announces playback and restores the phone audio session', async () => {
    const s = { type: 'auto' }; nav(s); let response!: (r: Response) => void, warnings = 0;
    global.fetch = (() => new Promise<Response>((r) => { response = r; })) as typeof fetch;
    javobniGapir('Kech javob.', { serverMumkin: true, onYuklash() {}, onBoshlandi() { throw new Error('late playback'); }, onTugadi() { throw new Error('late completion'); }, onXato(m) { throw new Error(m); }, onZaxiraOvozi() { warnings++; } });
    nutqniToxtat(); response(new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'audio/mpeg', 'x-nutq-zaxira': '1' } })); await flush(); assert.equal(warnings, 0); assert.equal(s.type, 'auto');
  });
  await test('Voice input requests record mode and restores it on failure/cancel without changing recognition', () => {
    const s = { type: 'auto' }; nav(s); let recognizer!: Recognition;
    class Recognition {
      onerror?: (e: { error: string }) => void; onend?: () => void;
      constructor() { recognizer = this; } start() { assert.equal(s.type, 'play-and-record'); } abort() { this.onend?.(); } stop() { this.onend?.(); }
    }
    Object.assign(globalThis.window, { SpeechRecognition: Recognition });
    let ends = 0; const h = { onOraliq() {}, onYakuniy() {}, onXato() {}, onTugadi() { ends++; } };
    const first = ovozniBoshla(h, false); recognizer.onerror?.({ error: 'not-allowed' }); assert.equal(s.type, 'auto'); first.bekor(); assert.equal(ends, 1);
    const second = ovozniBoshla(h, false); assert.equal(s.type, 'play-and-record'); second.bekor(); assert.equal(s.type, 'auto'); assert.equal(ends, 2);
  });
  await test('PCM can resume interrupted Safari before scheduling audio', async () => {
    let resumes = 0, starts = 0, end!: () => void;
    const ctx = { state: 'interrupted', currentTime: 0, destination: {}, async resume(this: { state: string }) { resumes++; this.state = 'running'; },
      createAnalyser: () => ({ fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(a: Uint8Array) { a.fill(128); } }),
      createBuffer: (_: number, n: number) => ({ getChannelData: () => new Float32Array(n) }), createBufferSource: () => {
        const node = { onended: null as (() => void) | null, connect() {}, disconnect() {}, stop() {}, start() { end = () => node.onended?.(); } }; return node;
      },
    } as unknown as AudioContext;
    const p = pcmNutqniIjroEt(ctx, new Response(new Uint8Array(4800)), new AbortController().signal, { onBoshlandi() { starts++; }, onDaraja() {} });
    await flush(); assert.equal(resumes, 1); assert.equal(starts, 1); end(); await p;
  });
  await test('Pending browser resume is abortable and bounded; a late permission response cannot restart it', async () => {
    let resume!: () => void;
    const ctx = { state: 'suspended', resume: () => new Promise<void>((r) => { resume = r; }) } as unknown as AudioContext;
    const c = new AbortController(); const p = audioKontekstiniUygot(ctx, c.signal); c.abort();
    await assert.rejects(p, { name: 'AbortError' }); resume(); await flush();
    await assert.rejects(audioKontekstiniUygot(ctx), { name: 'NotAllowedError' });
  });
  console.log(`${checks}/${checks} phone audio session checks passed with simulated browser policies.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(nutqMuhitiniYop);
