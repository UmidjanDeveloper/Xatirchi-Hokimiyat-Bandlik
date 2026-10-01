/**
 * ============================================================
 *  MAJBURIY REGRESSIYA HOLATLARI — XARITA VA HIMOYA
 *
 *  Ishga tushirish:  npx tsx scripts/regressiya-xaritasi-sinov.ts
 *  Hujjat uchun jadval:  npx tsx scripts/regressiya-xaritasi-sinov.ts --md
 *
 *  15 ta majburiy holat har biri HAQIQIY xatti-harakat sinovi bilan
 *  qoplangan bo'lishi kerak ("kodda kerakli so'z bor" yetarli emas).
 *  Bu fayl:
 *   1. har bir holat qaysi sinov(lar)ga tayanishini yozadi;
 *   2. sinov nomi o'sha faylda HALI BOR ekanini tekshiradi (sinov
 *      o'chirib yuborilsa yoki nomi o'zgarsa - yiqiladi);
 *   3. har bir sinovning TURI to'g'ri yozilganini tekshiradi: "baza"/"http"
 *      deb belgilangan sinov haqiqatan bazaga/serverga murojaat qiladi;
 *      "sof" deb belgilangani esa manba matnini o'qib "tekshirmaydi".
 *      Shunda kod-grep sinovi xulq-atvor sinovi deb o'tib ketmaydi.
 *
 *  Bu sinovlarning O'ZI o'tishi `npm run sinov` va `npm run sinov:http`
 *  natijasiga bog'liq: bu yerda faqat xarita tekshiriladi.
 * ============================================================
 */
import { readFileSync } from 'node:fs';

/** kod = manba matnini o'qiydi (faqat QO'SHIMCHA: o'zi yetarli hisoblanmaydi) */
type Tur = 'baza' | 'http' | 'sof' | 'kod';
interface Tayanch {
  fayl: string;
  /** Sinov nomining bir qismi (aniq) */
  nomi: string;
  tur: Tur;
}
interface Holat {
  raqam: number;
  matn: string;
  tayanch: Tayanch[];
}

