import type { JoylashuvVoqeaHolati, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { Tranzaksiya } from './prisma';
import { SABAB_ENG_KAM } from './arxiv';

/**
 * ============================================================
 *  ИШГА ЖОЙЛАШИШ — ВОҚЕА, ҲОЛАТ ЭМАС
 *
 *  ── Қандай нуқсонни ёпади ──
 *
 *  Фуқаронинг иши `UnemployedPerson` ичида ИККИТА майдонда
 *  турарди: `ishJoyi` ва `ishgaKirganSana`. Улар ФАҚАТ
 *  ОХИРГИ ишни сақлайди.
 *
 *  Одам иш алмаштирса, олдингиси изсиз ўчиб кетарди:
 *
 *    2024: «Оқ Олтин МЧЖ» — шартнома киритилди, ТАСДИҚЛАНДИ
 *    2025: ишдан чиқди, «Янги Йўл МЧЖ» га кирди
 *
 *  Иккинчи иш учун ҳеч қандай далил йўқ эди-ю, далил ОДАМГА
 *  боғланганди — яъни одамда «тасдиқланган далил бор» бўлиб
 *  турарди. ЭСКИ далил ЯНГИ ишни тасдиқлаб қўярди.
 *
 *  Ҳокимликнинг «тасдиқланган жойлаштириш» рақами шундан
 *  ҳисобланади. Ёлғон чиқиши учун ҳеч ким ёмон ният қилиши
 *  ҳам шарт эмас эди.
 *
 *  ── Эски майдонлар ЎЗГАРМАДИ ──
 *
 *  `ishJoyi` ва `ishgaKirganSana` жойида қолди: хатлов ҳозир
 *  кетмоқда ва уларга таянган ўнлаб сўров, ҳисобот ва
 *  экспорт бор. Улар энди ОХИРГИ воқеанинг қисқа нусхаси
 *  бўлиб қолаверади — бир жойда ёзилади, иккита манба
 *  бўлмайди.
 * ============================================================
 */

/**
 * Транзакция ичида ҳам, ундан ташқарида ҳам ишлаши керак.
 *
 * `joylashtirishAmali` узун транзакция ичида чақиради;
 * реестр юклаш эса оддий сўров билан. Иккови учун иккита
 * функция ёзиш — иккита ҳар хил қоида дегани.
 */
/*
 * `Prisma.TransactionClient` ЁЗИЛМАЙДИ: лойиҳадаги мижоз
 * `$extends` билан ўралган (архив қоровули) ва унинг тури
 * бошқача. Шунинг учун мижознинг ЎЗИДАН келтирилади —
 * `prisma.ts` даги `Tranzaksiya` айнан шу.
 */
type Mijoz = typeof prisma | Tranzaksiya;

/** Иш алмашганда эски воқеа шу сабаб билан ёпилади */
export const YANGI_ISHGA_OTDI = 'Янги ишга ўтди';

/**
 * Корхона номларини солиштириш учун соддалаштириш.
 *
 * «Оқ Олтин МЧЖ», «оқ олтин мчж» ва «Оқ  Олтин  МЧЖ» —
 * битта корхона. Уларни ҳар хил деб ҳисобласак, ҳар
 * сақлашда ЯНГИ воқеа яратилиб, битта иш ўнта бўлиб
 * кўринарди.
 *
 * Тўлиқ нормаллаштириш эмас: мақсад — ТАКРОРНИ тўхтатиш,
 * корхоналар рўйхатини тозалаш эмас.
 */
export function korxonaIzi(nom: string): string {
  return nom.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface JoylashishYozuvi {
  id: string;
  korxonaNomi: string;
  lavozim: string | null;
  boshlanganSana: Date;
  tugaganSana: Date | null;
  tugashSababi: string | null;
  holati: JoylashuvVoqeaHolati;
  vacancyId: string | null;
  ishBeruvchiId: string | null;
  izoh: string | null;
}

/**
 * Фуқаронинг ОЧИҚ (ҳали тугамаган) иши.
 *
 * Бир вақтда битта очиқ воқеа бўлиши керак. Иккита очиқ
 * воқеа — маълумот бузилгани; бундай ҳолда энг кейингиси
 * олинади, чунки «ҳозир қаерда ишлайди» саволига жавоб
 * ўшаниси.
 */
export async function joriyJoylashish(
  ishsizId: string,
  mijoz: Mijoz = prisma
): Promise<JoylashishYozuvi | null> {
  return mijoz.ishgaJoylashish.findFirst({
    where: { ishsizId, tugaganSana: null },
    orderBy: { boshlanganSana: 'desc' },
    select: {
      id: true,
      korxonaNomi: true,
      lavozim: true,
      boshlanganSana: true,
      tugaganSana: true,
      tugashSababi: true,
      holati: true,
      vacancyId: true,
      ishBeruvchiId: true,
      izoh: true,
    },
  });
}

/** Фуқаронинг БАРЧА ишлари — энг янгисидан бошлаб */
export async function joylashishTarixi(
  ishsizId: string,
  mijoz: Mijoz = prisma
): Promise<JoylashishYozuvi[]> {
  return mijoz.ishgaJoylashish.findMany({
    where: { ishsizId },
    orderBy: { boshlanganSana: 'desc' },
    select: {
      id: true,
      korxonaNomi: true,
      lavozim: true,
      boshlanganSana: true,
      tugaganSana: true,
      tugashSababi: true,
      holati: true,
      vacancyId: true,
      ishBeruvchiId: true,
      izoh: true,
    },
  });
}

/**
 * ============================================================
 *  ВОҚЕАНИ ЁЗИШ — ТАКРОРСИЗ
 *
 *  Бу функция ҲАР САҚЛАШДА чақирилади: фуқаро анкетаси
 *  сақланганда ҳам, эълонга жойлаштирилганда ҳам. Демак у
 *  такрор чақирувга чидаши керак, акс ҳолда битта иш ўнта
 *  воқеа бўлиб кўринарди.
 *
 *  Қоида учта:
 *
 *    1. Очиқ воқеа ЎША корхонада → ЯНГИСИ яратилмайди,
 *       бўш майдонлар тўлдирилади;
 *    2. Очиқ воқеа БОШҚА корхонада → эскиси ёпилади
 *       (одам иш алмашган), янгиси яратилади;
 *    3. Очиқ воқеа йўқ → янгиси яратилади.
 *
 *  ── Нега эскисини ЁПАМИЗ, ўчирмаймиз ──
 *
 *  Эски ишнинг тасдиқланган шартномаси ЎША ишни ҳамон
 *  тасдиқлаб туради — у ёлғон эмас, шунчаки ЭСКИ. Ўчирилса,
 *  «ўртача қанча ишлади» ва «нечтаси ишда қолди» деган
 *  саволларга жавоб қолмайди.
 * ============================================================
 */
export async function joylashishYozib(
  p: {
    ishsizId: string;
    korxonaNomi: string;
    lavozim?: string | null;
    ishBeruvchiId?: string | null;
    vacancyId?: string | null;
    boshlanganSana: Date;
    kiritganId?: string | null;
  },
  mijoz: Mijoz = prisma
): Promise<{ id: string; yangi: boolean; oldingisiYopildi: string | null }> {
  const nom = p.korxonaNomi.trim();
  if (!nom) throw new Error('joylashishYozib: korxonaNomi bosh');

  const ochiq = await joriyJoylashish(p.ishsizId, mijoz);

  /* 1. ЎША корхона — янгиси яратилмайди */
  if (ochiq && korxonaIzi(ochiq.korxonaNomi) === korxonaIzi(nom)) {
    /*
     * Бўш майдонлар тўлдирилади, ТЎЛАЛАРИ эса эмас.
     *
     * Анкетани қўлда таҳрирлаш эълондан келган боғни
     * ўчириб юбормаслиги керак: эълон — кучлироқ манба.
     */
    const toldirish: Prisma.IshgaJoylashishUpdateInput = {};
    if (!ochiq.lavozim && p.lavozim?.trim()) toldirish.lavozim = p.lavozim.trim();
    if (!ochiq.vacancyId && p.vacancyId) toldirish.vacancy = { connect: { id: p.vacancyId } };
    if (!ochiq.ishBeruvchiId && p.ishBeruvchiId) {
      toldirish.ishBeruvchi = { connect: { id: p.ishBeruvchiId } };
    }
    /*
     * Сана ОРҚАГА сурилади, олдинга эмас: аниқроқ сана
     * одатда эртароқ бўлади (шартнома санаси анкета
     * сақланган кундан илгари).
     */
    if (p.boshlanganSana < ochiq.boshlanganSana) {
      toldirish.boshlanganSana = p.boshlanganSana;
    }

    if (Object.keys(toldirish).length > 0) {
      await mijoz.ishgaJoylashish.update({ where: { id: ochiq.id }, data: toldirish });
    }
    return { id: ochiq.id, yangi: false, oldingisiYopildi: null };
  }

  /* 2. БОШҚА корхона — эскисини ёпамиз */
  let yopildi: string | null = null;
  if (ochiq) {
    /*
     * Ёпилиш санаси — янги ишнинг бошланиши. Икки иш
     * орасида бўшлиқ қолмайди ва «қанча ишлади» ҳисоби
     * тўғри чиқади.
     *
     * Янги сана эскисидан ИЛГАРИ бўлса (кечиккан
     * киритиш), эски воқеанинг бошланишини оламиз —
     * манфий муддат чиқмаслиги учун.
     */
    const yopilish =
      p.boshlanganSana > ochiq.boshlanganSana ? p.boshlanganSana : ochiq.boshlanganSana;
    await mijoz.ishgaJoylashish.update({
      where: { id: ochiq.id },
      data: { tugaganSana: yopilish, tugashSababi: YANGI_ISHGA_OTDI, holati: 'TUGADI' },
    });
    yopildi = ochiq.id;
  }

  /* 3. Янги воқеа */
  const yangi = await mijoz.ishgaJoylashish.create({
    data: {
      ishsizId: p.ishsizId,
      korxonaNomi: nom,
      lavozim: p.lavozim?.trim() || null,
      ishBeruvchiId: p.ishBeruvchiId ?? null,
      vacancyId: p.vacancyId ?? null,
      boshlanganSana: p.boshlanganSana,
      /*
       * ҲОЛАТИ — `NOMALUM`, `ISHLAMOQDA` эмас.
       *
       * «Ишга кирди» деган ёзув «ҳозир ҳам ишлаяпти» деган
       * маънони бермайди. Буни билиш учун далил керак —
       * шунинг учун бошланғич ҳолат «текширилмаган».
       */
      holati: 'NOMALUM',
      kiritganId: p.kiritganId ?? null,
    },
    select: { id: true },
  });

  return { id: yangi.id, yangi: true, oldingisiYopildi: yopildi };
}

/**
 * Ишнинг тугагани — ҚЎЛДА белгиланади ва САБАБ талаб қилади.
 *
 * Сабабсиз ёпилган иш «нега кетди» саволига жавоб
 * қолдирмайди, бу савол эса кейинги ишга жойлаштиришда
 * керак бўлади.
 */
export async function joylashishniTugat(p: {
  joylashishId: string;
  userId: string;
  tugaganSana: Date;
  sabab: string;
}): Promise<{ ok: boolean; sabab?: 'topilmadi' | 'sababsiz' | 'allaqachon' | 'sana-teskari' }> {
  if (!p.sabab || p.sabab.trim().length < SABAB_ENG_KAM) {
    return { ok: false, sabab: 'sababsiz' };
  }

  const bor = await prisma.ishgaJoylashish.findUnique({
    where: { id: p.joylashishId },
    select: { id: true, boshlanganSana: true, tugaganSana: true },
  });
  if (!bor) return { ok: false, sabab: 'topilmadi' };
  if (bor.tugaganSana) return { ok: false, sabab: 'allaqachon' };
  if (p.tugaganSana < bor.boshlanganSana) return { ok: false, sabab: 'sana-teskari' };

  /*
   * ── АТОМАР ЎТИШ ──
   *
   * Шарт ЁЗИШ пайтида текширилади. Икки мутахассис бир
   * вақтда ёпса, иккинчисига «аллақачон» деб айтилади —
   * биринчисининг сабаби ўчиб кетмайди.
   */
  const natija = await prisma.ishgaJoylashish.updateMany({
    where: { id: p.joylashishId, tugaganSana: null },
    data: {
      tugaganSana: p.tugaganSana,
      tugashSababi: p.sabab.trim().slice(0, 500),
      holati: 'TUGADI',
      kiritganId: p.userId,
    },
  });

  return natija.count === 1 ? { ok: true } : { ok: false, sabab: 'allaqachon' };
}

/**
 * Воқеанинг ҲОЗИРГИ ҳолатини белгилаш.
 *
 * `HOZIR_ISHLAYOTGANI` мақсадидаги далил тасдиқланганда
 * шу ерга ёзилади: «шу санада текширилди, ишлаб турибди».
 */
export async function joylashishHolatini(p: {
  joylashishId: string;
  holati: JoylashuvVoqeaHolati;
  tekshirilganSana?: Date;
}): Promise<void> {
  await prisma.ishgaJoylashish.update({
    where: { id: p.joylashishId },
    data: { holati: p.holati, oxirgiTekshiruv: p.tekshirilganSana ?? new Date() },
  });
}

/**
 * ============================================================
 *  ВОҚЕАГА БОҒЛАНМАГАН ДАЛИЛЛАР
 *
 *  `joylashishId` устуни қўшилгунга қадар киритилган барча
 *  далилда у БЎШ. Улар ёлғон эмас — шунчаки қайси ишга
 *  тегишли экани ёзилмаган.
 *
 *  ── Нега ЎЗИМИЗ боғламаймиз ──
 *
 *  Тахмин қилиб боғлаш осон эди: «одамнинг битта иши бор,
 *  демак шунга тегишли». Аммо одамда иккита иш бўлса,
 *  тахмин 50 фоиз ҳолда НОТЎҒРИ боғланишни ясарди — ва у
 *  ҳисоботда ҲАҚИҚИЙ боғланиш бўлиб кўринарди.
 *
 *  Нотўғри боғланган далил йўқ далилдан ёмонроқ: биринчисига
 *  ишониб рақам чиқарилади, иккинчиси эса «текшир» деб
 *  турибди.
 *
 *  Шунинг учун улар РЎЙХАТ бўлиб чиқади ва одам боғлайди.
 * ============================================================
 */
export async function bogliqsizDalillar(soni = 50): Promise<
  {
    dalilId: string;
    ishsizId: string;
    fish: string;
    mahallaNomi: string;
    turi: string;
    holati: string;
    createdAt: Date;
    /** Тахмин учун: одамнинг очиқ иши (боғланмайди, кўрсатилади) */
    taklif: { id: string; korxonaNomi: string; boshlanganSana: Date } | null;
    /** Одамда нечта иш бор — иккитадан кўп бўлса, тахмин хавфли */
    ishlarSoni: number;
  }[]
> {
  const dalillar = await prisma.joylashuvDalili.findMany({
    where: { joylashishId: null },
    orderBy: { createdAt: 'desc' },
    take: soni,
    select: {
      id: true,
      turi: true,
      holati: true,
      createdAt: true,
      ishsiz: {
        select: {
          id: true,
          fish: true,
          mahalla: { select: { nomiKirill: true } },
          joylashishlar: {
            orderBy: { boshlanganSana: 'desc' },
            select: { id: true, korxonaNomi: true, boshlanganSana: true, tugaganSana: true },
          },
        },
      },
    },
  });

  return dalillar.map((d) => {
    const ishlar = d.ishsiz.joylashishlar;
    const ochiq = ishlar.find((i) => i.tugaganSana === null) ?? null;
    return {
      dalilId: d.id,
      ishsizId: d.ishsiz.id,
      fish: d.ishsiz.fish,
      mahallaNomi: d.ishsiz.mahalla.nomiKirill,
      turi: d.turi,
      holati: d.holati,
      createdAt: d.createdAt,
      taklif: ochiq
        ? { id: ochiq.id, korxonaNomi: ochiq.korxonaNomi, boshlanganSana: ochiq.boshlanganSana }
        : null,
      ishlarSoni: ishlar.length,
    };
  });
}

/**
 * Далилни воқеага боғлаш — ҚЎЛДА, одам қарори билан.
 *
 * Иккови БИТТА одамга тегишли бўлиши текширилади: бошқа
 * одамнинг ишига боғланган далил — энг ёмон хато, чунки у
 * иккита рақамни бирданига бузади.
 */
export async function dalilniBoglash(p: {
  dalilId: string;
  joylashishId: string;
}): Promise<{ ok: boolean; sabab?: 'dalil-topilmadi' | 'ish-topilmadi' | 'boshqa-odam' | 'allaqachon' }> {
  const [dalil, ish] = await Promise.all([
    prisma.joylashuvDalili.findUnique({
      where: { id: p.dalilId },
      select: { id: true, ishsizId: true, joylashishId: true, izoh: true },
    }),
    prisma.ishgaJoylashish.findUnique({
      where: { id: p.joylashishId },
      select: { id: true, ishsizId: true, korxonaNomi: true },
    }),
  ]);

  if (!dalil) return { ok: false, sabab: 'dalil-topilmadi' };
  if (!ish) return { ok: false, sabab: 'ish-topilmadi' };
  if (dalil.ishsizId !== ish.ishsizId) return { ok: false, sabab: 'boshqa-odam' };
  if (dalil.joylashishId) return { ok: false, sabab: 'allaqachon' };

  /*
   * Боғлаш ҚЎЛДА қилинган қарор — изи қолиши керак. Алоҳида
   * жадвал тўғрироқ бўларди, аммо аудит журнали йўлнинг
   * ўзида ёзилади; бу ерда изоҳга бир қатор қўшилади, шунда
   * далилни очган одам «бу боғланиш қўлда қилинган» деб
   * кўради.
   */
  const iz =
    `[${new Date().toISOString().slice(0, 10)}] Воқеага қўлда боғланди: ` +
    `${ish.korxonaNomi}`;
  const izoh = [dalil.izoh?.trim(), iz].filter(Boolean).join('\n').slice(0, 2000);

  /*
   * ── АТОМАР ── шарт ЁЗИШ пайтида: икки мутахассис бир
   * вақтда бошқа-бошқа ишга боғласа, иккинчиси «аллақачон»
   * деб қайтади.
   */
  const natija = await prisma.joylashuvDalili.updateMany({
    where: { id: p.dalilId, joylashishId: null },
    data: { joylashishId: p.joylashishId, izoh },
  });

  return natija.count === 1 ? { ok: true } : { ok: false, sabab: 'allaqachon' };
}
