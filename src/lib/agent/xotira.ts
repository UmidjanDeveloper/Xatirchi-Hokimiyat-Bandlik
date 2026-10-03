import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { AgentKontekst, Manba } from './turlar';

/** Faqat server olgan jamlamalar. Amallar va foydalanuvchi matni xotiraga kirmaydi. */
const ASBOBLAR = ['korsatkichlar', 'mahallalar_qamrovi', 'oila_bolimlari', 'vazifalarim', 'murojaatlar_holati', 'tizim_holati'] as const;
const MUDDAT_MS = 30 * 60_000;
export const ENG_UZUN_XOTIRA = 24_000;

const Yozuv = z.object({
  asbob: z.enum(ASBOBLAR),
  natija: z.string().max(6000),
  vaqt: z.string().datetime(),
  manbalar: z.array(z.object({ nom: z.string().max(200), vaqt: z.string().datetime() })).max(6),
});
const Qadoq = z.object({
  v: z.literal(1),
  userId: z.string(),
  rol: z.string(),
  muddat: z.number().int(),
  yozuvlar: z.array(Yozuv).max(4),
});
export type XotiraYozuvi = z.infer<typeof Yozuv>;

function imzo(yuk: string, kalit: string): string {
  // Sessiya imzosi bilan bir xil kalit, ammo boshqa maqsad va boshqa yuk.
  return createHmac('sha256', kalit).update(`koala-xotira-v1:${yuk}`).digest('base64url');
}

/** Qalbaki, eski yoki boshqa xodim/rol xotirasi suhbatni buzmaydi: tashlab yuboriladi. */
export function xotiraniOqi(ctx: AgentKontekst, token?: string, kalit = process.env.SESSION_SECRET): XotiraYozuvi[] {
  if (!token || token.length > ENG_UZUN_XOTIRA || !kalit || kalit.length < 32) return [];
  try {
    const qismlar = token.split('.');
    if (qismlar.length !== 2) return [];
    const [yuk, berilgan] = qismlar;
    const kutilgan = imzo(yuk, kalit);
    if (berilgan.length !== kutilgan.length || !timingSafeEqual(Buffer.from(berilgan), Buffer.from(kutilgan))) return [];
    const q = Qadoq.parse(JSON.parse(Buffer.from(yuk, 'base64url').toString('utf8')));
    const hozir = ctx.hozir.getTime();
    if (q.userId !== ctx.userId || q.rol !== ctx.rol || q.muddat <= hozir || q.muddat > hozir + MUDDAT_MS) return [];
    return q.yozuvlar.filter((y) => {
      const vaqt = Date.parse(y.vaqt);
      return vaqt <= hozir && vaqt > hozir - MUDDAT_MS && (y.asbob !== 'tizim_holati' || ctx.rol === 'ADMIN');
    });
  } catch {
    return [];
  }
}

export function xotiragaQosh(
  yozuvlar: XotiraYozuvi[], asbob: string, malumot: Record<string, unknown>, manbalar: Manba[], hozir: Date
): XotiraYozuvi[] {
  if (!(ASBOBLAR as readonly string[]).includes(asbob) || malumot.xato || manbalar.length === 0) return yozuvlar;
  const y = Yozuv.safeParse({ asbob, natija: JSON.stringify(malumot), manbalar, vaqt: hozir.toISOString() });
  if (!y.success) return yozuvlar;
  // Bir xil jamlama takrorlansa eng yangi vaqti qoladi; turli mahallalar saqlanadi.
  return [...yozuvlar.filter((x) => x.asbob !== asbob || x.natija !== y.data.natija), y.data].slice(-4);
}

/** Imzolangan xotira faqat brauzer varag'ida saqlanadi; bazaga suhbat matni yozilmaydi. */
export function xotiraniQadoqla(ctx: AgentKontekst, yozuvlar: XotiraYozuvi[], kalit = process.env.SESSION_SECRET): string | undefined {
  if (!kalit || kalit.length < 32 || yozuvlar.length === 0) return undefined;
  const q = Qadoq.parse({ v: 1, userId: ctx.userId, rol: ctx.rol, muddat: ctx.hozir.getTime() + MUDDAT_MS, yozuvlar: yozuvlar.slice(-4) });
  while (q.yozuvlar.length) {
    const yuk = Buffer.from(JSON.stringify(q)).toString('base64url');
    const token = `${yuk}.${imzo(yuk, kalit)}`;
    if (token.length <= ENG_UZUN_XOTIRA) return token;
    q.yozuvlar.shift();
  }
  return undefined;
}
