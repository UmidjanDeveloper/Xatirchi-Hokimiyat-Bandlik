import { z } from 'zod';

export const JarvisSxemasi = z.object({
  xabar: z.string().trim().min(1).max(600),
  tarix: z.array(z.object({ r: z.enum(['f', 'a']), m: z.string().max(800) }).strict()).max(8).default([]),
}).strict();

/** Only a server administrator can select the gateway, never the request payload. */
export function jarvisSozlama(env: NodeJS.ProcessEnv = process.env) {
  if (env.JARVIS_ENABLED !== '1') return null;
  try {
    const url = new URL(env.JARVIS_BASE_URL ?? '');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && local && url.protocol === 'http:')) return null;
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    const token = env.JARVIS_GATEWAY_TOKEN?.trim();
    if (!token || token.length < 16) return null;
    return { endpoint: `${url.origin}/hugginggpt`, token };
  } catch { return null; }
}

export async function chegaraliMatn(body: ReadableStream<Uint8Array> | null, max: number): Promise<string> {
  if (!body) throw new Error('Bosh javob');
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) { await reader.cancel(); throw new Error('Hajm chegarasi'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) { bytes.set(chunk, pos); pos += chunk.length; }
  return new TextDecoder().decode(bytes);
}

/** Contract verified against microsoft/JARVIS 7624cf3: POST messages -> { message }. */
export async function jarvisJavobi(
  d: z.infer<typeof JarvisSxemasi>,
  sozlama: NonNullable<ReturnType<typeof jarvisSozlama>>,
  opt: { signal?: AbortSignal; fetchFn?: typeof fetch; kutishMs?: number } = {}
): Promise<string> {
  const ctrl = new AbortController();
  const bekor = () => ctrl.abort();
  opt.signal?.addEventListener('abort', bekor, { once: true });
  if (opt.signal?.aborted) ctrl.abort();
  const timer = setTimeout(bekor, opt.kutishMs ?? 40_000);
  try {
    if (ctrl.signal.aborted) throw new Error('Bekor qilindi');
    const til = "O‘zbek tilida ravon javob ber. Bilmagan narsangni ayt, fakt va manbalarni to‘qima. Platforma bazasiga kirishing yo‘q; undagi raqamlarni taxmin qilma. Internetda tekshirmagan yangilikni tekshirilgan deb aytma.";
    const messages = [
      { role: 'system', content: til },
      ...d.tarix.map((t) => ({ role: t.r === 'f' ? 'user' : 'assistant', content: t.m })),
      // Upstream response_results receives the last input, not the entire system context.
      { role: 'user', content: `${d.xabar}\n\nJavob tili va talablari: ${til}` },
    ];
    const r = await (opt.fetchFn ?? fetch)(sozlama.endpoint, {
      method: 'POST', redirect: 'error', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${sozlama.token}` },
      body: JSON.stringify({ messages }),
    });
    if (!r.ok) throw new Error(`JARVIS HTTP ${r.status}`);
    const raw = await chegaraliMatn(r.body, 64_000);
    if (ctrl.signal.aborted) throw new Error('JARVIS vaqti tugadi');
    const result = z.object({ message: z.string().trim().min(1).max(12_000), error: z.never().optional() }).safeParse(JSON.parse(raw));
    if (!result.success) throw new Error('JARVIS javobi notogri');
    return result.data.message;
  } finally {
    clearTimeout(timer);
    opt.signal?.removeEventListener('abort', bekor);
  }
}
