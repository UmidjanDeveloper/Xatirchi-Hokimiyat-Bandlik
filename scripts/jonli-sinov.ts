import assert from 'node:assert/strict';
import { MAHALLALAR_BAZASI } from '../src/lib/mahallalar';
import { mahallaniTanla, type MahallaNomi } from '../src/lib/agent/mahalla';
import { jonliSozlama, jonliSessiya, jonliUlanish, jonliYop, jonliRuxsatYarat, jonliRuxsatOqi, JONLI_MUDDAT_MS } from '../src/lib/agent/jonli';
import { ovozTasdiqQarori } from '../src/lib/agent/ovoz-tasdiq';
import type { AgentKontekst } from '../src/lib/agent/turlar';

async function main() {
  let checks = 0;
  const test = async (m: string, f: () => unknown) => { await f(); checks++; console.log('OK', m); };
  const ctx: AgentKontekst = { userId: 'test-admin', rol: 'ADMIN', fullName: 'Sinov', mahallaId: null, alifbo: 'lot', hozir: new Date() };
  const kalit = 'only-a-test-session-secret-32-characters';
  const env = { NODE_ENV: 'test', OPENAI_API_KEY: 'test-only', AGENT_REALTIME: '1' } as NodeJS.ProcessEnv;
  await test('Realtime opt-in independent from TTS; cedar default; key absent/flag absent disables', () => {
    assert.equal(jonliSozlama({} as NodeJS.ProcessEnv), null);
    assert.equal(jonliSozlama({ NODE_ENV: 'test', OPENAI_API_KEY: 'test-only' } as NodeJS.ProcessEnv), null);
    assert.equal(jonliSozlama({ NODE_ENV: 'test', AGENT_REALTIME: '1' } as NodeJS.ProcessEnv), null);
    assert.ok(jonliSozlama({ ...env, AGENT_REALTIME: undefined, AGENT_TTS: '1' }));
    assert.equal(jonliSozlama({ ...env, AGENT_REALTIME: '0', AGENT_TTS: '1' }), null);
    assert.equal(jonliSozlama(env)?.voice, 'cedar');
    assert.equal(jonliSozlama({ ...env, AGENT_REALTIME_VOICE: 'not-a-voice' })?.voice, 'cedar');
  });
  const soz = jonliSozlama(env)!;
  await test('GA audio session has native audio, Uzbek transcription, barge-in, server role tools, no API key', () => {
    const s = jonliSessiya(ctx, soz, ['Uyshun', 'Qorabuloq']);
    assert.equal(s.type, 'realtime'); assert.equal(s.audio.input.transcription.language, 'uz');
    assert.equal(s.audio.input.turn_detection.interrupt_response, true); assert.equal(s.tracing, null);
    assert.ok(s.tools.some((t) => t.name === 'hisobotni_yukla'));
    assert.ok(s.instructions.includes('Qorabuloq')); assert.ok(!JSON.stringify(s).includes('test-only'));
    assert.ok(!jonliSessiya({ ...ctx, rol: 'BANDLIK' }, soz, []).tools.some((t) => t.name === 'tizim_holati'));
    assert.ok(!jonliSessiya({ ...ctx, oqishFaqat: true }, soz, []).tools.some((t) => t.name === 'amalni_taklif_qil'));
  });
  await test('Signed tool session binds user, role, mahalla, view mode, expiration and purpose', () => {
    const token = jonliRuxsatYarat(ctx, 'rtc_test', kalit);
    assert.ok(jonliRuxsatOqi(ctx, token, false, kalit));
    for (const c of [{ ...ctx, userId: 'other' }, { ...ctx, rol: 'HOKIM' as const }, { ...ctx, mahallaId: 'other' }, { ...ctx, oqishFaqat: true }]) assert.equal(jonliRuxsatOqi(c, token, false, kalit), null);
    assert.equal(jonliRuxsatOqi(ctx, token + 'x', false, kalit), null);
    const expired = { ...ctx, hozir: new Date(ctx.hozir.getTime() + JONLI_MUDDAT_MS) };
    assert.equal(jonliRuxsatOqi(expired, token, false, kalit), null);
    assert.ok(jonliRuxsatOqi(expired, token, true, kalit));
    assert.equal(jonliRuxsatOqi({ ...expired, hozir: new Date(expired.hozir.getTime() + 61_000) }, token, true, kalit), null);
  });
  await test('All 70 official mahallas resolve exactly in both alphabets; Cyrillic suffixes are removed', () => {
    const all = MAHALLALAR_BAZASI.map((m, i) => ({ id: `m${i}`, nomi: m.nomi, nomiKirill: m.nomiKirill }));
    assert.equal(all.length, 70);
    for (const m of all) for (const n of [m.nomi, m.nomiKirill, m.nomiKirill + ' маҳалласи']) {
      const r = mahallaniTanla(all, n); assert.equal(r.holat, 'topildi', n);
      if (r.holat === 'topildi') assert.equal(r.mahalla.id, m.id, n);
    }
    assert.equal(mahallaniTanla(all, 'Atlantida').holat, 'yoq');
  });
  await test('Misheard single candidate still requires clarification, ambiguous names return choices, unrelated names return no match', () => {
    const all: MahallaNomi[] = [
      { id: 'q', nomi: 'Qorabuloq', nomiKirill: 'Қорабулоқ' },
      { id: 'a', nomi: 'Yangiobod', nomiKirill: 'Янгиобод' },
      { id: 'b', nomi: 'Yangiabad', nomiKirill: 'Янгиабад' },
    ];
    const typo = mahallaniTanla(all, 'Qoraboloq');
    assert.equal(typo.holat, 'noaniq'); if (typo.holat === 'noaniq') assert.equal(typo.variantlar[0].id, 'q');
    assert.equal(mahallaniTanla(all, 'Yangiobad').holat, 'noaniq');
    assert.equal(mahallaniTanla(all, 'Toshkent').holat, 'yoq');
  });
  await test('Voice approval accepts only standalone explicit words, never yes/negated/quoted instructions', () => {
    assert.equal(ovozTasdiqQarori('Тасдиқлайман.'), 'ha'); assert.equal(ovozTasdiqQarori('amalni tasdiqlayman'), 'ha');
    assert.equal(ovozTasdiqQarori('Bekor qil!'), 'yoq');
    for (const m of ['ha', 'tasdiqlamayman', 'tasdiqlayman deb ayt', 'u tasdiqlayman dedi', 'tasdiqlaymanmi', 'yo‘q, tasdiqlayman emas']) assert.equal(ovozTasdiqQarori(m), null);
  });
  await test('Unified WebRTC server API: multipart SDP/session, fixed provider, valid SDP + call ID response', async () => {
    const r = await jonliUlanish('v=0\r\nmock-offer', jonliSessiya(ctx, soz, ['Uyshun']), soz.kalit, {
      fetchFn: (async (url, init) => {
        assert.equal(url, 'https://api.openai.com/v1/realtime/calls'); assert.ok(init?.body instanceof FormData);
        assert.equal(init.body.get('sdp'), 'v=0\r\nmock-offer');
        assert.equal(JSON.parse(String(init.body.get('session'))).audio.output.voice, 'cedar');
        return new Response('v=0\r\nmock-answer', { headers: { location: '/v1/realtime/calls/rtc_test' } });
      }) as typeof fetch,
    });
    assert.equal(r.call, 'rtc_test');
  });
  await test('Provider refusal, malformed SDP, missing call ID and abort all fail without exposing provider payload', async () => {
    for (const r of [new Response('secret-detail', { status: 401 }), new Response('not-sdp', { headers: { location: '/v1/realtime/calls/rtc_test' } }), new Response('v=0')]) {
      await assert.rejects(jonliUlanish('v=0 mock', jonliSessiya(ctx, soz, []), soz.kalit, { fetchFn: (async () => r) as typeof fetch }), /Jonli/);
    }
    const ctrl = new AbortController(); ctrl.abort();
    await assert.rejects(jonliUlanish('v=0 mock', jonliSessiya(ctx, soz, []), soz.kalit, { signal: ctrl.signal, fetchFn: (async (_, init) => { init?.signal?.throwIfAborted(); throw new Error('unexpected'); }) as typeof fetch }));
    await assert.rejects(jonliYop('../elsewhere', soz.kalit));
  });
  console.log(`${checks}/${checks} live voice contract checks passed; no actual provider audio requested.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
