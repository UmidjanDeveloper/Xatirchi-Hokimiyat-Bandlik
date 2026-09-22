/**
 * ============================================================
 *  PDF ҲИСОБОТ — йиғилишга олиб бориладиган ҳужжат
 *
 *  Экрандаги панелнинг нусхаси эмас. Қоғозда бошқа нарса керак:
 *  муқова, мундарижа, хулоса саҳифаси, имзо жойи ва ҳар
 *  саҳифада колонтитул. Йиғилишда ҳужжат қўлдан-қўлга ўтади ва
 *  «бу қайси саҳифада эди» деган савол тезда чиқади.
 *
 *  ── Тузилиши ──
 *
 *    1-саҳифа   Муқова: сарлавҳа, ҳудуд, сана, асосий рақамлар
 *    2-саҳифа   Хулоса ва тавсиялар — йиғилишда айнан шу ўқилади
 *    3-саҳифа   Мундарижа
 *    кейин      Бўлимлар: кириш, кўрсаткичлар, диаграмма, жадвал
 *    охирида    Имзо жойи ва изоҳ
 *
 *  ── Шрифт ──
 *
 *  jsPDF нинг стандарт шрифтлари кириллни ҳам, ўзбек лотинидаги
 *  `oʻ`/`gʻ` ҳарфларини ҳам чиза олмайди — улар WinAnsi да йўқ
 *  ва ўрнига бўш квадрат чиқади. Шунинг учун DejaVu Sans
 *  ишлатилади, керакли белгиларга қисқартирилган ҳолда (17 КБ).
 *
 *  Шрифт ҳисобот босилганда ЮКЛАНАДИ, илова очилганда эмас.
 * ============================================================
 */
import type jsPDFType from 'jspdf';
import { lotinga } from '@/lib/alifbo';
import type { Bolim, Hisobot, Jadval, Korsatkich } from './turlar';
import { chizishgaArziydi, diagrammaBoyi, diagrammaChiz } from './pdf-grafik';
import { sanaQisqa, sanaUzun } from './sana';

/* ── Ўлчамлар (мм) ───────────────────────────────────────────── */
const EN = 210;
const BOY = 297;
const CHET = 15;
const ICHKI = EN - CHET * 2;
/** Пастда колонтитул учун қолдириладиган жой */
const POY = 14;
/** Мазмун шу чизиқдан ошса — янги саҳифа */
const OXIR = BOY - POY - 4;

/* ── Ранглар ─────────────────────────────────────────────────── */
const KOK: [number, number, number] = [27, 95, 168];
const QORA: [number, number, number] = [17, 24, 39];
const KUL: [number, number, number] = [100, 116, 139];
const OCH: [number, number, number] = [226, 232, 240];
const OQ: [number, number, number] = [255, 255, 255];
const FON: [number, number, number] = [248, 250, 252];
const YASHIL: [number, number, number] = [4, 120, 87];
const SARIQ: [number, number, number] = [161, 98, 7];
const QIZIL: [number, number, number] = [185, 28, 28];

/** Тавсия даражасининг ранги ва белгиси */
const DARAJA: Record<string, { rang: [number, number, number]; nomi: string }> = {
  shoshilinch: { rang: QIZIL, nomi: 'ШОШИЛИНЧ' },
  muhim: { rang: SARIQ, nomi: 'МУҲИМ' },
  imkoniyat: { rang: YASHIL, nomi: 'ИМКОНИЯТ' },
};

/* ── Шрифт ───────────────────────────────────────────────────── */

let shriftKeshi: { regular: string; bold: string } | null = null;

async function shriftYukla(): Promise<{ regular: string; bold: string }> {
  if (shriftKeshi) return shriftKeshi;

  const oqi = async (yol: string) => {
    const javob = await fetch(yol);
    if (!javob.ok) throw new Error(`Shrift yuklanmadi: ${yol}`);
    const bayt = new Uint8Array(await javob.arrayBuffer());
    // Катта массивда `String.fromCharCode(...bayt)` стекни
    // тўлдиради, шунинг учун бўлак-бўлак йиғилади.
    let s = '';
    for (let i = 0; i < bayt.length; i += 8192) {
      s += String.fromCharCode(...bayt.subarray(i, i + 8192));
    }
    return btoa(s);
  };

  shriftKeshi = {
    regular: await oqi('/shrift/hisobot-regular.ttf'),
    bold: await oqi('/shrift/hisobot-bold.ttf'),
  };
  return shriftKeshi;
}

