/**
 * BRAUZERDA TEZLIKNI O'LCHASH (qo'lda yurgiziladi, CI da emas).
 *
 * Nima o'lchaydi: sovuq keshda sahifa ochilishi — LCP, "load"
 * vaqti, JS/HTML/jami bayt, so'rovlar soni; har sahifa uchun
 * TAKROR marta, MEDIANA olinadi.
 *
 * Halol cheklov: bu konteynerdagi Chromium, tarmoq va protsessor
 * DevTools orqali SUN'IY sekinlashtirilgan (Sekin 3G: 400 kbit /
 * 400 ms, Sekin 4G: 1.6 Mbit / 150 ms, CPU 4x). Haqiqiy telefon
 * emas — absolyut sekundlarni telefondagi vaqt deb bo'lmaydi,
 * lekin "oldin/keyin" taqqoslash to'g'ri.
 *
 * Ishlatish (hajmi ishlab chiqarishdagidek BAZADA, ishlab
 * chiqarish bazasida EMAS):
 *
 *   npm run build && npx next start --port 3101   # sinov bazasiga ulangan
 *   U=<login> P=<parol> SAHIFALAR=/panel,/vazifalar TAKROR=3 \
 *     node scripts/o-lchov/brauzer-tezligi.mjs
 *
 * `playwright-core` va Chromium kerak (loyiha bog'liqligi emas):
 *   PW_CHROME=/yo'l/chrome   BAZA=http://127.0.0.1:3101
 *
 * Eslatma: login sahifasidan keyin `/parol-almashtirish` ga
 * yo'naltirilsa, o'lchov BOSHQA sahifani o'lchaydi (bir xil
 * ~6 KB HTML — belgisi shu). Hisobda `parolAlmashtirilsin`
 * belgisi o'chiq bo'lsin.
 */
let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  console.error(
    'playwright-core topilmadi. Loyiha bog‘liqligi emas — alohida papkada o‘rnating:\n' +
      '  mkdir /tmp/pw && cd /tmp/pw && npm i playwright-core\n' +
      'va skriptni shu papkaga nusxalab yurgizing.'
  );
  process.exit(2);
}
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BAZA = process.env.BAZA ?? 'http://127.0.0.1:3101';
const FOYDALANUVCHI = process.env.U;
const PAROL = process.env.P;
if (!FOYDALANUVCHI || !PAROL) {
  console.error('U (login) va P (parol) muhit o‘zgaruvchilari kerak');
  process.exit(2);
}
const SAHIFALAR = (process.env.SAHIFALAR ?? '/kirish,/vazifalar,/panel,/xatlov/yangi,/ishsizlar').split(',');
const TAKROR = Number(process.env.TAKROR ?? 3);

/* DevTools profillari: tezlik baytda/soniya, kechikish ms */
const PROFILLAR = {
  'Sekin 4G (1.6 Mbit, 150 ms)': { down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8, lat: 150, cpu: 4 },
  'Sekin 3G (400 kbit, 400 ms)': { down: (400 * 1024) / 8, up: (400 * 1024) / 8, lat: 400, cpu: 4 },
};

const mediana = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function bir(profil, yol, sovuq) {
  const kontekst = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'pw-')), {
    executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox'],
    viewport: { width: 390, height: 800 },
    serviceWorkers: 'block', // PWA keshi o'lchovga aralashmasin
  });
  const page = kontekst.pages()[0] ?? (await kontekst.newPage());
  try {
    /* Kirish — tezlatilgan holatda, o'lchovga kirmaydi */
    if (yol !== '/kirish') {
      await page.goto(BAZA + '/kirish');
      await page.evaluate(async ([u, p]) => {
        await fetch('/api/auth/kirish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, parol: p }) });
      }, [FOYDALANUVCHI, PAROL]);
    }
    const cdp = await kontekst.newCDPSession(page);
    await cdp.send('Network.enable');
    if (sovuq) await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: profil.down, uploadThroughput: profil.up, latency: profil.lat });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profil.cpu });

    await page.addInitScript(() => {
      window.__lcp = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });

    const t0 = Date.now();
    await page.goto(BAZA + yol, { waitUntil: 'load', timeout: 120000 });
    const yuklandi = Date.now() - t0;
    await page.waitForTimeout(800);

    const m = await page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0];
      const r = performance.getEntriesByType('resource');
      const hajm = (f) => r.filter(f).reduce((s, e) => s + (e.encodedBodySize || 0), 0);
      return {
        ttfb: n.responseStart,
        dcl: n.domContentLoadedEventEnd,
        lcp: window.__lcp,
        htmlKB: n.encodedBodySize / 1024,
        jsKB: hajm((e) => /\.js(\?|$)/.test(e.name)) / 1024,
        cssKB: hajm((e) => /\.css(\?|$)/.test(e.name)) / 1024,
        shriftKB: hajm((e) => /\.(woff2?|ttf)(\?|$)/.test(e.name)) / 1024,
        jami: (n.encodedBodySize + hajm(() => true)) / 1024,
        soni: r.length,
      };
    });
    return { ...m, yuklandi };
  } finally {
    await kontekst.close();
  }
}

for (const [nom, profil] of Object.entries(PROFILLAR)) {
  console.log(`\n══ ${nom}, CPU ${profil.cpu}x sekin ══`);
  console.log('sahifa            LCP     yuklandi   JS     HTML   jami     so‘rov');
  for (const yol of SAHIFALAR) {
    const n = [];
    for (let i = 0; i < TAKROR; i++) n.push(await bir(profil, yol, true));
    const med = (k) => mediana(n.map((x) => x[k]));
    console.log(
      `${yol.padEnd(16)} ${(med('lcp') / 1000).toFixed(1).padStart(5)}s  ${(med('yuklandi') / 1000).toFixed(1).padStart(6)}s  ` +
      `${med('jsKB').toFixed(0).padStart(4)}KB ${med('htmlKB').toFixed(0).padStart(4)}KB ${med('jami').toFixed(0).padStart(5)}KB  ${med('soni').toFixed(0).padStart(4)}`
    );
  }
}
