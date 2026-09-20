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
}

export const MENYU: MenyuBandi[] = [
  {
    yol: '/xatlov',
    nomi: 'Хатловларим',
    ikonka: 'ClipboardList',
    rollar: ['YETTILIK'],
  },
  {
    yol: '/xatlov/yangi',
    nomi: 'Янги хатлов',
    ikonka: 'HousePlus',
    rollar: ['YETTILIK', 'BANDLIK', 'ADMIN'],
  },
  {
    yol: '/xonadonlar',
    nomi: 'Хонадонлар',
    ikonka: 'Houses',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    yol: '/ishsizlar',
    nomi: 'Ишсизлар',
    ikonka: 'Users',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    yol: '/bandlik',
    nomi: 'Операцион панел',
    ikonka: 'Target',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    yol: '/ish-orinlari',
    nomi: 'Бўш иш ўринлари',
    ikonka: 'Briefcase',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    yol: '/chora-tadbirlar',
    nomi: 'Чора-тадбирлар',
    ikonka: 'ListChecks',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'],
  },
  {
    yol: '/panel',
    nomi: 'Таҳлил панели',
    ikonka: 'ChartColumn',
    rollar: ['HOKIM', 'BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    /*
     * Bandlik rahbari uchun - faqat mahalla hisoblari.
     * Administrator ham ko'radi, lekin unga to'liq `/admin`
     * paneli bor, shuning uchun bu yerda foydasi kam.
     */
    yol: '/mahalla-xodimlari',
    nomi: 'Маҳалла ходимлари',
    ikonka: 'UsersRound',
    rollar: ['BANDLIK_RAHBAR'],
  },
  {
    /*
     * «Ўчирилганлар» — хатони ҚИЛГАН одам уни ЎЗИ тузатсин.
     *
     * Маҳалла ходими адашиб ўчирса, администраторга қўнғироқ
     * қилиб, тушунтириб, кутиб ўтирмасин: шу ердан бир босишда
     * қайтаради. Ҳоким кирмайди — унинг роли кўриш.
     */
    yol: '/ochirilganlar',
    nomi: 'Ўчирилганлар',
    ikonka: 'Archive',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    yol: '/admin',
    nomi: 'Бошқарув',
    ikonka: 'Settings',
    rollar: ['ADMIN'],
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

/**
 * Rol nomlari kirillda - butun ilova bir alifboda.
 *
 * Menyu lotinda, sahifa matni kirillda bo'lsa, bitta ekranda ikki
 * alifbo aralashadi va bu qorishiq ko'rinadi. Manba hujjatlarning
 * hammasi kirill, shuning uchun asos alifbo ham kirill.
 */
export const ROL_NOMI: Record<Rol, string> = {
  YETTILIK: 'Маҳалла еттилиги аъзоси',
  BANDLIK: 'Бандлик маркази мутахассиси',
  BANDLIK_RAHBAR: 'Бандлик маркази раҳбари',
  HOKIM: 'Туман раҳбарияти',
  ADMIN: 'Администратор',
};
