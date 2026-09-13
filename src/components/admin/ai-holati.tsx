'use client';

import { useState } from 'react';
import { CircleCheck, CircleX, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  AI УЛАНИШИ — ҲОЛАТИ
 *
 *  Илова AI калити нотўғри бўлса ҳам ИШЛАЙВЕРАДИ: хулоса
 *  жимгина қоида бўйича ҳисобланади. Бу атайлаб шундай —
 *  ходим ишдан тўхтамаслиги керак. Аммо созлаш пайтида бу
 *  чалкаштиради: «калитни қўйдим, нега ўзгармади?»
 *
 *  Шу тугма ўша саволга жавоб беради.
 * ============================================================
 */

interface Natija {
  sozlangan: boolean;
  xabar?: string;
  provayder?: string;
  model?: string;
  kalit?: string | null;
  modellar?: string[];
  modelMosmi?: boolean | null;
  ok?: boolean;
  javob?: string | null;
  kirillmi?: boolean | null;
  xato?: string | null;
}

/** Провайдерга қараб модел ўзгарувчисининг номи */
const MODEL_OZGARUVCHISI: Record<string, string> = {
  groq: 'GROQ_MODEL',
  openai: 'OPENAI_MODEL',
  gemini: 'GEMINI_MODEL',
  anthropic: 'ANTHROPIC_MODEL',
};

/** Калит қаердан олинади */
const KALIT_MANBAI: Record<string, string> = {
  groq: 'console.groq.com/keys (калит «gsk_…» билан бошланади)',
  openai: 'platform.openai.com/api-keys (калит «sk-…» билан бошланади)',
  gemini: 'aistudio.google.com/apikey (калит «AIza…» билан бошланади)',
  anthropic: 'console.anthropic.com (калит «sk-ant-…» билан бошланади)',
};

/** Хатога қараб аниқ маслаҳат */
function maslahat(xato: string, model: string, provayder: string): string | null {
  if (/401|403|API.?KEY|API key|INVALID_ARGUMENT|UNAUTHENTICATED|invalid_api_key/i.test(xato)) {
    return `Калит нотўғри ёки фаоллаштирилмаган. Калит бу ердан олинади: ${KALIT_MANBAI[provayder] ?? ''}`;
  }
  if (/404|not found|NOT_FOUND|model_not_found|decommissioned/i.test(xato)) {
    return `«${model}» модели топилмади ёки ишлатилмай қўйилган. Қуйидаги рўйхатдан бирини танлаб, ${
      MODEL_OZGARUVCHISI[provayder] ?? 'MODEL'
    } ўзгарувчисига ёзинг.`;
  }
  if (/insufficient_quota|billing|exceeded your current quota/i.test(xato)) {
    return 'Ҳисобда маблағ қолмаган. OpenAI API текин эмас — platform.openai.com/settings/organization/billing да тўлдириш керак.';
  }
  if (/429|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(xato)) {
    return 'Лимит тугаган. Бир оздан сўнг ёки эртага ўзи тикланади.';
  }
  if (/сонияда келмади|timeout|abort/i.test(xato)) {
    return 'Жавоб вақтида келмади. Қайта уриниб кўринг.';
  }
  return null;
}

export function AiHolati() {
  const { t: tr } = useAlifbo();
  const [natija, setNatija] = useState<Natija | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [tarmoqXatosi, setTarmoqXatosi] = useState<string | null>(null);

  async function tekshir() {
    if (yuklanmoqda) return;
    setYuklanmoqda(true);
    setTarmoqXatosi(null);
    try {
      const javob = await fetch('/api/admin/ai-tekshir', { method: 'POST' });
      const d = (await javob.json().catch(() => null)) as Natija | null;
      if (!javob.ok || !d) {
        setTarmoqXatosi(tr('Текширувни бажариб бўлмади'));
        return;
      }
      setNatija(d);
    } catch {
      setTarmoqXatosi(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuklanmoqda(false);
    }
  }

  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {tr('Сунъий интеллект уланиши')}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-ink-faint">
            {tr('Калит нотўғри бўлса ҳам тизим ишлайверади — хулоса жимгина белгиланган чегаралар бўйича ҳисобланади. Шунинг учун уланишни шу ердан текшириб туринг.')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void tekshir()}
          disabled={yuklanmoqda}
          className="flex shrink-0 items-center gap-1.5 tugma-asosiy rounded-md px-4 py-2 text-sm font-semibold"
        >
          {yuklanmoqda ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {tr('Текшириш')}
        </button>
      </div>

      {tarmoqXatosi && <div className="quti-xato mt-3">{tarmoqXatosi}</div>}

      {natija && !natija.sozlangan && (
        <div className="quti-ogoh mt-3">
          <p className="font-semibold">{tr('Калит созланмаган')}</p>
          <p className="mt-1 text-xs leading-relaxed">{tr(natija.xabar ?? '')}</p>
        </div>
      )}

      {natija?.sozlangan && (
        <div className="mt-4 space-y-3">
          {/* ── Созламалар ── */}
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3 border-b border-line pb-2">
              <dt className="text-ink-faint">{tr('Провайдер')}</dt>
              <dd className="font-medium text-ink">{natija.provayder}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line pb-2">
              <dt className="text-ink-faint">{tr('Модел')}</dt>
              <dd className="raqam font-medium text-ink">{natija.model}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line pb-2 sm:col-span-2">
              <dt className="text-ink-faint">{tr('Калит')}</dt>
              <dd className="raqam text-ink-muted">{natija.kalit}</dd>
            </div>
          </dl>

          {/* ── Натижа ── */}
          {natija.ok ? (
            <div className="quti-ok">
              <p className="flex items-center gap-1.5 font-semibold">
                <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                {tr('Уланиш ишлайди — хулосалар сунъий интеллект билан тайёрланади.')}
              </p>
              {natija.javob && (
                <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed opacity-90">
                  {natija.javob}
                </p>
              )}
              {natija.kirillmi === false && (
                <p className="mt-2 text-[11px]">
                  {tr('Диққат: модел кирилл ёзувида жавоб бермади. Хулоса матни бошқа ёзувда чиқиши мумкин.')}
                </p>
              )}
            </div>
          ) : (
            <div className="quti-xato">
              <p className="flex items-center gap-1.5 font-semibold">
                <CircleX className="h-4 w-4 shrink-0" aria-hidden="true" />
                {tr('Уланиш ишламади')}
              </p>
              {natija.xato && (
                <p className="mt-1.5 break-words text-[11px] leading-relaxed opacity-90">
                  {natija.xato}
                </p>
              )}
              {natija.xato && maslahat(natija.xato, natija.model ?? '', natija.provayder ?? '') && (
                <p className="mt-2 text-xs leading-relaxed">
                  {tr(maslahat(natija.xato, natija.model ?? '', natija.provayder ?? '') as string)}
                </p>
              )}
              <p className="mt-2 text-[11px] opacity-90">
                {tr('Тизим бундай ҳолатда ҳам тўлиқ ишлайди — хулоса чегаралар бўйича ҳисобланади.')}
              </p>
            </div>
          )}

          {/* ── Модел рўйхатда борми ── */}
          {natija.modelMosmi === false && (
            <div className="quti-ogoh flex items-start gap-1.5">
              <TriangleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {tr(`Созланган модел калитингизга очиқ моделлар рўйхатида ЙЎҚ. Қуйидагилардан бирини ${MODEL_OZGARUVCHISI[natija.provayder ?? ''] ?? 'MODEL'} ўзгарувчисига ёзинг.`)}
              </span>
            </div>
          )}

          {(natija.modellar?.length ?? 0) > 0 && (
            <details className="rounded-md border border-line p-3">
              <summary className="cursor-pointer text-xs font-medium text-ink-muted">
                {tr('Калитингизга очиқ моделлар')} ({natija.modellar?.length})
              </summary>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {natija.modellar?.map((m) => (
                  <li
                    key={m}
                    className={`raqam rounded px-2 py-1 text-[11px] ${
                      m === natija.model
                        ? 'bg-accent-soft font-semibold text-accent'
                        : 'bg-surface-muted text-ink-muted'
                    }`}
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
