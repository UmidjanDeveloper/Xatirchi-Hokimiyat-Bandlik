/**
 * Gemini Live (jonli suhbat) + ElevenLabs: server qatlami va protokol sinovi.
 * Haqiqiy Gemini/ElevenLabs'ga HECH QANDAY so'rov yuborilmaydi (soxta fetch va soxta WebSocket).
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { GEMINI_ODATIY_MODEL, GeminiXatosi, geminiSetup, geminiSozlama, geminiSxema, geminiToken, jonliProvayderi, jonliZaxiraBormi } from '../src/lib/agent/gemini';
import { geminiSoketniTekshir } from '../src/lib/agent/gemini-tekshir';
import {
  GapBolgich, GEMINI_AUDIO_TURI, asbobIdsiniTozala, geminiAsbobJavobi, geminiAudioXabari, geminiMatnXabari,
  geminiWsManziliTogrimi, geminiXabarOqi, pcm16Base64,
} from '../src/lib/agent/gemini-protokol';
import { jonliRuxsatOqi, jonliRuxsatYarat, jonliSessiya, jonliSozlama, JONLI_MUDDAT_MS } from '../src/lib/agent/jonli';
import { NutqXatosi, nutqZaxirasi } from '../src/lib/agent/nutq';
import { elevenlabsHolatiniTozala, ovozMavjud, ovozZanjiri } from '../src/lib/agent/tts';
import { openaiZaxiraniTekshir } from '../src/lib/agent/openai-tekshir';
import { modelAsboblari } from '../src/lib/agent/asboblar';
import type { AgentKontekst } from '../src/lib/agent/turlar';

const KALIT = 'AIza-test-only-gemini-private-key-0123456789';
const EL_KALIT = 'el-test-only-key';
const ENV = {
  NODE_ENV: 'test', GEMINI_API_KEY: KALIT, AGENT_TTS: '1', ELEVENLABS_API_KEY: EL_KALIT, ELEVENLABS_VOICE_ID: 'voice_test_1',
} as unknown as NodeJS.ProcessEnv;
const ctx: AgentKontekst = { userId: 'admin-test', rol: 'ADMIN', fullName: 'Sinov', mahallaId: null, alifbo: 'lot', hozir: new Date('2030-04-11T09:00:00Z') };

const sinovlar: [string, () => unknown | Promise<unknown>][] = [];
const test = (nom: string, f: () => unknown | Promise<unknown>) => sinovlar.push([nom, f]);
test('Provider rad javobi jim qolmaydi; qisman transkript tasdiq deb olinmaydi', () => {
  assert.deepEqual(geminiXabarOqi({ error: { message: KALIT } }), [{ t: 'xato' }]);
  assert.deepEqual(geminiXabarOqi({ serverContent: { inputTranscription: { text: 'tasdiqlayman' } } }), [{ t: 'kirish', matn: 'tasdiqlayman' }]);
  assert.deepEqual(geminiXabarOqi({ serverContent: { inputTranscription: { text: ' demadim', finished: true } } }), [{ t: 'kirish', matn: ' demadim', tamom: true }]);
  assert.deepEqual(geminiXabarOqi({ serverContent: { inputTranscription: { finished: true } } }), [{ t: 'kirish', matn: '', tamom: true }]);
});

/* ───────────── sozlama ───────────── */
test('Sozlama: Gemini mustaqil ishlaydi, tashqi ovoz ixtiyoriy; odatiy native audio model, v1alpha, transkript rejimi', () => {
  const s = geminiSozlama(ENV)!;
  assert.ok(s); assert.equal(s.model, GEMINI_ODATIY_MODEL); assert.equal(s.surum, 'v1alpha'); assert.equal(s.chiqish, 'transkript');
  assert.equal(s.baza, 'https://generativelanguage.googleapis.com');
  assert.equal(geminiSozlama({ NODE_ENV: 'test' } as NodeJS.ProcessEnv), null);
  assert.equal(geminiSozlama({ ...ENV, GEMINI_API_KEY: '  ' }), null);
  assert.equal(geminiSozlama({ ...ENV, ELEVENLABS_API_KEY: undefined, OPENAI_API_KEY: 'x' })?.tashqiOvoz, true);
  assert.equal(geminiSozlama({ ...ENV, ELEVENLABS_VOICE_ID: undefined })?.tashqiOvoz, false);
  assert.equal(geminiSozlama({ ...ENV, AGENT_TTS: '0' })?.tashqiOvoz, false);
});
test('Sozlama: o‘chirish tugmalari, model/versiya/rejim qiymatlari, noto‘g‘ri model rad etiladi', () => {
  assert.equal(geminiSozlama({ ...ENV, AGENT_REALTIME: '0' }), null);
  assert.equal(geminiSozlama({ ...ENV, AGENT_JONLI_PROVAYDER: 'openai' }), null);
  assert.equal(geminiSozlama({ ...ENV, GEMINI_LIVE_MODEL: 'gemini-2.5-flash-native-audio-preview-12-2025' })?.model, 'gemini-2.5-flash-native-audio-preview-12-2025');
  for (const yomon of ['../x', 'a b', 'm?x=1', 'models/x', '']) {
    const r = geminiSozlama({ ...ENV, GEMINI_LIVE_MODEL: yomon });
    if (yomon === '') assert.equal(r?.model, GEMINI_ODATIY_MODEL); else assert.equal(r, null, yomon);
  }
  assert.equal(geminiSozlama({ ...ENV, GEMINI_API_SURUM: 'v1beta' })?.surum, 'v1beta');
  assert.equal(geminiSozlama({ ...ENV, GEMINI_API_SURUM: 'v9' })?.surum, 'v1alpha');
  assert.equal(geminiSozlama({ ...ENV, GEMINI_LIVE_CHIQISH: 'transkript' })?.chiqish, 'transkript');
});
test('Sozlama: sinov bazasi faqat ishlab chiqarishdan tashqarida va faqat 127.0.0.1', () => {
  const yo = { ...ENV, GEMINI_API_BAZA_SINOV: 'http://127.0.0.1:4555' };
  assert.equal(geminiSozlama(yo)?.baza, 'http://127.0.0.1:4555');
  assert.equal(geminiSozlama({ ...yo, NODE_ENV: 'production' } as NodeJS.ProcessEnv)?.baza, 'https://generativelanguage.googleapis.com');
  assert.equal(geminiSozlama({ ...ENV, GEMINI_API_BAZA_SINOV: 'http://evil.example:80' })?.baza, 'https://generativelanguage.googleapis.com');
  assert.equal(geminiSozlama({ ...ENV, GEMINI_API_BAZA_SINOV: 'https://127.0.0.1:4555' })?.baza, 'https://generativelanguage.googleapis.com');
});
test('Provayder tanlovi: Gemini (to‘liq bo‘lsa) -> OpenAI -> yo‘q', () => {
  assert.equal(jonliProvayderi(ENV), 'gemini');
  assert.equal(jonliProvayderi({ ...ENV, OPENAI_API_KEY: 'o', AGENT_REALTIME: undefined } as NodeJS.ProcessEnv), 'gemini');
  assert.equal(jonliProvayderi({ ...ENV, OPENAI_API_KEY: 'o', AGENT_JONLI_PROVAYDER: 'openai' } as NodeJS.ProcessEnv), 'openai');
  assert.equal(jonliProvayderi({ NODE_ENV: 'test', OPENAI_API_KEY: 'o', AGENT_REALTIME: '1' } as NodeJS.ProcessEnv), 'openai');
  assert.equal(jonliProvayderi({ NODE_ENV: 'test' } as NodeJS.ProcessEnv), null);
});

