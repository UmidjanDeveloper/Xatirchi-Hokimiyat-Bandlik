import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { MurojaatHolati } from '@prisma/client';
import { mahallagaRuxsat, type Sessiya } from './auth';
import { prisma } from './prisma';
import { telefonSaqlashUchun, telefonTekshir } from './inson-tekshiruvi';
import { ID, masulXodimYaroqlimi, sanaOrali } from './oila-rejasi';
import { MAKS_ESKI_KUN, MAKS_MUDDAT_KUNI, NATIJA_NOMI, YAQIN_MUDDAT_KUNI } from './murojaatlar-nomlari';

/**
 * ============================================================
 *  MUROJAATLAR (XODIM QAYD ETADI)
 *
 *  Fuqaro xodimga (qabulxonada, telefonda, uyma-uy yurganda) muammo aytadi;
 *  xodim uni yozadi: kim, qaysi yo'l bilan, qachon kelgan, kim mas'ul,
 *  qachongacha javob berilishi kerak - va keyin holati, natijasi va
 *  qayta ochilgan bo'lsa sababi.
 *
 *  ── Oltita qoida ──
 *
 *  1. FUQARO O'ZI YOZMAYDI. Shaxsiy kabinet yo'q: murojaatni faqat xodim
 *     qayd etadi. Shuning uchun "murojaat soni" - qayd etilganlar soni,
 *     "murojaat bo'lmadi" degani emas.
 *
 *  2. MUDDATNI TAXMIN QILMAYMIZ. Javob muddati har safar xodim tomonidan
 *     aniq beriladi (formada dastlabki qiymat bor, u qonuniy muddat emas).
 *     Muddatni uzaytirish faqat oldinga, sabab bilan va tarixga yozilib.
 *
 *  3. HAR O'ZGARISH TARIXDA. Holat, mas'ul, muddat va qayta ochish alohida
 *     yoziladi va o'chirilmaydi: "kim, qachon, nega" savoliga javob bor.
 *
 *  4. JAVOB BERILGANI = NATIJA BILAN. Natija turi va matni majburiy; qayta
 *     ochilganda oldingi natija tarixda saqlanadi va sabab majburiy.
 *
 *  5. NOMA'LUM != NOL. Javob berilmagan murojaatning natijasi null (nol
 *     emas); "muddatida" faqat javob berilganlar bo'yicha hisoblanadi.
 *
 *  6. HUQUQ. Mahalla xodimi faqat o'z mahallasi murojaatini ko'radi va
 *     o'zgartiradi; mas'ul qilib faqat shu mahallaga huquqi bor xodim
 *     tayinlanadi.
 * ============================================================
 */

export class MurojaatXatosi extends Error {
  constructor(
    public readonly kod: 'TOPILMADI' | 'RUXSAT' | 'NOTOGRI' | 'HOLAT',
    xabar: string
  ) {
    super(xabar);
  }
}

export const MUROJAAT_HTTP: Record<MurojaatXatosi['kod'], number> = {
  TOPILMADI: 404,
  RUXSAT: 403,
  NOTOGRI: 400,
  HOLAT: 409,
};

/* Nomlar `murojaatlar-nomlari.ts` da: brauzer komponentlari ularni olishi kerak, bu fayl esa bazaga ulanadi. */
export * from './murojaatlar-nomlari';

type Kim = Pick<Sessiya, 'rol' | 'mahallaId' | 'userId'>;

const OCHIQ: MurojaatHolati[] = ['YANGI', 'JARAYONDA'];
const JAVOBLI: MurojaatHolati[] = ['JAVOB_BERILDI', 'YOPILDI'];

/* ══════════════════════════════════════════════════════════════
 *  TOZA FUNKSIYALAR
 * ══════════════════════════════════════════════════════════════ */

export type MuddatHolati = 'KECHIKKAN' | 'BUGUN' | 'YAQIN' | 'MUDDATLI' | 'JAVOB_BERILGAN';

/** Murojaat muddatining holati (Toshkent kuni bo'yicha) */
export function muddatHolati(
  m: { holati: MurojaatHolati; javobMuddati: Date },
  hozir = new Date()
): { holat: MuddatHolati; kun: number } {
  if (!OCHIQ.includes(m.holati)) return { holat: 'JAVOB_BERILGAN', kun: 0 };
  const kun = sanaOrali(m.javobMuddati, hozir);
  if (kun < 0) return { holat: 'KECHIKKAN', kun: -kun };
  if (kun === 0) return { holat: 'BUGUN', kun: 0 };
  if (kun <= YAQIN_MUDDAT_KUNI) return { holat: 'YAQIN', kun };
  return { holat: 'MUDDATLI', kun };
}

