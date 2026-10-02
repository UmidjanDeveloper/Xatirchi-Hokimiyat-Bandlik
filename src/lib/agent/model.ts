import { maxfiyniTozala } from '@/lib/maxfiy';
import { joriyModel, type Provayder } from '@/lib/ai';

/**
 * ============================================================
 *  HUDHUD: TIL MODELI BILAN ALOQA (OpenAI uslubidagi "chat completions")
 *
 *  Agent asbob chaqirishi (function calling) kerak, shuning uchun u
 *  `ai.ts` dagi "matn-matn" so'rovlaridan alohida yo'l. Faqat OpenAI va
 *  OpenAI bilan mos Groq qo'llab-quvvatlanadi (ikkalasi bir xil so'rov
 *  shaklini tushunadi).
 *
 *  ── Nega modelga bog'lanmagan ──
 *
 *  `ModelChaqiruvi` — oddiy funksiya turi. Sinovda unga ssenariyli
 *  soxta model beriladi (FAQAT sinovda), haqiqiy tarmoq va kalit kerak
 *  bo'lmaydi. Ishlab chiqarishda `haqiqiyModel()` ishlatiladi; kalit
 *  yo'q bo'lsa u `null` qaytaradi va agent qoidali rejimga tushadi.
 *
 *  ── Sir ──
 *
 *  Kalit hech qachon jurnalga, xato matniga yoki javobga tushmaydi:
 *  xato matni `maxfiyniTozala` dan o'tadi.
 * ============================================================
 */

