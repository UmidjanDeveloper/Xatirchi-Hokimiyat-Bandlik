/**
 * ============================================================
 *  TEZLIK — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/tezlik-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *  Tezlashtirish ENG XAVFLI turdagi o'zgarish: natija
 *  «tezroq» bo'ladi-yu, jimgina NOTO'G'RI chiqishi mumkin.
 *  Bu yerda ikkita xavf bor va ikkalasi ham tekshiriladi:
 *
 *  1. KUNLIK JAMLANMA eski usul bilan BIR XIL natija berishi
 *     shart. Baza endi sanalarni kun bo'yicha guruhlaydi;
 *     xato bo'lsa, hokimning grafigi jimgina boshqa raqamni
 *     ko'rsatadi.
 *
 *  2. XOM SQL arxiv qorovulini CHETLAB O'TADI. `prisma.ts` dagi
 *     qorovul faqat `findMany`/`count` ni filtrlaydi. Xom
 *     so'rovda `"arxivSanasi" IS NULL` qo'lda yozilmasa,
 *     arxivga o'tkazilgan (o'chirilgan) fuqaro grafikda
 *     sanalib turadi.
 *
 *  Va bitta ANGLASH xavfi: yutuq jimgina qaytishi. Shuning
 *  uchun og'ir kutubxona sahifaga to'g'ridan-to'g'ri kirsa,
 *  bu sinov yiqiladi.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  dinamikaHisobla,
  dinamikaHisoblaKunlik,
  tahlilniHisobla,
  type KunSoni,
} from '../src/lib/tahlil';
import { MENYU } from '../src/components/shell/navigatsiya';

const prisma = new PrismaClient();

type Natija = boolean | 'otkazildi';
type Sinov = { nomi: string; tekshir: () => Promise<Natija> | Natija };

const oqi = (y: string) => (existsSync(y) ? readFileSync(y, 'utf8') : '');
const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ────────────────────────────────────────────────────────
 *  IMPORT GRAFI — qaysi sahifa qaysi kutubxonaga yetib boradi
 * ──────────────────────────────────────────────────────── */

function hal(dan: string, imp: string): string | null {
  const asos = imp.startsWith('@/')
    ? join('src', imp.slice(2))
    : imp.startsWith('.')
      ? normalize(join(dirname(dan), imp))
      : null;
  if (!asos) return null;
  for (const e of ['.tsx', '.ts', '/index.tsx', '/index.ts', '']) {
    const y = asos + e;
    if (existsSync(y) && statSync(y).isFile()) return y;
  }
  return null;
}

/**
 * STATIK importlar. `import type` hisobga olinmaydi (ish
 * vaqtida hech narsa yuklamaydi) va `import('...')` ham
 * (dinamik — kechiktirilgan bo'lak aynan shunday hosil bo'ladi).
 */
function statikImportlar(fayl: string): string[] {
  const m = kodiOl(oqi(fayl));
  const chiqish: string[] = [];
  const re = /(?:^|\n)\s*(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(m))) {
    if (x[2]) continue; /* `import type` / `export type` */
    chiqish.push(x[4] ?? x[5]);
  }
  return chiqish;
}

/** `boshi` dan statik yetib boriladigan tashqi paketlar */
function yetibBoriladigan(boshi: string): Set<string> {
  const korilgan = new Set<string>();
  const paketlar = new Set<string>();
  const navbat = [boshi];
  while (navbat.length) {
    const f = navbat.pop()!;
    if (korilgan.has(f)) continue;
    korilgan.add(f);
    for (const imp of statikImportlar(f)) {
      const h = hal(f, imp);
      if (h) navbat.push(h);
      else if (!imp.startsWith('.') && !imp.startsWith('@/')) paketlar.add(imp);
    }
  }
  return paketlar;
}

const OG_IR = ['recharts', 'exceljs', 'xlsx', 'jspdf', 'jspdf-autotable', 'jszip'];

/* ────────────────────────────────────────────────────────
 *  SINOV MA'LUMOTLARI
 * ──────────────────────────────────────────────────────── */

let mahallaId = '';
let xodimId = '';
const tozalash: (() => Promise<unknown>)[] = [];

