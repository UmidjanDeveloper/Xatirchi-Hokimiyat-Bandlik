/**
 * ============================================================
 *  МАҲАЛЛА ЖАДВАЛИ — ҳокимлик андозаси бўйича Excel
 *
 *  Ҳокимлик ҳар маҳалладан етти варақли жадвал сўрайди:
 *  камбағал оилалар, ишсизлар, миграция, ажратилган ерлар,
 *  томорқалар, тадбиркорлар ва бўш турган объектлар.
 *
 *  Илгари уни маҳалла ходими ҚЎЛДА тўлдирарди: бир хил
 *  одамларни иккинчи марта ёзиб чиқарди — аввал анкетага,
 *  кейин жадвалга. Ҳар қайта ёзишда хато туғилади ва иккита
 *  ҳужжатдаги сон бир-бирига тўғри келмай қоларди.
 *
 *  Энди жадвал базадан тўлдирилади.
 *
 *  ── Нега андоза файли репода сақланади ──
 *
 *  Жадвални нолдан чизиш мумкин эди, аммо ҳокимлик уни
 *  БОСИБ ЧИҚАРАДИ ва имзолайди: чегара, шрифт, устун кенглиги
 *  ва бирлаштирилган сарлавҳалар ўша-ўша бўлиши керак.
 *  Шунинг учун ҳокимлик юборган файлнинг ЎЗИ андоза сифатида
 *  сақланади ва фақат ичи тўлдирилади.
 *
 *  ExcelJS ишлатилади, `xlsx` эмас: иккинчиси (жамоат
 *  нашри) ўқиганда катак безагини ТАШЛАБ ЮБОРАДИ ва
 *  сақлаганда жадвал чегарасиз, оқ варақ бўлиб чиқарди.
 *
 *  ── Тўлдириб бўлмайдиган устунлар ──
 *
 *  Андозадаги ҳар бир устун хатлов анкетасида сўралмаган.
 *  Масалан «коллеж талабалари сони» ёки «тадбиркорнинг
 *  йиллик даромади» — бундай маълумот базада йўқ.
 *
 *  Улар БЎШ қолдирилади ва сабаби жадвал тагида ёзилади.
 *  Тахмин билан тўлдириш энг ёмон йўл бўларди: ҳоким уни
 *  ҳақиқий рақам деб ўқийди ва шунга қараб қарор чиқаради.
 *
 *  ── Шахсий маълумот ──
 *
 *  Бу ҳужжатда Ф.И.Ш. БОР — ва бўлиши шарт, чунки ҳокимлик
 *  айнан рўйхат сўрайди. Шунинг учун у фақат ҳоким ва
 *  администраторга очиқ (`/api/hisobot/mahalla-jadvali`).
 *  Сунъий интеллектга бу маълумот ҲЕЧ ҚАЧОН юборилмайди —
 *  у фақат жамланган сонлар билан ишлайди.
 * ============================================================
 */
import ExcelJS from 'exceljs';
import { ANDOZA_BAYTI } from './andoza/andoza-fayli';
import {
  FUQARO_USTUNLARI,
  XONADON_USTUNLARI,
  type Ustun,
} from './toliq-ustunlar';
import { prisma } from '@/lib/prisma';
import {
  CHET_EL_DAVLATI,
  MALUMOT,
  TOMORQA_FOYDALANISH,
  VALYUTA_KURSI,
  kirillcha,
} from '@/lib/constants';

/*
 * Андоза `andoza/andoza-fayli.ts` дан келади — base64 да, КОД
 * сифатида.
 *
 * ── Нега дискдан ўқилмайди ──
 *
 * Аввалги вариантда `readFile(process.cwd() + ...)` ёзилган
 * эди. Маҳаллий машинада ишларди, аммо серверсиз функцияга
 * қайси файл тушишини Next.js ҳал қилади ва кодда ёзилмаган
 * файл умуман тушмаслиги мумкин. Уни созлама билан мажбурлаш
 * мумкин, лекин созламани бу ерда синаб кўриб бўлмайди — ва
 * синалмаган созлама ишлаб турган сайтни бузиб қўйди.
 *
 * Base64 сатр эса коднинг ўзи: бандлер уни ҳар доим олиб
 * кетади ва «файл топилмади» ҳеч қачон чиқмайди.
 *
 * Янги андоза келса: `.xlsx` ни алмаштириб, `npm run andoza`.
 */

/**
 * Маълумот қайси қатордан бошланади.
 *
 * 1-2 сарлавҳа, 3-5 устун номлари (уч қаватли, бирлаштирилган),
 * 6-қатордан маълумот. Андоза ўзгарса бу сон ҳам ўзгаради —
 * шунинг учун синовда текширилади.
 */
const BOSHLANISH = 6;

/** Андозадаги тайёр қаторлар сони (6-52) */
const ANDOZA_QATORI = 47;

