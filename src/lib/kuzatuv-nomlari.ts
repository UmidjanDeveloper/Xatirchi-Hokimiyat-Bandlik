import type { KuzatuvJavobi, KuzatuvNatijasi, MalumotDarajasi } from '@prisma/client';

/**
 * 30/60/90 kunlik kuzatuv: ekranda ko'rinadigan nomlar va konstantalar.
 *
 * Alohida fayl: brauzer komponentlari ham ishlatadi, `kuzatuv.ts` esa
 * bazaga ulanadi (qarang: `oila-rejasi-nomlari.ts`).
 */

/** Tekshiruv bosqichlari - ishga kirgandan keyin shuncha kun */
export const BOSQICHLAR = [30, 60, 90] as const;
export type Bosqich = (typeof BOSQICHLAR)[number];

export const JAVOB_NOMI: Record<KuzatuvJavobi, string> = {
  HA: 'Ҳа',
  YOQ: 'Йўқ',
  NOMALUM: 'Маълум эмас',
};

/**
 * Ma'lumot darajasi. Тўртта ҳолат ҲАР ДОИМ ажралади: «маълум эмас»
 * «йўқ» эмас, «фуқаро билдирган» эса «текширилган» эмас.
 */
export const DARAJA_NOMI: Record<MalumotDarajasi, string> = {
  NOMALUM: 'Маълум эмас',
  XODIM_QAYD_ETGAN: 'Ходим қайд этган',
  FUQARO_BILDIRGAN: 'Фуқаро билдирган',
  TEKSHIRILGAN: 'Текширилган',
};

export const DARAJA_IZOHI: Record<MalumotDarajasi, string> = {
  NOMALUM: 'Билиб бўлмади ёки сўралмади',
  XODIM_QAYD_ETGAN: 'Ходим ўзи кўрди ёки ўз ҳисобидан ёзди',
  FUQARO_BILDIRGAN: 'Фуқаронинг ўзи айтди, ходим ёзиб олди',
  TEKSHIRILGAN: 'Ҳужжат ёки расмий манба билан тасдиқланган (далил боғланган)',
};

export const NATIJA_NOMI: Record<KuzatuvNatijasi, string> = {
  MALUMOT_OLINDI: 'Маълумот олинди',
  BOGLANILMADI: 'Боғланиб бўлмади',
};

/** Саволлар - фақат ШУ ТАРТИБДА кўрсатилади */
export const SAVOLLAR = [
  { kalit: 'ishBoshladi', savol: 'Ишга кирдими?' },
  { kalit: 'ishdaQolmoqda', savol: 'Ишда қолаяптими?' },
  { kalit: 'haqOlmoqda', savol: 'Келишилган иш ҳақини олаяптими?' },
  { kalit: 'sharoitMos', savol: 'Иш шароити мосми?' },
  { kalit: 'qoshimchaYordam', savol: 'Қўшимча ёрдам керакми?' },
] as const;

export type SavolKaliti = (typeof SAVOLLAR)[number]['kalit'];

/** Ish haqi yoki daromadning ENG KATTA ishonarli qiymati, so'm (oyiga) */
export const ENG_KATTA_DAROMAD = 1_000_000_000;

/** Bosqich sanasidan shuncha kun OLDIN tekshiruv yozish mumkin */
export const ERTA_YOZISH_KUNI = 7;

/** Muddatidan shuncha kun o'tgach eski ishlar ro'yxatni to'ldirmaydi */
export const ESKIRISH_KUNI = 120;

/** "Bog'lanib bo'lmadi" dan keyin qayta urinish odatda shuncha kundan keyin */
export const QAYTA_URINISH_KUNI = 3;

/**
 * Ko'rsatkichlar ostida chiqadigan tushuntirish. Hokim "bu raqam qanday
 * hisoblangan?" deb so'raganda javob shu yerda.
 */
export const HISOBLASH_USULI = {
  davr: 'Ишга кирган санаси бўйича: кузатув муддати ўтган барча жойлаштиришлар (ҳозиргача)',
  manba:
    'Ходим киритган 30/60/90 кунлик кузатув ёзувлари; иш муддатдан олдин тугаган бўлса — иш воқеасидаги тугаш санаси (ходим қайд этган)',
  qoida: [
    'Фуқаро иш алмаштирса, у янги фуқаро ҳисобланмайди: «жойлашган фуқаро» бир марта, ҳар бир иш эса алоҳида кузатилади.',
    '«Маълум эмас» ҳеч қачон «йўқ» ёки «0» деб ҳисобланмайди — алоҳида кўрсатилади.',
    'Ишда қолиш даражаси фақат жавоби МАЪЛУМ бўлганлар орасидан ҳисобланади; қанчаси маълум эканини ёнида кўрсатамиз.',
    'Даромад ўзгариши фақат бошланғич ва ҳозирги даромад ИККАЛАСИ маълум бўлган оилалар бўйича.',
  ],
  ogohlantirish:
    'Бу кўрсаткичлар кузатилган ҳолатни билдиради. Ўзгариш сабаби дастур эканини исботламайди: бошқа омиллар (мавсум, бозор, оиланинг ўз ҳаракати) ҳам таъсир қилади.',
} as const;
