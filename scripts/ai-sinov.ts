/**
 * ============================================================
 *  СУНЪИЙ ИНТЕЛЛЕКТ ТАҲЛИЛИ — СИНОВ
 *
 *  ── Муаммо нима эди ──
 *
 *  API уланган, калит ишлаяпти, модел жавоб беряпти — аммо
 *  таҳлил «болаларча» чиқарди: «болалар таълимига эътибор
 *  қаратиш керак» тарзидаги юмшоқ жумлалар. Бундай матн
 *  йиғилишда ўқилади ва ҳеч ким ҳеч нима қилмайди.
 *
 *  Сабаб моделда эмас эди. Унга РАҚАМ бериларди, аммо ЎЛЧОВ
 *  берилмасди: «боғчага бормайдиган 12 бола» кўпми ёки озми
 *  — буни билиш учун туман ўртачаси керак, у эса юборилмасди.
 *
 *  ── Иккита ечим, иккиси ҳам шу ерда текширилади ──
 *
 *  1. БРИФ (`brif.ts`) — таҳлилнинг ўзи КОДДА бажарилади:
 *     бўшлиқ ҳисобланади, туман билан таққосланади, 70 МФЙ
 *     ичидаги ўрин топилади.
 *
 *  2. ТЕКШИРУВ (`javobniTekshir`) — рақамсиз ёки мавҳум
 *     тавсия ҚАБУЛ ҚИЛИНМАЙДИ. Кўрсатмада «ёзма» дейилган,
 *     аммо кўрсатмага ишониш етарли эмас.
 * ============================================================
 */

import { readFileSync } from 'node:fs';
import { javobniTekshir } from '../src/lib/hisobot/xulosa';

type Sinov = { nomi: string; tekshir: () => boolean };

const oqi = (yol: string) => readFileSync(yol, 'utf8');

const BRIF = oqi('src/lib/hisobot/brif.ts');
const XULOSA = oqi('src/lib/hisobot/xulosa.ts');
const MALUMOT = oqi('src/lib/hisobot/malumot.ts');
const YOL = oqi('src/app/api/hisobot/xulosa/route.ts');
const EKRAN = oqi('src/components/panel/ai-xulosa.tsx');
const PDF = oqi('src/lib/hisobot/pdf.ts');
const EXCEL = oqi('src/lib/hisobot/excel.ts');

/** Тўғри, тўлиқ жавоб — намуна */
const YAXSHI = JSON.stringify({
  holat:
    'Уйшунда 134 хонадон хатловдан ўтган, қамров 26%. 37 ишсиздан 19 таси жойлаштирилган.',
  tavsiyalar: [
    {
      daraja: 'shoshilinch',
      sarlavha: 'Боғчадан ташқаридаги 12 болани қамровга олиш',
      dalil: 'Мактабгача ёшда 25 бола, боғчада 13 таси — 12 таси ташқарида.',
      qadamlar: ['Рўйхат маҳалла раисидан олинади', 'Бўш ўрин текширилади'],
      masul: 'Халқ таълими бўлими',
      muddat: '3 ҳафта',
      olchov: '12 боладан камида 9 таси боғчага ёзилади',
    },
    {
      daraja: 'muhim',
      sarlavha: '16 талабгорни касб курсига йўналтириш',
      dalil: '16 хонадонда касб-ҳунар истаги бор, гуруҳ 15 тадан тўлади.',
      qadamlar: ['Талабгорлар рўйхати тузилади'],
      masul: 'Касб-ҳунарга ўқитиш маркази',
      muddat: '1 ой',
      olchov: 'Битта гуруҳ очилади',
    },
    {
      daraja: 'muhim',
      sarlavha: '17 та кечиккан топшириқни ёпиш',
      dalil: 'Муддати ўтган 17 топшириқнинг 13 таси бандлик марказида.',
      masul: 'Бандликка кўмаклашиш маркази',
      muddat: '2 ҳафта',
      olchov: 'Кечиккан топшириқ 5 тадан ошмайди',
    },
  ],
});

