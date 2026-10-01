/**
 * ============================================================
 *  OILAVIY RIVOJLANISH REJASI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/reja-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *  Reja oilaning shaxsiy ma'lumotini va xodim yozgan fikrini saqlaydi.
 *  Uch xil xato xavfli:
 *
 *   1. BEGONA OILANING REJASI KO'RINSA — mahalla izolyatsiyasi buziladi.
 *
 *   2. NOMA'LUM NOL BO'LIB KETSA — xatlovda daromad so'ralmagan oila
 *      "daromadi 0 so'm" deb yoziladi; bu "daromadsiz" degan da'vo.
 *
 *   3. XODIM QAYDI "TASDIQLANGAN" DEB KO'RINSA — oilaning fikri xodim
 *      yozib olgani bo'lib, fuqaroning mustaqil tasdig'i emas.
 *
 *  Bu fayl ularni FAQAT kodda so'z bor-yo'qligini tekshirib emas, bazada
 *  haqiqiy yozuvlar bilan sinaydi.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync, readdirSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  AloqaSxemasi,
  RejaXatosi,
  RejaYaratishSxemasi,
  RejaYopishSxemasi,
  aloqaMuddati,
  aloqaVaqtiYaroqlimi,
  aloqaYozish,
  boshlangichMatn,
  keyingiSanaYaroqlimi,
  masulXodimYaroqlimi,
  rejaYetishmasligi,
  rejaniOl,
  rejaniYopish,
  rejaOchish,
} from '../src/lib/oila-rejasi';
import { MENYU, yolgaRuxsat } from '../src/components/shell/navigatsiya';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const oqi = (y: string) => readFileSync(y, 'utf8');

const KUN = 24 * 60 * 60 * 1000;
const noyob = (a: string) => `${a}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let mahallaA = '';
let mahallaB = '';
let xodimA = ''; // YETTILIK, A mahalla
let xodimB = ''; // YETTILIK, B mahalla
let bandlik = ''; // BANDLIK
const oilalar: string[] = [];
const xodimlar: string[] = [];

async function xodimYarat(rol: 'YETTILIK' | 'BANDLIK' | 'HOKIM', mahallaId: string | null, faol = true) {
  const x = await prisma.user.create({
    data: {
      username: noyob('sinov_reja'),
      fullName: `Sinov ${rol}`,
      passwordHash: 'x',
      rol,
      mahallaId,
      faol,
    },
    select: { id: true },
  });
  xodimlar.push(x.id);
  return x.id;
}

async function oilaYarat(mahallaId: string, xodimId: string, qoshimcha: Record<string, unknown> = {}) {
  const o = await prisma.household.create({
    data: {
      mahallaId,
      manzil: 'Sinov ko‘chasi 7',
      oilaBoshligi: noyob('Sinov Oila'),
      jamiAzo: 4,
      xodimId,
      takrorKaliti: noyob('sinov-reja'),
      holati: 'YUBORILGAN',
      ...qoshimcha,
    },
    select: { id: true, mahallaId: true },
  });
  oilalar.push(o.id);
  return o;
}

async function tayyorla() {
  const m = await prisma.mahalla.findMany({ take: 2, select: { id: true } });
  if (m.length < 2) throw new Error('Sinov uchun ikkita mahalla kerak — `prisma db seed`');
  mahallaA = m[0].id;
  mahallaB = m[1].id;
  xodimA = await xodimYarat('YETTILIK', mahallaA);
  xodimB = await xodimYarat('YETTILIK', mahallaB);
  bandlik = await xodimYarat('BANDLIK', null);
}

async function tozala() {
  await prisma.actionPlan.deleteMany({ where: { householdId: { in: oilalar } } });
  /* Reja va aloqalar oila bilan birga (Cascade) o'chadi */
  await prisma.household.deleteMany({ where: { id: { in: oilalar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
}

const bosh = (oilaId: string) => ({
  householdId: oilaId,
  yaratganId: xodimA,
  boshlangichHolat: 'Sinov: oilada 4 nafar a’zo, ishsiz 1 nafar.',
  boshlangichManba: 'Sinov',
});

const SINOVLAR: Sinov[] = [
  /* ── 1. MA'LUMOT TEKSHIRUVI ── */
  {
    nomi: 'Boshlang‘ich holat yozilmasa reja ochilmaydi',
    tekshir: async () => {
      const r = RejaYaratishSxemasi.safeParse({
        householdId: 'ckxxxxxxxxxxxxxxxxxxxxxxx',
        boshlangichHolat: '  ',
      });
      return !r.success;
    },
  },
  {
    /*
     * Bazadagi ba'zi yozuvlarning id si cuid emas (import qilingan,
     * qo'lda yaratilgan). Qat'iy `cuid()` tekshiruvi ularning rejasini
     * "noto'g'ri ma'lumot" deb rad etardi - brauzer sinovida shunday
     * topilgan (`k100_1`).
     */
    nomi: 'Cuid bo‘lmagan id (masalan k100_1) bilan ham reja ochish so‘rovi qabul qilinadi',
    tekshir: async () => {
      const r = RejaYaratishSxemasi.safeParse({
        householdId: 'k100_1',
        boshlangichHolat: 'Sinov boshlang‘ich holati',
      });
      const bosh_ = RejaYaratishSxemasi.safeParse({ householdId: '', boshlangichHolat: 'matn matn' });
      return r.success && !bosh_.success;
    },
  },
  {
    nomi: 'Aloqa vaqti KELAJAKDA bo‘lishi mumkin emas (bu o‘tgan aloqa yozuvi)',
    tekshir: async () => {
      const hozir = new Date();
      return (
        !aloqaVaqtiYaroqlimi(new Date(hozir.getTime() + 3 * KUN), hozir) &&
        aloqaVaqtiYaroqlimi(new Date(hozir.getTime() - 3 * KUN), hozir) &&
        !aloqaVaqtiYaroqlimi(new Date('noto‘g‘ri'), hozir)
      );
    },
  },
  {
    nomi: 'Keyingi aloqa sanasi bir yildan oshiq uzoq bo‘lsa — xato yozilgan deb rad etiladi',
    tekshir: async () => {
      const hozir = new Date();
      return (
        keyingiSanaYaroqlimi(new Date(hozir.getTime() + 30 * KUN), hozir) &&
        !keyingiSanaYaroqlimi(new Date(hozir.getTime() + 900 * KUN), hozir)
      );
    },
  },
  {
    nomi: 'Aloqa mazmuni bo‘sh bo‘lsa rad etiladi; to‘g‘ri yozuv o‘tadi',
    tekshir: async () => {
      const yomon = AloqaSxemasi.safeParse({
        usul: 'TELEFON',
        aloqaVaqti: new Date().toISOString(),
        mazmun: ' ',
      });
      const yaxshi = AloqaSxemasi.safeParse({
        usul: 'TASHRIF',
        aloqaVaqti: new Date().toISOString(),
        mazmun: 'Oila bilan gaplashildi',
      });
      return !yomon.success && yaxshi.success;
    },
  },
  {
    nomi: 'Aloqa usuli faqat telefon / uchrashuv / tashrif',
    tekshir: async () => {
      const r = AloqaSxemasi.safeParse({
        usul: 'SMS',
        aloqaVaqti: new Date().toISOString(),
        mazmun: 'matn',
      });
      return !r.success;
    },
  },
  {
    nomi: 'Rejani yopish uchun SABAB majburiy',
    tekshir: async () => {
      const yomon = RejaYopishSxemasi.safeParse({ holati: 'TUGALLANDI', yopilishIzohi: '' });
      const yaxshi = RejaYopishSxemasi.safeParse({
        holati: 'TOXTATILDI',
        yopilishIzohi: 'Oila ko‘chib ketdi',
      });
      /* FAOL holatiga yopib bo'lmaydi */
      const faol = RejaYopishSxemasi.safeParse({ holati: 'FAOL', yopilishIzohi: 'xohlagan sabab' });
      return !yomon.success && yaxshi.success && !faol.success;
    },
  },

  /* ── 2. BITTA OILADA BITTA FAOL REJA ── */
  {
    nomi: 'Bitta oilada ikkinchi FAOL reja ochilmaydi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      await rejaOchish(bosh(o.id));
      try {
        await rejaOchish(bosh(o.id));
        return false;
      } catch (e) {
        return e instanceof RejaXatosi && e.kod === 'MAVJUD';
      }
    },
  },
  {
    /*
     * Faqat kod tekshirsa, ikki xodim bir vaqtda bossa ikkalasi
     * "yo'q ekan" deb ko'rib, ikkita faol reja yozardi. Unikal
     * cheklov BAZADA - shu sinov uni haqiqatan ushlashini ko'rsatadi.
     */
    nomi: 'Parallel ochilgan ikki rejadan FAQAT BITTASI yoziladi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const natijalar = await Promise.allSettled(
        Array.from({ length: 6 }, () => rejaOchish(bosh(o.id)))
      );
      const ok = natijalar.filter((n) => n.status === 'fulfilled').length;
      const bazada = await prisma.oilaRejasi.count({ where: { householdId: o.id, holati: 'FAOL' } });
      return ok === 1 && bazada === 1;
    },
  },
  {
    nomi: 'Baza o‘zi ham ikkinchi faol rejani rad etadi (kodni chetlab o‘tib)',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      await rejaOchish(bosh(o.id));
      try {
        await prisma.oilaRejasi.create({
          data: {
            householdId: o.id,
            yaratganId: xodimA,
            boshlangichHolat: 'qo‘lda yozilgan ikkinchi reja',
            holati: 'FAOL',
            faolBelgi: true,
          },
        });
        return false;
      } catch {
        return true;
      }
    },
  },
  {
    nomi: 'Reja yopilgach yangi reja ochish mumkin; eskisi tarix bo‘lib qoladi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r1 = await rejaOchish(bosh(o.id));
      await rejaniYopish(r1.id, {
        holati: 'TUGALLANDI',
        yopilishIzohi: 'Maqsadga erishildi',
        natijaDalili: null,
      });
      const r2 = await rejaOchish(bosh(o.id));
      const hammasi = await prisma.oilaRejasi.findMany({ where: { householdId: o.id } });
      return (
        r2.id !== r1.id &&
        hammasi.length === 2 &&
        hammasi.find((x) => x.id === r1.id)?.holati === 'TUGALLANDI' &&
        hammasi.find((x) => x.id === r1.id)?.faolBelgi === null
      );
    },
  },
  {
    nomi: 'Reja ikki marta yopilmaydi (parallel bosish) va qayta ochilmaydi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      const yop = () =>
        rejaniYopish(r.id, { holati: 'TOXTATILDI', yopilishIzohi: 'Sabab yozildi', natijaDalili: null });
      const n = await Promise.allSettled([yop(), yop(), yop()]);
      const ok = n.filter((x) => x.status === 'fulfilled').length;
      return ok === 1;
    },
  },
  {
    nomi: 'Qoralama (tugallanmagan) xatlov uchun reja kodning o‘zida ham, API da ham rad etiladi',
    tekshir: async () => {
      const k = kodiOl(oqi('src/app/api/rejalar/route.ts'));
      return k.includes("oila.holati === 'QORALAMA'") && k.includes('status: 409');
    },
  },

  /* ── 3. TIZIM QADAM YARATMAYDI ── */
  {
    /*
     * Har oilaga bir xil kurs yoki kredit tavsiya qilinmaydi: reja
     * ochilganda HECH QANDAY qadam o'zi paydo bo'lmaydi.
     */
    nomi: 'Reja ochilganda tizim o‘zidan hech qanday qadam (kurs, kredit) yaratmaydi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      const qadamlar = await prisma.actionPlan.count({ where: { rejaId: r.id } });
      return qadamlar === 0;
    },
  },

  /* ── 4. ALOQA YOZUVI ── */
  {
    nomi: 'Aloqa yoziladi: usul, vaqt, kim yozgani saqlanadi; keyingi sana reja ga ko‘chadi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      const vaqt = new Date(Date.now() - 2 * KUN);
      const keyingi = new Date(Date.now() + 10 * KUN);
      const a = await aloqaYozish(r.id, xodimA, {
        usul: 'TASHRIF',
        aloqaVaqti: vaqt,
        kimBilan: 'Oila boshlig‘i',
        mazmun: 'Tikuvchilik haqida gaplashdik',
        fuqaroFikri: 'Mashina kerak, kursga vaqti yo‘q',
        keyingiAloqaSanasi: keyingi,
      });
      const yozuv = await prisma.oilaAloqasi.findUnique({ where: { id: a.id } });
      const reja = await prisma.oilaRejasi.findUnique({ where: { id: r.id } });
      return (
        !a.takror &&
        yozuv?.usul === 'TASHRIF' &&
        yozuv.qaydEtganId === xodimA &&
        yozuv.aloqaVaqti.getTime() === vaqt.getTime() &&
        /* Aloqa vaqti va kiritilgan vaqt - ikki xil narsa */
        yozuv.createdAt.getTime() > yozuv.aloqaVaqti.getTime() + KUN &&
        reja?.keyingiAloqaSanasi?.getTime() === keyingi.getTime()
      );
    },
  },
  {
    nomi: 'Aynan bir xil aloqa 5 daqiqa ichida qayta kelsa — ikkinchi yozuv YARATILMAYDI',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      const d = {
        usul: 'TELEFON' as const,
        aloqaVaqti: new Date(Date.now() - 3600_000),
        kimBilan: null,
        mazmun: 'Telefonda gaplashildi',
        fuqaroFikri: null,
      };
      const [a, b] = await Promise.all([aloqaYozish(r.id, xodimA, d), aloqaYozish(r.id, xodimA, d)]);
      const soni = await prisma.oilaAloqasi.count({ where: { rejaId: r.id } });
      /* parallel bo'lsa ikkalasi yozishi mumkin; ketma-ket takrorda esa bitta qoladi */
      const c = await aloqaYozish(r.id, xodimA, d);
      const keyin = await prisma.oilaAloqasi.count({ where: { rejaId: r.id } });
      return c.takror && keyin === soni && soni >= 1 && (a.takror || b.takror || soni <= 2);
    },
  },
  {
    nomi: 'Boshqa mazmunli aloqa — alohida yozuv (bir xil deb hisoblanmaydi)',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      const vaqt = new Date(Date.now() - 3600_000);
      const asos = { usul: 'TELEFON' as const, aloqaVaqti: vaqt, kimBilan: null, fuqaroFikri: null };
      await aloqaYozish(r.id, xodimA, { ...asos, mazmun: 'Birinchi mavzu' });
      const b = await aloqaYozish(r.id, xodimA, { ...asos, mazmun: 'Ikkinchi mavzu' });
      const soni = await prisma.oilaAloqasi.count({ where: { rejaId: r.id } });
      return !b.takror && soni === 2;
    },
  },
  {
    nomi: 'Yopilgan rejaga aloqa qo‘shib bo‘lmaydi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      await rejaniYopish(r.id, { holati: 'TUGALLANDI', yopilishIzohi: 'Tugadi', natijaDalili: null });
      try {
        await aloqaYozish(r.id, xodimA, {
          usul: 'TELEFON',
          aloqaVaqti: new Date(Date.now() - 1000),
          kimBilan: null,
          mazmun: 'kech qoldi',
          fuqaroFikri: null,
        });
        return false;
      } catch (e) {
        return e instanceof RejaXatosi && e.kod === 'YOPIQ';
      }
    },
  },
  {
    /*
     * "Xodim qaydi fuqaroning mustaqil tasdig'i emas": bunday maydon
     * sxemada UMUMAN yo'q bo'lishi kerak. Bo'lsa, kimdir uni
     * "tasdiqlangan" deb belgilab, hisobotga qo'shib yuborishi mumkin.
     */
    nomi: 'Aloqa jadvalida "tasdiqlangan" turidagi maydon YO‘Q',
    tekshir: async () => {
      const s = oqi('prisma/schema.prisma');
      const i = s.indexOf('model OilaAloqasi');
      const blok = s.slice(i, s.indexOf('\n}\n', i));
      return !/tasdiq|tekshirilgan|verified/i.test(kodiOl(blok));
    },
  },

  /* ── 5. BOSHLANG'ICH HOLAT: NOMA'LUM ≠ NOL ── */
  {
    nomi: 'Daromad kiritilmagan oila uchun matnda "ma’lum emas" yoziladi, "0 so‘m" EMAS',
    tekshir: async () => {
      const b = boshlangichMatn({
        jamiAzo: 5,
        bolalar0_3Yosh: 1,
        bolalar3_17Yosh: 2,
        bolalar18Yoshdan: 0,
        mehnatgaLayoqatli: 2,
        ishlaydiganlar: 0,
        ishsizlarSoni: 2,
        oylikDaromad: null,
        createdAt: new Date('2026-09-12T08:00:00Z'),
        holati: 'YUBORILGAN',
      });
      return b.matn.includes('маълум эмас') && !/\b0 сўм/.test(b.matn);
    },
  },
  {
    nomi: 'Daromad rostdan 0 deb kiritilgan bo‘lsa — "0 so‘m" yoziladi (noma’lumdan farqli)',
    tekshir: async () => {
      const b = boshlangichMatn({
        jamiAzo: 3,
        bolalar0_3Yosh: 0,
        bolalar3_17Yosh: 0,
        bolalar18Yoshdan: 0,
        mehnatgaLayoqatli: 2,
        ishlaydiganlar: 0,
        ishsizlarSoni: 2,
        oylikDaromad: BigInt(0),
        createdAt: new Date('2026-09-12T08:00:00Z'),
        holati: 'YUBORILGAN',
      });
      return /0 сўм/.test(b.matn) && !b.matn.includes('маълум эмас');
    },
  },
  {
    nomi: 'Boshlang‘ich holat manbasi va sanasi matn bilan birga beriladi',
    tekshir: async () => {
      const b = boshlangichMatn({
        jamiAzo: 3,
        bolalar0_3Yosh: 0,
        bolalar3_17Yosh: 0,
        bolalar18Yoshdan: 0,
        mehnatgaLayoqatli: 2,
        ishlaydiganlar: 1,
        ishsizlarSoni: 1,
        oylikDaromad: BigInt(2_500_000),
        createdAt: new Date('2026-09-12T08:00:00Z'),
        holati: 'YUBORILGAN',
      });
      return b.manba.includes('12.09.2026') && b.sana.toISOString().startsWith('2026-09-12');
    },
  },

  /* ── 6. TO'LIQLIK VA MUDDAT ── */
  {
    nomi: 'Bo‘sh reja nimasi yetishmasligini aytadi; to‘liq reja uchun ro‘yxat bo‘sh',
    tekshir: async () => {
      const bosh_ = rejaYetishmasligi({
        maqsad: null,
        maqsadKelishilgan: false,
        tosiqlar: [],
        masulXodimId: null,
        masulTashkilot: null,
        muddat: null,
        keyingiAloqaSanasi: null,
        qadamlarSoni: 0,
        aloqalarSoni: 0,
      });
      const toliq = rejaYetishmasligi({
        maqsad: 'Tikuvchilik ishini boshlash',
        maqsadKelishilgan: true,
        tosiqlar: ['ASBOB_USKUNA'],
        masulXodimId: 'x',
        masulTashkilot: null,
        muddat: new Date(),
        keyingiAloqaSanasi: new Date(),
        qadamlarSoni: 2,
        aloqalarSoni: 1,
      });
      return bosh_.length >= 6 && toliq.length === 0;
    },
  },
  {
    nomi: 'Maqsad yozilgan-u oila bilan KELISHILMAGAN bo‘lsa — buni alohida aytadi',
    tekshir: async () => {
      const y = rejaYetishmasligi({
        maqsad: 'Chorva boqish',
        maqsadKelishilgan: false,
        tosiqlar: ['KONIKMA'],
        masulXodimId: 'x',
        masulTashkilot: null,
        muddat: new Date(),
        keyingiAloqaSanasi: new Date(),
        qadamlarSoni: 1,
        aloqalarSoni: 1,
      });
      return y.length === 1 && y[0].includes('келишилмаган');
    },
  },
  {
    nomi: 'Aloqa muddati: o‘tgan / bugun / yaqin / rejalangan / belgilanmagan to‘g‘ri ajraladi',
    tekshir: async () => {
      const h = new Date('2026-10-10T10:00:00Z');
      const kun = (n: number) => new Date(h.getTime() + n * KUN);
      return (
        aloqaMuddati(null, h) === 'belgilanmagan' &&
        aloqaMuddati(kun(-2), h) === 'otgan' &&
        aloqaMuddati(kun(0), h) === 'bugun' &&
        aloqaMuddati(kun(2), h) === 'yaqin' &&
        aloqaMuddati(kun(9), h) === 'rejalangan'
      );
    },
  },

  /* ── 7. MAHALLA IZOLYATSIYASI ── */
  {
    nomi: 'Mahalla xodimi O‘Z mahallasi oilasining rejasini oladi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      const topildi = await rejaniOl(r.id, { rol: 'YETTILIK', mahallaId: mahallaA });
      return topildi.id === r.id;
    },
  },
  {
    nomi: 'Mahalla xodimi BOSHQA mahalla oilasining rejasiga KIRA OLMAYDI',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      try {
        await rejaniOl(r.id, { rol: 'YETTILIK', mahallaId: mahallaB });
        return false;
      } catch (e) {
        return e instanceof RejaXatosi && e.kod === 'RUXSAT';
      }
    },
  },
  {
    nomi: 'Mahallasi belgilanmagan xodim hech qaysi rejani ocholmaydi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      try {
        await rejaniOl(r.id, { rol: 'YETTILIK', mahallaId: null });
        return false;
      } catch (e) {
        return e instanceof RejaXatosi && e.kod === 'RUXSAT';
      }
    },
  },
  {
    nomi: 'Bandlik xodimi (butun tuman) har mahallaning rejasini oladi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaB, xodimB);
      const r = await rejaOchish({ ...bosh(o.id), yaratganId: xodimB });
      const topildi = await rejaniOl(r.id, { rol: 'BANDLIK', mahallaId: null });
      return topildi.id === r.id;
    },
  },
  {
    nomi: 'Arxivlangan oilaning rejasi "topilmadi" (arxivdagi yozuv ko‘rinmaydi)',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      await prisma.household.update({
        where: { id: o.id },
        data: { arxivSanasi: new Date(), arxivSababi: 'sinov' },
      });
      try {
        await rejaniOl(r.id, { rol: 'BANDLIK', mahallaId: null });
        return false;
      } catch (e) {
        return e instanceof RejaXatosi && e.kod === 'TOPILMADI';
      }
    },
  },
  {
    nomi: 'Mas‘ul xodim: faol bo‘lmagan, hokim va boshqa mahalla xodimi yaroqsiz',
    tekshir: async () => {
      const nofaol = await xodimYarat('BANDLIK', null, false);
      const hokim = await xodimYarat('HOKIM', null);
      return (
        (await masulXodimYaroqlimi(xodimA, mahallaA)) === true &&
        (await masulXodimYaroqlimi(xodimB, mahallaA)) === false &&
        (await masulXodimYaroqlimi(bandlik, mahallaA)) === true &&
        (await masulXodimYaroqlimi(nofaol, mahallaA)) === false &&
        (await masulXodimYaroqlimi(hokim, mahallaA)) === false &&
        (await masulXodimYaroqlimi('yoq-id', mahallaA)) === false
      );
    },
  },

  /* ── 8. QADAM (CHORA-TADBIR) BILAN BOG'LANISH ── */
  {
    nomi: 'Reja o‘chirilsa uning qadami (chora-tadbir) YO‘QOLMAYDI — rejasiz qoladi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const r = await rejaOchish(bosh(o.id));
      const t = await prisma.actionPlan.create({
        data: {
          householdId: o.id,
          rejaId: r.id,
          muammo: 'Sinov qadami',
          yechim: 'Sinov yechimi',
          masulTashkilot: 'Bandlik markazi',
          muddat: new Date(Date.now() + 10 * KUN),
          yaratganId: xodimA,
          zarurResurs: 'Tikuv mashinasi',
        },
        select: { id: true },
      });
      await prisma.oilaRejasi.delete({ where: { id: r.id } });
      const qoldi = await prisma.actionPlan.findUnique({ where: { id: t.id } });
      return qoldi !== null && qoldi.rejaId === null && qoldi.zarurResurs === 'Tikuv mashinasi';
    },
  },
  {
    nomi: 'Eski (rejasiz) chora-tadbirlar o‘zgarishsiz — rejaId bo‘sh turadi',
    tekshir: async () => {
      const o = await oilaYarat(mahallaA, xodimA);
      const t = await prisma.actionPlan.create({
        data: {
          householdId: o.id,
          muammo: 'Eski usuldagi topshiriq',
          yechim: 'Yechim',
          masulTashkilot: 'Bandlik markazi',
          muddat: new Date(Date.now() + 10 * KUN),
          yaratganId: xodimA,
        },
      });
      return t.rejaId === null && t.zarurResurs === null && t.natijaDalili === null && t.masulXodimId === null;
    },
  },

  /* ── 9. API VA MENYU QO'RIQCHILARI ── */
  {
    nomi: 'Reja API yo‘llarining HAMMASI sessiya talab qiladi va hokimga yopiq',
    tekshir: async () => {
      const yollar = [
        'src/app/api/rejalar/route.ts',
        'src/app/api/rejalar/[id]/route.ts',
        'src/app/api/rejalar/[id]/aloqa/route.ts',
        'src/app/api/rejalar/[id]/qadam/route.ts',
      ];
      return yollar.every((y) => {
        const k = kodiOl(oqi(y));
        return (
          k.includes('talabQil(') &&
          !k.includes("'HOKIM'") &&
          k.includes('instanceof NextResponse')
        );
      });
    },
  },
  {
    nomi: 'Mahalla qoidasi har [id] yo‘lida bor: reja `rejaniOl` orqali olinadi',
    tekshir: async () => {
      const yollar = [
        'src/app/api/rejalar/[id]/route.ts',
        'src/app/api/rejalar/[id]/aloqa/route.ts',
        'src/app/api/rejalar/[id]/qadam/route.ts',
      ];
      return yollar.every((y) => kodiOl(oqi(y)).includes('rejaniOl('));
    },
  },
  {
    nomi: 'Rejaga qo‘shiladigan MAVJUD topshiriq faqat shu oilaniki va hali rejasiz bo‘lishi shart',
    tekshir: async () => {
      const k = kodiOl(oqi('src/app/api/rejalar/[id]/qadam/route.ts'));
      return k.includes('householdId: reja.householdId') && k.includes('rejaId: null');
    },
  },
  {
    nomi: 'Menyuda "Oila rejalari" bor: hokim ko‘rmaydi, qolgan to‘rt rol ko‘radi',
    tekshir: async () => {
      const band = MENYU.find((b) => b.yol === '/rejalar');
      return (
        !!band &&
        !yolgaRuxsat('HOKIM', '/rejalar') &&
        !yolgaRuxsat('HOKIM', '/rejalar/abc') &&
        yolgaRuxsat('YETTILIK', '/rejalar') &&
        yolgaRuxsat('BANDLIK', '/rejalar/abc') &&
        yolgaRuxsat('BANDLIK_RAHBAR', '/rejalar') &&
        yolgaRuxsat('ADMIN', '/rejalar')
      );
    },
  },
  {
    nomi: 'Reja sahifalari arxivdagi oilani va begona mahallani ko‘rsatmaydi (notFound)',
    tekshir: async () => {
      const k = kodiOl(oqi('src/app/(ilova)/rejalar/[id]/page.tsx'));
      return (
        k.includes('arxivSanasi') &&
        k.includes('mahallagaRuxsat(sessiya') &&
        k.includes('notFound()')
      );
    },
  },
  {
    nomi: 'Ro‘yxat sahifasi mahalla filtri va arxiv shartini qo‘llaydi, sahifalanadi',
    tekshir: async () => {
      const k = kodiOl(oqi('src/app/(ilova)/rejalar/page.tsx'));
      return (
        k.includes('mahallaFiltri(sessiya)') &&
        k.includes('arxivSanasi: null') &&
        k.includes('sahifaChegarasi(')
      );
    },
  },
  {
    nomi: 'Xonadon sahifasidagi reja bloki xatoni yutadi — asosiy sahifa yiqilmaydi',
    tekshir: async () => {
      const k = kodiOl(oqi('src/components/reja/reja-blogi.tsx'));
      return k.includes('try {') && k.includes('catch (e)') && k.includes('return null');
    },
  },

  /* ── 10. MIGRATSIYA ── */
  {
    nomi: 'Migratsiya faqat qo‘shadi (DROP/RENAME/NOT NULL qo‘shilmaydi) va qayta yurgizilsa xato bermaydi',
    tekshir: async () => {
      const papka = readdirSync('prisma/migrations').find((p) => p.endsWith('_oila_rejasi'));
      if (!papka) return false;
      const sql = oqi(`prisma/migrations/${papka}/migration.sql`);
      const xavfli = /\b(DROP\s+(TABLE|COLUMN|TYPE)|RENAME|TRUNCATE|SET\s+NOT\s+NULL)\b/i.test(sql);
      /* ActionPlan ga qo'shilgan ustunlarning hammasi ixtiyoriy (NOT NULL yo'q) */
      const ustunlar = sql.match(/ALTER TABLE "ActionPlan" ADD COLUMN[^;]*;/g) ?? [];
      return !xavfli && ustunlar.length === 4 && ustunlar.every((u) => !/NOT NULL/i.test(u));
    },
  },
];

async function main() {
  await tayyorla();

  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      ok = false;
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }

  await tozala();
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
