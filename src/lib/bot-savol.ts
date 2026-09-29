import { prisma } from './prisma';
import { lotinga } from './alifbo';
import { FAOL_ELON } from './elon-muddati';
import { tumanHolati } from './tuman-holati';
import { xaritaMalumoti } from './xarita/xarita-malumoti';
import { MENYU } from './bot-menyu';
import type { Tugma } from './xabarnoma';

/**
 * ============================================================
 *  БОТДА САВОЛ-ЖАВОБ
 *
 *  ── Нега меню етмайди ──
 *
 *  Менюда тўртта тугма бор ва улар кундалик ишни қоплайди.
 *  Аммо йиғилишда савол БОШҚАЧА туғилади: «Уйшунда неча
 *  киши иш кутяпти?», «Хатлов қанчага етди?».
 *
 *  Бундай савол учун тугма ясаб бўлмайди — уларнинг сони 70
 *  та маҳаллага 7 та кўрсаткич, яъни беш юздан ортиқ. Раҳбар
 *  эса тугма ахтариб ўтирмайди: у шунчаки ЁЗАДИ.
 *
 *  ── Нега сунъий интеллект эмас ──
 *
 *  Модел чақириш мумкин эди. Қилинмади, ва сабаби битта эмас:
 *
 *    1. Модел ЎЙЛАБ ЧИҚАРАДИ. «Уйшунда 42 та ишсиз бор» деган
 *       жавоб чиройли кўринади ва хато бўлиши мумкин. Ҳоким
 *       уни йиғилишда айтади — ва тизимга бўлган ишонч
 *       ўшанда тугайди.
 *    2. Ҳар савол пул туради ва ҳар сафар ташқарига сўров
 *       кетади. Ички кўрсаткич эса ташқарига чиқмаслиги
 *       керак.
 *    3. Интернет узилса, бот жим қолади.
 *
 *  Бу ерда жавоб БАЗАДАН олинади ва ҳар доим ўша рақамни
 *  беради. Матн тушунилмаса, бот «билмадим» демайди — нима
 *  сўраш мумкинлигини кўрсатади.
 *
 *  ── Нега аввал МАҲАЛЛА, кейин савол ──
 *
 *  «Уйшунда нечта ишсиз бор» деган саволда икки нарса бор:
 *  ҳудуд ва кўрсаткич. Кўрсаткични аниқлаш хатога мойил —
 *  «ишсиз», «иш кутаётган», «рўйхатдаги» бир хил маънода
 *  ишлатилади.
 *
 *  Шунинг учун маҳалла номи топилса, бот унинг БАРЧА
 *  рақамини беради. Бу «қайси кўрсаткични сўради» деган
 *  саволни умуман йўқ қилади — жавобда ҳаммаси бор.
 * ============================================================
 */

/** Тугма белгилари */
export const SAVOL = {
  TUMAN: 's.tuman',
  YORDAM: 's.yordam',
} as const;

/**
 * Маҳалла номи камида нечта белгидан бўлса, изланади.
 *
 * Уч ҳарфли калит тасодифан бошқа сўз ичидан топилади.
 */
const ENG_QISQA_NOM = 4;

/**
 * Шу узунликдан қисқа ном — ЧАЛКАШ.
 *
 * ── Нега керак бўлди ──
 *
 * Туманда «Янги» деган маҳалла бор. «Янги» эса ўзбек тилидаги
 * энг кўп ишлатиладиган сўзлардан бири: «янги иш ўрни борми?»
 * деган савол шу маҳаллага тушиб кетарди ва раҳбар бутунлай
 * бошқа жавоб оларди.
 *
 * «Сарой» ҳам шундай — у «Кўксарой» нинг ичида ҳам бор.
 *
 * Қоида: қисқа ном ФАҚАТ қўшимча белги билан қабул қилинади.
 *
 *    «янги иш ўрни»    → маҳалла ЭМАС (қўшимчасиз)
 *    «Янгида нечта»    → маҳалла (-да қўшимчаси)
 *    «Янги МФЙ»        → маҳалла («МФЙ» сўзи турибди)
 *
 * Бу қоида табиий: одам маҳалла ҳақида сўраганда деярли ҳар
 * доим «-да» ёки «МФЙ» ишлатади.
 */
const CHALKASH_UZUNLIK = 6;

/** Маҳалла эканини аниқ билдирадиган сўзлар */
const MAHALLA_SOZI = ['mfy', 'mahalla', 'mahallasi', 'qishloq'];

