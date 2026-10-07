type Rejim = 'playback' | 'play-and-record';
type Sessiya = { type: string };
const seanslar = new WeakMap<Sessiya, { avval: string; oxirgi: string; egalar: Map<symbol, Rejim> }>();

/** iOS Web Audio sukutda ambient: jim rejim uni o'chiradi. Mikrofon uchun duplex ustuvor. */
export function audioSeansiniOl(rejim: Rejim): () => void {
  const hechNarsa = () => {};
  if (typeof navigator === 'undefined') return hechNarsa;
  try {
    const s = (navigator as unknown as { audioSession?: Sessiya }).audioSession;
    if (!s || typeof s.type !== 'string') return hechNarsa;
    const q = seanslar.get(s) ?? { avval: s.type, oxirgi: s.type, egalar: new Map<symbol, Rejim>() };
    const id = Symbol(); q.egalar.set(id, rejim);
    const tanla = () => [...q.egalar.values()].includes('play-and-record') ? 'play-and-record' : q.egalar.size ? 'playback' : q.avval;
    try { s.type = tanla(); q.oxirgi = s.type; }
    catch { q.egalar.delete(id); return hechNarsa; }
    seanslar.set(s, q);
    let yopildi = false;
    return () => {
      if (yopildi) return; yopildi = true; q.egalar.delete(id);
      try { if (s.type === q.oxirgi) { s.type = tanla(); q.oxirgi = s.type; } } catch { /* API qo'llanmaydi */ }
      if (!q.egalar.size) seanslar.delete(s);
    };
  } catch { return hechNarsa; }
}

/** Safari qo'ng'iroq/fondan qaytgach interrupted bo'lishi ham mumkin. */
export function audioKontekstiToxtagan(ctx: AudioContext): boolean {
  return ['suspended', 'interrupted'].includes(ctx.state as string);
}

/** Safari gesture kutayotgan resume()ni abadiy ochiq qoldirishi mumkin. */
export async function audioKontekstiniUygot(ctx: AudioContext, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  if (!audioKontekstiToxtagan(ctx)) return;
  await new Promise<void>((resolve, reject) => {
    let tugadi = false;
    const yakun = (e?: unknown) => {
      if (tugadi) return; tugadi = true; clearTimeout(timer); signal?.removeEventListener('abort', bekor);
      if (e) reject(e); else resolve();
    };
    const bekor = () => yakun(new DOMException('Bekor qilindi', 'AbortError'));
    const timer = setTimeout(() => yakun(new DOMException('Ovozni yoqish tugmasini qayta bosing.', 'NotAllowedError')), 3000);
    signal?.addEventListener('abort', bekor, { once: true });
    try { Promise.resolve(ctx.resume()).then(() => yakun(), yakun); } catch (e) { yakun(e); }
  });
  signal?.throwIfAborted();
  if (ctx.state !== 'running') throw new DOMException('Ovozga ruxsat berilmadi.', 'NotAllowedError');
}
