'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'kelajak_theme';

interface ThemeContextValue {
  theme: Theme;
  /** Hozir amalda ko'rinayotgan tema (system hal qilingandan keyin) */
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Kompyuter zaifligini aniqlaydi.
 *
 * Maktab sinflaridagi eski kompyuterlarda `backdrop-filter` (shisha
 * effekti) va uzluksiz animatsiyalar kadrlar sonini keskin tushiradi.
 * Shu sababli quvvat past bo'lsa, effektlar avtomatik yengillashadi —
 * dizayn saqlanadi, lekin sayt ravon ishlaydi.
 */
function detectLowPower(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Foydalanuvchi tizimda harakatni kamaytirishni so'ragan bo'lsa
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;

    const nav = navigator as Navigator & { deviceMemory?: number };

    // 4 GB dan kam operativ xotira — eski mashina belgisi
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return true;

    // 4 tadan kam yadro
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark');

  /** Temani hujjatga qo'llaydi */
  const apply = useCallback((next: Theme) => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective = next === 'system' ? (systemDark ? 'dark' : 'light') : next;

    if (next === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', next);
    }

    setResolved(effective);
  }, []);

  // Boshlang'ich holat: saqlangan tanlov + quvvat tekshiruvi
  useEffect(() => {
    let saved: Theme = 'system';
    try {
      const raw = window.localStorage.getItem(THEME_KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') saved = raw;
    } catch {
      // localStorage yopiq bo'lsa — tizim temasi bilan davom etamiz
    }

    setThemeState(saved);
    apply(saved);

    if (detectLowPower()) {
      document.documentElement.setAttribute('data-fx', 'lite');
    }

    // Tizim temasi o'zgarsa va foydalanuvchi "system" da tursa — kuzatamiz
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (saved === 'system') apply('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [apply]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      apply(next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // Saqlab bo'lmasa ham joriy seansda ishlayveradi
      }
    },
    [apply]
  );

  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme faqat <ThemeProvider> ichida ishlatiladi');
  return ctx;
}

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
