import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';
import { BAND_HOLATLAR } from '@/lib/joylashtirish';

/**
 * Bo'sh ish o'rnini yopish.
 *
 * O'chirmaymiz, `faol = false` qilamiz: o'chirilgan yozuv
 * hisobotdan ham yo'qoladi va "bu oy nechta ish o'rni taklif
 * qilingan" degan savolga javob bo'lmay qoladi.
 *
 * Yopilish sababi `QOLDA` deb belgilanadi. Bu muhim: o'rin
 * to'lgani uchun AVTOMATIK yopilgan e'lon joylashtirish bekor
 * qilinsa qayta ochilishi kerak, xodim qo'li bilan yopgani esa
 * ochilmasligi kerak (korxona voz kechgan bo'lishi mumkin).
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const v = await prisma.vacancy.findUnique({
    where: { id: params.id },
    select: { mahallaId: true },
  });
  if (!v) return NextResponse.json({ xabar: 'Иш ўрни топилмади' }, { status: 404 });
  if (!mahallagaRuxsat(q.sessiya, v.mahallaId)) {
    return NextResponse.json({ xabar: 'Ҳуқуқингиз йўқ' }, { status: 403 });
  }

  await prisma.vacancy.update({
    where: { id: params.id },
    data: { faol: false, yopilishSababi: 'QOLDA', yopilganSana: new Date() },
  });
  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'Vacancy',
    obyektId: params.id,
    izoh: 'Ёпилди',
  });

  return NextResponse.json({ ok: true });
}

const Tahrir = z.object({ faol: z.literal(true) });

/**
 * Yopilgan e'lonni qayta ochish.
 *
 * Faqat QO'LDA yopilgani ochiladi. O'rni to'lgani uchun yopilgan
 * e'lonni "ochish" ma'nosiz bo'lardi: bo'sh o'rin yo'q, e'lon
 * darhol yana to'la ko'rinardi. Unday holda yo o'rinlar sonini
 * oshirish, yo joylashtirishni bekor qilish kerak.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Tahrir.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Маълумот нотўғри' }, { status: 400 });
  }

  const v = await prisma.vacancy.findUnique({
    where: { id: params.id },
    select: { mahallaId: true, faol: true, ornlarSoni: true },
  });
  if (!v) return NextResponse.json({ xabar: 'Иш ўрни топилмади' }, { status: 404 });
  if (!mahallagaRuxsat(q.sessiya, v.mahallaId)) {
    return NextResponse.json({ xabar: 'Ҳуқуқингиз йўқ' }, { status: 403 });
  }
  if (v.faol) return NextResponse.json({ ok: true });

  const band = await prisma.unemployedPerson.count({
    where: { vacancyId: params.id, holati: { in: BAND_HOLATLAR } },
  });
  if (band >= v.ornlarSoni) {
    return NextResponse.json(
      {
        xabar:
          'Барча ўринлар банд. Қайта очиш учун ўринлар сонини оширинг ёки жойлаштиришни бекор қилинг.',
      },
      { status: 409 }
    );
  }

  await prisma.vacancy.update({
    where: { id: params.id },
    data: { faol: true, yopilishSababi: null, yopilganSana: null },
  });
  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'Vacancy',
    obyektId: params.id,
    izoh: 'Қайта очилди',
  });

  return NextResponse.json({ ok: true });
}
