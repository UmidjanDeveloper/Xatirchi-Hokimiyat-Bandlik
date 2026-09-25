/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Eski kompyuterlarda tez ishlashi uchun ishlab chiqarish rejimida
  // manba xaritalari o'chirilgan va paketlar optimallashtirilgan.
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  async headers() {
    /*
     * ── XAVFSIZLIK SARLAVHALARI ──
     *
     * Ilova hech qanday tashqi manba yuklamaydi: shrift,
     * rasm, skript - hammasi o'zida. Shuning uchun `'self'`
     * qoidasi amalda hech narsani buzmaydi.
     *
     * `'unsafe-inline'` skript uchun ham kerak: Next.js
     * sahifaga o'z yuklovchi skriptini ichkariga yozadi.
     * Uni nonce bilan almashtirish mumkin, lekin u har
     * sahifada middleware talab qiladi - alohida ish.
     */
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join('; ');

    const xavfsizlik = [
      /*
       * Anketa ichida fuqaroning ismi, manzili va telefoni
       * turadi. Sahifani boshqa sayt ramkasiga solib,
       * ustidan bosdirish mumkin edi.
       */
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      /* Ilova bularning hech birini ishlatmaydi */
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      },
      /*
       * HSTS - faqat productionda. Mahalliy ishlab chiqishda
       * brauzer `localhost` ni ham HTTPS ga majburlab, uni
       * ochib bo'lmay qolardi.
       */
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains',
            },
          ]
        : []),
      /*
       * CSP hozircha FAQAT XABAR BERADI, bloklamaydi.
       *
       * Sabab: 70 ta xodim ayni paytda dalada anketa
       * to'ldiryapti. Noto'g'ri yozilgan bitta qoida
       * sahifani butunlay ochilmas qilib qo'yardi va buni
       * faqat ular sezardi.
       *
       * Brauzer konsoliga yozadi, ishlashga xalal bermaydi.
       * Bir necha kun kuzatib, buzilish yo'qligiga ishonch
       * hosil qilingach `Content-Security-Policy` ga
       * o'zgartiriladi - bu bitta so'zlik ish.
       */
      { key: 'Content-Security-Policy-Report-Only', value: csp },
    ];

    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      { source: '/:yol*', headers: xavfsizlik },
    ];
  },
};

export default nextConfig;