const SINOVLAR: Sinov[] = [
  /* ══ ЖАВОБНИ ТЕКШИРИШ ══ */
  {
    nomi: 'Тўлиқ жавоб қабул қилинади ва майдонлари сақланади',
    tekshir: () => {
      const n = javobniTekshir(YAXSHI);
      if (!n) return false;
      const t = n.tavsiyalar[0];
      return (
        n.tavsiyalar.length === 3 &&
        t.masul === 'Халқ таълими бўлими' &&
        t.muddat === '3 ҳафта' &&
        (t.qadamlar?.length ?? 0) === 2 &&
        !!t.olchov
      );
    },
  },
  {
    nomi: 'РАҚАМСИЗ тавсия ташлаб юборилади',
    tekshir: () => {
      const d = JSON.parse(YAXSHI);
      d.tavsiyalar[0].dalil = 'Болалар таълими аҳволи қониқарсиз.';
      const n = javobniTekshir(JSON.stringify(d));
      /* Учтадан биттаси тушади — учтадан кам бўлгани учун рад этилади */
      return n === null;
    },
  },
  {
    nomi: 'МАВҲУМ жумла ташлаб юборилади',
    tekshir: () => {
      const d = JSON.parse(YAXSHI);
      d.tavsiyalar[1].sarlavha = 'Ҳамкорликни кучайтириш';
      return javobniTekshir(JSON.stringify(d)) === null;
    },
  },
  {
    nomi: 'Ярим жавоб (3 тадан кам тавсия) қабул қилинмайди',
    tekshir: () => {
      const d = JSON.parse(YAXSHI);
      d.tavsiyalar = d.tavsiyalar.slice(0, 2);
      return javobniTekshir(JSON.stringify(d)) === null;
    },
  },
  {
    nomi: 'Лотин ёзувидаги жавоб рад этилади',
    tekshir: () => {
      const d = JSON.parse(YAXSHI);
      d.holat = 'Uyshunda 134 xonadon xatlovdan otgan.';
      return javobniTekshir(JSON.stringify(d)) === null;
    },
  },
  {
    nomi: '```json блоки ичидаги жавоб ҳам ўқилади',
    tekshir: () => javobniTekshir('```json\n' + YAXSHI + '\n```') !== null,
  },
  {
    nomi: 'Бузуқ JSON — қоидага тушамиз, илова йиқилмайди',
    tekshir: () => javobniTekshir('{bu json emas') === null,
  },
  {
    nomi: 'Мавҳум ҚАДАМ ташланади, тавсиянинг ўзи қолади',
    tekshir: () => {
      const d = JSON.parse(YAXSHI);
      d.tavsiyalar[0].qadamlar = ['Мониторингни йўлга қўйиш', 'Рўйхат тузилади'];
      const n = javobniTekshir(JSON.stringify(d));
      return n !== null && n.tavsiyalar[0].qadamlar?.length === 1;
    },
  },

  /* ══ БРИФ ══ */
  {
    nomi: 'Бриф бўшлиқни ЎЗИ ҳисоблайди — модел айирма қилмайди',
    tekshir: () =>
      BRIF.includes('b.talim.maktabgachaYoshdagi - b.talim.maktabgachaQamrovda') &&
      BRIF.includes('АНИҚЛАНГАН БЎШЛИҚЛАР'),
  },
  {
    nomi: 'Бўшлиқлар одам сони бўйича тартибланади, фоиз бўйича эмас',
    tekshir: () => BRIF.includes('.sort((a, b2) => b2.soni - a.soni)'),
  },
  {
    nomi: 'Ҳар бир бўшлиқ туман улуши билан ёнма-ён турибди',
    tekshir: () => BRIF.includes('tumanUlushi') && BRIF.includes('farqMatni'),
  },
  {
    nomi: 'Занжирнинг энг заиф ҳалқаси топилади',
    tekshir: () =>
      BRIF.includes('function zanjirUzilishi') && BRIF.includes('Энг катта йўқотиш'),
  },
  {
    nomi: '70 МФЙ ичидаги ўрин фақат ХАТЛОВ БОШЛАНГАНЛАР орасида саналади',
    tekshir: () =>
      /*
       * Хатлов бошланмаган МФЙ нинг нол фоизи билан таққослаш
       * «биринчи ўриндамиз» деган ёлғон хулоса берарди.
       */
      BRIF.includes('qamrov.filter((q) => q.xatlovXonadon > 0)'),
  },
  {
    nomi: 'Қамров паст бўлса ишончлилик ОГОҲЛАНТИРИЛАДИ',
    tekshir: () =>
      BRIF.includes('МАЪЛУМОТНИНГ ИШОНЧЛИЛИГИ') && BRIF.includes('qamrovFoizi < 20'),
  },
  {
    nomi: 'Анкетадаги зиддият (ишсиз > лаёқатли) яширилмайди',
    tekshir: () => BRIF.includes('b.mehnat.ishsiz > b.mehnat.layoqatli'),
  },
  {
    nomi: 'Каталог номлари кириллга ўгирилади — жавоб аралаш чиқмасин',
    tekshir: () =>
      BRIF.includes('katalog ? kirillcha(katalog, q.qiymat) : q.qiymat') &&
      BRIF.includes('CHET_EL_DAVLATI') &&
      BRIF.includes('KAMBAGALLIK_SABABI'),
  },
  {
    nomi: 'Брифга шахсий маълумот тушмайди — фақат жамланма',
    tekshir: () => {
      /*
       * Бриф ФАҚАТ жамланган турлардан ўқийди. Хом ёзув
       * (`prisma`, `findMany`) бу файлда умуман бўлмаслиги
       * керак — бўлса, демак кимдир Ф.И.Ш. ёки манзилга йўл
       * очган.
       */
      return (
        !BRIF.includes('prisma') &&
        !BRIF.includes('findMany') &&
        !/fish|manzil|telefon|oilaBoshligi/i.test(BRIF)
      );
    },
  },

  /* ══ КЎРСАТМА ══ */
  {
    nomi: 'Кўрсатмада ҳокимликнинг ҲАҚИҚИЙ воситалари саналган',
    tekshir: () =>
      XULOSA.includes('ҲОКИМЛИКНИНГ ҲАҚИҚИЙ ИМКОНИЯТЛАРИ') &&
      XULOSA.includes('жамоат ишлари') &&
      XULOSA.includes('IT-шаҳарча ваучери'),
  },
  {
    nomi: 'Кўрсатмада ЯХШИ ва ЁМОН тавсия намунаси бор',
    tekshir: () => XULOSA.includes('ЯХШИ ВА ЁМОН ТАВСИЯ') && XULOSA.includes('Нега ёмон'),
  },
  {
    nomi: 'Ҳар бир тавсияда масъул, муддат ва ўлчов талаб қилинади',
    tekshir: () =>
      XULOSA.includes('"masul"') &&
      XULOSA.includes('"muddat"') &&
      XULOSA.includes('"olchov"') &&
      XULOSA.includes('"qadamlar"'),
  },
  {
    nomi: 'Модел бўшлиқни қайта топмайди — ундан ЕЧИМ сўралади',
    tekshir: () => XULOSA.includes('Бўшлиқлар АЛЛАҚАЧОН ҳисобланган'),
  },

  /* ══ УЛАНИШ ══ */
  {
    nomi: 'Хулоса брифдан фойдаланади, эски қатор тўкишдан эмас',
    tekshir: () =>
      XULOSA.includes('brifYasa(qamrovNomi, tahlil, bolimlar, tumanAsosi)') &&
      !XULOSA.includes('dalilnomaYasa'),
  },
  {
    nomi: 'МФЙ ҳисоботида туман кесими ҳам олинади — таққос учун',
    tekshir: () =>
      MALUMOT.includes('const tumanKerak = sorov.aiXulosa !== false && mahallaId !== undefined') &&
      MALUMOT.includes('tumanKerak ? tahlilOl(undefined) : Promise.resolve(null)'),
  },
  {
    nomi: 'Туман кесими AI сўралмаганда ҲИСОБЛАНМАЙДИ — бекорга сўров кетмасин',
    tekshir: () => MALUMOT.includes('sorov.aiXulosa !== false && mahallaId !== undefined'),
  },
  {
    nomi: '«Янгила» тугмаси кешни ҲАҚИҚАТАН четлаб ўтади',
    tekshir: () =>
      YOL.includes('yangila: d.yangila') &&
      XULOSA.includes('aiKerak && !yangila && saqlangan'),
  },

  /* ══ ЧЕГАРАЛАР ══ */
  {
    nomi: 'Токен чегараси кириллча жавобга етади',
    tekshir: () => {
      /*
       * 2000 чегараси билан модел тўртинчи тавсиянинг
       * ўртасида тўхтарди: JSON ёпилмай қоларди, жавоб рад
       * этиларди — пул эса ечилган бўларди.
       */
      const n = Number(/maxTokens: (\d+)/.exec(XULOSA)?.[1] ?? 0);
      return n >= 3500;
    },
  },
  {
    nomi: 'Кутиш муддати узун жавобга етади',
    tekshir: () => {
      const ai = oqi('src/lib/ai.ts');
      const ms = Number(/const KUTISH_MS = ([\d_]+);/.exec(ai)?.[1].replace(/_/g, '') ?? 0);
      /* Йўлда `maxDuration = 60` турибди — 40 сония хавфсиз */
      return ms >= 35_000 && ms < 55_000;
    },
  },
  {
    nomi: 'Экрандаги кутиш вақти ҳақиқатга мос',
    tekshir: () => EKRAN.includes('15–40 сония'),
  },

  /* ══ ЭКРАН ВА ҲИСОБОТ ══ */
  {
    nomi: 'Экранда қадамлар, масъул, муддат ва ўлчов кўринади',
    tekshir: () =>
      EKRAN.includes('t.qadamlar') &&
      EKRAN.includes('t.masul') &&
      EKRAN.includes('t.muddat') &&
      EKRAN.includes('t.olchov'),
  },
  {
    nomi: 'PDF ҳисоботда ҳам тўрттаси бор — қоғозга ҳам тушсин',
    tekshir: () =>
      PDF.includes('t.qadamlar') &&
      PDF.includes('t.masul') &&
      PDF.includes('t.muddat') &&
      PDF.includes('t.olchov'),
  },
  {
    nomi: 'Excel да улар АЛОҲИДА устунда — фильтрлаб кўриш учун',
    tekshir: () =>
      EXCEL.includes("a('Қадамлар')") &&
      EXCEL.includes("a('Масъул')") &&
      EXCEL.includes("a('Ўлчов')"),
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
