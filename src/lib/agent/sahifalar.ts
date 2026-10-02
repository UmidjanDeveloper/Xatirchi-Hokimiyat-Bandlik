import type { Rol } from '@prisma/client';
import { MENYU } from '@/components/shell/navigatsiya';

/**
 * ============================================================
 *  HUDHUD: QAYSI SAHIFALARNI OCHA OLADI
 *
 *  Ovozli buyruq "ishsizlar ro'yxatini och" deydi. Model sahifa nomi
 *  va filtrlarni beradi, URLni esa FAQAT shu yerdagi ro'yxat yasaydi:
 *
 *    · ro'yxatdan tashqari yo'l umuman yasalmaydi: tashqi sayt, `/api`,
 *      `..` bilan chiqish, boshqa rolning sahifasi — hech biri;
 *    · rol huquqi `MENYU` dan olinadi (menyu va qo'riqchi ham shundan):
 *      ikki joyda alohida yozilsa, biri o'zgarganda ikkinchisi eskirib
 *      qolardi;
 *    · filtr faqat shu sahifa HAQIQATAN o'qiydigan nomlar bilan, va
 *      qiymati cheklangan (ro'yxatdagi tanlov, mahalla identifikatori,
 *      qisqa matn, bayroq);
 *    · sahifa o'zining qo'riqchisini saqlab qoladi: bu yerda ruxsat
 *      berilsa ham, sahifaning o'zi rolni qayta tekshiradi.
 * ============================================================
 */

export type FiltrTuri =
  | { tur: 'tanlov'; qiymatlar: readonly string[] }
  /** Mahalla identifikatori (nomi emas): tool avval nomni topib beradi */
  | { tur: 'mahalla' }
  | { tur: 'matn'; max: number }
  | { tur: 'bayroq' };

export interface SahifaTavsifi {
  kalit: string;
  yol: string;
  /** Xodimga ko'rinadigan nom (kirillda) */
  nomi: string;
  /** Modelga: sahifa nima uchun */
  tavsif: string;
  /** Qoidali zaxira parser uchun: lotinda, apostrofsiz, kichik harfda */
  aytilishi: readonly string[];
  /** Filtr kaliti -> URL parametri nomi va turi */
  filtrlar: Record<string, { param: string; tur: FiltrTuri }>;
  /** Rollar: `MENYU` dagi yo'l bo'yicha, yoki `rollar` bilan aniq */
  rollar?: readonly Rol[];
}

export const ISHSIZ_HOLATLARI = [
  'ANIQLANDI',
  'SUHBAT_OTKAZILDI',
  'TAKLIF_BERILDI',
  'JOYLASHTIRILDI',
  'TASDIQLANDI',
  'RAD_ETDI',
] as const;
export const MUROJAAT_FILTRLARI = ['ochiq', 'muddatli', 'mening', 'javob', 'yopiq', 'hammasi'] as const;
export const DAVRLAR = ['kun', 'oy', 'yil'] as const;

const PANEL_FILTRLARI: SahifaTavsifi['filtrlar'] = {
  mahalla: { param: 'mfy', tur: { tur: 'mahalla' } },
  davr: { param: 'davr', tur: { tur: 'tanlov', qiymatlar: DAVRLAR } },
};

