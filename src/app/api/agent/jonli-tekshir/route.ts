import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { alifboServer } from '@/lib/alifbo-server';
import { bazaChegarasi } from '@/lib/kirish-chegarasi';
import { maxfiyniTozala } from '@/lib/maxfiy';
import { mahallaRoyxati } from '@/lib/agent/mahalla';
import { GeminiXatosi, geminiSetup, geminiSozlama, geminiToken, jonliProvayderi, type GeminiSozlama } from '@/lib/agent/gemini';
import { geminiLiveModellari, geminiLiveModeliniTanla } from '@/lib/agent/gemini-modellar';
import { elevenlabsModeliniAniqla } from '@/lib/agent/elevenlabs';
import { ovozOqimi } from '@/lib/agent/nutq-oqim';
import { tekshiruvMaslahati } from '@/lib/agent/tekshiruv-maslahat';
import { geminiSoketniTekshir, type TekshiruvQadami } from '@/lib/agent/gemini-tekshir';
import { NutqXatosi, nutqProvayderi, nutqUlanishi, nutqXizmati } from '@/lib/agent/nutq';
import { openaiZaxiraniTekshir } from '@/lib/agent/openai-tekshir';
import type { AgentKontekst } from '@/lib/agent/turlar';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Administrator uchun: Gemini (jonli suhbat) va ElevenLabs (ovoz) ulanishini
 * haqiqiy so'rovlar bilan tekshiradi. Ko'rish rejimida yopiq (yozish yo'li
 * emas, lekin `KORISH_OQISH_POSTLARI` ro'yxatida ham yo'q: xodim nomidan
 * tashqi xizmatga pul sarflanmasin). Kalitlar va tokenlar javobda yo'q.
 */
