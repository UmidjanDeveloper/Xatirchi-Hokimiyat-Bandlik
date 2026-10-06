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
    assert.equal(jonliSozlama({ ...env, OPENAI_API_KEY: 'openai-fixture', ELEVENLABS_VOICE_ID: '' }), null);
  });
  console.log(`${tests}/${tests} ElevenLabs checks passed with fake HTTP; pronunciation is not evaluated.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
