import type { Prisma } from '@prisma/client';
import type { Tranzaksiya } from './prisma';

/**
 * ============================================================
 *  ЭЪЛОННИНГ АМАЛ ҚИЛИШ МУДДАТИ
 *
 *  ── Нега керак бўлди ──
 *
 *  Эълонда фақат `faol` белгиси бор эди — ва у ФАҚАТ қўлда
 *  ўчирилса ўчарди. Амалда ҳеч ким келиб ўчирмасди.
 *
 *  Натижа: корхона фикридан қайтган, ўрин бошқа йўл билан
 *  тўлган — эълон эса рўйхатда турибди. Маҳалла ходими фуқарони
 *  ўша манзилга юборади, фуқаро бориб «бундай иш йўқ» деб
 *  қайтади. Бир марта шундай бўлса, фуқаро иккинчи марта
 *  ишонмайди.
 *
 *  Энди ҳар эълоннинг ОХИРИ бор.
 *
 *  ── Икки қатлам ҳимоя ──
 *
 *  1. ЎҚИШДА: рўйхат ва мослаштириш `FAOL_ELON` шартидан
 *     ўтади — муддати ўтгани ўша заҳоти кўринмай қолади,
 *     базада ҳали ёпилмаган бўлса ҳам.
 *
 *  2. ТОЗАЛАШДА: кунлик вазифа `muddatiOtganlarniYop` ни
 *     чақиради — база ҳам тартибга келади ва ёпилиш САБАБИ
 *     ёзилади.
 *
 *  Иккови ҳам бор, чунки биттаси етмайди: фақат тозалаш бўлса,
 *  кун давомида ўлган эълон кўриниб туради; фақат ўқиш шарти
 *  бўлса, база «фаол» деб ёлғон гапириб ётаверади.
 * ============================================================
 */

/** Янги эълон одатда шунча кун туради */
export const ODATIY_MUDDAT_KUN = 30;

/**
 * Ҳақиқатан кучда бўлган эълоннинг шарти.
 *
 * Муддати ЁЗИЛМАГАН эълон муддатсиз ҳисобланади — эски
 * эълонлар шу тоифага киради ва улар ўз-ўзидан йўқолиб
 * қолмайди.
 */
export function FAOL_ELON(hozir: Date = new Date()): Prisma.VacancyWhereInput {
  return {
    faol: true,
    OR: [{ amalQilishMuddati: null }, { amalQilishMuddati: { gte: hozir } }],
  };
}

/** Бу эълон ҳозир кучдами */
export function elonKuchdami(
  e: { faol: boolean; amalQilishMuddati: Date | null },
  hozir: Date = new Date()
): boolean {
  if (!e.faol) return false;
  return e.amalQilishMuddati === null || e.amalQilishMuddati.getTime() >= hozir.getTime();
}

/**
 * Муддати ўтган-у ҳали ёпилмаган эълонлар.
 *
 * Базада `faol = true` бўлиб турганлари. Ўқиш шарти уларни
 * аллақачон яширган, бу эса ёзувни ҳам тартибга келтиради.
 */
export function MUDDATI_OTGAN(hozir: Date = new Date()): Prisma.VacancyWhereInput {
  return { faol: true, amalQilishMuddati: { lt: hozir } };
}

/**
 * Неча кун қолгани. Манфий — ўтиб кетган, `null` — муддатсиз.
 *
 * Кун бошига келтирилади: «бугун тугайди» деганда соат
 * аҳамиятсиз, ходимга «0 кун» деб кўрсатилиши керак.
 */
export function qolganKun(muddat: Date | null, hozir: Date = new Date()): number | null {
  if (!muddat) return null;
  const KUN = 24 * 60 * 60 * 1000;
  const a = Math.floor(muddat.getTime() / KUN);
  const b = Math.floor(hozir.getTime() / KUN);
  return a - b;
}

/** Янги эълон учун одатий муддат — бугундан бир ой */
export function odatiyMuddat(hozir: Date = new Date()): Date {
  const d = new Date(hozir);
  d.setDate(d.getDate() + ODATIY_MUDDAT_KUN);
  return d;
}

/**
 * Муддати ўтганларни ёпади.
 *
 * @returns нечта эълон ёпилди
 */
export async function muddatiOtganlarniYop(
  db: Tranzaksiya,
  hozir: Date = new Date()
): Promise<number> {
  const natija = await db.vacancy.updateMany({
    where: MUDDATI_OTGAN(hozir),
    data: { faol: false, yopilishSababi: 'MUDDATI_TUGADI', yopilganSana: hozir },
  });
  return natija.count;
}
