/**
 * FAQAT SINOV: OpenAI so'rovlarini soxta javob bilan almashtiradi.
 * Ishlatish: NODE_OPTIONS="--require ./scripts/brauzer/soxta-openai.cjs" npx next start -p 3100
 * (OPENAI_API_KEY ga istalgan soxta qiymat bering). Javoblar ketma-ket `/tmp/stt-rejim.json`
 * dan o'qiladi, har so'rov `/tmp/stt-mock.log` ga yoziladi (kalit YOZILMAYDI).
 * Foydalanadi: scripts/brauzer/stt-brauzer.mjs. Ishlab chiqarishda ISHLATILMAYDI.
 */
const fs = require('fs');
const orig = globalThis.fetch;
const REJIM = '/tmp/stt-rejim.json';
const LOG = '/tmp/stt-mock.log';
globalThis.fetch = async (url, init) => {
  const u = String(url && url.url ? url.url : url);
  if (u.startsWith('https://api.openai.com/v1/chat/completions')) {
    return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'Soxta model javobi.' }, finish_reason: 'stop' }], usage: { total_tokens: 12 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.startsWith('https://api.openai.com/v1/audio/transcriptions')) {
    const f = init.body;
    const maydonlar = {};
    for (const [k, v] of f.entries()) if (typeof v === 'string') maydonlar[k] = v;
    const file = f.get('file');
    const buf = Buffer.from(await file.arrayBuffer());
    let wav = null;
    if (buf.length > 44 && buf.toString('latin1', 0, 4) === 'RIFF') {
      wav = { chastota: buf.readUInt32LE(24), kanal: buf.readUInt16LE(22), bit: buf.readUInt16LE(34), soniya: +(buf.readUInt32LE(40) / buf.readUInt32LE(28)).toFixed(2), bayt: buf.length };
      fs.writeFileSync('/tmp/stt-oxirgi.wav', buf);
    }
    let rejim = { javoblar: [{ status: 200, json: { text: 'xatlov qanday ketyapti' } }], i: 0 };
    try { rejim = JSON.parse(fs.readFileSync(REJIM, 'utf8')); } catch {}
    const j = rejim.javoblar[Math.min(rejim.i || 0, rejim.javoblar.length - 1)];
    rejim.i = (rejim.i || 0) + 1;
    try { fs.writeFileSync(REJIM, JSON.stringify(rejim)); } catch {}
    fs.appendFileSync(LOG, JSON.stringify({ t: Date.now(), auth: (init.headers && init.headers.authorization) ? 'Bearer ***' : 'YO\'Q', maydonlar, faylNomi: file.name, wav, javob: j.status }) + '\n');
    return new Response(JSON.stringify(j.json || {}), { status: j.status, headers: { 'content-type': 'application/json' } });
  }
  return orig(url, init);
};
