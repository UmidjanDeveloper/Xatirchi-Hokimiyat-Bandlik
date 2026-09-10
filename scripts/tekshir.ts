/**
 * ============================================================
 *  JOYLASHTIRISHDAN OLDINGI TEKSHIRUV
 *
 *  Ishga tushirish:  npm run tekshir
 *
 *  Bu skript "hamma narsa joyidami?" degan savolga javob beradi:
 *  sozlamalar to'g'rimi, bazaga ulana oladimi, migratsiyalar
 *  qo'llanganmi, Supabase himoyasi yoqilganmi, ma'lumot bormi.
 *
 *  Har bir tekshiruv uchta holatdan birida bo'ladi:
 *    OK    - joyida
 *    OGOH  - ishlaydi, lekin e'tibor bering
 *    XATO  - tuzatilmasa tizim ishlamaydi (yoki xavfsiz emas)
 *
 *  Chiqish kodi: bironta XATO bo'lsa 1, aks holda 0. Shu tufayli
 *  uni CI'da yoki joylashtirishdan oldin avtomatik ishlatsa ham
 *  bo'ladi.
 * ============================================================
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

/*
 * `.env` ni qo'lda o'qiymiz.
 *
 * Prisma CLI buni o'zi qiladi, lekin bu skript to'g'ridan-to'g'ri
 * `tsx` bilan ishga tushadi - u hech narsa yuklamaydi. Tashqi
 * kutubxona qo'shmaslik uchun sodda o'quvchi yozilgan: bu yerda
 * murakkab sintaksis kerak emas, `.env` da faqat KALIT=qiymat bor.
 *
 * Muhitda allaqachon turgan qiymat ustunroq - Vercel yoki
 * boshqa serverda sozlamalar fayldan emas, muhitdan keladi.
 */
function envYukla(fayl = '.env') {
  let matn: string;
  try {
    matn = readFileSync(fayl, 'utf8');
  } catch {
    return; // fayl yo'q - server muhitida bu normal
  }

  for (const qator of matn.split('\n')) {
    const t = qator.trim();
    if (!t || t.startsWith('#')) continue;

    const teng = t.indexOf('=');
    if (teng === -1) continue;

    const kalit = t.slice(0, teng).trim();
    let qiymat = t.slice(teng + 1).trim();

    // "..." yoki '...' qavslarini olib tashlaymiz
    if (
      (qiymat.startsWith('"') && qiymat.endsWith('"')) ||
      (qiymat.startsWith("'") && qiymat.endsWith("'"))
    ) {
      qiymat = qiymat.slice(1, -1);
    }

    if (process.env[kalit] === undefined) process.env[kalit] = qiymat;
  }
}

envYukla();

type Holat = 'OK' | 'OGOH' | 'XATO';

const natijalar: { holat: Holat; nom: string; izoh: string }[] = [];

function yoz(holat: Holat, nom: string, izoh: string) {
  natijalar.push({ holat, nom, izoh });
}

/* ── 1. Muhit o'zgaruvchilari ─────────────────────────────── */

