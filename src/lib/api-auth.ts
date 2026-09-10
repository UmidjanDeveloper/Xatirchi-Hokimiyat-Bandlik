import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './auth';

/**
 * Himoyalangan API yo'llari uchun tekshiruv.
 * Sessiya yaroqsiz bo'lsa 401 javobini qaytaradi, aks holda `null`.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const user = await verifySessionToken(token);
  if (!user) {
    return NextResponse.json(
      { message: 'Ruxsat yo\'q. Iltimos, tizimga qayta kiring.' },
      { status: 401 }
    );
  }
  return null;
}
