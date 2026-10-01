/**
 * ============================================================
 *  PWA — HAQIQIY BRAUZERDAGI SINOV (qo'lda ishga tushiriladi)
 *
 *  Nima tekshiradi: Chromium'da service worker o'rnatiladi,
 *  Chrome'ning O'ZI «o'rnatish mumkin» deydi, internet
 *  o'chirilganda oflayn sahifa chiqadi, hisob almashganda
 *  keshda hech kimning ma'lumoti qolmaydi va worker yangilanganda
 *  qoralama saqlanib qoladi.
 *
 *  Nega CI da emas: production serveri va Chromium talab qiladi.
 *  Worker'ning MANTIQI esa `scripts/pwa-sinov.ts` da sandbox'da
 *  har commitda tekshiriladi.
 *
 *  Ishga tushirish:
 *
 *    npm run build && npx next start --port 3100 &
 *    npm i --no-save playwright-core
 *    PW_CHROME=/yo'l/chrome node scripts/pwa-brauzer-sinov.mjs
 *
 *  Kerak: `tekshiruv_hokim` va `tekshiruv_rahbar` hisoblari
 *  (parol `Sinov2026x`) — mahalliy bazada.
 * ============================================================
 */
import { chromium } from 'playwright-core';

const BAZA = process.env.BAZA ?? 'http://127.0.0.1:3100';
const natijalar = [];
const tekshir = (nom, ok, tafsilot = '') => {
  natijalar.push(ok);
  console.log(`${ok ? 'OK  ' : 'XATO'} ${nom}${tafsilot ? '  — ' + tafsilot : ''}`);
};

async function kir(page, username) {
  await page.goto(BAZA + '/kirish');
  const r = await page.evaluate(async (u) => {
    const j = await fetch('/api/auth/kirish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, parol: 'Sinov2026x' }),
    });
    return j.status;
  }, username);
  return r;
}

/** Barcha keshlardagi yozuvlar: url, tur, matn */
async function keshlarniOl(page) {
  return page.evaluate(async () => {
    const chiqish = [];
    for (const nom of await caches.keys()) {
      const kesh = await caches.open(nom);
      for (const so of await kesh.keys()) {
        const j = await kesh.match(so);
        const tur = j.headers.get('content-type') || '';
        const matn = /text|json|javascript|html/.test(tur) ? await j.clone().text() : '';
        chiqish.push({ kesh: nom, url: new URL(so.url).pathname, tur, matn });
      }
    }
    return chiqish;
  });
}

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
/*
 * Oddiy `newContext()` — Chrome uchun INCOGNITO, va incognito'da
 * o'rnatish mumkin emas (`in-incognito`). Haqiqiy foydalanuvchi
 * oddiy profilda ishlaydi, shuning uchun doimiy profil.
 */
const kontekst = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'pw-')), {
  executablePath: process.env.PW_CHROME,
  args: ['--no-sandbox'],
  viewport: { width: 390, height: 800 },
});
const brauzer = { close: () => kontekst.close() };
const page = kontekst.pages()[0] ?? (await kontekst.newPage());
const xatolar = [];
page.on('pageerror', (e) => xatolar.push(e.message));

/* ───── 1. O'rnatish ───── */
const aKirish = await kir(page, 'tekshiruv_hokim');
tekshir('A hokim kirdi', aKirish === 200, `status=${aKirish}`);
await page.goto(BAZA + '/vazifalar', { waitUntil: 'load' });
await page.evaluate(() => navigator.serviceWorker.ready);
/* Birinchi yuklashda worker sahifani hali boshqarmaydi — qayta ochamiz */
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 });
tekshir('Service worker o‘rnatildi va sahifani boshqaryapti', true);

const reg = await page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration('/');
  return { scope: r.scope, holat: r.active?.state, updateViaCache: r.updateViaCache };
});
tekshir('Worker faol', reg.holat === 'activated', `scope=${reg.scope}, updateViaCache=${reg.updateViaCache}`);
tekshir('updateViaCache = none (sw.js o‘zi keshlanmaydi)', reg.updateViaCache === 'none');

