import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { alifboServer } from '@/lib/alifbo-server';
import { bazaChegarasi } from '@/lib/kirish-chegarasi';
import { serverXatosi } from '@/lib/tizim-kuzatuvi';
import { A } from '@/lib/alifbo';
import { ovozniBandQil, ovozniQaytar } from '@/lib/agent/hisob';
import { agentProvayderi } from '@/lib/agent/model';
import { MATN } from '@/lib/agent/matnlar';
import { ovozniMatnga, STT_XABARI } from '@/lib/agent/stt';
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
  const q = await talabQil([...AGENT_ROLLARI], { korishdaOqish: true });
  if (q instanceof NextResponse) return q;
  const alifbo = alifboServer();
  const xabar = (m: string) => ({ xabar: A(m, alifbo) });

  const prov = agentProvayderi();
  if (!prov) return NextResponse.json(xabar('Овоз хизмати ишламаяпти. Ёзинг.'), { status: 503 });

  const chegara = await bazaChegarasi(`agent-ovoz:${q.sessiya.userId}`, 10, 60_000);
  if (!chegara.allowed) {
    return NextResponse.json(xabar(MATN.juda_kop), { status: 429, headers: { 'Retry-After': String(Math.max(1, chegara.retryAfter)) } });
  }

  let forma: FormData;
  try {
    forma = await request.formData();
  } catch {
    return NextResponse.json(xabar('Овоз файли ўқилмади.'), { status: 400 });
  }

  const fayl = forma.get('audio');
  if (!(fayl instanceof File) || fayl.size === 0) return NextResponse.json(xabar('Овоз юборилмади.'), { status: 400 });
  if (fayl.size > ENG_KATTA_BAYT) return NextResponse.json(xabar('Овоз жуда узун.'), { status: 413 });
  if (!RUXSAT_ETILGAN.test(fayl.type)) return NextResponse.json(xabar('Овоз формати мос эмас.'), { status: 415 });

  const soniya = Number(forma.get('soniya'));
  const sarf = Number.isFinite(soniya) && soniya > 0 ? soniya : 10;
  const band = await ovozniBandQil(q.sessiya.userId, sarf);
  if (!band.ruxsat) return NextResponse.json(xabar('Бугунги овоз чегараси тугади. Ёзинг.'), { status: 429 });

  try {
    /* Provayderga so'rov: sabab aniqlanadi, parametr rad etilsa moslashib qayta uriladi (`lib/agent/stt.ts`) */
    const n = await ovozniMatnga(prov, fayl, { model: process.env.AGENT_STT_MODEL?.trim() || undefined, signal: request.signal });

    if (!n.ok) {
      /* Matn chiqmadi: xodimning kunlik soniyalari behuda ketmasin */
      await ovozniQaytar(q.sessiya.userId, sarf).catch(() => {});
      const { izId } = await serverXatosi(
        'api:agent-ovoz',
        new Error(`${prov.provayder} ${n.holat || '-'} (${n.sabab}), ${n.urinish} urinish: ${n.tafsilot}`)
      );
      /* Administratorga sababning qisqa belgisi ham ko'rinadi: "[openai 429]" */
      const belgi = q.sessiya.rol === 'ADMIN' ? ` [${prov.provayder} ${n.holat || n.sabab}]` : '';
      const holat = n.sabab === 'hajm' ? 413 : n.sabab === 'band' ? 429 : 502;
      return NextResponse.json({ ...xabar(`${STT_XABARI[n.sabab]}${belgi}`), sabab: n.sabab, izId }, { status: holat });
    }

    const matn = n.matn.slice(0, ENG_UZUN_XABAR);
    if (!matn) {
      await ovozniQaytar(q.sessiya.userId, sarf).catch(() => {});
      return NextResponse.json(xabar('Овоз эшитилмади. Қайта айтинг.'), { status: 422 });
    }
    return NextResponse.json({ matn }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    await ovozniQaytar(q.sessiya.userId, sarf).catch(() => {});
    const { izId } = await serverXatosi('api:agent-ovoz', e);
    return NextResponse.json({ ...xabar(STT_XABARI.bosh), izId }, { status: 502 });
  }
}
