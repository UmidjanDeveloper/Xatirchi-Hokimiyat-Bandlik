import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { themeInitScript } from '@/lib/tema-skripti';
import { ServiceWorkerRegister } from '@/components/shared/service-worker-register';
import './globals.css';
/*
  Ko'rinish qatlami globals'dan KEYIN keladi - u tokenlarni emas,
  joylashuv va soyani belgilaydi, ya'ni oxirgi so'z unga tegishli.
*/
import './hightech.css';

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
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/hokimiyat-logo.png' }],
    /* iOS shaffoflikni qora fonga aylantiradi — shuning uchun alohida, oq fonli */
    apple: [{ url: '/ikonka/apple-touch-ikonka.png', sizes: '180x180' }],
  },
  /*
   * Statik fayl: `/manifest.webmanifest` (Next generatsiya qiladi)
   * middleware dan o'tardi va login sahifasiga yo'naltirilardi —
   * brauzer manifestni cookie'siz so'raydi.
   */
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Бандлик', statusBarStyle: 'default' },
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
      <head>
        {/*
          Tema React ishga tushishidan OLDIN qo'llanadi.

          Aks holda sahifa bir lahza standart temada chizilib, keyin
          foydalanuvchi tanlagan temaga "sakraydi". Bu ayniqsa sekin
          internetda bilinadi - tuman sharoitida esa internet doim
          sekin.

          Skript kichik va bloklovchi: u tugamaguncha brauzer
          chizishni boshlamaydi, shuning uchun sakrash umuman
          ko'rinmaydi.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
