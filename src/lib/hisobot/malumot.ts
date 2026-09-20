/**
 * ============================================================
 *  ҲИСОБОТНИ ЙИҒИШ
 *
 *  Битта кириш нуқтаси: `hisobotOl(qamrov, tayyorlagan)`.
 *  Ким чақирса ҳам — ҳоким панели, маҳалла ходими ёки API —
 *  бир хил шакл қайтади. PDF ва Excel шу шаклдан ўқийди, шунинг
 *  учун иккисида бир хил рақам чиқади.
 *
 *  ── Нега сервер томонда ──
 *
 *  Браузерга фақат тайёр жамланма боради. Хом ёзувлар — Ф.И.Ш.,
 *  манзил, телефон — умуман чиқмайди. Агар ҳисобот браузерда
 *  йиғилса, ҳисоботга кирмайдиган устунлар ҳам тармоққа
 *  тушарди ва уларни ишлаб турган панелда кўриб бўларди.
 *
 *  ── Алифбо ──
 *
 *  Ҳамма матн КИРИЛЛДА йиғилади. Лотин керак бўлса, охирида
 *  битта рекурсив ўтиш билан ўгирилади (`ogir()`). Ҳар бир
 *  сатрни алоҳида ўраш хато қилишга олиб келарди: 200 дан ортиқ
 *  матн бор, биттасини эсдан чиқарсанг битта ҳисоботда икки
 *  алифбо аралашади.
 * ============================================================
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { tahlilOl } from '@/lib/tahlil';
import { lotinga } from '@/lib/alifbo';
import { MABLAG_YONALISHI, TUMAN, VILOYAT, kirillcha } from '@/lib/constants';
import { ISHSIZ_HOLATI, VORONKA } from '@/lib/ishsiz-holati';
import type { Bolim, Hisobot, Jadval, Korsatkich, Qamrov, Qator } from './turlar';
import { foiz, foizi, pul, son } from './format';
import { xonadonBolimlari } from './xonadon-profili';
import { fuqaroBolimlari } from './fuqaro-profili';
import { xulosaOl } from './xulosa';

/**
 * Хатловдан ўтган хонадонлар.
 *
 * Қоралама ҳисобга олинмайди: у ҳали тўлдирилмаган ва ундаги
 * нол қийматлар барча фоизларни пастга тортарди.
 */
function xonadonFiltri(mahallaId?: string): Prisma.HouseholdWhereInput {
  return { holati: { not: 'QORALAMA' }, ...(mahallaId ? { mahallaId } : {}) };
}