export const SAHIFALAR: readonly SahifaTavsifi[] = [
  { kalit: 'vazifalar', yol: '/vazifalar', nomi: 'Вазифаларим', tavsif: "Bugungi vazifalar taxtasi (har rol uchun o'ziniki)", aytilishi: ['vazifa', 'vazifalarim', 'topshiriq', 'bugungi ish', 'ish taxtasi'], filtrlar: {} },
  { kalit: 'yangi_xatlov', yol: '/xatlov/yangi', nomi: 'Янги хатлов', tavsif: "Yangi xonadon xatlovi anketasi", aytilishi: ['yangi xatlov', 'xatlov boshla', 'anketa toldir'], filtrlar: {} },
  {
    kalit: 'xonadonlar', yol: '/xonadonlar', nomi: 'Хонадонлар', tavsif: "Xatlovdan o'tgan xonadonlar ro'yxati (shaxsiy ma'lumot faqat sahifada ko'rinadi)",
    aytilishi: ['xonadon', 'xonadonlar', 'xatlovdan otgan'],
    filtrlar: { mahalla: { param: 'mahalla', tur: { tur: 'mahalla' } }, qidiruv: { param: 'q', tur: { tur: 'matn', max: 100 } } },
  },
  {
    kalit: 'ishsizlar', yol: '/ishsizlar', nomi: 'Ишсизлар', tavsif: "Ishsiz fuqarolar ro'yxati; holat, mahalla, 12 oydan ortiq ishsizlar, mustahkamlash tekshiruvi bo'yicha filtrlanadi",
    aytilishi: ['ishsiz', 'ishsizlar', 'fuqarolar royxati'],
    filtrlar: {
      holati: { param: 'holati', tur: { tur: 'tanlov', qiymatlar: ISHSIZ_HOLATLARI } },
      mahalla: { param: 'mahalla', tur: { tur: 'mahalla' } },
      qidiruv: { param: 'q', tur: { tur: 'matn', max: 100 } },
      uzoq: { param: 'uzoq', tur: { tur: 'bayroq' } },
      tekshiruv: { param: 'tekshiruv', tur: { tur: 'bayroq' } },
    },
  },
  { kalit: 'kuzatuv', yol: '/kuzatuv', nomi: 'Кузатув 30/60/90', tavsif: "Ishga joylashgandan keyingi 30/60/90 kunlik kuzatuv", aytilishi: ['kuzatuv', 'tasdiqlash tekshiruvi'], filtrlar: {} },
  { kalit: 'kurslar', yol: '/kurslar', nomi: 'Курслар', tavsif: "Kasb-hunar kurslari va yo'llanmalar", aytilishi: ['kurs', 'kurslar', 'oqitish'], filtrlar: {} },
  { kalit: 'buyurtmalar', yol: '/buyurtmalar', nomi: 'Маҳаллий буюртмалар', tavsif: "Mahalliy xizmat buyurtmalari", aytilishi: ['buyurtma', 'buyurtmalar', 'xizmat'], filtrlar: {} },
  {
    kalit: 'murojaatlar', yol: '/murojaatlar', nomi: 'Мурожаатлар', tavsif: "Murojaatlar ro'yxati; muddati o'tganlar 'muddatli' filtri bilan",
    aytilishi: ['murojaat', 'murojaatlar', 'shikoyat'],
    filtrlar: { holat: { param: 'holat', tur: { tur: 'tanlov', qiymatlar: MUROJAAT_FILTRLARI } } },
  },
  { kalit: 'yordam', yol: '/yordam', nomi: 'Ёрдам дастурлари', tavsif: "Yordam dasturlari katalogi", aytilishi: ['yordam dasturlari', 'yordam katalogi', 'nafaqa'], filtrlar: {} },
  { kalit: 'operatsion_panel', yol: '/bandlik', nomi: 'Операцион панел', tavsif: "Bandlik markazi operatsion paneli: navbatlar, suhbat va taklif kutayotganlar", aytilishi: ['operatsion panel', 'bandlik paneli', 'operatsion'], filtrlar: PANEL_FILTRLARI },
  { kalit: 'ish_orinlari', yol: '/ish-orinlari', nomi: 'Бўш иш ўринлари', tavsif: "Bo'sh ish o'rinlari e'lonlari", aytilishi: ['ish orni', 'ish orinlari', 'vakansiya', 'elonlar'], filtrlar: {} },
  { kalit: 'chora_tadbirlar', yol: '/chora-tadbirlar', nomi: 'Чора-тадбирлар', tavsif: "Chora-tadbirlar va topshiriqlar", aytilishi: ['chora tadbir', 'chora tadbirlar', 'choralar'], filtrlar: {} },
  { kalit: 'rejalar', yol: '/rejalar', nomi: 'Оила режалари', tavsif: "Oilaviy rivojlanish rejalari", aytilishi: ['oila reja', 'oila rejalari', 'rejalar'], filtrlar: {} },
  { kalit: 'tahlil_paneli', yol: '/panel', nomi: 'Таҳлил панели', tavsif: "Hokim tahlil paneli: asosiy ko'rsatkichlar, mahallalar, bo'limlar; hisobot tugmalari shu sahifada", aytilishi: ['tahlil', 'tahlil paneli', 'hokim paneli', 'hisobot', 'panel'], filtrlar: PANEL_FILTRLARI },
  { kalit: 'mahalla_xodimlari', yol: '/mahalla-xodimlari', nomi: 'Маҳалла ходимлари', tavsif: "Mahalla xodimlari ro'yxati", aytilishi: ['mahalla xodimlari', 'xodimlar'], filtrlar: {} },
  { kalit: 'ochirilganlar', yol: '/ochirilganlar', nomi: 'Ўчирилганлар', tavsif: "Arxivga o'tkazilganlar (qaytarish mumkin)", aytilishi: ['ochirilganlar', 'arxiv'], filtrlar: {} },
  { kalit: 'ish_beruvchilar', yol: '/ish-beruvchilar', nomi: 'Иш берувчилар', tavsif: "Ish beruvchilar", aytilishi: ['ish beruvchi', 'ish beruvchilar', 'korxonalar'], filtrlar: {} },
  { kalit: 'reyestr', yol: '/reyestr', nomi: 'Тасдиқлаш', tavsif: "Rasmiy ko'chirma yuklash va ish dalillarini tasdiqlash", aytilishi: ['reyestr', 'tasdiqlash', 'dalillar'], filtrlar: {} },
  { kalit: 'boshqaruv', yol: '/admin', nomi: 'Бошқарув', tavsif: "Administrator boshqaruv paneli", aytilishi: ['boshqaruv', 'admin panel'], filtrlar: PANEL_FILTRLARI },
  { kalit: 'tizim_holati', yol: '/tizim', nomi: 'Тизим ҳолати', tavsif: "Tizim holati: avtomatik ishlar, navbat, xatolar, zaxira", aytilishi: ['tizim holati', 'tizim', 'monitoring', 'xatolar jurnali'], filtrlar: {} },
  { kalit: 'tablo', yol: '/tablo', nomi: 'Жонли табло', tavsif: "Tuman jonli tablosi (devor ekrani)", aytilishi: ['tablo', 'jonli tablo', 'devor ekrani'], filtrlar: {}, rollar: ['HOKIM', 'BANDLIK_RAHBAR', 'ADMIN'] },
];

