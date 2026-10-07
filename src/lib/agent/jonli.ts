import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { modelAsboblari } from './asboblar';
import { tizimKursatmasi } from './kursatma';
import type { AgentKontekst } from './turlar';
import { nutqProvayderi, nutqXizmati } from './nutq';

export const JONLI_MUDDAT_MS = 5 * 60_000;
export const JONLI_ASBOB_LIMIT = 30;

/**
 * OpenAI Realtime sozlamasi. Ovoz:
 *  - ElevenLabs TAYYOR bo'lsa: OpenAI faqat matn yozadi, ElevenLabs o'qiydi (`tashqiOvoz`);
 *  - ElevenLabs sozlanmagan/xato sozlangan bo'lsa YOKI `mahalliyOvoz` so'ralsa (zaxira): OpenAI
 *    o'zi gapiradi. Shunda ElevenLabs/Gemini ishlamasa ham jonli suhbat OpenAI'da to'liq ishlaydi.
 */
export function jonliSozlama(env: NodeJS.ProcessEnv = process.env, opt: { mahalliyOvoz?: boolean } = {}) {
  const kalit = env.OPENAI_API_KEY?.trim();
  // Existing voice users can start Live explicitly via its button. A dedicated override can disable it.
  if (!kalit || env.AGENT_REALTIME === '0' || (env.AGENT_REALTIME !== '1' && env.AGENT_TTS !== '1')) return null;
  const tashqiOvoz = !opt.mahalliyOvoz && nutqXizmati(env) === 'elevenlabs' && nutqProvayderi(env) !== null;
  const voice = env.AGENT_REALTIME_VOICE?.trim();
  return {
    kalit, tashqiOvoz, model: env.AGENT_REALTIME_MODEL?.trim() || 'gpt-realtime',
    voice: ['cedar', 'marin', 'ash', 'echo', 'sage', 'verse', 'alloy', 'ballad', 'coral', 'shimmer'].includes(voice ?? '') ? voice! : 'cedar',
  };
}

/** Jonli suhbat ko'rsatmasi: OpenAI va Gemini uchun bir xil (faqat ovoz qaysi xizmatdaligi farq qiladi). */
export function jonliKursatma(ctx: AgentKontekst, nomlar: string[], tashqiOvoz: boolean): string {
  return `${tizimKursatmasi(ctx)}

JONLI OVOZLI SUHBAT
${tashqiOvoz ? '- Javob matni ElevenLabs orqali o‘qiladi. Har javobni odatda 2–4 qisqa jumlada yoz, maxsus audio teglar yoki sahna ko‘rsatmalarini yozma. Kerakli buyruq asboblarini odatdagidek chaqir.' : ''}
- Ovozning o'zini eshitasan; yozma transkript yordamchi, u xato bo'lishi mumkin. Faqat ravon adabiy o'zbekchada so'zla. O'zbek o‘, g‘, q, x va h tovushlarini aniq ayt, ruscha yoki inglizcha urg'u ishlatma. O'rtacha tezlikda, iliq va ishonchli ohangda gapir.
- Qisqa tabiiy gaplar ishlat. Vaziyatga mos yengil hazil qilish mumkin; fuqarolar yoki qiyinchiliklar ustidan kulma. Gapni bo'lishsa to'xta va yangi so'rovni tingla.
- Rasmiy mahalla nomlari: ${nomlar.join(', ')}. Bu faqat nomlar katalogi, raqamlar emas. Noaniq eshitilgan nomni taxminan almashtirma: mahallani_top asbobidan foydalan. mahalla_noaniq qaytsa "${nomlar[0] ?? 'shu mahalla'}ni nazarda tutdingizmi?" kabi haqiqiy variant bilan aniqlashtir; javobni kut. mahalla_topilmadi bo'lsa "Ro'yxatda bunday mahalla yo'q, nomini yana aytasizmi?" de.
- Excel so'ralsa hisobotni_yukla asbobini ishlat. Asbobdagi brauzerNatijasi fayl yaratilgani va yuklash boshlanganini tasdiqlaydi, fayl diskka saqlanganini bila olmaysan. Xato bo'lsa tayyor deb aytma.
- Yozish takliflari ekranda ko'rinadi. Foydalanuvchi tugmani bosishi yoki aynan "tasdiqlayman" deyishi mumkin. Oddiy "ha" yozish amali uchun yetmaydi. Tasdiq interfeys tomonidan bajariladi, tasdiqlovchi asbobni o'zing o'ylab topma. Server natijasi kelmaguncha bajarildi dema. Amalni taklif qilgan javobingda o'zing "tasdiqlayman" so'zini ovozda aytma: qanday tasdiqlash ekranda yozilgan, faqat tasdiqni kutayotganingni ayt.
- Tizimda faqat taqdim etilgan asboblar ishlaydi; boshqa vazifani bajargandek ko'rsatma. Manbasiz raqam aytma.`;
}

