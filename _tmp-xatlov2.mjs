import { chromium } from 'playwright-core';
const B='http://127.0.0.1:3100', CH='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', SP=process.env.SP, P=process.env.SINOV_PAROL;
const b=await chromium.launch({executablePath:CH});
const ctx=await b.newContext({viewport:{width:1100,height:1400}});
const p=await ctx.newPage();
const jsXato=[];
p.on('pageerror', e=>jsXato.push(e.message.slice(0,110)));

await p.goto(B+'/kirish'); await p.fill('input[name="username"]','mfy_baxshijar'); await p.fill('input[name="parol"]',P);
await p.click('button[type="submit"]'); await p.waitForLoadState('networkidle');
await p.goto(B+'/xatlov/yangi'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1000);

/* Haqiqiy o'zbek ismlari - validator tasodifiy harflarni rad etadi */
const FAM = ['Rustamov','Qodirov','Sharipov','Toshmatov','Ergashev','Xolmatov'];
const ISM = ['Bekzod','Sardor','Jasur','Akmal','Otabek','Ulugbek'];
const OTA = ['Rustamovich','Qodirovich','Sharipovich','Toshmatovich'];
const tanla = (a) => a[Math.floor(Math.random()*a.length)];
const OILA = `${tanla(FAM)} ${tanla(ISM)} ${tanla(OTA)}`;

/* Yorliqqa qarab AQLLI qiymat tanlaydi — anketa arifmetikasi buzilmasin */
function qiymatTanla(yorliq, tur) {
  const y = (yorliq || '').replace(/\s+/g, ' ');
  if (tur === 'date') return '1985-03-20';
  if (tur === 'tel') return '903472815';
  if (tur !== 'number') {
    if (/Ф\.И\.Ш|бошлиғ/i.test(y)) return OILA;
    if (/манзил/i.test(y)) return `Sinov koʻchasi, ${Date.now().toString().slice(-4)}-uy`;
    if (/Ф\.И\.Ш|исм|фамилия/i.test(y)) return `${tanla(FAM)} ${tanla(ISM)} ${tanla(OTA)}`;
    return 'Sinov';
  }
  /* ── Raqamlar: yig'indi shartlari buzilmasin ── */
  if (/умумий аъзолар/i.test(y)) return '5';
  /* Aniqroq qoidalar UMUMIY «болалар сони» dan OLDIN — aks holda u yutib yuboradi */
  if (/мактабгача ёшдаги/i.test(y)) return '1';
  if (/боғчага қатнайдиган/i.test(y)) return '1';
  if (/мактаб ёшидаги/i.test(y)) return '1';
  if (/мактабга қатнайдиган/i.test(y)) return '1';
  if (/тўгарак|спорт секция/i.test(y)) return '1';
  if (/^Шу жумладан, болалар сони|болалар сони/i.test(y)) return '2';
  if (/0—3 ёшда|0-3/i.test(y)) return '1';
  if (/3—17 ёшда|3-17/i.test(y)) return '1';
  if (/18 ёшдан катта/i.test(y)) return '0';
  if (/меҳнатга лаёқатли/i.test(y)) return '3';
  if (/давлат корхона/i.test(y)) return '1';
  if (/хусусий сектор/i.test(y)) return '1';
  if (/ишлайдиган/i.test(y)) return '2';
  if (/ишсиз/i.test(y)) return '1';
  if (/боғча кутаётган/i.test(y)) return '0';
  if (/қамров/i.test(y)) return '1';
  if (/даромад|пул|маош|сумма|сўм/i.test(y)) return '4000000';
  return '1';
}

async function toldir() {
  for (const t of await p.getByRole('button', { name: 'Йўқ', exact: true }).all()) {
    const juft = await t.locator('xpath=preceding-sibling::button[1]').getAttribute('aria-pressed').catch(()=>null);
    if (await t.getAttribute('aria-pressed') !== 'true' && juft !== 'true') await t.click().catch(()=>{});
  }
  const erkak = p.getByRole('button', { name: 'Эркак', exact: true }).first();
  if (await erkak.count() && await erkak.getAttribute('aria-pressed') !== 'true') await erkak.click().catch(()=>{});

  /*
   * Тугмали танловлар (select эмас): гуруҳда биронтаси
   * босилмаган бўлса, биринчисини босамиз.
   */
  for (const guruh of await p.locator('div:has(> button[aria-pressed])').all()) {
    const tugmalar = await guruh.locator('> button[aria-pressed]').all();
    if (tugmalar.length < 2) continue;
    let bormi = false;
    for (const t of tugmalar) if (await t.getAttribute('aria-pressed') === 'true') { bormi = true; break; }
    if (!bormi) await tugmalar[0].click().catch(()=>{});
  }

  for (const s of await p.locator('select:visible').all()) {
    if (await s.inputValue()) continue;
    for (const o of await s.locator('option').all()) {
      const v = await o.getAttribute('value');
      if (v) { await s.selectOption(v).catch(()=>{}); break; }
    }
  }
  for (const el of await p.locator('input:visible').all()) {
    const tur = await el.getAttribute('type');
    if (tur === 'checkbox' || tur === 'radio') continue;
    if (await el.inputValue().catch(()=>'x')) continue;
    const id = await el.getAttribute('id');
    const yorliq = id ? await p.locator(`label[for="${id}"]`).first().textContent().catch(()=>null) : null;
    await el.fill(qiymatTanla(yorliq, tur)).catch(()=>{});
  }
  for (const el of await p.locator('textarea:visible').all()) {
    if (!(await el.inputValue())) await el.fill('Sinov izohi').catch(()=>{});
  }
}

