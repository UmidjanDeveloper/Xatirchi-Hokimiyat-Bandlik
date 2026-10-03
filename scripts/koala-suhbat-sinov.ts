/** Koala: xotira, model uzilishi va o'zbekcha nutq. Haqiqiy AI so'rovlari yuborilmaydi. */
import assert from 'node:assert/strict';
import { xotiragaQosh, xotiraniOqi, xotiraniQadoqla, ENG_UZUN_XOTIRA } from '../src/lib/agent/xotira';
import { haqiqiyModel, agentProvayderi, ModelXatosi } from '../src/lib/agent/model';
import { nutqProvayderi, nutqYarat, nutqMatni, NutqXatosi } from '../src/lib/agent/nutq';
import { suhbatniYurit } from '../src/lib/agent/sikl';
import type { AgentKontekst } from '../src/lib/agent/turlar';
import { nutqParchasi } from '../src/lib/agent/matnlar';

const ctx: AgentKontekst = { userId: 'sinov-hokim', rol: 'HOKIM', fullName: 'Sinov', mahallaId: null, alifbo: 'lot', hozir: new Date('2026-10-03T10:00:00Z') };
const kalit = 'xotira-sinov-kaliti-kamida-32-belgidan-uzun';
const manbalar = [{ nom: 'Хатлов', vaqt: ctx.hozir.toISOString() }];
const xotira = xotiragaQosh([], 'korsatkichlar', { hudud: 'Qorabuloq', xatlov: { xonadon: 32 } }, manbalar, ctx.hozir);
const token = xotiraniQadoqla(ctx, xotira, kalit)!;
const prov = { provayder: 'openai' as const, kalit: 'sk-test-1234567890abcdefghijklmno', baza: 'https://api.openai.test/v1', model: 'gpt-4.1-mini' };
const javob = () => Response.json({ choices: [{ message: { content: 'Xatlov davom etmoqda.' }, finish_reason: 'stop' }], usage: { total_tokens: 42 } });

function fetchYarat(javoblar: ((init: RequestInit) => Response)[]) {
  const tanalar: Record<string, unknown>[] = [];
  const fetchFn = (async (_url: unknown, init: RequestInit) => {
    tanalar.push(JSON.parse(String(init.body)));
    return javoblar[Math.min(tanalar.length - 1, javoblar.length - 1)](init);
  }) as typeof fetch;
  return { fetchFn, tanalar };
}
const xato = (status: number, message: string) => () => Response.json({ error: { message } }, { status });
const audio = () => new Response(new Uint8Array([73, 68, 51, 1]), { headers: { 'content-type': 'audio/mpeg' } });
const sorov = { xabarlar: [{ role: 'user' as const, content: 'Salom' }], asboblar: [] };

