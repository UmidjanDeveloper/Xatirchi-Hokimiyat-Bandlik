/**
 * ============================================================
 *  МАҲАЛЛА ЖАДВАЛИ — СИНОВ
 *
 *  Ҳокимлик ҳар маҳалладан етти варақли жадвал сўрайди ва уни
 *  БОСИБ ЧИҚАРИБ имзолайди. Шунинг учун бу ерда иккита нарса
 *  текширилади:
 *
 *  1. АНДОЗА ЎЗГАРМАГАНМИ. Код андозанинг тузилишига қаттиқ
 *     боғланган: маълумот 6-қатордан бошланади, ҳар варақда
 *     аниқ сондаги устун бор. Ҳокимлик янги андоза юборса ва
 *     уни шунчаки алмаштириб қўйсак, қийматлар БИР УСТУНГА
 *     СУРИЛАРДИ — жадвал тўлиқ ва чиройли чиқарди, фақат
 *     «болалар сони» устунида «ишлайдиганлар» турарди.
 *
 *  2. БИРЛИК ЎГИРИШ. Анкета сотихда сўрайди, жадвал гектарда.
 *     Бир марта шу ўгириш унутилган ва ҳисоботда «95 га» деб
 *     турган эди — аслида 0,95 га. Ҳоким шу рақамга қараб
 *     субсидия режалаштиради.
 * ============================================================
 */

import { existsSync, readFileSync } from 'node:fs';
import XLSX from 'xlsx';
import { sotixdanGa, dollarga } from '../src/lib/hisobot/mahalla-jadvali';

type Sinov = { nomi: string; tekshir: () => boolean };

const oqi = (yol: string) => readFileSync(yol, 'utf8');

const ANDOZA = 'src/lib/hisobot/andoza/mahalla-jadvali.xlsx';
const MODUL = oqi('src/lib/hisobot/mahalla-jadvali.ts');
const YOL = oqi('src/app/api/hisobot/mahalla-jadvali/route.ts');
const TUGMA = oqi('src/components/panel/hisobot-tugmalari.tsx');
const PANEL = oqi('src/app/(ilova)/panel/page.tsx');
const ADMIN = oqi('src/app/(ilova)/admin/page.tsx');
const SOZLAMA = oqi('next.config.mjs');
const USTUNLAR = oqi('src/lib/hisobot/toliq-ustunlar.ts');

/**
 * Изоҳларсиз модул коди.
 *
 * Изоҳда «нега дискдан ўқилмайди» деб ёзилган ва унда
 * `readFile` сўзи бор. Матн бўйича текширув уни КОД деб
 * ўйлаб, тўғри ёзилган файлни айбдор қиларди.
 */
const MODUL_KODI = MODUL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Андозани ўқиб, ҳар варақнинг устун сонини беради */
function andozaUstunlari(): number[] {
  const wb = XLSX.readFile(ANDOZA);
  return wb.SheetNames.map((n) => {
    const ref = wb.Sheets[n]['!ref'];
    if (!ref) return 0;
    return XLSX.utils.decode_range(ref).e.c + 1;
  });
}

/** Коддаги `USTUN` доимийсидан сонларни ўқийди */
function koddagiUstunlar(): number[] {
  const blok = /const USTUN = \{([\s\S]*?)\} as const;/.exec(MODUL)?.[1] ?? '';
  return [...blok.matchAll(/:\s*(\d+),/g)].map((m) => Number(m[1]));
}

