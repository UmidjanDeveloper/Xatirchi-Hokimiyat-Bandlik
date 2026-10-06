import { NutqXatosi, nutqProvayderi, nutqXizmati, nutqYarat, nutqZaxirasi } from './nutq';

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

/** Zaxira ovoz ham yo'q bo'lsa ham, asosiy ovoz bor bo'lsa ham: server ovozi umuman mavjudmi */
export function ovozMavjud(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(ttsSozlama(env) || nutqZaxirasi(env));
}

/*
 * ElevenLabs ketma-ket yiqilsa, qisqa vaqt unga umuman so'rov yuborilmaydi (har gapda 10 soniya kutib
 * keyin OpenAI'ga o'tish suhbatni sekinlashtirmasin). Bu bitta server nusxasining xotirasida;
 * boshqa nusxalar o'zi sinab ko'radi: hech narsa saqlanmaydi.
 */
const ELEVENLABS_SINISH = { ketma: 0, gacha: 0 };
const SAKRASH_MS = 60_000;
const ELEVENLABS_KUTISH_ZAXIRA_BILAN_MS = 10_000;
export function elevenlabsHolatiniTozala() { ELEVENLABS_SINISH.ketma = 0; ELEVENLABS_SINISH.gacha = 0; }

/** OpenAI xatosining xom matni foydalanuvchiga chiqmaydi: faqat holat kodi yoki turi */
function qisqaSabab(e: unknown): string {
  if (!(e instanceof NutqXatosi)) return 'noma‘lum xato';
  const m = /^openai (\d{3})/.exec(e.message);
  if (m) return `HTTP ${m[1]}`;
  return e.kod === 'vaqt' ? 'vaqtida javob bermadi' : e.kod === 'tarmoq' ? 'tarmoq xatosi' : 'javob noto‘g‘ri';
}

export interface OvozNatijasi { audio: ArrayBuffer; provayder: 'openai' | 'elevenlabs'; zaxira: boolean; sabab?: string }

/**
 * Matnni ovozga aylantiradi: avval asosiy xizmat, u yiqilsa (yoki sozlanmagan bo'lsa) OpenAI zaxirasi.
 * Foydalanuvchi o'zi bekor qilsa (`signal`) zaxiraga o'tilmaydi.
 */
export async function ovozZanjiri(
  matn: string,
  opt: { env?: NodeJS.ProcessEnv; signal?: AbortSignal; fetchFn?: typeof fetch; hozir?: () => number } = {}
): Promise<OvozNatijasi> {
  const env = opt.env ?? process.env;
  const hozir = opt.hozir ?? Date.now;
  const asosiy = ttsSozlama(env);
  const zaxira = nutqZaxirasi(env);
  if (!asosiy && !zaxira) throw new NutqXatosi('bosh', 'Овозли жавоб созланмаган.');
  const zaxiraBor = Boolean(zaxira) && nutqXizmati(env) === 'elevenlabs';
  const sakrash = asosiy?.provayder === 'elevenlabs' && zaxiraBor && ELEVENLABS_SINISH.gacha > hozir();
  let sabab: string | undefined;
  if (asosiy && !sakrash) {
    try {
      const audio = await matnniOvozga(matn, asosiy, opt.signal, opt.fetchFn, zaxiraBor && asosiy.provayder === 'elevenlabs' ? ELEVENLABS_KUTISH_ZAXIRA_BILAN_MS : undefined);
      ELEVENLABS_SINISH.ketma = 0;
      return { audio, provayder: asosiy.provayder ?? 'openai', zaxira: false };
    } catch (e) {
      if (opt.signal?.aborted || !zaxiraBor) throw e;
      ELEVENLABS_SINISH.ketma++;
      if (ELEVENLABS_SINISH.ketma >= 2) ELEVENLABS_SINISH.gacha = hozir() + SAKRASH_MS;
      sabab = e instanceof NutqXatosi ? e.message : 'ElevenLabs javob bermadi';
    }
  } else if (!asosiy) {
    sabab = 'ElevenLabs sozlanmagan';
  } else {
    sabab = 'ElevenLabs yaqinda ketma-ket yiqilgan; vaqtincha o‘tkazib yuborildi';
  }
  try {
    const audio = await matnniOvozga(matn, { provayder: 'openai', kalit: zaxira!.kalit, model: zaxira!.model, voice: zaxira!.ovoz }, opt.signal, opt.fetchFn);
    return { audio, provayder: 'openai', zaxira: true, sabab };
  } catch (e) {
    if (opt.signal?.aborted) throw e;
    throw new NutqXatosi('provayder', `${sabab ? `${sabab}. ` : ''}OpenAI zaxira ovozi ham ishlamadi (${qisqaSabab(e)}).`.slice(0, 600));
  }
}
