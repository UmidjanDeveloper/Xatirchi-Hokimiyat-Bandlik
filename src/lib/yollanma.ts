import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { RozilikUsuli, YollanmaHolati } from '@prisma/client';
import { mahallagaRuxsat, type Sessiya } from './auth';
import { prisma } from './prisma';
import { BERUVCHI } from './beruvchi-belgilari';
import { beruvchigaXabarBer } from './ish-beruvchi';
import { ID } from './oila-rejasi';
import { xavfsiz, type Tugma } from './xabarnoma';

/**
 * ============================================================
 *  NOMZODNI ISH BERUVCHIGA YO'LLASH
 *
 *  Bandlik xodimi fuqarani bo'sh ish o'rniga yo'llaydi; ish beruvchi
 *  botda suhbat va ishga qabul natijasini bildiradi.
 *
 *  ── Uch qoida ──
 *
 *  1. ROZILIKSIZ MA'LUMOT BERILMAYDI. Fuqaroning ismi va telefoni ish
 *     beruvchiga FAQAT u rozi bo'lgach, va faqat zarur minimum (ism,
 *     telefon, kasb) yuboriladi. Rozilik xodim tomonidan usuli va
 *     sanasi bilan yozib olinadi - bu fuqaroning mustaqil elektron
 *     tasdig'i emas.
 *
 *  2. FAQAT O'Z E'LONIGA JAVOB. Ish beruvchi faqat o'z e'loniga
 *     yo'llangan va unga ma'lumot yuborilgan nomzod haqida natija
 *     bildira oladi. Telegram tugma belgisi qo'lda o'zgartirilishi
 *     mumkin, shuning uchun egalik har safar bazadan tekshiriladi.
 *
 *  3. ISH BERUVCHI AYTGANI TASDIQ EMAS. "Ishga qabul qildik" -
 *     `ISHGA_QABUL`, lekin tasdiqlangan joylashish HISOBLANMAYDI: u
 *     joylashish voqeasi va dalil orqali alohida tasdiqlanadi.
 * ============================================================
 */

export class YollanmaXatosi extends Error {
  constructor(
    public readonly kod:
      | 'TOPILMADI'
      | 'RUXSAT'
      | 'NOTOGRI'
      | 'MAVJUD'
      | 'ROZILIK'
      | 'YOPIQ'
      | 'BERUVCHI_YOQ'
      | 'YUBORIB_BOLMADI',
    xabar: string
  ) {
    super(xabar);
  }
}

export const YOLLANMA_HTTP: Record<YollanmaXatosi['kod'], number> = {
  TOPILMADI: 404,
  RUXSAT: 403,
  NOTOGRI: 400,
  MAVJUD: 409,
  ROZILIK: 409,
  YOPIQ: 409,
  BERUVCHI_YOQ: 409,
  YUBORIB_BOLMADI: 502,
};

/* Nomlar `yollanma-nomlari.ts` da: brauzer komponentlari ularni olishi kerak, bu fayl esa bazaga ulanadi. */
export * from './yollanma-nomlari';
import { ULASHILADIGAN, type Ulashiladi } from './yollanma-nomlari';

/** Yakuniy holatlar - ulardan keyin o'zgarish yo'q */
const YAKUNIY: YollanmaHolati[] = ['ISHGA_QABUL', 'ISH_BERUVCHI_RAD', 'FUQARO_RAD', 'BEKOR'];

export const RozilikSxemasi = z.object({
  usul: z.enum(['OGZAKI', 'TELEFON', 'YOZMA']),
  /* Rozilik QACHON olingan (kun) - kelajak bo'lmaydi */
  sana: z.coerce.date().optional(),
});

export const YuborishSxemasi = z.object({
  maydonlar: z.array(z.enum(ULASHILADIGAN)).min(1).max(3).optional(),
});

