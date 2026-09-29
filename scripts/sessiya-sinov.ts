/**
 * ============================================================
 *  СЕССИЯ, ҲУҚУҚ ва КЎРИШ РЕЖИМИ — СИНОВ
 *
 *  Ишга тушириш:  npx tsx scripts/sessiya-sinov.ts
 *
 *  Учта камчилик шу ерда қўриқланади.
 *
 *  ── A. САҲИФА ҲУҚУҚИ COOKIE'ДАН ЎҚИЛАРДИ ──
 *
 *  API (`talabQil`) ҳар сўровда базадан `faol`, `rol` ва
 *  `mahallaId` ни ўқирди. Саҳифалар эса `joriySessiya()` ни
 *  чақирарди — у cookie ичидаги ЭСКИ қийматни қайтаради.
 *
 *  Оқибати: администратор ходимнинг ролини пасайтирса, у
 *  эски саҳифаларни 12 соатгача очаверарди; бошқа МФЙ га
 *  кўчирилган ходим эса ЭСКИ маҳалланинг рўйхатини
 *  кўришда давом этарди.
 *
 *  ── B. ПАРОЛ АЛМАШСА, ЭСКИ COOKIE ЯШАБ ҚОЛАРДИ ──
 *
 *  Сессия — имзоланган cookie, серверда нусхаси йўқ. Яъни
 *  «чиқариб юбориш» деган тугма умуман ишламасди: ўғирланган
 *  cookie ўз 12 соатини тўлиқ яшарди. Энди `sessiyaVersiyasi`
 *  бор ва у ошса, эски cookie ўша заҳоти ўлади.
 *
 *  ── КЎРИШ РЕЖИМИ ──
 *
 *  Битта браузерда битта cookie бўлади — администратор
 *  панели билан МФЙ ходимининг панелини ёнма-ён очиб
 *  бўлмасди. Энди «кўз» бор: сайт бошқа ходимнинг роли
 *  билан чизилади, ЁЗИШ эса умуман ишламайди.
 * ============================================================
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

process.env.SESSION_SECRET ??= 'sinov-uchun-soxta-kalit-kamida-32-belgi-bolsin';

import { HECH_QAYSI_MAHALLA, mahallaFiltri, sessiyaOqi, sessiyaYarat } from '../src/lib/auth';
import { checkRateLimit, resetRateLimit } from '../src/lib/rate-limit';
import {
  KORISH_ISTISNOLARI,
  OQISH_USULLARI,
  istisnomi,
  kozniOqi,
  ozgartirishmi,
} from '../src/lib/korish-rejimi';

type Sinov = { nomi: string; tekshir: () => boolean };

/** Изоҳларсиз код — изоҳдаги сўз текширувни алдамасин */
const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const oqi = (y: string) => kodiOl(readFileSync(y, 'utf8'));

/** `(ilova)` остидаги барча саҳифалар */
function sahifalar(ildiz = 'src/app/(ilova)'): string[] {
  const topildi: string[] = [];
  for (const band of readdirSync(ildiz, { withFileTypes: true })) {
    const yol = join(ildiz, band.name);
    if (band.isDirectory()) topildi.push(...sahifalar(yol));
    else if (band.name === 'page.tsx') topildi.push(yol);
  }
  return topildi;
}

