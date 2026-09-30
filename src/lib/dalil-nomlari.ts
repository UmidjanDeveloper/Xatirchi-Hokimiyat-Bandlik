import type {
  DalilHolati,
  DalilManbasi,
  DalilMaqsadi,
  DalilTuri,
  JoylashuvVoqeaHolati,
} from '@prisma/client';

/**
 * ============================================================
 *  ДАЛИЛ НОМЛАРИ — БРАУЗЕР УЧУН ҲАМ
 *
 *  ── Нега алоҳида файл ──
 *
 *  Бу номлар ЭКРАНДА кўринади, яъни браузердаги компонентга
 *  керак. `joylashuv-dalili` эса базага уланади.
 *
 *  Иккови битта файлда турганда, «use client» компоненти уни
 *  импорт қилиши билан Prisma браузер тўпламига тушиб
 *  қоларди. Бу шунчаки оғирлик эмас: база уланиш сатри ҳам
 *  ўша тўпламга кириб кетиши мумкин.
 *
 *  Шунинг учун номлар ҳеч нарсага уланмайдиган алоҳида
 *  файлда.
 * ============================================================
 */

export const DALIL_NOMI: Record<DalilTuri, string> = {
  REYESTR: 'Давлат реестри',
  SHARTNOMA: 'Меҳнат шартномаси',
  BUYRUQ: 'Ишга қабул буйруғи',
  ISH_BERUVCHI: 'Иш берувчи тасдиғи',
  MAHALLA: 'Маҳалла ходими кўрди',
};

export const DALIL_HOLATI_NOMI: Record<DalilHolati, string> = {
  KIRITILDI: 'Текширилмаган',
  TASDIQLANDI: 'Тасдиқланди',
  RAD_ETILDI: 'Рад этилди',
};

/**
 * Далилнинг кучи — катта рақам кучлироқ.
 *
 * Битта одамда бир нечта далил бўлса, экранда ЭНГ КУЧЛИСИ
 * турибди.
 */
export const DALIL_KUCHI: Record<DalilTuri, number> = {
  REYESTR: 5,
  SHARTNOMA: 4,
  BUYRUQ: 3,
  ISH_BERUVCHI: 2,
  MAHALLA: 1,
};

/**
 * ============================================================
 *  ДАЛИЛ ҚАЕРДАН КЕЛГАН
 *
 *  Аввал экранда фақат далилнинг ТУРИ кўринарди: «Давлат
 *  реестри». Аммо ўша реестр ёзуви қўлда юкланган Excel дан
 *  ҳам, текширилган интеграциядан ҳам келиши мумкин — экранда
 *  эса иккови БИР ХИЛ кўринарди.
 *
 *  Ҳоким «тасдиқланган» сўзини ўқиганда нимага ишонаётганини
 *  билиши керак.
 * ============================================================
 */
export const DALIL_MANBASI_NOMI: Record<DalilManbasi, string> = {
  XODIM_BILDIRDI: 'Ходим билдирди',
  QOLDA_HUJJAT: 'Қўлда киритилган ҳужжат',
  QOLDA_REYESTR: 'Қўлда юкланган кўчирма',
  RASMIY_INTEGRATSIYA: 'Расмий интеграция',
};

/**
 * Манбанинг ишонч даражаси — катта рақам ишончлироқ.
 *
 * Фақат энг юқориси ЎЗИ тасдиқ бўла олади; қолганини одам
 * текширади.
 */
export const MANBA_ISHONCHI: Record<DalilManbasi, number> = {
  XODIM_BILDIRDI: 1,
  QOLDA_HUJJAT: 2,
  QOLDA_REYESTR: 3,
  RASMIY_INTEGRATSIYA: 4,
};

/** Далил НИМАНИ исботлайди */
export const DALIL_MAQSADI_NOMI: Record<DalilMaqsadi, string> = {
  ISH_BOSHLAGANI: 'Иш бошлагани',
  HOZIR_ISHLAYOTGANI: 'Ҳамон ишлаётгани',
};

/** Ишга жойлашиш воқеасининг ҳолати */
export const JOYLASHISH_HOLATI_NOMI: Record<JoylashuvVoqeaHolati, string> = {
  ISHLAMOQDA: 'Ишлаб турибди',
  TUGADI: 'Иш тугаган',
  NOMALUM: 'Ҳолати текширилмаган',
};

/**
 * ============================================================
 *  ТАСДИҚ ДАРАЖАСИ — ЭКРАНДА БИТТА СЎЗ
 *
 *  «Тасдиқланган» ва «тасдиқланмаган» иккига бўлиш камлик
 *  қиларди. Ораликда УЧТА ҳар хил ҳол бор эди ва учови ҳам
 *  «тасдиқланмаган» деб бир хил кўринарди:
 *
 *    · ходим «иш топди» деб белгилаган, ҳужжат йўқ;
 *    · ҳужжат киритилган, мутахассис ҳали қарамаган;
 *    · ҳужжат текширилган ва РАД ЭТИЛГАН.
 *
 *  Учинчиси биринчисидан ЁМОНРОҚ: у «далил йўқ» эмас,
 *  «далил ёлғон чиқди» деган маънони беради. Улар бир хил
 *  кўринса, ҳоким иккисини ажратмайди.
 * ============================================================
 */
export type TasdiqDarajasi =
  | 'RASMIY'
  | 'QOLDA_TASDIQ'
  | 'KUTILMOQDA'
  | 'FAQAT_XODIM'
  | 'RAD_ETILGAN'
  | 'DALILSIZ';

export const TASDIQ_DARAJASI_NOMI: Record<TasdiqDarajasi, string> = {
  RASMIY: 'Расмий манба билан тасдиқланган',
  QOLDA_TASDIQ: 'Қўлда текширилиб тасдиқланган',
  KUTILMOQDA: 'Ҳужжат киритилган, текширилмаган',
  FAQAT_XODIM: 'Фақат ходим билдирган',
  RAD_ETILGAN: 'Далил рад этилган',
  DALILSIZ: 'Далил йўқ',
};

/** Даража ҳисобга «тасдиқланган» бўлиб кирадими */
export const TASDIQ_SANALADIMI: Record<TasdiqDarajasi, boolean> = {
  RASMIY: true,
  QOLDA_TASDIQ: true,
  KUTILMOQDA: false,
  FAQAT_XODIM: false,
  RAD_ETILGAN: false,
  DALILSIZ: false,
};
