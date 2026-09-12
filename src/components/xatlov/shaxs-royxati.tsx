'use client';

import { Plus, X } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { NOGIRONLIK_GURUHI, OILADAGI_ORNI } from '@/lib/constants';
import { bosShaxs, type ShaxsQatori } from './holat';
import { MatnMaydoni, TanlovMaydoni } from './maydonlar';

/**
 * ============================================================
 *  SHAXSLAR RO'YXATI
 *
 *  Nogironligi bo'lgan va parvarishga muhtoj oila a'zolari uchun.
 *
 *  Ilgari bu bitta erkin matn maydoni edi - "Ким ва қайси гуруҳ".
 *  Xodimlar har xil yozardi: "o'g'lim 2-guruh", "Aliyev A.,
 *  nogiron", "onasi qarovsiz". Natijada:
 *
 *    - nechta nogiron borligini sanab bo'lmasdi
 *    - kim ekanini aniqlab bo'lmasdi (ism yo'q edi)
 *    - chora-tadbir kimga tegishli ekani noaniq qolardi
 *
 *  Endi har bir shaxs alohida yozuv: F.I.Sh. va oiladagi o'rni.
 *  "Boshqa" tanlanganda matn maydoni ochiladi - qaynona, nabira,
 *  jiyan kabi holatlar ro'yxatga sig'maydi.
 * ============================================================
 */
export function ShaxsRoyxati({
  yorliq,
  izoh,
  qatorlar,
  ozgardi,
  guruhSora = false,
}: {
  yorliq: string;
  izoh?: string;
  qatorlar: ShaxsQatori[];
  ozgardi: (yangi: ShaxsQatori[]) => void;
  /** Nogironlik guruhi so'ralsinmi (parvarishda kerak emas) */
  guruhSora?: boolean;
}) {
  const { t: tr } = useAlifbo();

  const yangila = (qatorId: string, maydon: keyof ShaxsQatori, qiymat: unknown) =>
    ozgardi(
      qatorlar.map((q) => (q.qatorId === qatorId ? { ...q, [maydon]: qiymat } : q))
    );

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">{yorliq}</p>
        {izoh && <p className="mt-0.5 text-xs text-ink-faint">{izoh}</p>}
      </div>

      {qatorlar.map((q, i) => (
        <div key={q.qatorId} className="karta space-y-3 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted">
              {i + 1}-{tr('шахс')}
            </span>
            <button
              type="button"
              onClick={() => ozgardi(qatorlar.filter((y) => y.qatorId !== q.qatorId))}
              aria-label={tr('Ўчириш')}
              className="rounded p-1 text-ink-faint transition-colors hover:bg-danger-bg hover:text-danger"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MatnMaydoni
              yorliq={tr('Ф.И.Ш.')}
              majburiy
              qiymat={q.fish}
              ozgardi={(v) => yangila(q.qatorId, 'fish', v)}
            />

            <TanlovMaydoni
              yorliq={tr('Оиладаги ўрни')}
              majburiy
              variantlar={OILADAGI_ORNI}
              qiymat={q.orni}
              ozgardi={(v) => yangila(q.qatorId, 'orni', v)}
            />

            {/* Matn maydoni FAQAT "Boshqa" tanlanganda ochiladi */}
            {q.orni === 'Boshqa' && (
              <MatnMaydoni
                yorliq={tr('«Бошқа» — ким')}
                majburiy
                placeholder={tr('масалан, қайнона')}
                qiymat={q.orniIzoh}
                ozgardi={(v) => yangila(q.qatorId, 'orniIzoh', v)}
              />
            )}

            {guruhSora && (
              <TanlovMaydoni
                yorliq={tr('Ногиронлик гуруҳи')}
                variantlar={NOGIRONLIK_GURUHI}
                qiymat={q.guruhi}
                ozgardi={(v) => yangila(q.qatorId, 'guruhi', v)}
              />
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => ozgardi([...qatorlar, bosShaxs()])}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-line px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {qatorlar.length ? tr('Яна шахс қўшиш') : tr('Шахс қўшиш')}
      </button>
    </div>
  );
}