export interface ChaqiruvQismi {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export type ModelXabari =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ChaqiruvQismi[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface ModelJavobi {
  xabar: { content: string | null; tool_calls?: ChaqiruvQismi[] };
  tokenlar: number;
  tugash: string;
}

export interface ModelSorovi {
  xabarlar: ModelXabari[];
  asboblar: unknown[];
  signal?: AbortSignal;
}

export type ModelChaqiruvi = (s: ModelSorovi) => Promise<ModelJavobi>;

export type ModelXatoKodi = 'vaqt' | 'tarmoq' | 'provayder' | 'bosh';

export class ModelXatosi extends Error {
  constructor(
    public kod: ModelXatoKodi,
    xabar: string
  ) {
    super(xabar);
    this.name = 'ModelXatosi';
  }
}

const BAZA: Record<'openai' | 'groq', string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
};

const KALIT_NOMI: Record<'openai' | 'groq', string> = {
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
};

/** Bitta model chaqiruvining chegarasi; butun suhbat chegarasi `sikl.ts` da */
export const MODEL_KUTISH_MS = 25_000;

export interface AgentProvayderi {
  provayder: 'openai' | 'groq';
  kalit: string;
  baza: string;
  model: string;
}

/**
 * Qaysi provayder ishlaydi:
 *   AGENT_PROVAYDER (openai | groq) → aniq tanlov;
 *   aks holda AI_PROVAYDER shu ikkitadan biri bo'lsa — o'sha;
 *   aks holda OpenAI kaliti bo'lsa — OpenAI, yo'q bo'lsa Groq.
 * Model: AGENT_MODEL, bo'lmasa shu provayderning umumiy modeli (`ai.ts`).
 */
export function agentProvayderi(env: NodeJS.ProcessEnv = process.env): AgentProvayderi | null {
  const kalitOl = (p: 'openai' | 'groq') => env[KALIT_NOMI[p]]?.trim() || null;
  const soralgan = (env.AGENT_PROVAYDER ?? env.AI_PROVAYDER ?? '').trim().toLowerCase();

  let p: 'openai' | 'groq' | null = null;
  if (soralgan === 'openai' || soralgan === 'groq') p = kalitOl(soralgan) ? soralgan : null;
  else p = kalitOl('openai') ? 'openai' : kalitOl('groq') ? 'groq' : null;
  if (!p) return null;

  const model = env.AGENT_MODEL?.trim() || modelNomi(p, env);
  return { provayder: p, kalit: kalitOl(p) as string, baza: BAZA[p], model };
}

function modelNomi(p: Provayder, env: NodeJS.ProcessEnv): string {
  /* `joriyModel` jarayon muhitini o'qiydi; boshqa `env` berilsa, o'sha qiymatni hisobga olamiz */
  const nom = p === 'groq' ? 'GROQ_MODEL' : 'OPENAI_MODEL';
  return env[nom]?.trim() || joriyModel(p);
}

async function xatoMatni(r: Response): Promise<string> {
  const xom = await r.text().catch(() => '');
  try {
    const d = JSON.parse(xom) as { error?: { message?: string } };
    if (d.error?.message) return d.error.message;
  } catch {
    /* matn JSON emas */
  }
  return xom.replace(/\s+/g, ' ').slice(0, 200) || r.statusText;
}

/** Ba'zi modellar `temperature` yoki `max_completion_tokens` ni qabul qilmaydi — moslashamiz */
interface Sozlama {
  temperature: boolean;
  tokenNomi: 'max_completion_tokens' | 'max_tokens';
}

export function haqiqiyModel(prov: AgentProvayderi | null = agentProvayderi()): ModelChaqiruvi | null {
  if (!prov) return null;

  return async ({ xabarlar, asboblar, signal }) => {
    const soz: Sozlama = { temperature: true, tokenNomi: prov.provayder === 'groq' ? 'max_tokens' : 'max_completion_tokens' };

    for (let urinish = 0; urinish < 3; urinish++) {
      const tana: Record<string, unknown> = {
        model: prov.model,
        messages: xabarlar,
        tools: asboblar,
        tool_choice: 'auto',
        [soz.tokenNomi]: 900,
      };
      if (soz.temperature) tana.temperature = 0.2;

      /* Har chaqiruvning o'z chegarasi + umumiy suhbat signali */
      const ctrl = new AbortController();
      const taymer = setTimeout(() => ctrl.abort(), MODEL_KUTISH_MS);
      const tashqi = () => ctrl.abort();
      signal?.addEventListener('abort', tashqi, { once: true });

      let r: Response;
      try {
        r = await fetch(`${prov.baza}/chat/completions`, {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'content-type': 'application/json', authorization: `Bearer ${prov.kalit}` },
          body: JSON.stringify(tana),
        });
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') throw new ModelXatosi('vaqt', 'Model javobi vaqtida kelmadi');
        throw new ModelXatosi('tarmoq', maxfiyniTozala(e));
      } finally {
        clearTimeout(taymer);
        signal?.removeEventListener('abort', tashqi);
      }

      if (!r.ok) {
        const matn = await xatoMatni(r);
        if (r.status === 400 && urinish < 2) {
          if (/temperature/i.test(matn) && soz.temperature) {
            soz.temperature = false;
            continue;
          }
          if (/max_completion_tokens|max_tokens/i.test(matn)) {
            soz.tokenNomi = soz.tokenNomi === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens';
            continue;
          }
        }
        throw new ModelXatosi('provayder', maxfiyniTozala(`${prov.provayder} ${r.status}: ${matn}`));
      }

      const d = (await r.json().catch(() => null)) as {
        choices?: { message?: { content?: string | null; tool_calls?: ChaqiruvQismi[] }; finish_reason?: string }[];
        usage?: { total_tokens?: number };
      } | null;
      const tanlov = d?.choices?.[0];
      if (!tanlov?.message) throw new ModelXatosi('bosh', "Model bo'sh javob qaytardi");
      return {
        xabar: { content: tanlov.message.content ?? null, tool_calls: tanlov.message.tool_calls },
        tokenlar: d?.usage?.total_tokens ?? 0,
        tugash: tanlov.finish_reason ?? '',
      };
    }
    throw new ModelXatosi('provayder', 'Model so‘rov sozlamalarini qabul qilmadi');
  };
}
