import { PrismaClient } from '@prisma/client';
import { ulanishSatri } from './ulanish-satri';

/**
 * ============================================================
 *  PRISMA MIJOZI VA ARXIV FILTRI
 *
 *  ── Nega filtr shu yerda ──
 *
 *  Xatlov o'chirilmaydi, arxivga olinadi (`arxivSanasi`). Demak
 *  arxivdagi yozuv HAMMA joyda ko'rinmasligi kerak: ro'yxatda
 *  ham, hisobotda ham, hokimning raqamlarida ham.
 *
 *  Kodda `household` va `unemployedPerson` ga 107 ta so'rov bor,
 *  25 ta faylda. Har biriga qo'lda `arxivSanasi: null` yozish
 *  mumkin edi - lekin bittasi unutilsa, arxivdagi xonadon
 *  hokimning kesimida sanalib turaverardi. Bu XATO emas, YOLG'ON
 *  bo'lardi: son to'g'ri ko'rinadi, aslida noto'g'ri.
 *
 *  Shuning uchun filtr BITTA joyda - mijozning o'zida. Unutish
 *  mumkin emas, chunki eslab qolish kerak bo'lgan joy yo'q.
 *
 *  ── Nima filtrlanadi ──
 *
 *  Ro'yxat va hisob amallari: `findMany`, `findFirst`, `count`,
 *  `aggregate`, `groupBy`. Ya'ni "nechta", "kimlar", "jami".
 *
 *  `findUnique` (aniq `id` bo'yicha) so'rovdan KEYIN tekshiriladi:
 *  arxivdagi bo'lsa `null` qaytadi va sahifa "topilmadi" deydi.
 *
 *  Yozish amallari (`create`, `update`, `delete`) TEGILMAYDI -
 *  arxivlashning o'zi ham `update` orqali bajariladi.
 *
 *  ── Arxivni KO'RISH kerak bo'lganda ──
 *
 *  Administratorning "Arxiv" bo'limi va qaytarish amali
 *  `xomPrisma` dan foydalanadi - unda filtr yo'q.
 * ============================================================
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const url = ulanishSatri();

/**
 * Filtrsiz mijoz.
 *
 * FAQAT arxivning o'zi bilan ishlaganda: ro'yxatini ko'rsatish,
 * qaytarish. Boshqa hech qayerda ishlatilmasin - aks holda
 * arxivdagi xonadon hisobotga qaytib kiradi.
 */
export const xomPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(url ? { datasources: { db: { url } } } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = xomPrisma;
}

/** Ro'yxat/hisob amallari - bularga shart qo'shiladi */
const FILTRLANADI = new Set(['findMany', 'findFirst', 'count', 'aggregate', 'groupBy']);

/** Arxivdagilarni chiqarib tashlaydigan qo'shimcha */
function arxivQoriqchisi(model: 'household' | 'unemployedPerson') {
  return {
    async $allOperations({
      operation,
      args,
      query,
    }: {
      operation: string;
      args: unknown;
      query: (a: unknown) => Promise<unknown>;
    }) {
      if (FILTRLANADI.has(operation)) {
        const a = (args ?? {}) as { where?: Record<string, unknown> };
        /*
         * Chaqiruvchi ataylab `arxivSanasi` yozgan bo'lsa -
         * tegmaymiz. Arxiv ro'yxati aynan shunday olinadi.
         */
        if (!a.where || !('arxivSanasi' in a.where)) {
          return query({ ...a, where: { ...(a.where ?? {}), arxivSanasi: null } });
        }
        return query(a);
      }

      const natija = await query(args);

      /*
       * `findUnique` ga shart qo'shib bo'lmaydi (u faqat yagona
       * kalitni qabul qiladi), shuning uchun natija TEKSHIRILADI.
       * Arxivdagi yozuvga to'g'ridan-to'g'ri havola bilan kirgan
       * odam ham uni ko'rmaydi.
       */
      if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
        const r = natija as { arxivSanasi?: Date | null } | null;
        if (r && r.arxivSanasi) return null;
      }
      return natija;
    },
  };
}

export const prisma = xomPrisma.$extends({
  query: {
    household: arxivQoriqchisi('household'),
    unemployedPerson: arxivQoriqchisi('unemployedPerson'),
  },
});

/**
 * Tranzaksiya ichidagi mijoz turi.
 *
 * `Prisma.TransactionClient` endi to'g'ri kelmaydi: mijoz
 * `$extends` bilan kengaytirilgan va uning tranzaksiyasi ham
 * kengaytirilgan turga ega. Yordamchi funksiyalar shuni qabul
 * qilsin.
 */
export type Tranzaksiya = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
