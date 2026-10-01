/**
 * ============================================================
 *  30/60/90 KUNLIK KUZATUV — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/kuzatuv-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *  Hokim "joylashganlarning necha foizi ishda qoldi?" deb so'raydi.
 *  Yolg'on javob uch yo'l bilan chiqadi:
 *
 *   1. NOMA'LUM "YO'Q" YOKI "0" BO'LIB KETADI. Hech kim bog'lanmagan
 *      ishlar "ketgan" deb sanalsa - ko'rsatkich keskin tushadi;
 *      "qolgan" deb sanalsa - sun'iy yuqori bo'ladi.
 *
 *   2. FUQARO AYTGANI "TEKSHIRILGAN" DEB KO'RINADI. Hujjat so'ralmagan
 *      gap hujjatli ma'lumot bilan bir ustunga tushadi.
 *
 *   3. ISH ALMASHTIRGAN FUQARO IKKI KISHI BO'LIB SANALADI.
 *
 *  Bu fayl uchalasini sintetik ma'lumot (toza funksiyalar) va bazadagi
 *  haqiqiy yozuvlar bilan sinaydi.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  KuzatuvSxemasi,
  KuzatuvXatosi,
  bosqichHolati,
  kuzatuvIshlari,
  kuzatuvKorsatkichlari,
  kuzatuvniTekshir,
  kuzatuvYozish,
  korsatkichlarniHisobla,
  muddatSanasi,
  type HisobIshi,
  type KuzatuvKirishi,
} from '../src/lib/kuzatuv';
import { vazifalarim } from '../src/lib/vazifalar';
import { MENYU, yolgaRuxsat } from '../src/components/shell/navigatsiya';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const KUN = 24 * 60 * 60 * 1000;
const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const oqi = (y: string) => readFileSync(y, 'utf8');
const noyob = (a: string) => `${a} ${Date.now()}${Math.floor(Math.random() * 10000)}`;
const oldin = (n: number, h = new Date()) => new Date(h.getTime() - n * KUN);

let mahallaA = '';
let mahallaB = '';
let bandlik = ''; // BANDLIK xodimi
let yettilikB = ''; // YETTILIK, B mahalla
const fuqarolar: string[] = [];
const xodimlar: string[] = [];

const sessiya = (rol: 'BANDLIK' | 'YETTILIK' | 'ADMIN', userId: string, mahallaId: string | null) => ({
  rol,
  userId,
  mahallaId,
});

async function xodimYarat(rol: 'BANDLIK' | 'YETTILIK', mahallaId: string | null) {
  const x = await prisma.user.create({
    data: {
      username: noyob('sinov_kuzatuv').replace(/\s/g, '_'),
      fullName: `Sinov ${rol}`,
      passwordHash: 'x',
      rol,
      mahallaId,
    },
    select: { id: true },
  });
  xodimlar.push(x.id);
  return x.id;
}

async function tayyorla() {
  const m = await prisma.mahalla.findMany({ take: 2, select: { id: true } });
  if (m.length < 2) throw new Error('Sinov uchun ikkita mahalla kerak — `prisma db seed`');
  mahallaA = m[0].id;
  mahallaB = m[1].id;
  bandlik = await xodimYarat('BANDLIK', null);
  yettilikB = await xodimYarat('YETTILIK', mahallaB);
}

async function tozala() {
  /* Fuqarolar o'chsa, ish voqealari, kuzatuv va dalillar ham (Cascade) */
  await prisma.unemployedPerson.deleteMany({ where: { id: { in: fuqarolar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
}

async function fuqaroYarat(mahallaId: string, qoshimcha: Record<string, unknown> = {}) {
  const f = await prisma.unemployedPerson.create({
    data: {
      fish: noyob('Kuzatuv Sinov'),
      jinsi: 'ERKAK',
      mahallaId,
      holati: 'JOYLASHTIRILDI',
      tugilganSana: new Date(Date.UTC(1990, 0, 1)),
      ...qoshimcha,
    },
    select: { id: true },
  });
  fuqarolar.push(f.id);
  return f.id;
}

async function ishYarat(ishsizId: string, kunOldin: number, qoshimcha: Record<string, unknown> = {}) {
  return prisma.ishgaJoylashish.create({
    data: {
      ishsizId,
      korxonaNomi: noyob('Sinov MChJ'),
      boshlanganSana: oldin(kunOldin),
      holati: 'ISHLAMOQDA',
      ...qoshimcha,
    },
    select: { id: true, boshlanganSana: true },
  });
}

/** Tasdiqlangan dalil (tekshirilgan ma'lumot uchun) */
async function dalilYarat(ishsizId: string, joylashishId: string | null, holati: 'TASDIQLANDI' | 'KIRITILDI') {
  const d = await prisma.joylashuvDalili.create({
    data: {
      ishsizId,
      joylashishId,
      turi: 'SHARTNOMA',
      holati,
      manbaTuri: 'QOLDA_HUJJAT',
      reyestrSanasi: new Date(Date.now() - Math.floor(Math.random() * 1e9)),
      kiritganId: bandlik,
    },
    select: { id: true },
  });
  return d.id;
}

/** Yaroqli kiritish: 30 kunlik, fuqaro aytgan, ishda qolmoqda */
function kiritish(joylashishId: string, qoshimcha: Partial<KuzatuvKirishi> = {}): KuzatuvKirishi {
  return KuzatuvSxemasi.parse({
    joylashishId,
    kunBelgisi: 30,
    natija: 'MALUMOT_OLINDI',
    tekshiruvSanasi: new Date().toISOString(),
    manba: 'FUQARO_BILDIRGAN',
    ishBoshladi: 'HA',
    ishdaQolmoqda: 'HA',
    ...qoshimcha,
  });
}

const HOZIR = new Date('2026-10-20T10:00:00Z');
const kunH = (n: number) => new Date(HOZIR.getTime() + n * KUN);

/**
 * Toza funksiyalar uchun kiritish: ma'lumot olingan sana HOZIR ga teng
 * (sinov soati emas). Aks holda sana qoidasi mantiq qoidalaridan OLDIN
 * ishlab, sinov noto'g'ri sabab bilan "o'tib" yoki yiqilib qolardi.
 */
const p = (q: Partial<KuzatuvKirishi> = {}): KuzatuvKirishi => ({
  ...kiritish('x'),
  tekshiruvSanasi: HOZIR,
  ...q,
});

/** Rad etilgani VA aynan shu sabab bilan ekani */
const radSabab = (r: { ok: boolean; xabar?: string }, kalit: string) =>
  !r.ok && (r.xabar ?? '').includes(kalit);

/** Toza funksiyalar uchun kontekst: 40 kun oldin ishga kirgan */
const K40 = { boshlanganSana: kunH(-40), tugaganSana: null as Date | null, hozir: HOZIR };

const SINOVLAR: Sinov[] = [
  /* ══ 1. MUDDAT ══ */
  {
    nomi: 'Muddat = ishga kirgan sana + 30/60/90 kun',
    tekshir: async () => {
      const b = new Date('2026-07-01T00:00:00Z');
      return (
        muddatSanasi(b, 30).toISOString().startsWith('2026-07-31') &&
        muddatSanasi(b, 60).toISOString().startsWith('2026-08-30') &&
        muddatSanasi(b, 90).toISOString().startsWith('2026-09-29')
      );
    },
  },
  {
    nomi: 'Bosqich holati: kutilmoqda / bugun / kechikdi / bajarildi',
    tekshir: async () => {
      const ish = (n: number) => ({ boshlanganSana: kunH(-n), tugaganSana: null });
      return (
        bosqichHolati(ish(20), 30, null, HOZIR) === 'kutilmoqda' &&
        bosqichHolati(ish(30), 30, null, HOZIR) === 'bugun' &&
        bosqichHolati(ish(35), 30, null, HOZIR) === 'kechikdi' &&
        bosqichHolati(ish(35), 30, { natija: 'MALUMOT_OLINDI', qaytaUrinishSanasi: null }, HOZIR) === 'bajarildi'
      );
    },
  },
  {
    nomi: 'Ish bosqichdan OLDIN tugagan bo‘lsa — "yopilgan" (kechikdi deb qizartirilmaydi)',
    tekshir: async () => {
      const ish = { boshlanganSana: kunH(-50), tugaganSana: kunH(-30) }; // 20 kun ishlagan
      return bosqichHolati(ish, 30, null, HOZIR) === 'yopilgan' && bosqichHolati(ish, 90, null, HOZIR) === 'yopilgan';
    },
  },
  {
    nomi: '"Bog‘lanib bo‘lmadi" bajarilgan hisoblanmaydi: qayta urinish sanasi kelguncha kutadi, keyin qaytadi',
    tekshir: async () => {
      const ish = { boshlanganSana: kunH(-40), tugaganSana: null };
      const kutish = { natija: 'BOGLANILMADI' as const, qaytaUrinishSanasi: kunH(2) };
      const otgan = { natija: 'BOGLANILMADI' as const, qaytaUrinishSanasi: kunH(-1) };
      return (
        bosqichHolati(ish, 30, kutish, HOZIR) === 'boglanilmadi' &&
        bosqichHolati(ish, 30, otgan, HOZIR) === 'qayta_urinish'
      );
    },
  },

  /* ══ 2. MA'LUMOT TEKSHIRUVI (toza funksiya) ══ */
  {
    nomi: 'Maʼlumot olingan sana kelajakda yoki ishga kirishdan oldin bo‘lsa — AYNAN shu sabab bilan rad etiladi',
    tekshir: async () => {
      const f = kuzatuvniTekshir(p({ tekshiruvSanasi: kunH(3) }), K40);
      const o = kuzatuvniTekshir(p({ tekshiruvSanasi: kunH(-60) }), K40);
      return radSabab(f, 'келажакда') && radSabab(o, 'олдин');
    },
  },
  {
    /*
     * Brauzer sanani soatsiz yuboradi (tushki 12:00). Ertalab yozilganda
     * bu "kelajak" bo'lib, TO'G'RI yozuv rad etilardi - brauzer sinovida
     * topilgan nuqson.
     */
    nomi: 'Bugungi sana kunning istalgan soatida yaroqli (ertalab yozilgan "tushki 12:00" rad etilmaydi)',
    tekshir: async () => {
      const ertalab = new Date('2026-10-20T03:00:00Z'); // Toshkentda 08:00
      const tush = new Date('2026-10-20T07:00:00Z'); //     Toshkentda 12:00 - "kelajak" soati
      const ertaga = new Date('2026-10-21T07:00:00Z');
      const k = { boshlanganSana: new Date('2026-09-10T00:00:00Z'), tugaganSana: null, hozir: ertalab };
      const bugun_ = kuzatuvniTekshir(p({ tekshiruvSanasi: tush }), k);
      const ertaga_ = kuzatuvniTekshir(p({ tekshiruvSanasi: ertaga }), k);
      return bugun_.ok && radSabab(ertaga_, 'келажакда');
    },
  },
  {
    nomi: '30 kunlik tekshiruv ishga kirgandan 10 kun keyin yozilsa — "erta" deb rad etiladi; 25-kunda o‘tadi',
    tekshir: async () => {
      const erta = kuzatuvniTekshir(p(), { boshlanganSana: kunH(-10), tugaganSana: null, hozir: HOZIR });
      const ok = kuzatuvniTekshir(p(), { boshlanganSana: kunH(-25), tugaganSana: null, hozir: HOZIR });
      return radSabab(erta, 'камида') && ok.ok;
    },
  },
  {
    nomi: 'Hech qanday javob va daromad yo‘q "Maʼlumot olindi" — rad etiladi (bo‘sh yozuv "bilim" emas)',
    tekshir: async () => {
      const r = kuzatuvniTekshir(p({ ishBoshladi: 'NOMALUM', ishdaQolmoqda: 'NOMALUM', manba: 'NOMALUM' }), K40);
      return radSabab(r, 'Боғланиб бўлмади');
    },
  },
  {
    nomi: 'Javob manbasiz bo‘lmaydi: "Ha" yozib, manbani "noma’lum" qoldirish rad etiladi',
    tekshir: async () => radSabab(kuzatuvniTekshir(p({ manba: 'NOMALUM' }), K40), 'манбаини'),
  },
  {
    nomi: 'Daromad manbasiz bo‘lmaydi; daromad yo‘q bo‘lsa manbasi "noma’lum"ga tushadi',
    tekshir: async () => {
      const manbasiz = kuzatuvniTekshir(p({ oilaDaromadiSom: 3_000_000, daromadManbasi: 'NOMALUM' }), K40);
      const daromadsiz = kuzatuvniTekshir(p({ oilaDaromadiSom: null, daromadManbasi: 'FUQARO_BILDIRGAN' }), K40);
      return radSabab(manbasiz, 'Даромад') && daromadsiz.ok && daromadsiz.d.daromadManbasi === 'NOMALUM';
    },
  },
  {
    nomi: '"Tekshirilgan" dalilsiz tanlanmaydi (manba ham, daromad manbasi ham); dalil bilan o‘tadi',
    tekshir: async () => {
      const a = kuzatuvniTekshir(p({ manba: 'TEKSHIRILGAN', dalilId: null }), K40);
      const b = kuzatuvniTekshir(
        p({ oilaDaromadiSom: 1_000_000, daromadManbasi: 'TEKSHIRILGAN', dalilId: null }),
        K40
      );
      const c = kuzatuvniTekshir(p({ manba: 'TEKSHIRILGAN', dalilId: 'd1' }), K40);
      return radSabab(a, 'далил') && radSabab(b, 'далил') && c.ok;
    },
  },
  {
    nomi: 'Ziddiyatli javob rad etiladi: "ishga kirmagan" + "ishda qolmoqda"',
    tekshir: async () =>
      radSabab(kuzatuvniTekshir(p({ ishBoshladi: 'YOQ', ishdaQolmoqda: 'HA' }), K40), 'Зиддият'),
  },
  {
    nomi: 'Ish voqeasida tugagan deb yozilgan bo‘lsa "ishda qolmoqda" deyish rad etiladi',
    tekshir: async () => {
      const k = { boshlanganSana: kunH(-40), tugaganSana: kunH(-5), hozir: HOZIR };
      return radSabab(kuzatuvniTekshir(p({ tekshiruvSanasi: kunH(-1) }), k), 'Зиддият');
    },
  },
  {
    nomi: '"Ishdan ketgan" bo‘lsa SABAB va TUGASH SANASI shart',
    tekshir: async () => {
      const sababsiz = kuzatuvniTekshir(p({ ishdaQolmoqda: 'YOQ', tugaganSana: kunH(-3) }), K40);
      const sanasiz = kuzatuvniTekshir(p({ ishdaQolmoqda: 'YOQ', tugashSababi: 'Maosh kam edi' }), K40);
      const toliq = kuzatuvniTekshir(
        p({ ishdaQolmoqda: 'YOQ', tugashSababi: 'Maosh kam edi', tugaganSana: kunH(-3) }),
        K40
      );
      return radSabab(sababsiz, 'сабабини') && radSabab(sanasiz, 'қачон') && toliq.ok;
    },
  },
  {
    /*
     * ENG MUHIM: "bog'lanib bo'lmadi" hech narsani bildirmaydi. Xodim
     * shu holatda tasodifan "ishda qolmoqda: Ha" yoki daromad yozib
     * yuborsa ham, ular NOMA'LUMGA qaytariladi.
     */
    nomi: '"Bog‘lanib bo‘lmadi" barcha javob va daromadni NOMA’LUMGA qaytaradi, qayta urinish +3 kun',
    tekshir: async () => {
      const r = kuzatuvniTekshir(
        p({
          natija: 'BOGLANILMADI',
          ishdaQolmoqda: 'HA',
          oilaDaromadiSom: 5_000_000,
          ishHaqiSom: 2_000_000,
          daromadManbasi: 'TEKSHIRILGAN',
          manba: 'TEKSHIRILGAN',
          dalilId: 'd1',
        }),
        K40
      );
      if (!r.ok) return false;
      const d = r.d;
      const kutilgan = HOZIR.getTime() + 3 * KUN;
      return (
        d.manba === 'NOMALUM' &&
        d.ishdaQolmoqda === 'NOMALUM' &&
        d.ishBoshladi === 'NOMALUM' &&
        d.oilaDaromadiSom === null &&
        d.ishHaqiSom === null &&
        d.daromadManbasi === 'NOMALUM' &&
        d.dalilId === null &&
        Math.abs((d.qaytaUrinishSanasi?.getTime() ?? 0) - kutilgan) < 1000
      );
    },
  },
  {
    nomi: 'So‘m maydoni: bo‘sh = null (noma’lum), "0" = rostdan 0, "2 500 000" = 2500000; manfiy/harf/ortiqcha — rad',
    tekshir: async () => {
      const a = KuzatuvSxemasi.parse({ ...kiritish('x'), oilaDaromadiSom: '' }).oilaDaromadiSom;
      const b = KuzatuvSxemasi.parse({ ...kiritish('x'), oilaDaromadiSom: '0' }).oilaDaromadiSom;
      const c = KuzatuvSxemasi.parse({ ...kiritish('x'), oilaDaromadiSom: '2 500 000' }).oilaDaromadiSom;
      const d = KuzatuvSxemasi.parse({ ...kiritish('x'), oilaDaromadiSom: null }).oilaDaromadiSom;
      const e = KuzatuvSxemasi.parse({ ...kiritish('x') }).oilaDaromadiSom;
      const yomon = (x: unknown) => !KuzatuvSxemasi.safeParse({ ...kiritish('x'), oilaDaromadiSom: x }).success;
      return (
        a === null && b === 0 && c === 2_500_000 && d === null && e === undefined &&
        yomon('-5') && yomon('abc') && yomon(-1) && yomon(2_000_000_000) && yomon(1.5)
      );
    },
  },

  /* ══ 3. KO'RSATKICHLAR (sintetik) ══ */
  {
    nomi: 'Hech kim tekshirilmagan: ishda qolish darajasi NOL EMAS, NOMA’LUM (null), qamrov 0',
    tekshir: async () => {
      const ishlar: HisobIshi[] = [1, 2, 3].map((i) => ({
        ishsizId: `f${i}`,
        boshlanganSana: kunH(-100),
        tugaganSana: null,
        kuzatuvlar: [],
      }));
      const k = korsatkichlarniHisobla(ishlar, HOZIR);
      const b = k.bosqichlar[0];
      return (
        b.kohort === 3 && b.nomalum === 3 && b.qolgan === 0 && b.ketgan === 0 &&
        b.qolishDarajasi === null && b.malumotQamrovi === 0 && b.nomalumSabablari.tekshirilmagan === 3
      );
    },
  },
  {
    nomi: 'Ishda qolish darajasi FAQAT javobi ma’lumlar orasidan: 3 qolgan, 1 ketgan, 6 noma’lum → 75%, qamrov 40%',
    tekshir: async () => {
      const yoz = (kun: number, q: 'HA' | 'YOQ' | 'NOMALUM', manba: 'FUQARO_BILDIRGAN' | 'TEKSHIRILGAN' | 'NOMALUM') => ({
        kunBelgisi: kun,
        natija: 'MALUMOT_OLINDI' as const,
        tekshiruvSanasi: kunH(-1),
        manba,
        ishdaQolmoqda: q,
        oilaDaromadiSom: null,
        oldingiDaromadSom: null,
        daromadManbasi: 'NOMALUM' as const,
      });
      const ishlar: HisobIshi[] = [];
      const qosh = (kuz: HisobIshi['kuzatuvlar']) =>
        ishlar.push({ ishsizId: `g${ishlar.length}`, boshlanganSana: kunH(-100), tugaganSana: null, kuzatuvlar: kuz });
      qosh([yoz(30, 'HA', 'FUQARO_BILDIRGAN')]);
      qosh([yoz(30, 'HA', 'FUQARO_BILDIRGAN')]);
      qosh([yoz(30, 'HA', 'TEKSHIRILGAN')]);
      qosh([yoz(30, 'YOQ', 'FUQARO_BILDIRGAN')]);
      for (let i = 0; i < 6; i++) qosh([]);
      const b = korsatkichlarniHisobla(ishlar, HOZIR).bosqichlar[0];
      return (
        b.kohort === 10 && b.qolgan === 3 && b.ketgan === 1 && b.nomalum === 6 &&
        b.qolishDarajasi === 0.75 && b.malumotQamrovi === 0.4 &&
        b.manbaQolgan.FUQARO_BILDIRGAN === 2 && b.manbaQolgan.TEKSHIRILGAN === 1
      );
    },
  },
  {
    nomi: 'Javobi "noma’lum" yozuv yoki manbasiz yozuv "ishda qolgan" deb sanalmaydi',
    tekshir: async () => {
      const y = (q: 'HA' | 'NOMALUM', m: 'FUQARO_BILDIRGAN' | 'NOMALUM') => ({
        kunBelgisi: 30,
        natija: 'MALUMOT_OLINDI' as const,
        tekshiruvSanasi: kunH(-1),
        manba: m,
        ishdaQolmoqda: q,
        oilaDaromadiSom: null,
        oldingiDaromadSom: null,
        daromadManbasi: 'NOMALUM' as const,
      });
      const ishlar: HisobIshi[] = [
        { ishsizId: 'a', boshlanganSana: kunH(-60), tugaganSana: null, kuzatuvlar: [y('NOMALUM', 'FUQARO_BILDIRGAN')] },
        { ishsizId: 'b', boshlanganSana: kunH(-60), tugaganSana: null, kuzatuvlar: [y('HA', 'NOMALUM')] },
      ];
      const b = korsatkichlarniHisobla(ishlar, HOZIR).bosqichlar[0];
      return b.qolgan === 0 && b.nomalum === 2 && b.nomalumSabablari.javobsiz === 2;
    },
  },
  {
    nomi: '"Bog‘lanib bo‘lmadi" — noma’lum (sababi bilan), "ishda qoldi" ham, "ketdi" ham EMAS',
    tekshir: async () => {
      const ishlar: HisobIshi[] = [
        {
          ishsizId: 'a',
          boshlanganSana: kunH(-60),
          tugaganSana: null,
          kuzatuvlar: [
            {
              kunBelgisi: 30,
              natija: 'BOGLANILMADI',
              tekshiruvSanasi: kunH(-1),
              manba: 'NOMALUM',
              ishdaQolmoqda: 'NOMALUM',
              oilaDaromadiSom: null,
              oldingiDaromadSom: null,
              daromadManbasi: 'NOMALUM',
            },
          ],
        },
      ];
      const b = korsatkichlarniHisobla(ishlar, HOZIR).bosqichlar[0];
      return b.qolgan === 0 && b.ketgan === 0 && b.nomalum === 1 && b.nomalumSabablari.boglanilmadi === 1;
    },
  },
  {
    nomi: 'Muddati hali kelmagan ish kohortga KIRMAYDI (20 kunlik ish 30 kunlik hisobda yo‘q)',
    tekshir: async () => {
      const ishlar: HisobIshi[] = [
        { ishsizId: 'a', boshlanganSana: kunH(-20), tugaganSana: null, kuzatuvlar: [] },
        { ishsizId: 'b', boshlanganSana: kunH(-45), tugaganSana: null, kuzatuvlar: [] },
      ];
      const k = korsatkichlarniHisobla(ishlar, HOZIR);
      return k.bosqichlar[0].kohort === 1 && k.bosqichlar[1].kohort === 0 && k.bosqichlar[2].kohort === 0;
    },
  },
  {
    nomi: 'Ish bosqichdan oldin tugagan — "ketgan", manba "xodim qayd etgan" (ish voqeasidagi tugash sanasi)',
    tekshir: async () => {
      const ishlar: HisobIshi[] = [
        { ishsizId: 'a', boshlanganSana: kunH(-100), tugaganSana: kunH(-80), kuzatuvlar: [] },
      ];
      const b = korsatkichlarniHisobla(ishlar, HOZIR).bosqichlar[0];
      return b.ketgan === 1 && b.manbaKetgan.XODIM_QAYD_ETGAN === 1 && b.nomalum === 0;
    },
  },
  {
    /*
     * ISH ALMASHTIRGAN FUQARO YANGI FUQARO EMAS.
     */
    nomi: 'Ish almashtirgan fuqaro BIR marta sanaladi, ish voqealari esa ikkita',
    tekshir: async () => {
      const ishlar: HisobIshi[] = [
        { ishsizId: 'bir', boshlanganSana: kunH(-200), tugaganSana: kunH(-120), kuzatuvlar: [] },
        { ishsizId: 'bir', boshlanganSana: kunH(-110), tugaganSana: null, kuzatuvlar: [] },
        { ishsizId: 'ikki', boshlanganSana: kunH(-110), tugaganSana: null, kuzatuvlar: [] },
      ];
      const k = korsatkichlarniHisobla(ishlar, HOZIR);
      return k.joylashganFuqarolar === 2 && k.ishVoqealari === 3 && k.birNechtaIshdaBolganlar === 1;
    },
  },
  {
    nomi: 'Daromad o‘zgarishi FAQAT ikkala qiymat ma’lum bo‘lganda; noma’lum o‘rtachani buzmaydi',
    tekshir: async () => {
      const y = (oila: bigint | null, oldin_: bigint | null, kun = 1) => ({
        kunBelgisi: 30,
        natija: 'MALUMOT_OLINDI' as const,
        tekshiruvSanasi: kunH(-kun),
        manba: 'FUQARO_BILDIRGAN' as const,
        ishdaQolmoqda: 'HA' as const,
        oilaDaromadiSom: oila,
        oldingiDaromadSom: oldin_,
        daromadManbasi: oila === null ? ('NOMALUM' as const) : ('FUQARO_BILDIRGAN' as const),
      });
      const ishlar: HisobIshi[] = [
        { ishsizId: 'a', boshlanganSana: kunH(-60), tugaganSana: null, kuzatuvlar: [y(3_000_000n, 2_000_000n)] }, // +1M
        { ishsizId: 'b', boshlanganSana: kunH(-60), tugaganSana: null, kuzatuvlar: [y(2_500_000n, 2_000_000n)] }, // +0.5M
        { ishsizId: 'c', boshlanganSana: kunH(-60), tugaganSana: null, kuzatuvlar: [y(2_000_000n, 3_000_000n)] }, // -1M
        { ishsizId: 'd', boshlanganSana: kunH(-60), tugaganSana: null, kuzatuvlar: [y(null, 2_000_000n)] }, // noma'lum
        { ishsizId: 'e', boshlanganSana: kunH(-60), tugaganSana: null, kuzatuvlar: [y(4_000_000n, null)] }, // boshlang'ich noma'lum
      ];
      const d = korsatkichlarniHisobla(ishlar, HOZIR).daromad;
      return (
        d.juftlar === 3 && d.nomalum === 2 && d.oshgan === 2 && d.tushgan === 1 && d.ozgarmagan === 0 &&
        d.medianaOzgarish === 500_000
      );
    },
  },
  {
    nomi: 'Daromad rostdan 0 so‘m bo‘lsa — qiymat (noma’lum emas): 0 so‘mga tushgan oila "tushgan" deb sanaladi',
    tekshir: async () => {
      const ishlar: HisobIshi[] = [
        {
          ishsizId: 'a',
          boshlanganSana: kunH(-60),
          tugaganSana: null,
          kuzatuvlar: [
            {
              kunBelgisi: 30,
              natija: 'MALUMOT_OLINDI',
              tekshiruvSanasi: kunH(-1),
              manba: 'FUQARO_BILDIRGAN',
              ishdaQolmoqda: 'YOQ',
              oilaDaromadiSom: 0n,
              oldingiDaromadSom: 2_000_000n,
              daromadManbasi: 'FUQARO_BILDIRGAN',
            },
          ],
        },
      ];
      const d = korsatkichlarniHisobla(ishlar, HOZIR).daromad;
      return d.juftlar === 1 && d.tushgan === 1 && d.medianaOzgarish === -2_000_000;
    },
  },
  {
    nomi: 'Daromadda har fuqaroning ENG OXIRGI yozuvi, bir marta (30 va 90 kunlik ikkalasi bor bo‘lsa 90 kunlik)',
    tekshir: async () => {
      const y = (kun: number, oila: bigint, sana: number) => ({
        kunBelgisi: kun,
        natija: 'MALUMOT_OLINDI' as const,
        tekshiruvSanasi: kunH(sana),
        manba: 'FUQARO_BILDIRGAN' as const,
        ishdaQolmoqda: 'HA' as const,
        oilaDaromadiSom: oila,
        oldingiDaromadSom: 1_000_000n,
        daromadManbasi: 'FUQARO_BILDIRGAN' as const,
      });
      const ishlar: HisobIshi[] = [
        {
          ishsizId: 'a',
          boshlanganSana: kunH(-120),
          tugaganSana: null,
          kuzatuvlar: [y(30, 1_500_000n, -90), y(90, 3_000_000n, -2)],
        },
      ];
      const d = korsatkichlarniHisobla(ishlar, HOZIR).daromad;
      return d.juftlar === 1 && d.medianaOzgarish === 2_000_000;
    },
  },
  {
    nomi: 'Daromad ma’lumoti yo‘q bo‘lsa mediana NULL (0 emas)',
    tekshir: async () => {
      const k = korsatkichlarniHisobla([], HOZIR);
      return k.daromad.medianaOzgarish === null && k.daromad.juftlar === 0 && k.joylashganFuqarolar === 0;
    },
  },

  /* ══ 4. BAZA: YOZISH ══ */
  {
    nomi: 'Tekshiruv yoziladi: muddat, ma’lumot sanasi, kiritilgan sana, yozgan xodim — alohida; xatlov daromadi boshlang‘ich bo‘ladi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 40);
      const r = await kuzatuvYozish(
        sessiya('BANDLIK', bandlik, null),
        kiritish(ish.id, { oilaDaromadiSom: 3_000_000, daromadManbasi: 'FUQARO_BILDIRGAN', ishHaqiSom: 2_000_000 })
      );
      const y = await prisma.kuzatuvTekshiruvi.findUnique({ where: { id: r.id } });
      return (
        r.yangi &&
        y !== null &&
        y.rejaSana.getTime() === muddatSanasi(ish.boshlanganSana, 30).getTime() &&
        y.kiritganId === bandlik &&
        y.manba === 'FUQARO_BILDIRGAN' &&
        y.tasdiqSanasi === null &&
        y.oilaDaromadiSom === 3_000_000n &&
        y.ishHaqiSom === 2_000_000n &&
        y.createdAt.getTime() >= y.tekshiruvSanasi.getTime() - 5000
      );
    },
  },
  {
    nomi: 'Bir ishning bir bosqichiga BITTA yozuv: qayta yuborish yangilaydi, ikkinchisini yaratmaydi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 40);
      const s = sessiya('BANDLIK', bandlik, null);
      const a = await kuzatuvYozish(s, kiritish(ish.id, { sharoitMos: 'YOQ' }));
      const b = await kuzatuvYozish(s, kiritish(ish.id, { sharoitMos: 'HA' }));
      const soni = await prisma.kuzatuvTekshiruvi.count({ where: { joylashishId: ish.id, kunBelgisi: 30 } });
      const y = await prisma.kuzatuvTekshiruvi.findUnique({ where: { id: a.id } });
      return a.yangi && !b.yangi && a.id === b.id && soni === 1 && y?.sharoitMos === 'HA';
    },
  },
  {
    nomi: 'Parallel yozuv: 6 ta bir vaqtdagi so‘rovdan bazada FAQAT BITTA yozuv qoladi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 40);
      const s = sessiya('BANDLIK', bandlik, null);
      const n = await Promise.allSettled(
        Array.from({ length: 6 }, () => kuzatuvYozish(s, kiritish(ish.id)))
      );
      const soni = await prisma.kuzatuvTekshiruvi.count({ where: { joylashishId: ish.id, kunBelgisi: 30 } });
      return soni === 1 && n.every((x) => x.status === 'fulfilled');
    },
  },
  {
    nomi: 'Tekshirilgan (dalilli) yozuvni pastroq daraja bilan QAYTA YOZIB bo‘lmaydi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 40);
      const dalil = await dalilYarat(f, ish.id, 'TASDIQLANDI');
      const s = sessiya('BANDLIK', bandlik, null);
      const a = await kuzatuvYozish(s, kiritish(ish.id, { manba: 'TEKSHIRILGAN', dalilId: dalil }));
      const y = await prisma.kuzatuvTekshiruvi.findUnique({ where: { id: a.id } });
      try {
        await kuzatuvYozish(s, kiritish(ish.id, { manba: 'FUQARO_BILDIRGAN', ishdaQolmoqda: 'NOMALUM', ishBoshladi: 'HA' }));
        return false;
      } catch (e) {
        const hamon = await prisma.kuzatuvTekshiruvi.findUnique({ where: { id: a.id } });
        return (
          e instanceof KuzatuvXatosi && e.kod === 'TEKSHIRILGAN' &&
          hamon?.manba === 'TEKSHIRILGAN' && y?.tasdiqSanasi !== null
        );
      }
    },
  },
  {
    nomi: 'Dalil: boshqa fuqaroniki, tasdiqlanmagan yoki boshqa ishga bog‘langan dalil bilan "tekshirilgan" bo‘lmaydi',
    tekshir: async () => {
      const f1 = await fuqaroYarat(mahallaA);
      const f2 = await fuqaroYarat(mahallaA);
      const ish1 = await ishYarat(f1, 40);
      const ish1b = await ishYarat(f1, 45);
      const begona = await dalilYarat(f2, null, 'TASDIQLANDI');
      const tasdiqsiz = await dalilYarat(f1, null, 'KIRITILDI');
      const boshqaIsh = await dalilYarat(f1, ish1b.id, 'TASDIQLANDI');
      const yaxshi = await dalilYarat(f1, ish1.id, 'TASDIQLANDI');
      const s = sessiya('BANDLIK', bandlik, null);
      const urin = async (dalilId: string) => {
        try {
          await kuzatuvYozish(s, kiritish(ish1.id, { manba: 'TEKSHIRILGAN', dalilId }));
          return true;
        } catch (e) {
          return !(e instanceof KuzatuvXatosi && e.kod === 'DALIL') ? 'boshqa' : false;
        }
      };
      return (
        (await urin(begona)) === false &&
        (await urin(tasdiqsiz)) === false &&
        (await urin(boshqaIsh)) === false &&
        (await urin('mavjud-emas')) === false &&
        (await urin(yaxshi)) === true
      );
    },
  },
  {
    nomi: '"Tekshirilgan" yozuvda tasdiq sanasi qo‘yiladi; boshqa darajada qo‘yilmaydi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 100);
      const dalil = await dalilYarat(f, ish.id, 'TASDIQLANDI');
      const s = sessiya('BANDLIK', bandlik, null);
      const a = await kuzatuvYozish(s, kiritish(ish.id, { kunBelgisi: 60, manba: 'TEKSHIRILGAN', dalilId: dalil }));
      const b = await kuzatuvYozish(s, kiritish(ish.id, { kunBelgisi: 90, manba: 'FUQARO_BILDIRGAN' }));
      const ya = await prisma.kuzatuvTekshiruvi.findUnique({ where: { id: a.id } });
      const yb = await prisma.kuzatuvTekshiruvi.findUnique({ where: { id: b.id } });
      return ya?.tasdiqSanasi !== null && yb?.tasdiqSanasi === null;
    },
  },
  {
    nomi: '"Ishdan ketgan" yozilsa ish voqeasi sabab va sana bilan TUGATILADI (mavjud mexanizm orqali)',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 40);
      const tugash = oldin(5);
      const r = await kuzatuvYozish(
        sessiya('BANDLIK', bandlik, null),
        kiritish(ish.id, { ishdaQolmoqda: 'YOQ', tugashSababi: 'Maosh kelishilganidan kam edi', tugaganSana: tugash })
      );
      const v = await prisma.ishgaJoylashish.findUnique({ where: { id: ish.id } });
      return (
        r.ishTugatildi &&
        v?.holati === 'TUGADI' &&
        v.tugaganSana?.getTime() === tugash.getTime() &&
        (v.tugashSababi ?? '').includes('Maosh')
      );
    },
  },
  {
    nomi: 'Kuzatuv fuqaroning holatini o‘zgartirmaydi va tasdiq (dalil) yaratmaydi — faqat ko‘rsatkich yozadi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 40);
      await kuzatuvYozish(sessiya('BANDLIK', bandlik, null), kiritish(ish.id));
      const p = await prisma.unemployedPerson.findUnique({ where: { id: f } });
      const dalillar = await prisma.joylashuvDalili.count({ where: { ishsizId: f } });
      const k = kodiOl(oqi('src/lib/kuzatuv.ts'));
      return (
        p?.holati === 'JOYLASHTIRILDI' &&
        dalillar === 0 &&
        !k.includes('unemployedPerson.update') &&
        !k.includes('dalilQoshish')
      );
    },
  },

  /* ══ 5. HUQUQ ══ */
  {
    nomi: 'Boshqa mahalla xodimi (YETTILIK) bu fuqaroning kuzatuvini yoza OLMAYDI',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 40);
      try {
        await kuzatuvYozish(sessiya('YETTILIK', yettilikB, mahallaB), kiritish(ish.id));
        return false;
      } catch (e) {
        return e instanceof KuzatuvXatosi && e.kod === 'RUXSAT';
      }
    },
  },
  {
    nomi: 'Arxivdagi fuqaroning ishi "topilmadi"',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA, { arxivSanasi: new Date(), arxivSababi: 'sinov arxivi' });
      const ish = await ishYarat(f, 40);
      try {
        await kuzatuvYozish(sessiya('BANDLIK', bandlik, null), kiritish(ish.id));
        return false;
      } catch (e) {
        return e instanceof KuzatuvXatosi && e.kod === 'TOPILMADI';
      }
    },
  },
  {
    nomi: 'Mavjud bo‘lmagan ish voqeasi — "topilmadi"',
    tekshir: async () => {
      try {
        await kuzatuvYozish(sessiya('BANDLIK', bandlik, null), kiritish('yoq-id'));
        return false;
      } catch (e) {
        return e instanceof KuzatuvXatosi && e.kod === 'TOPILMADI';
      }
    },
  },

  /* ══ 6. RO'YXAT (muddati kelganlar) ══ */
  {
    nomi: 'Muddati o‘tgan ish ro‘yxatda ko‘rinadi; yozilgach — yo‘qoladi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 40); // 30 kunlik muddati 10 kun oldin o'tgan
      const oldinR = await kuzatuvIshlari(mahallaA);
      const bor = oldinR.find((i) => i.joylashishId === ish.id && i.kun === 30);
      await kuzatuvYozish(sessiya('BANDLIK', bandlik, null), kiritish(ish.id));
      const keyin = await kuzatuvIshlari(mahallaA);
      return (
        bor?.holat === 'kechikdi' &&
        Math.abs(bor.kunFarqi) === 10 &&
        !keyin.some((i) => i.joylashishId === ish.id && i.kun === 30)
      );
    },
  },
  {
    nomi: 'Ro‘yxat mahalla bo‘yicha ajratadi: boshqa mahalla ishi ko‘rinmaydi',
    tekshir: async () => {
      const fA = await fuqaroYarat(mahallaA);
      const fB = await fuqaroYarat(mahallaB);
      const ishA = await ishYarat(fA, 40);
      const ishB = await ishYarat(fB, 40);
      const faqatA = await kuzatuvIshlari(mahallaA);
      return (
        faqatA.some((i) => i.joylashishId === ishA.id) && !faqatA.some((i) => i.joylashishId === ishB.id)
      );
    },
  },
  {
    nomi: 'Juda eski ish (muddatidan 120+ kun o‘tgan) ro‘yxatni to‘ldirmaydi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const eski = await ishYarat(f, 700);
      const r = await kuzatuvIshlari(mahallaA);
      return !r.some((i) => i.joylashishId === eski.id);
    },
  },
  {
    nomi: 'Bosqichdan oldin tugagan ish ro‘yxatda "kechikdi" bo‘lib qolmaydi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 100, { tugaganSana: oldin(80), holati: 'TUGADI' }); // 20 kun ishlagan
      const r = await kuzatuvIshlari(mahallaA);
      return !r.some((i) => i.joylashishId === ish.id);
    },
  },
  {
    nomi: 'Arxivdagi fuqaro ro‘yxatda ko‘rinmaydi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA, { arxivSanasi: new Date(), arxivSababi: 'sinov' });
      const ish = await ishYarat(f, 40);
      const r = await kuzatuvIshlari(mahallaA);
      return !r.some((i) => i.joylashishId === ish.id);
    },
  },
  {
    nomi: '"Bog‘lanib bo‘lmadi" yozuvi qayta urinish sanasi kelganda ro‘yxatga QAYTADI',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      const ish = await ishYarat(f, 40);
      await kuzatuvYozish(
        sessiya('BANDLIK', bandlik, null),
        kiritish(ish.id, { natija: 'BOGLANILMADI', ishBoshladi: 'NOMALUM', ishdaQolmoqda: 'NOMALUM', manba: 'NOMALUM' })
      );
      const hozir = await kuzatuvIshlari(mahallaA);
      /* Ertaga emas — 5 kundan keyin */
      const keyin = await kuzatuvIshlari(mahallaA, new Date(Date.now() + 5 * KUN));
      return (
        !hozir.some((i) => i.joylashishId === ish.id && i.kun === 30 && i.holat === 'qayta_urinish') &&
        keyin.some((i) => i.joylashishId === ish.id && i.kun === 30 && i.holat === 'qayta_urinish')
      );
    },
  },

  /* ══ 7. BAZADAN KO'RSATKICH ══ */
  {
    nomi: 'Bazadan hisob: arxiv va boshqa mahalla chiqariladi; ish almashtirgan bir marta sanaladi',
    tekshir: async () => {
      /* Yangi, toza mahalla yo'q — shuning uchun FARQ bilan o'lchaymiz */
      const oldin_ = await kuzatuvKorsatkichlari(mahallaA);
      const f = await fuqaroYarat(mahallaA);
      await ishYarat(f, 200, { tugaganSana: oldin(120), holati: 'TUGADI' });
      await ishYarat(f, 100);
      const arxiv = await fuqaroYarat(mahallaA, { arxivSanasi: new Date(), arxivSababi: 'sinov' });
      await ishYarat(arxiv, 100);
      const fB = await fuqaroYarat(mahallaB);
      await ishYarat(fB, 100);
      const keyin = await kuzatuvKorsatkichlari(mahallaA);
      return (
        keyin.joylashganFuqarolar === oldin_.joylashganFuqarolar + 1 &&
        keyin.ishVoqealari === oldin_.ishVoqealari + 2 &&
        keyin.birNechtaIshdaBolganlar === oldin_.birNechtaIshdaBolganlar + 1
      );
    },
  },

  /* ══ 8. VAZIFALAR TAXTASI ══ */
  {
    nomi: 'Vazifalar taxtasida kuzatuv bloki: bandlik xodimiga ko‘rinadi, hokim va mahalla xodimiga ko‘rinmaydi',
    tekshir: async () => {
      const f = await fuqaroYarat(mahallaA);
      await ishYarat(f, 40);
      const b = await vazifalarim({ userId: bandlik, rol: 'BANDLIK', mahallaId: null });
      const h = await vazifalarim({ userId: bandlik, rol: 'HOKIM', mahallaId: null });
      const y = await vazifalarim({ userId: yettilikB, rol: 'YETTILIK', mahallaId: mahallaB });
      const blok = b.bloklar.find((x) => x.kalit === 'kuzatuv-306090');
      return (
        blok !== undefined &&
        blok.soni > 0 &&
        blok.ogohlik === 'shoshilinch' &&
        blok.yol === '/kuzatuv' &&
        !h.bloklar.some((x) => x.kalit === 'kuzatuv-306090') &&
        !y.bloklar.some((x) => x.kalit === 'kuzatuv-306090')
      );
    },
  },
  {
    nomi: 'Kuzatuv bloki hisoblash usulini ko‘rsatadi (usul, manba, ogohlantirish)',
    tekshir: async () => {
      const b = await vazifalarim({ userId: bandlik, rol: 'BANDLIK', mahallaId: null });
      const blok = b.bloklar.find((x) => x.kalit === 'kuzatuv-306090');
      return !!blok?.hisoblash?.usuli && !!blok.hisoblash.manbasi && !!blok.hisoblash.ogohlik;
    },
  },

  /* ══ 9. API, MENYU, MIGRATSIYA ══ */
  {
    nomi: 'API sessiya talab qiladi; hokim va mahalla xodimiga yopiq (bu sahifaga ular kira olmaydi)',
    tekshir: async () => {
      const k = kodiOl(oqi('src/app/api/kuzatuv/route.ts'));
      return (
        k.includes('talabQil(') &&
        k.includes("'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'") &&
        !k.includes("'HOKIM'") &&
        !k.includes("'YETTILIK'") &&
        k.includes('instanceof NextResponse')
      );
    },
  },
  {
    nomi: 'Menyuda "Kuzatuv 30/60/90": bandlik, rahbar, admin ko‘radi; hokim va mahalla xodimi ko‘rmaydi',
    tekshir: async () => {
      const band = MENYU.find((b) => b.yol === '/kuzatuv');
      return (
        !!band &&
        yolgaRuxsat('BANDLIK', '/kuzatuv') &&
        yolgaRuxsat('BANDLIK_RAHBAR', '/kuzatuv') &&
        yolgaRuxsat('ADMIN', '/kuzatuv') &&
        !yolgaRuxsat('HOKIM', '/kuzatuv') &&
        !yolgaRuxsat('YETTILIK', '/kuzatuv')
      );
    },
  },
  {
    nomi: 'Fuqaro sahifasidagi kuzatuv bloki va hokim ko‘rsatkichi xatoni yutadi (sahifa yiqilmaydi)',
    tekshir: async () => {
      const a = kodiOl(oqi('src/components/kuzatuv/kuzatuv-blogi.tsx'));
      const b = kodiOl(oqi('src/components/kuzatuv/korsatkich-blogi.tsx'));
      return a.includes('catch (e)') && a.includes('return null') && b.includes('catch (e)') && b.includes('return null');
    },
  },
  {
    nomi: 'Ko‘rsatkich bloki hisoblash usuli, davr, manba va "dastur sababi deb e’lon qilinmaydi" ogohlantirishini ko‘rsatadi',
    tekshir: async () => {
      const b = oqi('src/components/kuzatuv/korsatkich-blogi.tsx');
      const n = oqi('src/lib/kuzatuv-nomlari.ts');
      return (
        b.includes('HISOBLASH_USULI.davr') &&
        b.includes('HISOBLASH_USULI.manba') &&
        b.includes('HISOBLASH_USULI.ogohlantirish') &&
        n.includes('исботламайди')
      );
    },
  },
  {
    nomi: 'Migratsiya faqat qo‘shadi va takror yurgizilsa xato bermaydi',
    tekshir: async () => {
      const sql = oqi('prisma/migrations/20261001120000_kuzatuv_30_60_90/migration.sql');
      const xavfli = /\b(DROP\s+(TABLE|COLUMN|TYPE)|RENAME|TRUNCATE|SET\s+NOT\s+NULL|ALTER\s+TABLE\s+"(?!KuzatuvTekshiruvi)\w+")\b/i.test(sql);
      return !xavfli && sql.includes('IF NOT EXISTS "KuzatuvTekshiruvi"'.replace('IF NOT EXISTS "', 'IF NOT EXISTS "'));
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
