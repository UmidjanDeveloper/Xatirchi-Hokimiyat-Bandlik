/**
 * ============================================================
 *  ИНТЕРАКТИВ ХАРИТА — СИНОВ
 *
 *  Харитада иккита хавф бор ва иккиси ҳам ЖИМ келади.
 *
 *  1. УЛАНИШ. Харита геометрияси бошқа манбадан, база бошқа
 *     манбадан келган. Ном бир ҳарфга фарқ қилса, ҳудуд
 *     кулранг бўлиб қолади — «маълумот йўқ» дегандек. Аслида
 *     маълумот бор, фақат топилмаган. Экранда хато кўринмайди.
 *
 *  2. МАҲАЛЛА ИЗОЛЯЦИЯСИ. Харита барча 69 та шаклни чизади.
 *     Агар сўров бегона МФЙ рақамини қайтарса, маҳалла ходими
 *     уни кўриб қолади — ва бу қоида биринчи кундан бери
 *     амал қилади.
 * ============================================================
 */

import { readFileSync } from 'node:fs';
import {
  CHEGARA,
  HUDUDLAR,
  VIEW_BOX,
  xaritaKaliti,
  xaritaniUla,
} from '../src/lib/xarita/hududlar';
import { OLCHOVLAR, daraja, olchovTop } from '../src/components/xarita/olchovlar';
import type { XaritaQatori } from '../src/lib/xarita/xarita-malumoti';

type Sinov = { nomi: string; tekshir: () => boolean };

const MALUMOT = readFileSync('src/lib/xarita/xarita-malumoti.ts', 'utf8');
const KOMPONENT = readFileSync('src/components/xarita/hudud-xaritasi.tsx', 'utf8');
const USLUB = readFileSync('src/app/globals.css', 'utf8');
const PANEL = readFileSync('src/app/(ilova)/panel/page.tsx', 'utf8');

/**
 * Изоҳларсиз код.
 *
 * «WebGL ишлатилмаган» деб ёзилган ИЗОҲНИ синов WebGL
 * ишлатилган деб ўқиб, ўзининг қоидасини бузди. Изоҳ — ният,
 * код — амал; текширув амални кўриши керак.
 */
