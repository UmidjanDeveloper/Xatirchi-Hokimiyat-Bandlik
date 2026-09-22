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
    nomi: 'Маҳалла МАЖБУРИЙ — туман бўйича жадвал тузилмайди',
    tekshir: () => YOL.includes('mahallaId: z.string().cuid(),'),
  },
  {
    nomi: 'Тугма фақат ҳоким ва админ панелида',
    tekshir: () =>
      PANEL.includes("mahallaJadvali={sessiya.rol === 'HOKIM' || sessiya.rol === 'ADMIN'}") &&
      ADMIN.includes('mahallaJadvali'),
  },
  {
    nomi: 'Маҳалла танланмаса тугма босилмайди',
    tekshir: () => TUGMA.includes('|| !joriyMahalla'),
  },
  {
    nomi: 'Файл номи фақат лотин ҳарфларида',
    tekshir: () =>
      /* Кирилл номли юклама Windows ва Telegram да бузилади */
      YOL.includes("replace(/[^a-z0-9]+/g, '-')"),
  },

  /* ══ ЖОЙЛАШТИРИШ ══ */
  {
    nomi: 'Андоза серверсиз функцияга ҚЎШИЛАДИ',
    tekshir: () => {
      /*
       * Next.js функцияга фақат код боғланишларини қўшади.
       * Бусиз илова маҳаллий машинада ишлар, Vercel да эса
       * «ENOENT» берарди — ва буни фақат ҳоким тугмани
       * босганда билардик.
       */
      if (!SOZLAMA.includes('outputFileTracingIncludes')) return false;
      if (!SOZLAMA.includes("'/api/hisobot/mahalla-jadvali'")) return false;
      /* Қурилгандан кейин изда ҳам бўлиши керак */
      const iz = '.next/server/app/api/hisobot/mahalla-jadvali/route.js.nft.json';
      if (!existsSync(iz)) return true; // ҳали қурилмаган — бу синов эмас
      const d = JSON.parse(oqi(iz)) as { files: string[] };
      return d.files.some((f) => f.includes('andoza/mahalla-jadvali.xlsx'));
    },
  },
  {
    nomi: 'Андоза ўқилиши `process.cwd()` дан — нисбий йўл эмас',
    tekshir: () => MODUL.includes("path.join(process.cwd(), 'src/lib/hisobot/andoza/mahalla-jadvali.xlsx')"),
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
      MODUL.includes("matn.replace(/\"[^\"]*\"/, `\"${yangi}\"`)"),
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
