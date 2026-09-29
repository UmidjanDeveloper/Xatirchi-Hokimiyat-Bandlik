import { prisma } from './prisma';
import { telefonSaqlashUchun, telefonTekshir } from './inson-tekshiruvi';
import type { Tugma } from './xabarnoma';

/**
 * ============================================================
 *  БОТДАН ЭЪЛОН ҚЎЙИШ
 *
 *  ── Нега керак бўлди ──
 *
 *  Бандлик раҳбари корхона билан ТЕЛЕФОНДА гаплашади. Иш
 *  ўрни ўша суҳбатда маълум бўлади — аммо эълонни қўйиш учун
 *  компьютерга бориб, сайтга кириб, шаклни тўлдириш керак
 *  эди. Орада соатлар, баъзан кунлар ўтарди.
 *
 *  Энди эълон ўша ернинг ўзида, телефондан қўйилади.
 *
 *  ── Нега ҳолат базада ──
 *
 *  Бот саволларни КЕТМА-КЕТ беради ва олдинги жавобларни
 *  эслаб туриши керак. Telegram эса ҳар хабарни алоҳида
 *  юборади — орада «сеанс» йўқ. Хотирада сақлаб бўлмайди:
 *  Vercel'да ҳар сўров БОШҚА жараёнда бажарилиши мумкин.
 *
 *  ── Нега тасдиқлаш экрани бор ──
 *
 *  Эълон қўйилгач 70 та ходимга хабар кетади. Хато терилган
 *  маош ёки нотўғри маҳалла — бу ўнлаб одамнинг беҳуда
 *  йўлга чиқиши. Шунинг учун охирида ҳаммаси кўрсатилади ва
 *  сўралади.
 * ============================================================
 */

export const ELON_TURI = 'ish-orni';

/** Суҳбат бу муддатдан кейин эскиради */
export const SUHBAT_MUDDATI_DAQIQA = 30;

export const ELON = {
  BOSHLA: 'e.boshla',
  BEKOR: 'e.bekor',
  TASDIQ: 'e.tasdiq',
  ORIN: 'e.orin',
  MUDDAT: 'e.muddat',
  OTKAZ: 'e.otkaz',
} as const;

/** Қадамлар — тартиб шу массивда */
const QADAMLAR = [
  'mahalla',
  'korxona',
  'lavozim',
  'ornlar',
  'maosh',
  'telefon',
  'muddat',
  'tasdiq',
] as const;
type Qadam = (typeof QADAMLAR)[number];

interface Malumot {
  mahallaId?: string;
  mahallaNomi?: string;
  korxonaNomi?: string;
  lavozim?: string;
  ornlarSoni?: number;
  maosh?: number | null;
  telefon?: string | null;
  muddatKun?: number | null;
}

export interface Javob {
  matn: string;
  tugmalar: Tugma[];
}

function raqam(n: number): string {
  return n.toLocaleString('ru-RU').replace(/ /g, ' ');
}

/* ── Ҳолат ────────────────────────────────────────────────── */

/**
 * ============================================================
 *  СУҲБАТ ОМБОРИ
 *
 *  ── Нега икки хил ──
 *
 *  Айнан шу етти қадамли суҳбатни ИККИ ХИЛ одам ўтайди:
 *  бандлик раҳбари ва иш берувчи.
 *
 *  Раҳбар — `User`, унинг суҳбати `BotSuhbati` да. Иш берувчи
 *  эса `User` ЭМАС: унинг сайт сессияси ҳам, пароли ҳам йўқ,
 *  ва бўлмаслиги ҳам керак. Унинг суҳбати ўз ёзувида туради.
 *
 *  ── Нега суҳбат коди нусхаланмади ──
 *
 *  Етти қадам, ҳар бирида савол, текширув ва хато матни. Уни
 *  иккинчи марта ёзиш — иккита бир-биридан аста-секин
 *  узоқлашадиган нусха дегани: бирида маош текшируви
 *  тузатилиб, иккинчисида эскисича қолади.
 *
 *  Шунинг учун суҳбат БИТТА, сақлаш жойи эса алмашади.
 * ============================================================
 */