/* ── Чизиш ёрдамчилари ──────────────────────────────────────── */

/**
 * Матнни белгиланган қатор сонига сиғдиради.
 *
 * ЎҚУВЧИ МАТН КЕСИЛГАНИНИ КЎРИШИ КЕРАК. Илгари ортиқча қатор
 * жимгина ташлаб юбориларди ва изоҳ сўз ўртасида тугарди:
 * «эълон қилинган 18 тадан · 0 таси» — «банд» сўзи йўқолган, ва
 * ҳисоботни ўқиган одам буни билмасди ҳам.
 *
 * Энди охирги қаторга уч нуқта қўшилади: жумла тугамаганини
 * кўрсатади ва тўлиқ рақам жадвалда борлигини эслатади.
 *
 * Синов учун экспорт қилинган (`scripts/pdf-sinov.ts`).
 */
export function sigdir(doc: jsPDFType, matn: string, eni: number, qatorlar = 2): string[] {
  const barchasi = doc.splitTextToSize(matn, eni) as string[];
  if (barchasi.length <= qatorlar) return barchasi;

  const kesilgan = barchasi.slice(0, qatorlar);
  const oxirgi = kesilgan[qatorlar - 1];

  /*
   * Уч нуқта қўшилгач қатор кенгайиб кетмаслиги учун охиридан
   * бир неча белги олиб ташланади — сўз чегарасигача.
   */
  let matnBilan = `${oxirgi} …`;
  while (doc.getTextWidth(matnBilan) > eni && matnBilan.length > 4) {
    matnBilan = `${matnBilan.slice(0, -3).trimEnd()} …`;
  }
  kesilgan[qatorlar - 1] = matnBilan;
  return kesilgan;
}

/** Ҳолат бўйича ранг: яхшиланиш йўналишини ҳисобга олади */
function korsatkichRangi(k: Korsatkich): [number, number, number] {
  if (k.foiz === undefined || k.yonalish === 'betaraf' || !k.yonalish) return QORA;
  if (k.yonalish === 'kop-yaxshi') {
    return k.foiz >= 70 ? YASHIL : k.foiz >= 40 ? SARIQ : QIZIL;
  }
  return k.foiz <= 10 ? YASHIL : k.foiz <= 30 ? SARIQ : QIZIL;
}

class Hujjat {
  readonly doc: jsPDFType;
  y = CHET;
  /** Мундарижа учун: бўлим номи → саҳифа */
  readonly mundarija: { sarlavha: string; sahifa: number }[] = [];
  /**
   * Ҳужжатнинг ЎЗ ёзувларини танланган алифбога ўгиради.
   *
   * Маълумот қаторлари серверда аллақачон ўгирилган, аммо бу
   * файлдаги «ҲУДУД», «МУНДАРИЖА», «ТАЙЁРЛАДИ» каби ёзувлар
   * кириллда терилган. Улар шу ердан ўтади, акс ҳолда битта
   * ҳужжатда икки алифбо аралашади.
   */
  readonly a: (matn: string) => string;

  constructor(doc: jsPDFType, lotin: boolean) {
    this.doc = doc;
    this.a = lotin ? lotinga : (m: string) => m;
  }

  /** Керакли баландлик сиғмаса — янги саҳифа очади */
  joyOchar(kerak: number): void {
    if (this.y + kerak > OXIR) this.yangiSahifa();
  }

  yangiSahifa(): void {
    this.doc.addPage();
    this.y = CHET;
  }

