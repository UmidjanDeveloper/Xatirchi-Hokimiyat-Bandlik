import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, parolTogrimi, sessiyaYarat } from '@/lib/auth';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limit';
import { jurnal } from '@/lib/api-auth';

const Kirish = z.object({
  username: z.string().min(1).max(64),
  parol: z.string().min(1).max(200),
});

/**
 * Bir IP dan 15 daqiqada 10 ta urinish.
 *
 * Xodim parolini unutsa 3-4 marta urinadi, keyin administratorga
 * qo'ng'iroq qiladi. 10 ta chegara uni bezovta qilmaydi, lekin
 * parolni terib topishga urinishni amalda imkonsiz qiladi.
 */
const CHEGARA = 10;
const OYNA_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const chegara = checkRateLimit(`kirish:${ip}`, CHEGARA, OYNA_MS);

  if (!chegara.allowed) {
    const daqiqa = Math.ceil(chegara.retryAfter / 60);
    return NextResponse.json(
      {
        xabar: `Juda ko‘p urinish bo‘ldi. ${daqiqa} daqiqadan so‘ng qayta urinib ko‘ring.`,
      },
      { status: 429 }
    );
  }

  let tana: unknown;
  try {
    tana = await request.json();
  } catch {
    return NextResponse.json({ xabar: 'So‘rov noto‘g‘ri' }, { status: 400 });
  }

  const natija = Kirish.safeParse(tana);
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Login va parolni kiriting' },
      { status: 400 }
    );
  }

  const { username, parol } = natija.data;

  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      fullName: true,
      rol: true,
      mahallaId: true,
      faol: true,
      parolAlmashtirilsin: true,
    },
  });

  /*
   * Login topilmaganda ham parol tekshiruvi bajarilgandek vaqt ketishi
   * kerak. Aks holda javob tezligi qaysi loginlar mavjudligini oshkor
   * qiladi va hujumchi avval loginlar ro'yxatini yig'ib oladi.
   */
  const soxta = '0'.repeat(32) + ':' + '0'.repeat(128);
  const togri = parolTogrimi(parol, user?.passwordHash ?? soxta);

  if (!user || !togri) {
    return NextResponse.json(
      { xabar: 'Login yoki parol noto‘g‘ri' },
      { status: 401 }
    );
  }

  if (!user.faol) {
    return NextResponse.json(
      { xabar: 'Hisobingiz faol emas. Administratorga murojaat qiling.' },
      { status: 403 }
    );
  }

  const { token, exp } = sessiyaYarat({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    rol: user.rol,
    mahallaId: user.mahallaId,
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(exp),
  });

  // Muvaffaqiyatli kirishdan keyin chegara tozalanadi - bir kompyuterdan
  // navbatma-navbat kirayotgan xodimlar bir-birini bloklamasligi uchun.
  resetRateLimit(`kirish:${ip}`);

  await prisma.user.update({
    where: { id: user.id },
    data: { oxirgiKirish: new Date() },
  });
  await jurnal(user.id, 'KIRISH');

  return NextResponse.json({
    ok: true,
    rol: user.rol,
    fullName: user.fullName,
    parolAlmashtirilsin: user.parolAlmashtirilsin,
  });
}
