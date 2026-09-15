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

  const sarl = p.getByRole('heading', { name: /Таҳлил хулосаси/ }).first();
  console.log(`\n=== ${nom} (${yol}) ===`);
  if (!await sarl.count()) { console.log('  AI BLOKI: YO\'Q'); await ctx.close(); continue; }
  // Blok = sarlavhaning eng yaqin karta ajdodi
  const blok = sarl.locator('xpath=ancestor::*[contains(@class,"karta")][1]');
  const t = (await blok.textContent().catch(()=>'')).replace(/\s+/g,' ').trim();
  console.log(`  AI bloki: BOR · ${t.length} belgi`);
  const qoida = t.includes('жавоб бермади') || t.includes('Сунъий интеллект');
  console.log(`  holat: ${qoida ? 'QOIDA (AI ulanmagan) — OGOHLANTIRISH KO\'RINADI' : 'AI javob berdi'}`);
  console.log(`  mazmun: ${t.slice(0, 260)}`);
  await blok.screenshot({ path: `${SP}/ai-${nom}.png` }).catch(()=>{});
  await ctx.close();
}
await b.close();
