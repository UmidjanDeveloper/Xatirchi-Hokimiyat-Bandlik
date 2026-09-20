/**
 * ============================================================
 *  ФУҚАРО ПРОФИЛИ — ишсизлар, чора-тадбирлар, иш ўринлари
 *
 *  Хонадон — оила даражасидаги сурат. Бу бўлим эса АЙНАН
 *  ОДАМЛАР ҳақида: кимлар ишсиз, қанча вақтдан буён, нимага
 *  тайёр, қайси босқичда турибди.
 *
 *  ── Нега ёш гуруҳлари муҳим ──
 *
 *  «120 та ишсиз» деган рақам чора танлашга ёрдам бермайди.
 *  «120 тадан 64 таси 18-30 ёшда» деган рақам эса дарҳол
 *  йўналиш беради: касб-ҳунар курси ва биринчи иш ўрни
 *  дастури. 50 ёшдан ошганлар учун эса бошқа чора керак.
 *
 *  ── Шахсий маълумот ──
 *
 *  Бу файл ФАҚАТ жамланган сонларни қайтаради. Ф.И.Ш., телефон
 *  ва манзил ҳисоботга чиқмайди: ҳисобот йиғилишда тарқатилади
 *  ва бошқа қўлларга ўтади. Аниқ одам рўйхати керак бўлса, у
 *  тизимнинг ўзида, рухсат текширилган ҳолда кўрилади.
 * ============================================================
 */
import type { Prisma } from '@prisma/client';
import type { IshsizHolati, TopshiriqHolati } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { FAOL_ELON } from '@/lib/elon-muddati';
import { ISHSIZ_HOLATI, VORONKA } from '@/lib/ishsiz-holati';
import { BAND_HOLATLAR } from '@/lib/joylashtirish';
import { TOPSHIRIQ_HOLATI } from '@/lib/chora-tadbir';
import {
  BANDLIK_TAKLIFI,
  HAYDOVCHILIK_TOIFASI,
  IT_VAUCHER_HOLATI,
  IT_YONALISHI,
  ISHGA_TAYYORLIK,
  JINS,
  KASB_YONALISHI,
  MALUMOT,
  MASUL_TASHKILOT,
  kirillcha,
} from '@/lib/constants';
import type { Bolim, Jadval, Qator } from './turlar';
import { foiz, foizi, pul, raqamga, son } from './format';

/**
 * Ёш гуруҳлари.
 *
 * Чегаралар тасодифий эмас: 16-17 — мактабдан кейинги ёш,
 * 18-30 — «Ёшлар дафтари» ва биринчи иш ўрни дастурлари,
 * 31-45 — оила боқувчиси, 46-55/60 — нафақагача қолган давр.
 * Ҳар гуруҳда бошқа чора ишлайди.
 */
const YOSH_GURUHLARI: { nomi: string; dan: number; gacha: number }[] = [
  { nomi: '16–17 ёш', dan: 16, gacha: 17 },
  { nomi: '18–30 ёш', dan: 18, gacha: 30 },
  { nomi: '31–45 ёш', dan: 31, gacha: 45 },
  { nomi: '46–55 ёш', dan: 46, gacha: 55 },
  { nomi: '56 ёш ва юқори', dan: 56, gacha: 200 },
];

/** Ишсизлик муддати гуруҳлари (ой) */
const MUDDAT_GURUHLARI: { nomi: string; dan: number; gacha: number }[] = [
  { nomi: '6 ойдан кам', dan: 0, gacha: 5 },
  { nomi: '6–12 ой', dan: 6, gacha: 12 },
  { nomi: '1–3 йил', dan: 13, gacha: 36 },
  { nomi: '3 йилдан кўп', dan: 37, gacha: 10_000 },
];

function yosh(tugilgan: Date | null): number | null {
  if (!tugilgan) return null;
  const hozir = new Date();
  let y = hozir.getFullYear() - tugilgan.getFullYear();
  const oy = hozir.getMonth() - tugilgan.getMonth();
  if (oy < 0 || (oy === 0 && hozir.getDate() < tugilgan.getDate())) y--;
  return y >= 0 && y < 120 ? y : null;
}

/** Каталог тартибида сано — «Бошқа» охирида йиғилади */
function katalogSanoq(
  qiymatlar: (string | null)[],
  katalog: { qiymat: string; kirill: string }[]
): { nomi: string; soni: number }[] {
  const xarita = new Map<string, number>();
  for (const q of qiymatlar) {
    if (!q) continue;
    xarita.set(q, (xarita.get(q) ?? 0) + 1);
  }
  const natija = katalog
    .map((k) => ({ nomi: k.kirill, soni: xarita.get(k.qiymat) ?? 0 }))
    .filter((x) => x.soni > 0);

  const bor = new Set(katalog.map((k) => k.qiymat));
  const boshqa = [...xarita.entries()].filter(([k]) => !bor.has(k)).reduce((s, [, v]) => s + v, 0);
  if (boshqa > 0) natija.push({ nomi: 'Бошқа / кўрсатилмаган', soni: boshqa });
  return natija;
}

