import { prisma } from '@/lib/prisma';
import { kunlikLimit, oylikUmumiyLimit, ovozKunlikLimit, type AgentRoli } from './ruxsat';

/**
 * ============================================================
 *  HUDHUD: FOYDALANISH HISOBI VA XARAJAT LIMITI
 *
 *  GPT §18: "Xarajat limitlari va foydalanish hisobi bo'lsin".
 *
 *  · Suhbat MATNI saqlanmaydi: faqat sonlar (so'rov, token, xato).
 *  · Kunlik limit ATOMAR band qilinadi: bitta SQL ichida "agar limit
 *    to'lmagan bo'lsa oshir". Tekshirib-so'ng-yozish bo'lsa, bir vaqtdagi
 *    ikki so'rov "oxirgi bo'sh joy"ni ikkalasi ham olib qo'yardi.
 *  · Oylik umumiy to'siq TAXMINIY: tekshiruv va band qilish orasida bir
 *    necha so'rov ortiqcha o'tishi mumkin. Byudjetni to'sish uchun yetarli,
 *    aniq hisob-kitob uchun emas.
 *  · Kun — TOSHKENT kuni (UTC+5): xodim kechqurun yozsa, "ertangi" hisobga
 *    tushmasin.
 * ============================================================
 */

const TOSHKENT_SOAT_MS = 5 * 3600_000;

/** Toshkent sanasi, "YYYY-MM-DD" */
export function toshkentSanasi(hozir: Date = new Date()): string {
  return new Date(hozir.getTime() + TOSHKENT_SOAT_MS).toISOString().slice(0, 10);
}

/** Oyning birinchi kuni (Toshkent), "YYYY-MM-01" */
function oyBoshi(hozir: Date): string {
  return `${toshkentSanasi(hozir).slice(0, 7)}-01`;
}

export interface BandNatijasi {
  ruxsat: boolean;
  sabab?: 'kunlik' | 'oylik';
  /** Bugun yana nechta model xabari qoldi */
  qolgan: number;
}

/**
 * Bitta model xabarini band qiladi.
 * Limit to'lgan bo'lsa `ruxsat: false` va hech narsa oshirilmaydi.
 */
export async function modelXabariniBandQil(
  userId: string,
  rol: AgentRoli,
  hozir: Date = new Date()
): Promise<BandNatijasi> {
  const limit = kunlikLimit(rol);
  const kun = toshkentSanasi(hozir);

  /* Oylik umumiy to'siq (taxminiy, yuqoridagi izohga qarang) */
  const oylik = await prisma.$queryRaw<{ jami: number }[]>`
    SELECT COALESCE(SUM("sorovlar"), 0)::int AS jami
    FROM "AgentFoydalanish"
    WHERE "kun" >= ${oyBoshi(hozir)}::date
  `;
  if ((oylik[0]?.jami ?? 0) >= oylikUmumiyLimit()) {
    return { ruxsat: false, sabab: 'oylik', qolgan: 0 };
  }

  const qator = await prisma.$queryRaw<{ sorovlar: number }[]>`
    INSERT INTO "AgentFoydalanish" ("id", "userId", "kun", "sorovlar", "updatedAt")
    VALUES (${yangiId()}, ${userId}, ${kun}::date, 1, ${hozir})
    ON CONFLICT ("userId", "kun") DO UPDATE
      SET "sorovlar" = "AgentFoydalanish"."sorovlar" + 1, "updatedAt" = ${hozir}
      WHERE "AgentFoydalanish"."sorovlar" < ${limit}
    RETURNING "sorovlar"
  `;

  if (qator.length === 0) return { ruxsat: false, sabab: 'kunlik', qolgan: 0 };
  return { ruxsat: true, qolgan: Math.max(0, limit - qator[0].sorovlar) };
}