export interface SuhbatOmbori {
  boshla(): Promise<void>;
  oqi(): Promise<{ bosqich: Qadam; malumot: Malumot } | null>;
  saqla(bosqich: Qadam, malumot: Malumot): Promise<void>;
  ochir(): Promise<void>;
}

/** Суҳбат эскирдими */
const eskirgan = (yangilangan: Date): boolean =>
  Date.now() - yangilangan.getTime() > SUHBAT_MUDDATI_DAQIQA * 60_000;

/** Ҳокимият ходими — суҳбат `BotSuhbati` да */
export function xodimOmbori(userId: string): SuhbatOmbori {
  return {
    async boshla() {
      await prisma.botSuhbati.upsert({
        where: { userId },
        create: { userId, turi: ELON_TURI, bosqich: 'mahalla', malumot: {} },
        update: { turi: ELON_TURI, bosqich: 'mahalla', malumot: {} },
      });
    },
    async oqi() {
      const s = await prisma.botSuhbati.findUnique({
        where: { userId },
        select: { bosqich: true, malumot: true, updatedAt: true, turi: true },
      });
      if (!s || s.turi !== ELON_TURI) return null;

      /*
       * Эскирган суҳбат ташланади.
       *
       * Раҳбар ярим йўлда тўхтаб, эртаси куни ботга бошқа
       * сабабдан ёзиши мумкин — ва тасодифан эски саволга
       * жавоб бериб қўйиши мумкин эди.
       */
      if (eskirgan(s.updatedAt)) {
        await prisma.botSuhbati.deleteMany({ where: { userId } });
        return null;
      }
      return { bosqich: s.bosqich as Qadam, malumot: (s.malumot ?? {}) as Malumot };
    },
    async saqla(bosqich, malumot) {
      await prisma.botSuhbati.update({
        where: { userId },
        data: { bosqich, malumot: malumot as object },
      });
    },
    async ochir() {
      await prisma.botSuhbati.deleteMany({ where: { userId } });
    },
  };
}

/** Иш берувчи — суҳбат ўз ёзувида */
export function beruvchiOmbori(beruvchiId: string): SuhbatOmbori {
  return {
    async boshla() {
      await prisma.ishBeruvchi.update({
        where: { id: beruvchiId },
        data: { bosqich: 'mahalla', suhbat: {}, suhbatVaqti: new Date() },
      });
    },
    async oqi() {
      const b = await prisma.ishBeruvchi.findUnique({
        where: { id: beruvchiId },
        select: { bosqich: true, suhbat: true, suhbatVaqti: true },
      });
      if (!b?.bosqich || !b.suhbatVaqti) return null;

      /*
       * ── НЕГА ҚАДАМ ТЕКШИРИЛАДИ ──
       *
       * Битта устунда ИККИ ХИЛ суҳбат сақланади: рўйхатдан
       * ўтиш (`r.` билан бошланади) ва эълон қўйиш.
       *
       * Текширувсиз рўйхатдан ўтаётган одамнинг жавоби
       * эълон суҳбатига тушиб кетарди: унинг «корхона номи»
       * қадами иккала рўйхатда ҳам бор.
       */
      if (!(QADAMLAR as readonly string[]).includes(b.bosqich)) return null;

      /*
       * Иш берувчининг суҳбати ҳам эскиради, ва бу ундан ҳам
       * муҳимроқ: у ботни камдан-кам очади ва ярим қолган
       * суҳбат бир ҳафтадан кейин кутилмаганда давом этиб
       * кетиши мумкин эди.
       */
      if (eskirgan(b.suhbatVaqti)) {
        await prisma.ishBeruvchi.update({
          where: { id: beruvchiId },
          data: { bosqich: null, suhbat: {}, suhbatVaqti: null },
        });
        return null;
      }
      return { bosqich: b.bosqich as Qadam, malumot: (b.suhbat ?? {}) as Malumot };
    },
    async saqla(bosqich, malumot) {
      await prisma.ishBeruvchi.update({
        where: { id: beruvchiId },
        data: { bosqich, suhbat: malumot as object, suhbatVaqti: new Date() },
      });
    },
    async ochir() {
      await prisma.ishBeruvchi.update({
        where: { id: beruvchiId },
        data: { bosqich: null, suhbat: {}, suhbatVaqti: null },
      });
    },
  };
}

