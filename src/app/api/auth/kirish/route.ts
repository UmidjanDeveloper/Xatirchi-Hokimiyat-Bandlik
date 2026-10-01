import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, parolTogrimi, sessiyaYarat } from '@/lib/auth';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limit';
import { jurnal } from '@/lib/api-auth';
import { bazaChegarasiYumshoq, bazaChegarasiniTozala } from '@/lib/kirish-chegarasi';

const Kirish = z.object({
  username: z.string().min(1).max(64),
  parol: z.string().min(1).max(200),
});

/**
 * ============================================================
 *  КИРИШ ЧЕГАРАСИ — ИККИ ЎЛЧОВДА
 *
 *  Аввал чегара ФАҚАТ IP бўйича эди ва иккита қарама-қарши
 *  камчилиги бор эди.
 *
 *  1. ЖУДА ҚАТТИҚ. Ҳокимлик биносида ўнлаб ходим битта
 *     интернетдан чиқади — ташқаридан уларнинг ҳаммаси
 *     БИТТА IP. Эрталаб ҳамма бирданига киради: тўртинчи
 *     ходим паролни хато терса, бешинчиси умуман кира
 *     олмасди. Чорраҳадаги ходим эса ўзи нима
 *     қилганини билмасди — «жуда кўп уриниш» деган ёзув
 *     чиқарди, холос.
 *
 *  2. ЖУДА ЮМШОҚ. Ҳужумчи учун IP — арзон нарса. Мобил
 *     интернетни ўчириб-ёқиш кифоя: янги IP, янги ўнта
 *     уриниш. Яъни БИТТА ҳисобни териб топишга уриниш
 *     амалда чекланмаган эди.
 *
 *  Энди иккита алоҳида ҳисоб юритилади:
 *
 *    · ҲИСОБ бўйича — қайси IP дан келишидан қатъи назар.
 *      Айнан шу ҳимоя: `yettilik_uyshun` ҳисобига 15
 *      дақиқада 7 тадан кўп уриниш бўлмайди.
 *
 *    · IP бўйича — кенгроқ, бутун идора сиғади. Бу «ҳисоб
 *      номларини теришга» қарши: ҳужумчи битта IP дан
 *      юзлаб ҳар хил логин синаб кўра олмайди.
 *
 *  Ҳар иккаласи ИККИ қатламда текширилади:
 *
 *    1. Хотирада (`rate-limit.ts`) — тез ва базани умуман
 *       безовта қилмайди, аммо serverless нусхалари бўйича
 *       тарқалади (тахминий).
 *    2. Базада (`kirish-chegarasi.ts`) — барча нусхалар учун
 *       УМУМИЙ ва қатъий. Логин ва IP базага хом ҳолда эмас,
 *       фақат хеш кўринишида ёзилади.
 * ============================================================
 */

/** Битта ҲИСОБГА 15 дақиқада нечта уриниш */
const HISOB_CHEGARASI = 7;

/**
 * Битта IP дан 15 дақиқада нечта уриниш.
 *
 * Идорада 10-15 ходим битта чиқишдан фойдаланади ва эрталаб
 * деярли бир вақтда киради. 60 — уларга бемалол етади, аммо
 * логинларни теришга уринишни тўхтатади.
 */
const IP_CHEGARASI = 60;

const OYNA_MS = 15 * 60 * 1000;

/** Чегара калитлари — иккита жойда бир хил ёзилиши учун */
function hisobKaliti(username: string): string {
  return `kirish:hisob:${username.trim().toLowerCase()}`;
}
function ipKaliti(ip: string): string {
  return `kirish:ip:${ip}`;
}

