import type { Rol } from '@prisma/client';

/**
 * ============================================================
 *  HUDHUD: KIM FOYDALANA OLADI VA QANCHA
 *
 *  Agent faqat qaror qabul qiluvchi va boshqaruv rollariga ochiq:
 *  hokim, bandlik markazi (mutaxassis va rahbar) va administrator.
 *  Mahalla yettiligi a'zosi (YETTILIK) kundalik ishda faqat o'z
 *  mahallasi bilan ishlaydi va unga ochilmagan.
 *
 *  `auth.ts` dagi `aiXulosaSoraydi` dan ALOHIDA ro'yxat: u "xulosa
 *  tugmasi"ga tegishli, bu esa "ovozli agent"ga. Biri o'zgarsa,
 *  ikkinchisi o'zgarmasligi kerak.
 * ============================================================
 */

export const AGENT_ROLLARI = ['HOKIM', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const satisfies readonly Rol[];
export type AgentRoli = (typeof AGENT_ROLLARI)[number];

export function agentOchiqmi(rol: Rol): rol is AgentRoli {
  return (AGENT_ROLLARI as readonly string[]).includes(rol);
}

/**
 * Kunlik til modeli xabarlari soni (rol bo'yicha).
 *
 * Qoidali (modelsiz) javoblar bu limitga KIRMAYDI: ular pul turmaydi,
 * shuning uchun limit tugagach ham oddiy ovozli buyruqlar ishlayveradi.
 */
const ODATIY_KUNLIK: Record<AgentRoli, number> = {
  HOKIM: 120,
  ADMIN: 120,
  BANDLIK_RAHBAR: 80,
  BANDLIK: 40,
};

function musbatSon(qiymat: string | undefined, zaxira: number): number {
  const n = Number(qiymat);
  return Number.isInteger(n) && n > 0 ? n : zaxira;
}

export function kunlikLimit(rol: AgentRoli): number {
  return musbatSon(process.env.AGENT_KUNLIK_LIMIT, ODATIY_KUNLIK[rol]);
}

/** Butun tuman bo'yicha oylik model xabarlari soni (byudjetning umumiy to'sig'i) */
export function oylikUmumiyLimit(): number {
  return musbatSon(process.env.AGENT_OYLIK_LIMIT, 4000);
}

/** Server tomonda matnga aylantiriladigan ovozning kunlik jami (soniya) */
export function ovozKunlikLimit(): number {
  return musbatSon(process.env.AGENT_OVOZ_LIMIT, 900);
}

/** Bir xabarning eng katta uzunligi — uzun matn token va pul degani */
export const ENG_UZUN_XABAR = 600;
export const ENG_UZUN_TARIX_XABARI = 800;
export const ENG_KOP_TARIX = 8;
/** Bir daqiqada nechta xabar (bazadagi chegara) */
export const DAQIQALIK_LIMIT = 12;
