import type { ItVaucherHolati } from '@prisma/client';
import { prisma } from './prisma';
import { IT_VAUCHER_NATIJASI } from './constants';

/**
 * ============================================================
 *  IT-ШАҲАРЧА ВАУЧЕРИ — ЗАНЖИР
 *
 *  Фуқаро IT ўрганмоқчи. Бандлик маркази унга ваучер беради,
 *  фуқаро IT-шаҳарчада ТЕКИНГА ўқийди, касб эгаллайди ва ишга
 *  жойлашади.
 *
 *  Занжир беш ҳалқадан иборат ва ҲАР БИРИ кўриниб туради:
 *
 *    1. ХАТЛОВ — маҳалла ходими эшик олдида «IT ўрганмоқчи»
 *       деб белгилайди (`itShaharchaVaucheri`).
 *    2. НАВБАТ — бандлик панелида «истак бор, ваучер йўқ»
 *       рўйхати чиқади. Занжирнинг УЗИЛАДИГАН жойи шу ерда:
 *       илгари белги қўйиларди ва шу билан тугарди.
 *    3. ВАУЧЕР — бандлик ходими рақам ва йўналиш билан беради.
 *    4. ЎҚИШ — ҳолати янгиланади: ўқимоқда → тугатди.
 *    5. НАТИЖА — ишга жойлашди. Ёки жойлашмади — бу ҳам
 *       кўринади, яширилмайди.
 *
 *  ── Нега яширилмайди ──
 *
 *  Ҳокимга «40 та ваучер берилди» деган рақамнинг ўзи ҳеч
 *  нарса билдирмайди. «40 та берилди, 28 таси тугатди, 15 таси
 *  ишга жойлашди, 7 таси ташлаб кетди» — мана бу қарорга асос
 *  бўлади: ё гуруҳ ёмон, ё йўналиш нотўғри танланган, ё ваучер
 *  нотўғри одамга берилган.
 * ============================================================
 */

/** Natija chiqqan holatlar - to'plamga aylantirilgan */
const NATIJALI = new Set<string>(IT_VAUCHER_NATIJASI);

/**
 * Keyingi vaucher raqami: `IT-2026-0001`.
 *
 * Yil bilan boshlanadi, chunki hisobot yillik yuritiladi va
 * qog'ozdagi raqam bilan bazadagi raqam bir xil bo'lishi kerak.
 *
 * Raqam eng katta mavjudidan olinadi, SANOQDAN emas: bekor
 * qilingan vaucher o'chirilmaydi, lekin agar biror yozuv baribir
 * o'chirilsa, sanoq eski raqamni qayta berib yuborardi va
 * `raqami` ustunidagi UNIQUE cheklovi so'rovni rad qilardi.
 */
export async function keyingiRaqam(): Promise<string> {
  const yil = new Date().getFullYear();
  const prefiks = `IT-${yil}-`;

  const oxirgi = await prisma.itVaucher.findFirst({
    where: { raqami: { startsWith: prefiks } },
    orderBy: { raqami: 'desc' },
    select: { raqami: true },
  });

  const son = oxirgi ? Number(oxirgi.raqami.slice(prefiks.length)) : 0;
  return `${prefiks}${String((Number.isFinite(son) ? son : 0) + 1).padStart(4, '0')}`;
}

/** Bitta mahalla yoki butun tuman bo'yicha vaucher hisobi */
export interface VaucherHisobi {
  /** Jami berilgan */
  jami: number;
  /** Holat kesimida - enum tartibida */
  holatlar: { holati: ItVaucherHolati; soni: number }[];
  /** Yo'nalish kesimida, ko'pdan ozga */
  yonalishlar: { yonalish: string; soni: number }[];
  /** Kursni tugatgan yoki ishga joylashgan */
  natijali: number;
  /** Kasb egallab, ishga ham joylashgan */
  ishgaJoylashgan: number;
  /**
   * ISTAGI bor, lekin vaucher HALI BERILMAGAN fuqarolar soni.
   * Zanjirning uzilgan joyi - bandlik paneli shu raqamni
   * ro'yxat bilan birga ko'rsatadi.
   */
  navbatda: number;
}

/**
 * Vaucher hisobi.
 *
 * `mahallaId` berilsa - faqat o'sha MFY. Berilmasa - butun tuman.
 * Mahalla xodimi sahifasida shu funksiya AYNAN o'z mahallasi
 * bilan chaqiriladi, shuning uchun qo'shni MFY ning bitta ham
 * vaucheri u yerga tushmaydi.
 */
