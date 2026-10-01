import type { Rol } from '@prisma/client';
import { prisma } from './prisma';
import { kuzatuvIshlari } from './kuzatuv';
import { elonlarSifati } from './elon-sifati';
import { javobsizYollanmalar, JAVOBSIZ_KUN } from './yollanma';
import { YANGILANMAGAN_KUNI } from './kurslar-nomlari';
import { sanaOrali } from './oila-rejasi';
import { mahallaFiltri } from './auth';
import { JOYLASHGAN, KUN_MS } from './bandlik-holatlari';
import { MODERATSIYA_KUTMOQDA } from './elon-muddati';
import { tasdiqHisobi } from './joylashuv-dalili';

/**
 * ============================================================
 *  ВАЗИФАЛАР ТАХТАСИ — «МЕНИНГ БУГУНГИ ИШИМ»
 *
 *  ── Қандай нуқсонни ёпади ──
 *
 *  Тизимда ажойиб таҳлил панели бор эди: диаграммалар,
 *  маҳаллалар кесими, ойлик оқим. Аммо у САВОЛГА жавоб
 *  берарди, ВАЗИФАни кўрсатмасди.
 *
 *  Ходим эрталаб тизимга киради ва «мен нима қилишим керак»
 *  деган саволга жавоб ололмайди. У ўзи қидириб топиши
 *  керак эди: рўйхатларни варақлаб, муддати ўтганини
 *  кўзи билан излаб.
 *
 *  Топилмаган иш — бажарилмаган иш. Муддати ўтган топшириқ
 *  ҳеч кимга кўринмаса, у шунчаки йўқ.
 *
 *  ── Ҳар рол ЎЗ ишини кўради ──
 *
 *  Маҳалла ходимига «туманда 19 та жойлаштириш» рақами
 *  керак эмас: унга «БУГУН шу тўрт оилага бориш керак»
 *  керак. Ҳокимга эса аксинча.
 *
 *  ── МАВЖУД САҲИФАЛАР ЎЗГАРМАДИ ──
 *
 *  Хатлов кетмоқда ва 70 та ходим `/xatlov` дан бошлашга
 *  ўрганган. Шунинг учун бу ЯНГИ саҳифа: эски йўллар,
 *  эски бошланғич саҳифалар ва таҳлил панели жойида
 *  қолди.
 *
 *  ── МАЪЛУМОТ ЙЎҚ БЎЛСА, НОЛ ЁЗИЛМАЙДИ ──
 *
 *  Айрим блоклар ҳали қурилмаган имкониятга таянади
 *  (мурожаатлар каталоги, хатолар журнали). Уларга «0»
 *  ёзиш ЁЛҒОН бўларди: «муаммо йўқ» деб кўринар, аслида
 *  «ўлчов йўқ» эди.
 *
 *  Бундай блок `yetishmayotgan` матни билан қайтади ва
 *  экранда «бу ҳали ўлчанмайди» деб туради.
 * ============================================================
 */

/** Блокнинг шошилинчлик даражаси — экранда ранг беради */
export type Ogohlik = 'tinch' | 'diqqat' | 'shoshilinch';

export interface VazifaQatori {
  id: string;
  matn: string;
  qoshimcha?: string;
  yol?: string;
}

export interface VazifaBlogi {
  kalit: string;
  nomi: string;
  /** НЕГА бу муҳим — бир жумла */
  izoh: string;
  soni: number;
  ogohlik: Ogohlik;
  /** «Ҳаммасини кўриш» ҳаволаси */
  yol?: string;
  qatorlar: VazifaQatori[];
  /**
   * Ўлчов ҲАЛИ ЙЎҚ бўлса — нега йўқлиги.
   *
   * Бундай блокда `soni` га ишониб бўлмайди ва экранда
   * рақам умуман чиқмайди.
   */
  yetishmayotgan?: string;
  /**
   * ── РАҚАМ ҚАНДАЙ ЧИҚДИ ──
   *
   * Юқорига ҳисобот бўлиб кетадиган рақамларда бу
   * МАЖБУРИЙ. Аввал рақам ялангоч турарди: ҳоким
   * йиғилишда уни айтади, кимдир «нотўғри» дейди — ва
   * баҳсни ҳал қиладиган ҳеч нарса қолмайди.
   */
  hisoblash?: { usuli: string; manbasi: string; ogohlik?: string };
}

export interface VazifaTaxtasi {
  rol: Rol;
  sarlavha: string;
  izoh: string;
  bloklar: VazifaBlogi[];
}

/** Кун боши — Тошкент вақтида */
const TOSHKENT_SOAT = 5;

export function kunBoshi(hozir = new Date()): Date {
  /*
   * Сервер UTC да. «Бугун» ни UTC да ҳисоблаш кечқурун
   * соат 19:00 дан кейин ЭРТАГА га ўтиб кетарди — ва
   * ходимнинг «бугунги ташрифлари» бўшаб қоларди.
   */
  const t = new Date(hozir.getTime() + TOSHKENT_SOAT * 3600_000);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - TOSHKENT_SOAT * 3600_000);
}

export function kunOxiri(hozir = new Date()): Date {
  return new Date(kunBoshi(hozir).getTime() + KUN_MS);
}

const qisqa = (m: string, n = 60) => (m.length > n ? `${m.slice(0, n - 1)}…` : m);

/** Очиқ топшириқлар — бажарилмаган ва бекор қилинмаган */
const OCHIQ_TOPSHIRIQ = ['KUTILMOQDA', 'BAJARILMOQDA', 'KECHIKDI'] as const;

/**
 * Маҳалла фильтрини `ActionPlan` га тушириш.
 *
 * Топшириқ хонадонга ҳам, фуқарога ҳам боғланиши мумкин ва
 * иккови ҳар хил жадвалда. Шунинг учун `OR`.
 */
function topshiriqFiltri(mahallaId?: string) {
  if (!mahallaId) return {};
  return {
    OR: [{ household: { mahallaId } }, { ishsiz: { mahallaId } }],
  };
}

/* ══════════════════════════════════════════════════════════
 *  МАҲАЛЛА ХОДИМИ
 * ══════════════════════════════════════════════════════════ */