function sanoqJadvali(
  sarlavha: string,
  izoh: string | undefined,
  birinchi: string,
  royxat: { nomi: string; soni: number }[],
  butun: number,
  jamiQatori = false
): Jadval | null {
  if (!royxat.length) return null;
  const qatorlar: Qator[] = royxat.map((x) => ({
    nomi: x.nomi,
    qiymatlar: [son(x.soni), foiz(foizi(x.soni, butun))],
  }));
  if (jamiQatori) {
    const jami = royxat.reduce((s, x) => s + x.soni, 0);
    qatorlar.push({ nomi: 'ЖАМИ', qiymatlar: [son(jami), foiz(foizi(jami, butun))], jami: true });
  }
  return {
    sarlavha,
    izoh,
    ustunlar: [
      { sarlavha: birinchi },
      { sarlavha: 'Фуқаро', raqamli: true, eni: 26 },
      { sarlavha: 'Улуши', raqamli: true, eni: 22 },
    ],
    qatorlar,
  };
}

/* ═══════════════════════════════════════════════════════════ */

export async function fuqaroBolimlari(
  mahallaId: string | undefined
): Promise<{ bolimlar: Bolim[]; jamiFuqaro: number; jamiTopshiriq: number; jamiIshOrni: number }> {
  const filtr: Prisma.UnemployedPersonWhereInput = mahallaId ? { mahallaId } : {};
  const hozir = new Date();

  /*
   * Ёш, малумот ва тайёрлик учун қаторлар ЎҚИЛАДИ, санамайди:
   * ёшни SQL да гуруҳлаш учун хом сўров керак бўларди, ва бу
   * ҳажмда (туман бўйича бир неча минг ёзув) фарқи сезилмайди.
   * Хонадонлар (40 минг) учун эса бу усул ярамайди — шунинг
   * учун у ерда `count` ишлатилган.
   */
  const [
    shaxslar,
    bosqichlar,
    taklifJadvali,
    topshiriqHolatlari,
    topshiriqTashkilotlari,
    kechikkanlar,
    ishOrinlari,
    ishOrniYonalishlari,
    maoshJamlari,
    bandFaolOrin,
    elonOrqaliJoylashgan,
    itVaucherHolatlari,
    itVaucherYonalishlari,
    itNavbatda,
  ] = await Promise.all([
    prisma.unemployedPerson.findMany({
      where: filtr,
      select: {
        jinsi: true,
        tugilganSana: true,
        malumoti: true,
        nogironlik: true,
        kasbHunarEhtiyoji: true,
        organmoqchiKasb: true,
        ishgaTayyorligi: true,
        imtiyozEhtiyoji: true,
        haydovchilikGuvohnomasi: true,
        haydovchilikToifasi: true,
        itShaharchaVaucheri: true,
        ishTajribasiYil: true,
        kutilayotganMaosh: true,
        takliflar: true,
        holati: true,
        household: { select: { ishsizlikMuddatiOy: true } },
      },
    }),

    prisma.unemployedPerson.groupBy({ by: ['holati'], where: filtr, _count: true }),

    prisma.unemployedPerson.count({ where: { ...filtr, takliflar: { isEmpty: false } } }),

    prisma.actionPlan.groupBy({
      by: ['holati'],
      where: mahallaId
        ? { OR: [{ household: { mahallaId } }, { ishsiz: { mahallaId } }] }
        : {},
      _count: true,
    }),

    prisma.actionPlan.groupBy({
      by: ['masulTashkilot'],
      where: mahallaId
        ? { OR: [{ household: { mahallaId } }, { ishsiz: { mahallaId } }] }
        : {},
      _count: true,
    }),

    prisma.actionPlan.groupBy({
      by: ['masulTashkilot'],
      where: {
        holati: { in: ['KUTILMOQDA', 'BAJARILMOQDA', 'KECHIKDI'] },
        muddat: { lt: hozir },
        ...(mahallaId
          ? { OR: [{ household: { mahallaId } }, { ishsiz: { mahallaId } }] }
          : {}),
      },
      _count: true,
    }),

    prisma.vacancy.aggregate({
      where: { ...FAOL_ELON(), ...(mahallaId ? { mahallaId } : {}) },
      _sum: { ornlarSoni: true },
      _count: true,
    }),

    prisma.vacancy.groupBy({
      by: ['yonalish'],
      where: { ...FAOL_ELON(), ...(mahallaId ? { mahallaId } : {}) },
      _sum: { ornlarSoni: true },
      _count: true,
    }),

    prisma.vacancy.aggregate({
      where: { ...FAOL_ELON(), maosh: { not: null }, ...(mahallaId ? { mahallaId } : {}) },
      _avg: { maosh: true },
      _min: { maosh: true },
      _max: { maosh: true },
    }),

    /*
     * Очиқ эълонлардаги БАНД ўринлар.
     *
     * `ornlarSoni` йиғиндиси эълон қилинган ўринни беради, бўш
     * қолганини эмас. Икки эълоннинг ҳар бирида 3 ўрин бўлиб,
     * тўрттаси банд бўлса, «6 бўш ўрин» деган рақам ҳисоботни
     * ёлғонга айлантиради — амалда 2 та бўш.
     *
     * Маҳалла кесимида ЭЪЛОН маҳалласи бўйича саналади,
     * фуқаронинг маҳалласи бўйича эмас: савол «шу маҳаллада
     * нечта ўрин банд бўлди» деганидир.
     */
    prisma.unemployedPerson.count({
      where: {
        holati: { in: BAND_HOLATLAR },
        vacancy: { ...FAOL_ELON(), ...(mahallaId ? { mahallaId } : {}) },
      },
    }),

    prisma.unemployedPerson.count({
      where: {
        holati: { in: BAND_HOLATLAR },
        vacancy: mahallaId ? { mahallaId } : { is: {} },
      },
    }),

    /*
     * IT-ШАҲАРЧА ВАУЧЕРЛАРИ.
     *
     * Учта сўров: ҳолат кесимида, йўналиш кесимида ва
     * НАВБАТДАГИЛАР сони — истаги бор-у ваучер ҳали
     * берилмаганлар. Учинчиси энг муҳими: биринчи иккитаси
     * «нима қилинди» деса, у «нима қилинмади» дейди.
     */
    prisma.itVaucher.groupBy({
      by: ['holati'],
      where: mahallaId ? { mahallaId } : {},
      _count: true,
    }),

    prisma.itVaucher.groupBy({
      by: ['yonalish'],
      where: mahallaId ? { mahallaId } : {},
      _count: true,
    }),

    prisma.unemployedPerson.count({
      where: {
        ...filtr,
        itShaharchaVaucheri: true,
        itVaucherlar: { none: { holati: { notIn: ['BEKOR_QILINDI', 'TASHLAB_KETDI'] } } },
      },
    }),
  ]);

  const jamiFuqaro = shaxslar.length;
  const jamiTopshiriq = topshiriqHolatlari.reduce((s, t) => s + t._count, 0);
  const jamiIshOrni = ishOrinlari._sum.ornlarSoni ?? 0;
  const bolimlar: Bolim[] = [];

  /* ── Ишсизлар билан иш — босқичлар ────────────────────────── */
  if (jamiFuqaro > 0) {
    const sanoq = new Map<IshsizHolati, number>();
    for (const b of bosqichlar) sanoq.set(b.holati, b._count);

    const voronkaQatorlari: Qator[] = VORONKA.map((h) => {
      const n = sanoq.get(h) ?? 0;
      return { nomi: ISHSIZ_HOLATI[h].kirill, qiymatlar: [son(n), foiz(foizi(n, jamiFuqaro))] };
    });
    const radEtgan = sanoq.get('RAD_ETDI') ?? 0;
    if (radEtgan > 0) {
      voronkaQatorlari.push({
        nomi: `${ISHSIZ_HOLATI.RAD_ETDI.kirill} (воронкадан чиқди)`,
        qiymatlar: [son(radEtgan), foiz(foizi(radEtgan, jamiFuqaro))],
      });
    }

    const joylashgan = (sanoq.get('JOYLASHTIRILDI') ?? 0) + (sanoq.get('TASDIQLANDI') ?? 0);

    bolimlar.push({
      kalit: 'voronka',
      sarlavha: 'Ишсизлар билан иш — босқичлар',
      varaqNomi: 'Босқичлар',
      kirish:
        'Ҳар бир фуқаро аниқланишдан тасдиқлашгача бешта босқичдан ўтади. Қаерда тўхтаб қолгани — айнан шу ерда иш талаб қилинишини кўрсатади.',
      korsatkichlar: [
        { nomi: 'Тизимда аниқланган', qiymat: son(jamiFuqaro) },
        {
          nomi: 'Ишга жойлаштирилган',
          qiymat: son(joylashgan),
          izoh: `аниқланганларнинг ${foiz(foizi(joylashgan, jamiFuqaro))}и`,
          yonalish: 'kop-yaxshi',
          foiz: foizi(joylashgan, jamiFuqaro),
        },
        {
          nomi: 'Суҳбат кутаётган',
          qiymat: son(sanoq.get('ANIQLANDI') ?? 0),
          izoh: 'ҳали мутахассис кўрмаган',
          yonalish: 'kam-yaxshi',
        },
        {
          nomi: 'Таклифдан бош тортган',
          qiymat: son(radEtgan),
          izoh: 'алоҳида ишлаш талаб қилинади',
          yonalish: 'kam-yaxshi',
        },
      ],
      jadvallar: [
        {
          sarlavha: 'Босқичлар кесимида',
          ustunlar: [
            { sarlavha: 'Босқич' },
            { sarlavha: 'Фуқаро', raqamli: true, eni: 26 },
            { sarlavha: 'Улуши', raqamli: true, eni: 22 },
          ],
          qatorlar: voronkaQatorlari,
        },
      ],
      diagrammalar: [
        {
          turi: 'gorizontal',
          sarlavha: 'Босқичлар — фуқаро сони',
          izoh: 'Пастга тушган сари сон камаяди. Кескин тушиш бўлган жой — тўхтаб қолган босқич.',
          nomlar: VORONKA.map((h) => ISHSIZ_HOLATI[h].kirill),
          qatorlar: [{ nomi: 'Фуқаро', qiymatlar: VORONKA.map((h) => sanoq.get(h) ?? 0) }],
        },
      ],
    });

    /* ── Ижтимоий-демографик профил ───────────────────────────── */
    const jinsSanoq = katalogSanoq(shaxslar.map((s) => s.jinsi), JINS);

    const yoshSanoq = YOSH_GURUHLARI.map((g) => ({
      nomi: g.nomi,
      soni: shaxslar.filter((s) => {
        const y = yosh(s.tugilganSana);
        return y !== null && y >= g.dan && y <= g.gacha;
      }).length,
    })).filter((x) => x.soni > 0);

    const yoshsiz = shaxslar.filter((s) => yosh(s.tugilganSana) === null).length;
    if (yoshsiz > 0) yoshSanoq.push({ nomi: 'Туғилган санаси кўрсатилмаган', soni: yoshsiz });

    const malumotSanoq = katalogSanoq(shaxslar.map((s) => s.malumoti), MALUMOT);
    const tayyorlikSanoq = katalogSanoq(shaxslar.map((s) => s.ishgaTayyorligi), ISHGA_TAYYORLIK);

    const muddatSanoq = MUDDAT_GURUHLARI.map((g) => ({
      nomi: g.nomi,
      soni: shaxslar.filter((s) => {
        const m = s.household?.ishsizlikMuddatiOy;
        return m !== null && m !== undefined && m >= g.dan && m <= g.gacha;
      }).length,
    })).filter((x) => x.soni > 0);

    const nogironlik = shaxslar.filter((s) => s.nogironlik).length;
    const kasbEhtiyoji = shaxslar.filter((s) => s.kasbHunarEhtiyoji).length;
    const imtiyoz = shaxslar.filter((s) => s.imtiyozEhtiyoji).length;
    const guvohnoma = shaxslar.filter((s) => s.haydovchilikGuvohnomasi).length;
    const itVaucher = shaxslar.filter((s) => s.itShaharchaVaucheri).length;

    /*
     * ҲАЙДОВЧИЛИК ТОИФАЛАРИ — алоҳида жадвал.
     *
     * «Гувоҳномаси бор: 84» деган рақамдан юк машинаси эълонига
     * одам танлаб бўлмайди. Бўш ўринларнинг катта қисми айнан
     * тоифага боғлиқ: C — юк машинаси, D — автобус, F — трактор.
     * Бир одамда бир нечта тоифа бўлиши мумкин, шунинг учун
     * устунлар йиғиндиси гувоҳномаси борлар сонидан кўп бўлади —
     * жадвал изоҳида шу айтилган.
     */
    const toifaXarita = new Map<string, number>();
    for (const sh of shaxslar) {
      for (const t of sh.haydovchilikToifasi) {
        toifaXarita.set(t, (toifaXarita.get(t) ?? 0) + 1);
      }
    }
    const toifaSanoq = HAYDOVCHILIK_TOIFASI.map((k) => ({
      nomi: k.kirill,
      soni: toifaXarita.get(k.qiymat) ?? 0,
    })).filter((x) => x.soni > 0);

    const profilJadvallari: Jadval[] = [];
    const jins = sanoqJadvali('Жинси бўйича', undefined, 'Жинси', jinsSanoq, jamiFuqaro, true);
    if (jins) profilJadvallari.push(jins);
    const yoshJ = sanoqJadvali(
      'Ёш гуруҳлари',
      'Ҳар гуруҳда бошқа чора ишлайди: ёшларга касб-ҳунар ва биринчи иш ўрни, 46 ёшдан кейин эса иш шароити ва соғлиқ масаласи биринчи ўринга чиқади.',
      'Ёш гуруҳи',
      yoshSanoq,
      jamiFuqaro,
      true
    );
    if (yoshJ) profilJadvallari.push(yoshJ);
    const malumotJ = sanoqJadvali('Маълумоти', undefined, 'Маълумот даражаси', malumotSanoq, jamiFuqaro, true);
    if (malumotJ) profilJadvallari.push(malumotJ);
    const tayyorlikJ = sanoqJadvali(
      'Ишга тайёрлиги',
      'Фуқаронинг ўзи айтган тайёрлик даражаси. «Дарҳол тайёр» бўлганлар билан аввал ишлаш керак — натижа тезроқ кўринади.',
      'Тайёрлик',
      tayyorlikSanoq,
      jamiFuqaro,
      true
    );
    if (tayyorlikJ) profilJadvallari.push(tayyorlikJ);
    const muddatJ = sanoqJadvali(
      'Ишсизлик муддати',
      'Хонадон анкетасидан олинади. Уч йилдан ортиқ ишсиз одам одатдаги таклиф билан ишга қайтмайди — унга алоҳида дастур керак.',
      'Муддат',
      muddatSanoq,
      jamiFuqaro
    );
    if (muddatJ) profilJadvallari.push(muddatJ);

    const toifaJ = sanoqJadvali(
      'Ҳайдовчилик гувоҳномаси тоифалари',
      'Бўш ўринларнинг катта қисми тоифага боғлиқ: C — юк машинаси, D — автобус, F — трактор. Бир фуқарода бир нечта тоифа бўлиши мумкин, шунинг учун устун йиғиндиси гувоҳномаси борлар сонидан кўп.',
      'Тоифа',
      toifaSanoq,
      guvohnoma
    );
    if (toifaJ) profilJadvallari.push(toifaJ);

    const qoshimchaQatorlar: Qator[] = [
      { nomi: 'Касб-ҳунар ўрганишга эҳтиёж билдирган', qiymatlar: [son(kasbEhtiyoji), foiz(foizi(kasbEhtiyoji, jamiFuqaro))] },
      { nomi: 'Ҳайдовчилик гувоҳномаси бор', qiymatlar: [son(guvohnoma), foiz(foizi(guvohnoma, jamiFuqaro))] },
      { nomi: 'IT-шаҳарчага йўналтирилиши белгиланган', qiymatlar: [son(itVaucher), foiz(foizi(itVaucher, jamiFuqaro))] },
      { nomi: 'Ногиронлиги бор', qiymatlar: [son(nogironlik), foiz(foizi(nogironlik, jamiFuqaro))] },
      { nomi: 'Имтиёзга эҳтиёжи бор', qiymatlar: [son(imtiyoz), foiz(foizi(imtiyoz, jamiFuqaro))] },
    ].filter((q) => q.qiymatlar[0] !== '0');

    if (qoshimchaQatorlar.length) {
      profilJadvallari.push({
        sarlavha: 'Қўшимча белгилар',
        izoh: 'Бу белгилар бир-бирини истисно қилмайди — бир фуқаро бир нечтасига кириши мумкин.',
        ustunlar: [
          { sarlavha: 'Белги' },
          { sarlavha: 'Фуқаро', raqamli: true, eni: 26 },
          { sarlavha: 'Улуши', raqamli: true, eni: 22 },
        ],
        qatorlar: qoshimchaQatorlar,
      });
    }

    const diagrammalar: Bolim['diagrammalar'] = [];
    if (yoshSanoq.length) {
      diagrammalar.push({
        turi: 'ustun',
        sarlavha: 'Ёш гуруҳлари — фуқаро сони',
        nomlar: yoshSanoq.map((x) => x.nomi),
        qatorlar: [{ nomi: 'Фуқаро', qiymatlar: yoshSanoq.map((x) => x.soni) }],
      });
    }
    if (jinsSanoq.length > 1) {
      diagrammalar.push({
        turi: 'doira',
        sarlavha: 'Жинси бўйича тақсимот',
        nomlar: jinsSanoq.map((x) => x.nomi),
        qatorlar: [{ nomi: 'Фуқаро', qiymatlar: jinsSanoq.map((x) => x.soni) }],
      });
    }
    if (malumotSanoq.length > 1) {
      diagrammalar.push({
        turi: 'gorizontal',
        sarlavha: 'Маълумот даражаси',
        nomlar: malumotSanoq.map((x) => x.nomi),
        qatorlar: [{ nomi: 'Фуқаро', qiymatlar: malumotSanoq.map((x) => x.soni) }],
      });
    }

    bolimlar.push({
      kalit: 'fuqaro',
      sarlavha: 'Ишсиз фуқаролар профили',
      varaqNomi: 'Фуқаро профили',
      kirish:
        'Умумий сон чора танлашга ёрдам бермайди — таркиб ёрдам беради. Бу бўлим «кимлар ишсиз» деган саволга жавоб беради.',
      korsatkichlar: [
        { nomi: 'Жами фуқаро', qiymat: son(jamiFuqaro) },
        {
          nomi: 'Касб-ҳунарга эҳтиёж',
          qiymat: son(kasbEhtiyoji),
          izoh: `${foiz(foizi(kasbEhtiyoji, jamiFuqaro))}и`,
          yonalish: 'kop-yaxshi',
        },
        { nomi: 'Таклиф берилган', qiymat: son(taklifJadvali), yonalish: 'kop-yaxshi' },
        { nomi: 'Ногиронлиги бор', qiymat: son(nogironlik), yonalish: 'betaraf' },
      ],
      jadvallar: profilJadvallari,
      diagrammalar: diagrammalar.length ? diagrammalar : undefined,
      yangiSahifa: true,
    });

    /* ── Касб-ҳунар талаби ва берилган таклифлар ────────────── */
    const kasbXarita = new Map<string, number>();
    for (const s of shaxslar) {
      if (!s.kasbHunarEhtiyoji || !s.organmoqchiKasb) continue;
      const k = s.organmoqchiKasb.trim();
      if (k) kasbXarita.set(k, (kasbXarita.get(k) ?? 0) + 1);
    }
    const kasblar = [...kasbXarita.entries()]
      .map(([nomi, soni]) => ({ nomi, soni }))
      .sort((a, b) => b.soni - a.soni)
      .slice(0, 15);

    const taklifSanoq = katalogSanoq(
      shaxslar.flatMap((s) => s.takliflar),
      BANDLIK_TAKLIFI
    );

    if (kasblar.length || taklifSanoq.length) {
      const jadvallar: Jadval[] = [];
      if (kasblar.length) {
        jadvallar.push({
          sarlavha: 'Қайси касбни ўрганмоқчи',
          izoh:
            'Битта касб бўйича 15 ва ундан кўп талабгор бўлса — гуруҳ тўлади ва курс очиш иқтисодий жиҳатдан асосли бўлади.',
          ustunlar: [
            { sarlavha: 'Касб' },
            { sarlavha: 'Талабгор', raqamli: true, eni: 26 },
            { sarlavha: 'Курс тўладими', eni: 34 },
          ],
          qatorlar: kasblar.map((k) => ({
            nomi: k.nomi,
            qiymatlar: [son(k.soni), k.soni >= 15 ? 'Ҳа — гуруҳ тўлади' : `Йўқ — ${15 - k.soni} та етмайди`],
          })),
        });
      }
      const taklifJ = sanoqJadvali(
        'Берилган таклифлар тури',
        'Бир фуқарога бир нечта таклиф берилиши мумкин',
        'Таклиф тури',
        taklifSanoq,
        jamiFuqaro
      );
      if (taklifJ) jadvallar.push(taklifJ);

      bolimlar.push({
        kalit: 'kasb',
        sarlavha: 'Касб-ҳунар талаби ва таклифлар',
        varaqNomi: 'Касб-ҳунар талаби',
        kirish:
          'Курс очиш — энг арзон бандлик чораси, аммо фақат гуруҳ тўлганда ишлайди. Бу жадвал қайси йўналишда гуруҳ тўлганини кўрсатади.',
        jadvallar,
        diagrammalar: kasblar.length
          ? [
              {
                turi: 'gorizontal',
                sarlavha: 'Касб-ҳунар талаби — талабгор сони',
                nomlar: kasblar.slice(0, 10).map((k) => k.nomi),
                qatorlar: [{ nomi: 'Талабгор', qiymatlar: kasblar.slice(0, 10).map((k) => k.soni) }],
              },
            ]
          : undefined,
      });
    }
  }

  /* ── IT-шаҳарча ваучерлари ────────────────────────────────── */

  /*
   * Занжирнинг СЎНГГИ ҳалқаси: ҳоким натижани мана шу ердан
   * кўради.
   *
   * Илгари бу бўлим йўқ эди — фақат «IT-шаҳарча ваучери билан
   * йўналтирилган: 12» деган БИТТА қатор бор эди. Ундан
   * билиб бўлмасди: ўша 12 таси ўқидими, тугатдими, ишга
   * жойлашдими. Ҳоким «12 та» деган рақамга қараб қарор
   * қабул қила олмайди.
   *
   * Энди тўрт савол ҳам жавоб топади:
   *   1. Нечта ваучер берилди
   *   2. Нечтаси натижа берди (тугатди ёки ишга жойлашди)
   *   3. Қайси йўналишга талаб кўп (кейинги гуруҳ шунга)
   *   4. Нечтаси ҲАЛИ КУТЯПТИ — занжир қаерда узилган
   */
  const itJami = itVaucherHolatlari.reduce((x, h) => x + h._count, 0);

  if (itJami > 0 || itNavbatda > 0) {
    const holatSoni = (h: string) =>
      itVaucherHolatlari.find((x) => x.holati === h)?._count ?? 0;

    const tugatgan = holatSoni('TUGATDI') + holatSoni('ISHGA_JOYLASHDI');
    const joylashgan = holatSoni('ISHGA_JOYLASHDI');
    const tashlagan = holatSoni('TASHLAB_KETDI');

    const holatQatorlari: Qator[] = IT_VAUCHER_HOLATI.map((h) => ({
      h,
      n: holatSoni(h.qiymat),
    }))
      .filter((x) => x.n > 0)
      .map((x) => ({
        nomi: x.h.kirill,
        qiymatlar: [son(x.n), foiz(foizi(x.n, itJami))],
      }));

    /* Диаграмма учун ХОМ сонлар, жадвал учун форматланган сатрлар */
    const yonalishlar = [...itVaucherYonalishlari]
      .sort((a, b) => b._count - a._count)
      .map((y) => ({ nomi: kirillcha(IT_YONALISHI, y.yonalish), soni: y._count }));

    const yonalishQatorlari: Qator[] = yonalishlar.map((y) => ({
      nomi: y.nomi,
      qiymatlar: [son(y.soni), foiz(foizi(y.soni, itJami))],
    }));

    const jadvallar: Jadval[] = [];

    if (holatQatorlari.length) {
      jadvallar.push({
        sarlavha: 'Ваучерлар ҳолати',
        izoh:
          'Ваучер берилиши — бошланиши, натижа эмас. Курсни тугатган ва ишга жойлашган сатрлар ҳақиқий натижани кўрсатади.',
        ustunlar: [
          { sarlavha: 'Ҳолат' },
          { sarlavha: 'Сони', raqamli: true, eni: 22 },
          { sarlavha: 'Улуши', raqamli: true, eni: 22 },
        ],
        qatorlar: holatQatorlari,
      });
    }

    if (yonalishQatorlari.length) {
      jadvallar.push({
        sarlavha: 'Йўналишлар кесимида',
        izoh: 'Кейинги гуруҳ қайси йўналишда очилиши керак — шу жадвалдан кўринади.',
        ustunlar: [
          { sarlavha: 'Йўналиш' },
          { sarlavha: 'Ваучер', raqamli: true, eni: 22 },
          { sarlavha: 'Улуши', raqamli: true, eni: 22 },
        ],
        qatorlar: yonalishQatorlari,
      });
    }

    bolimlar.push({
      kalit: 'it-vaucher',
      sarlavha: 'IT-шаҳарча ваучерлари',
      varaqNomi: 'IT-шаҳарча',
      kirish:
        'Фуқаро IT йўналишини ўрганмоқчи бўлса, уни туманда курс гуруҳи тўлишини кутишга қолдирмасдан, ваучер билан IT-шаҳарчага йўналтириш мумкин — ўқиш ТЕКИН ва битта одам ҳам юборилади. Бу бўлим ваучер берилгандан кейин НИМА БЎЛГАНИНИ кўрсатади.',
      korsatkichlar: [
        { nomi: 'Берилган ваучер', qiymat: son(itJami) },
        {
          nomi: 'Курсни тугатди',
          qiymat: son(tugatgan),
          izoh: itJami > 0 ? `берилганларнинг ${foiz(foizi(tugatgan, itJami))} и` : undefined,
        },
        {
          nomi: 'Касб бўйича ишга жойлашди',
          qiymat: son(joylashgan),
          izoh: itJami > 0 ? `берилганларнинг ${foiz(foizi(joylashgan, itJami))} и` : undefined,
        },
        {
          /*
           * Энг муҳим кўрсаткич ва у ЯШИРИЛМАЙДИ.
           *
           * Маҳалла ходими «IT ўрганмоқчи» деб белгилаган,
           * аммо бандлик маркази ҳали ваучер бермаган
           * фуқаролар. Бу рақам ўсиб бораётган бўлса,
           * занжир ишламаяпти.
           */
          nomi: 'Ваучер кутмоқда',
          qiymat: son(itNavbatda),
          izoh: itNavbatda > 0 ? 'йўналтирилган, аммо ваучер ҳали берилмаган' : undefined,
        },
        ...(tashlagan > 0
          ? [
              {
                nomi: 'Ўқишни ташлаб кетди',
                qiymat: son(tashlagan),
                izoh: 'сабаблари тизимда ҳар бир ваучер остида ёзилган',
              },
            ]
          : []),
      ],
      jadvallar,
      diagrammalar: yonalishlar.length
        ? [
            {
              turi: 'gorizontal',
              sarlavha: 'IT йўналишлари — ваучер сони',
              nomlar: yonalishlar.slice(0, 10).map((y) => y.nomi),
              qatorlar: [
                { nomi: 'Ваучер', qiymatlar: yonalishlar.slice(0, 10).map((y) => y.soni) },
              ],
            },
          ]
        : undefined,
    });
  }

  /* ── Чора-тадбирлар ───────────────────────────────────────── */
  if (jamiTopshiriq > 0) {
    const holatSanoq = new Map<TopshiriqHolati, number>();
    for (const t of topshiriqHolatlari) holatSanoq.set(t.holati, t._count);

    const tartib: TopshiriqHolati[] = [
      'KUTILMOQDA',
      'BAJARILMOQDA',
      'BAJARILDI',
      'KECHIKDI',
      'BEKOR_QILINDI',
    ];
    const holatQatorlari: Qator[] = tartib
      .map((h) => ({ h, n: holatSanoq.get(h) ?? 0 }))
      .filter((x) => x.n > 0)
      .map((x) => ({
        nomi: TOPSHIRIQ_HOLATI[x.h].kirill,
        qiymatlar: [son(x.n), foiz(foizi(x.n, jamiTopshiriq))],
      }));

    const bajarildi = holatSanoq.get('BAJARILDI') ?? 0;
    const kechikdi = holatSanoq.get('KECHIKDI') ?? 0;

    const kechikkanXarita = new Map<string, number>();
    for (const k of kechikkanlar) kechikkanXarita.set(k.masulTashkilot, k._count);

    const tashkilotQatorlari: Qator[] = [...topshiriqTashkilotlari]
      .sort((a, b) => b._count - a._count)
      .map((t) => {
        const kechikkan = kechikkanXarita.get(t.masulTashkilot) ?? 0;
        return {
          nomi: kirillcha(MASUL_TASHKILOT, t.masulTashkilot),
          qiymatlar: [son(t._count), son(kechikkan), foiz(foizi(kechikkan, t._count))],
        };
      });

    bolimlar.push({
      kalit: 'topshiriq',
      sarlavha: 'Чора-тадбирлар ва масъуллик',
      varaqNomi: 'Чора-тадбирлар',
      kirish:
        'Ҳар бир аниқланган муаммо учун топшириқ берилади ва масъул ташкилот белгиланади. Бу бўлим ким сўзида турганини кўрсатади.',
      korsatkichlar: [
        { nomi: 'Жами топшириқ', qiymat: son(jamiTopshiriq) },
        {
          nomi: 'Бажарилди',
          qiymat: son(bajarildi),
          izoh: `${foiz(foizi(bajarildi, jamiTopshiriq))}и`,
          yonalish: 'kop-yaxshi',
          foiz: foizi(bajarildi, jamiTopshiriq),
        },
        {
          nomi: 'Муддати ўтган',
          qiymat: son(kechikdi),
          izoh: 'дарҳол чора талаб қилинади',
          yonalish: 'kam-yaxshi',
        },
        {
          nomi: 'Ишда',
          qiymat: son(holatSanoq.get('BAJARILMOQDA') ?? 0),
          yonalish: 'betaraf',
        },
      ],
      jadvallar: [
        {
          sarlavha: 'Топшириқлар ҳолати',
          ustunlar: [
            { sarlavha: 'Ҳолат' },
            { sarlavha: 'Топшириқ', raqamli: true, eni: 26 },
            { sarlavha: 'Улуши', raqamli: true, eni: 22 },
          ],
          qatorlar: holatQatorlari,
        },
        ...(tashkilotQatorlari.length
          ? [
              {
                sarlavha: 'Масъул ташкилотлар кесимида',
                izoh:
                  'Кечикиш улуши юқори бўлган ташкилот билан алоҳида суҳбат керак. Топшириқ берилиб, бажарилмаса — фуқаро тизимга ишонмай қўяди.',
                ustunlar: [
                  { sarlavha: 'Ташкилот' },
                  { sarlavha: 'Топшириқ', raqamli: true, eni: 24 },
                  { sarlavha: 'Кечиккан', raqamli: true, eni: 24 },
                  { sarlavha: 'Кечикиш', raqamli: true, eni: 22 },
                ],
                qatorlar: tashkilotQatorlari,
              },
            ]
          : []),
      ],
      diagrammalar: [
        {
          turi: 'doira',
          sarlavha: 'Топшириқлар ҳолати',
          nomlar: holatQatorlari.map((q) => q.nomi),
          qatorlar: [
            {
              nomi: 'Топшириқ',
              qiymatlar: holatQatorlari.map((q) => Number(String(q.qiymatlar[0]).replace(/\D/g, '')) || 0),
            },
          ],
        },
        ...(tashkilotQatorlari.length
          ? ([
              {
                turi: 'gorizontal' as const,
                sarlavha: 'Ташкилотлар — жами ва кечиккан топшириқ',
                nomlar: tashkilotQatorlari.slice(0, 10).map((q) => q.nomi),
                qatorlar: [
                  {
                    nomi: 'Жами',
                    qiymatlar: tashkilotQatorlari
                      .slice(0, 10)
                      .map((q) => Number(String(q.qiymatlar[0]).replace(/\D/g, '')) || 0),
                  },
                  {
                    nomi: 'Кечиккан',
                    qiymatlar: tashkilotQatorlari
                      .slice(0, 10)
                      .map((q) => Number(String(q.qiymatlar[1]).replace(/\D/g, '')) || 0),
                  },
                ],
              },
            ])
          : []),
      ],
      yangiSahifa: true,
    });
  }

  /* ── Бўш иш ўринлари ──────────────────────────────────────── */
  if (jamiIshOrni > 0) {
    const yonalishQatorlari: Qator[] = [...ishOrniYonalishlari]
      .map((y) => ({
        nomi: y.yonalish ? kirillcha(KASB_YONALISHI, y.yonalish) : 'Йўналиш кўрсатилмаган',
        soni: y._sum.ornlarSoni ?? 0,
        korxona: y._count,
      }))
      .filter((y) => y.soni > 0)
      .sort((a, b) => b.soni - a.soni)
      .map((y) => ({
        nomi: y.nomi,
        qiymatlar: [son(y.soni), son(y.korxona), foiz(foizi(y.soni, jamiIshOrni))],
      }));

    const ortacha = raqamga(maoshJamlari._avg.maosh as unknown as bigint | null);

    bolimlar.push({
      kalit: 'ishorni',
      sarlavha: 'Бўш иш ўринлари',
      varaqNomi: 'Иш ўринлари',
      kirish:
        'Талаб ва таклифни ёнма-ён қўйиш учун. Иш ўрни кўп бўлган йўналишда курс очиш — энг тез натижа берадиган чора.',
      korsatkichlar: [
        {
          nomi: 'Ҳозир бўш ўрин',
          qiymat: son(Math.max(0, jamiIshOrni - bandFaolOrin)),
          izoh: `эълон қилинган ${son(jamiIshOrni)} тадан · ${son(bandFaolOrin)} таси банд`,
          yonalish: 'kop-yaxshi',
        },
        { nomi: 'Эълон қилган корхона', qiymat: son(ishOrinlari._count) },
        {
          nomi: 'Эълон орқали ишга жойлашган',
          qiymat: son(elonOrqaliJoylashgan),
          izoh: 'ёпилган эълонлар билан бирга',
          yonalish: 'kop-yaxshi',
        },
        ...(ortacha > 0
          ? [
              {
                nomi: 'Ўртача маош',
                qiymat: `${pul(ortacha)} сўм`,
                izoh: `${pul(raqamga(maoshJamlari._min.maosh as unknown as bigint | null))} — ${pul(raqamga(maoshJamlari._max.maosh as unknown as bigint | null))} сўм`,
              } as const,
            ]
          : []),
      ],
      jadvallar: yonalishQatorlari.length
        ? [
            {
              sarlavha: 'Йўналишлар кесимида',
              ustunlar: [
                { sarlavha: 'Йўналиш' },
                { sarlavha: 'Бўш ўрин', raqamli: true, eni: 24 },
                { sarlavha: 'Корхона', raqamli: true, eni: 22 },
                { sarlavha: 'Улуши', raqamli: true, eni: 22 },
              ],
              qatorlar: yonalishQatorlari,
            },
          ]
        : undefined,
      diagrammalar: yonalishQatorlari.length
        ? [
            {
              turi: 'gorizontal',
              sarlavha: 'Бўш иш ўринлари — йўналишлар бўйича',
              nomlar: yonalishQatorlari.slice(0, 10).map((q) => q.nomi),
              qatorlar: [
                {
                  nomi: 'Бўш ўрин',
                  qiymatlar: yonalishQatorlari
                    .slice(0, 10)
                    .map((q) => Number(String(q.qiymatlar[0]).replace(/\D/g, '')) || 0),
                },
              ],
            },
          ]
        : undefined,
    });
  }

  return { bolimlar, jamiFuqaro, jamiTopshiriq, jamiIshOrni };
}

/** Каталог номлари ташқарида ҳам керак бўлади */
export { KASB_YONALISHI };
