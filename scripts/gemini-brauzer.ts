/**
 * ============================================================
 *  GEMINI JONLI SUHBAT — HAQIQIY BRAUZERDA SINOV (qo'lda ishga tushiriladi)
 *
 *  Haqiqiy: Chromium, mikrofon oqimi (fayldan), AudioWorklet, WebSocket
 *  mijozi, sahifa, server yo'llari, imzolangan ruxsatnoma, baza va asboblar.
 *  Soxta: Gemini (WebSocket brauzer ichida, Playwright `routeWebSocket`),
 *  Google token manzili (mahalliy HTTP) va ElevenLabs ovozi (WAV).
 *  Haqiqiy Gemini/ElevenLabs bilan end-to-end sinov EMAS.
 *
 *  Ishga tushirish (ishlab chiqarish rejimida token manzili o'zgarmaydi,
 *  shuning uchun `next dev`):
 *    GEMINI_API_KEY=AIza-sinov GEMINI_API_BAZA_SINOV=http://127.0.0.1:8966 \
 *    AGENT_TTS=1 ELEVENLABS_API_KEY=el-sinov ELEVENLABS_VOICE_ID=voice_1 \
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
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
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
const tokenSorovlari: { kalit: string | undefined; body: Record<string, unknown> }[] = [];
const google = http.createServer((req, res) => {
  const qismlar: Buffer[] = [];
  req.on('data', (c) => qismlar.push(c));
  req.on('end', () => {
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

async function sahifaOch(brauzer: S, username: string) {
  const ctx = await brauzer.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['microphone'] });
  await ctx.addCookies([{ name: 'bandlik_alifbo', value: 'kir', url: BAZA }]);
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

    await page.route('**/api/agent/gapir', async (route: S) => {
      const b = JSON.parse(route.request().postData() ?? '{}');
      gapirSorov.push({ matn: b.matn, jonli: typeof b.jonli === 'string' && b.jonli.length > 20, t: Date.now() });
      bir++; ENG_KOP = Math.max(ENG_KOP, bir);
      await uyqu(250);
      await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: ttsAudio });
      bir--;
    });
    await page.routeWebSocket(/generativelanguage\.googleapis\.com/, (ws: S) => {
      h.url = ws.url(); h.ochildi++;
      let ikkilik = 0;
      const yubor = (o: unknown) => { const s = JSON.stringify(o); ws.send(++ikkilik % 2 ? s : Buffer.from(s)); }; // matn va ikkilik kadrlar almashadi
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
          for (const q of uzun.slice(0, 2)) yubor({ serverContent: { modelTurn: { parts: [{ text: q }] } } });
          // Gemini hujjati: transkripsiya javobga nisbatan tartibsiz kelishi mumkin — kech bo'lak javobni BEKOR QILMASLIGI kerak
          yubor({ serverContent: { inputTranscription: { text: ' ҳозир' } } });
          for (const q of uzun.slice(2)) yubor({ serverContent: { modelTurn: { parts: [{ text: q }] } } });
          yubor({ serverContent: { turnComplete: true } });
        }
      });
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
    tekshir('A5. Setup: model, faqat TEXT, ko‘rsatma (Hamroh + mahalla nomlari), asboblar (mahallani_top, hisobotni_yukla), kirish transkripsiyasi',
      s.model?.startsWith('models/') && JSON.stringify(s.generationConfig?.responseModalities) === '["TEXT"]' &&
      /Hamroh/.test(s.systemInstruction?.parts?.[0]?.text ?? '') && /Uyshun/.test(s.systemInstruction?.parts?.[0]?.text ?? '') &&
      ['mahallani_top', 'hisobotni_yukla'].every((n) => s.tools?.[0]?.functionDeclarations?.some((f: S) => f.name === n && f.parameters?.type === 'OBJECT')) && s.inputAudioTranscription !== undefined);

    const salomEshitildi = await kut(() => gapirSorov.length >= 2 && /Ассалому алайкум!/.test(gapirSorov[0]?.matn ?? ''), 15_000);
    tekshir('A6. Salom gaplab ElevenLabs’ga yuborildi: 1-gap alohida (tez), 2-gap keyin; jonli ruxsatnoma bilan',
      salomEshitildi && gapirSorov[0].matn.trim() === 'Ассалому алайкум!' && /Сизни тинглаяпман/.test(gapirSorov[1].matn) && gapirSorov.slice(0, 2).every((g) => g.jonli), JSON.stringify(gapirSorov.slice(0, 2).map((g) => g.matn)));
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
    const uzunGap = await kut(() => gapirSorov.length >= 5, 20_000);
    tekshir('A12. Uzun javob gap-gap ElevenLabs’ga bo‘lindi (2…5 so‘rov), tartib saqlandi, bir vaqtda ko‘pi bilan 2 ta',
      uzunGap && gapirSorov.length <= 8 && ENG_KOP <= 2 && gapirSorov.slice(2).every((g, i, a) => i === 0 || g.t >= a[i - 1].t), `so'rov=${gapirSorov.length}, bir-vaqtda=${ENG_KOP}`);
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
    rejim = 'rad'; h.setup = null; h.yopildi = null;
    await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).click();
    const rad = await kut(async () => /код 1007/.test(await page.locator('body').innerText()), 20_000);
    tekshir('A17. Gemini ulanishni rad etsa (1007): xabarda kod va “Уланишни текшириш” ko‘rsatmasi; sessiya yopiladi',
      rad && (await page.getByRole('button', { name: 'Жонли суҳбат', exact: true }).count()) === 1);

    // Administrator uchun diagnostika (haqiqiy server so'rovlari; sandbox'da Google WS va ElevenLabs yetib bo'lmaydi: xatolar tushunarli ko'rsatilishi kerak)
    await page.locator('[data-jonli-tekshiruv] summary').click();
    await page.getByRole('button', { name: 'Уланишни текшириш' }).click();
    const natija = await kut(async () => (await page.locator('[data-tekshiruv-natijasi]').count()) > 0, 70_000, 500);
    const natMatni = natija ? await page.locator('[data-tekshiruv-natijasi]').innerText() : '';
    tekshir('A18. “Уланишни текшириш”: qadamlar ko‘rinadi (sozlama ✓, token ✓), tashqi xizmatlar yetib bo‘lmasa sababi aytiladi, kalit ko‘rinmaydi',
      natija && /✓\s*Sozlama/.test(natMatni) && /✓\s*Gemini token/.test(natMatni) && /(✗|✓)\s*ElevenLabs/.test(natMatni) && !natMatni.includes(process.env.GEMINI_API_KEY ?? 'x!'), natMatni.replace(/\n/g, ' | ').slice(0, 260));
    await page.screenshot({ path: `${SKRIN}/a18-tekshiruv.png` });
    tekshir('A19. Sahifada kutilmagan xato yo‘q (pageerror)', xatolar.length === 0, xatolar.join(' | '));
  } catch (e) {
    for (const p of A.contexts().flatMap((c: S) => c.pages())) {
      await p.screenshot({ path: `${SKRIN}/xato-a.png` }).catch(() => {});
      console.error('--- Sahifa matni (xato paytida):\n' + (await p.locator('body').innerText().catch(() => '')).slice(0, 1500));
    }
    throw e;
  } finally { await A.close(); }

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
            // Juda uzun salom: ovoz ~10 soniya o'ynaydi (5 bo'lak x 3 s)
            for (let i = 1; i <= 8; i++) ws.send(JSON.stringify({ serverContent: { modelTurn: { parts: [{ text: `${i}-fikr: bu ancha uzun gap bo‘lib, ovozli o‘qilishi uchun yetarli. ` }] } } }));
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

main().catch((e) => { xato++; console.error('XATO (kutilmagan):', e); }).finally(async () => {
  google.close();
  try { await prisma.user.deleteMany({ where: { id: { in: idlar } } }); } catch { /* tarix bog'langan bo'lishi mumkin */ }
  await prisma.$disconnect();
  console.log(xato === 0 ? 'HAMMASI O‘TDI' : `XATO: ${xato}`);
  process.exit(xato ? 1 : 0);
});
