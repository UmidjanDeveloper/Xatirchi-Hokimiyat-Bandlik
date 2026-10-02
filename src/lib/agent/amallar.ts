import type { Rol } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { jurnal } from '@/lib/api-auth';
import { maxfiyniTozala } from '@/lib/maxfiy';
import { xatoliNavbatniQaytar, xatolarniKorildi } from '@/lib/tizim-kuzatuvi';

/**
 * ============================================================
 *  HUDHUD: YOZISH AMALLARI — FAQAT XODIM TASDIG'I BILAN
 *
 *  GPT §18: "Yozish amallari vakolatli xodim tasdig'ini talab qilsin".
 *
 *  Agent hech narsani o'zi yozmaydi. U faqat TAKLIF yaratadi; taklif
 *  serverda saqlanadi va xodim ekrandagi tugmani bosganda ishlaydi:
 *
 *    · taklif mazmuni (`amal`) serverda turadi — xodim yoki model uni
 *      tasdiqlash paytida o'zgartira olmaydi;
 *    · BIR MARTA ishlaydi: tasdiqlash atomar (`updateMany` + holat
 *      sharti), ikki marta bosish ikki marta bajarmaydi;
 *    · MUDDATI bor (5 daqiqa): eski taklif keyinroq tasodifan bosilmasin;
 *    · taklif faqat O'Z egasiga tegishli, rol tasdiqlash paytida
 *      QAYTA tekshiriladi (rol o'zgargan bo'lishi mumkin);
 *    · ruxsat etilgan amallar RO'YXATI qat'iy: model yangi amal
 *      "o'ylab topa" olmaydi;
 *    · har bir bajarilish audit jurnaliga yoziladi (mavjud
 *      administrator tugmalari bilan bir xil yozuv).
 * ============================================================
 */

export const TAKLIF_MUDDATI_DAQIQA = 5;

export interface AmalTavsifi {
  sarlavha: string;
  rollar: readonly Rol[];
  bajar(userId: string): Promise<string>;
}

export const AMALLAR = {
  navbatni_qayta_yubor: {
    sarlavha: "Xato bilan tugagan Telegram xabarlarini yuborish navbatiga qaytarish",
    rollar: ['ADMIN', 'BANDLIK_RAHBAR'],
    async bajar(userId) {
      const soni = await xatoliNavbatniQaytar();
      await jurnal(userId, 'OZGARTIRISH', {
        obyektTuri: 'Xabarnoma',
        izoh: `Hudhud orqali: xato bilan tugagan ${soni} ta xabar navbatga qaytarildi`,
      });
      return `${soni} ta xabar navbatga qaytarildi`;
    },
  },
  xatolarni_korildi: {
    sarlavha: "Xato jurnalidagi barcha yozuvlarni «ko'rildi» deb belgilash",
    rollar: ['ADMIN'],
    async bajar(userId) {
      const soni = await xatolarniKorildi();
      await jurnal(userId, 'OZGARTIRISH', {
        obyektTuri: 'TizimXatosi',
        izoh: `Hudhud orqali: xato jurnalida ${soni} ta yozuv «ko'rildi» deb belgilandi`,
      });
      return `${soni} ta yozuv «ko'rildi» deb belgilandi`;
    },
  },
} as const satisfies Record<string, AmalTavsifi>;

export type AmalKaliti = keyof typeof AMALLAR;
export const AMAL_KALITLARI = Object.keys(AMALLAR) as AmalKaliti[];

export function amalKalitimi(k: string): k is AmalKaliti {
  return Object.prototype.hasOwnProperty.call(AMALLAR, k);
}

export function amalRolgaOchiqmi(k: AmalKaliti, rol: Rol): boolean {
  return (AMALLAR[k].rollar as readonly Rol[]).includes(rol);
}

export type TaklifNatijasi =
  | { ok: true; id: string; sarlavha: string; muddat: Date }
  | { ok: false; sabab: 'ruxsat_yoq' | 'amal_yoq' };

