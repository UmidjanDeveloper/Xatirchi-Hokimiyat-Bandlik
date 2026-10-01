import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  RejaXatosi,
  RejaYangilashSxemasi,
  RejaYopishSxemasi,
  keyingiSanaYaroqlimi,
  masulXodimYaroqlimi,
  rejaniOl,
  rejaniYopish,
} from '@/lib/oila-rejasi';

const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

function xatoJavobi(e: unknown) {
  if (e instanceof RejaXatosi) {
    const holat = { TOPILMADI: 404, RUXSAT: 403, MAVJUD: 409, YOPIQ: 409, NOTOGRI: 400 }[e.kod];
    return NextResponse.json({ xabar: e.message }, { status: holat });
  }
  throw e;
}

/**
 * Rejani tahrirlash YOKI yopish.
 *
 * Yopish alohida shakl (`holati` bor): u izoh talab qiladi va qaytib
 * bo'lmaydi, oddiy tahrir esa faqat FAOL rejada ishlaydi.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const tana = await request.json().catch(() => null);

  try {
    const reja = await rejaniOl(params.id, q.sessiya);

    /* ── YOPISH ── */
    if (tana && typeof tana === 'object' && 'holati' in tana) {
      const y = RejaYopishSxemasi.safeParse(tana);
      if (!y.success) {
        return NextResponse.json(
          { xabar: y.error.issues[0]?.message ?? 'Маълумот нотўғри' },
          { status: 400 }
        );
      }
      await rejaniYopish(reja.id, y.data);
      await jurnal(q.sessiya.userId, 'YOPISH', {
        obyektTuri: 'OilaRejasi',
        obyektId: reja.id,
        izoh: y.data.holati,
      });
      return NextResponse.json({ ok: true });
    }

    /* ── TAHRIR ── */
    const t = RejaYangilashSxemasi.safeParse(tana);
    if (!t.success) {
      return NextResponse.json(
        { xabar: t.error.issues[0]?.message ?? 'Маълумот нотўғри' },
        { status: 400 }
      );
    }
    const d = t.data;

    if (reja.holati !== 'FAOL') {
      return NextResponse.json({ xabar: 'Режа ёпилган — таҳрир қилиб бўлмайди' }, { status: 409 });
    }
    if (d.keyingiAloqaSanasi && !keyingiSanaYaroqlimi(d.keyingiAloqaSanasi)) {
      return NextResponse.json({ xabar: 'Кейинги алоқа санаси ҳаддан ташқари узоқ' }, { status: 400 });
    }
    if (d.masulXodimId && !(await masulXodimYaroqlimi(d.masulXodimId, reja.household.mahallaId))) {
      return NextResponse.json({ xabar: 'Масъул ходим яроқсиз' }, { status: 400 });
    }

    /* `undefined` maydonlar umuman tegilmaydi (partial) */
    const yangi = await prisma.oilaRejasi.updateMany({
      where: { id: reja.id, holati: 'FAOL' },
      data: d,
    });
    if (yangi.count === 0) {
      return NextResponse.json({ xabar: 'Режа ёпилган — таҳрир қилиб бўлмайди' }, { status: 409 });
    }
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'OilaRejasi',
      obyektId: reja.id,
      izoh: Object.keys(d).join(', '),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return xatoJavobi(e);
  }
}
