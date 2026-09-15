import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', SP=process.env.SP, P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
const ctx=await b.newContext({viewport:{width:1100,height:1200}});
const p=await ctx.newPage();
p.on('pageerror', e=>console.log('  JS XATO:', e.message.slice(0,100)));
await p.goto(B+'/kirish'); await p.fill('input[name="username"]','mfy_baxshijar'); await p.fill('input[name="parol"]',P);
await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
await p.goto(B+'/xatlov/yangi'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1200);

// Qadamlar ro'yxati
const qadamlar = await p.locator('nav button, [role="tablist"] button, ol li').allTextContents().catch(()=>[]);
console.log('Qadamlar:', qadamlar.filter(Boolean).map(s=>s.replace(/\s+/g,' ').trim()).slice(0,15).join(' | '));
console.log('\nBirinchi qadam maydonlari:');
const inp = await p.locator('input:visible, select:visible, textarea:visible').all();
for (const el of inp.slice(0,20)) {
  const id = await el.getAttribute('id') || await el.getAttribute('name') || '?';
  const tur = await el.getAttribute('type') || await el.evaluate(e=>e.tagName.toLowerCase());
  console.log(`  ${id.padEnd(28)} ${tur}`);
}
const tugmalar = await p.getByRole('button').allTextContents();
console.log('\nTugmalar:', tugmalar.map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,12).join(' | '));
await p.screenshot({ path: `${SP}/xatlov-1.png`, fullPage: true });
await b.close();
