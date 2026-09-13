import { prisma } from './prisma';
import { BAND_HOLATLAR, orinHisobi, type OrinHisobi } from './joylashtirish';
import { moslikniHisobla, type Moslik, type NomzodMaydonlari, type OrinMaydonlari } from './moslik';

/**
 * ============================================================
 *  БЎШ ИШ ЎРНИНИНГ ТАҚСИМОТИ
 *
 *  Савол оддий эди: «бандлик ходими янги эълон киритди — уни
 *  тақсимоти қандай бўлади?»
 *
 *  Илгари ҳеч қандай тақсимот йўқ эди. Эълон базага тушарди ва
 *  уни ФАҚАТ бандлик маркази кўрарди. Одамни эса маҳалла ходими
 *  билади: ким ишсиз, ким ҳақиқатан ишлашга тайёр, кимнинг
 *  прававси бор. Шу иккови учрашмаса, эълон «бор» бўлиб туради,
 *  одам эса «йўқ» бўлиб қолади.
 *
 *  Энди тақсимот ИККИ ТОМОНГА ишлайди ва иккови ҳам БИТТА
 *  ҳисобдан (`moslik.ts`) келади:
 *
 *    1. Эълон томонидан — «бу иш ўрни қайси маҳаллаларга
 *       тарқатилсин»: ҳар маҳаллада нечта мос номзод бор.
 *       Бандлик ходими рўйхатнинг тепасидаги икки-уч маҳалла
 *       раисига қўнғироқ қилади, 70 тасига эмас.
 *
 *    2. Маҳалла томонидан — «менинг маҳалламга қайси иш
 *       ўринлари тўғри келади»: ходим ўз саҳифасида кўради ва
 *       фуқарони ўзи хабардор қилади.
 *
 *  ── Нега «нечта номзод», «мослик фоизи» эмас ──
 *
 *  Маҳалла раисига «87% мослик» деган рақам ҳеч нарса
 *  билдирмайди. «Сизнинг маҳаллангизда 4 та мос одам бор» эса
 *  дарҳол ишга айланади: у уларнинг исмини кўради ва телефон
 *  қилади.
 * ============================================================
 */

/**
 * Тақсимотга тушиш чегараси.
 *
 * `moslik.ts` да 45 дан юқориси «ўрта», 70 дан юқориси «юқори»
 * мослик. Тақсимот учун ЎРТА даража олинади: паст мослик
 * рўйхатни шовқин билан тўлдиради ва маҳалла ходими унга
 * ишонишни тўхтатади.
 */
export const TAQSIMOT_CHEGARASI = 45;

const NOMZOD_TANLOVI = {
  id: true,
  fish: true,
  telefon: true,
  mahallaId: true,
  householdId: true,
  jinsi: true,
  tugilganSana: true,
  malumoti: true,
  mutaxassisligi: true,
  xohlaganIsh: true,
  organmoqchiKasb: true,
  oxirgiIshJoyi: true,
  avvalgiIshJoyi: true,
  kutilayotganMaosh: true,
  ishgaTayyorligi: true,
  haydovchilikGuvohnomasi: true,
  haydovchilikToifasi: true,
  takliflar: true,
  vacancyId: true,
} as const;

type XomNomzod = {
  id: string;
  fish: string;
  telefon: string | null;
  mahallaId: string;
  householdId: string | null;
} & NomzodMaydonlari;

function maydonlar(n: XomNomzod): NomzodMaydonlari {
  return {
    mahallaId: n.mahallaId,
    jinsi: n.jinsi,
    tugilganSana: n.tugilganSana,
    malumoti: n.malumoti,
    mutaxassisligi: n.mutaxassisligi,
    xohlaganIsh: n.xohlaganIsh,
    organmoqchiKasb: n.organmoqchiKasb,
    oxirgiIshJoyi: n.oxirgiIshJoyi,
    avvalgiIshJoyi: n.avvalgiIshJoyi,
    kutilayotganMaosh: n.kutilayotganMaosh,
    ishgaTayyorligi: n.ishgaTayyorligi,
    haydovchilikGuvohnomasi: n.haydovchilikGuvohnomasi,
    haydovchilikToifasi: n.haydovchilikToifasi,
    takliflar: n.takliflar,
    vacancyId: n.vacancyId,
  };
}

/** Банд бўлмаган, ҳали эълонга бириктирилмаган номзодлар */
function bosNomzodlarShart() {
  return { holati: { notIn: BAND_HOLATLAR }, vacancyId: null } as const;
}

// ─────────────────────────────────────────────────────────────
//  1. ЭЪЛОН → МАҲАЛЛАЛАР
// ─────────────────────────────────────────────────────────────

