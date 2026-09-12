/**
 * ============================================================
 *  BOSHLANG'ICH TO'LDIRISH
 *
 *  Uch narsani yaratadi:
 *    1. 70 ta MFY va ularning baza statistikasi (svod jadvalidan)
 *    2. Har MFY uchun rais hisobi - parollar `mfy-parollar.txt` ga
 *    3. Birinchi administrator - u qolgan xodimlarni o'zi qo'shadi
 *
 *  Qayta ishga tushirish xavfsiz: mavjud yozuvlar yangilanadi,
 *  ikki nusxa yaratilmaydi.
 * ============================================================
 */

import { PrismaClient } from '@prisma/client';
import { MAHALLALAR_BAZASI } from '../src/lib/mahallalar';
import { parolXeshla, parolYaroqlimi } from '../src/lib/auth';
import { lotinga } from '../src/lib/alifbo';
import { parolYarat } from '../src/lib/parol-yarat';
import { shifrla } from '../src/lib/sir-shifrlash';
import { writeFileSync } from 'node:fs';

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
      // Shifrlangan nusxa - administrator panelda ko'ra olishi uchun
      berilganParol: shifrla(parol),
      parolBerilganVaqt: new Date(),
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
 * Boshlang'ich parol TASODIFIY yaratiladi.
 *
 * Avval u telefon raqamidan hosil qilinardi - og'zaki yetkazishga
 * qulay edi. Lekin bu xavfli: login mahalla nomidan tuziladi
 * (`mfy_uyshun`), mahalla nomlari ochiq, rais esa mansabdor shaxs
 * va uning telefoni ko'pincha ma'lum. Ya'ni bitta telefon raqamini
 * bilgan odam o'sha mahalladagi barcha xonadonlarning shaxsiy
 * ma'lumotini ochib ko'rardi. Majburiy parol almashtirish ham
 * yordam bermaydi: rais birinchi marta kirgunicha oyna ochiq
 * turadi.
 *
 * Endi parollar `mfy-parollar.txt` fayliga yoziladi. Fayl
 * `.gitignore` da - git'ga tushmaydi. Administrator uni tarqatib
 * bo'lgach O'CHIRIB TASHLASHI kerak.
 */
async function raislarYarat() {
  let yangi = 0;
  let mavjud = 0;
  const royxat: { mahalla: string; rais: string; username: string; parol: string }[] = [];

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

    const parol = parolYarat();
    royxat.push({ mahalla: m.nomiKirill, rais: m.raisFish, username, parol });

    await prisma.user.create({
      data: {
        username,
        passwordHash: parolXeshla(parol),
        // Shifrlangan nusxa - administrator panelda ko'ra olishi uchun
        berilganParol: shifrla(parol),
        parolBerilganVaqt: new Date(),
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

  if (royxat.length === 0) return;

  /*
   * Parollar faqat shu yerda - bir marta - ochiq ko'rinadi.
   * Bazada ular scrypt bilan xeshlangan, ya'ni orqaga qaytarib
   * bo'lmaydi. Fayl yo'qolsa, parolni administrator paneldan
   * qaytadan tayinlash kerak bo'ladi.
   */
  const fayl = 'mfy-parollar.txt';
  const eni = Math.max(...royxat.map((r) => r.username.length));

  writeFileSync(
    fayl,
    [
      'XATIRCHI TUMANI - MFY RAISLARI UCHUN BOSHLANG\u2018ICH PAROLLAR',
      `Yaratilgan: ${new Date().toLocaleString('uz-UZ')}`,
      '',
      'DIQQAT: bu fayl maxfiy. Parollarni raislarga yetkazgach',
      'faylni O\u2018CHIRIB TASHLANG. Har bir rais birinchi kirishda',
      'parolni almashtirishga majbur.',
      '',
      royxat
        .map(
          (r) =>
            `${r.username.padEnd(eni)}  ${r.parol}   ${r.mahalla} \u2014 ${r.rais}`
        )
        .join('\n'),
      '',
    ].join('\n'),
    { mode: 0o600 }
  );

  console.log(`  Parollar yozildi: ${fayl} (${royxat.length} ta)`);
  console.log('  Tarqatib bo\u2018lgach faylni o\u2018chirib tashlang.');
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
