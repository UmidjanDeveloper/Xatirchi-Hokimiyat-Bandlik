import type { IshsizHolati } from '@prisma/client';

/**
 * ============================================================
 *  DAVR VA DIAGRAMMA TURLARI — BAZASIZ
 *
 *  ── Nega alohida fayl ──
 *
 *  Diagramma komponentlari (`grafiklar.tsx`, `dinamika-blogi.tsx`,
 *  `davr-tanlash.tsx`) brauzerda ishlaydi va shu yerdan `Davr`,
 *  `DAVR_NOMI`, `DAVR_BIRLIGI` ni oladi.
 *
 *  Ilgari ular `tahlil.ts` dan olinardi — u esa `prisma` ni
 *  import qiladi. Ya'ni CHIZMA komponenti bazadan bir import
 *  narida turardi. Bir kun bundler uni tashlab yubormay qoldi
 *  va butun sahifa qulab tushdi:
 *
 *      PrismaClient is unable to run in this browser environment
 *
 *  Sahifa server tomonda to'g'ri chiqardi, brauzerda esa oq
 *  ekran. Bunday nuqson topish eng qiyinlaridan.
 *
 *  Endi brauzer ko'radigan narsa ALOHIDA faylda va unda hech
 *  qanday baza yo'q. Tasodifan ham ulanib qolmaydi.
 * ============================================================
 */

export type Davr = 'kun' | 'oy' | 'yil';

/** Har davr uchun nechta nuqta chiziladi */
export const DAVR_UZUNLIGI: Record<Davr, number> = {
  kun: 30,
  oy: 12,
  yil: 5,
};

/** URL dan kelgan matnni xavfsiz davr qiymatiga aylantiradi */
export function davrOqi(xom?: string | null): Davr {
  return xom === 'kun' || xom === 'yil' ? xom : 'oy';
}

export const DAVR_NOMI: Record<Davr, string> = {
  kun: 'Сўнгги 30 кун',
  oy: 'Сўнгги 12 ой',
  yil: 'Сўнгги 5 йил',
};

/** Bir nuqtaning nomi — «kun», «oy», «yil» */
export const DAVR_BIRLIGI: Record<Davr, string> = {
  kun: 'кун',
  oy: 'ой',
  yil: 'йил',
};

export interface VoronkaBosqichi {
  holati: IshsizHolati;
  soni: number;
  /** Bazadagi ishsizlar sonidan foizi */
  foiz: number;
}

export interface MahallaQamrovi {
  id: string;
  nomi: string;
  nomiKirill: string;
  /** Svod jadvalidagi ishsizlar soni - maxraj */
  bazaIshsiz: number;
  /** Xatlovda aniqlangan ishsizlar */
  aniqlangan: number;
  joylashtirilgan: number;
  /** Aniqlanganlarning bazaga nisbati */
  qamrovFoizi: number;
  /** Joylashtirilganlarning bazaga nisbati */
  natijaFoizi: number;
  xatlovXonadon: number;
  bazaXonadon: number;
}
