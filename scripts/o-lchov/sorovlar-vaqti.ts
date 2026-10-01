/**
 * Tahlil panelidagi har bir so'rovning ALOHIDA vaqti.
 * Qaysi biri sekinligini taxmin qilmaslik uchun.
 *
 * DATABASE_URL=.../bandlik_yuk npx tsx scripts/o-lchov/sorovlar-vaqti.ts
 */
import { envYukla } from '../env-yukla';
envYukla();
import { performance } from 'node:perf_hooks';
import { prisma } from '../../src/lib/prisma';

async function vaqt<T>(nom: string, f: () => Promise<T>, takror = 5) {
  await f(); // isitish
  const t: number[] = [];
  let natija: T | undefined;
  for (let i = 0; i < takror; i++) {
    const t0 = performance.now();
    natija = await f();
    t.push(performance.now() - t0);
  }
  const o = t.reduce((s, x) => s + x, 0) / t.length;
  const hajm = Array.isArray(natija) ? `${natija.length} qator` : '';
  console.log(`${nom.padEnd(52)} ${o.toFixed(0).padStart(5)} ms  ${hajm}`);
  return o;
}

async function main() {
  const h = { holati: { not: 'QORALAMA' as const } };
  const r: Record<string, number> = {};
  r.xonadonSana = await vaqt('household.findMany { createdAt }  (butun tarix)', () =>
    prisma.household.findMany({ where: h, select: { createdAt: true } })
  );
  r.ishsizSana = await vaqt('unemployedPerson.findMany { createdAt }', () =>
    prisma.unemployedPerson.findMany({ select: { createdAt: true } })
  );
  r.joylashSana = await vaqt('unemployedPerson.findMany { ishgaKirganSana }', () =>
    prisma.unemployedPerson.findMany({ where: { ishgaKirganSana: { not: null } }, select: { ishgaKirganSana: true } })
  );
  r.groupIshsiz = await vaqt('unemployedPerson.groupBy (mahalla, holat)', () =>
    prisma.unemployedPerson.groupBy({ by: ['mahallaId', 'holati'], _count: true })
  );
  r.groupXonadon = await vaqt('household.groupBy (mahalla) + sum', () =>
    prisma.household.groupBy({ by: ['mahallaId'], where: h, _count: true, _sum: { ishsizlarSoni: true } })
  );
  r.moliya = await vaqt('household.findMany { moliya }', () =>
    prisma.household.findMany({ where: { ...h, moliyaEhtiyoji: true }, select: { talabQilinganMablag: true, mablagYonalishi: true } })
  );
  const jami = r.xonadonSana + r.ishsizSana + r.joylashSana;
  console.log(`\nUchta «sana» so'rovi jami: ${jami.toFixed(0)} ms`);
  await prisma.$disconnect();
}
main();
