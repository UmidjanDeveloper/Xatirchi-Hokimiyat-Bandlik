import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { alifboServer } from '@/lib/alifbo-server';
import { bazaChegarasi } from '@/lib/kirish-chegarasi';
import { maxfiyniTozala } from '@/lib/maxfiy';
import { mahallaRoyxati } from '@/lib/agent/mahalla';
import { GeminiXatosi, geminiSetup, geminiSozlama, geminiToken } from '@/lib/agent/gemini';
import { geminiSoketniTekshir, type TekshiruvQadami } from '@/lib/agent/gemini-tekshir';
import { NutqXatosi, nutqProvayderi, nutqUlanishi, nutqXizmati, nutqYarat } from '@/lib/agent/nutq';
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

  const tezlik = await bazaChegarasi(`jonli-tekshir:${q.sessiya.userId}`, 8, 3_600_000);
  if (!tezlik.allowed) return json({ ok: false, qadamlar: [{ nom: 'Chegara', ok: false, izoh: 'Soatiga 8 martadan ko‘p tekshirib bo‘lmaydi. Biroz kuting.' }] }, 429);

  const qadamlar: TekshiruvQadami[] = [];
  const env = process.env;

  /* 1. Sozlama: faqat NOMLAR, qiymat emas */
  const yoq: string[] = [];
  if (!env.GEMINI_API_KEY?.trim()) yoq.push('GEMINI_API_KEY');
  const ovoz = nutqUlanishi();
  if (nutqXizmati() !== 'elevenlabs') yoq.push('ELEVENLABS_API_KEY (yoki AGENT_TTS_PROVIDER=elevenlabs)');
  else if (ovoz === 'ovoz_id_yoq') yoq.push('ELEVENLABS_VOICE_ID');
  else if (ovoz === 'ochirilgan') yoq.push('AGENT_TTS=1');
  else if (ovoz !== 'tayyor') yoq.push(`ElevenLabs sozlamasi (${ovoz})`);
  if (env.AGENT_REALTIME === '0') yoq.push('AGENT_REALTIME=0 ni olib tashlang');
  if (env.AGENT_JONLI_PROVAYDER?.trim() === 'openai') yoq.push('AGENT_JONLI_PROVAYDER=openai ni olib tashlang');
  const soz = geminiSozlama();
  qadamlar.push(soz
    ? { nom: 'Sozlama', ok: true, izoh: `Gemini modeli: ${soz.model} · API versiyasi: ${soz.surum} · javob turi: ${soz.chiqish} · ovoz: ElevenLabs` }
    : { nom: 'Sozlama', ok: false, izoh: `Vercel'da yetishmaydi yoki noto‘g‘ri: ${yoq.join(', ') || 'GEMINI_LIVE_MODEL qiymati noto‘g‘ri'}.` });

  if (soz) {
    /* 2–4. Gemini */
    const ctx: AgentKontekst = { userId: q.sessiya.userId, rol: 'ADMIN', fullName: '', mahallaId: null, alifbo: alifboServer(), hozir: new Date(), oqishFaqat: false };
    const nomlar = await mahallaRoyxati().catch(() => []);
    const setup = geminiSetup(ctx, soz, nomlar.map((m) => m.nomi));
    const t0 = Date.now();
    let wsUrl = '';
    try {
      wsUrl = (await geminiToken(setup, soz)).wsUrl;
      qadamlar.push({ nom: 'Gemini token', ok: true, ms: Date.now() - t0, izoh: 'Yakka foydalanishli token berildi (kalit qabul qilindi).' });
    } catch (e) {
      qadamlar.push({ nom: 'Gemini token', ok: false, ms: Date.now() - t0, izoh: e instanceof GeminiXatosi ? e.message : maxfiyniTozala(e).slice(0, 300) });
    }
    if (wsUrl) qadamlar.push(...await geminiSoketniTekshir({ wsUrl, setup, chiqish: soz.chiqish }));
  }

  /* 5. ElevenLabs (alohida: Gemini yiqilsa ham ovozni tekshiramiz) */
  const prov = nutqProvayderi();
  if (!prov) qadamlar.push({ nom: 'ElevenLabs ovozi', ok: false, izoh: `Ovoz sozlanmagan (${ovoz}).` });
  else {
    const t1 = Date.now();
    try {
      const audio = await nutqYarat(prov, 'Assalomu alaykum. Ulanish tekshiruvi.', { kutishMs: 20_000 });
      qadamlar.push({ nom: 'ElevenLabs ovozi', ok: true, ms: Date.now() - t1, izoh: `${prov.provayder === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'} ovoz tayyorladi (${Math.round(audio.byteLength / 1024)} KB, model ${prov.model}).` });
    } catch (e) {
      qadamlar.push({ nom: 'ElevenLabs ovozi', ok: false, ms: Date.now() - t1, izoh: e instanceof NutqXatosi ? e.message : 'Ovoz tayyorlanmadi.' });
    }
  }

  /* 6. OpenAI zaxirasi (Gemini yoki ElevenLabs yiqilsa avtomatik o'tiladi). Ixtiyoriy: umumiy "ok" ga ta'sir qilmaydi. */
  const zaxira = await openaiZaxiraniTekshir();
  qadamlar.push(zaxira);

  return json({ ok: qadamlar.filter((x) => x !== zaxira).every((x) => x.ok), zaxiraTayyor: zaxira.ok, qadamlar });
}