export interface SavolJavobi {
  matn: string;
  tugmalar: Tugma[];
  /** Қайси ниятга тушди — синов ва кузатув учун */
  niyat: string;
}

/** Иккала алифбони битта калитга келтиради, бўшлиқсиз */
export function kalit(matn: string): string {
  return lotinga(matn)
    .toLowerCase()
    .replace(/[''ʻʼ`´]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/** Ўша қоида, аммо сўзлар ажралган ҳолда */
export function kalitSozlar(matn: string): string {
  return lotinga(matn)
    .toLowerCase()
    .replace(/[''ʻʼ`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function raqam(n: number): string {
  return n.toLocaleString('ru-RU').replace(/ /g, ' ');
}

function foiz(n: number): string {
  return `${n.toString().replace('.', ',')}%`;
}

/**
 * Ниятлар каталоги.
 *
 * Калит сўзлар ЛОТИНда ва апострофсиз ёзилган: савол
 * кириллда келса ҳам, `kalitSozlar` уни ўша кўринишга
 * келтиради. Шунинг учун рўйхат битта — иккита эмас, ва
 * бирини янгилаб, иккинчисини унутиб бўлмайди.
 */
const NIYATLAR: { niyat: string; sozlar: string[] }[] = [
  { niyat: 'yordam', sozlar: ['yordam', 'nima sorash', 'nima qila olasan', 'help', 'qollanma'] },
  { niyat: 'orin', sozlar: ['ish orni', 'ish orinlari', 'vakansiya', 'bosh ish', 'elon', 'ish bormi', 'orin bormi'] },
  { niyat: 'joylashgan', sozlar: ['joylash', 'ishga kirdi', 'ishga kirgan', 'bandlik natija', 'natija'] },
  { niyat: 'qamrov', sozlar: ['qamrov', 'xatlov', 'xatlandi', 'xonadon'] },
  { niyat: 'ishsiz', sozlar: ['ishsiz', 'ish kutayotgan', 'royxatda', 'anketa'] },
  { niyat: 'topshiriq', sozlar: ['topshiriq', 'muddat', 'kechik'] },
  { niyat: 'xodim', sozlar: ['xodim', 'ulangan', 'ulanmagan', 'bot'] },
  { niyat: 'saf', sozlar: ['eng faol', 'faol mahalla', 'saf', 'reyting', 'oldinda', 'eng kop'] },
  { niyat: 'tuman', sozlar: ['tuman', 'umumiy', 'jami', 'hammasi', 'butun', 'rayon', 'holat'] },
];

export function niyatniTop(matn: string): string | null {
  const s = kalitSozlar(matn);
  if (!s) return null;

  let eng: { niyat: string; ball: number } | null = null;
  for (const n of NIYATLAR) {
    const ball = n.sozlar.filter((w) => s.includes(w)).length;
    if (ball > 0 && (!eng || ball > eng.ball)) eng = { niyat: n.niyat, ball };
  }
  return eng?.niyat ?? null;
}

/**
 * Ном саволдаги сўзлар ичида борми.
 *
 * ── Нега шунчаки `includes` эмас ──
 *
 * Аввал бутун савол бўшлиқсиз бир сатрга айлантирилиб,
 * унинг ичидан ном изланарди. Бу сўз чегарасини кўрмайди:
 * «Кўксарой» ичидан «Сарой» ҳам топиларди, ва жавоб бошқа
 * маҳалла ҳақида бўлиб чиқарди.
 *
 * Энди мослик СЎЗ БОШИДАН изланади. Қўшимча эса эркин:
 * «Уйшунда», «Уйшуннинг», «Уйшундаги» — учови ҳам «Уйшун»
 * га тушади.
 *
 * Кўп сўзли ном учун (масалан «Алишер Навоий») кетма-кет
 * сўзлар бирлаштириб кўрилади.
 */
function nomMosmi(sozlar: string[], nomKaliti: string): { mos: boolean; qoshimcha: number } {
  const ENG_KOP_SOZ = 4;

  for (let i = 0; i < sozlar.length; i++) {
    let birikma = '';
    for (let j = i; j < Math.min(sozlar.length, i + ENG_KOP_SOZ); j++) {
      birikma += sozlar[j];

      if (birikma.startsWith(nomKaliti)) {
        return { mos: true, qoshimcha: birikma.length - nomKaliti.length };
      }
      /* Ҳали тўлиқ эмас — кейинги сўз билан давом этамиз */
      if (!nomKaliti.startsWith(birikma)) break;
    }
  }
  return { mos: false, qoshimcha: 0 };
}

/**
 * Саволдан маҳалла номини ажратади.
 *
 * Энг УЗУН мос келгани танланади: «Алишер Навоий» ва
 * «Навоий» иккови ҳам рўйхатда бўлса, тўлиқроғи тўғри.
 */
export async function mahallaniTop(
  matn: string
): Promise<{ id: string; nomiKirill: string } | null> {
  const sozlar = kalitSozlar(matn).split(' ').filter(Boolean);
  if (sozlar.length === 0) return null;

  const mahallaSozi = sozlar.some((w) => MAHALLA_SOZI.includes(w));

  const mahallalar = await prisma.mahalla.findMany({
    select: { id: true, nomi: true, nomiKirill: true },
  });

  let eng: { id: string; nomiKirill: string; uzunlik: number } | null = null;

  for (const m of mahallalar) {
    for (const nom of [m.nomiKirill, m.nomi]) {
      if (!nom) continue;
      const k = kalit(nom);
      if (k.length < ENG_QISQA_NOM) continue;

      const { mos, qoshimcha } = nomMosmi(sozlar, k);
      if (!mos) continue;

      /* Қисқа ном — фақат қўшимча ёки «МФЙ» сўзи билан */
      if (k.length < CHALKASH_UZUNLIK && qoshimcha === 0 && !mahallaSozi) continue;

      if (!eng || k.length > eng.uzunlik) {
        eng = { id: m.id, nomiKirill: m.nomiKirill, uzunlik: k.length };
      }
    }
  }

  return eng ? { id: eng.id, nomiKirill: eng.nomiKirill } : null;
}

/**
 * Матн улаш коди шаклидами.
 *
 * Код — олтита белги, чалкаштириладиган ҳарфларсиз (O/0, I/1
 * йўқ). Шакл аниқ бўлгани учун уни саволдан ажратиш мумкин.
 */
export function kodShaklimi(matn: string): boolean {
  return /^[A-HJ-NP-Za-hj-np-z2-9]{6}$/.test(matn.trim());
}

/** Туман кесимини кўра оладиган роллар */
function kengKoradi(rol: string): boolean {
  return rol === 'HOKIM' || rol === 'BANDLIK_RAHBAR' || rol === 'ADMIN' || rol === 'BANDLIK';
}

const ORQAGA: Tugma[] = [{ yozuv: '⬅️ Меню', belgi: MENYU.MENYU }];

/**
 * Асосий кириш нуқтаси.
 *
 * Тартиб: аввал маҳалла, кейин ният, охирида кўрсатма. Учови
 * ҳам тушмаса — бот «тушунмадим» демайди, нима сўраш
 * мумкинлигини айтади.
 */
export async function savolgaJavob(userId: string, matn: string): Promise<SavolJavobi> {
  const xodim = await prisma.user.findUnique({
    where: { id: userId },
    select: { rol: true, mahallaId: true, mahalla: { select: { nomiKirill: true } } },
  });
  if (!xodim) return yordamMatni(false);

  const keng = kengKoradi(xodim.rol);
  const sorlgan = await mahallaniTop(matn);

  /* ── МАҲАЛЛА СЎРАЛГАН ── */
  if (sorlgan) {
    /*
     * ── МАҲАЛЛА ИЗОЛЯЦИЯСИ ──
     *
     * Маҳалла ходими фақат ЎЗ маҳалласини кўради. Бу қоида
     * сайтда биринчи кундан амал қилади ва бот уни бузмаслиги
     * керак: акс ҳолда ботдан сўраб, сайтда беркитилган
     * рақамни олиш мумкин бўларди.
     */
    if (!keng && sorlgan.id !== xodim.mahallaId) {
      return {
        niyat: 'mahalla.taqiq',
        matn: [
          `<b>${sorlgan.nomiKirill} МФЙ</b> маълумоти сизга очиқ эмас.`,
          '',
          xodim.mahalla
            ? `Сиз ${xodim.mahalla.nomiKirill} МФЙ бўйича маълумот ола оласиз — номини ёзинг.`
            : 'Сизга маҳалла бириктирилмаган.',
        ].join('\n'),
        tugmalar: ORQAGA,
      };
    }
    return mahallaKartasi(sorlgan.id, sorlgan.nomiKirill);
  }

  /* ── НИЯТ ── */
  const niyat = niyatniTop(matn);

  /*
   * Маҳалла ходими «туман бўйича» сўраса, унга ўз маҳалласи
   * берилади. Бу — рад жавоб эмас: у ўз ҳудуди учун
   * жавобгар ва саволи ҳам ўша ҳақда.
   */
  if (!keng) {
    if (niyat === 'yordam' || !niyat) return yordamMatni(false);
    if (!xodim.mahallaId) {
      return { niyat: 'mahalla.yoq', matn: 'Сизга маҳалла бириктирилмаган.', tugmalar: ORQAGA };
    }
    return mahallaKartasi(xodim.mahallaId, xodim.mahalla?.nomiKirill ?? '—');
  }

  switch (niyat) {
    case 'yordam':
      return yordamMatni(true);
    case 'orin':
      return orinlarJavobi();
    case 'saf':
      return safJavobi();
    case 'xodim':
    case 'topshiriq':
    case 'qamrov':
    case 'ishsiz':
    case 'joylashgan':
    case 'tuman':
      return tumanKartasi();
    default:
      return yordamMatni(true);
  }
}

/**
 * Туман кесимидаги карта.
 *
 * Рақамлар `tuman-holati` дан — брифинг ва девор таблоси ҳам
 * ўша ердан ўқийди. Ботда «134», таблода «136» турса,
 * иккаласига ҳам ишонч қолмайди.
 */
export async function tumanKartasi(): Promise<SavolJavobi> {
  const h = await tumanHolati();

  return {
    niyat: 'tuman',
    matn: [
      '<b>Хатирчи тумани — ҳозирги ҳолат</b>',
      '',
      `🏠 Хатлов: <b>${raqam(h.xatlovXonadon)}</b> / ${raqam(h.bazaXonadon)} хонадон · ${foiz(h.qamrovFoizi)}`,
      `👤 Хатлов топган ишсиз: <b>${raqam(h.topilganIshsiz)}</b> та`,
      `📝 Шахсий анкетаси бор: <b>${raqam(h.anketa)}</b> та`,
      `✅ Ишга жойлаштирилган: <b>${raqam(h.joylashtirilgan)}</b> та`,
      `      шундан ҳужжат билан тасдиқланган: <b>${raqam(h.tasdiqlanganJoylashuv)}</b> та`,
      `📋 Очиқ иш ўрни: <b>${raqam(h.ochiqOrin)}</b> та`,
      '',
      `🏘 Хатлов бошланган маҳалла: ${raqam(h.boshlaganMahalla)} / ${raqam(h.jamiMahalla)}`,
      `🔗 Ботга уланган ходим: ${raqam(h.ulanganXodim)} / ${raqam(h.xodim)}`,
      ...(h.dalilsizJoylashuv > 0
        ? [`⚠️ Ҳужжатсиз жойлаштириш: <b>${raqam(h.dalilsizJoylashuv)}</b> та`]
        : []),
      ...(h.kechikkanTopshiriq > 0
        ? [`⚠️ Муддати ўтган топшириқ: <b>${raqam(h.kechikkanTopshiriq)}</b> та`]
        : []),
    ].join('\n'),
    tugmalar: ORQAGA,
  };
}

/**
 * Битта маҳалла картаси.
 *
 * Маълумот ХАРИТА манбаидан олинади — панелдаги харита ҳам
 * ўшани кўрсатади. Иккита ҳар хил сўров бўлса, ботдаги ва
 * экрандаги рақам вақт ўтиб айрилиб кетарди.
 */
export async function mahallaKartasi(
  mahallaId: string,
  nomiKirill: string
): Promise<SavolJavobi> {
  const [xarita, orinlar] = await Promise.all([
    xaritaMalumoti(),
    prisma.vacancy.count({ where: { ...FAOL_ELON(), mahallaId } }),
  ]);

  const q = xarita.qatorlar.find((x) => x.mahallaId === mahallaId);

  if (!q) {
    /*
     * Харитада контури йўқ МФЙ. Рақами бор, аммо бу манбада
     * йўқ — жимгина нол кўрсатиш ўрнига шуни АЙТАМИЗ.
     */
    return {
      niyat: 'mahalla.topilmadi',
      matn: `<b>${nomiKirill} МФЙ</b> харита манбаида топилмади. Маълумотни сайтдан кўринг.`,
      tugmalar: ORQAGA,
    };
  }

  const boshlangan = q.xatlovXonadon > 0;

  return {
    niyat: 'mahalla',
    matn: [
      `<b>${nomiKirill} МФЙ</b>`,
      '',
      boshlangan
        ? `🏠 Хатлов: <b>${raqam(q.xatlovXonadon)}</b> / ${raqam(q.bazaXonadon)} хонадон · ${foiz(q.qamrovFoizi)}`
        : `🏠 Хатлов ҳали бошланмаган (базада ${raqam(q.bazaXonadon)} хонадон)`,
      `👤 Анкетаси тўлдирилган: <b>${raqam(q.aniqlangan)}</b> та`,
      `✅ Ишга жойлаштирилган: <b>${raqam(q.joylashtirilgan)}</b> та`,
      `⏳ Ҳали иш кутаётган: <b>${raqam(q.ishsizQoldiq)}</b> та`,
      `📋 Очиқ иш ўрни: <b>${raqam(orinlar)}</b> та`,
      '',
      `Свод жадвалида: ${raqam(q.bazaAholi)} аҳоли · ${raqam(q.bazaIshsiz)} ишсиз`,
    ].join('\n'),
    tugmalar: ORQAGA,
  };
}

/** Очиқ иш ўринлари — қисқа рўйхат */
async function orinlarJavobi(): Promise<SavolJavobi> {
  const orinlar = await prisma.vacancy.findMany({
    where: FAOL_ELON(),
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      lavozim: true,
      korxonaNomi: true,
      ornlarSoni: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });

  if (orinlar.length === 0) {
    return {
      niyat: 'orin',
      matn: 'Ҳозирча очиқ иш ўрни йўқ.',
      tugmalar: ORQAGA,
    };
  }

  return {
    niyat: 'orin',
    matn: [
      `<b>Очиқ иш ўринлари</b> — ${orinlar.length} та`,
      '',
      ...orinlar.map(
        (o, i) =>
          `${i + 1}. <b>${o.lavozim}</b> — ${o.korxonaNomi}\n    ${o.mahalla.nomiKirill} МФЙ · ${o.ornlarSoni} та ўрин`
      ),
    ].join('\n'),
    tugmalar: ORQAGA,
  };
}

/** Етти кунда энг кўп хатлов қилган маҳаллалар */
async function safJavobi(): Promise<SavolJavobi> {
  const { faolMahallalar, kunBoshi, KUN_MS } = await import('./tuman-holati');

  const bugun = kunBoshi(new Date());
  const ertaga = new Date(bugun.getTime() + KUN_MS);
  const haftaBoshi = new Date(bugun.getTime() - 6 * KUN_MS);

  const saf = await faolMahallalar(haftaBoshi, ertaga, 5);

  if (saf.length === 0) {
    return {
      niyat: 'saf',
      matn: 'Бу ҳафтада ҳали биронта хатлов киритилмаган.',
      tugmalar: ORQAGA,
    };
  }

  return {
    niyat: 'saf',
    matn: [
      '<b>Етти кунда энг фаол МФЙ</b>',
      '',
      ...saf.map((s, i) => `${i + 1}. ${s.nomiKirill} — <b>${raqam(s.xonadon)}</b> хонадон`),
    ].join('\n'),
    tugmalar: ORQAGA,
  };
}

/**
 * Тушунилмаган савол.
 *
 * ── Нега «тушунмадим» дейилмайди ──
 *
 * «Тушунмадим» — бу тупик. Одам иккинчи марта уриниб кўради,
 * яна тушунилмаса, ботни ёпади ва қайтиб очмайди.
 *
 * Шунинг учун жавобда МИСОЛ бор: айнан шу сатрларни нусха
 * кўчириб юбориш мумкин ва улар ишлайди.
 */
export function yordamMatni(keng: boolean): SavolJavobi {
  return {
    niyat: 'yordam',
    matn: [
      '<b>Савол ёзинг — рақам билан жавоб бераман</b>',
      '',
      'Масалан:',
      ...(keng
        ? [
            '• <code>Уйшун</code> — маҳалла бўйича барча рақам',
            '• <code>Туман бўйича ҳолат</code>',
            '• <code>Очиқ иш ўринлари</code>',
            '• <code>Энг фаол маҳаллалар</code>',
          ]
        : [
            '• <code>Маҳаллам бўйича</code> — ўз МФЙ ингиз рақамлари',
            '• <code>Очиқ иш ўринлари</code>',
          ]),
      '',
      'Кирилл ҳам, лотин ҳам бўлаверади.',
    ].join('\n'),
    tugmalar: [
      ...(keng ? [{ yozuv: '📊 Туман бўйича', belgi: SAVOL.TUMAN }] : []),
      ...ORQAGA,
    ],
  };
}
