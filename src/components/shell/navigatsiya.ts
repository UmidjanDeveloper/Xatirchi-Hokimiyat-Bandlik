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

/**
 * Menyu guruhlari. Uzun menyuda (administratorda 20 tagacha band) bandlar
 * ma'no bo'yicha guruhlanadi va sarlavha bilan ajratiladi: "Tahlil paneli"
 * bilan "Operatsion panel" fuqaro ro'yxatlari orasida adashib yurmasin.
 */
export type MenyuGuruhi = 'bosh' | 'panel' | 'ish' | 'fuqaro' | 'xizmat' | 'boshqaruv';

export interface MenyuBandi {
  yol: string;
  nomi: string;
  /** Lucide ikonka nomi */
  ikonka: string;
  rollar: Rol[];
  guruh: MenyuGuruhi;
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
    guruh: 'bosh',
  },
  {
    yol: '/xatlov',
    nomi: 'Хатловларим',
    ikonka: 'ClipboardList',
    rollar: ['YETTILIK'],
    guruh: 'ish',
  },
  {
    yol: '/xatlov/yangi',
    nomi: 'Янги хатлов',
    ikonka: 'HousePlus',
    rollar: ['YETTILIK', 'BANDLIK', 'ADMIN'],
    guruh: 'ish',
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
    guruh: 'fuqaro',
  },
  {
    yol: '/ishsizlar',
    nomi: 'Ишсизлар',
    ikonka: 'Users',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    guruh: 'fuqaro',
  },
  {
    /* 30/60/90 kunlik kuzatuv - bandlik markazining ishi */
    yol: '/kuzatuv',
    nomi: 'Кузатув 30/60/90',
    ikonka: 'CalendarCheck',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    guruh: 'fuqaro',
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
    guruh: 'xizmat',
  },
  {
    /*
     * Mahalliy buyurtmalar (pilot): fuqaroning xizmat takliflari va
     * buyurtmalar. Faqat xodim ko'radi; hokimga ko'rsatilmaydi (fuqaro
     * ismi va telefoni bor). Platforma to'lovni yuritmaydi.
     */
    yol: '/buyurtmalar',
    nomi: 'Маҳаллий буюртмалар',
    ikonka: 'HandHelping',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    guruh: 'xizmat',
  },
  {
    /*
     * Murojaatlar: fuqaro o'zi yozmaydi - xodim qayd etadi. Mahalla xodimi
     * faqat o'z mahallasini ko'radi; hokimga ko'rsatilmaydi (fuqaro ismi,
     * telefoni va shikoyati bor).
     */
    yol: '/murojaatlar',
    nomi: 'Мурожаатлар',
    ikonka: 'MessageSquareText',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    guruh: 'ish',
  },
  {
    /*
     * Yordam dasturlari katalogi: shaxsiy ma'lumot yo'q, shuning uchun hokim
     * ham ko'radi. Katalogni faqat bandlik markazi yuritadi (API da ham).
     */
    yol: '/yordam',
    nomi: 'Ёрдам дастурлари',
    ikonka: 'LifeBuoy',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'],
    guruh: 'xizmat',
  },
  {
    yol: '/bandlik',
    nomi: 'Операцион панел',
    ikonka: 'Target',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    guruh: 'panel',
  },
  {
    yol: '/ish-orinlari',
    nomi: 'Бўш иш ўринлари',
    ikonka: 'Briefcase',
    rollar: ['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'],
    guruh: 'xizmat',
  },
  {
    yol: '/chora-tadbirlar',
    nomi: 'Чора-тадбирлар',
    ikonka: 'ListChecks',
    rollar: ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'],
    guruh: 'ish',
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
    guruh: 'fuqaro',
  },
  {
    yol: '/panel',
    nomi: 'Таҳлил панели',
    ikonka: 'ChartColumn',
    rollar: ['HOKIM', 'BANDLIK_RAHBAR', 'ADMIN'],
    guruh: 'panel',
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
    guruh: 'boshqaruv',
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
    guruh: 'fuqaro',
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
    guruh: 'xizmat',
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
    guruh: 'panel',
  },
  {
    /*
     * «Ходимлар ва панеллар» — одамлар бир жойда.
     *
     * Илгари ходимлар рўйхати «Бошқарув» саҳифасининг ўртасида, олтита
     * бошқа блокдан кейин турарди: 70 та маҳалла ходимининг логини ва
     * паролини, ҳоким ва раҳбар ҳисобини шу ердан излаб топиш қийин
     * эди. Энди улар алоҳида саҳифада: рол бўйича карточкалар (нечта
     * ҳисоб бор, панелини «кўзи билан» кўриш), рол бўйича фильтр ва
     * логин/парол рўйхати.
     */
    yol: '/xodimlar',
    nomi: 'Ходимлар ва панеллар',
    ikonka: 'UserCog',
    rollar: ['ADMIN'],
    guruh: 'boshqaruv',
  },
  {
    yol: '/admin',
    nomi: 'Бошқарув',
    ikonka: 'Settings',
    rollar: ['ADMIN'],
    guruh: 'boshqaruv',
  },
  {
    /*
     * Тизим ҳолати: автоматик ишлар, хабарлар навбати, хато журнали,
     * заҳира синови. Фақат администратор — журналда техник маълумот бор.
     */
    yol: '/tizim',
    nomi: 'Тизим ҳолати',
    ikonka: 'Activity',
    rollar: ['ADMIN'],
    guruh: 'boshqaruv',
  },
];

