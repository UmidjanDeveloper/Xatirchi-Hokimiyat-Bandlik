import assert from 'node:assert/strict';
import { jonliRuxsatniYangilabTur } from '../src/components/agent/jonli-ruxsat';
import { jonliBoshqaruv } from '../src/components/agent/jonli-boshqaruv';
import { nutqNavbatiYarat } from '../src/components/agent/jonli-nutq';
import { jonliChegaralari, jonliKunKaliti } from '../src/lib/agent/jonli';
import { geminiXabarOqi, pcm16Base64 } from '../src/lib/agent/gemini-protokol';
import type { JonliHodisalar } from '../src/components/agent/jonli-suhbat';

async function main() {
  const realSet = globalThis.setTimeout, realClear = globalThis.clearTimeout;
  let id = 0, tests = 0;
  const timers = new Map<number, () => void>();
  Object.assign(globalThis, { setTimeout: (f: () => void) => { timers.set(++id, f); return id; }, clearTimeout: (i: number) => timers.delete(i) });
  const next = () => { const [i, f] = timers.entries().next().value!; timers.delete(i); f(); };
  const test = async (name: string, f: () => unknown) => { timers.clear(); await f(); tests++; console.log('OK', name); };
  const setup = (asosiy: 'gemini' | 'openai' = 'gemini', zaxiraBor = true) => {
    const calls: { p: string; cb: JonliHodisalar; opt: Record<string, unknown> }[] = [];
    const errors: string[] = [], states: string[] = [], texts: string[] = [];
    let ended = 0, stopped = 0;
    const stream = { getTracks: () => [{ stop: () => { stopped++; } }] } as unknown as MediaStream;
    const cb: JonliHodisalar = { onHolat: (h) => states.push(h), onDaraja() {}, onMatn: (_, __, m) => texts.push(m), onAmallar: async () => ({}), onXato: (m) => errors.push(m), onTugadi: () => { ended++; } };
    const factory = (p: string) => (h: JonliHodisalar, opt: Record<string, unknown>) => { calls.push({ p, cb: h, opt }); return { bekor: () => h.onTugadi(), yubor: () => true, eslat() {} }; };
    const n = jonliBoshqaruv(cb, { asosiy, zaxiraBor, gemini: factory('gemini'), openai: factory('openai') });
    return { n, calls, errors, states, texts, stream, get ended() { return ended; }, get stopped() { return stopped; } };
  };
  try {
    await test('Five-minute rotation renews same provider with signed continuation and existing microphone', () => {
      const s = setup(); s.calls[0].cb.onQaytaUlanish!('muddat', 'signed-session', s.stream); next();
      assert.equal(s.calls.length, 2); assert.equal(s.calls[1].p, 'gemini'); assert.equal(s.calls[1].opt.davom, 'signed-session'); assert.equal(s.calls[1].opt.mikrofon, s.stream); assert.equal(s.ended, 0); s.n.bekor();
    });
    await test('Both directions fail over; failed startup voucher and native voice selection are forwarded', () => {
      for (const p of ['gemini', 'openai'] as const) {
        const s = setup(p); s.calls[0].cb.onQaytaUlanish!('provayder', undefined, s.stream, 'failed-voucher'); next();
        assert.notEqual(s.calls[1].p, p); assert.equal(s.calls[1].opt.zaxira, true);
        if (p === 'gemini') assert.equal(s.calls[1].opt.qoplash, 'failed-voucher'); s.n.bekor();
      }
    });
    await test('Repeated outages stop after two retries; old callbacks cannot mutate new transcript or end it', () => {
      const s = setup(); s.calls[0].cb.onQaytaUlanish!('provayder', 'ticket', s.stream); next();
      s.calls[0].cb.onTugadi(); s.calls[0].cb.onMatn('old', 'a', 'stale'); assert.equal(s.ended, 0); assert.equal(s.texts.length, 0);
      s.calls[1].cb.onQaytaUlanish!('provayder', 'ticket', s.stream); next(); assert.equal(s.calls[2].opt.davom, undefined, 'continuation never replayed');
      s.calls[2].cb.onQaytaUlanish!('provayder', undefined, s.stream);
      assert.equal(s.calls.length, 3); assert.equal(timers.size, 0); assert.equal(s.ended, 1); assert.equal(s.stopped, 1); assert.equal(s.errors.length, 1);
    });
    await test('Manual stop during renewal prevents a new connection and releases the microphone exactly once', () => {
      const s = setup(); s.calls[0].cb.onQaytaUlanish!('muddat', 'ticket', s.stream); s.n.bekor(); s.n.bekor();
      assert.equal(timers.size, 0); assert.equal(s.calls.length, 1); assert.equal(s.ended, 1); assert.equal(s.stopped, 1); assert.equal(s.n.yubor('Excel'), false);
    });
    await test('Quota/auth termination is fatal and does not spend another provider request', () => {
      const s = setup(); s.calls[0].cb.onXato('Limit'); s.calls[0].cb.onTugadi(); assert.equal(s.ended, 1); assert.equal(timers.size, 0); assert.equal(s.calls.length, 1);
    });
    await test('External speech failure selects native audio on same provider and retains it on later fallback', () => {
      const s = setup(); s.calls[0].cb.onQaytaUlanish!('ovoz', 'ticket1', s.stream); next();
      assert.equal(s.calls[1].p, 'gemini'); assert.equal(s.calls[1].opt.mahalliyOvoz, true);
      s.calls[1].cb.onQaytaUlanish!('provayder', 'ticket2', s.stream); next();
      assert.equal(s.calls[2].p, 'openai'); assert.equal(s.calls[2].opt.mahalliyOvoz, true); s.n.bekor();
    });
    await test('Ticket renewal preserves connection; abort ignores late renewal and auth denial never loops', async () => {
      const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
      let token = 'old', calls = 0, errors = 0;
      Object.assign(globalThis, { fetch: async (_: string, opt: RequestInit) => {
        calls++; assert.equal(JSON.parse(String(opt.body)).tur, 'yangilash');
        return Response.json({ ruxsat: 'new', muddatMs: 300_000 });
      } });
      const c = new AbortController();
      jonliRuxsatniYangilabTur({ ruxsat: () => token, yangilandi: (t) => { token = t; }, muddatMs: 300_000, signal: c.signal, xato: () => { errors++; } });
      next(); await flush(); assert.equal(token, 'new'); assert.equal(calls, 1); assert.equal(errors, 0); assert.equal(timers.size, 1);
      c.abort(); assert.equal(timers.size, 0);
      let reply!: (r: Response) => void;
      Object.assign(globalThis, { fetch: () => new Promise<Response>((r) => { reply = r; }) });
      const b = new AbortController();
      jonliRuxsatniYangilabTur({ ruxsat: () => token, yangilandi: (t) => { token = t; }, muddatMs: 300_000, signal: b.signal, xato: () => { errors++; } });
      next(); b.abort(); reply(Response.json({ ruxsat: 'late' })); await flush(); assert.equal(token, 'new'); assert.equal(timers.size, 0);
      Object.assign(globalThis, { fetch: async () => Response.json({}, { status: 403 }) });
      jonliRuxsatniYangilabTur({ ruxsat: () => token, yangilandi: (t) => { token = t; }, muddatMs: 300_000, signal: new AbortController().signal, xato: (s) => { assert.equal(s, 403); errors++; } });
      next(); await flush(); assert.equal(errors, 1); assert.equal(timers.size, 0);
    });
    await test('Calendar budget resets at Tashkent midnight and permits a full working day by default', () => {
      assert.equal(jonliChegaralari({} as NodeJS.ProcessEnv).kunlik, 120);
      assert.equal(jonliChegaralari({ NODE_ENV: 'test', AGENT_REALTIME_DAILY_LIMIT: '200' } as NodeJS.ProcessEnv).kunlik, 200);
      assert.equal(jonliKunKaliti(new Date('2026-10-07T18:59:59Z')), '2026-10-07');
      assert.equal(jonliKunKaliti(new Date('2026-10-07T19:00:00Z')), '2026-10-08');
    });
    await test('Gemini audio is opt-in, bounded, validates PCM rate/base64 and suppresses interrupted audio', () => {
      const sc = { modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'AAB/fw==' } }] } };
      assert.deepEqual(geminiXabarOqi({ serverContent: sc }, 'transkript'), []);
      assert.deepEqual(geminiXabarOqi({ serverContent: sc }, 'transkript', true), [{ t: 'ovoz', data: 'AAB/fw==', hz: 24000 }]);
      assert.deepEqual(geminiXabarOqi({ serverContent: { ...sc, interrupted: true } }, 'transkript', true), [{ t: 'toxtadi' }]);
    });
    await test('Native PCM uses one player, correct signed samples and cancellation; no TTS HTTP call', async () => {
      let source: { onended?: () => void; stopped?: boolean } = {}, requests = 0;
      const samples: Float32Array[] = [];
      Object.assign(globalThis, { requestAnimationFrame: () => 1, cancelAnimationFrame() {}, fetch: () => { requests++; throw new Error('native does not fetch'); } });
      const ctx = { state: 'running', destination: {}, createBuffer: (_: number, n: number) => { const a = new Float32Array(n); samples.push(a); return { getChannelData: () => a }; }, createBufferSource: () => { source = { start() {}, stop() { this.stopped = true; }, connect() {}, disconnect() {} } as typeof source; return source; }, createAnalyser: () => ({ fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(a: Uint8Array) { a.fill(150); } }) } as unknown as AudioContext;
      const q = nutqNavbatiYarat(ctx, () => '', { onBoshlandi() {}, onTugadi() {}, onDaraja() {}, onXato(m) { throw new Error(m); } });
      q.qoshPcm(pcm16Base64(new Float32Array([-1, 0, .5])), 24000); q.tugatish();
      for (let i = 0; i < 8; i++) await Promise.resolve();
      assert.equal(samples[0][0], -1); assert.equal(samples[0][1], 0); assert.ok(Math.abs(samples[0][2] - .5) < .0001); assert.equal(requests, 0);
      q.toxtat(); assert.equal(source.stopped, true);
    });
    console.log(`${tests}/${tests} live renewal/native audio checks passed.`);
  } finally { globalThis.setTimeout = realSet; globalThis.clearTimeout = realClear; }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
