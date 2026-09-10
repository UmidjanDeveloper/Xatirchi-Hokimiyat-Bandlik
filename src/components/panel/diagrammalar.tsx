import type { VoronkaBosqichi, MahallaQamrovi } from '@/lib/tahlil';
import { ISHSIZ_HOLATI } from '@/components/ishsiz/holat-nishoni';
import { MABLAG_YONALISHI, MASUL_TASHKILOT, kirillcha } from '@/lib/constants';

/**
 * ============================================================
 *  PANEL DIAGRAMMALARI
 *
 *  Diagrammalar kutubxonasiz, oddiy HTML va CSS bilan chizilgan.
 *  Sabab amaliy: bu yerdagi barcha shakllar - yotiq ustunlar, va
 *  ularning har birida qiymat ustunning yonida OCHIQ yozilgan.
 *
 *  Bu ataylab qilingan: hokim panelni proyektorda yoki telefonda
 *  ko'radi, sichqoncha bilan ustun ustiga borib turmaydi. Raqam
 *  hover ortida yashiringan diagramma unga foydasiz. Shu sababli
 *  hech bir ma'lumot faqat hover'da ko'rinmaydi - hover faqat
 *  qatorni ajratib ko'rsatadi.
 * ============================================================
 */

const raqam = (n: number) => n.toLocaleString('ru-RU');

const pul = (som: number) =>
  som >= 1_000_000_000
    ? `${(som / 1_000_000_000).toFixed(1)} млрд`
    : som >= 1_000_000
      ? `${Math.round(som / 1_000_000)} млн`
      : raqam(som);

// ─────────────────────────────────────────────────────────────
//  VORONKA
// ─────────────────────────────────────────────────────────────