async function yettilikTaxtasi(mahallaId: string | undefined): Promise<VazifaBlogi[]> {
  const bugun = kunBoshi();
  const ertaga = kunOxiri();
  const hafta = new Date(Date.now() + 7 * KUN_MS);
  const qayer = topshiriqFiltri(mahallaId);

  const [bugungi, kechikkan, yaqin, aloqa, orinlar] = await Promise.all([
    /* 1. БУГУНГИ ТАШРИФЛАР — муддати айнан бугун */
    prisma.actionPlan.findMany({
      where: { ...qayer, holati: { in: [...OCHIQ_TOPSHIRIQ] }, muddat: { gte: bugun, lt: ertaga } },
      orderBy: { muddat: 'asc' },
      take: 8,
      select: {
        id: true,
        muammo: true,
        masulTashkilot: true,
        household: { select: { id: true, oilaBoshligi: true } },
        ishsiz: { select: { id: true, fish: true } },
      },
    }),
    /* 2. МУДДАТИ ЎТГАН — энг шошилинчи */
    prisma.actionPlan.findMany({
      where: { ...qayer, holati: { in: [...OCHIQ_TOPSHIRIQ] }, muddat: { lt: bugun } },
      orderBy: { muddat: 'asc' },
      take: 8,
      select: {
        id: true,
        muammo: true,
        muddat: true,
        household: { select: { id: true, oilaBoshligi: true } },
        ishsiz: { select: { id: true, fish: true } },
      },
    }),
    /* 3. МУДДАТИ ЯҚИН — бир ҳафта ичида */
    prisma.actionPlan.count({
      where: { ...qayer, holati: { in: [...OCHIQ_TOPSHIRIQ] }, muddat: { gte: ertaga, lt: hafta } },
    }),
    /*
     * 4. АЛОҚА ҚИЛИШ КЕРАК БЎЛГАН ОИЛАЛАР
     *
     * Аниқланган-у, ҳали суҳбат ўтказилмаган ишсиз бор
     * оилалар. Бу «навбатдаги иш» нинг энг аниқ таърифи:
     * одам топилган, аммо у билан ҳеч ким гаплашмаган.
     */
    prisma.unemployedPerson.findMany({
      where: { ...(mahallaId ? { mahallaId } : {}), holati: 'ANIQLANDI' },
      orderBy: { createdAt: 'asc' },
      take: 8,
      select: { id: true, fish: true, createdAt: true, household: { select: { manzil: true } } },
    }),
    /*
     * 5. МОС ВАКАНСИЯЛАР — шу маҳаллага очиқ турганлари
     *
     * Ходим уларни фуқароларга айтиши керак. Эълон
     * муддати ўтиб кетса, иш ўрни бошқа йўл билан
     * тўлади ва маҳалла ундан бебаҳра қолади.
     */
    prisma.vacancy.findMany({
      where: {
        faol: true,
        moderatsiya: 'TASDIQLANDI',
        ...(mahallaId ? { mahallaId } : {}),
      },
      orderBy: { amalQilishMuddati: 'asc' },
      take: 8,
      select: {
        id: true,
        korxonaNomi: true,
        lavozim: true,
        ornlarSoni: true,
        amalQilishMuddati: true,
      },
    }),
  ]);

  const ism = (t: {
    household: { oilaBoshligi: string } | null;
    ishsiz: { fish: string } | null;
  }) => t.ishsiz?.fish ?? t.household?.oilaBoshligi ?? '—';

  const yol = (t: {
    household: { id: string } | null;
    ishsiz: { id: string } | null;
  }) => (t.ishsiz ? `/ishsizlar/${t.ishsiz.id}` : t.household ? `/xatlov/${t.household.id}` : undefined);

  return [
    {
      kalit: 'kechikkan',
      nomi: 'Муддати ЎТГАН топшириқлар',
      izoh: 'Буларни бугун ёпиш керак — ҳокимнинг панелида қизил бўлиб турибди',
      soni: kechikkan.length,
      ogohlik: kechikkan.length > 0 ? 'shoshilinch' : 'tinch',
      yol: '/chora-tadbirlar',
      qatorlar: kechikkan.map((t) => ({
        id: t.id,
        matn: `${ism(t)} — ${qisqa(t.muammo)}`,
        qoshimcha: `${Math.floor((Date.now() - t.muddat.getTime()) / KUN_MS)} кун кечикди`,
        yol: yol(t),
      })),
    },
    {
      kalit: 'bugungi',
      nomi: 'Бугунги ташрифлар',
      izoh: 'Муддати айнан бугун тугайдиган топшириқлар',
      soni: bugungi.length,
      ogohlik: bugungi.length > 0 ? 'diqqat' : 'tinch',
      yol: '/chora-tadbirlar',
      qatorlar: bugungi.map((t) => ({
        id: t.id,
        matn: `${ism(t)} — ${qisqa(t.muammo)}`,
        qoshimcha: t.masulTashkilot,
        yol: yol(t),
      })),
    },
    {
      kalit: 'yaqin',
      nomi: 'Муддати яқин режалар',
      izoh: 'Келаси етти кун ичида — бугун эмас, аммо эсда турсин',
      soni: yaqin,
      ogohlik: 'tinch',
      yol: '/chora-tadbirlar',
      qatorlar: [],
    },
    {
      kalit: 'aloqa',
      nomi: 'Алоқа қилиш керак бўлган оилалар',
      izoh: 'Ишсиз топилган, аммо у билан ҳали ҳеч ким суҳбат ўтказмаган',
      soni: aloqa.length,
      ogohlik: aloqa.length > 0 ? 'diqqat' : 'tinch',
      yol: '/ishsizlar',
      qatorlar: aloqa.map((o) => ({
        id: o.id,
        matn: o.fish,
        qoshimcha: `${Math.floor((Date.now() - o.createdAt.getTime()) / KUN_MS)} кундан бери кутади${
          o.household?.manzil ? ` · ${qisqa(o.household.manzil, 40)}` : ''
        }`,
        yol: `/ishsizlar/${o.id}`,
      })),
    },
    {
      kalit: 'vakansiya',
      nomi: 'Мос иш ўринлари',
      izoh: 'Шу маҳаллага очиқ турган эълонлар — фуқароларга айтиш керак',
      soni: orinlar.length,
      ogohlik: 'tinch',
      yol: '/ish-orinlari',
      qatorlar: orinlar.map((v) => ({
        id: v.id,
        matn: `${v.korxonaNomi} — ${v.lavozim}`,
        qoshimcha: `${v.ornlarSoni} ўрин${
          v.amalQilishMuddati
            ? ` · ${Math.max(0, Math.ceil((v.amalQilishMuddati.getTime() - Date.now()) / KUN_MS))} кун қолди`
            : ''
        }`,
        yol: `/ish-orinlari/${v.id}`,
      })),
    },
    {
      kalit: 'murojaatlar',
      nomi: 'Жавобсиз мурожаатлар',
      izoh: 'Фуқаронинг ёзма мурожаати ва унга жавоб',
      soni: 0,
      ogohlik: 'tinch',
      qatorlar: [],
      yetishmayotgan:
        'Мурожаатлар каталоги ҳали қурилмаган. Бу ерга «0» ёзиш ёлғон бўларди: ' +
        '«мурожаат йўқ» деб кўринар, аслида «мурожаат қабул қилинмайди» эди.',
    },
  ];
}

/* ══════════════════════════════════════════════════════════
 *  БАНДЛИК МУТАХАССИСИ
 * ══════════════════════════════════════════════════════════ */