/**
 * Taklif yaratadi. Shu xodimning shu amal uchun muddati o'tmagan taklifi
 * bo'lsa — yangisi yaratilmaydi (model bir buyruqda ketma-ket takrorlasa
 * ekranda bir xil kartalar to'planib qolmasin).
 */
export async function taklifYarat(
  userId: string,
  rol: Rol,
  amal: string,
  hozir: Date = new Date()
): Promise<TaklifNatijasi> {
  if (!amalKalitimi(amal)) return { ok: false, sabab: 'amal_yoq' };
  if (!amalRolgaOchiqmi(amal, rol)) return { ok: false, sabab: 'ruxsat_yoq' };

  const mavjud = await prisma.agentAmali.findFirst({
    where: { userId, amal, holati: 'KUTILMOQDA', muddat: { gt: hozir } },
    orderBy: { createdAt: 'desc' },
  });
  if (mavjud) return { ok: true, id: mavjud.id, sarlavha: mavjud.sarlavha, muddat: mavjud.muddat };

  const t = await prisma.agentAmali.create({
    data: {
      userId,
      amal,
      sarlavha: AMALLAR[amal].sarlavha,
      muddat: new Date(hozir.getTime() + TAKLIF_MUDDATI_DAQIQA * 60_000),
    },
  });
  return { ok: true, id: t.id, sarlavha: t.sarlavha, muddat: t.muddat };
}

export type HalNatijasi =
  | { ok: true; holat: 'bajarildi' | 'rad_etildi'; natija: string }
  | { ok: false; sabab: 'topilmadi' | 'muddati_otgan' | 'allaqachon_hal' | 'ruxsat_yoq' | 'xato' };

/**
 * Taklifni tasdiqlaydi yoki rad etadi.
 *
 * `rol` — BAZADAGI hozirgi rol (cookie'dagisi emas).
 */
export async function taklifniHalQil(
  userId: string,
  rol: Rol,
  id: string,
  qaror: 'ha' | 'yoq',
  hozir: Date = new Date()
): Promise<HalNatijasi> {
  const t = await prisma.agentAmali.findFirst({ where: { id, userId } });
  if (!t) return { ok: false, sabab: 'topilmadi' };
  if (t.holati !== 'KUTILMOQDA') return { ok: false, sabab: 'allaqachon_hal' };
  if (t.muddat <= hozir) {
    await prisma.agentAmali.updateMany({
      where: { id, userId, holati: 'KUTILMOQDA' },
      data: { holati: 'MUDDATI_OTDI', hal: hozir },
    });
    return { ok: false, sabab: 'muddati_otgan' };
  }

  if (qaror === 'yoq') {
    const r = await prisma.agentAmali.updateMany({
      where: { id, userId, holati: 'KUTILMOQDA', muddat: { gt: hozir } },
      data: { holati: 'RAD_ETILDI', hal: hozir },
    });
    return r.count === 1 ? { ok: true, holat: 'rad_etildi', natija: 'Bekor qilindi' } : { ok: false, sabab: 'allaqachon_hal' };
  }

  if (!amalKalitimi(t.amal) || !amalRolgaOchiqmi(t.amal, rol)) {
    return { ok: false, sabab: 'ruxsat_yoq' };
  }

  /* Atomar "band qilish": faqat BIR so'rov g'olib bo'ladi */
  const band = await prisma.agentAmali.updateMany({
    where: { id, userId, holati: 'KUTILMOQDA', muddat: { gt: hozir } },
    data: { holati: 'BAJARILDI', hal: hozir },
  });
  if (band.count !== 1) return { ok: false, sabab: 'allaqachon_hal' };

  try {
    const natija = await AMALLAR[t.amal].bajar(userId);
    await prisma.agentAmali.update({ where: { id }, data: { natija: maxfiyniTozala(natija).slice(0, 300) } });
    return { ok: true, holat: 'bajarildi', natija };
  } catch (e) {
    await prisma.agentAmali.update({
      where: { id },
      data: { holati: 'XATO', natija: maxfiyniTozala(e).slice(0, 300) },
    });
    return { ok: false, sabab: 'xato' };
  }
}