const HOLATLAR: Holat[] = [
  {
    raqam: 1,
    matn: 'Boshqa tug\'ilgan sana avtomatik mos deb olinmaydi',
    tayanch: [
      { fayl: 'scripts/dalil-sinov.ts', nomi: 'Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ', tur: 'sof' },
      { fayl: 'scripts/dalil-sinov.ts', nomi: 'Сана ЕТИШМАСА — алоҳида гуруҳ, автоматик тасдиқланмайди', tur: 'sof' },
    ],
  },
  {
    raqam: 2,
    matn: 'Eski ish dalili yangi ishni tasdiqlamaydi',
    tayanch: [{ fayl: 'scripts/joylashish-sinov.ts', nomi: 'ЭСКИ ишнинг далили ЯНГИ ишни тасдиқламайди', tur: 'baza' }],
  },
  {
    raqam: 3,
    matn: 'Takror satr va parallel import takror dalil yaratmaydi',
    tayanch: [
      { fayl: 'scripts/dalil-sinov.ts', nomi: 'Файл ичидаги ТАКРОР сатр иккита далил ясамайди', tur: 'kod' },
      { fayl: 'scripts/dalil-sinov.ts', nomi: 'Ўша сана билан такрор юклаш нусха ясамайди', tur: 'baza' },
      { fayl: 'scripts/dalil-sinov.ts', nomi: 'ПАРАЛЛЕЛ юклаш: бир вақтда 5 та бир хил кўчирма — БИТТА далил', tur: 'baza' },
    ],
  },
  {
    raqam: 4,
    matn: 'Noto\'g\'ri sana rad etiladi',
    tayanch: [
      { fayl: 'scripts/dalil-sinov.ts', nomi: '31.02.2000 РАД ЭТИЛАДИ — мартга сурилмайди', tur: 'sof' },
      { fayl: 'scripts/dalil-sinov.ts', nomi: '13-ой ва 32-кун рад этилади', tur: 'sof' },
    ],
  },
  {
    raqam: 5,
    matn: 'A va B xodim qoralamalari bir-birini o\'chirmaydi',
    tayanch: [{ fayl: 'scripts/navbat-sinov.ts', nomi: 'Икки ходимнинг қораламаси бир-бирини БОСМАЙДИ', tur: 'sof' }],
  },
  {
    raqam: 6,
    matn: 'Ikki oynadagi anketalar aralashmaydi',
    tayanch: [{ fayl: 'scripts/navbat-sinov.ts', nomi: 'Битта ходим ИККИТА анкетани параллел сақлай олади', tur: 'sof' }],
  },
  {
    raqam: 7,
    matn: 'Qoralama javobi yo\'qolgandan keyingi yakuniy yuborish to\'g\'ri ishlaydi',
    tayanch: [
      { fayl: 'scripts/idempotent-sinov.ts', nomi: 'ҚОРАЛАМА → ЯКУНИЙ: такрор ЭМАС, ёзув янгиланади', tur: 'sof' },
      { fayl: 'scripts/idempotent-sinov.ts', nomi: 'Қоралама → якуний, мазмун ЎЗГАРМАГАН бўлса ҳам — давом', tur: 'sof' },
    ],
  },
  {
    raqam: 8,
    matn: 'Bir kalitdagi boshqa mazmun ziddiyat beradi',
    tayanch: [{ fayl: 'scripts/idempotent-sinov.ts', nomi: 'Якуний икки марта, БОШҚА мазмун билан — ЗИДДИЯТ', tur: 'sof' }],
  },
  {
    raqam: 9,
    matn: 'Boshqa mahalla yozuviga kirib bo\'lmaydi',
    tayanch: [
      { fayl: 'scripts/http-regressiya.ts', nomi: '9a.', tur: 'http' },
      { fayl: 'scripts/http-regressiya.ts', nomi: '9b.', tur: 'http' },
      { fayl: 'scripts/http-regressiya.ts', nomi: '9c.', tur: 'http' },
      { fayl: 'scripts/http-regressiya.ts', nomi: '9d.', tur: 'http' },
      { fayl: 'scripts/http-regressiya.ts', nomi: '9e.', tur: 'http' },
      { fayl: 'scripts/http-regressiya.ts', nomi: '9f.', tur: 'http' },
      { fayl: 'scripts/murojaat-sinov.ts', nomi: 'begona mahalla yettiligi tegina olmaydi', tur: 'baza' },
    ],
  },
  {
    raqam: 10,
    matn: 'Eski sessiya /tablo orqali huquqni saqlab qolmaydi',
    tayanch: [
      { fayl: 'scripts/http-regressiya.ts', nomi: '10b.', tur: 'http' },
      { fayl: 'scripts/http-regressiya.ts', nomi: '10c.', tur: 'http' },
      { fayl: 'scripts/http-regressiya.ts', nomi: '10d.', tur: 'http' },
      { fayl: 'scripts/http-regressiya.ts', nomi: '10e.', tur: 'http' },
    ],
  },
  {
    raqam: 11,
    matn: 'Webhook sirsiz biznes amal bajarmaydi',
    tayanch: [
      { fayl: 'scripts/webhook-sinov.ts', nomi: 'SIR YO', tur: 'baza' },
      { fayl: 'scripts/webhook-sinov.ts', nomi: 'SIR NOTO', tur: 'baza' },
    ],
  },
  {
    raqam: 12,
    matn: 'Takror Telegram yangilanishi takror amal yaratmaydi',
    tayanch: [
      { fayl: 'scripts/webhook-sinov.ts', nomi: 'TAKROR YANGILANISH: Telegram bir xil update_id', tur: 'baza' },
      { fayl: 'scripts/webhook-sinov.ts', nomi: 'BIR VAQTDA 8 TA bir xil update', tur: 'baza' },
    ],
  },
  {
    raqam: 13,
    matn: 'Parallel moderatorlardan faqat bittasining qarori dastlabki holatga qo\'llanadi',
    tayanch: [{ fayl: 'scripts/moderatsiya-sinov.ts', nomi: 'Иккита раҳбар бир вақтда: фақат БИТТА қарор ўтади', tur: 'baza' }],
  },
  {
    raqam: 14,
    matn: 'Telegram ishlamasa xabar navbatda qoladi',
    tayanch: [
      { fayl: 'scripts/monitoring-sinov.ts', nomi: 'Telegram yuborilmasa: xabar navbatda QOLADI', tur: 'baza' },
      { fayl: 'scripts/xabarnoma-sinov.ts', nomi: 'Хато бўлса хабар ЙЎҚОЛМАЙДИ — навбатда қолади', tur: 'baza' },
    ],
  },
  {
    raqam: 15,
    matn: 'Hisobotdagi sonlar tegishli dalil va davrga mos keladi',
    tayanch: [
      { fayl: 'scripts/dalil-sinov.ts', nomi: 'Жамланма туман ҳолати билан бир хил', tur: 'baza' },
      { fayl: 'scripts/joylashish-sinov.ts', nomi: 'Ҳисобот таркиби жамга тўғри келади', tur: 'baza' },
      { fayl: 'scripts/sana-sinov.ts', nomi: 'Ҳисобот муқоваси: тунги ҳисобот КЕЧАГИ санани ёзмайди', tur: 'sof' },
    ],
  },
];

