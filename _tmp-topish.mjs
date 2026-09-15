import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
const ctx=await b.newContext({viewport:{width:1280,height:1000}});
const p=await ctx.newPage();
await p.goto(B+'/kirish'); await p.fill('input[name="username"]','tekshiruv_hokim'); await p.fill('input[name="parol"]',P);
await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
await p.goto(B+'/panel'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1200);
await p.getByRole('button',{name:'Lot',exact:true}).first().click(); await p.waitForTimeout(2500);
const info = await p.evaluate(() => {
  const kir = /[Ѐ-ӿ]/; const out = [];
  const yur = (el) => { for (const n of el.childNodes) {
    if (n.nodeType===3 && kir.test(n.textContent)) {
      const t=n.textContent.replace(/\s+/g,' ').trim(); if(!t) continue;
      let el2=n.parentElement, zanjir=[];
      for(let i=0;i<5&&el2;i++){ zanjir.push(el2.tagName+(el2.className?'.'+String(el2.className).split(' ')[0]:'')); el2=el2.parentElement; }
      // eng yaqin sarlavha
      let sarl=''; let s=n.parentElement;
      while(s && !sarl){ const h=s.querySelector?.('h2,h3'); if(h) sarl=h.textContent.trim().slice(0,40); s=s.parentElement; }
      out.push({t, zanjir: zanjir.join(' < '), sarl});
    } else if (n.nodeType===1) yur(n);
  }};
  yur(document.querySelector('main')||document.body);
  return out;
});
for (const x of info) console.log(`"${x.t}"\n   bo'lim: ${x.sarl}\n   zanjir: ${x.zanjir}`);
await b.close();
