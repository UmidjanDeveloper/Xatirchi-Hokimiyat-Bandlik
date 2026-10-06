import { nutqUlanishi, nutqXizmati } from '@/lib/agent/nutq';
import { vazifalarim } from '@/lib/vazifalar';
import { robotVazifaHolati } from '@/lib/agent/robot-kayfiyati';
import { jonliSozlama } from '@/lib/agent/jonli';
import { ttsSozlama } from '@/lib/agent/tts';
import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { bugungiHisob } from '@/lib/agent/hisob';
import { agentProvayderi } from '@/lib/agent/model';
import { AGENT_ROLLARI, agentOchiqmi } from '@/lib/agent/ruxsat';

export const dynamic = 'force-dynamic';

/**
 * Hudhud holati: til modeli sozlanganmi, ovozni matnga aylantirish bormi,
 * bugun yana nechta xabar qoldi. Kalit yoki model nomi QAYTARILMAYDI.
 */
export async function GET() {
  const q = await talabQil([...AGENT_ROLLARI]);
  if (q instanceof NextResponse) return q;
  const rol = q.sessiya.rol;
  if (!agentOchiqmi(rol)) return NextResponse.json({ xabar: 'Ruxsat yo‘q' }, { status: 403 });

  const prov = agentProvayderi();
  const h = await bugungiHisob(q.sessiya.userId, rol);
  // Counts follow the existing role/mahalla boundary; no task rows leave this endpoint.
  const vazifa = await vazifalarim(q.sessiya).then((v) => robotVazifaHolati(v.bloklar)).catch(() => null);
  return NextResponse.json(
    { vazifa, ovozUlanishi: nutqUlanishi(), ovozXizmati: nutqXizmati(), ai: Boolean(prov), ovozServer: Boolean(prov), ovozChiqish: Boolean(ttsSozlama()), jonli: Boolean(jonliSozlama()), limit: h.limit, qolgan: h.qolgan },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
