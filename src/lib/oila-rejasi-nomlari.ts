import type { AloqaUsuli, RejaHolati, RejaTosigi } from '@prisma/client';

/**
 * Oilaviy reja: ekranda ko'rinadigan nomlar va sodda konstantalar.
 *
 * ── Nega alohida fayl ──
 *
 * `oila-rejasi.ts` bazaga ulanadi (`prisma`). Brauzer komponenti uni
 * import qilsa, bazaga ulanish kodi brauzerga yuboriladi - bu ham
 * xavfli, ham ishlamaydi. Shu fayl esa faqat turlar va matnlardan
 * iborat, ya'ni brauzerga xavfsiz. `scripts/tezlik-sinov.ts` buni
 * tekshiradi.
 */


export const TOSIQ_NOMI: Record<RejaTosigi, string> = {
  TRANSPORT: 'Транспорт йўқ ёки узоқ',
  BOLAGA_QARASH: 'Болага қарайдиган киши йўқ',
  ISH_JADVALI: 'Иш жадвали мос эмас',
  KONIKMA: 'Касб кўникмаси етишмайди',
  SOGLIQ_MOSLASHUVI: 'Соғлиққа мос шароит керак',
  MOS_ISH_SHAROITI: 'Мос иш шароити йўқ',
  ASBOB_USKUNA: 'Асбоб-ускуна етишмайди',
  BUYURTMA_YETISHMASLIGI: 'Буюртма (талаб) етишмайди',
  BOSHQA: 'Бошқа сабаб',
};

export const TOSIQ_TARTIBI = Object.keys(TOSIQ_NOMI) as RejaTosigi[];

export const ALOQA_USULI_NOMI: Record<AloqaUsuli, string> = {
  TELEFON: 'Телефон орқали',
  UCHRASHUV: 'Учрашув',
  TASHRIF: 'Хонадонга ташриф',
};

export const REJA_HOLATI_NOMI: Record<RejaHolati, string> = {
  FAOL: 'Амалда',
  TUGALLANDI: 'Якунланди',
  TOXTATILDI: 'Тўхтатилди',
};

/** Yangi aloqada keyingi aloqa sanasi odatda shuncha kundan keyin */
export const ODATIY_ALOQA_ORALIGI_KUN = 14;