async function tayyorla() {
  const m = await prisma.mahalla.findFirst({ select: { id: true } });
  if (!m) throw new Error('bazada mahalla yo‘q — `prisma db seed`');
  mahallaId = m.id;
  const x = await prisma.user.create({
    data: { username: `sinov_tezlik_${Date.now()}`, fullName: 'Sinov Tezlik', passwordHash: 'x', rol: 'BANDLIK', mahallaId },
    select: { id: true },
  });
  xodimId = x.id;
}

async function tozala() {
  for (const t of tozalash.reverse()) await t().catch(() => {});
  await prisma.user.deleteMany({ where: { id: xodimId } });
}

/** Tasodifiy, ammo har safar BIR XIL ketma-ketlik */
function tasodif(urug: number) {
  let s = urug;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Sanani O'ZINING mahalliy kunining boshiga keltiradi */
const kunBoshi = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function kunlikka(sanalar: Date[]): KunSoni[] {
  const m = new Map<number, KunSoni>();
  for (const d of sanalar) {
    const k = kunBoshi(d);
    const bor = m.get(k.getTime());
    if (bor) bor.soni += 1;
    else m.set(k.getTime(), { kun: k, soni: 1 });
  }
  return [...m.values()];
}

const KUN = 86_400_000;

const SINOVLAR: Sinov[] = [
  /* ── 1. KUNLIK JAMLANMA = ESKI USUL (sof hisob) ── */
  {
    nomi: 'Kunlik jamlanma ESKI usul bilan BIR XIL natija beradi (3 ta davr)',
    tekshir: () => {
      const r = tasodif(42);
      const tuz = (n: number, kun: number) =>
        Array.from({ length: n }, () => new Date(Date.now() - Math.floor(r() * kun * KUN)));
      const x = tuz(900, 500);
      const a = tuz(600, 450);
      const j = tuz(250, 300);

      return (['kun', 'oy', 'yil'] as const).every(
        (davr) =>
          JSON.stringify(dinamikaHisobla(x, a, j, davr)) ===
          JSON.stringify(dinamikaHisoblaKunlik(kunlikka(x), kunlikka(a), kunlikka(j), davr))
      );
    },
  },
  {
    /*
     * Chegara kunlari — eng xavfli joy: oy, yil va kun
     * chegarasidagi yozuv bir tomonga ketib qolishi mumkin.
     */
    nomi: 'Chegara kunlari (oy boshi/oxiri, yil boshi, bugun) aynan bir xil',
    tekshir: () => {
      const hozir = new Date();
      const oyBoshi = new Date(hozir.getFullYear(), hozir.getMonth(), 1);
      const yilBoshi = new Date(hozir.getFullYear(), 0, 1);
      const sanalar = [
        oyBoshi,
        new Date(oyBoshi.getTime() - 1),
        new Date(oyBoshi.getTime() + 1),
        yilBoshi,
        new Date(yilBoshi.getTime() - 1),
        new Date(yilBoshi.getTime() + 1),
        new Date(hozir.getFullYear(), hozir.getMonth(), hozir.getDate()),
        new Date(hozir.getFullYear(), hozir.getMonth(), hozir.getDate(), 23, 59, 59, 999),
        hozir,
      ];
      return (['kun', 'oy', 'yil'] as const).every(
        (davr) =>
          JSON.stringify(dinamikaHisobla(sanalar, sanalar, sanalar, davr)) ===
          JSON.stringify(
            dinamikaHisoblaKunlik(kunlikka(sanalar), kunlikka(sanalar), kunlikka(sanalar), davr)
          )
      );
    },
  },
  {
    nomi: 'Bir kundagi 5 ta yozuv = bitta {soni: 5} (og‘irlik to‘g‘ri)',
    tekshir: () => {
      const kun = new Date(Date.now() - 3 * KUN);
      const besh = [kun, kun, kun, kun, kun];
      const eski = dinamikaHisobla(besh, [], [], 'kun');
      const yangi = dinamikaHisoblaKunlik([{ kun: kunBoshi(kun), soni: 5 }], [], [], 'kun');
      return JSON.stringify(eski) === JSON.stringify(yangi);
    },
  },
  {
    nomi: 'Bo‘sh ma‘lumot — oldingidek 12 nuqta, hammasi nol',
    tekshir: () => {
      const d = dinamikaHisoblaKunlik([], [], []);
      return d.length === 12 && d.every((n) => n.xatlovXonadon === 0 && n.aniqlangan === 0);
    },
  },
  {
    nomi: 'Eski `dinamikaHisobla(Date[])` imzosi SAQLANGAN',
    tekshir: () => dinamikaHisobla([new Date()], [], [], 'oy').length === 12,
  },

  /* ── 2. HAQIQIY BAZA: yangi so'rov = eski so'rov ── */
  {
    /*
     * Eski usulni testning O'ZIDA qayta yozamiz: butun
     * tarixni `findMany` bilan olib, `dinamikaHisobla` ga
     * beramiz. Yangi `tahlilniHisobla` bilan solishtiramiz.
     */
    nomi: 'Bazadagi natija: yangi SQL jamlanma = eski findMany usuli',
    tekshir: async () => {
      if (new Date().getTimezoneOffset() !== 0) return 'otkazildi'; /* baza kunni UTC da kesadi */
      for (const mid of [undefined, mahallaId]) {
        const yangi = (await tahlilniHisobla(mid, 'oy')).dinamika;
        const qayer = mid ? { mahallaId: mid } : {};
        const [x, a, j] = await Promise.all([
          prisma.household.findMany({ where: { ...qayer, holati: { not: 'QORALAMA' } }, select: { createdAt: true } }),
          prisma.unemployedPerson.findMany({ where: qayer, select: { createdAt: true } }),
          prisma.unemployedPerson.findMany({ where: { ...qayer, ishgaKirganSana: { not: null } }, select: { ishgaKirganSana: true } }),
        ]);
        const eski = dinamikaHisobla(
          x.map((q) => q.createdAt),
          a.map((q) => q.createdAt),
          j.map((q) => q.ishgaKirganSana as Date),
          'oy'
        );
        if (JSON.stringify(eski) !== JSON.stringify(yangi)) return false;
      }
      return true;
    },
  },
  {
    /*
     * ── ARXIV QORAVULI XOM SQL GA TA'SIR QILMAYDI ──
     *
     * Arxivga o'tkazilgan fuqaro grafikda sanalmasligi shart.
     */
    nomi: 'Arxivdagi fuqaro kunlik jamlanmada SANALMAYDI (xom SQL qorovuli)',
    tekshir: async () => {
      if (new Date().getTimezoneOffset() !== 0) return 'otkazildi';
      const oxirgi = async () => {
        const d = (await tahlilniHisobla(mahallaId, 'oy')).dinamika;
        return d[d.length - 1];
      };
      const oldin = await oxirgi();

      const arxivda = await prisma.unemployedPerson.create({
        data: { fish: 'Arxiv Sinov Tezlik', jinsi: 'ERKAK', mahallaId, arxivSanasi: new Date(), arxivSababi: 'Sinov' },
        select: { id: true },
      });
      tozalash.push(() => prisma.unemployedPerson.deleteMany({ where: { id: arxivda.id } }));
      const arxivdan = await oxirgi();

      const faol = await prisma.unemployedPerson.create({
        data: { fish: 'Faol Sinov Tezlik', jinsi: 'ERKAK', mahallaId },
        select: { id: true },
      });
      tozalash.push(() => prisma.unemployedPerson.deleteMany({ where: { id: faol.id } }));
      const faoldan = await oxirgi();

      return (
        /* Arxivdagi qo'shilganda HECH NARSA o'zgarmadi */
        arxivdan.aniqlangan === oldin.aniqlangan &&
        /* Faol qo'shilganda +1 — so'rov umuman ishlayapti */
        faoldan.aniqlangan === oldin.aniqlangan + 1
      );
    },
  },
  {
    /*
     * Qoralama xonadon — hali yuborilmagan ish. U «xatlovdan
     * o'tgan xonadon» sifatida sanalmasligi kerak.
     */
    nomi: 'Qoralama xonadon «xatlovdan o‘tgan» deb SANALMAYDI',
    tekshir: async () => {
      if (new Date().getTimezoneOffset() !== 0) return 'otkazildi';
      const oxirgi = async () => {
        const d = (await tahlilniHisobla(mahallaId, 'oy')).dinamika;
        return d[d.length - 1].xatlovXonadon;
      };
      const oldin = await oxirgi();
      const xonadon = (holati: 'QORALAMA' | 'YUBORILGAN', belgi: string) =>
        prisma.household.create({
          data: {
            mahallaId, xodimId, manzil: `Tezlik ${belgi} ${Date.now()}`, oilaBoshligi: `Tezlik ${belgi}`,
            jamiAzo: 3, takrorKaliti: `tezlik-${belgi}-${Date.now()}`, holati,
          },
          select: { id: true },
        });
      const q = await xonadon('QORALAMA', 'q');
      tozalash.push(() => prisma.household.deleteMany({ where: { id: q.id } }));
      const qoraDan = await oxirgi();
      const y = await xonadon('YUBORILGAN', 'y');
      tozalash.push(() => prisma.household.deleteMany({ where: { id: y.id } }));
      const yubordan = await oxirgi();
      return qoraDan === oldin && yubordan === oldin + 1;
    },
  },

  /* ── 3. SQL XAVFSIZLIGI ── */
  {
    nomi: 'Butun tarix sanalarini tortadigan `findMany` QAYTMAGAN',
    tekshir: () => {
      const k = kodiOl(oqi('src/lib/tahlil.ts'));
      return (
        !/findMany\(\{[^}]*select:\s*\{\s*createdAt:\s*true\s*\}/.test(k) &&
        !/select:\s*\{\s*ishgaKirganSana:\s*true\s*\}/.test(k) &&
        k.includes('kunlikSoni(')
      );
    },
  },
  {
    nomi: 'Xom SQL da arxiv sharti QO‘LDA yozilgan',
    tekshir: () => {
      const k = kodiOl(oqi('src/lib/tahlil.ts'));
      const bosh = k.indexOf('async function kunlikSoni');
      const kes = k.slice(bosh, bosh + 1500);
      return kes.includes('"arxivSanasi" IS NULL');
    },
  },
  {
    /*
     * `$queryRawUnsafe` satrni to'g'ridan-to'g'ri SQL ga
     * qo'shadi. Foydalanuvchi qiymati (`mahallaId`) esa
     * faqat PARAMETR sifatida o'tishi kerak.
     */
    nomi: 'SQL parametrlashtirilgan: `$queryRawUnsafe` ishlatilmaydi',
    tekshir: () => {
      const k = kodiOl(oqi('src/lib/tahlil.ts'));
      return !k.includes('queryRawUnsafe') && !k.includes('executeRawUnsafe') && k.includes('${mahallaId}');
    },
  },

  /* ── 4. MENYU IKONKALARI ── */
  {
    nomi: 'Menyudagi HAR ikonka nomi xaritada bor',
    tekshir: () => {
      const shell = oqi('src/components/shell/app-shell.tsx');
      const xarita = shell.slice(shell.indexOf('const IKONKALAR'), shell.indexOf('function Ikonka('));
      return MENYU.every((b) => new RegExp(`\\b${b.ikonka}\\b`).test(xarita));
    },
  },
  {
    /*
     * `Houses` nomi lucide-react 0.454 da YO'Q edi: ikonka
     * jimgina oddiy aylanaga almashgan va hech kim sezmagan.
     */
    nomi: 'Menyudagi HAR ikonka kutubxonaning O‘ZIDA mavjud',
    tekshir: () => {
      const l = require('lucide-react') as Record<string, unknown>;
      const yoq = MENYU.filter((b) => !l[b.ikonka]).map((b) => b.ikonka);
      if (yoq.length) console.log(`     yo‘q ikonkalar: ${yoq.join(', ')}`);
      return yoq.length === 0;
    },
  },
  {
    nomi: '`import * as ... from "lucide-react"` hech qayerda yo‘q (butun kutubxona)',
    tekshir: () => {
      const ayb: string[] = [];
      const yur = (d: string) => {
        for (const e of readdirSync(d)) {
          const y = join(d, e);
          if (statSync(y).isDirectory()) yur(y);
          else if (/\.tsx?$/.test(e) && /import\s*\*\s*as\s+\w+\s+from\s*['"]lucide-react['"]/.test(kodiOl(oqi(y)))) ayb.push(y);
        }
      };
      yur('src');
      if (ayb.length) console.log(`     ${ayb.join(', ')}`);
      return ayb.length === 0;
    },
  },

  /* ── 5. OG'IR KUTUBXONALAR TO'G'RIDAN-TO'G'RI KIRMAYDI ── */
  {
    nomi: 'Umumiy qobiq (layout) og‘ir kutubxonaga STATIK yetib bormaydi',
    tekshir: () => {
      const topilgan = [
        ...yetibBoriladigan('src/app/layout.tsx'),
        ...yetibBoriladigan('src/app/(ilova)/layout.tsx'),
      ].filter((p) => OG_IR.includes(p));
      if (topilgan.length) console.log(`     qobiq yetib boradi: ${topilgan.join(', ')}`);
      return topilgan.length === 0;
    },
  },
  {
    nomi: 'Dala xodimi sahifalari (/xatlov, /xatlov/yangi, /vazifalar) og‘ir kutubxonaga yetib bormaydi',
    tekshir: () => {
      let ayb = false;
      for (const s of [
        'src/app/(ilova)/xatlov/page.tsx',
        'src/app/(ilova)/xatlov/yangi/page.tsx',
        'src/app/(ilova)/xatlov/[id]/page.tsx',
        'src/app/(ilova)/vazifalar/page.tsx',
      ]) {
        const topilgan = [...yetibBoriladigan(s)].filter((p) => OG_IR.includes(p));
        if (topilgan.length) {
          console.log(`     ${s} → ${topilgan.join(', ')}`);
          ayb = true;
        }
      }
      return !ayb;
    },
  },
  {
    nomi: 'Hech bir sahifa `grafiklar` ni to‘g‘ridan-to‘g‘ri import qilmaydi',
    tekshir: () => {
      const ayb: string[] = [];
      const yur = (d: string) => {
        for (const e of readdirSync(d)) {
          const y = join(d, e);
          if (statSync(y).isDirectory()) yur(y);
          else if (/\.tsx?$/.test(e) && !y.endsWith('grafiklar-kechik.tsx') && !y.endsWith('/grafiklar.tsx')) {
            for (const imp of statikImportlar(y)) {
              if (/(^|\/)grafiklar$/.test(imp)) ayb.push(y);
            }
          }
        }
      };
      yur('src');
      if (ayb.length) console.log(`     ${ayb.join(', ')}`);
      return ayb.length === 0;
    },
  },
  {
    nomi: 'Kechiktirilgan diagramma: faqat TUR import qilinadi, bo‘lak dinamik',
    tekshir: () => {
      const k = oqi('src/components/panel/grafiklar-kechik.tsx');
      return (
        /import type \* as G from '\.\/grafiklar'/.test(k) &&
        k.includes("import('./grafiklar')") &&
        k.includes('ssr: false') &&
        !/(?<!type )import \{[^}]*\} from '\.\/grafiklar'/.test(k)
      );
    },
  },
  {
    nomi: 'Korinsa: o‘rin ajratadi (sakramasin) va eski brauzerda ham chizadi',
    tekshir: () => {
      const k = kodiOl(oqi('src/components/shared/korinsa.tsx'));
      return (
        k.includes('minHeight: balandlik') &&
        // Pol DOIMO turadi: ko'ringach olib tashlansa, diagramma
        // bo'lagi kelguncha blok nolga qulaydi (o'lchangan nuqson)
        !/korindi\s*\?\s*undefined\s*:\s*\{\s*minHeight/.test(k) &&
        k.includes("typeof IntersectionObserver === 'undefined'") &&
        k.includes('setKorindi(true)') &&
        k.includes('rootMargin')
      );
    },
  },

  /* ── 6. CI BYUDJETI ── */
  {
    nomi: 'CI qurishdan keyin hajm byudjetini tekshiradi',
    tekshir: () => {
      const w = oqi('.github/workflows/tekshiruv.yml');
      const i = w.indexOf('npm run build');
      return i > 0 && w.indexOf('hajm-byudjeti', i) > i;
    },
  },
];

async function main() {
  await tayyorla();
  let xato = 0;
  let otkazildi = 0;
  for (const s of SINOVLAR) {
    let n: Natija = false;
    try {
      n = await s.tekshir();
    } catch (e) {
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (n === 'otkazildi') {
      otkazildi++;
      console.log(`SKIP ${s.nomi}  — TZ=UTC kerak (CI da shunday)`);
      continue;
    }
    if (!n) xato++;
    console.log(`${n ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  await tozala();
  const jami = SINOVLAR.length - otkazildi;
  console.log(`\n${jami - xato}/${jami} o'tdi${otkazildi ? `  (${otkazildi} ta o‘tkazib yuborildi — hisobga kirmaydi)` : ''}`);
  await prisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