function kodiOl(matn: string): string {
  return matn
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const KOMPONENT_KODI = kodiOl(KOMPONENT);
const BANDLIK = readFileSync('src/app/(ilova)/bandlik/page.tsx', 'utf8');
const XATLOV = readFileSync('src/app/(ilova)/xatlov/page.tsx', 'utf8');

/** Сохта қатор — ўлчов ҳисобини базасиз синаш учун */
const qator = (o: Partial<XaritaQatori> = {}): XaritaQatori => ({
  hududId: 'h',
  mahallaId: 'm',
  nomiKirill: 'Синов',
  bazaAholi: 900,
  bazaXonadon: 100,
  xatlovXonadon: 40,
  qamrovFoizi: 40,
  bazaIshsiz: 50,
  aniqlangan: 20,
  joylashtirilgan: 10,
  natijaFoizi: 50,
  ishsizQoldiq: 10,
  bolalar17: 30,
  chetElIshchi: 5,
  ...o,
});

const SINOVLAR: Sinov[] = [
  /* ══ ГЕОМЕТРИЯ ══ */
  {
    nomi: 'Геометрияда 69 та ҳудуд бор ва ҳар бирида контур ёзилган',
    tekshir: () =>
      HUDUDLAR.length === 69 &&
      HUDUDLAR.every((h) => h.id.length > 0 && h.name.length > 0 && h.d.startsWith('M')),
  },
  {
    nomi: 'Ҳудуд калитлари такрорланмайди',
    tekshir: () => new Set(HUDUDLAR.map((h) => h.id)).size === HUDUDLAR.length,
  },
  {
    nomi: '`viewBox` контурлардан ҳисобланган — атрофда бўш жой қолмайди',
    tekshir: () => {
      /*
       * Манба файл 1676×800 га мосланган, аммо туман ўша
       * тўртбурчакнинг ҳаммасини эгалламайди. Тўлиқ ўлчам
       * ишлатилса, харита экраннинг ярмида кичкина бўлиб
       * турарди.
       */
      const [x, y, e, b] = VIEW_BOX.split(' ').map(Number);
      return e < 1676 && b <= 800 && e > 600 && b > 400 && x === CHEGARA.x && y === CHEGARA.y;
    },
  },

  /* ══ БАЗАГА УЛАНИШ ══ */
  {
    nomi: 'Тире, бўшлиқ ва бош ҳарф улашга халақит бермайди',
    tekshir: () => {
      /*
       * Ҳақиқий фарқлар: харитада «оқ-олтин», базада «Оқ Олтин».
       * Бу учталик далада топилган, ўйлаб чиқарилган эмас.
       */
      const juftlar: [string, string][] = [
        ['оқ-олтин', 'Оқ Олтин'],
        ['полвон-ота', 'Полвонота'],
        ['кориз-араб', 'Кориз Араб'],
        ['мирзо-улуғбек', 'Мирзо Улуғбек'],
        ['янги-қурилиш', 'Янги Қурилиш'],
      ];
      return juftlar.every(([a, b]) => xaritaKaliti(a) === xaritaKaliti(b));
    },
  },
  {
    nomi: 'Барча 69 та ҳудуд база номларига уланади',
    tekshir: () => {
      /* Ҳудуд номларининг ўзидан «база» ясаймиз — уланиш қоидасини синаш учун */
      const sohta = HUDUDLAR.map((h, i) => ({
        id: `m${i}`,
        nomiKirill: h.id.replace(/-/g, ' ').toUpperCase(),
      }));
      const u = xaritaniUla(sohta);
      if (u.bazadaYoq.length > 0) {
        console.log(`     уланмади: ${u.bazadaYoq.map((h) => h.name).join(', ')}`);
      }
      return u.hududdanMahallaga.size === HUDUDLAR.length && u.bazadaYoq.length === 0;
    },
  },
  {
    nomi: 'Уланмаган МФЙ яширилмайди — иккала томон ҳам қайтади',
    tekshir: () => {
      const u = xaritaniUla([{ id: 'm1', nomiKirill: 'Бахшижар' }, { id: 'm2', nomiKirill: 'Йўқ жой' }]);
      return u.xaritadaYoq.length === 1 && u.bazadaYoq.length === 68;
    },
  },
  {
    nomi: 'Тахминий (ўхшаш) улаш йўқ — фақат аниқ мослик',
    tekshir: () => {
      /*
       * «Бахшижор» — «Бахшижар» га бир ҳарф фарқ. Уни уласак,
       * ҳоким бошқа МФЙ нинг рақамини кўрарди.
       */
      const u = xaritaniUla([{ id: 'm1', nomiKirill: 'Бахшижор' }]);
      return u.hududdanMahallaga.size === 0;
    },
  },

  /* ══ МАҲАЛЛА ИЗОЛЯЦИЯСИ ══ */
  {
    nomi: 'Бир МФЙ кесимида бошқа МФЙ қатори УМУМАН қайтмайди',
    tekshir: () => MALUMOT.includes('if (mahallaId && m.id !== mahallaId) continue;'),
  },
  {
    nomi: 'Маҳалла ходимига харита ўз МФЙ си билан чегараланиб берилади',
    tekshir: () =>
      XATLOV.includes('xaritaMalumoti(filtr.mahallaId)') &&
      XATLOV.includes('yolqinMahallaId={filtr.mahallaId}') &&
      !XATLOV.includes('xaritaMalumoti()'),
  },

  /* ══ ЭСКИ КОМПЬЮТЕРЛАР ══ */
  {
    nomi: 'WebGL, canvas ва ташқи 3D кутубхона ишлатилмаган',
    tekshir: () => {
      /*
       * Ҳокимлик ва 70 маҳалла идорасидаги машиналар ҳар хил.
       * WebGL уларнинг бир қисмида умуман очилмайди — ва буни
       * синовда эмас, фақат ишлатувчи кўради.
       */
      const taqiq = ['three', 'webgl', 'WebGL', 'getContext', '<canvas', 'deck.gl', 'mapbox'];
      const topilgan = taqiq.filter((t) => KOMPONENT_KODI.includes(t));
      if (topilgan.length) console.log(`     топилди: ${topilgan.join(', ')}`);
      return topilgan.length === 0;
    },
  },
  {
    nomi: '«2D» тугмаси бор ва танлов эсда қолади',
    tekshir: () =>
      KOMPONENT.includes('uchniAlmashtir') && KOMPONENT.includes('localStorage.setItem(SOZLAMA'),
  },
  {
    nomi: 'Машина кўтармаса ўзи текис режимга ўтади ва БУНИ АЙТАДИ',
    tekshir: () =>
      KOMPONENT.includes('setOzgaOtdi(true)') &&
      KOMPONENT.includes('ozgaOtdi &&') &&
      /ortacha > \d+/.test(KOMPONENT),
  },
  {
    nomi: 'Фойдаланувчи ўзи танлаган бўлса, ўлчов аралашмайди',
    tekshir: () => KOMPONENT.includes('tanlovQildi.current'),
  },
  {
    nomi: 'Ҳаракат камайтирилган режимда тебраниш тўхтайди',
    tekshir: () =>
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.xarita-tebranish \{[\s\S]*?animation: none/.test(
        USLUB
      ),
  },
  {
    nomi: 'Контур геометрияси `<defs>` да бир марта сақланади',
    tekshir: () => {
      /*
       * Ҳар ҳудуд беш қатламда чизилади. Контур такрорланса,
       * саҳифа беш баробар оғирлашарди — эски машинада бу
       * сезилади.
       */
      return KOMPONENT.includes('<defs>') && KOMPONENT.includes('href={`#hd-');
    },
  },

  /* ══ БОСИШ ЎҒИРЛАНМАСИН ══ */
  {
    nomi: 'Хаританинг бўш бурчаги тугмаларни тўсмайди',
    tekshir: () => {
      /*
       * Манфий чет туфайли хаританинг тўртбурчак қутиси ўлчов
       * тугмалари устига чиқади. Тугма кўринади, аммо
       * босилмайди — буни синов топди, одам эмас.
       */
      return (
        /\.xarita-tebranish,\s*\.xarita-tekislik,\s*\.xarita-svg \{\s*pointer-events: none;/.test(
          USLUB
        ) && /\.hudud \{\s*pointer-events: auto;/.test(USLUB)
      );
    },
  },
  {
    nomi: 'Фокус ҳалқаси ўчирилган, аммо фокус кўринади',
    tekshir: () =>
      USLUB.includes('.hudud:focus {\n  outline: none;\n}') &&
      USLUB.includes('.hudud:focus-visible'),
  },

  /* ══ РАНГ ВА МАЪНО ══ */
  {
    nomi: 'Ранг НИСБИЙ — мутлақ фоиздан эмас',
    tekshir: () => {
      /*
       * Хатловнинг биринчи ойларида барча МФЙ да қамров
       * 0,3-0,6 фоиз бўлади. Мутлақ шкалада бутун харита бир
       * хил рангга айланиб, ҳеч нима демай қоларди.
       */
      return (
        KOMPONENT_KODI.includes('qadamXaritasi.qadam.get(') &&
        KOMPONENT_KODI.includes('const chorak = [0.25, 0.5, 0.75]') &&
        /* Эски мутлақ формула қайтиб келмасин */
        !KOMPONENT_KODI.includes('Math.ceil(d * 5)')
      );
    },
  },
  {
    nomi: 'Тенг қийматлар бир рангга тушади',
    tekshir: () => KOMPONENT.includes('if (eng === kam)'),
  },
  {
    nomi: 'Ранг қатори БИТТА тусда — қизил-яшил жуфти ишлатилмаган',
    tekshir: () => {
      /*
       * Светофорда қизил билан тўқ сариқ ΔE 8,7 чиқди (чегара
       * 15), қизил-яшил жуфти эса ҳар ўн иккинчи эркак учун
       * бир хил. Шунинг учун ранг — `--step-1..5` кетма-кетлиги.
       */
      return (
        KOMPONENT.includes('var(--xarita-${qadam})') &&
        !KOMPONENT.includes('var(--ok)') &&
        !/fill=.*var\(--warn\)/.test(KOMPONENT)
      );
    },
  },
  {
    nomi: 'Муаммо рангда эмас, АЛОҲИДА белгида — қизил контур',
    tekshir: () => KOMPONENT.includes("'var(--danger)'") && KOMPONENT.includes('ogohRoyxati'),
  },
  {
    nomi: 'Огоҳлантириш нисбий: энг орқадаги ўнта, мутлақ чегара эмас',
    tekshir: () => KOMPONENT.includes('OGOH_SONI') && !/f !== null && f < 40/.test(KOMPONENT),
  },
  {
    nomi: 'Ҳажм ўлчовида огоҳлантириш умуман йўқ',
    tekshir: () => {
      /*
       * «17 ёшгача болалар» харитасида боласи энг кам ўнта МФЙ
       * қизил контур олганди — гўё улар орқада қолгандек.
       */
      const hajmli = OLCHOVLAR.filter((o) => !o.baholanadi).map((o) => o.kalit);
      return (
        hajmli.includes('bolalar') &&
        hajmli.includes('chetEl') &&
        KOMPONENT.includes('if (!olchov.baholanadi) return new Set<string>();')
      );
    },
  },

  /* ══ «ОРҚАДА ҚОЛГАН» — ТАҚҚОСЛАШ БЎЛСА ══ */
  {
    nomi: 'Иш бошланган МФЙ кам бўлса, ҳеч ким «орқада» деб белгиланмайди',
    tekshir: () => {
      /*
       * Хатлов ҳозир ФАҚАТ Уйшунда кетмоқда. Эски қоида «иш
       * бошланганлар орасидан энг орқадаги ўнтаси» эди — ва
       * туманда ишлаётган ЯГОНА маҳалла қизил контур олди.
       *
       * «Орқада қолган» — таққослаш. Таққослайдиган нарса
       * бўлмаса, у ҳукм эмас, туҳмат.
       */
      return (
        KOMPONENT_KODI.includes('KAMIDA_TAQQOS') &&
        KOMPONENT_KODI.includes('royxat.ishlagan.length < KAMIDA_TAQQOS')
      );
    },
  },
  {
    nomi: 'Хатлов бошланмагани «бошланган-у ёмон» дан фарқланади',
    tekshir: () =>
      KOMPONENT_KODI.includes('const boshlanganmi') &&
      KOMPONENT_KODI.includes('q.xatlovXonadon > 0') &&
      /* Рўйхат икки бўлимга айнан шу шарт билан ажралади */
      KOMPONENT_KODI.includes('qatorlar.filter(boshlanganmi)') &&
      KOMPONENT_KODI.includes('.filter((q) => !boshlanganmi(q))'),
  },
  {
    nomi: 'Бошланмаган МФЙ га «0%» ёзилмайди — «навбатда» дейилади',
    tekshir: () =>
      KOMPONENT.includes("{tr('навбатда')}") &&
      KOMPONENT_KODI.includes('malumotBormi(faolQator, olchov)') &&
      KOMPONENT_KODI.includes('{malumotli ? ('),
  },
  {
    nomi: '«Иш кетмоқда» маёғи бор ва у чегара билан чекланган',
    tekshir: () =>
      KOMPONENT_KODI.includes('MAYOQ_CHEGARASI') &&
      KOMPONENT_KODI.includes('xarita-mayoq-halqa') &&
      USLUB.includes('@keyframes xarita-pulse'),
  },
  {
    nomi: 'Ҳаракат камайтирилганда маёқ ЙЎҚОЛМАЙДИ, фақат тўхтайди',
    tekshir: () => {
      /* Айнан маёқ ҳақидаги қоида ёзилган блокни оламиз */
      const bloklar = USLUB.split('@media').filter((b) =>
        b.startsWith(' (prefers-reduced-motion: reduce)')
      );
      const mayoqli = bloklar.find((b) => b.includes('.xarita-mayoq-halqa'));
      if (!mayoqli) return false;
      return mayoqli.includes('opacity: 0.5') && !mayoqli.includes('display: none');
    },
  },

  /* ══ ХАРИТА БЎШ ҚОҒОЗГА АЙЛАНМАСИН ══ */
  {
    nomi: 'База кесимлари бор — улар биринчи кундан тўла',
    tekshir: () => {
      /*
       * Хатлов бир жойда кетаётганда «қамров» харитасининг 68
       * та шакли бўш бўлади ва панел оппоқ қоғоздек очилади.
       * База рақамлари (свод жадвали) эса ҳамма МФЙ да бор.
       */
      const bazaviylar = OLCHOVLAR.filter((o) => o.bazaviy);
      return (
        bazaviylar.length >= 2 &&
        bazaviylar.some((o) => o.kalit === 'bazaIshsiz') &&
        bazaviylar.every((o) => o.hajm(qator()) > 0)
      );
    },
  },
  {
    nomi: 'Иш ёйилмаган бўлса, харита БАЗА кесими билан очилади',
    tekshir: () =>
      KOMPONENT_KODI.includes("boshlanganSoni >= KAMIDA_TAQQOS ? 'qamrov' : 'bazaIshsiz'"),
  },
  {
    nomi: 'База кесимида ҳар бир МФЙ рангли — кулранг қолмайди',
    tekshir: () =>
      KOMPONENT_KODI.includes('const malumotBormi') &&
      KOMPONENT_KODI.includes('olchov.bazaviy || boshlanganmi(q)') &&
      KOMPONENT_KODI.includes('if (!malumotBormi(q, olchov)) continue;'),
  },
  {
    nomi: 'Баландлик фақат ҚИЙМАТДАН чиқади — сунъий кўтариш йўқ',
    tekshir: () => {
      /*
       * Бир пайтлар ҳар бир ҳудудга уч бирлик «асос
       * баландлиги» қўшилганди — харита оппоқ қоғозга
       * ўхшамасин деб. Оқлик бошқа йўл билан тузатилди
       * (маълумотсиз ҳудуднинг ўз ранги бор), сунъий
       * кўтариш эса харитани ғадир-будир қилиб қўйди.
       */
      const asos = KOMPONENT_KODI.match(/const ASOS_BALAND = (\d+);/);
      return asos !== null && Number(asos[1]) === 0;
    },
  },
  {
    nomi: 'Маълумотсиз ҳудуднинг ўз ранги бор — деярли оқ эмас',
    tekshir: () =>
      KOMPONENT_KODI.includes("'var(--xarita-bosh)'") &&
      !KOMPONENT_KODI.includes("qadam === 0 ? 'var(--surface-muted)'") &&
      USLUB.includes('--xarita-bosh:') &&
      USLUB.includes('--xarita-bosh-devor:'),
  },
  {
    nomi: 'Тултип ва рўйхат «маълумот бор-йўқ» ни бир хил ҳисоблайди',
    tekshir: () =>
      KOMPONENT_KODI.includes('malumotBormi(faolQator, olchov)') &&
      KOMPONENT_KODI.includes('malumotli={malumotBormi(q, olchov)}') &&
      /* Эски, ўлчовга боғлиқ бўлмаган шарт қайтиб келмасин */
      !KOMPONENT_KODI.includes('boshlanganmi(faolQator)'),
  },
  {
    nomi: 'Чуқурлик учун панжара ва ёруғлик бор',
    tekshir: () =>
      KOMPONENT_KODI.includes('xarita-panjara') &&
      KOMPONENT_KODI.includes('xarita-yoruglik') &&
      KOMPONENT_KODI.includes('radialGradient'),
  },

  {
    nomi: 'Танланган МФЙ карточкасида БАЗА рақамлари ҳам бор',
    tekshir: () => {
      /*
       * Аввал карточкада фақат хатлов рақамлари турарди ва
       * хатлов бошланмаган МФЙ босилганда олтита сатрнинг
       * олтитаси ҳам нол чиқарди — «ишламаяпти» деган
       * таассурот. Ҳолбуки ўша маҳалла ҳақида айтадиган гап
       * бор эди: 595 хонадон, 34 та ишсиз рўйхатда.
       */
      return (
        KOMPONENT.includes("qator('Аҳоли'") &&
        KOMPONENT.includes("qator('Хонадон'") &&
        KOMPONENT.includes("qator('Рўйхатдаги ишсиз'") &&
        KOMPONENT.includes("bolimSarlavhasi('База — свод жадвалидан')")
      );
    },
  },
  {
    nomi: 'Хатлов бошланмаган бўлса, олтита нол ўрнига битта рост гап',
    tekshir: () =>
      KOMPONENT.includes('Бу МФЙ да хатлов ҳали бошланмаган.') &&
      KOMPONENT_KODI.includes('{boshlangan ? ('),
  },
  {
    nomi: 'Кўрсаткични ушлаб олиш БОСИШНИ ўлдирмайди',
    tekshir: () => {
      /*
       * ── Энг узоқ яшаган нуқсон ──
       *
       * `setPointerCapture` сичқонча босилиши билан
       * чақириларди. Ушлаб олингач, браузер `click` ни ҳам
       * ушлаб олган элементга юборади — яъни ҳудудга эмас,
       * саҳна `div` ига. Ҳудуднинг `onClick` и ҳеч қачон
       * ишламади: экранда ҳамма нарса жойида, фақат босилмайди.
       *
       * Ушлаб олиш энди `pointerdown` да эмас, одам
       * ҲАҚИҚАТДА сургагач — чегарадан ортиқ силжигач —
       * бошланади.
       */
      const pastda = KOMPONENT_KODI.slice(KOMPONENT_KODI.indexOf('const sudrashBoshi'));
      const boshida = pastda.slice(0, pastda.indexOf('const sudrashDavomi'));
      return (
        !boshida.includes('setPointerCapture') &&
        KOMPONENT_KODI.includes('SURISH_CHEGARASI') &&
        KOMPONENT_KODI.includes('Math.hypot(dx, dy) < SURISH_CHEGARASI')
      );
    },
  },
  {
    nomi: 'Харитадан ва рўйхатдан босиш БИР ХИЛ карточкани очади',
    tekshir: () => {
      /* Иккови ҳам айнан битта ҳолатни ўзгартиради */
      const xaritadan = KOMPONENT_KODI.includes('onClick={() => !yakka && setTanlangan(');
      const royxatdan = KOMPONENT_KODI.includes('bos={() => setTanlangan(q.hududId)}');
      const bitta = (KOMPONENT_KODI.match(/<TanlanganKarta/g) ?? []).length === 1;
      return xaritadan && royxatdan && bitta;
    },
  },
  {
    nomi: 'Рельеф юмшоқ — ҳудудлар бир-бирини тўсмайди',
    tekshir: () => {
      /*
       * База кесими қўшилгач ҳамма ҳудуд кўтарилиб кетди ва
       * 69 та баланд устун бир-бирининг устига тушиб, харита
       * тикан-тикан бўлиб қолди.
       */
      const eng = KOMPONENT_KODI.match(/const ENG_BALAND = (\d+);/);
      const qatlam = KOMPONENT_KODI.match(/const DEVOR_QATLAMI = (\d+);/);
      if (!eng || !qatlam) return false;
      const balandlik = Number(eng[1]);
      const oraliq = balandlik / Number(qatlam[1]);
      /* Қатламлар ораси уч бирликдан кенг бўлса — девор зинапоя бўлиб кўринади */
      return balandlik <= 14 && oraliq <= 3.5;
    },
  },

  {
    nomi: 'Ранг қатори тўртта қадам — қўшнилари ажралиб туради',
    tekshir: () => {
      /*
       * Бештайди ва қўшни иккитасининг ёруғлик фарқи 0,09 эди
       * — экранда деярли бир хил кўринарди, харита «ола-чипор»
       * бўлиб чиқарди. Тўртта қадамда фарқ 0,15 га чиқди.
       */
      return (
        /const QADAM_SONI = 4;/.test(KOMPONENT_KODI) &&
        USLUB.includes('--xarita-4:') &&
        !USLUB.includes('--xarita-5:')
      );
    },
  },
  {
    nomi: 'Легендада мавҳум «кам/кўп» эмас, РАҚАМ оралиғи',
    tekshir: () =>
      KOMPONENT_KODI.includes('const oraliqMatni') &&
      KOMPONENT_KODI.includes('oraliqMatni(n)') &&
      /* Эски мавҳум ёрлиқ қайтиб келмасин */
      !KOMPONENT.includes("{tr('Кам')}"),
  },
  {
    nomi: 'База кесимида «ранг хатловга боғлиқ эмас» деб АЙТИЛАДИ',
    tekshir: () => {
      /*
       * Харитага қараган одам ранг-баранг шаклларни кўриб
       * «демак ҳамма жойда иш кетяпти» деб ўқиди. Ранг эса
       * свод жадвалидан эди. Энди буни экраннинг ўзи айтади.
       */
      return (
        KOMPONENT.includes('Бу ранглар хатловга боғлиқ эмас') &&
        KOMPONENT_KODI.includes('olchov.bazaviy && !yakkaRejim')
      );
    },
  },
  {
    nomi: 'Ранг нимани ўлчаётгани легенда бошида ёзилган',
    tekshir: () => KOMPONENT.includes("{tr('Ранг:')}") && KOMPONENT.includes('tr(olchov.nomi)'),
  },

  /* ══ РЎЙХАТ ВА ҚИДИРУВ ══ */
  {
    nomi: 'Рўйхатда БАРЧА МФЙ бор — ўнталик эмас',
    tekshir: () =>
      KOMPONENT_KODI.includes('topilgan.ishlagan.map') &&
      KOMPONENT_KODI.includes('topilgan.boshlanmagan.map') &&
      !KOMPONENT_KODI.includes('royxat.slice(0, 14)'),
  },
  {
    nomi: 'Қидирув бор ва икки алифбода ҳам ишлайди',
    tekshir: () =>
      KOMPONENT_KODI.includes("type=\"search\"") &&
      KOMPONENT_KODI.includes('qidiruvKaliti(lotinga(q.nomiKirill))') &&
      KOMPONENT_KODI.includes('qidiruvKaliti(q.nomiKirill)'),
  },
  {
    nomi: 'Қидирувда апостроф талаб қилинмайди',
    tekshir: () => {
      /*
       * Қоиданинг ЎЗИ энди `lib/qidiruv.ts` да — уни панелдаги
       * МФЙ танлови ҳам ишлатади. Бу ерда иккита нарса
       * текширилади: қоида ўша файлда турибди ва харита
       * унинг ўзини чақиради (ўз нусхасини эмас).
       */
      const qidiruv = readFileSync('src/lib/qidiruv.ts', 'utf8');
      return (
        qidiruv.includes("replace(/[''ʻʼ`´]/g, '')") &&
        KOMPONENT_KODI.includes("from '@/lib/qidiruv'") &&
        !/const qidiruvKaliti =/.test(KOMPONENT_KODI)
      );
    },
  },
  {
    nomi: 'Сатрга босилганда харитада нина кўрсатади',
    tekshir: () =>
      KOMPONENT_KODI.includes('xarita-nina-chiziq') &&
      KOMPONENT_KODI.includes('bos={() => setTanlangan(q.hududId)}') &&
      USLUB.includes('@keyframes xarita-nina-chiz'),
  },
  {
    nomi: 'Рўйхат иккита бўлимга ажратилган',
    tekshir: () =>
      KOMPONENT.includes('matn="Хатлов кетмоқда"') &&
      KOMPONENT.includes('matn="Хатлов ҳали бошланмаган"'),
  },

  /* ══ ЎЛЧОВ ҲИСОБИ ══ */
  {
    nomi: 'Ҳар бир ўлчовда ном, изоҳ ва матн бор',
    tekshir: () =>
      OLCHOVLAR.length >= 5 &&
      OLCHOVLAR.every((o) => o.nomi.length > 0 && o.izoh.length > 0 && o.matn(qator()).length > 0),
  },
  {
    nomi: 'Маҳражи нол бўлса фоиз ҳисобланмайди (нолга бўлиш йўқ)',
    tekshir: () => {
      const bosh = qator({ bazaXonadon: 0, aniqlangan: 0, bazaIshsiz: 0 });
      return OLCHOVLAR.every((o) => {
        const f = o.foiz(bosh);
        return f === null || Number.isFinite(f);
      });
    },
  },
  {
    nomi: '«Рўйхатда турганлар» ўлчовида кўп бўлгани ЁМОН',
    tekshir: () => olchovTop('ishsiz').kopYaxshi === false,
  },
  {
    nomi: 'Даража 0 ва 1 оралиғидан чиқмайди',
    tekshir: () => {
      const sinovlar = [
        qator({ qamrovFoizi: 0 }),
        qator({ qamrovFoizi: 100 }),
        qator({ qamrovFoizi: 250 }),
      ];
      return sinovlar.every((q) => {
        const d = daraja(q, olchovTop('qamrov'), 100);
        return d === null || (d >= 0 && d <= 1);
      });
    },
  },

  /* ══ УЧТА ПАНЕЛДА ══ */
  {
    nomi: 'Харита учала асосий панелда бор',
    tekshir: () =>
      PANEL.includes('<HududXaritasi') &&
      BANDLIK.includes('<HududXaritasi') &&
      XATLOV.includes('<HududXaritasi'),
  },
  {
    nomi: 'Сўровлар ёнма-ён кетади — панел секинлашмайди',
    tekshir: () =>
      /Promise\.all\(\[[\s\S]*xaritaMalumoti\(/.test(PANEL) &&
      /Promise\.all\(\[[\s\S]*xaritaMalumoti\(/.test(BANDLIK),
  },
  {
    nomi: 'Натижа қисқа муддатга кешланади',
    tekshir: () => MALUMOT.includes('KESH_MUDDATI_MS') && MALUMOT.includes('kesh.set(kalit'),
  },
  {
    nomi: 'Ҳудуд рўйхати — хаританинг жадвал кўриниши',
    tekshir: () => {
      /*
       * Рангни ажратолмайдиган одам ва экран ўқигич учун
       * харитадаги бутун маълумот матн билан такрорланади.
       */
      return (
        KOMPONENT.includes('aria-label={`${q?.nomiKirill') &&
        /* Рўйхатда 69 таси ҳам матн билан такрорланади */
        KOMPONENT_KODI.includes('topilgan.ishlagan.map') &&
        KOMPONENT_KODI.includes('topilgan.boshlanmagan.map')
      );
    },
  },
  {
    nomi: 'Чизиш тартиби орқадан олдинга — ҳажм бузилмайди',
    tekshir: () => KOMPONENT.includes('chizishTartibi') && KOMPONENT.includes('markaz(a.d)[1] - markaz(b.d)[1]'),
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
