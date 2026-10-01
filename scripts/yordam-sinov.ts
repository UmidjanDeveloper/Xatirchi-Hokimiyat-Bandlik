/**
 * ============================================================
 *  YORDAM DASTURLARI KATALOGI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/yordam-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *   1. TIZIM O'ZI DASTUR YOKI SUMMA TO'QISA - fuqaroga bo'lmagan yordam va'da
 *      qilinadi. Katalog BO'SH boshlanishi va hech qayerda tayyor dastur
 *      bo'lmasligi shart.
 *
 *   2. MUDDATI TUGAGAN YOKI UZOQ TEKSHIRILMAGAN DASTUR "AMALDA" DEB
 *      TAVSIYA QILINSA - fuqaro yopilgan dasturga yo'naltiriladi.
 *
 *   3. MANBASIZ DASTUR YOZILSA - ma'lumotni kim aytgani noma'lum.
 *
 *   4. MATNNI TAHRIRLASH "MANBADAN TEKSHIRILDI" BO'LIB QOLSA - eski ma'lumot
 *      yangi ko'rinadi.
 *
 *   5. NOMA'LUM MUDDAT "CHEKSIZ" DEB QABUL QILINSA.
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
  DasturAmaliSxemasi,
  DasturYaratishSxemasi,
  YORDAM_ESKIRISH_KUNI,
  YORDAM_HTTP,
  YORDAM_MUDDAT_OGOHI_KUNI,
  YordamXatosi,
  amaldagiDasturlar,
  dasturAmali,
  dasturHolati,
  dasturYaratish,
  dasturniTekshir,
  tavsiyaQilinadimi,
  tekshirishKerakDasturlar,
  tekshirishKerakmi,
  yordamKorsatkichlarniHisobla,
  type DasturSanalari,
} from '../src/lib/yordam-dasturlari';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const KUN = 24 * 60 * 60 * 1000;
const oqi = (y: string) => readFileSync(y, 'utf8');
const noyob = (a: string) => `${a} ${Date.now()}${Math.floor(Math.random() * 100000)}`;
const keyin = (n: number, h = new Date()) => new Date(h.getTime() + n * KUN);

let bandlik = '';
let yettilik = '';
const xodimlar: string[] = [];
const dasturlar: string[] = [];
const BANDLIK = () => ({ userId: bandlik });

async function tayyorla() {
  const mk = async (nom: string, rol: 'BANDLIK' | 'YETTILIK', mahallaId?: string | null) => {
    const x = await prisma.user.create({
      data: { username: noyob(nom).replace(/\s/g, '_'), fullName: nom, passwordHash: 'x', rol, mahallaId: mahallaId ?? null },
      select: { id: true },
    });
    xodimlar.push(x.id);
    return x.id;
  };
  const m = await prisma.mahalla.findFirstOrThrow({ select: { id: true } });
  bandlik = await mk('Sinov yordam bandlik', 'BANDLIK');
  yettilik = await mk('Sinov yordam yettilik', 'YETTILIK', m.id);
}

async function tozala() {
  await prisma.yordamDasturi.deleteMany({ where: { OR: [{ id: { in: dasturlar } }, { yaratganId: { in: xodimlar } }] } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
}

/** Dastur (to'g'ridan-to'g'ri bazaga): istalgan holatda */
async function dasturBaza(q: {
  nomi?: string;
  boshi?: number | null;
  oxiri?: number | null;
  tekshirilgan?: number;
  faol?: boolean;
} = {}) {
  const d = await prisma.yordamDasturi.create({
    data: {
      nomi: q.nomi ?? noyob('Sinov dasturi'),
      nishonGuruh: 'Sinov guruhi',
      talablar: 'Sinov talablari',
      masulTashkilot: 'Sinov tashkiloti',
      rasmiyManba: 'Sinov hujjati № 1',
      amalQilishBoshi: q.boshi === undefined || q.boshi === null ? null : keyin(q.boshi),
      amalQilishOxiri: q.oxiri === undefined || q.oxiri === null ? null : keyin(q.oxiri),
      tekshirilganSana: keyin(q.tekshirilgan ?? -5),
      tekshirganId: bandlik,
      faol: q.faol ?? true,
      yopilganSana: q.faol === false ? new Date() : null,
      yopilishSababi: q.faol === false ? 'Sinov' : null,
      yaratganId: bandlik,
    },
    select: { id: true },
  });
  dasturlar.push(d.id);
  return d.id;
}

