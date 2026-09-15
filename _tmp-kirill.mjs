import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
for (const [login, yol] of [['tekshiruv_hokim','/panel'],['tekshiruv_rahbar','/bandlik'],['tekshiruv_admin','/admin'],['mfy_baxshijar','/xatlov']]) {
  const ctx=await b.newContext({viewport:{width:1280,height:1000}});
  const p=await ctx.newPage();
  await p.goto(B+'/kirish'); await p.fill('input[name="username"]',login); await p.fill('input[name="parol"]',P);
  await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
  await p.goto(B+yol); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1200);
  await p.getByRole('button',{name:'Lot',exact:true}).first().click();
  await p.waitForTimeout(2500);
  // Kirill bo'lgan ENG KICHIK elementlarni topamiz
  const parchalar = await p.evaluate(() => {
    const kir = /[Ѐ-ӿ]/;
    const natija = [];
    const yur = (el) => {
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && kir.test(n.textContent)) {
          const t = n.textContent.replace(/\s+/g,' ').trim();
          if (t) natija.push({ matn: t.slice(0,60), teg: n.parentElement?.tagName, sinf: (n.parentElement?.className||'').toString().slice(0,30) });
        } else if (n.nodeType === 1) yur(n);
      }
    };
    yur(document.querySelector('main') || document.body);
    return natija;
  });
  console.log(`\n=== ${yol} — ${parchalar.length} ta kirill matn ===`);
  for (const x of parchalar.slice(0,8)) console.log(`  <${x.teg}> "${x.matn}"`);
  await ctx.close();
}
await b.close();
