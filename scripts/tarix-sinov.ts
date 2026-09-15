/**
 * ============================================================
 *  ХОНАДОН ТАРИХИ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/tarix-sinov.ts
 *
 *  Фаровонлик кўрсаткичи ҚАРОРГА таъсир қилади: ҳоким уни
 *  кўриб «шу оилага чора керак» дейди. Шунинг учун ҳисоб
 *  хатоси жуда қиммат — ва у КЎРИНМАЙДИ: балл барибир
 *  чиқади, фақат нотўғри.
 *
 *  Айниқса хавфли жой — каталог калитлари. `UY_HOLATI` га
 *  янги қиймат қўшилиб, балл жадвалига қўшилмаса, ўша уйдаги
 *  оила нол балл олади ва сабабсиз «камбағаллашган» бўлиб
 *  кўринади.
 * ============================================================
 */
import { ICHIMLIK_SUVI, UY_HOLATI, qiymatlar } from '../src/lib/constants';
import {
  DAROMAD_MOLJALI,
  farovonlikHisobi,
  kesmaYasa,
  taqqosla,
  type KesmaManbai,
} from '../src/lib/xonadon-tarixi';

const ASOS: KesmaManbai = {
  id: 'x1',
  mahallaId: 'm1',
  jamiAzo: 5,
  bolalarSoni: 2,
  mehnatgaLayoqatli: 3,
  ishlaydiganlar: 0,
  ishsizlarSoni: 3,
  oylikDaromad: null,
  chetElOylikPulSom: null,
  yirikShoxliSoni: null,
  maydaShoxliSoni: null,
  parrandaSoni: null,
  tomorqaMaydoni: null,
  gaz: false,
  ichimlikSuvi: null,
  uyHolati: null,
  tadbirkorlikIstagi: false,
  kasbHunarIstagi: false,
  nogironShaxslar: null,
};

const x = (q: Partial<KesmaManbai>): KesmaManbai => ({ ...ASOS, ...q });
const ball = (q: Partial<KesmaManbai>) => farovonlikHisobi(x(q)).ball;

type Sinov = { nomi: string; tekshir: () => boolean };

