import { NextResponse } from 'next/server';
import { z } from 'zod';
import { talabQil } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { alifboServer } from '@/lib/alifbo-server';
import { bazaChegarasi } from '@/lib/kirish-chegarasi';
import { serverXatosi } from '@/lib/tizim-kuzatuvi';
import { A } from '@/lib/alifbo';
import { agentJavobi } from '@/lib/agent/xizmat';
import { haqiqiyModel } from '@/lib/agent/model';
import { MATN } from '@/lib/agent/matnlar';
import { AGENT_ROLLARI, DAQIQALIK_LIMIT, ENG_KOP_TARIX, ENG_UZUN_TARIX_XABARI, ENG_UZUN_XABAR } from '@/lib/agent/ruxsat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Sxema = z.object({
  xabar: z.string().trim().min(1).max(ENG_UZUN_XABAR),
  tarix: z
    .array(z.object({ r: z.enum(['f', 'a']), m: z.string().max(ENG_UZUN_TARIX_XABARI) }))
    .max(ENG_KOP_TARIX)
    .default([]),
});

/**
 * Hudhud (AI agent): bitta xabarga javob.
 *
 * Kirish qatlami: huquq (hokim, bandlik, rahbar, administrator), hajm,
 * daqiqalik chegara. Qolgan hammasi `lib/agent/xizmat.ts` da.
 */
export async function POST(request: Request) {
  const q = await talabQil([...AGENT_ROLLARI]);
  if (q instanceof NextResponse) return q;
  const alifbo = alifboServer();

  const tana = Sxema.safeParse(await request.json().catch(() => null));
  if (!tana.success) {
    const uzun = tana.error.issues.some((i) => i.code === 'too_big');
    return NextResponse.json({ xabar: A(uzun ? MATN.uzunXabar : MATN.tushunmadim, alifbo) }, { status: 400 });
  }

  try {
    const chegara = await bazaChegarasi(`agent:${q.sessiya.userId}`, DAQIQALIK_LIMIT, 60_000);
    if (!chegara.allowed) {
      return NextResponse.json(
        { xabar: A(MATN.juda_kop, alifbo) },
        { status: 429, headers: { 'Retry-After': String(Math.max(1, chegara.retryAfter)) } }
      );
    }

    const xodim = await prisma.user.findUnique({
      where: { id: q.sessiya.userId },
      select: { fullName: true },
    });

    const javob = await agentJavobi({
      ctx: {
        userId: q.sessiya.userId,
        rol: q.sessiya.rol,
        fullName: xodim?.fullName ?? '',
        mahallaId: q.sessiya.mahallaId,
        alifbo,
        hozir: new Date(),
      },
      xabar: tana.data.xabar,
      tarix: tana.data.tarix,
      model: haqiqiyModel(),
    });

    return NextResponse.json(javob, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const { izId } = await serverXatosi('api:agent-suhbat', e);
    return NextResponse.json({ xabar: A(MATN.qaytaUrinish, alifbo), izId }, { status: 500 });
  }
}
