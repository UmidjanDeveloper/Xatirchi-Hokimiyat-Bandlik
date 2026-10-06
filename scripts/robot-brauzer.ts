/** Real local app + DB. Audio fixture tests playback, not provider pronunciation.
 * Run after db:deploy/db:seed and npm run dev:
 * PW_CHROME=/usr/bin/chromium npx tsx scripts/robot-brauzer.ts
 */
import { envYukla } from './env-yukla';
envYukla();
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { parolXeshla } from '../src/lib/auth';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const prisma = new PrismaClient();
const baza = process.env.ROBOT_BAZA || 'http://127.0.0.1:3000';
const surat = process.env.ROBOT_SURAT || '/tmp/hamroh-browser';
if (!['localhost', '127.0.0.1'].includes(new URL(baza).hostname) || !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL || '').hostname)) throw new Error('Only local test app and DB are allowed');

function wav() {
  const hz = 16000, n = hz * 3, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(hz, 24); b.writeUInt32LE(hz * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / hz * 440 * Math.PI * 2) * (1000 + 6500 * Math.abs(Math.sin(i / hz * 9)))), 44 + i * 2);
  return b;
}

async function main() {
  mkdirSync(surat, { recursive: true });
  const parol = randomBytes(20).toString('hex');
  const user = await prisma.user.create({ data: { username: `robot_test_${Date.now()}`, passwordHash: parolXeshla(parol), fullName: 'Robot Sinovi', rol: 'ADMIN', parolAlmashtirilsin: false } });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], env: { ...process.env, XDG_CACHE_HOME: '/tmp/hamroh-browser-cache' } });
  let checks = 0;
  const ok = (m: string) => { checks++; console.log('OK', m); };
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addCookies([{ name: 'bandlik_alifbo', value: 'lot', url: baza }]);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => { errors.push(e.message); console.error('Browser:', e.message); });
    const login = await context.request.post(`${baza}/api/auth/kirish`, { data: { username: user.username, parol } });
    assert.equal(login.status(), 200, 'Real login must work');
    const ready = page.waitForResponse((r: { url(): string }) => r.url().endsWith('/api/agent/holat'));
    await page.goto(`${baza}/vazifalar`, { waitUntil: 'domcontentloaded' });
    await ready;
    await page.locator('[data-agent-tugmasi]').click({ timeout: 60000 });
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ timeout: 15000 }).catch(async (e: Error) => { await page.screenshot({ animations: 'disabled', path: `${surat}/failure.png` }); console.log((await page.locator('body').innerText()).slice(-1200)); throw e; });
    await page.getByRole('button', { name: 'Ovozni sinash', exact: true }).waitFor();
    await page.waitForFunction(() => !(Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Ovozni sinash') as HTMLButtonElement)?.disabled, { timeout: 15000 });
    const holat = await page.evaluate(async () => { const r = await fetch('/api/agent/holat'); return { status: r.status, body: await r.json() }; });
    assert.equal(holat.status, 200);
    const status = holat.body;
    assert.ok(['tayyor', 'kalit_yoq', 'ochirilgan'].includes(status.ovozUlanishi));
    ok('Real authenticated app reports voice configuration without secrets');
    if (!status.ovozChiqish) {
      await page.getByRole('button', { name: 'Ovozni sinash', exact: true }).click();
      await page.getByText(/ovoz ulanmagan.*Administrator/).waitFor();
      ok('Unavailable Uzbek voice produces a visible error instead of silent success');
    }
    const reply = page.waitForResponse((r: { url(): string }) => r.url().endsWith('/api/agent/suhbat'));
    await dialog.locator('textarea').fill('rahmat');
    await dialog.getByRole('button', { name: 'Yuborish', exact: true }).click();
    assert.equal((await reply).status(), 200);
    await dialog.locator('[data-robot-sahna] [data-kayfiyat="xursand"]').waitFor();
    ok('Real conversation endpoint replies; social thanks produces a smile');
    await dialog.locator('textarea').fill("jahlingni ko'rsat");
    await dialog.getByRole('button', { name: 'Yuborish', exact: true }).click();
    await dialog.locator('[data-robot-sahna] [data-kayfiyat="jiddiy"]').waitFor();
    await page.screenshot({ animations: 'disabled', path: `${surat}/jiddiy.png` });
    ok('Conversation command visibly changes eyebrows and mouth to serious');
    await dialog.locator('textarea').fill('tabassum qil');
    await dialog.getByRole('button', { name: 'Yuborish', exact: true }).click();
    await dialog.locator('[data-robot-sahna] [data-kayfiyat="xursand"]').waitFor();
    await page.screenshot({ animations: 'disabled', path: `${surat}/xursand.png` });
    ok('Conversation command visibly smiles without claiming a task was completed');
    await dialog.getByRole('button', { name: 'Yopish', exact: true }).click();
    // Only audio transport is stubbed. Real React state, WebAudio, DOM and CSS run in Chromium.
    await page.route('**/api/agent/holat', async (route: { fulfill(v: unknown): Promise<void> }) => { await route.fulfill({ json: { ...status, ovozChiqish: true, ovozUlanishi: 'tayyor' } }); });
    await page.route('**/api/agent/gapir', async (route: { fulfill(v: unknown): Promise<void> }) => { await route.fulfill({ contentType: 'audio/wav', body: wav() }); });
    await page.locator('[data-agent-tugmasi]').click();
    await page.waitForFunction(() => !(Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Ovozni sinash') as HTMLButtonElement)?.disabled);
    await page.evaluate(() => { document.documentElement.dataset.fx = 'lite'; });
    await page.getByRole('button', { name: 'Ovozni sinash', exact: true }).click();
    await page.waitForFunction(() => Number(document.querySelector('[data-robot-sahna] .robot-ogiz')?.getAttribute('ry')) > 2);
    await page.screenshot({ animations: 'disabled', path: `${surat}/gapirmoqda.png` });
    ok('Real WebAudio fixture opens the mouth even in low-power mode');
    await dialog.getByRole('button', { name: 'Yopish', exact: true }).click();
    await page.locator('[data-agent-tugmasi]').click();
    assert.equal(await dialog.locator('[data-holat="gapirmoqda"]').count(), 0);
    ok('Closing the conversation stops playback and resets the face');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const bounds = await dialog.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 375 && bounds.y >= 0);
    const input = await dialog.locator('textarea').boundingBox();
    assert.ok(input && input.y + input.height <= 812);
    await page.screenshot({ animations: 'disabled', path: `${surat}/telefon.png` });
    assert.deepEqual(errors, []);
    ok('Mobile layout and reduced motion keep controls visible; no browser errors');
    console.log(`${checks}/${checks} browser checks passed. Audio is a fixture; provider pronunciation is NOT validated.`);
  } finally {
    await browser.close();
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
