import type { IshsizHolati } from '@prisma/client';
import { prisma } from './prisma';
import { kechikkanlarShartI } from './chora-tadbir';
import { VORONKA } from '@/lib/ishsiz-holati';

/**
 * ============================================================
 *  HOKIM PANELI UCHUN TAHLIL
 *
 *  Bitta tamoyil butun modulni belgilaydi: har bir raqamning
 *  MAXRAJI bo'lishi kerak.
 *
 *  "38 ta xonadon xatlovdan o'tdi" - bu hokim uchun ma'nosiz
 *  raqam. "506 tadan 38 tasi" esa ma'noli. Maxraj svod
 *  jadvalidan keladi (Mahalla modelidagi baza raqamlari) va
 *  aynan shuning uchun u platformaga import qilingan.
 * ============================================================
 */

export interface VoronkaBosqichi {
  holati: IshsizHolati;
  soni: number;
  /** Bazadagi ishsizlar sonidan foizi */
  foiz: number;
}

export interface MahallaQamrovi {
  id: string;
  nomi: string;
  nomiKirill: string;
  /** Svod jadvalidagi ishsizlar soni - maxraj */
  bazaIshsiz: number;
  /** Xatlovda aniqlangan ishsizlar */
  aniqlangan: number;
  joylashtirilgan: number;
  /** Aniqlanganlarning bazaga nisbati */
  qamrovFoizi: number;
  /** Joylashtirilganlarning bazaga nisbati */
  natijaFoizi: number;
  xatlovXonadon: number;
  bazaXonadon: number;
}

/**
 * Bir oylik nuqta - chiziqli grafik shundan chiziladi.
 *
 * Raqamlar TO'PLANIB boradi (kumulyativ): "shu oy oxiriga qadar
 * jami shuncha". Oylik oqim emas, aynan to'planish kerak - hokim
 * uchun asosiy savol "qamrov qay darajada o'sdi", "bu oy nechta
 * qo'shildi" emas.
 */
export interface OylikNuqta {
  /** Saralash uchun: '2026-09' */
  oy: string;
  /** Ko'rsatish uchun: 'Сен 26' */
  yorliq: string;

  /* ── To'plangan (kumulyativ) ── */
  xatlovXonadon: number;
  aniqlangan: number;
  joylashtirilgan: number;

  /* ── Shu oyning O'ZIDA qo'shilgani (oqim) ── */
  /** Shu oy xatlovdan o'tgan xonadon */
  yangiXatlov: number;
  /** Shu oy aniqlangan ishsiz */
  yangiAniqlangan: number;
  /** Shu oy ishga joylashgan */
  yangiJoylashgan: number;

  /* ── O'sish va kamayish surati ── */
  /**
   * Hali ishga joylashmagan, ro'yxatda turgan ishsizlar soni:
   * `aniqlangan - joylashtirilgan`. Asosiy raqam shu - chunki
   * "aniqlangan" hech qachon kamaymaydi, muammoning hajmi esa
   * joylashtirish hisobiga kamayishi kerak.
   */
  ishsizQoldiq: number;
  /**
   * Qoldiqning shu oy ichidagi o'zgarishi.
   *
   * MANFIY = kamaydi (yaxshi), MUSBAT = o'sdi (yomon).
   * Ayni shu son `yangiAniqlangan - yangiJoylashgan` ga teng,
   * ya'ni diagrammada ustun qaysi tomonga qarab turgani
   * "kim ko'p: yangi ishsizmi yoki ishga joylashganmi"
   * degan savolga javob beradi.
   */
  ishsizOzgarishi: number;
  /** O'sha o'zgarish oy BOSHIDAGI qoldiqqa nisbatan, foizda */
  ishsizOzgarishFoizi: number;
}

