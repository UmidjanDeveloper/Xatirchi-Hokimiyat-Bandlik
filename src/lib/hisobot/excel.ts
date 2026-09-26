/**
 * ============================================================
 *  EXCEL ҲИСОБОТ — устида ИШЛАШ учун
 *
 *  PDF ўқиш учун, Excel ишлаш учун. Ҳокимият аппарати рақамларни
 *  ўз жадвалига кўчиради, вилоятга юборади, устидан ўзи
 *  ҳисоб-китоб қилади. Шунинг учун бу ерда расм эмас, ТИРИК
 *  маълумот бўлиши керак.
 *
 *  ── Диаграммалар расм эмас ──
 *
 *  `excel-charts.ts` файл ичига ҳақиқий OOXML диаграммаларини
 *  жойлайди. Фойдаланувчи устига босиб рангини ўзгартиради,
 *  маълумотини кўради, Word ёки PowerPoint га нусха олади —
 *  презентация учун айнан шу керак.
 *
 *  Диаграмма ЎЗ БЎЛИМИНИНГ варағида турибди, алоҳида «Графиклар»
 *  варағида эмас: жадвал бир варақда, унинг диаграммаси
 *  бошқасида бўлса, иккисини ёнма-ён қўйиб бўлмайди.
 *
 *  ── Варақлар ──
 *
 *    Муқова     Сарлавҳа, ҳудуд, сана, асосий рақамлар
 *    Хулоса     Ҳолат ва тавсиялар — йиғилишда ўқиладигани
 *    Мундарижа  Варақлар рўйхати ва ҳар бирида нима бор
 *    ...        Ҳар бўлим — ўз варағи: кўрсаткич, жадвал, диаграмма
 *
 *  ── Варақ номи ──
 *
 *  Excel да варақ номи 31 белгидан узун бўлмайди ва
 *  `: \\ / ? * [ ]` белгиларини қабул қилмайди. Диаграмма
 *  диапазонлари ҳам варақ номига боғланади, шунинг учун ном
 *  БИР МАРТА тозаланади ва ҳамма жойда шу ишлатилади.
 * ============================================================
 */
import { CHART_COLORS, CHART_RAMP, injectChartsMulti, type ChartGuruhi, type ChartSpec } from '@/lib/excel-charts';
import { lotinga } from '@/lib/alifbo';
import type { Bolim, Diagramma, Hisobot } from './turlar';
import { sanaQisqa } from './sana';

/** Excel да варақ номига рухсат этилмаган белгилар */
const TAQIQLANGAN = /[:\\/?*[\]]/g;

/**
 * Варақ номини тозалайди ва такрорланмаслигини таъминлайди.
 *
 * Такрор ном билан варақ қўшилса Excel файлни умуман очмайди —
 * «файл бузилган» деб ёзади ва сабабини айтмайди. Шунинг учун
 * охирига рақам қўшилади.
 */
function varaqNomi(xom: string, band: Set<string>): string {
  let nom = xom.replace(TAQIQLANGAN, ' ').trim().slice(0, 31) || 'Varaq';
  if (!band.has(nom)) {
    band.add(nom);
    return nom;
  }
  for (let i = 2; i < 100; i++) {
    const urinish = `${nom.slice(0, 31 - String(i).length - 1)} ${i}`;
    if (!band.has(urinish)) {
      band.add(urinish);
      return urinish;
    }
  }
  band.add(nom);
  return nom;
}

