/**
 * ============================================================
 *  РАҚАМЛАРНИ СОЛИШТИРИШ
 *
 *  Ишга тушириш:
 *    npx tsx scripts/raqam-tekshir.ts
 *    DATABASE_URL="<production>" npx tsx scripts/raqam-tekshir.ts
 *
 *  2026-йил 26-сентябрда ҳоким панелдаги рақамга шубҳа
 *  билдирди: «панелда 41 та ишсиз, хатловда эса 70 дан ортиқ».
 *
 *  Иккови ҳам тўғри эди. «Ишсиз» деган сўз тизимда УЧТА
 *  бошқа-бошқа нарсани англатарди ва панел қайси бирини
 *  кўрсатаётганини айтмасди.
 *
 *  Бу скрипт учаласини ёнма-ён қўяди ва фарқни изоҳлайди.
 *  Ҳисобот жўнатишдан ОЛДИН ишга туширилади.
 * ============================================================
 */
import { PrismaClient } from '@prisma/client';

const son = (n: number) => n.toLocaleString('ru-RU');

async function main() {
  const p = new PrismaClient();

  const [yozuv, anketa, baza, xonadon, qoralama] = await Promise.all([
    p.unemployedPerson.count(),
    p.household.aggregate({
      _sum: { ishsizlarSoni: true },
      where: { holati: { not: 'QORALAMA' } },
    }),
    p.mahalla.aggregate({ _sum: { ishsiz: true } }),
    p.household.count({ where: { holati: { not: 'QORALAMA' } } }),
    p.household.count({ where: { holati: 'QORALAMA' } }),
  ]);

  const topilgan = anketa._sum.ishsizlarSoni ?? 0;
  const bazaIshsiz = baza._sum.ishsiz ?? 0;
  const anketasiz = Math.max(0, topilgan - yozuv);

  console.log('\n═══ ИШСИЗЛАР — УЧТА РАҚАМ ═══\n');
  console.log(`  Рўйхатдаги (хатловдан эмас) : ${son(bazaIshsiz)}`);
  console.log(`  Хатловда ТОПИЛГАН           : ${son(topilgan)}   <- ҳокимнинг саволи шу`);
  console.log(`  Шахсий анкетаси БОР         : ${son(yozuv)}`);
  console.log(`  ── анкетаси ЙЎҚ             : ${son(anketasiz)}   <- суҳбат ўтказилмаган`);
  console.log(`\n  Хатловдан ўтган хонадон     : ${son(xonadon)} (${son(qoralama)} қоралама)`);

  /* ── Хонадон кесимида мослик ── */
  const lar = await p.household.findMany({
    where: { holati: { not: 'QORALAMA' } },
    select: {
      id: true,
      oilaBoshligi: true,
      mahalla: { select: { nomiKirill: true } },
      ishsizlarSoni: true,
      _count: { select: { ishsizlar: true } },
    },
  });

  const nomos = lar.filter((h) => (h.ishsizlarSoni ?? 0) !== h._count.ishsizlar);
  console.log(`\n═══ МОСЛИК ═══\n`);
  console.log(`  Мос келган хонадон   : ${son(lar.length - nomos.length)} / ${son(lar.length)}`);
  console.log(`  Мос келмаган         : ${son(nomos.length)}`);

  if (nomos.length) {
    /* Маҳалла кесимида — қайси МФЙ да иш кўп қолган */
    const mfy = new Map<string, { xonadon: number; farq: number }>();
    for (const h of nomos) {
      const nomi = h.mahalla.nomiKirill;
      const bor = mfy.get(nomi) ?? { xonadon: 0, farq: 0 };
      bor.xonadon += 1;
      bor.farq += Math.max(0, (h.ishsizlarSoni ?? 0) - h._count.ishsizlar);
      mfy.set(nomi, bor);
    }
    const tartib = [...mfy.entries()].sort((a, b) => b[1].farq - a[1].farq).slice(0, 10);
    console.log(`\n  Энг кўп иш қолган МФЙ (юқоридан ўнта):`);
    for (const [nomi, v] of tartib) {
      console.log(`    ${nomi.padEnd(22)} ${son(v.farq)} та анкета (${v.xonadon} хонадонда)`);
    }
  }

  /*
   * Тескари ҳолат: ёзув кўп, рақам кам. Бу ҲАҚИҚИЙ хато —
   * анкетада «0 та ишсиз» деб ёзилган-у, ёзувлар бор.
   */
  const teskari = lar.filter((h) => h._count.ishsizlar > (h.ishsizlarSoni ?? 0));
  if (teskari.length) {
    console.log(`\n  ⚠ Ёзув сони рақамдан КЎП (${son(teskari.length)} хонадон) — текшириш керак:`);
    for (const h of teskari.slice(0, 5)) {
      console.log(
        `    ${h.mahalla.nomiKirill} · ${h.oilaBoshligi}: рақам=${h.ishsizlarSoni} ёзув=${h._count.ishsizlar}`
      );
    }
  }

  console.log('\n═══ ХУЛОСА ═══\n');
  if (anketasiz === 0 && !nomos.length) {
    console.log('  Рақамлар тўлиқ мос. Ҳисоботни жўнатса бўлади.');
  } else {
    console.log(`  Хатлов ${son(topilgan)} та ишсиз топган.`);
    console.log(`  ${son(yozuv)} тасининг шахсий анкетаси тўлдирилган.`);
    console.log(`  ${son(anketasiz)} таси билан суҳбат ўтказилмаган — бу ХАТО ЭМАС,`);
    console.log('  бажарилмаган иш. Ҳисоботда иккала рақам ҳам кўрсатилади.');
  }
  console.log('');

  await p.$disconnect();
}

main();
