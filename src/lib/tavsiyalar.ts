import { MASUL_TASHKILOT, MABLAG_YONALISHI, itYonalishimi, kirillcha } from './constants';
import type { TahlilNatijasi } from './tahlil';

/**
 * ============================================================
 *  TAVSIYALAR MOTORI
 *
 *  Diagrammalar "nima bo'lyapti" deydi, bu modul "endi nima
 *  qilish kerak" deydi.
 *
 *  Qat'iy qoida: HAR BIR TAVSIYA RAQAMLI DALIL BILAN chiqadi.
 *  "Xatlovni tezlashtirish kerak" - bu maslahat emas, quruq gap.
 *  "Uyshun MFY: ro'yxatdagi 51 ta ishsizdan 12 tasi xatlovdan
 *  o'tgan (24%)" - bu esa tekshirib bo'ladigan, bahslashib
 *  bo'ladigan va ish qilib bo'ladigan gap.
 *
 *  Tavsiya yo'q bo'lsa - bo'sh ro'yxat qaytadi. Sun'iy tavsiya
 *  o'ylab topilmaydi: bir marta "shunchaki to'ldirish uchun"
 *  yozilgan tavsiya butun panelga bo'lgan ishonchni yo'qotadi.
 * ============================================================
 */

export type TavsiyaDarajasi = 'shoshilinch' | 'muhim' | 'imkoniyat';

export interface Tavsiya {
  daraja: TavsiyaDarajasi;
  sarlavha: string;
  /** Raqamli dalil - tavsiyaning asosi */
  dalil: string;
  /** Qaysi bo'limga o'tish kerak */
  yol?: string;
}

/** Kurs ochish uchun eng kam talab */
const KURS_CHEGARASI = 15;

/** Qamrov shundan past bo'lsa - orqada qolgan mahalla */
const QAMROV_CHEGARASI = 50;

/** Joylashtirish natijasi shundan past bo'lsa - natija yo'q */
const NATIJA_CHEGARASI = 10;

const mlrd = (som: number) =>
  som >= 1_000_000_000
    ? `${(som / 1_000_000_000).toFixed(1)} млрд сўм`
    : `${Math.round(som / 1_000_000)} млн сўм`;

