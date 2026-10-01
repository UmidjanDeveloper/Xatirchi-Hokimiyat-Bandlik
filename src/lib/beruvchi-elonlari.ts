import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { xavfsiz, type Tugma } from './xabarnoma';
import { BERUVCHI } from './beruvchi-belgilari';
import { maoshniOqi } from './maosh-matni';
import { ODATIY_MUDDAT_KUN, qolganKun } from './elon-muddati';
import { beruvchigaXabarBer, elonniModeratsiyagaYubor } from './ish-beruvchi';

/**
 * ============================================================
 *  ISH BERUVCHI: O'Z E'LONLARI (Telegram boti)
 *
 *  Ish beruvchi e'lon qo'yishi mumkin edi, lekin keyin u e'lon bilan
 *  nima bo'lganini bilmasdi: tasdiqlandimi, rad etildimi (nega?),
 *  muddati tugadimi, o'rin to'ldimi. Yopish uchun esa hokimiyatga
 *  telefon qilish kerak edi.
 *
 *  ── Qoidalar ──
 *
 *  1. Ish beruvchi FAQAT O'Z e'lonlarini ko'radi va o'zgartiradi:
 *     har amal `ishBeruvchiId` bo'yicha tekshiriladi. Telegram'dan
 *     kelgan tugma belgisi qo'lda o'zgartirilishi mumkin.
 *
 *  2. MUHIM TAHRIR QAYTA MODERATSIYAGA BORADI. Maosh, talab, o'rin
 *     soni, jadval va sharoit - fuqaro shularga qarab yo'lga chiqadi.
 *     Tasdiqlangan e'londa maoshni jimgina oshirib yoki talabni
 *     o'zgartirib qo'yish - moderatsiyani aylanib o'tish bo'lardi.
 *     Tahrirdan keyin e'lon moderatsiya kutadi va tasdiqlangunga
 *     qadar ko'rinmaydi.
 *
 *  3. MUDDATNI UZAYTIRISH moderatsiya talab qilmaydi (mazmun
 *     o'zgarmaydi), lekin cheklangan: bugundan 90 kundan ortiq emas.
 *     Cheksiz uzaytirish "ochiq turib qolgan eski e'lon" muammosini
 *     qaytarardi.
 *
 *  4. YOPILGAN E'LON bilan to'ldirilgan yoki rad etilgan e'lon
 *     farqlanadi: "o'rin to'ldi" qayta ochilmaydi.
 * ============================================================
 */

export interface Javob {
  matn: string;
  tugmalar: Tugma[];
}

/** Bir sahifada ko'rsatiladigan e'lonlar */
export const RO_YXAT_HAJMI = 10;
/** Muddat bugundan shuncha kundan uzoqqa surilmaydi */
export const ENG_UZOQ_MUDDAT_KUN = 90;

const KUN = 24 * 60 * 60 * 1000;

/* ── Holat ── */

export type ElonHolati =
  | 'moderatsiyada'
  | 'faol'
  | 'rad'
  | 'muddati-tugadi'
  | 'toldi'
  | 'yopilgan';

export interface ElonHolatiManbai {
  faol: boolean;
  moderatsiya: 'KUTILMOQDA' | 'TASDIQLANDI' | 'RAD_ETILDI';
  amalQilishMuddati: Date | null;
  yopilishSababi: 'TOLDI' | 'QOLDA' | 'MUDDATI_TUGADI' | null;
}

export function elonHolati(e: ElonHolatiManbai, hozir = new Date()): ElonHolati {
  if (e.moderatsiya === 'RAD_ETILDI') return 'rad';
  if (!e.faol) {
    if (e.yopilishSababi === 'TOLDI') return 'toldi';
    if (e.yopilishSababi === 'MUDDATI_TUGADI') return 'muddati-tugadi';
    return 'yopilgan';
  }
  if (e.moderatsiya === 'KUTILMOQDA') return 'moderatsiyada';
  /* Cron hali yopmagan, lekin muddat o'tgan */
  if (e.amalQilishMuddati && e.amalQilishMuddati.getTime() < hozir.getTime()) return 'muddati-tugadi';
  return 'faol';
}

const HOLAT_BELGISI: Record<ElonHolati, string> = {
  moderatsiyada: '⏳ Кўриб чиқилмоқда',
  faol: '🟢 Фаол',
  rad: '❌ Рад этилган',
  'muddati-tugadi': '⌛ Муддати тугаган',
  toldi: '✅ Ўринлар тўлган',
  yopilgan: '🔒 Ёпилган',
};

