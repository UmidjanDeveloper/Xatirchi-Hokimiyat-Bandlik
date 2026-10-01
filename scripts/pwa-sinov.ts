/**
 * ============================================================
 *  PWA — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/pwa-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *  Service worker — loyihadagi eng xavfli fayl: u sahifa
 *  ochilishini o'z ustiga oladi. Noto'g'ri yozilgan bo'lsa:
 *
 *    · xodimga ESKI sahifani berib turadi;
 *    · boshqa xodimning sahifasini ko'rsatib yuboradi;
 *    · tuzatilgan versiya telefonga yetib bormaydi.
 *
 *  Shuning uchun `sw.js` matnini TEKSHIRIB qo'ya qolmaymiz:
 *  uni sandbox'da ISHGA TUSHIRAMIZ va har xil so'rov yuborib,
 *  nimani keshlagani va nimani keshlamaganini ko'ramiz.
 *
 *  Haqiqiy brauzerdagi sinov (o'rnatish, oflayn, hisob
 *  almashish) `scripts/pwa-brauzer-sinov.mjs` da — u server
 *  va Chromium talab qiladi, shuning uchun CI da emas.
 * ============================================================
 */
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

type Sinov = { nomi: string; tekshir: () => Promise<boolean> | boolean };

const ORIGIN = 'https://bandlik.test';
const SW = readFileSync('public/sw.js', 'utf8');

const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ────────────────────────────────────────────────────────
 *  SANDBOX: `sw.js` ni haqiqiy qiymatlarsiz ishga tushiradi
 * ──────────────────────────────────────────────────────── */

type Javob = {
  ok: boolean;
  status: number;
  type: string;
  body: string;
  clone: () => Javob;
};

const javob = (body: string, o: Partial<Javob> = {}): Javob => {
  const j: Javob = { ok: true, status: 200, type: 'basic', body, clone: () => j, ...o };
  return j;
};

function sandbox() {
  const tinglovchilar: Record<string, (e: unknown) => void> = {};
  const keshlar = new Map<string, Map<string, Javob>>();
  const tarmoqChaqiruvlari: string[] = [];
  let tarmoq: (url: string) => Promise<Javob> = async (u) => javob(`tarmoq:${u}`);
  let tashlandi = false;
  let addYiqilsin = false;

  const keshObyekti = (nom: string) => {
    if (!keshlar.has(nom)) keshlar.set(nom, new Map());
    const m = keshlar.get(nom)!;
    return {
      add: async (so: { url: string } | string) => {
        if (addYiqilsin) throw new TypeError('oflayn sahifani yuklab bo‘lmadi');
        const url = typeof so === 'string' ? so : so.url;
        m.set(new URL(url, ORIGIN).pathname, javob(`oldindan:${url}`));
      },
      put: async (so: { url: string }, j: Javob) => void m.set(new URL(so.url).pathname, j),
      match: async (so: { url: string } | string) =>
        m.get(new URL(typeof so === 'string' ? so : so.url, ORIGIN).pathname),
      keys: async () => [...m.keys()].map((p) => ({ url: ORIGIN + p })),
      delete: async (so: { url: string } | string) =>
        m.delete(new URL(typeof so === 'string' ? so : so.url, ORIGIN).pathname),
    };
  };

  const konteks = {
    self: {
      location: { origin: ORIGIN },
      addEventListener: (t: string, f: (e: unknown) => void) => void (tinglovchilar[t] = f),
      skipWaiting: async () => void (tashlandi = true),
      clients: { claim: async () => {} },
    },
    caches: {
      open: async (n: string) => keshObyekti(n),
      keys: async () => [...keshlar.keys()],
      delete: async (n: string) => keshlar.delete(n),
    },
    fetch: async (so: { url: string }) => {
      tarmoqChaqiruvlari.push(new URL(so.url).pathname);
      return tarmoq(so.url);
    },
    Request: class {
      url: string;
      constructor(u: string) {
        this.url = new URL(u, ORIGIN).toString();
      }
    },
    Response: class {
      body: string;
      status: number;
      constructor(b: string, o: { status?: number } = {}) {
        this.body = b;
        this.status = o.status ?? 200;
      }
    },
    URL,
  };

  vm.runInNewContext(SW, konteks);

  /** Bitta `fetch` hodisasini yuboradi */
  async function sorov(p: {
    url: string;
    method?: string;
    mode?: string;
    origin?: string;
  }): Promise<{ javobBerdi: boolean; natija?: Javob }> {
    let javobBerdi = false;
    let va: Promise<Javob> | undefined;
    const so = {
      method: p.method ?? 'GET',
      mode: p.mode ?? 'cors',
      url: (p.origin ?? ORIGIN) + p.url,
    };
    tinglovchilar.fetch({
      request: so,
      respondWith: (pr: Promise<Javob>) => {
        javobBerdi = true;
        va = pr;
      },
    });
    return { javobBerdi, natija: va ? await va.catch(() => undefined) : undefined };
  }

  return {
    tinglovchilar,
    keshlar,
    tarmoqChaqiruvlari,
    sorov,
    tarmoqniOzgartir: (f: (url: string) => Promise<Javob>) => void (tarmoq = f),
    skipWaitingChaqirildimi: () => tashlandi,
    addniYiqit: () => void (addYiqilsin = true),
  };
}

