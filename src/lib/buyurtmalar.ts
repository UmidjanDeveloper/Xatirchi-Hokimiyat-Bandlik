import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { BuyurtmaHolati } from '@prisma/client';
import { mahallagaRuxsat, type Sessiya } from './auth';
import { prisma } from './prisma';
import { telefonSaqlashUchun, telefonTekshir } from './inson-tekshiruvi';
import { ID, sanaOrali } from './oila-rejasi';
import {
  TASDIQ_ESLATMA_KUNI,
  TASDIQ_KUTISH_KUNI,
  type BuyurtmaTasdigi,
} from './buyurtmalar-nomlari';

/**
 * ============================================================
 *  MAHALLIY BUYURTMALAR (PILOT, XODIM BOSHQARADI)
 *
 *  Fuqaro mahalliy xizmat taklif qiladi (payvandlash, tikuvchilik...),
 *  kimdir xizmat so'raydi, xodim ijrochini topadi, narx kelishiladi,
 *  ish bajariladi.
 *
 *  ── Oltita qoida ──
 *
 *  1. ROZILIKSIZ IJROCHI TAYINLANMAYDI. Taklif qiluvchi fuqaro ro'yxatda
 *     turishga va aloqa ma'lumoti buyurtmachiga berilishiga rozi bo'lishi
 *     shart; rozilik xodim tomonidan usuli va sanasi bilan yoziladi.
 *     Rozilik qaytarib olinsa yoki taklif yopilsa, u tayinlangan faol
 *     buyurtmalar ijrochisiz qoladi (qayta "yangi").
 *
 *  2. PLATFORMA TO'LOVNI YURITMAYDI. Kelishilgan narx faqat yozuv: pul
 *     platforma orqali o'tmaydi va tekshirilmaydi.
 *
 *  3. "BAJARILDI" BIR TOMONNING GAPI. Buyurtma ijrochi VA buyurtmachi har
 *     biri alohida tasdiqlagandagina "ikki tomonlama tasdiqlangan" bo'ladi.
 *     Bir tomon e'tiroz bildirsa - "nizo": u muvaffaqiyat emas. Tasdiqlangan
 *     (true) javob jimgina ortga qaytarilmaydi.
 *
 *  4. NOMA'LUM != YO'Q. Tasdiq so'ralmagan bo'lsa u "e'tiroz" emas, noma'lum.
 *     Narx kelishilmagan bo'lsa u 0 emas, bo'sh.
 *
 *  5. OCHIQ BOZOR YO'Q. Buyurtma va taklifni faqat xodim ko'radi (mahalla
 *     xodimi - faqat o'z mahallasini); fuqaroning shaxsiy kabineti yo'q.
 *
 *  6. MAXRAJ BILAN. Samaradorlik "nechta buyurtma" bilan emas: nechtasi
 *     bajarildi va bajarilganlardan nechtasi ikki tomonlama tasdiqlandi.
 * ============================================================
 */

export class BuyurtmaXatosi extends Error {
  constructor(
    public readonly kod: 'TOPILMADI' | 'RUXSAT' | 'NOTOGRI' | 'HOLAT' | 'ROZILIK' | 'YOPIQ',
    xabar: string
  ) {
    super(xabar);
  }
}

export const BUYURTMA_HTTP: Record<BuyurtmaXatosi['kod'], number> = {
  TOPILMADI: 404,
  RUXSAT: 403,
  NOTOGRI: 400,
  HOLAT: 409,
  ROZILIK: 409,
  YOPIQ: 409,
};

/* Nomlar `buyurtmalar-nomlari.ts` da: brauzer komponentlari ularni olishi kerak, bu fayl esa bazaga ulanadi. */
export * from './buyurtmalar-nomlari';

type Kim = Pick<Sessiya, 'rol' | 'mahallaId' | 'userId'>;

/* ══════════════════════════════════════════════════════════════
 *  TOZA FUNKSIYALAR
 * ══════════════════════════════════════════════════════════════ */