export async function vaucherHisobi(mahallaId?: string): Promise<VaucherHisobi> {
  const filtr = mahallaId ? { mahallaId } : {};

  const [holatlar, yonalishlar, navbatda] = await Promise.all([
    prisma.itVaucher.groupBy({
      by: ['holati'],
      where: filtr,
      _count: true,
    }),
    prisma.itVaucher.groupBy({
      by: ['yonalish'],
      where: filtr,
      _count: true,
    }),
    /*
     * Navbat: istagi bor, lekin BITTA HAM vaucheri yo'q.
     *
     * "Bitta ham yo'q" deyilishiga sabab: bekor qilingan vaucher
     * ham yozuv bo'lib qoladi. Agar shunchaki "vaucheri yo'q"
     * deb qaralsa, bekor qilingan odam navbatga qaytmasdi -
     * holbuki aynan u qaytishi kerak.
     */
    prisma.unemployedPerson.count({
      where: {
        ...filtr,
        itShaharchaVaucheri: true,
        itVaucherlar: {
          none: { holati: { notIn: ['BEKOR_QILINDI', 'TASHLAB_KETDI'] } },
        },
      },
    }),
  ]);

  const soni = (h: ItVaucherHolati) => holatlar.find((x) => x.holati === h)?._count ?? 0;

  return {
    jami: holatlar.reduce((s, h) => s + h._count, 0),
    holatlar: holatlar
      .map((h) => ({ holati: h.holati, soni: h._count }))
      .sort((a, b) => b.soni - a.soni),
    yonalishlar: yonalishlar
      .map((y) => ({ yonalish: y.yonalish, soni: y._count }))
      .sort((a, b) => b.soni - a.soni),
    natijali: holatlar.reduce((s, h) => (NATIJALI.has(h.holati) ? s + h._count : s), 0),
    ishgaJoylashgan: soni('ISHGA_JOYLASHDI'),
    navbatda,
  };
}

/** Navbatdagi bitta fuqaro - bandlik xodimi shu ro'yxatdan ishlaydi */
export interface Navbatchi {
  id: string;
  fish: string;
  telefon: string | null;
  mahallaNomi: string;
  /** Fuqaroning O'Z so'zi - qaysi kasbni o'rganmoqchi */
  organmoqchiKasb: string | null;
  /** Xatlovdan qancha vaqt o'tdi - kunlarda */
  kutgani: number;
}

/**
 * Vaucher kutayotganlar.
 *
 * Eng UZOQ kutgani tepada turadi. Sabab oddiy: bandlik xodimi
 * ro'yxatning tepasidan ishlaydi, va tepada eng ko'p unutilgan
 * odam turishi kerak, eng yangisi emas.
 */
export async function vaucherNavbati(
  mahallaId?: string,
  chegara = 50
): Promise<Navbatchi[]> {
  const odamlar = await prisma.unemployedPerson.findMany({
    where: {
      ...(mahallaId ? { mahallaId } : {}),
      itShaharchaVaucheri: true,
      itVaucherlar: { none: { holati: { notIn: ['BEKOR_QILINDI', 'TASHLAB_KETDI'] } } },
    },
    orderBy: { createdAt: 'asc' },
    take: chegara,
    select: {
      id: true,
      fish: true,
      telefon: true,
      organmoqchiKasb: true,
      createdAt: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });

  const hozir = Date.now();
  return odamlar.map((o) => ({
    id: o.id,
    fish: o.fish,
    telefon: o.telefon,
    mahallaNomi: o.mahalla.nomiKirill,
    organmoqchiKasb: o.organmoqchiKasb,
    kutgani: Math.floor((hozir - o.createdAt.getTime()) / 86_400_000),
  }));
}

/**
 * Holat o'zgarganda qaysi sana yoziladi.
 *
 * Sanani qo'lda so'ramaymiz: xodim holatni o'zgartirganda
 * voqea AYNAN shu kuni ro'y bergan bo'ladi. Bir joyda turgani
 * muhim - aks holda "tugatdi" deb belgilanib, `tugatganSana`
 * bo'sh qolgan yozuvlar paydo bo'lardi va hisobotdagi muddat
 * hisobi buzilardi.
 */
export function holatSanasi(holati: ItVaucherHolati): Record<string, Date> {
  const hozir = new Date();
  switch (holati) {
    case 'OQIMOQDA':
      return { boshlanganSana: hozir };
    case 'TUGATDI':
      return { tugatganSana: hozir };
    case 'ISHGA_JOYLASHDI':
      return { ishgaKirganSana: hozir };
    default:
      return {};
  }
}
