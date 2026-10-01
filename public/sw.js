/*
 * ============================================================
 *  SERVICE WORKER — ENG KAM, ENG EHTIYOTKOR SHAKLDA
 *
 *  ── Nega bu fayl ataylab KICHIK ──
 *
 *  Service worker — loyihadagi eng xavfli fayl. U sahifa
 *  ochilishini o‘z ustiga oladi va noto‘g‘ri yozilsa:
 *
 *    · 70 ta xodimga ESKI sahifani berib turadi;
 *    · boshqa xodimning sahifasini ko‘rsatib yuboradi;
 *    · xatolikni tuzatish uchun ham yangi versiya
 *      yetib bormaydi — chunki worker o‘zini keshlab oladi.
 *
 *  Shuning uchun bu yerda faqat BITTA narsa keshlanadi:
 *  HAMMA foydalanuvchi uchun BIR XIL va o‘zgarmas fayllar.
 *
 *  ── Nima keshlanadi ──
 *
 *    /_next/static/*   hash li JS va CSS (nomi mazmunidan
 *                      kelib chiqadi — mazmun o‘zgarsa nomi
 *                      ham o‘zgaradi)
 *    /shrift/*         shriftlar
 *    /ikonka/*         ikonkalar
 *    /oflayn.html      internet yo‘q paytdagi sahifa
 *
 *  ── Nima HECH QACHON keshlanmaydi ──
 *
 *    · sahifalar (HTML) — ichida ism, mahalla va login bor;
 *    · /api/* — fuqaro va xonadon ma’lumoti;
 *    · RSC so‘rovlari — sahifa bilan bir manzil, boshqa tur;
 *    · POST va boshqa yozish so‘rovlari.
 *
 *  Bular uchun `respondWith` UMUMAN chaqirilmaydi: brauzer
 *  so‘rovni o‘zi, worker’siz yuboradi.
 *
 *  ── Nega bu «hisob almashganda aralashmaydi» ni kafolatlaydi ──
 *
 *  Keshda xodimga xos HECH NARSA yo‘q. Telefonni ikkinchi
 *  xodim olsa, keshdan ko‘radigan yagona narsa — hamma uchun
 *  bir xil logo va kod. Chiqish paytida keshni tozalash
 *  shart emas, chunki tozalanadigan narsa yo‘q.
 *
 *  ── Yangilanish va qoralama ──
 *
 *  Qoralama va oflayn navbat `localStorage` da — worker ularga
 *  UMUMAN tegmaydi (worker’da `localStorage` yo‘q ham).
 *  Yangilanish sahifani o‘zi qayta yuklamaydi: xodim anketa
 *  o‘rtasida bo‘lsa, ekran birdan yangilanib ketmasin.
 * ============================================================
 */

const STATIK = 'statik';
const OFLAYN = 'oflayn-v1';
const OFLAYN_SAHIFA = '/oflayn.html';

/*
 * Statik kesh to‘lib ketmasin: telefon xotirasi cheklangan.
 * Nomlar hash li bo‘lgani uchun eskilari o‘zi kerak bo‘lmay
 * qoladi; eng eskilarini o‘chirib turamiz.
 */
const STATIK_CHEGARA = 150;

/** Ruxsat berilgan statik manzillar — BOSHQA HECH NARSA emas */
function statikMi(url) {
  const y = url.pathname;
  return (
    y.startsWith('/_next/static/') ||
    y.startsWith('/shrift/') ||
    y.startsWith('/ikonka/') ||
    y === '/favicon.svg' ||
    y === '/hokimiyat-logo.png'
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFLAYN)
      /*
       * `reload` — brauzer HTTP keshidan emas, serverdan olsin.
       * Aks holda eski oflayn sahifa yangisining o‘rniga
       * saqlanib qolishi mumkin.
       */
      .then((kesh) => kesh.add(new Request(OFLAYN_SAHIFA, { cache: 'reload' })))
      /*
       * O‘rnatish yiqilsa ham worker o‘rnatilaveradi: oflayn
       * sahifa bo‘lmasa, brauzerning o‘z xatosi chiqadi —
       * bu ilovani buzishdan yaxshiroq.
       */
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      /*
       * `statik` ga TEGILMAYDI: eski ochiq sahifa eski hash li
       * faylni so‘rashi mumkin va deploydan keyin u serverda
       * bo‘lmasligi mumkin.
       *
       * Faqat TANISHMAGAN keshlar o‘chadi (oldingi versiyalar
       * qoldirgan oflayn keshlar).
       */
      const nomlar = await caches.keys();
      await Promise.all(
        nomlar.filter((n) => n !== STATIK && n !== OFLAYN).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

async function chekla(kesh) {
  const kalitlar = await kesh.keys();
  const ortiqcha = kalitlar.length - STATIK_CHEGARA;
  for (let i = 0; i < ortiqcha; i += 1) await kesh.delete(kalitlar[i]);
}

self.addEventListener('fetch', (event) => {
  const so = event.request;

  /* Faqat GET va faqat o‘z manzilimiz. Qolganiga tegilmaydi. */
  if (so.method !== 'GET') return;
  const url = new URL(so.url);
  if (url.origin !== self.location.origin) return;

  /* ── 1. Sahifa ochish: HAR DOIM tarmoqdan ── */
  if (so.mode === 'navigate') {
    event.respondWith(
      fetch(so).catch(async () => {
        /*
         * `catch` FAQAT tarmoq yo‘q bo‘lganda ishlaydi. Server
         * 401, 403, 500 desa ham `fetch` muvaffaqiyatli
         * qaytadi va javob o‘zgarishsiz o‘tadi — ya’ni
         * «ruxsat yo‘q» ekrani oflayn sahifa bilan
         * almashtirilmaydi.
         */
        const kesh = await caches.open(OFLAYN);
        const sahifa = await kesh.match(OFLAYN_SAHIFA);
        return (
          sahifa ||
          new Response('Internet yo‘q', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      })
    );
    return;
  }

  /* ── 2. Statik fayl: keshdan, bo‘lmasa tarmoqdan ── */
  if (statikMi(url)) {
    event.respondWith(
      (async () => {
        const kesh = await caches.open(STATIK);
        const bor = await kesh.match(so);
        if (bor) return bor;

        const javob = await fetch(so);
        /*
         * Faqat TO‘LIQ va O‘Z manzilimizdan kelgan javob
         * saqlanadi. Yo‘nalish (redirect) javobi, xato yoki
         * qisman javob (206) keshga tushsa, keyin hamma
         * foydalanuvchi o‘shani oladi.
         */
        if (javob.ok && javob.status === 200 && javob.type === 'basic') {
          await kesh.put(so, javob.clone());
          await chekla(kesh);
        }
        return javob;
      })()
    );
    return;
  }

  /* ── 3. Qolgan hamma narsa (API, RSC, ...): worker’siz ── */
});
