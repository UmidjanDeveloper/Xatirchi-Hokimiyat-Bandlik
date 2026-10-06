import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { talabQil } from '@/lib/api-auth';
import { alifboServer } from '@/lib/alifbo-server';
import { korishdami } from '@/lib/korish-rejimi';
import { prisma } from '@/lib/prisma';
import { A } from '@/lib/alifbo';
import { bazaChegarasi } from '@/lib/kirish-chegarasi';
import { AGENT_ROLLARI } from '@/lib/agent/ruxsat';
import { asbobniBajar, asbobniTop } from '@/lib/agent/asboblar';
import { mahallaRoyxati } from '@/lib/agent/mahalla';
import { JONLI_ASBOB_LIMIT, JONLI_MUDDAT_MS, jonliSozlama, jonliSessiya, jonliUlanish, jonliYop, jonliRuxsatYarat, jonliRuxsatOqi } from '@/lib/agent/jonli';
import { GeminiXatosi, geminiSetup, geminiSozlama, geminiToken, jonliProvayderi } from '@/lib/agent/gemini';
import { serverXatosi } from '@/lib/tizim-kuzatuvi';
import type { AgentKontekst } from '@/lib/agent/turlar';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const Sxema = z.discriminatedUnion('tur', [
  z.object({ tur: z.literal('ulanish'), sdp: z.string().min(10).max(40_000).startsWith('v=0') }).strict(),
  // Gemini Live: brauzer o'zi WebSocket ochadi, server faqat yakka foydalanishli token beradi
  z.object({ tur: z.literal('gemini_ulanish') }).strict(),
  z.object({ tur: z.literal('asbob'), ruxsat: z.string().max(2000), callId: z.string().regex(/^[a-zA-Z0-9_-]{1,150}$/),
    nomi: z.string().max(60), args: z.record(z.unknown()) }).strict(),
  z.object({ tur: z.literal('yopish'), ruxsat: z.string().max(2000) }).strict(),
]);

