import { PrismaClient } from '@prisma/client';
import { ulanishSatri } from './ulanish-satri';

/**
 * Prisma mijozining yagona nusxasi (singleton).
 * Next.js dev rejimida "hot reload" har safar yangi ulanish ochib
 * yubormasligi uchun global obyektda saqlanadi.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const url = ulanishSatri();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(url ? { datasources: { db: { url } } } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
