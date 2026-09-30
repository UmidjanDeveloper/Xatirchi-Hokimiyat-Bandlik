import type { IshBeruvchi } from '@prisma/client';
import { prisma } from './prisma';
import { FAOL_ELON, MODERATSIYA_KUTMOQDA } from './elon-muddati';
import { telefonSaqlashUchun, telefonTekshir } from './inson-tekshiruvi';
import { xavfsiz, xabarQoshish, type Tugma, type YangiXabar } from './xabarnoma';
import { BERUVCHI } from './beruvchi-belgilari';

export { BERUVCHI };

/**
 * ============================================================
 *  ИШ БЕРУВЧИ — БОТДАН ТУРИБ ЭЪЛОН ҚЎЯДИ
 *
 *  ── Нега керак ──
 *
 *  Бугун эълонни фақат ҳокимият ходими қўяди. Иш берувчи эса
 *  телефон қилиши, кимнидир топиши, айтиши ва кутиши керак.
 *  Амалда у кўп ҳолда умуман қўнғироқ қилмайди — ва бўш ўрин
 *  тизимга умуман тушмайди.
 *
 *  Бу — занжирнинг энг бошидаги тешик. Фуқаро қанча яхши
 *  хатловдан ўтмасин, таклиф қиладиган ИШ бўлмаса, занжир
 *  ўша ерда тўхтайди.
 *
 *  ── Нега модерация ──
 *
 *  Эълон 70 та маҳалла ходимига хабар юборади ва туман
 *  ҳисоботига киради. Иш берувчи эса ҳокимият ходими эмас:
 *  унинг ёзганини ҳеч ким кўрмасдан тарқатиб бўлмайди.
 *
 *  Модерация иккита жойда: аввал ИШ БЕРУВЧИНИНГ ЎЗИ
 *  тасдиқланади (бу бир марта), кейин ҳар бир ЭЪЛОН
 *  тасдиқланади.
 *
 *  Иккинчиси биринчисисиз етарли эмас: тасдиқланмаган
 *  одам ҳар куни ўнта сохта эълон юбориб, раҳбарнинг
 *  навбатини тиқиб ташлаши мумкин эди.
 * ============================================================
 */

/** Рўйхатдан ўтиш қадамлари — эълон қадамларидан `r.` билан ажралади */
const ROYXAT = ['r.korxona', 'r.masul', 'r.telefon', 'r.mahalla', 'r.tasdiq'] as const;
type RoyxatQadami = (typeof ROYXAT)[number];

export interface Javob {
  matn: string;
  tugmalar: Tugma[];
}

interface RoyxatMalumoti {
  korxonaNomi?: string;
  masulShaxs?: string;
  telefon?: string;
  mahallaId?: string;
  mahallaNomi?: string;
}

const ORQAGA: Tugma[] = [{ yozuv: '⬅️ Меню', belgi: BERUVCHI.MENYU }];

const raqam = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');

/* ── Топиш ва бошлаш ───────────────────────────────────────── */

export async function beruvchiTop(chatId: string): Promise<IshBeruvchi | null> {
  return prisma.ishBeruvchi.findUnique({ where: { telegramChatId: chatId } });
}

/**
 * Ботга нотаниш одам ёзди.
 *
 * ── Нега «код юборинг» дейиш етарли эмас ──
 *
 * Аввал бот нотаниш одамга фақат битта нарса айтарди: «улаш
 * учун сайтдан код олинг». Бу ҲОКИМИЯТ ХОДИМИ учун тўғри
 * кўрсатма, аммо иш берувчида на сайт ҳисоби бор, на код
 * оладиган жойи.
 *
 * У бу матнни ўқиб, ботни ёпади — ва бошқа очмайди.
 */
export function tanishtirish(): Javob {
  return {
    matn: [
      '<b>Хатирчи бандлик</b>',
      '',
      'Сиз ким сифатида кирмоқчисиз?',
      '',
      '👤 <b>Ҳокимият ходими</b> — сайтдан олинган кодни шу ерга юборинг.',
      '',
      '🏢 <b>Иш берувчи</b> — қуйидаги тугмани босинг. Бўш иш ўрни ҳақида эълонни ўзингиз қўя оласиз.',
    ].join('\n'),
    tugmalar: [
      { yozuv: '🏢 Мен иш берувчиман', belgi: BERUVCHI.ROYXAT },
      { yozuv: '👤 Мен ҳокимият ходимиман', belgi: BERUVCHI.XODIM },
    ],
  };
}

