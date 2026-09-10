/**
 * ============================================================
 *  BOSHLANG'ICH TO'LDIRISH
 *
 *  Ikki narsani yaratadi:
 *    1. 70 ta MFY va ularning baza statistikasi (svod jadvalidan)
 *    2. Birinchi administrator - u qolgan xodimlarni o'zi qo'shadi
 *
 *  Qayta ishga tushirish xavfsiz: mavjud yozuvlar yangilanadi,
 *  ikki nusxa yaratilmaydi.
 * ============================================================
 */

import { PrismaClient } from '@prisma/client';
import { MAHALLALAR_BAZASI } from '../src/lib/mahallalar';
import { parolXeshla, parolYaroqlimi } from '../src/lib/auth';

const prisma = new PrismaClient();

async function mahallalarniYukla() {
  let yangi = 0;
  let yangilandi = 0;

  for (const m of MAHALLALAR_BAZASI) {
    const mavjud = await prisma.mahalla.findUnique({ where: { nomi: m.nomi } });
    await prisma.mahalla.upsert({
      where: { nomi: m.nomi },
      create: m,
      update: m,
    });
    mavjud ? yangilandi++ : yangi++;
  }

  const jami = MAHALLALAR_BAZASI.reduce(
    (a, m) => ({
      aholi: a.aholi + m.aholi,
      ishsiz: a.ishsiz + m.ishsiz,
    }),
    { aholi: 0, ishsiz: 0 }
  );

  console.log(`  Mahallalar: ${yangi} ta yangi, ${yangilandi} ta yangilandi`);
  console.log(`  Baza: ${jami.aholi.toLocaleString('ru')} aholi, ${jami.ishsiz} ishsiz`);
}

async function adminYarat() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const parol = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FISH || 'Tizim administratori';

  if (!parol || parol.startsWith('ALMASHTIRING')) {
    console.log('  Administrator YARATILMADI: .env da ADMIN_PASSWORD sozlanmagan.');
    return;
  }

  const tekshiruv = parolYaroqlimi(parol);
  if (!tekshiruv.ok) {
    console.log(`  Administrator YARATILMADI: ${tekshiruv.xato}`);
    return;
  }

  const mavjud = await prisma.user.findUnique({ where: { username } });
  if (mavjud) {
    console.log(`  Administrator "${username}" allaqachon mavjud - tegilmadi`);
    return;
  }

  await prisma.user.create({
    data: {
      username,
      passwordHash: parolXeshla(parol),
      fullName,
      rol: 'ADMIN',
      // Birinchi kirishda parolni almashtirish talab qilinadi:
      // .env dagi parol repoda emas, lekin serverning muhit
      // o'zgaruvchilarida ochiq turadi.
      parolAlmashtirilsin: true,
    },
  });

  console.log(`  Administrator yaratildi: ${username}`);
  console.log('  Birinchi kirishdan keyin parolni ALBATTA almashtiring.');
}

async function main() {
  console.log('\nXatirchi bandlik platformasi - boshlang‘ich to‘ldirish\n');
  await mahallalarniYukla();
  await adminYarat();
  console.log('\nTayyor.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