/** A, B, ... Z, AA — устун ҳарфи */
function ustunHarfi(i: number): string {
  let n = i;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/**
 * Матндаги рақамни сонга қайтаради.
 *
 * Жадваллар PDF учун АЛЛАҚАЧОН форматланган («1 751», «24,5%»).
 * Excel да эса устида ҳисоб-китоб қилиш керак, шунинг учун сон
 * ажратилади. Ажратиб бўлмаса — матн ўз ҳолида қолади.
 */
function songaQaytar(v: string | number): string | number {
  if (typeof v === 'number') return v;
  const s = v.trim();
  if (!s || s === '—') return '';

  // «24,5%» -> 24.5 ; «1 751» -> 1751 ; «12,5 га» -> matn qoladi
  const foizmi = s.endsWith('%');
  const tozalangan = (foizmi ? s.slice(0, -1) : s)
    .replace(/[   \s]/g, '')
    .replace(',', '.');

  if (/^-?\d+(\.\d+)?$/.test(tozalangan)) {
    const n = Number(tozalangan);
    return foizmi ? n : n;
  }
  return v;
}

/** Диаграмма турини OOXML турига ўгиради */
function chartTuri(t: Diagramma['turi']): ChartSpec['kind'] {
  switch (t) {
    case 'doira':
      return 'pie';
    case 'chiziq':
      return 'line';
    case 'gorizontal':
      return 'bar';
    default:
      return 'column';
  }
}

/* ═══════════════════════════════════════════════════════════ */

/**
 * Китоб байтларини яратади — файлни САҚЛАМАЙДИ.
 *
 * Сақлаш браузерга боғланган (`Blob`, `URL`, `<a download>`), бу
 * қисм эса боғланмаган. Ажратилгани учун Node дан ҳам чақирилади:
 * `scripts/hisobot-chiqar.ts` айнан шу функцияни ишлатади, яъни
 * текширилаётган файл ходим юклаб оладиган файлнинг НУСХАСИ эмас,
 * ўзи бўлади.
 */
export async function excelBayt(m: Hisobot): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');

  /**
   * Китобнинг ЎЗ ёзувларини танланган алифбога ўгиради.
   *
   * Маълумот қаторлари серверда аллақачон ўгирилган, аммо бу
   * файлдаги устун сарлавҳалари ва варақ номлари кириллда
   * терилган. Улар шу ердан ўтади, акс ҳолда битта китобда
   * икки алифбо аралашади.
   */
  const a = m.lotin ? lotinga : (matn: string) => matn;

  const kitob = XLSX.utils.book_new();
  const band = new Set<string>();
  const guruhlar: ChartGuruhi[] = [];
  /** Мундарижа учун: варақ номи → нима бор */
  const mundarija: [string, string][] = [];

  const sana = sanaQisqa(m.sana);

  /* ── 1. Муқова ─────────────────────────────────────────────── */
  const muqovaNomi = varaqNomi(a('Муқова'), band);
  const muqova: (string | number)[][] = [
    [m.sarlavha],
    [m.ostSarlavha],
    [m.qamrovNomi],
    [],
    [a('Санаси'), sana],
    [a('Тайёрлади'), m.tayyorlagan],
    [],
    [a('АСОСИЙ КЎРСАТКИЧЛАР')],
    [a('Кўрсаткич'), a('Қиймат'), a('Изоҳ')],
    ...m.bosh.map((k) => [k.nomi, songaQaytar(k.qiymat), k.izoh ?? '']),
    [],
    [a('ҲИСОБОТ АСОСИ')],
    [a('Хатловдан ўтган хонадон'), m.asos.xonadon],
    [a('Ишсиз фуқаро ёзуви'), m.asos.fuqaro],
    [a('Чора-тадбир'), m.asos.topshiriq],
    [a('Бўш иш ўрни'), m.asos.ishOrni],
    [],
    [
      a('Барча фоизлар шу асосга нисбатан ҳисобланган. Шахсий маълумот (Ф.И.Ш., манзил, телефон) ҳисоботга киритилмайди.'),
    ],
  ];
  const v1 = XLSX.utils.aoa_to_sheet(muqova);
  v1['!cols'] = [{ wch: 46 }, { wch: 18 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(kitob, v1, muqovaNomi);
  mundarija.push([muqovaNomi, a('Сарлавҳа, ҳудуд, сана ва асосий кўрсаткичлар')]);

  /* ── 2. Хулоса ва тавсиялар ───────────────────────────────── */
  const xulosaNomi = varaqNomi(a('Хулоса ва тавсиялар'), band);
  const darajaNomi: Record<string, string> = {
    shoshilinch: a('ШОШИЛИНЧ'),
    muhim: a('МУҲИМ'),
    imkoniyat: a('ИМКОНИЯТ'),
  };
  const xulosa: (string | number)[][] = [
    [a('ХУЛОСА ВА ТАВСИЯЛАР')],
    [
      m.xulosa.manba === 'ai'
        ? a('Сунъий интеллект таҳлили · жамланган статистика асосида')
        : a('Белгиланган чегаралар бўйича ҳисобланган'),
    ],
    [],
    [a('ҲОЗИРГИ ҲОЛАТ')],
    [m.xulosa.holat || a('Маълумот кам — хулоса чиқмади.')],
    [],
    [a('ТАВСИЯЛАР')],
    /*
     * Қадам, масъул, муддат ва ўлчов АЛОҲИДА устунда.
     *
     * Бу варақ йиғилишда экранда очилади ва устун бўйича
     * саралаб кўрилади: «Бандлик маркази нима қилиши керак»
     * деган саволга жавоб масъул устунини фильтрлаш билан
     * чиқади. Ҳаммаси битта катакда бўлганда бу мумкин эмас
     * эди.
     */
    ['№', a('Даража'), a('Тавсия'), a('Рақамли далил'), a('Қадамлар'), a('Масъул'), a('Муддат'), a('Ўлчов')],
    ...m.xulosa.tavsiyalar.map((t, i) => [
      i + 1,
      darajaNomi[t.daraja] ?? t.daraja,
      t.sarlavha,
      t.dalil,
      (t.qadamlar ?? []).map((q, n) => `${n + 1}. ${q}`).join('\n'),
      t.masul ?? '',
      t.muddat ?? '',
      t.olchov ?? '',
    ]),
  ];
  if (m.xulosa.ogohlik) {
    xulosa.push([], [a('ИЗОҲ')], [m.xulosa.ogohlik]);
  }
  const v2 = XLSX.utils.aoa_to_sheet(xulosa);
  v2['!cols'] = [
    { wch: 5 },
    { wch: 13 },
    { wch: 46 },
    { wch: 70 },
    { wch: 70 },
    { wch: 26 },
    { wch: 14 },
    { wch: 44 },
  ];
  XLSX.utils.book_append_sheet(kitob, v2, xulosaNomi);
  mundarija.push([
    xulosaNomi,
    a(`Ҳозирги ҳолат ва ${m.xulosa.tavsiyalar.length} та тавсия — рақамли далил билан`),
  ]);

  /* ── 3. Мундарижа учун жой ажратамиз ──────────────────────── */
  const mundarijaNomi = varaqNomi(a('Мундарижа'), band);
  const v3 = XLSX.utils.aoa_to_sheet([[a('МУНДАРИЖА')]]);
  XLSX.utils.book_append_sheet(kitob, v3, mundarijaNomi);

  /* ── 4. Бўлимлар ──────────────────────────────────────────── */
  for (const b of m.bolimlar) {
    const jadvallar = (b.jadvallar ?? []).filter((j) => j.qatorlar.length);
    const diagrammalar = (b.diagrammalar ?? []).filter(
      (d) => d.nomlar.length && d.qatorlar.some((q) => q.qiymatlar.some((v) => v > 0))
    );
    if (!jadvallar.length && !diagrammalar.length && !b.korsatkichlar?.length) continue;

    const nom = varaqNomi(b.varaqNomi ?? b.sarlavha, band);
    const qatorlar: (string | number)[][] = [[b.sarlavha]];
    if (b.kirish) qatorlar.push([b.kirish]);
    qatorlar.push([]);

    /* Кўрсаткичлар */
    if (b.korsatkichlar?.length) {
      qatorlar.push([a('КЎРСАТКИЧЛАР')]);
      qatorlar.push([a('Кўрсаткич'), a('Қиймат'), a('Изоҳ')]);
      for (const k of b.korsatkichlar) {
        qatorlar.push([k.nomi, songaQaytar(k.qiymat), k.izoh ?? '']);
      }
      qatorlar.push([]);
    }

    /* Жадваллар — қотиб турадиган сарлавҳа учун биринчисининг
       ўрнини эслаб қоламиз */
    let birinchiJadvalQatori: number | null = null;
    let engKengUstun = 2;

    for (const j of jadvallar) {
      qatorlar.push([j.sarlavha.toUpperCase()]);
      if (j.izoh) qatorlar.push([j.izoh]);
      const sarlavhaQatori = qatorlar.length;
      qatorlar.push(j.ustunlar.map((u) => u.sarlavha));
      if (birinchiJadvalQatori === null) birinchiJadvalQatori = sarlavhaQatori;
      engKengUstun = Math.max(engKengUstun, j.ustunlar.length);

      for (const q of j.qatorlar) {
        qatorlar.push([q.nomi, ...q.qiymatlar.map(songaQaytar)]);
      }
      qatorlar.push([]);
    }

    /* Диаграмма маълумоти — варақнинг ўнг томонида, алоҳида
       блокда. Диаграмма диапазони шу катакларга боғланади. */
    const diagrammaBoshi = qatorlar.length + 2;
    const specs: ChartSpec[] = [];

    if (diagrammalar.length) {
      qatorlar.push([]);
      qatorlar.push([a('ДИАГРАММА МАЪЛУМОТИ')]);
      qatorlar.push([
        a('Диаграммалар шу маълумотга боғланган. Қиймат ўзгартирилса, диаграмма ҳам ўзгаради.'),
      ]);

      let diagrammaQatori = diagrammaBoshi;

      for (const d of diagrammalar) {
        qatorlar.push([d.sarlavha]);
        qatorlar.push([a('Ном'), ...d.qatorlar.map((q) => q.nomi)]);

        /*
         * Диапазон қатор рақамлари `qatorlar.length` дан
         * ТЎҒРИДАН-ТЎҒРИ олинади.
         *
         * Илгали алоҳида ҳисоблагич юритилган эди ва у бир қатор
         * сурилиб кетган: диаграмма қўшни қаторларга боғланиб,
         * ХАТО маълумот кўрсатарди. Хатолик кўринмасди, чунки
         * қўшни қатор ҳам бўш эмас эди.
         *
         * Excel 1 дан санайди, массив 0 дан — шунинг учун
         * кейинги push эгаллайдиган қатор `length + 1` бўлади.
         */
        const boshQator = qatorlar.length + 1;

        d.nomlar.forEach((nomi, i) => {
          qatorlar.push([nomi, ...d.qatorlar.map((q) => q.qiymatlar[i] ?? 0)]);
        });

        const oxirQator = qatorlar.length;
        const g = `'${nom}'!`;

        specs.push({
          kind: chartTuri(d.turi),
          title: d.sarlavha,
          categories: `${g}$A$${boshQator}:$A$${oxirQator}`,
          series: d.qatorlar.map((q, si) => ({
            name: q.nomi,
            values: `${g}$${ustunHarfi(si + 1)}$${boshQator}:$${ustunHarfi(si + 1)}$${oxirQator}`,
            color:
              d.qatorlar.length > 1
                ? CHART_COLORS[si % CHART_COLORS.length]
                : CHART_RAMP[2],
          })),
          points: d.turi === 'doira' ? d.nomlar.length : undefined,
          /*
           * Диаграммалар маълумотнинг ЎНГИДА, устма-уст
           * жойлашади. Чап томонда жадваллар турибди —
           * диаграмма уларни ёпиб қўймаслиги керак.
           */
          anchor: {
            col: engKengUstun + 2,
            row: diagrammaQatori,
            toCol: engKengUstun + 12,
            toRow: diagrammaQatori + 18,
          },
          legend: d.qatorlar.length > 1 || d.turi === 'doira',
        });

        diagrammaQatori += 20;
        qatorlar.push([]);
      }
    }

    const varaq = XLSX.utils.aoa_to_sheet(qatorlar);
    varaq['!cols'] = [
      { wch: 46 },
      ...Array.from({ length: Math.max(engKengUstun, 4) }, () => ({ wch: 16 })),
    ];
    if (birinchiJadvalQatori !== null) {
      varaq['!freeze'] = { xSplit: 1, ySplit: birinchiJadvalQatori };
    }
    XLSX.utils.book_append_sheet(kitob, varaq, nom);

    if (specs.length) {
      guruhlar.push({
        sheetName: nom,
        specs,
        look: { hideGridLines: true, printFit: true, cells: { A1: 'title', A2: 'subtitle' } },
      });
    }

    const nimaBor = [
      b.korsatkichlar?.length ? a(`${b.korsatkichlar.length} кўрсаткич`) : '',
      jadvallar.length ? a(`${jadvallar.length} жадвал`) : '',
      diagrammalar.length ? a(`${diagrammalar.length} диаграмма`) : '',
    ]
      .filter(Boolean)
      .join(' · ');
    mundarija.push([nom, nimaBor]);
  }

  /* ── Мундарижани тўлдирамиз ───────────────────────────────── */
  const mundarijaQatorlari: (string | number)[][] = [
    [a('МУНДАРИЖА')],
    [`${m.sarlavha} · ${m.qamrovNomi}`],
    [],
    [a('Варақ'), a('Нима бор')],
    ...mundarija,
    [mundarijaNomi, a('Шу варақ')],
    [],
    [
      a(
        'Бўш бўлимлар ҳисоботга киритилмаган: маълумот тўпланмаган бўлимни нол билан тўлдириш ҳисоботни «тўлиқ» кўрсатади, аммо ҳеч нарса айтмайди.'
      ),
    ],
  ];
  const mundarijaVaraq = XLSX.utils.aoa_to_sheet(mundarijaQatorlari);
  mundarijaVaraq['!cols'] = [{ wch: 34 }, { wch: 74 }];
  // Ажратилган варақни тўлдирилгани билан алмаштирамиз
  kitob.Sheets[mundarijaNomi] = mundarijaVaraq;

  /* ── Ёзиш ва диаграмма жойлаш ─────────────────────────────── */
  const xom = XLSX.write(kitob, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

  /*
   * Муқова, хулоса ва мундарижа варақларида диаграмма йўқ, аммо
   * кўриниши созланиши керак: тўр чизиқлари ўчирилади ва босишга
   * мослаштирилади. `injectChartsMulti` диаграммасиз гуруҳни
   * четлаб ўтарди, шунинг учун улар `korinishGuruhlari` га
   * қўшилади — у диаграмма сонига қарамайди.
   */
  const tayyor = await injectChartsMulti(xom, guruhlar, {}, [
    { sheetName: muqovaNomi, look: { hideGridLines: true, printFit: true, cells: { A1: 'title', A2: 'subtitle' } } },
    { sheetName: xulosaNomi, look: { hideGridLines: true, printFit: true, cells: { A1: 'title', A2: 'subtitle' } } },
    { sheetName: mundarijaNomi, look: { hideGridLines: true, printFit: true, cells: { A1: 'title', A2: 'subtitle' } } },
  ]);

  return tayyor as ArrayBuffer;
}

/* ═══════════════════════════════════════════════════════════ */

export async function excelYasa(m: Hisobot, faylNomi: string): Promise<void> {
  const tayyor = await excelBayt(m);

  const blob = new Blob([tayyor], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  /*
   * `<a download>` яратиб босиш — браузерда файлни сақлашнинг
   * ягона ишончли йўли. URL дарҳол бўшатилади, акс ҳолда blob
   * хотирада қолиб кетади.
   */
  const url = URL.createObjectURL(blob);
  const havola = document.createElement('a');
  havola.href = url;
  havola.download = faylNomi;
  document.body.appendChild(havola);
  havola.click();
  document.body.removeChild(havola);
  URL.revokeObjectURL(url);
}
