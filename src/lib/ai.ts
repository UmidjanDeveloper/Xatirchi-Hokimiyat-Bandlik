/**
 * ============================================================
 *  AI ПРОВАЙДЕРИ — битта эшик
 *
 *  Хулоса икки жойда сўралади: туман/маҳалла ҳисоботида
 *  (`hisobot/xulosa.ts`) ва битта хонадон учун
 *  (`xonadon-xulosa.ts`). Илгари ҳар иккиси Anthropic HTTP
 *  сўровини ЎЗИ ёзарди — провайдерни алмаштириш учун иккита
 *  файлни таҳрирлаш керак эди.
 *
 *  Энди иккиси ҳам шу файлдаги `matnSora()` ни чақиради.
 *
 *  ── Қайси провайдер ишлайди ──
 *
 *  Муҳит ўзгарувчисига қараб ЎЗИ танланади:
 *
 *    GEMINI_API_KEY    → Google Gemini
 *    ANTHROPIC_API_KEY → Anthropic Claude
 *    (ҳеч бири йўқ)    → `null`, ва чақирувчи ҚОИДАга тушади
 *
 *  Иккиси ҳам қўйилса — Gemini ишлайди (арзонроқ/текин
 *  даражаси бор). Аниқ танлаш учун `AI_PROVAYDER` ёзилади.
 *
 *  ── Нега хато ташланмайди ──
 *
 *  Бу модул ҲЕЧ ҚАЧОН хато ташламайди, `null` қайтаради. Сабаби:
 *  AI хулосаси — қўшимча, мажбурий эмас. Калит нотўғри бўлса
 *  ёки Google жавоб бермаса, ҳисобот БАРИБИР чиқиши керак —
 *  фақат хулоса қоида бўйича ҳисобланади. Ходим «хулоса
 *  чиқмади» деб ишдан тўхтаб қолмаслиги керак.
 *
 *  Нима нотўғри кетганини билиш учун: `npm run ai-tekshir`.
 * ============================================================
 */

export type Provayder = 'gemini' | 'anthropic';

/** Жавобни кутиш муддати — ошса қоидага тушамиз */
const KUTISH_MS = 20_000;

/**
 * Одатий моделлар.
 *
 * Иккиси ҳам муҳит ўзгарувчиси орқали алмаштирилади: модел
 * номлари вақт ўтиши билан ўзгаради ва бунинг учун кодга
 * тегиш шарт эмас.
 */
const ODATIY_MODEL: Record<Provayder, string> = {
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-sonnet-5',
};

export interface Sorov {
  /** Тизим кўрсатмаси — моделнинг вазифаси */
  tizim: string;
  /** Фойдаланувчи саволи — далилнома */
  savol: string;
  /** Жавобнинг энг кўп узунлиги */
  maxTokens?: number;
}

