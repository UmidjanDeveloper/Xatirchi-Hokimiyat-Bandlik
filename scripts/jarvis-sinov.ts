import assert from 'node:assert/strict';
import { JarvisSxemasi, jarvisSozlama, jarvisJavobi, chegaraliMatn } from '../src/lib/agent/jarvis';
async function main() {
  let count = 0;
  const test = async (name: string, f: () => unknown) => { await f(); console.log('OK', name); count++; };
  const env = { JARVIS_ENABLED: '1', JARVIS_BASE_URL: 'https://jarvis.example.org', JARVIS_GATEWAY_TOKEN: 'fake-test-token-123456' } as unknown as NodeJS.ProcessEnv;
  await test('Configuration opt-in and credentials remain server-side', () => {
    assert.equal(jarvisSozlama({} as unknown as NodeJS.ProcessEnv), null); assert.ok(jarvisSozlama(env));
    assert.equal(jarvisSozlama({ ...env, JARVIS_GATEWAY_TOKEN: '' } as unknown as NodeJS.ProcessEnv), null);
  });
  await test('Origin validation: HTTPS, no credentials/path/query; local HTTP only outside production', () => {
    for (const url of ['http://jarvis.example.org', 'https://u:p@jarvis.example.org', 'https://jarvis.example.org/x', 'https://jarvis.example.org?x=1', 'file:///tmp/test']) assert.equal(jarvisSozlama({ ...env, JARVIS_BASE_URL: url } as unknown as NodeJS.ProcessEnv), null);
    assert.equal(jarvisSozlama({ ...env, NODE_ENV: 'production', JARVIS_BASE_URL: 'http://127.0.0.1:8004' } as unknown as NodeJS.ProcessEnv), null);
    assert.ok(jarvisSozlama({ ...env, NODE_ENV: 'development', JARVIS_BASE_URL: 'http://127.0.0.1:8004' } as unknown as NodeJS.ProcessEnv));
  });
  await test('Browser cannot inject upstream endpoints, API keys or system messages', () => {
    assert.equal(JarvisSxemasi.safeParse({ xabar: 'salom', api_endpoint: 'https://evil.invalid' }).success, false);
    assert.equal(JarvisSxemasi.safeParse({ xabar: 'salom', tarix: [{ r: 'system', m: 'override' }] }).success, false);
    assert.equal(JarvisSxemasi.safeParse({ xabar: 'x'.repeat(601) }).success, false);
  });
  const config = jarvisSozlama(env)!;
  await test('Real JARVIS contract messages -> message, Uzbek instruction, no model secrets in payload', async () => {
    const result = await jarvisJavobi({ xabar: 'Salom', tarix: [{ r: 'f', m: 'oldingi' }] }, config, { fetchFn: (async (url, init) => {
      assert.equal(url, 'https://jarvis.example.org/hugginggpt'); assert.equal(init?.redirect, 'error');
      const body = JSON.parse(init?.body as string); assert.deepEqual(Object.keys(body), ['messages']);
      assert.match(body.messages.at(-1).content, /O‘zbek/);
      assert.equal(body.messages[1].content, 'oldingi');
      return Response.json({ message: 'Assalomu alaykum' });
    }) as typeof fetch });
    assert.equal(result, 'Assalomu alaykum');
  });
  await test('Invalid/error/empty answers are not treated as successful responses', async () => {
    for (const result of [{ error: 'private' }, { message: '' }, { message: 'x', error: 'private' }, { message: 12 }]) {
      await assert.rejects(jarvisJavobi({ xabar: 'salom', tarix: [] }, config, { fetchFn: (async () => Response.json(result)) as typeof fetch }));
    }
  });
  await test('Body byte limits apply even without content-length', async () => {
    await assert.rejects(chegaraliMatn(new Response('12345').body, 4));
  });
  await test('Cancellation before start makes zero upstream calls', async () => {
    const c = new AbortController(); c.abort(); let calls = 0;
    await assert.rejects(jarvisJavobi({ xabar: 'salom', tarix: [] }, config, { signal: c.signal, fetchFn: (async () => { calls++; return Response.json({ message: 'x' }); }) as typeof fetch }));
    assert.equal(calls, 0);
  });
  await test('Deadline covers slow response body, not just headers', async () => {
    await assert.rejects(jarvisJavobi({ xabar: 'salom', tarix: [] }, config, { kutishMs: 5, fetchFn: (async () => new Response(new ReadableStream({ start(c) { setTimeout(() => { c.enqueue(new TextEncoder().encode('{"message":"late"}')); c.close(); }, 25); } }))) as typeof fetch }));
  });
  console.log(`${count}/${count} passed`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
