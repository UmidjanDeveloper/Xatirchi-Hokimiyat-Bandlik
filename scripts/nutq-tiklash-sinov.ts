import assert from 'node:assert/strict';
import { javobniGapir, nutqniTayyorla, nutqMuhitiniYop } from '../src/components/agent/nutq-ijrosi';
import { nutqNavbatiYarat } from '../src/components/agent/jonli-nutq';

const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const emptyPcm = () => new Response(new Uint8Array(), { headers: { 'content-type': 'audio/pcm;rate=24000', 'x-nutq-provayder': 'elevenlabs' } });
const mp3 = () => new Response(new Uint8Array([73, 68, 51, 1]), { headers: { 'content-type': 'audio/mpeg', 'x-nutq-provayder': 'elevenlabs' } });
type Source = { onended: (() => void) | null; buffer: unknown; connect(): void; disconnect(): void; start(): void; stop(): void };
class AudioMock {
  state = 'running'; currentTime = 0; destination = {}; sources: Source[] = []; starts = 0;
  async resume() {} async close() {} async decodeAudioData() { return { duration: .01 }; }
  createBuffer(_: number, n: number) { return { getChannelData: () => new Float32Array(n) }; }
  createBufferSource() {
    const s: Source = { onended: null, buffer: null, connect() {}, disconnect() {}, start: () => { this.starts++; }, stop() {} };
    this.sources.push(s); return s;
  }
  createAnalyser() { return { fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(a: Uint8Array) { a.fill(140); } }; }
  end() { this.sources.at(-1)?.onended?.(); }
}
async function main() {
  Object.assign(globalThis, { window: { AudioContext: AudioMock }, requestAnimationFrame: () => 1, cancelAnimationFrame() {} });
  const originalFetch = global.fetch; let tests = 0;
  const test = async (name: string, f: () => Promise<void>) => { await f(); tests++; console.log('OK', name); };
  const setup = (responses: Array<() => Promise<Response> | Response>) => {
    const requests: Array<{ oqim: boolean; jonli?: string; matn: string }> = [];
    global.fetch = (async (_, init) => {
      init?.signal?.throwIfAborted(); requests.push(JSON.parse(String(init?.body)));
      const f = responses.shift(); assert.ok(f, 'unbounded/unexpected speech retry'); return f();
    }) as typeof fetch;
    const ctx = new AudioMock(); let started = 0, ended = 0; const errors: string[] = [];
    const q = nutqNavbatiYarat(ctx as unknown as AudioContext, () => 'signed-ticket', {
      onBoshlandi() { started++; }, onTugadi() { ended++; }, onDaraja() {}, onXato(m) { errors.push(m); },
    });
    return { ctx, requests, errors, q, get started() { return started; }, get ended() { return ended; } };
  };
  try {
    await test('Live empty PCM recovers MP3 once; next reply retains compatibility mode and signed ticket', async () => {
      const s = setup([emptyPcm, mp3, mp3]); s.q.qosh('Salom.'); s.q.tugatish(); await flush();
      assert.deepEqual(s.requests.map((r) => r.oqim), [true, false]); assert.ok(s.requests.every((r) => r.jonli === 'signed-ticket'));
      assert.equal(s.started, 1); assert.equal(s.ctx.starts, 1); assert.deepEqual(s.errors, []); s.ctx.end(); await flush(); assert.equal(s.ended, 1);
      s.q.qosh('Keyingi javob.'); s.q.tugatish(); await flush(); assert.equal(s.requests[2].oqim, false); s.ctx.end(); await flush(); s.q.toxtat();
    });
    await test('Live stream 502 retries once with MP3; a second 502 settles with a visible error', async () => {
      for (const success of [true, false]) {
        const s = setup([() => Response.json({ xabar: 'Oqim yo‘q.' }, { status: 502 }), success ? mp3 : () => Response.json({ xabar: 'Ovoz xizmati ishlamadi.' }, { status: 502 })]);
        s.q.qosh('Salom.'); s.q.tugatish(); await flush(); assert.deepEqual(s.requests.map((r) => r.oqim), [true, false]);
        assert.equal(s.started, success ? 1 : 0); assert.equal(s.errors.length, success ? 0 : 1); if (success) s.ctx.end(); await flush(); s.q.toxtat();
      }
    });
    await test('Authorization and quota denial never retry or play audio', async () => {
      for (const status of [401, 403, 429]) {
        const s = setup([() => Response.json({ xabar: 'Rad etildi.' }, { status })]);
        (globalThis.window as unknown as { location: { href: string } }).location = { href: '' };
        s.q.qosh('Salom.'); s.q.tugatish(); await flush(); assert.equal(s.requests.length, 1); assert.equal(s.ctx.starts, 0); s.q.toxtat();
      }
    });
    await test('Cancel during compatibility fetch suppresses late audio and completion', async () => {
      let reply!: (r: Response) => void;
      const s = setup([emptyPcm, () => new Promise<Response>((r) => { reply = r; })]);
      s.q.qosh('Salom.'); s.q.tugatish(); await flush(); assert.equal(s.requests.length, 2);
      s.q.toxtat(); reply(mp3()); await flush(); assert.equal(s.ctx.starts, 0); assert.equal(s.ended, 0); assert.deepEqual(s.errors, []);
    });
    await test('Failure after speech starts never repeats already spoken words', async () => {
      let c!: ReadableStreamDefaultController<Uint8Array>;
      const s = setup([() => new Response(new ReadableStream<Uint8Array>({ start(x) { c = x; x.enqueue(new Uint8Array(4800)); } }), { headers: { 'content-type': 'audio/pcm;rate=24000' } })]);
      s.q.qosh('Salom.'); s.q.tugatish(); await flush(); assert.equal(s.started, 1); c.error(new Error('provider error')); await flush();
      assert.equal(s.requests.length, 1); assert.equal(s.errors.length, 1); s.q.toxtat();
    });
    await test('Manual interruption does not disable streaming on the next answer', async () => {
      const s = setup([() => new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(4800)); } }), { headers: { 'content-type': 'audio/pcm;rate=24000' } }), mp3]);
      s.q.qosh('Birinchi javob.'); s.q.tugatish(); await flush(); assert.equal(s.started, 1);
      s.q.toxtat(); await flush(); s.q.qosh('Keyingi javob.'); s.q.tugatish(); await flush();
      assert.deepEqual(s.requests.map((r) => r.oqim), [true, true]); assert.equal(s.errors.length, 0); s.ctx.end(); await flush(); s.q.toxtat();
    });
    await test('Ordinary voice button recovers pre-audio PCM failure without a second voice or duplicate callbacks', async () => {
      const requests: boolean[] = []; let started = 0, ended = 0; const errors: string[] = [];
      global.fetch = (async (_, init) => { const d = JSON.parse(String(init?.body)); requests.push(d.oqim); return d.oqim ? emptyPcm() : mp3(); }) as typeof fetch;
      let ctx!: AudioMock;
      class OrdinaryAudio extends AudioMock { constructor() { super(); ctx = this; } }
      (globalThis.window as unknown as { AudioContext: typeof OrdinaryAudio }).AudioContext = OrdinaryAudio;
      nutqniTayyorla();
      const h = { serverMumkin: true, onYuklash() {}, onBoshlandi() { started++; }, onTugadi() { ended++; }, onXato(m: string) { errors.push(m); } };
      javobniGapir('Salom.', h); await flush(); assert.deepEqual(requests, [true, false]); assert.equal(started, 1); assert.equal(ctx.starts, 1); assert.deepEqual(errors, []);
      ctx.end(); assert.equal(ended, 1);
      javobniGapir('Keyingi javob.', h); await flush(); assert.equal(requests.at(-1), false); ctx.end(); assert.equal(ended, 2); nutqMuhitiniYop();
    });
    console.log(`${tests}/${tests} speech recovery checks passed with fake provider/audio.`);
  } finally { global.fetch = originalFetch; nutqMuhitiniYop(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
