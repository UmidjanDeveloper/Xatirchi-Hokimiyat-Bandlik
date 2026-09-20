/**
 * ============================================================
 *  ARXIV — SINOV
 *
 *  Bu fayl 2026-yil 20-sentabrda tug'ildi: xatlovdan o'tgan
 *  xonadon va fuqaroni o'chirish kerak bo'ldi.
 *
 *  ── Nega bu yerda eng katta xavf bor ──
 *
 *  Arxivdagi yozuv hech qayerda ko'rinmasligi kerak. Agar bitta
 *  so'rov uni ko'rib qolsa, hokimning kesimida arxivdagi
 *  xonadon sanalib turaveradi. Bu XATO emas, YOLG'ON bo'ladi:
 *  son to'g'ri ko'rinadi, aslida noto'g'ri — va buni hech kim
 *  sezmaydi.
 *
 *  Shuning uchun filtr bitta joyda (`prisma.ts` mijozida) va
 *  bu sinovlar aynan shu markaziy filtrni qo'riqlaydi.
 * ============================================================
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { arxivgaRuxsat, SABAB_ENG_KAM } from '../src/lib/arxiv';

type Sinov = { nomi: string; tekshir: () => boolean };

const PRISMA = readFileSync('src/lib/prisma.ts', 'utf8');
const TUGMA = readFileSync('src/components/arxiv/ochirish-tugmasi.tsx', 'utf8');

const SINOVLAR: Sinov[] = [
  /* ══ MARKAZIY FILTR ══ */
  {
    nomi: 'Filtr mijozning O‘ZIDA — 107 ta so‘rovga qo‘lda yozilmaydi',
    tekshir: () => PRISMA.includes('$extends') && PRISMA.includes('arxivQoriqchisi'),
  },
  {
    nomi: 'Ro‘yxat va hisob amallarining HAMMASI filtrlanadi',
    tekshir: () =>
      ['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].every((a) =>
        PRISMA.includes(`'${a}'`)
      ),
  },
  {
    nomi: 'findUnique natijasi ham tekshiriladi — to‘g‘ridan-to‘g‘ri havola ochilmaydi',
    tekshir: () => PRISMA.includes("operation === 'findUnique'") && PRISMA.includes('arxivSanasi'),
  },
  {
    nomi: 'Ikkala model ham qo‘riqlanadi',
    tekshir: () => PRISMA.includes('household: arxivQoriqchisi') && PRISMA.includes('unemployedPerson: arxivQoriqchisi'),
  },
  {
    nomi: 'Arxivni KO‘RISH uchun alohida yo‘l bor (`xomPrisma`)',
    tekshir: () => PRISMA.includes('export const xomPrisma'),
  },

  /* ══ HUQUQLAR ══ */
  {
    nomi: 'Hokim hech narsani o‘chira olmaydi — uning roli faqat ko‘rish',
    tekshir: () => !arxivgaRuxsat('HOKIM', 'm1', { mahallaId: 'm1' }).ok,
  },
  {
    nomi: 'Mahalla xodimi O‘Z mahallasini o‘chira oladi',
    tekshir: () => arxivgaRuxsat('YETTILIK', 'm1', { mahallaId: 'm1', holati: 'YUBORILGAN' }).ok,
  },
  {
    nomi: 'Mahalla xodimi BOSHQA mahallaga tega olmaydi',
    tekshir: () => !arxivgaRuxsat('YETTILIK', 'm1', { mahallaId: 'm2' }).ok,
  },
  {
    nomi: 'Mahalla xodimi TASDIQLANGAN xatlovga tega olmaydi',
    tekshir: () => !arxivgaRuxsat('YETTILIK', 'm1', { mahallaId: 'm1', holati: 'TASDIQLANGAN' }).ok,
  },
  {
    nomi: 'Bandlik markazi tasdiqlanganini ham o‘chira oladi',
    tekshir: () => arxivgaRuxsat('BANDLIK', null, { mahallaId: 'm2', holati: 'TASDIQLANGAN' }).ok,
  },
  {
    nomi: 'Administrator hammasini o‘chira oladi',
    tekshir: () => arxivgaRuxsat('ADMIN', null, { mahallaId: 'm9', holati: 'TASDIQLANGAN' }).ok,
  },
  {
    nomi: 'Rad javobida SABAB yoziladi — xodim nima qilishni bilsin',
    tekshir: () => {
      const r = arxivgaRuxsat('YETTILIK', 'm1', { mahallaId: 'm1', holati: 'TASDIQLANGAN' });
      return !r.ok && r.xabar.length > 30 && r.xabar.includes('бандлик');
    },
  },

  /* ══ TUGMA XAVFSIZLIGI ══ */
  {
    nomi: 'Tugma DARHOL o‘chirmaydi — tasdiqlash oynasi ochiladi',
    tekshir: () => TUGMA.includes("role=\"dialog\"") && TUGMA.includes('setOchiq(true)'),
  },
  {
    nomi: 'Yuborilgan xatlovda SABAB majburiy',
    tekshir: () => TUGMA.includes('sabab.trim().length < 10') && SABAB_ENG_KAM === 10,
  },
  {
    nomi: 'Qoralamada sabab so‘ralmaydi — u hali hech qayerga ulanmagan',
    tekshir: () => TUGMA.includes('const sababKerak = !qoralamami'),
  },
  {
    nomi: 'Xodimga ma’lumot yo‘qolmasligi AYTILADI — ikkilanmasin',
    tekshir: () => TUGMA.includes('администратор қайтара олади'),
  },

  /* ══ BAZA BRAUZERGA TUSHMASIN ══ */
  {
    nomi: 'Hech bir brauzer komponenti bazaga ULANMAYDI',
    tekshir: () => {
      /*
       * Bu qoida bir marta buzilgan edi va oqibati og'ir bo'ldi:
       * `grafiklar.tsx` qiymat sifatida `tahlil.ts` ni olardi, u
       * esa `prisma` ni. Bir kun bundler uni tashlab yubormay
       * qoldi va butun sahifa brauzerda qulab tushdi:
       *
       *     PrismaClient is unable to run in this browser
       *
       * Sahifa server tomonda TO'G'RI chiqardi, brauzerda esa oq
       * ekran. Bunday nuqsonni topish eng qiyinlaridan.
       */
      const fayllar = execSync(
        "grep -rl \"^'use client'\" src/ || true"
      ).toString().trim().split('\n').filter(Boolean);

      const bazaliKutubxona = (nom: string) => {
        try {
          const t = readFileSync(`src/lib/${nom}.ts`, 'utf8');
          return /from '\.\/prisma'|from '@\/lib\/prisma'/.test(t);
        } catch {
          return false;
        }
      };

      const yomon: string[] = [];
      for (const f of fayllar) {
        const matn = readFileSync(f, 'utf8');
        /* FAQAT qiymat importlari xavfli — `import type` o'chiriladi */
        for (const m of matn.matchAll(/^import (?!type )\{([^}]*)\} from '@\/lib\/([a-z0-9-]+)'/gm)) {
          const kalitlar = m[1];
          const kutubxona = m[2];
          /* Hammasi `type` bo'lsa — xavfsiz */
          const qiymatBor = kalitlar
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
            .some((k) => !k.startsWith('type '));
          if (qiymatBor && bazaliKutubxona(kutubxona)) {
            yomon.push(`${f} → lib/${kutubxona} → prisma`);
          }
        }
      }
      if (yomon.length) for (const v of yomon) console.log(`     ${v}`);
      return yomon.length === 0;
    },
  },

  /* ══ «O'CHIRILGANLAR» SAHIFASI ══ */
  {
    nomi: 'Sahifa bor va menyuda ko‘rinadi',
    tekshir: () => {
      const menyu = readFileSync('src/components/shell/navigatsiya.ts', 'utf8');
      return (
        menyu.includes("yol: '/ochirilganlar'") &&
        existsSync('src/app/(ilova)/ochirilganlar/page.tsx')
      );
    },
  },
  {
    nomi: 'Mahalla xodimi ham ko‘radi — xatoni O‘ZI tuzatsin',
    tekshir: () => {
      const menyu = readFileSync('src/components/shell/navigatsiya.ts', 'utf8');
      const band = menyu.slice(menyu.indexOf("yol: '/ochirilganlar'"));
      return band.slice(0, 260).includes("'YETTILIK'");
    },
  },
  {
    nomi: 'Hokim bu sahifaga kirmaydi — uning roli ko‘rish',
    tekshir: () => {
      const menyu = readFileSync('src/components/shell/navigatsiya.ts', 'utf8');
      const band = menyu.slice(menyu.indexOf("yol: '/ochirilganlar'"));
      const sahifa = readFileSync('src/app/(ilova)/ochirilganlar/page.tsx', 'utf8');
      return (
        !band.slice(0, 260).includes("'HOKIM'") &&
        sahifa.includes("sessiya.rol === 'HOKIM'")
      );
    },
  },
  {
    nomi: 'Qaytarish ham O‘CHIRISH bilan bir xil huquq talab qiladi',
    tekshir: () => {
      const yol = readFileSync('src/app/api/arxiv/route.ts', 'utf8');
      return yol.includes('arxivgaRuxsat(') && yol.includes("talabQil(['YETTILIK'");
    },
  },

  /* ══ XATLOV TAHRIRIDA DUBLIKAT BO'LMASIN ══ */
  {
    nomi: 'Xatlov tahrirlanganda arxivdagilar ham ko‘riladi — dublikat oldi olinadi',
    tekshir: () => {
      /*
       * Bu nuqson arxiv qo'shilganda paydo bo'ldi: oddiy mijoz
       * arxivdagi fuqaroni ko'rmaydi, demak anketada ismi turgan
       * odam "yangi" deb hisoblanib, IKKINCHI marta yaratilardi.
       */
      const yol = readFileSync('src/app/api/xatlov/route.ts', 'utf8');
      const bolak = yol.slice(yol.indexOf('const mavjudlar'), yol.indexOf('const kelganNomlar'));
      return bolak.includes('xomPrisma');
    },
  },
  {
    nomi: 'Ro‘yxatdan chiqarilgan fuqaro O‘CHIRILMAYDI, arxivga olinadi',
    tekshir: () => {
      const yol = readFileSync('src/app/api/xatlov/route.ts', 'utf8');
      return (
        !yol.includes('unemployedPerson.deleteMany') &&
        yol.includes('arxivlanadiganlar')
      );
    },
  },
  {
    nomi: 'Ismi anketaga QAYTSA — fuqaro tiriladi, yangisi yaratilmaydi',
    tekshir: () => {
      const yol = readFileSync('src/app/api/xatlov/route.ts', 'utf8');
      return yol.includes('tiriltiriladiganlar');
    },
  },
];

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    ok = false;
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