/** Созланган провайдер — ҳеч бири бўлмаса `null` */
export function joriyProvayder(): Provayder | null {
  const tanlangan = process.env.AI_PROVAYDER?.trim().toLowerCase();
  if (tanlangan === 'gemini') return process.env.GEMINI_API_KEY ? 'gemini' : null;
  if (tanlangan === 'anthropic') return process.env.ANTHROPIC_API_KEY ? 'anthropic' : null;

  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

/** Провайдернинг модели */
export function joriyModel(p: Provayder): string {
  const berilgan = p === 'gemini' ? process.env.GEMINI_MODEL : process.env.ANTHROPIC_MODEL;
  return berilgan?.trim() || ODATIY_MODEL[p];
}

/** Диагностика учун: хато матни билан бирга қайтарадиган натижа */
export interface SorovNatijasi {
  matn: string | null;
  /** Нима бўлгани — фақат `npm run ai-tekshir` учун */
  xato?: string;
}

/**
 * Хато жавобидан ФАҚАТ тушунтиришни ажратиб олади.
 *
 * Google ҳам, Anthropic ҳам хатони ичма-ич JSON да қайтаради ва
 * унинг тўлиқ матни экранга сиғмайди. Керагининг ўзи —
 * `error.message` — ходимга нима қилишни айтади.
 */
async function xatoMatni(javob: Response): Promise<string> {
  const xom = await javob.text().catch(() => '');
  try {
    const d = JSON.parse(xom) as { error?: { message?: string; status?: string } };
    const m = d.error?.message;
    if (m) return d.error?.status ? `${m} (${d.error.status})` : m;
  } catch {
    /* JSON emas - xom matnni qisqartirib beramiz */
  }
  return xom.replace(/\s+/g, ' ').slice(0, 200) || javob.statusText;
}

async function geminiSora(kalit: string, s: Sorov, signal: AbortSignal): Promise<SorovNatijasi> {
  const model = joriyModel('gemini');
  const javob = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': kalit },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: s.tizim }] },
        contents: [{ role: 'user', parts: [{ text: s.savol }] }],
        generationConfig: {
          maxOutputTokens: s.maxTokens ?? 2000,
          temperature: 0.3,
          /*
           * Моделдан ТОЗА JSON сўраймиз — ```json блокисиз.
           * Чақирувчи барибир блокни очишни билади, лекин
           * шундай сўраш жавобни ишончлироқ қилади.
           */
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!javob.ok) {
    return { matn: null, xato: `Gemini ${javob.status}: ${await xatoMatni(javob)}` };
  }

  const d = (await javob.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const nomzod = d.candidates?.[0];
  const matn = nomzod?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  if (!matn.trim()) {
    return {
      matn: null,
      xato: `Gemini bo‘sh javob qaytardi (finishReason: ${nomzod?.finishReason ?? 'noma’lum'})`,
    };
  }
  return { matn };
}

async function anthropicSora(kalit: string, s: Sorov, signal: AbortSignal): Promise<SorovNatijasi> {
  const javob = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': kalit,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: joriyModel('anthropic'),
      max_tokens: s.maxTokens ?? 2000,
      system: s.tizim,
      messages: [{ role: 'user', content: s.savol }],
    }),
  });

  if (!javob.ok) {
    return { matn: null, xato: `Anthropic ${javob.status}: ${await xatoMatni(javob)}` };
  }

  const d = (await javob.json()) as { content?: { type: string; text?: string }[] };
  const matn = d.content?.find((c) => c.type === 'text')?.text ?? '';
  return matn.trim() ? { matn } : { matn: null, xato: 'Anthropic bo‘sh javob qaytardi' };
}

/**
 * Моделдан матн сўрайди.
 *
 * Хато ташламайди: ҳар қандай муаммода `matn: null` қайтади ва
 * чақирувчи қоида бўйича хулосага тушади.
 */
export async function matnSoraBatafsil(s: Sorov): Promise<SorovNatijasi> {
  const provayder = joriyProvayder();
  if (!provayder) return { matn: null, xato: 'AI kaliti sozlanmagan' };

  const toxtatgich = new AbortController();
  const soat = setTimeout(() => toxtatgich.abort(), KUTISH_MS);

  try {
    return provayder === 'gemini'
      ? await geminiSora(process.env.GEMINI_API_KEY as string, s, toxtatgich.signal)
      : await anthropicSora(process.env.ANTHROPIC_API_KEY as string, s, toxtatgich.signal);
  } catch (e) {
    const sabab =
      (e as Error)?.name === 'AbortError'
        ? `Javob ${KUTISH_MS / 1000} soniyada kelmadi`
        : `Aloqa xatosi: ${(e as Error)?.message ?? e}`;
    return { matn: null, xato: sabab };
  } finally {
    clearTimeout(soat);
  }
}

/** Оддий кўриниш — фақат матн керак бўлганда */
export async function matnSora(s: Sorov): Promise<string | null> {
  return (await matnSoraBatafsil(s)).matn;
}
