'use client';

/** PCM16 24 kHz oqimini fayl tugashini kutmasdan, bitta audio vaqt chizig'ida ijro etadi. */
export async function pcmNutqniIjroEt(ctx: AudioContext, r: Response, signal: AbortSignal, h: {
  onBoshlandi(): void; onDaraja(d: number): void;
}): Promise<void> {
  const reader = r.body?.getReader();
  if (!reader) throw new Error('Ovoz oqimi bo‘sh.');
  const sources = new Set<AudioBufferSourceNode>();
  const analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.connect(ctx.destination);
  let stopped = false;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0, eof = false, started = false, size = 0, next = 0;
  let pending = new Uint8Array(0);
  let resolve!: () => void, reject!: (e: Error) => void;
  const finished = new Promise<void>((a, b) => { resolve = a; reject = b; });
  void finished.catch(() => {}); // Bekor qilish reader kutish paytida kelishi mumkin.
  const abort = () => {
    stopped = true;
    void reader.cancel().catch(() => {});
    for (const s of sources) { s.onended = null; try { s.stop(); s.disconnect(); } catch { /* tugagan */ } }
    sources.clear(); reject(new DOMException('Bekor qilindi', 'AbortError'));
  };
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 25_000); // Faqat yuklash; uzoq audio ijrosi bu limitga kirmaydi.
  const levels = () => {
    const a = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(a);
    h.onDaraja(Math.min(1, Math.sqrt(a.reduce((v, n) => v + ((n - 128) / 128) ** 2, 0) / a.length) * 5));
    frame = requestAnimationFrame(levels);
  };
  const play = (last = false) => {
    const n = pending.length - pending.length % 2;
    if (!n || !last && n < (started ? 12_000 : 4800)) return;
    const b = ctx.createBuffer(1, n / 2, 24_000), a = b.getChannelData(0);
    const v = new DataView(pending.buffer, pending.byteOffset, n);
    for (let i = 0; i < a.length; i++) a[i] = v.getInt16(i * 2, true) / 32768;
    pending = pending.slice(n);
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(analyser); sources.add(s);
    s.onended = () => { s.disconnect(); sources.delete(s); if (eof && !sources.size) resolve(); };
    next = Math.max(next, ctx.currentTime + .025);
    s.start(next); next += n / 48_000;
    if (!started) { started = true; h.onBoshlandi(); levels(); }
  };
  try {
    signal.throwIfAborted();
    if (ctx.state === 'suspended') await ctx.resume();
    signal.throwIfAborted();
    if (ctx.state !== 'running') throw new Error('Audio ochilmadi.');
    for (;;) {
      const { value, done } = await reader.read(); signal.throwIfAborted();
      if (stopped) throw new Error('Ovoz vaqtida kelmadi.');
      if (done) break;
      size += value.byteLength;
      if (size > 9_600_000 || sources.size > 1000) throw new Error('Ovoz oqimi juda katta.');
      const a = new Uint8Array(pending.length + value.length); a.set(pending); a.set(value, pending.length); pending = a;
      play();
    }
    clearTimeout(timer);
    if (!size || size % 2) throw new Error('Ovoz oqimi uzilgan.');
    play(true); eof = true;
    if (!sources.size) resolve();
    endTimer = setTimeout(abort, Math.max(2000, (next - ctx.currentTime) * 1000 + 2000));
    await finished;
  } catch (e) { abort(); throw e; }
  finally {
    clearTimeout(timer); clearTimeout(endTimer); signal.removeEventListener('abort', abort); await reader.cancel().catch(() => {});
    reader.releaseLock(); cancelAnimationFrame(frame); analyser.disconnect(); h.onDaraja(0);
  }
}
