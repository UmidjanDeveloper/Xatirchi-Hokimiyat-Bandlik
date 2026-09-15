import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', SP=process.env.SP, P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
const ctx=await b.newContext({viewport:{width:1200,height:1100}});
const p=await ctx.newPage();
p.on('pageerror', e=>console.log('  JS XATO:', e.message.slice(0,90)));
await p.goto(B+'/kirish'); await p.fill('input[name="username"]','tekshiruv_rahbar'); await p.fill('input[name="parol"]',P);
await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');

// Joylashmagan fuqaroni topamiz
await p.goto(B+'/ishsizlar'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500);
const havolalar = await p.locator('a[href^="/ishsizlar/"]').all();
console.log('=== ISHSIZLAR RO\'YXATI ===');
console.log('  ro\'yxatda:', havolalar.length, 'ta havola');
let topildi = null;
for (const h of havolalar.slice(0, 12)) {
  const u = await h.getAttribute('href');
  await p.goto(B+u); await p.waitForLoadState('networkidle'); await p.waitForTimeout(900);
  const tugma = p.getByRole('button', { name: /жойлаштириш|Жойлаштириш/i }).first();
  if (await tugma.count()) { topildi = u; break; }
}
if (!topildi) { console.log('  joylashtirish tugmasi bor fuqaro topilmadi'); await b.close(); process.exit(0); }

console.log(`\n=== FUQARO SAHIFASI ${topildi} ===`);
const ism = await p.locator('h1').first().textContent();
console.log('  fuqaro:', ism.trim());
const mos = await p.locator('a[href^="/ish-orinlari/"]').count();
console.log('  mos e\'lonlar:', mos);
const holatAvval = (await p.locator('body').textContent()).includes('Жойлаштирилди');

await p.getByRole('button', { name: /жойлаштириш/i }).first().click();
await p.waitForTimeout(1200);
// Tasdiqlash oynasi bo'lsa
const tasdiq = p.getByRole('button', { name: /тасдиқ|ҳа|сақлаш/i }).first();
if (await tasdiq.count()) { await tasdiq.click(); await p.waitForTimeout(2000); }
await p.waitForTimeout(1500);

const matn = await p.locator('body').textContent();
console.log('  joylashtirildi belgisi:', /Жойлаштирилди|жойлашди/i.test(matn) ? 'BOR' : "YO'Q");
await p.screenshot({ path: `${SP}/joylashtirish.png`, fullPage: true });
await b.close();
