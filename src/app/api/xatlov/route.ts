import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { kesmaSaqla } from '@/lib/xonadon-tarixi';
import { choralarniYoz } from '@/lib/chora-yaratish';
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

/**
 * Zod хатосини ўзбекчага ўгиради.
 *
 * ── Нега керак ──
 *
 * Zod инглизча ёзади: «Expected 'Erkak' | 'Ayol', received null»
 * ёки «String must contain at least 3 character(s)». Маҳалла
 * ходими буни ўқий олмайди — у хонадон эшиги олдида турибди ва
 * инглиз тилини билиши шарт эмас.
 *
 * Матн ҚИСҚА бўлиши керак: у катакнинг тагида, кичик ҳарфда
 * чиқади. Шунинг учун «нима қилиш керак» дейилади, «нима
 * кутилган эди» эмас.
 */
function zodniOgir(n: z.ZodIssue): string {
  switch (n.code) {
    case 'invalid_type':
      /* null ёки undefined — яъни умуман тўлдирилмаган */
      return n.received === 'null' || n.received === 'undefined'
        ? 'Тўлдирилмаган'
        : 'Нотўғри турдаги қиймат';

    case 'invalid_enum_value':
      return 'Рўйхатдан танланг';

    case 'too_small':
      if (n.type === 'date') return 'Сана жуда эрта — текшириб кўринг';
      if (n.type === 'string') return 'Жуда қисқа';
      if (n.type === 'array') return 'Камида битта танланг';
      return `Камида ${String(n.minimum)} бўлиши керак`;

    case 'too_big':
      if (n.type === 'string') return 'Жуда узун';
      /*
       * Сана майдонларида `maximum` — хом Unix вақт белгиси.
       * Ходимга «Кўпи билан 1789818655969 бўлиши мумкин» деб
       * чиқарди — бу ҳеч нарса англатмайди ва одам нима
       * қилишини билмай қолади.
       */
      if (n.type === 'date') return 'Сана келажакда бўлиши мумкин эмас';
      return `Кўпи билан ${String(n.maximum)} бўлиши мумкин`;

    case 'invalid_string':
      return 'Нотўғри ёзилган';

    default:
      return 'Нотўғри қиймат';
  }
}