export const XodimHolatiSxemasi = z.object({
  holati: z.enum(['SUHBAT_BELGILANDI', 'SUHBAT_OTKAZILDI', 'FUQARO_RAD', 'BEKOR']),
  izoh: z.string().trim().max(500).nullish(),
  suhbatSanasi: z.coerce.date().nullish(),
});

export const YaratishSxemasi = z.object({ ishsizId: ID, vacancyId: ID });

type Kim = Pick<Sessiya, 'rol' | 'mahallaId' | 'userId'>;

/* ── Yaratish ── */

/**
 * Nomzodni e'longa yo'llash. Bitta nomzod bitta e'longa bir marta
 * (baza cheklovi); takror so'rovda mavjud yozuv qaytadi.
 */
export async function yollanmaYaratish(
  kim: Kim,
  d: { ishsizId: string; vacancyId: string },
  hozir = new Date()
): Promise<{ id: string; yangi: boolean }> {
  const [odam, elon] = await Promise.all([
    prisma.unemployedPerson.findUnique({
      where: { id: d.ishsizId },
      select: { id: true, mahallaId: true, arxivSanasi: true },
    }),
    prisma.vacancy.findUnique({
      where: { id: d.vacancyId },
      select: { id: true, mahallaId: true, faol: true, moderatsiya: true, amalQilishMuddati: true },
    }),
  ]);
  if (!odam || odam.arxivSanasi) throw new YollanmaXatosi('TOPILMADI', 'Фуқаро топилмади');
  if (!elon) throw new YollanmaXatosi('TOPILMADI', 'Эълон топилмади');
  if (!mahallagaRuxsat(kim, odam.mahallaId)) {
    throw new YollanmaXatosi('RUXSAT', 'Бу фуқарога ҳуқуқингиз йўқ');
  }
  /* Ўлик ёки текширилмаган эълонга одам йўлланмайди */
  if (!elon.faol || elon.moderatsiya !== 'TASDIQLANDI') {
    throw new YollanmaXatosi('YOPIQ', 'Эълон фаол эмас ёки ҳали тасдиқланмаган');
  }
  if (elon.amalQilishMuddati && elon.amalQilishMuddati.getTime() < hozir.getTime()) {
    throw new YollanmaXatosi('YOPIQ', 'Эълон муддати тугаган');
  }

  const mavjud = await prisma.nomzodYollanmasi.findUnique({
    where: { yollanma_takrori: { ishsizId: d.ishsizId, vacancyId: d.vacancyId } },
    select: { id: true },
  });
  if (mavjud) return { id: mavjud.id, yangi: false };

  try {
    const y = await prisma.nomzodYollanmasi.create({
      data: { ishsizId: d.ishsizId, vacancyId: d.vacancyId, yaratganId: kim.userId },
      select: { id: true },
    });
    return { id: y.id, yangi: true };
  } catch (e) {
    /* Parallel so'rov biroz oldin yozgan */
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const b = await prisma.nomzodYollanmasi.findUnique({
        where: { yollanma_takrori: { ishsizId: d.ishsizId, vacancyId: d.vacancyId } },
        select: { id: true },
      });
      if (b) return { id: b.id, yangi: false };
    }
    throw e;
  }
}

/** Yo'llanmani huquq tekshiruvi bilan oladi */
async function yollanmaniOl(kim: Kim, id: string) {
  const y = await prisma.nomzodYollanmasi.findUnique({
    where: { id },
    include: {
      ishsiz: {
        select: { id: true, fish: true, telefon: true, mutaxassisligi: true, mahallaId: true, arxivSanasi: true },
      },
      vacancy: {
        select: {
          id: true,
          lavozim: true,
          korxonaNomi: true,
          ishBeruvchi: { select: { id: true, telegramChatId: true, holati: true } },
        },
      },
    },
  });
  if (!y || y.ishsiz.arxivSanasi) throw new YollanmaXatosi('TOPILMADI', 'Йўлланма топилмади');
  if (!mahallagaRuxsat(kim, y.ishsiz.mahallaId)) {
    throw new YollanmaXatosi('RUXSAT', 'Бу фуқарога ҳуқуқингиз йўқ');
  }
  return y;
}

