import { createHash } from 'node:crypto';
import { GEMINI_ODATIY_MODEL, GeminiXatosi, xatoMatni, type GeminiSozlama } from './gemini';

/**
 * ============================================================
 *  KALIT UCHUN MAVJUD GEMINI LIVE MODELLARI
 *
 *  Live model nomlari o'zgaradi; mavjudlikning manbasi — aynan shu kalit uchun qaytgan katalog.
 *  Qattiq yozilgan nom eskirsa, Gemini jimgina ishlamay, jonli suhbat OpenAI'ga o'tib qolardi. Shuning uchun:
 *
 *   - `GEMINI_LIVE_MODEL` YOZILMAGAN bo'lsa va standart model kalit uchun mavjud bo'lmasa, mavjud Live
 *     modellardan mosi tanlanadi (`geminiModeliniHal`);
 *   - `GEMINI_LIVE_MODEL` YOZILGAN bo'lsa hech qachon almashtirilmaydi (administrator tekshiruvi ro'yxatni ko'rsatadi).
 *
 *  Ro'yxat `models.list` dan olinadi: Live modellar `supportedGenerationMethods` da `bidiGenerateContent` ga ega.
 *  Kalit faqat `x-goog-api-key` sarlavhasida ketadi.
 * ============================================================
 */

const MODEL_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const KESH_MS = 30 * 60_000;
const kesh = new Map<string, { royxat: string[]; gacha: number }>();
const ENG_KOP_SAHIFA = 5;

/** Jonli suhbatga yaramaydigan "Live" nomli modellar (matn/tarjima/ovoz/avatar xizmatlari) */
const YARAMAYDI = /(thinking|translate|transcribe|tts|image|embed|avatar|robot|computer)/i;

export function geminiModelKeshiniTozala() { kesh.clear(); }

/** `bidiGenerateContent` qo'llaydigan modellar nomi (`models/` siz). Xatoda `GeminiXatosi` tashlaydi. */
export async function geminiLiveModellari(
  soz: Pick<GeminiSozlama, 'kalit' | 'baza'>,
  opt: { signal?: AbortSignal; fetchFn?: typeof fetch; keshsiz?: boolean } = {}
): Promise<string[]> {
  const fetchFn = opt.fetchFn ?? fetch;
  const id = createHash('sha256').update(soz.kalit).digest('hex');
  const eslangan = !opt.keshsiz && !opt.fetchFn ? kesh.get(id) : undefined;
  if (eslangan && eslangan.gacha > Date.now()) return eslangan.royxat;
  const natija = new Set<string>();
  let sahifa: string | undefined;
  for (let n = 0; n < ENG_KOP_SAHIFA; n++) {
    const url = new URL(`${soz.baza}/v1beta/models`);
    url.searchParams.set('pageSize', '1000');
    if (sahifa) url.searchParams.set('pageToken', sahifa);
    let r: Response;
    try {
      r = await fetchFn(url.toString(), {
        method: 'GET', cache: 'no-store', redirect: 'error', headers: { 'x-goog-api-key': soz.kalit },
        signal: AbortSignal.any([AbortSignal.timeout(8_000), ...(opt.signal ? [opt.signal] : [])]),
      });
    } catch (e) {
      if ((e as Error)?.name === 'TimeoutError') throw new GeminiXatosi('vaqt', 'Gemini model ro‘yxati so‘rovi kechikdi.');
      throw new GeminiXatosi('tarmoq', 'Gemini xizmatiga ulanib bo‘lmadi.');
    }
    const xom = (await r.text().catch(() => '')).slice(0, 600_000);
    if (!r.ok) throw xatoMatni(r.status, xom);
    let d: { models?: unknown; nextPageToken?: unknown };
    try { d = JSON.parse(xom) as typeof d; } catch { throw new GeminiXatosi('javob', 'Gemini model ro‘yxati noto‘g‘ri shaklda.'); }
    for (const m of Array.isArray(d.models) ? d.models : []) {
      const o = (m ?? {}) as { name?: unknown; supportedGenerationMethods?: unknown };
      if (typeof o.name !== 'string' || !Array.isArray(o.supportedGenerationMethods)) continue;
      if (!o.supportedGenerationMethods.some((x) => typeof x === 'string' && x.toLowerCase() === 'bidigeneratecontent')) continue;
      const nom = o.name.replace(/^models\//, '');
      if (MODEL_ID.test(nom)) natija.add(nom);
    }
    sahifa = typeof d.nextPageToken === 'string' && d.nextPageToken ? d.nextPageToken : undefined;
    if (!sahifa) break;
  }
  const royxat = [...natija].sort();
  if (!opt.fetchFn) { if (kesh.size >= 100) kesh.clear(); kesh.set(id, { royxat, gacha: Date.now() + KESH_MS }); }
  return royxat;
}

/** "3.8" -> [3, 8]; versiya yo'q bo'lsa [] */
function versiya(nom: string): number[] {
  const m = /(\d+(?:\.\d+)*)/.exec(nom);
  return m ? m[1].split('.').map(Number) : [];
}
function versiyaTaqqosla(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? 0) - (b[i] ?? 0); if (d) return d; }
  return 0;
}

/**
 * Ro'yxatdan jonli suhbat uchun eng mosini tanlaydi: sozlangan model ro'yxatda bo'lsa o'zi; aks holda
 * standart, keyin ma'lum nomlar; hech biri bo'lmasa "live" nomlilar ichida eng yangi versiya (preview emaslari ustun).
 */
export function geminiLiveModeliniTanla(royxat: string[], sozlangan: string): string | null {
  if (royxat.includes(sozlangan)) return sozlangan;
  if (royxat.includes(GEMINI_ODATIY_MODEL)) return GEMINI_ODATIY_MODEL;
  const nomzod = royxat.filter((n) => /live/i.test(n) && !YARAMAYDI.test(n));
  nomzod.sort((a, b) => versiyaTaqqosla(versiya(b), versiya(a)) || Number(/preview/i.test(a)) - Number(/preview/i.test(b)) || a.localeCompare(b));
  return nomzod[0] ?? null;
}

/** `GEMINI_LIVE_MODEL` yozilmagan bo'lsa va standart model kalit uchun mavjud bo'lmasa — mavjud Live modelga o'tadi. Xatoda sozlama o'zgarmaydi. */
export async function geminiModeliniHal(soz: GeminiSozlama, opt: { signal?: AbortSignal; fetchFn?: typeof fetch } = {}): Promise<GeminiSozlama> {
  if (!soz.modelAvto) return soz;
  try {
    const royxat = await geminiLiveModellari(soz, { ...opt, signal: AbortSignal.any([AbortSignal.timeout(4_000), ...(opt.signal ? [opt.signal] : [])]) });
    const m = geminiLiveModeliniTanla(royxat, soz.model);
    return m && m !== soz.model ? { ...soz, model: m } : soz;
  } catch { return soz; }
}
