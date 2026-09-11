/**
 * ============================================================
 *  PDF HISOBOT
 *
 *  Hokim va bandlik rahbari yig'ilishga olib boradigan hujjat.
 *  Ekrandagi narsaning nusxasi emas: qog'ozda boshqa narsa
 *  kerak - sarlavha, sana, imzo joyi va gapirish mumkin bo'lgan
 *  raqamlar.
 *
 *  ── Shrift ──
 *
 *  jsPDF standart shriftlari kirillni ham, o'zbek lotinidagi
 *  `oʻ`/`gʻ` harflarini ham chiza olmaydi - ular WinAnsi
 *  kodlashida yo'q va o'rniga bo'sh kvadrat chiqadi.
 *
 *  Shuning uchun DejaVu Sans ishlatiladi. To'liq fayl 742 KB,
 *  bu esa har bir foydalanuvchiga yuklanadigan og'irlik. Shuning
 *  uchun u faqat kerakli 194 ta belgiga qisqartirilgan: 17 KB.
 *
 *  Shrift PDF bosilganda YUKLANADI, ilova ochilganda emas -
 *  hisobot olmaydigan xodim uni umuman yuklab olmaydi.
 * ============================================================
 */
import type jsPDFType from 'jspdf';

let shriftKeshi: { regular: string; bold: string } | null = null;

/** TTF faylni base64 ga o'giradi - jsPDF shu ko'rinishni talab qiladi */
async function shriftYukla(): Promise<{ regular: string; bold: string }> {
  if (shriftKeshi) return shriftKeshi;

  const oqi = async (yol: string) => {
    const javob = await fetch(yol);
    if (!javob.ok) throw new Error(`Shrift yuklanmadi: ${yol}`);
    const bayt = new Uint8Array(await javob.arrayBuffer());

    // Katta massivda `String.fromCharCode(...bayt)` stekni to'ldiradi,
    // shuning uchun bo'lak-bo'lak yig'iladi.
    let s = '';
    const bolak = 8192;
    for (let i = 0; i < bayt.length; i += bolak) {
      s += String.fromCharCode(...bayt.subarray(i, i + bolak));
    }
    return btoa(s);
  };

  shriftKeshi = {
    regular: await oqi('/shrift/hisobot-regular.ttf'),
    bold: await oqi('/shrift/hisobot-bold.ttf'),
  };
  return shriftKeshi;
}

export interface HisobotUstuni {
  sarlavha: string;
  /** Raqam ustunlari o'ngga tekislanadi */
  raqamli?: boolean;
  /** Ustun kengligi (mm). Berilmasa avtomatik */
  eni?: number;
}

export interface HisobotJadvali {
  sarlavha: string;
  izoh?: string;
  ustunlar: HisobotUstuni[];
  qatorlar: (string | number)[][];
}

export interface HisobotKpi {
  nomi: string;
  qiymat: string;
  izoh?: string;
}

export interface HisobotMalumoti {
  sarlavha: string;
  ostSarlavha: string;
  /** Kim uchun tayyorlandi - qog'ozda bu muhim */
  tayyorlagan: string;
  kpi: HisobotKpi[];
  jadvallar: HisobotJadvali[];
  /** Diagramma rasmlari (PNG data URL) - ixtiyoriy */
  rasmlar?: { sarlavha: string; dataUrl: string; eni: number; boyi: number }[];
}

/* ── O'lchamlar (mm) ─────────────────────────────────────────── */
const SAHIFA_ENI = 210;
const CHET = 14;
const ICHKI_EN = SAHIFA_ENI - CHET * 2;

/* ── Ranglar (RGB) ───────────────────────────────────────────── */
const KOK: [number, number, number] = [27, 95, 168];
const QORA: [number, number, number] = [17, 24, 39];
const KUL: [number, number, number] = [100, 116, 139];
const OCH: [number, number, number] = [226, 232, 240];

/**
 * Hisobotni yasaydi va brauzerga yuklab beradi.
 *
 * `jspdf` va `jspdf-autotable` dinamik import qilinadi: ular
 * birgalikda ~350 KB va faqat shu tugma bosilganda kerak bo'ladi.
 * Statik import qilinsa, har bir sahifa shu og'irlikni ko'tarib
 * yurardi.
 */