export const elonHolatiMatni = (h: ElonHolati) => HOLAT_BELGISI[h];

/** Qaysi holatda qaysi amallar mumkin */
export function amallar(h: ElonHolati): {
  yopish: boolean;
  uzaytirish: boolean;
  tahrir: boolean;
  qaytaYuborish: boolean;
} {
  return {
    yopish: h === 'faol' || h === 'moderatsiyada',
    uzaytirish: h === 'faol',
    tahrir: h === 'faol' || h === 'moderatsiyada',
    /* Rad etilgan yoki muddati tugagan e'lonni tuzatib qayta yuborish mumkin; "to'ldi" - yo'q */
    qaytaYuborish: h === 'rad' || h === 'muddati-tugadi' || h === 'yopilgan',
  };
}

/* ── Ko'rinish ── */

const ORQAGA: Tugma = { yozuv: '⬅️ Меню', belgi: BERUVCHI.MENYU };
const ROYXATGA: Tugma = { yozuv: '⬅️ Эълонларим', belgi: BERUVCHI.ELONLARIM };

const ELON_TANLASH = {
  id: true,
  lavozim: true,
  korxonaNomi: true,
  ornlarSoni: true,
  maosh: true,
  talablar: true,
  jadvali: true,
  sharoitlari: true,
  faol: true,
  moderatsiya: true,
  moderatsiyaSababi: true,
  moderatsiyaSanasi: true,
  amalQilishMuddati: true,
  yopilishSababi: true,
  yopilganSana: true,
  createdAt: true,
  mahalla: { select: { nomiKirill: true } },
} satisfies Prisma.VacancySelect;

/** "Эълонларим" - ish beruvchining сўнгги эълонлари */
export async function elonlarimRoyxati(beruvchiId: string, hozir = new Date()): Promise<Javob> {
  const elonlar = await prisma.vacancy.findMany({
    where: { ishBeruvchiId: beruvchiId },
    orderBy: { createdAt: 'desc' },
    take: RO_YXAT_HAJMI,
    select: ELON_TANLASH,
  });

  if (elonlar.length === 0) {
    return {
      matn: 'Ҳали эълон қўймагансиз.\n\n«Янги иш ўрни» тугмаси орқали биринчи эълонни қўйинг.',
      tugmalar: [{ yozuv: '➕ Янги иш ўрни', belgi: BERUVCHI.ELON }, ORQAGA],
    };
  }

  const holatlar = elonlar.map((e) => elonHolati(e, hozir));
  const sana = (n: ElonHolati) => holatlar.filter((h) => h === n).length;

  return {
    matn: [
      '<b>Эълонларим</b>',
      '',
      `🟢 Фаол: <b>${sana('faol')}</b>  ·  ⏳ Кўриб чиқилмоқда: <b>${sana('moderatsiyada')}</b>`,
      ...(sana('rad') > 0 ? [`❌ Рад этилган: <b>${sana('rad')}</b>`] : []),
      ...(sana('muddati-tugadi') > 0 ? [`⌛ Муддати тугаган: <b>${sana('muddati-tugadi')}</b>`] : []),
      '',
      'Эълонни очиш учун босинг:',
    ].join('\n'),
    tugmalar: [
      ...elonlar.map((e, i) => ({
        yozuv: `${HOLAT_BELGISI[holatlar[i]].split(' ')[0]} ${e.lavozim}`.slice(0, 60),
        belgi: `${BERUVCHI.ELON_KOR}:${e.id}`,
      })),
      ORQAGA,
    ],
  };
}

