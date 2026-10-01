/**
 * ============================================================
 *  ИШ БЕРУВЧИ ТУГМАЛАРИНИНГ БЕЛГИЛАРИ
 *
 *  ── Нега алоҳида файл ──
 *
 *  Тугмалар ЮБОРИШ пайтида қайта ясалади (`xabarnoma`), ва
 *  занжирнинг ўзи `ish-beruvchi` да. Иккови бир-бирини
 *  импорт қилса, модуллар ҳалқа ҳосил қиларди.
 *
 *  Белгилар эса шунчаки сатр — уларга ҳеч нарса керак эмас.
 * ============================================================
 */

export const BERUVCHI = {
  /** «Мен иш берувчиман» — рўйхатдан ўтиш */
  ROYXAT: 'b.royxat',
  /** «Мен ҳокимият ходимиман» — улаш кўрсатмаси */
  XODIM: 'b.xodim',
  BEKOR: 'b.bekor',
  /** Рўйхат маълумотини юбориш */
  YUBOR: 'b.yubor',
  MENYU: 'b.menyu',
  /** Янги эълон қўйиш */
  ELON: 'b.elon',
  /** Раҳбар: иш берувчини қабул қилиш ва рад этиш */
  QABUL: 'b.qabul',
  RAD: 'b.rad',
  /** Раҳбар: эълонни қабул қилиш ва рад этиш */
  ELON_QABUL: 'b.eq',
  ELON_RAD: 'b.er',
  /** Ish beruvchi: o'z e'lonlari */
  ELONLARIM: 'b.el',
  ELON_KOR: 'b.ev',
  ELON_YOPISH: 'b.ey',
  ELON_YOPISH_TASDIQ: 'b.ez',
  ELON_UZAYT: 'b.eu',
  ELON_QAYTA: 'b.eb',
  ELON_TAHRIR: 'b.et',
  /** Ish beruvchi: yo'llangan nomzod natijasi */
  YOL_SUHBAT: 'b.ys',
  YOL_QABUL: 'b.yq',
  YOL_RAD: 'b.yr',
} as const;
