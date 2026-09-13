/**
 * ============================================================
 *  PDF МАТН СИҒДИРИШ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/pdf-sinov.ts
 *
 *  Нега керак: узун изоҳ картага сиғмаса, у ЖИМГИНА кесиларди.
 *  Экранда хато кўринмайди — ҳисобот чиқади, чиройли кўринади,
 *  фақат жумла сўз ўртасида тугаган бўлади. Бир марта шундай
 *  бўлган: «эълон қилинган 18 тадан · 0 таси» — «банд» сўзи
 *  йўқолган ва буни ҳеч ким сезмаган.
 *
 *  Шунинг учун қоида: матн кесилса, уч нуқта қўйилиши ШАРТ.
 * ============================================================
 */
import { jsPDF } from 'jspdf';
import { sigdir } from '../src/lib/hisobot/pdf';

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
doc.setFont('helvetica', 'normal');
doc.setFontSize(6);

/** Карта кенглиги — ҳақиқий ҳисоботдагидек */
const ENI = 38;

type Sinov = { nomi: string; tekshir: () => boolean };

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Қисқа матн ўзгармайди',
    tekshir: () => {
      const q = sigdir(doc, 'qisqa izoh', ENI, 2);
      return q.length === 1 && q[0] === 'qisqa izoh' && !q[0].includes('…');
    },
  },
  {
    nomi: 'Икки қаторга сиғадиган матн тўлиқ қолади',
    tekshir: () => {
      const matn = 'elon qilingan 18 tadan · 0 tasi band';
      const q = sigdir(doc, matn, ENI, 2);
      return q.join(' ').replace(/\s+/g, ' ') === matn && !q.join('').includes('…');
    },
  },
  {
    nomi: 'Сиғмаган матн УЧ НУҚТА билан тугайди',
    tekshir: () => {
      const q = sigdir(doc, 'bu juda uzun izoh matni '.repeat(12), ENI, 2);
      return q.length === 2 && q[1].trimEnd().endsWith('…');
    },
  },
  {
    nomi: 'Уч нуқтали қатор карта кенглигидан ошмайди',
    tekshir: () => {
      const q = sigdir(doc, 'juda-uzun-uzilmaydigan-soz '.repeat(10), ENI, 2);
      return q.every((s) => doc.getTextWidth(s) <= ENI + 0.01);
    },
  },
  {
    nomi: 'Битта қатор сўралса ҳам уч нуқта қўйилади',
    tekshir: () => {
      const q = sigdir(doc, 'birinchi qator ikkinchi qator uchinchi qator', ENI, 1);
      return q.length === 1 && q[0].trimEnd().endsWith('…');
    },
  },
  {
    nomi: 'Битта узун сўз ҳам чексиз айланмайди',
    tekshir: () => {
      const q = sigdir(doc, 'a'.repeat(400), ENI, 2);
      return q.length === 2 && doc.getTextWidth(q[1]) <= ENI + 0.01;
    },
  },
  {
    nomi: 'Бўш матн хато бермайди',
    tekshir: () => Array.isArray(sigdir(doc, '', ENI, 2)),
  },
];

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