  matn(
    s: string,
    o: {
      olcham?: number;
      qalin?: boolean;
      rang?: [number, number, number];
      x?: number;
      eni?: number;
      markaz?: boolean;
      ong?: boolean;
      satrOrasi?: number;
    } = {}
  ): void {
    const { doc } = this;
    doc.setFont('Hisobot', o.qalin ? 'bold' : 'normal');
    doc.setFontSize(o.olcham ?? 9);
    doc.setTextColor(...(o.rang ?? QORA));

    const x = o.x ?? (o.markaz ? EN / 2 : o.ong ? EN - CHET : CHET);
    const satrlar = doc.splitTextToSize(s, o.eni ?? ICHKI) as string[];
    const orasi = o.satrOrasi ?? (o.olcham ?? 9) * 0.42;

    doc.text(satrlar, x, this.y, {
      align: o.markaz ? 'center' : o.ong ? 'right' : 'left',
      lineHeightFactor: 1.32,
    });
    this.y += satrlar.length * orasi;
  }

  chiziq(rang: [number, number, number] = OCH, qalinlik = 0.3): void {
    this.doc.setDrawColor(...rang);
    this.doc.setLineWidth(qalinlik);
    this.doc.line(CHET, this.y, EN - CHET, this.y);
  }
}

/* ── Муқова ──────────────────────────────────────────────────── */

function muqova(h: Hujjat, m: Hisobot): void {
  const { doc } = h;

  /* Тепадаги ранг майдони */
  doc.setFillColor(...KOK);
  doc.rect(0, 0, EN, 58, 'F');

  doc.setFont('Hisobot', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...OQ);
  doc.text(m.ostSarlavha.toUpperCase(), CHET, 20);

  doc.setFont('Hisobot', 'bold');
  doc.setFontSize(20);
  const sarlavhaSatrlari = doc.splitTextToSize(m.sarlavha, ICHKI) as string[];
  doc.text(sarlavhaSatrlari, CHET, 33);

  doc.setFont('Hisobot', 'normal');
  doc.setFontSize(11);
  doc.text(m.qamrovNomi, CHET, 33 + sarlavhaSatrlari.length * 7.6 + 3);

  h.y = 70;

  /* Ҳужжат маълумоти */
  const sana = sanaUzun(m.sana, m.lotin);

  doc.setFillColor(...FON);
  doc.setDrawColor(...OCH);
  doc.setLineWidth(0.2);
  doc.roundedRect(CHET, h.y, ICHKI, 22, 1.5, 1.5, 'FD');

  const ustun = ICHKI / 3;
  const maydonlar: [string, string][] = [
    [h.a('Ҳудуд'), m.qamrovNomi],
    [h.a('Санаси'), sana],
    [h.a('Тайёрлади'), m.tayyorlagan],
  ];
  maydonlar.forEach(([nomi, qiymat], i) => {
    const x = CHET + i * ustun + 4;
    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...KUL);
    doc.text(nomi.toUpperCase(), x, h.y + 7);
    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...QORA);
    doc.text(doc.splitTextToSize(qiymat, ustun - 8) as string[], x, h.y + 13);
  });
  h.y += 30;

  /* Асосий рақамлар — иккита устунда */
  h.matn(h.a('АСОСИЙ КЎРСАТКИЧЛАР'), { olcham: 8, qalin: true, rang: KUL, satrOrasi: 5 });
  h.chiziq();
  h.y += 6;

  const kartaEni = (ICHKI - 6) / 2;
  const kartaBoyi = 26;
  m.bosh.forEach((k, i) => {
    const ustunRaqami = i % 2;
    const qator = Math.floor(i / 2);
    const x = CHET + ustunRaqami * (kartaEni + 6);
    const y = h.y + qator * (kartaBoyi + 5);

    doc.setFillColor(...OQ);
    doc.setDrawColor(...OCH);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, kartaEni, kartaBoyi, 2, 2, 'FD');

    // Чапда ҳолат рангидаги тасма — рақамга ишора
    doc.setFillColor(...korsatkichRangi(k));
    doc.rect(x, y + 2, 1.4, kartaBoyi - 4, 'F');

    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...KUL);
    doc.text(sigdir(doc, k.nomi, kartaEni - 10), x + 5, y + 7);

    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...korsatkichRangi(k));
    doc.text(k.qiymat, x + 5, y + 17.5);

    if (k.izoh) {
      doc.setFont('Hisobot', 'normal');
      doc.setFontSize(6.6);
      doc.setTextColor(...KUL);
      doc.text(sigdir(doc, k.izoh, kartaEni - 10, 2), x + 5, y + 22);
    }
  });
  h.y += Math.ceil(m.bosh.length / 2) * (kartaBoyi + 5) + 4;

  /* Ҳисобот асоси — поядаги изоҳ */
  h.y = BOY - 46;
  h.chiziq();
  h.y += 5;
  h.matn(
    h.a(
      `Ҳисобот ${m.asos.xonadon} хонадон хатлови, ${m.asos.fuqaro} ишсиз фуқаро ёзуви, ${m.asos.topshiriq} чора-тадбир ва ${m.asos.ishOrni} бўш иш ўрни маълумоти асосида тузилган.`
    ),
    { olcham: 7.6, rang: KUL, satrOrasi: 3.4 }
  );
  h.y += 1;
  h.matn(
    h.a(
      'Барча фоизлар ҳисоботда кўрсатилган асосга нисбатан ҳисобланган. Шахсий маълумот (Ф.И.Ш., манзил, телефон) ҳисоботга киритилмайди — аниқ рўйхат тизимнинг ўзида, рухсат текширилган ҳолда кўрилади.'
    ),
    { olcham: 7.6, rang: KUL, satrOrasi: 3.4 }
  );
}

