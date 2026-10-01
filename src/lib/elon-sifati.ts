import { lotinga } from './alifbo';
import { FAOL_ELON } from './elon-muddati';
import { prisma } from './prisma';
import { KUN_MS } from './bandlik-holatlari';
import { sanaOrali } from './oila-rejasi';

/**
 * ============================================================
 *  E'LON SIFATI VA YANGILIGI
 *
 *  Bo'sh ish o'rni e'loni 70 mahalla xodimiga yetib boradi va fuqaro
 *  uning ortidan yo'lga chiqadi. Eskirgan, to'liq bo'lmagan yoki
 *  chalg'ituvchi e'lon - bu odamning behuda yo'li.
 *
 *  ── Bu yerda hech narsa "hukm" emas ──
 *
 *  Quyidagi belgilar xodimga "shuni tekshiring" deydi. Tizim e'lonni
 *  o'zi o'chirmaydi va "firibgar" demaydi: gumonli so'z ro'yxati va
 *  maosh taqqoslash EVRISTIKA, ular ham xato qilishi mumkin. Qaror -
 *  e'lonni ko'rgan odamniki.
 *
 *  ── Maosh qanday "gumonli" bo'ladi ──
 *
 *  Mutlaq raqam (masalan "eng kam maosh") TIZIMGA YOZILMAGAN: bu
 *  qonunga bog'liq va o'zgarib turadi, o'ylab topilgan raqam esa
 *  yolg'on signal beradi. Shuning uchun faqat boshqa FAOL e'lonlarga
 *  nisbatan solishtiriladi: medianadan keskin farq qilsa - "tekshiring".
 * ============================================================
 */

export type SifatJiddiyligi = 'malumot' | 'ogohlik' | 'tekshirish';

export interface SifatBelgisi {
  kalit:
    | 'maosh-yoq'
    | 'talab-yoq'
    | 'telefon-yoq'
    | 'jadval-yoq'
    | 'muddati-yaqin'
    | 'muddatsiz'
    | 'yangilanmagan'
    | 'maosh-gumonli'
    | 'takror-telefon'
    | 'gumonli-soz';
  nomi: string;
  izoh: string;
  jiddiylik: SifatJiddiyligi;
}

/** Eslatma: shuncha kundan beri tegilmagan e'lon "yangilanmagan" */
export const YANGILANMAGAN_KUN = 21;
/** Muddatiga shuncha kun qolgan e'lon "muddati yaqin" */
export const MUDDATI_YAQIN_KUN = 3;
/** Maosh medianadan shuncha marta katta/kichik bo'lsa "gumonli" */
export const MAOSH_FARQI_MARTA = 4;
/** Taqqoslash uchun kamida shuncha e'lon kerak (kamroq bo'lsa - taqqoslanmaydi) */
export const TAQQOSLASH_ENG_KAM = 5;

/**
 * Chalg'ituvchi e'lonlarda uchraydigan iboralar (lotin yozuvida,
 * apostrofsiz). Matn lotinga o'tkaziladi, shuning uchun kirillcha
 * yozilgani ham topiladi.
 *
 * Bu ro'yxat to'liq emas va qasddan qisqa: har bir band "ish
 * beruvchi sizdan pul so'raydi" degan yagona belgiga ishora qiladi.
 */
const GUMONLI_IBORALAR = [
  'oldindan tolov',
  'oldindan pul',
  'tolov qiling',
  'pul otkazing',
  'karta raqami',
  'depozit',
  'zalog',
  'kafolatlangan daromad',
  'kafolatlangan maosh',
  'registratsiya tolovi',
  'royxatdan otish tolovi',
  'sotib olishingiz kerak',
  'предоплата',
] as const;