/* ── Рўйхатдан ўтиш ────────────────────────────────────────── */

export async function royxatniBoshla(chatId: string): Promise<Javob> {
  const bor = await beruvchiTop(chatId);

  if (bor && bor.holati !== 'RAD_ETILDI') {
    return beruvchiMenyusi(bor.id);
  }

  /*
   * Рад этилган иш берувчи ҚАЙТА уриниши мумкин: рад сабаби
   * «телефон нотўғри» бўлиши ҳам мумкин, ва уни тузатиб
   * қайта юборишга йўл бўлиши керак.
   */
  if (bor) {
    await prisma.ishBeruvchi.update({
      where: { id: bor.id },
      data: {
        holati: 'KUTILMOQDA',
        radSababi: null,
        halQilganId: null,
        halQilinganSana: null,
        bosqich: 'r.korxona',
        suhbat: {},
        suhbatVaqti: new Date(),
      },
    });
    return soragich('r.korxona');
  }

  await prisma.ishBeruvchi.create({
    data: {
      telegramChatId: chatId,
      korxonaNomi: '',
      masulShaxs: '',
      telefon: '',
      bosqich: 'r.korxona',
      suhbat: {},
      suhbatVaqti: new Date(),
    },
  });
  return soragich('r.korxona');
}

function soragich(qadam: RoyxatQadami, m: RoyxatMalumoti = {}): Javob {
  switch (qadam) {
    case 'r.korxona':
      return {
        matn: [
          '<b>Рўйхатдан ўтиш — 1/4</b>',
          '',
          'Корхона ёки ташкилот номини ёзинг.',
          '',
          '<i>Масалан: «Оқ Олтин» МЧЖ</i>',
        ].join('\n'),
        tugmalar: [{ yozuv: '✖️ Бекор', belgi: BERUVCHI.BEKOR }],
      };
    case 'r.masul':
      return {
        matn: [
          '<b>Рўйхатдан ўтиш — 2/4</b>',
          '',
          'Масъул шахснинг Ф.И.Ш. сини ёзинг.',
          '',
          '<i>Ишга олиш масаласида ким билан боғланамиз</i>',
        ].join('\n'),
        tugmalar: [{ yozuv: '✖️ Бекор', belgi: BERUVCHI.BEKOR }],
      };
    case 'r.telefon':
      return {
        matn: [
          '<b>Рўйхатдан ўтиш — 3/4</b>',
          '',
          'Телефон рақамини ёзинг.',
          '',
          /*
           * ── НАМУНА РАҚАМ ТЕКШИРУВДАН ЎТАДИГАН БЎЛСИН ──
           *
           * Аввал бу ерда «+998 90 123 45 67» турарди. Ўша
           * рақамни текширув РАД ЭТАДИ: «123 45 67» кетма-кет
           * ўсувчи рақам ва у сохта деб саналади.
           *
           * Яъни бот намуна кўрсатиб, ўша намунани ўзи рад
           * этарди. Одам уни кўчириб ёзиб, хато оларди ва
           * нима қилишни билмасди.
           */
          '<i>Масалан: +998 93 507 21 46</i>',
        ].join('\n'),
        tugmalar: [{ yozuv: '✖️ Бекор', belgi: BERUVCHI.BEKOR }],
      };
    case 'r.mahalla':
      return {
        matn: [
          '<b>Рўйхатдан ўтиш — 4/4</b>',
          '',
          'Корхона қайси МФЙ ҳудудида жойлашган?',
          '',
          '<i>Номини ёзинг — масалан: Уйшун</i>',
        ].join('\n'),
        tugmalar: [{ yozuv: '✖️ Бекор', belgi: BERUVCHI.BEKOR }],
      };
    case 'r.tasdiq':
      return {
        matn: [
          '<b>Маълумотни текширинг</b>',
          '',
          `🏢 ${m.korxonaNomi ?? '—'}`,
          `👤 ${m.masulShaxs ?? '—'}`,
          `📞 ${m.telefon ?? '—'}`,
          `📍 ${m.mahallaNomi ?? '—'} МФЙ`,
          '',
          'Тўғри бўлса, юборинг. Бандлик маркази кўриб чиқади.',
        ].join('\n'),
        tugmalar: [
          { yozuv: '✅ Юбориш', belgi: BERUVCHI.YUBOR },
          { yozuv: '✖️ Бекор', belgi: BERUVCHI.BEKOR },
        ],
      };
  }
}

