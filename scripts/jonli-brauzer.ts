/** Local app + real role login + real DB tools/exporters. Only WebRTC/provider audio is a fixture. */
import { envYukla } from './env-yukla';
envYukla();
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { PrismaClient, type Rol } from '@prisma/client';
import { parolXeshla } from '../src/lib/auth';
import { asbobniBajar } from '../src/lib/agent/asboblar';
import type { AgentKontekst } from '../src/lib/agent/turlar';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require('xlsx');
const prisma = new PrismaClient();
const baza = process.env.ROBOT_BAZA || 'http://127.0.0.1:3100';
const dir = '/tmp/hamroh-live-browser';
if (!['localhost', '127.0.0.1'].includes(new URL(baza).hostname) || !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL || '').hostname)) throw new Error('Local app and DB only');

async function main() {
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], env: { ...process.env, XDG_CACHE_HOME: '/tmp/hamroh-browser-cache' } });
  const users: string[] = []; let checks = 0;
  const ok = (m: string) => { checks++; console.log('OK', m); };
  try {
    const mahalla = await prisma.mahalla.findFirstOrThrow({ where: { nomi: 'Uyshun' }, select: { id: true, nomi: true } });
    for (const rol of ['HOKIM', 'BANDLIK_RAHBAR', 'ADMIN'] as Rol[]) {
      const parol = randomBytes(20).toString('hex');
      const user = await prisma.user.create({ data: { username: `live_test_${rol}_${Date.now()}`.toLowerCase(), passwordHash: parolXeshla(parol), fullName: 'Hamroh Sinovi', rol, parolAlmashtirilsin: false } }); users.push(user.id);
      const ctx: AgentKontekst = { userId: user.id, rol, fullName: user.fullName, mahallaId: null, alifbo: 'lot', hozir: new Date() };
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
      await context.addCookies([{ name: 'bandlik_alifbo', value: 'lot', url: baza }]);
      await context.addInitScript({ content: "window.__name = (target) => target;" });
      await context.addInitScript(() => {
        class Channel {
          readyState = 'connecting'; onopen?: () => void; onmessage?: (e: { data: string }) => void; onclose?: () => void;
          send(m: string) { (window as any).__live.sent.push(JSON.parse(m)); }
          close() { this.readyState = 'closed'; this.onclose?.(); }
        }
        class Peer {
          connectionState = 'new'; channel = new Channel();
          constructor() { (window as any).__live = { peer: this, sent: [] }; }
          addTrack() {} createDataChannel() { return this.channel; }
          async createOffer() { return { sdp: 'v=0\r\nmock-offer' }; } async setLocalDescription() {}
          async setRemoteDescription() { this.channel.readyState = 'open'; this.channel.onopen?.(); }
          close() { this.connectionState = 'closed'; }
        }
        Object.defineProperty(window, 'RTCPeerConnection', { value: Peer });
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => new MediaStream() });
      });
      const login = await context.request.post(`${baza}/api/auth/kirish`, { data: { username: user.username, parol } }); assert.equal(login.status(), 200);
      const page = await context.newPage(); const errors: string[] = []; const exports: Array<string | null> = [];
      page.on('pageerror', (e: Error) => errors.push(e.message));
      page.on('request', (r: any) => { if (r.url().endsWith('/api/hisobot') && r.method() === 'POST') exports.push(r.postDataJSON().mahallaId ?? null); });
      await page.route('**/api/agent/holat', async (route: any) => {
        const r = await route.fetch(); const d = await r.json(); await route.fulfill({ json: { ...d, jonli: true } });
      });
      await page.route('**/api/agent/jonli', async (route: any) => {
        const d = route.request().postDataJSON();
        if (d.tur === 'ulanish') return route.fulfill({ json: { sdp: 'v=0 mock-answer', ruxsat: 'browser-test-only', muddatMs: 300000 } });
        if (d.tur === 'yopish') return route.fulfill({ json: { yopildi: true } });
        const n = await asbobniBajar({ ...ctx, hozir: new Date() }, d.nomi, d.args);
        return route.fulfill({ json: n });
      });
      await page.goto(`${baza}/vazifalar`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-agent-tugmasi]').click(); const dialog = page.getByRole('dialog'); await dialog.waitFor();
      const live = dialog.getByRole('button', { name: 'Jonli suhbat', exact: true }); await live.click();
      await page.waitForFunction(() => (window as any).__live?.peer.channel.readyState === 'open').catch(async (e: Error) => { await page.screenshot({ path: `${dir}/failure.png` }); console.log('Live init errors:', errors); console.log(await dialog.innerText()); throw e; });
      const emitTool = async (name: string, args: Record<string, unknown>, call: string) => page.evaluate(({ name, args, call }: any) => {
        const c = (window as any).__live.peer.channel;
        c.onmessage({ data: JSON.stringify({ type: 'response.done', response: { status: 'completed', output: [{ type: 'function_call', call_id: call, name, arguments: JSON.stringify(args) }] } }) });
      }, { name, args, call });
      const result = (call: string) => page.waitForFunction((id: string) => (window as any).__live.sent.some((e: any) => e.item?.type === 'function_call_output' && e.item.call_id === id), call, { timeout: 90000 });
      await emitTool('hisobotni_yukla', { format: 'excel' }, 'scope_missing'); await result('scope_missing');
      assert.equal(exports.length, 0); ok(`${rol}: unspecified report scope asks instead of downloading district data`);
      for (const qamrov of ['tuman', 'mahalla']) {
        const call = `excel_${qamrov}`;
        const down = page.waitForEvent('download', { timeout: 90000 });
        await emitTool('hisobotni_yukla', { format: 'excel', qamrov, ...(qamrov === 'mahalla' ? { mahalla: mahalla.nomi } : {}) }, call);
        const download = await down; await result(call);
        const file = `${dir}/${rol}-${qamrov}.xlsx`; await download.saveAs(file);
        const book = XLSX.read(readFileSync(file)); assert.ok(book.SheetNames.length > 0);
        assert.equal(exports.at(-1), qamrov === 'mahalla' ? mahalla.id : null);
        const output = await page.evaluate((id: string) => JSON.parse((window as any).__live.sent.find((e: any) => e.item?.call_id === id).item.output), call);
        assert.equal(output.brauzerNatijasi.hisobot.ok, true);
        assert.ok(readFileSync(file).length > 1000); ok(`${rol}: ${qamrov} uses real existing Excel exporter and reports successful download initiation`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${dir}/${rol}.png`, animations: 'disabled' });
      assert.ok(await dialog.getByRole('button', { name: /Jonli suhbatni to.xtatish/ }).isVisible());
      await dialog.getByRole('button', { name: 'Yopish', exact: true }).click();
      assert.equal(await dialog.count(), 0); assert.deepEqual(errors, []); ok(`${rol}: live session survives navigation, closes, and mobile dialog has no browser errors`);
      await page.unrouteAll({ behavior: 'wait' });
      await context.close();
    }
    console.log(`${checks}/${checks} real local role/export checks passed. Provider audio and natural pronunciation not tested.`);
  } finally {
    await browser.close();
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
