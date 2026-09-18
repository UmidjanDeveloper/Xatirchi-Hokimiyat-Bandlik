import { MASUL_TASHKILOT } from './constants';

/**
 * ============================================================
 *  МАСЪУЛ ТАШКИЛОТ НОМИНИ БИР ХИЛЛАШТИРИШ
 *
 *  ── Нега керак бўлди ──
 *
 *  Кечиккан топшириқлар кесими `groupBy('masulTashkilot')`
 *  билан ҳисобланади — яъни МАТН бўйича гуруҳланади. Матн эса
 *  эркин эди.
 *
 *  Натижада базада шундай турарди:
 *
 *      Xalq ta’limi     — 12 та
 *      Ta'lim bo'limi   —  3 та
 *
 *  Битта бўлим, иккита қатор. Ҳоким панелда «халқ таълимида 12
 *  та кечикиш» деб кўради, аслида 15 та. Хатловлар кўпайгани
 *  сайин бу қаторлар ҳам кўпаяверарди ва кесим маъносини
 *  йўқотарди.
 *
 *  ── Нега база enum эмас ──
 *
 *  Prisma enum га ўтказилса, базадаги мос келмайдиган ҳар бир
 *  эски қатор миграцияни ЙИҚИТАРДИ — ишлаб турган тизимда, иш
 *  куни ўртасида. Шунинг учун матн қолди, аммо ЁЗИШДА
 *  бир хиллаштирилади: янгиси ҳеч қачон бузуқ тушмайди, эскиси
 *  эса бир мартада тўғриланади.
 *
 *  ── Танилмаган ном нима бўлади ──
 *
 *  «Бошқа» га тушади. Йўқотилмайди: ҳоким уни кўради ва керак
 *  бўлса рўйхатга янгисини қўшади. Жимгина ташлаб юборилса,
 *  топшириқ эгасиз қоларди.
 * ============================================================
 */

/** Рўйхатда йўқ ташкилотлар шу ерга йиғилади */
export const TASHKILOT_BOSHQA = 'Boshqa';

/** Таққослаш учун: фақат ҳарф ва рақам, кичик ҳарфда */
function kalit(xom: string): string {
  return xom
    .toLowerCase()
    .replace(/[‘’`ʻʼ']/g, '')
    .replace(/[^a-zа-яё0-9]/gi, '');
}

/**
 * Бир хил бўлимнинг турли номланиши.
 *
 * Чап томон — даладан келиши мумкин бўлган ёзув, ўнг томон —
 * `MASUL_TASHKILOT` даги расмий қиймат.
 */
const SINONIM: [string, string][] = [
  ['talimbolimi', 'Xalq ta’limi'],
  ['xalqtalimibolimi', 'Xalq ta’limi'],
  ['maktab', 'Xalq ta’limi'],
  ['bandlik', 'Bandlik markazi'],
  ['bandlikkakomaklashishmarkazi', 'Bandlik markazi'],
  ['mehnatbolimi', 'Bandlik markazi'],
  ['kasbhunar', 'Kasb-hunar markazi'],
  ['kasbhunargaoqitishmarkazi', 'Kasb-hunar markazi'],
  ['ijtimoiyhimoyabolimi', 'Ijtimoiy himoya'],
  ['nogironlarjamiyati', 'Ijtimoiy himoya'],
  ['sogliqnisaqlashbolimi', 'Sog‘liqni saqlash'],
  ['tibbiyot', 'Sog‘liqni saqlash'],
  ['shifoxona', 'Sog‘liqni saqlash'],
  ['hokimlik', 'Tuman hokimligi'],
  ['tumanhokimiyati', 'Tuman hokimligi'],
  ['mahalla', 'Mahalla raisi'],
  ['mahallaraisi', 'Mahalla raisi'],
  ['banklar', 'Bank'],
  ['soliq', 'Soliq bo‘limi'],
  ['qishloqxojaligi', 'Qishloq xo‘jaligi bo‘limi'],
  ['yoshlarittifoqi', 'Yoshlar ishlari agentligi'],
  ['yoshlar', 'Yoshlar ishlari agentligi'],
  ['xotinqizlar', 'Xotin-qizlar qo‘mitasi'],
];

/** Калит → расмий қиймат */
const XARITA: Map<string, string> = (() => {
  const m = new Map<string, string>();
  /* Расмий рўйхат — ҳам лотинчаси, ҳам кириллчаси бўйича */
  for (const t of MASUL_TASHKILOT) {
    m.set(kalit(t.qiymat), t.qiymat);
    m.set(kalit(t.kirill), t.qiymat);
  }
  /* Синонимлар расмийни ҚОПЛАМАЙДИ — фақат бўшини тўлдиради */
  for (const [xom, rasmiy] of SINONIM) {
    if (!m.has(xom)) m.set(xom, rasmiy);
  }
  return m;
})();

/**
 * Ташкилот номини расмий рўйхатдаги қийматга келтиради.
 *
 * Танилмаса — `'Boshqa'`.
 */
export function tashkilotNormal(xom: string | null | undefined): string {
  if (!xom?.trim()) return TASHKILOT_BOSHQA;

  const k = kalit(xom);
  const topildi = XARITA.get(k);
  if (topildi) return topildi;

  /*
   * Тўлиқ мос келмаса — ичида турганини қидирамиз. «Халқ
   * таълими бўлими Хатирчи тумани» каби узун ёзувлар айнан шу
   * ерда тутилади.
   */
  for (const [kal, rasmiy] of XARITA) {
    if (kal.length >= 5 && (k.includes(kal) || kal.includes(k))) return rasmiy;
  }

  return TASHKILOT_BOSHQA;
}

/** Расмий рўйхатдаги қийматми (`'Boshqa'` ҳам ҳисобланади) */
export function tashkilotTanilganmi(qiymat: string): boolean {
  return qiymat === TASHKILOT_BOSHQA || MASUL_TASHKILOT.some((t) => t.qiymat === qiymat);
}
