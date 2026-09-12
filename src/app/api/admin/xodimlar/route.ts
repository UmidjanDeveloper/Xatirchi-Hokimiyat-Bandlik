import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { parolXeshla, parolYaroqlimi } from '@/lib/auth';
import { telefonSaqlashUchun } from '@/lib/inson-tekshiruvi';
import { shifrla } from '@/lib/sir-shifrlash';
import { ismTekshir } from '@/lib/inson-tekshiruvi';

const Yangi = z
  .object({
    username: z
      .string()
      .min(3)
      .max(32)
      // Login telefonda teriladi - kirill va bo'shliq chalkashlik keltiradi
      .regex(/^[a-z0-9_]+$/, 'Логин фақат кичик лотин ҳарф, рақам ва _ дан иборат'),
    parol: z.string().min(8).max(200),
    fullName: z.string().min(3).max(100),
    position: z.string().max(100).nullish(),
    telefon: z.string().max(20).nullish(),
    rol: z.enum(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN']),
    mahallaId: z.string().cuid().nullish(),
  })
  /*
   * YETTILIK roli mahallasiz bo'lishi MUMKIN EMAS.
   *
   * Mahalla filtri aynan shu maydonga tayanadi: u bo'sh bo'lsa
   * `mahallaFiltri()` bo'sh obyekt qaytaradi va xodim butun
   * tumandagi oilalar ma'lumotini ko'rib qoladi. Shuning uchun
   * tekshiruv yaratish paytida turadi.
   */
  .refine((d) => d.rol !== 'YETTILIK' || !!d.mahallaId, {
    message: 'Маҳалла еттилиги аъзоси учун маҳалла танланиши шарт',
    path: ['mahallaId'],
  });

export async function POST(request: Request) {
  /*
   * Bandlik markazi rahbari ham xodim qo'sha oladi, lekin FAQAT
   * mahalla yettiligi a'zosini. Tekshiruv quyida, sxema o'qilgandan
   * keyin turadi.
   */
  const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR']);
  if (q instanceof NextResponse) return q;

  const natija = Yangi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      {
        xabar:
          natija.error.issues[0]?.message ?? 'Маълумот нотўғри',
      },
      { status: 400 }
    );
  }

  const d = natija.data;

  /*
   * HUQUQ OSHIRISHNING OLDINI OLISH.
   *
   * Bandlik rahbariga xodim qo'shish huquqi berildi, lekin u
   * o'ziga yoki boshqasiga ADMIN roli bera olmasligi kerak - aks
   * holda bir bosishda butun tizim ustidan nazorat qo'lga o'tardi.
   *
   * Tekshiruv sxemada emas, shu yerda turadi: sxema kim
   * so'rayotganini bilmaydi, faqat ma'lumot shaklini biladi.
   */
  if (q.sessiya.rol !== 'ADMIN' && d.rol !== 'YETTILIK') {
    return NextResponse.json(
      { xabar: 'Сиз фақат маҳалла еттилиги аъзосини қўша оласиз' },
      { status: 403 }
    );
  }

  const ism = ismTekshir(d.fullName, 'Ф.И.Ш.');
  if (!ism.ok) return NextResponse.json({ xabar: ism.xabar }, { status: 400 });

  const parolTekshiruvi = parolYaroqlimi(d.parol);
  if (!parolTekshiruvi.ok) {
    return NextResponse.json({ xabar: parolTekshiruvi.xato }, { status: 400 });
  }

  try {
    const u = await prisma.user.create({
      data: {
        username: d.username.toLowerCase(),
        passwordHash: parolXeshla(d.parol),
        // Shifrlangan nusxa - administrator keyinroq ko'ra olishi uchun
        berilganParol: shifrla(d.parol),
        parolBerilganVaqt: new Date(),
        fullName: d.fullName.trim(),
        position: d.position?.trim() || null,
        phone: d.telefon ? (telefonSaqlashUchun(d.telefon) ?? d.telefon) : null,
        rol: d.rol,
        mahallaId: d.rol === 'YETTILIK' ? d.mahallaId : null,
        // Administrator bergan parolni xodim birinchi kirishda almashtiradi
        parolAlmashtirilsin: true,
      },
    });

    await jurnal(q.sessiya.userId, 'YARATISH', {
      obyektTuri: 'User',
      obyektId: u.id,
      izoh: `${d.username} (${d.rol})`,
    });

    return NextResponse.json({ ok: true, id: u.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ xabar: 'Бу логин банд' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ xabar: 'Сақлашда хатолик' }, { status: 500 });
  }
}