/* ───── 2. O'rnatilish mezonlari (Chrome o'zi tekshiradi) ───── */
const cdp = await kontekst.newCDPSession(page);
const man = await cdp.send('Page.getAppManifest');
tekshir('Manifest o‘qildi', Boolean(man.data) && !man.errors?.length, `url=${man.url}, xatolar=${JSON.stringify(man.errors ?? [])}`);
let o = [];
try { o = (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors ?? []; } catch (e) { o = [{ errorId: 'cdp-yoq:' + e.message }]; }
tekshir('Chrome «o‘rnatish mumkin» deydi (installability xatolari yo‘q)', o.length === 0, o.map((x) => x.errorId).join(', ') || 'xato yo‘q');

/* ───── 3. Keshda nima bor ───── */
let kesh = await keshlarniOl(page);
const keshNomlari = [...new Set(kesh.map((k) => k.kesh))];
tekshir('Faqat ikkita kesh bor: statik va oflayn', keshNomlari.every((n) => n === 'statik' || n === 'oflayn-v1'), keshNomlari.join(', '));
tekshir('Oflayn sahifa keshda', kesh.some((k) => k.url === '/oflayn.html'));
const statikSoni = kesh.filter((k) => k.kesh === 'statik').length;
tekshir('Statik fayllar keshlandi', statikSoni > 0, `${statikSoni} ta`);
tekshir('Statik keshda FAQAT ruxsat etilgan manzillar', kesh.filter((k) => k.kesh === 'statik').every((k) => /^\/(_next\/static|shrift|ikonka)\//.test(k.url) || k.url === '/favicon.svg' || k.url === '/hokimiyat-logo.png'));
tekshir('Keshda /api/ YO‘Q', !kesh.some((k) => k.url.startsWith('/api/')));
tekshir('Keshda sahifa (/vazifalar, /panel...) YO‘Q', !kesh.some((k) => ['/vazifalar', '/panel', '/', '/reyestr'].includes(k.url)));
tekshir('Oflayn sahifadan boshqa HTML YO‘Q', kesh.filter((k) => /html/.test(k.tur)).every((k) => k.url === '/oflayn.html'));

/* ───── 4. Oflayn ───── */
await kontekst.setOffline(true);
let oflaynMatn = '';
try {
  await page.goto(BAZA + '/vazifalar', { waitUntil: 'load', timeout: 15000 });
  oflaynMatn = await page.evaluate(() => document.body.innerText);
} catch (e) { oflaynMatn = 'GOTO XATO: ' + e.message; }
tekshir('Oflayn yangi sahifa ochilganda OFLAYN sahifa chiqadi', /Интернет йўқ/.test(oflaynMatn), oflaynMatn.slice(0, 40).replace(/\n/g, ' '));
tekshir('Oflayn sahifada nima ishlashi/ishlamasligi yozilgan', /интернетсиз ишлайди/i.test(oflaynMatn) && /интернетсиз ишламайди/i.test(oflaynMatn));
tekshir('Oflayn sahifada hokimning ismi/ma’lumoti YO‘Q', !/Tekshiruv|HOKIM|Alisher|Uyshun/i.test(oflaynMatn));
await kontekst.setOffline(false);

/* ───── 5. Internet qaytdi — oddiy ish ───── */
await page.goto(BAZA + '/vazifalar', { waitUntil: 'load' });
const onlayn = await page.evaluate(() => document.body.innerText);
tekshir('Internet qaytgach sahifa ODDIY ochiladi (keshdan emas)', /Туман ҳолати/.test(onlayn));

/* ───── 6. Qoralama yangilanishdan omon qoladi ───── */
await page.evaluate(() => {
  localStorage.setItem('xatlov:tekshiruv_hokim:sinov-1', JSON.stringify({ malumot: { manzil: 'SINOV MANZIL' }, vaqt: Date.now() }));
  localStorage.setItem('xatlov-navbat', JSON.stringify([{ localId: 'n1', egasi: 'tekshiruv_hokim' }]));
});
await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration('/'); await r.update(); });
await page.reload({ waitUntil: 'load' });
const saqlandi = await page.evaluate(() => ({
  q: localStorage.getItem('xatlov:tekshiruv_hokim:sinov-1') !== null,
  n: localStorage.getItem('xatlov-navbat') !== null,
}));
tekshir('Worker yangilanganda QORALAMA saqlanib qoladi', saqlandi.q);
tekshir('Worker yangilanganda OFLAYN NAVBAT saqlanib qoladi', saqlandi.n);

/* ───── 7. HISOB ALMASHGANDA ARALASHMAYDI ───── */
await page.goto(BAZA + '/panel', { waitUntil: 'load' });
await page.goto(BAZA + '/reyestr', { waitUntil: 'load' });
await page.evaluate(() => fetch('/api/auth/chiqish', { method: 'POST' }).catch(() => {}));
await kontekst.clearCookies();
const bKirish = await kir(page, 'tekshiruv_rahbar');
tekshir('B rahbar kirdi', bKirish === 200, `status=${bKirish}`);
await page.goto(BAZA + '/vazifalar', { waitUntil: 'load' });
const bMatn = await page.evaluate(() => document.body.innerText);
tekshir('B o‘z sahifasini ko‘radi (rahbar), A niki emas', /Операцион ҳолат/.test(bMatn) && !/Туман ҳолати/.test(bMatn));

kesh = await keshlarniOl(page);
const hammaMatn = kesh.map((k) => k.matn).join('\n');
tekshir('Keshda A (hokim) ning ismi/logini YO‘Q', !/tekshiruv_hokim|Tekshiruv HOKIM/i.test(hammaMatn));
tekshir('Keshda B (rahbar) ning ismi/logini YO‘Q', !/tekshiruv_rahbar|Tekshiruv BANDLIK_RAHBAR/i.test(hammaMatn));
tekshir('Keshda fuqaro ismlari YO‘Q (Tursunov, Hakimova...)', !/Tursunov|Hakimova|Bekmurodov|Nazarova/.test(hammaMatn));
tekshir('Hisob almashgandan keyin ham keshda /api/ va sahifa YO‘Q', !kesh.some((k) => k.url.startsWith('/api/') || ['/vazifalar', '/panel', '/reyestr'].includes(k.url)));

/* ───── 8. Xato bergan sahifa oflayn sahifa bilan ALMASHTIRILMAYDI ───── */
const j = await page.evaluate(async () => { const r = await fetch('/bunday-sahifa-yoq'); return r.status; });
tekshir('404 javobi o‘zgarishsiz o‘tadi (oflayn sahifa bilan almashtirilmaydi)', j === 404, `status=${j}`);

tekshir('Sahifada JavaScript xatosi yo‘q', xatolar.length === 0, xatolar.join(' | '));

await brauzer.close();
const ok = natijalar.filter(Boolean).length;
console.log(`\n${ok}/${natijalar.length} o'tdi`);
process.exit(ok === natijalar.length ? 0 : 1);