/* ───────────── asbob sxemasi va setup ───────────── */
const yomonKalit = (x: unknown, yol = ''): string[] => {
  if (typeof x !== 'object' || x === null) return [];
  const xatolar: string[] = [];
  for (const [k, v] of Object.entries(x)) {
    if (k === 'additionalProperties' || k === '$schema') xatolar.push(`${yol}.${k}`);
    if (k === 'type' && typeof v === 'string' && v !== v.toUpperCase()) xatolar.push(`${yol}.type=${v}`);
    xatolar.push(...yomonKalit(v, `${yol}.${k}`));
  }
  return xatolar;
};
test('Sxema: turlar KATTA harfda, additionalProperties yo‘q; hamma rol asboblari uchun', () => {
  assert.deepEqual(geminiSxema({ type: 'object', additionalProperties: false, required: ['a'], properties: { a: { type: 'string', enum: ['x'] }, b: { type: 'array', items: { type: 'integer', minimum: 1 } } } }), {
    type: 'OBJECT', required: ['a'], properties: { a: { type: 'STRING', enum: ['x'] }, b: { type: 'ARRAY', items: { type: 'INTEGER', minimum: 1 } } },
  });
  assert.deepEqual(geminiSxema(null), {});
  assert.equal(geminiSxema({ type: 'weird' }).type, 'TYPE_UNSPECIFIED');
  for (const rol of ['ADMIN', 'HOKIM', 'BANDLIK', 'BANDLIK_RAHBAR'] as const) {
    const t = modelAsboblari(rol, false);
    assert.ok(t.length > 3, rol);
    for (const a of t) assert.deepEqual(yomonKalit(geminiSxema(a.function.parameters)), [], `${rol}/${a.function.name}`);
  }
});
test('Setup: model nomi, AUDIO, ko‘rsatma (Hamroh + mahalla nomlari + Gemini qoidasi), asboblar rolga mos, kalit yo‘q', () => {
  const soz = geminiSozlama(ENV)!;
  const s = geminiSetup(ctx, soz, ['Uyshun', 'Qorabuloq']);
  assert.equal(s.model, `models/${GEMINI_ODATIY_MODEL}`);
  assert.deepEqual(s.generationConfig.responseModalities, ['AUDIO']);
  const matn = s.systemInstruction.parts[0].text;
  assert.match(matn, /Hamroh/); assert.match(matn, /Qorabuloq/); assert.match(matn, /GEMINI JONLI REJIMI/); assert.match(matn, /ElevenLabs/);
  const nomlar = s.tools![0].functionDeclarations.map((f) => f.name);
  assert.ok(nomlar.includes('hisobotni_yukla') && nomlar.includes('mahallani_top') && nomlar.includes('tizim_holati'));
  assert.ok(!geminiSetup({ ...ctx, rol: 'BANDLIK' }, soz, []).tools![0].functionDeclarations.some((f) => f.name === 'tizim_holati'));
  assert.ok(!geminiSetup({ ...ctx, oqishFaqat: true }, soz, []).tools![0].functionDeclarations.some((f) => f.name === 'amalni_taklif_qil'));
  assert.deepEqual(s.inputAudioTranscription.languageCodes, ['uz-UZ']); assert.ok(s.inputAudioTranscription.customVocabulary.includes('Qorabuloq')); assert.deepEqual(s.contextWindowCompression, { slidingWindow: {} }); assert.deepEqual(s.outputAudioTranscription, {});
  assert.ok(!JSON.stringify(s).includes(KALIT) && !JSON.stringify(s).includes(EL_KALIT));
  const t = geminiSetup(ctx, { ...soz, chiqish: 'transkript' }, []);
  assert.deepEqual(t.generationConfig.responseModalities, ['AUDIO']); assert.deepEqual(t.outputAudioTranscription, {});
});

