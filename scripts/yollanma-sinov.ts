/**
 * ============================================================
 *  ISH BERUVCHI: E'LONLARIM, NOMZOD YO'LLANMASI VA E'LON SIFATI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/yollanma-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *   1. ISH BERUVCHI BEGONA E'LONNI BOSHQARSA — raqobatchining e'lonini
 *      yopib qo'yishi yoki maoshini o'zgartirishi mumkin.
 *
 *   2. FUQARO MA'LUMOTI ROZILIKSIZ KETSA — telefon begona kishiga
 *      beriladi. Yuborish xato bersa-yu "yuborildi" deb yozilsa, ish
 *      beruvchi hech narsa olmagan bo'ladi.
 *
 *   3. ISH BERUVCHI AYTGANI TASDIQLANGAN JOYLASHISH BO'LIB KETSA —
 *      hokimning raqami ish beruvchining gapidan o'sadi.
 *
 *   4. TASDIQLANGAN E'LONDA MAOSHNI JIMGINA O'ZGARTIRISH — moderatsiyani
 *      aylanib o'tish.
 *
 *  Hammasi bazadagi haqiqiy yozuvlar bilan sinaladi.
 * ============================================================
 */
import { maoshniOqi } from '../src/lib/maosh-matni';
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  amallar,
  elonHolati,
  elonKorinishi,
  elonMuddatiniUzaytir,
  elonlarimRoyxati,
  elonniQaytaYubor,
  elonniYopish,
  tahrirMatni,
  tahrirQiymati,
  tahrirSuhbatiBormi,
} from '../src/lib/beruvchi-elonlari';
import { elonniHalQil } from '../src/lib/ish-beruvchi';
import { muddatiOtganlarniYop } from '../src/lib/elon-muddati';
import type { Tranzaksiya } from '../src/lib/prisma';
import { muddatiTugaganlarniOgohlantir } from '../src/lib/beruvchi-elonlari';
import {
  MAOSH_FARQI_MARTA,
  elonSifatiniBaho,
  elonlarSifati,
  gumonliIbora,
  medianaOl,
  telefonKaliti,
  type SifatManbai,
} from '../src/lib/elon-sifati';
import {
  YollanmaXatosi,
  beruvchiNatijasi,
  beruvchiTugmalari,
  beruvchiXabari,
  beruvchigaYuborish,
  javobsizYollanmalar,
  rozilikQayd,
  rozilikniQaytar,
  xodimHolati,
  yollanmaYaratish,
  YOLLANMA_NOMI,
} from '../src/lib/yollanma';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const KUN = 24 * 60 * 60 * 1000;
const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const oqi = (y: string) => readFileSync(y, 'utf8');
const noyob = (a: string) => `${a} ${Date.now()}${Math.floor(Math.random() * 100000)}`;
const keyin = (n: number, h = new Date()) => new Date(h.getTime() + n * KUN);

let mahallaA = '';
let mahallaB = '';
let bandlik = '';
let yettilikB = '';
let beruvchi1 = '';
let beruvchi2 = '';
const elonlar: string[] = [];
const fuqarolar: string[] = [];
const xodimlar: string[] = [];
const beruvchilar: string[] = [];

const kim = (rol: 'BANDLIK' | 'YETTILIK', userId: string, mahallaId: string | null) => ({ rol, userId, mahallaId });

