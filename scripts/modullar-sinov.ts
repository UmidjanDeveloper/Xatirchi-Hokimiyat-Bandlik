/**
 * ============================================================
 *  MODULLAR NATIJASI (RAHBAR VA HOKIM UCHUN JAMLAMA) — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/modullar-sinov.ts
 *
 *  Bu yerda xato nimaga olib keladi:
 *   · maxraj 0 bo'lganda "0%" yozilsa - "hammasi yomon" deb o'qiladi;
 *   · 2 dan 1 "50%" deb chiqsa - kichik namuna katta xulosaga aylanadi;
 *   · jamlamaga ism/telefon tushsa - hokim ko'rmasligi kerak narsani ko'radi;
 *   · bitta modul yiqilganda butun taxta ochilmay qolsa.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { vazifalarim } from '../src/lib/vazifalar';
import { MODUL_KICHIK_NAMUNA, modullarBlogi, nisbatQatori, type ModullarMetrikasi } from '../src/lib/modullar-natijasi';
import { murojaatKorsatkichlarniHisobla } from '../src/lib/murojaatlar';
import { korsatkichlarniHisobla } from '../src/lib/kurslar';
import { buyurtmaKorsatkichlarniHisobla } from '../src/lib/buyurtmalar';
import { yordamKorsatkichlarniHisobla } from '../src/lib/yordam-dasturlari';

const prisma = new PrismaClient();
type Sinov = { nomi: string; tekshir: () => Promise<boolean> };
const oqi = (y: string) => readFileSync(y, 'utf8');

const bosh = (): ModullarMetrikasi => ({
  murojaat: murojaatKorsatkichlarniHisobla([]),
  kurs: korsatkichlarniHisobla([]),
  buyurtma: buyurtmaKorsatkichlarniHisobla([]),
  yordam: yordamKorsatkichlarniHisobla([]),
});

let xodim = '';
const xodimlar: string[] = [];

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Nisbat qatori: maxraj 0 - "ma\'lumot yo\'q" (0% EMAS); maxraj < 10 - "namuna kichik"; yetarli maxrajda foiz',
    tekshir: async () => {
      const nol = nisbatQatori('a', 'x', 0, 0).qoshimcha ?? '';
      const kichik = nisbatQatori('a', 'x', 1, 2).qoshimcha ?? '';
      const chegara = nisbatQatori('a', 'x', 5, MODUL_KICHIK_NAMUNA).qoshimcha ?? '';
      const kichikChegara = nisbatQatori('a', 'x', 5, MODUL_KICHIK_NAMUNA - 1).qoshimcha ?? '';
      const katta = nisbatQatori('a', 'x', 3, 12, 'izoh').qoshimcha ?? '';
      return (
        /маълумот йўқ/.test(nol) && !/%/.test(nol) &&
        /1 \/ 2 · 50%/.test(kichik) && /намуна кичик/.test(kichik) &&
        /5 \/ 10 · 50%/.test(chegara) && !/намуна кичик/.test(chegara) &&
        /намуна кичик/.test(kichikChegara) &&
        /3 \/ 12 · 25%/.test(katta) && !/намуна кичик/.test(katta) && /izoh/.test(katta)
      );
    },
  },
  {
    nomi: 'Bo\'sh modullar: hech qaysi qatorda "0%" yo\'q, hammasi "ma\'lumot yo\'q"; hisoblash usuli va ogohlantirishi bor; "tinch"',
    tekshir: async () => {
      const b = modullarBlogi(bosh());
      return (
        b.qatorlar.length === 6 && b.qatorlar.every((q) => /маълумот йўқ/.test(q.qoshimcha ?? '') && !/0%/.test(q.qoshimcha ?? '')) &&
        b.ogohlik === 'tinch' && b.soni === 0 &&
        Boolean(b.hisoblash?.usuli) && Boolean(b.hisoblash?.manbasi) && /қайд этилмаган нарса «рўй бермаган» дегани эмас/.test(b.hisoblash?.ogohlik ?? '')
      );
    },
  },
  {
    nomi: 'Haqiqiy ko\'rsatkichlar: murojaat 10 ta muddatida/2 ta kechikib = "10 / 12"; ochiq muddati o\'tgan; kurs "qayd etilmagan" izohi; yordam "tekshirish kerak"; blok "diqqat"',
    tekshir: async () => {
      const k = bosh();
      k.murojaat.javob.vaqtida = 10;
      k.murojaat.javob.kechikib = 2;
      k.murojaat.yangi = 3;
      k.murojaat.jarayonda = 2;
      k.murojaat.muddat.kechikkan = 4;
      k.kurs.tamomlagan = 18;
      k.kurs.tashlagan = 2;
      k.kurs.natija.muddatiOtgan = 15;
      k.kurs.natija.tasdiqlangan = 6;
      k.kurs.natija.qaydEtilmagan = 7;
      k.buyurtma.bajarilgan = 20;
      k.buyurtma.tasdiq.ikkiTomonlama = 14;
      k.buyurtma.tasdiq.kechikkan = 1;
      k.yordam.jami = 8;
      k.yordam.amalda = 5;
      k.yordam.tekshirishKerak = 2;
      const b = modullarBlogi(k);
      const q = (id: string) => b.qatorlar.find((x) => x.id === id)?.qoshimcha ?? '';
      return (
        /10 \/ 12 · 83%/.test(q('murojaat-vaqtida')) &&
        /4 \/ 5 · 80%/.test(q('murojaat-kechikkan')) &&
        /18 \/ 20 · 90%/.test(q('kurs-tamomlagan')) &&
        /6 \/ 15 · 40%/.test(q('kurs-ish')) && /қайд этилмаган: 7 \(бу «иш топмаган» дегани эмас\)/.test(q('kurs-ish')) &&
        /14 \/ 20 · 70%/.test(q('buyurtma-tasdiq')) &&
        /5 \/ 8 · 63%/.test(q('yordam-amalda')) && /текшириш керак: 2/.test(q('yordam-amalda')) &&
        b.soni === 4 + 1 + 2 && b.ogohlik === 'diqqat'
      );
    },
  },
  {
    nomi: 'Jamlamada SHAXSIY MA\'LUMOT yo\'q: blok faqat sonlar va umumiy matn; ism/telefon maydoni tipda ham yo\'q',
    tekshir: async () => {
      const b = modullarBlogi(bosh());
      const json = JSON.stringify(b);
      const lib = oqi('src/lib/modullar-natijasi.ts');
      return (
        !/telefon|fullName|fish|manzil|murojaatchiNomi|oilaBoshligi/i.test(json) &&
        !/select:\s*\{[^}]*(telefon|fish|fullName)/.test(lib) &&
        b.qatorlar.every((q) => q.yol === undefined)
      );
    },
  },
  {
    nomi: 'Taxta (baza): RAHBAR va HOKIM bloki ko\'radi; mahalla xodimi va bandlik xodimi (ularda modul bloklari alohida) ko\'rmaydi; blok ham o\'qiladigan baho beradi',
    tekshir: async () => {
      const blok = async (rol: 'HOKIM' | 'BANDLIK_RAHBAR' | 'BANDLIK' | 'YETTILIK' | 'ADMIN', mahallaId: string | null = null) =>
        (await vazifalarim({ userId: xodim, rol, mahallaId })).bloklar.find((b) => b.kalit === 'modullar-natijasi');
      const m = await prisma.mahalla.findFirstOrThrow({ select: { id: true } });
      const hokim = await blok('HOKIM');
      const rahbar = await blok('BANDLIK_RAHBAR');
      const bandlik = await blok('BANDLIK');
      const yettilik = await blok('YETTILIK', m.id);
      const admin = await blok('ADMIN');
      return Boolean(hokim) && Boolean(rahbar) && !bandlik && !yettilik && !admin && (hokim?.qatorlar.length ?? 0) === 6 && Boolean(hokim?.hisoblash);
    },
  },
  {
    nomi: 'Hokim jamlamani ko\'radi, lekin modullarning o\'ziga (shaxsiy ma\'lumotli sahifalar) kira olmaydi: menyuda murojaat/kurs/buyurtma yo\'q',
    tekshir: async () => {
      const m = oqi('src/components/shell/navigatsiya.ts');
      const blok = (yol: string) => {
        const i = m.indexOf(`yol: '${yol}'`);
        return i < 0 ? '' : m.slice(i, i + 400);
      };
      const hokimIchida = (yol: string) => /rollar:\s*\[[^\]]*'HOKIM'/.test(blok(yol).split('},')[0]);
      /* Ijobiy nazorat: ajratish to'g'ri ishlayotganini isbotlaydi (/yordam hokimga ochiq) */
      return hokimIchida('/yordam') && !hokimIchida('/murojaatlar') && !hokimIchida('/kurslar') && !hokimIchida('/buyurtmalar');
    },
  },
  {
    nomi: 'Bitta modul yiqilsa taxta OCHILADI, jamlama bloki chiqmaydi ("0" bo\'lib chiqmaydi)',
    tekshir: async () => {
      const lib = await import('../src/lib/murojaatlar');
      void lib;
      const { prisma: ilova } = await import('../src/lib/prisma');
      const asl = ilova.murojaat.findMany;
      (ilova.murojaat as unknown as { findMany: unknown }).findMany = () => {
        throw new Error('modul yiqildi');
      };
      const xom = console.error;
      console.error = () => {};
      let taxta;
      try {
        taxta = await vazifalarim({ userId: xodim, rol: 'HOKIM', mahallaId: null });
      } finally {
        (ilova.murojaat as unknown as { findMany: unknown }).findMany = asl;
        console.error = xom;
      }
      return taxta.bloklar.length > 0 && !taxta.bloklar.some((b) => b.kalit === 'modullar-natijasi');
    },
  },
];

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }
  const x = await prisma.user.create({
    data: { username: `mod_${Date.now()}_${Math.floor(Math.random() * 1e5)}`, fullName: 'Sinov modullar', passwordHash: 'x', rol: 'ADMIN' },
    select: { id: true },
  });
  xodim = x.id;
  xodimlar.push(x.id);

  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }

  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
