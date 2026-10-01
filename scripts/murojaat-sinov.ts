/**
 * ============================================================
 *  MUROJAATLAR (XODIM QAYD ETADI) — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/murojaat-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *   1. MUDDATI O'TGAN MUROJAAT KO'RINMASA - fuqaro javob kutib qoladi, hech
 *      kim bilmaydi.
 *
 *   2. MUDDAT JIMGINA QISQARTIRILSA/UZAYTIRILSA - "vaqtida javob berildi"
 *      degan hisob soxta bo'ladi; sabab va tarix yo'qoladi.
 *
 *   3. QAYTA OCHILGAN MUROJAAT OLDINGI NATIJASINI YO'QOTSA - nega qayta
 *      ochilgani va avval nima javob berilgani bilib bo'lmaydi.
 *
 *   4. BEGONA MAHALLA XODIMI MUROJAATNI KO'RSA/O'ZGARTIRSA - fuqaroning
 *      shikoyati va telefoni boshqa mahalla xodimiga ochiladi.
 *
 *   5. HOLAT O'ZGARISHI TARIXSIZ BO'LSA yoki parallel bosishda ikki marta
 *      yozilsa.
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
  MAKS_ESKI_KUN,
  MAKS_MUDDAT_KUNI,
  MUROJAAT_HTTP,
  MurojaatAmaliSxemasi,
  MurojaatXatosi,
  MurojaatYaratishSxemasi,
  murojaatAmali,
  murojaatKorsatkichlari,
  murojaatKorsatkichlarniHisobla,
  murojaatYaratish,
  murojaatniTekshir,
  muddatHolati,
  muddatidaJavobmi,
  muddatliMurojaatlar,
  murojaatFoizi,
  type MurojaatMetrika,
} from '../src/lib/murojaatlar';

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
let yettilikA2 = '';
let yettilikB = '';
const fuqarolar: string[] = [];
const xodimlar: string[] = [];
const murojaatlar: string[] = [];

const kim = (rol: 'BANDLIK' | 'YETTILIK', userId: string, mahallaId: string | null) => ({ rol, userId, mahallaId });
const BANDLIK = () => kim('BANDLIK', bandlik, null);
const YETTILIK_A = () => kim('YETTILIK', yettilikA, mahallaA);
const YETTILIK_B = () => kim('YETTILIK', yettilikB, mahallaB);

async function tayyorla() {
  const m = await prisma.mahalla.findMany({ take: 2, select: { id: true } });
  if (m.length < 2) throw new Error('Sinov uchun ikkita mahalla kerak — `prisma db seed`');
  mahallaA = m[0].id;
  mahallaB = m[1].id;
  const mk = async (nom: string, rol: 'BANDLIK' | 'YETTILIK', mahallaId?: string, faol = true) => {
    const x = await prisma.user.create({
      data: { username: noyob(nom).replace(/\s/g, '_'), fullName: nom, passwordHash: 'x', rol, mahallaId: mahallaId ?? null, faol },
      select: { id: true },
    });
    xodimlar.push(x.id);
    return x.id;
  };
  bandlik = await mk('Sinov murojaat bandlik', 'BANDLIK');
  yettilikA = await mk('Sinov murojaat yettilik A', 'YETTILIK', mahallaA);
  yettilikA2 = await mk('Sinov murojaat yettilik A2', 'YETTILIK', mahallaA);
  yettilikB = await mk('Sinov murojaat yettilik B', 'YETTILIK', mahallaB);
}

async function tozala() {
  await prisma.murojaat.deleteMany({ where: { OR: [{ id: { in: murojaatlar } }, { yaratganId: { in: xodimlar } }] } });
  await prisma.unemployedPerson.deleteMany({ where: { id: { in: fuqarolar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
}

async function fuqaroYarat(mahalla = mahallaA, q: Record<string, unknown> = {}) {
  const f = await prisma.unemployedPerson.create({
    data: {
      fish: noyob('Murojaat Sinov'),
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

const asos = (q: Record<string, unknown> = {}) => ({
  mahallaId: mahallaA,
  murojaatchiNomi: 'Karim Aliyev',
  kanal: 'QABULXONA' as const,
  tavsif: noyob('Ish topishda yordam kerak'),
  qabulVaqti: new Date(),
  javobMuddati: keyin(15),
  ...q,
});

/** To'g'ridan-to'g'ri bazaga: istalgan holatda */
async function murojaatBaza(q: Record<string, unknown> = {}) {
  const m = await prisma.murojaat.create({
    data: {
      raqami: `T-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      mahallaId: mahallaA,
      murojaatchiNomi: 'Sinov',
      kanal: 'TELEFON',
      tavsif: noyob('Sinov murojaati'),
      qabulVaqti: keyin(-10),
      masulId: yettilikA,
      javobMuddati: keyin(5),
      yaratganId: bandlik,
      ...q,
    },
    select: { id: true },
  });
  murojaatlar.push(m.id);
  return m.id;
}

const yarat = async (q: Record<string, unknown> = {}, k = BANDLIK()) => {
  const r = await murojaatYaratish(k, MurojaatYaratishSxemasi.parse(asos(q)));
  murojaatlar.push(r.id);
  return r;
};

const xatoKodi = async (f: () => Promise<unknown>): Promise<string | null> => {
  try {
    await f();
    return null;
  } catch (e) {
    return e instanceof MurojaatXatosi ? e.kod : `BOSHQA:${(e as Error).message.slice(0, 90)}`;
  }
};

const my = (q: Partial<MurojaatMetrika> = {}): MurojaatMetrika => ({
  holati: 'JAVOB_BERILDI',
  qabulVaqti: keyin(-20),
  javobMuddati: keyin(-5),
  javobSanasi: keyin(-8),
  qaytaOchilganSoni: 0,
  uzaytirilgan: false,
  ...q,
});

const SINOVLAR: Sinov[] = [
  /* ══ 1. TOZA FUNKSIYALAR ══ */
  {
    nomi: 'Muddat holati: kechikkan (necha kun) / bugun / yaqin (1-3 kun) / muddatli; javob berilgan alohida; Toshkent kuni bo‘yicha',
    tekshir: async () => {
      const h = new Date();
      const m = (kun: number, holati: 'YANGI' | 'JARAYONDA' | 'JAVOB_BERILDI' = 'YANGI') => muddatHolati({ holati, javobMuddati: keyin(kun, h) }, h);
      /* 20:00 UTC = Toshkentda keyingi kun 01:00; muddat Toshkent kuni 12:00 */
      const hozir = new Date('2026-10-10T20:00:00Z');
      const bugun = muddatHolati({ holati: 'YANGI', javobMuddati: new Date('2026-10-11T07:00:00Z') }, hozir);
      const kecha = muddatHolati({ holati: 'JARAYONDA', javobMuddati: new Date('2026-10-10T07:00:00Z') }, hozir);
      return (
        m(-4).holat === 'KECHIKKAN' && m(-4).kun === 4 &&
        m(0).holat === 'BUGUN' &&
        m(1).holat === 'YAQIN' && m(3).holat === 'YAQIN' &&
        m(4).holat === 'MUDDATLI' && m(30).holat === 'MUDDATLI' &&
        m(-10, 'JAVOB_BERILDI').holat === 'JAVOB_BERILGAN' &&
        bugun.holat === 'BUGUN' && kecha.holat === 'KECHIKKAN' && kecha.kun === 1
      );
    },
  },
  {
    nomi: 'Muddatida javob: javob kuni muddat kunidan kech emas; javob yo‘q bo‘lsa null (nol emas)',
    tekshir: async () => {
      const h = new Date();
      const m = (javob: number | null, muddat: number) => muddatidaJavobmi({ javobSanasi: javob === null ? null : keyin(javob, h), javobMuddati: keyin(muddat, h) });
      return m(-3, -3) === true && m(-4, -3) === true && m(-2, -3) === false && m(null, -3) === null;
    },
  },
  {
    nomi: 'Ko‘rsatkich: holatlar, ochiqlarning muddati, javoblarning vaqtida/kechikib ulushi, uzaytirilganlar, mediana',
    tekshir: async () => {
      const h = new Date();
      const k = murojaatKorsatkichlarniHisobla(
        [
          my({ holati: 'YANGI', javobSanasi: null, javobMuddati: keyin(-2, h) }),
          my({ holati: 'JARAYONDA', javobSanasi: null, javobMuddati: keyin(0, h) }),
          my({ holati: 'JARAYONDA', javobSanasi: null, javobMuddati: keyin(2, h) }),
          my({ holati: 'YANGI', javobSanasi: null, javobMuddati: keyin(20, h) }),
          /* Vaqtida: javob muddatdan oldin */
          my({ qabulVaqti: keyin(-12, h), javobMuddati: keyin(-5, h), javobSanasi: keyin(-8, h) }),
          /* Vaqtida (muddat kuni) */
          my({ qabulVaqti: keyin(-10, h), javobMuddati: keyin(-4, h), javobSanasi: keyin(-4, h), uzaytirilgan: true }),
          /* Kechikib */
          my({ holati: 'YOPILDI', qabulVaqti: keyin(-30, h), javobMuddati: keyin(-15, h), javobSanasi: keyin(-10, h) }),
        ],
        h
      );
      return (
        k.jami === 7 && k.yangi === 2 && k.jarayonda === 2 && k.javobBerilgan === 2 && k.yopilgan === 1 &&
        k.muddat.kechikkan === 1 && k.muddat.bugun === 1 && k.muddat.yaqin === 1 &&
        k.javob.vaqtida === 2 && k.javob.kechikib === 1 && k.javob.uzaytirilgan === 1 &&
        /* kunlar: 4, 6, 20 -> mediana 6 */
        k.javob.medianaKun === 6
      );
    },
  },
  {
    nomi: 'Ko‘rsatkich: qayta ochilganlar ulushining maxraji - javob olganlar + hozir ochiq-u ilgari javob olganlar; bo‘sh ro‘yxatda xato yo‘q',
    tekshir: async () => {
      const k = murojaatKorsatkichlarniHisobla([
        my({ qaytaOchilganSoni: 2 }),
        my({ holati: 'YOPILDI', qaytaOchilganSoni: 0 }),
        my({ holati: 'JARAYONDA', javobSanasi: null, javobMuddati: keyin(5), qaytaOchilganSoni: 1 }),
        my({ holati: 'YANGI', javobSanasi: null, javobMuddati: keyin(5), qaytaOchilganSoni: 0 }),
      ]);
      const bosh = murojaatKorsatkichlarniHisobla([]);
      return (
        k.qaytaOchilgan.soni === 2 && k.qaytaOchilgan.jamiMarta === 3 && k.qaytaOchilgan.maxraj === 3 &&
        murojaatFoizi(2, 3) === 67 && murojaatFoizi(0, 0) === null &&
        bosh.jami === 0 && bosh.javob.medianaKun === null && bosh.qaytaOchilgan.maxraj === 0
      );
    },
  },
  {
    nomi: 'Sxemalar: qisqa tavsif, noma‘lum kanal, muddatsiz rad; amallar: javobda natija majburiy, muddatda sabab majburiy; noma‘lum amal rad',
    tekshir: async () => {
      const y = (q: Record<string, unknown>) => MurojaatYaratishSxemasi.safeParse({ ...asos({ mahallaId: 'm1' }), ...q }).success;
      const a = (q: Record<string, unknown>) => MurojaatAmaliSxemasi.safeParse(q).success;
      return (
        y({}) && !y({ tavsif: 'abc' }) && !y({ kanal: 'FAKS' }) && !y({ javobMuddati: undefined }) && !y({ qabulVaqti: 'kecha' }) &&
        !y({ murojaatchiNomi: 'A' }) && y({ ishsizId: 'k100_1' }) &&
        a({ amal: 'qabul' }) && a({ amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Ish topildi' }) &&
        !a({ amal: 'javob', natijaTuri: 'HAL_QILINDI' }) && !a({ amal: 'javob', natija: 'Ish topildi' }) &&
        !a({ amal: 'javob', natijaTuri: 'YOQ', natija: 'Ish topildi' }) &&
        !a({ amal: 'muddat', yangiMuddat: '2026-12-01' }) && a({ amal: 'muddat', yangiMuddat: '2026-12-01', sabab: 'Hujjat kutilmoqda' }) &&
        !a({ amal: 'qayta-ochish', sabab: 'x', yangiMuddat: '2026-12-01' }) && !a({ amal: 'qayta-ochish', sabab: 'Yangi holat' }) &&
        !a({ amal: 'yoq-amal' })
      );
    },
  },
  {
    nomi: 'Maydonlar orasidagi qoidalar: kelajak qabul, juda eski qabul, qabuldan oldingi muddat, juda uzoq muddat rad',
    tekshir: async () => {
      const h = new Date();
      const t = (qabul: number, muddat: number) => murojaatniTekshir({ qabulVaqti: keyin(qabul, h), javobMuddati: keyin(muddat, h) }, h);
      return (
        t(0, 15) === null && t(-5, 10) === null &&
        t(2, 15) !== null &&
        t(-MAKS_ESKI_KUN - 5, 10) !== null &&
        t(-2, -5) !== null &&
        t(0, MAKS_MUDDAT_KUNI + 5) !== null &&
        t(0, MAKS_MUDDAT_KUNI) === null &&
        /* Bugungi sana, muddat ham bugun: ruxsat */
        t(0, 0) === null
      );
    },
  },

  /* ══ 2. YARATISH ══ */
  {
    nomi: 'Yaratish: raqam M-YYYY-NNNN ketma-ket; tarixda "yaratildi"; mas‘ul berilmasa - qayd etgan xodim; telefon +998 ko‘rinishida; holati YANGI',
    tekshir: async () => {
      const a = await yarat({ murojaatchiTelefon: '94 512 33 78' }, YETTILIK_A());
      const b = await yarat({}, YETTILIK_A());
      const [x, y, tarix] = await Promise.all([
        prisma.murojaat.findUnique({ where: { id: a.id } }),
        prisma.murojaat.findUnique({ where: { id: b.id } }),
        prisma.murojaatTarixi.findMany({ where: { murojaatId: a.id } }),
      ]);
      const son = (r: string) => Number(r.split('-')[2]);
      return (
        /^M-\d{4}-\d{4}$/.test(a.raqami) && son(b.raqami) === son(a.raqami) + 1 &&
        x?.holati === 'YANGI' && x.masulId === yettilikA && x.yaratganId === yettilikA &&
        x.murojaatchiTelefon === '+998945123378' && y?.murojaatchiTelefon === null &&
        tarix.length === 1 && tarix[0].hodisa === 'YARATILDI' && tarix[0].kimId === yettilikA && tarix[0].holatga === 'YANGI' &&
        x.natijaTuri === null && x.natija === null && x.javobSanasi === null
      );
    },
  },
  {
    nomi: 'Yaratish: soxta telefon, kelajak qabul, noto‘g‘ri muddat rad; begona mahalla yettilikka taqiqlangan; noma‘lum mahalla "topilmadi"',
    tekshir: async () => {
      const k = async (q: Record<string, unknown>, kk = BANDLIK()) => xatoKodi(() => murojaatYaratish(kk, MurojaatYaratishSxemasi.parse(asos(q))));
      return (
        (await k({ murojaatchiTelefon: '901234567' })) === 'NOTOGRI' &&
        (await k({ qabulVaqti: keyin(2) })) === 'NOTOGRI' &&
        (await k({ javobMuddati: keyin(-3) })) === 'NOTOGRI' &&
        (await k({}, YETTILIK_B())) === 'RUXSAT' &&
        (await k({ mahallaId: 'yoq-mahalla' })) === 'TOPILMADI'
      );
    },
  },
  {
    nomi: 'Yaratish: mas‘ul faqat huquqi bor xodim (boshqa mahalla yettiligi, faol bo‘lmagan, noma‘lum - rad); fuqaro faqat shu mahalladan va arxivda emas',
    tekshir: async () => {
      const k = async (q: Record<string, unknown>) => xatoKodi(() => murojaatYaratish(BANDLIK(), MurojaatYaratishSxemasi.parse(asos(q))));
      const ofis = await prisma.user.create({
        data: { username: noyob('nofaol').replace(/\s/g, '_'), fullName: 'Nofaol', passwordHash: 'x', rol: 'YETTILIK', mahallaId: mahallaA, faol: false },
        select: { id: true },
      });
      xodimlar.push(ofis.id);
      const fA = await fuqaroYarat(mahallaA);
      const fB = await fuqaroYarat(mahallaB);
      const arx = await fuqaroYarat(mahallaA, { arxivSanasi: new Date() });
      const ok = await murojaatYaratish(BANDLIK(), MurojaatYaratishSxemasi.parse(asos({ masulId: yettilikA2, ishsizId: fA })));
      murojaatlar.push(ok.id);
      const m = await prisma.murojaat.findUnique({ where: { id: ok.id } });
      return (
        m?.masulId === yettilikA2 && m.ishsizId === fA &&
        (await k({ masulId: yettilikB })) === 'NOTOGRI' &&
        (await k({ masulId: ofis.id })) === 'NOTOGRI' &&
        (await k({ masulId: 'yoq-xodim' })) === 'NOTOGRI' &&
        (await k({ ishsizId: fB })) === 'NOTOGRI' &&
        (await k({ ishsizId: arx })) === 'TOPILMADI'
      );
    },
  },
  {
    nomi: 'POYGA: 10 murojaat bir vaqtda qayd etilsa - hammasi yaratiladi, raqamlar takrorlanmaydi (UNIQUE + qayta urinish)',
    tekshir: async () => {
      const r = await Promise.all(
        Array.from({ length: 10 }, () => murojaatYaratish(BANDLIK(), MurojaatYaratishSxemasi.parse(asos())).then((x) => x, (e) => e))
      );
      const ok = r.filter((x) => !(x instanceof Error));
      ok.forEach((x) => murojaatlar.push(x.id));
      const raqamlar = new Set(ok.map((x) => x.raqami));
      return ok.length === 10 && raqamlar.size === 10;
    },
  },

  /* ══ 3. HOLAT O'TISHLARI ══ */
  {
    nomi: 'Qabul: YANGI -> JARAYONDA (tarixga yoziladi); ikkinchi marta - holat xatosi; begona mahalla yettiligi tegina olmaydi',
    tekshir: async () => {
      const { id } = await yarat();
      const begona = await xatoKodi(() => murojaatAmali(YETTILIK_B(), id, { amal: 'qabul' }));
      await murojaatAmali(YETTILIK_A(), id, { amal: 'qabul' });
      const yana = await xatoKodi(() => murojaatAmali(YETTILIK_A(), id, { amal: 'qabul' }));
      const m = await prisma.murojaat.findUnique({ where: { id } });
      const t = await prisma.murojaatTarixi.findMany({ where: { murojaatId: id }, orderBy: { createdAt: 'asc' } });
      return begona === 'RUXSAT' && yana === 'HOLAT' && m?.holati === 'JARAYONDA' && t.length === 2 && t[1].hodisa === 'HOLAT' && t[1].holatdan === 'YANGI' && t[1].holatga === 'JARAYONDA' && t[1].kimId === yettilikA;
    },
  },
  {
    nomi: 'Javob: natija turi va matni saqlanadi; kelajak va qabuldan oldingi sana rad; YANGIdan to‘g‘ridan-to‘g‘ri mumkin; ikkinchi javob - holat xatosi',
    tekshir: async () => {
      const { id } = await yarat({ qabulVaqti: keyin(-3) });
      const kelajak = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Ish topildi', sana: keyin(2) }));
      const oldin = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Ish topildi', sana: keyin(-6) }));
      await murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'YONALTIRILDI', natija: 'Bandlik markaziga yo‘naltirildi' });
      const yana = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Boshqa javob' }));
      const m = await prisma.murojaat.findUnique({ where: { id } });
      return kelajak === 'NOTOGRI' && oldin === 'NOTOGRI' && yana === 'HOLAT' && m?.holati === 'JAVOB_BERILDI' && m.natijaTuri === 'YONALTIRILDI' && /Bandlik markaziga/.test(m.natija ?? '') && m.javobSanasi !== null;
    },
  },
  {
    nomi: 'Yopish: faqat javob berilgandan keyin; javobsiz yopib bo‘lmaydi; yopilgach sana yoziladi; yopilgandan keyin javob/qabul mumkin emas',
    tekshir: async () => {
      const { id } = await yarat();
      const erta = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'yopish' }));
      await murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'TUSHUNTIRILDI', natija: 'Tartib tushuntirildi' });
      await murojaatAmali(BANDLIK(), id, { amal: 'yopish' });
      const keyingi = await Promise.all([
        xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'qabul' })),
        xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Yangi javob' })),
        xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'yopish' })),
      ]);
      const m = await prisma.murojaat.findUnique({ where: { id } });
      return erta === 'HOLAT' && keyingi.every((k) => k === 'HOLAT') && m?.holati === 'YOPILDI' && m.yopilganSana !== null;
    },
  },

  /* ══ 4. QAYTA OCHISH ══ */
  {
    nomi: 'Qayta ochish: sabab va yangi muddat majburiy; hisoblagich oshadi; natija tozalanadi; OLDINGI NATIJA tarixda saqlanadi; ochiq murojaatni qayta ochib bo‘lmaydi',
    tekshir: async () => {
      const { id } = await yarat();
      const ochiqda = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'qayta-ochish', sabab: 'Yangi holat', yangiMuddat: keyin(10) }));
      await murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'RAD_ETILDI', natija: 'Talab mos kelmadi' });
      const otgan = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'qayta-ochish', sabab: 'Yangi hujjat topildi', yangiMuddat: keyin(-2) }));
      await murojaatAmali(BANDLIK(), id, { amal: 'qayta-ochish', sabab: 'Yangi hujjat topildi', yangiMuddat: keyin(10) });
      const m = await prisma.murojaat.findUnique({ where: { id } });
      const t = await prisma.murojaatTarixi.findMany({ where: { murojaatId: id, hodisa: 'QAYTA_OCHILDI' } });
      /* Ikkinchi qayta ochish */
      await murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Endi ish topildi' });
      await murojaatAmali(BANDLIK(), id, { amal: 'qayta-ochish', sabab: 'Ish tez tugadi', yangiMuddat: keyin(10) });
      const m2 = await prisma.murojaat.findUnique({ where: { id } });
      return (
        ochiqda === 'HOLAT' && otgan === 'NOTOGRI' &&
        m?.holati === 'JARAYONDA' && m.qaytaOchilganSoni === 1 && m.oxirgiQaytaOchishSababi === 'Yangi hujjat topildi' &&
        m.natijaTuri === null && m.natija === null && m.javobSanasi === null && m.yopilganSana === null &&
        t.length === 1 && /Рад этилди: Talab mos kelmadi/.test(t[0].izoh ?? '') && !/RAD_ETILDI/.test(t[0].izoh ?? '') && /Yangi hujjat topildi/.test(t[0].izoh ?? '') &&
        m2?.qaytaOchilganSoni === 2
      );
    },
  },

  /* ══ 5. MAS'UL VA MUDDAT ══ */
  {
    nomi: 'Mas‘ul almashtirish: faqat huquqi bor xodimga; o‘zgarish tarixga "kim -> kim" bilan; o‘zi-o‘ziga va begona mahalla xodimiga rad',
    tekshir: async () => {
      const { id } = await yarat({ masulId: yettilikA });
      const begona = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'masul', masulId: yettilikB }));
      const bir = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'masul', masulId: yettilikA }));
      await murojaatAmali(YETTILIK_A(), id, { amal: 'masul', masulId: yettilikA2 });
      const m = await prisma.murojaat.findUnique({ where: { id } });
      const t = await prisma.murojaatTarixi.findFirst({ where: { murojaatId: id, hodisa: 'MASUL' } });
      return begona === 'NOTOGRI' && bir === 'NOTOGRI' && m?.masulId === yettilikA2 && /Sinov murojaat yettilik A.* → .*A2/.test(t?.izoh ?? '') && t?.kimId === yettilikA;
    },
  },
  {
    nomi: 'Muddatni uzaytirish: faqat oldinga, sabab bilan, ochiq murojaatda; tarixga "eski -> yangi: sabab"; qisqartirib va javob berilgandan keyin bo‘lmaydi',
    tekshir: async () => {
      const { id } = await yarat({ javobMuddati: keyin(5) });
      const qisqa = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'muddat', yangiMuddat: keyin(2), sabab: 'Qisqartirish' }));
      const bir = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'muddat', yangiMuddat: keyin(5), sabab: 'Bir xil sana' }));
      const uzoq = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'muddat', yangiMuddat: keyin(MAKS_MUDDAT_KUNI + 10), sabab: 'Juda uzoq' }));
      await murojaatAmali(BANDLIK(), id, { amal: 'muddat', yangiMuddat: keyin(12), sabab: 'Hujjat kutilmoqda' });
      const m = await prisma.murojaat.findUnique({ where: { id } });
      const t = await prisma.murojaatTarixi.findFirst({ where: { murojaatId: id, hodisa: 'MUDDAT' } });
      await murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Hal qilindi' });
      const keyingi = await xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'muddat', yangiMuddat: keyin(20), sabab: 'Kech bo‘ldi' }));
      return qisqa === 'NOTOGRI' && bir === 'NOTOGRI' && uzoq === 'NOTOGRI' && keyingi === 'HOLAT' && sanaKuni(m?.javobMuddati) === sanaKuni(keyin(12)) && /→/.test(t?.izoh ?? '') && /Hujjat kutilmoqda/.test(t?.izoh ?? '');
    },
  },

  /* ══ 6. POYGA ══ */
  {
    nomi: 'POYGA: bir murojaatga bir vaqtda ikki "javob" - faqat bittasi o‘tadi, tarixda bitta yozuv',
    tekshir: async () => {
      let togri = true;
      for (let i = 0; i < 5; i++) {
        const { id } = await yarat();
        const r = await Promise.all([
          xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Birinchi javob' })),
          xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'javob', natijaTuri: 'RAD_ETILDI', natija: 'Ikkinchi javob' })),
        ]);
        const tarix = await prisma.murojaatTarixi.count({ where: { murojaatId: id, holatga: 'JAVOB_BERILDI' } });
        togri = togri && r.filter((x) => x === null).length === 1 && r.filter((x) => x === 'HOLAT').length === 1 && tarix === 1;
      }
      return togri;
    },
  },
  {
    nomi: 'POYGA: bir vaqtda ikki xil mas‘ulga almashtirish - faqat bittasi o‘tadi (eski mas‘ul sharti), tarixda bitta yozuv',
    tekshir: async () => {
      let togri = true;
      for (let i = 0; i < 5; i++) {
        const { id } = await yarat({ masulId: yettilikA });
        const r = await Promise.all([
          xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'masul', masulId: yettilikA2 })),
          xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'masul', masulId: bandlik })),
        ]);
        const tarix = await prisma.murojaatTarixi.count({ where: { murojaatId: id, hodisa: 'MASUL' } });
        togri = togri && r.filter((x) => x === null).length === 1 && tarix === 1;
      }
      return togri;
    },
  },
  {
    nomi: 'POYGA: bir vaqtda ikki marta muddat uzaytirish (bir xil asosdan) - faqat bittasi o‘tadi',
    tekshir: async () => {
      let togri = true;
      for (let i = 0; i < 5; i++) {
        const { id } = await yarat({ javobMuddati: keyin(5) });
        const r = await Promise.all([
          xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'muddat', yangiMuddat: keyin(9), sabab: 'Birinchi sabab' })),
          xatoKodi(() => murojaatAmali(BANDLIK(), id, { amal: 'muddat', yangiMuddat: keyin(11), sabab: 'Ikkinchi sabab' })),
        ]);
        const tarix = await prisma.murojaatTarixi.count({ where: { murojaatId: id, hodisa: 'MUDDAT' } });
        togri = togri && r.filter((x) => x === null).length === 1 && r.filter((x) => x === 'HOLAT').length === 1 && tarix === 1;
      }
      return togri;
    },
  },
  {
    nomi: 'Tarix to‘liq: har holat o‘zgarishi alohida yozilgan, kim va qaysi holatdan-holatga; o‘zgarish bo‘lsa tarix ham bor (tranzaksiya)',
    tekshir: async () => {
      const { id } = await yarat({ masulId: yettilikA });
      await murojaatAmali(YETTILIK_A(), id, { amal: 'qabul' });
      await murojaatAmali(YETTILIK_A(), id, { amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Muammo hal qilindi' });
      await murojaatAmali(BANDLIK(), id, { amal: 'yopish' });
      await murojaatAmali(BANDLIK(), id, { amal: 'qayta-ochish', sabab: 'Muammo qaytdi', yangiMuddat: keyin(7) });
      const t = await prisma.murojaatTarixi.findMany({ where: { murojaatId: id }, orderBy: { createdAt: 'asc' } });
      const kod = oqi('src/lib/murojaatlar.ts');
      return (
        t.length === 5 &&
        t[0].hodisa === 'YARATILDI' && t[1].holatga === 'JARAYONDA' && t[2].holatga === 'JAVOB_BERILDI' && t[3].holatga === 'YOPILDI' && t[4].hodisa === 'QAYTA_OCHILDI' &&
        t.every((x) => x.kimId.length > 0) &&
        /ozgartir[\s\S]*?\$transaction[\s\S]*?murojaatTarixi\.create/.test(kod)
      );
    },
  },

  /* ══ 7. KO'RSATKICH VA TAXTA ══ */
  {
    nomi: 'Bazadan ko‘rsatkich: mahalla bo‘yicha ajraladi; uzaytirilgan javoblar sanaladi; qayta ochilganlar hisobi',
    tekshir: async () => {
      const oldin = await murojaatKorsatkichlari(mahallaB);
      const a = await yarat({ mahallaId: mahallaB, qabulVaqti: keyin(-9), javobMuddati: keyin(-1), masulId: bandlik });
      const b = await yarat({ mahallaId: mahallaB, qabulVaqti: keyin(-9), javobMuddati: keyin(-5), masulId: bandlik });
      await murojaatAmali(BANDLIK(), a.id, { amal: 'muddat', yangiMuddat: keyin(3), sabab: 'Hujjat kutildi' });
      await murojaatAmali(BANDLIK(), a.id, { amal: 'javob', natijaTuri: 'HAL_QILINDI', natija: 'Hal qilindi' });
      await murojaatAmali(BANDLIK(), b.id, { amal: 'javob', natijaTuri: 'TUSHUNTIRILDI', natija: 'Tushuntirildi' });
      await murojaatAmali(BANDLIK(), b.id, { amal: 'qayta-ochish', sabab: 'Qayta murojaat', yangiMuddat: keyin(6) });
      const keyingi = await murojaatKorsatkichlari(mahallaB);
      return (
        keyingi.jami - oldin.jami === 2 &&
        keyingi.javobBerilgan - oldin.javobBerilgan === 1 &&
        keyingi.javob.uzaytirilgan - oldin.javob.uzaytirilgan === 1 &&
        keyingi.javob.vaqtida - oldin.javob.vaqtida === 1 &&
        keyingi.qaytaOchilgan.soni - oldin.qaytaOchilgan.soni === 1 &&
        keyingi.jarayonda - oldin.jarayonda === 1
      );
    },
  },
  {
    nomi: 'Muddatli murojaatlar: faqat kechikkan/bugun/yaqin ochiqlar, eng kechikkani birinchi; javob berilgan va uzoq muddatlilar kirmaydi; mahalla bo‘yicha',
    tekshir: async () => {
      const kech = await murojaatBaza({ javobMuddati: keyin(-6), holati: 'JARAYONDA' });
      const bugun = await murojaatBaza({ javobMuddati: keyin(0) });
      const yaqin = await murojaatBaza({ javobMuddati: keyin(2) });
      const uzoq = await murojaatBaza({ javobMuddati: keyin(20) });
      /* Chegara: 3 kun qolgan - yaqin (kiradi); 4 kun qolgan - hali muddatli (kirmaydi). Bazadagi taxminiy chegara 5 kun, aniq filtr kodda */
      const uchKun = await murojaatBaza({ javobMuddati: keyin(3) });
      const turtKun = await murojaatBaza({ javobMuddati: keyin(4) });
      const javobli = await murojaatBaza({ javobMuddati: keyin(-9), holati: 'JAVOB_BERILDI', natijaTuri: 'HAL_QILINDI', natija: 'x', javobSanasi: keyin(-10) });
      const begona = await murojaatBaza({ javobMuddati: keyin(-3), mahallaId: mahallaB, masulId: yettilikB });
      const hammasi = (await muddatliMurojaatlar(null)).map((x) => x.id);
      const oz = (await muddatliMurojaatlar(mahallaA)).map((x) => x.id);
      const tartib = hammasi.filter((x) => [kech, bugun, yaqin].includes(x));
      return (
        [kech, bugun, yaqin, uchKun, begona].every((x) => hammasi.includes(x)) &&
        ![uzoq, javobli, turtKun].some((x) => hammasi.includes(x)) &&
        JSON.stringify(tartib) === JSON.stringify([kech, bugun, yaqin]) &&
        oz.includes(kech) && !oz.includes(begona)
      );
    },
  },
  {
    nomi: 'Vazifalar taxtasi: "murojaatlar" bloki endi HAQIQIY (placeholder emas); yettilikka faqat o‘z mahallasi, bandlikka hammasi, hokimga ko‘rinmaydi',
    tekshir: async () => {
      const m = await murojaatBaza({ javobMuddati: keyin(-4), holati: 'YANGI' });
      const b = await murojaatBaza({ javobMuddati: keyin(-4), mahallaId: mahallaB, masulId: yettilikB });
      const korish = async (rol: 'BANDLIK' | 'YETTILIK' | 'HOKIM', userId: string, mahallaId: string | null) => {
        const t = await vazifalarim({ userId, rol, mahallaId });
        const bl = t.bloklar.find((x) => x.kalit === 'murojaatlar');
        return { bor: !!bl, placeholder: !!bl?.yetishmayotgan, m: !!bl?.qatorlar.some((q) => q.id === m), b: !!bl?.qatorlar.some((q) => q.id === b), soni: bl?.soni ?? -1 };
      };
      const y = await korish('YETTILIK', yettilikA, mahallaA);
      const yb = await korish('YETTILIK', yettilikB, mahallaB);
      const bd = await korish('BANDLIK', bandlik, null);
      const h = await korish('HOKIM', bandlik, null);
      return y.bor && !y.placeholder && y.m && !y.b && yb.b && !yb.m && bd.m && bd.b && !h.bor && y.soni >= 1;
    },
  },

  /* ══ 8. KOD, HUQUQ, SAHIFA ══ */
  {
    nomi: 'API: har yo‘l sessiyani talab qiladi; yettilik/bandlik/rahbar/admin; hokim kira olmaydi; xatolar HTTP kodi bilan',
    tekshir: async () => {
      const fayllar = ['src/app/api/murojaatlar/route.ts', 'src/app/api/murojaatlar/[id]/route.ts'].map(oqi);
      const rollar = (m: string): string[] | null => {
        const q = m.match(/const ROLLAR = \[([^\]]*)\] as const/);
        if (!q || !/talabQil\(\[\.\.\.ROLLAR\]\)/.test(m)) return null;
        return q[1].split(',').map((x) => x.trim().replace(/['"]/g, '')).filter(Boolean).sort();
      };
      const kutilgan = JSON.stringify(['ADMIN', 'BANDLIK', 'BANDLIK_RAHBAR', 'YETTILIK']);
      return (
        fayllar.every((m) => JSON.stringify(rollar(m)) === kutilgan) &&
        fayllar.every((m) => !m.includes("'HOKIM'") && m.includes('MUROJAAT_HTTP') && m.includes('MurojaatXatosi')) &&
        Object.values(MUROJAAT_HTTP).every((n) => n >= 400)
      );
    },
  },
  {
    nomi: 'Kod: murojaat mantig‘i fuqaro holatini, ish, dalil, kurs va buyurtmani YOZMAYDI; muddatni o‘zi taxmin qilmaydi (muddat sxemada majburiy); "qonuniy muddat emas" izohi bor',
    tekshir: async () => {
      const k = oqi('src/lib/murojaatlar.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const n = oqi('src/lib/murojaatlar-nomlari.ts');
      const yozadi = /\b(ishgaJoylashish|joylashuvDalili|unemployedPerson|household|kursYollanmasi|mahalliyBuyurtma)\s*\.\s*(create|update|updateMany|delete|deleteMany|upsert)\b/.test(k);
      const sxema = oqi('src/lib/murojaatlar.ts');
      const majburiy = /javobMuddati: SANA,/.test(sxema) && !/ODATIY_JAVOB_KUNI/.test(k);
      return !yozadi && majburiy && /QONUNIY MUDDAT EMAS/.test(n);
    },
  },
  {
    nomi: 'Sahifalar: menyu (/murojaatlar), sahifa huquqi, fuqaro sahifasida blok (xato yutadigan); migratsiya faqat qo‘shadi (3 jadval, 3 tur)',
    tekshir: async () => {
      const m = oqi('src/components/shell/navigatsiya.ts');
      const list = oqi('src/app/(ilova)/murojaatlar/page.tsx');
      const det = oqi('src/app/(ilova)/murojaatlar/[id]/page.tsx');
      const f = oqi('src/app/(ilova)/ishsizlar/[id]/page.tsx');
      const bl = oqi('src/components/murojaat/murojaatlar-blogi.tsx');
      const sql = oqi('prisma/migrations/20261001200000_murojaat_va_yordam/migration.sql');
      const xavfli = /\b(DROP\s+(TABLE|COLUMN|TYPE)|RENAME|TRUNCATE|SET\s+NOT\s+NULL|ALTER\s+COLUMN)\b/i.test(sql);
      const jadvallar = (sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/g) ?? []).length;
      const turlar = (sql.match(/CREATE TYPE "(\w+)"/g) ?? []).length;
      return (
        /yol:\s*'\/murojaatlar'/.test(m) &&
        list.includes("yolgaRuxsat(sessiya.rol, '/murojaatlar')") && det.includes("yolgaRuxsat(sessiya.rol, '/murojaatlar')") &&
        f.includes('<MurojaatlarBlogi') && bl.includes('catch (e)') &&
        !xavfli && jadvallar === 3 && turlar === 3 && !/ALTER TABLE "(User|UnemployedPerson|Mahalla)"\s+(ADD COLUMN|DROP)/i.test(sql)
      );
    },
  },
];

function sanaKuni(d: Date | null | undefined): string {
  return d ? new Date(d.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10) : '';
}

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
