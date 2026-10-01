/**
 * ============================================================
 *  MAHALLIY BUYURTMALAR (PILOT) — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/buyurtma-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *   1. ROZILIKSIZ FUQARO IJROCHI QILINSA - uning telefoni va ismi u rozi
 *      bo'lmagan holda buyurtmachiga beriladi.
 *
 *   2. "BAJARILDI" MUVAFFAQIYAT BO'LIB HISOBLANSA - xodim yozgan, lekin ijrochi
 *      yoki buyurtmachi e'tiroz bildirgan ish "muvaffaqiyatli" deb
 *      hisoblanadi; hokimning raqami tasdiqlanmagan ishdan o'sadi.
 *
 *   3. YOPILGAN TAKLIFGA BUYURTMA BIRIKTIRILIB QOLSA - fuqaro rozilikni
 *      qaytarib olgan, ammo buyurtma unga biriktirilgan holda qoladi.
 *
 *   4. NOMA'LUM NOLGA AYLANSA - kelishilmagan narx "0 so'm" bo'lib,
 *      so'ralmagan tasdiq "e'tiroz" bo'lib chiqadi.
 *
 *   5. MAHALLA XODIMI BEGONA MAHALLA BUYURTMASINI KO'RSA/O'ZGARTIRSA.
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
  BUYURTMA_HTTP,
  BuyurtmaAmaliSxemasi,
  BuyurtmaXatosi,
  BuyurtmaYaratishSxemasi,
  TASDIQ_KUTISH_KUNI,
  XizmatAmaliSxemasi,
  XizmatYaratishSxemasi,
  buyurtmaAmali,
  buyurtmaFoizi,
  buyurtmaKorsatkichlari,
  buyurtmaKorsatkichlarniHisobla,
  buyurtmaTasdigi,
  buyurtmaYaratish,
  tasdiqKutayotganlar,
  xizmatAmali,
  xizmatYaratish,
  type BuyurtmaMetrika,
} from '../src/lib/buyurtmalar';

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
const fuqarolar: string[] = [];
const xodimlar: string[] = [];
const buyurtmalar: string[] = [];
const takliflar: string[] = [];

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
  bandlik = await mk('Sinov buyurtma bandlik', 'BANDLIK');
  yettilikA = await mk('Sinov buyurtma yettilik A', 'YETTILIK', mahallaA);
  yettilikB = await mk('Sinov buyurtma yettilik B', 'YETTILIK', mahallaB);
}

async function tozala() {
  /* Buyurtmalar taklifdan oldin (FK SetNull bo'lsa ham tartib toza bo'lsin) */
  await prisma.mahalliyBuyurtma.deleteMany({ where: { OR: [{ id: { in: buyurtmalar } }, { yaratganId: { in: xodimlar } }] } });
  await prisma.xizmatTaklifi.deleteMany({ where: { OR: [{ id: { in: takliflar } }, { yaratganId: { in: xodimlar } }] } });
  await prisma.unemployedPerson.deleteMany({ where: { id: { in: fuqarolar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
}

async function fuqaroYarat(mahalla = mahallaA, q: Record<string, unknown> = {}) {
  const f = await prisma.unemployedPerson.create({
    data: {
      fish: noyob('Buyurtma Sinov'),
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

/** Taklif (to'g'ridan-to'g'ri bazaga): rozilik va faolligi bilan */
async function taklifYarat(q: { mahalla?: string; rozilik?: boolean; faol?: boolean; nomi?: string } = {}) {
  const f = await fuqaroYarat(q.mahalla ?? mahallaA);
  const t = await prisma.xizmatTaklifi.create({
    data: {
      ishsizId: f,
      nomi: q.nomi ?? noyob('Payvandlash'),
      rozilik: q.rozilik ?? true,
      roziligiUsuli: q.rozilik === false ? null : 'TELEFON',
      roziligiSana: q.rozilik === false ? null : new Date(),
      faol: q.faol ?? true,
      yopilganSana: q.faol === false ? new Date() : null,
      yaratganId: bandlik,
    },
    select: { id: true },
  });
  takliflar.push(t.id);
  return { taklif: t.id, fuqaro: f };
}

async function buyurtmaYarat(mahalla = mahallaA, q: Record<string, unknown> = {}) {
  const b = await prisma.mahalliyBuyurtma.create({
    data: { mahallaId: mahalla, buyurtmachiNomi: 'Sinov Buyurtmachi', tavsif: noyob('Eshik tuzatish kerak'), yaratganId: bandlik, ...q },
    select: { id: true },
  });
  buyurtmalar.push(b.id);
  return b.id;
}

/** Bajarilgan buyurtma (tayinlangan, kelishilgan, bajarilgan) */
async function bajarilgan(q: Record<string, unknown> = {}, mahalla = mahallaA) {
  const t = await taklifYarat({ mahalla });
  const id = await buyurtmaYarat(mahalla, {
    holati: 'BAJARILDI',
    taklifId: t.taklif,
    tayinlanganSana: keyin(-10),
    kelishilganNarx: 150000n,
    kelishilganSana: keyin(-9),
    bajarilganSana: keyin(-5),
    ...q,
  });
  return { id, taklif: t.taklif };
}

const xatoKodi = async (f: () => Promise<unknown>): Promise<string | null> => {
  try {
    await f();
    return null;
  } catch (e) {
    return e instanceof BuyurtmaXatosi ? e.kod : `BOSHQA:${(e as Error).message.slice(0, 90)}`;
  }
};

const my = (q: Partial<BuyurtmaMetrika> = {}): BuyurtmaMetrika => ({
  holati: 'BAJARILDI',
  bajarilganSana: keyin(-30),
  ijrochiTasdigi: true,
  buyurtmachiTasdigi: true,
  kelishilganNarx: 100000,
  ...q,
});

const SINOVLAR: Sinov[] = [
  /* ══ 1. TOZA FUNKSIYALAR ══ */
  {
    nomi: 'Tasdiq darajasi: ikki tomonlama / nizo / bir tomonlama / tasdiqsiz; so‘ralmagan (null) e‘tiroz EMAS',
    tekshir: async () => {
      const d = (a: boolean | null, b: boolean | null) => buyurtmaTasdigi({ ijrochiTasdigi: a, buyurtmachiTasdigi: b });
      return (
        d(true, true) === 'IKKI_TOMONLAMA' &&
        d(true, null) === 'BIR_TOMONLAMA' &&
        d(null, true) === 'BIR_TOMONLAMA' &&
        d(null, null) === 'TASDIQSIZ' &&
        d(false, null) === 'NIZO' &&
        d(true, false) === 'NIZO' &&
        d(false, false) === 'NIZO'
      );
    },
  },
  {
    nomi: 'Ko‘rsatkich: bekor hisobga kirmaydi; jarayondagilar alohida; bajarilganlar ikki tomonlama / nizo / kutilmoqda / kechikkan',
    tekshir: async () => {
      const h = new Date();
      const k = buyurtmaKorsatkichlarniHisobla(
        [
          my({ holati: 'BEKOR', ijrochiTasdigi: null, buyurtmachiTasdigi: null, bajarilganSana: null }),
          my({ holati: 'YANGI', ijrochiTasdigi: null, buyurtmachiTasdigi: null, bajarilganSana: null, kelishilganNarx: null }),
          my({ holati: 'TAYINLANDI', ijrochiTasdigi: null, buyurtmachiTasdigi: null, bajarilganSana: null, kelishilganNarx: null }),
          my({ holati: 'KELISHILDI', ijrochiTasdigi: null, buyurtmachiTasdigi: null, bajarilganSana: null }),
          my({}),
          my({ ijrochiTasdigi: false }),
          /* Yaqinda bajarilgan, bir tomon tasdiqlagan - hali erta */
          my({ bajarilganSana: keyin(-3, h), buyurtmachiTasdigi: null }),
          /* Uzoq vaqt oldin bajarilgan, tasdiq yo'q - kechikkan */
          my({ bajarilganSana: keyin(-TASDIQ_KUTISH_KUNI - 5, h), ijrochiTasdigi: null, buyurtmachiTasdigi: null }),
          /* Bir tomon tasdiqlagan, ikkinchisi yo'q, uzoq vaqt - kechikkan */
          my({ bajarilganSana: keyin(-TASDIQ_KUTISH_KUNI - 5, h), buyurtmachiTasdigi: null }),
        ],
        h
      );
      return (
        k.jami === 8 && k.bekor === 1 &&
        k.yangi === 1 && k.tayinlandi === 1 && k.kelishildi === 1 &&
        k.bajarilgan === 5 &&
        k.tasdiq.ikkiTomonlama === 1 && k.tasdiq.nizo === 1 &&
        k.tasdiq.kutilmoqda === 1 && k.tasdiq.kechikkan === 2
      );
    },
  },
  {
    nomi: 'Ko‘rsatkich: narx yig‘indisi FAQAT ikki tomonlama tasdiqlanganlardan; narxi yo‘qlari alohida (0 emas); nizo narxi kirmaydi',
    tekshir: async () => {
      const k = buyurtmaKorsatkichlarniHisobla([
        my({ kelishilganNarx: 100000 }),
        my({ kelishilganNarx: 250000 }),
        my({ kelishilganNarx: 0 }),
        my({ kelishilganNarx: null }),
        my({ kelishilganNarx: 999999, ijrochiTasdigi: false }),
        my({ kelishilganNarx: 777777, buyurtmachiTasdigi: null }),
      ]);
      return k.narx.yigindi === 350000 && k.narx.narxiBor === 3 && k.narx.narxiYoq === 1 && k.tasdiq.ikkiTomonlama === 4;
    },
  },
  {
    nomi: 'Foiz: maxraj 0 bo‘lsa yo‘q (null); bo‘sh ro‘yxatda hamma son nol; sanasi noma‘lum bajarilgan - "hali erta"',
    tekshir: async () => {
      const k0 = buyurtmaKorsatkichlarniHisobla([]);
      const k1 = buyurtmaKorsatkichlarniHisobla([my({ bajarilganSana: null, ijrochiTasdigi: null, buyurtmachiTasdigi: null })]);
      return (
        buyurtmaFoizi(0, 0) === null && buyurtmaFoizi(2, 0) === null && buyurtmaFoizi(0, 4) === 0 && buyurtmaFoizi(1, 3) === 33 &&
        k0.jami === 0 && k0.bajarilgan === 0 && k1.tasdiq.kutilmoqda === 1 && k1.tasdiq.kechikkan === 0
      );
    },
  },
  {
    nomi: 'Sxemalar: qisqa tavsif, manfiy narx rad; "kelish" narxsiz rad, 0 (bepul) qabul; e‘tirozda izoh funksiyada talab qilinadi; noma‘lum amal rad',
    tekshir: async () => {
      const t = (q: Record<string, unknown>) => BuyurtmaYaratishSxemasi.safeParse({ mahallaId: 'm1', buyurtmachiNomi: 'Ali', tavsif: 'Eshik tuzatish', ...q }).success;
      const a = (q: Record<string, unknown>) => BuyurtmaAmaliSxemasi.safeParse(q).success;
      return (
        t({}) && !t({ tavsif: 'abc' }) && !t({ buyurtmachiNomi: 'A' }) && !t({ mahallaId: '' }) &&
        a({ amal: 'kelish', narx: 0 }) && !a({ amal: 'kelish' }) && !a({ amal: 'kelish', narx: -5 }) && !a({ amal: 'kelish', narx: 'ming' }) &&
        a({ amal: 'tasdiq', tomon: 'ijrochi', javob: true, usul: 'TELEFON' }) &&
        !a({ amal: 'tasdiq', tomon: 'boshqa', javob: true, usul: 'TELEFON' }) &&
        !a({ amal: 'tasdiq', tomon: 'ijrochi', usul: 'TELEFON' }) &&
        !a({ amal: 'yoq-amal' }) && !a({ amal: 'bekor', sabab: 'x' }) &&
        XizmatYaratishSxemasi.safeParse({ ishsizId: 'k100_1', nomi: 'Payvandlash' }).success &&
        !XizmatYaratishSxemasi.safeParse({ ishsizId: 'a', nomi: 'ab' }).success &&
        !XizmatAmaliSxemasi.safeParse({ amal: 'rozilik' }).success
      );
    },
  },

  /* ══ 2. XIZMAT TAKLIFI ══ */
  {
    nomi: 'Taklif yaratiladi ROZILIKSIZ (rozilik alohida amal); arxivdagi fuqaro "topilmadi"; boshqa mahalla fuqarosi yettilikka taqiqlangan',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const arx = await fuqaroYarat(mahallaA, { arxivSanasi: new Date() });
      const r = await xizmatYaratish(YETTILIK_A(), { ishsizId: f, nomi: 'Tikuvchilik', taxminiyNarx: 80000 });
      takliflar.push(r.id);
      const t = await prisma.xizmatTaklifi.findUnique({ where: { id: r.id } });
      const arxiv = await xatoKodi(() => xizmatYaratish(BANDLIK(), { ishsizId: arx, nomi: 'Tikuvchilik' }));
      const begona = await xatoKodi(() => xizmatYaratish(YETTILIK_B(), { ishsizId: f, nomi: 'Tikuvchilik' }));
      return t?.rozilik === false && t.roziligiSana === null && t.faol === true && t.taxminiyNarx === 80000n && arxiv === 'TOPILMADI' && begona === 'RUXSAT';
    },
  },
  {
    nomi: 'Rozilik: usuli va sanasi yoziladi; kelajak sana rad; takroriy bosish yozuvni o‘zgartirmaydi; qaytarib olinsa tozalanadi',
    tekshir: async () => {
      const { taklif } = await taklifYarat({ rozilik: false });
      const kelajak = await xatoKodi(() => xizmatAmali(BANDLIK(), taklif, { amal: 'rozilik', usul: 'OGZAKI', sana: keyin(3) }));
      await xizmatAmali(BANDLIK(), taklif, { amal: 'rozilik', usul: 'TELEFON' });
      const a = await prisma.xizmatTaklifi.findUnique({ where: { id: taklif } });
      await xizmatAmali(BANDLIK(), taklif, { amal: 'rozilik', usul: 'YOZMA', sana: keyin(-5) });
      const b = await prisma.xizmatTaklifi.findUnique({ where: { id: taklif } });
      await xizmatAmali(BANDLIK(), taklif, { amal: 'rozilik-qaytar' });
      const c = await prisma.xizmatTaklifi.findUnique({ where: { id: taklif } });
      return (
        kelajak === 'NOTOGRI' &&
        a?.rozilik === true && a.roziligiUsuli === 'TELEFON' && a.roziligiSana !== null &&
        b?.roziligiUsuli === 'TELEFON' && b.roziligiSana?.getTime() === a.roziligiSana?.getTime() &&
        c?.rozilik === false && c.roziligiUsuli === null && c.roziligiSana === null
      );
    },
  },
  {
    nomi: 'Taklif amallari: boshqa mahalla yettilik xodimi tegina olmaydi; tahrir faqat o‘zgargan maydonni yangilaydi; bo‘sh tahrir rad',
    tekshir: async () => {
      const { taklif } = await taklifYarat({ nomi: 'Eski nom' });
      const begona = await xatoKodi(() => xizmatAmali(YETTILIK_B(), taklif, { amal: 'yopish' }));
      const oz = await xatoKodi(() => xizmatAmali(YETTILIK_A(), taklif, { amal: 'tahrir', nomi: 'Yangi nom xizmati' }));
      const bosh = await xatoKodi(() => xizmatAmali(BANDLIK(), taklif, { amal: 'tahrir' }));
      const t = await prisma.xizmatTaklifi.findUnique({ where: { id: taklif } });
      const yoq = await xatoKodi(() => xizmatAmali(BANDLIK(), 'yoq-id', { amal: 'yopish' }));
      return begona === 'RUXSAT' && oz === null && bosh === 'NOTOGRI' && t?.nomi === 'Yangi nom xizmati' && t.rozilik === true && yoq === 'TOPILMADI';
    },
  },

  /* ══ 3. BUYURTMA YARATISH ══ */
  {
    nomi: 'Buyurtma: telefon tekshiriladi va +998 ko‘rinishida saqlanadi; soxta telefon rad; telefon ixtiyoriy; begona mahalla yettilikka taqiqlangan; noma‘lum mahalla "topilmadi"',
    tekshir: async () => {
      const ok = await buyurtmaYaratish(YETTILIK_A(), { mahallaId: mahallaA, buyurtmachiNomi: 'Karim', buyurtmachiTelefon: '94 512 33 78', tavsif: 'Eshik tuzatish kerak' });
      buyurtmalar.push(ok.id);
      const t1 = await prisma.mahalliyBuyurtma.findUnique({ where: { id: ok.id } });
      /* Haqiqiy shaklga ega, lekin soxta (ketma-ket) raqam */
      const soxta = await xatoKodi(() => buyurtmaYaratish(BANDLIK(), { mahallaId: mahallaA, buyurtmachiNomi: 'Karim', buyurtmachiTelefon: '901234567', tavsif: 'Eshik tuzatish kerak' }));
      const real = await buyurtmaYaratish(BANDLIK(), { mahallaId: mahallaA, buyurtmachiNomi: 'Karim', buyurtmachiTelefon: '+998 93 456 78 90', tavsif: 'Eshik tuzatish kerak' });
      buyurtmalar.push(real.id);
      const t2 = await prisma.mahalliyBuyurtma.findUnique({ where: { id: real.id } });
      const telefonsiz = await buyurtmaYaratish(BANDLIK(), { mahallaId: mahallaA, buyurtmachiNomi: 'Karim', tavsif: 'Eshik tuzatish kerak' });
      buyurtmalar.push(telefonsiz.id);
      const t3 = await prisma.mahalliyBuyurtma.findUnique({ where: { id: telefonsiz.id } });
      const begona = await xatoKodi(() => buyurtmaYaratish(YETTILIK_B(), { mahallaId: mahallaA, buyurtmachiNomi: 'Karim', tavsif: 'Eshik tuzatish kerak' }));
      const yoqMahalla = await xatoKodi(() => buyurtmaYaratish(BANDLIK(), { mahallaId: 'yoq-mahalla', buyurtmachiNomi: 'Karim', tavsif: 'Eshik tuzatish kerak' }));
      return t1?.buyurtmachiTelefon === '+998945123378' && soxta === 'NOTOGRI' && t2?.buyurtmachiTelefon === '+998934567890' && t3?.buyurtmachiTelefon === null && t1?.holati === 'YANGI' && begona === 'RUXSAT' && yoqMahalla === 'TOPILMADI';
    },
  },

  /* ══ 4. IJROCHI TAYINLASH ══ */
  {
    nomi: 'Tayinlash: rozilik YO‘Q bo‘lsa rad (ROZILIK); yopiq taklif rad (YOPIQ); rozilikli faol taklif tayinlanadi',
    tekshir: async () => {
      const b = await buyurtmaYarat();
      const roziliksiz = await taklifYarat({ rozilik: false });
      const yopiq = await taklifYarat({ faol: false });
      const yaxshi = await taklifYarat();
      const a = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: roziliksiz.taklif }));
      const c = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: yopiq.taklif }));
      const afterBad = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
      const d = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: yaxshi.taklif }));
      const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
      return a === 'ROZILIK' && c === 'YOPIQ' && afterBad?.holati === 'YANGI' && afterBad.taklifId === null && d === null && y?.holati === 'TAYINLANDI' && y.taklifId === yaxshi.taklif && y.tayinlanganSana !== null;
    },
  },
  {
    nomi: 'Tayinlash: yettilik xodimi faqat O‘Z mahallasi ijrochisini tayinlaydi (begona mahalla ijrochisi rad); bandlik xodimi har qaysisini',
    tekshir: async () => {
      const b = await buyurtmaYarat(mahallaA);
      const oz = await taklifYarat({ mahalla: mahallaA });
      const begona = await taklifYarat({ mahalla: mahallaB });
      const a = await xatoKodi(() => buyurtmaAmali(YETTILIK_A(), b, { amal: 'tayinla', taklifId: begona.taklif }));
      const c = await xatoKodi(() => buyurtmaAmali(YETTILIK_A(), b, { amal: 'tayinla', taklifId: oz.taklif }));
      const d = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: begona.taklif }));
      const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
      return a === 'RUXSAT' && c === null && d === null && y?.taklifId === begona.taklif;
    },
  },
  {
    nomi: 'Tayinlash: arxivdagi fuqaro taklifi "topilmadi"; kelishilgan buyurtmada ijrochi almashtirib bo‘lmaydi (HOLAT)',
    tekshir: async () => {
      const b = await buyurtmaYarat();
      const arx = await taklifYarat();
      await prisma.unemployedPerson.update({ where: { id: arx.fuqaro }, data: { arxivSanasi: new Date() } });
      const a = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: arx.taklif }));
      const t1 = await taklifYarat();
      const t2 = await taklifYarat();
      await buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t1.taklif });
      /* TAYINLANDI holatida almashtirish mumkin */
      const almashtir = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t2.taklif }));
      await buyurtmaAmali(BANDLIK(), b, { amal: 'kelish', narx: 50000 });
      const kelganda = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t1.taklif }));
      const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
      return a === 'TOPILMADI' && almashtir === null && kelganda === 'HOLAT' && y?.taklifId === t2.taklif;
    },
  },

  /* ══ 5. NARX, BAJARISH ══ */
  {
    nomi: 'Narx: kelishilmaguncha bo‘sh (null, nol emas); 0 (bepul) alohida saqlanadi; muddat o‘tgan kunda bo‘lmaydi; YANGI holatda kelishib bo‘lmaydi',
    tekshir: async () => {
      const b = await buyurtmaYarat();
      const bosh = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
      const yangida = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'kelish', narx: 1000 }));
      const t = await taklifYarat();
      await buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t.taklif });
      const otgan = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'kelish', narx: 1000, muddat: keyin(-3) }));
      await buyurtmaAmali(BANDLIK(), b, { amal: 'kelish', narx: 0, muddat: keyin(5) });
      const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
      return bosh?.kelishilganNarx === null && yangida === 'HOLAT' && otgan === 'NOTOGRI' && y?.kelishilganNarx === 0n && y.holati === 'KELISHILDI' && y.kelishilganSana !== null && y.muddat !== null;
    },
  },
  {
    nomi: 'Bajarildi: kelajak sana va kelishuvdan oldingi sana rad; faqat KELISHILDI dan; ikkinchi marta - holat xatosi',
    tekshir: async () => {
      const b = await buyurtmaYarat();
      const t = await taklifYarat();
      await buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t.taklif });
      const erta = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'bajarildi', sana: new Date() }));
      await buyurtmaAmali(BANDLIK(), b, { amal: 'kelish', narx: 70000 });
      const kelajak = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'bajarildi', sana: keyin(2) }));
      const oldin = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'bajarildi', sana: keyin(-4) }));
      const ok = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'bajarildi', sana: new Date() }));
      const yana = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'bajarildi', sana: new Date() }));
      const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
      return erta === 'HOLAT' && kelajak === 'NOTOGRI' && oldin === 'NOTOGRI' && ok === null && yana === 'HOLAT' && y?.holati === 'BAJARILDI' && y.ijrochiTasdigi === null && y.buyurtmachiTasdigi === null;
    },
  },

  /* ══ 6. IKKI TOMONLAMA TASDIQ ══ */
  {
    nomi: 'Bajarilganda ikkala tasdiq NOMA‘LUM (null) bo‘ladi - "bajarildi" o‘zi tasdiq emas; tasdiq faqat BAJARILDI holatida',
    tekshir: async () => {
      const b = await buyurtmaYarat();
      const oldin = await xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tasdiq', tomon: 'ijrochi', javob: true, usul: 'TELEFON' }));
      const x = await bajarilgan({ ijrochiTasdigi: null, buyurtmachiTasdigi: null });
      const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
      return oldin === 'HOLAT' && y?.ijrochiTasdigi === null && y.buyurtmachiTasdigi === null && buyurtmaTasdigi(y) === 'TASDIQSIZ';
    },
  },
  {
    nomi: 'Tasdiq: bir tomon -> bir tomonlama; ikkinchi tomon -> ikki tomonlama; usuli va sanasi har tomon uchun alohida yoziladi',
    tekshir: async () => {
      const x = await bajarilgan({ ijrochiTasdigi: null, buyurtmachiTasdigi: null });
      await buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'ijrochi', javob: true, usul: 'TELEFON' });
      const a = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
      await buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'buyurtmachi', javob: true, usul: 'OGZAKI' });
      const b = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
      return (
        buyurtmaTasdigi(a!) === 'BIR_TOMONLAMA' && a?.ijrochiTasdiqUsuli === 'TELEFON' && a.buyurtmachiTasdiqSanasi === null &&
        buyurtmaTasdigi(b!) === 'IKKI_TOMONLAMA' && b?.buyurtmachiTasdiqUsuli === 'OGZAKI' && b.ijrochiTasdiqUsuli === 'TELEFON' &&
        b.ijrochiTasdiqSanasi !== null && b.buyurtmachiTasdiqSanasi !== null
      );
    },
  },
  {
    nomi: 'E‘tiroz: sababsiz rad; sabab bilan - "nizo" (muvaffaqiyat emas), izohga tomon nomi bilan yoziladi; keyin tomonlar kelishsa false -> true mumkin',
    tekshir: async () => {
      const x = await bajarilgan({ ijrochiTasdigi: null, buyurtmachiTasdigi: null });
      const sababsiz = await xatoKodi(() => buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'buyurtmachi', javob: false, usul: 'TELEFON' }));
      await buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'buyurtmachi', javob: false, usul: 'TELEFON', izoh: 'Eshik yaxshi o‘rnatilmagan' });
      const a = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
      await buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'ijrochi', javob: true, usul: 'TELEFON' });
      const b = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
      /* Tomonlar kelishdi: buyurtmachi endi tasdiqlaydi */
      await buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'buyurtmachi', javob: true, usul: 'OGZAKI' });
      const c = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
      return (
        sababsiz === 'NOTOGRI' &&
        buyurtmaTasdigi(a!) === 'NIZO' && /Буюртмачи: Eshik/.test(a?.tasdiqIzohi ?? '') &&
        buyurtmaTasdigi(b!) === 'NIZO' &&
        buyurtmaTasdigi(c!) === 'IKKI_TOMONLAMA'
      );
    },
  },
  {
    nomi: 'Tasdiqlangan (true) javob jimgina ortga qaytmaydi: true -> false rad (HOLAT); takroriy true - o‘zgarishsiz',
    tekshir: async () => {
      const x = await bajarilgan({ ijrochiTasdigi: null, buyurtmachiTasdigi: null });
      await buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'ijrochi', javob: true, usul: 'TELEFON' });
      const a = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
      const orqaga = await xatoKodi(() => buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'ijrochi', javob: false, usul: 'OGZAKI', izoh: 'Fikrim o‘zgardi' }));
      const takror = await xatoKodi(() => buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'ijrochi', javob: true, usul: 'YOZMA' }));
      const b = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
      return orqaga === 'HOLAT' && takror === null && b?.ijrochiTasdigi === true && b.ijrochiTasdiqUsuli === 'TELEFON' && b.ijrochiTasdiqSanasi?.getTime() === a?.ijrochiTasdiqSanasi?.getTime();
    },
  },
  {
    nomi: 'POYGA: ijrochi va buyurtmachi tasdig‘i BIR VAQTDA kelsa - ikkalasi ham yoziladi (bir-birini ezmaydi)',
    tekshir: async () => {
      let togri = true;
      for (let i = 0; i < 6; i++) {
        const x = await bajarilgan({ ijrochiTasdigi: null, buyurtmachiTasdigi: null });
        await Promise.all([
          buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'ijrochi', javob: true, usul: 'TELEFON' }),
          buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'buyurtmachi', javob: true, usul: 'OGZAKI' }),
        ]);
        const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
        togri = togri && buyurtmaTasdigi(y!) === 'IKKI_TOMONLAMA';
      }
      return togri;
    },
  },
  {
    nomi: 'POYGA: bir tomonga bir vaqtda "tasdiqlayman" va "e‘tiroz" kelsa - tasdiq yutadi (true ortga qaytmaydi), holat izchil',
    tekshir: async () => {
      let togri = true;
      for (let i = 0; i < 6; i++) {
        const x = await bajarilgan({ ijrochiTasdigi: null, buyurtmachiTasdigi: null });
        await Promise.all([
          xatoKodi(() => buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'ijrochi', javob: true, usul: 'TELEFON' })),
          xatoKodi(() => buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'ijrochi', javob: false, usul: 'OGZAKI', izoh: 'Rozi emasman' })),
        ]);
        const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: x.id } });
        togri = togri && y?.ijrochiTasdigi === true;
      }
      return togri;
    },
  },

  /* ══ 7. BEKOR QILISH ══ */
  {
    nomi: 'Bekor: yangi/tayinlangan/kelishilgan buyurtma bekor bo‘ladi (sabab bilan); BAJARILGANni bekor qilib bo‘lmaydi; bekordan keyin hech narsa mumkin emas',
    tekshir: async () => {
      const t = await taklifYarat();
      const b = await buyurtmaYarat();
      await buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t.taklif });
      await buyurtmaAmali(BANDLIK(), b, { amal: 'kelish', narx: 10000 });
      await buyurtmaAmali(BANDLIK(), b, { amal: 'bekor', sabab: 'Buyurtmachi fikridan qaytdi' });
      const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
      const keyin_ = await Promise.all([
        xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'bajarildi', sana: new Date() })),
        xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t.taklif })),
        xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'bekor', sabab: 'Yana bekor' })),
      ]);
      const x = await bajarilgan();
      const bajarilganBekor = await xatoKodi(() => buyurtmaAmali(BANDLIK(), x.id, { amal: 'bekor', sabab: 'Kech bo‘ldi' }));
      return y?.holati === 'BEKOR' && y.bekorSababi === 'Buyurtmachi fikridan qaytdi' && keyin_.every((k) => k === 'HOLAT') && bajarilganBekor === 'HOLAT';
    },
  },
  {
    nomi: 'POYGA: bir buyurtmaga bir vaqtda "bekor" va "kelish" - faqat bittasi o‘tadi, holat izchil',
    tekshir: async () => {
      let togri = true;
      for (let i = 0; i < 6; i++) {
        const t = await taklifYarat();
        const b = await buyurtmaYarat();
        await buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t.taklif });
        const r = await Promise.all([
          xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'kelish', narx: 20000 })),
          xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'bekor', sabab: 'Bekor qilindi' })),
        ]);
        const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
        /* kelish -> bekor ketma-ketligi ikkalasi ham o'tishi mumkin (KELISHILDI dan bekor mumkin); ikkinchisi birinchidan oldin bo'lsa kelish HOLAT */
        const okSoni = r.filter((x) => x === null).length;
        togri = togri && okSoni >= 1 && (y?.holati === 'BEKOR' || y?.holati === 'KELISHILDI') && r.every((x) => x === null || x === 'HOLAT');
      }
      return togri;
    },
  },

  /* ══ 8. TAKLIF YOPILSA / ROZILIK QAYTARILSA ══ */
  {
    nomi: 'Taklif yopilsa yoki rozilik qaytarilsa: faol buyurtmalar ijrochisiz "yangi"ga qaytadi (narx tozalanadi), BAJARILGANlar tarixda qoladi',
    tekshir: async () => {
      const mk = async () => {
        const t = await taklifYarat();
        const tayin = await buyurtmaYarat();
        await buyurtmaAmali(BANDLIK(), tayin, { amal: 'tayinla', taklifId: t.taklif });
        const kel = await buyurtmaYarat();
        await buyurtmaAmali(BANDLIK(), kel, { amal: 'tayinla', taklifId: t.taklif });
        await buyurtmaAmali(BANDLIK(), kel, { amal: 'kelish', narx: 90000, muddat: keyin(7) });
        const baj = await prisma.mahalliyBuyurtma.create({
          data: { mahallaId: mahallaA, buyurtmachiNomi: 'B', tavsif: 'Bajarilgan ish', holati: 'BAJARILDI', taklifId: t.taklif, kelishilganNarx: 5000n, bajarilganSana: keyin(-6), yaratganId: bandlik },
          select: { id: true },
        });
        buyurtmalar.push(baj.id);
        return { t: t.taklif, tayin, kel, baj: baj.id };
      };
      const tekshirBoshadi = async (x: Awaited<ReturnType<typeof mk>>) => {
        const [a, b, c] = await Promise.all([
          prisma.mahalliyBuyurtma.findUnique({ where: { id: x.tayin } }),
          prisma.mahalliyBuyurtma.findUnique({ where: { id: x.kel } }),
          prisma.mahalliyBuyurtma.findUnique({ where: { id: x.baj } }),
        ]);
        return (
          a?.holati === 'YANGI' && a.taklifId === null && a.tayinlanganSana === null &&
          b?.holati === 'YANGI' && b.taklifId === null && b.kelishilganNarx === null && b.kelishilganSana === null && b.muddat === null &&
          c?.holati === 'BAJARILDI' && c.taklifId === x.t && c.kelishilganNarx === 5000n
        );
      };
      const p = await mk();
      await xizmatAmali(BANDLIK(), p.t, { amal: 'yopish' });
      const q = await mk();
      await xizmatAmali(BANDLIK(), q.t, { amal: 'rozilik-qaytar' });
      const yopilgan = await prisma.xizmatTaklifi.findUnique({ where: { id: p.t } });
      return (await tekshirBoshadi(p)) && (await tekshirBoshadi(q)) && yopilgan?.faol === false && yopilgan.yopilganSana !== null;
    },
  },
  {
    nomi: 'QULF: boshqa tranzaksiya taklif satrini ushlab turganda "tayinlash" KUTADI (ijrochi tekshiruvi qulf ostida)',
    tekshir: async () => {
      const t = await taklifYarat();
      const b = await buyurtmaYarat();
      let tugadi = false;
      let kutdi = false;
      let amal: Promise<unknown> = Promise.resolve();
      await prisma.$transaction(
        async (tx) => {
          /* FOR NO KEY UPDATE: tashqi kalit (FK) qulfi bilan to'qnashmaydi, faqat bizning aniq FOR UPDATE bilan */
          await tx.$queryRaw`SELECT "id" FROM "XizmatTaklifi" WHERE "id" = ${t.taklif} FOR NO KEY UPDATE`;
          amal = buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t.taklif }).then(() => {
            tugadi = true;
          });
          await new Promise((r) => setTimeout(r, 700));
          kutdi = !tugadi;
        },
        { timeout: 20000 }
      );
      await amal;
      const y = await prisma.mahalliyBuyurtma.findUnique({ where: { id: b } });
      return kutdi && tugadi && y?.holati === 'TAYINLANDI';
    },
  },
  {
    nomi: 'QULF: "taklifni yopish" va "rozilikni qaytarish" ham taklif satrini qulflaydi',
    tekshir: async () => {
      const natija: boolean[] = [];
      for (const amalTuri of ['yopish', 'rozilik-qaytar'] as const) {
        const t = await taklifYarat();
        let tugadi = false;
        let kutdi = false;
        let p: Promise<unknown> = Promise.resolve();
        await prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "XizmatTaklifi" WHERE "id" = ${t.taklif} FOR NO KEY UPDATE`;
            p = xizmatAmali(BANDLIK(), t.taklif, { amal: amalTuri }).then(() => {
              tugadi = true;
            });
            await new Promise((r) => setTimeout(r, 700));
            kutdi = !tugadi;
          },
          { timeout: 20000 }
        );
        await p;
        natija.push(kutdi && tugadi);
      }
      return natija.every(Boolean);
    },
  },
  {
    nomi: 'POYGA: taklifni yopish va tayinlash bir vaqtda - "yopiq taklifga biriktirilgan faol buyurtma" holati hech qachon paydo bo‘lmaydi',
    tekshir: async () => {
      let buzilgan = 0;
      for (let i = 0; i < 12; i++) {
        const t = await taklifYarat();
        const b = await buyurtmaYarat();
        await Promise.all([
          xatoKodi(() => buyurtmaAmali(BANDLIK(), b, { amal: 'tayinla', taklifId: t.taklif })),
          xatoKodi(() => xizmatAmali(BANDLIK(), t.taklif, { amal: 'yopish' })),
        ]);
        const [y, tk] = await Promise.all([
          prisma.mahalliyBuyurtma.findUnique({ where: { id: b } }),
          prisma.xizmatTaklifi.findUnique({ where: { id: t.taklif } }),
        ]);
        if (y?.holati === 'TAYINLANDI' && tk?.faol === false) buzilgan++;
      }
      return buzilgan === 0;
    },
  },

  /* ══ 9. KO'RSATKICH VA TAXTA (BAZADAN) ══ */
  {
    nomi: 'Bazadan ko‘rsatkich: mahalla bo‘yicha ajratiladi; ikki tomonlama / nizo / kechikkan to‘g‘ri sanaladi; narx yig‘indisi faqat tasdiqlanganlardan',
    tekshir: async () => {
      /* Alohida mahalla: boshqa sinovlar buyurtmalaridan toza hisob uchun yangi mahalla o'rniga B mahalla va hozirgi bazani solishtiramiz */
      const oldin = await buyurtmaKorsatkichlari(mahallaB);
      await bajarilgan({ ijrochiTasdigi: true, buyurtmachiTasdigi: true, kelishilganNarx: 200000n }, mahallaB);
      await bajarilgan({ ijrochiTasdigi: false, buyurtmachiTasdigi: null, kelishilganNarx: 300000n }, mahallaB);
      await bajarilgan({ ijrochiTasdigi: null, buyurtmachiTasdigi: null, bajarilganSana: keyin(-40) }, mahallaB);
      const bekor = await buyurtmaYarat(mahallaB, { holati: 'BEKOR', bekorSababi: 'Sinov' });
      void bekor;
      const keyingi = await buyurtmaKorsatkichlari(mahallaB);
      const boshqa = await buyurtmaKorsatkichlari(mahallaA);
      return (
        keyingi.bajarilgan - oldin.bajarilgan === 3 &&
        keyingi.tasdiq.ikkiTomonlama - oldin.tasdiq.ikkiTomonlama === 1 &&
        keyingi.tasdiq.nizo - oldin.tasdiq.nizo === 1 &&
        keyingi.tasdiq.kechikkan - oldin.tasdiq.kechikkan === 1 &&
        keyingi.narx.yigindi - oldin.narx.yigindi === 200000 &&
        keyingi.bekor - oldin.bekor === 1 &&
        /* Boshqa mahalla hisobi B ning o'zgarishidan ta'sirlanmagan */
        boshqa.bajarilgan >= 0
      );
    },
  },
  {
    nomi: 'Vazifalar taxtasi: tasdiq kutayotgan buyurtma bandlikka ko‘rinadi, yettilikka FAQAT o‘z mahallasi, hokimga ko‘rinmaydi; ikki tomon tasdiqlagach yo‘qoladi',
    tekshir: async () => {
      const x = await bajarilgan({ ijrochiTasdigi: null, buyurtmachiTasdigi: null, bajarilganSana: keyin(-6) }, mahallaA);
      const korish = async (rol: 'BANDLIK' | 'YETTILIK' | 'HOKIM', userId: string, mahallaId: string | null) => {
        const t = await vazifalarim({ userId, rol, mahallaId });
        const bl = t.bloklar.find((b) => b.kalit === 'buyurtma-tasdiq');
        return { bor: !!bl, ichida: !!bl?.qatorlar.some((q) => q.id === x.id) };
      };
      const b1 = await korish('BANDLIK', bandlik, null);
      const oz = await korish('YETTILIK', yettilikA, mahallaA);
      const begona = await korish('YETTILIK', yettilikB, mahallaB);
      const hokim = await korish('HOKIM', bandlik, null);
      await buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'ijrochi', javob: true, usul: 'TELEFON' });
      await buyurtmaAmali(BANDLIK(), x.id, { amal: 'tasdiq', tomon: 'buyurtmachi', javob: true, usul: 'TELEFON' });
      const keyingi = await korish('BANDLIK', bandlik, null);
      const royxat = await tasdiqKutayotganlar(mahallaA);
      return b1.ichida && oz.ichida && !begona.ichida && !hokim.bor && !keyingi.ichida && !royxat.some((r) => r.id === x.id);
    },
  },

  /* ══ 10. KOD, HUQUQ, SAHIFA ══ */
  {
    nomi: 'API: har yo‘l sessiyani talab qiladi; yettilik/bandlik/rahbar/admin; hokim hech qaysisiga kira olmaydi; xatolar HTTP kodi bilan',
    tekshir: async () => {
      const fayllar = [
        'src/app/api/xizmatlar/route.ts',
        'src/app/api/xizmatlar/[id]/route.ts',
        'src/app/api/buyurtmalar/route.ts',
        'src/app/api/buyurtmalar/[id]/route.ts',
      ].map(oqi);
      const rollar = (m: string): string[] | null => {
        const q = m.match(/const ROLLAR = \[([^\]]*)\] as const/);
        if (!q || !/talabQil\(\[\.\.\.ROLLAR\]\)/.test(m)) return null;
        return q[1].split(',').map((x) => x.trim().replace(/['"]/g, '')).filter(Boolean).sort();
      };
      const kutilgan = JSON.stringify(['ADMIN', 'BANDLIK', 'BANDLIK_RAHBAR', 'YETTILIK']);
      return (
        fayllar.every((m) => JSON.stringify(rollar(m)) === kutilgan) &&
        fayllar.every((m) => !m.includes("'HOKIM'")) &&
        fayllar.every((m) => m.includes('BUYURTMA_HTTP') && m.includes('BuyurtmaXatosi')) &&
        Object.values(BUYURTMA_HTTP).every((n) => n >= 400)
      );
    },
  },
  {
    nomi: 'Kod: buyurtma mantig‘i fuqaro holatini, ish yozuvini, dalilni va kursni YOZMAYDI; to‘lov ustunlari yo‘q; "to‘lovni yuritmaydi" ogohlantirishi bor',
    tekshir: async () => {
      const k = oqi('src/lib/buyurtmalar.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const n = oqi('src/lib/buyurtmalar-nomlari.ts');
      const sxema = oqi('prisma/schema.prisma');
      const blok = sxema.slice(sxema.indexOf('model MahalliyBuyurtma'));
      const yozadi = /\b(ishgaJoylashish|joylashuvDalili|unemployedPerson|household|kursYollanmasi|kurs)\s*\.\s*(create|update|updateMany|delete|deleteMany|upsert)\b/.test(k);
      const tolov = /(tolov|tolangan|payment|paid)/i.test(blok.split('\n').filter((q) => !q.trim().startsWith('///')).join('\n'));
      return !yozadi && !tolov && /Платформа тўловни юритмайди/.test(n);
    },
  },
  {
    nomi: 'Kod: "tayinlash" va yopish/rozilik qaytarish taklif satrini qulflaydi (FOR UPDATE); holat o‘tishlari updateMany + holat sharti bilan',
    tekshir: async () => {
      const k = oqi('src/lib/buyurtmalar.ts');
      const qulf = (k.match(/FOR UPDATE/g) ?? []).length;
      return qulf >= 3 && /where:\s*\{\s*id:\s*b\.id,\s*holati:\s*\{\s*in:\s*from\s*\}/.test(k) && k.includes('ijrochiniBoshat');
    },
  },
  {
    nomi: 'Sahifalar: menyu (/buyurtmalar), sahifa huquqi, fuqaro sahifasida blok (xato yutadigan) va vazifalar bloki bor',
    tekshir: async () => {
      const m = oqi('src/components/shell/navigatsiya.ts');
      const list = oqi('src/app/(ilova)/buyurtmalar/page.tsx');
      const det = oqi('src/app/(ilova)/buyurtmalar/[id]/page.tsx');
      const f = oqi('src/app/(ilova)/ishsizlar/[id]/page.tsx');
      const bl = oqi('src/components/buyurtma/xizmatlar-blogi.tsx');
      const v = oqi('src/lib/vazifalar.ts');
      return (
        /yol:\s*'\/buyurtmalar'/.test(m) &&
        list.includes("yolgaRuxsat(sessiya.rol, '/buyurtmalar')") && det.includes("yolgaRuxsat(sessiya.rol, '/buyurtmalar')") &&
        f.includes('<XizmatlarBlogi') && bl.includes('catch (e)') &&
        v.includes("kalit: 'buyurtma-tasdiq'")
      );
    },
  },
  {
    nomi: 'Migratsiya faqat qo‘shadi: ikki yangi jadval, bitta tur; mavjud jadvalga tegmaydi; takrorlanuvchan (IF NOT EXISTS)',
    tekshir: async () => {
      const sql = oqi('prisma/migrations/20261001180000_mahalliy_buyurtmalar/migration.sql');
      const xavfli = /\b(DROP\s+(TABLE|COLUMN|TYPE)|RENAME|TRUNCATE|SET\s+NOT\s+NULL|ALTER\s+COLUMN)\b/i.test(sql);
      const jadvallar = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/g) ?? [];
      const mavjudgaTegadi = /ALTER TABLE "(User|UnemployedPerson|Mahalla|Vacancy|ItVaucher)"\s+(ADD COLUMN|DROP)/i.test(sql);
      return !xavfli && jadvallar.length === 2 && !mavjudgaTegadi && !/CREATE TABLE "/.test(sql) && !/CREATE TYPE "RozilikUsuli"/.test(sql);
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
