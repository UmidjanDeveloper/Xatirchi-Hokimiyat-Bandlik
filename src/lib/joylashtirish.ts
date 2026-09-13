import type { IshsizHolati } from '@prisma/client';

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
