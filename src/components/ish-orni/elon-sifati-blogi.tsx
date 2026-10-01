import { AlertTriangle, CheckCircle2, Info, SearchCheck } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import type { SifatBelgisi } from '@/lib/elon-sifati';

/**
 * E'lon sifati belgilari. Rang bilan birga belgi VA matn: "tekshiring"
 * belgisi ham, "ogohlantirish" ham ranglarni ajrata olmaydigan odamga
 * baribir tushunarli.
 *
 * Belgilar hukm emas - tizim e'lonni o'zi o'chirmaydi; xodim qaror
 * qiladi.
 */
export function ElonSifatiBlogi({ belgilar }: { belgilar: SifatBelgisi[] }) {
  const tr = matnchi();

  if (belgilar.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ok" role="status">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {tr('Сифат бўйича эътироз йўқ: маош, талаб, телефон ва муддат тўлиқ.')}
      </p>
    );
  }

  return (
    <ul className="space-y-1.5" aria-label={tr('Эълон сифати белгилари')}>
      {belgilar.map((b) => (
        <li key={b.kalit} className="flex items-start gap-1.5 text-xs">
          {b.jiddiylik === 'tekshirish' ? (
            <SearchCheck className="mt-px h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
          ) : b.jiddiylik === 'ogohlik' ? (
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
          ) : (
            <Info className="mt-px h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
          )}
          <span className="min-w-0">
            <span className={`font-medium ${b.jiddiylik === 'tekshirish' ? 'text-danger' : 'text-ink'}`}>
              {b.jiddiylik === 'tekshirish' && `${tr('Текширинг:')} `}
              {tr(b.nomi)}
            </span>
            <span className="block text-ink-faint">{tr(b.izoh)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