const xatoKodi = async (f: () => Promise<unknown>): Promise<string | null> => {
  try {
    await f();
    return null;
  } catch (e) {
    return e instanceof YordamXatosi ? e.kod : `BOSHQA:${(e as Error).message.slice(0, 90)}`;
  }
};

const sana = (q: Partial<{ faol: boolean; boshi: number | null; oxiri: number | null; tekshirilgan: number }> = {}, h = new Date()): DasturSanalari => ({
  faol: q.faol ?? true,
  amalQilishBoshi: q.boshi == null ? null : keyin(q.boshi, h),
  amalQilishOxiri: q.oxiri == null ? null : keyin(q.oxiri, h),
  tekshirilganSana: keyin(q.tekshirilgan ?? -5, h),
});

const asosiyMaydonlar = (q: Record<string, unknown> = {}) => ({
  nomi: noyob('Sinov dasturi'),
  nishonGuruh: 'Kam ta‘minlangan oilalar',
  talablar: 'Oila a‘zolari ro‘yxatda turishi kerak',
  masulTashkilot: 'Bandlik markazi',
  rasmiyManba: 'Sinov qarori № 5',
  ...q,
});

const SINOVLAR: Sinov[] = [
  /* ══ 1. KATALOG BO'SH BOSHLANADI (to'qima dastur yo'q) ══ */
  {
    nomi: 'Katalog BO‘SH boshlanadi: migratsiya, seed va kod hech qayerda tayyor dastur yozmaydi',
    tekshir: async () => {
      const sql = oqi('prisma/migrations/20261001200000_murojaat_va_yordam/migration.sql');
      const hammasi = [sql, ...['prisma/seed.ts', 'prisma/seed-demo.ts'].filter((f) => { try { oqi(f); return true; } catch { return false; } }).map(oqi)].join('\n');
      const yozadi = /INSERT\s+INTO\s+"?YordamDasturi"?/i.test(hammasi) || /yordamDasturi\s*\.\s*(create|createMany|upsert)/.test(hammasi);
      const lib = oqi('src/lib/yordam-dasturlari.ts').replace(/\/\*[\s\S]*?\*\//g, '');
      /* Tayyor dastur nomlari ro'yxati (massiv literal) yo'q: faqat sxema orqali kiritiladi */
      const tayyor = /(const|let)\s+\w*(DASTURLAR|PROGRAMS|TAYYOR)\w*\s*=\s*\[/i.test(lib);
      return !yozadi && !tayyor;
    },
  },

  /* ══ 2. TOZA FUNKSIYALAR ══ */
  {
    nomi: 'Dastur holati ustuvorligi: yopiq > muddati tugagan > hali boshlanmagan > eskirgan > amalda',
    tekshir: async () => {
      const h = new Date();
      const t = (q: Parameters<typeof sana>[0]) => dasturHolati(sana(q, h), h);
      return (
        t({}) === 'AMALDA' &&
        t({ faol: false }) === 'YOPIQ' &&
        /* Yopiq + muddati tugagan: yopiq ustun */
        t({ faol: false, oxiri: -5 }) === 'YOPIQ' &&
        t({ oxiri: -1 }) === 'MUDDATI_TUGAGAN' &&
        /* Muddati tugagan + eskirgan: muddati tugagan ustun */
        t({ oxiri: -1, tekshirilgan: -YORDAM_ESKIRISH_KUNI - 10 }) === 'MUDDATI_TUGAGAN' &&
        t({ boshi: 3 }) === 'HALI_BOSHLANMAGAN' &&
        t({ boshi: 3, tekshirilgan: -YORDAM_ESKIRISH_KUNI - 10 }) === 'HALI_BOSHLANMAGAN' &&
        t({ tekshirilgan: -YORDAM_ESKIRISH_KUNI - 1 }) === 'ESKIRGAN' &&
        t({ tekshirilgan: -YORDAM_ESKIRISH_KUNI }) === 'AMALDA'
      );
    },
  },
  {
    nomi: 'Noma‘lum muddat (null) "cheksiz" emas va "tugagan" ham emas: tavsiya qilinadi, lekin tekshiruv eskirsa chiqadi',
    tekshir: async () => {
      const h = new Date();
      return (
        dasturHolati(sana({ oxiri: null, boshi: null }, h), h) === 'AMALDA' &&
        tavsiyaQilinadimi(sana({}, h), h) &&
        !tavsiyaQilinadimi(sana({ tekshirilgan: -YORDAM_ESKIRISH_KUNI - 5 }, h), h)
      );
    },
  },
  {
    nomi: 'Tavsiya FAQAT "amalda"; chegarada: tugash kuni hali amalda, ertasi tugagan; Toshkent kuni bo‘yicha',
    tekshir: async () => {
      const h = new Date();
      const hozir = new Date('2026-10-10T20:00:00Z'); /* Toshkentda 11-oktabr 01:00 */
      const oxiri = (iso: string) => ({ faol: true, amalQilishBoshi: null, amalQilishOxiri: new Date(iso), tekshirilganSana: hozir });
      return (
        tavsiyaQilinadimi(sana({ oxiri: 0 }, h), h) &&
        !tavsiyaQilinadimi(sana({ oxiri: -1 }, h), h) &&
        !tavsiyaQilinadimi(sana({ boshi: 1 }, h), h) &&
        !tavsiyaQilinadimi(sana({ faol: false }, h), h) &&
        /* 11-oktabr Toshkent kuni: muddat 11-oktabr 12:00 -> hali amalda; 10-oktabr -> tugagan */
        dasturHolati(oxiri('2026-10-11T07:00:00Z'), hozir) === 'AMALDA' &&
        dasturHolati(oxiri('2026-10-10T07:00:00Z'), hozir) === 'MUDDATI_TUGAGAN'
      );
    },
  },
  {
    nomi: 'Tekshirish kerak: eskirgan / muddati tugagan-u yopilmagan / muddati 14 kun ichida; yopiq va sog‘lom dastur kirmaydi',
    tekshir: async () => {
      const h = new Date();
      const k = (q: Parameters<typeof sana>[0]) => tekshirishKerakmi(sana(q, h), h);
      return (
        k({}) === null &&
        k({ faol: false, oxiri: -3 }) === null &&
        k({ tekshirilgan: -YORDAM_ESKIRISH_KUNI - 2 }) === 'eskirgan' &&
        k({ oxiri: -2 }) === 'muddati-tugagan' &&
        k({ oxiri: YORDAM_MUDDAT_OGOHI_KUNI }) === 'muddati-yaqin' &&
        k({ oxiri: YORDAM_MUDDAT_OGOHI_KUNI + 1 }) === null &&
        k({ oxiri: 0 }) === 'muddati-yaqin'
      );
    },
  },
  {
    nomi: 'Ko‘rsatkich: har holat alohida sanaladi; bo‘sh ro‘yxatda hamma son nol, xato yo‘q',
    tekshir: async () => {
      const h = new Date();
      const k = yordamKorsatkichlarniHisobla(
        [
          sana({}, h),
          sana({ oxiri: 30 }, h),
          sana({ tekshirilgan: -100 }, h),
          sana({ oxiri: -4 }, h),
          sana({ boshi: 5 }, h),
          sana({ faol: false }, h),
          sana({ oxiri: 7 }, h),
        ],
        h
      );
      const bosh = yordamKorsatkichlarniHisobla([]);
      return (
        k.jami === 7 && k.amalda === 3 && k.eskirgan === 1 && k.muddatiTugagan === 1 && k.haliBoshlanmagan === 1 && k.yopiq === 1 &&
        /* tekshirish kerak: eskirgan + tugagan + yaqin(7 kun) */
        k.tekshirishKerak === 3 &&
        bosh.jami === 0 && bosh.amalda === 0 && bosh.tekshirishKerak === 0
      );
    },
  },
  {
    nomi: 'Sxema: rasmiy manba, nom, talab, masul tashkilot majburiy; muddat ixtiyoriy; noto‘g‘ri sana rad; tekshirilgan sana kelajak bo‘lmaydi',
    tekshir: async () => {
      const y = (q: Record<string, unknown>) => DasturYaratishSxemasi.safeParse({ ...asosiyMaydonlar(), ...q }).success;
      const h = new Date();
      return (
        y({}) &&
        !y({ rasmiyManba: '' }) && !y({ rasmiyManba: undefined }) && !y({ rasmiyManba: 'ab' }) &&
        !y({ nomi: 'ab' }) && !y({ talablar: '' }) && !y({ masulTashkilot: '' }) && !y({ nishonGuruh: '' }) &&
        y({ amalQilishBoshi: null, amalQilishOxiri: null }) &&
        !y({ amalQilishOxiri: 'tez orada' }) &&
        dasturniTekshir({ amalQilishBoshi: keyin(5, h), amalQilishOxiri: keyin(2, h) }, h) !== null &&
        dasturniTekshir({ amalQilishBoshi: keyin(2, h), amalQilishOxiri: keyin(5, h) }, h) === null &&
        dasturniTekshir({ tekshirilganSana: keyin(2, h) }, h) !== null &&
        dasturniTekshir({}, h) === null &&
        !DasturAmaliSxemasi.safeParse({ amal: 'yopish' }).success &&
        DasturAmaliSxemasi.safeParse({ amal: 'yopish', sabab: 'Dastur tugadi' }).success &&
        !DasturAmaliSxemasi.safeParse({ amal: 'yoq-amal' }).success
      );
    },
  },

  /* ══ 3. BAZA ══ */
  {
    nomi: 'Yaratish: manba va tekshirilgan sana saqlanadi (bo‘sh bo‘lsa - bugun), tekshirgan - kiritgan xodim; muddat bo‘sh qolsa NULL; kelajak tekshiruv sanasi rad',
    tekshir: async () => {
      const d = DasturYaratishSxemasi.parse(asosiyMaydonlar({ miqdori: 'Manbadagi matn: 5 baravar' }));
      const r = await dasturYaratish(BANDLIK(), d);
      dasturlar.push(r.id);
      const m = await prisma.yordamDasturi.findUnique({ where: { id: r.id } });
      const kelajak = await xatoKodi(() => dasturYaratish(BANDLIK(), DasturYaratishSxemasi.parse(asosiyMaydonlar({ tekshirilganSana: keyin(3).toISOString() }))));
      const tartib = await xatoKodi(() => dasturYaratish(BANDLIK(), DasturYaratishSxemasi.parse(asosiyMaydonlar({ amalQilishBoshi: keyin(9).toISOString(), amalQilishOxiri: keyin(2).toISOString() }))));
      return (
        m?.rasmiyManba === 'Sinov qarori № 5' && m.tekshirganId === bandlik && m.yaratganId === bandlik &&
        Math.abs((m.tekshirilganSana?.getTime() ?? 0) - Date.now()) < 60_000 &&
        m.amalQilishBoshi === null && m.amalQilishOxiri === null && m.faol === true &&
        m.miqdori === 'Manbadagi matn: 5 baravar' &&
        kelajak === 'NOTOGRI' && tartib === 'NOTOGRI'
      );
    },
  },
  {
    nomi: '"Manbadan tekshirildi" sanani va tekshirganni yangilaydi; TAHRIR yangilamaydi (eskirgan dastur tahrirdan keyin ham eskirgan)',
    tekshir: async () => {
      const id = await dasturBaza({ tekshirilgan: -YORDAM_ESKIRISH_KUNI - 20 });
      const oldin = (await prisma.yordamDasturi.findUnique({ where: { id } }))!;
      await dasturAmali({ userId: yettilik }, id, { amal: 'tahrir', maydonlar: { talablar: 'Yangi talablar matni' } });
      const tahrirdan = (await prisma.yordamDasturi.findUnique({ where: { id } }))!;
      const holatTahrir = dasturHolati(tahrirdan);
      await dasturAmali({ userId: yettilik }, id, { amal: 'tekshirildi', rasmiyManba: 'Yangi qaror № 9' });
      const keyingi = (await prisma.yordamDasturi.findUnique({ where: { id } }))!;
      return (
        tahrirdan.talablar === 'Yangi talablar matni' &&
        tahrirdan.tekshirilganSana.getTime() === oldin.tekshirilganSana.getTime() &&
        holatTahrir === 'ESKIRGAN' &&
        keyingi.tekshirilganSana.getTime() > oldin.tekshirilganSana.getTime() + 100 * KUN &&
        keyingi.tekshirganId === yettilik && keyingi.rasmiyManba === 'Yangi qaror № 9' &&
        dasturHolati(keyingi) === 'AMALDA'
      );
    },
  },
  {
    nomi: 'Tahrir: bo‘sh va noto‘g‘ri sana tartibi rad; faqat berilgan maydon o‘zgaradi; muddatni bo‘shatish (null) "noma‘lum" bo‘ladi',
    tekshir: async () => {
      const id = await dasturBaza({ oxiri: 30 });
      const bosh = await xatoKodi(() => dasturAmali(BANDLIK(), id, { amal: 'tahrir', maydonlar: {} }));
      const tartib = await xatoKodi(() => dasturAmali(BANDLIK(), id, { amal: 'tahrir', maydonlar: { amalQilishBoshi: keyin(60) } }));
      await dasturAmali(BANDLIK(), id, { amal: 'tahrir', maydonlar: { nomi: 'Yangi nom dasturi' } });
      const a = await prisma.yordamDasturi.findUnique({ where: { id } });
      await dasturAmali(BANDLIK(), id, { amal: 'tahrir', maydonlar: { amalQilishOxiri: null } });
      const b = await prisma.yordamDasturi.findUnique({ where: { id } });
      return bosh === 'NOTOGRI' && tartib === 'NOTOGRI' && a?.nomi === 'Yangi nom dasturi' && a.nishonGuruh === 'Sinov guruhi' && a.amalQilishOxiri !== null && b?.amalQilishOxiri === null;
    },
  },
  {
    nomi: 'Yopish: sabab bilan, ikkinchi marta - holat xatosi; qayta ochish tekshirilgan sanani O‘ZGARTIRMAYDI (eskirgan qayta ochilgan dastur "amalda" bo‘lmaydi)',
    tekshir: async () => {
      const id = await dasturBaza({ tekshirilgan: -YORDAM_ESKIRISH_KUNI - 30 });
      await dasturAmali(BANDLIK(), id, { amal: 'yopish', sabab: 'Dastur to‘xtatildi' });
      const yopiq = (await prisma.yordamDasturi.findUnique({ where: { id } }))!;
      const yana = await xatoKodi(() => dasturAmali(BANDLIK(), id, { amal: 'yopish', sabab: 'Yana yopish' }));
      const tekshirYopiq = await xatoKodi(() => dasturAmali(BANDLIK(), id, { amal: 'tekshirildi' }));
      await dasturAmali(BANDLIK(), id, { amal: 'qaytarish' });
      const ochiq = (await prisma.yordamDasturi.findUnique({ where: { id } }))!;
      const qaytaYana = await xatoKodi(() => dasturAmali(BANDLIK(), id, { amal: 'qaytarish' }));
      return (
        yopiq.faol === false && yopiq.yopilishSababi === 'Dastur to‘xtatildi' && yopiq.yopilganSana !== null &&
        yana === 'HOLAT' && tekshirYopiq === 'HOLAT' &&
        ochiq.faol === true && ochiq.yopilishSababi === null &&
        ochiq.tekshirilganSana.getTime() === yopiq.tekshirilganSana.getTime() &&
        dasturHolati(ochiq) === 'ESKIRGAN' && qaytaYana === 'HOLAT'
      );
    },
  },
  {
    nomi: 'POYGA: bir dasturni bir vaqtda ikki marta yopish - faqat bittasi o‘tadi',
    tekshir: async () => {
      let togri = true;
      for (let i = 0; i < 5; i++) {
        const id = await dasturBaza();
        const r = await Promise.all([
          xatoKodi(() => dasturAmali(BANDLIK(), id, { amal: 'yopish', sabab: 'Birinchi sabab' })),
          xatoKodi(() => dasturAmali(BANDLIK(), id, { amal: 'yopish', sabab: 'Ikkinchi sabab' })),
        ]);
        togri = togri && r.filter((x) => x === null).length === 1 && r.filter((x) => x === 'HOLAT').length === 1;
      }
      return togri;
    },
  },
  {
    nomi: 'Noma‘lum id "topilmadi"',
    tekshir: async () => (await xatoKodi(() => dasturAmali(BANDLIK(), 'yoq-id', { amal: 'tekshirildi' }))) === 'TOPILMADI',
  },

  /* ══ 4. TAVSIYA RO'YXATI ══ */
  {
    nomi: 'Amaldagi dasturlar ro‘yxati: yopiq, muddati tugagan, eskirgan, hali boshlanmagan CHIQMAYDI; amalda va muddati noma‘lum chiqadi',
    tekshir: async () => {
      const mos = await dasturBaza({ oxiri: 40 });
      const nomalum = await dasturBaza({ oxiri: null });
      const yopiq = await dasturBaza({ faol: false });
      const tugagan = await dasturBaza({ oxiri: -3 });
      const eskirgan = await dasturBaza({ tekshirilgan: -YORDAM_ESKIRISH_KUNI - 15 });
      const boshlanmagan = await dasturBaza({ boshi: 10 });
      const idlar = (await amaldagiDasturlar(new Date(), 100)).map((d) => d.id);
      return (
        idlar.includes(mos) && idlar.includes(nomalum) &&
        ![yopiq, tugagan, eskirgan, boshlanmagan].some((x) => idlar.includes(x)) &&
        (await amaldagiDasturlar(new Date(), 100)).every((d) => d.holati === 'AMALDA')
      );
    },
  },
  {
    nomi: 'Tekshirish kerak ro‘yxati: sababi bilan (eskirgan, muddati tugagan, muddati yaqin); sog‘lom va yopiq dastur kirmaydi',
    tekshir: async () => {
      const eskirgan = await dasturBaza({ tekshirilgan: -YORDAM_ESKIRISH_KUNI - 10 });
      const tugagan = await dasturBaza({ oxiri: -2 });
      const yaqin = await dasturBaza({ oxiri: 6 });
      const sogolom = await dasturBaza({ oxiri: 90 });
      const yopiq = await dasturBaza({ faol: false, oxiri: -5 });
      const r = await tekshirishKerakDasturlar();
      const sabab = (id: string) => r.find((x) => x.id === id)?.sabab;
      return sabab(eskirgan) === 'eskirgan' && sabab(tugagan) === 'muddati-tugagan' && sabab(yaqin) === 'muddati-yaqin' && !sabab(sogolom) && !sabab(yopiq);
    },
  },
  {
    nomi: 'Vazifalar taxtasi: bandlikka "yordam-tekshiruv" bloki HAQIQIY (katalog to‘la); mahalla xodimiga va hokimga chiqmaydi',
    tekshir: async () => {
      await dasturBaza({ tekshirilgan: -YORDAM_ESKIRISH_KUNI - 10 });
      const blok = async (rol: 'BANDLIK' | 'YETTILIK' | 'HOKIM', userId: string) => {
        const t = await vazifalarim({ userId, rol, mahallaId: null });
        return t.bloklar.find((b) => b.kalit === 'yordam-tekshiruv');
      };
      const b = await blok('BANDLIK', bandlik);
      const y = await blok('YETTILIK', yettilik);
      const h = await blok('HOKIM', bandlik);
      return !!b && !b.yetishmayotgan && b.soni >= 1 && b.qatorlar.length >= 1 && !y && !h;
    },
  },

  /* ══ 5. KOD, HUQUQ, SAHIFA ══ */
  {
    nomi: 'API: har yo‘l sessiyani talab qiladi; katalogni FAQAT bandlik/rahbar/admin yuritadi (mahalla xodimi va hokim - yo‘q); xatolar HTTP kodi bilan',
    tekshir: async () => {
      const fayllar = ['src/app/api/yordam/route.ts', 'src/app/api/yordam/[id]/route.ts'].map(oqi);
      const rollar = (m: string): string[] | null => {
        const q = m.match(/const ROLLAR = \[([^\]]*)\] as const/);
        if (!q || !/talabQil\(\[\.\.\.ROLLAR\]\)/.test(m)) return null;
        return q[1].split(',').map((x) => x.trim().replace(/['"]/g, '')).filter(Boolean).sort();
      };
      const kutilgan = JSON.stringify(['ADMIN', 'BANDLIK', 'BANDLIK_RAHBAR']);
      return (
        fayllar.every((m) => JSON.stringify(rollar(m)) === kutilgan) &&
        fayllar.every((m) => !m.includes("'YETTILIK'") && !m.includes("'HOKIM'") && m.includes('YORDAM_HTTP') && m.includes('YordamXatosi')) &&
        Object.values(YORDAM_HTTP).every((n) => n >= 400)
      );
    },
  },
  {
    nomi: 'Kod: katalog mantig‘i fuqaro/oila ma‘lumotini YOZMAYDI va fuqaroning dasturga huquqini HISOBLAMAYDI; "kafolat emas" ogohlantirishi bor',
    tekshir: async () => {
      const k = oqi('src/lib/yordam-dasturlari.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const n = oqi('src/lib/yordam-nomlari.ts');
      const yozadi = /\b(unemployedPerson|household|ishgaJoylashish|murojaat|kurs)\s*\.\s*(create|update|updateMany|delete|deleteMany|upsert)\b/.test(k);
      /* Huquq hisoblash: fuqaro maydonlari (daromad, oila, yosh...) o'qilmaydi */
      const huquq = /(unemployedPerson|household)\s*\.\s*(find|count|aggregate|groupBy)/.test(k);
      return !yozadi && !huquq && /кафолат эмас/.test(n);
    },
  },
  {
    nomi: 'Sahifalar: menyu (/yordam, hokim ham ko‘radi), sahifa huquqi, fuqaro sahifasida blok (xato yutadigan, bo‘sh katalogda chiqmaydi); vazifalar: bo‘sh katalog "ўлчанмайди" deyiladi',
    tekshir: async () => {
      const m = oqi('src/components/shell/navigatsiya.ts');
      const sahifa = oqi('src/app/(ilova)/yordam/page.tsx');
      const f = oqi('src/app/(ilova)/ishsizlar/[id]/page.tsx');
      const bl = oqi('src/components/yordam/yordam-blogi.tsx');
      const v = oqi('src/lib/vazifalar.ts');
      const yordamMenyu = m.slice(m.indexOf("yol: '/yordam'"), m.indexOf("yol: '/yordam'") + 300);
      return (
        /rollar:\s*\['YETTILIK',\s*'BANDLIK',\s*'BANDLIK_RAHBAR',\s*'HOKIM',\s*'ADMIN'\]/.test(yordamMenyu) &&
        sahifa.includes("yolgaRuxsat(sessiya.rol, '/yordam')") && sahifa.includes('Каталог бўш') &&
        f.includes('<YordamBlogi') && bl.includes('catch (e)') && bl.includes('royxat.length === 0') &&
        /jami === 0[\s\S]{0,400}yetishmayotgan/.test(v)
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
