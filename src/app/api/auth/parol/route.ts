import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, parolTogrimi, parolXeshla, parolYaroqlimi, sessiyaYarat } from '@/lib/auth';
import { jurnal, talabQil } from '@/lib/api-auth';

const Almashtirish = z.object({
  eski: z.string().min(1).max(200),
  yangi: z.string().min(1).max(200),
});

/** Xodim o'z parolini almashtiradi */
export async function POST(request: Request) {
  /*
   * `parolsizHam` — мажбурий алмаштириш талабидан озод.
   * Бу йўлнинг ЎЗИ парол алмаштиради; тўсилса, одам қулф
   * ичида қоларди.
   */
  const q = await talabQil(undefined, { parolsizHam: true });
  if (q instanceof NextResponse) return q;

  const natija = Almashtirish.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Eski va yangi parolni kiriting' }, { status: 400 });
  }

  const { eski, yangi } = natija.data;

  const user = await prisma.user.findUnique({
    where: { id: q.sessiya.userId },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ xabar: 'Foydalanuvchi topilmadi' }, { status: 404 });

  if (!parolTogrimi(eski, user.passwordHash)) {
    return NextResponse.json({ xabar: 'Joriy parol noto‘g‘ri' }, { status: 400 });
  }

  const tekshiruv = parolYaroqlimi(yangi);
  if (!tekshiruv.ok) {
    return NextResponse.json({ xabar: tekshiruv.xato }, { status: 400 });
  }

  if (eski === yangi) {
    return NextResponse.json(
      { xabar: 'Yangi parol eskisidan farq qilishi kerak' },
      { status: 400 }
    );
  }

  /*
   * Xodim o'ziga parol o'ylab qo'ydi - demak administrator
   * tayinlagan nusxa ESKIRDI. Uni o'chirib tashlaymiz.
   *
   * Nega shunday: ro'yxatdagi "паролни кўриш" tugmasi shu
   * nusxani ochadi. Agar eskisini qoldirsak, administrator uni
   * ko'rib, xodimga aytib, ikkalasi ham nega kira olmayotganini
   * tushunmay qolardi.
   *
   * Xodim o'ylagan parol ATAYLAB saqlanmaydi: uni faqat xodimning
   * o'zi bilishi kerak. Unutsa - administrator yangisini tayinlaydi.
   *
   * `parolBerilganVaqt` qoladi: u "bir vaqtlar tayinlangan edi"
   * degan belgi va ro'yxat shunga qarab "ходим ўзгартирган" deb
   * yozadi, "тайинланмаган" deb emas.
   */
  await prisma.user.update({
    where: { id: q.sessiya.userId },
    data: {
      passwordHash: parolXeshla(yangi),
      parolAlmashtirilsin: false,
      berilganParol: null,
      /*
       * ── ЭСКИ СЕССИЯЛАР ЎЛАДИ ──
       *
       * Парол алмаштиришнинг маъноси шу: эски парол билан
       * кирган ҳар ким чиқиб кетсин.
       *
       * Бусиз парол алмаштириш деярли бефойда эди —
       * cookie имзоланган payload ва уни бекор қилиб
       * бўлмасди: ўғри яна 12 соат ичкарида қоларди.
       */
      sessiyaVersiyasi: { increment: 1 },
    },
  });
  await jurnal(q.sessiya.userId, 'PAROL_ALMASHTIRILDI');

  /*
   * ЎЗ cookie'мизни ҳам янгилаймиз — акс ҳолда парол
   * алмаштирган одамнинг ўзи ҳам дарҳол чиқиб кетарди.
   */
  const yangilangan = await prisma.user.findUnique({
    where: { id: q.sessiya.userId },
    select: { sessiyaVersiyasi: true, username: true, fullName: true, rol: true, mahallaId: true },
  });

  if (yangilangan) {
    const { token, exp } = sessiyaYarat({
      userId: q.sessiya.userId,
      username: yangilangan.username,
      fullName: yangilangan.fullName,
      rol: yangilangan.rol,
      mahallaId: yangilangan.mahallaId,
      v: yangilangan.sessiyaVersiyasi,
    });
    cookies().set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(exp),
    });
  }

  return NextResponse.json({ ok: true });
}
