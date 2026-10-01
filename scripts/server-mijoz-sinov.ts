/**
 * ============================================================
 *  SERVER VA BRAUZER KOMPONENTLARI CHEGARASI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/server-mijoz-sinov.ts
 *
 *  ── Qaysi xatoni ushlaydi ──
 *
 *  Server komponenti `'use client'` faylidan FUNKSIYA yoki oddiy
 *  qiymat import qilsa, Next uni "mijoz havolasi"ga aylantiradi.
 *  Server uni chaqirmoqchi bo'lganda:
 *
 *      TypeError: b is not a function
 *
 *  Muammo shundaki, `tsc` buni ko'rmaydi (tur to'g'ri), sinov bazasida
 *  ham chiqmaydi - faqat sahifa haqiqatan ochilganda, productionda
 *  "Sahifa ochilmadi" bo'lib chiqadi. Oilaviy reja sahifasida aynan
 *  shu yuz bergan: `sanaMaydoni()` brauzer faylida turgan edi.
 *
 *  ── Qoida ──
 *
 *  Server fayl `'use client'` fayldan faqat ikkita narsani olishi
 *  mumkin:
 *    1. TUR (`import type` yoki `type X`);
 *    2. KOMPONENT - va u shu faylda JSX sifatida ishlatilgan bo'lsin
 *       (`<Nom ...>`).
 *  Qolgan hammasi (funksiya, hook, oddiy konstanta) - xato.
 * ============================================================
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ILDIZ = resolve('.');

function fayllar(papka: string, chiqdi: string[] = []): string[] {
  for (const nom of readdirSync(papka)) {
    const y = join(papka, nom);
    const s = statSync(y);
    if (s.isDirectory()) fayllar(y, chiqdi);
    else if (/\.(ts|tsx)$/.test(nom)) chiqdi.push(y);
  }
  return chiqdi;
}

/** Fayl `'use client'` bilan boshlanadimi (izohlardan keyin) */
export function mijozFaylimi(matn: string): boolean {
  const t = matn
    .replace(/^\s*\/\*[\s\S]*?\*\/\s*/g, '')
    .replace(/^(\s*\/\/.*\n)+/g, '')
    .trimStart();
  return /^(['"])use client\1/.test(t);
}

/** `@/x` va nisbiy yo'lni haqiqiy faylga aylantiradi */
function yechish(kimdan: string, yol: string): string | null {
  let asos: string;
  if (yol.startsWith('@/')) asos = join(ILDIZ, 'src', yol.slice(2));
  else if (yol.startsWith('.')) asos = resolve(dirname(kimdan), yol);
  else return null;
  for (const q of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    if (existsSync(asos + q)) return asos + q;
  }
  return null;
}

export interface Buzilish {
  fayl: string;
  nom: string;
  sabab: string;
}

/** Bitta server faylidagi buzilishlarni topadi */
export function buzilishlar(fayl: string, matn: string, mijozMi: (f: string) => boolean): Buzilish[] {
  const chiqdi: Buzilish[] = [];
  const kod = matn.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const re = /import\s+(type\s+)?(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(kod))) {
    const [, faqatTur, birlamchi, nomlar, yol] = m;
    if (faqatTur) continue;
    const maqsad = yechish(fayl, yol);
    if (!maqsad || !mijozMi(maqsad)) continue;

    const olinganlar: string[] = [];
    if (birlamchi) olinganlar.push(birlamchi);
    for (const x of (nomlar ?? '').split(',')) {
      const t = x.trim();
      if (!t || t.startsWith('type ')) continue;
      olinganlar.push(t.split(/\s+as\s+/).pop()!.trim());
    }

    for (const nom of olinganlar) {
      const jsx = new RegExp(`<${nom}[\\s/>.]`).test(kod);
      const komponentNomi = /^[A-Z]/.test(nom);
      if (!komponentNomi) {
        chiqdi.push({ fayl, nom, sabab: 'funksiya/hook/qiymat — server uni chaqira olmaydi' });
      } else if (!jsx) {
        chiqdi.push({ fayl, nom, sabab: 'komponent emas (JSX da ishlatilmagan) — konstanta bo‘lishi mumkin' });
      }
    }
  }
  return chiqdi;
}

function asosiy() {
  const hamma = [...fayllar(join(ILDIZ, 'src'))];
  const keshi = new Map<string, boolean>();
  const mijozMi = (f: string) => {
    if (!keshi.has(f)) keshi.set(f, mijozFaylimi(readFileSync(f, 'utf8')));
    return keshi.get(f)!;
  };

  let xato = 0;
  const hisob: { nomi: string; ok: boolean; tafsilot?: string }[] = [];

  /* ── 1. Haqiqiy kod: hech bir server fayl chegarani buzmaydi ── */
  const buzilgan: Buzilish[] = [];
  for (const f of hamma) {
    if (mijozMi(f)) continue;
    buzilgan.push(...buzilishlar(f, readFileSync(f, 'utf8'), mijozMi));
  }
  hisob.push({
    nomi: 'Server fayllar `use client` fayldan funksiya/qiymat import qilmaydi',
    ok: buzilgan.length === 0,
    tafsilot: buzilgan.map((b) => `${b.fayl.replace(ILDIZ + "/", "")}: ${b.nom} — ${b.sabab}`).join('\n       '),
  });

  /* ── 2. Qorovulning o'zi ishlaydi (mutatsiya) ── */
  const soxtaMijoz = (f: string) => f.endsWith('soxta-mijoz.tsx');
  const soxtaYechish = (matn: string) =>
    buzilishlar(join(ILDIZ, 'src/app/sinov-sahifa.tsx'), matn, (f) => soxtaMijoz(f) || mijozMi(f));

  /* Qorovul mavjud bo'lmagan fayl bilan tekshirilmaydi: haqiqiy mijoz faylini olamiz */
  const haqiqiyMijoz = hamma.find((f) => mijozMi(f) && f.includes('components'));
  const yolMijoz = haqiqiyMijoz
    ? '@/' + haqiqiyMijoz.replace(join(ILDIZ, 'src') + '/', '').replace(/\.tsx?$/, '')
    : '';
  hisob.push({
    nomi: 'Qorovul: server fayl mijoz fayldan LOWERCASE funksiya olsa — ushlaydi',
    ok:
      haqiqiyMijoz !== undefined &&
      soxtaYechish(`import { sanaMaydoni } from '${yolMijoz}';\nconst x = sanaMaydoni();`).length === 1,
  });
  hisob.push({
    nomi: 'Qorovul: komponent JSX da ishlatilsa — ruxsat; ishlatilmasa (konstanta) — ushlaydi',
    ok:
      haqiqiyMijoz !== undefined &&
      (() => {
        const nom = 'Soxta';
        const ok1 = soxtaYechish(`import { ${nom} } from '${yolMijoz}';\nconst a = <${nom} />;`).length === 0;
        const ok2 = soxtaYechish(`import { ${nom} } from '${yolMijoz}';\nconst a = ${nom};`).length === 1;
        return ok1 && ok2;
      })(),
  });
  hisob.push({
    nomi: 'Qorovul: `import type` va `type X` — ruxsat (ish vaqtida mavjud emas)',
    ok:
      haqiqiyMijoz !== undefined &&
      soxtaYechish(`import type { Xos } from '${yolMijoz}';`).length === 0 &&
      soxtaYechish(`import { type Xos2 } from '${yolMijoz}';`).length === 0,
  });
  hisob.push({
    nomi: '`use client` aniqlanishi: izohdan keyin ham, bitta/qo‘sh tirnoq bilan ham',
    ok:
      mijozFaylimi("'use client';\nimport x from 'y';") &&
      mijozFaylimi('"use client"\nexport const a = 1;') &&
      mijozFaylimi("/** izoh */\n'use client';\n") &&
      !mijozFaylimi("import x from 'y';\n// 'use client'\n"),
  });

  for (const h of hisob) {
    if (!h.ok) xato++;
    console.log(`${h.ok ? 'OK  ' : 'XATO'} ${h.nomi}`);
    if (!h.ok && h.tafsilot) console.log(`       ${h.tafsilot}`);
  }
  console.log(`\n${hisob.length - xato}/${hisob.length} o'tdi`);
  process.exit(xato ? 1 : 0);
}

asosiy();