/** Band qilingan xabarni qaytaradi (model chaqirilmay qolganda — masalan, kalit yo'q) */
export async function modelXabariniQaytar(userId: string, hozir: Date = new Date()): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "AgentFoydalanish"
    SET "sorovlar" = GREATEST("sorovlar" - 1, 0)
    WHERE "userId" = ${userId} AND "kun" = ${toshkentSanasi(hozir)}::date
  `;
}

export interface Hisob {
  tokenlar?: number;
  qoidali?: number;
  xatolar?: number;
  ovozSoniya?: number;
}

/** Sonlarni qo'shadi (qator bo'lmasa yaratadi). Matn yozilmaydi. */
export async function hisobniYoz(userId: string, h: Hisob, hozir: Date = new Date()): Promise<void> {
  const t = Math.max(0, Math.round(h.tokenlar ?? 0));
  const q = Math.max(0, Math.round(h.qoidali ?? 0));
  const x = Math.max(0, Math.round(h.xatolar ?? 0));
  const o = Math.max(0, Math.round(h.ovozSoniya ?? 0));
  if (t + q + x + o === 0) return;
  await prisma.$executeRaw`
    INSERT INTO "AgentFoydalanish" ("id", "userId", "kun", "tokenlar", "qoidali", "xatolar", "ovozSoniya", "updatedAt")
    VALUES (${yangiId()}, ${userId}, ${toshkentSanasi(hozir)}::date, ${t}, ${q}, ${x}, ${o}, ${hozir})
    ON CONFLICT ("userId", "kun") DO UPDATE SET
      "tokenlar" = "AgentFoydalanish"."tokenlar" + ${t},
      "qoidali" = "AgentFoydalanish"."qoidali" + ${q},
      "xatolar" = "AgentFoydalanish"."xatolar" + ${x},
      "ovozSoniya" = "AgentFoydalanish"."ovozSoniya" + ${o},
      "updatedAt" = ${hozir}
  `;
}

/** Server STT uchun: bugungi limit qolganmi va band qilish (soniya) */
export async function ovozniBandQil(
  userId: string,
  soniya: number,
  hozir: Date = new Date()
): Promise<{ ruxsat: boolean; qolgan: number }> {
  const limit = ovozKunlikLimit();
  const s = Math.max(1, Math.min(60, Math.round(soniya)));
  /*
   * `ON CONFLICT ... WHERE` limitni FAQAT mavjud qatorni yangilashda tekshiradi;
   * kunning BIRINCHI yozuvi (qator hali yo'q) unga tushmaydi. Shuning uchun
   * bitta yozuv limitdan katta bo'lsa — oldindan rad etamiz.
   */
  if (s > limit) return { ruxsat: false, qolgan: 0 };
  const qator = await prisma.$queryRaw<{ ovozSoniya: number }[]>`
    INSERT INTO "AgentFoydalanish" ("id", "userId", "kun", "ovozSoniya", "updatedAt")
    VALUES (${yangiId()}, ${userId}, ${toshkentSanasi(hozir)}::date, ${s}, ${hozir})
    ON CONFLICT ("userId", "kun") DO UPDATE
      SET "ovozSoniya" = "AgentFoydalanish"."ovozSoniya" + ${s}, "updatedAt" = ${hozir}
      WHERE "AgentFoydalanish"."ovozSoniya" + ${s} <= ${limit}
    RETURNING "ovozSoniya"
  `;
  if (qator.length === 0) return { ruxsat: false, qolgan: 0 };
  return { ruxsat: true, qolgan: Math.max(0, limit - qator[0].ovozSoniya) };
}

/**
 * Matnga aylanmagan yozuvning soniyalarini qaytaradi: provayder xato bergan yoki
 * jim yozuv chiqqan bo'lsa, xodimning kunlik ovoz limiti behuda sarflanmasin.
 * `ovozniBandQil` bilan bir xil yaxlitlash (1..60 soniya).
 */
export async function ovozniQaytar(userId: string, soniya: number, hozir: Date = new Date()): Promise<void> {
  const s = Math.max(1, Math.min(60, Math.round(soniya)));
  await prisma.$executeRaw`
    UPDATE "AgentFoydalanish"
    SET "ovozSoniya" = GREATEST("ovozSoniya" - ${s}, 0)
    WHERE "userId" = ${userId} AND "kun" = ${toshkentSanasi(hozir)}::date
  `;
}

/** Bugungi hisob (xodim ko'rishi uchun) */
export async function bugungiHisob(userId: string, rol: AgentRoli, hozir: Date = new Date()) {
  const q = await prisma.$queryRaw<{ sorovlar: number; tokenlar: number }[]>`
    SELECT "sorovlar", "tokenlar" FROM "AgentFoydalanish"
    WHERE "userId" = ${userId} AND "kun" = ${toshkentSanasi(hozir)}::date
  `;
  const limit = kunlikLimit(rol);
  const ishlatilgan = q[0]?.sorovlar ?? 0;
  return { limit, ishlatilgan, qolgan: Math.max(0, limit - ishlatilgan), tokenlar: q[0]?.tokenlar ?? 0 };
}

/* cuid o'rniga: uuid — jadvalda faqat noyob matn kerak */
function yangiId(): string {
  return `ag_${crypto.randomUUID().replace(/-/g, '')}`;
}

