/**
 * ============================================================
 *  PDF ДИАГРАММАЛАРИ — вектор ҳолида чизилади
 *
 *  Ҳисоботга диаграмма РАСМ сифатида қўйиш мумкин эди: экрандаги
 *  Recharts ни canvas га чизиб, PNG олиб. Аммо унда учта муаммо
 *  чиқади:
 *
 *    1. Расм босилганда хиралашади. Ҳисобот А4 да босилади ва
 *       йиғилишда қўлда ўқилади — 96 dpi лик PNG у ерда хом
 *       кўринади.
 *    2. Ҳар бир диаграмма 100-300 КБ қўшади. Ўн диаграммали
 *       ҳисобот 3 МБ га чиқади ва тумандаги интернет билан
 *       юкланмайди.
 *    3. Экранда диаграмма БЎЛИШИ керак бўлади. Ҳисоботни эса
 *       ходим ҳеч қандай диаграмма кўрмасдан ҳам олиши керак.
 *
 *  Шунинг учун диаграмма jsPDF нинг вектор буйруқлари билан
 *  чизилади: ўлчами килобайтда, босилганда аниқ, экранга
 *  боғланмаган.
 *
 *  ── Ранглар ──
 *
 *  `chart-theme.ts` даги ЁРУҒ тема палитрасидан. Қоғоз доим оқ,
 *  шунинг учун қоронғи тема ранглари бу ерда ишлатилмайди.
 *  Палитра `validate_palette.js` билан текширилган: ранг
 *  кўрмайдиган ўқувчи учун ҳам бўлаклар ажралади.
 *
 *  ── Ранг ёлғиз маъно ташимайди ──
 *
 *  Ҳар бир диаграммада иккинчи белги бор: устун ва бўлак
 *  ёнида РАҚАМ ёзилади, доирада эса изоҳ рўйхати сон билан
 *  беради. Шунинг учун ҳисобот оқ-қора принтерда ҳам ўқилади.
 * ============================================================
 */
import type jsPDF from 'jspdf';
import { lotinga } from '@/lib/alifbo';
import type { Diagramma } from './turlar';

/* ── Палитра (ёруғ тема) ─────────────────────────────────────── */

/** Категория ранглари — кетма-кет, айланмайди */
const TOIFA: [number, number, number][] = [
  [37, 99, 235], // ko'k
  [180, 83, 9], // jigarrang-sariq
  [13, 148, 136], // ko'kimtir-yashil
  [126, 34, 206], // binafsha
  [190, 18, 60], // qizg'ish
];

/** Битта қаторли диаграмма ранги */
const ASOSIY: [number, number, number] = [42, 120, 214];

const MATN: [number, number, number] = [71, 85, 105];
const MATN_QORA: [number, number, number] = [17, 24, 39];
const TOR: [number, number, number] = [226, 232, 240];
const OQ: [number, number, number] = [255, 255, 255];

/** Ажратгич — `format.ts` даги билан бир хил бўлиши шарт */
const AJRATGICH = ' ';

/**
 * Диаграмманинг ЎЗ ёзувлари (ҳозирча фақат ҳалқа ўртасидаги
 * «жами») танланган алифбода чиқиши керак.
 *
 * Модул даражасида сақланади: чизиш функциялари чуқур жойлашган
 * ва ҳар бирига алифбони узатиш имзоларни шишириб юборарди.
 * `diagrammaChiz` ҳар чақирилганда янгиланади.
 */
let lotinRejimi = false;
const a = (matn: string) => (lotinRejimi ? lotinga(matn) : matn);

function raqam(n: number, foizmi: boolean): string {
  if (!Number.isFinite(n)) return '';
  if (foizmi) return `${String(Math.round(n * 10) / 10).replace('.', ',')}%`;
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, AJRATGICH);
}

/**
 * Ўқ шкаласини «чиройли» қадамга айлантиради.
 *
 * 0-173 оралиғи 0, 50, 100, 150, 200 бўлиб чиқади — 0, 34.6,
 * 69.2 эмас. Ҳисоботда ўқ рақамлари ўқилиши керак, акс ҳолда
 * диаграммадан фойда йўқ.
 */
function chiroyliChegara(eng: number): { yuqori: number; qadam: number } {
  if (eng <= 0) return { yuqori: 1, qadam: 1 };
  const xom = eng / 4;
  const daraja = Math.pow(10, Math.floor(Math.log10(xom)));
  const nisbat = xom / daraja;
  const qadam = (nisbat <= 1 ? 1 : nisbat <= 2 ? 2 : nisbat <= 5 ? 5 : 10) * daraja;
  return { yuqori: Math.ceil(eng / qadam) * qadam, qadam };
}

