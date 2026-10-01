import { prisma } from './prisma';
import { xabarQoshish, xavfsiz, type YangiXabar } from './xabarnoma';
import { muddatHolati } from './murojaatlar';

/**
 * ============================================================
 *  MUROJAAT MUDDATI HAQIDA TELEGRAM XABARI
 *
 *  Murojaatning javob muddati yaqinlashsa yoki o'tsa, kirmasa ham
 *  xodim bilsin: masul xodimga "muddat bugun/ertaga", muddat o'tgach
 *  masul xodimga VA bandlik rahbarlariga (eskalatsiya).
 *
 *  Hozirgacha muddat faqat "Vazifalarim" taxtasida ko'rinardi: xodim
 *  taxtani ochmasa, hech kim bilmasdi. Xodim bir oy kirmasa ham rahbar
 *  Telegram'da ogohlantirish oladi.
 *
 *  ── Qoidalar ──
 *
 *   · BIR MUDDAT UCHUN BIR MARTA: kalit `muddat-<tur>:<muddat kuni>`.
 *     Muddat uzaytirilsa kalit o'zgaradi (yangi muddat - yangi ogohlantirish);
 *     bir xil muddat uchun qayta ishga tushirish xabarni takrorlamaydi.
 *   · BIR VAQTDA IKKI ISHGA TUSHISH (cron + qo'lda tugma) takror xabar
 *     YARATMAYDI: tranzaksiya ichida advisory qulf; qulf band bo'lsa
 *     ikkinchisi o'tkazib yuboriladi.
 *   · Xabar navbatga QO'YILADI (yuborilishi navbat mantiqiga tegishli:
 *     Telegram ishlamasa navbatda qoladi, 3 urinishdan keyin xato).
 *   · Xabarda SHAXSIY MA'LUMOT YO'Q: murojaatchi ismi, telefoni, matni
 *     chiqmaydi - faqat raqam, mahalla, muddat va masul xodim ismi.
 *   · Eski ko'p kechikkan murojaatlar xabar toshqinini keltirmasin:
 *     MAKS_KECHIKISH_KUNI dan eskilar xabarga kirmaydi (taxtada ko'rinadi),
 *     bir ishga tushishda eng ko'pi MAKS_XABAR.
 * ============================================================
 */

/** Shu kundan ortiq kechikkanlar haqida xabar yuborilmaydi (taxtada ko'rinadi) */
export const MAKS_KECHIKISH_KUNI = 30;
/** Bir ishga tushishda eng ko'p yaratiladigan xabar */
export const MAKS_XABAR = 100;

export type MuddatTuri = 'yaqin' | 'kechikkan';

export interface MuddatMurojaati {
  id: string;
  raqami: string;
  holati: 'YANGI' | 'JARAYONDA' | 'JAVOB_BERILDI' | 'YOPILDI';
  javobMuddati: Date;
  mahallaNomi: string;
  masulId: string;
  masulIsmi: string;
  masulFaol: boolean;
}

export interface Qabul {
  userId: string;
  faol: boolean;
}

/** Toshkent kuni (YYYY-MM-DD) */
function toshkentKuni(d: Date): string {
  return new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 10);
}

const kunMatni = (kun: string) => kun.split('-').reverse().join('.');

/** Kalit: bir muddat uchun bir marta */
export function xabarKaliti(tur: MuddatTuri, javobMuddati: Date): string {
  return `muddat-${tur}:${toshkentKuni(javobMuddati)}`;
}

export function xabarMatni(
  tur: MuddatTuri,
  m: Pick<MuddatMurojaati, 'raqami' | 'mahallaNomi' | 'javobMuddati' | 'masulIsmi'>,
  kun: number,
  rahbarmi: boolean
): string {
  const sana = kunMatni(toshkentKuni(m.javobMuddati));
  if (tur === 'yaqin') {
    return (
      `<b>Мурожаат жавоб муддати яқин</b>\n` +
      `№ ${xavfsiz(m.raqami)} · ${xavfsiz(m.mahallaNomi)}\n` +
      `Муддат: ${kun === 0 ? 'бугун' : 'эртага'} (${sana}).\n` +
      `Иловада очиб жавоб беринг ёки муддатни сабаб билан суринг.`
    );
  }
  return (
    `<b>Мурожаат жавоб муддати ЎТДИ</b>\n` +
    `№ ${xavfsiz(m.raqami)} · ${xavfsiz(m.mahallaNomi)}\n` +
    `Муддат ${sana} эди — ${kun} кун кечикди.\n` +
    (rahbarmi ? `Масъул: ${xavfsiz(m.masulIsmi)}.\n` : '') +
    `Мурожаатчи жавоб кутяпти: иловада очинг.`
  );
}

/**
 * Sof hisob: qaysi xabarlar kerak. DB'ga tegmaydi.
 *
 * @param mavjud   allaqachon yaratilgan kalitlar: `${userId}|${murojaatId}|${kalit}`
 * @param rahbarlar faol bandlik rahbarlari (muddat o'tganda xabar oladi)
 */
