import { xomPrisma, type Tranzaksiya } from './prisma';
import type { Rol } from '@prisma/client';

/**
 * ============================================================
 *  ARXIVLASH — XATLOV VA FUQARO
 *
 *  ── Nega o'chirish emas ──
 *
 *  `ActionPlan` va `HouseholdKesma` da `onDelete: Cascade`
 *  turibdi. Haqiqiy o'chirish xonadon bilan birga uning
 *  topshiriqlarini va butun tarixini ham jimgina yo'q qilardi —
 *  va buni hech narsa qaytara olmasdi.
 *
 *  72 ta xodim ishlaydigan tizimda bitta noto'g'ri bosish
 *  shunday oqibatga olib kelishi mumkin emas.
 *
 *  Arxivdagi yozuv hech qayerda ko'rinmaydi (buni `prisma.ts`
 *  dagi filtr ta'minlaydi), lekin administrator uni qaytara
 *  oladi.
 *
 *  ── Nega sabab majburiy ──
 *
 *  Sababsiz arxivlash "shunchaki bosdim" ga aylanadi. Sabab
 *  yozish odamni bir soniya to'xtatadi — va keyinchalik
 *  "nega bu xonadon yo'q?" degan savolga javob qoldiradi.
 * ============================================================
 */

/** Sabab kamida shuncha belgidan iborat bo'lsin */
export const SABAB_ENG_KAM = 10;

export type ArxivNatijasi =
  | { ok: true; ishsizlar: number; topshiriqlar: number }
  | { ok: false; xabar: string; kod: 403 | 404 | 400 };

/**
 * Xodim shu xatlovni arxivga ola oladimi.
 *
 * Qoidalar ATAYLAB qattiq:
 *   · hokim umuman tegmaydi — uning roli "ko'radi, o'zgartirmaydi";
 *   · mahalla xodimi faqat O'Z mahallasini va faqat tasdiqlanmaganini;
 *   · bandlik markazi va administrator — hammasini.
 *
 * Tasdiqlangan xatlov mahalla xodimi uchun yopiq, chunki u
 * bandlik markazining ish rejasiga кирган: unga topshiriq
 * belgilangan, fuqaro suhbatga chaqirilgan bo'lishi mumkin.
 */
export function arxivgaRuxsat(
  rol: Rol,
  sessiyaMahallaId: string | null | undefined,
  yozuv: { mahallaId: string; holati?: string }
): { ok: true } | { ok: false; xabar: string } {
  if (rol === 'HOKIM') {
    return { ok: false, xabar: 'Ҳоким панели фақат кўриш учун — ёзувни архивга олиб бўлмайди.' };
  }
  if (rol === 'YETTILIK') {
    if (sessiyaMahallaId !== yozuv.mahallaId) {
      return { ok: false, xabar: 'Бу ёзув сизнинг маҳаллангизга тегишли эмас.' };
    }
    if (yozuv.holati === 'TASDIQLANGAN') {
      return {
        ok: false,
        xabar:
          'Бу хатлов бандлик маркази томонидан тасдиқланган. Уни архивга олиш учун бандлик марказига мурожаат қилинг.',
      };
    }
  }
  return { ok: true };
}

/**
 * Xonadonni arxivga oladi — u bilan birga fuqarolarini ham.
 *
 * Nima bo'ladi:
 *   1. Xonadon arxivga tushadi va hech qayerda ko'rinmaydi.
 *   2. Undagi ishsiz fuqarolar ham arxivga tushadi — ular shu
 *      xatlovda aniqlangan edi.
 *   3. Bog'langan topshiriqlar BEKOR QILINADI. O'chirilmaydi:
 *      hokim "nega bu topshiriq yo'qoldi" deb so'raganda javob
 *      qolsin.
 *   4. `takrorKaliti` bo'shatiladi — shu xonadonni QAYTA
 *      xatlovdan o'tkazish mumkin bo'lsin. Aks holda arxivdagi
 *      yozuv unikal ўринни band qilib турарди ва янги хатлов
 *      409 билан рад этиларди.
 */