export async function POST(request: Request) {
  const q = await talabQil([...AGENT_ROLLARI], { korishdaOqish: true });
  if (q instanceof NextResponse) return q;
  const alifbo = alifboServer();
  const json = (d: unknown, status = 200) => NextResponse.json(d, { status, headers: { 'Cache-Control': 'no-store' } });
  const xato = (m: string, s: number) => json({ xabar: A(m, alifbo) }, s);
  const provayder = jonliProvayderi();
  if (!provayder) return xato('Jonli ovozli suhbat ulanmagan. Oddiy mikrofon yoki yozma suhbatdan foydalaning.', 503);
  const sozlama = jonliSozlama(); // OpenAI yo'li uchun (Gemini'da null bo'lishi mumkin)
  const gsoz = geminiSozlama();
  if (Number(request.headers.get('content-length')) > 60_000) return xato('So‘rov juda katta.', 413);
  // Stream chegarasi: Content-Length bo'lmasa ham katta tana JSON parse'ga yetib bormaydi.
  const reader = request.body?.getReader();
  let raw = ''; let hajm = 0;
  if (!reader) return xato('So‘rov bo‘sh.', 400);
  try {
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) { raw += decoder.decode(); break; }
      hajm += value.byteLength;
      if (hajm > 60_000) { await reader.cancel(); return xato('So‘rov juda katta.', 413); }
      raw += decoder.decode(value, { stream: true });
    }
  } catch { return xato('So‘rov noto‘g‘ri.', 400); }
  finally { reader.releaseLock(); }
  const tana = Sxema.safeParse((() => { try { return JSON.parse(raw); } catch { return null; } })());
  if (!tana.success) return xato('So‘rov noto‘g‘ri.', 400);
  const ctx: AgentKontekst = { userId: q.sessiya.userId, rol: q.sessiya.rol, fullName: '', mahallaId: q.sessiya.mahallaId,
    alifbo, hozir: new Date(), oqishFaqat: Boolean(q.korish) || korishdami(q.sessiya) };
  const d = tana.data;
  try {
    if (d.tur === 'asbob' || d.tur === 'yopish') {
      const ruxsat = jonliRuxsatOqi(ctx, d.ruxsat, d.tur === 'yopish');
      if (!ruxsat) return xato('Jonli suhbat tugagan yoki hisob o‘zgargan. Qayta ulang.', 403);
      if (d.tur === 'yopish') {
        // Gemini: yopiladigan server tomoni yo'q (token yakka foydalanishli, brauzer WebSocket'ni o'zi yopadi)
        if (ruxsat.prov === 'openai' && sozlama) await jonliYop(ruxsat.call, sozlama.kalit);
        return json({ yopildi: true });
      }
      if (!asbobniTop(ctx.rol, d.nomi, ctx.oqishFaqat)) return xato('Bu buyruq uchun ruxsat yo‘q.', 403);
      const tezlik = await bazaChegarasi(`jonli-asbob:${ctx.userId}:${ruxsat.id}`, JONLI_ASBOB_LIMIT, JONLI_MUDDAT_MS);
      if (!tezlik.allowed) return xato('Jonli buyruqlar chegarasi tugadi.', 429);
      const takror = await bazaChegarasi(`jonli-call:${ctx.userId}:${ruxsat.id}:${d.callId}`, 1, JONLI_MUDDAT_MS);
      if (!takror.allowed) return xato('Bu buyruq allaqachon qabul qilingan. Qayta bajarilmadi.', 409);
      request.signal.throwIfAborted();
      return json(await asbobniBajar(ctx, d.nomi, d.args));
    }
    if (d.tur === 'ulanish' && (provayder !== 'openai' || !sozlama)) return xato('Jonli xizmat sozlamasi o‘zgargan. Sahifani yangilang va qayta ulang.', 409);
    if (d.tur === 'gemini_ulanish' && (provayder !== 'gemini' || !gsoz)) return xato('Jonli xizmat sozlamasi o‘zgargan. Sahifani yangilang va qayta ulang.', 409);
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return xato('Jonli suhbatning server sozlamasi to‘liq emas.', 503);
    const tezlik = await bazaChegarasi(`jonli-ulanish:${ctx.userId}`, 2, 60_000);
    if (!tezlik.allowed) return xato('Biroz kutib qayta ulang.', 429);
    const n = Number(process.env.AGENT_REALTIME_DAILY_LIMIT ?? 6);
    const limit = Number.isInteger(n) && n >= 1 && n <= 24 ? n : 6;
    const kunlik = await bazaChegarasi(`jonli-kunlik:${ctx.userId}`, limit, 24 * 3600_000);
    if (!kunlik.allowed) return xato('Bugungi jonli suhbatlar chegarasi tugadi. Yozma suhbat ishlaydi.', 429);
    const umumiy = await bazaChegarasi('jonli-umumiy', 240, 30 * 24 * 3600_000);
    if (!umumiy.allowed) return xato('Jonli suhbatlar chegarasi tugadi. Yozma suhbat ishlaydi.', 429);
    const [xodim, nomlar] = await Promise.all([
      prisma.user.findUnique({ where: { id: ctx.userId }, select: { fullName: true } }), mahallaRoyxati(),
    ]);
    ctx.fullName = xodim?.fullName ?? '';
    if (d.tur === 'gemini_ulanish') {
      const setup = geminiSetup(ctx, gsoz!, nomlar.map((m) => m.nomi));
      const { wsUrl } = await geminiToken(setup, gsoz!, { signal: request.signal });
      request.signal.throwIfAborted();
      return json({
        provayder: 'gemini', wsUrl, setup, muddatMs: JONLI_MUDDAT_MS, tashqiOvoz: true, chiqish: gsoz!.chiqish,
        ruxsat: jonliRuxsatYarat(ctx, `gemini_${randomUUID().replace(/-/g, '')}`, undefined, 'gemini'),
      });
    }
    if (d.tur !== 'ulanish') return xato('So‘rov noto‘g‘ri.', 400);
    const u = await jonliUlanish(d.sdp, jonliSessiya(ctx, sozlama!, nomlar.map((m) => m.nomi)), sozlama!.kalit, { signal: request.signal });
    if (request.signal.aborted) { await jonliYop(u.call, sozlama!.kalit).catch(() => {}); return xato('Ulanish bekor qilindi.', 408); }
    return json({ sdp: u.sdp, ruxsat: jonliRuxsatYarat(ctx, u.call), muddatMs: JONLI_MUDDAT_MS, tashqiOvoz: sozlama!.tashqiOvoz });
  } catch (e) {
    // Provider javobi, SDP, foydalanuvchi matni va kalitlar jurnalga yozilmaydi.
    if (e instanceof GeminiXatosi) {
      // Xabar allaqachon tozalangan (kalitsiz); administrator "Tizim holati"da sababni ko'radi.
      await serverXatosi('agent:jonli-gemini', e).catch(() => {});
      return xato('Jonli ovoz xizmatiga ulanib bo‘lmadi. Gemini kaliti, kvotasi va model nomini tekshiring (administrator: «Ulanishni tekshirish») yoki oddiy suhbatdan foydalaning.', 502);
    }
    return xato('Jonli ovoz xizmatiga ulanib bo‘lmadi. OpenAI hisobidagi xizmat ruxsati va balansni tekshiring yoki oddiy suhbatdan foydalaning.', 502);
  }
}