/** Bajarilgan buyurtmaning tasdiq darajasi */
export function buyurtmaTasdigi(b: {
  ijrochiTasdigi: boolean | null;
  buyurtmachiTasdigi: boolean | null;
}): BuyurtmaTasdigi {
  if (b.ijrochiTasdigi === false || b.buyurtmachiTasdigi === false) return 'NIZO';
  if (b.ijrochiTasdigi === true && b.buyurtmachiTasdigi === true) return 'IKKI_TOMONLAMA';
  if (b.ijrochiTasdigi === true || b.buyurtmachiTasdigi === true) return 'BIR_TOMONLAMA';
  return 'TASDIQSIZ';
}

export interface BuyurtmaMetrika {
  holati: BuyurtmaHolati;
  bajarilganSana: Date | null;
  ijrochiTasdigi: boolean | null;
  buyurtmachiTasdigi: boolean | null;
  kelishilganNarx: number | null;
}

export interface BuyurtmaKorsatkichlari {
  /** Bekor qilinmaganlar */
  jami: number;
  bekor: number;
  yangi: number;
  tayinlandi: number;
  kelishildi: number;
  bajarilgan: number;
  /** Bajarilganlar orasida */
  tasdiq: {
    ikkiTomonlama: number;
    nizo: number;
    /** Tasdiq kutilmoqda: bajarilganiga TASDIQ_KUTISH_KUNI dan kam - hali erta */
    kutilmoqda: number;
    /** Bajarilganiga ko'p vaqt o'tgan, ammo ikki tomon tasdiqlamagan (bir tomonlama yoki tasdiqsiz) */
    kechikkan: number;
  };
  /** Ikki tomonlama tasdiqlanganlar bo'yicha kelishilgan narx */
  narx: { yigindi: number; narxiBor: number; narxiYoq: number };
}

export function buyurtmaKorsatkichlarniHisobla(
  qatorlar: BuyurtmaMetrika[],
  hozir = new Date()
): BuyurtmaKorsatkichlari {
  const k: BuyurtmaKorsatkichlari = {
    jami: 0,
    bekor: 0,
    yangi: 0,
    tayinlandi: 0,
    kelishildi: 0,
    bajarilgan: 0,
    tasdiq: { ikkiTomonlama: 0, nizo: 0, kutilmoqda: 0, kechikkan: 0 },
    narx: { yigindi: 0, narxiBor: 0, narxiYoq: 0 },
  };

  for (const q of qatorlar) {
    if (q.holati === 'BEKOR') {
      k.bekor++;
      continue;
    }
    k.jami++;
    if (q.holati === 'YANGI') k.yangi++;
    else if (q.holati === 'TAYINLANDI') k.tayinlandi++;
    else if (q.holati === 'KELISHILDI') k.kelishildi++;
    else {
      k.bajarilgan++;
      const d = buyurtmaTasdigi(q);
      if (d === 'IKKI_TOMONLAMA') {
        k.tasdiq.ikkiTomonlama++;
        if (q.kelishilganNarx !== null) {
          k.narx.narxiBor++;
          k.narx.yigindi += q.kelishilganNarx;
        } else k.narx.narxiYoq++;
      } else if (d === 'NIZO') {
        k.tasdiq.nizo++;
      } else {
        /* Sanasi noma'lum bajarilgan - muddatini bilmaymiz: "hali erta" */
        const o = q.bajarilganSana ? sanaOrali(hozir, q.bajarilganSana) : null;
        if (o === null || o <= TASDIQ_KUTISH_KUNI) k.tasdiq.kutilmoqda++;
        else k.tasdiq.kechikkan++;
      }
    }
  }
  return k;
}

/* ── Sxemalar ── */

const MATN = (min: number, max: number) => z.string().trim().min(min).max(max);
const SANA = z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), 'Сана нотўғри');
const USUL = z.enum(['OGZAKI', 'TELEFON', 'YOZMA']);
const NARX = z.coerce.number().int().min(1).max(1_000_000_000);

export const XizmatYaratishSxemasi = z.object({
  ishsizId: ID,
  nomi: MATN(3, 80),
  tavsif: MATN(3, 300).nullish(),
  taxminiyNarx: NARX.nullish(),
});

export const XizmatAmaliSxemasi = z.discriminatedUnion('amal', [
  z.object({ amal: z.literal('rozilik'), usul: USUL, sana: SANA.optional() }),
  z.object({ amal: z.literal('rozilik-qaytar') }),
  z.object({ amal: z.literal('yopish') }),
  z.object({ amal: z.literal('qaytarish') }),
  z.object({
    amal: z.literal('tahrir'),
    nomi: MATN(3, 80).optional(),
    tavsif: MATN(3, 300).nullish(),
    taxminiyNarx: NARX.nullish(),
  }),
]);

