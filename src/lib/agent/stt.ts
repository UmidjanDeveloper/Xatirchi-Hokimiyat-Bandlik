import { maxfiyniTozala } from '@/lib/maxfiy';
import type { AgentProvayderi } from './model';

/**
 * ============================================================
 *  KOALA: OVOZNI MATNGA AYLANTIRISH (provayderga so'rov)
 *
 *  Avval bu so'rov `api/agent/ovoz/route.ts` ichida turardi va har qanday
 *  xato bitta "Ovoz matnga aylanmadi" bo'lib qolardi: iPhone'da ovoz
 *  serverga yetib borgan, lekin foydalanuvchi va administrator SABABNI bilmasdi
 *  (kalit, hisobdagi mablag', modelga ruxsat, parametr...).
 *
 *  Endi:
 *    · provayder javobi aniq SABABGA ajratiladi (`SttSababi`) va har sababga
 *      qisqa, tushunarli matn beriladi;
 *    · provayder parametrni rad etsa (til, harorat, izoh, model) — shu
 *      parametrsiz yoki zaxira modeli bilan QAYTA uriniladi (chat so'rovidagi
 *      `haqiqiyModel` bilan bir xil yondashuv), eng ko'pi 4 urinish;
 *    · 5xx xatoda bir marta qayta uriniladi; kalit, hisob va ruxsat
 *      xatolarida qayta urinish foydasiz — darhol aytiladi;
 *    · xato matni `maxfiyniTozala`dan o'tadi (kalit jurnalga tushmaydi).
 *
 *  `fetch` tashqaridan beriladi: sinovda provayder soxta javob bilan
 *  almashtiriladi (`scripts/stt-sinov.ts`), tarmoqsiz.
 * ============================================================
 */

export type SttSababi =
  | 'kalit' // 401: kalit noto'g'ri yoki o'chirilgan
  | 'hisob' // 429: hisobdagi mablag'/kvota tugagan
  | 'band' // 429: so'rovlar chegarasi (vaqtincha)
  | 'ruxsat' // 403: kalit yoki loyiha bu xizmatga ruxsat bermaydi
  | 'model' // 404: model topilmadi
  | 'format' // 400/415/422: provayder faylni yoki parametrni qabul qilmadi
  | 'hajm' // 413
  | 'vaqt' // provayder javobi kechikdi
  | 'tarmoq' // provayderga ulanib bo'lmadi
  | 'provayder' // 5xx
  | 'bosh'; // boshqa

export type SttNatija =
  | { ok: true; matn: string; model: string; urinish: number }
  | { ok: false; sabab: SttSababi; holat: number; tafsilot: string; urinish: number };

/** Foydalanuvchiga ko'rinadigan matnlar (kirillda; chaqiruvchi `A()` bilan alifboga o'tkazadi) */
export const STT_XABARI: Record<SttSababi, string> = {
  kalit: 'Овоз хизматининг калити ишламаяпти. Ёзинг.',
  hisob: 'Овоз хизмати ҳисобида маблағ тугаган. Ёзинг.',
  band: 'Овоз хизмати банд. Бир оздан кейин уриниб кўринг.',
  ruxsat: 'Овоз хизматига рухсат йўқ. Ёзинг.',
  model: 'Овоз модели топилмади. Ёзинг.',
  format: 'Овоз файли қабул қилинмади. Ёзинг.',
  hajm: 'Овоз жуда узун. Қисқароқ айтинг.',
  vaqt: 'Овоз хизмати кечикди. Қайта уриниб кўринг.',
  tarmoq: 'Овоз хизматига уланмади. Ёзинг.',
  provayder: 'Овоз хизмати вақтинча ишламаяпти. Ёзинг.',
  bosh: 'Овоз матнга айланмади. Ёзинг.',
};

/** Eng ishonchli (hamma hisobda bor) model: boshqa model xato bersa shunga qaytamiz */
export const ZAXIRA_MODELI = 'whisper-1';
const ENG_KOP_URINISH = 4;
const PROVAYDER_KUTISH_MS = 20_000;
/** Soha so'zlari: ismlar va atamalar to'g'ri yozilishiga yordam beradi (qisqa) */
const IZOH = 'Xatirchi tumani, mahalla, xatlov, ishsiz, bandlik, murojaat, hokim, xonadon, hisobot, tahlil paneli';

/** Provayder xato javobi (OpenAI/Groq: `{error:{message,type,code,param}}`) */
interface ProvayderXatosi {
  xabar: string;
  tur: string;
  kod: string;
}

function xatoniOqi(xom: string): ProvayderXatosi {
  try {
    const d = JSON.parse(xom) as { error?: { message?: string; type?: string; code?: string | number | null } | string };
    if (typeof d.error === 'string') return { xabar: d.error, tur: '', kod: '' };
    if (d.error) return { xabar: d.error.message ?? '', tur: d.error.type ?? '', kod: String(d.error.code ?? '') };
  } catch {
    /* JSON emas */
  }
  return { xabar: xom.replace(/\s+/g, ' ').slice(0, 300), tur: '', kod: '' };
}

