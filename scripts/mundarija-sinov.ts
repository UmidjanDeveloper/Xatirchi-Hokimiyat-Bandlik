/**
 * ============================================================
 *  ЧАП МУНДАРИЖА — СИНОВ
 *
 *  Таҳлил панели битта узун саҳифа: йигирмага яқин блок ва
 *  анкетанинг ўн уч бўлими. Ҳоким йиғилишда аниқ савол билан
 *  келади — «боғча қамрови қанча» — ва жавобни ғилдирак билан
 *  ахтариб ўтирарди.
 *
 *  ── Нега бу синов кенг ──
 *
 *  Мундарижанинг биринчи вариантида битта сатр БУТУН ПАНЕЛНИ
 *  ишлатмай қўйди: фаол бандни кўринишга келтириш учун
 *  `scrollIntoView({ block: 'nearest' })` ёзилган эди, у эса
 *  ҳужжатнинг ўзини ҳам сурарди. Ҳоким саҳифани пастга сурса,
 *  браузер уни дарҳол 338-пикселга қайтариб ташларди.
 *
 *  Бу нуқсонни кўз билан топиб бўлмасди — мундарижа тўғри
 *  кўринарди, бандлар ишларди. Фақат браузерда суриб кўрганда
 *  билинди. Шунинг учун бу ерда ҚОИДА текширилади: ён устун
 *  фақат ЎЗ қутисининг айланишига тегади.
 * ============================================================
 */

import { readFileSync } from 'node:fs';

type Sinov = { nomi: string; tekshir: () => boolean };

const oqi = (yol: string) => readFileSync(yol, 'utf8');

const MUNDARIJA = oqi('src/components/panel/mundarija.tsx');
const PANEL = oqi('src/app/(ilova)/panel/page.tsx');
const BOLIMLAR = oqi('src/components/panel/bolimlar-paneli.tsx');
const TUGMALAR = oqi('src/components/panel/hisobot-tugmalari.tsx');

/** Изоҳларсиз код */
const kodiOl = (m: string) =>
  m
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const PANEL_KODI = kodiOl(PANEL);
const MUNDARIJA_KODI = kodiOl(MUNDARIJA);

/** Саҳифадаги ҳар бир бўлимнинг `id` си */
const QISMLAR = [
  'qism-asosiy',
  'qism-oila-raqamlari',
  'qism-ai',
  'qism-tavsiya',
  'qism-dinamika',
  'qism-xarita',
  'qism-zanjir',
  'qism-mahallalar',
  'qism-vaucher',
  'qism-kurs',
  'qism-toifa',
  'qism-bolimlar',
  'qism-jadval',
];

