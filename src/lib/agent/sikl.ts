import { serverXatosi } from '@/lib/tizim-kuzatuvi';
import { asbobniBajar, modelAsboblari } from './asboblar';
import { tizimKursatmasi } from './kursatma';
import { ModelXatosi, MODEL_KUTISH_MS, type ChaqiruvQismi, type ModelChaqiruvi, type ModelXabari } from './model';
import { MATN, javobniTozala } from './matnlar';
import type { Amal, AgentKontekst, Manba, TarixXabari } from './turlar';

/**
 * ============================================================
 *  HUDHUD: SUHBAT SIKLI
 *
 *  Model javob beradi yoki asbob chaqiradi; asbob natijasi modelga
 *  qaytariladi; model yakuniy matn yozguncha takrorlanadi. Chegaralar:
 *
 *    · ko'pi bilan 4 aylanish va jami 6 asbob chaqiruvi: model "ketma-ket
 *      chaqirib" pul va vaqtni yeb qo'ymasin;
 *    · butun suhbat 45 soniyada tugaydi (yo'l `maxDuration = 60`);
 *    · asbob natijasi modelga 6000 belgigacha beriladi;
 *    · mijoz faqat `user`/`assistant` matn yubora oladi: tizim va asbob
 *      xabarlarini soxtalashtirib bo'lmaydi.
 *
 *  Sikl modelni PARAMETR sifatida oladi: sinovda soxta model beriladi.
 * ============================================================
 */

export const ENG_KOP_AYLANISH = 4;
export const ENG_KOP_ASBOB = 6;
export const SIKL_KUTISH_MS = 45_000;
const ASBOB_NATIJASI_BELGI = 6000;

export interface SiklNatijasi {
  javob: string;
  amallar: Amal[];
  manbalar: Manba[];
  tokenlar: number;
  asboblar: string[];
  /** Model yakuniy javob berdimi (aylanish tugab qolmadimi) */
  tugallandi: boolean;
}

export interface SiklKirishi {
  ctx: AgentKontekst;
  tarix: TarixXabari[];
  xabar: string;
  model: ModelChaqiruvi;
}

function qisqartir(matn: string): string {
  return matn.length <= ASBOB_NATIJASI_BELGI ? matn : `${matn.slice(0, ASBOB_NATIJASI_BELGI)}…(qisqartirildi)`;
}

function argumentlar(q: ChaqiruvQismi): { ok: true; qiymat: unknown } | { ok: false } {
  try {
    const v = JSON.parse(q.function.arguments || '{}');
    return { ok: true, qiymat: v };
  } catch {
    return { ok: false };
  }
}

export async function suhbatniYurit(k: SiklKirishi): Promise<SiklNatijasi> {
  const { ctx } = k;
  const xabarlar: ModelXabari[] = [
    { role: 'system', content: tizimKursatmasi(ctx) },
    ...k.tarix.map<ModelXabari>((t) => (t.r === 'f' ? { role: 'user', content: t.m } : { role: 'assistant', content: t.m })),
    { role: 'user', content: k.xabar },
  ];
  const asboblar = modelAsboblari(ctx.rol, ctx.oqishFaqat);

  const amallar: Amal[] = [];
  const manbalar = new Map<string, Manba>();
  const chaqirilgan: string[] = [];
  let tokenlar = 0;
  let asbobSoni = 0;

  const toxtatgich = new AbortController();
  const soat = setTimeout(() => toxtatgich.abort(), SIKL_KUTISH_MS);

  try {
    for (let aylanish = 0; aylanish < ENG_KOP_AYLANISH; aylanish++) {
      const javob = await k.model({ xabarlar, asboblar, signal: toxtatgich.signal });
      tokenlar += javob.tokenlar;

      const chaqiruvlar = javob.xabar.tool_calls ?? [];
      if (chaqiruvlar.length === 0) {
        const matn = javobniTozala(javob.xabar.content ?? '');
        return {
          javob: matn || MATN.tushunmadim,
          amallar: amallarniTozala(amallar),
          manbalar: [...manbalar.values()],
          tokenlar,
          asboblar: chaqirilgan,
          tugallandi: true,
        };
      }

      xabarlar.push({ role: 'assistant', content: javob.xabar.content ?? null, tool_calls: chaqiruvlar });

      for (const q of chaqiruvlar) {
        let natijaMatni: string;
        if (asbobSoni >= ENG_KOP_ASBOB) {
          natijaMatni = JSON.stringify({ xato: 'chegara', izoh: "Asbob chaqiruvlari chegarasi tugadi. Mavjud ma'lumot bilan javob bering." });
        } else {
          asbobSoni++;
          chaqirilgan.push(q.function.name);
          const a = argumentlar(q);
          if (!a.ok) {
            natijaMatni = JSON.stringify({ xato: 'parametr_notogri', izoh: "Parametrlar JSON emas" });
          } else {
            const n = await asbobniBajar(ctx, q.function.name, a.qiymat);
            for (const m of n.manbalar) manbalar.set(m.nom, m);
            if (n.amallar) amallar.push(...n.amallar);
            natijaMatni = JSON.stringify(n.malumot);
          }
        }
        xabarlar.push({ role: 'tool', tool_call_id: q.id, content: qisqartir(natijaMatni) });
      }
    }

    return {
      javob: MATN.murakkab,
      amallar: amallarniTozala(amallar),
      manbalar: [...manbalar.values()],
      tokenlar,
      asboblar: chaqirilgan,
      tugallandi: false,
    };
  } catch (e) {
    if (e instanceof ModelXatosi) throw e;
    if ((e as Error)?.name === 'AbortError') throw new ModelXatosi('vaqt', 'Suhbat vaqtida tugamadi');
    await serverXatosi('agent:sikl', e);
    throw new ModelXatosi('bosh', 'Suhbat sikli xato bilan tugadi');
  } finally {
    clearTimeout(soat);
  }
}

/**
 * Bitta suhbat bosqichida bitta sahifa ochiladi (oxirgisi), tasdiq kartalari
 * esa takrorlanmaydi: model ketma-ket chaqirsa, ekranda ikkita bir xil karta
 * yoki ikkita sakrash bo'lmasin.
 */
export function amallarniTozala(amallar: Amal[]): Amal[] {
  /* "ochish" va "hisobot" ikkalasi ham sahifaga olib boradi: ikkalasidan faqat OXIRGISI */
  const yurish = [...amallar].reverse().find((a) => a.tur === 'ochish' || a.tur === 'hisobot');
  const tasdiq = new Map<string, Amal>();
  for (const a of amallar) if (a.tur === 'tasdiq') tasdiq.set(a.id, a);
  return [...(yurish ? [yurish] : []), ...tasdiq.values()];
}

export { MODEL_KUTISH_MS };