/** Рўйхат суҳбати кетаяптими */
export async function royxatSuhbati(beruvchiId: string): Promise<RoyxatQadami | null> {
  const b = await prisma.ishBeruvchi.findUnique({
    where: { id: beruvchiId },
    select: { bosqich: true },
  });
  if (!b?.bosqich) return null;
  return (ROYXAT as readonly string[]).includes(b.bosqich) ? (b.bosqich as RoyxatQadami) : null;
}

/** Рўйхат суҳбатидаги матнли жавоб */
export async function royxatMatni(beruvchiId: string, matn: string): Promise<Javob | null> {
  const qadam = await royxatSuhbati(beruvchiId);
  if (!qadam) return null;

  const b = await prisma.ishBeruvchi.findUnique({
    where: { id: beruvchiId },
    select: { suhbat: true },
  });
  const m = (b?.suhbat ?? {}) as RoyxatMalumoti;
  const q = matn.trim();

  const saqla = async (keyingi: RoyxatQadami, yangi: RoyxatMalumoti) => {
    await prisma.ishBeruvchi.update({
      where: { id: beruvchiId },
      data: { bosqich: keyingi, suhbat: yangi as object, suhbatVaqti: new Date() },
    });
    return soragich(keyingi, yangi);
  };

  switch (qadam) {
    case 'r.korxona': {
      if (q.length < 3) {
        return { matn: 'Корхона номи жуда қисқа. Қайта ёзинг.', tugmalar: [] };
      }
      return saqla('r.masul', { ...m, korxonaNomi: q.slice(0, 200) });
    }

    case 'r.masul': {
      if (q.length < 5 || !q.includes(' ')) {
        return {
          matn: 'Тўлиқ Ф.И.Ш. ёзинг — камида исм ва фамилия.',
          tugmalar: [],
        };
      }
      return saqla('r.telefon', { ...m, masulShaxs: q.slice(0, 200) });
    }

    case 'r.telefon': {
      /*
       * Телефон ЯГОНА алоқа йўли: маҳалла ходими ўша рақамга
       * қўнғироқ қилиб, фуқарони юборади. Нотўғри рақам —
       * эълоннинг ўзини бекор қилади.
       */
      const tekshiruv = telefonTekshir(q, 'Телефон рақами');
      if (!tekshiruv.ok) {
        /*
         * Хато матни ТЕКШИРУВДАН олинади, қайта ёзилмайди:
         * «оператор коди йўқ» билан «9 та рақам бўлиши
         * керак» — икки бошқа хато ва одам нимани
         * тузатишни билиши керак.
         */
        return {
          /*
           * Сатр `join` билан йиғилади: `\n` нинг лотин «n»
           * ҳарфи кирилл сўзга ёпишиб қолса, алифбо синови
           * уни аралаш ёзув деб ушлайди.
           */
          matn: [
            tekshiruv.xabar ?? 'Телефон рақами нотўғри',
            '',
            'Масалан: +998 93 507 21 46',
          ].join('\n'),
          tugmalar: [],
        };
      }
      return saqla('r.mahalla', { ...m, telefon: telefonSaqlashUchun(q) ?? q });
    }

    case 'r.mahalla': {
      const mahalla = await mahallaniTop(q);
      if (!mahalla) {
        return {
          matn: 'Бундай МФЙ топилмади. Номини қайта ёзинг.',
          tugmalar: [],
        };
      }
      return saqla('r.tasdiq', {
        ...m,
        mahallaId: mahalla.id,
        mahallaNomi: mahalla.nomiKirill,
      });
    }

    case 'r.tasdiq':
      return soragich('r.tasdiq', m);
  }
}

/** МФЙ ни номи бўйича топади — иккала алифбода */
async function mahallaniTop(nom: string): Promise<{ id: string; nomiKirill: string } | null> {
  const { mahallaniTop: botTop } = await import('./bot-savol');
  return botTop(`${nom} МФЙ`);
}

/**
 * Рўйхатни юборади ва раҳбарга хабар қилади.
 */
