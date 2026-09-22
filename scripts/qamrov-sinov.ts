/**
 * ============================================================
 *  ПАНЕЛ ҚАМРОВИ — СИНОВ
 *
 *  Ҳоким, раҳбар ва администратор панелида МФЙ танланганда
 *  экрандаги ҲАММА рақам ўша МФЙ бўйича бўлиши керак.
 *
 *  ── Нега айнан бу синов ──
 *
 *  Бундай ўзгартириш тарқоқ: битта саҳифада ўнта сўров бор ва
 *  ҳар бирига қамровни бериш керак. Биттаси унутилса, экранда
 *  «Уйшун» деб ёзилган саҳифада туман бўйича сон туриб қолади
 *  — ва ҳоким уни ЎША МФЙ ники деб ўқийди. Бу нотўғри рақам
 *  эмас, НОТЎҒРИ ҚАРОР: субсидия бошқа маҳаллага кетади.
 *
 *  Кўз билан текшириш бунга ярамайди: рақам ишонарли кўринади.
 *  Шунинг учун қоида кодда текширилади — қаттиқ ёзилган туман
 *  номи ҳам, эски фильтр ҳам қолмаслиги керак.
 *
 *  ── Хавфсизлик ──
 *
 *  Иккинчи гуруҳ синовлар манзил қаторини текширади: маҳалла
 *  ходими `?mfy=` ёзиб қўшни МФЙ маълумотини оча олмаслиги
 *  керак. Бу — изоҳ эмас, ишлайдиган чегара бўлиши шарт.
 * ============================================================
 */

import { readFileSync } from 'node:fs';

type Sinov = { nomi: string; tekshir: () => boolean };

const oqi = (yol: string) => readFileSync(yol, 'utf8');

