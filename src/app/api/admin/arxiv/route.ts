import { NextResponse } from 'next/server';
import { talabQil, jurnal } from '@/lib/api-auth';
import { xomPrisma } from '@/lib/prisma';
import { fuqaroniQaytar, xonadonniQaytar } from '@/lib/arxiv';

/**
 * ============================================================
 *  ARXIV — KO'RISH VA QAYTARISH
 *
 *  Faqat administrator uchun. Bu yerda `xomPrisma` ishlatiladi:
 *  oddiy mijoz arxivdagi yozuvlarni umuman ko'rmaydi.
 *
 *  Qaytarish — bu tizimning "orqaga qaytarish" tugmasi. Xodim
 *  xatolashsa, ma'lumot yo'qolmaydi.
 * ============================================================
 */

export const dynamic = 'force-dynamic';

/** Arxivdagi yozuvlar ro'yxati */
export async function GET() {
  const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR']);
  if (q instanceof NextResponse) return q;

  const [xonadonlar, fuqarolar] = await Promise.all([
    xomPrisma.household.findMany({
      where: { arxivSanasi: { not: null } },
      orderBy: { arxivSanasi: 'desc' },
      take: 200,
      select: {
        id: true,
        manzil: true,
        oilaBoshligi: true,
        holati: true,
        arxivSanasi: true,
        arxivSababi: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),
    xomPrisma.unemployedPerson.findMany({
      where: { arxivSanasi: { not: null }, householdId: null },
      orderBy: { arxivSanasi: 'desc' },
      take: 200,
      select: {
        id: true,
        fish: true,
        arxivSanasi: true,
        arxivSababi: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),
  ]);

  /*
   * Хонадони билан бирга архивга тушган фуқаролар АЛОҲИДА
   * кўрсатилмайди: хонадон қайтарилса, улар ҳам ўзи қайтади.
   * Акс ҳолда рўйхат бир хил нарсанинг иккита нусхаси билан
   * тўлиб кетарди.
   */
  return NextResponse.json({
    xonadonlar: xonadonlar.map((x) => ({
      ...x,
      arxivSanasi: x.arxivSanasi?.toISOString() ?? null,
    })),
    fuqarolar: fuqarolar.map((p) => ({
      ...p,
      arxivSanasi: p.arxivSanasi?.toISOString() ?? null,
    })),
  });
}

/** Arxivdan qaytarish */
export async function POST(request: Request) {
  const q = await talabQil(['ADMIN']);
  if (q instanceof NextResponse) return q;

  const tana = (await request.json().catch(() => ({}))) as { turi?: unknown; id?: unknown };
  const id = typeof tana.id === 'string' ? tana.id : '';
  const turi = tana.turi === 'fuqaro' ? 'fuqaro' : 'xonadon';
  if (!id) return NextResponse.json({ xabar: 'Ёзув танланмаган' }, { status: 400 });

  try {
    if (turi === 'fuqaro') {
      await fuqaroniQaytar(id);
      await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
        obyektTuri: 'UnemployedPerson',
        obyektId: id,
        izoh: 'Архивдан қайтарилди',
      });
      return NextResponse.json({ ok: true });
    }

    const natija = await xonadonniQaytar(id);
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'Household',
      obyektId: id,
      izoh: `Архивдан қайтарилди · ${natija.ishsizlar} фуқаро билан`,
    });
    return NextResponse.json({ ok: true, ...natija });
  } catch (e) {
    console.error('arxivdan qaytarib bolmadi', e);
    return NextResponse.json(
      { xabar: 'Қайтариб бўлмади. Ёзув ўчирилган бўлиши мумкин.' },
      { status: 500 }
    );
  }
}
