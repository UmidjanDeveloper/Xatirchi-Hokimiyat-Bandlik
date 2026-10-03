/**
 * Koala mikrofon brauzer sinovlari uchun umumiy yordamchi (Playwright):
 * oynani ochadi (kirish, soxta mikrofon oqimi, soxta ovoz tanish, soxta
 * `/api/agent/holat` va `/api/agent/ovoz`), holatni o'qiydi.
 * Foydalanadi: `mikrofon-brauzer.mjs`, `stt-brauzer.mjs`.
 */
import { chromium } from 'playwright-core';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Soxta mikrofon fayllari (16 kHz WAV): nutq — 0,8 s jimlik + 1,6 s "nutq" + jimlik; jim — faqat jimlik */
function wavYasa(papka, nutqBilan) {
  const sr = 16000;
  let seed = 7;
  const tasodif = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const namunalar = [];
  const jim = (n) => { for (let i = 0; i < n; i++) namunalar.push(tasodif() * 0.002); };
  const nutq = (n) => {
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.5 * t);
      const x = (Math.sin(2 * Math.PI * 180 * t) + 0.6 * Math.sin(2 * Math.PI * 540 * t) + 0.4 * Math.sin(2 * Math.PI * 1200 * t)) / 2;
      namunalar.push(x * env * 0.35 + tasodif() * 0.02);
    }
  };
  if (nutqBilan) { jim(Math.round(0.8 * sr)); nutq(Math.round(1.6 * sr)); jim(6 * sr); } else jim(10 * sr);
  const b = Buffer.alloc(44 + namunalar.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + namunalar.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(namunalar.length * 2, 40);
  namunalar.forEach((x, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), 44 + i * 2));
  const yol = join(papka, nutqBilan ? 'soxta-nutq.wav' : 'soxta-jim.wav');
  writeFileSync(yol, b);
  return yol;
}
const PAPKA = mkdtempSync(join(tmpdir(), 'mikrofon-'));
export const NUTQ_WAV = wavYasa(PAPKA, true);
export const JIM_WAV = wavYasa(PAPKA, false);


export const B = process.env.BAZA ?? process.env.HTTP_BAZA ?? 'http://127.0.0.1:3100';
export const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1';

/**
 * Soxta Web Speech (FAQAT sinov dublyori).
 *   { yoq: true }                          — API umuman yo'q (Firefox)
 *   { xato: 'not-allowed', end: false }    — start() xato beradi; end kelmaydi (iPhone WebKit kabi)
 *   { natija: 'matn' }                     — oraliq, keyin yakuniy natija va end
 *   { osil: true }                         — start() hech narsa qilmaydi
 *   stop: 'yoq'                            — stop() hech narsa qilmaydi (end kelmaydi)
 */
export function tanishSkripti(c) {
  if (c.yoq) return `delete window.SpeechRecognition; delete window.webkitSpeechRecognition;`;
  return `(() => {
    const C = ${JSON.stringify(c)};
    class T { constructor(){ this.lang=''; window.__tanishSoni=(window.__tanishSoni||0)+1; window.__tanishTili=this; }
      start(){ window.__bosh=(window.__bosh||0)+1;
        if (C.xato) setTimeout(()=>{ this.onerror && this.onerror({error:C.xato}); if (C.end) this.onend && this.onend(); }, 60);
        else if (C.natija) setTimeout(()=>{
          this.onresult && this.onresult({resultIndex:0, results:{length:1, 0:{isFinal:false, 0:{transcript:C.natija}}}});
          setTimeout(()=>{ this.onresult && this.onresult({resultIndex:0, results:{length:1, 0:{isFinal:true, 0:{transcript:C.natija}}}}); this.onend && this.onend(); }, 150);
        }, 80);
      }
      stop(){ window.__toxtadi=(window.__toxtadi||0)+1; if (C.stop==='yoq' || C.natija) return; this.onend && this.onend(); }
      abort(){ window.__abortSoni=(window.__abortSoni||0)+1; }
    }
    window.webkitSpeechRecognition = T; window.SpeechRecognition = T;
  })();`;
}

const GUM_SKRIPTI = `(() => {
  const md = navigator.mediaDevices; if (!md) return;
  const orig = md.getUserMedia.bind(md);
  window.__oqimlar = []; window.__gumSoni = 0;
  md.getUserMedia = async (c) => {
    window.__gumSoni++;
    if (window.__gumKech) await new Promise((r) => setTimeout(r, window.__gumKech));
    if (window.__gumRad) throw new DOMException('Permission denied', window.__gumRad);
    const s = await orig(c); window.__oqimlar.push(s); return s;
  };
})();`;

/** Uzun taymerlarni 100 marta tezlashtiradi (30 s kutish ~0,3 s): "osilib qolgan" holatni sinash uchun */
const TEZ_TAYMER = `(() => { const o = window.setTimeout.bind(window);
  window.setTimeout = (f, ms, ...a) => o(f, ms >= 25000 ? ms / 100 : ms, ...a); })();`;