/** Javob muddatida berilganmi (kun bo'yicha): javob sanasi muddat kunidan kech emas */
export function muddatidaJavobmi(m: { javobSanasi: Date | null; javobMuddati: Date }): boolean | null {
  if (!m.javobSanasi) return null;
  return sanaOrali(m.javobSanasi, m.javobMuddati) <= 0;
}

export interface MurojaatMetrika {
  holati: MurojaatHolati;
  qabulVaqti: Date;
  javobMuddati: Date;
  javobSanasi: Date | null;
  qaytaOchilganSoni: number;
  /** Muddati hech bo'lmasa bir marta uzaytirilgan */
  uzaytirilgan: boolean;
}

export interface MurojaatKorsatkichlari {
  jami: number;
  yangi: number;
  jarayonda: number;
  javobBerilgan: number;
  yopilgan: number;
  /** Ochiq murojaatlar orasida */
  muddat: { kechikkan: number; bugun: number; yaqin: number };
  /** Javob berilganlar orasida */
  javob: {
    vaqtida: number;
    kechikib: number;
    /** Muddati uzaytirilgan javoblar (ularning "vaqtida"si uzaytirilgan muddatga nisbatan) */
    uzaytirilgan: number;
    /** Qabuldan javobgacha o'rtacha kun (mediana); javob yo'q bo'lsa null */
    medianaKun: number | null;
  };
  /** Bir marta bo'lsa ham qayta ochilganlar va ularning ulushi uchun maxraj */
  qaytaOchilgan: { soni: number; jamiMarta: number; maxraj: number };
}

export function murojaatKorsatkichlarniHisobla(
  qatorlar: MurojaatMetrika[],
  hozir = new Date()
): MurojaatKorsatkichlari {
  const k: MurojaatKorsatkichlari = {
    jami: qatorlar.length,
    yangi: 0,
    jarayonda: 0,
    javobBerilgan: 0,
    yopilgan: 0,
    muddat: { kechikkan: 0, bugun: 0, yaqin: 0 },
    javob: { vaqtida: 0, kechikib: 0, uzaytirilgan: 0, medianaKun: null },
    qaytaOchilgan: { soni: 0, jamiMarta: 0, maxraj: 0 },
  };
  const kunlar: number[] = [];

  for (const q of qatorlar) {
    if (q.holati === 'YANGI') k.yangi++;
    else if (q.holati === 'JARAYONDA') k.jarayonda++;
    else if (q.holati === 'JAVOB_BERILDI') k.javobBerilgan++;
    else k.yopilgan++;

    if (OCHIQ.includes(q.holati)) {
      const h = muddatHolati(q, hozir).holat;
      if (h === 'KECHIKKAN') k.muddat.kechikkan++;
      else if (h === 'BUGUN') k.muddat.bugun++;
      else if (h === 'YAQIN') k.muddat.yaqin++;
    } else {
      const v = muddatidaJavobmi(q);
      if (v === true) k.javob.vaqtida++;
      else if (v === false) k.javob.kechikib++;
      if (q.uzaytirilgan) k.javob.uzaytirilgan++;
      if (q.javobSanasi) kunlar.push(Math.max(0, sanaOrali(q.javobSanasi, q.qabulVaqti)));
    }

    if (q.qaytaOchilganSoni > 0) {
      k.qaytaOchilgan.soni++;
      k.qaytaOchilgan.jamiMarta += q.qaytaOchilganSoni;
    }
  }

  /* Maxraj: javob berilganlar + hozir ochiq, lekin ilgari javob olgan (qayta ochilgan) murojaatlar */
  k.qaytaOchilgan.maxraj =
    k.javobBerilgan + k.yopilgan + qatorlar.filter((q) => OCHIQ.includes(q.holati) && q.qaytaOchilganSoni > 0).length;

  if (kunlar.length > 0) {
    kunlar.sort((a, b) => a - b);
    const o = Math.floor(kunlar.length / 2);
    k.javob.medianaKun = kunlar.length % 2 ? kunlar[o] : Math.round((kunlar[o - 1] + kunlar[o]) / 2);
  }
  return k;
}

