/**
 * ============================================================
 *  ҲИСОБОТНИ ФАЙЛГА ЧИҚАРИШ — кўз билан текшириш учун
 *
 *  Ишга тушириш:
 *    npx tsx scripts/hisobot-chiqar.ts [чиқиш-жойи]
 *
 *  Нега керак: диаграмма ўлчами, шрифт ёки рақам ўзгарганда
 *  файлни КЎРИШ керак. Браузердан юклаб олиш ҳар сафар кириш,
 *  панелни очиш ва тугмани босишни талаб қилади — ва энг
 *  муҳими, шошилганда ўтказиб юборилади.
 *
 *  Бу скрипт ходим юклаб оладиган файлнинг НУСХАСИНИ эмас,
 *  ЎЗИНИ чиқаради: `pdfBayt` ва `excelBayt` — браузердаги
 *  тугма ҳам айнан шу иккитасини чақиради. Фарқ фақат
 *  сақлашда: браузерда `<a download>`, бу ерда `writeFileSync`.
 *
 *  Диаграммалар рўйхати ҳам босиб чиқарилади — қайси тур неча
 *  нуқтадан иборатлигини кўриб, ҳисоботни очмасдан ҳам
 *  сиғмаслик хавфини сезиш мумкин.
 * ============================================================
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const JOY = resolve(process.argv[2] ?? '/tmp/hisobot');

async function main() {
  mkdirSync(JOY, { recursive: true });

  const { hisobotOl } = await import('../src/lib/hisobot/malumot');
  const { pdfBayt } = await import('../src/lib/hisobot/pdf');
  const { excelBayt } = await import('../src/lib/hisobot/excel');

  console.log('Маълумот йиғилмоқда…');
  const hisobot = await hisobotOl({
    qamrov: { turi: 'tuman' },
    tayyorlagan: 'Текширув',
    lotin: false,
    aiXulosa: false,
  });

  console.log(`  ${hisobot.qamrovNomi} · ${hisobot.bolimlar.length} бўлим`);

  const diagrammalar = hisobot.bolimlar.flatMap((b) => b.diagrammalar ?? []);
  console.log(`\n  ${diagrammalar.length} диаграмма:`);
  for (const d of diagrammalar) {
    const nuqta = String(d.nomlar.length).padStart(3);
    console.log(`    ${d.turi.padEnd(11)} ${nuqta} нуқта × ${d.qatorlar.length} қатор   ${d.sarlavha}`);
  }

  const chiqar = (nomi: string, bayt: ArrayBuffer) => {
    const yol = join(JOY, nomi);
    writeFileSync(yol, Buffer.from(bayt));
    console.log(`  ${yol}  ${(bayt.byteLength / 1024).toFixed(0)} КБ`);
  };

  console.log('\nЁзилмоқда:');
  /*
   * Шрифт браузерда `fetch('/shrift/...')` билан олинади. Node
   * да ундай манзил йўқ, шунинг учун айнан ўша файллар
   * `public/` дан ўқилади — яъни шрифт ҳам ҳақиқийси.
   */
  chiqar(
    'hisobot.pdf',
    await pdfBayt(hisobot, async (yol) => {
      const bayt = readFileSync(join(process.cwd(), 'public', yol));
      return bayt.buffer.slice(bayt.byteOffset, bayt.byteOffset + bayt.byteLength) as ArrayBuffer;
    })
  );
  chiqar('hisobot.xlsx', await excelBayt(hisobot));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