/** Маҳаллалар кесими — фақат туман ҳисоботида керак */
function mahallalarBolimi(tahlil: Awaited<ReturnType<typeof tahlilOl>>): Bolim | null {
  if (tahlil.qamrov.length < 2) return null;

  const qatorlar: Qator[] = [...tahlil.qamrov]
    .sort((a, b) => b.qamrovFoizi - a.qamrovFoizi)
    .map((m) => ({
      nomi: m.nomiKirill,
      qiymatlar: [
        son(m.bazaXonadon),
        son(m.xatlovXonadon),
        foiz(m.qamrovFoizi),
        son(m.bazaIshsiz),
        son(m.aniqlangan),
        son(m.joylashtirilgan),
        foiz(m.natijaFoizi),
      ],
    }));

  const j = tahlil.jami;
  qatorlar.push({
    nomi: 'ЖАМИ ТУМАН',
    qiymatlar: [
      son(j.bazaXonadon),
      son(j.xatlovXonadon),
      foiz(foizi(j.xatlovXonadon, j.bazaXonadon)),
      son(j.bazaIshsiz),
      son(j.aniqlangan),
      son(j.joylashtirilgan),
      foiz(foizi(j.joylashtirilgan, j.aniqlangan)),
    ],
    jami: true,
  });

  // Диаграмма учун энг орқада ва энг олдинда борган 10 та
  const tartiblangan = [...tahlil.qamrov].sort((a, b) => b.qamrovFoizi - a.qamrovFoizi);
  const eng = tartiblangan.slice(0, 10);
  const oxir = tartiblangan.slice(-10).reverse();

  return {
    kalit: 'mahallalar',
    sarlavha: 'Маҳаллалар кесимида',
    varaqNomi: 'Маҳаллалар',
    kirish:
      'Қамров — рўйхатдаги хонадонлардан нечтаси хатловдан ўтгани. Натижа — аниқланган ишсизлардан нечтаси ишга жойлашгани. Иккиси бошқа-бошқа масала: қамров паст бўлса иш ҳали бошланмаган, натижа паст бўлса иш бошланган-у, самара бермаган.',
    jadvallar: [
      {
        sarlavha: 'Барча маҳаллалар — қамров бўйича тартибланган',
        ustunlar: [
          { sarlavha: 'МФЙ', eni: 38 },
          { sarlavha: 'Хонадон', raqamli: true, eni: 20 },
          { sarlavha: 'Хатлов', raqamli: true, eni: 19 },
          { sarlavha: 'Қамров', raqamli: true, eni: 19 },
          { sarlavha: 'Ишсиз', raqamli: true, eni: 18 },
          { sarlavha: 'Аниқл.', raqamli: true, eni: 18 },
          { sarlavha: 'Жойл.', raqamli: true, eni: 18 },
          { sarlavha: 'Натижа', raqamli: true, eni: 19 },
        ],
        qatorlar,
      },
    ],
    diagrammalar: [
      {
        turi: 'gorizontal',
        sarlavha: 'Хатлов қамрови — энг юқори 10 та МФЙ',
        nomlar: eng.map((m) => m.nomiKirill),
        qatorlar: [{ nomi: 'Қамров, %', qiymatlar: eng.map((m) => m.qamrovFoizi) }],
        foiz: true,
      },
      {
        turi: 'gorizontal',
        sarlavha: 'Хатлов қамрови — энг орқада қолган 10 та МФЙ',
        izoh: 'Кейинги ҳафтадаги иш режаси айнан шу рўйхатдан бошланади.',
        nomlar: oxir.map((m) => m.nomiKirill),
        qatorlar: [{ nomi: 'Қамров, %', qiymatlar: oxir.map((m) => m.qamrovFoizi) }],
        foiz: true,
      },
    ],
    yangiSahifa: true,
  };
}

/** Ойлик динамика — чизиқли график */
function dinamikaBolimi(tahlil: Awaited<ReturnType<typeof tahlilOl>>): Bolim | null {
  const d = tahlil.dinamika.filter((x) => x.aniqlangan > 0 || x.joylashtirilgan > 0);
  if (d.length < 2) return null;

  return {
    kalit: 'dinamika',
    sarlavha: 'Ойлик динамика',
    varaqNomi: 'Ойлик динамика',
    kirish:
      'Тўпланиб борадиган сон: ҳар ой аввалгиларига қўшилади. Чизиқ ётиб қолса — ўша ойда иш тўхтаган.',
    jadvallar: [
      {
        sarlavha: 'Ойма-ой',
        ustunlar: [
          { sarlavha: 'Ой' },
          { sarlavha: 'Хатлов', raqamli: true, eni: 24 },
          { sarlavha: 'Аниқланган', raqamli: true, eni: 26 },
          { sarlavha: 'Жойлашган', raqamli: true, eni: 26 },
        ],
        qatorlar: d.map((x) => ({
          nomi: x.yorliq,
          qiymatlar: [son(x.xatlovXonadon), son(x.aniqlangan), son(x.joylashtirilgan)],
        })),
      },
    ],
    diagrammalar: [
      {
        turi: 'chiziq',
        sarlavha: 'Аниқланган ва жойлаштирилган — тўпланиб борадиган сон',
        nomlar: d.map((x) => x.yorliq),
        qatorlar: [
          { nomi: 'Аниқланган', qiymatlar: d.map((x) => x.aniqlangan) },
          { nomi: 'Жойлаштирилган', qiymatlar: d.map((x) => x.joylashtirilgan) },
        ],
      },
      {
        turi: 'chiziq',
        sarlavha: 'Хатловдан ўтган хонадонлар — тўпланиб борадиган сон',
        nomlar: d.map((x) => x.yorliq),
        qatorlar: [{ nomi: 'Хонадон', qiymatlar: d.map((x) => x.xatlovXonadon) }],
      },
    ],
  };
}

