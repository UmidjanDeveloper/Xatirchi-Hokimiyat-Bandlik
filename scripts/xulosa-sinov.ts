/**
 * ============================================================
 *  ХОНАДОН ХУЛОСАСИ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/xulosa-sinov.ts
 *
 *  Икки нарсани текширади:
 *
 *  1. МАХФИЙЛИК. AI га юбориладиган далилномада исм, манзил,
 *     телефон ва ходим ёзган эркин матн БЎЛМАСЛИГИ керак. Бу
 *     синов энг муҳими: хато содир бўлса, у экранда кўринмайди —
 *     маълумот жимгина ташқарига чиқиб кетади.
 *
 *  2. ҚОИДАЛАР. Калит бўлмаганда ҳам тавсия чиқиши ва у
 *     анкетадаги ҳақиқий ҳолатга мос келиши керак.
 * ============================================================
 */
import { dalilnomaYasa, javobniTekshir, qoidaTavsiyalari } from '../src/lib/xonadon-xulosa';
import type { XonadonDalili } from '../src/lib/xonadon-xulosa';

const ASOS: XonadonDalili = {
  jamiAzo: 6,
  bolalarSoni: 3,
  mehnatgaLayoqatli: 3,
  ishlaydiganlar: 1,
  ishsizlarSoni: 2,
  bogchaKutayotganAyollar: 0,
  ishsizlikMuddatiOy: 4,
  kasbHunarIstagi: false,
  kasbHunarYonalishi: [],
  tadbirkorlikIstagi: false,
  tadbirkorlikSohasi: [],
  moliyaEhtiyoji: false,
  moliyaTuri: [],
  talabQilinganMablag: null,
  mablagYonalishi: [],
  oylikDaromad: BigInt(6_000_000),
  chetElMehnati: false,
  chetElIshchilar: 0,
  chetElDavlatlari: [],
  chetElBoshqaDavlat: null,
  chetElOylikPul: null,
  daromadManbalari: ['Ish haqi'],
  kambagallikSabablari: [],
  maktabgachaYoshdagi: 1,
  maktabgachaQamrovda: 1,
  maktabYoshdagi: 2,
  maktabQamrovda: 2,
  togarakQamrovi: 1,
  uzoqDavolanish: false,
  uyHolati: null,
  ichimlikSuvi: null,
  sugorishSuvi: false,
  elektr: true,
  gaz: true,
  gazTuri: 'Tabiiy gaz',
  kanalizatsiya: true,
  nogironlikBor: false,
  yolgizKeksa: false,
  parvarishgaMuhtoj: false,
  hujjatlarToliq: true,
  tomorqaBor: false,
  ekinMaydoni: null,
  chorvaBor: false,
  chorvaTurlari: [],
  hunarmandBor: false,
  hunarTurlari: [],
  zarurKomak: [],
  issiqxonaTalabi: false,
  ijaraYer: false,
  ishsizlar: [],
};

const x = (qism: Partial<XonadonDalili>): XonadonDalili => ({ ...ASOS, ...qism });
const bor = (d: XonadonDalili, sarlavha: string) =>
  qoidaTavsiyalari(d).some((t) => t.sarlavha === sarlavha);

type Sinov = { nomi: string; tekshir: () => boolean };