/** Bitta e'lon - holat, sabab va mumkin amallar. Boshqa ish beruvchiniki bo'lsa - `null` */
export async function elonKorinishi(
  beruvchiId: string,
  vacancyId: string,
  hozir = new Date()
): Promise<Javob | null> {
  const e = await prisma.vacancy.findFirst({
    where: { id: vacancyId, ishBeruvchiId: beruvchiId },
    select: ELON_TANLASH,
  });
  if (!e) return null;

  const h = elonHolati(e, hozir);
  const m = amallar(h);
  const q = qolganKun(e.amalQilishMuddati, hozir);

  const satrlar = [
    `<b>${xavfsiz(e.lavozim)}</b>`,
    `${xavfsiz(e.korxonaNomi)} · ${xavfsiz(e.mahalla.nomiKirill)} МФЙ`,
    '',
    `Ҳолат: <b>${HOLAT_BELGISI[h]}</b>`,
  ];

  if (h === 'rad') {
    satrlar.push(
      e.moderatsiyaSababi
        ? `Сабаби: ${xavfsiz(e.moderatsiyaSababi)}`
        : 'Сабаби кўрсатилмаган — бандлик маркази билан боғланинг.'
    );
  }
  if (h === 'moderatsiyada') {
    satrlar.push('Бандлик маркази кўриб чиқмоқда. Тасдиқлангунча ходимларга кўринмайди.');
  }
  if (h === 'faol' && q !== null) {
    satrlar.push(q >= 0 ? `Муддат: яна <b>${q}</b> кун` : '');
  }
  if (h === 'faol' && q === null) satrlar.push('Муддатсиз');
  if (h === 'muddati-tugadi') satrlar.push('Муддат тугади — ходимларга кўринмайди.');

  /* E'londagi asosiy maydonlar - ish beruvchi nimani tahrirlayotganini ko'rsin */
  satrlar.push(
    '',
    `Ўринлар: <b>${e.ornlarSoni}</b>`,
    `Маош: <b>${e.maosh ? `${Number(e.maosh) / 1_000_000} млн сўм` : 'кўрсатилмаган'}</b>`,
    `Жадвал: ${e.jadvali ? xavfsiz(e.jadvali) : '<i>кўрсатилмаган</i>'}`,
    `Шароит: ${e.sharoitlari ? xavfsiz(e.sharoitlari) : '<i>кўрсатилмаган</i>'}`,
    `Талаблар: ${e.talablar ? xavfsiz(e.talablar) : '<i>кўрсатилмаган</i>'}`
  );

  const tugmalar: Tugma[] = [];
  if (m.yopish) tugmalar.push({ yozuv: '🔒 Эълонни ёпиш', belgi: `${BERUVCHI.ELON_YOPISH}:${e.id}` });
  if (m.uzaytirish) tugmalar.push({ yozuv: '📅 Муддатни узайтириш', belgi: `${BERUVCHI.ELON_UZAYT}:${e.id}` });
  if (m.qaytaYuborish) tugmalar.push({ yozuv: '🔄 Қайта юбориш', belgi: `${BERUVCHI.ELON_QAYTA}:${e.id}` });
  if (m.tahrir) {
    tugmalar.push(
      { yozuv: '✏️ Маошни ўзгартириш', belgi: `${BERUVCHI.ELON_TAHRIR}:${e.id}:maosh` },
      { yozuv: '✏️ Талабларни ўзгартириш', belgi: `${BERUVCHI.ELON_TAHRIR}:${e.id}:talab` },
      { yozuv: '✏️ Ўрин сонини ўзгартириш', belgi: `${BERUVCHI.ELON_TAHRIR}:${e.id}:orin` },
      { yozuv: '✏️ Иш жадвалини ёзиш', belgi: `${BERUVCHI.ELON_TAHRIR}:${e.id}:jadval` },
      { yozuv: '✏️ Шароитларни ёзиш', belgi: `${BERUVCHI.ELON_TAHRIR}:${e.id}:sharoit` }
    );
  }
  tugmalar.push(ROYXATGA);

  return { matn: satrlar.filter((x) => x !== '').join('\n'), tugmalar };
}

/* ── Amallar ── */

export type AmalNatijasi<T = object> =
  | ({ ok: true } & T)
  | { ok: false; sabab: 'topilmadi' | 'allaqachon' | 'mumkin-emas' | 'chegara' };

/** E'lonni ish beruvchining o'zi yopadi (bekor qiladi) */
export async function elonniYopish(
  beruvchiId: string,
  vacancyId: string,
  hozir = new Date()
): Promise<AmalNatijasi> {
  const n = await prisma.vacancy.updateMany({
    where: { id: vacancyId, ishBeruvchiId: beruvchiId, faol: true },
    data: { faol: false, yopilishSababi: 'QOLDA', yopilganSana: hozir },
  });
  if (n.count === 1) return { ok: true };

  const bor = await prisma.vacancy.findFirst({
    where: { id: vacancyId, ishBeruvchiId: beruvchiId },
    select: { id: true },
  });
  return { ok: false, sabab: bor ? 'allaqachon' : 'topilmadi' };
}

