/**
 * ============================================================
 *  MUROJAAT MUDDATI HAQIDA TELEGRAM XABARI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/murojaat-xabari-sinov.ts
 *
 *  Bu yerda xato nimaga olib keladi:
 *   1. TAKROR XABAR: har kuni cron ishlaydi, bir xil muddat uchun har safar
 *      xabar ketsa xodim ogohlantirishni e'tiborsiz qoldiradigan bo'ladi;
 *      cron va qo'lda tugma bir vaqtda ishlasa ikki nusxa chiqadi.
 *   2. XABAR TOSHQINI: ko'p eski kechikkan murojaat bo'lsa bir kunda yuzlab
 *      xabar - Telegram bot bloklanishi mumkin.
 *   3. SHAXSIY MA'LUMOT: murojaatchi ismi, telefoni, murojaat matni
 *      Telegram serverida qolib ketadi.
 *   4. XABAR QO'YISH NAVBATNI TO'SIB QO'YSA: boshqa xabarlar (brifing,
 *      e'lonlar) ham ketmay qoladi.
 *   5. MUDDAT UZAYTIRILGANDA YANGI OGOHLANTIRISH KELMASA.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { prisma as ilovaPrisma } from '../src/lib/prisma';
import {
  MAKS_KECHIKISH_KUNI,
  MAKS_XABAR,
  murojaatMuddatiXabarlari,
  xabarKaliti,
  xabarMatni,
  xabarRejasi,
  type MuddatMurojaati,
} from '../src/lib/murojaat-xabari';
import { navbatniYubor } from '../src/lib/xabarnoma';

type Sinov = { nomi: string; tekshir: () => Promise<boolean> | boolean };
const prisma = new PrismaClient();
const KUN = 86400_000;
const oqi = (y: string) => readFileSync(y, 'utf8');
const TOSHKENT = 5 * 3600_000;

/** Toshkent kunining tushlik vaqti: hozirdan `n` kun keyin (sana chegarasi xavfi yo'q) */
function kunga(n: number, hozir: Date): Date {
  const t = new Date(hozir.getTime() + TOSHKENT);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + n, 12) - TOSHKENT);
}
/** Sinov "hozir"i: Toshkent bo'yicha 10:00 */
const HOZIR = new Date(Date.UTC(2026, 9, 10, 5, 0, 0));

let sanagich = 0;
const mur = (q: Partial<MuddatMurojaati> & { kun: number }): MuddatMurojaati => ({
  id: `m${++sanagich}`,
  raqami: `M-2026-${String(sanagich).padStart(4, '0')}`,
  holati: 'JARAYONDA',
  javobMuddati: kunga(q.kun, HOZIR),
  mahallaNomi: 'Бахшишар',
  masulId: 'masul1',
  masulIsmi: 'Қодиров А.',
  masulFaol: true,
  ...q,
});
const RAHBARLAR = [
  { userId: 'rahbar1', faol: true },
  { userId: 'rahbar2', faol: true },
  { userId: 'rahbar3', faol: false },
];
const kimlar = (x: { userId: string }[]) => x.map((y) => y.userId).sort().join(',');

/* ── bazaviy ma'lumot ── */
const xodimlar: string[] = [];
const murojaatlar: string[] = [];
let mahallaId = '';
let masul = '';
let masulChat = '';
let rahbarA = '';
let rahbarB = '';