export async function suhbatniBoshla(userId: string): Promise<Javob> {
  return omborBoshla(xodimOmbori(userId));
}

export async function omborBoshla(ombor: SuhbatOmbori): Promise<Javob> {
  await ombor.boshla();
  return soragich('mahalla', {});
}

export async function suhbatniBekorQil(userId: string): Promise<void> {
  await xodimOmbori(userId).ochir();
}

/* ── Саволлар ─────────────────────────────────────────────── */

function soragich(bosqich: Qadam, m: Malumot): Javob {
  const bekor: Tugma = { yozuv: '✖️ Бекор қилиш', belgi: ELON.BEKOR };

  switch (bosqich) {
    case 'mahalla':
      return {
        matn: [
          '<b>Янги иш ўрни — 1/7</b>',
          '',
          'Қайси маҳалла учун?',
          '',
          'Маҳалла номини ёзинг. Масалан: <i>Уйшун</i>',
        ].join('\n'),
        tugmalar: [bekor],
      };

    case 'korxona':
      return {
        matn: [
          '<b>Янги иш ўрни — 2/7</b>',
          `Маҳалла: ${m.mahallaNomi}`,
          '',
          'Корхона номи?',
          '',
          'Масалан: <i>Xatirchi Qurilish MCHJ</i>',
        ].join('\n'),
        tugmalar: [bekor],
      };

    case 'lavozim':
      return {
        matn: [
          '<b>Янги иш ўрни — 3/7</b>',
          `${m.korxonaNomi}`,
          '',
          'Лавозим?',
          '',
          'Масалан: <i>Пайвандчи</i>',
        ].join('\n'),
        tugmalar: [bekor],
      };

    case 'ornlar':
      return {
        matn: ['<b>Янги иш ўрни — 4/7</b>', '', 'Нечта ўрин бўш?'].join('\n'),
        tugmalar: [
          { yozuv: '1', belgi: `${ELON.ORIN}:1` },
          { yozuv: '2', belgi: `${ELON.ORIN}:2` },
          { yozuv: '3', belgi: `${ELON.ORIN}:3` },
          { yozuv: '5', belgi: `${ELON.ORIN}:5` },
          { yozuv: '10', belgi: `${ELON.ORIN}:10` },
          bekor,
        ],
      };

    case 'maosh':
      return {
        matn: [
          '<b>Янги иш ўрни — 5/7</b>',
          '',
          'Ойлик маош — <b>млн сўмда</b>?',
          '',
          'Масалан: <i>4.5</i>',
          '',
          'Маълум бўлмаса — «Ўтказиш».',
        ].join('\n'),
        tugmalar: [{ yozuv: '⏭ Ўтказиш', belgi: ELON.OTKAZ }, bekor],
      };

    case 'telefon':
      return {
        matn: [
          '<b>Янги иш ўрни — 6/7</b>',
          '',
          'Боғланиш учун телефон?',
          '',
          /*
           * Намуна рақам текширувдан ЎТАДИГАН бўлиши керак:
           * «123 45 67» кетма-кет ўсувчи рақам ва у сохта
           * деб саналади. Бот намуна кўрсатиб, ўша намунани
           * ўзи рад этарди.
           */
          'Масалан: <i>+998 93 507 21 46</i>',
        ].join('\n'),
        tugmalar: [{ yozuv: '⏭ Ўтказиш', belgi: ELON.OTKAZ }, bekor],
      };

    case 'muddat':
      return {
        matn: [
          '<b>Янги иш ўрни — 7/7</b>',
          '',
          'Эълон қачонгача кучда бўлсин?',
          '',
          'Муддат ўтгач эълон ўз-ўзидан ёпилади — ходимлар ўлган эълон бўйича одам юбормайди.',
        ].join('\n'),
        tugmalar: [
          { yozuv: '30 кун', belgi: `${ELON.MUDDAT}:30` },
          { yozuv: '60 кун', belgi: `${ELON.MUDDAT}:60` },
          { yozuv: '90 кун', belgi: `${ELON.MUDDAT}:90` },
          { yozuv: 'Муддатсиз', belgi: `${ELON.MUDDAT}:0` },
          bekor,
        ],
      };

    case 'tasdiq':
      return {
        matn: [
          '<b>Текшириб кўринг</b>',
          '',
          `Маҳалла: <b>${m.mahallaNomi}</b>`,
          `Корхона: <b>${m.korxonaNomi}</b>`,
          `Лавозим: <b>${m.lavozim}</b>`,
          `Ўрин сони: <b>${m.ornlarSoni}</b>`,
          `Маош: <b>${m.maosh ? `${m.maosh} млн сўм` : 'кўрсатилмаган'}</b>`,
          `Телефон: <b>${m.telefon ?? 'кўрсатилмаган'}</b>`,
          `Муддат: <b>${m.muddatKun ? `${m.muddatKun} кун` : 'муддатсиз'}</b>`,
          '',
          'Тасдиқласангиз, мос маҳалла ходимларига хабар кетади.',
        ].join('\n'),
        tugmalar: [
          { yozuv: '✅ Эълонни жойлаштириш', belgi: ELON.TASDIQ },
          bekor,
        ],
      };
  }
}