/**
 * БУТУН КИТОБДАГИ энг кўп қатор.
 *
 * ── Нега варақ эмас, китоб ──
 *
 * Еттала варақ бир пайтда хотирада туради ва биргаликда
 * ёзилади. Чегара ҳар варақда алоҳида текширилса, бештаси
 * 39 000 тадан бўлса ҳам ўтиб кетарди — жами 195 000 қатор.
 *
 * ── Сон қаердан ──
 *
 * Ўлчанган: 45 000 қатор — 5,7 сония ва 559 МБ (18 устунли
 * варақда), яъни ҳар қатор тахминан 12,4 КБ. Серверсиз
 * функциянинг одатий хотираси 1 ГБ, ундан ~200 МБ ни Prisma
 * ва Next эгаллайди.
 *
 * 25 000 қатор ≈ 310 МБ — заҳираси билан сиғади.
 *
 * Чегарадан ошса файл ЯРИМ тайёрланмайди: аниқ хабар берилади
 * ва ҳоким маҳаллани танлаб олади. Ярим жадвал ҳокимлик
 * ҳужжати сифатида ишламайди — қайси МФЙ тушиб қолганини
 * ҳеч ким билмасди.
 */
const ENG_KOP_QATOR = 25_000;

/**
 * Ҳар варақдаги устунлар сони — андозадан ўқиб ёзилган.
 *
 * Бу сонлар ҳокимлик юборган файлга боғланган. Андоза
 * янгиланса улар ҳам янгиланиши керак, акс ҳолда файл
 * тайёрланмайди ва хато экранда чиқади — жим сурилиш
 * ўрнига. Синовда андоза билан солиштирилади.
 */
const USTUN = {
  /** A..R — камбағал оилалар */
  kambagal: 18,
  /** A..O — ишсизлар */
  ishsizlar: 15,
  /** A..L — миграция */
  migratsiya: 12,
  /** A..P — ажратилган ерлар */
  yerlar: 16,
  /** A..W — томорқа ерлари */
  tomorqa: 23,
  /** A..I — тадбиркор ва фермерлар */
  tadbirkor: 9,
  /** A..F — бўш турган бинолар */
  boshObyekt: 6,
} as const;

/* ── Ёрдамчилар ─────────────────────────────────────────────── */

/**
 * Фойдаланувчига АЙТИЛАДИГАН хато.
 *
 * Оддий `Error` дан фарқи: матни экранга чиқарилади. Йўл
 * (`route.ts`) буни фарқлаши керак — база хатоси ёки код
 * нуқсонининг матнини фойдаланувчига кўрсатиш нотўғри
 * бўларди, аммо «жадвал жуда катта, МФЙ ни танланг» —
 * айнан ўқилиши керак бўлган гап.
 */
export class JadvalXatosi extends Error {
  constructor(xabar: string) {
    super(xabar);
    this.name = 'JadvalXatosi';
  }
}

/** Бўш қиймат — андозада нол эмас, БЎШ катак бўлиши керак */
type Katak = string | number | null;

/**
 * Сотихни гектарга ўгиради.
 *
 * Анкета сотихда сўрайди, ҳокимлик жадвали эса гектарда.
 * Бир марта шу ўгириш унутилган эди ва ҳисоботда «95 га экин
 * майдони» деб турарди — аслида 0,95 га. Ҳоким шу рақамга
 * қараб субсидия режалаштиради, шунинг учун ўгириш алоҳида
 * функция ва синовда текширилади.
 */
export function sotixdanGa(sotix: number | null | undefined): number | null {
  if (sotix === null || sotix === undefined || !Number.isFinite(sotix)) return null;
  return Math.round((sotix / 100) * 10000) / 10000;
}

/**
 * Чет эл даромадини долларга ўгиради — жадвал доллар сўрайди.
 *
 * Оила сўмда ёки еврода айтган бўлиши мумкин; курс
 * `constants.ts` да туради ва ҳисоботда доим бир хил.
 */
export function dollarga(summa: bigint | number | null, valyuta: string | null): number | null {
  if (summa === null || summa === undefined) return null;
  const som = Number(summa) * (VALYUTA_KURSI[valyuta ?? 'UZS'] ?? 1);
  const kurs = VALYUTA_KURSI.USD;
  if (!kurs) return null;
  return Math.round(som / kurs);
}

/** «Ҳа» ёки «Йўқ» — андоза шу икки сўзни кутади */
const haYoq = (q: boolean | null | undefined): Katak =>
  q === null || q === undefined ? null : q ? 'ҳа' : 'йўқ';

/**
 * Сув таъминоти даражаси.
 *
 * Анкета «суғориш суви борми» деб ҳа/йўқ сўрайди, жадвал эса
 * уч даража кутади. Йўқ бўлса «қониқарсиз» аниқ; бор бўлса
 * сифати номаълум, шунинг учун «қониқарли» дейилади ва бу
 * жадвал тагидаги изоҳда айтилади.
 */
const suvDarajasi = (bor: boolean | null | undefined): Katak =>
  bor === null || bor === undefined ? null : bor ? 'қониқарли' : 'қониқарсиз';

/** Томорқадан фойдаланиш даражасини андозанинг уч сўзига келтиради */
const foydalanishDarajasi = (q: string | null): Katak => {
  if (!q) return null;
  if (q === 'Alo' || q === 'Yaxshi') return 'яхши';
  if (q === 'Qoniqarli') return 'қониқарли';
  if (q === 'Yomon') return 'қониқарсиз';
  return kirillcha(TOMORQA_FOYDALANISH, q);
};

/**
 * Маълумот даражаси устунига «+» қўяди.
 *
 * ── Нега таққос КИРИЛЛДА ──
 *
 * Каталогда қиймат лотинда ёзилган: «O'rta maxsus». Ундаги
 * апостроф ТИПОГРАФИК (U+2019), клавиатурадагиси эса оддий
 * («'»). Иккови кўзга бир хил кўринади, аммо `===` уларни
 * тенг демайди.
 *
 * Шунинг учун иккала томон ҳам `kirillcha()` орқали
 * ўтказилади: у каталогдан аниқ кириллча номни олади ва
 * апостроф масаласи умуман қолмайди.
 */