const SINOVLAR: Sinov[] = [
  /* ── Махфийлик ── */
  {
    nomi: 'Далилномада касб номи бор — тавсия учун зарур',
    tekshir: () =>
      dalilnomaYasa(
        x({
          ishsizlar: [
            {
              jinsi: 'Erkak',
              yoshi: 30,
              malumoti: 'Oliy',
              mutaxassisligi: 'Payvandchi',
              xohlaganIsh: null,
              organmoqchiKasb: null,
              holati: 'ANIQLANDI',
              nogironlik: false,
            },
          ],
        })
      ).includes('Payvandchi'),
  },
  {
    nomi: 'Касб майдонига ёзилган телефон рақами олиб ташланади',
    tekshir: () => {
      const matn = dalilnomaYasa(
        x({
          ishsizlar: [
            {
              jinsi: 'Erkak',
              yoshi: 30,
              malumoti: 'Oliy',
              mutaxassisligi: 'Payvandchi 998901234567',
              xohlaganIsh: null,
              organmoqchiKasb: null,
              holati: 'ANIQLANDI',
              nogironlik: false,
            },
          ],
        })
      );
      return !matn.includes('998901234567') && !/\d{7,}/.test(matn);
    },
  },
  {
    nomi: 'Далилномада фақат керакли бўлимлар бор (эркин матн майдони йўқ)',
    tekshir: () => {
      const matn = dalilnomaYasa(ASOS);
      // Анкетадаги эркин матн майдонлари номи ҳам, қиймати ҳам
      // бу ерга тушмаслиги керак
      const taqiqlangan = [
        'изоҳ',
        'Изоҳ',
        'умумий хулоса',
        'Умумий хулоса',
        'манзил',
        'Манзил',
        'телефон',
        'Телефон',
        'Ф.И.Ш',
        'оила бошлиғи',
        'Оила бошлиғи',
      ];
      return taqiqlangan.every((t) => !matn.includes(t));
    },
  },
  {
    nomi: 'Далилнома узун эмас (модел муҳим рақамни йўқотмайди)',
    tekshir: () => dalilnomaYasa(ASOS).length < 3000,
  },

  /* ── Қоидалар ── */
  {
    nomi: 'Ҳужжатсиз оила — шошилинч',
    tekshir: () => {
      const t = qoidaTavsiyalari(x({ hujjatlarToliq: false }));
      return t[0]?.daraja === 'shoshilinch' && t[0].sarlavha.includes('Ҳужжатлар');
    },
  },
  {
    nomi: 'Мактабга бормаётган бола аниқланади',
    tekshir: () => bor(x({ maktabYoshdagi: 3, maktabQamrovda: 1 }), 'Мактаб ёшидаги бола мактабда эмас'),
  },
  {
    nomi: 'Барча болалар мактабда бўлса — тавсия чиқмайди',
    tekshir: () => !bor(x({ maktabYoshdagi: 3, maktabQamrovda: 3 }), 'Мактаб ёшидаги бола мактабда эмас'),
  },
  {
    nomi: 'Жон бошига даромад чегарадан паст — шошилинч',
    tekshir: () =>
      bor(x({ oylikDaromad: BigInt(2_000_000), jamiAzo: 6 }), 'Даромад энг кам истеъмол харажатидан паст'),
  },
  {
    nomi: 'Даромад етарли бўлса — тавсия чиқмайди',
    tekshir: () =>
      !bor(x({ oylikDaromad: BigInt(9_000_000), jamiAzo: 3 }), 'Даромад энг кам истеъмол харажатидан паст'),
  },
  {
    nomi: 'Даромад кўрсатилмаса — қоида ишламайди, хато ҳам бермайди',
    tekshir: () => {
      const t = qoidaTavsiyalari(x({ oylikDaromad: null }));
      return !t.some((y) => y.sarlavha.includes('истеъмол'));
    },
  },
  {
    nomi: 'Узоқ ишсизлик (12 ойдан ортиқ) аниқланади',
    tekshir: () => bor(x({ ishsizlikMuddatiOy: 18 }), 'Узоқ муддатли ишсизлик'),
  },
  {
    nomi: 'Суҳбат ўтказилмаган ишсиз аниқланади',
    tekshir: () =>
      bor(
        x({
          ishsizlar: [
            {
              jinsi: 'Erkak',
              yoshi: 25,
              malumoti: null,
              mutaxassisligi: null,
              xohlaganIsh: null,
              organmoqchiKasb: null,
              holati: 'ANIQLANDI',
              nogironlik: false,
            },
          ],
        }),
        'Ишсиз билан ҳали суҳбат бўлмаган'
      ),
  },
  {
    nomi: 'Боғчасиз бола ва ишлашга тайёр аёл БИТТА тавсияда боғланади',
    tekshir: () => {
      const t = qoidaTavsiyalari(
        x({ maktabgachaYoshdagi: 2, maktabgachaQamrovda: 0, bogchaKutayotganAyollar: 1 })
      ).find((y) => y.sarlavha.includes('Боғча қамровидан'));
      return !!t && t.dalil.includes('ИККИ масалани');
    },
  },
  {
    nomi: 'МАРКАЗЛАШГАН суви бор оилага сув тавсияси ЧИҚМАЙДИ',
    tekshir: () =>
      !qoidaTavsiyalari(x({ ichimlikSuvi: 'Markazlashgan' })).some((y) =>
        y.sarlavha.includes('Ичимлик суви')
      ),
  },
  {
    nomi: 'Қудуқдан фойдаланадиган оилага «муҳим» тавсия чиқади',
    tekshir: () => {
      const y = qoidaTavsiyalari(x({ ichimlikSuvi: 'Quduq' })).find((q) =>
        q.sarlavha.includes('Ичимлик суви')
      );
      return y?.daraja === 'muhim';
    },
  },
  {
    nomi: 'Суви умуман йўқ оилага «шошилинч» тавсия чиқади',
    tekshir: () => {
      const y = qoidaTavsiyalari(x({ ichimlikSuvi: "Yo'q" })).find((q) =>
        q.sarlavha.includes('Ичимлик суви')
      );
      return y?.daraja === 'shoshilinch';
    },
  },
  {
    nomi: 'Ҳунарманд — имконият сифатида кўрсатилади',
    tekshir: () => {
      const t = qoidaTavsiyalari(x({ hunarmandBor: true, hunarTurlari: ['Tikuvchilik'] }));
      const h = t.find((y) => y.sarlavha === 'Оилада ҳунарманд бор');
      return h?.daraja === 'imkoniyat';
    },
  },
  {
    nomi: 'Ер бор, чорва йўқ — имконият',
    tekshir: () => bor(x({ tomorqaBor: true, chorvaBor: false }), 'Чорва йўқ, ер бор'),
  },
  {
    nomi: 'Тартиб: шошилинч → муҳим → имконият',
    tekshir: () => {
      const t = qoidaTavsiyalari(
        x({
          hujjatlarToliq: false,
          gaz: false,
          hunarmandBor: true,
          oylikDaromad: BigInt(1_000_000),
        })
      );
      const tartib = { shoshilinch: 0, muhim: 1, imkoniyat: 2 } as const;
      return t.every((y, i) => i === 0 || tartib[t[i - 1].daraja] <= tartib[y.daraja]);
    },
  },
  {
    nomi: 'Муаммосиз оилада ҳам ҳисоб ишдан чиқмайди',
    tekshir: () => Array.isArray(qoidaTavsiyalari(ASOS)),
  },
];