/* ───────────── efemer token ───────────── */
const javobJSON = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json' } });
test('Token: rasmiy mijoz shaklidagi so‘rov (v1alpha/auth_tokens, x-goog-api-key, uses=1, qulflangan setup, fieldMask yo‘q)', async () => {
  const soz = geminiSozlama(ENV)!; const setup = geminiSetup(ctx, soz, ['Uyshun']);
  let url = '', init: RequestInit = {};
  const r = await geminiToken(setup, soz, { hozir: ctx.hozir, fetchFn: (async (u: string, i: RequestInit) => { url = u; init = i; return javobJSON({ name: 'auth_tokens/abcDEF123_-xyz' }); }) as unknown as typeof fetch });
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens');
  assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'error');
  const h = init.headers as Record<string, string>;
  assert.equal(h['x-goog-api-key'], KALIT); assert.equal(h['content-type'], 'application/json');
  const b = JSON.parse(String(init.body));
  assert.equal(b.uses, 1); assert.equal(b.fieldMask, undefined);
  assert.equal(Date.parse(b.newSessionExpireTime) - ctx.hozir.getTime(), 90_000);
  assert.equal(Date.parse(b.expireTime) - ctx.hozir.getTime(), JONLI_MUDDAT_MS + 90_000);
  assert.deepEqual(b.bidiGenerateContentSetup, JSON.parse(JSON.stringify(setup)));
  const u = new URL(r.wsUrl);
  assert.equal(u.protocol, 'wss:'); assert.equal(u.hostname, 'generativelanguage.googleapis.com');
  assert.equal(u.pathname, '/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained');
  assert.equal(u.searchParams.get('access_token'), 'auth_tokens/abcDEF123_-xyz');
  assert.ok(!r.wsUrl.includes(KALIT)); assert.ok(geminiWsManziliTogrimi(r.wsUrl));
  // v1beta tanlovi yo'lga ta'sir qiladi
  const v = await geminiToken(setup, { ...soz, surum: 'v1beta' }, { fetchFn: (async (u: string) => { url = u; return javobJSON({ name: 'auth_tokens/abcDEF123_-xyz' }); }) as unknown as typeof fetch });
  assert.match(url, /\/v1beta\/auth_tokens$/); assert.match(v.wsUrl, /v1beta\.GenerativeService/); assert.ok(geminiWsManziliTogrimi(v.wsUrl));
});
test('Token xatolari: sababi aniq, kalit hech qachon xabarda yo‘q, noto‘g‘ri javob rad etiladi', async () => {
  const soz = geminiSozlama(ENV)!; const setup = geminiSetup(ctx, soz, []);
  const bilan = (f: () => Response | Promise<Response>) => geminiToken(setup, soz, { fetchFn: (async () => f()) as unknown as typeof fetch });
  const xato = async (f: () => Response | Promise<Response>) => { try { await bilan(f); } catch (e) { return e as GeminiXatosi; } throw new Error('xato kutilgan edi'); };
  const k401 = await xato(() => javobJSON({ error: { message: `API key not valid ${KALIT}` } }, 401));
  assert.equal(k401.kod, 'kalit'); assert.ok(!k401.message.includes(KALIT)); assert.match(k401.message, /401/);
  assert.equal((await xato(() => javobJSON({}, 403))).kod, 'ruxsat');
  assert.equal((await xato(() => javobJSON({}, 429))).kod, 'chegara');
  const b400 = await xato(() => javobJSON({ error: { message: 'models/xyz is not found for API version v1alpha' } }, 400));
  assert.equal(b400.kod, 'sozlama'); assert.match(b400.message, /not found/);
  assert.equal((await xato(() => javobJSON({}, 500))).kod, 'javob');
  assert.equal((await xato(() => javobJSON({ name: 'noto‘g‘ri' }))).kod, 'javob');
  assert.equal((await xato(() => javobJSON({ name: 'auth_tokens/x' }))).kod, 'javob');
  assert.equal((await xato(() => new Response('<html>', { status: 200 }))).kod, 'javob');
  assert.equal((await xato(() => { throw new TypeError('fetch failed ' + KALIT); })).kod, 'tarmoq');
  const t = await xato(() => { throw Object.assign(new Error('x'), { name: 'TimeoutError' }); });
  assert.equal(t.kod, 'vaqt');
  assert.ok(![k401, b400, t].some((e) => e.message.includes(KALIT)));
});