const MALUMOT_DARAJASI = {
  orta: 'Ўрта',
  ortaMaxsus: 'Ўрта махсус',
  oliy: 'Олий',
} as const;

const malumotBelgisi = (
  malumoti: string | null,
  daraja: keyof typeof MALUMOT_DARAJASI
): Katak => {
  if (!malumoti) return null;
  return kirillcha(MALUMOT, malumoti) === MALUMOT_DARAJASI[daraja] ? '+' : null;
};

/* ── Варақ тўлдириш ─────────────────────────────────────────── */

/**
 * Битта блок — маҳалла ва унинг қаторлари.
 *
 * Битта МФЙ кесимида блок ҳам битта бўлади ва `nomi` бўш
 * қолади. Туман кесимида эса ҳар МФЙ ўз блоги билан келади ва
 * блок олдига ном ёзилган ажратувчи қатор қўйилади.
 */
interface Guruh {
  /** МФЙ номи — битта маҳалла кесимида `null` */
  nomi: string | null;
  qatorlar: Katak[][];
}

/**
 * Битта варақни тўлдиради.
 *
 * Ҳар қатор — А устунидан КЕЙИНГИ катаклар кетма-кетлиги;
 * тартиб рақамини функция ўзи қўяди.
 *
 * Андозада 47 та тайёр, безатилган қатор бор:
 *   · ёзувлар камроқ бўлса — ортиқчаси ТОЗАЛАНАДИ, аммо
 *     чизиғи қолади (ҳокимлик жадвалида бўш қатор одатий);
 *   · кўпроқ бўлса — янги қатор қўшилади ва безаги
 *     6-қатордан кўчирилади.
 */
function varaqniToldir(
  varaq: ExcelJS.Worksheet,
  /**
   * Андозадаги устунлар сони — А дан охиригача.
   *
   * ── Нега у қўлда ёзилади ва текширилади ──
   *
   * Бу функцияга берилган қатор — А устунидан кейинги
   * катаклар кетма-кетлиги. Агар биттаси тушиб қолса,
   * ундан кейинги ҲАММА қиймат бир устунга сурилади:
   * «болалар сони» устунида «ишлайдиганлар» туради ва
   * рақам ТЎҒРИ кўринади — фақат нотўғри устунда.
   *
   * Бундай хатони кўз билан топиб бўлмайди, чунки жадвал
   * тўлиқ ва чиройли чиқади. Шунинг учун сон бу ерда
   * қаттиқ текширилади: мос келмаса файл УМУМАН
   * тайёрланмайди ва ходим хатони дарҳол кўради.
   */
  ustunSoni: number,
  guruhlar: Guruh[],
  izoh: string
): void {
  if (varaq.columnCount !== ustunSoni) {
    throw new Error(
      `«${varaq.name}» варағида ${varaq.columnCount} та устун бор, кутилгани ${ustunSoni} та. Андоза ўзгарган — тўлдириш қоидаси ҳам янгиланиши керак.`
    );
  }
  for (const g of guruhlar) {
    for (const [i, q] of g.qatorlar.entries()) {
      if (q.length !== ustunSoni - 1) {
        throw new Error(
          `«${varaq.name}» варағи${g.nomi ? `, ${g.nomi}` : ''}, ${i + 1}-қатор: ${q.length} та қиймат берилди, керагиси ${ustunSoni - 1} та. Устунлар сурилиб кетарди.`
        );
      }
    }
  }

  const namuna = varaq.getRow(BOSHLANISH);
  const oxirgiTayyor = BOSHLANISH + ANDOZA_QATORI - 1;

  /**
   * Қаторнинг безагини 6-қатордан кўчиради.
   *
   * ── Нега нусха эмас, ҲАВОЛА ──
   *
   * Илгари `{ ...asl.style }` ёзилган эди ва ҳар катак ўз
   * нусхасини оларди. Туман бўйича 45 мингта қаторда бу 12
   * сония ва 633 МБ хотира демак эди — серверсиз функция
   * чегарасидан ошиб кетарди.
   *
   * Безак объекти ҳеч қачон ЎЗГАРТИРИЛМАЙДИ, фақат ёзишда
   * ўқилади. Шунинг учун ҳамма қатор биттасини бўлишиб
   * ишлатса бўлади: ўша ўлчовда 5,7 сония ва 559 МБ.
   */
  const bezakniKochir = (q: ExcelJS.Row) => {
    q.height = namuna.height;
    for (let u = 1; u <= ustunSoni; u++) {
      q.getCell(u).style = namuna.getCell(u).style;
    }
  };

  let r = BOSHLANISH;

  for (const g of guruhlar) {
    /*
     * ── МФЙ АЖРАТУВЧИ ҚАТОРИ ──
     *
     * Туман кесимида битта варақда 70 та маҳалланинг қатори
     * ёнма-ён туради. Андозада эса «маҳалла» устуни ЙЎҚ — у
     * битта МФЙ учун тузилган ва сарлавҳада ном ёзилган.
     *
     * Устун қўшиб бўлмайди: жадвал ҳокимлик кутган шаклдан
     * чиқиб кетарди. Шунинг учун ҳар блок олдига бирлаштирилган
     * сарлавҳа қатори қўйилади — қоғоздаги йиғма жадваллар
     * айнан шундай тузилади.
     *
     * Бусиз файл ЎҚИБ БЎЛМАЙДИГАН бўларди: «Алиев Анвар»
     * қайси маҳалладан экани билинмасди.
     */
    if (g.nomi) {
      const ajratgich = varaq.getRow(r);
      if (r > oxirgiTayyor) bezakniKochir(ajratgich);
      for (let u = 1; u <= ustunSoni; u++) ajratgich.getCell(u).value = null;
      const k = ajratgich.getCell(1);
      k.value = `${g.nomi} МФЙ — ${g.qatorlar.length} та ёзув`;
      k.font = { bold: true, size: 11 };
      k.alignment = { vertical: 'middle', horizontal: 'left' };
      k.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8EEF7' },
      };
      varaq.mergeCells(r, 1, r, ustunSoni);
      ajratgich.height = 20;
      ajratgich.commit();
      r++;
    }

    g.qatorlar.forEach((qiymatlar, i) => {
      /*
       * `r + i` — блок ичидаги ўрин. Фақат `r` ёзилганда
       * блокнинг ҲАММА қатори битта жойга тушарди: охиргиси
       * қолиб, қолгани йўқоларди, ва андозанинг эски тартиб
       * рақамлари тагида кўриниб турарди.
       */
      const qator = r + i;
      const q = varaq.getRow(qator);
      if (qator > oxirgiTayyor) bezakniKochir(q);
      /*
       * Тартиб рақами ҳар МФЙ да ЯНГИДАН бошланади. Шунда
       * блок маҳалла юборган жадвалнинг ўзи билан бир хил
       * бўлади ва иккисини солиштириш осон.
       */
      q.getCell(1).value = i + 1;
      qiymatlar.forEach((v, j) => {
        q.getCell(j + 2).value = v === null || v === '' ? null : v;
      });
      q.commit();
    });
    r += g.qatorlar.length;
  }

  /* Ортиқча тайёр қаторлар тозаланади — сохта тартиб рақами қолмасин */
  for (let b = r; b <= oxirgiTayyor; b++) {
    const q = varaq.getRow(b);
    for (let u = 1; u <= ustunSoni; u++) q.getCell(u).value = null;
    q.commit();
  }

  /*
   * ── ЖАДВАЛ ТАГИДАГИ ИЗОҲ ──
   *
   * Бу сатрсиз ҳужжат ЁЛҒОН гапирарди: бўш устунни ўқиган
   * одам «демак бундай оила йўқ» деб тушунарди, ҳолбуки
   * савол умуман берилмаган. Фарқи катта — биринчиси хулоса,
   * иккинчиси маълумот йўқлиги.
   */
  const izohQatori = varaq.getRow(Math.max(r, oxirgiTayyor + 1) + 1);
  const katak = izohQatori.getCell(1);
  katak.value = izoh;
  katak.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
  katak.font = { size: 9, italic: true };
  varaq.mergeCells(izohQatori.number, 1, izohQatori.number, Math.max(ustunSoni, 2));
  izohQatori.height = 42;
  izohQatori.commit();
}

