/**
 * ============================================================
 *  EXCEL HISOBOT
 *
 *  PDF - o'qish uchun, Excel - ISHLASH uchun. Hokim apparati
 *  raqamlarni o'z jadvaliga ko'chiradi, viloyatga yuboradi,
 *  ustidan o'zi hisob-kitob qiladi. Shuning uchun bu yerda rasm
 *  emas, tirik ma'lumot bo'lishi kerak.
 *
 *  Diagrammalar ham RASM EMAS: `excel-charts.ts` fayl ichiga
 *  haqiqiy OOXML diagrammalarini joylaydi. Hokim ustiga bosib
 *  rangini o'zgartira oladi, ma'lumotini ko'radi, Word yoki
 *  PowerPoint ga nusxa oladi.
 *
 *  Uchta varaq:
 *    Ҳисобот    - KPI va voronka
 *    Маҳаллалар - 70 ta MFY, to'liq jadval
 *    Графиклар  - diagramma ma'lumoti va diagrammalarning o'zi
 * ============================================================
 */
import { CHART_COLORS, CHART_RAMP, injectCharts, type ChartSpec } from '@/lib/excel-charts';
import { lotinga } from '@/lib/alifbo';

export interface ExcelMalumoti {
  /**
   * Lotin alifbosi tanlanganmi.
   *
   * Ma'lumot qatorlari chaqiruvchi tomonidan allaqachon o'girilgan,
   * lekin ustun sarlavhalari va varaq nomlari shu faylda yozilgan -
   * ular ham ergashishi kerak, aks holda bitta faylda ikki alifbo
   * aralashib qoladi.
   */
  lotin: boolean;
  sarlavha: string;
  ostSarlavha: string;
  kpi: { nomi: string; qiymat: string | number }[];
  voronka: { bosqich: string; soni: number; foiz: number }[];
  mahallalar: {
    nomi: string;
    bazaXonadon: number;
    xatlovXonadon: number;
    qamrovFoizi: number;
    bazaIshsiz: number;
    aniqlangan: number;
    joylashtirilgan: number;
    natijaFoizi: number;
  }[];
  toifalar: { nomi: string; soni: number }[];
  dinamika: { yorliq: string; aniqlangan: number; joylashtirilgan: number }[];
}

/** Varaq nomlari - diagrammalar shu nomga bog'lanadi */
const VARAQ_KIRILL = {
  hisobot: 'Ҳисобот',
  mahallalar: 'Маҳаллалар',
  grafik: 'Графиклар',
} as const;