export interface TahlilNatijasi {
  jami: {
    bazaIshsiz: number;
    bazaXonadon: number;
    bazaAholi: number;
    xatlovXonadon: number;
    aniqlangan: number;
    joylashtirilgan: number;
    radEtgan: number;
  };
  voronka: VoronkaBosqichi[];
  qamrov: MahallaQamrovi[];
  /** Oxirgi 12 oy - chiziqli grafik uchun */
  dinamika: OylikNuqta[];
  kechikkanlar: { tashkilot: string; soni: number }[];
  byudjet: { yonalish: string; summa: number; oila: number }[];
  jamiTalab: number;
  kursTalabi: { kasb: string; soni: number }[];
  toifalar: {
    ayollarDaftari: number;
    ijtimoiyReestr: number;
    migratsiyadanQaytgan: number;
    oliyBitiruvchi: number;
    ortaMaxsusBitiruvchi: number;
  };
}

/** Foizni bir kasrli songa yaxlitlaydi */
const f = (qism: number, butun: number): number =>
  butun > 0 ? Math.round((qism / butun) * 1000) / 10 : 0;

/*
 * Oy nomlarining qisqartmasi. Manba matn kirillda - lotini
 * `lotinga()` orqali o'zi hosil bo'ladi, shuning uchun bu yerda
 * bitta ro'yxat yetadi.
 */
const OY_NOMI = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

