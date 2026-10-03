// Actual API route, with auth/rate-limit/provider replaced; no DB or network.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { NextResponse } = require('next/server');
const mock = (p, exports) => { const id = require.resolve(path.join(root, p)); require.cache[id] = { id, filename: id, loaded: true, exports }; };
let auth, allowed = true, configured = true, calls = 0;
mock('src/lib/api-auth.ts', { talabQil: async () => auth });
mock('src/lib/alifbo-server.ts', { alifboServer: () => 'lot' });
mock('src/lib/kirish-chegarasi.ts', { bazaChegarasi: async () => ({ allowed }) });
mock('src/lib/agent/tts.ts', { ttsSozlama: () => configured ? {} : null, matnniOvozga: async () => { calls++; return new Uint8Array([1, 2]).buffer; } });
const { POST } = require(path.join(root, 'src/app/api/agent/gapir/route.ts'));
const request = (matn) => new Request('https://mock.invalid/api/agent/gapir', { method: 'POST', body: JSON.stringify({ matn }), headers: { 'content-type': 'application/json' } });
(async () => {
  auth = NextResponse.json({}, { status: 401 }); assert.equal((await POST(request('salom'))).status, 401);
  auth = { sessiya: { rol: 'YETTILIK', userId: 'test' } }; assert.equal((await POST(request('salom'))).status, 403);
  auth.sessiya.rol = 'ADMIN'; configured = false; assert.equal((await POST(request('salom'))).status, 503); configured = true;
  assert.equal((await POST(request('x'.repeat(901)))).status, 400);
  assert.equal((await POST(request('x'.repeat(9000)))).status, 413);
  allowed = false; assert.equal((await POST(request('salom'))).status, 429); allowed = true;
  assert.equal(calls, 0);
  const r = await POST(request('Ассалому алайкум')); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'audio/mpeg'); assert.match(r.headers.get('cache-control'), /no-store/); assert.equal((await r.arrayBuffer()).byteLength, 2); assert.equal(calls, 1);
  console.log('7/7 API scenarios passed: auth, role, disabled provider, input limit, body limit, rate limit, successful audio');
})().catch((e) => { console.error(e); process.exitCode = 1; });
