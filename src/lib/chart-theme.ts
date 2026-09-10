'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/shared/theme-provider';

/**
 * ============================================================
 *  DIAGRAMMA RANGLARI
 *
 *  Recharts SVG atributlariga aniq rang qiymatini talab qiladi —
 *  Tailwind sinflari u yerda ishlamaydi. Shu sababli diagramma
 *  ranglari shu yerda, ikki tema uchun alohida saqlanadi.
 *
 *  Qorong'i fonda och ranglar, yorug' fonda to'q ranglar ishlatiladi:
 *  ikkalasida ham matn va ustunlar orasidagi kontrast WCAG AA
 *  talabidan past tushmaydi.
 * ============================================================
 */

export interface ChartTheme {
  /** O'q raqamlari va nomlari */
  axisText: string;
  /** O'q chizig'i */
  axisLine: string;
  /** Sichqoncha ostidagi ustunning fon rangi */
  cursor: string;
  /** Bitta seriyali diagrammalar uchun asosiy rang */
  primary: string;
  /** Doiraviy diagramma bo'laklari orasidagi ajratuvchi */
  pieStroke: string;
  /** Jins bo'yicha ranglar */
  gender: Record<string, string>;
  /** Ketma-ket shkala — sinflar uchun */
  rampBlue: string[];
  /** Ketma-ket shkala — fanlar uchun */
  rampAmber: string[];
}

const DARK: ChartTheme = {
  axisText: '#a7b6d9',
  axisLine: 'rgba(255,255,255,0.14)',
  cursor: 'rgba(255,255,255,0.05)',
  primary: '#60a5fa',
  pieStroke: '#101830',
  gender: {
    "O'g'il bola": '#60a5fa',
    'Qiz bola': '#f472b6',
  },
  // Och -> to'q emas, aksincha: qorong'i fonda yorqinlik bo'yicha o'sadi
  rampBlue: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  rampAmber: [
    '#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b',
    '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#fffbeb',
  ],
};

const LIGHT: ChartTheme = {
  axisText: '#475569',
  axisLine: 'rgba(15,23,42,0.12)',
  cursor: 'rgba(15,23,42,0.04)',
  primary: '#1d4ed8',
  pieStroke: '#ffffff',
  gender: {
    "O'g'il bola": '#1d4ed8',
    'Qiz bola': '#be185d',
  },
  rampBlue: ['#c7dbf7', '#9dc0ec', '#6f9fdc', '#4680ca', '#2a66b2', '#1d4ed8', '#152f6e'],
  rampAmber: [
    '#fbe3b4', '#f7d08a', '#f2b01e', '#de9c0c', '#c48606',
    '#a96f0a', '#8c5a10', '#6f4712', '#553612', '#3d270f',
  ],
};

/** Joriy temaga mos diagramma ranglarini qaytaradi */
export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme();
  return useMemo(() => (resolved === 'dark' ? DARK : LIGHT), [resolved]);
}
