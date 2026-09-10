import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth';
import { jurnal, sorovSessiyasi } from '@/lib/api-auth';

export async function POST() {
  const sessiya = sorovSessiyasi();
  if (sessiya) await jurnal(sessiya.userId, 'CHIQISH');

  cookies().set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
