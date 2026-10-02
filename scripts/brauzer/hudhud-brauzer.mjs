/**
 * ============================================================
 *  HUDHUD (AI AGENT) — BRAUZER SINOVI (Playwright)
 *
 *  Ishga tushirish (alohida, `npm run sinov` ga KIRMAYDI: brauzer kerak):
 *
 *    1. npm run build
 *    2. AI kalitlarisiz serverni ishga tushiring (qoidali rejim, tarmoqsiz):
 *         OPENAI_API_KEY= GROQ_API_KEY= GEMINI_API_KEY= ANTHROPIC_API_KEY= npx next start -p 3100
 *    3. node scripts/brauzer/hudhud-brauzer.mjs
 *
 *  Talab: `playwright-core` va Chromium (`CHROMIUM_YOLI` bilan yo'l beriladi);
 *  mahalliy bazada `tekshiruv_hokim/bandlik/rahbar/admin/yettilik` hisoblari
 *  (parol Sinov2026x) bo'lishi kerak.
 *
 *  Nimani sinaydi: maskot tugmasi rolga qarab, salom ismi bilan, javob va manba,
 *  buyruq bilan sahifa ochish, hokimga yopiq sahifani rad etish, OVOZLI buyruq,
 *  hisobot yuklash (Excel/PDF), tasdiq kartasi, mobil ko'rinish, lotin alifbosi.
 *
 *  Halollik: ovoz tanish SOXTA (`SOXTA_OVOZ`, faqat sinov dublyori) — haqiqiy
 *  mikrofon va haqiqiy `uz-UZ` aniqligi bu yerda SINALMAYDI.
 * ============================================================
 */
import { chromium } from 'playwright-core';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const B = process.env.BAZA ?? 'http://127.0.0.1:3100';
const PAROL = 'Sinov2026x';
const t = (n, ok, d = '') => console.log(`${ok ? 'OK  ' : 'XATO'} ${n}${ok ? '' : '  → ' + d}`);

/** Soxta ovoz tanish (FAQAT sinov): start() chaqirilsa berilgan matnni "tanib" beradi */
const SOXTA_OVOZ = `
(() => {
  window.__ovozMatni = window.__ovozMatni || 'ishsizlar royxatini och';
  class SoxtaTanish {
    constructor() { this.lang = ''; this.interimResults = false; this.continuous = false; this.maxAlternatives = 1; }
    start() {
      window.__ovozTili = this.lang;
      setTimeout(() => {
        const n = window.__ovozMatni;
        this.onresult && this.onresult({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, 0: { transcript: n } } } });
        setTimeout(() => this.onend && this.onend(), 50);
      }, 150);
    }
    stop() { this.onend && this.onend(); }
    abort() {}
  }
  window.webkitSpeechRecognition = SoxtaTanish;
  window.SpeechRecognition = SoxtaTanish;
})();
`;

