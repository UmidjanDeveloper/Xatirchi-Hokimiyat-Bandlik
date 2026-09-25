/**
 * ============================================================
 *  OFLAYN QORALAMA VA NAVBAT
 *
 *  Xatlov hovlida, xonadon eshigi oldida to'ldiriladi. Xatirchi
 *  tumanining chekka mahallalarida aloqa uzilib turadi, telefonning
 *  quvvati esa kun oxiriga borib tugaydi.
 *
 *  Ikkita alohida himoya:
 *
 *  1. QORALAMA - har o'zgarishda brauzer xotirasiga yoziladi.
 *     Telefon o'chsa yoki sahifa yopilsa, xodim qaytib kelganda
 *     to'ldirgan joyidan davom etadi.
 *
 *  2. NAVBAT - aloqa yo'q bo'lsa, tayyor xatlov navbatga tushadi
 *     va aloqa tiklanishi bilan avtomatik yuboriladi.
 *
 *  Eng muhim qoida: xotira to'lib qolsa, xodimga SOXTA "saqlandi"
 *  emas, rost xabar ko'rsatiladi. Aks holda u xonadondan ketadi va
 *  ma'lumot yo'qolganini faqat kechqurun bilib qoladi.
 * ============================================================
 */

const QORALAMA_KEY = 'bandlik_qoralama';
const NAVBAT_KEY = 'bandlik_navbat';

/**
 * Navbatdagi xatlovlarning eng ko'p soni.
 *
 * Bitta xatlov ~3 KB, localStorage odatda ~5 MB. Chegara texnik
 * emas, mantiqiy: bitta xodim bir kunda 30-40 xonadondan ortiq
 * ulgurmaydi, 200 tadan oshgani esa aloqa haftalab yo'q ekanini
 * bildiradi va bu holda administratorga xabar berish kerak.
 */
const MAX_NAVBAT = 200;

export interface NavbatYozuvi {
  localId: string;
  /** Yuboriladigan JSON */
  malumot: unknown;
  qoshilganVaqt: string;
  urinishlar: number;
}

