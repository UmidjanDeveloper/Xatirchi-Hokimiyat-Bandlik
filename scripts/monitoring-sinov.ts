/**
 * ============================================================
 *  MONITORING, XATO JURNALI, KIRISH CHEGARASI, ZAXIRA — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/monitoring-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *   1. XATO MATNIDA SIR QOLSA - baza parolini yoki Telegram tokenini
 *      jurnalni ochgan har kim ko'radi. Prisma xatosida fuqaroning ismi va
 *      telefoni turadi. Tozalash haqiqiy xato matnlari bilan sinaladi.
 *
 *   2. KUZATUV ASOSIY ISHNI YIQITSA - jurnal yozilmagani uchun brifing
 *      ketmay qolsa, monitoring muammoning o'zi bo'lib qoladi.
 *
 *   3. "OXIRGI MUVAFFAQIYAT" NOTO'G'RI BO'LSA - o'lik jadval tirik
 *      ko'rinadi (qo'lda tugma bosish uni yashirsa; ketma-ket xatolar
 *      oxirgi muvaffaqiyatni "yo'qotsa").
 *
 *   4. KIRISH CHEGARASI BAZADA SANALMASA - bir nechta nusxaga tushgan
 *      hujum chegarani aylanib o'tadi; ikki parallel so'rov oxirgi bo'sh
 *      joyni ikkalasi olib qo'yadi.
 *
 *   5. SINALMAGAN ZAXIRA "SINALGAN" KO'RINSA; oxirgi sinov muvaffaqiyatsiz
 *      bo'lganda eski muvaffaqiyat tinchlantirsa.
 *
 *  Sinov FAQAT mahalliy bazada ishlaydi (production bazasiga tegmaydi).
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { prisma as ilovaPrisma } from '../src/lib/prisma';
import { vazifalarim } from '../src/lib/vazifalar';
import { navbatniYubor } from '../src/lib/xabarnoma';
import { bazaChegarasi, bazaChegarasiniQaytar, bazaChegarasiniTozala } from '../src/lib/kirish-chegarasi';
import { checkRateLimit, resetRateLimit } from '../src/lib/rate-limit';
import { kalitXeshi, maxfiyniTozala, xatoXeshi, xatoXulosasi, XATO_UZUNLIGI } from '../src/lib/maxfiy';
import {
  CRON_ISHLARI,
  ZAXIRA_ESKIRISH_KUNI,
  TOXTAB_QOLISH_DAQIQA,
  eskiYozuvlarniTozala,
  ishlarHolati,
  ishniBaholash,
  ishniKuzat,
  izIdYarat,
  navbatHolati,
  serverXatosi,
  xatoliNavbatniQaytar,
  xatolarHolati,
  xatolarniKorildi,
  xatoniYoz,
  zaxiraHolati,
  zaxiraniBaholash,
  type IshYozuvi,
} from '../src/lib/tizim-kuzatuvi';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const SOAT = 3600_000;
const KUN = 24 * SOAT;
const oqi = (y: string) => readFileSync(y, 'utf8');
const oldin = (ms: number) => new Date(Date.now() - ms);

/* Namunaviy (SUN'IY) sirlar: haqiqiy hech narsa emas */
const BAZA_PAROLI = 'Sinov-Baza-Parol-77';
const BOT_TOKENI = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1';
const BEARER = 'abc123def456ghi789jkl';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const API_KALIT = ['sk', 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6'].join('-');
const PAROL_SOZI = 'hunter2';

let xodim = '';
const xodimlar: string[] = [];

async function tayyorla() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi: DATABASE_URL localhost bo‘lishi kerak.');
    process.exit(2);
  }
  const x = await prisma.user.create({
    data: { username: `mon_${Date.now()}_${Math.floor(Math.random() * 1e5)}`, fullName: 'Sinov monitoring', passwordHash: 'x', rol: 'ADMIN' },
    select: { id: true },
  });
  xodim = x.id;
  xodimlar.push(x.id);
  await tozalaJadval();
}

async function tozalaJadval() {
  await prisma.tizimIshi.deleteMany({});
  await prisma.tizimXatosi.deleteMany({});
  await prisma.kirishUrinishi.deleteMany({});
  await prisma.zaxiraTekshiruvi.deleteMany({});
}

