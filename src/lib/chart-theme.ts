'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/shared/theme-provider';

/**
 * ============================================================
 *  DIAGRAMMA RANGLARI
 *
 *  Recharts SVG atributlariga aniq rang qiymatini talab qiladi -
 *  Tailwind sinflari u yerda ishlamaydi. Shuning uchun diagramma
 *  ranglari shu yerda, ikki tema uchun ALOHIDA saqlanadi.
 *
 *  Qorong'i tema yorug'ining teskarisi emas: har bir qiymat o'z
 *  foni uchun alohida tanlangan va tekshiruvdan o'tkazilgan.
 *
 *  ── Qanday tekshirilgan ──
 *
 *  Har ikkala palitra `validate_palette.js` bilan hisoblab
 *  ko'rilgan (ko'z bilan emas):
 *
 *    Kategoriya, yorug' (fon #fcfcfb):
 *      yorug'lik oralig'i, rang to'yinganligi, rang ko'rmaydigan
 *      foydalanuvchi uchun ajralish (eng yomon juft ΔE 13.6),
 *      oddiy ko'rish uchun ajralish (ΔE 23.6), fon bilan
 *      kontrast - hammasi o'tdi.
 *
 *    Kategoriya, qorong'i (fon #16203a):
 *      eng yomon juft ΔE 13.6 (deutan), oddiy ko'rish ΔE 18.9 -
 *      hammasi o'tdi.
 *
 *    Ketma-ket shkala (ikkala tema):
 *      yorug'lik monoton o'sadi, qadamlar orasidagi farq yetarli,
 *      eng och qadam fondan ajralib turadi.
 *
 *  Rang o'zgartirilsa - o'sha skriptni qayta ishlatish kerak.
 *  "Chiroyli ko'rinadi" degan mezon bu yerda yaramaydi: rang
 *  ko'rmaydigan odam uchun ikki ustun qo'shilib ketishi mumkin.
 *
 *  ── Rang yolg'iz ma'no tashimaydi ──
 *
 *  Har bir diagrammada rangdan tashqari ikkinchi belgi bor:
 *  yozuv, legenda yoki to'g'ridan-to'g'ri yorliq. Rang faqat
 *  yordam beradi, xabarni o'zi tashimaydi.
 * ============================================================
 */

export interface ChartTheme {
  /** O'q raqamlari va nomlari */
  axisText: string;
  /** O'q va to'r chizig'i */
  axisLine: string;
  /** Sichqoncha ostidagi ustunning fon rangi */
  cursor: string;
  /** Bitta seriyali diagrammalar uchun asosiy rang */
  primary: string;
  /** Doiraviy diagramma bo'laklari orasidagi ajratuvchi */
  pieStroke: string;
  /** Maslahat oynasi foni va chegarasi */
  tooltipBg: string;
  tooltipBorder: string;

  /**
   * Kategoriya ranglari - TARTIB BILAN beriladi, aylantirilmaydi.
   * Oltinchi toifa paydo bo'lsa, u yangi rang olmaydi: "Boshqa"
   * ga qo'shiladi yoki alohida diagramma chiziladi.
   */
  toifa: string[];

  /**
   * Ketma-ket shkala - miqdor uchun (och = kam, to'q = ko'p).
   * Voronka bosqichlari ham shundan oladi: bosqich tartibli,
   * ya'ni kategoriya emas.
   */
  ramp: string[];

  /** Holat ranglari - faqat holat uchun, seriya rangi sifatida emas */
  ok: string;
  warn: string;
  danger: string;
}

const LIGHT: ChartTheme = {
  axisText: '#475569',
  axisLine: 'rgba(15,23,42,0.10)',
  cursor: 'rgba(15,23,42,0.04)',
  primary: '#2a78d6',
  pieStroke: '#ffffff',
  tooltipBg: '#ffffff',
  tooltipBorder: 'rgba(15,23,42,0.12)',

  toifa: ['#2563eb', '#b45309', '#0d9488', '#7e22ce', '#be123c'],
  ramp: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'],

  ok: '#047857',
  warn: '#a16207',
  danger: '#b91c1c',
};

const DARK: ChartTheme = {
  axisText: '#a7b6d9',
  axisLine: 'rgba(255,255,255,0.12)',
  cursor: 'rgba(255,255,255,0.05)',
  primary: '#4e90e6',
  pieStroke: '#16203a',
  tooltipBg: '#1b2742',
  tooltipBorder: 'rgba(255,255,255,0.14)',

  toifa: ['#4e90e6', '#c08726', '#22ab98', '#9d6fe0', '#df6178'],
  // Qorong'i fonda och -> to'q emas, aksincha: yorqinlik bo'yicha o'sadi
  ramp: ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#b7d3f6'],

  ok: '#34d399',
  warn: '#fbbf24',
  danger: '#f87171',
};

/** Joriy temaga mos diagramma ranglarini qaytaradi */
export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme();
  return useMemo(() => (resolved === 'dark' ? DARK : LIGHT), [resolved]);
}

/**
 * Excel hisoboti uchun ranglar.
 *
 * Excel temani bilmaydi va uning varag'i doim oq - shuning uchun
 * u yerda faqat yorug' palitra ishlatiladi. `#` belgisisiz,
 * chunki OOXML formati shunday talab qiladi.
 */
export const EXCEL_RANGLARI = {
  toifa: LIGHT.toifa.map((c) => c.slice(1)),
  ramp: LIGHT.ramp.map((c) => c.slice(1)),
  primary: LIGHT.primary.slice(1),
};