/**
 * Muddatni +30 kunga uzaytirish; moderatsiya kerak emas (mazmun
 * o'zgarmaydi), lekin bugundan 90 kundan uzoqqa surilmaydi.
 */
export async function elonMuddatiniUzaytir(
  beruvchiId: string,
  vacancyId: string,
  hozir = new Date()
): Promise<AmalNatijasi<{ yangiMuddat: Date }>> {
  const e = await prisma.vacancy.findFirst({
    where: { id: vacancyId, ishBeruvchiId: beruvchiId },
    select: { id: true, faol: true, moderatsiya: true, amalQilishMuddati: true },
  });
  if (!e) return { ok: false, sabab: 'topilmadi' };
  if (!e.faol || e.moderatsiya !== 'TASDIQLANDI') return { ok: false, sabab: 'mumkin-emas' };

  const asos =
    e.amalQilishMuddati && e.amalQilishMuddati.getTime() > hozir.getTime()
      ? e.amalQilishMuddati
      : hozir;
  const chegara = new Date(hozir.getTime() + ENG_UZOQ_MUDDAT_KUN * KUN);
  const yangi = new Date(Math.min(asos.getTime() + ODATIY_MUDDAT_KUN * KUN, chegara.getTime()));

  /* Allaqachon chegarada: yana surish mumkin emas */
  if (e.amalQilishMuddati && yangi.getTime() <= e.amalQilishMuddati.getTime()) {
    return { ok: false, sabab: 'chegara' };
  }

  const n = await prisma.vacancy.updateMany({
    where: { id: e.id, ishBeruvchiId: beruvchiId, faol: true, moderatsiya: 'TASDIQLANDI' },
    data: { amalQilishMuddati: yangi },
  });
  return n.count === 1 ? { ok: true, yangiMuddat: yangi } : { ok: false, sabab: 'allaqachon' };
}

/**
 * Rad etilgan, muddati tugagan yoki o'zi yopgan e'lonni qayta moderatsiyaga
 * yuboradi. "O'rin to'ldi" qayta ochilmaydi.
 */
export async function elonniQaytaYubor(
  beruvchiId: string,
  vacancyId: string,
  hozir = new Date()
): Promise<AmalNatijasi<{ lavozim: string }>> {
  const e = await prisma.vacancy.findFirst({
    where: { id: vacancyId, ishBeruvchiId: beruvchiId },
    select: { id: true, lavozim: true, faol: true, moderatsiya: true, yopilishSababi: true, amalQilishMuddati: true },
  });
  if (!e) return { ok: false, sabab: 'topilmadi' };
  const h = elonHolati(e, hozir);
  if (!amallar(h).qaytaYuborish) return { ok: false, sabab: 'mumkin-emas' };

  const n = await prisma.vacancy.updateMany({
    where: {
      id: e.id,
      ishBeruvchiId: beruvchiId,
      /* Parallel bosishdan: faqat hozirgi holat o'zgarmagan bo'lsa */
      OR: [{ faol: false }, { moderatsiya: 'RAD_ETILDI' }, { amalQilishMuddati: { lt: hozir } }],
    },
    data: {
      faol: true,
      yopilishSababi: null,
      yopilganSana: null,
      amalQilishMuddati: new Date(hozir.getTime() + ODATIY_MUDDAT_KUN * KUN),
      moderatsiya: 'KUTILMOQDA',
      moderatsiyaQilganId: null,
      moderatsiyaSanasi: null,
      moderatsiyaSababi: null,
    },
  });
  if (n.count === 0) return { ok: false, sabab: 'allaqachon' };

  await elonniModeratsiyagaYubor(e.id, 'qayta');
  return { ok: true, lavozim: e.lavozim };
}

/* ── Tahrir suhbati ── */

export type TahrirMaydoni = 'maosh' | 'talab' | 'orin' | 'jadval' | 'sharoit';
const MAYDONLAR: readonly TahrirMaydoni[] = ['maosh', 'talab', 'orin', 'jadval', 'sharoit'];
/** `IshBeruvchi.bosqich` qiymatlari: `t.` bilan boshlanadi - qolgan suhbatlardan ajraladi */
const BOSQICH = (m: TahrirMaydoni) => `t.${m}`;
export const TAHRIR_MUDDATI_DAQIQA = 30;

