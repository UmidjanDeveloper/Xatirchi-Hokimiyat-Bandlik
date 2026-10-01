import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  RozilikSxemasi,
  XodimHolatiSxemasi,
  YOLLANMA_HTTP,
  YollanmaXatosi,
  YuborishSxemasi,
  beruvchigaYuborish,
  rozilikQayd,
  rozilikniQaytar,
  xodimHolati,
} from '@/lib/yollanma';

const ROLLAR = ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/**
 * Yo'llanma ustida amal. Bitta yo'l, `amal` maydoni bilan:
 *
 *   rozilik        - fuqaro roziligini qayd etish (usul, sana)
 *   rozilik-qaytar - rozilikni qaytarib olish
 *   yuborish       - nomzod ma'lumotini ish beruvchiga botda yuborish
 *   holat          - xodim holatni belgilaydi (suhbat, fuqaro voz kechdi, bekor)
 *
 * Huquq (mahalla) har amalda `yollanma.ts` ichida tekshiriladi.
 */
const Amal = z.discriminatedUnion('amal', [
  z.object({ amal: z.literal('rozilik') }).merge(RozilikSxemasi),
  z.object({ amal: z.literal('rozilik-qaytar') }),
  z.object({ amal: z.literal('yuborish') }).merge(YuborishSxemasi),
  z.object({ amal: z.literal('holat') }).merge(XodimHolatiSxemasi),
]);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = Amal.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }
  const d = natija.data;

  try {
    switch (d.amal) {
      case 'rozilik':
        await rozilikQayd(q.sessiya, params.id, { usul: d.usul, sana: d.sana });
        break;
      case 'rozilik-qaytar':
        await rozilikniQaytar(q.sessiya, params.id);
        break;
      case 'yuborish':
        await beruvchigaYuborish(q.sessiya, params.id, d.maydonlar);
        break;
      case 'holat':
        await xodimHolati(q.sessiya, params.id, {
          holati: d.holati,
          izoh: d.izoh,
          suhbatSanasi: d.suhbatSanasi,
        });
        break;
    }
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'NomzodYollanmasi',
      obyektId: params.id,
      izoh: d.amal,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof YollanmaXatosi) {
      return NextResponse.json({ xabar: e.message }, { status: YOLLANMA_HTTP[e.kod] });
    }
    throw e;
  }
}
