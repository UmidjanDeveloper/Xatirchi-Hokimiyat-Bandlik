/**
 * ============================================================
 *  HTTP REGRESSIYA — HAQIQIY SERVERGA HAQIQIY SO'ROVLAR
 *
 *  Ishga tushirish (oldin `npm run build`):
 *      npx tsx scripts/http-regressiya.ts
 *  Allaqachon ishlayotgan serverga:
 *      HTTP_BAZA=http://127.0.0.1:3101 npx tsx scripts/http-regressiya.ts
 *
 *  Nega alohida: ba'zi qoidalar (cookie, sessiya, yo'naltirish) faqat so'rov
 *  doirasida ishlaydi va `npm run sinov` ichidan chaqirib bo'lmaydi. Bu sinov
 *  serverni ishga tushiradi (yoki berilganiga ulanadi), sun'iy xodimlar va
 *  xonadonlar yaratadi, oddiy `fetch` bilan so'rov yuboradi.
 *
 *  Sinaladi:
 *   9.  Boshqa mahalla yozuviga kirib bo'lmaydi (API ham, sahifa ham, ro'yxat ham)
 *   10. ESKI SESSIYA huquqni saqlab qolmaydi: hisob o'chirilsa, rol tushirilsa,
 *       avlod o'zgarsa yoki cookie qalbaki bo'lsa - /tablo va API yopiladi
 *
 *  Sinov FAQAT mahalliy bazada ishlaydi.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { spawn, type ChildProcess } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { parolXeshla } from '../src/lib/auth';

const prisma = new PrismaClient();
const PAROL = 'Sinov2026x';
const PORT = Number(process.env.HTTP_PORT ?? 3199);
const BAZA = process.env.HTTP_BAZA ?? `http://127.0.0.1:${PORT}`;
const BELGI = `htt${Date.now().toString(36)}`;

type Javob = { status: number; location: string | null; matn: string };
type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const xodimlar: string[] = [];
const xonadonlar: string[] = [];
let server: ChildProcess | null = null;

async function sorov(yol: string, q: { cookie?: string; method?: string; body?: unknown } = {}): Promise<Javob> {
  const r = await fetch(BAZA + yol, {
    method: q.method ?? 'GET',
    redirect: 'manual',
    headers: {
      ...(q.cookie ? { cookie: q.cookie } : {}),
      ...(q.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: q.body !== undefined ? JSON.stringify(q.body) : undefined,
  });
  return { status: r.status, location: r.headers.get('location'), matn: await r.text().catch(() => '') };
}

/** Rad etildi: 401/403/404, yo'naltirish (307) yoki oqim ichidagi NEXT_REDIRECT */
const rad = (r: Javob) => [401, 403, 404].includes(r.status) || (r.status >= 300 && r.status < 400) || /NEXT_REDIRECT/.test(r.matn);
/** Ruxsat berildi: 200 va yo'naltirish yo'q */
const ruxsat = (r: Javob) => r.status === 200 && !/NEXT_REDIRECT/.test(r.matn);

async function xodimYarat(rol: 'YETTILIK' | 'HOKIM' | 'BANDLIK', mahallaId: string | null, nom: string) {
  const x = await prisma.user.create({
    data: {
      username: `${BELGI}_${nom}`.toLowerCase(),
      fullName: `Sinov ${nom}`,
      passwordHash: parolXeshla(PAROL),
      rol,
      mahallaId,
      parolAlmashtirilsin: false,
    },
    select: { id: true, username: true },
  });
  xodimlar.push(x.id);
  return x;
}

