import { prisma } from './prisma';
import { BAND_HOLATLAR, orinHisobi, type OrinHisobi } from './joylashtirish';
import {
  moslikBoyichaTartibla,
  moslikniHisobla,
  type Moslik,
  type NomzodMaydonlari,
  type OrinMaydonlari,
} from './moslik';

/**
 * ============================================================
 *  МОСЛАШТИРИШ ТАХТАСИ — СЕРВЕР ТОМОНИ
 *
 *  Икки томонлама савол:
 *    · эълон очилди — КИМГА таклиф қилиш керак?
 *    · фуқаро билан суҳбат бўлди — унга ҚАЙСИ эълон тўғри келади?
 *
 *  Иккиси ҳам битта ҳисобдан («moslik.ts») фойдаланади, шунинг
 *  учун иккита рўйхат бир-бирига ЗИД бўлмайди: эълон саҳифасида
 *  биринчи турган одам, фуқаро саҳифасида ҳам шу эълонни
 *  биринчи кўради.
 *
 *  ── Нега ҳаммаси хотирага олинади ──
 *
 *  Фонетик мослик SQL да ҳисобланмайди: «пайвандчи» ва
 *  «payvandchi» база учун икки хил сатр. Шунинг учун номзодлар
 *  хотирага олиниб, шу ерда сараланади.
 *
 *  Туманда 3,5 мингга яқин ишсиз бор ва улардан фақат 12 та
 *  кичик майдон ўқилади — бу бир неча юз килобайт ва бир неча
 *  миллисекунд. Барибир юқори чегара қўйилган: рўйхат кутилмаган
 *  даражада ўсиб кетса, саҳифа секинлашмасдан, эҳтиёткор
 *  бўлиб қолади.
 * ============================================================
 */

/** Хотирага оладиган номзодлар сонининг юқори чегараси */
const NOMZOD_CHEGARASI = 5000;

/** Фуқаро саҳифасида нечта эълон кўрсатилади */
const ORIN_CHEGARASI = 6;

/** Мослик шундан паст бўлса, таклиф қилишнинг маъноси йўқ */
const ENG_KAM_BALL = 25;

const NOMZOD_TANLOVI = {
  id: true,
  fish: true,
  telefon: true,
  holati: true,
  mahallaId: true,
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
  mahalla: { select: { nomiKirill: true } },
} as const;

export type Nomzod = Awaited<
  ReturnType<typeof prisma.unemployedPerson.findFirstOrThrow<{ select: typeof NOMZOD_TANLOVI }>>
>;

export interface NomzodNatijasi {
  nomzod: Nomzod;
  moslik: Moslik;
}

/** `Nomzod` дан ҳисоб учун керакли майдонларни ажратади */
function nomzodMaydonlari(n: Nomzod): NomzodMaydonlari {
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

/**
 * Эълонга мос номзодларни топади.
 *
 * Аллақачон ишга жойлашганлар рўйхатга киритилмайди — уларга
 * таклиф қилиш вақтни йўқотиш. Рад этганлар эса ҚОЛАДИ: бир
 * таклифдан бош тортган одам бошқасини қабул қилиши мумкин,
 * фақат рўйхатда шу белгиси кўринади.
 *
 * @param orin эълон майдонлари
 * @param tuman `true` бўлса бутун туман, акс ҳолда фақат шу маҳалла
 */
export async function nomzodlarniTop(
  orin: OrinMaydonlari,
  tuman: boolean
): Promise<NomzodNatijasi[]> {
  const royxat = await prisma.unemployedPerson.findMany({
    where: {
      ...(tuman ? {} : { mahallaId: orin.mahallaId }),
      holati: { notIn: BAND_HOLATLAR },
      vacancyId: null,
    },
    select: NOMZOD_TANLOVI,
    take: NOMZOD_CHEGARASI,
  });

  return moslikBoyichaTartibla(royxat, (n) => moslikniHisobla(orin, nomzodMaydonlari(n))).map(
    (x) => ({ nomzod: x.element, moslik: x.moslik })
  );
}

export interface OrinNatijasi {
  orin: {
    id: string;
    korxonaNomi: string;
    lavozim: string;
    yonalish: string | null;
    talablar: string | null;
    telefon: string | null;
    maosh: bigint | null;
    mahallaId: string;
    mahalla: { nomiKirill: string };
  };
  hisob: OrinHisobi;
  moslik: Moslik;
}

/**
 * Фуқарога мос бўш иш ўринларини топади.
 *
 * Тўлган эълонлар чиқарилади: улар рўйхатда турса, мутахассис
 * бор-йўқ ўринни таклиф қилиб, фуқарони бекорга умидвор қиларди.
 */
export async function orinlarniTop(
  nomzod: NomzodMaydonlari,
  cheklov = ORIN_CHEGARASI
): Promise<OrinNatijasi[]> {
  const [orinlar, bandlar] = await Promise.all([
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
    prisma.unemployedPerson.groupBy({
      by: ['vacancyId'],
      where: { vacancyId: { not: null }, holati: { in: BAND_HOLATLAR } },
      _count: { _all: true },
    }),
  ]);

  const band = new Map(bandlar.map((b) => [b.vacancyId as string, b._count._all]));

  const natija: OrinNatijasi[] = [];
  for (const o of orinlar) {
    const hisob = orinHisobi(o.ornlarSoni, band.get(o.id) ?? 0);
    if (hisob.toldimi) continue;

    const { ornlarSoni: _o, ...maydonlar } = o;
    natija.push({
      orin: maydonlar,
      hisob,
      moslik: moslikniHisobla(
        { lavozim: o.lavozim, yonalish: o.yonalish, talablar: o.talablar, maosh: o.maosh, mahallaId: o.mahallaId },
        nomzod
      ),
    });
  }

  return natija
    .filter((x) => x.moslik.ball >= ENG_KAM_BALL)
    .sort((a, b) => b.moslik.ball - a.moslik.ball)
    .slice(0, cheklov);
}

/** Бир нечта эълоннинг банд ўринларини бир сўровда санайди */
export async function bandOrinlar(orinIdlari: string[]): Promise<Map<string, number>> {
  if (orinIdlari.length === 0) return new Map();
  const guruhlar = await prisma.unemployedPerson.groupBy({
    by: ['vacancyId'],
    where: { vacancyId: { in: orinIdlari }, holati: { in: BAND_HOLATLAR } },
    _count: { _all: true },
  });
  return new Map(guruhlar.map((g) => [g.vacancyId as string, g._count._all]));
}

export { nomzodMaydonlari };
