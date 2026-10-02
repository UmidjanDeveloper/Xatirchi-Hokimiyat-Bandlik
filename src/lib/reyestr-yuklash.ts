import { createHash } from 'node:crypto';
import type { ReyestrImport } from '@prisma/client';
import { prisma } from './prisma';
import { maxfiyniTozala } from './maxfiy';
import { sanaOqi } from './reyestr-fayl';
import { toshkentKuni } from './utils';

/**
 * ============================================================
 *  REYESTR YUKLASH JARAYONI — "AVVAL KO'RISH, KEYIN YOZISH" SERVERDA
 *
 *  ── Nega ──
 *
 *  Oldin "ko'rish" va "yozish" ikkita BOG'LANMAGAN so'rov edi: yozish
 *  qadamiga brauzer faylni QAYTA yuborardi va server uni ko'rilgan fayl
 *  bilan solishtirmasdi. Natija:
 *
 *   · administrator bir faylni ko'rib, boshqa faylni yozib yuborishi
 *     mumkin edi (adashib yoki papkadagi eskisini tanlab);
 *   · fayl izi va import identifikatori sxemada bor edi, lekin
 *     yo'l ularni HECH QACHON to'ldirmasdi;
 *   · yozish yarim yo'lda uzilsa, nima yozilgani va nima yo'qligi
 *     hech qayerda ko'rinmasdi.
 *
 *  ── Endi ──
 *
 *   1. "Ko'rish" faylning SHA-256 izini hisoblab, `ReyestrImport` yozuvini
 *      yaratadi (hech qanday dalil yozilmaydi) va `yuklashId` qaytaradi;
 *   2. "Yozish" faqat shu `yuklashId` va FAYLNING O'ZI bilan ishlaydi: fayl
 *      izi va sana yozuvdagi bilan bir xil bo'lishi shart, yuklovchi o'sha
 *      xodim bo'lishi shart, ko'rish eskirmagan bo'lishi shart;
 *   3. Yozishni boshlash ATOMAR (`updateMany` + holat sharti): ikki
 *      parallel so'rovdan faqat biri "yozilmoqda"ga o'tadi, ikkinchisi
 *      to'xtatiladi; allaqachon yozilgan bo'lsa - takror yozilmaydi,
 *      saqlangan natija qaytadi;
 *   4. Yozish xato bilan to'xtasa holat XATO bo'ladi va xuddi shu fayl bilan
 *      qayta bosish davom ettiradi (dalillar bazadagi yagonalik
 *      chegarasi bilan takror yaratilmaydi);
 *   5. har bir dalil shu yozuvning `id` si va fayl izi bilan saqlanadi:
 *      "bu dalil qaysi fayldan?" degan savolga javob bor.
 *
 *  Fayl izi faylning O'ZGARMAGANINI ko'rsatadi, HAQIQIY ekanini emas.
 * ============================================================
 */

/** Ko'rishdan keyin yozish uchun qancha vaqt beriladi */
export const KORISH_MUDDATI_MS = 24 * 60 * 60 * 1000;
/** "Yozilmoqda" holatida shundan uzoq tursa - to'xtab qolgan deb olinadi va davom ettirish mumkin */
export const YOZISH_TOXTAB_QOLDI_MS = 10 * 60 * 1000;
/** Kutilgan eng eski ko'chirma sanasi (undan eskisi xato yozilgan deb olinadi) */
export const ENG_ESKI_SANA = '2020-01-01';

/** Faylning SHA-256 izi (hex). Faylning o'zgarmaganini ko'rsatadi, haqiqiyligini emas. */
export function faylIziHisobla(bayt: ArrayBuffer | Uint8Array): string {
  return createHash('sha256').update(bayt instanceof Uint8Array ? bayt : new Uint8Array(bayt)).digest('hex');
}

export type SanaNatijasi = { ok: true; sana: Date } | { ok: false; xabar: string };

/**
 * Ko'chirma sanasini QAT'IY tekshiradi.
 *
 * · bo'sh bo'lsa - Toshkent bugungi kuni;
 * · faqat YYYY-MM-DD; 31.02 kabi sana mart oyiga SURILMAYDI, rad etiladi;
 * · kelajakdagi sana va 2020 yildan oldingi sana rad etiladi.
 *
 * Sana UTC yarim kechasi sifatida saqlanadi (dalildagi `reyestrSanasi` ham
 * shunday: bir kun - bitta qiymat, vaqt mintaqasi uni surmaydi).
 */
