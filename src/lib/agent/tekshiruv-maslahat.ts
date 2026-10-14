import type { TekshiruvQadami } from './gemini-tekshir';

/**
 * ============================================================
 *  ADMINISTRATOR TEKSHIRUVI: "NIMA QILISH KERAK"
 *
 *  Tekshiruv qadami yiqilganda sababning o'zi (Google/ElevenLabs matni) yetarli emas: kimdir uni Vercel yoki
 *  Google/ElevenLabs sozlamasidagi aniq amalga aylantirishi kerak. Bu sof funksiya har yiqilgan qadam matniga qarab
 *  qisqa maslahat beradi (takrorlari bir marta). Maslahat taxmin: haqiqiy sabab har doim qadamning o'z matnida.
 * ============================================================
 */

const KVOTA = /429|kvota|quota|exhausted|chegara/i;
const KALIT = /401|403|qabul qilinmadi|ruxsat yo.q|API key|permission/i;
const SOZLAMA_RAD = /not found|topilmadi|400|404|1007|1008|Unknown name|Invalid|noto.g.ri|sozlamani rad|rad etdi/i;

function geminiMaslahati(izoh: string): string | null {
  if (/ro.yxatida yo.q/i.test(izoh)) return 'GEMINI_LIVE_MODEL kalitingiz uchun mavjud emas: Vercel’da shu o‘zgaruvchini o‘chiring (model o‘zi tanlanadi) yoki «Gemini modellari» qatoridagi ro‘yxatdan birini yozing.';
  if (/ko.rinmayapti/i.test(izoh)) return 'Kalitingiz Live (bidiGenerateContent) modellarini ko‘rmayapti: AI Studio’da shu kalit bog‘langan loyihaning Billing holatini tekshiring yoki yangi kalit yarating.';
  if (KVOTA.test(izoh)) return 'Gemini kvotasi yoki chegarasi bo‘yicha rad javobi keldi. Google AI Studio’da aynan shu kalitning loyihasi uchun Rate Limit va Billing holatini tekshiring. «Account inactive» bo‘lsa hisobni faollashtiring; mavjud kalitni faqat shu sababdan almashtirish shart emas.';
  if (KALIT.test(izoh)) return 'GEMINI_API_KEY qabul qilinmadi yoki unga ruxsat yo‘q: AI Studio’da yangi kalit yarating, Vercel’da yangilab Redeploy qiling.';
  if (SOZLAMA_RAD.test(izoh)) return 'Gemini sozlamani rad etdi. Vercel’da GEMINI_LIVE_MODEL ni o‘chiring (model o‘zi tanlanadi) yoki «Gemini modellari» qatoridagi ro‘yxatdan birini yozing; xabar matnini saqlab qo‘ying.';
  if (/bo.sh keldi/i.test(izoh)) return 'Gemini javob matnini bermadi: Vercel’da GEMINI_LIVE_CHIQISH ni o‘chiring (ovozli Live modellar matn emas, transkript rejimida ishlaydi).';
  if (/setupComplete|javob kelmadi|kechik/i.test(izoh)) return 'Gemini belgilangan vaqtda javob bermadi: tarmoqni tekshirib qayta urinib ko‘ring; takrorlansa GEMINI_LIVE_MODEL ni almashtiring.';
  return null;
}

function elevenlabsMaslahati(izoh: string): string | null {
  // "Ovoz sozlanmagan (kalit_yoq)": yetishmayotgan nomlarni «Sozlama» qatori aytadi; kalit "rad etilgan" deb aldamaymiz
  if (/sozlanmagan/i.test(izoh)) return null;
  if (/missing_permissions|models_read|models.*permission|permission.*models/i.test(izoh)) return 'ElevenLabs API Keys → shu kalit sozlamasida «Text to Speech» va «Models» (Read) ruxsatlarini yoqing. Kalitning yoqilganligi bu ruxsatlar borligini anglatmaydi.';
  if (/o.zbek tilini/i.test(izoh)) return 'ElevenLabs modeli o‘zbekchani qo‘llamaydi: Vercel’da ELEVENLABS_MODEL_ID=eleven_v4_turbo qo‘ying (yoki o‘zgaruvchini o‘chiring) va Redeploy qiling. ElevenLabs hujjatida model o‘zbekchani qo‘llashi aytilgan, lekin hisob katalogida ko‘rinmasa: ELEVENLABS_KATALOG_TEKSHIRUVI=0 qo‘yib ko‘ring (qo‘llamasa ElevenLabs o‘zi rad etadi va ovoz OpenAI’ga o‘tadi).';
  if (/\b402\b|tarif|kredit/i.test(izoh)) return 'ElevenLabs hisobidagi tarif yoki kredit yetmaydi: ehtimol bepul tarifda kutubxona ovozlarini API orqali ishlatib bo‘lmaydi. Pullik tarifga o‘ting yoki o‘zingizning ovozingizni tanlang.';
  if (/\b403\b|Models Read|Text to Speech/i.test(izoh)) return 'ElevenLabs kalitida ruxsat yetmaydi: API Keys → kalit sozlamasida «Text to Speech» va «Models» (Read) yoqilgan bo‘lsin.';
  if (/\b401\b|kalit/i.test(izoh)) return 'ELEVENLABS_API_KEY qabul qilinmadi: ElevenLabs’da yangi kalit yarating va Vercel’da yangilang.';
  if (/\b404\b|Voice ID|topilmadi/i.test(izoh)) return 'ELEVENLABS_VOICE_ID topilmadi: ovoz akkauntingizga (My Voices) qo‘shilgan bo‘lishi va ID to‘g‘ri nusxalanishi kerak.';
  if (/\b429\b|chegar/i.test(izoh)) return 'ElevenLabs so‘rovlar chegarasiga yetdi: biroz kutib qayta tekshiring.';
  return null;
}

/** Yiqilgan qadamlar bo'yicha aniq amallar (takrorlanmaydi). Hammasi yaxshi bo'lsa bo'sh ro'yxat. */
export function tekshiruvMaslahati(qadamlar: TekshiruvQadami[]): string[] {
  const m = new Set<string>();
  for (const q of qadamlar) {
    if (q.ok) continue;
    const a = /^Gemini/.test(q.nom) ? geminiMaslahati(q.izoh) : /^ElevenLabs/.test(q.nom) ? elevenlabsMaslahati(q.izoh) : null;
    if (a) m.add(a);
  }
  const tez = qadamlar.find((q) => q.ok && q.nom === 'ElevenLabs tezligi' && typeof q.ms === 'number' && q.ms > 1500);
  if (tez) m.add(`ElevenLabs birinchi audio sekin (${tez.ms} ms): hisob katalogida o‘zbekchani qo‘llaydigan tez modelni tanlang. Gemini’ning o‘z ovozini ishlatish uchun GEMINI_LIVE_OVOZ=gemini; bu rejim ElevenLabs ovozidan foydalanmaydi.`);
  return [...m];
}
