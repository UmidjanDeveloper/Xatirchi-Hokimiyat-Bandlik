/**
 * ============================================================
 *  SAHIFALASH — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/sahifalash-sinov.ts
 *
 *  Bu yerda xato nimaga olib keladi:
 *   · "Keyingi" tugmasi qidiruvni yo'qotsa - xodim filtrlangan natijaning
 *     2-sahifasi o'rniga butun ro'yxatning 2-sahifasini ko'radi
 *     (/xonadonlar da shunday bo'lgan);
 *   · tartibda `id` bo'lmasa - bir vaqtda kiritilgan (import) qatorlarning
 *     vaqti bir xil, sahifalar orasida qator takrorlanadi yoki tushib qoladi;
 *   · sahifa raqami jamidan oshsa bo'sh ekran;
 *   · eski ro'yxat 100 ta bilan kesilib, qolganiga yo'l bo'lmasa.
 *
 *  Haqiqiy brauzer sinovi (130 xonadon, 3 sahifa, takrorsiz) CI da emas,
 *  qo'lda o'tkazilgan; bu yerda esa xulq qoidalari va kod himoyasi.
 * ============================================================
 */
import { readFileSync } from 'node:fs';
import { jamiSahifa, sahifaChegarasi, sahifaRaqami, sahifaniTuzat } from '../src/lib/sahifalash';

type Sinov = { nomi: string; tekshir: () => boolean };
const oqi = (y: string) => readFileSync(y, 'utf8');

/** Sahifalanadigan ro'yxat sahifalari */
const SAHIFALAR = [
  'src/app/(ilova)/xatlov/page.tsx',
  'src/app/(ilova)/xonadonlar/page.tsx',
  'src/app/(ilova)/ishsizlar/page.tsx',
  'src/app/(ilova)/rejalar/page.tsx',
  'src/app/(ilova)/murojaatlar/page.tsx',
  'src/app/(ilova)/buyurtmalar/page.tsx',
];

const SINOVLAR: Sinov[] = [
  {
    nomi: 'sahifaRaqami: axlat kirishlar (abc, -5, 0, 2.5, 1e9, massiv, undefined) xavfsiz oraliqqa tushadi',
    tekshir: () =>
      sahifaRaqami('abc') === 1 && sahifaRaqami('-5') === 1 && sahifaRaqami('0') === 1 && sahifaRaqami('2.5') === 2 &&
      sahifaRaqami('1e9') === 1 && sahifaRaqami(['3', '4']) === 3 && sahifaRaqami(undefined) === 1 &&
      sahifaRaqami('99999999999') === 100_000 && sahifaRaqami('7') === 7,
  },
  {
    nomi: 'sahifaniTuzat: raqam jamidan oshsa OXIRGI sahifa; jami 0 - 1-sahifa; chegaralar (30 / 31 / 60 qator, 30 hajm)',
    tekshir: () =>
      sahifaniTuzat(999, 130, 30) === 5 && sahifaniTuzat(2, 0, 30) === 1 && sahifaniTuzat(1, 0, 30) === 1 &&
      jamiSahifa(30, 30) === 1 && jamiSahifa(31, 30) === 2 && jamiSahifa(60, 30) === 2 && jamiSahifa(61, 30) === 3 &&
      sahifaniTuzat(5, 130, 30) === 5 && sahifaniTuzat(6, 130, 30) === 5,
  },
  {
    nomi: 'sahifaChegarasi: skip/take to\'g\'ri; sahifalar bir-birini QOPLAMAYDI va oralig\'i yo\'q (130 qator, 50 dan: 0-49, 50-99, 100-129)',
    tekshir: () => {
      const hudud = [1, 2, 3].map((s) => sahifaChegarasi(s, 50));
      const qoplash: number[] = [];
      for (const { skip, take } of hudud) for (let i = skip; i < Math.min(skip + take, 130); i++) qoplash.push(i);
      return qoplash.length === 130 && new Set(qoplash).size === 130 && hudud[0].skip === 0 && hudud[2].skip === 100;
    },
  },
  {
    nomi: 'Har bir sahifalanadigan sahifada tartibda `id` bor (barqaror tartib: bir xil vaqtli qatorlar sahifalar orasida takrorlanmaydi)',
    tekshir: () => {
      const yomon = SAHIFALAR.filter((y) => !/\{ id: 'asc' \}/.test(oqi(y)));
      if (yomon.length) console.log('     id tartibsiz:', yomon.join(', '));
      return yomon.length === 0;
    },
  },
  {
    nomi: 'Hech bir sahifada eski xavfli o\'qish yo\'q: `Math.max(1, Number(searchParams.sahifa) || 1)` (1e9, tashlandiq raqam) va "faqat eng yangi N ta" kesish',
    tekshir: () => {
      const yomon = SAHIFALAR.filter((y) => /Number\(searchParams\.sahifa\)/.test(oqi(y)));
      const kesilgan = ['src/app/(ilova)/xatlov/page.tsx'].filter((y) => /take: RO_YXAT_HAJMI/.test(oqi(y)));
      if (yomon.length || kesilgan.length) console.log('     ', yomon.join(', '), kesilgan.join(', '));
      return yomon.length === 0 && kesilgan.length === 0;
    },
  },
  {
    nomi: 'Jami AVVAL sanaladi, sahifa keyin tuzatiladi: raqam jamidan oshganda "mos xonadon topilmadi" deb yolg\'on aytilmaydi',
    tekshir: () =>
      ['xatlov', 'xonadonlar', 'ishsizlar'].every((n) => {
        const k = oqi(`src/app/(ilova)/${n}/page.tsx`);
        const sanash = k.search(/await prisma\.(household|unemployedPerson)\.count\(/);
        const tuzatish = k.indexOf('sahifaniTuzat(sahifaRaqami(searchParams.sahifa)');
        return sanash > 0 && tuzatish > sanash;
      }),
  },
  {
    nomi: '/xonadonlar: "Keyingi/Oldingi" qidiruv (q) va mahalla filtrini SAQLAYDI; qidiruv matni 100 belgigacha qisqartiriladi',
    tekshir: () => {
      const k = oqi('src/app/(ilova)/xonadonlar/page.tsx');
      return (
        k.includes("filtrlar={{ q: qidiruv || undefined, mahalla: searchParams.mahalla }}") &&
        k.includes('.slice(0, 100)') && !k.includes('/xonadonlar?sahifa=${')
      );
    },
  },
  {
    nomi: '/xatlov: pastda umumiy sahifalash (davr filtri saqlanadi); eski "100 ta ko\'rsatilgan" cheklov yo\'q',
    tekshir: () => {
      const k = oqi('src/app/(ilova)/xatlov/page.tsx');
      return k.includes('<Sahifalash') && k.includes('filtrlar={{ davr: searchParams.davr }}') && !k.includes('royxatToldi');
    },
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