const SAVOL: Record<TahrirMaydoni, string> = {
  maosh: 'Янги ойлик маошни <b>млн сўмда</b> ёзинг. Масалан: <i>4.5</i>',
  talab: 'Янги талабларни ёзинг (ўқув, тажриба, ҳужжат).',
  orin: 'Янги ўрин сонини ёзинг (1 дан 500 гача).',
  jadval: 'Иш жадвалини ёзинг. Масалан: <i>Душанба–Шанба, 8:00–17:00</i>',
  sharoit: 'Шароитларни ёзинг (транспорт, овқат, яшаш жойи).',
};

export function maydonmi(x: string): x is TahrirMaydoni {
  return (MAYDONLAR as readonly string[]).includes(x);
}

/** Tahrirni boshlash: savol beradi va suhbat holatini yozadi */
export async function tahrirniBoshla(
  beruvchiId: string,
  vacancyId: string,
  maydon: TahrirMaydoni,
  hozir = new Date()
): Promise<Javob | null> {
  const e = await prisma.vacancy.findFirst({
    where: { id: vacancyId, ishBeruvchiId: beruvchiId },
    select: { faol: true, moderatsiya: true, amalQilishMuddati: true, yopilishSababi: true },
  });
  if (!e || !amallar(elonHolati(e, hozir)).tahrir) return null;

  await prisma.ishBeruvchi.update({
    where: { id: beruvchiId },
    data: { bosqich: BOSQICH(maydon), suhbat: { vacancyId }, suhbatVaqti: hozir },
  });

  return {
    matn: [
      '<b>Эълонни таҳрирлаш</b>',
      '',
      SAVOL[maydon],
      '',
      '<i>Диққат: ўзгартиришдан кейин эълон қайта кўриб чиқилади ва тасдиқлангунча ходимларга кўринмайди.</i>',
    ].join('\n'),
    tugmalar: [{ yozuv: '✖️ Бекор қилиш', belgi: `${BERUVCHI.ELON_KOR}:${vacancyId}` }],
  };
}

export async function tahrirSuhbatiBormi(beruvchiId: string, hozir = new Date()): Promise<boolean> {
  const b = await prisma.ishBeruvchi.findUnique({
    where: { id: beruvchiId },
    select: { bosqich: true, suhbatVaqti: true },
  });
  if (!b?.bosqich?.startsWith('t.') || !b.suhbatVaqti) return false;
  return hozir.getTime() - b.suhbatVaqti.getTime() <= TAHRIR_MUDDATI_DAQIQA * 60_000;
}

/** Tahrir qiymatini tekshiradi; xato bo'lsa xabar matni */
export function tahrirQiymati(
  maydon: TahrirMaydoni,
  matn: string
): { ok: true; data: Prisma.VacancyUpdateManyMutationInput } | { ok: false; xabar: string } {
  const t = matn.trim();
  switch (maydon) {
    case 'maosh': {
      const son = maoshniOqi(t);
      if (son === null) {
        return { ok: false, xabar: 'Маошни млн сўмда ёзинг. Масалан: 4.5' };
      }
      return { ok: true, data: { maosh: BigInt(Math.round(son * 1_000_000)) } };
    }
    case 'orin': {
      const n = Number.parseInt(t.replace(/\D/g, ''), 10);
      if (!Number.isFinite(n) || n < 1 || n > 500) {
        return { ok: false, xabar: 'Ўрин сони 1 дан 500 гача бўлиши керак.' };
      }
      return { ok: true, data: { ornlarSoni: n } };
    }
    case 'talab':
      if (t.length < 10) return { ok: false, xabar: 'Талаблар жуда қисқа. Камида 10 та белги ёзинг.' };
      return { ok: true, data: { talablar: t.slice(0, 600) } };
    case 'jadval':
      if (t.length < 3) return { ok: false, xabar: 'Жадвални аниқроқ ёзинг.' };
      return { ok: true, data: { jadvali: t.slice(0, 200) } };
    case 'sharoit':
      if (t.length < 3) return { ok: false, xabar: 'Шароитларни аниқроқ ёзинг.' };
      return { ok: true, data: { sharoitlari: t.slice(0, 300) } };
  }
}

/**
 * Tahrir matnini qabul qiladi. `null` - bu suhbat emas.
 *
 * Qiymat qo'llanadi VA e'lon qayta moderatsiyaga o'tadi - bitta
 * yozuvda (atomar): oraliq holat yo'q, ya'ni "yangi maosh, eski
 * tasdiq" holati hech qachon paydo bo'lmaydi.
 */