/** Taqqoslash uchun matnni tekislaydi: lotin, kichik harf, apostrofsiz */
export function tekisla(m: string): string {
  return lotinga(m)
    .toLowerCase()
    .replace(/[‘’ʻʼ`´′']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function gumonliIbora(matn: string): string | null {
  const t = tekisla(matn);
  for (const i of GUMONLI_IBORALAR) {
    if (t.includes(tekisla(i))) return i;
  }
  return null;
}

/** Telefonni taqqoslash uchun: faqat raqamlar, oxirgi 9 ta */
export function telefonKaliti(t: string | null | undefined): string | null {
  const r = (t ?? '').replace(/\D/g, '');
  return r.length >= 9 ? r.slice(-9) : null;
}

export interface SifatManbai {
  lavozim: string;
  talablar: string | null;
  telefon: string | null;
  maosh: bigint | number | null;
  jadvali: string | null;
  sharoitlari: string | null;
  amalQilishMuddati: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SifatKonteksti {
  hozir: Date;
  /** Faol e'lonlar maoshining medianasi (so'm), yetarli e'lon bo'lmasa - null */
  medianaMaosh: number | null;
  /** Shu telefon raqamini QAYSI BOSHQA korxona nomlari ishlatgan */
  telefonKorxonalari: number;
}

/** Bitta e'lonning belgilari - toza funksiya */
export function elonSifatiniBaho(e: SifatManbai, k: SifatKonteksti): SifatBelgisi[] {
  const b: SifatBelgisi[] = [];
  const bor = (x: string | null) => !!x && x.trim().length > 0;

  if (e.maosh === null || e.maosh === undefined) {
    b.push({
      kalit: 'maosh-yoq',
      nomi: 'Маош кўрсатилмаган',
      izoh: 'Фуқаро нега боришини билмайди: маош тақсимотга ва мосликка ҳам таъсир қилади',
      jiddiylik: 'ogohlik',
    });
  }
  if (!bor(e.talablar) || (e.talablar ?? '').trim().length < 10) {
    b.push({
      kalit: 'talab-yoq',
      nomi: 'Талаблар ёзилмаган ёки жуда қисқа',
      izoh: 'Мослик ҳисоби талабларга таянади — улар бўлмаса номзодлар аниқ танланмайди',
      jiddiylik: 'ogohlik',
    });
  }
  if (!bor(e.telefon)) {
    b.push({
      kalit: 'telefon-yoq',
      nomi: 'Телефон кўрсатилмаган',
      izoh: 'Фуқаро ёки ходим иш берувчига боғлана олмайди',
      jiddiylik: 'ogohlik',
    });
  }
  if (!bor(e.jadvali)) {
    b.push({
      kalit: 'jadval-yoq',
      nomi: 'Иш жадвали кўрсатилмаган',
      izoh: 'Болага қарайдиган ёки узоқдан қатнайдиган фуқаро учун жадвал ҳал қилувчи',
      jiddiylik: 'malumot',
    });
  }

  if (e.amalQilishMuddati === null) {
    b.push({
      kalit: 'muddatsiz',
      nomi: 'Муддатсиз эълон',
      izoh: 'Ўзи ёпилмайди: иш берувчи унутса, ўлик эълон турибди',
      jiddiylik: 'ogohlik',
    });
  } else {
    const qolgani = sanaOrali(e.amalQilishMuddati, k.hozir);
    if (qolgani >= 0 && qolgani <= MUDDATI_YAQIN_KUN) {
      b.push({
        kalit: 'muddati-yaqin',
        nomi: `Муддати ${qolgani === 0 ? 'бугун' : `${qolgani} кунда`} тугайди`,
        izoh: 'Иш берувчидан узайтириш ёки ёпиш керак',
        jiddiylik: 'ogohlik',
      });
    }
  }

  const tegilmagan = Math.floor((k.hozir.getTime() - e.updatedAt.getTime()) / KUN_MS);
  if (tegilmagan >= YANGILANMAGAN_KUN) {
    b.push({
      kalit: 'yangilanmagan',
      nomi: `${tegilmagan} кундан бери янгиланмаган`,
      izoh: 'Ўрин аллақачон тўлган бўлиши мумкин — иш берувчидан сўранг',
      jiddiylik: 'ogohlik',
    });
  }

  if (e.maosh !== null && e.maosh !== undefined && k.medianaMaosh && k.medianaMaosh > 0) {
    const m = Number(e.maosh);
    if (m >= k.medianaMaosh * MAOSH_FARQI_MARTA || (m > 0 && m * MAOSH_FARQI_MARTA <= k.medianaMaosh)) {
      b.push({
        kalit: 'maosh-gumonli',
        nomi: 'Маош бошқа эълонлардан кескин фарқ қилади',
        izoh: `Қолган фаол эълонлар медианаси ${Math.round(k.medianaMaosh / 1000).toLocaleString('ru-RU')} минг сўм — рақамни текширинг (хато ёки чалғитиш бўлиши мумкин)`,
        jiddiylik: 'tekshirish',
      });
    }
  }

  if (k.telefonKorxonalari >= 2) {
    b.push({
      kalit: 'takror-telefon',
      nomi: 'Бир телефон бир неча корхона номидан',
      izoh: 'Битта рақам иккита ва ундан ортиқ турли корхона эълонида турибди — алоқа воситачи бўлиши мумкин',
      jiddiylik: 'tekshirish',
    });
  }

  const ibora = gumonliIbora([e.lavozim, e.talablar ?? '', e.sharoitlari ?? ''].join(' '));
  if (ibora) {
    b.push({
      kalit: 'gumonli-soz',
      nomi: 'Пул сўрашга ўхшаш ибора бор',
      izoh: `Матнда «${ibora}» келади. Фуқарони пул тўлашга чақирадиган эълон ҳақиқий иш эълони эмас`,
      jiddiylik: 'tekshirish',
    });
  }

  return b;
}

export function medianaOl(a: number[]): number | null {
  if (a.length < TAQQOSLASH_ENG_KAM) return null;
  const t = [...a].sort((x, y) => x - y);
  const o = Math.floor(t.length / 2);
  return t.length % 2 ? t[o] : Math.round((t[o - 1] + t[o]) / 2);
}

export interface BaholiElon {
  id: string;
  lavozim: string;
  korxonaNomi: string;
  mahalla: string;
  ornlarSoni: number;
  amalQilishMuddati: Date | null;
  ishBeruvchidan: boolean;
  belgilar: SifatBelgisi[];
}

/**
 * Faol e'lonlarning sifati. Xodim qaysi e'londan boshlashni bilsin deb
 * eng ko'p "tekshirish" belgisi borlar tepada turadi.
 */
export async function elonlarSifati(
  mahallaId?: string,
  hozir = new Date(),
  take = 500
): Promise<BaholiElon[]> {
  const elonlar = await prisma.vacancy.findMany({
    where: { ...FAOL_ELON(hozir), ...(mahallaId ? { mahallaId } : {}) },
    orderBy: { updatedAt: 'asc' },
    take,
    select: {
      id: true,
      lavozim: true,
      korxonaNomi: true,
      talablar: true,
      telefon: true,
      maosh: true,
      jadvali: true,
      sharoitlari: true,
      ornlarSoni: true,
      amalQilishMuddati: true,
      createdAt: true,
      updatedAt: true,
      ishBeruvchiId: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });

  const mediana = medianaOl(elonlar.filter((e) => e.maosh !== null).map((e) => Number(e.maosh)));

  /* telefon → turli korxona nomlari */
  const telefonKorxona = new Map<string, Set<string>>();
  for (const e of elonlar) {
    const k = telefonKaliti(e.telefon);
    if (!k) continue;
    const set = telefonKorxona.get(k) ?? new Set<string>();
    set.add(tekisla(e.korxonaNomi));
    telefonKorxona.set(k, set);
  }

  return elonlar
    .map((e) => {
      const k = telefonKaliti(e.telefon);
      return {
        id: e.id,
        lavozim: e.lavozim,
        korxonaNomi: e.korxonaNomi,
        mahalla: e.mahalla.nomiKirill,
        ornlarSoni: e.ornlarSoni,
        amalQilishMuddati: e.amalQilishMuddati,
        ishBeruvchidan: e.ishBeruvchiId !== null,
        belgilar: elonSifatiniBaho(e, {
          hozir,
          medianaMaosh: mediana,
          telefonKorxonalari: k ? (telefonKorxona.get(k)?.size ?? 0) : 0,
        }),
      };
    })
    .sort(
      (a, b) =>
        b.belgilar.filter((x) => x.jiddiylik === 'tekshirish').length -
          a.belgilar.filter((x) => x.jiddiylik === 'tekshirish').length ||
        b.belgilar.length - a.belgilar.length
    );
}
