/**
 * ============================================================
 *  БРИФ — сунъий интеллектга юбориладиган ТАҲЛИЛИЙ далилнома
 *
 *  ── Нега бу файл пайдо бўлди ──
 *
 *  Илгари моделга ҳисоботнинг ҳамма қатори кетма-кет
 *  юбориларди: етти мингта белги, икки юздан ортиқ сатр,
 *  ҳаммаси бир хил вазнда. Жавоб эса «болалар таълимига
 *  эътибор қаратиш керак» тарзида чиқарди — яъни бола
 *  ҳақидаги сатрни кўрган, аммо ундан ХУЛОСА чиқара олмаган.
 *
 *  Сабаби оддий: моделга рақам берилган, аммо ЎЛЧОВ
 *  берилмаган. «Боғчага бормайдиган 12 бола» — бу кўпми ёки
 *  озми? Туманда қандай? 70 та МФЙ ичида бу қайси ўринда?
 *  Ўлчовсиз ҳар қандай хулоса тахминга айланади, тахминни эса
 *  модел ЮМШОҚ гап билан яширади. «Детский» таҳлил шундан
 *  туғилади.
 *
 *  ── Ечим: таҳлилни КОДДА қилиш ──
 *
 *  Бу модул моделга тайёр рақам эмас, тайёр САВОЛ беради:
 *
 *    · бўшлиқлар — «нечта одам қамровдан ташқарида» деган
 *      айирма кодда ҳисобланади, модел уни ўзи топмайди;
 *    · таққос — ҳар бир кўрсаткич туман ўртачаси билан ёнма-ён
 *      турибди, фарқи пунктда ёзилган;
 *    · ўрин — 70 та МФЙ ичида нечанчи;
 *    · занжир — воронканинг қайси ҳалқасида энг кўп одам
 *      йўқолаётгани;
 *    · ишончлилик — қамров паст бўлса, фоизга суяниб
 *      бўлмаслиги АЙТИЛАДИ.
 *
 *  Шундан кейин моделнинг вазифаси ўзгаради: у энди «нимани
 *  топиш» эмас, «топилганига нима қилиш» устида ишлайди — ва
 *  моделлар айнан шунда кучли.
 *
 *  ── Шахсий маълумот ──
 *
 *  Бу ерга ФАҚАТ жамланган сон тушади. Ф.И.Ш., манзил, телефон
 *  ва раис номи йўқ. Туман ва вилоят номи бор — улар очиқ
 *  маълумот ва чорани танлашда керак (тоғли туманда бошқа
 *  ечим, шаҳар ёнида бошқа).
 * ============================================================
 */
import type { BolimlarTahlili } from '@/lib/bolimlar-tahlili';
import type { TahlilNatijasi } from '@/lib/tahlil';
import {
  CHET_EL_DAVLATI,
  CHORVA_TURI,
  DAROMAD_MANBAI,
  GAZ_TURI,
  HUNAR_TURI,
  ICHIMLIK_SUVI,
  INFRATUZILMA_MUAMMOSI,
  KAMBAGALLIK_SABABI,
  KASB_YONALISHI,
  MABLAG_YONALISHI,
  MASUL_TASHKILOT,
  MOLIYA_TURI,
  PASSIV_DAROMAD_TURI,
  TOMORQA_FOYDALANISH,
  UY_HOLATI,
  kirillcha,
  type Variant,
} from '@/lib/constants';
import { ISHSIZ_HOLATI } from '@/lib/ishsiz-holati';
import { foiz, foizi, pul, son } from './format';

/* ── Бир бўшлиқ ─────────────────────────────────────────────── */

interface Boshliq {
  /** Муаммонинг номи */
  nomi: string;
  /** Нечта одам ёки хонадон — тартиблаш шу бўйича */
  soni: number;
  /** Нимадан ҳисобланган — модел далилни шу ердан олади */
  asos: string;
  /** Шу қамровдаги улуш (фоиз) */
  ulush?: number;
  /** Туман бўйича ўша улуш — таққос учун */
  tumanUlushi?: number;
}

/**
 * Маҳалла қамровини таққослаш учун туман кесими.
 *
 * Фақат битта МФЙ танланганда берилади. Туман кесимида ўзини
 * ўзи билан таққослашнинг маъноси йўқ.
 */
