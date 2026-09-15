import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});

const ROLLAR = {
  hokim:    { login:'tekshiruv_hokim',  yollar:['/panel','/ishsizlar','/chora-tadbirlar','/ish-orinlari','/xonadonlar','/xatlov','/mahalla-xodimlari','/bandlik','/admin'] },
  rahbar:   { login:'tekshiruv_rahbar', yollar:['/bandlik','/panel','/ishsizlar','/chora-tadbirlar','/ish-orinlari','/xonadonlar','/mahalla-xodimlari','/admin'] },
  admin:    { login:'tekshiruv_admin',  yollar:['/admin','/panel','/bandlik','/ishsizlar','/chora-tadbirlar','/ish-orinlari','/xonadonlar','/mahalla-xodimlari'] },
  yettilik: { login:'mfy_baxshijar',    yollar:['/xatlov','/xatlov/yangi','/xonadonlar','/panel','/bandlik','/admin','/ishsizlar','/mahalla-xodimlari'] },
};

let jamiXato = 0;
for (const [rol, {login, yollar}] of Object.entries(ROLLAR)) {
  const ctx = await b.newContext({viewport:{width:1280,height:900}});
  const p = await ctx.newPage();
  const xatolar = [];
  p.on('pageerror', e => xatolar.push(`JS: ${e.message.slice(0,90)}`));
  p.on('console', m => { if (m.type()==='error' && !m.text().includes('favicon')) xatolar.push(`KONSOL: ${m.text().slice(0,90)}`); });

  await p.goto(B+'/kirish'); await p.fill('input[name="username"]',login); await p.fill('input[name="parol"]',P);
  await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
  const kirdi = !p.url().includes('/kirish');
  console.log(`\n=== ${rol.toUpperCase()} (${login}) — kirish: ${kirdi ? 'OK' : 'XATO'} ===`);
  if (!kirdi) { jamiXato++; await ctx.close(); continue; }

  for (const yol of yollar) {
    xatolar.length = 0;
    const r = await p.goto(B+yol, { waitUntil:'networkidle' }).catch(()=>null);
    await p.waitForTimeout(700);
    const holat = r?.status() ?? 0;
    const oxirgi = p.url().replace(B,'') || '/';
    const yonaltirildi = !oxirgi.startsWith(yol);
    const h1 = await p.locator('h1').first().textContent().catch(()=>'—');
    const belgi = holat === 200 && xatolar.length === 0 ? 'OK  ' : 'XATO';
    if (belgi === 'XATO') jamiXato++;
    console.log(`  ${belgi} ${yol.padEnd(20)} ${holat} ${yonaltirildi ? '→ '+oxirgi : ''} · ${(h1||'').trim().slice(0,32)}`);
    for (const x of xatolar.slice(0,2)) console.log(`       ${x}`);
  }
  await ctx.close();
}
console.log(`\n${jamiXato === 0 ? 'HAMMASI TOZA' : jamiXato + ' TA XATO'}`);
await b.close();
