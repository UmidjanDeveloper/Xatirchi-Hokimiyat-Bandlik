import { NextResponse } from 'next/server';
import { z } from 'zod';
import { talabQil } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { alifboServer } from '@/lib/alifbo-server';
import { serverXatosi } from '@/lib/tizim-kuzatuvi';
import { A } from '@/lib/alifbo';
import { taklifniHalQil } from '@/lib/agent/amallar';
import { AGENT_ROLLARI } from '@/lib/agent/ruxsat';

export const dynamic = 'force-dynamic';

const Sxema = z.object({
  id: z.string().min(1).max(40),
  qaror: z.enum(['ha', 'yoq']),
});

const XABAR = {
  topilmadi: 'Бундай таклиф топилмади.',
  muddati_otgan: 'Таклифнинг муддати ўтган. Ҳудҳуддан қайта сўранг.',
  allaqachon_hal: 'Бу таклиф аллақачон кўриб чиқилган.',
  ruxsat_yoq: 'Бу амал учун ҳуқуқингиз етарли эмас.',
  xato: 'Амални бажариб бўлмади. Тизим ҳолати саҳифасида хатони кўринг.',
} as const;

const KOD: Record<keyof typeof XABAR, number> = {
  topilmadi: 404,
  muddati_otgan: 410,
  allaqachon_hal: 409,
  ruxsat_yoq: 403,
  xato: 500,
};

/**
 * Hudhud taklif qilgan yozish amalini tasdiqlash yoki rad etish.
 *
 * Tasdiqlash FAQAT shu yo'l orqali va FAQAT xodimning o'zi (tugma bosganda):
 * model buni chaqira olmaydi. Rol bazadan olinadi (`talabQil`).
 */
export async function POST(request: Request) {
  const q = await talabQil([...AGENT_ROLLARI]);
  if (q instanceof NextResponse) return q;
  const alifbo = alifboServer();

  const tana = Sxema.safeParse(await request.json().catch(() => null));
  if (!tana.success) return NextResponse.json({ xabar: A('Сўров нотўғри.', alifbo) }, { status: 400 });

  try {
    /* Rol — bazadagi HOZIRGI qiymat */
    const xodim = await prisma.user.findUnique({ where: { id: q.sessiya.userId }, select: { rol: true, faol: true } });
    if (!xodim?.faol) return NextResponse.json({ xabar: A(XABAR.ruxsat_yoq, alifbo) }, { status: 403 });

    const n = await taklifniHalQil(q.sessiya.userId, xodim.rol, tana.data.id, tana.data.qaror);
    if (!n.ok) return NextResponse.json({ xabar: A(XABAR[n.sabab], alifbo), sabab: n.sabab }, { status: KOD[n.sabab] });
    return NextResponse.json({ ok: true, holat: n.holat, natija: A(n.natija, alifbo) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const { izId } = await serverXatosi('api:agent-tasdiq', e);
    return NextResponse.json({ xabar: A(XABAR.xato, alifbo), izId }, { status: 500 });
  }
}
