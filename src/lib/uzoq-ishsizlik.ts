import type { Prisma, IshsizHolati } from '@prisma/client';

/**
 * ============================================================
 *  УЗОҚ МУДДАТЛИ ИШСИЗЛИК
 *
 *  ── Нега алоҳида ажратилди ──
 *
 *  Икки ой олдин ишдан чиққан одам билан тўрт йилдан бери иш
 *  тополмаётган одам рўйхатда БИР ХИЛ кўринарди: иккови ҳам
 *  «ишсиз». Ҳолбуки уларга бир хил чора ярамайди.
 *
 *  Икки ойлик ишсизга эълон кўрсатиш кифоя — у ўзи топади.
 *  Тўрт йиллик ишсизга эса эълон бермайди: малакаси эскирган,
 *  ишончи сўнган, кўпинча соғлиғи ёки оиласи тўсади. Унга
 *  қайта ўқитиш, субсидия, баъзан шунчаки биров билан гаплашиш
 *  керак.
 *
 *  Халқаро амалиётда 12 ойдан ошган ишсизлик «узоқ муддатли»
 *  деб аталади ва айнан шу гуруҳ энг заиф ҳисобланади: улар
 *  ўз-ўзидан ишга жойлашиш эҳтимоли энг паст гуруҳ. Шунинг
 *  учун улар алоҳида кўринади ва биринчи навбатда чақирилади.
 *
 *  ── Муддат қаердан олинади ──
 *
 *  Иккита манба бор ва улар тенг эмас:
 *
 *  1. Фуқаронинг ЎЗИДАГИ `ishdanBoshaganSana` — аниқ сана,
 *     шахсий анкетадан. Устунроқ.
 *  2. Хонадондаги `ishsizlikMuddatiOy` — хатлов вақтида
 *     хонадон бўйича айтилган ЭНГ УЗУН муддат. Тахминий,
 *     шунинг учун фақат биринчиси бўлмаганда ишлатилади.
 *
 *  Иккови ҳам бўлмаса — муддат номаълум. Бундай одам узоқ
 *  муддатли деб белгиланмайди: тахмин билан одамга тамға
 *  босилмайди.
 * ============================================================
 */

/** Шу ойдан ошса — узоқ муддатли ишсизлик */
export const UZOQ_CHEGARA_OY = 12;

/** Ҳали ишга жойлашмаган — воронканинг биринчи уч бosqичи */
export const HALI_ISHSIZ: IshsizHolati[] = ['ANIQLANDI', 'SUHBAT_OTKAZILDI', 'TAKLIF_BERILDI'];

export interface IshsizlikManbai {
  ishdanBoshaganSana: Date | null;
  household?: { ishsizlikMuddatiOy: number | null } | null;
}

/** Икки сана орасидаги тўлиқ ойлар сони */
export function oyFarqi(boshi: Date, oxiri: Date): number {
  let oy = (oxiri.getFullYear() - boshi.getFullYear()) * 12 + (oxiri.getMonth() - boshi.getMonth());
  if (oxiri.getDate() < boshi.getDate()) oy--;
  return oy;
}

/**
 * Неча ойдан бери ишсиз. Номаълум бўлса `null`.
 *
 * Келажакдаги сана (хато киритилган) ҳисобга олинмайди —
 * акс ҳолда манфий ой чиқарди.
 */
export function ishsizlikOylari(p: IshsizlikManbai, hozir: Date = new Date()): number | null {
  if (p.ishdanBoshaganSana) {
    const oy = oyFarqi(p.ishdanBoshaganSana, hozir);
    return oy >= 0 ? oy : null;
  }
  const xonadondan = p.household?.ishsizlikMuddatiOy;
  return typeof xonadondan === 'number' && xonadondan >= 0 ? xonadondan : null;
}

/** Узоқ муддатли ишсизми */
export function uzoqIshsizmi(p: IshsizlikManbai, hozir: Date = new Date()): boolean {
  const oy = ishsizlikOylari(p, hozir);
  return oy !== null && oy >= UZOQ_CHEGARA_OY;
}

/**
 * Базадан узоқ муддатли ишсизларни танлаш шарти.
 *
 * Аниқ сана бор бўлса ФАҚАТ шунга қаралади — хонадондаги
 * тахминий рақам уни енга олмайди. Шунинг учун иккинчи шохда
 * `ishdanBoshaganSana: null` шарти турибди.
 */
export function UZOQ_ISHSIZ(hozir: Date = new Date()): Prisma.UnemployedPersonWhereInput {
  const chegara = new Date(hozir);
  chegara.setMonth(chegara.getMonth() - UZOQ_CHEGARA_OY);

  return {
    holati: { in: HALI_ISHSIZ },
    OR: [
      { ishdanBoshaganSana: { lte: chegara } },
      {
        ishdanBoshaganSana: null,
        household: { ishsizlikMuddatiOy: { gte: UZOQ_CHEGARA_OY } },
      },
    ],
  };
}

/** «3 йил 2 ой» каби ўқиладиган матн */
export function muddatMatni(oy: number | null): string {
  if (oy === null) return 'номаълум';
  if (oy < 1) return 'бир ойдан кам';
  if (oy < 12) return `${oy} ой`;
  const yil = Math.floor(oy / 12);
  const qolgan = oy % 12;
  return qolgan === 0 ? `${yil} йил` : `${yil} йил ${qolgan} ой`;
}
