import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { kesmaSaqla } from '@/lib/xonadon-tarixi';
import { mahallaFiltri, mahallagaRuxsat } from '@/lib/auth';
import { QoralamaSxemasi, YuborishSxemasi } from '@/lib/xatlov-sxema';
import { takrorKaliti, yuborishgaTayyormi } from '@/lib/xatlov-tekshiruvi';
import { yiliniAniqla } from '@/lib/xatlov-sxema';
import { telefonSaqlashUchun } from '@/lib/inson-tekshiruvi';
import { somga } from '@/lib/constants';

/** Ro'yxat so'rovi */
const Sorov = z.object({
  mahallaId: z.string().cuid().optional(),
  holati: z.enum(['QORALAMA', 'YUBORILGAN', 'TASDIQLANGAN']).optional(),
  qidiruv: z.string().max(100).optional(),
  sahifa: z.coerce.number().int().min(1).default(1),
});

const SAHIFA_HAJMI = 20;

// ─────────────────────────────────────────────────────────────
//  RO'YXAT
// ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const q = await talabQil();
  if (q instanceof NextResponse) return q;

  const url = new URL(request.url);
  const natija = Sorov.safeParse(Object.fromEntries(url.searchParams));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'So‘rov noto‘g‘ri' }, { status: 400 });
  }
  const { mahallaId, holati, qidiruv, sahifa } = natija.data;

  // Yettilik a'zosi uchun mahalla filtri majburiy va o'zgartirib bo'lmaydi
  const majburiy = mahallaFiltri(q.sessiya);

  const where: Prisma.HouseholdWhereInput = {
    ...majburiy,
    ...(mahallaId && !majburiy.mahallaId ? { mahallaId } : {}),
    ...(holati ? { holati } : {}),
    ...(qidiruv
      ? {
          OR: [
            { oilaBoshligi: { contains: qidiruv, mode: 'insensitive' } },
            { manzil: { contains: qidiruv, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [jami, royxat] = await Promise.all([
    prisma.household.count({ where }),
    prisma.household.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (sahifa - 1) * SAHIFA_HAJMI,
      take: SAHIFA_HAJMI,
      select: {
        id: true,
        holati: true,
        manzil: true,
        oilaBoshligi: true,
        jamiAzo: true,
        ishsizlarSoni: true,
        xatlovSanasi: true,
        updatedAt: true,
        mahalla: { select: { nomi: true, nomiKirill: true } },
        xodim: { select: { fullName: true } },
        _count: { select: { ishsizlar: true } },
      },
    }),
  ]);

  return NextResponse.json({
    royxat,
    jami,
    sahifa,
    sahifalar: Math.max(1, Math.ceil(jami / SAHIFA_HAJMI)),
  });
}

// ─────────────────────────────────────────────────────────────
//  YARATISH / SAQLASH
// ─────────────────────────────────────────────────────────────

const Tana = z.discriminatedUnion('turi', [
  z.object({ turi: z.literal('qoralama'), id: z.string().cuid().nullish(), malumot: QoralamaSxemasi }),
  z.object({ turi: z.literal('yakuniy'), id: z.string().cuid().nullish(), malumot: YuborishSxemasi }),
]);

export async function POST(request: Request) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const xom = await request.json().catch(() => null);
  const natija = Tana.safeParse(xom);
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Ma‘lumot noto‘g‘ri', tafsilot: natija.error.flatten() },
      { status: 400 }
    );
  }

  const { turi, id } = natija.data;
  const xonadon = turi === 'qoralama' ? natija.data.malumot : natija.data.malumot.xonadon;
  const ishsizlar = turi === 'yakuniy' ? natija.data.malumot.ishsizlar : [];

  if (!mahallagaRuxsat(q.sessiya, xonadon.mahallaId)) {
    return NextResponse.json(
      { xabar: 'Siz faqat o‘z mahallangiz xonadonlarini kirita olasiz' },
      { status: 403 }
    );
  }

  // Tahrirlanayotgan yozuv boshqa mahallaga tegishli bo'lmasligi kerak
  if (id) {
    const mavjud = await prisma.household.findUnique({
      where: { id },
      select: { mahallaId: true, holati: true },
    });
    if (!mavjud) {
      return NextResponse.json({ xabar: 'Xatlov topilmadi' }, { status: 404 });
    }
    if (!mahallagaRuxsat(q.sessiya, mavjud.mahallaId)) {
      return NextResponse.json({ xabar: 'Bu xatlovga huquqingiz yo‘q' }, { status: 403 });
    }
    // Tasdiqlangan xatlovni faqat bandlik markazi qayta ocha oladi
    if (mavjud.holati === 'TASDIQLANGAN' && q.sessiya.rol === 'YETTILIK') {
      return NextResponse.json(
        { xabar: 'Bu xatlov tasdiqlangan. O‘zgartirish uchun bandlik markaziga murojaat qiling.' },
        { status: 403 }
      );
    }
  }

  /*
   * ── Якуний юборишда арифметика, розилик ва имзо текшируви ──
   *
   * Худди шу текширув браузерда ҳам бажарилади, аммо у ФАҚАТ
   * қулайлик учун: сўровни браузердан четлаб ўтиб юбориш мумкин,
   * шунинг учун ҳақиқий тўсиқ шу ерда.
   */
  if (turi === 'yakuniy') {
    const hisobot = yuborishgaTayyormi(xonadon, ishsizlar.length, {
      rozilikBerdi: xonadon.rozilikBerdi ?? false,
      imzoYoli: xonadon.imzoYoli ?? '',
    });
    if (!hisobot.ok) {
      return NextResponse.json(
        { xabar: 'Ma‘lumotlarda nomuvofiqlik bor', xatolar: hisobot.xatolar },
        { status: 422 }
      );
    }
  }

  const kalit = takrorKaliti(xonadon.manzil ?? '', xonadon.oilaBoshligi ?? '');

  /*
   * Tug'ilgan yil SANADAN olinadi.
   *
   * Asosiy maydon to'liq sana bo'ldi; yil esa eski yozuvlar va
   * tahlil uchun saqlanadi. Buni forma ham qiladi, lekin server
   * ham qilishi kerak: boshqa mijoz (oflayn navbat, kelajakdagi
   * mobil ilova) faqat sanani yuborsa, ilgari tushunarsiz
   * "Expected number, received nan" xatosi qaytardi.
   */
  const tugilganYili = yiliniAniqla(xonadon);
  if (turi === 'yakuniy' && tugilganYili == null) {
    return NextResponse.json(
      {
        xabar: 'Ma‘lumotlarda nomuvofiqlik bor',
        xatolar: [
          {
            maydon: 'oilaBoshligiTugilganSana',
            xabar: 'Оила бошлиғининг туғилган санасини киритинг',
          },
        ],
      },
      { status: 422 }
    );
  }

  /*
   * ── ЧЕТ ЭЛ ПУЛИ СЎМГА КЕЛТИРИЛАДИ ──
   *
   * Ходим қайси валютада айтилган бўлса шуни ёзади: Россиядан
   * рубль эмас, кўпинча доллар; Польшадан евро. Ҳисоботда эса
   * улар бир устунга қўшилади — 500 (доллар) билан 5 000 000
   * (сўм) аралашса, «ойига келадиган пул» рақами маъносиз
   * бўлиб қолади.
   *
   * Курс СҲУ ЕРДА, сақлаш пайтида қўлланади ва натижа ёзиб
   * қўйилади. Ҳисоблашни ҳисобот пайтига қолдирсак, курс
   * ўзгарган куни ўтган ойги ҳужжатдаги рақам ҳам ўзгариб
   * кетар ва иккита ҳужжат бир-бирига тўғри келмасди.
   */
  const chetElSom =
    xonadon.chetElMehnati && xonadon.chetElOylikPul != null
      ? somga(xonadon.chetElOylikPul, xonadon.chetElValyuta ?? 'UZS')
      : null;

  const malumot = {
    ...xonadon,
    ...(tugilganYili == null ? {} : { tugilganYili }),
    chetElOylikPulSom: chetElSom,

    /*
     * QORALAMA yarim to'ldirilgan bo'lishi MUMKIN - butun mazmuni
     * shu: xodim eshik oldida, telefoni o'chishidan oldin
     * yozganini saqlab qo'yadi.
     *
     * Lekin `jamiAzo` bazada majburiy ustun va unda `default`
     * yo'q edi: xodim oila a'zolari sonini hali kiritmagan
     * bo'lsa, saqlash 500 xatosi bilan tugardi va unga faqat
     * "Saqlashda xatolik yuz berdi" deb ko'rsatilardi - qaysi
     * maydon ekani aytilmasdi.
     *
     * 0 - "hali kiritilmagan" degani va bu YOLG'ON emas:
     * qoralamalar tahlilga ham, hisobotga ham kirmaydi
     * (`holati: { not: 'QORALAMA' }`). Yakuniy yuborishda esa
     * sxema kamida 1 ni talab qiladi.
     */
    jamiAzo: xonadon.jamiAzo ?? 0,
    telefon: telefonSaqlashUchun(xonadon.telefon ?? '') ?? xonadon.telefon ?? null,
    takrorKaliti: kalit,
    holati: turi === 'yakuniy' ? ('YUBORILGAN' as const) : ('QORALAMA' as const),
    xodimId: q.sessiya.userId,

    /*
     * Имзо ВАҚТИ серверда белгиланади, браузердан олинмайди.
     *
     * Сабаби оддий: имзо қўйилган вақт кейинчалик далил бўлиши
     * мумкин, браузердаги соат эса нотўғри бўлиши ёки атайлаб
     * ўзгартирилиши мумкин.
     *
     * Фақат имзо БОР бўлганда ёзилади — қоралама сақлашда имзо
     * ҳали йўқ.
     */
    ...(xonadon.imzoYoli ? { imzoVaqti: new Date() } : {}),
  };

  try {
    const saqlangan = await prisma.$transaction(async (tx) => {
      const h = id
        ? await tx.household.update({ where: { id }, data: malumot })
        : await tx.household.create({ data: malumot as Prisma.HouseholdUncheckedCreateInput });

      if (turi === 'yakuniy') {
        /*
         * ── КЕСМА ──
         *
         * Хонадоннинг АЙНАН шу пайтдаги ҳолати ўзгармас нусха
         * бўлиб сақланади. Фақат ЯКУНИЙ юборишда: қоралама
         * ҳали тўлиқ эмас ва ундан кесма олиш тарихни сохта
         * нуқталар билан тўлдирарди.
         *
         * Транзакция ИЧИДА — хонадон сақланиб, кесма сақланмай
         * қолса, тарихда тешик пайдо бўларди.
         */
        await kesmaSaqla(tx, h, h);

        /*
         * Ishsizlar ro'yxatini yangilaymiz, lekin SUHBATDAN O'TGANLARGA
         * TEGMAYMIZ.
         *
         * Yettilik a'zosi xatlovni bir necha kundan keyin tahrirlashi
         * mumkin. Shu orada bandlik mutaxassisi allaqachon suhbat
         * o'tkazib, taklif berib, hatto ishga joylashtirgan bo'lishi
         * mumkin. Ro'yxatni ko'r-ko'rona almashtirsak, o'sha ishning
         * hammasi o'chib ketardi.
         *
         * Shuning uchun moslashtirish ISM bo'yicha amalga oshiriladi:
         * bazada shu ismli, suhbatdan o'tgan yozuv bo'lsa - qoldiriladi;
         * bo'lmasa - yangisi yaratiladi. Ro'yxatdan chiqarilgan va hali
         * suhbat bo'lmagan yozuvlar o'chiriladi.
         */
        const nomKaliti = (ism: string) =>
          ism
            .toLowerCase()
            .replace(/[\u2018\u2019\u02BB\u02BC`\u00B4\u2032']/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const mavjudlar = await tx.unemployedPerson.findMany({
          where: { householdId: h.id },
          select: { id: true, fish: true, holati: true },
        });

        const kelganNomlar = new Set(ishsizlar.map((p) => nomKaliti(p.fish)));

        // Ro'yxatdan chiqarilganlar - faqat hali suhbat bo'lmaganlari
        const ochiriladiganlar = mavjudlar
          .filter((m) => m.holati === 'ANIQLANDI' && !kelganNomlar.has(nomKaliti(m.fish)))
          .map((m) => m.id);

        if (ochiriladiganlar.length > 0) {
          await tx.unemployedPerson.deleteMany({ where: { id: { in: ochiriladiganlar } } });
        }

        const saqlanganNomlar = new Set(
          mavjudlar
            .filter((m) => !ochiriladiganlar.includes(m.id))
            .map((m) => nomKaliti(m.fish))
        );

        // Faqat bazada yo'q ismlar yangi yozuv bo'lib qo'shiladi
        const yangilar = ishsizlar.filter((p) => !saqlanganNomlar.has(nomKaliti(p.fish)));

        for (const p of yangilar) {
          await tx.unemployedPerson.create({
            data: {
              householdId: h.id,
              mahallaId: h.mahallaId,
              fish: p.fish,
              telefon: telefonSaqlashUchun(p.telefon ?? '') ?? p.telefon ?? null,
              jinsi: p.jinsi,
              tugilganSana: p.tugilganSana ? new Date(p.tugilganSana) : null,
              malumoti: p.malumoti ?? null,
              mutaxassisligi: p.mutaxassisligi ?? null,
              ishTajribasiYil: p.ishTajribasiYil ?? null,
              xohlaganIsh: p.xohlaganIsh ?? null,
              kutilayotganMaosh: p.kutilayotganMaosh ? BigInt(p.kutilayotganMaosh) : null,
              haydovchilikGuvohnomasi: p.haydovchilikGuvohnomasi ?? false,
              haydovchilikToifasi: p.haydovchilikToifasi ?? [],
              kasbHunarEhtiyoji: p.kasbHunarEhtiyoji ?? false,
              organmoqchiKasb: p.organmoqchiKasb ?? null,
              itShaharchaVaucheri: p.itShaharchaVaucheri ?? false,
              holati: 'ANIQLANDI',
            },
          });
        }
      }

      return h;
    });

    await jurnal(q.sessiya.userId, id ? 'OZGARTIRISH' : 'YARATISH', {
      obyektTuri: 'Household',
      obyektId: saqlangan.id,
      izoh: turi === 'yakuniy' ? 'Yakuniy yuborildi' : 'Qoralama saqlandi',
    });

    return NextResponse.json({ ok: true, id: saqlangan.id, holati: saqlangan.holati });
  } catch (e) {
    // Takror xatlov - `@@unique([mahallaId, takrorKaliti])`
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json(
        {
          xabar:
            'Bu xonadon allaqachon xatlovdan o‘tgan. Shu manzil va oila boshlig‘i bo‘yicha yozuv mavjud.',
        },
        { status: 409 }
      );
    }
    console.error('Xatlovni saqlashda xato:', e);
    return NextResponse.json(
      { xabar: 'Saqlashda xatolik yuz berdi. Qayta urinib ko‘ring.' },
      { status: 500 }
    );
  }
}
