/**
 * ============================================================
 *  KOALA ↔ JARVIS — HAQIQIY BRAUZERDAGI SINOV (qo'lda ishga tushiriladi)
 *
 *  Haqiqiy JARVIS serveriga ULANMAYDI: o'rniga shu skript ichida kichik
 *  soxta shlyuz (`POST /hugginggpt`) ishga tushadi va shartnomani tekshiradi.
 *  Bu Microsoft JARVIS bilan end-to-end sinov EMAS.
 *
 *  JARVIS_BEKTI=1 (standart) — JARVIS sozlangan holat:
 *   1. Oynada ikki rejim tugmasi bor, JARVIS yoqilgan, Koala tanlangan;
 *   2. JARVIS rejimida ogohlantirish ko'rinadi, Koala suhbati ko'rinmaydi;
 *   3. Shlyuzga faqat { messages } boradi, `Bearer` token bor, cookie yo'q,
 *      birinchi xabar `system`, Koala rejimidagi matn JARVISga ketmaydi;
 *   4. Javob oynada ko'rinadi; rejimlar tarixi aralashmaydi;
 *   5. Daqiqada 3 so'rovdan keyin "band" xabari (tezlik chegarasi);
 *   6. Shlyuz 500 va yashirin matn qaytarsa — foydalanuvchiga umumiy xabar,
 *      matn sizib chiqmaydi; Koala ishlashda davom etadi;
 *   7. Telefon o'lchami, qorong'i mavzu: skrinshot va xatosiz sahifa.
 *  JARVIS_BEKTI=0 — JARVIS sozlanmagan holat:
 *   8. JARVIS tugmasi o'chiq, `/api/agent/jarvis` 503, Koala ishlaydi.
 *
 *  Ishga tushirish (JARVIS yoqilgan; http faqat ishlab chiqish rejimida ruxsat):
 *    JARVIS_ENABLED=1 JARVIS_BASE_URL=http://127.0.0.1:8944 \
 *    JARVIS_GATEWAY_TOKEN=sinov-token-1234567890 npx next dev -p 3197 &
 *    BAZA=http://127.0.0.1:3197 npx tsx scripts/jarvis-brauzer.ts
 *  JARVIS o'chiq:  `next dev` ni JARVIS_* siz ishga tushirib JARVIS_BEKTI=0 bering.
 *
 *  FAQAT mahalliy bazada. Brauzer: `PW_CHROME` (standart `/opt/pw-browsers/chromium`).
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import http from 'node:http';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { parolXeshla } from '../src/lib/auth';

const require = createRequire(import.meta.url);
function playwrightOl() {
  for (const yol of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) {
    try {
      return require(yol);
    } catch {
      /* keyingisi */
    }
  }
  throw new Error('playwright topilmadi: `npm i --no-save playwright-core`');
}
const { chromium } = playwrightOl();