/**
 * ── ТЎЛИҚ МАЪЛУМОТ ВАРАҒИ ──
 *
 * Ҳокимлик андозаси анкетанинг ҳаммасини сўрамайди. Аммо
 * ҳокимга баъзан анкетанинг ЎЗИ керак: «қайси оилада газ
 * йўқ», «ким иссиқхона сўраган» — бундай савол етти варақдан
 * чиқмайди.
 *
 * Шунинг учун китоб охирига иккита варақ қўшилади. Андоза
 * варақларига ТЕГИЛМАЙДИ — ҳокимлик кутган етти варақ ўз
 * жойида, ўз шаклида қолади.
 *
 * Варақ оддий: биринчи қатор — сарлавҳа, қолгани — маълумот.
 * Фильтр ёқилади ва сарлавҳа музлатилади, шунда ўн минглаб
 * қаторни варақлаганда устун номлари кўриниб туради.
 */
function toliqVaraq<T>(
  kitob: ExcelJS.Workbook,
  nomi: string,
  ustunlar: Ustun<T>[],
  yozuvlar: T[]
): void {
  const v = kitob.addWorksheet(nomi, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }],
  });

  v.columns = ustunlar.map((u) => ({
    header: u.nomi,
    /*
     * Кенглик матн узунлигига қараб, аммо чегара билан:
     * «Даромадни кўпайтириш имконияти» эркин матн ва у
     * чегарасиз бўлса устун экранга сиғмасди.
     */
    width: Math.min(Math.max(u.nomi.length + 2, 10), 34),
  }));

  const sarlavha = v.getRow(1);
  sarlavha.font = { bold: true, size: 10 };
  sarlavha.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  sarlavha.height = 34;
  sarlavha.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
  sarlavha.commit();

  for (const y of yozuvlar) {
    v.addRow(ustunlar.map((u) => u.ol(y) ?? null)).commit();
  }

  /* Фильтр — ҳоким устун бўйича саралаб кўради */
  if (yozuvlar.length) {
    v.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: ustunlar.length },
    };
  }
}