export interface TumanAsosi {
  tahlil: TahlilNatijasi;
  b: BolimlarTahlili;
}

/** Фарқни «+12 пункт» кўринишида ёзади */
function farqMatni(qiymat: number, asos: number): string {
  const d = Math.round((qiymat - asos) * 10) / 10;
  if (Math.abs(d) < 0.1) return 'туман даражасида';
  return `${d > 0 ? '+' : ''}${String(d).replace('.', ',')} пункт`;
}

/**
 * Бўшлиқларни ҳисоблайди ва КАТТАЛИГИ бўйича тартиблайди.
 *
 * Тартиб — таъсирланган одам сони бўйича, фоиз бўйича эмас.
 * Сабаби бошқарувда: ҳоким ресурсни одамга тақсимлайди. «5
 * хонадоннинг 100%и» билан «300 хонадоннинг 20%и» — иккинчиси
 * олдин ҳал қилинади, гарчи фоизи кичик бўлса ҳам.
 */
function boshliqlar(
  t: TahlilNatijasi,
  b: BolimlarTahlili,
  tuman: TumanAsosi | null
): Boshliq[] {
  const j = t.jami;
  const tb = tuman?.b ?? null;
  const tj = tuman?.tahlil.jami ?? null;
  const ro: Boshliq[] = [];

  const qosh = (
    nomi: string,
    soni: number,
    asos: string,
    ulushQism?: number,
    ulushButun?: number,
    tumanQism?: number,
    tumanButun?: number
  ) => {
    if (soni <= 0) return;
    ro.push({
      nomi,
      soni,
      asos,
      ulush:
        ulushQism !== undefined && ulushButun ? foizi(ulushQism, ulushButun) : undefined,
      tumanUlushi:
        tumanQism !== undefined && tumanButun ? foizi(tumanQism, tumanButun) : undefined,
    });
  };

  /* ── Бандлик занжири ── */

  /*
   * ── ЭНГ БИРИНЧИ САВОЛ: ИШСИЗЛАР ҚАНЧА ──
   *
   * Хатлов нечта ишсизни ТОПДИ ва нечтаси билан СУҲБАТ
   * ўтказилди — булар бошқа-бошқа рақам.
   *
   * Илгари ҳисоботда фақат иккинчиси турарди. Ҳоким эса
   * хатлов рўйхатида биринчисини кўрган эди ва ҳақли
   * равишда «маълумот хато» деди. Иккови ҳам тўғри эди.
   *
   * Фарқ — ХАТО эмас, БАЖАРИЛМАГАН ИШ: шунча одам топилган,
   * аммо бандлик маркази уларга таклиф бера олмайди, чунки
   * анкетаси йўқ.
   */
  if (j.anketasiz > 0) {
    qosh(
      'Топилган, аммо шахсий анкетаси тўлдирилмаган ишсиз',
      j.anketasiz,
      `Хатлов ${son(j.xatlovdaTopilgan)} та ишсиз топди, ${son(j.aniqlangan)} тасининг анкетаси бор. ` +
        `Қолган ${son(j.anketasiz)} таси билан суҳбат ўтказилмаган — улар бандлик марказига кўринмайди.`,
      j.anketasiz,
      j.xatlovdaTopilgan,
      tj?.anketasiz,
      tj?.xatlovdaTopilgan
    );
  }

  qosh(
    'Аниқланган, аммо ҳали ишга жойлашмаган ишсиз',
    j.aniqlangan - j.joylashtirilgan,
    `${son(j.aniqlangan)} аниқланган, ${son(j.joylashtirilgan)} жойлаштирилган`,
    j.aniqlangan - j.joylashtirilgan,
    j.aniqlangan,
    tj ? tj.aniqlangan - tj.joylashtirilgan : undefined,
    tj?.aniqlangan
  );
  qosh(
    'Бир йилдан ортиқ ишсиз юрган фуқаро',
    j.uzoqIshsiz,
    `${son(j.uzoqIshsiz)} фуқаро 12 ойдан ошди — оддий эълон кифоя қилмайди`,
    j.uzoqIshsiz,
    j.aniqlangan,
    tj?.uzoqIshsiz,
    tj?.aniqlangan
  );
  qosh(
    'Жойлаштирилган, аммо ишда қолгани текширилмаган',
    j.tekshiruvKutayotgan,
    `${son(j.tekshiruvKutayotgan)} фуқаро 3 ойдан бери тасдиқланмаган`
  );
  qosh(
    'Таклифдан бош тортган',
    j.radEtgan,
    `${son(j.radEtgan)} фуқаро — таклиф мос келмаган бўлиши мумкин`,
    j.radEtgan,
    j.aniqlangan,
    tj?.radEtgan,
    tj?.aniqlangan
  );

  /* ── Болалар таълими ── */
  const bogchaTashqari = Math.max(0, b.talim.maktabgachaYoshdagi - b.talim.maktabgachaQamrovda);
  qosh(
    'Боғчага бормаётган мактабгача ёшдаги бола',
    bogchaTashqari,
    `мактабгача ёшда ${son(b.talim.maktabgachaYoshdagi)} бола, қамровда ${son(b.talim.maktabgachaQamrovda)} таси`,
    bogchaTashqari,
    b.talim.maktabgachaYoshdagi,
    tb ? Math.max(0, tb.talim.maktabgachaYoshdagi - tb.talim.maktabgachaQamrovda) : undefined,
    tb?.talim.maktabgachaYoshdagi
  );
  const maktabTashqari = Math.max(0, b.talim.maktabYoshdagi - b.talim.maktabQamrovda);
  qosh(
    'Мактабга бормаётган мактаб ёшидаги бола',
    maktabTashqari,
    `мактаб ёшида ${son(b.talim.maktabYoshdagi)} бола, қамровда ${son(b.talim.maktabQamrovda)} таси`,
    maktabTashqari,
    b.talim.maktabYoshdagi,
    tb ? Math.max(0, tb.talim.maktabYoshdagi - tb.talim.maktabQamrovda) : undefined,
    tb?.talim.maktabYoshdagi
  );
  qosh(
    'Боғча навбатини кутаётган оила',
    b.mehnat.bogchaKutayotgan,
    `${son(b.mehnat.bogchaKutayotgan)} оила — она ишга чиқа олмайди`,
    b.mehnat.bogchaKutayotgan,
    b.xonadon,
    tb?.mehnat.bogchaKutayotgan,
    tb?.xonadon
  );

  /* ── Касб ва тадбиркорлик ── */
  qosh(
    'Касб ўрганмоқчи, аммо курсга йўналтирилмаган',
    b.mehnat.kasbIstagi,
    `${son(b.mehnat.kasbIstagi)} хонадонда касб-ҳунар истаги билдирилган`,
    b.mehnat.kasbIstagi,
    b.xonadon,
    tb?.mehnat.kasbIstagi,
    tb?.xonadon
  );
  qosh(
    'Тадбиркорлик истаги бор оила',
    b.tadbirkorlik.istagi,
    `${son(b.tadbirkorlik.istagi)} оила иш бошламоқчи, ${son(b.tadbirkorlik.moliyaEhtiyoji)} таси молиявий кўмак сўраган`,
    b.tadbirkorlik.istagi,
    b.xonadon,
    tb?.tadbirkorlik.istagi,
    tb?.xonadon
  );

  /* ── Коммунал ── */
  qosh(
    'Электр йўқ хонадон',
    b.uyJoy.elektrYoq,
    `${son(b.uyJoy.elektrYoq)} хонадон`,
    b.uyJoy.elektrYoq,
    b.xonadon,
    tb?.uyJoy.elektrYoq,
    tb?.xonadon
  );
  qosh(
    'Газ йўқ хонадон',
    b.uyJoy.gazYoq,
    `${son(b.uyJoy.gazYoq)} хонадон`,
    b.uyJoy.gazYoq,
    b.xonadon,
    tb?.uyJoy.gazYoq,
    tb?.xonadon
  );
  qosh(
    'Канализация йўқ хонадон',
    b.uyJoy.kanalizatsiyaYoq,
    `${son(b.uyJoy.kanalizatsiyaYoq)} хонадон`,
    b.uyJoy.kanalizatsiyaYoq,
    b.xonadon,
    tb?.uyJoy.kanalizatsiyaYoq,
    tb?.xonadon
  );
  qosh(
    'Суғориш суви йўқ хонадон',
    b.uyJoy.sugorishYoq,
    `${son(b.uyJoy.sugorishYoq)} хонадон — томорқа ишламайди`,
    b.uyJoy.sugorishYoq,
    b.xonadon,
    tb?.uyJoy.sugorishYoq,
    tb?.xonadon
  );

  /* ── Ижтимоий ҳимоя ва соғлиқ ── */
  qosh(
    'Доимий дорига муҳтож оила',
    b.soglik.doriKerak,
    `${son(b.soglik.doriKerak)} оила — доимий харажат, даромаддан чиқади`,
    b.soglik.doriKerak,
    b.xonadon,
    tb?.soglik.doriKerak,
    tb?.xonadon
  );
  qosh(
    'Узоқ даволаниш зарур бўлган оила',
    b.soglik.uzoqDavolanish,
    `${son(b.soglik.uzoqDavolanish)} оила`,
    b.soglik.uzoqDavolanish,
    b.xonadon,
    tb?.soglik.uzoqDavolanish,
    tb?.xonadon
  );
  qosh(
    'Доимий парваришга муҳтож шахс',
    b.ijtimoiy.parvarishShaxs,
    `${son(b.ijtimoiy.parvarishShaxs)} шахс, ${son(b.ijtimoiy.parvarishOila)} оилада — оила аъзоси ишга чиқа олмайди`
  );
  qosh(
    'Ёлғиз яшайдиган кекса',
    b.ijtimoiy.yolgizKeksaShaxs,
    `${son(b.ijtimoiy.yolgizKeksaShaxs)} шахс`
  );
  qosh(
    'Ҳужжатлари тўлиқ бўлмаган оила',
    b.hujjat.notoliq,
    `${son(b.hujjat.notoliq)} оила — субсидия ва нафақа расмийлаштирилмайди`,
    b.hujjat.notoliq,
    b.xonadon,
    tb?.hujjat.notoliq,
    tb?.xonadon
  );

  /* ── Ер ва томорқа ── */
  /*
   * Ёмон фойдаланилаётган томорқа.
   *
   * Каталог қиймати ЛОТИНДА сақланади, шунинг учун таққос ҳам
   * лотинча қиймат бўйича: кириллча матн бўйича изласак, ҳеч
   * нима топилмасди ва сатр жимгина нолда қоларди.
   */
  const yomonTomorqa = b.yer.foydalanish
    .filter((f) => /yomon|tashlandiq/i.test(f.qiymat))
    .reduce((s, f) => s + f.soni, 0);
  qosh(
    'Томорқаси бўш турган оила',
    yomonTomorqa,
    `${son(yomonTomorqa)} оилада томорқа деярли ишлатилмайди`,
    yomonTomorqa,
    b.yer.tomorqaOila,
    undefined,
    undefined
  );

  /* ── Ҳужжат сифати ── */
  const imzosiz = Math.max(0, b.xonadon - b.rozilik.imzoBor);
  qosh(
    'Имзо қўйилмаган хатлов анкетаси',
    imzosiz,
    `${son(b.xonadon)} анкетадан ${son(b.rozilik.imzoBor)} таси имзоланган — қолгани ҳужжат сифатида ишламайди`,
    imzosiz,
    b.xonadon
  );

  /* ── Масъуллик ── */
  const kechikkan = t.kechikkanlar.reduce((s, k) => s + k.soni, 0);
  qosh(
    'Муддати ўтган чора-тадбир',
    kechikkan,
    kechikkan > 0
      ? `энг кўпи — ${kirillcha(MASUL_TASHKILOT, t.kechikkanlar[0].tashkilot)} (${son(t.kechikkanlar[0].soni)} та)`
      : ''
  );

  return ro.sort((a, b2) => b2.soni - a.soni);
}

