import type { RozilikUsuli, YollanmaHolati } from '@prisma/client';

/**
 * Yo'llanma: ekranda ko'rinadigan nomlar va konstantalar (brauzerga xavfsiz -
 * bazaga ulanmaydi; qarang: `oila-rejasi-nomlari.ts`).
 */

/** Ish beruvchiga yuborilishi mumkin bo'lgan maydonlar - boshqasi YO'Q */
export const ULASHILADIGAN = ['fish', 'telefon', 'kasb'] as const;
export type Ulashiladi = (typeof ULASHILADIGAN)[number];

export const YOLLANMA_NOMI: Record<YollanmaHolati, string> = {
  YOLLANDI: 'Йўлланди',
  SUHBAT_BELGILANDI: 'Суҳбат белгиланди',
  SUHBAT_OTKAZILDI: 'Суҳбат ўтказилди',
  ISHGA_QABUL: 'Ишга қабул қилинди (иш берувчи билдирган)',
  ISH_BERUVCHI_RAD: 'Иш берувчи мос деб топмади',
  FUQARO_RAD: 'Фуқаро воз кечди',
  BEKOR: 'Бекор қилинди',
};

export const ROZILIK_NOMI: Record<RozilikUsuli, string> = {
  OGZAKI: 'Оғзаки (юзма-юз)',
  TELEFON: 'Телефон орқали',
  YOZMA: 'Ёзма',
};