export interface MahallaUlushi {
  mahallaId: string;
  nomiKirill: string;
  /** Шу маҳаллада чегарадан юқори номзодлар сони */
  nomzodlar: number;
  /** Энг юқори балл — тартиб шунга қараб ҳам аниқланади */
  engYuqoriBall: number;
  /** Эълон айнан шу маҳаллада очилганми */
  ozMahallasi: boolean;
}

/**
 * Битта эълон қайси маҳаллаларга тарқатилиши кераклигини
 * ҳисоблайди.
 *
 * Эълон очилган маҳалла рўйхатда ҲАР ДОИМ биринчи туради, ҳатто
 * унда номзод камроқ бўлса ҳам: яқинлик — ишга бориш масаласи,
 * ва узоқдаги «мосроқ» одам биринчи ойдаёқ ишдан кетиб қолиши
 * мумкин.
 */
export interface TaqsimotNatijasi {
  ulushlar: MahallaUlushi[];
  jami: number;
  /**
   * Чегарадан ўтган ҳеч ким бўлмагани учун паст мослик
   * кўрсатилаётганми.
   *
   * Бу ҳолатда рўйхат ЯШИРИЛМАЙДИ. Илгари шундай қилинган
   * эди — «мос одам йўқ бўлса, нима кўрсатамиз» деб. Натижада
   * ходим эълонни очар, ҳеч қандай тақсимот кўрмас ва «бу
   * бўлим ишламаяпти» деб ўйларди. Ҳолбуки жавоб бор эди:
   * «ҳеч кимда 45% дан юқори мослик йўқ, энг яқинлари мана
   * булар» — бу ҳам қарор учун етарли маълумот.
   */
  pastMoslik: boolean;
  chegara: number;
}

export async function orinTaqsimoti(
  orinId: string,
  chegara = TAQSIMOT_CHEGARASI
): Promise<TaqsimotNatijasi | null> {
  const orin = await prisma.vacancy.findUnique({
    where: { id: orinId },
    select: {
      id: true,
      lavozim: true,
      yonalish: true,
      talablar: true,
      maosh: true,
      mahallaId: true,
    },
  });
  if (!orin) return null;

  const [nomzodlar, mahallalar] = await Promise.all([
    prisma.unemployedPerson.findMany({
      where: bosNomzodlarShart(),
      select: NOMZOD_TANLOVI,
    }),
    prisma.mahalla.findMany({ select: { id: true, nomiKirill: true } }),
  ]);

  const nomi = new Map(mahallalar.map((m) => [m.id, m.nomiKirill]));

  /** Берилган чегара бўйича маҳаллалар кесимини йиғади */
  const yig = (eng_kam: number) => {
    const yigma = new Map<string, { soni: number; eng: number }>();
    for (const n of nomzodlar) {
      const m = moslikniHisobla(orin as OrinMaydonlari, maydonlar(n as XomNomzod));
      if (m.ball < eng_kam || m.tosiq) continue;
      const oldingi = yigma.get(n.mahallaId) ?? { soni: 0, eng: 0 };
      yigma.set(n.mahallaId, { soni: oldingi.soni + 1, eng: Math.max(oldingi.eng, m.ball) });
    }
    return yigma;
  };

  /*
   * Аввал ЎРТА даража (45%) синаб кўрилади. Ҳеч ким ўтмаса,
   * чегара 20% га туширилади ва рўйхат «паст мослик» белгиси
   * билан кўрсатилади: ходимга «жавоб йўқ» дейишдан кўра «энг
   * яқинлари мана булар, лекин мослик паст» дейиш фойдалироқ.
   */
  let pastMoslik = false;
  let yigma = yig(chegara);
  if (yigma.size === 0) {
    pastMoslik = true;
    yigma = yig(20);
  }
  if (yigma.size === 0) {
    return { ulushlar: [], jami: 0, pastMoslik, chegara };
  }

  const ulushlar: MahallaUlushi[] = [...yigma.entries()]
    .map(([mahallaId, v]) => ({
      mahallaId,
      nomiKirill: nomi.get(mahallaId) ?? '—',
      nomzodlar: v.soni,
      engYuqoriBall: v.eng,
      ozMahallasi: mahallaId === orin.mahallaId,
    }))
    .sort((a, b) => {
      // Эълон очилган маҳалла — ҳар доим биринчи
      if (a.ozMahallasi !== b.ozMahallasi) return a.ozMahallasi ? -1 : 1;
      if (b.nomzodlar !== a.nomzodlar) return b.nomzodlar - a.nomzodlar;
      return b.engYuqoriBall - a.engYuqoriBall;
    });

  return {
    /* Паст мослик ҳолатида рўйхат қисқа бўлсин — 70 та маҳалла керак эмас */
    ulushlar: pastMoslik ? ulushlar.slice(0, 5) : ulushlar,
    jami: ulushlar.reduce((s, x) => s + x.nomzodlar, 0),
    pastMoslik,
    chegara,
  };
}