function muhitniTekshir() {
  const db = process.env.DATABASE_URL;
  const direct = process.env.DIRECT_URL;
  const secret = process.env.SESSION_SECRET;

  if (!db) {
    yoz('XATO', 'DATABASE_URL', 'sozlanmagan');
  } else if (db.includes('xxxxxxxx') || db.includes('PAROL')) {
    yoz('XATO', 'DATABASE_URL', '.env.example dagi namuna qiymati qolib ketgan');
  } else {
    /*
     * Supabase'da ikkita port bor va ular chalkashtirilsa ilova
     * "too many connections" bilan yiqiladi:
     *   6543 - pooler (pgbouncer), ilova shu portdan ulanadi;
     *   5432 - to'g'ridan-to'g'ri, faqat migratsiya uchun.
     * Serverless muhitda har so'rov yangi ulanish ochadi, shuning
     * uchun pooler shart.
     */
    const supabase = db.includes('supabase');
    if (supabase && !db.includes('6543')) {
      yoz('OGOH', 'DATABASE_URL', 'Supabase pooler (6543-port) ishlatilmayapti');
    } else if (supabase && !db.includes('pgbouncer=true')) {
      yoz('OGOH', 'DATABASE_URL', '`?pgbouncer=true` qo‘shilmagan');
    } else {
      yoz('OK', 'DATABASE_URL', supabase ? 'Supabase pooler' : 'sozlangan');
    }
  }

  if (!direct) {
    yoz('OGOH', 'DIRECT_URL', 'sozlanmagan - migratsiya ishlamasligi mumkin');
  } else if (direct === db) {
    yoz('OGOH', 'DIRECT_URL', 'DATABASE_URL bilan bir xil');
  } else {
    yoz('OK', 'DIRECT_URL', 'sozlangan');
  }

  if (!secret) {
    yoz('XATO', 'SESSION_SECRET', 'sozlanmagan - tizimga kirib bo‘lmaydi');
  } else if (secret.startsWith('ALMASHTIRING')) {
    yoz('XATO', 'SESSION_SECRET', 'namuna qiymati almashtirilmagan');
  } else if (secret.length < 32) {
    yoz('XATO', 'SESSION_SECRET', `juda qisqa (${secret.length} belgi, kamida 32 kerak)`);
  } else {
    yoz('OK', 'SESSION_SECRET', `${secret.length} belgi`);
  }

  const parol = process.env.ADMIN_PASSWORD;
  if (!parol) {
    yoz('OGOH', 'ADMIN_PASSWORD', 'sozlanmagan - seed administrator yaratmaydi');
  } else if (parol.startsWith('ALMASHTIRING') || parol.length < 12) {
    yoz('XATO', 'ADMIN_PASSWORD', 'namuna yoki juda zaif parol');
  } else {
    yoz('OK', 'ADMIN_PASSWORD', 'sozlangan');
  }
}

/* ── 2. Baza ──────────────────────────────────────────────── */

async function bazaniTekshir(prisma: PrismaClient) {
  const [{ version }] = await prisma.$queryRawUnsafe<{ version: string }[]>(
    'SELECT version()'
  );
  yoz('OK', 'Ulanish', version.split(',')[0]);

  /* Migratsiyalar qo'llanganmi */
  const migratsiyalar = await prisma.$queryRawUnsafe<
    { migration_name: string; finished_at: Date | null }[]
  >(
    `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at`
  ).catch(() => null);

  if (!migratsiyalar) {
    yoz('XATO', 'Migratsiya', 'qo‘llanmagan - `npm run db:deploy` ishlating');
    return;
  }

  const tugallanmagan = migratsiyalar.filter((m) => !m.finished_at);
  if (tugallanmagan.length) {
    yoz('XATO', 'Migratsiya', `${tugallanmagan[0].migration_name} yarim qolgan`);
  } else {
    yoz('OK', 'Migratsiya', `${migratsiyalar.length} ta qo‘llangan`);
  }
}

/* ── 3. Supabase himoyasi ─────────────────────────────────── */