interface Joy {
  x: number;
  y: number;
  eni: number;
  boyi: number;
}

/** Ҳар бир диаграмма турининг чизилиш баландлиги (мм) */
export function diagrammaBoyi(d: Diagramma): number {
  switch (d.turi) {
    case 'doira':
      // Ҳалқанинг диаметри ёки изоҳ рўйхати — қайси узунроқ бўлса
      return Math.max(52, 6 + d.nomlar.length * 5.2);
    case 'gorizontal':
      // Аниқ: ҳар қатор ўз баландлигини эгаллайди, ортиқча жой йўқ
      return d.nomlar.length * (d.qatorlar.length > 1 ? 11 : 7.6) + 3;
    case 'chiziq':
      return 60;
    default:
      return 56;
  }
}

/* ── Умумий ёрдамчилар ───────────────────────────────────────── */

function sarlavhaChiz(doc: jsPDF, d: Diagramma, x: number, y: number, eni: number): number {
  doc.setFont('Hisobot', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...MATN_QORA);
  doc.text(d.sarlavha, x, y);
  let keyingi = y + 4.2;

  if (d.izoh) {
    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MATN);
    const satrlar = doc.splitTextToSize(d.izoh, eni) as string[];
    doc.text(satrlar, x, keyingi);
    keyingi += satrlar.length * 2.9 + 1;
  }

  return keyingi;
}

/** Кўп қаторли диаграмма учун изоҳ — ранг + ном */
function izohChiz(doc: jsPDF, d: Diagramma, x: number, y: number): number {
  if (d.qatorlar.length < 2) return y;

  doc.setFont('Hisobot', 'normal');
  doc.setFontSize(7);
  let ox = x;

  d.qatorlar.forEach((q, i) => {
    const rang = TOIFA[i % TOIFA.length];
    doc.setFillColor(...rang);
    doc.rect(ox, y - 1.9, 2.6, 2.6, 'F');
    doc.setTextColor(...MATN);
    doc.text(q.nomi, ox + 4, y);
    ox += 4 + doc.getTextWidth(q.nomi) + 6;
  });

  return y + 4;
}

/* ── Вертикал устунлар ───────────────────────────────────────── */

function ustunChiz(doc: jsPDF, d: Diagramma, joy: Joy): void {
  const eng = Math.max(...d.qatorlar.flatMap((q) => q.qiymatlar), 0);
  const { yuqori, qadam } = chiroyliChegara(eng);

  // Чапда ўқ рақамлари учун жой
  const oqEni = 13;
  const chizX = joy.x + oqEni;
  const chizEni = joy.eni - oqEni;
  // Пастда ном ёзуви учун жой
  const nomBoyi = 9;
  const chizBoyi = joy.boyi - nomBoyi;

  /* Тўр чизиқлари ва ўқ рақамлари */
  doc.setFont('Hisobot', 'normal');
  doc.setFontSize(6.5);
  doc.setLineWidth(0.15);
  for (let v = 0; v <= yuqori + 1e-9; v += qadam) {
    const y = joy.y + chizBoyi - (v / yuqori) * chizBoyi;
    doc.setDrawColor(...TOR);
    doc.line(chizX, y, chizX + chizEni, y);
    doc.setTextColor(...MATN);
    doc.text(raqam(v, d.foiz ?? false), chizX - 1.5, y + 1, { align: 'right' });
  }

  /* Устунлар */
  const guruhSoni = d.nomlar.length;
  const qatorSoni = d.qatorlar.length;
  const guruhEni = chizEni / guruhSoni;
  // Гуруҳлар орасида бўшлиқ қолсин — устунлар қўшилиб кетмасин
  const ustunEni = Math.min((guruhEni * 0.68) / qatorSoni, 14);

  d.nomlar.forEach((nom, gi) => {
    const markaz = chizX + guruhEni * (gi + 0.5);
    const boshlanish = markaz - (ustunEni * qatorSoni) / 2;

    d.qatorlar.forEach((q, si) => {
      const v = q.qiymatlar[gi] ?? 0;
      const h = yuqori > 0 ? (v / yuqori) * chizBoyi : 0;
      const x = boshlanish + si * ustunEni;
      const y = joy.y + chizBoyi - h;

      doc.setFillColor(...(qatorSoni > 1 ? TOIFA[si % TOIFA.length] : ASOSIY));
      if (h > 0.4) {
        // Учи юмалоқ — экрандаги диаграммалар билан бир хил
        doc.roundedRect(x + 0.35, y, ustunEni - 0.7, h, 0.7, 0.7, 'F');
      }

      // Устун устидаги рақам — ранг кўрмайдиган ўқувчи учун
      if (v > 0 && guruhSoni * qatorSoni <= 14) {
        doc.setFont('Hisobot', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...MATN_QORA);
        doc.text(raqam(v, d.foiz ?? false), x + (ustunEni - 0.7) / 2 + 0.35, y - 1, {
          align: 'center',
        });
      }
    });

    /* Ном — сиғмаса иккига бўлинади */
    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(...MATN);
    const satrlar = (doc.splitTextToSize(nom, guruhEni - 1) as string[]).slice(0, 2);
    satrlar.forEach((s, i) => {
      doc.text(s, markaz, joy.y + chizBoyi + 3.4 + i * 2.7, { align: 'center' });
    });
  });

  /* Асос чизиғи */
  doc.setDrawColor(...MATN);
  doc.setLineWidth(0.25);
  doc.line(chizX, joy.y + chizBoyi, chizX + chizEni, joy.y + chizBoyi);
}

