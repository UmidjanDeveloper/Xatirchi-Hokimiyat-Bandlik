import { randomBytes, randomUUID } from 'node:crypto';
import { prisma } from './prisma';
import { maxfiyniTozala, xatoXeshi, xatoXulosasi } from './maxfiy';
import {
  CRON_ISHLARI,
  NAVBAT_USHLANISH_SOATI,
  ishniBaholash,
  zaxiraniBaholash,
  type IshBaholash,
} from './tizim-nomlari';

export * from './tizim-nomlari';

/**
 * ============================================================
 *  TIZIM KUZATUVI: avtomatik ishlar, xatolar, xabar navbati, zaxira
 *
 *  Asosiy qoida: KUZATUV HECH QACHON ASOSIY ISHNI YIQITMAYDI.
 *  Jurnalga yozib bo'lmasa (baza uzildi, jadval hali yo'q) —
 *  asosiy amal baribir bajariladi, kuzatuv esa jim o'tib ketadi.
 *  Kuzatuvning o'zi ham "ko'rinmas" bo'lib qolmasligi uchun
 *  uning xatosi `console.error` ga yoziladi.
 *
 *  Jurnalga YOZILADIGAN HAR QANDAY MATN `maxfiyniTozala` dan o'tadi.
 * ============================================================
 */

const KUN_MS = 24 * 3600_000;

/** Kuzatiladigan identifikator: xodim xabar qilganda "iz: iz_3fa9c1b2e0" deydi */
export function izIdYarat(): string {
  return `iz_${randomBytes(5).toString('hex')}`;
}

/**
 * Xatoni jurnalga yozadi. Bir xil xato bitta qatorga yig'iladi (soni oshadi),
 * shunda jurnal takrorlar bilan to'lib ketmaydi. Qaytib kelgan xato yana
 * "ko'rilmagan" bo'ladi. HECH QACHON xato tashlamaydi.
 *
 * Qator yaratish va oshirish bitta SQL — parallel yozishlar ham to'g'ri sanaladi.
 */
export async function xatoniYoz(manba: string, xato: unknown, izId?: string | null): Promise<void> {
  try {
    const xabar = xatoXulosasi(xato);
    const m = manba.slice(0, 80);
    const xesh = xatoXeshi(m, xabar);
    await prisma.$executeRaw`
      INSERT INTO "TizimXatosi" ("id", "manba", "xesh", "xabar", "soni", "birinchiSana", "oxirgiSana", "oxirgiIzId", "korilgan")
      VALUES (${randomUUID()}, ${m}, ${xesh}, ${xabar}, 1, now(), now(), ${izId ?? null}, false)
      ON CONFLICT ("xesh") DO UPDATE SET
        "soni" = "TizimXatosi"."soni" + 1,
        "oxirgiSana" = now(),
        "oxirgiIzId" = COALESCE(EXCLUDED."oxirgiIzId", "TizimXatosi"."oxirgiIzId"),
        "korilgan" = false,
        "korilganSana" = NULL`;
  } catch (e) {
    /* Kuzatuvning o'z xatosi: yutiladi, lekin Vercel logida qoladi (matni tozalangan) */
    console.error('Xato jurnaliga yozib bo‘lmadi:', maxfiyniTozala(e));
  }
}

/**
 * 500 javobi uchun: xatoni jurnalga yozadi va xodimga IZ identifikatorini beradi.
 * Xodim "Xato (iz: iz_3fa9c1b2e0)" deb xabar qiladi — administrator shu bilan topadi.
 */
export async function serverXatosi(manba: string, e: unknown, mavjudIz?: string): Promise<{ izId: string }> {
  const izId = mavjudIz ?? izIdYarat();
  console.error(`[${izId}] ${manba}:`, maxfiyniTozala(e));
  /*
   * Jurnalga yozish "ko'p bo'lsa ham 1.5 soniya": xatoning sababi odatda aynan
   * baza bo'lganda (ulanib bo'lmadi), jurnal yozuvi ham baza ulanishini kutib
   * turib, xodimga xato javobini 10 soniyagacha kechiktirmasligi kerak.
   */
  await Promise.race([xatoniYoz(manba, e, izId), new Promise<void>((r) => setTimeout(r, 1500))]);
  return { izId };
}

export interface IshNatijasi<T> {
  natija: T;
  izId: string;
}