const SINOVLAR: Sinov[] = [
  /* ══ САҲИФАДА МЎЛЖАЛЛАР БОР ══ */
  {
    nomi: 'Мундарижадаги ҳар бир банд саҳифада ҲАҚИҚАТАН мавжуд',
    tekshir: () => {
      /*
       * Мундарижада бор, саҳифада йўқ банд — босилса ҳеч қаёққа
       * олиб бормайдиган ҳавола. Ҳоким «ишламади» деб ўйлайди.
       */
      const yoq = QISMLAR.filter((id) => !PANEL_KODI.includes(`id="${id}"`));
      if (yoq.length) console.log(`     саҳифада йўқ: ${yoq.join(', ')}`);
      return yoq.length === 0;
    },
  },
  {
    nomi: 'Ҳар бир мўлжалда `scroll-mt-20` бор — сарлавҳа устини ёпмасин',
    tekshir: () => {
      /*
       * Тепадаги сарлавҳа ёпишиб туради ва баландлиги 4rem.
       * `scroll-mt-20` (5rem) бўлмаса, босилган бўлимнинг
       * сарлавҳаси ўша панел остида қолиб кетарди.
       */
      const ayblilar: string[] = [];
      for (const id of QISMLAR) {
        const o = PANEL_KODI.indexOf(`id="${id}"`);
        if (o < 0) continue;
        const parcha = PANEL_KODI.slice(o, o + 260);
        if (!parcha.includes('scroll-mt-20')) ayblilar.push(id);
      }
      if (ayblilar.length) console.log(`     scroll-mt йўқ: ${ayblilar.join(', ')}`);
      return ayblilar.length === 0;
    },
  },
  {
    nomi: 'Анкета бўлимларида ҳам мўлжал бор',
    tekshir: () =>
      BOLIMLAR.includes('id="bolim-oila"') &&
      BOLIMLAR.includes('id="bolim-talim"') &&
      BOLIMLAR.includes('id="bolim-rozilik"'),
  },
  {
    nomi: 'Бўлимлар рўйхати БИТТА жойда — мундарижа ундан ўқийди',
    tekshir: () =>
      BOLIMLAR.includes('export const BOLIMLAR') &&
      PANEL_KODI.includes('BOLIMLAR.map((x) => ({ id: x.id, nomi: x.nomi, raqam: x.raqam, ichki: true }))'),
  },

  /* ══ САҲИФАНИ ИШЛАТМАЙ ҚЎЙМАСИН ══ */
  {
    nomi: 'Ён устун ҲУЖЖАТНИ сурмайди — фақат ўз қутисини',
    tekshir: () => {
      /*
       * Бу — энг муҳим текширув.
       *
       * `scrollIntoView` барча айланадиган ота-элементларни,
       * ҳужжатнинг ўзини ҳам суради. Мундарижада у ишлатилса,
       * ҳоким саҳифани сура олмай қоларди.
       */
      return (
        !MUNDARIJA_KODI.includes('scrollIntoView') &&
        !MUNDARIJA_KODI.includes('window.scrollTo') &&
        MUNDARIJA_KODI.includes('quti.scrollTop =')
      );
    },
  },
  {
    nomi: 'Айланадиган қути ЎЗ `ref` ини олади',
    tekshir: () =>
      /*
       * Рўйхат икки марта чизилади (телефон ва катта экран).
       * Битта JSX элементни икки жойга қўйиб бўлмайди — `ref`
       * иккинчисига ёпишиб қоларди.
       */
      MUNDARIJA_KODI.includes('ref={qutiRef}') &&
      (MUNDARIJA_KODI.match(/ref=\{qutiRef\}/g) ?? []).length === 1,
  },

  /* ══ ФАОЛ БЎЛИМ ══ */
  {
    nomi: 'Фаол бўлим IntersectionObserver билан топилади',
    tekshir: () =>
      MUNDARIJA_KODI.includes('new IntersectionObserver') &&
      /*
       * `scroll` ҳодисасини тинглаш ҳар пикселда ҳисоб талаб
       * қилади ва секин машинада саҳифа тутилиб қоларди.
       */
      !MUNDARIJA_KODI.includes("addEventListener('scroll'"),
  },
  {
    nomi: 'Ичкаридаги бўлим ташқи қутини ЕНГАДИ',
    tekshir: () =>
      /*
       * «Хатлов бўлимлари» ўн уч карточкани ўз ичига олади ва
       * доим улардан юқорида бошланади. «Энг тепадагиси»
       * қоидаси билан у ҳар доим ғолиб чиқарди — ҳоким
       * «Болалар таълими» да турса ҳам.
       */
      MUNDARIJA_KODI.includes('!korinayotgan.some((b) => b !== el && el.contains(b))'),
  },
  {
    nomi: 'Кузатувчи ёпилганда тозаланади — хотира оқмасин',
    tekshir: () => MUNDARIJA_KODI.includes('kuzatuv.disconnect()'),
  },
  {
    nomi: 'Фаол банд `aria-current` билан белгиланади',
    tekshir: () => MUNDARIJA_KODI.includes("aria-current={tanlangan ? 'true' : undefined}"),
  },

  /* ══ КИЧИК ЭКРАН ══ */
  {
    nomi: 'Кичик экранда ён устун эмас, ёпиладиган тугма',
    tekshir: () =>
      MUNDARIJA_KODI.includes('xl:hidden') &&
      MUNDARIJA_KODI.includes('hidden xl:block') &&
      MUNDARIJA_KODI.includes('aria-expanded={ochiq}'),
  },
  {
    nomi: 'Банд танлангач рўйхат ўзи ёпилади',
    tekshir: () => MUNDARIJA_KODI.includes('onClick={() => setOchiq(false)}'),
  },

  /* ══ САҲИФАНИНГ ТУЗИЛИШИ ══ */
  {
    nomi: 'Мундарижа ЧАП устунда турибди',
    tekshir: () =>
      PANEL_KODI.includes('xl:grid-cols-[13rem_minmax(0,1fr)]') &&
      PANEL_KODI.indexOf('<Mundarija') < PANEL_KODI.indexOf('<div className="mt-4 space-y-5 xl:mt-0">'),
  },
  {
    nomi: 'Чап устун охиригача ёнда туради — `items-start` йўқ',
    tekshir: () => {
      /*
       * `items-start` ёзилганда чап устун ўз мундарижаси
       * баландлигича қисқарарди (~700px). Ёпишиб туриш фақат
       * ЎЗ устуни ичида ишлайди — ҳоким саҳифани сурганда
       * мундарижа биргаликда чиқиб кетар ва экранда бўм-бўш
       * чап чекка қоларди.
       *
       * Кўз билан топиш қийин: мундарижа саҳифанинг тепасида
       * тўғри кўринади, нуқсон фақат суриб кўрганда билинади.
       */
      const o = PANEL_KODI.indexOf('xl:grid-cols-[13rem_minmax(0,1fr)]');
      if (o < 0) return false;
      const satr = PANEL_KODI.slice(Math.max(0, o - 120), o + 120);
      return !satr.includes('items-start');
    },
  },
  {
    nomi: 'Экранда бўлмаган бўлимга банд чиқарилмайди',
    tekshir: () =>
      /*
       * Битта МФЙ кесимида «Барча маҳаллалар» жадвали
       * чизилмайди. Мундарижада у қолса, босилганда ҳеч
       * нима бўлмасди.
       */
      PANEL_KODI.includes("...(!mahallaId ? [{ id: 'qism-jadval'") &&
      PANEL_KODI.includes("...(tavsiyalar.length > 0 ? [{ id: 'qism-tavsiya'"),
  },

  /* ══ ИККИТА ҲУДУД ТАНЛОВИ БЎЛМАСИН ══ */
  {
    nomi: 'Ҳисобот тугмаларининг ЎЗ ҳудуд танлови йўқ',
    tekshir: () => {
      /*
       * Илгари экранда иккита ҳудуд танлови ёнма-ён турарди:
       * панелники ва ҳисоботники. Ҳоким қайси бири нимага
       * таъсир қилишини билмасди.
       */
      const ayblilar: string[] = [];
      for (const yol of ['src/app/(ilova)/panel/page.tsx', 'src/app/(ilova)/bandlik/page.tsx']) {
        const k = kodiOl(oqi(yol));
        const o = k.indexOf('<HisobotTugmalari');
        if (o < 0) continue;
        if (k.slice(o, o + 220).includes('mahallalar=')) ayblilar.push(yol);
      }
      if (ayblilar.length) console.log(`     иккита танлов: ${ayblilar.join(', ')}`);
      return ayblilar.length === 0;
    },
  },
  {
    nomi: 'Ҳисобот панелнинг қамровига ЕРГАШАДИ',
    tekshir: () =>
      /*
       * `useState` нинг бошланғич қиймати бир марта ўқилади.
       * Ҳоким МФЙ ни алмаштирганда компонент ўрнидан
       * кўчмайди — эски ҳудуд қотиб қоларди ва ҳисобот бошқа
       * жой бўйича юкланарди.
       */
      TUGMALAR.includes('setTanlangan(qamrov.mahallaId ?? \'\')') &&
      TUGMALAR.includes('}, [qamrov.mahallaId]);'),
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
