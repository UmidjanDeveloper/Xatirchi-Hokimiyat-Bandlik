/**
 * ============================================================
 *  KOALA: SERVER OVOZINI MATNGA AYLANTIRISH — SINOV (tarmoqsiz)
 *
 *  Ishga tushirish:  npx tsx scripts/stt-sinov.ts
 *
 *  Muammo: iPhone'da ovoz serverga yetib borgan, lekin "Ovoz matnga
 *  aylanmadi" chiqqan, SABAB esa noma'lum edi. Bu sinov provayderni (OpenAI)
 *  soxta javoblar bilan almashtirib, `lib/agent/stt.ts` ni tekshiradi:
 *
 *   · provayder xatosi aniq sababga ajraladi (kalit, hisob, ruxsat, model...);
 *   · provayder parametrni rad etsa (til, harorat, izoh, model) — shu
 *     parametrsiz qayta uriladi; kalit/hisob/ruxsat xatosida qayta urinilmaydi;
 *   · urinishlar soni chegaralangan; yuborilgan so'rov to'g'ri tuzilgan
 *     (fayl nomi .wav, model, til, Authorization);
 *   · xato matniga kalit tushmaydi; foydalanuvchi matnlari qisqa, alifbolar
 *     aralashmaydi.
 *
 *  Halollik: bu OpenAI'ning HAQIQIY javoblarini sinamaydi — xato matnlari
 *  uning hujjatlaridagi shaklga (`{error:{message,type,code}}`) ko'ra yozilgan.
 *  Haqiqiy kalit va tarmoq bilan sinash uchun administrator ovozni sinaydi:
 *  oynada sabab ko'rinadi.
 * ============================================================
 */
import { readFileSync } from 'node:fs';
import { A } from '../src/lib/alifbo';
import { STT_XABARI, ZAXIRA_MODELI, ovozniMatnga, sababniAniqla, type SttNatija } from '../src/lib/agent/stt';

type Sinov = { nomi: string; tekshir: () => boolean | Promise<boolean> };

const SOXTA_KALIT = 'sk-TESTKALIT1234567890abcdefghij';
const PROV = { provayder: 'openai' as const, kalit: SOXTA_KALIT, baza: 'https://api.openai.test/v1' };

function fayl(): File {
  return new File([new Uint8Array(1000)], 'ovoz.wav', { type: 'audio/wav' });
}

interface Chaqiruv {
  url: string;
  auth: string;
  maydonlar: Record<string, string>;
  faylNomi: string;
  faylBayt: number;
}

