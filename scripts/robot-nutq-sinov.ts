import assert from 'node:assert/strict';
import { javobniGapir, nutqniTayyorla, nutqniToxtat, nutqMuhitiniYop } from '../src/components/agent/nutq-ijrosi';

async function main() {
  let manba: { onended: (() => void) | null; stopped: boolean; started: boolean; buffer: unknown; connect(): void; disconnect(): void; stop(): void; start(): void };
  let analizatorYopildi = 0;
  let calls = 0;
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  class AudioMock {
    state = 'running'; destination = {}; resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: .1 }); }
    createBufferSource() {
      manba = { onended: null, stopped: false, started: false, buffer: null, connect() {}, disconnect() {}, stop() { this.stopped = true; }, start() { this.started = true; } };
      return manba;
    }
    createAnalyser() { return { fftSize: 256, connect() {}, disconnect() { analizatorYopildi++; }, getByteTimeDomainData(a: Uint8Array) { a.fill(150); } }; }
  }
  Object.assign(globalThis, {
    window: { AudioContext: AudioMock, speechSynthesis: { getVoices: () => [{ lang: 'uz-UZ' }], cancel() {} } },
    requestAnimationFrame: (f: FrameRequestCallback) => { frames.set(++frameId, f); return frameId; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    fetch: async () => { calls++; return new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'audio/mpeg' } }); },
  });
  nutqniTayyorla();
  let started = 0, ended = 0;
  const levels: number[] = [];
  const h = { serverMumkin: true, onYuklash() {}, onBoshlandi() { started++; }, onTugadi() { ended++; }, onXato(m: string) { throw new Error(m); }, onDaraja(d: number) { levels.push(d); } };
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  javobniGapir('Salom', h); await flush();
  assert.equal(calls, 1, 'Configured server voice takes priority over browser voices');
  assert.equal(started, 1); assert.equal(manba!.started, true); assert.ok(levels.some((d) => d > 0));
  manba!.onended?.();
  assert.equal(ended, 1); assert.equal(levels.at(-1), 0); assert.equal(frames.size, 0); assert.equal(analizatorYopildi, 1);
  javobniGapir('Ikkinchi javob', h); await flush();
  const lateEnd = manba!.onended;
  nutqniToxtat(); lateEnd?.();
  assert.equal(ended, 1, 'Cancelled audio must not advance the conversation');
  assert.equal(frames.size, 0); assert.equal(levels.at(-1), 0); assert.equal(manba!.stopped, true);
  javobniGapir('Kech javob', h); nutqniToxtat(); await flush();
  assert.equal(started, 2, 'Late fetch must not start cancelled audio');
  nutqMuhitiniYop();
  console.log('3/3 passed: server voice priority/amplitude, playback cleanup, cancellation');
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