/**
 * Avtomatik ishni kuzatuv ostida bajaradi.
 *
 *  · boshlanganda "davom etmoqda" yozuvi yaratiladi
 *  · tugaganda "muvaffaqiyatli" va qisqa xulosa
 *  · xato bo'lsa "xato" + tozalangan matn + xato jurnaliga yozuv, keyin xato QAYTA tashlanadi
 *    (chaqiruvchi o'zi qaror qiladi — ish xatosi kuzatuv tufayli yutilmaydi)
 *
 * Kuzatuv yozuvi yozilmasa ham ish bajariladi.
 */
export async function ishniKuzat<T>(
  nomi: string,
  usul: 'cron' | 'qolda',
  ish: (iz: { izId: string }) => Promise<T>,
  xulosa?: (natija: T) => string
): Promise<T> {
  const izId = izIdYarat();
  let yozildi = false;
  try {
    await prisma.tizimIshi.create({ data: { nomi, usul, izId } });
    yozildi = true;
  } catch (e) {
    console.error('Ish izini boshlab bo‘lmadi:', maxfiyniTozala(e));
  }

  try {
    const natija = await ish({ izId });
    if (yozildi) {
      await prisma.tizimIshi
        .update({
          where: { izId },
          data: {
            holati: 'MUVAFFAQIYATLI',
            tugadi: new Date(),
            xulosa: xulosa ? maxfiyniTozala(xulosa(natija), 300) : null,
          },
        })
        .catch((e) => console.error('Ish izini yopib bo‘lmadi:', maxfiyniTozala(e)));
    }
    return natija;
  } catch (e) {
    if (yozildi) {
      await prisma.tizimIshi
        .update({
          where: { izId },
          data: { holati: 'XATO', tugadi: new Date(), xatoMatni: xatoXulosasi(e) },
        })
        .catch((x) => console.error('Ish izini yopib bo‘lmadi:', maxfiyniTozala(x)));
    }
    await xatoniYoz(`${usul}:${nomi}`, e, izId);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────
//  HOLATNI O'QISH
// ─────────────────────────────────────────────────────────────

export interface IshKorinishi {
  nomi: string;
  tavsif: string;
  yol: string;
  davriSoat: number;
  baho: IshBaholash['baho'];
  songgiMuvaffaqiyat: Date | null;
  songgiUrinish: Date | null;
  songgiXato: string | null;
  songgiXatoIz: string | null;
  songgiQolda: Date | null;
}

/** Jadval bo'yicha ishlarning holati: oxirgi muvaffaqiyat, kechikish, xato */
export async function ishlarHolati(hozir = new Date()): Promise<IshKorinishi[]> {
  const natija: IshKorinishi[] = [];
  for (const j of CRON_ISHLARI) {
    const [oxirgi, muvaffaqiyatli, songgiXato, qolda] = await Promise.all([
      prisma.tizimIshi.findFirst({
        where: { nomi: j.nomi, usul: 'cron' },
        orderBy: { boshlandi: 'desc' },
        select: { holati: true, boshlandi: true, tugadi: true },
      }),
      /* Oxirgi MUVAFFAQIYATLI alohida olinadi: so'nggi urinishlar ketma-ket xato bo'lsa ham u yo'qolmasin */
      prisma.tizimIshi.findFirst({
        where: { nomi: j.nomi, usul: 'cron', holati: 'MUVAFFAQIYATLI' },
        orderBy: { boshlandi: 'desc' },
        select: { holati: true, boshlandi: true, tugadi: true },
      }),
      prisma.tizimIshi.findFirst({
        where: { nomi: j.nomi, usul: 'cron', holati: 'XATO' },
        orderBy: { boshlandi: 'desc' },
        select: { xatoMatni: true, izId: true },
      }),
      prisma.tizimIshi.findFirst({
        where: { nomi: j.nomi, usul: 'qolda', holati: 'MUVAFFAQIYATLI' },
        orderBy: { boshlandi: 'desc' },
        select: { tugadi: true, boshlandi: true },
      }),
    ]);
    const yozuvlar = [oxirgi, muvaffaqiyatli].filter((y): y is NonNullable<typeof y> => y !== null);
    const b = ishniBaholash(yozuvlar, j.davriSoat, hozir);
    natija.push({
      ...j,
      baho: b.baho,
      songgiMuvaffaqiyat: b.songgiMuvaffaqiyat,
      songgiUrinish: b.songgiUrinish,
      /* Faqat oxirgi urinish xato bo'lsa ko'rsatamiz: eski, allaqachon tuzalgan xato "hozirgi" bo'lib turmasin */
      songgiXato: b.baho === 'XATODA' ? maxfiyniTozala(songgiXato?.xatoMatni ?? '') : null,
      songgiXatoIz: b.baho === 'XATODA' ? (songgiXato?.izId ?? null) : null,
      songgiQolda: qolda ? (qolda.tugadi ?? qolda.boshlandi) : null,
    });
  }
  return natija;
}

export interface NavbatHolati {
  kutilmoqda: number;
  /** Navbatda turib, kamida bir marta urinib ko'rilgan (qayta urinish kutilmoqda) */
  qaytaUrinish: number;
  xato: number;
  /** Eng eski kutilayotgan xabar necha soat turibdi */
  engEskiSoat: number | null;
  /** NAVBAT_USHLANISH_SOATI dan ortiq turgan */
  ushlanib: number;
  /** Ko'rsatish uchun: xato va qayta urinish kutayotganlar, matni tozalangan */
  royxat: {
    id: string;
    holati: 'KUTILMOQDA' | 'XATO';
    urinishlar: number;
    turi: string;
    sana: Date;
    xatoMatni: string | null;
  }[];
}

export async function navbatHolati(hozir = new Date()): Promise<NavbatHolati> {
  const ushlanishChegarasi = new Date(hozir.getTime() - NAVBAT_USHLANISH_SOATI * 3600_000);
  const [kutilmoqda, qaytaUrinish, xato, engEski, ushlanib, royxat] = await Promise.all([
    prisma.xabarnoma.count({ where: { holati: 'KUTILMOQDA' } }),
    prisma.xabarnoma.count({ where: { holati: 'KUTILMOQDA', urinishlar: { gt: 0 } } }),
    prisma.xabarnoma.count({ where: { holati: 'XATO' } }),
    prisma.xabarnoma.findFirst({
      where: { holati: 'KUTILMOQDA' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    prisma.xabarnoma.count({ where: { holati: 'KUTILMOQDA', createdAt: { lt: ushlanishChegarasi } } }),
    prisma.xabarnoma.findMany({
      where: { OR: [{ holati: 'XATO' }, { holati: 'KUTILMOQDA', urinishlar: { gt: 0 } }] },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { id: true, holati: true, urinishlar: true, turi: true, updatedAt: true, xatoMatni: true },
    }),
  ]);
  return {
    kutilmoqda,
    qaytaUrinish,
    xato,
    engEskiSoat: engEski ? Math.floor((hozir.getTime() - engEski.createdAt.getTime()) / 3600_000) : null,
    ushlanib,
    royxat: royxat.map((x) => ({
      id: x.id,
      holati: x.holati === 'XATO' ? 'XATO' : 'KUTILMOQDA',
      urinishlar: x.urinishlar,
      turi: x.turi,
      sana: x.updatedAt,
      /* Eski yozuvlar tozalanmagan bo'lishi mumkin (Telegram xatosida bot tokeni URL ichida) */
      xatoMatni: x.xatoMatni ? maxfiyniTozala(x.xatoMatni) : null,
    })),
  };
}

/** Qayta urinishga qaytariladigan xato xabarlarining eng katta yoshi (kun): eskirgan xabar fuqaroni chalg'itadi */
export const QAYTA_URINISH_KUNI = 3;

/**
 * Xato bilan tugagan xabarlarni navbatga qaytaradi (urinishlar 0 dan boshlanadi).
 * Faqat so'nggi QAYTA_URINISH_KUNI kundagilar: bir hafta oldingi "yangi ish o'rni"
 * xabarini bugun yuborish mahalla xodimini chalg'itadi.
 * Atomar: faqat hali "xato" turganlar o'zgaradi.
 */
export async function xatoliNavbatniQaytar(hozir = new Date()): Promise<number> {
  const chegara = new Date(hozir.getTime() - QAYTA_URINISH_KUNI * KUN_MS);
  const r = await prisma.xabarnoma.updateMany({
    where: { holati: 'XATO', createdAt: { gte: chegara } },
    data: { holati: 'KUTILMOQDA', urinishlar: 0 },
  });
  return r.count;
}

export interface XatoKorinishi {
  id: string;
  manba: string;
  xabar: string;
  soni: number;
  birinchiSana: Date;
  oxirgiSana: Date;
  oxirgiIzId: string | null;
  korilgan: boolean;
}

export interface XatolarHolati {
  korilmagan: number;
  oxirgi7Kun: number;
  royxat: XatoKorinishi[];
}

export async function xatolarHolati(hozir = new Date(), chegara = 30, izId?: string): Promise<XatolarHolati> {
  const hafta = new Date(hozir.getTime() - 7 * KUN_MS);
  const [korilmagan, oxirgi7Kun, royxat] = await Promise.all([
    prisma.tizimXatosi.count({ where: { korilgan: false } }),
    prisma.tizimXatosi.count({ where: { oxirgiSana: { gte: hafta } } }),
    prisma.tizimXatosi.findMany({
      where: izId ? { oxirgiIzId: izId } : undefined,
      orderBy: [{ korilgan: 'asc' }, { oxirgiSana: 'desc' }],
      take: chegara,
    }),
  ]);
  return {
    korilmagan,
    oxirgi7Kun,
    royxat: royxat.map((x) => ({
      id: x.id,
      manba: x.manba,
      /* Yozishda tozalangan, ammo ekranga chiqarishdan oldin yana: ikki qatlam */
      xabar: maxfiyniTozala(x.xabar),
      soni: x.soni,
      birinchiSana: x.birinchiSana,
      oxirgiSana: x.oxirgiSana,
      oxirgiIzId: x.oxirgiIzId,
      korilgan: x.korilgan,
    })),
  };
}

/** Xatoni (yoki hammasini) "ko'rildi" deb belgilaydi. Qaytgan xato yana ko'rilmagan bo'ladi. */
export async function xatolarniKorildi(id?: string): Promise<number> {
  const r = await prisma.tizimXatosi.updateMany({
    where: { korilgan: false, ...(id ? { id } : {}) },
    data: { korilgan: true, korilganSana: new Date() },
  });
  return r.count;
}

export interface ZaxiraKorinishi {
  baho: ReturnType<typeof zaxiraniBaholash>;
  royxat: { id: string; otkazilganSana: Date; natija: 'MUVAFFAQIYATLI' | 'XATO'; izoh: string; kim: string }[];
}

export async function zaxiraHolati(hozir = new Date()): Promise<ZaxiraKorinishi> {
  const royxat = await prisma.zaxiraTekshiruvi.findMany({
    orderBy: { otkazilganSana: 'desc' },
    take: 10,
    include: { kim: { select: { fullName: true } } },
  });
  /*
   * "Oxirgi sinov" deb ENG YANGI yozuv olinadi (muvaffaqiyatli bo'lsa ham, xato bo'lsa ham):
   * oxirgi sinov muvaffaqiyatsiz bo'lgan bo'lsa, undan oldingi eski muvaffaqiyat tinchlantirmasligi kerak.
   */
  const songgi = royxat[0] ? { otkazilganSana: royxat[0].otkazilganSana, natija: royxat[0].natija } : null;
  return {
    baho: zaxiraniBaholash(songgi, hozir),
    royxat: royxat.map((x) => ({
      id: x.id,
      otkazilganSana: x.otkazilganSana,
      natija: x.natija,
      izoh: x.izoh,
      kim: x.kim.fullName,
    })),
  };
}

/** Eski kirish urinishlari va ish izlarini tozalaydi (kunlik ish ichida chaqiriladi) */
export async function eskiYozuvlarniTozala(hozir = new Date()): Promise<{ urinish: number; iz: number }> {
  const kunOldin = new Date(hozir.getTime() - KUN_MS);
  const ikkiOyOldin = new Date(hozir.getTime() - 60 * KUN_MS);
  const [u, i] = await Promise.all([
    prisma.kirishUrinishi.deleteMany({ where: { vaqt: { lt: kunOldin } } }),
    /* Ish izlari 60 kun saqlanadi: "oxirgi muvaffaqiyat" har doim shu oynada bo'ladi */
    prisma.tizimIshi.deleteMany({ where: { boshlandi: { lt: ikkiOyOldin } } }),
  ]);
  return { urinish: u.count, iz: i.count };
}
