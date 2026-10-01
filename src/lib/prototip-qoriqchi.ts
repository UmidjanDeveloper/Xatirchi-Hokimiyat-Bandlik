/**
 * ============================================================
 *  PROTOTIP IFLOSLANISHIGA QARSHI QO'RIQCHI
 *
 *  Tashqaridan kelgan fayl (reyestr ko'chirmasi) `xlsx` kutubxonasi bilan
 *  o'qiladi. Bu kutubxonaning 0.18.5 versiyasida maxsus tayyorlangan fayl
 *  `Object.prototype` ga xususiyat yozib qo'yishi mumkin (prototype pollution,
 *  GHSA-4r6h-8v6p-xvw6): shundan keyin serverdagi HAR BIR obyekt o'sha
 *  xususiyatga ega bo'lib qoladi — `if (obj.admin)` kabi tekshiruvlar buziladi.
 *
 *  Tuzatilgan versiya (0.20.3) npm'da yo'q, faqat SheetJS'ning o'z CDN'ida;
 *  CDN'dan o'rnatish esa har deployda tashqi tarmoqqa bog'laydi. Shu sababli
 *  kutubxona yangilanmaguncha QO'RIQCHI turadi.
 *
 *  ── Qanday ishlaydi ──
 *
 *  `xlsx.read` SINXRON: u ishlayotganda boshqa so'rov ishlamaydi. Shuning
 *  uchun asosiy prototiplar holatini OLDIN va KEYIN solishtirish aniq:
 *  har qanday o'zgarish (yangi kalit, o'zgargan yoki o'chirilgan xususiyat)
 *  topiladi va ASL HOLATIGA QAYTARILADI, chaqiruvchiga esa "ifloslangan"
 *  deb xabar beriladi (fayl rad etiladi).
 *
 *  Chegara (halol): faqat quyidagi o'rnatilgan prototiplar kuzatiladi
 *  (Object, Array, Function, String, Number, Boolean, Symbol, Date, RegExp,
 *  Error, Promise, Map, Set). Boshqa kutubxona ichki obyektlarining
 *  prototipi bu yerda tekshirilmaydi.
 * ============================================================
 */

const KUZATILADIGAN: readonly { nom: string; proto: object }[] = [
  { nom: 'Object', proto: Object.prototype },
  { nom: 'Array', proto: Array.prototype },
  { nom: 'Function', proto: Function.prototype },
  { nom: 'String', proto: String.prototype },
  { nom: 'Number', proto: Number.prototype },
  { nom: 'Boolean', proto: Boolean.prototype },
  { nom: 'Symbol', proto: Symbol.prototype },
  { nom: 'Date', proto: Date.prototype },
  { nom: 'RegExp', proto: RegExp.prototype },
  { nom: 'Error', proto: Error.prototype },
  { nom: 'Promise', proto: Promise.prototype },
  { nom: 'Map', proto: Map.prototype },
  { nom: 'Set', proto: Set.prototype },
];

type Surat = Map<string | symbol, PropertyDescriptor>;

function suratOl(proto: object): Surat {
  const s: Surat = new Map();
  for (const k of Reflect.ownKeys(proto)) {
    const d = Object.getOwnPropertyDescriptor(proto, k);
    if (d) s.set(k, d);
  }
  return s;
}

function tengMi(a: PropertyDescriptor, b: PropertyDescriptor): boolean {
  return (
    a.value === b.value &&
    a.get === b.get &&
    a.set === b.set &&
    a.writable === b.writable &&
    a.enumerable === b.enumerable &&
    a.configurable === b.configurable
  );
}

const kalitMatni = (k: string | symbol) => (typeof k === 'symbol' ? k.toString() : k);

export interface QoriqchiNatijasi<T> {
  /** `ish` qaytargan qiymat (xato tashlagan bo'lsa — undefined) */
  natija?: T;
  /** `ish` tashlagan xato (bo'lsa) — qo'riqchi uni YUTMAYDI, chaqiruvchi hal qiladi */
  xato?: unknown;
  /** O'zgargan prototip xususiyatlari: "Object.polluted (qo'shildi)" kabi */
  iflos: string[];
}

/**
 * `ish` ni bajaradi va prototiplar o'zgarsa ASL HOLATINI TIKLAYDI.
 *
 * `ish` xato tashlasa ham tiklash bajariladi va ifloslanish HISOBOTGA
 * KIRADI: xato bilan birga ifloslanish bo'lsa, xato "oddiy buzuq fayl"
 * bo'lib ko'milib ketmasligi kerak (urinish hisobotda ko'rinishi shart).
 * `ish` SINXRON bo'lishi shart (aks holda oldin/keyin solishtirish noaniq).
 */
export function prototipQoriqchisi<T>(ish: () => T): QoriqchiNatijasi<T> {
  const oldin = KUZATILADIGAN.map((x) => suratOl(x.proto));
  const iflos: string[] = [];

  const tikla = () => {
    KUZATILADIGAN.forEach((x, i) => {
      const keyin = suratOl(x.proto);
      const eski = oldin[i];

      keyin.forEach((d, k) => {
        const e = eski.get(k);
        if (!e) {
          iflos.push(`${x.nom}.${kalitMatni(k)} (qo'shildi)`);
          try {
            Reflect.deleteProperty(x.proto, k);
          } catch {
            /* o'chirib bo'lmasa — pastda "tiklanmadi" deb belgilanadi */
          }
        } else if (!tengMi(e, d)) {
          iflos.push(`${x.nom}.${kalitMatni(k)} (o'zgardi)`);
          try {
            Object.defineProperty(x.proto, k, e);
          } catch {
            /* idem */
          }
        }
      });
      eski.forEach((e, k) => {
        if (!keyin.has(k)) {
          iflos.push(`${x.nom}.${kalitMatni(k)} (o'chirildi)`);
          try {
            Object.defineProperty(x.proto, k, e);
          } catch {
            /* idem */
          }
        }
      });

      /* Tiklash haqiqatan ishladimi? Ishlamagan bo'lsa jim qolmaymiz. */
      const tekshiruv = suratOl(x.proto);
      let farq = tekshiruv.size !== eski.size;
      eski.forEach((e, k) => {
        const t = tekshiruv.get(k);
        if (!t || !tengMi(e, t)) farq = true;
      });
      if (farq) iflos.push(`${x.nom} (TIKLANMADI)`);
    });
  };

  let natija: T | undefined;
  let xato: unknown;
  let xatoBor = false;
  try {
    natija = ish();
    if (natija && typeof (natija as { then?: unknown }).then === 'function') {
      throw new Error('prototipQoriqchisi: ish sinxron bo‘lishi shart');
    }
  } catch (e) {
    xato = e;
    xatoBor = true;
    natija = undefined;
  }
  tikla();
  return xatoBor ? { xato, iflos } : { natija, iflos };
}
