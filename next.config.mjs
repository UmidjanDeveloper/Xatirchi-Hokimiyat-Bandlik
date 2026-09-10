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
