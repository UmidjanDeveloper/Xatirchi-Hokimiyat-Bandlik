/**
 * ============================================================
 *  HUDUD CHEGARASI — HAR BIR JADVAL QAYSI HUDUDGA TEGISHLI
 *
 *  Hozir tizim BITTA tuman (Xatirchi) uchun ishlaydi. Ammo boshqa
 *  tumanlarga chiqilganda eng xavfli xato — yangi tuman xodimi eski
 *  tuman ma'lumotini ko'rib qolishi (yoki aksincha). Bunga yo'l
 *  qo'ymaslik uchun har bir jadval oldindan SHU YERDA tasniflanadi:
 *  u hududga qanday bog'langan.
 *
 *  Yangi jadval qo'shilsa-yu bu xaritaga yozilmasa, `scripts/hudud-sinov.ts`
 *  YIQILADI. Ya'ni jadval qo'shgan odam "bu qaysi tumanga tegishli?" degan
 *  savolga javob berishga MAJBUR.
 *
 *  Bu hozirgi ishni o'zgartirmaydi: ya'ni hech qanday yangi jadval,
 *  mikroservis yoki murakkab infratuzilma kerak emas. Reja va tartib:
 *  hujjatlar/KOP-TUMAN.md
 * ============================================================
 */

export type HududTuri =
  /** Jadvalning o'zida `mahallaId` bor */
  | 'MAHALLA'
  /** O'zida `mahallaId` yo'q: hududga boshqa jadval orqali (FK) bog'langan */
  | 'BOGLIQ'
  /** Xodimga tegishli yozuv (xodim orqali hududga) */
  | 'XODIM'
  /** Tuman darajasidagi katalog: hozir yagona, ko'p tumanda `tumanId` kerak */
  | 'KATALOG'
  /** Mahallalar ro'yxatining o'zi: ko'p tumanda `tumanId` oladi */
  | 'ILDIZ'
  /** Platforma darajasida: hududga tegishli emas */
  | 'TIZIM';

export interface HududQoidasi {
  turi: HududTuri;
  /**
   * BOGLIQ / XODIM uchun: hududga olib boradigan FK maydon(lar)i (kamida bittasi
   * jadvalda BO'LISHI shart; sinov tekshiradi).
   */
  orqali?: string[];
  izoh: string;
}