async function user(nom: string, rol: 'YETTILIK' | 'BANDLIK_RAHBAR', faol = true, chat: string | null = null) {
  const x = await prisma.user.create({
    data: { username: `mx_${nom}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, fullName: `Sinov ${nom}`, passwordHash: 'x', rol, mahallaId: rol === 'YETTILIK' ? mahallaId : null, faol, telegramChatId: chat },
    select: { id: true },
  });
  xodimlar.push(x.id);
  return x.id;
}
async function murojaatYoz(q: { kun: number; holati?: 'YANGI' | 'JARAYONDA' | 'JAVOB_BERILDI' | 'YOPILDI'; masulId?: string }) {
  const m = await prisma.murojaat.create({
    data: {
      raqami: `T-MX-${Date.now()}-${++sanagich}`,
      mahallaId,
      murojaatchiNomi: 'MAXFIY Murojaatchi Ismi',
      murojaatchiTelefon: '+998945123378',
      kanal: 'TELEFON',
      tavsif: 'MAXFIY murojaat matni: kasallik va qarz haqida',
      qabulVaqti: new Date(Date.now() - 20 * KUN),
      masulId: q.masulId ?? masul,
      javobMuddati: kunga(q.kun, new Date()),
      holati: q.holati ?? 'JARAYONDA',
      yaratganId: masul,
    },
    select: { id: true },
  });
  murojaatlar.push(m.id);
  return m.id;
}
const xabarlar = (ids: string[]) =>
  prisma.xabarnoma.findMany({ where: { turi: 'MUROJAAT_MUDDATI', bogliqId: { in: ids } }, select: { id: true, userId: true, bogliqId: true, bogliqTuri: true, matn: true, holati: true } });

async function tozala() {
  await prisma.xabarnoma.deleteMany({ where: { turi: 'MUROJAAT_MUDDATI', bogliqId: { in: murojaatlar } } });
  await prisma.murojaat.deleteMany({ where: { id: { in: murojaatlar } } });
  await prisma.xabarnoma.deleteMany({ where: { userId: { in: xodimlar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
}

const SINOVLAR: Sinov[] = [
  /* ══ SOF REJA ══ */
  {
    nomi: 'Reja: muddat BUGUN va ERTAGA - masulga "yaqin"; 2-3 kun qolgan va uzoq - hech narsa',
    tekshir: () => {
      const r = (k: number) => xabarRejasi([mur({ kun: k })], RAHBARLAR, new Set(), HOZIR);
      const bugun = r(0);
      const ertaga = r(1);
      return (
        bugun.length === 1 && bugun[0].userId === 'masul1' && /bugun|бугун/.test(bugun[0].matn) && bugun[0].bogliqTuri?.startsWith('muddat-yaqin:') === true &&
        ertaga.length === 1 && /эртага/.test(ertaga[0].matn) && r(2).length === 0 && r(3).length === 0 && r(10).length === 0
      );
    },
  },
  {
    nomi: 'Reja: KECHIKKAN - masulga VA faol rahbarlarga (nofaol rahbarga YO\'Q); masul rahbar bo\'lsa bitta xabar; masul nofaol bo\'lsa faqat rahbarlarga',
    tekshir: () => {
      const a = xabarRejasi([mur({ kun: -2 })], RAHBARLAR, new Set(), HOZIR);
      const b = xabarRejasi([mur({ kun: -2, masulId: 'rahbar1' })], RAHBARLAR, new Set(), HOZIR);
      const v = xabarRejasi([mur({ kun: -2, masulFaol: false })], RAHBARLAR, new Set(), HOZIR);
      /* Masulning o'ziga "Масъул: <o'zi>" qatori keraksiz; boshqa rahbarga kerak */
      const bMasulga = b.find((x) => x.userId === 'rahbar1')?.matn ?? '';
      const bBoshqaga = b.find((x) => x.userId === 'rahbar2')?.matn ?? '';
      return (
        kimlar(a) === 'masul1,rahbar1,rahbar2' && kimlar(b) === 'rahbar1,rahbar2' && b.length === 2 && kimlar(v) === 'rahbar1,rahbar2' &&
        !/Масъул/.test(bMasulga) && /Масъул/.test(bBoshqaga)
      );
    },
  },
  {
    nomi: `Reja: kechikish chegarasi - ${MAKS_KECHIKISH_KUNI} kun kiradi, ${MAKS_KECHIKISH_KUNI + 1} kun kirmaydi (eski murojaat toshqin qilmaydi); "bugun" muddat kechikkan EMAS`,
    tekshir: () =>
      xabarRejasi([mur({ kun: -MAKS_KECHIKISH_KUNI })], RAHBARLAR, new Set(), HOZIR).length > 0 &&
      xabarRejasi([mur({ kun: -(MAKS_KECHIKISH_KUNI + 1) })], RAHBARLAR, new Set(), HOZIR).length === 0 &&
      !xabarRejasi([mur({ kun: 0 })], RAHBARLAR, new Set(), HOZIR).some((x) => x.bogliqTuri?.startsWith('muddat-kechikkan')),
  },
  {
    nomi: 'Reja: javob berilgan va yopilgan murojaat uchun xabar YO\'Q (muddati o\'tgan bo\'lsa ham)',
    tekshir: () =>
      xabarRejasi([mur({ kun: -3, holati: 'JAVOB_BERILDI' }), mur({ kun: -3, holati: 'YOPILDI' }), mur({ kun: 0, holati: 'YOPILDI' })], RAHBARLAR, new Set(), HOZIR).length === 0,
  },
  {
    nomi: 'Reja: TAKROR yo\'q - mavjud kalit bo\'lsa o\'tkazib yuboriladi (har bir foydalanuvchi uchun alohida); MUDDAT UZAYTIRILSA kalit o\'zgaradi - yangi ogohlantirish',
    tekshir: () => {
      const m = mur({ kun: -2 });
      const birinchi = xabarRejasi([m], RAHBARLAR, new Set(), HOZIR);
      const mavjud = new Set(birinchi.map((x) => `${x.userId}|${x.bogliqId}|${x.bogliqTuri}`));
      const takror = xabarRejasi([m], RAHBARLAR, mavjud, HOZIR);
      /* Faqat masulniki bor: rahbarlarga hali yaratilmagan - ular uchun chiqadi */
      const qisman = xabarRejasi([m], RAHBARLAR, new Set([`masul1|${m.id}|${xabarKaliti('kechikkan', m.javobMuddati)}`]), HOZIR);
      /* Muddat 2 kun surildi (hamon kechikkan: -2 -> -1... yangi sana) */
      const surilgan = { ...m, javobMuddati: kunga(-1, HOZIR) };
      const yangi = xabarRejasi([surilgan], RAHBARLAR, mavjud, HOZIR);
      return birinchi.length === 3 && takror.length === 0 && kimlar(qisman) === 'rahbar1,rahbar2' && yangi.length === 3 && yangi[0].bogliqTuri !== birinchi[0].bogliqTuri;
    },
  },
  {
    nomi: `Reja: toshqin chegarasi - 150 kechikkan murojaat bo'lsa ham ko'pi bilan ${MAKS_XABAR} xabar, ENG KECHIKKANLAR avval; "yaqin" kechikkanlardan keyin`,
    tekshir: () => {
      const katta = Array.from({ length: 150 }, (_, i) => mur({ kun: -(1 + (i % 30)), masulId: `m${i}` }));
      const r = xabarRejasi(katta, [], new Set(), HOZIR);
      /* masul faol, rahbar yo'q: har murojaatga 1 xabar -> 150, chegara 100 */
      const kunlar = r.map((x) => Number(/(\d+) кун кечикди/.exec(x.matn)?.[1] ?? 0));
      const tartibli = kunlar.every((k, i) => i === 0 || kunlar[i - 1] >= k);
      const aralash = xabarRejasi([mur({ kun: 0 }), mur({ kun: -1 })], [], new Set(), HOZIR);
      return r.length === MAKS_XABAR && tartibli && kunlar[0] === 30 && /ЎТДИ/.test(aralash[0].matn) && /яқин/.test(aralash[1].matn);
    },
  },
  {
    nomi: 'Kalit Toshkent kuni bo\'yicha: UTC 20:00 (Toshkent ertasi kuni 01:00) - ertangi sana; bir kun ichidagi turli soat - bir xil kalit',
    tekshir: () => {
      const k = xabarKaliti('yaqin', new Date(Date.UTC(2026, 9, 15, 20, 0, 0)));
      const a = xabarKaliti('kechikkan', new Date(Date.UTC(2026, 9, 15, 19, 0, 0)));
      const b = xabarKaliti('kechikkan', new Date(Date.UTC(2026, 9, 15, 23, 59, 0)));
      const v = xabarKaliti('kechikkan', new Date(Date.UTC(2026, 9, 15, 18, 59, 0)));
      return k === 'muddat-yaqin:2026-10-16' && a === b && a === 'muddat-kechikkan:2026-10-16' && v === 'muddat-kechikkan:2026-10-15';
    },
  },
  {
    nomi: 'Matn: SHAXSIY MA\'LUMOT yo\'q (ism, telefon, murojaat matni); HTML xavfsizlantiriladi (masul ismida <b>/<a>); rahbar matnida "Масъул", masul matnida yo\'q',
    tekshir: () => {
      const m = mur({ kun: -2, raqami: 'M-<b>1</b>', mahallaNomi: 'Маҳалла <script>', masulIsmi: '<a href="x">Ҳийла</a> & Ко' });
      const rahbarga = xabarMatni('kechikkan', m, 2, true);
      const masulga = xabarMatni('kechikkan', m, 2, false);
      const yaqin = xabarMatni('yaqin', m, 1, false);
      return (
        !/<script|<a href|<b>1/.test(rahbarga) && /&lt;a href/.test(rahbarga) && /&amp;/.test(rahbarga) &&
        /Масъул/.test(rahbarga) && !/Масъул/.test(masulga) && !/\+998|\d{9}|ismi|матни/i.test(rahbarga + masulga + yaqin) &&
        /2 кун кечикди/.test(masulga) && /эртага/.test(yaqin)
      );
    },
  },

  /* ══ BAZA ══ */
  {
    nomi: 'Baza: haqiqiy murojaatlar - kechikkan (3 kun) masulga va faol rahbarga; ertaga muddatlisi masulga; uzoq, javob berilgan va yopilgan - YO\'Q; nofaol rahbar - YO\'Q',
    tekshir: async () => {
      const kech = await murojaatYoz({ kun: -3 });
      const ertaga = await murojaatYoz({ kun: 1 });
      const uzoq = await murojaatYoz({ kun: 20 });
      const javob = await murojaatYoz({ kun: -3, holati: 'JAVOB_BERILDI' });
      const yopiq = await murojaatYoz({ kun: -3, holati: 'YOPILDI' });
      const r = await murojaatMuddatiXabarlari(new Date());
      const q = await xabarlar([kech, ertaga, uzoq, javob, yopiq]);
      const kimga = (id: string) => q.filter((x) => x.bogliqId === id).map((x) => x.userId);
      const kechKimga = kimga(kech);
      const nofaolRahbar = xodimlar[xodimlar.length - 1];
      return (
        r.yaratildi >= 3 && !r.otkazildi &&
        kechKimga.includes(masul) && kechKimga.includes(rahbarA) && kechKimga.includes(rahbarB) && !kechKimga.includes(nofaolRahbar) &&
        kimga(ertaga).length === 1 && kimga(ertaga)[0] === masul &&
        kimga(uzoq).length === 0 && kimga(javob).length === 0 && kimga(yopiq).length === 0 &&
        q.every((x) => x.holati === 'KUTILMOQDA')
      );
    },
  },
  {
    nomi: 'Baza: IDEMPOTENT - qayta ishga tushirish 0 ta yangi xabar yaratadi, jami soni o\'zgarmaydi',
    tekshir: async () => {
      const oldin = (await xabarlar(murojaatlar)).length;
      const r1 = await murojaatMuddatiXabarlari(new Date());
      const r2 = await murojaatMuddatiXabarlari(new Date());
      const keyin = (await xabarlar(murojaatlar)).length;
      return oldin > 0 && r1.yaratildi === 0 && r2.yaratildi === 0 && keyin === oldin;
    },
  },
  {
    nomi: 'Baza: MUDDAT UZAYTIRILSA (kechikkan murojaatga yangi, hamon o\'tgan muddat) - yangi ogohlantirish yaratiladi; eskisi saqlanadi',
    tekshir: async () => {
      const id = murojaatlar[0];
      const oldin = (await xabarlar([id])).length;
      await prisma.murojaat.update({ where: { id }, data: { javobMuddati: kunga(-1, new Date()) } });
      const r = await murojaatMuddatiXabarlari(new Date());
      const keyin = await xabarlar([id]);
      const kalitlar = new Set(keyin.map((x) => x.bogliqTuri));
      return r.yaratildi >= 1 && keyin.length > oldin && kalitlar.size === 2;
    },
  },
  {
    nomi: 'Baza: QULF band bo\'lsa (boshqa ishga tushish davom etmoqda) - hech narsa yaratilmaydi, "o\'tkazildi"; qulf bo\'shagach ishlaydi (deterministik)',
    tekshir: async () => {
      const yangi = await murojaatYoz({ kun: -4 });
      let band: Awaited<ReturnType<typeof murojaatMuddatiXabarlari>> | null = null;
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('murojaat-muddati-xabari'))`;
        band = await murojaatMuddatiXabarlari(new Date());
      });
      const bandaYaratilgan = (await xabarlar([yangi])).length;
      const keyin = await murojaatMuddatiXabarlari(new Date());
      const keyinYaratilgan = (await xabarlar([yangi])).length;
      return band !== null && (band as { otkazildi: boolean }).otkazildi === true && (band as { yaratildi: number }).yaratildi === 0 && bandaYaratilgan === 0 && !keyin.otkazildi && keyinYaratilgan >= 2;
    },
  },
  {
    nomi: 'Baza: 6 PARALLEL ishga tushish (cron + qo\'lda tugma) - takror xabar YO\'Q (har (foydalanuvchi, murojaat, kalit) bitta)',
    tekshir: async () => {
      const yangi = await murojaatYoz({ kun: -5 });
      const natijalar = await Promise.all(Array.from({ length: 6 }, () => murojaatMuddatiXabarlari(new Date())));
      const q = await xabarlar([yangi]);
      const kalitlar = q.map((x) => `${x.userId}|${x.bogliqId}|${x.bogliqTuri}`);
      const yaratilgan = natijalar.reduce((s, n) => s + n.yaratildi, 0);
      if (new Set(kalitlar).size !== kalitlar.length) console.log('     TAKROR:', kalitlar.length, 'noyob:', new Set(kalitlar).size);
      return kalitlar.length >= 2 && new Set(kalitlar).size === kalitlar.length && yaratilgan === kalitlar.length;
    },
  },
  {
    nomi: 'Navbat bilan: ulangan xodimga xabar YUBORILDI (sinov yuboruvchisi), matnda raqam bor, shaxsiy ma\'lumot YO\'Q; ulanmaganga - BEKOR (xato emas)',
    tekshir: async () => {
      const id = await murojaatYoz({ kun: -2 });
      await murojaatMuddatiXabarlari(new Date());
      const ketdi: { chat: string; matn: string }[] = [];
      /* Faqat shu sinovning xabarlarini yuborish: boshqa navbat xabarlariga tegmaslik uchun ularni vaqtincha ushlab turamiz */
      const boshqalar = await prisma.xabarnoma.findMany({ where: { holati: 'KUTILMOQDA', NOT: { bogliqId: id } }, select: { id: true } });
      await prisma.xabarnoma.updateMany({ where: { id: { in: boshqalar.map((x) => x.id) } }, data: { holati: 'BEKOR', xatoMatni: 'sinov: vaqtincha' } });
      try {
        await navbatniYubor(async (chat, matn) => {
          ketdi.push({ chat, matn });
        }, 200);
      } finally {
        await prisma.xabarnoma.updateMany({ where: { id: { in: boshqalar.map((x) => x.id) }, xatoMatni: 'sinov: vaqtincha' }, data: { holati: 'KUTILMOQDA', xatoMatni: null } });
      }
      const q = await xabarlar([id]);
      const masulXabari = q.find((x) => x.userId === masul);
      const rahbarXabari = q.find((x) => x.userId === rahbarB);
      const hammaMatn = ketdi.map((k) => k.matn).join('\n');
      return (
        masulXabari?.holati === 'YUBORILDI' && ketdi.some((k) => k.chat === masulChat) &&
        rahbarXabari?.holati === 'BEKOR' &&
        /T-MX-/.test(hammaMatn) && !/MAXFIY|\+998|945123378/.test(hammaMatn)
      );
    },
  },
  {
    nomi: 'CRON yo\'li: navbat cron\'i murojaat xabarlarini yaratadi, ish izi xulosasida soni bor; Telegram sozlanmagan bo\'lsa ham (503, avvalgidek) navbatga qo\'yiladi',
    tekshir: async () => {
      const id = await murojaatYoz({ kun: -6 });
      process.env.CRON_SECRET = 'sinov-cron-siri-0123456789';
      const { GET } = await import('../src/app/api/telegram/navbat/route');
      await prisma.tizimIshi.deleteMany({ where: { nomi: 'navbat' } });
      const r = await GET(new Request('http://sinov.local/api/telegram/navbat', { headers: { authorization: 'Bearer sinov-cron-siri-0123456789' } }));
      const q = await xabarlar([id]);
      const iz = await prisma.tizimIshi.findFirst({ where: { nomi: 'navbat', usul: 'cron' }, orderBy: { boshlandi: 'desc' } });
      await prisma.tizimIshi.deleteMany({ where: { nomi: 'navbat' } });
      return r.status === 503 && q.length >= 2 && iz?.holati === 'MUVAFFAQIYATLI' && /мурожаат хабари: \d+/.test(iz.xulosa ?? '');
    },
  },
  {
    nomi: 'XATO IZOLYATSIYASI: murojaat xabarini qo\'yish yiqilsa cron YIQILMAYDI (ish izi muvaffaqiyatli, xulosada "ХАТО"), xato jurnalga yoziladi',
    tekshir: async () => {
      process.env.CRON_SECRET = 'sinov-cron-siri-0123456789';
      const { GET } = await import('../src/app/api/telegram/navbat/route');
      await prisma.tizimIshi.deleteMany({ where: { nomi: 'navbat' } });
      await prisma.tizimXatosi.deleteMany({ where: { manba: 'cron:navbat-murojaat' } });
      const asl = ilovaPrisma.$transaction;
      (ilovaPrisma as unknown as { $transaction: unknown }).$transaction = () => {
        throw new Error('baza tranzaksiya yiqildi');
      };
      const xom = console.error;
      console.error = () => {};
      let r: Response;
      try {
        r = await GET(new Request('http://sinov.local/api/telegram/navbat', { headers: { authorization: 'Bearer sinov-cron-siri-0123456789' } }));
      } finally {
        (ilovaPrisma as unknown as { $transaction: unknown }).$transaction = asl;
        console.error = xom;
      }
      const iz = await prisma.tizimIshi.findFirst({ where: { nomi: 'navbat', usul: 'cron' }, orderBy: { boshlandi: 'desc' } });
      const jurnal = await prisma.tizimXatosi.findFirst({ where: { manba: 'cron:navbat-murojaat' } });
      await prisma.tizimIshi.deleteMany({ where: { nomi: 'navbat' } });
      await prisma.tizimXatosi.deleteMany({ where: { manba: 'cron:navbat-murojaat' } });
      return r.status === 503 && iz?.holati === 'MUVAFFAQIYATLI' && /ХАТО/.test(iz.xulosa ?? '') && Boolean(jurnal);
    },
  },
  {
    nomi: 'Kod: murojaat xabari navbatni YUBORISHDAN OLDIN qo\'yiladi; migratsiya faqat qo\'shadi (ADD VALUE IF NOT EXISTS)',
    tekshir: () => {
      const r = oqi('src/app/api/telegram/navbat/route.ts');
      const m = oqi('prisma/migrations/20261001240000_murojaat_xabari/migration.sql').split('\n').filter((q) => !q.trim().startsWith('--')).join('\n').trim();
      return r.indexOf('murojaatMuddatiXabarlari()') > 0 && r.indexOf('murojaatMuddatiXabarlari()') < r.indexOf('await navbatniYubor()') && m === `ALTER TYPE "XabarTuri" ADD VALUE IF NOT EXISTS 'MUROJAAT_MUDDATI';`;
    },
  },
];

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }
  mahallaId = (await prisma.mahalla.findFirstOrThrow({ select: { id: true } })).id;
  masulChat = `77${Date.now()}`.slice(0, 12);
  masul = await user('masul', 'YETTILIK', true, masulChat);
  rahbarA = await user('rahbarA', 'BANDLIK_RAHBAR');
  rahbarB = await user('rahbarB', 'BANDLIK_RAHBAR');
  await user('rahbarNofaol', 'BANDLIK_RAHBAR', false);

  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  await tozala();
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  await ilovaPrisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