async function bandlikTaxtasi(): Promise<VazifaBlogi[]> {
  const [suhbatKerak, javobKutilmoqda, dalilNavbati, uchOylik, sabablar, ochiqOrin] =
    await Promise.all([
      /* Суҳбат ўтказилиши керак */
      prisma.unemployedPerson.findMany({
        where: { holati: 'ANIQLANDI' },
        orderBy: { createdAt: 'asc' },
        take: 8,
        select: {
          id: true,
          fish: true,
          createdAt: true,
          mahalla: { select: { nomiKirill: true } },
        },
      }),
      /* Таклиф берилган — ЖАВОБ кутилмоқда */
      prisma.unemployedPerson.findMany({
        where: { holati: 'TAKLIF_BERILDI' },
        orderBy: { updatedAt: 'asc' },
        take: 8,
        select: {
          id: true,
          fish: true,
          updatedAt: true,
          taklifIzohi: true,
          mahalla: { select: { nomiKirill: true } },
        },
      }),
      /* Текширилмаган далиллар */
      prisma.joylashuvDalili.count({ where: { holati: 'KIRITILDI' } }),
      /*
       * УЧ ОЙЛИК КУЗАТУВ
       *
       * Жойлаштиришнинг ўзи «мустаҳкамланиши текширилсин»
       * деган топшириқ туғдиради (`chora-yaratish.ts`).
       * Муддати ўтганлари — бажарилмаган кузатув.
       */
      prisma.actionPlan.findMany({
        where: {
          holati: { in: [...OCHIQ_TOPSHIRIQ] },
          muammo: { contains: 'мустаҳкамланиши текширилмаган' },
          muddat: { lt: new Date() },
        },
        orderBy: { muddat: 'asc' },
        take: 8,
        select: {
          id: true,
          muddat: true,
          ishsiz: { select: { id: true, fish: true, ishJoyi: true } },
        },
      }),
      /* Жараённи тўхтатаётган сабаблар */
      prisma.unemployedPerson.groupBy({
        by: ['radSababi'],
        where: { holati: 'RAD_ETDI', radSababi: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { radSababi: 'desc' } },
        take: 6,
      }),
      prisma.vacancy.count({ where: { faol: true, moderatsiya: 'TASDIQLANDI' } }),
    ]);

  return [
    {
      kalit: 'dalil-navbati',
      nomi: 'Текширилмаган далиллар',
      izoh: 'Ҳужжат келган-у, ҳеч ким қарамаган: иш бажарилган, рақам эса «тасдиқланмаган»',
      soni: dalilNavbati,
      ogohlik: dalilNavbati > 0 ? 'shoshilinch' : 'tinch',
      yol: '/reyestr',
      qatorlar: [],
    },
    {
      kalit: 'uch-oylik',
      nomi: 'Уч ойлик кузатув — муддати ўтган',
      izoh: 'Фуқаро ишда мустаҳкамландими? Текширилмаса, «жойлаштирилди» рақами текширилмай қолади',
      soni: uchOylik.length,
      ogohlik: uchOylik.length > 0 ? 'shoshilinch' : 'tinch',
      yol: '/chora-tadbirlar',
      qatorlar: uchOylik.map((t) => ({
        id: t.id,
        matn: t.ishsiz?.fish ?? '—',
        qoshimcha: `${t.ishsiz?.ishJoyi ?? 'иш жойи ёзилмаган'} · ${Math.floor(
          (Date.now() - t.muddat.getTime()) / KUN_MS
        )} кун кечикди`,
        yol: t.ishsiz ? `/ishsizlar/${t.ishsiz.id}` : undefined,
      })),
    },
    {
      kalit: 'suhbat',
      nomi: 'Суҳбат ўтказилиши керак',
      izoh: 'Аниқланган-у, ҳали ҳеч ким гаплашмаган фуқаролар — навбат энг узун турганидан',
      soni: suhbatKerak.length,
      ogohlik: suhbatKerak.length > 0 ? 'diqqat' : 'tinch',
      yol: '/ishsizlar',
      qatorlar: suhbatKerak.map((o) => ({
        id: o.id,
        matn: o.fish,
        qoshimcha: `${o.mahalla.nomiKirill} · ${Math.floor(
          (Date.now() - o.createdAt.getTime()) / KUN_MS
        )} кундан бери`,
        yol: `/ishsizlar/${o.id}`,
      })),
    },
    {
      kalit: 'javob-kutilmoqda',
      nomi: 'Жавоб кутилаётган жараёнлар',
      izoh: 'Таклиф берилган, аммо фуқаро ҳали ҳа ёки йўқ демаган',
      soni: javobKutilmoqda.length,
      ogohlik: javobKutilmoqda.length > 0 ? 'diqqat' : 'tinch',
      yol: '/ishsizlar',
      qatorlar: javobKutilmoqda.map((o) => ({
        id: o.id,
        matn: o.fish,
        qoshimcha: `${o.mahalla.nomiKirill} · ${Math.floor(
          (Date.now() - o.updatedAt.getTime()) / KUN_MS
        )} кундан бери жавобсиз`,
        yol: `/ishsizlar/${o.id}`,
      })),
    },
    {
      kalit: 'moslik',
      nomi: 'Номзод — вакансия мослиги',
      izoh: 'Очиқ турган иш ўринлари: ҳар бирига номзод топиш керак',
      soni: ochiqOrin,
      ogohlik: 'tinch',
      yol: '/ish-orinlari',
      qatorlar: [],
    },
    {
      kalit: 'sabablar',
      nomi: 'Жараённи тўхтатаётган сабаблар',
      izoh: 'Фуқаро нега рад этди — энг кўп такрорланганидан',
      soni: sabablar.reduce((s, x) => s + x._count._all, 0),
      ogohlik: 'tinch',
      qatorlar: sabablar.map((x, i) => ({
        id: `sabab-${i}`,
        matn: qisqa(x.radSababi ?? '—', 70),
        qoshimcha: `${x._count._all} киши`,
      })),
    },
  ];
}

/* ══════════════════════════════════════════════════════════
 *  БАНДЛИК РАҲБАРИ
 * ══════════════════════════════════════════════════════════ */

