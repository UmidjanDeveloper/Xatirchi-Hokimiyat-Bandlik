import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { alifboServer } from '@/lib/alifbo-server';
import { bazaChegarasi } from '@/lib/kirish-chegarasi';
import { maxfiyniTozala } from '@/lib/maxfiy';
import { serverXatosi } from '@/lib/tizim-kuzatuvi';
import { A } from '@/lib/alifbo';
import { ovozniBandQil } from '@/lib/agent/hisob';
import { agentProvayderi } from '@/lib/agent/model';
import { MATN } from '@/lib/agent/matnlar';
import { AGENT_ROLLARI, ENG_UZUN_XABAR } from '@/lib/agent/ruxsat';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Ovozni matnga aylantirish (server tomonda) — brauzerning o'z ovoz
 * tanishi (Web Speech) ishlamaydigan qurilmalar uchun zaxira.
 *
 * Cheklovlar (xarajat va suiiste'mol):
 *   · hajm 1,5 MB, davomiylik 60 soniya, faqat audio turlari;
 *   · xodim bo'yicha kunlik soniyalar limiti (`AGENT_OVOZ_LIMIT`);
 *   · daqiqada 10 ta;
 *   · yozuv SAQLANMAYDI: provayderga uzatiladi, bizda faqat soniyalar hisobi.
 *
 * Maxfiylik: ovozda fuqaro ismi aytilishi mumkin va u tashqi provayderga
 * (OpenAI yoki Groq) ketadi. Brauzer ovoz tanishi ishlasa — bu yo'l
 * umuman chaqirilmaydi.
 */

const ENG_KATTA_BAYT = 1_500_000;
const RUXSAT_ETILGAN = /^(audio\/(webm|ogg|mp4|mpeg|wav|x-wav|x-m4a|aac|mp3)|video\/webm)(;.*)?$/i;

export async function POST(request: Request) {
  const q = await talabQil([...AGENT_ROLLARI]);
  if (q instanceof NextResponse) return q;
  const alifbo = alifboServer();
  const xabar = (m: string) => ({ xabar: A(m, alifbo) });

  const prov = agentProvayderi();
  if (!prov) return NextResponse.json(xabar('Овозни матнга айлантириш ҳозир ишламайди. Ёзиб юборинг.'), { status: 503 });

  const chegara = await bazaChegarasi(`agent-ovoz:${q.sessiya.userId}`, 10, 60_000);
  if (!chegara.allowed) {
    return NextResponse.json(xabar(MATN.juda_kop), { status: 429, headers: { 'Retry-After': String(Math.max(1, chegara.retryAfter)) } });
  }

  let forma: FormData;
  try {
    forma = await request.formData();
  } catch {
    return NextResponse.json(xabar('Овоз файлини ўқиб бўлмади.'), { status: 400 });
  }

  const fayl = forma.get('audio');
  if (!(fayl instanceof File) || fayl.size === 0) return NextResponse.json(xabar('Овоз юборилмади.'), { status: 400 });
  if (fayl.size > ENG_KATTA_BAYT) return NextResponse.json(xabar('Овоз жуда узун: 60 сониягача бўлсин.'), { status: 413 });
  if (!RUXSAT_ETILGAN.test(fayl.type)) return NextResponse.json(xabar('Овоз формати қўллаб-қувватланмайди.'), { status: 415 });

  const soniya = Number(forma.get('soniya'));
  const band = await ovozniBandQil(q.sessiya.userId, Number.isFinite(soniya) && soniya > 0 ? soniya : 10);
  if (!band.ruxsat) return NextResponse.json(xabar('Бугунги овоз чегараси тугади. Ёзиб юборинг.'), { status: 429 });

  try {
    const uzatma = new FormData();
    uzatma.set('file', fayl, fayl.name || 'ovoz.webm');
    uzatma.set('model', process.env.AGENT_STT_MODEL?.trim() || (prov.provayder === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1'));
    uzatma.set('language', 'uz');
    uzatma.set('temperature', '0');
    /* Soha so'zlari: ismlar va atamalar to'g'ri yozilishiga yordam beradi (qisqa) */
    uzatma.set('prompt', 'Xatirchi tumani, mahalla, xatlov, ishsiz, bandlik, murojaat, hokim, xonadon, hisobot, tahlil paneli');

    const ctrl = new AbortController();
    const soat = setTimeout(() => ctrl.abort(), 20_000);
    let r: Response;
    try {
      r = await fetch(`${prov.baza}/audio/transcriptions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { authorization: `Bearer ${prov.kalit}` },
        body: uzatma,
      });
    } finally {
      clearTimeout(soat);
    }

    if (!r.ok) {
      const matn = maxfiyniTozala(await r.text().catch(() => ''));
      await serverXatosi('api:agent-ovoz', new Error(`${prov.provayder} ${r.status}: ${matn.slice(0, 200)}`));
      return NextResponse.json(xabar('Овозни матнга айлантириб бўлмади. Ёзиб юборинг.'), { status: 502 });
    }
    const d = (await r.json().catch(() => null)) as { text?: string } | null;
    const matn = (d?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, ENG_UZUN_XABAR);
    if (!matn) return NextResponse.json(xabar('Овоз эшитилмади. Яна бир бор айтинг.'), { status: 422 });
    return NextResponse.json({ matn }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const { izId } = await serverXatosi('api:agent-ovoz', e);
    return NextResponse.json({ ...xabar('Овозни матнга айлантириб бўлмади. Ёзиб юборинг.'), izId }, { status: 502 });
  }
}