/* ── Rozilik ── */

/**
 * Fuqaroning ish beruvchiga ma'lumot berishga roziligini yozadi.
 * Sana kelajakda bo'lmaydi: rozilik "olingan" bo'ladi, "olinadi" emas.
 */
export async function rozilikQayd(
  kim: Kim,
  yollanmaId: string,
  d: { usul: RozilikUsuli; sana?: Date },
  hozir = new Date()
): Promise<void> {
  const y = await yollanmaniOl(kim, yollanmaId);
  if (YAKUNIY.includes(y.holati)) throw new YollanmaXatosi('YOPIQ', 'Йўлланма якунланган');

  const sana = d.sana ?? hozir;
  if (Number.isNaN(sana.getTime()) || sana.getTime() > hozir.getTime() + 24 * 60 * 60 * 1000) {
    throw new YollanmaXatosi('NOTOGRI', 'Розилик санаси келажакда бўлиши мумкин эмас');
  }

  await prisma.nomzodYollanmasi.update({
    where: { id: y.id },
    data: { rozilik: true, roziligiSana: sana, roziligiUsuli: d.usul },
  });
}

/**
 * Rozilikni qaytarib olish. Ma'lumot ALLAQACHON yuborilgan bo'lsa,
 * tarixi (qachon, nima yuborilgani) saqlanadi - yo'qotilmaydi;
 * yangidan yuborish esa yangi rozilik talab qiladi.
 */
export async function rozilikniQaytar(kim: Kim, yollanmaId: string): Promise<void> {
  const y = await yollanmaniOl(kim, yollanmaId);
  await prisma.nomzodYollanmasi.update({
    where: { id: y.id },
    data: { rozilik: false },
  });
}

/* ── Ish beruvchiga yuborish ── */

/** Ish beruvchiga boradigan xabar - FAQAT tanlangan minimum */
export function beruvchiXabari(p: {
  lavozim: string;
  fish: string;
  telefon: string | null;
  kasb: string | null;
  maydonlar: readonly Ulashiladi[];
}): string {
  const satr = (q: Ulashiladi, nom: string, qiymat: string | null) =>
    p.maydonlar.includes(q) ? [`${nom}: <b>${xavfsiz(qiymat ?? 'кўрсатилмаган')}</b>`] : [];
  return [
    '<b>Бандлик марказидан номзод</b>',
    `Эълон: ${xavfsiz(p.lavozim)}`,
    '',
    ...satr('fish', 'Ф.И.Ш.', p.fish),
    ...satr('telefon', 'Телефон', p.telefon),
    ...satr('kasb', 'Касби', p.kasb),
    '',
    'Фуқаро маълумотини сизга беришга розилик берган. Бу маълумотдан фақат шу иш учун фойдаланинг.',
    '',
    'Суҳбат ва қарор натижасини қуйидаги тугмалар орқали билдиринг.',
  ].join('\n');
}

export function beruvchiTugmalari(yollanmaId: string): Tugma[] {
  return [
    { yozuv: '🗣 Суҳбат ўтказилди', belgi: `${BERUVCHI.YOL_SUHBAT}:${yollanmaId}` },
    { yozuv: '✅ Ишга қабул қилинди', belgi: `${BERUVCHI.YOL_QABUL}:${yollanmaId}` },
    { yozuv: '❌ Мос келмади', belgi: `${BERUVCHI.YOL_RAD}:${yollanmaId}` },
  ];
}

/**
 * Nomzod ma'lumotini ish beruvchiga botda yuboradi.
 *
 * Yuborish MUVAFFAQIYATLI bo'lgandan keyingina `ulashilganSana` yoziladi:
 * Telegram xato bersa, "yuborildi" deb yozib qo'yilmaydi (aks holda
 * ish beruvchi hech narsa olmagan-u tizim "olingan" deb hisoblardi).
 */
