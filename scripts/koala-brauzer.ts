/**
 * ============================================================
 *  KOALA HAMROH — HAQIQIY BRAUZERDAGI SINOV (qo'lda ishga tushiriladi)
 *
 *  Nima tekshiradi (Chromium, kompyuter va telefon o'lchamida):
 *   1. Koala tugmasi ko'rinadi, kamida 44x44 piksel, ekran ichida;
 *   2. Sichqoncha bilan surilganda joyi o'zgaradi, joylashuv eslab qolinadi
 *      (sahifa yangilansa ham) va surish suhbat oynasini TASODIFAN OCHMAYDI;
 *   3. Oddiy bosish suhbat oynasini ochadi, Esc bilan yopilganda fokus koalaga qaytadi;
 *   4. Ekran kichrayganda koala chegarada qoladi;
 *   5. Klaviatura: yo'nalish tugmalari suradi, Home odatiy joyga qaytaradi;
 *   6. Kamaytirilgan harakat (reduced-motion) hurmat qilinadi: animatsiya o'chadi;
 *   7. Server ovozi sozlanmagan bo'lsa API xavfsiz 503 beradi, vakolatsiz — 401/403;
 *   8. Sahifa xatosiz (pageerror) ishlaydi; yorug' va qorong'i mavzuda skrinshot olinadi.
 *
 *  Ishga tushirish:
 *    npm run build && npx next start -p 3196 &
 *    BAZA=http://127.0.0.1:3196 npx tsx scripts/koala-brauzer.ts
 *
 *  Skrinshotlar `KOALA_SKRIN` papkasiga (standart `/tmp/koala-skrin`) yoziladi.
 *  Brauzer: `PW_CHROME` (standart `/opt/pw-browsers/chromium`). FAQAT mahalliy bazada.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

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
const BAZA = process.env.BAZA ?? 'http://127.0.0.1:3196';
const SKRIN = process.env.KOALA_SKRIN ?? '/tmp/koala-skrin';
const BELGI = `kb${Date.now().toString(36)}`;
const xodimlar: string[] = [];
const natijalar: boolean[] = [];
const tekshir = (nom: string, ok: boolean, tafsilot = '') => {
  natijalar.push(ok);
  console.log(`${ok ? 'OK  ' : 'XATO'} ${nom}${tafsilot ? '  — ' + tafsilot : ''}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sahifa = any;

async function xodimYarat(rol: 'YETTILIK' | 'BANDLIK_RAHBAR', mahallaId: string | null, nom: string) {
  const x = await prisma.user.create({
    data: {
      username: `${BELGI}_${nom}`.toLowerCase(),
      fullName: `Sinov ${nom}`,
      passwordHash: parolXeshla('Sinov2026x'),
      rol,
      mahallaId,
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
  return { ctx, page, xatolar };
}

const quti = async (page: Sahifa) => {
  const b = await page.locator('[data-agent-tugmasi]').boundingBox();
  if (!b) throw new Error('koala tugmasi topilmadi');
  return b as { x: number; y: number; width: number; height: number };
};

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }
  mkdirSync(SKRIN, { recursive: true });
  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  if (!mahalla) throw new Error('mahalla yo‘q (seed)');
  const rahbar = await xodimYarat('BANDLIK_RAHBAR', null, 'rahbar');
  const yettilik = await xodimYarat('YETTILIK', mahalla.id, 'yettilik');

  const brauzer = await chromium.launch({
    executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium',
    args: ['--no-sandbox'],
  });

  try {
    /* ══ 1–5. Tugma: o'lcham, surish, eslab qolish, ochish, o'lcham o'zgarishi, klaviatura ══ */
    const { ctx, page, xatolar } = await kir(brauzer, rahbar.username, { width: 1280, height: 800 });
    await page.goto(`${BAZA}/vazifalar`);
    await page.waitForSelector('[data-agent-tugmasi]', { timeout: 15000 });
    await page.waitForTimeout(800);
    let b0 = await quti(page);
    tekshir(
      '1. Koala tugmasi ko‘rinadi: kamida 44x44 piksel va ekran ichida',
      b0.width >= 44 && b0.height >= 44 && b0.x >= 0 && b0.y >= 0 && b0.x + b0.width <= 1280 && b0.y + b0.height <= 800,
      `${Math.round(b0.width)}x${Math.round(b0.height)} @ (${Math.round(b0.x)}, ${Math.round(b0.y)})`
    );
    await page.screenshot({ path: `${SKRIN}/1-yorug-ish-stoli.png` });

    /* Surish */
    const markaz = { x: b0.x + b0.width / 2, y: b0.y + b0.height / 2 };
    await page.mouse.move(markaz.x, markaz.y);
    await page.mouse.down();
    await page.mouse.move(markaz.x - 120, markaz.y - 90, { steps: 8 });
    await page.mouse.move(markaz.x - 360, markaz.y - 260, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const b1 = await quti(page);
    const dialogOchiq = (await page.locator('[role="dialog"]').count()) > 0;
    const saqlangan = await page.evaluate(() => window.localStorage.getItem('koala:joy:v1'));
    tekshir(
      '2. Surish: joyi o‘zgaradi, joylashuv saqlanadi va suhbat oynasi TASODIFAN ochilmaydi',
      Math.abs(b1.x - b0.x) > 200 && Math.abs(b1.y - b0.y) > 150 && !dialogOchiq && !!saqlangan,
      `(${Math.round(b0.x)},${Math.round(b0.y)}) → (${Math.round(b1.x)},${Math.round(b1.y)}), oyna=${dialogOchiq}, saqlandi=${saqlangan ?? 'yo‘q'}`
    );
    await page.screenshot({ path: `${SKRIN}/2-surilgandan-keyin.png` });

    await page.reload();
    await page.waitForSelector('[data-agent-tugmasi]');
    await page.waitForTimeout(600);
    const b2 = await quti(page);
    tekshir('2b. Sahifa yangilangach joyi eslab qolingan', Math.abs(b2.x - b1.x) < 3 && Math.abs(b2.y - b1.y) < 3, `(${Math.round(b2.x)},${Math.round(b2.y)})`);

    /* Oddiy bosish: oyna ochiladi; Esc: yopiladi va fokus koalaga qaytadi */
    await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2);
    await page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => undefined);
    const ochildi = (await page.locator('[role="dialog"]').count()) > 0;
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SKRIN}/3-oyna-ochiq.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const yopildi = (await page.locator('[role="dialog"]').count()) === 0;
    const fokus = await page.evaluate(() => document.activeElement?.hasAttribute('data-agent-tugmasi') ?? false);
    tekshir('3. Oddiy bosish oynani ochadi; Esc yopadi va fokus koalaga qaytadi', ochildi && yopildi && fokus, `ochildi=${ochildi}, yopildi=${yopildi}, fokus=${fokus}`);

    /* O'lcham o'zgarishi: chegarada qoladi */
    await page.setViewportSize({ width: 360, height: 520 });
    await page.waitForTimeout(500);
    const b3 = await quti(page);
    tekshir(
      '4. Ekran kichrayganda koala chegarada qoladi (to‘liq ko‘rinadi)',
      b3.x >= 0 && b3.y >= 0 && b3.x + b3.width <= 360 && b3.y + b3.height <= 520,
      `(${Math.round(b3.x)},${Math.round(b3.y)}) ${Math.round(b3.width)}x${Math.round(b3.height)}`
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);

    /* Klaviatura */
    await page.locator('[data-agent-tugmasi]').focus();
    const k0 = await quti(page);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(150);
    const k1 = await quti(page);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);
    const k2 = await quti(page);
    tekshir(
      '5. Klaviatura: ← chapga, ↓ pastga 24 pikselga suradi',
      Math.abs(k0.x - k1.x - 24) < 2 && Math.abs(k2.y - k1.y - 24) < 2,
      `dx=${Math.round(k1.x - k0.x)}, dy=${Math.round(k2.y - k1.y)}`
    );
    await page.keyboard.press('Home');
    await page.waitForTimeout(300);
    const k3 = await quti(page);
    const bosh = await page.evaluate(() => window.localStorage.getItem('koala:joy:v1'));
    tekshir('5b. Home odatiy joyga qaytaradi (o‘ng-pastki burchak) va saqlangan joyni o‘chiradi', k3.x > 1000 && k3.y > 600 && bosh === null, `(${Math.round(k3.x)},${Math.round(k3.y)}), saqlangan=${bosh}`);

    /* Harakat: kamaytirilgan harakat hurmat qilinadi */
    const animatsiya = () => page.evaluate(() => getComputedStyle(document.querySelector('.koala-pet-tana') as Element).animationName);
    /* Zaif qurilma belgisi (`data-fx=lite`) sinov brauzerida ham qo'yilishi mumkin: uni qo'lda olib tashlab, so'ng qaytaramiz */
    await page.evaluate(() => document.documentElement.removeAttribute('data-fx'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(200);
    const odatiy = await animatsiya();
    await page.evaluate(() => document.documentElement.setAttribute('data-fx', 'lite'));
    await page.waitForTimeout(100);
    const zaif = await animatsiya();
    await page.evaluate(() => document.documentElement.removeAttribute('data-fx'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(200);
    const kam = await animatsiya();
    tekshir(
      '6. Harakat: oddiy rejimda animatsiya bor; zaif qurilmada (data-fx=lite) va kamaytirilgan harakatda (reduced-motion) o‘chadi',
      odatiy !== 'none' && zaif === 'none' && kam === 'none',
      `oddiy="${odatiy}", lite="${zaif}", reduce="${kam}"`
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    tekshir('8. Sahifa xatosiz ishlaydi (pageerror yo‘q)', xatolar.length === 0, xatolar.join(' | '));
    await ctx.close();

    /* Qorong'i mavzu va telefon o'lchami: skrinshot */
    const t = await kir(brauzer, rahbar.username, { width: 390, height: 844 }, { colorScheme: 'dark', deviceScaleFactor: 2 });
    await t.page.goto(`${BAZA}/vazifalar`);
    await t.page.waitForSelector('[data-agent-tugmasi]', { timeout: 15000 });
    await t.page.waitForTimeout(800);
    const tb = await quti(t.page);
    await t.page.screenshot({ path: `${SKRIN}/4-telefon-qorongi.png` });
    tekshir('1b. Telefon o‘lchamida (390x844) tugma ko‘rinadi va ekran ichida', tb.width >= 44 && tb.x + tb.width <= 390 && tb.y + tb.height <= 844, `(${Math.round(tb.x)},${Math.round(tb.y)})`);
    await t.page.locator('[data-agent-tugmasi]').click();
    await t.page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => undefined);
    await t.page.waitForTimeout(600);
    await t.page.screenshot({ path: `${SKRIN}/5-telefon-oyna-qorongi.png` });
    tekshir('8b. Telefon/qorong‘i mavzuda oyna ochiladi va xatosiz', (await t.page.locator('[role="dialog"]').count()) > 0 && t.xatolar.length === 0, t.xatolar.join(' | '));
    await t.ctx.close();

    /* ══ 7. API himoyasi ══ */
    const cookieOl = async (username: string) => {
      const r = await fetch(`${BAZA}/api/auth/kirish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, parol: 'Sinov2026x' }),
      });
      return (r.headers.getSetCookie().find((x) => /^[^=]+=[^;]+/.test(x)) ?? '').split(';')[0];
    };
    const post = (cookie: string | null, body: unknown) =>
      fetch(`${BAZA}/api/agent/gapir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      });
    const bez = await post(null, { matn: 'salom' });
    const yet = await post(await cookieOl(yettilik.username), { matn: 'salom' });
    const rah = await post(await cookieOl(rahbar.username), { matn: 'salom' });
    const holat = await fetch(`${BAZA}/api/agent/holat`, { headers: { cookie: await cookieOl(rahbar.username) } });
    const hj = (await holat.json()) as Record<string, unknown>;
    tekshir(
      '7. Server ovozi: vakolatsiz 401, mahalla xodimi 403, sozlanmagan bo‘lsa 503 (kalitsiz); holatda `ovozChiqish` false va kalit ko‘rinmaydi',
      bez.status === 401 && yet.status === 403 && rah.status === 503 && hj.ovozChiqish === false && !JSON.stringify(hj).toLowerCase().includes('sk-'),
      `${bez.status}/${yet.status}/${rah.status}, holat=${JSON.stringify(Object.keys(hj).sort())}`
    );
  } finally {
    await brauzer.close();
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
  await prisma.$disconnect();
  process.exit(1);
});
