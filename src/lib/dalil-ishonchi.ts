import type { DalilHolati, DalilManbasi, DalilTuri } from '@prisma/client';
import { MANBA_ISHONCHI, TASDIQ_SANALADIMI, type TasdiqDarajasi } from './dalil-nomlari';

/**
 * ============================================================
 *  ДАЛИЛГА ҚАНЧА ИШОНИШ МУМКИН
 *
 *  ── Қандай нуқсонни ёпади ──
 *
 *  Қўлда юкланган Excel кўчирмасидан келган ёзув ДАРҲОЛ
 *  «тасдиқланган» деб сақланарди:
 *
 *      dalilQoshish({ turi: 'REYESTR', tasdiqlangan: true })
 *
 *  Яъни ТАСДИҚЛАШ ҚАРОРИНИ чақирувчи код берарди. Файлни
 *  ким, қачон ва қаердан олганини тизим билмайди; уни
 *  таҳрирлаш ҳам, бошқаси билан алмаштириш ҳам мумкин.
 *
 *  Ҳокимликнинг энг муҳим рақами — «тасдиқланган
 *  жойлаштириш» — шу ёзувлардан ҳисобланади. Демак
 *  манбанинг ишончлилиги РАҚАМНИНГ ишончлилиги.
 *
 *  ── Қоида ──
 *
 *  Тасдиқлаш қарорини чақирувчи БЕРМАЙДИ. У МАНБАдан
 *  келиб чиқади ва битта жойда ёзилган:
 *
 *      фақат `RASMIY_INTEGRATSIYA` ўзи тасдиқ.
 *
 *  Қолган ҳамма нарса — қўлда юкланган кўчирма ҳам, шартнома
 *  нусхаси ҳам, ходимнинг гапи ҳам — ОДАМ кўзидан ўтади.
 *
 *  ── Нега бу файл базага уланмайди ──
 *
 *  Қоида соф функция бўлса, уни база қурмасдан синаш
 *  мумкин — ва у браузерда ҳам ишлайди.
 * ============================================================
 */

/** Манба ЎЗИ тасдиқ бўла оладими */
export function ozidanTasdiqmi(manba: DalilManbasi): boolean {
  return manba === 'RASMIY_INTEGRATSIYA';
}

/**
 * Далил турига қараб манбани тахмин қилиш.
 *
 * Эски йўллар ҳали `manbaTuri` юбормайди. Тахмин ҲАМИША
 * ЭҲТИЁТКОР томонга оғади: «расмий» деб тахмин қилинмайди,
 * акс ҳолда қоида ўзининг тешигини ясаган бўларди.
 */
export function manbaTuriTaxmin(turi: DalilTuri): DalilManbasi {
  switch (turi) {
    case 'REYESTR':
      return 'QOLDA_REYESTR';
    case 'MAHALLA':
      return 'XODIM_BILDIRDI';
    default:
      return 'QOLDA_HUJJAT';
  }
}

export interface DalilQisqasi {
  turi: DalilTuri;
  holati: DalilHolati;
  manbaTuri: DalilManbasi;
}

/**
 * ============================================================
 *  БИР ОДАМНИНГ (ёки бир ишнинг) ТАСДИҚ ДАРАЖАСИ
 *
 *  ── Нега битта «тасдиқланган» камлик қилди ──
 *
 *  Аввал жавоб иккита эди: тасдиқланган ёки йўқ. Ораликдаги
 *  УЧТА ҳар хил ҳол «йўқ» деб бир хил кўринарди:
 *
 *    · ходим «иш топди» деб белгилаган, ҳужжат йўқ;
 *    · ҳужжат киритилган, мутахассис ҳали қарамаган;
 *    · ҳужжат текширилган ва РАД ЭТИЛГАН.
 *
 *  Учинчиси биринчисидан ЁМОНРОҚ — «далил йўқ» эмас,
 *  «далил ёлғон чиқди» дегани. Улар бир хил кўринса, ҳоким
 *  иккисини ажратмайди ва рад этилган ёзув шунчаки
 *  «ҳужжат кутилмоқда» бўлиб ётаверади.
 *
 *  Тартиб: тасдиқланганлар аввал (кучлироғи биринчи), кейин
 *  кутилаётгани, кейин рад этилгани, охирида ходимнинг гапи.
 * ============================================================
 */
export function tasdiqDarajasi(dalillar: DalilQisqasi[]): TasdiqDarajasi {
  if (dalillar.length === 0) return 'DALILSIZ';

  const tasdiqlar = dalillar.filter((d) => d.holati === 'TASDIQLANDI');
  if (tasdiqlar.length > 0) {
    /*
     * Энг ишончли манба ҳисобга олинади. Битта расмий
     * тасдиқ ўнта қўлда тасдиқдан кучли, аксинчаси эмас.
     */
    const eng = tasdiqlar.reduce((a, b) =>
      MANBA_ISHONCHI[b.manbaTuri] > MANBA_ISHONCHI[a.manbaTuri] ? b : a
    );
    return ozidanTasdiqmi(eng.manbaTuri) ? 'RASMIY' : 'QOLDA_TASDIQ';
  }

  if (dalillar.some((d) => d.holati === 'KIRITILDI' && d.manbaTuri !== 'XODIM_BILDIRDI')) {
    return 'KUTILMOQDA';
  }

  if (dalillar.some((d) => d.holati === 'RAD_ETILDI')) return 'RAD_ETILGAN';

  /*
   * Қолгани — ходимнинг гапи. У ДАЛИЛ эмас, ХАБАР: «шу
   * одамга қараб кўринг» дегани.
   */
  if (dalillar.some((d) => d.manbaTuri === 'XODIM_BILDIRDI')) return 'FAQAT_XODIM';

  return 'DALILSIZ';
}

/** Даража ҳисобда «тасдиқланган» бўлиб саналадими */
export function tasdiqSanaladimi(daraja: TasdiqDarajasi): boolean {
  return TASDIQ_SANALADIMI[daraja];
}