/* ── Хулоса ва тавсиялар ────────────────────────────────────── */

function xulosaSahifasi(h: Hujjat, m: Hisobot): void {
  const { doc } = h;
  h.yangiSahifa();
  h.mundarija.push({ sarlavha: h.a('Хулоса ва тавсиялар'), sahifa: doc.getNumberOfPages() });

  h.matn(h.a('ХУЛОСА ВА ТАВСИЯЛАР'), { olcham: 14, qalin: true, satrOrasi: 7 });
  h.y += 1;
  h.matn(
    h.a(
      m.xulosa.manba === 'ai'
        ? 'Сунъий интеллект таҳлили · жамланган статистика асосида'
        : 'Белгиланган чегаралар бўйича ҳисобланган'
    ),
    { olcham: 7.6, rang: KUL, satrOrasi: 4 }
  );
  h.chiziq(KOK, 0.6);
  h.y += 7;

  /* Ҳозирги ҳолат */
  if (m.xulosa.holat) {
    doc.setFillColor(...FON);
    doc.setDrawColor(...OCH);
    doc.setLineWidth(0.2);
    const satrlar = doc.splitTextToSize(m.xulosa.holat, ICHKI - 10) as string[];
    const balandlik = satrlar.length * 4.4 + 13;
    doc.roundedRect(CHET, h.y, ICHKI, balandlik, 1.5, 1.5, 'FD');

    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...KUL);
    doc.text(h.a('ҲОЗИРГИ ҲОЛАТ'), CHET + 5, h.y + 7);

    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...QORA);
    doc.text(satrlar, CHET + 5, h.y + 13, { lineHeightFactor: 1.38 });

    h.y += balandlik + 8;
  }

  /* Тавсиялар */
  if (!m.xulosa.tavsiyalar.length) {
    h.matn(h.a('Ҳозирги маълумот асосида алоҳида тавсия чиқмади.'), { rang: KUL, olcham: 9, satrOrasi: 5 });
  }

  m.xulosa.tavsiyalar.forEach((t, i) => {
    const d = DARAJA[t.daraja] ?? DARAJA.muhim;

    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(9.5);
    const sarlavhaSatrlari = doc.splitTextToSize(`${i + 1}. ${t.sarlavha}`, ICHKI - 32) as string[];
    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(8);
    const dalilSatrlari = doc.splitTextToSize(t.dalil, ICHKI - 10) as string[];

    /*
     * ── ҚАДАМЛАР, МАСЪУЛ, МУДДАТ ВА ЎЛЧОВ ──
     *
     * Ҳисобот йиғилишга босиб чиқарилади ва айнан шу тўртта
     * сатр бўйича ҳисоб сўралади. Экранда улар бор эди, PDF
     * да эса йўқ эди — қоғозга фақат «нима қилиш керак»
     * тушарди, «ким» ва «қачонгача» тушмасди.
     */
    const qadamSatrlari: string[] = [];
    for (const q of t.qadamlar ?? []) {
      qadamSatrlari.push(...(doc.splitTextToSize(`•  ${q}`, ICHKI - 14) as string[]));
    }

    const belgilar: string[] = [];
    if (t.masul) belgilar.push(`${h.a('Масъул')}: ${t.masul}`);
    if (t.muddat) belgilar.push(`${h.a('Муддат')}: ${t.muddat}`);
    const belgiSatri = belgilar.join('   ·   ');
    const olchovSatrlari = t.olchov
      ? (doc.splitTextToSize(`${h.a('Ўлчов')}: ${t.olchov}`, ICHKI - 10) as string[])
      : [];

    const balandlik =
      sarlavhaSatrlari.length * 4.6 +
      dalilSatrlari.length * 3.9 +
      qadamSatrlari.length * 3.9 +
      (belgiSatri ? 4.4 : 0) +
      olchovSatrlari.length * 3.9 +
      9;
    h.joyOchar(balandlik + 4);

    /* Чапдаги даража тасмаси */
    doc.setFillColor(...d.rang);
    doc.rect(CHET, h.y, 1.6, balandlik, 'F');

    /* Даража ёзуви — ўнг юқорида */
    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(...d.rang);
    doc.text(h.a(d.nomi), EN - CHET, h.y + 5, { align: 'right' });

    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...QORA);
    doc.text(sarlavhaSatrlari, CHET + 5, h.y + 5);

    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...KUL);
    let y = h.y + 5 + sarlavhaSatrlari.length * 4.6;
    doc.text(dalilSatrlari, CHET + 5, y, { lineHeightFactor: 1.36 });
    y += dalilSatrlari.length * 3.9;

    if (qadamSatrlari.length) {
      doc.setTextColor(...QORA);
      doc.text(qadamSatrlari, CHET + 8, y + 1.5, { lineHeightFactor: 1.36 });
      y += qadamSatrlari.length * 3.9 + 1.5;
    }

    if (belgiSatri) {
      doc.setFont('Hisobot', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...KUL);
      doc.text(belgiSatri, CHET + 5, y + 2.5);
      y += 4.4;
    }

    if (olchovSatrlari.length) {
      doc.setFont('Hisobot', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(...d.rang);
      doc.text(olchovSatrlari, CHET + 5, y + 2.5, { lineHeightFactor: 1.36 });
    }

    h.y += balandlik + 4;
  });

  /* Огоҳлик */
  if (m.xulosa.ogohlik) {
    h.joyOchar(18);
    h.y += 4;
    h.chiziq();
    h.y += 5;
    h.matn(m.xulosa.ogohlik, { olcham: 7.2, rang: KUL, satrOrasi: 3.3 });
  }
}

