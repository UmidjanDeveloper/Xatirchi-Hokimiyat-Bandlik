/**
 * ============================================================
 *  INLINE HAVOLA ICHIDA BLOK — BRAUZER AUDITI (qo'lda ishga tushiriladi)
 *
 *  Nosozlik turi: `<a>` (yoki <span>, <label>) standart `inline`; ichida blok
 *  elementlar (div, p, ...) bo'lsa, uning fon, chegara va soyasi faqat
 *  birinchi/oxirgi qator bo'laklarida chiziladi: karta "yo'qolib", faqat
 *  burchak yoylari qoladi. Hech bir sinov buni sezmaydi, faqat ko'z ko'radi.
 *  (Operatsion panelda 2-oktabrdan beri: "12 oydan oshib ishsiz" va yana ikkita karta.)
 *
 *  Skript hamma rol va menyudagi hamma sahifani Chromium'da ochadi va:
 *   1. ichida blok bola bor `inline` elementni qidiradi — TOPILMASLIGI kerak;
 *   2. `a.karta` Tailwind `flex/grid/inline-flex/hidden` klassini saqlaganini
 *      tekshiradi (`:where(a).karta {display:block}` ularni bosib o'tmasin).
 *
 *  Ishga tushirish:
 *    npx next dev -p 3197 &
 *    BAZA=http://127.0.0.1:3197 npx tsx scripts/inline-brauzer.ts
 *  FAQAT mahalliy bazada. Brauzer: PW_CHROME (standart /opt/pw-browsers/chromium).
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { parolXeshla } from '../src/lib/auth';
import { MENYU } from '../src/components/shell/navigatsiya';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const prisma = new PrismaClient();
const BAZA = process.env.BAZA ?? 'http://127.0.0.1:3197';
const ROLLAR = ['ADMIN', 'BANDLIK_RAHBAR', 'HOKIM', 'BANDLIK', 'YETTILIK'] as const;

(async () => {
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? '')) { console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.'); process.exit(2); }
  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  const idlar: string[] = [];
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const topilgan = new Map<string, string>();
  let sahifalar = 0, kartaHavolalari = 0;
  try {
    for (const rol of ROLLAR) {
      const u = await prisma.user.create({
        data: { username: `inl${rol.toLowerCase()}${Date.now().toString(36)}`.slice(0, 40), fullName: 'Inline Sinov', passwordHash: parolXeshla('Sinov2026x'), rol: rol as never, mahallaId: rol === 'YETTILIK' ? mahalla!.id : null, parolAlmashtirilsin: false },
        select: { id: true, username: true },
      });
      idlar.push(u.id);
      const ctx = await b.newContext({ viewport: { width: 1194, height: 800 } });
      await ctx.addCookies([{ name: 'bandlik_alifbo', value: 'lot', url: BAZA }]);
      await ctx.addInitScript({ content: 'window.__name = (t) => t;' });
      const p = await ctx.newPage();
      await p.goto(`${BAZA}/kirish`);
      await p.evaluate(async (n: string) => fetch('/api/auth/kirish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: n, parol: 'Sinov2026x' }) }), u.username);
      const yollar = ['/', ...MENYU.filter((m) => m.rollar.includes(rol)).map((m) => m.yol)];
      for (const yol of [...new Set(yollar)]) {
        try { await p.goto(`${BAZA}${yol}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(700); } catch { continue; }
        sahifalar++;
        const r = await p.evaluate(() => {
          const BLOK = new Set(['DIV', 'P', 'SECTION', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'TABLE', 'ARTICLE', 'FORM']);
          const out: string[] = [];
          for (const e of document.querySelectorAll('a, span, label, button')) {
            if (getComputedStyle(e).display !== 'inline') continue;
            const bola = [...e.children].find((c) => BLOK.has(c.tagName) && getComputedStyle(c).display !== 'inline');
            if (bola) out.push(`INLINE: ${e.tagName}.${String(e.className).slice(0, 60)} ichida ${bola.tagName} "${(e.textContent ?? '').trim().slice(0, 30)}"`);
          }
          const korilgan = document.querySelectorAll('a.karta');
          for (const e of korilgan) {
            const k = e.classList; const d = getComputedStyle(e).display;
            const kutilgan = k.contains('hidden') ? 'none' : k.contains('inline-flex') ? 'inline-flex' : k.contains('flex') ? 'flex' : k.contains('grid') ? 'grid' : '';
            if (kutilgan && d !== kutilgan) out.push(`USTUN EMAS: a.${String(e.className).slice(0, 60)} display=${d}, kutilgan=${kutilgan}`);
          }
          return { out, soni: korilgan.length };
        });
        kartaHavolalari += r.soni;
        for (const t of r.out) topilgan.set(`${yol} | ${t}`, rol);
      }
      await ctx.close();
    }
  } finally {
    await b.close();
    for (const id of idlar) await prisma.user.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  }
  for (const [k, r] of topilgan) console.log(`XATO [${r}] ${k}`);
  console.log(`${topilgan.size === 0 ? 'HAMMASI O‘TDI' : `XATO: ${topilgan.size}`} — ${sahifalar} sahifa (5 rol), ${kartaHavolalari} ta a.karta tekshirildi`);
  process.exit(topilgan.size ? 1 : 0);
})();
