/**
 * ============================================================
 *  ПАНЕЛ ҚАМРОВИ — «туман бўйичами ёки битта МФЙ бўйича»
 *
 *  Ҳоким, бандлик раҳбари ва администратор панели иккита
 *  саволга жавоб беради ва улар БИР ХИЛ панелда туради:
 *
 *    «Туманда аҳвол қандай?»          → қамров = туман
 *    «Уйшунда аҳвол қандай?»          → қамров = Уйшун МФЙ
 *
 *  Илгари фақат биринчиси бор эди. Йиғилишда «Уйшунда нима
 *  гап» деган савол чиқса, ҳоким ҳисобот юклаб, PDF ни очиб
 *  ўқиши керак эди — панелнинг ўзида битта МФЙ кесими йўқ эди.
 *
 *  Энди танлов URL да турибди (`?mfy=...`): ҳоким ҳаволани
 *  раҳбарга юборса, раҳбар АЙНАН ўша МФЙ ни очади.
 *
 *  ── Хавфсизлик ──
 *
 *  Танлов ФАҚАТ маҳаллага бириктирилмаган фойдаланувчида
 *  ишлайди. Маҳалла ходимининг сессиясида `mahallaId` турибди
 *  ва у ҳар қандай `?mfy=` га қарамай ЎЗГАРМАЙДИ — акс ҳолда
 *  ходим манзил қаторини таҳрирлаб қўшни МФЙ маълумотини
 *  очарди. Шунинг учун сўровни шу ердан бошқа жой ҳал
 *  қилмайди: саҳифа `panelQamroviniOl()` берган `mahallaId`
 *  дан бошқасини ишлатмайди.
 * ============================================================
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mahallaFiltri, type Sessiya } from '@/lib/auth';

/** Туман бўйича кесим танланганда URL да турадиган қиймат */
export const BUTUN_TUMAN = 'hammasi';

/** Туманнинг ўзининг номи — қамров туман бўлганда ишлатилади */
export const TUMAN_NOMI = 'Хатирчи тумани';

export interface PanelQamrovi {
  /**
   * Танланган МФЙ — бутун туман бўлса `undefined`.
   *
   * `null` эмас, айнан `undefined`: сўров ёрдамчиларининг
   * ҳаммаси (`tahlilOl`, `bolimlarTahlili`, `xaritaMalumoti`,
   * `vaucherHisobi`) `string | undefined` қабул қилади ва бу
   * қиймат тўғридан-тўғри уларга берилади. Аралаш турда ҳар
   * чақирувда `?? undefined` ёзиш керак бўларди — ва битта
   * жойда унутилса, TypeScript эмас, фойдаланувчи топарди.
   */
  mahallaId?: string;
  /** Экранда, ҳисоботда ва AI да ишлатиладиган ном (кириллда) */
  nomi: string;
  /** Фойдаланувчи ҳудудни алмаштира оладими */
  tanlashMumkin: boolean;
  /**
   * Танлаш учун рўйхат.
   *
   * Бу рўйхат ҳисобот тугмалари учун ҳам керак, шунинг учун
   * алоҳида сўров юборилмайди — биттаси иккисига хизмат қилади.
   */
  mahallalar: { id: string; nomiKirill: string }[];
}

/**
 * URL даги `?mfy=` ни ХАВФСИЗ ҳудудга айлантиради.
 *
 * Номаълум ёки ўчирилган id берилса — хато эмас, туман кесими
 * қайтади. Сабаби амалий: ҳоким эски ҳаволани очиши мумкин ва
 * унга 404 эмас, ишлайдиган панел керак.
 */
export async function panelQamroviniOl(
  sessiya: Sessiya,
  mfy?: string | null
): Promise<PanelQamrovi> {
  const majburiy = mahallaFiltri(sessiya).mahallaId;

  /* ── Маҳаллага бириктирилган ходим: танлов йўқ ── */
  if (majburiy) {
    const m = await prisma.mahalla.findUnique({
      where: { id: majburiy },
      select: { nomiKirill: true },
    });
    return {
      mahallaId: majburiy,
      nomi: m?.nomiKirill ?? TUMAN_NOMI,
      tanlashMumkin: false,
      mahallalar: [],
    };
  }

  const mahallalar = await prisma.mahalla.findMany({
    orderBy: { nomi: 'asc' },
    select: { id: true, nomiKirill: true },
  });

  const soralgan = mfy?.trim();
  if (soralgan && soralgan !== BUTUN_TUMAN) {
    const topildi = mahallalar.find((m) => m.id === soralgan);
    if (topildi) {
      return {
        mahallaId: topildi.id,
        nomi: topildi.nomiKirill,
        tanlashMumkin: true,
        mahallalar,
      };
    }
  }

  return { nomi: TUMAN_NOMI, tanlashMumkin: true, mahallalar };
}

/**
 * Чора-тадбирни МФЙ бўйича чегаралаш шарти.
 *
 * Топшириқ маҳаллага БЕВОСИТА боғланмаган: у хонадон ёки ишсиз
 * фуқаро орқали боғланган ва иккисидан бири бўш бўлиши мумкин
 * (масалан «мактабгача таълим» топшириғи хонадонга, «касб
 * ўргатиш» эса фуқарога ёзилади). Шунинг учун шарт ИККАЛА йўл
 * бўйича ёзилади.
 *
 * Бу қоида иккита саҳифада керак — «Чора-тадбирлар» ва
 * «Бошқарув» — шунинг учун шу ерда, битта жойда. Иккита нусха
 * бўлганда бири фақат хонадон бўйича фильтрлаб қоларди ва
 * фуқарога ёзилган топшириқлар МФЙ кесимидан тушиб кетарди.
 */
export function topshiriqQamrovi(mahallaId?: string): Prisma.ActionPlanWhereInput {
  if (!mahallaId) return {};
  return {
    OR: [{ household: { mahallaId } }, { ishsiz: { mahallaId } }],
  };
}
