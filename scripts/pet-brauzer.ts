/**
 * ============================================================
 *  PET (KOALA/ROBOT TUGMASI) KO'RINISHI — BRAUZER AUDITI (qo'lda ishga tushiriladi)
 *
 *  Har bir rol uchun, telefon va kompyuter ekranida, bir nechta sahifada:
 *   - tugma (`[data-agent-tugmasi]`) DOM'da bormi (Hamroh ochiq rollar uchun),
 *   - ekran ichida, o'lchami nolga teng emas, ko'rinadimi (display/visibility/opacity),
 *   - ustidan boshqa element yopmaganmi (elementFromPoint),
 *   - brauzer konsolida xato (pageerror) bormi.
 *  Skrinshotlar: PET_SKRIN papkasiga (standart /tmp/pet-skrin).
 *
 *  Ishga tushirish:
 *    npx next dev -p 3197 &
 *    BAZA=http://127.0.0.1:3197 npx tsx scripts/pet-brauzer.ts
 *  FAQAT mahalliy bazada.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { parolXeshla } from '../src/lib/auth';
import { MENYU } from '../src/components/shell/navigatsiya';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const prisma = new PrismaClient();
const BAZA = process.env.BAZA ?? 'http://127.0.0.1:3197';
const SKRIN = process.env.PET_SKRIN ?? '/tmp/pet-skrin';
const kutilgan_oyna = (rol: string) => rol === 'HOKIM';
const KUTILADI: Record<string, boolean> = { ADMIN: true, BANDLIK_RAHBAR: true, HOKIM: true, BANDLIK: true, YETTILIK: false };
const EKRANLAR = [
  { nom: 'telefon', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  { nom: 'kompyuter', viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false },
];

/** Sahifa navigatsiyasi paytida `evaluate` yiqilishi mumkin (dev server sahifani qayta kompilyatsiya qiladi): 3 marta urinadi */
interface TugmaNatijasi { bor: boolean; x?: number; y?: number; w?: number; h?: number; ekranda?: boolean; korinadi?: boolean; yopilgan?: boolean; ustida?: string | null; svgBor?: boolean; vw?: number; vh?: number; kenglik: number; ekranKengligi: number }
async function qaytar<T>(f: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await f(); } catch (e) { if (i >= 2) throw e; await new Promise((r) => setTimeout(r, 700)); }
  }
}

/** Gidratsiyadan oldingi bosish yo'qoladi: oyna ochilguncha bir necha marta bosadi */
async function oynaOch(p: { click(s: string): Promise<void>; waitForTimeout(n: number): Promise<void>; locator(s: string): { count(): Promise<number> } }): Promise<boolean> {
  for (let i = 0; i < 5; i++) {
    await p.click('[data-agent-tugmasi]').catch(() => {});
    await p.waitForTimeout(1500);
    if ((await p.locator('[role="dialog"]').count()) > 0) return true;
  }
  return false;
}

