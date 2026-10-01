import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';
import { RejaXatosi, RejaYaratishSxemasi, rejaOchish } from '@/lib/oila-rejasi';

/** Rollar: hokim faqat tahlilni ko'radi - oilaviy reja yuritmaydi */
const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/** Oila uchun yangi reja ochish */
export async function POST(request: Request) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = RejaYaratishSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }
  const d = natija.data;

  const oila = await prisma.household.findUnique({
    where: { id: d.householdId },
    select: { id: true, mahallaId: true, arxivSanasi: true, holati: true },
  });
  /* Arxivdagi oila "yo'q" deb javob beriladi */
  if (!oila || oila.arxivSanasi) {
    return NextResponse.json({ xabar: 'Хонадон топилмади' }, { status: 404 });
  }
  if (!mahallagaRuxsat(q.sessiya, oila.mahallaId)) {
    return NextResponse.json({ xabar: 'Бу хонадонга ҳуқуқингиз йўқ' }, { status: 403 });
  }
  /* Yakunlanmagan (qoralama) xatlovning ma'lumoti hali tayyor emas */
  if (oila.holati === 'QORALAMA') {
    return NextResponse.json(
      { xabar: 'Хатлов ҳали якунланмаган — аввал уни юборинг' },
      { status: 409 }
    );
  }

  try {
    const r = await rejaOchish({
      householdId: oila.id,
      yaratganId: q.sessiya.userId,
      boshlangichHolat: d.boshlangichHolat,
      boshlangichManba: d.boshlangichManba,
      boshlangichSana: d.boshlangichSana,
    });
    await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'OilaRejasi', obyektId: r.id });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e) {
    if (e instanceof RejaXatosi && e.kod === 'MAVJUD') {
      const bor = await prisma.oilaRejasi.findFirst({
        where: { householdId: oila.id, holati: 'FAOL' },
        select: { id: true },
      });
      return NextResponse.json({ xabar: e.message, id: bor?.id ?? null }, { status: 409 });
    }
    throw e;
  }
}
