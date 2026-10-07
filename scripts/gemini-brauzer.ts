/**
 * ============================================================
 *  GEMINI JONLI SUHBAT — HAQIQIY BRAUZERDA SINOV (qo'lda ishga tushiriladi)
 *
 *  Haqiqiy: Chromium, mikrofon oqimi (fayldan), AudioWorklet, WebSocket
 *  mijozi, sahifa, server yo'llari, imzolangan ruxsatnoma, baza va asboblar.
 *  Soxta: Gemini (WebSocket brauzer ichida, Playwright `routeWebSocket`),
 *  Google token manzili (mahalliy HTTP) va ElevenLabs ovozi (WAV).
 *  OpenAI zaxirasi (C bo'limi): brauzerning OpenAI'ga ketadigan so'rovi ushlanadi, haqiqiy OpenAI'ga chiqilmaydi.
 *  Haqiqiy Gemini/ElevenLabs/OpenAI bilan end-to-end sinov EMAS.
 *
 *  Ishga tushirish (ishlab chiqarish rejimida token manzili o'zgarmaydi,
 *  shuning uchun `next dev`):
 *    GEMINI_API_KEY=AIza-sinov GEMINI_API_BAZA_SINOV=http://127.0.0.1:8966 \
 *    AGENT_TTS=1 ELEVENLABS_API_KEY=el-sinov ELEVENLABS_VOICE_ID=voice_1 OPENAI_API_KEY=sk-sinov \
 *    npx next dev -p 3197 &
 *    BAZA=http://127.0.0.1:3197 npx tsx scripts/gemini-brauzer.ts
 *
 *  FAQAT mahalliy bazada. Brauzer: `PW_CHROME` (standart /opt/pw-browsers/chromium).
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();
import http from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { parolXeshla } from '../src/lib/auth';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const prisma = new PrismaClient();
const BAZA = process.env.BAZA ?? 'http://127.0.0.1:3197';
const GOOGLE_PORT = Number(process.env.GOOGLE_SOXTA_PORT ?? 8966);
const SKRIN = '/tmp/gemini-skrin';
const BELGI = `gb${Date.now().toString(36)}`;
const idlar: string[] = [];
let xato = 0;
const tekshir = (nom: string, ok: boolean, t = '') => { if (!ok) xato++; console.log(`${ok ? 'OK  ' : 'XATO'} ${nom}${t ? '  — ' + t : ''}`); };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S = any;
const uyqu = (ms: number) => new Promise((o) => setTimeout(o, ms));
async function kut(shart: () => boolean | Promise<boolean>, ms = 15_000, qadam = 100): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await shart()) return true; await uyqu(qadam); }
  return false;
}

/** WAV: sinus (amplituda `a`) yoki jimlik; fayl mikrofon yoki ElevenLabs o'rniga */
function wav(hz: number, soniya: number, namuna: (t: number) => number): Buffer {
  const n = Math.round(hz * soniya), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(hz, 24); b.writeUInt32LE(hz * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, namuna(i / hz))) * 32767), 44 + i * 2);
  return b;
}
const rmsOl = (base64: string): number => {
  const b = Buffer.from(base64, 'base64'); let kv = 0;
  for (let i = 0; i < b.length; i += 2) { const s = b.readInt16LE(i) / 32768; kv += s * s; }
  return Math.sqrt(kv / (b.length / 2));
};

/* ───────────── soxta Google token manzili ───────────── */
let pcmBoshladi = 0, pcmTugadi = 0;
const tokenSorovlari: { kalit: string | undefined; body: Record<string, unknown> }[] = [];
const google = http.createServer((req, res) => {
  const qismlar: Buffer[] = [];
  req.on('data', (c) => qismlar.push(c));
  req.on('end', () => {
    if (req.method === 'POST' && req.url === '/pcm') {
      pcmBoshladi = Date.now(); pcmTugadi = 0;
      res.writeHead(200, { 'content-type': 'audio/pcm;rate=24000', 'access-control-allow-origin': BAZA, 'access-control-allow-credentials': 'true', 'x-nutq-provayder': 'elevenlabs' });
      const a = setTimeout(() => res.write(wav(24000, 1.5, (t) => .2 * Math.sin(t * 330 * Math.PI * 2)).subarray(44)), 100);
      const b = setTimeout(() => res.write(wav(24000, .5, (t) => .2 * Math.sin(t * 330 * Math.PI * 2)).subarray(44)), 1200);
      const c = setTimeout(() => { pcmTugadi = Date.now(); res.end(); }, 1600);
      res.on('close', () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); }); return;
    }
    if (req.method === 'POST' && req.url === '/v1alpha/auth_tokens') {
      tokenSorovlari.push({ kalit: req.headers['x-goog-api-key'] as string | undefined, body: JSON.parse(Buffer.concat(qismlar).toString() || '{}') });
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ name: 'auth_tokens/e2etoken0123456789' }));
    } else res.writeHead(404).end();
  });
});

/* ───────────── soxta Gemini WebSocket ───────────── */
interface Hisob {
  url: string; setup: S; yopildi: { code: number; reason: string } | null; ochildi: number;
  matnlar: string[]; audio: { rms: number; mime: string; bayt: number }[]; asbobJavoblari: S[];
}
const yangiHisob = (): Hisob => ({ url: '', setup: null, yopildi: null, ochildi: 0, matnlar: [], audio: [], asbobJavoblari: [] });

async function xodimYarat(nom: string) {
  const u = await prisma.user.create({
    data: { username: `${BELGI}_${nom}`.toLowerCase(), fullName: `Sinov ${nom}`, passwordHash: parolXeshla('Sinov2026x'), rol: 'ADMIN', parolAlmashtirilsin: false },
    select: { id: true, username: true },
  });
  idlar.push(u.id);
  return u;
}

