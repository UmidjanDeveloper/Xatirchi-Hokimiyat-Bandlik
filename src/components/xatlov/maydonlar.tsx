'use client';

import { CircleCheck, TriangleAlert } from 'lucide-react';

import { yoshniBaho } from '@/lib/bandlik-yoshi';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

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
  const { t: tr } = useAlifbo();
  if (!xato) return null;
  return (
    <p className="text-xs font-medium text-danger" role="alert">
      {tr(xato)}
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
  const { t: tr } = useAlifbo();

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
          {tr('сўм')}
        </span>
      </div>
      {son !== null && son > 0 && (
        <p className="raqam text-xs text-ink-faint">{son.toLocaleString('ru-RU')} {tr('сўм')}</p>
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
  const { t: tr } = useAlifbo();

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
              {tr(v.kirill)}
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
  const { t: tr } = useAlifbo();

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
              {tr(v.kirill)}
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
  majburiy,
  qiymat,
  ozgardi,
}: AsosMaydon & {
  /**
   * `null` — ҲАЛИ СЎРАЛМАГАН.
   *
   * Илгари бу майдон оддий `boolean` эди ва ҳамма савол `false`
   * дан бошланарди. Яъни «йўқ» ва «сўрамадим» базада БИР ХИЛ
   * ёзиларди — ҳолбуки бу компонентнинг ўзи айнан шу фарқ учун
   * яратилган эди (пастдаги изоҳга қаранг).
   *
   * Оқибати жиддий: ходим «газ таъминоти» саволини ўтказиб
   * юборса, ҳисоботда у «газсиз хонадон» бўлиб чиқар ва
   * туманнинг газлаштириш режасига нотўғри рақам кирарди.
   *
   * Энди жавобсиз савол ҲЕЧ ҚАЙСИ тугма босилмаган ҳолда
   * туради ва «Юбориш» уни ўтказиб юбормайди.
   */
  qiymat: boolean | null;
  ozgardi: (q: boolean) => void;
}) {
  const { t: tr } = useAlifbo();

  const id = useId();
  return (
    <div className="space-y-1.5">
      <span id={id} className="block text-sm font-medium text-ink">
        {yorliq}
        {majburiy && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {izoh && <span className="block text-xs text-ink-faint">{izoh}</span>}
      <div className="flex gap-2" role="group" aria-labelledby={id}>
        {[
          { q: true, matn: tr('Ҳа') },
          { q: false, matn: tr('Йўқ') },
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
                : xato
                  ? 'maydon-xato bg-surface text-ink-muted'
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

/**
 * Белги майдони — рози бўлишни билдирадиган катакча.
 *
 * `HaYoqMaydoni` ҳам ишлатиш мумкин эди, аммо розилик учун
 * ярамайди. «Ҳа/Йўқ» — бу САВОЛГА ЖАВОБ; розилик эса шахснинг
 * ҚАРОРИ ва у АТАЙЛАБ белгиланиши керак. Иккита тугмадан
 * биттасини босиш тасодифан ҳам бўлиб кетади, бўш катакчани
 * белгилаш эса аниқ ҳаракат.
 *
 * Матннинг ўзи ҳам босилади (`<label>` ичида): планшетда кичик
 * катакчани бармоқ билан аниқ босиш қийин.
 */
export function BelgiMaydoni({
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
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors ${
          xato
            ? 'border-danger bg-danger-bg'
            : qiymat
              ? 'border-ok bg-ok-bg'
              : 'border-line bg-surface hover:border-line-strong'
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={qiymat}
          onChange={(e) => ozgardi(e.target.checked)}
          aria-describedby={izoh ? `${id}-izoh` : undefined}
          className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-[var(--ok)]"
          style={{ width: '1.1rem', height: '1.1rem' }}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-relaxed text-ink">
            {yorliq}
          </span>
          {izoh && (
            <span id={`${id}-izoh`} className="mt-1 block text-xs leading-relaxed text-ink-muted">
              {izoh}
            </span>
          )}
        </span>
      </label>
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

// ─────────────────────────────────────────────────────────────
//  SANA
// ─────────────────────────────────────────────────────────────

/**
 * Sana maydoni.
 *
 * `<input type="date">` ishlatiladi - telefonda tizimning o'z
 * kalendari ochiladi va xodim qo'lda "12.03.1987" deb terishga
 * urinmaydi. Qiymat ichkarida har doim `YYYY-MM-DD`, ya'ni
 * kun/oy tartibi qaysi mamlakatda ochilishidan qat'i nazar
 * bir xil saqlanadi.
 */
export function SanaMaydoni({
  yorliq,
  izoh,
  xato,
  majburiy,
  qiymat,
  ozgardi,
  eng_erta,
  eng_kech,
}: AsosMaydon & {
  qiymat: string;
  ozgardi: (q: string) => void;
  eng_erta?: string;
  eng_kech?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Yorliq htmlFor={id} yorliq={yorliq} izoh={izoh} majburiy={majburiy} />
      <input
        id={id}
        type="date"
        value={qiymat}
        min={eng_erta}
        max={eng_kech}
        onChange={(e) => ozgardi(e.target.value)}
        className={`${kiritishSinf} ${xato ? 'maydon-xato' : 'border-line'}`}
      />
      <Xato xato={xato} />
    </div>
  );
}

/* ── YOSH OGOHLANTIRISHI ─────────────────────────────────────── */

/**
 * Tug'ilgan yil va jinsga qarab bandlik imkoniyatini aytadi.
 *
 * Xodim anketani to'ldirayotgan paytda ko'radi - yuborgandan
 * keyin emas. Bu TO'SIQ emas: nafaqa yoshidagi odam ham oila
 * a'zosi va uning ma'lumoti kerak, shunchaki bandlik markazi
 * unga ish topib bera olmaydi.
 */
export function YoshOgohlantirishi({
  tugilganYili,
  jinsi,
}: {
  tugilganYili: number | '' | null;
  jinsi: string | null;
}) {
  const { t: tr } = useAlifbo();
  const baho = yoshniBaho(tugilganYili === '' ? null : tugilganYili, jinsi);

  if (!baho) return null;

  // Mehnatga layoqatli - bu odatiy holat, ortiqcha xabar bermaymiz
  if (baho.holati === 'layoqatli') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink-faint">
        <CircleCheck className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
        {tr(baho.xabar)}
      </p>
    );
  }

  return (
    <div className="quti-ogoh" role="status">
      <p className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{tr(baho.xabar)}</span>
      </p>
    </div>
  );
}