/* ── Моделнинг жавобини текшириш ────────────────────────────
   Модел жавоби ИШОНЧСИЗ манба. Бу синовлар унга қандай
   ишонмаслик кераклигини қайд этади.                          */

const YAXSHI = JSON.stringify({
  holat: 'Оила оғир аҳволда.',
  tavsiyalar: [{ daraja: 'shoshilinch', sarlavha: 'Ҳужжат', dalil: 'Расмийлаштириш керак.' }],
});

/* ── Чет элдаги меҳнат ── */
SINOVLAR.push(
  {
    nomi: 'Чет элда ишловчи аъзо — тавсия чиқади',
    tekshir: () =>
      bor(
        x({ chetElMehnati: true, chetElIshchilar: 2, chetElDavlatlari: ['Rossiya'] }),
        'Оила аъзоси чет элда ишлайди'
      ),
  },
  {
    nomi: 'Чет элда ишловчи йўқ — тавсия чиқмайди',
    tekshir: () => !bor(x({}), 'Оила аъзоси чет элда ишлайди'),
  },
  {
    nomi: '«Бошқа давлат» тавсияда каталог сўзи эмас, ходим ёзган ном билан чиқади',
    tekshir: () => {
      const t = qoidaTavsiyalari(
        x({
          chetElMehnati: true,
          chetElIshchilar: 1,
          chetElDavlatlari: ['Boshqa'],
          chetElBoshqaDavlat: 'Хитой',
        })
      ).find((y) => y.sarlavha === 'Оила аъзоси чет элда ишлайди');
      return !!t && t.dalil.includes('Хитой') && !t.dalil.includes('Бошқа давлат');
    },
  },
  {
    /*
     * Энг муҳим синов: чет элдан келадиган пул жон бошига
     * даромадга ҚЎШИЛАДИ. Бу қўшилмаса, ойига 9 млн олаётган
     * оила «темир дафтар»га тавсия қилинарди.
     */
    nomi: 'Чет элдан келадиган пул жон бошига даромадга қўшилади',
    tekshir: () =>
      !bor(
        x({
          jamiAzo: 4,
          oylikDaromad: BigInt(1_000_000),
          chetElMehnati: true,
          chetElIshchilar: 1,
          chetElOylikPul: BigInt(9_000_000),
        }),
        'Даромад энг кам истеъмол харажатидан паст'
      ),
  },
  {
    nomi: 'Чет эл пули бўлмаса, паст даромад тавсияси барибир чиқади',
    tekshir: () =>
      bor(
        x({ jamiAzo: 4, oylikDaromad: BigInt(1_000_000) }),
        'Даромад энг кам истеъмол харажатидан паст'
      ),
  },
  {
    nomi: 'Паст даромад тавсиясида икки манба алоҳида кўрсатилади',
    tekshir: () => {
      const t = qoidaTavsiyalari(
        x({
          jamiAzo: 10,
          oylikDaromad: BigInt(1_000_000),
          chetElMehnati: true,
          chetElIshchilar: 1,
          chetElOylikPul: BigInt(2_000_000),
        })
      ).find((y) => y.sarlavha === 'Даромад энг кам истеъмол харажатидан паст');
      return !!t && t.dalil.includes('чет элдан');
    },
  },
  {
    nomi: 'Далилномада чет эл пули ва жами даромад кўрсатилади',
    tekshir: () => {
      const m = dalilnomaYasa(
        x({
          jamiAzo: 4,
          oylikDaromad: BigInt(1_000_000),
          chetElMehnati: true,
          chetElIshchilar: 1,
          chetElDavlatlari: ['Janubiy Koreya'],
          chetElOylikPul: BigInt(9_000_000),
        })
      );
      return (
        m.includes('Чет элдан ойига келадиган пул') &&
        m.includes('Жами ойлик даромад') &&
        m.includes('Жанубий Корея')
      );
    },
  },
  {
    nomi: 'Чет элда ишламайдиган оила далилномасида бу бўлим йўқ',
    tekshir: () => !dalilnomaYasa(x({})).includes('Чет элдаги меҳнат'),
  },
  {
    /*
     * «Даромад кўрсатилмаган, лекин чет элдан пул келади» —
     * илгари бу ҳолат УМУМАН текширилмасди, чунки шарт
     * `oylikDaromad != null` эди.
     */
    nomi: 'Маҳаллий даромад кўрсатилмаса ҳам, чет эл пули бўйича ҳисоб юритилади',
    tekshir: () =>
      bor(
        x({
          jamiAzo: 8,
          oylikDaromad: null,
          chetElMehnati: true,
          chetElIshchilar: 1,
          chetElOylikPul: BigInt(2_000_000),
        }),
        'Даромад энг кам истеъмол харажатидан паст'
      ),
  }
);