async function sahifaOch(brauzer: S, username: string, initSkript?: string) {
  const ctx = await brauzer.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['microphone'] });
  await ctx.addCookies([{ name: 'bandlik_alifbo', value: 'kir', url: BAZA }]);
  if (initSkript) await ctx.addInitScript(initSkript);
  const page = await ctx.newPage();
  const xatolar: string[] = [];
  page.on('pageerror', (e: Error) => xatolar.push(String(e).slice(0, 200)));
  if (process.env.GEMINI_BRAUZER_LOG) {
    page.on('framenavigated', (f: S) => { if (f === page.mainFrame()) console.log('  NAV', f.url()); });
    page.on('console', (m: S) => { if (['error', 'warning'].includes(m.type())) console.log('  console', m.type(), m.text().slice(0, 220)); });
  }
  await page.goto(`${BAZA}/kirish`);
  const st = await page.evaluate(async (u: string) => (await fetch('/api/auth/kirish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, parol: 'Sinov2026x' }) })).status, username);
  if (st !== 200) throw new Error(`kirish ${st}`);
  return { ctx, page, xatolar };
}
async function oynaOch(page: S) {
  await page.goto(`${BAZA}/vazifalar`);
  await page.waitForSelector('[data-agent-tugmasi]', { timeout: 25_000 });
  await page.waitForTimeout(1500);
  await page.locator('[data-agent-tugmasi]').click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });
  await page.waitForTimeout(800);
}
const holatOl = (page: S): Promise<string | null> => page.locator('[data-holat]').first().getAttribute('data-holat');
const royxatMatni = (page: S): Promise<string> => page.locator('[aria-relevant="additions"]').first().innerText();

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) { console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.'); process.exit(2); }
  mkdirSync(SKRIN, { recursive: true });
  await new Promise<void>((o) => google.listen(GOOGLE_PORT, '127.0.0.1', o));
  writeFileSync('/tmp/gemini-mik-jim.wav', wav(48_000, 4, () => 0));
  // 4 soniya: 2 s jimlik, 1 s kuchli ovoz (foydalanuvchi gapirdi), 1 s jimlik; aylanadi
  writeFileSync('/tmp/gemini-mik-ovoz.wav', wav(48_000, 4, (t) => (t >= 2 && t < 3 ? 0.35 * Math.sin(t * 440 * Math.PI * 2) : 0)));
  const ttsAudio = wav(16_000, 3, (t) => 0.2 * Math.sin(t * 330 * Math.PI * 2));
  const bayroq = (fayl: string) => ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${fayl}`, '--autoplay-policy=no-user-gesture-required'];

  const holat = await fetch(`${BAZA}/kirish`).then((r) => r.status).catch(() => 0);
  if (holat !== 200) throw new Error(`server ${BAZA} javob bermayapti`);

  const bolim = process.env.GEMINI_BRAUZER_BOLIM ?? 'ABCDEFG'; // masalan GEMINI_BRAUZER_BOLIM=C — faqat zaxira bo'limi
  if (bolim.includes('A')) {
  /* ═══ A. To'liq oqim: salom, transkripsiya, asbob, gaplab o'qish, yozma matn, to'xtatish (jim mikrofon) ═══ */
  const A = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: bayroq('/tmp/gemini-mik-jim.wav') });
  try {
    const u = await xodimYarat('a');
    const { page, xatolar } = await sahifaOch(A, u.username);
    const h = yangiHisob();
    let rejim: 'oddiy' | 'rad' = 'oddiy';
    let asbobYuborildi = false, salomJavob = false;
    const gapirSorov: { matn: string; jonli: boolean; t: number }[] = [];
    let bir = 0, ENG_KOP = 0;
    let modelYozmoqda = false, ttsErta = false;

    await page.route('**/api/agent/gapir', async (route: S) => {
      const b = JSON.parse(route.request().postData() ?? '{}');
      if (modelYozmoqda) ttsErta = true;
      gapirSorov.push({ matn: b.matn, jonli: typeof b.jonli === 'string' && b.jonli.length > 20, t: Date.now() });
      bir++; ENG_KOP = Math.max(ENG_KOP, bir);
      await uyqu(250);
      await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: ttsAudio });
      bir--;
    });
    await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws: S) => {
      h.url = ws.url(); h.ochildi++;
      let ikkilik = 0;
      const yubor = (o: any) => { if (o.serverContent?.modelTurn?.parts) o.serverContent.outputTranscription = { text: o.serverContent.modelTurn.parts.map((p: any) => p.text ?? '').join('') }; const s = JSON.stringify(o); ws.send(++ikkilik % 2 ? s : Buffer.from(s)); }; // matn va ikkilik kadrlar almashadi
      ws.onClose((code: number, reason: string) => { h.yopildi = { code, reason }; });
      ws.onMessage((xom: string | Buffer) => {
        const d = JSON.parse(String(xom));
        if (d.setup) {
          h.setup = d.setup;
          if (rejim === 'rad') { ws.close({ code: 1007, reason: 'models/xyz is not found for API version v1alpha' }); return; }
          yubor({ setupComplete: {} });
          return;
        }
        const ri = d.realtimeInput;
        if (ri?.text) {
          h.matnlar.push(ri.text);
          if (/жонли суҳбат бошланди/.test(ri.text)) {
            yubor({ serverContent: { modelTurn: { parts: [{ text: 'Ассалому алайкум! ' }] } } });
            yubor({ serverContent: { modelTurn: { parts: [{ text: 'Сизни тинглаяпман.' }] } } });
            yubor({ serverContent: { turnComplete: true } });
            salomJavob = true;
          } else if (/Рахмат/.test(ri.text)) {
            yubor({ serverContent: { modelTurn: { parts: [{ text: 'Марҳамат, доимо тайёрман.' }] } } });
            yubor({ serverContent: { turnComplete: true } });
          }
        } else if (ri?.audio) {
          h.audio.push({ rms: rmsOl(ri.audio.data), mime: ri.audio.mimeType, bayt: Buffer.from(ri.audio.data, 'base64').length });
          // Salom o'qilib bo'lgach (mikrofon ochiq, 12 kadr) foydalanuvchi "gapiradi"
          if (salomJavob && !asbobYuborildi && h.audio.length >= 12) {
            asbobYuborildi = true;
            yubor({ serverContent: { inputTranscription: { text: 'Уйшун ' } } });
            yubor({ serverContent: { inputTranscription: { text: 'маҳалласини топ' } } });
            yubor({ toolCall: { functionCalls: [{ id: 'function-call-777', name: 'mahallani_top', args: { mahalla: 'Uyshun' } }] } });
          }
        } else if (d.toolResponse) {
          h.asbobJavoblari.push(d.toolResponse);
          const uzun = ['Маҳалла топилди ва тасдиқланди. ', 'Хатлов бўйича маълумотлар тайёр, уларни ҳозир айтиб бераман. ', 'Биринчидан, ходимлар ишни бошлаган. ', 'Иккинчидан, ҳужжатлар йиғилмоқда. ', 'Учинчидан, натижалар кутилмоқда. ', 'Тўртинчидан, ҳисобот тайёрланади. ', 'Яна нима керак?'];
          modelYozmoqda = true;
          for (const q of uzun.slice(0, 2)) yubor({ serverContent: { modelTurn: { parts: [{ text: q }] } } });
          // Gemini hujjati: transkripsiya javobga nisbatan tartibsiz kelishi mumkin — kech bo'lak javobni BEKOR QILMASLIGI kerak
          yubor({ serverContent: { inputTranscription: { text: ' ҳозир' } } });
          setTimeout(() => {
            for (const q of uzun.slice(2)) yubor({ serverContent: { modelTurn: { parts: [{ text: q }] } } });
            modelYozmoqda = false;
            yubor({ serverContent: { turnComplete: true } });
          }, 800);
        }
      });
    });

    // A bo'limi Gemini'ning O'ZINI sinaydi: zaxira (OpenAI) o'chirilgan deb ko'rsatamiz. Zaxira C bo'limida.
    await page.route('**/api/agent/holat', async (route: S) => {
      const r = await route.fetch(); const j = await r.json().catch(() => null);
      if (j) j.jonliZaxira = false;
      await route.fulfill({ response: r, json: j ?? {} });
    });
    await oynaOch(page);
    const hm = await page.evaluate(async () => (await fetch('/api/agent/holat')).json());
    tekshir('A1. /holat: jonli yoqilgan va provayder Gemini (kalit + ElevenLabs sozlangan)', hm.jonli === true && hm.jonliProvayder === 'gemini', JSON.stringify({ jonli: hm.jonli, p: hm.jonliProvayder }));
    await page.screenshot({ path: `${SKRIN}/a1-oyna.png` });

    await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).click();
    const ulandi = await kut(() => h.setup !== null, 20_000);
    tekshir('A2. Brauzer Gemini WebSocket’ga ulandi va setup yubordi', ulandi);
    const tk = tokenSorovlari.at(-1);
    tekshir('A3. Server Google’dan token oldi: x-goog-api-key serverda, uses=1, setup qulflangan (fieldMask yo‘q)',
      Boolean(tk) && tk!.kalit === process.env.GEMINI_API_KEY && tk!.body.uses === 1 && tk!.body.fieldMask === undefined &&
      JSON.stringify(tk!.body.bidiGenerateContentSetup) === JSON.stringify(h.setup), `kalit=${tk?.kalit ? 'bor' : 'yo‘q'}`);
    tekshir('A4. WebSocket manzili rasmiy host/yo‘l, token query’da, asosiy kalit YO‘Q',
      /^wss:\/\/generativelanguage\.googleapis\.com\/ws\/google\.ai\.generativelanguage\.v1alpha\.GenerativeService\.BidiGenerateContentConstrained\?access_token=auth_tokens%2Fe2etoken/.test(h.url) && !h.url.includes(process.env.GEMINI_API_KEY ?? 'x!'), h.url.slice(0, 120));
    const s = h.setup ?? {};
    tekshir('A5. Setup: model, AUDIO transkript, ko‘rsatma (Hamroh + mahalla nomlari), asboblar (mahallani_top, hisobotni_yukla), kirish transkripsiyasi',
      s.model?.startsWith('models/') && JSON.stringify(s.generationConfig?.responseModalities) === '["AUDIO"]' &&
      /Hamroh/.test(s.systemInstruction?.parts?.[0]?.text ?? '') && /Uyshun/.test(s.systemInstruction?.parts?.[0]?.text ?? '') &&
      ['mahallani_top', 'hisobotni_yukla'].every((n) => s.tools?.[0]?.functionDeclarations?.some((f: S) => f.name === n && f.parameters?.type === 'OBJECT')) && s.inputAudioTranscription !== undefined);

    const salomEshitildi = await kut(() => gapirSorov.length >= 1 && /Ассалому алайкум!/.test(gapirSorov[0]?.matn ?? ''), 15_000);
    tekshir('A6. Salomning ikkala gapi bitta TTS so‘rovida: javob ichida ovoz almashmaydi, jonli ruxsatnoma bor',
      salomEshitildi && gapirSorov[0].matn.trim() === 'Ассалому алайкум! Сизни тинглаяпман.' && gapirSorov[0].jonli, JSON.stringify(gapirSorov[0]?.matn));
    const salomGreeting = h.matnlar.some((x) => /жонли суҳбат бошланди/.test(x));
    tekshir('A7. Ulangach Hamroh salomlashishi so‘raldi (realtimeInput.text)', salomGreeting);
    await page.waitForFunction(() => document.querySelector('[data-holat]')?.getAttribute('data-holat') === 'gapirmoqda', null, { timeout: 8000 }).catch(() => {});
    const gapirdi = (await holatOl(page)) === 'gapirmoqda';
    tekshir('A8. Ovoz o‘ynayotganda maskot “gapirmoqda” holatida', gapirdi, String(await holatOl(page)));

    const kadrBoshi = h.audio.length;
    const mikOchildi = await kut(() => h.audio.length >= kadrBoshi + 12, 20_000);
    const kadrlar = h.audio.slice(0, 40);
    tekshir('A9. Mikrofon: 16 kHz PCM kadrlari (1600 bayt = 50 ms), mime to‘g‘ri, salom o‘qilayotganda yuborilmaydi/keyin davom etadi',
      mikOchildi && kadrlar.length > 0 && kadrlar.every((k) => k.mime === 'audio/pcm;rate=16000' && k.bayt === 1600), `kadr=${h.audio.length}, bayt=${kadrlar[0]?.bayt}`);

    const asbobKeldi = await kut(() => h.asbobJavoblari.length >= 1, 20_000);
    const jr = h.asbobJavoblari[0]?.functionResponses?.[0];
    let out: S = null; try { out = JSON.parse(jr?.response?.output ?? 'null'); } catch { /* quyida baholanadi */ }
    tekshir('A10. Asbob chaqiruvi: brauzer serverga yubordi (imzolangan ruxsat), haqiqiy asbob ishladi, javob Gemini’ga id/nom bilan qaytdi',
      asbobKeldi && jr?.id === 'function-call-777' && jr?.name === 'mahallani_top' && out?.topildi === true && /(Uyshun|Уйшун)/i.test(String(out?.nomi ?? '')), JSON.stringify(out)?.slice(0, 120));
    const matn1 = await kut(async () => /Уйшун маҳалласини топ/.test(await royxatMatni(page)), 8000);
    tekshir('A11. Foydalanuvchi gapi (transkripsiya bo‘laklari) bitta xabarga yig‘ilib ekranda ko‘rinadi', matn1);
    const uzunGap = await kut(() => gapirSorov.length >= 2, 20_000);
    tekshir('A12. Oqimdagi yettita gap bitta to‘liq TTS so‘rovida, birinchi gap takrorlanmaydi',
      uzunGap && !ttsErta && gapirSorov.length === 2 && ENG_KOP === 1 && /Маҳалла топилди/.test(gapirSorov[1].matn) && /Яна нима керак\?/.test(gapirSorov[1].matn), `so'rov=${gapirSorov.length}, bir-vaqtda=${ENG_KOP}, tugamasdan-ovoz=${ttsErta}`);
    const javobKorinadi = await kut(async () => /Маҳалла топилди/.test(await royxatMatni(page)) && /Яна нима керак\?/.test(await royxatMatni(page)), 8000);
    tekshir('A13. Model javobi (oqim bilan kelgan matn) to‘liq ko‘rinadi', javobKorinadi);
    const t13 = await royxatMatni(page);
    const javobPufagi = await page.locator('p.whitespace-pre-wrap', { hasText: 'Маҳалла топилди ва тасдиқланди' }).allInnerTexts();
    tekshir('A13b. Kech kelgan transkripsiya bo‘lagi javobni bekor qilmaydi: foydalanuvchi xabariga qo‘shiladi, javob BITTA xabarda to‘liq qoladi, birinchi gap qayta o‘qilmaydi',
      /Уйшун маҳалласини топ ҳозир/.test(t13) && javobPufagi.length === 1 && /Яна нима керак\?/.test(javobPufagi[0] ?? '') && /Иккинчидан/.test(javobPufagi[0] ?? '') &&
      gapirSorov.filter((g) => /Маҳалла топилди/.test(g.matn)).length === 1, `pufak=${javobPufagi.length}, bo'laklar=${gapirSorov.length}`);
    await page.screenshot({ path: `${SKRIN}/a13-suhbat.png` });

    // Hamma ovoz tugagach yozma savol: UI yubor() -> Gemini realtimeInput.text
    await kut(async () => (await holatOl(page)) === 'eshitmoqda', 40_000);
    await page.getByLabel('Ҳамроҳга савол ёки буйруқ').fill('Рахмат');
    await page.getByLabel('Ҳамроҳга савол ёки буйруқ').press('Enter');
    const yozma = await kut(() => h.matnlar.some((x) => x === 'Рахмат'), 8000);
    tekshir('A14. Jonli suhbat paytida yozilgan savol Gemini’ga yuboriladi va javobi ham o‘qiladi', yozma && await kut(() => gapirSorov.some((g) => /доимо тайёрман/.test(g.matn)), 12_000));

    const gizli = await page.evaluate((k: string) => {
      const hammasi = [document.documentElement.outerHTML, JSON.stringify({ ...localStorage }), JSON.stringify({ ...sessionStorage })].join('\n');
      return hammasi.includes(k);
    }, process.env.GEMINI_API_KEY ?? 'x!');
    tekshir('A15. Asosiy Gemini kaliti sahifada ham, localStorage/sessionStorage’da ham yo‘q', !gizli);

    const kadrOldin = h.audio.length;
    await page.getByRole('button', { name: 'Жонли суҳбатни тўхтатиш' }).click();
    const yopildi = await kut(() => h.yopildi !== null, 8000);
    await uyqu(600);
    tekshir('A16. To‘xtatish: WebSocket normal (1000) yopiladi, mikrofon kadrlari to‘xtaydi, maskot tayyor holatda',
      yopildi && h.yopildi!.code === 1000 && h.audio.length - kadrOldin <= 3 && ['tayyor', 'eshitmoqda'].includes(String(await holatOl(page))), `kod=${h.yopildi?.code}, qo'shimcha kadr=${h.audio.length - kadrOldin}`);

    // Gemini ulanishni rad etsa: tushunarli xabar, sessiya yopiladi
    rejim = 'rad'; h.setup = null; h.yopildi = null; const oldRad = h.ochildi;
    await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).click();
    const rad = await kut(async () => /Jonli xizmatlar javob bermadi|Жонли хизматлар жавоб бермади/.test(await page.locator('body').innerText()), 20_000);
    tekshir('A17. Provider rad etsa ikki marta qayta sinaladi va sessiya yakunlanadi',
      rad && h.ochildi - oldRad === 3 && (await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).count()) === 1);

    // Administrator uchun diagnostika (haqiqiy server so'rovlari; sandbox'da Google WS va ElevenLabs yetib bo'lmaydi: xatolar tushunarli ko'rsatilishi kerak)
    await page.locator('[data-jonli-tekshiruv] summary').click();
    await page.getByRole('button', { name: 'Уланишни текшириш' }).click();
    const natija = await kut(async () => (await page.locator('[data-tekshiruv-natijasi]').count()) > 0, 70_000, 500);
    const natMatni = natija ? await page.locator('[data-tekshiruv-natijasi]').innerText() : '';
    tekshir('A18. “Уланишни текшириш”: qadamlar ko‘rinadi (sozlama ✓, token ✓, OpenAI zaxirasi qatori), tashqi xizmatlar yetib bo‘lmasa sababi aytiladi, kalit ko‘rinmaydi',
      natija && /✓\s*Sozlama/.test(natMatni) && /✓\s*Gemini token/.test(natMatni) && /(✗|✓)\s*ElevenLabs/.test(natMatni) && /(✗|✓)\s*OpenAI zaxirasi/.test(natMatni) && !natMatni.includes(process.env.GEMINI_API_KEY ?? 'x!'), natMatni.replace(/\n/g, ' | ').slice(0, 260));
    await page.screenshot({ path: `${SKRIN}/a18-tekshiruv.png` });
    tekshir('A19. Sahifada kutilmagan xato yo‘q (pageerror)', xatolar.length === 0, xatolar.join(' | '));
  } catch (e) {
    for (const p of A.contexts().flatMap((c: S) => c.pages())) {
      await p.screenshot({ path: `${SKRIN}/xato-a.png` }).catch(() => {});
      console.error('--- Sahifa matni (xato paytida):\n' + (await p.locator('body').innerText().catch(() => '')).slice(0, 1500));
    }
    throw e;
  } finally { await A.close(); }

  }

  if (bolim.includes('B')) {
  /* ═══ B. Gapni bo'lish (barge-in): ovoz o'ynayotganda foydalanuvchi baland ovoz bilan gapirsa ═══ */
  const B = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: bayroq('/tmp/gemini-mik-ovoz.wav') });
  try {
    const u = await xodimYarat('b');
    const { page, xatolar } = await sahifaOch(B, u.username);
    const h = yangiHisob();
    const gapirSorov: { matn: string; t: number }[] = [];
    await page.route('**/api/agent/gapir', async (route: S) => {
      gapirSorov.push({ matn: JSON.parse(route.request().postData() ?? '{}').matn, t: Date.now() });
      await uyqu(200);
      await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: ttsAudio });
    });
    await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws: S) => {
      h.ochildi++;
      ws.onMessage((xom: string | Buffer) => {
        const d = JSON.parse(String(xom));
        if (d.setup) { h.setup = d.setup; ws.send(JSON.stringify({ setupComplete: {} })); return; }
        const ri = d.realtimeInput;
        if (ri?.text) {
          h.matnlar.push(ri.text);
          if (/жонли суҳбат бошланди/.test(ri.text)) {
            // Sakkiz bo'lak bitta javobga yig'iladi; sinov audiosi 3 soniya.
            for (let i = 1; i <= 8; i++) ws.send(JSON.stringify({ serverContent: { outputTranscription: { text: `${i}-fikr: bu ancha uzun gap bo‘lib, ovozli o‘qilishi uchun yetarli. ` } } }));
            ws.send(JSON.stringify({ serverContent: { turnComplete: true } }));
          }
        } else if (ri?.audio) h.audio.push({ rms: rmsOl(ri.audio.data), mime: ri.audio.mimeType, bayt: Buffer.from(ri.audio.data, 'base64').length });
      });
    });
    await oynaOch(page);
    await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).click();
    const boshlandi = await kut(async () => (await holatOl(page)) === 'gapirmoqda', 20_000);
    tekshir('B1. Uzun javob o‘qila boshladi (maskot “gapirmoqda”)', boshlandi);
    const sorovlarBoshida = gapirSorov.length;
    // Fayldagi baland ovoz (foydalanuvchi gapirishi) davri keladi -> gap bo'linadi
    const bolindi = await kut(async () => (await holatOl(page)) === 'eshitmoqda', 14_000, 50);
    tekshir('B2. Foydalanuvchi baland ovozda gapirganda Hamroh to‘xtaydi va tinglashga o‘tadi', bolindi, String(await holatOl(page)));
    const yangiOvoz = await kut(() => h.audio.some((a) => a.rms > 0.1), 6000);
    tekshir('B3. Gapning boshi yo‘qolmaydi: bo‘lish paytida yig‘ilgan baland ovozli kadrlar Gemini’ga yuboriladi', yangiOvoz, `baland kadr=${h.audio.filter((a) => a.rms > 0.1).length}`);
    const n = gapirSorov.length;
    await uyqu(2500);
    tekshir('B4. Bo‘linganda kutayotgan ovoz so‘rovlari bekor qilinadi: yangi ElevenLabs so‘rovi ketmaydi', gapirSorov.length === n, `oldin=${sorovlarBoshida}, bo'linganda=${n}, keyin=${gapirSorov.length}`);
    tekshir('B5. Sahifada kutilmagan xato yo‘q', xatolar.length === 0, xatolar.join(' | '));
    await page.screenshot({ path: `${SKRIN}/b-bolish.png` });
  } finally { await B.close(); }

  }

  if (bolim.includes('C')) {
  /* ═══ C. ZAXIRA: Gemini (yoki uning ElevenLabs ovozi) ishlamasa OpenAI'ga o'tish ═══
     OpenAI'ga ketadigan brauzer so'rovi (`tur: ulanish`) ushlanadi: haqiqiy OpenAI'ga chiqilmaydi,
     lekin so'rovning ichidagi `zaxira` va `qoplash` maydonlari tekshiriladi. */
  const Cb = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: bayroq('/tmp/gemini-mik-jim.wav') });
  type Sorov = { tur: string; body: S };
  type Reja = { ws: 'rad' | 'jim' | 'javob_keyin_yopiladi'; token?: { status: number; json: S }; gapirZaxira?: boolean; openaiKechikishi?: number };
  async function zaxiraSahifasi(nom: string, reja: Reja) {
    const u = await xodimYarat(`c_${nom}`);
    const gum = 'window.__name = (t) => t; (() => { const md = navigator.mediaDevices; const orig = md.getUserMedia.bind(md); window.__gum = 0; md.getUserMedia = (c) => { window.__gum++; return orig(c); }; })();';
    const { ctx, page, xatolar } = await sahifaOch(Cb, u.username, gum);
    const sorovlar: Sorov[] = [];
    const bosh: { geminiRuxsat?: string } = {};
    await page.route('**/api/agent/jonli', async (route: S) => {
      const body = JSON.parse(route.request().postData() ?? '{}');
      if (body.tur === 'ulanish') {
        sorovlar.push({ tur: 'ulanish', body });
        if (reja.openaiKechikishi) await uyqu(reja.openaiKechikishi);
        await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ xabar: 'Jonli ovoz xizmatiga ulanib bo‘lmadi (sinov: haqiqiy OpenAI’ga chiqilmaydi).' }) });
      } else if (body.tur === 'gemini_ulanish') {
        sorovlar.push({ tur: 'gemini_ulanish', body });
        if (reja.token) { await route.fulfill({ status: reja.token.status, contentType: 'application/json', body: JSON.stringify(reja.token.json) }); return; }
        const r = await route.fetch(); const j = await r.json().catch(() => ({})); bosh.geminiRuxsat = j.ruxsat;
        await route.fulfill({ response: r });
      } else await route.continue();
    });
    const gapirSorov: number[] = [];
    await page.route('**/api/agent/gapir', async (route: S) => {
      gapirSorov.push(Date.now());
      await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: ttsAudio, headers: reja.gapirZaxira ? { 'x-nutq-zaxira': '1', 'x-nutq-provayder': 'openai' } : {} });
    });
    let wsOchildi = 0;
    await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws: S) => {
      wsOchildi++;
      ws.onMessage((xom: string | Buffer) => {
        const d = JSON.parse(String(xom));
        if (d.setup) {
          if (reja.ws === 'rad') { ws.close({ code: 1007, reason: 'models/xyz is not found for API version v1alpha' }); return; }
          ws.send(JSON.stringify({ setupComplete: {} })); return;
        }
        if (d.realtimeInput?.text && /жонли суҳбат бошланди/.test(d.realtimeInput.text) && reja.ws === 'javob_keyin_yopiladi') {
          ws.send(JSON.stringify({ serverContent: { outputTranscription: { text: 'Ассалому алайкум. Сизни тинглаяпман.' } } }));
          ws.send(JSON.stringify({ serverContent: { turnComplete: true } }));
          setTimeout(() => ws.close({ code: 1011, reason: 'server xatosi' }), 1500);
        }
        if (d.realtimeInput?.text && /жонли суҳбат бошланди/.test(d.realtimeInput.text) && reja.ws === 'jim') {
          // Empty turnComplete must not cancel the first genuine-answer deadline.
          ws.send(JSON.stringify({ serverContent: { turnComplete: true } }));
        }
      });
    });
    await oynaOch(page);
    const bosish = () => page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).click();
    const gumSoni = (): Promise<number> => page.evaluate(() => (window as unknown as { __gum: number }).__gum);
    const matn = (): Promise<string> => page.locator('body').innerText();
    const kapat = async () => { await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {}); await ctx.close().catch(() => {}); };
    return { ctx, page, xatolar, sorovlar, bosh, bosish, gumSoni, matn, gapirSorov, wsSoni: () => wsOchildi, kapat };
  }

  try {
    /* C1: Gemini WebSocket'ni rad etdi (1007) -> OpenAI zaxirasi; qoplash = Gemini urinishining ruxsatnomasi; mikrofon qayta so'ralmaydi */
    const c1 = await zaxiraSahifasi('rad', { ws: 'rad', openaiKechikishi: 3000 });
    const hm = await c1.page.evaluate(async () => (await fetch('/api/agent/holat')).json());
    tekshir('C0. /holat: Gemini asosiy va OpenAI zaxirasi tayyor (jonliZaxira)', hm.jonliProvayder === 'gemini' && hm.jonliZaxira === true, JSON.stringify({ p: hm.jonliProvayder, z: hm.jonliZaxira }));
    await c1.bosish();
    const z1 = await kut(() => c1.sorovlar.some((x) => x.tur === 'ulanish'), 25_000);
    const ul1 = c1.sorovlar.find((x) => x.tur === 'ulanish')?.body;
    tekshir('C1. Ishlagan Gemini tokeni davom sifatida OpenAI’ga o‘tadi, mikrofon qayta ishlatiladi',
      z1 && ul1?.zaxira === true && typeof ul1?.davom === 'string' && ul1.davom === c1.bosh.geminiRuxsat && typeof ul1?.sdp === 'string' && ul1.sdp.startsWith('v=0'), JSON.stringify({ zaxira: ul1?.zaxira, qoplash: typeof ul1?.davom, tenglik: ul1?.davom === c1.bosh.geminiRuxsat }));
    tekshir('C2. Mikrofon ruxsati ikkinchi marta so‘ralmadi: Gemini oqimi OpenAI’ga berildi (getUserMedia 1 marta)', (await c1.gumSoni()) === 1, `getUserMedia=${await c1.gumSoni()}`);
    const xabar1 = await kut(async () => /OpenAI билан қайта уланмоқда/.test(await c1.matn()), 6000, 100);
    tekshir('C3. Qayta ulanish holati foydalanuvchiga ko‘rsatiladi', xabar1);
    const bosFl = await c1.page.evaluate(() => sessionStorage.getItem('hamroh:gemini-yiqildi'));
    tekshir('C4. Gemini yiqilgani 3 daqiqaga eslab qolinadi (sessionStorage)', Boolean(bosFl) && Date.now() - Number(bosFl) < 30_000);
    const xatoKorindi = await kut(async () => /Jonli xizmatlar javob bermadi|Жонли хизматлар жавоб бермади/.test(await c1.matn()), 10_000);
    tekshir('C5. Ikkala provider ishlamasa cheklangan qayta urinish tugaydi va tugma qaytadi', xatoKorindi && (await c1.page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).count()) === 1);
    await c1.page.screenshot({ path: `${SKRIN}/c1-zaxira.png` });

    /* C6: keyingi bosish — Gemini'ga qayta urinmaydi, to'g'ridan-to'g'ri OpenAI (kunlik hisob va vaqt tejaladi) */
    const geminiOldin = c1.sorovlar.filter((x) => x.tur === 'gemini_ulanish').length; const oldCalls = c1.sorovlar.length;
    await c1.bosish();
    const z6 = await kut(() => c1.sorovlar.length > oldCalls, 15_000);
    const first6 = c1.sorovlar[oldCalls]; const ul6 = first6?.body;
    tekshir('C6. Gemini yaqinda yiqilgan: keyingi bosishda Gemini’ga urinilmaydi, to‘g‘ridan-to‘g‘ri OpenAI ({zaxira:true}, qoplashsiz)',
      z6 && ul6?.zaxira === true && ul6?.qoplash === undefined && first6?.tur === 'ulanish', JSON.stringify({ zaxira: ul6?.zaxira, qoplash: ul6?.qoplash, gemini: c1.sorovlar.filter((x) => x.tur === 'gemini_ulanish').length - geminiOldin }));
    // muddat o'tgach Gemini yana sinaladi ("ishlasa ishlayveradi")
    await c1.page.evaluate(() => sessionStorage.setItem('hamroh:gemini-yiqildi', String(Date.now() - 4 * 60_000)));
    await kut(async () => (await c1.page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).count()) === 1, 10_000);
    const before7 = c1.sorovlar.length;
    await c1.bosish();
    const qayta = await kut(() => c1.sorovlar.slice(before7).some((x) => x.tur === 'gemini_ulanish'), 15_000);
    tekshir('C7. 3 daqiqadan keyin Gemini yana sinab ko‘riladi', qayta);
    tekshir('C8. Sahifada kutilmagan xato yo‘q (pageerror)', c1.xatolar.length === 0, c1.xatolar.join(' | '));
    await c1.kapat();

    /* C9: token bosqichida provayder xatosi (502) + server bergan qoplash ruxsatnomasi */
    const c2 = await zaxiraSahifasi('token502', { ws: 'rad', token: { status: 502, json: { xabar: 'Gemini ulanmadi', zaxira: 'server.qoplash-ruxsatnomasi' } } });
    await c2.bosish();
    const z2 = await kut(() => c2.sorovlar.some((x) => x.tur === 'ulanish'), 20_000);
    const ul2 = c2.sorovlar.find((x) => x.tur === 'ulanish')?.body;
    tekshir('C9. Gemini tokeni 502 + server qoplash bergan: OpenAI zaxirasi shu qoplash bilan boshlanadi, Gemini WebSocket ochilmaydi',
      z2 && ul2?.zaxira === true && ul2?.qoplash === 'server.qoplash-ruxsatnomasi' && c2.wsSoni() === 0 && (await c2.gumSoni()) === 1, JSON.stringify({ qoplash: ul2?.qoplash, ws: c2.wsSoni(), gum: await c2.gumSoni() }));
    await c2.kapat();

    /* C10: chegara/ruxsat xatolari (429) zaxiraga O'TKAZMAYDI: OpenAI ham shu chegaraga uriladi */
    const c3 = await zaxiraSahifasi('token429', { ws: 'rad', token: { status: 429, json: { xabar: 'Бугунги жонли суҳбатлар чегараси тугади.' } } });
    await c3.bosish();
    const xabar3 = await kut(async () => /чегараси тугади/.test(await c3.matn()), 10_000);
    await uyqu(1500);
    tekshir('C10. Kunlik chegara (429): zaxiraga o‘tilmaydi, xabar ko‘rsatiladi, OpenAI’ga so‘rov ketmaydi', xabar3 && !c3.sorovlar.some((x) => x.tur === 'ulanish'), c3.sorovlar.map((x) => x.tur).join());
    await c3.kapat();

    /* C11: Gemini ulanadi, lekin hech qachon javob bermaydi (model matnni rad etdi, kvota...) -> ~12 soniyadan keyin zaxira */
    const c4 = await zaxiraSahifasi('jim', { ws: 'jim' });
    const t0 = Date.now();
    await c4.bosish();
    const z4 = await kut(() => c4.sorovlar.some((x) => x.tur === 'ulanish'), 25_000, 200);
    const ul4 = c4.sorovlar.find((x) => x.tur === 'ulanish')?.body; const sekund = (Date.now() - t0) / 1000;
    tekshir('C11. Gemini ulandi, lekin javob bermadi: ~12 soniyada OpenAI zaxirasi (davom = Gemini ruxsatnomasi)', z4 && sekund >= 10 && sekund <= 22 && ul4?.davom === c4.bosh.geminiRuxsat, `${sekund.toFixed(1)} s`);
    await c4.kapat();

    /* C12: Gemini javob berganidan keyin ham uzilsa OpenAI davom ettiradi. */
    const c5 = await zaxiraSahifasi('keyin_yopildi', { ws: 'javob_keyin_yopiladi' });
    await c5.bosish();
    const salom = await kut(() => c5.gapirSorov.length >= 1, 15_000);
    const davom = await kut(() => c5.sorovlar.some((x) => x.tur === 'ulanish'), 12_000);
    await uyqu(1500);
    tekshir('C12. Gemini javob bergach uzilsa ham OpenAI zaxirasi davom etadi; oxirgi buyruq avtomatik takrorlanmaydi', salom && davom && c5.sorovlar.some((x) => x.tur === 'ulanish' && x.body.zaxira === true), c5.sorovlar.map((x) => x.tur).join());
    await c5.kapat();

    /* C13: ElevenLabs ovozi o'rniga server OpenAI ovozini ishlatgan (x-nutq-zaxira) -> bir marta ogohlantiriladi */
    const c6 = await zaxiraSahifasi('ovoz', { ws: 'javob_keyin_yopiladi', gapirZaxira: true });
    await c6.bosish();
    const ogoh = await kut(async () => /ElevenLabs овози ишламади/.test(await c6.matn()), 15_000);
    tekshir('C13. Server ElevenLabs o‘rniga OpenAI ovozini ishlatsa foydalanuvchi bir marta ogohlantiriladi', ogoh);
    await c6.kapat();
    const c7 = await zaxiraSahifasi('workletsiz', { ws: 'rad' });
    await c7.page.evaluate(() => Object.defineProperty(window, 'AudioWorkletNode', { value: undefined, configurable: true }));
    await c7.bosish();
    const native = await kut(() => c7.sorovlar.some((x) => x.tur === 'ulanish'), 8000);
    tekshir('C14. AudioWorklet bo‘lmasa mavjud WebRTC OpenAI zaxirasi darhol ochiladi; Gemini tokeni olinmaydi', native && !c7.sorovlar.some((x) => x.tur === 'gemini_ulanish'));
    await c7.kapat();
  } catch (e) {
    for (const p of Cb.contexts().flatMap((c: S) => c.pages())) {
      await p.screenshot({ path: `${SKRIN}/xato-c.png` }).catch(() => {});
      console.error('--- Sahifa matni (xato paytida):\n' + (await p.locator('body').innerText().catch(() => '')).slice(0, 1500));
    }
    throw e;
  } finally { await Cb.close(); }  }
  if (bolim.includes('D')) {
    const db = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: bayroq('/tmp/gemini-mik-jim.wav') });
    try {
      const u = await xodimYarat('native');
      const { ctx, page, xatolar } = await sahifaOch(db, u.username, 'window.__name = (t) => t;');
      let starts = 0, renews = 0, sockets = 0, tts = 0;
      let first = '', renewed = '';
      await page.route('**/api/agent/holat', async (r: S) => { const res = await r.fetch(), j = await res.json(); j.jonliZaxira = false; await r.fulfill({ response: res, json: j }); });
      await page.route('**/api/agent/jonli', async (r: S) => {
        const b = JSON.parse(r.request().postData() ?? '{}');
        if (b.tur === 'gemini_ulanish') {
          starts++; const res = await r.fetch({ postData: JSON.stringify({ ...b, mahalliyOvoz: true }) }); const j = await res.json();
          first = j.ruxsat; await r.fulfill({ response: res, json: { ...j, muddatMs: 21_000 } });
        } else if (b.tur === 'yangilash') {
          renews++; const res = await r.fetch(); const j = await res.json(); renewed = j.ruxsat; await r.fulfill({ response: res });
        } else await r.continue();
      });
      await page.route('**/api/agent/gapir', async (r: S) => { tts++; await r.fulfill({ status: 502, json: { xabar: 'Native audio must not call TTS' } }); });
      await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws: S) => {
        sockets++;
        ws.onMessage((raw: string) => {
          const b = JSON.parse(String(raw));
          if (b.setup) ws.send(JSON.stringify({ setupComplete: {} }));
          if (b.realtimeInput?.text && /жонли суҳбат бошланди/.test(b.realtimeInput.text)) {
            ws.send(JSON.stringify({ serverContent: { outputTranscription: { text: 'Salom, sizni tinglayapman.' }, modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: wav(24000, 3, (t) => .2 * Math.sin(t * 330 * Math.PI * 2)).subarray(44).toString('base64') } }] }, turnComplete: true } }));
          }
        });
      });
      await oynaOch(page); await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).click();
      const speaking = await kut(async () => (await holatOl(page)) === 'gapirmoqda', 15_000);
      tekshir('D1. Gemini native PCM haqiqiy AudioContext’da gapiradi, tashqi TTS chaqirilmaydi', speaking && tts === 0);
      const refreshed = await kut(() => renews === 1 && Boolean(renewed), 10_000);
      const id = (t: string) => JSON.parse(Buffer.from(t.split('.')[0], 'base64url').toString()).id;
      tekshir('D2. Ruxsat yangilanadi; suhbat va WebSocket qayta ochilmaydi, buyruq IDlari saqlanadi', refreshed && starts === 1 && sockets === 1 && id(first) === id(renewed));
      await page.getByRole('button', { name: 'Жонли суҳбатни тўхтатиш' }).click(); await uyqu(500);
      tekshir('D3. Native audio qo‘lda yopiladi, kechikkan ovoz/takroriy ulanish yo‘q', tts === 0 && sockets === 1 && xatolar.length === 0 && (await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).count()) === 1);
      await ctx.close();
    } finally { await db.close(); }
  }

  if (bolim.includes('E')) {
    const eb = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: bayroq('/tmp/gemini-mik-jim.wav') });
    try {
      for (const fail of [false, true]) {
        const u = await xodimYarat(fail ? 'native_fallback' : 'voice_pinned');
        const { ctx, page, xatolar } = await sahifaOch(eb, u.username, 'window.__name = (t) => t;');
        const voices: S[] = [], starts: S[] = []; let native = false;
        await page.route('**/api/agent/holat', async (r: S) => { const res = await r.fetch(), j = await res.json(); j.jonliZaxira = false; await r.fulfill({ response: res, json: j }); });
        await page.route('**/api/agent/jonli', async (r: S) => {
          const b = JSON.parse(r.request().postData() ?? '{}');
          if (b.tur === 'gemini_ulanish') { starts.push(b); native = b.mahalliyOvoz === true; }
          await r.continue();
        });
        await page.route('**/api/agent/gapir', async (r: S) => {
          voices.push(JSON.parse(r.request().postData() ?? '{}'));
          await r.fulfill(fail ? { status: 502, json: { xabar: 'Ikkala tashqi ovoz ishlamadi' } } : { status: 200, contentType: 'audio/mpeg', body: wav(16000, .5, (t) => .2 * Math.sin(t * 330 * Math.PI * 2)), headers: { 'x-nutq-zaxira': '1', 'x-nutq-provayder': 'openai' } });
        });
        await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws: S) => {
          ws.onMessage((raw: string) => {
            const b = JSON.parse(String(raw));
            if (b.setup) ws.send(JSON.stringify({ setupComplete: {} }));
            if (b.realtimeInput?.text) {
              ws.send(JSON.stringify({ serverContent: { outputTranscription: { text: 'Salom, sizni tinglayapman.' }, ...(native ? { modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: wav(24000, 2, (t) => .2 * Math.sin(t * 330 * Math.PI * 2)).subarray(44).toString('base64') } }] } } : {}), turnComplete: true } }));
            }
          });
        });
        await oynaOch(page); await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).click();
        if (fail) {
          const switched = await kut(async () => starts.length === 2 && (await holatOl(page)) === 'gapirmoqda', 15_000);
          tekshir('E2. Oqim va MP3 rad etilsa shu Gemini native ovozida davom etadi, kunlik davom ruxsati ishlatiladi', switched && /Овоз: Gemini/.test(await page.locator('body').innerText()) && starts[1].mahalliyOvoz === true && typeof starts[1].davom === 'string' && voices.length === 2 && voices[0].oqim === true && voices[1].oqim === false && xatolar.length === 0);
          const mouth = await kut(async () => Number(await page.locator('[data-holat]').first().evaluate((el: HTMLElement) => el.style.getPropertyValue('--robot-nutq'))) > .1, 2000, 25);
          tekshir('E3. Native ovozning haqiqiy amplitudasi robot og‘zini harakatlantiradi', mouth);
        } else {
          await kut(() => voices.length === 1, 15_000); await kut(async () => (await holatOl(page)) === 'eshitmoqda', 5000);
          await page.getByLabel('Ҳамроҳга савол ёки буйруқ').fill('Yana salom'); await page.getByLabel('Ҳамроҳга савол ёки буйруқ').press('Enter');
          const second = await kut(() => voices.length === 2, 8000);
          tekshir('E1. Keyingi javob zaxira ovozga qulflanadi: gaplar orasida ElevenLabs’ga qaytmaydi', second && /Овоз: OpenAI/.test(await page.locator('body').innerText()) && voices[0].zaxira !== true && voices[1].zaxira === true && starts.length === 1 && xatolar.length === 0);
        }
        await ctx.close();
      }
    } finally { await eb.close(); }
  }

  if (bolim.includes('F')) {
    const fb = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: bayroq('/tmp/gemini-mik-jim.wav') });
    try {
      const u = await xodimYarat('early_pcm'); const { ctx, page, xatolar } = await sahifaOch(fb, u.username, 'window.__name = (t) => t;');
      const requests: S[] = [];
      await page.route('**/api/agent/gapir', async (r: S) => { requests.push(JSON.parse(r.request().postData() ?? '{}')); await r.continue({ url: `http://127.0.0.1:${GOOGLE_PORT}/pcm` }); });
      await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws: S) => {
        ws.onMessage((raw: string) => {
          const b = JSON.parse(String(raw));
          if (b.setup) ws.send(JSON.stringify({ setupComplete: {} }));
          if (b.realtimeInput?.text) ws.send(JSON.stringify({ serverContent: { outputTranscription: { text: 'Salom, sizni tinglayapman.' }, turnComplete: true } }));
        });
      });
      await oynaOch(page); await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).click();
      const speaks = await kut(async () => (await holatOl(page)) === 'gapirmoqda', 15_000, 20);
      const firstMs = Date.now() - pcmBoshladi;
      tekshir('F1. Jonli TTS birinchi PCM bo‘lagi bilan gapiradi, 1600 ms lik fayl tugashini kutmaydi', speaks && pcmTugadi === 0 && firstMs < 1400 && requests.length === 1 && requests[0].oqim === true, `${firstMs} ms`);
      const mouth = await kut(async () => Number(await page.locator('[data-holat]').first().evaluate((el: HTMLElement) => el.style.getPropertyValue('--robot-nutq'))) > .1, 1000, 20);
      tekshir('F2. Oqim ovozi og‘iz amplitudasini ham darhol yangilaydi', mouth);
      await page.getByRole('button', { name: 'Жонли суҳбатни тўхтатиш' }).click();
      await uyqu(200); pcmTugadi = 0;
      await page.getByRole('button', { name: 'Овозни синаш', exact: true }).click();
      const normal = await kut(async () => (await holatOl(page)) === 'gapirmoqda', 5000, 20);
      tekshir('F3. Oddiy ovoz tugmasi ham fayl tugashidan oldin gapiradi, bitta ovoz tanlovi saqlanadi', normal && pcmTugadi === 0 && requests.length === 2 && requests[1].oqim === true);
      tekshir('F4. Sahifada audio oqimi xatosi yoki bekor qilingan ulanishning qayta tiklanishi yo‘q', xatolar.length === 0 && requests.length === 2, xatolar.join(' | '));
      await ctx.close();
    } finally { await fb.close(); }
  }

  if (bolim.includes('G')) {
    const gb = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: bayroq('/tmp/gemini-mik-jim.wav') });
    try {
      for (const failure of ['empty', '502']) {
        const u = await xodimYarat(`recover_${failure}`); const { ctx, page, xatolar } = await sahifaOch(gb, u.username, 'window.__name = (t) => t;');
        const requests: S[] = []; let setups = 0;
        await page.route('**/api/agent/gapir', async (r: S) => {
          const d = JSON.parse(r.request().postData() ?? '{}'); requests.push(d);
          if (d.oqim) await r.fulfill(failure === 'empty'
            ? { status: 200, contentType: 'audio/pcm;rate=24000', body: Buffer.alloc(0) }
            : { status: 502, contentType: 'application/json', body: JSON.stringify({ xabar: 'Oqim mos kelmadi.' }) });
          else await r.fulfill({ status: 200, contentType: 'audio/mpeg', body: wav(24000, 3, (t) => .2 * Math.sin(t * 330 * Math.PI * 2)), headers: { 'x-nutq-provayder': 'elevenlabs' } });
        });
        await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws: S) => {
          ws.onMessage((raw: string) => {
            const b = JSON.parse(String(raw));
            if (b.setup) { setups++; ws.send(JSON.stringify({ setupComplete: {} })); }
            if (b.realtimeInput?.text) ws.send(JSON.stringify({ serverContent: { outputTranscription: { text: 'Salom, sizni tinglayapman.' }, turnComplete: true } }));
          });
        });
        await oynaOch(page); await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).click();
        const live = await kut(async () => (await holatOl(page)) === 'gapirmoqda', 15_000, 20);
        tekshir(`G1-${failure}. Jonli ovoz oqimi ishlamasa ayni suhbatda MP3 o‘qiladi, qayta ulanish yo‘q`, live && requests.length === 2 && requests[0].oqim === true && requests[1].oqim === false && setups === 1);
        await page.getByRole('button', { name: 'Жонли суҳбатни тўхтатиш' }).click(); await uyqu(100);
        await page.getByRole('button', { name: 'Овозни синаш', exact: true }).click();
        const ordinary = await kut(async () => (await holatOl(page)) === 'gapirmoqda', 5000, 20);
        tekshir(`G2-${failure}. Oddiy ovoz tugmasi ham xatodan keyin bitta MP3 ijrosini boshlaydi`, ordinary && requests.length === 4 && requests[2].oqim === true && requests[3].oqim === false);
        tekshir(`G3-${failure}. Tiklangan ovoz og‘izni harakatlantiradi va sahifada kutilmagan xato yo‘q`, xatolar.length === 0 && await kut(async () => Number(await page.locator('[data-holat]').first().evaluate((el: HTMLElement) => el.style.getPropertyValue('--robot-nutq'))) > .1, 1000, 20), xatolar.join(' | '));
        await ctx.close();
      }
    } finally { await gb.close(); }
  }
}

main().catch((e) => { xato++; console.error('XATO (kutilmagan):', e); }).finally(async () => {
  google.close();
  try { await prisma.user.deleteMany({ where: { id: { in: idlar } } }); } catch { /* tarix bog'langan bo'lishi mumkin */ }
  await prisma.$disconnect();
  console.log(xato === 0 ? 'HAMMASI O‘TDI' : `XATO: ${xato}`);
  process.exit(xato ? 1 : 0);
});