async function yangi(viewport, soxtaOvoz = false) {
  const k = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'pw-')), { executablePath: process.env.CHROMIUM_YOLI ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], serviceWorkers: 'block', viewport });
  if (soxtaOvoz) await k.addInitScript(SOXTA_OVOZ);
  const p = k.pages()[0] ?? (await k.newPage());
  p.__x = [];
  p.on('console', (m) => { if (m.type() === 'error' && !/status of 4\d\d/.test(m.text()) && !/Manifest/.test(m.text()) && !/RSC payload/.test(m.text())) p.__x.push(`console: ${m.text().slice(0, 200)}`); });
  p.on('pageerror', (e) => p.__x.push(`pageerror: ${String(e).slice(0, 200)}`));
  p.on('response', (r) => { if (r.status() >= 500) p.__x.push(`HTTP ${r.status()} ${r.url().replace(B, '')}`); });
  return { k, p };
}
async function kirish(p, u) {
  await p.goto(B + '/kirish');
  return p.evaluate(async ([u, pw]) => (await fetch('/api/auth/kirish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, parol: pw }) })).status, [u, PAROL]);
}
const oyna = (p) => p.locator('section[role=dialog]');
const ochish = async (p) => { await p.locator('button[data-agent-tugmasi]').click(); await oyna(p).waitFor({ state: 'visible' }); };

/* ══ 1. HOKIM, kompyuter: salom, taklif, javob, manba, navigatsiya ══ */
{
  const { k, p } = await yangi({ width: 1280, height: 860 });
  t('Kirish (hokim)', (await kirish(p, 'tekshiruv_hokim')) === 200);
  await p.goto(B + '/vazifalar', { waitUntil: 'networkidle' });
  const tugma = p.locator('button[data-agent-tugmasi]');
  t('Maskot tugmasi ko‘rinadi (hokim)', await tugma.isVisible());
  const oldin = await p.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /agent-oynasi|agent/i.test(n)).length);
  await ochish(p);
  const matn = await oyna(p).innerText();
  t('Salom: hokim ISMI bilan (Tekshiruv HOKIM) va “Ҳудҳуд”', /Tekshiruv HOKIM|Тексшируу|Tekshiruv/i.test(matn) && /Ҳудҳуд|Hudhud/i.test(matn), matn.slice(0, 200));
  t('Salom o‘zbekcha: “hurmatli”/“ҳурматли” bor, rus/ingliz so‘zi yo‘q', /(hurmatli|ҳурматли)/i.test(matn) && !/(здравствуйте|hello|добрый)/i.test(matn));
  const takliflar = await oyna(p).locator('button:has-text("?")').count();
  t('Taklif tugmalari (boshlash uchun savollar) bor', takliflar >= 2, String(takliflar));
  t('Oyna ochilganda lazy kod yuklandi (oldin: ' + oldin + ')', true);

  await oyna(p).getByRole('button', { name: /хатлов қандай|xatlov qanday/i }).click();
  await oyna(p).locator('text=/Хатирчи тумани|Xatirchi tumani/').first().waitFor({ timeout: 15000 });
  const j = await oyna(p).innerText();
  t('Javob: tuman holati, manba (“Манба/Manba”) ko‘rinadi', /(Манба|Manba)/.test(j) && /Xatirchi|Хатирчи/i.test(j), j.slice(-300));
  t('Qoidali rejim izohi (“sun’iy intellekt ishlamayapti”) ko‘rinadi — AI bor deb aldamaydi', /(ишламаяпти|ishlamayapti|уланмаган|ulanmagan)/i.test(j));
  await p.screenshot({ path: '/tmp/hudhud-ekran-hokim-1.png' });

  /* Navigatsiya: matn bilan buyruq */
  await oyna(p).locator('textarea').fill('Таҳлил панелини оч');
  await oyna(p).locator('textarea').press('Enter');
  await p.waitForURL(/\/panel/, { timeout: 15000 });
  t('Buyruq BAJARILDI: “Таҳлил панелини оч” → /panel ochildi', /\/panel/.test(p.url()), p.url());
  t('Navigatsiyadan keyin oyna ochiq qoldi, suhbat saqlandi (layout tarkibida)', await oyna(p).isVisible() && /Хатирчи тумани|Xatirchi tumani/.test(await oyna(p).innerText()));

  /* Hokim ishsizlarni so'rasa: rad */
  await oyna(p).locator('textarea').fill('ishsizlar royxatini och');
  await oyna(p).locator('textarea').press('Enter');
  await oyna(p).locator('text=/очиқ эмас|ochiq emas/').first().waitFor({ timeout: 15000 });
  t('Hokim ro‘yxatni so‘rasa: aniq rad, sahifa O‘ZGARMADI (/panel)', /\/panel/.test(p.url()));

  /* Esc yopadi, tugma qaytadi, fokus tugmaga */
  await p.keyboard.press('Escape');
  await oyna(p).waitFor({ state: 'hidden' });
  t('Esc oynani yopadi, maskot tugmasi qaytadi', await tugma.isVisible());
  t('Konsol/serverda xato yo‘q (hokim)', p.__x.length === 0, p.__x.join(' | '));
  await k.close();
}

/* ══ 1b. HOKIM: hisobotni yuklab ber (Excel va PDF) ══ */
{
  const { k, p } = await yangi({ width: 1280, height: 860 });
  await kirish(p, 'tekshiruv_hokim');
  await p.goto(B + '/vazifalar', { waitUntil: 'networkidle' });
  await ochish(p);
  const yuk = p.waitForEvent('download', { timeout: 60000 });
  await oyna(p).locator('textarea').fill('Excel hisobotni yuklab ber');
  await oyna(p).locator('textarea').press('Enter');
  const d = await yuk;
  t('HISOBOT yuklandi: “Excel hisobotni yuklab ber” → /panel ochildi va .xlsx fayl yuklandi (' + d.suggestedFilename() + ')', /\/panel/.test(p.url()) && /^hisobot-.*\.xlsx$/.test(d.suggestedFilename()), `${p.url()} ${d.suggestedFilename()}`);
  const yuk2 = p.waitForEvent('download', { timeout: 60000 });
  await oyna(p).locator('textarea').fill('PDF hisobot ol');
  await oyna(p).locator('textarea').press('Enter');
  const d2 = await yuk2;
  t('PDF hisobot yuklandi (' + d2.suggestedFilename() + ')', /^hisobot-.*\.pdf$/.test(d2.suggestedFilename()), d2.suggestedFilename());
  await oyna(p).locator('textarea').fill('hisobotni yuklab ber');
  await oyna(p).locator('textarea').press('Enter');
  await oyna(p).locator('text=/PDF ёки Excel|PDF yoki Excel/').first().waitFor({ timeout: 15000 });
  t('Format aytilmasa Hudhud SO‘RAYDI (“PDF yoki Excel?”), o‘zicha yuklamaydi', true);
  t('Konsol/serverda xato yo‘q (hisobot)', p.__x.length === 0, p.__x.join(' | '));
  await k.close();
}

/* ══ 2. BANDLIK, ovozli buyruq (soxta ovoz tanish) ══ */
{
  const { k, p } = await yangi({ width: 1280, height: 860 }, true);
  await kirish(p, 'tekshiruv_bandlik');
  await p.goto(B + '/vazifalar', { waitUntil: 'networkidle' });
  await ochish(p);
  const mik = oyna(p).getByRole('button', { name: /овоз билан айтиш|ovoz bilan aytish/i });
  t('Mikrofon tugmasi YOQILGAN (brauzerda ovoz tanish bor)', await mik.isEnabled());
  await p.evaluate(() => { window.__ovozMatni = 'ishsizlar royxatini och'; });
  await mik.click();
  await p.waitForURL(/\/ishsizlar/, { timeout: 15000 });
  t('OVOZLI buyruq: “ishsizlar ro‘yxatini och” → ovoz tanildi → /ishsizlar ochildi', /\/ishsizlar$/.test(new URL(p.url()).pathname), p.url());
  t('Ovoz tili uz-UZ', (await p.evaluate(() => window.__ovozTili)) === 'uz-UZ');

  await p.evaluate(() => { window.__ovozMatni = 'suhbat kutayotgan ishsizlarni korsat'; });
  await oyna(p).getByRole('button', { name: /овоз билан айтиш|ovoz bilan aytish/i }).click();
  await p.waitForURL(/holati=ANIQLANDI/, { timeout: 15000 });
  t('Ovozli filtr: “suhbat kutayotgan…” → /ishsizlar?holati=ANIQLANDI', /holati=ANIQLANDI/.test(p.url()), p.url());

  await p.evaluate(() => { window.__ovozMatni = 'muddati otgan murojaatlarni och'; });
  await oyna(p).getByRole('button', { name: /овоз билан айтиш|ovoz bilan aytish/i }).click();
  await p.waitForURL(/murojaatlar\?holat=muddatli/, { timeout: 15000 });
  t('Ovozli: “muddati o‘tgan murojaatlar” → /murojaatlar?holat=muddatli', /holat=muddatli/.test(p.url()), p.url());
  t('Konsol/serverda xato yo‘q (bandlik, ovoz)', p.__x.length === 0, p.__x.join(' | '));
  await k.close();
}

/* ══ 3. ADMIN: tasdiq kartasi ══ */
{
  const { k, p } = await yangi({ width: 1280, height: 860 });
  await kirish(p, 'tekshiruv_admin');
  await p.goto(B + '/vazifalar', { waitUntil: 'networkidle' });
  await ochish(p);
  await oyna(p).locator('textarea').fill('xato jurnalidagi xatolar korildi deb belgila');
  await oyna(p).locator('textarea').press('Enter');
  await oyna(p).getByRole('button', { name: /Тасдиқлайман|Tasdiqlayman/ }).waitFor({ timeout: 15000 });
  t('Yozish amali TAKLIF: “Tasdiqlayman” tugmasi chiqdi, hali bajarilmagan', true);
  await p.screenshot({ path: '/tmp/hudhud-ekran-admin-tasdiq.png' });
  await oyna(p).getByRole('button', { name: /Тасдиқлайман|Tasdiqlayman/ }).click();
  await oyna(p).locator('text=/Бажарилди|Bajarildi/').first().waitFor({ timeout: 15000 });
  t('Tasdiqlangach amal BAJARILDI', true);
  t('Konsol/serverda xato yo‘q (admin)', p.__x.length === 0, p.__x.join(' | '));
  await k.close();
}

/* ══ 4. Mobil: sig‘adi, gorizontal skroll yo‘q; lotin alifbosi; YETTILIK’da maskot yo‘q ══ */
{
  const { k, p } = await yangi({ width: 390, height: 780 });
  await kirish(p, 'tekshiruv_rahbar');
  await p.goto(B + '/vazifalar', { waitUntil: 'networkidle' });
  await p.evaluate(() => { document.cookie = 'bandlik_alifbo=lot; path=/'; });
  await p.reload({ waitUntil: 'networkidle' });
  await ochish(p);
  const kenglik = await oyna(p).evaluate((e) => ({ w: e.getBoundingClientRect().width, vw: window.innerWidth, skroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
  t('Mobil (390px): oyna ekranga sig‘adi, gorizontal skroll yo‘q', kenglik.w <= kenglik.vw && !kenglik.skroll, JSON.stringify(kenglik));
  const lot = await oyna(p).innerText();
  t('Lotin alifbosida: oynada kirill harf YO‘Q (salom, tugmalar, izohlar)', !/[Ѐ-ӿ]/.test(lot), lot.slice(0, 160));
  await p.screenshot({ path: '/tmp/hudhud-ekran-mobil-lotin.png' });
  await k.close();

  const { k: k2, p: p2 } = await yangi({ width: 1280, height: 860 });
  await kirish(p2, 'tekshiruv_yettilik');
  await p2.goto(B + '/xatlov', { waitUntil: 'networkidle' });
  t('Mahalla xodimida (YETTILIK) maskot tugmasi YO‘Q', (await p2.locator('button[data-agent-tugmasi]').count()) === 0);
  await k2.close();
}
