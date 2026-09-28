/**
 * ============================================================
 *  МИГРАЦИЯНИ АВТОМАТИК ЙОЙИШ — ФАҚАТ PRODUCTION'да
 *
 *  Ишга тушади: `npm run build` ичида, `next build` дан ОЛДИН.
 *
 *  ── Нега керак бўлди ──
 *
 *  Илгари миграция қўлда юргизиларди: `npm run db:deploy`.
 *  Бу тўғри тартиб эди, аммо у ҲАР САФАР одам ва ноутбук
 *  талаб қиларди. Лойиҳа эгаси эса доим ноутбук билан юра
 *  олмайди — ва қўлда қадам ўтказиб юборилса, база эски
 *  қолиб, янги код 500 берарди.
 *
 *  ── Нега бу хавфсиз ──
 *
 *  Тартиб қуйидагича:
 *
 *    1. prisma generate
 *    2. МИГРАЦИЯ            ← база янгиланади
 *    3. next build          ← 2-5 дақиқа
 *    4. деплой              ← янги код ишга тушади
 *
 *  2 ва 4 орасида база ЯНГИ, код эса ҲАЛИ ЭСКИ. Бу оралиқ
 *  фақат миграция ЎЧИРСА ёки ном АЛМАШТИРСА хавфли бўларди —
 *  эски код йўқолган устунни сўраб қоларди.
 *
 *  Шунинг учун лойиҳада қатъий қоида бор: янги миграциялар
 *  ФАҚАТ ҚЎШАДИ. DROP, RENAME, ALTER TYPE, SET NOT NULL
 *  бўлса `scripts/migratsiya-sinov.ts` йиқилади ва код
 *  умуман push бўлмайди.
 *
 *  Фақат қўшадиган миграция учун эса «база янги, код эски»
 *  оралиғи бехавф: эски код янги жадвал ҳақида билмайди ва
 *  уни сўрамайди.
 *
 *  ── Нега фақат production ──
 *
 *  Vercel ҳар шох ва ҳар pull request учун ҳам қуради
 *  (preview деплой). Улар ҳам худди шу `build` буйруғини
 *  ишлатади. Агар шарт қўйилмаса, ҳар preview PRODUCTION
 *  базасига миграция юборарди.
 *
 *  ── Хато бўлса нима бўлади ──
 *
 *  Скрипт йиқилади → `next build` умуман бошланмайди →
 *  деплой бўлмайди → сайтда ЭСКИ код ишлайверади.
 *
 *  Бу атайин шундай: ярим қўлланган миграция билан ишлаган
 *  сайтдан кўра, эски-ю бутун сайт яхши.
 * ============================================================
 */
import { spawnSync } from 'node:child_process';

/** Vercel ҳар қурилишда қўяди: production | preview | development */
const MUHIT = process.env.VERCEL_ENV;

function chiq(xabar) {
  console.log(`[migratsiya] ${xabar}`);
}

if (MUHIT !== 'production') {
  /*
   * Бу ХАТО эмас. Маҳаллий қурилиш, CI ва preview деплойлар
   * шу ерга тушади — ва уларнинг ҳеч бири production базасига
   * тегмаслиги керак.
   *
   * CI нинг ўз базаси бор ва у workflow'да алоҳида қадам
   * билан яратилади.
   */
  chiq(`ўтказиб юборилди — VERCEL_ENV=${MUHIT ?? '(йўқ)'}, production эмас`);
  process.exit(0);
}

/*
 * Prisma сxемасида иккита манзил бор:
 *
 *   url       = env("DATABASE_URL")   ← оддий сўровлар
 *   directUrl = env("DIRECT_URL")     ← миграция
 *
 * Supabase'да булар ФАРҚ қилади: DATABASE_URL pgbouncer
 * орқали (6543-порт), DIRECT_URL базанинг ўзига (5432).
 * Миграция pooler орқали ишламайди — у сеанс даражасидаги
 * уланиш талаб қилади.
 *
 * DIRECT_URL қўйилмаган бўлса, DATABASE_URL билан уриниб
 * кўрамиз: кўп созламаларда битта манзилнинг ўзи бўлади.
 */
if (!process.env.DATABASE_URL) {
  console.error('[migratsiya] DATABASE_URL йўқ — Vercel созламаларига қўйинг.');
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  chiq('DIRECT_URL йўқ — DATABASE_URL ишлатилади');
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

chiq('production базасига қўлланмоқда…');

const natija = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

if (natija.status !== 0) {
  console.error('');
  console.error('[migratsiya] ЙИҚИЛДИ — деплой тўхтатилди.');
  console.error('[migratsiya] Сайтда эски код ишлайверади, база эса тегилмаган.');
  console.error('[migratsiya] Юқоридаги Prisma хатосини ўқинг.');
  process.exit(natija.status ?? 1);
}

chiq('тайёр — энди next build');