export function reyestrSanasiniTekshir(xom: string | null | undefined, hozir: Date = new Date()): SanaNatijasi {
  const bugun = toshkentKuni(hozir);
  const matn = (xom ?? '').trim();
  if (!matn) return { ok: true, sana: new Date(`${bugun}T00:00:00.000Z`) };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(matn)) {
    return { ok: false, xabar: 'Кўчирма санаси КК.ОО.ЙЙЙЙ шаклида эмас' };
  }
  const sana = sanaOqi(matn);
  if (!sana) return { ok: false, xabar: 'Кўчирма санаси тақвимда мавжуд эмас (масалан, 31.02)' };

  const kun = sana.toISOString().slice(0, 10);
  if (kun > bugun) return { ok: false, xabar: 'Кўчирма санаси келажакда бўлиши мумкин эмас' };
  if (kun < ENG_ESKI_SANA) return { ok: false, xabar: 'Кўчирма санаси жуда эски — хато ёзилган бўлса керак' };
  return { ok: true, sana };
}

/** Yuklovchi bergan fayl nomini qisqartiradi (yo'l va boshqaruv belgilarisiz) */
export function faylNominiTozala(nom: string | null | undefined): string | null {
  const n = String(nom ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[\\/]/)
    .pop()!
    .trim()
    .slice(0, 120);
  return n || null;
}

export interface KorishParametrlari {
  faylIzi: string;
  faylNomi?: string | null;
  bayt: number;
  satrSoni: number;
  sana: Date;
  manbaTashkilot?: string | null;
  userId: string;
  hozir?: Date;
}

/**
 * "Ko'rish" qadamini yozadi. Shu xodim shu fayl va sana bilan yaqinda
 * (24 soat ichida) ko'rgan bo'lsa va hali yozmagan bo'lsa, o'sha yozuv
 * qaytadi: har bosishda yangi yozuv ko'paymaydi.
 */
