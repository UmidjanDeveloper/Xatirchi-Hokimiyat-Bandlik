/**
 * ============================================================
 *  TAHLIL PANELI — VAQT O'LCHOVI (qo'lda ishga tushiriladi)
 *
 *  17-band: «O'lchovsiz "tezlashdi" deb hisobot bermaslik».
 *
 *  Bu skript `tahlilOl` ni KESHSIZ (har chaqiruvdan oldin
 *  keshni bo'shatib) bir necha marta chaqiradi va o'rtacha,
 *  eng sekin vaqtni chiqaradi. Hajm — mahalliy baza hajmi:
 *  production hajmini taqlid qilish uchun alohida bazada
 *  (`bandlik_yuk`) 40 000 xonadon va 15 000 ishsiz yaratiladi.
 *
 *  Ishga tushirish:
 *
 *    DATABASE_URL=postgresql://.../bandlik_yuk \
 *    npx tsx scripts/o-lchov/tahlil-vaqti.ts [takror]
 *
 *  DIQQAT: bu production bazasida ISHLATILMAYDI.
 * ============================================================
 */
import { envYukla } from '../env-yukla';
envYukla();

import { performance } from 'node:perf_hooks';
import { prisma } from '../../src/lib/prisma';
import * as tahlil from '../../src/lib/tahlil';

const TAKROR = Number(process.argv[2] ?? 5);

async function bir(mahallaId: string | undefined, davr: 'kun' | 'oy' | 'yil') {
  /*
   * Keshni bo'shatish yo'li yo'q (modul ichida yopiq), shuning
   * uchun har chaqiruvga NOYOB mahalla kaliti emas, balki
   * `tahlilniHisobla` ni to'g'ridan-to'g'ri chaqiramiz agar
   * eksport qilingan bo'lsa.
   */
  const f = (tahlil as unknown as Record<string, unknown>).tahlilniHisobla as
    | ((m?: string, d?: 'kun' | 'oy' | 'yil') => Promise<unknown>)
    | undefined;
  const t0 = performance.now();
  if (f) await f(mahallaId, davr);
  else await tahlil.tahlilOl(mahallaId, davr);
  return performance.now() - t0;
}

async function main() {
  const soni = {
    xonadon: await prisma.household.count(),
    ishsiz: await prisma.unemployedPerson.count(),
  };
  console.log(`Baza: ${soni.xonadon} xonadon, ${soni.ishsiz} ishsiz\n`);

  const mahalla = await prisma.mahalla.findFirst({ orderBy: { nomi: 'asc' }, select: { id: true } });

  for (const [nom, mid] of [
    ['tuman', undefined],
    ['bitta mahalla', mahalla?.id],
  ] as const) {
    for (const davr of ['oy'] as const) {
      /* Isitish: ulanish va rejalashtiruvchi keshi */
      await bir(mid, davr);
      const vaqtlar: number[] = [];
      for (let i = 0; i < TAKROR; i++) vaqtlar.push(await bir(mid, davr));
      vaqtlar.sort((a, b) => a - b);
      const o = vaqtlar.reduce((s, x) => s + x, 0) / vaqtlar.length;
      console.log(
        `${nom.padEnd(14)} davr=${davr}  o'rtacha ${o.toFixed(0).padStart(5)} ms   ` +
          `eng tez ${vaqtlar[0].toFixed(0)}   eng sekin ${vaqtlar[vaqtlar.length - 1].toFixed(0)}`
      );
    }
  }
  await prisma.$disconnect();
}

main();