console.log('=== ANKETA ===');
let oxirgi = false;
for (let i = 0; i < 15; i++) {
  const sarl = (await p.locator('h2').first().textContent().catch(()=>'')).replace(/\s+/g,' ').trim();

  /* Ishsizlar qadami: avval qator qo'shamiz, keyin to'ldiramiz */
  if (/ишсиз фуқаро/i.test(sarl)) {
    const qosh = p.getByRole('button', { name: /қўшиш/i }).first();
    if (await qosh.count()) {
      await qosh.click();
      await p.waitForTimeout(500);
      console.log('     + ishsiz fuqaro qatori qo\'shildi');
    }
  }
  await toldir();
  const keyingi = p.getByRole('button', { name: /^Кейинги/ }).first();
  const yubor = p.getByRole('button', { name: /юбориш|якунлаш|тасдиқлаш/i }).first();

  if (!(await keyingi.count()) && (await yubor.count())) {
    console.log(`  ${i+1}. ${sarl.slice(0,36).padEnd(36)} ← OXIRGI`);
    oxirgi = true; break;
  }
  if (!(await keyingi.count())) {
    const hamma = (await p.getByRole('button').allTextContents()).map(t=>t.replace(/\s+/g,' ').trim()).filter(Boolean);
    console.log(`  ${i+1}. ${sarl.slice(0,36)} — tugmalar: ${hamma.slice(-14).join(' | ')}`);
    await p.screenshot({ path: `${process.env.SP}/xatlov-tiqilgan.png`, fullPage: true });
    break;
  }

  await keyingi.click(); await p.waitForTimeout(650);
  const x = (await p.locator('[role="alert"], .quti-xato').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
  if (x.length) {
    await toldir(); await keyingi.click(); await p.waitForTimeout(650);
    const y = (await p.locator('[role="alert"], .quti-xato').allTextContents()).filter(Boolean);
    if (y.length) { console.log(`  ${i+1}. ${sarl.slice(0,36).padEnd(36)} XATO: ${x[0].slice(0,80)}`); break; }
  }
  console.log(`  ${i+1}. ${sarl.slice(0,36).padEnd(36)} OK`);
}
await p.screenshot({ path: `${SP}/xatlov-oxir.png`, fullPage: true });

if (oxirgi) {
  console.log('\n=== YAKUNIY YUBORISH ===');
  // Rozilik belgisi
  for (const cb of await p.locator('input[type="checkbox"]:visible').all()) {
    if (!(await cb.isChecked())) await cb.check().catch(()=>{});
  }
  console.log('  oxirgi qadam sarlavhalari:', (await p.locator('h2,h3').allTextContents()).map(t=>t.replace(/\s+/g,' ').trim()).filter(Boolean).slice(-6).join(' | '));
  console.log('  checkbox soni:', await p.locator('input[type="checkbox"]').count());
  console.log('  canvas soni:', await p.locator('canvas').count());
  /* Imzo maydoni — SVG (canvas emas) */
  const imzo = p.locator('svg[style*="touch-action"]').first();
  if (await imzo.count()) {
    await imzo.scrollIntoViewIfNeeded();
    const q = await imzo.boundingBox();
    if (q) {
      await p.mouse.move(q.x + 25, q.y + q.height/2);
      await p.mouse.down();
      for (let i = 1; i <= 25; i++) {
        await p.mouse.move(q.x + 25 + i*(q.width-50)/25, q.y + q.height/2 + Math.sin(i/2)*22);
      }
      await p.mouse.up();
      console.log('  imzo chizildi (SVG)');
    }
  } else console.log('  imzo maydoni topilmadi');
  await p.waitForTimeout(400);

  const yuborT = p.getByRole('button', { name: /юбориш|якунлаш/i }).first();
  await yuborT.click();
  await p.waitForTimeout(3500);
  const url = p.url().replace(B,'');
  const xat = (await p.locator('[role="alert"], .quti-xato').allTextContents()).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
  console.log('  url:', url);
  console.log('  xato:', xat.length ? xat[0].slice(0,120) : "yo'q");
  console.log('  SAQLANDI:', url.startsWith('/xatlov/') && !url.includes('yangi') ? 'HA' : "YO'Q");
  if (xat.length) {
    /* Xato bo'lsa — forma O'SHA qadamga qaytdimi va maydon belgilandimi */
    const joriySarl = (await p.locator('h2').first().textContent().catch(()=>'')).replace(/\s+/g,' ').trim();
    console.log('  xatodan keyin qadam:', joriySarl.slice(0,40));
    const belgilangan = await p.locator('.border-danger, [aria-invalid="true"], .text-danger').count();
    console.log('  belgilangan maydon:', belgilangan);
    const korinadi = await p.locator('[role="alert"]').first().isVisible().catch(()=>false);
    console.log('  xato ekranda ko\'rinadimi:', korinadi);
  }
  await p.screenshot({ path: `${SP}/xatlov-natija.png`, fullPage: true });
}

console.log('\noxirgi qadamga yetdi:', oxirgi);
console.log('JS xatolar:', jsXato.length ? jsXato.slice(0,2).join(' | ') : "yo'q");
console.log('OILA=' + OILA);
await b.close();