async function rahbarTaxtasi(): Promise<VazifaBlogi[]> {
  const hozir = new Date();

  const [
    elonNavbati,
    beruvchiNavbati,
    kechikkanlar,
    tashkilotlar,
    vaucherlar,
    dalil,
    xodimlar,
  ] = await Promise.all([
    prisma.vacancy.count({ where: MODERATSIYA_KUTMOQDA() }),
    prisma.ishBeruvchi.count({ where: { holati: 'KUTILMOQDA' } }),
    prisma.actionPlan.count({
      where: { holati: { in: [...OCHIQ_TOPSHIRIQ] }, muddat: { lt: hozir } },
    }),
    /* Масъул ташкилотлар бўйича ечилмаган масалалар */
    prisma.actionPlan.groupBy({
      by: ['masulTashkilot'],
      where: { holati: { in: [...OCHIQ_TOPSHIRIQ] }, muddat: { lt: hozir } },
      _count: { _all: true },
      orderBy: { _count: { masulTashkilot: 'desc' } },
      take: 8,
    }),
    /* Курсдан бандликка ўтиш */
    prisma.itVaucher.groupBy({ by: ['holati'], _count: { _all: true } }),
    tasdiqHisobi(),
    /*
     * ХОДИМЛАР ИШ ЮКЛАМАСИ
     *
     * Кимда қанча очиқ иш бор. Юклама тенг тақсимланмаса,
     * бир ходим кўмилиб қолар, иккинчиси бўш турарди — ва
     * буни ҳеч ким кўрмасди.
     */
    prisma.user.findMany({
      where: { faol: true, rol: { in: ['YETTILIK', 'BANDLIK'] } },
      select: {
        id: true,
        fullName: true,
        rol: true,
        mahalla: { select: { nomiKirill: true } },
        _count: { select: { topshiriqlar: true } },
      },
      take: 100,
    }),
  ]);

  /* Ваучер занжири: тугатганлар ичидан нечтаси ишга жойлашди */
  const v = new Map(vaucherlar.map((x) => [x.holati, x._count._all]));
  const tugatdi = (v.get('TUGATDI') ?? 0) + (v.get('ISHGA_JOYLASHDI') ?? 0);
  const ishga = v.get('ISHGA_JOYLASHDI') ?? 0;

  /*
   * Юкламани САРАЛАЙМИЗ — энг кўп юкланганидан. Ўртачадан
   * кескин юқориси кўринади, чунки «ҳаммада 5 та» билан
   * «биттасида 40 та» бошқа-бошқа ҳол.
   */
  const yuklama = xodimlar
    .filter((x) => x._count.topshiriqlar > 0)
    .sort((a, b) => b._count.topshiriqlar - a._count.topshiriqlar)
    .slice(0, 8);

  return [
    {
      kalit: 'moderatsiya',
      nomi: 'Модерация навбати',
      izoh: 'Иш берувчи жавоб кутади. Кечиккан жавоб — йўқолган иш ўрни',
      soni: elonNavbati + beruvchiNavbati,
      ogohlik: elonNavbati + beruvchiNavbati > 0 ? 'shoshilinch' : 'tinch',
      yol: '/ish-beruvchilar',
      qatorlar: [
        { id: 'elon', matn: 'Эълонлар', qoshimcha: `${elonNavbati} та` },
        { id: 'beruvchi', matn: 'Иш берувчи рўйхати', qoshimcha: `${beruvchiNavbati} та` },
      ],
    },
    {
      kalit: 'kechikkan',
      nomi: 'Кечикаётган хизматлар',
      izoh: 'Муддати ўтган-у, ҳали ёпилмаган топшириқлар — бутун туман бўйича',
      soni: kechikkanlar,
      ogohlik: kechikkanlar > 0 ? 'shoshilinch' : 'tinch',
      yol: '/chora-tadbirlar',
      qatorlar: [],
    },
    {
      kalit: 'tashkilot',
      nomi: 'Масъул ташкилотлар бўйича ечилмаган масалалар',
      izoh: 'Қайси ташкилот жавоб бермаяпти — йиғилишда шу рўйхат сўралади',
      soni: tashkilotlar.reduce((s, x) => s + x._count._all, 0),
      ogohlik: tashkilotlar.length > 0 ? 'diqqat' : 'tinch',
      yol: '/chora-tadbirlar',
      qatorlar: tashkilotlar.map((x, i) => ({
        id: `tashkilot-${i}`,
        matn: x.masulTashkilot,
        qoshimcha: `${x._count._all} та кечиккан`,
      })),
    },
    {
      kalit: 'dalil-sifati',
      nomi: 'Далиллар сифати',
      izoh: '«Тасдиқланган» сўзи нимага таянади — расмий манбага ёки қўлда юкланган файлга',
      hisoblash: {
        usuli:
          'Ҳар фуқаронинг ҲОЗИРГИ иши бўйича энг ишончли манбаси олинади. ' +
          'Фақат «Расмий интеграция» манбаси автоматик тасдиқланади.',
        manbasi: 'Жойлашув далилларининг манба тури',
        ogohlik:
          'Қўлда юкланган Excel кўчирмаси РАСМИЙ манба эмас: уни ким, қачон ва ' +
          'қаердан олгани тизимда ёзилмаган.',
      },
      soni: dalil.tasdiqlangan,
      ogohlik: dalil.radEtilgan > 0 || dalil.tekshiruvKutayotgan > 0 ? 'diqqat' : 'tinch',
      yol: '/reyestr',
      qatorlar: [
        { id: 'rasmiy', matn: 'Расмий манба билан', qoshimcha: `${dalil.rasmiyTasdiq} та` },
        { id: 'qolda', matn: 'Қўлда текширилиб тасдиқланган', qoshimcha: `${dalil.qoldaTasdiq} та` },
        {
          id: 'kutilmoqda',
          matn: 'Киритилган, текширилмаган',
          qoshimcha: `${dalil.tekshiruvKutayotgan} та`,
        },
        { id: 'rad', matn: 'Рад этилган', qoshimcha: `${dalil.radEtilgan} та` },
        {
          id: 'bogliqsiz',
          matn: 'Ишга боғланмаган тасдиқ',
          qoshimcha: `${dalil.bogliqsizTasdiq} та`,
        },
      ],
    },
    {
      kalit: 'kurs',
      nomi: 'Курсдан бандликка ўтиш',
      izoh: 'Курсни тугатганларнинг нечтаси ишга жойлашди — ваучернинг АСЛ натижаси',
      soni: ishga,
      ogohlik: tugatdi > 0 && ishga * 2 < tugatdi ? 'diqqat' : 'tinch',
      yol: '/panel#qism-vaucher',
      qatorlar: [
        { id: 'berildi', matn: 'Ваучер берилди', qoshimcha: `${v.get('BERILDI') ?? 0} та` },
        { id: 'oqimoqda', matn: 'Ўқиб турибди', qoshimcha: `${v.get('OQIMOQDA') ?? 0} та` },
        { id: 'tugatdi', matn: 'Курсни тугатди', qoshimcha: `${tugatdi} та` },
        {
          id: 'ishga',
          matn: 'Шундан ишга жойлашди',
          qoshimcha: tugatdi > 0 ? `${ishga} та (${Math.round((ishga / tugatdi) * 100)}%)` : '0 та',
        },
        {
          id: 'tashlab',
          matn: 'Ташлаб кетди',
          qoshimcha: `${v.get('TASHLAB_KETDI') ?? 0} та`,
        },
      ],
    },
    {
      kalit: 'yuklama',
      nomi: 'Ходимлар иш юкламаси',
      izoh: 'Кимда қанча топшириқ бор. Тенг тақсимланмаса, бир ходим кўмилиб қолади',
      soni: yuklama.length,
      ogohlik: 'tinch',
      yol: '/mahalla-xodimlari',
      qatorlar: yuklama.map((x) => ({
        id: x.id,
        matn: x.fullName,
        qoshimcha: `${x._count.topshiriqlar} топшириқ${
          x.mahalla?.nomiKirill ? ` · ${x.mahalla.nomiKirill}` : ''
        }`,
      })),
    },
  ];
}

/* ══════════════════════════════════════════════════════════
 *  ҲОКИМ
 * ══════════════════════════════════════════════════════════ */