/** Тоифалар — базадаги рўйхатлар кесими */
function toifalarBolimi(tahlil: Awaited<ReturnType<typeof tahlilOl>>): Bolim | null {
  const t = tahlil.toifalar;
  const royxat = [
    { nomi: 'Аёллар дафтари', soni: t.ayollarDaftari },
    { nomi: 'Ижтимоий реестр', soni: t.ijtimoiyReestr },
    { nomi: 'Миграциядан қайтган', soni: t.migratsiyadanQaytgan },
    { nomi: 'Олий таълим битирувчиси', soni: t.oliyBitiruvchi },
    { nomi: 'Ўрта махсус битирувчиси', soni: t.ortaMaxsusBitiruvchi },
  ].filter((x) => x.soni > 0);

  if (!royxat.length) return null;

  const butun = tahlil.jami.bazaIshsiz;

  return {
    kalit: 'toifalar',
    sarlavha: 'Ишсизлар таркиби — базадаги тоифалар',
    varaqNomi: 'Тоифалар',
    kirish:
      'Бу сонлар туман базасидан олинади, хатловдан эмас. Тоифалар КЕСИШАДИ: бир киши ҳам аёллар дафтарида, ҳам ижтимоий реестрда бўлиши мумкин — шунинг учун улушлар йиғиндиси 100 фоиздан ошади.',
    jadvallar: [
      {
        sarlavha: 'Тоифалар',
        ustunlar: [
          { sarlavha: 'Тоифа' },
          { sarlavha: 'Киши', raqamli: true, eni: 26 },
          { sarlavha: 'Рўйхатдаги ишсизларга нисбатан', raqamli: true, eni: 40 },
        ],
        qatorlar: royxat.map((x) => ({
          nomi: x.nomi,
          qiymatlar: [son(x.soni), foiz(foizi(x.soni, butun))],
        })),
      },
    ],
    diagrammalar: [
      {
        turi: 'doira',
        sarlavha: 'Ишсизлар таркиби',
        izoh: 'Тоифалар кесишгани учун доира яқинлаштирилган сурат беради, аниқ тақсимот эмас.',
        nomlar: royxat.map((x) => x.nomi),
        qatorlar: [{ nomi: 'Киши', qiymatlar: royxat.map((x) => x.soni) }],
      },
    ],
  };
}

/** Бюджет талаби — режалаштириш учун */
function byudjetBolimi(tahlil: Awaited<ReturnType<typeof tahlilOl>>): Bolim | null {
  if (!tahlil.byudjet.length || tahlil.jamiTalab <= 0) return null;

  /*
   * Йўналиш номи базада ЛОТИН қийматида сақланади (каталогнинг
   * `qiymat` майдони). Ҳисоботда эса у бошқа матнлар билан бир
   * қаторда туради ва ўша алифбода бўлиши керак — шунинг учун
   * аввал кириллга ўгирилади, кейин керак бўлса `ogir()` уни
   * лотинга қайтаради.
   */
  const qatorlar: Qator[] = tahlil.byudjet.map((b) => ({
    nomi: kirillcha(MABLAG_YONALISHI, b.yonalish),
    qiymatlar: [
      `${pul(b.summa)} сўм`,
      son(b.oila),
      `${pul(b.oila > 0 ? b.summa / b.oila : 0)} сўм`,
      foiz(foizi(b.summa, tahlil.jamiTalab)),
    ],
  }));

  qatorlar.push({
    nomi: 'ЖАМИ',
    qiymatlar: [
      `${pul(tahlil.jamiTalab)} сўм`,
      son(tahlil.byudjet.reduce((s, b) => s + b.oila, 0)),
      '',
      foiz(100),
    ],
    jami: true,
  });

  return {
    kalit: 'byudjet',
    sarlavha: 'Кредит-субсидия талаби — бюджет режаси учун',
    varaqNomi: 'Бюджет талаби',
    kirish:
      'Хонадонларнинг ўзлари кўрсатган маблағ талаби, йўналишлар бўйича жамланган. Бу тасдиқланган рақам эмас — келгуси йил режасини тузишда бошланғич нуқта.',
    korsatkichlar: [
      { nomi: 'Жами сўралган маблағ', qiymat: `${pul(tahlil.jamiTalab)} сўм` },
      {
        nomi: 'Талабгор оила',
        qiymat: son(tahlil.byudjet.reduce((s, b) => s + b.oila, 0)),
      },
      { nomi: 'Йўналишлар сони', qiymat: son(tahlil.byudjet.length) },
    ],
    jadvallar: [
      {
        sarlavha: 'Йўналишлар бўйича',
        ustunlar: [
          { sarlavha: 'Йўналиш' },
          { sarlavha: 'Сўралган сумма', raqamli: true, eni: 30 },
          { sarlavha: 'Оила', raqamli: true, eni: 18 },
          { sarlavha: 'Ўртача', raqamli: true, eni: 28 },
          { sarlavha: 'Улуши', raqamli: true, eni: 20 },
        ],
        qatorlar,
      },
    ],
    diagrammalar: [
      {
        turi: 'gorizontal',
        sarlavha: 'Сўралган маблағ — йўналишлар бўйича (млн сўм)',
        nomlar: tahlil.byudjet.map((b) => kirillcha(MABLAG_YONALISHI, b.yonalish)),
        qatorlar: [
          {
            nomi: 'млн сўм',
            qiymatlar: tahlil.byudjet.map((b) => Math.round(b.summa / 1_000_000)),
          },
        ],
      },
    ],
  };
}