// ─────────────────────────────────────────────────────────────
//  2. МАҲАЛЛА → ЭЪЛОНЛАР
// ─────────────────────────────────────────────────────────────

export interface MahallaOrni {
  orin: {
    id: string;
    korxonaNomi: string;
    lavozim: string;
    yonalish: string | null;
    telefon: string | null;
    maosh: bigint | null;
    mahallaId: string;
    mahalla: { nomiKirill: string };
  };
  hisob: OrinHisobi;
  /**
   * Шу маҳалладаги мос фуқаролар — балл бўйича тартибда.
   *
   * `householdId` ҲАВОЛА учун керак. Маҳалла ходими фуқаронинг
   * ШАХСИЙ анкетасини кўрмайди (унда ташхис ва ишга тайёрлик
   * каби маълумот бор) — шунинг учун исм ХОНАДОН саҳифасига
   * боғланади, ўша ерда у аллақачон ҳамма нарсани киритган.
   */
  nomzodlar: {
    id: string;
    fish: string;
    telefon: string | null;
    householdId: string | null;
    moslik: Moslik;
  }[];
}

/**
 * Маҳалла ходими учун: «менинг маҳалламдаги фуқароларга қайси
 * бўш иш ўринлари тўғри келади».
 *
 * Тўлган эълонлар чиқарилади ва мос одами бўлмаган эълонлар ҳам
 * кўрсатилмайди: ходимга «сизга тегишлиси йўқ» деган узун
 * рўйхатни варақлатишнинг маъноси йўқ.
 */
export async function mahallaOrinlari(
  mahallaId: string,
  { chegara = TAQSIMOT_CHEGARASI, orinChegarasi = 8, nomzodChegarasi = 5 } = {}
): Promise<MahallaOrni[]> {
  const [orinlar, nomzodlar, bandlar] = await Promise.all([
    prisma.vacancy.findMany({
      where: { faol: true },
      select: {
        id: true,
        korxonaNomi: true,
        lavozim: true,
        yonalish: true,
        talablar: true,
        telefon: true,
        maosh: true,
        mahallaId: true,
        ornlarSoni: true,
        mahalla: { select: { nomiKirill: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.unemployedPerson.findMany({
      where: { ...bosNomzodlarShart(), mahallaId },
      select: NOMZOD_TANLOVI,
    }),
    prisma.unemployedPerson.groupBy({
      by: ['vacancyId'],
      where: { vacancyId: { not: null }, holati: { in: BAND_HOLATLAR } },
      _count: { _all: true },
    }),
  ]);

  const band = new Map(bandlar.map((b) => [b.vacancyId as string, b._count._all]));
  const natija: MahallaOrni[] = [];

  for (const o of orinlar) {
    const hisob = orinHisobi(o.ornlarSoni, band.get(o.id) ?? 0);
    if (hisob.toldimi) continue;

    const mos = nomzodlar
      .map((n) => ({
        id: n.id,
        fish: n.fish,
        telefon: n.telefon,
        householdId: n.householdId,
        moslik: moslikniHisobla(
          { lavozim: o.lavozim, yonalish: o.yonalish, talablar: o.talablar, maosh: o.maosh, mahallaId: o.mahallaId },
          maydonlar(n as XomNomzod)
        ),
      }))
      .filter((x) => x.moslik.ball >= chegara && !x.moslik.tosiq)
      .sort((a, b) => b.moslik.ball - a.moslik.ball);

    if (mos.length === 0) continue;

    const { ornlarSoni: _o, talablar: _t, ...orinMaydonlari } = o;
    natija.push({
      orin: orinMaydonlari,
      hisob,
      nomzodlar: mos.slice(0, nomzodChegarasi),
    });
  }

  /*
   * Тартиб: аввал ЎЗ маҳалласидаги эълонлар, кейин мос одам
   * кўп бўлганлари. Бошқа маҳалладаги иш ҳам бўлади, лекин
   * ходим аввал ёнидагисини кўрсин.
   */
  return natija
    .sort((a, b) => {
      const aOz = a.orin.mahallaId === mahallaId;
      const bOz = b.orin.mahallaId === mahallaId;
      if (aOz !== bOz) return aOz ? -1 : 1;
      if (b.nomzodlar.length !== a.nomzodlar.length) return b.nomzodlar.length - a.nomzodlar.length;
      return b.nomzodlar[0].moslik.ball - a.nomzodlar[0].moslik.ball;
    })
    .slice(0, orinChegarasi);
}