async function tozala() {
  await tozalaJadval();
  await prisma.xabarnoma.deleteMany({ where: { userId: { in: xodimlar } } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: xodimlar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
}

const yozuv = (holati: IshYozuvi['holati'], boshlandiOldin: number, tugadiOldin: number | null): IshYozuvi => ({
  holati,
  boshlandi: oldin(boshlandiOldin),
  tugadi: tugadiOldin === null ? null : oldin(tugadiOldin),
});

let izSanagich = 0;
async function ishYoz(nomi: string, usul: 'cron' | 'qolda', holati: 'DAVOM_ETMOQDA' | 'MUVAFFAQIYATLI' | 'XATO', boshlandiOldin: number, xatoMatni?: string) {
  const boshlandi = oldin(boshlandiOldin);
  return prisma.tizimIshi.create({
    data: {
      nomi,
      usul,
      izId: `iz_t${String(++izSanagich).padStart(9, '0')}`,
      holati,
      boshlandi,
      tugadi: holati === 'DAVOM_ETMOQDA' ? null : new Date(boshlandi.getTime() + 2000),
      xatoMatni: xatoMatni ?? null,
    },
  });
}

const SINOVLAR: Sinov[] = [
  /* ══ A. MAXFIY MA'LUMOTNI TOZALASH (sof) ══ */
  {
    nomi: 'Tozalash: baza ulanish satri, bot tokeni (URL ichida), Bearer, JWT, API kalit, "parol=" juftlari YASHIRILADI',
    tekshir: async () => {
      const m = [
        `connect ECONNREFUSED postgresql://postgres:${BAZA_PAROLI}@db.abc.supabase.co:5432/postgres`,
        `request to https://api.telegram.org/bot${BOT_TOKENI}/sendMessage failed, reason: socket hang up`,
        `Authorization: Bearer ${BEARER}`,
        `jwt ${JWT}`,
        `kalit ${API_KALIT}`,
        `password=${PAROL_SOZI} parol: "maxfiy so'z" sir=${PAROL_SOZI}2`,
        `cookie: session=abcdef0123456789`,
      ].join(' | ');
      const t = maxfiyniTozala(m);
      const sizdi = [BAZA_PAROLI, BOT_TOKENI, 'AAHdqTcv', BEARER, JWT, 'dBjftJeZ', API_KALIT, PAROL_SOZI, "maxfiy so'z", 'abcdef0123456789'];
      const qoldi = sizdi.filter((x) => t.includes(x));
      if (qoldi.length) console.log('     sizib chiqdi:', qoldi);
      /* Foydali qism saqlangan: nima xato bo'lgani tushunarli */
      return qoldi.length === 0 && /ECONNREFUSED/.test(t) && /sendMessage failed/.test(t);
    },
  },
  {
    nomi: 'Tozalash: telefon (har xil yozuv), JSHSHIR, e-pochta, uzun tasodifiy qator YASHIRILADI',
    tekshir: async () => {
      const uzun = 'A'.repeat(12) + 'b9'.repeat(25);
      const m = `tel +998 94 512 33 78, 998945123378, 94-512-33-78, (94) 5123378; pinfl 31501851234567; ali.valiyev@mail.uz; ${uzun}`;
      const t = maxfiyniTozala(m);
      const sizdi = ['512 33 78', '945123378', '512-33-78', '5123378', '31501851234567', 'ali.valiyev', 'mail.uz', uzun];
      const qoldi = sizdi.filter((x) => t.includes(x));
      if (qoldi.length) console.log('     sizib chiqdi:', qoldi, '->', t);
      return qoldi.length === 0;
    },
  },
  {
    nomi: 'Tozalash: Prisma xatosidagi so\'rov argumentlari (fuqaro ismi, telefon, JSHSHIR) TASHLANADI, sabab saqlanadi',
    tekshir: async () => {
      const m = [
        'Invalid `prisma.unemployedPerson.create()` invocation in',
        '/var/task/.next/server/app/api/xatlov/route.js:12:34',
        '',
        '   9 ',
        '→ 12 prisma.unemployedPerson.create({',
        '       data: {',
        '         fish: "Valiyev Ali Karimovich",',
        '         telefon: "+998945123378",',
        '         pinfl: "31501851234567"',
        '       }',
        '     })',
        '',
        'Unique constraint failed on the fields: (`telefon`)',
      ].join('\n');
      const t = maxfiyniTozala(m);
      return (
        !/Valiyev|Ali Karimovich|945123378|31501851234567/.test(t) &&
        /unemployedPerson\.create/.test(t) && /Unique constraint failed/.test(t) && /telefon/.test(t)
      );
    },
  },
  {
    nomi: 'Tozalash: HAQIQIY Prisma xatolari - tekshiruv xatosida (argument qiymatlari xabarda BOR) fuqaro/xodim ismi chiqmaydi; takror login xatosida kod (P2002) va sabab qoladi',
    tekshir: async () => {
      const noyob = `maxfiy_login_${Date.now()}`;
      const ism = `Maxfiy Ismli Xodim ${Date.now()}`;
      const a = await prisma.user.create({ data: { username: noyob, fullName: ism, passwordHash: 'x', rol: 'BANDLIK' }, select: { id: true } });
      xodimlar.push(a.id);

      /* 1) Tekshiruv xatosi: Prisma yozilayotgan qiymatlarni xabarga CHIQARADI */
      let valXom = '';
      let valXato: unknown;
      try {
        await prisma.user.create({ data: { username: 12345 as unknown as string, fullName: ism, passwordHash: 'x', rol: 'BANDLIK' } });
      } catch (e) {
        valXato = e;
        valXom = (e as Error).message;
      }
      const valToza = xatoXulosasi(valXato);

      /* 2) Takror login: kod va sabab saqlanishi kerak */
      let takrorXato: unknown;
      try {
        await prisma.user.create({ data: { username: noyob, fullName: ism, passwordHash: 'x', rol: 'BANDLIK' } });
      } catch (e) {
        takrorXato = e;
      }
      const takrorToza = xatoXulosasi(takrorXato);

      if (!valXom.includes(ism)) console.log('     ESLATMA: xom matnda qiymat yo‘q - sinov xavfni isbotlamaydi');
      return (
        valXom.includes(ism) && !valToza.includes(ism) && !valToza.includes('Maxfiy') && valToza.length <= XATO_UZUNLIGI &&
        !takrorToza.includes(ism) && !takrorToza.includes(noyob) && /P2002/.test(takrorToza) && /Unique constraint failed/.test(takrorToza)
      );
    },
  },
  {
    nomi: 'Tozalash: uzunlik cheklanadi; g\'alati kirishda (aylanma obyekt, toString xato tashlaydi, undefined, 200 KB) HECH QACHON xato tashlamaydi',
    tekshir: async () => {
      const aylana: Record<string, unknown> = {};
      aylana.o = aylana;
      const yomon = { toString() { throw new Error('toString yiqildi'); } };
      const kirishlar: unknown[] = [aylana, yomon, undefined, null, 42, Symbol('x'), 'x'.repeat(200_000), new Error('oddiy'), { code: 'P1' }];
      for (const k of kirishlar) {
        const t = maxfiyniTozala(k);
        if (typeof t !== 'string' || t.length === 0 || t.length > XATO_UZUNLIGI) return false;
        const u = xatoXulosasi(k);
        if (typeof u !== 'string' || u.length > XATO_UZUNLIGI) return false;
      }
      return true;
    },
  },
  {
    nomi: 'Xesh: bir xil xato (boshqa id/raqam) - bir xesh; boshqa manba yoki boshqa matn - boshqa xesh; kirish kaliti xeshi login/IP\'ni saqlamaydi',
    tekshir: async () => {
      const a = xatoXeshi('api:x', 'Xonadon cmabcdefghijklmnopqrstuv1 topilmadi, urinish 3');
      const b = xatoXeshi('api:x', 'Xonadon cmzzzzzzzzzzzzzzzzzzzzzz2 topilmadi, urinish 17');
      const c = xatoXeshi('api:y', 'Xonadon cmabcdefghijklmnopqrstuv1 topilmadi, urinish 3');
      const d = xatoXeshi('api:x', 'Boshqa xato matni');
      const k = kalitXeshi('kirish:hisob:yettilik_uyshun');
      return a === b && a !== c && a !== d && !k.includes('yettilik') && k.length === 40 && k === kalitXeshi('kirish:hisob:yettilik_uyshun');
    },
  },

  /* ══ B. XATO JURNALI (baza) ══ */
  {
    nomi: 'Xato jurnali: bir xil xato BITTA qatorga yig\'iladi; 10 parallel yozuv ham aniq sanaladi (atomar); qaytgan xato yana "ko\'rilmagan"',
    tekshir: async () => {
      await xatoniYoz('test:dedup', new Error('Xonadon id cmabcdefghijklmnopqrstuv1 topilmadi'));
      await xatoniYoz('test:dedup', new Error('Xonadon id cmzzzzzzzzzzzzzzzzzzzzzz2 topilmadi'));
      await Promise.all(Array.from({ length: 10 }, (_, i) => xatoniYoz('test:dedup', new Error(`Xonadon id c${String(i).padStart(2, 'm')}abcdefghijklmnopqrstu topilmadi`))));
      const q = await prisma.tizimXatosi.findMany({ where: { manba: 'test:dedup' } });
      if (!(q.length === 1 && q[0].soni === 12)) {
        console.log('     qatorlar:', q.length, 'soni:', q[0]?.soni);
        return false;
      }
      await xatolarniKorildi(q[0].id);
      const korilgan = await prisma.tizimXatosi.findUnique({ where: { id: q[0].id } });
      await xatoniYoz('test:dedup', new Error('Xonadon id cmqqqqqqqqqqqqqqqqqqqqqq9 topilmadi'));
      const qaytdi = await prisma.tizimXatosi.findUnique({ where: { id: q[0].id } });
      return korilgan?.korilgan === true && qaytdi?.korilgan === false && qaytdi.soni === 13 && qaytdi.korilganSana === null;
    },
  },
  {
    nomi: 'Xato jurnali: bazaga SIR TUSHMAYDI (bot tokeni, baza paroli, telefon) - jadvaldagi xom matnda ham',
    tekshir: async () => {
      await xatoniYoz('test:sir', new Error(`request to https://api.telegram.org/bot${BOT_TOKENI}/sendMessage failed for +998945123378 postgresql://u:${BAZA_PAROLI}@h/db`));
      const q = await prisma.tizimXatosi.findFirst({ where: { manba: 'test:sir' } });
      const hammasi = JSON.stringify(q);
      return Boolean(q) && !hammasi.includes('AAHdqTcv') && !hammasi.includes(BAZA_PAROLI) && !hammasi.includes('945123378') && /sendMessage failed/.test(q!.xabar);
    },
  },
  {
    nomi: 'Xato jurnali: "ko\'rildi" faqat tanlangan yozuvga tegadi; hammasi - faqat ko\'rilmaganlarga; hisob (ko\'rilmagan / 7 kun) to\'g\'ri',
    tekshir: async () => {
      await tozalaJadval();
      await xatoniYoz('test:a', new Error('A xato'));
      await xatoniYoz('test:b', new Error('B xato'));
      await xatoniYoz('test:c', new Error('C xato'));
      const h0 = await xatolarHolati();
      const a = await prisma.tizimXatosi.findFirstOrThrow({ where: { manba: 'test:a' } });
      const bitta = await xatolarniKorildi(a.id);
      const h1 = await xatolarHolati();
      const qolgan = await xatolarniKorildi();
      const h2 = await xatolarHolati();
      /* 10 kunlik eski yozuv "7 kun" hisobiga kirmaydi */
      await prisma.tizimXatosi.update({ where: { id: a.id }, data: { oxirgiSana: oldin(10 * KUN) } });
      const h3 = await xatolarHolati();
      return h0.korilmagan === 3 && h0.oxirgi7Kun === 3 && bitta === 1 && h1.korilmagan === 2 && qolgan === 2 && h2.korilmagan === 0 && h3.oxirgi7Kun === 2 && h3.royxat.length === 3;
    },
  },
  {
    nomi: 'Kuzatiladigan iz: serverXatosi iz_ identifikator beradi; jurnalda shu iz bilan topiladi; mavjud iz ham saqlanadi',
    tekshir: async () => {
      const r = await serverXatosi('test:iz', new Error('Iz sinovi'));
      const topildi = await xatolarHolati(new Date(), 10, r.izId);
      const bor = izIdYarat();
      await serverXatosi('test:iz2', new Error('Boshqa iz'), bor);
      const q2 = await prisma.tizimXatosi.findFirst({ where: { manba: 'test:iz2' } });
      return /^iz_[0-9a-f]{10}$/.test(r.izId) && topildi.royxat.length === 1 && topildi.royxat[0].manba === 'test:iz' && q2?.oxirgiIzId === bor && r.izId !== bor;
    },
  },

  /* ══ C. AVTOMATIK ISHLAR ══ */
  {
    nomi: 'ishniKuzat: muvaffaqiyat - qator MUVAFFAQIYATLI, tugash vaqti, xulosa (sirsiz); natija QAYTARILADI',
    tekshir: async () => {
      const n = await ishniKuzat('sinov-ish', 'cron', async () => 7, (x) => `yuborildi: ${x}, token ${BOT_TOKENI}`);
      const q = await prisma.tizimIshi.findFirstOrThrow({ where: { nomi: 'sinov-ish' } });
      return n === 7 && q.holati === 'MUVAFFAQIYATLI' && q.usul === 'cron' && q.tugadi !== null && q.tugadi >= q.boshlandi && /yuborildi: 7/.test(q.xulosa ?? '') && !(q.xulosa ?? '').includes('AAHdqTcv') && /^iz_[0-9a-f]{10}$/.test(q.izId);
    },
  },
  {
    nomi: 'ishniKuzat: xato - ASL xato qayta tashlanadi (yutilmaydi), qator XATO, matni sirsiz, xato jurnaliga ham yoziladi',
    tekshir: async () => {
      const asl = new Error(`telegram ${BOT_TOKENI} javob bermadi`);
      let tutdi: unknown = null;
      try {
        await ishniKuzat('sinov-xato', 'cron', async () => {
          throw asl;
        });
      } catch (e) {
        tutdi = e;
      }
      const q = await prisma.tizimIshi.findFirstOrThrow({ where: { nomi: 'sinov-xato' } });
      const j = await prisma.tizimXatosi.findFirst({ where: { manba: 'cron:sinov-xato' } });
      return tutdi === asl && q.holati === 'XATO' && q.tugadi !== null && !(q.xatoMatni ?? '').includes('AAHdqTcv') && /javob bermadi/.test(q.xatoMatni ?? '') && j?.oxirgiIzId === q.izId;
    },
  },
  {
    nomi: 'ishniKuzat: KUZATUV YIQILSA ISH BAJARILADI (jurnal jadvali yozilmasa ham brifing ketadi)',
    tekshir: async () => {
      const asl = ilovaPrisma.tizimIshi.create;
      let chaqirildi = false;
      (ilovaPrisma.tizimIshi as unknown as { create: unknown }).create = () => {
        throw new Error('jadval yo‘q');
      };
      const xom = console.error;
      console.error = () => {};
      let n = 0;
      try {
        n = await ishniKuzat('sinov-yiqilgan-kuzatuv', 'cron', async () => {
          chaqirildi = true;
          return 5;
        });
      } finally {
        (ilovaPrisma.tizimIshi as unknown as { create: unknown }).create = asl;
        console.error = xom;
      }
      const q = await prisma.tizimIshi.count({ where: { nomi: 'sinov-yiqilgan-kuzatuv' } });
      return chaqirildi && n === 5 && q === 0;
    },
  },
  {
    nomi: 'ishniBaholash: yozuv yo\'q - HECH_QACHON; 36 soat chegarasi (35:59 tinch, 36:01 kechikkan); xato; to\'xtab qolgan (15 daqiqa chegarasi)',
    tekshir: async () => {
      const h = new Date();
      const b = (y: IshYozuvi[]) => ishniBaholash(y, 24, h).baho;
      const hechQachon = b([]);
      const tinch = b([yozuv('MUVAFFAQIYATLI', 2 * SOAT, 2 * SOAT)]);
      const chegaraOldi = b([yozuv('MUVAFFAQIYATLI', 36 * SOAT - 60_000, 36 * SOAT - 60_000)]);
      const chegaraKeyin = b([yozuv('MUVAFFAQIYATLI', 36 * SOAT + 60_000, 36 * SOAT + 60_000)]);
      const xato = b([yozuv('XATO', 1 * SOAT, 1 * SOAT), yozuv('MUVAFFAQIYATLI', 25 * SOAT, 25 * SOAT)]);
      const faqatXato = b([yozuv('XATO', 1 * SOAT, 1 * SOAT)]);
      const davom = b([yozuv('DAVOM_ETMOQDA', 2 * 60_000, null), yozuv('MUVAFFAQIYATLI', 20 * SOAT, 20 * SOAT)]);
      const toxtagan = b([yozuv('DAVOM_ETMOQDA', (TOXTAB_QOLISH_DAQIQA + 1) * 60_000, null), yozuv('MUVAFFAQIYATLI', 20 * SOAT, 20 * SOAT)]);
      /* Xato tuzalgan: oxirgi urinish muvaffaqiyatli bo'lsa, eski xato "hozirgi" emas */
      const tuzaldi = b([yozuv('MUVAFFAQIYATLI', 1 * SOAT, 1 * SOAT), yozuv('XATO', 25 * SOAT, 25 * SOAT)]);
      const baho = ishniBaholash([yozuv('XATO', 1 * SOAT, 1 * SOAT), yozuv('MUVAFFAQIYATLI', 25 * SOAT, 25 * SOAT)], 24, h);
      return (
        hechQachon === 'HECH_QACHON' && tinch === 'TINCH' && chegaraOldi === 'TINCH' && chegaraKeyin === 'KECHIKKAN' &&
        xato === 'XATODA' && faqatXato === 'XATODA' && davom === 'TINCH' && toxtagan === 'TOXTAB_QOLGAN' && tuzaldi === 'TINCH' &&
        /* Xato holatida ham oxirgi muvaffaqiyat YO'QOLMAYDI */
        baho.songgiMuvaffaqiyat !== null && baho.songgiUrinish !== null
      );
    },
  },
  {
    nomi: 'ishlarHolati (baza): yozuv yo\'q - "hali ishlamagan"; QO\'LDA ishga tushirish o\'lik jadvalni YASHIRMAYDI; 12 ta ketma-ket xatodan keyin ham oxirgi muvaffaqiyat topiladi, xato sirsiz',
    tekshir: async () => {
      await tozalaJadval();
      const topish = async (nomi: string) => (await ishlarHolati()).find((j) => j.nomi === nomi)!;

      const bosh = await topish('brifing');

      /* brifing: jadval 40 soat oldin ishlagan; QO'LDA hozirgina muvaffaqiyat -> jadval baribir "kechikkan" */
      await ishYoz('brifing', 'cron', 'MUVAFFAQIYATLI', 40 * SOAT);
      await ishYoz('brifing', 'qolda', 'MUVAFFAQIYATLI', 5 * 60_000);
      const a = await topish('brifing');

      /* navbat: 30 soat oldin muvaffaqiyat, keyin 12 ta xato */
      await ishYoz('navbat', 'cron', 'MUVAFFAQIYATLI', 30 * SOAT);
      for (let i = 1; i <= 12; i++) await ishYoz('navbat', 'cron', 'XATO', (i * SOAT) / 2, `Telegram ${BOT_TOKENI} xato ${i}`);
      const b = await topish('navbat');
      const farqSoat = b.songgiMuvaffaqiyat ? (Date.now() - b.songgiMuvaffaqiyat.getTime()) / SOAT : -1;

      return (
        bosh.baho === 'HECH_QACHON' && bosh.songgiMuvaffaqiyat === null &&
        a.baho === 'KECHIKKAN' && a.songgiQolda !== null && a.songgiMuvaffaqiyat !== null &&
        b.baho === 'XATODA' && farqSoat > 29.9 && farqSoat < 30.1 &&
        !(b.songgiXato ?? '').includes('AAHdqTcv') && /xato/.test(b.songgiXato ?? '') && /^iz_/.test(b.songgiXatoIz ?? '')
      );
    },
  },
  {
    nomi: 'ishlarHolati: to\'xtab qolgan ish ("davom etmoqda" 30 daqiqa) va xatodan keyin TUZALGAN jadval (hozirgi xato ko\'rsatilmaydi)',
    tekshir: async () => {
      await tozalaJadval();
      await ishYoz('brifing', 'cron', 'MUVAFFAQIYATLI', 20 * SOAT);
      await ishYoz('brifing', 'cron', 'DAVOM_ETMOQDA', 30 * 60_000);
      const toxtagan = (await ishlarHolati()).find((j) => j.nomi === 'brifing')!;

      await tozalaJadval();
      await ishYoz('navbat', 'cron', 'XATO', 30 * SOAT, 'eski xato');
      await ishYoz('navbat', 'cron', 'MUVAFFAQIYATLI', 40 * SOAT);
      await ishYoz('navbat', 'cron', 'MUVAFFAQIYATLI', 1 * SOAT);
      const tuzalgan = (await ishlarHolati()).find((j) => j.nomi === 'navbat')!;
      /* Oxirgi muvaffaqiyat ENG YANGISI (1 soat), eng eskisi (40 soat) emas */
      const soat = tuzalgan.songgiMuvaffaqiyat ? (Date.now() - tuzalgan.songgiMuvaffaqiyat.getTime()) / SOAT : -1;

      /* Ikki muvaffaqiyat (40 va 20 soat oldin), keyin xato: "oxirgi muvaffaqiyat" 20 soat, 40 emas */
      await tozalaJadval();
      await ishYoz('brifing', 'cron', 'MUVAFFAQIYATLI', 40 * SOAT);
      await ishYoz('brifing', 'cron', 'MUVAFFAQIYATLI', 20 * SOAT);
      await ishYoz('brifing', 'cron', 'XATO', 1 * SOAT, 'xato');
      const xatodan = (await ishlarHolati()).find((j) => j.nomi === 'brifing')!;
      const soat2 = xatodan.songgiMuvaffaqiyat ? (Date.now() - xatodan.songgiMuvaffaqiyat.getTime()) / SOAT : -1;

      return (
        toxtagan.baho === 'TOXTAB_QOLGAN' && tuzalgan.baho === 'TINCH' && tuzalgan.songgiXato === null && tuzalgan.songgiXatoIz === null &&
        soat > 0.9 && soat < 1.1 &&
        xatodan.baho === 'XATODA' && soat2 > 19.9 && soat2 < 20.1
      );
    },
  },

  /* ══ D. XABAR NAVBATI ══ */
  {
    nomi: 'Navbat ko\'rinishi: kutilmoqda / qayta urinish / xato / ushlanib qolgan / eng eski soat to\'g\'ri; eski yozuvdagi bot tokeni EKRANDA ko\'rinmaydi',
    tekshir: async () => {
      await prisma.xabarnoma.deleteMany({ where: { holati: { in: ['KUTILMOQDA', 'XATO'] } } });
      const mk = (holati: 'KUTILMOQDA' | 'XATO' | 'YUBORILDI', yoshiMs: number, urinishlar = 0, xatoMatni?: string) =>
        prisma.xabarnoma.create({
          data: { userId: xodim, turi: 'YANGI_ISH_ORNI', holati, matn: 'sinov', urinishlar, xatoMatni: xatoMatni ?? null, createdAt: oldin(yoshiMs) },
        });
      await mk('KUTILMOQDA', 7 * SOAT);
      await mk('KUTILMOQDA', 1 * SOAT, 1, 'fetch failed');
      await mk('XATO', 1 * KUN, 3, `request to https://api.telegram.org/bot${BOT_TOKENI}/sendMessage failed`);
      await mk('XATO', 5 * KUN, 3, 'eski xato');
      await mk('YUBORILDI', 2 * SOAT, 1);
      const h = await navbatHolati();
      const matnlar = JSON.stringify(h.royxat);
      return (
        h.kutilmoqda === 2 && h.qaytaUrinish === 1 && h.xato === 2 && h.ushlanib === 1 && h.engEskiSoat === 7 &&
        h.royxat.length === 3 && !matnlar.includes('AAHdqTcv') && /sendMessage failed/.test(matnlar)
      );
    },
  },
  {
    nomi: 'Qayta urinish: faqat so\'nggi 3 kundagi XATO xabarlar navbatga qaytadi (urinishlar 0); eskisi, yuborilgani tegilmaydi; takror bosish 0',
    tekshir: async () => {
      const birinchi = await xatoliNavbatniQaytar();
      const qolgan = await prisma.xabarnoma.findMany({ where: { userId: xodim }, orderBy: { createdAt: 'asc' }, select: { holati: true, urinishlar: true } });
      const ikkinchi = await xatoliNavbatniQaytar();
      const xatoSoni = qolgan.filter((x) => x.holati === 'XATO').length;
      const yuborildi = qolgan.filter((x) => x.holati === 'YUBORILDI').length;
      const qaytgan = qolgan.filter((x) => x.holati === 'KUTILMOQDA' && x.urinishlar === 0).length;
      /* oldin: 2 KUTILMOQDA (biri urinish=1), 2 XATO, 1 YUBORILDI. Keyin: 3 KUTILMOQDA (shundan 2 tasi urinish 0), 1 XATO */
      return birinchi === 1 && ikkinchi === 0 && xatoSoni === 1 && yuborildi === 1 && qaytgan === 2;
    },
  },
  {
    nomi: 'Telegram yuborilmasa: xabar navbatda QOLADI, 3 urinishdan keyin XATO; xatoMatni (URL ichida bot tokeni bilan) bazaga SIRSIZ yoziladi',
    tekshir: async () => {
      await prisma.xabarnoma.deleteMany({ where: { holati: { in: ['KUTILMOQDA', 'XATO'] } } });
      await prisma.user.update({ where: { id: xodim }, data: { telegramChatId: `99${Date.now()}`.slice(0, 12) } });
      const x = await prisma.xabarnoma.create({ data: { userId: xodim, turi: 'YANGI_ISH_ORNI', matn: 'sinov' } });
      const yiqiluvchi = async () => {
        throw new Error(`request to https://api.telegram.org/bot${BOT_TOKENI}/sendMessage failed, reason: socket hang up`);
      };
      const holatlar: string[] = [];
      for (let i = 0; i < 3; i++) {
        await navbatniYubor(yiqiluvchi);
        const q = await prisma.xabarnoma.findUniqueOrThrow({ where: { id: x.id } });
        holatlar.push(`${q.holati}/${q.urinishlar}`);
      }
      const oxirgi = await prisma.xabarnoma.findUniqueOrThrow({ where: { id: x.id } });
      await prisma.user.update({ where: { id: xodim }, data: { telegramChatId: null } });
      if (holatlar.join(',') !== 'KUTILMOQDA/1,KUTILMOQDA/2,XATO/3') console.log('     holatlar:', holatlar.join(','));
      return (
        holatlar.join(',') === 'KUTILMOQDA/1,KUTILMOQDA/2,XATO/3' &&
        !(oxirgi.xatoMatni ?? '').includes('AAHdqTcv') && /sendMessage failed/.test(oxirgi.xatoMatni ?? '')
      );
    },
  },

  /* ══ E. KIRISH CHEGARASI (baza) ══ */
  {
    nomi: 'Baza chegarasi: limit, qolgan, kutish vaqti; rad etilgan urinish YOZILMAYDI; oyna o\'tgach yana mumkin; login/IP bazaga xom yozilmaydi',
    tekshir: async () => {
      const k = `kirish:hisob:sinov_login_${Date.now()}`;
      const t0 = new Date();
      const r = [];
      for (let i = 0; i < 3; i++) r.push(await bazaChegarasi(k, 3, 60_000, t0));
      const rad = await bazaChegarasi(k, 3, 60_000, t0);
      const soni = await prisma.kirishUrinishi.count({ where: { kalit: kalitXeshi(k) } });
      const keyin = await bazaChegarasi(k, 3, 60_000, new Date(t0.getTime() + 61_000));
      const xom = await prisma.kirishUrinishi.count({ where: { kalit: { contains: 'sinov_login' } } });
      return (
        r.every((x) => x.allowed) && r.map((x) => x.remaining).join(',') === '2,1,0' &&
        !rad.allowed && rad.retryAfter >= 1 && rad.retryAfter <= 60 && soni === 3 && keyin.allowed && xom === 0
      );
    },
  },
  {
    nomi: 'Baza chegarasi: QAYTARISH faqat ENG OXIRGI urinishni olib tashlaydi (qolgan xato urinishlar saqlanadi); boshqa kalitga tegmaydi; bo\'sh kalitda xato yo\'q',
    tekshir: async () => {
      const k = `kirish:ip:sinov_qaytar_${Date.now()}`;
      const b = `kirish:ip:sinov_qaytar_boshqa_${Date.now()}`;
      const t0 = new Date();
      for (let i = 0; i < 4; i++) await bazaChegarasi(k, 5, 60_000, new Date(t0.getTime() + i * 1000));
      await bazaChegarasi(b, 5, 60_000, t0);
      await bazaChegarasiniQaytar(k);
      const soni = await prisma.kirishUrinishi.count({ where: { kalit: kalitXeshi(k) } });
      const eng = await prisma.kirishUrinishi.findMany({ where: { kalit: kalitXeshi(k) }, orderBy: { vaqt: 'asc' } });
      const boshqa = await prisma.kirishUrinishi.count({ where: { kalit: kalitXeshi(b) } });
      await bazaChegarasiniQaytar(`kirish:ip:yoq_${Date.now()}`);
      /* 4 urinish edi, oxirgisi qaytarildi: 3 qoladi va ular ENG ESKI uchtasi */
      const vaqtlar = eng.map((e) => e.vaqt.getTime() - t0.getTime());
      return soni === 3 && vaqtlar.join(',') === '0,1000,2000' && boshqa === 1;
    },
  },
  {
    nomi: 'Baza chegarasi: 12 ta PARALLEL urinish, limit 5 - aynan 5 tasi o\'tadi (advisory qulf: "oxirgi bo\'sh joy"ni ikkalasi olmaydi)',
    tekshir: async () => {
      const k = `kirish:ip:sinov_${Date.now()}`;
      const natijalar = await Promise.all(Array.from({ length: 12 }, () => bazaChegarasi(k, 5, 60_000)));
      const otdi = natijalar.filter((x) => x.allowed).length;
      const baza = await prisma.kirishUrinishi.count({ where: { kalit: kalitXeshi(k) } });
      if (otdi !== 5 || baza !== 5) console.log('     otdi:', otdi, 'bazada:', baza);
      return otdi === 5 && baza === 5;
    },
  },
  {
    nomi: 'Baza chegarasi: advisory QULF bor - kalit bo\'yicha qulfni boshqa tranzaksiya ushlab turganda tekshiruv KUTADI (deterministik; parallel yuk sinovi mahalliy havzada ishonchsiz)',
    tekshir: async () => {
      const k = `kirish:ip:sinov_qulf_${Date.now()}`;
      let holat = '';
      let p!: Promise<{ allowed: boolean }>;
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${kalitXeshi(k)}))`;
        p = bazaChegarasi(k, 5, 60_000);
        holat = await Promise.race([p.then(() => 'tugadi'), new Promise<string>((r) => setTimeout(() => r('kutmoqda'), 800))]);
      });
      const r = await p;
      return holat === 'kutmoqda' && r.allowed;
    },
  },
  {
    nomi: 'Baza chegarasi: XOTIRA tozalansa ham BAZA ushlab turadi (qayta ishga tushgan nusxa chegarani nolga tushirmaydi); muvaffaqiyatdan keyin tozalanadi; kalitlar mustaqil',
    tekshir: async () => {
      const a = `kirish:hisob:sinov_a_${Date.now()}`;
      const b = `kirish:hisob:sinov_b_${Date.now()}`;
      for (let i = 0; i < 2; i++) {
        checkRateLimit(a, 2, 60_000);
        await bazaChegarasi(a, 2, 60_000);
      }
      /* "yangi nusxa": xotira bo'm-bo'sh */
      resetRateLimit(a);
      const xotiraOtkazadi = checkRateLimit(a, 2, 60_000).allowed;
      const bazaRad = await bazaChegarasi(a, 2, 60_000);
      const boshqa = await bazaChegarasi(b, 2, 60_000);
      await bazaChegarasiniTozala(a);
      const tozalangach = await bazaChegarasi(a, 2, 60_000);
      return xotiraOtkazadi && !bazaRad.allowed && boshqa.allowed && tozalangach.allowed;
    },
  },
  {
    nomi: 'Eski yozuvlar tozalanadi: 1 kundan eski kirish urinishlari va 60 kundan eski ish izlari ketadi, yangilari qoladi',
    tekshir: async () => {
      await tozalaJadval();
      await prisma.kirishUrinishi.createMany({ data: [{ kalit: 'eski', vaqt: oldin(2 * KUN) }, { kalit: 'yangi', vaqt: oldin(1 * SOAT) }] });
      await ishYoz('brifing', 'cron', 'MUVAFFAQIYATLI', 61 * KUN);
      await ishYoz('brifing', 'cron', 'MUVAFFAQIYATLI', 2 * KUN);
      const t = await eskiYozuvlarniTozala();
      const u = await prisma.kirishUrinishi.findMany({ select: { kalit: true } });
      const i = await prisma.tizimIshi.count();
      return t.urinish === 1 && t.iz === 1 && u.length === 1 && u[0].kalit === 'yangi' && i === 1;
    },
  },

  /* ══ F. ZAXIRA ══ */
  {
    nomi: 'Zaxira bahosi: sinov yo\'q - "hali sinalmagan"; 92 kun - yangi, 93 kun - eskirgan; muvaffaqiyatsiz sinov - xato',
    tekshir: async () => {
      const h = new Date();
      const k = (kun: number, natija: 'MUVAFFAQIYATLI' | 'XATO' = 'MUVAFFAQIYATLI') => zaxiraniBaholash({ otkazilganSana: new Date(h.getTime() - kun * KUN - 1000), natija }, h).baho;
      return (
        zaxiraniBaholash(null, h).baho === 'HECH_QACHON' && zaxiraniBaholash(null, h).kun === null &&
        k(0) === 'YANGI' && k(ZAXIRA_ESKIRISH_KUNI) === 'YANGI' && k(ZAXIRA_ESKIRISH_KUNI + 1) === 'ESKIRGAN' && k(1, 'XATO') === 'XATO'
      );
    },
  },
  {
    nomi: 'Zaxira (baza): OXIRGI sinov muvaffaqiyatsiz bo\'lsa, undan oldingi eski muvaffaqiyat TINCHLANTIRMAYDI',
    tekshir: async () => {
      await tozalaJadval();
      const bosh = await zaxiraHolati();
      await prisma.zaxiraTekshiruvi.create({ data: { otkazilganSana: oldin(10 * KUN), natija: 'MUVAFFAQIYATLI', izoh: 'Sinov: tiklandi, sonlar mos', kimId: xodim } });
      const yaxshi = await zaxiraHolati();
      await prisma.zaxiraTekshiruvi.create({ data: { otkazilganSana: oldin(1 * KUN), natija: 'XATO', izoh: 'Sinov: tiklanmadi', kimId: xodim } });
      const yomon = await zaxiraHolati();
      return bosh.baho.baho === 'HECH_QACHON' && yaxshi.baho.baho === 'YANGI' && yaxshi.baho.kun === 10 && yomon.baho.baho === 'XATO' && yomon.royxat.length === 2 && yomon.royxat[0].natija === 'XATO';
    },
  },

  /* ══ G. VAZIFALAR TAXTASI (administrator) ══ */
  {
    nomi: 'Vazifalar: "xatolar" blogi ENDI O\'LCHANADI (ko\'rilmaganlar soni, "0" yolg\'on emas), sirsiz; "ko\'rildi"dan keyin kamayadi',
    tekshir: async () => {
      await tozalaJadval();
      const blok = async (kalit: string) => (await vazifalarim({ userId: xodim, rol: 'ADMIN', mahallaId: null })).bloklar.find((b) => b.kalit === kalit);
      const bosh = await blok('xatolar');
      await xatoniYoz('test:v1', new Error(`Telegram ${BOT_TOKENI} yiqildi`));
      await xatoniYoz('test:v2', new Error('Ikkinchi xato'));
      const ikki = await blok('xatolar');
      await xatolarniKorildi();
      const nol = await blok('xatolar');
      const matn = JSON.stringify(ikki);
      return (
        bosh?.soni === 0 && !bosh?.yetishmayotgan && !!bosh?.hisoblash &&
        ikki?.soni === 2 && ikki.qatorlar.length === 2 && ikki.ogohlik === 'diqqat' && !matn.includes('AAHdqTcv') &&
        nol?.soni === 0 && nol.ogohlik === 'tinch' &&
        /кузатув уланган/.test(ikki?.hisoblash?.ogohlik ?? '')
      );
    },
  },
  {
    nomi: 'Vazifalar: "zaxira" blogi - sinov yo\'q: o\'lchanmaydi va SHOSHILINCH; yangi sinov: tinch, kun soni; 100 kunlik sinov: shoshilinch',
    tekshir: async () => {
      await tozalaJadval();
      const blok = async () => (await vazifalarim({ userId: xodim, rol: 'ADMIN', mahallaId: null })).bloklar.find((b) => b.kalit === 'zaxira')!;
      const yoq = await blok();
      await prisma.zaxiraTekshiruvi.create({ data: { otkazilganSana: oldin(5 * KUN), natija: 'MUVAFFAQIYATLI', izoh: 'Sinov: tiklandi, sonlar mos keldi', kimId: xodim } });
      const yangi = await blok();
      await prisma.zaxiraTekshiruvi.deleteMany({});
      await prisma.zaxiraTekshiruvi.create({ data: { otkazilganSana: oldin(100 * KUN), natija: 'MUVAFFAQIYATLI', izoh: 'Sinov: tiklandi, sonlar mos keldi', kimId: xodim } });
      const eski = await blok();
      return (
        Boolean(yoq.yetishmayotgan) && yoq.ogohlik === 'shoshilinch' &&
        !yangi.yetishmayotgan && yangi.ogohlik === 'tinch' && yangi.soni === 5 && !!yangi.hisoblash?.usuli &&
        !eski.yetishmayotgan && eski.ogohlik === 'shoshilinch' && eski.soni === 100
      );
    },
  },
  {
    nomi: 'Vazifalar: "cron-holati" blogi - kechikkan/xatoli jadval SHOSHILINCH, hammasi tinch bo\'lsa tinch; "navbat" blogi qayta urinishni ko\'rsatadi',
    tekshir: async () => {
      await tozalaJadval();
      await prisma.xabarnoma.deleteMany({ where: { holati: { in: ['KUTILMOQDA', 'XATO'] } } });
      const taxta = async () => (await vazifalarim({ userId: xodim, rol: 'ADMIN', mahallaId: null })).bloklar;
      for (const j of CRON_ISHLARI) await ishYoz(j.nomi, 'cron', 'MUVAFFAQIYATLI', 2 * SOAT);
      const tinch = (await taxta()).find((b) => b.kalit === 'cron-holati');
      await ishYoz('brifing', 'cron', 'XATO', 10 * 60_000, 'Brifing tayyorlanmadi');
      const xato = (await taxta()).find((b) => b.kalit === 'cron-holati');
      await prisma.xabarnoma.create({ data: { userId: xodim, turi: 'YANGI_ISH_ORNI', matn: 'sinov', holati: 'KUTILMOQDA', urinishlar: 1 } });
      const navbat = (await taxta()).find((b) => b.kalit === 'navbat');
      return (
        tinch?.soni === 0 && tinch.ogohlik === 'tinch' && tinch.qatorlar.length === CRON_ISHLARI.length &&
        xato?.soni === 1 && xato.ogohlik === 'shoshilinch' &&
        Boolean(navbat?.qatorlar.some((q) => q.id === 'qayta' && q.qoshimcha === '1 та'))
      );
    },
  },

  /* ══ H. KOD VA SOZLAMA (xulq-atvor sinovlari bilan to'ldiriladi) ══ */
  {
    nomi: 'Cron ro\'yxati vercel.json bilan BIR XIL (yangi cron qo\'shilsa-yu ro\'yxatga qo\'shilmasa, o\'lib qolganini hech kim ko\'rmaydi)',
    tekshir: async () => {
      const v = JSON.parse(oqi('vercel.json')) as { crons: { path: string }[] };
      const yollar = v.crons.map((c) => c.path).sort();
      const royxat = CRON_ISHLARI.map((j) => j.yol).sort();
      return yollar.length > 0 && JSON.stringify(yollar) === JSON.stringify(royxat);
    },
  },
  {
    nomi: 'Kod: cron yo\'llari ishniKuzat ichida; navbat yo\'lida kunlik tozalash Telegram tekshiruvidan OLDIN; xabarnoma xom xato matnini yozmaydi; kirish yo\'li ikki qatlam; muvaffaqiyatda hisobni tozalaydi, IP ni FAQAT qaytaradi (tozalamaydi)',
    tekshir: async () => {
      const brifing = oqi('src/app/api/cron/brifing/route.ts');
      const navbat = oqi('src/app/api/telegram/navbat/route.ts');
      const xab = oqi('src/lib/xabarnoma.ts');
      const kirish = oqi('src/app/api/auth/kirish/route.ts');
      const tozalashIdx = navbat.indexOf('eskiYozuvlarniTozala()');
      const telegramIdx = navbat.indexOf('if (!telegramSozlanganmi()) {\n    return {');
      const hisob = kirish.indexOf('checkRateLimit(hisobKaliti(username)');
      const hisobBaza = kirish.indexOf('bazaChegarasiYumshoq(hisobKaliti(username)');
      const kuser = kirish.indexOf('prisma.user.findUnique');
      return (
        brifing.includes("ishniKuzat(\n      'brifing'") && brifing.includes("cronmi ? 'cron' : 'qolda'") &&
        navbat.includes("'navbat',\n      cronmi ? 'cron' : 'qolda'") &&
        tozalashIdx > 0 && telegramIdx > tozalashIdx &&
        xab.includes('xatoMatni: maxfiyniTozala(e)') && !/message\.slice\(0, 500\)/.test(xab) &&
        hisob > 0 && hisobBaza > hisob && hisobBaza < kuser &&
        kirish.includes('if (ipBaza && !ipBaza.allowed) return juda_kop(ipBaza.retryAfter, false);') &&
        kirish.includes('if (hisobBaza && !hisobBaza.allowed) return juda_kop(hisobBaza.retryAfter, true);') &&
        kirish.includes('bazaChegarasiniTozala(hisobKaliti(username))') &&
        kirish.includes('bazaChegarasiniQaytar(ipKaliti(ip))') &&
        !/bazaChegarasiniTozala\([^)]*ipKaliti/.test(kirish)
      );
    },
  },
  {
    nomi: 'Sahifa: /tizim faqat ADMIN (menyu va sahifa), API\'lar rol tekshiradi; xatoni ekranga chiqarishdan oldin yana tozalanadi',
    tekshir: async () => {
      const m = oqi('src/components/shell/navigatsiya.ts');
      const i = m.indexOf("yol: '/tizim'");
      const blok = m.slice(i, i + 200);
      const sahifa = oqi('src/app/(ilova)/tizim/page.tsx');
      const xatolar = oqi('src/app/api/admin/xatolar/route.ts');
      const zaxira = oqi('src/app/api/admin/zaxira/route.ts');
      const qayta = oqi('src/app/api/admin/navbat-qayta/route.ts');
      const kuz = oqi('src/lib/tizim-kuzatuvi.ts');
      return (
        i > 0 && /rollar:\s*\['ADMIN'\]/.test(blok) && sahifa.includes("yolgaRuxsat(sessiya.rol, '/tizim')") &&
        xatolar.includes("talabQil(['ADMIN'])") && zaxira.includes("talabQil(['ADMIN'])") && qayta.includes("talabQil(['ADMIN', 'BANDLIK_RAHBAR'])") &&
        kuz.includes('xabar: maxfiyniTozala(x.xabar)') && kuz.includes('xatoMatni: x.xatoMatni ? maxfiyniTozala(x.xatoMatni)')
      );
    },
  },
  {
    nomi: 'Migratsiya faqat qo\'shadi: 4 jadval, 2 tur, mavjud jadvalga tegmaydi; takror ishga tushirish xavfsiz (IF NOT EXISTS)',
    tekshir: async () => {
      const m = oqi('prisma/migrations/20261001220000_monitoring/migration.sql');
      const kod = m.split('\n').filter((q) => !q.trim().startsWith('--')).join('\n');
      return (
        !/DROP\s|TRUNCATE|RENAME|SET NOT NULL|ALTER COLUMN|ALTER TABLE "(?!ZaxiraTekshiruvi")/i.test(kod) &&
        (kod.match(/CREATE TABLE IF NOT EXISTS/g) ?? []).length === 4 &&
        (kod.match(/CREATE TYPE/g) ?? []).length === 2 &&
        !/CREATE INDEX "|CREATE UNIQUE INDEX "/.test(kod)
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
  await ilovaPrisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