/* ── Sxemalar ── */

const MATN = (min: number, max: number) => z.string().trim().min(min).max(max);
const SANA = z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), 'Сана нотўғри');
const KANAL = z.enum(['QABULXONA', 'TELEFON', 'UYMA_UY', 'XAT', 'TELEGRAM', 'BOSHQA']);
const NATIJA = z.enum(['HAL_QILINDI', 'TUSHUNTIRILDI', 'YONALTIRILDI', 'RAD_ETILDI', 'VOZ_KECHDI']);

export const MurojaatYaratishSxemasi = z.object({
  mahallaId: ID,
  ishsizId: ID.nullish(),
  murojaatchiNomi: MATN(2, 120),
  murojaatchiTelefon: z.string().trim().max(30).nullish(),
  kanal: KANAL,
  tavsif: MATN(5, 1000),
  qabulVaqti: SANA,
  /* Berilmasa - qayd etayotgan xodim */
  masulId: ID.nullish(),
  /* ANIQ beriladi: server muddatni taxmin qilmaydi */
  javobMuddati: SANA,
});

export const MurojaatAmaliSxemasi = z.discriminatedUnion('amal', [
  z.object({ amal: z.literal('qabul') }),
  z.object({
    amal: z.literal('javob'),
    natijaTuri: NATIJA,
    natija: MATN(5, 1000),
    sana: SANA.optional(),
  }),
  z.object({ amal: z.literal('yopish') }),
  z.object({ amal: z.literal('qayta-ochish'), sabab: MATN(3, 300), yangiMuddat: SANA }),
  z.object({ amal: z.literal('masul'), masulId: ID }),
  z.object({ amal: z.literal('muddat'), yangiMuddat: SANA, sabab: MATN(3, 300) }),
]);

export type MurojaatAmali = z.infer<typeof MurojaatAmaliSxemasi>;

/** Maydonlar orasidagi qoidalar; xato bo'lsa matn qaytadi */
export function murojaatniTekshir(
  d: { qabulVaqti: Date; javobMuddati: Date },
  hozir = new Date()
): string | null {
  if (d.qabulVaqti.getTime() > hozir.getTime() + 60 * 60 * 1000) {
    return 'Қабул вақти келажакда бўлиши мумкин эмас';
  }
  if (sanaOrali(hozir, d.qabulVaqti) > MAKS_ESKI_KUN) {
    return `Қабул санаси ${MAKS_ESKI_KUN} кундан эски бўлиши мумкин эмас — санани текширинг`;
  }
  const oraliq = sanaOrali(d.javobMuddati, d.qabulVaqti);
  if (oraliq < 0) return 'Жавоб муддати қабул санасидан олдин бўлиши мумкин эмас';
  if (oraliq > MAKS_MUDDAT_KUNI) return `Жавоб муддати қабулдан ${MAKS_MUDDAT_KUNI} кундан узоқ бўлиши мумкин эмас`;
  return null;
}

/* ══════════════════════════════════════════════════════════════
 *  BAZA
 * ══════════════════════════════════════════════════════════════ */

/**
 * Keyingi raqam: `M-2026-0001`. Eng kattasidan olinadi (sanoqdan emas) va
 * UNIQUE cheklovi poygani ushlaydi: chaqiruvchi to'qnashuvda qayta urinadi.
 */
async function keyingiRaqam(tx: Pick<typeof prisma, 'murojaat'>, hozir: Date): Promise<string> {
  const yil = new Date(hozir.getTime() + 5 * 3600 * 1000).getUTCFullYear();
  const prefiks = `M-${yil}-`;
  const oxirgi = await tx.murojaat.findFirst({
    where: { raqami: { startsWith: prefiks } },
    orderBy: { raqami: 'desc' },
    select: { raqami: true },
  });
  const son = oxirgi ? Number(oxirgi.raqami.slice(prefiks.length)) : 0;
  return `${prefiks}${String((Number.isFinite(son) ? son : 0) + 1).padStart(4, '0')}`;
}