export function xabarRejasi(
  murojaatlar: MuddatMurojaati[],
  rahbarlar: Qabul[],
  mavjud: ReadonlySet<string>,
  hozir: Date
): YangiXabar[] {
  const chiqdi: { x: YangiXabar; tartib: number }[] = [];

  for (const m of murojaatlar) {
    if (m.holati !== 'YANGI' && m.holati !== 'JARAYONDA') continue;
    const h = muddatHolati(m, hozir);
    let tur: MuddatTuri | null = null;
    let kun = 0;
    if (h.holat === 'BUGUN') {
      tur = 'yaqin';
      kun = 0;
    } else if (h.holat === 'YAQIN' && h.kun === 1) {
      tur = 'yaqin';
      kun = 1;
    } else if (h.holat === 'KECHIKKAN' && h.kun >= 1 && h.kun <= MAKS_KECHIKISH_KUNI) {
      tur = 'kechikkan';
      kun = h.kun;
    }
    if (!tur) continue;

    const kalit = xabarKaliti(tur, m.javobMuddati);
    const kimlar = new Map<string, boolean>(); // userId -> rahbarmi
    if (m.masulFaol) kimlar.set(m.masulId, false);
    if (tur === 'kechikkan') {
      for (const r of rahbarlar) if (r.faol) kimlar.set(r.userId, true);
    }

    for (const [userId, rahbarmi] of Array.from(kimlar.entries())) {
      /* Masul o'zi rahbar bo'lsa: bitta xabar (masul matni, "masul" qatori keraksiz) */
      const rahbarMatni = rahbarmi && userId !== m.masulId;
      if (mavjud.has(`${userId}|${m.id}|${kalit}`)) continue;
      chiqdi.push({
        /* Eng kechikkani birinchi: chegaradan oshsa eng muhimlari qoladi */
        tartib: tur === 'kechikkan' ? -kun : 1000 + kun,
        x: {
          userId,
          turi: 'MUROJAAT_MUDDATI',
          matn: xabarMatni(tur, m, kun, rahbarMatni),
          bogliqTuri: kalit,
          bogliqId: m.id,
        },
      });
    }
  }

  chiqdi.sort((a, b) => a.tartib - b.tartib);
  return chiqdi.slice(0, MAKS_XABAR).map((c) => c.x);
}

/** Advisory qulf kaliti (hashtext) — bir vaqtda faqat bitta ishga tushish */
const QULF_NOMI = 'murojaat-muddati-xabari';

export interface MuddatXabariNatijasi {
  yaratildi: number;
  /** Qulf band edi: boshqa ishga tushish davom etmoqda */
  otkazildi: boolean;
}

/**
 * Muddati yaqin/o'tgan ochiq murojaatlar uchun xabarlarni navbatga qo'yadi.
 * Xato tashlashi mumkin - chaqiruvchi (cron) uni yutadi va navbatni baribir yuboradi.
 */
export async function murojaatMuddatiXabarlari(hozir = new Date()): Promise<MuddatXabariNatijasi> {
  return prisma.$transaction(
    async (tx) => {
      const q = await tx.$queryRaw<{ olindi: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${QULF_NOMI})) AS olindi`;
      if (!q[0]?.olindi) return { yaratildi: 0, otkazildi: true };

      /* Bazadan faqat muddati "yaqin kelajak"dan o'tmishgacha (MAKS_KECHIKISH_KUNI) bo'lganlar */
      const nomzodlar = await tx.murojaat.findMany({
        where: {
          holati: { in: ['YANGI', 'JARAYONDA'] },
          javobMuddati: {
            gte: new Date(hozir.getTime() - (MAKS_KECHIKISH_KUNI + 2) * 86400_000),
            lt: new Date(hozir.getTime() + 3 * 86400_000),
          },
        },
        orderBy: { javobMuddati: 'asc' },
        take: 500,
        select: {
          id: true,
          raqami: true,
          holati: true,
          javobMuddati: true,
          mahalla: { select: { nomiKirill: true } },
          masul: { select: { id: true, fullName: true, faol: true } },
        },
      });
      if (nomzodlar.length === 0) return { yaratildi: 0, otkazildi: false };

      const rahbarlar = await tx.user.findMany({
        where: { rol: 'BANDLIK_RAHBAR', faol: true },
        select: { id: true },
        take: 50,
      });

      const mur: MuddatMurojaati[] = nomzodlar.map((n) => ({
        id: n.id,
        raqami: n.raqami,
        holati: n.holati,
        javobMuddati: n.javobMuddati,
        mahallaNomi: n.mahalla.nomiKirill,
        masulId: n.masul.id,
        masulIsmi: n.masul.fullName,
        masulFaol: n.masul.faol,
      }));

      const mavjudQator = await tx.xabarnoma.findMany({
        where: { turi: 'MUROJAAT_MUDDATI', bogliqId: { in: mur.map((x) => x.id) } },
        select: { userId: true, bogliqId: true, bogliqTuri: true },
      });
      const mavjud = new Set(mavjudQator.map((x) => `${x.userId}|${x.bogliqId}|${x.bogliqTuri}`));

      const reja = xabarRejasi(
        mur,
        rahbarlar.map((r) => ({ userId: r.id, faol: true })),
        mavjud,
        hozir
      );
      const yaratildi = await xabarQoshish(reja, tx);
      return { yaratildi, otkazildi: false };
    },
    { timeout: 20_000 }
  );
}