export async function korishniSaqla(p: KorishParametrlari): Promise<ReyestrImport> {
  const hozir = p.hozir ?? new Date();
  const manba = (p.manbaTashkilot ?? '').trim().slice(0, 120) || null;

  const bor = await prisma.reyestrImport.findFirst({
    where: {
      userId: p.userId,
      faylIzi: p.faylIzi,
      reyestrSanasi: p.sana,
      holati: 'KORILDI',
      createdAt: { gt: new Date(hozir.getTime() - KORISH_MUDDATI_MS) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (bor) {
    /* Manba tashkilot o'zgargan bo'lishi mumkin - yozish qadamigacha yangilanadi */
    if (bor.manbaTashkilot !== manba) {
      return prisma.reyestrImport.update({ where: { id: bor.id }, data: { manbaTashkilot: manba } });
    }
    return bor;
  }

  return prisma.reyestrImport.create({
    data: {
      faylIzi: p.faylIzi,
      faylNomi: faylNominiTozala(p.faylNomi),
      bayt: p.bayt,
      satrSoni: p.satrSoni,
      reyestrSanasi: p.sana,
      manbaTashkilot: manba,
      userId: p.userId,
    },
  });
}

export type BoshlashKodi = 'topilmadi' | 'begona' | 'fayl-boshqa' | 'sana-boshqa' | 'eskirgan' | 'band';

export type BoshlashNatijasi =
  | { ok: true; allaqachon: false; yuklash: ReyestrImport; davom: boolean }
  | { ok: true; allaqachon: true; yuklash: ReyestrImport }
  | { ok: false; kod: BoshlashKodi; status: number; xabar: string };

const BOSHLASH_XABARI: Record<BoshlashKodi, { status: number; xabar: string }> = {
  topilmadi: { status: 404, xabar: 'Кўриш ёзуви топилмади — аввал «Солиштириб кўриш» ни босинг' },
  begona: { status: 403, xabar: 'Бу юклашни бошқа ходим бошлаган — ўзингиз қайта кўринг' },
  'fayl-boshqa': { status: 409, xabar: 'Ёзиладиган файл кўрилган файлдан фарқ қилади — ёзилмади. Файлни қайта кўринг' },
  'sana-boshqa': { status: 409, xabar: 'Кўчирма санаси кўрилгандагидан фарқ қилади — ёзилмади. Қайта кўринг' },
  eskirgan: { status: 409, xabar: 'Кўриш эскирди (24 соатдан ортиқ) — ёзишдан олдин файлни қайта кўринг' },
  band: { status: 409, xabar: 'Бу юклаш ҳозир ёзилмоқда — бироздан кейин натижани кўринг' },
};

const rad = (kod: BoshlashKodi): BoshlashNatijasi => ({ ok: false, kod, ...BOSHLASH_XABARI[kod] });

/**
 * "Yozish" qadamini boshlaydi: HAMMA tekshiruvdan keyin ATOMAR holat
 * o'tishi (KORILDI | XATO | to'xtab qolgan YOZILMOQDA -> YOZILMOQDA).
 *
 *  · allaqachon YOZILDI - takror yozilmaydi, saqlangan yozuv qaytadi
 *    (ikki marta bosish, qayta yuborilgan so'rov);
 *  · boshqa so'rov hozir yozayotgan bo'lsa - `band`.
 */
export async function yozishniBoshla(p: {
  yuklashId: string;
  userId: string;
  faylIzi: string;
  sana: Date;
  hozir?: Date;
}): Promise<BoshlashNatijasi> {
  const hozir = p.hozir ?? new Date();

  const y = await prisma.reyestrImport.findUnique({ where: { id: p.yuklashId } });
  if (!y) return rad('topilmadi');
  if (y.userId !== p.userId) return rad('begona');
  if (y.faylIzi !== p.faylIzi) return rad('fayl-boshqa');
  if (y.reyestrSanasi.getTime() !== p.sana.getTime()) return rad('sana-boshqa');
  if (y.holati === 'YOZILDI') return { ok: true, allaqachon: true, yuklash: y };
  if (y.holati === 'KORILDI' && hozir.getTime() - y.createdAt.getTime() > KORISH_MUDDATI_MS) return rad('eskirgan');

  const toxtadi = new Date(hozir.getTime() - YOZISH_TOXTAB_QOLDI_MS);
  const q = await prisma.reyestrImport.updateMany({
    where: {
      id: y.id,
      userId: p.userId,
      faylIzi: p.faylIzi,
      OR: [
        { holati: { in: ['KORILDI', 'XATO'] } },
        { holati: 'YOZILMOQDA', yozishBoshlandi: { lt: toxtadi } },
      ],
    },
    data: { holati: 'YOZILMOQDA', yozishBoshlandi: hozir, xatoMatni: null },
  });

  if (q.count === 0) {
    /* Boshqa so'rov oldinroq oldi: u tugatgan bo'lsa natija tayyor, yo'q bo'lsa - band */
    const hozirgi = await prisma.reyestrImport.findUnique({ where: { id: y.id } });
    if (hozirgi?.holati === 'YOZILDI') return { ok: true, allaqachon: true, yuklash: hozirgi };
    return rad('band');
  }

  const yangi = await prisma.reyestrImport.findUniqueOrThrow({ where: { id: y.id } });
  return { ok: true, allaqachon: false, yuklash: yangi, davom: y.holati !== 'KORILDI' };
}

/** Yozish jarayonida sanoqni yangilaydi (faqat YOZILMOQDA holatida) */
export async function yozishJarayoni(id: string, yozilgan: number, takror: number): Promise<void> {
  await prisma.reyestrImport.updateMany({
    where: { id, holati: 'YOZILMOQDA' },
    data: { yozilgan, takror },
  });
}

/** Yozish tugadi */
export async function yozishniTugat(
  id: string,
  n: { jami: number; yozilgan: number; takror: number },
  hozir: Date = new Date()
): Promise<ReyestrImport> {
  await prisma.reyestrImport.updateMany({
    where: { id, holati: 'YOZILMOQDA' },
    data: { holati: 'YOZILDI', yozildiSana: hozir, jami: n.jami, yozilgan: n.yozilgan, takror: n.takror, xatoMatni: null },
  });
  return prisma.reyestrImport.findUniqueOrThrow({ where: { id } });
}

/** Yozish xato bilan to'xtadi: holat XATO, matn sirsiz va qisqa. Xuddi shu fayl bilan qayta bosilsa davom etadi. */
export async function yozishXatosi(id: string, xato: unknown): Promise<void> {
  const matn = maxfiyniTozala(xato instanceof Error ? xato.message : String(xato)).slice(0, 300);
  await prisma.reyestrImport.updateMany({
    where: { id, holati: 'YOZILMOQDA' },
    data: { holati: 'XATO', xatoMatni: matn || 'Noma‘lum xato' },
  });
}

/** Shu fayl va sana bilan oldin YOZILGAN import bormi (ko'rish paytida ogohlantirish uchun) */
export async function oldingiYozilgan(faylIzi: string, sana: Date): Promise<ReyestrImport | null> {
  return prisma.reyestrImport.findFirst({
    where: { faylIzi, reyestrSanasi: sana, holati: 'YOZILDI' },
    orderBy: { yozildiSana: 'desc' },
  });
}

/** Sahifa uchun: oxirgi importlar */
export async function oxirgiImportlar(n = 10): Promise<ReyestrImport[]> {
  return prisma.reyestrImport.findMany({ orderBy: { createdAt: 'desc' }, take: n });
}