const prisma = new PrismaClient();
const BAZA = process.env.BAZA ?? 'http://127.0.0.1:3197';
const SKRIN = process.env.JARVIS_SKRIN ?? '/tmp/jarvis-skrin';
const SHLYUZ_PORT = Number(process.env.JARVIS_PORT ?? 8944);
const TOKEN = process.env.JARVIS_GATEWAY_TOKEN ?? 'sinov-token-1234567890';
const YOQILGAN = (process.env.JARVIS_BEKTI ?? '1') === '1';
const BELGI = `jb${Date.now().toString(36)}`;
const xodimlar: string[] = [];
const natijalar: boolean[] = [];
const tekshir = (nom: string, ok: boolean, tafsilot = '') => {
  natijalar.push(ok);
  console.log(`${ok ? 'OK  ' : 'XATO'} ${nom}${tafsilot ? '  — ' + tafsilot : ''}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sahifa = any;

/* ── Soxta shlyuz ── */
interface ShlyuzSorovi {
  yol: string;
  authorization: string | undefined;
  cookie: string | undefined;
  tana: { messages?: { role: string; content: string }[] } & Record<string, unknown>;
}
const sorovlar: ShlyuzSorovi[] = [];
let shlyuzRejimi: 'ok' | 'xato' = 'ok';
const shlyuz = http.createServer((req, res) => {
  const bo: Buffer[] = [];
  req.on('data', (c) => bo.push(c));
  req.on('end', () => {
    let tana: ShlyuzSorovi['tana'] = {};
    try {
      tana = JSON.parse(Buffer.concat(bo).toString('utf8'));
    } catch {
      /* bo'sh */
    }
    sorovlar.push({ yol: `${req.method} ${req.url}`, authorization: req.headers.authorization, cookie: req.headers.cookie, tana });
    if (shlyuzRejimi === 'xato') {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('YASHIRIN-UPSTREAM-TAFSILOT');
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: `JARVIS-JAVOB-${sorovlar.length}` }));
  });
});

async function xodimYarat(nom: string, rol: 'BANDLIK_RAHBAR' = 'BANDLIK_RAHBAR') {
  const x = await prisma.user.create({
    data: {
      username: `${BELGI}_${nom}`.toLowerCase(),
      fullName: `Sinov ${nom}`,
      passwordHash: parolXeshla('Sinov2026x'),
      rol,
      mahallaId: null,
      parolAlmashtirilsin: false,
    },
    select: { id: true, username: true },
  });
  xodimlar.push(x.id);
  return x;
}

async function kir(brauzer: Sahifa, username: string, viewport: { width: number; height: number }, q: Record<string, unknown> = {}) {
  const ctx = await brauzer.newContext({ viewport, ...q });
  const page = await ctx.newPage();
  const xatolar: string[] = [];
  page.on('pageerror', (e: Error) => xatolar.push(String(e).slice(0, 200)));
  await page.goto(`${BAZA}/kirish`);
  const status = await page.evaluate(
    async (u: string) =>
      (
        await fetch('/api/auth/kirish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, parol: 'Sinov2026x' }),
        })
      ).status,
    username
  );
  if (status !== 200) throw new Error(`Kirish yiqildi: ${username} -> ${status}`);
  await page.goto(`${BAZA}/vazifalar`);
  await page.waitForSelector('[data-agent-tugmasi]', { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.locator('[data-agent-tugmasi]').click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForTimeout(800);
  return { ctx, page, xatolar };
}

const royxatMatni = async (page: Sahifa): Promise<string> => page.locator('[aria-live="polite"]').first().innerText();
const REJIM_TUGMALARI = '[role="group"][aria-label="Ёрдамчи режими"] button';
const rejimTugmasi = (page: Sahifa, nom: 'koala' | 'jarvis') => page.locator(REJIM_TUGMALARI).nth(nom === 'koala' ? 0 : 1);

async function yubor(page: Sahifa, matn: string) {
  const kiritish = page.getByLabel('Коалага савол ёки буйруқ');
  await kiritish.fill(matn);
  const tugma = page.getByRole('button', { name: 'Юбориш' });
  for (let i = 0; i < 120 && !(await tugma.isEnabled()); i++) await page.waitForTimeout(250);
  await kiritish.press('Enter');
}
const kut = (page: Sahifa, shart: (m: string) => boolean, ms = 20000) =>
  page
    .waitForFunction(
      (src: string) => {
        const el = document.querySelector('[aria-live="polite"]');
        // eslint-disable-next-line no-new-func
        return el ? new Function('m', `return (${src})(m)`)((el as HTMLElement).innerText) : false;
      },
      shart.toString(),
      { timeout: ms }
    )
    .then(() => true)
    .catch(() => false);

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }
  mkdirSync(SKRIN, { recursive: true });
  await new Promise<void>((ok) => shlyuz.listen(SHLYUZ_PORT, '127.0.0.1', ok));

  const A = await xodimYarat('a');
  const B = await xodimYarat('b');
  const brauzer = await chromium.launch({
    executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium',
    args: ['--no-sandbox'],
  });

  try {
    const { ctx, page, xatolar } = await kir(brauzer, A.username, { width: 1280, height: 800 });
    const koalaT = rejimTugmasi(page, 'koala');
    const jarvisT = rejimTugmasi(page, 'jarvis');
    const ikkitaMi = (await page.locator(REJIM_TUGMALARI).count()) === 2;
    const koalaTanlangan = (await koalaT.getAttribute('aria-pressed')) === 'true';
    const jarvisYoqilgan = await jarvisT.isEnabled();

    if (!YOQILGAN) {
      tekshir('8a. JARVIS sozlanmagan: ikki rejim tugmasi bor, Koala tanlangan, JARVIS tugmasi O‘CHIQ', ikkitaMi && koalaTanlangan && !jarvisYoqilgan, `ikkita=${ikkitaMi}, koala=${koalaTanlangan}, jarvisYoqilgan=${jarvisYoqilgan}`);
      const holat = await page.evaluate(async () => (await fetch('/api/agent/jarvis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ xabar: 'salom' }) })).status);
      tekshir('8b. `/api/agent/jarvis` sozlanmagan bo‘lsa 503 beradi (shlyuzga so‘rov ketmaydi)', holat === 503 && sorovlar.length === 0, `status=${holat}, shlyuzga=${sorovlar.length}`);
      await yubor(page, 'Салом');
      const ishladi = await kut(page, (m) => m.includes('Салом') && m.length > 40);
      tekshir('8c. JARVIS o‘chiq bo‘lsa ham Koala suhbati ishlaydi', ishladi);
      await page.screenshot({ path: `${SKRIN}/8-jarvis-ochiq-emas.png` });
    } else {
      tekshir('1. Ikki rejim tugmasi; JARVIS yoqilgan; Koala tanlangan', ikkitaMi && koalaTanlangan && jarvisYoqilgan, `ikkita=${ikkitaMi}, koala=${koalaTanlangan}, jarvis=${jarvisYoqilgan}`);

      /* Koala rejimidagi suhbat — JARVISga ketmasligi kerak */
      await yubor(page, 'Салом');
      const koalaJavob = await kut(page, (m) => m.includes('Салом') && (m.match(/\n/g) ?? []).length >= 2);
      const koalaMatni = await royxatMatni(page);

      await jarvisT.click();
      await page.waitForTimeout(400);
      const ogohlantirish = (await page.locator('text=JARVIS серверига юборилади').count()) > 0;
      const jarvisTanlangan = (await jarvisT.getAttribute('aria-pressed')) === 'true';
      const jarvisRoyxati = await royxatMatni(page);
      tekshir(
        '2. JARVIS rejimi: ogohlantirish va o‘z takliflari ko‘rinadi, Koala suhbati (“Салом”) ko‘rinmaydi',
        koalaJavob && ogohlantirish && jarvisTanlangan && !jarvisRoyxati.includes('Салом') && jarvisRoyxati.includes('Сунъий интеллект нима?'),
        `koalaJavob=${koalaJavob}, ogohlantirish=${ogohlantirish}, royxat=${JSON.stringify(jarvisRoyxati.slice(0, 80))}`
      );
      await page.screenshot({ path: `${SKRIN}/2-jarvis-rejimi-ish-stoli.png` });

      /* 1-so'rov */
      await yubor(page, 'JARVIS savoli bir');
      const j1 = await kut(page, (m) => m.includes('JARVIS-JAVOB-1'));
      const s1 = sorovlar[0];
      const m1 = s1?.tana.messages ?? [];
      tekshir(
        '3. Shlyuz shartnomasi: POST /hugginggpt, faqat { messages }, Bearer token, cookie YO‘Q, birinchi xabar system, Koala matni ketmagan',
        Boolean(
        s1?.yol === 'POST /hugginggpt' &&
          Object.keys(s1.tana).join() === 'messages' &&
          s1.authorization === `Bearer ${TOKEN}` &&
          !s1.cookie &&
          m1[0]?.role === 'system' &&
          m1.at(-1)?.role === 'user' &&
          m1.at(-1)?.content.startsWith('JARVIS savoli bir') &&
          !JSON.stringify(s1.tana).includes('Салом') &&
          !JSON.stringify(s1.tana).includes(koalaMatni.split('\n').filter((x) => x.length > 20)[1] ?? '\u0000')
        ),
        `yol=${s1?.yol}, kalitlar=${s1 ? Object.keys(s1.tana).join() : '-'}, auth=${s1?.authorization ? 'bor' : 'yo‘q'}, cookie=${s1?.cookie ? 'BOR' : 'yo‘q'}`
      );
      tekshir('4a. JARVIS javobi oynada ko‘rinadi va “tasdiqlanmagan” izohi bor', j1 && (await royxatMatni(page)).includes('тасдиқланмаган'));

      /* 2-so'rov: tarix */
      await yubor(page, 'JARVIS savoli ikki');
      await kut(page, (m) => m.includes('JARVIS-JAVOB-2'));
      const m2 = (sorovlar[1]?.tana.messages ?? []).map((x) => x.content).join('\n');
      tekshir('4b. 2-so‘rovda faqat JARVIS rejimi tarixi ketadi (1-savol va 1-javob bor, “Салом” yo‘q)', m2.includes('JARVIS savoli bir') && m2.includes('JARVIS-JAVOB-1') && !m2.includes('Салом'), `xabarlar=${sorovlar[1]?.tana.messages?.length}`);

      /* 3-so'rov, so'ng 4-so'rov: daqiqada 3 ta chegarasi */
      await yubor(page, 'JARVIS savoli uch');
      await kut(page, (m) => m.includes('JARVIS-JAVOB-3'));
      const soni3 = sorovlar.length;
      await yubor(page, 'JARVIS savoli tort');
      const band = await kut(page, (m) => m.includes('JARVIS банд'), 15000);
      tekshir('5. Daqiqada 3 so‘rovdan keyin “JARVIS банд” xabari ko‘rinadi, shlyuzga 4-so‘rov ketmaydi', band && sorovlar.length === soni3 && soni3 === 3, `band=${band}, shlyuzga=${sorovlar.length}`);

      /* Rejimlar tarixi aralashmaydi */
      await koalaT.click();
      await page.waitForTimeout(400);
      const koalaQayta = await royxatMatni(page);
      tekshir('4c. Koalaga qaytilganda Koala suhbati turadi, JARVIS javoblari ko‘rinmaydi', koalaQayta.includes('Салом') && !koalaQayta.includes('JARVIS-JAVOB'), '');

      /* Telefon, qorong'i mavzu */
      const tel = await kir(brauzer, B.username, { width: 390, height: 844 }, { colorScheme: 'dark', isMobile: true, hasTouch: true });
      await rejimTugmasi(tel.page, 'jarvis').click();
      await tel.page.waitForTimeout(400);
      await tel.page.screenshot({ path: `${SKRIN}/7-telefon-qorongi-jarvis.png` });

      /* Shlyuz xatosi: yashirin matn sizmasin; Koala ishlasin */
      shlyuzRejimi = 'xato';
      await yubor(tel.page, 'JARVIS xato sinovi');
      const xatoXabari = await kut(tel.page, (m) => m.includes('JARVIS жавоб бермади'));
      const matn = await royxatMatni(tel.page);
      tekshir('6a. Shlyuz 500 qaytarsa: umumiy xabar ko‘rinadi, upstream matni (“YASHIRIN…”) sizmaydi', xatoXabari && !matn.includes('YASHIRIN') && !matn.includes('500'), `xabar=${xatoXabari}`);
      shlyuzRejimi = 'ok';
      await rejimTugmasi(tel.page, 'koala').click();
      await tel.page.waitForTimeout(300);
      await yubor(tel.page, 'Салом қайта');
      const koalaIshladi = await kut(tel.page, (m) => m.includes('Салом қайта') && (m.match(/\n/g) ?? []).length >= 2);
      tekshir('6b. JARVIS xatosidan keyin Koala rejimi ishlashda davom etadi', koalaIshladi);
      await tel.page.screenshot({ path: `${SKRIN}/6-telefon-koala-xatodan-keyin.png` });
      tekshir('7. Sahifa xatosiz (pageerror yo‘q): kompyuter va telefon', xatolar.length === 0 && tel.xatolar.length === 0, [...xatolar, ...tel.xatolar].join(' | '));
      await tel.ctx.close();
    }
    await ctx.close();
  } finally {
    await brauzer.close();
    shlyuz.close();
    await prisma.auditLog.deleteMany({ where: { userId: { in: xodimlar } } });
    await prisma.agentAmali.deleteMany({ where: { userId: { in: xodimlar } } });
    await prisma.agentFoydalanish.deleteMany({ where: { userId: { in: xodimlar } } });
    await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
    await prisma.kirishUrinishi.deleteMany({});
    await prisma.$disconnect();
  }
  const xato = natijalar.filter((x) => !x).length;
  console.log(`\n${natijalar.length - xato}/${natijalar.length} o'tdi; skrinshotlar: ${SKRIN}`);
  process.exit(xato ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  shlyuz.close();
  await prisma.$disconnect();
  process.exit(1);
});
