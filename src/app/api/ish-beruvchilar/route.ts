import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jurnal, sorovIp, talabQil } from '@/lib/api-auth';
import { ishOrniXabarlari } from '@/lib/ish-orni-xabari';
import { navbatniDarhol } from '@/lib/xabarnoma';
import {
  beruvchiQaroriMatni,
  beruvchigaXabarBer,
  beruvchiniHalQil,
  elonQaroriMatni,
  elonniHalQil,
} from '@/lib/ish-beruvchi';

/**
 * ============================================================
 *  МОДЕРАЦИЯ — САЙТ ОРҚАЛИ
 *
 *  ── Нега бот етарли эмас ──
 *
 *  Модерация аввал ФАҚАТ ботда эди. Бу ишламайди: бугун 78
 *  та ходимдан 70 таси ботга уланмаган, ва бандлик раҳбари
 *  ҳам уланмаган бўлиши мумкин.
 *
 *  Ўшанда занжир ЎЗ БОШИДА тўхтайди: иш берувчи ариза
 *  юборади, ариза навбатда туради, ва уни тасдиқлайдиган
 *  йўл умуман йўқ. Иш берувчи эса жавоб келмаганини кўриб,
 *  иккинчи марта уринмайди.
 *
 *  Энди иккита йўл бор ва иккови ҲАР ХИЛ эмас: қарор битта
 *  функциядан ўтади, хабар матни ҳам битта жойда ёзилган.
 * ============================================================
 */

export const dynamic = 'force-dynamic';

const Qaror = z.object({
  turi: z.enum(['beruvchi', 'elon']),
  id: z.string().min(1),
  qabul: z.boolean(),
  sabab: z.string().max(500).nullish(),
});

/**
 * «Аллақачон ҳал қилинган» хабарини ОДАМЧА ёзади.
 *
 * Иккинчи раҳбарга «хато» эмас, ТУШУНТИРИШ керак: ким,
 * қандай қарор берган. Акс ҳолда у тугмани яна босаверади
 * ва нима бўлаётганини тушунмайди.
 */
function ziddiyatXabari(holati?: string, kim?: string | null): string {
  /* Ish beruvchi e'lonni ko'rib chiqishdan oldin o'zi yopib qo'ygan */
  if (holati === 'YOPILGAN') {
    return 'Ish beruvchi bu e‘lonni o‘zi yopib qo‘ygan. Ro‘yxatni yangilang.';
  }
  const qaror =
    holati === 'TASDIQLANDI'
      ? 'tasdiqlagan'
      : holati === 'RAD_ETILDI'
        ? 'rad etgan'
        : 'hal qilgan';
  return kim
    ? `Buni ${kim} allaqachon ${qaror}. Ro‘yxatni yangilang.`
    : `Bu allaqachon ${qaror.replace('gan', 'gan')}. Ro‘yxatni yangilang.`;
}

export async function PATCH(request: Request) {
  /*
   * Фақат бандлик раҳбари ва администратор.
   *
   * Тасдиқлаш 70 та маҳалла ходимига хабар юборади ва туман
   * ҳисоботига янги эълон қўшади — бу ҳоким ҳам қиладиган
   * иш эмас, бандлик марказининг вазифаси.
   */
  const q = await talabQil(['BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const xom = Qaror.safeParse(await request.json().catch(() => null));
  if (!xom.success) {
    return NextResponse.json({ ok: false, xabar: 'Maʼlumot notoʻgʻri' }, { status: 400 });
  }
  const { turi, id, qabul, sabab } = xom.data;

  /* ── ИШ БЕРУВЧИ ── */
  if (turi === 'beruvchi') {
    const n = await beruvchiniHalQil({
      beruvchiId: id,
      userId: q.sessiya.userId,
      qabul,
      sabab,
      /* Аудит ёзуви қарор билан БИР транзакцияда ёзилади (`ish-beruvchi.ts`) */
      ip: sorovIp(),
    });
    if (!n.ok) {
      /*
       * Бошқа раҳбар улгурган. Умумий «аллақачон ҳал
       * қилинган» ўрнига КИМ ва ҚАНДАЙ ҳал қилганини
       * айтамиз — акс ҳолда иккинчи раҳбар нима
       * бўлганини тушунмай, яна босиб кўраверарди.
       */
      return NextResponse.json(
        {
          ok: false,
          xabar:
            n.sabab === 'topilmadi'
              ? 'Ariza topilmadi'
              : ziddiyatXabari(n.hozirgiHolati, n.halQilgan),
          ziddiyat: n.sabab === 'allaqachon',
          hozirgiHolati: n.hozirgiHolati ?? null,
          halQilgan: n.halQilgan ?? null,
        },
        { status: n.sabab === 'topilmadi' ? 404 : 409 }
      );
    }

    /*
     * Хабар навбатга қўйилмайди — иш берувчи `User` эмас ва
     * навбат уни ташиёлмайди. Тўғридан-тўғри юборилади.
     *
     * Юборилмаса ҳам қарор кучда қолади: иш берувчи ботни
     * очганда меню унга жорий ҳолатни барибир айтади.
     */
    await beruvchigaXabarBer(
      n.chatId,
      beruvchiQaroriMatni({ qabul, korxonaNomi: n.korxonaNomi ?? '—', sabab })
    );

    return NextResponse.json({ ok: true });
  }

  /* ── ЭЪЛОН ── */
  const n = await elonniHalQil({ vacancyId: id, userId: q.sessiya.userId, qabul, sabab, ip: sorovIp() });
  if (!n.ok) {
    return NextResponse.json(
      {
        ok: false,
        xabar:
          n.sabab === 'topilmadi'
            ? 'E’lon topilmadi'
            : ziddiyatXabari(n.hozirgiHolati, n.halQilgan),
        ziddiyat: n.sabab === 'allaqachon',
        hozirgiHolati: n.hozirgiHolati ?? null,
        halQilgan: n.halQilgan ?? null,
      },
      { status: n.sabab === 'topilmadi' ? 404 : 409 }
    );
  }

  let kimga = 0;
  if (qabul) {
    /*
     * Тарқатиш АЛОҲИДА: хато бўлса ҳам эълон тасдиқланган
     * бўлиб қолиши керак — раҳбарнинг қарори бажарилди.
     */
    try {
      kimga = await ishOrniXabarlari(id);
      await navbatniDarhol();
    } catch (e) {
      console.error('Elon xabarlarini tarqatib bolmadi:', e);
    }
  }

  await beruvchigaXabarBer(n.chatId, elonQaroriMatni({ qabul, lavozim: n.lavozim ?? '—' }));

  /*
   * Қарорнинг аудити `elonniHalQil` ичида, қарор билан БИР транзакцияда
   * ёзилди. Бу ерда фақат тарқатиш натижаси (қанча хабар навбатга
   * қўйилгани) ёзилади — у қарордан кейин маълум бўлади.
   */
  if (qabul) {
    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'Vacancy',
      obyektId: id,
      izoh: `Эълон хабарлари навбатга қўйилди — ${kimga} та ходим`,
    });
  }

  return NextResponse.json({ ok: true, kimga });
}