/* ── Горизонтал устунлар ─────────────────────────────────────── */

/**
 * Горизонтал устун — узун номлар учун.
 *
 * Маҳалла номи, ташкилот номи ва ҳунар йўналиши вертикал
 * диаграммада ёнбошлаб ёзилиши керак бўларди ва ўқилмасди.
 * Горизонталда ном ўз ҳолида, чапда турибди.
 */
function gorizontalChiz(doc: jsPDF, d: Diagramma, joy: Joy): void {
  const eng = Math.max(...d.qatorlar.flatMap((q) => q.qiymatlar), 0);
  const { yuqori } = chiroyliChegara(eng);

  // Номлар учун — умумий кенгликнинг учдан бири, лекин 62 мм дан ошмасин
  const nomEni = Math.min(joy.eni * 0.36, 62);
  const chizX = joy.x + nomEni;
  // Ўнгда рақам ёзилади
  const raqamEni = 17;
  const chizEni = joy.eni - nomEni - raqamEni;

  const qatorSoni = d.qatorlar.length;
  const qatorBoyi = qatorSoni > 1 ? 11 : 7.6;
  const ustunBoyi = Math.min((qatorBoyi * 0.7) / qatorSoni, 5);

  d.nomlar.forEach((nom, i) => {
    const y0 = joy.y + i * qatorBoyi;

    /* Ном */
    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...MATN_QORA);
    const satr = (doc.splitTextToSize(nom, nomEni - 2) as string[])[0] ?? nom;
    doc.text(satr, joy.x, y0 + qatorBoyi / 2 + 0.6);

    d.qatorlar.forEach((q, si) => {
      const v = q.qiymatlar[i] ?? 0;
      const w = yuqori > 0 ? (v / yuqori) * chizEni : 0;
      const y = y0 + (qatorBoyi - ustunBoyi * qatorSoni) / 2 + si * ustunBoyi;

      doc.setFillColor(...(qatorSoni > 1 ? TOIFA[si % TOIFA.length] : ASOSIY));
      if (w > 0.4) {
        doc.roundedRect(chizX, y, w, ustunBoyi - 0.4, 0.6, 0.6, 'F');
      }

      /* Рақам — устун охирида */
      doc.setFont('Hisobot', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(...MATN_QORA);
      doc.text(raqam(v, d.foiz ?? false), chizX + w + 1.4, y + ustunBoyi / 2 + 0.4);
    });
  });

  /* Асос чизиғи — тик */
  doc.setDrawColor(...TOR);
  doc.setLineWidth(0.2);
  doc.line(chizX, joy.y, chizX, joy.y + d.nomlar.length * qatorBoyi);
}

/* ── Доира (халқа) ───────────────────────────────────────────── */

/**
 * Ҳалқа диаграмма.
 *
 * Ўртаси бўш: тўлиқ доирада бўлакларнинг бурчагини кўз билан
 * солиштириш қийин, ҳалқада эса ёй узунлиги солиштирилади ва
 * ўртага жами сон ёзилади.
 *
 * Ёнида ҳар доим РЎЙХАТ турибди — ном, сон ва улуш билан.
 * Диаграммани фақат рангга қараб ўқишга тўғри келмайди.
 */
