/**
 * ============================================================
 *  API YO'LLARI UCHUN HUQUQ TEKSHIRUVI
 *
 *  Har bir himoyalangan yo'l shu yerdagi qo'riqchidan boshlanadi.
 *  Tekshiruvni har faylda qo'lda yozish o'rniga bitta joyga
 *  yig'ish ataylab qilingan: bitta yo'lda unutilsa, butun
 *  tumandagi oilalar ma'lumoti ochilib qolardi.
 * ============================================================
 */

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Rol } from '@prisma/client';
import { SESSION_COOKIE, avlodYaroqlimi, sessiyaOqi, type Sessiya } from './auth';
import { USUL_SARLAVHASI, ozgartirishmi } from './korish-rejimi';
import { prisma } from './prisma';

export interface Qoriqchi {
  sessiya: Sessiya;
  /**
   * Кўриш режимида — қайси ходимнинг кўзи билан қаралаяпти.
   *
   * Бу режимда ёзиш амаллари умуман ўтмайди, шунинг учун
   * кўпчилик йўл буни умуман билиши шарт эмас. Фақат ўқиш
   * учун — масалан жавобда «кўриш режими» деб белгилаш
   * керак бўлса.
   */
  korish?: { nishonId: string };
}

/** Sessiyani o'qiydi; yaroqsiz bo'lsa `null` */
export function sorovSessiyasi(): Sessiya | null {
  return sessiyaOqi(cookies().get(SESSION_COOKIE)?.value);
}

/** 401 javobi */
export function ruxsatYoq(xabar = 'Ruxsat yo‘q. Tizimga qayta kiring.') {
  return NextResponse.json({ xabar }, { status: 401 });
}

/** 403 javobi */
export function taqiqlangan(xabar = 'Bu amal uchun huquqingiz yetarli emas.') {
  return NextResponse.json({ xabar }, { status: 403 });
}

/**
 * Sessiyani talab qiladi va ixtiyoriy ravishda rolni tekshiradi.
 *
 * Ishlatilishi:
 *   const q = await talabQil(['BANDLIK', 'ADMIN']);
 *   if (q instanceof NextResponse) return q;
 *   // bu yerdan keyin q.sessiya ishonchli
 */
