/**
 * ============================================================
 *  IDROK STATISTIKASI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/idrok-sinov.ts
 *
 *  `/api/idrok/stats` — sessiyasiz ochiladigan yagona yo'l
 *  (Telegram va Cron'dan tashqari). Shuning uchun uchta narsa
 *  har safar tekshiriladi:
 *
 *    1. Middleware FAQAT aynan shu manzilni o'tkazadi —
 *       qo'shni yo'llar (`/api/idrok/stats/x`, `/api/idrok`)
 *       avvalgidek 401 oladi.
 *    2. Kalitsiz, noto'g'ri kalit bilan yoki kalit sozlanmagan
 *       holda hech narsa chiqmaydi (401 / 404).
 *    3. Modul faqat O'QIYDI va shaxsiy maydonlarni so'ramaydi.
 *
 *  Bazali qism (javob shakli va raqamlar mosligi) faqat
 *  `DATABASE_URL` muhitda berilganda ishlaydi — CI'da shunday.
 *  `.env` ATAYLAB o'qilmaydi: mahalliy kompyuterdagi production
 *  manziliga bu sinov o'zicha ulanmasin.
 * ============================================================
 */
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';
import { GET, dynamic, runtime } from '../src/app/api/idrok/stats/route';
import {
  IDROK_MANBA,
  JADVAL_QATOR_CHEGARASI,
  idrokKalitiTogrimi,
  idrokKeshiniTozala,
  jadval,
  katalogdan,
  son,
} from '../src/lib/idrok-statistika';
import { MASUL_TASHKILOT } from '../src/lib/constants';

type Sinov = { nomi: string; tekshir: () => boolean | Promise<boolean> };

/** Izohlarsiz kod — izohdagi so'z tekshiruvni aldamasin */
const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const oqi = (y: string) => kodiOl(readFileSync(y, 'utf8'));

const SAYT = 'https://www.xatirchibandlik.uz';
const SINOV_KALITI = 'idrok-sinov-kaliti-kamida-32-belgi-bolsin-123';

/** Middleware'ni cookie'siz chaqiradi */
function mw(yol: string, usul = 'GET'): Response {
  return middleware(new NextRequest(new URL(yol, SAYT), { method: usul }));
}
/** `NextResponse.next()` — so'rov ichkariga o'tdi */
const otdi = (r: Response) => r.headers.get('x-middleware-next') === '1';

async function chaqir(kalit?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (kalit !== undefined) headers['X-IDROK-Key'] = kalit;
  return GET(new Request(`${SAYT}/api/idrok/stats`, { headers }));
}

/** Muhit o'zgaruvchisini vaqtincha qo'yib, keyin tiklaydi */
async function kalitBilan<T>(kalit: string | undefined, ish: () => Promise<T>): Promise<T> {
  const oldingi = process.env.IDROK_API_KEY;
  if (kalit === undefined) delete process.env.IDROK_API_KEY;
  else process.env.IDROK_API_KEY = kalit;
  try {
    return await ish();
  } finally {
    if (oldingi === undefined) delete process.env.IDROK_API_KEY;
    else process.env.IDROK_API_KEY = oldingi;
  }
}

