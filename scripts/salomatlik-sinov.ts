/**
 * ============================================================
 *  SALOMATLIK TEKSHIRUVI (/api/health, /api/health/readiness) — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/salomatlik-sinov.ts
 *
 *  Bu yerda xato nimaga olib keladi:
 *   1. BAZA O'LGANDA "ok" DESA - tashqi monitoring jim qoladi (butun
 *      maqsad shu: administrator 1 oy yo'q bo'lganda ham signal kelsin).
 *   2. XATO MATNI CHIQSA - yo'l ochiq, Prisma xatosida ulanish ma'lumoti
 *      bo'lishi mumkin.
 *   3. BAZA OSILIB QOLGANDA JAVOB KELMASA - monitoring "timeout" ko'radi,
 *      sababini emas; so'rovlar to'planib bazani ko'proq bo'g'adi.
 *   4. KESH BO'LMASA - ochiq manzilni tinimsiz so'rash bazani yuklaydi.
 *   5. HAR DEPLOYDA SOXTA SIGNAL - kuzatuv yangi yoqilganda cron hali
 *      ishlamagan: bu nosozlik emas; eskirgandan keyin esa nosozlik.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { middleware } from '../src/middleware';
import { prisma as ilovaPrisma } from '../src/lib/prisma';
import {
  BAZA_VAQTI_MS,
  BIRINCHI_ISH_MUDDATI_SOAT,
  KESH_MS,
  ishlarSogMi,
  salomatlik,
  salomatlikKeshiniTozala,
} from '../src/lib/salomatlik';
import { CRON_ISHLARI } from '../src/lib/tizim-kuzatuvi';
import { GET as jonli } from '../src/app/api/health/route';
import { GET as tayyor } from '../src/app/api/health/readiness/route';

type Sinov = { nomi: string; tekshir: () => Promise<boolean> | boolean };
const prisma = new PrismaClient();
const oqi = (y: string) => readFileSync(y, 'utf8');
const SOAT = 3600_000;
const SAYT = 'https://www.xatirchibandlik.uz';
const mw = (yol: string) => middleware(new NextRequest(new URL(yol, SAYT)));
const otdi = (r: Response) => r.headers.get('x-middleware-next') === '1';

let izSanagich = 0;
async function ishYoz(nomi: string, holati: 'MUVAFFAQIYATLI' | 'XATO' | 'DAVOM_ETMOQDA', oldinMs: number) {
  const b = new Date(Date.now() - oldinMs);
  await prisma.tizimIshi.create({
    data: { nomi, usul: 'cron', izId: `iz_h${String(++izSanagich).padStart(9, '0')}${Date.now() % 1000}`, holati, boshlandi: b, tugadi: holati === 'DAVOM_ETMOQDA' ? null : new Date(b.getTime() + 1000) },
  });
}
async function hammaSogMi() {
  for (const j of CRON_ISHLARI) await ishYoz(j.nomi, 'MUVAFFAQIYATLI', 2 * SOAT);
}

/** prisma.$queryRaw ni vaqtincha almashtiradi */
async function bazaBuzilganda<T>(almash: () => Promise<unknown>, ish: () => Promise<T>): Promise<T> {
  const asl = ilovaPrisma.$queryRaw;
  (ilovaPrisma as unknown as { $queryRaw: unknown }).$queryRaw = almash;
  const xom = console.error;
  console.error = () => {};
  try {
    return await ish();
  } finally {
    (ilovaPrisma as unknown as { $queryRaw: unknown }).$queryRaw = asl;
    console.error = xom;
  }
}