/* ── Жавобларни қабул қилиш ───────────────────────────────── */

/**
 * Матнли жавоб.
 *
 * `null` қайтса — бу суҳбатга тегишли эмас, ботнинг бошқа
 * қисми ишласин.
 */
export async function matnliJavob(userId: string, matn: string): Promise<Javob | null> {
  return omborMatn(xodimOmbori(userId), matn);
}

export async function omborMatn(ombor: SuhbatOmbori, matn: string): Promise<Javob | null> {
  const s = await ombor.oqi();
  if (!s) return null;

  const m = { ...s.malumot };

  switch (s.bosqich) {
    case 'mahalla': {
      /*
       * Маҳалла НОМИ билан қидирилади, рўйхатдан эмас: 70 та
       * маҳалла учун тугма қўйиб бўлмайди — Telegram экрани
       * ҳам, `callback_data` ҳам етмайди.
       */
      const nomi = matn.trim();
      const topilgan = await prisma.mahalla.findMany({
        where: {
          OR: [
            { nomiKirill: { contains: nomi, mode: 'insensitive' } },
            { nomi: { contains: nomi, mode: 'insensitive' } },
          ],
        },
        take: 6,
        select: { id: true, nomiKirill: true },
      });

      if (topilgan.length === 0) {
        return {
          matn: `«${nomi}» топилмади. Маҳалла номини қайтадан ёзинг.`,
          tugmalar: [{ yozuv: '✖️ Бекор қилиш', belgi: ELON.BEKOR }],
        };
      }

      if (topilgan.length > 1) {
        return {
          matn: 'Бир нечта маҳалла топилди — қайси бири?',
          tugmalar: [
            ...topilgan.map((t) => ({
              yozuv: t.nomiKirill,
              belgi: `e.mfy:${t.id}`,
            })),
            { yozuv: '✖️ Бекор қилиш', belgi: ELON.BEKOR },
          ],
        };
      }

      m.mahallaId = topilgan[0].id;
      m.mahallaNomi = topilgan[0].nomiKirill;
      await ombor.saqla('korxona', m);
      return soragich('korxona', m);
    }

    case 'korxona':
      if (matn.trim().length < 2) {
        return { matn: 'Корхона номи жуда қисқа. Қайтадан ёзинг.', tugmalar: [] };
      }
      m.korxonaNomi = matn.trim().slice(0, 120);
      await ombor.saqla('lavozim', m);
      return soragich('lavozim', m);

    case 'lavozim':
      if (matn.trim().length < 2) {
        return { matn: 'Лавозим жуда қисқа. Қайтадан ёзинг.', tugmalar: [] };
      }
      m.lavozim = matn.trim().slice(0, 120);
      await ombor.saqla('ornlar', m);
      return soragich('ornlar', m);

    case 'ornlar': {
      const n = Number.parseInt(matn.replace(/\D/g, ''), 10);
      if (!Number.isFinite(n) || n < 1 || n > 500) {
        return { matn: 'Ўрин сони 1 дан 500 гача бўлиши керак.', tugmalar: [] };
      }
      m.ornlarSoni = n;
      await ombor.saqla('maosh', m);
      return soragich('maosh', m);
    }

    case 'maosh': {
      const son = Number.parseFloat(matn.replace(',', '.').replace(/[^\d.]/g, ''));
      if (!Number.isFinite(son) || son <= 0 || son > 500) {
        return {
          matn: 'Маошни млн сўмда ёзинг. Масалан: 4.5',
          tugmalar: [{ yozuv: '⏭ Ўтказиш', belgi: ELON.OTKAZ }],
        };
      }
      m.maosh = son;
      await ombor.saqla('telefon', m);
      return soragich('telefon', m);
    }

    case 'telefon': {
      /*
       * ── НЕГА ТЎЛИҚ ТЕКШИРУВ ──
       *
       * Аввал бу ерда «камида 7 та рақам» деган шарт бор
       * эди, ва рақам ХОМ ҳолда сақланарди.
       *
       * Иккита оқибати бўлди:
       *
       *   1. Сохта рақам ўтиб кетарди. Телефон эса ЯГОНА
       *      алоқа йўли: маҳалла ходими ўша рақамга
       *      қўнғироқ қилиб, фуқарони юборади. Рақам
       *      ишламаса — эълоннинг ўзи бекор.
       *
       *   2. «90 123 45 67» деб терилган рақам ўша ҳолда
       *      сақланиб, экранда бошқа рақамлардан бошқача
       *      кўринарди: тизимнинг қолган жойи `+998...`
       *      кўринишини ишлатади.
       *
       * Энди текширув рўйхатдан ўтиш билан АЙНАН бир хил.
       */
      const tekshiruv = telefonTekshir(matn, 'Телефон рақами');
      if (!tekshiruv.ok) {
        return {
          matn: [
            tekshiruv.xabar ?? 'Телефон рақами нотўғри',
            '',
            'Масалан: +998 93 507 21 46',
          ].join('\n'),
          tugmalar: [{ yozuv: '⏭ Ўтказиш', belgi: ELON.OTKAZ }],
        };
      }
      m.telefon = telefonSaqlashUchun(matn) ?? matn.trim().slice(0, 40);
      await ombor.saqla('muddat', m);
      return soragich('muddat', m);
    }

    default:
      /* Тугма кутилаётган қадамда матн келса — саволни қайтарамиз */
      return soragich(s.bosqich, m);
  }
}