/**
 * Воронканинг ҚАЙСИ ҲАЛҚАСИДА энг кўп одам йўқолаётгани.
 *
 * Бу — ҳокимнинг «нега жойлаштириш паст» деган саволига
 * бериладиган ягона тўғри жавоб. «Умуман иш суст» эмас, балки
 * «суҳбатдан кейин таклифга ўтмаяпти» — ва бу иккиси мутлақо
 * бошқа чорани талаб қилади.
 */
function zanjirUzilishi(t: TahlilNatijasi): string[] {
  const v = t.voronka;
  if (v.length < 2) return [];

  const nomi = (i: number) => ISHSIZ_HOLATI[v[i].holati].kirill;
  const satrlar = [v.map((x) => `${ISHSIZ_HOLATI[x.holati].kirill}: ${son(x.soni)}`).join(' → ')];

  let engKatta = { nomi: '', yoqotish: 0, ulush: 0 };
  for (let i = 1; i < v.length; i++) {
    const yoqotish = v[i - 1].soni - v[i].soni;
    if (yoqotish > engKatta.yoqotish) {
      engKatta = {
        nomi: `«${nomi(i - 1)}» дан «${nomi(i)}» га`,
        yoqotish,
        ulush: foizi(yoqotish, v[i - 1].soni),
      };
    }
  }

  if (engKatta.yoqotish > 0) {
    satrlar.push(
      `Энг катта йўқотиш ${engKatta.nomi}: ${son(engKatta.yoqotish)} фуқаро (${foiz(engKatta.ulush)}) шу ҳалқада тўхтаб қолган.`
    );
  }
  return satrlar;
}

