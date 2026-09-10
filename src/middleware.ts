import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/sessiya-nomi';

/**
 * ============================================================
 *  YO'L QO'RIQCHISI
 *
 *  Butun sayt login ortida - ochiq sahifa yo'q. Kelajak Egasi'da
 *  anketa loginsiz ochiq edi (o'quvchi o'zi to'ldirardi), bu yerda
 *  esa har bir sahifa oila daromadi va sog'liq holatini ko'rsatadi.
 *
 *  Middleware faqat cookie BORLIGINI tekshiradi, imzosini emas:
 *  Edge muhitida Node'ning `crypto.timingSafeEqual` funksiyasi
 *  yo'q. To'liq tekshiruv sahifa va API ichida `talabQil()` orqali
 *  amalga oshiriladi - u yerda baza ham tekshiriladi (xodim
 *  ishdan bo'shatilgan bo'lishi mumkin).
 *
 *  Ya'ni bu qatlam himoya emas, YO'NALTIRUVCHI: sessiyasi yo'q
 *  odamni bo'sh sahifa o'rniga login sahifasiga olib boradi.
 * ============================================================
 */

/** Sessiyasiz ochiladigan yo'llar */
const OCHIQ = ['/kirish', '/api/auth/kirish'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (OCHIQ.some((y) => pathname === y || pathname.startsWith(`${y}/`))) {
    return NextResponse.next();
  }

  const bor = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (bor) return NextResponse.next();

  // API so'rovlari yo'naltirilmaydi - ular JSON kutadi
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { xabar: 'Ruxsat yo‘q. Tizimga qayta kiring.' },
      { status: 401 }
    );
  }

  const kirish = new URL('/kirish', req.url);
  // Kirgandan keyin xodim so'ragan sahifaga qaytarish uchun
  if (pathname !== '/') kirish.searchParams.set('keyin', pathname);
  return NextResponse.redirect(kirish);
}

export const config = {
  matcher: [
    /*
     * Statik fayllar va rasmlardan tashqari hamma narsa.
     * `manifest.json`, `sw.js` va `favicon` ham tashqarida - ular
     * login sahifasida ham kerak bo'ladi.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)',
  ],
};