export async function royxatniYubor(beruvchiId: string): Promise<Javob> {
  const b = await prisma.ishBeruvchi.findUnique({
    where: { id: beruvchiId },
    select: { suhbat: true, bosqich: true },
  });
  if (b?.bosqich !== 'r.tasdiq') {
    return { matn: 'Аввал маълумотни тўлдиринг.', tugmalar: [] };
  }

  const m = (b.suhbat ?? {}) as RoyxatMalumoti;
  if (!m.korxonaNomi || !m.masulShaxs || !m.telefon) {
    return { matn: 'Маълумот тўлиқ эмас.', tugmalar: [] };
  }

  await prisma.ishBeruvchi.update({
    where: { id: beruvchiId },
    data: {
      korxonaNomi: m.korxonaNomi,
      masulShaxs: m.masulShaxs,
      telefon: m.telefon,
      mahallaId: m.mahallaId ?? null,
      holati: 'KUTILMOQDA',
      bosqich: null,
      suhbat: {},
      suhbatVaqti: null,
    },
  });

  await rahbarlarniOgohlantir({
    turi: 'ISH_BERUVCHI_ARIZASI',
    matn: [
      '<b>Янги иш берувчи</b>',
      '',
      `🏢 ${m.korxonaNomi}`,
      `👤 ${m.masulShaxs}`,
      `📞 ${m.telefon}`,
      `📍 ${m.mahallaNomi ?? '—'} МФЙ`,
      '',
      'Тасдиқласангиз, у бўш иш ўрни эълонини ўзи қўя олади.',
    ].join('\n'),
    bogliqTuri: 'IshBeruvchi',
    bogliqId: beruvchiId,
  });

  return {
    matn: [
      '<b>Аризангиз юборилди</b>',
      '',
      'Бандлик маркази кўриб чиқади ва жавоб шу ерга келади.',
      '',
      'Одатда бир иш куни ичида.',
    ].join('\n'),
    tugmalar: [],
  };
}

/* ── Иш берувчи менюси ─────────────────────────────────────── */

