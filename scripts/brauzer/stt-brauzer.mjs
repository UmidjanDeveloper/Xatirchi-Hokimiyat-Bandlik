/**
 * ============================================================
 *  KOALA OVOZ: HAQIQIY MARSHRUT SINOVI (soxta OpenAI bilan)
 *
 *  iPhone'da yozuv serverga yetgan, lekin "Ovoz matnga aylanmadi" chiqqan edi.
 *  Bu sinov brauzerdan (iPhone belgisi, soxta mikrofon oqimi) HAQIQIY
 *  `/api/agent/ovoz` marshrutigacha boradi — kirish, limit, bazaga yozish —
 *  faqat OpenAI soxta (scripts/brauzer/soxta-openai.cjs).
 *
 *  Ishga tushirish:
 *    1. npm run build
 *    2. OPENAI_API_KEY=sk-soxta-sinov GROQ_API_KEY= AGENT_PROVAYDER= AI_PROVAYDER= \
 *         NODE_OPTIONS="--require ./scripts/brauzer/soxta-openai.cjs" npx next start -p 3100
 *    3. node scripts/brauzer/stt-brauzer.mjs
 *
 *  Talab: playwright-core, Chromium, `psql` va mahalliy baza (127.0.0.1:5433/bandlik,
 *  `tekshiruv_admin`/`tekshiruv_hokim`, parol Sinov2026x).
 *
 *  Tekshiradi: provayderga ketgan fayl haqiqiy WAV; til rad etilsa tilsiz qayta
 *  urinish; kalit/hisob/ruxsat/5xx xatolarida aniq sabab ([openai 429] belgisi
 *  faqat administratorga); qotib qolmaslik; muvaffaqiyatsiz yozuvning soniyalari
 *  QAYTARILISHI (bazadan o'qiladi).
 *
 *  Halollik: OpenAI'ning haqiqiy javoblari SINALMAYDI.
 * ============================================================
 */