export async function murojaatYaratish(
  kim: Kim,
  d: z.infer<typeof MurojaatYaratishSxemasi>,
  hozir = new Date()
): Promise<{ id: string; raqami: string }> {
  if (!mahallagaRuxsat(kim, d.mahallaId)) {
    throw new MurojaatXatosi('RUXSAT', 'Бу маҳаллага ҳуқуқингиз йўқ');
  }
  const mahalla = await prisma.mahalla.findUnique({ where: { id: d.mahallaId }, select: { id: true } });
  if (!mahalla) throw new MurojaatXatosi('TOPILMADI', 'Маҳалла топилмади');

  const xato = murojaatniTekshir(d, hozir);
  if (xato) throw new MurojaatXatosi('NOTOGRI', xato);

  if (d.ishsizId) {
    const odam = await prisma.unemployedPerson.findUnique({
      where: { id: d.ishsizId },
      select: { mahallaId: true, arxivSanasi: true },
    });
    if (!odam || odam.arxivSanasi) throw new MurojaatXatosi('TOPILMADI', 'Фуқаро топилмади');
    if (odam.mahallaId !== d.mahallaId) {
      throw new MurojaatXatosi('NOTOGRI', 'Фуқаро бошқа маҳаллага тегишли');
    }
  }

  let telefon: string | null = null;
  if (d.murojaatchiTelefon && d.murojaatchiTelefon.trim() !== '') {
    const t = telefonTekshir(d.murojaatchiTelefon, 'Мурожаатчи телефони');
    if (!t.ok) throw new MurojaatXatosi('NOTOGRI', t.xabar ?? 'Телефон рақами нотўғри');
    telefon = telefonSaqlashUchun(d.murojaatchiTelefon);
  }

  const masulId = d.masulId ?? kim.userId;
  if (!(await masulXodimYaroqlimi(masulId, d.mahallaId))) {
    throw new MurojaatXatosi('NOTOGRI', 'Бу ходимни мас‘ул қилиб бўлмайди (фаол эмас ёки бошқа маҳалла ходими)');
  }

  /* Raqam to'qnashuvi (parallel qayd) - UNIQUE ushlaydi, qayta uriniladi */
  for (let urinish = 0; urinish < 5; urinish++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const raqami = await keyingiRaqam(tx, hozir);
        const m = await tx.murojaat.create({
          data: {
            raqami,
            mahallaId: d.mahallaId,
            ishsizId: d.ishsizId ?? null,
            murojaatchiNomi: d.murojaatchiNomi,
            murojaatchiTelefon: telefon,
            kanal: d.kanal,
            tavsif: d.tavsif,
            qabulVaqti: d.qabulVaqti,
            masulId,
            javobMuddati: d.javobMuddati,
            yaratganId: kim.userId,
          },
          select: { id: true, raqami: true },
        });
        await tx.murojaatTarixi.create({
          data: { murojaatId: m.id, hodisa: 'YARATILDI', holatga: 'YANGI', kimId: kim.userId },
        });
        return m;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && urinish < 4) continue;
      throw e;
    }
  }
  throw new MurojaatXatosi('HOLAT', 'Raqam yaratib bo‘lmadi — qayta urinib ko‘ring');
}

