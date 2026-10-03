import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { A } from '@/lib/alifbo';
import { alifboServer } from '@/lib/alifbo-server';
import { bazaChegarasi } from '@/lib/kirish-chegarasi';
import { AGENT_ROLLARI, agentOchiqmi } from '@/lib/agent/ruxsat';
import { modelXabariniBandQil } from '@/lib/agent/hisob';
import { javobniTozala } from '@/lib/agent/matnlar';
import { chegaraliMatn, JarvisSxemasi, jarvisJavobi, jarvisSozlama } from '@/lib/agent/jarvis';

export const dynamic = 'force-dynamic';
export const maxDuration = 50;
export async function POST(request: Request) {
  const q = await talabQil([...AGENT_ROLLARI]);
  if (q instanceof NextResponse) return q;
  const alifbo = alifboServer();
  const xato = (xabar: string, status: number) => NextResponse.json(
    { xabar: A(xabar, alifbo) }, { status, headers: { 'Cache-Control': 'no-store' } }
  );
  if (!agentOchiqmi(q.sessiya.rol)) return xato('Рухсат йўқ.', 403);
  const sozlama = jarvisSozlama();
  if (!sozlama) return xato('JARVIS уланмаган. Коала режимида давом этинг.', 503);
  let raw: unknown;
  try { raw = JSON.parse(await chegaraliMatn(request.body, 24_000)); }
  catch { return xato('Сўров нотўғри ёки жуда катта.', 400); }
  const input = JarvisSxemasi.safeParse(raw);
  if (!input.success) return xato('Савол ёки суҳбат тарихи нотўғри.', 400);
  const minute = await bazaChegarasi(`jarvis:${q.sessiya.userId}`, 3, 60_000);
  if (!minute.allowed) return xato('JARVIS банд. Бир оздан кейин урининг.', 429);
  if (request.signal.aborted) return xato('Сўров бекор қилинди.', 408);
  const budget = await modelXabariniBandQil(q.sessiya.userId, q.sessiya.rol);
  if (!budget.ruxsat) return xato('Сунъий интеллект сўровлари чегараси тугади.', 429);
  try {
    const javob = await jarvisJavobi(input.data, sozlama, { signal: request.signal });
    return NextResponse.json({ javob: A(javobniTozala(javob), alifbo), amallar: [], manbalar: [],
      rejim: 'jarvis', qolgan: budget.qolgan,
      izoh: A('JARVIS жавоби. Платформа базаси ва жорий интернет маълумоти билан тасдиқланмаган.', alifbo),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Do not refund automatically: timed-out remote tasks may still incur cost.
    // Do not expose upstream errors, prompts, file paths or secrets in error responses.
    return xato('JARVIS жавоб бермади. Сўров серверда давом этаётган бўлиши мумкин. Бир оз кутинг.', 502);
  }
}