import { ochish, tekshir, yakun } from './mikrofon-yordamchi.mjs';
import { writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const LOG = '/tmp/stt-mock.log';
const REJIM = '/tmp/stt-rejim.json';
const rejim = (javoblar) => { writeFileSync(REJIM, JSON.stringify({ javoblar, i: 0 })); if (existsSync(LOG)) rmSync(LOG); };
const log = () => (existsSync(LOG) ? readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((q) => JSON.parse(q)) : []);
const psql = (q) => execSync(`psql postgresql://postgres@127.0.0.1:5433/bandlik -tAc ${JSON.stringify(q)}`, { encoding: 'utf8' }).trim();
const ovozSoniya = (login) => Number(psql(`SELECT COALESCE((SELECT "ovozSoniya" FROM "AgentFoydalanish" WHERE "userId"=(SELECT id FROM "User" WHERE username='${login}') AND kun=(now() at time zone 'Asia/Tashkent')::date),0)`));
const tayyorMi = (h) => h.maskot === 'tayyor' && h.mikrofonIkon && !h.kvadrat;
const OPT = { iphone: true, ovoz: 'haqiqiy' };

console.log('── E1. Haqiqiy marshrut, provayder muvaffaqiyatli: matn → savol → javob; yuborilgan fayl haqiqiy WAV');
{
  rejim([{ status: 200, json: { text: 'xatlov qanday ketyapti' } }]);
  const oldin = ovozSoniya('tekshiruv_admin');
  const o = await ochish(OPT);
  await o.mik.click();
  const s = await o.kut((x) => x.xabarlar.length >= 3 && x.maskot === 'tayyor', 20000, 100);
  const l = log();
  tekshir('E1a. savol xabar bo‘ldi va model javobi keldi', s.xabarlar.some((x) => /xatlov qanday ketyapti/i.test(x)) && s.xabarlar.some((x) => /Soxta model javobi|Хатирчи|Xatirchi/i.test(x)), JSON.stringify(s.xabarlar.slice(1)).slice(0, 200));
  tekshir('E1b. provayderga 1 ta so‘rov, Authorization bor, fayl ovoz.wav, model whisper-1, til uz', l.length === 1 && l[0].auth === 'Bearer ***' && l[0].faylNomi === 'ovoz.wav' && l[0].maydonlar.model === 'whisper-1' && l[0].maydonlar.language === 'uz', JSON.stringify(l[0]));
  tekshir('E1c. provayderga ketgan fayl: WAV 16 kHz, 1 kanal, 16 bit, 2–3,2 s', l[0]?.wav && l[0].wav.chastota === 16000 && l[0].wav.kanal === 1 && l[0].wav.bit === 16 && l[0].wav.soniya > 2 && l[0].wav.soniya < 3.2, JSON.stringify(l[0]?.wav));
  const keyin = ovozSoniya('tekshiruv_admin');
  tekshir('E1d. muvaffaqiyatda soniyalar HISOBLANDI (3 s atrofida)', keyin - oldin >= 2 && keyin - oldin <= 4, `${oldin} → ${keyin}`);
  tekshir('E1e. holat tayyor, sahifa xatosi yo‘q', tayyorMi(s) && o.xatolar.length === 0, o.xatolar.join('|'));
  await o.yop();
}

console.log('── E2. Provayder tilni rad etadi → server tilsiz qayta urinadi, foydalanuvchi muvaffaqiyat ko‘radi');
{
  rejim([{ status: 400, json: { error: { message: "Invalid language 'uz'. Language parameter must be specified in ISO-639-1 format.", type: 'invalid_request_error', code: 'invalid_language_format' } } }, { status: 200, json: { text: 'ishsizlar royxatini och' } }]);
  const o = await ochish(OPT);
  await o.mik.click();
  const s = await o.kut((x) => x.xabarlar.length >= 3 && x.maskot === 'tayyor', 20000, 100);
  const l = log();
  tekshir('E2a. 2 ta so‘rov: birinchisida til bor, ikkinchisida YO‘Q', l.length === 2 && l[0].maydonlar.language === 'uz' && !('language' in l[1].maydonlar), JSON.stringify(l.map((x) => Object.keys(x.maydonlar))));
  tekshir('E2b. foydalanuvchi muvaffaqiyat ko‘rdi (savol xabar bo‘ldi)', s.xabarlar.some((x) => /ishsizlar royxatini och/i.test(x)));
  await o.yop();
}

for (const [nom, javob, kutilgan] of [
  ['E3. Hisobda mablag‘ yo‘q (429 insufficient_quota), ADMIN', [{ status: 429, json: { error: { message: 'You exceeded your current quota, please check your plan and billing details.', type: 'insufficient_quota', code: 'insufficient_quota' } } }], /Овоз хизмати ҳисобида маблағ тугаган\. Ёзинг\. \[openai 429\]/],
  ['E5. Kalit noto‘g‘ri (401), ADMIN', [{ status: 401, json: { error: { message: 'Incorrect API key provided: sk-soxta***3456.', type: 'invalid_request_error', code: 'invalid_api_key' } } }], /Овоз хизматининг калити ишламаяпти\. Ёзинг\. \[openai 401\]/],
  ['E6. Ruxsat yo‘q (403), ADMIN', [{ status: 403, json: { error: { message: 'Project proj_x does not have access to model whisper-1', type: 'invalid_request_error', code: 'model_not_found' } } }], /Овоз хизматига рухсат йўқ\. Ёзинг\. \[openai 403\]/],
  ['E7. Provayder 500 ikki marta, ADMIN', [{ status: 500, json: { error: { message: 'The server had an error' } } }, { status: 500, json: { error: { message: 'The server had an error' } } }], /Овоз хизмати вақтинча ишламаяпти\. Ёзинг\. \[openai 500\]/],
]) {
  console.log(`── ${nom}: aniq sabab, qotib qolmaydi, soniyalar QAYTARILADI, chatga savol ketmaydi`);
  rejim(javob);
  const oldin = ovozSoniya('tekshiruv_admin');
  const o = await ochish(OPT);
  await o.mik.click();
  const s = await o.kut((x) => kutilgan.test(x.status), 20000, 100);
  const q = await o.kut(tayyorMi, 3000);
  const keyin = ovozSoniya('tekshiruv_admin');
  tekshir(`${nom.split('.')[0]}a. xabar: ${kutilgan.source.slice(0, 50)}…`, kutilgan.test(s.status), s.status);
  tekshir(`${nom.split('.')[0]}b. holat tayyor, mikrofon tugmasi qaytdi, chatga savol ketmadi`, tayyorMi(q) && o.suhbatSorovlari.length === 0);
  tekshir(`${nom.split('.')[0]}c. muvaffaqiyatsiz yozuvning soniyalari QAYTARILDI (kunlik hisob o‘zgarmadi)`, keyin === oldin, `${oldin} → ${keyin}`);
  tekshir(`${nom.split('.')[0]}d. kalit javobda/ekranda yo‘q`, !/sk-soxta/.test(s.status) && !/sk-soxta/.test(JSON.stringify(q.xabarlar)));
  await o.yop();
}

console.log('── E4. HOKIM (administrator emas): xuddi shu xato, lekin [openai 429] belgisisiz');
{
  rejim([{ status: 429, json: { error: { message: 'You exceeded your current quota', type: 'insufficient_quota', code: 'insufficient_quota' } } }]);
  const o = await ochish({ ...OPT, rol: 'tekshiruv_hokim' });
  await o.mik.click();
  const s = await o.kut((x) => /маблағ/.test(x.status), 20000, 100);
  tekshir('E4a. matn bor, belgi YO‘Q', /Овоз хизмати ҳисобида маблағ тугаган\. Ёзинг\.$/.test(s.status), s.status);
  await o.yop();
}

console.log('── E8. Provayder bo‘sh matn qaytardi: "Овоз эшитилмади", soniyalar qaytariladi');
{
  rejim([{ status: 200, json: { text: '' } }]);
  const oldin = ovozSoniya('tekshiruv_admin');
  const o = await ochish(OPT);
  await o.mik.click();
  const s = await o.kut((x) => /эшитилмади/.test(x.status), 20000, 100);
  const keyin = ovozSoniya('tekshiruv_admin');
  tekshir('E8a. xabar va qaytarilgan soniyalar', /Овоз эшитилмади/.test(s.status) && keyin === oldin, `${s.status} | ${oldin} → ${keyin}`);
  await o.yop();
}
yakun();