async function hokimTaxtasi(): Promise<VazifaBlogi[]> {
  const [dalil, voqealar, muammolar, hududlar, daromad] = await Promise.all([
    tasdiqHisobi(),
    /*
     * БАРҚАРОР БАНДЛИК
     *
     * «Ишга кирди» билан «ҳамон ишлаяпти» — икки хил савол.
     * Иккинчисига жавоб `IshgaJoylashish` воқеасининг
     * ҳолатидан келади: у фақат «ҳозир ишлаётгани» далили
     * тасдиқланганда `ISHLAMOQDA` бўлади.
     */
    prisma.ishgaJoylashish.groupBy({ by: ['holati'], _count: { _all: true } }),
    /* Ҳал этилиши керак бўлган асосий муаммолар */
    prisma.actionPlan.groupBy({
      by: ['muammo'],
      where: { holati: { in: [...OCHIQ_TOPSHIRIQ] } },
      _count: { _all: true },
      orderBy: { _count: { muammo: 'desc' } },
      take: 6,
    }),
    /*
     * ҲУДУДЛАР БЎЙИЧА РЕСУРС ЭҲТИЁЖИ
     *
     * Қайси маҳаллада ишсиз кўп-у, иш ўрни йўқ. Ресурсни
     * ЎША ЕРГА йўналтириш керак.
     */
    prisma.mahalla.findMany({
      select: {
        id: true,
        nomiKirill: true,
        xonadon: true,
        _count: {
          select: {
            ishsizlar: { where: { holati: { in: ['ANIQLANDI', 'SUHBAT_OTKAZILDI'] } } },
            ishOrinlar: { where: { faol: true, moderatsiya: 'TASDIQLANDI' } },
          },
        },
      },
      take: 100,
    }),
    /*
     * ДАРОМАД ЎЗГАРИШИ
     *
     * Кесмада эски даромад сақланади. Ҳозирги қиймат билан
     * солиштириб, ЎСДИ ёки КАМАЙДИ деб айтиш мумкин.
     *
     * Кесмаси йўқ хонадон ҳисобга КИРМАЙДИ: солиштириш
     * учун икки нуқта керак.
     */
    prisma.householdKesma.findMany({
      where: { oylikDaromad: { not: null } },
      orderBy: { olinganSana: 'desc' },
      take: 500,
      select: {
        householdId: true,
        oylikDaromad: true,
        olinganSana: true,
        household: { select: { oylikDaromad: true } },
      },
    }),
  ]);

  const voq = new Map(voqealar.map((x) => [x.holati, x._count._all]));
  const jamiVoqea = voqealar.reduce((s, x) => s + x._count._all, 0);

  /* Ҳар хонадоннинг ФАҚАТ энг янги кесмаси олинади */
  const korilgan = new Set<string>();
  let osdi = 0;
  let kamaydi = 0;
  let ozgarmadi = 0;
  for (const k of daromad) {
    if (korilgan.has(k.householdId)) continue;
    korilgan.add(k.householdId);
    const eski = k.oylikDaromad;
    const yangi = k.household.oylikDaromad;
    if (eski === null || yangi === null) continue;
    if (yangi > eski) osdi += 1;
    else if (yangi < eski) kamaydi += 1;
    else ozgarmadi += 1;
  }

  const ehtiyoj = hududlar
    .map((m) => ({
      id: m.id,
      nomi: m.nomiKirill,
      ishsiz: m._count.ishsizlar,
      orin: m._count.ishOrinlar,
    }))
    .filter((m) => m.ishsiz > 0)
    .sort((a, b) => b.ishsiz - b.orin - (a.ishsiz - a.orin))
    .slice(0, 8);

  return [
    {
      kalit: 'ikki-raqam',
      nomi: 'Ходим билдирган ва далил билан тасдиқланган',
      izoh: 'Биринчи рақам — ходимнинг айтгани. Иккинчиси — ҳужжат билан тасдиқлангани',
      hisoblash: {
        usuli:
          'Ҳолати «Жойлаштирилди» ёки «Тасдиқланди» бўлган фуқаролар сони. ' +
          'Архивга ўтганлар ҳисобга кирмайди.',
        manbasi: 'Фуқаро анкетасидаги ҳолат — ходим белгилайди',
        ogohlik:
          'Биринчи рақам ҲУЖЖАТСИЗ: у ходимнинг айтгани. Пастдаги қаторларда ' +
          'унинг қанчаси текширилганини кўрасиз.',
      },
      soni: dalil.davoQilingan,
      ogohlik:
        dalil.davoQilingan > 0 && dalil.tasdiqlangan * 2 < dalil.davoQilingan
          ? 'diqqat'
          : 'tinch',
      yol: '/reyestr',
      qatorlar: [
        {
          id: 'davo',
          matn: '«Жойлаштирилди» деб турибди',
          qoshimcha: `${dalil.davoQilingan} та`,
        },
        {
          id: 'tasdiq',
          matn: 'Ҳужжат билан тасдиқланган',
          qoshimcha: `${dalil.tasdiqlangan} та (${dalil.tasdiqFoizi
            .toString()
            .replace('.', ',')}%)`,
        },
        {
          id: 'rasmiy',
          matn: 'Шундан РАСМИЙ манба билан',
          qoshimcha: `${dalil.rasmiyTasdiq} та`,
        },
        {
          id: 'joriy',
          matn: 'Ҳозирги иши тасдиқланган',
          qoshimcha: `${dalil.joriyIshTasdiqlangan} та`,
        },
      ],
    },
    {
      kalit: 'barqaror',
      nomi: 'Барқарор бандлик',
      izoh: '«Ишга кирди» билан «ҳамон ишлаяпти» — икки хил савол',
      hisoblash: {
        usuli:
          'Ишга жойлашиш воқеаларининг ҳолати бўйича. Воқеа «Ишлаб турибди» ' +
          'бўлиши учун «ҳозир ҳам ишлаётгани» далили тасдиқланган бўлиши керак.',
        manbasi: 'Ишга жойлашиш воқеалари жадвали',
        ogohlik:
          'Шартнома нусхаси одам ишга КИРГАНИНИ кўрсатади, «ҳамон ишлаётгани» ни ' +
          'ЭМАС. Шунинг учун кўп воқеа «текширилмаган» бўлиб туради — бу нуқсон ' +
          'эмас, ҳалол ҳисоб.',
      },
      soni: voq.get('ISHLAMOQDA') ?? 0,
      ogohlik:
        jamiVoqea > 0 && (voq.get('NOMALUM') ?? 0) > (voq.get('ISHLAMOQDA') ?? 0)
          ? 'diqqat'
          : 'tinch',
      yol: '/reyestr',
      qatorlar: [
        { id: 'ishlamoqda', matn: 'Ишлаб турибди (текширилган)', qoshimcha: `${voq.get('ISHLAMOQDA') ?? 0} та` },
        { id: 'nomalum', matn: 'Ҳолати текширилмаган', qoshimcha: `${voq.get('NOMALUM') ?? 0} та` },
        { id: 'tugadi', matn: 'Иш тугаган', qoshimcha: `${voq.get('TUGADI') ?? 0} та` },
      ],
    },
    {
      kalit: 'daromad',
      nomi: 'Даромад ўзгариши',
      izoh: 'Қайта хатловда даромади ўсган ва камайган хонадонлар',
      hisoblash: {
        usuli:
          'Хонадоннинг ЭНГ ЯНГИ кесмасидаги ойлик даромади ҳозирги қиймат билан ' +
          'солиштирилади. Иккала қиймат ҳам ёзилган бўлиши шарт.',
        manbasi: 'Хонадон кесмалари (қайта хатлов) ва хонадон анкетаси',
        ogohlik:
          'Кесмаси йўқ хонадон ҳисобга УМУМАН кирмайди: солиштириш учун икки ' +
          'нуқта керак. Яъни бу рақам бутун туманни эмас, қайта хатловдан ' +
          'ўтганларни кўрсатади.',
      },
      soni: osdi,
      ogohlik: kamaydi > osdi ? 'diqqat' : 'tinch',
      yol: '/panel#qism-dinamika',
      qatorlar:
        korilgan.size === 0
          ? []
          : [
              { id: 'osdi', matn: 'Даромади ЎСДИ', qoshimcha: `${osdi} хонадон` },
              { id: 'kamaydi', matn: 'Даромади КАМАЙДИ', qoshimcha: `${kamaydi} хонадон` },
              { id: 'ozgarmadi', matn: 'Ўзгармади', qoshimcha: `${ozgarmadi} хонадон` },
            ],
      ...(korilgan.size === 0
        ? {
            yetishmayotgan:
              'Солиштириш учун икки нуқта керак: эски кесма ва ҳозирги қиймат. ' +
              'Ҳали биронта хонадонда қайта хатлов кесмаси йўқ.',
          }
        : {}),
    },
    {
      kalit: 'hudud',
      nomi: 'Ҳудудлар бўйича ресурс эҳтиёжи',
      izoh: 'Қайси маҳаллада ишсиз кўп-у, иш ўрни йўқ — ресурс ЎША ЕРГА керак',
      soni: ehtiyoj.length,
      ogohlik: ehtiyoj.length > 0 ? 'diqqat' : 'tinch',
      yol: '/panel#qism-mahallalar',
      qatorlar: ehtiyoj.map((m) => ({
        id: m.id,
        matn: m.nomi,
        qoshimcha: `${m.ishsiz} ишсиз · ${m.orin} очиқ ўрин`,
      })),
    },
    {
      kalit: 'muammolar',
      nomi: 'Ҳал этилиши керак бўлган асосий муаммолар',
      izoh: 'Энг кўп такрорланган муаммолар — тизимли ечим керак бўлганлари',
      soni: muammolar.reduce((s, x) => s + x._count._all, 0),
      ogohlik: 'tinch',
      yol: '/chora-tadbirlar',
      qatorlar: muammolar.map((x, i) => ({
        id: `muammo-${i}`,
        matn: qisqa(x.muammo, 70),
        qoshimcha: `${x._count._all} оилада`,
      })),
    },
  ];
}