/** Тугмали жавоб */
export async function tugmaliJavob(userId: string, belgi: string): Promise<Javob | null> {
  return omborTugma(xodimOmbori(userId), belgi);
}

export async function omborTugma(ombor: SuhbatOmbori, belgi: string): Promise<Javob | null> {
  const s = await ombor.oqi();
  if (!s) return null;
  const m = { ...s.malumot };

  if (belgi.startsWith('e.mfy:')) {
    const id = belgi.slice(6);
    const mfy = await prisma.mahalla.findUnique({
      where: { id },
      select: { id: true, nomiKirill: true },
    });
    if (!mfy) return { matn: 'Маҳалла топилмади.', tugmalar: [] };
    m.mahallaId = mfy.id;
    m.mahallaNomi = mfy.nomiKirill;
    await ombor.saqla('korxona', m);
    return soragich('korxona', m);
  }

  if (belgi.startsWith(`${ELON.ORIN}:`)) {
    m.ornlarSoni = Number.parseInt(belgi.split(':')[1], 10) || 1;
    await ombor.saqla('maosh', m);
    return soragich('maosh', m);
  }

  if (belgi.startsWith(`${ELON.MUDDAT}:`)) {
    const kun = Number.parseInt(belgi.split(':')[1], 10);
    m.muddatKun = kun > 0 ? kun : null;
    await ombor.saqla('tasdiq', m);
    return soragich('tasdiq', m);
  }

  if (belgi === ELON.OTKAZ) {
    if (s.bosqich === 'maosh') {
      m.maosh = null;
      await ombor.saqla('telefon', m);
      return soragich('telefon', m);
    }
    if (s.bosqich === 'telefon') {
      m.telefon = null;
      await ombor.saqla('muddat', m);
      return soragich('muddat', m);
    }
  }

  return null;
}