export async function ochish(opts = {}) {
  const audio = opts.audio ?? NUTQ_WAV;
  const args = ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${audio}%noloop`];
  const kontekstOpts = {
    executablePath: process.env.CHROMIUM_YOLI || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args, serviceWorkers: 'block',
    viewport: opts.iphone ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    deviceScaleFactor: opts.iphone ? 3 : 1, hasTouch: Boolean(opts.iphone), isMobile: Boolean(opts.iphone),
    permissions: ['microphone'],
    ...(opts.iphone ? { userAgent: IPHONE_UA } : {}),
  };
  const k = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'pw-')), kontekstOpts);
  if (opts.lotin) await k.addCookies([{ name: 'bandlik_alifbo', value: 'lot', url: B }]);
  if (opts.tanish) await k.addInitScript(tanishSkripti(opts.tanish));
  await k.addInitScript(GUM_SKRIPTI);
  if (opts.tezTaymer) await k.addInitScript(TEZ_TAYMER);
  const p = k.pages()[0] ?? (await k.newPage());
  const xatolar = [];
  p.on('pageerror', (e) => xatolar.push('pageerror: ' + String(e)));
  const ovozSorovlari = [];
  const suhbatSorovlari = [];
  await p.route('**/api/agent/holat', async (r) => {
    if (opts.holat === undefined) return r.continue();
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.holat) });
  });
  await p.route('**/api/agent/ovoz', async (r) => {
    const req = r.request();
    const buf = req.postDataBuffer();
    ovozSorovlari.push({ bayt: buf ? buf.length : 0, buf });
    if (opts.ovoz === 'haqiqiy') return r.continue(); // soxta javob emas: haqiqiy marshrut
    const o = opts.ovoz ?? { status: 200, json: { matn: 'xatlov qanday ketyapti' } };
    if (o.kech) await new Promise((s) => setTimeout(s, o.kech));
    return r.fulfill({ status: o.status, contentType: 'application/json', body: JSON.stringify(o.json) });
  });
  p.on('request', (r) => { if (r.url().includes('/api/agent/suhbat')) suhbatSorovlari.push(r.postData() || ''); });

  await p.goto(B + '/kirish');
  await p.fill('input[type="text"]', opts.rol || 'tekshiruv_admin');
  await p.fill('input[type="password"]', 'Sinov2026x');
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !/kirish/.test(u.toString()), { timeout: 20000 });
  await p.goto(B + (opts.sahifa || '/panel'));
  await p.waitForSelector('[data-agent-tugmasi]');
  await p.click('[data-agent-tugmasi]');
  await p.waitForSelector('[role=dialog]');
  await p.waitForTimeout(opts.kutish ?? 800);

  const oyna = {
    p, k, xatolar, ovozSorovlari, suhbatSorovlari,
    mik: p.locator('[role=dialog] form button').first(),
    async holat() {
      return p.evaluate(() => {
        const d = document.querySelector('[role=dialog]');
        if (!d) return { yopiq: true };
        const m = d.querySelector('header .maskot');
        const cls = m ? [...m.classList].find((c) => /^maskot-(tayyor|eshitmoqda|oylamoqda|gapirmoqda)$/.test(c)) : '';
        const btn = d.querySelector('form button');
        const holatP = d.querySelector('[role=status]');
        return {
          maskot: cls ? cls.replace('maskot-', '') : '',
          kvadrat: Boolean(btn.querySelector('svg.lucide-square')),
          mikrofonIkon: Boolean(btn.querySelector('svg.lucide-mic')),
          mikOchiq: !btn.disabled,
          mikNomi: btn.getAttribute('aria-label') || '',
          daraja: parseFloat(btn.style.getPropertyValue('--daraja') || '0'),
          status: holatP ? holatP.textContent.trim() : '',
          xabarlar: [...d.querySelectorAll('div.max-w-\\[88\\%\\] p.whitespace-pre-wrap')].map((e) => e.textContent.trim()),
          pastki: (d.querySelector('form + p') || {}).textContent || '',
          sarlavhaHolat: (d.querySelector('header p') || {}).textContent || '',
        };
      });
    },
    async kut(sharti, ms = 8000, qadam = 100) {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const h = await oyna.holat();
        if (sharti(h)) return h;
        await p.waitForTimeout(qadam);
      }
      return oyna.holat();
    },
    /** Hamma mikrofon oqimlari to'xtaganmi (indikator o'chganmi) */
    oqimlarTugadimi: () => p.evaluate(() => (window.__oqimlar || []).every((s) => s.getTracks().every((t) => t.readyState === 'ended'))),
    oqimlarSoni: () => p.evaluate(() => (window.__oqimlar || []).length),
    async yop() { await k.close(); },
  };
  return oyna;
}

let _xato = 0, _jami = 0;
export function tekshir(nomi, ok, tafsilot = '') {
  _jami++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${nomi}${tafsilot ? '  → ' + tafsilot : ''}`);
  if (!ok) _xato++;
}
export function yakun() { console.log(_xato === 0 ? `\n${_jami}/${_jami} o‘tdi` : `\n${_xato} ta XATO (${_jami} dan)`); process.exit(_xato === 0 ? 0 : 1); }
export const SERVER_BOR = { ai: true, ovozServer: true, limit: 100, qolgan: 99 };
export const SERVER_YOQ = { ai: false, ovozServer: false, limit: 100, qolgan: 100 };


