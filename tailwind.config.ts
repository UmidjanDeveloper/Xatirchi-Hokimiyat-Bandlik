import type { Config } from 'tailwindcss';

/**
 * Tailwind sozlamalari — barcha qiymatlar `globals.css` dagi dizayn
 * tokenlariga bog'langan. Shu sababli rang o'zgartirish uchun faqat
 * bitta joyni (tokenlarni) tahrirlash kifoya, komponentlarga tegilmaydi.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        /*
         * Fon qatlamlari.
         * Diqqat: bu rangni `base` deb atash MUMKIN EMAS — Tailwind'da
         * `text-base` allaqachon shrift o'lchovi utilitasi. Ikkalasi
         * to'qnashsa, rang utilitasi ustun keladi va butun sayt bo'ylab
         * `text-base` yozilgan matnlar fon rangida chizilib, ko'rinmay
         * qoladi. Shu sababli nomi `canvas`.
         */
        canvas: 'var(--bg-base)',
        elev: 'var(--bg-elev)',
        deep: 'var(--bg-deep)',

        /* Shisha yuzalar */
        surface: {
          DEFAULT: 'var(--surface)',
          strong: 'var(--surface-strong)',
          solid: 'var(--surface-solid)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },

        /* Matn */
        ink: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
        },

        /* Urg'u */
        accent: {
          DEFAULT: 'var(--accent)',
          solid: 'var(--accent-solid)',
          cyan: 'var(--accent-2)',
          violet: 'var(--accent-3)',
          contrast: 'var(--accent-contrast)',
        },

        /* Holat — urg'udan alohida, hech qachon "yana bir seriya" sifatida ishlatilmaydi */
        ok: { DEFAULT: 'var(--ok)', bg: 'var(--ok-bg)' },
        warn: { DEFAULT: 'var(--warn)', bg: 'var(--warn-bg)' },
        danger: { DEFAULT: 'var(--danger)', bg: 'var(--danger-bg)' },
      },

      borderRadius: {
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },

      boxShadow: {
        float: 'var(--shadow-float)',
        glow: 'var(--shadow-glow)',
      },

      /* Mobil-first: eng kichik nishon 360px */
      screens: {
        xs: '360px',
      },

      keyframes: {
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up': 'fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