export async function murojaatAmali(
  kim: Kim,
  id: string,
  a: MurojaatAmali,
  hozir = new Date()
): Promise<{ ok: true }> {
  const m = await prisma.murojaat.findUnique({
    where: { id },
    select: {
      id: true,
      mahallaId: true,
      holati: true,
      qabulVaqti: true,
      javobMuddati: true,
      masulId: true,
      natijaTuri: true,
      natija: true,
    },
  });
  if (!m) throw new MurojaatXatosi('TOPILMADI', 'Мурожаат топилмади');
  if (!mahallagaRuxsat(kim, m.mahallaId)) {
    throw new MurojaatXatosi('RUXSAT', 'Бу мурожаатга ҳуқуқингиз йўқ');
  }

  const holatXatosi = () =>
    new MurojaatXatosi('HOLAT', 'Мурожаат ҳолати шу орада ўзгарган ёки бу амал ҳозир мумкин эмас — саҳифани янгиланг');

  /**
   * Atomar: holat sharti bilan yozish va tarix yozuvi BIR tranzaksiyada
   * (o'zgarish bo'lsa tarix ham bor; tarix bo'lsa o'zgarish ham bor).
   */
  const ozgartir = async (
    from: MurojaatHolati[],
    data: Prisma.MurojaatUpdateManyMutationInput,
    tarix: { hodisa: string; holatga?: MurojaatHolati; izoh?: string | null }
  ) => {
    if (!from.includes(m.holati)) throw holatXatosi();
    await prisma.$transaction(async (tx) => {
      const n = await tx.murojaat.updateMany({ where: { id: m.id, holati: { in: from } }, data });
      if (n.count === 0) throw holatXatosi();
      await tx.murojaatTarixi.create({
        data: {
          murojaatId: m.id,
          hodisa: tarix.hodisa,
          holatdan: m.holati,
          holatga: tarix.holatga ?? null,
          kimId: kim.userId,
          izoh: tarix.izoh ? tarix.izoh.slice(0, 1200) : null,
        },
      });
    });
  };

  switch (a.amal) {
    case 'qabul': {
      await ozgartir(['YANGI'], { holati: 'JARAYONDA' }, { hodisa: 'HOLAT', holatga: 'JARAYONDA' });
      return { ok: true };
    }

    case 'javob': {
      const sana = a.sana ?? hozir;
      if (sanaOrali(sana, hozir) > 0) {
        throw new MurojaatXatosi('NOTOGRI', 'Жавоб санаси келажакда бўлиши мумкин эмас');
      }
      if (sanaOrali(sana, m.qabulVaqti) < 0) {
        throw new MurojaatXatosi('NOTOGRI', 'Жавоб санаси қабул санасидан олдин бўлиши мумкин эмас');
      }
      await ozgartir(
        OCHIQ,
        { holati: 'JAVOB_BERILDI', natijaTuri: a.natijaTuri, natija: a.natija, javobSanasi: sana },
        { hodisa: 'HOLAT', holatga: 'JAVOB_BERILDI', izoh: `${NATIJA_NOMI[a.natijaTuri]}: ${a.natija}` }
      );
      return { ok: true };
    }

    case 'yopish': {
      await ozgartir(
        ['JAVOB_BERILDI'],
        { holati: 'YOPILDI', yopilganSana: hozir },
        { hodisa: 'HOLAT', holatga: 'YOPILDI' }
      );
      return { ok: true };
    }

    case 'qayta-ochish': {
      if (sanaOrali(a.yangiMuddat, hozir) < 0) {
        throw new MurojaatXatosi('NOTOGRI', 'Янги муддат ўтган кунда бўлиши мумкин эмас');
      }
      if (sanaOrali(a.yangiMuddat, hozir) > MAKS_MUDDAT_KUNI) {
        throw new MurojaatXatosi('NOTOGRI', `Янги муддат ${MAKS_MUDDAT_KUNI} кундан узоқ бўлиши мумкин эмас`);
      }
      const eski = m.natijaTuri ? `${NATIJA_NOMI[m.natijaTuri]}: ${m.natija ?? ''}` : 'натижа йўқ';
      await ozgartir(
        JAVOBLI,
        {
          holati: 'JARAYONDA',
          qaytaOchilganSoni: { increment: 1 },
          oxirgiQaytaOchishSababi: a.sabab,
          javobMuddati: a.yangiMuddat,
          natijaTuri: null,
          natija: null,
          javobSanasi: null,
          yopilganSana: null,
        },
        { hodisa: 'QAYTA_OCHILDI', holatga: 'JARAYONDA', izoh: `${a.sabab}. Олдинги натижа — ${eski}` }
      );
      return { ok: true };
    }

    case 'masul': {
      if (!(await masulXodimYaroqlimi(a.masulId, m.mahallaId))) {
        throw new MurojaatXatosi('NOTOGRI', 'Бу ходимни мас‘ул қилиб бўлмайди (фаол эмас ёки бошқа маҳалла ходими)');
      }
      if (a.masulId === m.masulId) throw new MurojaatXatosi('NOTOGRI', 'Бу ходим аллақачон мас‘ул');
      const [eskiMasul, yangiMasul] = await Promise.all([
        prisma.user.findUnique({ where: { id: m.masulId }, select: { fullName: true } }),
        prisma.user.findUnique({ where: { id: a.masulId }, select: { fullName: true } }),
      ]);
      await prisma.$transaction(async (tx) => {
        /* Mas'ul faqat joriy mas'ul o'zgarmagan bo'lsa almashadi (parallel almashtirishni ushlaydi) */
        const n = await tx.murojaat.updateMany({
          where: { id: m.id, masulId: m.masulId },
          data: { masulId: a.masulId },
        });
        if (n.count === 0) throw holatXatosi();
        await tx.murojaatTarixi.create({
          data: {
            murojaatId: m.id,
            hodisa: 'MASUL',
            holatdan: m.holati,
            holatga: m.holati,
            kimId: kim.userId,
            izoh: `${eskiMasul?.fullName ?? '—'} → ${yangiMasul?.fullName ?? '—'}`,
          },
        });
      });
      return { ok: true };
    }

    case 'muddat': {
      if (sanaOrali(a.yangiMuddat, m.javobMuddati) <= 0) {
        throw new MurojaatXatosi('NOTOGRI', 'Муддатни фақат кейинга суриш мумкин (қисқартириб бўлмайди)');
      }
      if (sanaOrali(a.yangiMuddat, m.qabulVaqti) > MAKS_MUDDAT_KUNI) {
        throw new MurojaatXatosi('NOTOGRI', `Муддат қабулдан ${MAKS_MUDDAT_KUNI} кундан узоқ бўлиши мумкин эмас`);
      }
      const kun = (d: Date) => new Date(d.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10).split('-').reverse().join('.');
      /* Muddat o'zgarmagan bo'lsa ham yozish: updateMany sharti ESKI muddat (parallel o'zgarishni ushlaydi) */
      if (!OCHIQ.includes(m.holati)) throw holatXatosi();
      await prisma.$transaction(async (tx) => {
        const n = await tx.murojaat.updateMany({
          where: { id: m.id, holati: { in: OCHIQ }, javobMuddati: m.javobMuddati },
          data: { javobMuddati: a.yangiMuddat },
        });
        if (n.count === 0) throw holatXatosi();
        await tx.murojaatTarixi.create({
          data: {
            murojaatId: m.id,
            hodisa: 'MUDDAT',
            holatdan: m.holati,
            holatga: m.holati,
            kimId: kim.userId,
            izoh: `${kun(m.javobMuddati)} → ${kun(a.yangiMuddat)}: ${a.sabab}`,
          },
        });
      });
      return { ok: true };
    }
  }
}

