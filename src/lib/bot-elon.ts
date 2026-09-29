import { prisma } from './prisma';
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

export async function suhbatniBoshla(userId: string): Promise<Javob> {
  await prisma.botSuhbati.upsert({
    where: { userId },
    create: { userId, turi: ELON_TURI, bosqich: 'mahalla', malumot: {} },
    update: { turi: ELON_TURI, bosqich: 'mahalla', malumot: {} },
  });
  return soragich('mahalla', {});
}

export async function suhbatniBekorQil(userId: string): Promise<void> {
  await prisma.botSuhbati.deleteMany({ where: { userId } });
}

async function suhbatniOl(
  userId: string
): Promise<{ bosqich: Qadam; malumot: Malumot } | null> {
  const s = await prisma.botSuhbati.findUnique({
    where: { userId },
    select: { bosqich: true, malumot: true, updatedAt: true, turi: true },
  });
  if (!s || s.turi !== ELON_TURI) return null;

  /*
   * Эскирган суҳбат ташланади.
   *
   * Раҳбар ярим йўлда тўхтаб, эртаси куни ботга бошқа сабабдан
   * ёзиши мумкин — ва тасодифан эски саволга жавоб бериб
   * қўйиши мумкин эди.
   */
  const yosh = Date.now() - s.updatedAt.getTime();
  if (yosh > SUHBAT_MUDDATI_DAQIQA * 60_000) {
    await prisma.botSuhbati.deleteMany({ where: { userId } });
    return null;
  }

  return {
    bosqich: s.bosqich as Qadam,
    malumot: (s.malumot ?? {}) as Malumot,
  };
}

async function saqla(userId: string, bosqich: Qadam, malumot: Malumot): Promise<void> {
  await prisma.botSuhbati.update({
    where: { userId },
    data: { bosqich, malumot: malumot as object },
  });
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
          'Масалан: <i>+998 90 123 45 67</i>',
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
  const s = await suhbatniOl(userId);
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
      await saqla(userId, 'korxona', m);
      return soragich('korxona', m);
    }

    case 'korxona':
      if (matn.trim().length < 2) {
        return { matn: 'Корхона номи жуда қисқа. Қайтадан ёзинг.', tugmalar: [] };
      }
      m.korxonaNomi = matn.trim().slice(0, 120);
      await saqla(userId, 'lavozim', m);
      return soragich('lavozim', m);

    case 'lavozim':
      if (matn.trim().length < 2) {
        return { matn: 'Лавозим жуда қисқа. Қайтадан ёзинг.', tugmalar: [] };
      }
      m.lavozim = matn.trim().slice(0, 120);
      await saqla(userId, 'ornlar', m);
      return soragich('ornlar', m);

    case 'ornlar': {
      const n = Number.parseInt(matn.replace(/\D/g, ''), 10);
      if (!Number.isFinite(n) || n < 1 || n > 500) {
        return { matn: 'Ўрин сони 1 дан 500 гача бўлиши керак.', tugmalar: [] };
      }
      m.ornlarSoni = n;
      await saqla(userId, 'maosh', m);
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
      await saqla(userId, 'telefon', m);
      return soragich('telefon', m);
    }

    case 'telefon': {
      const raqamlar = matn.replace(/\D/g, '');
      if (raqamlar.length < 7) {
        return {
          matn: 'Телефон рақами жуда қисқа. Қайтадан ёзинг.',
          tugmalar: [{ yozuv: '⏭ Ўтказиш', belgi: ELON.OTKAZ }],
        };
      }
      m.telefon = matn.trim().slice(0, 40);
      await saqla(userId, 'muddat', m);
      return soragich('muddat', m);
    }

    default:
      /* Тугма кутилаётган қадамда матн келса — саволни қайтарамиз */
      return soragich(s.bosqich, m);
  }
}

/** Тугмали жавоб */
export async function tugmaliJavob(userId: string, belgi: string): Promise<Javob | null> {
  const s = await suhbatniOl(userId);
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
    await saqla(userId, 'korxona', m);
    return soragich('korxona', m);
  }

  if (belgi.startsWith(`${ELON.ORIN}:`)) {
    m.ornlarSoni = Number.parseInt(belgi.split(':')[1], 10) || 1;
    await saqla(userId, 'maosh', m);
    return soragich('maosh', m);
  }

  if (belgi.startsWith(`${ELON.MUDDAT}:`)) {
    const kun = Number.parseInt(belgi.split(':')[1], 10);
    m.muddatKun = kun > 0 ? kun : null;
    await saqla(userId, 'tasdiq', m);
    return soragich('tasdiq', m);
  }

  if (belgi === ELON.OTKAZ) {
    if (s.bosqich === 'maosh') {
      m.maosh = null;
      await saqla(userId, 'telefon', m);
      return soragich('telefon', m);
    }
    if (s.bosqich === 'telefon') {
      m.telefon = null;
      await saqla(userId, 'muddat', m);
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
  const s = await suhbatniOl(userId);
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
    },
    select: { id: true, lavozim: true },
  });

  await prisma.botSuhbati.deleteMany({ where: { userId } });
  return { ok: true, id: orin.id, lavozim: orin.lavozim };
}

/** Суҳбат бормиин — вебхук матнни кимга беришини шундан билади */
export async function suhbatBormi(userId: string): Promise<boolean> {
  return (await suhbatniOl(userId)) !== null;
}
