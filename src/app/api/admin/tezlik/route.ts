import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { tahlilOl } from '@/lib/tahlil';
import { tuzilishXatosimi } from '@/lib/baza-xatosi';

/**
 * ============================================================
 *  ТЕЗЛИК ЎЛЧАГИЧ
 *
 *  «Сайт секин ишлаяпти» — бу жумладан чора чиқмайди. Секинлик
 *  қаерда экани керак: базага боришдами, сўровларнинг ўзидами,
 *  ёки серверни уйғотишдами.
 *
 *  Бу йўл айнан шуни ўлчайди ва РАҚАМ қайтаради. Администратор
 *  бир тугма босади — жавобда «базага бориш 240 мс» деб туради
 *  ва нима қилиш кераклиги аниқ бўлади.
 *
 *  ── Нега уланиш ҳолати ҳам текширилади ──
 *
 *  Vercel да ҳар сўров алоҳида функция нусхасида ишлайди. Агар
 *  `DATABASE_URL` тўғридан-тўғри базага (5432-порт) қаратилган
 *  бўлса, ҳар сўров ЯНГИ Postgres уланиши очади: бу 200-500 мс
 *  қўшади ва Supabase нинг уланиш чегарасини тез тўлдиради.
 *  Тўғриси — пулердан (6543-порт, `pgbouncer=true`) ўтиш.
 *
 *  Бу энг кўп учрайдиган сабаб, шунинг учун биринчи бўлиб
 *  текширилади.
 *
 *  ── Парол ҳеч қачон қайтарилмайди ──
 *
 *  Уланиш сатрида фойдаланувчи номи ва парол бор. Жавобга
 *  фақат ПОРТ ва «pgbouncer бормиз» деган ҳа/йўқ тушади.
 * ============================================================
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * AWS минтақаси — Vercel минтақаси мослиги.
 *
 * Supabase манзилида минтақа очиқ ёзилган бўлади:
 * `aws-0-eu-central-1.pooler.supabase.com`. Vercel эса ўз
 * қисқартмасини ишлатади. Маслаҳат АНИҚ бўлиши учун иккови
 * шу ерда боғланади — «минтақани мослаштиринг» деб умумий гап
 * айтишдан фойда йўқ.
 */
const VERCEL_MINTAQASI: Record<string, string> = {
  'eu-central-1': 'fra1',
  'eu-west-1': 'dub1',
  'eu-west-2': 'lhr1',
  'eu-west-3': 'cdg1',
  'eu-north-1': 'arn1',
  'us-east-1': 'iad1',
  'us-east-2': 'cle1',
  'us-west-1': 'sfo1',
  'us-west-2': 'pdx1',
  'ap-south-1': 'bom1',
  'ap-southeast-1': 'sin1',
  'ap-southeast-2': 'syd1',
  'ap-northeast-1': 'hnd1',
  'ap-northeast-2': 'icn1',
  'sa-east-1': 'gru1',
};

/** Манзилдан минтақа номини ажратиб олади */
function mintaqaniTop(hostname: string): string | null {
  const m = hostname.match(
    /\b((?:us|eu|ap|sa|ca|af|me)-(?:east|west|central|north|south|southeast|northeast|northwest|southwest)-\d)\b/
  );
  return m ? m[1] : null;
}

/** Уланиш сатридан фақат хавфсиз белгиларни ажратиб олади */
function ulanishHolati(): {
  port: string | null;
  pulerdanmi: boolean;
  pgbouncer: boolean;
  chegara: string | null;
  bazaMintaqasi: string | null;
  kerakliVercel: string | null;
  serverMintaqasi: string | null;
} {
  const xom = process.env.DATABASE_URL ?? '';
  try {
    const u = new URL(xom);
    const bazaMintaqasi = mintaqaniTop(u.hostname);
    return {
      port: u.port || null,
      /* Supabase пулери 6543-портда туради */
      pulerdanmi: u.port === '6543' || u.hostname.includes('pooler'),
      pgbouncer: u.searchParams.get('pgbouncer') === 'true',
      chegara: u.searchParams.get('connection_limit'),
      bazaMintaqasi,
      kerakliVercel: bazaMintaqasi ? (VERCEL_MINTAQASI[bazaMintaqasi] ?? null) : null,
      /* Vercel функция қайси минтақада ишлаётганини ўзи айтади */
      serverMintaqasi: process.env.VERCEL_REGION ?? null,
    };
  } catch {
    return {
      port: null,
      pulerdanmi: false,
      pgbouncer: false,
      chegara: null,
      bazaMintaqasi: null,
      kerakliVercel: null,
      serverMintaqasi: process.env.VERCEL_REGION ?? null,
    };
  }
}

