import { NextResponse } from 'next/server';
import { z } from 'zod';
import { talabQil } from '@/lib/api-auth';
import { bazaChegarasi } from '@/lib/kirish-chegarasi';
import { AGENT_ROLLARI, agentOchiqmi } from '@/lib/agent/ruxsat';
import { A } from '@/lib/alifbo';
import { alifboServer } from '@/lib/alifbo-server';
import { matnniOvozga, ttsSozlama } from '@/lib/agent/tts';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;
const Tana = z.object({ matn: z.string().trim().min(1).max(900) });

export async function POST(request: Request) {
  const q = await talabQil([...AGENT_ROLLARI]);
  if (q instanceof NextResponse) return q;
  const xato = (matn: string, status: number) => NextResponse.json(
    { xabar: A(matn, alifboServer()) }, { status, headers: { 'Cache-Control': 'no-store' } }
  );
  if (!agentOchiqmi(q.sessiya.rol)) return xato('Рухсат йўқ.', 403);
  const sozlama = ttsSozlama();
  if (!sozlama) return xato('Овозли жавоб созланмаган. Матнни ўқишингиз мумкин.', 503);
  if (Number(request.headers.get('content-length')) > 8000) return xato('Матн жуда узун.', 413);
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
      if (size > 8000) { await reader.cancel(); return xato('Матн жуда узун.', 413); }
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
  const minute = await bazaChegarasi(`agent-tts:${q.sessiya.userId}`, 6, 60_000);
  if (!minute.allowed) return xato('Бир оз кутинг. Матн экранда сақланган.', 429);
  const daily = await bazaChegarasi(`agent-tts-kun:${q.sessiya.userId}`, 80, 86_400_000);
  if (!daily.allowed) return xato('Бугунги овозли жавоб чегараси тугади.', 429);
  try {
    const audio = await matnniOvozga(A(parsed.data.matn, 'lot'), sozlama, request.signal);
    return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store' } });
  } catch {
    // Do not log user text or provider credentials.
    return xato('Овозни тайёрлаб бўлмади. Жавоб матни экранда.', 502);
  }
}
