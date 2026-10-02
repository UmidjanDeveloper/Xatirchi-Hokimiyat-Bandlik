/**
 * ============================================================
 *  MASKOT (KOALA) — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/maskot-sinov.ts
 *
 *  Foydalanuvchi tanlagan koala rasmi ovozli yordamchining maskoti.
 *  Bu sinov quyidagilarni qo'riqlaydi:
 *   · rasm fayllari bor, o'lchami va hajmi to'g'ri (zaif telefonda sahifa
 *     og'irlashmasin), shaffof fonli (RGBA);
 *   · komponent aynan shu fayllarni ishlatadi (WebP + PNG zaxira);
 *   · holat RANGDAN va HARAKATDAN tashqari ham belgi bilan ko'rinadi (GPT §16);
 *   · harakat FAQAT `prefers-reduced-motion: no-preference` va zaif qurilma
 *     bo'lmaganda ishlaydi;
 *   · foydalanuvchiga ko'rinadigan nom — Koala; eski qush maskotidan qoldiq yo'q;
 *   · rasm uzoq muddat keshlanadi (nomda versiya bor).
 *
 *  Brauzerda ko'rinishi alohida: `scripts/brauzer/hudhud-brauzer.mjs`.
 * ============================================================
 */
import { existsSync, readFileSync, statSync } from 'node:fs';

/** Izohsiz kod - izohdagi so'z tekshiruvni aldamasin */
const kodiOl = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const oqi = (y: string) => readFileSync(y, 'utf8');

type Sinov = { nomi: string; tekshir: () => boolean };

const PAPKA = 'public/maskot';
const FAYLLAR = {
  webp128: `${PAPKA}/koala-v1-128.webp`,
  webp256: `${PAPKA}/koala-v1-256.webp`,
  png128: `${PAPKA}/koala-v1-128.png`,
};

/** PNG: kenglik, balandlik, rang turi (6 = RGBA) */
function pngOlcham(yol: string) {
  const b = readFileSync(yol);
  const imzo = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { imzo, w: b.readUInt32BE(16), h: b.readUInt32BE(20), rangTuri: b[25] };
}

/** WebP (VP8X): kenglik, balandlik, shaffoflik bayrog'i */
function webpOlcham(yol: string) {
  const b = readFileSync(yol);
  const riff = b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
  const vp8x = b.subarray(12, 16).toString() === 'VP8X';
  const w = vp8x ? 1 + (b[24] | (b[25] << 8) | (b[26] << 16)) : 0;
  const h = vp8x ? 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) : 0;
  const alfa = vp8x ? (b[20] & 0x10) !== 0 : false;
  return { riff, vp8x, w, h, alfa };
}

