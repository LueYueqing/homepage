import { BUILD_ID } from './lib/build-id.mjs';

const PAGE_CACHE = [
  { key: 'Cache-Control', value: 'public, max-age=31536000' },
  { key: 'ETag', value: `"${BUILD_ID}"` },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateEtags: false,
  async headers() {
    return [
      {
        source: '/uploads/bg/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/',
        headers: PAGE_CACHE,
      },
      {
        source: '/:path((?!_next|home|wechat|vip|uploads|static|common|_ext|qqlogin|links).*)',
        headers: PAGE_CACHE,
      },
    ];
  },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: false },
      { source: '/about/index.html', destination: '/about', permanent: false },
      { source: '/contact/index.html', destination: '/contact', permanent: false },
      { source: '/contact/index.907548.html', destination: '/contact', permanent: false },
      { source: '/contract/index.html', destination: '/contract', permanent: false },
      { source: '/qqlogin/index.html', destination: '/qqlogin', permanent: false },
    ];
  },
};

export default nextConfig;
