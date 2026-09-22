/**
 * ============================================================
 *  ХАТЛОВ БЎЛИМЛАРИ ТАҲЛИЛИ — СИНОВ
 *
 *  ── Нега бу синов бошқаларидан кўра кўпроқ керак ──
 *
 *  `bolimlar-tahlili.ts` Prisma моделига эмас, ХОМ SQL га
 *  таянади. Сабаби тезлик: қирқдан ортиқ кўрсаткич битта
 *  сўровда ҳисобланади. Нархи эса — тилнинг ҳимояси йўқолади.
 *
 *  TypeScript хом SQL ичидаги устун номини текширмайди.
 *  Эртага схемада `bolalar0_3Yosh` бошқача аталса, компилятор
 *  ҳеч нима демайди, тест йиқилмайди — фақат ҳокимнинг
 *  панелида «0 — 3 ёш: 0» деб турарди. Ва ҳеч ким сезмасди,
 *  чунки нол ҳам ишончли кўринади.
 *
 *  Шунинг учун биринчи синов SQL ичидаги ҲАР БИР устун номини
 *  `schema.prisma` билан солиштиради.
 *
 *  ── Иккинчи хавф: архив ──
 *
 *  Мижоздаги `$extends` қўриқчиси хом SQL га таъсир қилмайди.
 *  Агар `arxivSanasi IS NULL` шарти тушиб қолса, ўчирилган
 *  хонадон ҳокимнинг рақамига жимгина қайтиб киради.
 * ============================================================
 */

import { readFileSync } from 'node:fs';

type Sinov = { nomi: string; tekshir: () => boolean };

const LIB = readFileSync('src/lib/bolimlar-tahlili.ts', 'utf8');
const PANEL = readFileSync('src/components/panel/bolimlar-paneli.tsx', 'utf8');
const SAHIFA = readFileSync('src/app/(ilova)/panel/page.tsx', 'utf8');
const XATLOV = readFileSync('src/app/(ilova)/xatlov/page.tsx', 'utf8');
const PROFIL = readFileSync('src/lib/hisobot/xonadon-profili.ts', 'utf8');
const FORMAT = readFileSync('src/lib/hisobot/format.ts', 'utf8');
const SXEMA = readFileSync('prisma/schema.prisma', 'utf8');
const ANKETA = readFileSync('src/components/xatlov/qadamlar.tsx', 'utf8');

/** `model Household { ... }` ичидаги майдон номлари */
function modelMaydonlari(nomi: string): Set<string> {
  const boshi = SXEMA.indexOf(`model ${nomi} {`);
  if (boshi < 0) return new Set();
  const oxiri = SXEMA.indexOf('\n}', boshi);
  const tana = SXEMA.slice(boshi, oxiri);

  const maydonlar = new Set<string>();
  for (const qator of tana.split('\n')) {
    const m = qator.match(/^\s{2}([A-Za-z_][A-Za-z0-9_]*)\s+\S/);
    if (m) maydonlar.add(m[1]);
  }
  return maydonlar;
}

const XONADON_MAYDONI = modelMaydonlari('Household');

/**
 * SQL ичидаги қўштирноқли номлар.
 *
 * `AS "nom"` — бу НАТИЖА устуни, схемада бўлиши шарт эмас.
 * Қолганлари эса база устуни ва ҳар бири текширилади.
 */
function sqlUstunlari(): string[] {
  /* Фақат шаблон литераллари ичи — изоҳлардаги номлар кирмасин */
  const sqlBloklari = LIB.match(/\$queryRaw[\s\S]*?`[\s\S]*?`/g) ?? [];
  const jsonUzunlikchi = LIB.match(/Prisma\.raw\(`[\s\S]*?`\)/g) ?? [];
  const matn = [...sqlBloklari, ...jsonUzunlikchi].join('\n');

  const topilgan: string[] = [];
  const naqsh = /(AS\s+)?"([A-Za-z_][A-Za-z0-9_]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = naqsh.exec(matn)) !== null) {
    if (m[1]) continue; // AS "alias" — натижа номи
    topilgan.push(m[2]);
  }
  return [...new Set(topilgan)];
}

/* Жадвал номлари — устун эмас */
const JADVALLAR = new Set(['Household']);

const notogriUstunlar = sqlUstunlari().filter(
  (u) => !JADVALLAR.has(u) && !XONADON_MAYDONI.has(u)
);

