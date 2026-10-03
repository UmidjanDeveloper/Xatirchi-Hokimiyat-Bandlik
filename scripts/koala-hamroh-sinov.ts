import assert from 'node:assert/strict';
import { ttsSozlama, matnniOvozga } from '../src/lib/agent/tts';
import { ovozniMatnga } from '../src/lib/agent/stt';
import { petChegarasi } from '../src/components/agent/pet-joy';
import { javobOvozi } from '../src/components/agent/javob-ovozi';

async function main() {
  let tests = 0;
  const test = async (name: string, fn: () => unknown) => { await fn(); console.log('OK', name); tests++; };
  const soz = { kalit: 'test-only', model: 'gpt-4o-mini-tts', voice: 'marin' };
  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await test('TTS is opt-in, requires a key, never reuses Groq credentials', () => {
    assert.equal(ttsSozlama({} as unknown as NodeJS.ProcessEnv), null);
    assert.equal(ttsSozlama({ OPENAI_API_KEY: 'test' } as unknown as NodeJS.ProcessEnv), null);
    assert.equal(ttsSozlama({ AGENT_TTS: '1', GROQ_API_KEY: 'test' } as unknown as NodeJS.ProcessEnv), null);
    assert.ok(ttsSozlama({ AGENT_TTS: '1', OPENAI_API_KEY: 'test' } as unknown as NodeJS.ProcessEnv));
  });
  await test('TTS sends Uzbek instructions and returns audio bytes', async () => {
    const b = await matnniOvozga('Xatirchi, o‘qish va g‘oya', soz, undefined, (async (url: unknown, init?: RequestInit) => {
      assert.equal(url, 'https://api.openai.com/v1/audio/speech');
      const body = JSON.parse(init?.body as string);
      assert.match(body.instructions, /Uzbek/); assert.equal(body.input, 'Xatirchi, o‘qish va g‘oya');
      return new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'audio/mpeg' } });
    }) as unknown as typeof fetch);
    assert.equal(b.byteLength, 2);
  });
  await test('TTS refuses JSON pretending to be audio', async () => {
    await assert.rejects(matnniOvozga('salom', soz, undefined, (async () => new Response('{}')) as unknown as typeof fetch));
  });
  await test('TTS body read is inside the shared timeout', async () => {
    await assert.rejects(matnniOvozga('salom', soz, undefined, (async () => ({ ok: true, headers: new Headers({ 'content-type': 'audio/mpeg' }), arrayBuffer: async () => { await pause(25); return new ArrayBuffer(2); } })) as unknown as typeof fetch, 5));
  });
  await test('Cancelled TTS never contacts provider', async () => {
    const c = new AbortController(); c.abort(); let calls = 0;
    await assert.rejects(matnniOvozga('salom', soz, c.signal, (async () => { calls++; return new Response(); }) as unknown as typeof fetch));
    assert.equal(calls, 0);
  });
  const prov = { provayder: 'openai' as const, baza: 'https://mock.invalid', kalit: 'test' };
  await test('STT late response body no longer succeeds past timeout', async () => {
    const r = await ovozniMatnga(prov, new File(['x'], 'x.wav'), { kutishMs: 5,
      fetchFn: (async () => ({ ok: true, json: async () => { await pause(25); return { text: 'salom' }; } })) as unknown as typeof fetch });
    assert.equal(r.ok, false); if (!r.ok) assert.equal(r.sabab, 'vaqt');
  });
  await test('STT retry shares deadline rather than restarting it', async () => {
    let calls = 0;
    const r = await ovozniMatnga(prov, new File(['x'], 'x.wav'), { kutishMs: 5,
      fetchFn: (async () => { calls++; return new Response('server', { status: 500 }); }) as unknown as typeof fetch });
    assert.equal(calls, 1); assert.equal(r.ok, false);
  });
  await test('Pet remains inside a resized phone viewport; invalid positions are safe', () => {
    assert.deepEqual(petChegarasi({ x: 9999, y: 9999 }, 375, 667), { x: 275, y: 555 });
    assert.deepEqual(petChegarasi({ x: NaN, y: -40 }, 375, 667), { x: 12, y: 12 });
  });
  const originalFetch = globalThis.fetch;
  const originalAudio = globalThis.Audio;
  const originalWindow = globalThis.window;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let created = 0, revoked = 0;
  const audios: FakeAudio[] = [];
  class FakeAudio {
    onplaying: (() => void) | null = null; onended: (() => void) | null = null; onerror: (() => void) | null = null;
    paused = false;
    constructor() { audios.push(this); }
    async play() { this.onplaying?.(); }
    pause() { this.paused = true; }
    removeAttribute() {} load() {}
  }
  try {
    globalThis.window = {} as Window & typeof globalThis;
    globalThis.Audio = FakeAudio as unknown as typeof Audio;
    URL.createObjectURL = () => { created++; return 'blob:test'; };
    URL.revokeObjectURL = () => { revoked++; };
    await test('Late cancelled speech cannot start audio', async () => {
      let respond!: (r: Response) => void;
      globalThis.fetch = (() => new Promise<Response>((r) => { respond = r; })) as unknown as typeof fetch;
      const player = javobOvozi();
      const pending = player.oqi('salom', true, { boshlandi: () => assert.fail('late playback'), tugadi() {}, xato: () => assert.fail('cancel is not error') });
      player.toxtat(); respond(new Response('audio', { headers: { 'content-type': 'audio/mpeg' } }));
      await pending; assert.equal(audios.length, 0); assert.equal(created, 0);
    });
    await test('Playback state starts with audio, finishes once, and releases its URL', async () => {
      globalThis.fetch = (async () => new Response('audio', { headers: { 'content-type': 'audio/mpeg' } })) as unknown as typeof fetch;
      const player = javobOvozi(); let starts = 0, ends = 0;
      await player.oqi('salom', true, { boshlandi: () => starts++, tugadi: () => ends++, xato: () => assert.fail() });
      assert.equal(starts, 1); audios[0].onended?.(); assert.equal(ends, 1); assert.equal(revoked, 1); assert.equal(audios[0].paused, true);
      player.toxtat(); assert.equal(ends, 1);
    });
  } finally {
    globalThis.fetch = originalFetch; globalThis.Audio = originalAudio; globalThis.window = originalWindow;
    URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
  }
  console.log(`${tests}/${tests} o'tdi`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