export async function excelYasa(m: ExcelMalumoti, faylNomi: string): Promise<void> {
  const XLSX = await import('xlsx');

  /** Matnni tanlangan alifboga o'giradi */
  const a = (t: string) => (m.lotin ? lotinga(t) : t);

  const kitob = XLSX.utils.book_new();
  const sana = new Date().toLocaleDateString('ru-RU');

  /*
   * Varaq nomi diagramma diapazonlarida ham ishlatiladi
   * (`Графиклар!$A$2`), shuning uchun bir marta hisoblanadi.
   */
  const VARAQ = {
    hisobot: a(VARAQ_KIRILL.hisobot),
    mahallalar: a(VARAQ_KIRILL.mahallalar),
    grafik: a(VARAQ_KIRILL.grafik),
  };

  /* ── 1-varaq: Hisobot ── */
  const hisobot: (string | number)[][] = [
    [m.sarlavha],
    [m.ostSarlavha],
    [sana],
    [],
    [a('АСОСИЙ КЎРСАТКИЧЛАР')],
    ...m.kpi.map((k) => [k.nomi, k.qiymat]),
    [],
    [a('ВОРОНКА — ҳар босқичдаги улуш')],
    [a('Босқич'), a('Сони'), a('Улуши, %')],
    ...m.voronka.map((v) => [v.bosqich, v.soni, v.foiz]),
  ];
  const v1 = XLSX.utils.aoa_to_sheet(hisobot);
  v1['!cols'] = [{ wch: 42 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(kitob, v1, VARAQ.hisobot);

  /* ── 2-varaq: Mahallalar ── */
  const mah: (string | number)[][] = [
    [a('МФЙ'), a('Хонадон'), a('Хатлов'), a('Қамров, %'), a('Рўйхатда ишсиз'), a('Аниқланган'), a('Жойлашган'), a('Натижа, %')],
    ...m.mahallalar.map((x) => [
      x.nomi, x.bazaXonadon, x.xatlovXonadon, x.qamrovFoizi,
      x.bazaIshsiz, x.aniqlangan, x.joylashtirilgan, x.natijaFoizi,
    ]),
  ];
  const v2 = XLSX.utils.aoa_to_sheet(mah);
  v2['!cols'] = [{ wch: 26 }, ...Array(7).fill({ wch: 13 })];
  // Sarlavha qatori qotib turadi - 70 qatorni aylantirganda nom ko'rinib tursin
  v2['!freeze'] = { xSplit: 1, ySplit: 1 };
  XLSX.utils.book_append_sheet(kitob, v2, VARAQ.mahallalar);

  /* ── 3-varaq: Grafiklar uchun ma'lumot ──
   *
   * Diagramma Excel'da katak DIAPAZONIGA bog'lanadi, massivga
   * emas. Shuning uchun avval ma'lumot yoziladi, keyin uning
   * manzili diagrammaga beriladi. Joylashuv o'zgarsa, quyidagi
   * diapazonlarni ham o'zgartirish kerak.
   */
  const eng10 = [...m.mahallalar].sort((a, b) => b.qamrovFoizi - a.qamrovFoizi).slice(0, 10);

  const grafik: (string | number)[][] = [];
  const qator = (i: number) => i + 1; // Excel 1 dan sanaydi

  // A1:B11 — mahallalar
  grafik.push([a('Маҳалла'), a('Қамров, %'), '', a('Тоифа'), a('Сони'), '', a('Ой'), a('Аниқланган'), a('Жойлашган')]);
  const maxQator = Math.max(eng10.length, m.toifalar.length, m.dinamika.length);
  for (let i = 0; i < maxQator; i++) {
    grafik.push([
      eng10[i]?.nomi ?? '', eng10[i]?.qamrovFoizi ?? '',
      '',
      m.toifalar[i]?.nomi ?? '', m.toifalar[i]?.soni ?? '',
      '',
      m.dinamika[i]?.yorliq ?? '', m.dinamika[i]?.aniqlangan ?? '', m.dinamika[i]?.joylashtirilgan ?? '',
    ]);
  }
  const v3 = XLSX.utils.aoa_to_sheet(grafik);
  v3['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 3 },
    { wch: 24 }, { wch: 10 }, { wch: 3 },
    { wch: 12 }, { wch: 13 }, { wch: 13 },
  ];
  XLSX.utils.book_append_sheet(kitob, v3, VARAQ.grafik);

  /* ── Diagrammalar ── */
  const g = `${VARAQ.grafik}!`;
  const oxir10 = qator(eng10.length);
  const oxirToifa = qator(m.toifalar.length);
  const oxirDin = qator(m.dinamika.length);

  const specs: ChartSpec[] = [
    {
      kind: 'bar',
      title: a('Хатлов қамрови — энг юқори 10 та МФЙ'),
      categories: `${g}$A$2:$A$${oxir10}`,
      series: [{ name: a('Қамров, %'), values: `${g}$B$2:$B$${oxir10}`, color: CHART_RAMP[2] }],
      anchor: { col: 0, row: maxQator + 3, toCol: 8, toRow: maxQator + 21 },
      legend: false,
    },
    {
      kind: 'pie',
      title: a('Ишсизлар таркиби'),
      categories: `${g}$D$2:$D$${oxirToifa}`,
      series: [{ name: a('Сони'), values: `${g}$E$2:$E$${oxirToifa}` }],
      points: m.toifalar.length,
      anchor: { col: 0, row: maxQator + 23, toCol: 8, toRow: maxQator + 41 },
      legend: true,
    },
    {
      kind: 'line',
      title: a('Ойлик динамика — тўпланиб борадиган сон'),
      categories: `${g}$G$2:$G$${oxirDin}`,
      series: [
        { name: a('Аниқланган'), values: `${g}$H$2:$H$${oxirDin}`, color: CHART_RAMP[1] },
        { name: a('Жойлашган'), values: `${g}$I$2:$I$${oxirDin}`, color: CHART_RAMP[4] },
      ],
      anchor: { col: 0, row: maxQator + 43, toCol: 8, toRow: maxQator + 61 },
      legend: true,
    },
  ];

  /* ── Yozish va diagramma joylash ── */
  const xom = XLSX.write(kitob, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

  const tayyor = await injectCharts(xom, VARAQ.grafik, specs, {
    hideGridLines: true,
    printFit: true,
    cells: { A1: 'title', A2: 'subtitle' },
  });

  const blob = new Blob([tayyor as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  /*
   * `<a download>` yaratib bosish - brauzerda faylni saqlashning
   * yagona ishonchli yo'li. URL darhol bo'shatiladi, aks holda
   * blob xotirada qolib ketadi.
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

/** Palitra tashqarida ham kerak bo'lishi mumkin */
export { CHART_COLORS };
