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

/**
 * Мундарижа ЁН МЕНЮНИНГ ичига, «Таҳлил панели» банди тагига
 * тушади — саҳифанинг ўз устунига эмас.
 *
 * Ҳоким мундарижани айнан ўша тугмани босгандан кейин, ўша
 * жойдан кутади: бошқа ерда чиққани «бу яна бир бошқа нарса»
 * бўлиб кўринарди.
 *
 * Иккита файл битта `id` га таянгани учун у шу ерда,
 * менюнинг ўзи белгиланадиган жойда турибди. Матн сифатида
 * икки жойга ёзилса, биттаси ўзгарганда мундарижа жим
 * йўқоларди.
 */
export const MUNDARIJA_UYASI = 'mundarija-uyasi';

/** Мундарижа тагига тушадиган банд */
export const MUNDARIJA_YOLI = '/panel';

export const MENYU: MenyuBandi[] = [
  {
    /*
     * ── ВАЗИФАЛАР — МЕНЮНИНГ БИРИНЧИ БАНДИ ──
     *
     * Ходим эрталаб тизимга кирганда «мен нима қилишим
     * керак» деган саволга жавоб ололмасди: таҳлил панели
     * САВОЛГА жавоб берарди, ВАЗИФАни кўрсатмасди.
     *
     * Шунинг учун у энг тепада ва БАРЧА ролга очиқ — ҳар
     * рол ўз ишини кўради.
     *
     * Бошланғич саҳифалар ЎЗГАРМАДИ: хатлов кетмоқда ва
     * 70 та ходим `/xatlov` дан бошлашга ўрганган.
     */
    yol: '/vazifalar',
    nomi: 'Вазифаларим',
    ikonka: 'ListTodo',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'],
  },
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
    /*
     * Avval `Houses` edi — o'rnatilgan lucide-react (0.454) da
     * bunday ikonka YO'Q. Ikonkani nom bo'yicha izlash uni
     * jimgina oddiy aylanaga almashtirib qo'ygan va hech kim
     * sezmagan. `scripts/tezlik-sinov.ts` endi har nomni
     * kutubxonaning o'zida tekshiradi.
     */
    ikonka: 'House',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    yol: '/ishsizlar',
    nomi: 'Ишсизлар',
    ikonka: 'Users',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    /* 30/60/90 kunlik kuzatuv - bandlik markazining ishi */
    yol: '/kuzatuv',
    nomi: 'Кузатув 30/60/90',
    ikonka: 'CalendarCheck',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    /*
     * Kasb-hunar kurslari katalogi va fuqarolarning kursdagi yo'li. Kursni
     * bandlik markazi yuritadi; mahalla xodimi ko'radi va o'z fuqarosini
     * yozadi. Hokimga ko'rsatilmaydi: u yerda fuqaro ismlari bor.
     */
    yol: '/kurslar',
    nomi: 'Курслар',
    ikonka: 'GraduationCap',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
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
    /*
     * Oilaviy rivojlanish rejalari. Hokimga ko'rsatilmaydi: reja
     * oilaning shaxsiy ma'lumotini va xodim yozgan fikrini o'z ichiga
     * oladi, hokim esa faqat jamlangan tahlilni ko'radi.
     */
    yol: '/rejalar',
    nomi: 'Оила режалари',
    ikonka: 'Route',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
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
    /*
     * «Иш берувчилар» — занжирнинг ЭНГ БОШИ.
     *
     * Модерация аввал фақат ботда эди. Бугун 78 та ходимдан
     * 70 таси ботга уланмаган — ва раҳбар ҳам уланмаган
     * бўлса, ариза жимгина навбатда қоларди.
     *
     * Ҳоким кирмайди: тасдиқлаш бандлик марказининг вазифаси,
     * ҳокимга эса сон брифингда келади.
     */
    yol: '/ish-beruvchilar',
    nomi: 'Иш берувчилар',
    ikonka: 'Building2',
    rollar: ['BANDLIK_RAHBAR', 'ADMIN'],
  },
  {
    /*
     * «Тасдиқлаш» — рақамни ТЕКШИРАДИГАН саҳифа.
     *
     * Ҳоким ҳам киради: унга ёзиш керак эмас, аммо «19 тадан
     * нечтаси ҳужжат билан тасдиқланган» деган саволга жавоб
     * айнан унга керак.
     *
     * Маҳалла ходими кирмайди: кўчирмада бутун туман бўйича
     * бегона фуқароларнинг исми бор.
     */
    yol: '/reyestr',
    nomi: 'Тасдиқлаш',
    ikonka: 'BadgeCheck',
    rollar: ['BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'],
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
