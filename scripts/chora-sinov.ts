/**
 * ============================================================
 *  ЭҲТИЁЖ → ТОПШИРИҚ ЗАНЖИРИ — СИНОВ
 *
 *  Бу файл 2026-йил 16-сентябрда, ҳокимнинг саволидан кейин
 *  туғилди: «Чора-тадбирлар режаси» саҳифаси очилди ва у ерда
 *  НОЛ турарди — маҳалла ходимлари ишлаётган бўлса ҳам.
 *
 *  Сабаб: чора-тадбир ФАҚАТ қўлда яратиларди. Анкетадаги
 *  «касб ўрганмоқчи», «кредит керак» деган белгилар ҳеч кимга
 *  топшириқ бермасди.
 *
 *  Синовлар занжирнинг ҳар халқасини қўриқлайди: қайси белги
 *  қандай топшириқ туғдиради, масъул ким ва такрорланиб
 *  кетмайдими.
 * ============================================================
 */

import type { Tranzaksiya } from '../src/lib/prisma';
import { choralarniHisobla, yangiChoralar, type ChoraManbai } from '../src/lib/chora-yaratish';

type Sinov = { nomi: string; tekshir: () => boolean | Promise<boolean> };

/**
 * Базанинг ўрнига қўйиладиган сохта мижоз.
 *
 * Такрор аниқлаш қоидаси — эски хатловларни тўлдирадиган
 * тугманинг бутун хавфсизлиги шунга таянади: тугма ўн марта
 * босилса ҳам рўйхат бир хил қолиши керак. Шунинг учун у
 * базасиз ҳам синалади.
 */
function soxtaBaza(mavjudMuammolar: string[]): Tranzaksiya {
  return {
    actionPlan: {
      findMany: async () => mavjudMuammolar.map((muammo) => ({ muammo })),
    },
  } as unknown as Tranzaksiya;
}

/** Бўш хонадон — ҳар синов ўзига кераклисини қўшиб олади */
function xonadon(ozgarish: Partial<ChoraManbai> = {}): ChoraManbai {
  return {
    id: 'x1',
    moliyaEhtiyoji: false,
    talabQilinganMablag: null,
    maktabYoshdagi: 0,
    maktabQamrovda: 0,
    uzoqDavolanish: false,
    nogironlikBor: false,
    ishsizlar: [],
    ...ozgarish,
  };
}

function ishsiz(ozgarish: Partial<ChoraManbai['ishsizlar'][0]> = {}) {
  return {
    id: 'i1',
    fish: 'Тошматов Тошмат',
    kasbHunarEhtiyoji: false,
    organmoqchiKasb: null,
    itShaharchaVaucheri: false,
    ...ozgarish,
  };
}

/** Топшириқлар ичида шу матн борми */
const bor = (r: ReturnType<typeof choralarniHisobla>, qism: string) =>
  r.some((t) => t.muammo.includes(qism));

/** Шу муаммо бўйича масъул ким */
const masul = (r: ReturnType<typeof choralarniHisobla>, qism: string) =>
  r.find((t) => t.muammo.includes(qism))?.masulTashkilot ?? null;