export function Voronka({
  bosqichlar,
  bazaIshsiz,
}: {
  bosqichlar: VoronkaBosqichi[];
  bazaIshsiz: number;
}) {
  const eng = bosqichlar[0]?.soni ?? 0;

  return (
    <section className="karta p-4 sm:p-5">
      <h2 className="text-sm font-bold text-ink">Бандлик воронкаси</h2>
      <p className="mt-1 text-xs text-ink-faint">
        Рўйхатдаги {raqam(bazaIshsiz)} та ишсизнинг ҳар босқичдаги улуши
      </p>

      <div className="mt-4 space-y-2">
        {bosqichlar.map((b) => {
          const bosqich = ISHSIZ_HOLATI[b.holati].bosqich;
          const kenglik = eng > 0 ? Math.max(2, (b.soni / eng) * 100) : 0;

          return (
            <div key={b.holati} className="group">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: `var(--step-${bosqich})` }}
                    aria-hidden="true"
                  />
                  {ISHSIZ_HOLATI[b.holati].kirill}
                </span>
                <span className="raqam shrink-0 text-xs text-ink-faint">
                  <b className="text-sm text-ink">{raqam(b.soni)}</b> · {b.foiz}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${kenglik}%`,
                    background: `var(--step-${bosqich})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAHALLA REYTINGI
// ─────────────────────────────────────────────────────────────

export function QamrovReytingi({
  qamrov,
  sarlavha,
  izoh,
  maydon,
  ortadan,
  soni = 12,
}: {
  qamrov: MahallaQamrovi[];
  sarlavha: string;
  izoh: string;
  maydon: 'qamrovFoizi' | 'natijaFoizi';
  /** `true` - eng past ko'rsatkichlilar birinchi (orqada qolganlar) */
  ortadan: boolean;
  soni?: number;
}) {
  /*
   * 70 ta mahallaning hammasini chizish - o'qib bo'lmaydigan devor.
   * Hokimga kerak bo'lgani "hamma qanday" emas, "kim orqada qolgan".
   * Shuning uchun faqat eng past 12 tasi ko'rsatiladi, to'liq
   * ro'yxat esa quyidagi jadvalda turadi.
   */
  const royxat = [...qamrov]
    /*
     * Natija reytingida FAQAT xatlovi boshlangan mahallalar turadi.
     *
     * Aks holda ikkala reyting bir xil ro'yxatni ko'rsatadi: xatlov
     * boshlanmagan mahallada joylashtirish ham 0% bo'ladi va u
     * ikkinchi jadvalni ham to'ldirib tashlaydi. Holbuki bu ikki
     * xil muammo: birida xatlov umuman qilinmagan, ikkinchisida
     * xatlov qilingan-u, ish boshlanmagan.
     */
    .filter((m) => m.bazaIshsiz > 0 && (maydon === 'qamrovFoizi' || m.aniqlangan > 0))
    .sort((a, b) => (ortadan ? a[maydon] - b[maydon] : b[maydon] - a[maydon]))
    .slice(0, soni);

  if (royxat.length === 0) return null;

  return (
    <section className="karta p-4 sm:p-5">
      <h2 className="text-sm font-bold text-ink">{sarlavha}</h2>
      <p className="mt-1 text-xs text-ink-faint">{izoh}</p>

      <div className="mt-4 space-y-1.5">
        {royxat.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2.5 rounded px-1 py-1 transition-colors hover:bg-surface-muted"
          >
            <span className="w-24 shrink-0 truncate text-xs text-ink-muted sm:w-32">
              {m.nomiKirill}
            </span>

            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(1.5, m[maydon]))}%`,
                  background:
                    m[maydon] < 25
                      ? 'var(--danger)'
                      : m[maydon] < 50
                        ? 'var(--warn)'
                        : 'var(--step-3)',
                }}
              />
            </div>

            <span className="raqam w-20 shrink-0 text-right text-xs text-ink-faint">
              <b className="text-ink">
                {maydon === 'qamrovFoizi' ? m.aniqlangan : m.joylashtirilgan}
              </b>
              /{m.bazaIshsiz}
            </span>
            <span className="raqam w-11 shrink-0 text-right text-xs font-semibold text-ink">
              {m[maydon]}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  KECHIKKAN TOPSHIRIQLAR
// ─────────────────────────────────────────────────────────────

export function KechikkanlarBlogi({
  kechikkanlar,
}: {
  kechikkanlar: { tashkilot: string; soni: number }[];
}) {
  if (kechikkanlar.length === 0) {
    return (
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">Муддати ўтган топшириқлар</h2>
        <p className="quti-ok mt-3">Муддати ўтган топшириқ йўқ.</p>
      </section>
    );
  }

  const eng = kechikkanlar[0].soni;

  return (
    <section className="karta p-4 sm:p-5">
      <h2 className="text-sm font-bold text-ink">Муддати ўтган топшириқлар</h2>
      <p className="mt-1 text-xs text-ink-faint">Масъул ташкилот кесимида</p>

      <div className="mt-4 space-y-1.5">
        {kechikkanlar.map((k) => (
          <div
            key={k.tashkilot}
            className="flex items-center gap-2.5 rounded px-1 py-1 transition-colors hover:bg-surface-muted"
          >
            <span className="w-28 shrink-0 truncate text-xs text-ink-muted sm:w-40">
              {kirillcha(MASUL_TASHKILOT, k.tashkilot)}
            </span>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-danger"
                style={{ width: `${Math.max(3, (k.soni / eng) * 100)}%` }}
              />
            </div>
            <span className="raqam w-8 shrink-0 text-right text-sm font-bold text-danger">
              {k.soni}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  BYUDJET TALABI
// ─────────────────────────────────────────────────────────────

export function ByudjetBlogi({
  byudjet,
  jamiTalab,
}: {
  byudjet: { yonalish: string; summa: number; oila: number }[];
  jamiTalab: number;
}) {
  if (byudjet.length === 0) return null;

  const eng = byudjet[0].summa;

  return (
    <section className="karta p-4 sm:p-5">
      <h2 className="text-sm font-bold text-ink">Кредит-субсидия талаби</h2>
      <p className="mt-1 text-xs text-ink-faint">
        Жами <b className="raqam text-ink">{pul(jamiTalab)} сўм</b> — бюджет режаси учун
      </p>

      <div className="mt-4 space-y-1.5">
        {byudjet.slice(0, 10).map((b) => (
          <div
            key={b.yonalish}
            className="flex items-center gap-2.5 rounded px-1 py-1 transition-colors hover:bg-surface-muted"
          >
            <span className="w-24 shrink-0 truncate text-xs text-ink-muted sm:w-36">
              {kirillcha(MABLAG_YONALISHI, b.yonalish)}
            </span>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (b.summa / eng) * 100)}%`,
                  background: 'var(--step-3)',
                }}
              />
            </div>
            <span className="raqam w-20 shrink-0 text-right text-xs font-semibold text-ink">
              {pul(b.summa)}
            </span>
            <span className="raqam hidden w-14 shrink-0 text-right text-xs text-ink-faint sm:block">
              {b.oila} оила
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  KURS TALABI
// ─────────────────────────────────────────────────────────────

export function KursTalabiBlogi({
  kurslar,
  chegara = 15,
}: {
  kurslar: { kasb: string; soni: number }[];
  chegara?: number;
}) {
  if (kurslar.length === 0) {
    return (
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">Касб-ҳунар курсларига талаб</h2>
        <p className="mt-3 text-sm text-ink-muted">
          Ҳали бирорта фуқаро аниқ касб кўрсатмаган.
        </p>
      </section>
    );
  }

  const eng = kurslar[0].soni;

  return (
    <section className="karta p-4 sm:p-5">
      <h2 className="text-sm font-bold text-ink">Касб-ҳунар курсларига талаб</h2>
      <p className="mt-1 text-xs text-ink-faint">
        {chegara} тадан ошса — гуруҳ тўлади, курс очиш мумкин
      </p>

      <div className="mt-4 space-y-1.5">
        {kurslar.slice(0, 12).map((k) => {
          const yetarli = k.soni >= chegara;
          return (
            <div
              key={k.kasb}
              className="flex items-center gap-2.5 rounded px-1 py-1 transition-colors hover:bg-surface-muted"
            >
              <span className="w-24 shrink-0 truncate text-xs text-ink-muted sm:w-36">
                {k.kasb}
              </span>
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(3, (k.soni / eng) * 100)}%`,
                    background: yetarli ? 'var(--ok)' : 'var(--step-2)',
                  }}
                />
              </div>
              <span className="raqam w-8 shrink-0 text-right text-sm font-bold text-ink">
                {k.soni}
              </span>
              {/* Rang yolg'iz ma'no tashimasligi uchun matnli belgi ham bor */}
              <span className="hidden w-16 shrink-0 text-right text-[11px] text-ok sm:block">
                {yetarli ? 'гуруҳ тўлади' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
