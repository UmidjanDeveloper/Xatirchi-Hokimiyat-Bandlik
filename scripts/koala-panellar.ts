/**
 * ============================================================
 *  KOALA HAR PANELDA — ROL × SAHIFA AUDITI (qo'lda ishga tushiriladi)
 *
 *  Savol: "Koala (va JARVIS tugmasi) hokim, bandlik markazi, bandlik
 *  rahbari va administrator panelining HAR sahifasida bormi?"
 *
 *  Har bir rol uchun menyudagi barcha sahifalar (va bosh sahifa) ochiladi
 *  va Koala tugmasi uchun tekshiriladi:
 *   · DOMda bor;
 *   · ekran ichida (kompyuter 1280x800 va telefon 390x844);
 *   · boshqa element USTIDA YOPILMAGAN (elementFromPoint tugmaga tegishli);
 *   · rasmi yuklangan (naturalWidth > 0) — ko'zga ko'rinadigan narsa shu.
 *  Mahalla xodimi (YETTILIK) uchun Koala bo'lmasligi KERAK (ataylab yopiq).
 *
 *  Ko'rish rejimi (administrator hokim yoki bandlik rahbari "ko'zi bilan"
 *  qarayotganda) alohida bo'limda: u yerda ham Koala (va JARVIS tabi) bor,
 *  salom ADMINISTRATORning haqiqiy ismi bilan, oynada "faqat o'qiydi"
 *  eslatmasi turadi va suhbat ishlaydi.
 *
 *  Ishga tushirish (har ikki versiyani solishtirish uchun BAZA ni almashtiring):
 *    npm run build && npx next start -p 3196 &
 *    BAZA=http://127.0.0.1:3196 npx tsx scripts/koala-panellar.ts
 *
 *  FAQAT mahalliy bazada. Brauzer: `PW_CHROME` (standart `/opt/pw-browsers/chromium`).
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PrismaClient, type Rol } from '@prisma/client';
import { parolXeshla } from '../src/lib/auth';
import { MENYU } from '../src/components/shell/navigatsiya';

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
const SKRIN = process.env.PANEL_SKRIN ?? '/tmp/koala-panel-skrin';
const BELGI = `kp${Date.now().toString(36)}`;
const xodimlar: string[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sahifa = any;

const ROLLAR: { rol: Rol; kutiladi: boolean }[] = [
  { rol: 'HOKIM', kutiladi: true },
  { rol: 'BANDLIK', kutiladi: true },
  { rol: 'BANDLIK_RAHBAR', kutiladi: true },
  { rol: 'ADMIN', kutiladi: true },
  { rol: 'YETTILIK', kutiladi: false },
];

interface Qator {
  rol: string;
  sahifa: string;
  oxirgiYol: string;
  oyna: string;
  bor: boolean;
  ichida: boolean;
  ochiq: boolean;
  rasm: boolean;
}
const qatorlar: Qator[] = [];
let oynaXato = 0;

async function xodimYarat(rol: Rol, mahallaId: string | null, nom: string) {
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

async function kir(brauzer: Sahifa, username: string, viewport: { width: number; height: number }) {
  const ctx = await brauzer.newContext({ viewport });
  const page = await ctx.newPage();
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
  return { ctx, page };
}

/** Koala tugmasining holatini o'lchaydi */
async function olchash(page: Sahifa, viewport: { width: number; height: number }) {
  const bor = await page
    .waitForSelector('[data-agent-tugmasi]', { timeout: 7000, state: 'attached' })
    .then(() => true)
    .catch(() => false);
  if (!bor) return { bor: false, ichida: false, ochiq: false, rasm: false };
  await page.waitForTimeout(500);
  const box = await page.locator('[data-agent-tugmasi]').first().boundingBox();
  const ichida = !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 0.5 && box.y + box.height <= viewport.height + 0.5;
  const ochiq = box
    ? await page.evaluate(
        ({ x, y }: { x: number; y: number }) => {
          const el = document.elementFromPoint(x, y);
          return !!el && !!el.closest('[data-agent-tugmasi]');
        },
        { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      )
    : false;
  const rasm = await page
    .waitForFunction(
      () => {
        const img = document.querySelector('[data-agent-tugmasi] img') as HTMLImageElement | null;
        return !!img && img.complete && img.naturalWidth > 0;
      },
      undefined,
      { timeout: 4000 }
    )
    .then(() => true)
    .catch(() => false);
  return { bor: true, ichida, ochiq, rasm };
}

async function sahifalarniOlchash(page: Sahifa, rolNomi: string, sahifalar: string[], oyna: string, viewport: { width: number; height: number }) {
  for (const yol of sahifalar) {
    try {
      await page.goto(`${BAZA}${yol}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch {
      /* sekin sahifa — baribir o'lchaymiz */
    }
    const oxirgiYol = new URL(page.url()).pathname;
    const m = await olchash(page, viewport);
    qatorlar.push({ rol: rolNomi, sahifa: yol, oxirgiYol, oyna, ...m });
  }
}

/** Ko'rish rejimida Koala oynasi: eslatma, haqiqiy administrator ismi, ishlaydigan suhbat */
async function korishOynasi(page: Sahifa, nomi: string, adminBelgi: string, nishonBelgi: string, skrin: string) {
  await page.goto(`${BAZA}/vazifalar`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('[data-agent-tugmasi]', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.locator('[data-agent-tugmasi]').click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await page.waitForTimeout(900);
  const eslatma = (await page.locator('[data-korish-eslatma]').count()) > 0;
  const boshi: string = await page.locator('[aria-live="polite"]').first().innerText();
  const ism = boshi.includes(adminBelgi) && !boshi.includes(nishonBelgi);
  const tabMatni: string = await page.locator('[role="group"][aria-label="Ёрдамчи режими"]').innerText();
  const jarvisTab = tabMatni.includes('JARVIS');

  const kiritish = page.getByLabel('Коалага савол ёки буйруқ');
  await kiritish.fill('Салом');
  await kiritish.press('Enter');
  const javob = await page
    .waitForFunction(() => (document.querySelector('[aria-live="polite"]')?.children.length ?? 0) >= 3, undefined, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  const xatoQuti = (await page.locator('[aria-live="polite"] .quti-ogoh').count()) > 0;
  await page.screenshot({ path: skrin });
  console.log(
    `${eslatma && ism && jarvisTab && javob && !xatoQuti ? 'OK  ' : 'XATO'} ${nomi}: eslatma=${eslatma}, salom admin ismi bilan=${ism}, JARVIS tabi=${jarvisTab}, javob keldi=${javob}, xato qutisi=${xatoQuti}`
  );
  return eslatma && ism && jarvisTab && javob && !xatoQuti;
}

const sahifalarRol = (rol: Rol) => ['/', ...MENYU.filter((b) => b.rollar.includes(rol)).map((b) => b.yol)].filter((v, i, a) => a.indexOf(v) === i);

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }
  mkdirSync(SKRIN, { recursive: true });
  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  if (!mahalla) throw new Error('mahalla yo‘q (seed)');

  const brauzer = await chromium.launch({
    executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium',
    args: ['--no-sandbox'],
  });

  try {
    for (const { rol } of ROLLAR) {
      const x = await xodimYarat(rol, rol === 'YETTILIK' ? mahalla.id : null, rol.toLowerCase());
      const sahifalar = sahifalarRol(rol);

      const kompyuter = { width: 1280, height: 800 };
      const d = await kir(brauzer, x.username, kompyuter);
      await sahifalarniOlchash(d.page, rol, sahifalar, 'kompyuter', kompyuter);
      await d.page.screenshot({ path: `${SKRIN}/${rol}-kompyuter.png` });
      await d.ctx.close();

      const telefon = { width: 390, height: 844 };
      const t = await kir(brauzer, x.username, telefon);
      await sahifalarniOlchash(t.page, rol, sahifalar.slice(0, 3), 'telefon', telefon);
      await t.page.screenshot({ path: `${SKRIN}/${rol}-telefon.png` });
      await t.ctx.close();
    }

    /* Ko'rish rejimi: administrator hokim va bandlik rahbari "ko'zi bilan" */
    const admin = await xodimYarat('ADMIN', null, 'koz_admin');
    for (const nishonRol of ['HOKIM', 'BANDLIK_RAHBAR'] as const) {
      const nishon = await xodimYarat(nishonRol, null, `koz_${nishonRol.toLowerCase()}`);
      const kompyuter = { width: 1280, height: 800 };
      const k = await kir(brauzer, admin.username, kompyuter);
      const st = await k.page.evaluate(
        async (id: string) => (await fetch('/api/admin/korish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) })).status,
        nishon.id
      );
      if (st !== 200) throw new Error(`Ko'rish rejimi yoqilmadi: ${st}`);
      await sahifalarniOlchash(k.page, `ADMIN→${nishonRol} (ko'rish rejimi)`, ['/', '/vazifalar'], 'kompyuter', kompyuter);
      await k.page.screenshot({ path: `${SKRIN}/KORISH-${nishonRol}.png` });
      const oynaOk = await korishOynasi(
        k.page,
        `ADMIN→${nishonRol} oynasi`,
        /* Salom ismni tozalab yozadi: pastki chiziq bo'shliqqa aylanadi */
        'koz admin',
        nishonRol === 'HOKIM' ? 'koz hokim' : 'koz bandlik rahbar',
        `${SKRIN}/KORISH-${nishonRol}-oyna.png`
      );
      if (!oynaOk) oynaXato++;
      await k.ctx.close();
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

  /* ── Hisobot ── */
  const bel = (v: boolean) => (v ? 'ha ' : 'YO‘Q');
  console.log('\nrol'.padEnd(34) + 'sahifa'.padEnd(22) + 'oyna'.padEnd(10) + 'bor  ichida  ochiq  rasm   oxirgi yo‘l');
  for (const q of qatorlar) {
    console.log(`${q.rol.padEnd(33)} ${q.sahifa.padEnd(21)} ${q.oyna.padEnd(9)} ${bel(q.bor)}  ${bel(q.ichida)}    ${bel(q.ochiq)}   ${bel(q.rasm)}   ${q.oxirgiYol}`);
  }

  const kutiladi = (rol: string) => ROLLAR.find((r) => r.rol === rol)?.kutiladi ?? true; // ko'rish rejimi qatorlari: bo'lishi KERAK
  let xato = 0;
  const mantiqiyHokim = qatorlar.filter((q) => q.oxirgiYol !== '/kirish');
  for (const q of mantiqiyHokim) {
    const kerak = kutiladi(q.rol);
    const yaxshi = kerak ? q.bor && q.ichida && q.ochiq && q.rasm : !q.bor;
    if (!yaxshi) xato++;
  }
  const kirishgaYonaltirilgan = qatorlar.filter((q) => q.oxirgiYol === '/kirish');
  console.log(`\nJami ${qatorlar.length} o'lchov; xato: ${xato}; ko'rish oynasi xatosi: ${oynaXato}; kirishga qaytarilgani: ${kirishgaYonaltirilgan.length}; skrinshotlar: ${SKRIN}`);
  process.exit(xato || oynaXato || kirishgaYonaltirilgan.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
