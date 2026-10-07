'use client';

/** Provider aloqasini va suhbat kontekstini uzmasdan server ruxsatnomasini yangilaydi. */
export function jonliRuxsatniYangilabTur(opt: {
  ruxsat(): string; yangilandi(ruxsat: string): void; muddatMs: number;
  signal: AbortSignal; xato(status: number): void;
}): void {
  let vaqt: ReturnType<typeof setTimeout> | undefined;
  const toxta = () => { clearTimeout(vaqt); opt.signal.removeEventListener('abort', toxta); };
  opt.signal.addEventListener('abort', toxta, { once: true });
  const kut = (ms: number) => {
    if (opt.signal.aborted) return toxta();
    vaqt = setTimeout(() => { void yangila(); }, Math.max(1000, Math.min(ms, 300_000) - 20_000));
  };
  const yangila = async () => {
    try {
      const r = await fetch('/api/agent/jonli', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tur: 'yangilash', ruxsat: opt.ruxsat() }),
        signal: AbortSignal.any([opt.signal, AbortSignal.timeout(8000)]),
      });
      const d = await r.json() as { ruxsat?: string; muddatMs?: number };
      if (opt.signal.aborted) return;
      if (!r.ok || typeof d.ruxsat !== 'string' || !d.ruxsat || d.ruxsat.length > 2000) { toxta(); opt.xato(r.status); return; }
      opt.yangilandi(d.ruxsat); kut(typeof d.muddatMs === 'number' && Number.isFinite(d.muddatMs) && d.muddatMs > 0 ? d.muddatMs : 300_000);
    } catch { if (!opt.signal.aborted) { toxta(); opt.xato(0); } }
  };
  kut(opt.muddatMs);
}
