'use client';

import { useEffect } from 'react';

/** Barcha reja formalarida bir xil ko'rinadigan maydon */
export const MAYDON =
  'w-full rounded-md border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-accent';

/**
 * Saqlanmagan o'zgarish bor paytda sahifadan chiqib ketishdan
 * ogohlantiradi.
 *
 * ── Nega qurilmaga saqlash EMAS ──
 *
 * Reja formalarida oilaning shaxsiy ma'lumoti va fikri yoziladi.
 * Uni brauzer xotirasiga yashirincha yozib qo'yish - kimdir shu
 * telefonni olsa, o'qiy oladigan nusxa qoldirish. Ogohlantirish
 * esa ma'lumotni yo'qotmaydi va hech narsa saqlamaydi.
 */
export function useSaqlanmaganOgohlantirish(ozgargan: boolean) {
  useEffect(() => {
    if (!ozgargan) return;
    const ushla = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', ushla);
    return () => window.removeEventListener('beforeunload', ushla);
  }, [ozgargan]);
}
