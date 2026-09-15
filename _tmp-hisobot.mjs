import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', SP=process.env.SP, P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH, acceptDownloads:true});
for (const [login, nom, yol] of [
  ['tekshiruv_hokim','hokim','/panel'],
  ['tekshiruv_rahbar','rahbar','/bandlik'],
  ['mfy_baxshijar','yettilik','/xatlov'],
  ['tekshiruv_admin','admin','/admin'],
]) {
  const ctx=await b.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});
  const p=await ctx.newPage();
  const xato=[];
  p.on('pageerror', e=>xato.push(e.message.slice(0,80)));
  await p.goto(B+'/kirish'); await p.fill('input[name="username"]',login); await p.fill('input[name="parol"]',P);
  await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
  await p.goto(B+yol); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500);
  console.log(`\n=== ${nom} (${yol}) ===`);
  for (const [nomi, uzatma] of [['pdf',/PDF/],['xlsx',/Excel/]]) {
    const t = p.getByRole('button',{name:uzatma}).first();
    if (!await t.count()) { console.log(`  ${nomi}: tugma YO'Q`); continue; }
    const boshi = Date.now();
    try {
      const [dl] = await Promise.all([ p.waitForEvent('download',{timeout:120000}), t.click() ]);
      const yolFayl = `${SP}/h-${nom}.${nomi}`;
      await dl.saveAs(yolFayl);
      console.log(`  ${nomi}: OK  ${((Date.now()-boshi)/1000).toFixed(1)}s  ${dl.suggestedFilename()}`);
    } catch (e) {
      console.log(`  ${nomi}: XATO ${e.message.slice(0,70)}`);
    }
    await p.waitForTimeout(1200);
  }
  if (xato.length) console.log('  JS xato:', xato.slice(0,2).join(' | '));
  await ctx.close();
}
await b.close();