const SINOVLAR: Sinov[] = [
  /* ── БЎШ ХОНАДОН ── */
  {
    nomi: 'Муаммосиз хонадондан топшириқ чиқмайди',
    tekshir: () => choralarniHisobla(xonadon()).length === 0,
  },

  /* ── ИШСИЗ ФУҚАРО ── */
  {
    nomi: 'Ишсиз топилса — бандлик марказига суҳбат топшириғи',
    tekshir: () => {
      const r = choralarniHisobla(xonadon({ ishsizlar: [ishsiz()] }));
      return bor(r, 'суҳбат ўтказилмаган') && masul(r, 'суҳбат') === 'Bandlik markazi';
    },
  },
  {
    nomi: 'Иккита ишсиз — иккита алоҳида топшириқ',
    tekshir: () => {
      const r = choralarniHisobla(
        xonadon({
          ishsizlar: [ishsiz({ id: 'a', fish: 'Биринчи' }), ishsiz({ id: 'b', fish: 'Иккинчи' })],
        })
      );
      return bor(r, 'Биринчи') && bor(r, 'Иккинчи') && r.length === 2;
    },
  },

  /* ── КАСБ-ҲУНАР ── */
  {
    nomi: 'Касб истаги — касб-ҳунар марказига топшириқ',
    tekshir: () => {
      const r = choralarniHisobla(
        xonadon({
          ishsizlar: [ishsiz({ kasbHunarEhtiyoji: true, organmoqchiKasb: 'Payvandchi' })],
        })
      );
      return bor(r, 'Payvandchi') && masul(r, 'Payvandchi') === 'Kasb-hunar markazi';
    },
  },
  {
    nomi: 'Истаги бор-у касби ёзилмаган — қўшимча топшириқ йўқ',
    tekshir: () => {
      const r = choralarniHisobla(
        xonadon({ ishsizlar: [ishsiz({ kasbHunarEhtiyoji: true, organmoqchiKasb: '' })] })
      );
      /* Фақат суҳбат топшириғи қолади */
      return r.length === 1 && bor(r, 'суҳбат');
    },
  },

  /* ── IT-ШАҲАРЧА ── */
  {
    nomi: 'IT касби — ваучер топшириғи, касб курси эмас',
    tekshir: () => {
      const r = choralarniHisobla(
        xonadon({
          ishsizlar: [ishsiz({ kasbHunarEhtiyoji: true, organmoqchiKasb: 'Dasturchi' })],
        })
      );
      return bor(r, 'ваучер') && !bor(r, 'касбини ўрганиш истаги');
    },
  },
  {
    nomi: 'Эркин ёзилган IT касби ҳам ваучер занжирини очади',
    tekshir: () =>
      bor(
        choralarniHisobla(
          xonadon({
            ishsizlar: [ishsiz({ kasbHunarEhtiyoji: true, organmoqchiKasb: 'дастурлаш' })],
          })
        ),
        'ваучер'
      ),
  },
  {
    nomi: 'Ваучер белгиланган бўлса, касби ёзилмаса ҳам топшириқ чиқади',
    tekshir: () =>
      bor(
        choralarniHisobla(
          xonadon({
            ishsizlar: [
              ishsiz({ kasbHunarEhtiyoji: true, organmoqchiKasb: '', itShaharchaVaucheri: true }),
            ],
          })
        ),
        'ваучер'
      ),
  },

  /* ── МОЛИЯ ── */
  {
    nomi: 'Кредит сўралса — банкка топшириқ',
    tekshir: () => {
      const r = choralarniHisobla(
        xonadon({ moliyaEhtiyoji: true, talabQilinganMablag: 50_000_000n })
      );
      return bor(r, 'кредит-субсидия') && masul(r, 'кредит') === 'Bank';
    },
  },
  {
    nomi: 'Эҳтиёж бор-у миқдор нол — топшириқ йўқ',
    tekshir: () =>
      choralarniHisobla(xonadon({ moliyaEhtiyoji: true, talabQilinganMablag: 0n })).length === 0,
  },

  /* ── ТАЪЛИМ ── */
  {
    nomi: 'Бола мактабга бормаса — халқ таълимига топшириқ',
    tekshir: () => {
      const r = choralarniHisobla(xonadon({ maktabYoshdagi: 3, maktabQamrovda: 1 }));
      return bor(r, 'таълим билан қамраб олинмаган') && masul(r, 'таълим') === 'Xalq ta’limi';
    },
  },
  {
    nomi: 'Ҳамма бола мактабда — топшириқ йўқ',
    tekshir: () =>
      choralarniHisobla(xonadon({ maktabYoshdagi: 3, maktabQamrovda: 3 })).length === 0,
  },

  /* ── СОҒЛИҚ ВА ИЖТИМОИЙ ҲИМОЯ ── */
  {
    nomi: 'Узоқ даволаниш — соғлиқни сақлашга',
    tekshir: () =>
      masul(choralarniHisobla(xonadon({ uzoqDavolanish: true })), 'даволаниш') ===
      'Sog‘liqni saqlash',
  },
  {
    nomi: 'Ногиронлик — ижтимоий ҳимояга',
    tekshir: () =>
      masul(choralarniHisobla(xonadon({ nogironlikBor: true })), 'ногиронлиги') ===
      'Ijtimoiy himoya',
  },

  /* ── ҲАР ТОПШИРИҚДА МУДДАТ ВА МАСЪУЛ БОР ── */
  {
    nomi: 'Ҳар топшириқда муддат КЕЛАЖАКДА ва масъул тўлдирилган',
    tekshir: () => {
      const r = choralarniHisobla(
        xonadon({
          moliyaEhtiyoji: true,
          talabQilinganMablag: 10_000_000n,
          maktabYoshdagi: 2,
          maktabQamrovda: 0,
          uzoqDavolanish: true,
          nogironlikBor: true,
          ishsizlar: [ishsiz({ kasbHunarEhtiyoji: true, organmoqchiKasb: 'Oshpaz' })],
        })
      );
      const hozir = Date.now();
      return (
        r.length === 6 &&
        r.every((t) => t.muddat.getTime() > hozir) &&
        r.every((t) => t.masulTashkilot.length > 0) &&
        r.every((t) => t.yechim.length > 10)
      );
    },
  },
  {
    nomi: 'Муаммо матнлари такрорланмайди — такрор аниқлаш шунга таянади',
    tekshir: () => {
      const r = choralarniHisobla(
        xonadon({
          moliyaEhtiyoji: true,
          talabQilinganMablag: 10_000_000n,
          uzoqDavolanish: true,
          ishsizlar: [
            ishsiz({ id: 'a', fish: 'Биринчи', kasbHunarEhtiyoji: true, organmoqchiKasb: 'Oshpaz' }),
            ishsiz({ id: 'b', fish: 'Иккинчи' }),
          ],
        })
      );
      return new Set(r.map((t) => t.muammo)).size === r.length;
    },
  },

  /* ── ТАКРОР ЯРАТИЛМАСЛИГИ ── */
  {
    nomi: 'Базада ҳеч нарса йўқ — ҳаммаси янги',
    tekshir: async () => {
      const m = xonadon({ uzoqDavolanish: true, ishsizlar: [ishsiz()] });
      return (await yangiChoralar(soxtaBaza([]), m)).length === 2;
    },
  },
  {
    nomi: 'Бор топшириқ ИККИНЧИ марта яратилмайди',
    tekshir: async () => {
      const m = xonadon({ uzoqDavolanish: true, ishsizlar: [ishsiz()] });
      const hammasi = choralarniHisobla(m);
      const qolgan = await yangiChoralar(soxtaBaza(hammasi.map((t) => t.muammo)), m);
      return qolgan.length === 0;
    },
  },
  {
    nomi: 'Ярми бор бўлса — фақат етишмагани қайтади',
    tekshir: async () => {
      const m = xonadon({ uzoqDavolanish: true, ishsizlar: [ishsiz()] });
      const hammasi = choralarniHisobla(m);
      const qolgan = await yangiChoralar(soxtaBaza([hammasi[0].muammo]), m);
      return qolgan.length === 1 && qolgan[0].muammo === hammasi[1].muammo;
    },
  },
  {
    nomi: 'Муаммосиз хонадонда база умуман сўралмайди',
    tekshir: async () => {
      let sorandi = false;
      const baza = {
        actionPlan: {
          findMany: async () => {
            sorandi = true;
            return [];
          },
        },
      } as unknown as Tranzaksiya;
      const natija = await yangiChoralar(baza, xonadon());
      return natija.length === 0 && !sorandi;
    },
  },
];

async function yurgiz() {
  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      ok = false;
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  process.exit(xato ? 1 : 0);
}

yurgiz();