/* ── Мундарижа ──────────────────────────────────────────────── */

/**
 * Мундарижа ОХИРИДА тўлдирилади.
 *
 * Саҳифа рақамлари фақат ҳамма бўлим чизилгандан кейин
 * маълум бўлади, шунинг учун бу саҳифа аввал бўш ҳолда
 * ажратилади ва охирида қайта очиб ёзилади.
 */
function mundarijaniYoz(h: Hujjat, sahifaRaqami: number, m: Hisobot): void {
  const { doc } = h;
  doc.setPage(sahifaRaqami);
  h.y = CHET;

  h.matn(h.a('МУНДАРИЖА'), { olcham: 14, qalin: true, satrOrasi: 7 });
  h.chiziq(KOK, 0.6);
  h.y += 8;

  for (const b of h.mundarija) {
    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...QORA);
    doc.text(b.sarlavha, CHET, h.y);

    const nomEni = doc.getTextWidth(b.sarlavha);
    const raqamMatn = String(b.sahifa);
    const raqamEni = doc.getTextWidth(raqamMatn);

    /* Нуқтали чизиқ — ном ва саҳифа рақами орасида */
    doc.setDrawColor(...OCH);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([0.6, 1], 0);
    doc.line(CHET + nomEni + 2, h.y - 0.8, EN - CHET - raqamEni - 2, h.y - 0.8);
    doc.setLineDashPattern([], 0);

    doc.setFont('Hisobot', 'bold');
    doc.text(raqamMatn, EN - CHET, h.y, { align: 'right' });

    h.y += 6.4;
  }

  h.y += 6;
  h.chiziq();
  h.y += 5;
  h.matn(
    h.a(
      `Ҳисобот ${m.bolimlar.length} та бўлимдан иборат. Ҳар бўлимда кўрсаткичлар, диаграмма ва жадвал берилган; бўш бўлимлар ҳисоботга киритилмаган.`
    ),
    { olcham: 7.4, rang: KUL, satrOrasi: 3.3 }
  );
}

