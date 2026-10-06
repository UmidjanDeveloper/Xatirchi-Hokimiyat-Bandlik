// Real authenticated route + provider adapter; only auth, quotas and outbound HTTP are fixtures.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { NextResponse } = require('next/server');
const mock = (p, exports) => { const id = require.resolve(path.join(root, p)); require.cache[id] = { id, filename: id, loaded: true, exports }; };
let auth = { sessiya: { rol: 'ADMIN', userId: 'fixture' } }, allowed = true, calls = 0, status = 200, uzbek = true;
mock('src/lib/api-auth.ts', { talabQil: async () => auth });
mock('src/lib/alifbo-server.ts', { alifboServer: () => 'lot' });
mock('src/lib/kirish-chegarasi.ts', { bazaChegarasi: async () => ({ allowed }) });
process.env.AGENT_TTS = '1'; process.env.AGENT_TTS_PROVIDER = 'elevenlabs';
process.env.ELEVENLABS_API_KEY = 'private-key-fixture-only'; process.env.ELEVENLABS_VOICE_ID = 'voice_fixture';
process.env.ELEVENLABS_MODEL_ID = 'eleven_v3';
global.fetch = async (url) => {
  calls++;
  assert.match(String(url), /^https:\/\/api.elevenlabs.io\//);
  if (String(url).endsWith('/models')) return Response.json([{ model_id: 'eleven_v3', can_do_text_to_speech: true, languages: [{ language_id: uzbek ? 'uz' : 'en' }] }]);
  return status === 200 ? new Response(new Uint8Array([0x49, 0x44, 0x33, 1]), { headers: { 'content-type': 'audio/mpeg' } }) : new Response('private-key-fixture-only raw body', { status });
};
const { POST } = require(path.join(root, 'src/app/api/agent/gapir/route.ts'));
const req = (data = { matn: 'Assalomu alaykum' }) => new Request('https://local.invalid/api/agent/gapir', { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } });
let tests = 0;
const test = async (name, f) => { await f(); tests++; console.log('OK', name); };
(async () => {
  const admin = auth;
  await test('Unauthorized/forbidden users, quotas and invalid input never contact ElevenLabs', async () => {
    auth = NextResponse.json({}, { status: 401 }); assert.equal((await POST(req())).status, 401);
    auth = { sessiya: { ...admin.sessiya, rol: 'YETTILIK' } }; assert.equal((await POST(req())).status, 403); auth = admin;
    allowed = false; assert.equal((await POST(req())).status, 429); allowed = true;
    assert.equal((await POST(req({ matn: '' }))).status, 400); assert.equal(calls, 0);
  });
  await test('Missing Voice ID is reported without leaking configuration/key or falling back', async () => {
    process.env.ELEVENLABS_VOICE_ID = '';
    const r = await POST(req()); assert.equal(r.status, 503);
    const d = await r.json(); assert.match(d.xabar, /ELEVENLABS_VOICE_ID/); assert.ok(!JSON.stringify(d).includes(process.env.ELEVENLABS_API_KEY)); assert.equal(calls, 0);
    process.env.ELEVENLABS_VOICE_ID = 'voice_fixture';
  });
  await test('Unsupported Uzbek model cannot generate paid audio', async () => {
    uzbek = false; const r = await POST(req()); assert.equal(r.status, 502); assert.match((await r.json()).xabar, /o‘zbek tilini qo‘llamaydi/); assert.equal(calls, 1); uzbek = true;
  });
  await test('Real route returns MP3 with no-store; client voice/model/url cannot replace server choice', async () => {
    const r = await POST(req({ matn: 'Salom', voice: '../evil', model: 'anything', url: 'https://other.invalid' }));
    assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'audio/mpeg'); assert.match(r.headers.get('cache-control'), /no-store/);
    assert.equal((await r.arrayBuffer()).byteLength, 4);
  });
  await test('Rejected key reports a useful safe error, keeps no-store, never exposes provider body', async () => {
    status = 401; const r = await POST(req()); assert.equal(r.status, 502); const d = await r.json();
    assert.match(d.xabar, /API kaliti qabul qilinmadi/); assert.ok(!JSON.stringify(d).includes(process.env.ELEVENLABS_API_KEY)); assert.ok(!JSON.stringify(d).includes('raw body')); assert.match(r.headers.get('cache-control'), /no-store/);
  });
  console.log(`${tests}/${tests} ElevenLabs API checks passed with fake HTTP.`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