/** Анкета шу майдонни ҲАҚИҚАТДА сўрайдими */
const anketadaBor = (maydon: string) =>
  new RegExp(`['"\`]${maydon}['"\`]|\\bh\\.${maydon}\\b`).test(ANKETA);

const SINOVLAR: Sinov[] = [
  /* ══ ХОМ SQL СХЕМАГА МОС ══ */
  {
    nomi: 'SQL даги ҳар бир устун `schema.prisma` да бор',
    tekshir: () => {
      if (notogriUstunlar.length > 0) {
        console.log(`     схемада йўқ: ${notogriUstunlar.join(', ')}`);
        return false;
      }
      return true;
    },
  },
  {
    nomi: 'Синов ҳақиқатан устун топяпти (нақш бузилмаган)',
    tekshir: () => sqlUstunlari().length > 40,
  },
  {
    nomi: 'Ҳар бир жамланган устунни анкета ҳақиқатда сўрайди',
    tekshir: () => {
      /*
       * Хатловда сўралмайдиган майдонни панелда кўрсатиш —
       * ҳокимга абадий нол кўрсатиш. Бу нотўғри маълумотдан
       * ҳам ёмон: у «муаммо йўқ» деган хулосага олиб келади.
       *
       * Техник устунлар истисно: улар кўрсатилмайди, фақат
       * фильтр ва ҳисоб учун ишлатилади.
       */
      const texnik = new Set([
        'arxivSanasi',
        'holati',
        'mahallaId',
        'chetElOylikPulSom', // `chetElOylikPul` дан ҳисобланади
        'kasbHunarIstagi', // ишсиз фуқаро анкетасидан келади
      ]);
      const yoq = sqlUstunlari().filter(
        (u) => !JADVALLAR.has(u) && !texnik.has(u) && !anketadaBor(u)
      );
      if (yoq.length > 0) {
        console.log(`     анкетада сўралмайди: ${yoq.join(', ')}`);
        return false;
      }
      return true;
    },
  },

  /* ══ АРХИВ ВА ҚОРАЛАМА ══ */
  {
    nomi: 'Ўчирилган хонадон ҳисобга кирмайди (`arxivSanasi IS NULL`)',
    tekshir: () => LIB.includes('"arxivSanasi" IS NULL'),
  },
  {
    nomi: 'Қоралама анкета ҳисобга кирмайди',
    tekshir: () => LIB.includes(`"holati" <> 'QORALAMA'`),
  },
  {
    nomi: 'Шарт БИТТА жойда — иккала сўров ҳам ўшани ишлатади',
    tekshir: () => {
      const shartlar = LIB.match(/"arxivSanasi" IS NULL/g) ?? [];
      return shartlar.length === 1 && (LIB.match(/WHERE \$\{shart\}/g) ?? []).length === 2;
    },
  },
  {
    nomi: 'Маҳалла фильтри параметр орқали — SQL га ёпиштирилмайди',
    tekshir: () =>
      LIB.includes('Prisma.sql`AND "mahallaId" = ${mahallaId}`') &&
      !/mahallaId\s*\+/.test(LIB),
  },
  {
    nomi: 'Кенгайтмасиз мижоз атайин олинган ва изоҳланган',
    tekshir: () =>
      LIB.includes("import { xomPrisma }") && LIB.includes('$queryRaw') &&
      !/\bfrom '\.\/prisma'[\s\S]*\bprisma\b\.\$queryRaw/.test(LIB),
  },

  /* ══ МАХРАЖ ══ */
  {
    nomi: 'Ҳар бир улуш рўйхатида маҳраж МАЖБУРИЙ',
    tekshir: () => {
      /* `maxraj` ихтиёрий бўлиб қолса, фоизсиз рақам пайдо бўларди */
      const e = PANEL.match(/maxraj\??:\s*number/);
      return e !== null && !e[0].includes('?');
    },
  },
  {
    nomi: 'Ҳар бир `<Ulush>` га маҳраж берилган',
    tekshir: () => {
      const bloklar = PANEL.match(/<Ulush[\s\S]*?\/>/g) ?? [];
      return bloklar.length >= 10 && bloklar.every((b) => b.includes('maxraj='));
    },
  },
  {
    nomi: 'Тагсавол фақат асосий савол «Ҳа» бўлганда саналади',
    tekshir: () => {
      /*
       * «Қандай молиявий ёрдам керак: Имтиёзли кредит — 18,
       * 138,5%» деб турарди: маҳраж 13 та эди. Хонадон
       * таҳрир қилинганда асосий савол «Йўқ» га ўтган, эски
       * жавоб эса массивда қолган.
       */
      const darvozalar = [
        ['passivDaromadTurlari', 'passivDaromadIstagi'],
        ['chorvaTurlari', 'chorvaBor'],
        ['hunarTurlari', 'hunarmandBor'],
        ['tadbirkorlikSohasi', 'tadbirkorlikIstagi'],
        ['moliyaTuri', 'moliyaEhtiyoji'],
        ['chetElDavlatlari', 'chetElMehnati'],
      ];
      const yoq = darvozalar.filter(
        ([ustun, darvoza]) =>
          !LIB.includes(`unnest("${ustun}") AS t WHERE "${darvoza}"`)
      );
      if (yoq.length) console.log(`     дарвозасиз: ${yoq.map((y) => y[0]).join(', ')}`);
      return (
        yoq.length === 0 &&
        LIB.includes('"gaz" AND "gazTuri" IS NOT NULL') &&
        LIB.includes('"tomorqaBor" AND "tomorqaFoydalanish" IS NOT NULL')
      );
    },
  },
  {
    nomi: 'Баҳо шкаласи каталог тартибида — яхшидан ёмонга',
    tekshir: () => {
      /*
       * «Аъло, Яхши, Қониқарли, Ёмон» сонига қараб сараланса,
       * тенг қийматлар ўрин алмашади ва шкала бузилади.
       */
      const shkalalar = ['b.yer.foydalanish', 'b.uyJoy.holati'];
      const bloklar = PANEL.match(/<Ulush[\s\S]*?\/>/g) ?? [];
      return shkalalar.every((sh) => {
        const blok = bloklar.find((b) => b.includes(sh));
        return blok !== undefined && blok.includes('katalogTartibi');
      });
    },
  },
  {
    nomi: 'Узун вариант номи панелда қисқаради — ёрлиқ кесилиб қолмайди',
    tekshir: () =>
      PANEL.includes("const qisqaNom") &&
      PANEL.includes("nom.split(' — ')[0]") &&
      PANEL.includes('qisqaNom(kirillcha(katalog'),
  },
  {
    nomi: 'Қисқартириш фақат каталог номига — оралиқ ёрлиғи бутун қолади',
    tekshir: () =>
      /*
       * «0 — 3 ёш» даги тире ОРАЛИҚ белгиси. Қисқартиргич уни
       * ҳам кесиб, ёрлиқни «0» га айлантириб қўйганди.
       */
      PANEL.includes('katalog ? qisqaNom(kirillcha(katalog, q.qiymat)) : q.qiymat') &&
      !PANEL.includes("'0 — 3") &&
      PANEL.includes("'0–3 ёш'"),
  },
  {
    nomi: 'Маҳраждан ошиб кетган рақам яширилмайди, айтилади',
    tekshir: () => PANEL.includes('const oshgan =') && PANEL.includes('{oshgan && ('),
  },
  {
    nomi: 'Устун кенглиги ЭНГ КАТТА қийматга нисбатан чизилади',
    tekshir: () =>
      /*
       * Болалар ёш гуруҳи табиий тартибда берилади (0-3, 3-17,
       * 18 дан) ва биринчи қатор энг кичиги бўлиши мумкин.
       * `royxat[0]` га нисбатан чизилса, барча устун тўла
       * кўринади — рақам тўғри, диаграмма ёлғон.
       */
      PANEL.includes('Math.max(...royxat.map') && !PANEL.includes('royxat[0].soni'),
  },
  {
    nomi: 'Нолга бўлиш йўқ — фоиз маҳраж нолда ҳам ҳисобланади',
    tekshir: () => PANEL.includes('butun > 0 ?') && LIB.includes('xonadon > 0 ?'),
  },

  /* ══ ҲАР БЎЛИМ ПАНЕЛДА ══ */
  {
    nomi: 'Анкетанинг ўн икки бўлими ҳам панелда бор',
    tekshir: () => {
      const kerak = [
        'bolim-oila',
        'bolim-mehnat',
        'bolim-tadbirkorlik',
        'bolim-chet-el',
        'bolim-daromad',
        'bolim-talim',
        'bolim-soglik',
        'bolim-uy-joy',
        'bolim-ijtimoiy',
        'bolim-yer',
        'bolim-qoshimcha',
        'bolim-infratuzilma',
        'bolim-rozilik',
      ];
      const yoq = kerak.filter((id) => !PANEL.includes(`id="${id}"`));
      if (yoq.length) console.log(`     чизилмаган: ${yoq.join(', ')}`);
      return yoq.length === 0;
    },
  },
  {
    nomi: 'Ўтиш тугмалари ҳар бир чизилган бўлимга мос',
    tekshir: () => {
      const tugmalar = [...PANEL.matchAll(/id: '(bolim-[a-z-]+)'/g)].map((m) => m[1]);
      return (
        tugmalar.length === 13 && tugmalar.every((id) => PANEL.includes(`id="${id}"`))
      );
    },
  },
  {
    nomi: 'Ҳисоб натижасининг ҳар бир бўлими панелда ишлатилган',
    tekshir: () => {
      /* Интерфейсдаги биринчи даража калитлар */
      const kerak = [
        'oila',
        'mehnat',
        'tadbirkorlik',
        'chetEl',
        'daromad',
        'talim',
        'soglik',
        'uyJoy',
        'ijtimoiy',
        'hujjat',
        'yer',
        'qoshimchaDaromad',
        'infratuzilma',
        'rozilik',
      ];
      const yoq = kerak.filter((k) => !PANEL.includes(`b.${k}.`));
      if (yoq.length) console.log(`     кўрсатилмаган: ${yoq.join(', ')}`);
      return yoq.length === 0;
    },
  },

  /* ══ ҲОКИМ АЙТГАН РАҚАМЛАР ══ */
  {
    nomi: 'Болалар ёш гуруҳлари — 0-3, 3-17 ва 18 дан катта',
    tekshir: () =>
      PANEL.includes('b.oila.bolalar0_3') &&
      PANEL.includes('b.oila.bolalar3_17') &&
      PANEL.includes('b.oila.bolalar18Dan'),
  },
  {
    nomi: '17 ёшгача бола — алоҳида йиғинди сифатида кўринади',
    tekshir: () => PANEL.includes('b.oila.bolalar0_3 + b.oila.bolalar3_17'),
  },
  {
    nomi: 'Чет элдаги одам сони ва кирадиган пул — юқори кўрсаткичда',
    tekshir: () =>
      SAHIFA.includes('b.chetEl.ishchi') && SAHIFA.includes('b.chetEl.oylikSom'),
  },
  {
    nomi: 'Чет эл пули ЙИЛЛИК ҳам кўрсатилади',
    tekshir: () => SAHIFA.includes('b.chetEl.oylikSom * 12'),
  },
  {
    nomi: 'Суммани айтмаган оила алоҳида эслатилади — рақам тўлиқ эмаслиги',
    tekshir: () =>
      PANEL.includes('b.chetEl.oila - b.chetEl.pulliOila') &&
      PANEL.includes('ҳақиқий рақам бундан юқори'),
  },
  {
    nomi: 'Ўртача пул — айтган оилага бўлинади, ҳаммасига эмас',
    tekshir: () => PANEL.includes('b.chetEl.oylikSom / b.chetEl.pulliOila'),
  },

  /* ══ ХАТЛОВ БОШЛАНМАГАН ҲОЛАТ ══ */
  {
    nomi: 'Хатлов бошланмаганда бўш карточкалар эмас, изоҳ чиқади',
    tekshir: () => PANEL.includes('if (b.xonadon === 0)'),
  },
  {
    nomi: 'Натижа қисқа муддатга кешланади — панел ҳар очилганда қайта санамайди',
    tekshir: () => LIB.includes('KESH_MUDDATI_MS') && LIB.includes('kesh.set(kalit'),
  },
  {
    nomi: 'Кеш маҳалла кесимида алоҳида — бири иккинчисини кўрсатмайди',
    tekshir: () => LIB.includes("const kalit = mahallaId ?? 'tuman'"),
  },
  {
    nomi: 'Панел сўрови ЁНМА-ЁН кетади — кутиш вақти ошмайди',
    tekshir: () =>
      /*
       * Қамров `panel-qamrovi.ts` дан келади ва ўзгарувчи номи
       * ўзгариши мумкин. Текширувнинг МАЪНОСИ эса бир хил
       * қолади: бўлимлар сўрови `Promise.all` нинг ичида,
       * қолганлари билан ЁНМА-ЁН кетсин.
       */
      /Promise\.all\(\[[\s\S]*bolimlarTahlili\(/.test(SAHIFA),
  },

  /* ══ МАҲАЛЛА ХОДИМИ ҲАМ КЎРАДИ ══ */
  {
    nomi: 'Маҳалла ходими ўз МФЙ сининг бўлимлар кесимини кўради',
    tekshir: () =>
      XATLOV.includes('BolimlarPaneli') &&
      XATLOV.includes('bolimlarTahlili(filtr.mahallaId)'),
  },
  {
    nomi: 'Ходимга ФАҚАТ ўз маҳалласи — туман рақами тушмайди',
    tekshir: () =>
      /*
       * `filtr` сессиядан келади ва YETTILIK учун ҳар доим
       * маҳалла билан тўлади. Маҳалласи йўқ ходимда (раҳбар,
       * ҳоким) блок умуман ҳисобланмайди.
       */
      XATLOV.includes('filtr.mahallaId ? bolimlarTahlili(filtr.mahallaId) : null') &&
      !XATLOV.includes('bolimlarTahlili()'),
  },

  /* ══ ҲИСОБОТ ҲАМ ШУ БЎЛИМЛАРНИ БЕРАДИ ══ */
  {
    nomi: 'PDF ва Excel да болалар ёш гуруҳлари бор',
    tekshir: () =>
      PROFIL.includes("kalit: 'oila'") &&
      PROFIL.includes('bolalar0_3Yosh: true') &&
      PROFIL.includes('bolalar3_17Yosh: true') &&
      PROFIL.includes('bolalar18Yoshdan: true'),
  },
  {
    nomi: 'Ҳисоботда томорқадан фойдаланиш даражаси бор',
    tekshir: () =>
      PROFIL.includes("'tomorqaFoydalanish', TOMORQA_FOYDALANISH") &&
      PROFIL.includes('qoshimchaYerBor: true'),
  },
  {
    nomi: 'Ҳисоботда соғлиқ эҳтиёжлари ва ҳужжат сифати бор',
    tekshir: () =>
      PROFIL.includes('doriEhtiyoji') &&
      PROFIL.includes('tibbiyXizmatEhtiyoji') &&
      PROFIL.includes("kalit: 'sifat'") &&
      PROFIL.includes('rozilikBerdi'),
  },
  {
    nomi: 'Сотихдаги майдон ГЕКТАР деб ёзилмайди',
    tekshir: () => {
      /*
       * Ҳисоботда «Жами экин майдони: 95 га» деб турарди.
       * Анкетада эса ўша катак СОТИХДА сўралади — ҳақиқий
       * майдон 0,95 гектар эди, яъни рақам юз баробар катта
       * кўрсатилган. Ҳоким ер субсидияси режасини шундан
       * тузади.
       */
      const sotixMaydonlari = ['ekin', 'qoshimchaYer'];
      const gektarda = sotixMaydonlari.filter((m) =>
        new RegExp(`maydon\\(${m}`).test(PROFIL)
      );
      if (gektarda.length) console.log(`     гектар деб ёзилган: ${gektarda.join(', ')}`);
      return (
        gektarda.length === 0 &&
        FORMAT.includes('export function sotix') &&
        PROFIL.includes('sotix(ekin)')
      );
    },
  },

  /* ══ АНКЕТАДА СЎРАЛМАЙДИГАНИ КЎРСАТИЛМАЙДИ ══ */
  {
    nomi: 'Анкетада сўралмайдиган майдонлар панелга чиқмаган',
    tekshir: () => {
      /*
       * Схемада бор, аммо анкета сўрамайдиган майдонлар.
       * Уларни кўрсатсак — абадий нол.
       */
      const sorlmaydi = [
        'sanitariya',
        'zarurKomak',
        'bolalarQiziqishlari',
        'kasbHunarYonalishi',
        'ishTuriIstagi',
        'xizmatTosiqlari',
        'boshqaMuammolar',
        'tomorqaMaydoni',
      ];
      const kirib = sorlmaydi.filter((m) => LIB.includes(`"${m}"`));
      if (kirib.length) console.log(`     ортиқча: ${kirib.join(', ')}`);
      return kirib.length === 0;
    },
  },
  {
    nomi: 'Эркин матнли савол вариант сифатида гуруҳланмайди',
    tekshir: () =>
      /* `daromadImkoniyati` ва `oxirgiTibbiyKorik` — эркин матн */
      LIB.includes('imkoniyatYozgan') &&
      LIB.includes('korikYozgan') &&
      !LIB.includes(`'imkoniyat'`) &&
      !LIB.includes(`'korik'`),
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