export const BuyurtmaYaratishSxemasi = z.object({
  mahallaId: ID,
  buyurtmachiNomi: MATN(2, 120),
  buyurtmachiTelefon: z.string().trim().max(30).nullish(),
  tavsif: MATN(5, 500),
});

export const BuyurtmaAmaliSxemasi = z.discriminatedUnion('amal', [
  z.object({ amal: z.literal('tayinla'), taklifId: ID }),
  z.object({
    amal: z.literal('kelish'),
    /* 0 = bepul; bo'sh qoldirib bo'lmaydi (noma'lum narx "kelishildi" emas) */
    narx: z.coerce.number().int().min(0).max(1_000_000_000),
    muddat: SANA.nullish(),
  }),
  z.object({ amal: z.literal('bajarildi'), sana: SANA }),
  z.object({
    amal: z.literal('tasdiq'),
    tomon: z.enum(['ijrochi', 'buyurtmachi']),
    javob: z.boolean(),
    usul: USUL,
    izoh: MATN(3, 300).nullish(),
  }),
  z.object({ amal: z.literal('bekor'), sabab: MATN(3, 300) }),
]);

export type BuyurtmaAmali = z.infer<typeof BuyurtmaAmaliSxemasi>;
export type XizmatAmali = z.infer<typeof XizmatAmaliSxemasi>;

/* ══════════════════════════════════════════════════════════════
 *  XIZMAT TAKLIFLARI
 * ══════════════════════════════════════════════════════════════ */

async function odamOl(kim: Kim, ishsizId: string) {
  const odam = await prisma.unemployedPerson.findUnique({
    where: { id: ishsizId },
    select: { id: true, mahallaId: true, arxivSanasi: true },
  });
  if (!odam || odam.arxivSanasi) throw new BuyurtmaXatosi('TOPILMADI', 'Фуқаро топилмади');
  if (!mahallagaRuxsat(kim, odam.mahallaId)) {
    throw new BuyurtmaXatosi('RUXSAT', 'Бу фуқарога ҳуқуқингиз йўқ');
  }
  return odam;
}

/** Ijrochisiz qolgan buyurtmalar: faol (hali bajarilmagan) buyurtmalar "yangi"ga qaytadi */
async function ijrochiniBoshat(tx: Pick<typeof prisma, 'mahalliyBuyurtma'>, taklifId: string) {
  return tx.mahalliyBuyurtma.updateMany({
    where: { taklifId, holati: { in: ['TAYINLANDI', 'KELISHILDI'] } },
    data: {
      holati: 'YANGI',
      taklifId: null,
      tayinlanganSana: null,
      kelishilganNarx: null,
      kelishilganSana: null,
      muddat: null,
    },
  });
}

export async function xizmatYaratish(
  kim: Kim,
  d: z.infer<typeof XizmatYaratishSxemasi>
): Promise<{ id: string }> {
  await odamOl(kim, d.ishsizId);
  /* Rozilik YO'Q holda yaratiladi: u keyin alohida, ongli amal bilan qayd etiladi */
  return prisma.xizmatTaklifi.create({
    data: {
      ishsizId: d.ishsizId,
      nomi: d.nomi,
      tavsif: d.tavsif ?? null,
      taxminiyNarx: d.taxminiyNarx != null ? BigInt(d.taxminiyNarx) : null,
      yaratganId: kim.userId,
    },
    select: { id: true },
  });
}

