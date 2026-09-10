/**
 * ============================================================
 *  EXCEL DIAGRAMMALARI
 *
 *  `xlsx` kutubxonasi jadval yozadi, lekin diagramma chiza olmaydi —
 *  bu uning pullik versiyasidagi imkoniyat. Shu sababli fayl yozib
 *  bo'lingandan keyin biz uni ochib, ichiga Excel formatidagi (OOXML)
 *  diagramma qismlarini o'zimiz qo'shamiz.
 *
 *  Natijada diagrammalar RASM emas, HAQIQIY Excel diagrammasi bo'ladi:
 *  hokim ustiga bosib rangini o'zgartirishi, ma'lumotini ko'rishi va
 *  Word yoki PowerPoint ga nusxa olishi mumkin.
 *
 *  Qo'shiladigan qismlar:
 *    xl/charts/chartN.xml          - diagrammaning o'zi
 *    xl/drawings/drawing1.xml      - qaysi kataklar ustida turishi
 *    ...          /_rels/*.rels    - bog'lanishlar
 *    [Content_Types].xml           - yangi qismlarning turi
 * ============================================================
 */

/** Diagramma turlari */
export type ChartKind = 'column' | 'bar' | 'pie' | 'line';

export interface ChartSeries {
  /** Ustun sarlavhasi (izohda ko'rinadi) */
  name: string;
  /** Qiymatlar diapazoni, masalan `Grafik!$B$2:$B$11` */
  values: string;
  /** RGB rang, `#` siz. Berilmasa standart palitra ishlatiladi */
  color?: string;
}

export interface ChartSpec {
  kind: ChartKind;
  title: string;
  /** Nomlar diapazoni, masalan `Grafik!$A$2:$A$11` */
  categories: string;
  series: ChartSeries[];
  /** Diagramma joylashadigan kataklar (0 dan boshlab) */
  anchor: { col: number; row: number; toCol: number; toRow: number };
  /**
   * Nechta nom (kategoriya) bor.
   *
   * Doiraviy diagrammada har bo'lakning rangi alohida beriladi.
   * Mavjud bo'lmagan bo'lakka rang berilsa, Excel diagrammani
   * umuman chizmaydi — shuning uchun aniq son kerak.
   */
  points?: number;
  /** Ustunlar bir-birining ustiga qo'yilsinmi (faqat column/bar) */
  stacked?: boolean;
  /** Izohni ko'rsatish. Bitta ustunli diagrammada keraksiz */
  legend?: boolean;
}

/** Brend palitrasi — sayt bilan bir xil ranglar */
export const CHART_COLORS = [
  '2148E0', // ko'k
  '10B981', // yashil
  'F59E0B', // sariq
  'EC4899', // pushti
  '8B5CF6', // binafsha
  '06B6D4', // moviy
  'F97316', // to'q sariq
  'EF4444', // qizil
];

/** XML matniga xavfsiz qo'shish uchun belgilarni almashtiradi */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sarlavha bloki */
function titleXml(text: string): string {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1150" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:r><a:rPr lang="uz-UZ" sz="1150" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(text)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`;
}

/** Bitta qator (seriya) */
function seriesXml(s: ChartSeries, index: number, spec: ChartSpec): string {
  const color = s.color ?? CHART_COLORS[index % CHART_COLORS.length];

  /*
   * Doiraviy diagrammada har bo'lak alohida rangda bo'lishi kerak,
   * shuning uchun ranglar bo'lak-bo'lak (`c:dPt`) beriladi. Boshqa
   * turlarda esa butun qator bitta rangda.
   */
  const spPr =
    spec.kind === 'pie'
      ? ''
      : `<c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill>${
          spec.kind === 'line'
            ? `<a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:round/></a:ln>`
            : '<a:ln><a:noFill/></a:ln>'
        }</c:spPr>`;

  const dPts =
    spec.kind === 'pie'
      ? CHART_COLORS.slice(0, Math.max(1, spec.points ?? CHART_COLORS.length)).map(
          (c, i) =>
            `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${c}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`
        ).join('')
      : '';

  // Doirada foiz, ustunda esa aniq son yozib qo'yiladi — hokim
  // diagrammaga qarab raqamni ham darhol ko'rsin
  // Ikki va undan ko'p qator bo'lsa raqamlar bir-birining ustiga
  // tushadi — bunday holatda faqat o'q qoladi
  const dLbls =
    spec.series.length > 1 && spec.kind !== 'pie'
      ? ''
      : spec.kind === 'pie'
      ? '<c:dLbls><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="uz-UZ"/></a:p></c:txPr><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/></c:dLbls>'
      : spec.kind === 'line'
        ? ''
        : '<c:dLbls><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800"><a:solidFill><a:srgbClr val="475569"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="uz-UZ"/></a:p></c:txPr><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>';

  const marker =
    spec.kind === 'line'
      ? `<c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:marker>`
      : '';

  const smooth = spec.kind === 'line' ? '<c:smooth val="0"/>' : '';
  const invert = spec.kind === 'column' || spec.kind === 'bar' ? '<c:invertIfNegative val="0"/>' : '';

  return (
    `<c:ser><c:idx val="${index}"/><c:order val="${index}"/>` +
    `<c:tx><c:v>${esc(s.name)}</c:v></c:tx>` +
    spPr +
    marker +
    invert +
    dPts +
    dLbls +
    `<c:cat><c:strRef><c:f>${esc(spec.categories)}</c:f></c:strRef></c:cat>` +
    `<c:val><c:numRef><c:f>${esc(s.values)}</c:f></c:numRef></c:val>` +
    smooth +
    '</c:ser>'
  );
}