/** Бир ишни бажариб, неча миллисекунд кетганини қайтаради */
async function olcha<T>(ish: () => Promise<T>): Promise<{ ms: number; xato: string | null }> {
  const boshi = Date.now();
  try {
    await ish();
    return { ms: Date.now() - boshi, xato: null };
  } catch (e) {
    return { ms: Date.now() - boshi, xato: (e as Error).message.slice(0, 200) };
  }
}

export async function GET() {
  const q = await talabQil(['ADMIN']);
  if (q instanceof NextResponse) return q;

  const boshi = Date.now();

  /*
   * Базага бориб-келиш. Уч марта: биринчиси уланишни очади ва
   * доим секинроқ бўлади, кейингилари ҳақиқий кечикишни
   * кўрсатади.
   */
  const ping: number[] = [];
  for (let i = 0; i < 3; i++) {
    const n = await olcha(() => prisma.$queryRaw`SELECT 1`);
    ping.push(n.ms);
  }

  const [sanash, panel] = await Promise.all([
    olcha(() =>
      Promise.all([
        prisma.household.count(),
        prisma.unemployedPerson.count(),
        prisma.user.count(),
      ])
    ),
    /* Ҳоким панели очилганда бажариладиган БУТУН иш */
    olcha(() => tahlilOl(undefined, 'oy')),
  ]);

  const [xonadon, ishsiz, xodim] = await Promise.all([
    prisma.household.count(),
    prisma.unemployedPerson.count(),
    prisma.user.count(),
  ]);

  const ulanish = ulanishHolati();

  /*
   * ── БАЗА ТУЗИЛИШИ КОДГА МОС КЕЛАДИМИ ──
   *
   * 16-сентябрда ҳокимнинг панелида PDF ҳам, Excel ҳам, сунъий
   * интеллект хулосаси ҳам ишламай қолди. Сабаби: янги код
   * чиққан, аммо базага янги устун қўшилмаган — деплой пайтида
   * миграция ишламаган.
   *
   * Буни билиш учун сервер журналини очиш керак эди. Энди эса
   * администратор бир тугма босади.
   *
   * Текшириш усули оддий: код кутаётган ЭНГ ЯНГИ устунни
   * сўраб кўрамиз. Йўқ бўлса — миграция қўлланмаган.
   */
  let tuzilish: { joyidami: boolean; izoh: string | null } = { joyidami: true, izoh: null };
  try {
    await prisma.household.aggregate({ _sum: { mehnatgaLayoqatsiz: true } });
  } catch (e) {
    if (tuzilishXatosimi(e)) {
      tuzilish = {
        joyidami: false,
        izoh: 'Базада `Household.mehnatgaLayoqatsiz` устуни йўқ — деплой пайтида миграция ишламаган.',
      };
    } else {
      throw e;
    }
  }

  /* Қўлланган миграциялар сони — тахмин қилмасдан билиш учун */
  let migratsiya: { soni: number; oxirgisi: string | null } = { soni: 0, oxirgisi: null };
  try {
    const qatorlar = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY finished_at DESC
    `;
    migratsiya = { soni: qatorlar.length, oxirgisi: qatorlar[0]?.migration_name ?? null };
  } catch {
    /* Жадвал йўқ бўлса — база умуман тайёрланмаган */
  }

  /*
   * Хулоса — рақамга қараб АЙТИБ берилади. Администратор
   * миллисекундларни ўзи талқин қилиши шарт эмас.
   */
  const eng = Math.min(...ping);
  const maslahatlar: string[] = [];

  /* Тузилиш хатоси ЭНГ ТЕПАДА туради — у сайтни ишдан чиқаради */
  if (!tuzilish.joyidami) {
    maslahatlar.push(
      `${tuzilish.izoh} Шунинг учун PDF, Excel ва сунъий интеллект хулосаси ишламайди. ` +
        'Тузатиш: Vercel да лойиҳани қайта деплой қилинг (Deployments → энг охиргиси → Redeploy) — ' +
        'деплой пайтида миграция ўз-ўзидан қўлланади. Шошилинч бўлса, Supabase нинг SQL Editor ойнасида ' +
        'қуйидагини бажаринг: ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "mehnatgaLayoqatsiz" INTEGER NOT NULL DEFAULT 0; ' +
        'ALTER TABLE "HouseholdKesma" ADD COLUMN IF NOT EXISTS "mehnatgaLayoqatsiz" INTEGER NOT NULL DEFAULT 0;'
    );
  }

  if (!ulanish.pulerdanmi) {
    maslahatlar.push(
      'DATABASE_URL пулердан ўтмаяпти. Vercel да ҳар сўров янги Postgres уланиши очади — бу энг кўп учрайдиган секинлик сабаби. Supabase да «Connection pooling» (6543-порт) манзилини олиб, DATABASE_URL га қўйинг; DIRECT_URL эса 5432 да қолсин (миграция учун керак).'
    );
  } else if (!ulanish.pgbouncer) {
    maslahatlar.push(
      'Пулер ишлатиляпти, аммо `?pgbouncer=true&connection_limit=1` параметрлари йўқ. Уларсиз Prisma тайёрланган сўровларни кешлаб, пулер билан тўқнашади.'
    );
  }

  if (eng > 150) {
    /*
     * Маслаҳат УМУМИЙ эмас, АНИҚ бўлсин: қайси минтақа, қайси
     * файлга нима ёзиш керак. «Минтақани мослаштиринг» деган
     * гапдан чора чиқмайди.
     */
    const qayerga = ulanish.kerakliVercel;
    const qayerda = ulanish.serverMintaqasi;

    if (qayerga && qayerda && qayerga !== qayerda) {
      maslahatlar.push(
        `Базага бориб-келиш ${eng} мс — жуда узоқ. Сабаби аниқ: база «${ulanish.bazaMintaqasi}» минтақасида, ` +
          `Vercel функцияси эса «${qayerda}» да. Иккови орасидаги масофа ҳар сўровга шунча вақт қўшади. ` +
          `Тузатиш: лойиҳадаги vercel.json га "regions": ["${qayerga}"] қаторини қўшиб, қайта деплой қилинг.`
      );
    } else if (qayerga) {
      maslahatlar.push(
        `Базага бориб-келиш ${eng} мс — жуда узоқ. База «${ulanish.bazaMintaqasi}» минтақасида. ` +
          `vercel.json да "regions": ["${qayerga}"] турганига ишонч ҳосил қилинг.`
      );
    } else {
      maslahatlar.push(
        `Базага бориб-келиш ${eng} мс. Бу узоқ: сервер билан база ҲАР ХИЛ минтақада бўлса шундай бўлади. Vercel лойиҳасининг минтақасини Supabase минтақасига мослаштиринг.`
      );
    }
  }

  if (panel.ms > 2000) {
    /*
     * Панел тўққизта сўров юборади. Улар ПАРАЛЛЕЛ кетиши
     * керак; агар ketma-ket кетса, вақт тўққиз баравар ошади.
     * Чегара «1» бўлса — сабаб шу.
     */
    const chegara = ulanish.chegara;
    maslahatlar.push(
      chegara === '1'
        ? `Панел маълумоти ${panel.ms} мс. Уланишлар чегараси «1» — панелнинг тўққизта сўрови навбатда турибди. ` +
            'Пулер орқали ишлаганда чегара 5 бўлиши керак (кодда шундай қўйилган); созламадаги `connection_limit=1` ни олиб ташланг.'
        : `Панел маълумоти ${panel.ms} мс да тайёрланяпти. Базадаги ёзувлар кўпайган — тезлик учун қўшимча индекс ёки кеш керак бўлади.`
    );
  }

  if (maslahatlar.length === 0) {
    maslahatlar.push('Ўлчовлар яхши: секинлик база ёки сўровлардан эмас.');
  }

  return NextResponse.json({
    ok: true,
    jami: Date.now() - boshi,
    baza: { ping, eng, ortacha: Math.round(ping.reduce((a, b) => a + b, 0) / ping.length) },
    sorovlar: { sanash: sanash.ms, panel: panel.ms, panelXatosi: panel.xato },
    hajm: { xonadon, ishsiz, xodim },
    ulanish,
    tuzilish,
    migratsiya,
    maslahatlar,
  });
}