function xotiraBormi(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
//  QORALAMA
// ─────────────────────────────────────────────────────────────

/**
 * Qoralamani saqlaydi.
 * @returns saqlandimi - `false` bo'lsa foydalanuvchiga aytish SHART
 */
export function qoralamaSaqla(id: string, malumot: unknown): boolean {
  if (!xotiraBormi()) return false;
  try {
    const barchasi = qoralamalarniOqi();
    barchasi[id] = { malumot, vaqt: new Date().toISOString() };
    window.localStorage.setItem(QORALAMA_KEY, JSON.stringify(barchasi));
    return true;
  } catch {
    return false;
  }
}

/**
 * Қоралама қанча яшайди.
 *
 * Телефонда ОЧИҚ МАТНДА исм, манзил, телефон, ногиронлик ва
 * даромад ётади. Ходим анкетани ташлаб кетган бўлса ҳам, у
 * йиллаб сақланиб қоларди: телефон сотилса, йўқолса ёки
 * бошқага берилса — маълумот у билан кетарди.
 *
 * Етти кун — амалий чегара: бир ҳафтада қайтиб келмаган
 * қораламадан фойда йўқ, ходим уни барибир бошидан
 * тўлдиради.
 *
 * Навбатга бу тегмайди: навбатдаги ёзув ТАЙЁР хатлов ва у
 * серверга етиб бориши керак. Унинг ўз чегараси бор —
 * `MAX_URINISH`.
 */
export const QORALAMA_KUNI = 7;

/** Ёзув эскирганми */
function eskirganmi(vaqt: string): boolean {
  const t = Date.parse(vaqt);
  if (Number.isNaN(t)) return true; // сана ўқилмаса — ишончсиз, ташланади
  return Date.now() - t > QORALAMA_KUNI * 24 * 60 * 60 * 1000;
}

export function qoralamalarniOqi(): Record<string, { malumot: unknown; vaqt: string }> {
  if (!xotiraBormi()) return {};
  try {
    const xom = window.localStorage.getItem(QORALAMA_KEY);
    if (!xom) return {};
    const parsed = JSON.parse(xom);
    if (!parsed || typeof parsed !== 'object') return {};

    /*
     * Эскиргани ЎҚИШДА тушиб қолади ва дарҳол ёзиб
     * қўйилади. Алоҳида «тозалагич» ёзиш ҳам мумкин эди,
     * лекин уни ишга тушириш керак бўларди — ва аввал ё
     * кечроқ кимдир чақиришни унутарди.
     */
    const toza: Record<string, { malumot: unknown; vaqt: string }> = {};
    let tashlandi = 0;
    for (const [id, y] of Object.entries(parsed as Record<string, { malumot: unknown; vaqt: string }>)) {
      if (y && typeof y === 'object' && !eskirganmi(y.vaqt)) toza[id] = y;
      else tashlandi++;
    }
    if (tashlandi > 0) {
      try {
        window.localStorage.setItem(QORALAMA_KEY, JSON.stringify(toza));
      } catch {
        /* ёзиб бўлмаса — ўқиганимиз барибир тоза */
      }
    }
    return toza;
  } catch {
    return {};
  }
}

export function qoralamaOqi<T>(id: string): T | null {
  const y = qoralamalarniOqi()[id];
  return y ? (y.malumot as T) : null;
}

export function qoralamaOchir(id: string): void {
  if (!xotiraBormi()) return;
  try {
    const barchasi = qoralamalarniOqi();
    delete barchasi[id];
    window.localStorage.setItem(QORALAMA_KEY, JSON.stringify(barchasi));
  } catch {
    /* xotira o'chirib bo'lmasa - zarari yo'q */
  }
}

// ─────────────────────────────────────────────────────────────
//  NAVBAT
// ─────────────────────────────────────────────────────────────

export function navbatniOqi(): NavbatYozuvi[] {
  if (!xotiraBormi()) return [];
  try {
    const xom = window.localStorage.getItem(NAVBAT_KEY);
    if (!xom) return [];
    const parsed = JSON.parse(xom);
    return Array.isArray(parsed) ? (parsed as NavbatYozuvi[]) : [];
  } catch {
    return [];
  }
}

function navbatYoz(navbat: NavbatYozuvi[]): boolean {
  try {
    window.localStorage.setItem(NAVBAT_KEY, JSON.stringify(navbat));
    return true;
  } catch {
    return false;
  }
}

export type NavbatNatijasi =
  | { ok: true }
  | { ok: false; sabab: 'xotira-yoq' | 'navbat-toldi' | 'yozib-bolmadi' };

/** Xatlovni navbatga qo'shadi */
export function navbatgaQosh(malumot: unknown): NavbatNatijasi {
  if (!xotiraBormi()) return { ok: false, sabab: 'xotira-yoq' };

  const navbat = navbatniOqi();
  if (navbat.length >= MAX_NAVBAT) return { ok: false, sabab: 'navbat-toldi' };

  navbat.push({
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    malumot,
    qoshilganVaqt: new Date().toISOString(),
    urinishlar: 0,
  });

  return navbatYoz(navbat) ? { ok: true } : { ok: false, sabab: 'yozib-bolmadi' };
}

export function navbatdanOchir(localId: string): void {
  if (!xotiraBormi()) return;
  navbatYoz(navbatniOqi().filter((y) => y.localId !== localId));
}

export function urinishBelgila(localId: string): void {
  if (!xotiraBormi()) return;
  navbatYoz(
    navbatniOqi().map((y) =>
      y.localId === localId ? { ...y, urinishlar: y.urinishlar + 1 } : y
    )
  );
}

/**
 * Bitta yozuvni yuborishga urinish natijasi.
 *
 * Nega oddiy `boolean` emas: "yuborilmadi" ning UCH XIL sababi
 * bor va ularga munosabat ham har xil bo'lishi kerak.
 *
 *  · `saqlandi`  - server qabul qildi, navbatdan chiqariladi;
 *  · `takror`    - server "bu xonadon allaqachon bor" dedi (409).
 *                  Bu ham MUVAFFAQIYAT: aloqa javob kelishidan
 *                  oldin uzilgan bo'lsa, yozuv aslida saqlangan
 *                  bo'ladi. Uni navbatda qoldirish - xodimga
 *                  abadiy "yuborilmagan" deb ko'rsatib turish;
 *  · `yaroqsiz`  - ma'lumotda xato bor (400). Qayta-qayta
 *                  yuborish foydasiz, lekin O'CHIRIB HAM
 *                  BO'LMAYDI: bu xodimning bir soatlik ishi.
 *                  Navbatda qoladi va xodimga ko'rsatiladi;
 *  · `aloqa-yoq` - tarmoq yo'q yoki server javob bermadi.
 *                  Qolganlariga urinish ham behuda - to'xtaymiz.
 */
export type YuborishNatijasi = 'saqlandi' | 'takror' | 'yaroqsiz' | 'aloqa-yoq';

/**
 * Shundan ortiq urinishdan keyin yozuv "e'tibor talab qiladi"
 * deb belgilanadi va avtomatik yuborishga qo'shilmaydi.
 *
 * Chegara bo'lmasa, ma'lumoti buzuq bitta yozuv har safar
 * navbatni to'sib turardi va orqasidagilar yuborilmasdi.
 */
export const MAX_URINISH = 5;

/** Yozuv avtomatik yuborishga yaroqlimi */
export function avtomatikYuboriladimi(y: NavbatYozuvi): boolean {
  return y.urinishlar < MAX_URINISH;
}

export interface NavbatNatijalari {
  /** Serverga yangi yozilganlar */
  yuborildi: number;
  /** Server "allaqachon bor" degani - ular ham yo'qolmadi */
  takror: number;
  /** Navbatda qolgani */
  qoldi: number;
  /** E'tibor talab qiladiganlar (urinish chegarasidan oshgan) */
  etibor: number;
  /** Aloqa yo'qligi sababli to'xtadimi */
  aloqaYoq: boolean;
}

/**
 * Navbatni serverga yuborishga urinadi.
 *
 * @param yubor bitta yozuvni yuboradigan funksiya
 */
export async function navbatniYubor(
  yubor: (malumot: unknown) => Promise<YuborishNatijasi>
): Promise<NavbatNatijalari> {
  const navbat = navbatniOqi().filter(avtomatikYuboriladimi);
  let yuborildi = 0;
  let takror = 0;
  let aloqaYoq = false;

  for (const yozuv of navbat) {
    let natija: YuborishNatijasi;
    try {
      natija = await yubor(yozuv.malumot);
    } catch {
      natija = 'aloqa-yoq';
    }

    if (natija === 'saqlandi' || natija === 'takror') {
      navbatdanOchir(yozuv.localId);
      if (natija === 'takror') takror++;
      else yuborildi++;
      continue;
    }

    urinishBelgila(yozuv.localId);
    if (natija === 'aloqa-yoq') {
      aloqaYoq = true;
      break;
    }
  }

  const qolgan = navbatniOqi();
  return {
    yuborildi,
    takror,
    qoldi: qolgan.length,
    etibor: qolgan.filter((y) => !avtomatikYuboriladimi(y)).length,
    aloqaYoq,
  };
}

/**
 * ТИЗИМДАН ЧИҚҚАНДА телефон хотирасини тозалайди.
 *
 * Сессия 12 соат яшайди, `localStorage` эса МУДДАТСИЗ.
 * Яъни ходим чиқиб кетса ҳам, унинг телефонида хонадонлар
 * маълумоти қолаверарди — кейинги эгасига ҳам, топиб олган
 * одамга ҳам.
 *
 * НАВБАТ ЮБОРИЛМАГАН бўлса тегилмайди: у тайёр хатлов ва
 * уни ўчириш ходимнинг бир соатлик ишини йўқотарди. Функция
 * нечта ёзув қолганини қайтаради — чақирувчи ходимни
 * огоҳлантириши учун.
 */
export function chiqishdaTozala(): { qoralama: number; navbat: number } {
  if (!xotiraBormi()) return { qoralama: 0, navbat: 0 };
  let qoralama = 0;
  try {
    qoralama = Object.keys(qoralamalarniOqi()).length;
    window.localStorage.removeItem(QORALAMA_KEY);
  } catch {
    /* ўчириб бўлмаса — зарари йўқ */
  }
  let navbat = 0;
  try {
    navbat = navbatniOqi().length;
    if (navbat === 0) window.localStorage.removeItem(NAVBAT_KEY);
  } catch {
    /* ўқиб бўлмаса — навбат ҳам йўқ деб ҳисоблаймиз */
  }
  return { qoralama, navbat };
}
