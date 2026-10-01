import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/sessiya-nomi';
import {
  USUL_SARLAVHASI,
  istisnomi,
  kozniOqi,
  ozgartirishmi,
} from '@/lib/korish-rejimi';

/**
 * ============================================================
 *  YO'L QO'RIQCHISI
 *
 *  Butun sayt login ortida - ochiq sahifa yo'q. Kelajak Egasi'da
 *  anketa loginsiz ochiq edi (o'quvchi o'zi to'ldirardi), bu yerda
 *  esa har bir sahifa oila daromadi va sog'liq holatini ko'rsatadi.
 *
 *  Middleware faqat cookie BORLIGINI tekshiradi, imzosini emas:
 *  Edge muhitida Node'ning `crypto.timingSafeEqual` funksiyasi
 *  yo'q. To'liq tekshiruv sahifa va API ichida `talabQil()` orqali
 *  amalga oshiriladi - u yerda baza ham tekshiriladi (xodim
 *  ishdan bo'shatilgan bo'lishi mumkin).
 *
 *  Ya'ni bu qatlam himoya emas, YO'NALTIRUVCHI: sessiyasi yo'q
 *  odamni bo'sh sahifa o'rniga login sahifasiga olib boradi.
 * ============================================================
 */

/**
 * Sessiyasiz ochiladigan yo'llar.
 *
 * ── Telegram yo'llari nega bu yerda ──
 *
 * Telegram serverida bizning cookie yo'q va bo'lishi ham
 * mumkin emas. Shuning uchun webhook sessiya bilan
 * himoyalanmaydi - u TELEGRAM NING O'Z mexanizmi bilan
 * himoyalanadi: `secret_token` sarlavhada qaytadi va route
 * ichida tekshiriladi.
 *
 * Xuddi shunday, Vercel Cron ham cookie yubormaydi: u
 * `CRON_SECRET` bilan kiradi va bu ham route ichida
 * tekshiriladi.
 *
 * Ikkovi ham shu yerga qo'shilmasa, middleware ularni
 * login sahifasiga yo'naltirardi va integratsiya JIMGINA
 * ishlamasdi: Telegram 200 olardi, xabar esa kelmasdi.
 */
const OCHIQ = [
  '/kirish',
  '/api/auth/kirish',
  '/api/telegram/webhook',
  '/api/telegram/navbat',
  /*
   * ── CRON ЙЎЛЛАРИ ──
   *
   * Vercel Cron cookie ЮБОРМАЙДИ. Шунинг учун бу йўл рўйхатда
   * бўлмаса, миддлевар уни 401 билан қайтаради — ва жадвал
   * ҳеч қачон ишламайди.
   *
   * Айнан шу юз берди: эрталабки брифинг ёзилди, синовдан
   * ўтди, деплой бўлди — ва продукцияда бирон марта
   * жўнамади. Хато ҳеч қаерда кўринмади: Vercel 401 ни
   * «чақирилди» деб белгилайди, лог эса ҳеч ким қарамайдиган
   * жойда қолди.
   *
   * Йўлнинг ЎЗИ `CRON_SECRET` ни талаб қилади ва сир йўқ
   * бўлса рад этади — яъни бу ерга қўшиш тешик очмайди.
   * `navbat` аллақачон шу сабабдан рўйхатда турибди.
   */
  '/api/cron',
];

/**
 * Faqat AYNAN shu manzil bilan ochiladigan yo'llar — prefiks emas.
 *
 * ── IDROK statistikasi ──
 *
 * IDROK (hokimiyatning AI yordamchisi) serverida bizning cookie
 * yo'q, shuning uchun bu yo'l ham Telegram va Cron kabi sessiyasiz
 * o'tadi. Yo'lning O'ZI `X-IDROK-Key` sarlavhasini tekshiradi,
 * `IDROK_API_KEY` qo'yilmagan bo'lsa esa 404 qaytaradi — ya'ni
 * bu yerga qo'shish tuynuk ochmaydi.
 *
 * `OCHIQ` ro'yxatiga ATAYLAB qo'yilmadi: u yerda prefiks ham
 * o'tadi (`/api/cron/...`). Bu yerda esa `/api/idrok/stats/x`,
 * `/api/idrok` yoki `/api/idrok/statsx` kabi qo'shni yo'llar
 * odatdagidek sessiya talab qiladi.
 */