/** Kategoriya va qiymat o'qlari */
function axesXml(spec: ChartSpec, catId: number, valId: number): string {
  // Gorizontal ustunda (`bar`) nomlar chapda, qiymatlar pastda turadi
  const catPos = spec.kind === 'bar' ? 'l' : 'b';
  const valPos = spec.kind === 'bar' ? 'b' : 'l';

  const txPr =
    '<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="850"><a:solidFill><a:srgbClr val="475569"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="uz-UZ"/></a:p></c:txPr>';
  const lineClr =
    '<c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln></c:spPr>';

  return (
    `<c:catAx><c:axId val="${catId}"/><c:scaling><c:orientation val="minMax"/></c:scaling>` +
    `<c:delete val="0"/><c:axPos val="${catPos}"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/>` +
    `<c:tickLblPos val="nextTo"/>${lineClr}${txPr}<c:crossAx val="${valId}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
    // Nolldan boshlanmagan o'q kichik farqni katta qilib ko'rsatadi:
    // 20 va 25 orasidagi ayirma besh baravar bo'lib tuyuladi
    `<c:valAx><c:axId val="${valId}"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling>` +
    `<c:delete val="0"/><c:axPos val="${valPos}"/>` +
    '<c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>' +
    `<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${lineClr}${txPr}` +
    `<c:crossAx val="${catId}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`
  );
}

/** Bitta diagramma faylini yasaydi */
export function buildChartXml(spec: ChartSpec, chartIndex: number): string {
  // O'q raqamlari har bir diagrammada noyob bo'lishi kerak
  const catId = 100000000 + chartIndex * 2;
  const valId = 100000001 + chartIndex * 2;

  const sers = spec.series.map((s, i) => seriesXml(s, i, spec)).join('');

  let plot: string;
  if (spec.kind === 'pie') {
    plot = `<c:pieChart><c:varyColors val="1"/>${sers}<c:firstSliceAng val="0"/></c:pieChart>`;
  } else if (spec.kind === 'line') {
    plot =
      `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${sers}` +
      `<c:marker val="1"/><c:axId val="${catId}"/><c:axId val="${valId}"/></c:lineChart>` +
      axesXml(spec, catId, valId);
  } else {
    const dir = spec.kind === 'bar' ? 'bar' : 'col';
    const grouping = spec.stacked ? 'stacked' : 'clustered';
    const overlap = spec.stacked ? 100 : spec.series.length > 1 ? -10 : 0;
    plot =
      `<c:barChart><c:barDir val="${dir}"/><c:grouping val="${grouping}"/><c:varyColors val="0"/>${sers}` +
      `<c:gapWidth val="${spec.series.length > 1 ? 80 : 50}"/><c:overlap val="${overlap}"/>` +
      `<c:axId val="${catId}"/><c:axId val="${valId}"/></c:barChart>` +
      axesXml(spec, catId, valId);
  }

  const legend = spec.legend
    ? '<c:legend><c:legendPos val="b"/><c:overlay val="0"/><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:solidFill><a:srgbClr val="475569"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="uz-UZ"/></a:p></c:txPr></c:legend>'
    : '';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<c:roundedCorners val="0"/><c:chart>' +
    titleXml(spec.title) +
    '<c:plotArea><c:layout/>' +
    plot +
    '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>' +
    legend +
    '<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>' +
    '<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr>' +
    '</c:chartSpace>'
  );
}

