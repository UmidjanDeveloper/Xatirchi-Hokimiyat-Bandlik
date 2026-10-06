import { NextResponse } from 'next/server';
import { z } from 'zod';
import { talabQil } from '@/lib/api-auth';
import { bazaChegarasi } from '@/lib/kirish-chegarasi';
import { AGENT_ROLLARI, agentOchiqmi } from '@/lib/agent/ruxsat';
import { A } from '@/lib/alifbo';
import { alifboServer } from '@/lib/alifbo-server';
import { ENG_UZUN_NUTQ } from '@/lib/agent/chegaralar';
import { matnniOvozga, ttsSozlama } from '@/lib/agent/tts';
import { NutqXatosi, nutqUlanishi, nutqXizmati } from '@/lib/agent/nutq';
import { jonliRuxsatOqi } from '@/lib/agent/jonli';
import { korishdami } from '@/lib/korish-rejimi';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;
// `jonli`: yaroqli jonli suhbat ruxsatnomasi (faqat shu server imzolaydi). Jonli suhbatda javob
// gap-gap o'qiladi, shuning uchun oddiy "tinglash" tugmasidan ko'ra ko'proq so'rov kerak bo'ladi.
const Tana = z.object({ matn: z.string().trim().min(1).max(ENG_UZUN_NUTQ), jonli: z.string().max(2000).optional() });

export async function POST(request: Request) {
  const q = await talabQil([...AGENT_ROLLARI], { korishdaOqish: true });
  if (q instanceof NextResponse) return q;
  const xato = (matn: string, status: number) => NextResponse.json(
    { xabar: A(matn, alifboServer()) }, { status, headers: { 'Cache-Control': 'no-store' } }
  );
  if (!agentOchiqmi(q.sessiya.rol)) return xato('Рухсат йўқ.', 403);
  const sozlama = ttsSozlama();
  if (!sozlama) return xato(nutqUlanishi() === 'ovoz_id_yoq' ? 'ElevenLabs ovozi tanlanmagan. Vercel sozlamasida ELEVENLABS_VOICE_ID ni kiriting.' : 'Овозли жавоб созланмаган. Матнни ўқишингиз мумкин.', 503);
  if (Number(request.headers.get('content-length')) > 16_000) return xato('Матн жуда узун.', 413);
  // Bound chunked bodies too; never buffer an unbounded request.
  const reader = request.body?.getReader();
  if (!reader) return xato('Матн йўқ.', 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_000) { await reader.cancel(); return xato('Матн жуда узун.', 413); }
      chunks.push(value);
    }
  } catch { return xato('Матн ўқилмади.', 400); }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder().decode(bytes)); } catch { return xato('Матн нотўғри.', 400); }
  const parsed = Tana.safeParse(raw);
  if (!parsed.success) return xato('Матн нотўғри ёки жуда узун.', 400);
  const jonliRuxsat = parsed.data.jonli
    ? jonliRuxsatOqi({
      userId: q.sessiya.userId, rol: q.sessiya.rol, fullName: '', mahallaId: q.sessiya.mahallaId, alifbo: 'lot',
      hozir: new Date(), oqishFaqat: Boolean(q.korish) || korishdami(q.sessiya),
    }, parsed.data.jonli)
    : null;
  if (parsed.data.jonli && !jonliRuxsat) return xato('Жонли суҳбат тугаган. Қайта уланг.', 403);
  // Jonli suhbat: alohida (kengroq, lekin chegaralangan) hisob; oddiy tugma hisobiga tegmaydi.
  const minute = jonliRuxsat
    ? await bazaChegarasi(`agent-tts-jonli:${q.sessiya.userId}`, 30, 60_000)
    : await bazaChegarasi(`agent-tts:${q.sessiya.userId}`, 6, 60_000);
  if (!minute.allowed) return xato('Бир оз кутинг. Матн экранда сақланган.', 429);
  const daily = jonliRuxsat
    ? await bazaChegarasi(`agent-tts-jonli-kun:${q.sessiya.userId}`, 400, 86_400_000)
    : await bazaChegarasi(`agent-tts-kun:${q.sessiya.userId}`, 80, 86_400_000);
  if (!daily.allowed) return xato('Бугунги овозли жавоб чегараси тугади.', 429);
  try {
    const audio = await matnniOvozga(A(parsed.data.matn, 'lot'), sozlama, request.signal);
    return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    // Do not log user text or provider credentials.
    return xato(nutqXizmati() === 'elevenlabs' && e instanceof NutqXatosi ? e.message : 'Овозни тайёрлаб бўлмади. Жавоб матни экранда.', 502);
  }
}