const ANIQ_OCHIQ = new Set(['/api/idrok/stats']);

/**
 * Salomatlik tekshiruvi (tashqi monitoring: UptimeRobot va h.k.).
 *
 * Sessiyasiz ochiladi, lekin AYNAN shu ikki manzil: `/api/health/x`,
 * `/api/healthz` kabi qo'shnilar odatdagidek sessiya talab qiladi.
 * Javob qo'pol (ok/degraded), tafsilot chiqmaydi — `src/lib/salomatlik.ts`.
 */
const SALOMATLIK_YOLLARI = new Set(['/api/health', '/api/health/readiness']);

/**
 * Сўров усулини ичкарига олиб кирадиган жавоб.
 *
 * Next'нинг сервер компонентларида ҳам, `talabQil()` да ҳам
 * сўровнинг ЎЗИ йўқ — фақат сарлавҳалар бор. Шунинг учун
 * усулни миддлевар сарлавҳага ёзиб беради.
 *
 * Мижоз ўша номдаги сарлавҳани юборса ҳам зарари йўқ: биз
 * уни ҲАР САФАР устидан ёзамиз.
 */
function otkaz(req: NextRequest): NextResponse {
  const sarlavhalar = new Headers(req.headers);
  sarlavhalar.set(USUL_SARLAVHASI, req.method);
  return NextResponse.next({ request: { headers: sarlavhalar } });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ANIQ_OCHIQ.has(pathname)) {
    return otkaz(req);
  }

  if (SALOMATLIK_YOLLARI.has(pathname)) {
    return otkaz(req);
  }

  if (OCHIQ.some((y) => pathname === y || pathname.startsWith(`${y}/`))) {
    return otkaz(req);
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const bor = Boolean(token);

  if (bor) {
    /*
     * ── КЎРИШ РЕЖИМИ ЁЗИШГА ЙЎЛ ҚЎЙМАЙДИ ──
     *
     * Администратор «ходимнинг кўзи билан» қараб турганда
     * ҳар қандай ўзгартириш ЎША ХОДИМНИНГ номидан
     * ёзиларди — журналда бегона исм қоларди.
     *
     * Тўсиқ шу ерда, йўлнинг оғзида: бирон йўл
     * `talabQil()` ни чақиришни унутган бўлса ҳам, ёзиш
     * бу ердан ўтмайди.
     *
     * Иккита истисно `korish-rejimi.ts` да ёзилган: кўз
     * режимидан чиқиш ва тизимдан чиқиш.
     */
    if (
      pathname.startsWith('/api/') &&
      ozgartirishmi(req.method) &&
      !istisnomi(pathname) &&
      kozniOqi(token)
    ) {
      return NextResponse.json(
        {
          xabar:
            'Ko‘rish rejimida o‘zgartirish mumkin emas. Avval o‘z hisobingizga qayting.',
          korish: true,
        },
        { status: 403 }
      );
    }
    return otkaz(req);
  }

  // API so'rovlari yo'naltirilmaydi - ular JSON kutadi
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { xabar: 'Ruxsat yo‘q. Tizimga qayta kiring.' },
      { status: 401 }
    );
  }

  const kirish = new URL('/kirish', req.url);
  // Kirgandan keyin xodim so'ragan sahifaga qaytarish uchun
  if (pathname !== '/') kirish.searchParams.set('keyin', pathname);
  return NextResponse.redirect(kirish);
}

export const config = {
  matcher: [
    /*
     * Statik fayllar va rasmlardan tashqari hamma narsa.
     * `manifest.json`, `sw.js` va `favicon` ham tashqarida - ular
     * login sahifasida ham kerak bo'ladi.
     *
     * `oflayn.html` - service worker uni INSTALL paytida oladi.
     * Qo'riqchidan o'tsa, cookie'siz so'rov login sahifasiga
     * yo'naltirilardi va kesh oflayn sahifa o'rniga LOGIN
     * sahifasini saqlab qo'yardi.
     *
     * `shrift/` - PDF hisoboti uchun shriftlar. Ular maxfiy emas
     * va qo'riqchidan o'tkazilsa, ortiqcha yo'naltirish sodir
     * bo'lib, jsPDF shrift o'rniga HTML sahifani oladi.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|oflayn.html|ikonka/|icons/|shrift/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|ttf|woff|woff2)$).*)',
  ],
};