async function himoyaniTekshir(prisma: PrismaClient) {
  /*
   * Supabase `public` sxemasini avtomatik REST API orqali
   * tashqariga ochadi. Fuqarolarning shaxsiy ma'lumoti shu yerda
   * turgani uchun bu jadvallar anonim ko'rinmasligi shart.
   */
  const rlssiz = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE '\\_prisma%'
        AND NOT rowsecurity`
  );

  if (rlssiz.length) {
    yoz(
      'XATO',
      'RLS himoyasi',
      `${rlssiz.length} ta jadvalda yoqilmagan: ${rlssiz.map((r) => r.tablename).join(', ')}`
    );
  } else {
    yoz('OK', 'RLS himoyasi', 'barcha jadvallarda yoqilgan');
  }

  const anonBor = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n FROM pg_roles WHERE rolname = 'anon'`
  );

  if (Number(anonBor[0].n) === 0) {
    yoz('OK', 'Anonim kirish', 'oddiy PostgreSQL - `anon` roli yo‘q');
    return;
  }

  const ochiq = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT DISTINCT table_name FROM information_schema.role_table_grants
      WHERE grantee IN ('anon', 'authenticated') AND table_schema = 'public'`
  );

  if (ochiq.length) {
    yoz(
      'XATO',
      'Anonim kirish',
      `${ochiq.length} ta jadval anonim ochiq: ${ochiq.map((r) => r.table_name).join(', ')}`
    );
  } else {
    yoz('OK', 'Anonim kirish', 'yopilgan');
  }
}

/* ── 4. Ma'lumot ──────────────────────────────────────────── */

async function malumotniTekshir(prisma: PrismaClient) {
  const [mahalla, admin, rais, xonadon] = await Promise.all([
    prisma.mahalla.count(),
    prisma.user.count({ where: { rol: 'ADMIN' } }),
    prisma.user.count({ where: { rol: 'YETTILIK' } }),
    prisma.household.count(),
  ]);

  if (mahalla === 0) {
    yoz('XATO', 'Mahallalar', 'baza bo‘sh - `npm run db:seed` ishlating');
  } else if (mahalla !== 70) {
    yoz('OGOH', 'Mahallalar', `${mahalla} ta (tasdiqlangan ro‘yxatda 70 ta)`);
  } else {
    yoz('OK', 'Mahallalar', '70 ta');
  }

  if (admin === 0) {
    yoz('XATO', 'Administrator', 'yaratilmagan - tizimni boshqarib bo‘lmaydi');
  } else {
    yoz('OK', 'Administrator', `${admin} ta`);
  }

  yoz(rais === 70 ? 'OK' : 'OGOH', 'MFY raislari', `${rais} ta hisob`);

  /* Parol almashtirmaganlar - birinchi kirishdan keyin 0 bo'lishi kerak emas, bu norma */
  const almashtirmagan = await prisma.user.count({
    where: { parolAlmashtirilsin: true },
  });
  if (almashtirmagan > 0) {
    yoz('OK', 'Boshlang‘ich parollar', `${almashtirmagan} ta hisob hali almashtirmagan`);
  }

  yoz('OK', 'Xatlov', `${xonadon} ta xonadon kiritilgan`);
}

/* ── Ishga tushirish ──────────────────────────────────────── */

async function main() {
  console.log('\n  XATIRCHI BANDLIK PLATFORMASI — tekshiruv\n');

  muhitniTekshir();

  const bazaXato = natijalar.some(
    (n) => n.holat === 'XATO' && n.nom === 'DATABASE_URL'
  );

  if (!bazaXato) {
    const prisma = new PrismaClient({ log: [] });
    try {
      await bazaniTekshir(prisma);
      const migratsiyaBor = natijalar.some(
        (n) => n.nom === 'Migratsiya' && n.holat === 'OK'
      );
      if (migratsiyaBor) {
        await himoyaniTekshir(prisma);
        await malumotniTekshir(prisma);
      }
    } catch (xato) {
      yoz('XATO', 'Ulanish', xato instanceof Error ? xato.message.split('\n')[0] : String(xato));
    } finally {
      await prisma.$disconnect();
    }
  }

  const belgi = { OK: '  ✓', OGOH: '  !', XATO: '  ✗' };
  const eni = Math.max(...natijalar.map((n) => n.nom.length));

  for (const n of natijalar) {
    console.log(`${belgi[n.holat]}  ${n.nom.padEnd(eni)}  ${n.izoh}`);
  }

  const xatolar = natijalar.filter((n) => n.holat === 'XATO').length;
  const ogohlar = natijalar.filter((n) => n.holat === 'OGOH').length;

  console.log('');
  if (xatolar) {
    console.log(`  ${xatolar} ta xato tuzatilishi kerak.\n`);
    process.exit(1);
  }
  console.log(
    ogohlar
      ? `  Hammasi ishlaydi, ${ogohlar} ta ogohlantirish bor.\n`
      : '  Hammasi joyida — joylashtirishga tayyor.\n'
  );
}

main();
