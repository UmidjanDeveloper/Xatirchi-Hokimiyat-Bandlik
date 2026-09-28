import type { IshsizHolati, Rol } from '@prisma/client';
import type { prisma } from './prisma';
import { mahallagaRuxsat } from './auth';

/**
 * `$transaction` ичига бериладиган мижоз тури.
 *
 * `Prisma.TransactionClient` ЁЗИЛМАЙДИ: лойиҳадаги мижоз
 * кенгайтирилган ва иккита тур бир-бирига мос келмайди.
 * Турни мижознинг ЎЗИДАН оламиз — шунда у кенгайтма
 * ўзгарганда ҳам эргашади.
 */
type Tranzaksiya = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
import { elonKuchdami } from './elon-muddati';
import { mustahkamlashChorasi } from './chora-yaratish';

/**
 * ============================================================
 *  ЖОЙЛАШТИРИШ ҲИСОБИ
 *
 *  Банд ўринлар сони АЛОҲИДА ҲИСОБЛАГИЧДА САҚЛАНМАЙДИ — у ҳар
 *  сафар боғланишлардан саналади.
 *
 *  Сабаби: ҳисоблагич эртами-кечми ҳақиқатдан четга чиқади.
 *  Жойлаштириш бекор қилинганда камайтириш унутилса ёки иккита
 *  мутахассис бир вақтда жойлаштирса, эълонда «0 ўрин қолди»
 *  деб турарди-ю, аслида ҳеч ким ишламаётган бўларди. Санаш
 *  бироз қимматроқ, лекин ҲАР ДОИМ тўғри.
 * ============================================================
 */

/** Ўринни БАНД қиладиган ҳолатлар */
export const BAND_HOLATLAR: IshsizHolati[] = ['JOYLASHTIRILDI', 'TASDIQLANDI'];

export interface OrinHisobi {
  jami: number;
  band: number;
  qolgan: number;
  toldimi: boolean;
}

export function orinHisobi(ornlarSoni: number, band: number): OrinHisobi {
  const qolgan = Math.max(0, ornlarSoni - band);
  return { jami: ornlarSoni, band, qolgan, toldimi: qolgan === 0 };
}

/**
 * Жойлаштириш бекор қилинганда фуқаро қайси ҳолатга қайтади.
 *
 * Орқага бир қадам: таклиф берилган эди — «таклиф берилди» га,
 * фақат суҳбат бўлган эди — «суҳбат ўтказилди» га. Бирданига
 * «аниқланди» га тушириш иш тарихини ўчириб юборарди.
 */
export function bekorQilingandagiHolat(p: {
  takliflar: string[];
  suhbatSanasi: Date | null;
}): IshsizHolati {
  if (p.takliflar.length > 0) return 'TAKLIF_BERILDI';
  if (p.suhbatSanasi) return 'SUHBAT_OTKAZILDI';
  return 'ANIQLANDI';
}

/**
 * ============================================================
 *  ЖОЙЛАШТИРИШ АМАЛИ — БИТТА МАНБА
 *
 *  Занжирга ИККИ томондан кирилади:
 *
 *    · бандлик мутахассиси иловадан жойлаштиради
 *    · марказ Telegram'дан келган «иш топдим» хабарини
 *      тасдиқлайди
 *
 *  Мантиқ иккита жойда ёзилса, бири ўзгарганда иккинчиси
 *  эскириб қоларди — ва фарқни фақат ҳисобот рақамлари
 *  бузилганда сезардик. Шунинг учун у ШУ ЕРДА, битта
 *  функцияда.
 *
 *  Чақирувчи ЎЗ транзакциясини беради: иккала йўлда ҳам
 *  атрофда бошқа ёзувлар бор ва улар биргаликда бажарилиши
 *  керак.
 * ============================================================
 */