/* ───────────── ruxsatnoma ───────────── */
test('Ruxsatnoma: provayder imzo ichida; eski (provayderisiz) token OpenAI hisoblanadi; boshqa xodim/rol rad', () => {
  const kalit = 'only-a-test-session-secret-32-characters';
  const g = jonliRuxsatYarat(ctx, 'gemini_abc', kalit, 'gemini');
  assert.equal(jonliRuxsatOqi(ctx, g, false, kalit)?.prov, 'gemini');
  assert.equal(jonliRuxsatOqi(ctx, jonliRuxsatYarat(ctx, 'rtc_x', kalit), false, kalit)?.prov, 'openai');
  // Eski format: prov maydoni yo'q
  const eski = { v: 1, id: '11111111-1111-4111-8111-111111111111', call: 'rtc_old', userId: ctx.userId, rol: ctx.rol, mahallaId: null, oqishFaqat: false, muddat: ctx.hozir.getTime() + 1000 };
  const yuk = Buffer.from(JSON.stringify(eski)).toString('base64url');
  const imzo = createHmac('sha256', kalit).update(`hamroh-jonli-v1:${yuk}`).digest('base64url');
  assert.equal(jonliRuxsatOqi(ctx, `${yuk}.${imzo}`, false, kalit)?.prov, 'openai');
  assert.equal(jonliRuxsatOqi({ ...ctx, userId: 'boshqa' }, g, false, kalit), null);
  assert.equal(jonliRuxsatOqi({ ...ctx, rol: 'HOKIM' }, g, false, kalit), null);
  assert.equal(jonliRuxsatOqi(ctx, g.replace(/.$/, 'x'), false, kalit), null);
});

/* ───────────── protokol: server xabarlari ───────────── */
test('Protokol: setupComplete, matn qismlari, thought tashlanadi, transkripsiya, to‘xtatish, yakun', () => {
  assert.deepEqual(geminiXabarOqi('{"setupComplete":{}}'), [{ t: 'tayyor' }]);
  assert.deepEqual(geminiXabarOqi({ serverContent: { modelTurn: { parts: [{ text: 'Assalomu ' }, { text: 'alaykum.' }, { text: 'ichki', thought: true }, { inlineData: { data: 'AAA', mimeType: 'audio/pcm' } }] } } }),
    [{ t: 'matn', matn: 'Assalomu ' }, { t: 'matn', matn: 'alaykum.' }]);
  assert.deepEqual(geminiXabarOqi({ serverContent: { inputTranscription: { text: 'xatlov qanday' }, turnComplete: true } }), [{ t: 'kirish', matn: 'xatlov qanday' }, { t: 'yakun' }]);
  assert.deepEqual(geminiXabarOqi({ serverContent: { interrupted: true } }), [{ t: 'toxtadi' }]);
  assert.deepEqual(geminiXabarOqi({ goAway: { timeLeft: '30s' } }), [{ t: 'ketadi' }]);
});
test('Protokol: transkript rejimi matnni outputTranscription’dan oladi (modelTurn ovozi/matni emas)', () => {
  const x = { serverContent: { outputTranscription: { text: 'Salom.' }, modelTurn: { parts: [{ text: 'IGNORE' }] } } };
  assert.deepEqual(geminiXabarOqi(x, 'transkript'), [{ t: 'matn', matn: 'Salom.' }]);
  assert.deepEqual(geminiXabarOqi(x, 'matn'), [{ t: 'matn', matn: 'IGNORE' }]);
});
test('Protokol: asbob chaqiruvi/bekor qilish; noto‘g‘ri nom yoki id’siz chaqiruv tashlanadi', () => {
  const r = geminiXabarOqi({ toolCall: { functionCalls: [
    { id: 'function-call-1', name: 'hisobotni_yukla', args: { format: 'excel' } },
    { id: 'x', name: 'bad name!', args: {} }, { name: 'korsatkichlar', args: {} }, { id: 'f2', name: 'korsatkichlar' },
  ] } });
  assert.deepEqual(r, [{ t: 'asbob', id: 'function-call-1', nomi: 'hisobotni_yukla', args: { format: 'excel' } }, { t: 'asbob', id: 'f2', nomi: 'korsatkichlar', args: {} }]);
  assert.deepEqual(geminiXabarOqi({ toolCallCancellation: { ids: ['a', 5, 'b'] } }), [{ t: 'asbob_bekor', idlar: ['a', 'b'] }]);
  assert.equal(asbobIdsiniTozala('fn call/1:2'), 'fn_call_1_2'); assert.equal(asbobIdsiniTozala('').length > 0, true);
});
test('Protokol: buzuq, juda katta yoki begona xabar hech qachon istisno chiqarmaydi', () => {
  for (const x of ['{buzuq', '', 'null', '[]', '5', undefined, null, 42, { serverContent: 5 }, { toolCall: { functionCalls: 'x' } }, { serverContent: { modelTurn: { parts: 'x' } } }]) {
    assert.deepEqual(geminiXabarOqi(x as never), [], String(x));
  }
  assert.deepEqual(geminiXabarOqi('x'.repeat(500_000)), []);
  const uzun = geminiXabarOqi({ serverContent: { modelTurn: { parts: [{ text: 'a'.repeat(20_000) }] } } });
  assert.equal((uzun[0] as { matn: string }).matn.length, 8000);
});
test('Protokol: mijoz xabarlari shakli (setup, matn, audio, asbob javobi)', () => {
  assert.deepEqual(geminiMatnXabari('salom'), { realtimeInput: { text: 'salom' } });
  assert.deepEqual(geminiAudioXabari('AAA='), { realtimeInput: { audio: { data: 'AAA=', mimeType: 'audio/pcm;rate=16000' } } });
  assert.equal(GEMINI_AUDIO_TURI, 'audio/pcm;rate=16000');
  assert.deepEqual(geminiAsbobJavobi([{ id: 'f1', name: 'korsatkichlar', output: '{"a":1}' }]), { toolResponse: { functionResponses: [{ id: 'f1', name: 'korsatkichlar', response: { output: '{"a":1}' } }] } });
});
test('PCM: 16 bit little-endian, qirqish, uzunlik; base64 qayta o‘qiladi', () => {
  const b = Buffer.from(pcm16Base64(new Float32Array([0, 1, -1, 2, -2, 0.5])), 'base64');
  assert.equal(b.length, 12);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => b.readInt16LE(i * 2)), [0, 32767, -32768, 32767, -32768, 16384]);
  assert.equal(Buffer.from(pcm16Base64(new Float32Array(800)), 'base64').length, 1600);
  assert.equal(pcm16Base64(new Float32Array(0)), '');
  assert.equal(Buffer.from(pcm16Base64(new Float32Array(100_000).fill(0.1)), 'base64').length, 200_000);
});
test('WebSocket manzili: faqat wss + rasmiy host + qulflangan yo‘l', () => {
  const yaxshi = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=auth_tokens%2Fx';
  assert.ok(geminiWsManziliTogrimi(yaxshi));
  for (const yomon of [
    yaxshi.replace('wss:', 'ws:'), yaxshi.replace('generativelanguage.googleapis.com', 'evil.example'),
    yaxshi.replace('googleapis.com', 'googleapis.com:8443'), yaxshi.replace('wss://', 'wss://u:p@'),
    yaxshi.replace('BidiGenerateContentConstrained', 'BidiGenerateContent'), 'wss://generativelanguage.googleapis.com.evil.example/ws/x', 'javascript:alert(1)', '',
  ]) assert.equal(geminiWsManziliTogrimi(yomon), false, yomon);
});