/* ══════════════════════════════════════════════════════════════
 *  O'QISH
 * ══════════════════════════════════════════════════════════════ */

/** Ko'rsatkichlar. `mahallaId` berilsa - faqat shu mahalla (mahalla xodimi uchun majburiy) */
export async function murojaatKorsatkichlari(
  mahallaId?: string | null,
  hozir = new Date()
): Promise<MurojaatKorsatkichlari> {
  const qatorlar = await prisma.murojaat.findMany({
    where: mahallaId ? { mahallaId } : {},
    select: {
      id: true,
      holati: true,
      qabulVaqti: true,
      javobMuddati: true,
      javobSanasi: true,
      qaytaOchilganSoni: true,
    },
  });
  const uzaytirilgan = qatorlar.length
    ? new Set(
        (
          await prisma.murojaatTarixi.groupBy({
            by: ['murojaatId'],
            where: { hodisa: 'MUDDAT', murojaatId: { in: qatorlar.map((q) => q.id) } },
          })
        ).map((x) => x.murojaatId)
      )
    : new Set<string>();
  return murojaatKorsatkichlarniHisobla(
    qatorlar.map((q) => ({ ...q, uzaytirilgan: uzaytirilgan.has(q.id) })),
    hozir
  );
}

/**
 * Muddati o'tgan yoki yaqin ochiq murojaatlar (vazifalar taxtasi uchun).
 * Eng kechikkani birinchi.
 */
export async function muddatliMurojaatlar(mahallaId: string | null | undefined, hozir = new Date(), take = 200) {
  const nomzodlar = await prisma.murojaat.findMany({
    where: {
      holati: { in: OCHIQ },
      ...(mahallaId ? { mahallaId } : {}),
      /* Aniq kun hisobi kodda; bazadan faqat "yaqin kelajakkacha" muddatlilar */
      javobMuddati: { lt: new Date(hozir.getTime() + (YAQIN_MUDDAT_KUNI + 2) * 24 * 60 * 60 * 1000) },
    },
    orderBy: { javobMuddati: 'asc' },
    take,
    select: {
      id: true,
      raqami: true,
      murojaatchiNomi: true,
      tavsif: true,
      holati: true,
      javobMuddati: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });
  return nomzodlar
    .map((n) => ({ ...n, muddat: muddatHolati(n, hozir) }))
    .filter((n) => n.muddat.holat !== 'MUDDATLI');
}
