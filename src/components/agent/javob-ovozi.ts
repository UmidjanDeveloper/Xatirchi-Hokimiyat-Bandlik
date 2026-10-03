import { gapir, gapirishniToxtat } from './ovoz';

/** One owner per conversation: cancellation also invalidates late fetch/play callbacks. */
export function javobOvozi() {
  let avlod = 0;
  let ctrl: AbortController | null = null;
  let audio: HTMLAudioElement | null = null;
  let url: string | null = null;
  let soat: ReturnType<typeof setTimeout> | null = null;
  const toxtat = () => {
    avlod++;
    ctrl?.abort(); ctrl = null;
    if (soat) clearTimeout(soat);
    soat = null;
    if (audio) { audio.onplaying = null; audio.onended = null; audio.onerror = null; audio.pause(); audio.removeAttribute('src'); audio.load(); }
    audio = null;
    if (url) URL.revokeObjectURL(url);
    url = null;
    gapirishniToxtat();
  };
  return {
    toxtat,
    async oqi(matn: string, server: boolean, h: { boshlandi(): void; tugadi(): void; xato(): void }) {
      toxtat();
      const id = avlod;
      const yakun = () => { if (id === avlod) { toxtat(); h.tugadi(); } };
      const xato = () => { if (id === avlod) { toxtat(); h.xato(); } };
      if (!server) {
        if (!gapir(matn, yakun, () => { if (id === avlod) h.boshlandi(); })) xato();
        return;
      }
      ctrl = new AbortController();
      const signal = ctrl.signal;
      soat = setTimeout(() => { if (id === avlod) xato(); }, 22_000);
      try {
        const r = await fetch('/api/agent/gapir', { method: 'POST', signal,
          headers: { 'content-type': 'application/json' }, body: JSON.stringify({ matn }) });
        if (!r.ok) throw new Error('ovoz');
        const blob = await r.blob();
        if (id !== avlod) return;
        if (!blob.type.startsWith('audio/')) throw new Error('format');
        url = URL.createObjectURL(blob);
        audio = new Audio(url);
        audio.onplaying = () => {
          if (id !== avlod) return;
          if (soat) clearTimeout(soat);
          soat = setTimeout(xato, 180_000);
          h.boshlandi();
        };
        audio.onended = yakun;
        audio.onerror = xato;
        await audio.play();
      } catch { if (id === avlod) xato(); }
    },
  };
}
