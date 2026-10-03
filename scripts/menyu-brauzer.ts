/**
 * ============================================================
 *  MENYU VA PANELLAR — HAQIQIY BRAUZERDAGI SINOV (qo'lda ishga tushiriladi)
 *
 *  Chromium, FAQAT mahalliy bazada. `scripts/menyu-sinov.ts` manba kodini
 *  tekshiradi; bu skript esa ekranda ko'rinadigan narsani:
 *
 *   A. TELEFON (390x844): har bir rol uchun menyu ochiladi - oxirgi band
 *      ekranga sig'adimi yoki aylantirib yetib boriladimi, bosilsa to'g'ri
 *      sahifa ochiladimi; uzun menyuda guruh sarlavhalari bor, qisqada yo'q.
 *   B. "Tahlil paneli" va "Operatsion panel" bir xil blok bilan boshlanmaydi:
 *      rahbar va administratorda AI xulosa va dinamika yopiq, bandlik
 *      mutaxassisida ochiq.
 *   C. "Boshqaruv" sahifasida 96 qatorli ro'yxat yo'q, o'rniga `/xodimlar`
 *      kartasi bor.
 *   D. `/xodimlar`: rol kartalari, filtr, 30 tadan ko'rsatish, "Yana ko'rsatish",
 *      qidiruv; hokim kartasidagi "Panelini ko'rish" hokim panelini ochadi
 *      (ko'rish rejimi lentasi bilan) va Koala ko'rinib turadi.
 *
 *  Ishga tushirish:
 *    npx next dev -p 3197 &      (yoki `npm run build && npx next start -p 3197 &`)
 *    BAZA=http://127.0.0.1:3197 npx tsx scripts/menyu-brauzer.ts
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PrismaClient, type Rol } from '@prisma/client';
import { parolXeshla } from '../src/lib/auth';
import { menyuGuruhlari, menyuOl } from '../src/components/shell/navigatsiya';

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
const SKRIN = process.env.MENYU_SKRIN ?? '/tmp/menyu-skrin';
const BELGI = `mb${Date.now().toString(36)}`;
const xodimlar: string[] = [];
const natijalar: boolean[] = [];
const tekshir = (nom: string, ok: boolean, tafsilot = '') => {
  natijalar.push(ok);
  console.log(`${ok ? 'OK  ' : 'XATO'} ${nom}${tafsilot ? '  — ' + tafsilot : ''}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sahifa = any;

async function xodimYarat(rol: Rol, nom: string, mahallaId: string | null = null) {
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

async function kir(brauzer: Sahifa, username: string, q: Record<string, unknown>) {
  const ctx = await brauzer.newContext(q);
  const page = await ctx.newPage();
  const xatolar: string[] = [];
  page.on('pageerror', (e: Error) => xatolar.push(String(e).slice(0, 200)));
  await page.goto(`${BAZA}/kirish`);
  const status = await page.evaluate(
    async (u: string) =>
      (await fetch('/api/auth/kirish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, parol: 'Sinov2026x' }) })).status,
    username
  );
  if (status !== 200) throw new Error(`Kirish yiqildi: ${username} -> ${status}`);
  return { ctx, page, xatolar };
}

async function och(page: Sahifa, yol: string) {
  await page.goto(`${BAZA}${yol}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
}

const TELEFON = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const KOMPYUTER = { viewport: { width: 1280, height: 900 } };

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }
  mkdirSync(SKRIN, { recursive: true });
  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  if (!mahalla) throw new Error('mahalla yo‘q (seed)');

  const roli: Record<Rol, { id: string; username: string }> = {
    ADMIN: await xodimYarat('ADMIN', 'admin'),
    BANDLIK_RAHBAR: await xodimYarat('BANDLIK_RAHBAR', 'rahbar'),
    BANDLIK: await xodimYarat('BANDLIK', 'bandlik'),
    HOKIM: await xodimYarat('HOKIM', 'hokim'),
    YETTILIK: await xodimYarat('YETTILIK', 'yettilik', mahalla.id),
  };

  const brauzer = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  try {
    /* ══ A. Telefonda menyu: har bir rol ══ */
    for (const rol of ['ADMIN', 'BANDLIK_RAHBAR', 'BANDLIK', 'YETTILIK', 'HOKIM'] as Rol[]) {
      const { ctx, page, xatolar } = await kir(brauzer, roli[rol].username, TELEFON);
      await och(page, '/vazifalar');
      await page.getByRole('button', { name: 'Менюни очиш' }).click();
      await page.waitForSelector('aside.workspace-sidebar', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(400);
      const o = await page.evaluate(() => {
        const a = document.querySelector('aside.workspace-sidebar') as HTMLElement;
        const cs = getComputedStyle(a);
        const ar = a.getBoundingClientRect();
        return { pastki: Math.round(ar.bottom), oyna: window.innerHeight, overflowY: cs.overflowY, scrollH: a.scrollHeight, clientH: a.clientHeight, sarlavhalar: a.querySelectorAll('nav p').length };
      });
      const kutilgan = menyuOl(rol).length;
      const sarlavhaKutilgan = menyuGuruhlari(rol).filter((g) => g.nomi).length;
      /* menyu oynadan chiqmaydi */
      const sigadi = o.pastki <= o.oyna + 1;
      /* aylantirib oxirgisiga yetiladi */
      await page.evaluate(() => {
        const a = document.querySelector('aside.workspace-sidebar') as HTMLElement;
        a.scrollTop = a.scrollHeight;
      });
      await page.waitForTimeout(250);
      const oxirgi = await page.evaluate(() => {
        const l = Array.from(document.querySelectorAll('aside.workspace-sidebar nav a')).pop() as HTMLElement;
        const r = l.getBoundingClientRect();
        return { nom: l.innerText.trim(), href: l.getAttribute('href'), pastki: Math.round(r.bottom), tepa: Math.round(r.top), oyna: window.innerHeight };
      });
      const korinadi = oxirgi.pastki <= oxirgi.oyna && oxirgi.tepa >= 0;
      tekshir(
        `A. Telefon, ${rol}: ${kutilgan} ta band; menyu oynadan chiqmaydi, aylantirilganda oxirgi band (“${oxirgi.nom}”) ko‘rinadi; sarlavhalar ${sarlavhaKutilgan} ta`,
        sigadi && korinadi && o.sarlavhalar === sarlavhaKutilgan && (kutilgan <= 11 || o.overflowY === 'auto'),
        `menyu pastki=${o.pastki}/${o.oyna}, overflow=${o.overflowY}, scroll=${o.scrollH}/${o.clientH}, oxirgi pastki=${oxirgi.pastki}`
      );
      if (rol === 'ADMIN' || rol === 'BANDLIK_RAHBAR') {
        await page.locator('aside.workspace-sidebar nav a').last().click();
        await page.waitForURL((u: URL) => u.pathname === oxirgi.href, { timeout: 40000 }).catch(() => undefined);
        const yol = new URL(page.url()).pathname;
        tekshir(`A. Telefon, ${rol}: oxirgi bandni bossa (${oxirgi.href}) sahifa ochiladi`, yol === oxirgi.href, `yo‘l=${yol}`);
      }
      if (rol === 'ADMIN') {
        await page.getByRole('button', { name: 'Менюни очиш' }).click().catch(() => undefined);
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${SKRIN}/A-telefon-admin-menyu.png` });
      }
      if (xatolar.length) tekshir(`A. Telefon, ${rol}: sahifa xatosiz`, false, xatolar.join(' | '));
      await ctx.close();
    }

    /* ══ B. Tahlil paneli va Operatsion panel bir xil boshlanmaydi ══ */
    for (const rol of ['ADMIN', 'BANDLIK_RAHBAR', 'BANDLIK'] as Rol[]) {
      const { ctx, page } = await kir(brauzer, roli[rol].username, KOMPYUTER);
      await och(page, '/bandlik');
      const b = await page.evaluate(() => {
        /* "Қандай ҳисобланган" ham <details>: faqat bizning yig'iladigan bloklarni sanaymiz */
        const det = (Array.from(document.querySelectorAll('main details')) as HTMLDetailsElement[]).filter((d) =>
          /Таҳлил панелида ҳам бор/.test((d.querySelector('summary') as HTMLElement).innerText)
        );
        const yopiq = det.filter((d) => !d.open).map((d) => (d.querySelector('summary') as HTMLElement).innerText.replace(/\s+/g, ' ').trim().slice(0, 60));
        const h2 = Array.from(document.querySelectorAll('main h2')).filter((h) => (h as HTMLElement).offsetParent !== null).map((h) => (h as HTMLElement).innerText.trim());
        return { yopiq, jami: det.length, korinadiganH2: h2.slice(0, 4) };
      });
      if (rol === 'BANDLIK') {
        tekshir(`B. ${rol}: Operatsion panelda AI xulosa ochiq (tahlil paneli yo‘q)`, b.jami === 0 && b.korinadiganH2.includes('Таҳлил хулосаси ва тавсиялар'), `yig‘iladigan bloklar=${b.jami}, h2=${b.korinadiganH2.join(' | ')}`);
      } else {
        tekshir(
          `B. ${rol}: Operatsion panelda AI xulosa va dinamika YOPIQ blokda, sahifa shu bilan boshlanmaydi`,
          b.jami === 2 && b.yopiq.length === 2 && !b.korinadiganH2.includes('Таҳлил хулосаси ва тавсиялар'),
          `yopiq=${b.yopiq.join(' | ')}; h2=${b.korinadiganH2.join(' | ')}`
        );
        /* ochilsa ichi ko'rinadi */
        await page.locator('main details summary').first().click();
        await page.waitForTimeout(500);
        const ichi = await page.locator('main details[open] h2').first().innerText().catch(() => '');
        tekshir(`B. ${rol}: yopiq blokni bossa AI xulosa ochiladi`, /Таҳлил хулосаси/.test(ichi), `h2="${ichi}"`);
        if (rol === 'ADMIN') await page.screenshot({ path: `${SKRIN}/B-operatsion-panel-admin.png` });
      }
      await ctx.close();
    }

    /* ══ C. Boshqaruv sahifasi ══ */
    {
      const { ctx, page } = await kir(brauzer, roli.ADMIN.username, KOMPYUTER);
      await och(page, '/admin');
      const c = await page.evaluate(() => {
        const h2 = Array.from(document.querySelectorAll('main h2')).map((h) => (h as HTMLElement).innerText.trim());
        const karta = document.querySelector('main a[href="/xodimlar"]') as HTMLElement | null;
        return { h2, karta: karta ? karta.innerText.replace(/\s+/g, ' ').trim() : null, balandlik: document.documentElement.scrollHeight };
      });
      tekshir(
        'C. Boshqaruv: 96 qatorli “Ходимлар (…)” ro‘yxati yo‘q, o‘rniga `/xodimlar` kartasi (sonlar bilan) bor',
        !c.h2.some((h: string) => h.startsWith('Ходимлар (')) && !!c.karta && /Ходимлар ва панеллар/.test(c.karta) && /Ҳоким \d+/.test(c.karta),
        `karta="${c.karta?.slice(0, 90)}", sahifa balandligi=${c.balandlik}px`
      );
      await page.screenshot({ path: `${SKRIN}/C-boshqaruv.png` });
      await ctx.close();
    }

    /* ══ D. /xodimlar ══ */
    {
      const { ctx, page, xatolar } = await kir(brauzer, roli.ADMIN.username, KOMPYUTER);
      await och(page, '/xodimlar');
      const d = await page.evaluate(() => {
        const kartalar = Array.from(document.querySelectorAll('[data-rol-kartasi]')).map((k) => k.getAttribute('data-rol-kartasi'));
        const chips = Array.from(document.querySelectorAll('[role="group"] a')).map((a) => (a as HTMLElement).innerText.replace(/\s+/g, ' ').trim());
        const qatorlar = document.querySelectorAll('#royxat .karta > div').length;
        const yana = Array.from(document.querySelectorAll('#royxat button')).find((b) => /Яна кўрсатиш/.test((b as HTMLElement).innerText)) as HTMLElement | undefined;
        return { kartalar, chips, qatorlar, yana: yana?.innerText.replace(/\s+/g, ' ') ?? null, balandlik: document.documentElement.scrollHeight };
      });
      tekshir('D. /xodimlar: beshta rol kartasi (hokim, rahbar, mutaxassis, mahalla, administrator)', d.kartalar.join() === 'HOKIM,BANDLIK_RAHBAR,BANDLIK,YETTILIK,ADMIN', `kartalar=${d.kartalar.join()}`);
      tekshir('D. /xodimlar: filtr tugmalari sonlar bilan', d.chips.length === 6 && d.chips.every((c: string) => /\(\d+\)/.test(c)), d.chips.join(' | '));
      tekshir('D. /xodimlar: standart filtr — mahalla xodimlari, 30 tadan ko‘rsatiladi va “Yana ko‘rsatish” tugmasi bor', d.qatorlar <= 31 && d.qatorlar >= 25 && !!d.yana, `qator=${d.qatorlar}, tugma="${d.yana}", sahifa=${d.balandlik}px`);
      await page.screenshot({ path: `${SKRIN}/D-xodimlar-tepa.png` });

      /* Yana ko'rsatish */
      await page.getByRole('button', { name: /Яна кўрсатиш/ }).click();
      await page.waitForTimeout(500);
      const ortdi = await page.evaluate(() => document.querySelectorAll('#royxat .karta > div').length);
      tekshir('D. “Yana ko‘rsatish” qatorlarni ko‘paytiradi', ortdi > d.qatorlar, `${d.qatorlar} → ${ortdi}`);

      /* Qidiruv butun ro'yxatdan */
      await page.getByLabel('Қидириш').fill('mfy_');
      await page.waitForTimeout(500);
      const topildi = await page.evaluate(() => document.querySelectorAll('#royxat .karta > div').length);
      tekshir('D. Qidiruv ishlaydi (login bo‘yicha)', topildi > 0, `topildi=${topildi}`);
      await page.getByLabel('Қидириш').fill('');

      /* Filtr: hokim */
      await page.getByRole('link', { name: /^Ҳоким \(/ }).first().click();
      await page.waitForTimeout(1200);
      const hokimQator = await page.evaluate(() => Array.from(document.querySelectorAll('#royxat .karta > div')).length);
      tekshir('D. Filtr “Ҳоким”: faqat hokim hisoblari ko‘rinadi', hokimQator >= 1 && hokimQator <= 10, `qator=${hokimQator}, url=${page.url().replace(BAZA, '')}`);

      /* Hokim panelini ko'rish */
      await och(page, '/xodimlar');
      const hokimKarta = page.locator('[data-rol-kartasi="HOKIM"]');
      await hokimKarta.getByRole('button', { name: 'Панелини кўриш' }).click();
      await page.waitForURL((u: URL) => u.pathname === '/panel', { timeout: 20000 }).catch(() => undefined);
      await page.waitForTimeout(1500);
      const lenta = await page.locator('text=Кўриш режими').count();
      const h1 = await page.locator('main h1').first().innerText().catch(() => '');
      const koala = await page.locator('[data-agent-tugmasi]').count();
      tekshir('D. “Hokim paneli — Panelini ko‘rish”: hokim paneli (`/panel`) ochiladi, ko‘rish rejimi lentasi turadi, Koala ko‘rinadi', new URL(page.url()).pathname === '/panel' && lenta > 0 && /Таҳлил панели/.test(h1) && koala === 1, `yo‘l=${new URL(page.url()).pathname}, lenta=${lenta}, h1="${h1}", koala=${koala}`);
      await page.screenshot({ path: `${SKRIN}/D-hokim-paneli-korish.png` });
      if (xatolar.length) tekshir('D. Sahifa xatosiz', false, xatolar.join(' | '));
      await ctx.close();
    }

    /* ══ E. Boshqa rollar /xodimlar ga kira olmaydi ══ */
    for (const rol of ['BANDLIK_RAHBAR', 'HOKIM', 'YETTILIK'] as Rol[]) {
      const { ctx, page } = await kir(brauzer, roli[rol].username, KOMPYUTER);
      await och(page, '/vazifalar');
      /* Serverdan kelgan HTML: xodimlar ro'yxati va rol kartalari bo'lmasligi shart (xavfsizlik) */
      const html: string = await page.evaluate(async () => (await fetch('/xodimlar')).text());
      const sizdi = html.includes('data-rol-kartasi') || html.includes('mfy_') || html.includes('Логин ва парол рўйхати');
      await page.goto(`${BAZA}/xodimlar`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);
      await page.waitForURL((u: URL) => u.pathname !== '/xodimlar', { timeout: 20000 }).catch(() => undefined);
      const yol = new URL(page.url()).pathname;
      tekshir(`E. ${rol} \`/xodimlar\` ga kira olmaydi: serverdan ro‘yxat chiqmaydi, brauzer o‘z sahifasiga qaytariladi`, !sizdi && yol !== '/xodimlar', `sizdi=${sizdi}, yo‘l=${yol}`);
      await ctx.close();
    }
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
