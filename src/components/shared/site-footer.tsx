'use client';

import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/shared/logo';

/**
 * Sahifa pastki qismi: hamkor logotiplari va muallif.
 *
 * IT Shaharcha logotipi `public/it-shaharcha.png` faylidan olinadi.
 * Fayl yo'q bo'lsa yoki yuklanmasa, rasm o'rnida buzilgan belgi
 * ko'rinmasligi uchun butun "Hamkorlikda" bloki yashiriladi —
 * sayt hech qachon "sinib turgan" ko'rinishga tushmaydi.
 */
export function SiteFooter() {
  const [logoBor, setLogoBor] = useState(true);
  const rasm = useRef<HTMLImageElement>(null);

  /**
   * `onError` ba'zan ishlamaydi: rasm React hidratsiyasidan OLDIN
   * yuklanmay qolsa, xato hodisasi allaqachon o'tib ketgan bo'ladi va
   * React uni ushlamaydi. Natijada ekranda buzilgan rasm belgisi va
   * alt matni qolib ketadi.
   *
   * Shuning uchun yuklangandan keyin qo'shimcha tekshiruv:
   * `naturalWidth === 0` — rasm yuklanmagani aniq belgisi.
   */
  useEffect(() => {
    const el = rasm.current;
    if (el && el.complete && el.naturalWidth === 0) setLogoBor(false);
  }, []);

  return (
    <footer className="mt-4 border-t border-line py-8">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 text-center">
        {logoBor && (
          <div className="flex flex-col items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
              Hamkorlikda
            </span>

            {/* Ikki logotip yonma-yon: tuman gerbi va hamkor markaz */}
            <div className="flex items-center gap-5 sm:gap-6">
              <Logo className="h-14 w-14 sm:h-16 sm:w-16" />

              <span
                aria-hidden="true"
                className="h-10 w-px sm:h-12"
                style={{ background: 'var(--border-strong)' }}
              />

              {/*
                Nishonning atrofida ~14% shaffof chekka bor, shuning uchun
                u gerbdan kattaroq qilingan — shundagina ikkala doira
                KO'ZGA bir xil o'lchamda ko'rinadi.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={rasm}
                src="/it-shaharcha.png"
                alt="IT Shaharcha — Yoshlar Axborot Texnologiyalari Markazi"
                title="IT Shaharcha — Yoshlar Axborot Texnologiyalari Markazi"
                width={500}
                height={500}
                className="h-20 w-20 sm:h-[5.5rem] sm:w-[5.5rem]"
                onError={() => setLogoBor(false)}
                onLoad={(e) => {
                  if (e.currentTarget.naturalWidth === 0) setLogoBor(false);
                }}
              />
            </div>
          </div>
        )}

        <p className="text-xs leading-relaxed text-ink-faint">
          © {new Date().getFullYear()} Xatirchi tumani hokimligi · Navoiy viloyati
          <span className="mx-1.5 hidden sm:inline">·</span>
          <br className="sm:hidden" />
          &laquo;Kelajak Egasi&raquo; loyihasi
        </p>

        {/* Muallif — nozik, lekin ko'rinadigan joyda */}
        <p className="flex items-center gap-2 text-[11px] text-ink-faint">
          <span
            aria-hidden="true"
            className="h-px w-8"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--border-strong))',
            }}
          />
          Made by{' '}
          <span className="font-display font-semibold text-ink-muted">
            Umidjon Zoxiddinovich
          </span>
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