/** Soxta provayder: javoblar ketma-ket beriladi; har chaqiruv yozib boriladi */
function soxta(javoblar: Array<{ status: number; json?: unknown; matn?: string } | 'abort' | 'tarmoq'>) {
  const chaqiruvlar: Chaqiruv[] = [];
  let i = 0;
  const fetchFn = (async (url: string, init: RequestInit) => {
    const f = init.body as FormData;
    const maydonlar: Record<string, string> = {};
    for (const [k, v] of f.entries()) if (typeof v === 'string') maydonlar[k] = v;
    const file = f.get('file') as File;
    chaqiruvlar.push({
      url,
      auth: String((init.headers as Record<string, string>).authorization),
      maydonlar,
      faylNomi: file.name,
      faylBayt: file.size,
    });
    const j = javoblar[Math.min(i++, javoblar.length - 1)];
    if (j === 'abort') throw Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    if (j === 'tarmoq') throw new TypeError('fetch failed');
    return new Response(j.matn ?? JSON.stringify(j.json ?? {}), { status: j.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { fetchFn, chaqiruvlar };
}

const xato = (status: number, message: string, code = '', type = 'invalid_request_error') => ({ status, json: { error: { message, type, code } } });
const yaxshi = (text: string) => ({ status: 200, json: { text } });

async function yurgiz(javoblar: Parameters<typeof soxta>[0], model?: string) {
  const s = soxta(javoblar);
  const n: SttNatija = await ovozniMatnga(PROV, fayl(), { fetchFn: s.fetchFn, model });
  return { n, ch: s.chaqiruvlar };
}

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Muvaffaqiyat (1 urinish): matn bo‘shliqlari tozalanadi; so‘rov to‘g‘ri tuzilgan — OpenAI manzili, Bearer, fayl ovoz.wav, model whisper-1, til uz, harorat 0, izoh bor',
    tekshir: async () => {
      const { n, ch } = await yurgiz([yaxshi('  xatlov   qanday ketyapti \n')]);
      return (
        n.ok && n.matn === 'xatlov qanday ketyapti' && n.urinish === 1 && ch.length === 1 &&
        ch[0].url === 'https://api.openai.test/v1/audio/transcriptions' && ch[0].auth === `Bearer ${SOXTA_KALIT}` &&
        ch[0].faylNomi === 'ovoz.wav' && ch[0].faylBayt === 1000 &&
        ch[0].maydonlar.model === 'whisper-1' && ch[0].maydonlar.language === 'uz' && ch[0].maydonlar.temperature === '0' && /xatlov/.test(ch[0].maydonlar.prompt)
      );
    },
  },
  {
    nomi: 'Groq: standart model whisper-large-v3-turbo; AGENT_STT_MODEL berilsa — o‘sha',
    tekshir: async () => {
      const s1 = soxta([yaxshi('a')]);
      await ovozniMatnga({ ...PROV, provayder: 'groq' }, fayl(), { fetchFn: s1.fetchFn });
      const s2 = soxta([yaxshi('a')]);
      await ovozniMatnga(PROV, fayl(), { fetchFn: s2.fetchFn, model: 'gpt-4o-mini-transcribe' });
      return s1.chaqiruvlar[0].maydonlar.model === 'whisper-large-v3-turbo' && s2.chaqiruvlar[0].maydonlar.model === 'gpt-4o-mini-transcribe';
    },
  },
  {
    nomi: 'Provayder TILni rad etsa ("language ... invalid"): til OLIB TASHLANIB qayta uriladi va natija beradi (2 urinish); izoh saqlanadi',
    tekshir: async () => {
      const { n, ch } = await yurgiz([xato(400, "Invalid language 'uz'. Language parameter must be specified in ISO-639-1 format.", 'invalid_language_format'), yaxshi('salom')]);
      return n.ok && n.matn === 'salom' && n.urinish === 2 && ch.length === 2 && 'language' in ch[0].maydonlar && !('language' in ch[1].maydonlar) && 'prompt' in ch[1].maydonlar;
    },
  },
  {
    nomi: 'Provayder HARORATni rad etsa: harorat olib tashlanadi, til saqlanadi',
    tekshir: async () => {
      const { n, ch } = await yurgiz([xato(400, "Unsupported parameter: 'temperature' is not supported with this model.", 'unsupported_parameter'), yaxshi('ok')]);
      return n.ok && ch.length === 2 && !('temperature' in ch[1].maydonlar) && ch[1].maydonlar.language === 'uz';
    },
  },
  {
    nomi: 'Provayder IZOHni (prompt) rad etsa: izoh olib tashlanadi',
    tekshir: async () => {
      const { n, ch } = await yurgiz([xato(400, 'The prompt parameter is not supported for this model.'), yaxshi('ok')]);
      return n.ok && ch.length === 2 && !('prompt' in ch[1].maydonlar) && ch[1].maydonlar.language === 'uz';
    },
  },
  {
    nomi: 'Bir necha parametr ketma-ket rad etilsa (til, keyin harorat): ikkalasi olib tashlanib 3-urinishda natija; 4 urinishdan oshmaydi',
    tekshir: async () => {
      const a = await yurgiz([xato(400, 'Invalid language'), xato(400, 'temperature is not supported'), yaxshi('ok')]);
      const b = await yurgiz([xato(400, 'Invalid language'), xato(400, 'temperature is not supported'), xato(400, 'prompt is not supported'), xato(400, 'bad request'), xato(400, 'bad request')]);
      /* Eng yomon ketma-ketlik: 4 ta rad, 5-urinishda muvaffaqiyat bo‘lardi — lekin chegara 4 da to‘xtatadi */
      const c = await yurgiz([xato(400, 'Invalid language'), xato(400, 'temperature is not supported'), xato(400, 'prompt is not supported'), xato(404, 'The model does not exist', 'model_not_found'), yaxshi('kech')], 'gpt-4o-transcribe');
      return a.n.ok && a.ch.length === 3 && !b.n.ok && b.ch.length <= 4 && !c.n.ok && c.ch.length === 4 && c.n.urinish === 4;
    },
  },
  {
    nomi: 'Maxsus model topilmasa (404/"does not exist"): ZAXIRA modeli whisper-1 bilan qayta uriladi; whisper-1 o‘zi topilmasa — qayta urinilmaydi, sabab "model"',
    tekshir: async () => {
      const a = await yurgiz([xato(404, 'The model `gpt-4o-transcribe` does not exist or you do not have access to it.', 'model_not_found'), yaxshi('ok')], 'gpt-4o-transcribe');
      const b = await yurgiz([xato(404, 'The model `whisper-1` does not exist.', 'model_not_found')]);
      return a.n.ok && a.ch.length === 2 && a.ch[1].maydonlar.model === ZAXIRA_MODELI && !b.n.ok && b.n.sabab === 'model' && b.ch.length === 1;
    },
  },
  {
    nomi: 'KALIT noto‘g‘ri (401): darhol "kalit", QAYTA URINILMAYDI (1 so‘rov); xato matniga kalit TUSHMAYDI',
    tekshir: async () => {
      const { n, ch } = await yurgiz([xato(401, `Incorrect API key provided: ${SOXTA_KALIT}. You can find your API key at https://platform.openai.com/account/api-keys.`, 'invalid_api_key', 'invalid_request_error')]);
      return !n.ok && n.sabab === 'kalit' && n.holat === 401 && ch.length === 1 && !n.tafsilot.includes(SOXTA_KALIT) && !JSON.stringify(n).includes('TESTKALIT1234567890');
    },
  },
  {
    nomi: 'HISOB tugagan (429 insufficient_quota): "hisob", qayta urinilmaydi; oddiy chegara (429 rate limit) — "band"',
    tekshir: async () => {
      const a = await yurgiz([xato(429, 'You exceeded your current quota, please check your plan and billing details.', 'insufficient_quota', 'insufficient_quota')]);
      const b = await yurgiz([xato(429, 'Rate limit reached for whisper-1 in organization org-x on requests per min.', 'rate_limit_exceeded', 'requests')]);
      return !a.n.ok && a.n.sabab === 'hisob' && a.ch.length === 1 && !b.n.ok && b.n.sabab === 'band' && b.ch.length === 1;
    },
  },
  {
    nomi: 'RUXSAT yo‘q (403): "ruxsat" (kalit/loyiha bu xizmatga ruxsat bermaydi), qayta urinilmaydi',
    tekshir: async () => {
      const { n, ch } = await yurgiz([xato(403, 'You do not have permission to access this resource. Missing scopes: model.request', 'insufficient_permissions')]);
      return !n.ok && n.sabab === 'ruxsat' && ch.length === 1;
    },
  },
  {
    nomi: 'Provayderning 5xx xatosi: BIR marta qayta uriladi (muvaffaqiyat bo‘lsa — natija); ikki marta 5xx — "provayder"',
    tekshir: async () => {
      const a = await yurgiz([{ status: 503, json: { error: { message: 'The server is overloaded' } } }, yaxshi('ok')]);
      const b = await yurgiz([{ status: 500, matn: 'Internal Server Error' }, { status: 502, matn: '<html>Bad gateway</html>' }, { status: 502, matn: 'x' }]);
      return a.n.ok && a.ch.length === 2 && !b.n.ok && b.n.sabab === 'provayder' && b.ch.length === 2;
    },
  },
  {
    nomi: 'Vaqt va tarmoq: AbortError → "vaqt"; fetch xatosi → "tarmoq"; ikkalasida ham qayta urinilmaydi',
    tekshir: async () => {
      const a = await yurgiz(['abort']);
      const b = await yurgiz(['tarmoq']);
      return !a.n.ok && a.n.sabab === 'vaqt' && a.ch.length === 1 && !b.n.ok && b.n.sabab === 'tarmoq' && b.ch.length === 1;
    },
  },
  {
    nomi: 'JSON bo‘lmagan xato javobi (HTML sahifa) ham sababga ajraladi: 413 → "hajm"; 504 → "vaqt"; 415 → "format"',
    tekshir: async () => {
      const a = await yurgiz([{ status: 413, matn: '<html>Request Entity Too Large</html>' }]);
      const b = await yurgiz([{ status: 504, matn: '<html>Gateway Timeout</html>' }]);
      const c = await yurgiz([xato(415, 'Unrecognized file format.')]);
      return !a.n.ok && a.n.sabab === 'hajm' && !b.n.ok && b.n.sabab === 'vaqt' && !c.n.ok && c.n.sabab === 'format';
    },
  },
  {
    nomi: 'Bo‘sh javob ({text: ""}) — muvaffaqiyat, lekin matn bo‘sh (yo‘l buni "eshitilmadi" deydi)',
    tekshir: async () => {
      const { n } = await yurgiz([yaxshi('')]);
      return n.ok && n.matn === '';
    },
  },
  {
    nomi: 'sababniAniqla jadvali: 401 kalit; 429+quota hisob; 429 band; 403 ruxsat; 403+model model; 404 model; 400 format; 413 hajm; 500 provayder; 418 bosh',
    tekshir: () => {
      const bosh = { xabar: '', tur: '', kod: '' };
      const kv = (xabar: string) => ({ xabar, tur: '', kod: '' });
      return (
        sababniAniqla(401, bosh) === 'kalit' && sababniAniqla(429, kv('quota exceeded')) === 'hisob' && sababniAniqla(429, kv('slow down')) === 'band' &&
        sababniAniqla(403, bosh) === 'ruxsat' && sababniAniqla(403, kv('model does not exist')) === 'model' && sababniAniqla(404, bosh) === 'model' &&
        sababniAniqla(400, kv('bad file')) === 'format' && sababniAniqla(413, bosh) === 'hajm' && sababniAniqla(500, bosh) === 'provayder' && sababniAniqla(418, bosh) === 'bosh'
      );
    },
  },
  {
    nomi: 'Foydalanuvchi matnlari: har sabab uchun bor, ≤ 60 belgi (lotinda), nuqta bilan tugaydi; lotinda kirill harf yo‘q, kirillda so‘z ichida lotin harfi yo‘q',
    tekshir: () => {
      const hammasi = Object.entries(STT_XABARI);
      return (
        hammasi.length === 11 &&
        hammasi.every(([k, m]) => {
          const lot = A(m, 'lot');
          const ok = m.length > 10 && lot.length <= 60 && m.endsWith('.') && !/[Ѐ-ӿ]/.test(lot) && !/[А-Яа-яЎўҚқҒғҲҳ][A-Za-z]|[A-Za-z][А-Яа-яЎўҚқҒғҲҳ]/.test(m);
          if (!ok) console.log(`     muammo: ${k} (${lot.length}): ${lot}`);
          return ok;
        })
      );
    },
  },
  {
    nomi: 'Marshrut: provayder so‘rovi `ovozniMatnga` orqali; matn chiqmasa (xato, bo‘sh matn, kutilmagan xato) — 3 joyda soniyalar QAYTARILADI; [provayder holat] belgisi FAQAT administratorga; kalit javobga tushmaydi',
    tekshir: () => {
      const r = readFileSync('src/app/api/agent/ovoz/route.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      return (
        /ovozniMatnga\(prov, fayl/.test(r) && /STT_XABARI\[n\.sabab\]/.test(r) &&
        (r.match(/ovozniQaytar\(q\.sessiya\.userId, sarf\)/g) ?? []).length === 3 &&
        /q\.sessiya\.rol === 'ADMIN' \? ` \[\$\{prov\.provayder\} \$\{n\.holat \|\| n\.sabab\}\]` : ''/.test(r) &&
        !/prov\.kalit/.test(r.replace(/ovozniMatnga\(prov, fayl/g, '')) && /izId/.test(r)
      );
    },
  },
];

(async () => {
  let xatolar = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xatolar++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  console.log(`\n${SINOVLAR.length - xatolar}/${SINOVLAR.length} o'tdi`);
  process.exit(xatolar ? 1 : 0);
})();
