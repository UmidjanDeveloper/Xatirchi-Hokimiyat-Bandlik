/**
 * ============================================================
 *  БАЗА УЛАНИШИ — СИНОВ
 *
 *  Бу файл 2026-йил 16-сентябрда, ишлаб чиқаришдаги узилишдан
 *  кейин туғилди.
 *
 *  Ҳолат: сайт «жуда секин» бўлиб қолди, хатлов ўртасида
 *  узилди, тушунарсиз хатолар чиқди. Бошқарув панелидаги
 *  ўлчагич сабабни айтди:
 *
 *      Базага уланишлар чегараси тўлган
 *
 *  Сабаб: Vercel да ҳар сўров алоҳида функция нусхасида
 *  бажарилади ва ҳар нусха ўз Prisma мижозини яратади. Prisma
 *  эса стандарт ҳолатда 5-9 та уланиш очади. Ўнта ходим бир
 *  вақтда ишласа, Supabase нинг уланишлари тугайди.
 *
 *  Ечим: ҳар нусхага БИТТА уланиш. Бу синовлар шу қоида
 *  ўзгармаслигини қўриқлайди — чунки у кўринмайди: код
 *  ишлайверади, фақат ЮК ОСТИДА қулайди.
 * ============================================================
 */

import { ulanishSatri } from '../src/lib/ulanish-satri';

type Sinov = { nomi: string; tekshir: () => boolean };

/** Муҳит ўзгарувчисини вақтинча қўйиб, натижани олади */
function bilan(url: string | undefined): string | undefined {
  const oldingi = process.env.DATABASE_URL;
  try {
    if (url === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = url;
    return ulanishSatri();
  } finally {
    if (oldingi === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldingi;
  }
}

/** Натижадан параметрни ўқиб олади */
function param(natija: string | undefined, nomi: string): string | null {
  if (!natija) return null;
  try {
    return new URL(natija).searchParams.get(nomi);
  } catch {
    return null;
  }
}

const SINOVLAR: Sinov[] = [
  /* ── АСОСИЙ ҚОИДА ── */
  {
    nomi: 'Уланишлар сони БИТТАГА чекланади',
    tekshir: () =>
      param(bilan('postgresql://u:p@db.example.com:5432/postgres'), 'connection_limit') === '1',
  },
  {
    nomi: 'Пулер манзилида ҳам чекланади',
    tekshir: () =>
      param(
        bilan('postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'),
        'connection_limit'
      ) === '1',
  },

  /* ── ПУЛЕР БЕЛГИСИ ── */
  {
    nomi: '6543-портда `pgbouncer=true` қўшилади',
    tekshir: () =>
      param(bilan('postgresql://u:p@db.example.com:6543/postgres'), 'pgbouncer') === 'true',
  },
  {
    nomi: 'Манзилида `pooler` бўлса ҳам қўшилади',
    tekshir: () =>
      param(
        bilan('postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'),
        'pgbouncer'
      ) === 'true',
  },
  {
    nomi: 'Тўғридан-тўғри уланишга `pgbouncer` қўшилмайди',
    tekshir: () =>
      param(bilan('postgresql://u:p@db.example.com:5432/postgres'), 'pgbouncer') === null,
  },

  /* ── ОДАМ ЁЗГАНИ УСТУН ── */
  {
    nomi: 'Созламада ёзилган қиймат ЎЗГАРТИРИЛМАЙДИ',
    tekshir: () => {
      const n = bilan('postgresql://u:p@db.example.com:5432/postgres?connection_limit=5');
      return param(n, 'connection_limit') === '5';
    },
  },
  {
    nomi: 'Мавжуд `pgbouncer=false` ҳам сақланади',
    tekshir: () =>
      param(
        bilan('postgresql://u:p@db.example.com:6543/postgres?pgbouncer=false'),
        'pgbouncer'
      ) === 'false',
  },
  {
    nomi: 'Бошқа параметрлар йўқолмайди',
    tekshir: () => {
      const n = bilan('postgresql://u:p@db.example.com:5432/postgres?schema=public&sslmode=require');
      return param(n, 'schema') === 'public' && param(n, 'sslmode') === 'require';
    },
  },

  /* ── БУЗИЛМАЙДИГАН ҲОЛАТЛАР ── */
  {
    nomi: 'Фойдаланувчи ва парол жойида қолади',
    tekshir: () => {
      const n = bilan('postgresql://foydalanuvchi:sir@db.example.com:5432/postgres');
      if (!n) return false;
      const u = new URL(n);
      return u.username === 'foydalanuvchi' && u.password === 'sir' && u.pathname === '/postgres';
    },
  },
  {
    nomi: 'Сатр йўқ бўлса — undefined, қуламайди',
    tekshir: () => bilan(undefined) === undefined,
  },
  {
    nomi: 'Нотўғри сатр ўзгартирилмай қайтади, қуламайди',
    tekshir: () => bilan('шунчаки матн') === 'шунчаки матн',
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
