/**
 * ============================================================
 *  REYESTR YUKLASH JARAYONI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/reyestr-yuklash-sinov.ts
 *
 *  GPT §4–§5: "avval ko'rish, keyin tasdiqlash" serverda import ID va
 *  fayl izi bilan bog'lansin; oldindan ko'rilgan fayl o'rniga boshqa fayl
 *  yozilib ketmasin; import holati, sanog'i va xatolari saqlansin;
 *  qisman bajarilgan import xavfsiz davom etsin; satr/ustun cheklari;
 *  kelajakdagi sana va 31.02 kabi sana rad etilsin.
 *
 *  Baza - FAQAT mahalliy (production emas). Sinov ma'lumotlari sun'iy va
 *  oxirida o'chiriladi.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import {
  FaylChegarasiXatosi,
  MAKS_SATR,
  MAKS_USTUN,
  MAKS_XOM_SATR,
  reyestrniOqi,
  xlsxVaraq,
} from '../src/lib/reyestr-fayl';
import { BOLAK_SATR, reyestrniYukla, type ReyestrSatri } from '../src/lib/reyestr-import';
import {
  ENG_ESKI_SANA,
  KORISH_MUDDATI_MS,
  YOZISH_TOXTAB_QOLDI_MS,
  faylIziHisobla,
  faylNominiTozala,
  korishniSaqla,
  oldingiYozilgan,
  reyestrSanasiniTekshir,
  yozishJarayoni,
  yozishXatosi,
  yozishniBoshla,
  yozishniTugat,
} from '../src/lib/reyestr-yuklash';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> | boolean };

/** Izohsiz kod - izohdagi so'z tekshiruvni aldamasin */
const kodiOl = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const YOL = kodiOl(readFileSync('src/app/api/reyestr/route.ts', 'utf8'));
const KOMPONENT = kodiOl(readFileSync('src/components/dalil/reyestr-yuklash.tsx', 'utf8'));

/* ── Sinov ma'lumoti ── */
let mahallaId = '';
const xodimlar: string[] = [];
const fuqarolar: string[] = [];
const importlar: string[] = [];

const noyob = (asos: string) => `${asos} Sinov${Date.now() % 100000}${Math.floor(Math.random() * 9999)}`;
const SANA = new Date(Date.UTC(2026, 8, 1));
const SINOV_SANASI = new Date(Date.UTC(1990, 4, 12));