/* ══════════════════════════════════════════════════════════
 *  АДМИНИСТРАТОР
 * ══════════════════════════════════════════════════════════ */

async function adminTaxtasi(): Promise<VazifaBlogi[]> {
  const sutka = new Date(Date.now() - KUN_MS);

  const [rollar, faolsiz, mahallasiz, auditSoni, oxirgiAudit, navbat, xatoXabar] =
    await Promise.all([
      prisma.user.groupBy({ by: ['rol'], where: { faol: true }, _count: { _all: true } }),
      prisma.user.count({ where: { faol: false } }),
      prisma.user.count({ where: { faol: true, rol: 'YETTILIK', mahallaId: null } }),
      prisma.auditLog.count({ where: { createdAt: { gte: sutka } } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          amal: true,
          obyektTuri: true,
          createdAt: true,
          user: { select: { fullName: true } },
        },
      }),
      prisma.xabarnoma.count({ where: { holati: 'KUTILMOQDA' } }),
      prisma.xabarnoma.count({ where: { holati: 'XATO' } }),
    ]);

  /*
   * ── ИНТЕГРАЦИЯЛАР ──
   *
   * ФАҚАТ «созланганми» деган ҲА/ЙЎҚ. Калитнинг ўзи,
   * узунлиги ёки биронта бўлаги экранга ЧИҚМАЙДИ — бу
   * саҳифани администратор очади, аммо экран бошқа
   * одамга ҳам кўриниб қолиши мумкин.
   */
  const sozlangan = (nom: string) => Boolean(process.env[nom]?.trim());
  const aiKaliti = ['GROQ_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY'].some(
    sozlangan
  );

  return [
    {
      kalit: 'hisob',
      nomi: 'Ҳисоблар ва ҳуқуқлар',
      izoh: 'Маҳалласи белгиланмаган ходим ҳеч нарса кўрмайди — бу дарҳол тузатилиши керак',
      soni: rollar.reduce((s, x) => s + x._count._all, 0),
      ogohlik: mahallasiz > 0 ? 'shoshilinch' : 'tinch',
      yol: '/admin',
      qatorlar: [
        ...rollar.map((x) => ({
          id: `rol-${x.rol}`,
          matn: x.rol,
          qoshimcha: `${x._count._all} та`,
        })),
        { id: 'faolsiz', matn: 'Фаолсиз ҳисоб', qoshimcha: `${faolsiz} та` },
        {
          id: 'mahallasiz',
          matn: 'МАҲАЛЛАСИ БЕЛГИЛАНМАГАН МФЙ ходими',
          qoshimcha: `${mahallasiz} та`,
        },
      ],
    },
    {
      kalit: 'navbat',
      nomi: 'Хабарнома навбати',
      izoh: 'Юборилмаган ва хато билан тугаган хабарлар',
      soni: navbat + xatoXabar,
      ogohlik: xatoXabar > 0 ? 'diqqat' : 'tinch',
      qatorlar: [
        { id: 'kutilmoqda', matn: 'Навбатда', qoshimcha: `${navbat} та` },
        { id: 'xato', matn: 'Хато билан тугаган', qoshimcha: `${xatoXabar} та` },
      ],
    },
    {
      kalit: 'integratsiya',
      nomi: 'Интеграциялар',
      izoh: 'Созланганми — ҳа ёки йўқ. Калитнинг ўзи бу ерда ҲЕЧ ҚАЧОН кўрсатилмайди',
      /*
       * Рақам СОЗЛАНМАГАНЛАР сони.
       *
       * Аввал бу ерда «0» турарди ва экранда «0 · Кузатувда»
       * бўлиб чиқарди — гўё ҳаммаси жойида. Аслида пастдаги
       * рўйхатда «вебхук сири ЙЎҚ» деб турган бўлиши мумкин
       * эди. Рақам ва рўйхат бир-бирига қарши гапирарди.
       */
      soni: [
        !sozlangan('DIRECT_URL'),
        sozlangan('TELEGRAM_BOT_TOKEN') && !sozlangan('TELEGRAM_WEBHOOK_SIRI'),
        !sozlangan('CRON_SECRET'),
      ].filter(Boolean).length,
      ogohlik: sozlangan('TELEGRAM_BOT_TOKEN') && !sozlangan('TELEGRAM_WEBHOOK_SIRI')
        ? 'shoshilinch'
        : !sozlangan('DIRECT_URL') || !sozlangan('CRON_SECRET')
          ? 'diqqat'
          : 'tinch',
      qatorlar: [
        {
          id: 'baza',
          matn: 'Миграция манзили (DIRECT_URL)',
          qoshimcha: sozlangan('DIRECT_URL') ? 'созланган' : 'ЙЎҚ — миграция йиқилиши мумкин',
        },
        {
          id: 'bot',
          matn: 'Telegram боти',
          qoshimcha: sozlangan('TELEGRAM_BOT_TOKEN') ? 'созланган' : 'созланмаган',
        },
        {
          id: 'sir',
          matn: 'Вебхук сири',
          qoshimcha: sozlangan('TELEGRAM_WEBHOOK_SIRI') ? 'созланган' : 'ЙЎҚ — вебхук ишламайди',
        },
        {
          id: 'cron',
          matn: 'Cron сири',
          qoshimcha: sozlangan('CRON_SECRET') ? 'созланган' : 'ЙЎҚ — брифинг жўнамайди',
        },
        { id: 'ai', matn: 'AI таҳлили', qoshimcha: aiKaliti ? 'созланган' : 'созланмаган' },
      ],
    },
    {
      kalit: 'audit',
      nomi: 'Аудит журнали',
      izoh: 'Охирги сутка ичидаги амаллар',
      soni: auditSoni,
      ogohlik: 'tinch',
      qatorlar: oxirgiAudit.map((a) => ({
        id: a.id,
        matn: `${a.user.fullName} — ${a.amal}`,
        qoshimcha: a.obyektTuri ?? undefined,
      })),
    },
    {
      kalit: 'zaxira',
      nomi: 'Заҳиралаш ва тиклаш',
      izoh: 'Базада ўн минглаб хонадон маълумоти турибди',
      soni: 0,
      ogohlik: 'shoshilinch',
      qatorlar: [],
      yetishmayotgan:
        'Supabase да автоматик заҳира бор, аммо уни ТИКЛАШ ҳеч қачон синалмаган. ' +
        'Синалмаган заҳира — заҳира эмас. Sinov лойиҳасига тиклаб, ёзувлар сонини ' +
        'солиштириш керак ва буни чоракда бир марта такрорлаш керак.',
    },
    {
      kalit: 'xatolar',
      nomi: 'Тизим хатолари',
      izoh: 'Серверда юз берган хатолар рўйхати',
      soni: 0,
      ogohlik: 'tinch',
      qatorlar: [],
      yetishmayotgan:
        'Хатолар журнали ҳали қурилмаган: хатолар `console.error` га ёзилади ва ' +
        'Vercel логида қолади. Бу ерга «0 хато» ёзиш ёлғон бўларди.',
    },
  ];
}