export async function xonadonniArxivla(
  tx: Tranzaksiya,
  householdId: string,
  xodimId: string,
  sabab: string
): Promise<{ ishsizlar: number; topshiriqlar: number }> {
  const hozir = new Date();

  const mavjud = await tx.household.findUnique({
    where: { id: householdId },
    select: { takrorKaliti: true },
  });

  await tx.household.update({
    where: { id: householdId },
    data: {
      arxivSanasi: hozir,
      arxivchiId: xodimId,
      arxivSababi: sabab,
      /*
       * Калит «arxiv:» олди қўшимчаси билан белгиланади: у
       * ноёблик чекловини бузмайди, лекин ўша манзил ва оила
       * бошлиғи бўйича ЯНГИ хатлов киритиш мумкин бўлади.
       */
      ...(mavjud?.takrorKaliti && !mavjud.takrorKaliti.startsWith('arxiv:')
        ? { takrorKaliti: `arxiv:${hozir.getTime()}:${mavjud.takrorKaliti}`.slice(0, 200) }
        : {}),
    },
  });

  const ishsizlar = await tx.unemployedPerson.updateMany({
    where: { householdId, arxivSanasi: null },
    data: { arxivSanasi: hozir, arxivchiId: xodimId, arxivSababi: sabab },
  });

  const topshiriqlar = await tx.actionPlan.updateMany({
    where: { householdId, holati: { in: ['KUTILMOQDA', 'BAJARILMOQDA', 'KECHIKDI'] } },
    data: {
      holati: 'BEKOR_QILINDI',
      natijaIzohi: `Хатлов архивга олинди: ${sabab}`,
      bajarilganSana: hozir,
    },
  });

  return { ishsizlar: ishsizlar.count, topshiriqlar: topshiriqlar.count };
}

/** Bitta fuqaroni arxivga oladi — xonadon joyida qoladi */
export async function fuqaroniArxivla(
  tx: Tranzaksiya,
  ishsizId: string,
  xodimId: string,
  sabab: string
): Promise<{ topshiriqlar: number }> {
  const hozir = new Date();

  await tx.unemployedPerson.update({
    where: { id: ishsizId },
    data: { arxivSanasi: hozir, arxivchiId: xodimId, arxivSababi: sabab },
  });

  const topshiriqlar = await tx.actionPlan.updateMany({
    where: { ishsizId, holati: { in: ['KUTILMOQDA', 'BAJARILMOQDA', 'KECHIKDI'] } },
    data: {
      holati: 'BEKOR_QILINDI',
      natijaIzohi: `Фуқаро архивга олинди: ${sabab}`,
      bajarilganSana: hozir,
    },
  });

  return { topshiriqlar: topshiriqlar.count };
}

/**
 * Arxivdan qaytaradi.
 *
 * `xomPrisma` ishlatiladi — oddiy mijoz arxivdagini umuman
 * ko'rmaydi, demak uni yangilay ham olmaydi.
 *
 * Bekor qilingan topshiriqlar QAYTARILMAYDI: ular orada
 * boshqacha hal qilingan bo'lishi mumkin. Kerak bo'lsa yangisi
 * yaratiladi — zanjir buni o'zi qiladi.
 */
export async function xonadonniQaytar(householdId: string): Promise<{ ishsizlar: number }> {
  const x = await xomPrisma.household.findUnique({
    where: { id: householdId },
    select: { takrorKaliti: true, arxivSanasi: true },
  });
  if (!x?.arxivSanasi) return { ishsizlar: 0 };

  /* «arxiv:<vaqt>:» олди қўшимчасини олиб ташлаймиз */
  const asl = x.takrorKaliti.startsWith('arxiv:')
    ? x.takrorKaliti.split(':').slice(2).join(':')
    : x.takrorKaliti;

  await xomPrisma.household.update({
    where: { id: householdId },
    data: { arxivSanasi: null, arxivchiId: null, arxivSababi: null, takrorKaliti: asl },
  });

  const ishsizlar = await xomPrisma.unemployedPerson.updateMany({
    where: { householdId, arxivSanasi: { not: null } },
    data: { arxivSanasi: null, arxivchiId: null, arxivSababi: null },
  });

  return { ishsizlar: ishsizlar.count };
}

/** Bitta fuqaroni arxivdan qaytaradi */
export async function fuqaroniQaytar(ishsizId: string): Promise<void> {
  await xomPrisma.unemployedPerson.update({
    where: { id: ishsizId },
    data: { arxivSanasi: null, arxivchiId: null, arxivSababi: null },
  });
}
