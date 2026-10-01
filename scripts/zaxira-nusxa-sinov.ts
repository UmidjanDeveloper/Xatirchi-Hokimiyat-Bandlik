/**
 * ============================================================
 *  ZAXIRA NUSXASINI OLISH SKRIPTI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/zaxira-nusxa-sinov.ts
 *
 *  Skriptning O'ZI ishga tushiriladi (bash), mahalliy bazadan haqiqiy nusxa
 *  olinadi va alohida bazaga tiklanadi. Production bazasiga tegmaydi.
 *
 *  Bu yerda xato nimaga olib keladi:
 *   1. BO'SH/KESILGAN NUSXA "TAYYOR" DESA - kerak bo'lganda nusxa yo'q ekani
 *      ma'lum bo'ladi (zaxiraning eng og'ir nosozligi).
 *   2. NUSXA REPO ICHIGA TUSHSA - fuqarolarning shaxsiy ma'lumoti git'ga
 *      commit qilinib ketadi.
 *   3. ROTATSIYA ENG YANGI NUSXALARNI O'CHIRSA - soat/sana xatosida hamma
 *      zaxira yo'qoladi.
 *   4. PAROL EKRANGA CHIQSA - loglarda (CI, terminal yozuvi) qoladi.
 *
 *  pg_dump / pg_restore / sha256sum yo'q muhitda sinov "o'tkazildi" deb
 *  yoziladi va "o'tdi" deb HISOBLANMAYDI.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.env.DATABASE_URL ?? '';
type Sinov = { nomi: string; tekshir: () => boolean };

function bor(k: string): boolean {
  return spawnSync('bash', ['-c', `command -v ${k}`]).status === 0;
}
const KERAK = ['pg_dump', 'pg_restore', 'sha256sum', 'psql', 'git'];
const yoq = KERAK.filter((k) => !bor(k));
if (yoq.length) {
  console.log(`O'TKAZILDI: ${yoq.join(', ')} topilmadi - bu sinov o'tdi deb HISOBLANMAYDI.`);
  process.exit(0);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(URL_)) {
  console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
  process.exit(2);
}

/** postgresql://u@h:p/baza?schema=public -> pg_dump tushunadigan manzil (schema parametri tashlanadi) */
const MANBA = URL_.replace(/\?.*$/, '');
const SKRIPT = join(process.cwd(), 'scripts/zaxira-nusxa.sh');
const IS = mkdtempSync(join(tmpdir(), 'zn-'));

function yurgiz(env: Record<string, string | undefined>, shimYol?: string) {
  const e: Record<string, string | undefined> = { ...process.env, ...env };
  if (shimYol) e.PATH = `${shimYol}:${process.env.PATH}`;
  const r = spawnSync('bash', [SKRIPT], { env: e as NodeJS.ProcessEnv, encoding: 'utf8', timeout: 120_000 });
  return { kod: r.status, chiqish: `${r.stdout}\n${r.stderr}` };
}
const dumplar = (p: string) => (existsSync(p) ? readdirSync(p).filter((f) => /^bandlik-.*\.dump$/.test(f)).sort() : []);
const kunOldin = (yol: string, kun: number) => {
  const t = new Date(Date.now() - kun * 86400_000);
  utimesSync(yol, t, t);
};

