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

export function qoralamalarniOqi(): Record<string, { malumot: unknown; vaqt: string }> {
  if (!xotiraBormi()) return {};
  try {
    const xom = window.localStorage.getItem(QORALAMA_KEY);
    if (!xom) return {};
    const parsed = JSON.parse(xom);
    return parsed && typeof parsed === 'object' ? parsed : {};
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
 * Navbatni serverga yuborishga urinadi.
 *
 * @param yubor bitta yozuvni yuboradigan funksiya
 * @returns nechtasi yuborildi
 */
export async function navbatniYubor(
  yubor: (malumot: unknown) => Promise<boolean>
): Promise<{ yuborildi: number; qoldi: number }> {
  const navbat = navbatniOqi();
  let yuborildi = 0;

  for (const yozuv of navbat) {
    try {
      if (await yubor(yozuv.malumot)) {
        navbatdanOchir(yozuv.localId);
        yuborildi++;
      } else {
        urinishBelgila(yozuv.localId);
      }
    } catch {
      urinishBelgila(yozuv.localId);
      // Aloqa uzilgan bo'lsa qolganlariga urinish ham behuda
      break;
    }
  }

  return { yuborildi, qoldi: navbatniOqi().length };
}
