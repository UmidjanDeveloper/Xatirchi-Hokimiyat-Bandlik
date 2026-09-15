import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', SP=process.env.SP, P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
for (const [login, nom, yol] of [
  ['tekshiruv_hokim','hokim','/panel'],
  ['tekshiruv_rahbar','rahbar','/bandlik'],
  ['tekshiruv_admin','admin','/admin'],
  ['mfy_baxshijar','yettilik','/xatlov'],
]) {
  const ctx=await b.newContext({viewport:{width:1100,height:1000}});
  const p=await ctx.newPage();
  await p.goto(B+'/kirish'); await p.fill('input[name="username"]',login); await p.fill('input[name="parol"]',P);
  await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
  await p.goto(B+yol); await p.waitForLoadState('networkidle'); await p.waitForTimeout(2500);
  const sec = p.locator('section').filter({ has: p.getByRole('heading',{name:/Таҳлил хулосаси/}) }).first();
  console.log(`\n=== ${nom} (${yol}) ===`);
  if (!await sec.count()) { console.log('  AI BLOKI: YO\'Q ✗'); await ctx.close(); continue; }
  const t = (await sec.textContent()).replace(/\s+/g,' ').trim();
  console.log(`  AI bloki: BOR · ${t.length} belgi`);
  console.log(`  manba: ${t.includes('жавоб бермади') ? 'QOIDA (AI ulanmagan — ogohlantirish KO\'RINADI)' : 'AI yoki qoida'}`);
  const tavsiya = await sec.locator('li, .tavsiya, [class*="tavsiya"]').count();
  console.log(`  matn: ${t.slice(0, 230)}`);
  await sec.screenshot({ path: `${SP}/ai-${nom}.png` }).catch(()=>{});
  await ctx.close();
}
await b.close();
