import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { IshsizHolati } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { IshsizSxemasi } from '@/lib/xatlov-sxema';
import { telefonSaqlashUchun } from '@/lib/inson-tekshiruvi';

/**
 * Suhbat anketasi + hayot sikli.
 *
 * Holat maydonini forma yubormaydi - u AMALDAN kelib chiqadi:
 * suhbat anketasi saqlansa "suhbat o'tkazildi", taklif belgilansa
 * "taklif berildi", ish joyi yozilsa "joylashtirildi". Aks holda
 * xodim anketani to'ldirmasdan turib holatni "joylashtirildi" ga
 * o'tkazib qo'yishi va hisobot yolg'on chiqishi mumkin edi.
 */
const Tahrir = IshsizSxemasi.partial().extend({
  ishJoyi: z.string().max(300).nullish(),
  ishLavozimi: z.string().max(200).nullish(),
  ishgaKirganSana: z.coerce.date().nullish(),
  radSababi: z.string().max(500).nullish(),
  /** Faqat "rad etdi" va "tasdiqlandi" qo'lda belgilanadi */
  qolHolati: z.enum(['RAD_ETDI', 'TASDIQLANDI']).nullish(),
});

function holatniAniqla(
  joriy: IshsizHolati,
  d: z.infer<typeof Tahrir>
): IshsizHolati {
  if (d.qolHolati) return d.qolHolati;

  // Tasdiqlangan yozuv orqaga qaytmaydi - u yakuniy natija
  if (joriy === 'TASDIQLANDI') return joriy;

  if (d.ishJoyi?.trim()) return 'JOYLASHTIRILDI';
  if (d.takliflar && d.takliflar.length > 0) return 'TAKLIF_BERILDI';

  // Suhbat anketasining asosiy maydonlaridan biri to'ldirilgan bo'lsa
  if (d.xohlaganIsh?.trim() || d.malumoti || d.ishgaTayyorligi) {
    return joriy === 'ANIQLANDI' ? 'SUHBAT_OTKAZILDI' : joriy;
  }

  return joriy;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const p = await prisma.unemployedPerson.findUnique({
    where: { id: params.id },
    include: {
      mahalla: { select: { nomi: true, nomiKirill: true } },
      household: { select: { id: true, manzil: true, oilaBoshligi: true } },
      mutaxassis: { select: { fullName: true } },
      topshiriqlar: { orderBy: { muddat: 'asc' } },
    },
  });

  if (!p) return NextResponse.json({ xabar: 'Фуқаро топилмади' }, { status: 404 });

  await jurnal(q.sessiya.userId, 'KORISH', { obyektTuri: 'UnemployedPerson', obyektId: p.id });

  return NextResponse.json({
    ...p,
    kutilayotganMaosh: p.kutilayotganMaosh?.toString() ?? null,
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Tahrir.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Маълумот нотўғри', tafsilot: natija.error.flatten() },
      { status: 400 }
    );
  }

  const mavjud = await prisma.unemployedPerson.findUnique({
    where: { id: params.id },
    select: { holati: true },
  });
  if (!mavjud) return NextResponse.json({ xabar: 'Фуқаро топилмади' }, { status: 404 });

  const d = natija.data;
  const yangiHolat = holatniAniqla(mavjud.holati, d);

  const { qolHolati: _q, householdId: _h, mahallaId: _m, ...maydonlar } = d;

  const p = await prisma.unemployedPerson.update({
    where: { id: params.id },
    data: {
      ...maydonlar,
      telefon: d.telefon ? (telefonSaqlashUchun(d.telefon) ?? d.telefon) : undefined,
      kutilayotganMaosh:
        d.kutilayotganMaosh == null ? undefined : BigInt(d.kutilayotganMaosh),
      holati: yangiHolat,
      // Suhbat kim tomonidan o'tkazilgani - anketadagi imzo qatori
      ...(yangiHolat !== 'ANIQLANDI' && mavjud.holati === 'ANIQLANDI'
        ? { suhbatSanasi: new Date(), mutaxassisId: q.sessiya.userId }
        : {}),
    },
  });

  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'UnemployedPerson',
    obyektId: p.id,
    izoh: `Ҳолат: ${mavjud.holati} -> ${yangiHolat}`,
  });

  return NextResponse.json({ ok: true, holati: p.holati });
}