function doiraChiz(doc: jsPDF, d: Diagramma, joy: Joy): void {
  const qiymatlar = d.qatorlar[0]?.qiymatlar ?? [];
  const jami = qiymatlar.reduce((s, v) => s + Math.max(0, v), 0);
  if (jami <= 0) return;

  const R = Math.min(joy.boyi / 2 - 2, 24);
  const ichki = R * 0.58;
  const cx = joy.x + R + 2;
  const cy = joy.y + Math.min(joy.boyi / 2, R + 2);

  let burchak = -Math.PI / 2; // 12 соат йўналишидан

  qiymatlar.forEach((v, i) => {
    const ulush = Math.max(0, v) / jami;
    if (ulush <= 0) return;
    const yoy = ulush * Math.PI * 2;
    const rang = TOIFA[i % TOIFA.length];

    /*
     * jsPDF да ёй буйруғи йўқ, шунинг учун бўлак кўпбурчак
     * билан яқинлаштирилади. 1.5 градуслик қадам етарли:
     * А4 да 24 мм радиусда чегара силлиқ кўринади.
     */
    const qadam = Math.PI / 120;
    const nuqtalar: [number, number][] = [];
    for (let a = burchak; a < burchak + yoy; a += qadam) {
      nuqtalar.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    }
    nuqtalar.push([cx + Math.cos(burchak + yoy) * R, cy + Math.sin(burchak + yoy) * R]);
    for (let a = burchak + yoy; a > burchak; a -= qadam) {
      nuqtalar.push([cx + Math.cos(a) * ichki, cy + Math.sin(a) * ichki]);
    }
    nuqtalar.push([cx + Math.cos(burchak) * ichki, cy + Math.sin(burchak) * ichki]);

    doc.setFillColor(...rang);
    // Бўлаклар орасида оқ чегара — ёнма-ён ранглар қўшилиб кетмасин
    doc.setDrawColor(...OQ);
    doc.setLineWidth(0.4);
    const [bx, by] = nuqtalar[0];
    doc.lines(
      nuqtalar.slice(1).map(([x, y], k) => {
        const [px, py] = nuqtalar[k];
        return [x - px, y - py];
      }),
      bx,
      by,
      [1, 1],
      'FD',
      true
    );

    burchak += yoy;
  });

  /* Ўртадаги жами */
  doc.setFont('Hisobot', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MATN_QORA);
  doc.text(raqam(jami, false), cx, cy + 1, { align: 'center' });
  doc.setFont('Hisobot', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(...MATN);
  doc.text(a('жами'), cx, cy + 4.4, { align: 'center' });

  /*
   * Изоҳ рўйхати — ном, сон ва улуш ЁНМА-ЁН.
   *
   * Илгари сон саҳифанинг ўнг четига тортилган эди ва ном билан
   * сон орасида бўш майдон қоларди — кўз уларни жуфтлаб
   * ўқиёлмасди. Энди рақам номдан кейин, ўзининг қатъий
   * устунида турибди.
   */
  const izohX = cx + R + 7;
  /** Рақам устуни — энг узун рақамга қараб ўлчанади */
  doc.setFont('Hisobot', 'bold');
  doc.setFontSize(6.6);
  const raqamEni = Math.max(
    ...qiymatlar.map((v) =>
      doc.getTextWidth(
        `${raqam(v, false)} · ${String(Math.round((v / jami) * 1000) / 10).replace('.', ',')}%`
      )
    ),
    14
  );
  const nomEni = Math.max(joy.x + joy.eni - izohX - raqamEni - 6, 20);

  d.nomlar.forEach((nom, i) => {
    const v = qiymatlar[i] ?? 0;
    const y = joy.y + 4 + i * 5.2;
    const rang = TOIFA[i % TOIFA.length];

    doc.setFillColor(...rang);
    doc.rect(izohX, y - 2.1, 2.8, 2.8, 'F');

    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...MATN_QORA);
    const oqilgan = (doc.splitTextToSize(nom, nomEni) as string[])[0] ?? nom;
    doc.text(oqilgan, izohX + 4.4, y);

    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(6.6);
    doc.text(
      `${raqam(v, false)} · ${String(Math.round((v / jami) * 1000) / 10).replace('.', ',')}%`,
      izohX + 4.4 + nomEni + raqamEni + 2,
      y,
      { align: 'right' }
    );
  });
}

/* ── Чизиқли ────────────────────────────────────────────────── */