/* ── Бўлим ──────────────────────────────────────────────────── */

function korsatkichlarChiz(h: Hujjat, korsatkichlar: Korsatkich[]): void {
  const { doc } = h;
  const ustunSoni = Math.min(korsatkichlar.length, 4);
  const eni = ICHKI / ustunSoni;
  /*
   * Карта баландлиги изоҳнинг ИККИ қаторига мўлжалланган.
   * 19 мм эди ва изоҳга атиги битта қатор қоларди — «эълон
   * қилинган 18 тадан · 0 таси банд» каби изоҳ сўз ўртасида
   * кесиларди.
   */
  const boyi = 23;

  h.joyOchar(Math.ceil(korsatkichlar.length / ustunSoni) * (boyi + 3));

  korsatkichlar.forEach((k, i) => {
    const qator = Math.floor(i / ustunSoni);
    const ustun = i % ustunSoni;
    const x = CHET + ustun * eni;
    const y = h.y + qator * (boyi + 3);

    doc.setFillColor(...FON);
    doc.setDrawColor(...OCH);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, eni - 3, boyi, 1.4, 1.4, 'FD');

    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...KUL);
    doc.text(sigdir(doc, k.nomi, eni - 8), x + 3, y + 5);

    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...korsatkichRangi(k));
    doc.text(k.qiymat, x + 3, y + 13.5);

    if (k.izoh) {
      doc.setFont('Hisobot', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...KUL);
      doc.text(sigdir(doc, k.izoh, eni - 7, 2), x + 3, y + 17, { lineHeightFactor: 1.25 });
    }
  });

  h.y += Math.ceil(korsatkichlar.length / ustunSoni) * (boyi + 3) + 3;
}

async function jadvalChiz(h: Hujjat, j: Jadval): Promise<void> {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc } = h;

  h.joyOchar(26);

  h.matn(j.sarlavha, { olcham: 10, qalin: true, satrOrasi: 5 });
  if (j.izoh) {
    h.matn(j.izoh, { olcham: 7.4, rang: KUL, satrOrasi: 3.3 });
  }
  h.y += 2;

  /* Жами қаторлари — қалин ва устида чизиқ билан */
  const jamiIndekslari = new Set(
    j.qatorlar.map((q, i) => (q.jami ? i : -1)).filter((i) => i >= 0)
  );

  autoTable(doc, {
    startY: h.y,
    margin: { left: CHET, right: CHET, bottom: POY + 4 },
    head: [j.ustunlar.map((u) => u.sarlavha)],
    body: j.qatorlar.map((q) => [q.nomi, ...q.qiymatlar.map((v) => String(v))]),
    styles: {
      font: 'Hisobot',
      fontSize: 7.6,
      cellPadding: { top: 1.7, bottom: 1.7, left: 2.2, right: 2.2 },
      textColor: QORA,
      lineColor: OCH,
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    headStyles: {
      font: 'Hisobot',
      fontStyle: 'bold',
      fontSize: 7.4,
      fillColor: KOK,
      textColor: OQ,
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    columnStyles: Object.fromEntries(
      j.ustunlar.map((u, i) => [
        i,
        {
          halign: u.raqamli ? ('right' as const) : ('left' as const),
          cellWidth: u.eni ?? 'auto',
        },
      ])
    ),
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      if (!jamiIndekslari.has(d.row.index)) return;
      d.cell.styles.fontStyle = 'bold';
      d.cell.styles.fillColor = [237, 242, 249];
      d.cell.styles.lineWidth = { top: 0.4, right: 0, bottom: 0, left: 0 };
      d.cell.styles.lineColor = KOK;
    },
  });

  h.y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
}

