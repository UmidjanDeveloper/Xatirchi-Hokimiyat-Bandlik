import { maxfiyniTozala } from '@/lib/maxfiy';
import { jonliSozlama } from './jonli';
import { nutqZaxirasi } from './nutq';
import type { TekshiruvQadami } from './gemini-tekshir';

/**
 * ZAXIRA tekshiruvi: Gemini yoki ElevenLabs ishlamasa OpenAI to'liq o'rnini bosa oladimi.
 * Pulsiz so'rov: kalit va realtime modeliga ruxsat tekshiriladi (`GET /v1/models/{model}`),
 * suhbat ochilmaydi va ovoz tayyorlanmaydi. Kalit javobga chiqmaydi.
 */
export async function openaiZaxiraniTekshir(
  env: NodeJS.ProcessEnv = process.env, fetchFn: typeof fetch = fetch
): Promise<TekshiruvQadami> {
  const nom = 'OpenAI zaxirasi';
  const soz = jonliSozlama(env, { mahalliyOvoz: true });
  if (!soz) {
    const yoq = [!env.OPENAI_API_KEY?.trim() && 'OPENAI_API_KEY', env.AGENT_TTS !== '1' && env.AGENT_REALTIME !== '1' && 'AGENT_TTS=1', env.AGENT_REALTIME === '0' && 'AGENT_REALTIME=0 ni olib tashlang'].filter(Boolean);
    return { nom, ok: false, izoh: `Sozlanmagan${yoq.length ? ` (${yoq.join(', ')})` : ''}. Gemini yoki ElevenLabs yiqilsa jonli suhbat zaxirasiz qoladi. Bu ixtiyoriy, lekin tavsiya etiladi.` };
  }
  const t0 = Date.now();
  try {
    const r = await fetchFn(`https://api.openai.com/v1/models/${encodeURIComponent(soz.model)}`, {
      headers: { authorization: `Bearer ${soz.kalit}` }, signal: AbortSignal.timeout(10_000),
    });
    const ms = Date.now() - t0;
    const ovoz = nutqZaxirasi(env) ? 'oddiy ovoz zaxirasi (OpenAI TTS) ham tayyor' : 'oddiy ovoz zaxirasi yo‘q (AGENT_TTS=1 kerak)';
    if (r.ok) return { nom, ok: true, ms, izoh: `OpenAI kaliti qabul qilindi, ${soz.model} modeli mavjud; ${ovoz}. Gemini yiqilsa jonli suhbat OpenAI'ning o‘z ovozi bilan davom etadi.` };
    if (r.status === 401) return { nom, ok: false, ms, izoh: 'OpenAI kaliti qabul qilinmadi (401). OPENAI_API_KEY ni tekshiring.' };
    if (r.status === 403 || r.status === 404) return { nom, ok: false, ms, izoh: `OpenAI hisobida ${soz.model} modeliga ruxsat yo‘q (${r.status}). AGENT_REALTIME_MODEL ni tekshiring yoki hisobingizda realtime ruxsatini yoqing.` };
    if (r.status === 429) return { nom, ok: false, ms, izoh: 'OpenAI hisobida kvota yoki balans tugagan (429).' };
    return { nom, ok: false, ms, izoh: `OpenAI kutilmagan javob berdi (HTTP ${r.status}).` };
  } catch (e) {
    return { nom, ok: false, ms: Date.now() - t0, izoh: `OpenAI'ga ulanib bo‘lmadi: ${maxfiyniTozala(e).slice(0, 160)}` };
  }
}