const SINOVLAR: Sinov[] = [
  /* ── Чегаралар ── */
  {
    nomi: 'Энг ёмон ҳолатда нол балл',
    tekshir: () => ball({}) === 0,
  },
  {
    nomi: 'Энг яхши ҳолатда 100 балл',
    tekshir: () =>
      ball({
        mehnatgaLayoqatli: 3,
        ishlaydiganlar: 3,
        oylikDaromad: BigInt(DAROMAD_MOLJALI * 5),
        yirikShoxliSoni: 5,
        gaz: true,
        ichimlikSuvi: 'Markazlashgan',
        uyHolati: 'Yaxshi',
      }) === 100,
  },
  {
    nomi: 'Балл ҳеч қачон 0 дан паст ёки 100 дан юқори бўлмайди',
    tekshir: () =>
      ball({ oylikDaromad: BigInt(999_999_999), yirikShoxliSoni: 1000 }) <= 100 && ball({}) >= 0,
  },

  /* ── Каталог калитлари ── */
  {
    /*
     * Энг муҳим синов. Каталогга янги қиймат қўшилиб, балл
     * жадвалига қўшилмаса, ўша уйдаги оила НОЛ балл олади ва
     * сабабсиз камбағаллашган бўлиб кўринади.
     */
    nomi: 'Каталогдаги ҲАР уй ҳолати балл жадвалида бор',
    tekshir: () => {
      const eng = ball({ uyHolati: 'Yaxshi' });
      return (qiymatlar(UY_HOLATI) as string[]).every((u) => {
        const b = ball({ uyHolati: u });
        /* «Yaroqsiz» нол балл олади — бу ТЎҒРИ, лекин у энг ёмони бўлиши керак */
        return u === 'Yaroqsiz' ? b === 0 : b > 0 && b <= eng;
      });
    },
  },
  {
    nomi: 'Каталогдаги ҲАР сув манбаи балл жадвалида бор',
    tekshir: () => {
      const eng = ball({ ichimlikSuvi: 'Markazlashgan' });
      return (qiymatlar(ICHIMLIK_SUVI) as string[]).every((s) => {
        const b = ball({ ichimlikSuvi: s });
        return s === "Yo'q" ? b === 0 : b > 0 && b <= eng;
      });
    },
  },
  {
    nomi: 'Яхши уй ёмонидан кўп балл беради',
    tekshir: () => ball({ uyHolati: 'Yaxshi' }) > ball({ uyHolati: 'Ta’mirtalab' }),
  },

  /* ── Мантиқ ── */
  {
    nomi: 'Ишга жойлашиш баллни оширади',
    tekshir: () =>
      ball({ mehnatgaLayoqatli: 3, ishlaydiganlar: 2 }) >
      ball({ mehnatgaLayoqatli: 3, ishlaydiganlar: 0 }),
  },
  {
    nomi: 'Даромад ошса балл ошади',
    tekshir: () => ball({ oylikDaromad: BigInt(3_000_000) }) > ball({ oylikDaromad: BigInt(500_000) }),
  },
  {
    /*
     * Кўрсаткич камбағалликдан чиқишни ўлчайди, бойликни эмас.
     * Чегарадан юқорисига қўшимча балл берилмайди — акс ҳолда
     * бир нечта бой оила бутун маҳалла ўртачасини кўтариб
     * юборарди.
     */
    nomi: 'Чегарадан юқори даромад қўшимча балл бермайди',
    tekshir: () =>
      ball({ jamiAzo: 1, oylikDaromad: BigInt(DAROMAD_MOLJALI * 10) }) ===
      ball({ jamiAzo: 1, oylikDaromad: BigInt(DAROMAD_MOLJALI) }),
  },
  {
    /*
     * Оила катталашса, ЎША даромад жон бошига камроқ тушади.
     * Бунисиз «бола туғилди — камбағаллашди» ҳолати
     * кўринмасдан қоларди.
     */
    nomi: 'Оила катталашса, жон бошига даромад тушади',
    tekshir: () =>
      ball({ jamiAzo: 3, oylikDaromad: BigInt(3_000_000) }) >
      ball({ jamiAzo: 9, oylikDaromad: BigInt(3_000_000) }),
  },
  {
    nomi: 'Чет элдан келган пул ҳам даромадга қўшилади',
    tekshir: () =>
      ball({ chetElOylikPulSom: BigInt(2_000_000) }) > ball({ chetElOylikPulSom: null }),
  },
  {
    nomi: 'Чорва баллни оширади',
    tekshir: () => ball({ yirikShoxliSoni: 2 }) > ball({ yirikShoxliSoni: 0 }),
  },
  {
    nomi: 'Меҳнатга лаёқатли йўқ бўлса нолга бўлинмайди',
    tekshir: () => Number.isFinite(ball({ mehnatgaLayoqatli: 0, ishlaydiganlar: 0 })),
  },
  {
    nomi: 'Оила аъзоси нол бўлса нолга бўлинмайди',
    tekshir: () => Number.isFinite(ball({ jamiAzo: 0, oylikDaromad: BigInt(1_000_000) })),
  },

  /* ── Бўлаклар ── */
  {
    nomi: 'Бўлаклар йиғиндиси умумий баллга тенг',
    tekshir: () => {
      const n = farovonlikHisobi(
        x({ mehnatgaLayoqatli: 4, ishlaydiganlar: 2, oylikDaromad: BigInt(2_000_000), gaz: true })
      );
      return n.bolaklar.reduce((s, b) => s + b.ball, 0) === n.ball;
    },
  },
  {
    nomi: 'Бўлакларнинг энг юқори йиғиндиси 100',
    tekshir: () => farovonlikHisobi(ASOS).bolaklar.reduce((s, b) => s + b.eng, 0) === 100,
  },
  {
    nomi: 'Ҳар бўлакда изоҳ бор — «нега 40?» деган саволга жавоб',
    tekshir: () => farovonlikHisobi(ASOS).bolaklar.every((b) => b.izoh.length > 0),
  },

  /* ── Кесма ── */
  {
    nomi: 'Жон бошига даромад кесмада АЛОҲИДА сақланади',
    tekshir: () => {
      const k = kesmaYasa(x({ jamiAzo: 4, oylikDaromad: BigInt(4_000_000) }), {}, 'ILK_XATLOV');
      return k.jonBoshigaDaromad === BigInt(1_000_000);
    },
  },
  {
    nomi: 'Чет эл пули ҳам жон бошига даромадга киради',
    tekshir: () => {
      const k = kesmaYasa(
        x({ jamiAzo: 2, oylikDaromad: BigInt(1_000_000), chetElOylikPulSom: BigInt(3_000_000) }),
        {},
        'ILK_XATLOV'
      );
      return k.jonBoshigaDaromad === BigInt(2_000_000);
    },
  },
  {
    nomi: 'Ногиронлар сони JSON рўйхатдан саналади',
    tekshir: () => {
      const k = kesmaYasa(
        x({ nogironShaxslar: [{ fish: 'A' }, { fish: 'B' }] as never }),
        {},
        'ILK_XATLOV'
      );
      return k.nogironSoni === 2;
    },
  },
  {
    nomi: 'Ногирон рўйхати бўш бўлса нол',
    tekshir: () => kesmaYasa(ASOS, {}, 'ILK_XATLOV').nogironSoni === 0,
  },

  /* ── Таққослаш ── */
  {
    /*
     * Ишсизлар сони ОШСА — бу ёмон, ишлаётганлар ошса — яхши.
     * Фарқи белгиланмаса, иккови ҳам яшил бўлиб чиқарди.
     */
    nomi: 'Ишсизлар кўпайиши «яхши» деб белгиланмайди',
    tekshir: () => {
      const a = { ...kesmaYasa(ASOS, {}, 'ILK_XATLOV'), id: 'k1', olinganSana: new Date() } as never;
      const h = {
        ...kesmaYasa(x({ ishsizlarSoni: 5 }), {}, 'QAYTA_XATLOV'),
        id: 'k2',
        olinganSana: new Date(),
      } as never;
      const o = taqqosla(a, h).find((z) => z.nomi === 'Ишсизлар');
      return o !== undefined && o.kopYaxshi === false && o.farq === 2;
    },
  },
  {
    nomi: 'Ўзгармаган кўрсаткич таққослашга тушмайди',
    tekshir: () => {
      const a = { ...kesmaYasa(ASOS, {}, 'ILK_XATLOV'), id: 'k1', olinganSana: new Date() } as never;
      const h = { ...kesmaYasa(ASOS, {}, 'QAYTA_XATLOV'), id: 'k2', olinganSana: new Date() } as never;
      const r = taqqosla(a, h);
      /* Фаровонлик кўрсаткичи ўзгармаса ҳам қолади — у асосий рақам */
      return r.length === 1 && r[0].nomi === 'Фаровонлик кўрсаткичи';
    },
  },

  /* ── Базадаги ЭСКИ ёзувлар ── */
  {
    /*
     * Базада каталог ўзгармасдан олдин ёзилган қийматлар бор:
     * 33 хонадоннинг 32 тасида учради. Улар танилмаса, оила
     * ЖИМГИНА нол балл олади — ва бу кўринмайди.
     */
    nomi: 'Эски уй ҳолати ёзувлари ҳам танилади',
    tekshir: () =>
      ["Ta'mir talab", 'Avariya holatida', 'Qoniqarli'].every(
        (u) => !farovonlikHisobi(x({ uyHolati: u })).bolaklar[3].izoh.includes('каталогда йўқ')
      ),
  },
  {
    nomi: 'Эски сув манбаи ёзувлари ҳам танилади',
    tekshir: () =>
      ['Markazlashgan quvur', 'Tashib keltiriladi', 'Hovlidagi quduq'].every(
        (v) => !farovonlikHisobi(x({ ichimlikSuvi: v })).bolaklar[3].izoh.includes('каталогда йўқ')
      ),
  },
  {
    nomi: '«Markazlashgan quvur» тўлиқ балл олади',
    tekshir: () => ball({ ichimlikSuvi: 'Markazlashgan quvur' }) === ball({ ichimlikSuvi: 'Markazlashgan' }),
  },
  {
    nomi: '«Avariya holatida» энг паст — «Yaxshi» дан кам',
    tekshir: () => ball({ uyHolati: 'Avariya holatida' }) < ball({ uyHolati: 'Yaxshi' }),
  },
  {
    /*
     * Умуман нотаниш қиймат нол балл олади — бу тўғри. Аммо у
     * ЖИМГИНА бўлмаслиги керак: изоҳда «каталогда йўқ» деб
     * ёзилади, акс ҳолда ходим «нега бу оила паст?» деганда
     * жавоб топа олмасди.
     */
    nomi: 'Нотаниш қиймат ЖИМГИНА нол олмайди — изоҳда айтилади',
    tekshir: () =>
      farovonlikHisobi(x({ uyHolati: 'Мутлақо нотаниш қиймат' })).bolaklar[3].izoh.includes(
        'каталогда йўқ'
      ),
  },
  {
    nomi: 'Бўш қиймат «каталогда йўқ» деб белгиланмайди',
    tekshir: () => !farovonlikHisobi(ASOS).bolaklar[3].izoh.includes('каталогда йўқ'),
  },
];

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    ok = false;
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
