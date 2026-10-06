/** WebRTC lifecycle fixtures; exercises the real client owner without a microphone/provider. */
import assert from 'node:assert/strict';
import { jonliBoshla, type JonliHodisalar } from '../src/components/agent/jonli-suhbat';

const tick = () => new Promise((r) => setTimeout(r, 10));
async function main() {
  let checks = 0;
  const test = async (m: string, f: () => Promise<void>) => { await f(); checks++; console.log('OK', m); };
  const setup = () => {
    const sent: Record<string, any>[] = [], states: string[] = [], amplitudes: number[] = [], transcripts: string[] = [], errors: string[] = [];
    let stopped = 0, ended = 0, effects = 0, providerClose = 0, toolCalls = 0, peers = 0;
    let mediaFn: (() => Promise<any>) | undefined;
    let startFn: (() => Promise<Response>) | undefined;
    let toolFn: (() => Promise<Response>) | undefined;
    const track = { stop: () => { stopped++; } };
    const stream = { getTracks: () => [track] };
    let peer: any;
    class Channel {
      readyState = 'connecting'; onopen?: () => void; onclose?: () => void; onmessage?: (e: { data: string }) => void;
      send(m: string) { sent.push(JSON.parse(m)); }
      close() { this.readyState = 'closed'; this.onclose?.(); }
      emit(e: unknown) { this.onmessage?.({ data: JSON.stringify(e) }); }
    }
    class Peer {
      connectionState = 'new'; channel = new Channel(); ontrack?: (e: unknown) => void; onconnectionstatechange?: () => void;
      constructor() { peer = this; peers++; }
      addTrack() {} createDataChannel() { return this.channel; }
      async createOffer() { return { sdp: 'v=0 mock-offer' }; } async setLocalDescription() {}
      async setRemoteDescription() { this.channel.readyState = 'open'; this.channel.onopen?.(); this.ontrack?.({ streams: [stream], track }); }
      close() { this.connectionState = 'closed'; this.onconnectionstatechange?.(); }
    }
    class AudioContextFixture {
      async resume() {} async close() {}
      createMediaStreamSource() { return { connect() {} }; }
      createAnalyser() { return { fftSize: 256, getFloatTimeDomainData(d: Float32Array) { d.fill(0.06); } }; }
    }
    Object.assign(globalThis, {
      window: { RTCPeerConnection: Peer, AudioContext: AudioContextFixture }, RTCPeerConnection: Peer,
      document: { body: { appendChild() {} }, createElement: () => ({ style: {}, setAttribute() {}, play: async () => {}, pause() {}, remove() {}, srcObject: null }) },
      requestAnimationFrame: (f: () => void) => setTimeout(f, 10), cancelAnimationFrame: (n: ReturnType<typeof setTimeout>) => clearTimeout(n),
      fetch: async (_url: unknown, init: RequestInit) => {
        const d = JSON.parse(String(init.body));
        if (d.tur === 'yopish') { providerClose++; return Response.json({ yopildi: true }); }
        if (d.tur === 'ulanish') return startFn ? startFn() : Response.json({ sdp: 'v=0 mock-answer', ruxsat: 'mock-ticket', muddatMs: 300_000 });
        toolCalls++; return toolFn ? toolFn() : Response.json({ malumot: { ok: true }, amallar: [{ tur: 'ochish', url: '/panel', nomi: 'Panel' }], manbalar: [] });
      },
    });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: () => mediaFn ? mediaFn() : Promise.resolve(stream) } } });
    const cb: JonliHodisalar = {
      onHolat: (s) => states.push(s), onDaraja: (d) => amplitudes.push(d), onMatn: (_, r, m) => transcripts.push(`${r}:${m}`),
      onAmallar: async () => { effects++; return { ochildi: true }; }, onXato: (m) => errors.push(m), onTugadi: () => { ended++; },
    };
    return { cb, sent, states, amplitudes, transcripts, errors, stream,
      get peer() { return peer; }, get stopped() { return stopped; }, get ended() { return ended; }, get effects() { return effects; },
      get providerClose() { return providerClose; }, get toolCalls() { return toolCalls; }, get peers() { return peers; },
      setMedia: (f: () => Promise<any>) => { mediaFn = f; }, setStart: (f: () => Promise<Response>) => { startFn = f; }, setTool: (f: () => Promise<Response>) => { toolFn = f; },
    };
  };
  await test('Native output audio drives mouth, streaming transcript and clean teardown exactly once', async () => {
    const s = setup(); const c = jonliBoshla(s.cb); await tick();
    s.peer.channel.emit({ type: 'output_audio_buffer.started' }); await tick();
    assert.ok(s.amplitudes.some((d) => d > 0)); assert.ok(s.states.includes('gapirmoqda'));
    s.peer.channel.emit({ type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'Salom' });
    s.peer.channel.emit({ type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: ', yaxshimisiz?' });
    assert.equal(s.transcripts.at(-1), 'a:Salom, yaxshimisiz?');
    s.peer.channel.emit({ type: 'input_audio_buffer.speech_started' }); assert.equal(s.states.at(-1), 'eshitmoqda'); assert.equal(s.amplitudes.at(-1), 0);
    c.bekor(); c.bekor(); await tick(); assert.equal(s.ended, 1); assert.equal(s.stopped, 2); assert.equal(s.providerClose, 1);
  });
  await test('Typed interruption cancels an active response before audio starts', async () => {
    const s = setup(); const c = jonliBoshla(s.cb); await tick();
    s.peer.channel.emit({ type: 'response.created' });
    const before = s.sent.length;
    assert.equal(c.yubor('Tuman bo‘yicha Excel kerak'), true);
    assert.deepEqual(s.sent.slice(before).map((m) => m.type), ['response.cancel', 'conversation.item.create', 'response.create']);
    c.bekor();
  });
  await test('Repeated provider function call IDs execute one browser effect and one backend request', async () => {
    const s = setup(); const c = jonliBoshla(s.cb); await tick();
    const e = { type: 'response.done', response: { status: 'completed', output: [{ type: 'function_call', call_id: 'call1', name: 'sahifani_och', arguments: '{}' }] } };
    s.peer.channel.emit(e); s.peer.channel.emit(e); await tick();
    assert.equal(s.toolCalls, 1); assert.equal(s.effects, 1);
    assert.equal(s.sent.filter((m) => m.item?.type === 'function_call_output').length, 1); c.bekor();
  });
  await test('User interruption suppresses a late browser action while settling the tool call', async () => {
    const s = setup(); let answer: (r: Response) => void = () => {};
    s.setTool(() => new Promise((r) => { answer = r; }));
    const c = jonliBoshla(s.cb); await tick();
    s.peer.channel.emit({ type: 'response.done', response: { status: 'completed', output: [{ type: 'function_call', call_id: 'late', name: 'sahifani_och', arguments: '{}' }] } });
    const responses = s.sent.filter((m) => m.type === 'response.create').length;
    s.peer.channel.emit({ type: 'input_audio_buffer.speech_started' });
    answer(Response.json({ malumot: {}, amallar: [{ tur: 'ochish', url: '/panel', nomi: 'Panel' }] })); await tick();
    assert.equal(s.effects, 0); assert.equal(s.sent.filter((m) => m.type === 'response.create').length, responses); c.bekor();
  });
  await test('Cancel during delayed microphone permission stops late tracks without creating a connection', async () => {
    const s = setup(); let grant: (r: unknown) => void = () => {};
    s.setMedia(() => new Promise((r) => { grant = r; })); const c = jonliBoshla(s.cb); c.bekor(); grant(s.stream); await tick();
    assert.equal(s.stopped, 1); assert.equal(s.peers, 0); assert.equal(s.ended, 1);
  });
  await test('Late SDP after cancel is hung up; no active peer or microphone remains', async () => {
    const s = setup(); let answer: (r: Response) => void = () => {};
    s.setStart(() => new Promise((r) => { answer = r; })); const c = jonliBoshla(s.cb); await tick(); c.bekor();
    answer(Response.json({ sdp: 'v=0 late', ruxsat: 'late-ticket' })); await tick(); assert.equal(s.ended, 1); assert.equal(s.stopped, 1); assert.equal(s.providerClose, 1);
  });
  await test('Provider denied tool reports failure without browser side effects; cancelled model response executes none', async () => {
    const s = setup(); s.setTool(async () => Response.json({ xabar: 'Ruxsat yo‘q.' }, { status: 403 })); const c = jonliBoshla(s.cb); await tick();
    const output = [{ type: 'function_call', call_id: 'denied', name: 'tizim_holati', arguments: '{}' }];
    s.peer.channel.emit({ type: 'response.done', response: { status: 'cancelled', output } }); await tick(); assert.equal(s.toolCalls, 0);
    s.peer.channel.emit({ type: 'response.done', response: { status: 'completed', output } }); await tick(); assert.equal(s.effects, 0);
    assert.ok(s.sent.some((m) => m.item?.output?.includes('buyruq_rad'))); c.bekor();
  });
  await test('Maximum tool steps produces terminal state after at most 30 effects', async () => {
    const s = setup(); const c = jonliBoshla(s.cb); await tick();
    s.peer.channel.emit({ type: 'response.done', response: { status: 'completed', output: Array.from({ length: 31 }, (_, i) => ({ type: 'function_call', call_id: `call${i}`, name: 'sahifani_och', arguments: '{}' })) } });
    await tick(); assert.equal(s.toolCalls, 30); assert.equal(s.effects, 30); assert.equal(s.ended, 1); assert.ok(s.errors.length); c.bekor();
  });
  await test('ElevenLabs mode speaks completed text once and cancels playback on user interruption/close', async () => {
    const s = setup(); s.setStart(async () => Response.json({ sdp: 'v=0 mock', ruxsat: 'fixture', tashqiOvoz: true }));
    const voices: Array<{ text: string; signal: AbortSignal }> = [];
    s.cb.onOvoz = async (text, signal) => { voices.push({ text, signal }); };
    const c = jonliBoshla(s.cb); await tick();
    const e = { type: 'response.done', response: { id: 'r1', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Assalomu alaykum!' }] }] } };
    s.peer.channel.emit(e); s.peer.channel.emit(e); await tick(); assert.equal(voices.length, 1); assert.equal(voices[0].text, 'Assalomu alaykum!');
    s.cb.onOvoz = (text, signal) => { voices.push({ text, signal }); return new Promise<void>((r) => signal.addEventListener('abort', () => r(), { once: true })); };
    s.peer.channel.emit({ ...e, response: { ...e.response, id: 'r2' } });
    s.peer.channel.emit({ type: 'input_audio_buffer.speech_started' }); assert.equal(voices[1].signal.aborted, true);
    s.peer.channel.emit({ ...e, response: { ...e.response, id: 'r3' } });
    c.bekor(); assert.equal(voices[2].signal.aborted, true); await tick(); assert.equal(s.ended, 1);
  });
  await test('ElevenLabs mode skips cancelled/intermediate tool text and does not replace local mouth animation with remote silence', async () => {
    const s = setup(); s.setStart(async () => Response.json({ sdp: 'v=0 mock', ruxsat: 'fixture', tashqiOvoz: true }));
    let spoken = 0; s.cb.onOvoz = async () => { spoken++; };
    const c = jonliBoshla(s.cb); await tick();
    const message = { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hisobot so‘raldi.' }] };
    s.peer.channel.emit({ type: 'response.done', response: { id: 'cancelled', status: 'cancelled', output: [message] } });
    s.peer.channel.emit({ type: 'response.done', response: { id: 'intermediate', status: 'completed', output: [message, { type: 'function_call', call_id: 'excel', name: 'hisobotni_yukla', arguments: '{}' }] } });
    await tick(); assert.equal(spoken, 0); assert.equal(s.toolCalls, 1); assert.equal(s.amplitudes.length, 0);
    s.peer.channel.emit({ type: 'response.output_text.done', item_id: 'text1', text: 'Javob matni.' }); assert.equal(s.transcripts.at(-1), 'a:Javob matni.');
    c.bekor();
  });
  console.log(`${checks}/${checks} WebRTC owner checks passed with fake media/provider.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