async function xodimYarat(nom: string) {
  const x = await prisma.user.create({
    data: { username: `sinov_ri_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, fullName: nom, passwordHash: 'x', rol: 'BANDLIK_RAHBAR' },
    select: { id: true },
  });
  xodimlar.push(x.id);
  return x.id;
}

async function korish(userId: string, izi: string, sana = SANA, ustiga: { satrSoni?: number; manba?: string } = {}) {
  const k = await korishniSaqla({
    faylIzi: izi,
    faylNomi: 'sinov.xlsx',
    bayt: 1234,
    satrSoni: ustiga.satrSoni ?? 3,
    sana,
    manbaTashkilot: ustiga.manba ?? null,
    userId,
  });
  importlar.push(k.id);
  return k;
}

const noyobIz = () => faylIziHisobla(new TextEncoder().encode(`sinov-${Date.now()}-${Math.random()}`));

/** Haqiqiy .xlsx fayl baytlari */
function xlsxBayt(qatorlar: unknown[][], diapazon?: string): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(qatorlar);
  if (diapazon) ws['!ref'] = diapazon;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Varaq1');
  const chiqish = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return chiqish;
}

const SARLAVHA = ['Ф.И.Ш.', 'Иш жойи', 'Туғилган сана'];

const SINOVLAR: Sinov[] = [
  /* ── 1. FAYL IZI ── */
  {
    nomi: 'SHA-256: ma\'lum qiymat ("abc"), 64 hex belgi; bir bayt farq - boshqa iz; ArrayBuffer va Uint8Array bir xil natija',
    tekshir: () => {
      const a = new TextEncoder().encode('abc');
      const buf = a.buffer.slice(a.byteOffset, a.byteOffset + a.byteLength) as ArrayBuffer;
      return (
        faylIziHisobla(a) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' &&
        faylIziHisobla(buf) === faylIziHisobla(a) &&
        /^[0-9a-f]{64}$/.test(faylIziHisobla(a)) &&
        faylIziHisobla(new TextEncoder().encode('abd')) !== faylIziHisobla(a)
      );
    },
  },
  {
    nomi: 'Fayl nomi tozalanadi: yo\'l qirqiladi, boshqaruv belgilari olinadi, 120 belgigacha; bo\'sh nom - null',
    tekshir: () =>
      faylNominiTozala('C:\\Users\\admin\\Desktop\\reyestr.xlsx') === 'reyestr.xlsx' &&
      faylNominiTozala('../../etc/passwd') === 'passwd' &&
      faylNominiTozala('a\u0000b\nc.xlsx') === 'abc.xlsx' &&
      faylNominiTozala('x'.repeat(300))!.length === 120 &&
      faylNominiTozala('') === null &&
      faylNominiTozala(null) === null &&
      faylNominiTozala('   ') === null,
  },

  /* ── 2. SANA ── */
  {
    nomi: 'Sana: 31.02 martga SURILMAYDI - rad; kabisa yili 29.02 qabul, kabisa emas - rad; format qat\'iy YYYY-MM-DD',
    tekshir: () => {
      const hozir = new Date('2026-10-02T10:00:00Z');
      const rad = (x: string) => !reyestrSanasiniTekshir(x, hozir).ok;
      const ok = (x: string) => reyestrSanasiniTekshir(x, hozir).ok;
      return (
        rad('2024-02-31') &&
        rad('2025-02-29') &&
        ok('2024-02-29') &&
        rad('2026-13-01') &&
        rad('2026-00-10') &&
        rad('2026-04-31') &&
        rad('02.10.2026') &&
        rad('2026-1-5') &&
        rad('2026-10-02T00:00:00Z') &&
        rad('abc') &&
        ok('2026-09-30')
      );
    },
  },
  {
    nomi: 'Sana: kelajak rad, juda eski (2020 dan oldin) rad; chegarada bugun va 2020-01-01 qabul; Toshkent kuni (UTC+5) bo\'yicha',
    tekshir: () => {
      /* 2026-10-02 20:30 UTC = Toshkentda 2026-10-03 01:30 */
      const hozir = new Date('2026-10-02T20:30:00Z');
      const bugun = reyestrSanasiniTekshir('2026-10-03', hozir);
      const ertaga = reyestrSanasiniTekshir('2026-10-04', hozir);
      const kecha = reyestrSanasiniTekshir('2026-10-02', hozir);
      const boshqa = reyestrSanasiniTekshir('', hozir);
      return (
        bugun.ok &&
        !ertaga.ok &&
        kecha.ok &&
        boshqa.ok &&
        boshqa.sana.toISOString() === '2026-10-03T00:00:00.000Z' &&
        ENG_ESKI_SANA === '2020-01-01' &&
        reyestrSanasiniTekshir('2020-01-01', hozir).ok &&
        !reyestrSanasiniTekshir('2019-12-31', hozir).ok &&
        !reyestrSanasiniTekshir('2999-01-01', hozir).ok
      );
    },
  },
  {
    nomi: 'Sana UTC yarim kechasi sifatida saqlanadi (vaqt mintaqasi uni surmaydi) va bo\'sh/null/ortiqcha bo\'shliq bilan ham xato bermaydi',
    tekshir: () => {
      const hozir = new Date('2026-10-02T10:00:00Z');
      const a = reyestrSanasiniTekshir(' 2026-09-01 ', hozir);
      const b = reyestrSanasiniTekshir(null, hozir);
      const c = reyestrSanasiniTekshir(undefined, hozir);
      return (
        a.ok &&
        a.sana.toISOString() === '2026-09-01T00:00:00.000Z' &&
        b.ok &&
        c.ok &&
        b.sana.toISOString() === '2026-10-02T00:00:00.000Z'
      );
    },
  },

  /* ── 3. RESURS CHEGARALARI ── */
  {
    nomi: 'Chegara qiymatlari: 20 000 xom satr, 100 ustun, 10 000 ma\'lumot satri (sinov konstantaga tayanib qolmasin)',
    tekshir: () => MAKS_XOM_SATR === 20_000 && MAKS_USTUN === 100 && MAKS_SATR === 10_000,
  },
  {
    nomi: 'Satr chegarasi: xom satr 20 001 - rad; 10 001 ma\'lumot satri - rad; AYNAN 10 000 - qabul',
    tekshir: () => {
      const satr = (i: number) => [`Fuqaro Nomi${i} Ismli`, 'Корхона', '1990-05-12'];
      const olti = (n: number, qayd = 0) => () => [SARLAVHA, ...Array.from({ length: n }, (_, i) => satr(i + qayd))];

      const juda = reyestrniOqi(new ArrayBuffer(1), () => [SARLAVHA, ...Array.from({ length: MAKS_XOM_SATR }, () => [''])]);
      const kop = reyestrniOqi(new ArrayBuffer(1), olti(MAKS_SATR + 1));
      const chegara = reyestrniOqi(new ArrayBuffer(1), olti(MAKS_SATR));
      return !juda.ok && !kop.ok && chegara.ok && chegara.satrlar.length === MAKS_SATR;
    },
  },
  {
    nomi: 'Ustun chegarasi: 101 ustunli satr - rad (aniq xabar bilan); 100 ustun - qabul',
    tekshir: () => {
      const keng = (n: number) => () => [
        [...SARLAVHA, ...Array.from({ length: n - 3 }, (_, i) => `x${i}`)],
        ['Fuqaro Nomi Ismli', 'Корхона', '1990-05-12', ...Array.from({ length: n - 3 }, () => '')],
      ];
      const a = reyestrniOqi(new ArrayBuffer(1), keng(MAKS_USTUN + 1));
      const b = reyestrniOqi(new ArrayBuffer(1), keng(MAKS_USTUN));
      return !a.ok && /устун/.test(a.sabab) && b.ok;
    },
  },
  {
    nomi: 'HAQIQIY xlsx: juda keng diapazon (ustunlar) o\'qishdan OLDIN rad etiladi - xotirada ochilmaydi',
    tekshir: () => {
      const bayt = xlsxBayt([SARLAVHA, ['Fuqaro Nomi Ismli', 'Корхона', '1990-05-12']], 'A1:ZZ3');
      const t0 = Date.now();
      const n = reyestrniOqi(bayt);
      /* O'qiydigan o'zi, `sheet_to_json` dan OLDIN to'xtaydi (keyingi tekshiruv emas) */
      let oldin = false;
      try {
        xlsxVaraq(bayt);
      } catch (e) {
        oldin = e instanceof FaylChegarasiXatosi;
      }
      return !n.ok && /устун/.test(n.sabab) && oldin && Date.now() - t0 < 5000;
    },
  },
  {
    nomi: 'HAQIQIY xlsx: 20 000 dan ortiq satrli fayl rad etiladi (o\'qish `sheetRows` bilan shu yerda to\'xtaydi); oddiy fayl o\'qiladi',
    tekshir: () => {
      const katta = xlsxBayt([SARLAVHA, ...Array.from({ length: MAKS_XOM_SATR + 50 }, (_, i) => [`Fuqaro Nomi${i} Ismli`, 'K', '1990-05-12'])]);
      const kichik = xlsxBayt([SARLAVHA, ['Fuqaro Birinchi Ismli', 'Корхона', '1990-05-12'], ['Fuqaro Ikkinchi Ismli', 'Корхона', '1991-01-02']]);
      const a = reyestrniOqi(katta);
      const b = reyestrniOqi(kichik);
      /* O'qish `sheetRows` bilan shu chegarada TO'XTAYDI: ortiqcha satrlar xotiraga ochilmaydi */
      const xom = xlsxVaraq(katta);
      return !a.ok && /сатр/.test(a.sabab) && b.ok && b.satrlar.length === 2 && !!xom && xom.length <= MAKS_XOM_SATR + 1;
    },
  },

  /* ── 4. KO'RISH YOZUVI ── */
  {
    nomi: 'Ko\'rish: server yozuv yaratadi (fayl izi, sana, bayt, satr, yuklovchi, holat KORILDI); hech qanday dalil yozilmaydi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov ko‘rish');
      const iz = noyobIz();
      const dalilOldin = await prisma.joylashuvDalili.count();
      const k = await korish(u, iz, SANA, { satrSoni: 7, manba: 'Sinov idorasi' });
      return (
        k.holati === 'KORILDI' &&
        k.faylIzi === iz &&
        k.bayt === 1234 &&
        k.satrSoni === 7 &&
        k.reyestrSanasi.getTime() === SANA.getTime() &&
        k.userId === u &&
        k.manbaTashkilot === 'Sinov idorasi' &&
        k.yozilgan === 0 &&
        (await prisma.joylashuvDalili.count()) === dalilOldin
      );
    },
  },
  {
    nomi: 'Ko\'rishni takror bosish yangi yozuv ko\'paytirmaydi (bir xil xodim, fayl va sana); boshqa fayl yoki sana - alohida yozuv; manba yangilanadi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov takror ko‘rish');
      const iz = noyobIz();
      const a = await korish(u, iz);
      const b = await korish(u, iz, SANA, { manba: 'Yangi manba' });
      const c = await korish(u, noyobIz());
      const d = await korish(u, iz, new Date(Date.UTC(2026, 8, 2)));
      const soni = await prisma.reyestrImport.count({ where: { userId: u, faylIzi: iz } });
      return a.id === b.id && b.manbaTashkilot === 'Yangi manba' && c.id !== a.id && d.id !== a.id && soni === 2;
    },
  },

  /* ── 5. YOZISHNI BOSHLASH: BOG'LASH ── */
  {
    nomi: 'BOSHQA FAYL yozilmaydi: yozuvdagi izdan farq qilsa - 409 "fayl-boshqa", holat KORILDI qoladi, hech narsa o\'zgarmaydi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov boshqa fayl');
      const k = await korish(u, noyobIz());
      const r = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: noyobIz(), sana: SANA });
      const h = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      return !r.ok && r.kod === 'fayl-boshqa' && r.status === 409 && h.holati === 'KORILDI' && h.yozishBoshlandi === null;
    },
  },
  {
    nomi: 'Boshqa sana bilan yozilmaydi (409 "sana-boshqa"); noma\'lum yozuv - 404; boshqa xodim - 403 (begona)',
    tekshir: async () => {
      const u = await xodimYarat('Sinov sana');
      const v = await xodimYarat('Sinov begona');
      const iz = noyobIz();
      const k = await korish(u, iz);
      const a = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: new Date(Date.UTC(2026, 8, 2)) });
      const b = await yozishniBoshla({ yuklashId: 'yoq-id', userId: u, faylIzi: iz, sana: SANA });
      const c = await yozishniBoshla({ yuklashId: k.id, userId: v, faylIzi: iz, sana: SANA });
      const h = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      return (
        !a.ok && a.kod === 'sana-boshqa' && a.status === 409 &&
        !b.ok && b.kod === 'topilmadi' && b.status === 404 &&
        !c.ok && c.kod === 'begona' && c.status === 403 &&
        h.holati === 'KORILDI'
      );
    },
  },
  {
    nomi: 'Ko\'rish ESKIRADI: 24 soatdan keyin yozib bo\'lmaydi (409 "eskirgan"), 24 soat ichida mumkin',
    tekshir: async () => {
      const u = await xodimYarat('Sinov eskirish');
      const iz = noyobIz();
      const k = await korish(u, iz);
      const hozir = new Date();
      const eski = await yozishniBoshla({
        yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA,
        hozir: new Date(k.createdAt.getTime() + KORISH_MUDDATI_MS + 1000),
      });
      const h1 = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      const yaxshi = await yozishniBoshla({
        yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA,
        hozir: new Date(Math.max(hozir.getTime(), k.createdAt.getTime()) + 1000),
      });
      return !eski.ok && eski.kod === 'eskirgan' && h1.holati === 'KORILDI' && yaxshi.ok && !yaxshi.allaqachon;
    },
  },
  {
    nomi: 'PARALLEL: bir yozuvga 8 ta bir vaqtdagi "yozish" - FAQAT BITTASI boshlanadi, qolganlari "band" (409); holat YOZILMOQDA',
    tekshir: async () => {
      const u = await xodimYarat('Sinov parallel');
      const iz = noyobIz();
      const k = await korish(u, iz);
      const natijalar = await Promise.all(
        Array.from({ length: 8 }, () => yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA }))
      );
      const boshlandi = natijalar.filter((r) => r.ok && !r.allaqachon).length;
      const band = natijalar.filter((r) => !r.ok && r.kod === 'band' && r.status === 409).length;
      const h = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      return boshlandi === 1 && band === 7 && h.holati === 'YOZILMOQDA' && h.yozishBoshlandi !== null;
    },
  },
  {
    nomi: 'TAKROR YOZISH: tugagan yuklashni qayta yozish takror yozmaydi - saqlangan natija ("allaqachon") qaytadi; holat va sanoq o\'zgarmaydi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov allaqachon');
      const iz = noyobIz();
      const k = await korish(u, iz);
      const b = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA });
      if (!b.ok) return false;
      const t = await yozishniTugat(k.id, { jami: 5, yozilgan: 4, takror: 1 });
      const qayta = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA });
      const yana = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA });
      const h = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      const oldingi = await oldingiYozilgan(iz, SANA);
      return (
        t.holati === 'YOZILDI' &&
        qayta.ok && qayta.allaqachon && qayta.yuklash.yozilgan === 4 &&
        yana.ok && yana.allaqachon &&
        h.holati === 'YOZILDI' && h.jami === 5 && h.yozilgan === 4 && h.takror === 1 && h.yozildiSana !== null &&
        oldingi?.id === k.id
      );
    },
  },

  /* ── 6. UZILGAN IMPORT ── */
  {
    nomi: 'XATO: yozish uzilsa holat XATO, xato matni SIRSIZ (bot tokeni, baza paroli) va qisqa; xuddi shu fayl bilan qayta boshlash mumkin (davom = true)',
    tekshir: async () => {
      const u = await xodimYarat('Sinov xato');
      const iz = noyobIz();
      const k = await korish(u, iz);
      const b = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA });
      if (!b.ok) return false;
      await yozishXatosi(
        k.id,
        new Error('ulanmadi: postgresql://admin:SirliParol123@db.example.com:5432/x bot 123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1 ' + 'y'.repeat(600))
      );
      const h = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      const davom = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA });
      const h2 = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      return (
        h.holati === 'XATO' &&
        !!h.xatoMatni &&
        h.xatoMatni.length <= 300 &&
        !h.xatoMatni.includes('SirliParol123') &&
        !h.xatoMatni.includes('AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1') &&
        davom.ok && !davom.allaqachon && davom.davom === true &&
        h2.holati === 'YOZILMOQDA' && h2.xatoMatni === null
      );
    },
  },
  {
    nomi: 'TO\'XTAB QOLGAN yozish: "yozilmoqda" 10 daqiqadan ortiq tursa davom ettirish mumkin; yangi (10 daqiqa ichida) bo\'lsa - "band"',
    tekshir: async () => {
      const u = await xodimYarat('Sinov toxtab');
      const iz = noyobIz();
      const k = await korish(u, iz);
      const boshlash = new Date();
      const b = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA, hozir: boshlash });
      if (!b.ok) return false;
      const yangi = await yozishniBoshla({
        yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA,
        hozir: new Date(boshlash.getTime() + YOZISH_TOXTAB_QOLDI_MS - 60_000),
      });
      const eski = await yozishniBoshla({
        yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA,
        hozir: new Date(boshlash.getTime() + YOZISH_TOXTAB_QOLDI_MS + 60_000),
      });
      return !yangi.ok && yangi.kod === 'band' && eski.ok && !eski.allaqachon && eski.davom === true;
    },
  },
  {
    nomi: 'Jarayon sanog\'i faqat YOZILMOQDA holatida yangilanadi; tugagan yozuv keyingi "jarayon" chaqiruvidan o\'zgarmaydi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov jarayon');
      const iz = noyobIz();
      const k = await korish(u, iz);
      await yozishJarayoni(k.id, 50, 2);
      const korilgan = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      const b = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA });
      if (!b.ok) return false;
      await yozishJarayoni(k.id, 120, 3);
      const yozilmoqda = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      await yozishniTugat(k.id, { jami: 200, yozilgan: 190, takror: 10 });
      await yozishJarayoni(k.id, 1, 1);
      const tugadi = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });
      return (
        korilgan.yozilgan === 0 &&
        yozilmoqda.yozilgan === 120 && yozilmoqda.takror === 3 &&
        tugadi.yozilgan === 190 && tugadi.takror === 10 && tugadi.holati === 'YOZILDI'
      );
    },
  },

  /* ── 7. HAQIQIY YOZISH: DALILLAR IMPORT ID VA FAYL IZI BILAN ── */
  {
    nomi: 'Dalillar shu yuklash yozuvining id si va fayl izi bilan saqlanadi; takror (davom ettirish) yangi dalil yaratmaydi; sanoq bo\'laklarda yangilanadi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov haqiqiy');
      const m = await prisma.mahalla.findFirst({ select: { id: true } });
      mahallaId = m!.id;

      /* BOLAK_SATR + 5 ta fuqaro: kamida bitta bo'lak chegarasi o'tadi */
      const soni = BOLAK_SATR + 5;
      const asos = noyob('Import Ommaviy');
      const satrlar: ReyestrSatri[] = [];
      const fishlar: string[] = [];
      for (let i = 0; i < soni; i++) {
        /* Noyob, bir xil prefiksli ismlar: harf bilan (raqam ismda bo'lmasin) */
        const harf = (n: number) => String.fromCharCode(97 + (n % 26)) + String.fromCharCode(97 + (Math.floor(n / 26) % 26));
        const fish = `${asos.replace(/\d+/g, '')} ${harf(i)}${harf(i * 7 + 3)}ov`;
        fishlar.push(fish);
        satrlar.push({ fish, ishJoyi: 'Корхона', tugilganSana: SINOV_SANASI });
      }
      const noyobFishlar = new Set(fishlar);
      if (noyobFishlar.size !== soni) return false;

      const yaratilgan = await prisma.unemployedPerson.createManyAndReturn({
        data: fishlar.map((fish) => ({
          fish, jinsi: 'ERKAK' as const, mahallaId, holati: 'JOYLASHTIRILDI' as const, ishJoyi: 'Корхона', tugilganSana: SINOV_SANASI,
        })),
        select: { id: true },
      });
      fuqarolar.push(...yaratilgan.map((f) => f.id));

      const iz = noyobIz();
      const k = await korish(u, iz, SANA, { satrSoni: soni, manba: 'Sinov idorasi' });
      const b = await yozishniBoshla({ yuklashId: k.id, userId: u, faylIzi: iz, sana: SANA });
      if (!b.ok) return false;

      const bolaklar: number[] = [];
      const natija = await reyestrniYukla(satrlar, {
        kiritganId: u,
        reyestrSanasi: SANA,
        faylIzi: iz,
        manbaTashkilot: 'Sinov idorasi',
        yuklashIzi: k.id,
        bolak: async (yozilgan, takror) => {
          bolaklar.push(yozilgan);
          await yozishJarayoni(k.id, yozilgan, takror);
        },
      });
      const dalillar = await prisma.joylashuvDalili.findMany({
        where: { ishsizId: { in: yaratilgan.map((f) => f.id) } },
        select: { importId: true, faylIzi: true, manbaTashkilot: true, manbaTuri: true },
      });
      const jarayon = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: k.id } });

      /* ── DAVOM ETTIRISH: xuddi shu fayl qayta yozilsa takror dalil yaratilmaydi ── */
      const qayta = await reyestrniYukla(satrlar, { kiritganId: u, reyestrSanasi: SANA, faylIzi: iz, yuklashIzi: k.id });
      const dalilSoni2 = await prisma.joylashuvDalili.count({ where: { ishsizId: { in: yaratilgan.map((f) => f.id) } } });

      return (
        natija.mos.length === soni &&
        natija.takror === 0 &&
        dalillar.length === soni &&
        dalillar.every((d) => d.importId === k.id && d.faylIzi === iz && d.manbaTashkilot === 'Sinov idorasi' && d.manbaTuri === 'QOLDA_REYESTR') &&
        bolaklar.length === 1 &&
        jarayon.yozilgan > 0 && jarayon.yozilgan < soni &&
        qayta.takror === soni &&
        dalilSoni2 === soni
      );
    },
  },

  /* ── 8. YO'L VA INTERFEYS ── */
  {
    nomi: 'Yo\'l: yozish `yuklashId` siz ishlamaydi (400); fayl izi bir marta o\'qilgan baytlardan; ko\'rish ham, yozish ham server yozuviga bog\'lanadi',
    tekshir: () =>
      YOL.includes("forma.get('yuklashId')") &&
      /if \(!yuklashId\)[\s\S]{0,400}status: 400/.test(YOL) &&
      YOL.includes('faylIziHisobla(bayt)') &&
      YOL.includes('reyestrniOqi(bayt)') &&
      (YOL.match(/arrayBuffer\(\)/g) ?? []).length === 1 &&
      YOL.includes('yozishniBoshla(') &&
      YOL.includes('korishniSaqla(') &&
      YOL.includes('yozishniTugat(') &&
      YOL.includes('yozishXatosi(') &&
      YOL.includes('yuklashIzi: yuklashId') &&
      YOL.includes('faylIzi,') &&
      /status: b\.status/.test(YOL),
  },
  {
    nomi: 'Yo\'l: sana qat\'iy tekshiriladi (`new Date(xomSana)` yo\'q), ko\'rish ham, yozish ham admin/rahbar bilan cheklangan; ko\'rish yo\'li hech narsa yozmaydi (dalil)',
    tekshir: () => {
      const bosh = YOL.indexOf('if (!yoz) {');
      const oxir = YOL.indexOf('let natija;');
      const korishBloki = bosh >= 0 && oxir > bosh ? YOL.slice(bosh, oxir) : '';
      return (
        !YOL.includes('new Date(xomSana)') &&
        YOL.includes('reyestrSanasiniTekshir(') &&
        YOL.includes("talabQil(['ADMIN', 'BANDLIK_RAHBAR'])") &&
        korishBloki.includes('reyestrniSolishtir(oqildi.satrlar)') &&
        korishBloki.includes('return NextResponse.json') &&
        !korishBloki.includes('reyestrniYukla(') &&
        !korishBloki.includes('dalilQoshish(')
      );
    },
  },
  {
    nomi: 'Interfeys: "Yozish" tugmasi serverdan kelgan `yuklashId` bilan ishlaydi; fayl yoki sana o\'zgarsa ko\'rish bekor; yozish uzilsa ko\'rish natijasi qoladi; fayl izi ko\'rinadi (isbot emas, deb tushuntirilgan)',
    tekshir: () =>
      KOMPONENT.includes("forma.append('yuklashId', javob.yuklashId)") &&
      KOMPONENT.includes('javob.yuklashId &&') &&
      /if \(!yoz\) setJavob\(null\)/.test(KOMPONENT) &&
      /setSana\(e\.target\.value\);[\s\S]{0,200}setJavob\(null\)/.test(KOMPONENT) &&
      KOMPONENT.includes('javob.faylIzi.slice(0, 12)') &&
      KOMPONENT.includes('ҳақиқий эканини эмас') &&
      KOMPONENT.includes('max={BUGUN()}'),
  },
];

async function tozala() {
  if (fuqarolar.length > 0) {
    await prisma.joylashuvDalili.deleteMany({ where: { ishsizId: { in: fuqarolar } } });
    await prisma.unemployedPerson.deleteMany({ where: { id: { in: fuqarolar } } });
  }
  if (importlar.length > 0) await prisma.reyestrImport.deleteMany({ where: { id: { in: importlar } } });
  if (xodimlar.length > 0) {
    await prisma.joylashuvDalili.updateMany({ where: { kiritganId: { in: xodimlar } }, data: { kiritganId: null } });
    await prisma.reyestrImport.deleteMany({ where: { userId: { in: xodimlar } } });
    await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
  }
}

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }

  let xato = 0;
  try {
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
  } finally {
    await tozala();
    await prisma.$disconnect();
  }
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  process.exit(xato ? 1 : 0);
}

void main();