/* ───────────── gap bo'lgich ───────────── */
const oqim = (b: GapBolgich, matn: string, qadam = 1): string[] => {
  const o: string[] = [];
  for (let i = 0; i < matn.length; i += qadam) o.push(...b.push(matn.slice(i, i + qadam)));
  o.push(...b.flush());
  return o;
};
test('Gap bo‘lgich: birinchi gap darhol, qisqa gaplar birlashadi, belgi-belgi oqim ham xuddi shunday', () => {
  const m = 'Assalomu alaykum, Umidjon aka. Xatirchi bo‘yicha xatlov 83,5 foiz bajarilgan. Eng orqada Qorabuloq mahallasi turibdi. Xo‘p.';
  const bir = oqim(new GapBolgich(), m, m.length);
  const belgi = oqim(new GapBolgich(), m, 1);
  assert.deepEqual(belgi, bir);
  assert.ok(bir.length >= 2 && bir.length <= 5);
  assert.equal(bir.join(' ').replace(/\s+/g, ' '), m);
  const b = new GapBolgich();
  assert.deepEqual(b.push('Assalomu alaykum, Umidjon aka. Xatir'), ['Assalomu alaykum, Umidjon aka.']);
});
test('Gap bo‘lgich: sonlar (83,5 / 12.5) bo‘linmaydi; tugamagan gap kutiladi; oxirgi nuqta flush’da', () => {
  const b = new GapBolgich(10, 5);
  assert.deepEqual(b.push('Natija 12.5 foiz va 83,5 foiz'), []);
  assert.deepEqual(b.push(' bo‘ldi.'), []); // nuqtadan keyin bo'sh joy hali yo'q
  assert.deepEqual(b.flush(), ['Natija 12.5 foiz va 83,5 foiz bo‘ldi.']);
  assert.deepEqual(b.flush(), []);
});
test('Gap bo‘lgich: kirill matn, yangi qator chegarasi, juda uzun gap bo‘lib beriladi, bo‘lak soni cheklangan', () => {
  const k = oqim(new GapBolgich(), 'Ассалому алайкум, Умиджон ака. Хатлов яхши кетяпти. Қорабулоқ орқада.', 3);
  assert.ok(k.length >= 2); assert.equal(k.join(' '), 'Ассалому алайкум, Умиджон ака. Хатлов яхши кетяпти. Қорабулоқ орқада.');
  assert.equal(oqim(new GapBolgich(), 'Birinchi qator uchun yetarli matn bor\n\nIkkinchi qator ham yetarli matn bor').length, 2);
  const uzun = oqim(new GapBolgich(), 'so‘z '.repeat(300));
  assert.ok(uzun.length >= 3 && uzun.every((x) => x.length <= 440), String(uzun.map((x) => x.length)));
  const kop = oqim(new GapBolgich(), 'Bu yetarlicha uzun gap bo‘lib turibdi. '.repeat(40));
  assert.ok(kop.length <= 5, String(kop.length)); assert.ok(kop.join(' ').length >= 1400);
  const r = new GapBolgich(); r.push('Yetarlicha uzun birinchi gap. Keyingi'); r.reset(); assert.deepEqual(r.flush(), []);
});

