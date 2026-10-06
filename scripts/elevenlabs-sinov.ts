/** Real provider adapter/config with fake HTTP; no paid calls or real keys. */
import assert from 'node:assert/strict';
import { nutqProvayderi, nutqUlanishi, nutqYarat, NutqXatosi } from '../src/lib/agent/nutq';
import { matnniOvozga, ttsSozlama } from '../src/lib/agent/tts';
import { jonliSozlama, jonliSessiya } from '../src/lib/agent/jonli';
import type { AgentKontekst } from '../src/lib/agent/turlar';

async function main() {
  let tests = 0;
  const test = async (name: string, fn: () => unknown) => { await fn(); tests++; console.log('OK', name); };
  const env = { NODE_ENV: 'test', AGENT_TTS: '1', ELEVENLABS_API_KEY: 'private-fixture-only', ELEVENLABS_VOICE_ID: 'uzbek_fixture_voice' } as NodeJS.ProcessEnv;
  const prov = nutqProvayderi(env)!;
  const models = () => Response.json([{ model_id: 'eleven_v3', can_do_text_to_speech: true, languages: [{ language_id: 'uz' }] }, { model_id: 'other' }]);
  const audio = () => new Response(new Uint8Array([0x49, 0x44, 0x33, 1]), { headers: { 'content-type': 'audio/mpeg' } });
  const fixture = (post: () => Response | Promise<Response> = audio): typeof fetch => (async (url) => String(url).endsWith('/models') ? models() : post()) as typeof fetch;
  await test('ElevenLabs automatically selected; requires opt-in/key/Voice ID; explicit OpenAI preserved', () => {
    assert.equal(prov.provayder, 'elevenlabs'); assert.equal(prov.model, 'eleven_v3');
    assert.equal(nutqUlanishi({ ...env, AGENT_TTS: '0' }), 'ochirilgan');
    assert.equal(nutqUlanishi({ ...env, ELEVENLABS_VOICE_ID: '' }), 'ovoz_id_yoq');
    assert.equal(nutqUlanishi({ ...env, ELEVENLABS_VOICE_ID: '../bad' }), 'sozlama_xato');
    assert.equal(nutqUlanishi({ ...env, AGENT_TTS_PROVIDER: 'wrong' }), 'sozlama_xato');
    assert.equal(nutqProvayderi({ ...env, ELEVENLABS_VOICE_ID: '', OPENAI_API_KEY: 'openai-fixture' }), null);
    assert.equal(nutqUlanishi({ ...env, ELEVENLABS_API_KEY: '', AGENT_TTS_PROVIDER: 'elevenlabs' }), 'kalit_yoq');
    assert.equal(nutqProvayderi({ ...env, AGENT_TTS_PROVIDER: 'openai', OPENAI_API_KEY: 'openai-fixture' })?.provayder, 'openai');
  });
  await test('Adapter authenticates only fixed ElevenLabs host, enforces Uzbek and returns bounded MP3', async () => {
    const calls: string[] = [];
    const bytes = await matnniOvozga('**Қорабулоқ**: 83,5%. PDF ҳисобот.', ttsSozlama(env)!, undefined, (async (url, init) => {
      calls.push(String(url)); assert.equal(new Headers(init?.headers).get('xi-api-key'), env.ELEVENLABS_API_KEY);
      assert.equal(new Headers(init?.headers).get('authorization'), null); assert.equal(init?.redirect, 'error');
      if (String(url).endsWith('/models')) return models();
      assert.match(String(url), /^https:\/\/api.elevenlabs.io\/v1\/text-to-speech\/uzbek_fixture_voice\?output_format=mp3_44100_128$/);
      const d = JSON.parse(String(init?.body));
      assert.equal(d.language_code, 'uz'); assert.equal(d.model_id, 'eleven_v3'); assert.equal(d.voice_settings.stability, 0.5);
      assert.match(d.text, /Qorabuloq/); assert.match(d.text, /foiz/); assert.ok(!d.text.includes('Қ'));
      return audio();
    }) as typeof fetch);
    assert.equal(bytes.byteLength, 4); assert.equal(calls.length, 2);
  });
  await test('Models without Uzbek, missing models or malformed catalogs never cause a paid TTS call', async () => {
    for (const body of [[{ model_id: 'eleven_v3', can_do_text_to_speech: true, languages: [{ language_id: 'en' }] }], [], {}, [{ model_id: 42 }]]) {
      let count = 0;
      await assert.rejects(nutqYarat(prov, 'Salom', { fetchFn: (async () => { count++; return Response.json(body); }) as typeof fetch }), NutqXatosi);
      assert.equal(count, 1);
    }
  });
  await test('Wrong key, permissions, quota and provider outage expose only safe user-facing messages and never switch voices', async () => {
    for (const status of [401, 402, 403, 404, 429, 500]) {
      let count = 0;
      await assert.rejects(nutqYarat(prov, 'Salom', { fetchFn: (async (url) => {
        count++; return String(url).endsWith('/models') ? models() : new Response('private-fixture-only secret raw provider payload', { status });
      }) as typeof fetch }), (e: unknown) => e instanceof NutqXatosi && !e.message.includes('private-fixture') && !e.message.includes('payload'));
      assert.equal(count, 2);
    }
  });
  await test('Optional fields rejected (422) -> one retry with the plain SDK-style body {text, model_id}; success is returned', async () => {
    const bodies: Record<string, unknown>[] = []; let calls = 0;
    const bytes = await nutqYarat(prov, 'Salom', { fetchFn: (async (url, init) => {
      calls++; if (String(url).endsWith('/models')) return models();
      bodies.push(JSON.parse(String(init?.body)));
      return bodies.length === 1
        ? Response.json({ detail: [{ loc: ['body', 'language_code'], msg: 'Model does not support language_code', type: 'value_error' }] }, { status: 422 })
        : audio();
    }) as typeof fetch });
    assert.equal(bytes.byteLength, 4); assert.equal(calls, 3);
    assert.ok('language_code' in bodies[0] && 'voice_settings' in bodies[0] && 'apply_text_normalization' in bodies[0]);
    assert.deepEqual(Object.keys(bodies[1]).sort(), ['model_id', 'text']);
  });
  await test('Failure messages show only HTTP status, provider status/message and request-id; raw/non-JSON payloads and our key never appear', async () => {
    const xato = async (status: number, body: BodyInit, headers: Record<string, string> = {}) => {
      let t = 0;
      try {
        await nutqYarat(prov, 'Salom', { fetchFn: (async (url) => { if (String(url).endsWith('/models')) return models(); t++; return new Response(body, { status, headers }); }) as typeof fetch });
      } catch (e) { return { m: (e as Error).message, t }; }
      throw new Error('xato kutilgan edi');
    };
    // 400 + JSON detail: ikkala urinish ham rad etadi -> sabab ko'rinadi (kalit "***" bo'ladi)
    const a = await xato(400, JSON.stringify({ detail: { status: 'voice_not_found', message: 'Voice uzbek_fixture_voice not found for key private-fixture-only' } }), { 'request-id': 'req_abc-123', 'content-type': 'application/json' });
    assert.equal(a.t, 2); assert.match(a.m, /\(400: voice_not_found: Voice uzbek_fixture_voice not found for key \*\*\*/); assert.match(a.m, /so'rov req_abc-123/); assert.ok(!a.m.includes('private-fixture'));
    // 401: kalit XATOmi yoki RUXSAT yetishmaydimi — endi ajratiladi
    const b = await xato(401, JSON.stringify({ detail: { status: 'missing_permissions', message: 'The API key is missing the permission text_to_speech' } }));
    assert.equal(b.t, 1); assert.match(b.m, /\(401: missing_permissions: The API key is missing the permission text_to_speech\)/);
    // 429 va 500: oddiy matn, sinov uchun JSON emas -> faqat holat
    for (const st of [429, 500]) { const c = await xato(st, 'secret raw provider payload private-fixture-only'); assert.match(c.m, new RegExp(`\\(${st}\\)$`)); assert.ok(!c.m.includes('payload') && !c.m.includes('private-fixture')); }
    // 422 massiv detail (FastAPI shakli): joy va xabar, birinchi urinish ham ko'rsatiladi
    const d = await xato(422, JSON.stringify({ detail: [{ loc: ['body', 'model_id'], msg: 'Field required' }] }));
    assert.equal(d.t, 2); assert.match(d.m, /\(422: body\.model_id Field required\)/);
  });
  await test('JSON, empty audio, oversized known-length and oversized chunked audio are refused', async () => {
    for (const r of [Response.json({}), new Response(null, { headers: { 'content-type': 'audio/mpeg' } }),
      new Response('x', { headers: { 'content-type': 'audio/mpeg', 'content-length': '3000001' } }),
      new Response(new Uint8Array(3_000_001), { headers: { 'content-type': 'audio/mpeg' } })]) {
      await assert.rejects(nutqYarat(prov, 'Salom', { fetchFn: fixture(() => r) }), NutqXatosi);
    }
  });
  await test('Body read shares provider deadline; slow chunked body is cancelled', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
    await assert.rejects(nutqYarat(prov, 'Salom', { kutishMs: 15, fetchFn: fixture(() => new Response(stream, { headers: { 'content-type': 'audio/mpeg' } })) }), (e: unknown) => e instanceof NutqXatosi && e.kod === 'vaqt');
    assert.equal(cancelled, true);
  });
  await test('Cancelled requests and path injection never contact a provider', async () => {
    const c = new AbortController(); c.abort(); let calls = 0;
    const f = (async () => { calls++; return audio(); }) as typeof fetch;
    await assert.rejects(nutqYarat(prov, 'Salom', { signal: c.signal, fetchFn: f }), NutqXatosi);
    await assert.rejects(nutqYarat({ ...prov, ovoz: '../other' }, 'Salom', { fetchFn: f }), NutqXatosi);
    assert.equal(calls, 0);
  });
  await test('Realtime retains OpenAI listening/tools but requests text only for ElevenLabs voice', () => {
    const soz = jonliSozlama({ ...env, OPENAI_API_KEY: 'openai-fixture' })!;
    const ctx: AgentKontekst = { userId: 'fixture', rol: 'ADMIN', fullName: 'Sinov', mahallaId: null, alifbo: 'lot', hozir: new Date() };
    const s = jonliSessiya(ctx, soz, ['Uyshun']);
    assert.equal(soz.tashqiOvoz, true); assert.deepEqual(s.output_modalities, ['text']);
    assert.equal(s.audio.input.turn_detection.interrupt_response, true); assert.ok(s.tools.some((t) => t.name === 'hisobotni_yukla'));
    assert.ok(!JSON.stringify(s).includes('private-fixture')); assert.ok(!JSON.stringify(s).includes('openai-fixture'));
    // ElevenLabs to'liq sozlanmagan bo'lsa jonli suhbat o'chmaydi: OpenAI o'z ovozi bilan gapiradi (zaxira)
    const ovozsiz = jonliSozlama({ ...env, OPENAI_API_KEY: 'openai-fixture', ELEVENLABS_VOICE_ID: '' })!;
    assert.ok(ovozsiz); assert.equal(ovozsiz.tashqiOvoz, false); assert.deepEqual(jonliSessiya(ctx, ovozsiz, ['Uyshun']).output_modalities, ['audio']);
    assert.equal(jonliSozlama({ ...env, OPENAI_API_KEY: 'openai-fixture' }, { mahalliyOvoz: true })!.tashqiOvoz, false);
  });
  console.log(`${tests}/${tests} ElevenLabs checks passed with fake HTTP; pronunciation is not evaluated.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