/* ═══════════════════════════════════════════════════════════ */

/**
 * Барча матнни лотинга ўгиради.
 *
 * Рекурсив: объект, массив ва сатрлардан ўтади, сон ва мантиқий
 * қийматларга тегмайди. Битта ўтиш — битта манба, шунинг учун
 * «биттасини эсдан чиқардим» деган хато бўлмайди.
 */
function ogir<T>(qiymat: T): T {
  if (typeof qiymat === 'string') return lotinga(qiymat) as unknown as T;
  if (Array.isArray(qiymat)) return qiymat.map(ogir) as unknown as T;
  if (qiymat && typeof qiymat === 'object') {
    const natija: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(qiymat as Record<string, unknown>)) {
      natija[k] = ogir(v);
    }
    return natija as T;
  }
  return qiymat;
}

export interface HisobotSorovi {
  qamrov: Qamrov;
  /** Ким тайёрлагани — ҳужжат пойида кўринади */
  tayyorlagan: string;
  /** Лотин ёзувида керакми */
  lotin: boolean;
  /** AI хулосасини сўраш. Тезкор кўриниш учун ўчирилади. */
  aiXulosa?: boolean;
}

export async function hisobotOl(sorov: HisobotSorovi): Promise<Hisobot> {
  const mahallaId = sorov.qamrov.turi === 'mahalla' ? sorov.qamrov.mahallaId : undefined;
  const qamrovNomi =
    sorov.qamrov.turi === 'mahalla'
      ? `${sorov.qamrov.nomiKirill} МФЙ`
      : `${TUMAN === 'Xatirchi' ? 'Хатирчи' : TUMAN} тумани`;

  const filtr = xonadonFiltri(mahallaId);

  /*
   * Жами хонадон биринчи саналади: хонадон бўлимларидаги барча
   * улушлар шунга нисбатан ҳисобланади, шунинг учун у сўровдан
   * аввал керак. Қолган учтаси параллел кетади.
   */
  const jamiXonadon = await prisma.household.count({ where: filtr });

  const [tahlil, fuqarolar, xonadonBolimlar] = await Promise.all([
    tahlilOl(mahallaId),
    fuqaroBolimlari(mahallaId),
    xonadonBolimlari(filtr, jamiXonadon),
  ]);

  /* ── Бўлимлар тартиби ── */
  const bolimlar: Bolim[] = [];

  // 1. Бандлик — асосий мақсад, шунинг учун биринчи
  const voronka = fuqarolar.bolimlar.find((b) => b.kalit === 'voronka');
  if (voronka) bolimlar.push(voronka);

  const dinamika = dinamikaBolimi(tahlil);
  if (dinamika) bolimlar.push(dinamika);

  // 2. Маҳаллалар кесими (фақат туман)
  if (!mahallaId) {
    const m = mahallalarBolimi(tahlil);
    if (m) bolimlar.push(m);
  }

  /*
   * 3. Фуқаро профили, касб талаби ва IT-шаҳарча.
   *
   * IT-шаҳарча айнан касб талабидан КЕЙИН туради: иккови ҳам
   * «одам нимани ўрганмоқчи» деган саволга жавоб беради,
   * фарқи фақат йўлида. Туманда курс гуруҳ тўлишини кутади,
   * IT-шаҳарчага эса битта одамни ҳам ҳозир юбориш мумкин —
   * ва ҳисоботда бу иккови ёнма-ён турса, ҳоким фарқни
   * дарҳол кўради.
   */
  for (const kalit of ['fuqaro', 'kasb', 'it-vaucher']) {
    const b = fuqarolar.bolimlar.find((x) => x.kalit === kalit);
    if (b) bolimlar.push(b);
  }

  const toifalar = toifalarBolimi(tahlil);
  if (toifalar) bolimlar.push(toifalar);

  // 4. Хонадон профили — анкетанинг барча бўлимлари
  bolimlar.push(...xonadonBolimlar);

  // 5. Бюджет
  const byudjet = byudjetBolimi(tahlil);
  if (byudjet) bolimlar.push(byudjet);

  // 6. Чора-тадбирлар ва иш ўринлари
  for (const kalit of ['topshiriq', 'ishorni']) {
    const b = fuqarolar.bolimlar.find((x) => x.kalit === kalit);
    if (b) bolimlar.push(b);
  }

  /* ── Муқовадаги асосий рақамлар ── */
  const j = tahlil.jami;
  const bosh: Korsatkich[] = [
    {
      nomi: 'Хатловдан ўтган хонадон',
      qiymat: son(j.xatlovXonadon),
      izoh: `базадаги ${son(j.bazaXonadon)} тадан · ${foiz(foizi(j.xatlovXonadon, j.bazaXonadon))}`,
      yonalish: 'kop-yaxshi',
      foiz: foizi(j.xatlovXonadon, j.bazaXonadon),
    },
    {
      nomi: 'Аниқланган ишсиз',
      qiymat: son(j.aniqlangan),
      izoh: `базада рўйхатда ${son(j.bazaIshsiz)} та`,
      yonalish: 'betaraf',
    },
    {
      nomi: 'Ишга жойлаштирилган',
      qiymat: son(j.joylashtirilgan),
      izoh: `аниқланганларнинг ${foiz(foizi(j.joylashtirilgan, j.aniqlangan))}и`,
      yonalish: 'kop-yaxshi',
      foiz: foizi(j.joylashtirilgan, j.aniqlangan),
    },
    {
      nomi: 'Таклифдан бош тортган',
      qiymat: son(j.radEtgan),
      izoh: 'алоҳида ишлаш талаб қилинади',
      yonalish: 'kam-yaxshi',
    },
  ];

  const asos = {
    xonadon: jamiXonadon,
    fuqaro: fuqarolar.jamiFuqaro,
    topshiriq: fuqarolar.jamiTopshiriq,
    ishOrni: fuqarolar.jamiIshOrni,
  };

  /*
   * AI сўралмаган роллар (маҳалла ходими, бандлик мутахассиси)
   * ҳам ХУЛОСА ОЛАДИ — фақат қоида бўйича.
   *
   * Илгари бу ерда бутун хулоса ташлаб юбориларди ва улар бўш
   * блок кўрарди. Ҳолбуки қоида бўйича хулоса арзон, тез ва
   * айнан ўша ходимга кераклироқ: у ўз маҳалласида нима
   * қилишни билиши керак.
   */
  const xulosa = await xulosaOl(tahlil, bolimlar, qamrovNomi, asos, sorov.aiXulosa !== false);

  const hisobot: Hisobot = {
    // `ogir()` faqat satrlarga tegadi, mantiqiy qiymat o'zgarmaydi
    lotin: sorov.lotin,
    sarlavha:
      sorov.qamrov.turi === 'mahalla'
        ? 'Маҳалла ҳисоботи — бандлик ва камбағалликни қисқартириш'
        : 'Туман ҳисоботи — бандлик ва камбағалликни қисқартириш',
    ostSarlavha: `${TUMAN === 'Xatirchi' ? 'Хатирчи' : TUMAN} тумани ҳокимлиги · ${VILOYAT === 'Navoiy' ? 'Навоий' : VILOYAT} вилояти`,
    qamrovNomi,
    tayyorlagan: sorov.tayyorlagan,
    sana: new Date().toISOString().slice(0, 10),
    bosh,
    xulosa,
    bolimlar,
    asos,
  };

  return sorov.lotin ? ogir(hisobot) : hisobot;
}

/** Ташқарида ҳам керак бўладиган ёрдамчилар */
export { ISHSIZ_HOLATI, VORONKA };
