/**
 * ============================================================
 *  KURSLAR: KATALOG, YOZILISH, TAMOMLASH VA ISH NATIJASI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/kurs-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *   1. ESKIRGAN YOKI BOSHLANGAN KURSGA ODAM YOZILSA - fuqaro bormaydigan
 *      yoki allaqachon boshlangan kursga yo'naltiriladi.
 *
 *   2. O'RINLAR SONI PARALLEL YOZUVDA OSHIB KETSA - 3 o'rinli kursga 8 kishi
 *      yoziladi.
 *
 *   3. KURSDAN OLDIN BOSHLANGAN ISH KURS NATIJASI BO'LIB KETSA - avvaldan
 *      ishlab turgan odam "kurs ishga joylashtirdi" bo'lib hisoblanadi;
 *      yoki bitta ish ikki kursga hisoblanadi.
 *
 *   4. NOMA'LUM NOLGA AYLANSA - davomati yozilmagan odam "0% qatnashgan"
 *      bo'lib chiqadi, ish topgani yozilmagan odam "ish topmagan" bo'ladi.
 *
 *   5. MAXRAJSIZ FOIZ - "5 kishi ishga joylashdi" degan raqam qancha
 *      kishidan ekani aytilmaydi.
 *
 *  Hammasi bazadagi haqiqiy yozuvlar bilan sinaladi.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { vazifalarim } from '../src/lib/vazifalar';
import {
  ESKIRISH_KUNI,
  KURS_HTTP,
  KursAmaliSxemasi,
  KursXatosi,
  KursYaratishSxemasi,
  NATIJA_KUTISH_KUNI,
  YozishSxemasi,
  YozuvAmaliSxemasi,
  elonUchunKurslar,
  korsatkichlarniHisobla,
  kursAmali,
  kursElonGaMosmi,
  kursFoizi,
  kursHolati,
  kursKorsatkichlari,
  kursYaratish,
  kursgaYozish,
  kursniTekshir,
  malumotEskirganmi,
  matnKaliti,
  tavsiyaQilinadimi,
  yozishMumkinmi,
  yozuvAmali,
  type MetrikaYozuvi,
} from '../src/lib/kurslar';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const KUN = 24 * 60 * 60 * 1000;
const oqi = (y: string) => readFileSync(y, 'utf8');
const noyob = (a: string) => `${a} ${Date.now()}${Math.floor(Math.random() * 100000)}`;
const keyin = (n: number, h = new Date()) => new Date(h.getTime() + n * KUN);

let mahallaA = '';
let mahallaB = '';
let bandlik = '';
let yettilikA = '';
let yettilikB = '';
const kurslar: string[] = [];
const fuqarolar: string[] = [];
const xodimlar: string[] = [];

const kim = (rol: 'BANDLIK' | 'YETTILIK', userId: string, mahallaId: string | null) => ({ rol, userId, mahallaId });
const BANDLIK = () => kim('BANDLIK', bandlik, null);
const YETTILIK_A = () => kim('YETTILIK', yettilikA, mahallaA);
const YETTILIK_B = () => kim('YETTILIK', yettilikB, mahallaB);

async function tayyorla() {
  const m = await prisma.mahalla.findMany({ take: 2, select: { id: true } });
  if (m.length < 2) throw new Error('Sinov uchun ikkita mahalla kerak — `prisma db seed`');
  mahallaA = m[0].id;
  mahallaB = m[1].id;

  const mk = async (nom: string, rol: 'BANDLIK' | 'YETTILIK', mahallaId?: string) => {
    const x = await prisma.user.create({
      data: { username: noyob(nom).replace(/\s/g, '_'), fullName: nom, passwordHash: 'x', rol, mahallaId: mahallaId ?? null },
      select: { id: true },
    });
    xodimlar.push(x.id);
    return x.id;
  };
  bandlik = await mk('Sinov kurs bandlik', 'BANDLIK');
  yettilikA = await mk('Sinov kurs yettilik A', 'YETTILIK', mahallaA);
  yettilikB = await mk('Sinov kurs yettilik B', 'YETTILIK', mahallaB);
}

async function tozala() {
  /* Kurslar o'chsa, yozuvlar Cascade bilan ketadi; fuqaro ketsa, ish va dalil ham */
  await prisma.kurs.deleteMany({ where: { id: { in: kurslar } } });
  await prisma.unemployedPerson.deleteMany({ where: { id: { in: fuqarolar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
}

/** Kurs (to'g'ridan-to'g'ri bazaga: istalgan holatda). Sanalar bugundan kunlarda */
async function kursYarat(
  q: {
    boshlanish?: number;
    tugash?: number;
    tekshirilgan?: number;
    joylar?: number | null;
    jamiDarsKuni?: number | null;
    konikmalar?: string[];
    yonalish?: string | null;
    nomi?: string;
    bekor?: boolean;
  } = {}
) {
  const k = await prisma.kurs.create({
    data: {
      nomi: q.nomi ?? noyob('Sinov kursi'),
      yonalish: q.yonalish ?? null,
      konikmalar: q.konikmalar ?? ['Payvandlash'],
      tashkilot: 'Sinov o‘quv markazi',
      boshlanishSanasi: keyin(q.boshlanish ?? 10),
      tugashSanasi: keyin(q.tugash ?? 40),
      jamiDarsKuni: q.jamiDarsKuni === undefined ? 20 : q.jamiDarsKuni,
      joylar: q.joylar === undefined ? 10 : q.joylar,
      manba: 'Sinov: markaz rahbari telefonda aytdi',
      tekshirilganSana: keyin(q.tekshirilgan ?? -2),
      bekorQilingan: q.bekor ? new Date() : null,
      bekorSababi: q.bekor ? 'Sinov' : null,
      yaratganId: bandlik,
    },
    select: { id: true },
  });
  kurslar.push(k.id);
  return k.id;
}

async function fuqaroYarat(mahalla = mahallaA, q: Record<string, unknown> = {}) {
  const f = await prisma.unemployedPerson.create({
    data: {
      fish: noyob('Kurs Sinov'),
      telefon: '+998901112233',
      jinsi: 'ERKAK',
      mahallaId: mahalla,
      holati: 'ANIQLANDI',
      tugilganSana: new Date(Date.UTC(1990, 0, 1)),
      ...q,
    },
    select: { id: true },
  });
  fuqarolar.push(f.id);
  return f.id;
}

/** Yozuv: kursga yozilgan fuqaro */
async function yozuvYarat(kursId: string, mahalla = mahallaA, q: Record<string, unknown> = {}) {
  const f = await fuqaroYarat(mahalla);
  const y = await prisma.kursYollanmasi.create({
    data: { kursId, ishsizId: f, yaratganId: bandlik, ...q },
    select: { id: true },
  });
  return { yozuv: y.id, fuqaro: f };
}

/** Joylashish voqeasi (+ ixtiyoriy dalil) */
async function ishYarat(ishsizId: string, boshlanish: Date, dalil: 'tasdiq' | 'xodim' | null = null) {
  const j = await prisma.ishgaJoylashish.create({
    data: { ishsizId, korxonaNomi: noyob('Sinov MChJ'), boshlanganSana: boshlanish },
    select: { id: true },
  });
  if (dalil === 'tasdiq') {
    await prisma.joylashuvDalili.create({
      data: { turi: 'SHARTNOMA', holati: 'TASDIQLANDI', ishsizId, joylashishId: j.id, manbaTuri: 'QOLDA_HUJJAT' },
    });
  } else if (dalil === 'xodim') {
    await prisma.joylashuvDalili.create({
      data: { turi: 'MAHALLA', holati: 'KIRITILDI', ishsizId, joylashishId: j.id, manbaTuri: 'XODIM_BILDIRDI' },
    });
  }
  return j.id;
}

const xatoKodi = async (f: () => Promise<unknown>): Promise<string | null> => {
  try {
    await f();
    return null;
  } catch (e) {
    return e instanceof KursXatosi ? e.kod : `BOSHQA:${(e as Error).message.slice(0, 80)}`;
  }
};

const sanalar = (b: number, t: number, bekor: Date | null = null, h = new Date()) => ({
  boshlanishSanasi: keyin(b, h),
  tugashSanasi: keyin(t, h),
  bekorQilingan: bekor,
});

/** Metrika yozuvi (toza funksiya uchun) */
const my = (q: Partial<MetrikaYozuvi> = {}): MetrikaYozuvi => ({
  holati: 'TAMOMLADI',
  boshlaganSana: keyin(-120),
  tugatganSana: keyin(-90),
  qatnashganKun: 18,
  jamiDarsKuni: 20,
  kursBoshlanishi: keyin(-120),
  kursTugashi: keyin(-90),
  suhbatSanasi: null,
  sertifikat: null,
  joylashish: null,
  ...q,
});

const SINOVLAR: Sinov[] = [
  /* ══ 1. TOZA FUNKSIYALAR: KURS HOLATI ══ */
  {
    nomi: 'Kurs holati sanalardan hisoblanadi: qabul / jarayonda / tugagan / bekor',
    tekshir: async () => {
      const h = new Date();
      return (
        kursHolati(sanalar(5, 30, null, h), h) === 'QABUL' &&
        kursHolati(sanalar(-5, 30, null, h), h) === 'JARAYONDA' &&
        kursHolati(sanalar(-30, -5, null, h), h) === 'TUGAGAN' &&
        kursHolati(sanalar(5, 30, h, h), h) === 'BEKOR' &&
        /* Bekor qilingan kurs sanasidan qat'i nazar "bekor" */
        kursHolati(sanalar(-30, -5, h, h), h) === 'BEKOR'
      );
    },
  },
  {
    nomi: 'Kurs holati Toshkent KUNI bo‘yicha: boshlanish kuni "jarayonda", tugash kuni hali "jarayonda", ertasi "tugagan"',
    tekshir: async () => {
      /* 2026-10-10 20:00 UTC = Toshkentda 11-oktabr 01:00 */
      const hozir = new Date('2026-10-10T20:00:00Z');
      const bosh = new Date('2026-10-11T07:00:00Z'); /* Toshkent: 11-oktabr 12:00 */
      const tugash = new Date('2026-10-11T07:00:00Z');
      const ertaga = new Date('2026-10-12T07:00:00Z');
      return (
        kursHolati({ boshlanishSanasi: bosh, tugashSanasi: ertaga, bekorQilingan: null }, hozir) === 'JARAYONDA' &&
        kursHolati({ boshlanishSanasi: bosh, tugashSanasi: tugash, bekorQilingan: null }, hozir) === 'JARAYONDA' &&
        kursHolati(
          { boshlanishSanasi: new Date('2026-10-09T07:00:00Z'), tugashSanasi: new Date('2026-10-10T07:00:00Z'), bekorQilingan: null },
          hozir
        ) === 'TUGAGAN'
      );
    },
  },
  {
    nomi: `Ma'lumot ${ESKIRISH_KUNI} kundan keyin eskiradi (chegarada hali yaroqli)`,
    tekshir: async () => {
      const h = new Date();
      return (
        !malumotEskirganmi({ tekshirilganSana: keyin(-ESKIRISH_KUNI, h) }, h) &&
        malumotEskirganmi({ tekshirilganSana: keyin(-ESKIRISH_KUNI - 1, h) }, h) &&
        !malumotEskirganmi({ tekshirilganSana: h }, h)
      );
    },
  },
  {
    nomi: 'Yozish mumkinmi: bekor, tugagan, eskirgan, to‘lgan - har biri O‘Z sababi bilan; noma‘lum o‘rin cheklanmaydi',
    tekshir: async () => {
      const h = new Date();
      const asos = { ...sanalar(5, 30, null, h), tekshirilganSana: keyin(-1, h), joylar: 3 as number | null };
      const r = (k: typeof asos, band: number) => {
        const x = yozishMumkinmi(k, band, h);
        return x.ok ? 'ok' : x.sabab;
      };
      return (
        r(asos, 0) === 'ok' &&
        r(asos, 2) === 'ok' &&
        r(asos, 3) === 'tolgan' &&
        r({ ...asos, ...sanalar(5, 30, h, h) }, 0) === 'bekor' &&
        r({ ...asos, ...sanalar(-30, -5, null, h) }, 0) === 'tugagan' &&
        r({ ...asos, tekshirilganSana: keyin(-ESKIRISH_KUNI - 5, h) }, 0) === 'eskirgan' &&
        /* Noma'lum o'rin (null) - cheklov yo'q, 1000 kishi bo'lsa ham */
        r({ ...asos, joylar: null }, 1000) === 'ok' &&
        /* Jarayondagi kursga yozish mumkin (kechikib qayd etilgan) */
        r({ ...asos, ...sanalar(-3, 30, null, h) }, 0) === 'ok'
      );
    },
  },
  {
    nomi: 'Tavsiya FAQAT boshlanmagan kursga: jarayondagi kurs tavsiya qilinmaydi, garchi yozish mumkin bo‘lsa ham',
    tekshir: async () => {
      const h = new Date();
      const asos = { tekshirilganSana: keyin(-1, h), joylar: 5 as number | null };
      return (
        tavsiyaQilinadimi({ ...asos, ...sanalar(5, 30, null, h) }, 0, h) &&
        !tavsiyaQilinadimi({ ...asos, ...sanalar(-3, 30, null, h) }, 0, h) &&
        yozishMumkinmi({ ...asos, ...sanalar(-3, 30, null, h) }, 0, h).ok
      );
    },
  },

  /* ══ 2. SXEMA VA MAYDONLAR ORASIDAGI QOIDALAR ══ */
  {
    nomi: 'Kurs sxemasi: qisqa nom, katalogda yo‘q yo‘nalish, manbasiz, 11 ko‘nikma rad; to‘g‘ri kurs qabul',
    tekshir: async () => {
      const asos = {
        nomi: 'Payvandchilik kursi',
        konikmalar: ['Payvandlash'],
        tashkilot: 'Navoiy kasb-hunar markazi',
        boshlanishSanasi: '2026-11-01',
        tugashSanasi: '2026-12-01',
        manba: 'Markaz direktori, telefon',
      };
      const p = (q: Record<string, unknown>) => KursYaratishSxemasi.safeParse({ ...asos, ...q }).success;
      return (
        p({}) &&
        !p({ nomi: 'ab' }) &&
        !p({ yonalish: 'Mavjud emas' }) &&
        p({ yonalish: 'Qurilish' }) &&
        !p({ manba: '' }) &&
        !p({ manba: undefined }) &&
        !p({ konikmalar: Array.from({ length: 11 }, (_, i) => `Konikma ${i}`) }) &&
        !p({ boshlanishSanasi: 'kecha' }) &&
        !p({ jamiDarsKuni: 0 }) &&
        !p({ joylar: -1 })
      );
    },
  },
  {
    nomi: 'Maydonlar orasidagi qoidalar: tugash<boshlanish, 400 kundan uzoq, dars kuni>kalendar, bepul+narx, narx(bepulsiz), kelajak sana',
    tekshir: async () => {
      const h = new Date();
      const b = keyin(5, h);
      const asos = { boshlanishSanasi: b, tugashSanasi: keyin(35, h), jamiDarsKuni: 20 as number | null, bepul: false as boolean | null | undefined, narxi: 500000 as number | null | undefined };
      return (
        kursniTekshir(asos, h) === null &&
        kursniTekshir({ ...asos, tugashSanasi: keyin(1, h) }, h) !== null &&
        kursniTekshir({ ...asos, tugashSanasi: keyin(5 + 401, h) }, h) !== null &&
        /* 31 kalendar kun (5..35), 40 dars kuni mumkin emas */
        kursniTekshir({ ...asos, jamiDarsKuni: 40 }, h) !== null &&
        kursniTekshir({ ...asos, jamiDarsKuni: 31 }, h) === null &&
        kursniTekshir({ ...asos, bepul: true }, h) !== null &&
        /* Narx bor, lekin pullik/bepulligi noma'lum - narx qabul qilinmaydi */
        kursniTekshir({ ...asos, bepul: null }, h) !== null &&
        kursniTekshir({ ...asos, bepul: null, narxi: null }, h) === null &&
        kursniTekshir({ ...asos, tekshirilganSana: keyin(2, h) }, h) !== null
      );
    },
  },

  /* ══ 3. ISH TALABI BILAN MOSLIK ══ */
  {
    nomi: 'Moslik: ko‘nikma e‘lon talabida uchrasa (kirill/lotin farqi, qo‘shimchalar bilan) - sababi bilan; mos kelmasa - yo‘q',
    tekshir: async () => {
      const k = { nomi: 'Kurs', konikmalar: ['Пайвандлаш'], yonalish: null as string | null };
      const e = (lavozim: string, talablar: string | null = null, yonalish: string | null = null) => ({ lavozim, talablar, yonalish });
      const a = kursElonGaMosmi(e('Payvandlash ustasi'), k);
      const b = kursElonGaMosmi(e('Ishchi', 'Kamida 1 yil payvandlashda tajriba'), k);
      const c = kursElonGaMosmi(e('Оператор', 'Пайвандлаш ишларини билиш'), k);
      const yoq = kursElonGaMosmi(e('Haydovchi', 'B toifa'), k);
      return (
        a?.turi === 'konikma' && /Пайвандлаш/.test(a.matn) &&
        b?.turi === 'konikma' &&
        c?.turi === 'konikma' &&
        yoq === null
      );
    },
  },
  {
    nomi: 'Moslik: ko‘p so‘zli ko‘nikmada HAMMA muhim so‘z kerak; 4 harfdan qisqa so‘z hisobga olinmaydi; faqat yo‘nalish - kuchsiz',
    tekshir: async () => {
      const k = { nomi: 'Kurs', konikmalar: ['Kompyuter savodxonligi'], yonalish: 'Savdo' as string | null };
      const e = (lavozim: string, talablar: string | null = null, yonalish: string | null = null) => ({ lavozim, talablar, yonalish });
      const yarim = kursElonGaMosmi(e('Kassir', 'Kompyuterda ishlay olish'), k);
      const tola = kursElonGaMosmi(e('Kassir', 'Kompyuter savodxonligi talab etiladi'), k);
      const qisqa = kursElonGaMosmi(e('Ish', 'bor'), { nomi: 'K', konikmalar: ['IT', 'Ish'], yonalish: null });
      const yon = kursElonGaMosmi(e('Sotuvchi', null, 'Savdo'), k);
      const yonYoq = kursElonGaMosmi(e('Sotuvchi', null, 'Qurilish'), k);
      return (
        yarim === null &&
        tola?.turi === 'konikma' &&
        qisqa === null &&
        yon?.turi === 'yonalish' &&
        yonYoq === null &&
        matnKaliti('Пайвандчи — «Ўрта»!') === matnKaliti('payvandchi orta')
      );
    },
  },

  /* ══ 4. KO'RSATKICHLAR: MAXRAJ, NOMA'LUM ≠ NOL ══ */
  {
    nomi: 'Ko‘rsatkich: tamomlash maxraji faqat natijasi aniqlar (tamomladi+tashladi); o‘qiyotgan, kelmagan, bekor va yangilanmagan kirmaydi',
    tekshir: async () => {
      const h = new Date();
      const joriy = { kursBoshlanishi: keyin(-5, h), kursTugashi: keyin(20, h), tugatganSana: null, boshlaganSana: keyin(-4, h) };
      const k = korsatkichlarniHisobla(
        [
          my({ holati: 'TAMOMLADI' }),
          my({ holati: 'TAMOMLADI' }),
          my({ holati: 'TASHLADI', tugatganSana: keyin(-100, h) }),
          my({ holati: 'BOSHLADI', ...joriy }),
          my({ holati: 'KELMADI', kursBoshlanishi: keyin(-120, h), tugatganSana: null }),
          my({ holati: 'BEKOR' }),
          /* Kurs boshlangan, yozuv holati belgilanmagan */
          my({ holati: 'YOLLANDI', kursBoshlanishi: keyin(-30, h), kursTugashi: keyin(-5, h), tugatganSana: null }),
        ],
        h
      );
      return (
        k.jami === 6 && k.bekor === 1 &&
        k.tamomlagan === 2 && k.tashlagan === 1 &&
        k.hozirOqiyapti === 1 && k.kelmagan === 1 && k.yangilanmagan === 1 &&
        k.boshlagan === 4 &&
        kursFoizi(k.tamomlagan, k.tamomlagan + k.tashlagan) === 67
      );
    },
  },
  {
    nomi: 'Ko‘rsatkich: tamomlaganiga 60 kundan kam o‘tganlar "hali erta" - ish natijasi maxrajiga kirmaydi',
    tekshir: async () => {
      const h = new Date();
      const yosh = my({ tugatganSana: keyin(-10, h) });
      const chegara = my({ tugatganSana: keyin(-NATIJA_KUTISH_KUNI, h) });
      const eski = my({ tugatganSana: keyin(-NATIJA_KUTISH_KUNI - 1, h) });
      const sanasiz = my({ tugatganSana: null });
      const k = korsatkichlarniHisobla([yosh, chegara, eski, sanasiz], h);
      return (
        k.natija.tamomlagan === 4 &&
        k.natija.haliErta === 3 &&
        k.natija.muddatiOtgan === 1 &&
        k.natija.qaydEtilmagan === 1
      );
    },
  },
  {
    nomi: 'Ko‘rsatkich: ish natijasi uch xil - tasdiqlangan / tasdiqlanmagan / qayd etilmagan; kursdan OLDIN boshlangan ish hisoblanmaydi',
    tekshir: async () => {
      const h = new Date();
      const tugadi = keyin(-90, h);
      const bor = (kunFarqi: number, tasdiq: boolean) => ({
        boshlanganSana: keyin(-90 + kunFarqi, h),
        tasdiqlangan: tasdiq,
      });
      const k = korsatkichlarniHisobla(
        [
          my({ tugatganSana: tugadi, joylashish: bor(10, true) }),
          my({ tugatganSana: tugadi, joylashish: bor(10, false) }),
          /* Tamomlagan kuni boshlangan ish - kursdan KEYIN hisoblanadi */
          my({ tugatganSana: tugadi, joylashish: bor(0, true) }),
          /* Kursdan 20 kun OLDIN boshlangan ish - kurs natijasi emas */
          my({ tugatganSana: tugadi, joylashish: bor(-20, true) }),
          my({ tugatganSana: tugadi, joylashish: null }),
          my({ tugatganSana: tugadi, suhbatSanasi: keyin(-80, h) }),
        ],
        h
      );
      return (
        k.natija.muddatiOtgan === 6 &&
        k.natija.tasdiqlangan === 2 &&
        k.natija.tasdiqlanmagan === 1 &&
        k.natija.qaydEtilmagan === 3 &&
        k.natija.suhbatga === 1 &&
        kursFoizi(k.natija.tasdiqlangan, k.natija.muddatiOtgan) === 33
      );
    },
  },
  {
    nomi: 'Ko‘rsatkich: davomati noma‘lum yozuv NOL emas - alohida "noma‘lum"; davomat foizi faqat ikkala son ma‘lumlardan; sertifikat 3 xil',
    tekshir: async () => {
      const h = new Date();
      const k = korsatkichlarniHisobla(
        [
          my({ qatnashganKun: 18, jamiDarsKuni: 20, sertifikat: true }),
          my({ qatnashganKun: 10, jamiDarsKuni: 20, sertifikat: false }),
          my({ qatnashganKun: null, jamiDarsKuni: 20 }),
          my({ qatnashganKun: 15, jamiDarsKuni: null }),
          /* 0 kun - rostdan hech kelmagan (noma'lum emas) */
          my({ holati: 'TASHLADI', qatnashganKun: 0, jamiDarsKuni: 20 }),
        ],
        h
      );
      return (
        k.davomat.yozuvlar === 3 &&
        k.davomat.nomalum === 2 &&
        k.davomat.qatnashgan === 28 &&
        k.davomat.jami === 60 &&
        kursFoizi(k.davomat.qatnashgan, k.davomat.jami) === 47 &&
        k.sertifikat.bor === 1 && k.sertifikat.yoq === 1 && k.sertifikat.nomalum === 2
      );
    },
  },
  {
    nomi: 'Maxraj 0 bo‘lsa foiz yo‘q (null), "0%" emas; bo‘sh ro‘yxatda hamma son nol, xato yo‘q',
    tekshir: async () => {
      const k = korsatkichlarniHisobla([], new Date());
      return (
        kursFoizi(0, 0) === null &&
        kursFoizi(3, 0) === null &&
        kursFoizi(0, 5) === 0 &&
        kursFoizi(Number.NaN, 5) === null &&
        k.jami === 0 && k.natija.muddatiOtgan === 0 && k.davomat.jami === 0
      );
    },
  },

  /* ══ 5. KURS YARATISH VA YANGILASH (baza) ══ */
  {
    nomi: 'Kurs yaratiladi: tekshirilgan sana bo‘sh bo‘lsa bugun; narx so‘mda saqlanadi; noto‘g‘ri sana rad etiladi',
    tekshir: async () => {
      const d = KursYaratishSxemasi.parse({
        nomi: noyob('Payvandchilik'),
        konikmalar: ['Payvandlash'],
        tashkilot: 'Markaz',
        boshlanishSanasi: keyin(10).toISOString(),
        tugashSanasi: keyin(40).toISOString(),
        bepul: false,
        narxi: 750000,
        manba: 'Markaz direktori',
      });
      const { id } = await kursYaratish({ userId: bandlik }, d);
      kurslar.push(id);
      const k = await prisma.kurs.findUnique({ where: { id } });
      const xato = await xatoKodi(() =>
        kursYaratish({ userId: bandlik }, { ...d, tugashSanasi: keyin(1) })
      );
      return (
        k?.narxi === 750000n &&
        k.bepul === false &&
        Math.abs((k.tekshirilganSana?.getTime() ?? 0) - Date.now()) < 60_000 &&
        xato === 'NOTOGRI'
      );
    },
  },
  {
    nomi: '"Tekshirildi" tekshirilgan sanani yangilaydi; tahrir uni YANGILAMAYDI (tekshirish - ongli amal)',
    tekshir: async () => {
      const id = await kursYarat({ tekshirilgan: -30 });
      const oldin = (await prisma.kurs.findUnique({ where: { id } }))!.tekshirilganSana;
      await kursAmali(id, { amal: 'tahrir', maydonlar: { manzil: 'Navoiy sh., Sinov ko‘chasi 1' } });
      const tahrirdan = (await prisma.kurs.findUnique({ where: { id } }))!;
      await kursAmali(id, { amal: 'tekshirildi' });
      const keyingi = (await prisma.kurs.findUnique({ where: { id } }))!.tekshirilganSana;
      return (
        tahrirdan.manzil === 'Navoiy sh., Sinov ko‘chasi 1' &&
        tahrirdan.tekshirilganSana.getTime() === oldin.getTime() &&
        keyingi.getTime() > oldin.getTime() + 20 * KUN
      );
    },
  },
  {
    nomi: 'Tahrir: o‘rinlar soni band qilinganidan kam bo‘lmaydi; bo‘sh tahrir va noto‘g‘ri sana rad etiladi',
    tekshir: async () => {
      const id = await kursYarat({ joylar: 5 });
      for (let i = 0; i < 3; i++) await yozuvYarat(id);
      const kam = await xatoKodi(() => kursAmali(id, { amal: 'tahrir', maydonlar: { joylar: 2 } }));
      const teng = await xatoKodi(() => kursAmali(id, { amal: 'tahrir', maydonlar: { joylar: 3 } }));
      const bosh = await xatoKodi(() => kursAmali(id, { amal: 'tahrir', maydonlar: {} }));
      const sana = await xatoKodi(() => kursAmali(id, { amal: 'tahrir', maydonlar: { tugashSanasi: keyin(2) } }));
      return kam === 'NOTOGRI' && teng === null && bosh === 'NOTOGRI' && sana === 'NOTOGRI';
    },
  },
  {
    nomi: 'O‘qish boshlangan yozuvlar bo‘lsa kurs sanalari o‘zgartirilmaydi (yozuv sanalari buzilmasin); boshqa maydon o‘zgaradi',
    tekshir: async () => {
      const id = await kursYarat({ boshlanish: -3, tugash: 20 });
      await yozuvYarat(id, mahallaA, { holati: 'BOSHLADI', boshlaganSana: keyin(-2) });
      const sana = await xatoKodi(() => kursAmali(id, { amal: 'tahrir', maydonlar: { tugashSanasi: keyin(30) } }));
      const nom = await xatoKodi(() => kursAmali(id, { amal: 'tahrir', maydonlar: { nomi: 'Yangi nom kursi' } }));
      return sana === 'YOPIQ' && nom === null;
    },
  },
  {
    nomi: 'Kursni bekor qilish: boshlanmagan va o‘qiyotgan yozuvlar bekor bo‘ladi, TAMOMLAGANLAR tegilmaydi; tugagan kursni bekor qilib bo‘lmaydi; ikkinchi marta - rad',
    tekshir: async () => {
      const id = await kursYarat({ boshlanish: -10, tugash: 20 });
      const a = await yozuvYarat(id);
      const b = await yozuvYarat(id, mahallaA, { holati: 'BOSHLADI', boshlaganSana: keyin(-9) });
      const c = await yozuvYarat(id, mahallaA, { holati: 'TAMOMLADI', boshlaganSana: keyin(-9), tugatganSana: keyin(-1) });
      /* Sxema qisqa sababni rad etadi (marshrut sxemani kursAmali dan OLDIN tekshiradi) */
      const sxemaXato = !KursAmaliSxemasi.safeParse({ amal: 'bekor', sabab: 'x' }).success;
      await kursAmali(id, { amal: 'bekor', sabab: 'Markaz guruhni yopdi' });
      const [ya, yb, yc, k] = await Promise.all([
        prisma.kursYollanmasi.findUnique({ where: { id: a.yozuv } }),
        prisma.kursYollanmasi.findUnique({ where: { id: b.yozuv } }),
        prisma.kursYollanmasi.findUnique({ where: { id: c.yozuv } }),
        prisma.kurs.findUnique({ where: { id } }),
      ]);
      const yana = await xatoKodi(() => kursAmali(id, { amal: 'bekor', sabab: 'Yana bekor' }));
      const tahrir = await xatoKodi(() => kursAmali(id, { amal: 'tahrir', maydonlar: { nomi: 'Yangi nom' } }));

      const tugagan = await kursYarat({ boshlanish: -40, tugash: -10 });
      const tugaganXato = await xatoKodi(() => kursAmali(tugagan, { amal: 'bekor', sabab: 'Kech bo‘ldi' }));
      return (
        sxemaXato &&
        ya?.holati === 'BEKOR' && /бекор қилинди/.test(ya.izoh ?? '') &&
        yb?.holati === 'BEKOR' &&
        yc?.holati === 'TAMOMLADI' &&
        k?.bekorQilingan !== null && k?.bekorSababi === 'Markaz guruhni yopdi' &&
        yana === 'YOPIQ' && tahrir === 'YOPIQ' && tugaganXato === 'YOPIQ'
      );
    },
  },

  /* ══ 6. KURSGA YOZISH ══ */
  {
    nomi: 'Yozish: yozuv yaratiladi; takroriy yozish mavjud yozuvni qaytaradi (ikkinchi yozuv paydo bo‘lmaydi)',
    tekshir: async () => {
      const kurs = await kursYarat();
      const f = await fuqaroYarat();
      const a = await kursgaYozish(BANDLIK(), { ishsizId: f, kursId: kurs });
      const b = await kursgaYozish(BANDLIK(), { ishsizId: f, kursId: kurs });
      const soni = await prisma.kursYollanmasi.count({ where: { kursId: kurs, ishsizId: f } });
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: a.id } });
      return a.yangi && !b.yangi && a.id === b.id && soni === 1 && y?.holati === 'YOLLANDI' && y.yaratganId === bandlik;
    },
  },
  {
    nomi: 'Yozish: boshqa mahalla fuqarosiga yettilik xodimi yoza olmaydi; o‘z mahallasiga yoza oladi; arxivdagi fuqaro "topilmadi"',
    tekshir: async () => {
      const kurs = await kursYarat();
      const fA = await fuqaroYarat(mahallaA);
      const arxiv = await fuqaroYarat(mahallaA, { arxivSanasi: new Date() });
      const begona = await xatoKodi(() => kursgaYozish(YETTILIK_B(), { ishsizId: fA, kursId: kurs }));
      const oz = await xatoKodi(() => kursgaYozish(YETTILIK_A(), { ishsizId: fA, kursId: kurs }));
      const arx = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: arxiv, kursId: kurs }));
      return begona === 'RUXSAT' && oz === null && arx === 'TOPILMADI';
    },
  },
  {
    nomi: 'Yozish: eskirgan, tugagan, bekor qilingan kursga yozib bo‘lmaydi - har biri o‘z kodi bilan; "tekshirildi" dan keyin yozish mumkin',
    tekshir: async () => {
      const eskirgan = await kursYarat({ tekshirilgan: -ESKIRISH_KUNI - 10 });
      const tugagan = await kursYarat({ boshlanish: -40, tugash: -10 });
      const bekor = await kursYarat({ bekor: true });
      const f = await fuqaroYarat();
      const a = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f, kursId: eskirgan }));
      const b = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f, kursId: tugagan }));
      const c = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f, kursId: bekor }));
      await kursAmali(eskirgan, { amal: 'tekshirildi' });
      const d = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f, kursId: eskirgan }));
      return a === 'ESKIRGAN' && b === 'YOPIQ' && c === 'YOPIQ' && d === null;
    },
  },
  {
    nomi: 'Yozish: joylar soni to‘lgach "to‘ldi"; tashlagan/kelmagan/bekor qilganlar o‘rinni BO‘SHATADI; noma‘lum o‘rinda cheklov yo‘q',
    tekshir: async () => {
      const kurs = await kursYarat({ joylar: 2 });
      const f1 = await fuqaroYarat();
      const f2 = await fuqaroYarat();
      const f3 = await fuqaroYarat();
      const r1 = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f1, kursId: kurs }));
      const r2 = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f2, kursId: kurs }));
      const r3 = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f3, kursId: kurs }));
      /* Birinchisi bekor qilinadi - joy bo'shaydi */
      const y1 = await prisma.kursYollanmasi.findFirstOrThrow({ where: { kursId: kurs, ishsizId: f1 } });
      await yozuvAmali(BANDLIK(), y1.id, { amal: 'bekor' });
      const r3b = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f3, kursId: kurs }));

      const cheksiz = await kursYarat({ joylar: null });
      let hammasi = true;
      for (let i = 0; i < 4; i++) {
        hammasi = hammasi && (await xatoKodi(async () => kursgaYozish(BANDLIK(), { ishsizId: await fuqaroYarat(), kursId: cheksiz }))) === null;
      }
      return r1 === null && r2 === null && r3 === 'TOLDI' && r3b === null && hammasi;
    },
  },
  {
    nomi: 'POYGA: 1 va 2 o‘rinli kurslarga 24 kishi BIR VAQTDA yozilsa - o‘rin soni aynan to‘ladi, oshib ketmaydi (qulf bo‘lmasa 2+ kishi 1 o‘ringa yoziladi)',
    tekshir: async () => {
      /* Havzadagi ulanishlar soni kichik: poyga faqat o'rin soni ulanishlar sonidan KAM bo'lganda ko'rinadi */
      const sozlama = [1, 1, 2, 2];
      const kurslarRoyxat = await Promise.all(sozlama.map((j) => kursYarat({ joylar: j })));
      const odamlar = await Promise.all(Array.from({ length: 24 }, () => fuqaroYarat()));
      const natijalar = await Promise.all(
        kurslarRoyxat.flatMap((kurs) =>
          odamlar.map((f) =>
            xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f, kursId: kurs })).then((x) => ({ kurs, x }))
          )
        )
      );
      let togri = true;
      for (const [i, kurs] of kurslarRoyxat.entries()) {
        const band = await prisma.kursYollanmasi.count({ where: { kursId: kurs } });
        const o = natijalar.filter((n) => n.kurs === kurs);
        togri =
          togri &&
          band === sozlama[i] &&
          o.filter((n) => n.x === null).length === sozlama[i] &&
          o.filter((n) => n.x === 'TOLDI').length === 24 - sozlama[i];
      }
      return togri;
    },
  },
  {
    nomi: 'QULF: boshqa tranzaksiya kurs satrini ushlab turganda yozish KUTADI (o‘rin tekshiruvi qulf ostida), qulf bo‘shagach tugaydi',
    tekshir: async () => {
      /*
       * Yuk ostidagi poyga bu muhitda (Prisma ulanishlari deyarli ketma-ket)
       * deterministik chiqmaydi. Shuning uchun qulfning O'ZINI sinaymiz:
       * qulf bo'lsa, yozish tashqi tranzaksiya tugaguncha kutadi.
       *
       * Tashqi tranzaksiya `FOR NO KEY UPDATE` ushlaydi, `FOR UPDATE` EMAS:
       * yozuv qo'shishdagi tashqi kalit (FK) o'zi `FOR KEY SHARE` oladi va
       * `FOR UPDATE` bilan to'qnashardi - qulf olib tashlansa ham kutish
       * yashirincha davom etib, mutatsiya ushlanmay qolardi. `NO KEY UPDATE`
       * FK qulfi bilan to'qnashmaydi, faqat bizning aniq `FOR UPDATE` bilan.
       */
      const kurs = await kursYarat({ joylar: 5 });
      const f = await fuqaroYarat();
      let tugadi = false;
      let kutdi = false;
      let yozish: Promise<unknown> = Promise.resolve();
      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Kurs" WHERE "id" = ${kurs} FOR NO KEY UPDATE`;
          yozish = kursgaYozish(BANDLIK(), { ishsizId: f, kursId: kurs }).then(() => {
            tugadi = true;
          });
          await new Promise((r) => setTimeout(r, 700));
          kutdi = !tugadi;
        },
        { timeout: 20000 }
      );
      await yozish;
      const soni = await prisma.kursYollanmasi.count({ where: { kursId: kurs, ishsizId: f } });
      return kutdi && tugadi && soni === 1;
    },
  },
  {
    nomi: 'QULF: "tiklash" ham kurs satrini qulflaydi (o‘rin tekshiruvi qulf ostida)',
    tekshir: async () => {
      const kurs = await kursYarat({ joylar: 5 });
      const { yozuv } = await yozuvYarat(kurs, mahallaA, { holati: 'BEKOR' });
      let tugadi = false;
      let kutdi = false;
      let amal: Promise<unknown> = Promise.resolve();
      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Kurs" WHERE "id" = ${kurs} FOR NO KEY UPDATE`;
          amal = yozuvAmali(BANDLIK(), yozuv, { amal: 'tiklash' }).then(() => {
            tugadi = true;
          });
          await new Promise((r) => setTimeout(r, 700));
          kutdi = !tugadi;
        },
        { timeout: 20000 }
      );
      await amal;
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: yozuv } });
      return kutdi && tugadi && y?.holati === 'YOLLANDI';
    },
  },
  {
    nomi: 'POYGA: bitta fuqaro bitta kursga bir vaqtda 6 marta yozilsa - bitta yozuv, hamma so‘rov muvaffaqiyatli (idempotent)',
    tekshir: async () => {
      const kurs = await kursYarat();
      const f = await fuqaroYarat();
      const r = await Promise.all(
        Array.from({ length: 6 }, () => kursgaYozish(BANDLIK(), { ishsizId: f, kursId: kurs }).then((x) => x.id, () => null))
      );
      const soni = await prisma.kursYollanmasi.count({ where: { kursId: kurs, ishsizId: f } });
      return soni === 1 && r.every((x) => x !== null) && new Set(r).size === 1;
    },
  },
  {
    nomi: 'IT-shaharcha vaucheri: faqat shu fuqaroning vaucheriga bog‘lanadi; boshqa fuqaroning vaucheri rad etiladi; vaucher oqimi o‘zgarmaydi',
    tekshir: async () => {
      const kurs = await kursYarat();
      const f = await fuqaroYarat();
      const g = await fuqaroYarat();
      const mk = async (ishsizId: string) => {
        const v = await prisma.itVaucher.create({
          data: { raqami: noyob('IT-TEST'), ishsizId, mahallaId: mahallaA, yonalish: 'Veb', bergangaId: bandlik },
          select: { id: true, holati: true },
        });
        return v;
      };
      const vF = await mk(f);
      const vG = await mk(g);
      const begona = await xatoKodi(() => kursgaYozish(BANDLIK(), { ishsizId: f, kursId: kurs, itVaucherId: vG.id }));
      const r = await kursgaYozish(BANDLIK(), { ishsizId: f, kursId: kurs, itVaucherId: vF.id });
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: r.id } });
      const vNow = await prisma.itVaucher.findUnique({ where: { id: vF.id } });
      /* Vaucherning o'zi o'zgarmaydi */
      return begona === 'NOTOGRI' && y?.itVaucherId === vF.id && vNow?.holati === vF.holati;
    },
  },

  /* ══ 7. YOZUV AMALLARI: BOSHLASH, KELMADI, TASHLASH, TAMOMLASH ══ */
  {
    nomi: 'Boshladi: kelajak sana va kurs boshlanishidan oldingi sana rad etiladi; to‘g‘ri sana qabul; ikkinchi marta - holat xatosi',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -5, tugash: 25 });
      const { yozuv } = await yozuvYarat(kurs);
      const kelajak = await xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'boshladi', sana: keyin(2) }));
      const oldin = await xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'boshladi', sana: keyin(-9) }));
      const ok = await xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'boshladi', sana: keyin(-4) }));
      const yana = await xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'boshladi', sana: keyin(-3) }));
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: yozuv } });
      return kelajak === 'NOTOGRI' && oldin === 'NOTOGRI' && ok === null && yana === 'HOLAT' && y?.holati === 'BOSHLADI';
    },
  },
  {
    nomi: 'Kelmadi: kurs boshlangunga qadar belgilab bo‘lmaydi; boshlangandan keyin - mumkin va davomat NOMA‘LUM qoladi (nolga aylanmaydi)',
    tekshir: async () => {
      const hali = await kursYarat({ boshlanish: 5, tugash: 30 });
      const boshlangan = await kursYarat({ boshlanish: -3, tugash: 20 });
      const a = await yozuvYarat(hali);
      const b = await yozuvYarat(boshlangan);
      const erta = await xatoKodi(() => yozuvAmali(BANDLIK(), a.yozuv, { amal: 'kelmadi' }));
      const ok = await xatoKodi(() => yozuvAmali(BANDLIK(), b.yozuv, { amal: 'kelmadi', izoh: 'Telefon ko‘tarmadi' }));
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: b.yozuv } });
      return erta === 'NOTOGRI' && ok === null && y?.holati === 'KELMADI' && y.qatnashganKun === null;
    },
  },
  {
    nomi: 'Tamomladi: sana, davomat, sertifikat, olingan ko‘nikmalar saqlanadi; davomat jami dars kunidan ko‘p bo‘lmaydi; sana boshlagan sanadan oldin bo‘lmaydi',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -30, tugash: -1, jamiDarsKuni: 20 });
      const { yozuv } = await yozuvYarat(kurs, mahallaA, { holati: 'BOSHLADI', boshlaganSana: keyin(-29) });
      const kop = await xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'tamomladi', sana: keyin(-2), qatnashganKun: 25 }));
      const oldin = await xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'tamomladi', sana: keyin(-31) }));
      const ok = await xatoKodi(() =>
        yozuvAmali(BANDLIK(), yozuv, {
          amal: 'tamomladi',
          sana: keyin(-2),
          qatnashganKun: 17,
          sertifikat: true,
          olinganKonikmalar: ['Payvandlash', 'Qalin metall'],
          izoh: 'Yaxshi o‘qidi',
        })
      );
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: yozuv } });
      return (
        kop === 'NOTOGRI' && oldin === 'NOTOGRI' && ok === null &&
        y?.holati === 'TAMOMLADI' && y.qatnashganKun === 17 && y.sertifikat === true &&
        y.olinganKonikmalar.length === 2 && y.tugatganSana !== null
      );
    },
  },
  {
    nomi: 'Tamomladi: davomat va sertifikat kiritilmasa NOMA‘LUM (null) qoladi, 0 yoki false emas',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -30, tugash: -1 });
      const { yozuv } = await yozuvYarat(kurs);
      await yozuvAmali(BANDLIK(), yozuv, YozuvAmaliSxemasi.parse({ amal: 'tamomladi', sana: keyin(-2).toISOString() }));
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: yozuv } });
      return y?.holati === 'TAMOMLADI' && y.qatnashganKun === null && y.sertifikat === null && y.boshlaganSana === null;
    },
  },
  {
    nomi: 'Tashladi: o‘qiyotgan yozuvdan; sabab saqlanadi. Yakuniy holatlardan (tashladi, kelmadi, bekor) boshqa holatga o‘tib bo‘lmaydi',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -10, tugash: 20 });
      const a = await yozuvYarat(kurs, mahallaA, { holati: 'BOSHLADI', boshlaganSana: keyin(-9) });
      const ok = await xatoKodi(() => yozuvAmali(BANDLIK(), a.yozuv, { amal: 'tashladi', sana: keyin(-2), qatnashganKun: 4, izoh: 'Ish topdi, vaqt yo‘q' }));
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: a.yozuv } });
      /* Yakuniy holatdan hech qaysi amal o'tmaydi */
      const urinishlar = await Promise.all([
        xatoKodi(() => yozuvAmali(BANDLIK(), a.yozuv, { amal: 'tamomladi', sana: keyin(-1) })),
        xatoKodi(() => yozuvAmali(BANDLIK(), a.yozuv, { amal: 'boshladi', sana: keyin(-1) })),
        xatoKodi(() => yozuvAmali(BANDLIK(), a.yozuv, { amal: 'bekor' })),
        xatoKodi(() => yozuvAmali(BANDLIK(), a.yozuv, { amal: 'toldirish', sertifikat: true })),
      ]);
      return ok === null && y?.holati === 'TASHLADI' && y.qatnashganKun === 4 && /vaqt/.test(y.izoh ?? '') && urinishlar.every((x) => x === 'HOLAT');
    },
  },
  {
    nomi: 'Bekor: faqat boshlanmagan yozuv; o‘qiyotgan yozuvni "tashladi" deb yozish kerak. Tiklash: faqat bekordan va o‘rin bo‘lsa',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -3, tugash: 20, joylar: 2 });
      const a = await yozuvYarat(kurs);
      const b = await yozuvYarat(kurs, mahallaA, { holati: 'BOSHLADI', boshlaganSana: keyin(-1) });
      const bekorBoshlagan = await xatoKodi(() => yozuvAmali(BANDLIK(), b.yozuv, { amal: 'bekor' }));
      await yozuvAmali(BANDLIK(), a.yozuv, { amal: 'bekor' });
      /* a bekor bo'ldi - o'rin bo'shadi, boshqa kishi o'sha o'ringa yozildi (b + g = 2 = to'la) */
      const g = await fuqaroYarat();
      await kursgaYozish(BANDLIK(), { ishsizId: g, kursId: kurs });
      const tiklashToldi = await xatoKodi(() => yozuvAmali(BANDLIK(), a.yozuv, { amal: 'tiklash' }));
      /* g bekor qilinadi - o'rin ochiladi */
      const gy = await prisma.kursYollanmasi.findFirstOrThrow({ where: { kursId: kurs, ishsizId: g } });
      await yozuvAmali(BANDLIK(), gy.id, { amal: 'bekor' });
      const tiklash = await xatoKodi(() => yozuvAmali(BANDLIK(), a.yozuv, { amal: 'tiklash' }));
      const tiklashYana = await xatoKodi(() => yozuvAmali(BANDLIK(), a.yozuv, { amal: 'tiklash' }));
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: a.yozuv } });
      return bekorBoshlagan === 'HOLAT' && tiklashToldi === 'TOLDI' && tiklash === null && tiklashYana === 'HOLAT' && y?.holati === 'YOLLANDI';
    },
  },
  {
    nomi: 'Yozuv amali: boshqa mahalla yozuviga yettilik xodimi tegina olmaydi; arxivdagi fuqaro yozuvi "topilmadi"; noma‘lum id "topilmadi"',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -5, tugash: 20 });
      const a = await yozuvYarat(kurs, mahallaA);
      const arx = await yozuvYarat(kurs, mahallaA);
      await prisma.unemployedPerson.update({ where: { id: arx.fuqaro }, data: { arxivSanasi: new Date() } });
      const begona = await xatoKodi(() => yozuvAmali(YETTILIK_B(), a.yozuv, { amal: 'boshladi', sana: keyin(-1) }));
      const oz = await xatoKodi(() => yozuvAmali(YETTILIK_A(), a.yozuv, { amal: 'boshladi', sana: keyin(-1) }));
      const arxiv = await xatoKodi(() => yozuvAmali(BANDLIK(), arx.yozuv, { amal: 'boshladi', sana: keyin(-1) }));
      const yoq = await xatoKodi(() => yozuvAmali(BANDLIK(), 'yoq-id', { amal: 'bekor' }));
      return begona === 'RUXSAT' && oz === null && arxiv === 'TOPILMADI' && yoq === 'TOPILMADI';
    },
  },
  {
    nomi: 'POYGA: bir yozuvga bir vaqtda "tamomladi" va "tashladi" - faqat bittasi o‘tadi, ikkinchisi holat xatosi',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -10, tugash: 20 });
      const { yozuv } = await yozuvYarat(kurs, mahallaA, { holati: 'BOSHLADI', boshlaganSana: keyin(-9) });
      const r = await Promise.all([
        xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'tamomladi', sana: keyin(-1) })),
        xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'tashladi', sana: keyin(-1) })),
        xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'tamomladi', sana: keyin(-1) })),
        xatoKodi(() => yozuvAmali(BANDLIK(), yozuv, { amal: 'tashladi', sana: keyin(-1) })),
      ]);
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: yozuv } });
      return r.filter((x) => x === null).length === 1 && r.filter((x) => x === 'HOLAT').length === 3 && (y?.holati === 'TAMOMLADI' || y?.holati === 'TASHLADI');
    },
  },

  /* ══ 8. NATIJA: SUHBAT VA ISHGA BOG'LASH ══ */
  {
    nomi: 'To‘ldirish: faqat tamomlaganlarga; suhbat kurs tugashidan oldin bo‘lmaydi; null bilan tozalanadi; bo‘sh o‘zgarish rad',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -60, tugash: -30 });
      const t = await yozuvYarat(kurs, mahallaA, { holati: 'TAMOMLADI', boshlaganSana: keyin(-59), tugatganSana: keyin(-30) });
      const y0 = await yozuvYarat(kurs);
      const yolla = await xatoKodi(() => yozuvAmali(BANDLIK(), y0.yozuv, { amal: 'toldirish', sertifikat: true }));
      const oldin = await xatoKodi(() => yozuvAmali(BANDLIK(), t.yozuv, { amal: 'toldirish', suhbatSanasi: keyin(-45) }));
      const uzoq = await xatoKodi(() => yozuvAmali(BANDLIK(), t.yozuv, { amal: 'toldirish', suhbatSanasi: keyin(200) }));
      const ok = await xatoKodi(() => yozuvAmali(BANDLIK(), t.yozuv, { amal: 'toldirish', suhbatSanasi: keyin(-20), sertifikat: false }));
      const a = await prisma.kursYollanmasi.findUnique({ where: { id: t.yozuv } });
      const toz = await xatoKodi(() => yozuvAmali(BANDLIK(), t.yozuv, { amal: 'toldirish', suhbatSanasi: null }));
      const b = await prisma.kursYollanmasi.findUnique({ where: { id: t.yozuv } });
      const bosh = await xatoKodi(() => yozuvAmali(BANDLIK(), t.yozuv, { amal: 'toldirish' }));
      return (
        yolla === 'HOLAT' && oldin === 'NOTOGRI' && uzoq === 'NOTOGRI' && ok === null &&
        a?.suhbatSanasi !== null && a?.sertifikat === false &&
        toz === null && b?.suhbatSanasi === null && bosh === 'NOTOGRI'
      );
    },
  },
  {
    nomi: 'Ishga bog‘lash: kursdan KEYIN boshlangan ish bog‘lanadi; kursdan OLDIN boshlangan ish rad etiladi; begona fuqaroning ishi rad etiladi',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -80, tugash: -61 });
      const t = await yozuvYarat(kurs, mahallaA, { holati: 'TAMOMLADI', boshlaganSana: keyin(-79), tugatganSana: keyin(-61) });
      const eski = await ishYarat(t.fuqaro, keyin(-100));
      const yangi = await ishYarat(t.fuqaro, keyin(-50), 'tasdiq');
      const boshqa = await ishYarat(await fuqaroYarat(), keyin(-50));
      const a = await xatoKodi(() => yozuvAmali(BANDLIK(), t.yozuv, { amal: 'toldirish', joylashishId: eski }));
      const b = await xatoKodi(() => yozuvAmali(BANDLIK(), t.yozuv, { amal: 'toldirish', joylashishId: boshqa }));
      const c = await xatoKodi(() => yozuvAmali(BANDLIK(), t.yozuv, { amal: 'toldirish', joylashishId: yangi }));
      const y = await prisma.kursYollanmasi.findUnique({ where: { id: t.yozuv } });
      return a === 'NOTOGRI' && b === 'NOTOGRI' && c === null && y?.joylashishId === yangi;
    },
  },
  {
    nomi: 'Ishga bog‘lash: bitta ish ikkinchi kursga hisoblanmaydi (baza UNIQUE); tozalangach boshqasiga bog‘lash mumkin',
    tekshir: async () => {
      const k1 = await kursYarat({ boshlanish: -120, tugash: -100 });
      const k2 = await kursYarat({ boshlanish: -90, tugash: -70 });
      const f = await fuqaroYarat();
      const y1 = await prisma.kursYollanmasi.create({ data: { kursId: k1, ishsizId: f, yaratganId: bandlik, holati: 'TAMOMLADI', tugatganSana: keyin(-100) } });
      const y2 = await prisma.kursYollanmasi.create({ data: { kursId: k2, ishsizId: f, yaratganId: bandlik, holati: 'TAMOMLADI', tugatganSana: keyin(-70) } });
      const ish = await ishYarat(f, keyin(-60));
      const a = await xatoKodi(() => yozuvAmali(BANDLIK(), y1.id, { amal: 'toldirish', joylashishId: ish }));
      const b = await xatoKodi(() => yozuvAmali(BANDLIK(), y2.id, { amal: 'toldirish', joylashishId: ish }));
      await yozuvAmali(BANDLIK(), y1.id, { amal: 'toldirish', joylashishId: null });
      const c = await xatoKodi(() => yozuvAmali(BANDLIK(), y2.id, { amal: 'toldirish', joylashishId: ish }));
      return a === null && b === 'MAVJUD' && c === null;
    },
  },
  {
    nomi: 'POYGA: bitta ish ikki kursga bir vaqtda bog‘lanmoqchi bo‘lsa - faqat bittasiga bog‘lanadi',
    tekshir: async () => {
      const k1 = await kursYarat({ boshlanish: -120, tugash: -100 });
      const k2 = await kursYarat({ boshlanish: -90, tugash: -70 });
      const f = await fuqaroYarat();
      const y1 = await prisma.kursYollanmasi.create({ data: { kursId: k1, ishsizId: f, yaratganId: bandlik, holati: 'TAMOMLADI', tugatganSana: keyin(-100) } });
      const y2 = await prisma.kursYollanmasi.create({ data: { kursId: k2, ishsizId: f, yaratganId: bandlik, holati: 'TAMOMLADI', tugatganSana: keyin(-70) } });
      const ish = await ishYarat(f, keyin(-60));
      const r = await Promise.all([
        xatoKodi(() => yozuvAmali(BANDLIK(), y1.id, { amal: 'toldirish', joylashishId: ish })),
        xatoKodi(() => yozuvAmali(BANDLIK(), y2.id, { amal: 'toldirish', joylashishId: ish })),
      ]);
      const soni = await prisma.kursYollanmasi.count({ where: { joylashishId: ish } });
      return soni === 1 && r.filter((x) => x === null).length === 1 && r.filter((x) => x === 'MAVJUD').length === 1;
    },
  },
  {
    nomi: 'Kurs yozuvi fuqaro holatini va joylashishni O‘ZGARTIRMAYDI: tamomlash/bog‘lashdan keyin fuqaro holati, ish yozuvi va dalil o‘sha-o‘sha',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -80, tugash: -61 });
      const t = await yozuvYarat(kurs, mahallaA, { holati: 'BOSHLADI', boshlaganSana: keyin(-79) });
      const ish = await ishYarat(t.fuqaro, keyin(-50), 'xodim');
      const oldinF = await prisma.unemployedPerson.findUnique({ where: { id: t.fuqaro } });
      const oldinJ = await prisma.ishgaJoylashish.findUnique({ where: { id: ish } });
      const oldinDalil = await prisma.joylashuvDalili.count({ where: { ishsizId: t.fuqaro } });
      await yozuvAmali(BANDLIK(), t.yozuv, { amal: 'tamomladi', sana: keyin(-61), sertifikat: true });
      await yozuvAmali(BANDLIK(), t.yozuv, { amal: 'toldirish', joylashishId: ish, suhbatSanasi: keyin(-55) });
      const f = await prisma.unemployedPerson.findUnique({ where: { id: t.fuqaro } });
      const j = await prisma.ishgaJoylashish.findUnique({ where: { id: ish } });
      const dalil = await prisma.joylashuvDalili.count({ where: { ishsizId: t.fuqaro } });
      return (
        f?.holati === oldinF?.holati && f?.updatedAt.getTime() === oldinF?.updatedAt.getTime() &&
        j?.holati === oldinJ?.holati && j?.updatedAt.getTime() === oldinJ?.updatedAt.getTime() &&
        dalil === oldinDalil && f?.holati === 'ANIQLANDI'
      );
    },
  },

  /* ══ 9. KO'RSATKICHLAR BAZADAN ══ */
  {
    nomi: 'Bazadan ko‘rsatkich: tasdiqlangan ish (dalil bilan) va faqat xodim aytgan ish alohida; arxivdagi fuqaro hisobga kirmaydi; bekor kurs kirmaydi',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -150, tugash: -120, jamiDarsKuni: 20 });
      const mk = async (q: Record<string, unknown>) => {
        const f = await fuqaroYarat();
        await prisma.kursYollanmasi.create({
          data: { kursId: kurs, ishsizId: f, yaratganId: bandlik, boshlaganSana: keyin(-149), ...q },
        });
        return f;
      };
      const f1 = await mk({ holati: 'TAMOMLADI', tugatganSana: keyin(-120), qatnashganKun: 19 });
      const f2 = await mk({ holati: 'TAMOMLADI', tugatganSana: keyin(-120), qatnashganKun: 18 });
      await mk({ holati: 'TAMOMLADI', tugatganSana: keyin(-120) });
      await mk({ holati: 'TASHLADI', tugatganSana: keyin(-130), qatnashganKun: 5 });
      const arx = await mk({ holati: 'TAMOMLADI', tugatganSana: keyin(-120), qatnashganKun: 20 });
      await prisma.unemployedPerson.update({ where: { id: arx }, data: { arxivSanasi: new Date() } });

      const j1 = await ishYarat(f1, keyin(-100), 'tasdiq');
      const j2 = await ishYarat(f2, keyin(-100), 'xodim');
      for (const [f, j] of [[f1, j1], [f2, j2]] as const) {
        const y = await prisma.kursYollanmasi.findFirstOrThrow({ where: { kursId: kurs, ishsizId: f } });
        await prisma.kursYollanmasi.update({ where: { id: y.id }, data: { joylashishId: j } });
      }

      const k = await kursKorsatkichlari(kurs);
      /* Bekor kurs ham kirmaydi */
      const bekor = await kursYarat({ bekor: true });
      await prisma.kursYollanmasi.create({ data: { kursId: bekor, ishsizId: await fuqaroYarat(), yaratganId: bandlik, holati: 'TAMOMLADI', tugatganSana: keyin(-100) } });
      const kb = await kursKorsatkichlari(bekor);
      return (
        k.tamomlagan === 3 && k.tashlagan === 1 && k.jami === 4 &&
        k.natija.muddatiOtgan === 3 &&
        k.natija.tasdiqlangan === 1 && k.natija.tasdiqlanmagan === 1 && k.natija.qaydEtilmagan === 1 &&
        k.davomat.yozuvlar === 3 && k.davomat.nomalum === 1 &&
        kb.jami === 0
      );
    },
  },

  /* ══ 10. E'LON UCHUN KURSLAR ══ */
  {
    nomi: 'E‘longa mos kurslar: faqat boshlanmagan, yangi, o‘rni bor, bekor qilinmagan kurs - sababi bilan; boshqalar chiqmaydi',
    tekshir: async () => {
      const kalit = `Sinovpayvand${Math.floor(Math.random() * 1e6)}lash`;
      const mos = await kursYarat({ konikmalar: [kalit] });
      const boshlangan = await kursYarat({ boshlanish: -2, konikmalar: [kalit] });
      const eskirgan = await kursYarat({ tekshirilgan: -ESKIRISH_KUNI - 10, konikmalar: [kalit] });
      const bekor = await kursYarat({ bekor: true, konikmalar: [kalit] });
      const tolgan = await kursYarat({ joylar: 1, konikmalar: [kalit] });
      await yozuvYarat(tolgan);
      const boshqa = await kursYarat({ konikmalar: ['Butunlay boshqa narsa'] });

      const r = await elonUchunKurslar({ lavozim: 'Ishchi', talablar: `${kalit} bo‘yicha tajriba`, yonalish: null });
      const idlar = r.map((x) => x.id);
      return (
        idlar.includes(mos) &&
        !idlar.includes(boshlangan) && !idlar.includes(eskirgan) && !idlar.includes(bekor) &&
        !idlar.includes(tolgan) && !idlar.includes(boshqa) &&
        r.find((x) => x.id === mos)?.sabab.turi === 'konikma' &&
        (r.find((x) => x.id === mos)?.qolganJoy ?? 0) === 10
      );
    },
  },

  /* ══ 10b. VAZIFALAR TAXTASI ══ */
  {
    nomi: 'Vazifalar taxtasi: holati yangilanmagan kurs yozuvi bandlikka ko‘rinadi, yettilikka FAQAT o‘z mahallasi, hokimga ko‘rinmaydi; yangilangach yo‘qoladi',
    tekshir: async () => {
      const kurs = await kursYarat({ boshlanish: -10, tugash: 20 });
      const a = await yozuvYarat(kurs, mahallaA);
      const sonlari = async (rol: 'BANDLIK' | 'YETTILIK' | 'HOKIM', userId: string, mahallaId: string | null) => {
        const t = await vazifalarim({ userId, rol, mahallaId });
        const b = t.bloklar.find((x) => x.kalit === 'kurs-yangilanmagan');
        return { bor: !!b, ichida: !!b?.qatorlar.some((q) => q.id === a.yozuv) };
      };
      const bandlik_ = await sonlari('BANDLIK', bandlik, null);
      const oz = await sonlari('YETTILIK', yettilikA, mahallaA);
      const begona = await sonlari('YETTILIK', yettilikB, mahallaB);
      const hokim = await sonlari('HOKIM', bandlik, null);
      await yozuvAmali(BANDLIK(), a.yozuv, { amal: 'boshladi', sana: keyin(-9) });
      const keyingi = await sonlari('BANDLIK', bandlik, null);
      return bandlik_.ichida && oz.ichida && !begona.ichida && !hokim.bor && !keyingi.ichida;
    },
  },

  /* ══ 11. KOD VA HUQUQ (manba matni) ══ */
  {
    nomi: 'API: har yo‘l sessiyani talab qiladi; kurs yaratish/o‘zgartirish faqat bandlik/rahbar/admin; yozish va yozuv amali - yettilik ham (mahalla doirasida); hokim hech qaysisiga kira olmaydi',
    tekshir: async () => {
      const a = oqi('src/app/api/kurslar/route.ts');
      const b = oqi('src/app/api/kurslar/[id]/route.ts');
      const c = oqi('src/app/api/kurs-yozuvlari/route.ts');
      const d = oqi('src/app/api/kurs-yozuvlari/[id]/route.ts');
      /* `const ROLLAR = [...] as const` ichidagi rollar va `talabQil([...ROLLAR])` chaqiruvi */
      const rollar = (m: string): string[] | null => {
        const q = m.match(/const ROLLAR = \[([^\]]*)\] as const/);
        if (!q || !/talabQil\(\[\.\.\.ROLLAR\]\)/.test(m)) return null;
        return q[1].split(',').map((x) => x.trim().replace(/['"]/g, '')).filter(Boolean).sort();
      };
      const BANDLIK_ROLLARI = ['ADMIN', 'BANDLIK', 'BANDLIK_RAHBAR'];
      const YETTILIK_BILAN = ['ADMIN', 'BANDLIK', 'BANDLIK_RAHBAR', 'YETTILIK'];
      const tenglik = (x: string[] | null, y: string[]) => x !== null && JSON.stringify(x) === JSON.stringify(y);
      const faqatBandlik = (m: string) => tenglik(rollar(m), BANDLIK_ROLLARI);
      const yettilikBilan = (m: string) => tenglik(rollar(m), YETTILIK_BILAN);
      return (
        faqatBandlik(a) && faqatBandlik(b) &&
        yettilikBilan(c) && yettilikBilan(d) &&
        ![a, b, c, d].some((m) => m.includes("'HOKIM'")) &&
        [a, b, c, d].every((m) => m.includes('KURS_HTTP') && m.includes('KursXatosi'))
      );
    },
  },
  {
    nomi: 'Kod: kurs mantig‘i joylashish, fuqaro holati va IT-vaucherni YOZMAYDI; "kafolat" faqat inkor ogohlantirishida',
    tekshir: async () => {
      const k = oqi('src/lib/kurslar.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const n = oqi('src/lib/kurslar-nomlari.ts');
      const yozadi = /\b(ishgaJoylashish|joylashuvDalili|itVaucher|unemployedPerson|household)\s*\.\s*(create|update|updateMany|delete|deleteMany|upsert)\b/.test(k);
      const kafolatlar = (n.match(/кафолат/gi) ?? []).length;
      const ogoh = /Курсни тамомлаш ишга қабул қилинишни кафолатламайди/.test(n);
      return !yozadi && kafolatlar === 1 && ogoh;
    },
  },
  {
    nomi: 'Kod: yozishda joylar kurs satrini qulflash (FOR UPDATE) bilan tekshiriladi; holat o‘zgarishi updateMany + holat sharti bilan',
    tekshir: async () => {
      const k = oqi('src/lib/kurslar.ts');
      const qulf = (k.match(/FOR UPDATE/g) ?? []).length;
      return qulf >= 2 && k.includes('updateMany') && /where:\s*\{\s*id:\s*y\.id,\s*holati:\s*\{\s*in:\s*from\s*\}/.test(k);
    },
  },
  {
    nomi: 'Sahifalar: menyu (/kurslar), sahifa huquqi, fuqaro sahifasi va e‘lon sahifasida bloklar - xato yutadigan (try/catch) bilan',
    tekshir: async () => {
      const m = oqi('src/components/shell/navigatsiya.ts');
      const list = oqi('src/app/(ilova)/kurslar/page.tsx');
      const det = oqi('src/app/(ilova)/kurslar/[id]/page.tsx');
      const f = oqi('src/app/(ilova)/ishsizlar/[id]/page.tsx');
      const e = oqi('src/app/(ilova)/ish-orinlari/[id]/page.tsx');
      const bl = oqi('src/components/kurs/kurslar-blogi.tsx');
      const el = oqi('src/components/kurs/elon-kurslari-blogi.tsx');
      return (
        /yol:\s*'\/kurslar'/.test(m) &&
        list.includes("yolgaRuxsat(sessiya.rol, '/kurslar')") && det.includes("yolgaRuxsat(sessiya.rol, '/kurslar')") &&
        f.includes('<KurslarBlogi') && e.includes('<ElonKurslariBlogi') &&
        bl.includes('catch (e)') && el.includes('catch (e)')
      );
    },
  },
  {
    nomi: 'Migratsiya faqat qo‘shadi: ikki yangi jadval, bitta tur; mavjud jadvalga tegmaydi; takrorlanuvchan (IF NOT EXISTS)',
    tekshir: async () => {
      const sql = oqi('prisma/migrations/20261001160000_kurslar/migration.sql');
      const xavfli = /\b(DROP\s+(TABLE|COLUMN|TYPE)|RENAME|TRUNCATE|SET\s+NOT\s+NULL|ALTER\s+COLUMN)\b/i.test(sql);
      const jadvallar = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/g) ?? [];
      const mavjudgaTegadi = /ALTER TABLE "(User|UnemployedPerson|IshgaJoylashish|ItVaucher|Vacancy)"\s+(ADD COLUMN|DROP)/i.test(sql);
      return !xavfli && jadvallar.length === 2 && !mavjudgaTegadi && !/CREATE TABLE "/.test(sql);
    },
  },
  {
    nomi: 'Sxema sinovlari: ID noto‘g‘ri bo‘lsa yozish/amal sxemalari rad etadi; noma‘lum amal rad etiladi; HTTP kodlari to‘liq',
    tekshir: async () => {
      const kodlar: KursXatosi['kod'][] = ['TOPILMADI', 'RUXSAT', 'NOTOGRI', 'MAVJUD', 'YOPIQ', 'TOLDI', 'ESKIRGAN', 'HOLAT'];
      return (
        !YozishSxemasi.safeParse({ ishsizId: '', kursId: 'x' }).success &&
        !YozishSxemasi.safeParse({ ishsizId: 'a', kursId: 'x'.repeat(100) }).success &&
        YozishSxemasi.safeParse({ ishsizId: 'k100_1', kursId: 'abc' }).success &&
        !YozuvAmaliSxemasi.safeParse({ amal: 'yoq-amal' }).success &&
        !YozuvAmaliSxemasi.safeParse({ amal: 'boshladi' }).success &&
        !YozuvAmaliSxemasi.safeParse({ amal: 'boshladi', sana: 'kecha' }).success &&
        !YozuvAmaliSxemasi.safeParse({ amal: 'tamomladi', sana: '2026-01-01', qatnashganKun: -1 }).success &&
        !YozuvAmaliSxemasi.safeParse({ amal: 'tamomladi', sana: '2026-01-01', olinganKonikmalar: Array(11).fill('abcd') }).success &&
        kodlar.every((k) => typeof KURS_HTTP[k] === 'number' && KURS_HTTP[k] >= 400)
      );
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