/* ───────────── administrator tekshiruvi (soxta WebSocket) ───────────── */
class Soxta extends EventTarget {
  static soxta: Soxta | null = null; static senariy: (s: Soxta) => void = () => {};
  yuborilgan: string[] = []; yopildi = false;
  constructor(public url: string) { super(); Soxta.soxta = this; queueMicrotask(() => { this.dispatchEvent(new Event('open')); Soxta.senariy(this); }); }
  send(d: string) { this.yuborilgan.push(d); }
  close() { this.yopildi = true; }
  xabar(d: unknown) { this.dispatchEvent(Object.assign(new Event('message'), { data: typeof d === 'string' ? d : JSON.stringify(d) })); }
  yop(code: number, reason: string) { this.dispatchEvent(Object.assign(new Event('close'), { code, reason })); }
}
const WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=auth_tokens%2Fx';
const tekshir = (o: Partial<Parameters<typeof geminiSoketniTekshir>[0]> = {}) => geminiSoketniTekshir({ wsUrl: WS, setup: { model: 'models/m' }, chiqish: 'matn', Soket: Soxta as never, kutishMs: 400, ...o });
test('Tekshiruv: muvaffaqiyat — birinchi xabar setup, keyin savol; ikki qadam OK, birinchi matn vaqti ko‘rsatiladi', async () => {
  Soxta.senariy = (s) => {
    queueMicrotask(() => {
      s.xabar({ setupComplete: {} });
      queueMicrotask(() => { s.xabar({ serverContent: { modelTurn: { parts: [{ text: 'Assalomu alaykum.' }] } } }); s.xabar({ serverContent: { turnComplete: true } }); });
    });
  };
  const q = await tekshir();
  assert.deepEqual(q.map((x) => [x.nom, x.ok]), [['Gemini WebSocket + sozlama', true], ['Gemini javobi', true]]);
  assert.match(q[1].izoh, /Assalomu alaykum/);
  assert.deepEqual(JSON.parse(Soxta.soxta!.yuborilgan[0]), { setup: { model: 'models/m' } });
  assert.match(JSON.parse(Soxta.soxta!.yuborilgan[1]).realtimeInput.text, /salom/i);
  assert.ok(Soxta.soxta!.yopildi);
});
test('Tekshiruv: Gemini ulanishni setup paytida yopsa — sabab (kod+matn) ko‘rsatiladi, kalit tozalanadi', async () => {
  Soxta.senariy = (s) => { queueMicrotask(() => s.yop(1007, `models/xyz is not found ${KALIT}`)); };
  const q = await tekshir();
  assert.equal(q.length, 1); assert.equal(q[0].ok, false);
  assert.match(q[0].izoh, /1007/); assert.match(q[0].izoh, /not found/); assert.ok(!q[0].izoh.includes(KALIT));
});
test('Tekshiruv: setupComplete kelmasa vaqt tugaydi; javob bo‘sh bo‘lsa xato; noto‘g‘ri manzil/WebSocket yo‘q', async () => {
  Soxta.senariy = () => {};
  const t = await tekshir({ kutishMs: 80 });
  assert.equal(t[0].ok, false); assert.match(t[0].izoh, /setupComplete/);
  Soxta.senariy = (s) => { queueMicrotask(() => { s.xabar({ setupComplete: {} }); queueMicrotask(() => s.xabar({ serverContent: { turnComplete: true } })); }); };
  const b = await tekshir();
  assert.deepEqual(b.map((x) => x.ok), [true, false]); assert.match(b[1].izoh, /bo‘sh/);
  assert.equal((await tekshir({ wsUrl: 'wss://evil.example/x' }))[0].ok, false);
  const yoq = await geminiSoketniTekshir({ wsUrl: WS, setup: {}, chiqish: 'matn', Soket: undefined, kutishMs: 50 });
  assert.equal(yoq.length, 1);
});

/* ───────────── ZAXIRA: Gemini / ElevenLabs ishlamasa OpenAI ───────────── */
const OPENAI_KALIT = 'sk-test-only-openai-private-key-0123456789';
const OPENAI_ENV = { ...ENV, OPENAI_API_KEY: OPENAI_KALIT } as unknown as NodeJS.ProcessEnv;
const mp3 = () => new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
const bosh = () => elevenlabsHolatiniTozala();
const modellar = () => Response.json([{ model_id: 'eleven_v3', can_do_text_to_speech: true, languages: [{ language_id: 'uz' }] }]);
const elModel = (u: unknown) => String(u).includes('elevenlabs.io') && String(u).endsWith('/models');

