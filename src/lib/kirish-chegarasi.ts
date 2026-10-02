import { prisma } from './prisma';
import { kalitXeshi, maxfiyniTozala } from './maxfiy';

/**
 * ============================================================
 *  KIRISH CHEGARASI — BAZADA (serverless nusxalari orasida UMUMIY)
 *
 *  `rate-limit.ts` dagi chegara har bir serverless nusxaning O'Z xotirasida
 *  turadi: hujumchi bir necha nusxaga tushsa, chegara nusxalar soniga
 *  ko'payadi, nusxa qayta ishga tushsa — nolga tushadi. Bu "taxminiy" edi.
 *
 *  Bu yerda urinishlar bazada saqlanadi va barcha nusxalar bitta hisobni
 *  ko'radi. Xotiradagi chegara OLDINGI to'siq sifatida qoladi (u bazani
 *  umuman bezovta qilmaydi); bu esa uning ortidagi QAT'IY chegara.
 *
 *  · Login va IP bazaga XOM holda yozilmaydi: faqat xesh.
 *  · Tekshirish va yozish bitta tranzaksiyada, kalit bo'yicha advisory
 *    qulf bilan: bir vaqtdagi ikki so'rov "oxirgi bo'sh joy"ni ikkalasi
 *    ham olib qo'ya olmaydi.
 *  · Rad etilgan urinish yozilmaydi (xotiradagi bilan bir xil): hujum
 *    davom etsa ham jadval o'smaydi.
 *  · Baza javob bermasa — FAIL-OPEN emas, balki xotiradagi chegara
 *    kuchda qoladi (u allaqachon o'tgan). Kirishning o'zi ham bazasiz
 *    ishlamaydi, shuning uchun bu amalda faqat qisqa uzilishlarni qoplaydi.
 * ============================================================
 */

export interface BazaChegarasiNatijasi {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export async function bazaChegarasi(
  kalit: string,
  limit: number,
  oynaMs: number,
  hozir = new Date()
): Promise<BazaChegarasiNatijasi> {
  const xesh = kalitXeshi(kalit);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${xesh}))`;
    const boshi = new Date(hozir.getTime() - oynaMs);
    const urinishlar = await tx.kirishUrinishi.findMany({
      where: { kalit: xesh, vaqt: { gt: boshi } },
      orderBy: { vaqt: 'asc' },
      take: limit,
      select: { vaqt: true },
    });
    if (urinishlar.length >= limit) {
      const eng = urinishlar[0].vaqt.getTime();
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, Math.ceil((eng + oynaMs - hozir.getTime()) / 1000)),
      };
    }
    await tx.kirishUrinishi.create({ data: { kalit: xesh, vaqt: hozir } });
    return { allowed: true, remaining: limit - urinishlar.length - 1, retryAfter: 0 };
  });
}

/** Muvaffaqiyatli kirishdan keyin kalitlarni tozalaydi */
export async function bazaChegarasiniTozala(...kalitlar: string[]): Promise<void> {
  await prisma.kirishUrinishi.deleteMany({ where: { kalit: { in: kalitlar.map(kalitXeshi) } } });
}

/**
 * Kalitning ENG OXIRGI urinishini bazadan olib tashlaydi (bitta urinishni
 * "hisobga olmaydi"). Muvaffaqiyatli login IP chegarasida o'z urinishini
 * qaytaradi, lekin boshqalarning xato urinishlarini O'CHIRMAYDI
 * (`bazaChegarasiniTozala` ni IP uchun ishlatish himoyani nolga tushirardi).
 * Tekshirish bilan bir xil advisory qulf: parallel urinish bilan to'qnashmaydi.
 */
export async function bazaChegarasiniQaytar(kalit: string): Promise<void> {
  const xesh = kalitXeshi(kalit);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${xesh}))`;
    const oxirgi = await tx.kirishUrinishi.findFirst({
      where: { kalit: xesh },
      orderBy: { vaqt: 'desc' },
      select: { id: true },
    });
    if (oxirgi) await tx.kirishUrinishi.delete({ where: { id: oxirgi.id } });
  });
}

/**
 * Login yo'li uchun: bazadagi chegara. Baza xatosi bo'lsa `null` qaytaradi
 * (chaqiruvchi xotiradagi natijaga tayanadi) va xato jurnalga yoziladi.
 */
export async function bazaChegarasiYumshoq(
  kalit: string,
  limit: number,
  oynaMs: number
): Promise<BazaChegarasiNatijasi | null> {
  try {
    return await bazaChegarasi(kalit, limit, oynaMs);
  } catch (e) {
    console.error('Kirish chegarasi bazasiga yozib bo‘lmadi:', maxfiyniTozala(e));
    return null;
  }
}
