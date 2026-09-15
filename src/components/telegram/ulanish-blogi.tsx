'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Loader2, Send, Unlink } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  TELEGRAM НИ БОҒЛАШ
 *
 *  Ходим бир марталик код олади ва уни ботга юборади. Бот
 *  чат ID ни билиб олади ва ҳисобга боғлайди.
 *
 *  ── Нега администратор қўлда кирита олмайди ──
 *
 *  Чат ID — узун рақам. Битта белги хато терилса, хабар
 *  БЕГОНА одамга кетади ва буни ҳеч ким сезмайди: юборилди
 *  деб белгиланади, фақат бошқа одам ўқийди.
 *
 *  Код орқали боғлашда бундай хато бўлмайди: ID ни Telegram
 *  нинг ўзи айтади.
 *
 *  ── Нега код 15 дақиқа яшайди ──
 *
 *  Код экранда очиқ туради ва ёнидан ўтган одамнинг кўзига
 *  тушиши мумкин. Қисқа муддат бу хавфни камайтиради.
 * ============================================================
 */

export function UlanishBlogi({
  ulangan,
  ulanganSana,
  botNomi,
}: {
  ulangan: boolean;
  ulanganSana: string | null;
  /** Bot foydalanuvchi nomi - havola yasash uchun */
  botNomi: string | null;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [kod, setKod] = useState<string | null>(null);
  const [kochirildi, setKochirildi] = useState(false);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function kodOl() {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch('/api/telegram/ulanish', { method: 'POST' });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Код олиб бўлмади'));
        return;
      }
      setKod(d.kod);
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  async function uz() {
    if (yuborilmoqda) return;
    setYuborilmoqda(true);
    try {
      await fetch('/api/telegram/ulanish', { method: 'DELETE' });
      setKod(null);
      router.refresh();
    } finally {
      setYuborilmoqda(false);
    }
  }

  /* ── БОҒЛАНГАН ── */
  if (ulangan) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-ok bg-ok-bg p-3">
        <Check className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ok">{tr('Telegram уланган')}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {tr('Маҳаллангизга мос бўш иш ўрни чиққанда хабар келади')}
            {ulanganSana ? ` · ${ulanganSana}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void uz()}
          disabled={yuborilmoqda}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {yuborilmoqda ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {tr('Узиш')}
        </button>
      </div>
    );
  }

  /* ── КОД ОЛИНГАН ── */
  if (kod) {
    return (
      <div className="rounded-md border border-accent bg-accent-soft p-3.5">
        <p className="text-sm font-medium text-ink">{tr('Кодни ботга юборинг')}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <code className="raqam rounded-md border border-line bg-surface px-3 py-2 text-lg font-bold tracking-widest text-ink">
            {kod}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(kod).then(
                () => {
                  setKochirildi(true);
                  setTimeout(() => setKochirildi(false), 2000);
                },
                () => setXato(tr('Нусха кўчириб бўлмади — қўлда теринг'))
              );
            }}
            className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {kochirildi ? (
              <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {kochirildi ? tr('Кўчирилди') : tr('Нусха олиш')}
          </button>

          {botNomi && (
            <a
              href={`https://t.me/${botNomi}?start=${kod}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 tugma-asosiy rounded-md px-3.5 py-2 text-xs font-semibold"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {tr('Ботни очиш')}
            </a>
          )}
        </div>

        <ol className="mt-3 space-y-1 text-xs text-ink-muted">
          <li>
            1. {botNomi ? tr('«Ботни очиш» тугмасини босинг') : tr('Ботни Telegram да топинг')}
          </li>
          <li>2. {tr('Шу кодни ботга юборинг')}</li>
          <li>3. {tr('Бот «Уланиш тасдиқланди» деб жавоб беради')}</li>
        </ol>

        <p className="mt-2 text-[11px] text-ink-faint">
          {tr('Код 15 дақиқа амал қилади. Эскирса — янгисини олинг.')}
        </p>

        {xato && <div className="quti-xato mt-2">{xato}</div>}

        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-3 text-xs font-medium text-accent hover:underline"
        >
          {tr('Юбордим — текшириш')}
        </button>
      </div>
    );
  }

  /* ── БОҒЛАНМАГАН ── */
  return (
    <div className="rounded-md border border-line p-3.5">
      <p className="text-sm font-medium text-ink">{tr('Telegram уланмаган')}</p>
      <p className="mt-1 text-xs text-ink-muted">
        {tr('Уласангиз, маҳаллангизга мос бўш иш ўрни чиққанда дарҳол хабар келади — сайтга кириб текширишингиз шарт бўлмайди.')}
      </p>

      {xato && <div className="quti-xato mt-2">{xato}</div>}

      <button
        type="button"
        onClick={() => void kodOl()}
        disabled={yuborilmoqda}
        className="mt-3 flex items-center gap-1.5 tugma-asosiy rounded-md px-3.5 py-2 text-xs font-semibold"
      >
        {yuborilmoqda ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {tr('Telegram ни улаш')}
      </button>
    </div>
  );
}