/** `2026-09` ko'rinishidagi kalit */
function oyKaliti(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Oxirgi 12 oyning to'plangan raqamlari.
 *
 * Sanalar kodda guruhlanadi, SQL'da emas. Ma'lumot hajmi tuman
 * darajasida - bir necha ming yozuv - shuning uchun farqi
 * sezilmaydi, lekin kod baza turiga bog'lanib qolmaydi va
 * vaqt mintaqasi bilan bog'liq nozikliklar bitta joyda qoladi.
 *
 * Eksport qilingan - `scripts/dinamika-sinov.ts` uni bazasiz
 * chaqirib, arifmetikani sinovdan o'tkazadi. O'sish va kamayish
 * surati aynan shu yerda hisoblanadi: xato bo'lsa diagramma
 * baribir chiroyli ko'rinadi, faqat noto'g'ri tomonga qaragan
 * ustun bilan - shuning uchun uni ko'z bilan emas, sinov bilan
 * tekshirish kerak.
 */
export function dinamikaHisobla(
  xatlovSanalari: Date[],
  aniqlanganSanalari: Date[],
  joylashganSanalari: Date[]
): OylikNuqta[] {
  const hozir = new Date();

  /*
   * Oxirgi 12 oy, eskisidan yangisiga. Har oyda ikki chegara
   * bor: BOSHI va OXIRI.
   *
   * Nega ikkovi ham kerak: to'plangan raqam uchun faqat oy
   * oxiri yetadi ("shu kungacha jami nechta"). Oylik OQIM
   * uchun esa oyning o'z oralig'i kerak. Ilgari oqim ikki
   * oyning to'plangan raqamini ayirish yo'li bilan olinardi
   * va birinchi oy noto'g'ri chiqardi: undan oldingi TAQQOSLASH
   * NUQTASI yo'q, shuning uchun bir yildan eski butun tarix
   * o'sha oyda sodir bo'lgandek ko'rinardi.
   */
  const oylar: { oy: string; yorliq: string; boshi: Date; chegara: Date }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hozir.getFullYear(), hozir.getMonth() - i, 1);
    oylar.push({
      oy: oyKaliti(d),
      yorliq: `${OY_NOMI[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
      boshi: d,
      chegara: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    });
  }

  /** Shu sanagacha bo'lgan hammasi - to'plangan raqam uchun */
  const gacha = (list: Date[], chegara: Date) =>
    list.reduce((s, d) => (d < chegara ? s + 1 : s), 0);

  /** Faqat shu oyning ichidagilar - oqim uchun */
  const ichida = (list: Date[], boshi: Date, chegara: Date) =>
    list.reduce((s, d) => (d >= boshi && d < chegara ? s + 1 : s), 0);

  return oylar.map((o) => {
    const aniqlangan = gacha(aniqlanganSanalari, o.chegara);
    const joylashtirilgan = gacha(joylashganSanalari, o.chegara);

    const yangiAniqlangan = ichida(aniqlanganSanalari, o.boshi, o.chegara);
    const yangiJoylashgan = ichida(joylashganSanalari, o.boshi, o.chegara);

    const ishsizQoldiq = aniqlangan - joylashtirilgan;

    /*
     * O'zgarish AYNAN shu oyning oqimidan olinadi, ikki oyning
     * qoldig'ini ayirishdan emas. Natija bir xil, lekin bu yo'l
     * birinchi oyda ham to'g'ri ishlaydi.
     */
    const ishsizOzgarishi = yangiAniqlangan - yangiJoylashgan;

    /* Oy BOSHIDAGI qoldiq - foiz shunga nisbatan hisoblanadi */
    const oldingiQoldiq = ishsizQoldiq - ishsizOzgarishi;

    return {
      oy: o.oy,
      yorliq: o.yorliq,

      xatlovXonadon: gacha(xatlovSanalari, o.chegara),
      aniqlangan,
      joylashtirilgan,

      yangiXatlov: ichida(xatlovSanalari, o.boshi, o.chegara),
      yangiAniqlangan,
      yangiJoylashgan,

      ishsizQoldiq,
      ishsizOzgarishi,
      /*
       * Oy boshida hech kim ro'yxatda bo'lmasa foiz chiqarilmaydi:
       * nolga bo'lish o'rniga nol qaytadi. Diagrammada bu
       * "taqqoslaydigan baza yo'q" degani - ustun baribir o'z
       * balandligi bilan turadi, faqat yonida foiz yozilmaydi.
       */
      ishsizOzgarishFoizi:
        oldingiQoldiq > 0 ? Math.round((ishsizOzgarishi / oldingiQoldiq) * 1000) / 10 : 0,
    };
  });
}

export async function tahlilOl(mahallaId?: string): Promise<TahlilNatijasi> {
  const hozir = new Date();
  const mahallaFiltri = mahallaId ? { mahallaId } : {};

  const [
    mahallalar,
    bosqichlar,
    xonadonlar,
    kechikkanlar,
    moliya,
    kurslar,
    xatlovSanalari,
    aniqlanganSanalari,
    joylashganSanalari,
  ] = await Promise.all([
      prisma.mahalla.findMany({
        where: mahallaId ? { id: mahallaId } : undefined,
        orderBy: { nomi: 'asc' },
        select: {
          id: true,
          nomi: true,
          nomiKirill: true,
          ishsiz: true,
          xonadon: true,
          aholi: true,
          ayollarDaftari: true,
          ijtimoiyReestr: true,
          migratsiyadanQaytgan: true,
          oliyBitiruvchi: true,
          ortaMaxsusBitiruvchi: true,
        },
      }),

      prisma.unemployedPerson.groupBy({
        by: ['mahallaId', 'holati'],
        where: mahallaFiltri,
        _count: true,
      }),

      prisma.household.groupBy({
        by: ['mahallaId'],
        where: { ...mahallaFiltri, holati: { not: 'QORALAMA' } },
        _count: true,
      }),

      prisma.actionPlan.groupBy({
        by: ['masulTashkilot'],
        where: mahallaId
          ? {
              ...kechikkanlarShartI(hozir),
              OR: [{ household: { mahallaId } }, { ishsiz: { mahallaId } }],
            }
          : kechikkanlarShartI(hozir),
        _count: true,
      }),

      /*
       * Byudjet talabi: moliyaviy ehtiyoji bor xonadonlarning
       * summasi va yo'nalishlari. `mablagYonalishi` massiv bo'lgani
       * uchun guruhlashni SQL emas, kod bajaradi.
       */
      prisma.household.findMany({
        where: { ...mahallaFiltri, moliyaEhtiyoji: true, holati: { not: 'QORALAMA' } },
        select: { talabQilinganMablag: true, mablagYonalishi: true },
      }),

      prisma.unemployedPerson.findMany({
        where: { ...mahallaFiltri, kasbHunarEhtiyoji: true, organmoqchiKasb: { not: null } },
        select: { organmoqchiKasb: true },
      }),

      /*
       * Chiziqli grafik uchun sanalar.
       *
       * Faqat bitta ustun olinadi - butun yozuv emas. Tuman
       * hajmida bu bir necha ming sana, ya'ni yuz kilobayt ham
       * emas, lekin oylik guruhlash uchun yetarli.
       */
      prisma.household.findMany({
        where: { ...mahallaFiltri, holati: { not: 'QORALAMA' } },
        select: { createdAt: true },
      }),

      prisma.unemployedPerson.findMany({
        where: mahallaFiltri,
        select: { createdAt: true },
      }),

      /*
       * Joylashtirilganlar uchun YOZUV yaratilgan sana emas, ishga
       * kirgan sana olinadi: anketa keyinroq to'ldirilishi mumkin,
       * grafik esa haqiqiy voqea sanasini ko'rsatishi kerak.
       */
      prisma.unemployedPerson.findMany({
        where: { ...mahallaFiltri, ishgaKirganSana: { not: null } },
        select: { ishgaKirganSana: true },
      }),
    ]);

  // ── Voronka ──
  const bosqichSoni = new Map<IshsizHolati, number>();
  const mahallaBosqich = new Map<string, Map<IshsizHolati, number>>();

  for (const b of bosqichlar) {
    bosqichSoni.set(b.holati, (bosqichSoni.get(b.holati) ?? 0) + b._count);
    const m = mahallaBosqich.get(b.mahallaId) ?? new Map();
    m.set(b.holati, b._count);
    mahallaBosqich.set(b.mahallaId, m);
  }

  const bazaIshsiz = mahallalar.reduce((s, m) => s + m.ishsiz, 0);
  const aniqlangan = Array.from(bosqichSoni.values()).reduce((s, n) => s + n, 0);
  const radEtgan = bosqichSoni.get('RAD_ETDI') ?? 0;

  /*
   * Voronka KUMULYATIV: "taklif berildi" bosqichida turgan odam
   * suhbatdan ham o'tgan. Har bosqichni alohida sanasak, voronka
   * o'rniga tarqoq ustunlar chiqadi va "qayerda tiqilib qolgan"
   * degan savolga javob bermaydi.
   */
  const bosqichRaqami = (h: IshsizHolati) => VORONKA.indexOf(h);
  const voronka: VoronkaBosqichi[] = VORONKA.map((h) => {
    const soni = VORONKA.filter((x) => bosqichRaqami(x) >= bosqichRaqami(h)).reduce(
      (s, x) => s + (bosqichSoni.get(x) ?? 0),
      0
    );
    return { holati: h, soni, foiz: f(soni, bazaIshsiz) };
  });

  const joylashtirilgan =
    (bosqichSoni.get('JOYLASHTIRILDI') ?? 0) + (bosqichSoni.get('TASDIQLANDI') ?? 0);

  // ── Mahalla qamrovi ──
  const xonadonSoni = new Map(xonadonlar.map((x) => [x.mahallaId, x._count]));

  const qamrov: MahallaQamrovi[] = mahallalar.map((m) => {
    const b = mahallaBosqich.get(m.id) ?? new Map<IshsizHolati, number>();
    const mahallaAniqlangan = Array.from(b.values()).reduce((s, n) => s + n, 0);
    const mahallaJoylashgan =
      (b.get('JOYLASHTIRILDI') ?? 0) + (b.get('TASDIQLANDI') ?? 0);

    return {
      id: m.id,
      nomi: m.nomi,
      nomiKirill: m.nomiKirill,
      bazaIshsiz: m.ishsiz,
      aniqlangan: mahallaAniqlangan,
      joylashtirilgan: mahallaJoylashgan,
      qamrovFoizi: f(mahallaAniqlangan, m.ishsiz),
      natijaFoizi: f(mahallaJoylashgan, m.ishsiz),
      xatlovXonadon: xonadonSoni.get(m.id) ?? 0,
      bazaXonadon: m.xonadon,
    };
  });

  // ── Byudjet talabi ──
  const yonalishlar = new Map<string, { summa: number; oila: number }>();
  let jamiTalab = 0;

  for (const x of moliya) {
    const summa = x.talabQilinganMablag ? Number(x.talabQilinganMablag) : 0;
    jamiTalab += summa;

    /*
     * Bir oila bir necha yo'nalish belgilashi mumkin. Summani
     * yo'nalishlar orasida TENG taqsimlaymiz - aks holda bitta
     * 50 mln so'm har yo'nalishda to'liq sanalib, umumiy raqam
     * haqiqiy talabdan bir necha barobar katta chiqardi.
     */
    const royxat = x.mablagYonalishi.length > 0 ? x.mablagYonalishi : ['Boshqa'];
    const ulush = summa / royxat.length;

    for (const y of royxat) {
      const j = yonalishlar.get(y) ?? { summa: 0, oila: 0 };
      j.summa += ulush;
      j.oila += 1;
      yonalishlar.set(y, j);
    }
  }

  const byudjet = Array.from(yonalishlar.entries())
    .map(([yonalish, j]) => ({ yonalish, summa: Math.round(j.summa), oila: j.oila }))
    .sort((a, b) => b.summa - a.summa);

  // ── Kurs talabi ──
  const kasblar = new Map<string, number>();
  for (const k of kurslar) {
    const nom = k.organmoqchiKasb?.trim();
    if (!nom) continue;
    // Bosh harf farqi tufayli "Payvandchi" va "payvandchi" ikkiga bo'linmasin
    const kalit = nom.charAt(0).toUpperCase() + nom.slice(1).toLowerCase();
    kasblar.set(kalit, (kasblar.get(kalit) ?? 0) + 1);
  }

  const kursTalabi = Array.from(kasblar.entries())
    .map(([kasb, soni]) => ({ kasb, soni }))
    .sort((a, b) => b.soni - a.soni);

  return {
    jami: {
      bazaIshsiz,
      bazaXonadon: mahallalar.reduce((s, m) => s + m.xonadon, 0),
      bazaAholi: mahallalar.reduce((s, m) => s + m.aholi, 0),
      xatlovXonadon: xonadonlar.reduce((s, x) => s + x._count, 0),
      aniqlangan,
      joylashtirilgan,
      radEtgan,
    },
    voronka,
    qamrov,
    dinamika: dinamikaHisobla(
      xatlovSanalari.map((x) => x.createdAt),
      aniqlanganSanalari.map((x) => x.createdAt),
      joylashganSanalari.map((x) => x.ishgaKirganSana as Date)
    ),
    kechikkanlar: kechikkanlar
      .map((k) => ({ tashkilot: k.masulTashkilot, soni: k._count }))
      .sort((a, b) => b.soni - a.soni),
    byudjet,
    jamiTalab,
    kursTalabi,
    toifalar: {
      ayollarDaftari: mahallalar.reduce((s, m) => s + m.ayollarDaftari, 0),
      ijtimoiyReestr: mahallalar.reduce((s, m) => s + m.ijtimoiyReestr, 0),
      migratsiyadanQaytgan: mahallalar.reduce((s, m) => s + m.migratsiyadanQaytgan, 0),
      oliyBitiruvchi: mahallalar.reduce((s, m) => s + m.oliyBitiruvchi, 0),
      ortaMaxsusBitiruvchi: mahallalar.reduce((s, m) => s + m.ortaMaxsusBitiruvchi, 0),
    },
  };
}
