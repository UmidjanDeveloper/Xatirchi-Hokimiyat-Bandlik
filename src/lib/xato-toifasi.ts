/**
 * ============================================================
 *  SERVER JAVOBINI XATO TURIGA AJRATISH
 *
 *  Brauzer ham, oflayn navbat ham serverdan "o'tmadi" javobini
 *  oladi. "O'tmadi"ning sababi beshta, va har birida xodim
 *  BOSHQA ish qilishi kerak:
 *
 *   401  qayta-kirish   sessiya tugagan: qayta kiring. Anketa
 *                       "yaroqsiz" EMAS - u telefonda turibdi va
 *                       kirgandan keyin o'zi ketadi;
 *   403  ruxsat         huquq yoki hisob holati o'zgargan: kimdir
 *                       tekshirishi kerak. Anketani tuzatish
 *                       foydasiz;
 *   400/422  tuzatish   ma'lumotda xato bor: xodim tuzatadi;
 *   409  ziddiyat       boshqa yozuv bilan to'qnashdi: odam solishtiradi;
 *   5xx/429  keyinroq   server band yoki ishlamayapti: kutish kerak,
 *                       xodimda aybdor narsa yo'q.
 *
 *  Avval 400, 401 va 403 BITTA "yaroqsiz anketa" edi. Sessiyasi
 *  tugagan xodimning hamma anketasi bir kechada "yaroqsiz"ga
 *  aylanib, qayta urinishlar tugaganidan keyin avtomatik yuborish
 *  to'xtardi - garchi anketada hech qanday xato yo'q bo'lsa ham.
 *
 *  Fayl sof (React, brauzer va serverga bog'liq emas): hamma yerda
 *  bir xil ishlaydi va alohida sinaladi.
 * ============================================================
 */

export type XatoToifasi = 'qayta-kirish' | 'ruxsat' | 'tuzatish' | 'ziddiyat' | 'keyinroq';

/**
 * HTTP kodini xato turiga ajratadi.
 *
 * Noma'lum 4xx - "tuzatish": so'rovning o'zi noto'g'ri, qayta yuborish
 * foydasiz. Noma'lum kod (masalan 0 yoki NaN) - "keyinroq": aniq
 * bo'lmagan holatda ma'lumotni jimgina "yaroqsiz" qilib qo'ymaymiz.
 */
export function xatoToifasi(status: number): XatoToifasi {
  if (!Number.isFinite(status)) return 'keyinroq';
  if (status === 401) return 'qayta-kirish';
  if (status === 403) return 'ruxsat';
  if (status === 409) return 'ziddiyat';
  if (status === 408 || status === 425 || status === 429) return 'keyinroq';
  if (status >= 500 && status <= 599) return 'keyinroq';
  if (status >= 400 && status <= 499) return 'tuzatish';
  return 'keyinroq';
}

/**
 * Xodimga ko'rsatiladigan matn (kirill; komponent `tr()` dan o'tkazadi).
 * Har birida: nima bo'ldi, ma'lumot yo'qolmadimi, keyingi qadam nima.
 */
export const XATO_MATNI: Record<XatoToifasi, string> = {
  'qayta-kirish':
    'Сессия тугаган. Маълумот телефонда сақланди — қайта киринг, у ўзи юборилади.',
  ruxsat:
    'Бу амал учун рухсат йўқ ёки ҳисоб ҳолати ўзгарган. Маълумот йўқолмайди — администратор билан текширинг.',
  tuzatish: 'Маълумотда хато бор — кўрсатилган катакни тузатинг.',
  ziddiyat: 'Бу ёзув базадаги бошқа ёзув билан тўқнашди — солиштириб кўриш керак.',
  keyinroq: 'Сервер ҳозир жавоб бермади. Маълумот йўқолмайди — кейинроқ қайта уриниб кўринг.',
};

/**
 * Anketa yo'qolmasligi uchun navbatga qo'yish kerakmi.
 *
 * Qayta-kirish va keyinroq: ha - sabab xodimda emas, vaqt o'tgach (yoki
 * qayta kirgach) o'zi ketadi. Qolganlarida: yo'q - tuzatish yoki odam
 * qarori kerak, navbat ularni qayta-qayta urib turmasin.
 */
export function navbatgaQoyiladimi(t: XatoToifasi): boolean {
  return t === 'qayta-kirish' || t === 'keyinroq';
}