/* ══════════════════════════════════════════════════════════ */

const SARLAVHA: Record<Rol, { sarlavha: string; izoh: string }> = {
  YETTILIK: {
    sarlavha: 'Бугунги ишим',
    izoh: 'Шу маҳаллада бугун бажарилиши керак бўлган ишлар',
  },
  BANDLIK: {
    sarlavha: 'Иш навбатим',
    izoh: 'Жараённи кутиб турган фуқаролар ва ҳужжатлар',
  },
  BANDLIK_RAHBAR: {
    sarlavha: 'Операцион ҳолат',
    izoh: 'Нима тўхтаб турибди ва ким жавоб бермаяпти',
  },
  HOKIM: {
    sarlavha: 'Туман ҳолати',
    izoh: 'Натижа, унинг ишончлилиги ва ҳал қилинадиган масалалар',
  },
  ADMIN: {
    sarlavha: 'Тизим ҳолати',
    izoh: 'Ҳисоблар, интеграциялар, навбат ва заҳира',
  },
};

/**
 * Ролга мос вазифалар тахтаси.
 *
 * ── Нега битта кириш нуқтаси ──
 *
 * Ҳар рол учун алоҳида саҳифа ёзилса, бешта саҳифа бешта
 * ҳар хил йўл билан эскирарди. Битта саҳифа, битта
 * маълумот тузилиши — ва рол фақат БЛОКЛАРни танлайди.
 */
export async function vazifalarim(sessiya: {
  userId: string;
  rol: Rol;
  mahallaId: string | null;
}): Promise<VazifaTaxtasi> {
  const { sarlavha, izoh } = SARLAVHA[sessiya.rol];

  const bloklar = await (async () => {
    switch (sessiya.rol) {
      case 'YETTILIK':
        return yettilikTaxtasi(mahallaFiltri(sessiya).mahallaId);
      case 'BANDLIK':
        return bandlikTaxtasi();
      case 'BANDLIK_RAHBAR':
        return rahbarTaxtasi();
      case 'HOKIM':
        return hokimTaxtasi();
      case 'ADMIN':
        return adminTaxtasi();
    }
  })();

  /*
   * Keyinroq qo'shilgan modullar (oilaviy reja, kuzatuv) alohida
   * bloklar beradi. Ular ASOSIY taxtadan ajratilgan: modul jadvali
   * bilan muammo bo'lsa, taxta eski ko'rinishida ochilaveradi.
   */
  const qoshimcha = await qoshimchaBloklar(sessiya);
  const shoshilinch = qoshimcha.filter((b) => b.ogohlik === 'shoshilinch' && b.soni > 0);
  const qolgan = qoshimcha.filter((b) => !shoshilinch.includes(b));

  return { rol: sessiya.rol, sarlavha, izoh, bloklar: [...shoshilinch, ...bloklar, ...qolgan] };
}

/* ══════════════════════════════════════════════════════════
 *  QO'SHIMCHA MODULLAR BLOKLARI
 * ══════════════════════════════════════════════════════════ */

/**
 * Har blok o'z `try/catch` ichida: bitta modul yiqilsa, qolganlari
 * va asosiy taxta ko'rinaveradi (xato jurnalga yoziladi).
 */
