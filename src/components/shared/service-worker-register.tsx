'use client';

import { useEffect } from 'react';

/**
 * Service Worker'ni ro'yxatdan o'tkazadi (PWA / oflayn rejim).
 * Faqat ishlab chiqarish (production) rejimida faollashadi — dev rejimida
 * keshlangan fayllar ishlashga xalaqit bermasligi uchun.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
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
