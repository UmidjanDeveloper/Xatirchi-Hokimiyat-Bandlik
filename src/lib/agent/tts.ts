import { nutqProvayderi, nutqYarat } from './nutq';

/** Server ovozi mavjud opt-in sozlamalar bilan ishlaydi; Groq kaliti ishlatilmaydi. */
export function ttsSozlama(env: NodeJS.ProcessEnv = process.env) {
  const p = nutqProvayderi(env);
  return p ? { provayder: p.provayder, kalit: p.kalit, model: p.model, voice: p.ovoz } : null;
}

export function matnniOvozga(
  matn: string,
  sozlama: { provayder?: 'openai' | 'elevenlabs'; kalit: string; model: string; voice: string },
  signal?: AbortSignal,
  fetchFn: typeof fetch = fetch,
  kutishMs = 18_000
): Promise<ArrayBuffer> {
  return nutqYarat({ provayder: sozlama.provayder, kalit: sozlama.kalit, model: sozlama.model, ovoz: sozlama.voice }, matn, { signal, fetchFn: fetchFn === fetch ? undefined : fetchFn, kutishMs });
}
