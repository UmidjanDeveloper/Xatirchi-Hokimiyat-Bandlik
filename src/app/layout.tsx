import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/shared/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Хатирчи тумани — Бандлик платформаси',
  description:
    "Xatirchi tumani hokimligi. Aholi bandligini ta'minlash va kambag'allikni qisqartirish bo'yicha xatlov va tahlil tizimi.",
  applicationName: 'Бандлик платформаси',
  /*
   * Xatlov ma'lumotlari oila daromadi va sog'liq holatini o'z ichiga
   * oladi. Qidiruv tizimlari indekslashi mumkin bo'lgan hech narsa
   * yo'q - butun sayt login ortida.
   */
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Xodim raqamni tekshirish uchun ekranni kattalashtira olishi kerak
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1424' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