export function tavsiyalarniHisobla(t: TahlilNatijasi): Tavsiya[] {
  const royxat: Tavsiya[] = [];

  // ── 1. Kechikkan topshiriqlar ──
  //
  // Eng shoshilinch, chunki bu allaqachon berilgan va bajarilmagan
  // majburiyat - yangi ish emas, aytilgan ishning uzilishi.
  for (const k of t.kechikkanlar.slice(0, 3)) {
    if (k.soni < 3) continue;
    royxat.push({
      daraja: 'shoshilinch',
      sarlavha: `${kirillcha(MASUL_TASHKILOT, k.tashkilot)} — муддати ўтган топшириқлар`,
      dalil: `${k.soni} та топшириқнинг бажарилиш муддати ўтган.`,
      yol: `/chora-tadbirlar?holati=KECHIKDI&tashkilot=${encodeURIComponent(k.tashkilot)}`,
    });
  }

  // ── 2. Xatlov qamrovi past mahallalar ──
  const orqadagilar = t.qamrov
    .filter((m) => m.bazaIshsiz >= 20 && m.qamrovFoizi < QAMROV_CHEGARASI)
    .sort((a, b) => a.qamrovFoizi - b.qamrovFoizi)
    .slice(0, 3);

  for (const m of orqadagilar) {
    royxat.push({
      daraja: 'muhim',
      sarlavha: `${m.nomiKirill} МФЙ — хатлов орқада`,
      dalil: `Рўйхатдаги ${m.bazaIshsiz} та ишсиздан ${m.aniqlangan} таси хатловдан ўтган (${m.qamrovFoizi}%). Қолган ${m.bazaIshsiz - m.aniqlangan} таси ҳали кўрилмаган.`,
      yol: `/xonadonlar?mahalla=${m.id}`,
    });
  }

  // ── 3. Aniqlangan, lekin natijasiz mahallalar ──
  //
  // Bu qamrovdan boshqa muammo: xatlov qilingan, ishsizlar
  // ro'yxatga olingan, lekin ular bilan ish boshlanmagan.
  const natijasizlar = t.qamrov
    .filter((m) => m.aniqlangan >= 15 && m.natijaFoizi < NATIJA_CHEGARASI)
    .sort((a, b) => b.aniqlangan - a.aniqlangan)
    .slice(0, 3);

  for (const m of natijasizlar) {
    royxat.push({
      daraja: 'muhim',
      sarlavha: `${m.nomiKirill} МФЙ — аниқланган, лекин иш бошланмаган`,
      dalil: `${m.aniqlangan} та ишсиз аниқланган, лекин фақат ${m.joylashtirilgan} таси жойлаштирилган (${m.natijaFoizi}%).`,
      yol: `/ishsizlar?mahalla=${m.id}`,
    });
  }

  // ── 4. Kurs ochish imkoniyati ──
  for (const k of t.kursTalabi.filter((x) => x.soni >= KURS_CHEGARASI).slice(0, 4)) {
    royxat.push({
      daraja: 'imkoniyat',
      sarlavha: `«${k.kasb}» курсини очиш`,
      dalil: `${k.soni} та фуқаро айнан шу касбни ўрганиш истагини билдирган — гуруҳ тўлади.`,
      yol: '/bandlik',
    });
  }

  /*
   * ── 4b. IT йўналиши — IT-шаҳарчага йўналтириш ──
   *
   * IT ни бошқа касблардан АЖРАТИБ кўрсатамиз, чунки йўли
   * бошқа: касб-ҳунар курси туманда очилади ва маҳаллий иш
   * ўрнига олиб боради; IT эса масофадан ишлаш ёки IT-шаҳарча
   * дастури орқали бошқа шаҳарда банд бўлишга олиб боради.
   * Иккисини битта рўйхатда қўшсак, IT талабгорлари «курс
   * гуруҳи тўлмади» деб четда қолиб кетарди — амалда эса
   * уларни ҳозир йўналтириш мумкин.
   *
   * Чегара ҳам пастроқ: IT-шаҳарчага юбориш учун гуруҳ тўлиши
   * шарт эмас, битта одамни ҳам йўналтириш мумкин.
   */
  /*
   * Сўзлар рўйхати `constants.ts` да — хатлов формаси ҲАМ
   * шундан фойдаланади. Иккови алоҳида ёзилса, формада ваучер
   * таклиф қилинмаган одам ҳисоботда IT талабгори бўлиб чиқади.
   */
  const itTalabi = t.kursTalabi
    .filter((k) => itYonalishimi(k.kasb))
    .reduce((s, k) => s + k.soni, 0);

  if (itTalabi >= 3) {
    royxat.push({
      daraja: 'imkoniyat',
      sarlavha: 'IT йўналиши — IT-шаҳарчага йўналтириш',
      dalil: `${itTalabi} та фуқаро ахборот технологиялари йўналишини ўрганиш истагини билдирган. Уларни туманда курс кутишга қолдирмасдан IT-шаҳарча дастурига йўналтириш мумкин: бандлик маркази рўйхатни тузиб, вилоят бўлимига юборади.`,
      yol: '/ishsizlar?q=dastur',
    });
  }

  // ── 5. Byudjet talabi ──
  //
  // Hokim uchun bu tavsiya emas, REJA MA'LUMOTI: keyingi yil
  // byudjetiga qancha va qaysi yo'nalishga kerakligini aytadi.
  if (t.jamiTalab > 0 && t.byudjet.length > 0) {
    const eng = t.byudjet[0];
    royxat.push({
      daraja: 'imkoniyat',
      sarlavha: 'Кредит-субсидия талаби — бюджет режаси учун',
      dalil: `Жами ${mlrd(t.jamiTalab)} талаб қилинган. Энг катта йўналиш — ${kirillcha(
        MABLAG_YONALISHI,
        eng.yonalish
      )}: ${mlrd(eng.summa)} (${eng.oila} та оила).`,
    });
  }

  // ── 6. Suhbat navbati ──
  const suhbatsiz = t.voronka[0].soni - t.voronka[1].soni;
  if (suhbatsiz >= 20) {
    royxat.push({
      daraja: 'muhim',
      sarlavha: 'Суҳбат навбати тўпланиб қолган',
      dalil: `${suhbatsiz} та фуқаро хатловда аниқланган, лекин ҳали суҳбатдан ўтмаган.`,
      yol: '/ishsizlar?holati=ANIQLANDI',
    });
  }

  // ── 7. Rad etganlar ──
  //
  // Rad etish o'z-o'zidan muammo emas, lekin ulushi katta bo'lsa
  // takliflar fuqarolarga to'g'ri kelmayotganini bildiradi.
  if (t.jami.aniqlangan >= 50) {
    const radFoizi = Math.round((t.jami.radEtgan / t.jami.aniqlangan) * 100);
    if (radFoizi >= 20) {
      royxat.push({
        daraja: 'muhim',
        sarlavha: 'Рад этишлар улуши юқори',
        dalil: `${t.jami.aniqlangan} та фуқародан ${t.jami.radEtgan} таси таклифдан бош тортган (${radFoizi}%). Таклифлар фуқароларнинг истагига мос келмаётган бўлиши мумкин.`,
        yol: '/ishsizlar?holati=RAD_ETDI',
      });
    }
  }

  const tartib: Record<TavsiyaDarajasi, number> = {
    shoshilinch: 0,
    muhim: 1,
    imkoniyat: 2,
  };
  return royxat.sort((a, b) => tartib[a.daraja] - tartib[b.daraja]);
}

export const DARAJA_KORINISHI: Record<
  TavsiyaDarajasi,
  { nomi: string; sinf: string }
> = {
  shoshilinch: { nomi: 'Шошилинч', sinf: 'bg-danger-bg text-danger' },
  muhim: { nomi: 'Муҳим', sinf: 'bg-warn-bg text-warn' },
  imkoniyat: { nomi: 'Имконият', sinf: 'bg-info-bg text-info' },
};