const SINOVLAR: Sinov[] = [
  /* ══ АНДОЗА ══ */
  {
    nomi: 'Андоза файли репода турибди',
    tekshir: () => existsSync(ANDOZA),
  },
  {
    nomi: 'Андозада еттита варақ бор',
    tekshir: () => XLSX.readFile(ANDOZA).SheetNames.length === 7,
  },
  {
    nomi: 'Ҳар варақнинг устун сони код билан МОС',
    tekshir: () => {
      /*
       * Энг муҳим текширув. Мос келмаса қийматлар бир
       * устунга сурилади ва буни кўз билан топиб бўлмайди:
       * жадвал тўлиқ ва чиройли чиқади.
       */
      const andoza = andozaUstunlari();
      const kod = koddagiUstunlar();
      if (andoza.length !== kod.length) {
        console.log(`     варақ сони: андозада ${andoza.length}, кодда ${kod.length}`);
        return false;
      }
      const farq = andoza
        .map((a, i) => (a === kod[i] ? null : `${i + 1}-варақ: андоза ${a}, код ${kod[i]}`))
        .filter(Boolean);
      if (farq.length) console.log(`     ${farq.join('; ')}`);
      return farq.length === 0;
    },
  },
  {
    nomi: 'Маълумот 6-қатордан бошланади — сарлавҳа устига ёзилмайди',
    tekshir: () => {
      /*
       * Андозада 1-2 сарлавҳа, 3-5 уч қаватли устун номлари.
       * 6-қатордан тартиб рақами бошланади.
       */
      const wb = XLSX.readFile(ANDOZA);
      const sh = wb.Sheets[wb.SheetNames[0]];
      return sh['A6']?.v === 1 && MODUL.includes('const BOSHLANISH = 6;');
    },
  },
  {
    nomi: 'Андозадаги тайёр қатор сони код билан мос',
    tekshir: () => {
      const wb = XLSX.readFile(ANDOZA);
      const sh = wb.Sheets[wb.SheetNames[0]];
      const oxiri = XLSX.utils.decode_range(sh['!ref'] as string).e.r + 1;
      const kod = Number(/const ANDOZA_QATORI = (\d+);/.exec(MODUL)?.[1] ?? 0);
      return oxiri - 6 + 1 === kod;
    },
  },
  {
    nomi: 'Устунлар сони мос келмаса файл УМУМАН тайёрланмайди',
    tekshir: () =>
      /*
       * Жим сурилиш ўрнига баланд хато. Ходим уни дарҳол
       * кўради ва андоза янгиланганини билади.
       */
      MODUL.includes('if (varaq.columnCount !== ustunSoni) {') &&
      MODUL.includes('if (q.length !== ustunSoni - 1) {') &&
      MODUL.includes('throw new Error('),
  },

  /* ══ БИРЛИК ЎГИРИШ ══ */
  {
    nomi: 'Сотих гектарга тўғри ўгирилади (1 га = 100 сотих)',
    tekshir: () =>
      sotixdanGa(100) === 1 &&
      sotixdanGa(12.6) === 0.126 &&
      sotixdanGa(0) === 0 &&
      sotixdanGa(null) === null &&
      sotixdanGa(undefined) === null,
  },
  {
    nomi: 'Ўгириш 100 БАРАВАР хато бермайди',
    tekshir: () => {
      /* «95 сотих» ҳеч қачон «95 га» бўлиб чиқмасин */
      const n = sotixdanGa(95);
      return n !== null && n < 1 && n === 0.95;
    },
  },
  {
    nomi: 'Томорқа СОТИХДА қолади — у варақ сотих сўрайди',
    tekshir: () =>
      /*
       * 5-варақ сарлавҳасида «Таморқа майдони (сотих)»
       * ёзилган, 4-варақда эса «(га)». Иккови АДАШТИРИЛМАСИН.
       */
      MODUL.includes('x.tomorqaMaydoni,') && !MODUL.includes('sotixdanGa(x.tomorqaMaydoni)'),
  },
  {
    nomi: 'Ажратилган ер ГЕКТАРГА ўгирилади',
    tekshir: () => MODUL.includes('sotixdanGa(x.qoshimchaYerMaydoni)'),
  },
  {
    nomi: 'Чет эл даромади долларга ўгирилади',
    tekshir: () =>
      dollarga(12_600_000n, 'UZS') === 1000 &&
      dollarga(1000, 'USD') === 1000 &&
      dollarga(null, 'USD') === null,
  },

  /* ══ ТЎЛДИРИБ БЎЛМАЙДИГАН УСТУНЛАР ══ */
  {
    nomi: 'Анкетада йўқ устун ТАХМИН билан тўлдирилмайди',
    tekshir: () =>
      /*
       * Бўш катак — «маълумот йўқ». Нол эса «шундай одам
       * йўқ» дегани. Иккови БОШҚА нарса ва ҳоким уларни
       * бошқача ўқийди.
       */
      MODUL.includes("null, // иш билан банд лекин даромади паст — анкетада йўқ") &&
      MODUL.includes('null, // коллеж талабалари — анкетада йўқ') &&
      MODUL.includes("null, // отлар — анкетада йўқ"),
  },
  {
    nomi: 'Ҳар варақ тагида ИЗОҲ бор — бўш устун сабаби ёзилади',
    tekshir: () => {
      /* Изоҳсиз ҳужжат ёлғон гапирарди: бўш устунни ўқиган
         одам «демак бундай оила йўқ» деб тушунарди. */
      const soni = (MODUL.match(/Рўйхат|Рўйхатда|Бу варақ|Хатлов миграцияни/g) ?? []).length;
      return MODUL.includes('const katak = izohQatori.getCell(1);') && soni >= 7;
    },
  },
  {
    nomi: 'Тўлдириб бўлмайдиган икки варақ СОХТА маълумот билан тўлмайди',
    tekshir: () =>
      /*
       * Тадбиркорлар варағини «истак билдирганлар» билан
       * тўлдириш мумкин эди, аммо ҳоким уларни фаолият
       * юритаётган субъект деб ўқирди.
       */
      MODUL.includes('USTUN.tadbirkor,\n    [],') &&
      MODUL.includes('USTUN.boshObyekt,\n    [],'),
  },
  {
    nomi: 'Миграция қатори ОИЛА экани очиқ ёзилади',
    tekshir: () =>
      /*
       * Хатлов миграцияни хонадон кесимида сўрайди. Устунга
       * битта исм ёзиб қўйилса, ҳоким уни ўша одам деб
       * ўқиган бўларди.
       */
      MODUL.includes('`${x.oilaBoshligi} оиласи`') &&
      MODUL.includes('оиладан ${x.chetElIshchilar} киши'),
  },
  {
    nomi: 'Касб устуни фақат фуқаро анкетаси тўлдирилганда чиқади',
    tekshir: () =>
      /* Нол ёзиш «ҳаммасининг касби йўқ» деган ёлғон берарди */
      MODUL.includes('bogliq.length ? kasbli : null') &&
      MODUL.includes('bogliq.length ? bogliq.length - kasbli : null'),
  },

  /* ══ МАЪЛУМОТ ТАНЛАШ ══ */
  {
    nomi: 'Фақат ЮБОРИЛГАН хатлов олинади — қоралама тушмайди',
    tekshir: () => MODUL.includes("holati: { not: 'QORALAMA' as const }"),
  },
  {
    nomi: 'Маълумот даражаси КИРИЛЛДА таққосланади — апостроф муаммоси бўлмасин',
    tekshir: () =>
      /*
       * Каталогдаги апостроф типографик (U+2019),
       * клавиатурадагиси оддий. Кўзга бир хил, `===` учун
       * эмас.
       */
      MODUL.includes('kirillcha(MALUMOT, malumoti) === MALUMOT_DARAJASI[daraja]'),
  },

  /* ══ ИККИТА ҚАМРОВ: МФЙ ВА ТУМАН ══ */
  {
    nomi: 'Туман бўйича ҳам жадвал тузилади — маҳалла ихтиёрий',
    tekshir: () =>
      MODUL.includes('export async function mahallaJadvali(mahallaId?: string)') &&
      YOL.includes('mahallaId: z.string().cuid().nullish()'),
  },
  {
    nomi: 'Туман кесимида тугма БОСИЛАДИ',
    tekshir: () => {
      /*
       * Илгари тугма фақат МФЙ танланганда ишларди ва ҳоким
       * туман бўйича йиғма нусхани умуман ололмасди.
       */
      const o = TUGMA.indexOf('onClick={() => void jadvalOl()}');
      if (o < 0) return false;
      return !TUGMA.slice(o, o + 200).includes('!joriyMahalla');
    },
  },
  {
    nomi: 'Тугма номи ҚАЙСИ ҲУЖЖАТ тушишини айтади',
    tekshir: () =>
      /*
       * «Маҳалла жадвали» деб турган тугма туман бўйича файл
       * берса, ходим уни нотўғри жойга юборарди.
       */
      TUGMA.includes("{joriyMahalla ? tr('Маҳалла жадвали') : tr('Туман жадвали')}"),
  },
  {
    nomi: 'Жадвалда АЖРАТУВЧИ қатор йўқ — андоза шакли сақланади',
    tekshir: () => {
      /*
       * Бир марта туман кесимида ҳар МФЙ олдига номи ёзилган
       * сарлавҳа қатори қўйилган эди. Ўқиш учун қулай, аммо
       * ҲОКИМЛИК КУТГАН ШАКЛДАН чиқиб кетарди: андозада бундай
       * қатор йўқ ва ҳужжат шу шакл билан солиштирилади.
       *
       * «Тузукроқ» қилиш ҳуқуқимиз йўқ — шакл ўзгарса, ҳужжат
       * қайтариб юборилади.
       */
      return (
        !MODUL_KODI.includes('mergeCells(r, 1, r, ustunSoni)') &&
        !MODUL.includes('МФЙ — ${') &&
        !MODUL_KODI.includes('interface Guruh')
      );
    },
  },
  {
    nomi: 'Тартиб рақами узлуксиз: 1 дан охиригача',
    tekshir: () =>
      /*
       * Блокларга бўлинганда рақам ҳар блокда янгидан
       * бошланарди. Энди битта узлуксиз рўйхат.
       */
      MODUL_KODI.includes('const qator = BOSHLANISH + i;') &&
      MODUL_KODI.includes('q.getCell(1).value = i + 1;'),
  },
  {
    nomi: 'Туман кесимида қаторлар МФЙ бўйича тартибланади',
    tekshir: () =>
      /*
       * Ажратувчи қатор йўқ, аммо тартиб бор: бир маҳалланинг
       * қаторлари ёнма-ён туради.
       */
      MODUL.includes("orderBy: [{ mahalla: { nomi: 'asc' } }, { oilaBoshligi: 'asc' }]") &&
      MODUL.includes("orderBy: [{ mahalla: { nomi: 'asc' } }, { fish: 'asc' }]"),
  },
  {
    nomi: 'Қайси қатор қайси МФЙ дан экани изоҳда АЙТИЛАДИ',
    tekshir: () =>
      /*
       * Андоза варақларида «маҳалла» устуни йўқ, шунинг учун
       * жадвал тагидаги изоҳ ўқувчини тўлиқ варақларга
       * йўллайди — у ерда «МФЙ» устуни бор.
       */
      MODUL.includes('«Хонадонлар — тўлиқ» ва «Ишсизлар — тўлиқ» варақларидаги «МФЙ» устунида'),
  },
  {
    nomi: 'Туман сарлавҳаси уч хил қўшимчага мос ўгирилади',
    tekshir: () =>
      /*
       * Етти варақ сарлавҳаси уч хил қўшимча билан ёзилган:
       * «маҳалласи», «маҳалласида», «маҳалласидаги». Биттаси
       * билан алмаштирилса гап бузиларди.
       */
      MODUL.includes('барча маҳаллаларидаги') &&
      MODUL.includes('барча маҳаллаларида') &&
      MODUL.includes('барча маҳаллалари') &&
      /маҳалласидаги[\s\S]{0,400}маҳалласида[\s\S]{0,400}маҳалласи\//.test(MODUL),
  },
  {
    nomi: 'Файл номи қамровни айтади — туман ва МФЙ адашмасин',
    tekshir: () => YOL.includes("${mahallaId ? 'mahalla' : 'tuman'}-jadvali-"),
  },

  /* ══ ҲАЖМ ══ */
  {
    nomi: 'Жуда катта жадвал ЯРИМ тайёрланмайди — аниқ хабар берилади',
    tekshir: () => {
      /*
       * Ярим жадвал ҳокимлик ҳужжати сифатида ишламайди:
       * қайси МФЙ тушиб қолганини ҳеч ким билмасди.
       */
      const chegara = Number(/const ENG_KOP_QATOR = ([\d_]+);/.exec(MODUL)?.[1].replace(/_/g, '') ?? 0);
      return (
        chegara >= 10_000 &&
        chegara <= 30_000 &&
        MODUL.includes('if (jamiQator > ENG_KOP_QATOR)') &&
        MODUL.includes('МФЙ ни танлаб, жадвални маҳалла кесимида олинг')
      );
    },
  },
  {
    nomi: 'Чегара БУТУН КИТОБ бўйича, варақма-варақ эмас',
    tekshir: () =>
      /*
       * Ҳар варақда алоҳида текширилса, бештаси 24 000 тадан
       * бўлса ҳам ўтиб кетарди — жами 120 000 қатор.
       */
      MODUL.includes('const jamiQator = xonadonlar.length * 2 + ishsizlar.length * 2;'),
  },
  {
    nomi: 'Чегара ЁЗИШДАН ОЛДИН текширилади',
    tekshir: () => {
      const chegaraOrni = MODUL.indexOf('if (jamiQator > ENG_KOP_QATOR)');
      const yozishOrni = MODUL.indexOf('kitob.xlsx.load(ANDOZA_BAYTI)');
      return chegaraOrni > 0 && chegaraOrni < yozishOrni;
    },
  },
  {
    nomi: 'Чегара хабари ЭКРАНГА чиқади, ичкарида қолиб кетмайди',
    tekshir: () =>
      MODUL.includes('export class JadvalXatosi') &&
      YOL.includes('if (e instanceof JadvalXatosi)'),
  },
  {
    nomi: 'Безак НУСХАЛАНМАЙДИ — катта жадвалда хотира етсин',
    tekshir: () =>
      /*
       * `{ ...asl.style }` билан 45 мингта қатор 633 МБ
       * оларди; ҳавола билан 559 МБ ва икки баравар тез.
       */
      MODUL.includes('q.getCell(u).style = namuna.getCell(u).style;') &&
      !MODUL.includes('{ ...namuna.getCell(u).style }'),
  },

  /* ══ АНДОЗА ШАКЛИ БУЗИЛМАСИН ══ */
  {
    nomi: 'Андоза сарлавҳаси (3–5-қатор) БИТТА БЕЛГИ ҳам ўзгармайди',
    tekshir: () => {
      /*
       * Жадвал ҳокимликка топширилади ва улар уни ўзлари
       * юборган шакл билан солиштиради. Устун номи ёки
       * бирлаштириш ўзгарса, ҳужжат қайтариб юборилади.
       *
       * Бу текширув фақат кодни эмас, ҲАҚИҚИЙ ФАЙЛНИ
       * текширади: андоза ўқилади ва устун номлари
       * солиштирилади.
       */
      const wb = XLSX.readFile(ANDOZA);
      const ayblilar: string[] = [];

      for (const nom of wb.SheetNames) {
        const sh = wb.Sheets[nom];
        const ref = sh['!ref'];
        if (!ref) continue;
        const r = XLSX.utils.decode_range(ref);

        /* Маълумот 6-қатордан бошланади — сарлавҳа 3–5 да */
        let nomlar = 0;
        for (let c = r.s.c; c <= r.e.c; c++) {
          for (let qr = 2; qr <= 4; qr++) {
            const k = XLSX.utils.encode_cell({ r: qr, c });
            if ((sh[k] as { v?: unknown } | undefined)?.v) nomlar++;
          }
        }
        if (nomlar === 0) ayblilar.push(`${nom}: сарлавҳа топилмади`);
      }

      if (ayblilar.length) console.log(`     ${ayblilar.join('; ')}`);
      return ayblilar.length === 0;
    },
  },
  {
    nomi: 'Андоза варағида сарлавҳа қаторларига ЁЗИЛМАЙДИ',
    tekshir: () => {
      /*
       * `varaqniToldir` — АНДОЗА варақларига тегадиган ягона
       * функция. Ундаги ҳар бир `getRow` 6-қатордан пастга
       * ишлаши керак: 1–2 сарлавҳа, 3–5 устун номлари, ва
       * уларга ёзилса ҳокимлик шакли бузиларди.
       *
       * (`toliqVaraq` даги `getRow(1)` бошқа масала: у ЎЗИМИЗ
       * яратган янги варақнинг сарлавҳаси.)
       */
      const bosh = MODUL_KODI.indexOf('function varaqniToldir');
      const oxir = MODUL_KODI.indexOf('function toliqVaraq');
      if (bosh < 0 || oxir < 0 || oxir < bosh) return false;
      const tana = MODUL_KODI.slice(bosh, oxir);

      const chaqiruvlar = [...tana.matchAll(/getRow\(([^)]*)\)/g)].map((m) =>
        m[1].replace(/\s+/g, ' ').trim()
      );
      /* Барчаси BOSHLANISH дан ҳисобланган ўзгарувчи бўлиши керак */
      const ruxsat = ['BOSHLANISH', 'qator', 'b', 'izohOrni'];
      const ayblilar = chaqiruvlar.filter((c) => !ruxsat.includes(c));
      if (ayblilar.length) console.log(`     шубҳали getRow: ${ayblilar.join(', ')}`);
      return (
        ayblilar.length === 0 &&
        tana.includes('const qator = BOSHLANISH + i;') &&
        /* Тозалаш ҳалқаси ҳам 6-қатордан бошланади */
        tana.includes('for (let b = r; b <= oxirgiTayyor; b++)')
      );
    },
  },

  /* ══ ТЎЛИҚ МАЪЛУМОТ ВАРАҚЛАРИ ══ */
  {
    nomi: 'Китобда анкетанинг БАРЧА майдони бор',
    tekshir: () =>
      /*
       * Ҳокимлик андозаси анкетанинг ҳаммасини сўрамайди:
       * унда «коллеж талабалари» бор, «ичимлик суви» йўқ.
       * Ҳокимга эса баъзан анкетанинг ўзи керак.
       */
      MODUL.includes("toliqVaraq(kitob, 'Хонадонлар — тўлиқ', XONADON_USTUNLARI, xonadonlar)") &&
      MODUL.includes("toliqVaraq(kitob, 'Ишсизлар — тўлиқ', FUQARO_USTUNLARI, ishsizlar)"),
  },
  {
    nomi: 'Тўлиқ варақлар андозадан КЕЙИН қўшилади',
    tekshir: () => {
      /* Ҳокимлик очганда биринчи етти варақни кўриши керак */
      const andoza = MODUL.indexOf('USTUN.boshObyekt');
      const toliq = MODUL.indexOf('toliqVaraq(kitob');
      return andoza > 0 && toliq > andoza;
    },
  },
  {
    nomi: 'Андоза варақларига ТЕГИЛМАЙДИ — китобга қўшилади',
    tekshir: () =>
      /* `addWorksheet` — янги варақ; мавжудлари ўзгармайди */
      MODUL.includes('kitob.addWorksheet(nomi'),
  },
  {
    nomi: 'Тўлиқ варақда сарлавҳа музлатилган ва фильтр бор',
    tekshir: () =>
      MODUL.includes("state: 'frozen'") && MODUL.includes('v.autoFilter = {'),
  },
  {
    nomi: 'Хатловнинг ҳар бўлими тўлиқ варақда вакил қилинган',
    tekshir: () => {
      /*
       * Ўн икки бўлимнинг бирортаси тушиб қолса, «барча
       * маълумот» деган ваъда ёлғон бўларди.
       */
      const kerak = [
        'Жами аъзо',            // 0-бўлим
        'Меҳнатга лаёқатли',    // I
        'Тадбиркорлик истаги',  // II
        'Чет элда меҳнат',      // II-Б
        'Ойлик даромад (сўм)',  // III
        'Мактабгача ёшдаги бола', // IV
        'Узоқ даволаниш зарур', // V
        'Ичимлик суви',         // VI
        'Ногиронлик бор',       // VII
        'Ҳужжатлар тўлиқ',      // VIII
        'Томорқа бор',          // IX
        'Қўшимча даромад истаги', // X
        'Инфратузилма муаммолари', // XI
        'Розилик берди',        // XII
      ];
      const yoq = kerak.filter((k) => !USTUNLAR.includes(`nomi: '${k}'`));
      if (yoq.length) console.log(`     тўлиқ варақда йўқ: ${yoq.join(', ')}`);
      return yoq.length === 0;
    },
  },
  {
    nomi: 'Тўлиқ варақда қийматлар КИРИЛЛГА ўгирилади',
    tekshir: () =>
      /*
       * База лотинда сақлайди («Erkak», «O'rta maxsus»).
       * Хом қиймат чиқарилса, битта файлда иккита ёзув
       * аралашиб кетарди.
       */
      USTUNLAR.includes('kat(JINS)') &&
      USTUNLAR.includes('kat(MALUMOT)') &&
      USTUNLAR.includes('katRoyxat(KAMBAGALLIK_SABABI)') &&
      USTUNLAR.includes("XATLOV_HOLATI[String(x.holati)]"),
  },
  {
    nomi: 'Каталогда топилмаган қиймат ЙЎҚОЛМАЙДИ',
    tekshir: () =>
      /* Эски анкетадаги қиймат ўзгармай қолиши керак */
      USTUNLAR.includes('return kirillcha(katalog, String(x));'),
  },

  /* ══ ХАВФСИЗЛИК ══ */
  {
    nomi: 'Жадвал ФАҚАТ ҳоким ва администраторга очиқ',
    tekshir: () =>
      /*
       * Ичида бутун маҳалла бўйича Ф.И.Ш. рўйхати бор.
       * Бандлик мутахассиси ва маҳалла ходими ололмайди.
       */
      YOL.includes("talabQil(['HOKIM', 'ADMIN'])"),
  },
  {
    nomi: 'Тугма фақат ҳоким ва админ панелида',
    tekshir: () =>
      PANEL.includes("mahallaJadvali={sessiya.rol === 'HOKIM' || sessiya.rol === 'ADMIN'}") &&
      ADMIN.includes('mahallaJadvali'),
  },
  {
    nomi: 'Файл номи фақат лотин ҳарфларида',
    tekshir: () =>
      /* Кирилл номли юклама Windows ва Telegram да бузилади */
      YOL.includes("replace(/[^a-z0-9]+/g, '-')"),
  },

  /* ══ ЖОЙЛАШТИРИШ ══ */
  {
    nomi: 'Андоза КОДДАН келади — дискдан ўқилмайди',
    tekshir: () =>
      /*
       * Серверсиз функцияга қайси файл тушишини Next.js ҳал
       * қилади ва кодда ёзилмаган файл умуман тушмаслиги
       * мумкин. Base64 сатр эса коднинг ўзи — бандлер уни
       * ҳар доим олиб кетади.
       */
      MODUL.includes("import { ANDOZA_BAYTI } from './andoza/andoza-fayli'") &&
      MODUL.includes('kitob.xlsx.load(ANDOZA_BAYTI)') &&
      /* Изоҳда «нега дискдан ўқилмайди» деб ёзилган — код текширилади */
      !MODUL_KODI.includes('readFile(') &&
      !MODUL_KODI.includes('process.cwd()'),
  },
  {
    nomi: 'Коддаги андоза `.xlsx` файл билан БИР ХИЛ',
    tekshir: () => {
      /*
       * Иккови ажралиб кетиши мумкин: кимдир `.xlsx` ни
       * алмаштириб, `npm run andoza` ни унутади. Унда жадвал
       * ЭСКИ андоза билан тўлдириларди ва буни ҳеч ким
       * сезмасди.
       */
      const xom = readFileSync(ANDOZA);
      const kod = oqi('src/lib/hisobot/andoza/andoza-fayli.ts');
      const bolaklar = [...kod.matchAll(/'([A-Za-z0-9+/=]+)',/g)].map((m) => m[1]).join('');
      return Buffer.from(bolaklar, 'base64').equals(xom);
    },
  },
  {
    nomi: 'vercel.json да СИНАЛМАГАН `functions` созламаси йўқ',
    tekshir: () => {
      /*
       * Бу ерда бир марта бутун сайт тўхтаб қолган.
       *
       * `functions` калитига «app/api/.../route.js» деб
       * ёзилган эди, лойиҳада эса `src/app/` ва `.ts`.
       * Vercel бундай нақшни рад этади ва БУТУН жойлаштириш
       * йиқилади — фақат битта тугма эмас.
       *
       * Созламани бу ерда синаб кўриб бўлмайди, шунинг учун
       * у умуман ишлатилмайди: муддат route файлининг ўзида
       * (`export const maxDuration`), хотира эса қатор
       * чегараси билан ҳал қилинади.
       */
      const v = JSON.parse(oqi('vercel.json')) as Record<string, unknown>;
      return !('functions' in v);
    },
  },
  {
    nomi: 'Муддат route файлининг ЎЗИДА белгиланган',
    tekshir: () => YOL.includes('export const maxDuration = 60;'),
  },

  /* ══ ҚЎШИМЧА ══ */
  {
    nomi: 'Ҳар варақдаги ёзув сони экранга қайтарилади',
    tekshir: () =>
      YOL.includes("'X-Jadval-Sanoq'") && TUGMA.includes("javob.headers.get('X-Jadval-Sanoq')"),
  },
  {
    nomi: 'Сарлавҳадаги маҳалла номи алмаштирилади',
    tekshir: () =>
      MODUL.includes('function sarlavhaniYangila') &&
      MODUL.includes('matn.replace(/"[^"]*"/, `"${mahallaNomi}"`)'),
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