(async () => {
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? '')) { console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.'); process.exit(2); }
  mkdirSync(SKRIN, { recursive: true });
  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  const idlar: string[] = [];
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const xatolar: string[] = [];
  let tekshirildi = 0;
  try {
    for (const rol of Object.keys(KUTILADI).filter((r) => !process.env.PET_ROLLAR || process.env.PET_ROLLAR.split(',').includes(r))) {
      const u = await prisma.user.create({
        data: { username: `pet${rol.toLowerCase()}${Date.now().toString(36)}`.slice(0, 40), fullName: 'Pet Sinov', passwordHash: parolXeshla('Sinov2026x'), rol: rol as never, mahallaId: rol === 'YETTILIK' ? mahalla!.id : null, parolAlmashtirilsin: false },
        select: { id: true, username: true },
      });
      idlar.push(u.id);
      for (const ekran of EKRANLAR) {
        const ctx = await b.newContext({ viewport: ekran.viewport, hasTouch: ekran.hasTouch, isMobile: ekran.isMobile });
        await ctx.addCookies([{ name: 'bandlik_alifbo', value: 'lot', url: BAZA }]);
        await ctx.addInitScript({ content: 'window.__name = (t) => t;' });
        const p = await ctx.newPage();
        const sahifaXatolari: string[] = [];
        p.on('pageerror', (e: Error) => sahifaXatolari.push(`pageerror: ${e.message.slice(0, 160)}`));
        // Keyingi sahifaga o'tilganda yarim yo'ldagi `Link` prefetch'lari bekor bo'ladi: Next buni xato deb yozadi, lekin zarari yo'q
        p.on('console', (m: { type(): string; text(): string }) => { if (m.type() === 'error' && !/Failed to fetch RSC payload/.test(m.text())) sahifaXatolari.push(`console: ${m.text().slice(0, 160)}`); });
        await p.goto(`${BAZA}/kirish`);
        await p.evaluate(async (n: string) => fetch('/api/auth/kirish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: n, parol: 'Sinov2026x' }) }), u.username);
        const yollar = [...new Set(['/', ...MENYU.filter((m) => m.rollar.includes(rol as never)).map((m) => m.yol)])];
        for (const yol of yollar) {
          sahifaXatolari.length = 0;
          try { await p.goto(`${BAZA}${yol}`, { waitUntil: 'networkidle', timeout: 60000 }); } catch { await p.waitForTimeout(500); }
          await p.waitForSelector('[data-agent-tugmasi]', { timeout: KUTILADI[rol] ? 15000 : 1500 }).catch(() => {});
          await p.waitForTimeout(400);
          await p.waitForLoadState('load').catch(() => {});
          const r = await qaytar<TugmaNatijasi>(() => p.evaluate(() => {
            const t = document.querySelector<HTMLElement>('[data-agent-tugmasi]');
            if (!t) return { bor: false, kenglik: document.documentElement.scrollWidth, ekranKengligi: document.documentElement.clientWidth } as const;
            const rc = t.getBoundingClientRect(); const cs = getComputedStyle(t);
            const x = rc.left + rc.width / 2, y = rc.top + rc.height / 2;
            const ustida = document.elementFromPoint(x, y);
            return {
              bor: true as const, x: Math.round(rc.left), y: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height),
              ekranda: rc.width > 20 && rc.height > 20 && rc.right > 0 && rc.bottom > 0 && rc.left < innerWidth && rc.top < innerHeight,
              korinadi: cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05,
              yopilgan: !(ustida && (ustida === t || t.contains(ustida))),
              ustida: ustida ? `${ustida.tagName}.${String(ustida.className).slice(0, 50)}` : null,
              svgBor: Boolean(t.querySelector('svg')), vw: innerWidth, vh: innerHeight,
              kenglik: document.documentElement.scrollWidth, ekranKengligi: document.documentElement.clientWidth,
            };
          }));
          tekshirildi++;
          const nom = `${rol}/${ekran.nom}${yol}`;
          const kutilgan = KUTILADI[rol];
          if (!kutilgan) { if (r.bor) xatolar.push(`${nom}: tugma bo'lmasligi kerak edi`); }
          else if (!r.bor) xatolar.push(`${nom}: TUGMA DOM'DA YO'Q`);
          else if (!r.ekranda || !r.korinadi || r.yopilgan || !r.svgBor) xatolar.push(`${nom}: ko'rinmaydi ${JSON.stringify(r)}`);
          if (r.kenglik > r.ekranKengligi + 1) xatolar.push(`${nom}: sahifa ekrandan keng (${r.kenglik} > ${r.ekranKengligi}) — gorizontal siljish`);
          for (const s of sahifaXatolari) xatolar.push(`${nom}: ${s}`);
          if (kutilgan && yol === '/') await p.screenshot({ path: `${SKRIN}/${rol}-${ekran.nom}.png` });
        }

        // ── Oyna: ochilganda ko'rinadi, yopilganda tugma QAYTADI; oyna yiqilsa ham tugma qaytadi ──
        if (kutilgan_oyna(rol) && ekran.nom === 'telefon') {
          const nom = `${rol}/${ekran.nom}/oyna`;
          sahifaXatolari.length = 0;
          await p.goto(`${BAZA}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
          await p.waitForSelector('[data-agent-tugmasi]', { timeout: 15000 });
          const ochildi = await oynaOch(p);
          const tugmaYashirin = (await p.locator('[data-agent-tugmasi]').count()) === 0;
          if (!ochildi) xatolar.push(`${nom}: tugma bosildi, lekin oyna ochilmadi`);
          if (ochildi && !tugmaYashirin) xatolar.push(`${nom}: oyna ochiq paytda tugma ham turibdi`);
          await p.keyboard.press('Escape');
          const qaytdi = await p.waitForSelector('[data-agent-tugmasi]', { timeout: 5000 }).then(() => true, () => false);
          if (!qaytdi) xatolar.push(`${nom}: oyna yopilgach tugma QAYTMADI`);
          tekshirildi += 3;
          if (ochildi) await p.screenshot({ path: `${SKRIN}/${rol}-oyna.png` });

          // Oyna JS bo'lagi yuklanmasa (yangi deploydan keyingi eski kesh) — tugma qaytishi, sahifa o'lmasligi kerak
          // `serviceWorkers: 'block'`: ishlab chiqarishda service worker bo'laklarni o'zi oladi va `page.route` ularni ko'rmaydi
          const ctx2 = await b.newContext({ viewport: ekran.viewport, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
          await ctx2.addCookies([{ name: 'bandlik_alifbo', value: 'lot', url: BAZA }]);
          await ctx2.addInitScript({ content: 'window.__name = (t) => t;' });
          const p2 = await ctx2.newPage();
          await p2.goto(`${BAZA}/kirish`);
          await p2.evaluate(async (n: string) => fetch('/api/auth/kirish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: n, parol: 'Sinov2026x' }) }), u.username);
          await p2.goto(`${BAZA}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
          await p2.waitForSelector('[data-agent-tugmasi]', { timeout: 15000 });
          await p2.waitForLoadState('networkidle').catch(() => {});
          await p2.waitForTimeout(1500);
          // Sahifa to'liq yuklangach hamma YANGI JS bo'laklari (shu jumladan Hamroh oynasiniki) ochilmaydi:
          // yangi deploydan keyin eski sahifa o'chib ketgan bo'lakni so'raganidek. Ishlab chiqarish rejimida bo'lak nomlari
          // xeshlangan, shuning uchun nomga emas, vaqtga qarab to'siladi.
          await p2.route(/\/_next\/static\/chunks\//, (rt: { abort(): Promise<void> }) => rt.abort());
          for (let i = 0; i < 4 && (await p2.locator('.koala-pet-yozuv').innerText().catch(() => '')) !== 'Qayta bosing'; i++) {
            await p2.click('[data-agent-tugmasi]').catch(() => {});
            await p2.waitForTimeout(1500);
          }
          const tugmaBor = (await p2.locator('[data-agent-tugmasi]').count()) > 0;
          const yozuv = tugmaBor ? await p2.locator('.koala-pet-yozuv').innerText().catch(() => '') : '';
          if (!tugmaBor) xatolar.push(`${nom}: oyna yuklanmasa tugma YO'QOLDI (xato chegarasi ishlamadi)`);
          else if (!/Qayta bosing/i.test(yozuv)) xatolar.push(`${nom}: oyna yiqilgach tugmada "Qayta bosing" yozuvi yo'q (${yozuv})`);
          tekshirildi += 1;
          await ctx2.close();
        }
        await ctx.close();
      }
    }
  } finally {
    await b.close();
    for (const id of idlar) await prisma.user.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  }
  for (const x of xatolar) console.log(`XATO ${x}`);
  console.log(`${xatolar.length === 0 ? 'HAMMASI O‘TDI' : `XATO: ${xatolar.length}`} — ${tekshirildi} tekshiruv`);
  process.exit(xatolar.length ? 1 : 0);
})();
