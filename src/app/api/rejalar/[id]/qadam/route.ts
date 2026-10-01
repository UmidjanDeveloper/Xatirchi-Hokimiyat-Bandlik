import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { ID, QadamSxemasi, RejaXatosi, masulXodimYaroqlimi, rejaniOl } from '@/lib/oila-rejasi';

const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/** Mavjud chora-tadbirni rejaga qo'shish: tizim uni o'zi yaratgan, rejaga kirmagan */
const MavjudSxemasi = z.object({ mavjudId: ID });

/**
 * Rejaga qadam qo'shadi: yangi chora-tadbir yaratadi YOKI oilaning
 * rejaga kirmagan chora-tadbirini rejaga biriktiradi.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const tana = await request.json().catch(() => null);

  try {
    const reja = await rejaniOl(params.id, q.sessiya);
    if (reja.holati !== 'FAOL') {
      return NextResponse.json({ xabar: 'Режа ёпилган — қадам қўшиб бўлмайди' }, { status: 409 });
    }

    /* ── Mavjud topshiriqni biriktirish ── */
    if (tana && typeof tana === 'object' && 'mavjudId' in tana) {
      const m = MavjudSxemasi.safeParse(tana);
      if (!m.success) return NextResponse.json({ xabar: 'Маълумот нотўғри' }, { status: 400 });

      /* Faqat ШУ ОИЛАнинг, ҳали режасиз топшириғи */
      const biriktirildi = await prisma.actionPlan.updateMany({
        where: { id: m.data.mavjudId, householdId: reja.householdId, rejaId: null },
        data: { rejaId: reja.id },
      });
      if (biriktirildi.count === 0) {
        return NextResponse.json(
          { xabar: 'Топшириқ топилмади ёки бошқа режага тегишли' },
          { status: 404 }
        );
      }
      await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
        obyektTuri: 'ActionPlan',
        obyektId: m.data.mavjudId,
        izoh: `Режага қўшилди: ${reja.id}`,
      });
      return NextResponse.json({ ok: true, id: m.data.mavjudId });
    }

    /* ── Yangi qadam ── */
    const n = QadamSxemasi.safeParse(tana);
    if (!n.success) {
      return NextResponse.json(
        { xabar: n.error.issues[0]?.message ?? 'Маълумот нотўғри' },
        { status: 400 }
      );
    }
    const d = n.data;

    if (d.masulXodimId && !(await masulXodimYaroqlimi(d.masulXodimId, reja.household.mahallaId))) {
      return NextResponse.json({ xabar: 'Масъул ходим яроқсиз' }, { status: 400 });
    }

    const t = await prisma.actionPlan.create({
      data: {
        householdId: reja.householdId,
        rejaId: reja.id,
        muammo: d.muammo,
        yechim: d.yechim,
        masulTashkilot: d.masulTashkilot,
        masulXodimId: d.masulXodimId ?? null,
        muddat: d.muddat,
        zarurResurs: d.zarurResurs,
        yaratganId: q.sessiya.userId,
      },
      select: { id: true },
    });
    await jurnal(q.sessiya.userId, 'YARATISH', {
      obyektTuri: 'ActionPlan',
      obyektId: t.id,
      izoh: d.masulTashkilot,
    });
    return NextResponse.json({ ok: true, id: t.id });
  } catch (e) {
    if (e instanceof RejaXatosi) {
      const holat = { TOPILMADI: 404, RUXSAT: 403, MAVJUD: 409, YOPIQ: 409, NOTOGRI: 400 }[e.kod];
      return NextResponse.json({ xabar: e.message }, { status: holat });
    }
    throw e;
  }
}