async function bolimChiz(h: Hujjat, b: Bolim, raqam: number, m: Hisobot): Promise<void> {
  const { doc } = h;

  /*
   * Бўлим янги саҳифадан бошланади: ўзи шуни талаб қилса ёки
   * жойи кам қолса. Саҳифа ТОЗА бўлса (юқорисида ҳеч нарса йўқ)
   * янгиси очилмайди — акс ҳолда орада бўш варақ қоларди.
   */
  const tozaSahifa = h.y <= CHET;
  if (!tozaSahifa && (b.yangiSahifa || h.y > OXIR - 60)) h.yangiSahifa();

  h.mundarija.push({ sarlavha: `${raqam}. ${b.sarlavha}`, sahifa: doc.getNumberOfPages() });

  /* Бўлим сарлавҳаси */
  doc.setFillColor(...KOK);
  doc.rect(CHET, h.y - 3.4, 2.2, 9, 'F');
  h.matn(`${raqam}. ${b.sarlavha}`, { olcham: 12.5, qalin: true, x: CHET + 6, satrOrasi: 6.4 });

  if (b.kirish) {
    h.matn(b.kirish, { olcham: 7.8, rang: KUL, x: CHET + 6, eni: ICHKI - 6, satrOrasi: 3.5 });
  }
  h.y += 3;
  h.chiziq();
  h.y += 6;

  if (b.korsatkichlar?.length) korsatkichlarChiz(h, b.korsatkichlar);

  for (const d of b.diagrammalar ?? []) {
    if (!chizishgaArziydi(d)) continue;
    const kerak = diagrammaBoyi(d) + 16;
    h.joyOchar(kerak);
    h.y += diagrammaChiz(doc, d, CHET, h.y, ICHKI, m.lotin);
    h.y += 3;
  }

  for (const j of b.jadvallar ?? []) {
    if (!j.qatorlar.length) continue;
    await jadvalChiz(h, j);
  }
}

/* ── Имзо ва колонтитул ─────────────────────────────────────── */

function imzoJoyi(h: Hujjat, m: Hisobot): void {
  const { doc } = h;
  h.joyOchar(52);
  h.y += 6;
  h.chiziq();
  h.y += 8;

  h.matn(h.a('ТАНИШДИ ВА ТАСДИҚЛАДИ'), { olcham: 8, qalin: true, rang: KUL, satrOrasi: 6 });
  h.y += 4;

  const qatorlar: [string, string][] = [
    [h.a('Ҳисоботни тайёрлади'), m.tayyorlagan],
    [h.a('Бандлик маркази раҳбари'), ''],
    [h.a('Туман ҳокими ўринбосари'), ''],
  ];

  for (const [lavozim, ism] of qatorlar) {
    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...KUL);
    doc.text(lavozim, CHET, h.y);

    /* Имзо чизиғи */
    doc.setDrawColor(...OCH);
    doc.setLineWidth(0.25);
    doc.line(CHET + 62, h.y + 0.6, CHET + 112, h.y + 0.6);
    doc.line(CHET + 120, h.y + 0.6, EN - CHET, h.y + 0.6);

    doc.setFontSize(6.2);
    doc.setTextColor(...KUL);
    doc.text(h.a('имзо'), CHET + 87, h.y + 3.6, { align: 'center' });
    doc.text(h.a('Ф.И.Ш.'), CHET + 150, h.y + 3.6, { align: 'center' });

    if (ism) {
      doc.setFont('Hisobot', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...QORA);
      doc.text(ism, CHET + 122, h.y);
    }

    h.y += 13;
  }
}

