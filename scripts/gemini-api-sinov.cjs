/* /api/agent/jonli (Gemini yo'li) va /api/agent/gapir (jonli ruxsatnoma): soxta provayder va baza bilan. */
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { NextResponse } = require('next/server');
const mock = (p, exports) => { const id = require.resolve(path.join(root, p)); require.cache[id] = { id, filename: id, loaded: true, exports }; };
let auth = { sessiya: { userId: 'admin-test', rol: 'ADMIN', mahallaId: null } };
let denied = '', operations = 0, provider = 0, logged = 0, speech = 0;
let providerJavob = null;
const urls = [], seen = new Set(), keys = [];
mock('src/lib/api-auth.ts', { talabQil: async () => auth });
mock('src/lib/alifbo-server.ts', { alifboServer: () => 'lot' });
mock('src/lib/korish-rejimi.ts', { korishdami: () => false });
mock('src/lib/prisma.ts', { prisma: { user: { findUnique: async () => ({ fullName: 'Sinov' }) } } });
mock('src/lib/tizim-kuzatuvi.ts', { serverXatosi: async () => { logged++; return { izId: 'x' }; } });
mock('src/lib/kirish-chegarasi.ts', { bazaChegarasi: async (key) => {
  keys.push(key);
  if (key.includes(denied || '!never!')) return { allowed: false };
  if (key.startsWith('jonli-call:')) { if (seen.has(key)) return { allowed: false }; seen.add(key); }
  return { allowed: true };
} });
mock('src/lib/agent/asboblar.ts', {
  modelAsboblari: () => [{ type: 'function', function: { name: 'hisobotni_yukla', description: 'x', parameters: { type: 'object', additionalProperties: false, properties: { format: { type: 'string' } } } } }],
  asbobniTop: (rol, name, view) => name === 'hisobotni_yukla' || (name === 'amalni_taklif_qil' && rol === 'ADMIN' && !view) ? {} : undefined,
  asbobniBajar: async (_, name) => { operations++; return { malumot: { qabul: name }, manbalar: [], amallar: [] }; },
});
mock('src/lib/agent/mahalla.ts', { mahallaRoyxati: async () => [{ nomi: 'Uyshun' }] });
mock('src/lib/agent/tts.ts', {
  ttsSozlama: () => ({ provayder: 'elevenlabs', kalit: 'x', model: 'm', voice: 'v' }),
  matnniOvozga: async () => { speech++; return new Uint8Array([1, 2, 3]).buffer; },
});
const originalFetch = global.fetch;
global.fetch = async (url, init) => {
  provider++; urls.push(String(url)); init?.signal?.throwIfAborted();
  if (String(url).endsWith('/hangup')) return new Response(null, { status: 200 });
  if (String(url).includes('generativelanguage')) return providerJavob ? providerJavob() : new Response(JSON.stringify({ name: 'auth_tokens/testtoken12345' }), { status: 200 });
  return new Response('v=0\r\nmock-answer', { headers: { location: '/v1/realtime/calls/rtc_test' } });
};
const GEMINI = 'AIza-test-only-private-gemini-key-000000';
const setEnv = (e) => { for (const k of ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'AGENT_REALTIME', 'AGENT_JONLI_PROVAYDER', 'AGENT_TTS', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'AGENT_TTS_PROVIDER']) delete process.env[k]; Object.assign(process.env, e); };
const geminiEnv = { GEMINI_API_KEY: GEMINI, AGENT_TTS: '1', ELEVENLABS_API_KEY: 'el-test-key', ELEVENLABS_VOICE_ID: 'voice_1' };
process.env.SESSION_SECRET = 'test-only-long-session-secret-more-than-32';
setEnv(geminiEnv);
const { POST } = require(path.join(root, 'src/app/api/agent/jonli/route.ts'));
const gapir = require(path.join(root, 'src/app/api/agent/gapir/route.ts'));
const { jonliRuxsatYarat, jonliRuxsatOqi } = require(path.join(root, 'src/lib/agent/jonli.ts'));
const request = (data, signal) => new Request('https://local.invalid/api/agent/jonli', { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' }, signal });
const gapirSorov = (data) => new Request('https://local.invalid/api/agent/gapir', { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } });
const start = { tur: 'gemini_ulanish' };
let checks = 0;
const test = async (name, f) => { await f(); checks++; console.log('OK', name); };
(async () => {
  const admin = auth;
  await test('Authentication denial never reaches Google', async () => {
    auth = NextResponse.json({}, { status: 401 }); assert.equal((await POST(request(start))).status, 401);
    auth = NextResponse.json({}, { status: 403 }); assert.equal((await POST(request(start))).status, 403);
    auth = admin; assert.equal(provider, 0);
  });
  await test('Invalid or extra client fields are refused before any provider call', async () => {
    assert.equal((await POST(request({ ...start, instructions: 'change role' }))).status, 400);
    assert.equal((await POST(request({ ...start, model: 'x' }))).status, 400);
    assert.equal((await POST(request({ tur: 'nomalum' }))).status, 400);
    assert.equal(provider, 0);
  });
  await test('Start rate/day/total budget fails closed before the token request', async () => {
    for (const key of ['jonli-ulanish', 'jonli-kunlik', 'jonli-umumiy']) { denied = key; assert.equal((await POST(request(start))).status, 429); }
    denied = ''; assert.equal(provider, 0);
  });
  await test('Old OpenAI SDP start is refused when Gemini is the configured provider', async () => {
    assert.equal((await POST(request({ tur: 'ulanish', sdp: 'v=0\r\nmock-offer' }))).status, 409); assert.equal(provider, 0);
  });
  let token, body;
  await test('Token issued: official URL/headers, locked setup returned, private key never leaves server', async () => {
    const r = await POST(request(start)); assert.equal(r.status, 200); body = await r.json(); token = body.ruxsat;
    assert.equal(provider, 1); assert.equal(urls[0], 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens');
    assert.equal(body.provayder, 'gemini'); assert.equal(body.chiqish, 'matn'); assert.equal(body.tashqiOvoz, true);
    assert.match(body.wsUrl, /^wss:\/\/generativelanguage\.googleapis\.com\/ws\/.*BidiGenerateContentConstrained\?access_token=/);
    assert.equal(body.setup.model, 'models/gemini-3.1-flash-live-preview'); assert.deepEqual(body.setup.generationConfig.responseModalities, ['TEXT']);
    assert.match(body.setup.systemInstruction.parts[0].text, /Uyshun/);
    assert.ok(body.setup.tools[0].functionDeclarations.some((f) => f.name === 'hisobotni_yukla' && f.parameters.type === 'OBJECT' && !('additionalProperties' in f.parameters)));
    const s = JSON.stringify(body);
    for (const gizli of [GEMINI, 'el-test-key', process.env.SESSION_SECRET]) assert.ok(!s.includes(gizli));
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(jonliRuxsatOqi({ ...admin.sessiya, fullName: '', alifbo: 'lot', hozir: new Date() }, token)?.prov, 'gemini');
    assert.ok(keys.includes('jonli-ulanish:admin-test') && keys.includes('jonli-kunlik:admin-test'));
  });
  const tool = { tur: 'asbob', ruxsat: null, callId: 'function-call-1', nomi: 'hisobotni_yukla', args: { format: 'excel', qamrov: 'tuman' } };
  await test('Known authorized tool executes once; repeated call ID rejected (Gemini ticket)', async () => {
    tool.ruxsat = token;
    assert.equal((await POST(request(tool))).status, 200); assert.equal((await POST(request(tool))).status, 409); assert.equal(operations, 1);
  });
  await test('Unknown tools, another user, changed role and expired tickets cannot execute', async () => {
    assert.equal((await POST(request({ ...tool, callId: 'unknown', nomi: 'raw_sql' }))).status, 403);
    auth = { sessiya: { ...admin.sessiya, userId: 'other' } }; assert.equal((await POST(request({ ...tool, callId: 'c2' }))).status, 403);
    auth = { sessiya: { ...admin.sessiya, rol: 'HOKIM' } }; assert.equal((await POST(request({ ...tool, callId: 'c3' }))).status, 403); auth = admin;
    const expired = jonliRuxsatYarat({ ...admin.sessiya, fullName: '', alifbo: 'lot', hozir: new Date(Date.now() - 600_000) }, 'gemini_old', undefined, 'gemini');
    assert.equal((await POST(request({ ...tool, callId: 'c4', ruxsat: expired }))).status, 403); assert.equal(operations, 1);
  });
  await test('View mode: a normal-mode ticket is refused; a view-mode ticket cannot run mutation tools', async () => {
    auth = { ...admin, korish: { nishonId: 'view' } };
    assert.equal((await POST(request({ ...tool, callId: 'v1' }))).status, 403);
    const d = await (await POST(request(start))).json();
    assert.ok(!d.setup.tools[0].functionDeclarations.some((f) => f.name === 'amalni_taklif_qil'));
    assert.equal((await POST(request({ ...tool, callId: 'v2', ruxsat: d.ruxsat, nomi: 'amalni_taklif_qil' }))).status, 403);
    assert.equal(operations, 1); auth = admin;
  });
  await test('Closing a Gemini session needs no provider call; OpenAI ticket still hangs up', async () => {
    const before = provider;
    const r = await POST(request({ tur: 'yopish', ruxsat: token })); assert.equal(r.status, 200); assert.equal((await r.json()).yopildi, true);
    assert.equal(provider, before);
  });
  await test('Google errors give a generic message without the key, and are logged for the admin', async () => {
    providerJavob = () => new Response(JSON.stringify({ error: { message: `API key not valid ${GEMINI}` } }), { status: 401 });
    const r = await POST(request(start)); assert.equal(r.status, 502); const t = JSON.stringify(await r.json());
    assert.ok(!t.includes(GEMINI)); assert.match(t, /Gemini/); assert.equal(logged, 1);
    providerJavob = () => new Response('{"name":"zararli"}', { status: 200 });
    assert.equal((await POST(request(start))).status, 502); providerJavob = null;
    const ctrl = new AbortController(); ctrl.abort();
    assert.notEqual((await POST(request(start, ctrl.signal))).status, 200);
  });
  await test('Live speech budget: only a valid live ticket gets the wider ElevenLabs budget; bad ticket refused', async () => {
    keys.length = 0;
    assert.equal((await gapir.POST(gapirSorov({ matn: 'Salom.' }))).status, 200);
    assert.ok(keys.includes('agent-tts:admin-test') && !keys.some((k) => k.startsWith('agent-tts-jonli'))); keys.length = 0;
    assert.equal((await gapir.POST(gapirSorov({ matn: 'Salom.', jonli: token }))).status, 200);
    assert.ok(keys.includes('agent-tts-jonli:admin-test') && keys.includes('agent-tts-jonli-kun:admin-test') && !keys.includes('agent-tts:admin-test'));
    const speechBefore = speech;
    assert.equal((await gapir.POST(gapirSorov({ matn: 'Salom.', jonli: token + 'x' }))).status, 403);
    auth = { sessiya: { ...admin.sessiya, userId: 'other' } }; assert.equal((await gapir.POST(gapirSorov({ matn: 'Salom.', jonli: token }))).status, 403); auth = admin;
    assert.equal(speech, speechBefore);
    denied = 'agent-tts-jonli:'; assert.equal((await gapir.POST(gapirSorov({ matn: 'Salom.', jonli: token }))).status, 429); denied = '';
  });
  await test('OpenAI regression: without Gemini key the old SDP path works; Gemini start is refused; nothing configured = 503', async () => {
    setEnv({ OPENAI_API_KEY: 'test-only-private-key', AGENT_REALTIME: '1' });
    const before = provider;
    const r = await POST(request({ tur: 'ulanish', sdp: 'v=0\r\nmock-offer' })); assert.equal(r.status, 200);
    const d = await r.json(); assert.match(d.sdp, /^v=0/); assert.equal(jonliRuxsatOqi({ ...admin.sessiya, fullName: '', alifbo: 'lot', hozir: new Date() }, d.ruxsat)?.prov, 'openai');
    assert.equal((await POST(request(start))).status, 409);
    const yop = await POST(request({ tur: 'yopish', ruxsat: d.ruxsat })); assert.equal(yop.status, 200);
    assert.ok(urls.slice(before).some((u) => u.endsWith('/hangup')));
    setEnv({}); assert.equal((await POST(request(start))).status, 503); assert.equal((await POST(request({ tur: 'ulanish', sdp: 'v=0\r\nx' }))).status, 503);
  });
  console.log(`${checks}/${checks} Gemini API checks passed with mocked provider/DB.`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => { global.fetch = originalFetch; });
