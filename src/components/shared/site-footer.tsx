'use client';

import { Gerb } from './gerb';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * Sahifa poyi - FAQAT kirish sahifasida.
 *
 * Muallif nomi nozik, lekin ko'rinadigan joyda turadi - ikki
 * tomondan ingichka chiziq bilan ajratilgan. Bu kelajakegasi.uz
 * dagi bilan bir xil naqsh: hokimiyat sayti rasmiy ko'rinishini
 * yo'qotmasligi, lekin ishni kim qilgani ham bilinishi kerak.
 *
 * Tizimga kirgandan keyin poy ko'rinmaydi. Ish sahifalari - xatlov
 * anketasi, ishsizlar ro'yxati, hokim paneli - xodimning ish
 * qurolidir; u yerda har ekranning tagida muallif nomi turishi
 * ortiqcha. Vizitka kirish eshigida qoladi.
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

        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-ink-faint">
          <span
            aria-hidden="true"
            className="h-px w-8"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--border-strong))',
            }}
          />
          Made by{' '}
          <span className="font-semibold text-ink-muted">Umidjon Zoxiddinovich</span>
          {' · '}
          <span className="font-semibold text-ink-muted">Xomidov Fayozbek</span>
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