export async function joylashtirishAmali(
  tx: Tranzaksiya,
  p: {
    orinId: string;
    ishsizId: string;
    ishgaKirganSana?: Date | null;
    /** Ким жойлаштиряпти — ҳуқуқ ва «ким киритди» учун */
    kim: { userId: string; rol: Rol; mahallaId: string | null };
  }
) {
    const orin = await tx.vacancy.findUnique({
      where: { id: p.orinId },
      select: {
        id: true,
        mahallaId: true,
        faol: true,
        amalQilishMuddati: true,
        ornlarSoni: true,
        korxonaNomi: true,
        lavozim: true,
      },
    });
    if (!orin) return { xato: 'Эълон топилмади', kod: 404 } as const;
    if (!mahallagaRuxsat(p.kim, orin.mahallaId)) {
      return { xato: 'Бу маҳаллага ҳуқуқингиз йўқ', kod: 403 } as const;
    }
    if (!orin.faol) {
      return { xato: 'Эълон ёпилган — жойлаштириб бўлмайди', kod: 409 } as const;
    }
    /*
     * Муддати ўтган эълон базада ҳали `faol` бўлиши мумкин:
     * кунлик тозалаш ҳали ишламаган. Одамни ўша ерга
     * юбормаймиз — корхона аллақачон воз кечган бўлиши
     * мумкин, фуқаро эса бекорга бориб қайтарди.
     */
    if (!elonKuchdami(orin)) {
      return {
        xato: 'Эълоннинг амал қилиш муддати тугаган. Муддатини узайтиринг ёки корхона билан боғланинг.',
        kod: 409,
      } as const;
    }

    const odam = await tx.unemployedPerson.findUnique({
      where: { id: p.ishsizId },
      select: {
        id: true,
        fish: true,
        mahallaId: true,
        holati: true,
        vacancyId: true,
        householdId: true,
      },
    });
    if (!odam) return { xato: 'Фуқаро топилмади', kod: 404 } as const;
    if (!mahallagaRuxsat(p.kim, odam.mahallaId)) {
      return { xato: 'Бу фуқарога ҳуқуқингиз йўқ', kod: 403 } as const;
    }
    if (odam.vacancyId === orin.id) {
      return { ok: true, allaqachon: true } as const;
    }
    if (odam.vacancyId) {
      return {
        xato: 'Фуқаро аллақачон бошқа эълонга жойлаштирилган. Аввал ўшани бекор қилинг.',
        kod: 409,
      } as const;
    }

    const band = await tx.unemployedPerson.count({
      where: { vacancyId: orin.id, holati: { in: BAND_HOLATLAR } },
    });
    if (band >= orin.ornlarSoni) {
      return { xato: 'Бўш ўрин қолмади', kod: 409 } as const;
    }

    await tx.unemployedPerson.update({
      where: { id: odam.id },
      data: {
        vacancyId: orin.id,
        // Иш жойи ва лавозим эълондан КЎЧИРИЛАДИ: қўлда терилса,
        // бир корхона беш хил ёзилиб, ҳисобот бўлиниб кетарди.
        ishJoyi: orin.korxonaNomi,
        ishLavozimi: orin.lavozim,
        ishgaKirganSana: p.ishgaKirganSana ?? new Date(),
        radSababi: null,
        // TASDIQLANDI — якуний натижа, орқага қайтмайди
        holati: odam.holati === 'TASDIQLANDI' ? 'TASDIQLANDI' : 'JOYLASHTIRILDI',
        ...(odam.holati === 'ANIQLANDI'
          ? { suhbatSanasi: new Date(), mutaxassisId: p.kim.userId }
          : {}),
      },
    });

    // Ўрин тўлдими — шу ернинг ўзида ёпамиз. Кейинги сўровга
    // қолдирилса, эълон бир муддат «бўш» бўлиб турарди.
    const toldi = band + 1 >= orin.ornlarSoni;
    if (toldi) {
      await tx.vacancy.update({
        where: { id: orin.id },
        data: { faol: false, yopilishSababi: 'TOLDI', yopilganSana: new Date() },
      });
    }

    /*
     * ── ЗАНЖИРНИНГ ОХИРГИ ҲАЛҚАСИ ──
     *
     * Схемада «3 ойдан кейин текширилади» деб ёзилган эди,
     * аммо у фақат ҚЎЛДА белгиланарди — яъни биров эслаб
     * қолиши керак эди. Ҳеч ким эсламади ва одамлар
     * тўртинчи ойдан бери «жойлаштирилди» да ётаверди.
     *
     * Энди жойлаштиришнинг ЎЗИ текширув топшириғини
     * туғдиради. Муддат ўтса — кечиккан топшириқлар
     * қаторига тушади ва ҳокимнинг панелида қизил кўринади.
     *
     * Такрор яратилмайди: муаммо матни бўйича танилади.
     */
    const kirganSana = p.ishgaKirganSana ?? new Date();
    const mustahkamlash = mustahkamlashChorasi({
      ishsizId: odam.id,
      householdId: odam.householdId,
      fish: odam.fish,
      ishJoyi: orin.korxonaNomi,
      ishgaKirganSana: kirganSana,
    });
    const borTopshiriq = await tx.actionPlan.findFirst({
      where: { ishsizId: odam.id, muammo: mustahkamlash.muammo },
      select: { id: true },
    });
    if (!borTopshiriq) {
      await tx.actionPlan.create({
        data: { ...mustahkamlash, yaratganId: p.kim.userId },
      });
    }

    return { ok: true, fish: odam.fish, toldi, qolgan: orin.ornlarSoni - band - 1 } as const;
}
