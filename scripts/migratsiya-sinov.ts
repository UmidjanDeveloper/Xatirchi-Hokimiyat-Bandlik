/**
 * ============================================================
 *  МИГРАЦИЯ ХАВФСИЗЛИГИ — СИНОВ
 *
 *  Бу файл 2026-йил 24-сентябрда туғилди. Ўша куни `YETTILIK`
 *  ролини `HOKIM_YORDAMCHISI` га қайта номламоқчи бўлдим ва
 *  жўнатишдан олдин `package.json` га кўзим тушди:
 *
 *      build: prisma generate && prisma migrate deploy && next build
 *
 *  Яъни миграция Vercel build'ининг БОШИДА, `next build` дан
 *  ОЛДИН ишларди. Кетма-кетлик шундай бўларди:
 *
 *    1. Миграция productionда бажарилади — база янги номни
 *       қайтара бошлайди
 *    2. Эски код ҲАЛИ хизмат кўрсатиб турибди ва у
 *       `rol === 'YETTILIK'` деб текширади
 *    3. Build тугагунча — 2-5 дақиқа — 70 та маҳалла ходими
 *       ҲУҚУҚСИЗ қолади. Далада, телефонда, ярим тўлдирилган
 *       анкета билан.
 *    4. Build хато берса, база янги, код эски бўлиб ҚОЛИБ
 *       КЕТАДИ.
 *
 *  Иккита қоида шундан келиб чиқди:
 *
 *    A. Миграция build ичида ИШЛАМАЙДИ. У алоҳида қадам
 *       (`npm run db:deploy`) ва кодни жўнатишдан ОЛДИН
 *       қўлда бажарилади.
 *
 *    B. Миграция ФАҚАТ ҚЎШАДИ. Чунки миграция билан код
 *       ораси доим бир неча дақиқа бўлади ва ўша орада
 *       ЯНГИ база + ЭСКИ код ёнма-ён яшайди. Қўшиш бунга
 *       чидайди: эски код янги устунни сўрамайди. Ўчириш,
 *       қайта номлаш, тур ўзгартириш — чидамайди.
 * ============================================================
 */
import { readFileSync, readdirSync } from 'node:fs';

type Sinov = { nomi: string; tekshir: () => boolean };

const PAKET = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

/** Барча миграция файллари */
function migratsiyalar(): { nomi: string; sql: string }[] {
  const ildiz = 'prisma/migrations';
  const chiqdi: { nomi: string; sql: string }[] = [];
  for (const band of readdirSync(ildiz, { withFileTypes: true })) {
    if (!band.isDirectory()) continue;
    try {
      chiqdi.push({
        nomi: band.name,
        sql: readFileSync(`${ildiz}/${band.name}/migration.sql`, 'utf8'),
      });
    } catch {
      /* migration.sql йўқ — Prisma ўзи шикоят қилади */
    }
  }
  return chiqdi;
}

/** Изоҳларсиз SQL — изоҳдаги сўз текширувни алдамасин */
const sqlKodi = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*--.*$/gm, '');

/**
 * Эски миграциялар бу қоида ёзилишидан ОЛДИН тузилган.
 *
 * Уларни ўзгартириш мумкин эмас: Prisma ҳар бирининг
 * назорат йиғиндисини сақлайди ва таҳрирланган миграция
 * `migrate deploy` ни йиқитади.
 *
 * Шунинг учун рўйхат — ЎТМИШ учун истисно. Янги миграция бу
 * рўйхатга қўшилмайди: қоида айнан ундан бошлаб ишлайди.
 */
const ESKI_ISTISNO = new Set(
  migratsiyalar()
    .map((m) => m.nomi)
    .filter((n) => n < '20260924')
);

/** Хавфли амаллар — база билан код орасидаги фарқни кўтармайди */
const XAVFLI: { naqsh: RegExp; nomi: string }[] = [
  { naqsh: /\bDROP\s+TABLE\b/i, nomi: 'DROP TABLE' },
  { naqsh: /\bDROP\s+COLUMN\b/i, nomi: 'DROP COLUMN' },
  { naqsh: /\bRENAME\s+(?:VALUE|COLUMN|TO)\b/i, nomi: 'RENAME' },
  { naqsh: /\bDROP\s+TYPE\b/i, nomi: 'DROP TYPE' },
  { naqsh: /\bALTER\s+COLUMN\b[\s\S]{0,80}?\bTYPE\b/i, nomi: 'ALTER COLUMN ... TYPE' },
  { naqsh: /\bSET\s+NOT\s+NULL\b/i, nomi: 'SET NOT NULL' },
  { naqsh: /\bTRUNCATE\b/i, nomi: 'TRUNCATE' },
];