/** Barcha diagrammalarni varaqdagi kataklarga bog'laydi */
export function buildDrawingXml(specs: ChartSpec[]): string {
  const anchors = specs
    .map((spec, i) => {
      const a = spec.anchor;
      return (
        '<xdr:twoCellAnchor>' +
        `<xdr:from><xdr:col>${a.col}</xdr:col><xdr:colOff>38100</xdr:colOff><xdr:row>${a.row}</xdr:row><xdr:rowOff>38100</xdr:rowOff></xdr:from>` +
        `<xdr:to><xdr:col>${a.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
        '<xdr:graphicFrame macro="">' +
        `<xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Diagramma ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
        '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>' +
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">' +
        `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${i + 1}"/>` +
        '</a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>'
      );
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    anchors +
    '</xdr:wsDr>'
  );
}

/* ------------------------------------------------------------------
 *  Varaq ko'rinishi
 *
 *  `xlsx` kutubxonasining bepul versiyasi katak uslubini yozmaydi —
 *  shrift, rang va o'lcham berib bo'lmaydi. Lekin biz faylni baribir
 *  ochib o'zgartirayotgan ekanmiz, `styles.xml` ga bir nechta uslub
 *  qo'shib, kerakli kataklarga ulab qo'yish mumkin.
 *
 *  Muhim: mavjud uslublar TEGILMAYDI, yangilari faqat oxiriga
 *  qo'shiladi. Shunda kutubxona bergan raqamlar joyida qoladi.
 * ------------------------------------------------------------------ */

/** Tayyor uslublar — raqami `styles.xml` dagi tartibga mos */
export type CellLook = 'title' | 'subtitle' | 'kpiLabel' | 'kpiValue' | 'sectionHead';

const LOOK_INDEX: Record<CellLook, number> = {
  title: 1,
  subtitle: 2,
  kpiLabel: 3,
  kpiValue: 4,
  sectionHead: 5,
};

export interface SheetLook {
  /** Fon to'r chiziqlarini yashirish — hisobot varag'i toza ko'rinadi */
  hideGridLines?: boolean;
  /** Katak -> uslub, masalan `{ A1: 'title' }` */
  cells?: Record<string, CellLook>;
  /**
   * Chop etish sozlamasi: albom yo'nalishi va kenglikni bir varaqqa
   * sig'dirish. Hokim hisobotni ko'pincha chop etadi — sozlamasiz
   * diagrammalar ikkiga bo'linib ketadi.
   */
  printFit?: boolean;
}

/** Chop etish sozlamalarini varaq XML iga qo'shadi */
function applyPrintSetup(sheetXml: string): string {
  let out = sheetXml;

  // `sheetPr` varaqning ENG BIRINCHI bolasi bo'lishi kerak
  if (!out.includes('<sheetPr')) {
    out = out.replace(
      /(<worksheet[^>]*>)/,
      '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
    );
  }

  const setup =
    '<pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>';

  // Tartib muhim: bu qismlar `ignoredErrors` va `drawing` dan oldin turadi
  if (out.includes('<ignoredErrors')) {
    out = out.replace('<ignoredErrors', `${setup}<ignoredErrors`);
  } else {
    out = out.replace('<drawing ', `${setup}<drawing `);
  }
  return out;
}

/** `styles.xml` ga yangi shrift, fon va uslublarni qo'shadi */
function extendStyles(stylesXml: string): string {
  const fonts =
    '<font><sz val="20"/><b/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><sz val="11"/><color rgb="FF64748B"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><sz val="9"/><b/><color rgb="FF64748B"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><sz val="20"/><b/><color rgb="FF2148E0"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><sz val="13"/><b/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>';

  let out = stylesXml.replace(
    /<fonts count="(\d+)">/,
    (_, n: string) => `<fonts count="${Number(n) + 5}">`
  );
  out = out.replace('</fonts>', `${fonts}</fonts>`);

  // Shrift raqamlari: mavjudlari 0..n-1, yangilari n..n+4
  const base = Number(/<fonts count="(\d+)">/.exec(stylesXml)?.[1] ?? '1');
  const xfs =
    `<xf numFmtId="0" fontId="${base}" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
    `<xf numFmtId="0" fontId="${base + 1}" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
    `<xf numFmtId="0" fontId="${base + 2}" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>` +
    `<xf numFmtId="0" fontId="${base + 3}" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>` +
    `<xf numFmtId="0" fontId="${base + 4}" fillId="0" borderId="0" xfId="0" applyFont="1"/>`;

  out = out.replace(
    /<cellXfs count="(\d+)">/,
    (_, n: string) => `<cellXfs count="${Number(n) + 5}">`
  );
  out = out.replace('</cellXfs>', `${xfs}</cellXfs>`);
  return out;
}

/** Kataklarga uslub raqamini yozadi */
function applyCellLooks(sheetXml: string, cells: Record<string, CellLook>): string {
  let out = sheetXml;
  for (const [ref, look] of Object.entries(cells)) {
    const index = LOOK_INDEX[look];
    // Katak bo'sh bo'lsa XML da umuman bo'lmaydi — shunchaki o'tkazamiz
    out = out.replace(new RegExp(`<c r="${ref}"(?![\\d])`), `<c r="${ref}" s="${index}"`);
  }
  return out;
}

/* ------------------------------------------------------------------
 *  Yozib bo'lingan faylga diagrammalarni qo'shish
 * ------------------------------------------------------------------ */

/** `xl/workbook.xml` dan varaq nomiga mos fayl yo'lini topadi */
function sheetPathFor(workbookXml: string, relsXml: string, sheetName: string): string | null {
  const sheetTag = new RegExp(
    `<sheet[^>]*name="${sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`
  ).exec(workbookXml);
  if (!sheetTag) return null;

  const rid = /r:id="([^"]+)"/.exec(sheetTag[0])?.[1];
  if (!rid) return null;

  const rel = new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*/>`).exec(relsXml);
  const target = rel ? /Target="([^"]+)"/.exec(rel[0])?.[1] : null;
  if (!target) return null;

  return `xl/${target.replace(/^\/?xl\//, '').replace(/^\//, '')}`;
}

/**
 * Excel fayliga diagrammalarni qo'shadi.
 *
 * @param workbook `XLSX.write(..., { type: 'array' })` natijasi
 * @param sheetName diagrammalar joylashadigan varaq nomi
 * @param specs     diagrammalar ro'yxati
 */
export async function injectCharts(
  workbook: ArrayBuffer | Uint8Array,
  sheetName: string,
  specs: ChartSpec[],
  look: SheetLook = {}
): Promise<ArrayBuffer | Uint8Array> {
  if (specs.length === 0) return workbook;

  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(workbook);

  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const workbookRels = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !workbookRels) return workbook;

  const sheetPath = sheetPathFor(workbookXml, workbookRels, sheetName);
  if (!sheetPath) return workbook;

  const sheetXml = await zip.file(sheetPath)?.async('string');
  if (!sheetXml) return workbook;

  // ── Diagramma fayllari ──
  specs.forEach((spec, i) => {
    zip.file(`xl/charts/chart${i + 1}.xml`, buildChartXml(spec, i));
  });

  // ── Chizma va uning bog'lanishlari ──
  zip.file('xl/drawings/drawing1.xml', buildDrawingXml(specs));
  zip.file(
    'xl/drawings/_rels/drawing1.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      specs
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${i + 1}.xml"/>`
        )
        .join('') +
      '</Relationships>'
  );

  // ── Varaqni chizma bilan bog'laymiz ──
  const sheetFile = sheetPath.split('/').pop() as string;
  const sheetRelsPath = `xl/worksheets/_rels/${sheetFile}.rels`;
  const existingRels = await zip.file(sheetRelsPath)?.async('string');

  /*
   * Varaqda allaqachon bog'lanish bo'lishi mumkin (masalan havolalar),
   * shuning uchun yangi raqamni eng kattasidan keyin olamiz.
   */
  let drawingRid = 'rId1';
  if (existingRels) {
    const used = Array.from(existingRels.matchAll(/Id="rId(\d+)"/g)).map((m) => Number(m[1]));
    drawingRid = `rId${Math.max(0, ...used) + 1}`;
    zip.file(
      sheetRelsPath,
      existingRels.replace(
        '</Relationships>',
        `<Relationship Id="${drawingRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`
      )
    );
  } else {
    zip.file(
      sheetRelsPath,
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="${drawingRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>` +
        '</Relationships>'
    );
  }

  // `<drawing/>` varaqning eng oxirgi elementi bo'lishi kerak
  zip.file(sheetPath, sheetXml.replace('</worksheet>', `<drawing r:id="${drawingRid}"/></worksheet>`));

  // ── Varaq ko'rinishi: to'r chiziqlari va katak uslublari ──
  if (look.hideGridLines || look.cells || look.printFit) {
    let patched = (await zip.file(sheetPath)?.async('string')) ?? '';

    if (look.hideGridLines) {
      patched = patched.replace('<sheetView ', '<sheetView showGridLines="0" ');
    }
    if (look.printFit) {
      patched = applyPrintSetup(patched);
    }
    if (look.cells) {
      patched = applyCellLooks(patched, look.cells);
      const stylesXml = await zip.file('xl/styles.xml')?.async('string');
      if (stylesXml) zip.file('xl/styles.xml', extendStyles(stylesXml));
    }
    zip.file(sheetPath, patched);
  }

  // ── Yangi qismlarning turlarini e'lon qilamiz ──
  const typesXml = await zip.file('[Content_Types].xml')?.async('string');
  if (typesXml) {
    const overrides =
      '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' +
      specs
        .map(
          (_, i) =>
            `<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`
        )
        .join('');
    zip.file('[Content_Types].xml', typesXml.replace('</Types>', `${overrides}</Types>`));
  }

  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}