async function qoshimchaBloklar(sessiya: {
  userId: string;
  rol: Rol;
  mahallaId: string | null;
}): Promise<VazifaBlogi[]> {
  const chiqdi: VazifaBlogi[] = [];
  const hozir = new Date();
  const mahallaId = mahallaFiltri(sessiya).mahallaId;

  /* ── 30/60/90 kunlik kuzatuv: bandlik markazi ishi ── */
  if (sessiya.rol === 'BANDLIK' || sessiya.rol === 'BANDLIK_RAHBAR' || sessiya.rol === 'ADMIN') {
    try {
      const ishlar = await kuzatuvIshlari(undefined, hozir);
      const kerak = ishlar.filter((i) => i.holat !== 'kutilmoqda');
      const kechikkan = kerak.filter((i) => i.holat === 'kechikdi' || i.holat === 'qayta_urinish');
      chiqdi.push({
        kalit: 'kuzatuv-306090',
        nomi: 'Кузатув: 30/60/90 кунлик текширув',
        izoh: 'Жойлашган фуқаро ишда қолдими, ҳақ оляптими, даромади қандай — муддати келган ёки ўтган текширувлар',
        soni: kerak.length,
        ogohlik: kechikkan.length > 0 ? 'shoshilinch' : kerak.length > 0 ? 'diqqat' : 'tinch',
        yol: '/kuzatuv',
        qatorlar: kerak.slice(0, 8).map((i) => ({
          id: `${i.joylashishId}-${i.kun}`,
          matn: `${i.fish} — ${i.kun} кун`,
          qoshimcha:
            i.holat === 'kechikdi'
              ? `${i.korxona} · ${Math.abs(i.kunFarqi)} кун кечикди`
              : i.holat === 'qayta_urinish'
                ? `${i.korxona} · боғланиб бўлмаган, қайта уриниш керак`
                : `${i.korxona} · муддат бугун`,
          yol: `/ishsizlar/${i.ishsizId}#kuzatuv`,
        })),
        hisoblash: {
          usuli: 'Муддат = ишга кирган сана + 30/60/90 кун. Қайд этилмаган ва муддати келган текширувлар саналади',
          manbasi: 'Ишга жойлашиш воқеалари ва 30/60/90 кунлик кузатув ёзувлари',
          ogohlik: 'Муддатидан 120 кундан ортиқ ўтган эски ишлар рўйхатга киритилмайди',
        },
      });
    } catch (e) {
      console.error('Vazifalar: kuzatuv blokini hisoblab bo‘lmadi:', e);
    }
  }

  /* ── Ish beruvchi javobi va e'lon sifati: bandlik markazi ishi ── */
  if (sessiya.rol === 'BANDLIK' || sessiya.rol === 'BANDLIK_RAHBAR' || sessiya.rol === 'ADMIN') {
    try {
      const { soni, royxat } = await javobsizYollanmalar(hozir);
      chiqdi.push({
        kalit: 'yollanma-javobsiz',
        nomi: 'Иш берувчи жавоб бермаган номзодлар',
        izoh: `Номзод маълумоти иш берувчига юборилган, аммо ${JAVOBSIZ_KUN} кундан ортиқ суҳбат ёки қарор билдирилмаган`,
        soni,
        ogohlik: soni > 0 ? 'diqqat' : 'tinch',
        yol: '/ish-orinlari',
        qatorlar: royxat.map((r) => ({
          id: r.id,
          matn: `${r.ishsiz.fish} — ${r.vacancy.lavozim}`,
          qoshimcha: `${r.vacancy.korxonaNomi} · ${Math.floor(
            (hozir.getTime() - (r.ulashilganSana?.getTime() ?? hozir.getTime())) / KUN_MS
          )} кундан бери жавобсиз`,
          yol: `/ish-orinlari/${r.vacancy.id}`,
        })),
      });
    } catch (e) {
      console.error('Vazifalar: yollanma blokini hisoblab bo‘lmadi:', e);
    }

    try {
      const e = await elonlarSifati(undefined, hozir);
      const kerak = e.filter((x) => x.belgilar.some((b) => b.jiddiylik === 'tekshirish'));
      chiqdi.push({
        kalit: 'elon-sifati',
        nomi: 'Эълонлар: текшириш керак',
        izoh: 'Гумонли маош, такрор телефон ёки пул сўрайдиган ибора бор фаол эълонлар (эвристика — қарор ходимники)',
        soni: kerak.length,
        ogohlik: kerak.length > 0 ? 'diqqat' : 'tinch',
        yol: '/ish-orinlari/sifat?turi=tekshirish',
        qatorlar: kerak.slice(0, 8).map((x) => ({
          id: x.id,
          matn: `${x.lavozim} — ${x.korxonaNomi}`,
          qoshimcha: x.belgilar.filter((b) => b.jiddiylik === 'tekshirish').map((b) => b.nomi).join(' · '),
          yol: `/ish-orinlari/${x.id}`,
        })),
      });
    } catch (e) {
      console.error('Vazifalar: elon sifati blokini hisoblab bo‘lmadi:', e);
    }
  }

  /* ── Oilaviy reja: aloqa muddati o'tgan ── */
  if (sessiya.rol !== 'HOKIM') {
    try {
      const bugun = kunBoshi(hozir);
      const where = {
        holati: 'FAOL' as const,
        household: { arxivSanasi: null, ...(mahallaId ? { mahallaId } : {}) },
        OR: [{ keyingiAloqaSanasi: null }, { keyingiAloqaSanasi: { lt: bugun } }],
      };
      const [soni, ro] = await Promise.all([
        prisma.oilaRejasi.count({ where }),
        prisma.oilaRejasi.findMany({
          where,
          orderBy: { keyingiAloqaSanasi: { sort: 'asc', nulls: 'first' } },
          take: 8,
          select: {
            id: true,
            keyingiAloqaSanasi: true,
            household: { select: { oilaBoshligi: true, mahalla: { select: { nomiKirill: true } } } },
          },
        }),
      ]);
      chiqdi.push({
        kalit: 'oila-rejasi-aloqa',
        nomi: 'Оилавий режалар: алоқа керак',
        izoh: 'Оила билан кейинги алоқа муддати ўтган ёки қўйилмаган амалдаги режалар',
        soni,
        ogohlik: soni > 0 ? 'diqqat' : 'tinch',
        yol: '/rejalar?kerak=aloqa',
        qatorlar: ro.map((r) => ({
          id: r.id,
          matn: r.household.oilaBoshligi,
          qoshimcha: r.keyingiAloqaSanasi
            ? `${r.household.mahalla.nomiKirill} · ${Math.floor(
                (hozir.getTime() - r.keyingiAloqaSanasi.getTime()) / KUN_MS
              )} кун кечикди`
            : `${r.household.mahalla.nomiKirill} · алоқа санаси қўйилмаган`,
          yol: `/rejalar/${r.id}`,
        })),
      });
    } catch (e) {
      console.error('Vazifalar: oilaviy reja blokini hisoblab bo‘lmadi:', e);
    }
  }

  /* ── Kurslar: ёзув ҳолати янгиланмаган ── */
  if (sessiya.rol !== 'HOKIM') {
    try {
      /*
       * Ikki holat "yangilanmagan" hisoblanadi:
       *   - kurs boshlangan (kamida 1 kun), lekin yozuv hali "Ёзилган";
       *   - "Ўқимоқда" yozuvi, kurs tugaganiga YANGILANMAGAN_KUNI kundan ortiq.
       * Aniq kun hisobi (Toshkent kuni) kodda; bazadan faqat nomzodlar olinadi.
       */
      const nomzodlar = await prisma.kursYollanmasi.findMany({
        where: {
          holati: { in: ['YOLLANDI', 'BOSHLADI'] },
          kurs: { bekorQilingan: null, boshlanishSanasi: { lt: hozir } },
          ishsiz: { arxivSanasi: null, ...(mahallaId ? { mahallaId } : {}) },
        },
        orderBy: { kurs: { boshlanishSanasi: 'asc' } },
        take: 200,
        select: {
          id: true,
          holati: true,
          ishsiz: { select: { id: true, fish: true } },
          kurs: { select: { id: true, nomi: true, boshlanishSanasi: true, tugashSanasi: true } },
        },
      });
      const kerak = nomzodlar.filter((y) =>
        y.holati === 'YOLLANDI'
          ? sanaOrali(hozir, y.kurs.boshlanishSanasi) >= 1
          : sanaOrali(hozir, y.kurs.tugashSanasi) > YANGILANMAGAN_KUNI
      );
      chiqdi.push({
        kalit: 'kurs-yangilanmagan',
        nomi: 'Курслар: ёзув ҳолати янгиланмаган',
        izoh: 'Курс бошланган ёки тугаган, аммо фуқаро ўқишни бошлаганми, тамомладими, ташладими — белгиланмаган',
        soni: kerak.length,
        ogohlik: kerak.length > 0 ? 'diqqat' : 'tinch',
        yol: '/kurslar',
        qatorlar: kerak.slice(0, 8).map((y) => ({
          id: y.id,
          matn: `${y.ishsiz.fish} — ${y.kurs.nomi}`,
          qoshimcha:
            y.holati === 'YOLLANDI'
              ? `${sanaOrali(hozir, y.kurs.boshlanishSanasi)} кун олдин бошланган, ҳолат белгиланмаган`
              : `${sanaOrali(hozir, y.kurs.tugashSanasi)} кун олдин тугаган, ҳолат «Ўқимоқда»`,
          yol: `/ishsizlar/${y.ishsiz.id}`,
        })),
        hisoblash: {
          usuli: 'Ёзув «Ёзилган» ва курс бошланганига камида 1 кун; ёки «Ўқимоқда» ва курс тугаганига ' + `${YANGILANMAGAN_KUNI} кундан ортиқ`,
          manbasi: 'Курс ва курсга ёзилиш ёзувлари',
          ogohlik: 'Бу рўйхат фуқаро ўқишни тамомлаганини англатмайди: фақат ҳолат белгиланмаганини кўрсатади',
        },
      });
    } catch (e) {
      console.error('Vazifalar: kurs blokini hisoblab bo‘lmadi:', e);
    }
  }

  return chiqdi;
}
