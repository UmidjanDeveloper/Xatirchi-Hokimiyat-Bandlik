'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, Loader2, Undo2, X } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  ЖОЙЛАШТИРИШ ВА УНИ БЕКОР ҚИЛИШ
 *
 *  Иш жойи ҚЎЛДА ТЕРИЛМАЙДИ. Мутахассис эълонни танлайди, корхона
 *  номи ва лавозим эълондан кўчирилади. Шунинг учун бу ерда
 *  фақат иккита савол қолади: сана ва тасдиқ.
 *
 *  Тасдиқ сўралишининг сабаби: жойлаштириш ЎРИН БАНД ҚИЛАДИ ва
 *  бошқа номзодга таклиф қилинмай қолади. Бир босишда бўладиган
 *  амал эмас.
 * ============================================================
 */

interface Props {
  orinId: string;
  ishsizId: string;
  /** Тасдиқ матнида кўрсатиладиган ном (фуқаро ёки корхона) */
  nomi: string;
  /** Жойлаштиришга тўсиқ бўлса — матни */
  tosiq?: string | null;
  /** Кичик тугма — рўйхат ичида */
  kichik?: boolean;
}

const SANA_BUGUN = () => new Date().toISOString().slice(0, 10);

export function JoylashtirishTugmasi({ orinId, ishsizId, nomi, tosiq, kichik }: Props) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [ochiq, setOchiq] = useState(false);
  const [sana, setSana] = useState(SANA_BUGUN);
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function yubor() {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/ish-orinlari/${orinId}/joylashtirish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ishsizId, ishgaKirganSana: sana || null }),
      });
      const natija = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(natija.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      setOchiq(false);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  if (!ochiq) {
    return (
      <button
        type="button"
        onClick={() => setOchiq(true)}
        className={`flex shrink-0 items-center gap-1.5 tugma-asosiy rounded-md font-semibold ${
          kichik ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
        }`}
      >
        <BriefcaseBusiness className={kichik ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {tr('Жойлаштириш')}
      </button>
    );
  }

  return (
    <div className="w-full rounded-md border border-line bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          {tr('Жойлаштириш:')} {nomi}
        </p>
        <button
          type="button"
          onClick={() => setOchiq(false)}
          aria-label={tr('Ёпиш')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {tosiq && <div className="quti-ogoh mt-2">{tr(tosiq)}</div>}
      {xato && <div className="quti-xato mt-2">{xato}</div>}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <label htmlFor={`sana-${ishsizId}`} className="block text-xs font-medium text-ink-muted">
            {tr('Ишга кирган сана')}
          </label>
          <input
            id={`sana-${ishsizId}`}
            type="date"
            value={sana}
            max={SANA_BUGUN()}
            onChange={(e) => setSana(e.target.value)}
            className="raqam rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <button
          type="button"
          onClick={yubor}
          disabled={yuborilmoqda}
          className="flex items-center gap-1.5 tugma-asosiy rounded-md px-4 py-2 text-sm font-semibold"
        >
          {yuborilmoqda ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BriefcaseBusiness className="h-4 w-4" />
          )}
          {tr('Тасдиқлаш')}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-ink-faint">
        {tr('Тасдиқлангач иш ўрни БАНД бўлади ва бошқа номзодга таклиф қилинмайди.')}
      </p>
    </div>
  );
}

/**
 * Жойлаштиришни бекор қилиш.
 *
 * Икки хил сабаб бўлади ва улар БОШҚА-БОШҚА натижа беради:
 *   · фуқаро ишдан бош тортди — «рад этди» ҳолатига ўтади;
 *   · хато белгиланган эди — аввалги ҳолатига қайтади.
 * Шунинг учун сабаб ихтиёрий: ёзилса — рад этиш, ёзилмаса —
 * оддий бекор қилиш.
 */
export function BekorQilishTugmasi({
  orinId,
  ishsizId,
  nomi,
}: {
  orinId: string;
  ishsizId: string;
  nomi: string;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [ochiq, setOchiq] = useState(false);
  const [sababi, setSababi] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function yubor() {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/ish-orinlari/${orinId}/joylashtirish`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ishsizId, sababi: sababi.trim() || null }),
      });
      const natija = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(natija.xabar ?? tr('Бекор қилиб бўлмади'));
        return;
      }
      setOchiq(false);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  if (!ochiq) {
    return (
      <button
        type="button"
        onClick={() => setOchiq(true)}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-danger hover:text-danger"
      >
        <Undo2 className="h-3.5 w-3.5" />
        {tr('Жойлаштиришни бекор қилиш')}
      </button>
    );
  }

  return (
    <div className="w-full rounded-md border border-line bg-surface-muted p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          {tr('Бекор қилиш:')} {nomi}
        </p>
        <button
          type="button"
          onClick={() => setOchiq(false)}
          aria-label={tr('Ёпиш')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {xato && <div className="quti-xato mt-2">{xato}</div>}

      <div className="mt-3 space-y-1.5">
        <label htmlFor={`sabab-${ishsizId}`} className="block text-xs font-medium text-ink-muted">
          {tr('Бош тортиш сабаби — ёзилса, фуқаро «рад этди» ҳолатига ўтади')}
        </label>
        <input
          id={`sabab-${ishsizId}`}
          value={sababi}
          onChange={(e) => setSababi(e.target.value)}
          placeholder={tr('бўш қолдирилса — аввалги ҳолатига қайтади')}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
      </div>

      <button
        type="button"
        onClick={yubor}
        disabled={yuborilmoqda}
        className="mt-3 flex items-center gap-1.5 rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger-bg disabled:opacity-45"
      >
        {yuborilmoqda ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
        {tr('Бекор қилиш')}
      </button>

      <p className="mt-2 text-[11px] text-ink-faint">
        {tr('Иш ўрни бўшайди ва эълон тўлгани учун ёпилган бўлса, қайта очилади.')}
      </p>
    </div>
  );
}
