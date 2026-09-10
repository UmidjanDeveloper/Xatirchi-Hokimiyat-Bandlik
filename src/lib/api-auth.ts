/**
 * ============================================================
 *  API YO'LLARI UCHUN HUQUQ TEKSHIRUVI
 *
 *  Har bir himoyalangan yo'l shu yerdagi qo'riqchidan boshlanadi.
 *  Tekshiruvni har faylda qo'lda yozish o'rniga bitta joyga
 *  yig'ish ataylab qilingan: bitta yo'lda unutilsa, butun
 *  tumandagi oilalar ma'lumoti ochilib qolardi.
 * ============================================================
 */

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Rol } from '@prisma/client';
import { SESSION_COOKIE, sessiyaOqi, type Sessiya } from './auth';
import { prisma } from './prisma';

export interface Qoriqchi {
  sessiya: Sessiya;
}

/** Sessiyani o'qiydi; yaroqsiz bo'lsa `null` */
export function sorovSessiyasi(): Sessiya | null {
  return sessiyaOqi(cookies().get(SESSION_COOKIE)?.value);
}

/** 401 javobi */
export function ruxsatYoq(xabar = 'Ruxsat yo‘q. Tizimga qayta kiring.') {
  return NextResponse.json({ xabar }, { status: 401 });
}

/** 403 javobi */
export function taqiqlangan(xabar = 'Bu amal uchun huquqingiz yetarli emas.') {
  return NextResponse.json({ xabar }, { status: 403 });
}

/**
 * Sessiyani talab qiladi va ixtiyoriy ravishda rolni tekshiradi.
 *
 * Ishlatilishi:
 *   const q = await talabQil(['BANDLIK', 'ADMIN']);
 *   if (q instanceof NextResponse) return q;
 *   // bu yerdan keyin q.sessiya ishonchli
 */
export async function talabQil(rollar?: Rol[]): Promise<Qoriqchi | NextResponse> {
  const sessiya = sorovSessiyasi();
  if (!sessiya) return ruxsatYoq();

  // Sessiya cookie'si 12 soat yashaydi. Shu vaqt ichida xodim ishdan
  // bo'shatilishi yoki roli o'zgarishi mumkin, shuning uchun bazadagi
  // holat har so'rovda tekshiriladi - faqat cookie'ga ishonish kifoya emas.
  const user = await prisma.user.findUnique({
    where: { id: sessiya.userId },
    select: { faol: true, rol: true, mahallaId: true },
  });

  if (!user || !user.faol) {
    return ruxsatYoq('Hisobingiz faol emas. Administratorga murojaat qiling.');
  }

  const joriy: Sessiya = { ...sessiya, rol: user.rol, mahallaId: user.mahallaId };

  if (rollar && !rollar.includes(user.rol)) return taqiqlangan();

  return { sessiya: joriy };
}

/** So'rov yuborgan qurilmaning IP manzili - audit jurnali uchun */
export function sorovIp(): string | null {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
}

/**
 * Audit jurnaliga yozadi.
 *
 * Xatolik butun amalni to'xtatmasligi kerak: jurnal yozilmagani
 * yomon, lekin xodimning xatlovi yo'qolgani bundan battar.
 */
export async function jurnal(
  userId: string,
  amal: string,
  qoshimcha?: { obyektTuri?: string; obyektId?: string; izoh?: string }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        amal,
        obyektTuri: qoshimcha?.obyektTuri,
        obyektId: qoshimcha?.obyektId,
        izoh: qoshimcha?.izoh,
        ip: sorovIp(),
      },
    });
  } catch (e) {
    console.error('Audit jurnaliga yozib bo‘lmadi:', e);
  }
}