export async function xizmatAmali(
  kim: Kim,
  id: string,
  a: XizmatAmali,
  hozir = new Date()
): Promise<{ ok: true }> {
  const t = await prisma.xizmatTaklifi.findUnique({
    where: { id },
    select: { id: true, ishsizId: true, rozilik: true, faol: true },
  });
  if (!t) throw new BuyurtmaXatosi('TOPILMADI', 'Таклиф топилмади');
  await odamOl(kim, t.ishsizId);

  switch (a.amal) {
    case 'rozilik': {
      const sana = a.sana ?? hozir;
      if (sanaOrali(sana, hozir) > 0) {
        throw new BuyurtmaXatosi('NOTOGRI', 'Розилик санаси келажакда бўлиши мумкин эмас');
      }
      /* Takroriy bosish: allaqachon qayd etilgan - o'zgarmaydi */
      await prisma.xizmatTaklifi.updateMany({
        where: { id, rozilik: false },
        data: { rozilik: true, roziligiUsuli: a.usul, roziligiSana: sana },
      });
      return { ok: true };
    }

    case 'rozilik-qaytar': {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "XizmatTaklifi" WHERE "id" = ${id} FOR UPDATE`;
        await tx.xizmatTaklifi.update({
          where: { id },
          data: { rozilik: false, roziligiUsuli: null, roziligiSana: null },
        });
        await ijrochiniBoshat(tx, id);
      });
      return { ok: true };
    }

    case 'yopish': {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "XizmatTaklifi" WHERE "id" = ${id} FOR UPDATE`;
        await tx.xizmatTaklifi.update({ where: { id }, data: { faol: false, yopilganSana: hozir } });
        await ijrochiniBoshat(tx, id);
      });
      return { ok: true };
    }

    case 'qaytarish': {
      await prisma.xizmatTaklifi.update({ where: { id }, data: { faol: true, yopilganSana: null } });
      return { ok: true };
    }

    case 'tahrir': {
      const data: Prisma.XizmatTaklifiUpdateInput = {};
      if (a.nomi !== undefined) data.nomi = a.nomi;
      if (a.tavsif !== undefined) data.tavsif = a.tavsif;
      if (a.taxminiyNarx !== undefined) {
        data.taxminiyNarx = a.taxminiyNarx != null ? BigInt(a.taxminiyNarx) : null;
      }
      if (Object.keys(data).length === 0) throw new BuyurtmaXatosi('NOTOGRI', 'Ўзгартириш йўқ');
      await prisma.xizmatTaklifi.update({ where: { id }, data });
      return { ok: true };
    }
  }
}

/* ══════════════════════════════════════════════════════════════
 *  BUYURTMALAR
 * ══════════════════════════════════════════════════════════════ */

export async function buyurtmaYaratish(
  kim: Kim,
  d: z.infer<typeof BuyurtmaYaratishSxemasi>
): Promise<{ id: string }> {
  if (!mahallagaRuxsat(kim, d.mahallaId)) {
    throw new BuyurtmaXatosi('RUXSAT', 'Бу маҳаллага ҳуқуқингиз йўқ');
  }
  const mahalla = await prisma.mahalla.findUnique({ where: { id: d.mahallaId }, select: { id: true } });
  if (!mahalla) throw new BuyurtmaXatosi('TOPILMADI', 'Маҳалла топилмади');

  let telefon: string | null = null;
  if (d.buyurtmachiTelefon && d.buyurtmachiTelefon.trim() !== '') {
    const t = telefonTekshir(d.buyurtmachiTelefon, 'Буюртмачи телефони');
    if (!t.ok) throw new BuyurtmaXatosi('NOTOGRI', t.xabar ?? 'Телефон рақами нотўғри');
    telefon = telefonSaqlashUchun(d.buyurtmachiTelefon);
  }

  return prisma.mahalliyBuyurtma.create({
    data: {
      mahallaId: d.mahallaId,
      buyurtmachiNomi: d.buyurtmachiNomi,
      buyurtmachiTelefon: telefon,
      tavsif: d.tavsif,
      yaratganId: kim.userId,
    },
    select: { id: true },
  });
}