/** Sahifani qaysi rollar ochadi: aniq ro'yxat yoki `MENYU` dagi yo'l bo'yicha */
export function sahifaRollari(s: SahifaTavsifi): readonly Rol[] {
  if (s.rollar) return s.rollar;
  const band = MENYU.find((b) => b.yol === s.yol);
  return band ? band.rollar : [];
}

export function sahifaMumkinmi(rol: Rol, s: SahifaTavsifi): boolean {
  return sahifaRollari(s).includes(rol);
}

export function rolSahifalari(rol: Rol): SahifaTavsifi[] {
  return SAHIFALAR.filter((s) => sahifaMumkinmi(rol, s));
}

export type FiltrQiymati = string | number | boolean | undefined | null;

export type ManzilNatijasi =
  | { ok: true; url: string; nomi: string }
  | { ok: false; sabab: 'sahifa_yoq' | 'ruxsat_yoq' | 'filtr_notogri'; izoh: string };

const MAHALLA_ID = /^[A-Za-z0-9_-]{8,40}$/;

/** Qidiruv matni: boshqaruv belgilarisiz, bir qator, qisqa */
export function qidiruvniTozala(matn: string, max: number): string {
  return matn
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Ruxsat etilgan URL yasaydi yoki rad etadi.
 *
 * `mahallaId` — allaqachon bazadan topilgan identifikator (nom emas).
 * Noma'lum filtr jimgina tashlanmaydi: rad etiladi, shunda model
 * "filtr ishladi" deb xato aytmaydi.
 */
export function sahifaManzili(
  rol: Rol,
  kalit: string,
  filtrlar: Record<string, FiltrQiymati> = {}
): ManzilNatijasi {
  const s = SAHIFALAR.find((x) => x.kalit === kalit);
  if (!s) return { ok: false, sabab: 'sahifa_yoq', izoh: "Bunday sahifa yo'q" };
  if (!sahifaMumkinmi(rol, s)) {
    return { ok: false, sabab: 'ruxsat_yoq', izoh: "Bu sahifa sizning rolingiz uchun ochiq emas" };
  }

  const q = new URLSearchParams();
  for (const [k, qiymat] of Object.entries(filtrlar)) {
    if (qiymat === undefined || qiymat === null || qiymat === '' || qiymat === false) continue;
    /* `__proto__`, `constructor` kabi kalitlar ro'yxatda "bor" ko'rinmasligi uchun faqat O'Z kalitlar */
    const f = Object.prototype.hasOwnProperty.call(s.filtrlar, k) ? s.filtrlar[k] : undefined;
    if (!f) return { ok: false, sabab: 'filtr_notogri', izoh: `«${qidiruvniTozala(k, 30)}» filtri bu sahifada yo'q` };

    switch (f.tur.tur) {
      case 'tanlov': {
        const v = String(qiymat);
        if (!f.tur.qiymatlar.includes(v)) {
          return { ok: false, sabab: 'filtr_notogri', izoh: `«${k}» uchun ruxsat etilgan qiymatlar: ${f.tur.qiymatlar.join(', ')}` };
        }
        q.set(f.param, v);
        break;
      }
      case 'mahalla': {
        const v = String(qiymat);
        if (!MAHALLA_ID.test(v)) return { ok: false, sabab: 'filtr_notogri', izoh: 'Mahalla identifikatori noto‘g‘ri' };
        q.set(f.param, v);
        break;
      }
      case 'matn': {
        const v = qidiruvniTozala(String(qiymat), f.tur.max);
        if (v) q.set(f.param, v);
        break;
      }
      case 'bayroq':
        q.set(f.param, '1');
        break;
    }
  }

  const qs = q.toString();
  return { ok: true, url: qs ? `${s.yol}?${qs}` : s.yol, nomi: s.nomi };
}

/**
 * Hisobot tugmalari turgan sahifa: tahlil paneli (hokim, rahbar, administrator),
 * bo'lmasa operatsion panel (bandlik mutaxassisi). Mahalla tanlangan bo'lsa
 * sahifa shu hudud bilan ochiladi va hisobot ham o'sha hudud uchun yaratiladi.
 */
export function hisobotSahifasi(rol: Rol, mahallaId?: string): ManzilNatijasi {
  const kalit = rolSahifalari(rol).some((s) => s.kalit === 'tahlil_paneli') ? 'tahlil_paneli' : 'operatsion_panel';
  return sahifaManzili(rol, kalit, mahallaId ? { mahalla: mahallaId } : {});
}