export const HUDUD_XARITASI: Record<string, HududQoidasi> = {
  /* ── Ildiz ── */
  Mahalla: { turi: 'ILDIZ', izoh: 'Ko‘p tumanda `tumanId` oladi; mahalla nomi tuman ichida yagona bo‘ladi (hozir butun bazada yagona)' },

  /* ── Xodimlar ── */
  User: { turi: 'MAHALLA', izoh: 'YETTILIK xodimi mahallaga bog‘langan; boshqa rollar hozir butun tuman — ko‘p tumanda `tumanId` kerak' },

  /* ── Xatlov va fuqarolar (mahallaga to‘g‘ridan-to‘g‘ri) ── */
  Household: { turi: 'MAHALLA', izoh: 'Xonadon xatlovi' },
  UnemployedPerson: { turi: 'MAHALLA', izoh: 'Fuqaro; shaxsiy ma‘lumot' },
  HouseholdKesma: { turi: 'MAHALLA', izoh: 'Xonadon tarixi kesmasi' },
  ItVaucher: { turi: 'MAHALLA', izoh: 'IT-shaharcha vaucheri' },
  Vacancy: { turi: 'MAHALLA', izoh: 'Bo‘sh ish o‘rni' },
  IshBeruvchi: { turi: 'MAHALLA', izoh: 'Ish beruvchi (mahallaId bo‘sh bo‘lishi mumkin: tuman darajasida — ko‘p tumanda `tumanId` kerak)' },
  MahalliyBuyurtma: { turi: 'MAHALLA', izoh: 'Mahalliy buyurtma' },
  Murojaat: { turi: 'MAHALLA', izoh: 'Fuqaro murojaati' },

  /* ── Fuqaro / xonadon orqali bog‘langanlar ── */
  ActionPlan: { turi: 'BOGLIQ', orqali: ['householdId', 'ishsizId'], izoh: 'Chora-tadbir' },
  OilaRejasi: { turi: 'BOGLIQ', orqali: ['householdId'], izoh: 'Oilaviy rivojlanish rejasi' },
  OilaAloqasi: { turi: 'BOGLIQ', orqali: ['rejaId'], izoh: 'Reja bo‘yicha aloqa yozuvi' },
  JoylashuvXabari: { turi: 'BOGLIQ', orqali: ['ishsizId', 'vacancyId'], izoh: 'Ishga joylashish haqida xabar' },
  IshgaJoylashish: { turi: 'BOGLIQ', orqali: ['ishsizId'], izoh: 'Rasmiy joylashish voqeasi' },
  JoylashuvDalili: { turi: 'BOGLIQ', orqali: ['ishsizId'], izoh: 'Joylashish dalili (reyestr, hujjat)' },
  KuzatuvTekshiruvi: { turi: 'BOGLIQ', orqali: ['joylashishId'], izoh: '30/60/90 kunlik kuzatuv' },
  NomzodYollanmasi: { turi: 'BOGLIQ', orqali: ['ishsizId'], izoh: 'Nomzod yo‘llanmasi' },
  KursYollanmasi: { turi: 'BOGLIQ', orqali: ['ishsizId'], izoh: 'Kursga yo‘llanma' },
  XizmatTaklifi: { turi: 'BOGLIQ', orqali: ['ishsizId'], izoh: 'Fuqaroning xizmat taklifi' },
  MurojaatTarixi: { turi: 'BOGLIQ', orqali: ['murojaatId'], izoh: 'Murojaat tarixi' },

  /* ── Xodim orqali ── */
  Xabarnoma: { turi: 'XODIM', orqali: ['userId'], izoh: 'Telegram xabar navbati' },
  AuditLog: { turi: 'XODIM', orqali: ['userId'], izoh: 'Audit jurnali' },
  BotSuhbati: { turi: 'XODIM', orqali: ['userId'], izoh: 'Bot suhbat holati' },
  AgentFoydalanish: { turi: 'XODIM', orqali: ['userId'], izoh: 'Hudhud (AI agent) kunlik foydalanish hisobi, matnsiz' },
  AgentAmali: { turi: 'XODIM', orqali: ['userId'], izoh: 'Hudhud taklif qilgan, tasdiq kutayotgan yozish amali' },

  /* ── Tuman kataloglari: hozir yagona ── */
  Kurs: { turi: 'KATALOG', izoh: 'Kurslar katalogi: tuman bo‘yicha; ko‘p tumanda `tumanId`' },
  YordamDasturi: { turi: 'KATALOG', izoh: 'Yordam dasturlari: tuman/viloyat bo‘yicha; ko‘p tumanda `tumanId` (yoki viloyat darajasi)' },

  /* ── Platforma ── */
  TizimIshi: { turi: 'TIZIM', izoh: 'Avtomatik ish izi (shaxsiy ma‘lumotsiz)' },
  TizimXatosi: { turi: 'TIZIM', izoh: 'Xato jurnali (maxfiy ma‘lumotsiz)' },
  KirishUrinishi: { turi: 'TIZIM', izoh: 'Kirish chegarasi (xeshlangan kalit)' },
  ZaxiraTekshiruvi: { turi: 'TIZIM', izoh: 'Zaxira sinovi yozuvi' },
  TelegramYangilanish: { turi: 'TIZIM', izoh: 'Webhook takrorlanishiga qarshi' },
};

/**
 * Bitta tumanga tegishli SOZLAMALAR (kod ichida qattiq yozilgan) — ko‘p tumanda
 * `Tuman` sozlamasiga ko‘chadi. `yol` — fayl yoki katalog (sinov mavjudligini tekshiradi).
 */
export const TUMANGA_TEGISHLI_SOZLAMALAR: readonly { yol: string; nima: string }[] = [
  { yol: 'src/lib/constants.ts', nima: 'TUMAN va VILOYAT nomlari' },
  { yol: 'prisma/seed.ts', nima: '70 ta MFY ro‘yxati va statistikasi (boshlang‘ich ma‘lumot)' },
  { yol: 'src/lib/xarita', nima: 'Tuman chegarasi va qishloqlar (xarita geometriyasi)' },
  { yol: 'src/lib/hisobot', nima: 'Hisobot sarlavhalari va hokimlik nomi' },
  { yol: 'src/lib/bot-menyu.ts', nima: 'Telegram menyusidagi tizim nomi' },
  { yol: 'src/lib/xabarnoma.ts', nima: 'Telegram xabarlaridagi tizim nomi' },
  { yol: 'src/components/shared/site-footer.tsx', nima: 'Brend: pastki qism' },
  { yol: 'src/components/shared/gerb.tsx', nima: 'Brend: gerb va nom' },
  { yol: 'src/app/kirish/page.tsx', nima: 'Brend: kirish sahifasi' },
  { yol: 'src/lib/masul-tashkilot.ts', nima: 'Mas‘ul tashkilot nomlari (matn namunalari)' },
];