SINOVLAR.push(
  { nomi: 'Тўғри JSON қабул қилинади', tekshir: () => javobniTekshir(YAXSHI) !== null },
  {
    nomi: '```json блокига ўралган жавоб ҳам ўқилади',
    tekshir: () => javobniTekshir('```json\n' + YAXSHI + '\n```') !== null,
  },
  { nomi: 'JSON бўлмаган матн рад этилади', tekshir: () => javobniTekshir('Салом, мана хулоса...') === null },
  {
    nomi: '«holat» йўқ бўлса рад этилади',
    tekshir: () => javobniTekshir(JSON.stringify({ tavsiyalar: [] })) === null,
  },
  {
    nomi: 'Бўш тавсия рўйхати рад этилади',
    tekshir: () => javobniTekshir(JSON.stringify({ holat: 'матн', tavsiyalar: [] })) === null,
  },
  {
    nomi: 'Нотўғри «daraja» «муҳим» га тушади, банд ташланмайди',
    tekshir: () => {
      const d = javobniTekshir(
        JSON.stringify({
          holat: 'матн',
          tavsiyalar: [{ daraja: 'juda-shoshilinch', sarlavha: 'С', dalil: 'Д' }],
        })
      );
      return d?.tavsiyalar[0].daraja === 'muhim';
    },
  },
  {
    nomi: 'Нотўғри банд ташланади, тўғриси қолади',
    tekshir: () => {
      const d = javobniTekshir(
        JSON.stringify({
          holat: 'матн',
          tavsiyalar: [
            { daraja: 'muhim', sarlavha: 123, dalil: 'Д' },
            null,
            'satr',
            { daraja: 'muhim', sarlavha: 'Тўғри', dalil: 'Д' },
          ],
        })
      );
      return d?.tavsiyalar.length === 1 && d.tavsiyalar[0].sarlavha === 'Тўғри';
    },
  },
  {
    nomi: 'Жуда узун матн қирқилади',
    tekshir: () => {
      const d = javobniTekshir(
        JSON.stringify({
          holat: 'а'.repeat(5000),
          tavsiyalar: [{ daraja: 'muhim', sarlavha: 'б'.repeat(300), dalil: 'в'.repeat(2000) }],
        })
      );
      return (
        !!d && d.holat.length <= 900 && d.tavsiyalar[0].sarlavha.length <= 90 && d.tavsiyalar[0].dalil.length <= 400
      );
    },
  },
  {
    nomi: 'КИРИЛЛСИЗ жавоб рад этилади (очиқ моделлар учун муҳим)',
    tekshir: () =>
      javobniTekshir(
        JSON.stringify({
          holat: 'The family is in a difficult situation.',
          tavsiyalar: [{ daraja: 'muhim', sarlavha: 'Documents', dalil: 'Fix them.' }],
        })
      ) === null,
  },
  {
    nomi: 'Лотин ўзбекча жавоб ҳам рад этилади',
    tekshir: () =>
      javobniTekshir(
        JSON.stringify({
          holat: 'Oila ogʻir ahvolda, hujjatlari toʻliq emas.',
          tavsiyalar: [{ daraja: 'muhim', sarlavha: 'Hujjat', dalil: 'Rasmiylashtirish kerak.' }],
        })
      ) === null,
  },
  {
    nomi: 'Тавсиялар шошилинчдан бошлаб тартибланади',
    tekshir: () => {
      const d = javobniTekshir(
        JSON.stringify({
          holat: 'матн',
          tavsiyalar: [
            { daraja: 'imkoniyat', sarlavha: 'И', dalil: 'Д' },
            { daraja: 'shoshilinch', sarlavha: 'Ш', dalil: 'Д' },
            { daraja: 'muhim', sarlavha: 'М', dalil: 'Д' },
          ],
        })
      );
      return d?.tavsiyalar.map((t) => t.daraja).join(',') === 'shoshilinch,muhim,imkoniyat';
    },
  }
);

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
