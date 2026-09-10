import type { Rol } from '@prisma/client';

/**
 * ============================================================
 *  ROLGA QARAB MENYU
 *
 *  Menyu bitta joyda belgilanadi va sahifa qo'riqchilari ham shu
 *  ro'yxatga tayanadi. Ikki joyda alohida yozilsa, ertaga yangi
 *  sahifa qo'shilganda menyuda ko'rinmaydigan yoki aksincha,
 *  menyuda turib ochilmaydigan bo'lim paydo bo'ladi.
 * ============================================================
 */

export interface MenyuBandi {
  yol: string;
  nomi: string;
  /** Lucide ikonka nomi */
  ikonka: string;
  rollar: Rol[];
  /** Qisqacha tavsif - bosh sahifadagi kartochkada chiqadi */
  tavsif?: string;
}

export const MENYU: MenyuBandi[] = [
  {
    yol: '/xatlov',
    nomi: 'Xatlovlarim',
    ikonka: 'ClipboardList',
    rollar: ['YETTILIK'],
    tavsif: 'O‘zingiz kiritgan xonadonlar va tugallanmagan qoralamalar',
  },
  {
    yol: '/xatlov/yangi',
    nomi: 'Yangi xatlov',
    ikonka: 'HousePlus',
    rollar: ['YETTILIK', 'BANDLIK', 'ADMIN'],
    tavsif: 'Xonadonni xatlovdan o‘tkazish',
  },
  {
    yol: '/xonadonlar',
    nomi: 'Xonadonlar',
    ikonka: 'Houses',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    tavsif: 'Barcha mahallalar bo‘yicha xatlovlar',
  },
  {
    yol: '/ishsizlar',
    nomi: 'Ishsizlar',
    ikonka: 'Users',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    tavsif: 'Suhbat, taklif va joylashtirish',
  },
  {
    yol: '/bandlik',
    nomi: 'Operatsion panel',
    ikonka: 'Target',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    tavsif: 'Navbat, moslashtirish, kurs talabi',
  },
  {
    yol: '/ish-orinlari',
    nomi: 'Bo‘sh ish o‘rinlari',
    ikonka: 'Briefcase',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    tavsif: 'Korxonalardagi bo‘sh o‘rinlar reestri',
  },
  {
    yol: '/chora-tadbirlar',
    nomi: 'Chora-tadbirlar',
    ikonka: 'ListChecks',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'],
    tavsif: 'Topshiriqlar, mas’ullar va muddatlar',
  },
  {
    yol: '/panel',
    nomi: 'Tahlil paneli',
    ikonka: 'ChartColumn',
    rollar: ['HOKIM', 'BANDLIK_RAHBAR', 'ADMIN'],
    tavsif: 'Qamrov, reyting va tavsiyalar',
  },
  {
    yol: '/admin',
    nomi: 'Boshqaruv',
    ikonka: 'Settings',
    rollar: ['ADMIN'],
    tavsif: 'Xodimlar, loginlar va audit jurnali',
  },
];

/** Rolga tegishli menyu bandlari */
export function menyuOl(rol: Rol): MenyuBandi[] {
  return MENYU.filter((b) => b.rollar.includes(rol));
}

/**
 * Rol uchun bosh sahifa.
 *
 * Har rol o'zi eng ko'p ishlatadigan sahifaga tushadi: yettilik
 * a'zosi xatlovga, hokim tahlil paneliga. Ular uchun boshqa
 * bo'limlarni oralab yurish ortiqcha qadam.
 */
export function boshSahifa(rol: Rol): string {
  switch (rol) {
    case 'YETTILIK':
      return '/xatlov';
    case 'BANDLIK':
      return '/bandlik';
    case 'BANDLIK_RAHBAR':
      return '/panel';
    case 'HOKIM':
      return '/panel';
    case 'ADMIN':
      return '/admin';
  }
}

/** Yo'lga kirish huquqi bormi */
export function yolgaRuxsat(rol: Rol, yol: string): boolean {
  const band = MENYU.filter((b) => yol === b.yol || yol.startsWith(`${b.yol}/`))
    // Eng aniq moslikni olamiz: "/xatlov/yangi" uchun "/xatlov" emas
    .sort((a, b) => b.yol.length - a.yol.length)[0];
  return band ? band.rollar.includes(rol) : false;
}

/** Rol nomi - o'zbekcha */
export const ROL_NOMI: Record<Rol, string> = {
  YETTILIK: 'Mahalla yettiligi a’zosi',
  BANDLIK: 'Bandlik markazi mutaxassisi',
  BANDLIK_RAHBAR: 'Bandlik markazi rahbari',
  HOKIM: 'Tuman rahbariyati',
  ADMIN: 'Administrator',
};
