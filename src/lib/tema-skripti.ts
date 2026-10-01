/**
 * Tema kaliti va sahifa yuklanishidan oldingi skript.
 *
 * Alohida fayl: skriptni SERVER (`layout.tsx`) ishlatadi, kalitni esa
 * BRAUZER komponenti. `'use client'` faylidan oddiy qiymat import
 * qilish server uchun "mijoz havolasi" beradi, haqiqiy matn emas -
 * Next 14.2 buni hozircha yashirincha tuzatadi, lekin bunga tayanib
 * bo'lmaydi (`scripts/server-mijoz-sinov.ts` shuni qo'riqlaydi).
 */

export const THEME_KEY = 'bandlik_tema';

/**
 * Sahifa yuklanishidan OLDIN temani qo'llaydigan skript.
 *
 * Busiz sahifa bir lahza noto'g'ri temada ko'rinib, keyin
 * "sakrab" o'zgaradi (flash of wrong theme).
 */
export const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('${THEME_KEY}');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
    var n = navigator;
    var lite = (n.deviceMemory && n.deviceMemory <= 4)
      || (n.hardwareConcurrency && n.hardwareConcurrency <= 4)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lite) document.documentElement.setAttribute('data-fx','lite');
  } catch (e) {}
})();
`;
