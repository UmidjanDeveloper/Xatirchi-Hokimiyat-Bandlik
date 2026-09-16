/**
 * ============================================================
 *  МАВЖУД ХАТЛОВЛАРДАН ЧОРА-ТАДБИР ЯРАТИШ — БИР МАРТАЛИК
 *
 *  Ишга тушириш:
 *      npx tsx scripts/chora-toldirish.ts          — фақат кўрсатади
 *      npx tsx scripts/chora-toldirish.ts --yoz    — базага ёзади
 *
 *  ── Нега керак бўлди ──
 *
 *  Эҳтиёж → топшириқ занжири 2026-йил 16-сентябрда уланди.
 *  Ўшандан кейинги ҳар бир хатлов ўз-ўзидан топшириқ туғдиради:
 *  ишсиз топилса — бандлик марказига, касб сўралса — касб-ҳунар
 *  марказига, кредит сўралса — банкка.
 *
 *  Аммо ундан ОЛДИН киритилган хатловлар занжирдан ташқарида
 *  қолди. Улардаги эҳтиёжлар анкета ичида ётибди: ҳокимнинг
 *  «Чора-тадбирлар режаси» саҳифасида улар кўринмайди, демак
 *  ҳеч ким уларни бажармайди ҳам.
 *
 *  Бу скрипт ўша бўшлиқни ёпади — эски хатловларни ҳам худди
 *  янгидек занжирдан ўтказади.
 *
 *  ── Нега аввал КЎРСАТАДИ, кейин ёзади ──
 *
 *  Скрипт ишлаб чиқариш базасида ишлатилади: у ердаги хатловлар
 *  реал одамларники ва яратилган топшириқ реал ходимга юкланади.
 *  Шунинг учун стандарт ҳолатда ҲЕЧ НАРСА ёзилмайди — фақат
 *  нечта ва қандай топшириқ чиқиши кўрсатилади. Ёзиш учун
 *  атайлаб `--yoz` ёзиш керак.
 *
 *  Кўрсатиш ҳам, ёзиш ҳам БИР ХИЛ код билан ҳисобланади:
 *  кўрсатиш пайтида транзакция очилиб, охирида атайлаб орқага
 *  қайтарилади. Шу тарзда «кўрсатгани бошқа, ёзгани бошқа»
 *  деган ҳолат бўлмайди.
 *
 *  ── Такрор ишлатилса ──
 *
 *  Зарар қилмайди. `choralarniYoz` ҳар топшириқни `muammo`
 *  матни бўйича таниб олади: шу хонадонда шу муаммо бўйича
 *  топшириқ бор бўлса, иккинчиси яратилмайди.
 *
 *  ── Ким яратган бўлиб қолади ──
 *
 *  Хатловни ўтказган маҳалла ходими. Чунки топшириқнинг манбаи
 *  ўша ходим тўлдирган анкета — ҳоким «кимнинг хатловидан
 *  чиқди» деб сўраса, жавоби шу.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { PrismaClient } from '@prisma/client';
import { choralarniYoz, yangiChoralar, type ChoraManbai } from '../src/lib/chora-yaratish';

const YOZILSINMI = process.argv.includes('--yoz');

/** `choralarniYoz` талаб қиладиган майдонлар — ортиқчаси олинмайди */
const TANLOV = {
  id: true,
  moliyaEhtiyoji: true,
  talabQilinganMablag: true,
  maktabYoshdagi: true,
  maktabQamrovda: true,
  uzoqDavolanish: true,
  nogironlikBor: true,
  xodimId: true,
  mahalla: { select: { nomi: true } },
  ishsizlar: {
    select: {
      id: true,
      fish: true,
      kasbHunarEhtiyoji: true,
      organmoqchiKasb: true,
      itShaharchaVaucheri: true,
    },
  },
} as const;

async function main() {
  const prisma = new PrismaClient();

  /*
   * Қоралама олинмайди: у ҳали тугалланмаган анкета. Ундан
   * топшириқ чиқарсак, ходим хатони тузатмасидан туриб банкка
   * ва мактабга топшириқ кетиб қолади.
   */
  const xonadonlar = await prisma.household.findMany({
    where: { holati: { not: 'QORALAMA' } },
    select: TANLOV,
    orderBy: { createdAt: 'asc' },
  });

  console.log(
    YOZILSINMI
      ? `ЁЗИШ режими. Текширилаётган хонадон: ${xonadonlar.length}\n`
      : `КЎРСАТИШ режими (базага ёзилмайди). Текширилаётган хонадон: ${xonadonlar.length}\n` +
          'Ёзиш учун:  npx tsx scripts/chora-toldirish.ts --yoz\n'
  );

  let jamiYangi = 0;
  let tegilganXonadon = 0;
  const tashkilotlar = new Map<string, number>();

  for (const x of xonadonlar) {
    const manba: ChoraManbai = x;

    /*
     * Аввал НИМА чиқишини оламиз. Ёзиш ҳам худди шу рўйхатни
     * қайта ҳисоблайди — демак кўрсатилгани билан ёзилгани
     * ажралиб қолмайди.
     */
    const chiqadi = await yangiChoralar(prisma, manba);
    if (chiqadi.length === 0) continue;

    if (YOZILSINMI) {
      const yozildi = await prisma.$transaction((tx) => choralarniYoz(tx, manba, x.xodimId));
      if (yozildi !== chiqadi.length) {
        console.log(`   ОГОҲЛАНТИРИШ: ${chiqadi.length} та кутилганди, ${yozildi} таси ёзилди`);
      }
    }

    jamiYangi += chiqadi.length;
    tegilganXonadon++;

    /*
     * Қайси топшириқ чиққанини ҳам ёзиб чиқамиз: скриптни
     * ишлатган одам «нима ёзилди» деб базага кирмасин.
     */
    console.log(`${x.mahalla.nomi} — ${chiqadi.length} та топшириқ:`);
    for (const t of chiqadi) {
      console.log(`   • [${t.masulTashkilot}] ${t.muammo}`);
      tashkilotlar.set(t.masulTashkilot, (tashkilotlar.get(t.masulTashkilot) ?? 0) + 1);
    }
  }

  console.log('');
  if (jamiYangi === 0) {
    console.log('Янги топшириқ йўқ — ҳаммаси аллақачон яратилган.');
  } else {
    console.log(
      YOZILSINMI
        ? `ЁЗИЛДИ: ${jamiYangi} та топшириқ, ${tegilganXonadon} та хонадон бўйича`
        : `ЧИҚАДИ: ${jamiYangi} та топшириқ, ${tegilganXonadon} та хонадон бўйича`
    );
    console.log('Масъул ташкилотлар бўйича:');
    for (const [nomi, soni] of [...tashkilotlar].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${nomi}: ${soni}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('ХАТО:', e instanceof Error ? e.message : e);
  process.exit(1);
});
