'use client';

import { useId } from 'react';
import type { Variant } from '@/lib/constants';

/**
 * ============================================================
 *  ANKETA MAYDONLARI
 *
 *  Formada 60 dan ortiq maydon bor. Har birini qo'lda yozish
 *  o'rniga shu yerdagi bir nechta primitiv ishlatiladi - shunda
 *  xato ko'rsatish, kirill yorliq va telefon klaviaturasi
 *  hamma joyda BIR XIL ishlaydi.
 *
 *  Yorliqlar KIRILLDA: xodim qo'lidagi qog'oz anketa kirillda va
 *  u ikkisini yonma-yon qo'yib to'ldiradi. Yorliq boshqacha
 *  yozilsa, har maydonda "bu o'sha savolmi?" deb o'ylashi kerak
 *  bo'ladi.
 * ============================================================
 */

interface AsosMaydon {
  yorliq: string;
  /** Qo'shimcha izoh - qog'oz anketadagi qavs ichidagi matn */
  izoh?: string;
  xato?: string;
  majburiy?: boolean;
}

function Yorliq({
  htmlFor,
  yorliq,
  izoh,
  majburiy,
}: {
  htmlFor: string;
  yorliq: string;
  izoh?: string;
  majburiy?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-sm font-medium text-ink">
        {yorliq}
        {majburiy && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {izoh && <span className="mt-0.5 block text-xs text-ink-faint">{izoh}</span>}
    </label>
  );
}

function Xato({ xato }: { xato?: string }) {
  if (!xato) return null;
  return (
    <p className="text-xs font-medium text-danger" role="alert">
      {xato}
    </p>
  );
}

const kiritishSinf =
  'w-full rounded-md border bg-surface px-3 py-2.5 text-ink outline-none transition-colors focus:border-accent disabled:opacity-60';

// ─────────────────────────────────────────────────────────────
//  MATN
// ─────────────────────────────────────────────────────────────

export function MatnMaydoni({
  yorliq,
  izoh,
  xato,
  majburiy,
  qiymat,
  ozgardi,
  koptator,
  placeholder,
  turi = 'text',
}: AsosMaydon & {
  qiymat: string;
  ozgardi: (q: string) => void;
  koptator?: boolean;
  placeholder?: string;
  turi?: 'text' | 'tel';
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Yorliq htmlFor={id} yorliq={yorliq} izoh={izoh} majburiy={majburiy} />
      {koptator ? (
        <textarea
          id={id}
          value={qiymat}
          onChange={(e) => ozgardi(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className={`${kiritishSinf} ${xato ? 'maydon-xato' : 'border-line'} resize-y`}
        />
      ) : (
        <input
          id={id}
          type={turi}
          /*
           * Telefon uchun `inputMode="tel"` - telefonda raqamli
           * klaviatura ochiladi. Bu 30 ta xonadon aylanadigan xodim
           * uchun har safar ikki bosishni tejaydi.
           */
          inputMode={turi === 'tel' ? 'tel' : undefined}
          value={qiymat}
          onChange={(e) => ozgardi(e.target.value)}
          placeholder={placeholder}
          className={`${kiritishSinf} ${xato ? 'maydon-xato' : 'border-line'}`}
        />
      )}
      <Xato xato={xato} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  RAQAM
// ─────────────────────────────────────────────────────────────

export function RaqamMaydoni({
  yorliq,
  izoh,
  xato,
  majburiy,
  qiymat,
  ozgardi,
  min = 0,
  max = 100,
  qadam,
  birlik,
}: AsosMaydon & {
  qiymat: number | '' | null;
  ozgardi: (q: number | '') => void;
  min?: number;
  max?: number;
  qadam?: number;
  /** O'lchov birligi - maydon ichida o'ngda chiqadi */
  birlik?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Yorliq htmlFor={id} yorliq={yorliq} izoh={izoh} majburiy={majburiy} />
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode={qadam ? 'decimal' : 'numeric'}
          value={qiymat ?? ''}
          min={min}
          max={max}
          step={qadam}
          onChange={(e) => {
            const v = e.target.value;
            ozgardi(v === '' ? '' : Number(v));
          }}
          className={`${kiritishSinf} raqam ${xato ? 'maydon-xato' : 'border-line'} ${
            birlik ? 'pr-16' : ''
          }`}
        />
        {birlik && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">
            {birlik}
          </span>
        )}
      </div>
      <Xato xato={xato} />
    </div>
  );
}

/**
 * Pul maydoni.
 *
 * Katta raqamni telefonda yozish oson emas: "4500000" da nolni
 * sanab bo'lmaydi. Shuning uchun kiritilgan qiymat maydon ostida
 * bo'shliq bilan ajratib ko'rsatiladi - xodim darhol ko'radi.
 */
export function PulMaydoni({
  yorliq,
  izoh,
  xato,
  majburiy,
  qiymat,
  ozgardi,
}: AsosMaydon & {
  qiymat: number | '' | null;
  ozgardi: (q: number | '') => void;
}) {
  const id = useId();
  const son = typeof qiymat === 'number' ? qiymat : null;

  return (
    <div className="space-y-1.5">
      <Yorliq htmlFor={id} yorliq={yorliq} izoh={izoh} majburiy={majburiy} />
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={qiymat ?? ''}
          min={0}
          onChange={(e) => {
            const v = e.target.value;
            ozgardi(v === '' ? '' : Number(v));
          }}
          className={`${kiritishSinf} raqam pr-14 ${xato ? 'maydon-xato' : 'border-line'}`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">
          сўм
        </span>
      </div>
      {son !== null && son > 0 && (
        <p className="raqam text-xs text-ink-faint">{son.toLocaleString('ru-RU')} сўм</p>
      )}
      <Xato xato={xato} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TANLOV
// ─────────────────────────────────────────────────────────────

/** Bitta variant tanlanadi - radio tugmalar ko'rinishida */
export function TanlovMaydoni({
  yorliq,
  izoh,
  xato,
  majburiy,
  variantlar,
  qiymat,
  ozgardi,
}: AsosMaydon & {
  variantlar: Variant[];
  qiymat: string | null;
  ozgardi: (q: string | null) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Yorliq htmlFor={id} yorliq={yorliq} izoh={izoh} majburiy={majburiy} />
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {variantlar.map((v) => {
          const tanlangan = qiymat === v.qiymat;
          return (
            <button
              key={v.qiymat}
              type="button"
              aria-pressed={tanlangan}
              // Qayta bosilsa tanlov bekor qilinadi - xodim xato bosgan bo'lishi mumkin
              onClick={() => ozgardi(tanlangan ? null : v.qiymat)}
              className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                tanlangan
                  ? 'border-accent bg-accent-soft font-medium text-accent'
                  : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
              }`}
            >
              {v.kirill}
            </button>
          );
        })}
      </div>
      <Xato xato={xato} />
    </div>
  );
}

/** Bir nechta variant tanlanadi */
export function KopTanlovMaydoni({
  yorliq,
  izoh,
  xato,
  majburiy,
  variantlar,
  qiymatlar,
  ozgardi,
}: AsosMaydon & {
  variantlar: Variant[];
  qiymatlar: string[];
  ozgardi: (q: string[]) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Yorliq htmlFor={id} yorliq={yorliq} izoh={izoh} majburiy={majburiy} />
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {variantlar.map((v) => {
          const tanlangan = qiymatlar.includes(v.qiymat);
          return (
            <button
              key={v.qiymat}
              type="button"
              aria-pressed={tanlangan}
              onClick={() =>
                ozgardi(
                  tanlangan
                    ? qiymatlar.filter((x) => x !== v.qiymat)
                    : [...qiymatlar, v.qiymat]
                )
              }
              className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                tanlangan
                  ? 'border-accent bg-accent-soft font-medium text-accent'
                  : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
              }`}
            >
              {v.kirill}
            </button>
          );
        })}
      </div>
      <Xato xato={xato} />
    </div>
  );
}

/**
 * Ha/Yo'q tanlovi.
 *
 * Checkbox emas, ikkita aniq tugma. Checkbox'da "belgilanmagan"
 * holati ikki xil ma'no beradi: "yo'q" yoki "so'ramadim". Anketada
 * bu farq muhim, shuning uchun xodim ataylab bosishi kerak.
 */
export function HaYoqMaydoni({
  yorliq,
  izoh,
  xato,
  qiymat,
  ozgardi,
}: AsosMaydon & {
  qiymat: boolean;
  ozgardi: (q: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <span id={id} className="block text-sm font-medium text-ink">
        {yorliq}
      </span>
      {izoh && <span className="block text-xs text-ink-faint">{izoh}</span>}
      <div className="flex gap-2" role="group" aria-labelledby={id}>
        {[
          { q: true, matn: 'Ҳа' },
          { q: false, matn: 'Йўқ' },
        ].map((v) => (
          <button
            key={String(v.q)}
            type="button"
            aria-pressed={qiymat === v.q}
            onClick={() => ozgardi(v.q)}
            className={`min-w-[5rem] rounded-md border px-4 py-2 text-sm transition-colors ${
              qiymat === v.q
                ? v.q
                  ? 'border-ok bg-ok-bg font-medium text-ok'
                  : 'border-line-strong bg-surface-muted font-medium text-ink'
                : 'border-line bg-surface text-ink-muted hover:border-line-strong'
            }`}
          >
            {v.matn}
          </button>
        ))}
      </div>
      <Xato xato={xato} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  BO'LIM
// ─────────────────────────────────────────────────────────────

export function Bolim({
  raqam,
  sarlavha,
  izoh,
  children,
}: {
  raqam: string;
  sarlavha: string;
  izoh?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="karta space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="bolim-sarlavha">
          <span className="bolim-raqam">{raqam}</span>
          <span className="min-w-0">{sarlavha}</span>
        </h2>
        {izoh && <p className="mt-2 text-xs text-ink-faint">{izoh}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Bo'lim ichida butun kenglikni egallaydigan maydon */
export function ToliqKeng({ children }: { children: React.ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
