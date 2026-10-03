import { serverXatosi } from '@/lib/tizim-kuzatuvi';
import { A } from '@/lib/alifbo';
import { hisobniYoz, modelXabariniBandQil, modelXabariniQaytar } from './hisob';
import { MATN } from './matnlar';
import { ModelXatosi, type ModelChaqiruvi } from './model';
import { agentOchiqmi } from './ruxsat';
import { suhbatniYurit } from './sikl';
import type { Amal, AgentKontekst, Manba, TarixXabari } from './turlar';
import { qoidaBilanJavob } from './zaxira';
import { xotiraniOqi, xotiraniQadoqla } from './xotira';

/**
 * ============================================================
 *  HUDHUD: BITTA XABARGA JAVOB — HAMMASI BIR JOYDA
 *
 *  Yo'l (route) faqat kirish (huquq, hajm, chegara) bilan shug'ullanadi;
 *  "model yoki qoida?", limit, hisob va xatoga tushish shu yerda. Shunda
 *  bu mantiq soxta model va haqiqiy baza bilan to'g'ridan-to'g'ri
 *  sinaladi (`scripts/agent-sinov.ts`).
 *
 *  Qaror daraxti:
 *    1. model sozlanmagan (kalit yo'q)      → qoidali rejim;
 *    2. kunlik/oylik limit tugagan          → qoidali rejim + izoh;
 *    3. model chaqirildi, xato/uzilish      → qoidali rejim + izoh,
 *                                             band qilingan xabar QAYTARILADI;
 *    4. hammasi joyida                      → AI javobi.
 *
 *  Qoidali rejim hech qachon modelga murojaat qilmaydi va limitga kirmaydi.
 * ============================================================
 */

export interface AgentJavobi {
  javob: string;
  amallar: Amal[];
  manbalar: Manba[];
  rejim: 'ai' | 'qoida';
  /** Nega qoidali rejim (rejim = 'qoida' bo'lganda) */
  sabab?: 'kalit_yoq' | 'limit_kunlik' | 'limit_oylik' | 'model_xatosi';
  /** Xodimga ko'rsatiladigan qisqa izoh (limit tugadi, AI ishlamayapti) */
  izoh?: string;
  /** Bugun yana nechta AI xabari qoldi (AI rejimida) */
  qolgan?: number;
  xotira?: string;
}

export async function agentJavobi(p: {
  ctx: AgentKontekst;
  xabar: string;
  tarix: TarixXabari[];
  /** `null` — kalit sozlanmagan */
  model: ModelChaqiruvi | null;
  xotira?: string;
  signal?: AbortSignal;
}): Promise<AgentJavobi> {
  const { ctx } = p;
  if (!agentOchiqmi(ctx.rol)) throw new Error('Koala bu rol uchun ochiq emas');

  const qoida = async (sabab: NonNullable<AgentJavobi['sabab']>, izoh?: string): Promise<AgentJavobi> => {
    const z = await qoidaBilanJavob(ctx, p.xabar, p.tarix);
    await hisobniYoz(ctx.userId, { qoidali: 1 }, ctx.hozir);
    return {
      javob: z.javob,
      amallar: z.amallar,
      manbalar: z.manbalar,
      rejim: 'qoida',
      sabab,
      ...(izoh ? { izoh: A(izoh, ctx.alifbo) } : {}),
    };
  };

  if (!p.model) return qoida('kalit_yoq', MATN.aiYoq);

  const band = await modelXabariniBandQil(ctx.userId, ctx.rol, ctx.hozir);
  if (!band.ruxsat) {
    return qoida(band.sabab === 'oylik' ? 'limit_oylik' : 'limit_kunlik', band.sabab === 'oylik' ? MATN.limitOylik : MATN.limitKunlik);
  }

  try {
    const n = await suhbatniYurit({ ctx, tarix: p.tarix, xabar: p.xabar, model: p.model, xotira: xotiraniOqi(ctx, p.xotira), signal: p.signal });
    await hisobniYoz(ctx.userId, { tokenlar: n.tokenlar }, ctx.hozir);
    return {
      javob: n.javob,
      amallar: n.amallar,
      manbalar: n.manbalar,
      rejim: 'ai',
      qolgan: band.qolgan,
      xotira: xotiraniQadoqla(ctx, n.xotira),
    };
  } catch (e) {
    /* Javob olinmadi: xodimning bir xabari kuymasin */
    await modelXabariniQaytar(ctx.userId, ctx.hozir).catch(() => {});
    await hisobniYoz(ctx.userId, { xatolar: 1 }, ctx.hozir).catch(() => {});
    if (p.signal?.aborted) throw e;
    if (!(e instanceof ModelXatosi)) await serverXatosi('agent:xizmat', e);
    else if (e.kod !== 'vaqt') await serverXatosi('agent:model', e);
    return qoida('model_xatosi', MATN.aiYoq);
  }
}