/**
 * Эълонни ҳақиқатан яратади.
 *
 * Хабар тарқатиш БУ ЕРДА эмас: у вебхукда, чунки хато бўлса
 * ҳам эълон сақланиб қолиши керак — раҳбарнинг иши тугади.
 */
export async function elonniYarat(
  userId: string
): Promise<{ ok: true; id: string; lavozim: string } | { ok: false; sabab: string }> {
  return omborYarat(xodimOmbori(userId), null);
}

/**
 * Эълонни яратади.
 *
 * `ishBeruvchiId` берилса — эълон ИШ БЕРУВЧИНИКИ ва у
 * модерациядан ўтмагунча ҳеч қаерда кўринмайди.
 */
export async function omborYarat(
  ombor: SuhbatOmbori,
  ishBeruvchiId: string | null
): Promise<{ ok: true; id: string; lavozim: string } | { ok: false; sabab: string }> {
  const s = await ombor.oqi();
  if (!s || s.bosqich !== 'tasdiq') return { ok: false, sabab: 'Суҳбат топилмади' };

  const m = s.malumot;
  if (!m.mahallaId || !m.korxonaNomi || !m.lavozim || !m.ornlarSoni) {
    return { ok: false, sabab: 'Маълумот тўлиқ эмас' };
  }

  const muddat = m.muddatKun
    ? new Date(Date.now() + m.muddatKun * 24 * 60 * 60 * 1000)
    : null;

  const orin = await prisma.vacancy.create({
    data: {
      mahallaId: m.mahallaId,
      korxonaNomi: m.korxonaNomi,
      lavozim: m.lavozim,
      ornlarSoni: m.ornlarSoni,
      /* Маош сўмда сақланади, ботда эса млн сўмда сўралади */
      maosh: m.maosh ? BigInt(Math.round(m.maosh * 1_000_000)) : null,
      telefon: m.telefon ?? null,
      amalQilishMuddati: muddat,
      faol: true,
      ishBeruvchiId,
      /*
       * ── МОДЕРАЦИЯ ──
       *
       * Ҳокимият ходими қўйган эълон дарҳол тарқалади: у
       * тизимнинг ичидаги одам ва унинг ҳар бир амали
       * журналда.
       *
       * Иш берувчи эса ташқаридаги одам. Унинг эълони 70 та
       * маҳалла ходимига хабар юборади ва туман ҳисоботига
       * киради — шунинг учун у аввал кўздан ўтади.
       */
      moderatsiya: ishBeruvchiId ? 'KUTILMOQDA' : 'TASDIQLANDI',
    },
    select: { id: true, lavozim: true },
  });

  await ombor.ochir();
  return { ok: true, id: orin.id, lavozim: orin.lavozim };
}

/** Суҳбат бормиин — вебхук матнни кимга беришини шундан билади */
export async function suhbatBormi(userId: string): Promise<boolean> {
  return (await xodimOmbori(userId).oqi()) !== null;
}

export async function omborSuhbatiBormi(ombor: SuhbatOmbori): Promise<boolean> {
  return (await ombor.oqi()) !== null;
}