export async function beruvchigaYuborish(
  kim: Kim,
  yollanmaId: string,
  maydonlar: readonly Ulashiladi[] = ULASHILADIGAN,
  hozir = new Date()
): Promise<void> {
  const y = await yollanmaniOl(kim, yollanmaId);

  if (!y.rozilik) {
    throw new YollanmaXatosi('ROZILIK', 'Фуқаро розилиги қайд этилмаган — маълумот юбориб бўлмайди');
  }
  if (YAKUNIY.includes(y.holati)) throw new YollanmaXatosi('YOPIQ', 'Йўлланма якунланган');
  if (y.ulashilganSana) throw new YollanmaXatosi('MAVJUD', 'Маълумот аллақачон юборилган');

  const b = y.vacancy.ishBeruvchi;
  if (!b || b.holati !== 'TASDIQLANDI' || !b.telegramChatId) {
    throw new YollanmaXatosi(
      'BERUVCHI_YOQ',
      'Бу эълон ботдаги иш берувчига боғланмаган (ходим қўйган) — номзод ҳақида иш берувчига ўзингиз хабар беринг'
    );
  }

  const m = [...new Set(maydonlar)];
  if (m.length === 0) throw new YollanmaXatosi('NOTOGRI', 'Камида битта маълумот танланг');

  const ok = await beruvchigaXabarBer(
    b.telegramChatId,
    beruvchiXabari({
      lavozim: y.vacancy.lavozim,
      fish: y.ishsiz.fish,
      telefon: y.ishsiz.telefon,
      kasb: y.ishsiz.mutaxassisligi,
      maydonlar: m,
    }),
    beruvchiTugmalari(y.id)
  );
  if (!ok) {
    throw new YollanmaXatosi('YUBORIB_BOLMADI', 'Ботга юбориб бўлмади — кейинроқ қайта уриниб кўринг');
  }

  /* Ikki xodim bir vaqtda bossa, ikkinchisi yozolmaydi (atomar) */
  await prisma.nomzodYollanmasi.updateMany({
    where: { id: y.id, ulashilganSana: null },
    data: { ulashilgan: m, ulashilganSana: hozir },
  });
}

/* ── Natija ── */

export type BeruvchiNatijasi = 'suhbat' | 'qabul' | 'rad';

const NATIJA_HOLATI: Record<BeruvchiNatijasi, YollanmaHolati> = {
  suhbat: 'SUHBAT_OTKAZILDI',
  qabul: 'ISHGA_QABUL',
  rad: 'ISH_BERUVCHI_RAD',
};

/** Ish beruvchi botda natijani bildirdi. Faqat o'z e'loniga yuborilgan nomzod haqida. */
export async function beruvchiNatijasi(
  beruvchiId: string,
  yollanmaId: string,
  natija: BeruvchiNatijasi,
  hozir = new Date()
): Promise<{ ok: true; holati: YollanmaHolati } | { ok: false; sabab: 'topilmadi' | 'yakunlangan' }> {
  const yangi = NATIJA_HOLATI[natija];

  const n = await prisma.nomzodYollanmasi.updateMany({
    where: {
      id: yollanmaId,
      /* Egalik: e'lon shu ish beruvchiniki, va unga ma'lumot YUBORILGAN */
      vacancy: { ishBeruvchiId: beruvchiId },
      ulashilganSana: { not: null },
      /* Yakuniy holatdan keyin o'zgarmaydi; "suhbat" faqat boshlang'ich holatlardan */
      holati: natija === 'suhbat' ? { in: ['YOLLANDI', 'SUHBAT_BELGILANDI'] } : { notIn: YAKUNIY },
    },
    data: {
      holati: yangi,
      natijaManbasi: 'ISH_BERUVCHI_BILDIRGAN',
      natijaSanasi: hozir,
      ...(natija === 'suhbat' ? { suhbatSanasi: hozir } : {}),
    },
  });
  if (n.count === 1) return { ok: true, holati: yangi };

  const bor = await prisma.nomzodYollanmasi.findFirst({
    where: { id: yollanmaId, vacancy: { ishBeruvchiId: beruvchiId }, ulashilganSana: { not: null } },
    select: { id: true },
  });
  return { ok: false, sabab: bor ? 'yakunlangan' : 'topilmadi' };
}