export async function buyurtmaAmali(
  kim: Kim,
  id: string,
  a: BuyurtmaAmali,
  hozir = new Date()
): Promise<{ ok: true }> {
  const b = await prisma.mahalliyBuyurtma.findUnique({
    where: { id },
    select: {
      id: true,
      mahallaId: true,
      holati: true,
      taklifId: true,
      kelishilganSana: true,
      bajarilganSana: true,
      ijrochiTasdigi: true,
      buyurtmachiTasdigi: true,
      tasdiqIzohi: true,
    },
  });
  if (!b) throw new BuyurtmaXatosi('TOPILMADI', 'Буюртма топилмади');
  if (!mahallagaRuxsat(kim, b.mahallaId)) {
    throw new BuyurtmaXatosi('RUXSAT', 'Бу буюртмага ҳуқуқингиз йўқ');
  }

  const holatXatosi = () =>
    new BuyurtmaXatosi('HOLAT', 'Буюртма ҳолати шу орада ўзгарган ёки бу амал ҳозир мумкин эмас — саҳифани янгиланг');

  const yangila = async (from: BuyurtmaHolati[], data: Prisma.MahalliyBuyurtmaUpdateManyMutationInput) => {
    if (!from.includes(b.holati)) throw holatXatosi();
    /* Atomar: holat tekshiruvi yozish bilan BIR yozuvda */
    const n = await prisma.mahalliyBuyurtma.updateMany({
      where: { id: b.id, holati: { in: from } },
      data,
    });
    if (n.count === 0) throw holatXatosi();
  };

  switch (a.amal) {
    case 'tayinla': {
      if (!['YANGI', 'TAYINLANDI'].includes(b.holati)) throw holatXatosi();
      await prisma.$transaction(async (tx) => {
        /* Taklif qulflanadi: u shu paytda yopilayotgan/rozilik qaytarilayotgan bo'lmasin */
        await tx.$queryRaw`SELECT "id" FROM "XizmatTaklifi" WHERE "id" = ${a.taklifId} FOR UPDATE`;
        const t = await tx.xizmatTaklifi.findUnique({
          where: { id: a.taklifId },
          select: {
            faol: true,
            rozilik: true,
            ishsiz: { select: { mahallaId: true, arxivSanasi: true } },
          },
        });
        if (!t || t.ishsiz.arxivSanasi) throw new BuyurtmaXatosi('TOPILMADI', 'Таклиф топилмади');
        /* Mahalla xodimi faqat O'Z mahallasi ijrochisini tayinlaydi */
        if (!mahallagaRuxsat(kim, t.ishsiz.mahallaId)) {
          throw new BuyurtmaXatosi('RUXSAT', 'Бу ижрочига ҳуқуқингиз йўқ');
        }
        if (!t.faol) throw new BuyurtmaXatosi('YOPIQ', 'Таклиф ёпилган');
        if (!t.rozilik) {
          throw new BuyurtmaXatosi(
            'ROZILIK',
            'Фуқаро розилиги қайд этилмаган: розиликсиз ижрочи тайинланмайди'
          );
        }
        const n = await tx.mahalliyBuyurtma.updateMany({
          where: { id: b.id, holati: { in: ['YANGI', 'TAYINLANDI'] } },
          data: { holati: 'TAYINLANDI', taklifId: a.taklifId, tayinlanganSana: hozir },
        });
        if (n.count === 0) throw holatXatosi();
      });
      return { ok: true };
    }

    case 'kelish': {
      if (a.muddat && sanaOrali(a.muddat, hozir) < 0) {
        throw new BuyurtmaXatosi('NOTOGRI', 'Муддат ўтган санада бўлиши мумкин эмас');
      }
      await yangila(['TAYINLANDI'], {
        holati: 'KELISHILDI',
        kelishilganNarx: BigInt(a.narx),
        kelishilganSana: hozir,
        muddat: a.muddat ?? null,
      });
      return { ok: true };
    }

    case 'bajarildi': {
      if (sanaOrali(a.sana, hozir) > 0) {
        throw new BuyurtmaXatosi('NOTOGRI', 'Бажарилган сана келажакда бўлиши мумкин эмас');
      }
      if (b.kelishilganSana && sanaOrali(a.sana, b.kelishilganSana) < 0) {
        throw new BuyurtmaXatosi('NOTOGRI', 'Иш келишув санасидан олдин бажарилган бўлиши мумкин эмас');
      }
      await yangila(['KELISHILDI'], { holati: 'BAJARILDI', bajarilganSana: a.sana });
      return { ok: true };
    }

    case 'tasdiq': {
      if (b.holati !== 'BAJARILDI') throw holatXatosi();
      if (!a.javob && !a.izoh) {
        throw new BuyurtmaXatosi('NOTOGRI', 'Эътироз сабабини ёзинг');
      }
      const ijrochi = a.tomon === 'ijrochi';
      const hozirgi = ijrochi ? b.ijrochiTasdigi : b.buyurtmachiTasdigi;
      /* Тасдиқланган (true) жавоб жимгина ортга қайтарилмайди; такрор тасдиқ — ўзгаришсиз */
      if (hozirgi === true) {
        if (a.javob) return { ok: true };
        throw new BuyurtmaXatosi('HOLAT', 'Бу томон аллақачон тасдиқлаган — ўзгартириб бўлмайди');
      }
      const yorliq = ijrochi ? 'Ижрочи' : 'Буюртмачи';
      const izoh = a.izoh ? `${yorliq}: ${a.izoh}` : null;
      const yangiIzoh = izoh ? [b.tasdiqIzohi, izoh].filter(Boolean).join('\n').slice(0, 600) : b.tasdiqIzohi;
      const maydon = ijrochi
        ? { ijrochiTasdigi: a.javob, ijrochiTasdiqSanasi: hozir, ijrochiTasdiqUsuli: a.usul }
        : { buyurtmachiTasdigi: a.javob, buyurtmachiTasdiqSanasi: hozir, buyurtmachiTasdiqUsuli: a.usul };
      /* Shart bazada: true bo'lib qolgan javob parallel so'rovda ham qayta yozilmaydi (faqat null yoki false yoziladi) */
      const n = await prisma.mahalliyBuyurtma.updateMany({
        where: {
          id: b.id,
          holati: 'BAJARILDI',
          OR: ijrochi
            ? [{ ijrochiTasdigi: null }, { ijrochiTasdigi: false }]
            : [{ buyurtmachiTasdigi: null }, { buyurtmachiTasdigi: false }],
        },
        data: { ...maydon, tasdiqIzohi: yangiIzoh },
      });
      if (n.count === 0) throw holatXatosi();
      return { ok: true };
    }

    case 'bekor': {
      await yangila(['YANGI', 'TAYINLANDI', 'KELISHILDI'], { holati: 'BEKOR', bekorSababi: a.sabab });
      return { ok: true };
    }
  }
}

