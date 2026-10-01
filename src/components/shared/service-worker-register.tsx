'use client';

import { useEffect } from 'react';

/**
 * ============================================================
 *  SERVICE WORKER'NI RO'YXATDAN O'TKAZISH
 *
 *  ── Qanday nuqsonni yopadi ──
 *
 *  Bu komponent avval ham bor edi, lekin hech qayerda
 *  ULANMAGAN va `public/sw.js` faylining o'zi yo'q edi. Ya'ni
 *  PWA nomigagina turardi: o'rnatib bo'lmasdi, oflayn
 *  sahifa ham yo'q edi.
 *
 *  ── Nega faqat production ──
 *
 *  Ishlab chiqishda keshlangan fayl o'zgarishni ko'rsatmay
 *  qo'yadi va soatlab «nega tuzalmadi» deb qidirishga olib
 *  keladi.
 *
 *  ── Nega `updateViaCache: 'none'` ──
 *
 *  Brauzer `sw.js` ning o'zini ham HTTP keshida ushlab
 *  turishi mumkin. U holda xato tuzatilgan yangi worker
 *  telefonlarga kunlab yetib bormaydi — worker'ning o'zi
 *  xato bo'lsa, buni tuzatish yo'li yopiladi.
 *
 *  ── Yangilanish sahifani QAYTA YUKLAMAYDI ──
 *
 *  Xodim anketa o'rtasida bo'lsa, ekran birdan yangilanib
 *  ketmasligi kerak. Yangi worker keyingi sahifa ochilishida
 *  ishlay boshlaydi; qoralama esa `localStorage` da va
 *  worker unga umuman tegmaydi.
 * ============================================================
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {
          // Ro'yxatdan o'tkazish muvaffaqiyatsiz bo'lsa ham ilova ishlayveradi
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