/** 429 жавоби — қанча кутишни ходимга АЙТАМИЗ */
function juda_kop(retryAfter: number, hisobmi: boolean): NextResponse {
  const daqiqa = Math.max(1, Math.ceil(retryAfter / 60));
  return NextResponse.json(
    {
      xabar: hisobmi
        ? `Bu hisobga juda ko‘p urinish bo‘ldi. ${daqiqa} daqiqadan so‘ng qayta urinib ko‘ring yoki administratorga murojaat qiling.`
        : `Juda ko‘p urinish bo‘ldi. ${daqiqa} daqiqadan so‘ng qayta urinib ko‘ring.`,
    },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfter)) } }
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ipChegarasi = checkRateLimit(ipKaliti(ip), IP_CHEGARASI, OYNA_MS);

  if (!ipChegarasi.allowed) return juda_kop(ipChegarasi.retryAfter, false);

  /* Қатъий (умумий) чегара. База жавоб бермаса — хотирадаги натижа кучда қолади. */
  const ipBaza = await bazaChegarasiYumshoq(ipKaliti(ip), IP_CHEGARASI, OYNA_MS);
  if (ipBaza && !ipBaza.allowed) return juda_kop(ipBaza.retryAfter, false);

  let tana: unknown;
  try {
    tana = await request.json();
  } catch {
    return NextResponse.json({ xabar: 'So‘rov noto‘g‘ri' }, { status: 400 });
  }

  const natija = Kirish.safeParse(tana);
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Login va parolni kiriting' },
      { status: 400 }
    );
  }

  const { username, parol } = natija.data;

  /*
   * ── ҲИСОБ БЎЙИЧА ЧЕГАРА ──
   *
   * Логин ЎҚИЛГАНДАН кейин, лекин базага мурожаатдан ОЛДИН.
   *
   * Шундай қилинишининг сабаби: чегарага урилган сўров
   * базани умуман безовта қилмаслиги керак — акс ҳолда
   * ҳужумчи чегарадан ўтолмаса ҳам базани юклайверарди.
   *
   * Ҳисоб мавжудми-йўқми — фарқи йўқ. Мавжуд бўлмаган
   * логинни чегарадан чиқариб қўйсак, жавоб вақти орқали
   * «бундай логин бор» деган хабар оқиб кетарди.
   */
  const hisobChegarasi = checkRateLimit(hisobKaliti(username), HISOB_CHEGARASI, OYNA_MS);
  if (!hisobChegarasi.allowed) return juda_kop(hisobChegarasi.retryAfter, true);
  const hisobBaza = await bazaChegarasiYumshoq(hisobKaliti(username), HISOB_CHEGARASI, OYNA_MS);
  if (hisobBaza && !hisobBaza.allowed) return juda_kop(hisobBaza.retryAfter, true);

  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      fullName: true,
      rol: true,
      mahallaId: true,
      faol: true,
      parolAlmashtirilsin: true,
      sessiyaVersiyasi: true,
    },
  });

  /*
   * Login topilmaganda ham parol tekshiruvi bajarilgandek vaqt ketishi
   * kerak. Aks holda javob tezligi qaysi loginlar mavjudligini oshkor
   * qiladi va hujumchi avval loginlar ro'yxatini yig'ib oladi.
   */
  const soxta = '0'.repeat(32) + ':' + '0'.repeat(128);
  const togri = parolTogrimi(parol, user?.passwordHash ?? soxta);

  if (!user || !togri) {
    return NextResponse.json(
      { xabar: 'Login yoki parol noto‘g‘ri' },
      { status: 401 }
    );
  }

  if (!user.faol) {
    return NextResponse.json(
      { xabar: 'Hisobingiz faol emas. Administratorga murojaat qiling.' },
      { status: 403 }
    );
  }

  const { token, exp } = sessiyaYarat({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    rol: user.rol,
    mahallaId: user.mahallaId,
    /* Сессия авлоди — парол алмашганда эски cookie ўлади */
    v: user.sessiyaVersiyasi,
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(exp),
  });

  /*
   * ── МУВАФФАҚИЯТДАН КЕЙИН ҲИСОБ ТОЗАЛАНАДИ ──
   *
   * Ходим паролни икки марта хато териб, учинчисида тўғри
   * кирса, ўша иккита хато уни кейинроқ бекордан-бекорга
   * блокка тушириб қўймаслиги керак.
   *
   * IP калити ҲАМ тозаланади: битта идорадан навбатма-навбат
   * кирадиган ходимлар бир-бирининг ҳисобини ейишмасин.
   */
  resetRateLimit(hisobKaliti(username));
  resetRateLimit(ipKaliti(ip));
  await bazaChegarasiniTozala(hisobKaliti(username), ipKaliti(ip)).catch((e) =>
    console.error('Kirish chegarasini tozalab bo‘lmadi:', e instanceof Error ? e.name : 'xato')
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { oxirgiKirish: new Date() },
  });
  await jurnal(user.id, 'KIRISH');

  return NextResponse.json({
    ok: true,
    rol: user.rol,
    fullName: user.fullName,
    parolAlmashtirilsin: user.parolAlmashtirilsin,
  });
}
