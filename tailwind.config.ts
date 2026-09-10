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

        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
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
          soft: 'var(--accent-soft)',
          contrast: 'var(--accent-contrast)',
        },

        /* Holat — urg'udan alohida, hech qachon "yana bir seriya" sifatida ishlatilmaydi */
        ok: { DEFAULT: 'var(--ok)', bg: 'var(--ok-bg)' },
        warn: { DEFAULT: 'var(--warn)', bg: 'var(--warn-bg)' },
        danger: { DEFAULT: 'var(--danger)', bg: 'var(--danger-bg)' },
        info: { DEFAULT: 'var(--info)', bg: 'var(--info-bg)' },

        /*
         * Ishsiz fuqaroning hayot sikli bosqichlari.
         * Voronka va holat nishonlari faqat shu ranglarni ishlatadi -
         * bosqich rangi butun ilova bo'ylab bir xil ma'no bildirishi kerak.
         */
        bosqich: {
          1: 'var(--step-1)',
          2: 'var(--step-2)',
          3: 'var(--step-3)',
          4: 'var(--step-4)',
          5: 'var(--step-5)',
        },
      },

      borderRadius: {
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
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