const sinovlar: [string, () => unknown | Promise<unknown>][] = [
  ['Xotira: raqam, hudud va manba keyingi savolgacha saqlanadi', () => assert.deepEqual(xotiraniOqi(ctx, token, kalit), xotira)],
  ['Xotira: raqamni mijoz o‘zgartirsa imzo mos kelmaydi', () => {
    const [yuk, imzo] = token.split('.');
    const q = JSON.parse(Buffer.from(yuk, 'base64url').toString());
    q.yozuvlar[0].natija = '{"xonadon":999999}';
    assert.deepEqual(xotiraniOqi(ctx, `${Buffer.from(JSON.stringify(q)).toString('base64url')}.${imzo}`, kalit), []);
  }],
  ['Xotira boshqa xodimga yoki boshqa rolga o‘tmaydi', () => {
    assert.deepEqual(xotiraniOqi({ ...ctx, userId: 'boshqa' }, token, kalit), []);
    assert.deepEqual(xotiraniOqi({ ...ctx, rol: 'ADMIN' }, token, kalit), []);
  }],
  ['Xotira 30 daqiqada eskiradi, boshqa kalit va buzuq token rad etiladi', () => {
    assert.deepEqual(xotiraniOqi({ ...ctx, hozir: new Date(ctx.hozir.getTime() + 30 * 60_000) }, token, kalit), []);
    assert.deepEqual(xotiraniOqi(ctx, token, `${kalit}x`), []);
    assert.deepEqual(xotiraniOqi(ctx, 'x'.repeat(ENG_UZUN_XOTIRA + 1), kalit), []);
    assert.deepEqual(xotiraniOqi(ctx, 'x.x.x', kalit), []);
  }],
  ['Xotiraga sahifa, fuqaro qidiruvi, tasdiq va xato natijasi kirmaydi', () => {
    for (const asbob of ['sahifani_och', 'hisobotni_yukla', 'amalni_taklif_qil']) {
      assert.deepEqual(xotiragaQosh([], asbob, { qidiruv: 'Fuqaro' }, manbalar, ctx.hozir), []);
    }
    assert.deepEqual(xotiragaQosh([], 'korsatkichlar', { xato: 'topilmadi' }, [], ctx.hozir), []);
  }],
  ['Xotira hajmi chegaralangan, turli mahallalar qoladi, takror yangilanadi', () => {
    let x = xotira;
    for (let i = 0; i < 10; i++) x = xotiragaQosh(x, 'korsatkichlar', { hudud: `Mahalla ${i}` }, manbalar, ctx.hozir);
    assert.equal(x.length, 4);
    assert.match(x[0].natija, /Mahalla 6/);
    x = xotiragaQosh(x, 'korsatkichlar', { hudud: 'Mahalla 9' }, manbalar, ctx.hozir);
    assert.equal(x.length, 4);
    assert.deepEqual(xotiragaQosh([], 'korsatkichlar', { matn: 'a'.repeat(6001) }, manbalar, ctx.hozir), []);
    assert.ok(xotiraniQadoqla(ctx, x, kalit)!.length <= ENG_UZUN_XOTIRA);
  }],
  ['Davomiy savolga tekshirilgan asbob natijasi va vaqti uzatiladi; eski amal bajarilmaydi', async () => {
    const n = await suhbatniYurit({ ctx, tarix: [{ r: 'f', m: 'Qorabuloqda xatlov qanday?' }], xabar: 'Nega?', xotira,
      model: async (s) => {
        const oldingi = s.xabarlar.find((x) => x.role === 'tool');
        assert.ok(oldingi);
        const d = JSON.parse(oldingi.content!);
        assert.equal(d.oldingiNatija, true);
        assert.equal(d.malumot.hudud, 'Qorabuloq');
        assert.equal(d.malumot.xatlov.xonadon, 32);
        assert.equal(d.olinganVaqt, ctx.hozir.toISOString());
        assert.equal(s.xabarlar.at(-1)?.content, 'Nega?');
        return { xabar: { content: 'Bu avvalgi xatlov natijasi.' }, tokenlar: 10, tugash: 'stop' };
      },
    });
    assert.deepEqual(n.amallar, []);
    assert.deepEqual(n.xotira, xotira);
  }],
  ['Suhbat oldindan bekor qilinsa model chaqirilmaydi', async () => {
    const c = new AbortController(); c.abort();
    await assert.rejects(suhbatniYurit({ ctx, tarix: [], xabar: 'Salom', signal: c.signal, model: async () => { throw new Error('Chaqirilmasin'); } }), ModelXatosi);
  }],
  ['Model: odatiy suhbat modeli va foydalanuvchi sozlamalari', () => {
    assert.equal(agentProvayderi({ NODE_ENV: 'test', OPENAI_API_KEY: 'sinov' })?.model, 'gpt-4.1-mini');
    assert.equal(agentProvayderi({ NODE_ENV: 'test', OPENAI_API_KEY: 'sinov', OPENAI_MODEL: 'maxsus' })?.model, 'maxsus');
    assert.equal(agentProvayderi({ NODE_ENV: 'test', OPENAI_API_KEY: 'sinov', OPENAI_MODEL: 'maxsus', AGENT_MODEL: 'agent-maxsus' })?.model, 'agent-maxsus');
  }],
  ['Model: vaqtinchalik 503 dan keyin bitta qayta urinish va haqiqiy javob', async () => {
    const s = fetchYarat([xato(503, 'Unavailable'), javob]);
    const n = await haqiqiyModel(prov, s)!(sorov);
    assert.equal(n.tokenlar, 42); assert.equal(s.tanalar.length, 2);
  }],
  ['Model: hisob mablag‘i yoki kalit xatosi qayta chaqirilmaydi; kalit yashiriladi', async () => {
    const s = fetchYarat([xato(429, `insufficient_quota ${prov.kalit}`)]);
    await assert.rejects(haqiqiyModel(prov, s)!(sorov), (e: unknown) => e instanceof ModelXatosi && !e.message.includes(prov.kalit));
    assert.equal(s.tanalar.length, 1);
  }],
  ['Model: harorat va token parametrlari ketma-ket moslashadi', async () => {
    const s = fetchYarat([xato(400, 'temperature unsupported'), xato(400, 'max_completion_tokens unsupported'), javob]);
    await haqiqiyModel(prov, s)!(sorov);
    assert.equal(s.tanalar.length, 3);
    assert.equal(s.tanalar[1].temperature, undefined);
    assert.ok(Number(s.tanalar[2].max_tokens) >= 1600);
  }],
  ['Model: noto‘g‘ri asbob javobi xavfsiz rad etiladi', async () => {
    const s = fetchYarat([() => Response.json({ choices: [{ message: { tool_calls: [{ id: 'x', type: 'function', function: { name: 'korsatkichlar', arguments: {} } }] } }] })]);
    await assert.rejects(haqiqiyModel(prov, s)!(sorov), ModelXatosi);
  }],
  ['Model: sarlavha keldi, tana osilib qoldi — kutish chegarasi ishlaydi', async () => {
    const fetchFn = (async (_url: unknown, init: RequestInit) => new Response(new ReadableStream({
      start(c) { init.signal!.addEventListener('abort', () => c.error(new DOMException('Aborted', 'AbortError'))); },
    }), { headers: { 'content-type': 'application/json' } })) as typeof fetch;
    await assert.rejects(haqiqiyModel(prov, { fetchFn, kutishMs: 20 })!(sorov), (e: unknown) => e instanceof ModelXatosi && e.kod === 'vaqt');
  }],
  ['Nutq: Groq suhbatidan mustaqil, kalitsiz/o‘chiq xizmat yo‘q', () => {
    assert.equal(nutqProvayderi({ NODE_ENV: 'test' }), null);
    assert.equal(nutqProvayderi({ NODE_ENV: 'test', OPENAI_API_KEY: 'sinov', AGENT_TTS: '0' }), null);
    assert.equal(nutqProvayderi({ NODE_ENV: 'test', OPENAI_API_KEY: 'sinov', AGENT_PROVAYDER: 'groq', AGENT_TTS: '1' })?.ovoz, 'marin');
  }],
  ['Nutq: o‘zbek kirilli, foiz va belgilardan ravon matn', () => {
    const m = nutqMatni('**Қорабулоқ**: 83,5%. PDF ҳисобот.');
    assert.match(m, /Qorabuloq/); assert.match(m, /83,5 foiz/);
    assert.match(m, /pi di ef/); assert.doesNotMatch(m, /[А-Яа-я*]/);
  }],
  ['Uzun javobning ovozi gap o‘rtasida kesilmaydi, yozma davomiga ishora bor', () => {
    const m = nutqParchasi('Bu to‘liq jumla. '.repeat(180));
    assert.ok(m.length <= 2200);
    assert.match(m, /jumla\. Давомини/);
    assert.equal(nutqParchasi('Qisqa javob.'), 'Qisqa javob.');
  }],
  ['Nutq: audio qaytadi, o‘zbekcha talaffuz ko‘rsatmasi yuboriladi', async () => {
    const s = fetchYarat([audio]);
    const n = await nutqYarat({ kalit: prov.kalit, model: 'gpt-4o-mini-tts', ovoz: 'onyx' }, 'Ассалому алайкум', s);
    assert.equal(n.byteLength, 4); assert.match(String(s.tanalar[0].instructions), /Uzbek/);
    assert.equal(s.tanalar[0].input, 'Assalomu alaykum');
  }],
  ['Nutq: model yo‘q bo‘lsa tts-1 ga qaytadi, unga mos ovoz tanlanadi', async () => {
    const s = fetchYarat([xato(404, 'model not found'), audio]);
    await nutqYarat({ kalit: prov.kalit, model: 'noma’lum', ovoz: 'coral' }, 'Salom', s);
    assert.equal(s.tanalar[1].model, 'tts-1'); assert.equal(s.tanalar[1].voice, 'onyx');
    assert.equal(s.tanalar[1].instructions, undefined);
  }],
  ['Nutq: audio o‘rniga JSON yoki ortiqcha matn yuborilsa rad etiladi', async () => {
    const s = fetchYarat([() => Response.json({ xato: 'audio yo‘q' })]);
    const p = { kalit: prov.kalit, model: 'gpt-4o-mini-tts', ovoz: 'onyx' };
    await assert.rejects(nutqYarat(p, 'Salom', s), NutqXatosi);
    await assert.rejects(nutqYarat(p, 'a'.repeat(2201), s), NutqXatosi);
  }],
  ['Nutq: oldindan bekor qilingan javob provayderga yuborilmaydi', async () => {
    const c = new AbortController(); c.abort();
    const s = fetchYarat([audio]);
    await assert.rejects(nutqYarat({ kalit: prov.kalit, model: 'tts-1', ovoz: 'onyx' }, 'Salom', { ...s, signal: c.signal }), NutqXatosi);
    assert.equal(s.tanalar.length, 0);
  }],
];

async function main() {
  let xatolar = 0;
  for (const [nom, sinov] of sinovlar) {
    try { await sinov(); console.log(`OK   ${nom}`); }
    catch (e) { xatolar++; console.error(`XATO ${nom}: ${(e as Error).message}`); }
  }
  console.log(`Koala: ${sinovlar.length - xatolar}/${sinovlar.length} sinov o‘tdi.`);
  process.exitCode = xatolar ? 1 : 0;
}
void main();
