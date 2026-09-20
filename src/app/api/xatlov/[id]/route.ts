import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';
import { SABAB_ENG_KAM, arxivgaRuxsat, xonadonniArxivla } from '@/lib/arxiv';

/** Bitta xatlov - to'liq ma'lumot bilan */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const q = await talabQil();
  if (q instanceof NextResponse) return q;

  const xonadon = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      mahalla: { select: { id: true, nomi: true, nomiKirill: true } },
      xodim: { select: { fullName: true, position: true } },
      ishsizlar: { orderBy: { createdAt: 'asc' } },
      topshiriqlar: { orderBy: { muddat: 'asc' } },
    },
  });

  if (!xonadon) return NextResponse.json({ xabar: 'Xatlov topilmadi' }, { status: 404 });

  if (!mahallagaRuxsat(q.sessiya, xonadon.mahallaId)) {
    return NextResponse.json({ xabar: 'Bu xatlovga huquqingiz yo‘q' }, { status: 403 });
  }

  /*
   * Xonadon kartochkasini ochish - oila daromadi va sog'liq holatini
   * ko'rish demak. Shuning uchun har ochilish jurnalga tushadi.
   */
  await jurnal(q.sessiya.userId, 'KORISH', {
    obyektTuri: 'Household',
    obyektId: xonadon.id,
  });

  // BigInt JSON ga o'girilmaydi - qo'lda satrga aylantiramiz
  return NextResponse.json({
    ...xonadon,
    talabQilinganMablag: xonadon.talabQilinganMablag?.toString() ?? null,
    oylikDaromad: xonadon.oylikDaromad?.toString() ?? null,
    chetElOylikPul: xonadon.chetElOylikPul?.toString() ?? null,
    chetElOylikPulSom: xonadon.chetElOylikPulSom?.toString() ?? null,
    ishsizlar: xonadon.ishsizlar.map((p) => ({
      ...p,
      kutilayotganMaosh: p.kutilayotganMaosh?.toString() ?? null,
    })),
  });
}

/**
 * Xatlovni o'chirish.
 *
 * ── Ikki xil amal, bitta tugma ──
 *
 * QORALAMA — haqiqatan o'chiriladi. U hali hech qayerga
 * ulanmagan: hisobotda yo'q, topshiriq yo'q, tarix yo'q.
 *
 * YUBORILGAN yoki TASDIQLANGAN — ARXIVGA olinadi. Sabab
 * `src/lib/arxiv.ts` da batafsil yozilgan: haqiqiy o'chirish
 * xonadon bilan birga uning topshiriqlarini va tarixini ham
 * yo'q qilardi.
 *
 * Xodim uchun farqi ko'rinmaydi — ikkalasida ham yozuv
 * ro'yxatdan yo'qoladi. Farqi shundaki, ikkinchisini qaytarish
 * mumkin.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const xonadon = await prisma.household.findUnique({
    where: { id: params.id },
    select: { mahallaId: true, holati: true, xodimId: true, manzil: true },
  });

  if (!xonadon) return NextResponse.json({ xabar: 'Xatlov topilmadi' }, { status: 404 });

  const ruxsat = arxivgaRuxsat(q.sessiya.rol, q.sessiya.mahallaId, xonadon);
  if (!ruxsat.ok) return NextResponse.json({ xabar: ruxsat.xabar }, { status: 403 });

  /* ── Qoralama: haqiqatan o'chiriladi ── */
  if (xonadon.holati === 'QORALAMA') {
    if (q.sessiya.rol === 'YETTILIK' && xonadon.xodimId !== q.sessiya.userId) {
      return NextResponse.json({ xabar: 'Bu qoralamani boshqa xodim boshlagan' }, { status: 403 });
    }
    await prisma.household.delete({ where: { id: params.id } });
    await jurnal(q.sessiya.userId, 'OCHIRISH', {
      obyektTuri: 'Household',
      obyektId: params.id,
      izoh: `Qoralama o‘chirildi: ${xonadon.manzil}`,
    });
    return NextResponse.json({ ok: true, turi: 'ochirildi' });
  }

  /* ── Yuborilgan: sabab so'raladi va arxivga olinadi ── */
  const tana = (await request.json().catch(() => ({}))) as { sabab?: unknown };
  const sabab = typeof tana.sabab === 'string' ? tana.sabab.trim() : '';
  if (sabab.length < SABAB_ENG_KAM) {
    return NextResponse.json(
      {
        xabar: `Сабабни ёзинг — камида ${SABAB_ENG_KAM} белги. Кейинчалик «нега бу хонадон йўқ?» деган саволга жавоб шу ердан топилади.`,
        maydon: 'sabab',
      },
      { status: 400 }
    );
  }

  const natija = await prisma.$transaction((tx) =>
    xonadonniArxivla(tx, params.id, q.sessiya.userId, sabab)
  );

  await jurnal(q.sessiya.userId, 'OCHIRISH', {
    obyektTuri: 'Household',
    obyektId: params.id,
    izoh: `Архивга олинди (${xonadon.manzil}): ${sabab} · ${natija.ishsizlar} фуқаро, ${natija.topshiriqlar} топшириқ`,
  });

  return NextResponse.json({ ok: true, turi: 'arxivlandi', ...natija });
}