async function tayyorla() {
  const m = await prisma.mahalla.findMany({ take: 2, select: { id: true } });
  if (m.length < 2) throw new Error('Sinov uchun ikkita mahalla kerak — `prisma db seed`');
  mahallaA = m[0].id;
  mahallaB = m[1].id;

  const x1 = await prisma.user.create({
    data: { username: noyob('sinov_yol_b').replace(/\s/g, '_'), fullName: 'Sinov Bandlik', passwordHash: 'x', rol: 'BANDLIK' },
    select: { id: true },
  });
  const x2 = await prisma.user.create({
    data: { username: noyob('sinov_yol_y').replace(/\s/g, '_'), fullName: 'Sinov Yettilik B', passwordHash: 'x', rol: 'YETTILIK', mahallaId: mahallaB },
    select: { id: true },
  });
  bandlik = x1.id;
  yettilikB = x2.id;
  xodimlar.push(x1.id, x2.id);

  /* Ish beruvchilar: Telegram chat id si SOXTA (haqiqiy odamga xabar bormasligi uchun) */
  const mk = async (nom: string) => {
    const b = await prisma.ishBeruvchi.create({
      data: {
        telegramChatId: `sinov-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        holati: 'TASDIQLANDI',
        korxonaNomi: nom,
        masulShaxs: 'Sinov Shaxs',
        telefon: '+998901234567',
        mahallaId: mahallaA,
      },
      select: { id: true },
    });
    beruvchilar.push(b.id);
    return b.id;
  };
  beruvchi1 = await mk(noyob('Sinov Korxona 1'));
  beruvchi2 = await mk(noyob('Sinov Korxona 2'));
}

async function tozala() {
  await prisma.xabarnoma.deleteMany({ where: { bogliqId: { in: elonlar } } });
  /* Yo'llanmalar e'lon va fuqaro bilan birga (Cascade) */
  await prisma.vacancy.deleteMany({ where: { id: { in: elonlar } } });
  await prisma.unemployedPerson.deleteMany({ where: { id: { in: fuqarolar } } });
  await prisma.ishBeruvchi.deleteMany({ where: { id: { in: beruvchilar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
}

async function elonYarat(q: Record<string, unknown> = {}, mahalla = mahallaA) {
  const e = await prisma.vacancy.create({
    data: {
      lavozim: noyob('Sinov lavozim'),
      korxonaNomi: noyob('Sinov Korxona'),
      mahallaId: mahalla,
      ornlarSoni: 2,
      moderatsiya: 'TASDIQLANDI',
      amalQilishMuddati: keyin(20),
      ishBeruvchiId: beruvchi1,
      ...q,
    },
    select: { id: true, lavozim: true },
  });
  elonlar.push(e.id);
  return e;
}

async function fuqaroYarat(mahalla = mahallaA, q: Record<string, unknown> = {}) {
  const f = await prisma.unemployedPerson.create({
    data: {
      fish: noyob('Yollanma Sinov'),
      telefon: '+998901112233',
      mutaxassisligi: 'Payvandchi',
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

/** Soxta Telegram bilan: yuborilgan deb belgilangan yo'llanma (ish beruvchi natijasi uchun) */
async function yuborilganYollanma(beruvchiId = beruvchi1) {
  const e = await elonYarat({ ishBeruvchiId: beruvchiId });
  const f = await fuqaroYarat();
  const r = await yollanmaYaratish(kim('BANDLIK', bandlik, null), { ishsizId: f, vacancyId: e.id });
  await prisma.nomzodYollanmasi.update({
    where: { id: r.id },
    data: { rozilik: true, roziligiSana: new Date(), roziligiUsuli: 'TELEFON', ulashilgan: ['fish'], ulashilganSana: new Date() },
  });
  return { yollanma: r.id, elon: e.id, fuqaro: f };
}

/** To'liq, toza e'lon (belgi bo'lmasligi kerak) */
const toza = (q: Partial<SifatManbai> = {}): SifatManbai => ({
  lavozim: 'Payvandchi',
  talablar: 'Kamida 2 yil tajriba, ish kiyimi',
  telefon: '+998901234567',
  maosh: 4_000_000,
  jadvali: 'Du-Sha 8:00-17:00',
  sharoitlari: 'Ovqat bepul',
  amalQilishMuddati: keyin(20),
  createdAt: keyin(-3),
  updatedAt: keyin(-1),
  ...q,
});
const KONTEKST = { hozir: new Date(), medianaMaosh: 4_000_000, telefonKorxonalari: 1 };
const kalitlar = (b: ReturnType<typeof elonSifatiniBaho>) => b.map((x) => x.kalit);

const SINOVLAR: Sinov[] = [
  /* ══ 1. E'LON SIFATI (toza funksiya) ══ */
  {
    nomi: 'To‘liq e‘lon uchun sifat belgisi YO‘Q',
    tekshir: async () => elonSifatiniBaho(toza(), KONTEKST).length === 0,
  },
  {
    nomi: 'Maosh, talab, telefon, jadval yo‘q bo‘lsa — har biri alohida belgi',
    tekshir: async () => {
      const k = kalitlar(
        elonSifatiniBaho(toza({ maosh: null, talablar: null, telefon: null, jadvali: null }), KONTEKST)
      );
      return ['maosh-yoq', 'talab-yoq', 'telefon-yoq', 'jadval-yoq'].every((x) => k.includes(x as never));
    },
  },
  {
    nomi: 'Muddatsiz e‘lon va muddati 3 kunda tugaydigan e‘lon belgilanadi; 10 kunlik — yo‘q',
    tekshir: async () => {
      const a = kalitlar(elonSifatiniBaho(toza({ amalQilishMuddati: null }), KONTEKST));
      const b = kalitlar(elonSifatiniBaho(toza({ amalQilishMuddati: keyin(2) }), KONTEKST));
      const c = kalitlar(elonSifatiniBaho(toza({ amalQilishMuddati: keyin(10) }), KONTEKST));
      return a.includes('muddatsiz') && b.includes('muddati-yaqin') && !c.includes('muddati-yaqin') && !c.includes('muddatsiz');
    },
  },
  {
    nomi: '21 kundan beri tegilmagan e‘lon "yangilanmagan"; 5 kunlik — yo‘q',
    tekshir: async () => {
      const eski = kalitlar(elonSifatiniBaho(toza({ updatedAt: keyin(-30) }), KONTEKST));
      const yangi = kalitlar(elonSifatiniBaho(toza({ updatedAt: keyin(-5) }), KONTEKST));
      return eski.includes('yangilanmagan') && !yangi.includes('yangilanmagan');
    },
  },
  {
    /*
     * Mutlaq "eng kam maosh" tizimga yozilmagan: u o'zgarib turadi.
     * Faqat boshqa faol e'lonlarga nisbatan solishtiriladi.
     */
    nomi: 'Maosh medianadan 4 baravar katta yoki kichik bo‘lsa "gumonli"; oddiy farq — yo‘q',
    tekshir: async () => {
      const yuqori = kalitlar(elonSifatiniBaho(toza({ maosh: 4_000_000 * MAOSH_FARQI_MARTA }), KONTEKST));
      const past = kalitlar(elonSifatiniBaho(toza({ maosh: 1_000_000 }), KONTEKST));
      const oddiy = kalitlar(elonSifatiniBaho(toza({ maosh: 6_000_000 }), KONTEKST));
      return yuqori.includes('maosh-gumonli') && past.includes('maosh-gumonli') && !oddiy.includes('maosh-gumonli');
    },
  },
  {
    nomi: 'Taqqoslash uchun e‘lon yetmasa (5 tadan kam) mediana yo‘q — maosh "gumonli" deyilmaydi',
    tekshir: async () => {
      const m = medianaOl([1, 2, 3, 4]);
      const k = kalitlar(
        elonSifatiniBaho(toza({ maosh: 90_000_000 }), { hozir: new Date(), medianaMaosh: m, telefonKorxonalari: 1 })
      );
      return m === null && !k.includes('maosh-gumonli') && medianaOl([1, 2, 3, 4, 100]) === 3;
    },
  },
  {
    nomi: 'Pul so‘raydigan ibora lotinda ham, kirillda ham, apostrofli ham topiladi; oddiy matn — yo‘q',
    tekshir: async () => {
      return (
        gumonliIbora("Ishga kirish uchun oldindan to'lov qiling") !== null &&
        gumonliIbora('Олдиндан тўлов керак') !== null &&
        gumonliIbora('Kafolatlangan daromad, oyiga 20 mln') !== null &&
        gumonliIbora('Depozit 500 ming') !== null &&
        gumonliIbora('Payvandchi kerak, tajriba 2 yil, ovqat bepul') === null &&
        gumonliIbora('') === null
      );
    },
  },
  {
    nomi: 'Gumonli ibora e‘londa "tekshiring" belgisini beradi va "hukm" demaydi (matnda "firibgar" yo‘q)',
    tekshir: async () => {
      const b = elonSifatiniBaho(toza({ talablar: 'Ishga kirish uchun depozit to‘lanadi' }), KONTEKST);
      const g = b.find((x) => x.kalit === 'gumonli-soz');
      const kod = oqi('src/lib/elon-sifati.ts').toLowerCase();
      return !!g && g.jiddiylik === 'tekshirish' && !/фирибгар|firibgar/.test(g.izoh.toLowerCase()) && kod.includes('evristika');
    },
  },
  {
    nomi: 'Telefon kaliti turli yozilishni birlashtiradi: +998 90 123-45-67 = 901234567',
    tekshir: async () =>
      telefonKaliti('+998 90 123-45-67') === telefonKaliti('90 123 45 67') &&
      telefonKaliti('123') === null &&
      telefonKaliti(null) === null,
  },

  /* ══ 2. E'LON SIFATI (bazadan) ══ */
  {
    nomi: 'Bir telefon ikki XIL korxona nomida — "takror telefon"; bir korxonaning ikki e‘loni — yo‘q',
    tekshir: async () => {
      const tel = `+99890${Math.floor(1000000 + Math.random() * 8999999)}`;
      const a = await elonYarat({ telefon: tel, korxonaNomi: noyob('Alfa MChJ') });
      const b = await elonYarat({ telefon: tel, korxonaNomi: noyob('Beta MChJ') });
      const nom = noyob('Gamma MChJ');
      const tel2 = `+99891${Math.floor(1000000 + Math.random() * 8999999)}`;
      const c = await elonYarat({ telefon: tel2, korxonaNomi: nom });
      const d = await elonYarat({ telefon: tel2, korxonaNomi: nom });
      const r = await elonlarSifati(mahallaA);
      const has = (id: string) => r.find((x) => x.id === id)?.belgilar.some((x) => x.kalit === 'takror-telefon') ?? false;
      return has(a.id) && has(b.id) && !has(c.id) && !has(d.id);
    },
  },
  {
    nomi: 'Sifat ro‘yxati faqat KUCHDAGI e‘lonlarni oladi: yopilgan, muddati o‘tgan va moderatsiya kutayotgani kirmaydi',
    tekshir: async () => {
      const faol = await elonYarat();
      const yopiq = await elonYarat({ faol: false, yopilishSababi: 'QOLDA', yopilganSana: new Date() });
      const otgan = await elonYarat({ amalQilishMuddati: keyin(-2) });
      const kutadi = await elonYarat({ moderatsiya: 'KUTILMOQDA' });
      const r = (await elonlarSifati(mahallaA)).map((x) => x.id);
      return r.includes(faol.id) && !r.includes(yopiq.id) && !r.includes(otgan.id) && !r.includes(kutadi.id);
    },
  },
  {
    nomi: 'Sifat ro‘yxati mahalla bo‘yicha ajratadi',
    tekshir: async () => {
      const a = await elonYarat({}, mahallaA);
      const b = await elonYarat({}, mahallaB);
      const r = (await elonlarSifati(mahallaA)).map((x) => x.id);
      return r.includes(a.id) && !r.includes(b.id);
    },
  },

  /* ══ 3. E'LON HOLATI VA AMALLAR ══ */
  {
    nomi: 'E‘lon holati: moderatsiyada / faol / rad / muddati tugadi / to‘ldi / yopilgan',
    tekshir: async () => {
      const h = (q: Partial<Parameters<typeof elonHolati>[0]>) =>
        elonHolati({ faol: true, moderatsiya: 'TASDIQLANDI', amalQilishMuddati: keyin(10), yopilishSababi: null, ...q });
      return (
        h({ moderatsiya: 'KUTILMOQDA' }) === 'moderatsiyada' &&
        h({}) === 'faol' &&
        h({ moderatsiya: 'RAD_ETILDI', faol: false }) === 'rad' &&
        h({ amalQilishMuddati: keyin(-1) }) === 'muddati-tugadi' &&
        h({ faol: false, yopilishSababi: 'MUDDATI_TUGADI' }) === 'muddati-tugadi' &&
        h({ faol: false, yopilishSababi: 'TOLDI' }) === 'toldi' &&
        h({ faol: false, yopilishSababi: 'QOLDA' }) === 'yopilgan'
      );
    },
  },
  {
    nomi: 'Amallar: "to‘ldi" qayta ochilmaydi; rad/muddati tugagan qayta yuboriladi; faqat faol uzaytiriladi',
    tekshir: async () => {
      return (
        !amallar('toldi').qaytaYuborish &&
        !amallar('toldi').yopish &&
        amallar('rad').qaytaYuborish &&
        amallar('muddati-tugadi').qaytaYuborish &&
        amallar('faol').uzaytirish &&
        !amallar('moderatsiyada').uzaytirish &&
        amallar('faol').tahrir &&
        !amallar('rad').tahrir
      );
    },
  },
  {
    nomi: '"Eʼlonlarim" faqat O‘Z e‘lonlarini ko‘rsatadi (boshqa ish beruvchiniki yo‘q)',
    tekshir: async () => {
      const mening = await elonYarat({ ishBeruvchiId: beruvchi1, lavozim: noyob('MENING lavozim') });
      const begona = await elonYarat({ ishBeruvchiId: beruvchi2, lavozim: noyob('BEGONA lavozim') });
      const j = await elonlarimRoyxati(beruvchi1);
      const matn = j.matn + j.tugmalar.map((t) => t.yozuv + t.belgi).join(' ');
      return matn.includes(mening.id) && !matn.includes(begona.id) && !matn.includes('BEGONA');
    },
  },
  {
    nomi: 'Begona e‘lonni ko‘rib bo‘lmaydi: `elonKorinishi` boshqa ish beruvchi uchun null',
    tekshir: async () => {
      const e = await elonYarat({ ishBeruvchiId: beruvchi2 });
      return (await elonKorinishi(beruvchi1, e.id)) === null && (await elonKorinishi(beruvchi2, e.id)) !== null;
    },
  },
  {
    nomi: 'Rad etilgan e‘londa SABAB ko‘rinadi',
    tekshir: async () => {
      const e = await elonYarat({
        faol: false,
        moderatsiya: 'RAD_ETILDI',
        moderatsiyaSababi: 'Maosh ko‘rsatilmagan',
        yopilganSana: new Date(),
      });
      const j = await elonKorinishi(beruvchi1, e.id);
      return !!j && j.matn.includes('Maosh ko‘rsatilmagan') && j.tugmalar.some((t) => t.belgi.startsWith('b.eb:'));
    },
  },

  /* ══ 4. YOPISH VA MUDDAT ══ */
  {
    nomi: 'Ish beruvchi FAQAT o‘z e‘lonini yopadi: begona e‘lon "topilmadi" va faol qoladi; ikkinchi yopish "allaqachon"',
    tekshir: async () => {
      const e = await elonYarat({ ishBeruvchiId: beruvchi2 });
      const begona = await elonniYopish(beruvchi1, e.id);
      const hali = await prisma.vacancy.findUnique({ where: { id: e.id } });
      const oz = await elonniYopish(beruvchi2, e.id);
      const yana = await elonniYopish(beruvchi2, e.id);
      const yopiq = await prisma.vacancy.findUnique({ where: { id: e.id } });
      return (
        !begona.ok && begona.sabab === 'topilmadi' && hali?.faol === true &&
        oz.ok && !yana.ok && yana.sabab === 'allaqachon' &&
        yopiq?.faol === false && yopiq.yopilishSababi === 'QOLDA' && yopiq.yopilganSana !== null
      );
    },
  },
  {
    nomi: 'Muddatni uzaytirish +30 kun; 90 kun chegarasidan oshmaydi; chegarada "chegara"',
    tekshir: async () => {
      const hozir = new Date();
      const e = await elonYarat({ amalQilishMuddati: keyin(10, hozir) });
      const oqi = async () =>
        Math.round(
          (((await prisma.vacancy.findUnique({ where: { id: e.id } }))?.amalQilishMuddati?.getTime() ?? 0) -
            hozir.getTime()) /
            KUN
        );
      /* 10 → 40 → 70 → 90 (chegara: hozirdan 90 kun) → rad */
      const r1 = await elonMuddatiniUzaytir(beruvchi1, e.id, hozir);
      const k1 = await oqi();
      const r2 = await elonMuddatiniUzaytir(beruvchi1, e.id, hozir);
      const k2 = await oqi();
      const r3 = await elonMuddatiniUzaytir(beruvchi1, e.id, hozir);
      const k3 = await oqi();
      const r4 = await elonMuddatiniUzaytir(beruvchi1, e.id, hozir);
      const k4 = await oqi();
      return (
        r1.ok && k1 === 40 &&
        r2.ok && k2 === 70 &&
        r3.ok && k3 === 90 &&
        !r4.ok && r4.sabab === 'chegara' && k4 === 90
      );
    },
  },
  {
    nomi: 'Uzaytirish: moderatsiya kutayotgan, yopilgan va begona e‘londa mumkin emas',
    tekshir: async () => {
      const kut = await elonYarat({ moderatsiya: 'KUTILMOQDA' });
      const yopiq = await elonYarat({ faol: false, yopilishSababi: 'QOLDA', yopilganSana: new Date() });
      const begona = await elonYarat({ ishBeruvchiId: beruvchi2 });
      const a = await elonMuddatiniUzaytir(beruvchi1, kut.id);
      const b = await elonMuddatiniUzaytir(beruvchi1, yopiq.id);
      const c = await elonMuddatiniUzaytir(beruvchi1, begona.id);
      return !a.ok && a.sabab === 'mumkin-emas' && !b.ok && b.sabab === 'mumkin-emas' && !c.ok && c.sabab === 'topilmadi';
    },
  },
  {
    nomi: 'Rad etilgan e‘lon qayta moderatsiyaga yuboriladi (yangi muddat bilan); "to‘ldi" yuborilmaydi; begona — topilmadi',
    tekshir: async () => {
      const rad = await elonYarat({ faol: false, moderatsiya: 'RAD_ETILDI', moderatsiyaSababi: 'x', yopilganSana: new Date() });
      const toldi = await elonYarat({ faol: false, yopilishSababi: 'TOLDI', yopilganSana: new Date() });
      const begona = await elonYarat({ ishBeruvchiId: beruvchi2, faol: false, moderatsiya: 'RAD_ETILDI' });
      const r1 = await elonniQaytaYubor(beruvchi1, rad.id);
      const y1 = await prisma.vacancy.findUnique({ where: { id: rad.id } });
      const r2 = await elonniQaytaYubor(beruvchi1, toldi.id);
      const r3 = await elonniQaytaYubor(beruvchi1, begona.id);
      return (
        r1.ok && y1?.faol === true && y1.moderatsiya === 'KUTILMOQDA' && y1.moderatsiyaSababi === null &&
        (y1.amalQilishMuddati?.getTime() ?? 0) > Date.now() + 25 * KUN &&
        !r2.ok && r2.sabab === 'mumkin-emas' && !r3.ok && r3.sabab === 'topilmadi'
      );
    },
  },
  {
    /*
     * Ish beruvchi e'lonni ko'rib chiqishdan oldin yopsa, rahbar uni
     * "tasdiqlab" qayta tiriltira olmasligi kerak.
     */
    nomi: 'Ish beruvchi yopib qo‘ygan (moderatsiya kutayotgan) e‘lonni rahbar "tasdiqlab" tiriltira OLMAYDI',
    tekshir: async () => {
      const e = await elonYarat({ moderatsiya: 'KUTILMOQDA' });
      await elonniYopish(beruvchi1, e.id);
      const r = await elonniHalQil({ vacancyId: e.id, userId: bandlik, qabul: true });
      const hozir = await prisma.vacancy.findUnique({ where: { id: e.id } });
      return !r.ok && r.hozirgiHolati === 'YOPILGAN' && hozir?.faol === false && hozir.moderatsiya === 'KUTILMOQDA';
    },
  },

  /* ══ 5. TAHRIR: MUHIM O'ZGARISH QAYTA MODERATSIYAGA ══ */
  {
    nomi: 'Tahrir qiymatlari tekshiriladi: maosh (0, manfiy, harf, 500 dan katta rad), o‘rin, talab, jadval, sharoit',
    tekshir: async () => {
      const m = tahrirQiymati('maosh', '5,5');
      return (
        m.ok && (m.data.maosh as bigint) === 5_500_000n &&
        !tahrirQiymati('maosh', '0').ok &&
        !tahrirQiymati('maosh', '-3').ok &&
        !tahrirQiymati('maosh', '3-5').ok &&
        !tahrirQiymati('maosh', '1.2.3').ok &&
        !tahrirQiymati('maosh', 'abc').ok &&
        !tahrirQiymati('maosh', '900').ok &&
        tahrirQiymati('orin', '7').ok && !tahrirQiymati('orin', '0').ok && !tahrirQiymati('orin', '501').ok &&
        !tahrirQiymati('talab', 'qisqa').ok && tahrirQiymati('talab', 'Kamida bir yil tajriba kerak').ok &&
        !tahrirQiymati('jadval', 'a').ok && tahrirQiymati('jadval', 'Du-Sha 8-17').ok &&
        !tahrirQiymati('sharoit', ' ').ok
      );
    },
  },
  {
    nomi: 'Maosh matni qat‘iy o‘qiladi: "-3", "3-5", "1.2.3", "abc" rad; "4,5", "4.5 млн", "4 500 000 сўм" qabul',
    tekshir: async () => {
      const rad = ['-3', '3-5', '1.2.3', 'abc', '', '0', '501', '3 ming', '4-5 млн', '1e3'];
      const qabul: Array<[string, number]> = [
        ['4,5', 4.5],
        ['4.5', 4.5],
        ['4.5 млн', 4.5],
        ['7', 7],
        ['4 500 000', 4.5],
        ['4500000 сўм', 4.5],
      ];
      return (
        rad.every((t) => maoshniOqi(t) === null) &&
        qabul.every(([t, n]) => maoshniOqi(t) === n)
      );
    },
  },
  {
    nomi: 'Maosh tahriri: qiymat qo‘llanadi VA e‘lon MODERATSIYAGA qaytadi (tasdiq izi o‘chadi); suhbat tozalanadi',
    tekshir: async () => {
      const e = await elonYarat({
        maosh: 3_000_000n,
        moderatsiyaQilganId: bandlik,
        moderatsiyaSanasi: new Date(),
      });
      await prisma.ishBeruvchi.update({
        where: { id: beruvchi1 },
        data: { bosqich: 't.maosh', suhbat: { vacancyId: e.id }, suhbatVaqti: new Date() },
      });
      const j = await tahrirMatni(beruvchi1, '9.5');
      const y = await prisma.vacancy.findUnique({ where: { id: e.id } });
      const b = await prisma.ishBeruvchi.findUnique({ where: { id: beruvchi1 }, select: { bosqich: true } });
      return (
        j !== null && y?.maosh === 9_500_000n && y.moderatsiya === 'KUTILMOQDA' &&
        y.moderatsiyaQilganId === null && y.moderatsiyaSanasi === null && y.faol === true && b?.bosqich === null
      );
    },
  },
  {
    nomi: 'Noto‘g‘ri tahrir qiymati e‘lonni O‘ZGARTIRMAYDI va suhbat davom etadi',
    tekshir: async () => {
      const e = await elonYarat({ maosh: 3_000_000n });
      await prisma.ishBeruvchi.update({
        where: { id: beruvchi1 },
        data: { bosqich: 't.maosh', suhbat: { vacancyId: e.id }, suhbatVaqti: new Date() },
      });
      const j = await tahrirMatni(beruvchi1, 'juda ko‘p');
      const y = await prisma.vacancy.findUnique({ where: { id: e.id } });
      const hali = await tahrirSuhbatiBormi(beruvchi1);
      await prisma.ishBeruvchi.update({ where: { id: beruvchi1 }, data: { bosqich: null, suhbat: {}, suhbatVaqti: null } });
      return j !== null && y?.maosh === 3_000_000n && y.moderatsiya === 'TASDIQLANDI' && hali === true;
    },
  },
  {
    nomi: 'Begona e‘lon id si suhbatga qo‘yilsa ham tahrir O‘TMAYDI (egalik bazada tekshiriladi)',
    tekshir: async () => {
      const begona = await elonYarat({ ishBeruvchiId: beruvchi2, maosh: 3_000_000n });
      await prisma.ishBeruvchi.update({
        where: { id: beruvchi1 },
        data: { bosqich: 't.maosh', suhbat: { vacancyId: begona.id }, suhbatVaqti: new Date() },
      });
      const j = await tahrirMatni(beruvchi1, '50');
      const y = await prisma.vacancy.findUnique({ where: { id: begona.id } });
      return j !== null && y?.maosh === 3_000_000n && y.moderatsiya === 'TASDIQLANDI';
    },
  },
  {
    nomi: 'Eskirgan tahrir suhbati (30 daqiqadan keyin) ishlamaydi va tozalanadi',
    tekshir: async () => {
      const e = await elonYarat({ maosh: 3_000_000n });
      await prisma.ishBeruvchi.update({
        where: { id: beruvchi1 },
        data: { bosqich: 't.maosh', suhbat: { vacancyId: e.id }, suhbatVaqti: new Date(Date.now() - 40 * 60_000) },
      });
      const bor = await tahrirSuhbatiBormi(beruvchi1);
      const j = await tahrirMatni(beruvchi1, '9');
      const y = await prisma.vacancy.findUnique({ where: { id: e.id } });
      const b = await prisma.ishBeruvchi.findUnique({ where: { id: beruvchi1 }, select: { bosqich: true } });
      return !bor && j === null && y?.maosh === 3_000_000n && b?.bosqich === null;
    },
  },
  {
    nomi: 'E‘lon yaratish/ro‘yxatdan o‘tish suhbati (boshqa qadamlar) tahrir suhbati deb tanilmaydi',
    tekshir: async () => {
      await prisma.ishBeruvchi.update({
        where: { id: beruvchi1 },
        data: { bosqich: 'maosh', suhbat: {}, suhbatVaqti: new Date() },
      });
      const a = await tahrirSuhbatiBormi(beruvchi1);
      const j = await tahrirMatni(beruvchi1, '5');
      await prisma.ishBeruvchi.update({ where: { id: beruvchi1 }, data: { bosqich: null, suhbat: {}, suhbatVaqti: null } });
      return !a && j === null;
    },
  },

  /* ══ 6. MUDDATI TUGAGAN E'LON ══ */
  {
    nomi: 'Muddati tugab yopilgan e‘lon haqida xabar FAQAT shu yopishda tanlanadi (parallel/keyingi chaqiriq xabar bermaydi)',
    tekshir: async () => {
      const e = await elonYarat({ amalQilishMuddati: keyin(-1) });
      const hozir = new Date();
      const yopildi = await muddatiOtganlarniYop(prisma as unknown as Tranzaksiya, hozir);
      const y = await prisma.vacancy.findUnique({ where: { id: e.id } });
      /* Telegram sozlanmagan/soxta chat: yuborish false, lekin yiqilmaydi */
      const n1 = await muddatiTugaganlarniOgohlantir(hozir);
      const kech = new Date(hozir.getTime() + 5000);
      const n2 = await muddatiOtganlarniYop(prisma as unknown as Tranzaksiya, kech);
      const n3 = await muddatiTugaganlarniOgohlantir(kech);
      return yopildi >= 1 && y?.faol === false && y.yopilishSababi === 'MUDDATI_TUGADI' && n1 >= 0 && n2 === 0 && n3 === 0;
    },
  },
  {
    nomi: 'Navbat yo‘li muddati tugaganlar haqida xabarni FAQAT yopilgan bo‘lsa va Telegram sozlangan bo‘lsa yuboradi',
    tekshir: async () => {
      const k = kodiOl(oqi('src/app/api/telegram/navbat/route.ts'));
      return (
        k.includes('muddatiTugaganlarniOgohlantir(hozir)') &&
        k.includes('yopilganElon > 0') &&
        k.includes('telegramSozlanganmi()') &&
        k.includes('muddatiOtganlarniYop(prisma, hozir)')
      );
    },
  },

  /* ══ 7. YO'LLANMA ══ */
  {
    nomi: 'Yo‘llanma yaratiladi; takror so‘rov mavjud yozuvni qaytaradi; parallel 6 ta so‘rovdan bitta yozuv',
    tekshir: async () => {
      const e = await elonYarat();
      const f = await fuqaroYarat();
      const k = kim('BANDLIK', bandlik, null);
      const a = await yollanmaYaratish(k, { ishsizId: f, vacancyId: e.id });
      const b = await yollanmaYaratish(k, { ishsizId: f, vacancyId: e.id });
      const f2 = await fuqaroYarat();
      const n = await Promise.allSettled(
        Array.from({ length: 6 }, () => yollanmaYaratish(k, { ishsizId: f2, vacancyId: e.id }))
      );
      const soni = await prisma.nomzodYollanmasi.count({ where: { vacancyId: e.id, ishsizId: f2 } });
      return a.yangi && !b.yangi && a.id === b.id && soni === 1 && n.every((x) => x.status === 'fulfilled');
    },
  },
  {
    nomi: 'Yo‘llash: moderatsiyasiz, yopilgan yoki muddati o‘tgan e‘longa; arxivdagi yoki begona mahalla fuqarosiga mumkin emas',
    tekshir: async () => {
      const f = await fuqaroYarat();
      const k = kim('BANDLIK', bandlik, null);
      const tekshir = async (e: { id: string }, odam = f, q = k) => {
        try {
          await yollanmaYaratish(q, { ishsizId: odam, vacancyId: e.id });
          return null;
        } catch (x) {
          return x instanceof YollanmaXatosi ? x.kod : 'boshqa';
        }
      };
      const kut = await elonYarat({ moderatsiya: 'KUTILMOQDA' });
      const yopiq = await elonYarat({ faol: false, yopilishSababi: 'QOLDA' });
      const otgan = await elonYarat({ amalQilishMuddati: keyin(-1) });
      const sog = await elonYarat();
      const arxivli = await fuqaroYarat(mahallaA, { arxivSanasi: new Date(), arxivSababi: 'sinov' });
      const boshqaMahalla = await fuqaroYarat(mahallaA);
      return (
        (await tekshir(kut)) === 'YOPIQ' &&
        (await tekshir(yopiq)) === 'YOPIQ' &&
        (await tekshir(otgan)) === 'YOPIQ' &&
        (await tekshir(sog, arxivli)) === 'TOPILMADI' &&
        (await tekshir(sog, boshqaMahalla, kim('YETTILIK', yettilikB, mahallaB))) === 'RUXSAT'
      );
    },
  },
  {
    nomi: 'ROZILIKSIZ ma‘lumot yuborilmaydi (yuborish "rozilik yo‘q" xatosi bilan to‘xtaydi)',
    tekshir: async () => {
      const e = await elonYarat();
      const f = await fuqaroYarat();
      const r = await yollanmaYaratish(kim('BANDLIK', bandlik, null), { ishsizId: f, vacancyId: e.id });
      try {
        await beruvchigaYuborish(kim('BANDLIK', bandlik, null), r.id);
        return false;
      } catch (x) {
        const y = await prisma.nomzodYollanmasi.findUnique({ where: { id: r.id } });
        return x instanceof YollanmaXatosi && x.kod === 'ROZILIK' && y?.ulashilganSana === null;
      }
    },
  },
  {
    nomi: 'Rozilik qayd etiladi (usul va sana bilan); kelajak sanali rozilik rad etiladi; qaytarib olinadi',
    tekshir: async () => {
      const e = await elonYarat();
      const f = await fuqaroYarat();
      const k = kim('BANDLIK', bandlik, null);
      const r = await yollanmaYaratish(k, { ishsizId: f, vacancyId: e.id });
      let kelajak = false;
      try {
        await rozilikQayd(k, r.id, { usul: 'TELEFON', sana: keyin(10) });
      } catch (x) {
        kelajak = x instanceof YollanmaXatosi && x.kod === 'NOTOGRI';
      }
      await rozilikQayd(k, r.id, { usul: 'YOZMA', sana: keyin(-1) });
      const y1 = await prisma.nomzodYollanmasi.findUnique({ where: { id: r.id } });
      await rozilikniQaytar(k, r.id);
      const y2 = await prisma.nomzodYollanmasi.findUnique({ where: { id: r.id } });
      return kelajak && y1?.rozilik === true && y1.roziligiUsuli === 'YOZMA' && y1.roziligiSana !== null && y2?.rozilik === false;
    },
  },
  {
    nomi: 'Begona mahalla xodimi rozilik qayd eta olmaydi',
    tekshir: async () => {
      const e = await elonYarat();
      const f = await fuqaroYarat(mahallaA);
      const r = await yollanmaYaratish(kim('BANDLIK', bandlik, null), { ishsizId: f, vacancyId: e.id });
      try {
        await rozilikQayd(kim('YETTILIK', yettilikB, mahallaB), r.id, { usul: 'OGZAKI' });
        return false;
      } catch (x) {
        return x instanceof YollanmaXatosi && x.kod === 'RUXSAT';
      }
    },
  },
  {
    nomi: 'Ish beruvchisiz (xodim qo‘ygan) e‘longa ma‘lumot yuborib bo‘lmaydi — "ish beruvchi yo‘q"',
    tekshir: async () => {
      const e = await elonYarat({ ishBeruvchiId: null });
      const f = await fuqaroYarat();
      const k = kim('BANDLIK', bandlik, null);
      const r = await yollanmaYaratish(k, { ishsizId: f, vacancyId: e.id });
      await rozilikQayd(k, r.id, { usul: 'OGZAKI' });
      try {
        await beruvchigaYuborish(k, r.id);
        return false;
      } catch (x) {
        return x instanceof YollanmaXatosi && x.kod === 'BERUVCHI_YOQ';
      }
    },
  },
  {
    /*
     * Telegram xato bersa "yuborildi" deb yozilmaydi: aks holda ish
     * beruvchi hech narsa olmagan-u, tizim "olingan" deb hisoblardi.
     * Sinovda chat id soxta, Telegram esa yo'q yoki rad etadi.
     */
    nomi: 'Telegramga yuborib bo‘lmasa — "yuborildi" yozilmaydi (ulashilganSana bo‘sh qoladi)',
    tekshir: async () => {
      const e = await elonYarat();
      const f = await fuqaroYarat();
      const k = kim('BANDLIK', bandlik, null);
      const r = await yollanmaYaratish(k, { ishsizId: f, vacancyId: e.id });
      await rozilikQayd(k, r.id, { usul: 'TELEFON' });
      try {
        await beruvchigaYuborish(k, r.id);
        return false;
      } catch (x) {
        const y = await prisma.nomzodYollanmasi.findUnique({ where: { id: r.id } });
        return x instanceof YollanmaXatosi && x.kod === 'YUBORIB_BOLMADI' && y?.ulashilganSana === null && y.ulashilgan.length === 0;
      }
    },
  },
  {
    nomi: 'Ish beruvchi xabari FAQAT tanlangan maydonlarni oladi (minimum), kerak emas ma‘lumot yo‘q, HTML escape qilinadi',
    tekshir: async () => {
      const faqatFish = beruvchiXabari({
        lavozim: 'Payvandchi',
        fish: 'Aliyev <b>Vali</b>',
        telefon: '+998901112233',
        kasb: 'Payvandchi',
        maydonlar: ['fish'],
      });
      const hammasi = beruvchiXabari({
        lavozim: 'Payvandchi',
        fish: 'Aliyev Vali',
        telefon: '+998901112233',
        kasb: 'Payvandchi',
        maydonlar: ['fish', 'telefon', 'kasb'],
      });
      return (
        !faqatFish.includes('+998901112233') &&
        !faqatFish.includes('Касби') &&
        faqatFish.includes('&lt;b&gt;') &&
        !faqatFish.includes('<b>Vali') &&
        hammasi.includes('+998901112233') &&
        faqatFish.includes('розилик')
      );
    },
  },
  {
    nomi: 'Ish beruvchi tugmalari: suhbat / qabul / mos kelmadi, hammasi yo‘llanma id siga bog‘langan',
    tekshir: async () => {
      const t = beruvchiTugmalari('abc123');
      return (
        t.length === 3 &&
        t.every((x) => x.belgi.endsWith(':abc123')) &&
        new Set(t.map((x) => x.belgi.split(':')[0])).size === 3 &&
        t.every((x) => x.belgi.length <= 64)
      );
    },
  },

  /* ══ 8. NATIJA ══ */
  {
    nomi: 'Ish beruvchi "ishga qabul" desa — ISHGA_QABUL, manba "ish beruvchi bildirgan"; fuqaro holati va joylashish O‘ZGARMAYDI',
    tekshir: async () => {
      const { yollanma, fuqaro, elon } = await yuborilganYollanma();
      const r = await beruvchiNatijasi(beruvchi1, yollanma, 'qabul');
      const y = await prisma.nomzodYollanmasi.findUnique({ where: { id: yollanma } });
      const p = await prisma.unemployedPerson.findUnique({ where: { id: fuqaro } });
      const ish = await prisma.ishgaJoylashish.count({ where: { ishsizId: fuqaro } });
      const dalil = await prisma.joylashuvDalili.count({ where: { ishsizId: fuqaro } });
      const v = await prisma.vacancy.findUnique({ where: { id: elon }, select: { faol: true } });
      return (
        r.ok && y?.holati === 'ISHGA_QABUL' && y.natijaManbasi === 'ISH_BERUVCHI_BILDIRGAN' && y.natijaSanasi !== null &&
        p?.holati === 'ANIQLANDI' && p.vacancyId === null && ish === 0 && dalil === 0 && v?.faol === true
      );
    },
  },
  {
    nomi: 'Begona ish beruvchi natija bildira olmaydi; ma‘lumot YUBORILMAGAN yo‘llanmaga ham bo‘lmaydi',
    tekshir: async () => {
      const { yollanma } = await yuborilganYollanma(beruvchi1);
      const begona = await beruvchiNatijasi(beruvchi2, yollanma, 'qabul');
      const e = await elonYarat();
      const f = await fuqaroYarat();
      const r = await yollanmaYaratish(kim('BANDLIK', bandlik, null), { ishsizId: f, vacancyId: e.id });
      const yuborilmagan = await beruvchiNatijasi(beruvchi1, r.id, 'qabul');
      const y = await prisma.nomzodYollanmasi.findUnique({ where: { id: yollanma } });
      return !begona.ok && begona.sabab === 'topilmadi' && !yuborilmagan.ok && yuborilmagan.sabab === 'topilmadi' && y?.holati === 'YOLLANDI';
    },
  },
  {
    nomi: 'Yakuniy natijadan keyin o‘zgarmaydi: "qabul" dan keyin "mos kelmadi" va "suhbat" rad etiladi; parallel bosishda bittasi',
    tekshir: async () => {
      const { yollanma } = await yuborilganYollanma();
      await beruvchiNatijasi(beruvchi1, yollanma, 'qabul');
      const a = await beruvchiNatijasi(beruvchi1, yollanma, 'rad');
      const b = await beruvchiNatijasi(beruvchi1, yollanma, 'suhbat');
      const y = await prisma.nomzodYollanmasi.findUnique({ where: { id: yollanma } });

      const { yollanma: ikkinchi } = await yuborilganYollanma();
      const n = await Promise.all([
        beruvchiNatijasi(beruvchi1, ikkinchi, 'qabul'),
        beruvchiNatijasi(beruvchi1, ikkinchi, 'rad'),
        beruvchiNatijasi(beruvchi1, ikkinchi, 'qabul'),
      ]);
      return (
        !a.ok && a.sabab === 'yakunlangan' && !b.ok && y?.holati === 'ISHGA_QABUL' &&
        n.filter((x) => x.ok).length === 1
      );
    },
  },
  {
    nomi: 'Suhbat ketma-ketligi: suhbat o‘tkazildi → qabul; suhbat sanasi yoziladi',
    tekshir: async () => {
      const { yollanma } = await yuborilganYollanma();
      const a = await beruvchiNatijasi(beruvchi1, yollanma, 'suhbat');
      const y1 = await prisma.nomzodYollanmasi.findUnique({ where: { id: yollanma } });
      const b = await beruvchiNatijasi(beruvchi1, yollanma, 'qabul');
      return a.ok && y1?.holati === 'SUHBAT_OTKAZILDI' && y1.suhbatSanasi !== null && b.ok;
    },
  },
  {
    nomi: 'Xodim holat belgilaydi (manba "xodim qayd etgan"); yakuniy holatdan keyin o‘zgarmaydi',
    tekshir: async () => {
      const e = await elonYarat();
      const f = await fuqaroYarat();
      const k = kim('BANDLIK', bandlik, null);
      const r = await yollanmaYaratish(k, { ishsizId: f, vacancyId: e.id });
      await xodimHolati(k, r.id, { holati: 'FUQARO_RAD', izoh: 'Ish uzoq' });
      const y = await prisma.nomzodYollanmasi.findUnique({ where: { id: r.id } });
      try {
        await xodimHolati(k, r.id, { holati: 'SUHBAT_BELGILANDI' });
        return false;
      } catch (x) {
        return (
          x instanceof YollanmaXatosi && x.kod === 'YOPIQ' &&
          y?.holati === 'FUQARO_RAD' && y.natijaManbasi === 'XODIM_QAYD_ETGAN' && y.natijaIzohi === 'Ish uzoq'
        );
      }
    },
  },
  {
    nomi: 'Javobsiz yo‘llanmalar: 5 kundan ortiq javobsiz — ro‘yxatda; yaqinda yuborilgani va javob berilgani — yo‘q',
    tekshir: async () => {
      const eski = await yuborilganYollanma();
      await prisma.nomzodYollanmasi.update({ where: { id: eski.yollanma }, data: { ulashilganSana: keyin(-8) } });
      const yangi = await yuborilganYollanma();
      const javobli = await yuborilganYollanma();
      await prisma.nomzodYollanmasi.update({ where: { id: javobli.yollanma }, data: { ulashilganSana: keyin(-8) } });
      await beruvchiNatijasi(beruvchi1, javobli.yollanma, 'rad');
      const { royxat } = await javobsizYollanmalar(new Date(), 500);
      const idlar = royxat.map((r) => r.id);
      return idlar.includes(eski.yollanma) && !idlar.includes(yangi.yollanma) && !idlar.includes(javobli.yollanma);
    },
  },

  /* ══ 9. QO'RIQCHILAR (kod va tuzilma) ══ */
  {
    nomi: 'Yo‘llanma API: sessiya talab qiladi, faqat bandlik/rahbar/admin (hokim va mahalla xodimi — yo‘q)',
    tekshir: async () => {
      return ['src/app/api/yollanma/route.ts', 'src/app/api/yollanma/[id]/route.ts'].every((y) => {
        const k = kodiOl(oqi(y));
        return (
          k.includes('talabQil(') && k.includes("'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'") &&
          !k.includes("'HOKIM'") && !k.includes("'YETTILIK'") && k.includes('instanceof NextResponse')
        );
      });
    },
  },
  {
    nomi: 'Yo‘llanma kodi fuqaro holatini va joylashishni o‘zgartirmaydi (tasdiq faqat dalil orqali)',
    tekshir: async () => {
      const k = kodiOl(oqi('src/lib/yollanma.ts'));
      return (
        !k.includes('unemployedPerson.update') &&
        !k.includes('ishgaJoylashish.') &&
        !k.includes('joylashuvDalili.') &&
        YOLLANMA_NOMI.ISHGA_QABUL.includes('иш берувчи билдирган')
      );
    },
  },
  {
    nomi: 'Botda yangi tugmalar bor va egalik tekshiruvi `ishBeruvchiId` bo‘yicha qilinadi (qo‘lda o‘zgartirilgan belgi o‘tmaydi)',
    tekshir: async () => {
      const w = kodiOl(oqi('src/app/api/telegram/webhook/route.ts'));
      const e = kodiOl(oqi('src/lib/beruvchi-elonlari.ts'));
      const y = kodiOl(oqi('src/lib/yollanma.ts'));
      return (
        w.includes('BERUVCHI.ELONLARIM') && w.includes('BERUVCHI.YOL_QABUL') && w.includes('beruvchiNatijasi(') &&
        (e.match(/ishBeruvchiId: beruvchiId/g) ?? []).length >= 6 &&
        y.includes('vacancy: { ishBeruvchiId: beruvchiId }') &&
        y.includes('ulashilganSana: { not: null }')
      );
    },
  },
  {
    nomi: 'Yopishdan oldin tasdiq so‘raladi (qaytarib bo‘lmaydigan amal)',
    tekshir: async () => {
      const w = kodiOl(oqi('src/app/api/telegram/webhook/route.ts'));
      return w.includes('BERUVCHI.ELON_YOPISH_TASDIQ') && w.includes('Эълонни ёпасизми');
    },
  },
  {
    nomi: 'Vazifalar taxtasida "javobsiz yo‘llanma" va "e‘lon sifati" bloklari bor (faqat bandlik markazi)',
    tekshir: async () => {
      const { vazifalarim } = await import('../src/lib/vazifalar');
      const b = await vazifalarim({ userId: bandlik, rol: 'BANDLIK', mahallaId: null });
      const h = await vazifalarim({ userId: bandlik, rol: 'HOKIM', mahallaId: null });
      const keys = b.bloklar.map((x) => x.kalit);
      return (
        keys.includes('yollanma-javobsiz') && keys.includes('elon-sifati') &&
        !h.bloklar.some((x) => x.kalit === 'yollanma-javobsiz' || x.kalit === 'elon-sifati')
      );
    },
  },
  {
    nomi: 'Vakansiya sahifasi: yo‘llanmalar bloki, sifat bloki; xonadon sahifasiga o‘xshash xato yutish (try/catch) bor',
    tekshir: async () => {
      const p = kodiOl(oqi('src/app/(ilova)/ish-orinlari/[id]/page.tsx'));
      const y = kodiOl(oqi('src/components/yollanma/yollanmalar-blogi.tsx'));
      return (
        p.includes('<YollanmalarBlogi') && p.includes('<ElonSifatiBlogi') && p.includes('catch (e)') &&
        y.includes('catch (e)') && y.includes('return null')
      );
    },
  },
  {
    nomi: 'Migratsiya faqat qo‘shadi: bitta jadval, uchta tur, ikkita ixtiyoriy ustun',
    tekshir: async () => {
      const sql = oqi('prisma/migrations/20261001140000_yollanma_va_elon_sharti/migration.sql');
      const xavfli = /\b(DROP\s+(TABLE|COLUMN|TYPE)|RENAME|TRUNCATE|SET\s+NOT\s+NULL)\b/i.test(sql);
      const ustunlar = sql.match(/ALTER TABLE "Vacancy" ADD COLUMN[^;]*;/g) ?? [];
      return !xavfli && ustunlar.length === 2 && ustunlar.every((u) => !/NOT NULL/i.test(u));
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