/**
 * 70 та МФЙ ичида ўрин.
 *
 * Фақат ХАТЛОВ БОШЛАНГАН маҳаллалар орасида саналади: хатлов
 * бошланмаган МФЙ нинг нол фоизи билан таққослаш маъносиз ва
 * «биринчи ўриндамиз» деган ёлғон хулоса берарди.
 */
function orin(tuman: TumanAsosi, mahallaNomi: string): string[] {
  const boshlangan = tuman.tahlil.qamrov.filter((q) => q.xatlovXonadon > 0);
  if (boshlangan.length < 2) {
    return [
      `Туманда хатлов ${son(boshlangan.length)} та МФЙ да бошланган — таққослаш учун ҳали эрта.`,
    ];
  }

  const oz = boshlangan.find((q) => q.nomiKirill === mahallaNomi);
  if (!oz) return [];

  const joyi = (
    nomi: string,
    olchov: (q: (typeof boshlangan)[number]) => number
  ): string => {
    const tartib = [...boshlangan].sort((a, b) => olchov(b) - olchov(a));
    const n = tartib.findIndex((q) => q.id === oz.id) + 1;
    return `${nomi}: ${n}-ўрин (хатлов бошланган ${tartib.length} та МФЙ ичида)`;
  };

  return [
    joyi('Хонадон қамрови бўйича', (q) => foizi(q.xatlovXonadon, q.bazaXonadon)),
    joyi('Ишсизларни аниқлаш бўйича', (q) => q.qamrovFoizi),
    joyi('Ишга жойлаштириш бўйича', (q) => q.natijaFoizi),
  ];
}