export async function POST() {
  const q = await talabQil(['ADMIN']);
  if (q instanceof NextResponse) return q;
  const json = (d: unknown, status = 200) => NextResponse.json(d, { status, headers: { 'Cache-Control': 'no-store' } });

  // Sozlashda ketma-ket tuzatib tekshirish odatiy: soatiga 20 marta (har tekshiruv bir necha tashqi so'rov yuboradi)
  const tezlik = await bazaChegarasi(`jonli-tekshir:${q.sessiya.userId}`, 20, 3_600_000);
  if (!tezlik.allowed) return json({ ok: false, qadamlar: [{ nom: 'Chegara', ok: false, izoh: 'Soatiga 20 martadan ko‘p tekshirib bo‘lmaydi. Biroz kuting.' }] }, 429);

  const env = process.env;

  /* 1. Sozlama: faqat NOMLAR va oshkor sozlamalar (model nomi), kalit qiymati emas */
  const yoq: string[] = [];
  if (!env.GEMINI_API_KEY?.trim()) yoq.push('GEMINI_API_KEY');
  const ovoz = nutqUlanishi();
  if (nutqXizmati() !== 'elevenlabs') yoq.push('ELEVENLABS_API_KEY (yoki AGENT_TTS_PROVIDER=elevenlabs)');
  else if (ovoz === 'ovoz_id_yoq') yoq.push('ELEVENLABS_VOICE_ID');
  else if (ovoz === 'ochirilgan') yoq.push('AGENT_TTS=1');
  else if (ovoz !== 'tayyor') yoq.push(`ElevenLabs sozlamasi (${ovoz})`);
  if (env.AGENT_REALTIME === '0') yoq.push('AGENT_REALTIME=0 ni olib tashlang');
  if (env.AGENT_JONLI_PROVAYDER?.trim() === 'openai') yoq.push('AGENT_JONLI_PROVAYDER=openai ni olib tashlang');
  const asosiy = jonliProvayderi();
  const soz = asosiy === 'openai' ? null : geminiSozlama();
  const prov = nutqProvayderi();

  const sozlamaQadami: TekshiruvQadami[] = [];
  if (asosiy !== 'openai') sozlamaQadami.push(soz
    ? { nom: 'Sozlama', ok: true, izoh: `Gemini modeli: ${soz.model}${soz.modelAvto ? ' (standart: kalitga mos model o‘zi tanlanadi)' : ' (GEMINI_LIVE_MODEL)'} · API versiyasi: ${soz.surum} · javob turi: ${soz.chiqish} · ovoz: ${soz.tashqiOvoz ? `tashqi TTS${prov?.provayder === 'elevenlabs' ? ` (ElevenLabs, model ${prov.model})` : ''}` : 'Gemini’ning o‘z ovozi'}` }
    : { nom: 'Sozlama', ok: false, izoh: `Vercel'da yetishmaydi yoki noto‘g‘ri: ${yoq.join(', ') || 'GEMINI_LIVE_MODEL qiymati noto‘g‘ri'}.` });

  /* Gemini va ElevenLabs/OpenAI zanjirlari bir-biriga bog'liq emas: parallel (Vercel 60 soniyalik chegarasi uchun). */
  const geminiZanjiri = async (): Promise<TekshiruvQadami[]> => {
    if (!soz) return [];
    const qadamlar: TekshiruvQadami[] = [];
    const ctx: AgentKontekst = { userId: q.sessiya.userId, rol: 'ADMIN', fullName: '', mahallaId: null, alifbo: alifboServer(), hozir: new Date(), oqishFaqat: false };
    /* 2. Kalit uchun mavjud Live modellar (billing/kalit muammosi shu yerda ko'rinadi) */
    let ishchi: GeminiSozlama = soz;
    const tm = Date.now();
    try {
      const royxat = await geminiLiveModellari(soz, { keshsiz: true, signal: AbortSignal.timeout(10_000) });
      const tanlangan = soz.modelAvto ? geminiLiveModeliniTanla(royxat, soz.model) : (royxat.includes(soz.model) ? soz.model : null);
      const korsat = royxat.length ? royxat.slice(0, 8).join(', ') + (royxat.length > 8 ? ` … (+${royxat.length - 8})` : '') : 'yo‘q';
      if (!royxat.length) qadamlar.push({ nom: 'Gemini modellari', ok: false, ms: Date.now() - tm, izoh: 'Kalitingiz uchun Live (bidiGenerateContent) qo‘llaydigan model ko‘rinmayapti. Kalit, loyiha va Billing holatini tekshiring (AI Studio → API Keys).' });
      else if (!tanlangan) qadamlar.push({ nom: 'Gemini modellari', ok: false, ms: Date.now() - tm, izoh: `Sozlangan GEMINI_LIVE_MODEL=${soz.model} kalitingiz uchun Live ro‘yxatida yo‘q. Mavjud Live modellar: ${korsat}.` });
      else {
        if (tanlangan !== soz.model) ishchi = { ...soz, model: tanlangan };
        qadamlar.push({ nom: 'Gemini modellari', ok: true, ms: Date.now() - tm, izoh: `Kalitingiz uchun Live modellar: ${korsat}. Ishlatiladi: ${tanlangan}${tanlangan !== soz.model ? ` (standart ${soz.model} mavjud emas)` : ''}.` });
      }
    } catch (e) {
      // Ro'yxat olinmasa (401/403/429...) sabab shu yerda; token qadami baribir sinab ko'riladi
      qadamlar.push({ nom: 'Gemini modellari', ok: false, ms: Date.now() - tm, izoh: e instanceof GeminiXatosi ? e.message : maxfiyniTozala(e).slice(0, 300) });
    }
    /* 3–5. Token -> WebSocket -> javob */
    const nomlar = await mahallaRoyxati().catch(() => []);
    const setup = geminiSetup(ctx, ishchi, nomlar.map((m) => m.nomi));
    const t0 = Date.now();
    let wsUrl = '';
    try {
      wsUrl = (await geminiToken(setup, ishchi)).wsUrl;
      qadamlar.push({ nom: 'Gemini token', ok: true, ms: Date.now() - t0, izoh: 'Yakka foydalanishli token berildi (kalit qabul qilindi).' });
    } catch (e) {
      qadamlar.push({ nom: 'Gemini token', ok: false, ms: Date.now() - t0, izoh: e instanceof GeminiXatosi ? e.message : maxfiyniTozala(e).slice(0, 300) });
    }
    if (wsUrl) qadamlar.push(...await geminiSoketniTekshir({ wsUrl, setup, chiqish: ishchi.chiqish }));
    return qadamlar;
  };

  const ovozZanjiri = async (): Promise<TekshiruvQadami[]> => {
    if (!prov && asosiy) return [{ nom: `${asosiy === 'gemini' ? 'Gemini' : 'OpenAI'} ovozi`, ok: true, izoh: 'Native jonli ovoz sozlangan. Haqiqiy ovozni jonli suhbatda sinang; ElevenLabs majburiy emas.' }];
    if (!prov) return [{ nom: 'ElevenLabs ovozi', ok: false, izoh: `Ovoz sozlanmagan (${ovoz}).` }];
    const nom = prov.provayder === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI';
    const qadamlar: TekshiruvQadami[] = [];
    let model = prov.model;
    if (prov.provayder === 'elevenlabs') {
      /* 6. Model: o'zbekchani qo'llaydimi (katalog bo'yicha) */
      const tm = Date.now();
      try {
        const t = await elevenlabsModeliniAniqla(prov, AbortSignal.timeout(12_000), fetch, { yangi: true });
        model = t.model;
        qadamlar.push({ nom: 'ElevenLabs modeli', ok: true, ms: Date.now() - tm,
          izoh: prov.katalogTekshir === false
            ? `Katalog tekshiruvi o‘chirilgan (ELEVENLABS_KATALOG_TEKSHIRUVI=0): ${t.model} to‘g‘ridan-to‘g‘ri ishlatiladi; o‘zbekchani qo‘llashini keyingi qator ko‘rsatadi.`
            : t.almashtirildi
              ? `${t.sozlangan} o‘zbekchani qo‘llamaydi: ${t.model} avtomatik tanlandi. Vercel'da ELEVENLABS_MODEL_ID=${t.model} deb yozib qo‘ying.`
              : `${t.model} o‘zbek tilini qo‘llaydi.` });
      } catch (e) {
        qadamlar.push({ nom: 'ElevenLabs modeli', ok: false, ms: Date.now() - tm, izoh: e instanceof NutqXatosi ? e.message : 'Model ro‘yxatini olib bo‘lmadi.' });
        return qadamlar; // model bo'lmasa ovoz so'rovi ham ma'nosiz
      }
    }
    /* 7. Ovoz: jonli suhbatdagi yo'l (PCM oqimi), birinchi audiogacha vaqt. OpenAI zaxirasi O'CHIRILGAN: ElevenLabs'ning o'zi sinaladi. */
    const t1 = Date.now();
    try {
      const n = await ovozOqimi('Assalomu alaykum. Ulanish tekshiruvi.', { env: { ...env, OPENAI_API_KEY: prov.provayder === 'openai' ? env.OPENAI_API_KEY : '' } as NodeJS.ProcessEnv, kutishMs: 15_000 });
      if (n.audio instanceof ReadableStream) { const rd = n.audio.getReader(); await rd.read().catch(() => {}); await rd.cancel().catch(() => {}); }
      qadamlar.push({ nom: `${nom} tezligi`, ok: true, ms: Date.now() - t1, izoh: `Birinchi audio ${Date.now() - t1} ms da keldi (${n.pcm ? 'PCM oqimi' : 'MP3, oqim rad etilgan'}, model ${model}).` });
    } catch (e) {
      qadamlar.push({ nom: `${nom} ovozi`, ok: false, ms: Date.now() - t1, izoh: e instanceof NutqXatosi ? e.message : 'Ovoz tayyorlanmadi.' });
    }
    return qadamlar;
  };

  /* 8. OpenAI: asosiy bo'lsa jonli suhbat tekshiruvi, aks holda ZAXIRA tekshiruvi (umumiy "ok" ga ta'sir qilmaydi) */
  const openaiQadami = async (): Promise<TekshiruvQadami> => asosiy === 'openai' ? { ...await openaiZaxiraniTekshir(), nom: 'OpenAI jonli suhbat' } : await openaiZaxiraniTekshir();

  const [gemini, ovozQ, openai] = await Promise.all([geminiZanjiri(), ovozZanjiri(), openaiQadami()]);
  const qadamlar = [...(asosiy === 'openai' ? [openai] : []), ...sozlamaQadami, ...gemini, ...ovozQ, ...(asosiy === 'openai' ? [] : [openai])];
  const zaxiraTayyor = asosiy === 'openai' ? undefined : openai.ok;

  // Yiqilgan qadamlar bo'lsa — aniq amal ro'yxati (ok hisobiga kirmaydi)
  const maslahat = tekshiruvMaslahati(qadamlar);
  const asosiyOk = qadamlar.every((x) => x.ok || (asosiy !== 'openai' && x === openai));
  if (maslahat.length) qadamlar.push({ nom: 'Nima qilish kerak', ok: false, izoh: maslahat.map((x, i) => `${i + 1}) ${x}`).join(' ') });

  return json({ ok: asosiyOk, ...(zaxiraTayyor === undefined ? {} : { zaxiraTayyor }), qadamlar });
}
