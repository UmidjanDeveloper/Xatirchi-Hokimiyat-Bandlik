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
import { lotinga } from '../src/lib/alifbo';

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

/**
 * Har MFY uchun BITTA hisob - mahalla raisi.
 *
 * Yettilikning har a'zosiga alohida login berish ham mumkin edi,
 * lekin bu 490 ta hisob degani va ularni boshqarish hokimiyat
 * xodimining butun kunini olardi. Rais esa tasdiqlangan ro'yxatda
 * turadi, ya'ni javobgarligi rasmiy - xatlov uning hisobi ostida
 * kiritiladi.
 *
 * Boshlang'ich parol raisning telefon raqamidan hosil qilinadi:
 * u og'zaki yetkazishga qulay, lekin tashqaridan taxmin qilib
 * bo'lmaydi (raqamlar ro'yxati ichki hujjat). Birinchi kirishda
 * baribir majburiy almashtiriladi.
 */
async function raislarYarat() {
  let yangi = 0;
  let mavjud = 0;

  for (const m of MAHALLALAR_BAZASI) {
    const mahalla = await prisma.mahalla.findUnique({
      where: { nomi: m.nomi },
      select: { id: true },
    });
    if (!mahalla) continue;

    // Login: mfy_uyshun, mfy_oq_oltin ...
    const username = `mfy_${lotinga(m.nomiKirill)
      .toLowerCase()
      .replace(/[\u02BB\u02BC']/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`;

    if (await prisma.user.findUnique({ where: { username } })) {
      mavjud++;
      continue;
    }

    const raqamlar = m.raisTelefon.replace(/\D/g, '');
    const parol = `Mfy${raqamlar.slice(-7)}`;

    await prisma.user.create({
      data: {
        username,
        passwordHash: parolXeshla(parol),
        fullName: m.raisFish,
        position: 'МФЙ раиси',
        phone: m.raisTelefon,
        rol: 'YETTILIK',
        mahallaId: mahalla.id,
        parolAlmashtirilsin: true,
      },
    });
    yangi++;
  }

  console.log(`  MFY raislari: ${yangi} ta yangi hisob, ${mavjud} ta allaqachon bor`);
  if (yangi > 0) {
    console.log('  Login: mfy_<mahalla nomi>, parol: Mfy + telefonning oxirgi 7 raqami');
  }
}

async function main() {
  console.log('\nXatirchi bandlik platformasi - boshlang‘ich to‘ldirish\n');
  await mahallalarniYukla();
  await raislarYarat();
  await adminYarat();
  console.log('\nTayyor.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
