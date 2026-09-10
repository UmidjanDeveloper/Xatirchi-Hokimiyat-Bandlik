'use client';

import type { IshsizHolati } from '@prisma/client';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { ISHSIZ_HOLATI } from '@/lib/ishsiz-holati';

/**
 * Holat nishoni: rangli nuqta + matn.
 *
 * Matn oddiy siyoh rangida yoziladi, bosqich rangida emas. Ikki
 * sabab bor. Birinchisi - kontrast: bosqich qatorining ochiq uchi
 * (#86b6ef) oq fonda matn sifatida o'qilmaydi. Ikkinchisi va
 * muhimrogi - rang hech qachon YOLG'IZ ma'no tashimasligi kerak:
 * rangni ajrata olmaydigan odam ham nishonni o'qiy olsin.
 */
export function HolatNishoni({ holati }: { holati: IshsizHolati }) {
  const { t: tr } = useAlifbo();
  const h = ISHSIZ_HOLATI[holati];
  const radEtdi = holati === 'RAD_ETDI';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold ${
        radEtdi ? 'bg-danger-bg text-danger' : 'bg-surface-muted text-ink-muted'
      }`}
    >
      {!radEtdi && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: `var(--step-${h.bosqich})` }}
          aria-hidden="true"
        />
      )}
      {tr(h.kirill)}
    </span>
  );
}