/* ── Хом рақамлар ───────────────────────────────────────────── */

/**
 * Бўлимлар кесими — ихчам шаклда.
 *
 * Бу қисм брифнинг ОХИРИДА туради ва атайлаб қисқа: моделга
 * аввал таҳлил, кейин манба керак. Тескариси бўлганда у
 * биринчи кўрган сатрга ёпишиб қоларди.
 */
function xomRaqamlar(b: BolimlarTahlili): string[] {
  const x = b.xonadon;
  const u = (n: number) => `${son(n)} (${foiz(foizi(n, x))})`;
  /*
   * ── НОМЛАР КИРИЛЛГА ЎГИРИЛАДИ ──
   *
   * Каталог қийматлари базада ЛОТИНДА сақланади («Quduq»,
   * «Asalarichilik»). Улар брифга ўшандай тушса, модел жавобни
   * ҳам аралаш ёзади: кўрсатмада «фақат кирилл» дейилган, аммо
   * модел кўрган намунага ергашади. Ўшандай жавоб эса иловада
   * иккала алифбода ҳам лотинча бўлиб қолаверади — чунки
   * `lotinga()` фақат кириллни ўгиради, тескариси йўқ.
   */
  const eng = (r: { qiymat: string; soni: number }[], katalog?: Variant[], necha = 3) =>
    r
      .slice()
      .sort((a, c) => c.soni - a.soni)
      .slice(0, necha)
      .map((q) => `${katalog ? kirillcha(katalog, q.qiymat) : q.qiymat} ${son(q.soni)}`)
      .join(', ') || '—';

  return [
    `Оила: ${son(b.oila.jamiAzo)} аъзо, ўртача ${String(b.oila.ortachaHajm).replace('.', ',')} киши; 0–3 ёшда ${son(b.oila.bolalar0_3)} бола, 3–17 ёшда ${son(b.oila.bolalar3_17)}; аёл бошлиқ оила ${u(b.oila.ayolBoshliq)}.`,
    `Меҳнат: лаёқатли ${son(b.mehnat.layoqatli)}, ишлайдиган ${son(b.mehnat.ishlaydigan)} (давлатда ${son(b.mehnat.davlatda)}, хусусийда ${son(b.mehnat.xususiyda)}), ишсиз ${son(b.mehnat.ishsiz)}.`,
    `Чет эл: ${son(b.chetEl.ishchi)} киши ${son(b.chetEl.oila)} оиладан, ойига ${pul(b.chetEl.oylikSom)} киради (${son(b.chetEl.pulliOila)} оила суммани айтган); энг кўп давлат: ${eng(b.chetEl.davlatlar, CHET_EL_DAVLATI)}.`,
    `Даромад: ${son(b.daromad.oila)} оила кўрсатган, ўртача ${pul(b.daromad.ortacha)}; даромад манбалари: ${eng(b.daromad.manbalar, DAROMAD_MANBAI)}; камбағаллик сабаблари: ${eng(b.daromad.sabablar, KAMBAGALLIK_SABABI)}.`,
    `Тадбиркорлик: истак ${son(b.tadbirkorlik.istagi)}, молия сўраган ${son(b.tadbirkorlik.moliyaEhtiyoji)}; соҳалар: ${eng(b.tadbirkorlik.sohalar, KASB_YONALISHI)}; сўралган молия тури: ${eng(b.tadbirkorlik.moliyaTuri, MOLIYA_TURI)}.`,
    `Уй-жой: сув ${eng(b.uyJoy.ichimlikSuvi, ICHIMLIK_SUVI, 2)}; газ ${eng(b.uyJoy.gazTuri, GAZ_TURI, 2)}; ҳолати ${eng(b.uyJoy.holati, UY_HOLATI, 2)}.`,
    `Ер ва чорва: томорқа ${u(b.yer.tomorqaOila)}, экин ${son(b.yer.ekinMaydoni)} сотих; чорва ${son(b.yer.chorvaOila)} оила (йирик ${son(b.yer.yirikShoxli)}, майда ${son(b.yer.maydaShoxli)}, парранда ${son(b.yer.parranda)}); ҳунарманд ${son(b.yer.hunarmandOila)} (${eng(b.yer.hunarTurlari, HUNAR_TURI, 2)}); чорва турлари: ${eng(b.yer.chorvaTurlari, CHORVA_TURI, 2)}; томорқадан фойдаланиш: ${eng(b.yer.foydalanish, TOMORQA_FOYDALANISH, 2)}.`,
    `Қўшимча даромад истаги: ${u(b.qoshimchaDaromad.istagi)}; турлари: ${eng(b.qoshimchaDaromad.turlari, PASSIV_DAROMAD_TURI)}.`,
    `Маҳалла инфратузилмаси — энг кўп айтилгани: ${eng(b.infratuzilma.muammolar, INFRATUZILMA_MUAMMOSI, 4)}.`,
  ];
}