const SINOVLAR: Sinov[] = [
  {
    /*
     * ── ҚОИДА ЎЗГАРДИ ──
     *
     * Илгари бу ерда «миграция build ичида ИШЛАМАСЛИГИ шарт»
     * деб турарди. Сабаб тўғри эди: `prisma migrate deploy`
     * тўғридан-тўғри build ичида турарди ва ҲАР ҚАНДАЙ
     * қурилишда — preview деплойларда ҳам — production
     * базасига тегарди.
     *
     * Аммо қўлда юргизиш ҳам ишламади: у ҳар сафар одам ва
     * ноутбук талаб қилади, ва ўтказиб юборилса база эски
     * қолиб янги код 500 берарди.
     *
     * Ечим — ўртада қўриқчи: `scripts/migratsiya-yoy.mjs`.
     * У `VERCEL_ENV === 'production'` бўлмаса ҲЕЧ НАРСА
     * қилмайди. Маҳаллий қурилиш, CI ва preview деплойлар
     * production базасига тега олмайди.
     *
     * Шунинг учун қоида энди бошқача: миграция build ичида
     * БЎЛИШИ мумкин, аммо ФАҚАТ қўриқчи орқали.
     */
    nomi: 'Build миграцияни ТЎҒРИДАН-ТЎҒРИ юргизмайди',
    tekshir: () => {
      const build = PAKET.scripts.build ?? '';
      /*
       * `prisma migrate deploy` build сатрида бўлмаслиги керак.
       * Қўриқчи скрипт эса бўлиши мумкин — у ичида шартни
       * текширади.
       */
      if (/prisma\s+migrate\s+deploy/.test(build)) {
        console.log(`     build: ${build}`);
        return false;
      }
      return true;
    },
  },
  {
    nomi: 'Build қўриқчи скриптни чақиради',
    tekshir: () => {
      const build = PAKET.scripts.build ?? '';
      const bor = build.includes('scripts/migratsiya-yoy.mjs');
      if (!bor) console.log(`     build: ${build}`);
      return bor;
    },
  },
  {
    /*
     * Қўриқчининг ЎЗИ текширилади. Шарт йўқолса, ҳар preview
     * деплой production базасига миграция юборарди — ва буни
     * ҳеч ким сезмасди.
     */
    nomi: "Қўриқчи фақат VERCEL_ENV=production да ишлайди",
    tekshir: () => {
      const kod = readFileSync('scripts/migratsiya-yoy.mjs', 'utf8');
      return (
        kod.includes("process.env.VERCEL_ENV") &&
        kod.includes("MUHIT !== 'production'") &&
        /process\.exit\(0\)/.test(kod)
      );
    },
  },
  {
    /*
     * Миграция йиқилса, деплой ДАВОМ ЭТМАСЛИГИ керак. Акс
     * ҳолда ярим қўлланган база устига янги код чиқарди.
     */
    nomi: 'Миграция йиқилса деплой тўхтайди',
    tekshir: () => {
      const kod = readFileSync('scripts/migratsiya-yoy.mjs', 'utf8');
      return kod.includes('natija.status !== 0') && /process\.exit\(natija\.status/.test(kod);
    },
  },
  {
    /* Аммо қўлда бажарадиган йўл БЎЛИШИ керак */
    nomi: 'Миграция учун алоҳида буйруқ бор',
    tekshir: () =>
      Object.values(PAKET.scripts).some((b) => /prisma\s+migrate\s+deploy/.test(b)),
  },
  {
    nomi: 'Янги миграциялар ФАҚАТ ҚЎШАДИ — ўчирмайди, номини алмаштирмайди',
    tekshir: () => {
      const aybdor: string[] = [];
      for (const m of migratsiyalar()) {
        if (ESKI_ISTISNO.has(m.nomi)) continue;
        const kod = sqlKodi(m.sql);
        for (const x of XAVFLI) {
          if (x.naqsh.test(kod)) aybdor.push(`${m.nomi}: ${x.nomi}`);
        }
      }
      if (aybdor.length) {
        console.log(`     хавфли амал: ${aybdor.join(', ')}`);
        console.log(
          '     Миграция билан код ораси бир неча дақиқа — ўша орада'
        );
        console.log(
          '     ЯНГИ база ва ЭСКИ код ёнма-ён яшайди. Аввал қўшинг,'
        );
        console.log('     код ўтгандан КЕЙИН, алоҳида миграция билан ўчиринг.');
      }
      return aybdor.length === 0;
    },
  },
  {
    /*
     * Ҳар бир миграция файли `IF NOT EXISTS` ишлатсин: қўлда
     * бажарилган миграция ярим йўлда узилса, қайта юргизиш
     * хатосиз ўтиши керак.
     */
    nomi: 'Янги миграциялар такрор юргизилса ҳам хато бермайди',
    tekshir: () => {
      const aybdor: string[] = [];
      for (const m of migratsiyalar()) {
        if (ESKI_ISTISNO.has(m.nomi)) continue;
        const kod = sqlKodi(m.sql);
        /*
         * `DO $$ ... EXCEPTION WHEN duplicate_object` блоки —
         * Postgres'даги СТАНДАРТ йўл. `CREATE TYPE` ва
         * `ADD CONSTRAINT` да `IF NOT EXISTS` умуман йўқ,
         * шунинг учун такрорга чидамлиликни фақат шу блок
         * билан бериш мумкин.
         *
         * Блок ичидаги гапларни алоҳида текшириш нотўғри
         * бўларди: улар аллақачон қўриқланган.
         */
        const bloksiz = kod.replace(/DO\s*\$\$[\s\S]*?END\s*\$\$\s*;/gi, '');
        for (const satr of bloksiz.split(';')) {
          const t = satr.trim();
          if (!t) continue;
          const qoshadi = /\bADD\s+(COLUMN|VALUE)\b|\bCREATE\s+(TABLE|INDEX|TYPE)\b/i.test(t);
          if (qoshadi && !/IF\s+NOT\s+EXISTS/i.test(t)) {
            aybdor.push(`${m.nomi}: ${t.replace(/\s+/g, ' ').slice(0, 60)}`);
          }
        }
      }
      if (aybdor.length) for (const a of aybdor) console.log(`     ${a}`);
      return aybdor.length === 0;
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