/** Soxta pg_dump: berilgan buyruqni bajaradi */
function shim(ichi: string): string {
  const d = mkdtempSync(join(IS, 'shim-'));
  writeFileSync(join(d, 'pg_dump'), `#!/usr/bin/env bash\n${ichi}\n`);
  chmodSync(join(d, 'pg_dump'), 0o755);
  return d;
}
const HAQIQIY_PG_DUMP = spawnSync('bash', ['-c', 'command -v pg_dump'], { encoding: 'utf8' }).stdout.trim();

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Muvaffaqiyat: nusxa yaratiladi (kod 0), fayl va papka ruxsati faqat egasiga (600/700), SHA-256 fayli bor va TO\'G\'RI, parolsiz ko\'rinish',
    tekshir: () => {
      const p = join(IS, 'asosiy');
      const r = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: MANBA });
      const f = dumplar(p);
      if (r.kod !== 0 || f.length !== 1) {
        console.log('     ', r.kod, r.chiqish.slice(-300));
        return false;
      }
      const yol = join(p, f[0]);
      const sha = spawnSync('sha256sum', ['-c', `${f[0]}.sha256`], { cwd: p, encoding: 'utf8' });
      return (
        (statSync(yol).mode & 0o777) === 0o600 && (statSync(p).mode & 0o777) === 0o700 &&
        (statSync(`${yol}.sha256`).mode & 0o777) === 0o600 && sha.status === 0 &&
        /TAYYOR VA TEKSHIRILGAN/.test(r.chiqish) && readdirSync(p).every((x) => !x.endsWith('.tmp'))
      );
    },
  },
  {
    nomi: 'HAQIQIY TIKLASH: olingan nusxa alohida bazaga tiklanadi va asosiy jadvallarda qatorlar soni manba bilan teng (nusxa shunchaki fayl emas, ishlaydigan zaxira)',
    tekshir: () => {
      const p = join(IS, 'asosiy');
      const f = dumplar(p)[0];
      if (!f) return false;
      const baza = `nusxa_sinov_${Date.now()}_tiklash_sinov`;
      const asos = MANBA.replace(/\/[^/]+$/, '');
      const psql = (db: string, q: string) => spawnSync('psql', [`${asos}/${db}`, '-qAt', '-c', q], { encoding: 'utf8' });
      try {
        if (psql('postgres', `CREATE DATABASE "${baza}"`).status !== 0) return false;
        const t = spawnSync('pg_restore', ['--no-owner', '--no-privileges', '--exit-on-error', '-d', `${asos}/${baza}`, join(p, f)], { encoding: 'utf8' });
        if (t.status !== 0) {
          console.log('     pg_restore:', t.stderr.slice(-200));
          return false;
        }
        const manbaBaza = MANBA.split('/').pop() as string;
        const son = (db: string, j: string) => psql(db, `SELECT count(*) FROM "${j}"`).stdout.trim();
        const jadvallar = ['Mahalla', 'User', 'Household', 'UnemployedPerson', 'AuditLog'];
        const teng = jadvallar.every((j) => son(baza, j) !== '' && son(baza, j) === son(manbaBaza, j));
        if (!teng) console.log('     farq:', jadvallar.map((j) => `${j}=${son(manbaBaza, j)}/${son(baza, j)}`).join(' '));
        return teng && son(baza, 'Mahalla') === '70';
      } finally {
        psql('postgres', `DROP DATABASE IF EXISTS "${baza}"`);
      }
    },
  },
  {
    nomi: 'REPO ICHIGA yozish rad etiladi (kod 2), hech narsa yaratilmaydi: papka git repozitoriya ichida',
    tekshir: () => {
      const repo = mkdtempSync(join(IS, 'repo-'));
      spawnSync('git', ['init', '-q'], { cwd: repo });
      const p = join(repo, 'ichki', 'nusxalar');
      mkdirSync(p, { recursive: true });
      const r = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: MANBA });
      return r.kod === 2 && /git repozitoriya ichida/.test(r.chiqish) && dumplar(p).length === 0 && !/TAYYOR/.test(r.chiqish);
    },
  },
  {
    nomi: 'Noto\'g\'ri sozlama: SAQLASH_KUN=0 / "abc" / manfiy - kod 2; manba URL yo\'q - kod 2; hech qaysida nusxa yaratilmaydi',
    tekshir: () => {
      const p = join(IS, 'sozlama-papkasi-yaratilmasin');
      const natijalar = ['0', 'abc', '-5'].map((k) => yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: MANBA, SAQLASH_KUN: k }).kod);
      const urlsiz = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: undefined });
      const tiklashUrlsiz = spawnSync('bash', [join(process.cwd(), 'scripts/zaxira-tiklash.sh')], { env: { ...process.env, MANBA_URL: MANBA, TIKLASH_URL: '' } as NodeJS.ProcessEnv, encoding: 'utf8' });
      return natijalar.every((k) => k === 2) && urlsiz.kod === 2 && tiklashUrlsiz.status === 2 && !existsSync(p);
    },
  },
  {
    nomi: 'ULANIB BO\'LMASA: kod 1, yakuniy fayl ham, vaqtinchalik .tmp ham QOLMAYDI, parol chiqishda YO\'Q',
    tekshir: () => {
      const p = join(IS, 'ulanmadi');
      const r = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: 'postgresql://foydalanuvchi:Gizli-Parol-Sinov-77@127.0.0.1:1/yoq_baza' });
      return r.kod === 1 && dumplar(p).length === 0 && readdirSync(p).length === 0 && !r.chiqish.includes('Gizli-Parol-Sinov-77') && !/TAYYOR/.test(r.chiqish);
    },
  },
  {
    nomi: 'BO\'SH / KESILGAN nusxa "tayyor" DEMAYDI: pg_dump 10 bayt yozsa - kod 1, fayl qolmaydi',
    tekshir: () => {
      const p = join(IS, 'bosh');
      const s = shim('while [ $# -gt 0 ]; do [ "$1" = "-f" ] && printf "kesilgan!!" > "$2"; shift; done; exit 0');
      const r = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: MANBA }, s);
      return r.kod === 1 && /juda kichik/.test(r.chiqish) && dumplar(p).length === 0 && !/TAYYOR/.test(r.chiqish);
    },
  },
  {
    nomi: 'TO\'LIQ BO\'LMAGAN nusxa (faqat bitta jadval) rad etiladi: pg_restore o\'qiydi, lekin asosiy jadval (User) yo\'q - kod 1',
    tekshir: () => {
      const p = join(IS, 'toliqmas');
      /* Haqiqiy pg_dump, lekin faqat Mahalla jadvali */
      const s = shim(`exec "${HAQIQIY_PG_DUMP}" "$@" -t '"Mahalla"'`);
      const r = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: MANBA }, s);
      return r.kod === 1 && /to'liq emas/.test(r.chiqish) && dumplar(p).length === 0;
    },
  },
  {
    nomi: 'BUZUQ nusxa (pg_restore o\'qiy olmaydi, hajmi yetarli): kod 1',
    tekshir: () => {
      const p = join(IS, 'buzuq');
      const s = shim('while [ $# -gt 0 ]; do [ "$1" = "-f" ] && head -c 5000 /dev/urandom > "$2"; shift; done; exit 0');
      const r = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: MANBA }, s);
      return r.kod === 1 && /buzuq/.test(r.chiqish) && dumplar(p).length === 0;
    },
  },
  {
    nomi: 'YOZILAYOTGANDA ham yopiq: pg_dump yaratgan vaqtinchalik fayl ruxsati 600 (yakuniy nomga o\'tkazilgunga qadar shaxsiy ma\'lumot boshqalarga ochiq turmaydi)',
    tekshir: () => {
      const p = join(IS, 'ruxsat');
      const belgi = join(IS, 'ruxsat-belgisi.txt');
      const s = shim(`"${HAQIQIY_PG_DUMP}" "$@"; rc=$?; while [ $# -gt 0 ]; do [ "$1" = "-f" ] && stat -c %a "$2" > "${belgi}"; shift; done; exit $rc`);
      const r = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: MANBA }, s);
      return r.kod === 0 && existsSync(belgi) && readFileSync(belgi, 'utf8').trim() === '600';
    },
  },
  {
    nomi: 'ROTATSIYA: 6 ta eski (60 kun) nusxa bor - eng yangi 3 tasi (yangisi bilan) QOLADI, eskilari va ularning .sha256 i o\'chadi; begona fayllar va simvolik havola TEGILMAYDI',
    tekshir: () => {
      const p = join(IS, 'aylanma');
      mkdirSync(p, { recursive: true });
      for (let i = 1; i <= 6; i++) {
        const f = join(p, `bandlik-2026080${i}-000000.dump`);
        writeFileSync(f, 'x'.repeat(2000));
        writeFileSync(`${f}.sha256`, 'x');
        kunOldin(f, 60 + i);
      }
      writeFileSync(join(p, 'muhim-hujjat.txt'), 'tegma');
      kunOldin(join(p, 'muhim-hujjat.txt'), 400);
      writeFileSync(join(IS, 'nishon.dump'), 'nishon');
      symlinkSync(join(IS, 'nishon.dump'), join(p, 'bandlik-link.dump'));
      const r = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: MANBA, SAQLASH_KUN: '30' });
      const qoldi = dumplar(p).filter((f) => f !== 'bandlik-link.dump');
      /* Qoldi: yangi + eng yangi 2 ta eski (20260801, 20260802: kunOldin 61, 62) */
      return (
        r.kod === 0 && qoldi.length === 3 && qoldi.includes('bandlik-20260801-000000.dump') && qoldi.includes('bandlik-20260802-000000.dump') &&
        !existsSync(join(p, 'bandlik-20260806-000000.dump')) && !existsSync(join(p, 'bandlik-20260806-000000.dump.sha256')) &&
        readFileSync(join(p, 'muhim-hujjat.txt'), 'utf8') === 'tegma' && readFileSync(join(IS, 'nishon.dump'), 'utf8') === 'nishon'
      );
    },
  },
  {
    nomi: 'ROTATSIYA ENG YANGILARNI HIMOYA QILADI: hamma nusxa 400 kunlik bo\'lsa ham (soat xatosi) - eng yangi 3 tasi o\'chmaydi',
    tekshir: () => {
      const p = join(IS, 'xavfsiz');
      mkdirSync(p, { recursive: true });
      for (let i = 1; i <= 3; i++) {
        const f = join(p, `bandlik-2025010${i}-000000.dump`);
        writeFileSync(f, 'x'.repeat(2000));
        kunOldin(f, 400 + i);
      }
      /* Nusxa olish yiqilsin (ulanib bo'lmaydi): rotatsiyagacha yetmaydi, eskilar joyida */
      const r = yurgiz({ NUSXA_PAPKA: p, NUSXA_MANBA_URL: 'postgresql://u@127.0.0.1:1/yoq' });
      return r.kod === 1 && dumplar(p).length === 3;
    },
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
rmSync(IS, { recursive: true, force: true });
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
