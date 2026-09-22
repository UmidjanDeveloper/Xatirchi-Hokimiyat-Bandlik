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
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import {
  CHET_EL_DAVLATI,
  MALUMOT,
  TOMORQA_FOYDALANISH,
  VALYUTA_KURSI,
  kirillcha,
} from '@/lib/constants';

/** Андоза файли — ҳокимлик юборган асл нусха */
const ANDOZA = path.join(process.cwd(), 'src/lib/hisobot/andoza/mahalla-jadvali.xlsx');

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
 * Битта варақни тўлдиради.
 *
 * `qatorlar` — ҳар бири бир қатор; ичидаги массив А устундан
 * бошлаб кетма-кет катаклар (№ устунисиз, у ўзи қўйилади).
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
  qatorlar: Katak[][],
  izoh: string
): void {
  if (varaq.columnCount !== ustunSoni) {
    throw new Error(
      `«${varaq.name}» варағида ${varaq.columnCount} та устун бор, кутилгани ${ustunSoni} та. Андоза ўзгарган — тўлдириш қоидаси ҳам янгиланиши керак.`
    );
  }
  for (const [i, q] of qatorlar.entries()) {
    if (q.length !== ustunSoni - 1) {
      throw new Error(
        `«${varaq.name}» варағи, ${i + 1}-қатор: ${q.length} та қиймат берилди, керагиси ${ustunSoni - 1} та. Устунлар сурилиб кетарди.`
      );
    }
  }

  const namuna = varaq.getRow(BOSHLANISH);

  qatorlar.forEach((qiymatlar, i) => {
    const q = varaq.getRow(BOSHLANISH + i);

    /*
     * Янги қаторнинг безаги 6-қатордан кўчирилади. Акс ҳолда
     * 48-қатордан бошлаб жадвал чегарасиз давом этарди.
     */
    if (BOSHLANISH + i > BOSHLANISH + ANDOZA_QATORI - 1) {
      q.height = namuna.height;
      for (let u = 1; u <= ustunSoni; u++) {
        const asl = namuna.getCell(u);
        const yangi = q.getCell(u);
        yangi.style = { ...asl.style };
      }
    }

    q.getCell(1).value = i + 1;
    qiymatlar.forEach((v, j) => {
      q.getCell(j + 2).value = v === null || v === '' ? null : v;
    });
    q.commit();
  });

  /* Ортиқча тайёр қаторлар тозаланади — сохта тартиб рақами қолмасин */
  for (let r = BOSHLANISH + qatorlar.length; r < BOSHLANISH + ANDOZA_QATORI; r++) {
    const q = varaq.getRow(r);
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
  const izohQatori = varaq.getRow(BOSHLANISH + Math.max(qatorlar.length, ANDOZA_QATORI) + 1);
  const katak = izohQatori.getCell(1);
  katak.value = izoh;
  katak.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
  katak.font = { size: 9, italic: true };
  varaq.mergeCells(izohQatori.number, 1, izohQatori.number, Math.max(ustunSoni, 2));
  izohQatori.height = 42;
  izohQatori.commit();
}

/** Сарлавҳадаги маҳалла номини алмаштиради */
function sarlavhaniYangila(varaq: ExcelJS.Worksheet, eski: string, yangi: string): void {
  const katak = varaq.getCell('A1');
  const matn = typeof katak.value === 'string' ? katak.value : String(katak.value ?? '');
  if (!matn) return;
  /*
   * Андозада «Уйшун» ёзилган — у ҳокимлик юборган намунадаги
   * маҳалла. Қўштирноқ ичидаги ҳар қандай ном алмаштирилади,
   * шунда андоза бошқа маҳалла билан келса ҳам ишлайди.
   */
  const almashgan = matn.replace(/"[^"]*"/, `"${yangi}"`);
  katak.value = almashgan.includes(yangi)
    ? almashgan
    : matn.replace(eski, yangi);
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
export async function mahallaJadvali(mahallaId: string): Promise<JadvalNatijasi> {
  const mahalla = await prisma.mahalla.findUnique({
    where: { id: mahallaId },
    select: { nomiKirill: true },
  });
  if (!mahalla) throw new Error('Маҳалла топилмади');

  const shart = { mahallaId, holati: { not: 'QORALAMA' as const } };

  const [xonadonlar, ishsizlar] = await Promise.all([
    prisma.household.findMany({
      where: shart,
      orderBy: { oilaBoshligi: 'asc' },
      select: {
        id: true,
        oilaBoshligi: true,
        manzil: true,
        telefon: true,
        jamiAzo: true,
        ishsizlarSoni: true,
        ishlaydiganlar: true,
        bolalar0_3Yosh: true,
        maktabgachaYoshdagi: true,
        maktabYoshdagi: true,
        bogchaKutayotganAyollar: true,
        nogironShaxslar: true,
        kambagallikSabablari: true,
        parvarishgaMuhtoj: true,
        chetElMehnati: true,
        chetElIshchilar: true,
        chetElDavlatlari: true,
        chetElBoshqaDavlat: true,
        chetElOylikPul: true,
        chetElValyuta: true,
        qoshimchaYerBor: true,
        qoshimchaYerMaydoni: true,
        tomorqaBor: true,
        tomorqaMaydoni: true,
        ekinMaydoni: true,
        tomorqaFoydalanish: true,
        issiqxonaMaydoni: true,
        yirikShoxliSoni: true,
        maydaShoxliSoni: true,
        parrandaSoni: true,
        sugorishSuvi: true,
        ishsizlar: { select: { mutaxassisligi: true } },
      },
    }),
    prisma.unemployedPerson.findMany({
      where: { mahallaId },
      orderBy: { fish: 'asc' },
      select: {
        fish: true,
        mutaxassisligi: true,
        malumoti: true,
        holati: true,
        ishJoyi: true,
        ishLavozimi: true,
        takliflar: true,
        household: { select: { parvarishgaMuhtoj: true } },
      },
    }),
  ]);

  const kitob = new ExcelJS.Workbook();
  await kitob.xlsx.load(await readFile(ANDOZA));

  const nom = mahalla.nomiKirill;
  for (const v of kitob.worksheets) sarlavhaniYangila(v, 'Уйшун', nom);

  const sanoq: Record<string, number> = {};
  const varaq = (i: number) => kitob.worksheets[i];

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
  varaqniToldir(
    varaq(0),
    USTUN.kambagal,
    kambagal.map((x) => {
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
    }),
    `Рўйхат хатлов маълумотидан тузилган: камбағаллик сабаби кўрсатилган ёки ишсиз аъзоси бор оилалар (${kambagal.length} та). Бўш устунлар — «иш билан банд лекин даромади паст», «коллеж ва олийгоҳ талабалари», «бева ва ажрашган аёллар», «пенсия ёшидагилар» — хатлов анкетасида сўралмаган, шунинг учун тахмин билан тўлдирилмади. «Касб ҳунарга эга/эга эмас» устунлари фақат ишсиз фуқаро анкетаси тўлдирилган оилаларда чиқади.`
  );
  sanoq['камбағал оилалар'] = kambagal.length;

  /* ══ 2. ИШСИЗЛАР ══ */
  varaqniToldir(
    varaq(1),
    USTUN.ishsizlar,
    ishsizlar.map((i) => {
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
    }),
    `Рўйхатда маҳалладаги барча ишсиз фуқаро ёзувлари (${ishsizlar.length} та). «Расмий банд» устуни ишга жойлаштирилган ва тасдиқланганлар учун иш жойи билан тўлдирилади. «Норасмий банд» ва унинг ости устунлари — томорқа, фермер, тадбиркорлик, кунлик иш — хатлов анкетасида сўралмаган; фақат «ички ёки ташқи миграция» устуни фуқарога миграция таклифи белгиланганда «+» олади.`
  );
  sanoq['ишсизлар'] = ishsizlar.length;

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
  varaqniToldir(
    varaq(2),
    USTUN.migratsiya,
    migratsiya.map((x) => {
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
    }),
    `Хатлов миграцияни ХОНАДОН кесимида сўрайди: ҳар бир мигрантнинг исми алоҳида ёзилмайди. Шунинг учун ҳар қатор — битта ОИЛА (${migratsiya.length} та), охирги устунда эса оиладан нечта киши хорижда экани кўрсатилган. Мигрантларнинг Ф.И.Ш., фаолият тури ва маълумоти анкетада сўралмаган. Даромад доллари сўмдаги жавобдан жорий курс бўйича ҳисобланган.`
  );
  sanoq['миграция'] = migratsiya.length;

  /* ══ 4. АЖРАТИЛГАН ЕРЛАР ══ */
  const yerlar = xonadonlar.filter((x) => x.qoshimchaYerBor);
  varaqniToldir(
    varaq(3),
    USTUN.yerlar,
    yerlar.map((x) => [
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
    ]),
    `Рўйхат хатлов анкетасидаги «қўшимча фойдаланувдаги ер майдони» саволидан тузилган (${yerlar.length} та оила). Бу ПФ-18 бўйича расмийлаштирилган ер рўйхати ЭМАС — ер қайси ҳужжат билан берилгани анкетада сўралмайди, шунинг учун рўйхатни ер кадастри билан солиштириш керак. Майдон анкетада сотихда сўралади, бу ерга гектарга ўгирилиб ёзилган (1 га = 100 сотих). Экин турлари бўйича тақсимот, даромад ва деҳқон хўжалиги ҳолати анкетада сўралмаган. Сув таъминоти «суғориш суви борми» саволидан: бор бўлса «қониқарли», йўқ бўлса «қониқарсиз».`
  );
  sanoq['ажратилган ерлар'] = yerlar.length;

  /* ══ 5. ТОМОРҚА ЕРЛАРИ ══ */
  const tomorqa = xonadonlar.filter((x) => x.tomorqaBor);
  varaqniToldir(
    varaq(4),
    USTUN.tomorqa,
    tomorqa.map((x) => [
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
    ]),
    `Рўйхатда томорқаси бор оилалар (${tomorqa.length} та). Хатлов экин турлари бўйича тақсимот сўрамайди — фақат ЖАМИ экилган майдонни, у охирги устунда кўрсатилган. Отлар, қуёнлар ва асалари уялари анкетада алоҳида сўралмаган. «Фойдаланиш даражаси» анкетадаги тўрт баҳодан ўгирилган: «аъло» ва «яхши» → яхши, «қониқарли» → қониқарли, «ёмон» → қониқарсиз. Иссиқхона майдони — оила иссиқхона талабини билдирганда кўрсатилган майдон.`
  );
  sanoq['томорқа ерлари'] = tomorqa.length;

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

  const bayt = (await kitob.xlsx.writeBuffer()) as Buffer;
  return { bayt: Buffer.from(bayt), sanoq };
}
