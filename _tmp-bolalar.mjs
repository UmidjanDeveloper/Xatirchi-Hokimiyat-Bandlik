import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
const ctx=await b.newContext({viewport:{width:1100,height:1200}});
const p=await ctx.newPage();
await p.goto(B+'/kirish'); await p.fill('input[name="username"]','mfy_baxshijar'); await p.fill('input[name="parol"]',P);
await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
await p.goto(B+'/xatlov/yangi'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800);
// 4 marta "Keyingi" bosib 5-qadamga o'tamiz - maydonlarni ko'rish uchun
for (let i=0;i<4;i++){
  for (const t of await p.getByRole('button',{name:'Йўқ',exact:true}).all()) { const j=await t.locator('xpath=preceding-sibling::button[1]').getAttribute('aria-pressed').catch(()=>null); if (await t.getAttribute('aria-pressed')!=='true' && j!=='true') await t.click().catch(()=>{}); }
  const e=p.getByRole('button',{name:'Эркак',exact:true}).first(); if (await e.count() && await e.getAttribute('aria-pressed')!=='true') await e.click().catch(()=>{});
  for (const s of await p.locator('select:visible').all()){ if (await s.inputValue()) continue; for (const o of await s.locator('option').all()){ const v=await o.getAttribute('value'); if (v){ await s.selectOption(v).catch(()=>{}); break; } } }
  for (const el of await p.locator('input:visible').all()){ const t=await el.getAttribute('type'); if(t==='checkbox'||t==='radio')continue; if(await el.inputValue().catch(()=>'x'))continue;
    const id=await el.getAttribute('id'); const y=id?await p.locator(`label[for="${id}"]`).first().textContent().catch(()=>''):'';
    let v='Sinov'; if(t==='date')v='1985-03-20'; else if(t==='tel')v='901234567';
    else if(t==='number'){ v='1';
      if(/умумий аъзолар/i.test(y))v='5'; else if(/болалар сони/i.test(y))v='2'; else if(/0—3|0-3/i.test(y))v='1'; else if(/3—17|3-17/i.test(y))v='1'; else if(/18 ёшдан катта/i.test(y))v='0';
      else if(/меҳнатга лаёқатли/i.test(y))v='3'; else if(/давлат корхона/i.test(y))v='1'; else if(/хусусий сектор/i.test(y))v='1'; else if(/ишлайдиган/i.test(y))v='2'; else if(/ишсиз/i.test(y))v='1';
      else if(/даромад|пул|маош|сўм/i.test(y))v='4000000'; }
    await el.fill(v).catch(()=>{}); }
  for (const el of await p.locator('textarea:visible').all()){ if(!(await el.inputValue())) await el.fill('Sinov').catch(()=>{}); }
  await p.getByRole('button',{name:/^Кейинги/}).first().click(); await p.waitForTimeout(600);
}
console.log('5-QADAM:', (await p.locator('h2').first().textContent()).replace(/\s+/g,' ').trim());
for (const el of await p.locator('input:visible').all()) {
  const t = await el.getAttribute('type'); if (t!=='number') continue;
  const id = await el.getAttribute('id');
  const y = id ? await p.locator(`label[for="${id}"]`).first().textContent().catch(()=>'') : '';
  console.log(`  [${await el.inputValue()}] ${y.replace(/\s+/g,' ').trim().slice(0,64)}`);
}
await b.close();
