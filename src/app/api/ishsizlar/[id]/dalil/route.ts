import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { dalilQoshish, dalilniHalQil } from '@/lib/joylashuv-dalili';
import { joriyJoylashish } from '@/lib/joylashish';

/**
 * ============================================================
 *  ҚЎЛДА КИРИТИЛАДИГАН ДАЛИЛ
 *
 *  Реестр кўчирмаси ойда бир марта келади, фуқаро эса бугун
 *  ишга кирган бўлиши мумкин. Шартнома нусхаси ёки иш
 *  берувчининг тасдиғи — шу оралиқни тўлдиради.
 *
 *  ── Нега қўлда киритилган далил ДАРҲОЛ тасдиқланмайди ──
 *
 *  Уни ЎША одам киритади — маҳалла ходими ёки мутахассис.
 *  Ўзи ёзиб, ўзи тасдиқласа, текширувнинг маъноси қолмайди:
 *  рақам яна битта босиш билан ошаверарди.
 *
 *  Шунинг учун қўлда киритилган далил «текширилмаган» бўлиб
 *  туради ва уни БОШҚА одам — бандлик маркази — тасдиқлайди.
 * ============================================================
 */

export const dynamic = 'force-dynamic';

const Yangi = z.object({
  turi: z.enum(['SHARTNOMA', 'BUYRUQ', 'ISH_BERUVCHI', 'MAHALLA']),
  izoh: z.string().max(500).nullish(),
  /**
   * Далил НИМАНИ исботлайди.
   *
   * Шартнома нусхаси одам ишга КИРГАНИНИ кўрсатади; у бир
   * ойдан кейин ишдан чиққан бўлиши ҳам мумкин. «Ҳамон
   * ишлаяпти» — БОШҚА савол ва унга бошқа далил керак.
   */
  maqsadi: z.enum(['ISH_BOSHLAGANI', 'HOZIR_ISHLAYOTGANI']).nullish(),
  /** Ҳужжатнинг ЎЗИДАГИ сана — киритилган сана эмас */
  hujjatSanasi: z.coerce.date().nullish(),
  /** Ҳужжатни берган ташкилот */
  manbaTashkilot: z.string().max(300).nullish(),
});

const HalQilish = z.object({
  dalilId: z.string().min(1),
  tasdiqlandi: z.boolean(),
  izoh: z.string().max(500).nullish(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const xom = Yangi.safeParse(await request.json().catch(() => null));
  if (!xom.success) {
    return NextResponse.json({ ok: false, xabar: 'Maʼlumot notoʻgʻri' }, { status: 400 });
  }

  const odam = await prisma.unemployedPerson.findUnique({
    where: { id: params.id },
    select: { id: true, mahallaId: true, holati: true },
  });
  if (!odam) {
    return NextResponse.json({ ok: false, xabar: 'Fuqaro topilmadi' }, { status: 404 });
  }

  /*
   * ── МАҲАЛЛА ИЗОЛЯЦИЯСИ ──
   *
   * Маҳалла ходими фақат ўз МФЙ сидаги фуқарога далил
   * қўшади. Бу қоида сайтнинг ҳамма жойида амал қилади ва
   * янги йўл уни бузмаслиги керак.
   */
  if (q.sessiya.rol === 'YETTILIK') {
    const xodim = await prisma.user.findUnique({
      where: { id: q.sessiya.userId },
      select: { mahallaId: true },
    });
    if (!xodim?.mahallaId || xodim.mahallaId !== odam.mahallaId) {
      return NextResponse.json({ ok: false, xabar: 'Bu fuqaro sizning MFY ingizda emas' }, { status: 403 });
    }
  }

  if (odam.holati !== 'JOYLASHTIRILDI' && odam.holati !== 'TASDIQLANDI') {
    return NextResponse.json(
      { ok: false, xabar: 'Fuqaro hali ishga joylashtirilmagan' },
      { status: 400 }
    );
  }

  /*
   * ── ҚАЙСИ ИШГА ТЕГИШЛИ ──
   *
   * Далил одамнинг ОЧИҚ ишига боғланади. Аввал ҳеч қаерга
   * боғланмасди — ва одам иш алмаштирса, эски ишнинг
   * шартномаси ЯНГИ ишни ҳам тасдиқлаб турарди.
   *
   * Очиқ иш топилмаса, `null` қолади ва далил «боғланиши
   * керак» рўйхатига тушади. Тахмин қилиб боғламаймиз.
   */
  const joriyIsh = await joriyJoylashish(odam.id);

  const dalil = await dalilQoshish({
    ishsizId: odam.id,
    turi: xom.data.turi,
    joylashishId: joriyIsh?.id ?? null,
    /*
     * Манба ТУРДАН келиб чиқади ва бу йўл уни ЎЗГАРТИРА
     * ОЛМАЙДИ: тасдиқлаш қарори `dalil-ishonchi.ts` да,
     * битта жойда. Қўлда киритилган ҳужжатни БОШҚА одам
     * текширади.
     */
    manbaTuri: xom.data.turi === 'MAHALLA' ? 'XODIM_BILDIRDI' : 'QOLDA_HUJJAT',
    maqsadi: xom.data.maqsadi ?? 'ISH_BOSHLAGANI',
    hujjatSanasi: xom.data.hujjatSanasi ?? null,
    manbaTashkilot: xom.data.manbaTashkilot ?? null,
    izoh: xom.data.izoh ?? null,
    kiritganId: q.sessiya.userId,
  });

  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'JoylashuvDalili',
    obyektId: dalil.id,
    izoh: `Далил киритилди: ${xom.data.turi}`,
  });

  return NextResponse.json({ ok: true, id: dalil.id });
}

