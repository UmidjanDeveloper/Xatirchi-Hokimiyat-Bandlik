import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';
import { IT_VAUCHER_HOLATI, IT_YONALISHI, qiymatlar } from '@/lib/constants';
import { holatSanasi, keyingiRaqam } from '@/lib/it-vaucher';

/*
 * IT-SHAHARCHA VAUCHERI
 *
 * POST  - yangi vaucher beradi (raqamni tizim o'zi qo'yadi)
 * PATCH - holatini o'zgartiradi (o'qimoqda, tugatdi, joylashdi...)
 *
 * Kim beradi: bandlik markazi. Mahalla xodimi BERA OLMAYDI -
 * u faqat "IT o'rganmoqchi" deb belgilaydi, vaucher esa
 * moliyaviy majburiyat va uni markaz yozadi.
 */

const HOLATLAR = qiymatlar(IT_VAUCHER_HOLATI) as [string, ...string[]];

const Yangi = z.object({
  ishsizId: z.string().cuid(),
  yonalish: z.enum(qiymatlar(IT_YONALISHI) as [string, ...string[]]),
  boshqaYonalish: z.string().max(200).nullish(),
  izoh: z.string().max(1000).nullish(),
});

const Ozgartirish = z.object({
  id: z.string().cuid(),
  holati: z.enum(HOLATLAR),
  izoh: z.string().max(1000).nullish(),
});

export async function POST(request: Request) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Yangi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Маълумот нотўғри', tafsilot: natija.error.flatten() },
      { status: 400 }
    );
  }
  const d = natija.data;

  /*
   * "Boshqa" tanlansa o'z variantini yozish MAJBURIY.
   *
   * Aks holda hisobotda "Boshqa: 14 ta" degan qator paydo
   * bo'lardi va hokim "qanaqa boshqa" deb so'raganda javob
   * topilmasdi.
   */
  if (d.yonalish === 'Boshqa' && !d.boshqaYonalish?.trim()) {
    return NextResponse.json(
      { xabar: 'Йўналиш «Бошқа» бўлса, уни ёзиб кўрсатинг' },
      { status: 400 }
    );
  }

  const odam = await prisma.unemployedPerson.findUnique({
    where: { id: d.ishsizId },
    select: {
      mahallaId: true,
      itVaucherlar: { select: { id: true, holati: true } },
    },
  });
  if (!odam) return NextResponse.json({ xabar: 'Фуқаро топилмади' }, { status: 404 });
  if (!mahallagaRuxsat(q.sessiya, odam.mahallaId)) {
    return NextResponse.json({ xabar: 'Бу маҳаллага ҳуқуқингиз йўқ' }, { status: 403 });
  }

  /*
   * Bitta odamga ikkita AMALDAGI vaucher berilmaydi.
   *
   * Bekor qilingan yoki tashlab ketilgan vaucher esa yo'lni
   * to'smaydi: odam qaytib kelsa, unga yangisi beriladi va
   * eskisi tarixda qolaveradi.
   */
  const amalda = odam.itVaucherlar.find(
    (v) => v.holati !== 'BEKOR_QILINDI' && v.holati !== 'TASHLAB_KETDI'
  );
  if (amalda) {
    return NextResponse.json(
      { xabar: 'Бу фуқарога ваучер аллақачон берилган' },
      { status: 409 }
    );
  }

  const v = await prisma.itVaucher.create({
    data: {
      raqami: await keyingiRaqam(),
      ishsizId: d.ishsizId,
      mahallaId: odam.mahallaId,
      yonalish: d.yonalish,
      boshqaYonalish: d.yonalish === 'Boshqa' ? d.boshqaYonalish?.trim() : null,
      izoh: d.izoh?.trim() || null,
      bergangaId: q.sessiya.userId,
    },
    select: { id: true, raqami: true },
  });

  await jurnal(q.sessiya.userId, 'YARATISH', { obyektTuri: 'ItVaucher', obyektId: v.id });
  return NextResponse.json({ ok: true, id: v.id, raqami: v.raqami });
}

export async function PATCH(request: Request) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Ozgartirish.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Маълумот нотўғри', tafsilot: natija.error.flatten() },
      { status: 400 }
    );
  }
  const d = natija.data;

  const mavjud = await prisma.itVaucher.findUnique({
    where: { id: d.id },
    select: { mahallaId: true, holati: true },
  });
  if (!mavjud) return NextResponse.json({ xabar: 'Ваучер топилмади' }, { status: 404 });
  if (!mahallagaRuxsat(q.sessiya, mavjud.mahallaId)) {
    return NextResponse.json({ xabar: 'Бу маҳаллага ҳуқуқингиз йўқ' }, { status: 403 });
  }

  /*
   * Yomon natijani izohsiz yozib bo'lmaydi.
   *
   * "Tashlab ketdi" degan yozuvning o'zi hokimga hech narsa
   * bermaydi - unga SABABI kerak: guruh uzoqmi, oila ruxsat
   * bermadimi, ish topib ketdimi. Sabab yig'ilsa, keyingi
   * guruhda o'sha muammo takrorlanmaydi.
   */
  const yomon = d.holati === 'TASHLAB_KETDI' || d.holati === 'BEKOR_QILINDI';
  if (yomon && !d.izoh?.trim()) {
    return NextResponse.json({ xabar: 'Сабабини ёзинг' }, { status: 400 });
  }

  await prisma.itVaucher.update({
    where: { id: d.id },
    data: {
      holati: d.holati as never,
      ...holatSanasi(d.holati as never),
      ...(d.izoh?.trim() ? { izoh: d.izoh.trim() } : {}),
    },
  });

  await jurnal(q.sessiya.userId, 'OZGARTIRISH', { obyektTuri: 'ItVaucher', obyektId: d.id });
  return NextResponse.json({ ok: true });
}