/** Kirish: cookie (nom=qiymat) va xom token */
async function kirish(username: string): Promise<{ cookie: string; token: string; nom: string }> {
  const r = await fetch(`${BAZA}/api/auth/kirish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, parol: PAROL }),
  });
  if (r.status !== 200) throw new Error(`Kirish yiqildi: ${username} -> ${r.status}`);
  const c = r.headers.getSetCookie().find((x) => /^[^=]+=[^;]+/.test(x));
  if (!c) throw new Error('Cookie kelmadi');
  const [nomQiymat] = c.split(';');
  const i = nomQiymat.indexOf('=');
  return { cookie: nomQiymat, token: decodeURIComponent(nomQiymat.slice(i + 1)), nom: nomQiymat.slice(0, i) };
}

async function xonadonYarat(mahallaId: string, xodimId: string, oila: string) {
  const h = await prisma.household.create({
    data: {
      mahallaId,
      xodimId,
      manzil: `Sinov manzil ${oila}`,
      oilaBoshligi: oila,
      jamiAzo: 4,
      holati: 'YUBORILGAN',
      takrorKaliti: `${BELGI}_${oila}`.toLowerCase(),
    },
    select: { id: true },
  });
  xonadonlar.push(h.id);
  return h.id;
}

let A = '';
let B = '';
let uA = { id: '', username: '' };
let uB = { id: '', username: '' };
let hA = '';
let hB = '';
const OILA_A = `Mahalla A oilasi ${BELGI}`;
const OILA_B = `Begona mahalla oilasi ${BELGI}`;

const SINOVLAR: Sinov[] = [
  /* ══ 9. BOSHQA MAHALLA ══ */
  {
    nomi: '9a. O\'z mahallasining xonadonini API orqali OCHADI (nazorat), boshqa mahalla xonadoni - 403',
    tekshir: async () => {
      const c = await kirish(uA.username);
      const o = await sorov(`/api/xatlov/${hA}`, { cookie: c.cookie });
      const b = await sorov(`/api/xatlov/${hB}`, { cookie: c.cookie });
      return o.status === 200 && b.status === 403 && !b.matn.includes(OILA_B);
    },
  },
  {
    nomi: '9b. Boshqa mahalla xonadonini O\'CHIRIB/arxivlab bo\'lmaydi (DELETE 403), yozuv joyida',
    tekshir: async () => {
      const c = await kirish(uA.username);
      const r = await sorov(`/api/xatlov/${hB}`, { cookie: c.cookie, method: 'DELETE', body: { sabab: 'Sinov: begona mahalla' } });
      const q = await prisma.household.findUnique({ where: { id: hB }, select: { id: true, arxivSanasi: true } });
      return r.status === 403 && q !== null && q.arxivSanasi === null;
    },
  },
  {
    nomi: '9c. Boshqa mahalla xonadoni SAHIFASI ochilmaydi: yo\'naltiriladi, oila boshlig\'i ismi HTML da yo\'q',
    tekshir: async () => {
      const c = await kirish(uA.username);
      const r = await sorov(`/xatlov/${hB}`, { cookie: c.cookie });
      return rad(r) && !r.matn.includes(OILA_B);
    },
  },
  {
    nomi: '9d. Xatlovlar ro\'yxatida FAQAT o\'z mahallasi: A oilasi bor, begona oilasi YO\'Q',
    tekshir: async () => {
      const c = await kirish(uA.username);
      const r = await sorov('/xatlov', { cookie: c.cookie });
      return ruxsat(r) && r.matn.includes(OILA_A) && !r.matn.includes(OILA_B);
    },
  },
  {
    nomi: '9e. Simmetriya: B mahalla xodimi A xonadonini ko\'ra olmaydi, o\'zinikini ko\'radi',
    tekshir: async () => {
      const c = await kirish(uB.username);
      const a = await sorov(`/api/xatlov/${hA}`, { cookie: c.cookie });
      const o = await sorov(`/api/xatlov/${hB}`, { cookie: c.cookie });
      const sahifa = await sorov('/xatlov', { cookie: c.cookie });
      return a.status === 403 && o.status === 200 && sahifa.matn.includes(OILA_B) && !sahifa.matn.includes(OILA_A);
    },
  },
  {
    nomi: '9f. Mahallasiz YETTILIK xodimi HECH NARSA ko\'rmaydi: ikkala xonadon ham 403, ro\'yxatda yo\'q',
    tekshir: async () => {
      const u = await xodimYarat('YETTILIK', null, 'mahallasiz');
      const c = await kirish(u.username);
      const a = await sorov(`/api/xatlov/${hA}`, { cookie: c.cookie });
      const b = await sorov(`/api/xatlov/${hB}`, { cookie: c.cookie });
      const s = await sorov('/xatlov', { cookie: c.cookie });
      return a.status === 403 && b.status === 403 && !s.matn.includes(OILA_A) && !s.matn.includes(OILA_B);
    },
  },
  {
    nomi: '9g. Mahalla xodimi bandlik markazi va boshqaruv API\'lariga kira olmaydi (403): fuqarolar, xato jurnali, yordam/kurs katalogi, zaxira',
    tekshir: async () => {
      const c = await kirish(uA.username);
      const yollar: [string, string][] = [
        ['GET', '/api/ishsizlar/x'],
        ['POST', '/api/admin/xatolar'],
        ['POST', '/api/yordam'],
        ['POST', '/api/kurslar'],
        ['POST', '/api/admin/zaxira'],
      ];
      const natija = await Promise.all(yollar.map(([m, y]) => sorov(y, { cookie: c.cookie, method: m, body: m === 'POST' ? {} : undefined })));
      /* 405 qabul qilinmaydi: usul yo'q bo'lsa qo'riqchi umuman tekshirilmagan bo'ladi */
      return natija.every((r) => r.status === 403);
    },
  },
  {
    nomi: '9h. Hisobot: mahalla xodimi so\'rovga BOSHQA mahalla id sini yozsa ham hisobot FAQAT o\'z mahallasi haqida (qamrovNomi)',
    tekshir: async () => {
      const c = await kirish(uA.username);
      const [mA, mB] = await Promise.all([
        prisma.mahalla.findUniqueOrThrow({ where: { id: A }, select: { nomi: true, nomiKirill: true } }),
        prisma.mahalla.findUniqueOrThrow({ where: { id: B }, select: { nomi: true, nomiKirill: true } }),
      ]);
      const r = await sorov('/api/hisobot', { cookie: c.cookie, method: 'POST', body: { mahallaId: B } });
      let qamrov = '';
      try {
        qamrov = String(JSON.parse(r.matn).qamrovNomi ?? '');
      } catch {
        /* quyida false */
      }
      const aMi = qamrov.includes(mA.nomi) || qamrov.includes(mA.nomiKirill);
      const bMi = qamrov.includes(mB.nomi) || qamrov.includes(mB.nomiKirill);
      if (!aMi || bMi) console.log('     qamrovNomi:', qamrov);
      return r.status === 200 && aMi && !bMi;
    },
  },
  {
    nomi: '9i. Murojaat: mahalla xodimi BOSHQA mahalla uchun murojaat qayd eta olmaydi (403), bazada yozuv paydo bo\'lmaydi',
    tekshir: async () => {
      const c = await kirish(uA.username);
      const sana = new Date().toISOString();
      const muddat = new Date(Date.now() + 5 * 86400_000).toISOString();
      const r = await sorov('/api/murojaatlar', {
        cookie: c.cookie,
        method: 'POST',
        body: { mahallaId: B, murojaatchiNomi: `${BELGI} begona`, kanal: 'TELEFON', tavsif: 'Begona mahalla uchun sinov', qabulVaqti: sana, javobMuddati: muddat },
      });
      const soni = await prisma.murojaat.count({ where: { murojaatchiNomi: { contains: BELGI } } });
      return r.status === 403 && soni === 0;
    },
  },

  /* ══ 10. ESKI SESSIYA ══ */
  {
    nomi: '10a. Nazorat: HOKIM /tablo ni ochadi (200)',
    tekshir: async () => {
      const x = await xodimYarat('HOKIM', null, 'hokim_a');
      const c = await kirish(x.username);
      return ruxsat(await sorov('/tablo', { cookie: c.cookie }));
    },
  },
  {
    nomi: '10b. ROL TUSHIRILSA: HOKIM -> YETTILIK (cookie eski), /tablo endi YOPIQ (huquq cookie\'dan emas, bazadan olinadi)',
    tekshir: async () => {
      const x = await xodimYarat('HOKIM', null, 'hokim_b');
      const c = await kirish(x.username);
      const oldin = ruxsat(await sorov('/tablo', { cookie: c.cookie }));
      await prisma.user.update({ where: { id: x.id }, data: { rol: 'YETTILIK' } });
      const keyin = await sorov('/tablo', { cookie: c.cookie });
      return oldin && rad(keyin);
    },
  },
  {
    nomi: '10c. HISOB O\'CHIRILSA (faol=false): eski cookie bilan /tablo, sahifa va API yopiladi',
    tekshir: async () => {
      const x = await xodimYarat('HOKIM', null, 'hokim_c');
      const c = await kirish(x.username);
      const oldin = ruxsat(await sorov('/tablo', { cookie: c.cookie }));
      await prisma.user.update({ where: { id: x.id }, data: { faol: false } });
      const [t, s, a] = await Promise.all([
        sorov('/tablo', { cookie: c.cookie }),
        sorov('/vazifalar', { cookie: c.cookie }),
        sorov(`/api/xatlov/${hA}`, { cookie: c.cookie }),
      ]);
      return oldin && rad(t) && rad(s) && a.status === 401;
    },
  },
  {
    nomi: '10d. SESSIYA AVLODI O\'ZGARSA (parol almashtirildi/sessiya bekor qilindi): eski cookie rad etiladi',
    tekshir: async () => {
      const x = await xodimYarat('HOKIM', null, 'hokim_d');
      const c = await kirish(x.username);
      const oldin = ruxsat(await sorov('/tablo', { cookie: c.cookie }));
      await prisma.user.update({ where: { id: x.id }, data: { sessiyaVersiyasi: { increment: 1 } } });
      const [t, a] = await Promise.all([sorov('/tablo', { cookie: c.cookie }), sorov(`/api/xatlov/${hA}`, { cookie: c.cookie })]);
      /* Yangi kirish yangi avlod bilan ishlaydi */
      const yangi = await kirish(x.username);
      const yangiOchdi = ruxsat(await sorov('/tablo', { cookie: yangi.cookie }));
      return oldin && rad(t) && a.status === 401 && yangiOchdi;
    },
  },
  {
    nomi: '10e. QALBAKI COOKIE: ichidagi rolni ADMIN ga o\'zgartirib, imzoni eskisicha qoldirish - rad etiladi',
    tekshir: async () => {
      const c = await kirish(uA.username);
      const [yuk, imzo] = c.token.split('.');
      let qalbaki: string;
      try {
        const json = JSON.parse(Buffer.from(yuk, 'base64url').toString('utf8'));
        json.rol = 'ADMIN';
        qalbaki = `${Buffer.from(JSON.stringify(json)).toString('base64url')}.${imzo}`;
      } catch {
        /* Format boshqa bo'lsa: tokenni buzamiz */
        qalbaki = `${c.token.slice(0, -4)}AAAA`;
      }
      const ck = `${c.nom}=${encodeURIComponent(qalbaki)}`;
      /* `/api/admin/xatolar` faqat ADMIN: qalbaki cookie qabul qilinsa 200 qaytardi */
      const [t, a, adm] = await Promise.all([
        sorov('/tablo', { cookie: ck }),
        sorov(`/api/xatlov/${hA}`, { cookie: ck }),
        sorov('/api/admin/xatolar', { cookie: ck, method: 'POST', body: { amal: 'korildi' } }),
      ]);
      /* Nazorat: haqiqiy cookie bilan shu yo'l 403 beradi (YETTILIK) */
      const asl = await sorov('/api/admin/xatolar', { cookie: c.cookie, method: 'POST', body: { amal: 'korildi' } });
      return rad(t) && a.status === 401 && adm.status === 401 && asl.status === 403;
    },
  },
  /* ══ 11. SALOMATLIK (tashqi monitoring) ══ */
  {
    nomi: '11a. /api/health va /api/health/readiness cookie\'siz ochiladi; readiness 200 yoki 503 va javobda FAQAT ruxsat etilgan kalitlar (xato matni, versiya, son YO\'Q)',
    tekshir: async () => {
      const j = await sorov('/api/health');
      const t = await sorov('/api/health/readiness');
      let b: { status?: string; tekshiruvlar?: Record<string, unknown> } = {};
      try {
        b = JSON.parse(t.matn);
      } catch {
        return false;
      }
      const kalitlar = JSON.stringify(Object.keys(b).sort()) === '["status","tekshiruvlar"]' && JSON.stringify(Object.keys(b.tekshiruvlar ?? {}).sort()) === '["avtomatikIshlar","baza"]';
      return j.status === 200 && JSON.parse(j.matn).ok === true && [200, 503].includes(t.status) && (t.status === 200) === (b.status === 'ok') && kalitlar && !/error|xato|postgres|prisma/i.test(t.matn);
    },
  },
  {
    nomi: '11b. Qo\'shni yo\'llar sessiya talab qiladi (401): /api/health/x, /api/healthz, /api/health/readiness/x',
    tekshir: async () => {
      const r = await Promise.all(['/api/health/x', '/api/healthz', '/api/health/readiness/x'].map((y) => sorov(y)));
      return r.every((x) => x.status === 401);
    },
  },
  {
    nomi: '10f. Cookie butunlay yo\'q yoki axlat: /tablo va API yopiq',
    tekshir: async () => {
      const t = await sorov('/tablo');
      const t2 = await sorov('/tablo', { cookie: 'sessiya=axlat' });
      const a = await sorov(`/api/xatlov/${hA}`, { cookie: 'sessiya=axlat' });
      return rad(t) && rad(t2) && a.status === 401;
    },
  },
];

async function serverniIshgaTushir(): Promise<void> {
  if (process.env.HTTP_BAZA) return;
  /* detached: o'z jarayon guruhi bor - oxirida butun guruh o'ldiriladi (npx -> next -> next-server) */
  server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
    detached: true,
  });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BAZA}/kirish`);
      if (r.status === 200) return;
    } catch {
      /* hali ishga tushmadi */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Server 60 soniyada ishga tushmadi (oldin `npm run build` bajarilganmi?)');
}

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }

  const mahallalar = await prisma.mahalla.findMany({ take: 2, orderBy: { tartib: 'asc' }, select: { id: true } });
  if (mahallalar.length < 2) throw new Error('Kamida 2 mahalla kerak (seed bajarilganmi?)');
  [A, B] = [mahallalar[0].id, mahallalar[1].id];

  uA = await xodimYarat('YETTILIK', A, 'a');
  uB = await xodimYarat('YETTILIK', B, 'b');
  hA = await xonadonYarat(A, uA.id, OILA_A);
  hB = await xonadonYarat(B, uB.id, OILA_B);

  await serverniIshgaTushir();

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

  await prisma.auditLog.deleteMany({ where: { userId: { in: xodimlar } } });
  await prisma.household.deleteMany({ where: { id: { in: xonadonlar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
  await prisma.kirishUrinishi.deleteMany({});
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  serverniTuxtat();
  process.exit(xato ? 1 : 0);
}

function serverniTuxtat() {
  if (!server?.pid) return;
  try {
    process.kill(-server.pid, 'SIGKILL');
  } catch {
    server.kill('SIGKILL');
  }
}

main().catch(async (e) => {
  console.error(e);
  serverniTuxtat();
  await prisma.$disconnect();
  process.exit(1);
});