/* ── Асосий функция ─────────────────────────────────────────── */

/**
 * Моделга юбориладиган тайёр брифни тузади.
 *
 * `tuman` фақат битта МФЙ танланганда берилади — таққос учун.
 */
export function brifYasa(
  qamrovNomi: string,
  t: TahlilNatijasi,
  b: BolimlarTahlili,
  tuman: TumanAsosi | null
): string {
  const j = t.jami;
  const qamrovFoizi = foizi(j.xatlovXonadon, j.bazaXonadon);
  const s: string[] = [];

  /* ── 1. Ҳудуд ── */
  s.push('# ҲУДУД');
  s.push(
    tuman
      ? `${qamrovNomi} МФЙ, Хатирчи тумани, Навоий вилояти (Ўзбекистон).`
      : `${qamrovNomi}, Навоий вилояти (Ўзбекистон). 70 та МФЙ жамланмаси.`
  );
  s.push(
    `База рўйхати: ${son(j.bazaAholi)} аҳоли, ${son(j.bazaXonadon)} хонадон, рўйхатда ${son(j.bazaIshsiz)} ишсиз.`
  );
  s.push(
    `Хатлов натижаси: ${son(j.xatlovXonadon)} хонадон (${foiz(qamrovFoizi)}), ` +
      `${son(j.xatlovdaTopilgan)} та ишсиз топилган` +
      (j.anketasiz > 0
        ? ` (${son(j.aniqlangan)} тасининг анкетаси тўлдирилган, ${son(j.anketasiz)} таси кутмоқда)`
        : '') +
      `, ${son(j.joylashtirilgan)} киши ишга жойлаштирилган.`
  );
  s.push('');

  /* ── 2. Ишончлилик ── */
  s.push('# МАЪЛУМОТНИНГ ИШОНЧЛИЛИГИ');
  if (qamrovFoizi < 20) {
    s.push(
      `Хатлов ${foiz(qamrovFoizi)} да. Фоизлар ЙЎНАЛИШНИ кўрсатади, аниқ миқдорни эмас. Хулосада буни ҳисобга ол: «туманда N та шундай оила бор» дема, «хатловдан ўтган ${son(j.xatlovXonadon)} хонадоннинг N таси» де.`
    );
  } else if (qamrovFoizi < 60) {
    s.push(
      `Хатлов ${foiz(qamrovFoizi)} да — ўрта қамров. Улушлар ишончли, аммо умумий сонни тўлиқ деб ҳисоблама.`
    );
  } else {
    s.push(`Хатлов ${foiz(qamrovFoizi)} да — қамров юқори, улушлар ишончли.`);
  }
  const imzoFoizi = foizi(b.rozilik.imzoBor, b.xonadon);
  if (b.xonadon > 0 && imzoFoizi < 80) {
    s.push(
      `Анкеталарнинг ${foiz(imzoFoizi)} и имзоланган. Имзосиз анкета ҳужжат сифатида ишламайди — бу алоҳида ҳал қилиниши керак бўлган масала.`
    );
  }

  /*
   * ── АНКЕТАДАГИ ЗИДДИЯТ ──
   *
   * «Меҳнатга лаёқатли» ва «ишсизлар сони» — анкетанинг
   * ИККИТА алоҳида катаги ва уларни ходим қўлда тўлдиради.
   * Иккинчиси биринчисидан катта чиқса, демак катак хато
   * тўлдирилган: лаёқатсиз одам ишсиз бўла олмайди.
   *
   * Буни яшириш нотўғри бўларди. Панелда бу «лаёқатлиларнинг
   * 235%и» кўринишида чиқади ва ҳоким «нега бундай» деб
   * сўрайди. Моделга ҳам айтилади — акс ҳолда у шу зиддиятли
   * рақамга таяниб хулоса чиқарарди.
   */
  if (b.mehnat.layoqatli > 0 && b.mehnat.ishsiz > b.mehnat.layoqatli) {
    s.push(
      `ДИҚҚАТ — анкетада зиддият: меҳнатга лаёқатли ${son(b.mehnat.layoqatli)} киши, ишсизлар сони эса ${son(b.mehnat.ishsiz)} деб ёзилган. Иккови анкетанинг алоҳида катаги ва улардан бири нотўғри тўлдирилган. Бу рақамларга таянма; тавсияларнинг бирида шу катакларни қайта текшириш айтилсин.`
    );
  }
  s.push('');

  /* ── 3. Бўшлиқлар ── */
  const bosh = boshliqlar(t, b, tuman);
  s.push('# АНИҚЛАНГАН БЎШЛИҚЛАР (таъсирланган одам сони бўйича тартибланган)');
  if (bosh.length === 0) {
    s.push('Ҳозирги маълумотда алоҳида ажралиб турган бўшлиқ топилмади.');
  } else {
    bosh.slice(0, 14).forEach((g, i) => {
      let satr = `${i + 1}. ${g.nomi}: ${son(g.soni)}`;
      if (g.ulush !== undefined) satr += ` (${foiz(g.ulush)})`;
      if (g.asos) satr += ` — ${g.asos}`;
      if (g.ulush !== undefined && g.tumanUlushi !== undefined) {
        satr += `. Туманда ${foiz(g.tumanUlushi)}, фарқ ${farqMatni(g.ulush, g.tumanUlushi)}.`;
      }
      s.push(satr);
    });
  }
  s.push('');

  /* ── 4. Занжир ── */
  const zanjir = zanjirUzilishi(t);
  if (zanjir.length) {
    s.push('# БАНДЛИК ЗАНЖИРИ ҚАЕРДА УЗИЛГАН');
    s.push(...zanjir);
    s.push('');
  }

  /* ── 5. Туман билан таққос ва ўрин ── */
  if (tuman) {
    const tj = tuman.tahlil.jami;
    s.push('# ТУМАН БИЛАН ТАҚҚОС');
    const qator = (
      nomi: string,
      oz: number,
      tumanQiymat: number,
      birlik = '%'
    ) =>
      s.push(
        `${nomi}: ${qamrovNomi} ${String(oz).replace('.', ',')}${birlik} · туман ${String(tumanQiymat).replace('.', ',')}${birlik} · ${farqMatni(oz, tumanQiymat)}`
      );
    qator('Хонадон қамрови', qamrovFoizi, foizi(tj.xatlovXonadon, tj.bazaXonadon));
    qator('Ишсизларни аниқлаш', foizi(j.aniqlangan, j.bazaIshsiz), foizi(tj.aniqlangan, tj.bazaIshsiz));
    qator(
      'Аниқланганлардан жойлаштирилгани',
      foizi(j.joylashtirilgan, j.aniqlangan),
      foizi(tj.joylashtirilgan, tj.aniqlangan)
    );
    s.push(...orin(tuman, qamrovNomi));
    s.push('');
  }

  /* ── 6. Масъуллик ── */
  s.push('# МАСЪУЛИЯТ ВА ТОПШИРИҚЛАР');
  const kechikkan = t.kechikkanlar.reduce((x, k) => x + k.soni, 0);
  if (kechikkan > 0) {
    s.push(
      `Муддати ўтган топшириқ: ${son(kechikkan)} та. Ташкилотлар кесимида: ${t.kechikkanlar
        .slice(0, 5)
        .map((k) => `${kirillcha(MASUL_TASHKILOT, k.tashkilot)} ${son(k.soni)}`)
        .join(', ')}.`
    );
  } else {
    s.push('Муддати ўтган топшириқ йўқ.');
  }
  if (t.kursTalabi.length) {
    s.push(
      `Касб-ҳунар талаби (гуруҳ 15 тадан тўлади): ${t.kursTalabi
        .slice(0, 6)
        .map((k) => `${k.kasb} ${son(k.soni)}`)
        .join(', ')}.`
    );
  }
  if (t.jamiTalab > 0) {
    s.push(
      `Сўралган кредит-субсидия: ${pul(t.jamiTalab)}; йўналишлар: ${t.byudjet
        .slice(0, 4)
        .map((x) => `${kirillcha(MABLAG_YONALISHI, x.yonalish)} ${pul(x.summa)} (${son(x.oila)} оила)`)
        .join(', ')}.`
    );
  }
  const tf = t.toifalar;
  s.push(
    `Алоҳида тоифалар: аёллар дафтари ${son(tf.ayollarDaftari)}, ижтимоий реестр ${son(tf.ijtimoiyReestr)}, миграциядан қайтган ${son(tf.migratsiyadanQaytgan)}, олий битирувчи ${son(tf.oliyBitiruvchi)}, ўрта махсус битирувчи ${son(tf.ortaMaxsusBitiruvchi)}.`
  );
  s.push('');

  /* ── 7. Хом рақамлар ── */
  s.push('# БЎЛИМЛАР КЕСИМИ (хом рақамлар)');
  s.push(...xomRaqamlar(b));

  return s.join('\n');
}