/** Изоҳларсиз код — изоҳдаги мисол қоидани буздирмасин */
function kodiOl(matn: string): string {
  return matn
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** Танлов ишлайдиган учта панел */
const PANELLAR = [
  'src/app/(ilova)/panel/page.tsx',
  'src/app/(ilova)/bandlik/page.tsx',
  'src/app/(ilova)/admin/page.tsx',
];

const QAMROV = oqi('src/lib/panel-qamrovi.ts');
const TANLASH = oqi('src/components/panel/mahalla-tanlash.tsx');
const QIDIRUV = oqi('src/lib/qidiruv.ts');

const SINOVLAR: Sinov[] = [
  /* ── Учала панелда ҳам бор ── */
  {
    nomi: 'Учала панел ҳам қамровни битта ёрдамчидан олади',
    tekshir: () =>
      PANELLAR.every((y) => {
        const k = kodiOl(oqi(y));
        return k.includes('panelQamroviniOl(sessiya, searchParams.mfy)');
      }),
  },
  {
    nomi: 'Учала панелда ҳам МФЙ танлаш тугмаси турибди',
    tekshir: () =>
      PANELLAR.every((y) => {
        const k = kodiOl(oqi(y));
        return k.includes('<MahallaTanlash') && k.includes('qamrov.tanlashMumkin');
      }),
  },
  {
    nomi: 'Манзилдаги `?mfy=` ўқилади — ҳавола бошқага юборилади',
    tekshir: () =>
      PANELLAR.every((y) => /searchParams:\s*\{[^}]*mfy\?:\s*string/.test(oqi(y))),
  },

  /* ── Ҳамма рақам қамровга ергашади ── */
  {
    nomi: 'Панелларда қаттиq ёзилган «Хатирчи тумани» қолмаган',
    tekshir: () => {
      const ayblilar = PANELLAR.filter((y) => kodiOl(oqi(y)).includes('Хатирчи тумани'));
      if (ayblilar.length) console.log(`     қаттиқ ном: ${ayblilar.join(', ')}`);
      return ayblilar.length === 0;
    },
  },
  {
    nomi: 'Ҳар бир панелда ҳудуд номи қамровдан олинади',
    tekshir: () => PANELLAR.every((y) => kodiOl(oqi(y)).includes('qamrov.nomi')),
  },
  {
    nomi: 'Эски `filtr.mahallaId` қолмаган — иккита манба бўлмасин',
    tekshir: () => {
      const ayblilar = PANELLAR.filter((y) => kodiOl(oqi(y)).includes('filtr.mahallaId'));
      if (ayblilar.length) console.log(`     эски фильтр: ${ayblilar.join(', ')}`);
      return ayblilar.length === 0;
    },
  },
  {
    nomi: 'Ҳоким панелида ҳар бир сўров қамров id сини олади',
    tekshir: () => {
      const k = kodiOl(oqi('src/app/(ilova)/panel/page.tsx'));
      return (
        k.includes('tahlilOl(mahallaId, davr)') &&
        k.includes('bolimlarTahlili(mahallaId)') &&
        k.includes('vaucherHisobi(mahallaId)') &&
        k.includes('vaucherNavbati(mahallaId, 10)')
      );
    },
  },
  {
    nomi: 'Раҳбар панелида навбат ва мослаштириш ҳам қамровда',
    tekshir: () => {
      const k = kodiOl(oqi('src/app/(ilova)/bandlik/page.tsx'));
      /* `filtr` энди қамровдан ясалади, қолган сўровлар ундан ўтади */
      return (
        k.includes('const filtr = mahallaId ? { mahallaId } : {};') &&
        k.includes('tahlilOl(mahallaId, davr)')
      );
    },
  },
  {
    nomi: 'Бошқарув панелидаги тўртта карта ҳам қамровда саналади',
    tekshir: () => {
      const k = kodiOl(oqi('src/app/(ilova)/admin/page.tsx'));
      return (
        k.includes('prisma.household.count({ where: mahallaShart })') &&
        k.includes('prisma.unemployedPerson.count({ where: mahallaShart })') &&
        k.includes('topshiriqQamrovi(mahallaId)') &&
        k.includes('prisma.vacancy.count({ where: { ...mahallaShart, ...FAOL_ELON() } })')
      );
    },
  },
  {
    nomi: 'Чора-тадбир шарти битта жойда — хонадон ҳам, фуқаро ҳам',
    tekshir: () =>
      QAMROV.includes('export function topshiriqQamrovi') &&
      QAMROV.includes('{ household: { mahallaId } }') &&
      QAMROV.includes('{ ishsiz: { mahallaId } }') &&
      kodiOl(oqi('src/app/(ilova)/chora-tadbirlar/page.tsx')).includes('topshiriqQamrovi('),
  },

  /* ── Сунъий интеллект ҳам танланган МФЙ бўйича ── */
  {
    nomi: 'AI хулосаси ҳам танланган МФЙ бўйича сўралади',
    tekshir: () =>
      PANELLAR.every((y) => /<AiXulosa\s+mahallaId=\{mahallaId\}/.test(kodiOl(oqi(y)))),
  },
  {
    nomi: 'Ҳисобот тугмалари ҳам танланган МФЙ ни олади',
    tekshir: () => {
      const k = kodiOl(oqi('src/app/(ilova)/panel/page.tsx'));
      return k.includes('qamrov={{ nomi: qamrov.nomi, mahallaId }}');
    },
  },

  /* ── Харита ── */
  {
    nomi: 'МФЙ танланганда харита туман бўйича қолади, танлангани ёлқинланади',
    tekshir: () => {
      /*
       * Хаританинг вазифаси «ҚАЕРДА» саволига жавоб бериш.
       * Уйшун танланганда ёлғиз Уйшун қолса, ўша савол
       * йўқолади — қўшнилар билан таққослаш имкони кетади.
       */
      const k = kodiOl(oqi('src/app/(ilova)/panel/page.tsx'));
      return (
        k.includes('xaritaMalumoti(qamrov.tanlashMumkin ? undefined : mahallaId)') &&
        k.includes('yolqinMahallaId={mahallaId ?? null}')
      );
    },
  },
  {
    nomi: 'МФЙ танланганда «барча маҳаллалар» жадвали яширилади',
    tekshir: () => {
      /* Битта МФЙ кесимида 70 сатрли жадвал маъносиз */
      const k = kodiOl(oqi('src/app/(ilova)/panel/page.tsx'));
      return (k.match(/\{!mahallaId && \(/g) ?? []).length >= 2;
    },
  },

  /* ── ХАВФСИЗЛИК ── */
  {
    nomi: 'Маҳалла ходимида `?mfy=` ишламайди — сессиядаги МФЙ мажбурий',
    tekshir: () => {
      /*
       * Ёрдамчи аввал `mahallaFiltri` ни ўқийди ва у қиймат
       * берса, `mfy` умуман КЎРИЛМАЙДИ. Шарт тартиби муҳим:
       * текшируви ҳам шу тартибга боғланган.
       */
      const majburiyOrni = QAMROV.indexOf('const majburiy = mahallaFiltri(sessiya).mahallaId');
      const qaytishOrni = QAMROV.indexOf('tanlashMumkin: false');
      const mfyOrni = QAMROV.indexOf('const soralgan = mfy?.trim()');
      return (
        majburiyOrni > 0 &&
        qaytishOrni > majburiyOrni &&
        mfyOrni > qaytishOrni
      );
    },
  },
  {
    nomi: 'Номаълум `?mfy=` хато эмас — туман кесимига тушади',
    tekshir: () =>
      QAMROV.includes('const topildi = mahallalar.find((m) => m.id === soralgan)') &&
      QAMROV.includes('return { nomi: TUMAN_NOMI, tanlashMumkin: true, mahallalar };'),
  },
  {
    nomi: 'Ходимда танлаш тугмаси умуман чизилмайди',
    tekshir: () =>
      PANELLAR.every((y) =>
        /\{qamrov\.tanlashMumkin && \(\s*<MahallaTanlash/.test(kodiOl(oqi(y)))
      ),
  },

  /* ── Танлов ойнаси ── */
  {
    nomi: 'Рўйхатда БАРЧА МФЙ бор — қисқартирилмаган',
    tekshir: () =>
      !/\.slice\(0,\s*\d+\)/.test(kodiOl(TANLASH)) &&
      TANLASH.includes('mahallalar.filter((m) => nomMos(m.nomiKirill, qidiruv))'),
  },
  {
    nomi: 'Қидирув бор ва иккала алифбода ишлайди',
    tekshir: () =>
      TANLASH.includes('nomMos') &&
      QIDIRUV.includes('qidiruvKaliti(lotinga(nomiKirill))'),
  },
  {
    nomi: 'Қидирувда апостроф талаб қилинмайди',
    tekshir: () => QIDIRUV.includes(".replace(/[''ʻʼ`´]/g, '')"),
  },
  {
    nomi: '«Ҳаммаси» доим кўринади — қидирув бўш натижа берса ҳам',
    tekshir: () => {
      const k = kodiOl(TANLASH);
      const hammasiOrni = k.indexOf("Ҳаммаси — туман бўйича");
      const bosOrni = k.indexOf('topilgan.length === 0');
      return hammasiOrni > 0 && bosOrni > hammasiOrni;
    },
  },
  {
    nomi: 'Танлов манзилда сақланади — ҳавола бошқа одамда ҳам очилади',
    tekshir: () =>
      TANLASH.includes("q.set('mfy', id)") && TANLASH.includes("q.delete('mfy')"),
  },
  {
    nomi: 'МФЙ алмашганда давр йўқолмайди',
    tekshir: () =>
      TANLASH.includes('new URLSearchParams(parametrlar.toString())'),
  },
  {
    nomi: 'Қидирув қоидаси битта жойда — харита ҳам ўшани ишлатади',
    tekshir: () => {
      const xarita = oqi('src/components/xarita/hudud-xaritasi.tsx');
      return (
        xarita.includes("from '@/lib/qidiruv'") &&
        !/const qidiruvKaliti =/.test(xarita)
      );
    },
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