export async function tahrirMatni(
  beruvchiId: string,
  matn: string,
  hozir = new Date()
): Promise<Javob | null> {
  const b = await prisma.ishBeruvchi.findUnique({
    where: { id: beruvchiId },
    select: { bosqich: true, suhbat: true, suhbatVaqti: true },
  });
  if (!b?.bosqich?.startsWith('t.')) return null;

  const tozala = () =>
    prisma.ishBeruvchi.update({
      where: { id: beruvchiId },
      data: { bosqich: null, suhbat: {}, suhbatVaqti: null },
    });

  if (!b.suhbatVaqti || hozir.getTime() - b.suhbatVaqti.getTime() > TAHRIR_MUDDATI_DAQIQA * 60_000) {
    await tozala();
    return null;
  }

  const maydon = b.bosqich.slice(2);
  const vacancyId = (b.suhbat as { vacancyId?: string } | null)?.vacancyId;
  if (!maydonmi(maydon) || !vacancyId) {
    await tozala();
    return null;
  }

  const q = tahrirQiymati(maydon, matn);
  if (!q.ok) return { matn: q.xabar, tugmalar: [{ yozuv: '✖️ Бекор қилиш', belgi: `${BERUVCHI.ELON_KOR}:${vacancyId}` }] };

  const n = await prisma.vacancy.updateMany({
    where: {
      id: vacancyId,
      ishBeruvchiId: beruvchiId,
      faol: true,
      moderatsiya: { in: ['TASDIQLANDI', 'KUTILMOQDA'] },
    },
    data: {
      ...q.data,
      moderatsiya: 'KUTILMOQDA',
      moderatsiyaQilganId: null,
      moderatsiyaSanasi: null,
      moderatsiyaSababi: null,
    },
  });
  await tozala();

  if (n.count === 0) {
    return {
      matn: 'Бу эълонни ҳозир таҳрирлаб бўлмайди (ёпилган ёки рад этилган).',
      tugmalar: [ROYXATGA],
    };
  }

  /* Rahbar yangi qiymatni ko'rishi uchun - qayta xabar */
  await elonniModeratsiyagaYubor(vacancyId, 'tahrir');

  return {
    matn: [
      '✅ <b>Сақланди</b>',
      '',
      'Эълон қайта кўриб чиқишга юборилди. Тасдиқлангунча ходимларга кўринмайди — натижа шу ерга келади.',
    ].join('\n'),
    tugmalar: [ROYXATGA],
  };
}

/* ── Muddati tugagan e'lon haqida xabar ── */

/**
 * Muddati tugab, hozir yopilgan e'lonlarning egalariga xabar yuboradi.
 *
 * ── Nega takror xabar bo'lmaydi ──
 *
 * `muddatiOtganlarniYop` e'lonni yopib `yopilganSana = hozir` yozadi.
 * Ikkinchi parallel chaqiriq hech narsani yopmaydi (shart `faol: true`),
 * ya'ni uning `hozir` qiymati bilan yozilgan qator yo'q va u hech kimga
 * xabar yubormaydi. Bir e'lon uchun xabar bir marta ketadi.
 *
 * Yuborish xatosi (Telegram o'chiq, ish beruvchi botni bloklagan) boshqa
 * e'lonlar xabariga xalaqit bermaydi.
 */
export async function muddatiTugaganlarniOgohlantir(hozir: Date): Promise<number> {
  const yopilgan = await prisma.vacancy.findMany({
    where: {
      yopilganSana: hozir,
      yopilishSababi: 'MUDDATI_TUGADI',
      ishBeruvchiId: { not: null },
    },
    select: {
      id: true,
      lavozim: true,
      ishBeruvchi: { select: { telegramChatId: true } },
    },
    take: 200,
  });

  let yuborildi = 0;
  for (const e of yopilgan) {
    const ok = await beruvchigaXabarBer(
      e.ishBeruvchi?.telegramChatId,
      [
        `⌛ <b>${xavfsiz(e.lavozim)}</b> эълонингизнинг муддати тугади ва ёпилди.`,
        '',
        'Ўрин ҳали бўш бўлса, эълонни очиб, «Қайта юбориш» тугмасини босинг.',
      ].join('\n'),
      [{ yozuv: '📋 Эълонни очиш', belgi: `${BERUVCHI.ELON_KOR}:${e.id}` }]
    );
    if (ok) yuborildi++;
  }
  return yuborildi;
}
