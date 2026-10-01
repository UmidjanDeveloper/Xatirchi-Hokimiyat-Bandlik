/**
 * Tahlil natijasini JSON ga saqlaydi — optimallashtirishdan
 * OLDIN va KEYIN solishtirish uchun. Natija bir xil bo'lmasa,
 * «tezlashdi» degan gapning hech qanday qiymati yo'q.
 *
 * DATABASE_URL=... npx tsx scripts/o-lchov/natija-saqla.ts /tmp/natija.json
 */
import { envYukla } from '../env-yukla';
envYukla();
import { writeFileSync } from 'node:fs';
import { prisma } from '../../src/lib/prisma';
import { tahlilniHisobla } from '../../src/lib/tahlil';

async function main() {
  const chiqish = process.argv[2] ?? '/tmp/natija.json';
  const mahallalar = await prisma.mahalla.findMany({ orderBy: { nomi: 'asc' }, take: 3, select: { id: true } });
  const natija: Record<string, unknown> = {};
  for (const davr of ['kun', 'oy', 'yil'] as const) {
    natija[`tuman|${davr}`] = await tahlilniHisobla(undefined, davr);
    for (const m of mahallalar) natija[`${m.id}|${davr}`] = await tahlilniHisobla(m.id, davr);
  }
  /* BigInt va Date ni JSON ga o'tkazish */
  writeFileSync(
    chiqish,
    JSON.stringify(natija, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 1)
  );
  console.log(`saqlandi: ${chiqish}  (${Object.keys(natija).length} ta natija)`);
  await prisma.$disconnect();
}
main();