/** Мутахассис далилни текширди */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  /*
   * Тасдиқлашни МАҲАЛЛА ХОДИМИ қила олмайди: у далилни ўзи
   * киритади, ва ўзи тасдиқласа текширувнинг маъноси
   * қолмайди.
   */
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const xom = HalQilish.safeParse(await request.json().catch(() => null));
  if (!xom.success) {
    return NextResponse.json({ ok: false, xabar: 'Maʼlumot notoʻgʻri' }, { status: 400 });
  }

  const dalil = await prisma.joylashuvDalili.findUnique({
    where: { id: xom.data.dalilId },
    select: { ishsizId: true, kiritganId: true },
  });
  if (!dalil || dalil.ishsizId !== params.id) {
    return NextResponse.json({ ok: false, xabar: 'Dalil topilmadi' }, { status: 404 });
  }

  /*
   * Ўзи киритган далилни ўзи тасдиқлай олмайди.
   *
   * Администратор ҳам истисно эмас: қоида техник эмас,
   * ТАШКИЛИЙ — иккита одам кўрган рақам биттаси кўрганидан
   * ишончлироқ.
   */
  if (dalil.kiritganId && dalil.kiritganId === q.sessiya.userId) {
    return NextResponse.json(
      { ok: false, xabar: 'Oʻzingiz kiritgan dalilni oʻzingiz tasdiqlay olmaysiz' },
      { status: 403 }
    );
  }

  const natija = await dalilniHalQil({
    dalilId: xom.data.dalilId,
    userId: q.sessiya.userId,
    tasdiqlandi: xom.data.tasdiqlandi,
    izoh: xom.data.izoh ?? undefined,
  });
  if (!natija.ok) {
    if (natija.sabab === 'topilmadi') {
      return NextResponse.json({ ok: false, xabar: 'Dalil topilmadi' }, { status: 404 });
    }
    /*
     * Далил аллақачон текширилган. Аввал бу ҳол УМУМАН
     * текширилмасди: кейинги босиш тасдиқланган далилни
     * жимгина рад этилганга айлантирарди ва биринчи
     * қарорнинг изи қолмасди.
     *
     * Икки мутахассис навбат рўйхатини бир вақтда очиб
     * турса, бу тасодифан ҳам содир бўларди.
     */
    return NextResponse.json(
      {
        ok: false,
        xabar: natija.halQilgan
          ? `Bu dalilni ${natija.halQilgan} allaqachon ko‘rib chiqqan. Ro‘yxatni yangilang.`
          : 'Bu dalil allaqachon ko‘rib chiqilgan. Ro‘yxatni yangilang.',
        ziddiyat: true,
        hozirgiHolati: natija.hozirgiHolati ?? null,
        halQilgan: natija.halQilgan ?? null,
      },
      { status: 409 }
    );
  }

  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'JoylashuvDalili',
    obyektId: xom.data.dalilId,
    izoh: xom.data.tasdiqlandi ? 'Далил тасдиқланди' : 'Далил рад этилди',
  });

  return NextResponse.json({ ok: true });
}