const SINOVLAR: Sinov[] = [
  // ═══════════════════════════════════════════════════════════
  //  A — САҲИФА ҲУҚУҚИ БАЗАДАН
  // ═══════════════════════════════════════════════════════════
  {
    nomi: 'Ҳеч бир саҳифа `joriySessiya()` ни чақирмайди',
    tekshir: () => {
      const aybdorlar = sahifalar().filter((y) => oqi(y).includes('joriySessiya('));
      if (aybdorlar.length > 0) console.log(`     ${aybdorlar.join(', ')}`);
      return aybdorlar.length === 0;
    },
  },
  {
    nomi: 'Қобиқ ҳам, кириш саҳифаси ҳам базадан текширади',
    tekshir: () => {
      const qobiq = oqi('src/app/(ilova)/layout.tsx');
      const kirish = oqi('src/app/kirish/page.tsx');
      return (
        qobiq.includes('await joriyXodim()') &&
        /* Кириш саҳифаси ҳам: яроқсиз cookie ёпиқ ҳалқа ясамасин */
        kirish.includes('await joriyXodim()') &&
        !kirish.includes('joriySessiya(')
      );
    },
  },
  {
    nomi: '`joriyXodim` рол ва маҳаллани БАЗАДАН олади',
    tekshir: () => {
      const k = oqi('src/lib/sahifa-auth.ts');
      return (
        k.includes('prisma.user.findUnique') &&
        k.includes('rol: user.rol') &&
        k.includes('mahallaId: user.mahallaId') &&
        /* Ишдан бўшатилган ходим ичкарига кирмасин */
        k.includes('if (!user || !user.faol) return null;')
      );
    },
  },
  {
    nomi: 'Маҳалласиз МФЙ ходими ҲЕЧ НАРСА кўрмайди',
    tekshir: () => {
      const f = mahallaFiltri({ rol: 'YETTILIK', mahallaId: null });
      const g = mahallaFiltri({ rol: 'YETTILIK', mahallaId: 'mfy-7' });
      const h = mahallaFiltri({ rol: 'HOKIM', mahallaId: null });
      return (
        f.mahallaId === HECH_QAYSI_MAHALLA &&
        g.mahallaId === 'mfy-7' &&
        h.mahallaId === undefined
      );
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  B — СЕССИЯ АВЛОДИ
  // ═══════════════════════════════════════════════════════════
  {
    nomi: 'Сессия авлоди cookie ичига ёзилади',
    tekshir: () => {
      const { token } = sessiyaYarat({
        userId: 'u1',
        username: 'a',
        fullName: 'A',
        rol: 'ADMIN',
        mahallaId: null,
        v: 7,
      });
      return sessiyaOqi(token)?.v === 7;
    },
  },
  {
    nomi: 'Авлодни cookie ичида ўзгартириб бўлмайди — имзо бузилади',
    tekshir: () => {
      const { token } = sessiyaYarat({
        userId: 'u1',
        username: 'a',
        fullName: 'A',
        rol: 'YETTILIK',
        mahallaId: 'm1',
        v: 1,
      });
      const [payload, imzo] = token.split('.');
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      data.v = 2;
      data.rol = 'ADMIN';
      const soxta = Buffer.from(JSON.stringify(data)).toString('base64url');
      return sessiyaOqi(`${soxta}.${imzo}`) === null;
    },
  },
  {
    nomi: 'Кириш йўли cookie га авлодни ёзади',
    tekshir: () => oqi('src/app/api/auth/kirish/route.ts').includes('v: user.sessiyaVersiyasi'),
  },
  {
    nomi: 'Парол алмашганда авлод ошади — ҳар икки йўлда',
    tekshir: () => {
      const oz = oqi('src/app/api/auth/parol/route.ts');
      const admin = oqi('src/app/api/admin/xodimlar/[id]/route.ts');
      return (
        oz.includes('sessiyaVersiyasi: { increment: 1 }') &&
        admin.includes('sessiyaVersiyasi: { increment: 1 }')
      );
    },
  },
  {
    nomi: 'Қоровуллар авлодни текширади — иккаласи ҳам',
    tekshir: () => {
      const api = oqi('src/lib/api-auth.ts');
      const sahifa = oqi('src/lib/sahifa-auth.ts');
      return (
        api.includes('sessiya.v !== user.sessiyaVersiyasi') &&
        sahifa.includes('cookieAvlodi !== user.sessiyaVersiyasi')
      );
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  ЁПИҚ ҲАЛҚА — ХОДИМ САЙТГА УМУМАН КИРА ОЛМАСДИ
  // ═══════════════════════════════════════════════════════════
  {
    /*
     * Яроқсиз cookie билан:
     *   /admin → саҳифа рад этади → /kirish
     *   /kirish → «cookie бор» → /
     *   / → рад этади → /kirish …
     *
     * Браузер ERR_TOO_MANY_REDIRECTS берар, ходим эса
     * cookie'ни қўлда ўчирмагунча сайтга кира олмасди.
     */
    nomi: 'Яроқсиз cookie ёпиқ ҳалқа ясамайди',
    tekshir: () => {
      const k = oqi('src/app/kirish/page.tsx');
      /* Фақат `joriyXodim` — яъни база сўралади, cookie эмас */
      return k.includes("if (await joriyXodim()) redirect('/')");
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  КЎРИШ РЕЖИМИ
  // ═══════════════════════════════════════════════════════════
  {
    nomi: 'Кўз cookie ичида сақланади ва ўқилади',
    tekshir: () => {
      const { token } = sessiyaYarat({
        userId: 'admin-1',
        username: 'adm',
        fullName: 'Администратор',
        rol: 'ADMIN',
        mahallaId: null,
        v: 1,
        koz: 'xodim-9',
      });
      return sessiyaOqi(token)?.koz === 'xodim-9' && kozniOqi(token) === 'xodim-9';
    },
  },
  {
    nomi: 'Кўзсиз сессияда `kozniOqi` бўш қайтаради',
    tekshir: () => {
      const { token } = sessiyaYarat({
        userId: 'u',
        username: 'a',
        fullName: 'A',
        rol: 'YETTILIK',
        mahallaId: 'm',
        v: 1,
      });
      return kozniOqi(token) === null && kozniOqi(null) === null && kozniOqi('buzuq') === null;
    },
  },
  {
    nomi: 'Ўқиш усуллари ўтади, ёзиш усуллари тўсилади',
    tekshir: () => {
      const oqish = OQISH_USULLARI.every((u) => !ozgartirishmi(u));
      const yozish = ['POST', 'PUT', 'PATCH', 'DELETE', 'post'].every((u) => ozgartirishmi(u));
      return oqish && yozish;
    },
  },
  {
    nomi: 'Чиқиш ва режимни ўчириш йўллари истисно',
    tekshir: () =>
      istisnomi('/api/admin/korish') &&
      istisnomi('/api/auth/chiqish') &&
      !istisnomi('/api/xatlov') &&
      KORISH_ISTISNOLARI.length === 2,
  },
  {
    nomi: 'Миддлевар кўриш режимида ёзишни тўсади',
    tekshir: () => {
      const k = oqi('src/middleware.ts');
      return (
        k.includes('ozgartirishmi(req.method)') &&
        k.includes('kozniOqi(token)') &&
        k.includes('!istisnomi(pathname)') &&
        k.includes('{ status: 403 }')
      );
    },
  },
  {
    nomi: '`talabQil` ҳам тўсади — иккинчи қават',
    tekshir: () => {
      const k = oqi('src/lib/api-auth.ts');
      return (
        k.includes('const usul = headers().get(USUL_SARLAVHASI)') &&
        k.includes('if (ozgartirishmi(usul))')
      );
    },
  },
  {
    nomi: 'Миддлевар усулни сарлавҳага ёзиб беради',
    tekshir: () => {
      const k = oqi('src/middleware.ts');
      return (
        k.includes('sarlavhalar.set(USUL_SARLAVHASI, req.method)') &&
        k.includes('NextResponse.next({ request: { headers: sarlavhalar } })')
      );
    },
  },
  {
    nomi: 'Кўз фақат ADMIN учун ишлайди — рол БАЗАДАН текширилади',
    tekshir: () => {
      const sahifa = oqi('src/lib/sahifa-auth.ts');
      const api = oqi('src/lib/api-auth.ts');
      return (
        sahifa.includes("user.rol === 'ADMIN'") &&
        api.includes("user.rol === 'ADMIN'") &&
        /* Ўзига ўзи қарашнинг маъноси йўқ */
        sahifa.includes('koz !== sessiya.userId') &&
        api.includes('koz !== sessiya.userId')
      );
    },
  },
  {
    nomi: 'Режим ёқилгани ҳам, ўчирилгани ҳам журналга тушади',
    tekshir: () => {
      const k = oqi('src/app/api/admin/korish/route.ts');
      return (
        (k.match(/jurnal\(q\.user\.id, 'KORISH'/g) ?? []).length === 2 &&
        k.includes("izoh: 'Ko‘rish rejimi o‘chirildi'")
      );
    },
  },
  {
    nomi: 'Режим йўли ҳуқуқни ҲАҚИҚИЙ ҳисоб бўйича текширади',
    tekshir: () => {
      const k = oqi('src/app/api/admin/korish/route.ts');
      return (
        k.includes('sorovSessiyasi()') &&
        k.includes("if (user.rol !== 'ADMIN') return { xato: taqiqlangan() } as const;") &&
        /* Ўчирилган ҳисобнинг панелини очиб бўлмайди */
        k.includes('if (!nishon.faol)')
      );
    },
  },
  {
    nomi: 'Кўз режими мажбурий парол алмаштиришни четлаб ўтмайди',
    tekshir: () => {
      const k = oqi('src/app/api/admin/korish/route.ts');
      return k.includes('if (user.parolAlmashtirilsin)') && k.includes('parolAlmashtirilsin: true');
    },
  },
  {
    nomi: 'Қобиқ ҳам чиқишда ҲАҚИҚИЙ ҳисобни ишлатади',
    tekshir: () => {
      const q = oqi('src/app/(ilova)/layout.tsx');
      const qobiq = oqi('src/components/shell/app-shell.tsx');
      return (
        (q.match(/xodim\.korish\?\.haqiqiyUsername \?\? xodim\.username/g) ?? []).length === 2 &&
        qobiq.includes('chiqishdaTozala(username)')
      );
    },
  },
  {
    nomi: 'Лента доимий — ёпиш тугмаси йўқ',
    tekshir: () => {
      const k = oqi('src/components/shell/korish-lentasi.tsx');
      const qobiq = oqi('src/app/(ilova)/layout.tsx');
      return (
        !k.includes('setYopildi') &&
        k.includes("fetch('/api/admin/korish', { method: 'DELETE' })") &&
        qobiq.includes('{xodim.korish && (')
      );
    },
  },
  {
    nomi: 'Қоровулга ҲАҚИҚИЙ ҳисоб берилади — бекорга огоҳлантирмасин',
    tekshir: () =>
      oqi('src/app/(ilova)/layout.tsx').includes(
        'username={xodim.korish?.haqiqiyUsername ?? xodim.username}'
      ),
  },
  // ═══════════════════════════════════════════════════════════
  //  F — КИРИШ ЧЕГАРАСИ: ИП ва ҲИСОБ
  // ═══════════════════════════════════════════════════════════
  {
    /*
     * Ҳокимлик биносида ўнлаб ходим БИТТА чиқишдан фойдаланади.
     * Чегара фақат IP бўйича бўлса, тўртинчи ходим паролни хато
     * терганда бешинчиси умуман кира олмасди.
     */
    nomi: 'Чегара икки ўлчовда: ҳисоб ва IP',
    tekshir: () => {
      const k = oqi('src/app/api/auth/kirish/route.ts');
      return (
        k.includes('const HISOB_CHEGARASI = 7') &&
        k.includes('const IP_CHEGARASI = 60') &&
        k.includes('checkRateLimit(hisobKaliti(username)') &&
        k.includes('checkRateLimit(ipKaliti(ip)') &&
        /* Идора бир IP дан ишлайди — унга бемалол етсин */
        k.includes('IP_CHEGARASI, OYNA_MS')
      );
    },
  },
  {
    nomi: 'Ҳисоб калити регистрга боғлиқ эмас',
    tekshir: () => {
      const k = oqi('src/app/api/auth/kirish/route.ts');
      return k.includes('return `kirish:hisob:${username.trim().toLowerCase()}`;');
    },
  },
  {
    nomi: 'Ҳисоб чегараси БАЗАГА мурожаатдан ОЛДИН',
    tekshir: () => {
      const k = oqi('src/app/api/auth/kirish/route.ts');
      const chegara = k.indexOf('checkRateLimit(hisobKaliti(username)');
      const baza = k.indexOf('prisma.user.findUnique');
      return chegara > 0 && baza > 0 && chegara < baza;
    },
  },
  {
    nomi: 'Муваффақиятли кириш ИККАЛА чегарани ҳам тозалайди',
    tekshir: () => {
      const k = oqi('src/app/api/auth/kirish/route.ts');
      return (
        k.includes('resetRateLimit(hisobKaliti(username))') &&
        k.includes('resetRateLimit(ipKaliti(ip))')
      );
    },
  },
  {
    nomi: 'Чегара ростдан ҳам тўсади ва тозалангач очилади',
    tekshir: () => {
      const kalit = `sinov:${Math.random()}`;
      resetRateLimit(kalit);
      for (let i = 0; i < 3; i++) {
        if (!checkRateLimit(kalit, 3, 60_000).allowed) return false;
      }
      const tortinchi = checkRateLimit(kalit, 3, 60_000);
      if (tortinchi.allowed || tortinchi.retryAfter < 1) return false;
      resetRateLimit(kalit);
      return checkRateLimit(kalit, 3, 60_000).allowed;
    },
  },
  {
    nomi: '429 жавобида `Retry-After` сарлавҳаси бор',
    tekshir: () => oqi('src/app/api/auth/kirish/route.ts').includes("'Retry-After': String("),
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