const oqi = (y: string) => readFileSync(y, 'utf8');

/** Sinov matni: nomi turgan joydan keyingi sinov boshlanishigacha */
function sinovMatni(kod: string, nomi: string): string | null {
  const i = kod.indexOf(nomi);
  if (i < 0) return null;
  const keyingi = kod.indexOf('nomi:', i + nomi.length);
  return kod.slice(i, keyingi < 0 ? undefined : keyingi);
}

/** Manba matnini o'qib "tekshiradigan" sinov (kod-grep) */
const KOD_GREP = /readFileSync|\boqi\(|\.includes\('|kodiOl\(|_KODI\b/;
/** Haqiqiy murojaat: baza yoki server */
const BAZAGA = /\bawait\b|prisma\.|\bsorov\(|Promise\.all/;

interface Natija {
  nomi: string;
  ok: boolean;
}

function tekshir(): Natija[] {
  const n: Natija[] = [];
  const nomiMavjud: string[] = [];
  const tur: string[] = [];

  for (const h of HOLATLAR) {
    for (const t of h.tayanch) {
      const m = sinovMatni(oqi(t.fayl), t.nomi);
      if (m === null) nomiMavjud.push(`${h.raqam}: "${t.nomi.slice(0, 50)}" — ${t.fayl} da topilmadi`);
      else {
        if (t.tur === 'sof' && KOD_GREP.test(m)) tur.push(`${h.raqam}: "${t.nomi.slice(0, 40)}" "sof" deb yozilgan, lekin manba matnini o'qiydi`);
        if ((t.tur === 'baza' || t.tur === 'http') && !BAZAGA.test(m)) tur.push(`${h.raqam}: "${t.nomi.slice(0, 40)}" "${t.tur}" deb yozilgan, lekin bazaga/serverga murojaat qilmaydi`);
        if (t.tur === 'kod' && !KOD_GREP.test(m)) tur.push(`${h.raqam}: "${t.nomi.slice(0, 40)}" "kod" deb yozilgan, lekin manba matnini o'qimaydi (turini yangilang)`);
      }
    }
  }

  n.push({ nomi: 'Hamma 15 ta majburiy holat xaritada bor (1..15, ketma-ket)', ok: HOLATLAR.length === 15 && HOLATLAR.every((h, i) => h.raqam === i + 1) });
  n.push({ nomi: 'Har bir holat kamida bitta sinovga tayanadi', ok: HOLATLAR.every((h) => h.tayanch.length > 0) });
  n.push({ nomi: 'Har bir tayanch sinov o\'z faylida HALI BOR (o\'chirilmagan, nomi o\'zgarmagan)', ok: nomiMavjud.length === 0 });
  if (nomiMavjud.length) console.log('     ', nomiMavjud.join('\n      '));
  n.push({ nomi: 'Sinov turi to\'g\'ri yozilgan: "baza/http" haqiqatan murojaat qiladi, "sof" kod matnini o\'qimaydi', ok: tur.length === 0 });
  if (tur.length) console.log('     ', tur.join('\n      '));
  n.push({
    nomi: 'Hech bir holat FAQAT kod-grep bilan qoplanmagan: har holatda kamida bitta haqiqiy xulq-atvor sinovi (sof funksiya, baza yoki server)',
    ok: HOLATLAR.every((h) => h.tayanch.some((t) => t.tur !== 'kod')),
  });
  return n;
}

function md(): string {
  const q = ['| № | Holat | Sinov | Turi |', '|---|---|---|---|'];
  for (const h of HOLATLAR) {
    h.tayanch.forEach((t, i) => {
      const turNomi = t.tur === 'http' ? 'haqiqiy server (HTTP)' : t.tur === 'baza' ? 'baza bilan' : t.tur === 'kod' ? 'kod himoyasi (qo\'shimcha)' : 'sof mantiq (kod-grep emas)';
      q.push(`| ${i === 0 ? h.raqam : ''} | ${i === 0 ? h.matn : ''} | \`${t.fayl.replace('scripts/', '')}\`: ${t.nomi} | ${turNomi} |`);
    });
  }
  return q.join('\n');
}

if (process.argv.includes('--md')) {
  console.log(md());
  process.exit(0);
}

const natijalar = tekshir();
let xato = 0;
for (const r of natijalar) {
  if (!r.ok) xato++;
  console.log(`${r.ok ? 'OK  ' : 'XATO'} ${r.nomi}`);
}
console.log(`\n${natijalar.length - xato}/${natijalar.length} o'tdi`);
process.exit(xato ? 1 : 0);