/** HTTP holati va provayder xabaridan sabab (sof funksiya: sinaladi) */
export function sababniAniqla(holat: number, x: ProvayderXatosi): SttSababi {
  const m = `${x.xabar} ${x.tur} ${x.kod}`.toLowerCase();
  if (holat === 401) return 'kalit';
  if (holat === 429) return /quota|billing|credit|balance|insufficient|payment/.test(m) ? 'hisob' : 'band';
  /* 403: "loyiha modelga ruxsat bermaydi" ham, "kalitda ruxsat yo'q" ham — ruxsat muammosi; faqat "model yo'q" — model */
  if (holat === 403) return /does not exist|not found/.test(m) ? 'model' : 'ruxsat';
  if (holat === 404) return 'model';
  if (holat === 413) return 'hajm';
  if (holat === 408 || holat === 504) return 'vaqt';
  if (holat === 400 || holat === 415 || holat === 422) return /model/.test(m) && /does not exist|not found|access|invalid model/.test(m) ? 'model' : 'format';
  if (holat >= 500) return 'provayder';
  return 'bosh';
}

interface Parametrlar {
  model: string;
  til: boolean;
  harorat: boolean;
  izoh: boolean;
}

/**
 * Yozuvni matnga aylantiradi.
 * @param fayl brauzerdan kelgan audio (WAV)
 * @param model sinov uchun almashtirish (odatda `AGENT_STT_MODEL` yoki provayder modeli)
 */
export async function ovozniMatnga(
  prov: Pick<AgentProvayderi, 'provayder' | 'kalit' | 'baza'>,
  fayl: File,
  opt: { model?: string; fetchFn?: typeof fetch; kutishMs?: number } = {}
): Promise<SttNatija> {
  const fetchFn = opt.fetchFn ?? fetch;
  const p: Parametrlar = {
    model: opt.model?.trim() || (prov.provayder === 'groq' ? 'whisper-large-v3-turbo' : ZAXIRA_MODELI),
    til: true,
    harorat: true,
    izoh: true,
  };

  let oxirgi: SttNatija = { ok: false, sabab: 'bosh', holat: 0, tafsilot: '', urinish: 0 };
  let besh = 0;

  for (let urinish = 1; urinish <= ENG_KOP_URINISH; urinish++) {
    const forma = new FormData();
    forma.set('file', fayl, fayl.name || 'ovoz.wav');
    forma.set('model', p.model);
    if (p.til) forma.set('language', 'uz');
    if (p.harorat) forma.set('temperature', '0');
    if (p.izoh) forma.set('prompt', IZOH);

    const ctrl = new AbortController();
    const soat = setTimeout(() => ctrl.abort(), opt.kutishMs ?? PROVAYDER_KUTISH_MS);
    let r: Response;
    try {
      r = await fetchFn(`${prov.baza}/audio/transcriptions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { authorization: `Bearer ${prov.kalit}` },
        body: forma,
      });
    } catch (e) {
      const vaqt = (e as { name?: string } | null)?.name === 'AbortError';
      return { ok: false, sabab: vaqt ? 'vaqt' : 'tarmoq', holat: 0, tafsilot: vaqt ? 'javob kechikdi' : maxfiyniTozala(e).slice(0, 200), urinish };
    } finally {
      clearTimeout(soat);
    }

    if (r.ok) {
      const d = (await r.json().catch(() => null)) as { text?: string } | null;
      return { ok: true, matn: (d?.text ?? '').replace(/\s+/g, ' ').trim(), model: p.model, urinish };
    }

    const x = xatoniOqi(await r.text().catch(() => ''));
    const tafsilot = maxfiyniTozala(`${x.kod ? `${x.kod}: ` : ''}${x.xabar}`).slice(0, 200);
    oxirgi = { ok: false, sabab: sababniAniqla(r.status, x), holat: r.status, tafsilot, urinish };

    const m = `${x.xabar} ${x.kod}`.toLowerCase();
    const rad = r.status === 400 || r.status === 422;

    /* Parametr rad etildi: shuni olib tashlab qayta uramiz */
    if (rad && p.til && /language/.test(m)) {
      p.til = false;
      continue;
    }
    if (rad && p.harorat && /temperature/.test(m)) {
      p.harorat = false;
      continue;
    }
    if (rad && p.izoh && /prompt/.test(m)) {
      p.izoh = false;
      continue;
    }
    /* Model yo'q yoki unga ruxsat yo'q: eng ishonchli modelga qaytamiz */
    if (p.model !== ZAXIRA_MODELI && (oxirgi.sabab === 'model' || (rad && /model/.test(m)))) {
      p.model = ZAXIRA_MODELI;
      continue;
    }
    /* Provayderning vaqtincha xatosi: bir marta qayta */
    if (r.status >= 500 && besh++ === 0) {
      await new Promise((ok) => setTimeout(ok, 400));
      continue;
    }
    break;
  }
  return oxirgi;
}
