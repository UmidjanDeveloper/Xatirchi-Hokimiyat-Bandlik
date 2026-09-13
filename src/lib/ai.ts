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

export type Provayder = 'groq' | 'openai' | 'gemini' | 'anthropic';

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
  /*
   * Groq очиқ моделларни тез-тез алмаштиради ва эскиларини
   * ишлатишдан олиб ташлайди — `llama-3.3-70b-versatile` шундай
   * йўқолган. Шунинг учун одатий қиймат ҳам абадий эмас:
   * «модел топилмади» хатосида текширув саҳифаси калитга очиқ
   * рўйхатни кўрсатади ва GROQ_MODEL орқали алмаштирилади.
   */
  groq: 'openai/gpt-oss-120b',
  openai: 'gpt-4o-mini',
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
/** Ҳар провайдернинг калит ўзгарувчиси */
const KALIT_NOMI: Record<Provayder, string> = {
  groq: 'GROQ_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

/** Провайдернинг калити — созланмаган бўлса `null` */
function kalitOl(p: Provayder): string | null {
  return process.env[KALIT_NOMI[p]]?.trim() || null;
}

export function joriyProvayder(): Provayder | null {
  const tanlangan = process.env.AI_PROVAYDER?.trim().toLowerCase() as Provayder | undefined;
  if (tanlangan && tanlangan in KALIT_NOMI) {
    return kalitOl(tanlangan) ? tanlangan : null;
  }

  // Аниқ танланмаган бўлса — топилганининг биринчиси
  for (const p of ['groq', 'openai', 'gemini', 'anthropic'] as Provayder[]) {
    if (kalitOl(p)) return p;
  }
  return null;
}

/** Провайдернинг модели */
export function joriyModel(p: Provayder): string {
  const nomi = {
    groq: 'GROQ_MODEL',
    openai: 'OPENAI_MODEL',
    gemini: 'GEMINI_MODEL',
    anthropic: 'ANTHROPIC_MODEL',
  }[p];
  return process.env[nomi]?.trim() || ODATIY_MODEL[p];
}

/**
 * Калитга очиқ моделлар рўйхати.
 *
 * Модел номлари вақт ўтиши билан ўзгаради ва текин даражадаги
 * калитга ҳамма модел очиқ бўлмайди. «Модел топилмади» хатосига
 * тушганда, тахмин қилиш ўрнига ШУ рўйхатдан танлаш керак.
 *
 * Anthropic да бундай рўйхат керак эмас — у ерда моделлар
 * ҳужжатда аниқ ёзилган ва калитга қараб ўзгармайди.
 */
export async function mavjudModellar(): Promise<{ modellar: string[]; xato?: string }> {
  const p = joriyProvayder();
  if (!p) return { modellar: [], xato: 'AI kaliti sozlanmagan' };
  if (p === 'anthropic') return { modellar: [] };

  const kalit = kalitOl(p) as string;

  try {
    const r = OPENAI_USLUBI[p]
      ? await fetch(`${OPENAI_USLUBI[p]}/models`, {
          headers: { authorization: `Bearer ${kalit}` },
        })
      : await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          headers: { 'x-goog-api-key': kalit },
        });

    if (!r.ok) return { modellar: [], xato: `${r.status}: ${await xatoMatni(r)}` };

    if (OPENAI_USLUBI[p]) {
      const d = (await r.json()) as { data?: { id?: string }[] };
      const modellar = (d.data ?? [])
        .map((m) => m.id ?? '')
        .filter(Boolean)
        /*
         * Овоз, расм ва ўлчов моделлари (whisper, tts, dall-e,
         * embedding...) матн сўровига ярамайди — рўйхатда
         * кўрсатиш чалғитарди.
         */
        .filter(
          (n) =>
            !/whisper|tts|guard|playai|orpheus|dall-e|embedding|moderation|audio|image|realtime|transcribe/i.test(
              n
            )
        )
        .sort();
      return { modellar };
    }

    const d = (await r.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const modellar = (d.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => (m.name ?? '').replace('models/', ''))
      .filter((n) => n.startsWith('gemini'));

    return { modellar };
  } catch (e) {
    return { modellar: [], xato: (e as Error).message };
  }
}

/**
 * Калитнинг ниқобланган кўриниши — диагностика учун.
 *
 * Калитнинг ЎЗИ ҳеч қачон қайтарилмайди: диагностика саҳифаси
 * браузерда очилади ва экран суратга олиниши мумкин. Боши ва
 * охири «мен қўйган калит шумиди?» саволига жавоб бериш учун
 * етарли.
 */
export function kalitNiqobi(): string | null {
  const p = joriyProvayder();
  if (!p) return null;
  const k = kalitOl(p) ?? '';
  if (k.length < 12) return `${'*'.repeat(k.length)} (${k.length} belgi)`;
  return `${k.slice(0, 4)}…${k.slice(-4)} (${k.length} belgi)`;
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

/** OpenAI услубидаги провайдерларнинг манзили */
const OPENAI_USLUBI: Partial<Record<Provayder, string>> = {
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1',
};

/**
 * OpenAI билан мос интерфейс — Groq ҳам, OpenAI нинг ўзи ҳам.
 *
 * Иккиси бир хил сўров шаклини қабул қилади, фақат манзил
 * фарқли. Шунинг учун битта функция иккисига ҳам хизмат
 * қилади — алоҳида ёзиш такрор бўларди.
 *
 * `response_format: json_object` ЮБОРИЛМАЙДИ: Groq даги очиқ
 * моделларнинг ҳаммаси уни қўллаб-қувватламайди ва қўллаб-
 * қувватламагани 400 хатоси билан рад этади. Кўрсатма матнида
 * «фақат JSON» деб ёзилган, жавобни текширадиган
 * `javobniTekshir()` эса ```json блокини ҳам оча олади —
 * шунинг учун қўшимча параметрсиз ҳам ишлайверади.
 */
async function openAiUslubida(
  p: Provayder,
  kalit: string,
  s: Sorov,
  signal: AbortSignal
): Promise<SorovNatijasi> {
  const nomi = p === 'groq' ? 'Groq' : 'OpenAI';
  const javob = await fetch(`${OPENAI_USLUBI[p]}/chat/completions`, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${kalit}` },
    body: JSON.stringify({
      model: joriyModel(p),
      max_tokens: s.maxTokens ?? 2000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: s.tizim },
        { role: 'user', content: s.savol },
      ],
    }),
  });

  if (!javob.ok) {
    return { matn: null, xato: `${nomi} ${javob.status}: ${await xatoMatni(javob)}` };
  }

  const d = (await javob.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
  };
  const tanlov = d.choices?.[0];
  const matn = tanlov?.message?.content ?? '';

  if (!matn.trim()) {
    return {
      matn: null,
      xato: `${nomi} bo‘sh javob qaytardi (finish_reason: ${tanlov?.finish_reason ?? 'noma’lum'})`,
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
    const kalit = kalitOl(provayder) as string;
    if (provayder === 'groq' || provayder === 'openai') {
      return await openAiUslubida(provayder, kalit, s, toxtatgich.signal);
    }
    if (provayder === 'gemini') return await geminiSora(kalit, s, toxtatgich.signal);
    return await anthropicSora(kalit, s, toxtatgich.signal);
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
