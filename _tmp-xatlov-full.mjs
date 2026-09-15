import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', SP=process.env.SP, P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
const ctx=await b.newContext({viewport:{width:1100,height:1200}});
const p=await ctx.newPage();
const jsXato=[];
p.on('pageerror', e=>jsXato.push(e.message.slice(0,100)));

await p.goto(B+'/kirish'); await p.fill('input[name="username"]','mfy_baxshijar'); await p.fill('input[name="parol"]',P);
await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
await p.goto(B+'/xatlov/yangi'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1000);

const NOM = 'Sinov Prezentatsiya ' + Date.now().toString().slice(-6);

/** Joriy qadamdagi hamma bo'sh maydonni to'ldiradi */
async function qadamniToldir(n) {
  // Ha/Yo'q juftliklari: "Йўқ" ni bosamiz (sodda yo'l)
  const yoq = await p.getByRole('button', { name: 'Йўқ', exact: true }).all();
  for (const t of yoq) {
    const bosilgan = await t.getAttribute('aria-pressed');
    const juft = await t.locator('xpath=../button[1]').getAttribute('aria-pressed').catch(()=>null);
    if (bosilgan !== 'true' && juft !== 'true') await t.click().catch(()=>{});
  }
  // Jins
  const erkak = p.getByRole('button', { name: 'Эркак', exact: true }).first();
  if (await erkak.count() && await erkak.getAttribute('aria-pressed') !== 'true') await erkak.click().catch(()=>{});

  // select
  for (const s of await p.locator('select:visible').all()) {
    const q = await s.inputValue();
    if (q) continue;
    const opts = await s.locator('option').all();
    for (const o of opts) {
      const v = await o.getAttribute('value');
      if (v) { await s.selectOption(v).catch(()=>{}); break; }
    }
  }
  // input
  for (const el of await p.locator('input:visible').all()) {
    const tur = await el.getAttribute('type');
    if (tur === 'checkbox' || tur === 'radio') continue;
    const q = await el.inputValue().catch(()=>'x');
    if (q) continue;
    if (tur === 'number') await el.fill('2').catch(()=>{});
    else if (tur === 'date') await el.fill('1990-05-15').catch(()=>{});
    else if (tur === 'tel') await el.fill('901234567').catch(()=>{});
    else await el.fill(n === 0 ? NOM : 'Sinov matn').catch(()=>{});
  }
  for (const el of await p.locator('textarea:visible').all()) {
    if (!(await el.inputValue())) await el.fill('Sinov izohi').catch(()=>{});
  }
}

console.log('=== ANKETA QADAMLARI ===');
let qadam = 0;
for (; qadam < 15; qadam++) {
  const sarlavha = (await p.locator('h2, h1').first().textContent().catch(()=>'')).replace(/\s+/g,' ').trim();
  await qadamniToldir(qadam);

  const keyingi = p.getByRole('button', { name: /^Кейинги/ }).first();
  const yubor = p.getByRole('button', { name: /Юбориш|Якунлаш|Тасдиқлаш/ }).first();

  if (await keyingi.count()) {
    await keyingi.click();
    await p.waitForTimeout(700);
    // Xato chiqdimi
    const xatolar = await p.locator('[role="alert"], .quti-xato').allTextContents();
    const haqiqiy = xatolar.map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
    if (haqiqiy.length) {
      console.log(`  ${qadam+1}. ${sarlavha.slice(0,34).padEnd(34)} XATO: ${haqiqiy[0].slice(0,70)}`);
      // Qayta to'ldirib urinamiz
      await qadamniToldir(qadam);
      await keyingi.click(); await p.waitForTimeout(700);
      const yana = (await p.locator('[role="alert"], .quti-xato').allTextContents()).filter(Boolean);
      if (yana.length) { console.log(`     TUZALMADI — to'xtadim`); break; }
    }
    console.log(`  ${qadam+1}. ${sarlavha.slice(0,34).padEnd(34)} → keyingi`);
  } else if (await yubor.count()) {
    console.log(`  ${qadam+1}. ${sarlavha.slice(0,34).padEnd(34)} → OXIRGI QADAM`);
    break;
  } else {
    console.log(`  ${qadam+1}. ${sarlavha.slice(0,34)} — tugma topilmadi`);
    break;
  }
}
await p.screenshot({ path: `${SP}/xatlov-oxirgi.png`, fullPage: true });
console.log('\nJS xatolar:', jsXato.length ? jsXato.slice(0,3).join(' | ') : 'yo\'q');
console.log('NOM=' + NOM);
await b.close();
