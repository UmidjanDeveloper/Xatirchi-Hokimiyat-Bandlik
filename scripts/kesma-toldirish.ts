/**
 * ============================================================
 *  БОШЛАНҒИЧ КЕСМАЛАРНИ ТЎЛДИРИШ
 *
 *  Ишга тушириш:  npx tsx scripts/kesma-toldirish.ts
 *
 *  Кесма механизми қўшилгунга қадар хатловдан ўтган
 *  хонадонларда тарих йўқ. Улар учун БИР МАРТАЛИК кесма
 *  олинади — «BOSHLANGICH» сабаби билан.
 *
 *  ── Нега бир марталик ва нега алоҳида сабаб ──
 *
 *  Бу кесма ҲОЗИРГИ ҳолатдан олинади, аммо санаси хатлов
 *  санаси қилиб қўйилади. Яъни у тахминий: оила орада
 *  ўзгарган бўлса, эски ҳолат тикланмайди.
 *
 *  Шунинг учун сабаби АЛОҲИДА белгиланади. Ҳисоботда
 *  кўрсатилганда «бу нуқта тахминий» деб айтиш мумкин бўлади
 *  ва уни ҳақиқий кесма билан аралаштириб юбормаймиз.
 *
 *  Скрипт такрор ишлатилса зарар қилмайди: кесмаси бор
 *  хонадонга тегмайди.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { PrismaClient } from '@prisma/client';
import { farovonlikHisobi, kesmaYasa } from '../src/lib/xonadon-tarixi';

/**
 * Эски кесмаларнинг баллини ҚАЙТА ҳисоблайди.
 *
 * ── Нега кесмага тегилади ──
 *
 * Кесма ўзгармас ёзув бўлиши керак, аммо унда ИККИ хил нарса
 * бор: ХОМ кўрсаткичлар (оила аъзоси, даромад, чорва) ва
 * улардан ҲОСИЛ ҚИЛИНГАН балл.
 *
 * Хом кўрсаткичларга ҳеч қачон тегилмайди — улар ўша куннинг
 * ҳақиқати. Балл эса ҳисоб усулининг натижаси, ва усул
 * тузатилса, эски балл ЭСКИ усул билан қолиб кетади.
 *
 * Шунда 2026 йилги балл бир усул билан, 2027 йилгиси бошқа
 * усул билан ҳисобланган бўлади — ва уларни таққослаб
 * бўлмайди. Ҳолбуки кесманинг бутун мақсади шу таққослаш эди.
 *
 * Шунинг учун усул ўзгарганда барча балл хом маълумотдан
 * қайта ҳисобланади.
 */
async function qaytaHisobla(prisma: PrismaClient): Promise<void> {
  const kesmalar = await prisma.householdKesma.findMany({
    include: { household: true },
  });

  let ozgardi = 0;
  for (const k of kesmalar) {
    /*
     * Балл кесманинг ЎЗ хом рақамларидан ҳисобланади, хонадоннинг
     * ҳозирги ҳолатидан эмас — акс ҳолда ҳамма кесма бир хил
     * балл олиб, тарих текис чизиққа айланарди.
     */
    const yangi = farovonlikHisobi({
      id: k.householdId,
      mahallaId: k.mahallaId,
      jamiAzo: k.jamiAzo,
      bolalarSoni: k.bolalarSoni,
      mehnatgaLayoqatli: k.mehnatgaLayoqatli,
      ishlaydiganlar: k.ishlaydiganlar,
      ishsizlarSoni: k.ishsizlarSoni,
      oylikDaromad: k.oylikDaromad,
      chetElOylikPulSom: k.chetElOylikPulSom,
      yirikShoxliSoni: k.yirikShoxliSoni,
      maydaShoxliSoni: k.maydaShoxliSoni,
      parrandaSoni: k.parrandaSoni,
      tomorqaMaydoni: k.tomorqaMaydoni,
      gaz: k.gaz,
      ichimlikSuvi: k.ichimlikSuvi,
      uyHolati: k.uyHolati,
      tadbirkorlikIstagi: k.tadbirkorlikIstagi,
      kasbHunarIstagi: k.kasbHunarIstagi,
      nogironShaxslar: null,
    }).ball;

    if (yangi !== k.farovonlikBali) {
      await prisma.householdKesma.update({
        where: { id: k.id },
        data: { farovonlikBali: yangi },
      });
      ozgardi++;
    }
  }

  console.log(
    ozgardi === 0
      ? `Қайта ҳисоб: ${kesmalar.length} та кесма текширилди, ўзгариш йўқ`
      : `Қайта ҳисоб: ${ozgardi}/${kesmalar.length} та кесманинг балли янгиланди`
  );
}

async function main() {
  const prisma = new PrismaClient();

  const xonadonlar = await prisma.household.findMany({
    where: {
      holati: { not: 'QORALAMA' },
      /* Кесмаси БОР хонадонга тегмаймиз */
      kesmalar: { none: {} },
    },
  });

  console.log(`Кесмасиз хонадон: ${xonadonlar.length}`);
  if (xonadonlar.length === 0) {
    console.log('Ҳаммасида кесма бор — янги кесма ёзилмайди.');
  }

  let yozildi = 0;
  for (const x of xonadonlar) {
    const kesma = kesmaYasa(x, x, 'BOSHLANGICH');
    await prisma.householdKesma.create({
      data: {
        ...kesma,
        /* Сана — хатлов санаси, бугунги кун эмас */
        olinganSana: x.xatlovSanasi ?? x.createdAt,
      },
    });
    yozildi++;
  }

  console.log(`Ёзилди: ${yozildi} та бошланғич кесма`);

  await qaytaHisobla(prisma);

  /* Текшириш: ҳаммасида кесма борми */
  const qolgan = await prisma.household.count({
    where: { holati: { not: 'QORALAMA' }, kesmalar: { none: {} } },
  });
  console.log(qolgan === 0 ? 'ТЕКШИРУВ: ҳаммасида кесма бор' : `ТЕКШИРУВ: ${qolgan} таси қолди`);

  await prisma.$disconnect();
  process.exit(qolgan === 0 ? 0 : 1);
}

main();