export async function beruvchiMenyusi(beruvchiId: string): Promise<Javob> {
  const b = await prisma.ishBeruvchi.findUnique({
    where: { id: beruvchiId },
    select: {
      korxonaNomi: true,
      holati: true,
      radSababi: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });
  if (!b) return tanishtirish();

  if (b.holati === 'KUTILMOQDA') {
    return {
      matn: [
        `<b>${xavfsiz(b.korxonaNomi)}</b>`,
        '',
        '⏳ Аризангиз кўриб чиқилмоқда.',
        '',
        'Тасдиқлангач, шу ерда «Янги иш ўрни» тугмаси пайдо бўлади.',
      ].join('\n'),
      tugmalar: [],
    };
  }

  if (b.holati === 'RAD_ETILDI') {
    return {
      matn: [
        `<b>${xavfsiz(b.korxonaNomi)}</b>`,
        '',
        '❌ Аризангиз қабул қилинмади.',
        ...(b.radSababi ? ['', `Сабаби: ${xavfsiz(b.radSababi)}`] : []),
        '',
        'Маълумотни тузатиб, қайта юборишингиз мумкин.',
      ].join('\n'),
      tugmalar: [{ yozuv: '🔄 Қайта юбориш', belgi: BERUVCHI.ROYXAT }],
    };
  }

  const [ochiq, kutmoqda] = await Promise.all([
    prisma.vacancy.count({ where: { ...FAOL_ELON(), ishBeruvchiId: beruvchiId } }),
    prisma.vacancy.count({ where: { ...MODERATSIYA_KUTMOQDA(), ishBeruvchiId: beruvchiId } }),
  ]);

  return {
    matn: [
      `<b>${xavfsiz(b.korxonaNomi)}</b>`,
      b.mahalla ? `${xavfsiz(b.mahalla.nomiKirill)} МФЙ` : '',
      '',
      `📋 Очиқ эълонингиз: <b>${raqam(ochiq)}</b> та`,
      ...(kutmoqda > 0 ? [`⏳ Кўриб чиқилмоқда: <b>${raqam(kutmoqda)}</b> та`] : []),
      '',
      'Янги бўш иш ўрни бўлса, шу ердан эълон қўйинг — туманнинг барча маҳалла ходимига хабар боради.',
    ]
      .filter((x) => x !== '')
      .join('\n'),
    tugmalar: [{ yozuv: '➕ Янги иш ўрни', belgi: BERUVCHI.ELON }],
  };
}

/* ── Раҳбар томони: модерация ──────────────────────────────── */

async function rahbarlarniOgohlantir(p: {
  turi: 'ISH_BERUVCHI_ARIZASI' | 'ELON_MODERATSIYADA';
  matn: string;
  bogliqTuri: string;
  bogliqId: string;
}): Promise<number> {
  const rahbarlar = await prisma.user.findMany({
    where: { rol: { in: ['BANDLIK_RAHBAR', 'ADMIN'] }, faol: true },
    select: { id: true },
  });
  if (rahbarlar.length === 0) return 0;

  const xabarlar: YangiXabar[] = rahbarlar.map((r) => ({
    userId: r.id,
    turi: p.turi,
    matn: p.matn,
    bogliqTuri: p.bogliqTuri,
    bogliqId: p.bogliqId,
  }));
  return xabarQoshish(xabarlar);
}

/** Раҳбар иш берувчини қабул қилди ёки рад этди */
export async function beruvchiniHalQil(p: {
  beruvchiId: string;
  userId: string;
  qabul: boolean;
  sabab?: string | null;
}): Promise<{
  ok: boolean;
  korxonaNomi?: string;
  chatId?: string;
  /** `ok: false` бўлса — нега */
  sabab?: 'topilmadi' | 'allaqachon';
  hozirgiHolati?: string;
  halQilgan?: string | null;
}> {
  const b = await prisma.ishBeruvchi.findUnique({
    where: { id: p.beruvchiId },
    select: { id: true, korxonaNomi: true, telegramChatId: true, holati: true },
  });
  if (!b) return { ok: false, sabab: 'topilmadi' };

  /*
   * ── АТОМАР ЎТИШ ──
   *
   * Аввал бу ерда «ўқи → текшир → ёз» турарди. Иккита
   * раҳбар бир вақтда тугма босса (бири ботда, иккинчиси
   * сайтда — бу оддий ҳол, чунки хабар ИККОВИГА ҳам
   * боради), иккаласи ҳам KUTILMOQDA ни кўрарди, иккаласи
   * ҳам текширувдан ўтарди ва иккаласи ҳам ёзарди.
   *
   * Натижа: охирги ёзган ютарди, лекин ИККОВИГА ҳам
   * «бажарилди» деб жавоб борарди. Иш берувчига эса
   * иккита қарама-қарши хабар кетарди — «тасдиқланди» ва
   * «рад этилди».
   *
   * `updateMany` шартни ЁЗИШ пайтида текширади: базанинг
   * ўзи фақат биттасини ўтказади. Иккинчисига `count` нол
   * келади ва у «аллақачон ҳал қилинган» деган жавоб
   * олади.
   */
  const natija = await prisma.ishBeruvchi.updateMany({
    where: { id: b.id, holati: 'KUTILMOQDA' },
    data: {
      holati: p.qabul ? 'TASDIQLANDI' : 'RAD_ETILDI',
      radSababi: p.qabul ? null : (p.sabab ?? 'Маълумот етарли эмас'),
      halQilganId: p.userId,
      halQilinganSana: new Date(),
    },
  });

  if (natija.count === 0) {
    /* Бошқа биров улгурган — ҳозирги ҳолатни айтамиз */
    const hozir = await prisma.ishBeruvchi.findUnique({
      where: { id: b.id },
      select: { holati: true, halQilgan: { select: { fullName: true } } },
    });
    return {
      ok: false,
      sabab: 'allaqachon',
      hozirgiHolati: hozir?.holati,
      halQilgan: hozir?.halQilgan?.fullName ?? null,
    };
  }

  return { ok: true, korxonaNomi: b.korxonaNomi, chatId: b.telegramChatId };
}

/** Иш берувчи эълон қўйди — раҳбарга хабар */
export async function elonniModeratsiyagaYubor(vacancyId: string): Promise<number> {
  const e = await prisma.vacancy.findUnique({
    where: { id: vacancyId },
    select: {
      lavozim: true,
      korxonaNomi: true,
      ornlarSoni: true,
      maosh: true,
      telefon: true,
      mahalla: { select: { nomiKirill: true } },
      ishBeruvchi: { select: { korxonaNomi: true, masulShaxs: true } },
    },
  });
  if (!e) return 0;

  return rahbarlarniOgohlantir({
    turi: 'ELON_MODERATSIYADA',
    matn: [
      '<b>Иш берувчидан янги эълон</b>',
      '',
      `<b>${xavfsiz(e.lavozim)}</b>`,
      `${xavfsiz(e.korxonaNomi)}`,
      `${xavfsiz(e.mahalla.nomiKirill)} МФЙ · ${e.ornlarSoni} та ўрин`,
      ...(e.maosh ? [`${raqam(Number(e.maosh) / 1_000_000)} млн сўм`] : []),
      ...(e.telefon ? [`📞 ${xavfsiz(e.telefon)}`] : []),
      '',
      `Юборди: ${xavfsiz(e.ishBeruvchi?.masulShaxs ?? '—')} (${xavfsiz(e.ishBeruvchi?.korxonaNomi ?? '—')})`,
      '',
      'Тасдиқласангиз, барча маҳалла ходимига хабар кетади.',
    ].join('\n'),
    bogliqTuri: 'Vacancy',
    bogliqId: vacancyId,
  });
}

/**
 * Раҳбар эълонни ҳал қилди.
 *
 * Тасдиқлангач, эълон КУЧГА КИРАДИ: `FAOL_ELON` уни кўра
 * бошлайди ва хабар тарқатиш мумкин бўлади.
 */
export async function elonniHalQil(p: {
  vacancyId: string;
  userId: string;
  qabul: boolean;
  sabab?: string | null;
}): Promise<{
  ok: boolean;
  lavozim?: string;
  chatId?: string | null;
  sabab?: 'topilmadi' | 'allaqachon';
  hozirgiHolati?: string;
  halQilgan?: string | null;
}> {
  const e = await prisma.vacancy.findUnique({
    where: { id: p.vacancyId },
    select: {
      id: true,
      lavozim: true,
      moderatsiya: true,
      ishBeruvchi: { select: { telegramChatId: true } },
    },
  });
  if (!e) return { ok: false, sabab: 'topilmadi' };

  /*
   * ── АТОМАР ЎТИШ ──
   *
   * Иш берувчиникидаги билан бир хил сабаб: хабар барча
   * раҳбарга боради ва иккови бир вақтда тугма босиши
   * мумкин. Шартни база ёзиш пайтида текширади.
   */
  const natija = await prisma.vacancy.updateMany({
    where: { id: e.id, moderatsiya: 'KUTILMOQDA' },
    data: {
      moderatsiya: p.qabul ? 'TASDIQLANDI' : 'RAD_ETILDI',
      /* Ким, қачон ва нега — иш берувчи айнан шуни сўрайди */
      moderatsiyaQilganId: p.userId,
      moderatsiyaSanasi: new Date(),
      moderatsiyaSababi: p.qabul ? null : (p.sabab ?? null),
      /*
       * Рад этилган эълон ЁПИЛАДИ ҳам. Акс ҳолда у базада
       * `faol = true` бўлиб қоларди ва «муддати ўтганларни
       * ёпиш» жараёнида кутилмаганда қайта пайдо бўлиши
       * мумкин эди.
       */
      ...(p.qabul ? {} : { faol: false, yopilganSana: new Date() }),
    },
  });

  if (natija.count === 0) {
    const hozir = await prisma.vacancy.findUnique({
      where: { id: e.id },
      select: { moderatsiya: true, moderatsiyaQilgan: { select: { fullName: true } } },
    });
    return {
      ok: false,
      sabab: 'allaqachon',
      hozirgiHolati: hozir?.moderatsiya,
      halQilgan: hozir?.moderatsiyaQilgan?.fullName ?? null,
    };
  }

  return { ok: true, lavozim: e.lavozim, chatId: e.ishBeruvchi?.telegramChatId ?? null };
}

/** Модерация навбати — раҳбар менюси учун */
export async function moderatsiyaNavbati(): Promise<{ beruvchi: number; elon: number }> {
  const [beruvchi, elon] = await Promise.all([
    prisma.ishBeruvchi.count({ where: { holati: 'KUTILMOQDA' } }),
    prisma.vacancy.count({ where: MODERATSIYA_KUTMOQDA() }),
  ]);
  return { beruvchi, elon };
}

/* ── Иш берувчига хабар ────────────────────────────────────── */

/**
 * ============================================================
 *  ИШ БЕРУВЧИГА ХАБАР — НАВБАТСИЗ
 *
 *  ── Нега навбат ишлатилмайди ──
 *
 *  `Xabarnoma` навбати `User` га боғланган, иш берувчи эса
 *  `User` эмас — унинг ёзуви ўша жадвалга умуман сиғмайди.
 *
 *  Шунинг учун хабар ТЎҒРИДАН-ТЎҒРИ юборилади. Йўқолиш хавфи
 *  бор, аммо у қопланган: иш берувчи ботни очганда меню унга
 *  жорий ҳолатни барибир айтади.
 *
 *  ── Нега битта функция ──
 *
 *  Қарор ИККИ жойдан чиқади: ботдаги тугмадан ва сайтдаги
 *  тугмадан. Иккови ҳар хил матн юборса, иш берувчи қайси
 *  бири расмий эканини билмасди.
 * ============================================================
 */
export async function beruvchigaXabarBer(
  chatId: string | null | undefined,
  matn: string,
  tugmalar: Tugma[] = []
): Promise<boolean> {
  if (!chatId) return false;

  const { telegramSozlanganmi, telegramYuboruvchi } = await import('./xabarnoma');
  if (!telegramSozlanganmi()) return false;

  try {
    await telegramYuboruvchi(chatId, matn, tugmalar);
    return true;
  } catch (e) {
    console.error('Ish beruvchiga xabar yuborib bolmadi:', e);
    return false;
  }
}

/** Ариза бўйича қарор матни — бот ва сайт учун БИТТА */
export function beruvchiQaroriMatni(p: {
  qabul: boolean;
  korxonaNomi: string;
  sabab?: string | null;
}): string {
  if (p.qabul) {
    return [
      '<b>Аризангиз тасдиқланди</b>',
      '',
      `${xavfsiz(p.korxonaNomi)}`,
      '',
      'Энди бўш иш ўрни эълонини ўзингиз қўя оласиз — менюдан «Янги иш ўрни» тугмасини босинг.',
    ].join('\n');
  }
  return [
    '<b>Аризангиз қабул қилинмади</b>',
    '',
    `${xavfsiz(p.korxonaNomi)}`,
    ...(p.sabab ? ['', `Сабаби: ${xavfsiz(p.sabab)}`] : []),
    '',
    'Маълумотни тузатиб, қайта юборишингиз мумкин.',
  ].join('\n');
}

/** Эълон бўйича қарор матни — бот ва сайт учун БИТТА */
export function elonQaroriMatni(p: { qabul: boolean; lavozim: string }): string {
  return p.qabul
    ? `✅ <b>${xavfsiz(p.lavozim)}</b> эълонингиз тасдиқланди — туманнинг маҳалла ходимларига хабар кетди.`
    : `❌ <b>${xavfsiz(p.lavozim)}</b> эълонингиз қабул қилинмади. Бандлик маркази билан боғланинг.`;
}

/** Модерация рўйхати — сайтдаги саҳифа учун */
export async function moderatsiyaRoyxati() {
  const [beruvchilar, elonlar] = await Promise.all([
    prisma.ishBeruvchi.findMany({
      where: { holati: 'KUTILMOQDA' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        korxonaNomi: true,
        masulShaxs: true,
        telefon: true,
        createdAt: true,
        mahalla: { select: { nomiKirill: true } },
      },
    }),
    prisma.vacancy.findMany({
      where: MODERATSIYA_KUTMOQDA(),
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        lavozim: true,
        korxonaNomi: true,
        ornlarSoni: true,
        maosh: true,
        telefon: true,
        createdAt: true,
        mahalla: { select: { nomiKirill: true } },
        ishBeruvchi: { select: { korxonaNomi: true, masulShaxs: true } },
      },
    }),
  ]);
  return { beruvchilar, elonlar };
}

/** Тасдиқланган иш берувчилар — сайтдаги рўйхат учун */
export async function faolBeruvchilar(soni = 50) {
  return prisma.ishBeruvchi.findMany({
    where: { holati: { in: ['TASDIQLANDI', 'RAD_ETILDI'] } },
    orderBy: { halQilinganSana: 'desc' },
    take: soni,
    select: {
      id: true,
      korxonaNomi: true,
      masulShaxs: true,
      telefon: true,
      holati: true,
      radSababi: true,
      halQilinganSana: true,
      mahalla: { select: { nomiKirill: true } },
      halQilgan: { select: { fullName: true } },
      _count: { select: { elonlar: true } },
    },
  });
}
