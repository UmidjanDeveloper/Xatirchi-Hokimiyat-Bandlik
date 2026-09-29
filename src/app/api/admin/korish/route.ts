import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, sessiyaYarat } from '@/lib/auth';
import { jurnal, ruxsatYoq, sorovSessiyasi, taqiqlangan } from '@/lib/api-auth';

/**
 * ============================================================
 *  КЎРИШ РЕЖИМИНИ ЁҚИШ ва ЎЧИРИШ
 *
 *  ── Нега алоҳида йўл ва нега `talabQil()` эмас ──
 *
 *  Бу йўл кўриш режимидан ЧИҚАРАДИ ҳам. Агар у оддий
 *  қоровулдан ўтса, кўриш режимида ЁЗИШ тўсилгани учун
 *  одам режим ичида қулфланиб қоларди.
 *
 *  Шунинг учун сессия шу ернинг ўзида текширилади ва
 *  текширув ҲАҚИҚИЙ ҳисоб бўйича кетади: `sessiya.userId`
 *  ҳар доим администраторники, «кўз» уни ўзгартирмайди.
 *
 *  ── Ким қила олади ──
 *
 *  Фақат ADMIN. Рол cookie'дан эмас, БАЗАДАН ўқилади:
 *  администраторлик олиб қўйилган бўлса, кўз режими ҳам
 *  шу заҳоти ёпилади.
 *
 *  ── Журнал ──
 *
 *  Ёқиш ҳам, ўчириш ҳам ёзиб қўйилади. «Фалон ходимнинг
 *  маълумотини ким кўрди» деган саволга жавоб бўлиши шарт:
 *  бу ерда оилаларнинг даромади ва соғлиғи турибди.
 * ============================================================
 */

const Tana = z.object({ userId: z.string().cuid() });

/** Ҳақиқий ҳисобни текширади — «кўз» унга таъсир қилмайди */
async function administrator() {
  const sessiya = sorovSessiyasi();
  if (!sessiya) return { xato: ruxsatYoq() } as const;

  const user = await prisma.user.findUnique({
    where: { id: sessiya.userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      rol: true,
      mahallaId: true,
      faol: true,
      sessiyaVersiyasi: true,
      parolAlmashtirilsin: true,
    },
  });

  if (!user || !user.faol) return { xato: ruxsatYoq('Hisobingiz faol emas.') } as const;
  if (sessiya.v !== undefined && sessiya.v !== user.sessiyaVersiyasi) {
    return { xato: ruxsatYoq('Паролингиз алмашган. Қайта киринг.') } as const;
  }
  if (user.rol !== 'ADMIN') return { xato: taqiqlangan() } as const;

  /*
   * ── БОШЛАНҒИЧ ПАРОЛ ЧЕТЛАБ ЎТИЛМАСИН ──
   *
   * Кўриш режимида парол экрани чиқмайди (бошқа одамнинг
   * паролини қўйиб бўлмайди). Яъни бу текширув бўлмаса,
   * администратор «кўз» ни ёқиб, мажбурий парол
   * алмаштиришдан қутулиб қоларди — ва администратор
   * берган бошланғич парол рўйхатда очиқ тураверарди.
   */
  if (user.parolAlmashtirilsin) {
    return {
      xato: NextResponse.json(
        { xabar: 'Аввал паролингизни алмаштиринг', parolAlmashtirilsin: true },
        { status: 403 }
      ),
    } as const;
  }

  return { user } as const;
}

/** Янги cookie ёзади — «кўз» билан ёки «кўз» сиз */
function cookieYoz(
  user: { id: string; username: string; fullName: string; mahallaId: string | null },
  versiya: number,
  koz?: string
) {
  const { token, exp } = sessiyaYarat({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    rol: 'ADMIN',
    mahallaId: user.mahallaId,
    v: versiya,
    ...(koz ? { koz } : {}),
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(exp),
  });
}

// ─────────────────────────────────────────────────────────────
//  ЁҚИШ
// ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const q = await administrator();
  if ('xato' in q) return q.xato;

  const xom = await request.json().catch(() => null);
  const natija = Tana.safeParse(xom);
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Xodim tanlanmagan' }, { status: 400 });
  }

  const { userId } = natija.data;
  if (userId === q.user.id) {
    return NextResponse.json(
      { xabar: 'O‘z hisobingizni ko‘rish uchun rejim kerak emas' },
      { status: 400 }
    );
  }

  const nishon = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, username: true, rol: true, faol: true },
  });

  if (!nishon) return NextResponse.json({ xabar: 'Xodim topilmadi' }, { status: 404 });
  if (!nishon.faol) {
    return NextResponse.json(
      { xabar: 'Bu hisob faol emas — uning paneli ham ochilmaydi' },
      { status: 400 }
    );
  }

  cookieYoz(q.user, q.user.sessiyaVersiyasi, nishon.id);

  await jurnal(q.user.id, 'KORISH', {
    obyektTuri: 'User',
    obyektId: nishon.id,
    izoh: `Ko‘rish rejimi yoqildi: ${nishon.fullName} (${nishon.username})`,
  });

  return NextResponse.json({
    ok: true,
    nishon: { id: nishon.id, fullName: nishon.fullName, rol: nishon.rol },
  });
}

// ─────────────────────────────────────────────────────────────
//  ЎЧИРИШ — ЎЗ ҲИСОБИГА ҚАЙТИШ
// ─────────────────────────────────────────────────────────────

export async function DELETE() {
  const q = await administrator();
  if ('xato' in q) return q.xato;

  const oldingi = sorovSessiyasi()?.koz ?? null;
  cookieYoz(q.user, q.user.sessiyaVersiyasi);

  if (oldingi) {
    await jurnal(q.user.id, 'KORISH', {
      obyektTuri: 'User',
      obyektId: oldingi,
      izoh: 'Ko‘rish rejimi o‘chirildi',
    });
  }

  return NextResponse.json({ ok: true });
}