const KOMPONENT = kodiOl(oqi('src/components/agent/maskot.tsx'));
const TUGMA = kodiOl(oqi('src/components/agent/agent-tugmasi.tsx'));
const OYNA = kodiOl(oqi('src/components/agent/agent-oynasi.tsx'));
const MATNLAR = kodiOl(oqi('src/lib/agent/matnlar.ts'));
const KURSATMA = kodiOl(oqi('src/lib/agent/kursatma.ts'));
const CSS = oqi('src/app/globals.css');
const KONFIG = kodiOl(oqi('next.config.mjs'));

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Rasm fayllari bor: WebP 128 va 256, PNG zaxira 128; nomda versiya (v1) — rasm almashsa nom ham o‘zgaradi',
    tekshir: () => Object.values(FAYLLAR).every((f) => existsSync(f)) && Object.values(FAYLLAR).every((f) => /koala-v\d+-\d+\./.test(f)),
  },
  {
    nomi: 'O‘lchamlari to‘g‘ri va kvadrat: 128x128 va 256x256; PNG haqiqiy PNG va RGBA (shaffof fon); WebP shaffoflik bayrog‘i bor',
    tekshir: () => {
      const p = pngOlcham(FAYLLAR.png128);
      const w1 = webpOlcham(FAYLLAR.webp128);
      const w2 = webpOlcham(FAYLLAR.webp256);
      return (
        p.imzo && p.w === 128 && p.h === 128 && p.rangTuri === 6 &&
        w1.riff && w1.vp8x && w1.w === 128 && w1.h === 128 && w1.alfa &&
        w2.riff && w2.vp8x && w2.w === 256 && w2.h === 256 && w2.alfa
      );
    },
  },
  {
    nomi: 'Hajm byudjeti: rasm sahifani og‘irlashtirmaydi (WebP 128 ≤ 12 KB, WebP 256 ≤ 30 KB, PNG zaxira ≤ 40 KB)',
    tekshir: () =>
      statSync(FAYLLAR.webp128).size <= 12 * 1024 &&
      statSync(FAYLLAR.webp256).size <= 30 * 1024 &&
      statSync(FAYLLAR.png128).size <= 40 * 1024,
  },
  {
    nomi: 'Komponent aynan shu fayllarni ishlatadi: WebP (1x/2x) + PNG zaxira, <picture> ichida; fayl yo‘llari diskda mavjud',
    tekshir: () => {
      const yollar = ['/maskot/koala-v1-128.webp', '/maskot/koala-v1-256.webp', '/maskot/koala-v1-128.png'];
      return (
        yollar.every((y) => KOMPONENT.includes(y) && existsSync(`public${y}`)) &&
        KOMPONENT.includes('<picture>') &&
        KOMPONENT.includes('type="image/webp"') &&
        KOMPONENT.includes('1x') && KOMPONENT.includes('2x')
      );
    },
  },
  {
    nomi: 'Ekran o‘quvchi: rasm bezak (alt="" va aria-hidden) — nom berilsa role="img" va aria-label; tugma o‘zi nomli (aria-label)',
    tekshir: () =>
      KOMPONENT.includes('alt=""') &&
      KOMPONENT.includes('aria-hidden={sarlavha ? undefined : true}') &&
      KOMPONENT.includes("role={sarlavha ? 'img' : undefined}") &&
      TUGMA.includes('aria-label={t(') &&
      TUGMA.includes('Коала — овозли ёрдамчини очиш'),
  },
  {
    nomi: 'Holat belgisi RANGDAN va HARAKATDAN tashqari: eshitmoqda — ovoz yoylari, oylamoqda — uch nuqta, gapirmoqda — tovush ustunlari, tayyor — belgisiz',
    tekshir: () =>
      KOMPONENT.includes("holat !== 'tayyor'") &&
      /holat === 'eshitmoqda' &&[\s\S]{0,400}maskot-tovush/.test(KOMPONENT) &&
      /holat === 'oylamoqda' &&[\s\S]{0,500}maskot-nuqta-3/.test(KOMPONENT) &&
      /holat === 'gapirmoqda' &&[\s\S]{0,500}maskot-ustun-3/.test(KOMPONENT) &&
      OYNA.includes('<Maskot holat={holat}'),
  },
  {
    nomi: 'Harakat FAQAT prefers-reduced-motion: no-preference va zaif qurilma (data-fx=lite) bo‘lmaganda: barcha maskot animatsiyalari shu blok ichida',
    tekshir: () => {
      const bosh = CSS.indexOf('KOALA (AI agent maskoti)');
      if (bosh < 0) return false;
      const qism = CSS.slice(bosh);
      const mediaBoshi = qism.indexOf('@media (prefers-reduced-motion: no-preference)');
      const birinchiKadr = qism.indexOf('@keyframes maskot-');
      if (mediaBoshi < 0 || birinchiKadr < mediaBoshi) return false;
      const blok = qism.slice(mediaBoshi, birinchiKadr);
      const tashqari = qism.slice(0, mediaBoshi) + qism.slice(birinchiKadr);
      // blok ichidagi har bir animatsiya zaif qurilmani istisno qiladi; tashqarida `animation:` yo'q (keyframes ichidagilarsiz)
      const bloklar = blok.match(/[^{}]+\{[^}]*animation:[^}]*\}/g) ?? [];
      return (
        bloklar.length >= 8 &&
        bloklar.every((b) => b.includes("html:not([data-fx='lite'])")) &&
        !/\banimation:/.test(tashqari)
      );
    },
  },
  {
    nomi: 'Qush maskotidan qoldiq YO‘Q: eski hudhud.tsx fayli, `hudhud-` CSS sinflari va "Hudhud" komponenti qolmagan; kod nomlari (hudhud:hisobot, hudhud:ovozli) esa saqlangan',
    tekshir: () =>
      !existsSync('src/components/agent/hudhud.tsx') &&
      !/hudhud-/.test(CSS) &&
      !/\bHudhud\b/.test(TUGMA + OYNA + KOMPONENT) &&
      OYNA.includes("'hudhud:hisobot'") &&
      OYNA.includes("'hudhud:ovozli'"),
  },
  {
    nomi: 'Foydalanuvchiga ko‘rinadigan nom — Koala/Коала: salom, tugma, oyna sarlavhasi, rad matnlari; "Ҳудҳуд" qolmagan; tizim ko‘rsatmasi modelga koala maskot ekanini aytadi (qush emas)',
    tekshir: () =>
      MATNLAR.includes('Мен Коаламан') &&
      OYNA.includes("{t('Коала')}") &&
      OYNA.includes('Коалага савол ёки буйруқ') &&
      !/Ҳудҳуд/.test(MATNLAR + OYNA + TUGMA) &&
      KURSATMA.includes('Sen — Koala (Коала)') &&
      KURSATMA.includes('koala maskot') &&
      !/Lison ut-tayr|qushdan olingan/.test(KURSATMA),
  },
  {
    nomi: 'Tugma: kamida 44x44 piksel (4.5rem = 72 piksel), klaviatura fokusi ko‘rinadi, bosilganda oyna ochiladi, ustiga kelganda kod oldindan yuklanadi',
    tekshir: () =>
      TUGMA.includes('h-[4.5rem] w-[4.5rem]') &&
      TUGMA.includes('focus-visible:outline') &&
      TUGMA.includes('onMouseEnter={isit}') &&
      TUGMA.includes('onFocus={isit}') &&
      TUGMA.includes('<Maskot olcham={72} />'),
  },
  {
    nomi: 'Rasm uzoq muddat keshlanadi: /maskot/ uchun `public, max-age=31536000, immutable` (nomda versiya bor, shuning uchun xavfsiz)',
    tekshir: () => /source:\s*'\/maskot\/:fayl\*'/.test(KONFIG) && KONFIG.includes('public, max-age=31536000, immutable'),
  },
];

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
