import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { jamiSahifa } from '@/lib/sahifalash';

/**
 * Sahifalash tugmalari (server komponenti, JavaScript kerak emas).
 *
 * Boshqa filtrlar (`searchParams`) saqlanadi: sahifani almashtirganda
 * filtr yo'qolib ketmasin.
 */
export function Sahifalash({
  yol,
  joriy,
  jami,
  hajm,
  filtrlar,
}: {
  yol: string;
  joriy: number;
  jami: number;
  hajm: number;
  filtrlar: Record<string, string | undefined>;
}) {
  const tr = matnchi();
  const oxirgi = jamiSahifa(jami, hajm);
  if (oxirgi <= 1) return null;

  const havola = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filtrlar)) if (v && k !== 'sahifa') p.set(k, v);
    if (n > 1) p.set('sahifa', String(n));
    const q = p.toString();
    return q ? `${yol}?${q}` : yol;
  };

  const bosh = (joriy - 1) * hajm + 1;
  const oxiri = Math.min(joriy * hajm, jami);
  const tugma = 'tugma-ikkilamchi flex min-h-11 items-center gap-1 rounded-md px-3 text-sm';

  return (
    <nav aria-label={tr('Саҳифалаш')} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink-muted" role="status">
        {bosh}–{oxiri} / {jami} · {tr('саҳифа')} {joriy} / {oxirgi}
      </p>
      <div className="flex gap-2">
        {joriy > 1 ? (
          <Link href={havola(joriy - 1)} className={tugma} rel="prev">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {tr('Олдинги')}
          </Link>
        ) : null}
        {joriy < oxirgi ? (
          <Link href={havola(joriy + 1)} className={tugma} rel="next">
            {tr('Кейинги')}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
