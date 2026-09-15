import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', SP=process.env.SP, P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
const SAHIFA = [['tekshiruv_hokim','/panel'],['tekshiruv_rahbar','/bandlik'],['tekshiruv_admin','/admin'],['mfy_baxshijar','/xatlov'],['mfy_baxshijar','/xatlov/yangi']];
let muammo = 0;
for (const [login, yol] of SAHIFA) {
  for (const [w, h, olcham] of [[1440,900,'desktop'],[768,1024,'planshet'],[390,844,'telefon']]) {
    const ctx=await b.newContext({viewport:{width:w,height:h}});
    const p=await ctx.newPage();
    await p.goto(B+'/kirish'); await p.fill('input[name="username"]',login); await p.fill('input[name="parol"]',P);
    await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
    await p.goto(B+yol); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500);

    // Gorizontal toshish
    const tosh = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    // Lotinga o'tkazish
    const lot = p.getByRole('button',{name:'Lot',exact:true}).first();
    let kirillQoldi = -1;
    if (await lot.count()) {
      await lot.click(); await p.waitForTimeout(2200);
      const matn = await p.locator('main').textContent().catch(()=>'');
      kirillQoldi = (matn.match(/[Ѐ-ӿ]/g) || []).length;
    }
    const belgi = (!tosh && kirillQoldi === 0) ? 'OK  ' : 'MUAMMO';
    if (belgi === 'MUAMMO') muammo++;
    console.log(`${belgi} ${yol.padEnd(14)} ${olcham.padEnd(9)} ${w}px · toshish:${tosh?'BOR':'yoq'} · lotinda kirill qoldi:${kirillQoldi}`);
    if (olcham === 'telefon' && belgi === 'OK  ') await p.screenshot({ path: `${SP}/mobil-${yol.replace(/\//g,'_')}.png` });
    await ctx.close();
  }
}
console.log(`\n${muammo === 0 ? 'HAMMASI TOZA' : muammo + ' ta muammo'}`);
await b.close();