/** Rolga tegishli menyu bandlari */
export function menyuOl(rol: Rol): MenyuBandi[] {
  return MENYU.filter((b) => b.rollar.includes(rol));
}

/** Guruh sarlavhalari (kirillda: butun ilova bitta alifbodan o'giriladi) */
export const GURUH_NOMI: Record<MenyuGuruhi, string | null> = {
  bosh: null,
  panel: 'Панеллар ва ҳисобот',
  ish: 'Кундалик иш',
  fuqaro: 'Фуқаро ва хонадон',
  xizmat: 'Бандлик ва хизматлар',
  boshqaruv: 'Бошқарув',
};

/** Guruhlarning ekrandagi tartibi */
export const GURUH_TARTIBI: readonly MenyuGuruhi[] = ['bosh', 'panel', 'ish', 'fuqaro', 'xizmat', 'boshqaruv'];

/**
 * Shundan ko'p band bo'lgan menyuda sarlavhalar chiqadi. Qisqa menyu
 * (mahalla xodimi - 10, hokim - 5) o'zgarmaydi: 70 ta xodim shu tartibga
 * o'rganib qolgan va unga sarlavha kerak emas.
 */
export const GURUH_CHEGARASI = 11;

export interface MenyuGuruhiBandlari {
  guruh: MenyuGuruhi;
  /** `null` - sarlavhasiz (qisqa menyu yoki birinchi band) */
  nomi: string | null;
  bandlar: MenyuBandi[];
}

/**
 * Rolning menyusi sarlavhali guruhlar bilan.
 *
 * Qisqa menyuda bitta sarlavhasiz guruh qaytadi va bandlar `MENYU`
 * tartibida qoladi. Uzun menyuda bandlar guruhlarga bo'linadi; guruh
 * ichida tartib `MENYU` dagi tartib.
 */
export function menyuGuruhlari(rol: Rol): MenyuGuruhiBandlari[] {
  const bandlar = menyuOl(rol);
  if (bandlar.length <= GURUH_CHEGARASI) return [{ guruh: 'bosh', nomi: null, bandlar }];
  return GURUH_TARTIBI.map((g) => ({
    guruh: g,
    nomi: GURUH_NOMI[g],
    bandlar: bandlar.filter((b) => b.guruh === g),
  })).filter((g) => g.bandlar.length > 0);
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