export async function talabQil(
  rollar?: Rol[],
  /**
   * ── НЕГА ОЧИҚ КАЛИТ, СЎРОВ ЙЎЛИ ЭМАС ──
   *
   * Аввал йўл `x-invoke-path` ёки `referer` дан аниқланарди.
   * Иккови ҳам ИШОНЧСИЗ: биринчиси Next'нинг ички майдони ва
   * версиядан версияга ўзгаради, иккинчисини браузер умуман
   * юбормаслиги мумкин.
   *
   * Истисно — БИР МАРТА, ва у чақирадиган йўлнинг ўзида
   * ёзилган. Ўқиганда кўринади, унутилса эса тўсилади.
   */
  sozlama?: {
    parolsizHam?: boolean;
    /**
     * Кўриш режимида ҲАМ ўтадиган, лекин ЁЗМАЙДИГАН йўл (Коала ва
     * JARVIS билан савол-жавоб). Калит фақат шу йўлларнинг ўзида
     * ёзилади ва миддлеварнинг `KORISH_OQISH_POSTLARI` рўйхати билан
     * бирга ишлайди: иккови ҳам келишмаса, ёзиш тўсилаверади.
     */
    korishdaOqish?: boolean;
  }
): Promise<Qoriqchi | NextResponse> {
  const sessiya = sorovSessiyasi();
  if (!sessiya) return ruxsatYoq();

  // Sessiya cookie'si 12 soat yashaydi. Shu vaqt ichida xodim ishdan
  // bo'shatilishi yoki roli o'zgarishi mumkin, shuning uchun bazadagi
  // holat har so'rovda tekshiriladi - faqat cookie'ga ishonish kifoya emas.
  const user = await prisma.user.findUnique({
    where: { id: sessiya.userId },
    select: {
      faol: true,
      rol: true,
      mahallaId: true,
      sessiyaVersiyasi: true,
      parolAlmashtirilsin: true,
    },
  });

  if (!user || !user.faol) {
    return ruxsatYoq('Hisobingiz faol emas. Administratorga murojaat qiling.');
  }

  /*
   * ── СЕССИЯ АВЛОДИ ──
   *
   * Парол алмашганда базадаги рақам ошади ва эски cookie
   * яроқсиз бўлади.
   *
   * Авлоди ЙЎҚ эски cookie ҳам рад этилади (`avlodYaroqlimi`):
   * сессия 12 соат яшайди, авлод эса ундан анча олдин жорий
   * қилинган — яроқли эски cookie қолмаган. Ўтказиб юбориш
   * фақат тешик бўларди: парол алмашганда ўлмайдиган сессия.
   */
  if (!avlodYaroqlimi(sessiya.v, user.sessiyaVersiyasi)) {
    return ruxsatYoq('Паролингиз алмашган. Қайта киринг.');
  }

  /*
   * ── МАЖБУРИЙ ПАРОЛ АЛМАШТИРИШ — API ДАРАЖАСИДА ҲАМ ──
   *
   * Аввал бу талаб фақат САҲИФАДА амал қиларди: қобиқ
   * `/parol-almashtirish` га йўналтирарди.
   *
   * Аммо API'ни саҳифасиз ҳам чақириш мумкин. Яъни
   * администратор берган бошланғич парол билан кирган одам
   * уни алмаштирмасдан туриб хатлов юбора оларди — ва ўша
   * парол ҳамон администраторнинг рўйхатида очиқ турарди.
   *
   * Иккита йўл истисно: паролнинг ўзини алмаштириш ва
   * чиқиш. Улар бўлмаса, одам қулф ичида қолиб кетарди.
   */
  if (user.parolAlmashtirilsin && !sozlama?.parolsizHam) {
    return NextResponse.json(
      { xabar: 'Аввал паролингизни алмаштиринг', parolAlmashtirilsin: true },
      { status: 403 }
    );
  }

  /*
   * ── КЎРИШ РЕЖИМИ ──
   *
   * Cookie'даги «кўз» — администратор бошқа ходимнинг кўзи
   * билан қараяпти дегани (`korish-rejimi.ts`).
   *
   * Бу ерда ИККИ иш қилинади:
   *
   *  1. ЁЗИШ ТЎСИЛАДИ. Акс ҳолда амал ходимнинг номидан
   *     журналга тушар ва «буни ким қилди» деган саволга
   *     ёлғон жавоб қоларди. Миддлевар ҳам шуни қилади —
   *     бу иккинчи қават: бирон йўл ўзгариб, миддлевар
   *     четлаб ўтилса ҳам тўсиқ жойида қолади.
   *
   *  2. РЎЙХАТЛАР ЎША ХОДИМНИКИ бўлади: рол ва маҳалла
   *     нишондан олинади. Шунда администратор МФЙ ходими
   *     нимани кўришини айнан кўради.
   */
  const koz = sessiya.koz;
  let korish: { nishonId: string } | undefined;
  let rol = user.rol;
  let mahallaId = user.mahallaId;

  if (koz && koz !== sessiya.userId && user.rol === 'ADMIN') {
    const usul = headers().get(USUL_SARLAVHASI);
    if (ozgartirishmi(usul) && !sozlama?.korishdaOqish) {
      return NextResponse.json(
        {
          xabar: 'Ko‘rish rejimida o‘zgartirish mumkin emas. Avval o‘z hisobingizga qayting.',
          korish: true,
        },
        { status: 403 }
      );
    }

    const nishon = await prisma.user.findUnique({
      where: { id: koz },
      select: { id: true, rol: true, mahallaId: true, faol: true },
    });
    if (nishon && nishon.faol) {
      korish = { nishonId: nishon.id };
      rol = nishon.rol;
      mahallaId = nishon.mahallaId;
    }
  }

  const joriy: Sessiya = { ...sessiya, rol, mahallaId };

  if (rollar && !rollar.includes(rol)) return taqiqlangan();

  return { sessiya: joriy, ...(korish ? { korish } : {}) };
}

/** So'rov yuborgan qurilmaning IP manzili - audit jurnali uchun */
export function sorovIp(): string | null {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
}

/**
 * Audit jurnaliga yozadi.
 *
 * Xatolik butun amalni to'xtatmasligi kerak: jurnal yozilmagani
 * yomon, lekin xodimning xatlovi yo'qolgani bundan battar.
 */
export async function jurnal(
  userId: string,
  amal: string,
  qoshimcha?: { obyektTuri?: string; obyektId?: string; izoh?: string }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        amal,
        obyektTuri: qoshimcha?.obyektTuri,
        obyektId: qoshimcha?.obyektId,
        izoh: qoshimcha?.izoh,
        ip: sorovIp(),
      },
    });
  } catch (e) {
    console.error('Audit jurnaliga yozib bo‘lmadi:', e);
  }
}