const SINOVLAR: Sinov[] = [
  /* ── 1. MIDDLEWARE ── */
  {
    nomi: 'Middleware `/api/idrok/stats` ni cookie\'siz o\'tkazadi',
    tekshir: () => otdi(mw('/api/idrok/stats')),
  },
  {
    nomi: 'Qo\'shni yo\'llar o\'tmaydi: /api/idrok/stats/x, /api/idrok, /api/idrok/statsx, katta harf',
    tekshir: () =>
      [
        '/api/idrok/stats/',
        '/api/idrok/stats/x',
        '/api/idrok',
        '/api/idrok/',
        '/api/idrok/statsx',
        '/api/idrok/STATS',
        '/api/idrok/stats/../../xatlov',
      ].every((y) => {
        const r = mw(y);
        const ok = !otdi(r) && r.status === 401;
        if (!ok) console.log(`     ochiq qoldi: ${y} (${r.status})`);
        return ok;
      }),
  },
  {
    nomi: 'Boshqa API yo\'llar avvalgidek 401 qaytaradi',
    tekshir: () =>
      ['/api/xatlov', '/api/ishsizlar/abc', '/api/hisobot', '/api/auth/kim'].every(
        (y) => mw(y).status === 401
      ),
  },
  {
    nomi: 'Istisno prefiks ro\'yxatiga (`OCHIQ`) emas, aniq moslikka qo\'shilgan',
    tekshir: () => {
      const k = oqi('src/middleware.ts');
      const ochiq = k.slice(k.indexOf('const OCHIQ'), k.indexOf('];', k.indexOf('const OCHIQ')));
      return (
        !ochiq.includes('/api/idrok') &&
        k.includes("const ANIQ_OCHIQ = new Set(['/api/idrok/stats'])") &&
        k.includes('if (ANIQ_OCHIQ.has(pathname))')
      );
    },
  },

  /* ── 2. KALIT ── */
  {
    nomi: 'Kalit solishtiruvi: to\'g\'ri — ha; noto\'g\'ri, bo\'sh, uzunligi boshqa — yo\'q',
    tekshir: () =>
      idrokKalitiTogrimi('abc', 'abc') &&
      !idrokKalitiTogrimi('abd', 'abc') &&
      !idrokKalitiTogrimi('abcd', 'abc') &&
      !idrokKalitiTogrimi('', 'abc') &&
      !idrokKalitiTogrimi(null, 'abc') &&
      !idrokKalitiTogrimi(undefined, 'abc') &&
      !idrokKalitiTogrimi('abc', '') &&
      !idrokKalitiTogrimi('abc', null),
  },
  {
    nomi: 'Solishtiruv SHA-256 + timingSafeEqual orqali (oddiy `===` emas)',
    tekshir: () => {
      const k = oqi('src/lib/idrok-statistika.ts');
      return (
        k.includes("createHash('sha256')") &&
        k.includes('timingSafeEqual(a, b)') &&
        !/kelgan\s*===\s*kutilgan/.test(k)
      );
    },
  },
  {
    nomi: 'IDROK_API_KEY qo\'yilmagan yoki bo\'sh — 404 (yo\'l o\'chiq)',
    tekshir: async () => {
      const a = await kalitBilan(undefined, () => chaqir(SINOV_KALITI));
      const b = await kalitBilan('   ', () => chaqir('   '));
      return a.status === 404 && b.status === 404 && a.headers.get('cache-control') === 'no-store';
    },
  },
  {
    nomi: 'Kalitsiz va noto\'g\'ri kalit bilan — 401 {"xato":"Ruxsat yo\'q"}, no-store',
    tekshir: async () =>
      kalitBilan(SINOV_KALITI, async () => {
        for (const r of [await chaqir(), await chaqir('notogri'), await chaqir(`${SINOV_KALITI}x`)]) {
          const tana = (await r.json()) as unknown;
          if (r.status !== 401) return false;
          if (JSON.stringify(tana) !== JSON.stringify({ xato: "Ruxsat yo'q" })) return false;
          if (r.headers.get('cache-control') !== 'no-store') return false;
        }
        return true;
      }),
  },
  {
    nomi: 'Yo\'l dinamik va Node muhitida (`force-dynamic`, `nodejs`)',
    tekshir: () => dynamic === 'force-dynamic' && runtime === 'nodejs',
  },
  {
    nomi: 'Yo\'l faqat GET eksport qiladi',
    tekshir: () => {
      const k = oqi('src/app/api/idrok/stats/route.ts');
      return (
        k.includes('export async function GET') &&
        !/export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)/.test(k)
      );
    },
  },

  /* ── 3. FAQAT O'QISH VA SHAXSIY MA'LUMOTSIZ ── */
  {
    nomi: 'Modulda yozish, xom SQL va yon ta\'sirli yordamchi yo\'q',
    tekshir: () => {
      const k = oqi('src/lib/idrok-statistika.ts') + oqi('src/app/api/idrok/stats/route.ts');
      const taqiq = [
        /\bprisma\.\w+\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/,
        /\$executeRaw|\$queryRaw|\$transaction/,
        /\b(talabQil|joriyXodim|auditLog|xomPrisma)\b/,
      ];
      const topildi = taqiq.filter((t) => t.test(k));
      if (topildi.length) console.log(`     topildi: ${topildi.map(String).join(', ')}`);
      return topildi.length === 0;
    },
  },
  {
    nomi: 'Shaxsiy maydonlar so\'ralmaydi (F.I.Sh., telefon, manzil, tug\'ilgan sana...)',
    tekshir: () => {
      const k = oqi('src/lib/idrok-statistika.ts');
      const maydon =
        /\b(fish|telefon|manzil|yashashManzili|tugilganSana|tugilganYili|oilaBoshligi\w*|fullName|username|passwordHash|phone|masulFish|masulTelefon|korxonaNomi|masulShaxs|izoh|xulosa|imzoYoli|telegramChatId)\s*:/;
      const m = k.match(maydon);
      if (m) console.log(`     topildi: ${m[0]}`);
      return !m;
    },
  },

  /* ── 4. TOZA YORDAMCHILAR ── */
  {
    nomi: `Jadval ${JADVAL_QATOR_CHEGARASI} qatordan oshmaydi va sonlar JSON son bo'ladi`,
    tekshir: () => {
      const j = jadval(
        'x',
        ['Nomi', 'Soni'],
        Array.from({ length: 70 }, (_, i) => [`M${i}`, i % 2 ? BigInt(i) : Number.NaN])
      );
      return (
        j.qatorlar.length === JADVAL_QATOR_CHEGARASI &&
        j.qatorlar.every((q) => typeof q[0] === 'string' && typeof q[1] === 'number' && Number.isFinite(q[1]))
      );
    },
  },
  {
    nomi: 'son(): bigint -> number, NaN/Infinity/null -> 0',
    tekshir: () =>
      son(BigInt(5)) === 5 && son(Number.NaN) === 0 && son(Infinity) === 0 && son(null) === 0 && son(2.5) === 2.5,
  },
  {
    nomi: 'Katalogdan tashqari erkin matn "Boshqa" ga tushadi, apostrof farqi xalaqit bermaydi',
    tekshir: () =>
      katalogdan(MASUL_TASHKILOT, 'bandlik markazi') === 'Bandlik markazi' &&
      katalogdan(MASUL_TASHKILOT, "Qishloq xo'jaligi bo'limi") === 'Qishloq xo‘jaligi bo‘limi' &&
      katalogdan(MASUL_TASHKILOT, 'Karimov Anvar, +998901234567') === 'Boshqa' &&
      katalogdan(MASUL_TASHKILOT, null) === 'Boshqa',
  },

  /* ── 5. BAZA BILAN (faqat DATABASE_URL bo'lsa) ── */
  {
    nomi: 'To\'g\'ri kalit bilan javob shartnomaga mos (bazali)',
    tekshir: async () => {
      if (!process.env.DATABASE_URL) {
        console.log('     DATABASE_URL yo‘q — bazali qism o‘tkazib yuborildi');
        return true;
      }
      idrokKeshiniTozala();
      return kalitBilan(SINOV_KALITI, async () => {
        const r = await chaqir(SINOV_KALITI);
        if (r.status !== 200 || r.headers.get('cache-control') !== 'no-store') {
          console.log(`     holat: ${r.status}`);
          return false;
        }
        const d = (await r.json()) as {
          manba: unknown;
          nomi: unknown;
          vaqt: unknown;
          korsatkichlar: { kalit: unknown; nomi: unknown; qiymat: unknown; birlik: unknown }[];
          jadvallar: { nomi: unknown; ustunlar: unknown[]; qatorlar: unknown[][] }[];
        };
        const xatolar: string[] = [];
        if (d.manba !== IDROK_MANBA) xatolar.push('manba');
        if (typeof d.nomi !== 'string' || !d.nomi) xatolar.push('nomi');
        if (typeof d.vaqt !== 'string' || Number.isNaN(Date.parse(d.vaqt))) xatolar.push('vaqt');
        if (!Array.isArray(d.korsatkichlar) || d.korsatkichlar.length === 0) xatolar.push('korsatkichlar');

        const kalitlar = new Set<string>();
        for (const k of d.korsatkichlar ?? []) {
          const kalit = String(k.kalit);
          if (!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(kalit)) xatolar.push(`kalit: ${kalit}`);
          if (kalitlar.has(kalit)) xatolar.push(`takror kalit: ${kalit}`);
          kalitlar.add(kalit);
          if (typeof k.nomi !== 'string' || !k.nomi) xatolar.push(`nomi: ${kalit}`);
          if (typeof k.qiymat !== 'number' || !Number.isFinite(k.qiymat)) xatolar.push(`qiymat: ${kalit}`);
          if (!['ta', 'kishi', 'foiz', "so'm"].includes(String(k.birlik))) xatolar.push(`birlik: ${kalit}`);
        }

        for (const j of d.jadvallar ?? []) {
          const n = String(j.nomi);
          if (!Array.isArray(j.ustunlar) || j.ustunlar.length < 2) xatolar.push(`ustunlar: ${n}`);
          if (j.qatorlar.length > JADVAL_QATOR_CHEGARASI) xatolar.push(`qator soni: ${n}`);
          for (const q of j.qatorlar) {
            if (q.length !== j.ustunlar.length) xatolar.push(`qator uzunligi: ${n}`);
            if (typeof q[0] !== 'string') xatolar.push(`yorliq: ${n}`);
            if (q.slice(1).some((x) => typeof x !== 'number' || !Number.isFinite(x))) {
              xatolar.push(`son emas: ${n}`);
            }
          }
        }

        if (xatolar.length) console.log(`     ${[...new Set(xatolar)].slice(0, 10).join('; ')}`);
        return xatolar.length === 0;
      });
    },
  },
  {
    nomi: 'Raqamlar tablo bilan bir xil va javobda mas\'ul shaxs ismi/telefoni yo\'q (bazali)',
    tekshir: async () => {
      if (!process.env.DATABASE_URL) return true;
      const { prisma } = await import('../src/lib/prisma');
      const { tumanHolati } = await import('../src/lib/tuman-holati');

      idrokKeshiniTozala();
      const [javob, holat, shaxslar] = await Promise.all([
        kalitBilan(SINOV_KALITI, async () => (await chaqir(SINOV_KALITI)).text()),
        tumanHolati(),
        prisma.mahalla.findMany({
          where: { OR: [{ masulFish: { not: null } }, { masulTelefon: { not: null } }] },
          select: { masulFish: true, masulTelefon: true },
          take: 30,
        }),
      ]);
      const d = JSON.parse(javob) as { korsatkichlar: { kalit: string; qiymat: number }[] };
      const qiymat = (k: string) => d.korsatkichlar.find((x) => x.kalit === k)?.qiymat;

      const mos =
        qiymat('xatlovdan_otgan_xonadonlar') === holat.xatlovXonadon &&
        qiymat('joylashtirilganlar') === holat.joylashtirilgan &&
        qiymat('faol_ish_elonlari') === holat.ochiqOrin &&
        qiymat('royxatdagi_ishsizlar') === holat.bazaIshsiz;
      if (!mos) console.log('     tablo raqami bilan farq bor');

      const sizgan = shaxslar
        .flatMap((s) => [s.masulFish, s.masulTelefon])
        .filter((x): x is string => Boolean(x && x.trim().length >= 5))
        .filter((x) => javob.includes(x));
      if (sizgan.length) console.log(`     javobda shaxsiy ma'lumot: ${sizgan.length} ta`);

      return mos && sizgan.length === 0;
    },
  },
];

async function main() {
  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      ok = false;
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);

  if (process.env.DATABASE_URL) {
    const { xomPrisma } = await import('../src/lib/prisma');
    await xomPrisma.$disconnect();
  }
  process.exit(xato ? 1 : 0);
}

main();
