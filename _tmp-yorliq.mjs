import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
const ctx=await b.newContext({viewport:{width:1100,height:1200}});
const p=await ctx.newPage();
await p.goto(B+'/kirish'); await p.fill('input[name="username"]','mfy_baxshijar'); await p.fill('input[name="parol"]',P);
await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
await p.goto(B+'/xatlov/yangi'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1000);
for (const el of await p.locator('input:visible, select:visible, textarea:visible').all()) {
  const id = await el.getAttribute('id');
  const yorliq = id ? await p.locator(`label[for="${id}"]`).first().textContent().catch(()=>null) : null;
  const tur = await el.getAttribute('type') || await el.evaluate(e=>e.tagName.toLowerCase());
  console.log(`${tur.padEnd(8)} ${(yorliq||'?').replace(/\s+/g,' ').trim().slice(0,56)}`);
}
await b.close();
