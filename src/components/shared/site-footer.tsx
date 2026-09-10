'use client';

import { Gerb } from './gerb';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * Sahifa poyi.
 *
 * Muallif nomi nozik, lekin ko'rinadigan joyda turadi - ikki
 * tomondan ingichka chiziq bilan ajratilgan. Bu kelajakegasi.uz
 * dagi bilan bir xil naqsh: hokimiyat sayti rasmiy ko'rinishini
 * yo'qotmasligi, lekin ishni kim qilgani ham bilinishi kerak.
 */
export function SiteFooter() {
  const { t: tr } = useAlifbo();
  const yil = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-line px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center">
        <Gerb olcham={44} className="opacity-90" />

        <p className="text-xs leading-relaxed text-ink-faint">
          © {yil} {tr('Хатирчи тумани ҳокимлиги')} · {tr('Навоий вилояти')}
          <span className="mx-1.5 hidden sm:inline">·</span>
          <br className="sm:hidden" />
          {tr('Бандлик ва камбағалликни қисқартириш платформаси')}
        </p>

        <p className="flex items-center gap-2 text-[11px] text-ink-faint">
          <span
            aria-hidden="true"
            className="h-px w-8"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--border-strong))',
            }}
          />
          Made by{' '}
          <span className="font-semibold text-ink-muted">Umidjon Zoxiddinovich</span>
          <span
            aria-hidden="true"
            className="h-px w-8"
            style={{
              background: 'linear-gradient(90deg, var(--border-strong), transparent)',
            }}
          />
        </p>
      </div>
    </footer>
  );
}