/**
 * Сарлавҳани қамровга мослайди.
 *
 * Андозада «Хатирчи тумани "Уйшун" маҳалласи…» деб ёзилган —
 * «Уйшун» ҳокимлик юборган намунадаги маҳалла.
 *
 * ── Иккита ҳолат ──
 *
 * Битта МФЙ: қўштирноқ ичидаги ном алмаштирилади, қолгани
 * ўша-ўша қолади.
 *
 * Туман бўйича: маҳалла ҳақидаги қисмнинг ЎЗИ олиб ташланади.
 * Қўшимчани сақлаб қолиш керак, акс ҳолда гап бузиларди:
 * етти варақнинг сарлавҳаси уч хил қўшимча билан ёзилган —
 * «маҳалласи», «маҳалласида», «маҳалласидаги» — ва ҳар бири
 * ўз ўрнига мос кўпликка ўгирилади.
 */
function sarlavhaniYangila(varaq: ExcelJS.Worksheet, mahallaNomi: string | null): void {
  const katak = varaq.getCell('A1');
  const matn = typeof katak.value === 'string' ? katak.value : String(katak.value ?? '');
  if (!matn) return;

  if (mahallaNomi) {
    katak.value = matn.replace(/"[^"]*"/, `"${mahallaNomi}"`);
    return;
  }

  /* Узунроғидан бошлаб — «маҳалласидаги» «маҳалласи» дан олдин */
  katak.value = matn
    .replace(/"[^"]*"\s*маҳалласидаги/, 'барча маҳаллаларидаги')
    .replace(/"[^"]*"\s*маҳалласида/, 'барча маҳаллаларида')
    .replace(/"[^"]*"\s*маҳалласи/, 'барча маҳаллалари');
}

/* ── Маълумот ───────────────────────────────────────────────── */

export interface JadvalNatijasi {
  bayt: Buffer;
  /** Ҳар варақда нечта ёзув чиққани — экранда айтилади */
  sanoq: Record<string, number>;
}

/**
 * Маҳалла жадвалини тўлдириб, Excel файлини қайтаради.
 *
 * Фақат ЯКУНЛАНГАН хатловлар олинади: қоралама ярим тўлдирилган
 * анкета ва унинг рақами ҳокимлик ҳужжатига тушмаслиги керак.
 */