/** Ҳар саҳифага колонтитул — муқовадан ташқари */
function kolontitul(doc: jsPDFType, m: Hisobot): void {
  const jami = doc.getNumberOfPages();

  for (let i = 2; i <= jami; i++) {
    doc.setPage(i);

    /* Тепада */
    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...KUL);
    doc.text(`${m.sarlavha} · ${m.qamrovNomi}`, CHET, 9);
    doc.setDrawColor(...OCH);
    doc.setLineWidth(0.2);
    doc.line(CHET, 11, EN - CHET, 11);

    /* Пастда */
    doc.line(CHET, BOY - POY + 2, EN - CHET, BOY - POY + 2);
    doc.setFontSize(6.8);
    doc.setTextColor(...KUL);
    doc.text(m.ostSarlavha, CHET, BOY - POY + 6.4);
    doc.text(sanaQisqa(m.sana), EN / 2, BOY - POY + 6.4, { align: 'center' });
    doc.setFont('Hisobot', 'bold');
    doc.text(`${i} / ${jami}`, EN - CHET, BOY - POY + 6.4, { align: 'right' });
  }
}

/* ═══════════════════════════════════════════════════════════ */

/**
 * Ҳисоботни PDF қилиб яратади ва браузерга юклаб беради.
 *
 * `jspdf` ва `jspdf-autotable` динамик импорт қилинади: улар
 * биргаликда ~350 КБ ва фақат шу тугма босилганда керак. Статик
 * импорт қилинса, ҳар бир саҳифа шу оғирликни кўтариб юрарди.
 */
export async function pdfYasa(m: Hisobot, faylNomi: string): Promise<void> {
  const [{ default: JsPDF }, shrift] = await Promise.all([import('jspdf'), shriftYukla()]);

  const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true }) as jsPDFType;

  doc.addFileToVFS('Hisobot-Regular.ttf', shrift.regular);
  doc.addFont('Hisobot-Regular.ttf', 'Hisobot', 'normal');
  doc.addFileToVFS('Hisobot-Bold.ttf', shrift.bold);
  doc.addFont('Hisobot-Bold.ttf', 'Hisobot', 'bold');
  doc.setFont('Hisobot', 'normal');

  doc.setProperties({
    title: `${m.sarlavha} — ${m.qamrovNomi}`,
    subject: m.ostSarlavha,
    author: m.tayyorlagan,
    creator: m.ostSarlavha,
  });

  const h = new Hujjat(doc, m.lotin);

  muqova(h, m);
  xulosaSahifasi(h, m);

  /*
   * Мундарижа учун бўш саҳифа ажратамиз.
   *
   * Саҳифа рақамлари фақат ҳамма бўлим чизилгандан кейин маълум
   * бўлади, шунинг учун бу саҳифа ҲОЗИР ажратилади ва охирида
   * қайта очиб тўлдирилади.
   *
   * Кейин ДАРҲОЛ яна бир саҳифа очилади: акс ҳолда биринчи бўлим
   * шу ажратилган саҳифага чизиларди ва мундарижа унинг устига
   * ёзиларди. Бир марта шу хато бўлган — ҳисоботнинг 4-саҳифасида
   * мундарижа билан биринчи бўлим бир-бирига қўшилиб кетган эди.
   */
  h.yangiSahifa();
  const mundarijaSahifasi = doc.getNumberOfPages();
  h.yangiSahifa();

  let raqam = 1;
  for (const b of m.bolimlar) {
    const bor =
      (b.korsatkichlar?.length ?? 0) > 0 ||
      (b.jadvallar ?? []).some((j) => j.qatorlar.length) ||
      (b.diagrammalar ?? []).some(chizishgaArziydi);
    if (!bor) continue;
    await bolimChiz(h, b, raqam, m);
    raqam++;
  }

  imzoJoyi(h, m);
  mundarijaniYoz(h, mundarijaSahifasi, m);
  kolontitul(doc, m);

  doc.save(faylNomi);
}
