/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Eski kompyuterlarda tez ishlashi uchun ishlab chiqarish rejimida
  // manba xaritalari o'chirilgan va paketlar optimallashtirilgan.
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
    /*
     * ── ҲОКИМЛИК ЖАДВАЛИ АНДОЗАСИ ──
     *
     * `mahalla-jadvali` йўли `.xlsx` андозасини ДИСКДАН
     * ўқийди. Next.js эса серверсиз функцияга фақат код
     * боғланишларини қўшади — код ичида ёзилмаган файл
     * тарқатмага умуман тушмайди.
     *
     * Бусиз илова маҳаллий машинада ишлар, Vercel да эса
     * «ENOENT: no such file» берарди — ва буни фақат ҳоким
     * тугмани босганда билардик.
     *
     * Текшириш: `npm run build` дан кейин
     * `.next/server/app/api/hisobot/mahalla-jadvali/route.js.nft.json`
     * ичида андоза йўли бўлиши керак. Синовда шу текширилади.
     */
    outputFileTracingIncludes: {
      '/api/hisobot/mahalla-jadvali': ['./src/lib/hisobot/andoza/**'],
    },
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