const SINOVLAR: Sinov[] = [
  /* ══ sof qoida ══ */
  {
    nomi: 'ishlarSogMi: kechikkan, xato, to\'xtab qolgan - NOSOG\'; "tinch" - sog\'; "hali ishlamagan" yosh tizimda sog\', eskirgan tizimda nosog\' (chegara 36 soat)',
    tekshir: () =>
      ishlarSogMi(['TINCH', 'TINCH'], 100) &&
      !ishlarSogMi(['TINCH', 'KECHIKKAN'], 1) &&
      !ishlarSogMi(['XATODA', 'TINCH'], 1) &&
      !ishlarSogMi(['TINCH', 'TOXTAB_QOLGAN'], 1) &&
      ishlarSogMi(['HECH_QACHON', 'TINCH'], 5) &&
      ishlarSogMi(['HECH_QACHON'], BIRINCHI_ISH_MUDDATI_SOAT) &&
      !ishlarSogMi(['HECH_QACHON'], BIRINCHI_ISH_MUDDATI_SOAT + 0.1) &&
      ishlarSogMi(['HECH_QACHON'], null) &&
      BIRINCHI_ISH_MUDDATI_SOAT === 36,
  },

  /* ══ middleware ══ */
  {
    nomi: 'Middleware: /api/health va /api/health/readiness cookie\'siz o\'tadi; qo\'shni yo\'llar (/api/health/x, /api/healthz, /api/health/, katta harf, readiness/x) o\'tmaydi (401)',
    tekshir: () => {
      const ochiq = otdi(mw('/api/health')) && otdi(mw('/api/health/readiness'));
      const yopiq = ['/api/health/x', '/api/healthz', '/api/health/', '/api/HEALTH', '/api/health/readiness/x', '/api/health/readiness/', '/api/health/../xatlov'].every((y) => {
        const r = mw(y);
        const ok = !otdi(r) && r.status === 401;
        if (!ok) console.log(`     ochiq qoldi: ${y} (${r.status})`);
        return ok;
      });
      return ochiq && yopiq;
    },
  },
  {
    nomi: 'Middleware: salomatlik yo\'llari AYNAN moslikda (prefiks ro\'yxati OCHIQ ga qo\'shilmagan); idrok yo\'li o\'zgarmagan',
    tekshir: () => {
      const k = oqi('src/middleware.ts');
      const ochiq = k.slice(k.indexOf('const OCHIQ'), k.indexOf('];', k.indexOf('const OCHIQ')));
      return (
        !ochiq.includes('/api/health') &&
        k.includes("const SALOMATLIK_YOLLARI = new Set(['/api/health', '/api/health/readiness'])") &&
        k.includes('if (SALOMATLIK_YOLLARI.has(pathname))') &&
        k.includes("const ANIQ_OCHIQ = new Set(['/api/idrok/stats'])")
      );
    },
  },

  /* ══ jonli ══ */
  {
    nomi: '/api/health: 200 {ok:true}, keshlanmaydi, bazaga UMUMAN tegmaydi (baza buzilgan bo\'lsa ham 200)',
    tekshir: async () =>
      bazaBuzilganda(
        async () => {
          throw new Error('baza yo\'q');
        },
        async () => {
          const r = await jonli();
          const b = await r.json();
          return r.status === 200 && b.ok === true && Object.keys(b).length === 1 && /no-store/.test(r.headers.get('cache-control') ?? '');
        }
      ),
  },

  /* ══ tayyorlik (baza bilan) ══ */
  {
    nomi: 'Tayyorlik: hamma ish yaqinda ishlagan - "ok", 200; javob FAQAT ruxsat etilgan kalitlarda (status, tekshiruvlar.baza, tekshiruvlar.avtomatikIshlar)',
    tekshir: async () => {
      await prisma.tizimIshi.deleteMany({});
      await hammaSogMi();
      salomatlikKeshiniTozala();
      const r = await tayyor();
      const b = await r.json();
      const kalitlar = JSON.stringify(Object.keys(b).sort()) === '["status","tekshiruvlar"]' && JSON.stringify(Object.keys(b.tekshiruvlar).sort()) === '["avtomatikIshlar","baza"]';
      return r.status === 200 && b.status === 'ok' && b.tekshiruvlar.baza === true && b.tekshiruvlar.avtomatikIshlar === true && kalitlar;
    },
  },
  {
    nomi: 'Tayyorlik: bitta ish 40 soat ishlamagan (KECHIKKAN) - 503 "degraded", baza esa tirik',
    tekshir: async () => {
      await prisma.tizimIshi.deleteMany({});
      await ishYoz('brifing', 'MUVAFFAQIYATLI', 40 * SOAT);
      await ishYoz('navbat', 'MUVAFFAQIYATLI', 2 * SOAT);
      salomatlikKeshiniTozala();
      const r = await tayyor();
      const b = await r.json();
      return r.status === 503 && b.status === 'degraded' && b.tekshiruvlar.baza === true && b.tekshiruvlar.avtomatikIshlar === false;
    },
  },
  {
    nomi: 'Tayyorlik: oxirgi urinish XATO bilan tugagan - 503; keyin tuzalgach (yangi muvaffaqiyat) - yana 200',
    tekshir: async () => {
      await prisma.tizimIshi.deleteMany({});
      await hammaSogMi();
      await ishYoz('brifing', 'XATO', 30 * 60_000);
      salomatlikKeshiniTozala();
      const yomon = (await tayyor()).status;
      await ishYoz('brifing', 'MUVAFFAQIYATLI', 5 * 60_000);
      salomatlikKeshiniTozala();
      const yaxshi = (await tayyor()).status;
      return yomon === 503 && yaxshi === 200;
    },
  },
  {
    nomi: 'Tayyorlik: ish "davom etmoqda" 30 daqiqa (to\'xtab qolgan) - 503',
    tekshir: async () => {
      await prisma.tizimIshi.deleteMany({});
      await hammaSogMi();
      await ishYoz('navbat', 'DAVOM_ETMOQDA', 30 * 60_000);
      salomatlikKeshiniTozala();
      return (await tayyor()).status === 503;
    },
  },
  {
    nomi: '"Hali ishlamagan": kuzatuv 5 soat oldin yoqilgan - kutiladi (200, soxta signal yo\'q); 50 soat oldin - nosozlik (503)',
    tekshir: async () => {
      await prisma.tizimIshi.deleteMany({});
      salomatlikKeshiniTozala();
      const yosh = await salomatlik(new Date(), 5);
      salomatlikKeshiniTozala();
      const eski = await salomatlik(new Date(), 50);
      return yosh.status === 'ok' && eski.status === 'degraded' && eski.tekshiruvlar.baza === true && eski.tekshiruvlar.avtomatikIshlar === false;
    },
  },
  {
    nomi: 'Kuzatuv yoshi bazadan o\'qiladi: monitoring migratsiyasi qo\'llangan - son (null emas) va hozirgi vaqtdan oldin',
    tekshir: async () => {
      const q = await prisma.$queryRaw<{ t: Date | null }[]>`SELECT finished_at AS t FROM "_prisma_migrations" WHERE migration_name LIKE '%_monitoring' AND finished_at IS NOT NULL ORDER BY finished_at ASC LIMIT 1`;
      return Boolean(q[0]?.t) && new Date(q[0].t as Date).getTime() <= Date.now();
    },
  },

  /* ══ baza buzilganda ══ */
  {
    nomi: 'BAZA O\'LGAN: 503 "degraded", baza=false, ishlar=false; javobda xato matni YO\'Q (sir bo\'lgan xato matni ham chiqmaydi); xato tashlamaydi',
    tekshir: async () => {
      const SIR = 'postgresql://admin:Sirli-Parol-99@db.ichki.host:5432/prod';
      return bazaBuzilganda(
        async () => {
          throw new Error(`connect ECONNREFUSED ${SIR}`);
        },
        async () => {
          salomatlikKeshiniTozala();
          const r = await tayyor();
          const matn = JSON.stringify(await r.json());
          return r.status === 503 && /"baza":false/.test(matn) && /"avtomatikIshlar":false/.test(matn) && !matn.includes('Sirli') && !matn.includes('ECONNREFUSED') && !matn.includes('db.ichki');
        }
      );
    },
  },
  {
    nomi: `BAZA OSILIB QOLGAN: ${BAZA_VAQTI_MS} ms dan keyin javob beradi (tashlab ketmaydi, to'planib qolmaydi) - 503`,
    tekshir: async () =>
      bazaBuzilganda(
        () => new Promise(() => {}),
        async () => {
          salomatlikKeshiniTozala();
          const t0 = Date.now();
          const r = await tayyor();
          const ms = Date.now() - t0;
          return r.status === 503 && ms >= BAZA_VAQTI_MS - 100 && ms < BAZA_VAQTI_MS + 2500;
        }
      ),
  },
  {
    nomi: `KESH: ${KESH_MS / 1000} soniya ichida baza qayta so'ralmaydi (10 so'rov - 1 ta baza murojaati); muddatdan keyin qayta so'raladi; o'tmishga qaytgan soat keshni ishlatmaydi`,
    tekshir: async () => {
      await prisma.tizimIshi.deleteMany({});
      await hammaSogMi();
      let chaqirildi = 0;
      const asl = ilovaPrisma.$queryRaw;
      (ilovaPrisma as unknown as { $queryRaw: unknown }).$queryRaw = (...a: unknown[]) => {
        chaqirildi++;
        return (asl as unknown as (...x: unknown[]) => unknown).apply(ilovaPrisma, a);
      };
      try {
        salomatlikKeshiniTozala();
        const t0 = new Date();
        for (let i = 0; i < 10; i++) await salomatlik(new Date(t0.getTime() + i * 500));
        const birinchi = chaqirildi;
        await salomatlik(new Date(t0.getTime() + KESH_MS + 1000));
        const keyin = chaqirildi;
        await salomatlik(new Date(t0.getTime() - 60_000));
        return birinchi >= 1 && birinchi <= 2 && keyin > birinchi && chaqirildi > keyin;
      } finally {
        (ilovaPrisma as unknown as { $queryRaw: unknown }).$queryRaw = asl;
      }
    },
  },

  /* ══ ro'yxat mosligi ══ */
  {
    nomi: 'Tayyorlik cron ro\'yxati bilan bog\'langan: CRON_ISHLARI bo\'sh bo\'lsa "sog\'lom" deyilmaydi (kod himoyasi)',
    tekshir: () => oqi('src/lib/salomatlik.ts').includes('CRON_ISHLARI.length > 0 && ishlar.length === CRON_ISHLARI.length'),
  },
];

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }
  await prisma.tizimIshi.deleteMany({});
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
  await prisma.tizimIshi.deleteMany({});
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  await ilovaPrisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
