/**
 * ============================================================
 *  TIZIM HOLATI — MIJOZGA XAVFSIZ NOMLAR VA SOF HISOB
 *
 *  DB'ga tegmaydi: ham sahifa, ham test shu yerdan foydalanadi.
 * ============================================================
 */

export type IshHolatiTuri = 'DAVOM_ETMOQDA' | 'MUVAFFAQIYATLI' | 'XATO';

/**
 * Jadval bo'yicha ishlaydigan avtomatik ishlar.
 *
 * `vercel.json` dagi `crons` bilan BIR XIL bo'lishi shart: yangi cron
 * qo'shilsa-yu bu ro'yxatga qo'shilmasa, uning o'lib qolganini hech kim
 * ko'rmaydi. `scripts/monitoring-sinov.ts` shuni tekshiradi.
 */
export const CRON_ISHLARI: readonly {
  nomi: string;
  tavsif: string;
  yol: string;
  /** Qancha vaqtda bir marta ishlashi kutiladi (soat) */
  davriSoat: number;
}[] = [
  { nomi: 'brifing', tavsif: 'Эрталабки брифинг (ҳоким ва раҳбарларга)', yol: '/api/cron/brifing', davriSoat: 24 },
  { nomi: 'navbat', tavsif: 'Хабарнома навбати, эълон муддати, кириш уринишларини тозалаш', yol: '/api/telegram/navbat', davriSoat: 24 },
];

/**
 * Jadval kutilganidan necha marta kechiksa "kechikkan" deyiladi.
 * Vercel Hobby cron'i soat ichida istalgan vaqtda ishlashi mumkin, shuning
 * uchun 1.5 barobar zaxira beriladi (kunlik ish uchun 36 soat).
 */
export const KECHIKISH_KOEFFITSIENTI = 1.5;

/** "Davom etmoqda" holatida shu daqiqadan ortiq tursa — funksiya o'ldirilgan deb hisoblanadi */
export const TOXTAB_QOLISH_DAQIQA = 15;

/** Zaxiradan tiklash sinovi shu kundan eski bo'lsa eslatiladi (chorakda bir marta) */
export const ZAXIRA_ESKIRISH_KUNI = 92;

/** Xabar navbatida shu soatdan ortiq turgan xabar "ushlanib qolgan" */
export const NAVBAT_USHLANISH_SOATI = 6;

export type IshBahosi =
  | 'HECH_QACHON'
  | 'TINCH'
  | 'KECHIKKAN'
  | 'XATODA'
  | 'TOXTAB_QOLGAN';

export const ISH_BAHOSI_NOMI: Record<IshBahosi, string> = {
  HECH_QACHON: 'Ҳали ишламаган',
  TINCH: 'Ишлаяпти',
  KECHIKKAN: 'Кечикди',
  XATODA: 'Хато билан тугади',
  TOXTAB_QOLGAN: 'Ўртада тўхтаб қолган',
};

export interface IshYozuvi {
  holati: IshHolatiTuri;
  boshlandi: Date;
  tugadi: Date | null;
}

export interface IshBaholash {
  baho: IshBahosi;
  songgiMuvaffaqiyat: Date | null;
  songgiUrinish: Date | null;
}

/**
 * Avtomatik ishning holatini YOZUVLARDAN hisoblaydi (saqlanmaydi).
 *
 * `yozuvlar` — shu ishning jadval (cron) bo'yicha bajarilishlari, yangisi birinchi.
 * Qo'lda ishga tushirish bu yerga KIRMAYDI: administrator tugmani bosib qo'yishi
 * jadval o'lik ekanini yashirmasligi kerak.
 *
 * Qoidalar:
 *  · yozuv yo'q                                    -> HECH_QACHON
 *  · oxirgi urinish "davom etmoqda" va eski        -> TOXTAB_QOLGAN
 *  · oxirgi urinish xato bilan tugagan             -> XATODA
 *  · oxirgi muvaffaqiyat kutilganidan ancha eski   -> KECHIKKAN
 *  · aks holda                                     -> TINCH
 */
export function ishniBaholash(
  yozuvlar: readonly IshYozuvi[],
  davriSoat: number,
  hozir: Date
): IshBaholash {
  if (yozuvlar.length === 0) {
    return { baho: 'HECH_QACHON', songgiMuvaffaqiyat: null, songgiUrinish: null };
  }

  const eng = [...yozuvlar].sort((a, b) => b.boshlandi.getTime() - a.boshlandi.getTime());
  const oxirgi = eng[0];
  const muvaffaqiyat = eng.find((y) => y.holati === 'MUVAFFAQIYATLI');
  const songgiMuvaffaqiyat = muvaffaqiyat ? (muvaffaqiyat.tugadi ?? muvaffaqiyat.boshlandi) : null;
  const songgiUrinish = oxirgi.boshlandi;

  const daqiqa = (hozir.getTime() - oxirgi.boshlandi.getTime()) / 60000;
  if (oxirgi.holati === 'DAVOM_ETMOQDA' && daqiqa > TOXTAB_QOLISH_DAQIQA) {
    return { baho: 'TOXTAB_QOLGAN', songgiMuvaffaqiyat, songgiUrinish };
  }
  if (oxirgi.holati === 'XATO') {
    return { baho: 'XATODA', songgiMuvaffaqiyat, songgiUrinish };
  }

  const chegaraMs = davriSoat * KECHIKISH_KOEFFITSIENTI * 3600_000;
  if (!songgiMuvaffaqiyat || hozir.getTime() - songgiMuvaffaqiyat.getTime() > chegaraMs) {
    return { baho: 'KECHIKKAN', songgiMuvaffaqiyat, songgiUrinish };
  }
  return { baho: 'TINCH', songgiMuvaffaqiyat, songgiUrinish };
}

/** Zaxira tiklash sinovining holati (sanadan hisoblanadi) */
export type ZaxiraBahosi = 'HECH_QACHON' | 'XATO' | 'ESKIRGAN' | 'YANGI';

export function zaxiraniBaholash(
  songgi: { otkazilganSana: Date; natija: 'MUVAFFAQIYATLI' | 'XATO' } | null,
  hozir: Date
): { baho: ZaxiraBahosi; kun: number | null } {
  if (!songgi) return { baho: 'HECH_QACHON', kun: null };
  const kun = Math.floor((hozir.getTime() - songgi.otkazilganSana.getTime()) / 86400_000);
  if (songgi.natija === 'XATO') return { baho: 'XATO', kun };
  return { baho: kun > ZAXIRA_ESKIRISH_KUNI ? 'ESKIRGAN' : 'YANGI', kun };
}