export async function mahallaJadvali(mahallaId?: string): Promise<JadvalNatijasi> {
  /*
   * Қамров: битта МФЙ ёки бутун туман.
   *
   * Иккаласи ҳам керак. Ҳокимлик жадвални ҳар маҳалладан
   * алоҳида сўрайди, аммо ҳоким ЙИҒМА нусхасини ҳам олади:
   * йиғилишда «туманда нечта хонадонда газ йўқ» деган
   * саволга жавоб битта файлдан чиқиши керак, 70 тасини
   * очиб эмас.
   */
  const mahallalar = await prisma.mahalla.findMany({
    where: mahallaId ? { id: mahallaId } : undefined,
    orderBy: { nomi: 'asc' },
    select: { id: true, nomiKirill: true },
  });
  if (!mahallalar.length) throw new JadvalXatosi('Маҳалла топилмади');

  /** Битта МФЙ кесимидами — блок сарлавҳалари шунга боғлиқ */
  const yakka = Boolean(mahallaId);

  const shart = mahallaId
    ? { mahallaId, holati: { not: 'QORALAMA' as const } }
    : { holati: { not: 'QORALAMA' as const } };

  const [xonadonlar, ishsizlar] = await Promise.all([
    /*
     * ТЎЛИҚ ёзув олинади, танланган майдонлар эмас.
     *
     * Андоза варақларига бир нечта майдон етарли эди, аммо
     * китобда «Хонадонлар — тўлиқ» варағи ҳам бор ва унга
     * анкетанинг ҲАММА майдони тушади. Иккита сўров юбориш
     * ўрнига биттасини тўлиқ олган арзонроқ.
     */
    prisma.household.findMany({
      where: shart,
      orderBy: { oilaBoshligi: 'asc' },
      include: {
        mahalla: { select: { nomiKirill: true } },
        xodim: { select: { fullName: true } },
        ishsizlar: { select: { mutaxassisligi: true } },
      },
    }),
    prisma.unemployedPerson.findMany({
      where: mahallaId ? { mahallaId } : undefined,
      orderBy: { fish: 'asc' },
      include: {
        mahalla: { select: { nomiKirill: true } },
        mutaxassis: { select: { fullName: true } },
        household: { select: { oilaBoshligi: true, parvarishgaMuhtoj: true } },
      },
    }),
  ]);

  /*
   * ── ҲАЖМ ЧЕГАРАСИ ──
   *
   * Еттала андоза варағи ва иккита тўлиқ варақ БИР ПАЙТДА
   * хотирада туради. Шунинг учун чегара бутун китоб бўйича
   * текширилади, ҳар варақда алоҳида эмас: бештаси 24 000
   * тадан бўлса ҳам алоҳида текширувдан ўтиб кетарди.
   *
   * Текшириш ЁЗИШДАН ОЛДИН бўлади — ярим тайёрланган файлни
   * ташлаб юборишдан кўра, умуман бошламаган яхши.
   */
  const jamiQator = xonadonlar.length * 2 + ishsizlar.length * 2;
  if (jamiQator > ENG_KOP_QATOR) {
    throw new JadvalXatosi(
      `Танланган ҳудудда ${xonadonlar.length.toLocaleString('ru-RU')} та хонадон ва ${ishsizlar.length.toLocaleString('ru-RU')} та фуқаро ёзуви бор — битта файлга бунча сиғмайди (чегара ${ENG_KOP_QATOR.toLocaleString('ru-RU')} қатор). Юқоридан МФЙ ни танлаб, жадвални маҳалла кесимида олинг.`
    );
  }

  const kitob = new ExcelJS.Workbook();
  await kitob.xlsx.load(ANDOZA_BAYTI);

  for (const v of kitob.worksheets) {
    sarlavhaniYangila(v, yakka ? mahallalar[0].nomiKirill : null);
  }

  const sanoq: Record<string, number> = {};
  const varaq = (i: number) => kitob.worksheets[i];

  /**
   * Ёзувларни МФЙ бўйича блокларга ажратади.
   *
   * Битта МФЙ кесимида блок битта бўлади ва номсиз қолади —
   * ажратувчи қатор чизилмайди, жадвал маҳалла юборадиган
   * шаклнинг АЙНАН ўзи бўлади.
   *
   * Туман кесимида ҳар МФЙ ўз блоги билан келади, номи ва
   * ёзув сони ёзилган сарлавҳа остида. Ёзуви йўқ МФЙ умуман
   * чиқарилмайди: 70 та бўш сарлавҳа жадвални ўқиб бўлмайдиган
   * қиларди.
   */
  function guruhla<T extends { mahallaId: string }>(
    yozuvlar: T[],
    qatorYasa: (y: T) => Katak[]
  ): Guruh[] {
    if (yakka) return [{ nomi: null, qatorlar: yozuvlar.map(qatorYasa) }];

    const guruhlar: Guruh[] = [];
    for (const m of mahallalar) {
      const oziniki = yozuvlar.filter((y) => y.mahallaId === m.id);
      if (!oziniki.length) continue;
      guruhlar.push({ nomi: m.nomiKirill, qatorlar: oziniki.map(qatorYasa) });
    }
    return guruhlar;
  }

  /** Блоклардаги жами ёзув сони */
  const jami = (g: Guruh[]) => g.reduce((n, x) => n + x.qatorlar.length, 0);

  /** Қамров ҳақидаги гап — ҳар варақ изоҳининг бошида туради */
  const qamrovMatni = yakka
    ? ''
    : `Жадвал ТУМАН бўйича йиғилган: ҳар МФЙ ўз блоги билан, номи ёзилган сарлавҳа остида туради, тартиб рақами ҳар блокда янгидан бошланади. `;

  /* ══ 1. КАМБАҒАЛ ОИЛАЛАР ══ */
  /*
   * Анкетада «бу оила камбағал» деган алоҳида катак йўқ —
   * камбағаллик МАҲАЛЛА кесимида, свод жадвалда саналади.
   *
   * Шунинг учун бу ерга ходим камбағаллик белгиси ёзган
   * оилалар олинади: сабаби кўрсатилган ёки ишсиз аъзоси
   * бор. Қоида жадвал тагида АЙТИЛАДИ — ҳоким рўйхат қандай
   * тузилганини билиши керак.
   */
  const kambagal = xonadonlar.filter(
    (x) => x.kambagallikSabablari.length > 0 || x.ishsizlarSoni > 0
  );
  const kambagalGuruh = guruhla(kambagal, (x) => {
      const bogliq = x.ishsizlar;
      const kasbli = bogliq.filter((i) => (i.mutaxassisligi ?? '').trim()).length;
      return [
        x.oilaBoshligi,
        x.jamiAzo,
        x.ishsizlarSoni,
        /* Касби бор/йўқ — фақат фуқаро анкетаси тўлдирилган
           бўлса. Акс ҳолда бўш: «нол» деб ёзиш «ҳаммасининг
           касби йўқ» деган ёлғон хулосага олиб келарди. */
        bogliq.length ? kasbli : null,
        bogliq.length ? bogliq.length - kasbli : null,
        x.ishlaydiganlar,
        null, // иш билан банд лекин даромади паст — анкетада йўқ
        x.bolalar0_3Yosh,
        x.maktabgachaYoshdagi,
        x.maktabYoshdagi,
        null, // коллеж талабалари — анкетада йўқ
        null, // олийгоҳ талабалари — анкетада йўқ
        x.bogchaKutayotganAyollar,
        null, // бева аёллар — анкетада йўқ
        null, // ажрашган аёллар — анкетада йўқ
        null, // пенсия ёшидагилар — анкетада йўқ
        Array.isArray(x.nogironShaxslar) ? x.nogironShaxslar.length : null,
      ];
  });
  varaqniToldir(
    varaq(0),
    USTUN.kambagal,
    kambagalGuruh,
    `${qamrovMatni}Рўйхат хатлов маълумотидан тузилган: камбағаллик сабаби кўрсатилган ёки ишсиз аъзоси бор оилалар (${jami(kambagalGuruh)} та). Бўш устунлар — «иш билан банд лекин даромади паст», «коллеж ва олийгоҳ талабалари», «бева ва ажрашган аёллар», «пенсия ёшидагилар» — хатлов анкетасида сўралмаган, шунинг учун тахмин билан тўлдирилмади. «Касб ҳунарга эга/эга эмас» устунлари фақат ишсиз фуқаро анкетаси тўлдирилган оилаларда чиқади.`
  );
  sanoq['камбағал оилалар'] = jami(kambagalGuruh);

  /* ══ 2. ИШСИЗЛАР ══ */
  const ishsizGuruh = guruhla(ishsizlar, (i) => {
      const ishda = i.holati === 'JOYLASHTIRILDI' || i.holati === 'TASDIQLANDI';
      const joy = [i.ishJoyi, i.ishLavozimi].filter(Boolean).join(', ');
      return [
        i.fish,
        i.mutaxassisligi,
        malumotBelgisi(i.malumoti, 'orta'),
        malumotBelgisi(i.malumoti, 'ortaMaxsus'),
        malumotBelgisi(i.malumoti, 'oliy'),
        ishda && joy ? joy : ishda ? 'ҳа' : null,
        haYoq(i.household?.parvarishgaMuhtoj ?? null),
        null, // норасмий банд — анкетада йўқ
        null, // томорқа ва деҳқон хўжалигида
        null, // фермер хўжалигида
        null, // тадбиркорлик субъектида
        null, // кунлик қурилиш ишларида
        null, // кунлик хўжалик ишларида
        i.takliflar.includes('Xorijga mehnat migratsiyasi') ? '+' : null,
      ];
  });
  varaqniToldir(
    varaq(1),
    USTUN.ishsizlar,
    ishsizGuruh,
    `${qamrovMatni}Рўйхатда барча ишсиз фуқаро ёзувлари (${jami(ishsizGuruh)} та). «Расмий банд» устуни ишга жойлаштирилган ва тасдиқланганлар учун иш жойи билан тўлдирилади. «Норасмий банд» ва унинг ости устунлари — томорқа, фермер, тадбиркорлик, кунлик иш — хатлов анкетасида сўралмаган; фақат «ички ёки ташқи миграция» устуни фуқарога миграция таклифи белгиланганда «+» олади.`
  );
  sanoq['ишсизлар'] = jami(ishsizGuruh);

  /* ══ 3. МИГРАЦИЯ ══ */
  /*
   * Анкета миграцияни ХОНАДОН кесимида сўрайди: «оиладан
   * нечта киши хорижда», «қайси давлатда», «ойига қанча пул
   * келади». Ҳар бир мигрантнинг исми алоҳида ёзилмайди.
   *
   * Шунинг учун бу ерда қатор — ОИЛА, шахс эмас. Буни
   * яшириш нотўғри бўларди: ходим устунга битта исм ёзиб
   * қўйса, ҳоким уни ўша одам деб ўқиган бўларди.
   */
  const migratsiya = xonadonlar.filter((x) => x.chetElMehnati);
  const migratsiyaGuruh = guruhla(migratsiya, (x) => {
      const davlatlar = [
        ...x.chetElDavlatlari.map((d) => kirillcha(CHET_EL_DAVLATI, d)),
        x.chetElBoshqaDavlat,
      ]
        .filter(Boolean)
        .join(', ');
      const dollar = dollarga(x.chetElOylikPul, x.chetElValyuta);
      return [
        `${x.oilaBoshligi} оиласи`,
        davlatlar || null,
        null, // фаолият тури — анкетада йўқ
        null, // касб ҳунарга эга бўлмаганлар — анкетада йўқ
        null, // ўрта
        null, // ўрта махсус
        null, // олий
        dollar !== null && dollar < 500 ? '+' : null,
        dollar !== null && dollar >= 500 && dollar <= 1000 ? '+' : null,
        dollar !== null && dollar > 1000 ? '+' : null,
        `оиладан ${x.chetElIshchilar} киши${dollar !== null ? `; ойига ≈${dollar} АҚШ доллари` : ''}`,
      ];
  });
  varaqniToldir(
    varaq(2),
    USTUN.migratsiya,
    migratsiyaGuruh,
    `${qamrovMatni}Хатлов миграцияни ХОНАДОН кесимида сўрайди: ҳар бир мигрантнинг исми алоҳида ёзилмайди. Шунинг учун ҳар қатор — битта ОИЛА (${jami(migratsiyaGuruh)} та), охирги устунда эса оиладан нечта киши хорижда экани кўрсатилган. Мигрантларнинг Ф.И.Ш., фаолият тури ва маълумоти анкетада сўралмаган. Даромад доллари сўмдаги жавобдан жорий курс бўйича ҳисобланган.`
  );
  sanoq['миграция'] = jami(migratsiyaGuruh);

  /* ══ 4. АЖРАТИЛГАН ЕРЛАР ══ */
  const yerlar = xonadonlar.filter((x) => x.qoshimchaYerBor);
  const yerGuruh = guruhla(yerlar, (x) => [
      x.oilaBoshligi,
      sotixdanGa(x.qoshimchaYerMaydoni),
      null, // картошка
      null, // сабзавот
      null, // полиз
      null, // дуккакли
      null, // бошоқли
      null, // беда
      null, // маккажўхори
      null, // бошқа экин турлари
      null, // фойдаланиш даражаси
      null, // даромади
      null, // деҳқон хўжалиги
      suvDarajasi(x.sugorishSuvi),
      'хатловдаги «қўшимча фойдаланувдаги ер» маълумоти',
  ]);
  varaqniToldir(
    varaq(3),
    USTUN.yerlar,
    yerGuruh,
    `${qamrovMatni}Рўйхат хатлов анкетасидаги «қўшимча фойдаланувдаги ер майдони» саволидан тузилган (${jami(yerGuruh)} та оила). Бу ПФ-18 бўйича расмийлаштирилган ер рўйхати ЭМАС — ер қайси ҳужжат билан берилгани анкетада сўралмайди, шунинг учун рўйхатни ер кадастри билан солиштириш керак. Майдон анкетада сотихда сўралади, бу ерга гектарга ўгирилиб ёзилган (1 га = 100 сотих). Экин турлари бўйича тақсимот, даромад ва деҳқон хўжалиги ҳолати анкетада сўралмаган. Сув таъминоти «суғориш суви борми» саволидан: бор бўлса «қониқарли», йўқ бўлса «қониқарсиз».`
  );
  sanoq['ажратилган ерлар'] = jami(yerGuruh);

  /* ══ 5. ТОМОРҚА ЕРЛАРИ ══ */
  const tomorqa = xonadonlar.filter((x) => x.tomorqaBor);
  const tomorqaGuruh = guruhla(tomorqa, (x) => [
      x.oilaBoshligi,
      x.tomorqaMaydoni,
      null, // картошка
      null, // сабзавот
      null, // полиз
      null, // дуккакли
      null, // бошоқли
      null, // беда
      null, // макка-жўхори
      null, // боғ ва токзорлар
      x.issiqxonaMaydoni,
      null, // бошқа экин турлари
      x.yirikShoxliSoni,
      x.maydaShoxliSoni,
      null, // отлар — анкетада йўқ
      x.parrandaSoni,
      null, // қуёнлар — анкетада йўқ
      null, // асалари уялари — анкетада йўқ
      foydalanishDarajasi(x.tomorqaFoydalanish),
      null, // ўртача даромади — анкетада йўқ
      suvDarajasi(x.sugorishSuvi),
      x.ekinMaydoni ? `жами экилган: ${x.ekinMaydoni} сотих` : null,
  ]);
  varaqniToldir(
    varaq(4),
    USTUN.tomorqa,
    tomorqaGuruh,
    `${qamrovMatni}Рўйхатда томорқаси бор оилалар (${jami(tomorqaGuruh)} та). Хатлов экин турлари бўйича тақсимот сўрамайди — фақат ЖАМИ экилган майдонни, у охирги устунда кўрсатилган. Отлар, қуёнлар ва асалари уялари анкетада алоҳида сўралмаган. «Фойдаланиш даражаси» анкетадаги тўрт баҳодан ўгирилган: «аъло» ва «яхши» → яхши, «қониқарли» → қониқарли, «ёмон» → қониқарсиз. Иссиқхона майдони — оила иссиқхона талабини билдирганда кўрсатилган майдон.`
  );
  sanoq['томорқа ерлари'] = jami(tomorqaGuruh);

  /* ══ 6. ТАДБИРКОР ВА ФЕРМЕРЛАР ══ */
  /*
   * Хатлов анкетаси тадбиркорлик ИСТАГИНИ сўрайди — мавжуд
   * корхона рўйхатини эмас. Бу варақ эса субъект номи,
   * раҳбари, ер майдони, ишчилар сони ва ЙИЛЛИК ДАРОМАД
   * сўрайди.
   *
   * Уни истак билдирган оилалар билан тўлдириш мумкин эди,
   * аммо бу ҳужжатни бузарди: «тадбиркор» устунида ҳали иш
   * бошламаган одам турарди ва ҳоким уни фаолият юритаётган
   * субъект деб ўқирди.
   */
  varaqniToldir(
    varaq(5),
    USTUN.tadbirkor,
    [],
    `Бу варақ хатлов маълумотидан тўлдирилмайди. Хатлов анкетаси тадбиркорлик ИСТАГИНИ сўрайди — фаолият юритаётган субъект рўйхатини эмас. Жадвал эса субъект номи, раҳбари, ер майдони, ишчилар сони ва йиллик даромадни сўрайди; бундай маълумот солиқ идораси ва статистика бўлимида туради. Варақни тўлдириш учун анкетага алоҳида бўлим қўшилиши керак.`
  );
  sanoq['тадбиркор ва фермерлар'] = 0;

  /* ══ 7. БЎШ ТУРГАН БИНОЛАР ══ */
  varaqniToldir(
    varaq(6),
    USTUN.boshObyekt,
    [],
    `Бу варақ хатлов маълумотидан тўлдирилмайди. Бўш турган бино ва ерлар хонадон хатловида сўралмайди — хатлов оила ҳаёти ҳақида, объект эса маҳалла мулки ҳақида. Варақни тўлдириш учун анкетага алоҳида бўлим ёки маҳалла раиси тўлдирадиган мустақил рўйхат керак.`
  );
  sanoq['бўш турган бинолар'] = 0;

  /* ══ 8-9. ТЎЛИҚ МАЪЛУМОТ ══ */
  /*
   * Андоза варақларидан КЕЙИН қўшилади — ҳокимлик очганда
   * биринчи етти варақни кўриши керак, қўшимчаси охирида
   * турсин.
   */
  toliqVaraq(kitob, 'Хонадонлар — тўлиқ', XONADON_USTUNLARI, xonadonlar);
  sanoq['хонадон (тўлиқ)'] = xonadonlar.length;

  toliqVaraq(kitob, 'Ишсизлар — тўлиқ', FUQARO_USTUNLARI, ishsizlar);
  sanoq['фуқаро (тўлиқ)'] = ishsizlar.length;

  const bayt = (await kitob.xlsx.writeBuffer()) as Buffer;
  return { bayt: Buffer.from(bayt), sanoq };
}
