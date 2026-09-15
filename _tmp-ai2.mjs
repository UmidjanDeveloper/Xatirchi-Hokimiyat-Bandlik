import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
const ctx=await b.newContext({viewport:{width:1100,height:1000}});
const p=await ctx.newPage();
p.on('pageerror', e=>console.log('JS XATO:', e.message.slice(0,120)));
p.on('console', m=>{ if(m.type()==='error') console.log('KONSOL:', m.text().slice(0,120)); });
p.on('response', r=>{ if (r.url().includes('/api/') && r.status()>=400) console.log('API XATO:', r.status(), r.url().replace(B,'')); });
await p.goto(B+'/kirish'); await p.fill('input[name="username"]','tekshiruv_hokim'); await p.fill('input[name="parol"]',P);
await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
await p.goto(B+'/panel'); await p.waitForLoadState('networkidle');
for (const kut of [1000, 3000, 8000]) {
  await p.waitForTimeout(kut === 1000 ? 1000 : kut - 1000);
  const h2 = (await p.locator('h2').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim());
  console.log(`\n--- ${kut}ms ---`);
  console.log('  h2:', h2.slice(0,6).join(' | '));
  console.log('  "хулоса" bormi:', h2.some(t=>/хулоса/i.test(t)));
}
const html = await p.content();
console.log('\nsahifada "Таҳлил хулосаси":', html.includes('Таҳлил хулосаси'));
console.log('sahifada "AiXulosa" izlari:', html.includes('хулоса') || html.includes('Хулоса'));
await b.close();