export function jonliSessiya(ctx: AgentKontekst, sozlama: NonNullable<ReturnType<typeof jonliSozlama>>, nomlar: string[]) {
  return {
    type: 'realtime', model: sozlama.model, output_modalities: [sozlama.tashqiOvoz ? 'text' : 'audio'], max_output_tokens: 1000, tracing: null,
    instructions: jonliKursatma(ctx, nomlar, sozlama.tashqiOvoz),
    audio: {
      input: {
        noise_reduction: { type: 'near_field' },
        transcription: { model: 'gpt-4o-transcribe', language: 'uz', prompt: `O'zbek tilidagi suhbat. Xatirchi mahallalari: ${nomlar.join(', ')}. Excel, hisobot, bandlik, xatlov.` },
        turn_detection: { type: 'semantic_vad', eagerness: 'medium', create_response: true, interrupt_response: true },
      },
      ...(!sozlama.tashqiOvoz ? { output: { voice: sozlama.voice, speed: 1 } } : {}),
    },
    tools: modelAsboblari(ctx.rol, ctx.oqishFaqat).map((t) => ({ type: 'function', ...t.function })),
    tool_choice: 'auto',
  };
}

const Ruxsat = z.object({
  v: z.literal(1), id: z.string().uuid(), call: z.string().regex(/^[a-zA-Z0-9_-]{1,150}$/),
  userId: z.string(), rol: z.string(), mahallaId: z.string().nullable(), oqishFaqat: z.boolean(), muddat: z.number().int(),
  // Eski tokenlarda yo'q: ular OpenAI hisoblanadi. Token faqat shu server tomonidan imzolanadi.
  prov: z.enum(['openai', 'gemini']).default('openai'),
}).strict();
export type JonliRuxsat = z.infer<typeof Ruxsat>;

function imzo(yuk: string, kalit: string): string {
  return createHmac('sha256', kalit).update(`hamroh-jonli-v1:${yuk}`).digest('base64url');
}

export function jonliRuxsatYarat(ctx: AgentKontekst, call: string, kalit = process.env.SESSION_SECRET, prov: 'openai' | 'gemini' = 'openai'): string {
  if (!kalit || kalit.length < 32) throw new Error('Sessiya sozlanmagan');
  const q = Ruxsat.parse({ v: 1, id: randomUUID(), call, userId: ctx.userId, rol: ctx.rol, mahallaId: ctx.mahallaId,
    oqishFaqat: Boolean(ctx.oqishFaqat), muddat: ctx.hozir.getTime() + JONLI_MUDDAT_MS, prov });
  const yuk = Buffer.from(JSON.stringify(q)).toString('base64url');
  return `${yuk}.${imzo(yuk, kalit)}`;
}

export function jonliRuxsatOqi(ctx: AgentKontekst, token: string, yopish = false, kalit = process.env.SESSION_SECRET): JonliRuxsat | null {
  if (!kalit || kalit.length < 32 || token.length > 2000) return null;
  try {
    const [yuk, berilgan, ortiqcha] = token.split('.');
    const kutilgan = imzo(yuk, kalit);
    if (ortiqcha || !berilgan || berilgan.length !== kutilgan.length || !timingSafeEqual(Buffer.from(berilgan), Buffer.from(kutilgan))) return null;
    const q = Ruxsat.parse(JSON.parse(Buffer.from(yuk, 'base64url').toString('utf8')));
    const hozir = ctx.hozir.getTime();
    // Yopish uchun qo'shimcha bir daqiqa: vaqt tugaganda ham masofadagi audio yopilsin.
    if (q.userId !== ctx.userId || q.rol !== ctx.rol || q.mahallaId !== ctx.mahallaId || q.oqishFaqat !== Boolean(ctx.oqishFaqat) ||
      q.muddat + (yopish ? 60_000 : 0) <= hozir || q.muddat > hozir + JONLI_MUDDAT_MS) return null;
    return q;
  } catch { return null; }
}

export async function jonliUlanish(
  sdp: string, sessiya: ReturnType<typeof jonliSessiya>, kalit: string,
  opt: { signal?: AbortSignal; fetchFn?: typeof fetch } = {}
): Promise<{ sdp: string; call: string }> {
  const forma = new FormData();
  forma.set('sdp', sdp); forma.set('session', JSON.stringify(sessiya));
  const r = await (opt.fetchFn ?? fetch)('https://api.openai.com/v1/realtime/calls', {
    method: 'POST', body: forma, signal: AbortSignal.any([AbortSignal.timeout(25_000), ...(opt.signal ? [opt.signal] : [])]),
    headers: { authorization: `Bearer ${kalit}`, accept: 'application/sdp' },
  });
  if (!r.ok) throw new Error(`Jonli ulanish ${r.status}`);
  const call = /\/realtime\/calls\/([a-zA-Z0-9_-]{1,150})$/.exec(r.headers.get('location') ?? '')?.[1];
  const javob = await r.text();
  if (!call || !javob.startsWith('v=0') || javob.length > 80_000) {
    if (call) await jonliYop(call, kalit, opt.fetchFn).catch(() => {});
    throw new Error('Jonli ulanish javobi noto‘g‘ri');
  }
  return { sdp: javob, call };
}

export async function jonliYop(call: string, kalit: string, fetchFn: typeof fetch = fetch): Promise<void> {
  if (!/^[a-zA-Z0-9_-]{1,150}$/.test(call)) throw new Error('Ulanish noto‘g‘ri');
  const r = await fetchFn(`https://api.openai.com/v1/realtime/calls/${call}/hangup`, {
    method: 'POST', headers: { authorization: `Bearer ${kalit}` }, signal: AbortSignal.timeout(5000),
  });
  if (!r.ok && r.status !== 404 && r.status !== 409) throw new Error('Ulanish yopilmadi');
}
