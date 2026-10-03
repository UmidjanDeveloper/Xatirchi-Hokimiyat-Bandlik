/** Server-only configuration; keys never leave the API route. */
export function ttsSozlama(env: NodeJS.ProcessEnv = process.env) {
  const kalit = env.OPENAI_API_KEY?.trim();
  if (env.AGENT_TTS !== '1' || !kalit) return null;
  return { kalit, model: 'gpt-4o-mini-tts', voice: 'marin' };
}

export async function matnniOvozga(
  matn: string,
  sozlama: NonNullable<ReturnType<typeof ttsSozlama>>,
  signal?: AbortSignal,
  fetchFn: typeof fetch = fetch,
  kutishMs = 18_000
): Promise<ArrayBuffer> {
  const ctrl = new AbortController();
  const bekor = () => ctrl.abort();
  signal?.addEventListener('abort', bekor, { once: true });
  if (signal?.aborted) ctrl.abort();
  const soat = setTimeout(bekor, kutishMs);
  try {
    if (ctrl.signal.aborted) throw new Error('Ovoz bekor qilindi');
    const r = await fetchFn('https://api.openai.com/v1/audio/speech', {
      method: 'POST', signal: ctrl.signal,
      headers: { Authorization: `Bearer ${sozlama.kalit}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: sozlama.model, voice: sozlama.voice, input: matn,
        response_format: 'mp3',
        instructions: "Speak in natural, clear Uzbek, warmly and calmly. Pronounce o‘, g‘, q, x and h distinctly. Read the supplied text only; do not translate it or add words. Avoid exaggerated cartoon acting.",
      }),
    });
    if (!r.ok) throw new Error(`Ovoz xizmati: HTTP ${r.status}`);
    if (!r.headers.get('content-type')?.startsWith('audio/')) throw new Error('Ovoz javobi noto‘g‘ri');
    const body = await r.arrayBuffer(); // deadline includes body consumption
    if (ctrl.signal.aborted) throw new Error('Ovoz vaqti tugadi');
    if (!body.byteLength || body.byteLength > 4_000_000) throw new Error('Ovoz hajmi noto‘g‘ri');
    return body;
  } finally {
    clearTimeout(soat);
    signal?.removeEventListener('abort', bekor);
  }
}