export async function POST(request: Request) {
  const q = await talabQil(['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const xom = await request.json().catch(() => null);
  const natija = Tana.safeParse(xom);
  if (!natija.success) {
    /*
     * ── ХАТО ҚАЙСИ МАЙДОНДА ЭКАНИ АЙТИЛАДИ ──
     *
     * Илгари бу ерда фақат «Маълумот нотўғри» деган қизил
     * ёзув қайтарди. Тафсилот `flatten()` кўринишида ёнида
     * борди, аммо форма уни ЎҚИМАСДИ: у бошқа шаклни —
     * `{maydon, xabar}` рўйхатини кутади.
     *
     * Натижада дала ходими саккиз қадамли анкетада қизил
     * қутини кўрар, лекин қайси катак хато эканини топа
     * олмасди. Устига босиб ўтиш ҳам мумкин эмасди.
     *
     * Энди рўйхат форма кутган шаклда қайтади — форма ўша
     * қадамга ўзи ўтади ва катакни белгилайди.
     */
    const xatolar = natija.error.issues.map((n) => ({
      /*
       * Йўл ичидан ОХИРГИ матнли бўлак олинади: танада
       * маълумот `malumot.xonadon.jamiAzo` каби ичкарида
       * туради, форма эса соф майдон номини кутади.
       */
      maydon: [...n.path].reverse().find((k) => typeof k === 'string') ?? 'umumiy',
      xabar: zodniOgir(n),
    }));

    return NextResponse.json(
      {
        /*
         * Хабар матни ЎЗИ ЕТАРЛИ бўлиши керак эмас — қизил
         * белги катакнинг ёнида туради ва форма ўша қадамга
         * ўтади. Шунинг учун бу ерда фақат «қаерга қараш
         * керак» дейилади.
         */
        xabar:
          xatolar.length === 1
            ? 'Битта катак тўлдирилмаган ёки нотўғри — у қизил билан белгиланди'
            : `${xatolar.length} та катак тўлдирилмаган ёки нотўғри — улар қизил билан белгиланди`,
        xatolar,
        tafsilot: natija.error.flatten(),
      },
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
    /*
     * Ногиронлар рўйхатининг УЗУНЛИГИ алоҳида узатилади.
     *
     * Текширув сонлар устида ишлайди ва массивни ўқимайди.
     * Буни узатмасак, браузер тўсарди-ю, сервер ўтказиб
     * юборарди — яъни ҳақиқий тўсиқ бўлмасди.
     */
    const hisobot = yuborishgaTayyormi(
      { ...xonadon, nogironShaxslarSoni: (xonadon.nogironShaxslar ?? []).length },
      ishsizlar.length,
      {
        rozilikBerdi: xonadon.rozilikBerdi ?? false,
        imzoYoli: xonadon.imzoYoli ?? '',
      }
    );
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

    /*
     * ── КАСБ ИСТАГИ ЭНДИ ҲИСОБЛАНАДИ ──
     *
     * Илгари хонадон даражасида алоҳида сўраларди: «Касб-ҳунар
     * ёки тадбиркорликка ўқишни истайдими?». У савол олиб
     * ташланди — чунки худди шу нарса ҳар бир ишсиз фуқародан
     * АЛОҲИДА сўралади ва у ерда КИМ ўрганмоқчи экани ҳам,
     * ҚАЙСИ касбни хоҳлагани ҳам ёзилади.
     *
     * Аммо устун базада қолди: кесма (хонадон тарихи) ва
     * ҳисоботлар унга таянади. Шунинг учун у энди ишсизлар
     * рўйхатидан ҳисоблаб қўйилади — маъноси ўзгармайди,
     * ходим эса битта ортиқча савол босмайди.
     */
    ...(turi === 'yakuniy'
      ? { kasbHunarIstagi: ishsizlar.some((p) => p.kasbHunarEhtiyoji) }
      : {}),
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

        /*
         * ── ЭҲТИЁЖ → ТОПШИРИҚ ──
         *
         * Хатлов якунланди. Анкетада «касб ўрганмоқчи»,
         * «кредит керак», «бола мактабга бормайди» деган
         * белгилар бор — улар шу ерда ТОПШИРИҚҚА айланади:
         * масъул ташкилот ва муддат билан.
         *
         * Илгари бу халқа йўқ эди. Маълумот анкета ичида ётиб
         * қоларди ва ҳоким «Чора-тадбирлар» саҳифасини очиб
         * НОЛ кўрарди — ходимлар ишлаётган бўлса ҳам.
         *
         * Транзакция ичида: хонадон сақланиб, топшириқлар
         * сақланмай қолса, занжир узилган бўларди.
         */
        const barchaIshsizlar = await tx.unemployedPerson.findMany({
          where: { householdId: h.id },
          select: {
            id: true,
            fish: true,
            kasbHunarEhtiyoji: true,
            organmoqchiKasb: true,
            itShaharchaVaucheri: true,
          },
        });

        await choralarniYoz(
          tx,
          {
            id: h.id,
            moliyaEhtiyoji: h.moliyaEhtiyoji,
            talabQilinganMablag: h.talabQilinganMablag,
            maktabYoshdagi: h.maktabYoshdagi,
            maktabQamrovda: h.maktabQamrovda,
            uzoqDavolanish: h.uzoqDavolanish,
            nogironlikBor: h.nogironlikBor,
            ishsizlar: barchaIshsizlar,
          },
          q.sessiya.userId
        );
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
      /*
       * ── ХОДИМГА ЧИҚИШ ЙЎЛИ БЕРАМИЗ ──
       *
       * Илгари бу ерда фақат «бу хонадон аллақачон хатловдан
       * ўтган» деб ёзиларди. Ходим эса бутун анкетани
       * тўлдирган ва энди тиқилиб қоларди: на сақлай олади,
       * на мавжудини топа олади.
       *
       * Иккита ҳолат бўлади ва иккисида ҳам жавоб битта —
       * МАВЖУД ЁЗУВНИ ОЧИШ:
       *   · ростдан ҳам бошқа ходим аллақачон киритган;
       *   · алоқа узилиб, биринчи юбориш аслида ўтиб кетган
       *     ва ходим иккинчи марта босган.
       *
       * Шунинг учун ёзувнинг `id` си ҳам қайтарилади ва форма
       * ундан ҳавола ясайди.
       */
      const mavjud = await prisma.household
        .findFirst({
          where: { mahallaId: xonadon.mahallaId, takrorKaliti: kalit },
          select: { id: true, holati: true },
        })
        .catch(() => null);

      return NextResponse.json(
        {
          xabar:
            'Bu xonadon allaqachon xatlovdan o‘tgan. Shu manzil va oila boshlig‘i bo‘yicha yozuv mavjud.',
          mavjudId: mavjud?.id ?? null,
          mavjudHolati: mavjud?.holati ?? null,
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
