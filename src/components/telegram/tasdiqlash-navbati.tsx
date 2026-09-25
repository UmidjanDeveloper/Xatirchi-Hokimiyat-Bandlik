'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  «ИШ ТОПДИМ» — ТАСДИҚЛАШ НАВБАТИ
 *
 *  Маҳалла ходими Telegram'даги тугмани босди. Бу ерда
 *  бандлик маркази уни кўради ва ҳал қилади.
 *
 *  ── Нега бу блок керак ──
 *
 *  Тугма босилгани билан фуқаро жойлаштирилмайди — рақам
 *  ҳужжат билан тасдиқланиши керак. Агар тасдиқлайдиган
 *  жой БЎЛМАСА, хабарлар базада ётиб қоларди ва занжир шу
 *  ерда узиларди: ходим босган, натижа эса ҳеч қаёққа
 *  бормаган.
 *
 *  Муддати ўтганлар ТЕПАДА ва қизил — марказ қайси хабарни
 *  ушлаб турганини кўрсин.
 * ============================================================
 */

export interface NavbatYozuvi {
  id: string;
  fish: string;
  mahallaNomi: string;
  lavozim: string;
  korxonaNomi: string;
  xabarchi: string;
  muddat: string;
  kechikkan: boolean;
}

export function TasdiqlashNavbati({ yozuvlar }: { yozuvlar: NavbatYozuvi[] }) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [ishlamoqda, setIshlamoqda] = useState<string | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  async function hal(id: string, qaror: 'TASDIQLA' | 'RAD_ET') {
    if (ishlamoqda) return;
    let izoh: string | null = null;
    if (qaror === 'RAD_ET') {
      /*
       * Сабабсиз рад этиб бўлмайди: ходим нима учун рад
       * этилганини билмаса, кейинги сафар ҳам ўшани юборарди.
       */
      izoh = window.prompt(tr('Рад этиш сабабини ёзинг:'));
      if (!izoh?.trim()) return;
    }
    setIshlamoqda(id);
    setXato(null);
    try {
      const javob = await fetch(`/api/joylashuv-xabari/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qaror, izoh }),
      });
      const natija = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(natija.xabar ?? tr('Бажариб бўлмади'));
        return;
      }
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setIshlamoqda(null);
    }
  }

  if (!yozuvlar.length) return null;

  return (
    <section id="qism-tasdiqlash" className="karta scroll-mt-20 p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">
            {tr('Маҳалла ходимлари хабари')}
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {tr('Тасдиқлагунча фуқаро расман жойлаштирилмайди')}
          </p>
        </div>
        <span className="raqam shrink-0 rounded-md bg-warn-bg px-2 py-1 text-xs font-semibold text-warn">
          {yozuvlar.length}
        </span>
      </div>

      {xato && <p className="quti-xato mb-3 text-sm">{xato}</p>}

      <ul className="space-y-2">
        {yozuvlar.map((y) => (
          <li
            key={y.id}
            className={`rounded-lg border p-3 ${
              y.kechikkan ? 'border-danger bg-danger-bg/40' : 'border-line bg-surface'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">{tr(y.fish)}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {tr(y.lavozim)} · {tr(y.korxonaNomi)}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {tr(y.mahallaNomi)} {tr('МФЙ')} · {tr('хабар қилди')}: {tr(y.xabarchi)}
                </p>
                <p
                  className={`mt-1 flex items-center gap-1 text-xs ${
                    y.kechikkan ? 'font-semibold text-danger' : 'text-ink-faint'
                  }`}
                >
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {y.kechikkan ? tr('Муддати ўтган') : tr('Муддат')}: {y.muddat}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => hal(y.id, 'TASDIQLA')}
                  disabled={ishlamoqda !== null}
                  className="tugma-asosiy flex items-center gap-1.5 text-sm disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {ishlamoqda === y.id ? tr('Бажарилмоқда…') : tr('Тасдиқлаш')}
                </button>
                <button
                  type="button"
                  onClick={() => hal(y.id, 'RAD_ET')}
                  disabled={ishlamoqda !== null}
                  className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  {tr('Рад этиш')}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