test('Zaxira sozlamasi: OpenAI faqat kalit + AGENT_TTS=1 bo‘lsa; ElevenLabs asosiy bo‘lsa zaxira, OpenAI asosiy bo‘lsa yo‘q', () => {
  assert.equal(nutqZaxirasi(ENV), null, 'OpenAI kaliti yo‘q');
  assert.equal(nutqZaxirasi({ ...OPENAI_ENV, AGENT_TTS: '0' } as NodeJS.ProcessEnv), null);
  assert.equal(nutqZaxirasi(OPENAI_ENV)?.provayder, 'openai');
  assert.equal(nutqZaxirasi({ ...OPENAI_ENV, AGENT_TTS_PROVIDER: 'openai' } as NodeJS.ProcessEnv), null, 'asosiy o‘zi OpenAI: zaxira o‘zi bilan bir xil bo‘lardi');
  assert.equal(nutqZaxirasi({ ...OPENAI_ENV, AGENT_TTS_PROVIDER: 'elevenlabs', ELEVENLABS_VOICE_ID: undefined } as NodeJS.ProcessEnv)?.provayder, 'openai', 'ElevenLabs to‘liq emas: zaxira ishlaydi');
  assert.equal(ovozMavjud(ENV), true); assert.equal(ovozMavjud({ NODE_ENV: 'test' } as NodeJS.ProcessEnv), false);
  assert.equal(ovozMavjud({ ...OPENAI_ENV, ELEVENLABS_VOICE_ID: undefined } as NodeJS.ProcessEnv), true, 'faqat zaxira bor');
});
test('After one fallback the conversation can pin OpenAI voice without another ElevenLabs request', async () => {
  bosh(); const urls: string[] = [];
  const f = (async (url: unknown) => { urls.push(String(url)); return mp3(); }) as typeof fetch;
  const n = await ovozZanjiri('Keyingi javob.', { env: OPENAI_ENV, fetchFn: f, zaxira: true });
  assert.equal(n.provayder, 'openai'); assert.equal(n.zaxira, true); assert.equal(urls.length, 1); assert.ok(urls[0].includes('api.openai.com'));
});
test('Jonli zaxira: Gemini asosiy va OpenAI sozlangan bo‘lsa mavjud; OpenAI jonli suhbati o‘z ovozida (ElevenLabs bo‘lsa ham)', () => {
  assert.equal(jonliZaxiraBormi(ENV), false, 'OpenAI yo‘q');
  assert.equal(jonliZaxiraBormi(OPENAI_ENV), true);
  assert.equal(jonliZaxiraBormi({ ...OPENAI_ENV, AGENT_JONLI_PROVAYDER: 'openai' } as NodeJS.ProcessEnv), true, 'OpenAI asosiy bo‘lsa Gemini zaxirasi bor');
  assert.equal(jonliZaxiraBormi({ ...OPENAI_ENV, AGENT_REALTIME: '0' } as NodeJS.ProcessEnv), false);
  assert.equal(jonliSozlama(OPENAI_ENV)?.tashqiOvoz, true, 'oddiy OpenAI yo‘li: matn + ElevenLabs ovozi');
  const z = jonliSozlama(OPENAI_ENV, { mahalliyOvoz: true })!;
  assert.equal(z.tashqiOvoz, false);
  assert.deepEqual(jonliSessiya(ctx, z, ['Uyshun']).output_modalities, ['audio']);
  assert.ok(!JSON.stringify(jonliSessiya(ctx, z, ['Uyshun'])).includes(OPENAI_KALIT));
  assert.equal(jonliProvayderi(OPENAI_ENV), 'gemini', 'Gemini ishlasa Gemini');
});
test('Jonli: ElevenLabs sozlanmagan bo‘lsa Gemini o‘z ovozida ishlaydi (jonli suhbat o‘chib qolmaydi)', () => {
  const elsiz = { NODE_ENV: 'test', GEMINI_API_KEY: KALIT, OPENAI_API_KEY: OPENAI_KALIT, AGENT_TTS: '1', AGENT_TTS_PROVIDER: 'elevenlabs' } as unknown as NodeJS.ProcessEnv;
  assert.ok(geminiSozlama(elsiz));
  assert.equal(jonliProvayderi(elsiz), 'gemini');
  assert.equal(jonliSozlama(elsiz)?.tashqiOvoz, false);
  assert.equal(jonliProvayderi({ ...elsiz, AGENT_TTS_PROVIDER: 'nomalum' } as NodeJS.ProcessEnv), 'gemini');
});
test('Ovoz zanjiri: ElevenLabs ishlasa zaxira KERAK emas va OpenAI’ga so‘rov ketmaydi', async () => {
  bosh(); const chaqiruv: string[] = [];
  const f = (async (u: string) => { chaqiruv.push(String(u)); return elModel(u) ? modellar() : mp3(); }) as unknown as typeof fetch;
  const n = await ovozZanjiri('Salom.', { env: OPENAI_ENV, fetchFn: f });
  assert.equal(n.provayder, 'elevenlabs'); assert.equal(n.zaxira, false);
  assert.ok(chaqiruv.every((u) => u.includes('elevenlabs.io')), chaqiruv.join());
});
test('Ovoz zanjiri: ElevenLabs yiqilsa OpenAI o‘qiydi; xom javob, kalit va ElevenLabs matni chiqmaydi', async () => {
  bosh(); const chaqiruv: string[] = [];
  const f = (async (u: string) => {
    chaqiruv.push(String(u));
    if (elModel(u)) return modellar();
    return String(u).includes('elevenlabs.io') ? new Response(JSON.stringify({ detail: { status: 'quota_exceeded', message: 'You have run out of credits' } }), { status: 401 }) : mp3();
  }) as unknown as typeof fetch;
  const n = await ovozZanjiri('Salom.', { env: OPENAI_ENV, fetchFn: f });
  assert.equal(n.provayder, 'openai'); assert.equal(n.zaxira, true); assert.equal(n.audio.byteLength, 4);
  assert.match(n.sabab ?? '', /401|quota/i); assert.ok(!(n.sabab ?? '').includes(EL_KALIT));
  assert.ok(chaqiruv.some((u) => u.includes('api.openai.com/v1/audio/speech')));
});
test('Ovoz zanjiri: ikkalasi ham yiqilsa xabarda ikkalasining sababi bor, lekin OpenAI xom matni va kalitlar yo‘q', async () => {
  bosh();
  const f = (async (u: string) => elModel(u) ? modellar() : String(u).includes('elevenlabs.io')
    ? new Response('{"detail":{"status":"voice_not_found","message":"voice missing"}}', { status: 404 })
    : new Response(`{"error":{"message":"Incorrect API key provided: ${OPENAI_KALIT}"}}`, { status: 401 })) as unknown as typeof fetch;
  const e = await ovozZanjiri('Salom.', { env: OPENAI_ENV, fetchFn: f }).then(() => null, (x) => x) as NutqXatosi;
  assert.ok(e instanceof NutqXatosi); assert.match(e.message, /voice_not_found|404/); assert.match(e.message, /OpenAI zaxira/); assert.match(e.message, /HTTP 401/);
  for (const g of [OPENAI_KALIT, EL_KALIT, 'Incorrect API key']) assert.ok(!e.message.includes(g), g);
});
test('Ovoz zanjiri: foydalanuvchi bekor qilsa zaxiraga o‘tilmaydi; zaxirasiz ElevenLabs xatosi o‘zgarmaydi', async () => {
  bosh(); let n = 0;
  const f = (async () => { n++; return new Response('x', { status: 500 }); }) as unknown as typeof fetch;
  const c = new AbortController(); c.abort();
  await assert.rejects(ovozZanjiri('Salom.', { env: OPENAI_ENV, fetchFn: f, signal: c.signal }));
  assert.equal(n, 0);
  const e = await ovozZanjiri('Salom.', { env: ENV, fetchFn: f }).then(() => null, (x) => x);
  assert.ok(e instanceof NutqXatosi); assert.ok(!/zaxira/i.test(e.message)); assert.ok(n >= 1);
});
test('Ovoz zanjiri: ElevenLabs ketma-ket yiqilsa 60 soniya unga so‘rov yuborilmaydi, keyin yana sinaladi', async () => {
  bosh(); let hozir = 1_000_000; const eleven: number[] = [];
  const f = (async (u: string) => {
    if (elModel(u)) return modellar();
    if (String(u).includes('elevenlabs.io')) { eleven.push(hozir); return new Response('{}', { status: 503 }); }
    return mp3();
  }) as unknown as typeof fetch;
  const t = () => hozir;
  for (let i = 0; i < 2; i++) assert.equal((await ovozZanjiri('Salom.', { env: OPENAI_ENV, fetchFn: f, hozir: t })).zaxira, true);
  const sinovlar2 = eleven.length;
  const o = await ovozZanjiri('Salom.', { env: OPENAI_ENV, fetchFn: f, hozir: t });
  assert.equal(o.zaxira, true); assert.equal(eleven.length, sinovlar2, 'tanaffusda ElevenLabs’ga so‘rov yo‘q'); assert.match(o.sabab ?? '', /o‘tkazib/);
  hozir += 61_000;
  await ovozZanjiri('Salom.', { env: OPENAI_ENV, fetchFn: f, hozir: t });
  assert.ok(eleven.length > sinovlar2, 'tanaffusdan keyin yana sinaladi');
  bosh();
});
test('ElevenLabs javobsiz qolsa OpenAI Vercel muddati tugashidan oldin ishga tushadi', async () => {
  bosh(); const start = Date.now(); let backup = 0;
  const f: typeof fetch = async (u, init) => {
    if (String(u).includes('elevenlabs.io')) return new Promise<Response>((_, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('fixture deadline', 'AbortError')), { once: true });
    });
    backup++; assert.ok(Date.now() - start < 12_000); init!.signal!.throwIfAborted(); return mp3();
  };
  const n = await ovozZanjiri('Salom.', { env: OPENAI_ENV, fetchFn: f });
  assert.equal(n.zaxira, true); assert.equal(backup, 1); assert.ok(Date.now() - start < 22_000);
  bosh();
});
test('Ovoz zanjiri: ElevenLabs sozlanmagan bo‘lsa to‘g‘ridan-to‘g‘ri OpenAI; hech narsa yo‘q bo‘lsa xato', async () => {
  bosh();
  const f = (async (u: string) => { assert.ok(String(u).includes('api.openai.com')); return mp3(); }) as unknown as typeof fetch;
  const n = await ovozZanjiri('Salom.', { env: { ...OPENAI_ENV, ELEVENLABS_VOICE_ID: undefined } as NodeJS.ProcessEnv, fetchFn: f });
  assert.equal(n.provayder, 'openai'); assert.equal(n.zaxira, true);
  await assert.rejects(ovozZanjiri('Salom.', { env: { NODE_ENV: 'test' } as NodeJS.ProcessEnv, fetchFn: f }), NutqXatosi);
});
test('OpenAI zaxira tekshiruvi: sozlanmagan / ishlaydi / 401 / 404 / 429 / tarmoq xatosi — kalitsiz, aniq izoh bilan', async () => {
  const yoq = await openaiZaxiraniTekshir({ NODE_ENV: 'test' } as NodeJS.ProcessEnv);
  assert.equal(yoq.ok, false); assert.match(yoq.izoh, /OPENAI_API_KEY/);
  const javob = (st: number) => (async () => new Response('{}', { status: st })) as unknown as typeof fetch;
  const ok = await openaiZaxiraniTekshir(OPENAI_ENV, javob(200)); assert.equal(ok.ok, true); assert.match(ok.izoh, /gpt-realtime/);
  assert.match((await openaiZaxiraniTekshir(OPENAI_ENV, javob(401))).izoh, /401/);
  assert.match((await openaiZaxiraniTekshir(OPENAI_ENV, javob(404))).izoh, /ruxsat yo‘q/);
  assert.match((await openaiZaxiraniTekshir(OPENAI_ENV, javob(429))).izoh, /kvota|balans/);
  const tarmoq = await openaiZaxiraniTekshir(OPENAI_ENV, (async () => { throw new Error(`socket ${OPENAI_KALIT}`); }) as unknown as typeof fetch);
  assert.equal(tarmoq.ok, false); assert.ok(!tarmoq.izoh.includes(OPENAI_KALIT));
  for (const q of [ok, yoq]) assert.ok(!JSON.stringify(q).includes(OPENAI_KALIT));
});

async function main() {
  let xatolar = 0;
  for (const [nom, f] of sinovlar) {
    try { await f(); console.log(`OK   ${nom}`); } catch (e) { xatolar++; console.error(`XATO ${nom}: ${(e as Error).message}`); }
  }
  console.log(`Gemini: ${sinovlar.length - xatolar}/${sinovlar.length} sinov o‘tdi.`);
  process.exitCode = xatolar ? 1 : 0;
  process.exit();
}
void main();