/** Xodim holatni o'zi belgilaydi (suhbat sanasi, fuqaro voz kechdi, bekor) */
export async function xodimHolati(
  kim: Kim,
  yollanmaId: string,
  d: { holati: 'SUHBAT_BELGILANDI' | 'SUHBAT_OTKAZILDI' | 'FUQARO_RAD' | 'BEKOR'; izoh?: string | null; suhbatSanasi?: Date | null },
  hozir = new Date()
): Promise<void> {
  const y = await yollanmaniOl(kim, yollanmaId);
  if (YAKUNIY.includes(y.holati)) throw new YollanmaXatosi('YOPIQ', 'Йўлланма якунланган');

  const n = await prisma.nomzodYollanmasi.updateMany({
    where: { id: y.id, holati: { notIn: YAKUNIY } },
    data: {
      holati: d.holati,
      natijaIzohi: d.izoh ?? null,
      natijaManbasi: 'XODIM_QAYD_ETGAN',
      natijaSanasi: hozir,
      ...(d.suhbatSanasi ? { suhbatSanasi: d.suhbatSanasi } : {}),
    },
  });
  if (n.count === 0) throw new YollanmaXatosi('YOPIQ', 'Йўлланма якунланган');
}

/* ── Ro'yxatlar ── */

/** E'lonning yo'llanmalari (xodim sahifasi uchun) */
export async function elonYollanmalari(vacancyId: string) {
  return prisma.nomzodYollanmasi.findMany({
    where: { vacancyId, ishsiz: { arxivSanasi: null } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      holati: true,
      rozilik: true,
      roziligiSana: true,
      roziligiUsuli: true,
      ulashilgan: true,
      ulashilganSana: true,
      suhbatSanasi: true,
      natijaIzohi: true,
      natijaManbasi: true,
      natijaSanasi: true,
      createdAt: true,
      /* `vacancyId` - joylashtirish shu e'longa qayd etilganmi (ish beruvchi so'zi tasdiq emas) */
      ishsiz: { select: { id: true, fish: true, vacancyId: true, mahalla: { select: { nomiKirill: true } } } },
      yaratgan: { select: { fullName: true } },
    },
  });
}

/**
 * "Ish beruvchi qaror kutilyapti": ma'lumot yuborilgan, ammo shuncha
 * kundan beri javob yo'q. Vazifalar taxtasi uchun.
 */
export const JAVOBSIZ_KUN = 5;

export async function javobsizYollanmalar(hozir = new Date(), take = 8) {
  const chegara = new Date(hozir.getTime() - JAVOBSIZ_KUN * 24 * 60 * 60 * 1000);
  const where: Prisma.NomzodYollanmasiWhereInput = {
    holati: { in: ['YOLLANDI', 'SUHBAT_BELGILANDI'] },
    ulashilganSana: { lt: chegara },
    ishsiz: { arxivSanasi: null },
  };
  const [soni, royxat] = await Promise.all([
    prisma.nomzodYollanmasi.count({ where }),
    prisma.nomzodYollanmasi.findMany({
      where,
      orderBy: { ulashilganSana: 'asc' },
      take,
      select: {
        id: true,
        ulashilganSana: true,
        ishsiz: { select: { id: true, fish: true } },
        vacancy: { select: { id: true, lavozim: true, korxonaNomi: true } },
      },
    }),
  ]);
  return { soni, royxat };
}
