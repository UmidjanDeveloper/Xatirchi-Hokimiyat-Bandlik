const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { NextResponse } = require('next/server');
const mock = (p, exports) => { const id = require.resolve(path.join(root, p)); require.cache[id] = { id, filename: id, loaded: true, exports }; };
let auth = { sessiya: { userId: 'admin-test', rol: 'ADMIN', mahallaId: null } };
let denied = '', operations = 0, provider = 0;
const seen = new Set();
mock('src/lib/api-auth.ts', { talabQil: async () => auth });
mock('src/lib/alifbo-server.ts', { alifboServer: () => 'lot' });
mock('src/lib/korish-rejimi.ts', { korishdami: () => false });
mock('src/lib/prisma.ts', { prisma: { user: { findUnique: async () => ({ fullName: 'Sinov' }) } } });
const chegara = async (key) => {
  if (key.includes(denied || '!never!')) return { allowed: false };
  if ((key.startsWith('jonli-call:') || key.startsWith('jonli-davom:'))) { if (seen.has(key)) return { allowed: false }; seen.add(key); }
  return { allowed: true };
};
const bandlar = new Map(); let bandSoni = 0;
mock('src/lib/kirish-chegarasi.ts', {
  bazaChegarasi: chegara,
  bazaChegarasiBandQil: async (key, limit) => {
    const n = await chegara(key); if (!n.allowed) return n;
    const bandId = `band_${++bandSoni}`; bandlar.set(bandId, { key, limit });
    return { ...n, bandId };
  },
  bazaBandiniQaytar: async (key, id) => { assert.equal(bandlar.get(id)?.key, key); bandlar.delete(id); },
});
mock('src/lib/agent/asboblar.ts', {
  modelAsboblari: () => [],
  asbobniTop: (rol, name, view) => name === 'hisobotni_yukla' || (name === 'amalni_taklif_qil' && rol === 'ADMIN' && !view) ? {} : undefined,
  asbobniBajar: async (_, name) => { operations++; return { malumot: { qabul: name }, manbalar: [], amallar: [] }; },
});
mock('src/lib/agent/mahalla.ts', { mahallaRoyxati: async () => [{ nomi: 'Uyshun' }] });
const originalFetch = global.fetch;
global.fetch = async (url, init) => {
  provider++; init?.signal?.throwIfAborted();
  if (url.endsWith('/hangup')) return new Response(null, { status: 200 });
  return new Response('v=0\r\nmock-answer', { headers: { location: '/v1/realtime/calls/rtc_test' } });
};
process.env.OPENAI_API_KEY = 'test-only-private-key'; process.env.SESSION_SECRET = 'test-only-long-session-secret-more-than-32'; process.env.AGENT_REALTIME = '1';
const { POST } = require(path.join(root, 'src/app/api/agent/jonli/route.ts'));
const { jonliRuxsatYarat, jonliRuxsatOqi } = require(path.join(root, 'src/lib/agent/jonli.ts'));
const request = (data, signal) => new Request('https://local.invalid/api/agent/jonli', { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' }, signal });
const start = { tur: 'ulanish', sdp: 'v=0\r\nmock-offer' };
let checks = 0;
const test = async (name, f) => { await f(); checks++; console.log('OK', name); };
(async () => {
  const admin = auth;
  await test('Authentication denial never reaches provider', async () => { auth = NextResponse.json({}, { status: 401 }); assert.equal((await POST(request(start))).status, 401); auth = NextResponse.json({}, { status: 403 }); assert.equal((await POST(request(start))).status, 403); auth = admin; assert.equal(provider, 0); });
  await test('Opt-in required and oversized/invalid client configuration refused', async () => {
    process.env.AGENT_REALTIME = '0'; assert.equal((await POST(request(start))).status, 503); process.env.AGENT_REALTIME = '1';
    assert.equal((await POST(request({ ...start, instructions: 'change role' }))).status, 400);
    assert.equal((await POST(request({ ...start, sdp: 'v=0' + 'x'.repeat(70_000) }))).status, 413);
    assert.equal(provider, 0);
  });
  await test('Start rate/day budget fails closed before audio connection', async () => {
    for (const key of ['jonli-ulanish', 'jonli-kunlik', 'jonli-umumiy']) { denied = key; assert.equal((await POST(request(start))).status, 429); }
    denied = ''; assert.equal(provider, 0);
  });
  let token;
  await test('SDP negotiation issues bound tool ticket without private key', async () => {
    const r = await POST(request(start)); assert.equal(r.status, 200); const d = await r.json(); token = d.ruxsat;
    assert.match(d.sdp, /^v=0/); assert.ok(token); assert.ok(!JSON.stringify(d).includes(process.env.OPENAI_API_KEY)); assert.match(r.headers.get('cache-control'), /no-store/);
  });
  await test('Renewal keeps provider/call/tool identity, never charges daily start budget or contacts provider', async () => {
    const ctx = { ...admin.sessiya, fullName: '', alifbo: 'lot', hozir: new Date() };
    const old = jonliRuxsatYarat({ ...ctx, hozir: new Date(Date.now() - 200_000) }, 'rtc_renew');
    const before = bandSoni, contacted = provider;
    const r = await POST(request({ tur: 'yangilash', ruxsat: old })); assert.equal(r.status, 200);
    const d = await r.json(), a = jonliRuxsatOqi(ctx, old), b = jonliRuxsatOqi(ctx, d.ruxsat);
    assert.equal(b.id, a.id); assert.equal(b.call, a.call); assert.ok(b.muddat > a.muddat); assert.equal(provider, contacted); assert.equal(bandSoni, before);
    auth = { sessiya: { ...admin.sessiya, userId: 'other' } }; assert.equal((await POST(request({ tur: 'yangilash', ruxsat: old }))).status, 403); auth = admin;
    const failed = jonliRuxsatYarat(ctx, 'failed_token', undefined, 'gemini', false);
    assert.equal((await POST(request({ tur: 'yangilash', ruxsat: failed }))).status, 403);
    const native = await (await POST(request({ ...start, mahalliyOvoz: true }))).json(); assert.equal(native.tashqiOvoz, false);
  });
  const tool = { tur: 'asbob', ruxsat: token, callId: 'call_excel', nomi: 'hisobotni_yukla', args: { format: 'excel', qamrov: 'tuman' } };
  await test('Known authorized tool executes once; repeated call ID rejected', async () => { assert.equal((await POST(request(tool))).status, 200); assert.equal((await POST(request(tool))).status, 409); assert.equal(operations, 1); });
  await test('Unknown tools, another user, changed role and expired tickets cannot execute', async () => {
    assert.equal((await POST(request({ ...tool, callId: 'unknown', nomi: 'raw_sql' }))).status, 403);
    auth = { sessiya: { ...admin.sessiya, userId: 'other' } }; assert.equal((await POST(request(tool))).status, 403);
    auth = { sessiya: { ...admin.sessiya, rol: 'HOKIM' } }; assert.equal((await POST(request(tool))).status, 403); auth = admin;
    const expired = jonliRuxsatYarat({ ...admin.sessiya, fullName: '', alifbo: 'lot', hozir: new Date(Date.now() - 600_000) }, 'rtc_old');
    assert.equal((await POST(request({ ...tool, ruxsat: expired }))).status, 403); assert.equal(operations, 1);
  });
  await test('View mode strips mutation tools and cannot reuse a normal-mode ticket', async () => {
    auth = { ...admin, korish: { nishonId: 'view' } };
    assert.equal((await POST(request(tool))).status, 403);
    const d = await (await POST(request(start))).json();
    assert.equal((await POST(request({ ...tool, ruxsat: d.ruxsat, nomi: 'amalni_taklif_qil' }))).status, 403); assert.equal(operations, 1); auth = admin;
  });
  await test('Per-session max tools and aborted request cannot cause additional effects', async () => {
    denied = 'jonli-asbob'; assert.equal((await POST(request({ ...tool, callId: 'limited' }))).status, 429); denied = '';
    const ctrl = new AbortController(); ctrl.abort(); assert.notEqual((await POST(request({ ...tool, callId: 'aborted' }, ctrl.signal))).status, 200); assert.equal(operations, 1);
  });
  await test('Close uses server-signed provider ID, never a client URL', async () => { const r = await POST(request({ tur: 'yopish', ruxsat: token })); assert.equal(r.status, 200); assert.equal((await r.json()).yopildi, true); });
  console.log(`${checks}/${checks} live API checks passed with mocked provider/DB.`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => { global.fetch = originalFetch; });
