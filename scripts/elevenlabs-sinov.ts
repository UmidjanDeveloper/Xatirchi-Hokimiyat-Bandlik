/** Real provider adapter/config with fake HTTP; no paid calls or real keys. */
import assert from 'node:assert/strict';
import { ELEVENLABS_ODATIY_MODEL, nutqProvayderi, nutqUlanishi, nutqYarat, NutqXatosi } from '../src/lib/agent/nutq';
import { elevenlabsModeliniAniqla, uzbekModeliniTanla, uzbekTiliMi } from '../src/lib/agent/elevenlabs';
import { matnniOvozga, ttsSozlama } from '../src/lib/agent/tts';
import { jonliSozlama, jonliSessiya } from '../src/lib/agent/jonli';
import type { AgentKontekst } from '../src/lib/agent/turlar';

async function main() {
  let tests = 0;
  const test = async (name: string, fn: () => unknown) => { await fn(); tests++; console.log('OK', name); };
  const env = { NODE_ENV: 'test', AGENT_TTS: '1', ELEVENLABS_API_KEY: 'private-fixture-only', ELEVENLABS_VOICE_ID: 'uzbek_fixture_voice' } as NodeJS.ProcessEnv;
  const prov = nutqProvayderi(env)!;
  // Hisob katalogi: v4 Turbo hujjatlarda o'zbekchani "uzb" deb yozadi; v3 shu hisobda o'zbekchasiz; "other" TTS emas
  const models = () => Response.json([
    { model_id: 'eleven_v4_turbo', can_do_text_to_speech: true, languages: [{ language_id: 'uzb', name: 'Uzbek' }, { language_id: 'en' }] },
    { model_id: 'eleven_v3', can_do_text_to_speech: true, languages: [{ language_id: 'en' }] },
    { model_id: 'other' },
  ]);
  const audio = () => new Response(new Uint8Array([0x49, 0x44, 0x33, 1]), { headers: { 'content-type': 'audio/mpeg' } });
  const fixture = (post: () => Response | Promise<Response> = audio): typeof fetch => (async (url) => String(url).endsWith('/models') ? models() : post()) as typeof fetch;
  await test('ElevenLabs automatically selected; requires opt-in/key/Voice ID; explicit OpenAI preserved', () => {
    assert.equal(prov.provayder, 'elevenlabs'); assert.equal(prov.model, 'eleven_v4_turbo'); assert.equal(prov.model, ELEVENLABS_ODATIY_MODEL);
    assert.equal(nutqProvayderi({ ...env, ELEVENLABS_MODEL_ID: 'eleven_v4' })?.model, 'eleven_v4');
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
      assert.equal(d.language_code, 'uz'); assert.equal(d.model_id, 'eleven_v4_turbo'); assert.equal(d.voice_settings.stability, 0.5);
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
  await test('Uzbek is recognized in every catalog spelling (uz, uzb, uz-UZ, name Uzbek); other languages are not', () => {
    for (const l of [{ language_id: 'uz' }, { language_id: 'uzb' }, { language_id: 'UZB' }, { language_id: 'uz-UZ' }, { language_id: 'uz_Latn' }, { language_id: 'x1', name: 'Uzbek' }, { language_id: 'x2', name: ' Uzbek (Latin)' }]) assert.equal(uzbekTiliMi(l), true, JSON.stringify(l));
    for (const l of [{ language_id: 'en' }, { language_id: 'ru' }, { language_id: 'uk' }, { language_id: 'uzu' }, { language_id: 'kk', name: 'Kazakh' }, { language_id: '' }]) assert.equal(uzbekTiliMi(l), false, JSON.stringify(l));
  });
  await test('Configured model without Uzbek is replaced by an Uzbek-capable catalog model (Turbo first); an Uzbek-capable configured model is never replaced', () => {
    const m = (id: string, tillar: string[], tts = true) => ({ model_id: id, can_do_text_to_speech: tts, languages: tillar.map((language_id) => ({ language_id })) });
    const katalog = [m('eleven_v3', ['en']), m('eleven_v4', ['uzb']), m('eleven_v4_turbo', ['uzb']), m('eleven_zeta', ['uz'])];
    assert.deepEqual(uzbekModeliniTanla(katalog, 'eleven_v3'), { model: 'eleven_v4_turbo', almashtirildi: true, sozlangan: 'eleven_v3' });
    assert.deepEqual(uzbekModeliniTanla(katalog, 'eleven_v4'), { model: 'eleven_v4', almashtirildi: false, sozlangan: 'eleven_v4' });
    assert.equal(uzbekModeliniTanla(katalog.filter((x) => x.model_id !== 'eleven_v4_turbo'), 'eleven_v3')?.model, 'eleven_v4');
    assert.equal(uzbekModeliniTanla(katalog.filter((x) => x.model_id === 'eleven_zeta'), 'eleven_v3')?.model, 'eleven_zeta'); // noma'lum nom: alifbo bo'yicha birinchisi
    assert.equal(uzbekModeliniTanla([m('eleven_v4_turbo', ['uzb'], false)], 'eleven_v3'), null); // TTS emas
    assert.equal(uzbekModeliniTanla([m('eleven_v3', ['en'])], 'eleven_v3'), null);
    assert.equal(uzbekModeliniTanla([m('bad id/../x', ['uz'])], 'eleven_v3'), null); // xavfsiz bo'lmagan ID URL/JSON ga o'tmaydi
  });
  await test('Paid TTS request uses the model resolved from the account catalog (v3 configured without Uzbek -> v4 Turbo); explicit working model is kept', async () => {
    const tanlangan: string[] = [];
    const f = (async (url, init) => {
      if (String(url).endsWith('/models')) return models();
      tanlangan.push(JSON.parse(String(init?.body)).model_id); return audio();
    }) as typeof fetch;
    await nutqYarat({ ...prov, model: 'eleven_v3' }, 'Salom', { fetchFn: f });
    await nutqYarat(prov, 'Salom', { fetchFn: f });
    assert.deepEqual(tanlangan, ['eleven_v4_turbo', 'eleven_v4_turbo']);
    const t = await elevenlabsModeliniAniqla({ ...prov, model: 'eleven_v3' }, AbortSignal.timeout(2000), (async () => models()) as typeof fetch);
    assert.deepEqual(t, { model: 'eleven_v4_turbo', almashtirildi: true, sozlangan: 'eleven_v3' });
  });
  await test('Model choice is remembered for the real fetch (one catalog request per hour), never for injected fetch, never after failure', async () => {
    const asl = globalThis.fetch; let n = 0;
    const kalitli = { ...prov, kalit: 'cache-fixture-key' };
    try {
      globalThis.fetch = (async () => { n++; return models(); }) as typeof fetch;
      assert.equal((await elevenlabsModeliniAniqla(kalitli, AbortSignal.timeout(2000))).model, 'eleven_v4_turbo');
      assert.equal((await elevenlabsModeliniAniqla(kalitli, AbortSignal.timeout(2000))).model, 'eleven_v4_turbo');
      assert.equal(n, 1);
      await elevenlabsModeliniAniqla({ ...kalitli, kalit: 'other-fixture-key' }, AbortSignal.timeout(2000));
      assert.equal(n, 2);
      globalThis.fetch = (async () => { n++; return new Response('x', { status: 403 }); }) as typeof fetch;
      await assert.rejects(elevenlabsModeliniAniqla({ ...kalitli, kalit: 'denied-fixture-key' }, AbortSignal.timeout(2000)), NutqXatosi);
      await assert.rejects(elevenlabsModeliniAniqla({ ...kalitli, kalit: 'denied-fixture-key' }, AbortSignal.timeout(2000)), NutqXatosi);
      assert.equal(n, 4);
    } finally { globalThis.fetch = asl; }
  });
  await test('ELEVENLABS_KATALOG_TEKSHIRUVI=0: model catalog is not requested; the configured model goes straight to TTS (language_code=uz still sent); default keeps the check', async () => {
    assert.equal(nutqProvayderi(env)?.katalogTekshir, true);
    assert.equal(nutqProvayderi({ ...env, ELEVENLABS_KATALOG_TEKSHIRUVI: '1' })?.katalogTekshir, true);
    const ochiq = nutqProvayderi({ ...env, ELEVENLABS_KATALOG_TEKSHIRUVI: '0', ELEVENLABS_MODEL_ID: 'eleven_v4' })!;
    assert.equal(ochiq.katalogTekshir, false);
    const urls: string[] = []; const bodies: Record<string, unknown>[] = [];
    const f = (async (url, init) => { urls.push(String(url)); bodies.push(JSON.parse(String(init?.body))); return audio(); }) as typeof fetch;
    assert.equal((await nutqYarat(ochiq, 'Salom', { fetchFn: f })).byteLength, 4);
    assert.equal(urls.length, 1); assert.ok(!urls[0].endsWith('/models'));
    assert.equal(bodies[0].model_id, 'eleven_v4'); assert.equal(bodies[0].language_code, 'uz');
    // katalog o'chirilgan bo'lsa ham xavfsiz bo'lmagan model ID rad etiladi
    await assert.rejects(nutqYarat({ ...ochiq, model: 'bad id' }, 'Salom', { fetchFn: f }), NutqXatosi);
    assert.equal(urls.length, 1);
    // MP3 adapter ham opt-out sozlamasini yo'qotmasin (oqim mos kelmasa shu yo'lga o'tadi).
    urls.length = 0;
    const opts = { ...env, ELEVENLABS_KATALOG_TEKSHIRUVI: '0' };
    assert.equal((await matnniOvozga('Salom', ttsSozlama(opts)!, undefined, f)).byteLength, 4);
    assert.equal(urls.length, 1); assert.ok(!urls[0].endsWith('/models'));
    // ElevenLabs o'zi rad etsa (o'zbekcha qo'llanmaydi) — xato, til olib tashlanib qayta urinilmaydi
    const rad = (async (url) => { urls.push(String(url)); return Response.json({ detail: { status: 'unsupported_language', message: 'Model does not support language_code uz' } }, { status: 422 }); }) as typeof fetch;
    urls.length = 0;
    await assert.rejects(nutqYarat(ochiq, 'Salom', { fetchFn: rad }), (e: unknown) => e instanceof NutqXatosi && /unsupported_language/.test(e.message));
    assert.equal(urls.length, 1);
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
  await test('Rejected Uzbek settings never retry without language; later requests retain Uzbek', async () => {
    const bodies: Record<string, unknown>[] = []; let calls = 0;
    const f = (async (url, init) => {
      calls++; if (String(url).endsWith('/models')) return models();
      bodies.push(JSON.parse(String(init?.body)));
      return bodies.length === 1
        ? Response.json({ detail: [{ loc: ['body', 'language_code'], msg: 'Model does not support language_code', type: 'value_error' }] }, { status: 422 })
        : audio();
    }) as typeof fetch;
    await assert.rejects(nutqYarat(prov, 'Salom', { fetchFn: f }), NutqXatosi);
    assert.equal(bodies.length, 1);
    const bytes = await nutqYarat(prov, 'Qorabuloq mahallasi', { fetchFn: f });
    assert.equal(bytes.byteLength, 4); assert.equal(calls, 4);
    assert.ok(bodies.every((b) => b.language_code === 'uz' && b.voice_settings));
    assert.ok(bodies.every((b) => !('apply_text_normalization' in b)));
  });
  await test('Failure messages show only HTTP status, provider status/message and request-id; raw/non-JSON payloads and our key never appear', async () => {
    const xato = async (status: number, body: BodyInit, headers: Record<string, string> = {}) => {
      let t = 0;
      try {
        await nutqYarat(prov, 'Salom', { fetchFn: (async (url) => { if (String(url).endsWith('/models')) return models(); t++; return new Response(body, { status, headers }); }) as typeof fetch });
      } catch (e) { return { m: (e as Error).message, t }; }
      throw new Error('xato kutilgan edi');
    };
    // 400 + JSON detail: qayta so‘rov yuborilmaydi -> sabab ko'rinadi (kalit "***" bo'ladi)
    const a = await xato(400, JSON.stringify({ detail: { status: 'voice_not_found', message: 'Voice uzbek_fixture_voice not found for key private-fixture-only' } }), { 'request-id': 'req_abc-123', 'content-type': 'application/json' });
    assert.equal(a.t, 1); assert.match(a.m, /\(400: voice_not_found: Voice uzbek_fixture_voice not found for key \*\*\*/); assert.match(a.m, /so'rov req_abc-123/); assert.ok(!a.m.includes('private-fixture'));
    // 401: kalit XATOmi yoki RUXSAT yetishmaydimi — endi ajratiladi
    const b = await xato(401, JSON.stringify({ detail: { status: 'missing_permissions', message: 'The API key is missing the permission text_to_speech' } }));
    assert.equal(b.t, 1); assert.match(b.m, /\(401: missing_permissions: The API key is missing the permission text_to_speech\)/);
    // 429 va 500: oddiy matn, sinov uchun JSON emas -> faqat holat
    for (const st of [429, 500]) { const c = await xato(st, 'secret raw provider payload private-fixture-only'); assert.match(c.m, new RegExp(`\\(${st}\\)$`)); assert.ok(!c.m.includes('payload') && !c.m.includes('private-fixture')); }
    // 422 massiv detail (FastAPI shakli): joy va xabar ko‘rsatiladi
    const d = await xato(422, JSON.stringify({ detail: [{ loc: ['body', 'model_id'], msg: 'Field required' }] }));
    assert.equal(d.t, 1); assert.match(d.m, /\(422: body\.model_id Field required\)/);
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