/** `install` va `activate` hodisalarini kutadi */
async function yasha(sb: ReturnType<typeof sandbox>, hodisa: 'install' | 'activate') {
  let va: Promise<unknown> = Promise.resolve();
  sb.tinglovchilar[hodisa]({ waitUntil: (p: Promise<unknown>) => void (va = p) });
  await va;
}

const SINOVLAR: Sinov[] = [
  /* ── 1. NIMA HECH QACHON KESHLANMAYDI ── */
  {
    /*
     * /api/* — fuqaro va xonadon ma'lumoti. Keshga tushsa,
     * telefonni olgan keyingi xodim oldingi xodimning
     * ma'lumotini ko'radi.
     */
    nomi: 'GET /api/* — worker UMUMAN aralashmaydi',
    tekshir: async () => {
      const sb = sandbox();
      const r1 = await sb.sorov({ url: '/api/ishsizlar' });
      const r2 = await sb.sorov({ url: '/api/xatlov?id=5' });
      const r3 = await sb.sorov({ url: '/api/hisobot/pdf' });
      return !r1.javobBerdi && !r2.javobBerdi && !r3.javobBerdi && sb.keshlar.size === 0;
    },
  },
  {
    nomi: 'POST/PUT/PATCH/DELETE — worker aralashmaydi',
    tekshir: async () => {
      const sb = sandbox();
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const r = await sb.sorov({ url: '/api/xatlov', method });
        if (r.javobBerdi) return false;
        /* Statik manzilga ham yozish so'rovi kesh bilan javob bermasin */
        const s = await sb.sorov({ url: '/_next/static/a.js', method });
        if (s.javobBerdi) return false;
      }
      return sb.keshlar.size === 0;
    },
  },
  {
    nomi: 'RSC va ma‘lumot so‘rovlari (/_next/data, sahifa manzili) keshlanmaydi',
    tekshir: async () => {
      const sb = sandbox();
      const a = await sb.sorov({ url: '/vazifalar' }); /* navigate EMAS — RSC fetch */
      const b = await sb.sorov({ url: '/_next/data/abc/vazifalar.json' });
      const c = await sb.sorov({ url: '/panel?davr=oy' });
      return !a.javobBerdi && !b.javobBerdi && !c.javobBerdi && sb.keshlar.size === 0;
    },
  },
  {
    nomi: 'Boshqa domen so‘rovi — worker aralashmaydi',
    tekshir: async () => {
      const sb = sandbox();
      const r = await sb.sorov({ url: '/_next/static/a.js', origin: 'https://boshqa.test' });
      return !r.javobBerdi;
    },
  },
  {
    /*
     * Manzilning YO'LI emas, so'rovning ko'rinishi aldamasin:
     * `/api/` ichida `_next/static` degan so'z bo'lishi
     * uni statik qilib qo'ymasligi kerak.
     */
    nomi: 'Statik manzilga o‘xshatilgan /api yo‘li keshlanmaydi',
    tekshir: async () => {
      const sb = sandbox();
      const a = await sb.sorov({ url: '/api/_next/static/a.js' });
      const b = await sb.sorov({ url: '/vazifalar/_next/static/a.js' });
      const c = await sb.sorov({ url: '/ishsizlar?x=/_next/static/a.js' });
      return !a.javobBerdi && !b.javobBerdi && !c.javobBerdi;
    },
  },

  /* ── 2. SAHIFA OCHISH ── */
  {
    nomi: 'Sahifa ochish HAR DOIM tarmoqdan, keshga yozilmaydi',
    tekshir: async () => {
      const sb = sandbox();
      sb.tarmoqniOzgartir(async () => javob('<html>shaxsiy sahifa</html>'));
      const r = await sb.sorov({ url: '/vazifalar', mode: 'navigate' });
      return (
        r.javobBerdi &&
        r.natija?.body.includes('shaxsiy sahifa') === true &&
        sb.tarmoqChaqiruvlari.includes('/vazifalar') &&
        /* Hech qaysi keshga YOZILMADI */
        [...sb.keshlar.values()].every((m) => ![...m.keys()].includes('/vazifalar'))
      );
    },
  },
  {
    /*
     * Ikkinchi marta ochilganda ham tarmoqdan: avvalgi
     * xodimning sahifasi keshda yotmaydi.
     */
    nomi: 'Ikkinchi ochilishda ham tarmoqdan (kesh javob bermaydi)',
    tekshir: async () => {
      const sb = sandbox();
      let n = 0;
      sb.tarmoqniOzgartir(async () => javob(`sahifa-${++n}`));
      const a = await sb.sorov({ url: '/panel', mode: 'navigate' });
      const b = await sb.sorov({ url: '/panel', mode: 'navigate' });
      return a.natija?.body === 'sahifa-1' && b.natija?.body === 'sahifa-2';
    },
  },
  {
    nomi: 'Internet YO‘Q bo‘lsa — oflayn sahifa chiqadi',
    tekshir: async () => {
      const sb = sandbox();
      await yasha(sb, 'install');
      sb.tarmoqniOzgartir(async () => {
        throw new TypeError('Failed to fetch');
      });
      const r = await sb.sorov({ url: '/vazifalar', mode: 'navigate' });
      return r.javobBerdi && r.natija?.body.includes('oflayn.html') === true;
    },
  },
  {
    /*
     * `catch` FAQAT tarmoq yo'q bo'lganda ishlaydi. Server
     * 401 yoki 500 desa, javob o'zgarishsiz o'tadi: «ruxsat
     * yo'q» ekrani oflayn sahifa bilan almashtirilmaydi.
     */
    nomi: 'Server 401/403/500 desa — javob O‘ZGARISHSIZ o‘tadi',
    tekshir: async () => {
      const sb = sandbox();
      await yasha(sb, 'install');
      for (const status of [401, 403, 404, 500, 503]) {
        sb.tarmoqniOzgartir(async () => javob(`xato-${status}`, { ok: false, status }));
        const r = await sb.sorov({ url: '/panel', mode: 'navigate' });
        if (r.natija?.body !== `xato-${status}` || r.natija.status !== status) return false;
      }
      return true;
    },
  },
  {
    nomi: 'Oflayn sahifa keshda ham yo‘q bo‘lsa — 503 matn (oq ekran emas)',
    tekshir: async () => {
      const sb = sandbox(); /* install chaqirilmadi — kesh bo'sh */
      sb.tarmoqniOzgartir(async () => {
        throw new TypeError('Failed to fetch');
      });
      const r = await sb.sorov({ url: '/panel', mode: 'navigate' });
      return r.javobBerdi && r.natija?.status === 503;
    },
  },

  /* ── 3. STATIK FAYL ── */
  {
    nomi: 'Statik fayl keshlanadi va ikkinchi marta tarmoqqa chiqilmaydi',
    tekshir: async () => {
      const sb = sandbox();
      const yol = '/_next/static/chunks/main-abc123.js';
      await sb.sorov({ url: yol });
      const oldin = sb.tarmoqChaqiruvlari.length;
      const r = await sb.sorov({ url: yol });
      return (
        r.javobBerdi &&
        sb.tarmoqChaqiruvlari.length === oldin &&
        sb.keshlar.get('statik')?.has(yol) === true
      );
    },
  },
  {
    nomi: 'Ruxsat etilgan statik manzillar: _next/static, shrift, ikonka, logo',
    tekshir: async () => {
      const sb = sandbox();
      for (const y of [
        '/_next/static/css/a.css',
        '/shrift/hisobot-bold.ttf',
        '/ikonka/ikonka-192.png',
        '/favicon.svg',
        '/hokimiyat-logo.png',
      ]) {
        const r = await sb.sorov({ url: y });
        if (!r.javobBerdi) return false;
      }
      return true;
    },
  },
  {
    /*
     * Yo'naltirish, xato yoki qisman javob keshga tushsa,
     * keyin HAMMA foydalanuvchi o'shani oladi.
     */
    nomi: 'Xato, yo‘naltirish va qisman javob keshga TUSHMAYDI',
    tekshir: async () => {
      const sb = sandbox();
      const holatlar: [string, Partial<Javob>][] = [
        ['/_next/static/a.js', { ok: false, status: 404 }],
        ['/_next/static/b.js', { ok: false, status: 500 }],
        ['/_next/static/c.js', { status: 206 }],
        ['/_next/static/d.js', { type: 'opaque' }],
        ['/_next/static/e.js', { type: 'cors' }],
      ];
      for (const [yol, o] of holatlar) {
        sb.tarmoqniOzgartir(async () => javob('x', o));
        await sb.sorov({ url: yol });
      }
      return (sb.keshlar.get('statik')?.size ?? 0) === 0;
    },
  },
  {
    nomi: 'Statik kesh CHEGARALANGAN — xotira to‘lib ketmaydi',
    tekshir: async () => {
      const sb = sandbox();
      for (let i = 0; i < 260; i += 1) await sb.sorov({ url: `/_next/static/f-${i}.js` });
      const n = sb.keshlar.get('statik')?.size ?? 0;
      return n > 0 && n <= 150;
    },
  },

  /* ── 4. O'RNATISH VA YANGILANISH ── */
  {
    nomi: 'O‘rnatishda oflayn sahifa keshga olinadi',
    tekshir: async () => {
      const sb = sandbox();
      await yasha(sb, 'install');
      return sb.keshlar.get('oflayn-v1')?.has('/oflayn.html') === true;
    },
  },
  {
    /*
     * Oflayn sahifa yuklanmasa ham worker o'rnatiladi:
     * ilovani buzishdan ko'ra, brauzerning o'z xatosi yaxshi.
     *
     * Bu yerda `add` HAQIQATAN yiqitiladi — avval sinov
     * `add` ni yiqitmay turib «yiqilmaydi» deb o'tardi.
     */
    nomi: 'Oflayn sahifa yuklanmasa ham o‘rnatish YIQILMAYDI',
    tekshir: async () => {
      const sb = sandbox();
      sb.addniYiqit();
      let rad = false;
      await new Promise<void>((resolve) => {
        sb.tinglovchilar.install({
          waitUntil: (p: Promise<unknown>) => {
            p.then(() => resolve()).catch(() => {
              rad = true;
              resolve();
            });
          },
        });
      });
      /* Va keshda oflayn sahifa YO'Q — yiqitish haqiqatan ishladi */
      return !rad && !sb.keshlar.get('oflayn-v1')?.has('/oflayn.html') && sb.skipWaitingChaqirildimi();
    },
  },
  {
    nomi: 'Faollashganda TANISHMAGAN keshlar o‘chadi, statik va oflayn qoladi',
    tekshir: async () => {
      const sb = sandbox();
      sb.keshlar.set('statik', new Map([['/_next/static/eski.js', javob('x')]]));
      sb.keshlar.set('oflayn-v1', new Map());
      sb.keshlar.set('sahifalar-v0', new Map([['/panel', javob('shaxsiy')]]));
      sb.keshlar.set('api-kesh', new Map([['/api/x', javob('shaxsiy')]]));
      await yasha(sb, 'activate');
      const nomlar = [...sb.keshlar.keys()].sort();
      return (
        nomlar.join(',') === 'oflayn-v1,statik' &&
        /* Eski ochiq sahifa so'raydigan hash li fayl YO'QOLMADI */
        sb.keshlar.get('statik')?.has('/_next/static/eski.js') === true
      );
    },
  },
  {
    nomi: 'Yangilanish sahifani QAYTA YUKLAMAYDI (anketa o‘rtasida)',
    tekshir: () => {
      const k = kodiOl(SW);
      const reg = kodiOl(readFileSync('src/components/shared/service-worker-register.tsx', 'utf8'));
      return (
        !k.includes('navigate(') &&
        !k.includes('.reload') &&
        !k.includes('postMessage') &&
        !reg.includes('reload') &&
        !reg.includes('location.href')
      );
    },
  },
  {
    nomi: 'Worker `localStorage`ga (qoralama, navbat) UMUMAN tegmaydi',
    tekshir: () => !kodiOl(SW).includes('localStorage') && !kodiOl(SW).includes('indexedDB'),
  },
  {
    nomi: 'Worker `sw.js` ning o‘zini keshlamaydi (tuzatish yetib borsin)',
    tekshir: () => {
      const cfg = readFileSync('next.config.mjs', 'utf8');
      const reg = readFileSync('src/components/shared/service-worker-register.tsx', 'utf8');
      return (
        /source: '\/sw\.js'[\s\S]*?no-cache, no-store, must-revalidate/.test(cfg) &&
        reg.includes("updateViaCache: 'none'")
      );
    },
  },

  /* ── 5. MANIFEST VA IKONKALAR ── */
  {
    nomi: 'Manifest to‘g‘ri: nom, start_url, scope, display, ranglar',
    tekshir: () => {
      const m = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
      return (
        m.name && m.short_name && m.start_url === '/' && m.scope === '/' &&
        m.display === 'standalone' && m.lang === 'uz' &&
        /^#[0-9a-f]{6}$/i.test(m.theme_color) && /^#[0-9a-f]{6}$/i.test(m.background_color)
      );
    },
  },
  {
    nomi: 'Manifestda 192 va 512 ikonka + maskable bor, fayllar MAVJUD',
    tekshir: () => {
      const m = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
      const ik = m.icons as { src: string; sizes: string; purpose?: string }[];
      const bor = (s: string, p: string) => ik.some((i) => i.sizes === s && (i.purpose ?? 'any') === p);
      return (
        bor('192x192', 'any') && bor('512x512', 'any') && bor('512x512', 'maskable') &&
        ik.every((i) => existsSync('public' + i.src))
      );
    },
  },
  {
    /*
     * Fayl o'lchami manifestda yozilgan o'lchamga to'g'ri
     * kelishi kerak: Chrome buni tekshiradi va noto'g'ri
     * bo'lsa «o'rnatish» tugmasini ko'rsatmaydi.
     */
    nomi: 'Ikonka fayllarining HAQIQIY o‘lchami manifestdagiga teng',
    tekshir: () => {
      const m = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
      return (m.icons as { src: string; sizes: string }[]).every((i) => {
        const b = readFileSync('public' + i.src);
        /* PNG: 16..23 bayt — kenglik va balandlik */
        const w = b.readUInt32BE(16);
        const h = b.readUInt32BE(20);
        return `${w}x${h}` === i.sizes;
      });
    },
  },
  {
    nomi: 'iOS ikonkasi 180x180 va SHAFFOF EMAS (qora fon bo‘lib qolmasin)',
    tekshir: () => {
      const b = readFileSync('public/ikonka/apple-touch-ikonka.png');
      /* IHDR: 24-bayt = bit chuqurligi, 25-bayt = rang turi (2 = RGB, 6 = RGBA) */
      return b.readUInt32BE(16) === 180 && b.readUInt32BE(20) === 180 && b[25] === 2;
    },
  },
  {
    nomi: 'Layout manifest, iOS ikonka va worker’ni ulaydi',
    tekshir: () => {
      const l = kodiOl(readFileSync('src/app/layout.tsx', 'utf8'));
      return (
        l.includes("manifest: '/manifest.json'") &&
        l.includes('apple-touch-ikonka.png') &&
        l.includes('<ServiceWorkerRegister />')
      );
    },
  },

  /* ── 6. LOGINSIZ OCHILISHI KERAK BO'LGAN FAYLLAR ── */
  {
    /*
     * Brauzer manifestni va worker'ni cookie'siz so'raydi,
     * worker esa oflayn sahifani O'RNATISH paytida oladi.
     * Qo'riqchidan o'tsa, hammasi LOGIN sahifasiga
     * yo'naltiriladi va kesh oflayn sahifa o'rniga LOGIN
     * sahifasini saqlab qo'yadi.
     */
    nomi: 'Middleware manifest, worker, oflayn sahifa va ikonkalarni o‘tkazib yuboradi',
    tekshir: () => {
      const mw = readFileSync('src/middleware.ts', 'utf8');
      const matcher = mw.slice(mw.indexOf('export const config'));
      return (
        matcher.includes('manifest.json') &&
        matcher.includes('sw.js') &&
        matcher.includes('oflayn.html') &&
        matcher.includes('ikonka/')
      );
    },
  },

  /* ── 7. OFLAYN SAHIFA ── */
  {
    nomi: 'Oflayn sahifada nima ishlashi VA ishlamasligi yozilgan',
    tekshir: () => {
      const h = readFileSync('public/oflayn.html', 'utf8');
      return (
        /Интернетсиз ишлайди/.test(h) && /Интернетсиз ишламайди/.test(h) &&
        /Internetsiz ishlaydi/.test(h) && /Internetsiz ishlamaydi/.test(h)
      );
    },
  },
  {
    nomi: 'Oflayn sahifa ikkala alifboda va tanlangan alifboni cookie’dan oladi',
    tekshir: () => {
      const h = readFileSync('public/oflayn.html', 'utf8');
      return h.includes('id="kir"') && h.includes('id="lot"') && h.includes('bandlik_alifbo');
    },
  },
  {
    /*
     * Tashqi fayl keshda bo'lmasligi mumkin, bu sahifaning
     * butun vazifasi esa internet YO'Q paytda ishlash.
     */
    nomi: 'Oflayn sahifa TASHQI fayl yuklamaydi — hammasi ichida',
    tekshir: () => {
      const h = kodiOl(readFileSync('public/oflayn.html', 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
      return (
        !/<link[^>]+href=/i.test(h) &&
        !/<script[^>]+src=/i.test(h) &&
        !/<img[^>]+src=/i.test(h) &&
        !/url\(\s*['"]?https?:/i.test(h) &&
        !/https?:\/\//i.test(h)
      );
    },
  },
  {
    nomi: 'Oflayn sahifada shaxsiy ma‘lumot YO‘Q (hamma uchun bir xil)',
    tekshir: () => {
      const h = readFileSync('public/oflayn.html', 'utf8');
      const matn = h.replace(/<!--[\s\S]*?-->/g, '');
      /*
       * Shablon belgilari (`{{`, `${`), login/ism maydonlari va
       * test hisoblarining nomlari. «telefon» so'zining o'zi
       * shaxsiy ma'lumot EMAS — u «telefon tarmoqqa ulangan»
       * jumlasida turibdi.
       */
      return (
        !/(\{\{|\$\{|username|fullName|passwordHash|sessiya|tekshiruv_)/i.test(matn) &&
        /* Cookie'dan faqat alifbo o'qiladi, boshqa hech narsa */
        !/document\.cookie[^;]*(session|sessiya|token)/i.test(matn)
      );
    },
  },
  {
    nomi: 'Oflayn sahifa har doim yangi olinadi (eskirgan ko‘rsatma qolmasin)',
    tekshir: () =>
      /source: '\/oflayn\.html'[\s\S]*?no-cache/.test(readFileSync('next.config.mjs', 'utf8')),
  },
];

async function main() {
  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = Boolean(await s.tekshir());
    } catch (e) {
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  process.exit(xato ? 1 : 0);
}

main();
