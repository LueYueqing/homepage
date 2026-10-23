/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/uploads/bg/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: false },
      { source: '/about/index.html', destination: '/about', permanent: false },
      { source: '/contact/index.html', destination: '/contact', permanent: false },
      { source: '/contact/index.907548.html', destination: '/contact', permanent: false },
      { source: '/zhinan/index.html', destination: '/zhinan', permanent: false },
      { source: '/zhuye/index.html', destination: '/zhuye', permanent: false },
      { source: '/zhuye/index.456cf4.html', destination: '/zhuye', permanent: false },
      { source: '/zhuye/index.d4f5c2.html', destination: '/zhuye', permanent: false },
      { source: '/contract/index.html', destination: '/contract', permanent: false },
      { source: '/qqlogin/index.html', destination: '/qqlogin', permanent: false },
    ];
  },
};

export default nextConfig;