export async function pdfYasa(m: HisobotMalumoti, faylNomi: string): Promise<void> {
  const [{ default: JsPDF }, { default: autoTable }, shrift] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    shriftYukla(),
  ]);

  const doc = new JsPDF({ unit: 'mm', format: 'a4' }) as jsPDFType;

  doc.addFileToVFS('Hisobot-Regular.ttf', shrift.regular);
  doc.addFont('Hisobot-Regular.ttf', 'Hisobot', 'normal');
  doc.addFileToVFS('Hisobot-Bold.ttf', shrift.bold);
  doc.addFont('Hisobot-Bold.ttf', 'Hisobot', 'bold');
  doc.setFont('Hisobot', 'normal');

  let y = CHET;

  /* ── Sarlavha ── */
  doc.setFillColor(...KOK);
  doc.rect(0, 0, SAHIFA_ENI, 2, 'F');

  y += 6;
  doc.setFont('Hisobot', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...QORA);
  doc.text(m.sarlavha, CHET, y);

  y += 6;
  doc.setFont('Hisobot', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...KUL);
  doc.text(m.ostSarlavha, CHET, y);

  y += 5;
  const sana = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.setFontSize(8.5);
  doc.text(`${m.tayyorlagan} · ${sana}`, CHET, y);

  y += 4;
  doc.setDrawColor(...OCH);
  doc.setLineWidth(0.3);
  doc.line(CHET, y, SAHIFA_ENI - CHET, y);
  y += 7;

  /* ── KPI qatori ── */
  if (m.kpi.length) {
    const ustunlar = Math.min(m.kpi.length, 4);
    const kengligi = ICHKI_EN / ustunlar;
    const boyi = 17;

    m.kpi.slice(0, 8).forEach((k, i) => {
      const qator = Math.floor(i / ustunlar);
      const ustun = i % ustunlar;
      const x = CHET + ustun * kengligi;
      const ky = y + qator * (boyi + 3);

      doc.setDrawColor(...OCH);
      doc.setFillColor(250, 251, 253);
      doc.roundedRect(x, ky, kengligi - 3, boyi, 1.5, 1.5, 'FD');

      doc.setFont('Hisobot', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...KUL);
      doc.text(k.nomi, x + 3, ky + 5.5, { maxWidth: kengligi - 8 });

      doc.setFont('Hisobot', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...QORA);
      doc.text(k.qiymat, x + 3, ky + 12);

      if (k.izoh) {
        doc.setFont('Hisobot', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...KUL);
        doc.text(k.izoh, x + 3, ky + 15.5, { maxWidth: kengligi - 8 });
      }
    });

    y += Math.ceil(Math.min(m.kpi.length, 8) / ustunlar) * (boyi + 3) + 4;
  }

  /* ── Diagramma rasmlari ── */
  for (const r of m.rasmlar ?? []) {
    const boyi = (r.boyi / r.eni) * ICHKI_EN;
    if (y + boyi + 12 > 280) {
      doc.addPage();
      y = CHET;
    }
    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...QORA);
    doc.text(r.sarlavha, CHET, y + 4);
    y += 7;
    doc.addImage(r.dataUrl, 'PNG', CHET, y, ICHKI_EN, boyi);
    y += boyi + 7;
  }

  /* ── Jadvallar ── */
  for (const j of m.jadvallar) {
    if (y > 250) {
      doc.addPage();
      y = CHET;
    }

    doc.setFont('Hisobot', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...QORA);
    doc.text(j.sarlavha, CHET, y + 4);
    y += 6;

    if (j.izoh) {
      doc.setFont('Hisobot', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...KUL);
      const satrlar = doc.splitTextToSize(j.izoh, ICHKI_EN);
      doc.text(satrlar, CHET, y + 2.5);
      y += satrlar.length * 3.6 + 2;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: CHET, right: CHET },
      head: [j.ustunlar.map((u) => u.sarlavha)],
      body: j.qatorlar.map((q) => q.map((h) => String(h))),
      styles: {
        font: 'Hisobot',
        fontSize: 8,
        cellPadding: 1.8,
        textColor: QORA,
        lineColor: OCH,
        lineWidth: 0.1,
      },
      headStyles: {
        font: 'Hisobot',
        fontStyle: 'bold',
        fontSize: 8,
        fillColor: [241, 245, 249],
        textColor: QORA,
      },
      alternateRowStyles: { fillColor: [250, 251, 253] },
      columnStyles: Object.fromEntries(
        j.ustunlar.map((u, i) => [
          i,
          { halign: u.raqamli ? ('right' as const) : ('left' as const), cellWidth: u.eni ?? 'auto' },
        ])
      ),
    });

    // autoTable oxirgi Y ni shu yerga yozib qo'yadi
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  }

  /* ── Har sahifaga raqam va poy ── */
  const jami = doc.getNumberOfPages();
  for (let i = 1; i <= jami; i++) {
    doc.setPage(i);
    doc.setFont('Hisobot', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...KUL);
    doc.text(m.ostSarlavha, CHET, 290);
    doc.text(`${i} / ${jami}`, SAHIFA_ENI - CHET, 290, { align: 'right' });
  }

  doc.save(faylNomi);
}
