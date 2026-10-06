import { maxfiyniTozala } from '@/lib/maxfiy';
import { GEMINI_WS_HOST, geminiMatnXabari, geminiSozlashXabari, geminiXabarOqi, geminiWsManziliTogrimi } from './gemini-protokol';

/**
 * ============================================================
 *  GEMINI ULANISHINI TEKSHIRISH (faqat administrator uchun)
 *
 *  Haqiqiy Gemini Live bilan server tomonidan qo'l siqishadi: token ->
 *  WebSocket -> `setup` -> `setupComplete` -> bitta matnli savol -> javob.
 *  Brauzer ham aynan shu `setup` bilan ulanadi, shuning uchun bu yerda
 *  chiqqan xato jonli suhbatda ham chiqadi. Natija: qaysi QADAM yiqildi
 *  va Gemini aytgan sabab (kalit/kvota/model nomi/sxema).
 *
 *  Xabar matnlari `maxfiyniTozala` dan o'tadi; kalit va token ko'rinmaydi.
 * ============================================================
 */

export interface TekshiruvQadami { nom: string; ok: boolean; ms?: number; izoh: string }

type SoketTuri = new (url: string) => WebSocket;

export async function geminiSoketniTekshir(p: {
  wsUrl: string; setup: unknown; chiqish: 'matn' | 'transkript'; savol?: string;
  Soket?: SoketTuri; kutishMs?: number; signal?: AbortSignal;
}): Promise<TekshiruvQadami[]> {
  const Soket = p.Soket ?? (typeof WebSocket === 'function' ? (WebSocket as unknown as SoketTuri) : null);
  if (!Soket) {
    return [{ nom: 'Gemini WebSocket', ok: false, izoh: 'Bu serverda WebSocket yo‘q (Node 22 kerak). Token olindi; brauzer ulanishi alohida sinaladi.' }];
  }
  if (!geminiWsManziliTogrimi(p.wsUrl)) {
    return [{ nom: 'Gemini WebSocket', ok: false, izoh: `Manzil kutilgan ${GEMINI_WS_HOST} manzili emas.` }];
  }
  const kutish = p.kutishMs ?? 12_000;
  const qadamlar: TekshiruvQadami[] = [];
  const t0 = Date.now();

  await new Promise<void>((tugadi) => {
    let soket: WebSocket;
    try { soket = new Soket(p.wsUrl); } catch (e) {
      qadamlar.push({ nom: 'Gemini WebSocket', ok: false, izoh: `Ochib bo‘lmadi: ${maxfiyniTozala(e).slice(0, 200)}` });
      tugadi(); return;
    }
    let sozlandi = false; let birinchi = 0; let matn = '';
    let yopildi = false;
    const yakun = (q: TekshiruvQadami) => {
      if (yopildi) return;
      yopildi = true; clearTimeout(taymer);
      qadamlar.push(q);
      try { soket.close(1000, 'tekshiruv'); } catch { /* yopilgan */ }
      tugadi();
    };
    const taymer = setTimeout(() => yakun(sozlandi
      ? { nom: 'Gemini javobi', ok: false, ms: Date.now() - t0, izoh: `Savolga ${Math.round(kutish / 1000)} soniyada javob kelmadi.` }
      : { nom: 'Gemini WebSocket + sozlama', ok: false, ms: Date.now() - t0, izoh: `${Math.round(kutish / 1000)} soniyada setupComplete kelmadi.` }), kutish);
    p.signal?.addEventListener('abort', () => yakun({ nom: 'Gemini WebSocket', ok: false, izoh: 'Bekor qilindi.' }), { once: true });

    soket.addEventListener('open', () => { soket.send(JSON.stringify(geminiSozlashXabari(p.setup))); });
    soket.addEventListener('message', async (e: MessageEvent) => {
      let xom = '';
      if (typeof e.data === 'string') xom = e.data;
      else if (e.data instanceof ArrayBuffer) xom = new TextDecoder().decode(e.data);
      else if (typeof Blob !== 'undefined' && e.data instanceof Blob) xom = await e.data.text();
      for (const h of geminiXabarOqi(xom, p.chiqish)) {
        if (h.t === 'tayyor' && !sozlandi) {
          sozlandi = true;
          qadamlar.push({ nom: 'Gemini WebSocket + sozlama', ok: true, ms: Date.now() - t0, izoh: 'Model, ko‘rsatma va asboblar qabul qilindi.' });
          soket.send(JSON.stringify(geminiMatnXabari(p.savol ?? 'Salom. Bir qisqa jumlada o‘zbekcha salom ber.')));
        } else if (h.t === 'matn') {
          if (!birinchi) birinchi = Date.now() - t0;
          matn += h.matn;
        } else if (h.t === 'yakun') {
          yakun(matn.trim()
            ? { nom: 'Gemini javobi', ok: true, ms: birinchi, izoh: `Birinchi matn ${birinchi} ms da keldi (ulanishdan boshlab). Javob: «${matn.trim().slice(0, 140)}»` }
            : { nom: 'Gemini javobi', ok: false, ms: Date.now() - t0, izoh: 'Javob bo‘sh keldi. Model nomi yoki javob turi (matn/transkript) mos emas bo‘lishi mumkin.' });
        }
      }
    });
    soket.addEventListener('close', (e: CloseEvent) => {
      yakun({
        nom: sozlandi ? 'Gemini javobi' : 'Gemini WebSocket + sozlama', ok: false, ms: Date.now() - t0,
        izoh: `Gemini ulanishni yopdi (kod ${e.code}). ${maxfiyniTozala(e.reason ?? '').slice(0, 300)}`.trim(),
      });
    });
    soket.addEventListener('error', () => {
      // Sabab odatda `close` hodisasida keladi; u kelmasa shu qoladi
      setTimeout(() => yakun({ nom: 'Gemini WebSocket', ok: false, ms: Date.now() - t0, izoh: 'Ulanib bo‘lmadi (tarmoq yoki token rad etildi).' }), 300);
    });
  });
  return qadamlar;
}