function chiziqChiz(doc: jsPDF, d: Diagramma, joy: Joy): void {
  const eng = Math.max(...d.qatorlar.flatMap((q) => q.qiymatlar), 0);
  const { yuqori, qadam } = chiroyliChegara(eng);

  const oqEni = 13;
  const chizX = joy.x + oqEni;
  const chizEni = joy.eni - oqEni;
  const nomBoyi = 8;
  const chizBoyi = joy.boyi - nomBoyi;

  /* Тўр */
  doc.setFont('Hisobot', 'normal');
  doc.setFontSize(6.5);
  doc.setLineWidth(0.15);
  for (let v = 0; v <= yuqori + 1e-9; v += qadam) {
    const y = joy.y + chizBoyi - (v / yuqori) * chizBoyi;
    doc.setDrawColor(...TOR);
    doc.line(chizX, y, chizX + chizEni, y);
    doc.setTextColor(...MATN);
    doc.text(raqam(v, d.foiz ?? false), chizX - 1.5, y + 1, { align: 'right' });
  }

  const n = d.nomlar.length;
  const qadamX = n > 1 ? chizEni / (n - 1) : 0;

  /* Чизиқлар */
  d.qatorlar.forEach((q, si) => {
    const rang = qatorRangi(d, si);
    doc.setDrawColor(...rang);
    doc.setLineWidth(0.7);

    const nuqtalar = q.qiymatlar.map((v, i) => ({
      x: chizX + i * qadamX,
      y: joy.y + chizBoyi - (yuqori > 0 ? (v / yuqori) * chizBoyi : 0),
    }));

    for (let i = 1; i < nuqtalar.length; i++) {
      doc.line(nuqtalar[i - 1].x, nuqtalar[i - 1].y, nuqtalar[i].x, nuqtalar[i].y);
    }

    /* Нуқталар — оқ ҳошия билан, чизиқлар кесишганда ажралиб турсин */
    nuqtalar.forEach((p) => {
      doc.setFillColor(...OQ);
      doc.circle(p.x, p.y, 1.25, 'F');
      doc.setFillColor(...rang);
      doc.circle(p.x, p.y, 0.85, 'F');
    });

    /* Охирги қиймат — чизиқ учида */
    const oxirgi = nuqtalar[nuqtalar.length - 1];
    if (oxirgi) {
      doc.setFont('Hisobot', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(...rang);
      doc.text(raqam(q.qiymatlar[q.qiymatlar.length - 1] ?? 0, d.foiz ?? false), oxirgi.x, oxirgi.y - 2.4, {
        align: 'right',
      });
    }
  });

  /* Ой номлари — сиғмаса биттадан ошириб */
  doc.setFont('Hisobot', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(...MATN);
  const orasi = Math.max(1, Math.ceil((n * 9) / chizEni));
  d.nomlar.forEach((nom, i) => {
    if (i % orasi !== 0 && i !== n - 1) return;
    doc.text(nom, chizX + i * qadamX, joy.y + chizBoyi + 3.6, { align: 'center' });
  });

  doc.setDrawColor(...MATN);
  doc.setLineWidth(0.25);
  doc.line(chizX, joy.y + chizBoyi, chizX + chizEni, joy.y + chizBoyi);
}

function qatorRangi(d: Diagramma, i: number): [number, number, number] {
  return d.qatorlar.length > 1 ? TOIFA[i % TOIFA.length] : ASOSIY;
}

/* ═══════════════════════════════════════════════════════════ */

/**
 * Диаграммани чизади ва эгаллаган баландликни қайтаради.
 *
 * Саҳифа синиши чақирувчида ҳал қилинади: бу функция ўзига
 * берилган жойга чизади, янги саҳифа очмайди. Шунда ҳисобот
 * тузилиши битта жойда — `pdf.ts` да — бошқарилади.
 */
export function diagrammaChiz(
  doc: jsPDF,
  d: Diagramma,
  x: number,
  y: number,
  eni: number,
  lotin = false
): number {
  lotinRejimi = lotin;
  const bosh = y;
  let joyY = sarlavhaChiz(doc, d, x, y + 3.4, eni);
  joyY = izohChiz(doc, d, x, joyY + 1.5);

  const boyi = diagrammaBoyi(d);
  const joy: Joy = { x, y: joyY, eni, boyi };

  switch (d.turi) {
    case 'doira':
      doiraChiz(doc, d, joy);
      break;
    case 'gorizontal':
      gorizontalChiz(doc, d, joy);
      break;
    case 'chiziq':
      chiziqChiz(doc, d, joy);
      break;
    default:
      ustunChiz(doc, d, joy);
  }

  return joyY + boyi - bosh + 4;
}

/** Диаграмма умуман чизилиши керакми — барча қиймат нол бўлса, йўқ */
export function chizishgaArziydi(d: Diagramma): boolean {
  if (!d.nomlar.length) return false;
  return d.qatorlar.some((q) => q.qiymatlar.some((v) => v > 0));
}

export { TOIFA as DIAGRAMMA_RANGLARI };