/* ══════════════════════════════════════════════════════════════
 *  O'QISH
 * ══════════════════════════════════════════════════════════════ */

/**
 * Ko'rsatkichlar. `mahallaId` berilsa - faqat shu mahalla (mahalla xodimi
 * uchun majburiy). Buyurtma ma'lumoti ismsiz, jamlangan.
 */
export async function buyurtmaKorsatkichlari(
  mahallaId?: string | null,
  hozir = new Date()
): Promise<BuyurtmaKorsatkichlari> {
  const qatorlar = await prisma.mahalliyBuyurtma.findMany({
    where: mahallaId ? { mahallaId } : {},
    select: {
      holati: true,
      bajarilganSana: true,
      ijrochiTasdigi: true,
      buyurtmachiTasdigi: true,
      kelishilganNarx: true,
    },
  });
  return buyurtmaKorsatkichlarniHisobla(
    qatorlar.map((q) => ({
      ...q,
      kelishilganNarx: q.kelishilganNarx !== null ? Number(q.kelishilganNarx) : null,
    })),
    hozir
  );
}

/** Tasdiq so'rash kerak bo'lgan buyurtmalar (vazifalar taxtasi uchun) */
export async function tasdiqKutayotganlar(mahallaId: string | null | undefined, hozir = new Date(), take = 200) {
  const nomzodlar = await prisma.mahalliyBuyurtma.findMany({
    where: {
      holati: 'BAJARILDI',
      bajarilganSana: { not: null },
      ...(mahallaId ? { mahallaId } : {}),
      /*
       * Ikki tomon ham true bo'lmagan (null yoki false). `NOT (a AND b)` EMAS:
       * SQL da null uchun u NULL beradi va qator jimgina yo'qoladi (ya'ni
       * hech kim tasdiqlamagan buyurtma ro'yxatdan tushib qolardi).
       */
      OR: [
        { ijrochiTasdigi: null },
        { ijrochiTasdigi: false },
        { buyurtmachiTasdigi: null },
        { buyurtmachiTasdigi: false },
      ],
    },
    orderBy: { bajarilganSana: 'asc' },
    take,
    select: {
      id: true,
      buyurtmachiNomi: true,
      tavsif: true,
      bajarilganSana: true,
      ijrochiTasdigi: true,
      buyurtmachiTasdigi: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });
  return nomzodlar.filter(
    (b) => b.bajarilganSana && sanaOrali(hozir, b.bajarilganSana) >= TASDIQ_ESLATMA_KUNI
  );
}

